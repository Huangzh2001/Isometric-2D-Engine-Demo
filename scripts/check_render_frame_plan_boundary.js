#!/usr/bin/env node
/*
 * P12a-3 guardrail: render frame plan / player move fast-path / render order
 * diagnostics must live in focused owners, not in render.js.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('FAIL check_render_frame_plan_boundary: ' + msg); process.exit(1); }
function has(rel) { return fs.existsSync(path.join(root, rel)); }

const renderPath = 'src/presentation/render/render.js';
const fastPathPath = 'src/presentation/render/frame/player-move-fast-path.js';
const diagPath = 'src/presentation/render/diagnostics/render-order-diagnostics.js';
const framePath = 'src/presentation/render/frame/render-frame-plan-builder.js';

for (const rel of [fastPathPath, diagPath, framePath]) {
  if (!has(rel)) fail('missing owner ' + rel);
}

const render = read(renderPath);
const fastPath = read(fastPathPath);
const diag = read(diagPath);
const frame = read(framePath);
const index = read('index.html');

const forbiddenInRender = [
  'function buildRendererFramePlan(',
  'function tryBuildPlayerMoveFastPathFrameOrderForRender(',
  'function evaluatePlayerMoveFastPathEligibilityForRender(',
  'function logRenderOrderDiagnostics(',
  'var __playerMoveFastPathDiagState',
  'var __playerMoveFastPathRuntimeState',
];
for (const token of forbiddenInRender) {
  if (render.includes(token)) fail('render.js still owns ' + token);
}

const requiredFastPath = [
  'var __playerMoveFastPathDiagState',
  'var __playerMoveFastPathRuntimeState',
  'function evaluatePlayerMoveFastPathEligibilityForRender(',
  'function tryBuildPlayerMoveFastPathFrameOrderForRender(',
  'function updatePlayerMoveFastPathStaticOrderCacheForRender(',
];
for (const token of requiredFastPath) {
  if (!fastPath.includes(token)) fail(fastPathPath + ' missing ' + token);
}

for (const token of [
  'function isRenderOrderHeavyDiagnosticsEnabled()',
  'function isFramePlanDiagnosticsEnabled()',
  'function logRenderOrderDiagnostics(',
]) {
  if (!diag.includes(token)) fail(diagPath + ' missing ' + token);
}

for (const token of [
  'function buildRendererFramePlan()',
  'function drawRendererFramePlan(',
]) {
  if (!frame.includes(token)) fail(framePath + ' missing ' + token);
}

const scriptOrder = [
  'src/presentation/render/terrain/terrain-renderable-builder.js',
  'src/presentation/render/frame/player-move-fast-path.js',
  'src/presentation/render/diagnostics/render-order-diagnostics.js',
  'src/presentation/render/frame/render-frame-plan-builder.js',
  'src/presentation/render/render.js',
];
let last = -1;
for (const rel of scriptOrder) {
  const idx = index.indexOf(rel);
  if (idx < 0) fail('index.html missing script ' + rel);
  if (idx <= last) fail('index.html script order is wrong near ' + rel);
  last = idx;
}

const maxBytes = {
  [fastPathPath]: 32000,
  [diagPath]: 10000,
  [framePath]: 15000,
};
for (const [rel, max] of Object.entries(maxBytes)) {
  const size = fs.statSync(path.join(root, rel)).size;
  if (size > max) fail(rel + ' grew to ' + size + ' bytes; split before it becomes a new large node');
}

console.log('PASS check_render_frame_plan_boundary');
