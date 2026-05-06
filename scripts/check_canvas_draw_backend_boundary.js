#!/usr/bin/env node
/*
 * P8 canvas draw backend boundary check.
 * Verifies that low-level Canvas2D primitives are owned by
 * presentation/render/renderer/canvas2d-draw-primitives.js and that render.js
 * delegates to that backend instead of re-owning primitive implementations.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}
function hasFunction(source, name) {
  return new RegExp('function\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(').test(source);
}
function idx(source, needle) { return source.indexOf(needle); }

const primitiveRel = 'src/presentation/render/renderer/canvas2d-draw-primitives.js';
const renderRel = 'src/presentation/render/render.js';

if (!exists(primitiveRel)) errors.push(`missing ${primitiveRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);

const primitiveSource = exists(primitiveRel) ? read(primitiveRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  const renderIdx = idx(source, renderRel);
  const primitiveIdx = idx(source, primitiveRel);
  if (renderIdx >= 0 && primitiveIdx < 0) errors.push(`${htmlRel}: missing ${primitiveRel} before render.js`);
  else if (renderIdx >= 0 && primitiveIdx > renderIdx) errors.push(`${htmlRel}: ${primitiveRel} must load before ${renderRel}`);
}

for (const name of [
  'drawPolyOn',
  'drawPolyWithOffsetOn',
  'averagePointWithOffset',
  'buildPath2DFromPoints',
  'buildPath2DFromLoops',
  'buildPath2DFromSegments',
  'drawTextBadgeOn',
  'drawMultilineBadgeOn'
]) {
  if (!hasFunction(primitiveSource, name)) errors.push(`${primitiveRel}: missing primitive function ${name}`);
}

if (!primitiveSource.includes("layer: 'presentation/render/renderer'")) errors.push(`${primitiveRel}: must identify presentation/render/renderer layer`);
if (/\bgetSceneOccupancySnapshotForRender\b/.test(primitiveSource)) errors.push(`${primitiveRel}: must not depend on scene occupancy`);
if (/\bstaticBoxRenderCache\b/.test(primitiveSource)) errors.push(`${primitiveRel}: must not depend on render cache`);
if (/\binstances\b/.test(primitiveSource)) warnings.push(`${primitiveRel}: contains word instances; inspect before adding scene runtime dependencies`);
if (/\blocalStorage\b/.test(primitiveSource)) errors.push(`${primitiveRel}: must not access localStorage`);
if (/\bfetch\s*\(/.test(primitiveSource)) errors.push(`${primitiveRel}: must not call fetch`);
if (/\bdocument\s*\./.test(primitiveSource)) errors.push(`${primitiveRel}: must not access document`);
if (/\bnew\s+Image\b/.test(primitiveSource)) errors.push(`${primitiveRel}: must not allocate Image`);

for (const marker of [
  'requireCanvas2dDrawPrimitivesForRender().drawPolyOn',
  'requireCanvas2dDrawPrimitivesForRender().drawPolyWithOffsetOn',
  'requireCanvas2dDrawPrimitivesForRender().buildPath2DFromPoints',
  'requireCanvas2dDrawPrimitivesForRender().buildPath2DFromLoops',
  'requireCanvas2dDrawPrimitivesForRender().buildPath2DFromSegments',
  'requireCanvas2dDrawPrimitivesForRender().drawTextBadgeOn',
  'requireCanvas2dDrawPrimitivesForRender().drawMultilineBadgeOn'
]) {
  if (!renderSource.includes(marker)) errors.push(`${renderRel}: missing primitive delegation marker ${marker}`);
}

for (const item of [
  { snippet: 'targetCtx.beginPath();\n  targetCtx.moveTo(points[0].x, points[0].y);', reason: 'drawPolyOn body belongs in canvas2d-draw-primitives' },
  { snippet: 'if (typeof Path2D === \'undefined\') return null;\n  var pts = Array.isArray(points)', reason: 'Path2D builder body belongs in canvas2d-draw-primitives' },
  { snippet: "ctx.font = '10px monospace';\n  var maxW = 0;", reason: 'badge primitive body belongs in canvas2d-draw-primitives' }
]) {
  if (renderSource.includes(item.snippet)) errors.push(`${renderRel}: ${item.reason}`);
}

const report = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
