const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
assert(renderSource.includes('function drawDebugFiveFacePlacementPreview'), 'render.js should define explicit five-face placement preview renderer');
assert(renderSource.includes('isFiveFaceDebugPrefab(previewPrefab)'), 'placement preview should branch on debug five-face prefabs');
assert(renderSource.includes('buildDebugPreviewFaceRenderables'), 'debug five-face preview should build real renderable faces');
assert(renderSource.includes('buildDebugCuboidFaceRenderables'), 'debug five-face preview should call core face-renderable builder');
assert(renderSource.includes('renderedAsRealFaces: true'), 'debug-face-render log should prove real face rendering');
assert(renderSource.includes('renderedAsOverlay: false'), 'debug-face-render log should prove it is not overlay/helper rendering');
assert(renderSource.includes('helperLayerUsed: false'), 'debug-face-render log should prove helper layer is not used');
for (const key of ['topColor','northColor','eastColor','southColor','westColor']) {
  assert(renderSource.includes(key), 'debug-face-render log should include ' + key);
}
assert(renderSource.includes("logItemRotationPrototype('preview-renderable-faces'"), 'render.js should log preview-renderable-faces');
console.log('preview-five-face-render-contract.test.js: OK');
