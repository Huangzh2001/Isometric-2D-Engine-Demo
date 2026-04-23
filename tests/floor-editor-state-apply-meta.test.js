const fs = require('fs');
const vm = require('vm');
const path = require('path');

function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

const context = {
  window: { __APP_NAMESPACE: { bind() {} } },
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

const stateApi = context.window.__FLOOR_EDITOR_STATE__;
function assert(cond, msg) { if (!cond) throw new Error(msg); }

stateApi.applyPlanMutation('resize-level-0', function (plan, core) {
  core.resizeBounds(plan, 16, 8, { level: 0, rebuildRectangle: true });
});
let state = stateApi.getState();
assert(state.floorPlan.levelBounds['0'].cols === 16, 'state mutation should persist level 0 cols=16');
assert(Object.keys(state.floorPlan.levels['0']).length === 128, 'state mutation should rebuild rectangle cells');

stateApi.applyPlanMutation('add-level', function (plan, core) {
  core.addLevel(plan, 0, { autoOffset: false, copyWalls: false });
});
stateApi.setActiveLevel(1);
stateApi.applyPlanMutation('resize-level-1', function (plan, core) {
  core.resizeBounds(plan, 7, 9, { level: 1, rebuildRectangle: true });
});
state = stateApi.getState();
assert(state.floorPlan.levelBounds['0'].cols === 16, 'level 0 cols should remain 16');
assert(state.floorPlan.levelBounds['1'].cols === 7, 'level 1 cols should become 7');
assert(state.floorPlan.levelMeta['1'].offsetX === 0 && state.floorPlan.levelMeta['1'].offsetY === 0, 'new level default offset must be zero');
const beforeOffsetX = state.floorPlan.levelMeta['1'].offsetX;
const beforeOffsetY = state.floorPlan.levelMeta['1'].offsetY;
stateApi.applyPlanMutation('elev-level-1', function (plan, core) {
  core.nudgeLevelElevationGap(plan, 1, 1);
});
state = stateApi.getState();
assert(state.floorPlan.levelMeta['1'].offsetX === beforeOffsetX, 'elevation change must not alter offsetX');
assert(state.floorPlan.levelMeta['1'].offsetY === beforeOffsetY, 'elevation change must not alter offsetY');
assert(state.floorPlan.levelMeta['1'].elevationGap >= 1, 'non-bottom elevationGap must be >= 1');

console.log('floor-editor-state-apply-meta.test.js: OK');
