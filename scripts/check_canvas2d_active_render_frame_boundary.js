#!/usr/bin/env node
/*
 * P11c-8 Canvas2D active render frame boundary check.
 * Ensures renderFrame active-call profiling/debug glue is owned by
 * canvas2d-active-render-frame.js and canvas2d-renderer.js only delegates.
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

const ownerRel = 'src/presentation/render/renderer/canvas2d-active-render-frame.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
const pipelineRel = 'src/presentation/render/renderer/canvas2d-frame-pipeline.js';
for (const rel of [ownerRel, rendererRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const owner = exists(ownerRel) ? read(ownerRel) : '';
const renderer = exists(rendererRel) ? read(rendererRel) : '';
for (const htmlRel of htmlFiles()) {
  const source = read(htmlRel);
  requireBefore(source, pipelineRel, ownerRel, htmlRel);
  requireBefore(source, ownerRel, rendererRel, htmlRel);
}

for (const symbol of [
  'window.__CANVAS2D_ACTIVE_RENDER_FRAME__',
  'renderer.canvas2dActiveRenderFrame',
  'renderer.diagnostics.canvas2dActiveRenderFrame',
  'function renderFrame(adapterApi, deps, meta)',
  'beginRenderFrameDebug',
  'renderer.canvas2d:renderFrame',
  '__lastActiveBreakdown',
  'updateInteractionCapture',
  'activeWrapperGlueWallMs'
]) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing active-render-frame symbol ${symbol}`);
}

if (!renderer.includes('requireCanvas2dActiveRenderFrameApi') || !renderer.includes('__CANVAS2D_ACTIVE_RENDER_FRAME__')) {
  errors.push(`${rendererRel}: must delegate to Canvas2D active render frame owner`);
}
if (!renderer.includes('createCanvas2dActiveRenderFrameDepsForRenderer')) {
  errors.push(`${rendererRel}: must expose explicit dependency injection for active render frame owner`);
}
const rendererBody = extractNamedFunctionBody(renderer, 'renderFrame');
if (!rendererBody.includes('requireCanvas2dActiveRenderFrameApi().renderFrame')) {
  errors.push(`${rendererRel}: renderFrame must be a thin wrapper delegating to owner`);
}
for (const forbidden of [
  'beginRenderFrameDebug(',
  'activeDebugHookWallMs',
  'activeWrapperGlueWallMs',
  '__lastActiveBreakdown =',
  'renderer-adapter:start frame=',
  'renderer-adapter:done frame=',
  'runFramePipeline(passApi, renderablesApi)'
]) {
  if (rendererBody.includes(forbidden)) errors.push(`${rendererRel}: renderFrame wrapper still contains active implementation marker ${forbidden}`);
}
const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 22000) errors.push(`${ownerRel}: owner is ${ownerBytes} bytes; split before it becomes a new large node`);

if (errors.length) {
  console.error(JSON.stringify({ status: 'FAIL', ownerRel, rendererRel, ownerBytes, errors, warnings }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', ownerRel, rendererRel, ownerBytes, errors, warnings }, null, 2));
