const fs = require('fs');
const vm = require('vm');
const path = require('path');

function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

const storage = {
  _payload: null,
  saveAutosave(snapshot) { this._payload = JSON.parse(JSON.stringify(snapshot)); },
  loadAutosave() { return this._payload; },
  downloadProject() {},
  readProjectFile() { return Promise.reject(new Error('not implemented in test')); }
};

const context = {
  window: {
    __APP_NAMESPACE: { bind() {} },
    __FLOOR_EDITOR_STORAGE__: storage,
  },
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Object,
  Array,
  isFinite,
  setTimeout,
  clearTimeout,
};
vm.createContext(context);
runFile(context, 'src/core/domain/floor-plan-domain-core.js');
runFile(context, 'src/core/state/floor-editor-state.js');
runFile(context, 'src/application/floor-editor/floor-editor-controller.js');

const controller = context.window.__FLOOR_EDITOR_APP__;
function assert(cond, msg) { if (!cond) throw new Error(msg); }

controller.newRectanglePlan({ name: 'test', cols: 18, rows: 14, levelCount: 1, defaultWallHeight: 2 });
controller.addLevel();
let state = controller.getState();
assert(state.floorPlan.levelCount === 2, 'add-level should increase levelCount to 2');
assert(Object.keys(state.floorPlan.levels['1']).length === 0, 'new level should default to empty');
assert(state.floorPlan.levelMeta['1'].offsetX === 0 && state.floorPlan.levelMeta['1'].offsetY === 0, 'new level should default to offset (0,0)');

controller.setActiveLevel(1);
controller.applyCurrentLevelMeta({ cols: 15, rows: 7 });
state = controller.getState();
assert(state.floorPlan.levelBounds['0'].cols === 18 && state.floorPlan.levelBounds['0'].rows === 14, 'L0 bounds should remain 18x14');
assert(state.floorPlan.levelBounds['1'].cols === 15 && state.floorPlan.levelBounds['1'].rows === 7, 'L1 bounds should become 15x7');
controller.nudgeActiveLevelOffset(1, -1);
state = controller.getState();
assert(state.floorPlan.levelMeta['1'].offsetX === 1, 'offsetX should nudge to 1');
assert(state.floorPlan.levelMeta['1'].offsetY === -1, 'offsetY should nudge to -1');
const beforeOffsetX = state.floorPlan.levelMeta['1'].offsetX;
const beforeOffsetY = state.floorPlan.levelMeta['1'].offsetY;
controller.nudgeActiveLevelElevation(1);
state = controller.getState();
assert(state.floorPlan.levelMeta['1'].offsetX === beforeOffsetX, 'elevation change must not alter offsetX');
assert(state.floorPlan.levelMeta['1'].offsetY === beforeOffsetY, 'elevation change must not alter offsetY');
assert(state.floorPlan.levelMeta['1'].elevationGap >= 1, 'non-bottom elevationGap must stay >= 1');

console.log('floor-editor-controller-multilevel.test.js: OK');
