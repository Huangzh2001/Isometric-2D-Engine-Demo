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
const facadeRel = 'src/presentation/render/diagnostics/render-diagnostics-facade.js';
const renderRel = 'src/presentation/render/render.js';
const facadeSource = read(facadeRel);
const renderSource = read(renderRel);
const indexSource = read('index.html');
assert(indexOfOrFail(indexSource, facadeRel) < indexOfOrFail(indexSource, renderRel), 'diagnostics facade must load before render.js');
assert(facadeSource.includes("phase: 'P12b-4'"), 'facade should declare P12b-4 phase');
for (const moved of [
  'function getRenderDiagnosticsApiForRender',
  'function requireRenderDiagnosticsForRender',
  'function emitRenderFrameSummary',
  'function maybeLogRenderFrameSummary',
  'function emitChunkRebuildBreakdown',
  'function recordRenderFunctionTiming',
  'function getTerrainFrameLogContextForRender'
]) {
  assert(facadeSource.includes(moved), `facade missing ${moved}`);
  assert(!renderSource.includes(moved), `render.js still owns ${moved}`);
}
const calls = [];
const diagApi = {
  emitRenderFrameSummary(payload) { calls.push(['emitRenderFrameSummary', payload]); return 'frame'; },
  maybeLogRenderFrameSummary(payload) { calls.push(['maybeLogRenderFrameSummary', payload]); return true; },
  shouldForceExactVisibleSummary(win, now) { calls.push(['shouldForceExactVisibleSummary', win, now]); return false; },
  emitTerrainFirstFramesDetail(payload) { calls.push(['emitTerrainFirstFramesDetail', payload]); return 'terrain-detail'; },
  getLastStaticBoxCacheProfile() { return { ok: true }; }
};
const gateApi = {
  emitChunkRebuildBreakdown(payload, deps) { calls.push(['gate', payload, !!deps.requireRenderDiagnosticsForRender]); return 'chunk'; }
};
const sandbox = {
  console,
  __RENDER_DIAGNOSTICS__: diagApi,
  __RENDER_BUILD_DIAGNOSTICS_GATE__: gateApi,
  getTerrainRenderSettingsForRender() { return { terrainDetailedProfilingEnabled: true }; },
  getTerrainRuntimeModelForRender() { return { activeTerrainBatchId: 'terrain-batch-1' }; },
  __terrainFirstFrameWindow: { terrainBatchId: 'terrain-batch-1', remaining: 2, nextFrameIndex: 3 },
  __lastObservedTerrainBatchIdForFrames: null
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(facadeSource, sandbox, { filename: facadeRel });
assert(sandbox.IsometricRenderDiagnosticsFacade, 'facade API should export');
assert.strictEqual(sandbox.emitRenderFrameSummary({ id: 1 }), 'frame', 'global emitRenderFrameSummary should delegate');
assert.strictEqual(sandbox.emitChunkRebuildBreakdown({ chunks: 2 }), 'chunk', 'build diagnostics should delegate through gate');
assert.strictEqual(sandbox.emitTerrainFirstFramesDetail({ frame: 3 }), 'terrain-detail', 'terrain detail should delegate when enabled');
const terrainContext = sandbox.getTerrainFrameLogContextForRender();
assert.strictEqual(terrainContext.terrainBatchId, 'terrain-batch-1', 'terrain frame context should expose terrain batch id');
assert.strictEqual(terrainContext.frameIndexAfterTerrainApply, 3, 'terrain frame context should use global frame window');
sandbox.recordRenderFunctionTiming('render.test', 1.23456, { visible: 2, ignored: { nested: true } });
assert.strictEqual(sandbox.__RENDER_FUNCTION_BREAKDOWN__.timings['render.test'], 1.235, 'function timing should round to 3 decimals');
assert.strictEqual(sandbox.__RENDER_FUNCTION_BREAKDOWN__.extras.visible, 2, 'simple extras should be retained');
assert.strictEqual(sandbox.__RENDER_FUNCTION_BREAKDOWN__.extras.ignored, undefined, 'object extras should be ignored');
sandbox.setLastBaseWorldPassesBreakdown({ draw: 1 });
assert.strictEqual(sandbox.__LAST_BASEWORLD_PASSES_BREAKDOWN__.draw, 1, 'base world breakdown should be stored globally');
assert(calls.some((entry) => entry[0] === 'emitRenderFrameSummary'), 'render frame call should be recorded');
console.log('PASS render-diagnostics-facade-boundary');
