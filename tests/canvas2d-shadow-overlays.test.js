#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function indexOfOrFail(source, needle) {
  const idx = source.indexOf(needle);
  assert(idx >= 0, `missing ${needle}`);
  return idx;
}

const shadowRel = 'src/presentation/render/renderer/canvas2d-shadow-overlays.js';
const primitiveRel = 'src/presentation/render/renderer/canvas2d-draw-primitives.js';
const renderRel = 'src/presentation/render/render.js';
const shadowSource = read(shadowRel);
const renderSource = read(renderRel);
const indexSource = read('index.html');

assert(shadowSource.includes("layer: 'presentation/render/renderer'"), 'shadow overlay module must declare presentation/renderer layer');
assert(indexOfOrFail(indexSource, primitiveRel) < indexOfOrFail(indexSource, shadowRel), 'shadow overlay module should load after primitive module');
assert(indexOfOrFail(indexSource, shadowRel) < indexOfOrFail(indexSource, renderRel), 'shadow overlay module must load before render.js');

for (const marker of [
  'requireCanvas2dShadowOverlaysForRender().drawFaceShadowOverlays',
  'requireCanvas2dShadowOverlaysForRender().drawFaceShadowOverlaysNoCamera'
]) {
  assert(renderSource.includes(marker), `render.js missing shadow delegation marker ${marker}`);
}

for (const snippet of [
  'fillShadowUnionWithDistanceFade(unionCtx, screenPolys',
  'logScreenOverlayDebug({ alpha: clamp(overlay.alpha',
  'targetCtx.clip();\n    drawUnionShadowCanvasToTarget(targetCtx, overlay.alpha);'
]) {
  assert(!renderSource.includes(snippet), `render.js still owns shadow overlay body snippet: ${snippet}`);
}

for (const forbidden of ['localStorage', 'fetch(', 'document.', 'new Image', 'staticBoxRenderCache']) {
  assert(!shadowSource.includes(forbidden), `${shadowRel} must not contain ${forbidden}`);
}

function createCtx(name) {
  const calls = [];
  return {
    name,
    calls,
    canvas: { width: 320, height: 240 },
    beginPath() { calls.push(['beginPath']); },
    moveTo(x, y) { calls.push(['moveTo', x, y]); },
    lineTo(x, y) { calls.push(['lineTo', x, y]); },
    closePath() { calls.push(['closePath']); },
    clip() { calls.push(['clip']); },
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    stroke() { calls.push(['stroke', this.strokeStyle, this.lineWidth]); },
    clearRect(x, y, w, h) { calls.push(['clearRect', x, y, w, h]); },
    set globalCompositeOperation(value) { calls.push(['gco', value]); },
    get globalCompositeOperation() { return 'source-over'; },
    strokeStyle: '',
    lineWidth: 1
  };
}

const sandbox = { console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(shadowSource, sandbox, { filename: shadowRel });
const api = sandbox.IsometricCanvas2dShadowOverlays;
assert(api, 'shadow overlay API should be exported');
assert.strictEqual(typeof api.drawFaceShadowOverlays, 'function', 'missing drawFaceShadowOverlays');
assert.strictEqual(typeof api.drawFaceShadowOverlaysNoCamera, 'function', 'missing drawFaceShadowOverlaysNoCamera');

const unionCtx = createCtx('union');
const targetCtx = createCtx('target');
const depsCalls = [];
const deps = {
  viewW: 800,
  viewH: 600,
  ensureShadowPolyUnionCanvas() { depsCalls.push(['ensure']); return unionCtx; },
  fillShadowUnionWithDistanceFade(ctx, screenPolys, worldPolys, casterCenter, light, alpha, fadeDebug) {
    depsCalls.push(['fillShadowUnionWithDistanceFade', ctx.name, screenPolys.length, worldPolys.length, light.type, alpha]);
    fadeDebug.factorNear = 1;
    fadeDebug.factorFar = 0.5;
    fadeDebug.reason = 'test';
  },
  drawUnionShadowCanvasToTarget(ctx, alpha) { depsCalls.push(['drawUnion', ctx.name, alpha]); },
  clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value))); },
  logScreenOverlayDebug(payload) { depsCalls.push(['screenDebug', payload.polyCount]); },
  shadowProbeMatchReceiver() { return { ok: true }; },
  lightState: { highContrastShadow: true },
  shadowStrokeCss(alpha) { return `rgba(0,0,0,${alpha.toFixed(2)})`; }
};
const overlay = {
  alpha: 0.4,
  baseAlpha: 0.5,
  lightType: 'sun',
  clipPoly: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
  polys: [[{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 5 }]],
  worldPolys: [[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }]],
  casterCenter: { x: 1, y: 1, z: 1 }
};
api.drawFaceShadowOverlays(targetCtx, null, [overlay], deps);
assert(unionCtx.calls.some((call) => call[0] === 'clearRect' && call[3] === 800 && call[4] === 600), 'union canvas should be cleared using injected view size');
assert(targetCtx.calls.some((call) => call[0] === 'clip'), 'target should be clipped to receiver polygon');
assert(depsCalls.some((call) => call[0] === 'fillShadowUnionWithDistanceFade' && call[4] === 'sun'), 'should call injected shadow union fill');
assert(depsCalls.some((call) => call[0] === 'drawUnion' && call[1] === 'target' && call[2] === 0.4), 'should draw union shadow into target');
assert(depsCalls.some((call) => call[0] === 'screenDebug' && call[1] === 1), 'should call screen debug hook');
assert(targetCtx.calls.some((call) => call[0] === 'stroke'), 'high contrast outlines should stroke');

const targetNoCamera = createCtx('targetNoCamera');
api.drawFaceShadowOverlaysNoCamera(targetNoCamera, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], [{
  alpha: 0.25,
  baseAlpha: 0.3,
  lightType: 'point',
  polysNoCamera: [[{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }]],
  worldPolys: [[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }]]
}], 5, -2, deps);
assert(targetNoCamera.calls.some((call) => call[0] === 'moveTo' && call[1] === 5 && call[2] === -2), 'no-camera clip points should apply offset');
assert(depsCalls.some((call) => call[0] === 'fillShadowUnionWithDistanceFade' && call[4] === 'point'), 'no-camera path should call injected shadow union fill');

console.log('PASS canvas2d-shadow-overlays');
