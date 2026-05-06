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

const diagnosticsRel = 'src/presentation/render/diagnostics/render-diagnostics.js';
const renderRel = 'src/presentation/render/render.js';
const diagnosticsSource = read(diagnosticsRel);
const renderSource = read(renderRel);
const indexSource = read('index.html');

assert(diagnosticsSource.includes("layer: 'presentation/render/diagnostics'"), 'diagnostics module must declare diagnostics layer');
assert(diagnosticsSource.includes("phase: 'P8e'"), 'diagnostics module must declare P8e phase');
assert(indexOfOrFail(indexSource, diagnosticsRel) < indexOfOrFail(indexSource, renderRel), 'render diagnostics must load before render.js');
for (const marker of [
  'requireRenderDiagnosticsForRender().maybeLogStaticWorldChunkSummary',
  'requireRenderDiagnosticsForRender().maybeLogRenderFrameSummary',
  'requireRenderDiagnosticsForRender().shouldForceExactVisibleSummary',
  'requireRenderDiagnosticsForRender().maybeLogStaticBoxCacheProfile',
  'requireRenderDiagnosticsForRender().captureStaticBoxCacheFrameState'
]) {
  assert(renderSource.includes(marker), `render.js missing diagnostics delegation marker: ${marker}`);
}
for (const forbidden of [
  '__lastRenderFrameSummaryLogAt',
  '__lastStaticBoxCacheProfileLogAt',
  '__currentRenderFrameStaticCacheState',
  "var line = '[STATIC-BOX-CACHE-PROFILE] '"
]) {
  assert(!renderSource.includes(forbidden), `render.js still owns diagnostic state/body: ${forbidden}`);
}

const logs = [];
let now = 1000;
const sandbox = {
  console,
  performance: { now: () => now },
  pushLog(line) { logs.push(line); }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(diagnosticsSource, sandbox, { filename: diagnosticsRel });
const api = sandbox.IsometricRenderDiagnostics;
assert(api, 'diagnostics API should be exported');
assert.strictEqual(api.layer, 'presentation/render/diagnostics');
assert.strictEqual(api.phase, 'P8e');

assert.strictEqual(api.shouldForceExactVisibleSummary({ remaining: 1 }, now), true, 'active terrain first-frame window should force exact visible summary');
assert.strictEqual(api.shouldForceExactVisibleSummary({ remaining: 0 }, now), true, 'before first summary log, exact visible summary should be forced');

const firstFrame = api.maybeLogRenderFrameSummary({ cameraX: 1, cameraY: 2, zoom: 1, visibleInstances: 3, totalBoxes: 4 });
assert.strictEqual(firstFrame, true, 'first render frame summary should log');
assert(logs.some((line) => line.startsWith('[RENDER-FRAME-SUMMARY] ')), 'render frame summary should emit log line');
const suppressedFrame = api.maybeLogRenderFrameSummary({ cameraX: 1, cameraY: 2, zoom: 1, visibleInstances: 3, totalBoxes: 4 });
assert.strictEqual(suppressedFrame, false, 'duplicate render frame summary inside throttle window should suppress');
assert.strictEqual(api.shouldForceExactVisibleSummary({ remaining: 0 }, now), false, 'recent summary log should suppress exact visible summary force');
now += 6000;
const secondFrame = api.maybeLogRenderFrameSummary({ cameraX: 1, cameraY: 2, zoom: 1, visibleInstances: 3, totalBoxes: 4 });
assert.strictEqual(secondFrame, true, 'same render frame summary after throttle window should log');

const profile = { cacheHit: false, visibleChunkCount: 2 };
api.captureStaticBoxCacheFrameState({ rebuilt: true, buildMs: 7, cacheHit: false, invalidationReason: 'dirty', totalMs: 8, profile });
assert.deepStrictEqual(api.getCurrentRenderFrameStaticCacheState().profile, profile, 'captured profile should be retained in current frame state');
assert.deepStrictEqual(api.getLastStaticBoxCacheProfile(), profile, 'last profile should be exposed through diagnostics API');
api.beginRenderFrameDiagnosticState();
assert.strictEqual(api.getCurrentRenderFrameStaticCacheState().rebuilt, false, 'begin frame should reset current diagnostic state');

assert.strictEqual(api.emitChunkRebuildBreakdown({ chunks: 1 }).startsWith('[CHUNK-REBUILD-BREAKDOWN] '), true, 'chunk rebuild breakdown should emit tagged log');
assert.strictEqual(api.emitTerrainFirstFramesDetail({ frame: 1 }).startsWith('[TERRAIN-FIRST-FRAMES-DETAIL] '), true, 'terrain detail emitter should emit tagged log');

console.log('PASS render-diagnostics');
