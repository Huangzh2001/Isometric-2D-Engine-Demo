const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
const instanceSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/instances/instance-renderable-builder.js'), 'utf8');
const mainFrameAssemblerSource = fs.readFileSync(path.join(__dirname, '..', 'src/application/render/main-frame-renderable-assembler.js'), 'utf8');
const sceneSessionSource = fs.readFileSync(path.join(__dirname, '..', 'src/core/state/scene-session-state.js'), 'utf8');
const chunkCacheSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/static-world-cache.js'), 'utf8');
const canvasRendererSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/renderer/canvas2d-renderer.js'), 'utf8');
const renderableOrderDrawSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/renderer/canvas2d-renderable-order-draw.js'), 'utf8');
const staticWorldFaceDrawSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js'), 'utf8');
const renderDiagnosticsSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/diagnostics/render-diagnostics.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(indexSource.includes('src/presentation/render/static-world-cache.js'), 'main entry should load the shared static-world chunk cache module');
assert(sceneSessionSource.includes('[STATIC-WORLD-UPDATE]'), 'scene session should emit static-world update logs');
assert(sceneSessionSource.includes('consumeStaticWorldUpdates'), 'scene session should expose pending static-world updates');
assert(chunkCacheSource.includes('collectVisibleRenderables'), 'shared static-world chunk cache should collect visible chunk packets');
assert(chunkCacheSource.includes('syncWithScene'), 'shared static-world chunk cache should sync incrementally from scene updates');
assert(chunkCacheSource.includes('cacheContentType: \'world-face-packets\''), 'chunk cache should declare camera-independent world-face packets');
assert(chunkCacheSource.includes('cameraIndependent: true'), 'chunk cache summaries should mark cameraIndependent=true');
assert(chunkCacheSource.includes('usesScreenSpaceCache: false'), 'chunk cache summaries should mark usesScreenSpaceCache=false');
assert(renderDiagnosticsSource.includes('STATIC-WORLD-CHUNK'), 'render diagnostics owner should emit shared static-world chunk summaries');
assert(renderSource.includes("r.kind === 'static-world-face-packet'"), 'render facade should dispatch static-world-face-packet drawables');
assert(renderSource.includes('drawStaticWorldFacePacket'), 'render facade should call drawStaticWorldFacePacket for static-world packets');
assert(staticWorldFaceDrawSource.includes('callScreenPointsFromWorldFaceNoCamera') && staticWorldFaceDrawSource.includes('packet.worldPts'), 'static world face draw pass should derive static packet projected points from worldPts at draw time');
assert(staticWorldFaceDrawSource.includes('worldShadowOverlaysToNoCamera(packet.shadowOverlaysWorld'), 'static world face draw pass should derive static packet shadow overlays from world-space overlays at draw time');
assert(renderSource.includes('drawStaticWorldFacePacket'), 'render layer should draw static packets directly without frame materialization rebuild');
assert(renderDiagnosticsSource.includes('FRAME-WORK-BREAKDOWN'), 'render diagnostics owner should emit frame work breakdown logs');
assert(renderDiagnosticsSource.includes('CAMERA-STATIC-WORLD-VERIFY'), 'render diagnostics owner should emit camera/static-world verification logs');
assert(renderSource.includes('cameraX'), 'render frame summary should include cameraX');
assert(renderSource.includes('cameraY'), 'render frame summary should include cameraY');
assert(renderSource.includes('zoom'), 'render frame summary should include zoom');
assert(chunkCacheSource.includes('mergeSortedPacketLists'), 'chunk cache should merge visible chunk packets without full frame rebuild sorting');
assert(chunkCacheSource.includes('visibleStaticPacketCount'), 'chunk cache summary should expose visibleStaticPacketCount');

assert(instanceSource.includes('function getDynamicInstanceSplitForRender('), 'instance owner should cache dynamic instance candidates separately from static instances');
assert(instanceSource.includes('function getVisibleInstanceSummaryForRender('), 'instance owner should compute visible instance summaries without scanning all static instances every frame');
assert(mainFrameAssemblerSource.includes('let occupiedKeySet = null'), 'main frame assembler should lazily build occupiedKeySet only when debug dynamic voxels need it');
assert(renderableOrderDrawSource.includes('isStaticWorldPacket') && renderableOrderDrawSource.includes("kind === 'static-world-face-packet'"), 'renderable order draw owner should handle static-world packet metadata separately');
assert(renderableOrderDrawSource.includes('staticPacketCount') || renderSource.includes('staticPacketCount'), 'render pipeline should track static packet counts in frame draw stats');
assert(renderableOrderDrawSource.includes('staticPacketMergeMs') || renderSource.includes('staticPacketMergeMs'), 'frame work breakdown payload should expose staticPacketMergeMs separately from dynamicObjectBuildMs');
console.log('static-world-chunk-cache-render-pipeline.test.js: OK');

assert(renderDiagnosticsSource.includes('CHUNK-REBUILD-BREAKDOWN'), 'render diagnostics owner should emit per-chunk rebuild breakdown logs');
assert(renderDiagnosticsSource.includes('ZOOM-CAMERA-STATE-VERIFY'), 'render diagnostics owner should emit unified zoom/camera verification logs');
assert(renderDiagnosticsSource.includes('STATIC-CACHE-INVALIDATION-VERIFY'), 'render diagnostics owner should emit static cache invalidation verification logs');
