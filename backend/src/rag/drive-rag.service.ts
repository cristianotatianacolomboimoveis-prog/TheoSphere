import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { google } from 'googleapis';
import { PrismaService } from '../prisma.service';
import { EmbeddingService } from './embedding.service';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DriveRagService {
  private readonly logger = new Logger(DriveRagService.name);
  private drive = google.drive('v3');

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Conecta ao Google Drive usando as credenciais do Service Account (JSON).
   */
  private getDriveAuth() {
    // Para produção, isso deve vir de variáveis de ambiente.
    // Ex: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL e PRIVATE_KEY
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error(
        'Credenciais do Google Drive não configuradas nas variáveis de ambiente.',
      );
    }

    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

    // Se a string vier com aspas ao redor devido ao .env, nós as removemos
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    // Substitui os \n literais por quebras de linha reais
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    return google.drive({ version: 'v3', auth });
  }

  /**
   * Cron job para sincronização semanal automática.
   */
  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklySync() {
    this.logger.log(
      '--- [AUTO] Iniciando sincronização semanal da biblioteca Drive ---',
    );
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const userId = 'e850cb80-d129-4810-957b-bc94d1fe2aee'; // Usuário principal/admin

    if (folderId) {
      try {
        await this.ingestFolder(folderId, userId, 'Geral');
        this.logger.log(
          '--- [AUTO] Sincronização semanal concluída com sucesso ---',
        );
      } catch (error) {
        this.logger.error(
          `--- [AUTO] Erro na sincronização semanal: ${error.message}`,
        );
      }
    } else {
      this.logger.warn(
        '--- [AUTO] GOOGLE_DRIVE_FOLDER_ID não configurado. Sincronização ignorada.',
      );
    }
  }

  /**
   * Lê todos os PDFs e DOCX de uma pasta específica no Drive e extrai APENAS o texto.
   */
  async ingestFolder(
    folderId?: string,
    userId?: string,
    tradition: string = 'Geral',
  ) {
    const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
    const targetUserId = userId || 'public-guest';
    if (!targetFolderId) {
      throw new Error(
        'ID da pasta do Google Drive não fornecido e não configurado no .env',
      );
    }

    this.logger.log(
      `Iniciando ingestão da pasta do Drive: ${targetFolderId} para o usuário: ${targetUserId}`,
    );
    const drive = this.getDriveAuth();

    try {
      const response = await drive.files.list({
        q: `'${targetFolderId}' in parents and trashed = false and (mimeType='application/pdf' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document')`,
        fields: 'files(id, name, mimeType)',
      });

      const files = response.data.files || [];
      this.logger.log(
        `Encontrados ${files.length} arquivos (PDF/DOCX) na biblioteca.`,
      );

      for (const file of files) {
        await this.processFile(drive, file, userId, tradition);
      }

      return { success: true, filesProcessed: files.length };
    } catch (error) {
      this.logger.error(`Erro ao ler pasta do Drive: ${error.message}`);
      throw error;
    }
  }

  private async processFile(
    drive: any,
    file: any,
    userId?: string,
    tradition: string = 'Geral',
  ) {
    const targetUserId = userId || 'public-guest';
    this.logger.log(`Baixando e processando: ${file.name}`);
    try {
      const response = await drive.files.get(
        { fileId: file.id, alt: 'media' },
        { responseType: 'arraybuffer' },
      );

      const buffer = Buffer.from(response.data);
      let text = '';

      // Extração 100% focada em texto, ignorando completamente as imagens
      if (file.mimeType === 'application/pdf') {
        const parser = new pdfParse.PDFParse(new Uint8Array(buffer));
        const pdfData = await parser.getText();
        text = pdfData.text;
      } else if (
        file.mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      }

      if (!text || text.trim().length === 0) {
        this.logger.warn(`Nenhum texto extraído de: ${file.name}`);
        return;
      }

      // Chunking: Fatiar o texto em pedaços lógicos para RAG (aprox 1000 caracteres)
      const chunks = this.chunkText(text, 1000);
      this.logger.log(
        `Livro "${file.name}" fatiado em ${chunks.length} partes.`,
      );

      // Processar em lotes para não estourar a API do Gemini
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddings =
          await this.embeddingService.createBatchEmbeddings(batch);

        // Salvar no PostgreSQL com pgvector
        for (let j = 0; j < batch.length; j++) {
          const chunkText = batch[j];
          const embeddingVector = embeddings[j];
          const enriched = this.extractLemmaAndStrong(chunkText);
          const metadata = {
            fileName: file.name,
            fileId: file.id,
            tradition,
            chunkIndex: i + j,
            ...enriched,
          };

          // Salvar como conhecimento pessoal do usuário
          await this.prisma.$executeRaw`
            INSERT INTO "UserEmbedding" (id, "userId", type, content, metadata, embedding, "createdAt")
            VALUES (
              ${uuidv4()},
              ${targetUserId},
              'library_book',
              ${chunkText},
              ${metadata}::jsonb,
              ${JSON.stringify(embeddingVector)}::vector,
              NOW()
            )
          `;
        }
      }

      this.logger.log(`Finalizado o processamento de: ${file.name}`);
    } catch (error) {
      this.logger.error(
        `Erro ao processar arquivo ${file.name}: ${error.message}`,
      );
    }
  }

  /**
   * Método de chunking simples (divide por parágrafos e tenta agrupar até o limite).
   */
  private chunkText(text: string, maxLength: number): string[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const p of paragraphs) {
      const cleanP = p.replace(/\s+/g, ' ').trim();
      if (!cleanP) continue;

      if (
        currentChunk.length + cleanP.length > maxLength &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk);
        currentChunk = cleanP;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + cleanP;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Best-effort lemma/Strong's extraction from a chunk.
   *
   * Léxicos como BDAG / HALOT / TDNT estruturam verbetes assim:
   *   "ἀγάπη, ης, ἡ — love (especially of the Christian agape). ..."
   *   "אַהֲבָה (’ahăḇāh) n.f. love ..."
   *   "G26 ἀγάπη — agápē — love, affection..."
   *
   * Captamos:
   *   • lemma — primeiro token grego ou hebraico do chunk (se o chunk
   *     começa com um deles, é forte sinal de cabeçalho de verbete).
   *   • strongId — qualquer ocorrência de G## ou H## nos primeiros 200 chars.
   *
   * Heurística simples e barata (regex). Se falhar, retorna `{}` e o
   * LibraryService cai pra busca por similaridade pura.
   */
  private extractLemmaAndStrong(
    chunk: string,
  ): { lemma?: string; strongId?: string } {
    const out: { lemma?: string; strongId?: string } = {};
    const head = chunk.slice(0, 200);

    // Lema: 1ª palavra grega (U+0370–U+03FF, U+1F00–U+1FFF) ou hebraica
    // (U+0590–U+05FF) no início do chunk, ignorando whitespace inicial.
    const lemmaMatch = head.match(
      /^\s*([Ͱ-Ͽἀ-῿]+|[֐-׿]+)/,
    );
    if (lemmaMatch && lemmaMatch[1].length >= 2) {
      out.lemma = lemmaMatch[1];
    }

    // Strong's: G seguido de 1-4 dígitos (NT) ou H seguido de 1-4 dígitos (AT).
    const strongMatch = head.match(/\b([GH]\d{1,4})\b/);
    if (strongMatch) {
      out.strongId = strongMatch[1];
    }

    return out;
  }
}
