#!/usr/bin/env node
/**
 * sync-catalog.mjs — Sincroniza o catálogo de obras teológicas do backend para o frontend (T0.6).
 * Single Source of Truth: backend/src/bible/classic-catalog.ts -> frontend-v2/src/data/classicCatalog.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const backendCatalogPath = resolve(rootDir, 'backend/src/bible/classic-catalog.ts');
const frontendCatalogPath = resolve(rootDir, 'frontend-v2/src/data/classicCatalog.ts');

const backendContent = readFileSync(backendCatalogPath, 'utf-8');

// Cabeçalho de auto-geração
const header = `/**
 * classicCatalog.ts — Catálogo Oficial das Obras Teológicas do TheoSphere.
 * ATENÇÃO: Arquivo sincronizado automaticamente a partir de backend/src/bible/classic-catalog.ts
 * NÃO editar manualmente. Execute \`node scripts/sync-catalog.mjs\` para atualizar.
 */\n\n`;

// Substitui aspas duplas de imports/tipos se necessário e adiciona o cabeçalho
let content = backendContent;
if (content.startsWith('/**')) {
  content = content.replace(/^\/\*\*[\s\S]*?\*\/\n*/, '');
}

writeFileSync(frontendCatalogPath, header + content, 'utf-8');
console.log('✅ Catálogo sincronizado com sucesso: backend -> frontend-v2');

