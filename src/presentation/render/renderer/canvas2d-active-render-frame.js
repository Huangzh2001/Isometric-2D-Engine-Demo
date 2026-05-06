(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/presentation/render/renderer/canvas2d-active-render-frame.js';
  var PHASE = 'P11c-8';

  function nowMs(deps) {
    if (deps && typeof deps.now === 'function') return deps.now();
    try { if (window.performance && typeof window.performance.now === 'function') return window.performance.now(); } catch (_) {}
    return Date.now();
  }

  function safeFixed(deps, value) {
    if (deps && typeof deps.safeFixed === 'function') return deps.safeFixed(value);
    var n = Number(value || 0);
    return Number(n.toFixed ? n.toFixed(3) : n);
  }

  function call(deps, name) {
    if (deps && typeof deps[name] === 'function') return deps[name].apply(null, Array.prototype.slice.call(arguments, 2));
    return undefined;
  }

  function arrayValue(value) {
    return Array.isArray(value) ? value : [];
  }

  function updateInteractionCapture(adapterApi, breakdown) {
    if (!adapterApi) return;
    var capture = adapterApi.__interactionPipelineCapture;
    if (!capture || !capture.active) return;
    capture.activePreRunFramePipelineWallMs += Number(breakdown.activePreRunFramePipelineWallMs || 0);
    capture.activePostRunFramePipelineWallMs += Number(breakdown.activePostRunFramePipelineWallMs || 0);
    capture.activeWrapperGlueWallMs += Number(breakdown.activeWrapperGlueWallMs || 0);
    capture.activeDebugHookWallMs += Number(breakdown.activeDebugHookWallMs || 0);
    capture.activeDebugHookPreFlushWallMs += Number(breakdown.activeDebugHookPreFlushWallMs || 0);
    capture.activeDebugHookLogFlushWallMs += Number(breakdown.activeDebugHookLogFlushWallMs || 0);
    capture.activeDebugHookProfilerBookkeepingWallMs += Number(breakdown.activeDebugHookProfilerBookkeepingWallMs || 0);
    capture.activeDebugHookRendererBookkeepingWallMs += Number(breakdown.activeDebugHookRendererBookkeepingWallMs || 0);
    capture.activeDebugHookCanvasSyncWallMs += Number(breakdown.activeDebugHookCanvasSyncWallMs || 0);
    capture.activeDebugHookBrowserSyncWallMs += Number(breakdown.activeDebugHookBrowserSyncWallMs || 0);
    capture.activeDebugHookPostFlushWallMs += Number(breakdown.activeDebugHookPostFlushWallMs || 0);
    capture.activeDebugHookResidualWallMs += Number(breakdown.activeDebugHookResidualWallMs || 0);
    if (capture.calls && capture.calls.length > 0) {
      var lastCall = capture.calls[capture.calls.length - 1];
      if (lastCall && Number(lastCall.callIndex || 0) === Number(capture.callCount || 0)) {
        lastCall.activePreRunFramePipelineWallMs = Number(breakdown.activePreRunFramePipelineWallMs || 0);
        lastCall.activePostRunFramePipelineWallMs = Number(breakdown.activePostRunFramePipelineWallMs || 0);
        lastCall.activeWrapperGlueWallMs = Number(breakdown.activeWrapperGlueWallMs || 0);
        lastCall.activeDebugHookWallMs = Number(breakdown.activeDebugHookWallMs || 0);
        lastCall.activeDebugHookPreFlushWallMs = Number(breakdown.activeDebugHookPreFlushWallMs || 0);
        lastCall.activeDebugHookLogFlushWallMs = Number(breakdown.activeDebugHookLogFlushWallMs || 0);
        lastCall.activeDebugHookProfilerBookkeepingWallMs = Number(breakdown.activeDebugHookProfilerBookkeepingWallMs || 0);
        lastCall.activeDebugHookRendererBookkeepingWallMs = Number(breakdown.activeDebugHookRendererBookkeepingWallMs || 0);
        lastCall.activeDebugHookCanvasSyncWallMs = Number(breakdown.activeDebugHookCanvasSyncWallMs || 0);
        lastCall.activeDebugHookBrowserSyncWallMs = Number(breakdown.activeDebugHookBrowserSyncWallMs || 0);
        lastCall.activeDebugHookPostFlushWallMs = Number(breakdown.activeDebugHookPostFlushWallMs || 0);
        lastCall.activeDebugHookResidualWallMs = Number(breakdown.activeDebugHookResidualWallMs || 0);
      }
    }
  }

  function buildActiveBreakdown(deps, values) {
    return {
      source: 'renderer.canvas2d:renderFrame',
      rendererActiveCallWallMs: safeFixed(deps, values.rendererActiveCallWallMs),
      runFramePipelineWallMs: safeFixed(deps, values.runFramePipelineWallMs),
      activePreRunFramePipelineWallMs: safeFixed(deps, values.activePreRunFramePipelineWallMs),
      activePostRunFramePipelineWallMs: safeFixed(deps, values.activePostRunFramePipelineWallMs),
      activeWrapperGlueWallMs: safeFixed(deps, values.activeWrapperGlueWallMs),
      activeDebugHookWallMs: safeFixed(deps, values.activeDebugHookWallMs),
      activeDebugHookPreFlushWallMs: safeFixed(deps, values.activeDebugHookPreFlushWallMs),
      activeDebugHookLogFlushWallMs: safeFixed(deps, values.activeDebugHookLogFlushWallMs),
      activeDebugHookProfilerBookkeepingWallMs: safeFixed(deps, values.activeDebugHookProfilerBookkeepingWallMs),
      activeDebugHookRendererBookkeepingWallMs: safeFixed(deps, values.activeDebugHookRendererBookkeepingWallMs),
      activeDebugHookCanvasSyncWallMs: safeFixed(deps, values.activeDebugHookCanvasSyncWallMs),
      activeDebugHookBrowserSyncWallMs: safeFixed(deps, values.activeDebugHookBrowserSyncWallMs),
      activeDebugHookPostFlushWallMs: safeFixed(deps, values.activeDebugHookPostFlushWallMs),
      activeDebugHookResidualWallMs: safeFixed(deps, values.activeDebugHookResidualWallMs)
    };
  }

  function renderFrame(adapterApi, deps, meta) {
    meta = meta || {};
    var activeCallStartAt = nowMs(deps);
    var activeDebugHookWallMs = 0;
    var activeDebugHookPreFlushWallMs = 0;
    var activeDebugHookLogFlushWallMs = 0;
    var activeDebugHookProfilerBookkeepingWallMs = 0;
    var activeDebugHookRendererBookkeepingWallMs = 0;
    var activeDebugHookCanvasSyncWallMs = 0;
    var activeDebugHookBrowserSyncWallMs = 0;
    var activeDebugHookPostFlushWallMs = 0;
    var activeDebugHookResidualWallMs = 0;
    var activePreRunFramePipelineWallMs = 0;
    var activePostRunFramePipelineWallMs = 0;
    var activeWrapperGlueWallMs = 0;
    var runFramePipelineWallMs = 0;
    var preMeasureStartAt = activeCallStartAt;
    var postMeasureStartAt = 0;
    var passApi = call(deps, 'resolvePassApi');
    var renderablesApi = call(deps, 'resolveRenderablesApi');
    if (!passApi) throw new Error('renderer.passApi missing for canvas2d renderer');
    if (adapterApi) adapterApi.__inRenderFrame = true;
    try {
      call(deps, 'setPhase', 'render', 'start');
      var debugState = call(deps, 'getDebugState') || {};
      var verboseLog = !!call(deps, 'getVerboseLog');
      var beginDebug = deps && typeof deps.beginRenderFrameDebug === 'function' ? deps.beginRenderFrameDebug : null;
      if (beginDebug) {
        var __activeDebugStartAt = nowMs(deps);
        var __activeDebugPreAt = __activeDebugStartAt;
        var __activeDebugPayloadStartAt = nowMs(deps);
        var canvas = call(deps, 'getCanvas') || { width: 0, height: 0 };
        var boxes = arrayValue(call(deps, 'getBoxes'));
        var lights = arrayValue(call(deps, 'getLights'));
        var __debugPayload = {
          canvasCss: { w: call(deps, 'getViewWidth'), h: call(deps, 'getViewHeight') },
          backing: { w: canvas.width, h: canvas.height },
          boxes: boxes.length,
          lights: lights.length,
          assetsReady: !!call(deps, 'getAssetsReady'),
          source: meta.source || 'unknown'
        };
        var __activeDebugPayloadEndAt = nowMs(deps);
        activeDebugHookPreFlushWallMs += Math.max(0, __activeDebugPayloadEndAt - __activeDebugPreAt);
        var __activeDebugFlushStartAt = __activeDebugPayloadEndAt;
        beginDebug('renderer.canvas2d:renderFrame', __debugPayload);
        var __activeDebugFlushEndAt = nowMs(deps);
        activeDebugHookLogFlushWallMs += Math.max(0, __activeDebugFlushEndAt - __activeDebugFlushStartAt);
        var __activeDebugProfilerStartAt = __activeDebugFlushEndAt;
        if (adapterApi && adapterApi.__interactionPipelineCapture && adapterApi.__interactionPipelineCapture.active) {
          adapterApi.__lastActiveDebugInteractionMeta = {
            interactionId: adapterApi.__interactionPipelineCapture.interactionId || null,
            interactionType: adapterApi.__interactionPipelineCapture.interactionType || null,
            frameIndex: Number(adapterApi.__interactionPipelineCapture.frameIndex || 0)
          };
        }
        var __activeDebugProfilerEndAt = nowMs(deps);
        activeDebugHookProfilerBookkeepingWallMs += Math.max(0, __activeDebugProfilerEndAt - __activeDebugProfilerStartAt);
        var __activeDebugRendererBookkeepingStartAt = __activeDebugProfilerEndAt;
        if (adapterApi) adapterApi.__lastActiveDebugPhase = 'beginRenderFrameDebug';
        var __activeDebugRendererBookkeepingEndAt = nowMs(deps);
        activeDebugHookRendererBookkeepingWallMs += Math.max(0, __activeDebugRendererBookkeepingEndAt - __activeDebugRendererBookkeepingStartAt);
        var __activeDebugCanvasSyncStartAt = __activeDebugRendererBookkeepingEndAt;
        var __activeDebugCanvasSyncEndAt = nowMs(deps);
        activeDebugHookCanvasSyncWallMs += Math.max(0, __activeDebugCanvasSyncEndAt - __activeDebugCanvasSyncStartAt);
        var __activeDebugBrowserSyncStartAt = __activeDebugCanvasSyncEndAt;
        var __activeDebugBrowserSyncEndAt = nowMs(deps);
        activeDebugHookBrowserSyncWallMs += Math.max(0, __activeDebugBrowserSyncEndAt - __activeDebugBrowserSyncStartAt);
        var __activeDebugPostFlushStartAt = __activeDebugBrowserSyncEndAt;
        var __activeDebugPostFlushEndAt = nowMs(deps);
        activeDebugHookPostFlushWallMs += Math.max(0, __activeDebugPostFlushEndAt - __activeDebugPostFlushStartAt);
        activeDebugHookWallMs += Math.max(0, nowMs(deps) - __activeDebugStartAt);
        var __activeDebugKnown = activeDebugHookPreFlushWallMs + activeDebugHookLogFlushWallMs + activeDebugHookProfilerBookkeepingWallMs + activeDebugHookRendererBookkeepingWallMs + activeDebugHookCanvasSyncWallMs + activeDebugHookBrowserSyncWallMs + activeDebugHookPostFlushWallMs;
        activeDebugHookResidualWallMs += Math.max(0, activeDebugHookWallMs - __activeDebugKnown);
      }
      if (Number(debugState.frame || 0) < 5 || verboseLog) {
        var canvasForLog = call(deps, 'getCanvas') || { width: 0, height: 0 };
        call(deps, 'detailLog', 'renderer-adapter:start frame=' + Number(debugState.frame || 0) + ' source=' + String(meta.source || 'unknown') + ' canvasCss=' + call(deps, 'getViewWidth') + 'x' + call(deps, 'getViewHeight') + ' backing=' + canvasForLog.width + 'x' + canvasForLog.height);
      }
      var __beforeRunPipelineAt = nowMs(deps);
      activePreRunFramePipelineWallMs = Math.max(0, __beforeRunPipelineAt - preMeasureStartAt - activeDebugHookWallMs);
      var __runFramePipelineStartAt = __beforeRunPipelineAt;
      var framePlan = call(deps, 'runFramePipeline', passApi, renderablesApi);
      var __afterRunPipelineAt = nowMs(deps);
      runFramePipelineWallMs = Math.max(0, __afterRunPipelineAt - __runFramePipelineStartAt);
      postMeasureStartAt = __afterRunPipelineAt;
      debugState.renderStep = 'done';
      if (Number(debugState.frame || 0) < 5 || verboseLog) {
        var renderableCount = framePlan && framePlan.order ? framePlan.order.length : 0;
        call(deps, 'detailLog', 'renderer-adapter:done frame=' + Number(debugState.frame || 0) + ' renderables=' + renderableCount);
      }
      return framePlan;
    } finally {
      var __activeCallEndAt = nowMs(deps);
      if (postMeasureStartAt > 0) activePostRunFramePipelineWallMs = Math.max(0, __activeCallEndAt - postMeasureStartAt);
      var rendererActiveCallWallMs = Math.max(0, __activeCallEndAt - activeCallStartAt);
      activeWrapperGlueWallMs = Math.max(0, rendererActiveCallWallMs - runFramePipelineWallMs - activePreRunFramePipelineWallMs - activePostRunFramePipelineWallMs - activeDebugHookWallMs);
      var numericBreakdown = {
        rendererActiveCallWallMs: rendererActiveCallWallMs,
        runFramePipelineWallMs: runFramePipelineWallMs,
        activePreRunFramePipelineWallMs: activePreRunFramePipelineWallMs,
        activePostRunFramePipelineWallMs: activePostRunFramePipelineWallMs,
        activeWrapperGlueWallMs: activeWrapperGlueWallMs,
        activeDebugHookWallMs: activeDebugHookWallMs,
        activeDebugHookPreFlushWallMs: activeDebugHookPreFlushWallMs,
        activeDebugHookLogFlushWallMs: activeDebugHookLogFlushWallMs,
        activeDebugHookProfilerBookkeepingWallMs: activeDebugHookProfilerBookkeepingWallMs,
        activeDebugHookRendererBookkeepingWallMs: activeDebugHookRendererBookkeepingWallMs,
        activeDebugHookCanvasSyncWallMs: activeDebugHookCanvasSyncWallMs,
        activeDebugHookBrowserSyncWallMs: activeDebugHookBrowserSyncWallMs,
        activeDebugHookPostFlushWallMs: activeDebugHookPostFlushWallMs,
        activeDebugHookResidualWallMs: activeDebugHookResidualWallMs
      };
      if (adapterApi) adapterApi.__lastActiveBreakdown = buildActiveBreakdown(deps, numericBreakdown);
      updateInteractionCapture(adapterApi, numericBreakdown);
      if (adapterApi) adapterApi.__inRenderFrame = false;
    }
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    renderFrame: renderFrame,
    buildActiveBreakdown: buildActiveBreakdown,
    updateInteractionCapture: updateInteractionCapture
  };

  window.__CANVAS2D_ACTIVE_RENDER_FRAME__ = api;
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.canvas2dActiveRenderFrame', api, { owner: OWNER, phase: PHASE });
      window.__APP_NAMESPACE.bind('renderer.diagnostics.canvas2dActiveRenderFrame', { owner: OWNER, phase: PHASE }, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
  if (window.App) {
    window.App.renderer = window.App.renderer || {};
    window.App.renderer.canvas2dActiveRenderFrame = api;
    window.App.renderer.diagnostics = window.App.renderer.diagnostics || {};
    window.App.renderer.diagnostics.canvas2dActiveRenderFrame = { owner: OWNER, phase: PHASE };
  }
})();
