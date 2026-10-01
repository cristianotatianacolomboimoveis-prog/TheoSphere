#!/usr/bin/env node
/**
 * record-master-series.mjs
 * Automação de gravação em vídeo de alta resolução para as Aulas 02 a 06 do TheoSphere.
 * Utiliza o Google Chrome local via puppeteer-core e o screencapture nativo do macOS.
 */

import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'https://frontend-v2-lake.vercel.app';
const WORKSPACE_DIR = '/Users/cristianocolombo/Desktop/Theosphere 2026';
const DESKTOP_DIR = '/Users/cristianocolombo/Desktop/Tutoriais_TheoSphere/02_Videos_Gravados';
const ARTIFACT_DIR = '/Users/cristianocolombo/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function smoothScroll(page, distance, steps = 20, delayMs = 30) {
  const delta = distance / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy(0, d), delta);
    await sleep(delayMs);
  }
}

async function recordSession(lessonId, lessonName, recordingFn) {
  const videoFileName = `${lessonId}_${lessonName}.mov`;
  const tempOutput = `/tmp/${videoFileName}`;
  const finalDesktop = path.join(DESKTOP_DIR, videoFileName);
  const finalWorkspace = path.join(WORKSPACE_DIR, 'tutorials/videos', videoFileName);
  const finalArtifact = path.join(ARTIFACT_DIR, videoFileName);

  console.log(`\n======================================================`);
  console.log(`🎬 INICIANDO GRAVAÇÃO: ${lessonId} — ${lessonName}`);
  console.log(`======================================================`);

  const screenProc = spawn('screencapture', ['-v', '-C', '-k', '-m', tempOutput]);
  await sleep(1500);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--window-size=1920,1080',
        '--no-default-browser-check',
        '--disable-infobars',
        '--no-first-run',
      ],
    });

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    await recordingFn(page);

    await sleep(2000);
  } catch (err) {
    console.error(`⚠️ Erro na aula ${lessonId}:`, err);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Chrome fechado.');
    }

    console.log('⏹️ Finalizando screencapture...');
    screenProc.kill('SIGINT');
    await sleep(2500);

    if (fs.existsSync(tempOutput)) {
      const stats = fs.statSync(tempOutput);
      console.log(`📦 Tamanho gerado: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

      fs.copyFileSync(tempOutput, finalDesktop);
      fs.copyFileSync(tempOutput, finalWorkspace);
      fs.copyFileSync(tempOutput, finalArtifact);
      fs.unlinkSync(tempOutput);

      console.log(`✅ Salvo no Desktop: ${finalDesktop}`);
      console.log(`✅ Salvo no Workspace: ${finalWorkspace}`);
    } else {
      console.error(`❌ Gravação falhou para ${lessonId}`);
    }
  }
}

// -------------------------------------------------------------
// AULA 02: Línguas Originais & Morfologia Strong
// -------------------------------------------------------------
async function recordAula02(page) {
  console.log('📖 Acessando /study...');
  await page.goto(`${BASE_URL}/study`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3500);

  console.log('🔄 Abrindo seletor de traduções...');
  const picker = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent && (b.textContent.includes('BLIVRE') || b.textContent.includes('NVA') || b.textContent.includes('Versão')));
  });
  if (picker && picker.asElement()) {
    await picker.asElement().click();
    await sleep(2500);

    // Clicar em TR (Textus Receptus) se disponível
    const trOpt = await page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll('button, div[role="button"], span'));
      return items.find(it => it.textContent && it.textContent.includes('TR'));
    });
    if (trOpt && trOpt.asElement()) {
      await trOpt.asElement().click();
      await sleep(3500);
    } else {
      await picker.asElement().click();
      await sleep(1000);
    }
  }

  console.log('🔍 Executando duplo clique em termo grego...');
  const word = await page.$('.verse-text span, p span, span[class*="verse"]');
  if (word) {
    await word.click({ clickCount: 2 });
    await sleep(3500);
  }

  console.log('📊 Navegando para bancada de Exegese / Word Study...');
  await page.goto(`${BASE_URL}/exegesis`, { waitUntil: 'networkidle2' });
  await sleep(3500);

  await smoothScroll(page, 300, 20, 35);
  await sleep(2500);

  const copyBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent && (b.textContent.includes('Copiar') || b.textContent.includes('Markdown')));
  });
  if (copyBtn && copyBtn.asElement()) {
    await copyBtn.asElement().click();
    await sleep(2000);
  }
}

// -------------------------------------------------------------
// AULA 03: Biblioteca Clássica das 90 Obras
// -------------------------------------------------------------
async function recordAula03(page) {
  console.log('📚 Acessando /library...');
  await page.goto(`${BASE_URL}/library`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(4000);

  console.log('📜 Rolando pelos cards das obras canônicas...');
  await smoothScroll(page, 450, 25, 30);
  await sleep(2500);
  await smoothScroll(page, -450, 25, 30);
  await sleep(1500);

  console.log('🏷️ Filtrando por tradições...');
  const refPill = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button, span, div[role="button"]'));
    return btns.find(b => b.textContent && b.textContent.includes('Reformada'));
  });
  if (refPill && refPill.asElement()) {
    await refPill.asElement().click();
    await sleep(3000);
  }

  const purPill = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button, span, div[role="button"]'));
    return btns.find(b => b.textContent && b.textContent.includes('Puritana'));
  });
  if (purPill && purPill.asElement()) {
    await purPill.asElement().click();
    await sleep(3000);
  }

  console.log('🔎 Pesquisando no acervo...');
  const searchInput = await page.$('input[type="text"], input[type="search"], input[placeholder*="Buscar"]');
  if (searchInput) {
    await searchInput.type('justificação pela fé', { delay: 45 });
    await sleep(3500);
  }
}

// -------------------------------------------------------------
// AULA 04: Copilot IA Teológico RAG & Equilíbrio
// -------------------------------------------------------------
async function recordAula04(page) {
  console.log('🤖 Acessando /study com Copilot...');
  await page.goto(`${BASE_URL}/study`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3500);

  console.log('⊞ Ativando Layout Copilot IA...');
  const layoutBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent && (b.textContent.includes('Layout') || b.textContent.includes('⊞')));
  });
  if (layoutBtn && layoutBtn.asElement()) {
    await layoutBtn.asElement().click();
    await sleep(1500);

    const copilotOption = await page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll('button, div[role="button"]'));
      return items.find(it => it.textContent && it.textContent.includes('Copilot'));
    });
    if (copilotOption && copilotOption.asElement()) {
      await copilotOption.asElement().click();
      await sleep(3500);
    }
  }

  console.log('💡 Acionando painel de Ideias Contextuais...');
  const ideasBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent && (b.textContent.includes('Ideias') || b.textContent.includes('💡')));
  });
  if (ideasBtn && ideasBtn.asElement()) {
    await ideasBtn.asElement().click();
    await sleep(3000);
  }

  console.log('💬 Enviando consulta doutrinária com equilíbrio teológico...');
  const promptInput = await page.$('textarea, input[placeholder*="Pergunte"], input[placeholder*="Copilot"]');
  if (promptInput) {
    await promptInput.type('Explique a doutrina da eleição em Efésios 1 sob a perspectiva reformada e arminiana', { delay: 40 });
    await sleep(1000);
    await page.keyboard.press('Enter');
    await sleep(6000);
  }
}

// -------------------------------------------------------------
// AULA 05: Atlas Bíblico 3D & Órbita 360°
// -------------------------------------------------------------
async function recordAula05(page) {
  console.log('🌍 Acessando /atlas...');
  await page.goto(`${BASE_URL}/atlas`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(4000);

  console.log('🌐 Alternando para Globo 3D Cesium...');
  const globeBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent && (b.textContent.includes('Globo') || b.textContent.includes('3D')));
  });
  if (globeBtn && globeBtn.asElement()) {
    await globeBtn.asElement().click();
    await sleep(4000);
  }

  console.log('🧭 Selecionando Rota do Êxodo...');
  const exodoRoute = await page.evaluateHandle(() => {
    const items = Array.from(document.querySelectorAll('button, div[role="button"], span'));
    return items.find(it => it.textContent && (it.textContent.includes('Êxodo') || it.textContent.includes('Exodo')));
  });
  if (exodoRoute && exodoRoute.asElement()) {
    await exodoRoute.asElement().click();
    await sleep(4000);
  }

  console.log('◨ Ativando Modo Foco Total...');
  const focusBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent && (b.textContent.includes('Foco') || b.textContent.includes('◨')));
  });
  if (focusBtn && focusBtn.asElement()) {
    await focusBtn.asElement().click();
    await sleep(3500);
  }

  console.log('🔄 Disparando Órbita 360°...');
  const orbitBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent && (b.textContent.includes('Órbita') || b.textContent.includes('360')));
  });
  if (orbitBtn && orbitBtn.asElement()) {
    await orbitBtn.asElement().click();
    await sleep(5000);
  }
}

// -------------------------------------------------------------
// AULA 06: Guia de Passagem & Comparação Sinótica
// -------------------------------------------------------------
async function recordAula06(page) {
  console.log('📖 Acessando /study...');
  await page.goto(`${BASE_URL}/study`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3500);

  console.log('📖 Abrindo Guia Exegético de Passagem...');
  const guideBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent && (b.textContent.includes('Guia') || b.textContent.includes('Exegético')));
  });
  if (guideBtn && guideBtn.asElement()) {
    await guideBtn.asElement().click();
    await sleep(4000);
  }

  console.log('⚖️ Abrindo Comparação Sinótica (Text Comparison)...');
  const compareBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent && (b.textContent.includes('Sinopse') || b.textContent.includes('Variantes') || b.textContent.includes('⚖️')));
  });
  if (compareBtn && compareBtn.asElement()) {
    await compareBtn.asElement().click();
    await sleep(4000);

    const toggleDiff = await page.evaluateHandle(() => {
      const inputs = Array.from(document.querySelectorAll('button, input[type="checkbox"]'));
      return inputs.find(el => el.textContent && el.textContent.includes('Destaque'));
    });
    if (toggleDiff && toggleDiff.asElement()) {
      await toggleDiff.asElement().click();
      await sleep(2500);
    }

    const switchMode = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Intercalado'));
    });
    if (switchMode && switchMode.asElement()) {
      await switchMode.asElement().click();
      await sleep(3000);
    }
  }
}

// -------------------------------------------------------------
// EXECUÇÃO SEQUENCIAL
// -------------------------------------------------------------
async function main() {
  const target = process.argv[2] || 'all';

  if (target === 'all' || target === '2') {
    await recordSession('Aula_02', 'Linguas_Originais_Morfologia', recordAula02);
  }
  if (target === 'all' || target === '3') {
    await recordSession('Aula_03', 'Biblioteca_Classica_90_Obras', recordAula03);
  }
  if (target === 'all' || target === '4') {
    await recordSession('Aula_04', 'Copilot_IA_Equilibrio_Teologico', recordAula04);
  }
  if (target === 'all' || target === '5') {
    await recordSession('Aula_05', 'Atlas_Biblico_3D_Orbita360', recordAula05);
  }
  if (target === 'all' || target === '6') {
    await recordSession('Aula_06', 'Guia_Passagem_Sinopse_Variantes', recordAula06);
  }

  console.log('\n🎉 TODAS AS GRAVAÇÕES FORAM CONCLUÍDAS COM SUCESSO!');
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
