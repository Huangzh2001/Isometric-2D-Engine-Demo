const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
assert(renderSource.includes('buildPlacedDebugInstanceFaceRenderables'), 'render.js should build placed debug instance face renderables');
assert(renderSource.includes("mode: 'placed-instance-real-face-renderables'"), 'placed instance render path should log real face rendering mode');
assert(renderSource.includes('renderedAsRealFaces: true'), 'placed instance render path should record real face rendering');
assert(renderSource.includes('renderedAsOverlay: false'), 'placed instance render path should prove overlay is not used');
assert(renderSource.includes('boxBaseUsedForDebugFaces: false'), 'placed instance render path should prove base color is not used');
assert(renderSource.includes('const placedFaces = buildPlacedDebugInstanceFaceRenderables(inst, prefab, occupiedKeySet, viewRotationInfo);'), 'buildRenderables should route debug prefabs through placed face renderables');
assert(renderSource.includes('function isStaticWorldBoxForRender('), 'shared static-world chunk cache should classify static voxel boxes through render update mode filtering');
assert(renderSource.includes('buildInstanceRenderUpdateModeIndex(instances)'), 'shared static-world chunk cache should resolve instance render update modes before filtering');
console.log('placed-instance-semantic-face-pipeline.test.js: OK');
