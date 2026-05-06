#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const boundaryRel = 'src/presentation/render/interaction/render-logic-interaction-boundary.js';
const logicRel = 'src/presentation/render/logic.js';
const indexRel = 'index.html';

const boundarySource = read(boundaryRel);
const logicSource = read(logicRel);
const indexSource = read(indexRel);

assert(indexSource.indexOf(boundaryRel) >= 0, 'index.html should load render logic interaction boundary');
assert(indexSource.indexOf(boundaryRel) < indexSource.indexOf(logicRel), 'interaction boundary should load before logic.js');
assert(logicSource.includes('requireRenderLogicInteractionBoundaryForLogic().isMainEditorViewAnimating'), 'logic.js should delegate animation state to interaction boundary');
assert(!/isMainEditorViewRotating\s*\(\s*['"]presentation\.render\.logic['"]\s*\)/.test(logicSource), 'logic.js should not directly call main controller rotation-animation API');
assert(!/getMainEditorVisualRotation\s*\(\s*['"]presentation\.render\.logic['"]\s*\)/.test(logicSource), 'logic.js should not directly call main controller visual rotation API');
assert(!/getMainEditorViewRotation\s*\(\s*['"]presentation\.render\.logic['"]\s*\)/.test(logicSource), 'logic.js should not directly call main controller view rotation API');

const calls = [];
const sandboxWindow = {
  App: {
    controllers: {
      main: {
        isMainEditorViewRotating(owner) { calls.push(['isMainEditorViewRotating', owner]); return true; },
        getMainEditorVisualRotation(owner) { calls.push(['getMainEditorVisualRotation', owner]); return 5; },
      },
    },
    state: { runtimeState: { editor: { isViewRotating: false, rotation: 2 } } },
    domain: { viewRotationCore: { name: 'view-core' } },
  },
};
const context = { window: sandboxWindow, globalThis: sandboxWindow, module: { exports: {} }, exports: {}, console };
vm.runInNewContext(boundarySource, context, { filename: boundaryRel });
const api = sandboxWindow.__RENDER_LOGIC_INTERACTION_BOUNDARY__;
assert(api, 'boundary API should attach to window');
assert.strictEqual(api.isMainEditorViewAnimating('test-owner'), true, 'animation query should use controller first');
assert.strictEqual(api.getSafeMainEditorViewRotationValue('rotation-owner'), 1, 'rotation should normalize controller value');
assert.deepStrictEqual(calls, [
  ['isMainEditorViewRotating', 'test-owner'],
  ['getMainEditorVisualRotation', 'rotation-owner'],
]);
assert.strictEqual(api.getMainViewRotationCoreApi().name, 'view-core', 'view rotation core should resolve from App.domain');
assert.strictEqual(JSON.stringify(api.getMainViewProjectionConfig({
  settings: { tileW: 64, tileH: 32, originX: 10, originY: 20, gridW: 8, gridH: 9 },
  camera: { x: 3, y: 4 },
})), JSON.stringify({
  tileW: 64,
  tileH: 32,
  originX: 10,
  originY: 20,
  cameraX: 3,
  cameraY: 4,
  worldBoundsOrOrigin: { cols: 8, rows: 9 },
}));

console.log(JSON.stringify({ status: 'PASS', tested: [boundaryRel, logicRel, indexRel] }, null, 2));
