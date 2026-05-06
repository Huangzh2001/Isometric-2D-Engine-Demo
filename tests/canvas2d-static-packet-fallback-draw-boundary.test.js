#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const ownerRel = 'src/presentation/render/renderer/canvas2d-static-packet-fallback-draw.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
const indexSource = read('index.html');
assert(indexSource.includes(ownerRel), 'index.html must load canvas2d-static-packet-fallback-draw.js');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(rendererRel), 'fallback draw owner must load before renderer');

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

const api = context.window.__CANVAS2D_STATIC_PACKET_FALLBACK_DRAW__;
assert(api, 'Canvas2D static packet fallback draw API missing');
assert.strictEqual(api.owner, ownerRel);
assert.strictEqual(appRoot.renderer.canvas2dStaticPacketFallbackDraw, api, 'should bind renderer.canvas2dStaticPacketFallbackDraw');
assert.strictEqual(appRoot.renderer.diagnostics.canvas2dStaticPacketFallbackDraw, api, 'should bind renderer.diagnostics.canvas2dStaticPacketFallbackDraw');
assert(binds.some((entry) => entry.pathName === 'renderer.canvas2dStaticPacketFallbackDraw' && entry.meta && entry.meta.owner === ownerRel));

const drawnPackets = [];
const debugOverlays = [];
const slowPayloads = [];
const deps = {
  now: () => now += 5,
  safeFixed: (value) => Number(Number(value || 0).toFixed(3)),
  getRenderableKind: (renderable) => renderable && renderable.kind ? renderable.kind : 'unknown',
  drawStaticWorldFacePacket(packet) {
    drawnPackets.push(packet && packet.id);
    if (packet && packet.id === 'packet-hit') {
      packet.__lastStaticPacketCacheState = { geometryCacheHit: true, overlayCount: 1, overlayCacheHit: true };
    } else if (packet) {
      packet.__lastStaticPacketCacheState = { geometryCacheHit: false, overlayCount: 1, overlayCacheHit: false };
    }
  },
  drawFaceDebugOverlayRenderable(packet, index) {
    debugOverlays.push([packet && packet.id, index]);
  }
};
const stats = {
  staticPacketDrawLoopMs: 0,
  staticPacketGeometryCacheHitCount: 0,
  staticPacketGeometryCacheMissCount: 0,
  staticPacketOverlayCacheHitCount: 0,
  staticPacketOverlayCacheMissCount: 0,
};
const packets = [
  { id: 'packet-hit', kind: 'static-world-face-packet', cacheViewRotation: 2 },
  { id: 'packet-miss', instanceId: 'inst-2', kind: 'static-world-face-packet' },
];
api.drawStaticPacketRunFallback(deps, packets, { currentViewRotation: 7, framePlanId: 'frame-1', runStartIndex: 10 }, stats, (payload) => slowPayloads.push(payload));

assert.deepStrictEqual(drawnPackets, ['packet-hit', 'packet-miss'], 'should draw every fallback packet');
assert.deepStrictEqual(debugOverlays, [['packet-hit', 10], ['packet-miss', 11]], 'should draw debug overlay with absolute draw indices');
assert.strictEqual(packets[0].currentViewRotation, 7, 'should set current view rotation from meta');
assert.strictEqual(packets[0].framePlanId, 'frame-1', 'should set frame plan id');
assert.strictEqual(packets[0].__drawIndex, 10, 'should set first draw index');
assert.strictEqual(packets[1].__drawIndex, 11, 'should set second draw index');
assert.strictEqual(stats.staticPacketGeometryCacheHitCount, 1, 'should count one geometry cache hit');
assert.strictEqual(stats.staticPacketGeometryCacheMissCount, 1, 'should count one geometry cache miss');
assert.strictEqual(stats.staticPacketOverlayCacheHitCount, 1, 'should count one overlay cache hit');
assert.strictEqual(stats.staticPacketOverlayCacheMissCount, 1, 'should count one overlay cache miss');
assert.strictEqual(slowPayloads.length, 2, 'should track slow payload for every packet');
assert.strictEqual(slowPayloads[0].index, 10);
assert.strictEqual(slowPayloads[0].id, 'packet-hit');
assert.strictEqual(slowPayloads[0].kind, 'static-world-face-packet');
assert(Number(slowPayloads[0].ms) >= 0, 'slow payload should include elapsed ms');

console.log(JSON.stringify({ status: 'PASS', tested: [ownerRel] }, null, 2));
