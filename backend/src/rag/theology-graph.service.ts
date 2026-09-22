import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SearchService } from '../search/search.service';
import { EmbeddingService } from './embedding.service';
import { UserContextService } from './user-context.service';
import { CURATED_GRAPHS } from './curated-graphs.registry';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  color: string;
  val: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label: string;
  value: number;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

@Injectable()
export class TheologyGraphService {
  private readonly logger = new Logger(TheologyGraphService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly embeddingService: EmbeddingService,
    private readonly userContext: UserContextService,
  ) {}

  /**
   * Gera um Grafo de Conhecimento Teológico em tempo real.
   * Conecta versículos, tópicos, documentos do usuário e geografia.
   */
  async getKnowledgeGraph(
    query: string,
    userId?: string,
  ): Promise<KnowledgeGraphData> {
    this.logger.log(`[Graph] Gerando topologia teológica para: "${query}"`);

    // Check for curated graphs first
    const curated = CURATED_GRAPHS[query];
    if (curated) {
      this.logger.log(`[Graph] Retornando grafo curado para: "${query}"`);
      return curated;
    }

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const seenNodes = new Set<string>();

    const addNode = (
      id: string,
      label: string,
      type: string,
      color: string,
      val: number = 10,
    ) => {
      if (!seenNodes.has(id)) {
        nodes.push({ id, label, type, color, val });
        seenNodes.add(id);
        return true;
      }
      return false;
    };

    const addLink = (
      source: string,
      target: string,
      label: string = '',
      value: number = 1,
    ) => {
      links.push({ source, target, label, value });
    };

    // 1. Nó Central (A busca ou versículo atual)
    const centralId = 'center';
    addNode(centralId, query, 'query', '#ff9800', 25);

    // 2. Buscar Versículos Relacionados
    try {
      const bibleHits = await this.search.hybridSearchVerses(query, {
        limit: 8,
      });
      for (const h of bibleHits) {
        const vId = `verse-${h.bookId}-${h.chapter}-${h.verse}`;
        const vLabel = `${h.bookId}:${h.chapter}:${h.verse}`;
        addNode(vId, vLabel, 'verse', '#2196f3', 15);
        addLink(centralId, vId, 'menciona', 2);
      }
    } catch (e) {
      this.logger.error(`Graph: Bible search failed: ${(e as Error).message}`);
    }

    // 3. Buscar Conceitos Teológicos (Embeddings)
    try {
      const queryEmbedding = await this.embeddingService.createEmbedding(query);
      const theologyDocs: any[] = await this.prisma.$queryRaw`
        SELECT id, tradition, 
               substring(content from 1 for 40) as preview
        FROM "TheologyEmbedding"
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 6;
      `;
      for (const t of theologyDocs) {
        const tId = `theo-${t.id}`;
        addNode(
          tId,
          `${t.tradition}: ${t.preview}...`,
          'concept',
          '#ffc107',
          12,
        );
        addLink(centralId, tId, 'temático', 1.5);
      }
    } catch (e) {
      this.logger.error(
        `Graph: Theology search failed: ${(e as Error).message}`,
      );
    }

    // 4. Buscar Documentos do Usuário (Drive/Notas)
    if (userId) {
      try {
        const userResults = await this.userContext.searchUserContext(
          userId,
          query,
          5,
        );
        for (const res of userResults) {
          const doc = res.document;
          const dId = `doc-${doc.id}`;
          addNode(
            dId,
            `${doc.type.toUpperCase()}: ${doc.content.slice(0, 30)}...`,
            'document',
            '#4caf50',
            14,
          );
          addLink(centralId, dId, 'personalizado', 1.8);
        }
      } catch (e) {
        this.logger.error(
          `Graph: User context search failed: ${(e as Error).message}`,
        );
      }
    }

    // 5. Buscar Dados Léxicos (Lexicon Deep-Link)
    try {
      const strongMatch = query.match(/[GH]\d{1,5}/i);
      if (strongMatch) {
        const strongId = strongMatch[0].toUpperCase();
        const lexicon = await this.prisma.lexicalEntry.findUnique({
          where: { strongId },
        });
        if (lexicon) {
          addNode(
            `lex-${strongId}`,
            `${strongId}: ${lexicon.word}`,
            'lexicon',
            '#e91e63',
            20,
          );
          addLink(centralId, `lex-${strongId}`, 'definicão léxica', 2);
        }
      }
    } catch (e) {
      this.logger.debug(
        `Graph: Lexicon search failed: ${(e as Error).message}`,
      );
    }

    return { nodes, links };
  }
}
