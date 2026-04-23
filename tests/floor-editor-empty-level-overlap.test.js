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

const plan = domain.createRectanglePlan({ cols: 22, rows: 20, levelCount: 1, defaultWallHeight: 2 });
domain.addLevel(plan, 0, { copyWalls: false });
const stats = domain.getOverlapPreviewStats(plan, 1);
assert(stats.overlapCells === 0, 'new empty level should not overlap lower layer by default');
assert(stats.levels.some((item) => item.level === 1 && item.cells === 0), 'new empty level should report zero cells');
assert(domain.getLevelBounds(plan, 1).cols === 22 && domain.getLevelBounds(plan, 1).rows === 20, 'new empty level should still have initialized bounds');

console.log('floor-editor-empty-level-overlap.test.js: OK');
