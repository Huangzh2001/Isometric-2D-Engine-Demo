
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
console.log('player-foot-anchor-render-sort.test.js: OK');
