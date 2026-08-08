#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const diagnosticsRel = 'src/presentation/render/renderer/canvas2d-frame-diagnostics.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
const main1BundleRel = 'dist/bundles/main-1.bundle.js';
const main2BundleRel = 'dist/bundles/main-2.bundle.js';
const indexSource = read('index.html');

const loadsDirectSources = indexSource.indexOf(diagnosticsRel) >= 0 || indexSource.indexOf(rendererRel) >= 0;
if (loadsDirectSources) {
  assert(indexSource.indexOf(diagnosticsRel) >= 0, 'index.html must load canvas2d-frame-diagnostics.js');
  assert(indexSource.indexOf(rendererRel) >= 0, 'index.html must load canvas2d-renderer.js');
  assert(indexSource.indexOf(diagnosticsRel) < indexSource.indexOf(rendererRel), 'frame diagnostics owner must load before renderer');
} else {
  assert(indexSource.indexOf(main1BundleRel) >= 0, 'index.html must load main-1.bundle.js');
  assert(indexSource.indexOf(main2BundleRel) >= 0, 'index.html must load main-2.bundle.js');
  assert(indexSource.indexOf(main1BundleRel) < indexSource.indexOf(main2BundleRel), 'main-1 bundle must load before main-2 bundle');
  const main1Bundle = read(main1BundleRel);
  const main2Bundle = read(main2BundleRel);
  assert(main1Bundle.indexOf(diagnosticsRel) >= 0, 'main-1 bundle must contain canvas2d-frame-diagnostics.js');
  assert(main2Bundle.indexOf(rendererRel) >= 0, 'main-2 bundle must contain canvas2d-renderer.js');
}

const appRoot = { renderer: { diagnostics: {} }, infrastructure: {} };
const binds = [];
const logs = [];
let now = 1000;
const context = {
  console,
  JSON,
  Math,
  Number,
  String,
  Object,
  Array,
  Date,
  window: null,
  performance: { now: () => now },
};
context.window = {
  App: appRoot,
  performance: context.performance,
  pushLog(line) { logs.push(line); },
  localStorage: {
    _values: Object.create(null),
    getItem(key) { return this._values[key] || null; },
    setItem(key, value) { this._values[key] = String(value); }
  },
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
runFile(context, diagnosticsRel);

const api = context.window.__CANVAS2D_FRAME_DIAGNOSTICS__;
assert(api, 'Canvas2D frame diagnostics API missing');
assert.strictEqual(api.owner, diagnosticsRel);
assert.strictEqual(appRoot.renderer.canvas2dFrameDiagnostics, api, 'should bind to renderer.canvas2dFrameDiagnostics');
assert.strictEqual(appRoot.renderer.diagnostics.canvas2dFrame, api, 'should bind to renderer.diagnostics.canvas2dFrame');
assert.strictEqual(api.safeFixed(1.23456), 1.235);
api.beginFunctionBreakdownFrame();
const frame = api.getFunctionBreakdownFrame();
assert(frame && frame.timings && frame.counts && frame.extras, 'function breakdown frame should be initialized');
context.window.__LAST_BASEWORLD_PASSES_BREAKDOWN__ = { baseWorldPassesMs: 7 };
assert.strictEqual(api.getLastBaseWorldPassesBreakdown().baseWorldPassesMs, 7);
const cloned = api.cloneSimpleObject({ a: 1, b: 'x', c: true, nested: { no: true }, fn() {} });
assert.strictEqual(JSON.stringify(cloned), JSON.stringify({ a: 1, b: 'x', c: true }));
const p5Line = api.emitP5('BOOT', 'unit-ready', { ok: true });
assert(p5Line.includes('[P5][BOOT] unit-ready'), 'P5 log line should be formatted by owner');
const profileLine = api.emitRendererProfile('UNIT-PROFILE', { ms: 1 });
assert(profileLine.includes('[UNIT-PROFILE]'), 'profile line should be formatted by owner');
assert(logs.some((line) => line.includes('unit-ready')), 'P5 log should route through pushLog');
assert(logs.some((line) => line.includes('UNIT-PROFILE')), 'profile log should route through pushLog');
assert.strictEqual(api.isDetailedRendererProfilingEnabled(), false);
context.window.__DETAILED_RENDER_PROFILE__ = true;
assert.strictEqual(api.isDetailedRendererProfilingEnabled(), true);
context.window.__DETAILED_RENDER_PROFILE__ = false;
context.window.localStorage.setItem('detailedRenderProfile', '1');
assert.strictEqual(api.isDetailedRendererProfilingEnabled(), true);
const adapterApi = {};
now = 1000;
assert.strictEqual(api.shouldEmitProfile(adapterApi, 'unit', 'sig-a', 100), true, 'first profile event should emit');
now = 1100;
assert.strictEqual(api.shouldEmitProfile(adapterApi, 'unit', 'sig-b', 100), true, 'detailed profile mode should use requested gap for changed signatures');
context.window.localStorage._values = Object.create(null);
now = 1110;
assert.strictEqual(api.shouldEmitProfile(adapterApi, 'unit', 'sig-b', 100), false, 'non-detailed mode should throttle repeated signature');
let recorded = null;
context.window.__ITEM_ROTATION_DIAGNOSTIC__ = { record(kind, payload) { recorded = { kind, payload }; } };
api.recordDrawDiagnostic('draw-unit', { ok: 1 });
assert.strictEqual(JSON.stringify(recorded), JSON.stringify({ kind: 'draw-unit', payload: { ok: 1 } }));
assert(binds.some((entry) => entry.pathName === 'renderer.canvas2dFrameDiagnostics' && entry.meta && entry.meta.owner === diagnosticsRel), 'namespace bind should include owner');

console.log(JSON.stringify({ status: 'PASS', tested: [diagnosticsRel] }, null, 2));
