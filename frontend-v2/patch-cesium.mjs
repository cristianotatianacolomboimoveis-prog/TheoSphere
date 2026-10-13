import fs from 'fs';
import path from 'path';

function patchKnockout(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const needles = ['`{}()/:[', String.raw`\`{}()/:[`];
  for (const needle of needles) {
    if (content.includes(needle)) {
      console.log(`Patching backtick in: ${filePath}`);
      content = content.replaceAll(needle, String.raw`\x60{}()/:[`);
      changed = true;
    }
  }

  const rawBacktickPatterns = [
    ['`(?:\\\\.|[^`])*`', '\\x60(?:\\\\.|[^\\x60])*\\x60'],
    ['`)*`', '\\x60)*\\x60'],
    ['[^`])*`', '[^\\x60])*\\x60'],
    [String.raw`\`)*\``, String.raw`\x60)*\x60`],
    [String.raw`[^\`])*\``, String.raw`[^\x60])*\x60`],
  ];
  for (const [p, r] of rawBacktickPatterns) {
    if (content.includes(p)) {
      content = content.replaceAll(p, r);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[SUCCESS] Patched ${filePath}`);
    return true;
  }
  return false;
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkDir(full);
    } else if (ent.name.endsWith('.js') || ent.name.endsWith('.cjs')) {
      patchKnockout(full);
    }
  }
}

console.log('Running patch-cesium.mjs ...');
walkDir('node_modules/@cesium');
walkDir('node_modules/cesium');
walkDir('public/cesium');
console.log('Patch script finished.');
