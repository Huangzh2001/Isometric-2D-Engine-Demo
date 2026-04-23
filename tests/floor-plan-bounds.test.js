const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadDomain() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/core/domain/floor-plan-domain-core.js'), 'utf8');
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
  };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'floor-plan-domain-core.js' });
  return context.window.__FLOOR_EDITOR_DOMAIN__;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const domain = loadDomain();

(function testRectangleResizePersistsThroughNormalize() {
  const plan = domain.createRectanglePlan({ cols: 10, rows: 8, levelCount: 1, defaultWallHeight: 2 });
  domain.resizeBounds(plan, 16, 8, { level: 0, rebuildRectangle: true });
  const normalized = domain.normalizePlan(plan);
  assert(normalized.bounds.cols === 16, 'envelope cols should become 16');
  assert(normalized.levelBounds['0'].cols === 16, 'level 0 cols should become 16');
  assert(Object.keys(normalized.levels['0']).length === 128, 'rectangle level should rebuild to 16x8');
})();

(function testCustomResizePersistsThroughClone() {
  const plan = domain.createCustomPlan({ cols: 10, rows: 8, levelCount: 1, defaultWallHeight: 2 });
  domain.setCellEnabled(plan, 0, 0, 0, true, { placeable: true });
  domain.setCellEnabled(plan, 0, 9, 7, true, { placeable: true });
  domain.resizeBounds(plan, 16, 8, { level: 0, rebuildRectangle: false });
  const cloned = domain.clonePlan(plan);
  assert(cloned.bounds.cols === 16, 'custom clone should keep envelope cols=16');
  assert(cloned.levelBounds['0'].cols === 16, 'custom clone should keep level 0 cols=16');
  assert(cloned.levels['0']['0,0'], 'custom clone should preserve existing cells');
})();

(function testPerLevelBoundsStayIndependent() {
  const plan = domain.createRectanglePlan({ cols: 18, rows: 14, levelCount: 1, defaultWallHeight: 2 });
  domain.addLevel(plan, 0, { autoOffset: false, copyWalls: false });
  domain.resizeBounds(plan, 15, 7, { level: 1, rebuildRectangle: true });
  const normalized = domain.normalizePlan(plan);
  assert(normalized.levelBounds['0'].cols === 18, 'level 0 cols should stay 18');
  assert(normalized.levelBounds['1'].cols === 15, 'level 1 cols should become 15');
  assert(normalized.levelBounds['1'].rows === 7, 'level 1 rows should become 7');
})();

(function testAutoGrowBoundsFromBrushTarget() {
  const plan = domain.createRectanglePlan({ cols: 10, rows: 8, levelCount: 1, defaultWallHeight: 2 });
  domain.setCellEnabled(plan, 0, 11, 9, true, { placeable: true });
  const normalized = domain.normalizePlan(plan);
  assert(normalized.levelBounds['0'].cols === 12, 'auto-grow should extend cols to include x=11');
  assert(normalized.levelBounds['0'].rows === 10, 'auto-grow should extend rows to include y=9');
  assert(!!normalized.levels['0']['11,9'], 'auto-grow should add the outside cell');
})();

console.log('floor-plan-bounds.test.js: OK');
