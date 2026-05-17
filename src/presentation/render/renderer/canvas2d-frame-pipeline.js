(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/presentation/render/renderer/canvas2d-frame-pipeline.js';
  var PHASE = 'P11c-7';

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

  function noteCanvas2dSharedOptimizationUse(id, payload) {
    try {
      var consumer = window.__SHARED_RENDER_OPTIMIZATION_CANVAS2D_SHARED_CONSUMER__ || null;
      if (consumer && typeof consumer.noteConsumerUse === 'function') {
        return consumer.noteConsumerUse(id, Object.assign({
          caller: OWNER,
          activeBackend: 'canvas2d',
          canvas2dConsumerNormalized: true
        }, payload || {}));
      }
    } catch (_) {}
    return null;
  }

  function runFramePipeline(adapterApi, deps, passApi, renderablesApi) {
    var pipelineCallStartAt = nowMs(deps);
    var pipelineStartAt = pipelineCallStartAt;
    call(deps, 'beginFunctionBreakdownFrame');
    var prePassSetupMs = Math.max(0, (nowMs(deps)) - pipelineStartAt);
    var prePassSetupWallMs = prePassSetupMs;
    var clearAndBackgroundMs = 0;
    var clearAndBackgroundWallMs = 0;
    var baseWorldPassesMs = 0;
    var baseWorldPassesWallMs = 0;
    var baseWorldPassesPreSetupWallMs = 0;
    var baseWorldPassesPreSetupViewRotationWallMs = 0;
    var baseWorldPassesPreSetupScopeWallMs = 0;
    var baseWorldPassesPreSetupVisibleLightsWallMs = 0;
    var baseWorldPassesPreSetupOverrideWallMs = 0;
    var baseWorldPassesPreSetupResidualWallMs = 0;
    var baseWorldPassesFloorLoopWallMs = 0;
    var baseWorldPassesFloorProjectionWallMs = 0;
    var baseWorldPassesFloorColorMaterialWallMs = 0;
    var baseWorldPassesFloorCanvasDrawWallMs = 0;
    var baseWorldPassesPlayerSpritePrepWallMs = 0;
    var baseWorldPassesPostFinalizeWallMs = 0;
    var baseWorldPassesResidualWallMs = 0;
    var floorLayerReusedDuringInteraction = false;
    var floorLayerRebuildWallMs = 0;
    var floorLayerBlitWallMs = 0;
    var baseWorldActualBranch = null;
    var buildFramePlanMs = 0;
    var buildFramePlanWallMs = 0;
    var drawRenderableOrderMs = 0;
    var drawRenderableOrderWallMs = 0;
    var drawRenderableOrderInnerLoopMs = 0;
    var pixiStaticWorldBeginFrameWallMs = 0;
    var pixiStaticWorldBeginFrameOk = false;
    var pixiDrawsStaticWorldPackets = false;
    var pixiStaticWorldActualDrawUnitCount = null;
    var pixiStaticWorldFallbackReason = '';
    var drawOverlayPassesMs = 0;
    var drawOverlayPassesWallMs = 0;
    var drawHudPassMs = 0;
    var drawHudPassWallMs = 0;
    var postPassFinalizeMs = 0;
    var postPassFinalizeWallMs = 0;
    var debugHookMs = 0;
    var adapterGlueMs = 0;
    var framePlan = null;
    var zoomPreviewFastPathPayload = call(deps, 'drawZoomPreviewFastPath', { source: 'renderer.canvas2d:runFramePipeline' });
    noteCanvas2dSharedOptimizationUse('interaction-fast-path-contract', {
      stage: 'runFramePipeline.zoomPreviewFastPath',
      canvas2dConsumerPath: 'shared-interaction-fast-path-source-plus-existing-canvas2d-preview-or-frame-pipeline',
      statsSummary: 'zoomPreviewFastPathUsed=' + String(!!zoomPreviewFastPathPayload),
      runtimeDetail: {
        zoomPreviewFastPathUsed: !!zoomPreviewFastPathPayload,
        zoomPreviewDrawMs: Number(zoomPreviewFastPathPayload && zoomPreviewFastPathPayload.drawMs || 0)
      }
    });
    var functionBreakdown = call(deps, 'getFunctionBreakdownFrame');
    if (zoomPreviewFastPathPayload) {
      clearAndBackgroundMs = Number(zoomPreviewFastPathPayload.drawMs || 0);
      clearAndBackgroundWallMs = clearAndBackgroundMs;
      if (functionBreakdown) {
        functionBreakdown.timings['adapter.runFramePipeline.prePassSetup'] = safeFixed(deps, prePassSetupMs);
        functionBreakdown.timings['adapter.runFramePipeline.zoomPreviewFastPath'] = safeFixed(deps, clearAndBackgroundMs);
        functionBreakdown.timings['adapter.runFramePipeline.clearAndPaintMainBackground'] = 0;
        functionBreakdown.extras.zoomPreviewFastPath = true;
      }
      framePlan = {
        id: 'zoom-preview-fastpath',
        signature: 'zoom-preview-fastpath',
        previewFastPath: true,
        currentViewRotation: 0,
        order: [],
        counts: { renderables: 0, instances: 0, boxes: 0, lights: 0, staticRenderableCount: 0, dynamicRenderableCount: 0 }
      };
    } else {
      var t0 = nowMs(deps);
      passApi.clearAndPaintMainBackground();
      clearAndBackgroundWallMs = Math.max(0, (nowMs(deps)) - t0);
      clearAndBackgroundMs = clearAndBackgroundWallMs;
      if (functionBreakdown) {
        functionBreakdown.timings['adapter.runFramePipeline.prePassSetup'] = safeFixed(deps, prePassSetupMs);
        functionBreakdown.timings['adapter.runFramePipeline.clearAndPaintMainBackground'] = safeFixed(deps, clearAndBackgroundMs);
      }
    }
    var runWorldPasses = function () {
      var worldPassStartAt = nowMs(deps);
      passApi.renderBaseWorldPasses();
      baseWorldPassesWallMs = Math.max(0, (nowMs(deps)) - worldPassStartAt);
      baseWorldPassesMs = baseWorldPassesWallMs;
      var baseWorldBreakdown = (passApi && typeof passApi.getLastBaseWorldPassesBreakdown === 'function') ? (passApi.getLastBaseWorldPassesBreakdown() || null) : null;
      if (baseWorldBreakdown) {
        baseWorldPassesWallMs = Number(baseWorldBreakdown.baseWorldPassesWallMs || baseWorldPassesWallMs || 0);
        baseWorldPassesPreSetupWallMs = Number(baseWorldBreakdown.baseWorldPassesPreSetupWallMs || 0);
        baseWorldPassesPreSetupViewRotationWallMs = Number(baseWorldBreakdown.baseWorldPassesPreSetupViewRotationWallMs || 0);
        baseWorldPassesPreSetupScopeWallMs = Number(baseWorldBreakdown.baseWorldPassesPreSetupScopeWallMs || 0);
        baseWorldPassesPreSetupVisibleLightsWallMs = Number(baseWorldBreakdown.baseWorldPassesPreSetupVisibleLightsWallMs || 0);
        baseWorldPassesPreSetupOverrideWallMs = Number(baseWorldBreakdown.baseWorldPassesPreSetupOverrideWallMs || 0);
        baseWorldPassesPreSetupResidualWallMs = Number(baseWorldBreakdown.baseWorldPassesPreSetupResidualWallMs || 0);
        baseWorldPassesFloorLoopWallMs = Number(baseWorldBreakdown.baseWorldPassesFloorLoopWallMs || 0);
        baseWorldPassesFloorProjectionWallMs = Number(baseWorldBreakdown.baseWorldPassesFloorProjectionWallMs || 0);
        baseWorldPassesFloorColorMaterialWallMs = Number(baseWorldBreakdown.baseWorldPassesFloorColorMaterialWallMs || 0);
        baseWorldPassesFloorCanvasDrawWallMs = Number(baseWorldBreakdown.baseWorldPassesFloorCanvasDrawWallMs || 0);
        baseWorldPassesPlayerSpritePrepWallMs = Number(baseWorldBreakdown.baseWorldPassesPlayerSpritePrepWallMs || 0);
        baseWorldPassesPostFinalizeWallMs = Number(baseWorldBreakdown.baseWorldPassesPostFinalizeWallMs || 0);
        baseWorldPassesResidualWallMs = Number(baseWorldBreakdown.baseWorldPassesResidualWallMs || 0);
        floorLayerReusedDuringInteraction = !!baseWorldBreakdown.floorLayerReusedDuringInteraction;
        floorLayerRebuildWallMs = Number(baseWorldBreakdown.floorLayerRebuildWallMs || 0);
        floorLayerBlitWallMs = Number(baseWorldBreakdown.floorLayerBlitWallMs || 0);
        baseWorldActualBranch = baseWorldBreakdown.baseWorldActualBranch ? String(baseWorldBreakdown.baseWorldActualBranch) : null;
      }
      var functionBreakdown = call(deps, 'getFunctionBreakdownFrame');
      if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.renderBaseWorldPasses'] = safeFixed(deps, baseWorldPassesMs);
      var buildPlanStartAt = nowMs(deps);
      framePlan = renderablesApi && typeof renderablesApi.buildFramePlan === 'function'
        ? renderablesApi.buildFramePlan()
        : { order: passApi.buildMainFrameRenderables() };
      buildFramePlanWallMs = Math.max(0, (nowMs(deps)) - buildPlanStartAt);
      buildFramePlanMs = buildFramePlanWallMs;
      if (functionBreakdown) {
        functionBreakdown.timings['adapter.runFramePipeline.buildFramePlan'] = safeFixed(deps, buildFramePlanMs);
        functionBreakdown.extras.framePlanId = framePlan && framePlan.id ? framePlan.id : null;
        functionBreakdown.extras.frameRenderableCount = Number(framePlan && framePlan.order ? framePlan.order.length : 0);
      }
      noteCanvas2dSharedOptimizationUse('visibility-culling-contract', {
        stage: 'runFramePipeline.after-buildFramePlan',
        canvas2dConsumerPath: 'shared-visibility-culling-source-plus-existing-framePlan-order-consumer',
        statsSummary: 'renderableCount=' + String(framePlan && framePlan.order ? framePlan.order.length : 0),
        runtimeDetail: {
          framePlanId: framePlan && framePlan.id || null,
          renderableCount: Number(framePlan && framePlan.order ? framePlan.order.length : 0)
        }
      });
      noteCanvas2dSharedOptimizationUse('occupancy-cache-contract', {
        stage: 'runFramePipeline.after-buildFramePlan',
        canvas2dConsumerPath: 'shared-occupancy-source-plus-existing-static-world-build-consumer',
        statsSummary: 'framePlanId=' + String(framePlan && framePlan.id || 'none'),
        runtimeDetail: { framePlanId: framePlan && framePlan.id || null }
      });
      var drawLoopStartAt = nowMs(deps);
      call(deps, 'drawRenderableOrder', framePlan.order || [], { source: 'renderer.canvas2d:drawRenderableOrder', framePlanId: framePlan.id || null, currentViewRotation: framePlan.currentViewRotation != null ? framePlan.currentViewRotation : 0 });
      drawRenderableOrderWallMs = Math.max(0, (nowMs(deps)) - drawLoopStartAt);
      drawRenderableOrderMs = drawRenderableOrderWallMs;
      try {
        var lastDrawLoopBreakdown = adapterApi && adapterApi.__lastDrawLoopBreakdown ? adapterApi.__lastDrawLoopBreakdown : null;
        if (lastDrawLoopBreakdown) {
          drawRenderableOrderInnerLoopMs = Number(lastDrawLoopBreakdown.drawRenderableOrderMs || 0);
          pixiStaticWorldBeginFrameWallMs = Number(lastDrawLoopBreakdown.pixiStaticWorldBeginFrameWallMs || 0);
          pixiStaticWorldBeginFrameOk = lastDrawLoopBreakdown.pixiStaticWorldBeginFrameOk === true;
          pixiDrawsStaticWorldPackets = lastDrawLoopBreakdown.pixiDrawsStaticWorldPackets === true;
          pixiStaticWorldActualDrawUnitCount = lastDrawLoopBreakdown.pixiStaticWorldActualDrawUnitCount != null ? Number(lastDrawLoopBreakdown.pixiStaticWorldActualDrawUnitCount) : null;
          pixiStaticWorldFallbackReason = lastDrawLoopBreakdown.pixiStaticWorldFallbackReason ? String(lastDrawLoopBreakdown.pixiStaticWorldFallbackReason) : '';
        }
      } catch (_) {}
      try {
        if (window.__PIXI_MIGRATION_CANVAS2D_FRAMEPLAN_CONSUMPTION_DIAGNOSTICS__ && typeof window.__PIXI_MIGRATION_CANVAS2D_FRAMEPLAN_CONSUMPTION_DIAGNOSTICS__.noteCanvas2dFramePlanConsumption === 'function') {
          window.__PIXI_MIGRATION_CANVAS2D_FRAMEPLAN_CONSUMPTION_DIAGNOSTICS__.noteCanvas2dFramePlanConsumption(framePlan, {
            source: 'canvas2d-frame-pipeline',
            stage: 'after-drawRenderableOrder',
            drawRenderableOrderMs: drawRenderableOrderMs
          });
        }
      } catch (_) {}
      if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.drawRenderableOrder'] = safeFixed(deps, drawRenderableOrderMs);
      var overlayStartAt = nowMs(deps);
      call(deps, 'drawOverlayPasses', { source: 'renderer.canvas2d:drawOverlayPasses' });
      drawOverlayPassesWallMs = Math.max(0, (nowMs(deps)) - overlayStartAt);
      drawOverlayPassesMs = drawOverlayPassesWallMs;
      if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.drawOverlayPasses'] = safeFixed(deps, drawOverlayPassesMs);
    };
    if (!zoomPreviewFastPathPayload) {
      if (deps && typeof deps.applyMainCameraWorldTransform === 'function') deps.applyMainCameraWorldTransform(call(deps, 'getContext'), runWorldPasses);
      else runWorldPasses();
      var hudStartAt = nowMs(deps);
      call(deps, 'drawHudPass', { source: 'renderer.canvas2d:drawHudPass' });
      drawHudPassWallMs = Math.max(0, (nowMs(deps)) - hudStartAt);
      drawHudPassMs = drawHudPassWallMs;
      functionBreakdown = call(deps, 'getFunctionBreakdownFrame');
      if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.drawHudPass'] = safeFixed(deps, drawHudPassMs);
    }
    var postFinalizeStartAt = nowMs(deps);
    postPassFinalizeMs = 0;
    postPassFinalizeWallMs = Math.max(0, (nowMs(deps)) - postFinalizeStartAt);
    var totalPipelineMs = Math.max(0, postFinalizeStartAt - pipelineStartAt);
    functionBreakdown = call(deps, 'getFunctionBreakdownFrame');
    if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.postPassFinalize'] = safeFixed(deps, postPassFinalizeMs);
    var pipelineBreakdown = {
      source: 'renderer.canvas2d:runFramePipeline',
      clearAndBackgroundMs: safeFixed(deps, clearAndBackgroundMs),
      clearAndBackgroundWallMs: safeFixed(deps, clearAndBackgroundWallMs),
      baseWorldPassesMs: safeFixed(deps, baseWorldPassesMs),
      baseWorldPassesWallMs: safeFixed(deps, baseWorldPassesWallMs),
      baseWorldPassesPreSetupWallMs: safeFixed(deps, baseWorldPassesPreSetupWallMs),
      baseWorldPassesPreSetupViewRotationWallMs: safeFixed(deps, baseWorldPassesPreSetupViewRotationWallMs),
      baseWorldPassesPreSetupScopeWallMs: safeFixed(deps, baseWorldPassesPreSetupScopeWallMs),
      baseWorldPassesPreSetupVisibleLightsWallMs: safeFixed(deps, baseWorldPassesPreSetupVisibleLightsWallMs),
      baseWorldPassesPreSetupOverrideWallMs: safeFixed(deps, baseWorldPassesPreSetupOverrideWallMs),
      baseWorldPassesPreSetupResidualWallMs: safeFixed(deps, baseWorldPassesPreSetupResidualWallMs),
      baseWorldPassesFloorLoopWallMs: safeFixed(deps, baseWorldPassesFloorLoopWallMs),
      baseWorldPassesFloorProjectionWallMs: safeFixed(deps, baseWorldPassesFloorProjectionWallMs),
      baseWorldPassesFloorColorMaterialWallMs: safeFixed(deps, baseWorldPassesFloorColorMaterialWallMs),
      baseWorldPassesFloorCanvasDrawWallMs: safeFixed(deps, baseWorldPassesFloorCanvasDrawWallMs),
      baseWorldPassesPlayerSpritePrepWallMs: safeFixed(deps, baseWorldPassesPlayerSpritePrepWallMs),
      baseWorldPassesPostFinalizeWallMs: safeFixed(deps, baseWorldPassesPostFinalizeWallMs),
      baseWorldPassesResidualWallMs: safeFixed(deps, baseWorldPassesResidualWallMs),
      floorLayerReusedDuringInteraction: !!floorLayerReusedDuringInteraction,
      floorLayerRebuildWallMs: safeFixed(deps, floorLayerRebuildWallMs),
      floorLayerBlitWallMs: safeFixed(deps, floorLayerBlitWallMs),
      baseWorldActualBranch: baseWorldActualBranch || null,
      buildFramePlanMs: safeFixed(deps, buildFramePlanMs),
      buildFramePlanWallMs: safeFixed(deps, buildFramePlanWallMs),
      drawRenderableOrderMs: safeFixed(deps, drawRenderableOrderMs),
      drawRenderableOrderWallMs: safeFixed(deps, drawRenderableOrderWallMs),
      drawRenderableOrderInnerLoopMs: safeFixed(deps, drawRenderableOrderInnerLoopMs),
      drawRenderableOrderPixiStaticBeginFrameWallMs: safeFixed(deps, pixiStaticWorldBeginFrameWallMs),
      drawRenderableOrderUnaccountedWrapperMs: safeFixed(deps, Math.max(0, drawRenderableOrderWallMs - drawRenderableOrderInnerLoopMs - pixiStaticWorldBeginFrameWallMs)),
      pixiStaticWorldBeginFrameOk: !!pixiStaticWorldBeginFrameOk,
      pixiDrawsStaticWorldPackets: !!pixiDrawsStaticWorldPackets,
      pixiStaticWorldActualDrawUnitCount: pixiStaticWorldActualDrawUnitCount,
      pixiStaticWorldFallbackReason: pixiStaticWorldFallbackReason,
      drawOverlayPassesMs: safeFixed(deps, drawOverlayPassesMs),
      drawOverlayPassesWallMs: safeFixed(deps, drawOverlayPassesWallMs),
      drawHudPassMs: safeFixed(deps, drawHudPassMs),
      drawHudPassWallMs: safeFixed(deps, drawHudPassWallMs),
      prePassSetupMs: safeFixed(deps, prePassSetupMs),
      prePassSetupWallMs: safeFixed(deps, prePassSetupWallMs),
      postPassFinalizeMs: safeFixed(deps, postPassFinalizeMs),
      postPassFinalizeWallMs: safeFixed(deps, postPassFinalizeWallMs),
      renderableCount: Number(framePlan && framePlan.order ? framePlan.order.length : 0),
      framePlanId: framePlan && framePlan.id ? framePlan.id : null,
      zoomPreviewFastPathUsed: !!zoomPreviewFastPathPayload,
      zoomPreviewDrawMs: safeFixed(deps, zoomPreviewFastPathPayload && zoomPreviewFastPathPayload.drawMs || 0),
      zoomPreviewScaleRatio: safeFixed(deps, zoomPreviewFastPathPayload && zoomPreviewFastPathPayload.scaleRatio || 1)
    };
    noteCanvas2dSharedOptimizationUse('performance-audit-contract', {
      stage: 'runFramePipeline.pipelineBreakdown',
      canvas2dConsumerPath: 'shared-performance-audit-source-plus-existing-canvas2d-pipeline-breakdown',
      statsSummary: 'totalPipelineMs=' + String(safeFixed(deps, totalPipelineMs)) + ',renderableCount=' + String(pipelineBreakdown.renderableCount || 0),
      runtimeDetail: {
        totalPipelineMs: safeFixed(deps, totalPipelineMs),
        renderableCount: Number(pipelineBreakdown.renderableCount || 0),
        framePlanId: pipelineBreakdown.framePlanId || null
      }
    });
    var debugStartAt = nowMs(deps);
    if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.total'] = safeFixed(deps, totalPipelineMs);
    adapterApi.__lastPipelineBreakdown = Object.assign({}, pipelineBreakdown, { totalPipelineMs: safeFixed(deps, totalPipelineMs), adapterGlueMs: 0, debugHookMs: 0, knownAccountedMs: 0, unaccountedMs: 0 });
    var shouldEmit = call(deps, 'shouldEmitProfile', 'pipelineBreakdown', [
      Number(pipelineBreakdown.renderableCount || 0),
      Number(pipelineBreakdown.baseWorldPassesMs || 0).toFixed(0),
      Number(pipelineBreakdown.drawRenderableOrderMs || 0).toFixed(0),
      Number(totalPipelineMs || 0) > 24 ? 'slow' : 'normal'
    ].join('|'), 1000, { slow: Number(totalPipelineMs || 0) > 24 });
    if (shouldEmit) {
      call(deps, 'emitRendererProfile', 'CANVAS2D-PIPELINE-BREAKDOWN', Object.assign({}, pipelineBreakdown, { totalPipelineMs: safeFixed(deps, totalPipelineMs), adapterGlueMs: 0, debugHookMs: 0, knownAccountedMs: 0, unaccountedMs: 0 }));
      call(deps, 'emitRendererProfile', 'LARGE-SCENE-FULL-FRAME-PATH-DIAGNOSTICS', {
        step: 'PXM-07.18K0-large-scene-frameplan-diagnostics-only',
        source: 'canvas2d-frame-pipeline.after-drawRenderableOrder',
        framePlanId: pipelineBreakdown.framePlanId || null,
        renderableCount: Number(pipelineBreakdown.renderableCount || 0),
        totalPipelineMs: safeFixed(deps, totalPipelineMs),
        buildFramePlanWallMs: safeFixed(deps, buildFramePlanWallMs),
        drawRenderableOrderWallMs: safeFixed(deps, drawRenderableOrderWallMs),
        drawRenderableOrderInnerLoopMs: safeFixed(deps, drawRenderableOrderInnerLoopMs),
        drawRenderableOrderPixiStaticBeginFrameWallMs: safeFixed(deps, pixiStaticWorldBeginFrameWallMs),
        drawRenderableOrderUnaccountedWrapperMs: safeFixed(deps, Math.max(0, drawRenderableOrderWallMs - drawRenderableOrderInnerLoopMs - pixiStaticWorldBeginFrameWallMs)),
        pixiStaticWorldBeginFrameOk: !!pixiStaticWorldBeginFrameOk,
        pixiDrawsStaticWorldPackets: !!pixiDrawsStaticWorldPackets,
        pixiStaticWorldActualDrawUnitCount: pixiStaticWorldActualDrawUnitCount,
        pixiStaticWorldFallbackReason: pixiStaticWorldFallbackReason
      });
      var functionBreakdownPayload = call(deps, 'getFunctionBreakdownFrame');
      if (functionBreakdownPayload) {
        call(deps, 'emitRendererProfile', 'RENDER-FUNCTION-BREAKDOWN', {
          source: 'renderer.canvas2d:runFramePipeline',
          framePlanId: functionBreakdownPayload.extras && functionBreakdownPayload.extras.framePlanId || null,
          frameRenderableCount: functionBreakdownPayload.extras && functionBreakdownPayload.extras.frameRenderableCount || 0,
          timings: call(deps, 'cloneSimpleObject', functionBreakdownPayload.timings),
          counts: call(deps, 'cloneSimpleObject', functionBreakdownPayload.counts),
          extras: call(deps, 'cloneSimpleObject', functionBreakdownPayload.extras)
        });
      }
    }
    debugHookMs = Math.max(0, (nowMs(deps)) - debugStartAt);
    totalPipelineMs = Math.max(0, (nowMs(deps)) - pipelineStartAt);
    var knownWithoutGlue = prePassSetupMs + clearAndBackgroundMs + baseWorldPassesMs + buildFramePlanMs + drawRenderableOrderMs + drawOverlayPassesMs + drawHudPassMs + postPassFinalizeMs + debugHookMs;
    adapterGlueMs = Math.max(0, totalPipelineMs - knownWithoutGlue);
    var knownAccountedMs = knownWithoutGlue + adapterGlueMs;
    var unaccountedMs = Math.max(0, totalPipelineMs - knownAccountedMs);
    if (functionBreakdown) {
      functionBreakdown.timings['adapter.runFramePipeline.debugHook'] = safeFixed(deps, debugHookMs);
      functionBreakdown.timings['adapter.runFramePipeline.adapterGlue'] = safeFixed(deps, adapterGlueMs);
      functionBreakdown.timings['adapter.runFramePipeline.total'] = safeFixed(deps, totalPipelineMs);
    }
    var runFramePipelineWallMs = Math.max(0, (nowMs(deps)) - pipelineCallStartAt);
    pipelineBreakdown = Object.assign({}, pipelineBreakdown, {
      totalPipelineMs: safeFixed(deps, totalPipelineMs),
      runFramePipelineWallMs: safeFixed(deps, runFramePipelineWallMs),
      debugHookMs: safeFixed(deps, debugHookMs),
      adapterGlueMs: safeFixed(deps, adapterGlueMs),
      knownAccountedMs: safeFixed(deps, knownAccountedMs),
      unaccountedMs: safeFixed(deps, unaccountedMs)
    });
    adapterApi.__lastPipelineBreakdown = pipelineBreakdown;
    try {
      if (window.__PIXI_MIGRATION_BASELINE_DIAGNOSTICS__ && typeof window.__PIXI_MIGRATION_BASELINE_DIAGNOSTICS__.noteRenderPipelineSummary === 'function') {
        window.__PIXI_MIGRATION_BASELINE_DIAGNOSTICS__.noteRenderPipelineSummary(pipelineBreakdown);
      }
    } catch (_) {}
    try {
      if (window.__WORLD_RENDERER_BACKEND_SELECTION__ && typeof window.__WORLD_RENDERER_BACKEND_SELECTION__.noteRenderSummary === 'function') {
        window.__WORLD_RENDERER_BACKEND_SELECTION__.noteRenderSummary(Object.assign({}, pipelineBreakdown, {
          renderer: 'canvas2d',
          source: 'canvas2d-frame-pipeline'
        }));
      }
    } catch (_) {}
    try {
      if (window.__PIXI_MIGRATION_RENDERABLE_KIND_DIAGNOSTICS__ && typeof window.__PIXI_MIGRATION_RENDERABLE_KIND_DIAGNOSTICS__.noteRenderSummary === 'function') {
        window.__PIXI_MIGRATION_RENDERABLE_KIND_DIAGNOSTICS__.noteRenderSummary(Object.assign({}, pipelineBreakdown, {
          renderer: 'canvas2d',
          source: 'canvas2d-frame-pipeline'
        }));
      }
    } catch (_) {}
    try {
      if (window.__PIXI_MIGRATION_CANVAS2D_FRAMEPLAN_CONSUMPTION_DIAGNOSTICS__ && typeof window.__PIXI_MIGRATION_CANVAS2D_FRAMEPLAN_CONSUMPTION_DIAGNOSTICS__.noteRenderSummary === 'function') {
        window.__PIXI_MIGRATION_CANVAS2D_FRAMEPLAN_CONSUMPTION_DIAGNOSTICS__.noteRenderSummary(Object.assign({}, pipelineBreakdown, {
          renderer: 'canvas2d',
          source: 'canvas2d-frame-pipeline'
        }));
      }
    } catch (_) {}
    try {
      if (window.__PIXI_WORLD_RENDERER_SKELETON__ && typeof window.__PIXI_WORLD_RENDERER_SKELETON__.noteRenderSummary === 'function') {
        window.__PIXI_WORLD_RENDERER_SKELETON__.noteRenderSummary(Object.assign({}, pipelineBreakdown, {
          renderer: 'canvas2d',
          source: 'canvas2d-frame-pipeline'
        }));
      }
    } catch (_) {}
    try {
      if (window.__PIXI_MIGRATION_PERFORMANCE_COMPARISON_DIAGNOSTICS__ && typeof window.__PIXI_MIGRATION_PERFORMANCE_COMPARISON_DIAGNOSTICS__.noteCanvas2dPipeline === 'function') {
        window.__PIXI_MIGRATION_PERFORMANCE_COMPARISON_DIAGNOSTICS__.noteCanvas2dPipeline(Object.assign({}, pipelineBreakdown, {
          renderer: 'canvas2d',
          source: 'canvas2d-frame-pipeline'
        }));
      }
    } catch (_) {}
    try {
      if (window.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__ && typeof window.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__.noteCanvas2dPipeline === 'function') {
        window.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__.noteCanvas2dPipeline(Object.assign({}, pipelineBreakdown, {
          renderer: 'canvas2d',
          source: 'canvas2d-frame-pipeline'
        }), { source: 'canvas2d-frame-pipeline' });
      }
    } catch (_) {}
    call(deps, 'recordInteractionPipelineCall', pipelineBreakdown);
    return framePlan || { order: [] };
  }


  var api = {
    phase: PHASE,
    owner: OWNER,
    runFramePipeline: runFramePipeline
  };

  window.__CANVAS2D_FRAME_PIPELINE__ = api;
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.canvas2dFramePipeline', api, { owner: OWNER, phase: PHASE });
      window.__APP_NAMESPACE.bind('renderer.diagnostics.canvas2dFramePipeline', { owner: OWNER, phase: PHASE }, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
})();
