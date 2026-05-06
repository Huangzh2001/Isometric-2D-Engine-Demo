#!/usr/bin/env node
/*
 * P11a-6 static renderable color/cache boundary check.
 * Verifies that static renderable color/lighting cache helpers are owned by
 * presentation/render/renderables/static-renderable-color-cache.js and that
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

const ownerRel = 'src/presentation/render/renderables/static-renderable-color-cache.js';
const renderRel = 'src/presentation/render/render.js';

if (!exists(ownerRel)) errors.push(`missing ${ownerRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);

const ownerSource = exists(ownerRel) ? read(ownerRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  const ownerIdx = idx(source, ownerRel);
  const renderIdx = idx(source, renderRel);
  if (renderIdx >= 0 && ownerIdx < 0) errors.push(`${htmlRel}: missing ${ownerRel} before render.js`);
  if (renderIdx >= 0 && ownerIdx > renderIdx) errors.push(`${htmlRel}: ${ownerRel} must load before ${renderRel}`);
}

if (!ownerSource.includes("layer: 'presentation/render/renderables'")) errors.push(`${ownerRel}: must identify presentation/render/renderables layer`);
if (!ownerSource.includes("phase: 'P11a-6'")) errors.push(`${ownerRel}: must identify P11a-6 phase`);

for (const forbidden of [
  'localStorage',
  'sessionStorage',
  'fetch(',
  'document.',
  'canvas',
  'ctx.',
  'new Image',
  'buildMainFrameRenderables',
  'staticBoxRenderCache'
]) {
  if (ownerSource.includes(forbidden)) errors.push(`${ownerRel}: must not contain ${forbidden}`);
}

for (const required of [
  'baseFaceColors',
  'rgbToCss',
  'getTerrainRenderSettingsForRender',
  'getLightStateForRender',
  'staticBoxLightingSignature',
  'getTerrainMaterialIdForRenderCell',
  'getTerrainMaterialBaseFaceColorsForRenderCell',
  'getBaseFaceFillRgbForSemanticFace',
  'litFaceColor'
]) {
  if (!ownerSource.includes(required)) errors.push(`${ownerRel}: missing injected dependency usage ${required}`);
}

for (const marker of [
  'function requireStaticRenderableColorCacheForRender()',
  'function createStaticRenderableColorCacheDepsForRender()',
  'P11a-6 note: static renderable color mode, lighting signature, and fill'
]) {
  if (!renderSource.includes(marker)) errors.push(`${renderRel}: missing color-cache boundary marker ${marker}`);
}

for (const fn of [
  'getCachedBaseFaceColorsForRenderable',
  'rgbToCssCachedForRenderable',
  'getStaticRenderableBuildColorModeForRender',
  'isStaticRenderableBuildLightingBypassEnabled',
  'isStaticRenderableLightingUiEnabledForBuild',
  'isStaticRenderableLightingActiveForBuild',
  'getStaticRenderableBuildLightingSignature',
  'getStaticRenderableActualColorPathUsed',
  'getStaticRenderableFlatDebugFillRgb',
  'getStaticRenderableColorScopeSignature',
  'ensureStaticRenderableColorCacheScope',
  'getStaticRenderableColorCacheMeta',
  'getCachedStaticRenderableFill'
]) {
  const body = bodyOf(renderSource, fn);
  if (!body) {
    errors.push(`${renderRel}: missing ${fn}`);
  } else if (!body.includes('requireStaticRenderableColorCacheForRender()')) {
    errors.push(`${renderRel}: ${fn} must delegate to ${ownerRel}`);
  }
}

const wrapperOwnershipChecks = [
  { fn: 'getCachedBaseFaceColorsForRenderable', snippet: '__staticRenderableBaseFaceColorCache', reason: 'base face color cache belongs in color cache owner' },
  { fn: 'rgbToCssCachedForRenderable', snippet: '__staticRenderableCssCache', reason: 'CSS cache belongs in color cache owner' },
  { fn: 'getStaticRenderableFlatDebugFillRgb', snippet: "if (face === 'top') return { r: 110", reason: 'debug fill palette belongs in color cache owner' },
  { fn: 'getCachedStaticRenderableFill', snippet: 'scope.map.set(meta.key', reason: 'fill cache miss body belongs in color cache owner' },
  { fn: 'getCachedStaticRenderableFill', snippet: 'litFaceColor(fillBaseRgb', reason: 'lighting mix body belongs in color cache owner' }
];
for (const item of wrapperOwnershipChecks) {
  const body = bodyOf(renderSource, item.fn);
  if (body.includes(item.snippet)) errors.push(`${renderRel}: ${item.fn}: ${item.reason}`);
}

for (const forbiddenGlobal of [
  'var __staticRenderableBaseFaceColorCache = new Map()',
  'var __staticRenderableCssCache = new Map()',
  'var __staticRenderableColorCacheState = { scopeSignature:'
]) {
  if (renderSource.includes(forbiddenGlobal)) errors.push(`${renderRel}: must not own ${forbiddenGlobal}`);
}

const report = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
