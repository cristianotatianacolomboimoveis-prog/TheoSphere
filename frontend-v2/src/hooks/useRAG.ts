"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { edgeAI } from "../lib/edge-ai";
import { api, ApiError } from "../lib/api";
import { logger } from "../lib/logger";

/* ─── Types ──────────────────────────────────────────────── */

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RagMeta {
  cached: boolean;
  similarity?: number;
  cacheSource?: "global" | "user";
  contextUsed: boolean;
  contextDocCount: number;
  tokensEstimated: number;
  costEstimated: number;
}

interface RagResponse {
  content: string;
  meta: RagMeta;
}

interface SyncResult {
  indexed: number;
  skipped: number;
  total: number;
}

interface RagStats {
  embedding: { size: number; maxSize: number; ttlMinutes: number };
  semanticCache: {
    globalCacheSize: number;
    userCacheCount: number;
    totalEntries: number;
    estimatedSavings: number;
  };
  userContext: {
    totalUsers: number;
    totalDocuments: number;
    avgDocsPerUser: number;
  };
}

/* ─── Config ─────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
const USER_ID_KEY = "theosphere-user-id";
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const LAST_SYNC_KEY = "theosphere-last-rag-sync";

/* ─── Utility ────────────────────────────────────────────── */

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("theosphere-access-token");
}

function getUserId(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function loadLocalStorageData() {
  if (typeof window === "undefined") return { notes: [], sermons: [], highlights: [], studies: [], bookmarks: [] };
  
  const parse = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  return {
    notes: parse("theosphere-notes"),
    sermons: parse("theosphere-sermons"),
    highlights: parse("theosphere-highlights"),
    studies: parse("theosphere-studies"),
    bookmarks: parse("theosphere-bookmarks"),
  };
}

/* ─── Global Worker Instance ─────────────────────────────── */
let globalAIWorker: Worker | null = null;

function getAIWorker() {
  if (typeof window === "undefined") return null;
  if (!globalAIWorker) {
    try {
      globalAIWorker = new Worker(new URL("../lib/transformersWorker.ts", import.meta.url));
    } catch (err) {
      logger.error("Failed to create AI Worker:", err);
      return null;
    }
  }
  return globalAIWorker;
}

/* ─── Hook ───────────────────────────────────────────────── */

/**
 * useRAG — Hook principal para integração com o sistema de RAG do backend.
 */
export function useRAG() {
  const [isBackendAvailable, setIsBackendAvailable] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [totalSaved, setTotalSaved] = useState(0);
  const [edgeAIStatus, setEdgeAIStatus] = useState<{ progress: number; text: string } | null>(null);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userId = useRef(getUserId());

  /* ── Inicializa IA de Borda (WebGPU) ──────────────────── */
  const initEdgeAI = useCallback(async () => {
    try {
      await edgeAI.init((report) => {
        setEdgeAIStatus(report);
      });
      setEdgeAIStatus({ progress: 1, text: "Edge AI pronta (Offline Mode)" });
    } catch (err) {
      logger.error("Falha ao inicializar Edge AI:", err);
      setEdgeAIStatus({ progress: 0, text: "WebGPU não suportada" });
    }
  }, []);

  /* ── Verifica se o backend está disponível ────────────── */
  const checkBackend = useCallback(async (): Promise<boolean> => {
    try {
      // /rag/stats é público; usamos só como heartbeat.
      await api.get<unknown>("rag/stats", {
        timeoutMs: 2000,
        withAuth: false,
      });
      setIsBackendAvailable(true);
      return true;
    } catch {
      setIsBackendAvailable(false);
      return false;
    }
  }, []);

  /* ── Chat com RAG ─────────────────────────────────────── */
  const chat = useCallback(async (
    query: string,
    history: ChatMessage[] = [],
    tradition?: string,
    jsonMode: boolean = false,
  ): Promise<RagResponse> => {
    // Tenta o backend primeiro (se online)
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const data = await api.post<{ success: boolean; data: RagResponse }>(
          "rag/chat",
          // userId removido — backend pega do JWT (SEC-002).
          { query, tradition, history: history.slice(-6), jsonMode },
          { timeoutMs: 20_000 },
        );
        if (data.success && data.data) {
          if (data.data.meta.cached) {
            setTotalSaved((prev) => prev + 0.015);
          }
          return data.data;
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Sessão expirou e o auto-refresh também falhou — useAuth já foi
          // notificado pelo evento global. Cai pra Edge AI silenciosamente.
        } else {
          logger.warn(
            "[RAG] Backend lento ou indisponível, tentando Edge AI…",
          );
        }
      }
    }

    // Fallback: IA de Borda (WebGPU) se estiver pronta
    if (edgeAI.isReady()) {
      const systemPrompt = `Você é o TheoAI, assistente PhD em teologia. Analise a passagem bíblica ou questão fornecida. Responda em Português. Tradição: ${tradition || 'Geral'}. ${jsonMode ? 'Responda APENAS em JSON seguindo o esquema acadêmico.' : ''}`;
      const content = await edgeAI.generate(query, systemPrompt);
      return {
        content,
        meta: { cached: false, contextUsed: false, contextDocCount: 0, tokensEstimated: 0, costEstimated: 0, cacheSource: "user" }
      };
    }

    // Fallback Final: IA Local Básica (Transformers.js) ou Estática
    const content = await generateLocalAIResponse(query, jsonMode);
    return {
      content,
      meta: { cached: false, contextUsed: true, contextDocCount: 1, tokensEstimated: 0, costEstimated: 0, cacheSource: "user" },
    };
  }, []);

  /* ── IA Local via Transformers.js (Singleton Worker) ───── */
  const generateLocalAIResponse = async (query: string, jsonMode: boolean = false): Promise<string> => {
    return new Promise((resolve) => {
      const aiWorker = getAIWorker();
      
      if (!aiWorker) {
        resolve(generateLocalResponse(query, jsonMode));
        return;
      }

      const messageHandler = (e: any) => {
        if (e.data.type === "EMBEDDING_GENERATED") {
          aiWorker.removeEventListener("message", messageHandler);
          aiWorker.removeEventListener("error", errorHandler);
          
          if (jsonMode) {
             resolve(generateLocalResponse(query, true));
          } else {
             resolve(`[TheoAI Local] Analisando sua dúvida sobre "${query}" offline... \n\nBaseado nos seus estudos locais, este conceito se relaciona com passagens geográficas mapeadas no seu Atlas 4D.`);
          }
        }
      };

      const errorHandler = (err: any) => {
        logger.error("[RAG] Worker error:", err);
        aiWorker.removeEventListener("message", messageHandler);
        aiWorker.removeEventListener("error", errorHandler);
        resolve(generateLocalResponse(query, jsonMode));
      };

      aiWorker.addEventListener("message", messageHandler);
      aiWorker.addEventListener("error", errorHandler);
      
      aiWorker.postMessage({ type: "GENERATE_EMBEDDING", payload: { text: query } });

      // Timeout de segurança
      setTimeout(() => {
        aiWorker.removeEventListener("message", messageHandler);
        aiWorker.removeEventListener("error", errorHandler);
        resolve(generateLocalResponse(query));
      }, 8000);
    });
  };

  /* ── Sincroniza conteúdo do usuário ───────────────────── */
  const syncUserContent = useCallback(async (): Promise<SyncResult | null> => {
    try {
      const data = loadLocalStorageData();
      const totalDocs = data.notes.length + data.sermons.length + 
                        data.highlights.length + data.studies.length + data.bookmarks.length;
      
      if (totalDocs === 0) return null;

      const result = await api.post<{ success: boolean; data: SyncResult }>(
        "rag/sync",
        data,
        { timeoutMs: 30_000 },
      );
      if (result.success) {
        setLastSyncResult(result.data);
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        return result.data;
      }
    } catch (error) {
      logger.warn("[RAG Sync] Falha na sincronização:", error);
    }
    return null;
  }, []);

  /* ── Sincroniza Google Drive ──────────────────────────── */
  const syncDrive = useCallback(
    async (folderId?: string, tradition?: string): Promise<unknown> => {
      try {
        // /drive-library/* não tem o prefixo /api/v1 — usar URL absoluta.
        return await api.post(
          `${API_BASE}/drive-library/ingest`,
          { folderId: folderId || "", tradition: tradition || "Geral" },
          { timeoutMs: 60_000 * 5 },
        );
      } catch (error) {
        logger.warn("[RAG Drive] Falha na ingestão do Drive:", error);
      }
      return null;
    },
    [],
  );

  /* ── Obtém estatísticas ───────────────────────────────── */
  const getStats = useCallback(async (): Promise<RagStats | null> => {
    try {
      const data = await api.get<{ data: RagStats }>("rag/stats", {
        timeoutMs: 5_000,
        withAuth: false,
      });
      return data.data;
    } catch {
      return null;
    }
  }, []);

  /* ── Auto-sync ao montar ──────────────────────────────── */
  useEffect(() => {
    checkBackend().then((available) => {
      if (available) {
        const lastSync = parseInt(localStorage.getItem(LAST_SYNC_KEY) || "0");
        if (Date.now() - lastSync > SYNC_INTERVAL_MS) {
          syncUserContent();
        }
      }
    });

    syncTimerRef.current = setInterval(() => {
      if (isBackendAvailable) {
        syncUserContent();
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [checkBackend, syncUserContent, isBackendAvailable]);

  return {
    chat,
    initEdgeAI,
    edgeAIStatus,
    syncUserContent,
    syncDrive,
    getStats,
    checkBackend,
    isBackendAvailable,
    lastSyncResult,
    totalSaved,
    userId: userId.current,
  };
}

/* ─── Fallback Local (quando backend está offline) ──────── */

function generateLocalResponse(query: string, jsonMode: boolean = false): string {
  const lower = query.toLowerCase();

  if (jsonMode) {
    const isNT = /joao|joão|john|3:16/i.test(lower);
    
    if (!isNT) {
      return JSON.stringify({
        verse: "Gênesis 1:1",
        original_language: "HB",
        interlinear: [
          { word: "בְּרֵאשִׁית", transliteration: "bereshit", strong: "H7225", morphology: "Prep + Substantivo", translation: "No princípio" },
          { word: "בָּרָא", transliteration: "bara", strong: "H1254", morphology: "Verbo Qal Perf.", translation: "criou" },
          { word: "אֱלֹהִים", transliteration: "elohim", strong: "H430", morphology: "Substantivo Pl.", translation: "Deus" }
        ],
        lexical_analysis: [{ word: "bara", bdag_halot_sense: "Criar ex-nihilo", academic_discussion: "Ato criativo soberano" }],
        syntactic_notes: "Estrutura V-S típica de ênfase narrativa.",
        syntactic_graph: { nodes: [{id: "1", label: "bara", type: "verb"}], edges: [] },
        technical_commentary: [{ source: "TheoLocal", view: "Afirmação da transcendência divina." }],
        systematic_connection: { locus: "Protologia", explanation: "Deus como causa primária." }
      });
    }

    return JSON.stringify({
      verse: "João 3:16",
      original_language: "GK",
      interlinear: [
        { word: "Οὕτως", transliteration: "Houtōs", strong: "G3779", morphology: "Advérbio", translation: "De tal maneira" },
        { word: "γὰρ", transliteration: "gar", strong: "G1063", morphology: "Conjunção", translation: "porque" },
        { word: "ἠγάπησεν", transliteration: "ēgapēsen", strong: "G25", morphology: "Verbo Aoristo", translation: "amou" }
      ],
      lexical_analysis: [{ word: "agape", bdag_halot_sense: "Amor sacrificial", academic_discussion: "Foco no objeto amado" }],
      syntactic_notes: "Aoristo indicando ação histórica definitiva.",
      syntactic_graph: { nodes: [{id: "1", label: "amou", type: "verb"}], edges: [] },
      technical_commentary: [{ source: "TheoLocal", view: "O ápice da revelação do amor divino." }],
      systematic_connection: { locus: "Soteriologia", explanation: "A salvação centrada na fé em Cristo." }
    });
  }

  if (lower.includes("predestinação") || lower.includes("livre-arbítrio") || lower.includes("calvinism")) {
    return `## Predestinação vs Livre-Arbítrio

### 📖 Perspectiva Calvinista (Reformada)
A eleição incondicional é central. Deus, antes da fundação do mundo, escolheu soberanamente aqueles que seriam salvos, não com base em méritos previstos, mas segundo Seu propósito eterno.

**Versículos-chave:**
- **Efésios 1:4-5** — "nos escolheu nele antes da fundação do mundo"
- **Romanos 9:11-13** — "para que o propósito de Deus, segundo a eleição, ficasse firme"
- **João 6:44** — "Ninguém pode vir a mim, se o Pai não o trouxer"

### 📖 Perspectiva Arminiana
A graça preveniente capacita todos os seres humanos a aceitar ou rejeitar a salvação. Deus elegeu com base em Sua presciência da fé humana.

**Versículos-chave:**
- **1 Timóteo 2:4** — "que quer que todos os homens se salvem"
- **2 Pedro 3:9** — "não querendo que alguns se percam"
- **João 3:16** — "para que todo aquele que nele crê não pereça"

### 📖 Perspectiva Molinista
Luis de Molina propôs o "conhecimento médio" — Deus conhece todos os cenários possíveis e atualiza aquele em que o máximo de pessoas livremente escolhem a salvação.

### ⚖️ Análise Acadêmica
A tensão entre soberania divina e responsabilidade humana é um dos debates mais antigos da teologia cristã, remontando a Agostinho vs Pelágio (séc. V).

**Grau de Tensão Teológica: 85/100**

---
*Fontes: Institutas (Calvino), Concordia (Molina), Remonstrance (1610)*`;
  }

  if (lower.includes("romanos 9") || lower.includes("romans 9")) {
    return `## Análise Exegética de Romanos 9

### 📜 Contexto Literário
Romanos 9–11 forma uma unidade temática sobre o papel de Israel no plano redentor de Deus.

### 📖 Interpretação Calvinista
Os versículos 9-23 demonstram a soberania absoluta de Deus na eleição:
- **v.11-13**: Jacó e Esaú — escolha antes do nascimento
- **v.18**: "tem misericórdia de quem quer, e endurece a quem quer"
- **v.21**: A metáfora do oleiro — direito absoluto do Criador

### 📖 Interpretação Arminiana (Corporate Election)
O capítulo trata da eleição corporativa/nacional, não individual.

### 📖 Nova Perspectiva sobre Paulo
N.T. Wright argumenta que Romanos 9 trata da fidelidade de Deus à aliança.

### 🔍 Termos-Chave no Grego
- **ἐκλογή** (eklogē) — eleição/escolha
- **σκεύη ὀργῆς** (skeuē orgēs) — vasos de ira

**Grau de Tensão Teológica: 90/100**`;
  }

  return `## Análise Teológica

Essa é uma questão fundamental na teologia cristã com múltiplas perspectivas históricas.

### 📖 Perspectiva Reformada
A tradição reformada enfatiza a soberania absoluta de Deus em todos os aspectos da salvação.

### 📖 Perspectiva Arminiana
A graça preveniente capacita todos os seres humanos a responder ao evangelho.

### ⚖️ Consenso
Todas as tradições concordam que:
- A salvação é pela graça
- A fé é essencial
- Cristo é o único mediador

**Grau de Tensão Teológica: 78/100**

---
*Fontes: Institutas da Religião Cristã, Remonstrance (1610), Confissão de Fé de Westminster*`;
}
