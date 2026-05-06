#!/usr/bin/env node
/*
 * P11c-2 Canvas2D zoom preview state boundary check.
 * Ensures zoom preview snapshot/state/fast-path draw ownership is outside
 * canvas2d-renderer.js and isolated in canvas2d-zoom-preview-state.js.
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

const ownerRel = 'src/presentation/render/renderer/canvas2d-zoom-preview-state.js';
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
  'window.__CANVAS2D_ZOOM_PREVIEW_STATE__',
  'renderer.canvas2dZoomPreviewState',
  'renderer.diagnostics.canvas2dZoomPreview',
  'getZoomPreviewState',
  'clearZoomPreviewState',
  'captureZoomPreviewFrame',
  'updateZoomPreviewState',
  'shouldUseZoomPreviewFastPath',
  'drawZoomPreviewFastPath',
  'ZOOM-PREVIEW-FASTPATH'
]) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing zoom preview API symbol ${symbol}`);
}

if (!renderer.includes('requireCanvas2dZoomPreviewStateApi') || !renderer.includes('__CANVAS2D_ZOOM_PREVIEW_STATE__')) {
  errors.push(`${rendererRel}: must delegate to Canvas2D zoom preview state owner`);
}
if (!renderer.includes('renderer.canvas2dZoomPreviewState')) {
  errors.push(`${rendererRel}: must resolve zoom preview owner through namespace path`);
}

const forbiddenBodies = [
  { pattern: /function\s+getZoomPreviewState\s*\([^)]*\)\s*{[^}]*__zoomPreviewState\s*=\s*adapterApi\.__zoomPreviewState/s, reason: 'zoom preview state allocation body' },
  { pattern: /function\s+clearZoomPreviewState\s*\([^)]*\)\s*{[^}]*state\.snapshot\s*=\s*null[^}]*state\.expiresAt/s, reason: 'zoom preview state clear body' },
  { pattern: /function\s+captureZoomPreviewFrame\s*\([^)]*\)\s*{[^}]*drawImage\(canvas/s, reason: 'zoom preview frame capture body' },
  { pattern: /function\s+updateZoomPreviewState\s*\([^)]*\)\s*{[^}]*state\.targetZoom[^}]*state\.expiresAt/s, reason: 'zoom preview state update body' },
  { pattern: /function\s+shouldUseZoomPreviewFastPath\s*\([^)]*\)\s*{[^}]*expiresAt[^}]*debounce-expired/s, reason: 'zoom preview fast-path gating body' },
  { pattern: /function\s+drawZoomPreviewFastPath\s*\([^)]*\)\s*{[^}]*ctx\.save\(\)[^}]*ZOOM-PREVIEW-FASTPATH/s, reason: 'zoom preview fast-path draw body' },
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
  { pattern: /\bVIEW_W\b|\bVIEW_H\b|typeof\s+camera|window\.camera|typeof\s+canvas|window\.canvas|typeof\s+ctx|window\.ctx/, reason: 'renderer global access instead of dependency injection' },
];
for (const item of ownerForbidden) {
  if (item.pattern.test(owner)) errors.push(`${ownerRel}: forbidden ${item.reason}`);
}

const report = { status: errors.length === 0 ? 'PASS' : 'FAIL', ownerRel, rendererRel, checkedHtmlEntries: htmlFiles(), errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
