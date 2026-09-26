import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = '/Users/cristianocolombo/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';

async function main() {
  console.log('🚀 Iniciando teste de abertura de eventos no globo/mapa 3D...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-webgl', '--no-sandbox'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  console.log('📍 Navegando para http://localhost:3000/atlas...');
  await page.goto('http://localhost:3000/atlas', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // 1. Abrir evento de Ur dos Caldeus (Rota de Abraão)
  console.log('📜 1. Disparando evento de Ur dos Caldeus...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'Ur dos Caldeus',
      name: '1. Ur dos Caldeus',
      step: 'Passo 1',
      category: 'Antigo Testamento (AT)',
      verse: 'Gênesis 11:31',
      quote: 'Tomou Terá a Abrão seu filho... e saíram de Ur dos Caldeus para ir à terra de Canaã...',
      description: 'O início da peregrinação da família de Abraão a partir de uma das mais avançadas metrópoles da Mesopotâmia antiga.',
      geo: 'Localizada na planície aluvial do sul da Mesopotâmia (atual Iraque), próxima ao antigo curso do rio Eufrates.',
      arch: 'Famosa pelo grande zigurate de Ur, escavado por Sir Leonard Woolley.',
      modelName: 'Zigurate de Ur',
      lat: 30.962,
      lng: 46.1031,
      era: -2000,
    });
    window.BibleMapIntegration?.flyTo(30.962, 46.1031, 8);
    window.BibleMapIntegration?.updateTimeline(-2000);
  });
  await page.waitForTimeout(3000);
  const shot1 = path.join(ARTIFACT_DIR, 'opened_event_ur_caldeus.png');
  await page.screenshot({ path: shot1 });
  console.log(`   📸 Screenshot salvo: ${shot1}`);

  // 2. Abrir evento do Monte Sinai (Êxodo)
  console.log('🏔️ 2. Disparando evento do Monte Sinai (Horebe)...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'Monte Sinai (Horebe)',
      name: '7. Monte Sinai (Horebe)',
      step: 'Passo 7',
      category: 'Rota do Êxodo',
      verse: 'Êxodo 19:20',
      quote: 'E, descendo o Senhor sobre o monte Sinai... chamou o Senhor a Moisés ao cume do monte; e Moisés subiu.',
      description: 'O monte sagrado onde Deus proclamou o Decálogo (Dez Mandamentos) e formalizou a aliança com a nação de Israel.',
      geo: 'Maciço montanhoso no sul da Península do Sinai (Jebel Musa), com altitude de 2.285 metros.',
      arch: 'Base histórica do Mosteiro de Santa Catarina, fundado no século VI com a mais antiga biblioteca monástica contínua.',
      modelName: 'Templo / Altar do Sinai',
      lat: 28.539,
      lng: 33.975,
      era: -1446,
    });
    window.BibleMapIntegration?.flyTo(28.539, 33.975, 11);
    window.BibleMapIntegration?.updateTimeline(-1446);
  });
  await page.waitForTimeout(3000);
  const shot2 = path.join(ARTIFACT_DIR, 'opened_event_monte_sinai.png');
  await page.screenshot({ path: shot2 });
  console.log(`   📸 Screenshot salvo: ${shot2}`);

  // 3. Abrir evento arqueológico (Inscrição de Tel Dã - Casa de Davi)
  console.log('🏺 3. Disparando evento arqueológico (Estela de Tel Dã)...');
  await page.evaluate(() => {
    window.BibleMapIntegration?.events.publish('onLocationSelected', {
      id: 'arch-tel-dan',
      name: '🏺 Estela de Tel Dã (Casa de Davi)',
      step: 'Achado Arqueológico',
      category: 'Arqueologia (confirmada)',
      verse: '1 Reis 12:28-30; 2 Reis 8:28',
      quote: 'Primeira menção epigráfica extrabíblica da dinastia de Davi (BYTDWD) datada do século IX a.C.',
      description: 'Fragmento de basalto com inscrição aramaica comemorando a vitória militar sobre os reis de Israel e da "Casa de Davi".',
      geo: 'Descoberta em Tel Dã, no norte de Israel, junto ao antigo portão da cidade.',
      arch: 'Acervo permanente no Museu de Israel, Jerusalém.',
      modelName: 'Estela Aramaica',
      lat: 33.2486,
      lng: 35.6522,
      era: -840,
    });
    window.BibleMapIntegration?.flyTo(33.2486, 35.6522, 13);
    window.BibleMapIntegration?.updateTimeline(-840);
  });
  await page.waitForTimeout(3000);
  const shot3 = path.join(ARTIFACT_DIR, 'opened_event_tel_dan.png');
  await page.screenshot({ path: shot3 });
  console.log(`   📸 Screenshot salvo: ${shot3}`);

  await browser.close();
  console.log('✨ Teste de eventos concluído com sucesso!');
}

main().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
