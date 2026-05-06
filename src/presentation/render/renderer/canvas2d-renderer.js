(function () {
  if (typeof window === 'undefined') return;

  function getCanvas2dFrameDiagnosticsApi() {
    try {
      if (window.__CANVAS2D_FRAME_DIAGNOSTICS__) return window.__CANVAS2D_FRAME_DIAGNOSTICS__;
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath('renderer.canvas2dFrameDiagnostics');
      }
    } catch (_) {}
    return null;
  }

  function requireCanvas2dFrameDiagnosticsApi() {
    var api = getCanvas2dFrameDiagnosticsApi();
    if (!api) throw new Error('Missing Canvas2D frame diagnostics owner: src/presentation/render/renderer/canvas2d-frame-diagnostics.js');
    return api;
  }

  function getCanvas2dZoomPreviewStateApi() {
    try {
      if (window.__CANVAS2D_ZOOM_PREVIEW_STATE__) return window.__CANVAS2D_ZOOM_PREVIEW_STATE__;
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath('renderer.canvas2dZoomPreviewState');
      }
    } catch (_) {}
    return null;
  }

  function requireCanvas2dZoomPreviewStateApi() {
    var api = getCanvas2dZoomPreviewStateApi();
    if (!api) throw new Error('Missing Canvas2D zoom preview state owner: src/presentation/render/renderer/canvas2d-zoom-preview-state.js');
    return api;
  }

  function getCanvas2dStaticBitmapRunCacheApi() {
    try {
      if (window.__CANVAS2D_STATIC_BITMAP_RUN_CACHE__) return window.__CANVAS2D_STATIC_BITMAP_RUN_CACHE__;
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath('renderer.canvas2dStaticBitmapRunCache');
      }
    } catch (_) {}
    return null;
  }

  function requireCanvas2dStaticBitmapRunCacheApi() {
    var api = getCanvas2dStaticBitmapRunCacheApi();
    if (!api) throw new Error('Missing Canvas2D static bitmap run cache owner: src/presentation/render/renderer/canvas2d-static-bitmap-run-cache.js');
    return api;
  }

  function getCanvas2dStaticPacketFallbackDrawApi() {
    try {
      if (window.__CANVAS2D_STATIC_PACKET_FALLBACK_DRAW__) return window.__CANVAS2D_STATIC_PACKET_FALLBACK_DRAW__;
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath('renderer.canvas2dStaticPacketFallbackDraw');
      }
    } catch (_) {}
    return null;
  }

  function requireCanvas2dStaticPacketFallbackDrawApi() {
    var api = getCanvas2dStaticPacketFallbackDrawApi();
    if (!api) throw new Error('Missing Canvas2D static packet fallback draw owner: src/presentation/render/renderer/canvas2d-static-packet-fallback-draw.js');
    return api;
  }


  function getCanvas2dRenderableOrderDrawApi() {
    try {
      if (window.__CANVAS2D_RENDERABLE_ORDER_DRAW__) return window.__CANVAS2D_RENDERABLE_ORDER_DRAW__;
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath('renderer.canvas2dRenderableOrderDraw');
      }
    } catch (_) {}
    return null;
  }

  function requireCanvas2dRenderableOrderDrawApi() {
    var api = getCanvas2dRenderableOrderDrawApi();
    if (!api) throw new Error('Missing Canvas2D renderable order draw owner: src/presentation/render/renderer/canvas2d-renderable-order-draw.js');
    return api;
  }


  function getCanvas2dOverlayHudPassApi() {
    try {
      if (window.__CANVAS2D_OVERLAY_HUD_PASS__) return window.__CANVAS2D_OVERLAY_HUD_PASS__;
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath('renderer.canvas2dOverlayHudPass');
      }
    } catch (_) {}
    return null;
  }

  function requireCanvas2dOverlayHudPassApi() {
    var api = getCanvas2dOverlayHudPassApi();
    if (!api) throw new Error('Missing Canvas2D overlay/HUD pass owner: src/presentation/render/renderer/canvas2d-overlay-hud-pass.js');
    return api;
  }

  function getCanvas2dInteractionPipelineCaptureApi() {
    try {
      if (window.__CANVAS2D_INTERACTION_PIPELINE_CAPTURE__) return window.__CANVAS2D_INTERACTION_PIPELINE_CAPTURE__;
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath('renderer.canvas2dInteractionPipelineCapture');
      }
    } catch (_) {}
    return null;
  }

  function requireCanvas2dInteractionPipelineCaptureApi() {
    var api = getCanvas2dInteractionPipelineCaptureApi();
    if (!api) throw new Error('Missing Canvas2D interaction pipeline capture owner: src/presentation/render/renderer/canvas2d-interaction-pipeline-capture.js');
    return api;
  }

  function getCanvas2dFramePipelineApi() {
    try {
      if (window.__CANVAS2D_FRAME_PIPELINE__) return window.__CANVAS2D_FRAME_PIPELINE__;
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath('renderer.canvas2dFramePipeline');
      }
    } catch (_) {}
    return null;
  }

  function requireCanvas2dFramePipelineApi() {
    var api = getCanvas2dFramePipelineApi();
    if (!api) throw new Error('Missing Canvas2D frame pipeline owner: src/presentation/render/renderer/canvas2d-frame-pipeline.js');
    return api;
  }

  function getCanvas2dActiveRenderFrameApi() {
    try {
      if (window.__CANVAS2D_ACTIVE_RENDER_FRAME__) return window.__CANVAS2D_ACTIVE_RENDER_FRAME__;
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath('renderer.canvas2dActiveRenderFrame');
      }
    } catch (_) {}
    return null;
  }

  function requireCanvas2dActiveRenderFrameApi() {
    var api = getCanvas2dActiveRenderFrameApi();
    if (!api) throw new Error('Missing Canvas2D active render frame owner: src/presentation/render/renderer/canvas2d-active-render-frame.js');
    return api;
  }

  function emitP5(kind, message, extra) {
    return requireCanvas2dFrameDiagnosticsApi().emitP5(kind, message, extra);
  }

  function getNamespacePath(path) {
    try {
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath(path);
      }
    } catch (_) {}
    return undefined;
  }

  function resolvePassApi() {
    var api = getNamespacePath('renderer.passApi');
    if (api) return api;
    return window.App && window.App.renderer ? window.App.renderer.passApi : null;
  }

  function resolveRenderablesApi() {
    var api = getNamespacePath('renderer.renderablesApi');
    if (api) return api;
    return window.App && window.App.renderer ? window.App.renderer.renderablesApi : null;
  }

  function recordDrawDiagnostic(kind, payload) {
    return requireCanvas2dFrameDiagnosticsApi().recordDrawDiagnostic(kind, payload);
  }

  function emitRendererProfile(tag, payload) {
    return requireCanvas2dFrameDiagnosticsApi().emitRendererProfile(tag, payload);
  }

  function safeFixed(value) {
    return requireCanvas2dFrameDiagnosticsApi().safeFixed(value);
  }

  function beginFunctionBreakdownFrame() {
    return requireCanvas2dFrameDiagnosticsApi().beginFunctionBreakdownFrame();
  }

  function getFunctionBreakdownFrame() {
    return requireCanvas2dFrameDiagnosticsApi().getFunctionBreakdownFrame();
  }

  function getLastBaseWorldPassesBreakdown() {
    return requireCanvas2dFrameDiagnosticsApi().getLastBaseWorldPassesBreakdown();
  }

  function cloneSimpleObject(obj) {
    return requireCanvas2dFrameDiagnosticsApi().cloneSimpleObject(obj);
  }

  function isDetailedRendererProfilingEnabled() {
    return requireCanvas2dFrameDiagnosticsApi().isDetailedRendererProfilingEnabled();
  }

  function shouldEmitProfile(signatureKey, signature, minGapMs, options) {
    return requireCanvas2dFrameDiagnosticsApi().shouldEmitProfile(adapterApi, signatureKey, signature, minGapMs, options);
  }

  function getRenderableKind(renderable) {
    return requireCanvas2dRenderableOrderDrawApi().getRenderableKind(renderable);
  }

  function getRenderableDrawPosition(renderable) {
    return requireCanvas2dRenderableOrderDrawApi().getRenderableDrawPosition(createCanvas2dRenderableOrderDrawDepsForRenderer(), renderable);
  }


  function createRendererOffscreenCanvas(width, height) {
    var w = Math.max(1, Math.ceil(Number(width || 1)));
    var h = Math.max(1, Math.ceil(Number(height || 1)));
    var canvasEl = null;
    try {
      if (typeof OffscreenCanvas !== 'undefined') canvasEl = new OffscreenCanvas(w, h);
    } catch (_) {}
    if (!canvasEl && typeof document !== 'undefined' && document && typeof document.createElement === 'function') {
      canvasEl = document.createElement('canvas');
      canvasEl.width = w;
      canvasEl.height = h;
    }
    return canvasEl;
  }

  function createCanvas2dStaticBitmapRunCacheDepsForRenderer() {
    return {
      owner: 'src/presentation/render/renderer/canvas2d-renderer.js',
      createOffscreenCanvas: createRendererOffscreenCanvas,
      getContext: function () { return (typeof ctx !== 'undefined' && ctx) ? ctx : null; },
      getCamera: function () { return (typeof camera !== 'undefined' && camera) ? camera : null; },
      getSettings: function () { return (typeof settings !== 'undefined' && settings) ? settings : {}; },
      getActiveCameraInteractionType: function () { try { return window.__habboActiveCameraInteractionType || null; } catch (_) { return null; } },
      getActiveCameraInteractionId: function () { try { return window.__habboActiveCameraInteractionId || null; } catch (_) { return null; } },
      getCameraSettleReuseState: function () { try { return window.__habboCameraSettleReuseState || null; } catch (_) { return null; } },
      getTerrainBoundaryDebugSignature: function () {
        try {
          if (typeof getTerrainTopBoundaryRenderDebugSignature === 'function') return getTerrainTopBoundaryRenderDebugSignature();
          if (typeof window !== 'undefined' && window.__TERRAIN_BOUNDARY_DEBUG_RED__ === true) return 'boundary-debug-red:1';
          if (typeof localStorage !== 'undefined') {
            var value = localStorage.getItem('terrainBoundaryDebugRed');
            return (value === '1' || value === 'true') ? 'boundary-debug-red:1' : 'boundary-debug-red:0';
          }
        } catch (_) {}
        return 'boundary-debug-red:0';
      },
      getStaticWorldPacketProjectedGeometry: function (packet, currentViewRotation) {
        return (typeof getStaticWorldPacketProjectedGeometry === 'function')
          ? getStaticWorldPacketProjectedGeometry(packet, currentViewRotation)
          : null;
      },
      drawFaceShadowOverlaysNoCamera: function (surfaceCtx, pointsNoCamera, overlaysNoCamera, offsetX, offsetY) {
        if (typeof drawFaceShadowOverlaysNoCamera === 'function') return drawFaceShadowOverlaysNoCamera(surfaceCtx, pointsNoCamera, overlaysNoCamera, offsetX, offsetY);
        return undefined;
      },
      drawTerrainTopBoundarySegmentsForPacket: function (surfaceCtx, packet, projected) {
        if (typeof drawTerrainTopBoundarySegmentsForPacket === 'function') return drawTerrainTopBoundarySegmentsForPacket(surfaceCtx, packet, projected);
        return undefined;
      },
      now: function () { return (typeof perfNow === 'function') ? perfNow() : Date.now(); },
      safeFixed: safeFixed
    };
  }

  function createCanvas2dStaticPacketFallbackDrawDepsForRenderer() {
    return {
      owner: 'src/presentation/render/renderer/canvas2d-renderer.js',
      now: function () { return (typeof perfNow === 'function') ? perfNow() : Date.now(); },
      safeFixed: safeFixed,
      getRenderableKind: getRenderableKind,
      drawStaticWorldFacePacket: function (renderable) {
        if (typeof drawStaticWorldFacePacket === 'function') return drawStaticWorldFacePacket(renderable);
        return undefined;
      },
      drawFaceDebugOverlayRenderable: function (renderable, index) {
        if (typeof drawFaceDebugOverlayRenderable === 'function') return drawFaceDebugOverlayRenderable(renderable, index);
        return undefined;
      }
    };
  }

  function getStaticBitmapCache() {
    return requireCanvas2dStaticBitmapRunCacheApi().getStaticBitmapCache(adapterApi);
  }

  function getStaticBitmapReuseCache() {
    return requireCanvas2dStaticBitmapRunCacheApi().getStaticBitmapReuseCache(adapterApi);
  }

  function getActiveCameraInteractionType() {
    return requireCanvas2dStaticBitmapRunCacheApi().getActiveCameraInteractionType(createCanvas2dStaticBitmapRunCacheDepsForRenderer());
  }

  function getActiveCameraInteractionId() {
    return requireCanvas2dStaticBitmapRunCacheApi().getActiveCameraInteractionId(createCanvas2dStaticBitmapRunCacheDepsForRenderer());
  }

  function getCameraSettleReuseState() {
    return requireCanvas2dStaticBitmapRunCacheApi().getCameraSettleReuseState(createCanvas2dStaticBitmapRunCacheDepsForRenderer());
  }

  function shouldUseDeferredZoomSettleReuse() {
    return requireCanvas2dStaticBitmapRunCacheApi().shouldUseDeferredZoomSettleReuse(createCanvas2dStaticBitmapRunCacheDepsForRenderer());
  }

  function getStaticBitmapInteractionState() {
    return requireCanvas2dStaticBitmapRunCacheApi().getStaticBitmapInteractionState(adapterApi, createCanvas2dStaticBitmapRunCacheDepsForRenderer());
  }

  function getTerrainBoundaryDebugSignatureForRenderer() {
    return createCanvas2dStaticBitmapRunCacheDepsForRenderer().getTerrainBoundaryDebugSignature();
  }

  function buildStaticPacketRunInteractionSlotKey(meta) {
    return requireCanvas2dStaticBitmapRunCacheApi().buildStaticPacketRunInteractionSlotKey(meta, createCanvas2dStaticBitmapRunCacheDepsForRenderer());
  }

  function registerStaticPacketRunInteractionSlotEntry(meta, entry) {
    return requireCanvas2dStaticBitmapRunCacheApi().registerStaticPacketRunInteractionSlotEntry(adapterApi, createCanvas2dStaticBitmapRunCacheDepsForRenderer(), meta, entry);
  }

  function findStaticPacketRunInteractionSlotEntry(meta) {
    return requireCanvas2dStaticBitmapRunCacheApi().findStaticPacketRunInteractionSlotEntry(adapterApi, createCanvas2dStaticBitmapRunCacheDepsForRenderer(), meta);
  }

  function shouldUseStaticBitmapRunInteractionReuse(meta) {
    return requireCanvas2dStaticBitmapRunCacheApi().shouldUseStaticBitmapRunInteractionReuse(createCanvas2dStaticBitmapRunCacheDepsForRenderer(), meta);
  }

  function pruneStaticBitmapCache(maxEntries) {
    return requireCanvas2dStaticBitmapRunCacheApi().pruneStaticBitmapCache(adapterApi, maxEntries);
  }

  function createCanvas2dZoomPreviewDepsForRenderer() {
    return {
      owner: 'src/presentation/render/renderer/canvas2d-renderer.js',
      createOffscreenCanvas: createRendererOffscreenCanvas,
      getCanvas: function () { return (typeof canvas !== 'undefined' && canvas) ? canvas : null; },
      getContext: function () { return (typeof ctx !== 'undefined' && ctx) ? ctx : null; },
      getViewWidth: function () { return (typeof VIEW_W !== 'undefined') ? VIEW_W : 1; },
      getViewHeight: function () { return (typeof VIEW_H !== 'undefined') ? VIEW_H : 1; },
      getCamera: function () { return (typeof camera !== 'undefined' && camera) ? camera : null; },
      getCurrentZoom: function () { return (typeof getMainEditorZoomValueForRender === 'function') ? getMainEditorZoomValueForRender() : 1; },
      now: function () { return (typeof perfNow === 'function') ? perfNow() : Date.now(); },
      safeFixed: safeFixed,
      shouldEmitProfile: shouldEmitProfile,
      emitRendererProfile: emitRendererProfile
    };
  }

  function getZoomPreviewState() {
    return requireCanvas2dZoomPreviewStateApi().getZoomPreviewState(adapterApi);
  }

  function clearZoomPreviewState(reason) {
    return requireCanvas2dZoomPreviewStateApi().clearZoomPreviewState(adapterApi, createCanvas2dZoomPreviewDepsForRenderer(), reason);
  }

  function captureZoomPreviewFrame(meta) {
    return requireCanvas2dZoomPreviewStateApi().captureZoomPreviewFrame(adapterApi, createCanvas2dZoomPreviewDepsForRenderer(), meta);
  }

  function updateZoomPreviewState(meta) {
    return requireCanvas2dZoomPreviewStateApi().updateZoomPreviewState(adapterApi, createCanvas2dZoomPreviewDepsForRenderer(), meta);
  }

  function shouldUseZoomPreviewFastPath() {
    return requireCanvas2dZoomPreviewStateApi().shouldUseZoomPreviewFastPath(adapterApi, createCanvas2dZoomPreviewDepsForRenderer());
  }

  function drawZoomPreviewFastPath(meta) {
    return requireCanvas2dZoomPreviewStateApi().drawZoomPreviewFastPath(adapterApi, createCanvas2dZoomPreviewDepsForRenderer(), meta);
  }

  function mixHashString(hash, value) {
    return requireCanvas2dStaticBitmapRunCacheApi().mixHashString(hash, value);
  }

  function buildStaticPacketRunReuseKey(packets, meta) {
    return requireCanvas2dStaticBitmapRunCacheApi().buildStaticPacketRunReuseKey(packets, meta, createCanvas2dStaticBitmapRunCacheDepsForRenderer());
  }

  function buildStaticPacketRunBitmapSignature(packets, meta) {
    return requireCanvas2dStaticBitmapRunCacheApi().buildStaticPacketRunBitmapSignature(packets, meta, createCanvas2dStaticBitmapRunCacheDepsForRenderer());
  }

  function registerStaticPacketRunBitmapEntry(reuseKey, signature, entry) {
    return requireCanvas2dStaticBitmapRunCacheApi().registerStaticPacketRunBitmapEntry(adapterApi, reuseKey, signature, entry);
  }

  function findReusableStaticPacketRunBitmapEntry(reuseKey, signature, meta) {
    return requireCanvas2dStaticBitmapRunCacheApi().findReusableStaticPacketRunBitmapEntry(adapterApi, createCanvas2dStaticBitmapRunCacheDepsForRenderer(), reuseKey, signature, meta);
  }

  function collectStaticPacketRunGeometry(packets, meta, stats) {
    return requireCanvas2dStaticBitmapRunCacheApi().collectStaticPacketRunGeometry(createCanvas2dStaticBitmapRunCacheDepsForRenderer(), packets, meta, stats);
  }

  function buildStaticPacketRunBitmap(geometry, meta) {
    return requireCanvas2dStaticBitmapRunCacheApi().buildStaticPacketRunBitmap(createCanvas2dStaticBitmapRunCacheDepsForRenderer(), geometry, meta);
  }

  function drawStaticPacketRunBitmapEntry(entry, meta, stats, drawMode) {
    return requireCanvas2dStaticBitmapRunCacheApi().drawStaticPacketRunBitmapEntry(createCanvas2dStaticBitmapRunCacheDepsForRenderer(), entry, meta, stats, drawMode);
  }

  function drawStaticPacketRunBitmap(packets, meta, stats) {
    return requireCanvas2dStaticBitmapRunCacheApi().drawStaticPacketRunBitmap(adapterApi, createCanvas2dStaticBitmapRunCacheDepsForRenderer(), packets, meta, stats);
  }

  function drawStaticPacketRunFallback(packets, meta, stats, trackSlowRenderable) {
    return requireCanvas2dStaticPacketFallbackDrawApi().drawStaticPacketRunFallback(
      createCanvas2dStaticPacketFallbackDrawDepsForRenderer(),
      packets,
      meta,
      stats,
      trackSlowRenderable
    );
  }

  function createCanvas2dRenderableOrderDrawDepsForRenderer() {
    return {
      owner: 'src/presentation/render/renderer/canvas2d-renderer.js',
      getContext: function () { return (typeof ctx !== 'undefined' && ctx) ? ctx : null; },
      getDebugState: function () { return (typeof debugState !== 'undefined' && debugState) ? debugState : null; },
      getCamera: function () { return (typeof camera !== 'undefined' && camera) ? camera : null; },
      now: function () { return (typeof perfNow === 'function') ? perfNow() : Date.now(); },
      safeFixed: safeFixed,
      averageScreenPoint: function (points) { return (typeof averageScreenPoint === 'function') ? averageScreenPoint(points) : null; },
      shouldEmitProfile: function (signatureKey, signature, minGapMs, options) { return shouldEmitProfile(signatureKey, signature, minGapMs, options); },
      emitRendererProfile: emitRendererProfile,
      recordDrawDiagnostic: recordDrawDiagnostic,
      detailLog: function (message) { if (typeof detailLog === 'function') return detailLog(message); return undefined; },
      drawStaticPacketRunBitmap: function (packets, meta, stats) { return drawStaticPacketRunBitmap(packets, meta, stats); },
      drawStaticPacketRunFallback: function (packets, meta, stats, trackSlowRenderable) { return drawStaticPacketRunFallback(packets, meta, stats, trackSlowRenderable); },
      drawCachedVoxelRenderable: function (renderable) { if (typeof drawCachedVoxelRenderable === 'function') return drawCachedVoxelRenderable(renderable); return undefined; },
      drawFaceDebugOverlayRenderable: function (renderable, index) { if (typeof drawFaceDebugOverlayRenderable === 'function') return drawFaceDebugOverlayRenderable(renderable, index); return undefined; },
      getLastMainRenderableBuildStats: function () { return (typeof __lastMainRenderableBuildStats !== 'undefined') ? __lastMainRenderableBuildStats : null; },
      setLastFrameDrawMs: function (value) { if (typeof __lastFrameDrawMs !== 'undefined') __lastFrameDrawMs = value; },
      setLastFrameDrawStats: function (value) { if (typeof __lastFrameDrawStats !== 'undefined') __lastFrameDrawStats = value; },
      maybeLogFrameWorkBreakdown: function (payload) { if (typeof maybeLogFrameWorkBreakdown === 'function') return maybeLogFrameWorkBreakdown(payload); return undefined; },
      getMainEditorZoomValueForRender: function () { return (typeof getMainEditorZoomValueForRender === 'function') ? getMainEditorZoomValueForRender() : 1; }
    };
  }

  function drawRenderableOrder(order, meta) {
    return requireCanvas2dRenderableOrderDrawApi().drawRenderableOrder(adapterApi, createCanvas2dRenderableOrderDrawDepsForRenderer(), order, meta);
  }


  function createCanvas2dOverlayHudPassDepsForRenderer() {
    return {
      getContext: function () { return (typeof ctx !== 'undefined' && ctx) ? ctx : null; },
      getDebugState: function () { return (typeof debugState !== 'undefined' && debugState) ? debugState : null; },
      getEditor: function () { return (typeof editor !== 'undefined' && editor) ? editor : {}; },
      getSettings: function () { return (typeof settings !== 'undefined' && settings) ? settings : {}; },
      getInstances: function () { return (typeof instances !== 'undefined' && instances) ? instances : []; },
      getBoxes: function () { return (typeof boxes !== 'undefined' && boxes) ? boxes : []; },
      getPlayer: function () { return (typeof player !== 'undefined' && player) ? player : {}; },
      getShowPlayer: function () { return (typeof SHOW_PLAYER !== 'undefined') ? !!SHOW_PLAYER : false; },
      getShowDebug: function () { return (typeof showDebug !== 'undefined') ? !!showDebug : false; },
      getLightTypeLabels: function () { return (typeof LIGHT_TYPE_LABELS !== 'undefined' && LIGHT_TYPE_LABELS) ? LIGHT_TYPE_LABELS : {}; },
      getActiveLightId: function () { return (typeof activeLightId !== 'undefined') ? activeLightId : null; },
      getLightingRenderLights: function () { return (typeof getLightingRenderLights === 'function') ? (getLightingRenderLights() || []) : []; },
      getShadowProbeState: function () { return (typeof shadowProbeState !== 'undefined' && shadowProbeState) ? shadowProbeState : null; },
      currentProto: function () { return (typeof currentProto === 'function') ? currentProto() : { name: 'n/a', w: 0, d: 0, h: 0, voxels: [] }; },
      activeLight: function () { return (typeof activeLight === 'function') ? activeLight() : { name: 'n/a', type: 'n/a', x: 0, y: 0, z: 0, angle: 0, pitch: 0 }; },
      refreshInspectorPanels: function () { if (typeof refreshInspectorPanels === 'function') return refreshInspectorPanels(); return undefined; },
      drawSelectedInstanceHighlight: function () { if (typeof drawSelectedInstanceHighlight === 'function') return drawSelectedInstanceHighlight(); return undefined; },
      drawSelectedInstanceProjectionDebug: function () { if (typeof drawSelectedInstanceProjectionDebug === 'function') return drawSelectedInstanceProjectionDebug(); return undefined; },
      drawShadowProbeOverlay: function () { if (typeof drawShadowProbeOverlay === 'function') return drawShadowProbeOverlay(); return undefined; },
      drawDeleteHover: function () { if (typeof drawDeleteHover === 'function') return drawDeleteHover(); return undefined; },
      drawPlacementPreview: function () { if (typeof drawPlacementPreview === 'function') return drawPlacementPreview(); return undefined; },
      renderLightingGlow: function () { if (typeof renderLightingGlow === 'function') return renderLightingGlow(); return undefined; },
      drawLightingBulb: function (light, active) { if (typeof drawLightingBulb === 'function') return drawLightingBulb(light, active); return undefined; },
      drawLightingAxes: function () { if (typeof drawLightingAxes === 'function') return drawLightingAxes(); return undefined; },
      drawHabboDebugOverlay: function () { if (typeof drawHabboDebugOverlay === 'function') return drawHabboDebugOverlay(); return undefined; },
      shadowProbeMarkerLabel: function (marker) { return (typeof shadowProbeMarkerLabel === 'function') ? shadowProbeMarkerLabel(marker) : 'none'; },
      detailLog: function (message) { if (typeof detailLog === 'function') return detailLog(message); return undefined; }
    };
  }

  function drawOverlayPasses(meta) {
    return requireCanvas2dOverlayHudPassApi().drawOverlayPasses(adapterApi, createCanvas2dOverlayHudPassDepsForRenderer(), meta);
  }

  function drawHudPass(meta) {
    return requireCanvas2dOverlayHudPassApi().drawHudPass(adapterApi, createCanvas2dOverlayHudPassDepsForRenderer(), meta);
  }

  function createCanvas2dInteractionPipelineCaptureDepsForRenderer() {
    return {
      safeFixed: function (value) { return safeFixed(value); }
    };
  }

  function resetInteractionPipelineCapture(meta) {
    return requireCanvas2dInteractionPipelineCaptureApi().resetInteractionPipelineCapture(adapterApi, meta);
  }

  function recordInteractionPipelineCall(pipelineBreakdown) {
    return requireCanvas2dInteractionPipelineCaptureApi().recordInteractionPipelineCall(adapterApi, pipelineBreakdown);
  }

  function consumeInteractionPipelineCapture() {
    return requireCanvas2dInteractionPipelineCaptureApi().consumeInteractionPipelineCapture(adapterApi, createCanvas2dInteractionPipelineCaptureDepsForRenderer());
  }

  function createCanvas2dFramePipelineDepsForRenderer() {
    return {
      now: function () { return (typeof perfNow === 'function') ? perfNow() : Date.now(); },
      getContext: function () { return ctx; },
      beginFunctionBreakdownFrame: function () { return beginFunctionBreakdownFrame(); },
      getFunctionBreakdownFrame: function () { return getFunctionBreakdownFrame(); },
      drawZoomPreviewFastPath: function (meta) { return drawZoomPreviewFastPath(meta); },
      drawRenderableOrder: function (order, meta) { return drawRenderableOrder(order, meta); },
      drawOverlayPasses: function (meta) { return drawOverlayPasses(meta); },
      drawHudPass: function (meta) { return drawHudPass(meta); },
      applyMainCameraWorldTransform: (typeof applyMainCameraWorldTransform === 'function') ? function (context, callback) { return applyMainCameraWorldTransform(context, callback); } : null,
      shouldEmitProfile: function (key, signature, minIntervalMs, options) { return shouldEmitProfile(key, signature, minIntervalMs, options); },
      emitRendererProfile: function (tag, payload) { return emitRendererProfile(tag, payload); },
      cloneSimpleObject: function (value) { return cloneSimpleObject(value); },
      recordInteractionPipelineCall: function (pipelineBreakdown) { return recordInteractionPipelineCall(pipelineBreakdown); },
      safeFixed: function (value) { return safeFixed(value); }
    };
  }

  function runFramePipeline(passApi, renderablesApi) {
    return requireCanvas2dFramePipelineApi().runFramePipeline(adapterApi, createCanvas2dFramePipelineDepsForRenderer(), passApi, renderablesApi);
  }

  function createCanvas2dActiveRenderFrameDepsForRenderer() {
    return {
      now: function () { return (typeof perfNow === 'function') ? perfNow() : Date.now(); },
      resolvePassApi: function () { return resolvePassApi(); },
      resolveRenderablesApi: function () { return resolveRenderablesApi(); },
      setPhase: function (phase, step) { if (typeof setPhase === 'function') return setPhase(phase, step); return undefined; },
      getDebugState: function () { return (typeof debugState !== 'undefined' && debugState) ? debugState : {}; },
      getVerboseLog: function () { return (typeof verboseLog !== 'undefined') ? !!verboseLog : false; },
      getViewWidth: function () { return (typeof VIEW_W !== 'undefined') ? VIEW_W : 0; },
      getViewHeight: function () { return (typeof VIEW_H !== 'undefined') ? VIEW_H : 0; },
      getCanvas: function () { return (typeof canvas !== 'undefined' && canvas) ? canvas : { width: 0, height: 0 }; },
      getBoxes: function () { return (typeof boxes !== 'undefined' && boxes) ? boxes : []; },
      getLights: function () { return (typeof lights !== 'undefined' && lights) ? lights : []; },
      getAssetsReady: function () { return (typeof assetsReady !== 'undefined') ? !!assetsReady : false; },
      beginRenderFrameDebug: (typeof beginRenderFrameDebug === 'function') ? function (source, payload) { return beginRenderFrameDebug(source, payload); } : null,
      detailLog: function (message) { if (typeof detailLog === 'function') return detailLog(message); return undefined; },
      runFramePipeline: function (passApi, renderablesApi) { return runFramePipeline(passApi, renderablesApi); },
      safeFixed: function (value) { return safeFixed(value); }
    };
  }

  function renderFrame(meta) {
    return requireCanvas2dActiveRenderFrameApi().renderFrame(adapterApi, createCanvas2dActiveRenderFrameDepsForRenderer(), meta);
  }


  function summarizeCoverage() {
    return {
      phase: 'P5-D',
      owner: 'src/presentation/render/renderer/canvas2d-renderer.js',
      backend: 'canvas2d',
      passApiPath: 'renderer.passApi',
      renderablesApiPath: 'renderer.renderablesApi',
      activeApiPath: 'renderer.active',
      framePipeline: [
        'clearAndPaintMainBackground',
        'renderBaseWorldPasses',
        'buildFramePlan',
        'drawRenderableOrder',
        'drawOverlayPasses',
        'drawHudPass'
      ],
      wiredInto: [
        'src/presentation/shell/app.js:loop -> renderer.active',
        'src/presentation/render/render.js:render -> renderer.active',
        'src/presentation/render/render.js -> renderer.passApi',
        'src/presentation/render/render.js -> renderer.renderablesApi'
      ],
      notes: [
        'P5-D keeps Canvas2D renderer on renderer.active, but now owns more direct Canvas2D draw execution instead of routing overlay / HUD / renderable loops back through render.js.',
        'render.js remains a render description and fallback layer while adapter executes frame plans, overlay passes, and HUD passes.'
      ]
    };
  }

  var adapterApi = {
    phase: 'P5-D',
    owner: 'src/presentation/render/renderer/canvas2d-renderer.js',
    backend: 'canvas2d',
    __inRenderFrame: false,
    __inDrawRenderableOrder: false,
    __inDrawOverlayPasses: false,
    __inDrawHudPass: false,
    getPassApi: resolvePassApi,
    getRenderablesApi: resolveRenderablesApi,
    runFramePipeline: runFramePipeline,
    drawRenderableOrder: drawRenderableOrder,
    drawOverlayPasses: drawOverlayPasses,
    drawHudPass: drawHudPass,
    captureZoomPreviewFrame: captureZoomPreviewFrame,
    updateZoomPreviewState: updateZoomPreviewState,
    clearZoomPreviewState: clearZoomPreviewState,
    renderFrame: renderFrame,
    resetInteractionPipelineCapture: resetInteractionPipelineCapture,
    consumeInteractionPipelineCapture: consumeInteractionPipelineCapture,
    summarizeCoverage: summarizeCoverage
  };

  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.canvas2d', adapterApi, { owner: 'src/presentation/render/renderer/canvas2d-renderer.js', phase: 'P5-C' });
      window.__APP_NAMESPACE.bind('renderer.active', adapterApi, { owner: 'src/presentation/render/renderer/canvas2d-renderer.js', phase: 'P5-C' });
    } else {
      window.App = window.App || {};
      window.App.renderer = window.App.renderer || {};
      window.App.renderer.canvas2d = adapterApi;
      window.App.renderer.active = adapterApi;
    }
  } catch (err) {}

  emitP5('BOOT', 'renderer-adapter-ready', {
    phase: 'P5-D',
    owner: adapterApi.owner,
    backend: adapterApi.backend,
    hasCanvas: !!(typeof canvas !== 'undefined' && canvas),
    hasCtx: !!(typeof ctx !== 'undefined' && ctx),
    hasPassApi: !!resolvePassApi(),
    hasRenderablesApi: !!resolveRenderablesApi(),
    wiredInto: summarizeCoverage().wiredInto
  });
  emitP5('SUMMARY', 'renderer-adapter-coverage', summarizeCoverage());
})();
