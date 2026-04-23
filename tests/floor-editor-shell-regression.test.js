const { createTestEnvironment } = require('./helpers/floor-editor-shell-test-env');

function assert(cond, msg) { if (!cond) throw new Error(msg); }

const env = createTestEnvironment();
['src/core/domain/floor-plan-domain-core.js','src/core/state/floor-editor-state.js','src/core/domain/floor-plan-hit-test.js','src/application/floor-editor/floor-editor-controller.js','src/presentation/floor-editor/floor-editor-shell.js'].forEach((file) => env.runFile(file));

const controller = env.window.__FLOOR_EDITOR_APP__;
const state = controller.getState();

assert(env.consoleErrors.length === 0, 'boot should not produce console errors');
assert(env.consoleWarns.length === 0, 'boot should not produce console warnings');
assert(env.diagnostics.renderCount > 0, 'renderCount should grow after boot');
assert(env.diagnostics.renderSummaryCount > 0, 'renderSummaryCount should grow after boot');
assert(state.view.isRotationAnimating === false, 'editor should not be left animating after boot');

console.log('floor-editor-shell-regression.test.js: OK');
