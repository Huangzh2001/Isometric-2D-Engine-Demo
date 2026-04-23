const { createTestEnvironment } = require('./helpers/floor-editor-shell-test-env');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function runPath(startRotation, targetRotation) {
  const env = createTestEnvironment();
  [
    'src/core/domain/floor-plan-domain-core.js',
    'src/core/state/floor-editor-state.js',
    'src/core/domain/floor-plan-hit-test.js',
    'src/application/floor-editor/floor-editor-controller.js',
    'src/presentation/floor-editor/floor-editor-shell.js'
  ].forEach((file) => env.runFile(file));
  const controller = env.window.__FLOOR_EDITOR_APP__;
  const events = [];
  controller.subscribe((state, meta) => {
    events.push({ reason: meta.reason, payload: meta.payload, rotation: state.view.rotation, isAnimating: state.view.isRotationAnimating });
  });
  controller.setRotationAnimationMs(160);
  controller.setViewRotation(startRotation, { forceInstant: true });
  controller.setViewRotation(targetRotation);
  env.runAnimationFrames(20, 20);
  const completeEvent = events.find((entry) => entry.reason === 'rotate-view-complete');
  assert(completeEvent, 'rotate-view-complete event should exist');
  assert(completeEvent.payload.nextRotation === 0, 'controller rotate-view-complete nextRotation should be 0');
  const finalState = controller.getState();
  assert(finalState.view.rotation === 0, 'final rotation should commit to 0');
  assert(finalState.view.isRotationAnimating === false, 'final animating flag should reset to false');
  assert(env.diagnostics.rotationAnimationStartCount === 1, 'rotation-animation-start should fire exactly once');
  assert(env.diagnostics.rotationAnimationCompleteCount === 1, 'rotation-animation-complete should fire exactly once');
  const completePayload = env.diagnostics.lifecycle.find((entry) => entry.name === 'rotation-animation-complete');
  assert(completePayload && completePayload.payload.targetRotation === 0, 'rotation-animation-complete targetRotation should be 0');
}

runPath(1, 0);
runPath(3, 0);
console.log('floor-editor-rotation-zero-commit.test.js: OK');
