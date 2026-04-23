(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/render-visibility-core.js';
  var PHASE = 'RENDER-VISIBILITY-V1';

  function toNumber(value, fallback) {
    var num = Number(value);
    return Number.isFinite(num) ? num : Number(fallback || 0);
  }

  function normalizeBounds(bounds) {
    if (!bounds || typeof bounds !== 'object') return null;
    var minX = toNumber(bounds.minX, 0);
    var minY = toNumber(bounds.minY, 0);
    var maxX = toNumber(bounds.maxX, 0);
    var maxY = toNumber(bounds.maxY, 0);
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
    if (maxX < minX) { var tx = minX; minX = maxX; maxX = tx; }
    if (maxY < minY) { var ty = minY; minY = maxY; maxY = ty; }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function worldBoundsIntersectXY(a, b) {
    a = normalizeBounds(a);
    b = normalizeBounds(b);
    if (!a || !b) return false;
    return !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxY <= b.minY || a.minY >= b.maxY);
  }

  function pointWithinWorldBoundsXY(x, y, bounds) {
    bounds = normalizeBounds(bounds);
    if (!bounds) return true;
    return toNumber(x, 0) >= bounds.minX && toNumber(x, 0) < bounds.maxX && toNumber(y, 0) >= bounds.minY && toNumber(y, 0) < bounds.maxY;
  }

  function getBoxWorldBounds(box) {
    if (!box || typeof box !== 'object') return null;
    var minX = toNumber(box.x, 0);
    var minY = toNumber(box.y, 0);
    var maxX = minX + Math.max(1, toNumber(box.w, 1));
    var maxY = minY + Math.max(1, toNumber(box.d, 1));
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function getPolygonWorldBounds(points) {
    var pts = Array.isArray(points) ? points : [];
    if (!pts.length) return null;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      var pt = pts[i] || {};
      var x = toNumber(pt.x, NaN);
      var y = toNumber(pt.y, NaN);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
    return { minX:minX, minY:minY, maxX:maxX, maxY:maxY };
  }

  function getRenderSourceWorldBounds(source) {
    if (!source || typeof source !== 'object') return null;
    if (source.worldBounds) return normalizeBounds(source.worldBounds);
    if (Array.isArray(source.worldPts)) return normalizeBounds(getPolygonWorldBounds(source.worldPts));
    if (Array.isArray(source.worldPolys) && source.worldPolys.length) {
      var merged = [];
      for (var wi = 0; wi < source.worldPolys.length; wi++) merged = merged.concat(Array.isArray(source.worldPolys[wi]) ? source.worldPolys[wi] : []);
      var polyBounds = getPolygonWorldBounds(merged);
      if (polyBounds) return normalizeBounds(polyBounds);
    }
    if (source.box) return getBoxWorldBounds(source.box);
    if (Number.isFinite(Number(source.x)) && Number.isFinite(Number(source.y))) {
      var w = Math.max(1, toNumber(source.w, 1));
      var d = Math.max(1, toNumber(source.d, 1));
      return { minX: toNumber(source.x, 0), minY: toNumber(source.y, 0), maxX: toNumber(source.x, 0) + w, maxY: toNumber(source.y, 0) + d };
    }
    if (Number.isFinite(Number(source.worldX)) && Number.isFinite(Number(source.worldY))) {
      return { minX: toNumber(source.worldX, 0), minY: toNumber(source.worldY, 0), maxX: toNumber(source.worldX, 0) + 1, maxY: toNumber(source.worldY, 0) + 1 };
    }
    if (Number.isFinite(Number(source.cellX)) && Number.isFinite(Number(source.cellY))) {
      return { minX: toNumber(source.cellX, 0), minY: toNumber(source.cellY, 0), maxX: toNumber(source.cellX, 0) + 1, maxY: toNumber(source.cellY, 0) + 1 };
    }
    return null;
  }

  function getRenderableWorldBounds(renderable) {
    return getRenderSourceWorldBounds(renderable);
  }

  function isWithinCameraScope(sourceOrBounds, scope, boundsGetter) {
    if (!scope || scope.cameraCullingEnabled === false) return true;
    var bounds = (boundsGetter && typeof boundsGetter === 'function')
      ? boundsGetter(sourceOrBounds)
      : (sourceOrBounds && sourceOrBounds.minX != null ? normalizeBounds(sourceOrBounds) : getRenderSourceWorldBounds(sourceOrBounds));
    if (!bounds) return true;
    return worldBoundsIntersectXY(bounds, scope.cullingWorldBounds);
  }

  function filterByCameraScope(list, scope, boundsGetter) {
    var input = Array.isArray(list) ? list : [];
    if (!scope || scope.cameraCullingEnabled === false) return input.slice();
    return input.filter(function (item) { return isWithinCameraScope(item, scope, boundsGetter); });
  }

  function buildStructuredVoxelOccupancy(boxes) {
    var occ = new Set();
    var list = Array.isArray(boxes) ? boxes : [];
    for (var i = 0; i < list.length; i++) {
      var box = list[i];
      if (!box || typeof box !== 'object') continue;
      var x = Math.round(toNumber(box.x, 0));
      var y = Math.round(toNumber(box.y, 0));
      var z = Math.round(toNumber(box.z, 0));
      occ.add(x + ',' + y + ',' + z);
    }
    return occ;
  }

  function getVisibleFacesForVoxelCell(cell, occupancy) {
    var occ = occupancy || new Set();
    var x = Math.round(toNumber(cell && cell.x, 0));
    var y = Math.round(toNumber(cell && cell.y, 0));
    var z = Math.round(toNumber(cell && cell.z, 0));
    var faces = [];
    if (!occ.has(x + ',' + y + ',' + (z + 1))) faces.push('top');
    if (!occ.has((x + 1) + ',' + y + ',' + z)) faces.push('east');
    if (!occ.has(x + ',' + (y + 1) + ',' + z)) faces.push('south');
    if (!occ.has((x - 1) + ',' + y + ',' + z)) faces.push('west');
    if (!occ.has(x + ',' + (y - 1) + ',' + z)) faces.push('north');
    return faces;
  }

  function buildVisibleFacesForVoxelStack(cell, occupancy) {
    return getVisibleFacesForVoxelCell(cell, occupancy);
  }

  function buildVisibleFacesForTerrainColumn(columnCells, occupancy) {
    var cells = Array.isArray(columnCells) ? columnCells : [];
    return cells.map(function (cell) {
      return { cell: cell, visibleFaces: getVisibleFacesForVoxelCell(cell, occupancy) };
    });
  }

  function buildVisibleSurfaceCache(boxes, options) {
    var list = Array.isArray(boxes) ? boxes : [];
    var opts = options && typeof options === 'object' ? options : {};
    var scope = opts.scope || null;
    var occupancy = opts.occupancy || buildStructuredVoxelOccupancy(list);
    var surfaceOnlyRenderingEnabled = opts.surfaceOnlyRenderingEnabled !== false;
    var classifyBox = typeof opts.classifyBox === 'function'
      ? opts.classifyBox
      : function (box) {
          return {
            isTerrain: !!(box && box.generatedBy === 'terrain-generator'),
            isStructured: true
          };
        };
    var surfaceCells = [];
    var terrainColumns = new Set();
    var terrainColumnCount = 0;
    var logicalVoxelCountEstimated = 0;
    var visibleTopFaceCount = 0;
    var visibleSideFaceCount = 0;
    var internalVoxelSkippedCount = 0;
    var hiddenInternalSurfaceSkippedCount = 0;
    var voxelFurnitureProcessedCount = 0;
    var cameraCulledCount = 0;
    for (var i = 0; i < list.length; i++) {
      var box = list[i];
      if (!box || typeof box !== 'object') continue;
      logicalVoxelCountEstimated += 1;
      var info = classifyBox(box) || {};
      if (info.isTerrain) {
        var colKey = (box.terrainCellX != null ? box.terrainCellX : box.x) + ',' + (box.terrainCellY != null ? box.terrainCellY : box.y);
        terrainColumns.add(String(colKey));
      } else {
        voxelFurnitureProcessedCount += 1;
      }
      if (!isWithinCameraScope(box, scope, getBoxWorldBounds)) {
        cameraCulledCount += 1;
        continue;
      }
      var faces = surfaceOnlyRenderingEnabled ? getVisibleFacesForVoxelCell(box, occupancy) : ['top','east','south','west','north'];
      if (!faces.length) {
        internalVoxelSkippedCount += 1;
        hiddenInternalSurfaceSkippedCount += 1;
        continue;
      }
      for (var f = 0; f < faces.length; f++) {
        if (faces[f] === 'top') visibleTopFaceCount += 1;
        else visibleSideFaceCount += 1;
      }
      surfaceCells.push({ box: box, visibleFaces: faces, classification: info });
    }
    terrainColumnCount = terrainColumns.size;
    return {
      surfaceCells: surfaceCells,
      terrainColumnCount: terrainColumnCount,
      logicalVoxelCountEstimated: logicalVoxelCountEstimated,
      visibleTopFaceCount: visibleTopFaceCount,
      visibleSideFaceCount: visibleSideFaceCount,
      internalVoxelSkippedCount: internalVoxelSkippedCount,
      hiddenInternalSurfaceSkippedCount: hiddenInternalSurfaceSkippedCount,
      voxelFurnitureProcessedCount: voxelFurnitureProcessedCount,
      cameraCulledCount: cameraCulledCount,
      surfaceOnlyRenderingEnabled: surfaceOnlyRenderingEnabled
    };
  }


  function getTerrainCellHeight(model, x, y) {
    var terrain = model && typeof model === 'object' ? model : null;
    if (!terrain || !Array.isArray(terrain.heightMap)) return 0;
    var xi = Math.round(toNumber(x, 0));
    var yi = Math.round(toNumber(y, 0));
    var col = Array.isArray(terrain.heightMap[xi]) ? terrain.heightMap[xi] : null;
    var h = col ? Math.round(toNumber(col[yi], 0)) : 0;
    return Math.max(0, h);
  }

  function getTerrainExistingBaseHeight(model, x, y) {
    var terrain = model && typeof model === 'object' ? model : null;
    if (!terrain || !Array.isArray(terrain.existingHeightMap)) return 0;
    var xi = Math.round(toNumber(x, 0));
    var yi = Math.round(toNumber(y, 0));
    var col = Array.isArray(terrain.existingHeightMap[xi]) ? terrain.existingHeightMap[xi] : null;
    var h = col ? Math.round(toNumber(col[yi], 0)) : 0;
    return Math.max(0, h);
  }

  function getTerrainMergedColumnHeight(model, x, y) {
    return Math.max(getTerrainCellHeight(model, x, y), getTerrainExistingBaseHeight(model, x, y));
  }

  function getTerrainColumnWorldBounds(source) {
    if (!source || typeof source !== 'object') return null;
    var x = Math.round(toNumber(source.x, 0));
    var y = Math.round(toNumber(source.y, 0));
    return { minX: x, minY: y, maxX: x + 1, maxY: y + 1 };
  }

  function buildVisibleFacesForTerrainColumn(model, x, y) {
    var targetHeight = getTerrainCellHeight(model, x, y);
    var existingHeight = getTerrainExistingBaseHeight(model, x, y);
    var ownedStart = Math.max(0, Math.min(existingHeight, targetHeight));
    if (targetHeight <= ownedStart) return null;
    var westMerged = getTerrainMergedColumnHeight(model, x - 1, y);
    var eastMerged = getTerrainMergedColumnHeight(model, x + 1, y);
    var northMerged = getTerrainMergedColumnHeight(model, x, y - 1);
    var southMerged = getTerrainMergedColumnHeight(model, x, y + 1);
    var faces = [];
    var xi = Math.round(toNumber(x, 0));
    var yi = Math.round(toNumber(y, 0));
    faces.push({ semanticFace: 'top', zStart: Math.max(0, targetHeight - 1), zEnd: targetHeight, neighborHeight: targetHeight, unit: true, layerZ: Math.max(0, targetHeight - 1) });
    function pushSideFaces(faceName, neighborMergedHeight) {
      var startZ = Math.max(ownedStart, Math.round(toNumber(neighborMergedHeight, 0)));
      for (var z = startZ; z < targetHeight; z++) {
        faces.push({ semanticFace: faceName, zStart: z, zEnd: z + 1, neighborHeight: neighborMergedHeight, unit: true, layerZ: z });
      }
    }
    if (eastMerged < targetHeight) pushSideFaces('east', eastMerged);
    if (southMerged < targetHeight) pushSideFaces('south', southMerged);
    if (westMerged < targetHeight) pushSideFaces('west', westMerged);
    if (northMerged < targetHeight) pushSideFaces('north', northMerged);
    return { x: xi, y: yi, height: targetHeight, existingHeight: existingHeight, ownedStartZ: ownedStart, faces: faces, renderedAsDiscreteBlockLayers: true };
  }



  function getTerrainChunkBounds(model, chunkX, chunkY, chunkSize) {
    var terrain = model && typeof model === 'object' ? model : null;
    var size = Math.max(1, Math.round(toNumber(chunkSize, 16)) || 16);
    var width = terrain ? Math.max(0, Math.round(toNumber(terrain.width, 0))) : 0;
    var height = terrain ? Math.max(0, Math.round(toNumber(terrain.height, 0))) : 0;
    var minX = Math.max(0, Math.round(toNumber(chunkX, 0)) * size);
    var minY = Math.max(0, Math.round(toNumber(chunkY, 0)) * size);
    return {
      minX: minX,
      minY: minY,
      maxX: Math.min(width, minX + size),
      maxY: Math.min(height, minY + size)
    };
  }

  function buildVisibleSurfaceCacheForTerrainChunk(model, chunkX, chunkY, options) {
    var terrain = model && typeof model === 'object' ? model : null;
    var opts = options && typeof options === 'object' ? options : {};
    var chunkSize = Math.max(1, Math.round(toNumber(opts.chunkSize, 16)) || 16);
    var bounds = getTerrainChunkBounds(terrain, chunkX, chunkY, chunkSize);
    var columns = [];
    var visibleTopFaceCount = 0;
    var visibleSideFaceCount = 0;
    var internalVoxelSkippedCount = 0;
    var logicalVoxelCountEstimated = 0;
    for (var x = bounds.minX; x < bounds.maxX; x++) {
      for (var y = bounds.minY; y < bounds.maxY; y++) {
        var col = buildVisibleFacesForTerrainColumn(terrain, x, y);
        if (!col || col.height <= 0) continue;
        var ownedDeltaHeight = Math.max(0, Number(col.height || 0) - Number(col.existingHeight || 0));
        logicalVoxelCountEstimated += ownedDeltaHeight;
        internalVoxelSkippedCount += Math.max(0, ownedDeltaHeight - 1);
        for (var i = 0; i < col.faces.length; i++) {
          if (col.faces[i].semanticFace === 'top') visibleTopFaceCount += 1;
          else visibleSideFaceCount += 1;
        }
        columns.push(col);
      }
    }
    return {
      chunkX: Math.round(toNumber(chunkX, 0)),
      chunkY: Math.round(toNumber(chunkY, 0)),
      chunkKey: String(Math.round(toNumber(chunkX, 0))) + ',' + String(Math.round(toNumber(chunkY, 0))),
      bounds: bounds,
      columns: columns,
      visibleColumnCount: columns.length,
      logicalVoxelCountEstimated: logicalVoxelCountEstimated,
      visibleTopFaceCount: visibleTopFaceCount,
      visibleSideFaceCount: visibleSideFaceCount,
      internalVoxelSkippedCount: internalVoxelSkippedCount,
      hiddenInternalSurfaceSkippedCount: internalVoxelSkippedCount,
      surfaceOnlyRenderingEnabled: opts.surfaceOnlyRenderingEnabled !== false,
      buildMode: 'chunk-cache'
    };
  }

  function buildVisibleSurfaceCacheForTerrain(model, options) {
    var terrain = model && typeof model === 'object' ? model : null;
    var opts = options && typeof options === 'object' ? options : {};
    var scope = opts.scope || null;
    var chunkSize = Math.max(1, Math.round(toNumber(opts.chunkSize, 16)) || 16);
    var width = terrain ? Math.max(0, Math.round(toNumber(terrain.width, 0))) : 0;
    var height = terrain ? Math.max(0, Math.round(toNumber(terrain.height, 0))) : 0;
    var bounds = scope && scope.cullingWorldBounds ? normalizeBounds(scope.cullingWorldBounds) : { minX: 0, minY: 0, maxX: width, maxY: height };
    var minX = Math.max(0, Math.floor(toNumber(bounds.minX, 0)));
    var minY = Math.max(0, Math.floor(toNumber(bounds.minY, 0)));
    var maxX = Math.min(width, Math.ceil(toNumber(bounds.maxX, width)));
    var maxY = Math.min(height, Math.ceil(toNumber(bounds.maxY, height)));
    var visibleColumns = [];
    var visibleTopFaceCount = 0;
    var visibleSideFaceCount = 0;
    var internalVoxelSkippedCount = 0;
    var logicalVoxelCountEstimated = 0;
    var visibleChunkKeys = new Set();
    for (var x = minX; x < maxX; x++) {
      for (var y = minY; y < maxY; y++) {
        var col = buildVisibleFacesForTerrainColumn(terrain, x, y);
        if (!col || col.height <= 0) continue;
        var ownedDeltaHeight = Math.max(0, Number(col.height || 0) - Number(col.existingHeight || 0));
        logicalVoxelCountEstimated += ownedDeltaHeight;
        internalVoxelSkippedCount += Math.max(0, ownedDeltaHeight - 1);
        for (var i = 0; i < col.faces.length; i++) {
          if (col.faces[i].semanticFace === 'top') visibleTopFaceCount += 1;
          else visibleSideFaceCount += 1;
        }
        visibleColumns.push(col);
        visibleChunkKeys.add(Math.floor(x / chunkSize) + ',' + Math.floor(y / chunkSize));
      }
    }
    var totalColumns = terrain && terrain.lastSummary && Number.isFinite(Number(terrain.lastSummary.generatedCellCount))
      ? Math.max(0, Math.round(Number(terrain.lastSummary.generatedCellCount) || 0))
      : 0;
    var totalLogicalVoxelCount = terrain && terrain.lastSummary && Number.isFinite(Number(terrain.lastSummary.terrainOwnedDeltaBlockCount))
      ? Math.max(0, Math.round(Number(terrain.lastSummary.terrainOwnedDeltaBlockCount) || 0))
      : (terrain && terrain.lastSummary && Number.isFinite(Number(terrain.lastSummary.generatedVoxelCount))
        ? Math.max(0, Math.round(Number(terrain.lastSummary.generatedVoxelCount) || 0))
        : 0);
    if (!(totalColumns > 0) || !(totalLogicalVoxelCount >= 0)) {
      totalColumns = 0;
      totalLogicalVoxelCount = 0;
      if (terrain && Array.isArray(terrain.heightMap)) {
        for (var tx = 0; tx < width; tx++) {
          var row = Array.isArray(terrain.heightMap[tx]) ? terrain.heightMap[tx] : [];
          for (var ty = 0; ty < height; ty++) {
            var h = Math.max(0, Math.round(toNumber(row[ty], 0)));
            if (h <= 0) continue;
            totalColumns += 1;
            totalLogicalVoxelCount += h;
          }
        }
      }
    }
    var totalChunks = Math.max(0, Math.ceil(width / chunkSize) * Math.ceil(height / chunkSize));
    return {
      visibleColumns: visibleColumns,
      terrainColumnCount: totalColumns,
      visibleColumnCount: visibleColumns.length,
      culledColumnCount: Math.max(0, totalColumns - visibleColumns.length),
      visibleChunkCount: visibleChunkKeys.size,
      culledChunkCount: Math.max(0, totalChunks - visibleChunkKeys.size),
      logicalVoxelCountEstimated: totalLogicalVoxelCount,
      visibleTopFaceCount: visibleTopFaceCount,
      visibleSideFaceCount: visibleSideFaceCount,
      internalVoxelSkippedCount: internalVoxelSkippedCount,
      hiddenInternalSurfaceSkippedCount: internalVoxelSkippedCount,
      terrainBuildWasScoped: true,
      surfaceOnlyRenderingEnabled: opts.surfaceOnlyRenderingEnabled !== false
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    normalizeBounds: normalizeBounds,
    worldBoundsIntersectXY: worldBoundsIntersectXY,
    pointWithinWorldBoundsXY: pointWithinWorldBoundsXY,
    getBoxWorldBounds: getBoxWorldBounds,
    getRenderSourceWorldBounds: getRenderSourceWorldBounds,
    getPolygonWorldBounds: getPolygonWorldBounds,
    getRenderableWorldBounds: getRenderableWorldBounds,
    isWithinCameraScope: isWithinCameraScope,
    filterByCameraScope: filterByCameraScope,
    buildStructuredVoxelOccupancy: buildStructuredVoxelOccupancy,
    getVisibleFacesForVoxelCell: getVisibleFacesForVoxelCell,
    buildVisibleFacesForVoxelStack: buildVisibleFacesForVoxelStack,
    buildVisibleFacesForTerrainColumn: buildVisibleFacesForTerrainColumn,
    buildVisibleSurfaceCache: buildVisibleSurfaceCache,
    getTerrainCellHeight: getTerrainCellHeight,
    getTerrainExistingBaseHeight: getTerrainExistingBaseHeight,
    getTerrainMergedColumnHeight: getTerrainMergedColumnHeight,
    getTerrainColumnWorldBounds: getTerrainColumnWorldBounds,
    getTerrainChunkBounds: getTerrainChunkBounds,
    buildVisibleSurfaceCacheForTerrainChunk: buildVisibleSurfaceCacheForTerrainChunk,
    buildVisibleSurfaceCacheForTerrain: buildVisibleSurfaceCacheForTerrain
  };

  window.__RENDER_VISIBILITY_CORE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('domain.renderVisibilityCore', api, { owner: OWNER, phase: PHASE });
  }
})();
