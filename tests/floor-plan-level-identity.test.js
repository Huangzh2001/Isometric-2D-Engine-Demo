const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadDomain() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/core/domain/floor-plan-domain-core.js'), 'utf8');
  const context = { window: { __APP_NAMESPACE: { bind() {} } }, console, Date, JSON, Math, Number, String, Object, Array, isFinite };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'floor-plan-domain-core.js' });
  return context.window.__FLOOR_EDITOR_DOMAIN__;
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }
const domain = loadDomain();

(function testLevelColorsFollowContinuousRamp() {
  const plan = domain.createRectanglePlan({ cols: 18, rows: 14, levelCount: 4, defaultWallHeight: 2 });
  for (let level = 0; level < 4; level += 1) {
    const meta = domain.getLevelMeta(plan, level);
    assert(meta.color === domain.computeLevelRampColor(level, 4), 'level color should come from deterministic ramp');
  }
  assert(domain.getLevelMeta(plan, 0).color !== domain.getLevelMeta(plan, 1).color, 'adjacent levels should not share identical colors');
})();

(function testDeleteLevelRecomputesRamp() {
  const plan = domain.createRectanglePlan({ cols: 18, rows: 14, levelCount: 4, defaultWallHeight: 2 });
  domain.setLevelCount(plan, 3);
  for (let level = 0; level < 3; level += 1) {
    assert(domain.getLevelMeta(plan, level).color === domain.computeLevelRampColor(level, 3), 'after delete, colors should be re-ramped');
  }
})();

console.log('floor-plan-level-identity.test.js: OK');
