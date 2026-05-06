#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const ownerRel = 'src/presentation/render/renderer/canvas2d-renderable-order-draw.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
const indexSource = read('index.html');
assert(indexSource.includes(ownerRel), 'index.html must load canvas2d-renderable-order-draw.js');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(rendererRel), 'renderable-order draw owner must load before renderer');

const appRoot = { renderer: { diagnostics: {} } };
const binds = [];
let now = 1000;
const context = {
  console,
  Math,
  Number,
  String,
  Object,
  Array,
  Date,
  window: null,
  performance: { now: () => now += 1 },
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

const api = context.window.__CANVAS2D_RENDERABLE_ORDER_DRAW__;
assert(api, 'Canvas2D renderable-order draw API missing');
assert.strictEqual(api.owner, ownerRel);
assert.strictEqual(appRoot.renderer.canvas2dRenderableOrderDraw, api, 'should bind renderer.canvas2dRenderableOrderDraw');
assert.strictEqual(appRoot.renderer.diagnostics.canvas2dRenderableOrderDraw, api, 'should bind renderer.diagnostics.canvas2dRenderableOrderDraw');
assert(binds.some((entry) => entry.pathName === 'renderer.canvas2dRenderableOrderDraw' && entry.meta && entry.meta.owner === ownerRel));

assert.strictEqual(api.getRenderableKind({ kind: 'voxel' }), 'voxel');
assert.strictEqual(JSON.stringify(api.getRenderableDrawPosition({}, { drawScreenPosition: { x: 1.4, y: 2.6 } })), JSON.stringify({ x: 1, y: 3 }));

const drawn = [];
const fallbackRuns = [];
const drawHits = [];
const profiles = [];
let lastFrameDrawMs = null;
let lastFrameDrawStats = null;
const ctx = {
  beginPath() {},
  moveTo() {},
  lineTo() {},
  closePath() {},
  fill() {},
  stroke() {},
  drawImage() {},
  fillRect() {},
  strokeRect() {},
  clearRect() {},
};
const adapterApi = { __inDrawRenderableOrder: false };
const debugState = {};
const deps = {
  now: () => now += 5,
  getContext: () => ctx,
  getDebugState: () => debugState,
  getCamera: () => ({ x: 3, y: 4 }),
  safeFixed: (value) => Number(Number(value || 0).toFixed(3)),
  averageScreenPoint: (points) => ({ x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length }),
  shouldEmitProfile: () => true,
  emitRendererProfile: (tag, payload) => profiles.push({ tag, payload }),
  recordDrawDiagnostic: (kind, payload) => drawHits.push({ kind, payload }),
  detailLog: () => {},
  drawStaticPacketRunBitmap: () => false,
  drawStaticPacketRunFallback: (packets, meta, stats, trackSlowRenderable) => {
    fallbackRuns.push({ packets: packets.map((packet) => packet.id), meta });
    stats.staticPacketDrawLoopMs += 7;
    stats.staticPacketGeometryCacheHitCount += 1;
    stats.staticPacketOverlayCacheMissCount += 1;
    trackSlowRenderable({ index: meta.runStartIndex, id: packets[0].id, kind: 'static-world-face-packet', ms: 7 });
  },
  drawCachedVoxelRenderable: (renderable) => drawn.push(`voxel:${renderable.id}`),
  drawFaceDebugOverlayRenderable: (renderable, index) => drawn.push(`debug:${renderable.id}:${index}`),
  getLastMainRenderableBuildStats: () => ({ visibleStaticChunkCount: 2, visibleStaticPacketCount: 2, dynamicObjectCount: 1, frameBuildMs: 11 }),
  setLastFrameDrawMs: (value) => { lastFrameDrawMs = value; },
  setLastFrameDrawStats: (value) => { lastFrameDrawStats = value; },
  maybeLogFrameWorkBreakdown: (payload) => profiles.push({ tag: 'FRAME-WORK', payload }),
  getMainEditorZoomValueForRender: () => 1.25,
};

const dynamic = {
  id: 'dyn-1',
  kind: 'voxel',
  instanceId: 'inst-1',
  prefabId: 'prefab-1',
  cacheViewRotation: 2,
  drawScreenPosition: { x: 10.2, y: 20.8 },
  draw() { drawn.push('draw:dyn-1'); }
};
const order = [
  { id: 'packet-a', kind: 'static-world-face-packet' },
  { id: 'packet-b', kind: 'static-world-face-packet' },
  dynamic,
];
const result = api.drawRenderableOrder(adapterApi, deps, order, { source: 'test', framePlanId: 'frame-1', currentViewRotation: 5 });

assert.strictEqual(result, order, 'drawRenderableOrder should return original order');
assert.strictEqual(adapterApi.__inDrawRenderableOrder, false, 'adapter flag should be reset');
assert.strictEqual(adapterApi.__lastDrawLoopBreakdown.staticPacketCount, 2, 'should count static packets');
assert.strictEqual(adapterApi.__lastDrawLoopBreakdown.dynamicRenderableCount, 1, 'should count dynamic renderables');
assert.strictEqual(adapterApi.__lastDrawLoopBreakdown.staticPacketGeometryCacheHitCount, 1, 'should aggregate static fallback geometry hits');
assert.strictEqual(JSON.stringify(fallbackRuns[0].packets), JSON.stringify(['packet-a', 'packet-b']), 'should group adjacent static packets');
assert(drawn.includes('draw:dyn-1'), 'should draw dynamic renderable');
assert(drawn.includes('debug:dyn-1:2'), 'should draw dynamic debug overlay with draw index');
assert.strictEqual(dynamic.__drawIndex, 2, 'should assign draw index');
assert.strictEqual(dynamic.currentViewRotation, 5, 'should assign current view rotation from frame meta before cache rotation');
assert.strictEqual(dynamic.framePlanId, 'frame-1', 'should assign frame plan id');
assert.strictEqual(drawHits.length, 1, 'should emit one draw-hit diagnostic');
assert.strictEqual(drawHits[0].payload.finalDrawScreenPosition.x, 10);
assert.strictEqual(drawHits[0].payload.finalDrawScreenPosition.y, 21);
assert(profiles.some((entry) => entry.tag === 'DRAW-LOOP-BREAKDOWN'), 'should emit draw-loop profile');
assert(profiles.some((entry) => entry.tag === 'FRAME-WORK'), 'should forward frame-work breakdown');
assert(Number(lastFrameDrawMs) >= 0, 'should publish last frame draw ms');
assert.strictEqual(lastFrameDrawStats.staticPacketCount, 2, 'should publish last frame draw stats');

console.log(JSON.stringify({ status: 'PASS', tested: [ownerRel] }, null, 2));
