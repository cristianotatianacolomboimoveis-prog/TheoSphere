import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = '/Users/cristianocolombo/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';

async function main() {
  console.log('🚀 Verificando interface despoluída no globo 3D...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-webgl', '--no-sandbox'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await page.goto('http://localhost:3000/atlas', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Alternar para Globo 3D Cesium
  console.log('🌐 Alternando para o Globo 3D Cesium...');
  await page.click('#toggle-cesium-btn');
  console.log('   ✅ Botão do Globo clicado!');

  await page.waitForTimeout(5000);

  // Disparar o mesmo evento da foto do usuário: Moedas 'Judaea Capta'
  console.log('📍 Selecionando Moedas Judaea Capta...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'judaea-capta',
      name: "Moedas 'Judaea Capta'",
      category: 'ARCHAEOLOGICAL_SITE',
      verse: 'Lc 21:20-24',
      quote: 'Propaganda imperial da queda de Jerusalém em 70 d.C., cumprimento histórico do juízo anunciado por Jesus sobre a cidade.',
      description: 'Série de moedas comemorativas de Vespasiano e Tito exibindo a Judeia como mulher cativa chorando sob uma palmeira.',
      arch: 'Cunhadas em Roma e províncias (achados diversos). Acervo: Museu Britânico, Museu de Israel.',
      lat: 31.7683,
      lng: 35.2137,
      era: 70,
    });
    window.BibleMapIntegration?.flyTo(31.7683, 35.2137, 8);
  });

  await page.waitForTimeout(3000);

  const shot = path.join(ARTIFACT_DIR, 'globo_despoluido_judaea_capta.png');
  await page.screenshot({ path: shot });
  console.log(`📸 Screenshot salvo com sucesso: ${shot}`);

  await browser.close();
  console.log('✅ Validação visual concluída!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
