import { Injectable, Logger } from '@nestjs/common';
import { RagService } from '../../rag/rag.service';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AIEngineService {
  private readonly logger = new Logger(AIEngineService.name);

  constructor(
    private readonly rag: RagService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Gera uma explicação contextual para um evento ou local.
   */
  async explainContext(query: string, userId?: string) {
    return this.rag.chat(query, userId);
  }

  /**
   * IA Exegética: análise profunda de passagens usando dados do banco.
   */
  async performExegesis(book: string, chapter: number, userId?: string) {
    const verses = await this.prisma.bibleVerse.findMany({
      where: { book, chapter, translation: 'ARA' },
      take: 20
    });

    const textSample = verses.map(v => v.text).join(' ');
    const strongIds = [...textSample.matchAll(/<([GH]\d+)>/g)].map(m => m[1]);
    
    const lexicons = await this.prisma.lexicalEntry.findMany({
      where: { strongId: { in: strongIds } }
    });

    const contextData = {
      passage: `${book} ${chapter}`,
      verses: verses.map(v => `${v.verse}: ${v.text}`),
      lexicon: lexicons.map(l => `${l.strongId} (${l.word}): ${l.definition}`)
    };

    const prompt = `Realize uma exegese técnica e teológica de ${contextData.passage}. 
    CONTEXTO BÍBLICO:
    ${contextData.verses.join('\n')}
    
    DADOS LÉXICOS (STRONG):
    ${contextData.lexicon.join('\n')}

    Instrução: Analise como os termos léxicos originais iluminam o significado dos versículos.`;

    return this.rag.chat(prompt, userId, 'ecumenical', [], true);
  }

  /**
   * IA Geográfica: explicar relevância de um local.
   */
  async explainGeography(locationName: string) {
    const prompt = `Explique a importância geográfica e estratégica de ${locationName} no contexto bíblico.`;
    return this.rag.chat(prompt);
  }

  /**
   * TTS: gera áudio humano para um texto.
   * Utiliza o OpenAI TTS ou similar.
   */
  async generateSpeech(text: string, voice: string = 'alloy') {
    // Para o MVP, poderíamos integrar com OpenAI TTS API
    this.logger.log(`[TTS] Gerando áudio para: "${text.slice(0, 30)}..."`);
    // Placeholder: retornaria uma URL ou buffer
    return { success: true, audioUrl: `https://api.theosphere.com/v1/tts/sample.mp3` };
  }

  /**
   * Tradução Automática Global: traduz conteúdo teológico ou bíblico.
   */
  async translateContent(text: string, targetLang: string) {
    const prompt = `Traduza o seguinte conteúdo bíblico/teológico para o idioma ${targetLang}, mantendo a precisão terminológica: "${text}"`;
    return this.rag.chat(prompt);
  }
}
