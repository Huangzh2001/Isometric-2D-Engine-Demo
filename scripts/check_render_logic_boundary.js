#!/usr/bin/env node
/*
 * P9d render logic boundary check.
 * Verifies that src/presentation/render/logic.js no longer contains stale
 * duplicate top-level function declarations after the historical shadow/lighting
 * cleanup.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const logicRel = 'src/presentation/render/logic.js';
const logicSource = read(logicRel);

if (!logicSource.includes('P9d note: duplicate historical function declarations were removed')) {
  errors.push(`${logicRel} missing P9d duplicate-cleanup notice`);
}

const functionDecls = [];
const functionRe = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
let match;
while ((match = functionRe.exec(logicSource))) {
  functionDecls.push({
    name: match[1],
    index: match.index,
    line: logicSource.slice(0, match.index).split('\n').length,
  });
}

const byName = new Map();
for (const decl of functionDecls) {
  if (!byName.has(decl.name)) byName.set(decl.name, []);
  byName.get(decl.name).push(decl.line);
}
for (const [name, lines] of byName.entries()) {
  if (lines.length > 1) {
    errors.push(`${logicRel} has duplicate top-level function declaration ${name} at lines ${lines.join(', ')}`);
  }
}

const oldDuplicateHotspots = [
  'lightForward',
  'lightIncoming',
  'areaSampleOffsets',
  'drawProjectedShadow',
  'drawPlayerShadow',
  'drawLightGlow',
  'drawLightShadows',
  'drawProjectedComponentShadow',
  'litFaceColor',
];
for (const name of oldDuplicateHotspots) {
  const count = byName.has(name) ? byName.get(name).length : 0;
  if (count !== 1) errors.push(`${logicRel} expected exactly one ${name} declaration after P9d cleanup, found ${count}`);
}

const maxReasonableBytes = 150000;
const byteLength = Buffer.byteLength(logicSource, 'utf8');
if (byteLength > maxReasonableBytes) {
  warnings.push(`${logicRel} is still large (${byteLength} bytes); continue P9d/P10 decomposition later`);
}

const result = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings, functionCount: functionDecls.length, bytes: byteLength };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
