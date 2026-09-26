import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_DIR = '/Users/cristianocolombo/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';

async function main() {
  console.log('🚀 Iniciando navegação 3D automatizada via browser...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-webgl', '--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[BibleMap') || text.includes('[TheoSphere3D]') || text.includes('Error')) {
      console.log(`[Browser Console]: ${text}`);
    }
  });

  console.log('📍 Carregando http://localhost:3000/atlas...');
  await page.goto('http://localhost:3000/atlas', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  // 1. Capturar rota inicial (Jornada de Abraão)
  console.log('🗺️ 1. Selecionando Rota de Abraão (Ur dos Caldeus)...');
  const abraaoBtn = page.locator('button:has-text("Jornada de Abraão")').first();
  if (await abraaoBtn.count() > 0) {
    await abraaoBtn.click();
    console.log('   Clicado em Jornada de Abraão');
  } else {
    // Via BibleMapIntegration facade
    await page.evaluate(() => {
      window.BibleMapIntegration?.flyTo(30.962, 46.1031, 7);
      window.BibleMapIntegration?.updateTimeline(-2000);
    });
  }
  await page.waitForTimeout(4000);
  const shot1 = path.join(ARTIFACT_DIR, 'nav_step1_abraao_ur.png');
  await page.screenshot({ path: shot1 });
  console.log(`   📸 Screenshot 1 salvo: ${shot1}`);

  // 2. Voo para Monte Sinai (Horebe)
  console.log('🏔️ 2. Voando para o Monte Sinai (Êxodo)...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.flyTo(28.539, 33.975, 11);
    window.BibleMapIntegration?.updateTimeline(-1446);
  });
  await page.waitForTimeout(4000);
  const shot2 = path.join(ARTIFACT_DIR, 'nav_step2_monte_sinai.png');
  await page.screenshot({ path: shot2 });
  console.log(`   📸 Screenshot 2 salvo: ${shot2}`);

  // 3. Voo para Jerusalém (Monte Sião / Templo)
  console.log('🏛️ 3. Voando para Jerusalém...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.flyTo(31.7767, 35.2345, 13);
    window.BibleMapIntegration?.updateTimeline(30);
  });
  await page.waitForTimeout(4000);
  const shot3 = path.join(ARTIFACT_DIR, 'nav_step3_jerusalem.png');
  await page.screenshot({ path: shot3 });
  console.log(`   📸 Screenshot 3 salvo: ${shot3}`);

  // 4. Alternar para o Globo Orbital Cesium 3D
  console.log('🌐 4. Alternando para o Globo Orbital 3D...');
  const cesiumBtn = page.locator('button:has-text("Globo 3D")').first();
  if (await cesiumBtn.count() > 0) {
    await cesiumBtn.click();
    console.log('   Clicado no botão Globo 3D');
  } else {
    console.log('   Botão Globo 3D não encontrado diretamente via texto.');
  }
  await page.waitForTimeout(6000);
  const shot4 = path.join(ARTIFACT_DIR, 'nav_step4_globo_cesium.png');
  await page.screenshot({ path: shot4 });
  console.log(`   📸 Screenshot 4 salvo: ${shot4}`);

  await browser.close();
  console.log('✨ Navegação 3D concluída com sucesso!');
}

main().catch((err) => {
  console.error('❌ Erro na navegação:', err);
  process.exit(1);
});
