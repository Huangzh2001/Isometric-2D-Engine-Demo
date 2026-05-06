#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const ownerRel = 'src/presentation/render/renderer/canvas2d-static-bitmap-run-cache.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
const indexSource = read('index.html');
assert(indexSource.includes(ownerRel), 'index.html must load canvas2d-static-bitmap-run-cache.js');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(rendererRel), 'static bitmap run cache owner must load before renderer');

const appRoot = { renderer: { diagnostics: {} } };
const binds = [];
const context = {
  console,
  Math,
  Number,
  String,
  Object,
  Array,
  Date,
  Map,
  window: null,
  performance: { now: () => 1000 },
};
context.window = {
  App: appRoot,
  performance: context.performance,
  __APP_NAMESPACE: {
    bind(pathName, value, meta) {
      binds.push({ pathName, value, meta });
      const parts = pathName.split('.');
      let node = appRoot;
      for (let i = 0; i < parts.length - 1; i += 1) {
        node[parts[i]] = node[parts[i]] || {};
        node = node[parts[i]];
      }
      node[parts[parts.length - 1]] = value;
      return value;
    },
    getPath(pathName) {
      return pathName.split('.').reduce((node, key) => node && node[key], appRoot);
    }
  }
};
vm.createContext(context);
runFile(context, ownerRel);

const api = context.window.__CANVAS2D_STATIC_BITMAP_RUN_CACHE__;
assert(api, 'Canvas2D static bitmap run cache API missing');
assert.strictEqual(api.owner, ownerRel);
assert.strictEqual(appRoot.renderer.canvas2dStaticBitmapRunCache, api, 'should bind renderer.canvas2dStaticBitmapRunCache');
assert.strictEqual(appRoot.renderer.diagnostics.canvas2dStaticBitmapRunCache, api, 'should bind renderer.diagnostics.canvas2dStaticBitmapRunCache');
assert(binds.some((entry) => entry.pathName === 'renderer.canvas2dStaticBitmapRunCache' && entry.meta && entry.meta.owner === ownerRel));

let now = 1000;
let settings = { tileW: 32, tileH: 16, originX: 100, originY: 80 };
let interactionType = null;
let interactionId = null;
let settleState = null;
const drawCalls = [];
const surfaceOps = [];
const surfaceCtx = {
  clearRect: (...args) => surfaceOps.push(['clearRect', ...args]),
  save: () => surfaceOps.push(['save']),
  translate: (...args) => surfaceOps.push(['translate', ...args]),
  fill: (...args) => surfaceOps.push(['fill', ...args]),
  stroke: (...args) => surfaceOps.push(['stroke', ...args]),
  restore: () => surfaceOps.push(['restore']),
  set fillStyle(value) { surfaceOps.push(['fillStyle', value]); },
  set strokeStyle(value) { surfaceOps.push(['strokeStyle', value]); },
  set lineWidth(value) { surfaceOps.push(['lineWidth', value]); },
};
const drawCtx = {
  drawImage: (...args) => drawCalls.push(['drawImage', ...args]),
};
const surfaceCanvas = { tag: 'surface-bitmap', getContext: (kind) => kind === '2d' ? surfaceCtx : null };
const adapterApi = {};
const deps = {
  createOffscreenCanvas(width, height) {
    assert(width > 0, 'bitmap width should be positive');
    assert(height > 0, 'bitmap height should be positive');
    return surfaceCanvas;
  },
  getContext: () => drawCtx,
  getCamera: () => ({ x: 2, y: 3 }),
  getSettings: () => settings,
  getActiveCameraInteractionType: () => interactionType,
  getActiveCameraInteractionId: () => interactionId,
  getCameraSettleReuseState: () => settleState,
  getTerrainBoundaryDebugSignature: () => 'boundary-debug-red:0',
  getStaticWorldPacketProjectedGeometry(packet) {
    packet.__lastStaticPacketCacheState = { geometryCacheHit: true, overlayCacheHit: true, overlayCount: 0 };
    return {
      pointsNoCamera: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }],
      path2d: { packetId: packet.id },
      overlaysNoCamera: [],
      terrainBoundarySegmentsNoCamera: []
    };
  },
  drawFaceShadowOverlaysNoCamera: () => surfaceOps.push(['shadow-overlays']),
  drawTerrainTopBoundarySegmentsForPacket: () => surfaceOps.push(['terrain-boundary']),
  now: () => now += 5,
  safeFixed: (value) => Number(Number(value || 0).toFixed(3))
};
function createStats() {
  return {
    staticBitmapRunCount: 0,
    staticBitmapRunPacketCount: 0,
    staticBitmapRunOverlayCount: 0,
    staticBitmapRunCacheHitCount: 0,
    staticBitmapRunCacheMissCount: 0,
    staticBitmapRunBuildMs: 0,
    staticBitmapRunDrawMs: 0,
    staticBitmapRunGeometryMs: 0,
    staticBitmapRunInteractionReuseCount: 0,
    staticBitmapRunInteractionReuseDrawMs: 0,
    staticPacketGeometryCacheHitCount: 0,
    staticPacketGeometryCacheMissCount: 0,
    staticPacketOverlayCacheHitCount: 0,
    staticPacketOverlayCacheMissCount: 0
  };
}
const packets = [{
  id: 'packet-1',
  fill: '#112233',
  stroke: '#445566',
  width: 1,
  worldPts: [{ x: 0, y: 0 }],
  worldLoops: [],
  worldOutlineSegments: [],
  terrainBoundarySegmentsWorld: [],
  terrainBoundaryStrokeWidth: 0,
  terrainBoundaryStroke: '',
  shadowOverlaysWorld: []
}];

const firstStats = createStats();
assert.strictEqual(api.drawStaticPacketRunBitmap(adapterApi, deps, packets, { currentViewRotation: 0, runStartIndex: 0 }, firstStats), true);
assert.strictEqual(firstStats.staticBitmapRunCacheMissCount, 1, 'first draw should miss exact bitmap cache');
assert.strictEqual(firstStats.staticBitmapRunCount, 1, 'first draw should draw one bitmap run');
assert.strictEqual(api.getStaticBitmapCache(adapterApi).size, 1, 'exact cache should store built bitmap');
assert.strictEqual(api.getStaticBitmapReuseCache(adapterApi).size, 1, 'reuse cache should store built bitmap');
assert(drawCalls.some((call) => call[0] === 'drawImage' && call[1] === surfaceCanvas), 'should draw built bitmap to renderer context');

const secondStats = createStats();
assert.strictEqual(api.drawStaticPacketRunBitmap(adapterApi, deps, packets, { currentViewRotation: 0, runStartIndex: 0 }, secondStats), true);
assert.strictEqual(secondStats.staticBitmapRunCacheHitCount, 1, 'second draw should hit exact bitmap cache');

settings = { tileW: 64, tileH: 32, originX: 200, originY: 160 };
interactionType = 'zoom';
interactionId = 'zoom-1';
const reuseStats = createStats();
assert.strictEqual(api.drawStaticPacketRunBitmap(adapterApi, deps, packets, { currentViewRotation: 0, runStartIndex: 0 }, reuseStats), true);
assert.strictEqual(reuseStats.staticBitmapRunCacheMissCount, 1, 'changed settings should miss exact cache');
assert.strictEqual(reuseStats.staticBitmapRunInteractionReuseCount, 1, 'zoom interaction should reuse prior bitmap run');
assert.strictEqual(reuseStats.staticBitmapRunInteractionReuseScale, 2, 'reuse draw should scale bitmap using tile size ratio');

settleState = { lastEndedType: 'zoom', deferCommitUntilMs: now + 1000 };
interactionType = 'drag';
assert.strictEqual(api.shouldUseDeferredZoomSettleReuse(deps), true, 'recent zoom settle should permit deferred reuse');

console.log(JSON.stringify({ status: 'PASS', tested: [ownerRel] }, null, 2));
