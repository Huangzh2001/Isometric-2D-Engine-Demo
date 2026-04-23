(function () {
  if (typeof window === 'undefined') return;

  function emitP5(kind, message, extra) {
    var line = '[P5][' + String(kind || 'BOOT') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (err) {
      try { console.log(line); } catch (_) {}
    }
    return line;
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
    try {
      var api = getNamespacePath('infrastructure.itemRotationDiagnostic') || window.__ITEM_ROTATION_DIAGNOSTIC__ || null;
      if (api && typeof api.record === 'function') api.record(kind, payload || null);
    } catch (_) {}
  }


  function emitRendererProfile(tag, payload) {
    var line = '[' + String(tag || 'RENDERER-PROFILE') + '] ';
    try { line += JSON.stringify(payload || {}); } catch (_) { line += '{}'; }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function safeFixed(value) {
    var n = Number(value || 0);
    return Number(n.toFixed ? n.toFixed(3) : n);
  }

  function beginFunctionBreakdownFrame() {
    try {
      window.__RENDER_FUNCTION_BREAKDOWN__ = { timings: {}, counts: {}, extras: {} };
    } catch (_) {}
  }

  function getFunctionBreakdownFrame() {
    try { return window.__RENDER_FUNCTION_BREAKDOWN__ || null; } catch (_) { return null; }
  }


  function getLastBaseWorldPassesBreakdown() {
    try { return window.__LAST_BASEWORLD_PASSES_BREAKDOWN__ || null; } catch (_) { return null; }
  }

  function cloneSimpleObject(obj) {
    var out = {};
    if (!obj || typeof obj !== 'object') return out;
    Object.keys(obj).forEach(function (key) {
      var value = obj[key];
      if (value == null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') out[key] = value;
    });
    return out;
  }

  function shouldEmitProfile(signatureKey, signature, minGapMs) {
    minGapMs = Number(minGapMs || 0);
    adapterApi.__profileState = adapterApi.__profileState || {};
    var bucket = adapterApi.__profileState[signatureKey] || { at: 0, sig: '' };
    var now = (typeof perfNow === 'function') ? perfNow() : Date.now();
    if ((now - Number(bucket.at || 0)) < minGapMs && bucket.sig === signature) return false;
    adapterApi.__profileState[signatureKey] = { at: now, sig: signature };
    return true;
  }

  function getRenderableKind(renderable) {
    if (!renderable) return 'unknown';
    return String(renderable.kind || renderable.renderPath || 'unknown');
  }

  function getRenderableDrawPosition(renderable) {
    if (!renderable) return { x: 0, y: 0 };
    if (renderable.drawScreenPosition && typeof renderable.drawScreenPosition.x === 'number' && typeof renderable.drawScreenPosition.y === 'number') {
      return { x: Math.round(renderable.drawScreenPosition.x), y: Math.round(renderable.drawScreenPosition.y) };
    }
    if (renderable.debugFoot && typeof renderable.debugFoot.x === 'number' && typeof renderable.debugFoot.y === 'number') {
      return { x: Math.round(renderable.debugFoot.x), y: Math.round(renderable.debugFoot.y) };
    }
    if (Array.isArray(renderable.faces) && renderable.faces.length && Array.isArray(renderable.faces[0].points) && renderable.faces[0].points.length && typeof averageScreenPoint === 'function') {
      var mid = averageScreenPoint(renderable.faces[0].points);
      return { x: Math.round(mid.x), y: Math.round(mid.y) };
    }
    return { x: 0, y: 0 };
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

  function getStaticBitmapCache() {
    adapterApi.__staticBitmapCache = adapterApi.__staticBitmapCache || new Map();
    return adapterApi.__staticBitmapCache;
  }

  function getStaticBitmapReuseCache() {
    adapterApi.__staticBitmapReuseCache = adapterApi.__staticBitmapReuseCache || new Map();
    return adapterApi.__staticBitmapReuseCache;
  }

  function getActiveCameraInteractionType() {
    try { return window.__habboActiveCameraInteractionType || null; } catch (_) { return null; }
  }

  function getActiveCameraInteractionId() {
    try { return window.__habboActiveCameraInteractionId || null; } catch (_) { return null; }
  }

  function getCameraSettleReuseState() {
    try { return window.__habboCameraSettleReuseState || null; } catch (_) { return null; }
  }

  function shouldUseDeferredZoomSettleReuse() {
    var settleState = getCameraSettleReuseState();
    if (!settleState || String(settleState.lastEndedType || '') !== 'zoom') return false;
    var nowMs = (typeof perfNow === 'function') ? perfNow() : Date.now();
    if (Number(settleState.deferCommitUntilMs || 0) <= nowMs) return false;
    var activeType = getActiveCameraInteractionType();
    return !activeType || activeType === 'drag' || activeType === 'pan' || activeType === 'pinch';
  }

  function getStaticBitmapInteractionState() {
    adapterApi.__staticBitmapInteractionState = adapterApi.__staticBitmapInteractionState || {
      interactionId: null,
      interactionType: null,
      runSlots: new Map()
    };
    var state = adapterApi.__staticBitmapInteractionState;
    var interactionId = getActiveCameraInteractionId();
    var interactionType = getActiveCameraInteractionType();
    if (!interactionId || interactionType !== 'zoom') {
      if (shouldUseDeferredZoomSettleReuse()) return state;
      state.interactionId = null;
      state.interactionType = null;
      state.runSlots = new Map();
      return state;
    }
    if (state.interactionId !== interactionId || state.interactionType !== interactionType) {
      state.interactionId = interactionId;
      state.interactionType = interactionType;
      state.runSlots = new Map();
    }
    return state;
  }

  function buildStaticPacketRunInteractionSlotKey(meta) {
    meta = meta || {};
    return [
      'runslot',
      String(meta.currentViewRotation || 0),
      String(meta.runStartIndex || 0)
    ].join('|');
  }

  function registerStaticPacketRunInteractionSlotEntry(meta, entry) {
    if (!entry) return entry;
    var state = getStaticBitmapInteractionState();
    if (!state || state.interactionType !== 'zoom') return entry;
    state.runSlots.set(buildStaticPacketRunInteractionSlotKey(meta), entry);
    return entry;
  }

  function findStaticPacketRunInteractionSlotEntry(meta) {
    var state = getStaticBitmapInteractionState();
    if (!state || state.interactionType !== 'zoom') return null;
    return state.runSlots.get(buildStaticPacketRunInteractionSlotKey(meta)) || null;
  }

  function shouldUseStaticBitmapRunInteractionReuse(meta) {
    meta = meta || {};
    if (meta.allowInteractionReuse === false) return false;
    return getActiveCameraInteractionType() === 'zoom' || shouldUseDeferredZoomSettleReuse();
  }

  function pruneStaticBitmapCache(maxEntries) {
    var cache = getStaticBitmapCache();
    var limit = Math.max(8, Math.round(Number(maxEntries || 48) || 48));
    if (cache.size <= limit) return;
    var entries = [];
    cache.forEach(function (entry, key) {
      entries.push({ key: key, at: Number(entry && entry.lastUsedAt || 0) });
    });
    entries.sort(function (a, b) { return a.at - b.at; });
    while (cache.size > limit && entries.length) {
      var victim = entries.shift();
      if (victim) cache.delete(victim.key);
    }
  }

  function getZoomPreviewState() {
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

  function clearZoomPreviewState(reason) {
    var state = getZoomPreviewState();
    state.active = false;
    state.snapshot = null;
    state.captureZoom = 1;
    state.targetZoom = 1;
    state.captureCameraX = 0;
    state.captureCameraY = 0;
    state.anchorScreenX = 0;
    state.anchorScreenY = 0;
    state.expiresAt = 0;
    state.updatedAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    state.reason = String(reason || 'clear');
    return state;
  }

  function captureZoomPreviewFrame(meta) {
    meta = meta || {};
    if (typeof canvas === 'undefined' || !canvas || typeof ctx === 'undefined' || !ctx) return null;
    var previewCanvas = createRendererOffscreenCanvas(VIEW_W, VIEW_H);
    if (!previewCanvas || typeof previewCanvas.getContext !== 'function') return null;
    var previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) return null;
    try {
      previewCtx.clearRect(0, 0, VIEW_W, VIEW_H);
      previewCtx.drawImage(canvas, 0, 0, VIEW_W, VIEW_H);
    } catch (_) {
      return null;
    }
    var state = getZoomPreviewState();
    state.snapshot = previewCanvas;
    state.captureZoom = Number(meta.captureZoom || (typeof getMainEditorZoomValueForRender === 'function' ? getMainEditorZoomValueForRender() : 1) || 1);
    if (!Number.isFinite(state.captureZoom) || state.captureZoom <= 0) state.captureZoom = 1;
    state.captureCameraX = Number(meta.captureCameraX != null ? meta.captureCameraX : (typeof camera !== 'undefined' && camera ? camera.x : 0) || 0);
    state.captureCameraY = Number(meta.captureCameraY != null ? meta.captureCameraY : (typeof camera !== 'undefined' && camera ? camera.y : 0) || 0);
    state.anchorScreenX = Number(meta.anchorScreenX != null ? meta.anchorScreenX : VIEW_W * 0.5);
    state.anchorScreenY = Number(meta.anchorScreenY != null ? meta.anchorScreenY : VIEW_H * 0.5);
    state.updatedAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    state.source = String(meta.source || 'unknown');
    return {
      ok: true,
      captureZoom: state.captureZoom,
      captureCameraX: state.captureCameraX,
      captureCameraY: state.captureCameraY
    };
  }

  function updateZoomPreviewState(meta) {
    meta = meta || {};
    var state = getZoomPreviewState();
    if (!state.snapshot) return { ok: false, reason: 'missing-snapshot' };
    state.active = true;
    state.targetZoom = Number(meta.targetZoom || state.captureZoom || 1);
    if (!Number.isFinite(state.targetZoom) || state.targetZoom <= 0) state.targetZoom = state.captureZoom || 1;
    state.targetCameraX = Number(meta.targetCameraX != null ? meta.targetCameraX : (typeof camera !== 'undefined' && camera ? camera.x : 0) || 0);
    state.targetCameraY = Number(meta.targetCameraY != null ? meta.targetCameraY : (typeof camera !== 'undefined' && camera ? camera.y : 0) || 0);
    state.anchorScreenX = Number(meta.anchorScreenX != null ? meta.anchorScreenX : state.anchorScreenX || VIEW_W * 0.5);
    state.anchorScreenY = Number(meta.anchorScreenY != null ? meta.anchorScreenY : state.anchorScreenY || VIEW_H * 0.5);
    state.debounceMs = Math.max(120, Math.min(200, Math.round(Number(meta.debounceMs || state.debounceMs || 160) || 160)));
    state.expiresAt = ((typeof perfNow === 'function') ? perfNow() : Date.now()) + state.debounceMs;
    state.updatedAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    state.source = String(meta.source || state.source || 'unknown');
    return {
      ok: true,
      targetZoom: state.targetZoom,
      debounceMs: state.debounceMs,
      expiresAt: state.expiresAt
    };
  }

  function shouldUseZoomPreviewFastPath() {
    var state = getZoomPreviewState();
    if (!state.active || !state.snapshot) return false;
    var now = (typeof perfNow === 'function') ? perfNow() : Date.now();
    if (now > Number(state.expiresAt || 0)) {
      clearZoomPreviewState('debounce-expired');
      return false;
    }
    return true;
  }

  function drawZoomPreviewFastPath(meta) {
    if (!shouldUseZoomPreviewFastPath()) return null;
    meta = meta || {};
    var state = getZoomPreviewState();
    var drawStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    var ratio = Number(state.targetZoom || 1) / Math.max(0.0001, Number(state.captureZoom || 1));
    if (!Number.isFinite(ratio) || ratio <= 0) ratio = 1;
    var ax = Number(state.anchorScreenX || VIEW_W * 0.5);
    var ay = Number(state.anchorScreenY || VIEW_H * 0.5);
    try {
      ctx.save();
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      ctx.translate(ax, ay);
      ctx.scale(ratio, ratio);
      ctx.translate(-ax, -ay);
      ctx.drawImage(state.snapshot, 0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    } catch (_) {
      try { ctx.restore(); } catch (__restoreErr) {}
      clearZoomPreviewState('draw-failed');
      return null;
    }
    var drawMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - drawStartAt);
    var payload = {
      source: String(meta.source || state.source || 'unknown'),
      captureZoom: Number(state.captureZoom || 1),
      targetZoom: Number(state.targetZoom || 1),
      scaleRatio: safeFixed(ratio),
      anchorScreenX: safeFixed(ax),
      anchorScreenY: safeFixed(ay),
      debounceMs: Number(state.debounceMs || 160),
      drawMs: safeFixed(drawMs),
      interactionFastPath: true
    };
    var signature = [payload.captureZoom, payload.targetZoom, payload.anchorScreenX, payload.anchorScreenY, payload.interactionFastPath].join('|');
    if (shouldEmitProfile('zoomPreviewFastPath', signature, 120)) emitRendererProfile('ZOOM-PREVIEW-FASTPATH', payload);
    return payload;
  }

  function mixHashString(hash, value) {
    var str = String(value == null ? '' : value);
    var out = Number(hash >>> 0);
    for (var i = 0; i < str.length; i++) {
      out ^= str.charCodeAt(i);
      out = Math.imul(out, 16777619) >>> 0;
    }
    return out >>> 0;
  }

  function buildStaticPacketRunReuseKey(packets, meta) {
    packets = Array.isArray(packets) ? packets : [];
    meta = meta || {};
    var hash = 2166136261 >>> 0;
    hash = mixHashString(hash, Number(meta.currentViewRotation || 0));
    hash = mixHashString(hash, Number(packets.length || 0));
    var firstId = packets.length ? String(packets[0] && packets[0].id || '') : '';
    var lastId = packets.length ? String(packets[packets.length - 1] && packets[packets.length - 1].id || '') : '';
    for (var i = 0; i < packets.length; i++) {
      var packet = packets[i] || null;
      hash = mixHashString(hash, String(packet && packet.id || ''));
      hash = mixHashString(hash, String(packet && packet.fill || ''));
      hash = mixHashString(hash, String(packet && packet.stroke || ''));
      hash = mixHashString(hash, Number(packet && packet.width || 1));
      hash = mixHashString(hash, Array.isArray(packet && packet.worldPts) ? packet.worldPts.length : 0);
      hash = mixHashString(hash, Array.isArray(packet && packet.worldLoops) ? packet.worldLoops.length : 0);
      hash = mixHashString(hash, Array.isArray(packet && packet.worldOutlineSegments) ? packet.worldOutlineSegments.length : 0);
      hash = mixHashString(hash, Array.isArray(packet && packet.shadowOverlaysWorld) ? packet.shadowOverlaysWorld.length : 0);
    }
    return [
      'runbmp-reuse',
      String(meta.currentViewRotation || 0),
      String(packets.length || 0),
      firstId,
      lastId,
      String(hash >>> 0)
    ].join('|');
  }

  function buildStaticPacketRunBitmapSignature(packets, meta) {
    packets = Array.isArray(packets) ? packets : [];
    meta = meta || {};
    return [
      buildStaticPacketRunReuseKey(packets, meta),
      String(Number(typeof settings !== 'undefined' && settings && settings.tileW || 0)),
      String(Number(typeof settings !== 'undefined' && settings && settings.tileH || 0)),
      String(Number(typeof settings !== 'undefined' && settings && settings.originX || 0)),
      String(Number(typeof settings !== 'undefined' && settings && settings.originY || 0))
    ].join('|');
  }

  function registerStaticPacketRunBitmapEntry(reuseKey, signature, entry) {
    if (!reuseKey || !signature || !entry) return entry;
    entry.reuseKey = String(reuseKey);
    entry.signature = String(signature);
    getStaticBitmapReuseCache().set(String(reuseKey), entry);
    return entry;
  }

  function findReusableStaticPacketRunBitmapEntry(reuseKey, signature, meta) {
    if (signature) {
      var exact = getStaticBitmapCache().get(String(signature)) || null;
      if (exact) return exact;
    }
    if (reuseKey) {
      var reuseEntry = getStaticBitmapReuseCache().get(String(reuseKey)) || null;
      if (reuseEntry) return reuseEntry;
    }
    return findStaticPacketRunInteractionSlotEntry(meta);
  }

  function expandBoundsByPoint(bounds, pt) {
    if (!bounds || !pt) return bounds;
    var x = Number(pt.x || 0);
    var y = Number(pt.y || 0);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return bounds;
    if (x < bounds.minX) bounds.minX = x;
    if (y < bounds.minY) bounds.minY = y;
    if (x > bounds.maxX) bounds.maxX = x;
    if (y > bounds.maxY) bounds.maxY = y;
    return bounds;
  }

  function collectStaticPacketRunGeometry(packets, meta, stats) {
    packets = Array.isArray(packets) ? packets : [];
    meta = meta || {};
    stats = stats || {};
    var projectedPackets = [];
    var bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    var overlayCount = 0;
    for (var i = 0; i < packets.length; i++) {
      var packet = packets[i];
      var projected = typeof getStaticWorldPacketProjectedGeometry === 'function'
        ? getStaticWorldPacketProjectedGeometry(packet, meta.currentViewRotation)
        : null;
      if (!projected || !Array.isArray(projected.pointsNoCamera) || projected.pointsNoCamera.length < 3) continue;
      projectedPackets.push({ packet: packet, projected: projected });
      var packetState = packet && packet.__lastStaticPacketCacheState ? packet.__lastStaticPacketCacheState : null;
      if (packetState && packetState.geometryCacheHit === true) stats.staticPacketGeometryCacheHitCount += 1;
      else stats.staticPacketGeometryCacheMissCount += 1;
      if (packetState && Number(packetState.overlayCount || 0) > 0) {
        overlayCount += Number(packetState.overlayCount || 0);
        if (packetState.overlayCacheHit === true) stats.staticPacketOverlayCacheHitCount += 1;
        else stats.staticPacketOverlayCacheMissCount += 1;
      }
      for (var p = 0; p < projected.pointsNoCamera.length; p++) expandBoundsByPoint(bounds, projected.pointsNoCamera[p]);
      var overlays = Array.isArray(projected.overlaysNoCamera) ? projected.overlaysNoCamera : [];
      for (var oi = 0; oi < overlays.length; oi++) {
        var overlay = overlays[oi] || null;
        var clip = overlay && Array.isArray(overlay.clipPolyNoCamera) ? overlay.clipPolyNoCamera : [];
        for (var cp = 0; cp < clip.length; cp++) expandBoundsByPoint(bounds, clip[cp]);
        var polys = overlay && Array.isArray(overlay.polysNoCamera) ? overlay.polysNoCamera : [];
        for (var pi = 0; pi < polys.length; pi++) {
          var poly = Array.isArray(polys[pi]) ? polys[pi] : [];
          for (var pp = 0; pp < poly.length; pp++) expandBoundsByPoint(bounds, poly[pp]);
        }
      }
    }
    if (!projectedPackets.length || !Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY) || !Number.isFinite(bounds.maxX) || !Number.isFinite(bounds.maxY)) {
      return null;
    }
    return {
      projectedPackets: projectedPackets,
      bounds: bounds,
      overlayCount: overlayCount
    };
  }

  function buildStaticPacketRunBitmap(geometry, meta) {
    if (!geometry || !geometry.projectedPackets || !geometry.projectedPackets.length) return null;
    meta = meta || {};
    var pad = 8;
    var minX = Math.floor(Number(geometry.bounds.minX || 0)) - pad;
    var minY = Math.floor(Number(geometry.bounds.minY || 0)) - pad;
    var maxX = Math.ceil(Number(geometry.bounds.maxX || 0)) + pad;
    var maxY = Math.ceil(Number(geometry.bounds.maxY || 0)) + pad;
    var width = Math.max(1, maxX - minX);
    var height = Math.max(1, maxY - minY);
    var surface = createRendererOffscreenCanvas(width, height);
    if (!surface) return null;
    var surfaceCtx = typeof surface.getContext === 'function' ? surface.getContext('2d') : null;
    if (!surfaceCtx) return null;
    surfaceCtx.clearRect(0, 0, width, height);
    surfaceCtx.save();
    surfaceCtx.translate(-minX, -minY);
    for (var i = 0; i < geometry.projectedPackets.length; i++) {
      var entry = geometry.projectedPackets[i];
      var packet = entry.packet;
      var projected = entry.projected;
      if (!packet || !projected || !projected.path2d) continue;
      if (packet.fill) {
        surfaceCtx.fillStyle = packet.fill;
        surfaceCtx.fill(projected.path2d);
      }
      if (packet.stroke) {
        surfaceCtx.strokeStyle = packet.stroke;
        surfaceCtx.lineWidth = packet.width || 1;
        surfaceCtx.stroke(projected.path2d);
      }
      if (Array.isArray(projected.overlaysNoCamera) && projected.overlaysNoCamera.length && typeof drawFaceShadowOverlaysNoCamera === 'function') {
        drawFaceShadowOverlaysNoCamera(surfaceCtx, projected.pointsNoCamera, projected.overlaysNoCamera, 0, 0);
      }
    }
    surfaceCtx.restore();
    return {
      bitmap: surface,
      minX: minX,
      minY: minY,
      width: width,
      height: height,
      packetCount: geometry.projectedPackets.length,
      overlayCount: geometry.overlayCount || 0,
      currentViewRotation: Number(meta.currentViewRotation || 0),
      tileW: Number(typeof settings !== 'undefined' && settings && settings.tileW || 0),
      tileH: Number(typeof settings !== 'undefined' && settings && settings.tileH || 0),
      originX: Number(typeof settings !== 'undefined' && settings && settings.originX || 0),
      originY: Number(typeof settings !== 'undefined' && settings && settings.originY || 0),
      builtAt: (typeof perfNow === 'function') ? perfNow() : Date.now(),
      lastUsedAt: (typeof perfNow === 'function') ? perfNow() : Date.now()
    };
  }

  function drawStaticPacketRunBitmapEntry(entry, meta, stats, drawMode) {
    entry = entry || null;
    meta = meta || {};
    stats = stats || {};
    if (!entry || !entry.bitmap) return false;
    var drawStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    var offsetX = Number(typeof camera !== 'undefined' && camera && camera.x || 0);
    var offsetY = Number(typeof camera !== 'undefined' && camera && camera.y || 0);
    var targetX = Number(entry.minX || 0);
    var targetY = Number(entry.minY || 0);
    var targetW = Number(entry.width || 0);
    var targetH = Number(entry.height || 0);
    if (drawMode === 'interaction-reuse') {
      var builtTileW = Number(entry.tileW || 0);
      var builtTileH = Number(entry.tileH || 0);
      var currentTileW = Number(typeof settings !== 'undefined' && settings && settings.tileW || 0);
      var currentTileH = Number(typeof settings !== 'undefined' && settings && settings.tileH || 0);
      if (!(builtTileW > 0 && builtTileH > 0 && currentTileW > 0 && currentTileH > 0)) return false;
      var scaleX = currentTileW / builtTileW;
      var scaleY = currentTileH / builtTileH;
      if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) return false;
      var builtOriginX = Number(entry.originX || 0);
      var builtOriginY = Number(entry.originY || 0);
      var currentOriginX = Number(typeof settings !== 'undefined' && settings && settings.originX || 0);
      var currentOriginY = Number(typeof settings !== 'undefined' && settings && settings.originY || 0);
      targetX = currentOriginX + (Number(entry.minX || 0) - builtOriginX) * scaleX;
      targetY = currentOriginY + (Number(entry.minY || 0) - builtOriginY) * scaleY;
      targetW = Number(entry.width || 0) * scaleX;
      targetH = Number(entry.height || 0) * scaleY;
      stats.staticBitmapRunInteractionReuseCount = Number(stats.staticBitmapRunInteractionReuseCount || 0) + 1;
      stats.staticBitmapRunInteractionReuseDrawMs = Number(stats.staticBitmapRunInteractionReuseDrawMs || 0);
      stats.staticBitmapRunInteractionReuseScale = safeFixed(scaleX);
    }
    ctx.drawImage(entry.bitmap, targetX + offsetX, targetY + offsetY, targetW, targetH);
    var drawMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - drawStartAt);
    stats.staticBitmapRunDrawMs += drawMs;
    if (drawMode === 'interaction-reuse') stats.staticBitmapRunInteractionReuseDrawMs += drawMs;
    stats.staticBitmapRunCount += 1;
    stats.staticBitmapRunPacketCount += Number(entry.packetCount || 0);
    stats.staticBitmapRunOverlayCount += Number(entry.overlayCount || 0);
    entry.lastUsedAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    return true;
  }

  function drawStaticPacketRunBitmap(packets, meta, stats) {
    packets = Array.isArray(packets) ? packets : [];
    meta = meta || {};
    stats = stats || {};
    if (!packets.length) return false;
    if (typeof getStaticWorldPacketProjectedGeometry !== 'function') return false;
    var signature = buildStaticPacketRunBitmapSignature(packets, meta);
    var reuseKey = buildStaticPacketRunReuseKey(packets, meta);
    var cache = getStaticBitmapCache();
    var entry = cache.get(signature) || null;
    if (entry) {
      stats.staticBitmapRunCacheHitCount += 1;
      registerStaticPacketRunInteractionSlotEntry(meta, entry);
      return drawStaticPacketRunBitmapEntry(entry, meta, stats, 'exact-cache');
    }
    stats.staticBitmapRunCacheMissCount += 1;
    if (shouldUseStaticBitmapRunInteractionReuse(meta)) {
      var reuseEntry = findReusableStaticPacketRunBitmapEntry(reuseKey, signature, meta);
      if (reuseEntry && drawStaticPacketRunBitmapEntry(reuseEntry, meta, stats, 'interaction-reuse')) {
        registerStaticPacketRunInteractionSlotEntry(meta, reuseEntry);
        return true;
      }
    }
    var geometryStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    var geometry = collectStaticPacketRunGeometry(packets, meta, stats);
    stats.staticBitmapRunGeometryMs += Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - geometryStartAt);
    if (!geometry || !geometry.projectedPackets.length) return false;
    var buildStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    entry = buildStaticPacketRunBitmap(geometry, meta);
    stats.staticBitmapRunBuildMs += Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - buildStartAt);
    if (!entry) return false;
    cache.set(signature, entry);
    registerStaticPacketRunBitmapEntry(reuseKey, signature, entry);
    registerStaticPacketRunInteractionSlotEntry(meta, entry);
    pruneStaticBitmapCache(48);
    return drawStaticPacketRunBitmapEntry(entry, meta, stats, 'exact-cache');
  }

  function drawStaticPacketRunFallback(packets, meta, stats, trackSlowRenderable) {
    packets = Array.isArray(packets) ? packets : [];
    meta = meta || {};
    stats = stats || {};
    for (var i = 0; i < packets.length; i++) {
      var r = packets[i];
      var renderableStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
      if (r) {
        r.currentViewRotation = r.currentViewRotation != null ? r.currentViewRotation : ((meta && typeof meta.currentViewRotation === 'number') ? meta.currentViewRotation : (r.cacheViewRotation != null ? r.cacheViewRotation : 0));
        r.framePlanId = r.framePlanId || meta.framePlanId || null;
        r.__drawIndex = meta.runStartIndex + i;
      }
      if (typeof drawStaticWorldFacePacket === 'function') drawStaticWorldFacePacket(r);
      if (r && typeof drawFaceDebugOverlayRenderable === 'function') drawFaceDebugOverlayRenderable(r, meta.runStartIndex + i);
      var renderableMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - renderableStartAt);
      stats.staticPacketDrawLoopMs += renderableMs;
      var packetCacheState = r && r.__lastStaticPacketCacheState ? r.__lastStaticPacketCacheState : null;
      if (packetCacheState && packetCacheState.geometryCacheHit === true) stats.staticPacketGeometryCacheHitCount += 1;
      else stats.staticPacketGeometryCacheMissCount += 1;
      if (packetCacheState && packetCacheState.overlayCount > 0) {
        if (packetCacheState.overlayCacheHit === true) stats.staticPacketOverlayCacheHitCount += 1;
        else stats.staticPacketOverlayCacheMissCount += 1;
      }
      if (typeof trackSlowRenderable === 'function') {
        trackSlowRenderable({
          index: meta.runStartIndex + i,
          id: r && (r.id || r.instanceId || null),
          kind: getRenderableKind(r),
          ms: safeFixed(renderableMs)
        });
      }
    }
  }

  function drawRenderableOrder(order, meta) {
    meta = meta || {};
    order = Array.isArray(order) ? order : [];
    var seenDrawHits = Object.create(null);
    var drawStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    var staticPacketCount = 0;
    var dynamicRenderableCount = 0;
    var staticPacketDrawLoopMs = 0;
    var dynamicRenderableDrawLoopMs = 0;
    var staticPacketKindCounts = Object.create(null);
    var dynamicKindCounts = Object.create(null);
    var staticPacketGeometryCacheHitCount = 0;
    var staticPacketGeometryCacheMissCount = 0;
    var staticPacketOverlayCacheHitCount = 0;
    var staticPacketOverlayCacheMissCount = 0;
    var staticBitmapRunCount = 0;
    var staticBitmapRunPacketCount = 0;
    var staticBitmapRunOverlayCount = 0;
    var staticBitmapRunCacheHitCount = 0;
    var staticBitmapRunCacheMissCount = 0;
    var staticBitmapRunBuildMs = 0;
    var staticBitmapRunDrawMs = 0;
    var staticBitmapRunGeometryMs = 0;
    var staticBitmapRunInteractionReuseCount = 0;
    var staticBitmapRunInteractionReuseDrawMs = 0;
    var topSlowRenderables = [];
    var canvasTiming = {
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
    function trackSlowRenderable(entry) {
      if (!entry) return;
      topSlowRenderables.push(entry);
      topSlowRenderables.sort(function (a, b) { return Number(b.ms || 0) - Number(a.ms || 0); });
      if (topSlowRenderables.length > 8) topSlowRenderables.length = 8;
    }
    function wrapCanvasMethod(name, msKey, countKey) {
      if (!ctx || typeof ctx[name] !== 'function') return null;
      var original = ctx[name];
      ctx[name] = function () {
        var t0 = (typeof perfNow === 'function') ? perfNow() : Date.now();
        try {
          return original.apply(this, arguments);
        } finally {
          var t1 = (typeof perfNow === 'function') ? perfNow() : Date.now();
          canvasTiming[msKey] += Math.max(0, t1 - t0);
          canvasTiming[countKey] += 1;
        }
      };
      return function restore() {
        try { ctx[name] = original; } catch (_) {}
      };
    }
    var restoreCanvasMethods = [];
    restoreCanvasMethods.push(wrapCanvasMethod('beginPath', 'beginPathMs', 'beginPathCount'));
    restoreCanvasMethods.push(wrapCanvasMethod('moveTo', 'moveToMs', 'moveToCount'));
    restoreCanvasMethods.push(wrapCanvasMethod('lineTo', 'lineToMs', 'lineToCount'));
    restoreCanvasMethods.push(wrapCanvasMethod('closePath', 'closePathMs', 'closePathCount'));
    restoreCanvasMethods.push(wrapCanvasMethod('fill', 'fillMs', 'fillCount'));
    restoreCanvasMethods.push(wrapCanvasMethod('stroke', 'strokeMs', 'strokeCount'));
    restoreCanvasMethods.push(wrapCanvasMethod('drawImage', 'drawImageMs', 'drawImageCount'));
    restoreCanvasMethods.push(wrapCanvasMethod('fillRect', 'fillRectMs', 'fillRectCount'));
    restoreCanvasMethods.push(wrapCanvasMethod('strokeRect', 'strokeRectMs', 'strokeRectCount'));
    restoreCanvasMethods.push(wrapCanvasMethod('clearRect', 'clearRectMs', 'clearRectCount'));
    adapterApi.__inDrawRenderableOrder = true;
    try {
      debugState.renderStep = 'draw-renderables';
      var i = 0;
      while (i < order.length) {
        var r = order[i];
        var isStaticWorldPacket = !!(r && r.kind === 'static-world-face-packet');
        if (isStaticWorldPacket) {
          var runStartIndex = i;
          var staticPackets = [];
          while (i < order.length) {
            var maybePacket = order[i];
            if (!(maybePacket && maybePacket.kind === 'static-world-face-packet')) break;
            staticPackets.push(maybePacket);
            var packetKind = getRenderableKind(maybePacket);
            staticPacketCount += 1;
            staticPacketKindCounts[packetKind] = Number(staticPacketKindCounts[packetKind] || 0) + 1;
            i += 1;
          }
          var staticRunStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
          var staticRunStats = {
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
          var usedBitmapRun = false;
          if (staticPackets.length >= 24) {
            usedBitmapRun = drawStaticPacketRunBitmap(staticPackets, {
              source: meta.source || 'unknown',
              framePlanId: meta.framePlanId || null,
              currentViewRotation: meta.currentViewRotation != null ? meta.currentViewRotation : 0,
              runStartIndex: runStartIndex
            }, staticRunStats) === true;
          }
          if (!usedBitmapRun) {
            drawStaticPacketRunFallback(staticPackets, {
              source: meta.source || 'unknown',
              framePlanId: meta.framePlanId || null,
              currentViewRotation: meta.currentViewRotation != null ? meta.currentViewRotation : 0,
              runStartIndex: runStartIndex
            }, staticRunStats, trackSlowRenderable);
          } else {
            trackSlowRenderable({
              index: runStartIndex,
              id: staticPackets.length ? (staticPackets[0].id || null) : null,
              kind: 'static-world-face-run-bitmap',
              ms: safeFixed(Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - staticRunStartAt))
            });
          }
          staticPacketGeometryCacheHitCount += Number(staticRunStats.staticPacketGeometryCacheHitCount || 0);
          staticPacketGeometryCacheMissCount += Number(staticRunStats.staticPacketGeometryCacheMissCount || 0);
          staticPacketOverlayCacheHitCount += Number(staticRunStats.staticPacketOverlayCacheHitCount || 0);
          staticPacketOverlayCacheMissCount += Number(staticRunStats.staticPacketOverlayCacheMissCount || 0);
          staticBitmapRunCount += Number(staticRunStats.staticBitmapRunCount || 0);
          staticBitmapRunPacketCount += Number(staticRunStats.staticBitmapRunPacketCount || 0);
          staticBitmapRunOverlayCount += Number(staticRunStats.staticBitmapRunOverlayCount || 0);
          staticBitmapRunCacheHitCount += Number(staticRunStats.staticBitmapRunCacheHitCount || 0);
          staticBitmapRunCacheMissCount += Number(staticRunStats.staticBitmapRunCacheMissCount || 0);
          staticBitmapRunBuildMs += Number(staticRunStats.staticBitmapRunBuildMs || 0);
          staticBitmapRunDrawMs += Number(staticRunStats.staticBitmapRunDrawMs || 0);
          staticBitmapRunGeometryMs += Number(staticRunStats.staticBitmapRunGeometryMs || 0);
          staticBitmapRunInteractionReuseCount += Number(staticRunStats.staticBitmapRunInteractionReuseCount || 0);
          staticBitmapRunInteractionReuseDrawMs += Number(staticRunStats.staticBitmapRunInteractionReuseDrawMs || 0);
          staticPacketDrawLoopMs += Number(staticRunStats.staticPacketDrawLoopMs || 0) + (usedBitmapRun ? Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - staticRunStartAt) : 0);
          continue;
        }
        var kind = getRenderableKind(r);
        dynamicRenderableCount += 1;
        dynamicKindCounts[kind] = Number(dynamicKindCounts[kind] || 0) + 1;
        debugState.lastRenderable = String(i + 1) + '/' + String(order.length) + ':' + String((r && r.kind) || 'unknown') + ':' + String((r && r.id) || 'no-id');
        var renderableStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
        try {
          if (r) {
            r.currentViewRotation = r.currentViewRotation != null ? r.currentViewRotation : ((meta && typeof meta.currentViewRotation === 'number') ? meta.currentViewRotation : (r.cacheViewRotation != null ? r.cacheViewRotation : 0));
            r.framePlanId = r.framePlanId || meta.framePlanId || null;
            r.__drawIndex = i;
          }
          if (r && typeof r.draw === 'function') r.draw();
          else if (r && r.kind === 'voxel') drawCachedVoxelRenderable(r);
          else throw new Error('missing draw for renderable ' + String(r && r.id));
          if (r && typeof drawFaceDebugOverlayRenderable === 'function') drawFaceDebugOverlayRenderable(r, i);
          if (r && (r.instanceId || r.prefabId)) {
            var drawKey = [String(r.framePlanId || 'frameplan:none'), String(r.renderPath || r.kind || 'unknown'), String(r.instanceId || r.id || 'none')].join('|');
            if (!seenDrawHits[drawKey]) {
              seenDrawHits[drawKey] = true;
              recordDrawDiagnostic('main-render-draw-hit', {
                currentViewRotation: Number(r.currentViewRotation || 0),
                cacheViewRotation: r.cacheViewRotation != null ? Number(r.cacheViewRotation) : null,
                instanceId: r.instanceId || null,
                prefabId: r.prefabId || null,
                renderPath: r.renderPath || (r.kind === 'voxel' ? 'static-cache' : 'dynamic-renderables'),
                framePlanId: r.framePlanId || null,
                cacheSignature: r.cacheSignature || null,
                renderSourceId: r.id || null,
                finalDrawScreenPosition: getRenderableDrawPosition(r),
                drawUsedCurrentViewRotation: r.cacheViewRotation != null
                  ? Number(r.cacheViewRotation) === Number(r.currentViewRotation || 0)
                  : true,
                drawUsedSemanticTextureMapping: !!r.drawUsedSemanticTextureMapping
              });
            }
          }
        } catch (err) {
          if (typeof detailLog === 'function') detailLog('[renderable-error] ' + String(debugState.lastRenderable) + ' stack=' + String((err && err.stack) || err));
          throw err;
        } finally {
          var renderableMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - renderableStartAt);
          dynamicRenderableDrawLoopMs += renderableMs;
          trackSlowRenderable({
            index: i,
            id: r && (r.id || r.instanceId || null),
            kind: kind,
            ms: safeFixed(renderableMs)
          });
        }
        i += 1;
      }
      var drawMsRaw = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - drawStartAt);
      var drawMs = safeFixed(drawMsRaw);
      var loopBreakdown = {
        source: meta.source || 'unknown',
        framePlanId: meta.framePlanId || null,
        renderableCount: Number(order.length || 0),
        staticPacketCount: Number(staticPacketCount || 0),
        dynamicRenderableCount: Number(dynamicRenderableCount || 0),
        staticPacketDrawLoopMs: safeFixed(staticPacketDrawLoopMs),
        dynamicRenderableDrawLoopMs: safeFixed(dynamicRenderableDrawLoopMs),
        avgStaticPacketDrawMs: staticPacketCount > 0 ? safeFixed(staticPacketDrawLoopMs / staticPacketCount) : 0,
        avgDynamicRenderableDrawMs: dynamicRenderableCount > 0 ? safeFixed(dynamicRenderableDrawLoopMs / dynamicRenderableCount) : 0,
        staticPacketGeometryCacheHitCount: Number(staticPacketGeometryCacheHitCount || 0),
        staticPacketGeometryCacheMissCount: Number(staticPacketGeometryCacheMissCount || 0),
        staticPacketOverlayCacheHitCount: Number(staticPacketOverlayCacheHitCount || 0),
        staticPacketOverlayCacheMissCount: Number(staticPacketOverlayCacheMissCount || 0),
        staticBitmapRunCount: Number(staticBitmapRunCount || 0),
        staticBitmapRunPacketCount: Number(staticBitmapRunPacketCount || 0),
        staticBitmapRunOverlayCount: Number(staticBitmapRunOverlayCount || 0),
        staticBitmapRunCacheHitCount: Number(staticBitmapRunCacheHitCount || 0),
        staticBitmapRunCacheMissCount: Number(staticBitmapRunCacheMissCount || 0),
        staticBitmapRunBuildMs: safeFixed(staticBitmapRunBuildMs),
        staticBitmapRunDrawMs: safeFixed(staticBitmapRunDrawMs),
        staticBitmapRunGeometryMs: safeFixed(staticBitmapRunGeometryMs),
        staticBitmapRunInteractionReuseCount: Number(staticBitmapRunInteractionReuseCount || 0),
        staticBitmapRunInteractionReuseDrawMs: safeFixed(staticBitmapRunInteractionReuseDrawMs),
        canvasBeginPathMs: safeFixed(canvasTiming.beginPathMs),
        canvasBeginPathCount: Number(canvasTiming.beginPathCount || 0),
        canvasMoveToMs: safeFixed(canvasTiming.moveToMs),
        canvasMoveToCount: Number(canvasTiming.moveToCount || 0),
        canvasLineToMs: safeFixed(canvasTiming.lineToMs),
        canvasLineToCount: Number(canvasTiming.lineToCount || 0),
        canvasClosePathMs: safeFixed(canvasTiming.closePathMs),
        canvasClosePathCount: Number(canvasTiming.closePathCount || 0),
        canvasFillMs: safeFixed(canvasTiming.fillMs),
        canvasFillCount: Number(canvasTiming.fillCount || 0),
        canvasStrokeMs: safeFixed(canvasTiming.strokeMs),
        canvasStrokeCount: Number(canvasTiming.strokeCount || 0),
        canvasDrawImageMs: safeFixed(canvasTiming.drawImageMs),
        canvasDrawImageCount: Number(canvasTiming.drawImageCount || 0),
        canvasFillRectMs: safeFixed(canvasTiming.fillRectMs),
        canvasFillRectCount: Number(canvasTiming.fillRectCount || 0),
        canvasStrokeRectMs: safeFixed(canvasTiming.strokeRectMs),
        canvasStrokeRectCount: Number(canvasTiming.strokeRectCount || 0),
        canvasClearRectMs: safeFixed(canvasTiming.clearRectMs),
        canvasClearRectCount: Number(canvasTiming.clearRectCount || 0),
        topSlowRenderables: topSlowRenderables.slice(0),
        staticPacketKindCounts: staticPacketKindCounts,
        dynamicKindCounts: dynamicKindCounts,
        drawRenderableOrderMs: drawMs
      };
      adapterApi.__lastDrawLoopBreakdown = loopBreakdown;
      if (shouldEmitProfile('drawLoopBreakdown', [
        Number(loopBreakdown.renderableCount || 0),
        Number(loopBreakdown.staticPacketCount || 0),
        Number(loopBreakdown.dynamicRenderableCount || 0),
        Number(loopBreakdown.drawRenderableOrderMs || 0).toFixed(1),
        Number(loopBreakdown.staticBitmapRunCount || 0)
      ].join('|'), 250)) {
        emitRendererProfile('DRAW-LOOP-BREAKDOWN', loopBreakdown);
      }
      try {
        if (typeof __lastFrameDrawMs !== 'undefined') __lastFrameDrawMs = drawMs;
        if (typeof __lastFrameDrawStats !== 'undefined') {
          __lastFrameDrawStats = {
            drawMs: drawMs,
            renderableCount: Number(order.length || 0),
            staticPacketCount: Number(staticPacketCount || 0),
            dynamicRenderableCount: Number(dynamicRenderableCount || 0),
            staticBitmapRunCount: Number(staticBitmapRunCount || 0)
          };
        }
        if (typeof maybeLogFrameWorkBreakdown === 'function' && typeof __lastMainRenderableBuildStats !== 'undefined' && __lastMainRenderableBuildStats) {
          maybeLogFrameWorkBreakdown({
            cameraX: Number(typeof camera !== 'undefined' && camera && camera.x || 0),
            cameraY: Number(typeof camera !== 'undefined' && camera && camera.y || 0),
            zoom: Number(__lastMainRenderableBuildStats.zoom || (typeof getMainEditorZoomValueForRender === 'function' ? getMainEditorZoomValueForRender() : 1)),
            visibleChunkCount: Number(__lastMainRenderableBuildStats.visibleChunkCount || __lastMainRenderableBuildStats.visibleStaticChunkCount || 0),
            visibleStaticChunkCount: Number(__lastMainRenderableBuildStats.visibleStaticChunkCount || 0),
            visibleStaticPacketCount: Number(__lastMainRenderableBuildStats.visibleStaticPacketCount || 0),
            staticPacketMergeMs: Number(__lastMainRenderableBuildStats.staticPacketMergeMs || 0),
            staticPacketProjectMs: Number(__lastMainRenderableBuildStats.staticPacketProjectMs || 0),
            staticPacketSortMs: Number(__lastMainRenderableBuildStats.staticPacketSortMs || 0),
            staticPacketDrawPrepMs: Number(__lastMainRenderableBuildStats.staticPacketDrawPrepMs || 0),
            dynamicObjectCount: Number(__lastMainRenderableBuildStats.dynamicObjectCount || 0),
            dynamicObjectBuildMs: Number(__lastMainRenderableBuildStats.dynamicBuildMs || 0),
            drawRenderableOrderMs: Number(drawMs || 0),
            finalDrawMs: Number(drawMs || 0),
            frameBuildMs: Number(__lastMainRenderableBuildStats.frameBuildMs || 0),
            staticBitmapRunCount: Number(staticBitmapRunCount || 0),
            staticBitmapRunBuildMs: Number(staticBitmapRunBuildMs || 0),
            staticBitmapRunDrawMs: Number(staticBitmapRunDrawMs || 0)
          });
        }
      } catch (_) {}
      return order;
    } finally {
      for (var restoreIndex = 0; restoreIndex < restoreCanvasMethods.length; restoreIndex++) {
        if (typeof restoreCanvasMethods[restoreIndex] === 'function') restoreCanvasMethods[restoreIndex]();
      }
      adapterApi.__inDrawRenderableOrder = false;
    }
  }

  function drawOverlayPasses(meta) {
    meta = meta || {};
    adapterApi.__inDrawOverlayPasses = true;
    try {
      debugState.renderStep = 'editor-overlay';
      drawSelectedInstanceHighlight();
      drawSelectedInstanceProjectionDebug();
      drawShadowProbeOverlay();
      if (editor.mode === 'delete') drawDeleteHover();
      else drawPlacementPreview();
      debugState.renderStep = 'light-glow';
      renderLightingGlow();
      debugState.renderStep = 'light-bulbs';
      var renderLights = typeof getLightingRenderLights === 'function' ? getLightingRenderLights() : [];
      for (var i = 0; i < renderLights.length; i++) drawLightingBulb(renderLights[i], renderLights[i].id === activeLightId);
      debugState.renderStep = 'light-axes';
      drawLightingAxes();
      debugState.renderStep = 'habbo-debug-overlay';
      drawHabboDebugOverlay();
    } finally {
      adapterApi.__inDrawOverlayPasses = false;
    }
  }

  function drawHudPass(meta) {
    meta = meta || {};
    adapterApi.__inDrawHudPass = true;
    try {
      debugState.renderStep = 'hud';
      refreshInspectorPanels();
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.font = '14px sans-serif';
      var proto = currentProto();
      var modeLabel = editor.mode === 'view' ? '不编辑/拖动画面' : (editor.mode === 'delete' ? '删除物件' : '建立物件');
      var l = activeLight();
      ctx.fillText('一体化 Demo：房间编辑 + 多光源 + 人物代理体积阴影，可自由组合。', 18, 28);
      ctx.fillText('模式=' + modeLabel + '  当前=' + proto.name + ' ' + proto.w + '×' + proto.d + '×' + proto.h + ' / 体素' + proto.voxels.length + '  instances=' + instances.length + '  boxes=' + boxes.length + '  人物代理=' + settings.playerProxyW.toFixed(2) + '×' + settings.playerProxyD.toFixed(2) + '×' + settings.playerHeightCells.toFixed(2) + '  环境光=' + settings.ambient.toFixed(2) + '  选中=' + l.name + '(' + LIGHT_TYPE_LABELS[l.type] + ')', 18, 50);
      if (editor.preview) {
        var pb = editor.preview.box || null;
        var previewLabel = pb
          ? '预览: (' + pb.x + ', ' + pb.y + ', z=' + pb.z + ') valid=' + editor.preview.valid
          : '预览: box=null valid=' + editor.preview.valid + ' reason=' + (editor.preview.reason || 'n/a') + ' prefab=' + (editor.preview.prefabId || 'n/a') + ' origin=' + (editor.preview.origin ? '(' + editor.preview.origin.x + ',' + editor.preview.origin.y + ',' + editor.preview.origin.z + ')' : 'null') + ' boxes=' + (editor.preview.boxes ? editor.preview.boxes.length : 0);
        if (!pb && typeof detailLog === 'function') detailLog('[debug:hud-preview-null] ' + previewLabel);
        ctx.fillText(previewLabel, 18, 72);
      }
      if (showDebug) ctx.fillText((SHOW_PLAYER ? 'player=(' + player.x.toFixed(2) + ', ' + player.y.toFixed(2) + ') dir=' + player.dir + '  ' : '') + 'light=(' + l.x.toFixed(2) + ',' + l.y.toFixed(2) + ',' + l.z.toFixed(2) + ') angle=' + l.angle.toFixed(0) + ' pitch=' + l.pitch.toFixed(0), 18, 94);
      if (typeof shadowProbeState !== 'undefined' && shadowProbeState) {
        var probeLabel = shadowProbeState.activeMarker ? shadowProbeMarkerLabel(shadowProbeState.activeMarker) : 'none';
        ctx.fillText('阴影探针: M=标记模式 P=记录当前帧 N=清除  模式=' + (shadowProbeState.markMode ? 'ON' : 'OFF') + '  当前=' + probeLabel, 18, showDebug ? 116 : 94);
      }
    } finally {
      adapterApi.__inDrawHudPass = false;
    }
  }

  function resetInteractionPipelineCapture(meta) {
    adapterApi.__interactionPipelineCapture = {
      active: !!(meta && meta.active),
      interactionId: meta && meta.interactionId || null,
      interactionType: meta && meta.interactionType || null,
      frameIndex: Number(meta && meta.frameIndex || 0),
      callCount: 0,
      accumulatedMs: 0,
      maxSingleCallMs: 0,
      runFramePipelineWallMs: 0,
      activePreRunFramePipelineWallMs: 0,
      activePostRunFramePipelineWallMs: 0,
      activeWrapperGlueWallMs: 0,
      activeDebugHookWallMs: 0,
      activeDebugHookPreFlushWallMs: 0,
      activeDebugHookLogFlushWallMs: 0,
      activeDebugHookProfilerBookkeepingWallMs: 0,
      activeDebugHookRendererBookkeepingWallMs: 0,
      activeDebugHookCanvasSyncWallMs: 0,
      activeDebugHookBrowserSyncWallMs: 0,
      activeDebugHookPostFlushWallMs: 0,
      activeDebugHookResidualWallMs: 0,
      clearAndBackgroundMs: 0,
      clearAndBackgroundWallMs: 0,
      baseWorldPassesMs: 0,
      baseWorldPassesWallMs: 0,
      baseWorldPassesPreSetupWallMs: 0,
      baseWorldPassesPreSetupViewRotationWallMs: 0,
      baseWorldPassesPreSetupScopeWallMs: 0,
      baseWorldPassesPreSetupVisibleLightsWallMs: 0,
      baseWorldPassesPreSetupOverrideWallMs: 0,
      baseWorldPassesPreSetupResidualWallMs: 0,
      baseWorldPassesFloorLoopWallMs: 0,
      baseWorldPassesFloorProjectionWallMs: 0,
      baseWorldPassesFloorColorMaterialWallMs: 0,
      baseWorldPassesFloorCanvasDrawWallMs: 0,
      baseWorldPassesPlayerSpritePrepWallMs: 0,
      baseWorldPassesPostFinalizeWallMs: 0,
      baseWorldPassesResidualWallMs: 0,
      floorLayerReusedDuringInteractionCount: 0,
      floorLayerRebuildWallMs: 0,
      floorLayerBlitWallMs: 0,
      baseWorldActualBranch: null,
      buildFramePlanMs: 0,
      buildFramePlanWallMs: 0,
      drawRenderableOrderMs: 0,
      drawRenderableOrderWallMs: 0,
      drawOverlayPassesMs: 0,
      drawOverlayPassesWallMs: 0,
      drawHudPassMs: 0,
      drawHudPassWallMs: 0,
      prePassSetupMs: 0,
      prePassSetupWallMs: 0,
      postPassFinalizeMs: 0,
      postPassFinalizeWallMs: 0,
      adapterGlueMs: 0,
      debugHookMs: 0,
      knownAccountedMs: 0,
      unaccountedMs: 0,
      calls: []
    };
    return adapterApi.__interactionPipelineCapture;
  }

  function recordInteractionPipelineCall(pipelineBreakdown) {
    var capture = adapterApi.__interactionPipelineCapture;
    if (!capture || !capture.active || !pipelineBreakdown) return;
    capture.callCount += 1;
    capture.accumulatedMs += Number(pipelineBreakdown.totalPipelineMs || 0);
    capture.maxSingleCallMs = Math.max(capture.maxSingleCallMs || 0, Number(pipelineBreakdown.totalPipelineMs || 0));
    capture.runFramePipelineWallMs += Number(pipelineBreakdown.runFramePipelineWallMs || 0);
    capture.activePreRunFramePipelineWallMs += Number(pipelineBreakdown.activePreRunFramePipelineWallMs || 0);
    capture.activePostRunFramePipelineWallMs += Number(pipelineBreakdown.activePostRunFramePipelineWallMs || 0);
    capture.activeWrapperGlueWallMs += Number(pipelineBreakdown.activeWrapperGlueWallMs || 0);
    capture.activeDebugHookWallMs += Number(pipelineBreakdown.activeDebugHookWallMs || 0);
    capture.activeDebugHookPreFlushWallMs += Number(pipelineBreakdown.activeDebugHookPreFlushWallMs || 0);
    capture.activeDebugHookLogFlushWallMs += Number(pipelineBreakdown.activeDebugHookLogFlushWallMs || 0);
    capture.activeDebugHookProfilerBookkeepingWallMs += Number(pipelineBreakdown.activeDebugHookProfilerBookkeepingWallMs || 0);
    capture.activeDebugHookRendererBookkeepingWallMs += Number(pipelineBreakdown.activeDebugHookRendererBookkeepingWallMs || 0);
    capture.activeDebugHookCanvasSyncWallMs += Number(pipelineBreakdown.activeDebugHookCanvasSyncWallMs || 0);
    capture.activeDebugHookBrowserSyncWallMs += Number(pipelineBreakdown.activeDebugHookBrowserSyncWallMs || 0);
    capture.activeDebugHookPostFlushWallMs += Number(pipelineBreakdown.activeDebugHookPostFlushWallMs || 0);
    capture.activeDebugHookResidualWallMs += Number(pipelineBreakdown.activeDebugHookResidualWallMs || 0);
    capture.clearAndBackgroundMs += Number(pipelineBreakdown.clearAndBackgroundMs || 0);
    capture.clearAndBackgroundWallMs += Number(pipelineBreakdown.clearAndBackgroundWallMs || 0);
    capture.baseWorldPassesMs += Number(pipelineBreakdown.baseWorldPassesMs || 0);
    capture.baseWorldPassesWallMs += Number(pipelineBreakdown.baseWorldPassesWallMs || 0);
    capture.baseWorldPassesPreSetupWallMs += Number(pipelineBreakdown.baseWorldPassesPreSetupWallMs || 0);
    capture.baseWorldPassesPreSetupViewRotationWallMs += Number(pipelineBreakdown.baseWorldPassesPreSetupViewRotationWallMs || 0);
    capture.baseWorldPassesPreSetupScopeWallMs += Number(pipelineBreakdown.baseWorldPassesPreSetupScopeWallMs || 0);
    capture.baseWorldPassesPreSetupVisibleLightsWallMs += Number(pipelineBreakdown.baseWorldPassesPreSetupVisibleLightsWallMs || 0);
    capture.baseWorldPassesPreSetupOverrideWallMs += Number(pipelineBreakdown.baseWorldPassesPreSetupOverrideWallMs || 0);
    capture.baseWorldPassesPreSetupResidualWallMs += Number(pipelineBreakdown.baseWorldPassesPreSetupResidualWallMs || 0);
    capture.baseWorldPassesFloorLoopWallMs += Number(pipelineBreakdown.baseWorldPassesFloorLoopWallMs || 0);
    capture.baseWorldPassesFloorProjectionWallMs += Number(pipelineBreakdown.baseWorldPassesFloorProjectionWallMs || 0);
    capture.baseWorldPassesFloorColorMaterialWallMs += Number(pipelineBreakdown.baseWorldPassesFloorColorMaterialWallMs || 0);
    capture.baseWorldPassesFloorCanvasDrawWallMs += Number(pipelineBreakdown.baseWorldPassesFloorCanvasDrawWallMs || 0);
    capture.baseWorldPassesPlayerSpritePrepWallMs += Number(pipelineBreakdown.baseWorldPassesPlayerSpritePrepWallMs || 0);
    capture.baseWorldPassesPostFinalizeWallMs += Number(pipelineBreakdown.baseWorldPassesPostFinalizeWallMs || 0);
    capture.baseWorldPassesResidualWallMs += Number(pipelineBreakdown.baseWorldPassesResidualWallMs || 0);
    capture.floorLayerReusedDuringInteractionCount += pipelineBreakdown.floorLayerReusedDuringInteraction ? 1 : 0;
    capture.floorLayerRebuildWallMs += Number(pipelineBreakdown.floorLayerRebuildWallMs || 0);
    capture.floorLayerBlitWallMs += Number(pipelineBreakdown.floorLayerBlitWallMs || 0);
    if (pipelineBreakdown.baseWorldActualBranch) capture.baseWorldActualBranch = String(pipelineBreakdown.baseWorldActualBranch);
    capture.buildFramePlanMs += Number(pipelineBreakdown.buildFramePlanMs || 0);
    capture.buildFramePlanWallMs += Number(pipelineBreakdown.buildFramePlanWallMs || 0);
    capture.drawRenderableOrderMs += Number(pipelineBreakdown.drawRenderableOrderMs || 0);
    capture.drawRenderableOrderWallMs += Number(pipelineBreakdown.drawRenderableOrderWallMs || 0);
    capture.drawOverlayPassesMs += Number(pipelineBreakdown.drawOverlayPassesMs || 0);
    capture.drawOverlayPassesWallMs += Number(pipelineBreakdown.drawOverlayPassesWallMs || 0);
    capture.drawHudPassMs += Number(pipelineBreakdown.drawHudPassMs || 0);
    capture.drawHudPassWallMs += Number(pipelineBreakdown.drawHudPassWallMs || 0);
    capture.prePassSetupMs += Number(pipelineBreakdown.prePassSetupMs || 0);
    capture.prePassSetupWallMs += Number(pipelineBreakdown.prePassSetupWallMs || 0);
    capture.postPassFinalizeMs += Number(pipelineBreakdown.postPassFinalizeMs || 0);
    capture.postPassFinalizeWallMs += Number(pipelineBreakdown.postPassFinalizeWallMs || 0);
    capture.adapterGlueMs += Number(pipelineBreakdown.adapterGlueMs || 0);
    capture.debugHookMs += Number(pipelineBreakdown.debugHookMs || 0);
    capture.knownAccountedMs += Number(pipelineBreakdown.knownAccountedMs || 0);
    capture.unaccountedMs += Number(pipelineBreakdown.unaccountedMs || 0);
    if (capture.calls.length < 5) {
      capture.calls.push({
        callIndex: capture.callCount,
        totalMs: Number(pipelineBreakdown.totalPipelineMs || 0),
        runFramePipelineWallMs: Number(pipelineBreakdown.runFramePipelineWallMs || 0),
        activePreRunFramePipelineWallMs: Number(pipelineBreakdown.activePreRunFramePipelineWallMs || 0),
        activePostRunFramePipelineWallMs: Number(pipelineBreakdown.activePostRunFramePipelineWallMs || 0),
        activeWrapperGlueWallMs: Number(pipelineBreakdown.activeWrapperGlueWallMs || 0),
        activeDebugHookWallMs: Number(pipelineBreakdown.activeDebugHookWallMs || 0),
        activeDebugHookPreFlushWallMs: Number(pipelineBreakdown.activeDebugHookPreFlushWallMs || 0),
        activeDebugHookLogFlushWallMs: Number(pipelineBreakdown.activeDebugHookLogFlushWallMs || 0),
        activeDebugHookProfilerBookkeepingWallMs: Number(pipelineBreakdown.activeDebugHookProfilerBookkeepingWallMs || 0),
        activeDebugHookRendererBookkeepingWallMs: Number(pipelineBreakdown.activeDebugHookRendererBookkeepingWallMs || 0),
        activeDebugHookCanvasSyncWallMs: Number(pipelineBreakdown.activeDebugHookCanvasSyncWallMs || 0),
        activeDebugHookBrowserSyncWallMs: Number(pipelineBreakdown.activeDebugHookBrowserSyncWallMs || 0),
        activeDebugHookPostFlushWallMs: Number(pipelineBreakdown.activeDebugHookPostFlushWallMs || 0),
        activeDebugHookResidualWallMs: Number(pipelineBreakdown.activeDebugHookResidualWallMs || 0),
        clearAndBackgroundMs: Number(pipelineBreakdown.clearAndBackgroundMs || 0),
        clearAndBackgroundWallMs: Number(pipelineBreakdown.clearAndBackgroundWallMs || 0),
        baseWorldPassesMs: Number(pipelineBreakdown.baseWorldPassesMs || 0),
        baseWorldPassesWallMs: Number(pipelineBreakdown.baseWorldPassesWallMs || 0),
        baseWorldPassesPreSetupWallMs: Number(pipelineBreakdown.baseWorldPassesPreSetupWallMs || 0),
        baseWorldPassesPreSetupViewRotationWallMs: Number(pipelineBreakdown.baseWorldPassesPreSetupViewRotationWallMs || 0),
        baseWorldPassesPreSetupScopeWallMs: Number(pipelineBreakdown.baseWorldPassesPreSetupScopeWallMs || 0),
        baseWorldPassesPreSetupVisibleLightsWallMs: Number(pipelineBreakdown.baseWorldPassesPreSetupVisibleLightsWallMs || 0),
        baseWorldPassesPreSetupOverrideWallMs: Number(pipelineBreakdown.baseWorldPassesPreSetupOverrideWallMs || 0),
        baseWorldPassesPreSetupResidualWallMs: Number(pipelineBreakdown.baseWorldPassesPreSetupResidualWallMs || 0),
        baseWorldPassesFloorLoopWallMs: Number(pipelineBreakdown.baseWorldPassesFloorLoopWallMs || 0),
        baseWorldPassesFloorProjectionWallMs: Number(pipelineBreakdown.baseWorldPassesFloorProjectionWallMs || 0),
        baseWorldPassesFloorColorMaterialWallMs: Number(pipelineBreakdown.baseWorldPassesFloorColorMaterialWallMs || 0),
        baseWorldPassesFloorCanvasDrawWallMs: Number(pipelineBreakdown.baseWorldPassesFloorCanvasDrawWallMs || 0),
        baseWorldPassesPlayerSpritePrepWallMs: Number(pipelineBreakdown.baseWorldPassesPlayerSpritePrepWallMs || 0),
        baseWorldPassesPostFinalizeWallMs: Number(pipelineBreakdown.baseWorldPassesPostFinalizeWallMs || 0),
        baseWorldPassesResidualWallMs: Number(pipelineBreakdown.baseWorldPassesResidualWallMs || 0),
        floorLayerReusedDuringInteraction: !!pipelineBreakdown.floorLayerReusedDuringInteraction,
        floorLayerRebuildWallMs: Number(pipelineBreakdown.floorLayerRebuildWallMs || 0),
        floorLayerBlitWallMs: Number(pipelineBreakdown.floorLayerBlitWallMs || 0),
        baseWorldActualBranch: pipelineBreakdown.baseWorldActualBranch || null,
        buildFramePlanMs: Number(pipelineBreakdown.buildFramePlanMs || 0),
        buildFramePlanWallMs: Number(pipelineBreakdown.buildFramePlanWallMs || 0),
        drawRenderableOrderMs: Number(pipelineBreakdown.drawRenderableOrderMs || 0),
        drawRenderableOrderWallMs: Number(pipelineBreakdown.drawRenderableOrderWallMs || 0),
        drawOverlayPassesMs: Number(pipelineBreakdown.drawOverlayPassesMs || 0),
        drawOverlayPassesWallMs: Number(pipelineBreakdown.drawOverlayPassesWallMs || 0),
        drawHudPassMs: Number(pipelineBreakdown.drawHudPassMs || 0),
        drawHudPassWallMs: Number(pipelineBreakdown.drawHudPassWallMs || 0),
        prePassSetupMs: Number(pipelineBreakdown.prePassSetupMs || 0),
        prePassSetupWallMs: Number(pipelineBreakdown.prePassSetupWallMs || 0),
        postPassFinalizeMs: Number(pipelineBreakdown.postPassFinalizeMs || 0),
        postPassFinalizeWallMs: Number(pipelineBreakdown.postPassFinalizeWallMs || 0),
        adapterGlueMs: Number(pipelineBreakdown.adapterGlueMs || 0),
        debugHookMs: Number(pipelineBreakdown.debugHookMs || 0),
        unaccountedMs: Number(pipelineBreakdown.unaccountedMs || 0)
      });
    }
  }

  function consumeInteractionPipelineCapture() {
    var capture = adapterApi.__interactionPipelineCapture;
    if (!capture || !capture.active) return null;
    var result = {
      interactionId: capture.interactionId,
      interactionType: capture.interactionType,
      frameIndex: Number(capture.frameIndex || 0),
      renderPipelineCallCount: Number(capture.callCount || 0),
      renderPipelineAccumulatedMs: safeFixed(capture.accumulatedMs || 0),
      renderPipelineMaxSingleCallMs: safeFixed(capture.maxSingleCallMs || 0),
      runFramePipelineWallMs: safeFixed(capture.runFramePipelineWallMs || 0),
      activePreRunFramePipelineWallMs: safeFixed(capture.activePreRunFramePipelineWallMs || 0),
      activePostRunFramePipelineWallMs: safeFixed(capture.activePostRunFramePipelineWallMs || 0),
      activeWrapperGlueWallMs: safeFixed(capture.activeWrapperGlueWallMs || 0),
      activeDebugHookWallMs: safeFixed(capture.activeDebugHookWallMs || 0),
      activeDebugHookPreFlushWallMs: safeFixed(capture.activeDebugHookPreFlushWallMs || 0),
      activeDebugHookLogFlushWallMs: safeFixed(capture.activeDebugHookLogFlushWallMs || 0),
      activeDebugHookProfilerBookkeepingWallMs: safeFixed(capture.activeDebugHookProfilerBookkeepingWallMs || 0),
      activeDebugHookRendererBookkeepingWallMs: safeFixed(capture.activeDebugHookRendererBookkeepingWallMs || 0),
      activeDebugHookCanvasSyncWallMs: safeFixed(capture.activeDebugHookCanvasSyncWallMs || 0),
      activeDebugHookBrowserSyncWallMs: safeFixed(capture.activeDebugHookBrowserSyncWallMs || 0),
      activeDebugHookPostFlushWallMs: safeFixed(capture.activeDebugHookPostFlushWallMs || 0),
      activeDebugHookResidualWallMs: safeFixed(capture.activeDebugHookResidualWallMs || 0),
      pipelineKnownAccountedMs: safeFixed(capture.knownAccountedMs || 0),
      pipelineUnaccountedMs: safeFixed(capture.unaccountedMs || 0),
      pipelineClearAndBackgroundMs: safeFixed(capture.clearAndBackgroundMs || 0),
      pipelineClearAndBackgroundWallMs: safeFixed(capture.clearAndBackgroundWallMs || 0),
      pipelineBaseWorldPassesMs: safeFixed(capture.baseWorldPassesMs || 0),
      pipelineBaseWorldPassesWallMs: safeFixed(capture.baseWorldPassesWallMs || 0),
      baseWorldPassesWallMs: safeFixed(capture.baseWorldPassesWallMs || 0),
      baseWorldPassesPreSetupWallMs: safeFixed(capture.baseWorldPassesPreSetupWallMs || 0),
      baseWorldPassesPreSetupViewRotationWallMs: safeFixed(capture.baseWorldPassesPreSetupViewRotationWallMs || 0),
      baseWorldPassesPreSetupScopeWallMs: safeFixed(capture.baseWorldPassesPreSetupScopeWallMs || 0),
      baseWorldPassesPreSetupVisibleLightsWallMs: safeFixed(capture.baseWorldPassesPreSetupVisibleLightsWallMs || 0),
      baseWorldPassesPreSetupOverrideWallMs: safeFixed(capture.baseWorldPassesPreSetupOverrideWallMs || 0),
      baseWorldPassesPreSetupResidualWallMs: safeFixed(capture.baseWorldPassesPreSetupResidualWallMs || 0),
      baseWorldPassesFloorLoopWallMs: safeFixed(capture.baseWorldPassesFloorLoopWallMs || 0),
      baseWorldPassesFloorProjectionWallMs: safeFixed(capture.baseWorldPassesFloorProjectionWallMs || 0),
      baseWorldPassesFloorColorMaterialWallMs: safeFixed(capture.baseWorldPassesFloorColorMaterialWallMs || 0),
      baseWorldPassesFloorCanvasDrawWallMs: safeFixed(capture.baseWorldPassesFloorCanvasDrawWallMs || 0),
      baseWorldPassesPlayerSpritePrepWallMs: safeFixed(capture.baseWorldPassesPlayerSpritePrepWallMs || 0),
      baseWorldPassesPostFinalizeWallMs: safeFixed(capture.baseWorldPassesPostFinalizeWallMs || 0),
      baseWorldPassesResidualWallMs: safeFixed(capture.baseWorldPassesResidualWallMs || 0),
      floorLayerReusedDuringInteractionCount: Number(capture.floorLayerReusedDuringInteractionCount || 0),
      floorLayerRebuildWallMs: safeFixed(capture.floorLayerRebuildWallMs || 0),
      floorLayerBlitWallMs: safeFixed(capture.floorLayerBlitWallMs || 0),
      baseWorldActualBranch: capture.baseWorldActualBranch || null,
      pipelineBuildFramePlanMs: safeFixed(capture.buildFramePlanMs || 0),
      pipelineBuildFramePlanWallMs: safeFixed(capture.buildFramePlanWallMs || 0),
      pipelineDrawRenderableOrderMs: safeFixed(capture.drawRenderableOrderMs || 0),
      pipelineDrawRenderableOrderWallMs: safeFixed(capture.drawRenderableOrderWallMs || 0),
      pipelineDrawOverlayPassesMs: safeFixed(capture.drawOverlayPassesMs || 0),
      pipelineDrawOverlayPassesWallMs: safeFixed(capture.drawOverlayPassesWallMs || 0),
      pipelineDrawHudPassMs: safeFixed(capture.drawHudPassMs || 0),
      pipelineDrawHudPassWallMs: safeFixed(capture.drawHudPassWallMs || 0),
      pipelinePrePassSetupMs: safeFixed(capture.prePassSetupMs || 0),
      pipelinePrePassSetupWallMs: safeFixed(capture.prePassSetupWallMs || 0),
      pipelinePostPassFinalizeMs: safeFixed(capture.postPassFinalizeMs || 0),
      pipelinePostPassFinalizeWallMs: safeFixed(capture.postPassFinalizeWallMs || 0),
      pipelineAdapterGlueMs: safeFixed(capture.adapterGlueMs || 0),
      pipelineDebugHookMs: safeFixed(capture.debugHookMs || 0),
      calls: capture.calls.slice(0)
    };
    resetInteractionPipelineCapture({ active: false });
    return result;
  }

  function runFramePipeline(passApi, renderablesApi) {
    var pipelineCallStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    var pipelineStartAt = pipelineCallStartAt;
    beginFunctionBreakdownFrame();
    var prePassSetupMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - pipelineStartAt);
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
    var drawOverlayPassesMs = 0;
    var drawOverlayPassesWallMs = 0;
    var drawHudPassMs = 0;
    var drawHudPassWallMs = 0;
    var postPassFinalizeMs = 0;
    var postPassFinalizeWallMs = 0;
    var debugHookMs = 0;
    var adapterGlueMs = 0;
    var framePlan = null;
    var zoomPreviewFastPathPayload = drawZoomPreviewFastPath({ source: 'renderer.canvas2d:runFramePipeline' });
    var functionBreakdown = getFunctionBreakdownFrame();
    if (zoomPreviewFastPathPayload) {
      clearAndBackgroundMs = Number(zoomPreviewFastPathPayload.drawMs || 0);
      clearAndBackgroundWallMs = clearAndBackgroundMs;
      if (functionBreakdown) {
        functionBreakdown.timings['adapter.runFramePipeline.prePassSetup'] = safeFixed(prePassSetupMs);
        functionBreakdown.timings['adapter.runFramePipeline.zoomPreviewFastPath'] = safeFixed(clearAndBackgroundMs);
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
      var t0 = (typeof perfNow === 'function') ? perfNow() : Date.now();
      passApi.clearAndPaintMainBackground();
      clearAndBackgroundWallMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - t0);
      clearAndBackgroundMs = clearAndBackgroundWallMs;
      if (functionBreakdown) {
        functionBreakdown.timings['adapter.runFramePipeline.prePassSetup'] = safeFixed(prePassSetupMs);
        functionBreakdown.timings['adapter.runFramePipeline.clearAndPaintMainBackground'] = safeFixed(clearAndBackgroundMs);
      }
    }
    var runWorldPasses = function () {
      var worldPassStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
      passApi.renderBaseWorldPasses();
      baseWorldPassesWallMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - worldPassStartAt);
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
      var functionBreakdown = getFunctionBreakdownFrame();
      if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.renderBaseWorldPasses'] = safeFixed(baseWorldPassesMs);
      var buildPlanStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
      framePlan = renderablesApi && typeof renderablesApi.buildFramePlan === 'function'
        ? renderablesApi.buildFramePlan()
        : { order: passApi.buildMainFrameRenderables() };
      buildFramePlanWallMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - buildPlanStartAt);
      buildFramePlanMs = buildFramePlanWallMs;
      if (functionBreakdown) {
        functionBreakdown.timings['adapter.runFramePipeline.buildFramePlan'] = safeFixed(buildFramePlanMs);
        functionBreakdown.extras.framePlanId = framePlan && framePlan.id ? framePlan.id : null;
        functionBreakdown.extras.frameRenderableCount = Number(framePlan && framePlan.order ? framePlan.order.length : 0);
      }
      var drawLoopStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
      drawRenderableOrder(framePlan.order || [], { source: 'renderer.canvas2d:drawRenderableOrder', framePlanId: framePlan.id || null, currentViewRotation: framePlan.currentViewRotation != null ? framePlan.currentViewRotation : 0 });
      drawRenderableOrderWallMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - drawLoopStartAt);
      drawRenderableOrderMs = drawRenderableOrderWallMs;
      if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.drawRenderableOrder'] = safeFixed(drawRenderableOrderMs);
      var overlayStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
      drawOverlayPasses({ source: 'renderer.canvas2d:drawOverlayPasses' });
      drawOverlayPassesWallMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - overlayStartAt);
      drawOverlayPassesMs = drawOverlayPassesWallMs;
      if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.drawOverlayPasses'] = safeFixed(drawOverlayPassesMs);
    };
    if (!zoomPreviewFastPathPayload) {
      if (typeof applyMainCameraWorldTransform === 'function') applyMainCameraWorldTransform(ctx, runWorldPasses);
      else runWorldPasses();
      var hudStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
      drawHudPass({ source: 'renderer.canvas2d:drawHudPass' });
      drawHudPassWallMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - hudStartAt);
      drawHudPassMs = drawHudPassWallMs;
      functionBreakdown = getFunctionBreakdownFrame();
      if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.drawHudPass'] = safeFixed(drawHudPassMs);
    }
    var postFinalizeStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    postPassFinalizeMs = 0;
    postPassFinalizeWallMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - postFinalizeStartAt);
    var totalPipelineMs = Math.max(0, postFinalizeStartAt - pipelineStartAt);
    functionBreakdown = getFunctionBreakdownFrame();
    if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.postPassFinalize'] = safeFixed(postPassFinalizeMs);
    var pipelineBreakdown = {
      source: 'renderer.canvas2d:runFramePipeline',
      clearAndBackgroundMs: safeFixed(clearAndBackgroundMs),
      clearAndBackgroundWallMs: safeFixed(clearAndBackgroundWallMs),
      baseWorldPassesMs: safeFixed(baseWorldPassesMs),
      baseWorldPassesWallMs: safeFixed(baseWorldPassesWallMs),
      baseWorldPassesPreSetupWallMs: safeFixed(baseWorldPassesPreSetupWallMs),
      baseWorldPassesPreSetupViewRotationWallMs: safeFixed(baseWorldPassesPreSetupViewRotationWallMs),
      baseWorldPassesPreSetupScopeWallMs: safeFixed(baseWorldPassesPreSetupScopeWallMs),
      baseWorldPassesPreSetupVisibleLightsWallMs: safeFixed(baseWorldPassesPreSetupVisibleLightsWallMs),
      baseWorldPassesPreSetupOverrideWallMs: safeFixed(baseWorldPassesPreSetupOverrideWallMs),
      baseWorldPassesPreSetupResidualWallMs: safeFixed(baseWorldPassesPreSetupResidualWallMs),
      baseWorldPassesFloorLoopWallMs: safeFixed(baseWorldPassesFloorLoopWallMs),
      baseWorldPassesFloorProjectionWallMs: safeFixed(baseWorldPassesFloorProjectionWallMs),
      baseWorldPassesFloorColorMaterialWallMs: safeFixed(baseWorldPassesFloorColorMaterialWallMs),
      baseWorldPassesFloorCanvasDrawWallMs: safeFixed(baseWorldPassesFloorCanvasDrawWallMs),
      baseWorldPassesPlayerSpritePrepWallMs: safeFixed(baseWorldPassesPlayerSpritePrepWallMs),
      baseWorldPassesPostFinalizeWallMs: safeFixed(baseWorldPassesPostFinalizeWallMs),
      baseWorldPassesResidualWallMs: safeFixed(baseWorldPassesResidualWallMs),
      floorLayerReusedDuringInteraction: !!floorLayerReusedDuringInteraction,
      floorLayerRebuildWallMs: safeFixed(floorLayerRebuildWallMs),
      floorLayerBlitWallMs: safeFixed(floorLayerBlitWallMs),
      baseWorldActualBranch: baseWorldActualBranch || null,
      buildFramePlanMs: safeFixed(buildFramePlanMs),
      buildFramePlanWallMs: safeFixed(buildFramePlanWallMs),
      drawRenderableOrderMs: safeFixed(drawRenderableOrderMs),
      drawRenderableOrderWallMs: safeFixed(drawRenderableOrderWallMs),
      drawOverlayPassesMs: safeFixed(drawOverlayPassesMs),
      drawOverlayPassesWallMs: safeFixed(drawOverlayPassesWallMs),
      drawHudPassMs: safeFixed(drawHudPassMs),
      drawHudPassWallMs: safeFixed(drawHudPassWallMs),
      prePassSetupMs: safeFixed(prePassSetupMs),
      prePassSetupWallMs: safeFixed(prePassSetupWallMs),
      postPassFinalizeMs: safeFixed(postPassFinalizeMs),
      postPassFinalizeWallMs: safeFixed(postPassFinalizeWallMs),
      renderableCount: Number(framePlan && framePlan.order ? framePlan.order.length : 0),
      framePlanId: framePlan && framePlan.id ? framePlan.id : null,
      zoomPreviewFastPathUsed: !!zoomPreviewFastPathPayload,
      zoomPreviewDrawMs: safeFixed(zoomPreviewFastPathPayload && zoomPreviewFastPathPayload.drawMs || 0),
      zoomPreviewScaleRatio: safeFixed(zoomPreviewFastPathPayload && zoomPreviewFastPathPayload.scaleRatio || 1)
    };
    var debugStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    if (functionBreakdown) functionBreakdown.timings['adapter.runFramePipeline.total'] = safeFixed(totalPipelineMs);
    adapterApi.__lastPipelineBreakdown = Object.assign({}, pipelineBreakdown, { totalPipelineMs: safeFixed(totalPipelineMs), adapterGlueMs: 0, debugHookMs: 0, knownAccountedMs: 0, unaccountedMs: 0 });
    var shouldEmit = shouldEmitProfile('pipelineBreakdown', [
      Number(pipelineBreakdown.renderableCount || 0),
      Number(totalPipelineMs || 0).toFixed(1),
      Number(pipelineBreakdown.drawRenderableOrderMs || 0).toFixed(1)
    ].join('|'), 250);
    if (shouldEmit) {
      emitRendererProfile('CANVAS2D-PIPELINE-BREAKDOWN', Object.assign({}, pipelineBreakdown, { totalPipelineMs: safeFixed(totalPipelineMs), adapterGlueMs: 0, debugHookMs: 0, knownAccountedMs: 0, unaccountedMs: 0 }));
      var functionBreakdownPayload = getFunctionBreakdownFrame();
      if (functionBreakdownPayload) {
        emitRendererProfile('RENDER-FUNCTION-BREAKDOWN', {
          source: 'renderer.canvas2d:runFramePipeline',
          framePlanId: functionBreakdownPayload.extras && functionBreakdownPayload.extras.framePlanId || null,
          frameRenderableCount: functionBreakdownPayload.extras && functionBreakdownPayload.extras.frameRenderableCount || 0,
          timings: cloneSimpleObject(functionBreakdownPayload.timings),
          counts: cloneSimpleObject(functionBreakdownPayload.counts),
          extras: cloneSimpleObject(functionBreakdownPayload.extras)
        });
      }
    }
    debugHookMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - debugStartAt);
    totalPipelineMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - pipelineStartAt);
    var knownWithoutGlue = prePassSetupMs + clearAndBackgroundMs + baseWorldPassesMs + buildFramePlanMs + drawRenderableOrderMs + drawOverlayPassesMs + drawHudPassMs + postPassFinalizeMs + debugHookMs;
    adapterGlueMs = Math.max(0, totalPipelineMs - knownWithoutGlue);
    var knownAccountedMs = knownWithoutGlue + adapterGlueMs;
    var unaccountedMs = Math.max(0, totalPipelineMs - knownAccountedMs);
    if (functionBreakdown) {
      functionBreakdown.timings['adapter.runFramePipeline.debugHook'] = safeFixed(debugHookMs);
      functionBreakdown.timings['adapter.runFramePipeline.adapterGlue'] = safeFixed(adapterGlueMs);
      functionBreakdown.timings['adapter.runFramePipeline.total'] = safeFixed(totalPipelineMs);
    }
    var runFramePipelineWallMs = Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - pipelineCallStartAt);
    pipelineBreakdown = Object.assign({}, pipelineBreakdown, {
      totalPipelineMs: safeFixed(totalPipelineMs),
      runFramePipelineWallMs: safeFixed(runFramePipelineWallMs),
      debugHookMs: safeFixed(debugHookMs),
      adapterGlueMs: safeFixed(adapterGlueMs),
      knownAccountedMs: safeFixed(knownAccountedMs),
      unaccountedMs: safeFixed(unaccountedMs)
    });
    adapterApi.__lastPipelineBreakdown = pipelineBreakdown;
    recordInteractionPipelineCall(pipelineBreakdown);
    return framePlan || { order: [] };
  }

  function renderFrame(meta) {
    meta = meta || {};
    var activeCallStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
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
    var passApi = resolvePassApi();
    var renderablesApi = resolveRenderablesApi();
    if (!passApi) throw new Error('renderer.passApi missing for canvas2d renderer');
    adapterApi.__inRenderFrame = true;
    try {
      setPhase('render', 'start');
      if (debugState.firstFrameAt == null) debugState.firstFrameAt = performance.now();
      if (typeof beginRenderFrameDebug === 'function') {
        var __activeDebugStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
        var __activeDebugPreAt = __activeDebugStartAt;
        var __activeDebugPayloadStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
        var __debugPayload = {
          canvasCss: { w: VIEW_W, h: VIEW_H },
          backing: { w: canvas.width, h: canvas.height },
          boxes: boxes.length,
          lights: lights.length,
          assetsReady: !!assetsReady,
          source: meta.source || 'unknown'
        };
        var __activeDebugPayloadEndAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
        activeDebugHookPreFlushWallMs += Math.max(0, __activeDebugPayloadEndAt - __activeDebugPreAt);
        var __activeDebugFlushStartAt = __activeDebugPayloadEndAt;
        beginRenderFrameDebug('renderer.canvas2d:renderFrame', __debugPayload);
        var __activeDebugFlushEndAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
        activeDebugHookLogFlushWallMs += Math.max(0, __activeDebugFlushEndAt - __activeDebugFlushStartAt);
        var __activeDebugProfilerStartAt = __activeDebugFlushEndAt;
        if (adapterApi && adapterApi.__interactionPipelineCapture && adapterApi.__interactionPipelineCapture.active) {
          adapterApi.__lastActiveDebugInteractionMeta = {
            interactionId: adapterApi.__interactionPipelineCapture.interactionId || null,
            interactionType: adapterApi.__interactionPipelineCapture.interactionType || null,
            frameIndex: Number(adapterApi.__interactionPipelineCapture.frameIndex || 0)
          };
        }
        var __activeDebugProfilerEndAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
        activeDebugHookProfilerBookkeepingWallMs += Math.max(0, __activeDebugProfilerEndAt - __activeDebugProfilerStartAt);
        var __activeDebugRendererBookkeepingStartAt = __activeDebugProfilerEndAt;
        if (adapterApi) adapterApi.__lastActiveDebugPhase = 'beginRenderFrameDebug';
        var __activeDebugRendererBookkeepingEndAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
        activeDebugHookRendererBookkeepingWallMs += Math.max(0, __activeDebugRendererBookkeepingEndAt - __activeDebugRendererBookkeepingStartAt);
        var __activeDebugCanvasSyncStartAt = __activeDebugRendererBookkeepingEndAt;
        var __activeDebugCanvasSyncEndAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
        activeDebugHookCanvasSyncWallMs += Math.max(0, __activeDebugCanvasSyncEndAt - __activeDebugCanvasSyncStartAt);
        var __activeDebugBrowserSyncStartAt = __activeDebugCanvasSyncEndAt;
        var __activeDebugBrowserSyncEndAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
        activeDebugHookBrowserSyncWallMs += Math.max(0, __activeDebugBrowserSyncEndAt - __activeDebugBrowserSyncStartAt);
        var __activeDebugPostFlushStartAt = __activeDebugBrowserSyncEndAt;
        var __activeDebugPostFlushEndAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
        activeDebugHookPostFlushWallMs += Math.max(0, __activeDebugPostFlushEndAt - __activeDebugPostFlushStartAt);
        activeDebugHookWallMs += Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - __activeDebugStartAt);
        var __activeDebugKnown = activeDebugHookPreFlushWallMs + activeDebugHookLogFlushWallMs + activeDebugHookProfilerBookkeepingWallMs + activeDebugHookRendererBookkeepingWallMs + activeDebugHookCanvasSyncWallMs + activeDebugHookBrowserSyncWallMs + activeDebugHookPostFlushWallMs;
        activeDebugHookResidualWallMs += Math.max(0, activeDebugHookWallMs - __activeDebugKnown);
      }
      if (debugState.frame < 5 || verboseLog) {
        detailLog('renderer-adapter:start frame=' + debugState.frame + ' source=' + String(meta.source || 'unknown') + ' canvasCss=' + VIEW_W + 'x' + VIEW_H + ' backing=' + canvas.width + 'x' + canvas.height);
      }
      var __beforeRunPipelineAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
      activePreRunFramePipelineWallMs = Math.max(0, __beforeRunPipelineAt - preMeasureStartAt - activeDebugHookWallMs);
      var __runFramePipelineStartAt = __beforeRunPipelineAt;
      var framePlan = runFramePipeline(passApi, renderablesApi);
      var __afterRunPipelineAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
      runFramePipelineWallMs = Math.max(0, __afterRunPipelineAt - __runFramePipelineStartAt);
      postMeasureStartAt = __afterRunPipelineAt;
      debugState.renderStep = 'done';
      if (debugState.frame < 5 || verboseLog) {
        var renderableCount = framePlan && framePlan.order ? framePlan.order.length : 0;
        detailLog('renderer-adapter:done frame=' + debugState.frame + ' renderables=' + renderableCount);
      }
      return framePlan;
    } finally {
      var __activeCallEndAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
      if (postMeasureStartAt > 0) activePostRunFramePipelineWallMs = Math.max(0, __activeCallEndAt - postMeasureStartAt);
      var rendererActiveCallWallMs = Math.max(0, __activeCallEndAt - activeCallStartAt);
      activeWrapperGlueWallMs = Math.max(0, rendererActiveCallWallMs - runFramePipelineWallMs - activePreRunFramePipelineWallMs - activePostRunFramePipelineWallMs - activeDebugHookWallMs);
      adapterApi.__lastActiveBreakdown = {
        source: 'renderer.canvas2d:renderFrame',
        rendererActiveCallWallMs: safeFixed(rendererActiveCallWallMs),
        runFramePipelineWallMs: safeFixed(runFramePipelineWallMs),
        activePreRunFramePipelineWallMs: safeFixed(activePreRunFramePipelineWallMs),
        activePostRunFramePipelineWallMs: safeFixed(activePostRunFramePipelineWallMs),
        activeWrapperGlueWallMs: safeFixed(activeWrapperGlueWallMs),
        activeDebugHookWallMs: safeFixed(activeDebugHookWallMs),
        activeDebugHookPreFlushWallMs: safeFixed(activeDebugHookPreFlushWallMs),
        activeDebugHookLogFlushWallMs: safeFixed(activeDebugHookLogFlushWallMs),
        activeDebugHookProfilerBookkeepingWallMs: safeFixed(activeDebugHookProfilerBookkeepingWallMs),
        activeDebugHookRendererBookkeepingWallMs: safeFixed(activeDebugHookRendererBookkeepingWallMs),
        activeDebugHookCanvasSyncWallMs: safeFixed(activeDebugHookCanvasSyncWallMs),
        activeDebugHookBrowserSyncWallMs: safeFixed(activeDebugHookBrowserSyncWallMs),
        activeDebugHookPostFlushWallMs: safeFixed(activeDebugHookPostFlushWallMs),
        activeDebugHookResidualWallMs: safeFixed(activeDebugHookResidualWallMs)
      };
      var capture = adapterApi.__interactionPipelineCapture;
      if (capture && capture.active) {
        capture.activePreRunFramePipelineWallMs += Number(activePreRunFramePipelineWallMs || 0);
        capture.activePostRunFramePipelineWallMs += Number(activePostRunFramePipelineWallMs || 0);
        capture.activeWrapperGlueWallMs += Number(activeWrapperGlueWallMs || 0);
        capture.activeDebugHookWallMs += Number(activeDebugHookWallMs || 0);
        capture.activeDebugHookPreFlushWallMs += Number(activeDebugHookPreFlushWallMs || 0);
        capture.activeDebugHookLogFlushWallMs += Number(activeDebugHookLogFlushWallMs || 0);
        capture.activeDebugHookProfilerBookkeepingWallMs += Number(activeDebugHookProfilerBookkeepingWallMs || 0);
        capture.activeDebugHookRendererBookkeepingWallMs += Number(activeDebugHookRendererBookkeepingWallMs || 0);
        capture.activeDebugHookCanvasSyncWallMs += Number(activeDebugHookCanvasSyncWallMs || 0);
        capture.activeDebugHookBrowserSyncWallMs += Number(activeDebugHookBrowserSyncWallMs || 0);
        capture.activeDebugHookPostFlushWallMs += Number(activeDebugHookPostFlushWallMs || 0);
        capture.activeDebugHookResidualWallMs += Number(activeDebugHookResidualWallMs || 0);
        if (capture.calls.length > 0) {
          var lastCall = capture.calls[capture.calls.length - 1];
          if (lastCall && Number(lastCall.callIndex || 0) === Number(capture.callCount || 0)) {
            lastCall.activePreRunFramePipelineWallMs = Number(activePreRunFramePipelineWallMs || 0);
            lastCall.activePostRunFramePipelineWallMs = Number(activePostRunFramePipelineWallMs || 0);
            lastCall.activeWrapperGlueWallMs = Number(activeWrapperGlueWallMs || 0);
            lastCall.activeDebugHookWallMs = Number(activeDebugHookWallMs || 0);
            lastCall.activeDebugHookPreFlushWallMs = Number(activeDebugHookPreFlushWallMs || 0);
            lastCall.activeDebugHookLogFlushWallMs = Number(activeDebugHookLogFlushWallMs || 0);
            lastCall.activeDebugHookProfilerBookkeepingWallMs = Number(activeDebugHookProfilerBookkeepingWallMs || 0);
            lastCall.activeDebugHookRendererBookkeepingWallMs = Number(activeDebugHookRendererBookkeepingWallMs || 0);
            lastCall.activeDebugHookCanvasSyncWallMs = Number(activeDebugHookCanvasSyncWallMs || 0);
            lastCall.activeDebugHookBrowserSyncWallMs = Number(activeDebugHookBrowserSyncWallMs || 0);
            lastCall.activeDebugHookPostFlushWallMs = Number(activeDebugHookPostFlushWallMs || 0);
            lastCall.activeDebugHookResidualWallMs = Number(activeDebugHookResidualWallMs || 0);
          }
        }
      }
      adapterApi.__inRenderFrame = false;
    }
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
