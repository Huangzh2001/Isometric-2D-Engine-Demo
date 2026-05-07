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
const ownerRel = 'src/presentation/render/diagnostics/actor-interaction-order-diagnostics.js';
const renderRel = 'src/presentation/render/render.js';
const ownerSource = read(ownerRel);
const renderSource = read(renderRel);
const indexSource = read('index.html');
assert(indexOfOrFail(indexSource, ownerRel) < indexOfOrFail(indexSource, renderRel), 'actor diagnostics owner must load before render.js');
assert(ownerSource.includes("phase: 'P12b-5'"), 'actor diagnostics owner should declare P12b-5 phase');
assert(renderSource.includes('P12b-5 note: actor interaction order diagnostics are delegated'), 'render.js should document actor diagnostics delegation');
for (const moved of [
  'var __actorInteractionOrderDiagState =',
  'runtimeState.emittedCount += 1',
  "localStorage.getItem('actorSortDiag')",
  "lastCandidateSignature !== candidateSignature"
]) {
  assert(!renderSource.includes(moved), `render.js still owns actor diagnostics body marker: ${moved}`);
}
const logs = [];
const sandbox = {
  console: { log() {} },
  __ACTOR_SORT_DIAG__: true,
  pushLog(line) { logs.push(line); },
  Date: { now() { return 12345; } },
  localStorage: {
    getItem(key) { return key === 'actorSortDiag' ? '1' : null; }
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(ownerSource, sandbox, { filename: ownerRel });
const api = sandbox.IsometricActorInteractionOrderDiagnostics;
assert(api, 'actor diagnostics API should export');
assert.strictEqual(api.getActorInteractionSortRadiusForRender(), 2, 'sort radius should default to 2');
assert.strictEqual(api.isActorInteractionOrderDiagEnabled(), true, 'diag should be enabled by global/storage flags');
assert.strictEqual(api.noteActorInteractionRenderEntryForRender({ hasPushLog: true, totalInstances: 2, totalBoxes: 3 }), true, 'render-entry should emit when enabled');
assert(logs.some((line) => line.includes('[actor-sort-diag][render-entry]')), 'render-entry line should be exported');
const summary = api.summarizeActorDiagRenderable({ id: 'r1', kind: 'static-world-face-packet', sortKey: 1.23456, box: { instanceId: 'terrain-1', x: 1, y: 2, z: 3, terrainBatchId: 'b1' } });
assert.strictEqual(summary.id, 'r1', 'renderable summary should include id');
assert.strictEqual(summary.cell.terrain, true, 'cell summary should classify terrain cells');
assert.strictEqual(api.shouldEmitActorInteractionDiagSignature('candidate', 'abc'), true, 'first signature should emit');
assert.strictEqual(api.shouldEmitActorInteractionDiagSignature('candidate', 'abc'), false, 'duplicate signature should be suppressed');
api.logActorInteractionFinalOrderDiagnostics('frame-1', 5, [
  { id: 'static-1', kind: 'static-world-face-packet', semanticFace: 'top', box: { x: 0, y: 0, z: 0, h: 1 } },
  { id: 'player-avatar', kind: 'player-avatar' }
], {
  getPlayerForActorInteractionDiagnostics() { return { x: 0, y: 0, z: 1, dir: 'SE' }; },
  normalizeMainEditorViewRotationValue(value) { return Number(value) % 4; }
});
assert(logs.some((line) => line.includes('[actor-sort-diag][final-order-window]')), 'final order diagnostics should emit');
console.log('PASS actor-interaction-order-diagnostics-boundary');
