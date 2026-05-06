const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const coordinatorSource = fs.readFileSync(path.join(root, 'src/application/render/static-world-render-cache-coordinator.js'), 'utf8');
const renderSource = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');

const sandbox = {
  window: {},
  Math,
  Number,
  String,
  Object,
  Array,
  Set,
  Map,
  Date,
  JSON,
  console,
  performance: { now: () => 0 }
};
vm.runInNewContext(coordinatorSource, sandbox, { filename: 'static-world-render-cache-coordinator.js' });

const api = sandbox.window.__STATIC_WORLD_RENDER_CACHE_COORDINATOR__;
assert(api, 'coordinator should expose window.__STATIC_WORLD_RENDER_CACHE_COORDINATOR__');
assert.strictEqual(sandbox.window.__APP_APPLICATION_STATIC_WORLD_RENDER_CACHE_COORDINATOR__, api, 'coordinator should expose app bootstrap handle');
assert.strictEqual(typeof api.rebuildStaticWorldRenderCache, 'function', 'rebuildStaticWorldRenderCache should be an application function');

assert(indexSource.includes('src/application/render/static-world-render-cache-coordinator.js'), 'index should load static world render-cache coordinator');
assert(indexSource.indexOf('src/application/render/static-world-renderable-builder.js') < indexSource.indexOf('src/application/render/static-world-render-cache-coordinator.js'), 'coordinator should load after static world renderable builder');
assert(indexSource.indexOf('src/application/render/static-world-render-cache-coordinator.js') < indexSource.indexOf('src/presentation/render/render.js'), 'coordinator must load before render.js');

assert(renderSource.includes('requireStaticWorldRenderCacheCoordinatorForRender'), 'render.js should use coordinator require wrapper');
assert(renderSource.includes('createStaticWorldRenderCacheCoordinatorDepsForRender'), 'render.js should provide explicit coordinator deps');
assert(renderSource.includes('.rebuildStaticWorldRenderCache('), 'render.js wrapper should delegate to coordinator.rebuildStaticWorldRenderCache');
assert(!/function rebuildStaticBoxRenderCacheIfNeeded\s*\([^)]*\)\s*\{[\s\S]{0,2000}const profileStartAt = perfNow/.test(renderSource), 'render.js should no longer own static cache rebuild body');

assert(!/\bctx\s*\./.test(coordinatorSource), 'coordinator must not draw through ctx');
assert(!/\bdocument\s*\./.test(coordinatorSource), 'coordinator must not access document');
assert(!/\blocalStorage\s*\./.test(coordinatorSource), 'coordinator must not access localStorage');
assert(!/\bnew\s+Image\b/.test(coordinatorSource), 'coordinator must not allocate Image');

function makeDeps(overrides = {}) {
  const events = [];
  function emit(name) {
    return function (payload) { events.push({ name, payload }); };
  }
  const deps = {
    events,
    perfNow: () => 10,
    getStaticWorldFaceMergeControlStateSnapshotForRender: () => ({
      zoomInteractionActive: false,
      zoomSettlePending: false,
      effectiveFaceMergeMode: 'merge',
      pendingFaceMergeMode: 'merge'
    }),
    getSafeMainEditorViewRotation: () => ({ viewRotation: 0, source: 'test-runtime' }),
    normalizeMainEditorViewRotationValue: (value) => Number(value || 0),
    buildStaticWorldRenderSignature: () => 'render-sig-0',
    getRenderVisibilityCoreApi: () => ({ kind: 'visibility-core' }),
    getMainCameraRenderScope: () => ({ surfaceOnlyRenderingEnabled: true }),
    getSceneOccupancySnapshotForRender: () => ({ map: new Map(), cacheVersion: 7 }),
    getSceneStaticWorldCacheApiForRender: () => ({
      getSnapshot: () => ({ cacheVersion: 11, chunkSize: 16, dirtyChunkKeys: ['0,0'], totalStaticBoxes: 1, lastUpdate: null }),
      consumeUpdates: () => []
    }),
    getSharedStaticWorldChunkCacheApiForRender: () => ({
      syncWithScene: (args) => {
        assert.strictEqual(args.forceFullRebuild, false, 'forceFullRebuild should mirror options.force');
        assert(Array.isArray(args.getBoxes()), 'syncWithScene should receive getBoxes callback');
        return { mode: 'cached', summary: null, appliedUpdateCount: 0 };
      },
      collectVisibleRenderables: (args) => {
        assert.strictEqual(args.renderSignature, 'render-sig-0', 'collectVisibleRenderables should receive render signature');
        const rebuilt = args.rebuildChunk({ key: '0,0', boxMap: new Map() });
        assert(rebuilt && Array.isArray(rebuilt.packets), 'collectVisibleRenderables should be able to call injected rebuildChunk');
        return {
          packets: [{ id: 'p1', sortKey: 1, tie: 0 }],
          renderables: [],
          visibleChunkKeys: ['0,0'],
          summary: {
            totalChunkCount: 1,
            dirtyChunkCount: 0,
            visibleChunkCount: 1,
            rebuiltChunkCountThisFrame: 1,
            reusedChunkCountThisFrame: 0,
            chunkSize: 16,
            totalStaticBoxes: 1,
            totalStaticRenderables: 1,
            visibleTopFaceCount: 1,
            visibleSideFaceCount: 0,
            logicalVoxelCountEstimated: 1,
            hiddenInternalSurfaceSkippedCount: 0,
            voxelFurnitureProcessedCount: 1,
            renderSourceCountBeforeVisibility: 1,
            renderSourceCountAfterVisibility: 1,
            buildMs: 0,
            visibleStaticPacketCount: 1,
            packetMergeMs: 0,
            cacheContentType: 'world-face-packets',
            cameraIndependent: true,
            usesScreenSpaceCache: false,
            remainingDirtyChunkCount: 0
          }
        };
      }
    }),
    buildInstanceRenderUpdateModeIndex: () => ({}),
    isStaticWorldBoxForRender: () => true,
    getTerrainFrameLogContextForRender: () => ({ terrainBatchId: 'unit-test' }),
    compareRenderablesByDomain: (a, b) => Number(a.sortKey || 0) - Number(b.sortKey || 0),
    buildStaticWorldChunkRenderables: () => ({ packets: [{ id: 'chunk-packet' }], stats: { packetCount: 1 } }),
    captureStaticBoxCacheFrameState: emit('captureStaticBoxCacheFrameState'),
    maybeLogStaticBoxCacheProfile: emit('maybeLogStaticBoxCacheProfile'),
    maybeLogStaticCacheInvalidationVerify: emit('maybeLogStaticCacheInvalidationVerify'),
    maybeLogStaticWorldChunkSummary: emit('maybeLogStaticWorldChunkSummary'),
    logItemRotationPrototype: emit('logItemRotationPrototype'),
    buildMainViewRotationSourceCheckPayload: () => ({ aligned: true }),
    noteLayerRebuild: emit('noteLayerRebuild'),
    isInteractiveRenderPressure: () => false,
    setLastSurfaceCacheStats: emit('setLastSurfaceCacheStats')
  };
  return Object.assign(deps, overrides);
}

const staticBoxRenderCache = {};
const deps = makeDeps();
api.rebuildStaticWorldRenderCache({
  force: false,
  boxes: [{ id: 'box1' }],
  instances: [],
  staticBoxRenderCache
}, deps);

assert.strictEqual(staticBoxRenderCache.renderables.length, 1, 'normal path should update renderables');
assert.strictEqual(staticBoxRenderCache.cacheSignature, 'render-sig-0', 'normal path should update cache signature');
assert.strictEqual(staticBoxRenderCache.geometrySignature, '11', 'normal path should update geometry signature');
assert.strictEqual(staticBoxRenderCache.surfaceStats.visibleChunkCount, 1, 'normal path should update surface stats');
assert(deps.events.some((entry) => entry.name === 'setLastSurfaceCacheStats'), 'normal path should update last surface stats through injected hook');
assert(deps.events.some((entry) => entry.name === 'maybeLogStaticWorldChunkSummary'), 'normal path should log chunk summary through injected hook');

const fallbackCache = {};
const fallbackDeps = makeDeps({
  getSharedStaticWorldChunkCacheApiForRender: () => null
});
api.rebuildStaticWorldRenderCache({
  force: false,
  boxes: [{ id: 'box1' }],
  instances: [],
  staticBoxRenderCache: fallbackCache
}, fallbackDeps);

assert(Array.isArray(fallbackCache.renderables), 'fallback path should set renderables array');
assert.strictEqual(fallbackCache.renderables.length, 0, 'fallback path should not emit renderables');
assert.strictEqual(fallbackCache.surfaceStats.cacheContentType, 'world-face-packets', 'fallback path should keep stable cache content type');
assert(fallbackDeps.events.some((entry) => entry.name === 'captureStaticBoxCacheFrameState'), 'fallback path should capture cache frame state');

console.log('static-world-render-cache-coordinator.test.js PASS');
