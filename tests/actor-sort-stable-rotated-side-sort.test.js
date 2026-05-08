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
assert.strictEqual(typeof api.classifySingleCellSideAgainstPlayer, 'function');

const player = { x: 10.5, y: 10.5, z: 3, renderSortZ: 3 };
const sidePacket = {
  id: 'side',
  kind: 'static-world-face-packet',
  semanticFace: 'east',
  sortKey: -18,
  tie: 1,
  box: { x: 10, y: 11, z: 3, w: 1, d: 1, h: 1, generatedBy: 'terrain-generator' }
};
const highTopPacket = {
  id: 'high-top',
  kind: 'static-world-face-packet',
  semanticFace: 'top',
  sortKey: -17,
  tie: 3,
  box: { x: 10, y: 11, z: 3, w: 1, d: 1, h: 1, generatedBy: 'terrain-generator' }
};
const supportPacket = {
  id: 'support',
  kind: 'static-world-face-packet',
  semanticFace: 'top',
  sortKey: 99,
  tie: 2,
  box: { x: 10, y: 10, z: 2, w: 1, d: 1, h: 1 }
};

const deps = {
  computePlayerSortMeta: () => ({ sortKey: -18.9993, tie: 700000 }),
  compareRenderables: (a, b) => (Number(a.sortKey || 0) - Number(b.sortKey || 0)) || (Number(a.tie || 0) - Number(b.tie || 0))
};

for (const rotation of [0, 1, 2, 3]) {
  const result = api.applyStablePlayerFaceSort({ staticRenderables: [sidePacket, highTopPacket, supportPacket], player, viewRotation: rotation, helpers: deps });
  const side = result.staticRenderables.find((r) => r.id === 'side');
  const highTop = result.staticRenderables.find((r) => r.id === 'high-top');
  const support = result.staticRenderables.find((r) => r.id === 'support');

  assert.strictEqual(side.actorStableSortRelation, undefined, `rotation ${rotation}: side packet must not be rewritten by a rotation-specific rule`);
  assert.strictEqual(side.sortKey, sidePacket.sortKey, `rotation ${rotation}: side sortKey must stay canonical/static`);
  assert.strictEqual(highTop.actorStableSortRelation, undefined, `rotation ${rotation}: high top packet must not be rewritten by a rotation-specific rule`);
  assert.strictEqual(highTop.sortKey, highTopPacket.sortKey, `rotation ${rotation}: high top sortKey must stay canonical/static`);
  assert.strictEqual(support.actorStableSortRelation, 'support-top-before-player', `rotation ${rotation}: only support top may be rewritten`);
  assert.strictEqual(result.overrideCount, 1, `rotation ${rotation}: exactly one support-top override expected`);
}

assert.strictEqual(api.classifySingleCellSideAgainstPlayer(sidePacket, player, 3), 'none', 'v15 compatibility side classifier must be inert');
assert.strictEqual(api.shouldApplyHighTerrainTopBeforePlayer(highTopPacket, player, 3), false, 'v15 high-top rule must be inert');
assert.strictEqual(api.shouldApplyNarrowHighSideSortOverride(sidePacket, player, 3, { accepted: true }), false, 'v15 narrow side rule must be inert');

console.log(JSON.stringify({ status: 'PASS', test: 'actor-sort-stable-rotated-side-sort' }, null, 2));
