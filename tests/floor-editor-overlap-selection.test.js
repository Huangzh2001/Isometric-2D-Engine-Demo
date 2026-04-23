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
runFile(context, 'src/application/floor-editor/floor-editor-controller.js');

const controller = context.window.__FLOOR_EDITOR_APP__;
const domain = context.window.__FLOOR_EDITOR_DOMAIN__;
function assert(cond, msg) { if (!cond) throw new Error(msg); }

controller.newRectanglePlan({ name: 'test', cols: 18, rows: 14, levelCount: 1, defaultWallHeight: 2 });
controller.addLevel();
controller.addLevel();
let state = controller.getState();
let preview = domain.getOverlapPreviewData(state.floorPlan, state.activeLevel || 0, state.view.selectedOverlapLevels || []);
assert(preview.levels.length === 3, 'empty selectedOverlapLevels should render all visible levels');
controller.clearSelectedOverlapLevels();
controller.toggleSelectedOverlapLevel(0);
controller.toggleSelectedOverlapLevel(2);
state = controller.getState();
preview = domain.getOverlapPreviewData(state.floorPlan, state.activeLevel || 0, state.view.selectedOverlapLevels || []);
assert(preview.levels.length === 2, 'selectedOverlapLevels should constrain overlap preview to selected levels');
assert(preview.levels[0].level === 0 && preview.levels[1].level === 2, 'selected overlap levels should be [0,2]');
console.log('floor-editor-overlap-selection.test.js: OK');
