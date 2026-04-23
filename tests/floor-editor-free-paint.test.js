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
  readProjectFile() { return Promise.reject(new Error('not implemented')); }
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
runFile(context, 'src/core/domain/floor-plan-hit-test.js');

const controller = context.window.__FLOOR_EDITOR_APP__;
const domain = context.window.__FLOOR_EDITOR_DOMAIN__;
const hitApi = context.window.__FLOOR_EDITOR_HIT_TEST__;
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const view = { zoom: 1, offsetX: 0, offsetY: 0, showGrid: false };
const canvasInfo = { width: 1200, height: 900 };
const constants = { tileW: 64, tileH: 32, levelStep: 28 };

// 内部空洞可直接补回
controller.newRectanglePlan({ name: 'holes', cols: 5, rows: 5, levelCount: 1, defaultWallHeight: 2 });
let state = controller.getState();
domain.removeCellAt(state.floorPlan, 0, 2, 2);
state = controller.getState();
let center = hitApi.worldToScreen(2, 2, domain.getAbsoluteLevelTransform(state.floorPlan, 0), view, canvasInfo, constants);
let hover = hitApi.hitTestLevel(domain, state.floorPlan, 0, center.x, center.y, view, canvasInfo, constants, { tool: 'brush-floor' });
assert(hover && hover.x === 2 && hover.y === 2, 'internal hole should resolve directly to hole cell');
assert(hover.diagnostics.targetWithinBounds === true, 'internal hole should be within current bounds');
controller.commitToolAtHover(hover);
state = controller.getState();
assert(domain.getCell(state.floorPlan, 0, 2, 2), 'internal hole should be repainted directly');

// bounds 内远离已有 footprint 的孤立位置可直接添加
controller.newCustomPlan({ name: 'islands', cols: 8, rows: 8, levelCount: 1, defaultWallHeight: 2 });
state = controller.getState();
domain.addCellAt(state.floorPlan, 0, 0, 0, { placeable: true, autoGrow: true });
center = hitApi.worldToScreen(5, 5, domain.getAbsoluteLevelTransform(state.floorPlan, 0), view, canvasInfo, constants);
hover = hitApi.hitTestLevel(domain, state.floorPlan, 0, center.x, center.y, view, canvasInfo, constants, { tool: 'brush-floor' });
assert(hover && hover.x === 5 && hover.y === 5, 'non-adjacent in-bounds target should resolve directly');
assert(hover.diagnostics.paintMode === 'free-paint', 'non-adjacent target should use free-paint mode');
assert(hover.diagnostics.isAdjacentToExisting === false, 'non-adjacent target should not require adjacency');
controller.commitToolAtHover(hover);
state = controller.getState();
assert(domain.getCell(state.floorPlan, 0, 5, 5), 'non-adjacent in-bounds target should create isolated floor cell');

// bounds 外直接点击会自动 grow bounds 后创建新格
controller.newCustomPlan({ name: 'grow', cols: 1, rows: 1, levelCount: 1, defaultWallHeight: 2 });
state = controller.getState();
domain.addCellAt(state.floorPlan, 0, 0, 0, { placeable: true, autoGrow: true });
center = hitApi.worldToScreen(-3, 4, domain.getAbsoluteLevelTransform(state.floorPlan, 0), view, canvasInfo, constants);
hover = hitApi.hitTestLevel(domain, state.floorPlan, 0, center.x, center.y, view, canvasInfo, constants, { tool: 'brush-floor' });
assert(hover && hover.x === -3 && hover.y === 4, 'out-of-bounds target should resolve directly');
assert(hover.diagnostics.targetWithinBounds === false, 'out-of-bounds target should be flagged before commit');
controller.commitToolAtHover(hover);
state = controller.getState();
assert(domain.getCell(state.floorPlan, 0, -3, 4), 'out-of-bounds target should be created after grow');
const bounds = domain.getLevelBounds(state.floorPlan, 0);
assert(domain.isWithinLevelBounds(bounds, -3, 4), 'bounds should grow to include painted out-of-bounds target');

console.log('floor-editor-free-paint.test.js: OK');
