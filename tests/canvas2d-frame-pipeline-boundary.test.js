#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const ownerRel = 'src/presentation/render/renderer/canvas2d-frame-pipeline.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
const indexSource = read('index.html');
assert(indexSource.includes(ownerRel), 'index.html must load canvas2d-frame-pipeline.js');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(rendererRel), 'frame pipeline owner must load before renderer');

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
  performance: { now: () => 1 },
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
const api = context.window.__CANVAS2D_FRAME_PIPELINE__;
assert(api, 'Canvas2D frame pipeline API missing');
assert.strictEqual(api.owner, ownerRel);
assert.strictEqual(appRoot.renderer.canvas2dFramePipeline, api, 'should bind renderer.canvas2dFramePipeline');
assert.strictEqual(appRoot.renderer.diagnostics.canvas2dFramePipeline.owner, ownerRel, 'should bind diagnostics metadata');
assert(binds.some((entry) => entry.pathName === 'renderer.canvas2dFramePipeline' && entry.meta && entry.meta.owner === ownerRel));

let now = 1000;
const calls = [];
const profiles = [];
const recorded = [];
const functionBreakdown = { timings: {}, counts: {}, extras: {} };
const adapterApi = {};
const passApi = {
  clearAndPaintMainBackground: () => calls.push('clear'),
  renderBaseWorldPasses: () => calls.push('base'),
  getLastBaseWorldPassesBreakdown: () => ({ baseWorldPassesWallMs: 6, floorLayerReusedDuringInteraction: true, baseWorldActualBranch: 'floor-layer' }),
  buildMainFrameRenderables: () => [{ id: 'fallback' }]
};
const renderablesApi = {
  buildFramePlan: () => ({ id: 'plan-1', currentViewRotation: 2, order: [{ id: 'a' }, { id: 'b' }] })
};
const deps = {
  now: () => { now += 5; return now; },
  getContext: () => ({ id: 'ctx' }),
  beginFunctionBreakdownFrame: () => { calls.push('begin-breakdown'); },
  getFunctionBreakdownFrame: () => functionBreakdown,
  drawZoomPreviewFastPath: () => null,
  drawRenderableOrder: (order, meta) => calls.push(`draw:${order.length}:${meta.framePlanId}:${meta.currentViewRotation}`),
  drawOverlayPasses: (meta) => calls.push(`overlay:${meta.source}`),
  drawHudPass: (meta) => calls.push(`hud:${meta.source}`),
  applyMainCameraWorldTransform: (ctx, callback) => { calls.push(`camera:${ctx.id}`); callback(); },
  shouldEmitProfile: () => true,
  emitRendererProfile: (tag, payload) => profiles.push({ tag, payload }),
  cloneSimpleObject: (value) => Object.assign({}, value || {}),
  recordInteractionPipelineCall: (payload) => recorded.push(payload),
  safeFixed: (value) => Number(Number(value || 0).toFixed(3))
};
const framePlan = api.runFramePipeline(adapterApi, deps, passApi, renderablesApi);
assert.strictEqual(framePlan.id, 'plan-1', 'normal pipeline should return built frame plan');
for (const expected of ['begin-breakdown', 'clear', 'camera:ctx', 'base', 'draw:2:plan-1:2', 'overlay:renderer.canvas2d:drawOverlayPasses', 'hud:renderer.canvas2d:drawHudPass']) {
  assert(calls.includes(expected), `missing pipeline call ${expected}`);
}
assert(adapterApi.__lastPipelineBreakdown, 'pipeline should publish last breakdown');
assert.strictEqual(adapterApi.__lastPipelineBreakdown.framePlanId, 'plan-1');
assert.strictEqual(adapterApi.__lastPipelineBreakdown.baseWorldActualBranch, 'floor-layer');
assert.strictEqual(recorded.length, 1, 'pipeline should record interaction pipeline call');
assert(profiles.some((entry) => entry.tag === 'CANVAS2D-PIPELINE-BREAKDOWN'), 'pipeline profile missing');
assert(profiles.some((entry) => entry.tag === 'RENDER-FUNCTION-BREAKDOWN'), 'function breakdown profile missing');
assert.strictEqual(functionBreakdown.extras.framePlanId, 'plan-1', 'function breakdown should receive frame plan id');

const fastAdapter = {};
const fastDeps = Object.assign({}, deps, {
  drawZoomPreviewFastPath: () => ({ drawMs: 3, scaleRatio: 1.5 }),
  drawRenderableOrder: () => { throw new Error('fast path should not draw renderable order'); },
  drawOverlayPasses: () => { throw new Error('fast path should not draw overlays'); },
  drawHudPass: () => { throw new Error('fast path should not draw HUD'); },
  shouldEmitProfile: () => false,
  recordInteractionPipelineCall: (payload) => recorded.push(Object.assign({ fast: true }, payload))
});
const fastFramePlan = api.runFramePipeline(fastAdapter, fastDeps, passApi, renderablesApi);
assert.strictEqual(fastFramePlan.id, 'zoom-preview-fastpath');
assert.strictEqual(fastFramePlan.previewFastPath, true);
assert.strictEqual(fastAdapter.__lastPipelineBreakdown.zoomPreviewFastPathUsed, true);

console.log('PASS canvas2d-frame-pipeline-boundary');
