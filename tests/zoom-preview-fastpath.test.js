const fs = require('fs');
const assert = require('assert');

const rendererSource = fs.readFileSync('src/presentation/render/renderer/canvas2d-renderer.js', 'utf8');
const zoomPreviewOwnerSource = fs.readFileSync('src/presentation/render/renderer/canvas2d-zoom-preview-state.js', 'utf8');
const framePipelineOwnerSource = fs.readFileSync('src/presentation/render/renderer/canvas2d-frame-pipeline.js', 'utf8');
const shellSource = fs.readFileSync('src/presentation/shell/app.js', 'utf8');

assert(rendererSource.includes('captureZoomPreviewFrame'), 'canvas2d renderer should expose zoom preview frame capture');
assert(rendererSource.includes('updateZoomPreviewState'), 'canvas2d renderer should expose zoom preview state updates');
assert(rendererSource.includes('drawZoomPreviewFastPath'), 'canvas2d renderer should expose a delegated zoom preview fast path');
assert(zoomPreviewOwnerSource.includes('drawZoomPreviewFastPath'), 'zoom preview owner should implement a zoom preview fast path');
assert(zoomPreviewOwnerSource.includes('ZOOM-PREVIEW-FASTPATH'), 'zoom preview owner should emit zoom preview fast-path diagnostics');
assert(framePipelineOwnerSource.includes('zoomPreviewFastPathUsed'), 'frame pipeline owner should expose whether zoom preview fast path was used');
assert(shellSource.includes("clearRendererZoomPreview('wheel-zoom-reuse')"), 'wheel zoom should clear any snapshot-based preview and stay on cache reuse');
assert(shellSource.includes("source: 'wheel-zoom-reuse'"), 'wheel zoom should route through the reuse-first zoom source');
assert(shellSource.includes('clearRendererZoomPreview'), 'non-zoom interactions should clear any pending zoom preview state');

console.log('zoom-preview-fastpath.test.js: OK');
