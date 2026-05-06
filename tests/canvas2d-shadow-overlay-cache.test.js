#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function indexOfOrFail(source, needle) {
  const idx = source.indexOf(needle);
  assert(idx >= 0, `missing ${needle}`);
  return idx;
}
function bodyOf(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert(start >= 0, `missing function ${functionName}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`unterminated function ${functionName}`);
}

const cacheRel = 'src/presentation/render/renderer/canvas2d-shadow-overlay-cache.js';
const overlayRel = 'src/presentation/render/renderer/canvas2d-shadow-overlays.js';
const renderRel = 'src/presentation/render/render.js';
const indexRel = 'index.html';

const cacheSource = read(cacheRel);
const renderSource = read(renderRel);
const indexSource = read(indexRel);

assert(cacheSource.includes("layer: 'presentation/render/renderer'"), 'cache module must declare presentation/renderer layer');
assert(cacheSource.includes("phase: 'P11a-4'"), 'cache module must declare P11a-4 phase');
assert(indexOfOrFail(indexSource, overlayRel) < indexOfOrFail(indexSource, cacheRel), 'cache should load after shadow overlay draw module');
assert(indexOfOrFail(indexSource, cacheRel) < indexOfOrFail(indexSource, renderRel), 'cache must load before render.js');

for (const forbidden of ['localStorage', 'sessionStorage', 'fetch(', 'document.', 'new Image', 'staticBoxRenderCache', 'buildMainFrameRenderables']) {
  assert(!cacheSource.includes(forbidden), `${cacheRel} must not contain ${forbidden}`);
}

for (const marker of [
  'function requireCanvas2dShadowOverlayCacheForRender()',
  'function createCanvas2dShadowOverlayCacheDepsForRender()',
  'P11a-4 note: shadow overlay projection/cache helpers are delegated',
  'requireCanvas2dShadowOverlayCacheForRender().worldShadowOverlaysToScreen',
  'requireCanvas2dShadowOverlayCacheForRender().worldShadowOverlaysToNoCamera',
  'requireCanvas2dShadowOverlayCacheForRender().getVoxelFaceShadowWorldOverlays'
]) {
  assert(renderSource.includes(marker), `render.js missing cache delegation marker ${marker}`);
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
  assert(bodyOf(renderSource, fn).includes('requireCanvas2dShadowOverlayCacheForRender()'), `${fn} must be a thin cache delegation wrapper`);
}

assert(!renderSource.includes('var voxelFaceShadowOverlayCache = { sig:'), 'render.js must not own shadow overlay cache state');
assert(!renderSource.includes('collectProjectedShadowPolysForReceiver(facePts, normal, ownerInstanceId);'), 'render.js must not call projected shadow collector directly');

const sandbox = { console, Map, Date };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(cacheSource, sandbox, { filename: cacheRel });
const api = sandbox.IsometricCanvas2dShadowOverlayCache;
assert(api, 'cache API should be exported');
for (const fn of [
  'worldShadowOverlaysToScreen',
  'worldShadowOverlaysToNoCamera',
  'shiftShadowOverlays',
  'currentShadowOverlaySignature',
  'voxelFaceShadowCacheKey',
  'cloneWorldShadowOverlays',
  'getVoxelFaceShadowWorldOverlays',
  'buildVoxelFaceShadowOverlays',
  'resetShadowOverlayCacheForTests'
]) {
  assert.strictEqual(typeof api[fn], 'function', `missing ${fn}`);
}

const calls = [];
let now = 0;
const deps = {
  iso(x, y, z) { return { x: x * 10 + z, y: y * 10 - z }; },
  screenPointsFromWorldFaceNoCamera(points, rotation) {
    calls.push(['projectNoCamera', rotation, points.length]);
    return points.map((p) => ({ x: p.x + rotation, y: p.y - rotation }));
  },
  perfNow() { now += 1; return now; },
  boxesShadowSignature() { return 'boxes:a'; },
  boxes: [{ id: 'a' }],
  lightState: {
    showShadows: true,
    shadowDistanceFadeEnabled: true,
    shadowDistanceFadeRate: 0.5,
    shadowDistanceFadeMin: 0.1,
    shadowEdgeFadeEnabled: false,
    shadowEdgeFadePx: 3
  },
  isLightingSystemEnabled() { return true; },
  getLightingRenderLights() { return [{ id: 'sun', x: 1, y: 2, z: 3, intensity: 0.7 }]; },
  noteShadowOverlayCache(kind, payload) { calls.push(['cache', kind, payload.overlayCount || 0]); },
  dbgSimpleHash(value) { return `h:${value.length}`; },
  cameraSignatureForDebug() { return 'camera:a'; },
  collectProjectedShadowPolysForReceiver(facePts, normal, owner) {
    calls.push(['collect', owner, facePts.length, normal.z]);
    return [{
      alpha: 0.4,
      baseAlpha: 0.5,
      worldPolys: [[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }]],
      clipWorldPts: [{ x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }, { x: 1, y: 1, z: 1 }],
      receiverKind: 'top',
      owner,
      lightType: 'sun'
    }];
  }
};

const overlays = deps.collectProjectedShadowPolysForReceiver([{ x: 0, y: 0, z: 0 }], { z: 1 }, 'manual');
const screen = api.worldShadowOverlaysToScreen(overlays, deps);
assert.strictEqual(screen[0].polys[0][1].x, 10, 'world shadow polys should project through injected iso');
assert.strictEqual(screen[0].clipPoly[0].x, 1, 'clip world points should project through injected iso');

const noCamera = api.worldShadowOverlaysToNoCamera(overlays, 2, deps);
assert.strictEqual(noCamera[0].polysNoCamera[0][0].x, 2, 'no-camera projection should use injected projector');
assert(calls.some((call) => call[0] === 'projectNoCamera' && call[1] === 2), 'projector should be called');

const shifted = api.shiftShadowOverlays([{ alpha: 1, clipPoly: [{ x: 1, y: 2 }], polys: [[{ x: 3, y: 4 }]] }], 5, -1);
assert.strictEqual(shifted[0].clipPoly[0].x, 6, 'clip poly x should be shifted');
assert.strictEqual(shifted[0].clipPoly[0].y, 1, 'clip poly y should be shifted');
assert.strictEqual(shifted[0].polys[0][0].x, 8, 'screen poly x should be shifted');
assert.strictEqual(shifted[0].polys[0][0].y, 3, 'screen poly y should be shifted');

api.resetShadowOverlayCacheForTests();
const profile = {
  step4f_shadowOverlayCollectMs: 0,
  shadowOverlayCacheMissCount: 0,
  step4e_shadowOverlayCacheLookupMs: 0,
  shadowOverlayCacheHitCount: 0,
  shadowOverlayTotalCount: 0,
  step4g_shadowOverlayCloneMs: 0,
  step4d_shadowOverlayTotalMs: 0
};
const facePts = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }];
const first = api.getVoxelFaceShadowWorldOverlays(facePts, { x: 0, y: 0, z: 1 }, 'box-1', profile, deps);
const second = api.getVoxelFaceShadowWorldOverlays(facePts, { x: 0, y: 0, z: 1 }, 'box-1', profile, deps);
assert.strictEqual(calls.filter((call) => call[0] === 'collect' && call[1] === 'box-1').length, 1, 'collector should run once for cache miss only');
assert.strictEqual(profile.shadowOverlayCacheMissCount, 1, 'profile should count one miss');
assert.strictEqual(profile.shadowOverlayCacheHitCount, 1, 'profile should count one hit');
assert.notStrictEqual(first[0], second[0], 'cache should return cloned overlay objects');
first[0].worldPolys[0][0].x = 99;
assert.notStrictEqual(second[0].worldPolys[0][0].x, 99, 'clones should protect cached world overlay points');

console.log('PASS canvas2d-shadow-overlay-cache');
