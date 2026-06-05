// P8c: Canvas 2D static world face draw pass.
// Layer: presentation/render/renderer.
//
// Owns Canvas2D drawing for static world face/voxel render packets and the
// packet projection cache used by that draw path. Runtime state and adjacent
// renderer helpers are injected by render.js; this file must not own scene
// protocols, renderable assembly, ordering, or domain rules.
(function registerCanvas2dStaticWorldFaceDrawPass(global) {
  function asNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function getSettings(deps) {
    try {
      if (deps && typeof deps.getSettings === 'function') return deps.getSettings() || {};
    } catch (_) {}
    return deps && deps.settings ? deps.settings : {};
  }

  function getProjectionZoomSignature(deps) {
    try {
      if (deps && typeof deps.getMainEditorZoomValueForRender === 'function') {
        var zoom = Number(deps.getMainEditorZoomValueForRender());
        return Number.isFinite(zoom) ? Number(zoom.toFixed ? zoom.toFixed(6) : zoom) : 1;
      }
    } catch (_) {}
    try {
      if (deps && typeof deps.getCurrentZoom === 'function') {
        var zoom2 = Number(deps.getCurrentZoom());
        return Number.isFinite(zoom2) ? Number(zoom2.toFixed ? zoom2.toFixed(6) : zoom2) : 1;
      }
    } catch (_) {}
    return 1;
  }

  function getProjectionConfigSignature(deps) {
    var settings = getSettings(deps);
    return [
      Number(settings && settings.tileW || 0),
      Number(settings && settings.tileH || 0),
      Number(settings && settings.originX || 0),
      Number(settings && settings.originY || 0),
      getProjectionZoomSignature(deps)
    ].join(',');
  }

  function getProjectionMetadata(deps) {
    var settings = getSettings(deps);
    return {
      projectionZoom: getProjectionZoomSignature(deps),
      projectionTileW: Number(settings && settings.tileW || 0),
      projectionTileH: Number(settings && settings.tileH || 0),
      projectionOriginX: Number(settings && settings.originX || 0),
      projectionOriginY: Number(settings && settings.originY || 0)
    };
  }

  function getCamera(deps) {
    return deps && deps.camera ? deps.camera : {};
  }

  function noop() {}

  function callScreenPointsFromWorldFaceNoCamera(deps, worldPts, viewRotation) {
    var fn = deps && typeof deps.screenPointsFromWorldFaceNoCamera === 'function'
      ? deps.screenPointsFromWorldFaceNoCamera
      : null;
    return fn ? fn(worldPts || [], viewRotation) : [];
  }

  function projectWorldSegment(seg, viewRotation, deps) {
    var list = Array.isArray(seg) ? seg : [];
    return [
      callScreenPointsFromWorldFaceNoCamera(deps, [list[0] || {}], viewRotation)[0] || null,
      callScreenPointsFromWorldFaceNoCamera(deps, [list[1] || {}], viewRotation)[0] || null
    ];
  }

  function getTerrainTopBoundaryRenderDebugSignature(deps) {
    var fn = deps && typeof deps.getTerrainTopBoundaryRenderDebugSignature === 'function'
      ? deps.getTerrainTopBoundaryRenderDebugSignature
      : null;
    return fn ? fn() : '';
  }

  function buildStaticWorldPacketProjectionCacheKey(packet, viewRotation, deps) {
    var settings = getSettings(deps);
    var worldLoops = Array.isArray(packet && packet.worldLoops) ? packet.worldLoops : [];
    var worldOutlineSegments = Array.isArray(packet && packet.worldOutlineSegments) ? packet.worldOutlineSegments : [];
    return [
      Number(viewRotation || 0),
      Number(settings && settings.tileW || 0),
      Number(settings && settings.tileH || 0),
      Number(settings && settings.originX || 0),
      Number(settings && settings.originY || 0),
      getProjectionZoomSignature(deps),
      getProjectionConfigSignature(deps),
      String(packet && packet.fill || ''),
      String(packet && packet.stroke || ''),
      Number(packet && packet.width || 1),
      Array.isArray(packet && packet.worldPts) ? packet.worldPts.length : 0,
      worldLoops.length,
      worldLoops.map(function (loop) { return Array.isArray(loop) ? loop.length : 0; }).join(','),
      worldOutlineSegments.length,
      Array.isArray(packet && packet.terrainBoundarySegmentsWorld) ? packet.terrainBoundarySegmentsWorld.length : 0,
      Number(packet && packet.terrainBoundaryStrokeWidth || 0),
      String(packet && packet.terrainBoundaryStroke || ''),
      getTerrainTopBoundaryRenderDebugSignature(deps),
      Array.isArray(packet && packet.shadowOverlaysWorld) ? packet.shadowOverlaysWorld.length : 0,
      packet && packet.id ? String(packet.id) : '',
      'projection-key-version=07.12O'
    ].join('|');
  }

  function getStaticWorldProjectedGeometryCacheApi() {
    try { return global.__STATIC_WORLD_PROJECTED_GEOMETRY_CACHE__ || null; } catch (_) {}
    return null;
  }

  function buildLocalRendererNeutralProjectedGeometryFallback(packet, viewRotation, deps) {
    if (!packet) return null;
    var cacheKey = buildStaticWorldPacketProjectionCacheKey(packet, viewRotation, deps);
    var cached = packet.__staticWorldProjectedGeometryCache || null;
    if (cached && cached.key === cacheKey) {
      packet.__lastStaticPacketCacheState = {
        geometryCacheHit: true,
        overlayCacheHit: true,
        overlayCount: Array.isArray(cached.overlaysNoCamera) ? cached.overlaysNoCamera.length : 0,
        rendererNeutral: true,
        localCanvas2dFallback: true
      };
      return cached;
    }
    var pointsNoCamera = callScreenPointsFromWorldFaceNoCamera(deps, packet.worldPts || [], viewRotation);
    var loopsNoCamera = Array.isArray(packet.worldLoops) && packet.worldLoops.length
      ? packet.worldLoops.map(function (loop) { return callScreenPointsFromWorldFaceNoCamera(deps, loop || [], viewRotation); }).filter(function (loop) { return Array.isArray(loop) && loop.length >= 3; })
      : [];
    var outlineSegmentsNoCamera = Array.isArray(packet.worldOutlineSegments) && packet.worldOutlineSegments.length
      ? packet.worldOutlineSegments.map(function (seg) { return projectWorldSegment(seg, viewRotation, deps); }).filter(function (seg) { return Array.isArray(seg) && seg[0] && seg[1]; })
      : [];
    var terrainBoundarySegmentsNoCamera = Array.isArray(packet.terrainBoundarySegmentsWorld) && packet.terrainBoundarySegmentsWorld.length
      ? packet.terrainBoundarySegmentsWorld.map(function (seg) { return projectWorldSegment(seg, viewRotation, deps); }).filter(function (seg) { return Array.isArray(seg) && seg[0] && seg[1]; })
      : [];
    var worldShadowOverlaysToNoCamera = deps && typeof deps.worldShadowOverlaysToNoCamera === 'function'
      ? deps.worldShadowOverlaysToNoCamera
      : null;
    var overlaysNoCamera = Array.isArray(packet.shadowOverlaysWorld) && packet.shadowOverlaysWorld.length && worldShadowOverlaysToNoCamera
      ? worldShadowOverlaysToNoCamera(packet.shadowOverlaysWorld || [], viewRotation)
      : [];
    var projectionMetadata = getProjectionMetadata(deps);
    cached = {
      key: cacheKey,
      projectionZoom: projectionMetadata.projectionZoom,
      projectionTileW: projectionMetadata.projectionTileW,
      projectionTileH: projectionMetadata.projectionTileH,
      projectionOriginX: projectionMetadata.projectionOriginX,
      projectionOriginY: projectionMetadata.projectionOriginY,
      pointsNoCamera: pointsNoCamera,
      loopsNoCamera: loopsNoCamera,
      outlineSegmentsNoCamera: outlineSegmentsNoCamera,
      terrainBoundarySegmentsNoCamera: terrainBoundarySegmentsNoCamera,
      overlaysNoCamera: overlaysNoCamera,
      rendererNeutral: true,
      excludesCanvas2dPath2D: true,
      localCanvas2dFallback: true
    };
    packet.__staticWorldProjectedGeometryCache = cached;
    packet.__lastStaticPacketCacheState = {
      geometryCacheHit: false,
      overlayCacheHit: false,
      overlayCount: overlaysNoCamera.length,
      rendererNeutral: true,
      localCanvas2dFallback: true
    };
    return cached;
  }

  function getStaticWorldPacketProjectedGeometry(packet, viewRotation, deps) {
    if (!packet) return null;
    var neutralApi = getStaticWorldProjectedGeometryCacheApi();
    var neutral = neutralApi && typeof neutralApi.getStaticWorldPacketProjectedGeometry === 'function'
      ? neutralApi.getStaticWorldPacketProjectedGeometry(packet, viewRotation, deps)
      : buildLocalRendererNeutralProjectedGeometryFallback(packet, viewRotation, deps);
    if (!neutral) return null;

    var cacheKey = String(neutral.key || '') + '|canvas2d-path2d';
    var cached = packet.__projectedDrawCache || null;
    if (cached && cached.key === cacheKey) {
      packet.__lastStaticPacketCacheState = Object.assign({}, packet.__lastStaticPacketCacheState || {}, {
        canvas2dPathCacheHit: true,
        rendererNeutralGeometryCache: true
      });
      return cached;
    }

    var buildPath2DFromLoops = deps && typeof deps.buildPath2DFromLoops === 'function' ? deps.buildPath2DFromLoops : function () { return null; };
    var buildPath2DFromPoints = deps && typeof deps.buildPath2DFromPoints === 'function' ? deps.buildPath2DFromPoints : function () { return null; };
    var buildPath2DFromSegments = deps && typeof deps.buildPath2DFromSegments === 'function' ? deps.buildPath2DFromSegments : function () { return null; };
    var loopsNoCamera = Array.isArray(neutral.loopsNoCamera) ? neutral.loopsNoCamera : [];
    var pointsNoCamera = Array.isArray(neutral.pointsNoCamera) ? neutral.pointsNoCamera : [];
    var outlineSegmentsNoCamera = Array.isArray(neutral.outlineSegmentsNoCamera) ? neutral.outlineSegmentsNoCamera : [];
    var terrainBoundarySegmentsNoCamera = Array.isArray(neutral.terrainBoundarySegmentsNoCamera) ? neutral.terrainBoundarySegmentsNoCamera : [];

    cached = {
      key: cacheKey,
      neutralKey: neutral.key,
      projectionZoom: neutral.projectionZoom,
      projectionTileW: neutral.projectionTileW,
      projectionTileH: neutral.projectionTileH,
      projectionOriginX: neutral.projectionOriginX,
      projectionOriginY: neutral.projectionOriginY,
      pointsNoCamera: pointsNoCamera,
      loopsNoCamera: loopsNoCamera,
      outlineSegmentsNoCamera: outlineSegmentsNoCamera,
      terrainBoundarySegmentsNoCamera: terrainBoundarySegmentsNoCamera,
      overlaysNoCamera: Array.isArray(neutral.overlaysNoCamera) ? neutral.overlaysNoCamera : [],
      path2d: loopsNoCamera.length ? buildPath2DFromLoops(loopsNoCamera) : buildPath2DFromPoints(pointsNoCamera),
      strokePath2d: outlineSegmentsNoCamera.length ? buildPath2DFromSegments(outlineSegmentsNoCamera) : null,
      terrainBoundaryPath2d: terrainBoundarySegmentsNoCamera.length ? buildPath2DFromSegments(terrainBoundarySegmentsNoCamera) : null,
      rendererNeutralGeometryCache: true
    };
    packet.__projectedDrawCache = cached;
    packet.__lastStaticPacketCacheState = Object.assign({}, packet.__lastStaticPacketCacheState || {}, {
      canvas2dPathCacheHit: false,
      rendererNeutralGeometryCache: true
    });
    return cached;
  }

  function getTerrainTopBoundaryStrokeWidthForPacket(packet, deps) {
    var fn = deps && typeof deps.getTerrainTopBoundaryStrokeWidthForPacket === 'function'
      ? deps.getTerrainTopBoundaryStrokeWidthForPacket
      : null;
    return fn ? fn(packet) : 0;
  }

  function getTerrainTopBoundaryStrokeStyleForPacket(packet, deps) {
    var fn = deps && typeof deps.getTerrainTopBoundaryStrokeStyleForPacket === 'function'
      ? deps.getTerrainTopBoundaryStrokeStyleForPacket
      : null;
    return fn ? fn(packet) : '';
  }

  function drawTerrainTopBoundarySegmentsForPacket(targetCtx, packet, projected, deps) {
    if (!targetCtx || !packet || !projected) return;
    var width = getTerrainTopBoundaryStrokeWidthForPacket(packet, deps);
    var stroke = getTerrainTopBoundaryStrokeStyleForPacket(packet, deps);
    if (!width || !stroke) return;
    var path = projected.terrainBoundaryPath2d || null;
    var segments = Array.isArray(projected.terrainBoundarySegmentsNoCamera) ? projected.terrainBoundarySegmentsNoCamera : [];
    if (!path && !segments.length) return;
    targetCtx.save();
    targetCtx.strokeStyle = stroke;
    targetCtx.lineWidth = width;
    targetCtx.lineJoin = 'round';
    targetCtx.lineCap = 'round';
    if (path) {
      targetCtx.stroke(path);
    } else {
      targetCtx.beginPath();
      for (var i = 0; i < segments.length; i++) {
        var seg = segments[i];
        if (!Array.isArray(seg) || !seg[0] || !seg[1]) continue;
        targetCtx.moveTo(Number(seg[0].x || 0), Number(seg[0].y || 0));
        targetCtx.lineTo(Number(seg[1].x || 0), Number(seg[1].y || 0));
      }
      targetCtx.stroke();
    }
    targetCtx.restore();
  }

  function drawCachedVoxelRenderable(item, deps) {
    var drawPoly = deps && typeof deps.drawPoly === 'function' ? deps.drawPoly : noop;
    var drawFaceShadowOverlays = deps && typeof deps.drawFaceShadowOverlays === 'function' ? deps.drawFaceShadowOverlays : noop;
    var ctx = deps && deps.ctx ? deps.ctx : null;
    if (!item || !Array.isArray(item.faces)) return;
    for (var i = 0; i < item.faces.length; i++) {
      var face = item.faces[i];
      drawPoly(face.points, face.fill, face.stroke, face.width || 1);
      drawFaceShadowOverlays(ctx, face.points, face.shadowOverlays);
    }
    if (item.debugFoot && ctx) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(item.debugFoot.x, item.debugFoot.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function buildStrokePathFromLoops(loops, buildPath2DFromSegments) {
    if (typeof buildPath2DFromSegments !== 'function') return null;
    var segments = (loops || []).reduce(function (acc, loop) {
      if (!Array.isArray(loop) || loop.length < 2) return acc;
      for (var i = 0; i < loop.length; i++) acc.push([loop[i], loop[(i + 1) % loop.length]]);
      return acc;
    }, []);
    return buildPath2DFromSegments(segments);
  }

  function drawCachedVoxelFaceRenderable(item, deps) {
    if (!item) return;
    var ctx = deps && deps.ctx ? deps.ctx : null;
    if (!ctx) return;
    var points = Array.isArray(item.points) ? item.points : [];
    var loops = Array.isArray(item.loops) ? item.loops : [];
    if (!points.length && !loops.length) return;
    var buildPath2DFromLoops = deps && typeof deps.buildPath2DFromLoops === 'function' ? deps.buildPath2DFromLoops : function () { return null; };
    var buildPath2DFromPoints = deps && typeof deps.buildPath2DFromPoints === 'function' ? deps.buildPath2DFromPoints : function () { return null; };
    var buildPath2DFromSegments = deps && typeof deps.buildPath2DFromSegments === 'function' ? deps.buildPath2DFromSegments : function () { return null; };
    var path2d = loops.length ? buildPath2DFromLoops(loops) : buildPath2DFromPoints(points);
    var strokePath2d = loops.length ? buildStrokePathFromLoops(loops, buildPath2DFromSegments) : null;
    var applyTerrainMaterialPatternOverlay = deps && typeof deps.applyTerrainMaterialPatternOverlay === 'function'
      ? deps.applyTerrainMaterialPatternOverlay
      : noop;
    var drawPoly = deps && typeof deps.drawPoly === 'function' ? deps.drawPoly : noop;
    var drawFaceShadowOverlays = deps && typeof deps.drawFaceShadowOverlays === 'function' ? deps.drawFaceShadowOverlays : noop;

    if (path2d) {
      ctx.save();
      if (item.fill) {
        ctx.fillStyle = item.fill;
        if (loops.length) ctx.fill(path2d, 'evenodd');
        else ctx.fill(path2d);
      }
      applyTerrainMaterialPatternOverlay(ctx, loops.length ? (loops[0] || []) : points, path2d, 0, 0, item);
      if (item.stroke) {
        ctx.strokeStyle = item.stroke;
        ctx.lineWidth = item.width || 1;
        if (strokePath2d) ctx.stroke(strokePath2d);
        else ctx.stroke(path2d);
      }
      ctx.restore();
    } else if (points.length) {
      drawPoly(points, item.fill, item.stroke, item.width || 1);
      applyTerrainMaterialPatternOverlay(ctx, points, null, 0, 0, item);
    }
    drawFaceShadowOverlays(ctx, points.length ? points : (loops[0] || []), item.shadowOverlays || []);
  }

  function drawStaticWorldFacePacket(packet, deps) {
    if (!packet) return;
    var ctx = deps && deps.ctx ? deps.ctx : null;
    if (!ctx) return;
    var camera = getCamera(deps);
    var offsetX = asNumber(camera && camera.x, 0);
    var offsetY = asNumber(camera && camera.y, 0);
    var normalizeViewRotation = deps && typeof deps.normalizeMainEditorViewRotationValue === 'function'
      ? deps.normalizeMainEditorViewRotationValue
      : function (value) { return Number(value || 0); };
    var getSafeViewRotation = deps && typeof deps.getSafeMainEditorViewRotation === 'function'
      ? deps.getSafeMainEditorViewRotation
      : function () { return { viewRotation: 0 }; };
    var currentViewRotation = normalizeViewRotation(getSafeViewRotation(null).viewRotation);
    var projected = getStaticWorldPacketProjectedGeometry(packet, currentViewRotation, deps);
    var pointsNoCamera = projected && Array.isArray(projected.pointsNoCamera) ? projected.pointsNoCamera : [];
    var loopsNoCamera = projected && Array.isArray(projected.loopsNoCamera) ? projected.loopsNoCamera : [];
    if (!pointsNoCamera.length && !loopsNoCamera.length) return;

    var applyTerrainMaterialPatternOverlay = deps && typeof deps.applyTerrainMaterialPatternOverlay === 'function'
      ? deps.applyTerrainMaterialPatternOverlay
      : noop;
    var drawFaceShadowOverlaysNoCamera = deps && typeof deps.drawFaceShadowOverlaysNoCamera === 'function'
      ? deps.drawFaceShadowOverlaysNoCamera
      : noop;
    var drawPolyWithOffset = deps && typeof deps.drawPolyWithOffset === 'function' ? deps.drawPolyWithOffset : noop;
    var worldShadowOverlaysToNoCamera = deps && typeof deps.worldShadowOverlaysToNoCamera === 'function'
      ? deps.worldShadowOverlaysToNoCamera
      : function () { return []; };

    if (projected && projected.path2d) {
      ctx.save();
      if (offsetX || offsetY) ctx.translate(offsetX, offsetY);
      if (packet.fill) {
        ctx.fillStyle = packet.fill;
        if (loopsNoCamera.length) ctx.fill(projected.path2d, 'evenodd');
        else ctx.fill(projected.path2d);
      }
      applyTerrainMaterialPatternOverlay(ctx, loopsNoCamera.length ? (loopsNoCamera[0] || []) : pointsNoCamera, projected.path2d, 0, 0, packet);
      if (packet.stroke) {
        ctx.strokeStyle = packet.stroke;
        ctx.lineWidth = packet.width || 1;
        if (projected.strokePath2d) ctx.stroke(projected.strokePath2d);
        else ctx.stroke(projected.path2d);
      }
      if (Array.isArray(projected.overlaysNoCamera) && projected.overlaysNoCamera.length) {
        drawFaceShadowOverlaysNoCamera(ctx, pointsNoCamera, projected.overlaysNoCamera, 0, 0);
      }
      drawTerrainTopBoundarySegmentsForPacket(ctx, packet, projected, deps);
      ctx.restore();
      return;
    }

    drawPolyWithOffset(pointsNoCamera, offsetX, offsetY, packet.fill, packet.stroke, packet.width || 1);
    applyTerrainMaterialPatternOverlay(ctx, pointsNoCamera, null, offsetX, offsetY, packet);
    drawFaceShadowOverlaysNoCamera(
      ctx,
      pointsNoCamera,
      projected && projected.overlaysNoCamera ? projected.overlaysNoCamera : worldShadowOverlaysToNoCamera(packet.shadowOverlaysWorld || [], currentViewRotation),
      offsetX,
      offsetY
    );
    if (projected && Array.isArray(projected.terrainBoundarySegmentsNoCamera) && projected.terrainBoundarySegmentsNoCamera.length) {
      ctx.save();
      if (offsetX || offsetY) ctx.translate(offsetX, offsetY);
      drawTerrainTopBoundarySegmentsForPacket(ctx, packet, projected, deps);
      ctx.restore();
    }
  }

  var api = {
    layer: 'presentation/render/renderer',
    phase: 'P8c',
    buildStaticWorldPacketProjectionCacheKey: buildStaticWorldPacketProjectionCacheKey,
    getStaticWorldPacketProjectedGeometry: getStaticWorldPacketProjectedGeometry,
    drawTerrainTopBoundarySegmentsForPacket: drawTerrainTopBoundarySegmentsForPacket,
    drawCachedVoxelRenderable: drawCachedVoxelRenderable,
    drawCachedVoxelFaceRenderable: drawCachedVoxelFaceRenderable,
    drawStaticWorldFacePacket: drawStaticWorldFacePacket
  };

  global.__CANVAS2D_STATIC_WORLD_FACE_DRAW_PASS__ = api;
  global.__APP_PRESENTATION_CANVAS2D_STATIC_WORLD_FACE_DRAW_PASS__ = api;
  global.IsometricCanvas2dStaticWorldFaceDrawPass = api;
  if (global.App) {
    global.App.presentation = global.App.presentation || {};
    global.App.presentation.render = global.App.presentation.render || {};
    global.App.presentation.render.canvas2dStaticWorldFaceDrawPass = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
