#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const controllerDiagnosticsRel = 'src/application/controllers/controller-diagnostics.js';
const terrainApplyRel = 'src/application/controllers/terrain-apply-job-controller.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';
const indexSource = read('index.html');

assert(indexSource.indexOf(controllerDiagnosticsRel) >= 0, 'index.html must load controller-diagnostics.js');
assert(indexSource.indexOf(terrainApplyRel) >= 0, 'index.html must load terrain-apply-job-controller.js');
assert(indexSource.indexOf(appControllersRel) >= 0, 'index.html must load app-controllers.js');
assert(indexSource.indexOf(controllerDiagnosticsRel) < indexSource.indexOf(terrainApplyRel), 'controller-diagnostics.js must load before terrain-apply-job-controller.js');
assert(indexSource.indexOf(terrainApplyRel) < indexSource.indexOf(appControllersRel), 'terrain-apply-job-controller.js must load before app-controllers.js');

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
runFile(context, terrainApplyRel);

const api = context.window.__APP_TERRAIN_APPLY_JOB_CONTROLLER__;
assert(api, 'terrain apply job API missing');
assert.strictEqual(api.owner, terrainApplyRel);
assert.strictEqual(api.DEFAULT_BATCH_INSTANCE_COUNT, 512);
assert.strictEqual(typeof api.createTerrainApplyJobController, 'function');
assert.strictEqual(appRoot.controllers.terrainApplyJob, api, 'terrain apply API should bind to controllers.terrainApplyJob');
assert.strictEqual(appRoot.application.terrainApplyJobController, api, 'terrain apply API should bind to application.terrainApplyJobController');
assert(binds.some((entry) => entry.pathName === 'controllers.terrainApplyJob' && entry.meta && entry.meta.owner === terrainApplyRel), 'controllers.terrainApplyJob bind owner should be terrain apply owner');

const calls = [];
let runtimeModel = { terrainChunkCacheVersion: 2 };
let currentInstances = [{ instanceId: 'manual' }];
let currentBoxes = [{ id: 1 }];
const controller = api.createTerrainApplyJobController({
  getSceneSessionApi() {
    return {
      allocateBoxIdRange(count) { calls.push(['allocateBoxIdRange', count]); return { start: 10, count }; },
      getBoxes() { return currentBoxes; }
    };
  },
  applyTerrainRuntimeModel(patch, source) { calls.push(['applyTerrainRuntimeModel', patch, source]); runtimeModel = Object.assign({}, runtimeModel, patch); },
  applyTerrainBatchState(patch, source) { calls.push(['applyTerrainBatchState', patch, source]); },
  getTerrainRuntimeModel() { return runtimeModel; },
  readCurrentSceneInstances() { return currentInstances; },
  readCurrentSceneBoxes() { return currentBoxes; },
  buildTerrainInstancesAndBoxesFromPlacementPlanRange(plan, start, count, batchId, params, heightMap, materialMap, semanticMeta, startingBoxId) {
    calls.push(['buildRange', start, count, materialMap && materialMap.kind, startingBoxId]);
    return {
      instances: plan.slice(start, start + count).map((step, idx) => ({ instanceId: `${batchId}:${start + idx}`, generatedBy: 'terrain-generator' })),
      boxes: plan.slice(start, start + count).map((step, idx) => ({ id: startingBoxId + idx, generatedBy: 'terrain-generator' }))
    };
  },
  replaceCurrentSceneGraph(instances, boxes, source) { calls.push(['replaceCurrentSceneGraph', instances.length, boxes.length, source]); currentInstances = instances; currentBoxes = boxes; },
  controllerPerfNowMs() { return 100; },
  emitTerrainGenerateProfile(payload) { calls.push(['emitTerrainGenerateProfile', payload.terrainGeneratedInstanceCount]); },
  recordTerrainDiagnostic(event, payload) { calls.push(['recordTerrainDiagnostic', event, payload && payload.appliedTerrainInstanceCount]); },
  isDetailedTerrainProfilingEnabledForController() { return true; },
  notifyTerrainSceneChanged() { calls.push(['notifyTerrainSceneChanged']); }
});

assert.strictEqual(controller.getBatchInstanceCount(), 512);
assert.strictEqual(controller.cancelPendingTerrainApplyJob('empty'), false, 'cancel without pending job should be false');
controller.beginTerrainApplyJob({
  batchId: 'terrain-test',
  source: 'unit',
  normalizedParams: { width: 2, height: 1 },
  generated: { heightMap: [[1, 1]], materialMap: { kind: 'material-map' } },
  occupancySummary: { existingHeightMap: [[0, 0]], manualBlockCount: 0 },
  worldIntegration: { terrainOwnedDeltaBlockCount: 2, overlappingColumnCount: 0, stackedOnExistingBlocks: false },
  terrainPlacementPlan: [{ x: 0 }, { x: 1 }],
  survivors: [{ instanceId: 'manual' }],
  survivorsBoxes: [{ id: 1 }],
  appliedInstances: [],
  appliedBoxes: [],
  nextPlanIndex: 0,
  nextBoxId: 10,
  semanticMeta: {},
  batchSize: 1,
  summary: { generatedVoxelCount: 2, appliedVoxelCount: 0, applyInProgress: true },
  startedAt: 50,
  materializeMsTotal: 0,
  sceneCommitMsTotal: 0,
  profile: { timings: {} }
});
assert.strictEqual(controller.hasPendingTerrainApplyJob(), true);
const firstSummary = controller.tickMainEditorTerrainApply(100, 'unit:tick');
assert.strictEqual(firstSummary.appliedVoxelCount, 1);
assert.strictEqual(firstSummary.applyInProgress, true);
assert(calls.some((call) => call[0] === 'buildRange' && call[3] === 'material-map'), 'material map should be passed through the apply job owner');
const finalSummary = controller.tickMainEditorTerrainApply(101, 'unit:tick');
assert.strictEqual(finalSummary.appliedVoxelCount, 2);
assert.strictEqual(finalSummary.applyInProgress, false);
assert.strictEqual(controller.hasPendingTerrainApplyJob(), false);
assert(calls.some((call) => call[0] === 'emitTerrainGenerateProfile' && call[1] === 2), 'completion should emit terrain generate profile');
assert(calls.some((call) => call[0] === 'notifyTerrainSceneChanged'), 'completion should notify terrain scene change');

console.log(JSON.stringify({ status: 'PASS', tested: [terrainApplyRel] }, null, 2));
