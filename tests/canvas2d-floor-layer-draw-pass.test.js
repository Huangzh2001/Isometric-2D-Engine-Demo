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

const passRel = 'src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js';
const staticPassRel = 'src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js';
const renderRel = 'src/presentation/render/render.js';
const passSource = read(passRel);
const renderSource = read(renderRel);
const indexSource = read('index.html');

assert(passSource.includes("layer: 'presentation/render/renderer'"), 'floor layer draw pass must declare presentation/renderer layer');
assert(passSource.includes("phase: 'P8d'"), 'floor layer draw pass must declare P8d phase');
assert(indexOfOrFail(indexSource, staticPassRel) < indexOfOrFail(indexSource, passRel), 'floor layer draw pass should load after static world face draw pass');
assert(indexOfOrFail(indexSource, passRel) < indexOfOrFail(indexSource, renderRel), 'floor layer draw pass must load before render.js');

for (const marker of [
  'requireCanvas2dFloorLayerDrawPassForRender().drawFloor',
  'requireCanvas2dFloorLayerDrawPassForRender().rebuildFloorLayerIfNeeded',
  'requireCanvas2dFloorLayerDrawPassForRender().buildFloorChunkEntryForLayer',
  'requireCanvas2dFloorLayerDrawPassForRender().computeVisibleFloorChunkKeysForLayer',
  'createCanvas2dFloorLayerDrawPassDepsForRender()'
]) {
  assert(renderSource.includes(marker), `render.js missing floor layer draw pass delegation marker ${marker}`);
}

for (const snippet of [
  'var tiles = [];\n  var minScreenX = Infinity;',
  'targetCtx.drawImage(visibleEntry.canvas, bounds.x + currentCameraXForLayer',
  "floorLayerActualBranch: 'floor-layer-cache-unknown'",
  "targetCtx.strokeStyle = 'rgba(255,255,255,.14)'"
]) {
  assert(!renderSource.includes(snippet), `render.js still owns floor layer body snippet: ${snippet}`);
}

const sandbox = { console, Math, Number, String, Array, Map, Object, Date, Error, isFinite };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(passSource, sandbox, { filename: passRel });
const api = sandbox.IsometricCanvas2dFloorLayerDrawPass;
assert(api, 'floor layer draw pass API should be exported');
for (const name of [
  'completeFloorLayerBreakdown',
  'ensureFloorLayerCanvas',
  'getFloorChunkKeyForLayer',
  'parseFloorChunkKeyForLayer',
  'computeVisibleFloorChunkKeysForLayer',
  'buildFloorChunkEntryForLayer',
  'rebuildFloorLayerIfNeeded',
  'drawFloor'
]) {
  assert.strictEqual(typeof api[name], 'function', `missing API ${name}`);
}

function createCtx(label) {
  const calls = [];
  return {
    label,
    calls,
    imageSmoothingEnabled: false,
    setTransform(...args) { calls.push(['setTransform', ...args]); },
    translate(...args) { calls.push(['translate', ...args]); },
    scale(...args) { calls.push(['scale', ...args]); },
    clearRect(...args) { calls.push(['clearRect', ...args]); },
    drawImage(...args) { calls.push(['drawImage', ...args]); },
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    beginPath() { calls.push(['beginPath']); },
    moveTo(...args) { calls.push(['moveTo', ...args]); },
    lineTo(...args) { calls.push(['lineTo', ...args]); },
    closePath() { calls.push(['closePath']); },
    stroke() { calls.push(['stroke', this._strokeStyle, this._lineWidth]); },
    set strokeStyle(v) { this._strokeStyle = v; calls.push(['strokeStyle', v]); },
    get strokeStyle() { return this._strokeStyle; },
    set lineWidth(v) { this._lineWidth = v; calls.push(['lineWidth', v]); },
    get lineWidth() { return this._lineWidth; }
  };
}

let canvasId = 0;
function createCanvas() {
  const ctx = createCtx(`canvas-${canvasId}`);
  return {
    id: `canvas-${canvasId++}`,
    width: 0,
    height: 0,
    ctx,
    getContext(kind) {
      assert.strictEqual(kind, '2d');
      return ctx;
    }
  };
}

let now = 0;
const state = { canvas: null, ctx: null, cache: { dirty: true } };
const profile = {};
const mainCtx = createCtx('main');
const deps = {
  VIEW_W: 320,
  VIEW_H: 200,
  dpr: 2,
  settings: { gridW: 4, gridH: 4, originX: 100, originY: 50 },
  camera: { x: 7, y: -3 },
  ctx: mainCtx,
  perfNow() { now += 1; return now; },
  createCanvas,
  getFloorLayerCanvas() { return state.canvas; },
  setFloorLayerCanvas(v) { state.canvas = v; },
  getFloorLayerCtx() { return state.ctx; },
  setFloorLayerCtx(v) { state.ctx = v; },
  getFloorLayerCache() { return state.cache; },
  setFloorLayerCache(v) { state.cache = v; },
  getActiveBaseWorldActualPathProfile() { return profile; },
  writeBaseWorldActualPathProfile(partial) { Object.assign(profile, partial); return profile; },
  getActiveCameraInteractionTypeForFloorLayer() { return null; },
  getCameraSettleReuseStateForFloorLayer() { return null; },
  getSharedStaticWorldChunkCacheApiForRender() { return { getChunkSize: () => 2 }; },
  screenPointsFromWorldFaceNoCamera(worldPts, viewRotation) {
    return (worldPts || []).map((pt) => ({ x: Number(pt.x || 0) * 10 + viewRotation, y: Number(pt.y || 0) * 8 + Number(pt.z || 0) * 4 }));
  },
  getSafeMainEditorViewRotation() { return { viewRotation: 1 }; },
  normalizeMainEditorViewRotationValue(v) { return Number(v || 0); },
  getMainEditorZoomValueForRender() { return 1; },
  getMainCameraRenderScope() { return { cameraCullingEnabled: false }; },
  floorLayerSignature() { return 'floor-sig'; },
  isInteractiveRenderPressure() { return false; },
  logItemRotationPrototype() {},
  noteLayerRebuild() {},
  rgbToCss(value) { return `css:${value}`; },
  litColor(value) { return `lit:${value}`; },
  hexToRgb(value) { return value; },
  drawPolyOn(targetCtx, points, fill, stroke) { targetCtx.calls.push(['drawPolyOn', points.length, fill, stroke]); },
  setLastDrawFloorBreakdown(breakdown) { state.lastBreakdown = breakdown; }
};

assert.strictEqual(api.getFloorChunkKeyForLayer(2, 3), '2,3');
const parsedChunk = api.parseFloorChunkKeyForLayer('4,5');
assert.strictEqual(parsedChunk.chunkX, 4);
assert.strictEqual(parsedChunk.chunkY, 5);
const visibleKeys = api.computeVisibleFloorChunkKeysForLayer({ cameraCullingEnabled: false }, 2, deps);
assert.strictEqual(JSON.stringify(Array.from(visibleKeys).sort()), JSON.stringify(['0,0', '0,1', '1,0', '1,1'].sort()), 'visible chunk keys should cover 4x4 grid with chunk size 2');
const entry = api.buildFloorChunkEntryForLayer('0,0', 1, 'floor-sig', deps);
assert(entry.canvas, 'floor chunk entry should own an offscreen canvas');
assert.strictEqual(entry.tileCount, 4, 'chunk entry should draw four 2x2 tiles');
assert(entry.canvas.ctx.calls.some((call) => call[0] === 'drawPolyOn'), 'chunk canvas should draw floor tile polygons');
const breakdown = api.drawFloor(deps);
assert.strictEqual(breakdown.floorVersionTag, 'floor-static-chunk-v1');
assert(state.canvas, 'drawFloor should create/reuse floor layer canvas');
assert(mainCtx.calls.some((call) => call[0] === 'drawImage'), 'drawFloor should blit floor layer canvas to main ctx');
assert(profile.baseWorldActualBranch, 'drawFloor should update base-world profile');
assert(state.lastBreakdown, 'drawFloor should publish last floor breakdown through dependency');

console.log('PASS canvas2d-floor-layer-draw-pass');
