const { createTestEnvironment } = require('./helpers/floor-editor-shell-test-env');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const env = createTestEnvironment();
[
  'src/core/domain/floor-plan-domain-core.js',
  'src/core/state/floor-editor-state.js',
  'src/core/domain/floor-plan-hit-test.js',
  'src/application/floor-editor/floor-editor-controller.js',
  'src/presentation/floor-editor/floor-editor-shell.js'
].forEach((file) => env.runFile(file));

const controller = env.window.__FLOOR_EDITOR_APP__;
controller.setRotationAnimationMs(0);
controller.newRectanglePlan({ cols: 3, rows: 3, levelCount: 1, defaultWallHeight: 2 });
controller.copyActiveLevel();
const renderSummary = env.diagnostics.latest['render-summary'];
assert(renderSummary.draw.drawOrderRule === 'planeY-then-elevation-topmost-last', 'main draw order rule should be explicit');
assert(renderSummary.draw.sharedFootprintTopmostLast === true, 'shared-footprint cells should draw topmost layer last');
console.log('floor-editor-draw-order-topmost.test.js: OK');
