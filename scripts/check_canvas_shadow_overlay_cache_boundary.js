#!/usr/bin/env node
/*
 * P11a-4 canvas shadow overlay projection/cache boundary check.
 * Verifies that shadow overlay projection/cache helpers are owned by
 * presentation/render/renderer/canvas2d-shadow-overlay-cache.js and that
 * render.js delegates through thin compatibility wrappers.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function idx(source, needle) { return source.indexOf(needle); }
function bodyOf(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

const overlayRel = 'src/presentation/render/renderer/canvas2d-shadow-overlays.js';
const cacheRel = 'src/presentation/render/renderer/canvas2d-shadow-overlay-cache.js';
const renderRel = 'src/presentation/render/render.js';

if (!exists(cacheRel)) errors.push(`missing ${cacheRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);

const cacheSource = exists(cacheRel) ? read(cacheRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  const overlayIdx = idx(source, overlayRel);
  const cacheIdx = idx(source, cacheRel);
  const renderIdx = idx(source, renderRel);
  if (renderIdx >= 0 && cacheIdx < 0) errors.push(`${htmlRel}: missing ${cacheRel} before render.js`);
  if (renderIdx >= 0 && cacheIdx > renderIdx) errors.push(`${htmlRel}: ${cacheRel} must load before ${renderRel}`);
  if (cacheIdx >= 0 && overlayIdx >= 0 && overlayIdx > cacheIdx) warnings.push(`${htmlRel}: ${overlayRel} should normally load before ${cacheRel}`);
}

if (!cacheSource.includes("layer: 'presentation/render/renderer'")) errors.push(`${cacheRel}: must identify presentation/render/renderer layer`);
if (!cacheSource.includes("phase: 'P11a-4'")) errors.push(`${cacheRel}: must identify P11a-4 phase`);

for (const forbidden of ['localStorage', 'sessionStorage', 'fetch(', 'document.', 'new Image', 'staticBoxRenderCache', 'buildRenderables', 'buildMainFrameRenderables']) {
  if (cacheSource.includes(forbidden)) errors.push(`${cacheRel}: must not contain ${forbidden}`);
}

for (const required of [
  'iso',
  'screenPointsFromWorldFaceNoCamera',
  'collectProjectedShadowPolysForReceiver',
  'noteShadowOverlayCache',
  'cameraSignatureForDebug'
]) {
  if (!cacheSource.includes(required)) errors.push(`${cacheRel}: missing injected dependency usage ${required}`);
}

for (const marker of [
  'function requireCanvas2dShadowOverlayCacheForRender()',
  'function createCanvas2dShadowOverlayCacheDepsForRender()',
  'P11a-4 note: shadow overlay projection/cache helpers are delegated'
]) {
  if (!renderSource.includes(marker)) errors.push(`${renderRel}: missing cache boundary marker ${marker}`);
}

for (const fn of [
  'worldShadowOverlaysToScreen',
  'worldShadowOverlaysToNoCamera',
  'shiftShadowOverlays',
  'currentShadowOverlaySignature',
  'voxelFaceShadowCacheKey',
  'cloneWorldShadowOverlays',
  'getVoxelFaceShadowWorldOverlays',
  'buildVoxelFaceShadowWorldOverlays',
  'buildVoxelFaceShadowOverlays'
]) {
  const body = bodyOf(renderSource, fn);
  if (!body) {
    errors.push(`${renderRel}: missing ${fn}`);
  } else if (!body.includes('requireCanvas2dShadowOverlayCacheForRender()')) {
    errors.push(`${renderRel}: ${fn} must delegate to ${cacheRel}`);
  }
}

for (const item of [
  { snippet: 'var voxelFaceShadowOverlayCache = { sig:', reason: 'shadow overlay cache state belongs in cache owner' },
  { snippet: 'collectProjectedShadowPolysForReceiver(facePts, normal, ownerInstanceId);', reason: 'collector call belongs behind cache owner dependency injection' },
  { snippet: 'clipPoly: (overlay.clipWorldPts || null) ? overlay.clipWorldPts.map(function (p) { return iso(p.x, p.y, p.z); }) : null', reason: 'screen projection body belongs in cache owner' }
]) {
  if (renderSource.includes(item.snippet)) errors.push(`${renderRel}: ${item.reason}`);
}

const report = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
