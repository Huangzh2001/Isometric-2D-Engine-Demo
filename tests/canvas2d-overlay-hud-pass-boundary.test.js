#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ownerRel = 'src/presentation/render/renderer/canvas2d-overlay-hud-pass.js';
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
const api = sandbox.window.__CANVAS2D_OVERLAY_HUD_PASS__;
if (!api || typeof api.drawOverlayPasses !== 'function' || typeof api.drawHudPass !== 'function') throw new Error('missing overlay/HUD API');
if (bound['renderer.canvas2dOverlayHudPass'] !== api) throw new Error('namespace bind missing for overlay/HUD owner');

const calls = [];
const debugState = {};
const adapterApi = {};
api.drawOverlayPasses(adapterApi, {
  getDebugState: () => debugState,
  getEditor: () => ({ mode: 'delete' }),
  getLightingRenderLights: () => [{ id: 'a' }, { id: 'b' }],
  getActiveLightId: () => 'b',
  drawSelectedInstanceHighlight: () => calls.push('highlight'),
  drawSelectedInstanceProjectionDebug: () => calls.push('projection'),
  drawShadowProbeOverlay: () => calls.push('probe'),
  drawDeleteHover: () => calls.push('delete'),
  drawPlacementPreview: () => calls.push('placement'),
  renderLightingGlow: () => calls.push('glow'),
  drawLightingBulb: (light, active) => calls.push(`bulb:${light.id}:${active}`),
  drawLightingAxes: () => calls.push('axes'),
  drawHabboDebugOverlay: () => calls.push('habbo')
}, { source: 'test' });
if (adapterApi.__inDrawOverlayPasses !== false) throw new Error('overlay flag not reset');
for (const expected of ['highlight','projection','probe','delete','glow','bulb:a:false','bulb:b:true','axes','habbo']) {
  if (!calls.includes(expected)) throw new Error(`missing overlay call ${expected}`);
}
if (calls.includes('placement')) throw new Error('delete mode should not call placement preview');

const fillTexts = [];
const ctx = { fillStyle: '', font: '', fillText: (...args) => fillTexts.push(args) };
api.drawHudPass(adapterApi, {
  getDebugState: () => debugState,
  getContext: () => ctx,
  refreshInspectorPanels: () => calls.push('refresh'),
  currentProto: () => ({ name: 'cube', w: 1, d: 2, h: 3, voxels: [1, 2] }),
  getEditor: () => ({ mode: 'view', preview: { box: { x: 1, y: 2, z: 3 }, valid: true } }),
  getSettings: () => ({ playerProxyW: 0.5, playerProxyD: 0.6, playerHeightCells: 1.7, ambient: 0.2 }),
  getInstances: () => [1],
  getBoxes: () => [1, 2],
  activeLight: () => ({ name: 'sun', type: 'spot', x: 1, y: 2, z: 3, angle: 45, pitch: 20 }),
  getLightTypeLabels: () => ({ spot: 'Spot' }),
  getShowDebug: () => false,
  getShadowProbeState: () => null
}, { source: 'test' });
if (adapterApi.__inDrawHudPass !== false) throw new Error('HUD flag not reset');
if (fillTexts.length < 3) throw new Error('HUD did not draw expected text rows');
if (!String(fillTexts[1][0]).includes('当前=cube')) throw new Error('HUD text did not include current proto');

console.log('PASS canvas2d-overlay-hud-pass-boundary');
