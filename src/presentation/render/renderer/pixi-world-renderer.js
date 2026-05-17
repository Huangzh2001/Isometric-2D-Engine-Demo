// PXM-07: PixiJS tile / floor renderer first pass.
// Layer: presentation/render/renderer.
//
// This module registers a PixiJS world renderer backend. When explicitly
// selected, it initializes a PixiJS Application, draws only the background and
// floor tiles into a PixiJS world layer, and then delegates the remaining world
// objects / actor / overlay / HUD drawing to the existing Canvas2D fallback.
// It deliberately does not draw static objects, actors, shadows, preview,
// selection, particles, grass, glow, or bloom; it does not own pointer/picking;
// it does not use zIndex/sortChildren as a replacement for framePlan.order.
(function registerPixiTileFloorRenderer(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/renderer/pixi-world-renderer.js';
  var STEP = 'PXM-07.18K0F';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var PHASE = 'pixi-tile-floor-first-pass';
  var DEFAULT_PIXI_CDN = 'https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js';

  var state = {
    started: false,
    registered: false,
    initializing: false,
    initialized: false,
    initAttempted: false,
    initFailed: false,
    initFailureReason: '',
    rendererCreated: false,
    applicationCreated: false,
    worldContainerCreated: false,
    floorContainerCreated: false,
    staticRunContainerCreated: false,
    playerContainerCreated: false,
    dynamicRenderableContainerCreated: false,
    backgroundGraphicsCreated: false,
    pixiCanvasAttached: false,
    pixiCanvasWidth: 0,
    pixiCanvasHeight: 0,
    pixiRendererWidth: 0,
    pixiRendererHeight: 0,
    pixiResolution: 0,
    pixiRendererType: 'unknown',
    pixiLoadRequested: false,
    pixiLoadFailed: false,
    pixiLoadFailureReason: '',
    pixiLoadScript: null,
    pixiApp: null,
    worldContainer: null,
    floorContainer: null,
    staticRunContainer: null,
    playerContainer: null,
    dynamicRenderableContainer: null,
    backgroundGraphics: null,
    pixiCanvas: null,
    fallbackLogged: false,
    inputLogged: false,
    floorLogged: false,
    emptyLayerLogged: false,
    lastBackendSignature: '',
    lastPixiSignature: '',
    lastFrameSignature: '',
    lastFrameLogAt: 0,
    lastRenderSignature: '',
    lastRenderLogAt: 0,
    lastSummarySignature: '',
    lastFloorSignature: '',
    lastFloorLogAt: 0,
    fallbackRenderCount: 0,
    floorDrawCount: 0,
    lastFloorSummary: {
      renderer: 'pixi',
      visibleTiles: 0,
      drawnTiles: 0,
      skippedTiles: 0,
      gridW: 0,
      gridH: 0,
      viewRotation: 0,
      projectionSource: 'existing',
      tileHitTestOwner: 'legacy',
      canvas2dFloorFallback: 'enabled',
      ok: false,
      reason: 'not-run'
    },
    sharedFloorSprite: null,
    sharedFloorTexture: null,
    sharedFloorTextureSignature: '',
    sharedFloorTextureUpdateCount: 0,
    sharedFloorSpriteReuseCount: 0,
    sharedFloorConsumerDrawCount: 0,
    sharedFloorLastSnapshot: null,
    sharedFloorLastSummary: null,
    lastPlayerConsumerSummary: null,
    lastDynamicRenderableConsumerSummary: null,
    lastGpuDiagnosticsSignature: '',
    lastGpuDiagnosticsLogAt: 0,
    // PXM-07.18L: frame-level forensic summary for Pixi + residual Canvas2D work.
    lastFrameForensicsSignature: '',
    lastFrameForensicsEmitAt: 0
  };

  function nowMs() {
    try {
      if (global.performance && typeof global.performance.now === 'function') return global.performance.now();
    } catch (_) {}
    return Date.now();
  }


  function isPixiPerformanceModeEnabled() {
    try {
      var mode = global.__PIXI_PERFORMANCE_LOG_MODE__ || null;
      if (mode && typeof mode.isEnabled === 'function') return mode.isEnabled() === true;
      if (global.__PIXI_PERFORMANCE_MODE__ === true) return true;
      if (global.localStorage) {
        var value = global.localStorage.getItem('pixiPerformanceMode');
        return value === '1' || value === 'true';
      }
    } catch (_) {}
    return false;
  }

  function shouldEmitDiagnosticsSection(section) {
    if (!isPixiPerformanceModeEnabled()) return true;
    section = String(section || '');
    return section === 'ready' || section === 'init' || section === 'init-error' || section === 'gpu-diagnostics' || section === 'performance-hotspot' || section === 'forensics-frame';
  }

  function stringifyValue(value) {
    if (value == null) return String(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }

  function formatPayload(payload) {
    if (!payload || typeof payload !== 'object') return '';
    return Object.keys(payload).map(function (key) {
      return String(key) + '=' + stringifyValue(payload[key]);
    }).join(' ');
  }

  function emit(section, payload) {
    if (!shouldEmitDiagnosticsSection(section)) return '';
    var line = PREFIX + '[' + String(section || 'event') + ']';
    var extra = formatPayload(payload);
    if (extra) line += ' ' + extra;
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
    return line;
  }

  function toFiniteNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function roundDiag(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    var factor = Math.pow(10, digits == null ? 3 : digits);
    return Math.round(n * factor) / factor;
  }

  function countVisibleChildrenForensics(container) {
    try {
      var children = container && Array.isArray(container.children) ? container.children : [];
      var visible = 0;
      for (var i = 0; i < children.length; i += 1) if (children[i] && children[i].visible !== false) visible += 1;
      return { total: children.length, visible: visible };
    } catch (_) {}
    return { total: 0, visible: 0 };
  }

  function getNamespace() {
    return (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') ? global.__APP_NAMESPACE : null;
  }

  function bindPath(path, value, meta) {
    var ns = getNamespace();
    if (ns && typeof ns.bind === 'function') return ns.bind(path, value, meta || {});
    global.App = global.App || {};
    var parts = String(path || '').split('.').filter(Boolean);
    var node = global.App;
    for (var i = 0; i < parts.length - 1; i++) {
      var key = parts[i];
      if (!node[key] || typeof node[key] !== 'object') node[key] = {};
      node = node[key];
    }
    if (parts.length) node[parts[parts.length - 1]] = value;
    return value;
  }

  function getBackendSelection() {
    return global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
  }

  function getBackendSnapshot() {
    try {
      var selection = getBackendSelection();
      if (selection && typeof selection.getSnapshot === 'function') return selection.getSnapshot() || {};
    } catch (_) {}
    return {};
  }

  function detectPixiGlobal() {
    try { return !!global.PIXI; } catch (_) {}
    return false;
  }

  function getPixiConstructor(name) {
    try { return global.PIXI && global.PIXI[name] || null; } catch (_) {}
    return null;
  }

  function getConfiguredPixiCdnUrl() {
    try { return String(global.__PIXI_CDN_URL__ || DEFAULT_PIXI_CDN); } catch (_) {}
    return DEFAULT_PIXI_CDN;
  }

  function getTargetCanvas() {
    try { return global.document && global.document.getElementById ? global.document.getElementById('game') : null; } catch (_) {}
    return null;
  }

  function getCanvasWrap(targetCanvas) {
    try {
      if (targetCanvas && targetCanvas.parentElement) return targetCanvas.parentElement;
      return global.document && global.document.querySelector ? global.document.querySelector('.canvasWrap') : null;
    } catch (_) {}
    return null;
  }

  function getDevicePixelRatio() {
    try { return Math.max(1, Number(global.devicePixelRatio || 1)); } catch (_) {}
    return 1;
  }

  function getCanvasCssRect(targetCanvas) {
    try {
      if (targetCanvas && typeof targetCanvas.getBoundingClientRect === 'function') {
        var rect = targetCanvas.getBoundingClientRect();
        return { width: Math.max(0, Number(rect.width || 0)), height: Math.max(0, Number(rect.height || 0)) };
      }
    } catch (_) {}
    return { width: 0, height: 0 };
  }

  function detectActiveBackend() {
    var snapshot = getBackendSnapshot();
    if (snapshot.activeBackend) return String(snapshot.activeBackend);
    try {
      var api = global.App && global.App.renderer && global.App.renderer.active;
      if (api && api.backend) return String(api.backend);
      return api ? 'registered-unknown' : 'missing';
    } catch (_) {}
    return 'unknown';
  }

  function updatePixiCanvasStyle(targetCanvas, pixiCanvas) {
    if (!targetCanvas || !pixiCanvas) return false;
    try {
      var wrap = getCanvasWrap(targetCanvas);
      if (wrap) {
        var computed = global.getComputedStyle ? global.getComputedStyle(wrap) : null;
        if (!computed || computed.position === 'static') wrap.style.position = 'relative';
      }
      var cssRect = getCanvasCssRect(targetCanvas);
      var width = cssRect.width || targetCanvas.clientWidth || targetCanvas.width || 0;
      var height = cssRect.height || targetCanvas.clientHeight || targetCanvas.height || 0;

      // PixiJS floor sits below the legacy Canvas2D fallback. Canvas2D is made
      // transparent only while Pixi owns background/floor, so Canvas2D can still
      // draw objects, actor, overlay, and HUD above the Pixi floor.
      targetCanvas.style.position = 'relative';
      targetCanvas.style.zIndex = '1';
      targetCanvas.style.background = 'transparent';

      pixiCanvas.setAttribute('data-pixi-migration', 'tile-floor-layer');
      pixiCanvas.style.position = 'absolute';
      pixiCanvas.style.left = Number(targetCanvas.offsetLeft || 0) + 'px';
      pixiCanvas.style.top = Number(targetCanvas.offsetTop || 0) + 'px';
      pixiCanvas.style.width = width + 'px';
      pixiCanvas.style.height = height + 'px';
      pixiCanvas.style.pointerEvents = 'none';
      pixiCanvas.style.background = 'transparent';
      pixiCanvas.style.border = '0';
      pixiCanvas.style.boxShadow = 'none';
      pixiCanvas.style.borderRadius = '16px';
      pixiCanvas.style.zIndex = '0';
      pixiCanvas.style.display = 'block';
      pixiCanvas.style.touchAction = 'none';
      return true;
    } catch (_) {}
    return false;
  }

  function getRendererType(app) {
    try {
      var renderer = app && app.renderer;
      if (!renderer) return 'missing';
      if (renderer.type != null) return String(renderer.type);
      if (renderer.name) return String(renderer.name);
      if (renderer.constructor && renderer.constructor.name) return String(renderer.constructor.name);
    } catch (_) {}
    return 'unknown';
  }


  function getPixiRendererGpuDiagnostics(app) {
    var renderer = app && app.renderer || null;
    var out = {
      step: 'PXM-07.12P',
      diagnosticOnly: true,
      rendererType: getRendererType(app),
      gpuAccelerated: false,
      backendFamily: 'unknown',
      webglContextAvailable: false,
      webgpuContextAvailable: false,
      gpuVendor: '',
      gpuRenderer: '',
      resolution: 0,
      rendererWidth: 0,
      rendererHeight: 0
    };
    try {
      out.resolution = Number(renderer && renderer.resolution || state.pixiResolution || getDevicePixelRatio() || 1);
      out.rendererWidth = Number(renderer && renderer.width || state.pixiRendererWidth || 0);
      out.rendererHeight = Number(renderer && renderer.height || state.pixiRendererHeight || 0);
    } catch (_) {}
    var gl = null;
    try { gl = renderer && (renderer.gl || renderer.context && renderer.context.gl || renderer.runners && renderer.runners.contextChange && renderer.runners.contextChange.items && renderer.runners.contextChange.items[0] && renderer.runners.contextChange.items[0].gl) || null; } catch (_) { gl = null; }
    if (!gl) {
      try {
        var canvas = state.pixiCanvas || (app && (app.canvas || app.view)) || null;
        gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl')) || null;
      } catch (_) { gl = null; }
    }
    if (gl) {
      out.webglContextAvailable = true;
      out.gpuAccelerated = true;
      out.backendFamily = 'webgl';
      try {
        var dbg = gl.getExtension && gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          out.gpuVendor = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || '');
          out.gpuRenderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
        }
      } catch (_) {}
      if (!out.gpuVendor) {
        try { out.gpuVendor = String(gl.getParameter(gl.VENDOR) || ''); } catch (_) {}
      }
      if (!out.gpuRenderer) {
        try { out.gpuRenderer = String(gl.getParameter(gl.RENDERER) || ''); } catch (_) {}
      }
    } else {
      try {
        var rtype = String(out.rendererType || '').toLowerCase();
        if (rtype.indexOf('webgpu') >= 0 || rtype.indexOf('gpu') >= 0) {
          out.gpuAccelerated = true;
          out.webgpuContextAvailable = true;
          out.backendFamily = 'webgpu-or-gpu-renderer';
        } else if (rtype.indexOf('webgl') >= 0 || rtype.indexOf('gl') >= 0) {
          out.gpuAccelerated = true;
          out.backendFamily = 'webgl';
        }
      } catch (_) {}
    }
    return out;
  }

  function maybeEmitGpuDiagnostics(reason, extra) {
    var app = state.pixiApp || null;
    var diag = getPixiRendererGpuDiagnostics(app);
    extra = extra || {};
    Object.keys(extra).forEach(function (key) { diag[key] = extra[key]; });
    diag.source = reason || 'gpu-diagnostics';
    var signature = [diag.rendererType, diag.backendFamily, diag.gpuAccelerated ? 1 : 0, diag.rendererWidth, diag.rendererHeight, diag.resolution, extra && extra.staticGraphicsUsedCount || 0, extra && extra.floorTextureUpdateCount || 0].join('|');
    var now = nowMs();
    if (signature !== state.lastGpuDiagnosticsSignature || now - Number(state.lastGpuDiagnosticsLogAt || 0) > 3000) {
      state.lastGpuDiagnosticsSignature = signature;
      state.lastGpuDiagnosticsLogAt = now;
      emit('gpu-diagnostics', diag);
    }
    try { global.__PIXI_MIGRATION_LAST_GPU_DIAGNOSTICS__ = diag; } catch (_) {}
    return diag;
  }

  function maybeEmitStart(reason) {
    if (state.started) return false;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/renderer',
      touchedFeature: 'pixi-tile-floor-first-pass',
      pixiAvailable: detectPixiGlobal(),
      pixiInitialized: false,
      pixiRendererCreated: false,
      pixiApplicationCreated: false,
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      reason: reason || 'module-load'
    });
    return true;
  }

  function requestPixiLibraryLoad() {
    if (detectPixiGlobal()) return Promise.resolve(true);
    if (state.pixiLoadFailed) return Promise.resolve(false);
    if (state.pixiLoadScript && state.pixiLoadScript.__pixiMigrationPromise) return state.pixiLoadScript.__pixiMigrationPromise;
    try {
      if (!global.document || !global.document.createElement) return Promise.resolve(false);
      state.pixiLoadRequested = true;
      var script = global.document.createElement('script');
      script.src = getConfiguredPixiCdnUrl();
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-pixi-migration', 'pxm07-loader');
      var promise = new Promise(function (resolve) {
        script.onload = function () {
          emit('pixi-loader', { requested: true, loaded: detectPixiGlobal(), source: 'cdn-script-onload' });
          resolve(detectPixiGlobal());
        };
        script.onerror = function () {
          state.pixiLoadFailed = true;
          state.pixiLoadFailureReason = 'cdn-load-failed';
          emit('pixi-loader', { requested: true, loaded: false, reason: state.pixiLoadFailureReason, url: getConfiguredPixiCdnUrl() });
          resolve(false);
        };
      });
      script.__pixiMigrationPromise = promise;
      state.pixiLoadScript = script;
      var head = global.document.head || (global.document.getElementsByTagName && global.document.getElementsByTagName('head')[0]) || global.document.body;
      if (head && typeof head.appendChild === 'function') head.appendChild(script);
      emit('pixi-loader', { requested: true, loaded: false, url: getConfiguredPixiCdnUrl(), source: 'dynamic-script-request' });
      return promise;
    } catch (err) {
      state.pixiLoadFailed = true;
      state.pixiLoadFailureReason = err && err.message ? String(err.message) : 'loader-exception';
      emit('pixi-loader', { requested: true, loaded: false, reason: state.pixiLoadFailureReason });
      return Promise.resolve(false);
    }
  }

  function getRuntimeSettings() {
    try {
      if (global.settings && typeof global.settings === 'object') return global.settings;
    } catch (_) {}
    try {
      var runtimeApi = global.App && global.App.state ? global.App.state.runtimeState || null : null;
      if (runtimeApi && runtimeApi.settings) return runtimeApi.settings;
    } catch (_) {}
    return {};
  }

  function getRuntimeCamera() {
    try {
      if (global.camera && typeof global.camera === 'object') return global.camera;
    } catch (_) {}
    return { x: 0, y: 0 };
  }

  function getCurrentViewRotation() {
    try {
      var value = 0;
      if (typeof global.getSafeMainEditorViewRotation === 'function') value = global.getSafeMainEditorViewRotation(null).viewRotation;
      if (typeof global.normalizeMainEditorViewRotationValue === 'function') return global.normalizeMainEditorViewRotationValue(value);
      return Number(value || 0);
    } catch (_) {}
    return 0;
  }

  function getCullingBounds(viewRotation) {
    try {
      if (typeof global.getMainCameraRenderScope === 'function') {
        var scope = global.getMainCameraRenderScope(viewRotation);
        if (scope && scope.cameraCullingEnabled !== false && scope.cullingWorldBounds) return scope.cullingWorldBounds;
      }
    } catch (_) {}
    return null;
  }

  function clampInt(value, min, max) {
    var n = Math.round(Number(value || 0));
    if (!Number.isFinite(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  function getVisibleTileRange(settings, viewRotation) {
    var gridW = Math.max(0, Math.round(Number(settings.gridW || settings.worldCols || 0) || 0));
    var gridH = Math.max(0, Math.round(Number(settings.gridH || settings.worldRows || 0) || 0));
    var bounds = getCullingBounds(viewRotation);
    if (!bounds || gridW <= 0 || gridH <= 0) {
      return { minX: 0, minY: 0, maxX: gridW, maxY: gridH, gridW: gridW, gridH: gridH, source: 'full-grid' };
    }
    var pad = 1;
    return {
      minX: clampInt(Math.floor(Number(bounds.minX || 0) - pad), 0, gridW),
      minY: clampInt(Math.floor(Number(bounds.minY || 0) - pad), 0, gridH),
      maxX: clampInt(Math.ceil(Number(bounds.maxX || gridW) + pad), 0, gridW),
      maxY: clampInt(Math.ceil(Number(bounds.maxY || gridH) + pad), 0, gridH),
      gridW: gridW,
      gridH: gridH,
      source: 'camera-culling-world-bounds'
    };
  }

  function projectWorldFaceNoCamera(points, viewRotation, settings) {
    try {
      if (typeof global.screenPointsFromWorldFaceNoCamera === 'function') return global.screenPointsFromWorldFaceNoCamera(points, viewRotation) || [];
    } catch (_) {}
    var tileW = Number(settings.tileW || 80);
    var tileH = Number(settings.tileH || 40);
    var originX = Number(settings.originX || 0);
    var originY = Number(settings.originY || 0);
    return (points || []).map(function (p) {
      return {
        x: originX + (Number(p.x || 0) - Number(p.y || 0)) * tileW / 2,
        y: originY + (Number(p.x || 0) + Number(p.y || 0)) * tileH / 2 - Number(p.z || 0) * tileH
      };
    });
  }

  function parseCssColor(value, fallbackColor, fallbackAlpha) {
    var raw = String(value || '').trim();
    if (raw.charAt(0) === '#') {
      var hex = raw.slice(1);
      if (hex.length === 3) hex = hex.split('').map(function (ch) { return ch + ch; }).join('');
      var parsed = parseInt(hex, 16);
      return { color: Number.isFinite(parsed) ? parsed : fallbackColor, alpha: fallbackAlpha == null ? 1 : fallbackAlpha };
    }
    var match = raw.match(/rgba?\(([^)]+)\)/i);
    if (match) {
      var parts = match[1].split(',').map(function (part) { return Number(String(part).trim()); });
      var r = Math.max(0, Math.min(255, Math.round(parts[0] || 0)));
      var g = Math.max(0, Math.min(255, Math.round(parts[1] || 0)));
      var b = Math.max(0, Math.min(255, Math.round(parts[2] || 0)));
      var a = parts.length > 3 && Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, Number(parts[3]))) : (fallbackAlpha == null ? 1 : fallbackAlpha);
      return { color: (r << 16) + (g << 8) + b, alpha: a };
    }
    return { color: fallbackColor == null ? 0xffffff : fallbackColor, alpha: fallbackAlpha == null ? 1 : fallbackAlpha };
  }

  function getTileFillCss(x, y) {
    var base = (x + y) % 2 === 0 ? '#33415a' : '#29344b';
    try {
      if (typeof global.rgbToCss === 'function' && typeof global.litColor === 'function' && typeof global.hexToRgb === 'function') {
        return global.rgbToCss(global.litColor(global.hexToRgb(base), { x: x + 0.5, y: y + 0.5, z: 0 }, { x: 0, y: 0, z: 1 }));
      }
    } catch (_) {}
    return base;
  }

  function clearGraphics(g) {
    if (!g) return;
    try { if (typeof g.clear === 'function') g.clear(); } catch (_) {}
  }

  function drawPolygon(graphics, points, fillCss, strokeCss, strokeWidth) {
    if (!graphics || !Array.isArray(points) || points.length < 3) return false;
    var flat = [];
    for (var i = 0; i < points.length; i++) {
      flat.push(Number(points[i].x || 0), Number(points[i].y || 0));
    }
    var fill = parseCssColor(fillCss, 0x33415a, 1);
    var stroke = parseCssColor(strokeCss || 'rgba(255,255,255,.05)', 0xffffff, 0.05);
    try {
      if (typeof graphics.poly === 'function' && typeof graphics.fill === 'function') {
        graphics.poly(flat);
        graphics.fill({ color: fill.color, alpha: fill.alpha });
        if (typeof graphics.stroke === 'function' && strokeWidth !== 0) graphics.stroke({ color: stroke.color, alpha: stroke.alpha, width: Number(strokeWidth || 1) });
        return true;
      }
    } catch (_) {}
    try {
      if (typeof graphics.beginFill === 'function') {
        graphics.beginFill(fill.color, fill.alpha);
        if (typeof graphics.lineStyle === 'function' && strokeWidth !== 0) graphics.lineStyle(Number(strokeWidth || 1), stroke.color, stroke.alpha);
        if (typeof graphics.drawPolygon === 'function') graphics.drawPolygon(flat);
        if (typeof graphics.endFill === 'function') graphics.endFill();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function drawRect(graphics, x, y, w, h, fillCss) {
    if (!graphics) return false;
    var fill = parseCssColor(fillCss, 0x111827, 1);
    try {
      if (typeof graphics.rect === 'function' && typeof graphics.fill === 'function') {
        graphics.rect(Number(x || 0), Number(y || 0), Math.max(0, Number(w || 0)), Math.max(0, Number(h || 0)));
        graphics.fill({ color: fill.color, alpha: fill.alpha });
        return true;
      }
    } catch (_) {}
    try {
      if (typeof graphics.beginFill === 'function') {
        graphics.beginFill(fill.color, fill.alpha);
        if (typeof graphics.drawRect === 'function') graphics.drawRect(Number(x || 0), Number(y || 0), Math.max(0, Number(w || 0)), Math.max(0, Number(h || 0)));
        if (typeof graphics.endFill === 'function') graphics.endFill();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function addCamera(points, camera) {
    var dx = Number(camera && camera.x || 0);
    var dy = Number(camera && camera.y || 0);
    return (points || []).map(function (pt) { return { x: Number(pt.x || 0) + dx, y: Number(pt.y || 0) + dy }; });
  }

  function ensurePixiContainers() {
    if (!state.initialized || !state.pixiApp || !state.worldContainer) return false;
    var Graphics = getPixiConstructor('Graphics');
    var Container = getPixiConstructor('Container');
    if (typeof Graphics !== 'function' || typeof Container !== 'function') return false;
    try {
      if (!state.backgroundGraphics) {
        state.backgroundGraphics = new Graphics();
        state.backgroundGraphics.label = 'pixi-migration-background';
        state.backgroundGraphicsCreated = true;
        state.worldContainer.addChild(state.backgroundGraphics);
      }
      if (!state.floorContainer) {
        state.floorContainer = new Container();
        state.floorContainer.label = 'pixi-migration-floor-container';
        state.floorContainer.sortableChildren = false;
        try { state.floorContainer.eventMode = 'none'; } catch (_) {}
        state.worldContainer.addChild(state.floorContainer);
        state.floorContainerCreated = true;
      }
      if (!state.staticRunContainer) {
        state.staticRunContainer = new Container();
        state.staticRunContainer.label = 'pixi-migration-static-world-packet-container';
        state.staticRunContainer.sortableChildren = true;
        try { state.staticRunContainer.eventMode = 'none'; } catch (_) {}
        state.worldContainer.addChild(state.staticRunContainer);
        state.staticRunContainerCreated = true;
      }
      if (!state.dynamicRenderableContainer) {
        state.dynamicRenderableContainer = new Container();
        state.dynamicRenderableContainer.label = 'pixi-migration-dynamic-renderable-container';
        state.dynamicRenderableContainer.sortableChildren = false;
        try { state.dynamicRenderableContainer.eventMode = 'none'; } catch (_) {}
        state.worldContainer.addChild(state.dynamicRenderableContainer);
        state.dynamicRenderableContainerCreated = true;
      }
      if (!state.playerContainer) {
        state.playerContainer = new Container();
        state.playerContainer.label = 'pixi-migration-player-avatar-container';
        state.playerContainer.sortableChildren = false;
        try { state.playerContainer.eventMode = 'none'; } catch (_) {}
        state.worldContainer.addChild(state.playerContainer);
        state.playerContainerCreated = true;
      }
      return true;
    } catch (_) {}
    return false;
  }

  function drawPixiBackground() {
    if (!state.backgroundGraphics || !state.pixiApp) return false;
    clearGraphics(state.backgroundGraphics);
    var targetCanvas = getTargetCanvas();
    var css = getCanvasCssRect(targetCanvas);
    var w = Number(css.width || state.pixiRendererWidth || (targetCanvas && targetCanvas.width) || 0);
    var h = Number(css.height || state.pixiRendererHeight || (targetCanvas && targetCanvas.height) || 0);
    drawRect(state.backgroundGraphics, 0, 0, w, h * 0.52, '#0e1320');
    drawRect(state.backgroundGraphics, 0, h * 0.52, w, h * 0.48, '#141b2b');
    return true;
  }


  function getSharedFloorLayerCacheSourceApi() {
    try {
      if (global.__SHARED_FLOOR_LAYER_CACHE_SOURCE_FOR_RENDER__ && typeof global.__SHARED_FLOOR_LAYER_CACHE_SOURCE_FOR_RENDER__.getSnapshot === 'function') return global.__SHARED_FLOOR_LAYER_CACHE_SOURCE_FOR_RENDER__;
    } catch (_) {}
    try {
      var api = global.App && global.App.renderer && global.App.renderer.optimization && global.App.renderer.optimization.floorLayerCacheSource;
      if (api && typeof api.getSnapshot === 'function') return api;
    } catch (_) {}
    return null;
  }

  function getSharedFloorLayerCacheSnapshot(reason) {
    try {
      var api = getSharedFloorLayerCacheSourceApi();
      if (!api || typeof api.getSnapshot !== 'function') return null;
      return api.getSnapshot({
        source: reason || 'pixi-floor-shared-consumer',
        consumer: 'pixi-floor-layer-cache-shared-consumer',
        ensure: true,
        force: false,
        preferCameraTransformReuse: true
      }) || null;
    } catch (_) {}
    return null;
  }


  function makePixiSharedRenderFrameSnapshot(meta, reason) {
    var camera = getRuntimeCamera() || {};
    var floorSnapshot = getSharedFloorLayerCacheSnapshot(reason || 'pixi-shared-render-frame-snapshot');
    var transform = floorSnapshot && floorSnapshot.floorCacheBlitTransform || null;
    var reuse = floorSnapshot && floorSnapshot.reuseTransform || null;
    var visualViewRotation = normalizeStaticRotationModulo4ForPixi(meta && meta.currentViewRotation != null ? meta.currentViewRotation : (floorSnapshot && floorSnapshot.viewRotation != null ? floorSnapshot.viewRotation : 0));
    var staticPacketViewRotation = resolveStaticPacketViewRotationForPixi(visualViewRotation);
    var rawFloorTextureVersion = String(floorSnapshot && (floorSnapshot.textureVersion || floorSnapshot.version) || '');
    var staticFloorTextureVersion = sanitizeStaticFloorTextureVersionForPixi(rawFloorTextureVersion, staticPacketViewRotation);
    var snapshot = {
      step: 'PXM-07.18J',
      phase: 'pixi-shared-render-frame-snapshot-visual-rotation-restored',
      source: reason || 'pixi-renderFrame',
      framePlanId: String(meta && meta.framePlanId || ''),
      createdAtMs: nowMs(),
      cameraX: Number(camera && camera.x || 0),
      cameraY: Number(camera && camera.y || 0),
      visualViewRotation: visualViewRotation,
      staticPacketViewRotation: staticPacketViewRotation,
      staticCacheViewRotation: staticPacketViewRotation,
      fractionalRotationInStaticCacheKey: hasFractionalStaticRotationInCacheKeyForPixi(staticPacketViewRotation),
      floorSnapshot: floorSnapshot || null,
      floorCacheBlitTransform: transform || null,
      floorReuseTransform: reuse || null,
      floorReady: !!(floorSnapshot && floorSnapshot.ready === true && floorSnapshot.surfaceCanvas),
      floorSharedSurfaceRevision: Number(floorSnapshot && floorSnapshot.sharedSurfaceRevision || 0),
      floorTextureVersion: rawFloorTextureVersion,
      staticFloorTextureVersion: staticFloorTextureVersion,
      floorStaticTextureVersion: staticFloorTextureVersion,
      floorTextureSignature: makeSharedFloorTextureSignature(floorSnapshot),
      staticFloorTextureSignature: sanitizeStaticFloorTextureVersionForPixi(makeSharedFloorTextureSignature(floorSnapshot), staticPacketViewRotation),
      floorBuildCameraX: Number(floorSnapshot && floorSnapshot.buildCameraX || reuse && reuse.builtCameraX || 0),
      floorBuildCameraY: Number(floorSnapshot && floorSnapshot.buildCameraY || reuse && reuse.builtCameraY || 0),
      floorBuildZoom: Number(floorSnapshot && floorSnapshot.buildZoom || reuse && reuse.builtZoom || 0),
      floorCurrentZoom: Number(floorSnapshot && floorSnapshot.currentZoom || 0),
      floorReuseScale: Number(transform && transform.scale || reuse && reuse.scale || 1),
      floorReuseDx: Number(transform && transform.dx || reuse && reuse.dx || 0),
      floorReuseDy: Number(transform && transform.dy || reuse && reuse.dy || 0),
      floorReuseShouldReuse: !!(transform && transform.shouldReuse === true),
      floorReuseScaled: !!(transform && transform.scaled === true)
    };
    try { global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ = snapshot; } catch (_) {}
    try {
      emit('shared-frame-snapshot', {
        ok: true,
        step: snapshot.step,
        framePlanId: snapshot.framePlanId,
        floorReady: snapshot.floorReady,
        cameraX: snapshot.cameraX,
        cameraY: snapshot.cameraY,
        floorSharedSurfaceRevision: snapshot.floorSharedSurfaceRevision,
        floorTextureVersion: snapshot.floorTextureVersion,
        staticFloorTextureVersion: snapshot.staticFloorTextureVersion,
        visualViewRotation: snapshot.visualViewRotation,
        staticPacketViewRotation: snapshot.staticPacketViewRotation,
        fractionalRotationInStaticCacheKey: hasFractionalStaticRotationInCacheKeyForPixi(staticPacketViewRotation),
        floorReuseScale: snapshot.floorReuseScale,
        floorReuseDx: snapshot.floorReuseDx,
        floorReuseDy: snapshot.floorReuseDy,
        floorReuseShouldReuse: snapshot.floorReuseShouldReuse,
        source: snapshot.source
      });
    } catch (_) {}
    return snapshot;
  }

  function clearPixiSharedRenderFrameSnapshot(snapshot, reason) {
    try {
      if (global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ === snapshot) {
        delete global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__;
      }
    } catch (_) {}
    try { global.__PIXI_MIGRATION_LAST_SHARED_RENDER_FRAME_SNAPSHOT__ = snapshot || null; } catch (_) {}
    try {
      if (snapshot) {
        emit('shared-frame-snapshot-release', {
          ok: true,
          step: snapshot.step || 'PXM-07.18J',
          framePlanId: snapshot.framePlanId || '',
          floorSharedSurfaceRevision: snapshot.floorSharedSurfaceRevision,
          floorTextureVersion: snapshot.floorTextureVersion,
          staticFloorTextureVersion: snapshot.staticFloorTextureVersion || snapshot.floorStaticTextureVersion || '',
          visualViewRotation: snapshot.visualViewRotation,
          staticPacketViewRotation: snapshot.staticPacketViewRotation,
          fractionalRotationInStaticCacheKey: hasFractionalStaticRotationInCacheKeyForPixi(staticPacketViewRotation),
          source: reason || 'pixi-renderFrame-after-fallback'
        });
      }
    } catch (_) {}
  }

  function updateCanvasTexture(texture) {
    if (!texture) return false;
    try {
      if (texture.source && typeof texture.source.update === 'function') {
        texture.source.update();
        return true;
      }
    } catch (_) {}
    try {
      if (texture.baseTexture && typeof texture.baseTexture.update === 'function') {
        texture.baseTexture.update();
        return true;
      }
    } catch (_) {}
    try {
      if (typeof texture.update === 'function') {
        texture.update();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function destroySharedFloorResources() {
    try {
      if (state.sharedFloorSprite && state.sharedFloorSprite.parent && typeof state.sharedFloorSprite.parent.removeChild === 'function') {
        state.sharedFloorSprite.parent.removeChild(state.sharedFloorSprite);
      }
    } catch (_) {}
    try { if (state.sharedFloorSprite && typeof state.sharedFloorSprite.destroy === 'function') state.sharedFloorSprite.destroy({ children: true, texture: false, baseTexture: false }); } catch (_) {}
    try { if (state.sharedFloorTexture && typeof state.sharedFloorTexture.destroy === 'function') state.sharedFloorTexture.destroy(false); } catch (_) {}
    state.sharedFloorSprite = null;
    state.sharedFloorTexture = null;
    state.sharedFloorTextureSignature = '';
  }

  function clearFloorContainer(preserveChild) {
    if (!state.floorContainer) return;
    try {
      var children = state.floorContainer.children ? state.floorContainer.children.slice() : [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (!child || child === preserveChild) continue;
        try { if (typeof state.floorContainer.removeChild === 'function') state.floorContainer.removeChild(child); } catch (_) {}
        try { if (typeof child.destroy === 'function') child.destroy(); } catch (_) {}
      }
    } catch (_) {
      try {
        if (!preserveChild) state.floorContainer.children.length = 0;
      } catch (__) {}
    }
  }

  function normalizeStaticRotationModulo4ForPixi(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    n = n % 4;
    if (n < 0) n += 4;
    return n;
  }

  function getStaticRotationSnapEpsilonForPixi() {
    var raw = null;
    try { if (global.localStorage) raw = global.localStorage.getItem('pixiStaticRotationSnapEpsilon'); } catch (_) {}
    var n = Number(raw);
    if (!Number.isFinite(n) || n < 0) n = 0.001;
    return Math.max(0, Math.min(0.05, n));
  }

  function resolveStaticPacketViewRotationForPixi(value) {
    try {
      if (typeof global.resolveStaticPacketViewRotationForRender === 'function') {
        return normalizeStaticRotationModulo4ForPixi(global.resolveStaticPacketViewRotationForRender(value));
      }
    } catch (_) {}
    var visual = normalizeStaticRotationModulo4ForPixi(value);
    var snapped = Math.round(visual) % 4;
    if (snapped < 0) snapped += 4;
    var direct = Math.abs(visual - snapped);
    var wrapped = Math.min(direct, Math.abs(visual + 4 - snapped), Math.abs(visual - 4 - snapped));
    return wrapped <= getStaticRotationSnapEpsilonForPixi() ? snapped : visual;
  }

  function hasFractionalStaticRotationInCacheKeyForPixi(value) {
    var visual = normalizeStaticRotationModulo4ForPixi(value);
    var snapped = Math.round(visual) % 4;
    if (snapped < 0) snapped += 4;
    var direct = Math.abs(visual - snapped);
    var wrapped = Math.min(direct, Math.abs(visual + 4 - snapped), Math.abs(visual - 4 - snapped));
    return wrapped > getStaticRotationSnapEpsilonForPixi();
  }

  function sanitizeStaticFloorTextureVersionForPixi(version, staticRotation) {
    var raw = version == null ? '' : String(version);
    if (!raw) return '';
    var snapped = Number(staticRotation || 0);
    var out = raw;
    try { out = out.replace(/(\"viewRotation\"\s*:\s*)-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/ig, '$1' + String(snapped)); } catch (_) { out = raw; }
    try {
      var parts = out.split('|');
      if (parts.length >= 6 && /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(parts[2])) {
        parts[2] = String(snapped);
        out = parts.join('|');
      }
    } catch (_) {}
    return out;
  }

  function makeSharedFloorTextureSignature(snapshot) {
    if (!snapshot) return '';
    return [
      String(snapshot.textureVersion || snapshot.version || ''),
      String(snapshot.signature || ''),
      Number(snapshot.sharedSurfaceRevision || 0),
      Number(snapshot.surfaceWidth || 0),
      Number(snapshot.surfaceHeight || 0),
      Number(snapshot.cssWidth || 0),
      Number(snapshot.cssHeight || 0),
      Number(snapshot.viewRotation || 0)
    ].join('|');
  }

  function applySharedFloorSpriteTransform(sprite, snapshot) {
    if (!sprite || !snapshot) return;
    var cssWidth = Math.max(1, Number(snapshot.cssWidth || state.pixiRendererWidth || 1));
    var cssHeight = Math.max(1, Number(snapshot.cssHeight || state.pixiRendererHeight || 1));
    var transform = snapshot.floorCacheBlitTransform || null;
    var pixi = transform && transform.pixi ? transform.pixi : null;

    // PXM floor migration rule: PixiJS must consume the same shared floor cache
    // reuse transform that Canvas2D consumes. Do not re-derive a Pixi-only
    // approximation from dx/dy/scale; the anchor term is part of the contract.
    if (pixi) {
      try {
        sprite.x = Number(pixi.spriteX || 0);
        sprite.y = Number(pixi.spriteY || 0);
        sprite.width = Math.max(1, Number(pixi.spriteWidth || cssWidth));
        sprite.height = Math.max(1, Number(pixi.spriteHeight || cssHeight));
        sprite.eventMode = 'none';
      } catch (_) {}
      return;
    }

    // Compatibility fallback for older snapshots. Keep this path identity/pan
    // only; scaled reuse requires floorCacheBlitTransform because the anchor is
    // not optional.
    try {
      sprite.x = 0;
      sprite.y = 0;
      sprite.width = cssWidth;
      sprite.height = cssHeight;
      sprite.eventMode = 'none';
    } catch (_) {}
    var reuse = snapshot.reuseTransform || {};
    if (reuse && (reuse.skippedByInteractionBudget || reuse.cameraTransformOnly)) {
      var reuseScale = Number(reuse.scale || 1);
      var dx = Number(reuse.dx || 0);
      var dy = Number(reuse.dy || 0);
      if (Math.abs(reuseScale - 1) <= 0.001) {
        try {
          sprite.x = dx;
          sprite.y = dy;
        } catch (_) {}
      }
    }
  }

  function notifyPixiFloorSharedConsumer(payload) {
    try {
      var diag = global.__PIXI_MIGRATION_PIXI_FLOOR_SHARED_CONSUMER_DIAGNOSTICS__ || null;
      if (diag && typeof diag.notePixiFloorSharedConsumer === 'function') diag.notePixiFloorSharedConsumer(payload || {}, { source: payload && payload.source || 'pixi-floor-shared-consumer' });
    } catch (_) {}
  }

  function notifyPixiFloorCameraTransformReuse(payload) {
    try {
      var diag = global.__PIXI_MIGRATION_PIXI_FLOOR_CAMERA_TRANSFORM_REUSE_DIAGNOSTICS__ || null;
      if (diag && typeof diag.notePixiFloorCameraTransformReuse === 'function') {
        diag.notePixiFloorCameraTransformReuse(payload || {}, { source: payload && payload.source || 'pixi-floor-camera-transform-reuse' });
      }
    } catch (_) {}
  }

  function tryDrawSharedFloorLayer(reason, sharedFrameSnapshot) {
    var startAt = nowMs();
    if (!state.initialized || !ensurePixiContainers()) return null;
    var Sprite = getPixiConstructor('Sprite');
    var Texture = getPixiConstructor('Texture');
    if (typeof Sprite !== 'function' || !Texture || typeof Texture.from !== 'function') return null;
    var snapshot = sharedFrameSnapshot && sharedFrameSnapshot.floorSnapshot ? sharedFrameSnapshot.floorSnapshot : getSharedFloorLayerCacheSnapshot(reason || 'draw-pixi-shared-floor-layer');
    state.sharedFloorLastSnapshot = snapshot || null;
    if (!snapshot || snapshot.ready !== true || !snapshot.surfaceCanvas) {
      notifyPixiFloorSharedConsumer({
        ok: false,
        activeBackend: detectActiveBackend(),
        usesSharedFloorLayerCache: false,
        pixiFloorBypassesSharedCache: true,
        fallbackToFirstPass: true,
        fallbackReason: !snapshot ? 'shared-floor-snapshot-missing' : 'shared-floor-snapshot-not-ready',
        sharedSurfaceReady: false,
        sharedSourceReady: !!(snapshot && snapshot.ready),
        canvas2dFallback: 'enabled',
        source: reason || 'draw-pixi-shared-floor-layer'
      });
      return null;
    }
    syncPixiLayerMetrics('draw-shared-floor');
    drawPixiBackground();

    var signature = makeSharedFloorTextureSignature(snapshot);
    var textureUpdatedOnDirty = false;
    var spriteReusedOnStableFrame = false;
    var previousTextureSignature = state.sharedFloorTextureSignature || '';
    var textureUpdateReason = !state.sharedFloorTexture ? 'initial-texture-create' : (previousTextureSignature !== signature ? 'stable-texture-version-changed' : 'stable-texture-version-hit');
    try {
      if (!state.sharedFloorTexture || previousTextureSignature !== signature) {
        if (!state.sharedFloorTexture) state.sharedFloorTexture = Texture.from(snapshot.surfaceCanvas);
        else updateCanvasTexture(state.sharedFloorTexture);
        state.sharedFloorTextureSignature = signature;
        state.sharedFloorTextureUpdateCount += 1;
        textureUpdatedOnDirty = true;
      } else {
        state.sharedFloorSpriteReuseCount += 1;
        spriteReusedOnStableFrame = true;
      }
      if (!state.sharedFloorSprite) {
        state.sharedFloorSprite = new Sprite(state.sharedFloorTexture);
        state.sharedFloorSprite.label = 'pixi-migration-shared-floor-layer-cache-sprite';
        try { state.sharedFloorSprite.eventMode = 'none'; } catch (_) {}
      } else {
        state.sharedFloorSprite.texture = state.sharedFloorTexture;
      }
      clearFloorContainer(state.sharedFloorSprite);
      if (state.sharedFloorSprite.parent !== state.floorContainer && typeof state.floorContainer.addChild === 'function') state.floorContainer.addChild(state.sharedFloorSprite);
      applySharedFloorSpriteTransform(state.sharedFloorSprite, snapshot);
    } catch (_) {
      destroySharedFloorResources();
      notifyPixiFloorSharedConsumer({
        ok: false,
        activeBackend: detectActiveBackend(),
        usesSharedFloorLayerCache: false,
        pixiFloorBypassesSharedCache: true,
        fallbackToFirstPass: true,
        fallbackReason: 'shared-floor-texture-update-failed',
        sharedSurfaceReady: true,
        sharedSourceReady: true,
        canvas2dFallback: 'enabled',
        source: reason || 'draw-pixi-shared-floor-layer'
      });
      return null;
    }

    state.floorDrawCount += 1;
    state.sharedFloorConsumerDrawCount += 1;
    var wallMs = Math.max(0, nowMs() - startAt);
    var reuseTransform = snapshot.reuseTransform || {};
    var cameraTransformOnly = reuseTransform && reuseTransform.cameraTransformOnly === true;
    var transformDX = Number(reuseTransform && reuseTransform.dx || 0);
    var transformDY = Number(reuseTransform && reuseTransform.dy || 0);
    var transformScale = Number(reuseTransform && reuseTransform.scale || 1);
    var spriteTransformUpdated = cameraTransformOnly || Math.abs(transformDX) > 0.001 || Math.abs(transformDY) > 0.001 || Math.abs(transformScale - 1) > 0.001;
    var summary = {
      renderer: 'pixi',
      floorRenderer: 'pixi-shared-floor-layer-cache',
      active: detectActiveBackend(),
      visibleTiles: Number(snapshot.stats && snapshot.stats.floorBuiltTileCountThisFrame || 0),
      drawnTiles: 0,
      skippedTiles: 0,
      gridW: Number(getRuntimeSettings().gridW || 0),
      gridH: Number(getRuntimeSettings().gridH || 0),
      viewRotation: Number(snapshot.viewRotation || getCurrentViewRotation() || 0),
      projectionSource: 'shared-floor-layer-cache-source',
      textureSource: 'shared-floor-layer-canvas',
      usesSharedFloorLayerCache: true,
      pixiFloorBypassesSharedCache: false,
      pixiFloorFirstPassActive: false,
      textureUpdatedOnDirty: textureUpdatedOnDirty,
      spriteReusedOnStableFrame: spriteReusedOnStableFrame,
      sharedSurfaceReady: true,
      sharedSourceReady: true,
      sharedSourceDirty: snapshot.dirty === true,
      floorCacheVersion: String(snapshot.version || ''),
      floorCacheSignature: String(snapshot.signature || ''),
      stableFloorTextureVersion: String(snapshot.textureVersion || snapshot.version || ''),
      sharedSurfaceRevision: Number(snapshot.sharedSurfaceRevision || 0),
      textureSignatureStable: true,
      textureUpdateReason: textureUpdateReason,
      cameraMoveOnly: cameraTransformOnly,
      spriteTransformUpdated: spriteTransformUpdated,
      sharedSurfaceRevisionStableOnPan: cameraTransformOnly && !textureUpdatedOnDirty,
      floorTextureCameraIndependent: true,
      cameraTransformDX: Number(transformDX.toFixed ? transformDX.toFixed(3) : transformDX),
      cameraTransformDY: Number(transformDY.toFixed ? transformDY.toFixed(3) : transformDY),
      cameraTransformScale: Number(transformScale.toFixed ? transformScale.toFixed(4) : transformScale),
      textureUpdateCount: state.sharedFloorTextureUpdateCount,
      spriteReuseCount: state.sharedFloorSpriteReuseCount,
      textureWidth: Number(snapshot.surfaceWidth || 0),
      textureHeight: Number(snapshot.surfaceHeight || 0),
      tileHitTestOwner: 'legacy',
      objectSelectionOwner: 'legacy',
      canvas2dFloorFallback: 'enabled',
      canvas2dFallback: 'enabled',
      canvas2dBackgroundSkipped: true,
      canvas2dFloorSkipped: true,
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      changesDepthSort: false,
      changesPicking: false,
      changesObjectData: false,
      changesRenderOrder: false,
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      ok: true,
      reason: 'pixi-shared-floor-layer-cache-drawn',
      drawWallMs: Number(wallMs.toFixed ? wallMs.toFixed(3) : wallMs),
      drawCount: state.floorDrawCount,
      source: reason || 'draw-pixi-shared-floor-layer'
    };
    state.lastFloorSummary = summary;
    state.sharedFloorLastSummary = summary;
    global.__PIXI_MIGRATION_LAST_PIXI_FLOOR_SUMMARY__ = summary;
    notifyPixiFloorSharedConsumer(summary);
    notifyPixiFloorCameraTransformReuse(summary);
    try {
      if (global.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__ && typeof global.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__.notePixiFloorSummary === 'function') {
        global.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__.notePixiFloorSummary(summary, { source: 'draw-pixi-shared-floor-layer' });
      }
    } catch (_) {}
    maybeEmitFloorSummary('draw-pixi-shared-floor-layer');
    return summary;
  }

  function drawPixiFloorLayer(reason, sharedFrameSnapshot) {
    var startAt = nowMs();
    if (!state.initialized || !ensurePixiContainers()) {
      state.lastFloorSummary = Object.assign({}, state.lastFloorSummary, { ok: false, reason: 'pixi-not-initialized', drawnTiles: 0, visibleTiles: 0 });
      return state.lastFloorSummary;
    }
    var sharedFloorSummary = tryDrawSharedFloorLayer(reason || 'draw-pixi-floor-layer', sharedFrameSnapshot);
    if (sharedFloorSummary && sharedFloorSummary.ok === true && sharedFloorSummary.usesSharedFloorLayerCache === true) return sharedFloorSummary;
    var Graphics = getPixiConstructor('Graphics');
    if (typeof Graphics !== 'function') {
      state.lastFloorSummary = Object.assign({}, state.lastFloorSummary, { ok: false, reason: 'pixi-graphics-missing', drawnTiles: 0, visibleTiles: 0 });
      return state.lastFloorSummary;
    }

    syncPixiLayerMetrics('draw-floor');
    drawPixiBackground();
    clearFloorContainer();

    var settings = getRuntimeSettings();
    var camera = getRuntimeCamera();
    var viewRotation = getCurrentViewRotation();
    var range = getVisibleTileRange(settings, viewRotation);
    var visibleTiles = Math.max(0, Number(range.maxX - range.minX || 0)) * Math.max(0, Number(range.maxY - range.minY || 0));
    var drawnTiles = 0;
    var skippedTiles = 0;
    var strokeCss = 'rgba(255,255,255,.05)';
    var tileGraphics = new Graphics();
    tileGraphics.label = 'pixi-migration-floor-tiles';
    try { tileGraphics.eventMode = 'none'; } catch (_) {}

    for (var y = range.minY; y < range.maxY; y++) {
      for (var x = range.minX; x < range.maxX; x++) {
        var projectedNoCamera = projectWorldFaceNoCamera([
          { x: x, y: y, z: 0 },
          { x: x + 1, y: y, z: 0 },
          { x: x + 1, y: y + 1, z: 0 },
          { x: x, y: y + 1, z: 0 }
        ], viewRotation, settings);
        var projected = addCamera(projectedNoCamera, camera);
        if (drawPolygon(tileGraphics, projected, getTileFillCss(x, y), strokeCss, 1)) drawnTiles += 1;
        else skippedTiles += 1;
      }
    }

    var outlineNoCamera = projectWorldFaceNoCamera([
      { x: 0, y: 0, z: 0 },
      { x: range.gridW, y: 0, z: 0 },
      { x: range.gridW, y: range.gridH, z: 0 },
      { x: 0, y: range.gridH, z: 0 }
    ], viewRotation, settings);
    drawPolygon(tileGraphics, addCamera(outlineNoCamera, camera), 'rgba(0,0,0,0)', 'rgba(255,255,255,.14)', 2);

    try { state.floorContainer.addChild(tileGraphics); } catch (_) {}
    state.floorDrawCount += 1;
    var wallMs = Math.max(0, nowMs() - startAt);
    state.lastFloorSummary = {
      renderer: 'pixi',
      active: detectActiveBackend(),
      visibleTiles: visibleTiles,
      drawnTiles: drawnTiles,
      skippedTiles: skippedTiles,
      gridW: range.gridW,
      gridH: range.gridH,
      minX: range.minX,
      minY: range.minY,
      maxX: range.maxX,
      maxY: range.maxY,
      viewRotation: Number(viewRotation || 0),
      projectionSource: typeof global.screenPointsFromWorldFaceNoCamera === 'function' ? 'existing-screenPointsFromWorldFaceNoCamera' : 'fallback-iso-formula',
      usesSharedFloorLayerCache: false,
      pixiFloorBypassesSharedCache: true,
      pixiFloorFirstPassActive: true,
      textureUpdatedOnDirty: false,
      spriteReusedOnStableFrame: false,
      fallbackToFirstPass: true,
      floorCacheVersion: '',
      floorCacheSignature: '',
      tileHitTestOwner: 'legacy',
      objectSelectionOwner: 'legacy',
      canvas2dFloorFallback: 'enabled',
      canvas2dBackgroundSkipped: drawnTiles > 0,
      canvas2dFloorSkipped: drawnTiles > 0,
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      ok: drawnTiles > 0,
      reason: drawnTiles > 0 ? 'pixi-floor-drawn' : 'no-tiles-drawn',
      drawWallMs: Number(wallMs.toFixed ? wallMs.toFixed(3) : wallMs),
      drawCount: state.floorDrawCount,
      source: reason || 'draw-pixi-floor-layer'
    };
    global.__PIXI_MIGRATION_LAST_PIXI_FLOOR_SUMMARY__ = state.lastFloorSummary;
    notifyPixiFloorSharedConsumer(state.lastFloorSummary);
    try {
      if (global.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__ && typeof global.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__.notePixiFloorSummary === 'function') {
        global.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__.notePixiFloorSummary(state.lastFloorSummary, { source: 'draw-pixi-floor-layer' });
      }
    } catch (_) {}
    maybeEmitFloorSummary('draw-pixi-floor-layer');
    return state.lastFloorSummary;
  }

  function maybeEmitFloorSummary(reason) {
    var floor = state.lastFloorSummary || {};
    var signature = [floor.renderer, floor.active, floor.visibleTiles, floor.drawnTiles, floor.viewRotation, floor.ok ? 1 : 0, floor.reason, floor.usesSharedFloorLayerCache ? 1 : 0, floor.floorCacheVersion || ''].join('|');
    var current = nowMs();
    if (signature === state.lastFloorSignature && (current - Number(state.lastFloorLogAt || 0)) < 5000) return;
    state.lastFloorSignature = signature;
    state.lastFloorLogAt = current;
    emit('floor', {
      renderer: floor.renderer || 'pixi',
      active: floor.active || detectActiveBackend(),
      visibleTiles: Number(floor.visibleTiles || 0),
      drawnTiles: Number(floor.drawnTiles || 0),
      skippedTiles: Number(floor.skippedTiles || 0),
      gridW: Number(floor.gridW || 0),
      gridH: Number(floor.gridH || 0),
      viewRotation: Number(floor.viewRotation || 0),
      projectionSource: floor.projectionSource || 'existing',
      usesSharedFloorLayerCache: floor.usesSharedFloorLayerCache === true,
      pixiFloorBypassesSharedCache: floor.pixiFloorBypassesSharedCache === true,
      textureUpdatedOnDirty: floor.textureUpdatedOnDirty === true,
      spriteReusedOnStableFrame: floor.spriteReusedOnStableFrame === true,
      floorCacheVersion: floor.floorCacheVersion || '',
      tileHitTestOwner: 'legacy',
      objectSelectionOwner: 'legacy',
      canvas2dFloorFallback: 'enabled',
      canvas2dFloorSkipped: floor.canvas2dFloorSkipped === true,
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      ok: floor.ok === true,
      reason: floor.reason || '',
      source: reason || 'floor-summary'
    });
  }

  function emitBackendStatus(reason) {
    maybeEmitStart('backend-status');
    var snapshot = getBackendSnapshot();
    var active = snapshot.activeBackend || detectActiveBackend();
    var signature = [
      snapshot.requestedBackend || 'canvas2d', active || 'unknown', snapshot.canvas2dRegistered === true ? 1 : 0,
      snapshot.pixiRegistered === true ? 1 : 0, snapshot.pixiEnabled === true ? 1 : 0,
      state.registered ? 1 : 0, state.initialized ? 1 : 0, state.floorDrawCount > 0 ? 1 : 0
    ].join('|');
    if (signature === state.lastBackendSignature) return snapshot;
    state.lastBackendSignature = signature;
    emit('backend', {
      requested: snapshot.requestedBackend || 'canvas2d',
      active: active || 'unknown',
      canvas2dRegistered: snapshot.canvas2dRegistered === true,
      pixiRegistered: snapshot.pixiRegistered === true || state.registered === true,
      pixiEnabled: snapshot.pixiEnabled === true || active === 'pixi',
      pixiFloorLayerRegistered: state.registered === true,
      pixiInitialized: state.initialized === true,
      pixiRendererCreated: state.rendererCreated === true,
      pixiDrawsFloor: state.floorDrawCount > 0,
      touchedFeature: 'pixi-tile-floor-first-pass',
      source: reason || 'status'
    });
    return snapshot;
  }

  function emitPixiStatus(reason) {
    maybeEmitStart('pixi-status');
    var signature = [
      detectPixiGlobal() ? 1 : 0, state.registered ? 1 : 0, state.pixiLoadRequested ? 1 : 0,
      state.initializing ? 1 : 0, state.initialized ? 1 : 0, state.rendererCreated ? 1 : 0,
      state.worldContainerCreated ? 1 : 0, state.floorContainerCreated ? 1 : 0,
      state.pixiCanvasAttached ? 1 : 0, state.floorDrawCount, state.initFailed ? state.initFailureReason : ''
    ].join('|');
    if (signature === state.lastPixiSignature) return;
    state.lastPixiSignature = signature;
    emit('pixi', {
      available: detectPixiGlobal(),
      registered: state.registered === true,
      loadRequested: state.pixiLoadRequested === true,
      initializing: state.initializing === true,
      initialized: state.initialized === true,
      rendererCreated: state.rendererCreated === true,
      applicationCreated: state.applicationCreated === true,
      canvasAttached: state.pixiCanvasAttached === true,
      worldContainer: state.worldContainerCreated === true,
      worldContainerChildren: state.worldContainer && state.worldContainer.children ? state.worldContainer.children.length : 0,
      floorContainer: state.floorContainerCreated === true,
      floorDrawCount: state.floorDrawCount,
      rendererWidth: state.pixiRendererWidth,
      rendererHeight: state.pixiRendererHeight,
      canvasWidth: state.pixiCanvasWidth,
      canvasHeight: state.pixiCanvasHeight,
      resolution: state.pixiResolution,
      rendererType: state.pixiRendererType,
      ownsPointer: false,
      ownsPicking: false,
      ownsBusinessObjects: false,
      usesZIndex: false,
      sortChildren: false,
      initFailed: state.initFailed === true,
      initFailureReason: state.initFailureReason || '',
      source: reason || 'status'
    });
  }

  function emitFallbackStatus(reason) {
    maybeEmitStart('fallback-status');
    if (state.fallbackLogged) return;
    state.fallbackLogged = true;
    var snapshot = getBackendSnapshot();
    emit('fallback', {
      canvas2dFallback: 'enabled',
      canvas2dDrawsObjectsActorsOverlaysHud: true,
      canvas2dFloorFallback: 'enabled',
      active: snapshot.activeBackend || detectActiveBackend(),
      pixiFloorLayerRegistered: state.registered === true,
      pixiRendererCreated: state.rendererCreated === true,
      pixiInitialized: state.initialized === true,
      pixiDrawsFloor: state.floorDrawCount > 0,
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      reason: reason || 'canvas2d-default-backend'
    });
  }

  function emitInputStatus(reason) {
    if (state.inputLogged && reason !== 'pixi-renderFrame') return;
    state.inputLogged = true;
    emit('input', {
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      existingCanvasInput: true,
      targetCanvasId: 'game',
      tileHitTestOwner: 'legacy',
      objectSelectionOwner: 'legacy',
      source: reason || 'input-status'
    });
  }

  function shouldEmit(kind, signature, intervalMs) {
    var current = nowMs();
    var sigKey = kind === 'render' ? 'lastRenderSignature' : 'lastFrameSignature';
    var atKey = kind === 'render' ? 'lastRenderLogAt' : 'lastFrameLogAt';
    if (state[sigKey] === signature && (current - Number(state[atKey] || 0)) < Number(intervalMs || 5000)) return false;
    state[sigKey] = signature;
    state[atKey] = current;
    return true;
  }

  function emitSummary(reason) {
    maybeEmitStart('summary');
    var snapshot = getBackendSnapshot();
    var active = snapshot.activeBackend || detectActiveBackend();
    var pixiEnabled = snapshot.pixiEnabled === true || active === 'pixi';
    var floor = state.lastFloorSummary || {};
    var ok = false;
    if (active === 'canvas2d') {
      ok = snapshot.canvas2dRegistered === true && (snapshot.pixiRegistered === true || state.registered === true) && state.initFailed !== true;
    } else if (active === 'pixi') {
      ok = snapshot.canvas2dRegistered === true
        && (snapshot.pixiRegistered === true || state.registered === true)
        && state.initialized === true
        && state.rendererCreated === true
        && floor.ok === true
        && (floor.usesSharedFloorLayerCache === true || Number(floor.drawnTiles || 0) > 0)
        && state.initFailed !== true;
    }
    var signature = [
      active || 'unknown', snapshot.canvas2dRegistered === true ? 1 : 0,
      (snapshot.pixiRegistered === true || state.registered === true) ? 1 : 0,
      pixiEnabled ? 1 : 0, state.pixiLoadRequested ? 1 : 0,
      state.initializing ? 1 : 0, state.initialized ? 1 : 0,
      state.rendererCreated ? 1 : 0, state.floorDrawCount,
      floor.drawnTiles || 0, state.initFailed ? state.initFailureReason : ''
    ].join('|');
    if (signature === state.lastSummarySignature) return;
    state.lastSummarySignature = signature;
    emit('summary', {
      ok: ok,
      touchedFeature: 'pixi-tile-floor-first-pass',
      requested: snapshot.requestedBackend || 'canvas2d',
      active: active || 'unknown',
      canvas2dRegistered: snapshot.canvas2dRegistered === true,
      pixiRegistered: snapshot.pixiRegistered === true || state.registered === true,
      pixiEnabled: pixiEnabled,
      pixiAvailable: detectPixiGlobal(),
      pixiLoadRequested: state.pixiLoadRequested === true,
      pixiInitialized: state.initialized === true,
      pixiRendererCreated: state.rendererCreated === true,
      pixiApplicationCreated: state.applicationCreated === true,
      pixiWorldContainer: state.worldContainerCreated === true,
      pixiFloorContainer: state.floorContainerCreated === true,
      pixiWorldContainerChildren: state.worldContainer && state.worldContainer.children ? state.worldContainer.children.length : 0,
      rendererWidth: state.pixiRendererWidth,
      rendererHeight: state.pixiRendererHeight,
      canvasWidth: state.pixiCanvasWidth,
      canvasHeight: state.pixiCanvasHeight,
      resolution: state.pixiResolution,
      rendererType: state.pixiRendererType,
      floorRenderer: floor.floorRenderer || floor.renderer || 'pixi',
      visibleTiles: Number(floor.visibleTiles || 0),
      drawnTiles: Number(floor.drawnTiles || 0),
      usesSharedFloorLayerCache: floor.usesSharedFloorLayerCache === true,
      pixiFloorBypassesSharedCache: floor.pixiFloorBypassesSharedCache === true,
      textureUpdatedOnDirty: floor.textureUpdatedOnDirty === true,
      spriteReusedOnStableFrame: floor.spriteReusedOnStableFrame === true,
      floorCacheVersion: floor.floorCacheVersion || '',
      tileHitTestOwner: 'legacy',
      objectSelectionOwner: 'legacy',
      pixiDrawsWorldContent: floor.usesSharedFloorLayerCache === true || Number(floor.drawnTiles || 0) > 0,
      pixiDrawsFloor: floor.usesSharedFloorLayerCache === true || Number(floor.drawnTiles || 0) > 0,
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      canvas2dFallback: 'enabled',
      canvas2dFloorFallback: 'enabled',
      canvas2dFloorSkipped: floor.canvas2dFloorSkipped === true,
      initFailed: state.initFailed === true,
      initFailureReason: state.initFailureReason || '',
      source: reason || 'summary'
    });
  }

  function syncPixiLayerMetrics(reason) {
    var targetCanvas = getTargetCanvas();
    var app = state.pixiApp;
    var pixiCanvas = state.pixiCanvas || (app && (app.canvas || app.view)) || null;
    if (!targetCanvas || !app || !pixiCanvas) return false;
    var cssRect = getCanvasCssRect(targetCanvas);
    var width = Math.max(1, Number(targetCanvas.width || Math.round((cssRect.width || targetCanvas.clientWidth || 1) * getDevicePixelRatio())));
    var height = Math.max(1, Number(targetCanvas.height || Math.round((cssRect.height || targetCanvas.clientHeight || 1) * getDevicePixelRatio())));
    try {
      if (app.renderer && typeof app.renderer.resize === 'function') app.renderer.resize(width, height);
      else if (typeof app.resize === 'function') app.resize();
    } catch (_) {}
    updatePixiCanvasStyle(targetCanvas, pixiCanvas);
    state.pixiCanvasWidth = Number(pixiCanvas.width || width || 0);
    state.pixiCanvasHeight = Number(pixiCanvas.height || height || 0);
    try {
      state.pixiRendererWidth = Number(app.renderer && app.renderer.width || width || 0);
      state.pixiRendererHeight = Number(app.renderer && app.renderer.height || height || 0);
      state.pixiResolution = Number(app.renderer && app.renderer.resolution || getDevicePixelRatio());
    } catch (_) {
      state.pixiRendererWidth = width;
      state.pixiRendererHeight = height;
      state.pixiResolution = getDevicePixelRatio();
    }
    state.pixiRendererType = getRendererType(app);
    if (!state.emptyLayerLogged) {
      state.emptyLayerLogged = true;
      emit('empty-world-layer', {
        initialized: state.initialized === true,
        worldContainer: state.worldContainerCreated === true,
        children: state.worldContainer && state.worldContainer.children ? state.worldContainer.children.length : 0,
        rendererWidth: state.pixiRendererWidth,
        rendererHeight: state.pixiRendererHeight,
        canvasWidth: state.pixiCanvasWidth,
        canvasHeight: state.pixiCanvasHeight,
        resolution: state.pixiResolution,
        rendererType: state.pixiRendererType,
        pointerEvents: pixiCanvas.style.pointerEvents || 'unknown',
        source: reason || 'empty-layer-ready'
      });
    }
    return true;
  }

  function ensurePixiTileFloorLayer(reason) {
    if (state.initialized && state.pixiApp && state.worldContainer) {
      syncPixiLayerMetrics(reason || 'already-initialized');
      return Promise.resolve(true);
    }
    if (state.initializing) return Promise.resolve(false);
    state.initAttempted = true;
    if (!detectPixiGlobal()) {
      requestPixiLibraryLoad().then(function (available) {
        if (available) ensurePixiTileFloorLayer('pixi-library-loaded');
        else {
          state.initFailed = true;
          state.initFailureReason = state.pixiLoadFailureReason || 'pixi-global-missing';
          emitPixiStatus('pixi-library-unavailable');
          emitSummary('pixi-library-unavailable');
        }
      });
      return Promise.resolve(false);
    }

    var targetCanvas = getTargetCanvas();
    var wrap = getCanvasWrap(targetCanvas);
    var Application = getPixiConstructor('Application');
    var Container = getPixiConstructor('Container');
    if (!targetCanvas || !wrap || typeof Application !== 'function' || typeof Container !== 'function') {
      state.initFailed = true;
      state.initFailureReason = !targetCanvas ? 'target-canvas-missing' : (!wrap ? 'canvas-wrap-missing' : 'pixi-constructors-missing');
      emit('pixi', { initialized: false, rendererCreated: false, reason: state.initFailureReason, source: reason || 'ensure-tile-floor-layer' });
      emitSummary('tile-floor-init-failed');
      return Promise.resolve(false);
    }

    state.initializing = true;
    state.initFailed = false;
    state.initFailureReason = '';
    emit('pixi', {
      available: true,
      initializing: true,
      initialized: false,
      requestedTileFloorLayer: true,
      targetCanvasId: 'game',
      source: reason || 'ensure-tile-floor-layer'
    });

    try {
      var app = new Application();
      var cssRect = getCanvasCssRect(targetCanvas);
      var width = Math.max(1, Number(targetCanvas.width || Math.round((cssRect.width || targetCanvas.clientWidth || 1) * getDevicePixelRatio())));
      var height = Math.max(1, Number(targetCanvas.height || Math.round((cssRect.height || targetCanvas.clientHeight || 1) * getDevicePixelRatio())));
      var initOptions = {
        width: width,
        height: height,
        resolution: getDevicePixelRatio(),
        autoDensity: true,
        backgroundAlpha: 0,
        antialias: false,
        clearBeforeRender: true,
        eventMode: 'none',
        preference: 'webgl'
      };
      var initResult = app && typeof app.init === 'function' ? app.init(initOptions) : null;
      return Promise.resolve(initResult).then(function () {
        var worldContainer = new Container();
        worldContainer.label = 'pixi-migration-world-container';
        worldContainer.sortableChildren = false;
        try { worldContainer.eventMode = 'none'; } catch (_) {}
        if (app.stage && typeof app.stage.addChild === 'function') app.stage.addChild(worldContainer);
        var pixiCanvas = app.canvas || app.view || null;
        updatePixiCanvasStyle(targetCanvas, pixiCanvas);
        if (pixiCanvas && pixiCanvas.parentNode !== wrap && typeof wrap.insertBefore === 'function') wrap.insertBefore(pixiCanvas, targetCanvas);
        else if (pixiCanvas && pixiCanvas.parentNode !== wrap && typeof wrap.appendChild === 'function') wrap.appendChild(pixiCanvas);
        state.pixiApp = app;
        state.worldContainer = worldContainer;
        state.pixiCanvas = pixiCanvas;
        state.initialized = true;
        state.initializing = false;
        state.rendererCreated = !!app.renderer;
        state.applicationCreated = true;
        state.worldContainerCreated = true;
        state.pixiCanvasAttached = !!(pixiCanvas && pixiCanvas.parentNode === wrap);
        syncPixiLayerMetrics('init-complete');
        maybeEmitGpuDiagnostics('init-complete', { phase: 'init', gpuUsageIntent: 'pixi-presentation-layer' });
        ensurePixiContainers();
        emitInputStatus('init-complete');
        emitPixiStatus('init-complete');
        drawPixiFloorLayer('init-complete');
        emitSummary('init-complete');
        return true;
      }).catch(function (err) {
        state.initializing = false;
        state.initFailed = true;
        state.initFailureReason = err && err.message ? String(err.message) : String(err || 'init-failed');
        emit('summary', { ok: false, touchedFeature: 'pixi-tile-floor-first-pass', reason: 'pixi-init-failed', message: state.initFailureReason });
        return false;
      });
    } catch (err) {
      state.initializing = false;
      state.initFailed = true;
      state.initFailureReason = err && err.message ? String(err.message) : String(err || 'init-exception');
      emit('summary', { ok: false, touchedFeature: 'pixi-tile-floor-first-pass', reason: 'pixi-init-exception', message: state.initFailureReason });
      return Promise.resolve(false);
    }
  }

  function noteFramePlan(framePlan, meta) {
    maybeEmitStart('frame-plan');
    var order = framePlan && Array.isArray(framePlan.order) ? framePlan.order : [];
    var snapshot = getBackendSnapshot();
    var active = snapshot.activeBackend || detectActiveBackend();
    var signature = [active, framePlan && framePlan.id || 'unknown', order.length, state.registered ? 1 : 0, state.initialized ? 1 : 0, state.floorDrawCount].join('|');
    if (shouldEmit('frame', signature, 5000)) {
      emit('frame', {
        active: active,
        framePlanId: framePlan && framePlan.id ? framePlan.id : 'unknown',
        order: order.length,
        pixiTileFloorLayerRegistered: state.registered === true,
        pixiInitialized: state.initialized === true,
        pixiRendererCreated: state.rendererCreated === true,
        pixiDrawsFloor: state.floorDrawCount > 0,
        drawnTiles: Number(state.lastFloorSummary && state.lastFloorSummary.drawnTiles || 0),
        source: meta && meta.source || 'frame-plan'
      });
    }
    emitBackendStatus('frame-plan');
    emitPixiStatus('frame-plan');
    emitSummary('frame-plan');
    return framePlan;
  }

  function noteRenderSummary(renderSummary) {
    maybeEmitStart('render-summary');
    var safe = renderSummary && typeof renderSummary === 'object' ? renderSummary : {};
    var snapshot = getBackendSnapshot();
    var active = snapshot.activeBackend || detectActiveBackend();
    var renderableCount = Number(safe.renderableCount || 0);
    var signature = [active, safe.framePlanId || 'unknown', renderableCount, safe.renderer || 'canvas2d', state.initialized ? 1 : 0, state.floorDrawCount].join('|');
    if (shouldEmit('render', signature, 5000)) {
      emit('render', {
        active: active,
        renderer: safe.renderer || 'canvas2d',
        framePlanId: safe.framePlanId || 'unknown',
        renderableCount: renderableCount,
        pixiTileFloorLayerRegistered: state.registered === true,
        pixiInitialized: state.initialized === true,
        pixiRendererCreated: state.rendererCreated === true,
        pixiDrawsFloor: state.floorDrawCount > 0,
        drawnTiles: Number(state.lastFloorSummary && state.lastFloorSummary.drawnTiles || 0),
        canvas2dFallback: 'enabled',
        source: safe.source || 'render-summary'
      });
    }
    emitBackendStatus('render-summary');
    emitPixiStatus('render-summary');
    emitFallbackStatus('render-summary');
    maybeEmitFloorSummary('render-summary');
    emitSummary('render-summary');
    return safe;
  }

  function getCanvas2dFallbackApi() {
    try { return global.App && global.App.renderer && global.App.renderer.canvas2d || null; } catch (_) {}
    return null;
  }

  function setCanvas2dBaseWorldOverride(enabled) {
    var previous = global.__PIXI_MIGRATION_CANVAS2D_BASEWORLD_OVERRIDE__ || null;
    if (!enabled) return { previous: previous, applied: false };
    global.__PIXI_MIGRATION_CANVAS2D_BASEWORLD_OVERRIDE__ = {
      active: true,
      step: STEP,
      source: 'pixi-tile-floor-first-pass',
      skipBackground: true,
      skipFloor: true,
      floorOwner: 'pixi',
      tileHitTestOwner: 'legacy',
      objectSelectionOwner: 'legacy',
      floorSummary: state.lastFloorSummary || null
    };
    return { previous: previous, applied: true };
  }

  function restoreCanvas2dBaseWorldOverride(token) {
    try {
      if (!token || !token.applied) return;
      if (token.previous) global.__PIXI_MIGRATION_CANVAS2D_BASEWORLD_OVERRIDE__ = token.previous;
      else delete global.__PIXI_MIGRATION_CANVAS2D_BASEWORLD_OVERRIDE__;
    } catch (_) {}
  }

  function notifyPerformanceComparison(payload) {
    try {
      if (global.__PIXI_MIGRATION_PERFORMANCE_COMPARISON_DIAGNOSTICS__ && typeof global.__PIXI_MIGRATION_PERFORMANCE_COMPARISON_DIAGNOSTICS__.notePixiFrame === 'function') {
        global.__PIXI_MIGRATION_PERFORMANCE_COMPARISON_DIAGNOSTICS__.notePixiFrame(payload || {});
      }
    } catch (_) {}
  }

  function emitPixiFrameForensics(payload) {
    payload = payload || {};
    var floorChildren = countVisibleChildrenForensics(state.floorContainer);
    var staticChildren = countVisibleChildrenForensics(state.staticRunContainer);
    var playerChildren = countVisibleChildrenForensics(state.playerContainer);
    var dynamicChildren = countVisibleChildrenForensics(state.dynamicRenderableContainer);
    var canvas2dShare = toFiniteNumber(payload.frameTotalMs, 0) > 0 ? roundDiag(toFiniteNumber(payload.canvas2dFallbackFrameMs, 0) / toFiniteNumber(payload.frameTotalMs, 1), 4) : 0;
    var frame = Object.assign({
      source: 'pixi-world-renderer-frame-forensics',
      step: STEP,
      framePlanId: payload.framePlanId || '',
      frameTotalMs: roundDiag(payload.frameTotalMs, 3),
      pixiFloorDrawMs: roundDiag(payload.pixiFloorDrawMs, 3),
      pixiStaticWorldDrawMs: roundDiag(payload.pixiStaticWorldDrawMs, 3),
      pixiPlayerDrawMs: roundDiag(payload.pixiPlayerDrawMs, 3),
      canvas2dFallbackFrameMs: roundDiag(payload.canvas2dFallbackFrameMs, 3),
      canvas2dFallbackShare: canvas2dShare,
      pixiDrawsFloor: payload.pixiDrawsFloor === true,
      pixiDrawsStaticWorldPackets: payload.pixiDrawsStaticWorldPackets === true,
      pixiDrawsPlayerAvatar: payload.pixiDrawsPlayerAvatar === true,
      pixiDrawsDynamicRenderables: payload.pixiDrawsDynamicRenderables === true,
      canvas2dStaticWorldSkipped: payload.canvas2dStaticWorldSkipped === true,
      canvas2dSkipsPlayerAvatar: payload.canvas2dSkipsPlayerAvatar === true,
      canvas2dSkipsAdoptedDynamicRenderables: payload.canvas2dSkipsAdoptedDynamicRenderables === true,
      staticPacketCount: toFiniteNumber(payload.staticPacketCount, 0),
      staticPacketDrawCount: toFiniteNumber(payload.staticPacketDrawCount, 0),
      actualStaticDrawUnitCount: toFiniteNumber(payload.actualStaticDrawUnitCount, 0),
      actualStaticCacheSpriteDrawCount: toFiniteNumber(payload.actualStaticCacheSpriteDrawCount, 0),
      actualStaticGraphicsPacketDrawCount: toFiniteNumber(payload.actualStaticGraphicsPacketDrawCount, 0),
      chunkRenderTextureHitRate: roundDiag(payload.chunkRenderTextureHitRate, 4),
      chunkRenderTextureMissCount: toFiniteNumber(payload.chunkRenderTextureMissCount, 0),
      chunkRenderTextureUploadCount: toFiniteNumber(payload.chunkRenderTextureUploadCount, 0),
      orderRunRenderTextureHitRate: roundDiag(payload.orderRunRenderTextureHitRate, 4),
      orderRunRenderTextureMissCount: toFiniteNumber(payload.orderRunRenderTextureMissCount, 0),
      staticPacketItemCacheHitRate: roundDiag(payload.staticPacketItemCacheHitRate, 4),
      staticChunkDrawDataCacheHitRate: roundDiag(payload.staticChunkDrawDataCacheHitRate, 4),
      usesSharedFloorLayerCache: payload.usesSharedFloorLayerCache === true,
      floorTextureUpdateCount: toFiniteNumber(payload.floorTextureUpdateCount, 0),
      floorSpriteReuseCount: toFiniteNumber(payload.floorSpriteReuseCount, 0),
      gpuAccelerated: payload.gpuAccelerated === true,
      gpuBackendFamily: payload.gpuBackendFamily || 'unknown',
      pixiRendererType: payload.pixiRendererType || state.pixiRendererType || 'unknown',
      rendererSize: [toFiniteNumber(state.pixiRendererWidth, 0), toFiniteNumber(state.pixiRendererHeight, 0)].join('x'),
      floorContainerChildren: floorChildren,
      staticContainerChildren: staticChildren,
      playerContainerChildren: playerChildren,
      dynamicContainerChildren: dynamicChildren,
      residualCanvas2dDominates: canvas2dShare >= 0.5,
      cacheMissStorm: (toFiniteNumber(payload.chunkRenderTextureCount, 0) > 0 && roundDiag(payload.chunkRenderTextureHitRate, 4) < 0.85) || toFiniteNumber(payload.chunkRenderTextureUploadCount, 0) > 0 || toFiniteNumber(payload.orderRunRenderTextureMissCount, 0) > 0,
      pixiOwnershipIncomplete: !(payload.pixiDrawsStaticWorldPackets === true && payload.canvas2dStaticWorldSkipped === true)
    }, payload.extra || {});
    var signature = '';
    try {
      signature = JSON.stringify({
        plan: frame.framePlanId,
        totalBucket: Math.floor(toFiniteNumber(frame.frameTotalMs, 0) / 4),
        fallbackBucket: Math.floor(toFiniteNumber(frame.canvas2dFallbackFrameMs, 0) / 4),
        staticBucket: Math.floor(toFiniteNumber(frame.pixiStaticWorldDrawMs, 0) / 4),
        chunkHit: frame.chunkRenderTextureHitRate,
        miss: frame.chunkRenderTextureMissCount,
        ownership: frame.pixiOwnershipIncomplete,
        residual: frame.residualCanvas2dDominates
      });
    } catch (_) { signature = String(frame.framePlanId || '') + '|' + String(frame.frameTotalMs || 0); }
    var t = nowMs();
    var force = toFiniteNumber(frame.frameTotalMs, 0) >= 16 || toFiniteNumber(frame.canvas2dFallbackFrameMs, 0) >= 8 || frame.cacheMissStorm || frame.pixiOwnershipIncomplete;
    if (!force && signature === state.lastFrameForensicsSignature && (t - Number(state.lastFrameForensicsEmitAt || 0)) < 1200) return;
    state.lastFrameForensicsSignature = signature;
    state.lastFrameForensicsEmitAt = t;
    emit('forensics-frame', frame);
  }


  function getPixiDynamicRenderableConsumer() {
    try { return global.__SHARED_RENDER_OPTIMIZATION_PIXI_DYNAMIC_RENDERABLE_CONSUMER__ || null; } catch (_) {}
    return null;
  }

  function beginPixiDynamicRenderableFrame(reason, options) {
    options = options || {};
    try {
      if (!state.initialized || !ensurePixiContainers()) return null;
      var consumer = getPixiDynamicRenderableConsumer();
      if (!consumer || typeof consumer.beginFrame !== 'function') return null;
      return consumer.beginFrame({
        source: reason || 'pixi-renderFrame-before-canvas2d-fallback',
        container: state.dynamicRenderableContainer || null,
        framePlanId: options.framePlanId || '',
        activeBackend: 'pixi',
        visualAdoption: options.visualAdoption === true,
        disabledReason: options.disabledReason || ''
      });
    } catch (_) {}
    return null;
  }

  function endPixiDynamicRenderableFrame(reason, options) {
    options = options || {};
    try {
      var consumer = getPixiDynamicRenderableConsumer();
      if (!consumer || typeof consumer.endFrame !== 'function') return null;
      var summary = consumer.endFrame({
        source: reason || 'pixi-renderFrame-after-canvas2d-fallback',
        activeBackend: 'pixi',
        framePlanId: options.framePlanId || ''
      }) || null;
      state.lastDynamicRenderableConsumerSummary = summary || null;
      return summary;
    } catch (_) {}
    return null;
  }


  function consumePixiPlayerSharedSprite(reason, options) {
    options = options || {};
    try {
      if (!state.initialized || !ensurePixiContainers()) return null;
      var consumer = global.__SHARED_RENDER_OPTIMIZATION_PIXI_PLAYER_CONSUMER__ || null;
      if (!consumer || typeof consumer.consume !== 'function') return null;
      var summary = consumer.consume({
        source: reason || 'pixi-renderFrame-before-canvas2d-fallback',
        container: state.playerContainer || null,
        framePlanId: options.framePlanId || '',
        visualAdoption: options.visualAdoption === true,
        disabledReason: options.disabledReason || ''
      }) || null;
      state.lastPlayerConsumerSummary = summary || null;
      return summary;
    } catch (_) {}
    return null;
  }


  function getZoomInteractionSnapshotForStaticAdoption() {
    try {
      if (typeof global.getStaticWorldFaceMergeControlStateSnapshotForRender === 'function') {
        var snapshot = global.getStaticWorldFaceMergeControlStateSnapshotForRender() || {};
        return {
          zoomInteractionActive: snapshot.zoomInteractionActive === true,
          zoomSettlePending: snapshot.zoomSettlePending === true,
          zoom: Number(snapshot.zoom || 0) || 0,
          effectiveFaceMergeMode: String(snapshot.effectiveFaceMergeMode || ''),
          pendingFaceMergeMode: String(snapshot.pendingFaceMergeMode || '')
        };
      }
    } catch (_) {}
    return {
      zoomInteractionActive: false,
      zoomSettlePending: false,
      zoom: 0,
      effectiveFaceMergeMode: '',
      pendingFaceMergeMode: ''
    };
  }

  function isZoomSingleWorldOwnerGuardActive(zoomSnapshot) {
    // PXM-07.11D: Pixi mode must keep migrated Pixi-owned world visuals in Pixi during zoom.
    // Do not let zoom/pinch hand the whole world back to Canvas2D; that violates renderer ownership.
    zoomSnapshot = zoomSnapshot || getZoomInteractionSnapshotForStaticAdoption();
    return false;
  }

  function setZoomSingleWorldOwnerGuardActive(active, zoomSnapshot, source) {
    // PXM-07.11D: keep this compat hook for diagnostics, but never suppress Pixi world visuals.
    active = false;
    zoomSnapshot = zoomSnapshot || getZoomInteractionSnapshotForStaticAdoption();
    try { global.__PIXI_MIGRATION_ZOOM_SINGLE_WORLD_OWNER_ACTIVE__ = false; } catch (_) {}
    try {
      if (state.worldContainer) state.worldContainer.visible = true;
      if (state.floorContainer) state.floorContainer.visible = true;
      if (state.staticRunContainer) state.staticRunContainer.visible = true;
      if (state.playerContainer) state.playerContainer.visible = true;
      if (state.dynamicRenderableContainer) state.dynamicRenderableContainer.visible = true;
    } catch (_) {}
    try {
      var diag = global.__PIXI_MIGRATION_ZOOM_SINGLE_WORLD_OWNER_DIAGNOSTICS__ || null;
      if (diag && typeof diag.noteZoomSingleWorldOwner === 'function') {
        diag.noteZoomSingleWorldOwner({
          section: active ? 'single-world-owner' : 'inactive',
          ok: true,
          activeBackend: detectActiveBackend(),
          zoomSingleWorldOwnerActive: active,
          zoomInteractionActive: zoomSnapshot.zoomInteractionActive === true,
          zoomSettlePending: zoomSnapshot.zoomSettlePending === true,
          zoom: Number(zoomSnapshot.zoom || 0),
          canvas2dOwnsWholeWorldDuringZoom: false,
          pixiWorldVisualSuppressed: false,
          pixiFloorSuppressed: false,
          pixiStaticSuppressed: false,
          pixiPlayerSuppressed: false,
          pixiDynamicSuppressed: false,
          canvas2dBaseWorldOverrideApplied: false,
          mixedRendererSplitDetected: false,
          seamRiskPrevented: false,
          objectFloorAlignmentProbeNeeded: true,
          fallbackReason: '',
          source: source || 'pixi-world-renderer'
        });
      }
    } catch (_) {}
    return active;
  }

  function consumePixiStaticRunSharedCache(reason, options) {
    options = options || {};
    var zoomSnapshot = getZoomInteractionSnapshotForStaticAdoption();
    // PXM-07.11D: zoom must not disable Pixi-owned migrated static runs.
    var zoomSuppressesVisualAdoption = false;
    try {
      var consumer = global.__SHARED_RENDER_OPTIMIZATION_PIXI_STATIC_RUN_CONSUMER__ || null;
      if (consumer && typeof consumer.consume === 'function') {
        return consumer.consume({
          source: reason || 'pixi-renderFrame-after-canvas2d-fallback',
          visualAdoption: options.visualAdoption === true && !zoomSuppressesVisualAdoption,
          visualAdoptionRequested: options.visualAdoption === true,
          visualAdoptionSuppressedByZoom: zoomSuppressesVisualAdoption,
          zoomInteractionActive: zoomSnapshot.zoomInteractionActive === true,
          zoomSettlePending: zoomSnapshot.zoomSettlePending === true,
          zoom: zoomSnapshot.zoom,
          effectiveFaceMergeMode: zoomSnapshot.effectiveFaceMergeMode,
          pendingFaceMergeMode: zoomSnapshot.pendingFaceMergeMode,
          container: state.staticRunContainer || null,
          camera: getRuntimeCamera(),
          canvas2dStaticFallback: 'enabled',
          depthInterleavingProtected: true,
          adoptionPolicy: 'segmented-prefix-exclusive-step1',
          fullStaticAdoption: false,
          segmentedAdoptionStage: 'step1-prefix-exclusive',
          maxVisualRuns: 1
        });
      }
    } catch (_) {}
    try {
      var diag = global.__PIXI_MIGRATION_PIXI_STATIC_RUN_SHARED_CONSUMER_DIAGNOSTICS__ || null;
      if (diag && typeof diag.notePixiStaticRunSharedConsumer === 'function') {
        diag.notePixiStaticRunSharedConsumer({
          ok: true,
          activeBackend: detectActiveBackend(),
          usesSharedStaticPacketRunCache: false,
          sharedStaticRunSourceReady: false,
          sharedStaticRunSourceObserved: false,
          staticRunCandidateCount: 0,
          staticRunTextureConsumedCount: 0,
          visualStaticRunAdoption: false,
          pixiDrawsStaticPacketRuns: false,
          canvas2dStaticFallback: 'enabled',
          canvas2dFallback: 'enabled',
          depthInterleavingProtected: true,
          blockedByDepthInterleaving: true,
          fallbackReason: 'pixi-static-run-consumer-api-missing',
          consumerMigration: 'pixi-texture-cache-nonvisual',
          drawBehaviorChanged: false,
          modifiesRendering: false,
          canvas2dBehaviorChanged: false,
          pixiBehaviorChanged: false,
          changesDepthSort: false,
          changesPicking: false,
          pixiOwnsPicking: false,
          pixiSortChildren: false,
          pixiZIndexUsed: false,
          source: reason || 'pixi-static-run-consumer-missing'
        }, { source: reason || 'pixi-static-run-consumer-missing' });
      }
    } catch (_) {}
    return null;
  }

  function emitPixiZoomOwnershipCorrection(zoomSnapshot, staticSummary, playerSummary, dynamicSummary, source) {
    zoomSnapshot = zoomSnapshot || getZoomInteractionSnapshotForStaticAdoption();
    try {
      var diag = global.__PIXI_MIGRATION_PIXI_ZOOM_OWNERSHIP_DIAGNOSTICS__ || null;
      if (diag && typeof diag.notePixiZoomOwnership === 'function') {
        diag.notePixiZoomOwnership({
          ok: true,
          activeBackend: detectActiveBackend(),
          zoomInteractionActive: zoomSnapshot.zoomInteractionActive === true,
          zoomSettlePending: zoomSnapshot.zoomSettlePending === true,
          zoom: Number(zoomSnapshot.zoom || 0),
          pixiModeKeepsMigratedPartsInPixi: true,
          zoomCanvasWorldTakeoverDisabled: true,
          canvas2dOwnsWholeWorldDuringZoom: false,
          pixiWorldVisualSuppressed: false,
          pixiFloorKeptDuringZoom: true,
          pixiStaticKeptDuringZoom: !!(staticSummary && staticSummary.pixiDrawsStaticPacketRuns),
          pixiPlayerKeptDuringZoom: !!(playerSummary && playerSummary.pixiDrawsPlayerAvatar),
          pixiDynamicKeptDuringZoom: !!(dynamicSummary && dynamicSummary.pixiDrawsDynamicRenderables),
          migratedPartsStayPixi: true,
          fallbackOnlyForUnsupportedRenderables: true,
          changesDepthSort: false,
          changesPicking: false,
          pixiOwnsPicking: false,
          pixiSortChildren: false,
          pixiZIndexUsed: false,
          source: source || 'pixi-world-renderer'
        });
      }
    } catch (_) {}
  }


  function notePixiInterleavedFramePlanRender(source, meta) {
    try {
      var interleaved = global.__PIXI_INTERLEAVED_FRAMEPLAN_RENDERER__ || null;
      if (interleaved && typeof interleaved.notePixiRenderFrame === 'function') {
        return interleaved.notePixiRenderFrame({
          source: source || 'pixi-renderFrame',
          framePlanId: meta && meta.framePlanId || '',
          activeBackend: 'pixi',
          worldContainer: state.worldContainer || null,
          floorContainer: state.floorContainer || null,
          staticRunContainer: state.staticRunContainer || null,
          playerContainer: state.playerContainer || null,
          dynamicRenderableContainer: state.dynamicRenderableContainer || null
        }) || null;
      }
    } catch (_) {}
    return null;
  }

  function finalProbeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function finalProbeRound(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Number(n.toFixed ? n.toFixed(3) : n);
  }

  function getDisplayObjectProbe(target) {
    if (!target) return { exists: false };
    var scale = target.scale || {};
    return {
      exists: true,
      visible: target.visible !== false,
      x: finalProbeRound(target.x),
      y: finalProbeRound(target.y),
      width: finalProbeRound(target.width),
      height: finalProbeRound(target.height),
      scaleX: finalProbeRound(scale.x == null ? 1 : scale.x),
      scaleY: finalProbeRound(scale.y == null ? 1 : scale.y),
      zIndex: finalProbeRound(target.zIndex || 0),
      sortableChildren: target.sortableChildren === true,
      childCount: target.children && typeof target.children.length === 'number' ? Number(target.children.length || 0) : 0
    };
  }

  function getDisplayObjectGlobalBoundsProbe(target) {
    if (!target) return { exists: false };
    var out = { exists: true, ok: false };
    try {
      var b = typeof target.getBounds === 'function' ? target.getBounds() : null;
      if (b) {
        out.ok = true;
        out.x = finalProbeRound(b.x);
        out.y = finalProbeRound(b.y);
        out.width = finalProbeRound(b.width);
        out.height = finalProbeRound(b.height);
        out.minX = finalProbeRound(b.x);
        out.minY = finalProbeRound(b.y);
        out.maxX = finalProbeRound(Number(b.x || 0) + Number(b.width || 0));
        out.maxY = finalProbeRound(Number(b.y || 0) + Number(b.height || 0));
        out.centerX = finalProbeRound(Number(b.x || 0) + Number(b.width || 0) / 2);
        out.centerY = finalProbeRound(Number(b.y || 0) + Number(b.height || 0) / 2);
      }
    } catch (err) {
      out.error = err && err.message ? String(err.message) : 'getBounds-failed';
    }
    if (!out.ok) {
      out.x = finalProbeRound(target.x);
      out.y = finalProbeRound(target.y);
      out.width = finalProbeRound(target.width);
      out.height = finalProbeRound(target.height);
    }
    return out;
  }

  function getPointBoundsProbe(points) {
    points = Array.isArray(points) ? points : [];
    if (!points.length) return { exists: false, pointCount: 0 };
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    for (var i = 0; i < points.length; i += 1) {
      var x = finalProbeNumber(points[i] && points[i].x, 0);
      var y = finalProbeNumber(points[i] && points[i].y, 0);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return {
      exists: true,
      pointCount: points.length,
      minX: finalProbeRound(minX),
      minY: finalProbeRound(minY),
      maxX: finalProbeRound(maxX),
      maxY: finalProbeRound(maxY),
      width: finalProbeRound(maxX - minX),
      height: finalProbeRound(maxY - minY),
      centerX: finalProbeRound((minX + maxX) / 2),
      centerY: finalProbeRound((minY + maxY) / 2)
    };
  }

  function mapCurrentNoCameraPointToFloorFinal(pointNoCamera, snapshot, settings) {
    snapshot = snapshot || {};
    settings = settings || {};
    var transform = snapshot.floorCacheBlitTransform || null;
    var pixiTransform = transform && transform.pixi || null;
    var reuse = snapshot.reuseTransform || null;
    var originX = finalProbeNumber(settings.originX, finalProbeNumber(transform && transform.originX, 0));
    var originY = finalProbeNumber(settings.originY, finalProbeNumber(transform && transform.originY, 0));
    var currentZoom = finalProbeNumber(snapshot.currentZoom, 1);
    var builtZoom = finalProbeNumber(snapshot.buildZoom, finalProbeNumber(reuse && reuse.builtZoom, currentZoom || 1));
    var zoomRatio = currentZoom ? builtZoom / currentZoom : 1;
    var builtNoCameraX = originX + (finalProbeNumber(pointNoCamera && pointNoCamera.x, 0) - originX) * zoomRatio;
    var builtNoCameraY = originY + (finalProbeNumber(pointNoCamera && pointNoCamera.y, 0) - originY) * zoomRatio;
    var buildCameraX = finalProbeNumber(snapshot.buildCameraX, finalProbeNumber(reuse && reuse.builtCameraX, 0));
    var buildCameraY = finalProbeNumber(snapshot.buildCameraY, finalProbeNumber(reuse && reuse.builtCameraY, 0));
    var scale = finalProbeNumber(transform && transform.scale, finalProbeNumber(reuse && reuse.scale, 1));
    var spriteX = finalProbeNumber(pixiTransform && pixiTransform.spriteX, finalProbeNumber(state.sharedFloorSprite && state.sharedFloorSprite.x, 0));
    var spriteY = finalProbeNumber(pixiTransform && pixiTransform.spriteY, finalProbeNumber(state.sharedFloorSprite && state.sharedFloorSprite.y, 0));
    return {
      x: spriteX + scale * (builtNoCameraX + buildCameraX),
      y: spriteY + scale * (builtNoCameraY + buildCameraY),
      builtNoCameraX: builtNoCameraX,
      builtNoCameraY: builtNoCameraY,
      zoomRatio: zoomRatio
    };
  }

  function buildFloorWorldRegistrationProbe(meta, staticSummary, playerSummary) {
    var snapshot = getFinalProbeFloorSnapshot();
    var settings = getRuntimeSettings();
    var camera = getRuntimeCamera();
    var viewRotation = getCurrentViewRotation();
    var gridW = Math.max(0, Math.round(finalProbeNumber(settings.gridW || settings.worldCols, 0)));
    var gridH = Math.max(0, Math.round(finalProbeNumber(settings.gridH || settings.worldRows, 0)));
    var floorQuadWorld = [
      { x: 0, y: 0, z: 0 },
      { x: gridW, y: 0, z: 0 },
      { x: gridW, y: gridH, z: 0 },
      { x: 0, y: gridH, z: 0 }
    ];
    var floorQuadNoCamera = projectWorldFaceNoCamera(floorQuadWorld, viewRotation, settings);
    var directCurrent = addCamera(floorQuadNoCamera, camera);
    var floorFinal = [];
    for (var i = 0; i < floorQuadNoCamera.length; i += 1) floorFinal.push(mapCurrentNoCameraPointToFloorFinal(floorQuadNoCamera[i], snapshot, settings));
    var directBounds = getPointBoundsProbe(directCurrent);
    var finalBounds = getPointBoundsProbe(floorFinal);
    var centerDx = directBounds.exists && finalBounds.exists ? finalProbeRound(finalProbeNumber(finalBounds.centerX, 0) - finalProbeNumber(directBounds.centerX, 0)) : null;
    var centerDy = directBounds.exists && finalBounds.exists ? finalProbeRound(finalProbeNumber(finalBounds.centerY, 0) - finalProbeNumber(directBounds.centerY, 0)) : null;
    var transform = snapshot && snapshot.floorCacheBlitTransform || null;
    var pixiTransform = transform && transform.pixi || null;
    var floorSpriteProbe = getDisplayObjectProbe(state.sharedFloorSprite);
    var floorSpriteBounds = getDisplayObjectGlobalBoundsProbe(state.sharedFloorSprite);
    var floorContainerBounds = getDisplayObjectGlobalBoundsProbe(state.floorContainer);
    var staticContainerBounds = getDisplayObjectGlobalBoundsProbe(state.staticRunContainer);
    var playerContainerBounds = getDisplayObjectGlobalBoundsProbe(state.playerContainer);
    var pixiCanvas = state.pixiCanvas || null;
    var canvasStyleWidth = 0;
    var canvasStyleHeight = 0;
    try {
      canvasStyleWidth = pixiCanvas && pixiCanvas.getBoundingClientRect ? Number(pixiCanvas.getBoundingClientRect().width || 0) : 0;
      canvasStyleHeight = pixiCanvas && pixiCanvas.getBoundingClientRect ? Number(pixiCanvas.getBoundingClientRect().height || 0) : 0;
    } catch (_) {}
    var registrationError = Math.max(Math.abs(finalProbeNumber(centerDx, 0)), Math.abs(finalProbeNumber(centerDy, 0)));
    var suspectedFloorWorldRegistrationDivergence = registrationError > 1.25;
    return {
      diagnosticStep: 'PXM-07.14L',
      diagnosticOnly: true,
      activeBackend: detectActiveBackend(),
      framePlanId: meta && meta.framePlanId || '',
      source: meta && meta.source || 'pixi-renderFrame-floor-world-registration-probe',
      floorRenderer: state.lastFloorSummary && state.lastFloorSummary.floorRenderer || '',
      pixiDrawsFloor: !!(state.lastFloorSummary && state.lastFloorSummary.ok === true),
      canvas2dFloorSkipped: !!(state.lastFloorSummary && state.lastFloorSummary.canvas2dFloorSkipped === true),
      usesSharedFloorLayerCache: !!(state.lastFloorSummary && state.lastFloorSummary.usesSharedFloorLayerCache === true),
      gridW: gridW,
      gridH: gridH,
      viewRotation: viewRotation,
      currentCameraX: finalProbeRound(camera && camera.x),
      currentCameraY: finalProbeRound(camera && camera.y),
      floorBuildCameraX: finalProbeRound(snapshot && snapshot.buildCameraX),
      floorBuildCameraY: finalProbeRound(snapshot && snapshot.buildCameraY),
      floorCurrentZoom: finalProbeRound(snapshot && snapshot.currentZoom),
      floorBuildZoom: finalProbeRound(snapshot && snapshot.buildZoom),
      floorSharedSurfaceRevision: finalProbeNumber(snapshot && snapshot.sharedSurfaceRevision, 0),
      floorTextureVersion: String(snapshot && (snapshot.textureVersion || snapshot.version) || ''),
      floorSurfaceWidth: finalProbeNumber(snapshot && snapshot.surfaceWidth, 0),
      floorSurfaceHeight: finalProbeNumber(snapshot && snapshot.surfaceHeight, 0),
      floorCssWidth: finalProbeNumber(snapshot && snapshot.cssWidth, 0),
      floorCssHeight: finalProbeNumber(snapshot && snapshot.cssHeight, 0),
      floorSpriteX: finalProbeRound(state.sharedFloorSprite && state.sharedFloorSprite.x),
      floorSpriteY: finalProbeRound(state.sharedFloorSprite && state.sharedFloorSprite.y),
      floorSpriteWidth: finalProbeRound(state.sharedFloorSprite && state.sharedFloorSprite.width),
      floorSpriteHeight: finalProbeRound(state.sharedFloorSprite && state.sharedFloorSprite.height),
      floorPixiTransformSpriteX: finalProbeRound(pixiTransform && pixiTransform.spriteX),
      floorPixiTransformSpriteY: finalProbeRound(pixiTransform && pixiTransform.spriteY),
      floorPixiTransformSpriteWidth: finalProbeRound(pixiTransform && pixiTransform.spriteWidth),
      floorPixiTransformSpriteHeight: finalProbeRound(pixiTransform && pixiTransform.spriteHeight),
      floorMapCurrentDirectBounds: directBounds,
      floorMapFinalReuseBounds: finalBounds,
      floorMapFinalVsCurrentCenterDx: centerDx,
      floorMapFinalVsCurrentCenterDy: centerDy,
      floorMapRegistrationMaxAbsCenterError: finalProbeRound(registrationError),
      suspectedFloorWorldRegistrationDivergence: suspectedFloorWorldRegistrationDivergence,
      suspectedReason: suspectedFloorWorldRegistrationDivergence ? 'floor-final-reuse-bounds-differ-from-current-world-projection' : '',
      floorSprite: floorSpriteProbe,
      floorSpriteGlobalBounds: floorSpriteBounds,
      floorContainerGlobalBounds: floorContainerBounds,
      staticContainerGlobalBounds: staticContainerBounds,
      playerContainerGlobalBounds: playerContainerBounds,
      staticSummaryPacketCount: staticSummary && staticSummary.staticPacketCount != null ? staticSummary.staticPacketCount : null,
      staticSummaryChunkRenderTextureCount: staticSummary && staticSummary.chunkRenderTextureCount != null ? staticSummary.chunkRenderTextureCount : null,
      staticSummaryDynamicStaticGraphicsCount: staticSummary && staticSummary.dynamicStaticGraphicsCount != null ? staticSummary.dynamicStaticGraphicsCount : null,
      pixiCanvasWidth: finalProbeNumber(state.pixiCanvasWidth, 0),
      pixiCanvasHeight: finalProbeNumber(state.pixiCanvasHeight, 0),
      pixiRendererWidth: finalProbeNumber(state.pixiRendererWidth, 0),
      pixiRendererHeight: finalProbeNumber(state.pixiRendererHeight, 0),
      pixiCanvasClientWidth: finalProbeRound(canvasStyleWidth),
      pixiCanvasClientHeight: finalProbeRound(canvasStyleHeight),
      playerSummaryPixiDrawsPlayerAvatar: !!(playerSummary && playerSummary.pixiDrawsPlayerAvatar === true)
    };
  }

  function getLastPixiPlayerConsumerSummary() {
    try {
      var consumer = global.__SHARED_RENDER_OPTIMIZATION_PIXI_PLAYER_CONSUMER__ || null;
      if (consumer && typeof consumer.getLastSummary === 'function') return consumer.getLastSummary() || null;
    } catch (_) {}
    return null;
  }

  function getFinalProbeFloorSnapshot() {
    try {
      var frameSnapshot = global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ || null;
      if (frameSnapshot && frameSnapshot.floorSnapshot) return frameSnapshot.floorSnapshot;
    } catch (_) {}
    return state.sharedFloorLastSnapshot || null;
  }

  function emitFinalCompositionTransformProbe(meta, staticSummary, playerSummary, dynamicSummary, fallbackResult) {
    var snapshot = getFinalProbeFloorSnapshot();
    var transform = snapshot && snapshot.floorCacheBlitTransform || null;
    var pixiTransform = transform && transform.pixi || null;
    var reuse = snapshot && snapshot.reuseTransform || null;
    var scale = finalProbeNumber(transform && transform.scale, finalProbeNumber(reuse && reuse.scale, 1));
    var dx = finalProbeNumber(transform && transform.dx, finalProbeNumber(reuse && reuse.dx, 0));
    var dy = finalProbeNumber(transform && transform.dy, finalProbeNumber(reuse && reuse.dy, 0));
    var floorReuseActive = !!(transform && transform.shouldReuse === true) || !!(reuse && reuse.cameraTransformOnly === true) || Math.abs(scale - 1) > 0.001 || Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001;
    var floorCurrentCameraX = finalProbeNumber(snapshot && snapshot.currentCameraX, 0);
    var floorCurrentCameraY = finalProbeNumber(snapshot && snapshot.currentCameraY, 0);
    var floorBuildCameraX = finalProbeNumber(snapshot && snapshot.buildCameraX, finalProbeNumber(reuse && reuse.builtCameraX, 0));
    var floorBuildCameraY = finalProbeNumber(snapshot && snapshot.buildCameraY, finalProbeNumber(reuse && reuse.builtCameraY, 0));
    var floorCurrentZoom = finalProbeNumber(snapshot && snapshot.currentZoom, 1);
    var floorBuildZoom = finalProbeNumber(snapshot && snapshot.buildZoom, finalProbeNumber(reuse && reuse.builtZoom, 1));
    var staticCameraX = staticSummary && staticSummary.staticProjectionCameraX != null ? finalProbeNumber(staticSummary.staticProjectionCameraX, 0) : null;
    var staticCameraY = staticSummary && staticSummary.staticProjectionCameraY != null ? finalProbeNumber(staticSummary.staticProjectionCameraY, 0) : null;
    var staticZoom = staticSummary && staticSummary.staticProjectionCurrentZoom != null ? finalProbeNumber(staticSummary.staticProjectionCurrentZoom, 1) : null;
    var staticMatchesFloorCurrentCamera = staticCameraX != null && Math.abs(staticCameraX - floorCurrentCameraX) <= 0.01 && Math.abs(staticCameraY - floorCurrentCameraY) <= 0.01;
    var staticMatchesFloorBuildCamera = staticCameraX != null && Math.abs(staticCameraX - floorBuildCameraX) <= 0.01 && Math.abs(staticCameraY - floorBuildCameraY) <= 0.01;
    var staticMatchesFloorCurrentZoom = staticZoom != null && Math.abs(staticZoom - floorCurrentZoom) <= 0.001;
    var staticMatchesFloorBuildZoom = staticZoom != null && Math.abs(staticZoom - floorBuildZoom) <= 0.001;
    var staticUsesSharedFloorReuseTransform = !!(staticSummary && staticSummary.staticUsesSharedFloorReuseTransform === true);
    var suspectedDivergence = !!(floorReuseActive && staticSummary && staticSummary.pixiDrawsStaticWorldPackets === true && !staticUsesSharedFloorReuseTransform && staticMatchesFloorCurrentCamera && !staticMatchesFloorBuildCamera);
    var payload = {
      diagnosticStep: 'PXM-07.12N',
      diagnosticOnly: false,
      usesSharedRenderFrameSnapshot: !!(global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__),
      activeBackend: detectActiveBackend(),
      framePlanId: meta && meta.framePlanId || '',
      source: meta && meta.source || 'pixi-renderFrame-after-fallback-final-probe',
      fallbackUsed: !!fallbackResult,
      pixiFloorReady: !!(state.lastFloorSummary && state.lastFloorSummary.ok === true),
      pixiDrawsStaticWorldPackets: !!(staticSummary && staticSummary.pixiDrawsStaticWorldPackets),
      canvas2dSkipsStaticWorldPackets: !!(staticSummary && staticSummary.canvas2dSkipsStaticWorldPackets),
      pixiDrawsPlayerAvatar: !!(playerSummary && playerSummary.pixiDrawsPlayerAvatar),
      canvas2dSkipsPlayerAvatar: !!(playerSummary && playerSummary.canvas2dSkipsPlayerAvatar),
      floorReuseActive: floorReuseActive,
      floorTransformShouldReuse: !!(transform && transform.shouldReuse === true),
      floorReuseCameraTransformOnly: !!(reuse && reuse.cameraTransformOnly === true),
      floorReuseScale: finalProbeRound(scale),
      floorReuseDx: finalProbeRound(dx),
      floorReuseDy: finalProbeRound(dy),
      floorCurrentCameraX: finalProbeRound(floorCurrentCameraX),
      floorCurrentCameraY: finalProbeRound(floorCurrentCameraY),
      floorBuildCameraX: finalProbeRound(floorBuildCameraX),
      floorBuildCameraY: finalProbeRound(floorBuildCameraY),
      floorCurrentZoom: finalProbeRound(floorCurrentZoom),
      floorBuildZoom: finalProbeRound(floorBuildZoom),
      floorSharedSurfaceRevision: finalProbeNumber(snapshot && snapshot.sharedSurfaceRevision, 0),
      sharedRenderFrameSurfaceRevision: global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ ? finalProbeNumber(global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__.floorSharedSurfaceRevision, 0) : null,
      sharedRenderFrameTextureVersion: global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ ? String(global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__.floorTextureVersion || '') : '',
      staticSharedRenderFrameTextureVersion: global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ ? String(global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__.staticFloorTextureVersion || global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__.floorStaticTextureVersion || '') : '',
      visualViewRotation: global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ ? finalProbeRound(global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__.visualViewRotation) : null,
      staticPacketViewRotation: global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ ? finalProbeRound(global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__.staticPacketViewRotation) : null,
      fractionalRotationInStaticCacheKey: global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ ? hasFractionalStaticRotationInCacheKeyForPixi(global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__.staticPacketViewRotation) : false,
      floorSpriteX: finalProbeRound(state.sharedFloorSprite && state.sharedFloorSprite.x),
      floorSpriteY: finalProbeRound(state.sharedFloorSprite && state.sharedFloorSprite.y),
      floorSpriteWidth: finalProbeRound(state.sharedFloorSprite && state.sharedFloorSprite.width),
      floorSpriteHeight: finalProbeRound(state.sharedFloorSprite && state.sharedFloorSprite.height),
      floorPixiTransformSpriteX: finalProbeRound(pixiTransform && pixiTransform.spriteX),
      floorPixiTransformSpriteY: finalProbeRound(pixiTransform && pixiTransform.spriteY),
      floorPixiTransformSpriteWidth: finalProbeRound(pixiTransform && pixiTransform.spriteWidth),
      floorPixiTransformSpriteHeight: finalProbeRound(pixiTransform && pixiTransform.spriteHeight),
      staticProjectionCameraX: staticCameraX == null ? null : finalProbeRound(staticCameraX),
      staticProjectionCameraY: staticCameraY == null ? null : finalProbeRound(staticCameraY),
      staticProjectionCurrentZoom: staticZoom == null ? null : finalProbeRound(staticZoom),
      staticUsesSharedFloorReuseTransform: staticUsesSharedFloorReuseTransform,
      staticSharedFloorReuseReason: staticSummary && staticSummary.staticSharedFloorReuseReason ? String(staticSummary.staticSharedFloorReuseReason) : '',
      staticSharedFloorReuseScale: staticSummary && staticSummary.staticSharedFloorReuseScale != null ? finalProbeRound(staticSummary.staticSharedFloorReuseScale) : null,
      staticZoomDelegateWouldHaveFallenBack: !!(staticSummary && staticSummary.staticZoomDelegateWouldHaveFallenBack === true),
      staticMatchesFloorCurrentCamera: staticMatchesFloorCurrentCamera,
      staticMatchesFloorBuildCamera: staticMatchesFloorBuildCamera,
      staticMatchesFloorCurrentZoom: staticMatchesFloorCurrentZoom,
      staticMatchesFloorBuildZoom: staticMatchesFloorBuildZoom,
      staticFloorAlignmentMaxAbsError: staticSummary && staticSummary.staticFloorAlignmentMaxAbsError != null ? staticSummary.staticFloorAlignmentMaxAbsError : null,
      staticFloorAlignmentDx: staticSummary && staticSummary.staticFloorAlignmentDx != null ? staticSummary.staticFloorAlignmentDx : null,
      staticFloorAlignmentDy: staticSummary && staticSummary.staticFloorAlignmentDy != null ? staticSummary.staticFloorAlignmentDy : null,
      suspectedFinalCompositionDivergence: suspectedDivergence,
      suspectedReason: suspectedDivergence ? 'floor-uses-built-surface-plus-reuse-transform-while-static-does-not-consume-shared-floor-reuse-transform' : '',
      floorContainer: getDisplayObjectProbe(state.floorContainer),
      staticContainer: getDisplayObjectProbe(state.staticRunContainer),
      playerContainer: getDisplayObjectProbe(state.playerContainer),
      worldContainer: getDisplayObjectProbe(state.worldContainer)
    };
    emit('final-composition-transform-probe', payload);
    try { global.__PIXI_MIGRATION_LAST_FINAL_COMPOSITION_TRANSFORM_PROBE__ = payload; } catch (_) {}
    try {
      var floorRegistrationProbe = buildFloorWorldRegistrationProbe(meta, staticSummary, playerSummary);
      emit('floor-world-registration-probe', floorRegistrationProbe);
      global.__PIXI_MIGRATION_LAST_FLOOR_WORLD_REGISTRATION_PROBE__ = floorRegistrationProbe;
    } catch (err) {
      emit('floor-world-registration-probe', {
        diagnosticStep: 'PXM-07.14L',
        diagnosticOnly: true,
        ok: false,
        reason: 'probe-exception',
        error: err && err.message ? String(err.message) : 'unknown',
        framePlanId: meta && meta.framePlanId || ''
      });
    }
    return payload;
  }

  function renderFrame(meta) {
    var pixiFrameStartAt = nowMs();
    state.fallbackRenderCount += 1;
    var zoomOwnerSnapshot = getZoomInteractionSnapshotForStaticAdoption();
    var zoomSingleWorldOwnerActive = isZoomSingleWorldOwnerGuardActive(zoomOwnerSnapshot);
    ensurePixiTileFloorLayer(meta && meta.source || 'pixi-renderFrame');
    // PXM-07.18K0F: strict Pixi backend must not enter the Canvas2D fallback
    // before the Pixi library/application is ready. K0E correctly failed fast,
    // but it exposed a first-frame race: activeBackend=pixi while the async
    // Pixi loader had not populated window.PIXI yet. In that state we skip this
    // frame instead of drawing static world with Canvas2D. If initialization has
    // actually failed, throw with the real reason.
    if (!state.initialized) {
      var waitingReason = state.initFailed || state.pixiLoadFailed
        ? (state.initFailureReason || state.pixiLoadFailureReason || 'pixi-init-failed')
        : (state.initializing ? 'pixi-initializing' : (!detectPixiGlobal() ? 'pixi-global-loading' : 'pixi-application-not-initialized'));
      var waitingPayload = {
        step: STEP,
        source: meta && meta.source || 'pixi-renderFrame',
        activeBackend: 'pixi',
        pixiInitialized: false,
        pixiGlobalAvailable: detectPixiGlobal(),
        pixiLoadRequested: state.pixiLoadRequested === true,
        pixiLoadFailed: state.pixiLoadFailed === true,
        pixiInitializing: state.initializing === true,
        pixiInitFailed: state.initFailed === true,
        reason: waitingReason,
        noCanvas2dFallbackBeforePixiReady: true,
        framePlanId: meta && meta.framePlanId || ''
      };
      emit('pixi-strict-wait', waitingPayload);
      if (state.initFailed || state.pixiLoadFailed) {
        throw new Error('[PXM][Pixi strict mode] Pixi backend is active but Pixi renderer could not initialize. reason=' + waitingReason);
      }
      return Object.assign({ ok: false, renderer: 'pixi', pixiWaitingForInitialization: true }, waitingPayload);
    }
    var sharedFrameSnapshot = null;
    if (state.initialized) {
      syncPixiLayerMetrics('pixi-renderFrame');
      sharedFrameSnapshot = makePixiSharedRenderFrameSnapshot(meta, 'pixi-renderFrame-shared-snapshot');
      setZoomSingleWorldOwnerGuardActive(false, zoomOwnerSnapshot, 'pixi-renderFrame-before-world-draw');
      drawPixiFloorLayer('pixi-renderFrame', sharedFrameSnapshot);
    }
    var floorReady = !!(state.lastFloorSummary && state.lastFloorSummary.ok === true && (state.lastFloorSummary.usesSharedFloorLayerCache === true || state.lastFloorSummary.drawnTiles > 0));
    var overrideToken = setCanvas2dBaseWorldOverride(floorReady);
    emit('render', {
      active: 'pixi',
      renderer: floorReady ? 'pixi-floor-plus-canvas2d-fallback' : 'canvas2d-fallback',
      pixiTileFloorRenderFrameCalled: true,
      pixiInitialized: state.initialized === true,
      pixiRendererCreated: state.rendererCreated === true,
      pixiApplicationCreated: state.applicationCreated === true,
      pixiWorldContainer: state.worldContainerCreated === true,
      pixiFloorContainer: state.floorContainerCreated === true,
      pixiDrawsWorldContent: floorReady,
      pixiDrawsFloor: floorReady,
      visibleTiles: Number(state.lastFloorSummary && state.lastFloorSummary.visibleTiles || 0),
      drawnTiles: Number(state.lastFloorSummary && state.lastFloorSummary.drawnTiles || 0),
      pixiOwnsPointer: false,
      canvas2dFallback: 'enabled',
      canvas2dFloorSkipped: floorReady,
      fallbackRenderCount: state.fallbackRenderCount,
      source: meta && meta.source || 'pixi-tile-floor-renderFrame'
    });
    emitPixiStatus('pixi-renderFrame');
    emitInputStatus('pixi-renderFrame');
    maybeEmitFloorSummary('pixi-renderFrame');
    emitSummary('pixi-renderFrame');
    var staticRunVisualPlanSummary = getLastPixiStaticWorldPacketSummary();
    beginPixiDynamicRenderableFrame('pixi-renderFrame-before-canvas2d-fallback', { framePlanId: meta && meta.framePlanId || '', visualAdoption: false, disabledReason: 'pxm-0711e-unsafe-interleaved-world-adoption-disabled' });
    var playerConsumerSummary = consumePixiPlayerSharedSprite('pixi-renderFrame-before-canvas2d-fallback', { framePlanId: meta && meta.framePlanId || '', visualAdoption: false, disabledReason: 'pxm-0711e-unsafe-interleaved-world-adoption-disabled' });
    var interleavedFramePlanSummary = notePixiInterleavedFramePlanRender('pixi-renderFrame-before-canvas2d-fallback', meta);
    var fallback = getCanvas2dFallbackApi();
    var fallbackStartAt = nowMs();
    var fallbackResult = null;
    var fallbackUsed = false;
    try {
      if (fallback && fallback !== adapterApi && typeof fallback.renderFrame === 'function') {
        fallbackUsed = true;
        fallbackResult = fallback.renderFrame(meta);
      }
    } finally {
      restoreCanvas2dBaseWorldOverride(overrideToken);
    }
    var fallbackWallMs = fallbackUsed ? Math.max(0, nowMs() - fallbackStartAt) : 0;
    var dynamicRenderableConsumerSummary = endPixiDynamicRenderableFrame('pixi-renderFrame-after-canvas2d-fallback', { framePlanId: meta && meta.framePlanId || '' });
    var staticRunConsumerSummary = getLastPixiStaticWorldPacketSummary() || staticRunVisualPlanSummary;
    var finalPlayerConsumerSummary = getLastPixiPlayerConsumerSummary() || playerConsumerSummary;
    setZoomSingleWorldOwnerGuardActive(false, zoomOwnerSnapshot, 'pixi-renderFrame-after-canvas2d-fallback');
    if (!isPixiPerformanceModeEnabled()) emitFinalCompositionTransformProbe(meta, staticRunConsumerSummary, finalPlayerConsumerSummary, dynamicRenderableConsumerSummary, fallbackResult);
    clearPixiSharedRenderFrameSnapshot(sharedFrameSnapshot, 'pixi-renderFrame-after-final-probe');
    emitPixiZoomOwnershipCorrection(zoomOwnerSnapshot, staticRunConsumerSummary, finalPlayerConsumerSummary, dynamicRenderableConsumerSummary, 'pixi-renderFrame-after-canvas2d-fallback');
    try {
      var unsafeDiag = global.__PIXI_MIGRATION_UNSAFE_SPLIT_WORLD_GUARD_DIAGNOSTICS__ || null;
      if (unsafeDiag && typeof unsafeDiag.noteUnsafeSplitWorldGuard === 'function') {
        unsafeDiag.noteUnsafeSplitWorldGuard({
          section: 'summary',
          activeBackend: 'pixi',
          pixiDrawsFloor: floorReady,
          pixiDrawsStaticPacketRuns: !!(staticRunConsumerSummary && staticRunConsumerSummary.pixiDrawsStaticWorldPackets),
          pixiDrawsPlayerAvatar: false,
          pixiDrawsDynamicRenderables: false,
          canvas2dDrawsStaticWorld: !(staticRunConsumerSummary && staticRunConsumerSummary.canvas2dSkipsStaticWorldPackets),
          canvas2dDrawsPlayerAvatar: true,
          canvas2dDrawsDynamicRenderables: true,
          canvas2dSkipsPlayerAvatar: false,
          canvas2dSkipsAdoptedDynamicRenderables: false,
          canvas2dSkipsAdoptedStaticRuns: !!(staticRunConsumerSummary && staticRunConsumerSummary.canvas2dSkipsAdoptedStaticRuns),
          source: 'pixi-renderFrame-after-canvas2d-fallback'
        });
      }
    } catch (_) {}
    var frameTotalMs = Math.max(0, nowMs() - pixiFrameStartAt);
    var gpuDiagnostics = maybeEmitGpuDiagnostics('pixi-renderFrame-after-canvas2d-fallback', {
      phase: 'frame',
      pixiDrawsFloor: floorReady,
      pixiDrawsStaticWorldPackets: !!(staticRunConsumerSummary && staticRunConsumerSummary.pixiDrawsStaticWorldPackets),
      pixiDrawsPlayerAvatar: !!(finalPlayerConsumerSummary && finalPlayerConsumerSummary.pixiDrawsPlayerAvatar),
      staticGraphicsUsedCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.graphicsUsedCount || 0),
      staticPacketCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.staticPacketCount || 0),
      staticPacketDrawWallMs: Number(staticRunConsumerSummary && staticRunConsumerSummary.drawWallMs || 0),
      floorTextureUpdateCount: Number(state.sharedFloorTextureUpdateCount || 0),
      floorSpriteReuseCount: Number(state.sharedFloorSpriteReuseCount || 0),
      canvas2dFallbackFrameMs: Number(fallbackWallMs.toFixed ? fallbackWallMs.toFixed(3) : fallbackWallMs)
    });
    notifyPerformanceComparison({
      backend: 'pixi',
      active: 'pixi',
      gpuAccelerated: !!(gpuDiagnostics && gpuDiagnostics.gpuAccelerated),
      gpuBackendFamily: gpuDiagnostics && gpuDiagnostics.backendFamily || 'unknown',
      pixiRendererType: gpuDiagnostics && gpuDiagnostics.rendererType || state.pixiRendererType || 'unknown',
      staticGraphicsUsedCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.graphicsUsedCount || 0),
      floorTextureUpdateCount: Number(state.sharedFloorTextureUpdateCount || 0),
      frameTotalMs: Number(frameTotalMs.toFixed ? frameTotalMs.toFixed(3) : frameTotalMs),
      pixiFloorDrawMs: Number(state.lastFloorSummary && state.lastFloorSummary.drawWallMs || 0),
      pixiStaticWorldDrawMs: Number(staticRunConsumerSummary && staticRunConsumerSummary.drawWallMs || 0),
      pixiPlayerDrawMs: Number(finalPlayerConsumerSummary && finalPlayerConsumerSummary.wallMs || 0),
      staticPacketCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.staticPacketCount || 0),
      staticPacketDrawCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.packetDrawCount || 0),
      chunkRenderTextureWallMs: Number(staticRunConsumerSummary && staticRunConsumerSummary.chunkRenderTextureWallMs || 0),
      chunkRenderTextureCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.chunkRenderTextureCount || 0),
      chunkRenderTextureHitCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.chunkRenderTextureHitCount || 0),
      chunkRenderTextureMissCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.chunkRenderTextureMissCount || 0),
      chunkRenderTextureHitRate: Number(staticRunConsumerSummary && staticRunConsumerSummary.chunkRenderTextureHitRate || 0),
      chunkRenderTextureReusablePacketCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.chunkRenderTextureReusablePacketCount || 0),
      chunkRenderTextureRebuildPacketCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.chunkRenderTextureRebuildPacketCount || 0),
      staticGraphicsReuseRate: Number(staticRunConsumerSummary && staticRunConsumerSummary.staticGraphicsReuseRate || 0),
      staticGraphicsReusedCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.staticGraphicsReusedCount || 0),
      staticGraphicsRebuiltCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.staticGraphicsRebuiltCount || 0),
      staticGpuChunkCacheDiagnosticOnly: !!(staticRunConsumerSummary && staticRunConsumerSummary.staticGpuChunkCacheDiagnosticOnly === true),
      staticGpuChunkCacheHitRate: Number(staticRunConsumerSummary && staticRunConsumerSummary.staticGpuChunkCacheHitRate || 0),
      staticGpuChunkCacheHitCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.staticGpuChunkCacheHitCount || 0),
      staticGpuChunkCacheMissCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.staticGpuChunkCacheMissCount || 0),
      canvas2dFallbackFrameMs: Number(fallbackWallMs.toFixed ? fallbackWallMs.toFixed(3) : fallbackWallMs),
      visibleTiles: Number(state.lastFloorSummary && state.lastFloorSummary.visibleTiles || 0),
      drawnTiles: Number(state.lastFloorSummary && state.lastFloorSummary.drawnTiles || 0),
      usesSharedFloorLayerCache: !!(state.lastFloorSummary && state.lastFloorSummary.usesSharedFloorLayerCache),
      pixiFloorBypassesSharedCache: !!(state.lastFloorSummary && state.lastFloorSummary.pixiFloorBypassesSharedCache),
      usesSharedStaticPacketRunCache: false,
      pixiDrawsStaticPacketRuns: !!(staticRunConsumerSummary && staticRunConsumerSummary.pixiDrawsStaticWorldPackets),
      pixiStaticWorldUsesSharedProjectedGeometry: !!(staticRunConsumerSummary && staticRunConsumerSummary.pixiStaticWorldUsesSharedProjectedGeometry),
      pixiStaticWorldUsesRendererNeutralProjectedGeometry: !!(staticRunConsumerSummary && staticRunConsumerSummary.pixiStaticWorldUsesRendererNeutralProjectedGeometry),
      pixiStaticWorldBypassesCanvas2dBitmapRunCache: !!(staticRunConsumerSummary && staticRunConsumerSummary.pixiStaticWorldBypassesCanvas2dBitmapRunCache),
      canvas2dStaticBitmapRunCacheUsedForPixi: !!(staticRunConsumerSummary && staticRunConsumerSummary.canvas2dStaticBitmapRunCacheUsedForPixi),
      staticRunTextureConsumedCount: 0,
      pixiDrawsPlayerAvatar: !!(finalPlayerConsumerSummary && finalPlayerConsumerSummary.pixiDrawsPlayerAvatar),
      canvas2dSkipsPlayerAvatar: !!(finalPlayerConsumerSummary && finalPlayerConsumerSummary.canvas2dSkipsPlayerAvatar),
      playerSpriteReuseCount: Number(finalPlayerConsumerSummary && finalPlayerConsumerSummary.spriteReuseCount || 0),
      pixiDrawsDynamicRenderables: !!(dynamicRenderableConsumerSummary && dynamicRenderableConsumerSummary.pixiDrawsDynamicRenderables),
      adoptedDynamicRenderableCount: Number(dynamicRenderableConsumerSummary && dynamicRenderableConsumerSummary.adoptedDynamicRenderableCount || 0),
      canvas2dSkipsAdoptedDynamicRenderables: !!(dynamicRenderableConsumerSummary && dynamicRenderableConsumerSummary.canvas2dSkipsAdoptedDynamicRenderables),
      pixiInitialized: state.initialized === true,
      pixiRendererCreated: state.rendererCreated === true,
      pixiDrawsFloor: floorReady,
      canvas2dFallback: fallbackUsed ? 'enabled' : 'missing',
      source: meta && meta.source || 'pixi-tile-floor-renderFrame'
    });
    emitPixiFrameForensics({
      framePlanId: meta && meta.framePlanId || '',
      frameTotalMs: Number(frameTotalMs.toFixed ? frameTotalMs.toFixed(3) : frameTotalMs),
      pixiFloorDrawMs: Number(state.lastFloorSummary && state.lastFloorSummary.drawWallMs || 0),
      pixiStaticWorldDrawMs: Number(staticRunConsumerSummary && staticRunConsumerSummary.drawWallMs || 0),
      pixiPlayerDrawMs: Number(finalPlayerConsumerSummary && finalPlayerConsumerSummary.wallMs || 0),
      canvas2dFallbackFrameMs: Number(fallbackWallMs.toFixed ? fallbackWallMs.toFixed(3) : fallbackWallMs),
      pixiDrawsFloor: floorReady,
      pixiDrawsStaticWorldPackets: !!(staticRunConsumerSummary && staticRunConsumerSummary.pixiDrawsStaticWorldPackets),
      pixiDrawsPlayerAvatar: !!(finalPlayerConsumerSummary && finalPlayerConsumerSummary.pixiDrawsPlayerAvatar),
      pixiDrawsDynamicRenderables: !!(dynamicRenderableConsumerSummary && dynamicRenderableConsumerSummary.pixiDrawsDynamicRenderables),
      canvas2dStaticWorldSkipped: !!(staticRunConsumerSummary && staticRunConsumerSummary.canvas2dSkipsStaticWorldPackets),
      canvas2dSkipsPlayerAvatar: !!(finalPlayerConsumerSummary && finalPlayerConsumerSummary.canvas2dSkipsPlayerAvatar),
      canvas2dSkipsAdoptedDynamicRenderables: !!(dynamicRenderableConsumerSummary && dynamicRenderableConsumerSummary.canvas2dSkipsAdoptedDynamicRenderables),
      staticPacketCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.staticPacketCount || 0),
      staticPacketDrawCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.packetDrawCount || 0),
      actualStaticDrawUnitCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.actualDrawUnitCount || 0),
      actualStaticCacheSpriteDrawCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.actualCacheSpriteDrawCount || 0),
      actualStaticGraphicsPacketDrawCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.actualGraphicsPacketDrawCount || 0),
      chunkRenderTextureCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.chunkRenderTextureCount || 0),
      chunkRenderTextureHitRate: Number(staticRunConsumerSummary && staticRunConsumerSummary.chunkRenderTextureHitRate || 0),
      chunkRenderTextureMissCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.chunkRenderTextureMissCount || 0),
      chunkRenderTextureUploadCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.chunkRenderTextureUploadCount || 0),
      orderRunRenderTextureHitRate: Number(staticRunConsumerSummary && staticRunConsumerSummary.orderRunRenderTextureHitRate || 0),
      orderRunRenderTextureMissCount: Number(staticRunConsumerSummary && staticRunConsumerSummary.orderRunRenderTextureMissCount || 0),
      staticPacketItemCacheHitRate: Number(staticRunConsumerSummary && staticRunConsumerSummary.staticPacketItemCacheHitRate || 0),
      staticChunkDrawDataCacheHitRate: Number(staticRunConsumerSummary && staticRunConsumerSummary.staticChunkDrawDataCacheHitRate || 0),
      floorTextureUpdateCount: Number(state.sharedFloorTextureUpdateCount || 0),
      floorSpriteReuseCount: Number(state.sharedFloorSpriteReuseCount || 0),
      usesSharedFloorLayerCache: !!(state.lastFloorSummary && state.lastFloorSummary.usesSharedFloorLayerCache),
      gpuAccelerated: !!(gpuDiagnostics && gpuDiagnostics.gpuAccelerated),
      gpuBackendFamily: gpuDiagnostics && gpuDiagnostics.backendFamily || 'unknown',
      pixiRendererType: gpuDiagnostics && gpuDiagnostics.rendererType || state.pixiRendererType || 'unknown'
    });
    return fallbackResult;
  }


  function getStaticWorldPacketContainer(reason) {
    try {
      if (!state.initialized || !ensurePixiContainers()) return null;
      if (state.staticRunContainer) state.staticRunContainer.visible = true;
      return state.staticRunContainer || null;
    } catch (_) {}
    return null;
  }

  function getLastPixiStaticWorldPacketSummary() {
    try {
      var consumer = global.__SHARED_RENDER_OPTIMIZATION_PIXI_STATIC_WORLD_PACKET_CONSUMER__ || null;
      if (consumer && typeof consumer.getLastSummary === 'function') return consumer.getLastSummary() || null;
    } catch (_) {}
    return null;
  }

  function getStatus() {
    var snapshot = getBackendSnapshot();
    return {
      step: STEP,
      phase: PHASE,
      owner: OWNER,
      backend: 'pixi',
      registered: state.registered === true,
      available: detectPixiGlobal(),
      loadRequested: state.pixiLoadRequested === true,
      initialized: state.initialized === true,
      rendererCreated: state.rendererCreated === true,
      applicationCreated: state.applicationCreated === true,
      worldContainerCreated: state.worldContainerCreated === true,
      floorContainerCreated: state.floorContainerCreated === true,
      staticRunContainerCreated: state.staticRunContainerCreated === true,
      playerContainerCreated: state.playerContainerCreated === true,
      dynamicRenderableContainerCreated: state.dynamicRenderableContainerCreated === true,
      worldContainerChildren: state.worldContainer && state.worldContainer.children ? state.worldContainer.children.length : 0,
      floorDrawCount: state.floorDrawCount,
      lastFloorSummary: state.lastFloorSummary,
      lastDynamicRenderableConsumerSummary: state.lastDynamicRenderableConsumerSummary,
      rendererWidth: state.pixiRendererWidth,
      rendererHeight: state.pixiRendererHeight,
      canvasWidth: state.pixiCanvasWidth,
      canvasHeight: state.pixiCanvasHeight,
      resolution: state.pixiResolution,
      rendererType: state.pixiRendererType,
      activeBackend: snapshot.activeBackend || detectActiveBackend(),
      pixiEnabled: snapshot.pixiEnabled === true || snapshot.activeBackend === 'pixi',
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      pixiOwnsBusinessObjects: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      gpuAccelerated: !!(global.__PIXI_MIGRATION_LAST_GPU_DIAGNOSTICS__ && global.__PIXI_MIGRATION_LAST_GPU_DIAGNOSTICS__.gpuAccelerated),
      gpuBackendFamily: String(global.__PIXI_MIGRATION_LAST_GPU_DIAGNOSTICS__ && global.__PIXI_MIGRATION_LAST_GPU_DIAGNOSTICS__.backendFamily || 'unknown'),
      gpuRenderer: String(global.__PIXI_MIGRATION_LAST_GPU_DIAGNOSTICS__ && global.__PIXI_MIGRATION_LAST_GPU_DIAGNOSTICS__.gpuRenderer || ''),
      gpuVendor: String(global.__PIXI_MIGRATION_LAST_GPU_DIAGNOSTICS__ && global.__PIXI_MIGRATION_LAST_GPU_DIAGNOSTICS__.gpuVendor || ''),
      canvas2dFallback: 'enabled'
    };
  }

  var adapterApi = {
    phase: PHASE,
    owner: OWNER,
    backend: 'pixi',
    tileFloorFirstPass: true,
    renderFrame: renderFrame,
    noteFramePlan: noteFramePlan,
    noteRenderSummary: noteRenderSummary,
    ensurePixiEmptyWorldLayer: ensurePixiTileFloorLayer,
    ensurePixiTileFloorLayer: ensurePixiTileFloorLayer,
    drawPixiFloorLayer: drawPixiFloorLayer,
    getStaticWorldPacketContainer: getStaticWorldPacketContainer,
    getStaticRunContainer: getStaticWorldPacketContainer,
    getPixiApplication: function getPixiApplication() { return state.pixiApp || null; },
    getPixiRenderer: function getPixiRenderer() { return state.pixiApp && state.pixiApp.renderer || null; },
    getLastGpuDiagnostics: function getLastGpuDiagnostics() { return global.__PIXI_MIGRATION_LAST_GPU_DIAGNOSTICS__ || null; },
    getLastPixiStaticWorldPacketSummary: getLastPixiStaticWorldPacketSummary,
    getStatus: getStatus,
    summarizeCoverage: function summarizeCoverage() {
      return {
        phase: PHASE,
        owner: OWNER,
        backend: 'pixi',
        tileFloorFirstPass: true,
        drawsWorldContent: state.floorDrawCount > 0,
        drawsFloor: state.floorDrawCount > 0,
        initializesPixiApplication: true,
        ownsPointer: false,
        ownsPicking: false,
        ownsBusinessObjects: false,
        usesZIndex: false,
        sortChildren: false,
        canvas2dFallback: 'enabled'
      };
    }
  };

  maybeEmitStart('module-load');
  bindPath('renderer.pixiTileFloorLayer', adapterApi, { owner: OWNER, phase: PHASE });
  bindPath('renderer.pixiEmptyWorldLayer', adapterApi, { owner: OWNER, phase: PHASE, residualFallback: true });
  bindPath('renderer.pixiSkeleton', adapterApi, { owner: OWNER, phase: PHASE, residualFallback: true });

  try {
    var backendSelection = getBackendSelection();
    if (backendSelection && typeof backendSelection.registerBackend === 'function') {
      backendSelection.registerBackend('pixi', adapterApi, {
        owner: OWNER,
        phase: PHASE,
        source: 'pixi-tile-floor-layer-ready',
        tileFloorFirstPass: true,
        pixiRendererCreated: state.rendererCreated === true,
        pixiInitialized: state.initialized === true
      });
      state.registered = true;
      if (typeof backendSelection.selectActiveBackend === 'function') {
        backendSelection.selectActiveBackend({
          source: 'pixi-tile-floor-layer-ready'
        });
      }
    }
  } catch (err) {
    state.registered = false;
    emit('summary', { ok: false, touchedFeature: 'pixi-tile-floor-first-pass', reason: 'backend-register-failed', message: err && err.message ? String(err.message) : String(err || 'unknown') });
  }

  global.__PIXI_WORLD_RENDERER_SKELETON__ = adapterApi;
  global.__PIXI_MIGRATION_PIXI_WORLD_RENDERER__ = adapterApi;
  global.__PIXI_MIGRATION_EMPTY_WORLD_LAYER__ = adapterApi;
  global.__PIXI_MIGRATION_TILE_FLOOR_LAYER__ = adapterApi;
  try { bindPath('renderer.pixi', adapterApi, { owner: OWNER, phase: PHASE, tileFloorFirstPass: true }); } catch (_) {}

  emitBackendStatus('pixi-tile-floor-layer-ready');
  emitPixiStatus('pixi-tile-floor-layer-ready');
  emitFallbackStatus('pixi-tile-floor-layer-ready');
  emitInputStatus('pixi-tile-floor-layer-ready');
  emitSummary('pixi-tile-floor-layer-ready');
})(typeof window !== 'undefined' ? window : globalThis);
