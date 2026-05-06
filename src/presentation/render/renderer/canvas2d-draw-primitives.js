// P8: Canvas 2D draw primitives.
// Layer: presentation/render/renderer.
//
// Owns low-level Canvas2D primitive drawing and Path2D construction helpers.
// This file may use CanvasRenderingContext2D and Path2D, but it must not own
// renderable assembly, ordering, scene state, prefab protocols, or core geometry rules.
(function registerCanvas2dDrawPrimitives(global) {
  function normalizePoints(points) {
    return Array.isArray(points) ? points : [];
  }

  function drawPolyOn(targetCtx, points, fill, stroke, width) {
    var ctx = targetCtx;
    var pts = normalizePoints(points);
    if (!ctx || pts.length < 1) return;
    var strokeStyle = stroke == null ? 'rgba(0,0,0,.22)' : stroke;
    var lineWidth = width == null ? 1 : width;
    ctx.beginPath();
    ctx.moveTo(Number(pts[0].x || 0), Number(pts[0].y || 0));
    for (var i = 1; i < pts.length; i++) ctx.lineTo(Number(pts[i].x || 0), Number(pts[i].y || 0));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function drawPolyWithOffsetOn(targetCtx, points, offsetX, offsetY, fill, stroke, width) {
    var ctx = targetCtx;
    var pts = normalizePoints(points);
    if (!ctx || !pts.length) return;
    var dx = Number(offsetX || 0);
    var dy = Number(offsetY || 0);
    var strokeStyle = stroke == null ? 'rgba(0,0,0,.22)' : stroke;
    var lineWidth = width == null ? 1 : width;
    ctx.beginPath();
    ctx.moveTo(Number(pts[0].x || 0) + dx, Number(pts[0].y || 0) + dy);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(Number(pts[i].x || 0) + dx, Number(pts[i].y || 0) + dy);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function averagePointWithOffset(points, offsetX, offsetY) {
    var pts = normalizePoints(points);
    if (!pts.length) return { x: Number(offsetX || 0), y: Number(offsetY || 0) };
    var sx = 0;
    var sy = 0;
    for (var i = 0; i < pts.length; i++) {
      sx += Number(pts[i].x || 0);
      sy += Number(pts[i].y || 0);
    }
    return { x: sx / pts.length + Number(offsetX || 0), y: sy / pts.length + Number(offsetY || 0) };
  }

  function getPath2DCtor() {
    try {
      if (typeof Path2D !== 'undefined') return Path2D;
      if (global && typeof global.Path2D !== 'undefined') return global.Path2D;
    } catch (_) {}
    return null;
  }

  function buildPath2DFromPoints(points) {
    var PathCtor = getPath2DCtor();
    if (!PathCtor) return null;
    var pts = normalizePoints(points);
    if (pts.length < 3) return null;
    var path = new PathCtor();
    path.moveTo(Number(pts[0].x || 0), Number(pts[0].y || 0));
    for (var i = 1; i < pts.length; i++) path.lineTo(Number(pts[i].x || 0), Number(pts[i].y || 0));
    path.closePath();
    return path;
  }

  function buildPath2DFromLoops(loops) {
    var PathCtor = getPath2DCtor();
    if (!PathCtor) return null;
    var list = Array.isArray(loops) ? loops : [];
    var path = new PathCtor();
    var used = false;
    for (var li = 0; li < list.length; li++) {
      var pts = normalizePoints(list[li]);
      if (pts.length < 3) continue;
      path.moveTo(Number(pts[0].x || 0), Number(pts[0].y || 0));
      for (var i = 1; i < pts.length; i++) path.lineTo(Number(pts[i].x || 0), Number(pts[i].y || 0));
      path.closePath();
      used = true;
    }
    return used ? path : null;
  }

  function buildPath2DFromSegments(segments) {
    var PathCtor = getPath2DCtor();
    if (!PathCtor) return null;
    var list = Array.isArray(segments) ? segments : [];
    var path = new PathCtor();
    var used = false;
    for (var si = 0; si < list.length; si++) {
      var seg = Array.isArray(list[si]) ? list[si] : [];
      if (seg.length < 2) continue;
      path.moveTo(Number(seg[0].x || 0), Number(seg[0].y || 0));
      path.lineTo(Number(seg[1].x || 0), Number(seg[1].y || 0));
      used = true;
    }
    return used ? path : null;
  }

  function normalizeBadgeLines(lines) {
    return (Array.isArray(lines) ? lines : []).map(function (line) {
      if (line && typeof line === 'object') {
        return {
          text: String(line.text || ''),
          color: line.color || null,
          stroke: line.stroke || null
        };
      }
      return { text: String(line || ''), color: null, stroke: null };
    }).filter(function (line) { return !!line.text; });
  }

  function drawTextBadgeOn(targetCtx, text, x, y, fill, stroke) {
    var ctx = targetCtx;
    if (!ctx) return;
    ctx.save();
    ctx.font = '11px monospace';
    var label = String(text || '');
    var w = Math.ceil(ctx.measureText(label).width) + 8;
    ctx.fillStyle = 'rgba(5,8,14,0.78)';
    ctx.fillRect(x - 3, y - 11, w, 15);
    ctx.strokeStyle = stroke || 'rgba(255,255,255,0.25)';
    ctx.strokeRect(x - 3, y - 11, w, 15);
    ctx.fillStyle = fill || '#fff';
    ctx.fillText(label, x + 1, y);
    ctx.restore();
  }

  function drawMultilineBadgeOn(targetCtx, lines, x, y, fill, stroke) {
    var ctx = targetCtx;
    var list = normalizeBadgeLines(lines);
    if (!ctx || !list.length) return;
    ctx.save();
    ctx.font = '10px monospace';
    var maxW = 0;
    for (var i = 0; i < list.length; i++) maxW = Math.max(maxW, Math.ceil(ctx.measureText(list[i].text).width));
    var pad = 6;
    var lineH = 12;
    var boxW = maxW + pad * 2;
    var boxH = list.length * lineH + 4;
    ctx.fillStyle = 'rgba(5,8,14,0.78)';
    ctx.fillRect(x - 4, y - boxH + 3, boxW, boxH);
    ctx.strokeStyle = stroke || 'rgba(255,255,255,0.28)';
    ctx.strokeRect(x - 4, y - boxH + 3, boxW, boxH);
    for (var j = 0; j < list.length; j++) {
      var yy = y - boxH + 14 + j * lineH;
      var lineColor = list[j].color || fill || '#fff';
      var lineStroke = list[j].stroke || 'rgba(5,8,14,0.92)';
      ctx.lineWidth = 3;
      ctx.strokeStyle = lineStroke;
      ctx.strokeText(list[j].text, x + 1, yy);
      ctx.fillStyle = lineColor;
      ctx.fillText(list[j].text, x + 1, yy);
    }
    ctx.restore();
  }

  var api = {
    layer: 'presentation/render/renderer',
    phase: 'P8',
    drawPolyOn: drawPolyOn,
    drawPolyWithOffsetOn: drawPolyWithOffsetOn,
    averagePointWithOffset: averagePointWithOffset,
    buildPath2DFromPoints: buildPath2DFromPoints,
    buildPath2DFromLoops: buildPath2DFromLoops,
    buildPath2DFromSegments: buildPath2DFromSegments,
    drawTextBadgeOn: drawTextBadgeOn,
    drawMultilineBadgeOn: drawMultilineBadgeOn
  };

  global.IsometricCanvas2dDrawPrimitives = api;
  global.__CANVAS2D_DRAW_PRIMITIVES__ = api;
  global.__APP_PRESENTATION_CANVAS2D_DRAW_PRIMITIVES__ = api;
})(typeof window !== 'undefined' ? window : globalThis);
