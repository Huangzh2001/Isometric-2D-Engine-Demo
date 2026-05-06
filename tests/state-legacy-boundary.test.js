#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const bridgeRel = 'src/infrastructure/legacy/state-bridge.js';
const stateRel = 'src/infrastructure/legacy/state.js';
const indexSource = read('index.html');
const bridgeSource = read(bridgeRel);
const stateSource = read(stateRel);

assert(indexSource.indexOf(bridgeRel) >= 0, 'index.html must load state-bridge.js');
assert(indexSource.indexOf(bridgeRel) < indexSource.indexOf(stateRel), 'state-bridge.js must load before state.js');
assert(stateSource.includes('getLegacyStateBridgeApiForLegacyState'), 'legacy state must use bridge getter');
assert(stateSource.includes('reportLegacyStateBootOwnership'), 'legacy state must delegate boot ownership reporting');
assert(!stateSource.includes("logCompatMapping('LOCAL_SCENE_STORAGE_KEY'"), 'compat mapping table must not remain in legacy state.js');
assert(!stateSource.includes("setRefactorStep('Phase-A-02'"), 'Phase-A boot report must not remain in legacy state.js');

const calls = [];
const appRoot = { state: {}, shell: {}, infrastructure: {}, legacy: {} };
const context = {
  console,
  window: null,
};
context.window = {
  App: appRoot,
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
  },
  setRefactorStep(step, payload) { calls.push(['setRefactorStep', step, payload]); },
  markRefactorCheckpoint(group, name, payload) { calls.push(['markRefactorCheckpoint', group, name, payload]); },
  logCompatMapping(name, owner) { calls.push(['logCompatMapping', name, owner]); },
  refactorLogCurrent(group, name, payload) { calls.push(['refactorLogCurrent', group, name, payload]); },
  __SCENE_STORAGE_KEYS: { owner: 'src/core/scene/scene-keys.js' },
};
context.window.App.state.runtimeState = { owner: 'runtime-owner', summarize: () => ({ ok: true }) };
context.window.App.state.prefabRegistry = { owner: 'prefab-owner', getPrototypeCount: () => 2, getBuiltInCount: () => 1 };
context.window.App.state.sceneSession = { owner: 'scene-session-owner', summarizeSession: () => ({ scene: true }) };
context.window.App.state.sceneGraph = { owner: 'scene-graph-owner' };
context.window.App.state.lightingState = { owner: 'lighting-owner' };
context.window.App.shell.domRegistry = { owner: 'dom-owner', getKeyCount: () => 3, getMissingKeys: () => [] };

vm.runInNewContext(bridgeSource, context, { filename: bridgeRel });
const api = context.window.__LEGACY_STATE_BRIDGE__;
assert(api, 'state bridge must expose __LEGACY_STATE_BRIDGE__');
assert.strictEqual(api.owner, bridgeRel, 'state bridge owner mismatch');
assert.strictEqual(typeof api.getStateApis, 'function', 'getStateApis missing');
assert.strictEqual(typeof api.callLegacyPlacement, 'function', 'callLegacyPlacement missing');
assert.strictEqual(typeof api.reportLegacyStateBootOwnership, 'function', 'reportLegacyStateBootOwnership missing');
assert.strictEqual(context.window.App.infrastructure.legacyStateBridge, api, 'state bridge must bind into App namespace');

const apis = api.getStateApis();
assert.strictEqual(apis.runtimeState.owner, 'runtime-owner');
assert.strictEqual(apis.prefabRegistry.owner, 'prefab-owner');
assert.strictEqual(apis.sceneSession.owner, 'scene-session-owner');

const summary = api.reportLegacyStateBootOwnership();
assert.strictEqual(summary.phase, 'P9b');
assert(summary.canonicalOwners.runtime.includes('runtime-state.js'));
assert(calls.some((call) => call[0] === 'logCompatMapping' && call[1] === 'saveScene'), 'compat mappings should be emitted from bridge');
assert(calls.some((call) => call[0] === 'markRefactorCheckpoint' && call[1] === 'Cleanup'), 'cleanup checkpoint should be emitted from bridge');

console.log(JSON.stringify({ status: 'PASS', tested: bridgeRel }, null, 2));
