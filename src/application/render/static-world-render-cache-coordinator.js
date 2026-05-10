// Application coordinator for static world render-cache rebuilds.
// Owns rebuild timing, chunk sync, chunk rebuild orchestration, and cache payload updates.
// It receives presentation-specific hooks through dependency injection.

(function (global) {
  'use strict';

  var OWNER = 'src/application/render/static-world-render-cache-coordinator.js';
  var PHASE = 'P6B-STATIC-WORLD-RENDER-CACHE-COORDINATOR';

  function noop() {}
  function nullFn() { return null; }
  function defaultPerfNow() {
    try { if (global && global.performance && typeof global.performance.now === 'function') return global.performance.now(); } catch (_) {}
    return Date.now();
  }
  function resolveFunction(deps, name, fallback) {
    return deps && typeof deps[name] === 'function' ? deps[name] : (fallback || nullFn);
  }

  function rebuildStaticWorldRenderCache(options, deps) {
    var __opts = options && typeof options === 'object' ? options : {};
    var __deps = deps && typeof deps === 'object' ? deps : {};
    var force = __opts.force === true;
    var boxes = Array.isArray(__opts.boxes) ? __opts.boxes : [];
    var instances = Array.isArray(__opts.instances) ? __opts.instances : [];
    var staticBoxRenderCache = __opts.staticBoxRenderCache && typeof __opts.staticBoxRenderCache === 'object' ? __opts.staticBoxRenderCache : {};

    var perfNow = resolveFunction(__deps, 'perfNow', defaultPerfNow);
    var getStaticWorldFaceMergeControlStateSnapshotForRender = resolveFunction(__deps, 'getStaticWorldFaceMergeControlStateSnapshotForRender');
    var getSafeMainEditorViewRotation = resolveFunction(__deps, 'getSafeMainEditorViewRotation');
    var normalizeMainEditorViewRotationValue = resolveFunction(__deps, 'normalizeMainEditorViewRotationValue', function (value) { return Number(value || 0); });
    var buildStaticWorldRenderSignature = resolveFunction(__deps, 'buildStaticWorldRenderSignature', function () { return '0'; });
    var getRenderVisibilityCoreApi = resolveFunction(__deps, 'getRenderVisibilityCoreApi');
    var getMainCameraRenderScope = resolveFunction(__deps, 'getMainCameraRenderScope');
    var getSceneOccupancySnapshotForRender = resolveFunction(__deps, 'getSceneOccupancySnapshotForRender');
    var getSceneStaticWorldCacheApiForRender = resolveFunction(__deps, 'getSceneStaticWorldCacheApiForRender');
    var getSharedStaticWorldChunkCacheApiForRender = resolveFunction(__deps, 'getSharedStaticWorldChunkCacheApiForRender');
    var buildInstanceRenderUpdateModeIndex = resolveFunction(__deps, 'buildInstanceRenderUpdateModeIndex', function () { return Object.create(null); });
    var isStaticWorldBoxForRender = resolveFunction(__deps, 'isStaticWorldBoxForRender', function () { return true; });
    var getTerrainFrameLogContextForRender = resolveFunction(__deps, 'getTerrainFrameLogContextForRender', function () { return {}; });
    var compareRenderablesByDomain = resolveFunction(__deps, 'compareRenderablesByDomain');
    var buildStaticWorldChunkRenderables = resolveFunction(__deps, 'buildStaticWorldChunkRenderables');
    var captureStaticBoxCacheFrameState = resolveFunction(__deps, 'captureStaticBoxCacheFrameState', noop);
    var maybeLogStaticBoxCacheProfile = resolveFunction(__deps, 'maybeLogStaticBoxCacheProfile', noop);
    var maybeLogStaticCacheInvalidationVerify = resolveFunction(__deps, 'maybeLogStaticCacheInvalidationVerify', noop);
    var maybeLogStaticWorldChunkSummary = resolveFunction(__deps, 'maybeLogStaticWorldChunkSummary', noop);
    var logItemRotationPrototype = resolveFunction(__deps, 'logItemRotationPrototype', noop);
    var buildMainViewRotationSourceCheckPayload = resolveFunction(__deps, 'buildMainViewRotationSourceCheckPayload', function () { return {}; });
    var noteLayerRebuild = resolveFunction(__deps, 'noteLayerRebuild', noop);
    var isInteractiveRenderPressure = resolveFunction(__deps, 'isInteractiveRenderPressure', function () { return false; });
    var setLastSurfaceCacheStats = resolveFunction(__deps, 'setLastSurfaceCacheStats', noop);


  const profileStartAt = perfNow();
  const faceMergeControlState = getStaticWorldFaceMergeControlStateSnapshotForRender();
  const viewRotationInfo = getSafeMainEditorViewRotation(null);
  const currentViewRotation = normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation);
  const signatureStartAt = perfNow();
  const renderSignature = buildStaticWorldRenderSignature(currentViewRotation);
  const signatureCheckMs = Math.max(0, perfNow() - signatureStartAt);
  const visibilityCore = getRenderVisibilityCoreApi();
  const cameraScope = getMainCameraRenderScope(currentViewRotation);
  const semanticLogSeen = Object.create(null);
  const occupancyStartAt = perfNow();
  const occupancySnapshot = getSceneOccupancySnapshotForRender('render:static-world-chunk-cache');
  const occ = occupancySnapshot && occupancySnapshot.map && typeof occupancySnapshot.map.has === 'function' ? occupancySnapshot.map : new Map();
  const occupancyBuildMs = Math.max(0, perfNow() - occupancyStartAt);
  const sceneStaticWorldApi = getSceneStaticWorldCacheApiForRender();
  const sceneSnapshot = sceneStaticWorldApi && typeof sceneStaticWorldApi.getSnapshot === 'function'
    ? (sceneStaticWorldApi.getSnapshot() || { cacheVersion: 0, chunkSize: 16, dirtyChunkKeys: [], totalStaticBoxes: 0, lastUpdate: null })
    : { cacheVersion: 0, chunkSize: 16, dirtyChunkKeys: [], totalStaticBoxes: 0, lastUpdate: null };
  const sceneUpdates = sceneStaticWorldApi && typeof sceneStaticWorldApi.consumeUpdates === 'function'
    ? (sceneStaticWorldApi.consumeUpdates() || [])
    : [];
  const staticWorldCacheApi = getSharedStaticWorldChunkCacheApiForRender();
  const deferVisibleRebuild = faceMergeControlState.zoomInteractionActive === true || faceMergeControlState.zoomSettlePending === true;
  if (!staticWorldCacheApi || typeof staticWorldCacheApi.syncWithScene !== 'function' || typeof staticWorldCacheApi.collectVisibleRenderables !== 'function') {
    const fallbackPayload = {
      reason: 'rebuildStaticBoxRenderCacheIfNeeded',
      cacheHit: true,
      zoomInteractionActive: faceMergeControlState.zoomInteractionActive === true,
      zoomSettlePending: faceMergeControlState.zoomSettlePending === true,
      effectiveFaceMergeMode: String(faceMergeControlState.effectiveFaceMergeMode || 'merge'),
      pendingFaceMergeMode: String(faceMergeControlState.pendingFaceMergeMode || faceMergeControlState.effectiveFaceMergeMode || 'merge'),
      invalidationReason: 'missing-static-world-chunk-cache',
      totalBoxes: Number(boxes.length || 0),
      structuredBoxCount: 0,
      scopedBoxCount: 0,
      occupancyBuildMs: Number(occupancyBuildMs.toFixed(3)),
      visibleSurfaceBuildMs: 0,
      staticRenderableBuildMs: 0,
      signatureCheckMs: Number(signatureCheckMs.toFixed(3)),
      totalMs: Number(Math.max(0, perfNow() - profileStartAt).toFixed(3))
    };
    captureStaticBoxCacheFrameState({ rebuilt: false, buildMs: 0, cacheHit: true, invalidationReason: 'missing-static-world-chunk-cache', totalMs: fallbackPayload.totalMs, profile: fallbackPayload });
    maybeLogStaticBoxCacheProfile(fallbackPayload, true);
    staticBoxRenderCache.renderables = [];
    staticBoxRenderCache.surfaceStats = {
      renderSourceCountBeforeVisibility: 0,
      renderSourceCountAfterVisibility: 0,
      logicalVoxelCountEstimated: 0,
      visibleTopFaceCount: 0,
      visibleSideFaceCount: 0,
      hiddenInternalSurfaceSkippedCount: 0,
      voxelFurnitureProcessedCount: 0,
      visibleChunkCount: 0,
      rebuiltChunkCountThisFrame: 0,
      reusedChunkCountThisFrame: 0,
      chunkSize: Number(sceneSnapshot && sceneSnapshot.chunkSize || 16),
      totalChunkCount: 0,
      dirtyChunkCount: 0,
      totalStaticBoxes: 0,
      totalStaticRenderables: 0,
      cacheContentType: 'world-face-packets',
      cameraIndependent: true,
      usesScreenSpaceCache: false,
      buildMs: 0
    };
    setLastSurfaceCacheStats(staticBoxRenderCache.surfaceStats);
    return;
  }

  const instanceRenderUpdateModes = buildInstanceRenderUpdateModeIndex(instances);
  const sceneSyncStartAt = perfNow();
  const syncResult = staticWorldCacheApi.syncWithScene({
    forceFullRebuild: force === true,
    sceneSnapshot: sceneSnapshot,
    updates: sceneUpdates,
    getBoxes: function () {
      return boxes.filter(function (box) { return isStaticWorldBoxForRender(box, instanceRenderUpdateModes); });
    }
  }) || { mode: 'cached', summary: null, appliedUpdateCount: 0 };
  const sceneSyncMs = Math.max(0, perfNow() - sceneSyncStartAt);

  var terrainFrameLogContext = getTerrainFrameLogContextForRender();
  const chunkBuildStartAt = perfNow();
  const chunkResult = staticWorldCacheApi.collectVisibleRenderables({
    scope: cameraScope,
    renderSignature: renderSignature,
    comparePackets: compareRenderablesByDomain,
    profileContext: terrainFrameLogContext,
    rebuildChunk: function (chunk) {
      return buildStaticWorldChunkRenderables(chunk, {
        visibilityCore: visibilityCore,
        occupancy: occ,
        currentViewRotation: currentViewRotation,
        cameraScope: cameraScope,
        semanticLogSeen: semanticLogSeen,
        profileContext: terrainFrameLogContext
      });
    }
  }) || { packets: [], renderables: [], summary: null, visibleChunkKeys: [] };
  const chunkBuildMs = Math.max(0, perfNow() - chunkBuildStartAt);
  const chunkSummary = chunkResult.summary || {
    totalChunkCount: 0,
    dirtyChunkCount: 0,
    visibleChunkCount: 0,
    rebuiltChunkCountThisFrame: 0,
    reusedChunkCountThisFrame: 0,
    chunkSize: Number(sceneSnapshot && sceneSnapshot.chunkSize || 16),
    totalStaticBoxes: 0,
    totalStaticRenderables: 0,
    visibleTopFaceCount: 0,
    visibleSideFaceCount: 0,
    logicalVoxelCountEstimated: 0,
    hiddenInternalSurfaceSkippedCount: 0,
    voxelFurnitureProcessedCount: 0,
    renderSourceCountBeforeVisibility: 0,
    renderSourceCountAfterVisibility: 0,
    buildMs: 0
  };

  var staticWorldPackets = Array.isArray(chunkResult.packets)
    ? chunkResult.packets
    : (Array.isArray(chunkResult.renderables) ? chunkResult.renderables : []);
  var frameStaticRenderables = staticWorldPackets;

  staticBoxRenderCache.occupancy = occ;
  staticBoxRenderCache.occupancyCacheVersion = occupancySnapshot && occupancySnapshot.cacheVersion != null ? Number(occupancySnapshot.cacheVersion || 0) : 0;
  staticBoxRenderCache.packets = staticWorldPackets;
  staticBoxRenderCache.renderables = frameStaticRenderables;
  staticBoxRenderCache.geometrySignature = String(sceneSnapshot && sceneSnapshot.cacheVersion != null ? sceneSnapshot.cacheVersion : '0');
  staticBoxRenderCache.lightingSignature = renderSignature;
  staticBoxRenderCache.viewRotation = currentViewRotation;
  staticBoxRenderCache.cacheSignature = renderSignature;
  staticBoxRenderCache.lastBuiltAt = perfNow();
  staticBoxRenderCache.dirtyGeometry = false;
  staticBoxRenderCache.dirtyLighting = false;
  staticBoxRenderCache.surfaceStats = {
    terrainColumnCount: 0,
    logicalVoxelCountEstimated: Number(chunkSummary.logicalVoxelCountEstimated || 0),
    visibleTopFaceCount: Number(chunkSummary.visibleTopFaceCount || 0),
    visibleSideFaceCount: Number(chunkSummary.visibleSideFaceCount || 0),
    internalVoxelSkippedCount: 0,
    hiddenInternalSurfaceSkippedCount: Number(chunkSummary.hiddenInternalSurfaceSkippedCount || 0),
    voxelFurnitureProcessedCount: Number(chunkSummary.voxelFurnitureProcessedCount || 0),
    colorCacheEnabled: (Number(chunkSummary.colorCacheHitCount || 0) + Number(chunkSummary.colorCacheMissCount || 0)) > 0,
    colorCacheHitCount: Number(chunkSummary.colorCacheHitCount || 0),
    colorCacheMissCount: Number(chunkSummary.colorCacheMissCount || 0),
    shadowOverlayCacheHitCount: Number(chunkSummary.shadowOverlayCacheHitCount || 0),
    shadowOverlayCacheMissCount: Number(chunkSummary.shadowOverlayCacheMissCount || 0),
    shadowOverlayTotalCount: Number(chunkSummary.shadowOverlayTotalCount || 0),
    step4_buildColorMs: Number(chunkSummary.step4_buildColorMs || 0),
    step4d_shadowOverlayTotalMs: Number(chunkSummary.step4d_shadowOverlayTotalMs || 0),
    cameraCulledCount: Math.max(0, Number(chunkSummary.totalChunkCount || 0) - Number(chunkSummary.visibleChunkCount || 0)),
    surfaceOnlyRenderingEnabled: cameraScope.surfaceOnlyRenderingEnabled !== false,
    renderSourceCountBeforeVisibility: Number(chunkSummary.renderSourceCountBeforeVisibility || 0),
    renderSourceCountAfterVisibility: Number(chunkSummary.renderSourceCountAfterVisibility || 0),
    finalRenderableCount: Number(staticWorldPackets.length || 0),
    visibleStaticPacketCount: Number(chunkSummary.visibleStaticPacketCount || staticWorldPackets.length || 0),
    packetMergeMs: Number(chunkSummary.packetMergeMs || 0),
    cacheContentType: String(chunkSummary.cacheContentType || 'world-face-packets'),
    cameraIndependent: chunkSummary.cameraIndependent !== false,
    usesScreenSpaceCache: chunkSummary.usesScreenSpaceCache === true,
    visibleChunkCount: Number(chunkSummary.visibleChunkCount || 0),
    rebuiltChunkCountThisFrame: Number(chunkSummary.rebuiltChunkCountThisFrame || 0),
    rebuiltChunkKeysThisFrame: Array.isArray(chunkSummary.rebuiltChunkKeysThisFrame) ? chunkSummary.rebuiltChunkKeysThisFrame.slice() : [],
    rebuiltChunkTotalBoxCount: Number(chunkSummary.rebuiltChunkTotalBoxCount || 0),
    rebuiltChunkTotalRenderableCount: Number(chunkSummary.rebuiltChunkTotalRenderableCount || 0),
    rebuiltChunkTotalVisibleFaceCount: Number(chunkSummary.rebuiltChunkTotalVisibleFaceCount || 0),
    reusedChunkCountThisFrame: Number(chunkSummary.reusedChunkCountThisFrame || 0),
    chunkSize: Number(chunkSummary.chunkSize || sceneSnapshot.chunkSize || 16),
    totalChunkCount: Number(chunkSummary.totalChunkCount || 0),
    dirtyChunkCount: Number(chunkSummary.dirtyChunkCount || 0),
    totalStaticBoxes: Number(chunkSummary.totalStaticBoxes || 0),
    totalStaticRenderables: Number(chunkSummary.totalStaticRenderables || staticWorldPackets.length || 0),
    buildMs: Number(chunkBuildMs.toFixed(3))
  };

  const rebuiltChunkCountThisFrame = Number(chunkSummary.rebuiltChunkCountThisFrame || 0);
  const remainingDirtyChunkCount = Number(chunkSummary.remainingDirtyChunkCount || chunkSummary.dirtyChunkCount || 0);
  const invalidationReason = force
    ? 'force'
    : (syncResult.mode === 'full-rebuild'
      ? 'scene-full-rebuild'
      : (Number(syncResult.appliedUpdateCount || 0) > 0
        ? 'dirty-chunk-update'
        : (chunkSummary && chunkSummary.renderSignatureChanged === true
          ? 'static-content-render-signature-changed'
          : (rebuiltChunkCountThisFrame > 0 && remainingDirtyChunkCount > 0
            ? 'dirty-chunk-queue-drain'
            : 'none'))));
  var invalidationSignatureFields = ['lightingSignature','xrayFaces','showDebug','surfaceOnlyRenderingEnabled','packetViewRotation','cacheContentType','cameraIndependent','usesScreenSpaceCache'];
  maybeLogStaticCacheInvalidationVerify({
    invalidationReason: invalidationReason,
    cacheContentType: 'world-face-packets',
    cameraIndependent: true,
    signatureFields: invalidationSignatureFields.slice(),
    includesCameraX: invalidationSignatureFields.indexOf('cameraX') >= 0,
    includesCameraY: invalidationSignatureFields.indexOf('cameraY') >= 0,
    includesZoom: invalidationSignatureFields.indexOf('zoom') >= 0,
    includesScreenTransform: invalidationSignatureFields.indexOf('screenTransform') >= 0 || invalidationSignatureFields.indexOf('projectionZoom') >= 0,
    includesViewportOffset: invalidationSignatureFields.indexOf('viewportOffset') >= 0 || invalidationSignatureFields.indexOf('cameraOffset') >= 0,
    shouldInvalidateStaticCache: invalidationReason !== 'none'
  });
  const staticCacheProfile = {
    reason: 'rebuildStaticBoxRenderCacheIfNeeded',
    cacheHit: rebuiltChunkCountThisFrame === 0,
    invalidationReason: invalidationReason,
    totalBoxes: Number(boxes.length || 0),
    structuredBoxCount: Number(chunkSummary.totalStaticBoxes || 0),
    scopedBoxCount: Number(chunkSummary.renderSourceCountAfterVisibility || 0),
    occupancyBuildMs: Number(occupancyBuildMs.toFixed(3)),
    visibleSurfaceBuildMs: Number(Math.max(0, chunkBuildMs - Number(chunkSummary.rebuiltChunkCountThisFrame || 0) * 0).toFixed(3)),
    staticRenderableBuildMs: Number(chunkBuildMs.toFixed(3)),
    signatureCheckMs: Number(signatureCheckMs.toFixed(3)),
    sceneSyncMs: Number(sceneSyncMs.toFixed(3)),
    visibleChunkCount: Number(chunkSummary.visibleChunkCount || 0),
    rebuiltChunkCountThisFrame: rebuiltChunkCountThisFrame,
    reusedChunkCountThisFrame: Number(chunkSummary.reusedChunkCountThisFrame || 0),
    chunkSize: Number(chunkSummary.chunkSize || sceneSnapshot.chunkSize || 16),
    occupancyCacheVersion: occupancySnapshot && occupancySnapshot.cacheVersion != null ? Number(occupancySnapshot.cacheVersion || 0) : 0,
    cacheContentType: String(chunkSummary.cacheContentType || 'world-face-packets'),
    cameraIndependent: chunkSummary.cameraIndependent !== false,
    usesScreenSpaceCache: chunkSummary.usesScreenSpaceCache === true,
    totalMs: Number(Math.max(0, perfNow() - profileStartAt).toFixed(3))
  };
  staticBoxRenderCache.lastProfile = staticCacheProfile;
  setLastSurfaceCacheStats(staticBoxRenderCache.surfaceStats);
  captureStaticBoxCacheFrameState({
    rebuilt: rebuiltChunkCountThisFrame > 0,
    buildMs: Number(chunkBuildMs.toFixed(3)),
    cacheHit: rebuiltChunkCountThisFrame === 0,
    invalidationReason: invalidationReason,
    totalMs: staticCacheProfile.totalMs,
    profile: staticCacheProfile
  });
  maybeLogStaticBoxCacheProfile(staticCacheProfile, rebuiltChunkCountThisFrame > 0 || Number(syncResult.appliedUpdateCount || 0) > 0 || force === true);
  maybeLogStaticWorldChunkSummary({
    totalChunkCount: Number(chunkSummary.totalChunkCount || 0),
    dirtyChunkCount: Number(chunkSummary.dirtyChunkCount || 0),
    visibleChunkCount: Number(chunkSummary.visibleChunkCount || 0),
    rebuiltChunkCountThisFrame: rebuiltChunkCountThisFrame,
    reusedChunkCountThisFrame: Number(chunkSummary.reusedChunkCountThisFrame || 0),
    chunkSize: Number(chunkSummary.chunkSize || sceneSnapshot.chunkSize || 16),
    totalStaticBoxes: Number(chunkSummary.totalStaticBoxes || 0),
    totalStaticRenderables: Number(chunkSummary.totalStaticRenderables || staticWorldPackets.length || 0),
    visibleStaticPacketCount: Number(chunkSummary.visibleStaticPacketCount || staticWorldPackets.length || 0),
    packetMergeMs: Number(chunkSummary.packetMergeMs || 0),
    cacheContentType: String(chunkSummary.cacheContentType || 'world-face-packets'),
    cameraIndependent: chunkSummary.cameraIndependent !== false,
    usesScreenSpaceCache: chunkSummary.usesScreenSpaceCache === true,
    buildMs: Number(chunkBuildMs.toFixed(3))
  }, rebuiltChunkCountThisFrame > 0 || Number(syncResult.appliedUpdateCount || 0) > 0 || force === true);
  logItemRotationPrototype('main-static-cache-rebuilt', {
    currentViewRotation: currentViewRotation,
    cacheSignature: renderSignature,
    geometrySignature: String(sceneSnapshot && sceneSnapshot.cacheVersion != null ? sceneSnapshot.cacheVersion : '0'),
    cacheSignatureIncludesRuntimeViewRotation: true,
    sourceOfViewRotation: viewRotationInfo && viewRotationInfo.source ? viewRotationInfo.source : 'runtime-state',
    renderableCount: Number(staticBoxRenderCache.renderables.length || 0),
    reason: invalidationReason,
    visibleChunkCount: Number(chunkSummary.visibleChunkCount || 0),
    rebuiltChunkCountThisFrame: rebuiltChunkCountThisFrame,
    reusedChunkCountThisFrame: Number(chunkSummary.reusedChunkCountThisFrame || 0)
  });
  logItemRotationPrototype('render-surface-cache-summary', {
    logicalVoxelCountEstimated: Number(staticBoxRenderCache.surfaceStats.logicalVoxelCountEstimated || 0),
    visibleTopFaceCount: Number(staticBoxRenderCache.surfaceStats.visibleTopFaceCount || 0),
    visibleSideFaceCount: Number(staticBoxRenderCache.surfaceStats.visibleSideFaceCount || 0),
    hiddenInternalSurfaceSkippedCount: Number(staticBoxRenderCache.surfaceStats.hiddenInternalSurfaceSkippedCount || 0),
    voxelFurnitureProcessedCount: Number(staticBoxRenderCache.surfaceStats.voxelFurnitureProcessedCount || 0),
    surfaceOnlyRenderingEnabled: staticBoxRenderCache.surfaceStats.surfaceOnlyRenderingEnabled !== false,
    visibleChunkCount: Number(staticBoxRenderCache.surfaceStats.visibleChunkCount || 0),
    rebuiltChunkCountThisFrame: Number(staticBoxRenderCache.surfaceStats.rebuiltChunkCountThisFrame || 0)
  });
  logItemRotationPrototype('main-view-rotation-source-check', buildMainViewRotationSourceCheckPayload(currentViewRotation, currentViewRotation, renderSignature));
  noteLayerRebuild('static-box', `interactive=${isInteractiveRenderPressure()} chunks=${Number(chunkSummary.visibleChunkCount || 0)} rebuilt=${rebuiltChunkCountThisFrame} viewRotation=${currentViewRotation}`);

  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    rebuildStaticWorldRenderCache: rebuildStaticWorldRenderCache,
    summarizeBoundary: function () {
      return { owner: OWNER, phase: PHASE, layer: 'application/render', input: 'static world state + render hooks', output: 'updated static render cache payload' };
    }
  };

  try {
    global.__STATIC_WORLD_RENDER_CACHE_COORDINATOR__ = api;
    global.__APP_APPLICATION_STATIC_WORLD_RENDER_CACHE_COORDINATOR__ = api;
    global.IsometricStaticWorldRenderCacheCoordinator = api;
    global.App = global.App || {};
    global.App.application = global.App.application || {};
    global.App.application.render = global.App.application.render || {};
    global.App.application.render.staticWorldRenderCacheCoordinator = api;
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
