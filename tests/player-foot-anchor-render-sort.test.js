
const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}
const context = { window: { __APP_NAMESPACE: { bind() {} } }, console, Math, Number, String, Object, Array, JSON };
vm.createContext(context);
runFile(context, 'src/core/domain/scene-domain-core.js');
const api = context.__APP_CORE_SCENE_DOMAIN_CORE__;
assert(api && typeof api.computePlayerActorRenderableSort === 'function', 'scene core should expose foot-anchor actor sort');
const actor = api.computePlayerActorRenderableSort({ player: { x: 2.5, y: 3.5, z: 1 }, viewRotation: 0 });
const support = api.computeVoxelRenderableSort({ cell: { x: 2, y: 3, z: 0, h: 1 } });
assert(actor.sortMode === 'player-foot-anchor', 'actor sort should use foot-anchor mode');
assert(api.compareRenderableOrder(support, actor) < 0, 'supporting one-high voxel should draw before actor standing on z=1');
const before = api.computePlayerActorRenderableSort({ player: { x: 1, y: 1, z: 0 }, viewRotation: 0 });
const after = api.computePlayerActorRenderableSort({ player: { x: 1, y: 3, z: 0 }, viewRotation: 0 });
assert(api.compareRenderableOrder(before, after) < 0, 'larger screen-depth foot anchor should draw later');

const logicalJumpTarget = api.computePlayerActorRenderableSort({ player: { x: 1, y: 1, z: 3 }, viewRotation: 0 });
const stepSortInFlight = api.computePlayerActorRenderableSort({ player: { x: 1, y: 1, z: 3, visualZ: 2.75, renderSortZ: 2.25 }, viewRotation: 0 });
assert(stepSortInFlight.sortKey < logicalJumpTarget.sortKey, 'in-flight stair actor sort should follow renderSortZ instead of snapping to logical z');
assert(Math.abs(stepSortInFlight.depthAnchor.z - 2.25) < 1e-9, 'player depth anchor should expose renderSortZ while stair movement is in flight');
const visualFallbackInFlight = api.computePlayerActorRenderableSort({ player: { x: 1, y: 1, z: 3, visualZ: 2.25 }, viewRotation: 0 });
assert(Math.abs(visualFallbackInFlight.depthAnchor.z - 2.25) < 1e-9, 'visualZ remains a fallback when renderSortZ is absent');

// Rotation-aware static voxel sorting must use the voxel footprint anchor in
// view-space, not the unrotated logical min-corner. Otherwise rotation=2 makes
// lower objects at/near the actor footprint draw after the actor even though the
// same front-view relation is correct.
const backActor = api.computePlayerActorRenderableSort({ player: { x: 2.979, y: 2.441, z: 2, renderSortZ: 2 }, viewRotation: 2 });
const lowerTableVoxelBack = api.computeVoxelRenderableSort({ cell: { x: 2, y: 2, z: 0, w: 1, d: 1, h: 1 }, viewRotation: 2 });
assert(api.compareRenderableOrder(lowerTableVoxelBack, backActor) < 0, 'rotation=2 lower voxel footprint should draw before elevated actor, matching front-view relation');
assert(lowerTableVoxelBack.sortMode === 'voxel-footprint-anchor', 'static voxel sort should expose footprint-anchor mode');

console.log('player-foot-anchor-render-sort.test.js: OK');
