// Jest CJS shim for uuid v14 (pure ESM package)
// Uses Node.js native crypto.randomUUID() — same implementation uuid uses internally.
const { randomUUID } = require('crypto');

function v4() {
  return randomUUID();
}

function v7() {
  // UUIDv7: timestamp-based. Use randomUUID as fallback for tests.
  return randomUUID();
}

function validate(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

module.exports = { v4, v7, validate };
module.exports.default = { v4, v7, validate };
