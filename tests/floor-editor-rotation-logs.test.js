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
controller.setRotationAnimationMs(0);
controller.rotateViewRight();
controller.rotateViewRight();
controller.rotateViewRight();
controller.rotateViewRight();
const reasons = meta.map((item) => item && item.reason).filter(Boolean);
assert(reasons.filter((reason) => reason === 'rotate-view-commit').length >= 4, 'should emit rotate-view-commit for direct rotations');
const payload = meta.find((item) => item && item.reason === 'rotate-view-commit');
assert(payload && typeof payload.payload.previousRotation === 'number', 'rotate-view payload should include previousRotation');
assert(payload && typeof payload.payload.nextRotation === 'number', 'rotate-view payload should include nextRotation');
assert(payload && typeof payload.payload.previousDirectionLabel === 'string', 'rotate-view payload should include previousDirectionLabel');
assert(payload && typeof payload.payload.nextDirectionLabel === 'string', 'rotate-view payload should include nextDirectionLabel');
assert(payload && typeof payload.payload.renderedCells === 'number', 'rotate-view payload should include renderedCells');

console.log('floor-editor-rotation-logs.test.js: OK');
