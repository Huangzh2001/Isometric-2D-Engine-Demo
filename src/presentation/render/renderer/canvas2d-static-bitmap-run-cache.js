(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/presentation/render/renderer/canvas2d-static-bitmap-run-cache.js';
  var PHASE = 'P11c-3';

  function nowMs(deps) {
    if (deps && typeof deps.now === 'function') return deps.now();
    try { if (window.performance && typeof window.performance.now === 'function') return window.performance.now(); } catch (_) {}
    return Date.now();
  }

  function getStaticBitmapCache(adapterApi) {
    if (!adapterApi) throw new Error('Missing Canvas2D adapter API for static bitmap run cache');
    adapterApi.__staticBitmapCache = adapterApi.__staticBitmapCache || new Map();
    return adapterApi.__staticBitmapCache;
  }

  function getStaticBitmapReuseCache(adapterApi) {
    if (!adapterApi) throw new Error('Missing Canvas2D adapter API for static bitmap run cache');
    adapterApi.__staticBitmapReuseCache = adapterApi.__staticBitmapReuseCache || new Map();
    return adapterApi.__staticBitmapReuseCache;
  }

  function getActiveCameraInteractionType(deps) {
    try {
      return deps && typeof deps.getActiveCameraInteractionType === 'function'
        ? deps.getActiveCameraInteractionType()
        : null;
    } catch (_) {
      return null;
    }
  }

  function getActiveCameraInteractionId(deps) {
    try {
      return deps && typeof deps.getActiveCameraInteractionId === 'function'
        ? deps.getActiveCameraInteractionId()
        : null;
    } catch (_) {
      return null;
    }
  }

  function getCameraSettleReuseState(deps) {
    try {
      return deps && typeof deps.getCameraSettleReuseState === 'function'
        ? deps.getCameraSettleReuseState()
        : null;
    } catch (_) {
      return null;
    }
  }

  function getSettings(deps) {
    try {
      return deps && typeof deps.getSettings === 'function' ? (deps.getSettings() || {}) : {};
    } catch (_) {
      return {};
    }
  }

  function getCamera(deps) {
    try {
      return deps && typeof deps.getCamera === 'function' ? (deps.getCamera() || {}) : {};
    } catch (_) {
      return {};
    }
  }

  function safeFixed(deps, value) {
    if (deps && typeof deps.safeFixed === 'function') return deps.safeFixed(value);
    var n = Number(value || 0);
    return Number(n.toFixed ? n.toFixed(3) : n);
  }

  function shouldUseDeferredZoomSettleReuse(deps) {
    var settleState = getCameraSettleReuseState(deps);
    if (!settleState || String(settleState.lastEndedType || '') !== 'zoom') return false;
    var now = nowMs(deps);
    if (Number(settleState.deferCommitUntilMs || 0) <= now) return false;
    var activeType = getActiveCameraInteractionType(deps);
    return !activeType || activeType === 'drag' || activeType === 'pan' || activeType === 'pinch';
  }

  function getStaticBitmapInteractionState(adapterApi, deps) {
    if (!adapterApi) throw new Error('Missing Canvas2D adapter API for static bitmap interaction state');
    adapterApi.__staticBitmapInteractionState = adapterApi.__staticBitmapInteractionState || {
      interactionId: null,
      interactionType: null,
      runSlots: new Map()
    };
    var state = adapterApi.__staticBitmapInteractionState;
    var interactionId = getActiveCameraInteractionId(deps);
    var interactionType = getActiveCameraInteractionType(deps);
    if (!interactionId || interactionType !== 'zoom') {
      if (shouldUseDeferredZoomSettleReuse(deps)) return state;
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

  function getTerrainBoundaryDebugSignature(deps) {
    try {
      return deps && typeof deps.getTerrainBoundaryDebugSignature === 'function'
        ? deps.getTerrainBoundaryDebugSignature()
        : 'boundary-debug-red:0';
    } catch (_) {
      return 'boundary-debug-red:0';
    }
  }

  function buildStaticPacketRunInteractionSlotKey(meta, deps) {
    meta = meta || {};
    return [
      'runslot',
      String(meta.currentViewRotation || 0),
      String(meta.runStartIndex || 0),
      getTerrainBoundaryDebugSignature(deps)
    ].join('|');
  }

  function registerStaticPacketRunInteractionSlotEntry(adapterApi, deps, meta, entry) {
    if (!entry) return entry;
    var state = getStaticBitmapInteractionState(adapterApi, deps);
    if (!state || state.interactionType !== 'zoom') return entry;
    state.runSlots.set(buildStaticPacketRunInteractionSlotKey(meta, deps), entry);
    return entry;
  }

  function findStaticPacketRunInteractionSlotEntry(adapterApi, deps, meta) {
    var state = getStaticBitmapInteractionState(adapterApi, deps);
    if (!state || state.interactionType !== 'zoom') return null;
    return state.runSlots.get(buildStaticPacketRunInteractionSlotKey(meta, deps)) || null;
  }

  function shouldUseStaticBitmapRunInteractionReuse(deps, meta) {
    meta = meta || {};
    if (meta.allowInteractionReuse === false) return false;
    return getActiveCameraInteractionType(deps) === 'zoom' || shouldUseDeferredZoomSettleReuse(deps);
  }

  function pruneStaticBitmapCache(adapterApi, maxEntries) {
    var cache = getStaticBitmapCache(adapterApi);
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

  function mixHashString(hash, value) {
    var str = String(value == null ? '' : value);
    var out = Number(hash >>> 0);
    for (var i = 0; i < str.length; i++) {
      out ^= str.charCodeAt(i);
      out = Math.imul(out, 16777619) >>> 0;
    }
    return out >>> 0;
  }

  function buildStaticPacketRunReuseKey(packets, meta, deps) {
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
      hash = mixHashString(hash, Array.isArray(packet && packet.terrainBoundarySegmentsWorld) ? packet.terrainBoundarySegmentsWorld.length : 0);
      hash = mixHashString(hash, Number(packet && packet.terrainBoundaryStrokeWidth || 0));
      hash = mixHashString(hash, String(packet && packet.terrainBoundaryStroke || ''));
      hash = mixHashString(hash, getTerrainBoundaryDebugSignature(deps));
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

  function buildStaticPacketRunBitmapSignature(packets, meta, deps) {
    var settings = getSettings(deps);
    return [
      buildStaticPacketRunReuseKey(packets, meta, deps),
      String(Number(settings.tileW || 0)),
      String(Number(settings.tileH || 0)),
      String(Number(settings.originX || 0)),
      String(Number(settings.originY || 0))
    ].join('|');
  }

  function registerStaticPacketRunBitmapEntry(adapterApi, reuseKey, signature, entry) {
    if (!reuseKey || !signature || !entry) return entry;
    entry.reuseKey = String(reuseKey);
    entry.signature = String(signature);
    getStaticBitmapReuseCache(adapterApi).set(String(reuseKey), entry);
    return entry;
  }

  function findReusableStaticPacketRunBitmapEntry(adapterApi, deps, reuseKey, signature, meta) {
    if (signature) {
      var exact = getStaticBitmapCache(adapterApi).get(String(signature)) || null;
      if (exact) return exact;
    }
    if (reuseKey) {
      var reuseEntry = getStaticBitmapReuseCache(adapterApi).get(String(reuseKey)) || null;
      if (reuseEntry) return reuseEntry;
    }
    return findStaticPacketRunInteractionSlotEntry(adapterApi, deps, meta);
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

  function collectStaticPacketRunGeometry(deps, packets, meta, stats) {
    packets = Array.isArray(packets) ? packets : [];
    meta = meta || {};
    stats = stats || {};
    var getProjectedGeometry = deps && deps.getStaticWorldPacketProjectedGeometry;
    if (typeof getProjectedGeometry !== 'function') return null;
    var projectedPackets = [];
    var bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    var overlayCount = 0;
    for (var i = 0; i < packets.length; i++) {
      var packet = packets[i];
      var projected = getProjectedGeometry(packet, meta.currentViewRotation);
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
      var boundarySegments = Array.isArray(projected.terrainBoundarySegmentsNoCamera) ? projected.terrainBoundarySegmentsNoCamera : [];
      for (var bi = 0; bi < boundarySegments.length; bi++) {
        var boundarySeg = Array.isArray(boundarySegments[bi]) ? boundarySegments[bi] : [];
        if (boundarySeg[0]) expandBoundsByPoint(bounds, boundarySeg[0]);
        if (boundarySeg[1]) expandBoundsByPoint(bounds, boundarySeg[1]);
      }
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

  function buildStaticPacketRunBitmap(deps, geometry, meta) {
    if (!geometry || !geometry.projectedPackets || !geometry.projectedPackets.length) return null;
    meta = meta || {};
    var pad = 8;
    var minX = Math.floor(Number(geometry.bounds.minX || 0)) - pad;
    var minY = Math.floor(Number(geometry.bounds.minY || 0)) - pad;
    var maxX = Math.ceil(Number(geometry.bounds.maxX || 0)) + pad;
    var maxY = Math.ceil(Number(geometry.bounds.maxY || 0)) + pad;
    var width = Math.max(1, maxX - minX);
    var height = Math.max(1, maxY - minY);
    var surface = deps && typeof deps.createOffscreenCanvas === 'function' ? deps.createOffscreenCanvas(width, height) : null;
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
      if (Array.isArray(projected.overlaysNoCamera) && projected.overlaysNoCamera.length && deps && typeof deps.drawFaceShadowOverlaysNoCamera === 'function') {
        deps.drawFaceShadowOverlaysNoCamera(surfaceCtx, projected.pointsNoCamera, projected.overlaysNoCamera, 0, 0);
      }
      if (deps && typeof deps.drawTerrainTopBoundarySegmentsForPacket === 'function') {
        deps.drawTerrainTopBoundarySegmentsForPacket(surfaceCtx, packet, projected);
      }
    }
    surfaceCtx.restore();
    var settings = getSettings(deps);
    return {
      bitmap: surface,
      minX: minX,
      minY: minY,
      width: width,
      height: height,
      packetCount: geometry.projectedPackets.length,
      overlayCount: geometry.overlayCount || 0,
      currentViewRotation: Number(meta.currentViewRotation || 0),
      tileW: Number(settings.tileW || 0),
      tileH: Number(settings.tileH || 0),
      originX: Number(settings.originX || 0),
      originY: Number(settings.originY || 0),
      builtAt: nowMs(deps),
      lastUsedAt: nowMs(deps)
    };
  }

  function drawStaticPacketRunBitmapEntry(deps, entry, meta, stats, drawMode) {
    entry = entry || null;
    meta = meta || {};
    stats = stats || {};
    if (!entry || !entry.bitmap) return false;
    var drawCtx = deps && typeof deps.getContext === 'function' ? deps.getContext() : null;
    if (!drawCtx || typeof drawCtx.drawImage !== 'function') return false;
    var drawStartAt = nowMs(deps);
    var camera = getCamera(deps);
    var settings = getSettings(deps);
    var offsetX = Number(camera.x || 0);
    var offsetY = Number(camera.y || 0);
    var targetX = Number(entry.minX || 0);
    var targetY = Number(entry.minY || 0);
    var targetW = Number(entry.width || 0);
    var targetH = Number(entry.height || 0);
    if (drawMode === 'interaction-reuse') {
      var builtTileW = Number(entry.tileW || 0);
      var builtTileH = Number(entry.tileH || 0);
      var currentTileW = Number(settings.tileW || 0);
      var currentTileH = Number(settings.tileH || 0);
      if (!(builtTileW > 0 && builtTileH > 0 && currentTileW > 0 && currentTileH > 0)) return false;
      var scaleX = currentTileW / builtTileW;
      var scaleY = currentTileH / builtTileH;
      if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) return false;
      var builtOriginX = Number(entry.originX || 0);
      var builtOriginY = Number(entry.originY || 0);
      var currentOriginX = Number(settings.originX || 0);
      var currentOriginY = Number(settings.originY || 0);
      targetX = currentOriginX + (Number(entry.minX || 0) - builtOriginX) * scaleX;
      targetY = currentOriginY + (Number(entry.minY || 0) - builtOriginY) * scaleY;
      targetW = Number(entry.width || 0) * scaleX;
      targetH = Number(entry.height || 0) * scaleY;
      stats.staticBitmapRunInteractionReuseCount = Number(stats.staticBitmapRunInteractionReuseCount || 0) + 1;
      stats.staticBitmapRunInteractionReuseDrawMs = Number(stats.staticBitmapRunInteractionReuseDrawMs || 0);
      stats.staticBitmapRunInteractionReuseScale = safeFixed(deps, scaleX);
    }
    drawCtx.drawImage(entry.bitmap, targetX + offsetX, targetY + offsetY, targetW, targetH);
    var drawMs = Math.max(0, nowMs(deps) - drawStartAt);
    stats.staticBitmapRunDrawMs += drawMs;
    if (drawMode === 'interaction-reuse') stats.staticBitmapRunInteractionReuseDrawMs += drawMs;
    stats.staticBitmapRunCount += 1;
    stats.staticBitmapRunPacketCount += Number(entry.packetCount || 0);
    stats.staticBitmapRunOverlayCount += Number(entry.overlayCount || 0);
    entry.lastUsedAt = nowMs(deps);
    return true;
  }

  function drawStaticPacketRunBitmap(adapterApi, deps, packets, meta, stats) {
    packets = Array.isArray(packets) ? packets : [];
    meta = meta || {};
    stats = stats || {};
    if (!packets.length) return false;
    if (!deps || typeof deps.getStaticWorldPacketProjectedGeometry !== 'function') return false;
    var signature = buildStaticPacketRunBitmapSignature(packets, meta, deps);
    var reuseKey = buildStaticPacketRunReuseKey(packets, meta, deps);
    var cache = getStaticBitmapCache(adapterApi);
    var entry = cache.get(signature) || null;
    if (entry) {
      stats.staticBitmapRunCacheHitCount += 1;
      registerStaticPacketRunInteractionSlotEntry(adapterApi, deps, meta, entry);
      return drawStaticPacketRunBitmapEntry(deps, entry, meta, stats, 'exact-cache');
    }
    stats.staticBitmapRunCacheMissCount += 1;
    if (shouldUseStaticBitmapRunInteractionReuse(deps, meta)) {
      var reuseEntry = findReusableStaticPacketRunBitmapEntry(adapterApi, deps, reuseKey, signature, meta);
      if (reuseEntry && drawStaticPacketRunBitmapEntry(deps, reuseEntry, meta, stats, 'interaction-reuse')) {
        registerStaticPacketRunInteractionSlotEntry(adapterApi, deps, meta, reuseEntry);
        return true;
      }
    }
    var geometryStartAt = nowMs(deps);
    var geometry = collectStaticPacketRunGeometry(deps, packets, meta, stats);
    stats.staticBitmapRunGeometryMs += Math.max(0, nowMs(deps) - geometryStartAt);
    if (!geometry || !geometry.projectedPackets.length) return false;
    var buildStartAt = nowMs(deps);
    entry = buildStaticPacketRunBitmap(deps, geometry, meta);
    stats.staticBitmapRunBuildMs += Math.max(0, nowMs(deps) - buildStartAt);
    if (!entry) return false;
    cache.set(signature, entry);
    registerStaticPacketRunBitmapEntry(adapterApi, reuseKey, signature, entry);
    registerStaticPacketRunInteractionSlotEntry(adapterApi, deps, meta, entry);
    pruneStaticBitmapCache(adapterApi, 48);
    return drawStaticPacketRunBitmapEntry(deps, entry, meta, stats, 'exact-cache');
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    getStaticBitmapCache: getStaticBitmapCache,
    getStaticBitmapReuseCache: getStaticBitmapReuseCache,
    getActiveCameraInteractionType: getActiveCameraInteractionType,
    getActiveCameraInteractionId: getActiveCameraInteractionId,
    getCameraSettleReuseState: getCameraSettleReuseState,
    shouldUseDeferredZoomSettleReuse: shouldUseDeferredZoomSettleReuse,
    getStaticBitmapInteractionState: getStaticBitmapInteractionState,
    buildStaticPacketRunInteractionSlotKey: buildStaticPacketRunInteractionSlotKey,
    registerStaticPacketRunInteractionSlotEntry: registerStaticPacketRunInteractionSlotEntry,
    findStaticPacketRunInteractionSlotEntry: findStaticPacketRunInteractionSlotEntry,
    shouldUseStaticBitmapRunInteractionReuse: shouldUseStaticBitmapRunInteractionReuse,
    pruneStaticBitmapCache: pruneStaticBitmapCache,
    mixHashString: mixHashString,
    buildStaticPacketRunReuseKey: buildStaticPacketRunReuseKey,
    buildStaticPacketRunBitmapSignature: buildStaticPacketRunBitmapSignature,
    registerStaticPacketRunBitmapEntry: registerStaticPacketRunBitmapEntry,
    findReusableStaticPacketRunBitmapEntry: findReusableStaticPacketRunBitmapEntry,
    collectStaticPacketRunGeometry: collectStaticPacketRunGeometry,
    buildStaticPacketRunBitmap: buildStaticPacketRunBitmap,
    drawStaticPacketRunBitmapEntry: drawStaticPacketRunBitmapEntry,
    drawStaticPacketRunBitmap: drawStaticPacketRunBitmap
  };

  try {
    window.__CANVAS2D_STATIC_BITMAP_RUN_CACHE__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.canvas2dStaticBitmapRunCache', api, { owner: OWNER, phase: PHASE });
      window.__APP_NAMESPACE.bind('renderer.diagnostics.canvas2dStaticBitmapRunCache', api, { owner: OWNER, phase: PHASE });
    } else {
      window.App = window.App || {};
      window.App.renderer = window.App.renderer || {};
      window.App.renderer.canvas2dStaticBitmapRunCache = api;
      window.App.renderer.diagnostics = window.App.renderer.diagnostics || {};
      window.App.renderer.diagnostics.canvas2dStaticBitmapRunCache = api;
    }
  } catch (_) {
    window.__CANVAS2D_STATIC_BITMAP_RUN_CACHE__ = api;
  }
})();
