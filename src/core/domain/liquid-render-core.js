(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/liquid-render-core.js';
  var PHASE = 'LIQUID-RENDER-V10-NATIVE-CURVED-SUBFACE-EDGES';
  var EPS = 1e-6;
  var FULL_DEPTH = 0.8;
  var DIRS = [
    { semanticFace: 'east', dx: 1, dy: 0 },
    { semanticFace: 'south', dx: 0, dy: 1 },
    { semanticFace: 'west', dx: -1, dy: 0 },
    { semanticFace: 'north', dx: 0, dy: -1 }
  ];
  var CORNER_RULES = {
    nw: { sideA: { dx: -1, dy: 0 }, sideB: { dx: 0, dy: -1 }, diagonal: { dx: -1, dy: -1 } },
    ne: { sideA: { dx: 1, dy: 0 }, sideB: { dx: 0, dy: -1 }, diagonal: { dx: 1, dy: -1 } },
    se: { sideA: { dx: 1, dy: 0 }, sideB: { dx: 0, dy: 1 }, diagonal: { dx: 1, dy: 1 } },
    sw: { sideA: { dx: -1, dy: 0 }, sideB: { dx: 0, dy: 1 }, diagonal: { dx: -1, dy: 1 } }
  };
  var EDGE_RULES = {
    n: { dx: 0, dy: -1 },
    e: { dx: 1, dy: 0 },
    s: { dx: 0, dy: 1 },
    w: { dx: -1, dy: 0 }
  };

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function clamp(value, min, max) {
    var n = toNumber(value, min);
    return Math.max(min, Math.min(max, n));
  }

  function normalizeSurfaceSubdivisions(value) {
    var n = Math.round(toNumber(value, 2));
    if (n < 2) n = 2;
    if (n > 16) n = 16;
    return n;
  }

  function normalizeEdgeCurveStrength(value) {
    return Math.max(0, Math.min(1, toNumber(value, 0)));
  }

  function isLiquidRenderCell(cell) {
    if (!cell || typeof cell !== 'object') return false;
    var shapeKind = String(cell.shapeKind || '').toLowerCase();
    var prefabId = String(cell.prefabId || '').toLowerCase();
    var kind = String(cell.kind || '').toLowerCase();
    var liquidType = String(cell.liquidType || cell.fluidType || '').toLowerCase();
    return shapeKind === 'liquid_water'
      || kind === 'liquid_water'
      || prefabId.indexOf('liquid_water') === 0
      || liquidType === 'water';
  }

  function getLiquidMaterial(cell) {
    var t = String(cell && (cell.liquidType || cell.fluidType || '') || '').toLowerCase();
    return t || 'water';
  }

  function getLiquidDepth(cell) {
    if (!cell || typeof cell !== 'object') return 0;
    var raw = cell.liquidDepth;
    if (raw == null) raw = cell.waterAmount;
    if (raw == null) raw = cell.fluidAmount;
    if (raw == null) raw = cell.liquidAmount;
    if (raw == null) raw = cell.depth;
    if (raw == null) raw = cell.h;
    return clamp(raw == null ? 0 : raw, 0, 1);
  }

  function getLiquidBaseZ(cell) {
    return toNumber(cell && cell.z, 0);
  }

  function getLiquidSurfaceZ(cell) {
    return getLiquidBaseZ(cell) + getLiquidDepth(cell);
  }

  function cellKey(x, y, z) {
    return Math.round(toNumber(x, 0)) + ',' + Math.round(toNumber(y, 0)) + ',' + Math.round(toNumber(z, 0));
  }

  function buildLiquidCellIndex(boxes) {
    var map = new Map();
    var list = Array.isArray(boxes) ? boxes : [];
    for (var i = 0; i < list.length; i++) {
      var cell = list[i];
      if (!isLiquidRenderCell(cell)) continue;
      if (getLiquidDepth(cell) <= EPS) continue;
      var key = cellKey(cell.x, cell.y, cell.z);
      var prev = map.get(key);
      if (!prev || getLiquidDepth(cell) >= getLiquidDepth(prev)) map.set(key, cell);
    }
    return map;
  }

  function getNormal(face) {
    if (face === 'east') return { x: 1, y: 0, z: 0 };
    if (face === 'south') return { x: 0, y: 1, z: 0 };
    if (face === 'west') return { x: -1, y: 0, z: 0 };
    if (face === 'north') return { x: 0, y: -1, z: 0 };
    return { x: 0, y: 0, z: 1 };
  }

  function getScreenFaceForSemanticFace(face, viewRotation) {
    var api = window.__ITEM_FACING_CORE__ || (window.App && window.App.domain && window.App.domain.itemFacingCore) || null;
    if (api && typeof api.getScreenFaceForSemanticFace === 'function') {
      try { return api.getScreenFaceForSemanticFace(face, viewRotation); } catch (_) {}
    }
    return face;
  }

  function getDepthColor(cell) {
    var d = getLiquidDepth(cell);
    if (d < 0.34) return { r: 108, g: 211, b: 255, topA: 0.34, sideA: 0.10, strokeA: 0.62 };
    if (d < 0.67) return { r: 72, g: 190, b: 255, topA: 0.40, sideA: 0.13, strokeA: 0.58 };
    if (d < 0.98) return { r: 45, g: 166, b: 238, topA: 0.45, sideA: 0.16, strokeA: 0.54 };
    return { r: 35, g: 139, b: 218, topA: 0.50, sideA: 0.18, strokeA: 0.50 };
  }

  function rgba(c, alpha) {
    return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + clamp(alpha, 0, 1).toFixed(3) + ')';
  }

  function getNeighborCell(index, x, y, z) {
    return index && typeof index.get === 'function' ? index.get(cellKey(x, y, z)) : null;
  }

  function getValidLiquidNeighbor(index, x, y, z) {
    var cell = getNeighborCell(index, x, y, z);
    if (!cell || !isLiquidRenderCell(cell)) return null;
    if (getLiquidDepth(cell) <= EPS) return null;
    return cell;
  }

  function addWeightedSample(samples, cell, weight) {
    if (!cell) return;
    var h = getLiquidDepth(cell);
    if (h <= EPS) return;
    var w = Number(weight || 1);
    if (h >= FULL_DEPTH) w *= 10;
    samples.push({ z: getLiquidSurfaceZ(cell), w: w });
  }

  function weightedAverage(samples, fallbackZ) {
    if (!samples || !samples.length) return fallbackZ;
    var sum = 0;
    var weight = 0;
    for (var i = 0; i < samples.length; i++) {
      sum += samples[i].z * samples[i].w;
      weight += samples[i].w;
    }
    return weight > EPS ? (sum / weight) : fallbackZ;
  }

  function getCornerHeight(cell, index, cornerName) {
    var x = toNumber(cell.x, 0);
    var y = toNumber(cell.y, 0);
    var z = toNumber(cell.z, 0);
    var currentZ = getLiquidSurfaceZ(cell);
    var rule = CORNER_RULES[cornerName] || CORNER_RULES.nw;
    var sideA = getValidLiquidNeighbor(index, x + rule.sideA.dx, y + rule.sideA.dy, z);
    var sideB = getValidLiquidNeighbor(index, x + rule.sideB.dx, y + rule.sideB.dy, z);
    var diagonal = getValidLiquidNeighbor(index, x + rule.diagonal.dx, y + rule.diagonal.dy, z);
    var samples = [];
    addWeightedSample(samples, cell, 1);
    addWeightedSample(samples, sideA, 1);
    addWeightedSample(samples, sideB, 1);
    addWeightedSample(samples, diagonal, 1);
    return weightedAverage(samples, currentZ);
  }

  function getEdgeMidHeight(cell, index, edgeName) {
    var x = toNumber(cell.x, 0);
    var y = toNumber(cell.y, 0);
    var z = toNumber(cell.z, 0);
    var currentZ = getLiquidSurfaceZ(cell);
    var rule = EDGE_RULES[edgeName];
    var neighbor = rule ? getValidLiquidNeighbor(index, x + rule.dx, y + rule.dy, z) : null;
    var samples = [];
    addWeightedSample(samples, cell, 1);
    addWeightedSample(samples, neighbor, 1);
    return weightedAverage(samples, currentZ);
  }

  function getTopSamples(cell, index) {
    var x = toNumber(cell.x, 0);
    var y = toNumber(cell.y, 0);
    var z = getLiquidSurfaceZ(cell);
    return {
      nw: { x: x, y: y, z: getCornerHeight(cell, index, 'nw') },
      ne: { x: x + 1, y: y, z: getCornerHeight(cell, index, 'ne') },
      se: { x: x + 1, y: y + 1, z: getCornerHeight(cell, index, 'se') },
      sw: { x: x, y: y + 1, z: getCornerHeight(cell, index, 'sw') },
      n: { x: x + 0.5, y: y, z: getEdgeMidHeight(cell, index, 'n') },
      e: { x: x + 1, y: y + 0.5, z: getEdgeMidHeight(cell, index, 'e') },
      s: { x: x + 0.5, y: y + 1, z: getEdgeMidHeight(cell, index, 's') },
      w: { x: x, y: y + 0.5, z: getEdgeMidHeight(cell, index, 'w') },
      c: { x: x + 0.5, y: y + 0.5, z: z }
    };
  }

  function getTopHeights(cell, index) {
    var p = getTopSamples(cell, index);
    return { nw: p.nw.z, ne: p.ne.z, se: p.se.z, sw: p.sw.z, n: p.n.z, e: p.e.z, s: p.s.z, w: p.w.z, c: p.c.z };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOut01(t) {
    var x = Math.max(0, Math.min(1, toNumber(t, 0)));
    return x * x * (3 - 2 * x);
  }

  function curveCoord(t, curveStrength) {
    var x = Math.max(0, Math.min(1, toNumber(t, 0)));
    var strength = normalizeEdgeCurveStrength(curveStrength);
    return lerp(x, easeInOut01(x), strength);
  }

  function bilerp(nw, ne, se, sw, u, v) {
    var n = lerp(nw, ne, u);
    var ss = lerp(sw, se, u);
    return lerp(n, ss, v);
  }

  function surfacePoint(samples, u, v, edgeCurveStrength) {
    var x0 = Number(samples.nw.x || 0);
    var y0 = Number(samples.nw.y || 0);
    var uu = Math.max(0, Math.min(1, toNumber(u, 0)));
    var vv = Math.max(0, Math.min(1, toNumber(v, 0)));
    return {
      x: x0 + uu,
      y: y0 + vv,
      // This is the requested line interpolation curve: the geometry remains in
      // the same grid footprint, but the z value along each subdivided line is
      // sampled with an ease curve instead of a straight linear parameter.
      z: bilerp(samples.nw.z, samples.ne.z, samples.se.z, samples.sw.z, curveCoord(uu, edgeCurveStrength), curveCoord(vv, edgeCurveStrength))
    };
  }

  function edgePoint(samples, edgeName, t, edgeCurveStrength) {
    var x0 = Number(samples.nw.x || 0);
    var y0 = Number(samples.nw.y || 0);
    var tt = Math.max(0, Math.min(1, toNumber(t, 0)));
    var ct = curveCoord(tt, edgeCurveStrength);
    if (edgeName === 'north') return { x: x0 + tt, y: y0, z: lerp(samples.nw.z, samples.ne.z, ct) };
    if (edgeName === 'east') return { x: x0 + 1, y: y0 + tt, z: lerp(samples.ne.z, samples.se.z, ct) };
    if (edgeName === 'south') return { x: x0 + tt, y: y0 + 1, z: lerp(samples.sw.z, samples.se.z, ct) };
    return { x: x0, y: y0 + tt, z: lerp(samples.nw.z, samples.sw.z, ct) };
  }

  function pushPointIfDistinct(out, p) {
    if (!p) return;
    var last = out.length ? out[out.length - 1] : null;
    if (last && Math.abs(Number(last.x || 0) - Number(p.x || 0)) < 1e-9
        && Math.abs(Number(last.y || 0) - Number(p.y || 0)) < 1e-9
        && Math.abs(Number(last.z || 0) - Number(p.z || 0)) < 1e-9) return;
    out.push(p);
  }

  function buildCurvedSubfaceBoundary(samples, u0, v0, u1, v1, curveStrength, edgeSegments) {
    var curve = normalizeEdgeCurveStrength(curveStrength);
    var seg = curve <= EPS ? 1 : Math.max(2, Math.round(Number(edgeSegments || 2)));
    var pts = [];
    var i;
    var t;

    for (i = 0; i <= seg; i++) {
      t = i / seg;
      pushPointIfDistinct(pts, surfacePoint(samples, lerp(u0, u1, t), v0, curve));
    }
    for (i = 1; i <= seg; i++) {
      t = i / seg;
      pushPointIfDistinct(pts, surfacePoint(samples, u1, lerp(v0, v1, t), curve));
    }
    for (i = 1; i <= seg; i++) {
      t = i / seg;
      pushPointIfDistinct(pts, surfacePoint(samples, lerp(u1, u0, t), v1, curve));
    }
    for (i = 1; i < seg; i++) {
      t = i / seg;
      pushPointIfDistinct(pts, surfacePoint(samples, u0, lerp(v1, v0, t), curve));
    }

    return pts;
  }

  function makeTopFaces(cell, samples, currentViewRotation, surfaceSubdivisions, edgeCurveStrength) {
    var n = normalizeSurfaceSubdivisions(surfaceSubdivisions);
    var curve = normalizeEdgeCurveStrength(edgeCurveStrength);
    var edgeSegments = Math.max(2, n * 2);
    var faces = [];
    for (var iy = 0; iy < n; iy++) {
      for (var ix = 0; ix < n; ix++) {
        var u0 = ix / n;
        var v0 = iy / n;
        var u1 = (ix + 1) / n;
        var v1 = (iy + 1) / n;
        faces.push(makeTopSubFace(
          cell,
          buildCurvedSubfaceBoundary(samples, u0, v0, u1, v1, curve, edgeSegments),
          currentViewRotation,
          'top-native-curve-' + n + 'x' + n + '-' + Math.round(curve * 100) + '-' + ix + '-' + iy
        ));
      }
    }
    return faces;
  }

  function makeTopSubFace(cell, pts, currentViewRotation, edgeHint) {
    var c = getDepthColor(cell);
    return {
      kind: 'liquid-water-face',
      cell: cell,
      liquidFaceKind: 'top-subface',
      edgeHint: edgeHint || 'sub',
      semanticFace: 'top',
      screenFace: getScreenFaceForSemanticFace('top', currentViewRotation),
      worldPts: pts,
      normal: getNormal('top'),
      fill: rgba(c, c.topA),
      stroke: 'rgba(210, 246, 255, ' + c.strokeA.toFixed(3) + ')',
      width: 0.75
    };
  }

  function makeSideFaceSegment(cell, face, pts, currentViewRotation, edgeHint) {
    var baseZ = getLiquidBaseZ(cell);
    var maxZ = Math.max.apply(null, pts.map(function (p) { return p.z; }));
    if ((maxZ - baseZ) <= EPS) return null;
    var c = getDepthColor(cell);
    return {
      kind: 'liquid-water-face',
      cell: cell,
      liquidFaceKind: 'outer-side',
      semanticFace: face,
      edgeHint: edgeHint || 'edgecurve-side',
      screenFace: getScreenFaceForSemanticFace(face, currentViewRotation),
      worldPts: pts,
      normal: getNormal(face),
      fill: rgba(c, c.sideA),
      stroke: 'rgba(120, 220, 255, 0.22)',
      width: 0.8
    };
  }

  function makeSideFaces(cell, dir, samples, currentViewRotation, surfaceSubdivisions, edgeCurveStrength) {
    var n = normalizeSurfaceSubdivisions(surfaceSubdivisions);
    var curve = normalizeEdgeCurveStrength(edgeCurveStrength);
    var face = dir.semanticFace;
    var edgeName = face === 'north' ? 'north' : (face === 'east' ? 'east' : (face === 'south' ? 'south' : 'west'));
    var baseZ = getLiquidBaseZ(cell);
    var faces = [];

    // If curve is zero, preserve the old single-side-face behavior for compatibility.
    var segments = curve <= EPS ? 1 : n;
    for (var i = 0; i < segments; i++) {
      var t0 = i / segments;
      var t1 = (i + 1) / segments;
      var p0 = edgePoint(samples, edgeName, t0, curve);
      var p1 = edgePoint(samples, edgeName, t1, curve);
      var b0 = { x: p0.x, y: p0.y, z: baseZ };
      var b1 = { x: p1.x, y: p1.y, z: baseZ };
      var pts;
      if (face === 'east' || face === 'south') pts = [b0, b1, p1, p0];
      else pts = [p0, p1, b1, b0];
      var segment = makeSideFaceSegment(cell, face, pts, currentViewRotation, 'edgecurve-side-' + segments + '-' + Math.round(curve * 100) + '-' + i);
      if (segment) faces.push(segment);
    }
    return faces;
  }

  function buildLiquidFacesForCell(cell, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var index = opts.index || null;
    var currentViewRotation = Number(opts.currentViewRotation || 0);
    var surfaceSubdivisions = normalizeSurfaceSubdivisions(opts.surfaceSubdivisions);
    var edgeCurveStrength = normalizeEdgeCurveStrength(opts.edgeCurveStrength);
    if (!isLiquidRenderCell(cell)) return [];
    var depth = getLiquidDepth(cell);
    if (depth <= EPS) return [];

    var faces = [];
    var samples = getTopSamples(cell, index);
    faces = faces.concat(makeTopFaces(cell, samples, currentViewRotation, surfaceSubdivisions, edgeCurveStrength));

    var x = toNumber(cell.x, 0);
    var y = toNumber(cell.y, 0);
    var z = toNumber(cell.z, 0);
    for (var i = 0; i < DIRS.length; i++) {
      var dir = DIRS[i];
      var neighbor = getValidLiquidNeighbor(index, x + dir.dx, y + dir.dy, z);
      if (neighbor) continue;
      var sides = makeSideFaces(cell, dir, samples, currentViewRotation, surfaceSubdivisions, edgeCurveStrength);
      for (var si = 0; si < sides.length; si++) faces.push(sides[si]);
    }
    return faces;
  }

  function buildLiquidFaces(localCells, allCells, options) {
    var allIndex = buildLiquidCellIndex(allCells || localCells || []);
    var list = Array.isArray(localCells) ? localCells : [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (!isLiquidRenderCell(list[i])) continue;
      out = out.concat(buildLiquidFacesForCell(list[i], { index: allIndex, currentViewRotation: options && options.currentViewRotation, surfaceSubdivisions: options && options.surfaceSubdivisions, edgeCurveStrength: options && options.edgeCurveStrength }));
    }
    return out;
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    isLiquidRenderCell: isLiquidRenderCell,
    getLiquidMaterial: getLiquidMaterial,
    getLiquidDepth: getLiquidDepth,
    getLiquidSurfaceZ: getLiquidSurfaceZ,
    buildLiquidCellIndex: buildLiquidCellIndex,
    getCornerHeight: getCornerHeight,
    getEdgeMidHeight: getEdgeMidHeight,
    getTopSamples: getTopSamples,
    getTopHeights: getTopHeights,
    normalizeSurfaceSubdivisions: normalizeSurfaceSubdivisions,
    normalizeEdgeCurveStrength: normalizeEdgeCurveStrength,
    buildCurvedSubfaceBoundary: buildCurvedSubfaceBoundary,
    easeInOut01: easeInOut01,
    curveCoord: curveCoord,
    buildLiquidFacesForCell: buildLiquidFacesForCell,
    buildLiquidFaces: buildLiquidFaces,
    summarizeBoundary: function () {
      return { owner: OWNER, phase: PHASE, layer: 'core/domain', input: 'fluid cell state', output: 'procedural liquid subdivided surface geometry', renderer: 'none' };
    }
  };

  window.__LIQUID_RENDER_CORE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('domain.liquidRenderCore', api, { owner: OWNER, phase: PHASE });
  }
})();
