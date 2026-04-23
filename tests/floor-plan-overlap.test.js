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

function assert(cond, msg) { if (!cond) throw new Error(msg); }
const domain = loadDomain();

(function testOverlapPreviewStatsNonEmpty() {
  const plan = domain.createRectanglePlan({ cols: 10, rows: 8, levelCount: 1, defaultWallHeight: 2 });
  domain.duplicateLevel(plan, 0, { copyWalls: false });
  const stats = domain.getOverlapPreviewStats(plan, 1);
  assert(stats && typeof stats === 'object', 'stats should exist');
  assert(typeof stats.overlapCells === 'number', 'overlapCells should be numeric');
})();

(function testOverlapPreviewStatsEmptyLayer() {
  const plan = domain.createCustomPlan({ cols: 10, rows: 8, levelCount: 2, defaultWallHeight: 2 });
  const stats = domain.getOverlapPreviewStats(plan, 1);
  assert(stats.emptyReason === 'empty-layer' || stats.emptyReason === 'no-neighbor', 'empty layers should report a reason');
})();

console.log('floor-plan-overlap.test.js: OK');
