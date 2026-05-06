#!/usr/bin/env node
/* P11c-6 Canvas2D overlay/HUD pass boundary check. */
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
    .map((entry) => entry.name).sort();
}
function requireBefore(source, before, after, htmlRel) {
  const b = source.indexOf(before);
  const a = source.indexOf(after);
  if (a < 0) return;
  if (b < 0) errors.push(`${htmlRel}: missing ${before}`);
  else if (b > a) errors.push(`${htmlRel}: ${before} must load before ${after}`);
}
function body(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return '';
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(brace + 1, i);
    }
  }
  return source.slice(brace + 1);
}
const ownerRel = 'src/presentation/render/renderer/canvas2d-overlay-hud-pass.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
for (const rel of [ownerRel, rendererRel]) if (!exists(rel)) errors.push(`missing required file: ${rel}`);
const owner = exists(ownerRel) ? read(ownerRel) : '';
const renderer = exists(rendererRel) ? read(rendererRel) : '';
for (const htmlRel of htmlFiles()) {
  const source = read(htmlRel);
  requireBefore(source, ownerRel, rendererRel, htmlRel);
}
for (const symbol of [
  'window.__CANVAS2D_OVERLAY_HUD_PASS__',
  'renderer.canvas2dOverlayHudPass',
  'renderer.diagnostics.canvas2dOverlayHudPass',
  'drawOverlayPasses',
  'drawHudPass'
]) if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing API symbol ${symbol}`);
if (!renderer.includes('requireCanvas2dOverlayHudPassApi') || !renderer.includes('__CANVAS2D_OVERLAY_HUD_PASS__')) errors.push(`${rendererRel}: must delegate to overlay/HUD owner`);
if (!renderer.includes('renderer.canvas2dOverlayHudPass')) errors.push(`${rendererRel}: must resolve overlay/HUD owner through namespace path`);
if (!renderer.includes('createCanvas2dOverlayHudPassDepsForRenderer')) errors.push(`${rendererRel}: must inject overlay/HUD deps`);
for (const fn of ['drawOverlayPasses', 'drawHudPass']) {
  const fnBody = body(renderer, fn);
  if (!/requireCanvas2dOverlayHudPassApi\(\)/.test(fnBody)) errors.push(`${rendererRel}: ${fn} must be a thin owner delegation`);
  if (/drawSelectedInstanceHighlight\(|refreshInspectorPanels\(|ctx\.fillText\(|renderLightingGlow\(/.test(fnBody)) errors.push(`${rendererRel}: ${fn} still contains inline overlay/HUD implementation`);
}
for (const item of [
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\blocalStorage\b/, reason: 'storage access' },
  { pattern: /typeof\s+ctx\s*!==|typeof\s+editor\s*!==|typeof\s+settings\s*!==|typeof\s+instances\s*!==|typeof\s+boxes\s*!==|typeof\s+player\s*!==|typeof\s+debugState\s*!==/, reason: 'renderer global access instead of dependency injection' }
]) if (item.pattern.test(owner)) errors.push(`${ownerRel}: forbidden ${item.reason}`);
const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 14000) warnings.push(`${ownerRel}: owner is ${ownerBytes} bytes; split if it grows beyond overlay/HUD pass`);
const report = { status: errors.length ? 'FAIL' : 'PASS', ownerRel, rendererRel, ownerBytes, errors, warnings };
console.log(JSON.stringify(report, null, 2));
process.exit(errors.length ? 1 : 0);
