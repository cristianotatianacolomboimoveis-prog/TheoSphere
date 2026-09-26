import { chromium } from 'playwright';
import * as path from 'path';

const ARTIFACTS_DIR = '/Users/cristianocolombo/.gemini/antigravity-ide/brain/f5bbbfaa-a13b-4f9a-a951-6d6107fe8745';

async function testStudyAndExegesis() {
  console.log('📖 INICIANDO TESTE DO LEITOR BÍBLICO, WORKSPACE E EXEGESE...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  // 1. Acessar /study
  console.log('🌐 Navegando para http://localhost:3000/study...');
  let t0 = Date.now();
  await page.goto('http://localhost:3000/study', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log(`   Carregou /study em ${Date.now() - t0}ms`);
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_step5_study_workspace.png') });

  // 2. Verificar seletor de tradução
  console.log('🔤 Testando seletor de tradução...');
  const translationTrigger = page.locator('button:has-text("BLIVRE"), button:has-text("NVA"), button:has-text("KJV"), [data-testid="translation-picker"]').first();
  if (await translationTrigger.count() > 0) {
    await translationTrigger.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_step6_translation_menu.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // 3. Testar Comparação de Versões (Sinopse Textual)
  console.log('⚖️ Testando ferramenta de Comparação e Diff Textual...');
  const compareBtn = page.locator('button:has-text("Sinopse"), button:has-text("Variantes"), button:has-text("Comparar"), [title*="Sinopse"]').first();
  if (await compareBtn.count() > 0) {
    await compareBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_step7_text_comparison.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // 4. Testar Guia de Passagem Exegético
  console.log('📖 Testando Guia Exegético e Comentários Clássicos...');
  const passageGuideBtn = page.locator('button:has-text("Guia Exegético"), button:has-text("Ideias"), [title*="Guia Exegético"]').first();
  if (await passageGuideBtn.count() > 0) {
    await passageGuideBtn.click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_step8_passage_guide.png') });
  }

  // 5. Testar Bancada Exegética /exegesis
  console.log('🏛️ Navegando para http://localhost:3000/exegesis...');
  t0 = Date.now();
  await page.goto('http://localhost:3000/exegesis', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log(`   Carregou /exegesis em ${Date.now() - t0}ms`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_step9_exegesis_bancada.png') });

  await browser.close();
  console.log('✅ Testes de Estudo e Exegese concluídos!');
}

testStudyAndExegesis().catch(err => {
  console.error('❌ Falha:', err);
  process.exit(1);
});
