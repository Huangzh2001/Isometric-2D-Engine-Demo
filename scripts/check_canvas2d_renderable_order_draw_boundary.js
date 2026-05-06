#!/usr/bin/env node
/*
 * P11c-5 Canvas2D renderable order draw boundary check.
 * Ensures drawRenderableOrder loop/stats ownership is outside canvas2d-renderer.js
 * and isolated in canvas2d-renderable-order-draw.js.
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

const ownerRel = 'src/presentation/render/renderer/canvas2d-renderable-order-draw.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
const fallbackOwnerRel = 'src/presentation/render/renderer/canvas2d-static-packet-fallback-draw.js';
for (const rel of [ownerRel, rendererRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const owner = exists(ownerRel) ? read(ownerRel) : '';
const renderer = exists(rendererRel) ? read(rendererRel) : '';
for (const htmlRel of htmlFiles()) {
  const source = read(htmlRel);
  requireBefore(source, ownerRel, rendererRel, htmlRel);
  requireBefore(source, fallbackOwnerRel, ownerRel, htmlRel);
}

for (const symbol of [
  'window.__CANVAS2D_RENDERABLE_ORDER_DRAW__',
  'renderer.canvas2dRenderableOrderDraw',
  'renderer.diagnostics.canvas2dRenderableOrderDraw',
  'getRenderableKind',
  'getRenderableDrawPosition',
  'createCanvasTiming',
  'createStaticRunStats',
  'createDrawStats',
  'buildLoopBreakdown',
  'publishFrameDrawStats',
  'drawRenderableOrder'
]) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing renderable-order API symbol ${symbol}`);
}

if (!renderer.includes('requireCanvas2dRenderableOrderDrawApi') || !renderer.includes('__CANVAS2D_RENDERABLE_ORDER_DRAW__')) {
  errors.push(`${rendererRel}: must delegate to Canvas2D renderable-order draw owner`);
}
if (!renderer.includes('renderer.canvas2dRenderableOrderDraw')) {
  errors.push(`${rendererRel}: must resolve renderable-order draw owner through namespace path`);
}
if (!renderer.includes('createCanvas2dRenderableOrderDrawDepsForRenderer')) {
  errors.push(`${rendererRel}: must inject renderer dependencies into renderable-order draw owner`);
}

const drawBody = extractNamedFunctionBody(renderer, 'drawRenderableOrder');
const forbiddenBodies = [
  { pattern: /while\s*\(i\s*<\s*order\.length\)/, reason: 'inline renderable draw loop body' },
  { pattern: /wrapCanvasMethod\s*\(|canvasTiming\s*=\s*\{/, reason: 'inline canvas timing instrumentation body' },
  { pattern: /DRAW-LOOP-BREAKDOWN|__lastDrawLoopBreakdown|maybeLogFrameWorkBreakdown/, reason: 'inline draw-loop breakdown/profile publishing body' },
  { pattern: /recordDrawDiagnostic\s*\(\s*['"]main-render-draw-hit/, reason: 'inline main draw-hit diagnostic payload body' },
];
for (const item of forbiddenBodies) {
  if (item.pattern.test(drawBody)) errors.push(`${rendererRel}: ${item.reason} must live in ${ownerRel}`);
}

const ownerForbidden = [
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\blocalStorage\b/, reason: 'storage access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\bnew\s+Image\b|\bOffscreenCanvas\b/, reason: 'image/canvas allocation' },
  { pattern: /window\.ctx|typeof\s+camera|window\.camera|typeof\s+settings|window\.settings|typeof\s+canvas|window\.canvas|\bVIEW_W\b|\bVIEW_H\b/, reason: 'renderer global access instead of dependency injection' },
  { pattern: /typeof\s+drawStaticPacketRunBitmap|typeof\s+drawStaticPacketRunFallback|typeof\s+drawCachedVoxelRenderable|typeof\s+drawFaceDebugOverlayRenderable|typeof\s+detailLog/, reason: 'renderer function global access instead of dependency injection' },
];
for (const item of ownerForbidden) {
  if (item.pattern.test(owner)) errors.push(`${ownerRel}: forbidden ${item.reason}`);
}

const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 28000) warnings.push(`${ownerRel}: owner is ${ownerBytes} bytes; keep it limited to renderable-order draw/stats and split if it grows`);

const report = { status: errors.length === 0 ? 'PASS' : 'FAIL', ownerRel, rendererRel, ownerBytes, checkedHtmlEntries: htmlFiles(), errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
