const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/instances/instance-renderable-builder.js'), 'utf8');
const exactPrefab = { id: 'habbo_exact_test', kind: 'habbo_import', renderUpdateMode: 'dynamic', habboLayerDirections: { '0': [{}] } };
let registryPrefab = exactPrefab;
const sandbox = {
  window: { App: { state: { prefabRegistry: { getPrefabByIdExact() { return registryPrefab; } } } } },
  Map,
  Math,
  Number,
  String,
  Object,
  Array,
  performance: { now: () => 0 },
  perfNow: () => 0,
  prefabHasSprite(prefab) { return !!(prefab && prefab.habboLayerDirections); },
  getPrefabById() { return { id: 'debug_cube_5faces', renderUpdateMode: 'dynamic' }; },
  prototypes: [],
  console
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'instance-renderable-builder.js' });
const instance = { instanceId: 'obj_test', prefabId: exactPrefab.id };
let split = sandbox.getDynamicInstanceSplitForRender([instance]);
assert.strictEqual(split.dynamicInstances.length, 1, 'exact Habbo prefab must classify as dynamic');
registryPrefab = null;
split = sandbox.getDynamicInstanceSplitForRender([instance]);
assert.strictEqual(split.dynamicInstances.length, 1, 'last exact Habbo prefab must be retained during transient registry gaps');
assert.strictEqual(split.staticInstances.length, 0, 'unrelated fallback prefab must never reclassify the Habbo instance');
console.log('PASS habbo-exact-prefab-retention');
