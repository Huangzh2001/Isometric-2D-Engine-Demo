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

const plan = domain.createCustomPlan({ cols: 1, rows: 1, levelCount: 1, defaultWallHeight: 2 });
domain.setCellEnabled(plan, 0, 0, 0, true, { placeable: true });
const view = { zoom: 1, offsetX: 0, offsetY: 0, showGrid: false };
const canvasInfo = { width: 1200, height: 900 };
const constants = { tileW: 64, tileH: 32, levelStep: 28 };
const transform = domain.getAbsoluteLevelTransform(plan, 0);

function hitCell(x, y) {
  const center = hitApi.worldToScreen(x, y, transform, view, canvasInfo, constants);
  const hit = hitApi.hitTestLevel(domain, plan, 0, center.x, center.y, view, canvasInfo, constants, { tool: 'brush-floor' });
  assert(hit, 'expected hit for cell ' + x + ',' + y);
  return hit;
}

let hit = hitCell(0, -1);
assert(hit.x === 0 && hit.y === -1, 'north expansion should hit (0,-1)');
assert(hit.chosenDirection === 'n', 'north expansion should choose n');
domain.setCellEnabled(plan, 0, hit.x, hit.y, true, { placeable: true });

hit = hitCell(0, 1);
assert(hit.x === 0 && hit.y === 1, 'south expansion should hit (0,1)');
assert(hit.chosenDirection === 's', 'south expansion should choose s');
domain.setCellEnabled(plan, 0, hit.x, hit.y, true, { placeable: true });

hit = hitCell(-1, 0);
assert(hit.x === -1 && hit.y === 0, 'west expansion should hit (-1,0)');
assert(hit.chosenDirection === 'w', 'west expansion should choose w');
domain.setCellEnabled(plan, 0, hit.x, hit.y, true, { placeable: true });

hit = hitCell(1, 0);
assert(hit.x === 1 && hit.y === 0, 'east expansion should hit (1,0)');
assert(hit.chosenDirection === 'e', 'east expansion should choose e');
domain.setCellEnabled(plan, 0, hit.x, hit.y, true, { placeable: true });

const bounds = domain.getLevelBounds(plan, 0);
assert(bounds.originX === -1 && bounds.originY === -1, 'north/west expansion should shift bounds origin to (-1,-1)');
assert(bounds.cols === 3 && bounds.rows === 3, 'four-direction expansion should grow bounds to 3x3 envelope');

const northCenter = hitApi.worldToScreen(0, -2, domain.getAbsoluteLevelTransform(plan, 0), view, canvasInfo, constants);
const westCenter = hitApi.worldToScreen(-2, 0, domain.getAbsoluteLevelTransform(plan, 0), view, canvasInfo, constants);
const cornerHit = hitApi.hitTestLevel(
  domain,
  plan,
  0,
  (northCenter.x + westCenter.x) / 2,
  (northCenter.y + westCenter.y) / 2,
  view,
  canvasInfo,
  constants,
  { tool: 'brush-floor' }
);
assert(cornerHit, 'corner-adjacent pointer should resolve to a deterministic candidate, not null');

console.log('floor-editor-four-direction-expand.test.js: OK');
