const fs = require('fs');
const path = require('path');
const { createTestEnvironment } = require('./helpers/floor-editor-shell-test-env');

function bootEnv() {
  const env = createTestEnvironment();
  [
    'src/core/domain/floor-plan-domain-core.js',
    'src/core/state/floor-editor-state.js',
    'src/core/domain/floor-plan-hit-test.js',
    'src/application/floor-editor/floor-editor-controller.js',
    'src/presentation/floor-editor/floor-editor-shell.js'
  ].forEach((file) => env.runFile(file));
  return env;
}

function buildOverlapEvidence() {
  const env = bootEnv();
  const controller = env.window.__FLOOR_EDITOR_APP__;
  controller.setRotationAnimationMs(0);
  controller.newRectanglePlan({ cols: 4, rows: 4, levelCount: 1, defaultWallHeight: 2 });
  controller.copyActiveLevel();
  controller.rotateViewRight({ forceInstant: true });
  return {
    renderSummary: env.diagnostics.latest['render-summary'],
    overlapSummaryText: env.elementMap.get('overlapSummaryText').textContent
  };
}

function buildDrawOrderEvidence() {
  const env = bootEnv();
  const controller = env.window.__FLOOR_EDITOR_APP__;
  controller.setRotationAnimationMs(0);
  controller.newRectanglePlan({ cols: 3, rows: 3, levelCount: 1, defaultWallHeight: 2 });
  controller.copyActiveLevel();
  return {
    renderSummary: env.diagnostics.latest['render-summary']
  };
}

function buildRotationZeroEvidence(startRotation) {
  const env = bootEnv();
  const controller = env.window.__FLOOR_EDITOR_APP__;
  const events = [];
  controller.subscribe((state, meta) => {
    if (meta.reason === 'rotate-view-start' || meta.reason === 'rotate-view-complete') {
      events.push({ reason: meta.reason, payload: meta.payload, state: { rotation: state.view.rotation, isRotationAnimating: state.view.isRotationAnimating } });
    }
  });
  controller.setRotationAnimationMs(160);
  controller.setViewRotation(startRotation, { forceInstant: true });
  controller.setViewRotation(0);
  env.runAnimationFrames(20, 20);
  return {
    startRotation,
    completeEvent: events.find((entry) => entry.reason === 'rotate-view-complete') || null,
    lifecycleComplete: env.diagnostics.lifecycle.find((entry) => entry.name === 'rotation-animation-complete') || null,
    latestCompleteState: env.diagnostics.latest['rotation-complete-state'] || null,
    finalView: controller.getState().view
  };
}

const evidence = {
  overlapTopDown: buildOverlapEvidence(),
  drawOrder: buildDrawOrderEvidence(),
  rotation1to0: buildRotationZeroEvidence(1),
  rotation3to0: buildRotationZeroEvidence(3)
};

const out = path.join(__dirname, '..', '..', 'v42_acceptance_evidence.json');
fs.writeFileSync(out, JSON.stringify(evidence, null, 2));
console.log(out);
