import axios from 'axios';

/**
 * 🚀 TheoSphere Master RAG Orchestrator
 * Sincroniza e Indexa TUDO: Bíblia e Google Drive.
 */

const BASE_URL = 'http://localhost:3002/api/v1';

async function run() {
  console.log('🌟 Iniciando Orquestração TheoSphere RAG FULL...');

  // 1. Ingestão de Texto das Bíblias Principais
  // O script anterior (mass-ingest-bibles.ts) já deve estar rodando.
  // Aqui apenas confirmamos se o backend está pronto.
  console.log('📖 Passo 1: Garantindo disponibilidade das versões bíblicas...');

  // 2. Disparar Indexação RAG para Bíblias Prioritárias
  const versions = ['ARA', 'WLC', 'KJV', 'TR'];
  for (const v of versions) {
    try {
      console.log(`🧠 Indexando RAG para ${v}...`);
      const res = await axios.get(`${BASE_URL}/bible/ingest-embeddings?translation=${v}&limit=5000`);
      console.log(`✅ ${v}: ${res.data.message}`);
    } catch (err: any) {
      console.error(`❌ Erro ao indexar ${v}: ${err.message}`);
    }
  }

  // 3. Reindexação Total da Biblioteca Drive
  try {
    console.log('📚 Passo 2: Iniciando Reindexação FULL da biblioteca Google Drive...');
    // Chamada ao endpoint de reindex (se existir) ou simulação via ingestFolder
    // O endpoint POST /api/v1/library/reindex seria o ideal.
    const res = await axios.post(`${BASE_URL}/library/reindex`, {
      tradition: 'Geral'
    });
    console.log('✅ Reindexação da biblioteca disparada com sucesso.');
  } catch (err: any) {
    console.error(`❌ Erro ao disparar reindex do Drive: ${err.message}`);
  }

  console.log('\n🏁 Orquestração completa. O processamento continuará em background no servidor.');
}

run();
