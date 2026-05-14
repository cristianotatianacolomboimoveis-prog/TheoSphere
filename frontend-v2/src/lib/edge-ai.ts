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
  async init(onProgress?: ProgressCallback) {
    if (this.engine) return;
    if (this.isInitializing) return;
    
    this.isInitializing = true;
    try {
      // Usamos CreateMLCEngine para inicialização mais robusta
      this.engine = await webllm.CreateMLCEngine(this.selectedModel, {
        initProgressCallback: (report) => {
          if (onProgress) {
            onProgress({ 
              progress: report.progress, 
              text: report.text 
            });
          }
        }
      });
    } catch (err) {
      console.error("Erro ao inicializar Edge AI (WebGPU pode não estar disponível ou modelo não encontrado):", err);
      this.isInitializing = false;
      throw err;
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
      { role: "user", content: prompt }
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
