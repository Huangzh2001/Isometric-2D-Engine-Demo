#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const terrainClearRel = 'src/application/controllers/terrain-clear-controller.js';
const terrainGenerationRel = 'src/application/controllers/terrain-generation-controller.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';
const indexSource = read('index.html');

assert(indexSource.indexOf(terrainClearRel) >= 0, 'index.html must load terrain-clear-controller.js');
assert(indexSource.indexOf(terrainGenerationRel) >= 0, 'index.html must load terrain-generation-controller.js');
assert(indexSource.indexOf(appControllersRel) >= 0, 'index.html must load app-controllers.js');
assert(indexSource.indexOf(terrainClearRel) < indexSource.indexOf(terrainGenerationRel), 'terrain-clear-controller.js must load before terrain-generation-controller.js');
assert(indexSource.indexOf(terrainGenerationRel) < indexSource.indexOf(appControllersRel), 'terrain-generation-controller.js must load before app-controllers.js');

const appRoot = { controllers: {}, application: {} };
const binds = [];
const context = { console, JSON, Math, Number, String, Object, Array, Date, window: null };
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
runFile(context, terrainGenerationRel);

const api = context.window.__APP_TERRAIN_GENERATION_CONTROLLER__;
assert(api, 'terrain generation API missing');
assert.strictEqual(api.owner, terrainGenerationRel);
assert.strictEqual(typeof api.createTerrainGenerationController, 'function');
assert.strictEqual(appRoot.controllers.terrainGeneration, api, 'terrain generation API should bind to controllers.terrainGeneration');
assert.strictEqual(appRoot.application.terrainGenerationController, api, 'terrain generation API should bind to application.terrainGenerationController');
assert(binds.some((entry) => entry.pathName === 'controllers.terrainGeneration' && entry.meta && entry.meta.owner === terrainGenerationRel), 'controllers.terrainGeneration bind owner should be terrain generation owner');

const calls = [];
let now = 10;
let instances = [{ instanceId: 'manual-1' }, { instanceId: 'old-terrain', generatedBy: 'terrain-generator' }];
let boxes = [{ id: 1 }, { id: 2, generatedBy: 'terrain-generator' }];
const controller = api.createTerrainGenerationController({
  cancelPendingTerrainApplyJob(source) { calls.push(['cancelPendingTerrainApplyJob', source]); },
  getTerrainGeneratorCoreApi() {
    return {
      normalizeTerrainParams(params) { calls.push(['normalizeTerrainParams', params.width, params.height]); return Object.assign({}, params, { width: 2, height: 1 }); },
      generateHeightMap(params) { calls.push(['generateHeightMap', params.width, params.height]); return { heightMap: [[1, 2]], minHeightObserved: 1, maxHeightObserved: 2, avgHeightObserved: 1.5 }; },
      heightMapToVoxelStacks(generated) { calls.push(['heightMapToVoxelStacks', generated.heightMap.length]); return { generatedCellCount: 2 }; }
    };
  },
  controllerPerfNowMs() { now += 1; return now; },
  getMainEditorTerrainSettings() { return { width: 2, height: 1 }; },
  getRuntimeStateApi() { return { settings: { gridW: 4, gridH: 4 } }; },
  getSceneSessionApi() { return { getBoxes() { return boxes; } }; },
  emitTerrainGeneratorParamsDiagnostic(params) { calls.push(['emitTerrainGeneratorParamsDiagnostic', params.width, params.height]); },
  readCurrentSceneInstances() { return instances; },
  readCurrentSceneBoxes() { return boxes; },
  isTerrainGeneratedInstance(instance) { return !!(instance && instance.generatedBy === 'terrain-generator'); },
  replaceCurrentSceneInstances(next, source) { calls.push(['replaceCurrentSceneInstances', next.length, source]); instances = next; },
  buildTerrainMaterialMapForApply(heightMap) { calls.push(['buildTerrainMaterialMapForApply', heightMap.length]); return { kind: 'material-map' }; },
  getManualTerrainGenerationBoxes() { return boxes.filter((box) => !(box && box.generatedBy === 'terrain-generator')); },
  buildManualColumnHeightMapFromBoxes(manualBoxes, width, height) { calls.push(['buildManualColumnHeightMapFromBoxes', manualBoxes.length, width, height]); return { existingHeightMap: [[0, 0]], manualBlockCount: manualBoxes.length }; },
  summarizeTerrainWorldIntegration(heightMap, existingHeightMap) { calls.push(['summarizeTerrainWorldIntegration', heightMap.length, existingHeightMap.length]); return { terrainOwnedDeltaBlockCount: 2, overlappingColumnCount: 0, stackedOnExistingBlocks: false }; },
  allocateTerrainBatchId(source) { calls.push(['allocateTerrainBatchId', source]); return 'terrain-batch-2'; },
  getTerrainRuntimeModel() { return { terrainChunkCacheVersion: 3 }; },
  buildTerrainPlacementPlan(heightMap) { calls.push(['buildTerrainPlacementPlan', heightMap.length]); return [{ x: 0 }, { x: 1 }]; },
  applyTerrainRuntimeModel(patch, source) { calls.push(['applyTerrainRuntimeModel', patch.activeTerrainBatchId, patch.materialMap && patch.materialMap.kind, source]); },
  applyTerrainBatchState(patch, source) { calls.push(['applyTerrainBatchState', patch.activeTerrainBatchId, source]); },
  beginTerrainApplyJob(job) { calls.push(['beginTerrainApplyJob', job.batchId, job.terrainPlacementPlan.length, job.batchSize]); },
  getTerrainApplyBatchInstanceCountForAppControllers() { return 7; },
  buildTerrainInstanceSemanticMetadata(params) { calls.push(['buildTerrainInstanceSemanticMetadata', params.width]); return { semantic: true }; },
  emitTerrainWorldIntegrationSummaryDiagnostic(batchId) { calls.push(['emitTerrainWorldIntegrationSummaryDiagnostic', batchId]); },
  emitTerrainLogicSummaryDiagnostic(params, stacks, plan) { calls.push(['emitTerrainLogicSummaryDiagnostic', stacks.generatedCellCount, plan.length]); },
  emitTerrainPlacementUnificationCheckDiagnostic(batchId, plan) { calls.push(['emitTerrainPlacementUnificationCheckDiagnostic', batchId, plan.length]); },
  emitTerrainDebugFaceUnificationCheckDiagnostic(batchId) { calls.push(['emitTerrainDebugFaceUnificationCheckDiagnostic', batchId]); },
  emitTerrainCameraUnificationCheckDiagnostic(batchId) { calls.push(['emitTerrainCameraUnificationCheckDiagnostic', batchId]); },
  emitSharedRenderOptimizationCheckDiagnostic(batchId) { calls.push(['emitSharedRenderOptimizationCheckDiagnostic', batchId]); },
  emitTerrainGeneratorSummaryDiagnostic(summary) { calls.push(['emitTerrainGeneratorSummaryDiagnostic', summary.terrainBatchId]); },
  emitTerrainGeneratorApplyDiagnostic(batchId, plan) { calls.push(['emitTerrainGeneratorApplyDiagnostic', batchId, plan.length]); },
  emitTerrainGenerateProfile(profile) { calls.push(['emitTerrainGenerateProfile', profile.terrainBatchId, profile.generateQueued]); },
  notifyTerrainSceneChanged() { calls.push(['notifyTerrainSceneChanged']); }
});

const result = controller.generateMainEditorTerrain('unit:generate');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.terrainBatchId, 'terrain-batch-2');
assert.strictEqual(result.terrainInstanceCount, 2);
assert.strictEqual(result.applyMode, 'batched');
assert(calls.some((call) => call[0] === 'cancelPendingTerrainApplyJob' && call[1] === 'unit:generate:cancel-pending'), 'generation should cancel pending terrain apply job');
assert(calls.some((call) => call[0] === 'replaceCurrentSceneInstances' && call[1] === 1), 'generation should clear previous terrain instances before apply job');
assert(calls.some((call) => call[0] === 'applyTerrainRuntimeModel' && call[1] === 'terrain-batch-2' && call[2] === 'material-map'), 'generation should seed terrain runtime model with material map');
assert(calls.some((call) => call[0] === 'beginTerrainApplyJob' && call[1] === 'terrain-batch-2' && call[2] === 2 && call[3] === 7), 'generation should create batched terrain apply job');
assert(calls.some((call) => call[0] === 'emitTerrainGenerateProfile' && call[1] === 'terrain-batch-2' && call[2] === true), 'generation should emit queued profile');
assert(calls.some((call) => call[0] === 'notifyTerrainSceneChanged'), 'generation should notify terrain scene change');

console.log(JSON.stringify({ status: 'PASS', tested: [terrainGenerationRel] }, null, 2));
