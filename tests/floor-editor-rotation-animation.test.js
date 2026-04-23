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
const meta = [];
controller.subscribe(function (_state, event) { meta.push(event); });
controller.newRectanglePlan({ cols: 10, rows: 8, levelCount: 1, defaultWallHeight: 2 });
const before = JSON.stringify(controller.getState().floorPlan);
controller.setRotationAnimationMs(160);
controller.rotateViewRight();
let state = controller.getState();
assert(state.view.isRotationAnimating === true, 'rotationAnimationMs > 0 should enter animation state');
assert(state.view.rotation === 0, 'during animation model rotation should remain previous discrete value');
assert(state.view.rotationTo === 1, 'animation target should be rotationTo=1');
const nonce = state.view.rotationAnimationNonce;
controller.rotateViewRight();
state = controller.getState();
assert(state.view.rotationAnimationNonce === nonce, 'continuous rotate clicks during animation should be ignored');
controller.completeViewRotationAnimation(nonce);
state = controller.getState();
assert(state.view.isRotationAnimating === false, 'completeViewRotationAnimation should end animation state');
assert(state.view.rotation === 1, 'completeViewRotationAnimation should commit final target rotation');
assert(JSON.stringify(state.floorPlan) === before, 'rotation animation should not mutate floorPlan data');
const reasons = meta.map((item) => item && item.reason).filter(Boolean);
assert(reasons.indexOf('rotate-view-start') >= 0, 'should emit rotate-view-start');
assert(reasons.indexOf('rotate-view-complete') >= 0, 'should emit rotate-view-complete');
assert(reasons.indexOf('rotate-view-ignored') >= 0, 'continuous click while animating should emit rotate-view-ignored');

console.log('floor-editor-rotation-animation.test.js: OK');
