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
domain.addCellAt(plan, 0, 0, 0, { placeable: true, autoGrow: true });
const view = { zoom: 1, offsetX: 0, offsetY: 0, showGrid: false };
const canvasInfo = { width: 1200, height: 900 };
const constants = { tileW: 64, tileH: 32, levelStep: 28 };

const center = hitApi.worldToScreen(3, -2, domain.getAbsoluteLevelTransform(plan, 0), view, canvasInfo, constants);
const hit = hitApi.hitTestLevel(domain, plan, 0, center.x, center.y, view, canvasInfo, constants, { tool: 'brush-floor' });
assert(hit && hit.x === 3 && hit.y === -2, 'free paint should resolve requested logical cell directly');
assert(hit.diagnostics.resolvedGridX === 3 && hit.diagnostics.resolvedGridY === -2, 'diagnostics should record resolved logical cell');
assert(hit.diagnostics.targetHasCell === false, 'diagnostics should record targetHasCell=false for empty target');
assert(hit.diagnostics.targetWithinBounds === false, 'diagnostics should record outside-bounds free paint target');
assert(hit.diagnostics.paintMode === 'free-paint', 'diagnostics should mark non-adjacent direct paint as free-paint');
assert(hit.diagnostics.isAdjacentToExisting === false, 'diagnostics should record adjacency=false for isolated target');
assert(hit.diagnostics.growBoundsTriggered === false, 'hover diagnostics should not claim bounds already grew');

console.log('floor-editor-hit-test-logging.test.js: OK');
