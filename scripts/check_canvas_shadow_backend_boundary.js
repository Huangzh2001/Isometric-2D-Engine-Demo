#!/usr/bin/env node
/*
 * P8b canvas shadow backend boundary check.
 * Verifies that Canvas2D shadow overlay draw-pass code is owned by
 * presentation/render/renderer/canvas2d-shadow-overlays.js and that render.js
 * delegates to it instead of re-owning clipping/compositing implementation.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function idx(source, needle) { return source.indexOf(needle); }
function hasFunction(source, name) {
  return new RegExp('function\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(').test(source);
}
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

const primitiveRel = 'src/presentation/render/renderer/canvas2d-draw-primitives.js';
const shadowRel = 'src/presentation/render/renderer/canvas2d-shadow-overlays.js';
const renderRel = 'src/presentation/render/render.js';

if (!exists(shadowRel)) errors.push(`missing ${shadowRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);

const shadowSource = exists(shadowRel) ? read(shadowRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  const primitiveIdx = idx(source, primitiveRel);
  const shadowIdx = idx(source, shadowRel);
  const renderIdx = idx(source, renderRel);
  if (renderIdx >= 0 && shadowIdx < 0) errors.push(`${htmlRel}: missing ${shadowRel} before render.js`);
  else if (renderIdx >= 0 && shadowIdx > renderIdx) errors.push(`${htmlRel}: ${shadowRel} must load before ${renderRel}`);
  if (shadowIdx >= 0 && primitiveIdx >= 0 && primitiveIdx > shadowIdx) warnings.push(`${htmlRel}: ${primitiveRel} should normally load before ${shadowRel}`);
}

for (const name of ['drawFaceShadowOverlays', 'drawFaceShadowOverlaysNoCamera']) {
  if (!hasFunction(shadowSource, name)) errors.push(`${shadowRel}: missing function ${name}`);
}

if (!shadowSource.includes("layer: 'presentation/render/renderer'")) errors.push(`${shadowRel}: must identify presentation/render/renderer layer`);
if (!shadowSource.includes("phase: 'P8b'")) errors.push(`${shadowRel}: must identify P8b phase`);
for (const forbidden of ['localStorage', 'fetch(', 'document.', 'new Image', 'staticBoxRenderCache', 'buildRenderables', 'buildMainFrameRenderables']) {
  if (shadowSource.includes(forbidden)) errors.push(`${shadowRel}: must not contain ${forbidden}`);
}
for (const required of ['ensureShadowPolyUnionCanvas', 'fillShadowUnionWithDistanceFade', 'drawUnionShadowCanvasToTarget']) {
  if (!shadowSource.includes(required)) errors.push(`${shadowRel}: missing injected dependency usage ${required}`);
}

for (const marker of [
  'requireCanvas2dShadowOverlaysForRender().drawFaceShadowOverlays',
  'requireCanvas2dShadowOverlaysForRender().drawFaceShadowOverlaysNoCamera',
  'createCanvas2dShadowOverlayDepsForRender()'
]) {
  if (!renderSource.includes(marker)) errors.push(`${renderRel}: missing shadow delegation marker ${marker}`);
}

for (const item of [
  { snippet: 'fillShadowUnionWithDistanceFade(unionCtx, screenPolys', reason: 'shadow union fill body belongs in canvas2d-shadow-overlays' },
  { snippet: 'logScreenOverlayDebug({ alpha: clamp(overlay.alpha', reason: 'screen shadow debug payload belongs in canvas2d-shadow-overlays' },
  { snippet: 'targetCtx.clip();\n    drawUnionShadowCanvasToTarget(targetCtx, overlay.alpha);', reason: 'shadow clip/composite body belongs in canvas2d-shadow-overlays' }
]) {
  if (renderSource.includes(item.snippet)) errors.push(`${renderRel}: ${item.reason}`);
}

const report = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
