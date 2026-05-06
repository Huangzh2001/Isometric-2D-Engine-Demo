#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const controllerDiagnosticsRel = 'src/application/controllers/controller-diagnostics.js';
const terrainGenerationDiagnosticsRel = 'src/application/controllers/terrain-generation-diagnostics.js';
const terrainApplyRel = 'src/application/controllers/terrain-apply-job-controller.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';
const indexSource = read('index.html');

assert(indexSource.indexOf(controllerDiagnosticsRel) >= 0, 'index.html must load controller-diagnostics.js');
assert(indexSource.indexOf(terrainGenerationDiagnosticsRel) >= 0, 'index.html must load terrain-generation-diagnostics.js');
assert(indexSource.indexOf(terrainApplyRel) >= 0, 'index.html must load terrain-apply-job-controller.js');
assert(indexSource.indexOf(appControllersRel) >= 0, 'index.html must load app-controllers.js');
assert(indexSource.indexOf(controllerDiagnosticsRel) < indexSource.indexOf(terrainGenerationDiagnosticsRel), 'controller-diagnostics.js must load before terrain-generation-diagnostics.js');
assert(indexSource.indexOf(terrainGenerationDiagnosticsRel) < indexSource.indexOf(terrainApplyRel), 'terrain-generation-diagnostics.js must load before terrain-apply-job-controller.js');
assert(indexSource.indexOf(terrainGenerationDiagnosticsRel) < indexSource.indexOf(appControllersRel), 'terrain-generation-diagnostics.js must load before app-controllers.js');

const binds = [];
const events = [];
const appRoot = { controllers: {}, application: {} };
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
  },
};
vm.createContext(context);
runFile(context, terrainGenerationDiagnosticsRel);

const moduleApi = context.window.__APP_TERRAIN_GENERATION_DIAGNOSTICS__;
assert(moduleApi, 'terrain generation diagnostics module missing');
assert.strictEqual(moduleApi.owner, terrainGenerationDiagnosticsRel);
assert.strictEqual(typeof moduleApi.createTerrainGenerationDiagnostics, 'function');
assert.strictEqual(appRoot.controllers.terrainGenerationDiagnostics, moduleApi, 'module should bind to controllers.terrainGenerationDiagnostics');
assert.strictEqual(appRoot.application.terrainGenerationDiagnostics, moduleApi, 'module should bind to application.terrainGenerationDiagnostics');
assert(binds.some((entry) => entry.pathName === 'controllers.terrainGenerationDiagnostics' && entry.meta && entry.meta.owner === terrainGenerationDiagnosticsRel), 'namespace bind should keep owner metadata');

const controller = moduleApi.createTerrainGenerationDiagnostics({
  recordTerrainDiagnostic(event, payload) {
    events.push({ event, payload });
    return { event, payload };
  }
});
assert.strictEqual(controller.owner, terrainGenerationDiagnosticsRel);
assert.strictEqual(typeof controller.emitTerrainGeneratorParams, 'function');
assert.strictEqual(typeof controller.emitTerrainGeneratorApply, 'function');

controller.emitTerrainGeneratorParams({ seed: 42, width: 3, height: 4, terrainAlgorithm: 'sin', octaves: 2, maxHeight: 7 });
controller.emitTerrainWorldIntegrationSummary('batch-a', {
  terrainTargetColumnCount: 9,
  terrainOwnedDeltaBlockCount: 5,
  overlappingColumnCount: 2,
  stackedOnExistingBlocks: true,
}, { manualBlockCount: 11 });
controller.emitTerrainLogicSummary({ width: 3, height: 4 }, { generatedCellCount: 12 }, [{}, {}, {}]);
controller.emitTerrainPlacementUnificationCheck('batch-a', [{}, {}]);
controller.emitTerrainDebugFaceUnificationCheck('batch-a', { terrainDebugFaceColorsEnabled: true });
controller.emitTerrainCameraUnificationCheck('batch-a');
controller.emitSharedRenderOptimizationCheck('batch-a');
controller.emitTerrainGeneratorSummary({ terrainBatchId: 'batch-a', generatedVoxelCount: 2 });
controller.emitTerrainGeneratorApply('batch-a', [{}, {}]);

const eventNames = events.map((entry) => entry.event);
for (const expected of [
  'terrain-generator-params',
  'terrain-world-integration-summary',
  'terrain-logic-summary',
  'terrain-placement-unification-check',
  'terrain-debug-face-unification-check',
  'terrain-camera-unification-check',
  'shared-render-optimization-check',
  'terrain-generator-summary',
  'terrain-generator-apply',
]) {
  assert(eventNames.includes(expected), `missing emitted diagnostic event: ${expected}`);
}
const params = events.find((entry) => entry.event === 'terrain-generator-params').payload;
assert.strictEqual(params.seed, 42);
assert.strictEqual(params.terrainAlgorithm, 'sin');
const logic = events.find((entry) => entry.event === 'terrain-logic-summary').payload;
assert.strictEqual(logic.terrainCellCount, 12);
assert.strictEqual(logic.terrainExpandedVoxelInstanceCount, 3);
const apply = events.find((entry) => entry.event === 'terrain-generator-apply').payload;
assert.strictEqual(apply.applyMode, 'batched');
assert.strictEqual(apply.terrainInstanceCount, 2);

console.log(JSON.stringify({ status: 'PASS', tested: [terrainGenerationDiagnosticsRel] }, null, 2));
