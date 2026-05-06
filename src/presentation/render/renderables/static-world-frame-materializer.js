// P11a-5: Static world frame renderable materialization helpers.
// Layer: presentation/render/renderables.
//
// Owns conversion from already-built static voxel/face packets into frame
// renderables. Dependencies still owned by render.js, domain ordering, and the
// Canvas2D draw pass are injected by the caller. This module must not read scene
// runtime globals directly and must not own Canvas drawing/compositing.
(function registerStaticWorldFrameMaterializer(global) {
  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function getAverageScreenPoint(deps) {
    if (deps && typeof deps.averageScreenPoint === 'function') return deps.averageScreenPoint;
    throw new Error('static-world-frame-materializer requires injected averageScreenPoint dependency');
  }

  function getDrawCachedVoxelFaceRenderable(deps) {
    if (deps && typeof deps.drawCachedVoxelFaceRenderable === 'function') return deps.drawCachedVoxelFaceRenderable;
    throw new Error('static-world-frame-materializer requires injected drawCachedVoxelFaceRenderable dependency');
  }

  function getScreenPointsFromWorldFace(deps) {
    if (deps && typeof deps.screenPointsFromWorldFace === 'function') return deps.screenPointsFromWorldFace;
    throw new Error('static-world-frame-materializer requires injected screenPointsFromWorldFace dependency');
  }

  function getWorldShadowOverlaysToScreen(deps) {
    if (deps && typeof deps.worldShadowOverlaysToScreen === 'function') return deps.worldShadowOverlaysToScreen;
    throw new Error('static-world-frame-materializer requires injected worldShadowOverlaysToScreen dependency');
  }

  function getCompareRenderablesByDomain(deps) {
    if (deps && typeof deps.compareRenderablesByDomain === 'function') return deps.compareRenderablesByDomain;
    throw new Error('static-world-frame-materializer requires injected compareRenderablesByDomain dependency');
  }

  function computeVoxelSortMeta(faceCell, baseRenderable, viewRotation, deps) {
    var domainCore = deps && typeof deps.getDomainSceneCoreApi === 'function' ? deps.getDomainSceneCoreApi() : null;
    if (domainCore && typeof domainCore.computeVoxelRenderableSort === 'function') {
      return domainCore.computeVoxelRenderableSort({ cell: faceCell, box: baseRenderable && baseRenderable.box || null, viewRotation: viewRotation });
    }
    if (deps && typeof deps.computeViewAwareSortMeta === 'function') {
      return deps.computeViewAwareSortMeta(faceCell, 1, viewRotation);
    }
    return { sortKey: 0, tie: 0 };
  }

  function buildStaticVoxelFaceRenderable(baseRenderable, face, faceIndex, viewRotation, deps) {
    deps = deps || {};
    if (!baseRenderable || !face) return null;
    var averageScreenPoint = getAverageScreenPoint(deps);
    var drawCachedVoxelFaceRenderable = getDrawCachedVoxelFaceRenderable(deps);
    var faceCell = face.cell || { x: asNumber(baseRenderable.cellX, 0), y: asNumber(baseRenderable.cellY, 0), z: asNumber(baseRenderable.cellZ, 0) };
    var orderMeta = computeVoxelSortMeta(faceCell, baseRenderable, viewRotation, deps) || { sortKey: 0, tie: 0 };
    var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
    var centroid = averageScreenPoint(asArray(face.points));
    return {
      id: String(baseRenderable.id || 'voxel') + '::' + String(face.semanticFace || face.screenFace || faceIndex),
      kind: 'voxel-face',
      sortKey: asNumber(orderMeta.sortKey, 0),
      tie: asNumber(orderMeta.tie, 0) + ((faceTiePrio[face.screenFace] || 0) * 0.01),
      instanceId: baseRenderable.instanceId || null,
      prefabId: baseRenderable.prefabId || null,
      renderPath: 'static-cache-face',
      cacheViewRotation: viewRotation,
      cacheSignature: baseRenderable.cacheSignature || null,
      drawUsedSemanticTextureMapping: !!baseRenderable.drawUsedSemanticTextureMapping,
      drawScreenPosition: { x: Math.round(asNumber(centroid.x, 0)), y: Math.round(asNumber(centroid.y, 0)) },
      semanticFace: face.semanticFace || null,
      screenFace: face.screenFace || null,
      depthKey: face.depthKey != null ? face.depthKey : faceIndex,
      points: asArray(face.points),
      fill: face.fill,
      stroke: face.stroke,
      texture: face.texture || null,
      textureColor: face.textureColor || null,
      semanticTextureSlot: face.semanticTextureSlot || null,
      semanticTextureSlotColor: face.semanticTextureSlotColor || null,
      width: face.width || 1,
      shadowOverlays: face.shadowOverlays || [],
      worldPts: face.worldPts || null,
      box: baseRenderable.box || null,
      cellX: asNumber(faceCell.x, 0),
      cellY: asNumber(faceCell.y, 0),
      cellZ: asNumber(faceCell.z, 0),
      faceKey: [
        baseRenderable.instanceId || 'unknown',
        [asNumber(faceCell.x, 0), asNumber(faceCell.y, 0), asNumber(faceCell.z, 0)].join(','),
        face.semanticFace || '',
        face.screenFace || ''
      ].join('|'),
      draw: function () { drawCachedVoxelFaceRenderable(this); }
    };
  }

  function flattenStaticVoxelRenderable(baseRenderable, viewRotation, deps) {
    if (!baseRenderable) return [];
    var faces = asArray(baseRenderable.faces);
    if (!faces.length) return [];
    var out = [];
    for (var i = 0; i < faces.length; i++) {
      var faceRenderable = buildStaticVoxelFaceRenderable(baseRenderable, faces[i], i, viewRotation, deps);
      if (faceRenderable) out.push(faceRenderable);
    }
    return out;
  }

  function materializeStaticWorldFacePacket(packet, deps) {
    deps = deps || {};
    if (!packet || typeof packet !== 'object') return null;
    var screenPointsFromWorldFace = getScreenPointsFromWorldFace(deps);
    var averageScreenPoint = getAverageScreenPoint(deps);
    var worldShadowOverlaysToScreen = getWorldShadowOverlaysToScreen(deps);
    var drawCachedVoxelFaceRenderable = getDrawCachedVoxelFaceRenderable(deps);
    var points = screenPointsFromWorldFace(packet.worldPts || []);
    var loops = asArray(packet.worldLoops).map(function (loop) {
      return screenPointsFromWorldFace(loop || []);
    }).filter(function (loop) {
      return Array.isArray(loop) && loop.length >= 3;
    });
    var centroid = averageScreenPoint(points.length ? points : (loops[0] || []));
    return Object.assign({}, packet, {
      renderPath: 'static-world-frame-face',
      points: points,
      loops: loops,
      shadowOverlays: worldShadowOverlaysToScreen(packet.shadowOverlaysWorld || []),
      drawScreenPosition: { x: Math.round(asNumber(centroid.x, 0)), y: Math.round(asNumber(centroid.y, 0)) },
      draw: function () { drawCachedVoxelFaceRenderable(this); }
    });
  }

  function materializeStaticWorldFrameRenderables(packets, deps) {
    deps = deps || {};
    var list = asArray(packets);
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var item = materializeStaticWorldFacePacket(list[i], deps);
      if (item) out.push(item);
    }
    out.sort(getCompareRenderablesByDomain(deps));
    return out;
  }

  var api = {
    layer: 'presentation/render/renderables',
    phase: 'P11a-5',
    buildStaticVoxelFaceRenderable: buildStaticVoxelFaceRenderable,
    flattenStaticVoxelRenderable: flattenStaticVoxelRenderable,
    materializeStaticWorldFacePacket: materializeStaticWorldFacePacket,
    materializeStaticWorldFrameRenderables: materializeStaticWorldFrameRenderables
  };

  global.IsometricStaticWorldFrameMaterializer = api;
  global.__STATIC_WORLD_FRAME_MATERIALIZER__ = api;
  global.__APP_PRESENTATION_STATIC_WORLD_FRAME_MATERIALIZER__ = api;
})(typeof window !== 'undefined' ? window : globalThis);
