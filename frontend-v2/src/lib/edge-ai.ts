"use client";

import * as webllm from "@mlc-ai/web-llm";

/**
 * EdgeAIService — Motor de IA Local via WebGPU.
 * Permite exegese e análise 100% offline.
 */

type ProgressCallback = (report: { progress: number; text: string }) => void;

class EdgeAIService {
  private engine: webllm.MLCEngine | null = null;
  private selectedModel = "gemma-2b-it-q4f16_1-MLC"; // Modelo leve e potente para exegese
  // Dica: Use webllm.prebuiltAppConfig.model_list para ver os IDs disponíveis se este falhar.
  private isInitializing = false;

  /**
   * Inicializa o modelo no navegador.
   * Isso irá baixar os pesos (vários GBs) apenas na primeira vez.
   */
  async init(onProgress?: ProgressCallback): Promise<boolean> {
    if (this.engine) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    try {
      // 1. Pré-verificação de suporte WebGPU
      if (
        typeof window === "undefined" ||
        typeof navigator === "undefined" ||
        !navigator.gpu
      ) {
        console.warn("WebGPU não é suportada ou disponível neste navegador.");
        this.isInitializing = false;
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn(
          "WebGPU disponível, mas nenhum adaptador de GPU compatível foi encontrado.",
        );
        this.isInitializing = false;
        return false;
      }

      const requiredBuffers = 10;

      // 2. Verificação estática por propriedade dos limites (se disponível no objeto limits)
      const limits = adapter.limits;
      if (
        limits &&
        typeof limits.maxStorageBuffersPerShaderStage === "number" &&
        limits.maxStorageBuffersPerShaderStage < requiredBuffers
      ) {
        console.warn(
          `Dispositivo WebGPU incompatível: maxStorageBuffersPerShaderStage suportado é ${limits.maxStorageBuffersPerShaderStage}, mas o modelo exige pelo menos ${requiredBuffers}.`,
        );
        this.isInitializing = false;
        return false;
      }

      // 3. Verificação dinâmica ativa por tentativa de inicialização (segurança para Safari/navegadores com limites ocultos)
      try {
        const testDevice = await adapter.requestDevice({
          requiredLimits: {
            maxStorageBuffersPerShaderStage: requiredBuffers,
          },
        });
        testDevice.destroy();
      } catch (deviceErr) {
        console.warn(
          `A GPU não pôde satisfazer o limite exigido de maxStorageBuffersPerShaderStage = ${requiredBuffers} (Erro: ${deviceErr instanceof Error ? deviceErr.message : String(deviceErr)}).`,
        );
        this.isInitializing = false;
        return false;
      }

      // 4. Inicialização definitiva do MLC Engine
      this.engine = await webllm.CreateMLCEngine(this.selectedModel, {
        initProgressCallback: (report) => {
          if (onProgress) {
            onProgress({
              progress: report.progress,
              text: report.text,
            });
          }
        },
      });
      return true;
    } catch (err) {
      console.warn(
        "Erro ao inicializar Edge AI (WebGPU pode não estar disponível ou limites insuficientes):",
        err,
      );
      this.isInitializing = false;
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Gera uma resposta offline baseada no contexto.
   */
  async generate(prompt: string, systemPrompt: string): Promise<string> {
    if (!this.engine) {
      throw new Error("Edge AI não inicializada. Chame init() primeiro.");
    }

    const messages: webllm.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: 0.2,
      max_tokens: 1000,
    });

    return reply.choices[0].message.content || "";
  }

  isReady() {
    return !!this.engine;
  }
}

// Singleton para garantir que apenas uma instância do modelo rode no navegador
export const edgeAI = new EdgeAIService();
