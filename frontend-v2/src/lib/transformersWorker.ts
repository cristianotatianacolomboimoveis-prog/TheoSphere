import { pipeline, env } from '@xenova/transformers';

// Configurações para rodar localmente sem internet
env.allowLocalModels = true;
env.useBrowserCache = true;

let embedder: any = null;

async function initAI() {
  try {
    // Usamos um modelo leve e eficiente (Xenova/all-MiniLM-L6-v2)
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log("TheoSphere AI: Local Embedder Initialized.");
  } catch (e) {
    console.error("TheoSphere AI: Failed to initialize embedder:", e);
  }
}

const aiPromise = initAI();

self.addEventListener('message', async (event) => {
  try {
    await aiPromise;
    if (!embedder) throw new Error("Embedder not initialized");

    const { type, payload } = event.data;

    if (type === 'GENERATE_EMBEDDING') {
      const { text } = payload;
      const output = await embedder(text, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
      
      self.postMessage({ type: 'EMBEDDING_GENERATED', payload: { text, embedding } });
    }
  } catch (error: any) {
    console.error("[TransformersWorker Error]:", error);
    self.postMessage({ type: 'ERROR', payload: { message: error.message } });
  }
});
