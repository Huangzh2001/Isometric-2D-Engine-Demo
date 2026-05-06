#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const logicRel = 'src/presentation/render/logic.js';
const logicSource = read(logicRel);
assert(logicSource.includes('P9d note: duplicate historical function declarations were removed'), 'logic.js should carry the P9d duplicate cleanup notice');

const byName = new Map();
const functionRe = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
let match;
while ((match = functionRe.exec(logicSource))) {
  const name = match[1];
  const line = logicSource.slice(0, match.index).split('\n').length;
  if (!byName.has(name)) byName.set(name, []);
  byName.get(name).push(line);
}
const duplicates = [];
for (const [name, lines] of byName.entries()) {
  if (lines.length > 1) duplicates.push({ name, lines });
}
assert.deepStrictEqual(duplicates, [], 'logic.js should not contain duplicate top-level function declarations');

for (const name of ['lightForward', 'drawLightShadows', 'drawProjectedComponentShadow', 'litFaceColor']) {
  assert.strictEqual((byName.get(name) || []).length, 1, `${name} should have exactly one implementation after P9d cleanup`);
}

assert(Buffer.byteLength(logicSource, 'utf8') < 150000, 'logic.js should be below the P9d duplicate-cleanup ceiling');
console.log(JSON.stringify({ status: 'PASS', tested: [logicRel], functionCount: byName.size }, null, 2));
