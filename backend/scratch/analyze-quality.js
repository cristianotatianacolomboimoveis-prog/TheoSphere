/**
 * analyze-quality.js — avalia a QUALIDADE de cada obra antes de indexar.
 *
 * Motivo (30/07/2026): as três primeiras obras indexadas revelaram que boa
 * parte do acervo são PDFs de origem duvidosa passados por tradutor
 * automático. Amostras reais do Grudem indexado:
 *
 *   "a multidão que ELABOROU os enfermos para as ruas"   (levavam)
 *   "quando PETER, pelo menos a sua sombra"              (Pedro)
 *   "espaço para posterior discordar do seu ponto, EA"   (e a)
 *   "-- 1441 of 2098 --"                                 (paginação no texto)
 *
 * Servir isso citado como "Wayne Grudem" é pior que não ter biblioteca: a
 * plataforma atribui a um teólogo frases que ele não escreveu.
 *
 * Este script baixa o arquivo, extrai o texto com o MESMO extrator da
 * ingestão (para a nota refletir o que seria indexado de fato) e pontua.
 *
 *   node scratch/analyze-quality.js             # todos os elegíveis
 *   node scratch/analyze-quality.js "Carson"    # filtra por nome (sem acento importa)
 *   node scratch/analyze-quality.js --limite 10
 *   node scratch/analyze-quality.js --pendentes # só o que falta: obras novas
 *                                               # no Drive + vereditos duvidosos
 *
 * Nota final 0–100. O corte usado pela ingestão é 70.
 */
require('dotenv').config({ quiet: true });

const { google } = require('googleapis');
const { GoogleGenAI } = require('@google/genai');
const fs = require('node:fs');
const path = require('node:path');

/**
 * ── Por que existe um segundo estágio com IA ────────────────────────────────
 *
 * As heurísticas abaixo foram calibradas no Grudem, cujo tradutor automático
 * deixou "Peter" e "Paul" em inglês. Aplicadas ao Sproul, deram 97/100 — e o
 * Sproul indexado contém:
 *
 *   "a bondade EA doçura da graça"        (e a)
 *   "Eles foram feitos BOM"               (concordância quebrada)
 *   "Nós temos que CURVAR-SE"             (pronome não concorda com o sujeito)
 *   "eles não ESTAVAM A COMER o fruto"    (construção lusitana de máquina)
 *
 * Ou seja: o tradutor do Sproul era melhor — acertou os nomes próprios — e por
 * isso escapou. Cada obra falha de um jeito diferente, e perseguir isso com
 * mais regex é um jogo que não se ganha.
 *
 * Então o estágio 2 faz o que um revisor humano faria: lê três passagens e
 * julga. Custa ~500 tokens por obra (contra ~450 mil de embedding se ela for
 * indexada), então é barato até para reprovar.
 */
const PROMPT_JUIZ = `Você é revisor de tradução de obras teológicas.

Leia as passagens abaixo e decida se o texto é:
  "humana"    — tradução profissional publicada, português natural e correto
  "automatica" — passou por tradutor automático (concordância quebrada,
                 ordem de palavras do inglês, pronomes errados, colagens
                 como "ea"/"eo", construções literais sem sentido em português)
  "ilegivel"  — OCR destruído, texto truncado ou sem sentido

Seja rigoroso. Um único erro de digitação não condena; erros sistemáticos de
concordância, regência ou ordem de palavras, sim.

Responda SOMENTE com JSON:
{"veredito":"humana|automatica|ilegivel","confianca":0-100,"evidencia":"a frase mais reveladora, no máximo 15 palavras"}`;

/**
 * Remove a sujeira de extração antes de qualquer avaliação.
 *
 * Sem isto, três obras em cada dez eram reprovadas como "ilegíveis" porque as
 * passagens sorteadas caíam em blocos de "-- 75 of 212 --". O revisor via só
 * números e condenava o livro — que estava inteiro, com as marcas apenas
 * intercaladas. Foram parar nesse balaio Owen, Schaeffer, Piper e o comentário
 * de Hodge à Confissão de Westminster.
 *
 * A mesma limpeza precisa rodar na ingestão: marca de paginação no meio de um
 * trecho citado é ruído que o leitor vê.
 */
function limparTexto(texto) {
  return texto
    .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, ' ')
    .replace(/\bPage\s+\d+\s+of\s+\d+\b/gi, ' ')
    // Hifenização de fim de linha: "justi- ficação" → "justificação".
    .replace(/(\w)-\s+(\w)/g, '$1$2')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Colhe passagens do miolo da obra — capa e índice não representam o texto. */
function amostrar(texto, quantas = 3, tamanho = 700) {
  const util = texto.slice(Math.floor(texto.length * 0.15), Math.floor(texto.length * 0.9));
  const passo = Math.floor(util.length / (quantas + 1));
  const amostras = [];
  for (let i = 1; i <= quantas; i++) {
    amostras.push(util.slice(passo * i, passo * i + tamanho).replace(/\s+/g, ' ').trim());
  }
  return amostras;
}

async function julgarComIA(genAI, texto) {
  const passagens = amostrar(texto)
    .map((p, i) => `--- Passagem ${i + 1} ---\n${p}`)
    .join('\n\n');

  const res = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: passagens }] }],
    config: {
      systemInstruction: PROMPT_JUIZ,
      // Raciocínio consome o teto de saída (lição de 29/07). Desligado.
      thinkingConfig: { thinkingBudget: 0 },
      // 200 truncava a resposta no meio da terceira evidência, o JSON não
      // parseava e a obra saía como "indeterminado" — que o código antigo
      // tratava como não-reprovada. Ou seja: o truncamento aprovava em
      // silêncio, exatamente o modo de falha que este script existe para
      // impedir. 600 cabe folgadamente três vereditos.
      maxOutputTokens: 600,
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const bruto = res.text ?? '';
  let dados;
  try {
    dados = JSON.parse(bruto);
  } catch {
    // Resgate: mesmo truncada, a resposta costuma trazer vereditos completos
    // antes do corte. Aproveitá-los é melhor que descartar tudo — e muito
    // melhor que deixar passar por falta de veredito.
    const salvos = [...bruto.matchAll(/"veredito"\s*:\s*"(\w+)"\s*,\s*"confianca"\s*:\s*(\d+)/g)].map(
      (m) => ({ veredito: m[1], confianca: Number(m[2]), evidencia: '(resposta truncada)' }),
    );
    if (salvos.length === 0) {
      return { veredito: 'indeterminado', confianca: 0, evidencia: bruto.slice(0, 60) };
    }
    dados = salvos;
  }

  // O modelo às vezes devolve um veredito por passagem (array) e às vezes um
  // veredito único (objeto). Normalizar aqui evita ler `.veredito` de um array
  // e receber `undefined` — o que faria toda obra passar em silêncio.
  const votos = Array.isArray(dados) ? dados : [dados];
  if (votos.length === 0) {
    return { veredito: 'indeterminado', confianca: 0, evidencia: '' };
  }

  // Basta uma passagem condenada com confiança alta: tradução automática não
  // acontece em pedaços. Se o revisor viu numa, a obra inteira passou pelo
  // mesmo processo — e o resto só não denunciou por sorte da amostragem.
  const condena = votos.find(
    (v) => v.veredito === 'automatica' && (v.confianca ?? 0) >= 70,
  );
  if (condena) return { ...condena, votos: votos.length };

  const ilegivel = votos.filter((v) => v.veredito === 'ilegivel');
  if (ilegivel.length > votos.length / 2) {
    return { ...ilegivel[0], votos: votos.length };
  }

  const melhor = votos.reduce((a, b) => ((b.confianca ?? 0) > (a.confianca ?? 0) ? b : a));
  return { ...melhor, votos: votos.length };
}

// ── Sinais de tradução automática para o português ─────────────────────────
// Nomes bíblicos que uma tradução humana SEMPRE verte. Se aparecem em inglês
// num texto português, passou por máquina.
const NOMES_EN = [
  'Peter', 'Paul', 'John', 'James', 'Moses', 'Joshua', 'Isaiah', 'Jeremiah',
  'Matthew', 'Mark', 'Luke', 'Timothy', 'Titus', 'Hebrews', 'Romans',
  'Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
];

// Palavras funcionais inglesas soltas no meio do português.
const FUNC_EN = [
  ' the ', ' and ', ' of the ', ' that ', ' with ', ' which ', ' would ',
  ' should ', ' there is ', ' it is ',
];

// Colagens típicas de tradutor automático antigo.
const COLAGENS = [/\bea\b/g, /\beo\b/g, /\bque lá\b/g, /\bpara a frente\b/g];

// ── Sinais de extração/OCR ruim ────────────────────────────────────────────
const PAGINACAO = /--\s*\d+\s*of\s*\d+\s*--|\bPage\s+\d+\s+of\s+\d+/gi;
const HIFEN_QUEBRADO = /\w-\s+\w/g;
const CTRL_LIXO = /[� --]/g;

// Português correto tem estas palavras em abundância.
const STOP_PT = [
  ' que ', ' não ', ' para ', ' com ', ' uma ', ' dos ', ' das ', ' pelo ',
  ' pela ', ' isso ', ' como ', ' mas ', ' ele ', ' ela ', ' são ',
];

function pontuar(texto, nomeArquivo) {
  const t = texto;
  const n = t.length;
  if (n < 2000) {
    // Quase sempre um PDF escaneado sem camada de texto: o arquivo tem
    // centenas de páginas, mas o extrator só encontra o que o OCR deixou.
    // Não há o que indexar — a obra precisa passar por OCR antes.
    return {
      nota: 0,
      sinais: {},
      penalidades: [`sem texto extraível (${n} caracteres) — PDF escaneado?`],
      graves: ['sem texto extraível'],
    };
  }

  const porMil = (c) => (c / (n / 1000)).toFixed(2);
  const conta = (re) => (t.match(re) ?? []).length;

  const nomesEn = NOMES_EN.reduce(
    (a, w) => a + conta(new RegExp(`\\b${w}\\b`, 'g')),
    0,
  );
  const funcEn = FUNC_EN.reduce((a, w) => a + conta(new RegExp(w, 'gi')), 0);
  const colagens = COLAGENS.reduce((a, re) => a + conta(re), 0);
  const paginacao = conta(PAGINACAO);
  const hifen = conta(HIFEN_QUEBRADO);
  const lixo = conta(CTRL_LIXO);
  const stopPt = STOP_PT.reduce((a, w) => a + conta(new RegExp(w, 'gi')), 0);

  const sinais = {
    'nomes em inglês/1k': Number(porMil(nomesEn)),
    'inglês solto/1k': Number(porMil(funcEn)),
    'colagens (ea/eo)/1k': Number(porMil(colagens)),
    'paginação/1k': Number(porMil(paginacao)),
    'hífen quebrado/1k': Number(porMil(hifen)),
    'caractere inválido/1k': Number(porMil(lixo)),
    'português/1k': Number(porMil(stopPt)),
  };

  // ── Duas notas, porque os defeitos têm naturezas diferentes ─────────────
  //
  // FIDELIDADE: o texto diz o que o autor escreveu? Tradução automática é
  // irreversível — não há como consertar "Peter" virando "Pedro" sem o
  // original. Isto é o que decide se a obra entra ou não.
  //
  // LIMPEZA: paginação, hifenização e caracteres de controle são sujeira de
  // extração. São removíveis (ver limparTexto), então informam mas não vetam.
  let fidelidade = 100;
  let limpeza = 100;
  const graves = [];
  const leves = [];

  const p = (cond, pontos, texto, eixo) => {
    if (!cond) return;
    if (eixo === 'fid') {
      fidelidade -= pontos;
      graves.push(texto);
    } else {
      limpeza -= pontos;
      leves.push(texto);
    }
  };

  p(sinais['nomes em inglês/1k'] > 0.15, 45, 'nomes bíblicos em inglês', 'fid');
  p(sinais['inglês solto/1k'] > 0.5, 30, 'palavras inglesas no meio do texto', 'fid');
  p(sinais['colagens (ea/eo)/1k'] > 0.4, 25, 'colagens de tradutor automático', 'fid');
  p(sinais['português/1k'] < 12, 30, 'pouco português — pode estar noutro idioma', 'fid');

  p(sinais['paginação/1k'] > 0.3, 15, 'paginação no meio do texto', 'limp');
  p(sinais['hífen quebrado/1k'] > 3, 20, 'hifenização quebrada', 'limp');
  p(sinais['caractere inválido/1k'] > 0.5, 30, 'caracteres corrompidos', 'limp');

  fidelidade = Math.max(0, fidelidade);
  limpeza = Math.max(0, limpeza);

  // A nota final é dominada pela fidelidade: um texto sujo mas fiel pode ser
  // limpo; um texto limpo mas infiel continua atribuindo ao autor coisas que
  // ele não escreveu — que é exatamente o defeito que a plataforma não pode ter.
  const nota = Math.round(fidelidade * 0.8 + limpeza * 0.2);

  // Origem declarada no nome do arquivo — não afeta a nota técnica, mas
  // precisa ficar visível na decisão sobre publicar.
  const pirata = /z-library|z-lib|libgen/i.test(nomeArquivo);

  return {
    nota,
    fidelidade,
    limpeza,
    sinais,
    penalidades: [...graves, ...leves],
    graves,
    pirata,
  };
}

async function principal() {
  const args = process.argv.slice(2);
  const iLim = args.indexOf('--limite');
  const limite = iLim >= 0 ? Number(args[iLim + 1]) : 999;
  const filtro = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a));

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  await auth.authorize();
  const drive = google.drive({ version: 'v3', auth });

  const { findExtractor } = require('../dist/rag/text-extractors');

  const chave = process.env.GEMINI_API_KEY;
  const genAI = chave ? new GoogleGenAI({ apiKey: chave }) : null;
  if (!genAI) {
    console.log('⚠️  sem GEMINI_API_KEY — só heurísticas, sem o revisor\n');
  }

  const res = await drive.files.list({
    q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size)',
    pageSize: 1000,
  });

  // Mesma regra de elegibilidade do ingest-next — ver curadoria.js.
  const { elegivel, normaliza } = require('./curadoria');

  let alvos = (res.data.files ?? []).filter((f) => elegivel(f).ok);

  if (filtro) {
    // Comparação sem acento: os nomes chegam do Drive em NFD, então um filtro
    // digitado como "Lições" (NFC) não casa com o nome do arquivo. Sem isto,
    // `analyze-quality.js "Lições"` devolvia zero obras sem explicar por quê.
    const alvo = normaliza(filtro);
    alvos = alvos.filter((f) => normaliza(f.name).includes(alvo));
  }

  // ── O relatório anterior é sempre carregado ────────────────────────────────
  //
  // Antes ele só era lido sob --pendentes, e o arquivo final era escrito com o
  // que a rodada produziu. Ou seja: `analyze-quality.js "Carson"` analisava uma
  // obra e gravava um relatório com uma linha, apagando as outras 87 — e o
  // ingest-next, no dia seguinte, veria 87 obras "sem análise" e pararia.
  // Nunca aconteceu por sorte: ninguém tinha usado o filtro ainda.
  //
  // Agora a rodada sempre MESCLA sobre o que já existe. --refazer serve para
  // quem realmente quer começar do zero.
  const destino = path.join(__dirname, 'quality-report.json');
  const recomecar = args.includes('--refazer');
  let anterior =
    !recomecar && fs.existsSync(destino)
      ? JSON.parse(fs.readFileSync(destino, 'utf8'))
      : [];

  if (args.includes('--pendentes')) {
    const noRelatorio = new Set(anterior.map((o) => o.id));

    // Pendente é toda obra sem veredito confiável. Não filtrar por nota aqui:
    // a nota anterior pode ter vindo de uma versão do analisador que já foi
    // corrigida, e é justamente isso que se quer refazer.
    const semVeredito = (o) =>
      !o.juiz || ['indeterminado', 'erro', 'ilegivel'].includes(o.juiz.veredito);

    // Exceto as já diagnosticadas como PDF sem camada de texto: reanalisar não
    // muda nada, o arquivo precisa passar por OCR primeiro. O teste era só
    // /OCR/, que não casa com "sem texto extraível (0 caracteres) — PDF
    // escaneado?" — a redação que o próprio script usa quando o texto vem
    // vazio. Resultado: doze arquivos escaneados eram baixados de novo a cada
    // rodada de --pendentes para chegar sempre à mesma conclusão.
    const precisaOcr = (o) =>
      (o.penalidades ?? []).some((p) => /OCR|sem texto extraível|escaneado/i.test(p));

    const revisitar = new Set(
      anterior.filter((o) => semVeredito(o) && !precisaOcr(o)).map((o) => o.id),
    );

    // ── E o que nunca foi analisado ────────────────────────────────────────
    // Faltava isto (01/08/2026): "pendente" só significava "está no relatório
    // com veredito ruim". Arquivo novo no Drive, ausente do relatório, não era
    // pendente para ninguém — e era exatamente o que o ingest-next mandava
    // resolver com este comando. O aviso não tinha como ser atendido.
    const inedito = alvos.filter((f) => !noRelatorio.has(f.id)).map((f) => f.id);

    const pendente = new Set([...revisitar, ...inedito]);
    alvos = alvos.filter((f) => pendente.has(f.id));
    console.log(
      `--pendentes: ${alvos.length} obra(s) — ` +
        `${inedito.length} nunca analisada(s), ` +
        `${alvos.length - inedito.length} sem veredito confiável\n`,
    );
  }

  alvos = alvos.slice(0, limite);

  const saida = [];
  console.log(`Analisando ${alvos.length} obra(s)…\n`);

  for (const f of alvos) {
    try {
      const buf = await drive.files.get(
        { fileId: f.id, alt: 'media' },
        { responseType: 'arraybuffer' },
      );
      const extractor = findExtractor(f.mimeType);
      // Extractor devolve { text, meta } — não string.
      const { text: cru, meta } = await extractor.extract(Buffer.from(buf.data));
      const text = limparTexto(cru);

      // Quanto do arquivo era sujeira. Se quase tudo, o PDF é escaneado e a
      // "camada de texto" contém só os números de página — precisa de OCR
      // antes de servir para qualquer coisa.
      const sobrevivencia = cru.length ? text.length / cru.length : 0;

      const r = pontuar(text, f.name);
      r.paginas = meta?.pages;
      r.caracteres = text.length;
      r.sobrevivencia = Number(sobrevivencia.toFixed(2));

      // ── Guarda de PDF escaneado ────────────────────────────────────────
      //
      // Menos de 400 caracteres por página de conteúdo real é típico de PDF só
      // com imagem: o extrator devolve rodapés e pouco mais.
      //
      // Este guarda esteve desligado até 01/08/2026 sem que nada acusasse:
      // `meta.pages` vinha undefined em TODAS as obras (o pdf-parse trocou
      // `numpages` por `total` na v2), a expressão caía no `: Infinity` e a
      // condição nunca era verdadeira. "A Arte e a Bíblia" (Schaeffer), com
      // 6.776 caracteres no livro inteiro, tirou 97 e foi indexada — 34
      // trechos de camada de texto residual servidos como se fossem a obra.
      //
      // Por isso a ausência de contagem agora tem tratamento próprio, em vez
      // de virar Infinity. Ler falta de sinal como aprovação é o modo de falha
      // recorrente deste portão, e não pode se repetir por um terceiro caminho.
      if (typeof meta?.pages === 'number' && meta.pages > 0) {
        const porPagina = text.length / meta.pages;
        if (porPagina < 400) {
          r.nota = 0;
          r.penalidades = [
            `PDF sem camada de texto (${Math.round(porPagina)} caracteres por página) — precisa de OCR`,
          ];
        }
      } else if (f.mimeType === 'application/pdf') {
        // PDF sem contagem de páginas é anomalia — e é o caso que enganou o
        // portão até hoje. Sem o divisor, resta o valor absoluto: 20.000
        // caracteres são ~10 páginas de texto corrido, e nenhum livro do
        // acervo é tão curto, mas um escaneado com camada residual fica bem
        // abaixo disso.
        r.paginasDesconhecidas = true;
        if (text.length < 20000) {
          r.nota = 0;
          r.penalidades = [
            `só ${text.length} caracteres e sem contagem de páginas — provável PDF escaneado, precisa de OCR`,
          ];
        }
      }
      // DOCX e EPUB não têm paginação por natureza: a ausência não diz nada
      // sobre a qualidade e não pode virar penalidade. Aplicar aqui o piso dos
      // 20.000 caracteres reprovava manuscritos legítimos — os materiais de
      // seminário do Thirdmill, por exemplo, são .docx. Texto realmente vazio
      // já é barrado pela regra de 2.000 caracteres em pontuar().

      // ── Estágio 2: o revisor lê. Só para quem passou pelas heurísticas —
      // não vale gastar tokens confirmando um texto já obviamente destruído.
      if (r.nota >= 60 && genAI) {
        try {
          const juiz = await julgarComIA(genAI, text);
          r.juiz = juiz;
          if (juiz.veredito === 'automatica') {
            r.nota = Math.min(r.nota, 40);
            r.penalidades.push(`tradução automática (IA, ${juiz.confianca}%)`);
          } else if (juiz.veredito === 'ilegivel') {
            r.nota = Math.min(r.nota, 20);
            r.penalidades.push('texto ilegível (IA)');
          }
        } catch (e) {
          r.juiz = { veredito: 'erro', evidencia: e.message.slice(0, 60) };
        }
        // Respiro entre chamadas: o teto de gastos do Gemini é por 10 minutos,
        // e foi estourá-lo que derrubou a plataforma em 29/07.
        await new Promise((s) => setTimeout(s, 1200));
      }

      const marca = r.nota >= 85 ? '🟢' : r.nota >= 70 ? '🟡' : '🔴';
      console.log(`${marca} ${String(r.nota).padStart(3)}  ${f.name.slice(0, 60)}`);
      if (r.penalidades?.length) {
        console.log(`        ${r.penalidades.join(' · ')}`);
      }
      if (r.juiz?.evidencia && r.juiz.veredito !== 'humana') {
        console.log(`        ↳ "${r.juiz.evidencia}"`);
      }

      saida.push({ id: f.id, nome: f.name, ...r });
    } catch (err) {
      console.log(`⚫   —  ${f.name.slice(0, 60)}`);
      console.log(`        falha ao extrair: ${err.message.slice(0, 80)}`);
      saida.push({ id: f.id, nome: f.name, nota: 0, erro: err.message });
    }
  }

  // Mescla sempre: substitui as reanalisadas e preserva o resto do relatório.
  // Escrita atômica — um Ctrl-C no meio do writeFileSync deixaria o relatório
  // truncado, e relatório truncado significa obras boas caindo para "sem
  // análise" e obras ruins perdendo o veredito que as barrava.
  const vencidas = new Set(saida.map((n) => n.id));
  const final = [...anterior.filter((o) => !vencidas.has(o.id)), ...saida];
  const temporario = `${destino}.tmp`;
  fs.writeFileSync(temporario, JSON.stringify(final, null, 2));
  fs.renameSync(temporario, destino);

  const bons = saida.filter((s) => s.nota >= 70).length;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🟢 ≥85 excelente : ${saida.filter((s) => s.nota >= 85).length}`);
  console.log(`🟡 70-84 aceitável: ${saida.filter((s) => s.nota >= 70 && s.nota < 85).length}`);
  console.log(`🔴 <70 reprovado  : ${saida.filter((s) => s.nota < 70).length}`);
  console.log(`\n${bons} obra(s) aprovadas nesta rodada`);
  console.log(`relatório: ${final.length} obras no total → ${destino}`);
}

if (require.main === module) {
  principal();
}

/**
 * Exportado para que a triagem de material novo (avaliar-local.js) use
 * exatamente o mesmo julgamento do acervo, e não uma segunda implementação que
 * inevitavelmente divergiria — foi o que aconteceu com as regras de
 * elegibilidade, que passaram meses discordando entre dois scripts.
 */
module.exports = { pontuar, limparTexto, amostrar, julgarComIA };
