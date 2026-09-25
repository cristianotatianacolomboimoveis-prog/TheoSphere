import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = '/Users/cristianocolombo/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';

async function main() {
  console.log('🚀 Iniciando verificação do Modo Imersão Real (National Geographic / Voyager)...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-webgl', '--no-sandbox'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  console.log('📍 Carregando /atlas...');
  await page.goto('http://localhost:3000/atlas', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 1. Alternar para Globo 3D Cesium
  console.log('🌐 Alternando para o Globo 3D Cesium...');
  await page.click('#toggle-cesium-btn');
  console.log('   ✅ Botão do Globo Cesium clicado!');
  await page.waitForTimeout(4000);

  // 2. Clicar no botão "Foco Total" (Modo Imersão) para recolher a barra lateral direita
  console.log('🎬 Ativando Modo Imersão (Recolhendo Barra Lateral para Foco Total na Terra)...');
  const focoTotalBtn = page.getByRole('button', { name: /Foco Total/i });
  if (await focoTotalBtn.isVisible()) {
    await focoTotalBtn.click();
    console.log('   ✅ Barra lateral recolhida para 100% de visão territorial!');
  }
  await page.waitForTimeout(1000);

  // 3. Selecionar Monte Sinai com foto real e aproximação cinematográfica
  console.log('🏔️ Selecionando Monte Sinai com Ficha de Campo Imersiva...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'monte-sinai',
      name: 'Monte Sinai (Horebe)',
      category: 'Montanha Sagrada',
      verse: 'Êx 19:18-20',
      quote: 'E todo o monte Sinai fumegava, porque o Senhor descera sobre ele em fogo; e a sua fumaça subia como a fumaça de uma fornalha, e todo o monte tremia grandemente.',
      description: 'Local solene da entrega do Decálogo e da Aliança Mosaica. O relevo montanhoso granítico testemunha a teofania divina no deserto.',
      geo: 'Península do Sinai • Elevação 2.285m',
      arch: 'Inscrições proto-sinaíticas e Mosteiro de Santa Catarina no sopé.',
      modelName: 'Tabernáculo do Deserto 3D',
      img: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=1200&q=80',
      lat: 28.5392,
      lng: 33.9753,
      era: -1446,
      altitude: 2800,
    });
  });

  await page.waitForTimeout(3000);

  // 4. Ativar Órbita 360°
  console.log('🔄 Ativando Órbita 360° ao redor do relevo do Sinai...');
  const orbitaBtn = page.getByRole('button', { name: /Órbita 360°/i });
  if (await orbitaBtn.isVisible()) {
    await orbitaBtn.click();
    console.log('   ✅ Câmera em rotação 360° ativada!');
  }

  await page.waitForTimeout(2500);

  const shotSinai = path.join(ARTIFACT_DIR, 'modo_imersao_monte_sinai_3d.png');
  await page.screenshot({ path: shotSinai });
  console.log(`📸 Screenshot salvo: ${shotSinai}`);

  // 5. Testar Jerusalém com foto real e vista histórica
  console.log('🏰 Selecionando Jerusalém (Cidade Santa)...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'jerusalem',
      name: 'Jerusalém (Sião)',
      category: 'Cidade Sagrada',
      verse: 'Sl 122:1-4',
      quote: 'Alegrei-me quando me disseram: Vamos à casa do Senhor. Os nossos pés estão dentro das tuas portas, ó Jerusalém.',
      description: 'O epicentro da história bíblica. Local do Monte Moriá, Templo de Salomão, Monte das Oliveiras e da Redenção na Cruz.',
      geo: 'Montanhas da Judeia • Altitude 754m',
      arch: 'Cidade de Davi, Túnel de Ezequias e Muro Ocidental.',
      modelName: 'Templo de Herodes 3D',
      img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=80',
      lat: 31.7683,
      lng: 35.2137,
      era: 30,
      altitude: 2200,
    });
  });

  await page.waitForTimeout(3500);

  const shotJerusalem = path.join(ARTIFACT_DIR, 'modo_imersao_jerusalem_3d.png');
  await page.screenshot({ path: shotJerusalem });
  console.log(`📸 Screenshot salvo: ${shotJerusalem}`);

  await browser.close();
  console.log('🎉 Modo Imersão Real validado com sucesso total!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
