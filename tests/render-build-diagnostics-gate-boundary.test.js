#!/usr/bin/env node
/* P11a-7 render build diagnostics gate boundary smoke test. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rel = 'src/presentation/render/diagnostics/render-build-diagnostics-gate.js';
const diagnosticsRel = 'src/presentation/render/diagnostics/render-diagnostics.js';
const renderRel = 'src/presentation/render/render.js';
const indexRel = 'index.html';
const source = fs.readFileSync(path.join(root, rel), 'utf8');
const renderSource = fs.readFileSync(path.join(root, renderRel), 'utf8');
const indexSource = fs.readFileSync(path.join(root, indexRel), 'utf8');

function bodyOf(src, functionName) {
  const start = src.indexOf(`function ${functionName}(`);
  if (start < 0) return '';
  const open = src.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return '';
}

assert(indexSource.indexOf(diagnosticsRel) >= 0, 'index.html must load render diagnostics');
assert(indexSource.indexOf(rel) >= 0, 'index.html must load render build diagnostics gate');
assert(indexSource.indexOf(diagnosticsRel) < indexSource.indexOf(rel), 'diagnostics must load before diagnostics gate');
assert(indexSource.indexOf(rel) < indexSource.indexOf(renderRel), 'diagnostics gate must load before render.js');
assert(source.includes("layer: 'presentation/render/diagnostics'"), 'module must identify presentation/render/diagnostics layer');
assert(source.includes("phase: 'P11a-7'"), 'module must identify P11a-7 phase');

for (const forbidden of ['localStorage', 'sessionStorage', 'fetch(', 'document.', 'canvas', 'ctx.', 'new Image', 'buildMainFrameRenderables']) {
  assert(!source.includes(forbidden), `${rel} must not contain ${forbidden}`);
}

for (const marker of [
  'function requireRenderBuildDiagnosticsGateForRender()',
  'function createRenderBuildDiagnosticsGateDepsForRender()',
  'P11a-7 note: detailed static/chunk/color build diagnostic emitter gating'
]) {
  assert(renderSource.includes(marker), `render.js missing build diagnostics gate marker ${marker}`);
}

for (const fn of [
  'emitChunkRebuildBreakdown',
  'emitChunkRebuildDetail',
  'emitColorBuildDetail',
  'emitStep4ColorBuildDetail',
  'emitStep4ColorBuildScopeVerify',
  'emitLightingShadowBypassVerify',
  'emitStep4ShadowPathSummary'
]) {
  const body = bodyOf(renderSource, fn);
  assert(body.includes('emitRenderBuildDiagnostic(') || body.includes('requireRenderBuildDiagnosticsGateForRender()'), `${fn} must delegate to diagnostics gate owner`);
  assert(!body.includes('isDetailedTerrainProfilingEnabledForRender()'), `${fn} must not own detailed profiling gate`);
  assert(!body.includes('requireRenderDiagnosticsForRender().'), `${fn} must not call render diagnostics directly`);
}

const sandbox = { console, Math, Number, String, Object, Error };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: rel });
const api = sandbox.IsometricRenderBuildDiagnosticsGate;
assert(api, 'diagnostics gate API should be exported');
for (const fn of [
  'emitChunkRebuildBreakdown',
  'emitChunkRebuildDetail',
  'emitChunkRebuildScopeVerify',
  'emitStaticRenderableBuildDetail',
  'emitColorBuildDetail',
  'emitStep4ColorBuildDetail',
  'emitStep4ColorBuildScopeVerify',
  'emitLightingShadowBypassVerify',
  'emitStep4ShadowPathSummary'
]) {
  assert.strictEqual(typeof api[fn], 'function', `missing ${fn}`);
}

const calls = [];
const diagnostics = new Proxy({}, {
  get(_target, prop) {
    return function(payload) {
      calls.push({ name: String(prop), payload });
      return String(prop) + ':ok';
    };
  }
});
let detailed = false;
const deps = {
  requireRenderDiagnosticsForRender() { return diagnostics; },
  isDetailedTerrainProfilingEnabledForRender() { return detailed; }
};

assert.strictEqual(api.emitColorBuildDetail({ a: 1 }, deps), null, 'detailed color logs should be gated off');
assert.strictEqual(calls.length, 0, 'gated-off detailed logs must not call diagnostics');
assert.strictEqual(api.emitChunkRebuildBreakdown({ chunks: 1 }, deps), 'emitChunkRebuildBreakdown:ok', 'ungated breakdown should forward');
assert.strictEqual(calls[calls.length - 1].name, 'emitChunkRebuildBreakdown');
assert.strictEqual(api.emitStep4ColorBuildScopeVerify({ scope: 1 }, deps), 'emitStep4ColorBuildScopeVerify:ok', 'scope verify should forward without detailed gate');
assert.strictEqual(api.emitLightingShadowBypassVerify({ bypass: true }, deps), 'emitLightingShadowBypassVerify:ok', 'lighting bypass verify should forward without detailed gate');

detailed = true;
assert.strictEqual(api.emitColorBuildDetail({ a: 2 }, deps), 'emitColorBuildDetail:ok', 'detailed color logs should forward when enabled');
assert.strictEqual(calls[calls.length - 1].name, 'emitColorBuildDetail');
assert.strictEqual(api.emitStep4ColorBuildDetail({ step: 4 }, deps), 'emitStep4ColorBuildDetail:ok', 'step4 detail should forward when enabled');
assert.strictEqual(calls[calls.length - 1].name, 'emitStep4ColorBuildDetail');

console.log('PASS render-build-diagnostics-gate-boundary');
