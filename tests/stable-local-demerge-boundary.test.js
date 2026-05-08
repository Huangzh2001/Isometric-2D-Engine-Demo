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
const ownerRel = 'src/presentation/render/interaction/stable-local-demerge.js';
const renderRel = 'src/presentation/render/render.js';
const ownerSource = read(ownerRel);
const renderSource = read(renderRel);
const indexSource = read('index.html');
assert(indexOfOrFail(indexSource, ownerRel) < indexOfOrFail(indexSource, renderRel), 'stable local demerge owner must load before render.js');
assert(ownerSource.includes("phase: 'P12b-6'"), 'stable local demerge owner should declare P12b-6 phase');
assert(renderSource.includes('P12b-6 note: stable local actor demerge is delegated'), 'render.js should document stable local demerge delegation');
for (const moved of [
  'var __stableLocalDemergeCache =',
  'var cell = descriptor && (descriptor.cell || descriptor.box) ? (descriptor.cell || descriptor.box) : null;',
  'var residualDescriptors = farMembers.length ? mergeActorInteractionResidualDescriptorsForPacket(packet, farMembers) : [];',
  "modeLabel === 'near-single' ? 'stable-local-demerge-near-player' : 'stable-local-demerge-residual-merged'",
]) {
  assert(!renderSource.includes(moved), `render.js still owns stable local demerge body marker: ${moved}`);
  assert(ownerSource.includes(moved), `owner should contain moved marker: ${moved}`);
}
const sandbox = { console, App: { presentation: { render: { interaction: {} } } } };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(ownerSource, sandbox, { filename: ownerRel });
const api = sandbox.IsometricStableLocalDemerge;
assert(api, 'stable local demerge API should export');
assert.strictEqual(api.__owner.phase, 'P12b-6', 'owner metadata should expose phase');
assert.strictEqual(api.buildStableLocalDemergeInteractionCellKey({ x: 1.2, y: 2.7, z: 3.1 }, {}), '1,2,3', 'interaction cell key should floor player cell');
assert.strictEqual(api.isActorInteractionDescriptorNearPlayerForLocalDemerge({ cell: { x: 1, y: 2, z: 3, w: 1, d: 1, h: 1 } }, { x: 1.2, y: 2.7, z: 3.1 }, 2, {}), true, 'near descriptor should be classified as local');
const noPlayer = api.applyStableActorSortDemergeToStaticRenderables([{ kind: 'static-world-face-packet' }], 0, null, {}, { getStableActorSortApiForRender() { return { shouldDemergeStaticPacket() { return false; } }; }, isStableActorSortModeEnabledForRender() { return true; } });
assert.strictEqual(noPlayer.mode, 'stable-local-demerge-no-player', 'no-player path should remain explicit');
const disabled = api.applyStableActorSortDemergeToStaticRenderables([{ kind: 'static-world-face-packet', actorInteractionMemberDescriptors: [{ cell: { x: 1, y: 2, z: 3, w: 1, d: 1, h: 1 } }, { cell: { x: 2, y: 2, z: 3, w: 1, d: 1, h: 1 } }] }], 0, { x: 1.2, y: 2.7, z: 3.1 }, {}, { getStableActorSortApiForRender() { return { shouldDemergeStaticPacket() { return true; } }; }, isStableActorSortModeEnabledForRender() { return true; } });
assert.strictEqual(disabled.mode, 'stable-local-demerge-disabled-by-default', 'local demerge should be disabled by default to preserve static terrain order');
assert.strictEqual(disabled.outputCount, 1, 'disabled local demerge must not split static packets');
console.log('PASS stable-local-demerge-boundary');
