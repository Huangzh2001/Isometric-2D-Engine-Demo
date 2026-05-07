#!/usr/bin/env node
/* P12a-3 structural boundary test. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const render = read('src/presentation/render/render.js');
const fastPath = read('src/presentation/render/frame/player-move-fast-path.js');
const diag = read('src/presentation/render/diagnostics/render-order-diagnostics.js');
const frame = read('src/presentation/render/frame/render-frame-plan-builder.js');

assert(!render.includes('function buildRendererFramePlan('), 'render.js should not own buildRendererFramePlan');
assert(!render.includes('function tryBuildPlayerMoveFastPathFrameOrderForRender('), 'render.js should not own player move fast path');
assert(!render.includes('function logRenderOrderDiagnostics('), 'render.js should not own render order diagnostics');
assert(fastPath.includes('function tryBuildPlayerMoveFastPathFrameOrderForRender('), 'fast path owner should expose runtime builder');
assert(fastPath.includes('function evaluatePlayerMoveFastPathEligibilityForRender('), 'fast path owner should expose eligibility diagnostics');
assert(diag.includes('function logRenderOrderDiagnostics('), 'diagnostics owner should expose render order diagnostics');
assert(frame.includes('function buildRendererFramePlan()'), 'frame plan owner should expose buildRendererFramePlan');
assert(frame.includes('function drawRendererFramePlan('), 'frame plan owner should expose drawRendererFramePlan');

console.log('PASS render-frame-plan-boundary');
