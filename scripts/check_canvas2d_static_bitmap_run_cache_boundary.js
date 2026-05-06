#!/usr/bin/env node
/*
 * P11c-3 Canvas2D static bitmap run cache boundary check.
 * Ensures static bitmap run cache/reuse/build/draw ownership is outside
 * canvas2d-renderer.js and isolated in canvas2d-static-bitmap-run-cache.js.
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

const ownerRel = 'src/presentation/render/renderer/canvas2d-static-bitmap-run-cache.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
for (const rel of [ownerRel, rendererRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const owner = exists(ownerRel) ? read(ownerRel) : '';
const renderer = exists(rendererRel) ? read(rendererRel) : '';
for (const htmlRel of htmlFiles()) {
  const source = read(htmlRel);
  requireBefore(source, ownerRel, rendererRel, htmlRel);
}

for (const symbol of [
  'window.__CANVAS2D_STATIC_BITMAP_RUN_CACHE__',
  'renderer.canvas2dStaticBitmapRunCache',
  'renderer.diagnostics.canvas2dStaticBitmapRunCache',
  'getStaticBitmapCache',
  'getStaticBitmapReuseCache',
  'getStaticBitmapInteractionState',
  'buildStaticPacketRunReuseKey',
  'buildStaticPacketRunBitmapSignature',
  'registerStaticPacketRunBitmapEntry',
  'findReusableStaticPacketRunBitmapEntry',
  'collectStaticPacketRunGeometry',
  'buildStaticPacketRunBitmap',
  'drawStaticPacketRunBitmapEntry',
  'drawStaticPacketRunBitmap'
]) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing static bitmap run API symbol ${symbol}`);
}

if (!renderer.includes('requireCanvas2dStaticBitmapRunCacheApi') || !renderer.includes('__CANVAS2D_STATIC_BITMAP_RUN_CACHE__')) {
  errors.push(`${rendererRel}: must delegate to Canvas2D static bitmap run cache owner`);
}
if (!renderer.includes('renderer.canvas2dStaticBitmapRunCache')) {
  errors.push(`${rendererRel}: must resolve static bitmap run cache owner through namespace path`);
}
if (!renderer.includes('createCanvas2dStaticBitmapRunCacheDepsForRenderer')) {
  errors.push(`${rendererRel}: must inject renderer dependencies into static bitmap run cache owner`);
}

const forbiddenBodies = [
  { pattern: /function\s+getStaticBitmapCache\s*\([^)]*\)\s*{[^}]*__staticBitmapCache\s*=\s*adapterApi\.__staticBitmapCache/s, reason: 'static bitmap cache allocation body' },
  { pattern: /function\s+getStaticBitmapReuseCache\s*\([^)]*\)\s*{[^}]*__staticBitmapReuseCache\s*=\s*adapterApi\.__staticBitmapReuseCache/s, reason: 'static bitmap reuse cache allocation body' },
  { pattern: /function\s+getStaticBitmapInteractionState\s*\([^)]*\)\s*{[^}]*__staticBitmapInteractionState\s*=\s*adapterApi\.__staticBitmapInteractionState/s, reason: 'static bitmap interaction state allocation body' },
  { pattern: /function\s+buildStaticPacketRunReuseKey\s*\([^)]*\)\s*{[^}]*2166136261[^}]*worldOutlineSegments/s, reason: 'static packet run reuse hash body' },
  { pattern: /function\s+collectStaticPacketRunGeometry\s*\([^)]*\)\s*{[^}]*projectedPackets[^}]*pointsNoCamera/s, reason: 'static packet run geometry collection body' },
  { pattern: /function\s+buildStaticPacketRunBitmap\s*\([^)]*\)\s*{[^}]*createRendererOffscreenCanvas[^}]*projectedPackets/s, reason: 'static packet run bitmap build body' },
  { pattern: /function\s+drawStaticPacketRunBitmapEntry\s*\([^)]*\)\s*{[^}]*drawImage\(entry\.bitmap[^}]*interaction-reuse/s, reason: 'static packet run bitmap entry draw body' },
  { pattern: /function\s+drawStaticPacketRunBitmap\s*\([^)]*\)\s*{[^}]*findReusableStaticPacketRunBitmapEntry[^}]*staticBitmapRunCacheMissCount/s, reason: 'static packet run bitmap cache/reuse orchestration body' },
];
for (const item of forbiddenBodies) {
  if (item.pattern.test(renderer)) errors.push(`${rendererRel}: ${item.reason} must live in ${ownerRel}`);
}

const ownerForbidden = [
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\blocalStorage\b/, reason: 'storage access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /\bwindow\.__habbo/, reason: 'camera interaction global state access' },
  { pattern: /\bVIEW_W\b|\bVIEW_H\b|typeof\s+camera|window\.camera|typeof\s+canvas|window\.canvas|typeof\s+ctx|window\.ctx|typeof\s+settings|window\.settings/, reason: 'renderer global access instead of dependency injection' },
];
for (const item of ownerForbidden) {
  if (item.pattern.test(owner)) errors.push(`${ownerRel}: forbidden ${item.reason}`);
}

const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 30000) warnings.push(`${ownerRel}: owner is ${ownerBytes} bytes; keep this as a single-domain file and split if it grows beyond bitmap run cache/reuse/build/draw`);

const report = { status: errors.length === 0 ? 'PASS' : 'FAIL', ownerRel, rendererRel, ownerBytes, checkedHtmlEntries: htmlFiles(), errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
