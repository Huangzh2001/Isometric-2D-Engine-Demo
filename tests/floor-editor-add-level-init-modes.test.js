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
function assert(cond, msg) { if (!cond) throw new Error(msg); }

let events = [];
controller.subscribe((state, meta) => { events.push({ reason: meta.reason, payload: meta.payload, state }); });

controller.newRectanglePlan({ cols: 12, rows: 9, levelCount: 1, defaultWallHeight: 2 });
let state = controller.getState();
const sourceCellCount = Object.keys(state.floorPlan.levels['0']).length;

controller.addLevel();
state = controller.getState();
assert(state.floorPlan.levelCount === 2, 'add-level should increase levelCount');
assert(Object.keys(state.floorPlan.levels['1']).length === 0, 'add-level should create empty target layer');
assert(state.floorPlan.levelBounds['1'].cols === 12 && state.floorPlan.levelBounds['1'].rows === 9, 'add-level should initialize target bounds from source');
let addEvent = events.filter((item) => item.reason === 'add-level-empty').pop();
assert(addEvent.payload.initMode === 'empty', 'add-level should log initMode=empty');
assert(addEvent.payload.copiedCellCount === 0, 'add-level should not copy cells');
assert(addEvent.payload.targetLevelCellCountAfter === 0, 'add-level target level should stay empty');

controller.copyActiveLevel();
state = controller.getState();
assert(state.floorPlan.levelCount === 3, 'duplicate-level should increase levelCount');
assert(Object.keys(state.floorPlan.levels['2']).length === 0, 'duplicating empty current level should still reflect source emptiness');

controller.setActiveLevel(0);
controller.copyActiveLevel();
state = controller.getState();
const copiedCount = Object.keys(state.floorPlan.levels['3']).length;
assert(copiedCount === sourceCellCount, 'duplicate-level should copy current layer cells when source is non-empty');
let dupEvent = events.filter((item) => item.reason === 'duplicate-level').pop();
assert(dupEvent.payload.initMode === 'duplicate', 'duplicate-level should log initMode=duplicate');
assert(dupEvent.payload.copiedFromLevel === 0, 'duplicate-level should log copiedFromLevel');
assert(dupEvent.payload.copiedCellCount === sourceCellCount, 'duplicate-level should log copied cell count');
assert(Object.keys(state.floorPlan.levels['0']).length === sourceCellCount, 'duplicate-level must not mutate source layer');

if (typeof controller.addRectInitializedLevel === 'function') {
  controller.addRectInitializedLevel();
  state = controller.getState();
  const rectCount = Object.keys(state.floorPlan.levels[String(state.activeLevel)]).length;
  const bounds = state.floorPlan.levelBounds[String(state.activeLevel)];
  assert(rectCount === bounds.cols * bounds.rows, 'rect-init mode should create full rectangle footprint');
  const rectEvent = events.filter((item) => item.reason === 'add-level-rect-init').pop();
  assert(rectEvent.payload.initMode === 'rect', 'rect-init should log initMode=rect');
}

console.log('floor-editor-add-level-init-modes.test.js: OK');
