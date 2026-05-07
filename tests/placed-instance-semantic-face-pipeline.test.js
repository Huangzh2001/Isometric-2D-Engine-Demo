const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const root = path.join(__dirname, '..');
const renderSource = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');
const instanceSource = fs.readFileSync(path.join(root, 'src/presentation/render/instances/instance-renderable-builder.js'), 'utf8');
const placementSource = fs.readFileSync(path.join(root, 'src/presentation/render/preview/placement-preview-renderer.js'), 'utf8');
const assemblerSource = fs.readFileSync(path.join(root, 'src/application/render/main-frame-renderable-assembler.js'), 'utf8');
assert(renderSource.includes('return requirePlacementPreviewRendererForRender().buildPlacedDebugInstanceFaceRenderables.apply(null, arguments);'), 'render.js should keep buildPlacedDebugInstanceFaceRenderables wrapper');
assert(placementSource.includes("mode: 'placed-instance-real-face-renderables'"), 'placement preview owner should log real face rendering mode');
assert(placementSource.includes('renderedAsRealFaces: true'), 'placement preview owner should record real face rendering');
assert(placementSource.includes('renderedAsOverlay: false'), 'placement preview owner should prove overlay is not used');
assert(placementSource.includes('boxBaseUsedForDebugFaces: false'), 'placement preview owner should prove base color is not used');
assert(assemblerSource.includes('const placedFaces = buildPlacedDebugInstanceFaceRenderables(inst, prefab, occupiedKeySet, viewRotationInfo);'), 'buildRenderables should route debug prefabs through placed face renderables');
assert(renderSource.includes('function isStaticWorldBoxForRender('), 'shared static-world chunk cache should classify static voxel boxes through render update mode filtering');
assert(instanceSource.includes('function buildInstanceRenderUpdateModeIndex('), 'instance owner should expose render update mode index helper');
console.log('placed-instance-semantic-face-pipeline.test.js: OK');
