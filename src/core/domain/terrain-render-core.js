// Core terrain render helpers.
// Pure terrain face/material/merge descriptor rules only.
// No DOM, no canvas context, no storage, no platform API.

(function (global) {
  'use strict';

  var OWNER = 'src/core/domain/terrain-render-core.js';
  var PHASE = 'P5-TERRAIN-RENDER-CORE';

  function toFiniteNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function stableStringify(value) {
    if (value == null) return '';
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }

  function getIsometricFaceCoreApi() {
    try {
      if (global && global.App && global.App.domain && global.App.domain.isometricFaceCore) return global.App.domain.isometricFaceCore;
    } catch (_) {}
    try {
      if (global && global.__ISOMETRIC_FACE_CORE__) return global.__ISOMETRIC_FACE_CORE__;
    } catch (_) {}
    return null;
  }

  function buildFallbackVoxelFaceWorldPolygon(x, y, z, semanticFace) {
    var cellX = toFiniteNumber(x, 0);
    var cellY = toFiniteNumber(y, 0);
    var cellZ = toFiniteNumber(z, 0);
    var face = String(semanticFace || '');
    if (face === 'top') return [
      { x: cellX, y: cellY, z: cellZ + 1 },
      { x: cellX + 1, y: cellY, z: cellZ + 1 },
      { x: cellX + 1, y: cellY + 1, z: cellZ + 1 },
      { x: cellX, y: cellY + 1, z: cellZ + 1 }
    ];
    if (face === 'east') return [
      { x: cellX + 1, y: cellY, z: cellZ },
      { x: cellX + 1, y: cellY + 1, z: cellZ },
      { x: cellX + 1, y: cellY + 1, z: cellZ + 1 },
      { x: cellX + 1, y: cellY, z: cellZ + 1 }
    ];
    if (face === 'south') return [
      { x: cellX, y: cellY + 1, z: cellZ },
      { x: cellX + 1, y: cellY + 1, z: cellZ },
      { x: cellX + 1, y: cellY + 1, z: cellZ + 1 },
      { x: cellX, y: cellY + 1, z: cellZ + 1 }
    ];
    if (face === 'west') return [
      { x: cellX, y: cellY, z: cellZ + 1 },
      { x: cellX, y: cellY + 1, z: cellZ + 1 },
      { x: cellX, y: cellY + 1, z: cellZ },
      { x: cellX, y: cellY, z: cellZ }
    ];
    if (face === 'north') return [
      { x: cellX, y: cellY, z: cellZ + 1 },
      { x: cellX + 1, y: cellY, z: cellZ + 1 },
      { x: cellX + 1, y: cellY, z: cellZ },
      { x: cellX, y: cellY, z: cellZ }
    ];
    return [];
  }

  function buildVoxelFaceWorldPolygon(x, y, z, semanticFace) {
    var isoCore = getIsometricFaceCoreApi();
    if (isoCore && typeof isoCore.buildVoxelFaceWorldPolygon === 'function') {
      try { return isoCore.buildVoxelFaceWorldPolygon(x, y, z, semanticFace); } catch (_) {}
    }
    return buildFallbackVoxelFaceWorldPolygon(x, y, z, semanticFace);
  }

  function normalizeSlopeDirection(direction) {
    var dir = String(direction || '').trim().toLowerCase();
    if (dir === 'west' || dir === 'north' || dir === 'south') return dir;
    return 'east';
  }

  function isOneCellSlopeCell(cell) {
    var safeCell = cell && typeof cell === 'object' ? cell : null;
    if (!safeCell) return false;
    // A stale slopeDirection field is not enough to classify an ordinary cube
    // as a slope.  Real slopes must carry the prefab/shape/kind identity.
    return String(safeCell.shapeKind || '') === 'slope_1x1'
      || String(safeCell.prefabId || '') === 'slope_1x1'
      || String(safeCell.kind || '') === 'slope_1x1';
  }

  function getSlopeCornerHeight(localX, localY, direction) {
    var dir = normalizeSlopeDirection(direction);
    var x = Number(localX || 0);
    var y = Number(localY || 0);
    if (dir === 'west') return x <= 0 ? 1 : 0;
    if (dir === 'south') return y >= 1 ? 1 : 0;
    if (dir === 'north') return y <= 0 ? 1 : 0;
    return x >= 1 ? 1 : 0;
  }

  function slopePoint(cellX, cellY, cellZ, localX, localY, direction) {
    return {
      x: cellX + Number(localX || 0),
      y: cellY + Number(localY || 0),
      z: cellZ + getSlopeCornerHeight(localX, localY, direction)
    };
  }

  function buildSlope1x1FaceWorldPolygon(cell, semanticFace) {
    var safeCell = cell && typeof cell === 'object' ? cell : {};
    var cellX = toFiniteNumber(safeCell.x, 0);
    var cellY = toFiniteNumber(safeCell.y, 0);
    var cellZ = toFiniteNumber(safeCell.z, 0);
    var dir = normalizeSlopeDirection(safeCell.slopeDirection);
    var face = String(semanticFace || '');

    var nw = slopePoint(cellX, cellY, cellZ, 0, 0, dir);
    var ne = slopePoint(cellX, cellY, cellZ, 1, 0, dir);
    var se = slopePoint(cellX, cellY, cellZ, 1, 1, dir);
    var sw = slopePoint(cellX, cellY, cellZ, 0, 1, dir);
    if (face === 'top') return [nw, ne, se, sw];

    function sideFromTopEdge(a, b) {
      var az = Number(a && a.z || 0);
      var bz = Number(b && b.z || 0);
      if (az <= cellZ && bz <= cellZ) return [];
      if (az === bz) return [
        { x: a.x, y: a.y, z: cellZ },
        { x: b.x, y: b.y, z: cellZ },
        { x: b.x, y: b.y, z: bz },
        { x: a.x, y: a.y, z: az }
      ];
      if (az <= cellZ) return [
        { x: a.x, y: a.y, z: cellZ },
        { x: b.x, y: b.y, z: cellZ },
        { x: b.x, y: b.y, z: bz }
      ];
      if (bz <= cellZ) return [
        { x: a.x, y: a.y, z: cellZ },
        { x: b.x, y: b.y, z: cellZ },
        { x: a.x, y: a.y, z: az }
      ];
      return [
        { x: a.x, y: a.y, z: cellZ },
        { x: b.x, y: b.y, z: cellZ },
        { x: b.x, y: b.y, z: bz },
        { x: a.x, y: a.y, z: az }
      ];
    }

    if (face === 'north') return sideFromTopEdge(nw, ne);
    if (face === 'east') return sideFromTopEdge(ne, se);
    if (face === 'south') return sideFromTopEdge(se, sw);
    if (face === 'west') return sideFromTopEdge(sw, nw);
    return [];
  }

  function buildVoxelFaceWorldPolygonForCell(cell, semanticFace) {
    var safeCell = cell && typeof cell === 'object' ? cell : null;
    if (isOneCellSlopeCell(safeCell)) return buildSlope1x1FaceWorldPolygon(safeCell, semanticFace);
    return buildVoxelFaceWorldPolygon(safeCell && safeCell.x, safeCell && safeCell.y, safeCell && safeCell.z, semanticFace);
  }

  function getSlope1x1DrawableFaces(cell, candidateFaces) {
    var safeCell = cell && typeof cell === 'object' ? cell : null;
    if (!isOneCellSlopeCell(safeCell)) return null;
    var candidates = Array.isArray(candidateFaces) && candidateFaces.length
      ? candidateFaces.slice()
      : ['top', 'east', 'south', 'west', 'north'];
    var out = [];
    var seen = Object.create(null);
    for (var i = 0; i < candidates.length; i++) {
      var face = String(candidates[i] || '');
      if (!face || seen[face]) continue;
      var pts = buildSlope1x1FaceWorldPolygon(safeCell, face);
      if (Array.isArray(pts) && pts.length >= 3) {
        seen[face] = true;
        out.push(face);
      }
    }
    return out;
  }

  function getSlopeFaceMergeSignaturePart(cell) {
    var safeCell = cell && typeof cell === 'object' ? cell : null;
    if (!isOneCellSlopeCell(safeCell)) return '';
    return [
      'slope',
      String(safeCell.shapeKind || safeCell.prefabId || 'slope_1x1'),
      normalizeSlopeDirection(safeCell.slopeDirection),
      String(toFiniteNumber(safeCell.x, 0)),
      String(toFiniteNumber(safeCell.y, 0)),
      String(toFiniteNumber(safeCell.z, 0)),
      String(safeCell.instanceId || '')
    ].join(':');
  }

  function getTerrainMaterialMergeKeyForRenderCell(cell) {
    var safeCell = cell && typeof cell === 'object' ? cell : null;
    if (!safeCell || safeCell.generatedBy !== 'terrain-generator') return null;
    if (safeCell.terrainMaterialMergeKey != null && String(safeCell.terrainMaterialMergeKey)) {
      return String(safeCell.terrainMaterialMergeKey);
    }
    return '__terrain_default__';
  }

  function getTerrainFaceMergeSignature(cell, semanticFace, screenFace, currentViewRotation) {
    var safeCell = cell && typeof cell === 'object' ? cell : {};
    var semanticTextureSignature = [
      safeCell.semanticTextureMap ? stableStringify(safeCell.semanticTextureMap) : '',
      safeCell.semanticTextures ? stableStringify(safeCell.semanticTextures) : '',
      safeCell.semanticFaceColors ? stableStringify(safeCell.semanticFaceColors) : ''
    ].join('|');
    var parts = [
      'terrain-face',
      String(semanticFace || 'top'),
      String(screenFace || ''),
      Number(currentViewRotation || 0),
      String(getTerrainMaterialMergeKeyForRenderCell(safeCell) || '__terrain_default__'),
      semanticTextureSignature
    ];
    var slopePart = getSlopeFaceMergeSignaturePart(safeCell);
    if (slopePart) parts.push(slopePart);
    return parts.join('|');
  }

  function getTerrainSortBandKeyForRenderFace(cell, semanticFace, mergeCoords, orderMeta) {
    var safeCell = cell && typeof cell === 'object' ? cell : null;
    if (!safeCell || safeCell.generatedBy !== 'terrain-generator') return null;
    var face = String(semanticFace || 'top');
    var coords = mergeCoords && typeof mergeCoords === 'object' ? mergeCoords : null;
    if (!coords) return null;
    var rotatedPoint = orderMeta && orderMeta.rotatedPoint ? orderMeta.rotatedPoint : null;
    if (face === 'top') {
      return 'ry:' + String(Number(rotatedPoint && rotatedPoint.y != null ? rotatedPoint.y : 0));
    }
    if (face === 'east' || face === 'south') {
      return face + '|u:' + String(Number(coords.u || 0));
    }
    return null;
  }

  function getTerrainSideEdgeVisibilitySignature(visibleFaces, semanticFace) {
    var list = Array.isArray(visibleFaces) ? visibleFaces.filter(Boolean).map(String) : [];
    list.sort();
    return [String(semanticFace || ''), list.join(',')].join('|');
  }

  function occupancyReaderHasSolid(reader, x, y, z) {
    if (!reader || typeof reader !== 'object') return false;
    try {
      if (typeof reader.isOccupied === 'function') return reader.isOccupied(x, y, z) === true;
      if (typeof reader.has === 'function') return reader.has(x, y, z) === true;
    } catch (_) {}
    return false;
  }

  function getTerrainSideTangentNeighbor(cell, semanticFace, direction) {
    var safeCell = cell && typeof cell === 'object' ? cell : null;
    if (!safeCell) return null;
    var dir = direction === 'neg' ? -1 : 1;
    var x = Number(safeCell.x || 0);
    var y = Number(safeCell.y || 0);
    var z = Number(safeCell.z || 0);
    if (semanticFace === 'east') return { x: x, y: y + dir, z: z };
    if (semanticFace === 'south') return { x: x + dir, y: y, z: z };
    return null;
  }

  function getTerrainSideStepBreakSignature(cell, semanticFace, occupancyReader) {
    var safeCell = cell && typeof cell === 'object' ? cell : null;
    if (!safeCell) return null;
    var face = String(semanticFace || '');
    if (face !== 'east' && face !== 'south') return null;
    var x = Number(safeCell.x || 0);
    var y = Number(safeCell.y || 0);
    var z = Number(safeCell.z || 0);
    var selfTopOpen = !occupancyReaderHasSolid(occupancyReader, x, y, z + 1);
    function classify(direction) {
      var neighbor = getTerrainSideTangentNeighbor(safeCell, face, direction);
      if (!neighbor) return 'none';
      var solid = occupancyReaderHasSolid(occupancyReader, neighbor.x, neighbor.y, neighbor.z);
      if (!solid) return 'void';
      var topOpen = !occupancyReaderHasSolid(occupancyReader, neighbor.x, neighbor.y, neighbor.z + 1);
      return topOpen ? 'open' : 'closed';
    }
    return [
      String(face),
      'selfTop:' + String(selfTopOpen ? 1 : 0),
      'neg:' + classify('neg'),
      'pos:' + classify('pos')
    ].join('|');
  }


  function getTerrainTopNeighborHeightRelation(cell, direction, occupancyReader) {
    var safeCell = cell && typeof cell === 'object' ? cell : null;
    if (!safeCell) return 'none';
    var dir = String(direction || '');
    var x = Math.round(Number(safeCell.x || 0));
    var y = Math.round(Number(safeCell.y || 0));
    var z = Math.round(Number(safeCell.z || 0));
    var dx = 0;
    var dy = 0;
    if (dir === 'east') dx = 1;
    else if (dir === 'west') dx = -1;
    else if (dir === 'south') dy = 1;
    else if (dir === 'north') dy = -1;
    else return 'none';
    var nx = x + dx;
    var ny = y + dy;
    // A higher neighbor is the important step-wall boundary case: the neighbor
    // column contains a block above this top plane, so this top cell must not be
    // blindly merged across that edge in the future boundary-aware mesher.
    if (occupancyReaderHasSolid(occupancyReader, nx, ny, z + 1)) return 'higher-neighbor';
    if (occupancyReaderHasSolid(occupancyReader, nx, ny, z)) {
      return !occupancyReaderHasSolid(occupancyReader, nx, ny, z + 1) ? 'same-height' : 'higher-neighbor';
    }
    if (occupancyReaderHasSolid(occupancyReader, nx, ny, z - 1)) return 'lower-neighbor';
    // Keep the scan shallow and deterministic.  This is diagnostic metadata,
    // not a new renderer path; deeper terrain columns can be handled by the
    // follow-up active meshing step if needed.
    if (occupancyReaderHasSolid(occupancyReader, nx, ny, z - 2)) return 'lower-neighbor';
    return 'empty';
  }

  function getTerrainTopStepBoundaryRelations(cell, occupancyReader) {
    return {
      north: getTerrainTopNeighborHeightRelation(cell, 'north', occupancyReader),
      east: getTerrainTopNeighborHeightRelation(cell, 'east', occupancyReader),
      south: getTerrainTopNeighborHeightRelation(cell, 'south', occupancyReader),
      west: getTerrainTopNeighborHeightRelation(cell, 'west', occupancyReader)
    };
  }

  function getTerrainTopStepBoundarySignature(cell, occupancyReader) {
    var safeCell = cell && typeof cell === 'object' ? cell : null;
    if (!safeCell) return null;
    var rel = getTerrainTopStepBoundaryRelations(safeCell, occupancyReader);
    return [
      'top-step-boundary',
      'N:' + String(rel.north || 'none'),
      'E:' + String(rel.east || 'none'),
      'S:' + String(rel.south || 'none'),
      'W:' + String(rel.west || 'none')
    ].join('|');
  }

  function worldPointFromMergeUV(semanticFace, plane, u, v) {
    var face = String(semanticFace || 'top');
    var p = Number(plane || 0);
    var uu = Number(u || 0);
    var vv = Number(v || 0);
    if (face === 'top') return { x: uu, y: vv, z: p };
    if (face === 'east') return { x: p, y: uu, z: vv };
    if (face === 'south') return { x: uu, y: p, z: vv };
    if (face === 'west') return { x: p, y: uu, z: vv };
    if (face === 'north') return { x: uu, y: p, z: vv };
    return { x: uu, y: vv, z: p };
  }

  function buildTerrainPolygonLoopSignature(descriptor) {
    var loops = Array.isArray(descriptor && descriptor.polygonLoopsUV) ? descriptor.polygonLoopsUV : [];
    if (!loops.length) return '';
    return loops.map(function (loop) {
      return (Array.isArray(loop) ? loop : []).map(function (pt) {
        return String(Number(pt && pt.u || 0)) + ',' + String(Number(pt && pt.v || 0));
      }).join(';');
    }).join('||');
  }

  function buildTerrainTopBoundarySegmentsWorldFromDescriptor(descriptor, occupancyReader) {
    var face = descriptor && typeof descriptor === 'object' ? descriptor : null;
    if (!face || face.isTerrainFaceMergeCandidate !== true || String(face.semanticFace || '') !== 'top') return [];
    var reader = occupancyReader || null;
    var members = Array.isArray(face.members) && face.members.length ? face.members : [face];
    var segments = [];
    var seen = Object.create(null);

    function pointKey(pt) {
      return [
        Number(pt && pt.x || 0).toFixed(4),
        Number(pt && pt.y || 0).toFixed(4),
        Number(pt && pt.z || 0).toFixed(4)
      ].join(',');
    }

    function addSegment(a, b) {
      if (!a || !b) return;
      var ak = pointKey(a);
      var bk = pointKey(b);
      var key = ak < bk ? ak + '|' + bk : bk + '|' + ak;
      if (seen[key]) return;
      seen[key] = true;
      segments.push([a, b]);
    }

    function hasSameHeightTopSurface(nx, ny, plane) {
      return occupancyReaderHasSolid(reader, nx, ny, plane - 1) && !occupancyReaderHasSolid(reader, nx, ny, plane);
    }

    for (var i = 0; i < members.length; i++) {
      var member = members[i] && typeof members[i] === 'object' ? members[i] : null;
      var cell = member && (member.cell || member.box) ? (member.cell || member.box) : null;
      if (!cell || cell.generatedBy !== 'terrain-generator') continue;
      var x = Math.round(Number(cell.x || 0));
      var y = Math.round(Number(cell.y || 0));
      var z = Math.round(Number(cell.z || 0));
      var plane = z + 1;

      if (!hasSameHeightTopSurface(x, y - 1, plane)) addSegment({ x: x, y: y, z: plane }, { x: x + 1, y: y, z: plane });
      if (!hasSameHeightTopSurface(x + 1, y, plane)) addSegment({ x: x + 1, y: y, z: plane }, { x: x + 1, y: y + 1, z: plane });
      if (!hasSameHeightTopSurface(x, y + 1, plane)) addSegment({ x: x + 1, y: y + 1, z: plane }, { x: x, y: y + 1, z: plane });
      if (!hasSameHeightTopSurface(x - 1, y, plane)) addSegment({ x: x, y: y + 1, z: plane }, { x: x, y: y, z: plane });
    }
    return segments;
  }

  function buildMergedVoxelFaceWorldGeometry(descriptor) {
    var face = descriptor && typeof descriptor === 'object' ? descriptor : null;
    if (!face) return { worldPts: [], worldLoops: null, worldOutlineSegments: null };
    var semanticFace = String(face.semanticFace || 'top');
    var plane = Number(face.mergePlane != null ? face.mergePlane : 0);
    if (semanticFace === 'top' && Array.isArray(face.polygonLoopsUV) && face.polygonLoopsUV.length) {
      var worldLoops = [];
      for (var li = 0; li < face.polygonLoopsUV.length; li++) {
        var loop = Array.isArray(face.polygonLoopsUV[li]) ? face.polygonLoopsUV[li] : [];
        if (loop.length < 3) continue;
        worldLoops.push(loop.map(function (pt) { return worldPointFromMergeUV('top', plane, pt.u, pt.v); }));
      }
      var primaryLoop = worldLoops.length ? worldLoops[0] : [];
      var worldOutlineSegments = [];
      if (worldLoops.length) {
        for (var lsi = 0; lsi < worldLoops.length; lsi++) {
          var wLoop = worldLoops[lsi];
          for (var wi = 0; wi < wLoop.length; wi++) {
            worldOutlineSegments.push([wLoop[wi], wLoop[(wi + 1) % wLoop.length]]);
          }
        }
      }
      return {
        worldPts: primaryLoop,
        worldLoops: worldLoops,
        worldOutlineSegments: worldOutlineSegments
      };
    }
    var u = Number(face.mergeU || 0);
    var v = Number(face.mergeV || 0);
    var width = Math.max(1, Number(face.mergeWidth || 1));
    var height = Math.max(1, Number(face.mergeHeight || 1));
    if (!(width > 1 || height > 1)) {
      var cell = face.cell || face.box || null;
      var cellPts = buildVoxelFaceWorldPolygonForCell(cell, semanticFace);
      return { worldPts: cellPts, worldLoops: null, worldOutlineSegments: null };
    }
    var rect = [];
    if (semanticFace === 'top') rect = [{ x: u, y: v, z: plane }, { x: u + width, y: v, z: plane }, { x: u + width, y: v + height, z: plane }, { x: u, y: v + height, z: plane }];
    else if (semanticFace === 'east') rect = [{ x: plane, y: u, z: v }, { x: plane, y: u + width, z: v }, { x: plane, y: u + width, z: v + height }, { x: plane, y: u, z: v + height }];
    else if (semanticFace === 'south') rect = [{ x: u, y: plane, z: v }, { x: u + width, y: plane, z: v }, { x: u + width, y: plane, z: v + height }, { x: u, y: plane, z: v + height }];
    else if (semanticFace === 'west') rect = [{ x: plane, y: u, z: v + height }, { x: plane, y: u + width, z: v + height }, { x: plane, y: u + width, z: v }, { x: plane, y: u, z: v }];
    else if (semanticFace === 'north') rect = [{ x: u, y: plane, z: v + height }, { x: u + width, y: plane, z: v + height }, { x: u + width, y: plane, z: v }, { x: u, y: plane, z: v }];
    return { worldPts: rect, worldLoops: null, worldOutlineSegments: null };
  }

  function buildMergedVoxelFaceWorldPolygon(descriptor) {
    return buildMergedVoxelFaceWorldGeometry(descriptor).worldPts || [];
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    getTerrainMaterialMergeKeyForRenderCell: getTerrainMaterialMergeKeyForRenderCell,
    getTerrainFaceMergeSignature: getTerrainFaceMergeSignature,
    getTerrainSortBandKeyForRenderFace: getTerrainSortBandKeyForRenderFace,
    getTerrainSideEdgeVisibilitySignature: getTerrainSideEdgeVisibilitySignature,
    occupancyReaderHasSolid: occupancyReaderHasSolid,
    getTerrainSideTangentNeighbor: getTerrainSideTangentNeighbor,
    getTerrainSideStepBreakSignature: getTerrainSideStepBreakSignature,
    getTerrainTopNeighborHeightRelation: getTerrainTopNeighborHeightRelation,
    getTerrainTopStepBoundaryRelations: getTerrainTopStepBoundaryRelations,
    getTerrainTopStepBoundarySignature: getTerrainTopStepBoundarySignature,
    worldPointFromMergeUV: worldPointFromMergeUV,
    buildTerrainPolygonLoopSignature: buildTerrainPolygonLoopSignature,
    buildTerrainTopBoundarySegmentsWorldFromDescriptor: buildTerrainTopBoundarySegmentsWorldFromDescriptor,
    buildSlope1x1FaceWorldPolygon: buildSlope1x1FaceWorldPolygon,
    getSlope1x1DrawableFaces: getSlope1x1DrawableFaces,
    isOneCellSlopeCell: isOneCellSlopeCell,
    buildMergedVoxelFaceWorldGeometry: buildMergedVoxelFaceWorldGeometry,
    buildMergedVoxelFaceWorldPolygon: buildMergedVoxelFaceWorldPolygon
  };

  global.__TERRAIN_RENDER_CORE__ = api;
  global.IsometricTerrainRenderCore = api;
  global.__APP_CORE_TERRAIN_RENDER_CORE__ = api;
  if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
    global.__APP_NAMESPACE.bind('domain.terrainRenderCore', api, { owner: OWNER, phase: PHASE });
  }
})(window);
