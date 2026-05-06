#!/usr/bin/env node
/* P11a-6 static renderable color/cache boundary smoke test. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rel = 'src/presentation/render/renderables/static-renderable-color-cache.js';
const renderRel = 'src/presentation/render/render.js';
const indexRel = 'index.html';
const source = fs.readFileSync(path.join(root, rel), 'utf8');
const renderSource = fs.readFileSync(path.join(root, renderRel), 'utf8');
const indexSource = fs.readFileSync(path.join(root, indexRel), 'utf8');

function bodyOf(src, functionName) {
  const start = src.indexOf(`function ${functionName}(`);
  if (start < 0) return '';
  const open = src.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return '';
}

assert(indexSource.indexOf(rel) >= 0, 'index.html must load static color cache owner');
assert(indexSource.indexOf(rel) < indexSource.indexOf(renderRel), 'color cache owner must load before render.js');
assert(source.includes("layer: 'presentation/render/renderables'"), 'module must identify presentation/render/renderables layer');
assert(source.includes("phase: 'P11a-6'"), 'module must identify P11a-6 phase');

for (const forbidden of ['localStorage', 'sessionStorage', 'fetch(', 'document.', 'canvas', 'ctx.', 'new Image', 'buildMainFrameRenderables']) {
  assert(!source.includes(forbidden), `${rel} must not contain ${forbidden}`);
}

for (const marker of [
  'function requireStaticRenderableColorCacheForRender()',
  'function createStaticRenderableColorCacheDepsForRender()',
  'P11a-6 note: static renderable color mode, lighting signature, and fill'
]) {
  assert(renderSource.includes(marker), `render.js missing color cache delegation marker ${marker}`);
}

for (const fn of [
  'getCachedBaseFaceColorsForRenderable',
  'rgbToCssCachedForRenderable',
  'getStaticRenderableBuildColorModeForRender',
  'isStaticRenderableLightingActiveForBuild',
  'getStaticRenderableBuildLightingSignature',
  'getStaticRenderableActualColorPathUsed',
  'getCachedStaticRenderableFill'
]) {
  const body = bodyOf(renderSource, fn);
  assert(body.includes('requireStaticRenderableColorCacheForRender()'), `${fn} must delegate to color cache owner`);
}
assert(!renderSource.includes('var __staticRenderableBaseFaceColorCache = new Map()'), 'render.js must not own base face color cache');
assert(!renderSource.includes('var __staticRenderableCssCache = new Map()'), 'render.js must not own CSS cache');
assert(!bodyOf(renderSource, 'getCachedStaticRenderableFill').includes('scope.map.set(meta.key'), 'render.js wrapper must not own fill cache miss body');

const sandbox = { console, Math, Map, Number, String, Object, Error };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: rel });
const api = sandbox.IsometricStaticRenderableColorCache;
assert(api, 'color cache API should be exported');
for (const fn of [
  'getCachedBaseFaceColorsForRenderable',
  'rgbToCssCachedForRenderable',
  'getStaticRenderableBuildColorModeForRender',
  'isStaticRenderableLightingActiveForBuild',
  'getStaticRenderableBuildLightingSignature',
  'getStaticRenderableActualColorPathUsed',
  'getCachedStaticRenderableFill'
]) {
  assert.strictEqual(typeof api[fn], 'function', `missing ${fn}`);
}

let perf = 0;
let litCalls = 0;
const deps = {
  perfNow() { perf += 0.05; return perf; },
  baseFaceColors(base) { return { top: { r: 10, g: 20, b: 30 }, side: { r: 4, g: 5, b: 6 }, line: '#000' }; },
  rgbToCss(rgb, a) { return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`; },
  getTerrainRenderSettingsForRender() { return { terrainBuildColorMode: 'natural', terrainBuildLightingBypass: false }; },
  getLightStateForRender() { return { enabled: true }; },
  staticBoxLightingSignature() { return 'lighting:test'; },
  getTerrainMaterialIdForRenderCell(cell) { return cell && cell.materialType || null; },
  getTerrainMaterialBaseFaceColorsForRenderCell() { return null; },
  getBaseFaceFillRgbForSemanticFace(fc, face) { return face === 'top' ? fc.top : fc.side; },
  litFaceColor(rgb) { litCalls += 1; return { r: rgb.r + 1, g: rgb.g + 1, b: rgb.b + 1 }; }
};

assert.strictEqual(api.getStaticRenderableBuildColorModeForRender(null, deps), 'natural', 'color mode should use injected settings');
assert.strictEqual(api.getStaticRenderableBuildLightingSignature(null, deps), 'lighting:test', 'lighting signature should use injected lighting dependency');
assert.strictEqual(api.getStaticRenderableActualColorPathUsed(null, deps), 'natural+lighting', 'actual color path should include lighting');

const stats = {
  step4a_colorCacheLookupMs: 0,
  colorCacheHitCount: 0,
  colorKeyUsage: new Map(),
  actualColorPathUsedCounts: new Map(),
  step4b_colorCacheHitFastPathMs: 0,
  touchedColorCachePath: false,
  step4c_colorMissPathMs: 0,
  colorCacheMissCount: 0,
  miss_step1_paletteLookupMs: 0,
  miss_step2_heightBucketMs: 0,
  miss_step3_materialColorMs: 0,
  miss_step4_lightingMixMs: 0,
  miss_step5_cssOrObjectBuildMs: 0,
  touchedNaturalColorPath: false,
  touchedLightingPath: false
};
const cell = { x: 1, y: 2, z: 3, base: '#abc', materialType: 'grass', instanceId: 'i1' };
const first = api.getCachedStaticRenderableFill(cell, 'top', [{ x: 0, y: 0, z: 0 }], { x: 0, y: 0, z: 1 }, 0, stats, deps);
assert.strictEqual(first.cacheHit, false, 'first fill lookup should miss');
assert.strictEqual(first.fill, 'rgba(11,21,31,1)', 'fill should include injected lighting mix and css conversion');
const second = api.getCachedStaticRenderableFill(cell, 'top', [{ x: 0, y: 0, z: 0 }], { x: 0, y: 0, z: 1 }, 0, stats, deps);
assert.strictEqual(second.cacheHit, true, 'second fill lookup should hit');
assert.strictEqual(second.fill, first.fill, 'cached fill should be stable');
assert.strictEqual(litCalls, 1, 'lighting should only run on miss path');
assert(stats.colorCacheHitCount >= 1, 'hit count should be tracked');
assert(stats.colorCacheMissCount >= 1, 'miss count should be tracked');

console.log('PASS static-renderable-color-cache-boundary');
