(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/presentation/render/renderer/canvas2d-interaction-pipeline-capture.js';
  var PHASE = 'P11c-6';

  var CAPTURE_SUM_KEYS = [
    'runFramePipelineWallMs',
    'activePreRunFramePipelineWallMs',
    'activePostRunFramePipelineWallMs',
    'activeWrapperGlueWallMs',
    'activeDebugHookWallMs',
    'activeDebugHookPreFlushWallMs',
    'activeDebugHookLogFlushWallMs',
    'activeDebugHookProfilerBookkeepingWallMs',
    'activeDebugHookRendererBookkeepingWallMs',
    'activeDebugHookCanvasSyncWallMs',
    'activeDebugHookBrowserSyncWallMs',
    'activeDebugHookPostFlushWallMs',
    'activeDebugHookResidualWallMs',
    'clearAndBackgroundMs',
    'clearAndBackgroundWallMs',
    'baseWorldPassesMs',
    'baseWorldPassesWallMs',
    'baseWorldPassesPreSetupWallMs',
    'baseWorldPassesPreSetupViewRotationWallMs',
    'baseWorldPassesPreSetupScopeWallMs',
    'baseWorldPassesPreSetupVisibleLightsWallMs',
    'baseWorldPassesPreSetupOverrideWallMs',
    'baseWorldPassesPreSetupResidualWallMs',
    'baseWorldPassesFloorLoopWallMs',
    'baseWorldPassesFloorProjectionWallMs',
    'baseWorldPassesFloorColorMaterialWallMs',
    'baseWorldPassesFloorCanvasDrawWallMs',
    'baseWorldPassesPlayerSpritePrepWallMs',
    'baseWorldPassesPostFinalizeWallMs',
    'baseWorldPassesResidualWallMs',
    'floorLayerRebuildWallMs',
    'floorLayerBlitWallMs',
    'buildFramePlanMs',
    'buildFramePlanWallMs',
    'drawRenderableOrderMs',
    'drawRenderableOrderWallMs',
    'drawOverlayPassesMs',
    'drawOverlayPassesWallMs',
    'drawHudPassMs',
    'drawHudPassWallMs',
    'prePassSetupMs',
    'prePassSetupWallMs',
    'postPassFinalizeMs',
    'postPassFinalizeWallMs',
    'adapterGlueMs',
    'debugHookMs',
    'knownAccountedMs',
    'unaccountedMs'
  ];

  var CALL_KEYS = CAPTURE_SUM_KEYS.filter(function (key) { return key !== 'knownAccountedMs'; });

  var RESULT_KEY_MAP = [
    ['runFramePipelineWallMs', 'runFramePipelineWallMs'],
    ['activePreRunFramePipelineWallMs', 'activePreRunFramePipelineWallMs'],
    ['activePostRunFramePipelineWallMs', 'activePostRunFramePipelineWallMs'],
    ['activeWrapperGlueWallMs', 'activeWrapperGlueWallMs'],
    ['activeDebugHookWallMs', 'activeDebugHookWallMs'],
    ['activeDebugHookPreFlushWallMs', 'activeDebugHookPreFlushWallMs'],
    ['activeDebugHookLogFlushWallMs', 'activeDebugHookLogFlushWallMs'],
    ['activeDebugHookProfilerBookkeepingWallMs', 'activeDebugHookProfilerBookkeepingWallMs'],
    ['activeDebugHookRendererBookkeepingWallMs', 'activeDebugHookRendererBookkeepingWallMs'],
    ['activeDebugHookCanvasSyncWallMs', 'activeDebugHookCanvasSyncWallMs'],
    ['activeDebugHookBrowserSyncWallMs', 'activeDebugHookBrowserSyncWallMs'],
    ['activeDebugHookPostFlushWallMs', 'activeDebugHookPostFlushWallMs'],
    ['activeDebugHookResidualWallMs', 'activeDebugHookResidualWallMs'],
    ['pipelineKnownAccountedMs', 'knownAccountedMs'],
    ['pipelineUnaccountedMs', 'unaccountedMs'],
    ['pipelineClearAndBackgroundMs', 'clearAndBackgroundMs'],
    ['pipelineClearAndBackgroundWallMs', 'clearAndBackgroundWallMs'],
    ['pipelineBaseWorldPassesMs', 'baseWorldPassesMs'],
    ['pipelineBaseWorldPassesWallMs', 'baseWorldPassesWallMs'],
    ['baseWorldPassesWallMs', 'baseWorldPassesWallMs'],
    ['baseWorldPassesPreSetupWallMs', 'baseWorldPassesPreSetupWallMs'],
    ['baseWorldPassesPreSetupViewRotationWallMs', 'baseWorldPassesPreSetupViewRotationWallMs'],
    ['baseWorldPassesPreSetupScopeWallMs', 'baseWorldPassesPreSetupScopeWallMs'],
    ['baseWorldPassesPreSetupVisibleLightsWallMs', 'baseWorldPassesPreSetupVisibleLightsWallMs'],
    ['baseWorldPassesPreSetupOverrideWallMs', 'baseWorldPassesPreSetupOverrideWallMs'],
    ['baseWorldPassesPreSetupResidualWallMs', 'baseWorldPassesPreSetupResidualWallMs'],
    ['baseWorldPassesFloorLoopWallMs', 'baseWorldPassesFloorLoopWallMs'],
    ['baseWorldPassesFloorProjectionWallMs', 'baseWorldPassesFloorProjectionWallMs'],
    ['baseWorldPassesFloorColorMaterialWallMs', 'baseWorldPassesFloorColorMaterialWallMs'],
    ['baseWorldPassesFloorCanvasDrawWallMs', 'baseWorldPassesFloorCanvasDrawWallMs'],
    ['baseWorldPassesPlayerSpritePrepWallMs', 'baseWorldPassesPlayerSpritePrepWallMs'],
    ['baseWorldPassesPostFinalizeWallMs', 'baseWorldPassesPostFinalizeWallMs'],
    ['baseWorldPassesResidualWallMs', 'baseWorldPassesResidualWallMs'],
    ['floorLayerRebuildWallMs', 'floorLayerRebuildWallMs'],
    ['floorLayerBlitWallMs', 'floorLayerBlitWallMs'],
    ['pipelineBuildFramePlanMs', 'buildFramePlanMs'],
    ['pipelineBuildFramePlanWallMs', 'buildFramePlanWallMs'],
    ['pipelineDrawRenderableOrderMs', 'drawRenderableOrderMs'],
    ['pipelineDrawRenderableOrderWallMs', 'drawRenderableOrderWallMs'],
    ['pipelineDrawOverlayPassesMs', 'drawOverlayPassesMs'],
    ['pipelineDrawOverlayPassesWallMs', 'drawOverlayPassesWallMs'],
    ['pipelineDrawHudPassMs', 'drawHudPassMs'],
    ['pipelineDrawHudPassWallMs', 'drawHudPassWallMs'],
    ['pipelinePrePassSetupMs', 'prePassSetupMs'],
    ['pipelinePrePassSetupWallMs', 'prePassSetupWallMs'],
    ['pipelinePostPassFinalizeMs', 'postPassFinalizeMs'],
    ['pipelinePostPassFinalizeWallMs', 'postPassFinalizeWallMs'],
    ['pipelineAdapterGlueMs', 'adapterGlueMs'],
    ['pipelineDebugHookMs', 'debugHookMs']
  ];

  function safeFixed(deps, value) {
    if (deps && typeof deps.safeFixed === 'function') return deps.safeFixed(value);
    var n = Number(value || 0);
    return Number(n.toFixed ? n.toFixed(3) : n);
  }

  function resetInteractionPipelineCapture(adapterApi, meta) {
    if (!adapterApi) throw new Error('Missing Canvas2D adapter API for interaction pipeline capture');
    var capture = {
      active: !!(meta && meta.active),
      interactionId: meta && meta.interactionId || null,
      interactionType: meta && meta.interactionType || null,
      frameIndex: Number(meta && meta.frameIndex || 0),
      callCount: 0,
      accumulatedMs: 0,
      maxSingleCallMs: 0,
      floorLayerReusedDuringInteractionCount: 0,
      baseWorldActualBranch: null,
      calls: []
    };
    for (var i = 0; i < CAPTURE_SUM_KEYS.length; i += 1) capture[CAPTURE_SUM_KEYS[i]] = 0;
    adapterApi.__interactionPipelineCapture = capture;
    return capture;
  }

  function recordInteractionPipelineCall(adapterApi, pipelineBreakdown) {
    var capture = adapterApi && adapterApi.__interactionPipelineCapture;
    if (!capture || !capture.active || !pipelineBreakdown) return;
    capture.callCount += 1;
    var totalMs = Number(pipelineBreakdown.totalPipelineMs || 0);
    capture.accumulatedMs += totalMs;
    capture.maxSingleCallMs = Math.max(capture.maxSingleCallMs || 0, totalMs);
    for (var i = 0; i < CAPTURE_SUM_KEYS.length; i += 1) {
      var key = CAPTURE_SUM_KEYS[i];
      capture[key] += Number(pipelineBreakdown[key] || 0);
    }
    capture.floorLayerReusedDuringInteractionCount += pipelineBreakdown.floorLayerReusedDuringInteraction ? 1 : 0;
    if (pipelineBreakdown.baseWorldActualBranch) capture.baseWorldActualBranch = String(pipelineBreakdown.baseWorldActualBranch);
    if (capture.calls.length < 5) {
      var callEntry = {
        callIndex: capture.callCount,
        totalMs: totalMs,
        floorLayerReusedDuringInteraction: !!pipelineBreakdown.floorLayerReusedDuringInteraction,
        baseWorldActualBranch: pipelineBreakdown.baseWorldActualBranch || null
      };
      for (var j = 0; j < CALL_KEYS.length; j += 1) callEntry[CALL_KEYS[j]] = Number(pipelineBreakdown[CALL_KEYS[j]] || 0);
      capture.calls.push(callEntry);
    }
  }

  function consumeInteractionPipelineCapture(adapterApi, deps) {
    var capture = adapterApi && adapterApi.__interactionPipelineCapture;
    if (!capture || !capture.active) return null;
    var result = {
      interactionId: capture.interactionId,
      interactionType: capture.interactionType,
      frameIndex: Number(capture.frameIndex || 0),
      renderPipelineCallCount: Number(capture.callCount || 0),
      renderPipelineAccumulatedMs: safeFixed(deps, capture.accumulatedMs || 0),
      renderPipelineMaxSingleCallMs: safeFixed(deps, capture.maxSingleCallMs || 0),
      floorLayerReusedDuringInteractionCount: Number(capture.floorLayerReusedDuringInteractionCount || 0),
      baseWorldActualBranch: capture.baseWorldActualBranch || null,
      calls: capture.calls.slice(0)
    };
    for (var i = 0; i < RESULT_KEY_MAP.length; i += 1) {
      result[RESULT_KEY_MAP[i][0]] = safeFixed(deps, capture[RESULT_KEY_MAP[i][1]] || 0);
    }
    resetInteractionPipelineCapture(adapterApi, { active: false });
    return result;
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    resetInteractionPipelineCapture: resetInteractionPipelineCapture,
    recordInteractionPipelineCall: recordInteractionPipelineCall,
    consumeInteractionPipelineCapture: consumeInteractionPipelineCapture
  };

  window.__CANVAS2D_INTERACTION_PIPELINE_CAPTURE__ = api;
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.canvas2dInteractionPipelineCapture', api, { owner: OWNER, phase: PHASE });
      window.__APP_NAMESPACE.bind('renderer.diagnostics.canvas2dInteractionPipelineCapture', { owner: OWNER, phase: PHASE }, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
})();
