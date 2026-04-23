const fs = require('fs');
const path = require('path');
const vm = require('vm');
function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const registry = Object.create(null);
const itemRotationEvents = [];
const runtimeState = {
  editor: { rotation: 2, previewFacing: 0 },
  setEditorRotationValue(next) { this.editor.rotation = ((next % 4) + 4) % 4; return this.editor.rotation; },
  setPreviewFacingValue(next) { this.editor.previewFacing = ((next % 4) + 4) % 4; return this.editor.previewFacing; }
};
const app = { state: { runtimeState }, controllers: {}, domain: {} };
const namespace = {
  bind(p, v) { registry[p] = v; if (p === 'domain.itemFacingCore') app.domain.itemFacingCore = v; if (p.startsWith('controllers.')) app.controllers[p.split('.')[1]] = v; },
  getPath(p) { return registry[p] || null; }
};
registry['state'] = { runtimeState };
registry['state.runtimeState'] = runtimeState;
registry['infrastructure.itemRotationDiagnostic'] = { record(kind, payload) { itemRotationEvents.push({ kind, payload }); } };
registry['state.prefabRegistry'] = {
  getPrefabById(id) { return { id: id || 'debug_rect_2x1_5faces', name: 'Debug Rect', w: 2, d: 1, h: 1, voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] }; }
};
const context = {
  console, JSON, Math, Number, String, Object, Array, Date,
  window: { __APP_NAMESPACE: namespace, App: app },
  editor: runtimeState.editor,
  currentPrefab() { return { id: 'debug_rect_2x1_5faces', name: 'Debug Rect', w: 2, d: 1, h: 1, voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] }; },
  inspectorState: { selectedInstanceId: 'placed_1' },
  findInstanceById(id) { return { instanceId: id, prefabId: 'debug_cube_5faces', rotation: 3, x: 1, y: 1, z: 0 }; },
  pushLog() {}
};
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
runFile(context, 'src/application/controllers/app-controllers.js');
const placement = app.controllers.placement;
assert(runtimeState.editor.previewFacing === 0, 'previewFacing should initialize to 0');
assert(runtimeState.editor.rotation === 2, 'view/editor rotation should be independent fixture');
let r1 = placement.rotatePreviewFacingByWheel(-1, 'test.wheel-up');
assert(r1.nextPreviewFacing === 1 && runtimeState.editor.previewFacing === 1, 'wheel up should advance previewFacing');
assert(runtimeState.editor.rotation === 2, 'wheel preview rotate must not mutate view/editor rotation');
let r2 = placement.rotatePreviewFacingByWheel(1, 'test.wheel-down');
assert(r2.nextPreviewFacing === 0 && runtimeState.editor.previewFacing === 0, 'wheel down should reverse previewFacing');
assert(context.findInstanceById('placed_1').rotation === 3, 'test fixture placed instance remains unchanged by preview rotate');
assert(itemRotationEvents.some(e => e.kind === 'preview-wheel-rotate'), 'diagnostic should record preview-wheel-rotate');
assert(itemRotationEvents.some(e => e.kind === 'preview-variant-build'), 'diagnostic should record preview-variant-build');
console.log('main-editor-preview-facing.test.js: OK');
