const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const source = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
assert(source.includes('buildDebugPreviewFaceRenderables'), 'preview renderer should build debug face renderables');
assert(source.includes('buildDebugCuboidFaceRenderables'), 'preview renderer should call core buildDebugCuboidFaceRenderables');
assert(source.includes("logItemRotationPrototype('preview-renderable-faces'"), 'preview-renderable-faces log should exist');
assert(source.includes('renderedAsRealFaces: true'), 'debug-face-render should prove real face rendering');
assert(source.includes('renderedAsOverlay: false'), 'debug-face-render should prove it is not overlay rendering');
assert(source.includes('helperLayerUsed: false'), 'debug-face-render should prove helper layer is not used');
assert(source.includes('drawDebugFiveFacePlacementPreview(previewPrefab, proto, ok, previewBoxes, viewRotationInfo)'), 'placement preview should pass voxel boxes into debug renderer');
const previewFn = source.slice(source.indexOf('function drawDebugFiveFacePlacementPreview'), source.indexOf('function drawFacingLegendPanel'));
assert(!previewFn.includes('drawTextBadge'), 'placement five-face renderer must not draw label/helper badges');
assert(!previewFn.includes('drawSemanticFiveFaceSolid'), 'placement five-face renderer must not use bbox overlay solid helper');
console.log('preview-real-face-renderer-contract.test.js: OK');
