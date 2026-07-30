/**
 * check-factbook.js — valida o caminho jsonMode ponta a ponta em produção.
 *
 * É o caso mais sensível à truncagem: JSON cortado é JSON inválido, e o
 * Factbook mostrava "a IA respondeu, mas não no formato de dossiê" sem que
 * ninguém soubesse que a causa era o teto de saída (30/07/2026).
 *
 * Envia o mesmo prompt que o componente Factbook envia.
 *
 *   node scratch/check-factbook.js [termo]
 */
const BASE = process.env.BASE_URL ?? 'https://theosphere.onrender.com';
const termo = process.argv[2] ?? 'Nínive';

const prompt = `Gere um dossiê Factbook acadêmico profissional (estilo Logos Bible Software) para o termo "${termo}".
    O conteúdo deve ser profundo, exegético e histórico.
    Nas "verses", use referências bíblicas no formato "Livro Capítulo:Versículo" em português (ex: "Gênesis 14:18").
    Retorne um JSON estritamente com a seguinte estrutura:
    {
      "title": "${termo}",
      "subtitle": "Categoria Acadêmica (Pessoa, Lugar, Evento, etc)",
      "sections": [
        { "id": "overview", "title": "Visão Geral", "icon": "Info", "content": "Resumo enciclopédico profundo..." },
        { "id": "key-articles", "title": "Artigos Principais", "icon": "BookOpen", "items": ["Artigo 1 de dicionário", "Artigo 2"] },
        { "id": "passages", "title": "Passagens Chave", "icon": "ScrollText", "verses": ["Gênesis 14:18", "Hebreus 7:1"] },
        { "id": "events", "title": "Eventos Relacionados", "icon": "Calendar", "items": ["Evento 1", "Evento 2"] },
        { "id": "related", "title": "Tópicos Relacionados", "icon": "Link2", "tags": ["Tópico A", "Tópico B"] },
        { "id": "further-reading", "title": "Leitura Adicional", "icon": "ExternalLink", "links": ["Referência 1", "Referência 2"] }
      ]
    }`;

(async () => {
  const res = await fetch(`${BASE}/api/v1/rag/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: prompt, jsonMode: true }),
  });

  const { data } = await res.json();
  const m = data.meta ?? {};
  const bruto = data.content ?? '';

  console.log(`termo    : ${termo}`);
  console.log(`cached   : ${m.cached} | degraded: ${m.degraded ?? false}`);
  console.log(`tamanho  : ${bruto.length} caracteres`);

  // Mesma lógica do componente Factbook.
  let parsed = null;
  try {
    const bloco = bruto.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    parsed = JSON.parse(bloco ? bloco[1] : bruto);
  } catch (e) {
    console.log(`\n✂️  JSON INVÁLIDO: ${e.message}`);
    console.log(`final: …${bruto.slice(-90).replace(/\s+/g, ' ')}`);
    process.exitCode = 1;
    return;
  }

  if (!Array.isArray(parsed.sections)) {
    console.log('\n❌ JSON válido, mas sem o array "sections" — o Factbook descartaria.');
    console.log('campos recebidos:', Object.keys(parsed).join(', '));
    process.exitCode = 1;
    return;
  }

  console.log(`\n✅ dossiê válido: "${parsed.title}" — ${parsed.subtitle}`);
  console.log(`   ${parsed.sections.length} seções: ${parsed.sections.map((s) => s.id).join(', ')}`);

  const versos = parsed.sections.flatMap((s) => s.verses ?? []);
  console.log(`   referências: ${versos.join(' · ') || '(nenhuma)'}`);
})();
