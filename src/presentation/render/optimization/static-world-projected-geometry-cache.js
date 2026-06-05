// PXM-07.12H: Renderer-neutral static-world projected geometry cache.
// Layer: presentation/render/optimization.
//
// This module owns only renderer-neutral projection products for static-world
// face packets. It does not know about Canvas2D Path2D, Canvas2D bitmap caches,
// Pixi Graphics, or any backend selection. Canvas2D and PixiJS both consume this
// cache as an optimization source.
(function registerStaticWorldProjectedGeometryCache(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/static-world-projected-geometry-cache.js';
  var STEP = 'PXM-07.12O';

  var warnedMissingProjectionDependency = false;

  function emit(section, payload) {
    var parts = ['[pixi-migration][step=' + STEP + '][static-world-projected-geometry-cache.' + String(section || 'event') + ']'];
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

  function callScreenPointsFromWorldFaceNoCamera(deps, worldPts, viewRotation) {
    var fn = deps && typeof deps.screenPointsFromWorldFaceNoCamera === 'function'
      ? deps.screenPointsFromWorldFaceNoCamera
      : null;
    if (!fn) {
      if (!warnedMissingProjectionDependency) {
        warnedMissingProjectionDependency = true;
        emit('missing-projection-dependency', {
          ok: false,
          reason: 'deps.screenPointsFromWorldFaceNoCamera-missing',
          worldPointCount: Array.isArray(worldPts) ? worldPts.length : 0,
          viewRotation: Number(viewRotation || 0),
          source: 'callScreenPointsFromWorldFaceNoCamera'
        });
      }
      return [];
    }
    return fn(worldPts || [], viewRotation) || [];
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

  function getStaticWorldPacketProjectedGeometry(packet, viewRotation, deps) {
    if (!packet) return null;
    var cacheKey = buildStaticWorldPacketProjectionCacheKey(packet, viewRotation, deps);
    var cached = packet.__staticWorldProjectedGeometryCache || null;
    if (cached && cached.key === cacheKey) {
      packet.__lastStaticPacketCacheState = {
        geometryCacheHit: true,
        overlayCacheHit: true,
        overlayCount: Array.isArray(cached.overlaysNoCamera) ? cached.overlaysNoCamera.length : 0,
        rendererNeutral: true
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
      owner: OWNER,
      step: STEP
    };
    packet.__staticWorldProjectedGeometryCache = cached;
    packet.__lastStaticPacketCacheState = {
      geometryCacheHit: false,
      overlayCacheHit: false,
      overlayCount: overlaysNoCamera.length,
      rendererNeutral: true
    };
    return cached;
  }

  var api = {
    layer: 'presentation/render/optimization',
    phase: STEP,
    owner: OWNER,
    rendererNeutral: true,
    buildStaticWorldPacketProjectionCacheKey: buildStaticWorldPacketProjectionCacheKey,
    getStaticWorldPacketProjectedGeometry: getStaticWorldPacketProjectedGeometry
  };

  global.__STATIC_WORLD_PROJECTED_GEOMETRY_CACHE__ = api;
  if (global.App) {
    global.App.renderer = global.App.renderer || {};
    global.App.renderer.optimization = global.App.renderer.optimization || {};
    global.App.renderer.optimization.staticWorldProjectedGeometryCache = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
