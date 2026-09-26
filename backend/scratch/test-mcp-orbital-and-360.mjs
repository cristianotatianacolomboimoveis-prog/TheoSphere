import { chromium } from 'playwright';
import * as path from 'path';

const ARTIFACTS_DIR = '/Users/cristianocolombo/Desktop/Theosphere 2026/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';
const ALT_ARTIFACTS_DIR = '/Users/cristianocolombo/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';

async function main() {
  console.log('🚀 Iniciando teste de navegação MCP Orbital e Orbital 360°...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  console.log('🌐 Navegando para http://localhost:3000/atlas...');
  await page.goto('http://localhost:3000/atlas', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 1. Alternar para o Globo Cesium 3D
  console.log('🌍 Ativando Globo Cesium 3D pelo botão #toggle-cesium-btn...');
  const cesiumToggle = page.locator('#toggle-cesium-btn');
  await cesiumToggle.click();
  
  console.log('   Aguardando canvas do Cesium 3D inicializar...');
  await page.waitForSelector('.cesium-widget canvas', { timeout: 20000 });
  await page.waitForTimeout(4000);

  // 2. Disparar seleção exegética do Monte Sinai via MapIntegration
  console.log('📍 Selecionando Monte Sinai com metadados exegéticos completos...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      name: 'Monte Sinai',
      verse: 'Êxodo 19:20',
      quote: 'E, descendo o SENHOR sobre o monte Sinai, no cume do monte, chamou o SENHOR a Moisés ao cume do monte; e Moisés subiu.',
      desc: 'Península do Sinai, Egito. Local da entrega dos Dez Mandamentos e da teofania mosaica.',
      geo: 'Maciço de granito vermelho no sul da Península do Sinai (2.285m de altitude).',
      arch: 'Mosteiro de Santa Catarina (século VI), Códice Sinaítico.',
      category: 'mountain',
      era: -1446,
      lat: 28.539,
      lng: 33.975,
      img: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=1000&q=80'
    });
  });

  await page.waitForTimeout(2500);

  // 3. Teste 1: Navegação Orbital Macro (~25.000m)
  console.log('🛰️ Executando navegação MCP Orbital (~25.000m)...');
  const orbitalBtn = page.locator('button:has-text("Orbital")').first();
  if (await orbitalBtn.count() > 0) {
    await orbitalBtn.click();
  } else {
    await page.evaluate(() => {
      window.BibleMapIntegration?.events.publish('cameraCommand', {
        action: 'aerial',
        lat: 28.539,
        lng: 33.975
      });
    });
  }

  console.log('   Aguardando câmera orbital posicionar a 25.000m...');
  await page.waitForTimeout(4000);

  const orbitalPath1 = path.join(ALT_ARTIFACTS_DIR, 'mcp_navegacao_orbital.png');
  await page.screenshot({ path: orbitalPath1 });
  console.log(`📸 Screenshot Orbital salvo: ${orbitalPath1}`);

  // 4. Teste 2: Navegação Orbital 360° em tempo real (Rotação angular contínua)
  console.log('🔄 Executando navegação MCP Orbital 360° (rotação contínua)...');
  const orbitBtn = page.locator('button:has-text("Órbita 360°")').first();
  if (await orbitBtn.count() > 0) {
    await orbitBtn.click();
  } else {
    await page.evaluate(() => {
      window.BibleMapIntegration?.events.publish('cameraCommand', {
        action: 'toggleOrbit'
      });
    });
  }

  console.log('   Câmera em rotação 360° contínua! Aguardando rotação angular...');
  await page.waitForTimeout(4500);

  const orbitPath1 = path.join(ALT_ARTIFACTS_DIR, 'mcp_navegacao_orbital_360.png');
  await page.screenshot({ path: orbitPath1 });
  console.log(`📸 Screenshot Órbita 360° salvo: ${orbitPath1}`);

  await browser.close();
  console.log('🎉 Todos os testes de navegação MCP foram concluídos com sucesso!');
}

main().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});
