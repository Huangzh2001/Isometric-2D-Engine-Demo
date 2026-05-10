// PXM-07.6A: Runtime optimization audit diagnostics for PixiJS migration.
// Layer: presentation/render/diagnostics.
//
// This module only records which existing render optimizations are actually
// used on the current runtime path. It does not render, sort, pick, mutate
// world data, or abstract caches yet. The output is intended to guide later
// renderer-neutral optimization contracts shared by Canvas2D and PixiJS.
(function registerPixiMigrationOptimizationAuditDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-optimization-audit-diagnostics.js';
  var STEP = 'PXM-07.6A';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var PHASE = 'runtime-optimization-audit-logs';

  var state = {
    started: false,
    lastFramePlan: null,
    lastMainStats: null,
    lastRenderVisibilityStats: null,
    lastPipeline: null,
    lastDrawLoop: null,
    lastPixiFloor: null,
    lastSummarySignature: '',
    lastSummaryAt: 0,
    lastSectionSignature: Object.create(null)
  };

  function nowMs() {
    try { if (global.performance && typeof global.performance.now === 'function') return global.performance.now(); } catch (_) {}
    return Date.now();
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function toBool(value) { return value === true; }

  function round(value) {
    var n = toNumber(value, 0);
    return Number(n.toFixed ? n.toFixed(3) : n);
  }

  function stringifyValue(value) {
    if (value == null) return String(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    if (Array.isArray(value)) return value.slice(0, 12).join(',') || 'none';
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }

  function formatPayload(payload) {
    if (!payload || typeof payload !== 'object') return '';
    return Object.keys(payload).map(function (key) {
      return String(key) + '=' + stringifyValue(payload[key]);
    }).join(' ');
  }

  function emit(section, payload) {
    var line = PREFIX + '[' + String(section || 'event') + ']';
    var extra = formatPayload(payload);
    if (extra) line += ' ' + extra;
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
    return line;
  }

  function getBackendSnapshot() {
    try {
      var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      if (selection && typeof selection.getSnapshot === 'function') return selection.getSnapshot() || {};
    } catch (_) {}
    return {};
  }

  function detectActiveBackend() {
    var snapshot = getBackendSnapshot();
    if (snapshot.activeBackend) return String(snapshot.activeBackend);
    try {
      var api = global.App && global.App.renderer && global.App.renderer.active;
      if (api && api.backend) return String(api.backend);
      return api ? 'registered-unknown' : 'missing';
    } catch (_) {}
    return 'unknown';
  }

  function clonePlain(value) {
    if (!value || typeof value !== 'object') return null;
    try { return JSON.parse(JSON.stringify(value)); } catch (_) {}
    var out = {};
    Object.keys(value).forEach(function (key) {
      var item = value[key];
      if (item == null || typeof item === 'number' || typeof item === 'string' || typeof item === 'boolean') out[key] = item;
    });
    return out;
  }

  function maybeEmitStart(reason) {
    if (state.started) return;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: PHASE,
      modifiesRendering: false,
      abstractsCaches: false,
      source: reason || 'module-load'
    });
  }

  function shouldEmit(section, signature, intervalMs) {
    var key = String(section || 'event');
    try {
      var throttle = global.__PIXI_MIGRATION_DIAGNOSTICS_THROTTLE__ || null;
      if (throttle && typeof throttle.shouldEmit === 'function') {
        if (!throttle.shouldEmit({
          step: STEP,
          section: section,
          bucket: key,
          signature: String(signature || ''),
          intervalMs: Number(intervalMs || 1500)
        })) return false;
      }
    } catch (_) {}
    var current = nowMs();
    var last = state.lastSectionSignature[key] || { signature: '', at: 0 };
    if (last.signature === signature && (current - Number(last.at || 0)) < Number(intervalMs || 1500)) return false;
    state.lastSectionSignature[key] = { signature: signature, at: current };
    return true;
  }

  function getMainStats() { return state.lastMainStats || {}; }
  function getPipeline() { return state.lastPipeline || {}; }
  function getDrawLoop() { return state.lastDrawLoop || {}; }
  function getPixiFloor() { return state.lastPixiFloor || {}; }

  function hasPositive() {
    for (var i = 0; i < arguments.length; i++) if (toNumber(arguments[i], 0) > 0) return true;
    return false;
  }

  function getFloorAudit() {
    var pipeline = getPipeline();
    var pixiFloor = getPixiFloor();
    var active = detectActiveBackend();
    var branch = String(pipeline.baseWorldActualBranch || '');
    var canvas2dFloorCacheActive = branch.indexOf('floor-layer-cache') >= 0 || hasPositive(
      pipeline.floorLayerRebuildWallMs,
      pipeline.floorLayerBlitWallMs,
      pipeline.baseWorldPassesFloorCanvasDrawWallMs,
      pipeline.floorVisibleChunkCount
    );
    var pixiFloorActive = active === 'pixi' && (pixiFloor.ok === true || toNumber(pixiFloor.drawnTiles, 0) > 0 || pixiFloor.usesSharedFloorLayerCache === true);
    var pixiSharedFloorActive = active === 'pixi' && pixiFloor.usesSharedFloorLayerCache === true;
    var delegatedToPixi = branch.indexOf('pixi-floor') >= 0 || pixiFloorActive === true || pipeline.pixiFloorDelegated === true;
    return {
      activeBackend: active,
      canvas2dFloorCacheActive: canvas2dFloorCacheActive,
      pixiFloorFirstPassActive: pixiFloorActive && !pixiSharedFloorActive,
      pixiUsesSharedFloorLayerCache: pixiSharedFloorActive,
      floorDelegatedToPixi: delegatedToPixi,
      pixiFloorBypassesSharedCache: pixiFloorActive === true && pixiSharedFloorActive !== true && canvas2dFloorCacheActive !== true,
      baseWorldActualBranch: branch || 'unknown',
      floorLayerReusedDuringInteraction: toBool(pipeline.floorLayerReusedDuringInteraction),
      floorVisibleChunkCount: toNumber(pipeline.floorVisibleChunkCount, 0),
      floorBuiltChunkCountThisFrame: toNumber(pipeline.floorBuiltChunkCountThisFrame, 0),
      floorMissingChunkCountBefore: toNumber(pipeline.floorMissingChunkCountBefore, 0),
      floorMissingChunkCountAfter: toNumber(pipeline.floorMissingChunkCountAfter, 0),
      floorBuiltTileCountThisFrame: toNumber(pipeline.floorBuiltTileCountThisFrame, 0),
      floorLayerRebuildWallMs: round(pipeline.floorLayerRebuildWallMs),
      floorLayerBlitWallMs: round(pipeline.floorLayerBlitWallMs),
      floorCanvasDrawWallMs: round(pipeline.baseWorldPassesFloorCanvasDrawWallMs),
      pixiVisibleTiles: toNumber(pixiFloor.visibleTiles, 0),
      pixiDrawnTiles: toNumber(pixiFloor.drawnTiles, 0),
      pixiFloorDrawWallMs: round(pixiFloor.drawWallMs),
      pixiFloorTextureUpdatedOnDirty: pixiFloor.textureUpdatedOnDirty === true,
      pixiFloorSpriteReusedOnStableFrame: pixiFloor.spriteReusedOnStableFrame === true,
      pixiFloorStableTextureVersion: String(pixiFloor.stableFloorTextureVersion || pixiFloor.floorCacheVersion || ''),
      pixiFloorSharedSurfaceRevision: toNumber(pixiFloor.sharedSurfaceRevision, 0),
      pixiFloorTextureSignatureStable: pixiFloor.textureSignatureStable === true,
      pixiFloorTextureUpdateReason: String(pixiFloor.textureUpdateReason || '')
    };
  }

  function getStaticWorldAudit() {
    var stats = getMainStats();
    var active = hasPositive(stats.visibleChunkCount, stats.visibleStaticChunkCount, stats.totalChunkCount, stats.totalStaticRenderables)
      || String(stats.cacheContentType || '') === 'world-face-packets';
    return {
      staticWorldChunkCacheActive: active,
      cacheContentType: String(stats.cacheContentType || 'unknown'),
      cameraIndependent: stats.cameraIndependent !== false,
      usesScreenSpaceCache: stats.usesScreenSpaceCache === true,
      visibleChunkCount: toNumber(stats.visibleChunkCount || stats.visibleStaticChunkCount, 0),
      rebuiltChunkCountThisFrame: toNumber(stats.rebuiltChunkCountThisFrame, 0),
      reusedChunkCountThisFrame: toNumber(stats.reusedChunkCountThisFrame, 0),
      dirtyChunkCount: toNumber(stats.dirtyChunkCount, 0),
      remainingDirtyChunkCount: toNumber(stats.remainingDirtyChunkCount, 0),
      totalChunkCount: toNumber(stats.totalChunkCount, 0),
      chunkSize: toNumber(stats.chunkSize, 0),
      visibleStaticPacketCount: toNumber(stats.visibleStaticPacketCount, 0),
      totalStaticRenderables: toNumber(stats.totalStaticRenderables, 0),
      staticCacheRebuiltThisFrame: toBool(stats.staticCacheRebuiltThisFrame),
      staticCacheBuildMs: round(stats.staticCacheBuildMs),
      staticBuildMs: round(stats.staticBuildMs),
      packetMergeMs: round(stats.staticPacketMergeMs || stats.packetMergeMs),
      mergeReductionRatio: round(stats.mergeReductionRatio),
      hiddenInternalSurfaceSkippedCount: toNumber(stats.hiddenInternalSurfaceSkippedCount, 0),
      surfaceOnlyRenderingEnabled: stats.surfaceOnlyRenderingEnabled !== false
    };
  }

  function getStaticRunAudit() {
    var loop = getDrawLoop();
    var active = hasPositive(loop.staticBitmapRunCount, loop.staticBitmapRunCacheHitCount, loop.staticBitmapRunCacheMissCount);
    return {
      staticPacketRunCacheActive: active,
      staticBitmapRunCount: toNumber(loop.staticBitmapRunCount, 0),
      staticBitmapRunPacketCount: toNumber(loop.staticBitmapRunPacketCount, 0),
      staticBitmapRunCacheHitCount: toNumber(loop.staticBitmapRunCacheHitCount, 0),
      staticBitmapRunCacheMissCount: toNumber(loop.staticBitmapRunCacheMissCount, 0),
      staticBitmapRunBuildMs: round(loop.staticBitmapRunBuildMs),
      staticBitmapRunDrawMs: round(loop.staticBitmapRunDrawMs),
      staticBitmapRunGeometryMs: round(loop.staticBitmapRunGeometryMs),
      staticBitmapRunInteractionReuseCount: toNumber(loop.staticBitmapRunInteractionReuseCount, 0),
      staticPacketCount: toNumber(loop.staticPacketCount, 0),
      dynamicRenderableCount: toNumber(loop.dynamicRenderableCount, 0),
      drawRenderableOrderMs: round(loop.drawRenderableOrderMs)
    };
  }

  function getGeometryAudit() {
    var loop = getDrawLoop();
    var geometryHits = toNumber(loop.staticPacketGeometryCacheHitCount, 0);
    var geometryMisses = toNumber(loop.staticPacketGeometryCacheMissCount, 0);
    var overlayHits = toNumber(loop.staticPacketOverlayCacheHitCount, 0);
    var overlayMisses = toNumber(loop.staticPacketOverlayCacheMissCount, 0);
    return {
      projectedGeometryCacheActive: hasPositive(geometryHits, geometryMisses),
      staticPacketGeometryCacheHitCount: geometryHits,
      staticPacketGeometryCacheMissCount: geometryMisses,
      staticPacketOverlayProjectionCacheActive: hasPositive(overlayHits, overlayMisses),
      staticPacketOverlayCacheHitCount: overlayHits,
      staticPacketOverlayCacheMissCount: overlayMisses
    };
  }

  function getMaterialShadowAudit() {
    var stats = getMainStats();
    return {
      colorCacheObserved: hasPositive(stats.colorCacheHitCount, stats.colorCacheMissCount),
      colorCacheEnabled: stats.colorCacheEnabled === true || hasPositive(stats.colorCacheHitCount, stats.colorCacheMissCount),
      colorCacheHitCount: toNumber(stats.colorCacheHitCount, 0),
      colorCacheMissCount: toNumber(stats.colorCacheMissCount, 0),
      shadowOverlayCacheObserved: hasPositive(stats.shadowOverlayCacheHitCount, stats.shadowOverlayCacheMissCount, stats.shadowOverlayTotalCount),
      shadowOverlayCacheHitCount: toNumber(stats.shadowOverlayCacheHitCount, 0),
      shadowOverlayCacheMissCount: toNumber(stats.shadowOverlayCacheMissCount, 0),
      shadowOverlayTotalCount: toNumber(stats.shadowOverlayTotalCount, 0),
      step4BuildColorMs: round(stats.step4_buildColorMs || stats.step4BuildColorMs),
      step4ShadowOverlayTotalMs: round(stats.step4d_shadowOverlayTotalMs)
    };
  }

  function getVisibilityAudit() {
    var stats = getMainStats();
    return {
      cameraCullingActive: stats.cameraCullingEnabled !== false,
      renderablesBeforeCulling: toNumber(stats.renderablesBeforeCulling, 0),
      renderablesAfterCulling: toNumber(stats.renderablesAfterCulling, 0),
      culledByCameraCount: Math.max(0, toNumber(stats.renderablesBeforeCulling, 0) - toNumber(stats.renderablesAfterCulling, 0)),
      objectsBeforeCulling: toNumber(stats.objectsBeforeCulling, 0),
      objectsAfterCulling: toNumber(stats.objectsAfterCulling, 0),
      lightSourcesBeforeCulling: toNumber(stats.lightSourcesBeforeCulling, 0),
      lightSourcesAfterCulling: toNumber(stats.lightSourcesAfterCulling, 0),
      visibleDynamicInstances: toNumber(stats.visibleDynamicInstances || stats.dynamicLoopInstanceCount, 0),
      occupancyCacheActive: toNumber(stats.occupancyCacheVersion, 0) > 0,
      occupancyCacheVersion: toNumber(stats.occupancyCacheVersion, 0),
      occupancyRebuiltThisFrame: toBool(stats.occupancyRebuiltThisFrame),
      renderSourceBuildMs: round(stats.renderSourceBuildMs),
      visibilityFilterMs: round(stats.visibilityFilterMs)
    };
  }

  function getFastPathAudit() {
    var frame = state.lastFramePlan || {};
    var stats = getMainStats();
    var pipeline = getPipeline();
    return {
      playerMoveFastPathUsed: frame.playerMoveFastPathUsed === true || stats.playerMoveFastPathUsed === true,
      playerMoveFastPathCandidateEligible: stats.playerMoveFastPathCandidateEligible === true,
      playerMoveFastPathRejectReasons: Array.isArray(stats.playerMoveFastPathRejectReasons) ? stats.playerMoveFastPathRejectReasons.slice(0, 8).join(',') : 'unknown',
      zoomPreviewFastPathUsed: pipeline.zoomPreviewFastPathUsed === true,
      zoomPreviewDrawMs: round(pipeline.zoomPreviewDrawMs),
      zoomInteractionActive: stats.zoomInteractionActive === true,
      zoomSettlePending: stats.zoomSettlePending === true,
      stableDemergeCacheHit: stats.stableDemergeCacheHit === true,
      stableDemergeCacheHitCount: toNumber(stats.stableDemergeCacheHitCount, 0),
      stableDemergeCacheMissCount: toNumber(stats.stableDemergeCacheMissCount, 0)
    };
  }

  function emitAuditSections(reason) {
    maybeEmitStart(reason || 'audit');
    var floor = getFloorAudit();
    var staticWorld = getStaticWorldAudit();
    var run = getStaticRunAudit();
    var geometry = getGeometryAudit();
    var materialShadow = getMaterialShadowAudit();
    var visibility = getVisibilityAudit();
    var fastPath = getFastPathAudit();

    var summary = {
      activeBackend: detectActiveBackend(),
      floorCacheActive: floor.canvas2dFloorCacheActive || floor.pixiFloorFirstPassActive,
      canvas2dFloorCacheActive: floor.canvas2dFloorCacheActive,
      pixiFloorBypassesSharedCache: floor.pixiFloorBypassesSharedCache,
      staticWorldChunkCacheActive: staticWorld.staticWorldChunkCacheActive,
      staticPacketRunCacheActive: run.staticPacketRunCacheActive,
      projectedGeometryCacheActive: geometry.projectedGeometryCacheActive,
      colorCacheObserved: materialShadow.colorCacheObserved,
      shadowOverlayCacheObserved: materialShadow.shadowOverlayCacheObserved,
      cameraCullingActive: visibility.cameraCullingActive,
      occupancyCacheActive: visibility.occupancyCacheActive,
      playerMoveFastPathUsed: fastPath.playerMoveFastPathUsed,
      zoomPreviewFastPathUsed: fastPath.zoomPreviewFastPathUsed,
      ok: true,
      source: reason || 'audit'
    };
    // PXM-07.8D: use a coarse, state-oriented signature. Cache hit counters
    // and build timings can legitimately change frame-to-frame and should not
    // force full migration-audit logs during player movement.
    var summarySignature = [summary.activeBackend, summary.canvas2dFloorCacheActive ? 1 : 0, summary.pixiFloorBypassesSharedCache ? 1 : 0, summary.staticWorldChunkCacheActive ? 1 : 0, summary.staticPacketRunCacheActive ? 1 : 0, summary.projectedGeometryCacheActive ? 1 : 0, summary.colorCacheObserved ? 1 : 0, summary.shadowOverlayCacheObserved ? 1 : 0, visibility.renderablesAfterCulling, fastPath.playerMoveFastPathUsed ? 1 : 0, fastPath.zoomPreviewFastPathUsed ? 1 : 0].join('|');
    var current = nowMs();
    if (summarySignature === state.lastSummarySignature && (current - Number(state.lastSummaryAt || 0)) < 5000) return;
    if (!shouldEmit('summary', summarySignature, 5000)) return;
    state.lastSummarySignature = summarySignature;
    state.lastSummaryAt = current;

    if (shouldEmit('floor-cache', [floor.activeBackend, floor.canvas2dFloorCacheActive ? 1 : 0, floor.pixiFloorFirstPassActive ? 1 : 0, floor.pixiUsesSharedFloorLayerCache ? 1 : 0, floor.pixiFloorTextureUpdatedOnDirty ? 1 : 0, floor.pixiFloorSpriteReusedOnStableFrame ? 1 : 0].join('|'), 5000)) emit('floor-cache', floor);
    if (shouldEmit('static-world-cache', [staticWorld.staticWorldChunkCacheActive ? 1 : 0, staticWorld.visibleChunkCount, staticWorld.dirtyChunkCount, staticWorld.visibleStaticPacketCount].join('|'), 5000)) emit('static-world-cache', staticWorld);
    if (shouldEmit('static-run-cache', [run.staticPacketRunCacheActive ? 1 : 0, run.staticBitmapRunCount, run.staticPacketCount, run.dynamicRenderableCount].join('|'), 5000)) emit('static-run-cache', run);
    if (shouldEmit('geometry-cache', [geometry.projectedGeometryCacheActive ? 1 : 0].join('|'), 5000)) emit('geometry-cache', geometry);
    if (shouldEmit('material-shadow-cache', [materialShadow.colorCacheObserved ? 1 : 0, materialShadow.shadowOverlayCacheObserved ? 1 : 0].join('|'), 5000)) emit('material-shadow-cache', materialShadow);
    if (shouldEmit('visibility-culling', [visibility.cameraCullingActive ? 1 : 0, visibility.renderablesAfterCulling, visibility.occupancyCacheActive ? 1 : 0, visibility.occupancyRebuiltThisFrame ? 1 : 0].join('|'), 5000)) emit('visibility-culling', visibility);
    if (shouldEmit('fast-path', [fastPath.playerMoveFastPathUsed ? 1 : 0, fastPath.zoomPreviewFastPathUsed ? 1 : 0, fastPath.zoomInteractionActive ? 1 : 0, fastPath.zoomSettlePending ? 1 : 0].join('|'), 5000)) emit('fast-path', fastPath);
    summary.diagnosticsThrottle = 'light';
    emit('summary', summary);
    try {
      var auditSnapshot = getLastAuditSnapshot();
      var contractDiagnostics = global.__PIXI_MIGRATION_SHARED_OPTIMIZATION_CONTRACT_DIAGNOSTICS__ || null;
      if (contractDiagnostics && typeof contractDiagnostics.noteOptimizationAuditSnapshot === 'function') {
        contractDiagnostics.noteOptimizationAuditSnapshot(auditSnapshot, {
          source: reason || 'optimization-audit-summary'
        });
      }
      var sourceLayerDiagnostics = global.__PIXI_MIGRATION_SHARED_OPTIMIZATION_SOURCE_LAYER_DIAGNOSTICS__ || null;
      if (sourceLayerDiagnostics && typeof sourceLayerDiagnostics.noteOptimizationAuditSnapshot === 'function') {
        sourceLayerDiagnostics.noteOptimizationAuditSnapshot(auditSnapshot, {
          source: reason || 'optimization-audit-summary'
        });
      }
    } catch (_) {}
  }

  function noteFramePlan(framePlan, meta) {
    state.lastFramePlan = framePlan || null;
    meta = meta || {};
    if (meta.mainStats) state.lastMainStats = clonePlain(meta.mainStats) || meta.mainStats;
    if (meta.renderVisibilityStats) state.lastRenderVisibilityStats = clonePlain(meta.renderVisibilityStats) || meta.renderVisibilityStats;
    emitAuditSections(meta.source || 'frame-plan');
  }

  function noteCanvas2dPipeline(pipelineBreakdown, meta) {
    state.lastPipeline = clonePlain(pipelineBreakdown) || pipelineBreakdown || null;
    emitAuditSections(meta && meta.source || 'canvas2d-pipeline');
  }

  function noteDrawLoopBreakdown(loopBreakdown, meta) {
    state.lastDrawLoop = clonePlain(loopBreakdown) || loopBreakdown || null;
    emitAuditSections(meta && meta.source || 'draw-loop-breakdown');
  }

  function notePixiFloorSummary(floorSummary, meta) {
    state.lastPixiFloor = clonePlain(floorSummary) || floorSummary || null;
    emitAuditSections(meta && meta.source || 'pixi-floor-summary');
  }

  function getLastAuditSnapshot() {
    return {
      owner: OWNER,
      step: STEP,
      phase: PHASE,
      activeBackend: detectActiveBackend(),
      floor: getFloorAudit(),
      staticWorld: getStaticWorldAudit(),
      staticRun: getStaticRunAudit(),
      geometry: getGeometryAudit(),
      materialShadow: getMaterialShadowAudit(),
      visibility: getVisibilityAudit(),
      fastPath: getFastPathAudit()
    };
  }

  var api = {
    owner: OWNER,
    step: STEP,
    phase: PHASE,
    noteFramePlan: noteFramePlan,
    noteCanvas2dPipeline: noteCanvas2dPipeline,
    noteDrawLoopBreakdown: noteDrawLoopBreakdown,
    notePixiFloorSummary: notePixiFloorSummary,
    emitAuditSections: emitAuditSections,
    getLastAuditSnapshot: getLastAuditSnapshot
  };

  try {
    global.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationOptimizationAudit', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.diagnostics = global.App.renderer.diagnostics || {};
      global.App.renderer.diagnostics.pixiMigrationOptimizationAudit = api;
    }
  } catch (_) {
    global.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__ = api;
  }

  maybeEmitStart('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
