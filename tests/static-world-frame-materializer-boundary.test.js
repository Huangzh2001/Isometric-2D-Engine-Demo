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

const materializerRel = 'src/presentation/render/renderables/static-world-frame-materializer.js';
const renderRel = 'src/presentation/render/render.js';
const indexRel = 'index.html';

const materializerSource = read(materializerRel);
const renderSource = read(renderRel);
const indexSource = read(indexRel);

assert(materializerSource.includes("layer: 'presentation/render/renderables'"), 'materializer must declare presentation/render/renderables layer');
assert(materializerSource.includes("phase: 'P11a-5'"), 'materializer must declare P11a-5 phase');
assert(indexOfOrFail(indexSource, materializerRel) < indexOfOrFail(indexSource, renderRel), 'materializer must load before render.js');

for (const forbidden of ['localStorage', 'sessionStorage', 'fetch(', 'document.', 'ctx.', 'new Image', 'staticBoxRenderCache', 'buildMainFrameRenderables']) {
  assert(!materializerSource.includes(forbidden), `${materializerRel} must not contain ${forbidden}`);
}

for (const marker of [
  'function requireStaticWorldFrameMaterializerForRender()',
  'function createStaticWorldFrameMaterializerDepsForRender()',
  'P11a-5 note: static world frame materialization helpers are delegated',
  'requireStaticWorldFrameMaterializerForRender().buildStaticVoxelFaceRenderable',
  'requireStaticWorldFrameMaterializerForRender().materializeStaticWorldFrameRenderables'
]) {
  assert(renderSource.includes(marker), `render.js missing materializer delegation marker ${marker}`);
}

for (const fn of [
  'buildStaticVoxelFaceRenderable',
  'flattenStaticVoxelRenderable',
  'materializeStaticWorldFacePacket',
  'materializeStaticWorldFrameRenderables'
]) {
  assert(bodyOf(renderSource, fn).includes('requireStaticWorldFrameMaterializerForRender()'), `${fn} must be a thin materializer delegation wrapper`);
}

assert(!bodyOf(renderSource, 'buildStaticVoxelFaceRenderable').includes("var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3"), 'buildStaticVoxelFaceRenderable wrapper must not own static voxel face tie priority');
assert(!bodyOf(renderSource, 'materializeStaticWorldFacePacket').includes("renderPath: 'static-world-frame-face'"), 'materializeStaticWorldFacePacket wrapper must not own static world packet materialization body');

const sandbox = { console, Math, Object, Array, Number, String, Error };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(materializerSource, sandbox, { filename: materializerRel });
const api = sandbox.IsometricStaticWorldFrameMaterializer;
assert(api, 'materializer API should be exported');
for (const fn of [
  'buildStaticVoxelFaceRenderable',
  'flattenStaticVoxelRenderable',
  'materializeStaticWorldFacePacket',
  'materializeStaticWorldFrameRenderables'
]) {
  assert.strictEqual(typeof api[fn], 'function', `missing ${fn}`);
}

const drawCalls = [];
const deps = {
  averageScreenPoint(points) {
    if (!Array.isArray(points) || !points.length) return { x: 0, y: 0 };
    return {
      x: points.reduce((sum, p) => sum + Number(p.x || 0), 0) / points.length,
      y: points.reduce((sum, p) => sum + Number(p.y || 0), 0) / points.length,
    };
  },
  drawCachedVoxelFaceRenderable(item) { drawCalls.push(item.id || item.kind); },
  getDomainSceneCoreApi() {
    return {
      computeVoxelRenderableSort({ cell }) {
        return { sortKey: Number(cell.x || 0) + 10, tie: Number(cell.y || 0) + 20 };
      }
    };
  },
  computeViewAwareSortMeta() { return { sortKey: -1, tie: -1 }; },
  screenPointsFromWorldFace(points) {
    return (Array.isArray(points) ? points : []).map((p) => ({ x: Number(p.x || 0) * 10, y: Number(p.y || 0) * 10 }));
  },
  worldShadowOverlaysToScreen(overlays) {
    return (Array.isArray(overlays) ? overlays : []).map((overlay, i) => ({ screen: true, i, alpha: overlay.alpha }));
  },
  compareRenderablesByDomain(a, b) { return Number(a.sortKey || 0) - Number(b.sortKey || 0); }
};

const baseRenderable = {
  id: 'base-1',
  instanceId: 'inst-1',
  prefabId: 'prefab-1',
  cellX: 1,
  cellY: 2,
  cellZ: 3,
  faces: [
    { screenFace: 'top', semanticFace: 'top', points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }], fill: '#fff' }
  ]
};
const flattened = api.flattenStaticVoxelRenderable(baseRenderable, 2, deps);
assert.strictEqual(flattened.length, 1, 'one face should be materialized');
assert.strictEqual(flattened[0].renderPath, 'static-cache-face', 'static voxel face render path should be set');
assert.strictEqual(flattened[0].sortKey, 11, 'domain sort should be injected');
assert.strictEqual(flattened[0].tie, 22.03, 'face tie priority should be applied for top face');
flattened[0].draw();
assert.strictEqual(drawCalls[0], flattened[0].id, 'face draw should call injected draw function');

const packet = {
  id: 'packet-1',
  sortKey: 5,
  worldPts: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
  worldLoops: [[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]],
  shadowOverlaysWorld: [{ alpha: 0.5 }]
};
const materialized = api.materializeStaticWorldFacePacket(packet, deps);
assert.strictEqual(materialized.renderPath, 'static-world-frame-face', 'packet render path should be set');
assert.strictEqual(materialized.points[1].x, 10, 'world points should be projected through injected projector');
assert.strictEqual(materialized.shadowOverlays[0].screen, true, 'shadows should be projected through injected shadow dependency');
materialized.draw();
assert.strictEqual(drawCalls[1], 'packet-1', 'packet draw should call injected draw function');

const sorted = api.materializeStaticWorldFrameRenderables([
  { sortKey: 9, worldPts: packet.worldPts },
  { sortKey: 1, worldPts: packet.worldPts }
], deps);
assert.strictEqual(sorted[0].sortKey, 1, 'materialized frame renderables should sort through injected comparator');

console.log('PASS static-world-frame-materializer-boundary');
