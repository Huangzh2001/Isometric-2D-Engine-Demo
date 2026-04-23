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
      var w = Math.max(1, toInt(b.w, 1));
      var d = Math.max(1, toInt(b.d, 1));
      var h = Math.max(1, toInt(b.h, 1));
      for (var x = x0; x < x0 + w; x++) {
        for (var y = y0; y < y0 + d; y++) {
          for (var z = z0; z < z0 + h; z++) {
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
    var ax1 = toInt(a.x, 0), ay1 = toInt(a.y, 0), az1 = toInt(a.z, 0);
    var bx1 = toInt(b.x, 0), by1 = toInt(b.y, 0), bz1 = toInt(b.z, 0);
    var ax2 = ax1 + Math.max(1, toInt(a.w, 1));
    var ay2 = ay1 + Math.max(1, toInt(a.d, 1));
    var az2 = az1 + Math.max(1, toInt(a.h, 1));
    var bx2 = bx1 + Math.max(1, toInt(b.w, 1));
    var by2 = by1 + Math.max(1, toInt(b.d, 1));
    var bz2 = bz1 + Math.max(1, toInt(b.h, 1));
    return !(ax2 <= bx1 || bx2 <= ax1 || ay2 <= by1 || by2 <= ay1 || az2 <= bz1 || bz2 <= az1);
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
      var w = Math.max(1, toInt(b.w, 1));
      var d = Math.max(1, toInt(b.d, 1));
      var top = z0 + Math.max(1, toInt(b.h, 1));
      for (var x = x0; x < x0 + w; x++) {
        for (var y = y0; y < y0 + d; y++) {
          var key = x + ',' + y;
          if (!(key in index) || top > index[key]) index[key] = top;
        }
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
        w: 1,
        d: 1,
        h: 1,
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
      maxX = Math.max(maxX, toInt(b.x, 0) + Math.max(1, toInt(b.w, 1)));
      maxY = Math.max(maxY, toInt(b.y, 0) + Math.max(1, toInt(b.d, 1)));
      maxZ = Math.max(maxZ, toInt(b.z, 0) + Math.max(1, toInt(b.h, 1)));
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
      if (toInt(box.x, 0) < 0 || toInt(box.y, 0) < 0 || toInt(box.x, 0) >= gridW || toInt(box.y, 0) >= gridH) {
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

  function getInstanceBoundsFromBoxes(boxes) {
    var list = Array.isArray(boxes) ? boxes : [];
    if (!list.length) return null;
    var minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (var i = 0; i < list.length; i++) {
      var b = list[i] || {};
      minX = Math.min(minX, toInt(b.x, 0));
      minY = Math.min(minY, toInt(b.y, 0));
      minZ = Math.min(minZ, toInt(b.z, 0));
      maxX = Math.max(maxX, toInt(b.x, 0) + Math.max(1, toInt(b.w, 1)));
      maxY = Math.max(maxY, toInt(b.y, 0) + Math.max(1, toInt(b.d, 1)));
      maxZ = Math.max(maxZ, toInt(b.z, 0) + Math.max(1, toInt(b.h, 1)));
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
    var h = Math.max(1, toInt(cell.h != null ? cell.h : b.h, 1));
    var viewRotation = normalizeViewRotationLocal(b.viewRotation != null ? b.viewRotation : 0);
    var sortMeta = computeViewAwareSortMeta({ x: x, y: y, z: z }, h, viewRotation, sortBias);
    var occludesPlayer = computeProjectedPlayerSpriteOcclusion(playerBox, { x: x, y: y, z: z, w: 1, d: 1, h: h, viewRotation: viewRotation });
    return {
      sortKey: sortMeta.sortKey,
      tie: sortMeta.tie,
      occludesPlayer: !!occludesPlayer,
      sortMode: 'voxel'
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

  function computePlayerSliceRenderableSort(playerBox, sliceZ, sortBias) {
    var payload = playerBox && playerBox.slice ? playerBox : { player: playerBox || null, slice: { z: sliceZ } };
    var box = payload.player || playerBox || {};
    var slice = payload.slice || { z: sliceZ };
    var x = toInt(box.x != null ? box.x : (payload.player && payload.player.x), 0);
    var y = toInt(box.y != null ? box.y : (payload.player && payload.player.y), 0);
    var z = toInt(slice && slice.z, toInt(box.z, 0));
    var viewRotation = normalizeViewRotationLocal(payload.viewRotation != null ? payload.viewRotation : 0);
    var sortMeta = computeViewAwareSortMeta({ x: x, y: y, z: z }, 0, viewRotation, sortBias);
    return {
      sortKey: sortMeta.sortKey,
      tie: 500000 + sortMeta.tie,
      occludesPlayer: false,
      sortMode: 'player-slice'
    };
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
    var support = resolveSupportPlane(cellX, cellY, supportCells, buildColumnTopIndex(existingBoxes, ignoreInstanceId), safe.grid || null);
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
    return {
      instances: safeInstances,
      boxes: boxes,
      occupancy: buildOccupancyIndex(boxes)
    };
  }

  function summarizeCoverage() {
    return {
      phase: PHASE,
      owner: OWNER,
      pureFunctions: ['deriveBoxesFromInstances', 'buildOccupancyIndex', 'canPlaceBoxes', 'buildColumnTopIndex', 'summarizeSupportPlane', 'resolveSupportPlane', 'projectWorldBoxes', 'getInstanceBoundsFromBoxes', 'computeProjectedPlayerSpriteOcclusion', 'computeVoxelRenderableSort', 'computeSpriteRenderableSort', 'computePlayerSliceRenderableSort', 'compareRenderableOrder', 'evaluatePlacementCandidate', 'deriveSceneGraph'],
      wiredInto: ['src/application/placement/placement.js:rebuildBoxesFromInstances', 'src/application/placement/placement.js:placeCurrentPrefab', 'src/application/placement/placement.js:commitPreview.drag', 'src/presentation/render/render.js:computeCandidate', 'src/presentation/render/render.js:buildStaticVoxelRenderable', 'src/presentation/render/render.js:computeSpriteRenderableSort', 'src/presentation/render/render.js:buildRenderables'],
      notes: ['P4-E keeps placement authority in domain and exposes only pure placement / scene rule functions. Platform binding moved out of core.']
    };
  }

  return {
    phase: PHASE,
    owner: OWNER,
    deriveBoxesFromInstances: deriveBoxesFromInstances,
    buildOccupancyIndex: buildOccupancyIndex,
    canPlaceBoxes: canPlaceBoxes,
    buildColumnTopIndex: buildColumnTopIndex,
    summarizeSupportPlane: summarizeSupportPlane,
    resolveSupportPlane: resolveSupportPlane,
    projectWorldBoxes: projectWorldBoxes,
    getInstanceBoundsFromBoxes: getInstanceBoundsFromBoxes,
    computeProjectedPlayerSpriteOcclusion: computeProjectedPlayerSpriteOcclusion,
    computeVoxelRenderableSort: computeVoxelRenderableSort,
    computeSpriteRenderableSort: computeSpriteRenderableSort,
    computePlayerSliceRenderableSort: computePlayerSliceRenderableSort,
    compareRenderableOrder: compareRenderableOrder,
    evaluatePlacementCandidate: evaluatePlacementCandidate,
    deriveSceneGraph: deriveSceneGraph,
    summarizeCoverage: summarizeCoverage
  };
})();
