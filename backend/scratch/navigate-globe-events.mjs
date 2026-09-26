import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = '/Users/cristianocolombo/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';

async function main() {
  console.log('🌍 Iniciando navegação pelo GLOBO 3D e abertura de eventos...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-webgl', '--no-sandbox'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  console.log('📍 Acessando http://localhost:3000/atlas...');
  await page.goto('http://localhost:3000/atlas', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // 1. Alternar para o Globo 3D Cesium
  console.log('🌐 Alternando para o Modo Globo 3D Cesium...');
  const globeBtn = await page.$('button[title*="Globo 3D Cesium"], button:has-text("Globo 3D")');
  if (globeBtn) {
    await globeBtn.click();
    console.log('   ✅ Botão do Globo 3D clicado com sucesso!');
  } else {
    console.log('   ⚠️ Botão de Globo não encontrado por seletor, usando evaluate...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(el => el.textContent?.includes('Globo 3D') || el.title?.includes('Cesium'));
      b?.click();
    });
  }

  // Aguardar montagem e inicialização do Cesium Viewer
  console.log('⏳ Aguardando renderização do globo orbital Cesium...');
  await page.waitForTimeout(5000);

  // 2. Navegar para Ur dos Caldeus no Globo e Abrir Evento
  console.log('📍 2. Navegando para Ur dos Caldeus no Globo e abrindo evento...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'Ur dos Caldeus',
      name: '1. Ur dos Caldeus',
      step: 'Passo 1',
      category: 'Rota dos Patriarcas',
      verse: 'Gênesis 11:31',
      quote: 'Tomou Terá a Abrão seu filho... e saíram de Ur dos Caldeus para ir à terra de Canaã...',
      description: 'O início da peregrinação patriarcal a partir do sul da Mesopotâmia. Centro religioso com o grande zigurate de Nana.',
      geo: 'Planície do sul do Iraque moderno (Tell el-Muqayyar), próximo ao rio Eufrates.',
      arch: 'Zigurate de Ur escavado por Woolley; cemitério real com artefatos de ouro e lápis-lazúli.',
      modelName: 'Zigurate de Ur',
      lat: 30.962,
      lng: 46.1031,
      era: -2000,
    });
    window.BibleMapIntegration?.flyTo(30.962, 46.1031, 8);
  });
  await page.waitForTimeout(3000);
  const shot1 = path.join(ARTIFACT_DIR, 'globo_evento1_ur_caldeus.png');
  await page.screenshot({ path: shot1 });
  console.log(`   📸 Screenshot salvo: ${shot1}`);

  // 3. Navegar para o Monte Sinai no Globo e Abrir Evento
  console.log('🏔️ 3. Navegando para o Monte Sinai (Horebe) no Globo e abrindo evento...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'Monte Sinai',
      name: '7. Monte Sinai (Horebe)',
      step: 'Passo 7',
      category: 'Rota do Êxodo',
      verse: 'Êxodo 19:20',
      quote: 'E descendo o Senhor sobre o cume do monte Sinai, chamou o Senhor a Moisés ao cume do monte...',
      description: 'Entrega da Lei e formalização da Aliança com o povo de Israel. Localização tradicional no sul da península sinítica.',
      geo: 'Maciço granítico do Jebel Musa no sul do Sinai (2.285m de altitude).',
      arch: 'Mosteiro de Santa Catarina fundado no século VI d.C. aos pés do monte.',
      lat: 28.5394,
      lng: 33.9753,
      era: -1446,
    });
    window.BibleMapIntegration?.flyTo(28.5394, 33.9753, 8);
  });
  await page.waitForTimeout(3000);
  const shot2 = path.join(ARTIFACT_DIR, 'globo_evento2_monte_sinai.png');
  await page.screenshot({ path: shot2 });
  console.log(`   📸 Screenshot salvo: ${shot2}`);

  // 4. Navegar para Cafarnaum / Mar da Galileia no Globo e Abrir Evento
  console.log('🌊 4. Navegando para Cafarnaum (Ministério na Galileia) no Globo e abrindo evento...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'Cafarnaum',
      name: 'Cafarnaum — Cidade de Jesus',
      step: 'Ministério na Galileia',
      category: 'Evangelhos',
      verse: 'Mateus 4:13',
      quote: 'E, deixando Nazaré, foi habitar em Cafarnaum, cidade marítima, nos confins de Zebulom e Naftali.',
      description: 'O quartel-general do ministério público de Jesus na Galileia, local de inúmeros milagres e ensinamentos.',
      geo: 'Margem noroeste do Mar da Galileia (Kinneret), ponto comercial estratégico na Via Maris.',
      arch: 'Sinagoga de calcário branco erguida sobre fundações de basalto do séc. I d.C. e a Casa de Pedro (domus-ecclesia).',
      modelName: 'Sinagoga de Cafarnaum',
      lat: 32.8805,
      lng: 35.5753,
      era: 29,
    });
    window.BibleMapIntegration?.flyTo(32.8805, 35.5753, 9);
  });
  await page.waitForTimeout(3000);
  const shot3 = path.join(ARTIFACT_DIR, 'globo_evento3_cafarnaum.png');
  await page.screenshot({ path: shot3 });
  console.log(`   📸 Screenshot salvo: ${shot3}`);

  // 5. Navegar para Jerusalém no Globo e Abrir Evento
  console.log('🏛️ 5. Navegando para Jerusalém no Globo e abrindo evento...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'Jerusalém',
      name: 'Jerusalém — A Cidade Santa',
      step: 'Paixão e Ressurreição',
      category: 'Centro Bíblico Universal',
      verse: 'Lucas 24:46-47',
      quote: 'Assim está escrito que o Cristo havia de padecer e ressuscitar dentre os mortos no terceiro dia...',
      description: 'O epicentro histórico e teológico da fé bíblica. Local do Templo, do Calvário, da Ressurreição e do Pentecostes.',
      geo: 'Planalto nas Montanhas da Judeia (754m), ladeada pelos vales do Cedrom, Hinom e Tiropoeon.',
      arch: 'Muro das Lamentações, Tanque de Siloé, Cidade de Davi, vestígios herodianos e túmulos do primeiro século.',
      modelName: 'Segundo Templo de Herodes',
      lat: 31.7767,
      lng: 35.2345,
      era: 33,
    });
    window.BibleMapIntegration?.flyTo(31.7767, 35.2345, 9);
  });
  await page.waitForTimeout(3000);
  const shot4 = path.join(ARTIFACT_DIR, 'globo_evento4_jerusalem.png');
  await page.screenshot({ path: shot4 });
  console.log(`   📸 Screenshot salvo: ${shot4}`);

  await browser.close();
  console.log('🎉 Navegação e abertura de eventos no globo concluídas com sucesso!');
}

main().catch((err) => {
  console.error('❌ Erro no teste do globo:', err);
  process.exit(1);
});
