// PXM-07.13B: PixiJS static-world-face-packet consumer with persistent Graphics reuse.
// Layer: presentation/render/optimization.
//
// This is the formal static-world migration path. It does NOT consume
// Canvas2D raster/bitmap run output. PixiJS consumes the renderer-neutral
// optimization products produced by renderer-neutral source modules:
// framePlan.order, static-world-face-packet payloads, projected geometry cache,
// material colors, terrain boundary segments, and shadow overlay projection
// payloads. Canvas2D may be skipped only after the whole static-world-face-packet
// category is accepted and drawn by this consumer for the current frame.
(function registerSharedRenderOptimizationPixiStaticWorldPacketConsumer(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js';
  var STEP = 'PXM-07.13B';
  var PHASE = 'pixi-static-world-packet-persistent-graphics-reuse';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';

  var state = {
    frameSeq: 0,
    graphicsPool: [],
    activeFramePlanId: '',
    activeRunKeys: Object.create(null),
    activeCategoryAdopted: false,
    lastSummary: null,
    totalPacketDrawCount: 0,
    totalFrameAdoptionCount: 0,
    totalRejectedFrameCount: 0
  };

  function nowMs() {
    try { return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function emit(section, payload) {
    var parts = [PREFIX + '[' + String(section || 'event') + ']'];
    payload = payload || {};
    try {
      Object.keys(payload).forEach(function (key) {
        var value = payload[key];
        if (value && typeof value === 'object') {
          try { value = JSON.stringify(value); } catch (_) { value = '[object]'; }
        }
        parts.push(String(key) + '=' + String(value));
      });
      var line = parts.join(' ');
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function getActiveBackend() {
    try {
      var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      var snapshot = selection && typeof selection.getSnapshot === 'function' ? selection.getSnapshot() : null;
      if (snapshot && snapshot.activeBackend) return String(snapshot.activeBackend);
    } catch (_) {}
    try {
      var api = global.App && global.App.renderer && global.App.renderer.active;
      if (api && api.backend) return String(api.backend);
    } catch (_) {}
    return 'unknown';
  }

  function getPixiWorldRenderer() {
    try { return global.__PIXI_MIGRATION_PIXI_WORLD_RENDERER__ || global.__PIXI_WORLD_RENDERER_SKELETON__ || null; } catch (_) {}
    return null;
  }

  function getPixiContainer() {
    try {
      var renderer = getPixiWorldRenderer();
      if (renderer && typeof renderer.getStaticWorldPacketContainer === 'function') return renderer.getStaticWorldPacketContainer('pixi-static-world-packet-consumer');
      if (renderer && typeof renderer.getStaticRunContainer === 'function') return renderer.getStaticRunContainer('pixi-static-world-packet-consumer');
    } catch (_) {}
    return null;
  }

  function getPixi() {
    try { return global.PIXI || null; } catch (_) {}
    return null;
  }

  function getProjectedGeometryApi() {
    try { return global.__STATIC_WORLD_PROJECTED_GEOMETRY_CACHE__ || null; } catch (_) {}
    return null;
  }

  function getCamera(deps) {
    try {
      if (deps && typeof deps.getCamera === 'function') return deps.getCamera() || {};
      if (deps && deps.camera) return deps.camera || {};
    } catch (_) {}
    return {};
  }

  function hasProjectionDependency(deps) {
    return !!(deps && typeof deps.screenPointsFromWorldFaceNoCamera === 'function');
  }

  function getPacketWorldPointCount(packet) {
    return Array.isArray(packet && packet.worldPts) ? packet.worldPts.length : 0;
  }

  function getPacketWorldLoopCount(packet) {
    return Array.isArray(packet && packet.worldLoops) ? packet.worldLoops.length : 0;
  }

  function normalizeViewRotation(meta) {
    if (meta && meta.currentViewRotation != null) return toNumber(meta.currentViewRotation, 0);
    return 0;
  }

  function makeRunKey(framePlanId, runStartIndex) {
    return String(framePlanId || 'frameplan:none') + '|static-run|' + String(toNumber(runStartIndex, -1));
  }

  function clearActiveRunKeys() {
    state.activeRunKeys = Object.create(null);
  }

  function setContainerVisible(container, visible) {
    try { if (container) container.visible = visible === true; } catch (_) {}
  }

  function clearGraphics(graphics) {
    if (!graphics) return;
    try { if (typeof graphics.clear === 'function') graphics.clear(); } catch (_) {}
    try { graphics.visible = false; } catch (_) {}
    try { graphics.__pixiStaticWorldPacketRenderSignature = ''; } catch (_) {}
    try { graphics.__pixiStaticWorldPacketDrawOk = false; } catch (_) {}
    try { graphics.__pixiStaticWorldPacketDrawStats = null; } catch (_) {}
  }

  function clearUnusedGraphics(usedCount) {
    for (var i = Math.max(0, usedCount || 0); i < state.graphicsPool.length; i += 1) clearGraphics(state.graphicsPool[i]);
  }

  function getGraphics(index, container, shouldClear) {
    var Pixi = getPixi();
    var Graphics = Pixi && Pixi.Graphics;
    if (typeof Graphics !== 'function' || !container) return null;
    var g = state.graphicsPool[index] || null;
    if (!g) {
      try {
        g = new Graphics();
        g.label = 'pixi-static-world-face-packet-' + String(index);
        try { g.eventMode = 'none'; } catch (_) {}
        state.graphicsPool[index] = g;
        if (typeof container.addChild === 'function') container.addChild(g);
      } catch (_) {
        return null;
      }
    } else {
      try {
        if (g.parent !== container && typeof container.addChild === 'function') container.addChild(g);
      } catch (_) {}
    }
    if (shouldClear === true) clearGraphics(g);
    try { g.visible = true; } catch (_) {}
    return g;
  }

  function parseCssColor(value, fallbackColor, fallbackAlpha) {
    var str = String(value || '').trim();
    var alpha = fallbackAlpha == null ? 1 : Number(fallbackAlpha);
    if (!Number.isFinite(alpha)) alpha = 1;
    if (!str) return { color: fallbackColor == null ? 0xffffff : fallbackColor, alpha: alpha };
    var hex3 = /^#([0-9a-f]{3})$/i.exec(str);
    if (hex3) {
      return {
        color: parseInt(hex3[1].split('').map(function (ch) { return ch + ch; }).join(''), 16),
        alpha: alpha
      };
    }
    var hex6 = /^#([0-9a-f]{6})$/i.exec(str);
    if (hex6) return { color: parseInt(hex6[1], 16), alpha: alpha };
    var rgb = /^rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(str);
    if (rgb) {
      var r = Math.max(0, Math.min(255, Math.round(toNumber(rgb[1], 0))));
      var g = Math.max(0, Math.min(255, Math.round(toNumber(rgb[2], 0))));
      var b = Math.max(0, Math.min(255, Math.round(toNumber(rgb[3], 0))));
      var a = rgb[4] == null ? alpha : Math.max(0, Math.min(1, toNumber(rgb[4], alpha)));
      return { color: (r << 16) + (g << 8) + b, alpha: a };
    }
    // PixiJS v8 can handle CSS colors in some APIs, but this consumer keeps a
    // deterministic numeric fallback for renderer-neutral packet colors.
    return { color: fallbackColor == null ? 0xffffff : fallbackColor, alpha: alpha };
  }

  function addCameraPoint(pt, camera) {
    return { x: toNumber(pt && pt.x, 0) + toNumber(camera && camera.x, 0), y: toNumber(pt && pt.y, 0) + toNumber(camera && camera.y, 0) };
  }

  function buildSharedFloorReuseRenderTransform(deps) {
    var floorSnapshot = getSharedFloorSnapshot();
    var transform = floorSnapshot && floorSnapshot.floorCacheBlitTransform || null;
    var pixi = transform && transform.pixi || null;
    var reuse = floorSnapshot && floorSnapshot.reuseTransform || null;
    var scale = toNumber(transform && transform.scale, toNumber(reuse && reuse.scale, 1));
    if (!Number.isFinite(scale) || Math.abs(scale) < 0.0001) scale = 1;
    var shouldReuse = !!(transform && transform.shouldReuse === true);
    if (!shouldReuse || !pixi) {
      return {
        active: false,
        reason: shouldReuse ? 'pixi-floor-transform-missing' : 'floor-reuse-inactive',
        floorSnapshot: floorSnapshot,
        transform: transform,
        scale: scale,
        spriteX: 0,
        spriteY: 0,
        floorBuildCameraX: toNumber(floorSnapshot && floorSnapshot.buildCameraX, toNumber(reuse && reuse.builtCameraX, 0)),
        floorBuildCameraY: toNumber(floorSnapshot && floorSnapshot.buildCameraY, toNumber(reuse && reuse.builtCameraY, 0)),
        floorBuildZoom: toNumber(floorSnapshot && floorSnapshot.buildZoom, toNumber(reuse && reuse.builtZoom, 1)),
        floorCurrentZoom: toNumber(floorSnapshot && floorSnapshot.currentZoom, 1)
      };
    }
    return {
      active: true,
      reason: 'shared-floor-cache-reuse-transform-active',
      floorSnapshot: floorSnapshot,
      transform: transform,
      scale: scale,
      spriteX: toNumber(pixi && pixi.spriteX, 0),
      spriteY: toNumber(pixi && pixi.spriteY, 0),
      floorBuildCameraX: toNumber(transform && transform.builtCameraX, toNumber(floorSnapshot && floorSnapshot.buildCameraX, toNumber(reuse && reuse.builtCameraX, 0))),
      floorBuildCameraY: toNumber(transform && transform.builtCameraY, toNumber(floorSnapshot && floorSnapshot.buildCameraY, toNumber(reuse && reuse.builtCameraY, 0))),
      floorBuildZoom: toNumber(transform && transform.builtZoom, toNumber(floorSnapshot && floorSnapshot.buildZoom, toNumber(reuse && reuse.builtZoom, 1))),
      floorCurrentZoom: toNumber(floorSnapshot && floorSnapshot.currentZoom, 1),
      floorReuseDx: toNumber(transform && transform.dx, toNumber(reuse && reuse.dx, 0)),
      floorReuseDy: toNumber(transform && transform.dy, toNumber(reuse && reuse.dy, 0)),
      floorTransformScaled: !!(transform && transform.scaled === true)
    };
  }

  function mapNoCameraPointToFinalScreenPoint(pt, camera, renderTransform, deps) {
    if (renderTransform && renderTransform.active === true) {
      var builtNoCamera = projectCurrentNoCameraPointToBuiltNoCamera(pt, renderTransform.floorSnapshot, deps);
      var builtScreenX = toNumber(builtNoCamera && builtNoCamera.x, 0) + toNumber(renderTransform.floorBuildCameraX, 0);
      var builtScreenY = toNumber(builtNoCamera && builtNoCamera.y, 0) + toNumber(renderTransform.floorBuildCameraY, 0);
      return {
        x: toNumber(renderTransform.spriteX, 0) + toNumber(renderTransform.scale, 1) * builtScreenX,
        y: toNumber(renderTransform.spriteY, 0) + toNumber(renderTransform.scale, 1) * builtScreenY
      };
    }
    return addCameraPoint(pt, camera);
  }

  function mapNoCameraPointsToFinalScreenPoints(points, camera, renderTransform, deps) {
    points = Array.isArray(points) ? points : [];
    var out = [];
    for (var i = 0; i < points.length; i += 1) out.push(mapNoCameraPointToFinalScreenPoint(points[i], camera, renderTransform, deps));
    return out;
  }

  function addCameraToPoints(points, camera) {
    points = Array.isArray(points) ? points : [];
    var out = [];
    for (var i = 0; i < points.length; i += 1) out.push(addCameraPoint(points[i], camera));
    return out;
  }

  function flatPointArray(points) {
    var arr = [];
    points = Array.isArray(points) ? points : [];
    for (var i = 0; i < points.length; i += 1) {
      arr.push(toNumber(points[i] && points[i].x, 0));
      arr.push(toNumber(points[i] && points[i].y, 0));
    }
    return arr;
  }

  function drawPolygonV8(graphics, points, fillCss, strokeCss, width) {
    if (!graphics || !Array.isArray(points) || points.length < 3) return false;
    var fill = parseCssColor(fillCss, 0xffffff, 1);
    var stroke = parseCssColor(strokeCss, 0x000000, 1);
    try {
      if (typeof graphics.poly === 'function') {
        // PixiJS v8 Graphics#poly accepts the point list directly. Passing a
        // Canvas2D-style/legacy `close` boolean can throw in some Pixi builds,
        // which made every static-world packet reject before Canvas2D skip.
        graphics.poly(flatPointArray(points));
        if (fillCss && typeof graphics.fill === 'function') graphics.fill({ color: fill.color, alpha: fill.alpha });
        if (strokeCss && typeof graphics.stroke === 'function') graphics.stroke({ color: stroke.color, alpha: stroke.alpha, width: Math.max(0, toNumber(width, 1)) });
        return true;
      }
    } catch (_) {}
    return false;
  }

  function drawPolygonLegacy(graphics, points, fillCss, strokeCss, width) {
    if (!graphics || !Array.isArray(points) || points.length < 3) return false;
    var fill = parseCssColor(fillCss, 0xffffff, 1);
    var stroke = parseCssColor(strokeCss, 0x000000, 1);
    try {
      if (fillCss && typeof graphics.beginFill === 'function') graphics.beginFill(fill.color, fill.alpha);
      if (strokeCss && typeof graphics.lineStyle === 'function') graphics.lineStyle(Math.max(0, toNumber(width, 1)), stroke.color, stroke.alpha);
      if (typeof graphics.moveTo === 'function') graphics.moveTo(toNumber(points[0].x, 0), toNumber(points[0].y, 0));
      for (var i = 1; i < points.length; i += 1) {
        if (typeof graphics.lineTo === 'function') graphics.lineTo(toNumber(points[i].x, 0), toNumber(points[i].y, 0));
      }
      if (typeof graphics.closePath === 'function') graphics.closePath();
      if (fillCss && typeof graphics.endFill === 'function') graphics.endFill();
      return true;
    } catch (_) {}
    return false;
  }

  function drawPolygon(graphics, points, fillCss, strokeCss, width) {
    return drawPolygonV8(graphics, points, fillCss, strokeCss, width) || drawPolygonLegacy(graphics, points, fillCss, strokeCss, width);
  }

  function drawSegment(graphics, a, b, strokeCss, width) {
    if (!graphics || !a || !b || !strokeCss) return false;
    var stroke = parseCssColor(strokeCss, 0x000000, 1);
    try {
      if (typeof graphics.moveTo === 'function' && typeof graphics.lineTo === 'function') {
        if (typeof graphics.stroke === 'function') {
          graphics.moveTo(toNumber(a.x, 0), toNumber(a.y, 0));
          graphics.lineTo(toNumber(b.x, 0), toNumber(b.y, 0));
          graphics.stroke({ color: stroke.color, alpha: stroke.alpha, width: Math.max(0, toNumber(width, 1)) });
          return true;
        }
        if (typeof graphics.lineStyle === 'function') graphics.lineStyle(Math.max(0, toNumber(width, 1)), stroke.color, stroke.alpha);
        graphics.moveTo(toNumber(a.x, 0), toNumber(a.y, 0));
        graphics.lineTo(toNumber(b.x, 0), toNumber(b.y, 0));
        return true;
      }
    } catch (_) {}
    return false;
  }

  function getGraphicsCapabilities(graphics) {
    return {
      poly: !!(graphics && typeof graphics.poly === 'function'),
      fill: !!(graphics && typeof graphics.fill === 'function'),
      stroke: !!(graphics && typeof graphics.stroke === 'function'),
      beginFill: !!(graphics && typeof graphics.beginFill === 'function'),
      drawPolygon: !!(graphics && typeof graphics.drawPolygon === 'function'),
      moveTo: !!(graphics && typeof graphics.moveTo === 'function'),
      lineTo: !!(graphics && typeof graphics.lineTo === 'function')
    };
  }

  function drawProjectedOverlays(graphics, packet, projected, camera, renderTransform, deps) {
    var overlays = projected && Array.isArray(projected.overlaysNoCamera) ? projected.overlaysNoCamera : [];
    var overlayCount = 0;
    for (var oi = 0; oi < overlays.length; oi += 1) {
      var overlay = overlays[oi] || {};
      var polys = Array.isArray(overlay.polysNoCamera) ? overlay.polysNoCamera : [];
      var alpha = Math.max(0, Math.min(0.95, toNumber(overlay.alpha != null ? overlay.alpha : overlay.baseAlpha, 0.18)));
      for (var pi = 0; pi < polys.length; pi += 1) {
        var pts = mapNoCameraPointsToFinalScreenPoints(polys[pi], camera, renderTransform, deps);
        if (pts.length >= 3 && drawPolygon(graphics, pts, 'rgba(0,0,0,' + String(alpha) + ')', null, 0)) overlayCount += 1;
      }
    }
    return overlayCount;
  }

  function getPacketProjectedGeometry(packet, viewRotation, deps) {
    var api = getProjectedGeometryApi();
    if (!api || typeof api.getStaticWorldPacketProjectedGeometry !== 'function') return null;
    return api.getStaticWorldPacketProjectedGeometry(packet, viewRotation, deps);
  }

  function isSupportedPacket(packet) {
    return !!(packet && packet.kind === 'static-world-face-packet' && (Array.isArray(packet.worldPts) || Array.isArray(packet.worldLoops)));
  }

  function collectStaticRuns(order) {
    order = Array.isArray(order) ? order : [];
    var runs = [];
    var i = 0;
    while (i < order.length) {
      var item = order[i];
      if (!(item && item.kind === 'static-world-face-packet')) {
        i += 1;
        continue;
      }
      var runStart = i;
      var packets = [];
      while (i < order.length) {
        var maybe = order[i];
        if (!(maybe && maybe.kind === 'static-world-face-packet')) break;
        packets.push(maybe);
        i += 1;
      }
      runs.push({ runStartIndex: runStart, packets: packets });
    }
    return runs;
  }

  function drawPacket(graphics, packet, projected, camera, renderTransform, deps) {
    if (!graphics || !packet || !projected) return { ok: false, reason: 'missing-input' };
    var loops = Array.isArray(projected.loopsNoCamera) ? projected.loopsNoCamera : [];
    var points = Array.isArray(projected.pointsNoCamera) ? projected.pointsNoCamera : [];
    var polygonDrawCount = 0;
    if (loops.length) {
      for (var li = 0; li < loops.length; li += 1) {
        var loopPts = mapNoCameraPointsToFinalScreenPoints(loops[li], camera, renderTransform, deps);
        if (loopPts.length >= 3 && drawPolygon(graphics, loopPts, packet.fill, packet.stroke, packet.width || 1)) polygonDrawCount += 1;
      }
    } else {
      var pts = mapNoCameraPointsToFinalScreenPoints(points, camera, renderTransform, deps);
      if (pts.length >= 3 && drawPolygon(graphics, pts, packet.fill, packet.stroke, packet.width || 1)) polygonDrawCount += 1;
    }
    var outlineSegments = Array.isArray(projected.outlineSegmentsNoCamera) ? projected.outlineSegmentsNoCamera : [];
    var outlineCount = 0;
    if (packet.stroke && outlineSegments.length) {
      for (var oi = 0; oi < outlineSegments.length; oi += 1) {
        var seg = outlineSegments[oi];
        if (Array.isArray(seg) && seg[0] && seg[1]) {
          if (drawSegment(graphics, mapNoCameraPointToFinalScreenPoint(seg[0], camera, renderTransform, deps), mapNoCameraPointToFinalScreenPoint(seg[1], camera, renderTransform, deps), packet.stroke, packet.width || 1)) outlineCount += 1;
        }
      }
    }
    var terrainBoundarySegments = Array.isArray(projected.terrainBoundarySegmentsNoCamera) ? projected.terrainBoundarySegmentsNoCamera : [];
    var boundaryCount = 0;
    if (packet.terrainBoundaryStroke && packet.terrainBoundaryStrokeWidth && terrainBoundarySegments.length) {
      for (var bi = 0; bi < terrainBoundarySegments.length; bi += 1) {
        var bseg = terrainBoundarySegments[bi];
        if (Array.isArray(bseg) && bseg[0] && bseg[1]) {
          if (drawSegment(graphics, mapNoCameraPointToFinalScreenPoint(bseg[0], camera, renderTransform, deps), mapNoCameraPointToFinalScreenPoint(bseg[1], camera, renderTransform, deps), packet.terrainBoundaryStroke, packet.terrainBoundaryStrokeWidth)) boundaryCount += 1;
        }
      }
    }
    var overlayCount = drawProjectedOverlays(graphics, packet, projected, camera, renderTransform, deps);
    return {
      ok: polygonDrawCount > 0,
      polygonDrawCount: polygonDrawCount,
      outlineCount: outlineCount,
      terrainBoundaryCount: boundaryCount,
      overlayCount: overlayCount
    };
  }


  function safeRoundForSignature(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    var factor = Math.pow(10, digits == null ? 4 : digits);
    return Math.round(n * factor) / factor;
  }

  function buildPacketPersistentGraphicsSignature(packet, projected, camera, renderTransform, runStartIndex, packetIndex, deps) {
    var shared = getSharedRenderFrameSnapshot();
    var floorSnapshot = renderTransform && renderTransform.floorSnapshot ? renderTransform.floorSnapshot : getSharedFloorSnapshot();
    var transform = floorSnapshot && floorSnapshot.floorCacheBlitTransform || null;
    var reuse = floorSnapshot && floorSnapshot.reuseTransform || null;
    var cacheState = packet && packet.__lastStaticPacketCacheState || null;
    var parts = [
      'persistent-graphics-v=07.13B',
      'packet=' + String(packet && packet.id || ''),
      'run=' + String(runStartIndex),
      'packetIndex=' + String(packetIndex),
      'fill=' + String(packet && packet.fill || ''),
      'stroke=' + String(packet && packet.stroke || ''),
      'width=' + String(packet && packet.width || 1),
      'terrainStroke=' + String(packet && packet.terrainBoundaryStroke || ''),
      'terrainStrokeWidth=' + String(packet && packet.terrainBoundaryStrokeWidth || 0),
      'projectedKey=' + String(projected && projected.key || ''),
      'overlayCount=' + String(cacheState && cacheState.overlayCount != null ? cacheState.overlayCount : (Array.isArray(projected && projected.overlaysNoCamera) ? projected.overlaysNoCamera.length : 0)),
      'renderTransformActive=' + String(!!(renderTransform && renderTransform.active === true)),
      'currentCamera=' + safeRoundForSignature(camera && camera.x, 3) + ',' + safeRoundForSignature(camera && camera.y, 3),
      'reuseScale=' + safeRoundForSignature(renderTransform && renderTransform.scale, 6),
      'reuseSprite=' + safeRoundForSignature(renderTransform && renderTransform.spriteX, 3) + ',' + safeRoundForSignature(renderTransform && renderTransform.spriteY, 3),
      'reuseBuildCamera=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraX, 3) + ',' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraY, 3),
      'reuseBuildZoom=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildZoom, 6),
      'floorSurfaceRevision=' + String(floorSnapshot && floorSnapshot.sharedSurfaceRevision != null ? floorSnapshot.sharedSurfaceRevision : ''),
      'floorTextureVersion=' + String(floorSnapshot && floorSnapshot.textureVersion || ''),
      'floorTransformScale=' + safeRoundForSignature(transform && transform.scale, 6),
      'floorTransformDxDy=' + safeRoundForSignature(transform && transform.dx, 3) + ',' + safeRoundForSignature(transform && transform.dy, 3),
      'floorReuseCameraOnly=' + String(!!(reuse && reuse.cameraTransformOnly === true)),
      'sharedFrameId=' + String(shared && shared.frameId || ''),
      'sharedFramePlanId=' + String(shared && shared.framePlanId || '')
    ];
    return parts.join('|');
  }

  function applyPersistentGraphicsMetadata(graphics, packet, runStartIndex, packetIndex) {
    try {
      graphics.__pixiStaticWorldPacketId = packet && packet.id || null;
      graphics.__pixiStaticWorldRunStartIndex = runStartIndex;
      graphics.__pixiFramePlanOrderIndex = runStartIndex + packetIndex;
      graphics.zIndex = runStartIndex + packetIndex;
      graphics.visible = true;
    } catch (_) {}
  }

  function rejectFrame(reason, extra) {
    clearActiveRunKeys();
    state.activeCategoryAdopted = false;
    state.totalRejectedFrameCount += 1;
    var container = getPixiContainer();
    clearUnusedGraphics(0);
    setContainerVisible(container, false);
    state.lastSummary = Object.assign({
      ok: false,
      renderer: 'pixi-static-world-packet-consumer',
      activeBackend: getActiveBackend(),
      pixiDrawsStaticWorldPackets: false,
      pixiStaticWorldConsumesFramePlanOrder: false,
      pixiStaticWorldConsumesStaticFacePackets: false,
      pixiStaticWorldUsesSharedProjectedGeometry: false,
      pixiStaticWorldUsesRendererNeutralProjectedGeometry: false,
      pixiStaticWorldUsesPacketMaterialColors: false,
      pixiStaticWorldBypassesCanvas2dBitmapRunCache: true,
      canvas2dStaticBitmapRunCacheUsedForPixi: false,
      canvas2dSkipsStaticWorldPackets: false,
      fallbackReason: reason || 'rejected',
      source: 'rejectFrame'
    }, extra || {});
    emit('summary', state.lastSummary);
    return state.lastSummary;
  }


  function getActiveCameraInteractionType(deps) {
    try {
      if (deps && typeof deps.getActiveCameraInteractionType === 'function') return deps.getActiveCameraInteractionType() || null;
    } catch (_) {}
    try { return global.__habboActiveCameraInteractionType || null; } catch (_) {}
    return null;
  }

  function shouldUseDeferredZoomSettleReuse(deps) {
    try {
      if (deps && typeof deps.shouldUseDeferredZoomSettleReuse === 'function') return deps.shouldUseDeferredZoomSettleReuse() === true;
    } catch (_) {}
    try {
      if (deps && typeof deps.getCameraSettleReuseState === 'function') {
        var settle = deps.getCameraSettleReuseState() || null;
        if (!settle || String(settle.lastEndedType || '') !== 'zoom') return false;
        var now = nowMs();
        return Number(settle.deferCommitUntilMs || 0) > now;
      }
    } catch (_) {}
    return false;
  }

  function getSharedRenderFrameSnapshot() {
    try { return global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ || null; } catch (_) {}
    return null;
  }

  function getSharedFloorSnapshot() {
    var frameSnapshot = getSharedRenderFrameSnapshot();
    if (frameSnapshot && frameSnapshot.floorSnapshot) return frameSnapshot.floorSnapshot;
    try {
      var api = global.__SHARED_FLOOR_LAYER_CACHE_SOURCE_FOR_RENDER__ || null;
      if (api && typeof api.getSnapshot === 'function') return api.getSnapshot() || null;
    } catch (_) {}
    try {
      var opt = global.App && global.App.renderer && global.App.renderer.optimization;
      var api2 = opt && opt.floorLayerCacheSource;
      if (api2 && typeof api2.getSnapshot === 'function') return api2.getSnapshot() || null;
    } catch (_) {}
    return null;
  }


  function getStaticWorldFaceMergeSnapshot() {
    try {
      if (typeof global.getStaticWorldFaceMergeControlStateSnapshotForRender === 'function') {
        return global.getStaticWorldFaceMergeControlStateSnapshotForRender() || null;
      }
    } catch (_) {}
    return null;
  }

  function projectCurrentNoCameraPointToBuiltNoCamera(pointNoCamera, floorSnapshot, deps) {
    var settings = deps && typeof deps.getSettings === 'function' ? deps.getSettings() : (deps && deps.settings ? deps.settings : {});
    var originX = toNumber(settings && settings.originX, toNumber(floorSnapshot && floorSnapshot.floorCacheBlitTransform && floorSnapshot.floorCacheBlitTransform.originX, 0));
    var originY = toNumber(settings && settings.originY, toNumber(floorSnapshot && floorSnapshot.floorCacheBlitTransform && floorSnapshot.floorCacheBlitTransform.originY, 0));
    var currentZoom = toNumber(floorSnapshot && floorSnapshot.currentZoom, 0);
    if (!currentZoom) {
      try { currentZoom = deps && typeof deps.getMainEditorZoomValueForRender === 'function' ? toNumber(deps.getMainEditorZoomValueForRender(), 1) : 1; } catch (_) { currentZoom = 1; }
    }
    var builtZoom = toNumber(floorSnapshot && floorSnapshot.buildZoom, toNumber(floorSnapshot && floorSnapshot.reuseTransform && floorSnapshot.reuseTransform.builtZoom, currentZoom || 1));
    var ratio = currentZoom ? builtZoom / currentZoom : 1;
    return {
      x: originX + (toNumber(pointNoCamera && pointNoCamera.x, 0) - originX) * ratio,
      y: originY + (toNumber(pointNoCamera && pointNoCamera.y, 0) - originY) * ratio,
      currentZoom: currentZoom,
      builtZoom: builtZoom,
      zoomRatio: ratio
    };
  }

  function buildStaticFloorAlignmentProbe(packet, projected, camera, deps, runStartIndex, packetIndex, renderTransform) {
    var floorSnapshot = getSharedFloorSnapshot();
    var transform = floorSnapshot && floorSnapshot.floorCacheBlitTransform || null;
    var pixiTransform = transform && transform.pixi || null;
    var reuse = floorSnapshot && floorSnapshot.reuseTransform || null;
    var faceMerge = getStaticWorldFaceMergeSnapshot();
    var pointNoCamera = null;
    try {
      if (projected && Array.isArray(projected.pointsNoCamera) && projected.pointsNoCamera.length) pointNoCamera = projected.pointsNoCamera[0];
      else if (projected && Array.isArray(projected.loopsNoCamera) && projected.loopsNoCamera.length && projected.loopsNoCamera[0] && projected.loopsNoCamera[0].length) pointNoCamera = projected.loopsNoCamera[0][0];
    } catch (_) { pointNoCamera = null; }
    if (!pointNoCamera) {
      return {
        ok: false,
        reason: 'no-projected-sample-point',
        packetId: packet && packet.id ? String(packet.id) : '',
        runStartIndex: runStartIndex,
        packetIndex: packetIndex,
        effectiveFaceMergeMode: faceMerge && faceMerge.effectiveFaceMergeMode ? String(faceMerge.effectiveFaceMergeMode) : '',
        pendingFaceMergeMode: faceMerge && faceMerge.pendingFaceMergeMode ? String(faceMerge.pendingFaceMergeMode) : ''
      };
    }
    var staticRenderPoint = mapNoCameraPointToFinalScreenPoint(pointNoCamera, camera, renderTransform, deps);
    var staticScreenX = toNumber(staticRenderPoint && staticRenderPoint.x, toNumber(pointNoCamera.x, 0) + toNumber(camera && camera.x, 0));
    var staticScreenY = toNumber(staticRenderPoint && staticRenderPoint.y, toNumber(pointNoCamera.y, 0) + toNumber(camera && camera.y, 0));
    var builtNoCamera = projectCurrentNoCameraPointToBuiltNoCamera(pointNoCamera, floorSnapshot, deps);
    var builtScreenX = toNumber(builtNoCamera.x, 0) + toNumber(floorSnapshot && floorSnapshot.buildCameraX, toNumber(reuse && reuse.builtCameraX, 0));
    var builtScreenY = toNumber(builtNoCamera.y, 0) + toNumber(floorSnapshot && floorSnapshot.buildCameraY, toNumber(reuse && reuse.builtCameraY, 0));
    var floorScale = toNumber(transform && transform.scale, toNumber(reuse && reuse.scale, 1));
    var floorSpriteX = toNumber(pixiTransform && pixiTransform.spriteX, 0);
    var floorSpriteY = toNumber(pixiTransform && pixiTransform.spriteY, 0);
    var floorEquivalentX = floorSpriteX + floorScale * builtScreenX;
    var floorEquivalentY = floorSpriteY + floorScale * builtScreenY;
    var dx = staticScreenX - floorEquivalentX;
    var dy = staticScreenY - floorEquivalentY;
    var absMax = Math.max(Math.abs(dx), Math.abs(dy));
    return {
      ok: absMax <= 1.25,
      reason: absMax <= 1.25 ? 'within-tolerance' : 'static-floor-transform-diverged',
      packetId: packet && packet.id ? String(packet.id) : '',
      runStartIndex: runStartIndex,
      packetIndex: packetIndex,
      samplePointSource: projected && Array.isArray(projected.pointsNoCamera) && projected.pointsNoCamera.length ? 'pointsNoCamera[0]' : 'loopsNoCamera[0][0]',
      staticScreenX: Number(staticScreenX.toFixed ? staticScreenX.toFixed(3) : staticScreenX),
      staticScreenY: Number(staticScreenY.toFixed ? staticScreenY.toFixed(3) : staticScreenY),
      floorEquivalentX: Number(floorEquivalentX.toFixed ? floorEquivalentX.toFixed(3) : floorEquivalentX),
      floorEquivalentY: Number(floorEquivalentY.toFixed ? floorEquivalentY.toFixed(3) : floorEquivalentY),
      dx: Number(dx.toFixed ? dx.toFixed(3) : dx),
      dy: Number(dy.toFixed ? dy.toFixed(3) : dy),
      maxAbsError: Number(absMax.toFixed ? absMax.toFixed(3) : absMax),
      currentCameraX: toNumber(camera && camera.x, 0),
      currentCameraY: toNumber(camera && camera.y, 0),
      floorBuildCameraX: toNumber(floorSnapshot && floorSnapshot.buildCameraX, toNumber(reuse && reuse.builtCameraX, 0)),
      floorBuildCameraY: toNumber(floorSnapshot && floorSnapshot.buildCameraY, toNumber(reuse && reuse.builtCameraY, 0)),
      currentZoom: builtNoCamera.currentZoom,
      floorBuildZoom: builtNoCamera.builtZoom,
      floorReuseScale: floorScale,
      floorReuseDx: toNumber(transform && transform.dx, toNumber(reuse && reuse.dx, 0)),
      floorReuseDy: toNumber(transform && transform.dy, toNumber(reuse && reuse.dy, 0)),
      floorTransformShouldReuse: !!(transform && transform.shouldReuse === true),
      floorTransformScaled: !!(transform && transform.scaled === true),
      staticUsesSharedFloorReuseTransform: !!(renderTransform && renderTransform.active === true),
      staticUsesSharedRenderFrameSnapshot: !!getSharedRenderFrameSnapshot(),
      staticSharedRenderFrameSurfaceRevision: getSharedRenderFrameSnapshot() ? getSharedRenderFrameSnapshot().floorSharedSurfaceRevision : null,
      staticSharedRenderFrameTextureVersion: getSharedRenderFrameSnapshot() ? getSharedRenderFrameSnapshot().floorTextureVersion : '',
      staticSharedFloorReuseReason: renderTransform && renderTransform.reason ? String(renderTransform.reason) : '',
      floorSharedSurfaceRevision: toNumber(floorSnapshot && floorSnapshot.sharedSurfaceRevision, 0),
      effectiveFaceMergeMode: faceMerge && faceMerge.effectiveFaceMergeMode ? String(faceMerge.effectiveFaceMergeMode) : '',
      pendingFaceMergeMode: faceMerge && faceMerge.pendingFaceMergeMode ? String(faceMerge.pendingFaceMergeMode) : '',
      zoomInteractionActive: faceMerge && faceMerge.zoomInteractionActive === true,
      zoomSettlePending: faceMerge && faceMerge.zoomSettlePending === true
    };
  }

  function shouldDelegateStaticToOriginalZoomPath(deps) {
    var interactionType = String(getActiveCameraInteractionType(deps) || '');
    var zoomActive = interactionType === 'zoom' || shouldUseDeferredZoomSettleReuse(deps) === true;
    if (!zoomActive) return { delegate: false, reason: '' };
    var floorSnapshot = getSharedFloorSnapshot();
    var transform = floorSnapshot && floorSnapshot.floorCacheBlitTransform || null;
    var reuse = floorSnapshot && floorSnapshot.reuseTransform || null;
    var scaled = !!(transform && transform.scaled === true) || Math.abs(toNumber(transform && transform.scale, toNumber(reuse && reuse.scale, 1)) - 1) > 0.001;
    var cameraTransformOnly = !!(reuse && reuse.cameraTransformOnly === true) || !!(transform && transform.shouldReuse === true);
    if (scaled || cameraTransformOnly) {
      return {
        delegate: true,
        reason: 'zoom-reuse-transform-delegated-to-original-static-path',
        zoomInteractionActive: interactionType === 'zoom',
        zoomSettlePending: shouldUseDeferredZoomSettleReuse(deps) === true,
        floorReuseScale: toNumber(transform && transform.scale, toNumber(reuse && reuse.scale, 1)),
        floorReuseDx: toNumber(transform && transform.dx, toNumber(reuse && reuse.dx, 0)),
        floorReuseDy: toNumber(transform && transform.dy, toNumber(reuse && reuse.dy, 0))
      };
    }
    return { delegate: false, reason: '' };
  }

  function beginFrame(order, meta, deps) {
    var startAt = nowMs();
    state.frameSeq += 1;
    clearActiveRunKeys();
    state.activeFramePlanId = String(meta && meta.framePlanId || 'frameplan:none');
    state.activeCategoryAdopted = false;

    if (getActiveBackend() !== 'pixi') return rejectFrame('active-backend-not-pixi', { source: 'beginFrame' });
    var Pixi = getPixi();
    if (!Pixi) return rejectFrame('pixi-global-missing', { source: 'beginFrame' });
    var container = getPixiContainer();
    if (!container) return rejectFrame('pixi-static-world-container-missing', { source: 'beginFrame' });
    var projectedApi = getProjectedGeometryApi();
    if (!projectedApi || typeof projectedApi.getStaticWorldPacketProjectedGeometry !== 'function') return rejectFrame('shared-projected-geometry-api-missing', { source: 'beginFrame' });

    var runs = collectStaticRuns(order);
    var staticPacketCount = 0;
    for (var ri = 0; ri < runs.length; ri += 1) staticPacketCount += runs[ri].packets.length;
    if (!staticPacketCount) return rejectFrame('no-static-world-face-packets', { source: 'beginFrame', runCount: runs.length, staticPacketCount: 0 });

    for (var r = 0; r < runs.length; r += 1) {
      for (var p = 0; p < runs[r].packets.length; p += 1) {
        if (!isSupportedPacket(runs[r].packets[p])) return rejectFrame('unsupported-static-world-packet', {
          source: 'beginFrame',
          runStartIndex: runs[r].runStartIndex,
          packetId: runs[r].packets[p] && runs[r].packets[p].id || null
        });
      }
    }

    setContainerVisible(container, true);
    try { container.sortableChildren = true; } catch (_) {}
    var zoomDelegate = shouldDelegateStaticToOriginalZoomPath(deps);
    var renderTransform = buildSharedFloorReuseRenderTransform(deps);
    var camera = getCamera(deps);
    var viewRotation = normalizeViewRotation(meta);
    var graphicsIndex = 0;
    var projectedGeometryHitCount = 0;
    var projectedGeometryMissCount = 0;
    var packetDrawCount = 0;
    var polygonDrawCount = 0;
    var overlayDrawCount = 0;
    var terrainBoundaryDrawCount = 0;
    var persistentGraphicsReuseCount = 0;
    var persistentGraphicsRebuildCount = 0;
    var failedPacket = null;
    var alignmentProbe = null;

    for (var runIndex = 0; runIndex < runs.length; runIndex += 1) {
      var run = runs[runIndex];
      state.activeRunKeys[makeRunKey(state.activeFramePlanId, run.runStartIndex)] = true;
      for (var pi = 0; pi < run.packets.length; pi += 1) {
        var packet = run.packets[pi];
        var projected = getPacketProjectedGeometry(packet, viewRotation, deps);
        if (!projected) {
          failedPacket = { reason: 'projection-failed', packetId: packet && packet.id || null, runStartIndex: run.runStartIndex };
          break;
        }
        var cacheState = packet && packet.__lastStaticPacketCacheState || null;
        if (cacheState && cacheState.geometryCacheHit === true) projectedGeometryHitCount += 1;
        else projectedGeometryMissCount += 1;
        if (!alignmentProbe) alignmentProbe = buildStaticFloorAlignmentProbe(packet, projected, camera, deps, run.runStartIndex, pi, renderTransform);
        var renderSignature = buildPacketPersistentGraphicsSignature(packet, projected, camera, renderTransform, run.runStartIndex, pi, deps);
        var graphics = getGraphics(graphicsIndex, container, false);
        if (!graphics) {
          failedPacket = { reason: 'graphics-allocation-failed', packetId: packet && packet.id || null, runStartIndex: run.runStartIndex };
          break;
        }
        applyPersistentGraphicsMetadata(graphics, packet, run.runStartIndex, pi);
        var reusedPersistentGraphics = false;
        var drawResult = null;
        try {
          reusedPersistentGraphics = graphics.__pixiStaticWorldPacketRenderSignature === renderSignature && graphics.__pixiStaticWorldPacketDrawOk === true;
        } catch (_) { reusedPersistentGraphics = false; }
        if (reusedPersistentGraphics) {
          drawResult = graphics.__pixiStaticWorldPacketDrawStats || { ok: true, polygonDrawCount: 1, outlineCount: 0, terrainBoundaryCount: 0, overlayCount: 0, reusedPersistentGraphics: true };
          drawResult.reusedPersistentGraphics = true;
        } else {
          clearGraphics(graphics);
          applyPersistentGraphicsMetadata(graphics, packet, run.runStartIndex, pi);
          drawResult = drawPacket(graphics, packet, projected, camera, renderTransform, deps);
          if (drawResult && drawResult.ok === true) {
            try { graphics.__pixiStaticWorldPacketRenderSignature = renderSignature; } catch (_) {}
            try { graphics.__pixiStaticWorldPacketDrawOk = true; } catch (_) {}
            try { graphics.__pixiStaticWorldPacketDrawStats = Object.assign({}, drawResult); } catch (_) {}
          }
        }
        if (!drawResult || drawResult.ok !== true) {
          failedPacket = {
            reason: drawResult && drawResult.reason || 'packet-draw-failed',
            packetId: packet && packet.id || null,
            runStartIndex: run.runStartIndex,
            pointCount: projected && Array.isArray(projected.pointsNoCamera) ? projected.pointsNoCamera.length : 0,
            loopCount: projected && Array.isArray(projected.loopsNoCamera) ? projected.loopsNoCamera.length : 0,
            worldPointCount: getPacketWorldPointCount(packet),
            worldLoopCount: getPacketWorldLoopCount(packet),
            projectionDependencyAvailable: hasProjectionDependency(deps),
            projectedRendererNeutral: !!(projected && projected.rendererNeutral),
            projectedOwner: projected && projected.owner ? String(projected.owner) : null,
            hasFill: !!(packet && packet.fill),
            hasStroke: !!(packet && packet.stroke),
            graphicsCapabilities: getGraphicsCapabilities(graphics)
          };
          break;
        }
        packetDrawCount += 1;
        if (drawResult && drawResult.reusedPersistentGraphics === true) persistentGraphicsReuseCount += 1;
        else persistentGraphicsRebuildCount += 1;
        polygonDrawCount += toNumber(drawResult.polygonDrawCount, 0);
        overlayDrawCount += toNumber(drawResult.overlayCount, 0);
        terrainBoundaryDrawCount += toNumber(drawResult.terrainBoundaryCount, 0);
        graphicsIndex += 1;
      }
      if (failedPacket) break;
    }

    if (failedPacket || packetDrawCount !== staticPacketCount) {
      clearUnusedGraphics(0);
      return rejectFrame(failedPacket && failedPacket.reason || 'incomplete-static-category-draw', {
        source: 'beginFrame',
        packetDrawCount: packetDrawCount,
        staticPacketCount: staticPacketCount,
        failedPacketId: failedPacket && failedPacket.packetId || null,
        failedRunStartIndex: failedPacket && failedPacket.runStartIndex != null ? failedPacket.runStartIndex : null,
        failedPointCount: failedPacket && failedPacket.pointCount != null ? failedPacket.pointCount : null,
        failedLoopCount: failedPacket && failedPacket.loopCount != null ? failedPacket.loopCount : null,
        failedWorldPointCount: failedPacket && failedPacket.worldPointCount != null ? failedPacket.worldPointCount : null,
        failedWorldLoopCount: failedPacket && failedPacket.worldLoopCount != null ? failedPacket.worldLoopCount : null,
        projectionDependencyAvailable: failedPacket && failedPacket.projectionDependencyAvailable === true,
        failedProjectedRendererNeutral: failedPacket && failedPacket.projectedRendererNeutral === true,
        failedProjectedOwner: failedPacket && failedPacket.projectedOwner ? failedPacket.projectedOwner : null,
        failedHasFill: failedPacket && failedPacket.hasFill === true,
        failedHasStroke: failedPacket && failedPacket.hasStroke === true,
        graphicsCapabilities: failedPacket && failedPacket.graphicsCapabilities ? failedPacket.graphicsCapabilities : null
      });
    }

    clearUnusedGraphics(graphicsIndex);
    state.activeCategoryAdopted = true;
    state.totalPacketDrawCount += packetDrawCount;
    state.totalFrameAdoptionCount += 1;
    var wallMs = Math.max(0, nowMs() - startAt);
    try { if (container && typeof container.sortChildren === 'function') container.sortChildren(); } catch (_) {}
    state.lastSummary = {
      ok: true,
      renderer: 'pixi-static-world-packet-consumer',
      step: STEP,
      phase: PHASE,
      activeBackend: getActiveBackend(),
      projectionDependencyAvailable: hasProjectionDependency(deps),
      framePlanId: state.activeFramePlanId,
      frameSeq: state.frameSeq,
      pixiDrawsStaticWorldPackets: true,
      pixiDrawsStaticPacketRuns: true,
      pixiStaticWorldConsumesFramePlanOrder: true,
      pixiStaticWorldConsumesStaticFacePackets: true,
      pixiStaticWorldUsesSharedProjectedGeometry: true,
      pixiStaticWorldUsesRendererNeutralProjectedGeometry: true,
      pixiStaticWorldUsesPacketMaterialColors: true,
      pixiStaticWorldBypassesCanvas2dBitmapRunCache: true,
      canvas2dStaticBitmapRunCacheUsedForPixi: false,
      canvas2dSkipsStaticWorldPackets: true,
      canvas2dSkipsAdoptedStaticRuns: true,
      adoptionPolicy: 'whole-static-world-face-packet-category',
      depthInterleavingMode: 'pixi-frameplan-zindex-static-plus-player',
      reusesFramePlanOrderForDepth: true,
      staticRunCount: runs.length,
      staticPacketCount: staticPacketCount,
      packetDrawCount: packetDrawCount,
      graphicsUsedCount: graphicsIndex,
      persistentGraphicsReuseEnabled: true,
      staticGraphicsReusedCount: persistentGraphicsReuseCount,
      staticGraphicsRebuiltCount: persistentGraphicsRebuildCount,
      staticGraphicsReuseRate: packetDrawCount ? Number((persistentGraphicsReuseCount / packetDrawCount).toFixed(4)) : 0,
      staticGraphicsCpuBuildAvoidedCount: persistentGraphicsReuseCount,
      projectedGeometryCacheHitCount: projectedGeometryHitCount,
      projectedGeometryCacheMissCount: projectedGeometryMissCount,
      polygonDrawCount: polygonDrawCount,
      overlayDrawCount: overlayDrawCount,
      terrainBoundaryDrawCount: terrainBoundaryDrawCount,
      drawWallMs: Number(wallMs.toFixed ? wallMs.toFixed(3) : wallMs),
      staticUsesSharedFloorReuseTransform: !!(renderTransform && renderTransform.active === true),
      staticUsesSharedRenderFrameSnapshot: !!getSharedRenderFrameSnapshot(),
      staticSharedRenderFrameSurfaceRevision: getSharedRenderFrameSnapshot() ? getSharedRenderFrameSnapshot().floorSharedSurfaceRevision : null,
      staticSharedRenderFrameTextureVersion: getSharedRenderFrameSnapshot() ? getSharedRenderFrameSnapshot().floorTextureVersion : '',
      staticSharedFloorReuseReason: renderTransform && renderTransform.reason ? String(renderTransform.reason) : '',
      staticSharedFloorReuseScale: renderTransform && renderTransform.active ? renderTransform.scale : null,
      staticSharedFloorReuseSpriteX: renderTransform && renderTransform.active ? renderTransform.spriteX : null,
      staticSharedFloorReuseSpriteY: renderTransform && renderTransform.active ? renderTransform.spriteY : null,
      staticSharedFloorReuseBuildCameraX: renderTransform && renderTransform.active ? renderTransform.floorBuildCameraX : null,
      staticSharedFloorReuseBuildCameraY: renderTransform && renderTransform.active ? renderTransform.floorBuildCameraY : null,
      staticSharedFloorReuseBuildZoom: renderTransform && renderTransform.active ? renderTransform.floorBuildZoom : null,
      staticZoomDelegateWouldHaveFallenBack: !!(zoomDelegate && zoomDelegate.delegate === true),
      staticZoomDelegateFallbackReason: zoomDelegate && zoomDelegate.reason ? String(zoomDelegate.reason) : '',
      staticFloorAlignmentProbeOk: alignmentProbe && alignmentProbe.ok === true,
      staticFloorAlignmentProbeReason: alignmentProbe && alignmentProbe.reason ? alignmentProbe.reason : '',
      staticFloorAlignmentMaxAbsError: alignmentProbe && alignmentProbe.maxAbsError != null ? alignmentProbe.maxAbsError : null,
      staticFloorAlignmentDx: alignmentProbe && alignmentProbe.dx != null ? alignmentProbe.dx : null,
      staticFloorAlignmentDy: alignmentProbe && alignmentProbe.dy != null ? alignmentProbe.dy : null,
      staticFloorAlignmentPacketId: alignmentProbe && alignmentProbe.packetId ? alignmentProbe.packetId : '',
      staticFloorAlignmentFaceMergeMode: alignmentProbe && alignmentProbe.effectiveFaceMergeMode ? alignmentProbe.effectiveFaceMergeMode : '',
      staticFloorAlignmentFloorReuseScale: alignmentProbe && alignmentProbe.floorReuseScale != null ? alignmentProbe.floorReuseScale : null,
      staticFloorAlignmentFloorReuseDx: alignmentProbe && alignmentProbe.floorReuseDx != null ? alignmentProbe.floorReuseDx : null,
      staticFloorAlignmentFloorReuseDy: alignmentProbe && alignmentProbe.floorReuseDy != null ? alignmentProbe.floorReuseDy : null,
      staticFloorAlignmentFloorTransformShouldReuse: alignmentProbe && alignmentProbe.floorTransformShouldReuse === true,
      staticFloorAlignmentFloorTransformScaled: alignmentProbe && alignmentProbe.floorTransformScaled === true,
      staticProjectionCameraX: alignmentProbe && alignmentProbe.currentCameraX != null ? alignmentProbe.currentCameraX : null,
      staticProjectionCameraY: alignmentProbe && alignmentProbe.currentCameraY != null ? alignmentProbe.currentCameraY : null,
      staticProjectionCurrentZoom: alignmentProbe && alignmentProbe.currentZoom != null ? alignmentProbe.currentZoom : null,
      floorBuildCameraXAtStaticProjection: alignmentProbe && alignmentProbe.floorBuildCameraX != null ? alignmentProbe.floorBuildCameraX : null,
      floorBuildCameraYAtStaticProjection: alignmentProbe && alignmentProbe.floorBuildCameraY != null ? alignmentProbe.floorBuildCameraY : null,
      floorBuildZoomAtStaticProjection: alignmentProbe && alignmentProbe.floorBuildZoom != null ? alignmentProbe.floorBuildZoom : null,
      diagnosticOnlyFinalCompositionProbeCompatible: true,
      source: meta && meta.source || 'beginFrame'
    };
    if (alignmentProbe) emit('static-floor-alignment-probe', alignmentProbe);
    emit('summary', state.lastSummary);
    return state.lastSummary;
  }

  function shouldSkipCanvas2dStaticRun(packets, meta, runStartIndex) {
    if (state.activeCategoryAdopted !== true) return false;
    var framePlanId = String(meta && meta.framePlanId || state.activeFramePlanId || 'frameplan:none');
    if (framePlanId !== state.activeFramePlanId) return false;
    return state.activeRunKeys[makeRunKey(framePlanId, runStartIndex)] === true;
  }

  function getLastSummary() {
    return state.lastSummary || null;
  }

  function reset(reason) {
    clearActiveRunKeys();
    state.activeCategoryAdopted = false;
    state.activeFramePlanId = '';
    clearUnusedGraphics(0);
    setContainerVisible(getPixiContainer(), false);
    try { if (container && typeof container.sortChildren === 'function') container.sortChildren(); } catch (_) {}
    state.lastSummary = {
      ok: true,
      renderer: 'pixi-static-world-packet-consumer',
      reset: true,
      reason: reason || 'reset',
      pixiDrawsStaticWorldPackets: false,
      canvas2dSkipsStaticWorldPackets: false
    };
    return state.lastSummary;
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    step: STEP,
    beginFrame: beginFrame,
    shouldSkipCanvas2dStaticRun: shouldSkipCanvas2dStaticRun,
    getLastSummary: getLastSummary,
    reset: reset
  };

  global.__SHARED_RENDER_OPTIMIZATION_PIXI_STATIC_WORLD_PACKET_CONSUMER__ = api;
  try {
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.optimization.pixiStaticWorldPacketConsumer', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
  global.App = global.App || {};
  global.App.renderer = global.App.renderer || {};
  global.App.renderer.optimization = global.App.renderer.optimization || {};
  global.App.renderer.optimization.pixiStaticWorldPacketConsumer = api;

  emit('ready', {
    ok: true,
    formalStaticWorldMigration: true,
    consumesRendererNeutralPackets: true,
    consumesCanvas2dRasterOutput: false,
    source: 'module-load'
  });
})(typeof window !== 'undefined' ? window : globalThis);
