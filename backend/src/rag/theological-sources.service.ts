import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface TheologicalSourceResult {
  source: string;
  content: string;
  reference: string;
  priority: number;
}

@Injectable()
export class TheologicalSourcesService {
  private readonly logger = new Logger(TheologicalSourcesService.name);

  /**
   * Busca em múltiplas fontes Open Source com priorização.
   */
  async searchAllSources(query: string): Promise<TheologicalSourceResult[]> {
    const results: TheologicalSourceResult[] = [];

    // 1. Sefaria (Altíssima prioridade para exegese e literatura rabínica)
    try {
      const sefariaResult = await this.fetchSefaria(query);
      if (sefariaResult) results.push(sefariaResult);
    } catch (e) {
      this.logger.debug(`Sefaria search failed: ${e.message}`);
    }

    // 2. Bible-API (eBible.org sources)
    try {
      const bibleApiResult = await this.fetchBibleApi(query);
      if (bibleApiResult) results.push(bibleApiResult);
    } catch (e) {
      this.logger.debug(`Bible-API search failed: ${e.message}`);
    }

    // Ordenar por prioridade (menor número = maior prioridade)
    return results.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Integração com Sefaria API
   */
  private async fetchSefaria(ref: string): Promise<TheologicalSourceResult | null> {
    try {
      // Tenta converter query em referência compatível (Ex: "Genesis 1:1")
      const response = await axios.get(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`, { timeout: 3000 });
      if (response.data && response.data.text) {
        return {
          source: 'Sefaria (Hebrew/Commentary)',
          content: Array.isArray(response.data.text) ? response.data.text.join(' ') : response.data.text,
          reference: response.data.ref,
          priority: 1
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Integração com Bible-API (WEB, KJV, etc - eBible.org)
   */
  private async fetchBibleApi(query: string): Promise<TheologicalSourceResult | null> {
    try {
      const response = await axios.get(`https://bible-api.com/${encodeURIComponent(query)}`, { timeout: 3000 });
      if (response.data && response.data.text) {
        return {
          source: `Bible-API (${response.data.translation_name})`,
          content: response.data.text,
          reference: response.data.reference,
          priority: 2
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Mock para integração SWORD (ZText local)
   * No futuro, usará node-sword-interface para ler arquivos .zip ou .sz de Bibletime/Sword
   */
  async getSwordModuleContent(moduleName: string, ref: string): Promise<string> {
    this.logger.log(`[SWORD] Buscando ${ref} no módulo ${moduleName}`);
    return `[SWORD Fallback] Conteúdo do módulo ${moduleName} para ${ref}`;
  }
}
