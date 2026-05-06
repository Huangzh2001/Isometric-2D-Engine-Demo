#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const ownerRel = 'src/presentation/ui/prefab-select-refresh.js';
const facadeRel = 'src/infrastructure/assets/asset-management.js';
const indexSource = read('index.html');
assert(indexSource.includes(ownerRel), 'index.html must load prefab-select-refresh.js');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(facadeRel), 'prefab select refresh owner must load before asset-management.js');

const context = { console, Date, JSON, String, Number, Boolean, Object, Array, Math, Error, window: {} };
context.window = context;
vm.createContext(context);
runFile(context, ownerRel);
const api = context.__PREFAB_SELECT_REFRESH__;
assert(api, 'prefab select refresh API missing');
assert.strictEqual(api.owner, ownerRel);

const options = [];
const select = {
  value: '',
  options,
  appendChild: (node) => { options.push(node); },
};
Object.defineProperty(select, 'innerHTML', {
  get: () => '',
  set: () => { options.length = 0; },
});
const logs = [];
const deps = {
  getUi: () => ({ prefabSelect: select }),
  getPrototypes: () => [
    { id: 'cube', name: 'Cube', key: 1, custom: false, assetManaged: false },
    { id: 'asset', name: 'Asset', key: 2, assetManaged: true, proxyFallbackUsed: true, sprite: { image: true } },
  ],
  getEditorPrototypeIndex: () => 1,
  prefabVariant: (prefab) => ({ w: prefab.id === 'cube' ? 1 : 2, d: 1, h: 1, voxels: [{}, {}] }),
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  document: { createElement: (tag) => ({ tag, value: '', textContent: '' }) },
  pushLog: (msg) => logs.push(msg),
};

assert.strictEqual(api.normalizedCountText(2.9, deps), '2');
assert.strictEqual(api.refreshPrefabSelectOptions('test-refresh', deps), true);
assert.strictEqual(options.length, 2);
assert.strictEqual(select.value, '1');
assert(options[1].textContent.includes('[assets]'), 'asset option should include assets marker');
assert(options[1].textContent.includes('[sprite]'), 'asset option should include sprite marker');
assert(logs.some((msg) => msg.includes('refresh-start')), 'should log refresh-start');
assert(logs.some((msg) => msg.includes('refresh-done')), 'should log refresh-done');
assert.strictEqual(api.refreshPrefabSelectOptions('test-refresh', deps), false, 'same signature should skip second refresh');
console.log('PASS prefab-select-refresh-boundary');
