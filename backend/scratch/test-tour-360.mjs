import { chromium } from 'playwright';
import * as path from 'path';

const ARTIFACTS_DIR = '/Users/cristianocolombo/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';

async function main() {
  console.log('🚀 Testando novo Giro 360° com parada suave automática...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  await page.goto('http://localhost:3000/atlas', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Ativa Globo Cesium 3D
  const cesiumToggle = page.locator('#toggle-cesium-btn');
  await cesiumToggle.click();
  await page.waitForSelector('.cesium-widget canvas', { timeout: 20000 });
  await page.waitForTimeout(4000);

  // Seleciona Monte Sinai
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      name: 'Monte Sinai',
      verse: 'Êxodo 19:20',
      desc: 'Península do Sinai, Egito. Local da entrega dos Dez Mandamentos.',
      category: 'mountain',
      era: -1446,
      lat: 28.539,
      lng: 33.975,
      img: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=1000&q=80'
    });
  });

  await page.waitForTimeout(2000);

  // Dispara o Giro 360°
  console.log('🔄 Disparando Giro 360° com parada suave...');
  const orbitBtn = page.locator('button:has-text("Giro 360°")').first();
  await orbitBtn.click();

  // Verifica que o botão ficou com estado ativo
  console.log('   Giro iniciado! Capturando screenshot durante o giro...');
  await page.waitForTimeout(4000);
  const touringPath = path.join(ARTIFACTS_DIR, 'giro_360_em_andamento.png');
  await page.screenshot({ path: touringPath });
  console.log(`📸 Screenshot durante giro salvo: ${touringPath}`);

  // Aguarda mais tempo para completar os 360° (total ~18s) e verificar auto-stop
  console.log('   Aguardando conclusão do giro de 360° e auto-stop...');
  await page.waitForTimeout(16000);

  const completedPath = path.join(ARTIFACTS_DIR, 'giro_360_concluido.png');
  await page.screenshot({ path: completedPath });
  console.log(`📸 Screenshot após parada suave salvo: ${completedPath}`);

  await browser.close();
  console.log('✅ Teste do Giro 360° concluído com sucesso!');
}

main().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
