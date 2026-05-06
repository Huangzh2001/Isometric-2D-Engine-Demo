#!/usr/bin/env node
/*
 * P11c-7 Canvas2D frame pipeline boundary check.
 * Ensures runFramePipeline orchestration is owned by canvas2d-frame-pipeline.js
 * and canvas2d-renderer.js only delegates to it.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function htmlFiles() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}
function requireBefore(source, before, after, htmlRel) {
  const beforeIdx = source.indexOf(before);
  const afterIdx = source.indexOf(after);
  if (afterIdx < 0) return;
  if (beforeIdx < 0) errors.push(`${htmlRel}: missing ${before}`);
  else if (beforeIdx > afterIdx) errors.push(`${htmlRel}: ${before} must load before ${after}`);
}
function extractNamedFunctionBody(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  if (start < 0) return '';
  const braceStart = source.indexOf('{', start);
  if (braceStart < 0) return '';
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart + 1, i);
    }
  }
  return source.slice(braceStart + 1);
}

const ownerRel = 'src/presentation/render/renderer/canvas2d-frame-pipeline.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
const interactionOwnerRel = 'src/presentation/render/renderer/canvas2d-interaction-pipeline-capture.js';
for (const rel of [ownerRel, rendererRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const owner = exists(ownerRel) ? read(ownerRel) : '';
const renderer = exists(rendererRel) ? read(rendererRel) : '';
for (const htmlRel of htmlFiles()) {
  const source = read(htmlRel);
  requireBefore(source, ownerRel, rendererRel, htmlRel);
  requireBefore(source, interactionOwnerRel, ownerRel, htmlRel);
}

for (const symbol of [
  'window.__CANVAS2D_FRAME_PIPELINE__',
  'renderer.canvas2dFramePipeline',
  'renderer.diagnostics.canvas2dFramePipeline',
  'function runFramePipeline(adapterApi, deps, passApi, renderablesApi)',
  'adapter.runFramePipeline.clearAndPaintMainBackground',
  'CANVAS2D-PIPELINE-BREAKDOWN',
  'RENDER-FUNCTION-BREAKDOWN',
  'recordInteractionPipelineCall'
]) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing frame-pipeline symbol ${symbol}`);
}

if (!renderer.includes('requireCanvas2dFramePipelineApi') || !renderer.includes('__CANVAS2D_FRAME_PIPELINE__')) {
  errors.push(`${rendererRel}: must delegate to Canvas2D frame pipeline owner`);
}
if (!renderer.includes('createCanvas2dFramePipelineDepsForRenderer')) {
  errors.push(`${rendererRel}: must expose explicit dependency injection for frame pipeline owner`);
}
const rendererRunBody = extractNamedFunctionBody(renderer, 'runFramePipeline');
if (!rendererRunBody.includes('requireCanvas2dFramePipelineApi().runFramePipeline')) {
  errors.push(`${rendererRel}: runFramePipeline must be a thin wrapper delegating to owner`);
}
for (const forbidden of [
  'CANVAS2D-PIPELINE-BREAKDOWN',
  'RENDER-FUNCTION-BREAKDOWN',
  'clearAndPaintMainBackground();',
  'renderBaseWorldPasses();',
  'buildFramePlan()',
  'drawRenderableOrder(framePlan.order',
  'drawOverlayPasses({ source:',
  'drawHudPass({ source:'
]) {
  if (rendererRunBody.includes(forbidden)) errors.push(`${rendererRel}: runFramePipeline wrapper still contains pipeline implementation marker ${forbidden}`);
}
const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 24000) errors.push(`${ownerRel}: owner is ${ownerBytes} bytes; split before it becomes a new large node`);

if (errors.length) {
  console.error(JSON.stringify({ status: 'FAIL', ownerRel, rendererRel, ownerBytes, errors, warnings }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', ownerRel, rendererRel, ownerBytes, errors, warnings }, null, 2));
