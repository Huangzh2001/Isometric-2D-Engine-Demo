const fs = require('fs');
const vm = require('vm');
const path = require('path');

function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

const storage = { saveAutosave() {}, loadAutosave() { return null; }, downloadProject() {}, readProjectFile() { return Promise.reject(new Error('not implemented')); } };
const context = {
  window: { __APP_NAMESPACE: { bind() {} }, __FLOOR_EDITOR_STORAGE__: storage },
  console, Date, JSON, Math, Number, String, Object, Array, isFinite, setTimeout, clearTimeout
};
vm.createContext(context);
runFile(context, 'src/core/domain/floor-plan-domain-core.js');
runFile(context, 'src/core/state/floor-editor-state.js');
runFile(context, 'src/core/domain/floor-plan-hit-test.js');
runFile(context, 'src/application/floor-editor/floor-editor-controller.js');

const controller = context.window.__FLOOR_EDITOR_APP__;
function assert(cond, msg) { if (!cond) throw new Error(msg); }

controller.newRectanglePlan({ cols: 10, rows: 8, levelCount: 1, defaultWallHeight: 2 });
controller.setRotationAnimationMs(0);
const before = JSON.stringify(controller.getState().floorPlan);
controller.rotateViewRight();
let state = controller.getState();
assert(state.view.rotation === 1, 'rotateViewRight should set rotation=1 when animation disabled');
assert(state.view.isRotationAnimating === false, 'animation disabled should commit instantly');
assert(JSON.stringify(state.floorPlan) === before, 'rotateViewRight should not mutate model data');
controller.rotateViewLeft();
state = controller.getState();
assert(state.view.rotation === 0, 'rotateViewLeft should restore rotation=0');
assert(JSON.stringify(state.floorPlan) === before, 'rotateViewLeft should not mutate model data');
controller.setViewRotation(6, { forceInstant: true });
state = controller.getState();
assert(state.view.rotation === 2, 'setViewRotation should normalize to modulo 4');
assert(JSON.stringify(state.floorPlan) === before, 'setViewRotation should not mutate model data');

console.log('floor-editor-controller-view-rotation.test.js: OK');
