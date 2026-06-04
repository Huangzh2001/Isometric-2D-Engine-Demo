(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/presentation/render/renderer/canvas2d-renderable-order-draw.js';
  var PHASE = 'P11c-5';
  var STEP = 'PXM-07.18K0G';
  var lastResidualCanvas2dForensicsSignature = '';
  var lastResidualCanvas2dForensicsEmitAt = 0;

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

  function getRenderableKind(renderable) {
    if (!renderable) return 'unknown';
    return String(renderable.kind || renderable.renderPath || 'unknown');
  }

  function getRenderableDrawPosition(deps, renderable) {
    if (!renderable) return { x: 0, y: 0 };
    if (renderable.drawScreenPosition && typeof renderable.drawScreenPosition.x === 'number' && typeof renderable.drawScreenPosition.y === 'number') {
      return { x: Math.round(renderable.drawScreenPosition.x), y: Math.round(renderable.drawScreenPosition.y) };
    }
    if (renderable.debugFoot && typeof renderable.debugFoot.x === 'number' && typeof renderable.debugFoot.y === 'number') {
      return { x: Math.round(renderable.debugFoot.x), y: Math.round(renderable.debugFoot.y) };
    }
    if (Array.isArray(renderable.faces) && renderable.faces.length && Array.isArray(renderable.faces[0].points) && renderable.faces[0].points.length) {
      try {
        if (deps && typeof deps.averageScreenPoint === 'function') {
          var mid = deps.averageScreenPoint(renderable.faces[0].points);
          if (mid && typeof mid.x === 'number' && typeof mid.y === 'number') return { x: Math.round(mid.x), y: Math.round(mid.y) };
        }
      } catch (_) {}
    }
    return { x: 0, y: 0 };
  }

  function createCanvasTiming() {
    return {
      beginPathMs: 0,
      moveToMs: 0,
      lineToMs: 0,
      closePathMs: 0,
      fillMs: 0,
      strokeMs: 0,
      drawImageMs: 0,
      fillRectMs: 0,
      strokeRectMs: 0,
      clearRectMs: 0,
      beginPathCount: 0,
      moveToCount: 0,
      lineToCount: 0,
      closePathCount: 0,
      fillCount: 0,
      strokeCount: 0,
      drawImageCount: 0,
      fillRectCount: 0,
      strokeRectCount: 0,
      clearRectCount: 0
    };
  }

  function createStaticRunStats() {
    return {
      staticPacketGeometryCacheHitCount: 0,
      staticPacketGeometryCacheMissCount: 0,
      staticPacketOverlayCacheHitCount: 0,
      staticPacketOverlayCacheMissCount: 0,
      staticBitmapRunCount: 0,
      staticBitmapRunPacketCount: 0,
      staticBitmapRunOverlayCount: 0,
      staticBitmapRunCacheHitCount: 0,
      staticBitmapRunCacheMissCount: 0,
      staticBitmapRunBuildMs: 0,
      staticBitmapRunDrawMs: 0,
      staticBitmapRunGeometryMs: 0,
      staticBitmapRunInteractionReuseCount: 0,
      staticBitmapRunInteractionReuseDrawMs: 0,
      staticPacketDrawLoopMs: 0
    };
  }

  function createDrawStats() {
    return {
      staticPacketCount: 0,
      dynamicRenderableCount: 0,
      staticPacketDrawLoopMs: 0,
      dynamicRenderableDrawLoopMs: 0,
      staticPacketKindCounts: Object.create(null),
      dynamicKindCounts: Object.create(null),
      staticPacketGeometryCacheHitCount: 0,
      staticPacketGeometryCacheMissCount: 0,
      staticPacketOverlayCacheHitCount: 0,
      staticPacketOverlayCacheMissCount: 0,
      staticBitmapRunCount: 0,
      staticBitmapRunPacketCount: 0,
      staticBitmapRunOverlayCount: 0,
      staticBitmapRunCacheHitCount: 0,
      staticBitmapRunCacheMissCount: 0,
      staticBitmapRunBuildMs: 0,
      staticBitmapRunDrawMs: 0,
      staticBitmapRunGeometryMs: 0,
      staticBitmapRunInteractionReuseCount: 0,
      staticBitmapRunInteractionReuseDrawMs: 0,
      staticRunCount: 0,
      largestStaticRunPacketCount: 0,
      staticPacketSkipCheckMs: 0,
      staticPacketSkipCheckCount: 0,
      staticPacketAdoptedRunCount: 0,
      staticPacketSkippedByPixiCount: 0,
      staticPacketCanvasFallbackRunCount: 0,
      staticPacketCanvasFallbackPacketCount: 0,
      topSlowRenderables: []
    };
  }

  function trackSlowRenderable(stats, entry) {
    if (!stats || !entry) return;
    stats.topSlowRenderables.push(entry);
    stats.topSlowRenderables.sort(function (a, b) { return Number(b.ms || 0) - Number(a.ms || 0); });
    if (stats.topSlowRenderables.length > 8) stats.topSlowRenderables.length = 8;
  }

  function getContext(deps) {
    try { return deps && typeof deps.getContext === 'function' ? deps.getContext() : null; } catch (_) { return null; }
  }

  function wrapCanvasMethod(deps, canvasTiming, name, msKey, countKey) {
    var ctx = getContext(deps);
    if (!ctx || typeof ctx[name] !== 'function') return null;
    var original = ctx[name];
    ctx[name] = function () {
      var t0 = nowMs(deps);
      try {
        return original.apply(this, arguments);
      } finally {
        var t1 = nowMs(deps);
        canvasTiming[msKey] += Math.max(0, t1 - t0);
        canvasTiming[countKey] += 1;
      }
    };
    return function restore() {
      try { ctx[name] = original; } catch (_) {}
    };
  }

  function installCanvasTimingHooks(deps, canvasTiming) {
    var restoreCanvasMethods = [];
    restoreCanvasMethods.push(wrapCanvasMethod(deps, canvasTiming, 'beginPath', 'beginPathMs', 'beginPathCount'));
    restoreCanvasMethods.push(wrapCanvasMethod(deps, canvasTiming, 'moveTo', 'moveToMs', 'moveToCount'));
    restoreCanvasMethods.push(wrapCanvasMethod(deps, canvasTiming, 'lineTo', 'lineToMs', 'lineToCount'));
    restoreCanvasMethods.push(wrapCanvasMethod(deps, canvasTiming, 'closePath', 'closePathMs', 'closePathCount'));
    restoreCanvasMethods.push(wrapCanvasMethod(deps, canvasTiming, 'fill', 'fillMs', 'fillCount'));
    restoreCanvasMethods.push(wrapCanvasMethod(deps, canvasTiming, 'stroke', 'strokeMs', 'strokeCount'));
    restoreCanvasMethods.push(wrapCanvasMethod(deps, canvasTiming, 'drawImage', 'drawImageMs', 'drawImageCount'));
    restoreCanvasMethods.push(wrapCanvasMethod(deps, canvasTiming, 'fillRect', 'fillRectMs', 'fillRectCount'));
    restoreCanvasMethods.push(wrapCanvasMethod(deps, canvasTiming, 'strokeRect', 'strokeRectMs', 'strokeRectCount'));
    restoreCanvasMethods.push(wrapCanvasMethod(deps, canvasTiming, 'clearRect', 'clearRectMs', 'clearRectCount'));
    return restoreCanvasMethods;
  }

  function restoreCanvasTimingHooks(restoreCanvasMethods) {
    restoreCanvasMethods = Array.isArray(restoreCanvasMethods) ? restoreCanvasMethods : [];
    for (var restoreIndex = 0; restoreIndex < restoreCanvasMethods.length; restoreIndex += 1) {
      if (typeof restoreCanvasMethods[restoreIndex] === 'function') restoreCanvasMethods[restoreIndex]();
    }
  }

  function accumulateStaticRunStats(stats, staticRunStats, usedBitmapRun, staticRunStartAt, deps) {
    stats.staticPacketGeometryCacheHitCount += Number(staticRunStats.staticPacketGeometryCacheHitCount || 0);
    stats.staticPacketGeometryCacheMissCount += Number(staticRunStats.staticPacketGeometryCacheMissCount || 0);
    stats.staticPacketOverlayCacheHitCount += Number(staticRunStats.staticPacketOverlayCacheHitCount || 0);
    stats.staticPacketOverlayCacheMissCount += Number(staticRunStats.staticPacketOverlayCacheMissCount || 0);
    stats.staticBitmapRunCount += Number(staticRunStats.staticBitmapRunCount || 0);
    stats.staticBitmapRunPacketCount += Number(staticRunStats.staticBitmapRunPacketCount || 0);
    stats.staticBitmapRunOverlayCount += Number(staticRunStats.staticBitmapRunOverlayCount || 0);
    stats.staticBitmapRunCacheHitCount += Number(staticRunStats.staticBitmapRunCacheHitCount || 0);
    stats.staticBitmapRunCacheMissCount += Number(staticRunStats.staticBitmapRunCacheMissCount || 0);
    stats.staticBitmapRunBuildMs += Number(staticRunStats.staticBitmapRunBuildMs || 0);
    stats.staticBitmapRunDrawMs += Number(staticRunStats.staticBitmapRunDrawMs || 0);
    stats.staticBitmapRunGeometryMs += Number(staticRunStats.staticBitmapRunGeometryMs || 0);
    stats.staticBitmapRunInteractionReuseCount += Number(staticRunStats.staticBitmapRunInteractionReuseCount || 0);
    stats.staticBitmapRunInteractionReuseDrawMs += Number(staticRunStats.staticBitmapRunInteractionReuseDrawMs || 0);
    stats.staticPacketDrawLoopMs += Number(staticRunStats.staticPacketDrawLoopMs || 0) + (usedBitmapRun ? Math.max(0, nowMs(deps) - staticRunStartAt) : 0);
  }

  function getActiveRendererBackend() {
    try {
      var selection = window.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      var snapshot = selection && typeof selection.getSnapshot === 'function' ? selection.getSnapshot() : null;
      if (snapshot && snapshot.activeBackend) return String(snapshot.activeBackend);
    } catch (_) {}
    return 'canvas2d';
  }

  function isPixiBackendActive() {
    return getActiveRendererBackend() === 'pixi';
  }

  function getPixiStaticWorldPacketConsumer() {
    try { return window.__SHARED_RENDER_OPTIMIZATION_PIXI_STATIC_WORLD_PACKET_CONSUMER__ || null; } catch (_) {}
    return null;
  }


  function getPixiInterleavedWorldContainer() {
    try {
      var renderer = window.__PIXI_MIGRATION_PIXI_WORLD_RENDERER__ || window.__PIXI_WORLD_RENDERER_SKELETON__ || null;
      if (renderer && typeof renderer.getStaticWorldPacketContainer === 'function') return renderer.getStaticWorldPacketContainer('canvas2d-renderable-order-draw.frameplan-interleaved-player');
      if (renderer && typeof renderer.getStaticRunContainer === 'function') return renderer.getStaticRunContainer('canvas2d-renderable-order-draw.frameplan-interleaved-player');
    } catch (_) {}
    return null;
  }

  function consumePixiPlayerForFramePlanOrder(renderable, meta, orderIndex) {
    if (!isPixiBackendActive()) return null;
    if (!(renderable && (renderable.id === 'player-avatar' || renderable.kind === 'player-avatar'))) return null;
    if (!(meta && meta.__pixiStaticWorldFrameOk === true)) return null;
    try {
      var consumer = window.__SHARED_RENDER_OPTIMIZATION_PIXI_PLAYER_CONSUMER__ || null;
      if (!consumer || typeof consumer.consume !== 'function') return null;
      var container = getPixiInterleavedWorldContainer();
      if (!container) return null;
      return consumer.consume({
        source: 'canvas2d-renderable-order-draw.frameplan-interleaved-player',
        container: container,
        framePlanId: meta && meta.framePlanId || '',
        visualAdoption: true,
        interleavedWorldContainer: true,
        orderIndex: orderIndex,
        zIndex: orderIndex,
        renderableKind: renderable.kind || renderable.id || 'player-avatar'
      }) || null;
    } catch (_) {}
    return null;
  }

  function beginPixiStaticWorldPacketFrame(order, meta, deps) {
    if (!isPixiBackendActive()) return null;
    var consumer = null;
    try {
      consumer = getPixiStaticWorldPacketConsumer();
      if (consumer && typeof consumer.beginFrame === 'function') return consumer.beginFrame(order || [], meta || {}, deps || {}) || null;
    } catch (err) {
      var phaseDiagnostics = null;
      try {
        if (consumer && typeof consumer.getLastBeginFramePhaseDiagnostics === 'function') phaseDiagnostics = consumer.getLastBeginFramePhaseDiagnostics() || null;
      } catch (_) { phaseDiagnostics = null; }
      try {
        if (consumer && typeof consumer.reset === 'function') consumer.reset('beginFrame-exception-reset-from-draw-loop');
      } catch (_) {}
      try {
        if (deps && typeof deps.emitRendererProfile === 'function') {
          deps.emitRendererProfile('PIXI-STATIC-BEGINFRAME-EXCEPTION', {
            step: STEP,
            source: 'canvas2d-renderable-order-draw.beginPixiStaticWorldPacketFrame',
            framePlanId: meta && meta.framePlanId || null,
            renderableCount: Array.isArray(order) ? order.length : 0,
            errorName: err && err.name ? String(err.name) : 'Error',
            errorMessage: err && err.message ? String(err.message) : String(err),
            errorStack: err && err.stack ? String(err.stack).slice(0, 4000) : '',
            phaseDiagnostics: phaseDiagnostics
          });
        }
      } catch (_) {}
      return {
        ok: false,
        renderer: 'pixi-static-world-packet-consumer',
        step: STEP,
        source: 'beginPixiStaticWorldPacketFrame.catch',
        pixiDrawsStaticWorldPackets: false,
        canvas2dSkipsStaticWorldPackets: false,
        fallbackReason: 'beginFrame-exception:' + (err && err.message ? String(err.message) : String(err)),
        phaseDiagnostics: phaseDiagnostics
      };
    }
    return null;
  }

  function buildLargeSceneFrameplanDiagnostics(order, meta, deps, pixiSummary, pixiBeginFrameWallMs) {
    order = Array.isArray(order) ? order : [];
    var out = {
      step: STEP,
      source: 'canvas2d-renderable-order-draw.before-main-loop',
      framePlanId: meta && meta.framePlanId || null,
      currentViewRotation: meta && meta.currentViewRotation != null ? Number(meta.currentViewRotation) : 0,
      activeRendererBackend: getActiveRendererBackend(),
      isPixiBackendActive: isPixiBackendActive(),
      renderableCount: order.length,
      staticWorldFacePacketCount: 0,
      dynamicRenderableCount: 0,
      playerRenderableCount: 0,
      staticRunCount: 0,
      largestStaticRunPacketCount: 0,
      firstDynamicIndex: -1,
      playerIndex: -1,
      kindCounts: Object.create(null),
      staticPacketSampleIds: [],
      dynamicSampleKinds: [],
      pixiStaticWorldConsumerExists: !!getPixiStaticWorldPacketConsumer(),
      pixiStaticWorldBeginFrameWallMs: safeFixed(deps, pixiBeginFrameWallMs),
      pixiStaticWorldBeginFrameReturnedSummary: !!pixiSummary,
      pixiStaticWorldBeginFrameOk: !!(pixiSummary && pixiSummary.ok === true),
      pixiDrawsStaticWorldPackets: !!(pixiSummary && pixiSummary.pixiDrawsStaticWorldPackets === true),
      pixiStaticWorldFallbackReason: pixiSummary && pixiSummary.fallbackReason ? String(pixiSummary.fallbackReason) : '',
      pixiStaticWorldSummarySource: pixiSummary && pixiSummary.source ? String(pixiSummary.source) : '',
      pixiStaticWorldBeginFramePhaseDiagnostics: pixiSummary && pixiSummary.phaseDiagnostics ? pixiSummary.phaseDiagnostics : null,
      pixiStaticWorldSummaryStaticPacketCount: pixiSummary && pixiSummary.staticPacketCount != null ? Number(pixiSummary.staticPacketCount) : 0,
      pixiStaticWorldActualDrawUnitCount: pixiSummary && pixiSummary.actualDrawUnitCount != null ? Number(pixiSummary.actualDrawUnitCount) : 0,
      pixiStaticWorldActualCacheSpriteDrawCount: pixiSummary && pixiSummary.actualCacheSpriteDrawCount != null ? Number(pixiSummary.actualCacheSpriteDrawCount) : 0,
      pixiStaticWorldActualGraphicsPacketDrawCount: pixiSummary && pixiSummary.actualGraphicsPacketDrawCount != null ? Number(pixiSummary.actualGraphicsPacketDrawCount) : 0,
      optimizationAuditVisibleChunkCount: pixiSummary && pixiSummary.optimizationAuditVisibleChunkCount != null ? Number(pixiSummary.optimizationAuditVisibleChunkCount) : null,
      optimizationAuditChunkKeyOnlyGroupCount: pixiSummary && pixiSummary.optimizationAuditChunkKeyOnlyGroupCount != null ? Number(pixiSummary.optimizationAuditChunkKeyOnlyGroupCount) : null,
      optimizationAuditStableDepthBandGroupCount: pixiSummary && pixiSummary.optimizationAuditStableDepthBandGroupCount != null ? Number(pixiSummary.optimizationAuditStableDepthBandGroupCount) : null,
      optimizationAuditStableDepthBandFragmentationFactor: pixiSummary && pixiSummary.optimizationAuditStableDepthBandFragmentationFactor != null ? Number(pixiSummary.optimizationAuditStableDepthBandFragmentationFactor) : null,
      optimizationAuditEstimatedExcessChunkSpritesFromBanding: pixiSummary && pixiSummary.optimizationAuditEstimatedExcessChunkSpritesFromBanding != null ? Number(pixiSummary.optimizationAuditEstimatedExcessChunkSpritesFromBanding) : null,
      optimizationAuditVerdict: pixiSummary && pixiSummary.optimizationAuditVerdict ? String(pixiSummary.optimizationAuditVerdict) : '',
      pixiStaticWorldChunkRenderTextureHitRate: pixiSummary && pixiSummary.chunkRenderTextureHitRate != null ? Number(pixiSummary.chunkRenderTextureHitRate) : null,
      pixiStaticWorldOrderRunRenderTextureHitRate: pixiSummary && pixiSummary.orderRunRenderTextureHitRate != null ? Number(pixiSummary.orderRunRenderTextureHitRate) : null,
      pixiStaticWorldStaticPacketItemCacheHitRate: pixiSummary && pixiSummary.staticPacketItemCacheHitRate != null ? Number(pixiSummary.staticPacketItemCacheHitRate) : null,
      pixiStaticWorldDrawWallMs: pixiSummary && pixiSummary.drawWallMs != null ? Number(pixiSummary.drawWallMs) : null,
      pixiStaticWorldStaticPacketItemBuildMs: pixiSummary && pixiSummary.staticPacketItemBuildMs != null ? Number(pixiSummary.staticPacketItemBuildMs) : null,
      pixiStaticWorldChunkEligibilitySplitMs: pixiSummary && pixiSummary.chunkEligibilitySplitMs != null ? Number(pixiSummary.chunkEligibilitySplitMs) : null
    };
    var inStaticRun = false;
    var currentStaticRunCount = 0;
    for (var i = 0; i < order.length; i += 1) {
      var item = order[i];
      var kind = getRenderableKind(item);
      out.kindCounts[kind] = Number(out.kindCounts[kind] || 0) + 1;
      if (item && item.kind === 'static-world-face-packet') {
        out.staticWorldFacePacketCount += 1;
        if (out.staticPacketSampleIds.length < 6) out.staticPacketSampleIds.push(item.id || item.instanceId || null);
        if (!inStaticRun) {
          inStaticRun = true;
          currentStaticRunCount = 0;
          out.staticRunCount += 1;
        }
        currentStaticRunCount += 1;
        if (currentStaticRunCount > out.largestStaticRunPacketCount) out.largestStaticRunPacketCount = currentStaticRunCount;
      } else {
        if (out.firstDynamicIndex < 0) out.firstDynamicIndex = i;
        inStaticRun = false;
        currentStaticRunCount = 0;
        out.dynamicRenderableCount += 1;
        if (item && (item.kind === 'player-avatar' || item.id === 'player-avatar')) {
          out.playerRenderableCount += 1;
          if (out.playerIndex < 0) out.playerIndex = i;
        }
        if (out.dynamicSampleKinds.length < 6) out.dynamicSampleKinds.push(kind);
      }
    }
    out.staticPacketFramePlanRatio = out.renderableCount ? Number((out.staticWorldFacePacketCount / out.renderableCount).toFixed(4)) : 0;
    out.framePlanStillCarriesLargeStaticPacketList = out.staticWorldFacePacketCount >= 1024;
    out.pixiAdoptionTooLateCandidate = out.framePlanStillCarriesLargeStaticPacketList && out.pixiDrawsStaticWorldPackets === true;
    out.pixiConsumerMissingOrRejectedCandidate = out.staticWorldFacePacketCount > 0 && out.pixiDrawsStaticWorldPackets !== true;
    return out;
  }

  function buildPixiStaticWorldHardFailReason(diagnostics, pixiSummary) {
    diagnostics = diagnostics || {};
    var reasons = [];
    if (!diagnostics.isPixiBackendActive) reasons.push('active-renderer-backend-is-not-pixi');
    if (!diagnostics.pixiStaticWorldConsumerExists) reasons.push('missing-pixi-static-world-consumer');
    if (diagnostics.staticWorldFacePacketCount <= 0) reasons.push('no-static-world-face-packets');
    if (!diagnostics.pixiStaticWorldBeginFrameReturnedSummary) reasons.push('beginFrame-returned-no-summary');
    if (!diagnostics.pixiStaticWorldBeginFrameOk) reasons.push('beginFrame-ok-false');
    if (!diagnostics.pixiDrawsStaticWorldPackets) reasons.push('pixiDrawsStaticWorldPackets-false');
    if (diagnostics.pixiStaticWorldFallbackReason) reasons.push('fallbackReason=' + diagnostics.pixiStaticWorldFallbackReason);
    if (pixiSummary && pixiSummary.errorMessage) reasons.push('summaryError=' + String(pixiSummary.errorMessage));
    if (pixiSummary && pixiSummary.phaseDiagnostics && pixiSummary.phaseDiagnostics.lastPhase) reasons.push('lastPhase=' + String(pixiSummary.phaseDiagnostics.lastPhase));
    return reasons.join('; ');
  }

  function assertPixiStaticWorldDrawsOrThrow(deps, diagnostics, pixiSummary) {
    if (!diagnostics || diagnostics.isPixiBackendActive !== true) return;
    if (Number(diagnostics.staticWorldFacePacketCount || 0) <= 0) return;
    if (diagnostics.pixiStaticWorldBeginFrameOk === true && diagnostics.pixiDrawsStaticWorldPackets === true) return;

    var reason = buildPixiStaticWorldHardFailReason(diagnostics, pixiSummary);
    var payload = {
      step: STEP,
      source: 'canvas2d-renderable-order-draw.assertPixiStaticWorldDrawsOrThrow',
      hardFail: true,
      reason: reason,
      framePlanId: diagnostics.framePlanId || null,
      activeRendererBackend: diagnostics.activeRendererBackend || getActiveRendererBackend(),
      renderableCount: Number(diagnostics.renderableCount || 0),
      staticWorldFacePacketCount: Number(diagnostics.staticWorldFacePacketCount || 0),
      pixiStaticWorldConsumerExists: diagnostics.pixiStaticWorldConsumerExists === true,
      pixiStaticWorldBeginFrameWallMs: Number(diagnostics.pixiStaticWorldBeginFrameWallMs || 0),
      pixiStaticWorldBeginFrameReturnedSummary: diagnostics.pixiStaticWorldBeginFrameReturnedSummary === true,
      pixiStaticWorldBeginFrameOk: diagnostics.pixiStaticWorldBeginFrameOk === true,
      pixiDrawsStaticWorldPackets: diagnostics.pixiDrawsStaticWorldPackets === true,
      pixiStaticWorldFallbackReason: diagnostics.pixiStaticWorldFallbackReason || '',
      pixiStaticWorldSummarySource: diagnostics.pixiStaticWorldSummarySource || '',
      pixiStaticWorldBeginFramePhaseDiagnostics: diagnostics.pixiStaticWorldBeginFramePhaseDiagnostics || null,
      pixiStaticWorldSummary: pixiSummary || null
    };
    try {
      if (deps && typeof deps.emitRendererProfile === 'function') {
        deps.emitRendererProfile('PIXI-STATIC-WORLD-HARD-FAIL', payload);
      }
    } catch (_) {}
    try {
      window.__LAST_PIXI_STATIC_WORLD_HARD_FAIL__ = payload;
    } catch (_) {}
    throw new Error('[PXM][Pixi strict mode] Static world is not rendered by Pixi in pixi backend. ' + reason);
  }

  function maybeEmitLargeSceneFrameplanDiagnostics(deps, diagnostics) {
    if (!diagnostics) return;
    try {
      var slowPixiBegin = Number(diagnostics.pixiStaticWorldBeginFrameWallMs || 0) >= 16;
      var largeStatic = Number(diagnostics.staticWorldFacePacketCount || 0) >= 1024;
      var rejected = diagnostics.pixiConsumerMissingOrRejectedCandidate === true;
      var signature = [
        diagnostics.framePlanId || 'none',
        diagnostics.renderableCount || 0,
        diagnostics.staticWorldFacePacketCount || 0,
        diagnostics.pixiDrawsStaticWorldPackets ? 1 : 0,
        Math.floor(Number(diagnostics.pixiStaticWorldBeginFrameWallMs || 0) / 16)
      ].join('|');
      var shouldEmit = true;
      if (deps && typeof deps.shouldEmitProfile === 'function') {
        shouldEmit = deps.shouldEmitProfile('largeSceneFrameplanDiagnostics', signature, largeStatic || slowPixiBegin || rejected ? 250 : 1500, { slow: slowPixiBegin || rejected });
      }
      if (shouldEmit && deps && typeof deps.emitRendererProfile === 'function') {
        deps.emitRendererProfile('LARGE-SCENE-FRAMEPLAN-DIAGNOSTICS', diagnostics);
      }
    } catch (_) {}
  }

  function shouldSkipStaticPacketRunForPixiVisualAdoption(staticPackets, meta, runStartIndex) {
    if (!isPixiBackendActive()) return false;
    try {
      var consumer = getPixiStaticWorldPacketConsumer();
      if (consumer && typeof consumer.shouldSkipCanvas2dStaticRun === 'function') {
        return consumer.shouldSkipCanvas2dStaticRun(staticPackets, meta || {}, runStartIndex) === true;
      }
    } catch (_) {}
    return false;
  }

  function shouldSkipDynamicRenderableForPixiVisualAdoption(renderable, meta) {
    try {
      if (renderable && (renderable.id === 'player-avatar' || renderable.kind === 'player-avatar')) {
        if (!(meta && meta.__pixiStaticWorldFrameOk === true)) return false;
        var playerConsumer = window.__SHARED_RENDER_OPTIMIZATION_PIXI_PLAYER_CONSUMER__ || null;
        if (playerConsumer && typeof playerConsumer.shouldSkipCanvas2dPlayerAvatar === 'function') {
          return playerConsumer.shouldSkipCanvas2dPlayerAvatar(renderable, meta || {}) === true;
        }
      }
    } catch (_) {}
    try {
      var dynamicConsumer = window.__SHARED_RENDER_OPTIMIZATION_PIXI_DYNAMIC_RENDERABLE_CONSUMER__ || null;
      if (dynamicConsumer && typeof dynamicConsumer.shouldSkipCanvas2dDynamicRenderable === 'function') {
        return dynamicConsumer.shouldSkipCanvas2dDynamicRenderable(renderable, meta || {}) === true;
      }
    } catch (_) {}
    return false;
  }

  function drawStaticPacketRun(deps, stats, staticPackets, meta, runStartIndex) {
    var staticRunStartAt = nowMs(deps);
    noteCanvas2dSharedOptimizationUse('static-packet-run-cache', {
      stage: 'drawStaticPacketRun.start',
      canvas2dConsumerPath: 'shared-static-packet-run-source-plus-renderer-neutral-packet-consumer',
      statsSummary: 'packetCount=' + String(Array.isArray(staticPackets) ? staticPackets.length : 0),
      runtimeDetail: {
        packetCount: Array.isArray(staticPackets) ? staticPackets.length : 0,
        runStartIndex: runStartIndex
      }
    });
    stats.staticRunCount += 1;
    if (Array.isArray(staticPackets) && staticPackets.length > stats.largestStaticRunPacketCount) stats.largestStaticRunPacketCount = staticPackets.length;
    var skipCheckStartAt = nowMs(deps);
    var skipForPixi = shouldSkipStaticPacketRunForPixiVisualAdoption(staticPackets, meta, runStartIndex);
    stats.staticPacketSkipCheckMs += Math.max(0, nowMs(deps) - skipCheckStartAt);
    stats.staticPacketSkipCheckCount += 1;
    if (skipForPixi) {
      stats.staticPacketAdoptedRunCount += 1;
      stats.staticPacketSkippedByPixiCount += Array.isArray(staticPackets) ? staticPackets.length : 0;
      stats.staticPacketDrawLoopMs += Math.max(0, nowMs(deps) - staticRunStartAt);
      trackSlowRenderable(stats, {
        index: runStartIndex,
        id: staticPackets.length ? (staticPackets[0].id || null) : null,
        kind: 'pixi-static-world-packet-category-adopted',
        ms: 0
      });
      return;
    }
    stats.staticPacketCanvasFallbackRunCount += 1;
    stats.staticPacketCanvasFallbackPacketCount += Array.isArray(staticPackets) ? staticPackets.length : 0;
    var staticRunStats = createStaticRunStats();
    var usedBitmapRun = false;
    if (staticPackets.length >= 24 && deps && typeof deps.drawStaticPacketRunBitmap === 'function') {
      usedBitmapRun = deps.drawStaticPacketRunBitmap(staticPackets, {
        source: meta.source || 'unknown',
        framePlanId: meta.framePlanId || null,
        currentViewRotation: meta.currentViewRotation != null ? meta.currentViewRotation : 0,
        runStartIndex: runStartIndex,
        firstDynamicIndex: meta.firstDynamicIndex != null ? meta.firstDynamicIndex : -1
      }, staticRunStats) === true;
    }
    if (!usedBitmapRun) {
      if (deps && typeof deps.drawStaticPacketRunFallback === 'function') {
        deps.drawStaticPacketRunFallback(staticPackets, {
          source: meta.source || 'unknown',
          framePlanId: meta.framePlanId || null,
          currentViewRotation: meta.currentViewRotation != null ? meta.currentViewRotation : 0,
          runStartIndex: runStartIndex,
          firstDynamicIndex: meta.firstDynamicIndex != null ? meta.firstDynamicIndex : -1
        }, staticRunStats, function (payload) { trackSlowRenderable(stats, payload); });
      }
    } else {
      trackSlowRenderable(stats, {
        index: runStartIndex,
        id: staticPackets.length ? (staticPackets[0].id || null) : null,
        kind: 'static-world-face-run-bitmap',
        ms: safeFixed(deps, Math.max(0, nowMs(deps) - staticRunStartAt))
      });
    }
    accumulateStaticRunStats(stats, staticRunStats, usedBitmapRun, staticRunStartAt, deps);
  }

  function drawDynamicRenderable(deps, stats, seenDrawHits, renderable, index, orderLength, meta, debugState) {
    var kind = getRenderableKind(renderable);
    stats.dynamicRenderableCount += 1;
    stats.dynamicKindCounts[kind] = Number(stats.dynamicKindCounts[kind] || 0) + 1;
    if (debugState) debugState.lastRenderable = String(index + 1) + '/' + String(orderLength) + ':' + String((renderable && renderable.kind) || 'unknown') + ':' + String((renderable && renderable.id) || 'no-id');
    var renderableStartAt = nowMs(deps);
    try {
      if (renderable) {
        renderable.currentViewRotation = renderable.currentViewRotation != null
          ? renderable.currentViewRotation
          : ((meta && typeof meta.currentViewRotation === 'number') ? meta.currentViewRotation : (renderable.cacheViewRotation != null ? renderable.cacheViewRotation : 0));
        renderable.framePlanId = renderable.framePlanId || meta.framePlanId || null;
        renderable.__drawIndex = index;
      }
      var interleavedPlayerSummary = consumePixiPlayerForFramePlanOrder(renderable, meta, index);
      if (interleavedPlayerSummary && interleavedPlayerSummary.pixiDrawsPlayerAvatar === true) {
        trackSlowRenderable(stats, {
          index: index,
          id: renderable && (renderable.id || renderable.instanceId || null),
          kind: 'pixi-player-avatar-frameplan-interleaved',
          ms: 0
        });
      } else if (shouldSkipDynamicRenderableForPixiVisualAdoption(renderable, meta)) {
        trackSlowRenderable(stats, {
          index: index,
          id: renderable && (renderable.id || renderable.instanceId || null),
          kind: renderable && renderable.kind === 'player-avatar' ? 'pixi-player-avatar-adopted' : 'pixi-dynamic-renderable-adopted',
          ms: 0
        });
      } else if (renderable && typeof renderable.draw === 'function') renderable.draw();
      else if (renderable && renderable.kind === 'voxel' && deps && typeof deps.drawCachedVoxelRenderable === 'function') deps.drawCachedVoxelRenderable(renderable);
      else throw new Error('missing draw for renderable ' + String(renderable && renderable.id));
      if (renderable && deps && typeof deps.drawFaceDebugOverlayRenderable === 'function') deps.drawFaceDebugOverlayRenderable(renderable, index);
      recordMainDrawHit(deps, seenDrawHits, renderable);
    } catch (err) {
      if (deps && typeof deps.detailLog === 'function') deps.detailLog('[renderable-error] ' + String(debugState && debugState.lastRenderable) + ' stack=' + String((err && err.stack) || err));
      throw err;
    } finally {
      var renderableMs = Math.max(0, nowMs(deps) - renderableStartAt);
      stats.dynamicRenderableDrawLoopMs += renderableMs;
      trackSlowRenderable(stats, {
        index: index,
        id: renderable && (renderable.id || renderable.instanceId || null),
        kind: kind,
        ms: safeFixed(deps, renderableMs)
      });
    }
  }

  function recordMainDrawHit(deps, seenDrawHits, renderable) {
    if (!(renderable && (renderable.instanceId || renderable.prefabId))) return;
    var drawKey = [String(renderable.framePlanId || 'frameplan:none'), String(renderable.renderPath || renderable.kind || 'unknown'), String(renderable.instanceId || renderable.id || 'none')].join('|');
    if (seenDrawHits[drawKey]) return;
    seenDrawHits[drawKey] = true;
    if (deps && typeof deps.recordDrawDiagnostic === 'function') {
      deps.recordDrawDiagnostic('main-render-draw-hit', {
        currentViewRotation: Number(renderable.currentViewRotation || 0),
        cacheViewRotation: renderable.cacheViewRotation != null ? Number(renderable.cacheViewRotation) : null,
        instanceId: renderable.instanceId || null,
        prefabId: renderable.prefabId || null,
        renderPath: renderable.renderPath || (renderable.kind === 'voxel' ? 'static-cache' : 'dynamic-renderables'),
        framePlanId: renderable.framePlanId || null,
        cacheSignature: renderable.cacheSignature || null,
        renderSourceId: renderable.id || null,
        finalDrawScreenPosition: getRenderableDrawPosition(deps, renderable),
        drawUsedCurrentViewRotation: renderable.cacheViewRotation != null
          ? Number(renderable.cacheViewRotation) === Number(renderable.currentViewRotation || 0)
          : true,
        drawUsedSemanticTextureMapping: !!renderable.drawUsedSemanticTextureMapping
      });
    }
  }

  function buildLoopBreakdown(deps, order, meta, stats, canvasTiming, drawMs) {
    return {
      source: meta.source || 'unknown',
      framePlanId: meta.framePlanId || null,
      renderableCount: Number(order.length || 0),
      staticPacketCount: Number(stats.staticPacketCount || 0),
      dynamicRenderableCount: Number(stats.dynamicRenderableCount || 0),
      staticPacketDrawLoopMs: safeFixed(deps, stats.staticPacketDrawLoopMs),
      dynamicRenderableDrawLoopMs: safeFixed(deps, stats.dynamicRenderableDrawLoopMs),
      avgStaticPacketDrawMs: stats.staticPacketCount > 0 ? safeFixed(deps, stats.staticPacketDrawLoopMs / stats.staticPacketCount) : 0,
      avgDynamicRenderableDrawMs: stats.dynamicRenderableCount > 0 ? safeFixed(deps, stats.dynamicRenderableDrawLoopMs / stats.dynamicRenderableCount) : 0,
      staticPacketGeometryCacheHitCount: Number(stats.staticPacketGeometryCacheHitCount || 0),
      staticPacketGeometryCacheMissCount: Number(stats.staticPacketGeometryCacheMissCount || 0),
      staticPacketOverlayCacheHitCount: Number(stats.staticPacketOverlayCacheHitCount || 0),
      staticPacketOverlayCacheMissCount: Number(stats.staticPacketOverlayCacheMissCount || 0),
      staticBitmapRunCount: Number(stats.staticBitmapRunCount || 0),
      staticBitmapRunPacketCount: Number(stats.staticBitmapRunPacketCount || 0),
      staticBitmapRunOverlayCount: Number(stats.staticBitmapRunOverlayCount || 0),
      staticBitmapRunCacheHitCount: Number(stats.staticBitmapRunCacheHitCount || 0),
      staticBitmapRunCacheMissCount: Number(stats.staticBitmapRunCacheMissCount || 0),
      staticBitmapRunBuildMs: safeFixed(deps, stats.staticBitmapRunBuildMs),
      staticBitmapRunDrawMs: safeFixed(deps, stats.staticBitmapRunDrawMs),
      staticBitmapRunGeometryMs: safeFixed(deps, stats.staticBitmapRunGeometryMs),
      staticBitmapRunInteractionReuseCount: Number(stats.staticBitmapRunInteractionReuseCount || 0),
      staticBitmapRunInteractionReuseDrawMs: safeFixed(deps, stats.staticBitmapRunInteractionReuseDrawMs),
      canvasBeginPathMs: safeFixed(deps, canvasTiming.beginPathMs),
      canvasBeginPathCount: Number(canvasTiming.beginPathCount || 0),
      canvasMoveToMs: safeFixed(deps, canvasTiming.moveToMs),
      canvasMoveToCount: Number(canvasTiming.moveToCount || 0),
      canvasLineToMs: safeFixed(deps, canvasTiming.lineToMs),
      canvasLineToCount: Number(canvasTiming.lineToCount || 0),
      canvasClosePathMs: safeFixed(deps, canvasTiming.closePathMs),
      canvasClosePathCount: Number(canvasTiming.closePathCount || 0),
      canvasFillMs: safeFixed(deps, canvasTiming.fillMs),
      canvasFillCount: Number(canvasTiming.fillCount || 0),
      canvasStrokeMs: safeFixed(deps, canvasTiming.strokeMs),
      canvasStrokeCount: Number(canvasTiming.strokeCount || 0),
      canvasDrawImageMs: safeFixed(deps, canvasTiming.drawImageMs),
      canvasDrawImageCount: Number(canvasTiming.drawImageCount || 0),
      canvasFillRectMs: safeFixed(deps, canvasTiming.fillRectMs),
      canvasFillRectCount: Number(canvasTiming.fillRectCount || 0),
      canvasStrokeRectMs: safeFixed(deps, canvasTiming.strokeRectMs),
      canvasStrokeRectCount: Number(canvasTiming.strokeRectCount || 0),
      canvasClearRectMs: safeFixed(deps, canvasTiming.clearRectMs),
      canvasClearRectCount: Number(canvasTiming.clearRectCount || 0),
      staticRunCount: Number(stats.staticRunCount || 0),
      largestStaticRunPacketCount: Number(stats.largestStaticRunPacketCount || 0),
      staticPacketSkipCheckMs: safeFixed(deps, stats.staticPacketSkipCheckMs),
      staticPacketSkipCheckCount: Number(stats.staticPacketSkipCheckCount || 0),
      staticPacketAdoptedRunCount: Number(stats.staticPacketAdoptedRunCount || 0),
      staticPacketSkippedByPixiCount: Number(stats.staticPacketSkippedByPixiCount || 0),
      staticPacketCanvasFallbackRunCount: Number(stats.staticPacketCanvasFallbackRunCount || 0),
      staticPacketCanvasFallbackPacketCount: Number(stats.staticPacketCanvasFallbackPacketCount || 0),
      topSlowRenderables: stats.topSlowRenderables.slice(0),
      staticPacketKindCounts: stats.staticPacketKindCounts,
      dynamicKindCounts: stats.dynamicKindCounts,
      drawRenderableOrderMs: drawMs
    };
  }

  function emitDrawLoopBreakdown(adapterApi, deps, loopBreakdown) {
    if (adapterApi) adapterApi.__lastDrawLoopBreakdown = loopBreakdown;
    try {
      if (window.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__ && typeof window.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__.noteDrawLoopBreakdown === 'function') {
        window.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__.noteDrawLoopBreakdown(loopBreakdown, { source: 'canvas2d-renderable-order-draw' });
      }
    } catch (_) {}
    var signature = [
      Number(loopBreakdown.renderableCount || 0),
      Number(loopBreakdown.staticPacketCount || 0),
      Number(loopBreakdown.dynamicRenderableCount || 0),
      Number(loopBreakdown.drawRenderableOrderMs || 0).toFixed(1),
      Number(loopBreakdown.staticBitmapRunCount || 0)
    ].join('|');
    if (deps && typeof deps.shouldEmitProfile === 'function' && deps.shouldEmitProfile('drawLoopBreakdown', signature, 250)) {
      if (typeof deps.emitRendererProfile === 'function') deps.emitRendererProfile('DRAW-LOOP-BREAKDOWN', loopBreakdown);
    }
  }

  function emitPixiResidualCanvas2dForensics(adapterApi, deps, loopBreakdown) {
    if (!isPixiBackendActive()) return;
    loopBreakdown = loopBreakdown || {};
    var pixiSummary = loopBreakdown.pixiStaticWorldPacketSummary || null;
    if (!pixiSummary) {
      try {
        var consumer = getPixiStaticWorldPacketConsumer();
        if (consumer && typeof consumer.getLastSummary === 'function') pixiSummary = consumer.getLastSummary() || null;
      } catch (_) {}
    }
    var staticFallbackPacketCount = Number(loopBreakdown.staticPacketCanvasFallbackPacketCount || 0);
    var dynamicCount = Number(loopBreakdown.dynamicRenderableCount || 0);
    var drawMs = Number(loopBreakdown.drawRenderableOrderMs || 0);
    var residualVerdict = 'mostly-static-skipped';
    if (staticFallbackPacketCount > 0) residualVerdict = 'static-still-on-canvas2d';
    else if (dynamicCount > 0) residualVerdict = 'dynamic-player-hud-left-on-canvas2d';
    if (pixiSummary && pixiSummary.ok !== true) residualVerdict = 'pixi-static-world-not-adopted';
    var payload = {
      source: 'canvas2d-residual-forensics-under-pixi',
      step: STEP,
      framePlanId: loopBreakdown.framePlanId || '',
      renderableCount: Number(loopBreakdown.renderableCount || 0),
      staticPacketCount: Number(loopBreakdown.staticPacketCount || 0),
      dynamicRenderableCount: dynamicCount,
      drawRenderableOrderMs: safeFixed(deps, drawMs),
      dynamicRenderableDrawLoopMs: safeFixed(deps, loopBreakdown.dynamicRenderableDrawLoopMs || 0),
      staticPacketDrawLoopMs: safeFixed(deps, loopBreakdown.staticPacketDrawLoopMs || 0),
      staticPacketSkippedByPixiCount: Number(loopBreakdown.staticPacketSkippedByPixiCount || 0),
      staticPacketCanvasFallbackRunCount: Number(loopBreakdown.staticPacketCanvasFallbackRunCount || 0),
      staticPacketCanvasFallbackPacketCount: staticFallbackPacketCount,
      canvasDrawImageMs: safeFixed(deps, loopBreakdown.canvasDrawImageMs || 0),
      canvasDrawImageCount: Number(loopBreakdown.canvasDrawImageCount || 0),
      canvasFillMs: safeFixed(deps, loopBreakdown.canvasFillMs || 0),
      canvasFillCount: Number(loopBreakdown.canvasFillCount || 0),
      canvasStrokeMs: safeFixed(deps, loopBreakdown.canvasStrokeMs || 0),
      canvasStrokeCount: Number(loopBreakdown.canvasStrokeCount || 0),
      canvasLineToMs: safeFixed(deps, loopBreakdown.canvasLineToMs || 0),
      canvasLineToCount: Number(loopBreakdown.canvasLineToCount || 0),
      pixiStaticWorldBeginFrameWallMs: safeFixed(deps, loopBreakdown.pixiStaticWorldBeginFrameWallMs || 0),
      pixiStaticWorldBeginFrameOk: loopBreakdown.pixiStaticWorldBeginFrameOk === true,
      pixiDrawsStaticWorldPackets: loopBreakdown.pixiDrawsStaticWorldPackets === true,
      pixiStaticWorldFallbackReason: loopBreakdown.pixiStaticWorldFallbackReason || '',
      pixiStaticWorldActualDrawUnitCount: loopBreakdown.pixiStaticWorldActualDrawUnitCount,
      pixiStaticWorldActualCacheSpriteDrawCount: loopBreakdown.pixiStaticWorldActualCacheSpriteDrawCount,
      pixiStaticWorldActualGraphicsPacketDrawCount: loopBreakdown.pixiStaticWorldActualGraphicsPacketDrawCount,
      pixiChunkRenderTextureHitRate: pixiSummary && pixiSummary.chunkRenderTextureHitRate != null ? Number(pixiSummary.chunkRenderTextureHitRate) : null,
      pixiChunkRenderTextureMissCount: pixiSummary && pixiSummary.chunkRenderTextureMissCount != null ? Number(pixiSummary.chunkRenderTextureMissCount) : null,
      pixiChunkRenderTextureUploadCount: pixiSummary && pixiSummary.chunkRenderTextureUploadCount != null ? Number(pixiSummary.chunkRenderTextureUploadCount) : null,
      pixiStaticPacketItemCacheHitRate: pixiSummary && pixiSummary.staticPacketItemCacheHitRate != null ? Number(pixiSummary.staticPacketItemCacheHitRate) : null,
      pixiStaticChunkDrawDataCacheHitRate: pixiSummary && pixiSummary.staticChunkDrawDataCacheHitRate != null ? Number(pixiSummary.staticChunkDrawDataCacheHitRate) : null,
      residualWorkVerdict: residualVerdict,
      residualCanvas2dStillHeavy: drawMs >= 8 || dynamicCount > 128 || staticFallbackPacketCount > 0
    };
    var signature = [
      payload.framePlanId,
      Math.floor(Number(payload.drawRenderableOrderMs || 0) / 4),
      payload.staticPacketCanvasFallbackPacketCount,
      payload.dynamicRenderableCount,
      payload.residualWorkVerdict,
      payload.pixiChunkRenderTextureMissCount
    ].join('|');
    var t = nowMs(deps);
    var force = payload.residualCanvas2dStillHeavy || staticFallbackPacketCount > 0 || Number(loopBreakdown.pixiStaticWorldBeginFrameWallMs || 0) >= 8;
    if (!force && signature === lastResidualCanvas2dForensicsSignature && (t - Number(lastResidualCanvas2dForensicsEmitAt || 0)) < 1200) return;
    lastResidualCanvas2dForensicsSignature = signature;
    lastResidualCanvas2dForensicsEmitAt = t;
    try {
      if (adapterApi) adapterApi.__lastPixiResidualCanvas2dForensics = payload;
      if (deps && typeof deps.emitRendererProfile === 'function') deps.emitRendererProfile('PIXI-RESIDUAL-CANVAS2D-FORENSICS', payload);
      else if (window.console && typeof window.console.log === 'function') window.console.log('[pixi-migration][step=' + STEP + '][PIXI-RESIDUAL-CANVAS2D-FORENSICS]', payload);
    } catch (_) {}
  }

  function publishFrameDrawStats(deps, order, stats, drawMs) {
    try {
      if (deps && typeof deps.setLastFrameDrawMs === 'function') deps.setLastFrameDrawMs(drawMs);
      if (deps && typeof deps.setLastFrameDrawStats === 'function') {
        deps.setLastFrameDrawStats({
          drawMs: drawMs,
          renderableCount: Number(order.length || 0),
          staticPacketCount: Number(stats.staticPacketCount || 0),
          dynamicRenderableCount: Number(stats.dynamicRenderableCount || 0),
          staticBitmapRunCount: Number(stats.staticBitmapRunCount || 0)
        });
      }
      var buildStats = deps && typeof deps.getLastMainRenderableBuildStats === 'function' ? deps.getLastMainRenderableBuildStats() : null;
      if (buildStats && deps && typeof deps.maybeLogFrameWorkBreakdown === 'function') {
        var camera = deps && typeof deps.getCamera === 'function' ? deps.getCamera() : null;
        deps.maybeLogFrameWorkBreakdown({
          cameraX: Number(camera && camera.x || 0),
          cameraY: Number(camera && camera.y || 0),
          zoom: Number(buildStats.zoom || (typeof deps.getMainEditorZoomValueForRender === 'function' ? deps.getMainEditorZoomValueForRender() : 1)),
          visibleChunkCount: Number(buildStats.visibleChunkCount || buildStats.visibleStaticChunkCount || 0),
          visibleStaticChunkCount: Number(buildStats.visibleStaticChunkCount || 0),
          visibleStaticPacketCount: Number(buildStats.visibleStaticPacketCount || 0),
          staticPacketMergeMs: Number(buildStats.staticPacketMergeMs || 0),
          staticPacketProjectMs: Number(buildStats.staticPacketProjectMs || 0),
          staticPacketSortMs: Number(buildStats.staticPacketSortMs || 0),
          staticPacketDrawPrepMs: Number(buildStats.staticPacketDrawPrepMs || 0),
          dynamicObjectCount: Number(buildStats.dynamicObjectCount || 0),
          dynamicObjectBuildMs: Number(buildStats.dynamicBuildMs || 0),
          drawRenderableOrderMs: Number(drawMs || 0),
          finalDrawMs: Number(drawMs || 0),
          frameBuildMs: Number(buildStats.frameBuildMs || 0),
          staticBitmapRunCount: Number(stats.staticBitmapRunCount || 0),
          staticBitmapRunBuildMs: Number(stats.staticBitmapRunBuildMs || 0),
          staticBitmapRunDrawMs: Number(stats.staticBitmapRunDrawMs || 0)
        });
      }
    } catch (_) {}
  }

  function drawRenderableOrder(adapterApi, deps, order, meta) {
    meta = meta || {};
    order = Array.isArray(order) ? order : [];
    var seenDrawHits = Object.create(null);
    var pixiStaticBeginFrameStartAt = nowMs(deps);
    var pixiStaticWorldPacketSummary = beginPixiStaticWorldPacketFrame(order, meta, deps);
    meta.__pixiStaticWorldFrameOk = !!(pixiStaticWorldPacketSummary && pixiStaticWorldPacketSummary.ok === true && pixiStaticWorldPacketSummary.pixiDrawsStaticWorldPackets === true);
    var pixiStaticWorldBeginFrameWallMs = Math.max(0, nowMs(deps) - pixiStaticBeginFrameStartAt);
    meta.__forceCanvas2dPlayerForDepthInterleavedDynamics = false;
    var largeSceneFrameplanDiagnostics = buildLargeSceneFrameplanDiagnostics(order, meta, deps, pixiStaticWorldPacketSummary, pixiStaticWorldBeginFrameWallMs);
    if (largeSceneFrameplanDiagnostics) largeSceneFrameplanDiagnostics.forceCanvas2dPlayerForDepthInterleavedDynamics = false;
    maybeEmitLargeSceneFrameplanDiagnostics(deps, largeSceneFrameplanDiagnostics);
    assertPixiStaticWorldDrawsOrThrow(deps, largeSceneFrameplanDiagnostics, pixiStaticWorldPacketSummary);
    var drawStartAt = nowMs(deps);
    var stats = createDrawStats();
    var canvasTiming = createCanvasTiming();
    var restoreCanvasMethods = installCanvasTimingHooks(deps, canvasTiming);
    var debugState = deps && typeof deps.getDebugState === 'function' ? deps.getDebugState() : null;
    if (adapterApi) adapterApi.__inDrawRenderableOrder = true;
    try {
      if (debugState) debugState.renderStep = 'draw-renderables';
      var firstDynamicIndex = -1;
      for (var firstDynamicScanIndex = 0; firstDynamicScanIndex < order.length; firstDynamicScanIndex += 1) {
        var firstDynamicCandidate = order[firstDynamicScanIndex];
        if (!(firstDynamicCandidate && firstDynamicCandidate.kind === 'static-world-face-packet')) {
          firstDynamicIndex = firstDynamicScanIndex;
          break;
        }
      }
      meta.firstDynamicIndex = firstDynamicIndex;
      var i = 0;
      while (i < order.length) {
        var renderable = order[i];
        var isStaticWorldPacket = !!(renderable && renderable.kind === 'static-world-face-packet');
        if (isStaticWorldPacket) {
          var runStartIndex = i;
          var staticPackets = [];
          while (i < order.length) {
            var maybePacket = order[i];
            if (!(maybePacket && maybePacket.kind === 'static-world-face-packet')) break;
            staticPackets.push(maybePacket);
            var packetKind = getRenderableKind(maybePacket);
            stats.staticPacketCount += 1;
            stats.staticPacketKindCounts[packetKind] = Number(stats.staticPacketKindCounts[packetKind] || 0) + 1;
            i += 1;
          }
          drawStaticPacketRun(deps, stats, staticPackets, meta, runStartIndex);
          continue;
        }
        drawDynamicRenderable(deps, stats, seenDrawHits, renderable, i, order.length, meta, debugState);
        i += 1;
      }
      var drawMsRaw = Math.max(0, nowMs(deps) - drawStartAt);
      var drawMs = safeFixed(deps, drawMsRaw);
      var loopBreakdown = buildLoopBreakdown(deps, order, meta, stats, canvasTiming, drawMs);
      loopBreakdown.step = 'PXM-07.18K0G-optimization-placement-audit';
      loopBreakdown.pixiStaticWorldPacketSummary = pixiStaticWorldPacketSummary || null;
      loopBreakdown.pixiStaticWorldBeginFrameWallMs = safeFixed(deps, pixiStaticWorldBeginFrameWallMs);
      loopBreakdown.pixiStaticWorldBeginFrameOk = !!(pixiStaticWorldPacketSummary && pixiStaticWorldPacketSummary.ok === true);
      loopBreakdown.pixiDrawsStaticWorldPackets = !!(pixiStaticWorldPacketSummary && pixiStaticWorldPacketSummary.pixiDrawsStaticWorldPackets === true);
      loopBreakdown.pixiStaticWorldFrameOkForPlayerAdoption = meta.__pixiStaticWorldFrameOk === true;
      loopBreakdown.pixiStaticWorldFallbackReason = pixiStaticWorldPacketSummary && pixiStaticWorldPacketSummary.fallbackReason ? String(pixiStaticWorldPacketSummary.fallbackReason) : '';
      loopBreakdown.pixiStaticWorldActualDrawUnitCount = pixiStaticWorldPacketSummary && pixiStaticWorldPacketSummary.actualDrawUnitCount != null ? Number(pixiStaticWorldPacketSummary.actualDrawUnitCount) : null;
      loopBreakdown.pixiStaticWorldActualCacheSpriteDrawCount = pixiStaticWorldPacketSummary && pixiStaticWorldPacketSummary.actualCacheSpriteDrawCount != null ? Number(pixiStaticWorldPacketSummary.actualCacheSpriteDrawCount) : null;
      loopBreakdown.pixiStaticWorldActualGraphicsPacketDrawCount = pixiStaticWorldPacketSummary && pixiStaticWorldPacketSummary.actualGraphicsPacketDrawCount != null ? Number(pixiStaticWorldPacketSummary.actualGraphicsPacketDrawCount) : null;
      loopBreakdown.largeSceneFrameplanDiagnostics = largeSceneFrameplanDiagnostics || null;
      noteCanvas2dSharedOptimizationUse('projected-geometry-cache', {
        stage: 'drawRenderableOrder.after-loop',
        canvas2dConsumerPath: 'shared-projected-geometry-source-plus-existing-canvas2d-path2d-consumer',
        statsSummary: 'geometryHits=' + String(stats.staticPacketGeometryCacheHitCount || 0) + ',geometryMisses=' + String(stats.staticPacketGeometryCacheMissCount || 0),
        runtimeDetail: {
          staticPacketGeometryCacheHitCount: Number(stats.staticPacketGeometryCacheHitCount || 0),
          staticPacketGeometryCacheMissCount: Number(stats.staticPacketGeometryCacheMissCount || 0),
          staticPacketOverlayCacheHitCount: Number(stats.staticPacketOverlayCacheHitCount || 0),
          staticPacketOverlayCacheMissCount: Number(stats.staticPacketOverlayCacheMissCount || 0)
        }
      });
      noteCanvas2dSharedOptimizationUse('static-world-chunk-cache', {
        stage: 'drawRenderableOrder.after-loop',
        canvas2dConsumerPath: 'shared-static-world-chunk-source-plus-existing-framePlan-order-consumer',
        statsSummary: 'staticPacketCount=' + String(stats.staticPacketCount || 0) + ',renderableCount=' + String(order.length || 0),
        runtimeDetail: {
          staticPacketCount: Number(stats.staticPacketCount || 0),
          renderableCount: Number(order.length || 0)
        }
      });
      noteCanvas2dSharedOptimizationUse('material-color-cache', {
        stage: 'drawRenderableOrder.after-loop',
        canvas2dConsumerPath: 'shared-packet-material-color-source-plus-existing-canvas2d-fill-stroke-consumer',
        statsSummary: 'staticPacketCount=' + String(stats.staticPacketCount || 0),
        runtimeDetail: { staticPacketCount: Number(stats.staticPacketCount || 0) }
      });
      noteCanvas2dSharedOptimizationUse('shadow-overlay-cache', {
        stage: 'drawRenderableOrder.after-loop',
        canvas2dConsumerPath: 'shared-shadow-overlay-source-plus-existing-canvas2d-overlay-consumer',
        statsSummary: 'overlayHits=' + String(stats.staticPacketOverlayCacheHitCount || 0) + ',overlayMisses=' + String(stats.staticPacketOverlayCacheMissCount || 0),
        runtimeDetail: {
          staticPacketOverlayCacheHitCount: Number(stats.staticPacketOverlayCacheHitCount || 0),
          staticPacketOverlayCacheMissCount: Number(stats.staticPacketOverlayCacheMissCount || 0)
        }
      });
      emitDrawLoopBreakdown(adapterApi, deps, loopBreakdown);
      emitPixiResidualCanvas2dForensics(adapterApi, deps, loopBreakdown);
      publishFrameDrawStats(deps, order, stats, drawMs);
      return order;
    } finally {
      restoreCanvasTimingHooks(restoreCanvasMethods);
      if (adapterApi) adapterApi.__inDrawRenderableOrder = false;
    }
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    getRenderableKind: getRenderableKind,
    getRenderableDrawPosition: getRenderableDrawPosition,
    createCanvasTiming: createCanvasTiming,
    createStaticRunStats: createStaticRunStats,
    createDrawStats: createDrawStats,
    buildLoopBreakdown: buildLoopBreakdown,
    publishFrameDrawStats: publishFrameDrawStats,
    drawRenderableOrder: drawRenderableOrder
  };

  try {
    window.__CANVAS2D_RENDERABLE_ORDER_DRAW__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.canvas2dRenderableOrderDraw', api, { owner: OWNER, phase: PHASE });
      window.__APP_NAMESPACE.bind('renderer.diagnostics.canvas2dRenderableOrderDraw', api, { owner: OWNER, phase: PHASE });
    } else {
      window.App = window.App || {};
      window.App.renderer = window.App.renderer || {};
      window.App.renderer.canvas2dRenderableOrderDraw = api;
      window.App.renderer.diagnostics = window.App.renderer.diagnostics || {};
      window.App.renderer.diagnostics.canvas2dRenderableOrderDraw = api;
    }
  } catch (_) {
    window.__CANVAS2D_RENDERABLE_ORDER_DRAW__ = api;
  }
})();
