#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rel = 'src/presentation/render/interaction/actor-support-top-sort-override.js';
const source = fs.readFileSync(path.join(root, rel), 'utf8');
const renderSource = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function assertLoadsBefore(before, after) {
  const beforeIdx = indexHtml.indexOf(before);
  const afterIdx = indexHtml.indexOf(after);
  assert(beforeIdx >= 0, `missing ${before}`);
  assert(afterIdx >= 0, `missing ${after}`);
  assert(beforeIdx < afterIdx, `${before} must load before ${after}`);
}

assertLoadsBefore('src/presentation/render/interaction/stable-local-demerge.js', rel);
assertLoadsBefore(rel, 'src/presentation/render/render.js');
assert(source.includes("owner: 'actor-support-top-sort-override'"), 'owner metadata should identify support-top owner');
assert(source.includes('player support-top sort override only'), 'owner should describe support-top-only responsibility');
assert(!/\bctx\s*\./.test(source), 'support-top owner must not draw through ctx');
assert(!/\bdocument\s*\./.test(source), 'support-top owner must not access DOM');
assert(!/\blocalStorage\s*\./.test(source), 'support-top owner must not access localStorage');
assert(!source.includes('actor-interaction-replacement-packet'), 'support-top owner must not own replacement packet construction');
assert(!source.includes('applyActorInteractionReplacementToRenderables'), 'support-top owner must not own replacement pipeline');
assert(renderSource.includes('requireActorSupportTopSortOverrideForRender'), 'render.js should require support-top owner');
assert(renderSource.includes('return requireActorSupportTopSortOverrideForRender().applyPlayerSupportTopSortOverrideToRenderables'), 'support-top override should delegate');
assert(!renderSource.includes("actorInteractionSupportTopSortOverride: true,\n      actorInteractionSupportFloor: true"), 'render.js must not retain support-top clone body');

const sandbox = { window: {}, console, Math, Number, String, Object, Array, JSON, Date, Map, Set };
vm.runInNewContext(source, sandbox, { filename: rel });
const api = sandbox.window.__ACTOR_SUPPORT_TOP_SORT_OVERRIDE__;
assert(api, 'support-top owner should expose global API');
assert.strictEqual(typeof api.applyPlayerSupportTopSortOverrideToRenderables, 'function');

let diagTag = null;
const deps = {
  getStableActorSortApiForRender: () => null,
  isStableActorSortModeEnabledForRender: () => true,
  computeActorInteractionPlayerSortMeta: () => ({ sortKey: 10, tie: 100 }),
  compareRenderablesByDomain: (a, b) => (a.sortKey - b.sortKey) || (a.tie - b.tie),
  summarizeActorDiagRenderable: (r) => ({ id: r.id, sortKey: r.sortKey }),
  summarizeActorDiagPlayer: (p) => ({ x: p.x, y: p.y, z: p.z }),
  emitActorInteractionOrderDiag: (tag) => { diagTag = tag; },
  isActorInteractionOrderDiagEnabled: () => true,
  normalizeMainEditorViewRotationValue: (v) => Number(v || 0),
  buildActorInteractionGroupSummaryMapFromPackets: () => new Map(),
  doesTopPacketActAsPlayerSupportFloor: (packet) => packet && packet.id === 'support'
};
const result = api.applyPlayerSupportTopSortOverrideToRenderables([{ id: 'support', kind: 'static-world-face-packet', sortKey: 99, tie: 8 }, { id: 'other', sortKey: 20, tie: 1 }], { x: 0, y: 0, z: 0 }, 0, deps);
assert.strictEqual(result.overrideCount, 1);
assert(result.staticRenderables.some((r) => r.actorInteractionSupportTopSortOverride), 'support packet should be cloned with override flag');
assert.strictEqual(diagTag, 'support-top-sort-override');

console.log(JSON.stringify({ status: 'PASS', test: 'actor-support-top-sort-override-boundary' }, null, 2));
