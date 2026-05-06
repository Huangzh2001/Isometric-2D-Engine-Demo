// P8e: Render diagnostics and profiling log helpers.
// Layer: presentation/render/diagnostics.
//
// Owns throttled render diagnostic state and structured diagnostic log emitters.
// This file must not own Canvas drawing, renderable assembly, domain geometry,
// scene storage, or application workflow. Runtime hooks such as pushLog are
// intentionally resolved only at emit time so the existing non-module script
// loading model remains compatible.
(function registerRenderDiagnostics(global) {
  var lastRenderFrameSummaryLogAt = 0;
  var lastRenderFrameSummarySignature = '';
  var lastStaticBoxCacheProfileLogAt = 0;
  var lastStaticBoxCacheProfileSignature = '';
  var lastStaticBoxCacheProfile = null;
  var lastStaticCacheInvalidationVerifyLogAt = 0;
  var lastStaticCacheInvalidationVerifySignature = '';
  var currentRenderFrameStaticCacheState = { rebuilt: false, buildMs: 0, cacheHit: null, invalidationReason: 'none', totalMs: 0, profile: null };
  var lastStaticWorldChunkLogAt = 0;
  var lastStaticWorldChunkLogSignature = '';
  var lastCameraStaticWorldVerifySignature = '';
  var lastCameraMoveVerifyLogAt = 0;
  var lastCameraMoveVerifySignature = '';
  var lastFrameWorkBreakdownLogAt = 0;
  var lastFrameWorkBreakdownSignature = '';
  var lastZoomStateVerifyLogAt = 0;
  var lastZoomStateVerifySignature = '';

  function perfNow() {
    try {
      if (global && global.performance && typeof global.performance.now === 'function') return global.performance.now();
    } catch (_) {}
    return Date.now();
  }

  function emitLine(tag, payload) {
    var line = '[' + String(tag || 'RENDER-DIAGNOSTIC') + '] ';
    try { line += JSON.stringify(payload || {}); } catch (_) { line += '{}'; }
    try {
      if (global && typeof global.pushLog === 'function') global.pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function safePayload(payload) {
    return payload && typeof payload === 'object' ? payload : {};
  }

  function emitStaticWorldChunkSummary(payload) { return emitLine('STATIC-WORLD-CHUNK', payload); }

  function maybeLogStaticWorldChunkSummary(payload, forceLog) {
    var safe = safePayload(payload);
    var now = perfNow();
    var signature = [
      String(safe.cacheContentType || 'world-face-packets'),
      safe.cameraIndependent === false ? 0 : 1,
      safe.usesScreenSpaceCache === true ? 1 : 0,
      Number(safe.totalChunkCount || 0),
      Number(safe.dirtyChunkCount || 0),
      Number(safe.visibleChunkCount || 0),
      Number(safe.rebuiltChunkCountThisFrame || 0),
      Number(safe.reusedChunkCountThisFrame || 0),
      Number(safe.chunkSize || 0),
      Number(safe.totalStaticBoxes || 0),
      Number(safe.totalStaticRenderables || 0)
    ].join('|');
    if (!forceLog && (now - lastStaticWorldChunkLogAt) < 1000 && signature === lastStaticWorldChunkLogSignature) return false;
    lastStaticWorldChunkLogAt = now;
    lastStaticWorldChunkLogSignature = signature;
    emitStaticWorldChunkSummary(safe);
    return true;
  }

  function emitChunkRebuildBreakdown(payload) { return emitLine('CHUNK-REBUILD-BREAKDOWN', payload); }
  function emitChunkRebuildDetail(payload) { return emitLine('CHUNK-REBUILD-DETAIL', payload); }
  function emitChunkRebuildScopeVerify(payload) { return emitLine('CHUNK-REBUILD-SCOPE-VERIFY', payload); }
  function emitChunkRebuildHotspot(payload) { return emitLine('CHUNK-REBUILD-HOTSPOT', payload); }
  function emitStaticRenderableBuildDetail(payload) { return emitLine('STATIC-RENDERABLE-BUILD-DETAIL', payload); }
  function emitStaticRenderableBuildHotspot(payload) { return emitLine('STATIC-RENDERABLE-BUILD-HOTSPOT', payload); }
  function emitStaticRenderableBuildScopeVerify(payload) { return emitLine('STATIC-RENDERABLE-BUILD-SCOPE-VERIFY', payload); }
  function emitColorBuildDetail(payload) { return emitLine('COLOR-BUILD-DETAIL', payload); }
  function emitColorBuildHotspot(payload) { return emitLine('COLOR-BUILD-HOTSPOT', payload); }
  function emitBuildColorPathVerify(payload) { return emitLine('BUILD-COLOR-PATH-VERIFY', payload); }
  function emitColorBuildMissBreakdown(payload) { return emitLine('COLOR-BUILD-MISS-BREAKDOWN', payload); }
  function emitStep4ColorBuildDetail(payload) { return emitLine('STEP4-COLOR-BUILD-DETAIL', payload); }
  function emitStep4ColorBuildHotspot(payload) { return emitLine('STEP4-COLOR-BUILD-HOTSPOT', payload); }
  function emitStep4ColorBuildScopeVerify(payload) { return emitLine('STEP4-COLOR-BUILD-SCOPE-VERIFY', payload); }
  function emitLightingShadowBypassVerify(payload) { return emitLine('LIGHTING-SHADOW-BYPASS-VERIFY', payload); }
  function emitStep4ShadowPathSummary(payload) { return emitLine('STEP4-SHADOW-PATH-SUMMARY', payload); }

  function emitRenderFrameSummary(payload) { return emitLine('RENDER-FRAME-SUMMARY', payload); }

  function shouldForceExactVisibleSummary(terrainFirstFrameWindow, now) {
    var current = Number(now != null ? now : perfNow());
    var terrainRemaining = terrainFirstFrameWindow && Number(terrainFirstFrameWindow.remaining || 0) > 0;
    return terrainRemaining || (current - Number(lastRenderFrameSummaryLogAt || 0)) >= 1000;
  }

  function maybeLogRenderFrameSummary(payload) {
    var safe = safePayload(payload);
    var now = perfNow();
    var signature = [
      Number(safe.cameraX || 0).toFixed(3),
      Number(safe.cameraY || 0).toFixed(3),
      Number(safe.zoom || 0).toFixed(3),
      Number(safe.visibleInstances || 0),
      Number(safe.visibleDynamicInstances || 0),
      Number(safe.staticSkippedByDynamicLoop || 0),
      Number(safe.totalBoxes || 0),
      Number(safe.occupancyCacheVersion || 0),
      safe.occupancyRebuiltThisFrame === true ? 1 : 0,
      safe.staticCacheRebuiltThisFrame === true ? 1 : 0,
      Number(safe.visibleChunkCount || 0),
      Number(safe.rebuiltChunkCountThisFrame || 0)
    ].join('|');
    if ((now - lastRenderFrameSummaryLogAt) < 1000) return false;
    if (signature === lastRenderFrameSummarySignature && (now - lastRenderFrameSummaryLogAt) < 5000) return false;
    lastRenderFrameSummaryLogAt = now;
    lastRenderFrameSummarySignature = signature;
    emitRenderFrameSummary(safe);
    return true;
  }

  function emitCameraStaticWorldVerify(payload) { return emitLine('CAMERA-STATIC-WORLD-VERIFY', payload); }

  function maybeLogCameraStaticWorldVerify(payload) {
    var safe = safePayload(payload);
    var signature = [
      Number(safe.cameraX || 0).toFixed(3),
      Number(safe.cameraY || 0).toFixed(3),
      Number(safe.zoom || 0).toFixed(3),
      Number(safe.visibleChunkCount || 0),
      Number(safe.rebuiltChunkCountThisFrame || 0),
      Number(safe.reusedChunkCountThisFrame || 0),
      safe.staticCacheRebuiltThisFrame === true ? 1 : 0,
      safe.usesScreenSpaceCache === true ? 1 : 0
    ].join('|');
    if (signature === lastCameraStaticWorldVerifySignature) return false;
    lastCameraStaticWorldVerifySignature = signature;
    emitCameraStaticWorldVerify(safe);
    return true;
  }

  function emitCameraMoveVerify(payload) { return emitLine('CAMERA-MOVE-VERIFY', payload); }

  function maybeLogCameraMoveVerify(payload) {
    var safe = safePayload(payload);
    var now = perfNow();
    var signature = [
      Number(safe.cameraX || 0).toFixed(3),
      Number(safe.cameraY || 0).toFixed(3),
      Number(safe.zoom || 0).toFixed(3),
      Number(safe.visibleChunkCount || 0),
      safe.staticCacheRebuiltThisFrame === true ? 1 : 0,
      Number(safe.rebuiltChunkCountThisFrame || 0),
      Number(safe.reusedChunkCountThisFrame || 0)
    ].join('|');
    var slowFrame = Number(safe.frameBuildMs || 0) > 24 || safe.staticCacheRebuiltThisFrame === true || Number(safe.rebuiltChunkCountThisFrame || 0) > 0;
    var minGapMs = slowFrame ? 750 : 1500;
    if ((now - (lastCameraMoveVerifyLogAt || 0)) < minGapMs) return false;
    if (!slowFrame && signature === (lastCameraMoveVerifySignature || '') && (now - (lastCameraMoveVerifyLogAt || 0)) < 5000) return false;
    lastCameraMoveVerifyLogAt = now;
    lastCameraMoveVerifySignature = signature;
    emitCameraMoveVerify(safe);
    return true;
  }

  function emitFrameWorkBreakdown(payload) { return emitLine('FRAME-WORK-BREAKDOWN', payload); }

  function maybeLogFrameWorkBreakdown(payload) {
    var safe = safePayload(payload);
    var now = perfNow();
    var slowFrame = Number(safe.frameBuildMs || 0) > 24 || Number(safe.finalDrawMs || 0) > 12 || Number(safe.rebuiltChunkCountThisFrame || 0) > 0;
    var minGapMs = slowFrame ? 350 : 1000;
    var signature = [
      Number(safe.cameraX || 0).toFixed(1),
      Number(safe.cameraY || 0).toFixed(1),
      Number(safe.zoom || 0).toFixed(2),
      Number(safe.visibleChunkCount || 0),
      Number(safe.visibleStaticChunkCount || 0),
      Number(safe.visibleStaticPacketCount || 0),
      Number(safe.dynamicObjectCount || 0),
      Number(safe.rebuiltChunkCountThisFrame || 0),
      slowFrame ? 'slow' : 'normal'
    ].join('|');
    if ((now - lastFrameWorkBreakdownLogAt) < minGapMs) return false;
    if (!slowFrame && signature === lastFrameWorkBreakdownSignature && (now - lastFrameWorkBreakdownLogAt) < 3000) return false;
    lastFrameWorkBreakdownLogAt = now;
    lastFrameWorkBreakdownSignature = signature;
    emitFrameWorkBreakdown(safe);
    return true;
  }

  function emitZoomStateVerify(payload) { return emitLine('ZOOM-STATE-VERIFY', payload); }

  function maybeLogZoomStateVerify(payload) {
    var safe = safePayload(payload);
    var now = perfNow();
    var signature = [
      Number(safe.uiDisplayScale || 0).toFixed(3),
      Number(safe.tileScale || 0).toFixed(3),
      Number(safe.runtimeZoom || 0).toFixed(3),
      Number(safe.renderSummaryZoom || 0).toFixed(3),
      Number(safe.frameBreakdownZoom || 0).toFixed(3),
      Number(safe.cullingZoom || 0).toFixed(3),
      Number(safe.projectionZoom || 0).toFixed(3),
      safe.isUnified === true ? 1 : 0
    ].join('|');
    if ((now - lastZoomStateVerifyLogAt) < 1000 && signature === lastZoomStateVerifySignature) return false;
    lastZoomStateVerifyLogAt = now;
    lastZoomStateVerifySignature = signature;
    emitZoomStateVerify(safe);
    return true;
  }

  function emitZoomCameraStateVerify(payload) { return emitLine('ZOOM-CAMERA-STATE-VERIFY', payload); }

  function maybeLogZoomCameraStateVerify(payload) {
    var safe = safePayload(payload);
    var now = perfNow();
    var signature = [
      String(safe.sourceOfTruth || ''),
      Number(safe.runtimeZoom || 0).toFixed(3),
      Number(safe.summaryZoom || 0).toFixed(3),
      Number(safe.breakdownZoom || 0).toFixed(3),
      Number(safe.runtimeCameraX || 0).toFixed(3),
      Number(safe.runtimeCameraY || 0).toFixed(3),
      Number(safe.summaryCameraX || 0).toFixed(3),
      Number(safe.summaryCameraY || 0).toFixed(3),
      Number(safe.breakdownCameraX || 0).toFixed(3),
      Number(safe.breakdownCameraY || 0).toFixed(3),
      Number(safe.cullingZoom || 0).toFixed(3),
      Number(safe.projectionZoom || 0).toFixed(3),
      safe.isUnified === true ? 1 : 0
    ].join('|');
    if ((now - lastZoomStateVerifyLogAt) < 1000 && signature === (lastZoomStateVerifySignature + '|camera')) return false;
    emitZoomCameraStateVerify(safe);
    return true;
  }

  function emitStaticCacheInvalidationVerify(payload) { return emitLine('STATIC-CACHE-INVALIDATION-VERIFY', payload); }

  function maybeLogStaticCacheInvalidationVerify(payload) {
    var safe = safePayload(payload);
    var now = perfNow();
    var shouldInvalidate = safe.shouldInvalidateStaticCache === true || String(safe.invalidationReason || 'none') !== 'none';
    var signature = [
      String(safe.invalidationReason || 'none'),
      String(safe.cacheContentType || ''),
      safe.cameraIndependent !== false ? 1 : 0,
      safe.usesScreenSpaceCache === true ? 1 : 0,
      shouldInvalidate ? 1 : 0
    ].join('|');
    var minGapMs = shouldInvalidate ? 250 : 1500;
    if ((now - lastStaticCacheInvalidationVerifyLogAt) < minGapMs) return false;
    if (!shouldInvalidate && signature === lastStaticCacheInvalidationVerifySignature && (now - lastStaticCacheInvalidationVerifyLogAt) < 5000) return false;
    lastStaticCacheInvalidationVerifyLogAt = now;
    lastStaticCacheInvalidationVerifySignature = signature;
    emitStaticCacheInvalidationVerify(safe);
    return true;
  }

  function emitStaticBoxCacheProfile(payload) { return emitLine('STATIC-BOX-CACHE-PROFILE', payload); }

  function maybeLogStaticBoxCacheProfile(payload, forceLog) {
    var safe = safePayload(payload);
    var now = perfNow();
    var signature = [
      safe.cacheHit === true ? 1 : 0,
      String(safe.invalidationReason || 'none'),
      Number(safe.totalBoxes || 0),
      Number(safe.structuredBoxCount || 0),
      Number(safe.scopedBoxCount || 0),
      Number(safe.visibleChunkCount || 0),
      Number(safe.rebuiltChunkCountThisFrame || 0),
      Number(safe.reusedChunkCountThisFrame || 0)
    ].join('|');
    if (!forceLog && safe.cacheHit === true && (now - lastStaticBoxCacheProfileLogAt) < 1000) return false;
    if (!forceLog && safe.cacheHit === true && signature === lastStaticBoxCacheProfileSignature && (now - lastStaticBoxCacheProfileLogAt) < 5000) return false;
    lastStaticBoxCacheProfileLogAt = now;
    lastStaticBoxCacheProfileSignature = signature;
    emitStaticBoxCacheProfile(safe);
    return true;
  }

  function beginRenderFrameDiagnosticState() {
    currentRenderFrameStaticCacheState = { rebuilt: false, buildMs: 0, cacheHit: null, invalidationReason: 'none', totalMs: 0, profile: null };
    return currentRenderFrameStaticCacheState;
  }

  function captureStaticBoxCacheFrameState(payload) {
    var safe = safePayload(payload);
    currentRenderFrameStaticCacheState = {
      rebuilt: safe.rebuilt === true,
      buildMs: Number(safe.buildMs || 0),
      cacheHit: safe.cacheHit === true,
      invalidationReason: String(safe.invalidationReason || 'none'),
      totalMs: Number(safe.totalMs || 0),
      profile: safe.profile || null
    };
    lastStaticBoxCacheProfile = safe.profile || lastStaticBoxCacheProfile;
    return currentRenderFrameStaticCacheState;
  }

  function getCurrentRenderFrameStaticCacheState() {
    return currentRenderFrameStaticCacheState || { rebuilt: false, buildMs: 0, cacheHit: null, invalidationReason: 'none', totalMs: 0, profile: null };
  }

  function getLastStaticBoxCacheProfile() {
    return lastStaticBoxCacheProfile;
  }

  function emitTerrainFirstFrames(payload) { return emitLine('TERRAIN-FIRST-FRAMES', payload); }
  function emitTerrainFirstFramesDetail(payload) { return emitLine('TERRAIN-FIRST-FRAMES-DETAIL', payload); }

  var api = {
    layer: 'presentation/render/diagnostics',
    phase: 'P8e',
    emitStaticWorldChunkSummary: emitStaticWorldChunkSummary,
    maybeLogStaticWorldChunkSummary: maybeLogStaticWorldChunkSummary,
    emitChunkRebuildBreakdown: emitChunkRebuildBreakdown,
    emitChunkRebuildDetail: emitChunkRebuildDetail,
    emitChunkRebuildScopeVerify: emitChunkRebuildScopeVerify,
    emitChunkRebuildHotspot: emitChunkRebuildHotspot,
    emitStaticRenderableBuildDetail: emitStaticRenderableBuildDetail,
    emitStaticRenderableBuildHotspot: emitStaticRenderableBuildHotspot,
    emitStaticRenderableBuildScopeVerify: emitStaticRenderableBuildScopeVerify,
    emitColorBuildDetail: emitColorBuildDetail,
    emitColorBuildHotspot: emitColorBuildHotspot,
    emitBuildColorPathVerify: emitBuildColorPathVerify,
    emitColorBuildMissBreakdown: emitColorBuildMissBreakdown,
    emitStep4ColorBuildDetail: emitStep4ColorBuildDetail,
    emitStep4ColorBuildHotspot: emitStep4ColorBuildHotspot,
    emitStep4ColorBuildScopeVerify: emitStep4ColorBuildScopeVerify,
    emitLightingShadowBypassVerify: emitLightingShadowBypassVerify,
    emitStep4ShadowPathSummary: emitStep4ShadowPathSummary,
    emitRenderFrameSummary: emitRenderFrameSummary,
    shouldForceExactVisibleSummary: shouldForceExactVisibleSummary,
    maybeLogRenderFrameSummary: maybeLogRenderFrameSummary,
    emitCameraStaticWorldVerify: emitCameraStaticWorldVerify,
    maybeLogCameraStaticWorldVerify: maybeLogCameraStaticWorldVerify,
    emitCameraMoveVerify: emitCameraMoveVerify,
    maybeLogCameraMoveVerify: maybeLogCameraMoveVerify,
    emitFrameWorkBreakdown: emitFrameWorkBreakdown,
    maybeLogFrameWorkBreakdown: maybeLogFrameWorkBreakdown,
    emitZoomStateVerify: emitZoomStateVerify,
    maybeLogZoomStateVerify: maybeLogZoomStateVerify,
    emitZoomCameraStateVerify: emitZoomCameraStateVerify,
    maybeLogZoomCameraStateVerify: maybeLogZoomCameraStateVerify,
    emitStaticCacheInvalidationVerify: emitStaticCacheInvalidationVerify,
    maybeLogStaticCacheInvalidationVerify: maybeLogStaticCacheInvalidationVerify,
    emitStaticBoxCacheProfile: emitStaticBoxCacheProfile,
    maybeLogStaticBoxCacheProfile: maybeLogStaticBoxCacheProfile,
    beginRenderFrameDiagnosticState: beginRenderFrameDiagnosticState,
    captureStaticBoxCacheFrameState: captureStaticBoxCacheFrameState,
    getCurrentRenderFrameStaticCacheState: getCurrentRenderFrameStaticCacheState,
    getLastStaticBoxCacheProfile: getLastStaticBoxCacheProfile,
    emitTerrainFirstFrames: emitTerrainFirstFrames,
    emitTerrainFirstFramesDetail: emitTerrainFirstFramesDetail
  };

  global.IsometricRenderDiagnostics = api;
  global.__RENDER_DIAGNOSTICS__ = api;
  global.__APP_PRESENTATION_RENDER_DIAGNOSTICS__ = api;
  try {
    global.__MAIN_RENDER_DIAGNOSTICS__ = Object.assign({}, global.__MAIN_RENDER_DIAGNOSTICS__ || {}, {
      getLastStaticBoxCacheProfile: getLastStaticBoxCacheProfile
    });
  } catch (_) {}
})(typeof window !== 'undefined' ? window : globalThis);
