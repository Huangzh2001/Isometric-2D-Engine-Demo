#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ownerRel = 'src/presentation/render/renderer/canvas2d-interaction-pipeline-capture.js';
const source = fs.readFileSync(path.join(root, ownerRel), 'utf8');
const bound = {};
const sandbox = {
  console,
  window: {
    __APP_NAMESPACE: {
      bind(name, value) { bound[name] = value; },
      getPath(name) { return bound[name]; }
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: ownerRel });
const api = sandbox.window.__CANVAS2D_INTERACTION_PIPELINE_CAPTURE__;
if (!api || typeof api.resetInteractionPipelineCapture !== 'function' || typeof api.recordInteractionPipelineCall !== 'function' || typeof api.consumeInteractionPipelineCapture !== 'function') {
  throw new Error('missing interaction capture API');
}
if (bound['renderer.canvas2dInteractionPipelineCapture'] !== api) throw new Error('namespace bind missing for interaction capture owner');

const adapterApi = {};
const capture = api.resetInteractionPipelineCapture(adapterApi, { active: true, interactionId: 'abc', interactionType: 'zoom', frameIndex: 7 });
if (!capture.active || capture.interactionId !== 'abc' || capture.interactionType !== 'zoom' || capture.frameIndex !== 7) throw new Error('reset did not initialize capture metadata');
api.recordInteractionPipelineCall(adapterApi, {
  totalPipelineMs: 12.3456,
  runFramePipelineWallMs: 13.2,
  clearAndBackgroundMs: 1,
  baseWorldPassesWallMs: 2,
  floorLayerReusedDuringInteraction: true,
  baseWorldActualBranch: 'floor-layer',
  drawRenderableOrderMs: 3,
  drawOverlayPassesMs: 4,
  drawHudPassMs: 5,
  knownAccountedMs: 9,
  unaccountedMs: 1.25
});
const result = api.consumeInteractionPipelineCapture(adapterApi, { safeFixed: (value) => Number(Number(value || 0).toFixed(3)) });
if (!result) throw new Error('consume returned null');
if (result.interactionId !== 'abc' || result.interactionType !== 'zoom' || result.frameIndex !== 7) throw new Error('consume metadata mismatch');
if (result.renderPipelineCallCount !== 1) throw new Error('call count mismatch');
if (result.renderPipelineAccumulatedMs !== 12.346) throw new Error(`accumulated mismatch ${result.renderPipelineAccumulatedMs}`);
if (result.runFramePipelineWallMs !== 13.2) throw new Error('wall time mismatch');
if (result.pipelineDrawHudPassMs !== 5) throw new Error('HUD pass mismatch');
if (result.floorLayerReusedDuringInteractionCount !== 1) throw new Error('floor layer reuse count mismatch');
if (result.baseWorldActualBranch !== 'floor-layer') throw new Error('actual branch mismatch');
if (!Array.isArray(result.calls) || result.calls.length !== 1 || result.calls[0].totalMs !== 12.3456) throw new Error('call detail mismatch');
if (adapterApi.__interactionPipelineCapture.active !== false) throw new Error('consume did not reset capture');

console.log('PASS canvas2d-interaction-pipeline-capture-boundary');
