const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const source = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
const instanceSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/instances/instance-renderable-builder.js'), 'utf8');
const assemblerSource = fs.readFileSync(path.join(__dirname, '..', 'src/application/render/main-frame-renderable-assembler.js'), 'utf8');
assert(instanceSource.includes('function isInstanceDynamicRenderableForFrame('), 'instance renderable owner should resolve dynamic instances explicitly');
assert(instanceSource.includes('function getDynamicInstanceSplitForRender('), 'instance renderable owner should split dynamic instance candidates from static instances');
assert(assemblerSource.includes('const visibleDynamicInstances = filterInstancesForMainCameraScope(dynamicCandidates, cameraScope);'), 'buildRenderables should scope only dynamic candidates per frame');
assert(assemblerSource.includes('for (const inst of visibleDynamicInstances) {'), 'buildRenderables should only loop dynamic instances per frame');
assert(source.includes('function isStaticWorldBoxForRender('), 'shared static-world chunk cache path should classify static boxes explicitly');
assert(source.includes('buildStaticWorldChunkRenderables('), 'shared static-world chunk cache path should rebuild per-chunk static renderables');
assert(source.includes('getSharedStaticWorldChunkCacheApiForRender'), 'render layer should resolve the shared static-world chunk cache api');
assert(assemblerSource.includes('dynamicLoopInstanceCount'), 'render stats should report dynamic loop instance count');
assert(assemblerSource.includes('staticInstanceSkippedByDynamicLoop'), 'render stats should report skipped static instances');
console.log('render-update-mode-render-pipeline.test.js: OK');
