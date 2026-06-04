// P4-B: domain core expands from box derivation to placement validation.
var __APP_CORE_SCENE_DOMAIN_CORE__ = (function () {
  var OWNER = 'src/core/domain/scene-domain-core.js';
  var PHASE = 'P4-E';

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function toInt(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function positiveSize(value, fallback) {
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) n = Number(fallback || 1);
    return Math.max(0.001, n);
  }


  function rectPolygon(box) {
    var x = toInt(box && box.x, 0);
    var y = toInt(box && box.y, 0);
    var w = positiveSize(box && box.w, 1);
    var d = positiveSize(box && box.d, 1);
    return [
      { x: x, y: y },
      { x: x + w, y: y },
      { x: x + w, y: y + d },
      { x: x, y: y + d }
    ];
  }

  function collisionPolygon(box) {
    return Array.isArray(box && box.collisionPolygon2d) && box.collisionPolygon2d.length >= 3
      ? box.collisionPolygon2d.map(function (pt) { return { x: toInt(pt && pt.x, 0), y: toInt(pt && pt.y, 0) }; })
      : rectPolygon(box || {});
  }

  function projectPolygon(axis, poly) {
    var min = Infinity;
    var max = -Infinity;
    for (var i = 0; i < poly.length; i++) {
      var value = poly[i].x * axis.x + poly[i].y * axis.y;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return { min: min, max: max };
  }

  function polygonsOverlap(polyA, polyB) {
    var EPS = 1e-7;
    var polys = [polyA, polyB];
    for (var p = 0; p < polys.length; p++) {
      var poly = polys[p];
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i];
        var b = poly[(i + 1) % poly.length];
        var edge = { x: b.x - a.x, y: b.y - a.y };
        var axis = { x: -edge.y, y: edge.x };
        var len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
        if (len <= EPS) continue;
        axis.x /= len;
        axis.y /= len;
        var pa = projectPolygon(axis, polyA);
        var pb = projectPolygon(axis, polyB);
        if (pa.max <= pb.min + EPS || pb.max <= pa.min + EPS) return false;
      }
    }
    return true;
  }



  var QUARTER_MASK_BITS = { ne: 1, se: 2, sw: 4, nw: 8 };
  var QUARTER_MASK_NAMES = ['ne', 'se', 'sw', 'nw'];

  function pointInPolygon2d(point, polygon) {
    var x = toInt(point && point.x, 0);
    var y = toInt(point && point.y, 0);
    var inside = false;
    var poly = Array.isArray(polygon) ? polygon : [];
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = toInt(poly[i] && poly[i].x, 0);
      var yi = toInt(poly[i] && poly[i].y, 0);
      var xj = toInt(poly[j] && poly[j].x, 0);
      var yj = toInt(poly[j] && poly[j].y, 0);
      var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function buildDiamondQuarterPolygons(cellX, cellY) {
    var x = toInt(cellX, 0);
    var y = toInt(cellY, 0);
    var c = { x: x + 0.5, y: y + 0.5 };
    return {
      ne: [{ x: x, y: y }, { x: x + 1, y: y }, c],
      se: [{ x: x + 1, y: y }, { x: x + 1, y: y + 1 }, c],
      sw: [{ x: x + 1, y: y + 1 }, { x: x, y: y + 1 }, c],
      nw: [{ x: x, y: y + 1 }, { x: x, y: y }, c]
    };
  }

  function quarterMaskToNames(mask) {
    var value = Math.round(Number(mask) || 0);
    var out = [];
    for (var i = 0; i < QUARTER_MASK_NAMES.length; i++) {
      var name = QUARTER_MASK_NAMES[i];
      if ((value & QUARTER_MASK_BITS[name]) !== 0) out.push(name);
    }
    return out;
  }

  function computeBoxQuarterMaskAtCell(box, cellX, cellY) {
    var poly = collisionPolygon(box || {});
    var quarters = buildDiamondQuarterPolygons(cellX, cellY);
    var mask = 0;
    for (var i = 0; i < QUARTER_MASK_NAMES.length; i++) {
      var name = QUARTER_MASK_NAMES[i];
      var qPoly = quarters[name];
      if (polygonsOverlap(poly, qPoly)) mask |= QUARTER_MASK_BITS[name];
    }
    return mask;
  }

  function buildQuarterOccupancyIndex(boxes, options) {
    var list = Array.isArray(boxes) ? boxes : [];
    var opts = options && typeof options === 'object' ? options : {};
    var index = Object.create(null);
    var summary = {
      boxCount: list.length,
      occupiedCellLayerCount: 0,
      fullMaskCellLayerCount: 0,
      partialMaskCellLayerCount: 0,
      quarterHitCount: 0,
      maskHistogram: Object.create(null),
      sampleCells: [],
      mode: 'diamond_quarters'
    };
    for (var i = 0; i < list.length; i++) {
      var b = list[i] || {};
      if (b.collidable === false) continue;
      var x0 = toInt(b.x, 0);
      var y0 = toInt(b.y, 0);
      var z0 = toInt(b.z, 0);
      var w = positiveSize(b.w, 1);
      var d = positiveSize(b.d, 1);
      var h = positiveSize(b.h, 1);
      var ix0 = Math.floor(x0 + 1e-6);
      var ix1 = Math.ceil(x0 + w - 1e-6);
      var iy0 = Math.floor(y0 + 1e-6);
      var iy1 = Math.ceil(y0 + d - 1e-6);
      var iz0 = Math.floor(z0 + 1e-6);
      var iz1 = Math.ceil(z0 + h - 1e-6);
      for (var x = ix0; x < ix1; x++) {
        for (var y = iy0; y < iy1; y++) {
          var mask = computeBoxQuarterMaskAtCell(b, x, y);
          if (!mask) continue;
          for (var z = iz0; z < iz1; z++) {
            var key = [x, y, z].join(',');
            var cell = index[key];
            if (!cell) {
              cell = index[key] = { x: x, y: y, z: z, mask: 0, quarters: [], count: 0, boxIds: [] };
            }
            var before = cell.mask;
            cell.mask = cell.mask | mask;
            cell.count += 1;
            if (b.id || b.instanceId) cell.boxIds.push(String(b.id || b.instanceId));
            if (cell.mask !== before) cell.quarters = quarterMaskToNames(cell.mask);
          }
        }
      }
    }
    var keys = Object.keys(index);
    summary.occupiedCellLayerCount = keys.length;
    for (var k = 0; k < keys.length; k++) {
      var item = index[keys[k]] || {};
      var m = Math.round(Number(item.mask) || 0);
      var qn = quarterMaskToNames(m);
      summary.quarterHitCount += qn.length;
      summary.maskHistogram[String(m)] = (summary.maskHistogram[String(m)] || 0) + 1;
      if (m === 15) summary.fullMaskCellLayerCount += 1;
      else if (m > 0) summary.partialMaskCellLayerCount += 1;
      if (summary.sampleCells.length < Math.max(0, Number(opts.sampleLimit != null ? opts.sampleLimit : 8))) {
        summary.sampleCells.push({ key: keys[k], x: item.x, y: item.y, z: item.z, mask: m, quarters: qn });
      }
    }
    return { cells: index, summary: summary, mode: 'diamond_quarters' };
  }

  function getQuarterOccupancyCell(index, cellX, cellY, cellZ) {
    var source = index && index.cells ? index.cells : index;
    if (!source) return null;
    var key = [toInt(cellX, 0), toInt(cellY, 0), toInt(cellZ, 0)].join(',');
    return source[key] || null;
  }

  function collisionXYOverlap(a, b) {
    if (!a || !b) return false;
    var ax1 = toInt(a.x, 0), ay1 = toInt(a.y, 0);
    var bx1 = toInt(b.x, 0), by1 = toInt(b.y, 0);
    var ax2 = ax1 + positiveSize(a.w, 1);
    var ay2 = ay1 + positiveSize(a.d, 1);
    var bx2 = bx1 + positiveSize(b.w, 1);
    var by2 = by1 + positiveSize(b.d, 1);
    if (ax2 <= bx1 || bx2 <= ax1 || ay2 <= by1 || by2 <= ay1) return false;
    if (Array.isArray(a.collisionPolygon2d) || Array.isArray(b.collisionPolygon2d)) {
      return polygonsOverlap(collisionPolygon(a), collisionPolygon(b));
    }
    return true;
  }

  function getSpriteProxySortMode(prefab) {
    var mode = prefab && prefab.sprite && prefab.sprite.sortMode;
    return String(mode || 'box_occlusion');
  }

  function summarizeSupportPlane(supportHeights, supportZ) {
    var list = Array.isArray(supportHeights) ? supportHeights : [];
    var minTop = Infinity;
    var maxTop = -Infinity;
    for (var i = 0; i < list.length; i++) {
      var top = toInt(list[i] && list[i].top, 0);
      if (top < minTop) minTop = top;
      if (top > maxTop) maxTop = top;
    }
    if (!list.length) {
      minTop = 0;
      maxTop = 0;
    }
    var kind = maxTop <= 0 ? 'ground' : 'stack';
    return {
      kind: kind,
      cellCount: list.length,
      supportZ: toInt(supportZ, 0),
      minTop: minTop,
      maxTop: maxTop,
      cells: clone(list)
    };
  }

  function deriveBoxesFromInstances(instances, expandInstanceToBoxes) {
    var list = Array.isArray(instances) ? instances : [];
    var out = [];
    if (typeof expandInstanceToBoxes !== 'function') return out;
    for (var i = 0; i < list.length; i++) {
      var boxes = expandInstanceToBoxes(list[i], true) || [];
      for (var j = 0; j < boxes.length; j++) out.push(boxes[j]);
    }
    return out;
  }

  function buildOccupancyIndex(boxes) {
    var list = Array.isArray(boxes) ? boxes : [];
    var index = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var b = list[i] || {};
      var x0 = toInt(b.x, 0);
      var y0 = toInt(b.y, 0);
      var z0 = toInt(b.z, 0);
      var w = positiveSize(b.w, 1);
      var d = positiveSize(b.d, 1);
      var h = positiveSize(b.h, 1);
      var ix0 = Math.floor(x0 + 1e-6);
      var ix1 = Math.ceil(x0 + w - 1e-6);
      var iy0 = Math.floor(y0 + 1e-6);
      var iy1 = Math.ceil(y0 + d - 1e-6);
      var iz0 = Math.floor(z0 + 1e-6);
      var iz1 = Math.ceil(z0 + h - 1e-6);
      for (var x = ix0; x < ix1; x++) {
        for (var y = iy0; y < iy1; y++) {
          for (var z = iz0; z < iz1; z++) {
            var key = [x, y, z].join(',');
            index[key] = (index[key] || 0) + 1;
          }
        }
      }
    }
    return index;
  }

  function boxesOverlap(a, b, ignoreInstanceId) {
    if (!a || !b) return false;
    if (ignoreInstanceId && (a.instanceId === ignoreInstanceId || b.instanceId === ignoreInstanceId)) return false;
    var az1 = toInt(a.z, 0);
    var bz1 = toInt(b.z, 0);
    var az2 = az1 + positiveSize(a.h, 1);
    var bz2 = bz1 + positiveSize(b.h, 1);
    if (az2 <= bz1 || bz2 <= az1) return false;
    return collisionXYOverlap(a, b);
  }

  function canPlaceBoxes(candidateBoxes, existingBoxes, ignoreInstanceId) {
    var candidates = Array.isArray(candidateBoxes) ? candidateBoxes : [];
    var existing = Array.isArray(existingBoxes) ? existingBoxes : [];
    var overlaps = [];
    for (var i = 0; i < candidates.length; i++) {
      for (var j = 0; j < existing.length; j++) {
        if (boxesOverlap(candidates[i], existing[j], ignoreInstanceId)) {
          overlaps.push({
            candidateIndex: i,
            existingIndex: j,
            instanceId: existing[j] && existing[j].instanceId ? existing[j].instanceId : null,
            boxId: existing[j] && existing[j].id ? existing[j].id : null
          });
        }
      }
    }
    return { ok: overlaps.length === 0, overlapCount: overlaps.length, overlaps: overlaps.slice(0, 20) };
  }

  function buildColumnTopIndex(boxes, ignoreInstanceId) {
    var list = Array.isArray(boxes) ? boxes : [];
    var index = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var b = list[i] || {};
      if (ignoreInstanceId && b.instanceId === ignoreInstanceId) continue;
      var x0 = toInt(b.x, 0);
      var y0 = toInt(b.y, 0);
      var z0 = toInt(b.z, 0);
      var w = positiveSize(b.w, 1);
      var d = positiveSize(b.d, 1);
      var top = z0 + positiveSize(b.h, 1);
      var ix0 = Math.floor(x0 + 1e-6);
      var ix1 = Math.ceil(x0 + w - 1e-6);
      var iy0 = Math.floor(y0 + 1e-6);
      var iy1 = Math.ceil(y0 + d - 1e-6);
      for (var x = ix0; x < ix1; x++) {
        for (var y = iy0; y < iy1; y++) {
          var key = x + ',' + y;
          if (!(key in index) || top > index[key]) index[key] = top;
        }
      }
    }
    return index;
  }


  function hasCollisionPolygons(boxes) {
    var list = Array.isArray(boxes) ? boxes : [];
    for (var i = 0; i < list.length; i++) {
      if (Array.isArray(list[i] && list[i].collisionPolygon2d) && list[i].collisionPolygon2d.length >= 3) return true;
    }
    return false;
  }

  function writeTopForCandidateFootprint(index, candidateBox, top) {
    var cb = candidateBox || {};
    var x0 = toInt(cb.x, 0);
    var y0 = toInt(cb.y, 0);
    var w = positiveSize(cb.w, 1);
    var d = positiveSize(cb.d, 1);
    var ix0 = Math.floor(x0 + 1e-6);
    var ix1 = Math.ceil(x0 + w - 1e-6);
    var iy0 = Math.floor(y0 + 1e-6);
    var iy1 = Math.ceil(y0 + d - 1e-6);
    for (var x = ix0; x < ix1; x++) {
      for (var y = iy0; y < iy1; y++) {
        var key = x + ',' + y;
        if (!(key in index) || top > index[key]) index[key] = top;
      }
    }
  }

  function buildCandidateAwareColumnTopIndex(candidateBoxes, existingBoxes, ignoreInstanceId) {
    var candidates = Array.isArray(candidateBoxes) ? candidateBoxes : [];
    var existing = Array.isArray(existingBoxes) ? existingBoxes : [];
    var index = Object.create(null);
    for (var i = 0; i < candidates.length; i++) {
      var cb = candidates[i] || {};
      for (var j = 0; j < existing.length; j++) {
        var eb = existing[j] || {};
        if (ignoreInstanceId && eb.instanceId === ignoreInstanceId) continue;
        if (!collisionXYOverlap(cb, eb)) continue;
        var top = toInt(eb.z, 0) + positiveSize(eb.h, 1);
        writeTopForCandidateFootprint(index, cb, top);
      }
    }
    return index;
  }

  function highestTopAtCellFromIndex(index, cellX, cellY) {
    if (!index) return 0;
    var key = toInt(cellX, 0) + ',' + toInt(cellY, 0);
    return toInt(index[key], 0);
  }

  function resolveSupportPlane(cellX, cellY, supportCells, columnTopIndex, grid) {
    var safeSupports = Array.isArray(supportCells) && supportCells.length ? supportCells : [{ x: 0, y: 0, localZ: 0 }];
    var gridW = grid ? toInt(grid.gridW || grid.cols, 0) : 0;
    var gridH = grid ? toInt(grid.gridH || grid.rows, 0) : 0;
    var supportHeights = [];
    var originCandidates = [];
    for (var i = 0; i < safeSupports.length; i++) {
      var support = safeSupports[i] || {};
      var worldX = toInt(cellX, 0) + toInt(support.x, 0);
      var worldY = toInt(cellY, 0) + toInt(support.y, 0);
      if (worldX < 0 || worldY < 0 || worldX >= gridW || worldY >= gridH) {
        return { ok: false, reason: 'out', supportZ: null, supportHeights: supportHeights, supportSummary: summarizeSupportPlane(supportHeights, null) };
      }
      var top = highestTopAtCellFromIndex(columnTopIndex, worldX, worldY);
      supportHeights.push({ x: worldX, y: worldY, top: top });
      originCandidates.push(top - toInt(support.localZ, 0));
    }
    var supportZ = originCandidates.length ? originCandidates[0] : 0;
    for (var j = 1; j < originCandidates.length; j++) {
      if (Math.abs(originCandidates[j] - supportZ) > 1e-6) {
        return { ok: false, reason: 'uneven', supportZ: null, supportHeights: supportHeights, supportSummary: summarizeSupportPlane(supportHeights, null) };
      }
    }
    return { ok: true, reason: 'ok', supportZ: supportZ, supportHeights: supportHeights, supportSummary: summarizeSupportPlane(supportHeights, supportZ) };
  }

  function projectWorldBoxes(proto, cellX, cellY, supportZ) {
    var safeProto = proto || {};
    var voxels = Array.isArray(safeProto.voxels) ? safeProto.voxels : [];
    var out = [];
    for (var i = 0; i < voxels.length; i++) {
      var v = voxels[i] || {};
      out.push({
        name: safeProto.name,
        prefabId: safeProto.id || null,
        x: toInt(cellX, 0) + toInt(v.x, 0),
        y: toInt(cellY, 0) + toInt(v.y, 0),
        z: toInt(supportZ, 0) + toInt(v.z, 0),
        w: positiveSize(v.w, 1),
        d: positiveSize(v.d, 1),
        h: positiveSize(v.h, 1),
        shapeKind: v.shapeKind || safeProto.shapeKind || null,
        collisionPolygon2d: Array.isArray(v.collisionPolygon2d) ? v.collisionPolygon2d.map(function (pt) { return { x: toInt(cellX, 0) + toInt(pt && pt.x, 0), y: toInt(cellY, 0) + toInt(pt && pt.y, 0) }; }) : null,
        renderHidden: v.renderHidden === true,
        collisionOnly: v.collisionOnly === true,
        stairRole: v.stairRole || null,
        stairStepIndex: v.stairStepIndex != null ? toInt(v.stairStepIndex, 0) : null,
        stairStepCount: v.stairStepCount != null ? Math.max(1, toInt(v.stairStepCount, 1)) : null,
        stairMaxStepUpCells: v.stairMaxStepUpCells != null ? Math.max(0, toInt(v.stairMaxStepUpCells, 0.6)) : null,
        cylinderResolution: v.cylinderResolution != null ? Math.max(1, toInt(v.cylinderResolution, 1)) : null,
        cylinderCellX: v.cylinderCellX != null ? toInt(v.cylinderCellX, 0) : null,
        cylinderCellY: v.cylinderCellY != null ? toInt(v.cylinderCellY, 0) : null,
        cylinderCellIndex: v.cylinderCellIndex != null ? toInt(v.cylinderCellIndex, 0) : null,
        base: v.base || safeProto.base,
        localIndex: i
      });
    }
    return out;
  }

  function summarizeBoundingBox(worldBoxes, proto) {
    var list = Array.isArray(worldBoxes) ? worldBoxes : [];
    if (!list.length) return { bbox: null, anchorBox: null };
    var minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (var i = 0; i < list.length; i++) {
      var b = list[i] || {};
      minX = Math.min(minX, toInt(b.x, 0));
      minY = Math.min(minY, toInt(b.y, 0));
      minZ = Math.min(minZ, toInt(b.z, 0));
      maxX = Math.max(maxX, toInt(b.x, 0) + positiveSize(b.w, 1));
      maxY = Math.max(maxY, toInt(b.y, 0) + positiveSize(b.d, 1));
      maxZ = Math.max(maxZ, toInt(b.z, 0) + positiveSize(b.h, 1));
    }
    var bbox = { x: minX, y: minY, z: minZ, w: maxX - minX, d: maxY - minY, h: maxZ - minZ };
    var anchorBox = { name: proto && proto.name ? proto.name : 'unknown', base: proto && proto.base ? proto.base : null, x: bbox.x, y: bbox.y, z: bbox.z, w: bbox.w, d: bbox.d, h: bbox.h };
    return { bbox: bbox, anchorBox: anchorBox };
  }

  function validateWorldBoxes(worldBoxes, existingBoxes, grid, playerBox, ignoreInstanceId) {
    var boxesList = Array.isArray(worldBoxes) ? worldBoxes : [];
    var gridW = grid ? toInt(grid.gridW || grid.cols, 0) : 0;
    var gridH = grid ? toInt(grid.gridH || grid.rows, 0) : 0;
    for (var i = 0; i < boxesList.length; i++) {
      var box = boxesList[i] || {};
      var bx = toInt(box.x, 0);
      var by = toInt(box.y, 0);
      var bw = positiveSize(box.w, 1);
      var bd = positiveSize(box.d, 1);
      if (bx < 0 || by < 0 || bx + bw > gridW + 1e-6 || by + bd > gridH + 1e-6) {
        return { ok: false, reason: 'out', overlapIds: [] };
      }
    }
    var overlaps = canPlaceBoxes(boxesList, existingBoxes, ignoreInstanceId);
    if (!overlaps.ok) {
      return {
        ok: false,
        reason: 'overlap',
        overlapIds: overlaps.overlaps.map(function (item) { return item.instanceId || item.boxId; }).filter(Boolean)
      };
    }
    if (playerBox) {
      for (var j = 0; j < boxesList.length; j++) {
        if (boxesOverlap(boxesList[j], playerBox, null)) {
          return { ok: false, reason: 'player-overlap', overlapIds: ['player'] };
        }
      }
    }
    return { ok: true, reason: 'ok', overlapIds: [] };
  }

  function getInstanceBoundsFromBoxes(boxes, instanceId) {
    var rawList = Array.isArray(boxes) ? boxes : [];
    var id = instanceId != null ? String(instanceId) : '';
    var list = id ? rawList.filter(function (box) { return box && String(box.instanceId || '') === id; }) : rawList;
    if (!list.length) return null;
    var minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (var i = 0; i < list.length; i++) {
      var b = list[i] || {};
      minX = Math.min(minX, toInt(b.x, 0));
      minY = Math.min(minY, toInt(b.y, 0));
      minZ = Math.min(minZ, toInt(b.z, 0));
      maxX = Math.max(maxX, toInt(b.x, 0) + positiveSize(b.w, 1));
      maxY = Math.max(maxY, toInt(b.y, 0) + positiveSize(b.d, 1));
      maxZ = Math.max(maxZ, toInt(b.z, 0) + positiveSize(b.h, 1));
    }
    return { x: minX, y: minY, z: minZ, w: maxX - minX, d: maxY - minY, h: maxZ - minZ };
  }


  function getItemFacingCoreApi() {
    try {
      return (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.itemFacingCore)
        ? window.App.domain.itemFacingCore
        : (typeof window !== 'undefined' ? window.__ITEM_FACING_CORE__ || null : null);
    } catch (_) {
      return (typeof window !== 'undefined' ? window.__ITEM_FACING_CORE__ || null : null);
    }
  }

  function normalizeViewRotationLocal(value) {
    value = Math.round(Number(value) || 0);
    return ((value % 4) + 4) % 4;
  }

  function rotatePointForSort(point, viewRotation) {
    var x = toInt(point && point.x, 0);
    var y = toInt(point && point.y, 0);
    switch (normalizeViewRotationLocal(viewRotation)) {
      case 1: return { x: y, y: -x };
      case 2: return { x: -x, y: -y };
      case 3: return { x: -y, y: x };
      default: return { x: x, y: y };
    }
  }

  function computeViewAwareSortMeta(point, h, viewRotation, sortBias) {
    var rotated = rotatePointForSort(point, viewRotation);
    var z = toInt(point && point.z, 0);
    return {
      sortKey: rotated.x + rotated.y + z + Math.max(0, toInt(h, 0)) + Number(sortBias || 0),
      tie: z * 100000 + rotated.y * 100 + rotated.x,
      rotatedPoint: rotated
    };
  }

  function computeViewAwareFootprintSortMeta(point, w, d, h, viewRotation, sortBias) {
    var x = toInt(point && point.x, 0);
    var y = toInt(point && point.y, 0);
    var z = toInt(point && point.z, 0);
    var width = Math.max(0.001, positiveSize(w, 1));
    var depth = Math.max(0.001, positiveSize(d, 1));
    var corners = [
      rotatePointForSort({ x: x, y: y }, viewRotation),
      rotatePointForSort({ x: x + width, y: y }, viewRotation),
      rotatePointForSort({ x: x, y: y + depth }, viewRotation),
      rotatePointForSort({ x: x + width, y: y + depth }, viewRotation)
    ];
    var minX = corners[0].x;
    var minY = corners[0].y;
    for (var i = 1; i < corners.length; i++) {
      if (corners[i].x < minX) minX = corners[i].x;
      if (corners[i].y < minY) minY = corners[i].y;
    }
    var anchor = { x: minX, y: minY };
    return {
      sortKey: anchor.x + anchor.y + z + Math.max(0, toInt(h, 0)) + Number(sortBias || 0),
      tie: z * 100000 + anchor.y * 100 + anchor.x,
      rotatedPoint: anchor,
      footprintCorners: corners,
      sortAnchorMode: 'view-footprint-min'
    };
  }

  function computeProjectedPlayerSpriteOcclusion(playerBox, spriteBox) {
    if (!playerBox || !spriteBox) return false;
    var viewRotation = normalizeViewRotationLocal(spriteBox && spriteBox.viewRotation != null ? spriteBox.viewRotation : 0);
    var playerMeta = computeViewAwareSortMeta({ x: playerBox.x, y: playerBox.y, z: playerBox.z }, 0, viewRotation, 0);
    var spriteMeta = computeViewAwareSortMeta({ x: spriteBox.x, y: spriteBox.y, z: spriteBox.z }, spriteBox.h, viewRotation, 0);
    var px1 = toInt(playerBox.x, 0);
    var py1 = toInt(playerBox.y, 0);
    var px2 = px1 + Math.max(1, toInt(playerBox.w, 1));
    var py2 = py1 + Math.max(1, toInt(playerBox.d, 1));
    var sx1 = toInt(spriteBox.x, 0);
    var sy1 = toInt(spriteBox.y, 0);
    var sx2 = sx1 + Math.max(1, toInt(spriteBox.w, 1));
    var sy2 = sy1 + Math.max(1, toInt(spriteBox.d, 1));
    var overlap = !(px2 <= sx1 || sx2 <= px1 || py2 <= sy1 || sy2 <= py1);
    if (!overlap) return false;
    return Number(spriteMeta.sortKey || 0) >= Number(playerMeta.sortKey || 0);
  }

  function computeVoxelRenderableSort(box, playerBox, sortBias) {
    var b = box || {};
    var cell = b.cell || b;
    var x = toInt(cell.x != null ? cell.x : b.x, 0);
    var y = toInt(cell.y != null ? cell.y : b.y, 0);
    var z = toInt(cell.z != null ? cell.z : b.z, 0);
    var w = positiveSize(cell.w != null ? cell.w : b.w, 1);
    var d = positiveSize(cell.d != null ? cell.d : b.d, 1);
    var h = positiveSize(cell.h != null ? cell.h : b.h, 1);
    var viewRotation = normalizeViewRotationLocal(b.viewRotation != null ? b.viewRotation : 0);
    var sortMeta = computeViewAwareFootprintSortMeta({ x: x, y: y, z: z }, w, d, h, viewRotation, sortBias);
    var occludesPlayer = computeProjectedPlayerSpriteOcclusion(playerBox, { x: x, y: y, z: z, w: w, d: d, h: h, viewRotation: viewRotation });
    return {
      sortKey: sortMeta.sortKey,
      tie: sortMeta.tie,
      occludesPlayer: !!occludesPlayer,
      sortMode: 'voxel-footprint-anchor'
    };
  }

  function computeSpriteRenderableSort(spriteBox, playerBox, sortMode, sortBias) {
    var b = spriteBox || {};
    var instance = b.instance || null;
    var prefab = b.prefab || null;
    var mode = String((b && b.sortMode) || sortMode || 'box_occlusion');
    var x = toInt(b.x != null ? b.x : (instance && instance.x), 0);
    var y = toInt(b.y != null ? b.y : (instance && instance.y), 0);
    var z = toInt(b.z != null ? b.z : (instance && instance.z), 0);
    var h = Math.max(1, toInt(b.h != null ? b.h : (prefab && prefab.h), 1));
    var viewRotation = normalizeViewRotationLocal(b.viewRotation != null ? b.viewRotation : 0);
    var facingApi = getItemFacingCoreApi();
    var sortBase = facingApi && prefab && typeof facingApi.computeSortBase === 'function'
      ? facingApi.computeSortBase(prefab, instance && instance.rotation != null ? instance.rotation : 0, instance || { x: x, y: y, z: z })
      : null;
    var anchor = sortBase && sortBase.rotatedAnchor ? sortBase.rotatedAnchor : { x: 0, y: 0, z: 0 };
    var sortMeta = computeViewAwareSortMeta({ x: x + anchor.x, y: y + anchor.y, z: z + anchor.z }, h, viewRotation, sortBias);
    var occludesPlayer = false;
    if (mode === 'box_occlusion') occludesPlayer = computeProjectedPlayerSpriteOcclusion(playerBox, Object.assign({}, b, { x: x, y: y, z: z, h: h, viewRotation: viewRotation }));
    return {
      sortKey: sortMeta.sortKey,
      tie: sortMeta.tie,
      occludesPlayer: !!occludesPlayer,
      sortMode: mode,
      sortBase: sortBase
    };
  }


  function computePlayerActorRenderableSort(playerBox, sortBias) {
    var payload = playerBox && typeof playerBox === 'object' ? playerBox : {};
    var player = payload.player && typeof payload.player === 'object' ? payload.player : payload;
    var x = Number(player && player.x);
    if (!Number.isFinite(x)) x = 0;
    var y = Number(player && player.y);
    if (!Number.isFinite(y)) y = 0;
    var logicalZ = Number(player && player.z);
    if (!Number.isFinite(logicalZ)) logicalZ = 0;
    var renderSortZ = Number(player && player.renderSortZ);
    var visualZ = Number(player && player.visualZ);
    var sortZ = Number.isFinite(renderSortZ) ? renderSortZ : (Number.isFinite(visualZ) ? visualZ : logicalZ);
    var viewRotation = normalizeViewRotationLocal(payload.viewRotation != null ? payload.viewRotation : 0);
    var sortMeta = computeViewAwareSortMeta({ x: x, y: y, z: sortZ }, 0, viewRotation, sortBias);
    return {
      sortKey: Number(sortMeta.sortKey || 0) + 0.0007,
      tie: 700000 + Number(sortMeta.tie || 0),
      occludesPlayer: false,
      sortMode: 'player-foot-anchor',
      depthAnchor: { x: x, y: y, z: sortZ },
      rotatedPoint: sortMeta.rotatedPoint || null,
      logicalZ: logicalZ,
      visualZ: Number.isFinite(visualZ) ? visualZ : null,
      renderSortZ: Number.isFinite(renderSortZ) ? renderSortZ : null,
      sortZ: sortZ
    };
  }

  function buildTileAlignedSpriteRenderParts(input) {
    var safe = input && typeof input === 'object' ? input : {};
    var maxParts = Math.max(1, toInt(safe.maxParts, 4));
    var viewRotation = normalizeViewRotationLocal(safe.viewRotation != null ? safe.viewRotation : 0);
    var rawCells = Array.isArray(safe.cells) ? safe.cells : [];
    var byFootCell = Object.create(null);
    for (var i = 0; i < rawCells.length; i++) {
      var raw = rawCells[i] || {};
      var x = toInt(raw.x, 0);
      var y = toInt(raw.y, 0);
      var z = toInt(raw.z, 0);
      var h = Math.max(1, toInt(raw.h, 1));
      var key = String(x) + ',' + String(y);
      var existing = byFootCell[key];
      if (!existing || z < existing.z) {
        byFootCell[key] = { x: x, y: y, z: z, h: h, columnTopZ: z + h };
      } else if (existing && z + h > existing.columnTopZ) {
        existing.columnTopZ = z + h;
        existing.h = Math.max(existing.h, existing.columnTopZ - existing.z);
      }
    }
    var cells = Object.keys(byFootCell).map(function (key) { return byFootCell[key]; });
    cells.sort(function (a, b) {
      var am = computeViewAwareSortMeta({ x: a.x, y: a.y, z: a.z }, a.h, viewRotation, 0);
      var bm = computeViewAwareSortMeta({ x: b.x, y: b.y, z: b.z }, b.h, viewRotation, 0);
      if (am.rotatedPoint.x !== bm.rotatedPoint.x) return am.rotatedPoint.x - bm.rotatedPoint.x;
      if (am.rotatedPoint.y !== bm.rotatedPoint.y) return am.rotatedPoint.y - bm.rotatedPoint.y;
      if (a.z !== b.z) return a.z - b.z;
      return 0;
    });
    if (cells.length <= 1) {
      return { split: false, reason: cells.length ? 'single-footprint-cell' : 'missing-footprint-cells', partCount: cells.length, parts: cells };
    }
    if (cells.length > maxParts) {
      return { split: false, reason: 'too-many-footprint-cells', partCount: cells.length, maxParts: maxParts, parts: cells };
    }
    var parts = cells.map(function (cell, index) {
      var order = computeViewAwareSortMeta({ x: cell.x, y: cell.y, z: cell.z }, cell.h, viewRotation, 0);
      return {
        partId: 'cell-' + String(cell.x) + '-' + String(cell.y) + '-' + String(cell.z),
        cell: { x: cell.x, y: cell.y, z: cell.z, h: cell.h },
        sourceIndex: index,
        sourceCount: cells.length,
        sortKey: order.sortKey,
        tie: order.tie,
        rotatedPoint: order.rotatedPoint
      };
    });
    return { split: true, reason: 'tile-aligned-footprint-split', partCount: parts.length, maxParts: maxParts, parts: parts };
  }

  function compareRenderableOrder(a, b) {
    var left = a || {};
    var right = b || {};
    var leftSort = Number(left.sortKey || 0);
    var rightSort = Number(right.sortKey || 0);
    if (Math.abs(leftSort - rightSort) > 1e-6) return leftSort - rightSort;
    return Number(left.tie || 0) - Number(right.tie || 0);
  }

  function evaluatePlacementCandidate(input) {
    var safe = input || {};
    var proto = safe.proto || {};
    var cellX = toInt(safe.cellX, 0);
    var cellY = toInt(safe.cellY, 0);
    var ignoreInstanceId = safe.ignoreInstanceId || null;
    var existingBoxes = Array.isArray(safe.existingBoxes) ? safe.existingBoxes : [];
    var supportCells = Array.isArray(proto.supportCells) && proto.supportCells.length ? proto.supportCells : [{ x: 0, y: 0, localZ: 0 }];
    var candidateFootprintBoxes = projectWorldBoxes(proto, cellX, cellY, 0);
    var columnTopIndex = hasCollisionPolygons(candidateFootprintBoxes)
      ? buildCandidateAwareColumnTopIndex(candidateFootprintBoxes, existingBoxes, ignoreInstanceId)
      : buildColumnTopIndex(existingBoxes, ignoreInstanceId);
    var support = resolveSupportPlane(cellX, cellY, supportCells, columnTopIndex, safe.grid || null);
    if (!support.ok) {
      return { valid: false, reason: support.reason, supportZ: support.supportZ, supportHeights: support.supportHeights || [], supportSummary: support.supportSummary || summarizeSupportPlane(support.supportHeights || [], support.supportZ), overlapIds: [], box: null, boxes: [], bbox: null, origin: support.reason === 'out' ? null : null, prefabId: proto.id || null, rotation: proto.rotation };
    }
    var worldBoxes = projectWorldBoxes(proto, cellX, cellY, support.supportZ);
    var validation = validateWorldBoxes(worldBoxes, existingBoxes, safe.grid || null, safe.playerBox || null, ignoreInstanceId);
    if (!validation.ok) {
      return { valid: false, reason: validation.reason, supportZ: support.supportZ, supportHeights: support.supportHeights || [], supportSummary: support.supportSummary || summarizeSupportPlane(support.supportHeights || [], support.supportZ), overlapIds: validation.overlapIds || [], box: null, boxes: worldBoxes, bbox: null, origin: { x: cellX, y: cellY, z: support.supportZ }, prefabId: proto.id || null, rotation: proto.rotation };
    }
    var bboxInfo = summarizeBoundingBox(worldBoxes, proto);
    return { valid: true, reason: 'ok', supportZ: support.supportZ, supportHeights: support.supportHeights || [], supportSummary: support.supportSummary || summarizeSupportPlane(support.supportHeights || [], support.supportZ), overlapIds: [], box: bboxInfo.anchorBox, boxes: worldBoxes, bbox: bboxInfo.bbox, origin: { x: cellX, y: cellY, z: support.supportZ }, prefabId: proto.id || null, rotation: proto.rotation };
  }

  function deriveSceneGraph(instances, expandInstanceToBoxes) {
    var safeInstances = Array.isArray(instances) ? instances.slice() : [];
    var boxes = deriveBoxesFromInstances(safeInstances, expandInstanceToBoxes);
    var quarterOccupancy = buildQuarterOccupancyIndex(boxes, { sampleLimit: 8 });
    return {
      instances: safeInstances,
      boxes: boxes,
      occupancy: buildOccupancyIndex(boxes),
      quarterOccupancy: quarterOccupancy,
      quarterOccupancySummary: quarterOccupancy.summary
    };
  }

  function summarizeCoverage() {
    return {
      phase: PHASE,
      owner: OWNER,
      pureFunctions: ['deriveBoxesFromInstances', 'buildOccupancyIndex', 'buildQuarterOccupancyIndex', 'getQuarterOccupancyCell', 'quarterMaskToNames', 'canPlaceBoxes', 'buildColumnTopIndex', 'buildCandidateAwareColumnTopIndex', 'summarizeSupportPlane', 'resolveSupportPlane', 'projectWorldBoxes', 'getInstanceBoundsFromBoxes', 'computeProjectedPlayerSpriteOcclusion', 'computeVoxelRenderableSort', 'computeSpriteRenderableSort', 'computePlayerActorRenderableSort', 'buildTileAlignedSpriteRenderParts', 'compareRenderableOrder', 'evaluatePlacementCandidate', 'deriveSceneGraph'],
      wiredInto: ['src/application/placement/placement.js:rebuildBoxesFromInstances', 'src/application/placement/placement.js:placeCurrentPrefab', 'src/application/placement/placement.js:commitPreview.drag', 'src/presentation/render/render.js:computeCandidate', 'src/presentation/render/render.js:buildStaticVoxelRenderable', 'src/presentation/render/render.js:computeSpriteRenderableSort', 'src/presentation/render/render.js:buildRenderables'],
      notes: ['P4-E keeps placement authority in domain and exposes only pure placement / scene rule functions. Platform binding moved out of core.']
    };
  }

  return {
    phase: PHASE,
    owner: OWNER,
    deriveBoxesFromInstances: deriveBoxesFromInstances,
    buildOccupancyIndex: buildOccupancyIndex,
    buildQuarterOccupancyIndex: buildQuarterOccupancyIndex,
    getQuarterOccupancyCell: getQuarterOccupancyCell,
    quarterMaskToNames: quarterMaskToNames,
    canPlaceBoxes: canPlaceBoxes,
    buildCandidateAwareColumnTopIndex: buildCandidateAwareColumnTopIndex,
    buildColumnTopIndex: buildColumnTopIndex,
    summarizeSupportPlane: summarizeSupportPlane,
    resolveSupportPlane: resolveSupportPlane,
    projectWorldBoxes: projectWorldBoxes,
    getInstanceBoundsFromBoxes: getInstanceBoundsFromBoxes,
    computeProjectedPlayerSpriteOcclusion: computeProjectedPlayerSpriteOcclusion,
    computeVoxelRenderableSort: computeVoxelRenderableSort,
    computeSpriteRenderableSort: computeSpriteRenderableSort,
        computePlayerActorRenderableSort: computePlayerActorRenderableSort,
    buildTileAlignedSpriteRenderParts: buildTileAlignedSpriteRenderParts,
    compareRenderableOrder: compareRenderableOrder,
    evaluatePlacementCandidate: evaluatePlacementCandidate,
    deriveSceneGraph: deriveSceneGraph,
    summarizeCoverage: summarizeCoverage
  };
})();
