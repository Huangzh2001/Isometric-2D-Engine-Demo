// P12a-3 owner: render frame plan builder.
// Loaded before render.js. This file intentionally owns only build/draw frame-plan
// orchestration; actual renderable construction and drawing stay in their own owners.

function buildRendererFramePlan() {
  var buildStartAtFramePlan = perfNow();
  var interactionState = getMainCameraInteractionStateForRender();
  var currentViewRotation = normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation);
  var framePlanId = 'frameplan-' + String(++__mainFramePlanSeq);
  var playerFastPathStartAt = perfNow();
  var playerFastPathResult = tryBuildPlayerMoveFastPathFrameOrderForRender(framePlanId, currentViewRotation, interactionState);
  var playerFastPathUsed = playerFastPathResult && playerFastPathResult.used === true && Array.isArray(playerFastPathResult.order);
  var order = [];
  var buildMainRenderablesStartAt = perfNow();
  if (playerFastPathUsed) {
    order = playerFastPathResult.order;
    recordRenderFunctionTiming('render.buildRendererFramePlan.buildMainFrameRenderables', Math.max(0, perfNow() - playerFastPathStartAt), {
      renderableCount: Number(order && order.length || 0),
      interactionFastPath: true,
      playerMoveFastPathUsed: true
    });
  } else {
    order = buildMainFrameRenderables();
    recordRenderFunctionTiming('render.buildRendererFramePlan.buildMainFrameRenderables', perfNow() - buildMainRenderablesStartAt, {
      renderableCount: Number(order && order.length || 0),
      interactionFastPath: !!interactionState,
      playerMoveFastPathUsed: false,
      playerMoveFastPathRejectReasons: playerFastPathResult && Array.isArray(playerFastPathResult.rejectReasons) ? playerFastPathResult.rejectReasons.slice(0, 8) : []
    });
  }
  var framePlanSignature = [currentViewRotation, order.length, __lastMainRenderableBuildStats.staticRenderableCount, __lastMainRenderableBuildStats.dynamicRenderableCount].join('|');
  var playerMoveFastPathEligibility = evaluatePlayerMoveFastPathEligibilityForRender(framePlanId, order, currentViewRotation, interactionState);
  var framePlanDiagnosticsEnabled = isFramePlanDiagnosticsEnabled();
  var renderOrderHeavyDiagnosticsEnabled = isRenderOrderHeavyDiagnosticsEnabled();
  var interactionFastPath = (!!interactionState) || playerFastPathUsed === true;
  logActorInteractionFinalOrderDiagnostics(framePlanId, currentViewRotation, order);
  if (!interactionFastPath) {
    if (framePlanDiagnosticsEnabled || renderOrderHeavyDiagnosticsEnabled) {
      for (var i = 0; i < order.length; i++) {
        if (!order[i] || typeof order[i] !== 'object') continue;
        order[i].framePlanId = framePlanId;
        order[i].framePlanSignature = framePlanSignature;
      }
    }
    if (framePlanDiagnosticsEnabled) {
      logItemRotationPrototype('main-render-frameplan-rebuilt', {
        currentViewRotation: currentViewRotation,
        framePlanId: framePlanId,
        framePlanSignature: framePlanSignature,
        renderableCount: order.length,
        staticRenderableCount: __lastMainRenderableBuildStats.staticRenderableCount,
        dynamicRenderableCount: __lastMainRenderableBuildStats.dynamicRenderableCount,
        reason: 'buildFramePlan'
      });
      logItemRotationPrototype('main-view-rotation-source-check', buildMainViewRotationSourceCheckPayload(currentViewRotation, staticBoxRenderCache && typeof staticBoxRenderCache.viewRotation === 'number' ? staticBoxRenderCache.viewRotation : currentViewRotation, typeof staticBoxGeometrySignature === 'function' ? staticBoxGeometrySignature() : null));
      logMainViewRotationVisualConsumerCheck(currentViewRotation);
      logMainViewRotationRenderConsumerMode(currentViewRotation);
      logItemRotationPrototype('main-camera-render-scope-check', {
        framePlanId: framePlanId,
        zoom: __lastMainRenderableBuildStats.zoom != null ? Number(__lastMainRenderableBuildStats.zoom) : getMainEditorZoomValueForRender(),
        cameraCullingEnabled: __lastMainRenderableBuildStats.cameraCullingEnabled !== false,
        renderablesBeforeCulling: Number(__lastMainRenderableBuildStats.renderablesBeforeCulling || order.length),
        renderablesAfterCulling: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length),
        cullingApplied: (__lastMainRenderableBuildStats.cameraCullingEnabled !== false) && Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length) <= Number(__lastMainRenderableBuildStats.renderablesBeforeCulling || order.length)
      });
    }
    logRenderOrderDiagnostics(framePlanId, framePlanSignature, currentViewRotation, order);
    if (framePlanDiagnosticsEnabled && isMainEditorViewAnimatingForRender()) {
      logItemRotationPrototype('main-view-rotation-visible-frame-check', {
        visualRotation: normalizeMainEditorViewRotationValue(currentViewRotation),
        discreteViewRotation: normalizeMainEditorViewRotationValue(readLegacyMainEditorViewRotation() != null ? readLegacyMainEditorViewRotation() : currentViewRotation),
        framePlanId: framePlanId,
        floorFrameBuiltFrom: 'visualRotation',
        voxelFrameBuiltFrom: 'visualRotation',
        lightsFrameBuiltFrom: 'visualRotation',
        shadowsFrameBuiltFrom: 'visualRotation'
      });
    }
    if (__lastRenderVisibilityStats) {
      var framePlanBuildMs = Math.max(0, perfNow() - buildStartAtFramePlan);
      if (framePlanDiagnosticsEnabled) {
        logItemRotationPrototype('render-build-cost-summary', {
          terrainBuildMs: Number(__lastRenderVisibilityStats.terrainBuildMs || 0),
          staticBuildMs: Number(__lastRenderVisibilityStats.staticBuildMs || 0),
          dynamicBuildMs: Number(__lastRenderVisibilityStats.dynamicBuildMs || 0),
          framePlanBuildMs: framePlanBuildMs,
          renderablesBeforeCulling: Number(__lastMainRenderableBuildStats.renderablesBeforeCulling || 0),
          renderablesAfterCulling: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length)
        });
        logItemRotationPrototype('render-performance-summary', {
          framePlanBuildMs: framePlanBuildMs,
          renderSourceBuildMs: Number(__lastRenderVisibilityStats.renderSourceBuildMs || 0),
          visibilityFilterMs: Number(__lastRenderVisibilityStats.visibilityFilterMs || 0),
          finalRenderableCount: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length),
          cameraZoom: Number(__lastMainRenderableBuildStats.zoom || getMainEditorZoomValueForRender()),
          currentViewRotation: normalizeMainEditorViewRotationValue(currentViewRotation)
        });
      }
      __lastRenderResourceSummary = Object.assign({}, __lastRenderResourceSummary || {}, {
        framePlanBuildMs: framePlanBuildMs,
        finalRenderableCount: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length),
        terrainBatchDrawCount: Number(__lastRenderVisibilityStats.terrainBatchDrawCount || 0),
        terrainVisibleFaceCount: Number(__lastRenderVisibilityStats.terrainVisibleFaceCount || 0),
        terrainVisibleChunkCount: Number(__lastRenderVisibilityStats.visibleChunkCount || 0)
      });
      if (framePlanDiagnosticsEnabled) logItemRotationPrototype('render-resource-summary', __lastRenderResourceSummary);
    }
  }
  recordRenderFunctionTiming('render.buildRendererFramePlan.total', perfNow() - buildStartAtFramePlan, {
    framePlanId: framePlanId,
    renderableCount: Number(order && order.length || 0),
    interactionFastPath: interactionFastPath === true,
    playerMoveFastPathUsed: playerFastPathUsed === true,
    playerMoveFastPathCandidateEligible: playerMoveFastPathEligibility && playerMoveFastPathEligibility.candidateEligible === true,
    playerMoveFastPathRejectReasons: playerMoveFastPathEligibility && Array.isArray(playerMoveFastPathEligibility.rejectReasons) ? playerMoveFastPathEligibility.rejectReasons.slice(0, 8) : [],
    playerMoveFastPathCellKey: playerMoveFastPathEligibility ? String(playerMoveFastPathEligibility.playerInteractionCellKey || '') : ''
  });
  return {
    id: framePlanId,
    signature: framePlanSignature,
    currentViewRotation: currentViewRotation,
    order: order,
    playerMoveFastPathUsed: playerFastPathUsed === true,
    counts: {
      renderables: order.length,
      instances: instances.length,
      boxes: boxes.length,
      lights: lights.length,
      staticRenderableCount: __lastMainRenderableBuildStats.staticRenderableCount,
      dynamicRenderableCount: __lastMainRenderableBuildStats.dynamicRenderableCount
    }
  };
}

function drawRendererFramePlan(framePlan) {
  var order = framePlan && Array.isArray(framePlan.order) ? framePlan.order : [];
  drawMainFrameRenderables(order);
  return order;
}
