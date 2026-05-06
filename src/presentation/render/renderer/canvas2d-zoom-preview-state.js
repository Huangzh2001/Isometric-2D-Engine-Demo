(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/presentation/render/renderer/canvas2d-zoom-preview-state.js';

  function nowMs(deps) {
    if (deps && typeof deps.now === 'function') return deps.now();
    try { if (window.performance && typeof window.performance.now === 'function') return window.performance.now(); } catch (_) {}
    return Date.now();
  }

  function getViewWidth(deps) {
    return Math.max(1, Math.round(Number(deps && typeof deps.getViewWidth === 'function' ? deps.getViewWidth() : deps && deps.viewWidth || 1) || 1));
  }

  function getViewHeight(deps) {
    return Math.max(1, Math.round(Number(deps && typeof deps.getViewHeight === 'function' ? deps.getViewHeight() : deps && deps.viewHeight || 1) || 1));
  }

  function getCameraValue(deps, axis) {
    try {
      var camera = deps && typeof deps.getCamera === 'function' ? deps.getCamera() : null;
      return Number(camera && camera[axis] || 0) || 0;
    } catch (_) {
      return 0;
    }
  }

  function getCurrentZoom(deps) {
    var value = 1;
    try {
      value = deps && typeof deps.getCurrentZoom === 'function' ? deps.getCurrentZoom() : 1;
    } catch (_) {
      value = 1;
    }
    value = Number(value || 1);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  function safeFixed(deps, value) {
    if (deps && typeof deps.safeFixed === 'function') return deps.safeFixed(value);
    var n = Number(value || 0);
    if (!Number.isFinite(n)) return 0;
    return Number(n.toFixed(3));
  }

  function getZoomPreviewState(adapterApi) {
    if (!adapterApi) throw new Error('Missing Canvas2D adapter API for zoom preview state');
    adapterApi.__zoomPreviewState = adapterApi.__zoomPreviewState || {
      active: false,
      snapshot: null,
      captureZoom: 1,
      targetZoom: 1,
      captureCameraX: 0,
      captureCameraY: 0,
      anchorScreenX: 0,
      anchorScreenY: 0,
      expiresAt: 0,
      debounceMs: 160,
      updatedAt: 0,
      lastLogSignature: ''
    };
    return adapterApi.__zoomPreviewState;
  }

  function clearZoomPreviewState(adapterApi, deps, reason) {
    var state = getZoomPreviewState(adapterApi);
    state.active = false;
    state.snapshot = null;
    state.captureZoom = 1;
    state.targetZoom = 1;
    state.captureCameraX = 0;
    state.captureCameraY = 0;
    state.anchorScreenX = 0;
    state.anchorScreenY = 0;
    state.expiresAt = 0;
    state.updatedAt = nowMs(deps);
    state.reason = String(reason || 'clear');
    return state;
  }

  function captureZoomPreviewFrame(adapterApi, deps, meta) {
    meta = meta || {};
    var sourceCanvas = deps && typeof deps.getCanvas === 'function' ? deps.getCanvas() : null;
    var createOffscreenCanvas = deps && deps.createOffscreenCanvas;
    if (!sourceCanvas || typeof createOffscreenCanvas !== 'function') return null;
    var viewWidth = getViewWidth(deps);
    var viewHeight = getViewHeight(deps);
    var previewCanvas = createOffscreenCanvas(viewWidth, viewHeight);
    if (!previewCanvas || typeof previewCanvas.getContext !== 'function') return null;
    var previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) return null;
    try {
      previewCtx.clearRect(0, 0, viewWidth, viewHeight);
      previewCtx.drawImage(sourceCanvas, 0, 0, viewWidth, viewHeight);
    } catch (_) {
      return null;
    }
    var state = getZoomPreviewState(adapterApi);
    state.snapshot = previewCanvas;
    state.captureZoom = Number(meta.captureZoom || getCurrentZoom(deps) || 1);
    if (!Number.isFinite(state.captureZoom) || state.captureZoom <= 0) state.captureZoom = 1;
    state.captureCameraX = Number(meta.captureCameraX != null ? meta.captureCameraX : getCameraValue(deps, 'x')) || 0;
    state.captureCameraY = Number(meta.captureCameraY != null ? meta.captureCameraY : getCameraValue(deps, 'y')) || 0;
    state.anchorScreenX = Number(meta.anchorScreenX != null ? meta.anchorScreenX : viewWidth * 0.5);
    state.anchorScreenY = Number(meta.anchorScreenY != null ? meta.anchorScreenY : viewHeight * 0.5);
    state.updatedAt = nowMs(deps);
    state.source = String(meta.source || 'unknown');
    return {
      ok: true,
      captureZoom: state.captureZoom,
      captureCameraX: state.captureCameraX,
      captureCameraY: state.captureCameraY
    };
  }

  function updateZoomPreviewState(adapterApi, deps, meta) {
    meta = meta || {};
    var state = getZoomPreviewState(adapterApi);
    if (!state.snapshot) return { ok: false, reason: 'missing-snapshot' };
    var viewWidth = getViewWidth(deps);
    var viewHeight = getViewHeight(deps);
    state.active = true;
    state.targetZoom = Number(meta.targetZoom || state.captureZoom || 1);
    if (!Number.isFinite(state.targetZoom) || state.targetZoom <= 0) state.targetZoom = state.captureZoom || 1;
    state.targetCameraX = Number(meta.targetCameraX != null ? meta.targetCameraX : getCameraValue(deps, 'x')) || 0;
    state.targetCameraY = Number(meta.targetCameraY != null ? meta.targetCameraY : getCameraValue(deps, 'y')) || 0;
    state.anchorScreenX = Number(meta.anchorScreenX != null ? meta.anchorScreenX : state.anchorScreenX || viewWidth * 0.5);
    state.anchorScreenY = Number(meta.anchorScreenY != null ? meta.anchorScreenY : state.anchorScreenY || viewHeight * 0.5);
    state.debounceMs = Math.max(120, Math.min(200, Math.round(Number(meta.debounceMs || state.debounceMs || 160) || 160)));
    state.expiresAt = nowMs(deps) + state.debounceMs;
    state.updatedAt = nowMs(deps);
    state.source = String(meta.source || state.source || 'unknown');
    return {
      ok: true,
      targetZoom: state.targetZoom,
      debounceMs: state.debounceMs,
      expiresAt: state.expiresAt
    };
  }

  function shouldUseZoomPreviewFastPath(adapterApi, deps) {
    var state = getZoomPreviewState(adapterApi);
    if (!state.active || !state.snapshot) return false;
    var now = nowMs(deps);
    if (now > Number(state.expiresAt || 0)) {
      clearZoomPreviewState(adapterApi, deps, 'debounce-expired');
      return false;
    }
    return true;
  }

  function drawZoomPreviewFastPath(adapterApi, deps, meta) {
    if (!shouldUseZoomPreviewFastPath(adapterApi, deps)) return null;
    meta = meta || {};
    var drawCtx = deps && typeof deps.getContext === 'function' ? deps.getContext() : null;
    if (!drawCtx) return null;
    var state = getZoomPreviewState(adapterApi);
    var viewWidth = getViewWidth(deps);
    var viewHeight = getViewHeight(deps);
    var drawStartAt = nowMs(deps);
    var ratio = Number(state.targetZoom || 1) / Math.max(0.0001, Number(state.captureZoom || 1));
    if (!Number.isFinite(ratio) || ratio <= 0) ratio = 1;
    var ax = Number(state.anchorScreenX || viewWidth * 0.5);
    var ay = Number(state.anchorScreenY || viewHeight * 0.5);
    try {
      drawCtx.save();
      drawCtx.clearRect(0, 0, viewWidth, viewHeight);
      drawCtx.translate(ax, ay);
      drawCtx.scale(ratio, ratio);
      drawCtx.translate(-ax, -ay);
      drawCtx.drawImage(state.snapshot, 0, 0, viewWidth, viewHeight);
      drawCtx.restore();
    } catch (_) {
      try { drawCtx.restore(); } catch (__restoreErr) {}
      clearZoomPreviewState(adapterApi, deps, 'draw-failed');
      return null;
    }
    var drawMs = Math.max(0, nowMs(deps) - drawStartAt);
    var payload = {
      source: String(meta.source || state.source || 'unknown'),
      captureZoom: Number(state.captureZoom || 1),
      targetZoom: Number(state.targetZoom || 1),
      scaleRatio: safeFixed(deps, ratio),
      anchorScreenX: safeFixed(deps, ax),
      anchorScreenY: safeFixed(deps, ay),
      debounceMs: Number(state.debounceMs || 160),
      drawMs: safeFixed(deps, drawMs),
      interactionFastPath: true
    };
    var signature = [payload.captureZoom, payload.targetZoom, payload.anchorScreenX, payload.anchorScreenY, payload.interactionFastPath].join('|');
    if (!deps || typeof deps.shouldEmitProfile !== 'function' || deps.shouldEmitProfile('zoomPreviewFastPath', signature, 120)) {
      if (deps && typeof deps.emitRendererProfile === 'function') deps.emitRendererProfile('ZOOM-PREVIEW-FASTPATH', payload);
    }
    return payload;
  }

  var api = {
    phase: 'P11c-2',
    owner: OWNER,
    getZoomPreviewState: getZoomPreviewState,
    clearZoomPreviewState: clearZoomPreviewState,
    captureZoomPreviewFrame: captureZoomPreviewFrame,
    updateZoomPreviewState: updateZoomPreviewState,
    shouldUseZoomPreviewFastPath: shouldUseZoomPreviewFastPath,
    drawZoomPreviewFastPath: drawZoomPreviewFastPath
  };

  try {
    window.__CANVAS2D_ZOOM_PREVIEW_STATE__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.canvas2dZoomPreviewState', api, { owner: OWNER, phase: 'P11c-2' });
      window.__APP_NAMESPACE.bind('renderer.diagnostics.canvas2dZoomPreview', api, { owner: OWNER, phase: 'P11c-2' });
    } else {
      window.App = window.App || {};
      window.App.renderer = window.App.renderer || {};
      window.App.renderer.canvas2dZoomPreviewState = api;
      window.App.renderer.diagnostics = window.App.renderer.diagnostics || {};
      window.App.renderer.diagnostics.canvas2dZoomPreview = api;
    }
  } catch (_) {}
})();
