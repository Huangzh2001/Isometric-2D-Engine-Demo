const fs = require('fs');
const path = require('path');
const vm = require('vm');
function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const registry = Object.create(null);
const runtimeState = {
  editor: { rotation: 0, previewFacing: 0 },
  setEditorRotationValue(next) { this.editor.rotation = next; return next; },
  setPreviewFacingValue(next) { this.editor.previewFacing = next; return next; }
};
const placementCore = {
  calls: [],
  updateInstanceRotation(id, rotation) { this.calls.push({ id, rotation }); return { instanceId: id, rotation }; }
};
const namespace = {
  bind(path, value) { registry[path] = value; if (path.startsWith('controllers.')) { const key = path.split('.')[1]; app.controllers[key] = value; } },
  getPath(path) { return registry[path] || null; }
};
const app = { state: { runtimeState }, controllers: {} };
registry['state'] = { runtimeState };
registry['state.runtimeState'] = runtimeState;
registry['application.placementCore'] = placementCore;
registry['placement.routeAudit'] = null;
const context = {
  console,
  JSON,
  Math,
  Number,
  String,
  Object,
  Array,
  Date,
  window: {
    __APP_NAMESPACE: namespace,
    App: app
  },
  inspectorState: { selectedInstanceId: 'inst_01' },
  findInstanceById(id) { return { instanceId: id, rotation: 1, x: 1, y: 2, z: 0 }; },
  pushLog() {}
};
vm.createContext(context);
runFile(context, 'src/application/controllers/app-controllers.js');
const placement = app.controllers.placement;
assert(placement && typeof placement.rotatePreviewFacing === 'function', 'placement controller should expose rotatePreviewFacing');
assert(placement.rotatePreviewFacing(1, 'test').rotation === 1, 'rotatePreviewFacing should update preview rotation');
assert(runtimeState.editor.previewFacing === 1, 'runtime state previewFacing should be updated to 1');
assert(runtimeState.editor.rotation === 0, 'preview facing must not mutate view/editor rotation');
assert(placement.setPreviewFacing(7, 'test').rotation === 3, 'setPreviewFacing should normalize to 0..3');
const selected = placement.rotateSelectedInstanceFacing(1, 'test');
assert(selected.ok === true, 'rotateSelectedInstanceFacing should succeed when selection exists');
assert(placementCore.calls.length === 1 && placementCore.calls[0].rotation === 2, 'selected instance rotation should route through placement core');
console.log('app-controller-item-facing.test.js: OK');
