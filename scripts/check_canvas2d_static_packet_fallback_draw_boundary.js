#!/usr/bin/env node
/*
 * P11c-4 Canvas2D static packet fallback draw boundary check.
 * Ensures fallback static packet run drawing/stats ownership is outside
 * canvas2d-renderer.js and isolated in canvas2d-static-packet-fallback-draw.js.
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

const ownerRel = 'src/presentation/render/renderer/canvas2d-static-packet-fallback-draw.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
const bitmapOwnerRel = 'src/presentation/render/renderer/canvas2d-static-bitmap-run-cache.js';
for (const rel of [ownerRel, rendererRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const owner = exists(ownerRel) ? read(ownerRel) : '';
const renderer = exists(rendererRel) ? read(rendererRel) : '';
for (const htmlRel of htmlFiles()) {
  const source = read(htmlRel);
  requireBefore(source, ownerRel, rendererRel, htmlRel);
  requireBefore(source, bitmapOwnerRel, ownerRel, htmlRel);
}

for (const symbol of [
  'window.__CANVAS2D_STATIC_PACKET_FALLBACK_DRAW__',
  'renderer.canvas2dStaticPacketFallbackDraw',
  'renderer.diagnostics.canvas2dStaticPacketFallbackDraw',
  'ensureStats',
  'prepareStaticPacketForFallbackDraw',
  'accumulateStaticPacketFallbackCacheStats',
  'buildSlowRenderablePayload',
  'drawStaticPacketRunFallback'
]) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing fallback draw API symbol ${symbol}`);
}

if (!renderer.includes('requireCanvas2dStaticPacketFallbackDrawApi') || !renderer.includes('__CANVAS2D_STATIC_PACKET_FALLBACK_DRAW__')) {
  errors.push(`${rendererRel}: must delegate to Canvas2D static packet fallback draw owner`);
}
if (!renderer.includes('renderer.canvas2dStaticPacketFallbackDraw')) {
  errors.push(`${rendererRel}: must resolve static packet fallback draw owner through namespace path`);
}
if (!renderer.includes('createCanvas2dStaticPacketFallbackDrawDepsForRenderer')) {
  errors.push(`${rendererRel}: must inject renderer dependencies into static packet fallback draw owner`);
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
const fallbackBody = extractNamedFunctionBody(renderer, 'drawStaticPacketRunFallback');
const forbiddenBodies = [
  { pattern: /for\s*\(var\s+i\s*=\s*0;\s*i\s*<\s*packets\.length;[\s\S]*?drawStaticWorldFacePacket/s, reason: 'inline fallback packet draw loop body' },
  { pattern: /staticPacketGeometryCacheHitCount[\s\S]*?staticPacketOverlayCacheMissCount/s, reason: 'inline fallback cache stats aggregation body' },
  { pattern: /trackSlowRenderable\s*\(\s*{[\s\S]*?safeFixed\(renderableMs\)/s, reason: 'inline fallback slow-renderable payload body' },
];
for (const item of forbiddenBodies) {
  if (item.pattern.test(fallbackBody)) errors.push(`${rendererRel}: ${item.reason} must live in ${ownerRel}`);
}

const ownerForbidden = [
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\blocalStorage\b/, reason: 'storage access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /\bVIEW_W\b|\bVIEW_H\b|typeof\s+camera|window\.camera|typeof\s+canvas|window\.canvas|typeof\s+ctx|window\.ctx|typeof\s+settings|window\.settings/, reason: 'renderer global access instead of dependency injection' },
  { pattern: /typeof\s+drawStaticWorldFacePacket|typeof\s+drawFaceDebugOverlayRenderable/, reason: 'renderer function global access instead of dependency injection' },
];
for (const item of ownerForbidden) {
  if (item.pattern.test(owner)) errors.push(`${ownerRel}: forbidden ${item.reason}`);
}

const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 12000) warnings.push(`${ownerRel}: owner is ${ownerBytes} bytes; keep it limited to fallback packet draw/stats and split if it grows`);

const report = { status: errors.length === 0 ? 'PASS' : 'FAIL', ownerRel, rendererRel, ownerBytes, checkedHtmlEntries: htmlFiles(), errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
