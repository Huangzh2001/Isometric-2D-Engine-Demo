// P12a-5: Projection debug overlay owner.
// Layer: presentation/render/debug.
//
// Owns selected-instance projection diagnostics and item-facing prototype overlay.
// render.js keeps compatibility wrappers only.
(function registerProjectionDebugOverlay(global) {
  var OWNER = 'src/presentation/render/debug/projection-debug-overlay.js';

function drawSelectedInstanceProjectionDebug() {
  if (typeof shadowDebugDetailed !== 'undefined' && !shadowDebugDetailed) return;
  var inst = getSelectedInstance();
  if (!inst) return;
  var light = activeLight ? activeLight() : ((typeof getLightingRenderLights === 'function' ? getLightingRenderLights() : lights) || [])[0];
  if (!light) return;
  if (typeof collectInstanceShadowProjectionDebug !== 'function') return;
  var debug = collectInstanceShadowProjectionDebug(inst.instanceId, light);
  if (!debug || !debug.rays || !debug.rays.length) return;

  for (var i = 0; i < debug.hitFaces.length; i++) {
    var face = debug.hitFaces[i];
    var stroke = face.kind === 'top' ? 'rgba(255,220,120,0.92)' : (face.kind === 'east' ? 'rgba(255,140,220,0.92)' : 'rgba(120,255,180,0.92)');
    drawWorldFaceOutline(face.pts, stroke, 1.25);
  }

  var lines = [];
  var hitCount = 0;
  for (var r = 0; r < debug.rays.length; r++) {
    var ray = debug.rays[r];
    var srcScreen = iso(ray.src.x, ray.src.y, ray.src.z);
    drawScreenPointMarker(srcScreen, 'rgba(90,220,255,0.96)', 'rgba(0,0,0,0.65)', 3.5);
    ctx.fillStyle = 'rgba(90,220,255,0.96)';
    ctx.font = '11px monospace';
    ctx.fillText(String(ray.index), srcScreen.x + 5, srcScreen.y - 5);
    if (ray.bestHit) {
      hitCount += 1;
      drawWorldPolyline([ray.src, ray.bestHit.point], 'rgba(255,235,120,0.92)', 1.5, null);
      var hitScreen = iso(ray.bestHit.point.x, ray.bestHit.point.y, ray.bestHit.point.z);
      drawScreenPointMarker(hitScreen, 'rgba(255,235,120,0.98)', 'rgba(0,0,0,0.75)', 4.2);
      ctx.fillStyle = 'rgba(255,235,120,0.98)';
      ctx.font = '11px monospace';
      ctx.fillText(ray.bestHit.receiverKind + '@' + ray.bestHit.receiverOwnerKey, hitScreen.x + 6, hitScreen.y - 6);
      lines.push('#' + ray.index + ' ' + fmt3Shadow(ray.src) + ' -> ' + ray.bestHit.receiverKind + '/' + ray.bestHit.receiverOwnerKey + ' ' + fmt3Shadow(ray.bestHit.point) + ' dir=(' + ray.bestHit.dirSign.x + ',' + ray.bestHit.dirSign.y + ',' + ray.bestHit.dirSign.z + ')');
    } else {
      drawWorldPolyline([ray.src, ray.missFar], 'rgba(255,120,120,0.7)', 1.0, [4, 3]);
      var missScreen = iso(ray.missFar.x, ray.missFar.y, ray.missFar.z);
      drawScreenPointMarker(missScreen, 'rgba(255,120,120,0.78)', null, 2.8);
      lines.push('#' + ray.index + ' ' + fmt3Shadow(ray.src) + ' -> miss dir=(' + (ray.dir.x>=0?'+':'-') + ',' + (ray.dir.y>=0?'+':'-') + ',' + (ray.dir.z>=0?'+':'-') + ')');
    }
  }

  var anchor = debug.bounds ? iso(debug.bounds.minX, debug.bounds.minY, debug.bounds.maxZ) : iso(debug.rays[0].src.x, debug.rays[0].src.y, debug.rays[0].src.z);
  var panelX = Math.min(VIEW_W - 460, Math.max(16, anchor.x + 16));
  var panelY = Math.max(90, anchor.y - 18);
  var rowCount = Math.min(8, lines.length);
  var panelW = 440;
  var panelH = 28 + rowCount * 16;
  ctx.save();
  ctx.fillStyle = 'rgba(8,12,20,0.82)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(110,180,255,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.fillStyle = 'rgba(230,244,255,0.96)';
  ctx.font = '12px monospace';
  var title = '投影调试 ' + inst.instanceId + ' / light=' + String(light.name || light.id || light.type) + ' hits=' + hitCount + '/' + debug.rays.length + ' dir=(' + debug.lightDirSign.x + ',' + debug.lightDirSign.y + ',' + debug.lightDirSign.z + ')';
  ctx.fillText(title, panelX + 8, panelY + 16);
  for (var li = 0; li < rowCount; li++) ctx.fillText(lines[li], panelX + 8, panelY + 34 + li * 16);
  ctx.restore();
}




function getFacingFacePolygons(bounds) {
  if (!bounds) return null;
  var pts = cubePoints(bounds.x, bounds.y, bounds.z, bounds.w, bounds.d, bounds.h);
  return {
    top: [pts.p001, pts.p101, pts.p111, pts.p011],
    north: [pts.p001, pts.p101, pts.p100, pts.p000],
    east: [pts.p101, pts.p111, pts.p110, pts.p100],
    south: [pts.p011, pts.p111, pts.p110, pts.p010],
    west: [pts.p001, pts.p011, pts.p010, pts.p000]
  };
}



function buildFacingOverlayPrototype(prefab, rotation, instance) {
  var facingApi = getItemFacingCoreApi();
  if (!facingApi || typeof facingApi.buildFacingPrototype !== 'function') return null;
  return facingApi.buildFacingPrototype(prefab, rotation, instance || null);
}




function drawFacingLegendPanel(proto, anchorPoint) {
  if (!proto || !anchorPoint) return;
  var colors = proto.semanticColors || {};
  var entries = [
    ['TOP', colors.top],
    ['NORTH', colors.north],
    ['EAST', colors.east],
    ['SOUTH', colors.south],
    ['WEST', colors.west]
  ];
  var x = Math.round(anchorPoint.x + 14);
  var y = Math.round(anchorPoint.y - 70);
  ctx.save();
  ctx.fillStyle = 'rgba(10,15,24,0.82)';
  ctx.fillRect(x, y, 146, 86);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.strokeRect(x, y, 146, 86);
  ctx.fillStyle = 'rgba(230,240,255,0.96)';
  ctx.font = '11px monospace';
  ctx.fillText('Facing ' + String(proto.facingLabel || '?') + ' · ' + String(proto.spriteStrategy || 'single'), x + 8, y + 14);
  for (var i = 0; i < entries.length; i++) {
    var rowY = y + 30 + i * 11;
    ctx.fillStyle = entries[i][1] || '#fff';
    ctx.fillRect(x + 8, rowY - 8, 10, 8);
    ctx.fillStyle = 'rgba(230,240,255,0.96)';
    ctx.fillText(entries[i][0], x + 24, rowY);
  }
  ctx.restore();
}



function drawItemFacingPrototypeOverlay() {
  if (!ui.showItemFacingDebug || !ui.showItemFacingDebug.checked) return;
  var target = null;
  var bounds = null;
  var prefab = null;
  var rotation = 0;
  var anchorPoint = null;

  if (editor && editor.mode === 'place' && editor.preview && editor.preview.bbox) {
    prefab = currentPrefab();
    rotation = editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue();
    bounds = editor.preview.bbox ? { x: editor.preview.bbox.x, y: editor.preview.bbox.y, z: editor.preview.bbox.z, w: editor.preview.bbox.w, d: editor.preview.bbox.d, h: editor.preview.bbox.h } : null;
    target = Object.assign({}, editor.preview.origin || {}, { rotation: rotation });
    anchorPoint = bounds ? iso(bounds.x, bounds.y, bounds.z + bounds.h) : null;
  } else {
    var inst = getSelectedInstance();
    if (!inst) return;
    prefab = getPrefabById(inst.prefabId);
    rotation = inst.rotation || 0;
    var b = getInstanceProxyBounds(inst);
    if (!b) return;
    bounds = { x: b.minX, y: b.minY, z: b.minZ, w: b.maxX - b.minX, d: b.maxY - b.minY, h: b.maxZ - b.minZ };
    target = inst;
    anchorPoint = iso(bounds.x, bounds.y, bounds.z + bounds.h);
  }

  var proto = buildFacingOverlayPrototype(prefab, rotation, target);
  if (!proto || !bounds) return;
  if (editor && editor.mode === 'place' && isFiveFaceDebugPrefab(prefab)) return;
  var polys = getFacingFacePolygons(bounds);
  if (!polys) return;
  var semantic = proto.semanticDirections || {};
  var colors = proto.semanticColors || {};
  var faces = (proto.visibleSemanticFaces && proto.visibleSemanticFaces.length) ? proto.visibleSemanticFaces.map(function (entry) {
    return { semantic: entry.semantic, dir: entry.screenFace || semantic[entry.semantic] || entry.semantic, color: entry.color || colors[entry.semantic], label: String(entry.semantic || '?').slice(0, 1).toUpperCase() };
  }) : [
    { semantic: 'top', dir: 'top', color: colors.top, label: 'T' },
    { semantic: 'north', dir: semantic.north || 'north', color: colors.north, label: 'N' },
    { semantic: 'east', dir: semantic.east || 'east', color: colors.east, label: 'E' },
    { semantic: 'south', dir: semantic.south || 'south', color: colors.south, label: 'S' },
    { semantic: 'west', dir: semantic.west || 'west', color: colors.west, label: 'W' }
  ];
  logItemRotationPrototype('debug-face-render', {
    prefabId: boxSemanticInput && boxSemanticInput.id || prefab && prefab.id || null,
    previewFacing: rotation,
    visibleSemanticFaces: faces.map(function (f) { return f.semantic; }),
    topColor: colors.top || null,
    northColor: colors.north || null,
    eastColor: colors.east || null,
    southColor: colors.south || null,
    westColor: colors.west || null
  });
  ctx.save();
  ctx.font = '11px monospace';
  faces.forEach(function (entry) {
    var poly = polys[entry.dir];
    if (!poly) return;
    drawPoly(poly, colorWithAlpha(entry.color || '#fff', 0.38), entry.color || '#fff', 1.7);
    var mid = averageScreenPoint(poly);
    drawTextBadge(entry.label, mid.x + 2, mid.y - 2, entry.color || '#fff', entry.color || '#fff');
  });
  ctx.restore();
  drawFacingLegendPanel(proto, anchorPoint);
}




  var api = {
    drawSelectedInstanceProjectionDebug: drawSelectedInstanceProjectionDebug,
    getFacingFacePolygons: getFacingFacePolygons,
    buildFacingOverlayPrototype: buildFacingOverlayPrototype,
    drawFacingLegendPanel: drawFacingLegendPanel,
    drawItemFacingPrototypeOverlay: drawItemFacingPrototypeOverlay
  };
  global.__APP_PRESENTATION_PROJECTION_DEBUG_OVERLAY__ = api;
  global.__PROJECTION_DEBUG_OVERLAY__ = api;
  global.IsometricProjectionDebugOverlay = api;
})(typeof window !== 'undefined' ? window : globalThis);
