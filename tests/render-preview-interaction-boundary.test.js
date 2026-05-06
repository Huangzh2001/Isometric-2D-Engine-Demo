#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const controllerRel = 'src/presentation/render/interaction/render-preview-interaction-controller.js';
const renderRel = 'src/presentation/render/render.js';
const indexRel = 'index.html';

const controllerSource = read(controllerRel);
const renderSource = read(renderRel);
const indexSource = read(indexRel);

assert(indexSource.indexOf(controllerRel) >= 0, 'index.html should load render-preview-interaction-controller.js');
assert(indexSource.indexOf(controllerRel) < indexSource.indexOf(renderRel), 'preview interaction controller should load before render.js');
assert(renderSource.includes('P11a-3 note: preview update and screen picking are delegated'), 'render.js should contain P11a-3 notice');
assert(renderSource.includes('function requireRenderPreviewInteractionControllerForRender()'), 'render.js should contain preview interaction wrapper');
assert(renderSource.includes('requireRenderPreviewInteractionControllerForRender().updatePreview'), 'updatePreview should delegate');
assert(renderSource.includes('requireRenderPreviewInteractionControllerForRender().pickBoxAtScreen'), 'pickBoxAtScreen should delegate');
assert(renderSource.includes('requireRenderPreviewInteractionControllerForRender().pickFaceAtScreen'), 'pickFaceAtScreen should delegate');

const sandboxWindow = { App: { presentation: { render: {} } } };
const context = { window: sandboxWindow, globalThis: sandboxWindow, module: { exports: {} }, exports: {}, console };
vm.runInNewContext(controllerSource, context, { filename: controllerRel });
const api = sandboxWindow.__RENDER_PREVIEW_INTERACTION_CONTROLLER__;
assert(api, 'preview interaction controller should attach to window');
assert.strictEqual(typeof api.updatePreview, 'function', 'updatePreview should be exported');
assert.strictEqual(typeof api.pickBoxAtScreen, 'function', 'pickBoxAtScreen should be exported');
assert.strictEqual(typeof api.pickFaceAtScreen, 'function', 'pickFaceAtScreen should be exported');

const boxes = [
  { id: 1, name: 'low' },
  { id: 2, name: 'high' },
];
const faces = [
  { boxId: 1, fallbackDepth: 3, poly: [{ x: 0, y: 0 }] },
  { boxId: 2, fallbackDepth: 8, poly: [{ x: 0, y: 0 }] },
];
const deps = {
  boxes: () => boxes,
  xrayFaces: () => false,
  buildSurfaceFaces(list, scale, includeHidden) {
    assert.strictEqual(list, boxes, 'pick should receive injected boxes');
    assert.strictEqual(scale, 1, 'pick should use scale 1');
    assert.strictEqual(includeHidden, false, 'pick should use xrayFaces fallback');
    return faces.slice();
  },
  pointInPoly() { return true; },
};
assert.strictEqual(api.pickBoxAtScreen({ deps, sx: 12, sy: 34 }).id, 2, 'pickBoxAtScreen should return highest-depth hit box');
assert.strictEqual(api.pickFaceAtScreen({ deps, sx: 12, sy: 34 }).boxId, 2, 'pickFaceAtScreen should return highest-depth hit face');

const editor = { mode: 'place' };
const calls = [];
const previewDeps = Object.assign({}, deps, {
  editor,
  mouse: { inside: true, x: 10, y: 20 },
  hitTopFace() { return { x: 4, y: 5, z: 2 }; },
  screenToFloor() { throw new Error('screenToFloor should not be used when top hit exists in place mode'); },
  computeCandidate(cellX, cellY, proto) {
    calls.push(['candidate', cellX, cellY, proto.id]);
    return {
      valid: true,
      reason: 'ok',
      prefabId: proto.id,
      origin: { x: cellX, y: cellY, z: 2 },
      bbox: { w: 1, d: 1, h: 1 },
      box: { x: cellX, y: cellY, z: 2 },
      boxes: [{ x: cellX, y: cellY, z: 2 }],
      overlapIds: [],
    };
  },
  currentProto() { return { id: 'cube' }; },
  currentPrefab() { return { id: 'cube-current' }; },
  logItemRotationPrototype(name, payload) { calls.push(['logRotation', name, payload.prefabId, payload.valid]); },
  getEditorPreviewFacingValue() { return 3; },
  detailLog(text) { calls.push(['detail', text]); },
  verboseLog() { return true; },
  getLastPreviewSignature() { return ''; },
  setLastPreviewSignature(value) { calls.push(['setSig', value]); },
  pushLog(value) { calls.push(['pushLog', value]); },
});
api.updatePreview({ deps: previewDeps });
assert.strictEqual(editor.preview.prefabId, 'cube', 'updatePreview should assign computed preview');
assert.deepStrictEqual(calls[0], ['candidate', 4, 5, 'cube'], 'updatePreview should use top-hit cell for place mode');
assert(calls.some((row) => row[0] === 'logRotation' && row[1] === 'placement-preview'), 'updatePreview should preserve placement preview rotation logging');
assert(calls.some((row) => row[0] === 'pushLog' && /^preview: /.test(row[1])), 'updatePreview should preserve preview signature log');

const deleteEditor = { mode: 'delete', preview: { old: true } };
const deleteDeps = Object.assign({}, deps, { editor: deleteEditor, mouse: { inside: true, x: 1, y: 2 } });
api.updatePreview({ deps: deleteDeps });
assert.strictEqual(deleteEditor.preview, null, 'delete mode should clear preview');
assert.strictEqual(deleteEditor.hoverDeleteBox.id, 2, 'delete mode should set hoverDeleteBox through picker');

console.log(JSON.stringify({ status: 'PASS', tested: [controllerRel, renderRel, indexRel] }, null, 2));
