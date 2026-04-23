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

controller.newRectanglePlan({ name: 'grow-test', cols: 1, rows: 1, levelCount: 1, defaultWallHeight: 2 });
let state = controller.getState();
const view = { zoom: 1, offsetX: 0, offsetY: 0, showGrid: false };
const canvasInfo = { width: 1200, height: 900 };
const constants = { tileW: 64, tileH: 32, levelStep: 28 };
const transform = domain.getAbsoluteLevelTransform(state.floorPlan, 0);
const center = hitApi.worldToScreen(-1, 0, transform, view, canvasInfo, constants);
const hover = hitApi.hitTestLevel(domain, state.floorPlan, 0, center.x, center.y, view, canvasInfo, constants, { tool: 'brush-floor' });
assert(hover, 'west outside cell should be hittable even when showGrid=false');
assert(hover.withinBounds === false, 'west outside cell should be marked outside current bounds');
controller.commitToolAtHover(hover);
state = controller.getState();
const bounds = domain.getLevelBounds(state.floorPlan, 0);
assert(bounds.originX === -1, 'growing west should shift originX to -1');
assert(domain.getCell(state.floorPlan, 0, -1, 0), 'outside cell should be committed after grow');

console.log('floor-editor-grow-bounds-hit.test.js: OK');
