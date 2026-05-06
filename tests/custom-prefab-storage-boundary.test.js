#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const ownerRel = 'src/infrastructure/assets/custom-prefab-storage.js';
const facadeRel = 'src/infrastructure/assets/asset-management.js';
const indexSource = read('index.html');
assert(indexSource.includes(ownerRel), 'index.html must load custom-prefab-storage.js');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(facadeRel), 'custom prefab storage must load before asset-management.js');

const storage = {};
const context = {
  console,
  Date,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Promise,
  window: {},
};
context.window = context;
context.localStorage = {
  setItem: (key, value) => { storage[key] = String(value); },
  getItem: (key) => Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null,
};
context.LOCAL_PREFAB_STORAGE_KEY = 'test-prefabs';
context.prototypes = [
  { id: 'custom_a', name: 'Custom A', custom: true, assetManaged: false },
  { id: 'asset_a', name: 'Asset A', custom: true, assetManaged: true },
  { id: 'stock_a', name: 'Stock A', custom: false, assetManaged: false },
];
context.prefabToSerializable = (prefab) => ({ id: prefab.id, name: prefab.name, custom: !!prefab.custom });
context.sceneStorageAvailable = () => true;
context.detailLog = (msg) => { context.lastDetail = msg; };
context.pushLog = (msg) => { context.lastLog = msg; };
context.importPrefabDefinition = (def, options) => { context.imported = context.imported || []; context.imported.push({ def, options }); return def; };
context.scheduleLegacyHabboRepairs = (reason) => { context.repairReason = reason; };
vm.createContext(context);
runFile(context, ownerRel);
const api = context.__CUSTOM_PREFAB_STORAGE__;
assert(api, 'custom prefab storage API missing');
assert.strictEqual(api.owner, ownerRel);

const listed = api.listCustomPrefabs();
assert.deepStrictEqual(listed, [{ id: 'custom_a', name: 'Custom A', custom: true }]);
assert.strictEqual(api.saveCustomPrefabsToLocalStorage(), true, 'save should succeed');
assert(storage['test-prefabs'].includes('custom_a'), 'localStorage should include custom prefab');
assert(!storage['test-prefabs'].includes('asset_a'), 'asset-managed prefab must not be persisted as custom');
storage['test-prefabs'] = JSON.stringify([{ id: 'loaded_a', name: 'Loaded A', voxels: [] }]);
assert.strictEqual(api.loadCustomPrefabsFromLocalStorage(), true, 'load should succeed');
assert.strictEqual(context.imported.length, 1, 'load should import stored prefab');
assert.strictEqual(context.imported[0].options.source, 'localStorage');
assert.strictEqual(context.repairReason, 'localStorage-prefabs');
console.log('PASS custom-prefab-storage-boundary');
