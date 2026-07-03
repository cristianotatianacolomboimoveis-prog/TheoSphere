"use client";

import * as webllm from "@mlc-ai/web-llm";

/**
 * EdgeAIService — Motor de IA Local via WebGPU (v2).
 *
 * Melhorias sobre v1:
 *   - Seleção automática de modelo por capacidade da GPU
 *   - Streaming token-a-token via AsyncGenerator
 *   - System prompt teológico embutido
 *   - Gestão de contexto (truncamento inteligente)
 *   - Estado observável (status, modelo carregado, VRAM estimada)
 *   - Fallback gracioso se WebGPU não estiver disponível
 */

type ProgressCallback = (report: { progress: number; text: string }) => void;
type StreamCallback = (token: string) => void;

export type EdgeAIStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "ready"
  | "error"
  | "unsupported";

/** Modelo candidato para seleção automática */
interface ModelCandidate {
  id: string;
  label: string;
  /** Estimativa de VRAM necessária em GB */
  vramGB: number;
  /** Tamanho do contexto em tokens */
  contextLength: number;
}

/**
 * Modelos ordenados por qualidade (melhor primeiro).
 * A seleção automática tenta o melhor que cabe na VRAM disponível.
 */
const MODEL_CANDIDATES: ModelCandidate[] = [
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    label: "Phi-3.5 Mini (3.8B)",
    vramGB: 3.5,
    contextLength: 4096,
  },
  {
    id: "gemma-2-2b-it-q4f16_1-MLC",
    label: "Gemma 2 (2B)",
    vramGB: 2.0,
    contextLength: 2048,
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 (1.5B)",
    vramGB: 1.5,
    contextLength: 2048,
  },
  {
    id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    label: "SmolLM2 (1.7B)",
    vramGB: 1.5,
    contextLength: 2048,
  },
];

/** System prompt teológico para Edge AI */
const EDGE_SYSTEM_PROMPT = `Você é o TheoS Edge, um assistente teológico e bíblico que roda localmente no navegador do usuário.
Você é especialista em:
- Exegese bíblica (análise textual do hebraico e grego)
- Hermenêutica e interpretação bíblica
- Teologia sistemática (reformada, arminiana, católica, ortodoxa)
- História da igreja e patrística
- Comentários clássicos (Calvino, Lutero, Agostinho, Wesley, Spurgeon)

Regras:
- Responda em português brasileiro, a menos que o usuário escreva em outro idioma.
- Seja acadêmico mas acessível. Cite referências bíblicas no formato "Livro Cap:Vers".
- Se não souber algo com certeza, diga claramente.
- Nunca invente referências Strong's ou citações acadêmicas.
- Mantenha respostas concisas (máximo ~300 palavras) para performance local.`;

class EdgeAIService {
  private engine: webllm.MLCEngine | null = null;
  private selectedModel: ModelCandidate | null = null;
  private _status: EdgeAIStatus = "idle";
  private _initPromise: Promise<boolean> | null = null;
  private statusListeners: Set<(status: EdgeAIStatus) => void> = new Set();

  get status(): EdgeAIStatus {
    return this._status;
  }

  get modelLabel(): string {
    return this.selectedModel?.label ?? "Nenhum";
  }

  get contextLength(): number {
    return this.selectedModel?.contextLength ?? 2048;
  }

  /** Subscribe to status changes */
  onStatusChange(cb: (status: EdgeAIStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private setStatus(s: EdgeAIStatus) {
    this._status = s;
    this.statusListeners.forEach((cb) => cb(s));
  }

  /**
   * Checks WebGPU support without initializing anything.
   * Use for UI indicators before user triggers full init.
   */
  async checkSupport(): Promise<boolean> {
    if (typeof window === "undefined" || !navigator.gpu) return false;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }

  /**
   * Selects the best model for the available GPU.
   * Tries to request a device with enough storage buffers,
   * then picks the largest model that fits.
   */
  private async selectModel(): Promise<ModelCandidate | null> {
    if (!navigator.gpu) return null;

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;

    // Check storage buffer limit
    const limits = adapter.limits;
    const requiredBuffers = 10;
    if (
      limits &&
      typeof limits.maxStorageBuffersPerShaderStage === "number" &&
      limits.maxStorageBuffersPerShaderStage < requiredBuffers
    ) {
      console.warn(
        `[EdgeAI] maxStorageBuffersPerShaderStage=${limits.maxStorageBuffersPerShaderStage} < ${requiredBuffers}`,
      );
      return null;
    }

    // Verify device can satisfy required limits
    try {
      const testDevice = await adapter.requestDevice({
        requiredLimits: {
          maxStorageBuffersPerShaderStage: requiredBuffers,
        },
      });
      testDevice.destroy();
    } catch {
      return null;
    }

    // Estimate available VRAM (heuristic: maxBufferSize as proxy)
    const maxBuffer = Number(limits?.maxBufferSize ?? 0);
    const estimatedVRAM = maxBuffer > 0 ? maxBuffer / (1024 ** 3) : 4; // fallback: assume 4GB

    // Pick the best model that fits
    for (const candidate of MODEL_CANDIDATES) {
      if (candidate.vramGB <= estimatedVRAM * 0.8) {
        // 80% threshold for safety
        return candidate;
      }
    }

    // If nothing fits well, try the smallest
    return MODEL_CANDIDATES[MODEL_CANDIDATES.length - 1];
  }

  /**
   * Initializes the Edge AI engine.
   * Downloads model weights on first run (~1-3 GB, cached by browser).
   * Subsequent calls return immediately if already initialized.
   */
  async init(onProgress?: ProgressCallback): Promise<boolean> {
    if (this.engine) return true;

    // Dedup concurrent init calls
    if (this._initPromise) return this._initPromise;

    this._initPromise = this._doInit(onProgress);
    const result = await this._initPromise;
    this._initPromise = null;
    return result;
  }

  private async _doInit(onProgress?: ProgressCallback): Promise<boolean> {
    this.setStatus("checking");

    try {
      if (
        typeof window === "undefined" ||
        typeof navigator === "undefined" ||
        !navigator.gpu
      ) {
        this.setStatus("unsupported");
        return false;
      }

      const model = await this.selectModel();
      if (!model) {
        this.setStatus("unsupported");
        return false;
      }

      this.selectedModel = model;
      this.setStatus("downloading");

      console.log(`[EdgeAI] Initializing ${model.label} (${model.id})`);

      this.engine = await webllm.CreateMLCEngine(model.id, {
        initProgressCallback: (report) => {
          onProgress?.({
            progress: report.progress,
            text: report.text,
          });
        },
      });

      this.setStatus("ready");
      console.log(`[EdgeAI] ${model.label} ready`);
      return true;
    } catch (err) {
      console.warn("[EdgeAI] Initialization failed:", err);
      this.setStatus("error");
      return false;
    }
  }

  /**
   * Generate a response with streaming.
   * Yields tokens one at a time for real-time display.
   */
  async *generateStream(
    prompt: string,
    systemPrompt?: string,
  ): AsyncGenerator<string> {
    if (!this.engine) {
      throw new Error("Edge AI não inicializada. Chame init() primeiro.");
    }

    const messages: webllm.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt || EDGE_SYSTEM_PROMPT },
      { role: "user", content: this.truncateToContext(prompt) },
    ];

    const stream = await this.engine.chat.completions.create({
      messages,
      temperature: 0.3,
      max_tokens: 800,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  /**
   * Generate a full response (non-streaming, for backward compat).
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.engine) {
      throw new Error("Edge AI não inicializada. Chame init() primeiro.");
    }

    const messages: webllm.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt || EDGE_SYSTEM_PROMPT },
      { role: "user", content: this.truncateToContext(prompt) },
    ];

    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: 0.3,
      max_tokens: 800,
    });

    return reply.choices[0].message.content || "";
  }

  /**
   * Generate with a callback per token (simpler API for React).
   */
  async generateWithCallback(
    prompt: string,
    onToken: StreamCallback,
    systemPrompt?: string,
  ): Promise<string> {
    let full = "";
    for await (const token of this.generateStream(prompt, systemPrompt)) {
      full += token;
      onToken(token);
    }
    return full;
  }

  /**
   * Truncates input to fit within the model's context window.
   * Reserves ~800 tokens for output and ~200 for system prompt.
   */
  private truncateToContext(text: string): string {
    const maxInputChars = (this.contextLength - 1000) * 3; // ~3 chars/token for Portuguese
    if (text.length <= maxInputChars) return text;

    console.warn(
      `[EdgeAI] Truncating input from ${text.length} to ${maxInputChars} chars`,
    );
    return text.slice(0, maxInputChars) + "\n\n[Texto truncado por limite de contexto]";
  }

  isReady(): boolean {
    return !!this.engine;
  }

  /** Unload model and free VRAM */
  async dispose(): Promise<void> {
    if (this.engine) {
      try {
        await (this.engine as any).unload?.();
      } catch {
        // best effort
      }
      this.engine = null;
      this.selectedModel = null;
      this.setStatus("idle");
    }
  }
}

// Singleton — only one model instance should run in the browser
export const edgeAI = new EdgeAIService();
