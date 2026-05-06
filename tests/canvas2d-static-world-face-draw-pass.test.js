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

const passRel = 'src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js';
const shadowRel = 'src/presentation/render/renderer/canvas2d-shadow-overlays.js';
const renderRel = 'src/presentation/render/render.js';
const passSource = read(passRel);
const renderSource = read(renderRel);
const indexSource = read('index.html');

assert(passSource.includes("layer: 'presentation/render/renderer'"), 'static world face draw pass must declare presentation/renderer layer');
assert(passSource.includes("phase: 'P8c'"), 'static world face draw pass must declare P8c phase');
assert(indexOfOrFail(indexSource, shadowRel) < indexOfOrFail(indexSource, passRel), 'static face draw pass should load after shadow overlays');
assert(indexOfOrFail(indexSource, passRel) < indexOfOrFail(indexSource, renderRel), 'static face draw pass must load before render.js');

for (const marker of [
  'requireCanvas2dStaticWorldFaceDrawPassForRender().drawCachedVoxelRenderable',
  'requireCanvas2dStaticWorldFaceDrawPassForRender().drawCachedVoxelFaceRenderable',
  'requireCanvas2dStaticWorldFaceDrawPassForRender().buildStaticWorldPacketProjectionCacheKey',
  'requireCanvas2dStaticWorldFaceDrawPassForRender().getStaticWorldPacketProjectedGeometry',
  'requireCanvas2dStaticWorldFaceDrawPassForRender().drawTerrainTopBoundarySegmentsForPacket',
  'requireCanvas2dStaticWorldFaceDrawPassForRender().drawStaticWorldFacePacket',
]) {
  assert(renderSource.includes(marker), `render.js missing static world face draw pass delegation marker ${marker}`);
}

for (const snippet of [
  'var worldLoops = Array.isArray(packet && packet.worldLoops)',
  'packet.__projectedDrawCache = cached;',
  'targetCtx.lineJoin = \'round\';',
  'ctx.fill(projected.path2d, \'evenodd\');',
  'applyTerrainMaterialPatternOverlay(ctx, loops.length ? (loops[0] || []) : points, path2d, 0, 0, item);'
]) {
  assert(!renderSource.includes(snippet), `render.js still owns static face draw body snippet: ${snippet}`);
}

for (const forbidden of ['localStorage', 'fetch(', 'document.', 'new Image', 'staticBoxRenderCache', 'buildRenderables', 'buildMainFrameRenderables']) {
  assert(!passSource.includes(forbidden), `${passRel} must not contain ${forbidden}`);
}

const sandbox = { console, Math, Number, String, Array };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(passSource, sandbox, { filename: passRel });
const api = sandbox.IsometricCanvas2dStaticWorldFaceDrawPass;
assert(api, 'static world face draw pass API should be exported');
for (const name of [
  'buildStaticWorldPacketProjectionCacheKey',
  'getStaticWorldPacketProjectedGeometry',
  'drawTerrainTopBoundarySegmentsForPacket',
  'drawCachedVoxelRenderable',
  'drawCachedVoxelFaceRenderable',
  'drawStaticWorldFacePacket'
]) {
  assert.strictEqual(typeof api[name], 'function', `missing API ${name}`);
}

function createCtx() {
  const calls = [];
  return {
    calls,
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    translate(x, y) { calls.push(['translate', x, y]); },
    fill(path, mode) { calls.push(['fill', path && path.kind, mode || '']); },
    _strokeStyle: '',
    _lineWidth: 1,
    stroke(path) { calls.push(['stroke', path && path.kind || null, this._strokeStyle, this._lineWidth]); },
    beginPath() { calls.push(['beginPath']); },
    moveTo(x, y) { calls.push(['moveTo', x, y]); },
    lineTo(x, y) { calls.push(['lineTo', x, y]); },
    arc(x, y, r) { calls.push(['arc', x, y, r]); },
    set fillStyle(v) { calls.push(['fillStyle', v]); },
    set strokeStyle(v) { this._strokeStyle = v; calls.push(['strokeStyle', v]); },
    get strokeStyle() { return this._strokeStyle; },
    set lineWidth(v) { this._lineWidth = v; calls.push(['lineWidth', v]); },
    get lineWidth() { return this._lineWidth; },
    set lineJoin(v) { calls.push(['lineJoin', v]); },
    set lineCap(v) { calls.push(['lineCap', v]); }
  };
}

function makeDeps(ctx) {
  const calls = [];
  return {
    calls,
    ctx,
    camera: { x: 3, y: -2 },
    settings: { tileW: 64, tileH: 32, originX: 100, originY: 50 },
    screenPointsFromWorldFaceNoCamera(worldPts, viewRotation) {
      calls.push(['project', Array.isArray(worldPts) ? worldPts.length : 0, viewRotation]);
      return (worldPts || []).map((pt) => ({ x: Number(pt.x || 0) * 10 + viewRotation, y: Number(pt.y || 0) * 10 + Number(pt.z || 0) * 5 }));
    },
    worldShadowOverlaysToNoCamera(overlays, viewRotation) {
      calls.push(['worldShadowOverlaysToNoCamera', overlays.length, viewRotation]);
      return overlays.map((ov) => Object.assign({}, ov, { polysNoCamera: ov.polysNoCamera || [] }));
    },
    buildPath2DFromPoints(points) { calls.push(['pathPoints', points.length]); return points.length >= 3 ? { kind: 'points', count: points.length } : null; },
    buildPath2DFromLoops(loops) { calls.push(['pathLoops', loops.length]); return loops.length ? { kind: 'loops', count: loops.length } : null; },
    buildPath2DFromSegments(segments) { calls.push(['pathSegments', segments.length]); return segments.length ? { kind: 'segments', count: segments.length } : null; },
    drawPoly(points, fill, stroke, width) { calls.push(['drawPoly', points.length, fill, stroke, width]); },
    drawPolyWithOffset(points, ox, oy, fill, stroke, width) { calls.push(['drawPolyWithOffset', points.length, ox, oy, fill, stroke, width]); },
    drawFaceShadowOverlays(targetCtx, points, overlays) { calls.push(['drawFaceShadowOverlays', points.length, overlays ? overlays.length : 0]); },
    drawFaceShadowOverlaysNoCamera(targetCtx, points, overlays, ox, oy) { calls.push(['drawFaceShadowOverlaysNoCamera', points.length, overlays ? overlays.length : 0, ox, oy]); },
    applyTerrainMaterialPatternOverlay(targetCtx, points, path2d, ox, oy, item) { calls.push(['pattern', points.length, !!path2d, ox, oy, item && item.id]); },
    getTerrainTopBoundaryRenderDebugSignature() { return 'debug-boundary'; },
    getTerrainTopBoundaryStrokeWidthForPacket(packet) { return packet.terrainBoundaryStrokeWidth || 0; },
    getTerrainTopBoundaryStrokeStyleForPacket(packet) { return packet.terrainBoundaryStroke || ''; },
    normalizeMainEditorViewRotationValue(value) { return Number(value || 0); },
    getSafeMainEditorViewRotation() { return { viewRotation: 2 }; }
  };
}

const ctx = createCtx();
const deps = makeDeps(ctx);
const packet = {
  id: 'face-1',
  fill: '#abc',
  stroke: '#123',
  width: 2,
  worldPts: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }],
  terrainBoundarySegmentsWorld: [[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]],
  terrainBoundaryStrokeWidth: 3,
  terrainBoundaryStroke: '#0f0',
  shadowOverlaysWorld: [{ polysNoCamera: [[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]] }]
};
const key = api.buildStaticWorldPacketProjectionCacheKey(packet, 2, deps);
assert(key.includes('64') && key.includes('debug-boundary') && key.includes('face-1'), 'projection cache key should include settings/debug/id');
const projected1 = api.getStaticWorldPacketProjectedGeometry(packet, 2, deps);
assert.strictEqual(packet.__lastStaticPacketCacheState.geometryCacheHit, false, 'first projection should miss cache');
const projected2 = api.getStaticWorldPacketProjectedGeometry(packet, 2, deps);
assert.strictEqual(projected1, projected2, 'second projection should reuse packet cache');
assert.strictEqual(packet.__lastStaticPacketCacheState.geometryCacheHit, true, 'second projection should hit cache');
assert(projected1.terrainBoundaryPath2d, 'terrain boundary path should be built');
api.drawTerrainTopBoundarySegmentsForPacket(ctx, packet, projected1, deps);
assert(ctx.calls.some((call) => call[0] === 'stroke' && call[2] === '#0f0'), 'terrain boundary draw should stroke injected style');

api.drawStaticWorldFacePacket(packet, deps);
assert(ctx.calls.some((call) => call[0] === 'translate' && call[1] === 3 && call[2] === -2), 'static face packet should apply camera offset');
assert(ctx.calls.some((call) => call[0] === 'fill' && call[1] === 'points'), 'static face packet should fill projected path');
assert(deps.calls.some((call) => call[0] === 'pattern' && call[5] === 'face-1'), 'static face packet should call material pattern hook');
assert(deps.calls.some((call) => call[0] === 'drawFaceShadowOverlaysNoCamera'), 'static face packet should draw no-camera overlays');

api.drawCachedVoxelRenderable({
  faces: [{ points: [{}, {}, {}], fill: '#fff', stroke: '#000', width: 1, shadowOverlays: [{}] }],
  debugFoot: { x: 4, y: 5 }
}, deps);
assert(deps.calls.some((call) => call[0] === 'drawPoly'), 'cached voxel renderable should delegate polygon draw');
assert(ctx.calls.some((call) => call[0] === 'arc' && call[1] === 4 && call[2] === 5), 'cached voxel debug foot should draw arc');

api.drawCachedVoxelFaceRenderable({
  id: 'voxel-face',
  points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
  fill: '#fff',
  stroke: '#000',
  width: 1,
  shadowOverlays: [{}]
}, deps);
assert(deps.calls.some((call) => call[0] === 'pathPoints' && call[1] === 3), 'cached voxel face should build path from points');
assert(deps.calls.some((call) => call[0] === 'drawFaceShadowOverlays'), 'cached voxel face should draw shadow overlays');

console.log('PASS canvas2d-static-world-face-draw-pass');
