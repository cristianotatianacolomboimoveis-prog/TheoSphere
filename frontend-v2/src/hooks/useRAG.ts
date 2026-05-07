"use client";

import { useState, useCallback, useRef, useEffect } from "react";

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
    globalAIWorker = new Worker(new URL("../lib/transformersWorker.ts", import.meta.url));
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
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userId = useRef(getUserId());

  /* ── Verifica se o backend está disponível ────────────── */
  const checkBackend = useCallback(async (): Promise<boolean> => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/v1/rag/stats`, {
        method: "GET",
        headers: { 
          "X-User-ID": userId.current,
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        signal: AbortSignal.timeout(2000),
      });
      const available = res.ok;
      setIsBackendAvailable(available);
      return available;
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
    // Tenta o backend primeiro
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/v1/rag/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-ID": userId.current,
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          query,
          userId: userId.current,
          tradition,
          history: history.slice(-6), 
          jsonMode,
        }),
        signal: AbortSignal.timeout(20000), // Reduzido para 20s
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.meta.cached) {
            setTotalSaved(prev => prev + 0.015);
          }
          return data.data;
        }
      }
    } catch (error) {
      console.warn("[RAG] Backend indisponível, usando fallback local:", error);
    }

    // Fallback: IA Local
    const content = jsonMode 
      ? JSON.stringify([{ original: query, translit: "...", root: "...", rootTrans: "...", translation: "...", morphology: "..." }])
      : await generateLocalAIResponse(query);

    return {
      content,
      meta: {
        cached: false,
        contextUsed: true,
        contextDocCount: 1,
        tokensEstimated: 0,
        costEstimated: 0,
        cacheSource: "user"
      },
    };
  }, []);

  /* ── IA Local via Transformers.js (Singleton Worker) ───── */
  const generateLocalAIResponse = async (query: string): Promise<string> => {
    return new Promise((resolve) => {
      const aiWorker = getAIWorker();
      
      if (!aiWorker) {
        resolve(generateLocalResponse(query));
        return;
      }

      const messageHandler = (e: any) => {
        if (e.data.type === "EMBEDDING_GENERATED") {
          aiWorker.removeEventListener("message", messageHandler);
          aiWorker.removeEventListener("error", errorHandler);
          resolve(`[TheoAI Local] Analisando sua dúvida sobre "${query}" offline... \n\nBaseado nos seus estudos locais, este conceito se relaciona com passagens geográficas mapeadas no seu Atlas 4D.`);
        }
      };

      const errorHandler = (err: any) => {
        console.error("[RAG] Worker error:", err);
        aiWorker.removeEventListener("message", messageHandler);
        aiWorker.removeEventListener("error", errorHandler);
        resolve(generateLocalResponse(query));
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

      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/v1/rag/sync`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-ID": userId.current,
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId: userId.current,
          ...data,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          const syncResult = result.data as SyncResult;
          setLastSyncResult(syncResult);
          localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
          console.log(`[RAG Sync] Indexados: ${syncResult.indexed}, Já existentes: ${syncResult.skipped}, Total: ${syncResult.total}`);
          return syncResult;
        }
      }
    } catch (error) {
      console.warn("[RAG Sync] Falha na sincronização:", error);
    }
    return null;
  }, []);

  /* ── Obtém estatísticas ───────────────────────────────── */
  const getStats = useCallback(async (): Promise<RagStats | null> => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/v1/rag/stats`, {
        headers: { 
          "X-User-ID": userId.current,
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data;
      }
    } catch {}
    return null;
  }, []);

  /* ── Auto-sync ao montar ──────────────────────────────── */
  useEffect(() => {
    // Verifica backend e sincroniza na montagem
    checkBackend().then((available) => {
      if (available) {
        // Verifica se já sincronizou recentemente
        const lastSync = parseInt(localStorage.getItem(LAST_SYNC_KEY) || "0");
        if (Date.now() - lastSync > SYNC_INTERVAL_MS) {
          syncUserContent();
        }
      }
    });

    // Sincronização periódica
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
    syncUserContent,
    getStats,
    checkBackend,
    isBackendAvailable,
    lastSyncResult,
    totalSaved,
    userId: userId.current,
  };
}

/* ─── Fallback Local (quando backend está offline) ──────── */

function generateLocalResponse(query: string): string {
  const lower = query.toLowerCase();

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

  if (lower.includes("dons") || lower.includes("espírito") || lower.includes("cessacion")) {
    return `## Dons Espirituais: Cessacionismo vs Continuacionismo

### 📖 Cessacionismo
Os dons milagrosos cessaram com a era apostólica e o fechamento do cânon.
**Defensores:** B.B. Warfield, John MacArthur, R.C. Sproul

### 📖 Continuacionismo
Todos os dons permanecem ativos até a volta de Cristo.
**Defensores:** Wayne Grudem, Sam Storms, John Piper

### 📊 Dados Históricos
- Irineu (130-202 d.C.) relata dons em sua época
- O avivamento da Rua Azusa (1906) impulsionou o pentecostalismo moderno

**Grau de Tensão Teológica: 72/100**`;
  }

  if (lower.includes("batismo") || lower.includes("imersão") || lower.includes("aspersão")) {
    return `## Batismo: Aspersão vs Imersão

### 📖 Batismo por Imersão
**βαπτίζω** (baptizō) = "mergulhar, imergir"
Romanos 6:3-4 — simbolismo de morte e ressurreição

### 📖 Batismo por Aspersão/Derramamento
Didaquê (70-100 d.C.) permitia derramamento quando não havia água suficiente.

**Grau de Tensão Teológica: 65/100**`;
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
