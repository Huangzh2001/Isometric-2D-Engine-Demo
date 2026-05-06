(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/presentation/render/renderer/canvas2d-renderable-order-draw.js';
  var PHASE = 'P11c-5';

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

  function drawStaticPacketRun(deps, stats, staticPackets, meta, runStartIndex) {
    var staticRunStartAt = nowMs(deps);
    var staticRunStats = createStaticRunStats();
    var usedBitmapRun = false;
    if (staticPackets.length >= 24 && deps && typeof deps.drawStaticPacketRunBitmap === 'function') {
      usedBitmapRun = deps.drawStaticPacketRunBitmap(staticPackets, {
        source: meta.source || 'unknown',
        framePlanId: meta.framePlanId || null,
        currentViewRotation: meta.currentViewRotation != null ? meta.currentViewRotation : 0,
        runStartIndex: runStartIndex
      }, staticRunStats) === true;
    }
    if (!usedBitmapRun) {
      if (deps && typeof deps.drawStaticPacketRunFallback === 'function') {
        deps.drawStaticPacketRunFallback(staticPackets, {
          source: meta.source || 'unknown',
          framePlanId: meta.framePlanId || null,
          currentViewRotation: meta.currentViewRotation != null ? meta.currentViewRotation : 0,
          runStartIndex: runStartIndex
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
      if (renderable && typeof renderable.draw === 'function') renderable.draw();
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
      topSlowRenderables: stats.topSlowRenderables.slice(0),
      staticPacketKindCounts: stats.staticPacketKindCounts,
      dynamicKindCounts: stats.dynamicKindCounts,
      drawRenderableOrderMs: drawMs
    };
  }

  function emitDrawLoopBreakdown(adapterApi, deps, loopBreakdown) {
    if (adapterApi) adapterApi.__lastDrawLoopBreakdown = loopBreakdown;
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
    var drawStartAt = nowMs(deps);
    var stats = createDrawStats();
    var canvasTiming = createCanvasTiming();
    var restoreCanvasMethods = installCanvasTimingHooks(deps, canvasTiming);
    var debugState = deps && typeof deps.getDebugState === 'function' ? deps.getDebugState() : null;
    if (adapterApi) adapterApi.__inDrawRenderableOrder = true;
    try {
      if (debugState) debugState.renderStep = 'draw-renderables';
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
      emitDrawLoopBreakdown(adapterApi, deps, loopBreakdown);
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
