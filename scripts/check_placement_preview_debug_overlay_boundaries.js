#!/usr/bin/env node
/*
 * P12a-5 guardrail: placement preview and projection debug overlay rendering
 * must live in focused presentation/render owners, not in render.js.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('FAIL check_placement_preview_debug_overlay_boundaries: ' + msg); process.exit(1); }
function has(rel) { return fs.existsSync(path.join(root, rel)); }

const renderPath = 'src/presentation/render/render.js';
const placementPath = 'src/presentation/render/preview/placement-preview-renderer.js';
const projectionPath = 'src/presentation/render/debug/projection-debug-overlay.js';
for (const rel of [placementPath, projectionPath]) {
  if (!has(rel)) fail('missing owner ' + rel);
}
const render = read(renderPath);
const placement = read(placementPath);
const projection = read(projectionPath);
const index = read('index.html');

for (const token of [
  'function drawPlacementPreview() {\n  if (!editor.preview) return;',
  'function drawDebugFiveFacePlacementPreview(previewPrefab, proto, ok, previewBoxes, viewRotationInfo) {\n  viewRotationInfo = viewRotationInfo || getSafeMainEditorViewRotation(null);',
  'function buildPlacedDebugInstanceFaceRenderables(instance, prefab, occupiedSet, viewRotationInfo) {\n  if (!instance || !prefab || !isFiveFaceDebugPrefab(prefab)) return [];',
  'function drawSelectedInstanceProjectionDebug() {\n  if (typeof shadowDebugDetailed',
  'function drawItemFacingPrototypeOverlay() {\n  if (!ui.showItemFacingDebug'
]) {
  if (render.includes(token)) fail('render.js still retains moved implementation marker ' + token.slice(0, 80));
}

for (const token of [
  'return requirePlacementPreviewRendererForRender().drawPlacementPreview.apply(null, arguments);',
  'return requirePlacementPreviewRendererForRender().buildPlacedDebugInstanceFaceRenderables.apply(null, arguments);',
  'return requireProjectionDebugOverlayForRender().drawSelectedInstanceProjectionDebug.apply(null, arguments);',
  'return requireProjectionDebugOverlayForRender().drawItemFacingPrototypeOverlay.apply(null, arguments);'
]) {
  if (!render.includes(token)) fail('render.js missing wrapper delegation ' + token);
}

for (const token of [
  'function drawPlacementPreview(',
  'function drawDebugFiveFacePlacementPreview(',
  'function buildPlacedDebugInstanceFaceRenderables(',
  'function createOccupiedKeySetFromOccupancy(',
  'var __placedDebugFaceRenderLogCache = new Map()'
]) {
  if (!placement.includes(token)) fail(placementPath + ' missing ' + token);
}
for (const token of [
  'function drawSelectedInstanceProjectionDebug(',
  'function drawItemFacingPrototypeOverlay(',
  'function drawFacingLegendPanel(',
  'function getFacingFacePolygons('
]) {
  if (!projection.includes(token)) fail(projectionPath + ' missing ' + token);
}

const scriptOrder = [
  'src/presentation/render/sprites/player-sprite-frame.js',
  'src/presentation/render/preview/placement-preview-renderer.js',
  'src/presentation/render/debug/projection-debug-overlay.js',
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
  [placementPath]: 28000,
  [projectionPath]: 14000,
};
for (const [rel, max] of Object.entries(maxBytes)) {
  const size = fs.statSync(path.join(root, rel)).size;
  if (size > max) fail(rel + ' grew to ' + size + ' bytes; split before it becomes a new large node');
}
console.log('PASS check_placement_preview_debug_overlay_boundaries');
