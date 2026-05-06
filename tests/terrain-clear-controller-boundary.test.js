#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const terrainApplyRel = 'src/application/controllers/terrain-apply-job-controller.js';
const terrainClearRel = 'src/application/controllers/terrain-clear-controller.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';
const indexSource = read('index.html');

assert(indexSource.indexOf(terrainApplyRel) >= 0, 'index.html must load terrain-apply-job-controller.js');
assert(indexSource.indexOf(terrainClearRel) >= 0, 'index.html must load terrain-clear-controller.js');
assert(indexSource.indexOf(appControllersRel) >= 0, 'index.html must load app-controllers.js');
assert(indexSource.indexOf(terrainApplyRel) < indexSource.indexOf(terrainClearRel), 'terrain-apply-job-controller.js must load before terrain-clear-controller.js');
assert(indexSource.indexOf(terrainClearRel) < indexSource.indexOf(appControllersRel), 'terrain-clear-controller.js must load before app-controllers.js');

const appRoot = { controllers: {}, application: {} };
const binds = [];
const context = {
  console,
  JSON,
  Math,
  Number,
  String,
  Object,
  Array,
  Date,
  window: null,
};
context.window = {
  App: appRoot,
  __APP_NAMESPACE: {
    bind(pathName, value, meta) {
      binds.push({ pathName, value, meta });
      const parts = pathName.split('.');
      let node = appRoot;
      for (let i = 0; i < parts.length - 1; i += 1) {
        node[parts[i]] = node[parts[i]] || {};
        node = node[parts[i]];
      }
      node[parts[parts.length - 1]] = value;
      return value;
    },
    getPath(pathName) {
      return pathName.split('.').reduce((node, key) => node && node[key], appRoot);
    }
  }
};
vm.createContext(context);
runFile(context, terrainClearRel);

const api = context.window.__APP_TERRAIN_CLEAR_CONTROLLER__;
assert(api, 'terrain clear API missing');
assert.strictEqual(api.owner, terrainClearRel);
assert.strictEqual(typeof api.createTerrainClearController, 'function');
assert.strictEqual(appRoot.controllers.terrainClear, api, 'terrain clear API should bind to controllers.terrainClear');
assert.strictEqual(appRoot.application.terrainClearController, api, 'terrain clear API should bind to application.terrainClearController');
assert(binds.some((entry) => entry.pathName === 'controllers.terrainClear' && entry.meta && entry.meta.owner === terrainClearRel), 'controllers.terrainClear bind owner should be terrain clear owner');

const calls = [];
let instances = [
  { instanceId: 'manual-1' },
  { instanceId: 'terrain-1', generatedBy: 'terrain-generator' },
  { instanceId: 'terrain-2', generatedBy: 'terrain-generator' }
];
let runtimeModel = {
  activeTerrainBatchId: 'terrain-batch-1',
  lastSummary: { generatedVoxelCount: 9 }
};
const controller = api.createTerrainClearController({
  cancelPendingTerrainApplyJob(source) { calls.push(['cancelPendingTerrainApplyJob', source]); return true; },
  readCurrentSceneInstances() { calls.push(['readCurrentSceneInstances']); return instances; },
  isTerrainGeneratedInstance(instance) { return !!(instance && instance.generatedBy === 'terrain-generator'); },
  replaceCurrentSceneInstances(next, source) { calls.push(['replaceCurrentSceneInstances', next.length, source]); instances = next; },
  getTerrainRuntimeModel() { calls.push(['getTerrainRuntimeModel']); return runtimeModel; },
  getMainEditorTerrainSettings(source) { calls.push(['getMainEditorTerrainSettings', source]); return { activeTerrainBatchId: 'settings-batch' }; },
  clearTerrainRuntimeModelState(source) { calls.push(['clearTerrainRuntimeModelState', source]); runtimeModel = null; },
  applyTerrainBatchState(patch, source) { calls.push(['applyTerrainBatchState', patch, source]); },
  invalidateMainEditorTerrainRenderCaches(source) { calls.push(['invalidateMainEditorTerrainRenderCaches', source]); },
  recordTerrainDiagnostic(event, payload) { calls.push(['recordTerrainDiagnostic', event, payload]); },
  notifyTerrainSceneChanged() { calls.push(['notifyTerrainSceneChanged']); }
});

assert.strictEqual(controller.owner, terrainClearRel);
const result = controller.clearMainEditorTerrain('unit:clear');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.terrainBatchId, 'terrain-batch-1');
assert.strictEqual(result.removedTerrainInstanceCount, 2);
assert.strictEqual(result.removedTerrainVoxelCount, 9);
assert.deepStrictEqual(instances, [{ instanceId: 'manual-1' }], 'terrain clear should keep only non-terrain instances');
assert(calls.some((call) => call[0] === 'cancelPendingTerrainApplyJob' && call[1] === 'unit:clear:cancel-pending'), 'clear should cancel pending terrain apply job');
assert(calls.some((call) => call[0] === 'replaceCurrentSceneInstances' && call[1] === 1), 'clear should replace current scene with survivors');
assert(calls.some((call) => call[0] === 'applyTerrainBatchState' && call[1] && call[1].activeTerrainBatchId === null), 'clear should reset terrain batch state');
assert(calls.some((call) => call[0] === 'recordTerrainDiagnostic' && call[1] === 'terrain-generator-clear'), 'clear should record terrain-generator-clear diagnostic');
assert(calls.some((call) => call[0] === 'notifyTerrainSceneChanged'), 'clear should notify terrain scene change');

console.log(JSON.stringify({ status: 'PASS', tested: [terrainClearRel] }, null, 2));
