#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const hitRel = 'src/presentation/render/interaction/render-hit-test.js';
const logicRel = 'src/presentation/render/logic.js';
const indexRel = 'index.html';

const hitSource = read(hitRel);
const logicSource = read(logicRel);
const indexSource = read(indexRel);

assert(indexSource.indexOf(hitRel) >= 0, 'index.html should load render-hit-test.js');
assert(indexSource.indexOf(hitRel) < indexSource.indexOf(logicRel), 'render-hit-test.js should load before logic.js');
assert(logicSource.includes('P11a-2 note: screen/world projection and floor-bounds helpers are delegated'), 'logic.js should contain P11a-2 notice');
assert(logicSource.includes('function requireRenderHitTestForLogic()'), 'logic.js should contain hit-test boundary wrapper');
assert(logicSource.includes('requireRenderHitTestForLogic().worldToScreen'), 'iso should delegate to render-hit-test worldToScreen');
assert(logicSource.includes('requireRenderHitTestForLogic().screenToFloor'), 'screenToFloor should delegate to render-hit-test screenToFloor');
assert(logicSource.includes('requireRenderHitTestForLogic().computeFloorScreenBounds'), 'computeFloorScreenBounds should delegate to render-hit-test');
assert(!/worldToScreenWithViewRotation\s*\(\s*\{\s*x:\s*x,\s*y:\s*y,\s*z:\s*z\s*\}/.test(logicSource), 'logic.js should not directly own iso view-rotation implementation');
assert(!/screenToWorldWithViewRotation\s*\(\s*\{\s*x:\s*sx,\s*y:\s*sy,\s*z:\s*0\s*\}/.test(logicSource), 'logic.js should not directly own screen-to-world view-rotation implementation');

const sandboxWindow = { App: { presentation: { render: {} } } };
const context = { window: sandboxWindow, globalThis: sandboxWindow, module: { exports: {} }, exports: {}, console };
vm.runInNewContext(hitSource, context, { filename: hitRel });
const api = sandboxWindow.__RENDER_HIT_TEST__;
assert(api, 'render hit-test API should attach to window');
assert.strictEqual(typeof api.worldToScreen, 'function', 'worldToScreen should be exported');
assert.strictEqual(typeof api.screenToFloor, 'function', 'screenToFloor should be exported');
assert.strictEqual(typeof api.computeFloorScreenBounds, 'function', 'computeFloorScreenBounds should be exported');

const fallbackInput = {
  settings: { tileW: 64, tileH: 32, originX: 100, originY: 50, gridW: 10, gridH: 8 },
  camera: { x: 7, y: 9 },
  viewW: 1000,
  viewH: 800,
};
assert.strictEqual(JSON.stringify(api.worldToScreen(Object.assign({}, fallbackInput, { x: 2, y: 1, z: 3 }))), JSON.stringify({
  x: 139,
  y: 11,
}));
const floor = api.screenToFloor(Object.assign({}, fallbackInput, { sx: 139, sy: 155 }));
assert(Math.abs(floor.x - 3.5) < 1e-9 && Math.abs(floor.y - 2.5) < 1e-9, 'fallback screenToFloor should invert isometric floor projection');
assert.strictEqual(JSON.stringify(api.computeFloorScreenBounds(fallbackInput)), JSON.stringify({
  minX: 0,
  maxX: 429,
  minY: 57,
  maxY: 349,
}));

const calls = [];
const coreInput = {
  viewRotationCoreApi: {
    worldToScreenWithViewRotation(point, rotation, config) {
      calls.push(['world', point, rotation, config.tileW]);
      return { x: point.x + rotation + config.tileW, y: point.y + point.z };
    },
    screenToWorldWithViewRotation(point, rotation, config) {
      calls.push(['screen', point, rotation, config.tileH]);
      return { x: point.x - rotation, y: point.y - config.tileH };
    },
  },
  rotation: 6,
  projectionConfig: { tileW: 70, tileH: 35 },
};
assert.strictEqual(JSON.stringify(api.worldToScreen(Object.assign({}, coreInput, { x: 4, y: 5, z: 6 }))), JSON.stringify({ x: 76, y: 11 }));
assert.strictEqual(JSON.stringify(api.screenToFloor(Object.assign({}, coreInput, { sx: 9, sy: 40 }))), JSON.stringify({ x: 7, y: 5 }));
assert.strictEqual(calls[0][2], 2, 'rotation should be normalized before world projection');
assert.strictEqual(calls[1][2], 2, 'rotation should be normalized before screen projection');

console.log(JSON.stringify({ status: 'PASS', tested: [hitRel, logicRel, indexRel] }, null, 2));
