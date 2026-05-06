#!/usr/bin/env node
/*
 * P11a-2 render hit-test/projection boundary check.
 * Ensures render/logic.js delegates screen/world projection helpers to the
 * dedicated presentation interaction owner.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function idx(source, needle, label) {
  const i = source.indexOf(needle);
  if (i < 0) errors.push(`${label} missing ${needle}`);
  return i;
}

const hitRel = 'src/presentation/render/interaction/render-hit-test.js';
const logicRel = 'src/presentation/render/logic.js';
const indexRel = 'index.html';

if (!exists(hitRel)) errors.push(`${hitRel} is missing`);
const hitSource = exists(hitRel) ? read(hitRel) : '';
const logicSource = read(logicRel);
const indexSource = read(indexRel);

for (const symbol of [
  '__RENDER_HIT_TEST__',
  'IsometricRenderHitTest',
  'worldToScreen',
  'screenToFloor',
  'computeFloorScreenBounds',
]) {
  if (!hitSource.includes(symbol)) errors.push(`${hitRel} missing ${symbol}`);
}

const bannedInHitTest = [
  /document\./,
  /localStorage/,
  /sessionStorage/,
  /fetch\s*\(/,
  /new\s+Image\s*\(/,
  /CanvasRenderingContext2D/,
  /\.drawImage\s*\(/,
  /\.fillRect\s*\(/,
  /\.stroke\s*\(/,
  /\.fill\s*\(/,
];
for (const re of bannedInHitTest) {
  if (re.test(hitSource)) errors.push(`${hitRel} must not contain ${re}`);
}

for (const required of [
  'P11a-2 note: screen/world projection and floor-bounds helpers are delegated',
  'function requireRenderHitTestForLogic()',
  'function createRenderHitTestProjectionInputForLogic(extra)',
  'requireRenderHitTestForLogic().worldToScreen',
  'requireRenderHitTestForLogic().screenToFloor',
  'requireRenderHitTestForLogic().computeFloorScreenBounds',
]) {
  if (!logicSource.includes(required)) errors.push(`${logicRel} missing ${required}`);
}

const bannedInLogic = [
  /worldToScreenWithViewRotation\s*\(\s*\{\s*x:\s*x,\s*y:\s*y,\s*z:\s*z\s*\}/,
  /screenToWorldWithViewRotation\s*\(\s*\{\s*x:\s*sx,\s*y:\s*sy,\s*z:\s*0\s*\}/,
  /x:\s*settings\.originX\s*\+\s*camera\.x\s*\+\s*\(x\s*-\s*y\)\s*\*\s*settings\.tileW\s*\/\s*2/,
  /var\s+dx\s*=\s*\(sx\s*-\s*settings\.originX\s*-\s*camera\.x\)\s*\/\s*\(settings\.tileW\s*\/\s*2\)/,
  /var\s+pts\s*=\s*\[\s*iso\(0,\s*0,\s*0\)/,
];
for (const re of bannedInLogic) {
  if (re.test(logicSource)) errors.push(`${logicRel} still owns old hit-test/projection implementation ${re}`);
}

const hitIdx = idx(indexSource, hitRel, indexRel);
const logicIdx = idx(indexSource, logicRel, indexRel);
const boundaryIdx = idx(indexSource, 'src/presentation/render/interaction/render-logic-interaction-boundary.js', indexRel);
if (boundaryIdx >= 0 && hitIdx >= 0 && boundaryIdx > hitIdx) errors.push('render-logic-interaction-boundary.js should load before render-hit-test.js');
if (hitIdx >= 0 && logicIdx >= 0 && hitIdx > logicIdx) errors.push(`${hitRel} must load before ${logicRel}`);

const result = {
  status: errors.length ? 'FAIL' : 'PASS',
  errors,
  warnings,
  checked: [hitRel, logicRel, indexRel],
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
