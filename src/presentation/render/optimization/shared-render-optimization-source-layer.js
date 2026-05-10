// PXM-07.7A: Shared render optimization source layer.
// Layer: presentation/render/optimization.
//
// This module exposes renderer-neutral, read-only snapshots of existing render
// optimization sources. It does not render, mutate caches, select backends,
// change dirty/rebuild behavior, change depth sorting, or migrate consumers.
(function registerSharedRenderOptimizationSourceLayer(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/shared-render-optimization-source-layer.js';
  var PHASE = 'shared-render-optimization-source-layer';
  var MODE = 'readonly-snapshot';

  var SOURCE_IDS = [
    'floor-layer-cache',
    'static-world-chunk-cache',
    'static-packet-run-cache',
    'projected-geometry-cache',
    'material-color-cache',
    'shadow-overlay-cache',
    'visibility-culling-contract',
    'occupancy-cache-contract',
    'interaction-fast-path-contract',
    'performance-audit-contract'
  ];

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function toBool(value) { return value === true; }

  function round(value) {
    var n = toNumber(value, 0);
    return Number(n.toFixed ? n.toFixed(3) : n);
  }

  function getContractRow(id) {
    try {
      var runtimeManifest = global.__SHARED_RENDER_OPTIMIZATION_RUNTIME_MANIFEST__ || null;
      if (runtimeManifest && typeof runtimeManifest.getRuntimeManifestById === 'function') {
        var runtimeRow = runtimeManifest.getRuntimeManifestById(id);
        if (runtimeRow) return runtimeRow;
      }
    } catch (_) {}
    try {
      var contracts = global.__SHARED_RENDER_OPTIMIZATION_CONTRACTS__ || null;
      if (contracts && typeof contracts.getContractById === 'function') {
        var row = contracts.getContractById(id);
        if (row) return row;
      }
    } catch (_) {}
    return null;
  }

  function hasPositive() {
    for (var i = 0; i < arguments.length; i++) {
      if (toNumber(arguments[i], 0) > 0) return true;
    }
    return false;
  }

  function listNonEmpty(items) {
    return (items || []).filter(function (item) { return item != null && String(item) !== ''; });
  }

  function makeBaseSource(id, auditSnapshot) {
    var contract = getContractRow(id) || {};
    var pixiConsumer = contract.pixiConsumer || {};
    var canvas2dConsumer = contract.canvas2dConsumer || {};
    return {
      id: id,
      sourceLayerMode: MODE,
      sourceStatus: contract.sourceStatus || 'unknown',
      implementationReadiness: contract.implementationReadiness || contract.sourceStatus || 'unknown',
      sharedSource: contract.sharedSource || contract.sourcePayload || contract.sourcePayloadSummary || '',
      dirtyVersionSignature: contract.dirtyVersionSignature || '',
      runtimeStatsSchema: contract.runtimeStats || '',
      canvas2dConsumerStatus: canvas2dConsumer.status || 'unknown',
      pixiConsumerStatus: pixiConsumer.status || 'unknown',
      fallbackPolicy: contract.fallbackPolicy || contract.reuseRule || '',
      nextAction: contract.nextAction || '',
      riskGate: contract.riskGate || contract.reuseRule || '',
      observed: false,
      ready: false,
      partial: false,
      conditional: false,
      blocked: false,
      currentConsumer: 'none',
      consumerMigration: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      runtimeDetail: '',
      stats: {},
      activeBackend: auditSnapshot && auditSnapshot.activeBackend || 'unknown'
    };
  }

  function floorSource(auditSnapshot) {
    var floor = auditSnapshot && auditSnapshot.floor || {};
    var row = makeBaseSource('floor-layer-cache', auditSnapshot);
    var canvasReady = toBool(floor.canvas2dFloorCacheActive);
    var pixiFirstPass = toBool(floor.pixiFloorFirstPassActive);
    var pixiSharedFloor = toBool(floor.pixiUsesSharedFloorLayerCache);
    row.observed = canvasReady || pixiFirstPass || pixiSharedFloor || hasPositive(floor.floorVisibleChunkCount, floor.floorBuiltChunkCountThisFrame, floor.pixiDrawnTiles);
    row.ready = canvasReady || pixiSharedFloor;
    row.partial = !row.ready && pixiFirstPass;
    row.blocked = pixiFirstPass && toBool(floor.pixiFloorBypassesSharedCache);
    row.currentConsumer = pixiSharedFloor ? 'pixi-shared-floor-layer-cache-current' : (canvasReady ? 'canvas2d-legacy-current' : (pixiFirstPass ? 'pixi-first-pass-bypassing-shared-source' : 'none'));
    row.runtimeDetail = listNonEmpty([
      'canvas2dFloorCacheActive=' + !!canvasReady,
      'pixiFloorFirstPassActive=' + !!pixiFirstPass,
      'pixiUsesSharedFloorLayerCache=' + !!pixiSharedFloor,
      'pixiFloorBypassesSharedCache=' + !!floor.pixiFloorBypassesSharedCache,
      'floorVisibleChunkCount=' + toNumber(floor.floorVisibleChunkCount, 0),
      'pixiDrawnTiles=' + toNumber(floor.pixiDrawnTiles, 0)
    ]).join(',');
    row.stats = {
      floorVisibleChunkCount: toNumber(floor.floorVisibleChunkCount, 0),
      floorBuiltChunkCountThisFrame: toNumber(floor.floorBuiltChunkCountThisFrame, 0),
      floorLayerRebuildWallMs: round(floor.floorLayerRebuildWallMs),
      floorLayerBlitWallMs: round(floor.floorLayerBlitWallMs),
      floorCanvasDrawWallMs: round(floor.floorCanvasDrawWallMs),
      pixiDrawnTiles: toNumber(floor.pixiDrawnTiles, 0),
      pixiFloorDrawWallMs: round(floor.pixiFloorDrawWallMs)
    };
    return row;
  }

  function staticWorldSource(auditSnapshot) {
    var stats = auditSnapshot && auditSnapshot.staticWorld || {};
    var row = makeBaseSource('static-world-chunk-cache', auditSnapshot);
    row.observed = toBool(stats.staticWorldChunkCacheActive) || hasPositive(stats.visibleChunkCount, stats.visibleStaticPacketCount, stats.totalStaticRenderables);
    row.ready = row.observed && String(stats.cacheContentType || '') === 'world-face-packets';
    row.currentConsumer = 'shared-upstream-framePlan-source';
    row.runtimeDetail = listNonEmpty([
      'visibleChunks=' + toNumber(stats.visibleChunkCount, 0),
      'reusedChunks=' + toNumber(stats.reusedChunkCountThisFrame, 0),
      'rebuiltChunks=' + toNumber(stats.rebuiltChunkCountThisFrame, 0),
      'visibleStaticPackets=' + toNumber(stats.visibleStaticPacketCount, 0)
    ]).join(',');
    row.stats = {
      visibleChunkCount: toNumber(stats.visibleChunkCount, 0),
      reusedChunkCountThisFrame: toNumber(stats.reusedChunkCountThisFrame, 0),
      rebuiltChunkCountThisFrame: toNumber(stats.rebuiltChunkCountThisFrame, 0),
      visibleStaticPacketCount: toNumber(stats.visibleStaticPacketCount, 0),
      staticCacheBuildMs: round(stats.staticCacheBuildMs)
    };
    return row;
  }

  function staticRunSource(auditSnapshot) {
    var stats = auditSnapshot && auditSnapshot.staticRun || {};
    var row = makeBaseSource('static-packet-run-cache', auditSnapshot);
    row.observed = toBool(stats.staticPacketRunCacheActive) || hasPositive(stats.staticBitmapRunCount, stats.staticBitmapRunCacheHitCount, stats.staticBitmapRunCacheMissCount);
    row.ready = row.observed;
    row.currentConsumer = row.ready ? 'canvas2d-legacy-current' : 'none';
    row.runtimeDetail = listNonEmpty([
      'runs=' + toNumber(stats.staticBitmapRunCount, 0),
      'hits=' + toNumber(stats.staticBitmapRunCacheHitCount, 0),
      'misses=' + toNumber(stats.staticBitmapRunCacheMissCount, 0),
      'packets=' + toNumber(stats.staticBitmapRunPacketCount, 0)
    ]).join(',');
    row.stats = {
      staticBitmapRunCount: toNumber(stats.staticBitmapRunCount, 0),
      staticBitmapRunPacketCount: toNumber(stats.staticBitmapRunPacketCount, 0),
      staticBitmapRunCacheHitCount: toNumber(stats.staticBitmapRunCacheHitCount, 0),
      staticBitmapRunCacheMissCount: toNumber(stats.staticBitmapRunCacheMissCount, 0),
      staticBitmapRunBuildMs: round(stats.staticBitmapRunBuildMs),
      staticBitmapRunDrawMs: round(stats.staticBitmapRunDrawMs)
    };
    return row;
  }

  function projectedGeometrySource(auditSnapshot) {
    var stats = auditSnapshot && auditSnapshot.geometry || {};
    var row = makeBaseSource('projected-geometry-cache', auditSnapshot);
    row.observed = toBool(stats.projectedGeometryCacheActive) || hasPositive(stats.staticPacketGeometryCacheHitCount, stats.staticPacketGeometryCacheMissCount);
    row.ready = row.observed;
    row.partial = row.ready;
    row.currentConsumer = row.ready ? 'canvas2d-path2d-derived-current' : 'none';
    row.runtimeDetail = listNonEmpty([
      'geometryHits=' + toNumber(stats.staticPacketGeometryCacheHitCount, 0),
      'geometryMisses=' + toNumber(stats.staticPacketGeometryCacheMissCount, 0),
      'overlayHits=' + toNumber(stats.staticPacketOverlayCacheHitCount, 0),
      'overlayMisses=' + toNumber(stats.staticPacketOverlayCacheMissCount, 0)
    ]).join(',');
    row.stats = {
      staticPacketGeometryCacheHitCount: toNumber(stats.staticPacketGeometryCacheHitCount, 0),
      staticPacketGeometryCacheMissCount: toNumber(stats.staticPacketGeometryCacheMissCount, 0),
      staticPacketOverlayCacheHitCount: toNumber(stats.staticPacketOverlayCacheHitCount, 0),
      staticPacketOverlayCacheMissCount: toNumber(stats.staticPacketOverlayCacheMissCount, 0)
    };
    return row;
  }

  function materialColorSource(auditSnapshot) {
    var stats = auditSnapshot && auditSnapshot.materialShadow || {};
    var row = makeBaseSource('material-color-cache', auditSnapshot);
    row.observed = toBool(stats.colorCacheObserved) || hasPositive(stats.colorCacheHitCount, stats.colorCacheMissCount);
    row.ready = row.observed;
    row.currentConsumer = row.ready ? 'shared-packet-material-source' : 'none';
    row.runtimeDetail = 'colorHits=' + toNumber(stats.colorCacheHitCount, 0) + ',colorMisses=' + toNumber(stats.colorCacheMissCount, 0);
    row.stats = {
      colorCacheHitCount: toNumber(stats.colorCacheHitCount, 0),
      colorCacheMissCount: toNumber(stats.colorCacheMissCount, 0),
      step4BuildColorMs: round(stats.step4BuildColorMs)
    };
    return row;
  }

  function shadowOverlaySource(auditSnapshot) {
    var stats = auditSnapshot && auditSnapshot.materialShadow || {};
    var row = makeBaseSource('shadow-overlay-cache', auditSnapshot);
    row.observed = toBool(stats.shadowOverlayCacheObserved) || hasPositive(stats.shadowOverlayTotalCount, stats.shadowOverlayCacheHitCount, stats.shadowOverlayCacheMissCount);
    row.ready = row.observed;
    row.conditional = !row.observed;
    row.currentConsumer = row.ready ? 'canvas2d-shadow-current-when-active' : 'conditional-not-observed';
    row.runtimeDetail = 'shadowTotal=' + toNumber(stats.shadowOverlayTotalCount, 0) + ',shadowHits=' + toNumber(stats.shadowOverlayCacheHitCount, 0) + ',shadowMisses=' + toNumber(stats.shadowOverlayCacheMissCount, 0);
    row.stats = {
      shadowOverlayTotalCount: toNumber(stats.shadowOverlayTotalCount, 0),
      shadowOverlayCacheHitCount: toNumber(stats.shadowOverlayCacheHitCount, 0),
      shadowOverlayCacheMissCount: toNumber(stats.shadowOverlayCacheMissCount, 0)
    };
    return row;
  }

  function visibilitySource(auditSnapshot) {
    var stats = auditSnapshot && auditSnapshot.visibility || {};
    var row = makeBaseSource('visibility-culling-contract', auditSnapshot);
    row.observed = toBool(stats.cameraCullingActive) || hasPositive(stats.renderablesBeforeCulling, stats.renderablesAfterCulling);
    row.ready = row.observed;
    row.currentConsumer = 'shared-upstream-framePlan-source';
    row.runtimeDetail = 'before=' + toNumber(stats.renderablesBeforeCulling, 0) + ',after=' + toNumber(stats.renderablesAfterCulling, 0) + ',culled=' + toNumber(stats.culledByCameraCount, 0);
    row.stats = {
      renderablesBeforeCulling: toNumber(stats.renderablesBeforeCulling, 0),
      renderablesAfterCulling: toNumber(stats.renderablesAfterCulling, 0),
      culledByCameraCount: toNumber(stats.culledByCameraCount, 0),
      visibilityFilterMs: round(stats.visibilityFilterMs)
    };
    return row;
  }

  function occupancySource(auditSnapshot) {
    var stats = auditSnapshot && auditSnapshot.visibility || {};
    var row = makeBaseSource('occupancy-cache-contract', auditSnapshot);
    row.observed = toBool(stats.occupancyCacheActive) || toNumber(stats.occupancyCacheVersion, 0) > 0;
    row.ready = row.observed;
    row.currentConsumer = 'shared-upstream-scene-source';
    row.runtimeDetail = 'occupancyVersion=' + toNumber(stats.occupancyCacheVersion, 0) + ',rebuilt=' + !!stats.occupancyRebuiltThisFrame;
    row.stats = {
      occupancyCacheVersion: toNumber(stats.occupancyCacheVersion, 0),
      occupancyRebuiltThisFrame: !!stats.occupancyRebuiltThisFrame
    };
    return row;
  }

  function fastPathSource(auditSnapshot) {
    var stats = auditSnapshot && auditSnapshot.fastPath || {};
    var row = makeBaseSource('interaction-fast-path-contract', auditSnapshot);
    row.observed = toBool(stats.playerMoveFastPathUsed) || toBool(stats.zoomPreviewFastPathUsed) || String(stats.playerMoveFastPathRejectReasons || '') !== 'unknown';
    row.ready = row.observed;
    row.partial = row.observed && !toBool(stats.zoomPreviewFastPathUsed);
    row.currentConsumer = row.ready ? 'shared-frame-order-or-preview-source-current' : 'not-observed-this-run';
    row.runtimeDetail = 'playerMove=' + !!stats.playerMoveFastPathUsed + ',zoomPreview=' + !!stats.zoomPreviewFastPathUsed + ',reject=' + String(stats.playerMoveFastPathRejectReasons || '');
    row.stats = {
      playerMoveFastPathUsed: !!stats.playerMoveFastPathUsed,
      zoomPreviewFastPathUsed: !!stats.zoomPreviewFastPathUsed,
      zoomPreviewDrawMs: round(stats.zoomPreviewDrawMs)
    };
    return row;
  }

  function performanceSource(auditSnapshot) {
    var row = makeBaseSource('performance-audit-contract', auditSnapshot);
    row.observed = !!auditSnapshot;
    row.ready = !!auditSnapshot;
    row.currentConsumer = 'shared-diagnostics-current';
    row.runtimeDetail = 'auditSnapshot=' + !!auditSnapshot;
    row.stats = { auditSnapshot: !!auditSnapshot };
    return row;
  }

  var BUILDERS = {
    'floor-layer-cache': floorSource,
    'static-world-chunk-cache': staticWorldSource,
    'static-packet-run-cache': staticRunSource,
    'projected-geometry-cache': projectedGeometrySource,
    'material-color-cache': materialColorSource,
    'shadow-overlay-cache': shadowOverlaySource,
    'visibility-culling-contract': visibilitySource,
    'occupancy-cache-contract': occupancySource,
    'interaction-fast-path-contract': fastPathSource,
    'performance-audit-contract': performanceSource
  };

  function buildSharedSourceSnapshot(auditSnapshot, options) {
    options = options || {};
    var sources = SOURCE_IDS.map(function (id) {
      var builder = BUILDERS[id];
      return builder ? builder(auditSnapshot || {}) : makeBaseSource(id, auditSnapshot || {});
    });
    var ready = sources.filter(function (row) { return row.ready === true; });
    var partial = sources.filter(function (row) { return row.partial === true; });
    var observed = sources.filter(function (row) { return row.observed === true; });
    var blocked = sources.filter(function (row) { return row.blocked === true; });
    var missing = sources.filter(function (row) { return row.ready !== true && row.conditional !== true; });
    return {
      owner: OWNER,
      phase: PHASE,
      sharedSourceLayerMode: MODE,
      activeBackend: auditSnapshot && auditSnapshot.activeBackend || 'unknown',
      sourceCount: sources.length,
      observedCount: observed.length,
      readyCount: ready.length,
      partialCount: partial.length,
      conditionalCount: sources.filter(function (row) { return row.conditional === true; }).length,
      missingCount: missing.length,
      blockedCount: blocked.length,
      readySources: ready.map(function (row) { return row.id; }),
      partialSources: partial.map(function (row) { return row.id; }),
      missingSources: missing.map(function (row) { return row.id; }),
      blockedSources: blocked.map(function (row) { return row.id; }),
      sources: sources,
      consumerMigration: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      source: options.source || 'shared-source-layer'
    };
  }

  function getSourceById(snapshot, id) {
    if (!snapshot || !Array.isArray(snapshot.sources)) return null;
    for (var i = 0; i < snapshot.sources.length; i++) {
      if (snapshot.sources[i] && snapshot.sources[i].id === id) return snapshot.sources[i];
    }
    return null;
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    mode: MODE,
    sourceIds: SOURCE_IDS.slice(),
    buildSharedSourceSnapshot: buildSharedSourceSnapshot,
    getSourceById: getSourceById
  };

  try {
    global.__SHARED_RENDER_OPTIMIZATION_SOURCE_LAYER__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.optimization.sharedSourceLayer', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.optimization = global.App.renderer.optimization || {};
      global.App.renderer.optimization.sharedSourceLayer = api;
    }
  } catch (_) {
    global.__SHARED_RENDER_OPTIMIZATION_SOURCE_LAYER__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
