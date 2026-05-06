#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const controllerBoundaryRel = 'src/application/controllers/controller-boundary.js';
const controllerRegistryRel = 'src/application/controllers/controller-registry.js';
const controllerDiagnosticsRel = 'src/application/controllers/controller-diagnostics.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';
const indexSource = read('index.html');

assert(indexSource.indexOf(controllerBoundaryRel) >= 0, 'index.html must load controller-boundary.js');
assert(indexSource.indexOf(controllerRegistryRel) >= 0, 'index.html must load controller-registry.js');
assert(indexSource.indexOf(controllerDiagnosticsRel) >= 0, 'index.html must load controller-diagnostics.js');
assert(indexSource.indexOf(appControllersRel) >= 0, 'index.html must load app-controllers.js');
assert(indexSource.indexOf(controllerRegistryRel) < indexSource.indexOf(controllerDiagnosticsRel), 'controller-registry.js must load before controller-diagnostics.js');
assert(indexSource.indexOf(controllerDiagnosticsRel) < indexSource.indexOf(appControllersRel), 'controller-diagnostics.js must load before app-controllers.js');

const appRoot = { controllers: {}, application: {} };
const binds = [];
const logs = [];
const context = {
  console,
  JSON,
  Math,
  Number,
  String,
  Object,
  Array,
  Date,
  performance: { now: () => 123.456 },
  window: null,
};
context.window = {
  App: appRoot,
  performance: context.performance,
  pushLog(line) { logs.push(line); },
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
runFile(context, controllerBoundaryRel);
runFile(context, controllerRegistryRel);
runFile(context, controllerDiagnosticsRel);

const api = context.window.__APP_CONTROLLER_DIAGNOSTICS__;
assert(api, 'controller diagnostics API missing');
assert.strictEqual(api.owner, controllerDiagnosticsRel);
assert.strictEqual(appRoot.controllers.diagnostics, api, 'diagnostics should bind to controllers.diagnostics');
assert.strictEqual(appRoot.application.controllerDiagnostics, api, 'diagnostics should bind to application.controllerDiagnostics');
assert.strictEqual(typeof api.recordTerrainDiagnostic, 'function');
assert.strictEqual(typeof api.controllerPerfNowMs, 'function');
assert.strictEqual(typeof api.emitStructuredControllerLog, 'function');
assert.strictEqual(api.controllerPerfNowMs(), 123.456);
assert.strictEqual(api.isDetailedTerrainProfilingEnabled({
  getMainEditorTerrainSettings() { return { terrainDetailedProfilingEnabled: true }; }
}), true);
assert.strictEqual(api.isDetailedTerrainProfilingEnabled({
  getMainEditorTerrainSettings() { return { terrainDetailedProfilingEnabled: false }; }
}), false);
const terrainEntry = api.recordTerrainDiagnostic('terrain-unit', { ok: true });
assert.strictEqual(terrainEntry.event, 'terrain-unit');
assert.strictEqual(terrainEntry.ok, true);
assert(logs.some((line) => line.includes('[TERRAIN]') && line.includes('terrain-unit')), 'terrain diagnostic should log through owner');
const profileLine = api.emitTerrainGenerateProfile({ totalMs: 1 });
assert(profileLine.includes('[TERRAIN-GENERATE-PROFILE]'), 'terrain profile log should use structured tag');
const sceneLine = api.emitSceneCommitProfile({ totalMs: 2 });
assert(sceneLine.includes('[SCENE-COMMIT-PROFILE]'), 'scene commit profile log should use structured tag');
assert(binds.some((entry) => entry.pathName === 'controllers.diagnostics' && entry.meta && entry.meta.owner === controllerDiagnosticsRel), 'controllers.diagnostics bind owner should be diagnostics');

console.log(JSON.stringify({ status: 'PASS', tested: [controllerDiagnosticsRel] }, null, 2));
