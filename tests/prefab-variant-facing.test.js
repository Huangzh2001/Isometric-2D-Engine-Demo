const fs = require('fs');
const path = require('path');
const vm = require('vm');
function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const context = {
  window: { __APP_NAMESPACE: { bind() {} } },
  console, Math, Number, String, Object, Array, JSON,
  editor: { prototypeIndex: 0 },
  ui: null,
  refactorLogCurrent: null,
  pushLog: null
};
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
runFile(context, 'src/core/state/prefab-registry.js');
const registry = context.window.__APP_NAMESPACE ? null : null;
const prefabVariant = context.prefabVariant || context.window.prefabVariant;
const prefab = {
  id: 'test_rot',
  name: 'RotTest',
  w: 2,
  d: 1,
  h: 2,
  anchor: { x: 0, y: 0, z: 0 },
  voxels: [ { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 1 } ],
  spriteDirections: { '0': { image: 'one' }, '1': { image: 'two' } }
};
const v0 = prefabVariant(prefab, 0);
const v1 = prefabVariant(prefab, 1);
const v2 = prefabVariant(prefab, 2);
const v3 = prefabVariant(prefab, 3);
assert(v0.w === 2 && v0.d === 1, 'rotation 0 should keep dims');
assert(v1.w === 1 && v1.d === 2, 'rotation 1 should swap dims');
assert(v2.w === 2 && v2.d === 1, 'rotation 2 should return to original dims');
assert(v3.w === 1 && v3.d === 2, 'rotation 3 should swap dims');
assert(v3.anchor.x === 0 && v3.anchor.y === 0, 'variant should carry rotated anchor');
assert(v1.itemFacingPrototype && v1.itemFacingPrototype.spriteStrategy === 'two-mirror', 'variant should expose sprite strategy prototype');
console.log('prefab-variant-facing.test.js: OK');
