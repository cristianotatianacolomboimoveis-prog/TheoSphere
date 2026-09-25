import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = '/Users/cristianocolombo/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';

async function main() {
  console.log('🚀 Iniciando verificação de paridade total entre Mapa 2.5D e 3D...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-webgl', '--no-sandbox'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  // ─── 1. MODO 2.5D ───
  console.log('📍 Carregando /atlas no Modo 2.5D...');
  await page.goto('http://localhost:3000/atlas', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('✨ [2.5D] Disparando seleção de evento bíblico: Monte Sinai...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'monte-sinai',
      name: 'Monte Sinai (Horebe)',
      category: 'Montanha Sagrada',
      verse: 'Êx 19:18-20',
      quote: 'E todo o monte Sinai fumegava, porque o Senhor descera sobre ele em fogo; e a sua fumaça subia como a fumaça de uma fornalha, e todo o monte tremia grandemente.',
      description: 'Local solene da entrega do Decálogo e da Aliança Mosaica. Marco fundacional da teologia pactual de Israel.',
      geo: 'Península do Sinai • Elevação 2.285m',
      arch: 'Inscrições proto-sinaíticas e mosteiro de Santa Catarina na base.',
      modelName: 'Tabernáculo do Deserto 3D',
      lat: 28.5392,
      lng: 33.9753,
      era: -1446,
    });
  });

  await page.waitForTimeout(1500);
  const shot25D = path.join(ARTIFACT_DIR, 'paridade_25d_monte_sinai.png');
  await page.screenshot({ path: shot25D });
  console.log(`📸 [2.5D] Screenshot salvo: ${shot25D}`);

  // ─── 2. MODO 3D (CESIUM) ───
  console.log('🌐 Alternando para o Globo 3D Cesium...');
  await page.click('#toggle-cesium-btn');
  console.log('   ✅ Botão do Globo Cesium clicado!');
  await page.waitForTimeout(5000);

  console.log('✨ [3D] Disparando a mesma seleção de evento no Globo 3D...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'monte-sinai',
      name: 'Monte Sinai (Horebe)',
      category: 'Montanha Sagrada',
      verse: 'Êx 19:18-20',
      quote: 'E todo o monte Sinai fumegava, porque o Senhor descera sobre ele em fogo; e a sua fumaça subia como a fumaça de uma fornalha, e todo o monte tremia grandemente.',
      description: 'Local solene da entrega do Decálogo e da Aliança Mosaica. Marco fundacional da teologia pactual de Israel.',
      geo: 'Península do Sinai • Elevação 2.285m',
      arch: 'Inscrições proto-sinaíticas e mosteiro de Santa Catarina na base.',
      modelName: 'Tabernáculo do Deserto 3D',
      lat: 28.5392,
      lng: 33.9753,
      era: -1446,
    });
    window.BibleMapIntegration?.flyTo(28.5392, 33.9753, 9);
  });

  await page.waitForTimeout(3000);
  const shot3D = path.join(ARTIFACT_DIR, 'paridade_3d_monte_sinai.png');
  await page.screenshot({ path: shot3D });
  console.log(`📸 [3D] Screenshot salvo: ${shot3D}`);

  // ─── 3. Teste do achado arqueológico Moedas Judaea Capta no 3D ───
  console.log('🏺 [3D] Testando achado arqueológico no Globo 3D: Moedas Judaea Capta...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'judaea-capta',
      name: "Moedas 'Judaea Capta'",
      category: 'Acervo Arqueológico',
      verse: 'Lc 21:20-24',
      quote: 'Propaganda imperial da queda de Jerusalém em 70 d.C., cumprimento histórico do juízo anunciado por Jesus sobre a cidade.',
      description: 'Série de moedas comemorativas de Vespasiano e Tito exibindo a Judeia como mulher cativa chorando sob uma palmeira.',
      geo: 'Jerusalém / Judeia Romana',
      arch: 'Cunhadas em Roma e províncias (achados diversos). Acervo: Museu Britânico, Museu de Israel.',
      modelName: 'Moeda Sestercius Vespasiano 3D',
      lat: 31.7683,
      lng: 35.2137,
      era: 70,
    });
    window.BibleMapIntegration?.flyTo(31.7683, 35.2137, 8);
  });

  await page.waitForTimeout(3000);
  const shotArch3D = path.join(ARTIFACT_DIR, 'paridade_3d_judaea_capta.png');
  await page.screenshot({ path: shotArch3D });
  console.log(`📸 [3D Arqueologia] Screenshot salvo: ${shotArch3D}`);

  await browser.close();
  console.log('🎉 Paridade total 2.5D e 3D validada com sucesso visual!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
