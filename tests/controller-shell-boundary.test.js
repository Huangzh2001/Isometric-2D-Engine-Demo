#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const controllerBoundaryRel = 'src/application/controllers/controller-boundary.js';
const controllerRegistryRel = 'src/application/controllers/controller-registry.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';
const shellDiagnosticsRel = 'src/presentation/shell/diagnostics/shell-diagnostics.js';
const shellAppRel = 'src/presentation/shell/app.js';
const indexSource = read('index.html');
const controllerBoundarySource = read(controllerBoundaryRel);
const controllerRegistrySource = read(controllerRegistryRel);
const appControllersSource = read(appControllersRel);
const shellDiagnosticsSource = read(shellDiagnosticsRel);
const shellAppSource = read(shellAppRel);

assert(indexSource.indexOf(controllerBoundaryRel) >= 0, 'index.html must load controller-boundary.js');
assert(indexSource.indexOf(controllerBoundaryRel) < indexSource.indexOf(appControllersRel), 'controller-boundary.js must load before app-controllers.js');
assert(indexSource.indexOf(controllerRegistryRel) >= 0, 'index.html must load controller-registry.js');
assert(indexSource.indexOf(controllerBoundaryRel) < indexSource.indexOf(controllerRegistryRel), 'controller-boundary.js must load before controller-registry.js');
assert(indexSource.indexOf(controllerRegistryRel) < indexSource.indexOf(appControllersRel), 'controller-registry.js must load before app-controllers.js');
assert(indexSource.indexOf(shellDiagnosticsRel) >= 0, 'index.html must load shell-diagnostics.js');
assert(indexSource.indexOf(shellDiagnosticsRel) < indexSource.indexOf(shellAppRel), 'shell-diagnostics.js must load before app.js');
assert(appControllersSource.includes('getControllerBoundaryApiForAppControllers'), 'app-controllers must use controller boundary wrapper');
assert(!/var\s+appBoundaryAudit\b/.test(appControllersSource), 'app-controllers must not own appBoundaryAudit storage');
assert(!/var\s+__functionTraceSpec\b/.test(shellAppSource), 'app.js must not own function trace spec');
assert(!/function\s+installFunctionTrace\s*\(/.test(shellAppSource), 'app.js must not own trace installer');

const appRoot = { controllers: {}, application: {}, shell: {} };
const controllerCalls = [];
const controllerContext = {
  console,
  window: null,
};
controllerContext.window = {
  App: appRoot,
  pushLog(line) { controllerCalls.push(['pushLog', line]); },
  __APP_NAMESPACE: {
    bind(pathName, value) {
      const parts = pathName.split('.');
      let node = appRoot;
      for (let i = 0; i < parts.length - 1; i++) {
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
vm.runInNewContext(controllerBoundarySource, controllerContext, { filename: controllerBoundaryRel });
vm.runInNewContext(controllerRegistrySource, controllerContext, { filename: controllerRegistryRel });
const boundaryApi = controllerContext.window.__APP_CONTROLLER_BOUNDARY__;
assert(boundaryApi, 'controller boundary API missing');
assert.strictEqual(boundaryApi.owner, controllerBoundaryRel);
assert.strictEqual(typeof boundaryApi.recordAppBoundaryEvent, 'function');
assert.strictEqual(controllerContext.window.App.controllers.boundary, boundaryApi, 'controller boundary should bind to controllers.boundary');
assert(controllerContext.window.__APP_CONTROLLER_REGISTRY__, 'controller registry API missing');
assert.strictEqual(controllerContext.window.__APP_CONTROLLER_REGISTRY__.owner, controllerRegistryRel);
assert.strictEqual(typeof controllerContext.window.__APP_CONTROLLER_REGISTRY__.registerControllers, 'function');
assert.strictEqual(controllerContext.window.App.controllers.registry, controllerContext.window.__APP_CONTROLLER_REGISTRY__, 'controller registry should bind to App.controllers.registry');
assert.strictEqual(controllerContext.window.App.application.controllerBoundary, boundaryApi, 'controller boundary should bind to application.controllerBoundary');
boundaryApi.recordAppBoundaryEvent('state-action', 'test.route', { ok: true });
boundaryApi.recordAppBoundaryFallback('missing.route', { missing: true });
const summary = boundaryApi.summarizeAppBoundary('unit');
assert.strictEqual(summary.phase, 'P9c-CONTROLLER-SHELL');
assert.strictEqual(summary.counters.stateActionHits, 1);
assert.strictEqual(summary.counters.fallbackCount, 1);
assert.strictEqual(summary.recentEvents.length, 1);

const shellAppRoot = { shell: {} };
const shellCalls = [];
const shellContext = {
  console,
  location: { search: '?fntrace=1' },
  window: null,
  pushLog(line) { shellCalls.push(['pushLog', line]); },
  detailLog(line) { shellCalls.push(['detailLog', line]); },
  markRefactorCheckpoint(group, name, payload) { shellCalls.push(['markRefactorCheckpoint', group, name, payload]); },
};
shellContext.window = {
  App: shellAppRoot,
  __APP_NAMESPACE: {
    bind(pathName, value) {
      const parts = pathName.split('.');
      let node = shellAppRoot;
      for (let i = 0; i < parts.length - 1; i++) {
        node[parts[i]] = node[parts[i]] || {};
        node = node[parts[i]];
      }
      node[parts[parts.length - 1]] = value;
      return value;
    }
  }
};
vm.runInNewContext(shellDiagnosticsSource, shellContext, { filename: shellDiagnosticsRel });
assert(shellContext.window.__FUNCTION_TRACE_INFO, 'function trace info should be owned by shell diagnostics');
assert(shellContext.window.__SHELL_DIAGNOSTICS__, 'shell diagnostics API missing');
assert.strictEqual(shellContext.window.__SHELL_DIAGNOSTICS__.owner, shellDiagnosticsRel);
assert.strictEqual(shellContext.window.App.shell.diagnostics, shellContext.window.__SHELL_DIAGNOSTICS__, 'shell diagnostics should bind to App.shell.diagnostics');
assert.strictEqual(typeof shellContext.window.__SHELL_DIAGNOSTICS__.installFunctionTrace, 'function');
assert(shellContext.window.__FUNCTION_TRACE_INFO.files.includes('src/application/controllers/app-controllers.js'), 'trace spec should include app-controllers');

console.log(JSON.stringify({ status: 'PASS', tested: [controllerBoundaryRel, shellDiagnosticsRel] }, null, 2));
