// P12a-5: Placement preview renderer owner.
// Layer: presentation/render/preview.
//
// Owns placement preview drawing and debug cuboid face renderable helpers.
// render.js keeps compatibility wrappers only.
(function registerPlacementPreviewRenderer(global) {
  var OWNER = 'src/presentation/render/preview/placement-preview-renderer.js';

var __placedDebugFaceRenderLogCache = new Map();

function isFiveFaceDebugPrefab(prefab) {
  if (!prefab || !prefab.itemRotationDebug) return false;
  var textures = prefab.semanticTextureMap || prefab.semanticTextures || {};
  var colors = prefab.semanticFaceColors || {};
  return ['top','north','east','south','west'].every(function (key) {
    return !!((textures[key] && (textures[key].textureId || textures[key].color)) || colors[key]);
  });
}



function buildFiveFaceEntries(proto, prefab) {
  if (!proto) return [];
  var semantic = proto.semanticDirections || {};
  var colors = Object.assign({}, proto.semanticColors || {}, (prefab && prefab.semanticFaceColors) || {});
  var sourceFaces = proto.visibleSemanticFaces && proto.visibleSemanticFaces.length ? proto.visibleSemanticFaces : [
    { semantic: 'top', screenFace: 'top', color: colors.top },
    { semantic: 'north', screenFace: semantic.north || 'lowerRight', color: colors.north },
    { semantic: 'east', screenFace: semantic.east || 'lowerRight', color: colors.east },
    { semantic: 'south', screenFace: semantic.south || 'lowerLeft', color: colors.south },
    { semantic: 'west', screenFace: semantic.west || 'lowerLeft', color: colors.west }
  ];
  var seen = {};
  var entries = [];
  sourceFaces.forEach(function (entry) {
    var sem = String(entry.semantic || '').toLowerCase();
    if (!sem || seen[sem]) return;
    if (['top','north','east','south','west'].indexOf(sem) < 0) return;
    seen[sem] = true;
    entries.push({
      semantic: sem,
      screenFace: entry.screenFace || semantic[sem] || sem,
      color: entry.color || colors[sem] || '#fff',
      label: sem === 'top' ? 'TOP' : sem.toUpperCase()
    });
  });
  return entries;
}



function expandPreviewBoxesToUnitCells(previewBoxes) {
  var cells = [];
  var list = Array.isArray(previewBoxes) ? previewBoxes : [];
  list.forEach(function (box) {
    var w = Math.max(1, Math.round(Number(box && box.w) || 1));
    var d = Math.max(1, Math.round(Number(box && box.d) || 1));
    var h = Math.max(1, Math.round(Number(box && box.h) || 1));
    for (var z = 0; z < h; z++) {
      for (var y = 0; y < d; y++) {
        for (var x = 0; x < w; x++) {
          cells.push({
            x: Math.round(Number(box.x) || 0) + x,
            y: Math.round(Number(box.y) || 0) + y,
            z: Math.round(Number(box.z) || 0) + z,
            box: box
          });
        }
      }
    }
  });
  return cells;
}



function drawDebugFaceRenderable(face, alpha, valid) {
  if (!face || !Array.isArray(face.worldPts) || face.worldPts.length < 3) return false;
  var pts = screenPointsFromWorldFace(face.worldPts);
  var texture = face.texture || { textureId: face.textureId || '', kind: 'solid-color', color: face.color };
  var rawFill = getTextureFill(texture, face.color || '#fff');
  var fill = colorWithAlpha(rawFill, alpha == null ? 0.82 : alpha);
  var stroke = colorWithAlpha(rawFill, valid ? 1 : 0.68);
  drawPoly(pts, fill, stroke, 1.35);
  return true;
}




function createOccupiedKeySetFromOccupancy(occ) {
  var out = new Set();
  if (!occ) return out;
  if (occ instanceof Set) {
    occ.forEach(function (key) { out.add(String(key)); });
    return out;
  }
  if (!occ.values || typeof occ.values !== 'function') return out;
  for (const cell of occ.values()) {
    if (typeof cell === 'string') out.add(String(cell));
    else if (cell && typeof cell === 'object' && cell.x != null && cell.y != null && cell.z != null) out.add(String(cell.x) + ',' + String(cell.y) + ',' + String(cell.z));
  }
  return out;
}



function buildPlacedDebugInstanceFaceRenderables(instance, prefab, occupiedSet, viewRotationInfo) {
  if (!instance || !prefab || !isFiveFaceDebugPrefab(prefab)) return [];
  var api = getItemFacingCoreApi();
  if (!api || typeof api.buildDebugCuboidFaceRenderables !== 'function') return [];
  viewRotationInfo = viewRotationInfo || getSafeMainEditorViewRotation(null);
  var viewRotation = normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation);
  var instBoxes = boxes.filter(function (b) { return b.instanceId === instance.instanceId; });
  if (!instBoxes.length) return [];
  var cells = instBoxes.map(function (b) {
    return { x: b.x, y: b.y, z: b.z, box: b, base: b.base };
  });
  var boxByKey = {};
  cells.forEach(function (c) { boxByKey[String(c.x) + ',' + String(c.y) + ',' + String(c.z)] = c.box || null; });
  var facing = instance.rotation != null ? instance.rotation : 0;
  var renderData = api.buildDebugCuboidFaceRenderables({
    prefab: prefab,
    cells: cells,
    itemFacing: facing,
    viewRotation: viewRotation,
    ownerId: 'instance:' + String(instance.instanceId || prefab.id || 'unknown'),
    occupiedSet: occupiedSet
  });
  if (!renderData || !Array.isArray(renderData.faceRenderables) || !renderData.faceRenderables.length) return [];
  logItemRotationPrototype('main-render-face-binding-snapshot', {
    currentViewRotation: viewRotation,
    instanceId: instance.instanceId || null,
    prefabId: prefab.id || null,
    instanceFacing: facing,
    effectiveFacing: renderData.visibleSemanticFaces && typeof renderData.visibleSemanticFaces.effectiveFacing === 'number' ? renderData.visibleSemanticFaces.effectiveFacing : null,
    visibleSemanticFaces: renderData.visibleSemanticFaces && Array.isArray(renderData.visibleSemanticFaces.visibleFaces) ? renderData.visibleSemanticFaces.visibleFaces.slice() : [],
    screenFaceToSemanticFace: renderData.visibleSemanticFaces && renderData.visibleSemanticFaces.screenFaces ? renderData.visibleSemanticFaces.screenFaces : {},
    semanticFaceToTextureSlot: renderData.semanticTextureMap || {},
    emittedFaces: renderData.faceRenderables.map(function (face) {
      return {
        semanticFace: face.semanticFace || null,
        screenFace: face.screenFace || null,
        textureId: face.textureId || null,
        polygon: face.worldPts || face.polygon || [],
        depthKey: face.depthKey != null ? face.depthKey : null
      };
    })
  });
  var domainCore = getDomainSceneCoreApi();
  var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
  var renderables = renderData.faceRenderables.map(function (face) {
    var key = String(face.cell && face.cell.x || 0) + ',' + String(face.cell && face.cell.y || 0) + ',' + String(face.cell && face.cell.z || 0);
    var box = boxByKey[key] || null;
    var orderMeta = domainCore && typeof domainCore.computeVoxelRenderableSort === 'function'
      ? domainCore.computeVoxelRenderableSort({ cell: face.cell || { x: 0, y: 0, z: 0 }, box: box, viewRotation: viewRotation })
      : computeViewAwareSortMeta(face.cell || { x: 0, y: 0, z: 0 }, 1, viewRotation);
    var screenPts = screenPointsFromWorldFace(face.worldPts || face.polygon || []);
    return {
      id: 'debug-face-' + String(face.faceId || key),
      kind: 'debug-cuboid-face',
      sortKey: Number(orderMeta.sortKey || 0),
      tie: Number(orderMeta.tie || 0) + ((faceTiePrio[face.screenFace] || 0) * 0.01),
      semanticFace: face.semanticFace,
      screenFace: face.screenFace,
      textureId: face.textureId,
      texture: face.texture || null,
      textureColor: face.texture && face.texture.color || face.color || null,
      semanticTextureSlot: face.texture || null,
      semanticTextureSlotColor: face.texture && face.texture.color || face.color || null,
      fill: getTextureFill(face.texture || { textureId: face.textureId || '', kind: 'solid-color', color: face.color }, face.color || '#fff'),
      stroke: colorWithAlpha(getTextureFill(face.texture || { textureId: face.textureId || '', kind: 'solid-color', color: face.color }, face.color || '#fff'), 0.95),
      depthKey: face.depthKey,
      instanceId: instance.instanceId || null,
      prefabId: prefab.id || null,
      renderPath: 'dynamic-renderables',
      drawScreenPosition: averageScreenPoint(screenPts),
      points: screenPts,
      worldPts: face.worldPts || face.polygon || [],
      cellX: Number(face.cell && face.cell.x || 0),
      cellY: Number(face.cell && face.cell.y || 0),
      cellZ: Number(face.cell && face.cell.z || 0),
      faceKey: [instance.instanceId || 'unknown', [Number(face.cell && face.cell.x || 0), Number(face.cell && face.cell.y || 0), Number(face.cell && face.cell.z || 0)].join(','), face.semanticFace || '', face.screenFace || ''].join('|'),
      draw: function () { drawDebugFaceRenderable(face, 1, true); }
    };
  });
  var logKey = [instance.instanceId, facing, viewRotation, instBoxes.length].join('|');
  logFaceGeometryOracleChecks(renderData.faceRenderables, {
    currentViewRotation: viewRotation,
    instanceId: instance.instanceId || null,
    prefabId: prefab.id || null
  });
  if (__placedDebugFaceRenderLogCache.get(instance.instanceId) !== logKey) {
    __placedDebugFaceRenderLogCache.set(instance.instanceId, logKey);
    logItemRotationPrototype('debug-face-render', {
      mode: 'placed-instance-real-face-renderables',
      prefabId: prefab.id || null,
      instanceId: instance.instanceId || null,
      instanceFacing: facing,
      viewRotation: viewRotation,
      renderedAsRealFaces: true,
      renderedAsOverlay: false,
      helperLayerUsed: false,
      boxBaseUsedForDebugFaces: false,
      visibleSemanticFaces: renderData.visibleSemanticFaces ? renderData.visibleSemanticFaces.visibleFaces : [],
      renderedFaces: renderData.faceRenderables.map(function (f) {
        return {
          faceId: f.faceId,
          semanticFace: f.semanticFace,
          screenFace: f.screenFace,
          textureId: f.textureId,
          color: f.color,
          polygon: screenPointsFromWorldFace(f.worldPts || f.polygon || []),
          depthKey: f.depthKey,
          cell: f.cell
        };
      }),
      faceDrawOrder: renderData.faceDrawOrder || [],
      semanticTextureMap: getSemanticTextureMapForRender(prefab),
      topColor: (getSemanticTextureMapForRender(prefab).top || {}).color || null,
      northColor: (getSemanticTextureMapForRender(prefab).north || {}).color || null,
      eastColor: (getSemanticTextureMapForRender(prefab).east || {}).color || null,
      southColor: (getSemanticTextureMapForRender(prefab).south || {}).color || null,
      westColor: (getSemanticTextureMapForRender(prefab).west || {}).color || null
    });
  }
  return renderables;
}



function buildDebugPreviewFaceRenderables(args) {
  args = args || {};
  var previewPrefab = args.prefab || args.previewPrefab || null;
  var previewBoxes = Array.isArray(args.previewBoxes) ? args.previewBoxes : [];
  var facing = args.previewFacing != null ? args.previewFacing : (args.facing != null ? args.facing : 0);
  var viewRotationInfo = args.viewRotationInfo || getSafeMainEditorViewRotation(args.snapshot || null);
  var viewRotation = normalizeMainEditorViewRotationValue(
    args.viewRotation != null ? args.viewRotation : viewRotationInfo.viewRotation
  );
  var api = getItemFacingCoreApi();
  if (!api || typeof api.buildDebugCuboidFaceRenderables !== 'function') return null;
  var cells = expandPreviewBoxesToUnitCells(previewBoxes);
  return api.buildDebugCuboidFaceRenderables({
    prefab: previewPrefab,
    cells: cells,
    itemFacing: facing,
    viewRotation: viewRotation,
    ownerId: 'placement-preview:' + String(previewPrefab && previewPrefab.id || 'unknown')
  });
}



function drawDebugFiveFacePlacementPreview(previewPrefab, proto, ok, previewBoxes, viewRotationInfo) {
  viewRotationInfo = viewRotationInfo || getSafeMainEditorViewRotation(null);
  var viewRotation = normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation);
  if (!isFiveFaceDebugPrefab(previewPrefab)) return false;
  if (!editor || !editor.preview || !editor.preview.bbox) return false;
  var facing = editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue();
  var renderData = buildDebugPreviewFaceRenderables({
    prefab: previewPrefab,
    previewBoxes: previewBoxes || editor.preview.boxes || [],
    previewFacing: facing,
    viewRotation: viewRotation,
    viewRotationInfo: viewRotationInfo
  });
  if (!renderData || !Array.isArray(renderData.faceRenderables) || !renderData.faceRenderables.length) return false;
  var drawn = [];
  ctx.save();
  renderData.faceRenderables.forEach(function (face) {
    if (drawDebugFaceRenderable(face, ok ? 0.88 : 0.38, !!ok)) drawn.push(face);
  });
  ctx.restore();
  var renderedFaces = drawn.map(function (f) {
    return {
      faceId: f.faceId,
      semanticFace: f.semanticFace,
      screenFace: f.screenFace,
      textureId: f.textureId || (f.texture && f.texture.textureId) || null,
      texture: f.texture || null,
      color: f.color,
      polygon: screenPointsFromWorldFace(f.worldPts || f.polygon || []),
      depthKey: f.depthKey,
      cell: f.cell
    };
  });
  var visibleMap = renderData.visibleSemanticFaces || getSemanticFaceMappingForPreview(previewPrefab, facing);
  logItemRotationPrototype('preview-renderable-faces', {
    prefabId: previewPrefab.id || null,
    previewFacing: facing,
    viewRotation: viewRotation,
    voxelCount: expandPreviewBoxesToUnitCells(previewBoxes || editor.preview.boxes || []).length,
    faceRenderableCount: renderedFaces.length,
    sortedFaceOrder: renderedFaces.map(function (f) { return f.faceId; }),
    semanticTextureMap: getSemanticTextureMapForRender(previewPrefab),
    textureIds: renderedFaces.map(function (f) { return f.textureId; })
  });
  logItemRotationPrototype('debug-face-render', {
    mode: 'placement-preview-real-face-renderables',
    prefabId: previewPrefab.id || null,
    previewFacing: facing,
    viewRotation: viewRotation,
    renderedAsRealFaces: true,
    renderedAsOverlay: false,
    helperLayerUsed: false,
    baseMonochromeSuppressed: true,
    visibleSemanticFaces: visibleMap ? visibleMap.visibleFaces : renderedFaces.map(function (f) { return f.semanticFace; }),
    renderedFaces: renderedFaces,
    faceDrawOrder: renderedFaces.map(function (f) { return f.faceId; }),
    semanticTextureMap: getSemanticTextureMapForRender(previewPrefab),
    topTexture: getSemanticTextureMapForRender(previewPrefab).top || null,
    northTexture: getSemanticTextureMapForRender(previewPrefab).north || null,
    eastTexture: getSemanticTextureMapForRender(previewPrefab).east || null,
    southTexture: getSemanticTextureMapForRender(previewPrefab).south || null,
    westTexture: getSemanticTextureMapForRender(previewPrefab).west || null,
    topColor: (getSemanticTextureMapForRender(previewPrefab).top || {}).color || null,
    northColor: (getSemanticTextureMapForRender(previewPrefab).north || {}).color || null,
    eastColor: (getSemanticTextureMapForRender(previewPrefab).east || {}).color || null,
    southColor: (getSemanticTextureMapForRender(previewPrefab).south || {}).color || null,
    westColor: (getSemanticTextureMapForRender(previewPrefab).west || {}).color || null,
    footprint: editor.preview.bbox ? { w: editor.preview.bbox.w, d: editor.preview.bbox.d, h: editor.preview.bbox.h } : null,
    origin: editor.preview.origin || null,
    valid: !!editor.preview.valid
  });
  return true;
}




function drawPlacementPreview() {
  if (!editor.preview) return;
  var previewBoxes = editor.preview.boxes || [];
  if (!previewBoxes.length) return;
  var b = editor.preview.box;
  var ok = editor.preview.valid;
  var fill = ok ? 'rgba(54, 201, 108, .22)' : 'rgba(240, 73, 73, .22)';
  var stroke = ok ? 'rgba(80, 255, 148, 1)' : 'rgba(255, 84, 84, 1)';
  var proto = editor.mode === 'drag' && editor.draggingInstance ? prefabVariant(getPrefabById(editor.draggingInstance.prefabId), editor.draggingInstance.rotation || 0) : currentProto();
  var origin = editor.preview.origin || null;

  var previewPrefab = editor.mode === 'drag' && editor.draggingInstance ? getPrefabById(editor.draggingInstance.prefabId) : currentProto();
  var viewRotationInfo = getSafeMainEditorViewRotation(null);
  logRenderDependency('main-editor-view-rotation', {
    hasViewRotation: viewRotationInfo.hasViewRotation,
    viewRotation: viewRotationInfo.viewRotation,
    fallbackUsed: viewRotationInfo.fallbackUsed,
    source: viewRotationInfo.source,
    previewFacing: editor.preview && editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue(),
    prefabId: previewPrefab && previewPrefab.id || null
  });
  var previewShift = previewPrefab && previewPrefab.kind === 'habbo_import'
    ? getHabboProxyVisualShift(previewPrefab, editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue())
    : { x: 0, y: 0 };

  if (origin) {
    withScreenTranslate(previewShift, function () {
      for (var i = 0; i < (proto.supportCells || []).length; i++) {
        var support = proto.supportCells[i];
        var p0 = iso(origin.x + support.x,     origin.y + support.y,     origin.z + support.localZ);
        var p1 = iso(origin.x + support.x + 1, origin.y + support.y,     origin.z + support.localZ);
        var p2 = iso(origin.x + support.x + 1, origin.y + support.y + 1, origin.z + support.localZ);
        var p3 = iso(origin.x + support.x,     origin.y + support.y + 1, origin.z + support.localZ);
        drawPoly([p0, p1, p2, p3], fill, stroke, 2.5);
      }
    });
  }

  var occ = buildOccupancy(previewBoxes);
  var drewFiveFacePreview = false;
  withScreenTranslate(previewShift, function () {
    if (previewPrefab && isFiveFaceDebugPrefab(previewPrefab)) {
      drewFiveFacePreview = drawDebugFiveFacePlacementPreview(previewPrefab, proto, ok, previewBoxes, viewRotationInfo);
    }
    if (!drewFiveFacePreview) {
      for (var cell of occ.values()) drawVoxelCell({ x: cell.x, y: cell.y, z: cell.z, base: cell.box.base }, occ, ok ? 0.42 : 0.22);
    }
  });
  if (origin) {
    if (previewPrefab && prefabHasSprite(previewPrefab)) {
      if (previewPrefab.kind === 'habbo_import') {
        detailLog('[place-trace] src/presentation/render/preview/placement-preview-renderer.js::drawPlacementPreview preview-habbo-sprite prefab=' + previewPrefab.id + ' origin=(' + [origin.x, origin.y, origin.z].join(',') + ') rotation=' + String(editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue()) + ' valid=' + ok + ' proxyShift=(' + [previewShift.x || 0, previewShift.y || 0].join(',') + ')');
      }
      drawPrefabSpriteAt(previewPrefab, Object.assign({}, origin, { rotation: editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue() }), ok ? 0.78 : 0.42);
    }
  }

  ctx.fillStyle = stroke;
  ctx.font = '13px sans-serif';
  var labelPt = b
    ? iso(b.x, b.y, b.z + b.h)
    : (origin
        ? iso(origin.x, origin.y, origin.z + 1)
        : iso(previewBoxes[0].x, previewBoxes[0].y, previewBoxes[0].z + 1));
  var labelX = labelPt.x + 6;
  var labelY = labelPt.y - 8;
  var status = ok
    ? `${b.name} 体素=${previewBoxes.length} 尺寸 ${b.w}×${b.d}×${b.h}`
    : `不可放置：${editor.preview.reason} / prefab=${editor.preview.prefabId || proto.id || 'n/a'} / 体素=${previewBoxes.length}`;
  ctx.fillText(status, labelX, labelY);
  if (!ok && editor.preview.reason === 'player' && origin) {
    ctx.fillText(`阻挡：玩家占位 (${origin.x}, ${origin.y}, z=${origin.z})`, labelX, labelY - 16);
  }
}





  var api = {
    isFiveFaceDebugPrefab: isFiveFaceDebugPrefab,
    buildFiveFaceEntries: buildFiveFaceEntries,
    expandPreviewBoxesToUnitCells: expandPreviewBoxesToUnitCells,
    drawDebugFaceRenderable: drawDebugFaceRenderable,
    createOccupiedKeySetFromOccupancy: createOccupiedKeySetFromOccupancy,
    buildPlacedDebugInstanceFaceRenderables: buildPlacedDebugInstanceFaceRenderables,
    buildDebugPreviewFaceRenderables: buildDebugPreviewFaceRenderables,
    drawDebugFiveFacePlacementPreview: drawDebugFiveFacePlacementPreview,
    drawPlacementPreview: drawPlacementPreview
  };
  global.__APP_PRESENTATION_PLACEMENT_PREVIEW_RENDERER__ = api;
  global.__PLACEMENT_PREVIEW_RENDERER__ = api;
  global.IsometricPlacementPreviewRenderer = api;
})(typeof window !== 'undefined' ? window : globalThis);
