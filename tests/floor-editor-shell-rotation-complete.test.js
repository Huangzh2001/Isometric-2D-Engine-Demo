const { createTestEnvironment } = require('./helpers/floor-editor-shell-test-env');

function assert(cond, msg) { if (!cond) throw new Error(msg); }

const env = createTestEnvironment();
['src/core/domain/floor-plan-domain-core.js','src/core/state/floor-editor-state.js','src/core/domain/floor-plan-hit-test.js','src/application/floor-editor/floor-editor-controller.js','src/presentation/floor-editor/floor-editor-shell.js'].forEach((file) => env.runFile(file));

const controller = env.window.__FLOOR_EDITOR_APP__;
controller.setRotationAnimationMs(160);
controller.rotateViewRight();
assert(env.diagnostics.rotationAnimationStartCount === 1, 'rotation-animation-start should fire once');
assert(controller.getState().view.isRotationAnimating === true, 'rotation should enter animating state');
env.runAnimationFrames(20, 20);
const state = controller.getState();
assert(env.consoleErrors.length === 0, 'rotation animation should not produce console errors');
assert(env.consoleWarns.length === 0, 'rotation animation should not produce console warnings');
assert(env.diagnostics.rotationAnimationCompleteCount === 1, 'rotation-animation-complete should fire once');
assert(state.view.isRotationAnimating === false, 'rotation animation should settle back to false');
assert((state.view.rotation || 0) === 1, 'rotation should commit to target direction');
assert(env.diagnostics.renderCount > 1, 'renderCount should continue growing during animation');

console.log('floor-editor-shell-rotation-complete.test.js: OK');
