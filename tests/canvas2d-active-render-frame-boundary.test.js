#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const ownerRel = 'src/presentation/render/renderer/canvas2d-active-render-frame.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
const pipelineRel = 'src/presentation/render/renderer/canvas2d-frame-pipeline.js';
const indexSource = read('index.html');
assert(indexSource.includes(ownerRel), 'index.html must load canvas2d-active-render-frame.js');
assert(indexSource.indexOf(pipelineRel) < indexSource.indexOf(ownerRel), 'active render frame owner must load after frame pipeline owner');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(rendererRel), 'active render frame owner must load before renderer');

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
const api = context.window.__CANVAS2D_ACTIVE_RENDER_FRAME__;
assert(api, 'Canvas2D active render frame API missing');
assert.strictEqual(api.owner, ownerRel);
assert.strictEqual(appRoot.renderer.canvas2dActiveRenderFrame, api, 'should bind renderer.canvas2dActiveRenderFrame');
assert.strictEqual(appRoot.renderer.diagnostics.canvas2dActiveRenderFrame.owner, ownerRel, 'should bind diagnostics metadata');
assert(binds.some((entry) => entry.pathName === 'renderer.canvas2dActiveRenderFrame' && entry.meta && entry.meta.owner === ownerRel));

let now = 1000;
const calls = [];
const logs = [];
const debugPayloads = [];
const debugState = { frame: 1, renderStep: 'initial' };
const framePlan = { id: 'plan-a', order: [{ id: 1 }, { id: 2 }, { id: 3 }] };
const adapterApi = {
  __interactionPipelineCapture: {
    active: true,
    interactionId: 'drag-1',
    interactionType: 'pan',
    frameIndex: 7,
    callCount: 1,
    calls: [{ callIndex: 1 }],
    activePreRunFramePipelineWallMs: 0,
    activePostRunFramePipelineWallMs: 0,
    activeWrapperGlueWallMs: 0,
    activeDebugHookWallMs: 0,
    activeDebugHookPreFlushWallMs: 0,
    activeDebugHookLogFlushWallMs: 0,
    activeDebugHookProfilerBookkeepingWallMs: 0,
    activeDebugHookRendererBookkeepingWallMs: 0,
    activeDebugHookCanvasSyncWallMs: 0,
    activeDebugHookBrowserSyncWallMs: 0,
    activeDebugHookPostFlushWallMs: 0,
    activeDebugHookResidualWallMs: 0
  }
};
const deps = {
  now: () => { now += 3; return now; },
  resolvePassApi: () => ({ id: 'pass-api' }),
  resolveRenderablesApi: () => ({ id: 'renderables-api' }),
  setPhase: (phase, step) => calls.push(`phase:${phase}:${step}`),
  getDebugState: () => debugState,
  getVerboseLog: () => false,
  getViewWidth: () => 800,
  getViewHeight: () => 600,
  getCanvas: () => ({ width: 1600, height: 1200 }),
  getBoxes: () => [{}, {}],
  getLights: () => [{}],
  getAssetsReady: () => true,
  beginRenderFrameDebug: (source, payload) => { debugPayloads.push({ source, payload }); },
  detailLog: (message) => logs.push(message),
  runFramePipeline: (passApi, renderablesApi) => {
    calls.push(`pipeline:${passApi.id}:${renderablesApi.id}`);
    return framePlan;
  },
  safeFixed: (value) => Number(Number(value || 0).toFixed(3))
};
const out = api.renderFrame(adapterApi, deps, { source: 'unit-test' });
assert.strictEqual(out, framePlan, 'renderFrame should return frame plan');
assert(calls.includes('phase:render:start'), 'renderFrame should set phase');
assert(calls.includes('pipeline:pass-api:renderables-api'), 'renderFrame should run frame pipeline');
assert.strictEqual(debugPayloads.length, 1, 'debug hook should be called');
assert.strictEqual(debugPayloads[0].source, 'renderer.canvas2d:renderFrame');
assert.strictEqual(debugPayloads[0].payload.canvasCss.w, 800);
assert.strictEqual(debugPayloads[0].payload.backing.h, 1200);
assert.strictEqual(debugPayloads[0].payload.boxes, 2);
assert.strictEqual(debugPayloads[0].payload.lights, 1);
assert(logs.some((message) => message.includes('renderer-adapter:start frame=1')), 'start log missing');
assert(logs.some((message) => message.includes('renderer-adapter:done frame=1 renderables=3')), 'done log missing');
assert.strictEqual(debugState.renderStep, 'done', 'debug state should be marked done');
assert.strictEqual(adapterApi.__inRenderFrame, false, 'renderFrame must clear in-frame flag');
assert(adapterApi.__lastActiveBreakdown, 'active breakdown missing');
assert.strictEqual(adapterApi.__lastActiveBreakdown.source, 'renderer.canvas2d:renderFrame');
assert(adapterApi.__lastActiveBreakdown.runFramePipelineWallMs >= 0, 'pipeline timing missing');
assert.strictEqual(adapterApi.__lastActiveDebugInteractionMeta.interactionId, 'drag-1');
assert(adapterApi.__interactionPipelineCapture.activeWrapperGlueWallMs >= 0, 'capture active wrapper timing missing');
assert.strictEqual(adapterApi.__interactionPipelineCapture.calls[0].activeWrapperGlueWallMs, adapterApi.__interactionPipelineCapture.activeWrapperGlueWallMs, 'last call should receive active timing');

assert.throws(() => api.renderFrame({}, Object.assign({}, deps, { resolvePassApi: () => null }), {}), /renderer\.passApi missing/, 'missing passApi should throw');

console.log('PASS canvas2d-active-render-frame-boundary');
