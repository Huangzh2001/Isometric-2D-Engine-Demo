#!/usr/bin/env node
/* P12a-5 structural boundary test. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
const render = read('src/presentation/render/render.js');
const placement = read('src/presentation/render/preview/placement-preview-renderer.js');
const projection = read('src/presentation/render/debug/projection-debug-overlay.js');
assert(render.includes('return requirePlacementPreviewRendererForRender().drawPlacementPreview.apply(null, arguments);'), 'render.js should keep placement preview wrapper only');
assert(render.includes('return requireProjectionDebugOverlayForRender().drawSelectedInstanceProjectionDebug.apply(null, arguments);'), 'render.js should keep projection debug wrapper only');
assert(!render.includes('function drawPlacementPreview() {\n  if (!editor.preview) return;'), 'render.js should not own drawPlacementPreview implementation');
assert(!render.includes('function drawSelectedInstanceProjectionDebug() {\n  if (typeof shadowDebugDetailed'), 'render.js should not own selected projection debug implementation');
assert(placement.includes('function drawPlacementPreview('), 'placement owner should own drawPlacementPreview');
assert(placement.includes('function buildPlacedDebugInstanceFaceRenderables('), 'placement owner should own placed debug face builder');
assert(projection.includes('function drawSelectedInstanceProjectionDebug('), 'projection owner should own drawSelectedInstanceProjectionDebug');
assert(projection.includes('function drawItemFacingPrototypeOverlay('), 'projection owner should own item facing overlay');
console.log('PASS placement-preview-debug-overlay-boundaries');
