/**
 * test-library-service.js — testa o que o SERVIÇO devolve, não o SQL cru.
 *
 * Importa porque `searchDriveLibrary` deduplica por parentText e limita a 5
 * resultados. Vários trechos-filho apontando para o mesmo trecho-pai viram um
 * só — então "8 acima do limiar" no SQL pode virar 2 no serviço, e a regra de
 * consenso (LIBRARY_DIRECT_MIN_HITS) precisa ser calibrada sobre este número.
 *
 *   node scratch/test-library-service.js "pergunta"
 */
require('dotenv').config({ quiet: true });

const LIMIAR = Number(process.env.LIBRARY_DIRECT_THRESHOLD ?? 0.79);
const MIN_HITS = Number(process.env.LIBRARY_DIRECT_MIN_HITS ?? 3);

const PERGUNTAS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'O dom de linguas cessou apos a era apostolica',
      'O que Grudem ensina sobre a justificacao pela fe',
      'Quais achados arqueologicos confirmam a destruicao de Ninive',
    ];

(async () => {
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/app.module');
  const { UserContextService } = require('../dist/rag/user-context.service');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  const userContext = app.get(UserContextService);

  console.log(`limiar ${LIMIAR} · mínimo de ${MIN_HITS} trecho(s)\n`);

  for (const pergunta of PERGUNTAS) {
    const hits = await userContext.searchDriveLibrary(pergunta, 'public-guest');
    const acima = hits.filter((h) => h.similarity >= LIMIAR);

    console.log(`▸ ${pergunta}`);
    console.log(
      `  devolvidos: ${hits.length} · acima do limiar: ${acima.length}`,
    );
    for (const h of hits) {
      const marca = h.similarity >= LIMIAR ? '✅' : '  ';
      console.log(
        `   ${marca} ${(h.similarity * 100).toFixed(1)}%  ${(h.title ?? '?').slice(0, 46)}`,
      );
    }
    console.log(
      `  → ${acima.length >= MIN_HITS ? 'BIBLIOTECA responde (0 chamadas de IA)' : 'vai para a IA'}\n`,
    );
  }

  await app.close();
})().catch((e) => {
  console.error('Erro:', e.message);
  process.exit(1);
});
