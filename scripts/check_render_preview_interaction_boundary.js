#!/usr/bin/env node
/*
 * P11a-3 render preview/selection interaction boundary check.
 * Ensures render.js delegates preview updates and screen picking to the
 * dedicated presentation interaction owner.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function idx(source, needle, label) {
  const i = source.indexOf(needle);
  if (i < 0) errors.push(`${label} missing ${needle}`);
  return i;
}
function bodyOf(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}

const controllerRel = 'src/presentation/render/interaction/render-preview-interaction-controller.js';
const renderRel = 'src/presentation/render/render.js';
const indexRel = 'index.html';

if (!exists(controllerRel)) errors.push(`${controllerRel} is missing`);
const controllerSource = exists(controllerRel) ? read(controllerRel) : '';
const renderSource = read(renderRel);
const indexSource = read(indexRel);

for (const symbol of [
  '__RENDER_PREVIEW_INTERACTION_CONTROLLER__',
  'IsometricRenderPreviewInteractionController',
  'pickBoxAtScreen',
  'pickFaceAtScreen',
  'updatePreview',
]) {
  if (!controllerSource.includes(symbol)) errors.push(`${controllerRel} missing ${symbol}`);
}

const bannedInController = [
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
for (const re of bannedInController) {
  if (re.test(controllerSource)) errors.push(`${controllerRel} must not contain ${re}`);
}

for (const required of [
  'P11a-3 note: preview update and screen picking are delegated',
  'function requireRenderPreviewInteractionControllerForRender()',
  'function createRenderPreviewInteractionDepsForRender()',
  'requireRenderPreviewInteractionControllerForRender().updatePreview',
  'requireRenderPreviewInteractionControllerForRender().pickBoxAtScreen',
  'requireRenderPreviewInteractionControllerForRender().pickFaceAtScreen',
]) {
  if (!renderSource.includes(required)) errors.push(`${renderRel} missing ${required}`);
}

const thinFunctions = ['updatePreview', 'pickBoxAtScreen', 'pickFaceAtScreen'];
for (const fn of thinFunctions) {
  const body = bodyOf(renderSource, fn);
  if (!body) {
    errors.push(`${renderRel} missing ${fn}`);
    continue;
  }
  if (!body.includes('requireRenderPreviewInteractionControllerForRender()')) {
    errors.push(`${renderRel} ${fn} must delegate to render-preview-interaction-controller.js`);
  }
}

const updateBody = bodyOf(renderSource, 'updatePreview');
for (const forbidden of [
  /editor\.hoverDeleteBox\s*=\s*null/,
  /editor\.preview\s*=\s*computeCandidate/,
  /const\s+topHit\s*=\s*hitTopFace/,
  /logItemRotationPrototype\('placement-preview'/,
  /lastPreviewSignature\s*=/,
]) {
  if (forbidden.test(updateBody)) errors.push(`${renderRel} updatePreview still owns old preview implementation ${forbidden}`);
}

const pickBoxBody = bodyOf(renderSource, 'pickBoxAtScreen');
const pickFaceBody = bodyOf(renderSource, 'pickFaceAtScreen');
for (const [name, body] of [['pickBoxAtScreen', pickBoxBody], ['pickFaceAtScreen', pickFaceBody]]) {
  for (const forbidden of [/buildSurfaceFaces\(/, /pointInPoly\(/, /boxes\.find/]) {
    if (forbidden.test(body)) errors.push(`${renderRel} ${name} still owns old picking implementation ${forbidden}`);
  }
}

const interactionIdx = idx(indexSource, 'src/presentation/render/interaction/render-logic-interaction-boundary.js', indexRel);
const hitIdx = idx(indexSource, 'src/presentation/render/interaction/render-hit-test.js', indexRel);
const previewIdx = idx(indexSource, controllerRel, indexRel);
const logicIdx = idx(indexSource, 'src/presentation/render/logic.js', indexRel);
const renderIdx = idx(indexSource, renderRel, indexRel);
if (interactionIdx >= 0 && previewIdx >= 0 && interactionIdx > previewIdx) errors.push('render-logic-interaction-boundary.js should load before render-preview-interaction-controller.js');
if (hitIdx >= 0 && previewIdx >= 0 && hitIdx > previewIdx) errors.push('render-hit-test.js should load before render-preview-interaction-controller.js');
if (previewIdx >= 0 && logicIdx >= 0 && previewIdx > logicIdx) errors.push(`${controllerRel} should load before logic.js`);
if (previewIdx >= 0 && renderIdx >= 0 && previewIdx > renderIdx) errors.push(`${controllerRel} should load before render.js`);

const result = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings, checked: [controllerRel, renderRel, indexRel] };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
