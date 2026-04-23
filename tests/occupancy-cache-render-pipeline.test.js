const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
const sceneSessionSource = fs.readFileSync(path.join(__dirname, '..', 'src/core/state/scene-session-state.js'), 'utf8');
const placementSource = fs.readFileSync(path.join(__dirname, '..', 'src/application/placement/placement.js'), 'utf8');

assert(sceneSessionSource.includes("[OCCUPANCY-CACHE]"), 'scene session should emit structured occupancy cache logs');
assert(sceneSessionSource.includes('function updateOccupancyCacheFromBoxDiff(options)'), 'scene session should own the scene-level occupancy cache updater');
assert(sceneSessionSource.includes("mode = 'incremental'"), 'occupancy cache should support incremental updates');
assert(sceneSessionSource.includes("mode = 'full-rebuild'"), 'occupancy cache should support full rebuild updates');
assert(placementSource.includes('updateOccupancyCacheFromBoxDiff({'), 'placement rebuilds should push box diffs into the occupancy cache');
assert(renderSource.includes("const occupancySnapshot = getSceneOccupancySnapshotForRender('render:buildRenderables');"), 'buildRenderables should consume the scene occupancy cache');
assert(renderSource.includes("const occupancySnapshot = getSceneOccupancySnapshotForRender('render:static-world-chunk-cache');"), 'static cache rebuild should consume the scene occupancy cache');
assert(!renderSource.includes("const visibleOcc = buildOccupancy(boxes.filter(function (b) { return b && (b.generatedBy === 'terrain-generator' || prefabDrawsVoxels(getPrefabById(b.prefabId))); }));"), 'buildRenderables should no longer rebuild visible occupancy from boxes each frame');
assert(renderSource.includes('[RENDER-FRAME-SUMMARY]'), 'render pipeline should emit structured frame summary logs');
assert(renderSource.includes('occupancyCacheVersion'), 'render frame summary should include occupancy cache version');
assert(renderSource.includes('occupancyRebuiltThisFrame'), 'render frame summary should state whether occupancy changed this frame');
console.log('occupancy-cache-render-pipeline.test.js: OK');
