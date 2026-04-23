const fs = require('fs');
const vm = require('vm');
const path = require('path');

function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

const context = { window: { __APP_NAMESPACE: { bind() {} } }, console, Date, JSON, Math, Number, String, Object, Array, isFinite };
vm.createContext(context);
runFile(context, 'src/core/domain/floor-plan-domain-core.js');
runFile(context, 'src/core/domain/floor-plan-hit-test.js');

const domain = context.window.__FLOOR_EDITOR_DOMAIN__;
const hitApi = context.window.__FLOOR_EDITOR_HIT_TEST__;
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const plan = domain.createCustomPlan({ cols: 2, rows: 2, levelCount: 1, defaultWallHeight: 2 });
domain.setCellEnabled(plan, 0, 0, 0, true, { placeable: true });
domain.setCellEnabled(plan, 0, 1, 0, true, { placeable: true });
domain.setCellEnabled(plan, 0, 0, 1, true, { placeable: true });
domain.setCellEnabled(plan, 0, 1, 1, true, { placeable: true });
const view = { zoom: 1, offsetX: 0, offsetY: 0, showGrid: false };
const canvasInfo = { width: 1200, height: 900 };
const constants = { tileW: 64, tileH: 32, levelStep: 28 };
const transform = domain.getAbsoluteLevelTransform(plan, 0);

function hitCell(x, y) {
  const center = hitApi.worldToScreen(x, y, transform, view, canvasInfo, constants);
  const hit = hitApi.hitTestLevel(domain, plan, 0, center.x, center.y, view, canvasInfo, constants, { tool: 'brush-floor' });
  assert(hit, 'expected hit for logical cell ' + x + ',' + y);
  return hit;
}

let hit = hitCell(0, -1);
assert(hit.x === 0 && hit.y === -1, 'north ring should be hittable');
assert(hit.chosenDirection === 'n', 'north ring should resolve to n');

hit = hitCell(0, 2);
assert(hit.x === 0 && hit.y === 2, 'south ring should be hittable');
assert(hit.chosenDirection === 's', 'south ring should resolve to s');

hit = hitCell(-1, 0);
assert(hit.x === -1 && hit.y === 0, 'west ring should be hittable');
assert(hit.chosenDirection === 'w', 'west ring should resolve to w');

hit = hitCell(2, 0);
assert(hit.x === 2 && hit.y === 0, 'east ring should be hittable');
assert(hit.chosenDirection === 'e', 'east ring should resolve to e');

const nw = hitCell(-1, -1);
assert(nw, 'corner outside should resolve to deterministic candidate');

console.log('floor-editor-four-direction-stability.test.js: OK');
