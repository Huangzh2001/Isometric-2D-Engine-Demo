#!/usr/bin/env node
/*
 * P8d canvas floor-layer draw-pass boundary check.
 * Verifies that chunked floor-layer Canvas drawing/cache is owned by
 * presentation/render/renderer/canvas2d-floor-layer-draw-pass.js and that
 * render.js delegates to it instead of re-owning chunk/offscreen draw bodies.
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

const staticPassRel = 'src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js';
const passRel = 'src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js';
const renderRel = 'src/presentation/render/render.js';

if (!exists(passRel)) errors.push(`missing ${passRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);

const passSource = exists(passRel) ? read(passRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  const staticIdx = idx(source, staticPassRel);
  const passIdx = idx(source, passRel);
  const renderIdx = idx(source, renderRel);
  if (renderIdx >= 0 && passIdx < 0) errors.push(`${htmlRel}: missing ${passRel} before render.js`);
  else if (renderIdx >= 0 && passIdx > renderIdx) errors.push(`${htmlRel}: ${passRel} must load before ${renderRel}`);
  if (staticIdx >= 0 && passIdx >= 0 && staticIdx > passIdx) warnings.push(`${htmlRel}: ${staticPassRel} should normally load before ${passRel}`);
}

for (const name of [
  'completeFloorLayerBreakdown',
  'ensureFloorLayerCanvas',
  'getFloorChunkKeyForLayer',
  'parseFloorChunkKeyForLayer',
  'computeVisibleFloorChunkKeysForLayer',
  'buildFloorChunkEntryForLayer',
  'drawFloorOutlineToLayer',
  'rebuildFloorLayerIfNeeded',
  'drawFloor'
]) {
  if (!hasFunction(passSource, name)) errors.push(`${passRel}: missing function ${name}`);
}

if (!passSource.includes("layer: 'presentation/render/renderer'")) errors.push(`${passRel}: must identify presentation/render/renderer layer`);
if (!passSource.includes("phase: 'P8d'")) errors.push(`${passRel}: must identify P8d phase`);
for (const forbidden of ['fetch(', 'new Image', 'staticBoxRenderCache', 'buildRenderables', 'buildMainFrameRenderables']) {
  if (passSource.includes(forbidden)) errors.push(`${passRel}: must not contain ${forbidden}`);
}
for (const required of ['createCanvas', 'drawPolyOn', 'screenPointsFromWorldFaceNoCamera', 'floorLayerSignature']) {
  if (!passSource.includes(required)) errors.push(`${passRel}: missing injected dependency usage ${required}`);
}

for (const marker of [
  'requireCanvas2dFloorLayerDrawPassForRender().drawFloor',
  'requireCanvas2dFloorLayerDrawPassForRender().rebuildFloorLayerIfNeeded',
  'requireCanvas2dFloorLayerDrawPassForRender().buildFloorChunkEntryForLayer',
  'requireCanvas2dFloorLayerDrawPassForRender().computeVisibleFloorChunkKeysForLayer',
  'createCanvas2dFloorLayerDrawPassDepsForRender()'
]) {
  if (!renderSource.includes(marker)) errors.push(`${renderRel}: missing floor layer draw-pass delegation marker ${marker}`);
}

for (const item of [
  { snippet: 'var tiles = [];\n  var minScreenX = Infinity;', reason: 'floor chunk tile build body belongs in canvas2d-floor-layer-draw-pass' },
  { snippet: 'var canvasEl = document.createElement(\'canvas\');', reason: 'offscreen floor canvas build body belongs in canvas2d-floor-layer-draw-pass' },
  { snippet: 'targetCtx.drawImage(visibleEntry.canvas, bounds.x + currentCameraXForLayer', reason: 'floor layer compose body belongs in canvas2d-floor-layer-draw-pass' },
  { snippet: "floorLayerActualBranch: 'floor-layer-cache-unknown'", reason: 'floor breakdown body belongs in canvas2d-floor-layer-draw-pass' },
  { snippet: "targetCtx.strokeStyle = 'rgba(255,255,255,.14)'", reason: 'floor outline body belongs in canvas2d-floor-layer-draw-pass' }
]) {
  if (renderSource.includes(item.snippet)) errors.push(`${renderRel}: ${item.reason}`);
}

const report = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
