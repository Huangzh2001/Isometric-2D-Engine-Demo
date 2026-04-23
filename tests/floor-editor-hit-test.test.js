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

const plan = domain.createRectanglePlan({ cols: 10, rows: 8, levelCount: 1, defaultWallHeight: 2 });
const view = { zoom: 1, offsetX: 0, offsetY: 0, showGrid: false };
const canvasInfo = { width: 1200, height: 900 };
const constants = { tileW: 64, tileH: 32, levelStep: 28 };

domain.setCellEnabled(plan, 0, 3, 2, false);
let center = hitApi.worldToScreen(3, 2, domain.getAbsoluteLevelTransform(plan, 0), view, canvasInfo, constants);
let hit = hitApi.hitTestLevel(domain, plan, 0, center.x, center.y, view, canvasInfo, constants);
assert(hit && hit.x === 3 && hit.y === 2, 'empty cell inside bounds should still be hittable when showGrid=false');
assert(hit.cell === null, 'hit on erased cell should return ghost candidate');

center = hitApi.worldToScreen(10, 2, domain.getAbsoluteLevelTransform(plan, 0), view, canvasInfo, constants);
hit = hitApi.hitTestLevel(domain, plan, 0, center.x, center.y, view, canvasInfo, constants);
assert(hit && hit.x === 10 && hit.y === 2, 'one-cell outside current bounds should still be hittable');
assert(hit.withinBounds === false, 'outside-bounds hit should be marked as ghost outside current bounds');

domain.setCellEnabled(plan, 0, hit.x, hit.y, true, { placeable: true });
assert(domain.getLevelBounds(plan, 0).cols === 11, 'painting outside bounds should auto-grow cols');
assert(domain.getCell(plan, 0, 10, 2), 'painting outside bounds should create the new cell');

console.log('floor-editor-hit-test.test.js: OK');
