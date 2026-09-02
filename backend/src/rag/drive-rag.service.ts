import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { google } from 'googleapis';
import { PrismaService } from '../prisma.service';
import { EmbeddingService } from './embedding.service';
import { v4 as uuidv4 } from 'uuid';
import {
  findExtractor,
  SUPPORTED_MIME_QUERY,
  cleanExtractedText,
} from './text-extractors';
import { licencaDe } from './license-gate';

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
   * Cron job para sincronização diária automática.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySync() {
    this.logger.log(
      '--- [AUTO] Iniciando sincronização diária da biblioteca Drive ---',
    );
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const userId = 'e850cb80-d129-4810-957b-bc94d1fe2aee'; // Usuário principal/admin

    if (folderId) {
      try {
        await this.ingestFolder(folderId, userId, 'Geral');
        this.logger.log(
          '--- [AUTO] Sincronização diária concluída com sucesso ---',
        );
      } catch (error) {
        this.logger.error(
          `--- [AUTO] Erro na sincronização diária: ${(error as Error).message}`,
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
        q: `'${targetFolderId}' in parents and trashed = false and (${SUPPORTED_MIME_QUERY})`,
        fields: 'files(id, name, mimeType, modifiedTime, size)',
        pageSize: 1000,
      });

      const files = response.data.files || [];
      this.logger.log(
        `Encontrados ${files.length} arquivos suportados (PDF/DOCX/EPUB) na biblioteca.`,
      );

      // Portão de licença. O manifesto é compilado junto com o serviço
      // (license-manifest.ts), então não há como faltar em produção — foi
      // justamente um manifesto lido do disco e não encontrado que barrou as
      // 107 obras, aprovadas inclusive, em 04/08/2026.
      const bloqueadas: Array<{ nome: string; motivo: string }> = [];
      let ingeridos = 0;

      for (const file of files) {
        const decisao = licencaDe({ id: file.id, name: file.name });
        if (!decisao.ok) {
          bloqueadas.push({
            nome: file.name ?? file.id ?? '(sem nome)',
            motivo: decisao.motivo ?? decisao.status,
          });
          this.logger.warn(
            `[LICENÇA] "${file.name}" NÃO indexada — ${decisao.status}: ${decisao.motivo ?? 'sem motivo registrado'}`,
          );
          continue;
        }
        await this.processFile(drive, file, userId, tradition);
        ingeridos += 1;
      }

      this.logger.log(
        `[LICENÇA] ${files.length} obra(s) na pasta · ${ingeridos} liberada(s) · ${bloqueadas.length} barrada(s).`,
      );

      return {
        success: true,
        filesProcessed: ingeridos,
        filesFound: files.length,
        blocked: bloqueadas,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao ler pasta do Drive: ${(error as Error).message}`,
      );
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

    // Defesa em profundidade: `ingestFolder` já barrou o que não tem licença,
    // mas qualquer outro chamador que chegue aqui direto passa pelo mesmo
    // portão. Uma tranca só na porta da frente foi exatamente o defeito de
    // 04/08/2026 — ver license-gate.ts.
    const decisao = licencaDe({ id: file.id, name: file.name });
    if (!decisao.ok) {
      this.logger.warn(
        `[LICENÇA] "${file.name}" bloqueada em processFile — ${decisao.status}.`,
      );
      return;
    }

    // Protetor contra arquivos massivos de 100MB+ (CWE-400)
    if (file.size && parseInt(file.size, 10) > 100 * 1024 * 1024) {
      this.logger.warn(
        `[DriveRagService] Arquivo "${file.name}" excede o limite de 100MB (${file.size} bytes). Ignorando ingestão para evitar OOM.`,
      );
      return;
    }

    // Evita re-processar e duplicar arquivos, e invalida o estado caso o
    // arquivo tenha sido modificado no Drive.
    //
    // A checagem é por `fileId` em TODA a biblioteca, deliberadamente SEM
    // filtrar por `userId`: o acervo é compartilhado, e uma obra é a mesma obra
    // independentemente de quem disparou a ingestão. Enquanto isso era escopado
    // por usuário, reingerir com outra conta duplicava tudo — foi assim que as
    // "Confissões" de Agostinho passaram de 85 para 170 trechos em 04/08/2026,
    // com a mesma obra contada duas vezes na recuperação.
    try {
      const exists: any[] = await this.prisma.$queryRaw`
        SELECT id, metadata FROM "UserEmbedding"
        WHERE type = 'library_book'
          AND metadata->>'fileId' = ${file.id}
        LIMIT 1
      `;
      if (exists && exists.length > 0) {
        const storedModifiedTime = exists[0].metadata?.modifiedTime;
        if (
          storedModifiedTime &&
          file.modifiedTime &&
          storedModifiedTime === file.modifiedTime
        ) {
          this.logger.log(
            `[DriveRagService] Arquivo "${file.name}" já está indexado e atualizado. Pulando...`,
          );
          return;
        }

        // Se o arquivo foi modificado, deleta os chunks antigos para manter sincronizado (DELETE -> INSERT)
        this.logger.log(
          `[DriveRagService] Arquivo "${file.name}" mutou no Drive. Removendo chunks obsoletos...`,
        );
        await this.prisma.$executeRaw`
          DELETE FROM "UserEmbedding"
          WHERE type = 'library_book'
            AND metadata->>'fileId' = ${file.id}
        `;
      }
    } catch (checkErr: any) {
      this.logger.warn(
        `Erro ao checar sincronia de estado para "${file.name}": ${checkErr.message}`,
      );
    }

    this.logger.log(`Baixando e processando: ${file.name}`);
    try {
      const response = await drive.files.get(
        { fileId: file.id, alt: 'media' },
        { responseType: 'arraybuffer' },
      );

      const buffer = Buffer.from(response.data);

      // Dispatch por mime — text-extractors.ts registra um handler por
      // formato. EPUBs entram aqui pelo mesmo pipeline que PDF/DOCX.
      const extractor = findExtractor(file.mimeType);
      if (!extractor) {
        this.logger.warn(
          `Formato não suportado: ${file.mimeType} (${file.name})`,
        );
        return;
      }

      let text = '';
      let fileMeta: Record<string, unknown> = {};
      try {
        const result = await extractor.extract(buffer);
        // Limpa marcas de paginação e hifenização quebrada ANTES do chunking:
        // depois de fatiado, o artefato já está dentro do trecho que vai ser
        // citado ao usuário, e não há como removê-lo sem reindexar.
        text = cleanExtractedText(result.text);
        fileMeta = result.meta ?? {};
      } catch (err) {
        this.logger.error(
          `Falha ao extrair texto de ${file.name}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
        return;
      }

      if (!text || text.trim().length === 0) {
        this.logger.warn(`Nenhum texto extraído de: ${file.name}`);
        return;
      }

      // Chunking Hierárquico: Fatiar em Parent Chunks (~1200 chars) e Child Chunks (~250 chars)
      const parentChunks = this.chunkText(text, 1200);
      const childChunksData: Array<{
        childText: string;
        parentText: string;
        parentIndex: number;
      }> = [];

      for (let i = 0; i < parentChunks.length; i++) {
        const parentText = parentChunks[i];
        const children = this.chunkChildText(parentText, 250);
        for (const childText of children) {
          childChunksData.push({
            childText,
            parentText,
            parentIndex: i,
          });
        }
      }

      this.logger.log(
        `Livro "${file.name}" fatiado em ${parentChunks.length} partes pai e ${childChunksData.length} partes filho.`,
      );

      // Processar em lotes para não estourar a API do Gemini
      const batchSize = 10;
      for (let i = 0; i < childChunksData.length; i += batchSize) {
        const batch = childChunksData.slice(i, i + batchSize);
        const batchTexts = batch.map((b) => b.childText);
        const embeddings =
          await this.embeddingService.createBatchEmbeddings(batchTexts);

        // Salvar no PostgreSQL com pgvector
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const embeddingVector = embeddings[j];
          const enriched = this.extractLemmaAndStrong(item.childText);
          const metadata = {
            fileName: file.name,
            fileId: file.id,
            modifiedTime: file.modifiedTime, // Sincronização de mutação
            tradition,
            chunkIndex: item.parentIndex,
            childIndex: i + j,
            parentText: item.parentText, // Conteúdo Parent guardado para o LLM
            isChild: true,
            // Metadados do próprio arquivo (EPUB exposes title/author/lang via OPF).
            // Útil pra UI exibir "BDAG (3ª ed.)" em vez de "BDAG3.epub".
            ...fileMeta,
            ...enriched,
          };

          // Salvar como conhecimento pessoal do usuário (salvando o Child + parentText no metadado)
          await this.prisma.$executeRaw`
            INSERT INTO "UserEmbedding" (id, "userId", type, content, metadata, embedding, "createdAt")
            VALUES (
              ${uuidv4()},
              ${targetUserId},
              'library_book',
              ${item.childText},
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
        `Erro ao processar arquivo ${file.name}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Método de chunking semântico baseado em limites lógicos de sentenças e parágrafos.
   * Evita a fragmentação teológica e textual cortando versículos e frases bíblicas ao meio.
   */
  private chunkText(text: string, maxLength: number = 1000): string[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const cleanParagraph = paragraph.replace(/\s+/g, ' ').trim();
      if (!cleanParagraph) continue;

      // Se o parágrafo inteiro couber e não estourar o limite com o atual chunk, junta
      if (currentChunk.length + cleanParagraph.length + 1 <= maxLength) {
        currentChunk = currentChunk
          ? `${currentChunk}\n\n${cleanParagraph}`
          : cleanParagraph;
        continue;
      }

      // Caso contrário, fatiamos o parágrafo por sentenças para manter a integridade semântica
      const sentences = cleanParagraph.split(/(?<=[.!?])\s+/);

      for (const sentence of sentences) {
        const cleanSentence = sentence.trim();
        if (!cleanSentence) continue;

        // Se a sentença sozinha passar do limite máximo, fatiamos por palavras
        if (cleanSentence.length > maxLength) {
          if (currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = '';
          }
          const words = cleanSentence.split(' ');
          let tempSubChunk = '';
          for (const word of words) {
            if (tempSubChunk.length + word.length + 1 > maxLength) {
              if (tempSubChunk.length > 0) {
                chunks.push(tempSubChunk);
              }
              tempSubChunk = word;
            } else {
              tempSubChunk = tempSubChunk ? `${tempSubChunk} ${word}` : word;
            }
          }
          if (tempSubChunk.length > 0) {
            currentChunk = tempSubChunk;
          }
        } else if (currentChunk.length + cleanSentence.length + 1 > maxLength) {
          if (currentChunk.length > 0) {
            chunks.push(currentChunk);
          }
          currentChunk = cleanSentence;
        } else {
          currentChunk = currentChunk
            ? `${currentChunk} ${cleanSentence}`
            : cleanSentence;
        }
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Método de chunking para gerar Child Chunks focados (~250 caracteres) a partir de um Parent Chunk.
   * Preserva a coerência de sentenças.
   */
  private chunkChildText(
    parentText: string,
    maxLength: number = 250,
  ): string[] {
    const sentences = parentText.split(/(?<=[.!?])\s+/);
    const childChunks: string[] = [];
    let currentChild = '';

    for (const sentence of sentences) {
      const cleanSentence = sentence.trim();
      if (!cleanSentence) continue;

      if (cleanSentence.length > maxLength) {
        // Se uma única sentença excede o limite, quebra por palavras
        if (currentChild.length > 0) {
          childChunks.push(currentChild);
          currentChild = '';
        }
        const words = cleanSentence.split(' ');
        let tempSub = '';
        for (const word of words) {
          if (tempSub.length + word.length + 1 > maxLength) {
            if (tempSub.length > 0) {
              childChunks.push(tempSub);
            }
            tempSub = word;
          } else {
            tempSub = tempSub ? `${tempSub} ${word}` : word;
          }
        }
        if (tempSub.length > 0) {
          currentChild = tempSub;
        }
      } else if (currentChild.length + cleanSentence.length + 1 > maxLength) {
        if (currentChild.length > 0) {
          childChunks.push(currentChild);
        }
        currentChild = cleanSentence;
      } else {
        currentChild = currentChild
          ? `${currentChild} ${cleanSentence}`
          : cleanSentence;
      }
    }

    if (currentChild.length > 0) {
      childChunks.push(currentChild);
    }

    return childChunks;
  }

  /**
   * Apaga todos os UserEmbedding do tipo `library_book` do usuário e
   * re-importa a pasta inteira. Usar quando:
   *   • Heurística `extractLemmaAndStrong` foi atualizada e queremos re-popular
   *     a metadata das obras já indexadas.
   *   • Suporte a novo formato foi adicionado e o usuário tem livros nesse
   *     formato que foram ignorados na ingestão anterior.
   *   • A pasta foi reorganizada.
   *
   * NB: a operação é destrutiva — apaga ANTES de re-ingerir. Por isso é
   * exposta apenas via endpoint admin e roda síncrono para que a UI possa
   * exibir progresso (lookups durante o reindex podem ter recall reduzido).
   */
  async reindex(
    folderId?: string,
    userId?: string,
    tradition: string = 'Geral',
  ): Promise<{ deleted: number; filesProcessed: number }> {
    const targetUserId = userId || 'public-guest';
    this.logger.log(
      `[Reindex] Limpando UserEmbedding (library_book) do usuário ${targetUserId}…`,
    );

    const { count } = await this.prisma.userEmbedding.deleteMany({
      where: { userId: targetUserId, type: 'library_book' },
    });

    this.logger.log(`[Reindex] Removidos ${count} chunks. Re-ingerindo pasta…`);
    const result = await this.ingestFolder(folderId, userId, tradition);
    return { deleted: count, filesProcessed: result.filesProcessed };
  }

  /**
   * Baixa um arquivo de teologia de domínio público a partir de uma URL direta
   * (ex: CCEL ou Gutenberg) e o ingere na memória RAG do usuário.
   */
  async ingestFromUrl(
    url: string,
    fileName: string,
    mimeType: string,
    userId: string,
    tradition: string = 'Geral',
  ): Promise<{
    success: boolean;
    chunksIndexed?: number;
    fileName: string;
    message?: string;
  }> {
    const targetUserId = userId || 'public-guest';
    this.logger.log(
      `[Ingest URL] Processando download teológico: ${url} (${fileName})`,
    );

    // Evita duplicações na biblioteca da IA
    try {
      const exists: any[] = await this.prisma.$queryRaw`
        SELECT id FROM "UserEmbedding"
        WHERE "userId" = ${targetUserId}
          AND type = 'library_book'
          AND metadata->>'fileName' = ${fileName}
        LIMIT 1
      `;
      if (exists && exists.length > 0) {
        this.logger.log(
          `[DriveRagService] "${fileName}" já está indexado. Pulando download.`,
        );
        return {
          success: true,
          fileName,
          message: 'Obra já se encontra indexada no seu RAG.',
        };
      }
    } catch (checkErr: any) {
      this.logger.warn(
        `Erro de duplicado no ingest-url para "${fileName}": ${checkErr.message}`,
      );
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Falha de conexão com a URL externa (HTTP status ${response.status})`,
        );
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 100 * 1024 * 1024) {
        throw new Error(
          `Arquivo excede o limite máximo permitido de 100MB (${contentLength} bytes). Ingestão abortada.`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 100 * 1024 * 1024) {
        throw new Error(
          `Arquivo excede o limite máximo permitido de 100MB (${arrayBuffer.byteLength} bytes). Ingestão abortada.`,
        );
      }

      const buffer = Buffer.from(arrayBuffer);

      const extractor = findExtractor(mimeType);
      if (!extractor) {
        throw new Error(`Formato de mídia não suportado: ${mimeType}`);
      }

      let text = '';
      let fileMeta: Record<string, unknown> = {};
      const result = await extractor.extract(buffer);
      text = result.text;
      fileMeta = result.meta ?? {};

      if (!text || text.trim().length === 0) {
        throw new Error(
          `O extrator não obteve texto legível do arquivo "${fileName}"`,
        );
      }

      // Chunking Hierárquico: Parent Chunks (~1200 chars) e Child Chunks (~250 chars)
      const parentChunks = this.chunkText(text, 1200);
      const childChunksData: Array<{
        childText: string;
        parentText: string;
        parentIndex: number;
      }> = [];

      for (let i = 0; i < parentChunks.length; i++) {
        const parentText = parentChunks[i];
        const children = this.chunkChildText(parentText, 250);
        for (const childText of children) {
          childChunksData.push({
            childText,
            parentText,
            parentIndex: i,
          });
        }
      }

      this.logger.log(
        `[Ingest URL] Livro "${fileName}" fatiado em ${parentChunks.length} partes pai e ${childChunksData.length} partes filho.`,
      );

      const batchSize = 10;
      for (let i = 0; i < childChunksData.length; i += batchSize) {
        const batch = childChunksData.slice(i, i + batchSize);
        const batchTexts = batch.map((b) => b.childText);
        const embeddings =
          await this.embeddingService.createBatchEmbeddings(batchTexts);

        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const embeddingVector = embeddings[j];
          const enriched = this.extractLemmaAndStrong(item.childText);
          const metadata = {
            fileName,
            sourceUrl: url,
            tradition,
            chunkIndex: item.parentIndex,
            childIndex: i + j,
            parentText: item.parentText, // Conteúdo Parent guardado para o LLM
            isChild: true,
            ...fileMeta,
            ...enriched,
          };

          await this.prisma.$executeRaw`
            INSERT INTO "UserEmbedding" (id, "userId", type, content, metadata, embedding, "createdAt")
            VALUES (
              ${uuidv4()},
              ${targetUserId},
              'library_book',
              ${item.childText},
              ${metadata}::jsonb,
              ${JSON.stringify(embeddingVector)}::vector,
              NOW()
            )
          `;
        }
      }

      this.logger.log(
        `[Ingest URL] Sincronização concluída com sucesso: ${fileName}`,
      );
      return { success: true, chunksIndexed: childChunksData.length, fileName };
    } catch (error: any) {
      this.logger.error(
        `Falha ao indexar livro via URL (${fileName}): ${(error as Error).message}`,
      );
      throw error;
    }
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
  private extractLemmaAndStrong(chunk: string): {
    lemma?: string;
    strongId?: string;
  } {
    const out: { lemma?: string; strongId?: string } = {};
    const head = chunk.slice(0, 200);

    // Lema: 1ª palavra grega (U+0370–U+03FF, U+1F00–U+1FFF) ou hebraica
    // (U+0590–U+05FF) no início do chunk, ignorando whitespace inicial.
    const lemmaMatch = head.match(/^\s*([Ͱ-Ͽἀ-῿]+|[֐-׿]+)/);
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
