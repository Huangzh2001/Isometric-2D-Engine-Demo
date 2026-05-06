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
const appControllersRel = 'src/application/controllers/app-controllers.js';
const indexSource = read('index.html');

assert(indexSource.indexOf(controllerBoundaryRel) >= 0, 'index.html must load controller-boundary.js');
assert(indexSource.indexOf(controllerRegistryRel) >= 0, 'index.html must load controller-registry.js');
assert(indexSource.indexOf(appControllersRel) >= 0, 'index.html must load app-controllers.js');
assert(indexSource.indexOf(controllerBoundaryRel) < indexSource.indexOf(controllerRegistryRel), 'controller-boundary.js must load before controller-registry.js');
assert(indexSource.indexOf(controllerRegistryRel) < indexSource.indexOf(appControllersRel), 'controller-registry.js must load before app-controllers.js');

const appRoot = { controllers: {}, application: {} };
const registryBinds = [];
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
  window: null,
  pushLog(line) { logs.push(line); }
};
context.window = {
  App: appRoot,
  __APP_NAMESPACE: {
    bind(pathName, value, meta) {
      registryBinds.push({ pathName, value, meta });
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

const registryApi = context.window.__APP_CONTROLLER_REGISTRY__;
assert(registryApi, 'controller registry API missing');
assert.strictEqual(registryApi.owner, controllerRegistryRel);
assert.strictEqual(typeof registryApi.registerControllers, 'function');
assert.strictEqual(appRoot.controllers.registry, registryApi, 'registry should bind to controllers.registry');
assert.strictEqual(appRoot.application.controllerRegistry, registryApi, 'registry should bind to application.controllerRegistry');

const calls = [];
function ping(payload) { calls.push(['ping', payload]); return { ok: true, payload }; }
function save(payload) { calls.push(['save', payload]); return 'saved'; }
const emitted = [];
const rootControllers = registryApi.registerControllers({
  ns: context.window.__APP_NAMESPACE,
  emitP7(kind, message, payload) { emitted.push({ kind, message, payload }); return payload; },
  invokeControllerAction(actions, action, payload) {
    const fn = actions && actions[action];
    return typeof fn === 'function' ? fn(payload) : null;
  },
  dispatchControllerCommand(action, payload) { calls.push(['root-dispatch', action, payload]); return action; },
  actionGroups: {
    main: { ping },
    scene: { save },
    assetLibrary: {},
    placement: {},
    editorHandoff: {}
  }
});

assert.strictEqual(appRoot.controllers.main, rootControllers.main, 'main controller should bind through registry');
assert.strictEqual(appRoot.controllers.scene, rootControllers.scene, 'scene controller should bind through registry');
assert.strictEqual(typeof appRoot.controllers.main.dispatch, 'function', 'main dispatch should exist');
assert.deepStrictEqual(appRoot.controllers.main.dispatch('ping', { n: 1 }), { ok: true, payload: { n: 1 } });
assert.strictEqual(appRoot.controllers.scene.dispatch('save', { id: 1 }), 'saved');
assert.strictEqual(appRoot.controllers.dispatch('root.command', { ok: true }), 'root.command');
assert(emitted.some((entry) => entry.message === 'controller-entrypoints-ready'), 'BOOT coverage should be emitted');
assert(emitted.some((entry) => entry.message === 'controller-entrypoint-coverage'), 'SUMMARY coverage should be emitted');
assert(emitted.every((entry) => entry.payload && entry.payload.owner === controllerRegistryRel), 'coverage owner should be controller-registry.js');
assert(registryBinds.some((entry) => entry.pathName === 'controllers.main' && entry.meta && entry.meta.owner === controllerRegistryRel), 'controllers.main bind owner should be registry');

console.log(JSON.stringify({ status: 'PASS', tested: [controllerRegistryRel] }, null, 2));
