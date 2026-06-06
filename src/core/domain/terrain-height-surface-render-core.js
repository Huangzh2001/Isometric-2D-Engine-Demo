(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/terrain-height-surface-render-core.js';
  var PHASE = 'TERRAIN-HEIGHT-SURFACE-RENDER-V0';
  var EPS = 1e-9;

  var DIRS = {
    north: { dx: 0, dy: -1, semanticFace: 'north' },
    east: { dx: 1, dy: 0, semanticFace: 'east' },
    south: { dx: 0, dy: 1, semanticFace: 'south' },
    west: { dx: -1, dy: 0, semanticFace: 'west' }
  };

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, toNumber(value, min))); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function normalizeSurfaceSubdivisions(value) {
    var n = Math.round(toNumber(value, 4));
    if (n < 1) n = 1;
    if (n > 16) n = 16;
    return n;
  }

  function normalizeConnectThreshold(value) { return clamp(value, 0, 2); }
  function normalizeTopLinesEnabled(value) { return value === true; }

  function cellKey(x, y, z) {
    return Math.round(toNumber(x, 0)) + ',' + Math.round(toNumber(y, 0)) + ',' + Math.round(toNumber(z, 0));
  }

  function isTerrainHeightSurfaceCell(cell) {
    if (!cell || typeof cell !== 'object') return false;
    var shapeKind = String(cell.shapeKind || '').toLowerCase();
    var kind = String(cell.kind || '').toLowerCase();
    var prefabId = String(cell.prefabId || '').toLowerCase();
    return shapeKind === 'terrain_height_surface'
      || kind === 'terrain_height_surface'
      || prefabId.indexOf('terrain_height_') === 0
      || cell.terrainHeightSurfacePrototype === true;
  }

  function getHeight(cell) {
    if (!cell) return 0;
    if (cell.terrainHeight != null) return clamp(cell.terrainHeight, 0.05, 2);
    if (cell.terrainSurfaceHeight != null) return clamp(cell.terrainSurfaceHeight, 0.05, 2);
    if (cell.h != null) return clamp(cell.h, 0.05, 2);
    return 1;
  }

  function getBaseZ(cell) { return toNumber(cell && cell.z, 0); }
  function getTopZ(cell) { return getBaseZ(cell) + getHeight(cell); }

  function buildCellIndex(cells) {
    var map = new Map();
    var list = Array.isArray(cells) ? cells : [];
    for (var i = 0; i < list.length; i++) {
      var cell = list[i];
      if (!isTerrainHeightSurfaceCell(cell)) continue;
      map.set(cellKey(cell.x, cell.y, cell.z), cell);
    }
    return map;
  }

  function getNeighbor(index, cell, dx, dy) {
    return index.get(cellKey(toNumber(cell.x, 0) + dx, toNumber(cell.y, 0) + dy, toNumber(cell.z, 0))) || null;
  }

  function canConnect(cell, other, threshold) {
    if (!cell || !other || !isTerrainHeightSurfaceCell(other)) return false;
    return Math.abs(getTopZ(cell) - getTopZ(other)) <= normalizeConnectThreshold(threshold) + EPS;
  }

  function cornerHeight(index, cell, offsets, threshold) {
    var values = [getTopZ(cell)];
    var cx = toNumber(cell.x, 0);
    var cy = toNumber(cell.y, 0);
    var cz = toNumber(cell.z, 0);
    for (var i = 0; i < offsets.length; i++) {
      var o = offsets[i];
      var n = index.get(cellKey(cx + o.dx, cy + o.dy, cz));
      if (canConnect(cell, n, threshold)) values.push(getTopZ(n));
    }
    var sum = 0;
    for (var j = 0; j < values.length; j++) sum += values[j];
    return sum / values.length;
  }

  function buildCornerSamples(index, cell, threshold) {
    var nw = cornerHeight(index, cell, [{ dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: -1, dy: -1 }], threshold);
    var ne = cornerHeight(index, cell, [{ dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }], threshold);
    var se = cornerHeight(index, cell, [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }], threshold);
    var sw = cornerHeight(index, cell, [{ dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 }], threshold);
    return { nw: nw, ne: ne, se: se, sw: sw };
  }

  function bilerp(samples, u, v) {
    var north = lerp(samples.nw, samples.ne, u);
    var south = lerp(samples.sw, samples.se, u);
    return lerp(north, south, v);
  }

  function surfacePoint(cell, samples, u, v) {
    return {
      x: toNumber(cell.x, 0) + u,
      y: toNumber(cell.y, 0) + v,
      z: bilerp(samples, u, v)
    };
  }

  function getNormal(face) {
    if (face === 'top') return { x: 0, y: 0, z: 1 };
    if (face === 'east') return { x: 1, y: 0, z: 0 };
    if (face === 'west') return { x: -1, y: 0, z: 0 };
    if (face === 'south') return { x: 0, y: 1, z: 0 };
    if (face === 'north') return { x: 0, y: -1, z: 0 };
    return { x: 0, y: 0, z: 1 };
  }

  function makeFace(cell, kind, semanticFace, pts, fill, stroke, width, normal, edgeHint) {
    return {
      kind: 'terrain-height-surface-face',
      cell: cell,
      terrainHeightSurfaceFaceKind: kind,
      semanticFace: semanticFace,
      screenFace: semanticFace,
      edgeHint: edgeHint || null,
      worldPts: pts,
      fill: fill,
      stroke: stroke,
      width: width,
      normal: normal || getNormal(semanticFace)
    };
  }

  function makeTopFaces(cell, samples, subdivisions, topLinesEnabled) {
    var n = normalizeSurfaceSubdivisions(subdivisions);
    var faces = [];
    for (var iy = 0; iy < n; iy++) {
      for (var ix = 0; ix < n; ix++) {
        var u0 = ix / n, v0 = iy / n, u1 = (ix + 1) / n, v1 = (iy + 1) / n;
        var pts = [
          surfacePoint(cell, samples, u0, v0),
          surfacePoint(cell, samples, u1, v0),
          surfacePoint(cell, samples, u1, v1),
          surfacePoint(cell, samples, u0, v1)
        ];
        faces.push(makeFace(
          cell,
          'top-subface',
          'top',
          pts,
          'rgba(112, 166, 82, 0.98)',
          normalizeTopLinesEnabled(topLinesEnabled) ? 'rgba(226, 255, 200, 0.42)' : '',
          normalizeTopLinesEnabled(topLinesEnabled) ? 0.65 : 0,
          getNormal('top'),
          'top-' + n + 'x' + n + '-' + ix + '-' + iy
        ));
      }
    }
    return faces;
  }

  function sideEdgePoints(cell, samples, face, segments) {
    var n = Math.max(1, Math.round(toNumber(segments, 4)));
    var pts = [];
    var i, t;
    if (face === 'north') {
      for (i = 0; i <= n; i++) { t = i / n; pts.push(surfacePoint(cell, samples, t, 0)); }
    } else if (face === 'south') {
      for (i = 0; i <= n; i++) { t = i / n; pts.push(surfacePoint(cell, samples, 1 - t, 1)); }
    } else if (face === 'east') {
      for (i = 0; i <= n; i++) { t = i / n; pts.push(surfacePoint(cell, samples, 1, t)); }
    } else {
      for (i = 0; i <= n; i++) { t = i / n; pts.push(surfacePoint(cell, samples, 0, 1 - t)); }
    }
    return pts;
  }

  function makeSideFaces(cell, index, samples, face, subdivisions, threshold) {
    var dir = DIRS[face];
    var neighbor = getNeighbor(index, cell, dir.dx, dir.dy);
    if (canConnect(cell, neighbor, threshold)) return [];
    var edge = sideEdgePoints(cell, samples, face, subdivisions);
    var baseZ = getBaseZ(cell);
    var pts = edge.slice();
    for (var i = edge.length - 1; i >= 0; i--) {
      pts.push({ x: edge[i].x, y: edge[i].y, z: baseZ });
    }
    return [makeFace(cell, 'cliff-side', dir.semanticFace, pts, 'rgba(86, 126, 60, 0.98)', 'rgba(49, 78, 39, 0.50)', 0.9, getNormal(face), 'side-' + face)];
  }

  function buildFacesForCell(cell, context) {
    var opts = context && typeof context === 'object' ? context : {};
    var index = opts.index || new Map();
    var threshold = normalizeConnectThreshold(opts.connectThreshold);
    var subdivisions = normalizeSurfaceSubdivisions(opts.surfaceSubdivisions);
    var topLinesEnabled = normalizeTopLinesEnabled(opts.topLinesEnabled);
    var samples = buildCornerSamples(index, cell, threshold);
    var faces = makeTopFaces(cell, samples, subdivisions, topLinesEnabled);
    faces = faces.concat(makeSideFaces(cell, index, samples, 'north', subdivisions, threshold));
    faces = faces.concat(makeSideFaces(cell, index, samples, 'east', subdivisions, threshold));
    faces = faces.concat(makeSideFaces(cell, index, samples, 'south', subdivisions, threshold));
    faces = faces.concat(makeSideFaces(cell, index, samples, 'west', subdivisions, threshold));
    return faces;
  }

  function buildTerrainHeightSurfaceFaces(localCells, allCells, options) {
    var index = buildCellIndex(allCells || localCells || []);
    var list = Array.isArray(localCells) ? localCells : [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (!isTerrainHeightSurfaceCell(list[i])) continue;
      out = out.concat(buildFacesForCell(list[i], {
        index: index,
        connectThreshold: options && options.connectThreshold,
        surfaceSubdivisions: options && options.surfaceSubdivisions,
        topLinesEnabled: options && options.topLinesEnabled
      }));
    }
    return out;
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    isTerrainHeightSurfaceCell: isTerrainHeightSurfaceCell,
    getHeight: getHeight,
    buildCellIndex: buildCellIndex,
    canConnect: canConnect,
    buildTerrainHeightSurfaceFaces: buildTerrainHeightSurfaceFaces
  };

  window.__TERRAIN_HEIGHT_SURFACE_RENDER_CORE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('domain.terrainHeightSurfaceRenderCore', api, { owner: OWNER, phase: PHASE });
  }
})();
