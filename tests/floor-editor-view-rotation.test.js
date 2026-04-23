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

const plan = domain.createCustomPlan({ cols: 4, rows: 4, levelCount: 1, defaultWallHeight: 2 });
const canvasInfo = { width: 1200, height: 900 };
const constants = { tileW: 64, tileH: 32, levelStep: 28 };
const transform = domain.getAbsoluteLevelTransform(plan, 0);
const samples = [[0, 0], [2, 1], [-2, 3], [4, -1]];

[0, 1, 2, 3].forEach((rotation) => {
  const view = { zoom: 1, offsetX: 0, offsetY: 0, showGrid: false, rotation };
  samples.forEach(([x, y]) => {
    const center = hitApi.worldToScreen(x, y, transform, view, canvasInfo, constants);
    const resolved = hitApi.resolveLogicalCellFromScreen(transform, center.x, center.y, view, canvasInfo, constants);
    assert(resolved.x === x && resolved.y === y, 'rotation ' + rotation + ' should map center back to exact logical cell ' + x + ',' + y);
  });
});

assert(hitApi.getViewDirectionLabel(0) === 'NE', 'rotation 0 label should be NE');
assert(hitApi.getViewDirectionLabel(1) === 'SE', 'rotation 1 label should be SE');
assert(hitApi.getViewDirectionLabel(2) === 'SW', 'rotation 2 label should be SW');
assert(hitApi.getViewDirectionLabel(3) === 'NW', 'rotation 3 label should be NW');

console.log('floor-editor-view-rotation.test.js: OK');
