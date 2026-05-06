#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const ownerRel = 'src/presentation/render/renderer/canvas2d-zoom-preview-state.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
const indexSource = read('index.html');
assert(indexSource.includes(ownerRel), 'index.html must load canvas2d-zoom-preview-state.js');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(rendererRel), 'zoom preview state owner must load before renderer');

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

const api = context.window.__CANVAS2D_ZOOM_PREVIEW_STATE__;
assert(api, 'Canvas2D zoom preview state API missing');
assert.strictEqual(api.owner, ownerRel);
assert.strictEqual(appRoot.renderer.canvas2dZoomPreviewState, api, 'should bind renderer.canvas2dZoomPreviewState');
assert.strictEqual(appRoot.renderer.diagnostics.canvas2dZoomPreview, api, 'should bind renderer.diagnostics.canvas2dZoomPreview');
assert(binds.some((entry) => entry.pathName === 'renderer.canvas2dZoomPreviewState' && entry.meta && entry.meta.owner === ownerRel));

let now = 1000;
const drawCalls = [];
const previewCtx = {
  clearRect: (...args) => drawCalls.push(['preview.clearRect', ...args]),
  drawImage: (...args) => drawCalls.push(['preview.drawImage', ...args]),
};
const drawCtx = {
  save: () => drawCalls.push(['save']),
  clearRect: (...args) => drawCalls.push(['clearRect', ...args]),
  translate: (...args) => drawCalls.push(['translate', ...args]),
  scale: (...args) => drawCalls.push(['scale', ...args]),
  drawImage: (...args) => drawCalls.push(['drawImage', ...args]),
  restore: () => drawCalls.push(['restore']),
};
const snapshotCanvas = { getContext: (kind) => kind === '2d' ? previewCtx : null };
const sourceCanvas = { id: 'source-canvas' };
const profiles = [];
const adapterApi = {};
const deps = {
  createOffscreenCanvas(width, height) {
    assert.strictEqual(width, 320);
    assert.strictEqual(height, 200);
    return snapshotCanvas;
  },
  getCanvas: () => sourceCanvas,
  getContext: () => drawCtx,
  getViewWidth: () => 320,
  getViewHeight: () => 200,
  getCamera: () => ({ x: 11, y: 22 }),
  getCurrentZoom: () => 1.5,
  now: () => now,
  safeFixed: (value) => Number(Number(value || 0).toFixed(3)),
  shouldEmitProfile: () => true,
  emitRendererProfile: (tag, payload) => profiles.push({ tag, payload })
};

const initial = api.getZoomPreviewState(adapterApi);
assert.strictEqual(initial.active, false);
const capture = api.captureZoomPreviewFrame(adapterApi, deps, { source: 'unit-capture' });
assert.strictEqual(capture.ok, true);
assert.strictEqual(api.getZoomPreviewState(adapterApi).captureZoom, 1.5);
assert(drawCalls.some((call) => call[0] === 'preview.drawImage'), 'capture should copy current canvas into snapshot');

now = 1010;
const update = api.updateZoomPreviewState(adapterApi, deps, { targetZoom: 2.25, anchorScreenX: 10, anchorScreenY: 20, debounceMs: 150, source: 'unit-update' });
assert.strictEqual(update.ok, true);
assert.strictEqual(update.targetZoom, 2.25);
assert.strictEqual(api.shouldUseZoomPreviewFastPath(adapterApi, deps), true);
const payload = api.drawZoomPreviewFastPath(adapterApi, deps, { source: 'unit-draw' });
assert(payload, 'drawZoomPreviewFastPath should return payload while active');
assert.strictEqual(payload.scaleRatio, 1.5);
assert.strictEqual(profiles[0].tag, 'ZOOM-PREVIEW-FASTPATH');
assert(drawCalls.some((call) => call[0] === 'drawImage' && call[1] === snapshotCanvas), 'fast path should draw snapshot canvas');

now = 1300;
assert.strictEqual(api.shouldUseZoomPreviewFastPath(adapterApi, deps), false, 'expired preview should be cleared');
assert.strictEqual(api.getZoomPreviewState(adapterApi).active, false);
api.clearZoomPreviewState(adapterApi, deps, 'manual');
assert.strictEqual(api.getZoomPreviewState(adapterApi).reason, 'manual');

console.log(JSON.stringify({ status: 'PASS', tested: [ownerRel] }, null, 2));
