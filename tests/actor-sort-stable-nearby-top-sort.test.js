#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rel = 'src/presentation/render/actor-sort-stable.js';
const source = fs.readFileSync(path.join(root, rel), 'utf8');

const sandbox = {
  console,
  Math,
  Number,
  String,
  Object,
  Array,
  JSON,
  Date,
  Map,
  Set,
  localStorage: { getItem() { return null; } },
  window: {}
};
vm.runInNewContext(source, sandbox, { filename: rel });
const api = sandbox.window.__ACTOR_SORT_STABLE__;
assert(api, 'stable actor sort API should export');
assert.strictEqual(api.version, 'stable-actor-sort-v15-canonical-front-space-no-local-demerge-20260508');
assert.strictEqual(typeof api.packetActsAsNearbySameLevelTop, 'function');

const player = { x: 9.696, y: 9.984, z: 3, renderSortZ: 3 };
const supportTop = {
  id: 'support-top',
  kind: 'static-world-face-packet',
  semanticFace: 'top',
  sortKey: 99,
  tie: 1,
  box: { x: 9, y: 9, z: 2, w: 1, d: 1, h: 1 }
};
const nearbySameLevelTop = {
  id: 'nearby-top',
  kind: 'static-world-face-packet',
  semanticFace: 'top',
  sortKey: -16,
  tie: 2,
  box: { x: 10, y: 9, z: 2, w: 1, d: 1, h: 1 }
};
const farSameLevelTop = {
  id: 'far-top',
  kind: 'static-world-face-packet',
  semanticFace: 'top',
  sortKey: -14,
  tie: 3,
  box: { x: 20, y: 20, z: 2, w: 1, d: 1, h: 1 }
};

const deps = {
  computePlayerSortMeta: () => ({ sortKey: -16.6793, tie: 700000 }),
  compareRenderables: (a, b) => (Number(a.sortKey || 0) - Number(b.sortKey || 0)) || (Number(a.tie || 0) - Number(b.tie || 0))
};

for (const rotation of [0, 1, 2, 3]) {
  const result = api.applyStablePlayerFaceSort({
    staticRenderables: [supportTop, nearbySameLevelTop, farSameLevelTop],
    player,
    viewRotation: rotation,
    helpers: deps
  });
  const support = result.staticRenderables.find((r) => r.id === 'support-top');
  const nearby = result.staticRenderables.find((r) => r.id === 'nearby-top');
  const far = result.staticRenderables.find((r) => r.id === 'far-top');
  assert.strictEqual(support.actorStableSortRelation, 'support-top-before-player', `rotation ${rotation}: support top should be protected`);
  assert.strictEqual(nearby.actorStableSortRelation, undefined, `rotation ${rotation}: nearby same-level top must not be rewritten`);
  assert.strictEqual(nearby.sortKey, nearbySameLevelTop.sortKey, `rotation ${rotation}: nearby same-level top sortKey must stay canonical/static`);
  assert.strictEqual(far.actorStableSortRelation, undefined, `rotation ${rotation}: far top must not be rewritten`);
  assert.strictEqual(result.overrideCount, 1, `rotation ${rotation}: only support top override expected`);
}

assert.strictEqual(api.packetActsAsNearbySameLevelTop(nearbySameLevelTop, player, 2), false, 'v15 nearby top rule must be inert');
assert.strictEqual(JSON.stringify(api.getPlayerTopSortLevels({ z: 2, renderSortZ: 2.5 })), JSON.stringify([2.5]), 'player top sort level helper remains simple compatibility utility');
assert.strictEqual(api.topZMatchesPlayerTopSortLevels(3, player), false, 'v15 topZ matching helper must be inert outside support top ownership');

console.log(JSON.stringify({ status: 'PASS', test: 'actor-sort-stable-nearby-top-sort' }, null, 2));
