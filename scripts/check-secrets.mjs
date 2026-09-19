#!/usr/bin/env node
// Fails when a tracked file contains something that looks like a real credential.
// Prints file:line and the rule name only - never the matched value.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SKIP_PATH = /(^|\/)(package-lock\.json|.*\.lock)$|^frontend-v2\/public\/cesium\/|\.(png|jpe?g|gif|ico|pdf|epub|zip|woff2?|ttf|mp4|glb|gltf|bin|wasm|db)$/i;
const LOCAL_HOST = /@(localhost|127\.0\.0\.1|db:|host\b|HOST|\$)/;
const PLACEHOLDER = /^(USER|PASSWORD|PASS|REDACTED|changeme|theosecret|ci_test_password|\*+|x+|<.*>|\$\{.*)$/i;

const RULES = [
  { name: 'google-api-key', re: /AIza[0-9A-Za-z_-]{30,}/g },
  { name: 'vercel-token', re: /\bvck_[A-Za-z0-9]{20,}/g },
  { name: 'github-token', re: /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g },
  { name: 'openai-style-key', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}/g },
  { name: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'slack-token', re: /\bxox[bp]-[A-Za-z0-9-]{10,}/g },
  { name: 'private-key', re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----(?!\s*REDACTED)/g },
  { name: 'private-key-body', re: /\bMIIE[A-Za-z0-9+/=]{40,}/g },
  {
    name: 'db-url-with-password',
    re: /postgres(?:ql)?:\/\/[^:@/\s"'\\]+:([^@\s"'\\]{6,})@[^\s"'\\]*/g,
    accept: (m) => LOCAL_HOST.test(m[0]) || PLACEHOLDER.test(decodeURIComponent(m[1]).trim()),
  },
  {
    name: 'secret-assignment',
    re: /\b(?:JWT_SECRET|RAILWAY_TOKEN|MCP_API_KEY)\s*[=:]\s*\\?["']?([A-Za-z0-9+/_.-]{24,})/g,
    accept: (m) => PLACEHOLDER.test(m[1]) || /^ci_secret/.test(m[1]) || /^x+$/i.test(m[1]) || /^process\.env\./.test(m[1]),
  },
];

const files = execFileSync('git', ['ls-files', '-z'], { maxBuffer: 1 << 28 }).toString().split('\0').filter((f) => f && !SKIP_PATH.test(f));
let findings = 0;
for (const file of files) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      if (rule.accept?.(m)) continue;
      const line = text.slice(0, m.index).split('\n').length;
      console.error(`${file}:${line}  ${rule.name}`);
      findings += 1;
    }
  }
}
if (findings) {
  console.error(`\n${findings} possible credential(s) in tracked files. Remove them and rotate the credential: git history keeps old values.`);
  process.exit(1);
}
console.log(`secret scan clean (${files.length} files)`);
