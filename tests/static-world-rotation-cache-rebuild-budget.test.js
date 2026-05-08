#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/presentation/render/static-world-cache.js'), 'utf8');
const logs = [];
const sandbox = {
  window: {},
  console: { log: (msg) => logs.push(String(msg)) },
  performance: { now: (() => { let t = 0; return () => ++t; })() },
  Math,
  Number,
  String,
  Object,
  Array,
  Set,
  Map,
  Date,
  JSON,
};
sandbox.window.console = sandbox.console;
sandbox.window.performance = sandbox.performance;
vm.runInNewContext(source, sandbox, { filename: 'src/presentation/render/static-world-cache.js' });

const api = sandbox.window.__STATIC_WORLD_CHUNK_CACHE__;
assert(api && typeof api.syncWithScene === 'function', 'static world chunk cache API should be exposed');
api.reset('unit-test');

const boxes = [
  { id: 'a', instanceId: 'a', prefabId: 'cube', x: 0, y: 0, z: 0, w: 1, d: 1, h: 1 },
  { id: 'b', instanceId: 'b', prefabId: 'cube', x: 17, y: 0, z: 0, w: 1, d: 1, h: 1 },
  { id: 'c', instanceId: 'c', prefabId: 'cube', x: 0, y: 17, z: 0, w: 1, d: 1, h: 1 },
  { id: 'd', instanceId: 'd', prefabId: 'cube', x: 17, y: 17, z: 0, w: 1, d: 1, h: 1 },
];
api.syncWithScene({
  forceFullRebuild: true,
  sceneSnapshot: { cacheVersion: 1, chunkSize: 16, mode: 'full-rebuild' },
  updates: [],
  getBoxes: () => boxes,
});

function sig(rotation, faceMerge = 'merge') {
  return JSON.stringify({
    lightingSignature: 'lighting',
    xrayFaces: false,
    showDebug: false,
    surfaceOnlyRenderingEnabled: true,
    packetViewRotation: rotation,
    cacheContentType: 'world-face-packets',
    cameraIndependent: true,
    usesScreenSpaceCache: false,
    faceMergeEffectiveMode: faceMerge,
  });
}

function collect(renderSignature, rebuildBudgetValue) {
  return api.collectVisibleRenderables({
    scope: null,
    renderSignature,
    rebuildBudgetMode: 'count',
    rebuildBudgetValue,
    comparePackets: (a, b) => (Number(a.sortKey || 0) - Number(b.sortKey || 0)) || (Number(a.tie || 0) - Number(b.tie || 0)),
    rebuildChunk: (chunk) => {
      const packets = [];
      if (chunk && chunk.boxMap && typeof chunk.boxMap.forEach === 'function') {
        chunk.boxMap.forEach((box) => packets.push({
          id: String(box.id),
          kind: 'static-world-face-packet',
          sortKey: Number(box.x || 0) + Number(box.y || 0),
          tie: 0,
        }));
      }
      return { packets, stats: { packetCount: packets.length, visibleTopFaceCount: packets.length } };
    },
  });
}

const initial = collect(sig(0), 10);
assert.strictEqual(initial.summary.rebuiltChunkCountThisFrame, 4, 'initial explicit high budget should build all chunks');

const rotated = collect(sig(2), 1);
assert.strictEqual(rotated.summary.structuralRenderSignatureChanged, true, 'packet view rotation change should be structural');
assert.strictEqual(rotated.summary.forcedVisibleStructuralRebuild, true, 'structural rotation change should force visible rebuild');
assert.strictEqual(rotated.summary.requestedRebuildBudgetValue, 1, 'test requested a small rebuild budget');
assert.strictEqual(rotated.summary.rebuildBudgetValue, 4, 'visible structural rebuild should lift count budget to all visible chunks');
assert.strictEqual(rotated.summary.rebuiltChunkCountThisFrame, 4, 'all visible chunks must rebuild in the first rotated frame');
assert.strictEqual(rotated.summary.remainingDirtyChunkCount, 0, 'rotation must not leave mixed old/new static packet chunks visible');
assert.strictEqual(rotated.summary.previousPacketViewRotation, 0, 'summary should expose previous packet view rotation');
assert.strictEqual(rotated.summary.nextPacketViewRotation, 2, 'summary should expose next packet view rotation');

console.log(JSON.stringify({ status: 'PASS', test: 'static-world-rotation-cache-rebuild-budget' }, null, 2));
