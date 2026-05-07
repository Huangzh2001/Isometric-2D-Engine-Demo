// P12b-4 owner: render diagnostics / debug payload facade.
// Layer: presentation/render/diagnostics.
//
// Owns render.js-facing diagnostics API lookup, build-diagnostics gate
// delegation, frame/cache/zoom diagnostic forwarding, terrain first-frame
// context helpers, and render-function timing buckets. It must remain focused on
// diagnostics/debug payload glue and must not become a generic render utility.
(function registerRenderDiagnosticsFacade(global) {
  function getRenderDiagnosticsApiForRender() {
    try {
      if (typeof global !== 'undefined' && global.App && global.App.renderer && global.App.renderer.renderDiagnostics) {
        return global.App.renderer.renderDiagnostics;
      }
    } catch (_) {}
    try { if (typeof global !== 'undefined' && global.__RENDER_DIAGNOSTICS__) return global.__RENDER_DIAGNOSTICS__; } catch (_) {}
    try { if (typeof global !== 'undefined' && global.IsometricRenderDiagnostics) return global.IsometricRenderDiagnostics; } catch (_) {}
    return null;
  }

  function requireRenderDiagnosticsForRender() {
    var api = getRenderDiagnosticsApiForRender();
    if (!api) throw new Error('Render diagnostics API is not loaded before render diagnostics facade');
    return api;
  }

  function getRenderBuildDiagnosticsGateApiForRender() {
    try {
      if (typeof global !== 'undefined' && global.__APP_PRESENTATION_RENDER_BUILD_DIAGNOSTICS_GATE__) return global.__APP_PRESENTATION_RENDER_BUILD_DIAGNOSTICS_GATE__;
      if (typeof global !== 'undefined' && global.__RENDER_BUILD_DIAGNOSTICS_GATE__) return global.__RENDER_BUILD_DIAGNOSTICS_GATE__;
      if (typeof global !== 'undefined' && global.IsometricRenderBuildDiagnosticsGate) return global.IsometricRenderBuildDiagnosticsGate;
    } catch (_) {}
    try {
      if (typeof globalThis !== 'undefined' && globalThis.__APP_PRESENTATION_RENDER_BUILD_DIAGNOSTICS_GATE__) return globalThis.__APP_PRESENTATION_RENDER_BUILD_DIAGNOSTICS_GATE__;
      if (typeof globalThis !== 'undefined' && globalThis.__RENDER_BUILD_DIAGNOSTICS_GATE__) return globalThis.__RENDER_BUILD_DIAGNOSTICS_GATE__;
      if (typeof globalThis !== 'undefined' && globalThis.IsometricRenderBuildDiagnosticsGate) return globalThis.IsometricRenderBuildDiagnosticsGate;
    } catch (_) {}
    return null;
  }

  function requireRenderBuildDiagnosticsGateForRender() {
    var api = getRenderBuildDiagnosticsGateApiForRender();
    if (!api) throw new Error('render-build-diagnostics-gate.js must load before render diagnostics facade');
    return api;
  }

  function createRenderBuildDiagnosticsGateDepsForRender() {
    return {
      requireRenderDiagnosticsForRender: requireRenderDiagnosticsForRender,
      isDetailedTerrainProfilingEnabledForRender: typeof global.isDetailedTerrainProfilingEnabledForRender === 'function' ? global.isDetailedTerrainProfilingEnabledForRender : isDetailedTerrainProfilingEnabledForRender
    };
  }

  function emitRenderBuildDiagnostic(name, payload) {
    var gate = requireRenderBuildDiagnosticsGateForRender();
    var fn = gate && gate[name];
    if (typeof fn !== 'function') throw new Error('render build diagnostics gate missing ' + name);
    return fn(payload, createRenderBuildDiagnosticsGateDepsForRender());
  }

  function emitStaticWorldChunkSummary(payload) { return requireRenderDiagnosticsForRender().emitStaticWorldChunkSummary(payload); }
  function maybeLogStaticWorldChunkSummary(payload, forceLog) { return requireRenderDiagnosticsForRender().maybeLogStaticWorldChunkSummary(payload, forceLog); }
  function emitChunkRebuildBreakdown(payload) { return emitRenderBuildDiagnostic('emitChunkRebuildBreakdown', payload); }
  function emitChunkRebuildDetail(payload) { return emitRenderBuildDiagnostic('emitChunkRebuildDetail', payload); }
  function emitChunkRebuildScopeVerify(payload) { return emitRenderBuildDiagnostic('emitChunkRebuildScopeVerify', payload); }
  function emitChunkRebuildHotspot(payload) { return emitRenderBuildDiagnostic('emitChunkRebuildHotspot', payload); }
  function emitStaticRenderableBuildDetail(payload) { return emitRenderBuildDiagnostic('emitStaticRenderableBuildDetail', payload); }
  function emitStaticRenderableBuildHotspot(payload) { return emitRenderBuildDiagnostic('emitStaticRenderableBuildHotspot', payload); }
  function emitStaticRenderableBuildScopeVerify(payload) { return emitRenderBuildDiagnostic('emitStaticRenderableBuildScopeVerify', payload); }
  function emitColorBuildDetail(payload) { return emitRenderBuildDiagnostic('emitColorBuildDetail', payload); }
  function emitColorBuildHotspot(payload) { return emitRenderBuildDiagnostic('emitColorBuildHotspot', payload); }
  function emitBuildColorPathVerify(payload) { return emitRenderBuildDiagnostic('emitBuildColorPathVerify', payload); }
  function emitColorBuildMissBreakdown(payload) { return emitRenderBuildDiagnostic('emitColorBuildMissBreakdown', payload); }
  function emitStep4ColorBuildDetail(payload) { return emitRenderBuildDiagnostic('emitStep4ColorBuildDetail', payload); }
  function emitStep4ColorBuildHotspot(payload) { return emitRenderBuildDiagnostic('emitStep4ColorBuildHotspot', payload); }
  function emitStep4ColorBuildScopeVerify(payload) { return emitRenderBuildDiagnostic('emitStep4ColorBuildScopeVerify', payload); }
  function emitLightingShadowBypassVerify(payload) { return emitRenderBuildDiagnostic('emitLightingShadowBypassVerify', payload); }
  function emitStep4ShadowPathSummary(payload) { return emitRenderBuildDiagnostic('emitStep4ShadowPathSummary', payload); }

  function emitRenderFrameSummary(payload) { return requireRenderDiagnosticsForRender().emitRenderFrameSummary(payload); }
  function maybeLogRenderFrameSummary(payload) { return requireRenderDiagnosticsForRender().maybeLogRenderFrameSummary(payload); }
  function shouldForceExactVisibleSummaryForRender(terrainFirstFrameWindow, now) { return requireRenderDiagnosticsForRender().shouldForceExactVisibleSummary(terrainFirstFrameWindow, now); }
  function emitCameraStaticWorldVerify(payload) { return requireRenderDiagnosticsForRender().emitCameraStaticWorldVerify(payload); }
  function maybeLogCameraStaticWorldVerify(payload) { return requireRenderDiagnosticsForRender().maybeLogCameraStaticWorldVerify(payload); }
  function emitCameraMoveVerify(payload) { return requireRenderDiagnosticsForRender().emitCameraMoveVerify(payload); }
  function maybeLogCameraMoveVerify(payload) { return requireRenderDiagnosticsForRender().maybeLogCameraMoveVerify(payload); }
  function emitFrameWorkBreakdown(payload) { return requireRenderDiagnosticsForRender().emitFrameWorkBreakdown(payload); }
  function maybeLogFrameWorkBreakdown(payload) { return requireRenderDiagnosticsForRender().maybeLogFrameWorkBreakdown(payload); }
  function emitZoomStateVerify(payload) { return requireRenderDiagnosticsForRender().emitZoomStateVerify(payload); }
  function maybeLogZoomStateVerify(payload) { return requireRenderDiagnosticsForRender().maybeLogZoomStateVerify(payload); }
  function emitZoomCameraStateVerify(payload) { return requireRenderDiagnosticsForRender().emitZoomCameraStateVerify(payload); }
  function maybeLogZoomCameraStateVerify(payload) { return requireRenderDiagnosticsForRender().maybeLogZoomCameraStateVerify(payload); }
  function emitStaticCacheInvalidationVerify(payload) { return requireRenderDiagnosticsForRender().emitStaticCacheInvalidationVerify(payload); }
  function maybeLogStaticCacheInvalidationVerify(payload) { return requireRenderDiagnosticsForRender().maybeLogStaticCacheInvalidationVerify(payload); }
  function emitStaticBoxCacheProfile(payload) { return requireRenderDiagnosticsForRender().emitStaticBoxCacheProfile(payload); }
  function maybeLogStaticBoxCacheProfile(payload, forceLog) { return requireRenderDiagnosticsForRender().maybeLogStaticBoxCacheProfile(payload, forceLog); }
  function beginRenderFrameDiagnosticState() { return requireRenderDiagnosticsForRender().beginRenderFrameDiagnosticState(); }
  function captureStaticBoxCacheFrameState(payload) { return requireRenderDiagnosticsForRender().captureStaticBoxCacheFrameState(payload); }
  function getCurrentRenderFrameStaticCacheState() { return requireRenderDiagnosticsForRender().getCurrentRenderFrameStaticCacheState(); }
  function emitTerrainFirstFrames(payload) { return requireRenderDiagnosticsForRender().emitTerrainFirstFrames(payload); }

  function isDetailedTerrainProfilingEnabledForRender() {
    var settings = null;
    try {
      if (typeof global.getTerrainRenderSettingsForRender === 'function') settings = global.getTerrainRenderSettingsForRender();
    } catch (_) {}
    return !!(settings && settings.terrainDetailedProfilingEnabled === true);
  }

  function emitTerrainFirstFramesDetail(payload) {
    if (!isDetailedTerrainProfilingEnabledForRender()) return null;
    return requireRenderDiagnosticsForRender().emitTerrainFirstFramesDetail(payload);
  }

  function getTerrainFrameLogContextForRender() {
    var model = null;
    try {
      if (typeof global.getTerrainRuntimeModelForRender === 'function') model = global.getTerrainRuntimeModelForRender();
    } catch (_) {}
    var terrainBatchId = model && model.activeTerrainBatchId ? String(model.activeTerrainBatchId) : null;
    var frameIndex = null;
    var firstFrameWindow = null;
    var lastObservedTerrainBatchId = null;
    try { firstFrameWindow = global.__terrainFirstFrameWindow || null; } catch (_) {}
    try { lastObservedTerrainBatchId = global.__lastObservedTerrainBatchIdForFrames || null; } catch (_) {}
    if (terrainBatchId) {
      if (firstFrameWindow && firstFrameWindow.terrainBatchId === terrainBatchId && Number(firstFrameWindow.remaining || 0) > 0) {
        frameIndex = Number(firstFrameWindow.nextFrameIndex || 1);
      } else if (lastObservedTerrainBatchId !== terrainBatchId) {
        frameIndex = 1;
      }
    }
    return { terrainBatchId: terrainBatchId, frameIndexAfterTerrainApply: frameIndex };
  }

  function ensureRenderFunctionBreakdownBucket() {
    if (typeof global === 'undefined') return null;
    try {
      global.__RENDER_FUNCTION_BREAKDOWN__ = global.__RENDER_FUNCTION_BREAKDOWN__ || { timings: {}, counts: {}, extras: {} };
      return global.__RENDER_FUNCTION_BREAKDOWN__;
    } catch (_) { return null; }
  }

  function recordRenderFunctionTiming(name, ms, extra) {
    var bucket = ensureRenderFunctionBreakdownBucket();
    if (!bucket || !name) return;
    bucket.timings = bucket.timings || {};
    bucket.counts = bucket.counts || {};
    bucket.timings[name] = Number(Number(ms || 0).toFixed(3));
    bucket.counts[name] = Number(bucket.counts[name] || 0) + 1;
    if (extra && typeof extra === 'object') {
      bucket.extras = bucket.extras || {};
      Object.keys(extra).forEach(function (key) {
        var value = extra[key];
        if (value == null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') bucket.extras[key] = value;
      });
    }
  }

  function setLastBaseWorldPassesBreakdown(payload) {
    try { if (typeof global !== 'undefined') global.__LAST_BASEWORLD_PASSES_BREAKDOWN__ = payload || null; } catch (_) {}
  }

  function getLastDrawFloorBreakdown() {
    try { if (typeof global !== 'undefined' && global.__LAST_DRAW_FLOOR_BREAKDOWN__) return global.__LAST_DRAW_FLOOR_BREAKDOWN__; } catch (_) {}
    return null;
  }

  try {
    if (typeof global !== 'undefined') {
      global.__MAIN_RENDER_DIAGNOSTICS__ = Object.assign({}, global.__MAIN_RENDER_DIAGNOSTICS__ || {}, {
        getLastStaticBoxCacheProfile: function () { return requireRenderDiagnosticsForRender().getLastStaticBoxCacheProfile(); }
      });
    }
  } catch (_) {}

  var api = {
    layer: 'presentation/render/diagnostics',
    phase: 'P12b-4',
    getRenderDiagnosticsApiForRender: getRenderDiagnosticsApiForRender,
    requireRenderDiagnosticsForRender: requireRenderDiagnosticsForRender,
    getRenderBuildDiagnosticsGateApiForRender: getRenderBuildDiagnosticsGateApiForRender,
    requireRenderBuildDiagnosticsGateForRender: requireRenderBuildDiagnosticsGateForRender,
    createRenderBuildDiagnosticsGateDepsForRender: createRenderBuildDiagnosticsGateDepsForRender,
    emitRenderBuildDiagnostic: emitRenderBuildDiagnostic,
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
    maybeLogRenderFrameSummary: maybeLogRenderFrameSummary,
    shouldForceExactVisibleSummaryForRender: shouldForceExactVisibleSummaryForRender,
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
    emitTerrainFirstFrames: emitTerrainFirstFrames,
    isDetailedTerrainProfilingEnabledForRender: isDetailedTerrainProfilingEnabledForRender,
    emitTerrainFirstFramesDetail: emitTerrainFirstFramesDetail,
    getTerrainFrameLogContextForRender: getTerrainFrameLogContextForRender,
    ensureRenderFunctionBreakdownBucket: ensureRenderFunctionBreakdownBucket,
    recordRenderFunctionTiming: recordRenderFunctionTiming,
    setLastBaseWorldPassesBreakdown: setLastBaseWorldPassesBreakdown,
    getLastDrawFloorBreakdown: getLastDrawFloorBreakdown
  };

  global.IsometricRenderDiagnosticsFacade = api;
  global.__RENDER_DIAGNOSTICS_FACADE__ = api;
  global.__APP_PRESENTATION_RENDER_DIAGNOSTICS_FACADE__ = api;

  Object.keys(api).forEach(function (key) {
    if (key === 'layer' || key === 'phase') return;
    if (typeof api[key] === 'function') global[key] = api[key];
  });
})(typeof window !== 'undefined' ? window : globalThis);
