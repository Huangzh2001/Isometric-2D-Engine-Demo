const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
const sceneSessionSource = fs.readFileSync(path.join(__dirname, '..', 'src/core/state/scene-session-state.js'), 'utf8');
const chunkCacheSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/static-world-cache.js'), 'utf8');
const canvasRendererSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/renderer/canvas2d-renderer.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(indexSource.includes('src/presentation/render/static-world-cache.js'), 'main entry should load the shared static-world chunk cache module');
assert(sceneSessionSource.includes('[STATIC-WORLD-UPDATE]'), 'scene session should emit static-world update logs');
assert(sceneSessionSource.includes('consumeStaticWorldUpdates'), 'scene session should expose pending static-world updates');
assert(chunkCacheSource.includes('collectVisibleRenderables'), 'shared static-world chunk cache should collect visible chunk packets');
assert(chunkCacheSource.includes('syncWithScene'), 'shared static-world chunk cache should sync incrementally from scene updates');
assert(chunkCacheSource.includes('cacheContentType: \'world-face-packets\''), 'chunk cache should declare camera-independent world-face packets');
assert(chunkCacheSource.includes('cameraIndependent: true'), 'chunk cache summaries should mark cameraIndependent=true');
assert(chunkCacheSource.includes('usesScreenSpaceCache: false'), 'chunk cache summaries should mark usesScreenSpaceCache=false');
assert(renderSource.includes('[STATIC-WORLD-CHUNK]'), 'render layer should emit shared static-world chunk summaries');
assert(canvasRendererSource.includes("r.kind === 'static-world-face-packet'"), 'canvas2d renderer should dispatch static-world-face-packet drawables');
assert(canvasRendererSource.includes('drawStaticWorldFacePacket'), 'canvas2d renderer should call drawStaticWorldFacePacket for static-world packets');
assert(renderSource.includes('screenPointsFromWorldFaceNoCamera(packet.worldPts'), 'render layer should derive static packet projected points from worldPts at draw time');
assert(renderSource.includes('worldShadowOverlaysToNoCamera(packet.shadowOverlaysWorld'), 'render layer should derive static packet shadow overlays from world-space overlays at draw time');
assert(renderSource.includes('drawStaticWorldFacePacket'), 'render layer should draw static packets directly without frame materialization rebuild');
assert(renderSource.includes('[FRAME-WORK-BREAKDOWN]'), 'render layer should emit frame work breakdown logs');
assert(renderSource.includes('[CAMERA-STATIC-WORLD-VERIFY]'), 'render layer should emit camera/static-world verification logs');
assert(renderSource.includes('cameraX'), 'render frame summary should include cameraX');
assert(renderSource.includes('cameraY'), 'render frame summary should include cameraY');
assert(renderSource.includes('zoom'), 'render frame summary should include zoom');
assert(chunkCacheSource.includes('mergeSortedPacketLists'), 'chunk cache should merge visible chunk packets without full frame rebuild sorting');
assert(chunkCacheSource.includes('visibleStaticPacketCount'), 'chunk cache summary should expose visibleStaticPacketCount');

assert(renderSource.includes('getDynamicInstanceSplitForRender'), 'render layer should cache dynamic instance candidates separately from static instances');
assert(renderSource.includes('getVisibleInstanceSummaryForRender'), 'render layer should compute visible instance summaries without scanning all static instances every frame');
assert(renderSource.includes('let occupiedKeySet = null'), 'render layer should lazily build occupiedKeySet only when debug dynamic voxels need it');
assert(canvasRendererSource.includes('!isStaticWorldPacket'), 'canvas2d renderer should skip per-frame draw metadata mutation for static-world packets');
assert(canvasRendererSource.includes('staticPacketCount'), 'canvas2d renderer should track static packet counts in frame draw stats');
assert(canvasRendererSource.includes('staticPacketMergeMs'), 'frame work breakdown payload should expose staticPacketMergeMs separately from dynamicObjectBuildMs');
console.log('static-world-chunk-cache-render-pipeline.test.js: OK');

assert(renderSource.includes('[CHUNK-REBUILD-BREAKDOWN]'), 'render layer should emit per-chunk rebuild breakdown logs');
assert(renderSource.includes('[ZOOM-CAMERA-STATE-VERIFY]'), 'render layer should emit unified zoom/camera verification logs');
assert(renderSource.includes('[STATIC-CACHE-INVALIDATION-VERIFY]'), 'render layer should emit static cache invalidation verification logs');
