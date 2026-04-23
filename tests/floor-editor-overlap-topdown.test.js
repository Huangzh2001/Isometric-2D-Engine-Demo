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
controller.newRectanglePlan({ cols: 4, rows: 4, levelCount: 1, defaultWallHeight: 2 });
controller.copyActiveLevel();
const initialRender = env.diagnostics.latest['render-summary'];
assert(initialRender.overlapProjection === 'top-down', 'overlap preview should use top-down projection');
assert(initialRender.overlapIndependentOfViewRotation === true, 'overlap preview should be decoupled from main view rotation');
const summaryTextBefore = env.elementMap.get('overlapSummaryText').textContent;
assert(/Top-down overlap/.test(summaryTextBefore), 'overlap summary should declare top-down mode');
controller.rotateViewRight({ forceInstant: true });
const rotatedRender = env.diagnostics.latest['render-summary'];
assert(rotatedRender.viewRotation === 1, 'main view rotation should change to 1');
assert(rotatedRender.overlapProjection === 'top-down', 'overlap projection should remain top-down after rotating main view');
assert(rotatedRender.overlapIndependentOfViewRotation === true, 'overlap preview must remain rotation-independent after rotating main view');
const summaryTextAfter = env.elementMap.get('overlapSummaryText').textContent;
assert(/Top-down overlap/.test(summaryTextAfter), 'overlap summary should remain top-down after rotation');
console.log('floor-editor-overlap-topdown.test.js: OK');
