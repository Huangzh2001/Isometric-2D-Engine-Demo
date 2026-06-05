// P12a-5: Placement preview renderer owner.
// Layer: presentation/render/preview.
//
// Owns placement preview drawing and debug cuboid face renderable helpers.
// render.js keeps compatibility wrappers only.
(function registerPlacementPreviewRenderer(global) {
  var OWNER = 'src/presentation/render/preview/placement-preview-renderer.js';

var __placedDebugFaceRenderLogCache = new Map();
var __lastStairPlacementPreviewDrawTraceSignature = "";
var __lastPixiPreviewAlignmentTraceSignature = "";
var __lastPixiPreviewAlignmentTraceAt = 0;


function summarizeStairTraceBoxes(boxes) {
  var list = Array.isArray(boxes) ? boxes : [];
  return list.map(function (b, i) {
    return {
      i: i,
      id: b && b.id != null ? b.id : null,
      instanceId: b && b.instanceId || null,
      prefabId: b && b.prefabId || null,
      role: b && b.stairRole || null,
      localIndex: b && b.localIndex != null ? b.localIndex : null,
      x: Number(b && b.x || 0),
      y: Number(b && b.y || 0),
      z: Number(b && b.z || 0),
      w: Number(b && b.w != null ? b.w : 1),
      d: Number(b && b.d != null ? b.d : 1),
      h: Number(b && b.h != null ? b.h : 1)
    };
  });
}

function emitStairPlacementPreviewTrace(phase, payload) {
  payload = payload || {};
  payload.phase = String(phase || 'unknown');
  payload.source = payload.source || 'src/presentation/render/preview/placement-preview-renderer.js';
  try {
    var line = '[STAIR-PLACE-TRACE] ' + JSON.stringify(payload);
    if (typeof detailLog === 'function') detailLog(line);
    else if (typeof pushLog === 'function') pushLog(line);
    else if (global && typeof global.detailLog === 'function') global.detailLog(line);
    else if (global && typeof global.pushLog === 'function') global.pushLog(line);
    else if (global && global.console && typeof global.console.log === 'function') global.console.log(line);
  } catch (_) {}
}

function roundPreviewDiagNumber(value, digits) {
  var n = Number(value);
  if (!Number.isFinite(n)) return null;
  var m = Math.pow(10, digits == null ? 2 : digits);
  return Math.round(n * m) / m;
}

function calculatePointDelta(a, b) {
  if (!a || !b) return null;
  var dx = Number(a.x || 0) - Number(b.x || 0);
  var dy = Number(a.y || 0) - Number(b.y || 0);
  return {
    dx: roundPreviewDiagNumber(dx, 2),
    dy: roundPreviewDiagNumber(dy, 2),
    distance: roundPreviewDiagNumber(Math.sqrt(dx * dx + dy * dy), 2)
  };
}

function calculateBoundsCenter(bounds) {
  if (!bounds) return null;
  return {
    x: roundPreviewDiagNumber(Number(bounds.x || 0) + Number(bounds.width || 0) * 0.5, 2),
    y: roundPreviewDiagNumber(Number(bounds.y || 0) + Number(bounds.height || 0) * 0.5, 2)
  };
}

function isPointInsideBounds(point, bounds) {
  if (!point || !bounds) return false;
  var x = Number(point.x || 0);
  var y = Number(point.y || 0);
  return x >= Number(bounds.x || 0) && x <= Number(bounds.maxX != null ? bounds.maxX : Number(bounds.x || 0) + Number(bounds.width || 0)) &&
    y >= Number(bounds.y || 0) && y <= Number(bounds.maxY != null ? bounds.maxY : Number(bounds.y || 0) + Number(bounds.height || 0));
}

function getPreviewAlignmentMouseSnapshot() {
  try {
    if (typeof mouse !== 'undefined' && mouse) return {
      x: roundPreviewDiagNumber(mouse.x, 2),
      y: roundPreviewDiagNumber(mouse.y, 2),
      inside: mouse.inside === true
    };
  } catch (_) {}
  return null;
}

function getPixiPreviewAlignmentCandidateSnapshot() {
  try {
    if (global && global.__PIXI_PREVIEW_ALIGNMENT_LAST_CANDIDATE__) return global.__PIXI_PREVIEW_ALIGNMENT_LAST_CANDIDATE__;
  } catch (_) {}
  return null;
}

function getPixiPreviewAlignmentPixiSnapshot() {
  try {
    if (global && global.__PIXI_PREVIEW_ALIGNMENT_LAST_PIXI__) return global.__PIXI_PREVIEW_ALIGNMENT_LAST_PIXI__;
  } catch (_) {}
  return null;
}

function emitPixiPreviewAlignmentTrace(phase, payload, options) {
  payload = payload || {};
  options = options || {};
  payload.phase = String(phase || 'unknown');
  payload.source = payload.source || 'src/presentation/render/preview/placement-preview-renderer.js';
  payload.timestamp = Date.now();
  try { if (global) global.__PIXI_PREVIEW_ALIGNMENT_LAST__ = payload; } catch (_) {}
  try {
    var line = '[PIXI-PREVIEW-ALIGNMENT] ' + JSON.stringify(payload);
    var now = Date.now();
    var sig = JSON.stringify({
      phase: payload.phase,
      prefabId: payload.prefabId || null,
      mouse: payload.mouse || null,
      origin: payload.origin || null,
      previewBounds: payload.previewScreenBounds || null,
      pixiBounds: payload.pixiPreview && payload.pixiPreview.graphicsBoundsUnion || null,
      pointerInsidePreviewBounds: payload.pointerInsidePreviewBounds === true
    });
    if (!options.force && sig === __lastPixiPreviewAlignmentTraceSignature && now - __lastPixiPreviewAlignmentTraceAt < 900) return;
    if (!options.force && now - __lastPixiPreviewAlignmentTraceAt < 280) return;
    __lastPixiPreviewAlignmentTraceSignature = sig;
    __lastPixiPreviewAlignmentTraceAt = now;
    if (typeof detailLog === 'function') detailLog(line);
    else if (typeof pushLog === 'function') pushLog(line);
    else if (global && typeof global.detailLog === 'function') global.detailLog(line);
    else if (global && typeof global.pushLog === 'function') global.pushLog(line);
    else if (global && global.console && typeof global.console.log === 'function') global.console.log(line);
  } catch (_) {}
}

function buildPreviewAlignmentSnapshot(args) {
  args = args || {};
  var previewBoxes = Array.isArray(args.previewBoxes) ? args.previewBoxes : [];
  var origin = args.origin || null;
  var mouseSnapshot = getPreviewAlignmentMouseSnapshot();
  var mousePoint = mouseSnapshot ? { x: Number(mouseSnapshot.x || 0), y: Number(mouseSnapshot.y || 0) } : null;
  var previewScreenBounds = calculatePreviewBoxScreenBounds(previewBoxes);
  var previewBoundsCenter = calculateBoundsCenter(previewScreenBounds);
  var originScreen = origin ? iso(origin.x, origin.y, origin.z || 0) : null;
  var originTopScreen = origin ? iso(origin.x, origin.y, Number(origin.z || 0) + 1) : null;
  var footprintCenterScreen = null;
  try {
    var bbox = args.bbox || null;
    if (bbox) {
      var cx = Number(bbox.x || 0) + Number(bbox.w || 0) * 0.5;
      var cy = Number(bbox.y || 0) + Number(bbox.d || 0) * 0.5;
      var cz = Number(bbox.z || 0);
      footprintCenterScreen = iso(cx, cy, cz);
    } else if (origin) {
      footprintCenterScreen = iso(Number(origin.x || 0) + 0.5, Number(origin.y || 0) + 0.5, Number(origin.z || 0));
    }
  } catch (_) {}
  function pt(p) { return p ? { x: roundPreviewDiagNumber(p.x, 2), y: roundPreviewDiagNumber(p.y, 2) } : null; }
  return {
    prefabId: args.prefabId || null,
    activeBackend: isPixiBackendActiveForPlacementPreview() ? 'pixi' : 'non-pixi',
    mode: (typeof editor !== 'undefined' && editor && editor.mode) ? String(editor.mode) : null,
    mouse: mouseSnapshot,
    origin: origin || null,
    rotation: args.rotation != null ? Number(args.rotation) : null,
    valid: args.valid === true,
    reason: args.reason || null,
    box: args.box || null,
    bbox: args.bbox || null,
    previewBoxCount: previewBoxes.length,
    previewScreenBounds: previewScreenBounds ? {
      x: roundPreviewDiagNumber(previewScreenBounds.x, 2),
      y: roundPreviewDiagNumber(previewScreenBounds.y, 2),
      width: roundPreviewDiagNumber(previewScreenBounds.width, 2),
      height: roundPreviewDiagNumber(previewScreenBounds.height, 2),
      maxX: roundPreviewDiagNumber(previewScreenBounds.maxX, 2),
      maxY: roundPreviewDiagNumber(previewScreenBounds.maxY, 2)
    } : null,
    previewBoundsCenter: previewBoundsCenter,
    pointerInsidePreviewBounds: isPointInsideBounds(mousePoint, previewScreenBounds),
    pointerDeltaToPreviewBoundsCenter: calculatePointDelta(mousePoint, previewBoundsCenter),
    originScreen: pt(originScreen),
    originTopScreen: pt(originTopScreen),
    footprintCenterScreen: pt(footprintCenterScreen),
    pointerDeltaToOriginScreen: calculatePointDelta(mousePoint, originScreen),
    pointerDeltaToFootprintCenter: calculatePointDelta(mousePoint, footprintCenterScreen),
    candidate: getPixiPreviewAlignmentCandidateSnapshot(),
    pixiPreview: getPixiPreviewAlignmentPixiSnapshot()
  };
}

function calculateScreenBoundsFromPoints(points) {
  var pts = Array.isArray(points) ? points : [];
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < pts.length; i++) {
    var x = Number(pts[i] && pts[i].x || 0);
    var y = Number(pts[i] && pts[i].y || 0);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return { x: minX, y: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY), maxX: maxX, maxY: maxY };
}

function calculatePreviewBoxScreenBounds(previewBoxes) {
  var list = Array.isArray(previewBoxes) ? previewBoxes : [];
  var all = [];
  for (var i = 0; i < list.length; i++) {
    var b = list[i] || {};
    var x = Number(b.x || 0);
    var y = Number(b.y || 0);
    var z = Number(b.z || 0);
    var w = Math.max(0.001, Number(b.w != null ? b.w : 1) || 1);
    var d = Math.max(0.001, Number(b.d != null ? b.d : 1) || 1);
    var h = Math.max(0.001, Number(b.h != null ? b.h : 1) || 1);
    var corners = [
      iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z),
      iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)
    ];
    all.push.apply(all, corners);
  }
  return calculateScreenBoundsFromPoints(all);
}

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


function hasFractionalPreviewAabb(previewBoxes) {
  var list = Array.isArray(previewBoxes) ? previewBoxes : [];
  for (var i = 0; i < list.length; i++) {
    var box = list[i] || {};
    var values = [
      box.x, box.y, box.z,
      box.w != null ? box.w : 1,
      box.d != null ? box.d : 1,
      box.h != null ? box.h : 1
    ];
    for (var j = 0; j < values.length; j++) {
      var n = Number(values[j]);
      if (!Number.isFinite(n)) continue;
      if (Math.abs(n - Math.round(n)) > 1e-6) return true;
    }
  }
  return false;
}

function drawFractionalAabbPlacementPreview(previewBoxes, alpha) {
  if (typeof buildSurfaceFaces !== 'function') return false;
  var list = Array.isArray(previewBoxes) ? previewBoxes : [];
  if (!list.length) return false;
  var faces = buildSurfaceFaces(list, alpha == null ? 0.42 : alpha, false);
  if (!Array.isArray(faces) || !faces.length) return false;
  faces.sort(function (a, b) {
    return Number(a && a.fallbackDepth || 0) - Number(b && b.fallbackDepth || 0);
  });
  for (var i = 0; i < faces.length; i++) {
    if (faces[i] && typeof faces[i].draw === 'function') faces[i].draw();
  }
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





function isPixiBackendActiveForPlacementPreview() {
  try {
    var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
    var snapshot = selection && typeof selection.getSnapshot === 'function' ? selection.getSnapshot() : null;
    if (snapshot && String(snapshot.activeBackend || '') === 'pixi') return true;
  } catch (_) {}
  try {
    var api = global.App && global.App.renderer && global.App.renderer.active;
    if (api && String(api.backend || '') === 'pixi') return true;
  } catch (_) {}
  return false;
}

function getPixiPlacementPreviewConsumer() {
  try { return global.__SHARED_RENDER_OPTIMIZATION_PIXI_DYNAMIC_RENDERABLE_CONSUMER__ || null; } catch (_) {}
  return null;
}

function emitPixiWorldOwnerPlacementTrace(phase, payload) {
  payload = payload || {};
  payload.phase = String(phase || 'unknown');
  payload.source = payload.source || 'src/presentation/render/preview/placement-preview-renderer.js';
  try {
    var line = '[PIXI-WORLD-OWNER] ' + JSON.stringify(payload);
    if (typeof detailLog === 'function') detailLog(line);
    else if (typeof pushLog === 'function') pushLog(line);
    else if (global && typeof global.detailLog === 'function') global.detailLog(line);
    else if (global && typeof global.pushLog === 'function') global.pushLog(line);
    else if (global && global.console && typeof global.console.log === 'function') global.console.log(line);
  } catch (_) {}
}

function clearPixiPlacementPreview(reason) {
  var consumer = getPixiPlacementPreviewConsumer();
  if (consumer && typeof consumer.clearPlacementPreview === 'function') {
    try { return consumer.clearPlacementPreview(reason || 'placement-preview-null'); } catch (_) {}
  }
  return null;
}


function buildPreviewPrimitivesForPixi(previewPrefab, origin, rotation) {
  if (!previewPrefab || !origin) return [];
  try {
    var expander = null;
    if (typeof expandInstanceToPrimitives === 'function') expander = expandInstanceToPrimitives;
    else if (global && global.__PLACEMENT_CORE_API__ && typeof global.__PLACEMENT_CORE_API__.expandInstanceToPrimitives === 'function') expander = global.__PLACEMENT_CORE_API__.expandInstanceToPrimitives;
    if (!expander) return [];
    return expander({
      instanceId: 'placement-preview',
      prefabId: previewPrefab.id,
      x: Number(origin.x || 0),
      y: Number(origin.y || 0),
      z: Number(origin.z || 0),
      rotation: rotation != null ? rotation : 0,
      base: previewPrefab.base || null,
      microTri: editor && editor.preview ? editor.preview.microTri || null : null,
      compatibleAxis: editor && editor.preview ? editor.preview.compatibleAxis || null : null
    }, false, { source: 'placement-preview:primitive-preview' }) || [];
  } catch (_) {
    return [];
  }
}

function drawPlacementPreviewInPixi(previewPrefab, previewBoxes, previewPrimitives, ok, origin, rotation, reason) {
  if (!isPixiBackendActiveForPlacementPreview()) return { ok: false, reason: 'pixi-backend-inactive' };
  var consumer = getPixiPlacementPreviewConsumer();
  if (!consumer || typeof consumer.drawPlacementPreview !== 'function') return { ok: false, reason: 'pixi-placement-preview-consumer-missing' };
  try {
    var summary = consumer.drawPlacementPreview({
      prefabId: previewPrefab && previewPrefab.id || 'unknown',
      previewBoxes: previewBoxes || [],
      previewPrimitives: previewPrimitives || [],
      valid: !!ok,
      alpha: ok ? 0.42 : 0.22,
      origin: origin || null,
      rotation: rotation != null ? rotation : null,
      reason: reason || 'ok',
      source: 'placement-preview-renderer.drawPlacementPreviewInPixi'
    }) || { ok: false, reason: 'pixi-placement-preview-returned-null' };
    return summary;
  } catch (err) {
    return { ok: false, reason: 'pixi-placement-preview-exception:' + String(err && err.message || err) };
  }
}

function drawPlacementPreview() {
  if (!editor.preview) {
    clearPixiPlacementPreview('editor-preview-null');
    return;
  }
  var previewBoxes = editor.preview.boxes || [];
  if (!previewBoxes.length) {
    var clearSummary = clearPixiPlacementPreview(editor.preview && editor.preview.reason ? String(editor.preview.reason) : 'preview-boxes-empty');
    try {
      emitPixiPreviewAlignmentTrace('preview-cleared-empty-boxes', {
        prefabId: editor.preview && editor.preview.prefabId || (currentProto() && currentProto().id) || null,
        valid: false,
        reason: editor.preview && editor.preview.reason || 'preview-boxes-empty',
        previewBoxCount: 0,
        pixiClearSummary: clearSummary || null,
        pixiDrawsPlacementPreview: false,
        canvas2dSkipsPlacementPreviewWorld: true
      }, { force: true });
    } catch (_) {}
    return;
  }
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

  try {
    if (previewPrefab && /^stair_mc_(2|4|8)step$/.test(String(previewPrefab.id || ''))) {
      var previewHasFractionalForTrace = hasFractionalPreviewAabb(previewBoxes);
      var tracePayload = {
        prefabId: previewPrefab.id || null,
        origin: origin || null,
        rotation: editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue(),
        valid: !!ok,
        reason: editor.preview.reason || 'ok',
        box: editor.preview.box || null,
        bbox: editor.preview.bbox || null,
        previewHasFractionalAabb: previewHasFractionalForTrace,
        drawPath: previewHasFractionalForTrace ? 'fractional-aabb-buildSurfaceFaces' : 'integer-occupancy-drawVoxelCell',
        screenBoundsBeforeShift: calculatePreviewBoxScreenBounds(previewBoxes),
        previewShift: { x: Number(previewShift.x || 0), y: Number(previewShift.y || 0) },
        boxes: summarizeStairTraceBoxes(previewBoxes)
      };
      var sig = JSON.stringify(tracePayload);
      if (sig !== __lastStairPlacementPreviewDrawTraceSignature) {
        __lastStairPlacementPreviewDrawTraceSignature = sig;
        emitStairPlacementPreviewTrace('preview-draw', tracePayload);
      }
    }
  } catch (_) {}


  var previewRotation = editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue();
  var previewPrimitives = buildPreviewPrimitivesForPixi(previewPrefab, origin, previewRotation);
  var previewPixiSummary = drawPlacementPreviewInPixi(
    previewPrefab,
    previewBoxes,
    previewPrimitives,
    ok,
    origin,
    previewRotation,
    editor.preview.reason || 'ok'
  );
  var pixiWorldPreviewDrawn = !!(previewPixiSummary && previewPixiSummary.pixiDrawsPlacementPreview === true);
  try {
    if (previewPrimitives && previewPrimitives.length) {
      var triTrace = { phase: 'preview-primitives', prefabId: previewPrefab && previewPrefab.id || null, primitiveCount: previewPrimitives.length, origin: origin || null, rotation: previewRotation, pixiDrawn: pixiWorldPreviewDrawn, source: 'src/presentation/render/preview/placement-preview-renderer.js' };
      var triLine = '[TRI-PRISM-TRACE] ' + JSON.stringify(triTrace);
      if (typeof detailLog === 'function') detailLog(triLine); else if (typeof pushLog === 'function') pushLog(triLine);
    }
  } catch (_) {}
  try {
    var alignmentSnapshot = buildPreviewAlignmentSnapshot({
      prefabId: previewPrefab && previewPrefab.id || null,
      previewBoxes: previewBoxes,
      previewPrimitives: previewPrimitives,
      origin: origin,
      rotation: editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue(),
      valid: !!ok,
      reason: editor.preview.reason || 'ok',
      box: editor.preview.box || null,
      bbox: editor.preview.bbox || null
    });
    alignmentSnapshot.pixiDrawsPlacementPreview = pixiWorldPreviewDrawn;
    alignmentSnapshot.canvas2dSkipsPlacementPreviewWorld = pixiWorldPreviewDrawn;
    alignmentSnapshot.previewPixiSummary = previewPixiSummary || null;
    emitPixiPreviewAlignmentTrace('preview-draw-alignment', alignmentSnapshot, { force: /^stair_mc_(2|4|8)step$/.test(String(previewPrefab && previewPrefab.id || '')) });
  } catch (_) {}
  if (pixiWorldPreviewDrawn) {
    emitPixiWorldOwnerPlacementTrace('placement-preview-canvas2d-suppressed', {
      ok: true,
      activeBackend: 'pixi',
      prefabId: previewPrefab && previewPrefab.id || null,
      pixiDrawsPlacementPreview: true,
      canvas2dSkipsPlacementPreviewWorld: true,
      previewBoxCount: Array.isArray(previewBoxes) ? previewBoxes.length : 0,
      previewPrimitiveCount: Array.isArray(previewPrimitives) ? previewPrimitives.length : 0,
      origin: origin || null,
      rotation: editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue(),
      note: 'Canvas2D keeps only HUD/status text; world-space placement preview is Pixi-owned.'
    });
  } else if (isPixiBackendActiveForPlacementPreview()) {
    emitPixiWorldOwnerPlacementTrace('placement-preview-pixi-miss', {
      ok: false,
      activeBackend: 'pixi',
      prefabId: previewPrefab && previewPrefab.id || null,
      reason: previewPixiSummary && previewPixiSummary.reason || 'unknown',
      canvas2dFallbackWouldDrawWorldPreview: true
    });
  }

  if (!pixiWorldPreviewDrawn && origin) {
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

  function makePreviewVoxelDrawCellFromOccupancyCell(occCell) {
    var box = occCell && occCell.box || {};
    return {
      x: occCell && occCell.x,
      y: occCell && occCell.y,
      z: occCell && occCell.z,
      base: box.base,
      box: box,
      prefabId: box.prefabId || null,
      shapeKind: box.shapeKind || null,
      slopeDirection: box.slopeDirection != null ? String(box.slopeDirection) : null,
      rotation: box.rotation != null ? box.rotation : null
    };
  }

  var previewHasFractionalAabb = hasFractionalPreviewAabb(previewBoxes);
  var occ = previewHasFractionalAabb ? null : buildOccupancy(previewBoxes);
  var drewFiveFacePreview = false;
  if (!pixiWorldPreviewDrawn) {
    withScreenTranslate(previewShift, function () {
      if (previewPrefab && isFiveFaceDebugPrefab(previewPrefab)) {
        drewFiveFacePreview = drawDebugFiveFacePlacementPreview(previewPrefab, proto, ok, previewBoxes, viewRotationInfo);
      }
      if (!drewFiveFacePreview) {
        if (previewHasFractionalAabb) {
          var drewFractionalPreview = drawFractionalAabbPlacementPreview(previewBoxes, ok ? 0.42 : 0.22);
          if (!drewFractionalPreview) {
            var fallbackOcc = buildOccupancy(previewBoxes);
            for (var fallbackCell of fallbackOcc.values()) drawVoxelCell(makePreviewVoxelDrawCellFromOccupancyCell(fallbackCell), fallbackOcc, ok ? 0.42 : 0.22);
          }
        } else {
          for (var cell of occ.values()) drawVoxelCell(makePreviewVoxelDrawCellFromOccupancyCell(cell), occ, ok ? 0.42 : 0.22);
        }
      }
    });
  }
  if (!pixiWorldPreviewDrawn && origin) {
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
    hasFractionalPreviewAabb: hasFractionalPreviewAabb,
    drawFractionalAabbPlacementPreview: drawFractionalAabbPlacementPreview,
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
