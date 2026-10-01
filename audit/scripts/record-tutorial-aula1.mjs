#!/usr/bin/env node
/**
 * record-tutorial-aula1.mjs
 * Automação de gravação em vídeo de alta resolução para o Tutorial da Aula 1 do TheoSphere.
 * Utiliza o Google Chrome local via puppeteer-core e o screencapture nativo do macOS.
 */

import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TARGET_URL = 'https://frontend-v2-lake.vercel.app';
const ARTIFACT_DIR = '/Users/cristianocolombo/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';
const ARTIFACT_VIDEO = path.join(ARTIFACT_DIR, 'theosphere_aula1_demonstracao.mov');
const DESKTOP_VIDEO = '/Users/cristianocolombo/Desktop/Theosphere_Aula1_Demonstracao.mov';

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

async function main() {
  console.log('🎬 Iniciando processo de gravação do Tutorial TheoSphere Aula 1...');

  if (!fs.existsSync(CHROME_PATH)) {
    console.error(`❌ Chrome não encontrado em: ${CHROME_PATH}`);
    process.exit(1);
  }

  // 1. Iniciar captura de tela do macOS
  console.log('📹 Disparando screencapture do macOS...');
  const screenProc = spawn('screencapture', ['-v', '-C', '-k', '-m', DESKTOP_VIDEO]);

  screenProc.on('error', (err) => {
    console.error('❌ Erro no screencapture:', err);
  });

  // Aguarda 1s para o gravador inicializar
  await sleep(1000);

  let browser;
  try {
    console.log('🚀 Inicializando Google Chrome via puppeteer-core...');
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

    console.log(`🌐 Navegando para ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Bloco 1: Abertura / Landing View
    console.log('⏱️ [Bloco 1] Take da tela inicial de abertura...');
    await sleep(4000);

    // Bloco 2: Login / Entrada no Dashboard
    console.log('⏱️ [Bloco 2] Verificando tela de login...');
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('🔑 Preenchendo credenciais de demonstração...');
      await emailInput.click();
      await page.keyboard.type('pastor.demo@theosphere.dev', { delay: 45 });
      await sleep(500);

      const passInput = await page.$('input[type="password"]');
      if (passInput) {
        await passInput.click();
        await page.keyboard.type('demo123456', { delay: 45 });
        await sleep(500);
      }

      // Clicar no botão de submit
      const submitBtn = await page.$('button[type="submit"]') || await page.$('button');
      if (submitBtn) {
        await submitBtn.click();
        await sleep(4000);
      }
    }

    console.log('📊 Exibindo Dashboard do TheoSphere...');
    await sleep(2500);
    await smoothScroll(page, 350, 25, 30);
    await sleep(2000);
    await smoothScroll(page, -350, 25, 30);
    await sleep(1500);

    // Bloco 3: Leitor Bíblico
    console.log('⏱️ [Bloco 3] Acessando Leitor Bíblico...');
    const readerLink = await page.evaluateHandle(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      return links.find(el => el.textContent && (el.textContent.includes('Leitor') || el.textContent.includes('Bíblia') || el.textContent.includes('Texto')));
    });

    if (readerLink && readerLink.asElement()) {
      await readerLink.asElement().click();
      await sleep(3500);
    } else {
      // Se não encontrou link direto, navega para rota bíblica
      await page.goto(`${TARGET_URL}/bible`, { waitUntil: 'networkidle2' });
      await sleep(3000);
    }

    console.log('📖 Rolo de leitura dos versículos...');
    await smoothScroll(page, 300, 25, 35);
    await sleep(2000);

    // Seletor de versões
    console.log('🔄 Abrindo seletor de traduções...');
    const translationPicker = await page.evaluateHandle(() => {
      const elements = Array.from(document.querySelectorAll('button'));
      return elements.find(el => el.textContent && (el.textContent.includes('BLIVRE') || el.textContent.includes('NVA') || el.textContent.includes('KJV') || el.textContent.includes('Versão')));
    });

    if (translationPicker && translationPicker.asElement()) {
      await translationPicker.asElement().click();
      await sleep(2500);
      // Clica novamente ou fecha
      await translationPicker.asElement().click();
      await sleep(1000);
    }

    // Bloco 4: Os 5 Layouts Dinâmicos
    console.log('⏱️ [Bloco 4] Demonstrando layouts dinâmicos...');
    const layoutBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && (b.textContent.includes('Layout') || b.textContent.includes('⊞') || b.getAttribute('title')?.includes('Layout')));
    });

    if (layoutBtn && layoutBtn.asElement()) {
      await layoutBtn.asElement().click();
      await sleep(2000);

      // Clicar em Paralelo 50/50
      const parallelOption = await page.evaluateHandle(() => {
        const items = Array.from(document.querySelectorAll('button, div[role="button"]'));
        return items.find(it => it.textContent && it.textContent.includes('Paralelo'));
      });
      if (parallelOption && parallelOption.asElement()) {
        await parallelOption.asElement().click();
        await sleep(3500);
      }

      // Reabrir Layouts e clicar em Bancada Tríplice
      await layoutBtn.asElement().click();
      await sleep(1500);
      const tripleOption = await page.evaluateHandle(() => {
        const items = Array.from(document.querySelectorAll('button, div[role="button"]'));
        return items.find(it => it.textContent && it.textContent.includes('Tríplice'));
      });
      if (tripleOption && tripleOption.asElement()) {
        await tripleOption.asElement().click();
        await sleep(4000);
      }
    }

    // Bloco 5: Morfologia Original de 1 Clique (Duplo clique em palavra)
    console.log('⏱️ [Bloco 5] Testando duplo-clique para morfologia original...');
    const verseWord = await page.$('.verse-text span, p span, span.cursor-pointer');
    if (verseWord) {
      await verseWord.click({ clickCount: 2 });
      await sleep(3000);
      // Fechar modal de morfologia clicando fora ou no fechar
      await page.keyboard.press('Escape');
      await sleep(1000);
    }

    // Bloco 6: Speed Search (⌘K)
    console.log('⏱️ [Bloco 6] Demonstrando Speed Search ⌘K...');
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyK');
    await page.keyboard.up('Meta');
    await sleep(1500);

    const searchInput = await page.$('input[placeholder*="Buscar"], input[placeholder*="⌘K"], input[type="search"]');
    if (searchInput) {
      await searchInput.type('graça AND fé', { delay: 50 });
      await sleep(3000);
      await page.keyboard.press('Escape');
      await sleep(1500);
    }

    // Finalização suave
    console.log('🎬 Finalizando demonstração da Aula 1...');
    await sleep(2500);

  } catch (err) {
    console.error('⚠️ Aviso durante a navegação:', err);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Google Chrome encerrado.');
    }

    // Encerrar gravação do screencapture suavemente
    console.log('⏹️ Encerrando gravação de vídeo...');
    screenProc.kill('SIGINT');
    await sleep(2000);

    // Copiar para a pasta de artefatos
    if (fs.existsSync(DESKTOP_VIDEO)) {
      try {
        fs.copyFileSync(DESKTOP_VIDEO, ARTIFACT_VIDEO);
        const stats = fs.statSync(DESKTOP_VIDEO);
        console.log(`✅ Vídeo gravado com sucesso!`);
        console.log(`📁 Local Desktop: ${DESKTOP_VIDEO} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
        console.log(`📁 Local Artefato: ${ARTIFACT_VIDEO}`);
      } catch (copyErr) {
        console.warn('Erro ao copiar para artefatos:', copyErr.message);
      }
    } else {
      console.error('❌ Arquivo de vídeo não encontrado após a gravação.');
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
