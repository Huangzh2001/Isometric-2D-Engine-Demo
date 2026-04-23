const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function runFile(context, relPath) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8'), context, { filename: relPath });
}
const bindings = {};
const context = { window: { __APP_NAMESPACE: { bind(path, api) { bindings[path] = api; } } }, console, Math, Number, String, Object, Array, JSON, Set, Map };
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
runFile(context, 'src/core/state/prefab-registry.js');
const api = bindings['domain.itemFacingCore'] || context.window.__ITEM_FACING_CORE__;
const registry = bindings['state.prefabRegistry'];
assert(api && typeof api.buildDebugCuboidFaceRenderables === 'function', 'facing core should expose buildDebugCuboidFaceRenderables');
assert(registry && typeof registry.getPrefabById === 'function', 'prefab registry should expose getPrefabById');
const cube = registry.getPrefabById('debug_cube_5faces');
const rect = registry.getPrefabById('debug_rect_2x1_5faces');
const cubeRes = api.buildDebugCuboidFaceRenderables({ prefab: cube, itemFacing: 1, viewRotation: 0, ownerId: 'instance:test-cube', cells: [{ x: 4, y: 4, z: 0 }], occupiedSet: new Set(['4,4,0']) });
const rectRes = api.buildDebugCuboidFaceRenderables({ prefab: rect, itemFacing: 1, viewRotation: 0, ownerId: 'instance:test-rect', cells: [{ x: 1, y: 1, z: 0 }, { x: 1, y: 2, z: 0 }], occupiedSet: new Set(['1,1,0','1,2,0']) });
assert(cubeRes.faceRenderables.length >= 3, 'placed cube should produce top + two visible sides');
assert(rectRes.faceRenderables.length >= 5, 'placed rect should produce multi-voxel face renderables');
assert(cubeRes.faceRenderables.every(f => f.textureId && f.semanticFace && Array.isArray(f.worldPts)), 'cube face renderables should carry textureId / semanticFace / worldPts');
assert(rectRes.faceRenderables.every(f => f.textureId && f.semanticFace && Array.isArray(f.worldPts)), 'rect face renderables should carry textureId / semanticFace / worldPts');
const cubeSem = new Set(cubeRes.faceRenderables.map(f => f.semanticFace));
assert(cubeSem.has('top'), 'placed cube should render top semantic face');
assert(cubeSem.size >= 3, 'placed cube should render top + two semantic side faces');
console.log('placed-instance-semantic-face-evidence.test.js: OK');
