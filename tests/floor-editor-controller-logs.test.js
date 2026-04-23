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
let events = [];
controller.subscribe((state, meta) => { events.push({ reason: meta.reason, payload: meta.payload }); });

controller.newRectanglePlan({ cols: 10, rows: 8, levelCount: 1, defaultWallHeight: 2 });
controller.addLevel();
let addEvent = events.filter((item) => item.reason === 'add-level-empty').pop();
assert(addEvent.payload.before.offsetX === 0 && addEvent.payload.before.offsetY === 0, 'add-level before offset should be zero');
assert(addEvent.payload.after.offsetX === 0 && addEvent.payload.after.offsetY === 0, 'add-level after offset should be zero');
assert(addEvent.payload.offsetChangedWithoutExplicitOffsetAction === false, 'add-level should not flag unexpected offset change');
assert(addEvent.payload.actionType === 'add-level-empty', 'add-level payload should declare empty mode');
assert(addEvent.payload.initMode === 'empty', 'add-level initMode should be empty');
assert(addEvent.payload.copiedFromLevel === null, 'add-level should not copy from another level');
assert(addEvent.payload.copiedCellCount === 0, 'add-level copiedCellCount should be zero');
assert(addEvent.payload.targetLevelCellCountAfter === 0, 'add-level should leave target level empty');

controller.setActiveLevel(1);
const state = controller.getState();
const before = domain.getLevelMeta(state.floorPlan, 1);
controller.nudgeActiveLevelElevation(1);
let elevEvent = events.filter((item) => item.reason === 'nudge-active-level-elevation-gap').pop();
assert(elevEvent.payload.before.offsetX === before.offsetX, 'elev log before offsetX should match');
assert(elevEvent.payload.after.offsetX === before.offsetX, 'elev should not change offsetX');
assert(elevEvent.payload.whetherElevationChanged === true, 'elev event should record elevation change');
assert(elevEvent.payload.offsetChangedWithoutExplicitOffsetAction === false, 'normal elev should not flag anomaly');

const original = domain.nudgeLevelElevationGap;
domain.nudgeLevelElevationGap = function (plan, level, delta) {
  original(plan, level, delta);
  domain.nudgeLevelOffset(plan, level, 1, 0);
  return plan;
};
controller.nudgeActiveLevelElevation(1);
elevEvent = events.filter((item) => item.reason === 'nudge-active-level-elevation-gap').pop();
assert(elevEvent.payload.offsetChangedWithoutExplicitOffsetAction === true, 'anomalous elev event should flag offset change');
assert(elevEvent.payload.anomaly === 'OFFSET_CHANGED_WITHOUT_EXPLICIT_OFFSET_ACTION', 'anomalous elev event should emit explicit anomaly tag');

console.log('floor-editor-controller-logs.test.js: OK');
