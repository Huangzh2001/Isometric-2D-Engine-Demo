// P12a-1: Terrain renderable builder owner.
// Layer: presentation/render/terrain.
//
// Owns terrain runtime model helpers, terrain chunk surface source cache,
// terrain face geometry packet construction, and terrain renderable assembly.
// render.js keeps compatibility wrappers only.
(function registerTerrainRenderableBuilder(global) {
  var OWNER = 'src/presentation/render/terrain/terrain-renderable-builder.js';
  var PHASE = 'P12a-1';
  var LAYER = 'presentation/render/terrain';

  var terrainChunkRenderCache = { signature: '', chunks: new Map(), summary: null, dirtyChunkKeys: new Set(), totalChunkCount: 0 };
  var terrainRuntimeSummary = null;
  var lastTerrainCameraMoveState = { key: '', terrainBatchId: null };
  var activeDeps = null;

  function withDeps(deps, fn) {
    var previous = activeDeps;
    activeDeps = deps || {};
    try { return fn(); }
    finally { activeDeps = previous; }
  }

  function dep(name) {
    return activeDeps && activeDeps[name];
  }

  function callDep(name, args, fallback) {
    var fn = dep(name);
    if (typeof fn === 'function') return fn.apply(null, args || []);
    return fallback;
  }

  function getRenderSettingsForTerrain() {
    var settings = callDep('getSettingsForRender', [], null);
    return settings && typeof settings === 'object' ? settings : {};
  }

  function getRuntimeCameraForTerrain() {
    var cam = callDep('getRuntimeCameraForRender', [], null);
    return cam && typeof cam === 'object' ? cam : { x: 0, y: 0 };
  }

  function getCanvasContextForTerrain() {
    return callDep('getCanvasContextForRender', [], null);
  }

  function isXrayFacesEnabledForTerrain() {
    return callDep('isXrayFacesEnabledForRender', [], false) === true;
  }

  function createTerrainBatchDrawFunction() {
    var deps = activeDeps;
    return function terrainBatchDraw() {
      var item = this;
      return withDeps(deps, function () { return drawTerrainFaceBatchRenderable(item); });
    };
  }

  function createTerrainCachedFaceDrawFunction() {
    var deps = activeDeps;
    return function terrainFaceDraw() {
      var item = this;
      return withDeps(deps, function () { return drawCachedVoxelFaceRenderable(item); });
    };
  }

  function getTerrainRenderSettingsForRender() {
    return callDep('getTerrainRenderSettingsForRender', [], { terrainDebugFaceColorsEnabled: false, terrainColorMode: 'natural' });
  }

  function getMainEditorCameraSettingsForRender() {
    return callDep('getMainEditorCameraSettingsForRender', [], { surfaceOnlyRenderingEnabled: true });
  }

  function getItemFacingCoreApi() { return callDep('getItemFacingCoreApi', [], null); }
  function getTerrainMaterialCoreApi() { return callDep('getTerrainMaterialCoreApi', [], null); }
  function getRenderVisibilityCoreApi() { return callDep('getRenderVisibilityCoreApi', [], null); }
  function getTerrainMaterialPatternDescriptorForRenderCell(cell, semanticFace) { return callDep('getTerrainMaterialPatternDescriptorForRenderCell', [cell, semanticFace], null); }
  function getMainViewProjectionConfig() { return callDep('getMainViewProjectionConfig', [], null); }
  function getMainViewRotationCoreApi() { return callDep('getMainViewRotationCoreApi', [], null); }
  function getVisibleSemanticMappingForRender(value, viewRotation) { return callDep('getVisibleSemanticMappingForRender', [value, viewRotation], null); }
  function normalizeMainEditorViewRotationValue(viewRotation) { return callDep('normalizeMainEditorViewRotationValue', [viewRotation], viewRotation); }
  function getSemanticFaceNormal(face) { return callDep('getSemanticFaceNormal', [face], null); }
  function buildVoxelFaceShadowOverlays(worldPts, normal, extra) { return callDep('buildVoxelFaceShadowOverlays', [worldPts, normal, extra], []); }
  function screenPointsFromWorldFace(worldPts) { return callDep('screenPointsFromWorldFace', [worldPts], []); }
  function averageScreenPoint(points) { return callDep('averageScreenPoint', [points], { x: 0, y: 0 }); }
  function computeViewAwareSortMeta(cell, height, viewRotation) { return callDep('computeViewAwareSortMeta', [cell, height, viewRotation], { sortKey: 0, tie: 0 }); }
  function drawCachedVoxelFaceRenderable(item) { return callDep('drawCachedVoxelFaceRenderable', [item], undefined); }
  function logItemRotationPrototype(label, payload) { return callDep('logItemRotationPrototype', [label, payload], undefined); }
  function rgbToCss(rgb) { return callDep('rgbToCss', [rgb], '#000000'); }
  function litFaceColor(rgb, worldPts, normal, extra) { return callDep('litFaceColor', [rgb, worldPts, normal, extra], rgb); }
  function hexToRgb(hex) { return callDep('hexToRgb', [hex], { r: 0, g: 0, b: 0 }); }
  function baseFaceColors(hex) { return callDep('baseFaceColors', [hex], { top: { r: 0, g: 0, b: 0 }, east: { r: 0, g: 0, b: 0 }, south: { r: 0, g: 0, b: 0 }, line: '#3c3c3c' }); }
  function perfNow() { return callDep('perfNow', [], Date.now()); }
  function drawPoly(points, fill, stroke, width) { return callDep('drawPoly', [points, fill, stroke, width], undefined); }

function getTerrainSemanticDebugPalette() {
  var facingApi = getItemFacingCoreApi();
  if (facingApi && typeof facingApi.getDefaultSemanticTextureMap === 'function') {
    try {
      var map = facingApi.getDefaultSemanticTextureMap() || {};
      return {
        top: (map.top && map.top.color) || '#2F80ED',
        north: (map.north && map.north.color) || '#E74C3C',
        east: (map.east && map.east.color) || '#27AE60',
        south: (map.south && map.south.color) || '#F2C94C',
        west: (map.west && map.west.color) || '#9B51E0'
      };
    } catch (_) {}
  }
  return { top: '#2F80ED', north: '#E74C3C', east: '#27AE60', south: '#F2C94C', west: '#9B51E0' };
}



function getTerrainColorModeForRender() {
  var settings = getTerrainRenderSettingsForRender();
  return settings.terrainDebugFaceColorsEnabled === true ? 'debug-semantic' : String(settings.terrainColorMode || 'natural');
}




function terrainModelHasData(model) {
  return !!(model && Array.isArray(model.heightMap) && Number(model.width) > 0 && Number(model.height) > 0);
}



function getTerrainColumnHeightForRender(model, x, y) {
  if (!terrainModelHasData(model)) return 0;
  var xi = Math.round(Number(x) || 0);
  var yi = Math.round(Number(y) || 0);
  var col = Array.isArray(model.heightMap[xi]) ? model.heightMap[xi] : null;
  return Math.max(0, Math.round(Number(col && col[yi]) || 0));
}



function getTerrainExistingHeightForRender(model, x, y) {
  if (!terrainModelHasData(model)) return 0;
  var xi = Math.round(Number(x) || 0);
  var yi = Math.round(Number(y) || 0);
  var col = Array.isArray(model.existingHeightMap && model.existingHeightMap[xi]) ? model.existingHeightMap[xi] : null;
  return Math.max(0, Math.round(Number(col && col[yi]) || 0));
}



function getTerrainMergedHeightForRender(model, x, y) {
  return Math.max(getTerrainColumnHeightForRender(model, x, y), getTerrainExistingHeightForRender(model, x, y));
}



function getTerrainChunkSizeForRender(model) {
  return Math.max(1, Math.round(Number(model && model.chunkSize) || 16));
}



function getTerrainChunkKey(cx, cy) {
  return String(cx) + ',' + String(cy);
}



function getTerrainChunkBounds(model, chunkX, chunkY) {
  var chunkSize = getTerrainChunkSizeForRender(model);
  var minX = chunkX * chunkSize;
  var minY = chunkY * chunkSize;
  return {
    minX: minX,
    minY: minY,
    maxX: Math.min(Number(model.width) || 0, minX + chunkSize),
    maxY: Math.min(Number(model.height) || 0, minY + chunkSize)
  };
}



function getTerrainChunkCacheSignature(model) {
  var settings = getMainEditorCameraSettingsForRender();
  return JSON.stringify({
    terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null,
    width: model && model.width || 0,
    height: model && model.height || 0,
    chunkSize: getTerrainChunkSizeForRender(model),
    cacheVersion: model && model.terrainChunkCacheVersion || 0,
    surfaceOnlyRenderingEnabled: settings && settings.surfaceOnlyRenderingEnabled !== false
  });
}



function getVisibleTerrainChunkCoordsForScope(model, scope) {
  var bounds = scope && scope.cullingWorldBounds ? scope.cullingWorldBounds : null;
  var chunkSize = getTerrainChunkSizeForRender(model);
  var width = Math.max(0, Math.round(Number(model && model.width) || 0));
  var height = Math.max(0, Math.round(Number(model && model.height) || 0));
  if (!(width > 0 && height > 0)) return [];
  var minX = 0, minY = 0, maxX = width, maxY = height;
  if (bounds) {
    minX = Math.max(0, Math.floor(Number(bounds.minX) || 0));
    minY = Math.max(0, Math.floor(Number(bounds.minY) || 0));
    maxX = Math.min(width, Math.ceil(Number(bounds.maxX) || width));
    maxY = Math.min(height, Math.ceil(Number(bounds.maxY) || height));
  }
  var minChunkX = Math.max(0, Math.floor(minX / chunkSize));
  var minChunkY = Math.max(0, Math.floor(minY / chunkSize));
  var maxChunkX = Math.max(minChunkX, Math.ceil(maxX / chunkSize) - 1);
  var maxChunkY = Math.max(minChunkY, Math.ceil(maxY / chunkSize) - 1);
  var out = [];
  for (var cx = minChunkX; cx <= maxChunkX; cx++) {
    for (var cy = minChunkY; cy <= maxChunkY; cy++) {
      out.push({ chunkX: cx, chunkY: cy, key: getTerrainChunkKey(cx, cy), bounds: getTerrainChunkBounds(model, cx, cy) });
    }
  }
  return out;
}



function addTerrainOwnedOccupancyToSet(occupancy, model, scope) {
  if (!terrainModelHasData(model) || !occupancy || typeof occupancy.add !== 'function') return occupancy;
  var chunkCoords = getVisibleTerrainChunkCoordsForScope(model, scope || null);
  for (var i = 0; i < chunkCoords.length; i++) {
    var bounds = chunkCoords[i] && chunkCoords[i].bounds ? chunkCoords[i].bounds : null;
    if (!bounds) continue;
    for (var x = bounds.minX; x < bounds.maxX; x++) {
      for (var y = bounds.minY; y < bounds.maxY; y++) {
        var target = getTerrainColumnHeightForRender(model, x, y);
        var existing = getTerrainExistingHeightForRender(model, x, y);
        for (var z = existing; z < target; z++) occupancy.add(String(x) + ',' + String(y) + ',' + String(z));
      }
    }
  }
  return occupancy;
}



function invalidateTerrainChunkRenderCacheForModel(model) {
  var signature = getTerrainChunkCacheSignature(model);
  if (terrainChunkRenderCache.signature !== signature) {
    terrainChunkRenderCache = { signature: signature, chunks: new Map(), summary: null, dirtyChunkKeys: new Set(), totalChunkCount: 0 };
    return true;
  }
  return false;
}



function buildTerrainChunkSurfaceSources(model, chunkX, chunkY, scope) {
  var visibilityCore = getRenderVisibilityCoreApi();
  var chunkSize = getTerrainChunkSizeForRender(model);
  var chunkStats = visibilityCore && typeof visibilityCore.buildVisibleSurfaceCacheForTerrainChunk === 'function'
    ? visibilityCore.buildVisibleSurfaceCacheForTerrainChunk(model, chunkX, chunkY, { chunkSize: chunkSize, surfaceOnlyRenderingEnabled: scope && scope.surfaceOnlyRenderingEnabled !== false })
    : { chunkKey: getTerrainChunkKey(chunkX, chunkY), chunkX: chunkX, chunkY: chunkY, bounds: getTerrainChunkBounds(model, chunkX, chunkY), columns: [], visibleColumnCount: 0, logicalVoxelCountEstimated: 0, visibleTopFaceCount: 0, visibleSideFaceCount: 0, internalVoxelSkippedCount: 0, hiddenInternalSurfaceSkippedCount: 0, surfaceOnlyRenderingEnabled: true };
  var columns = Array.isArray(chunkStats.columns) ? chunkStats.columns : [];
  var faceSources = [];
  for (var c = 0; c < columns.length; c++) {
    var column = columns[c];
    var faces = Array.isArray(column && column.faces) ? column.faces : [];
    for (var i = 0; i < faces.length; i++) {
      var face = faces[i];
      var worldPts = buildTerrainFaceWorldPolygon(column.x, column.y, face.semanticFace, face.zStart, face.zEnd);
      if (!Array.isArray(worldPts) || worldPts.length < 3) continue;
      faceSources.push({
        x: Number(column.x || 0),
        y: Number(column.y || 0),
        height: Number(column.height || 0),
        semanticFace: face.semanticFace,
        zStart: Number(face.zStart || 0),
        zEnd: Number(face.zEnd || 0),
        layerZ: Number(face.layerZ != null ? face.layerZ : Math.max(0, Number(face.zEnd || 1) - 1)),
        unit: face.unit !== false,
        worldPts: worldPts
      });
    }
  }
  return {
    key: chunkStats.chunkKey || getTerrainChunkKey(chunkX, chunkY),
    chunkX: chunkX,
    chunkY: chunkY,
    bounds: chunkStats.bounds || getTerrainChunkBounds(model, chunkX, chunkY),
    columns: columns,
    faceSources: faceSources,
    visibleColumnCount: Number(chunkStats.visibleColumnCount || 0),
    logicalVoxelCountEstimated: Number(chunkStats.logicalVoxelCountEstimated || 0),
    visibleTopFaceCount: Number(chunkStats.visibleTopFaceCount || 0),
    visibleSideFaceCount: Number(chunkStats.visibleSideFaceCount || 0),
    internalVoxelSkippedCount: Number(chunkStats.internalVoxelSkippedCount || 0),
    hiddenInternalSurfaceSkippedCount: Number(chunkStats.hiddenInternalSurfaceSkippedCount || 0),
    surfaceOnlyRenderingEnabled: chunkStats.surfaceOnlyRenderingEnabled !== false,
    builtAt: perfNow(),
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    geometryPacketsByViewRotation: Object.create(null)
  };
}



function getTerrainChunkSurfaceSources(model, chunkCoord, scope) {
  var key = chunkCoord && chunkCoord.key ? chunkCoord.key : getTerrainChunkKey(chunkCoord && chunkCoord.chunkX || 0, chunkCoord && chunkCoord.chunkY || 0);
  var modelDirty = model && Array.isArray(model.dirtyChunkKeys) ? model.dirtyChunkKeys.indexOf(key) >= 0 : false;
  if (terrainChunkRenderCache.chunks.has(key) && !terrainChunkRenderCache.dirtyChunkKeys.has(key) && !modelDirty) {
    return { entry: terrainChunkRenderCache.chunks.get(key), cacheHit: true, rebuilt: false };
  }
  var entry = buildTerrainChunkSurfaceSources(model, chunkCoord.chunkX, chunkCoord.chunkY, scope);
  terrainChunkRenderCache.chunks.set(key, entry);
  terrainChunkRenderCache.dirtyChunkKeys.delete(key);
  return { entry: entry, cacheHit: false, rebuilt: true };
}



function buildTerrainFaceWorldPolygon(x, y, semanticFace, zStart, zEnd) {
  var bottom = Math.max(0, Number(zStart) || 0);
  var top = Math.max(bottom, Number(zEnd) || 0);
  if (semanticFace === 'top') return [{ x:x, y:y, z:top }, { x:x+1, y:y, z:top }, { x:x+1, y:y+1, z:top }, { x:x, y:y+1, z:top }];
  if (semanticFace === 'east') return [{ x:x+1, y:y, z:bottom }, { x:x+1, y:y+1, z:bottom }, { x:x+1, y:y+1, z:top }, { x:x+1, y:y, z:top }];
  if (semanticFace === 'south') return [{ x:x, y:y+1, z:bottom }, { x:x+1, y:y+1, z:bottom }, { x:x+1, y:y+1, z:top }, { x:x, y:y+1, z:top }];
  if (semanticFace === 'west') return [{ x:x, y:y, z:top }, { x:x, y:y+1, z:top }, { x:x, y:y+1, z:bottom }, { x:x, y:y, z:bottom }];
  if (semanticFace === 'north') return [{ x:x, y:y, z:top }, { x:x+1, y:y, z:top }, { x:x+1, y:y, z:bottom }, { x:x, y:y, z:bottom }];
  return [];
}



function getTerrainMaterialIdForRenderModelCell(model, x, y) {
  var materialCore = getTerrainMaterialCoreApi();
  var materialMap = model && model.materialMap ? model.materialMap : null;
  if (materialCore && typeof materialCore.getTerrainMaterialIdAt === 'function') {
    try { return materialCore.getTerrainMaterialIdAt(materialMap, x, y, 'grass'); } catch (_) {}
  }
  return 'grass';
}



function getTerrainBaseFaceColorsForRender(model, x, y) {
  var materialCore = getTerrainMaterialCoreApi();
  var materialId = getTerrainMaterialIdForRenderModelCell(model, x, y);
  if (materialCore && typeof materialCore.getTerrainMaterialDefinition === 'function') {
    try {
      var def = materialCore.getTerrainMaterialDefinition(materialId);
      if (def && def.colors) {
        return {
          top: hexToRgb(def.colors.top || '#79b35a'),
          east: hexToRgb(def.colors.side || def.colors.top || '#79b35a'),
          south: hexToRgb(def.colors.side || def.colors.top || '#79b35a'),
          line: String(def.colors.edge || '#3c3c3c')
        };
      }
    } catch (_) {}
  }
  var params = model && model.params ? model.params : null;
  var waterLevel = params ? Math.round(Number(params.waterLevel) || 0) : 0;
  var h = getTerrainColumnHeightForRender(model, x, y);
  var base = h <= waterLevel ? '#4f8cff' : (h > 10 ? '#b39b6b' : '#79b35a');
  return baseFaceColors(base);
}



function getTerrainFaceAppearanceForRender(model, x, y, faceDesc) {
  var colorMode = getTerrainColorModeForRender();
  var semanticFace = faceDesc && faceDesc.semanticFace ? String(faceDesc.semanticFace) : 'top';
  var facingApi = getItemFacingCoreApi();
  if (colorMode === 'debug-semantic') {
    var textureMap = facingApi && typeof facingApi.getDefaultSemanticTextureMap === 'function'
      ? facingApi.getDefaultSemanticTextureMap()
      : null;
    var slot = textureMap && textureMap[semanticFace] ? textureMap[semanticFace] : null;
    var raw = slot && slot.color ? slot.color : (getTerrainSemanticDebugPalette()[semanticFace] || '#ffffff');
    return {
      colorMode: 'debug-semantic',
      paletteSource: 'item-facing-core.defaultSemanticTextureMap',
      manualBlockPaletteSource: 'item-facing-core.defaultSemanticTextureMap',
      paletteExactlyShared: true,
      paletteUsed: textureMap || null,
      semanticTextureSlot: slot,
      fill: raw,
      stroke: 'rgba(0,0,0,0.18)',
      usesSemanticTextures: !!slot,
      usesSemanticFaceColors: false
    };
  }
  var materialId = getTerrainMaterialIdForRenderModelCell(model, x, y);
  var fc = getTerrainBaseFaceColorsForRender(model, x, y);
  var fillRgb = semanticFace === 'top' ? fc.top : (semanticFace === 'east' ? fc.east : (semanticFace === 'south' ? fc.south : (semanticFace === 'west' ? fc.east : fc.south)));
  var terrainPatternDescriptor = getTerrainMaterialPatternDescriptorForRenderCell({ terrainMaterialId: materialId, generatedBy: 'terrain-generator' }, semanticFace);
  return {
    colorMode: 'natural',
    paletteSource: 'terrain-material-definition',
    paletteUsed: null,
    semanticTextureSlot: null,
    fillRgb: fillRgb,
    stroke: terrainPatternDescriptor && terrainPatternDescriptor.lineColor ? terrainPatternDescriptor.lineColor : fc.line,
    terrainMaterialId: materialId,
    terrainPatternDescriptor: terrainPatternDescriptor || null,
    usesSemanticTextures: false,
    usesSemanticFaceColors: false
  };
}



function getMainViewProjectionConfigWithoutCamera() {
  if (typeof getMainViewProjectionConfig === 'function') {
    var cfg = getMainViewProjectionConfig();
    if (cfg && typeof cfg === 'object') {
      return Object.assign({}, cfg, { cameraX: 0, cameraY: 0 });
    }
  }
  return {
    tileW: settings.tileW,
    tileH: settings.tileH,
    originX: settings.originX,
    originY: settings.originY,
    cameraX: 0,
    cameraY: 0,
    worldBoundsOrOrigin: { cols: settings.gridW || settings.worldCols, rows: settings.gridH || settings.worldRows }
  };
}



function screenPointsFromWorldFaceNoCamera(worldPts, viewRotation) {
  var pts = Array.isArray(worldPts) ? worldPts : [];
  var cfg = getMainViewProjectionConfigWithoutCamera();
  var api = getMainViewRotationCoreApi();
  return pts.map(function (p) {
    if (api && typeof api.worldToScreenWithViewRotation === 'function') {
      var out = api.worldToScreenWithViewRotation({ x: p.x, y: p.y, z: p.z }, viewRotation, cfg);
      return { x: out.x, y: out.y };
    }
    return {
      x: cfg.originX + (p.x - p.y) * cfg.tileW / 2,
      y: cfg.originY + (p.x + p.y) * cfg.tileH / 2 - p.z * cfg.tileH
    };
  });
}



function getTerrainScreenFaceLookup(viewRotation) {
  var mapping = getVisibleSemanticMappingForRender(0, viewRotation);
  var visibleByScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : { top: 'top', lowerLeft: 'south', lowerRight: 'east' };
  return {
    top: 'top',
    east: visibleByScreen.lowerRight === 'east' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'east' ? 'lowerLeft' : null),
    south: visibleByScreen.lowerRight === 'south' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'south' ? 'lowerLeft' : null),
    west: visibleByScreen.lowerRight === 'west' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'west' ? 'lowerLeft' : null),
    north: visibleByScreen.lowerRight === 'north' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'north' ? 'lowerLeft' : null)
  };
}



function buildTerrainGeometryPacket(faceSource, viewRotation) {
  if (!faceSource || !Array.isArray(faceSource.worldPts) || !faceSource.worldPts.length) return null;
  var lookup = getTerrainScreenFaceLookup(viewRotation);
  var screenFace = faceSource.semanticFace === 'top' ? 'top' : lookup[faceSource.semanticFace];
  if (!screenFace) return null;
  var pointsNoCamera = screenPointsFromWorldFaceNoCamera(faceSource.worldPts, viewRotation);
  var cellZ = Math.max(0, Number(faceSource.layerZ != null ? faceSource.layerZ : (Number(faceSource.zEnd || 1) - 1)) || 0);
  var orderMeta = computeViewAwareSortMeta({ x: faceSource.x, y: faceSource.y, z: cellZ }, 1, viewRotation);
  var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
  return {
    x: Number(faceSource.x || 0),
    y: Number(faceSource.y || 0),
    semanticFace: faceSource.semanticFace,
    screenFace: screenFace,
    zStart: Number(faceSource.zStart || 0),
    zEnd: Number(faceSource.zEnd || 0),
    layerZ: cellZ,
    worldPts: faceSource.worldPts,
    pointsNoCamera: pointsNoCamera,
    sortKey: Number(orderMeta.sortKey || 0),
    tie: Number(orderMeta.tie || 0) + ((faceTiePrio[screenFace] || 0) * 0.01)
  };
}



function getTerrainChunkGeometryPackets(entry, viewRotation) {
  if (!entry) return [];
  var key = String(normalizeMainEditorViewRotationValue(viewRotation));
  entry.geometryPacketsByViewRotation = entry.geometryPacketsByViewRotation || Object.create(null);
  if (entry.geometryPacketsByViewRotation[key]) return entry.geometryPacketsByViewRotation[key];
  var faceSources = Array.isArray(entry.faceSources) ? entry.faceSources : [];
  var packets = [];
  for (var i = 0; i < faceSources.length; i++) {
    var packet = buildTerrainGeometryPacket(faceSources[i], viewRotation);
    if (packet) packets.push(packet);
  }
  entry.geometryPacketsByViewRotation[key] = packets;
  return packets;
}



function drawTerrainFaceBatchRenderable(item) {
  if (!item || !Array.isArray(item.faces) || !item.faces.length) return;
  var cam = getRuntimeCameraForTerrain();
  var ctxRef = getCanvasContextForTerrain();
  if (!ctxRef || typeof ctxRef.save !== 'function') return;
  ctxRef.save();
  ctxRef.translate(Number(cam.x || 0), Number(cam.y || 0));
  for (var i = 0; i < item.faces.length; i++) {
    var face = item.faces[i];
    drawPoly(face.pointsNoCamera || [], face.fill, face.stroke, face.width || 1);
  }
  ctxRef.restore();
}



function buildTerrainChunkBatchedRenderables(entry, model, viewRotation) {
  var packets = getTerrainChunkGeometryPackets(entry, viewRotation);
  var batchMap = new Map();
  for (var i = 0; i < packets.length; i++) {
    var packet = packets[i];
    var appearance = getTerrainFaceAppearanceForRender(model, packet.x, packet.y, packet);
    var fill = appearance.colorMode === 'debug-semantic' ? appearance.fill : rgbToCss(litFaceColor(appearance.fillRgb, packet.worldPts, getSemanticFaceNormal(packet.semanticFace), null));
    var stroke = appearance.stroke;
    var batchKey = [packet.sortKey.toFixed(3), packet.tie.toFixed(3), packet.screenFace, fill, stroke].join('|');
    if (!batchMap.has(batchKey)) {
      batchMap.set(batchKey, {
        sortKey: packet.sortKey,
        tie: packet.tie,
        screenFace: packet.screenFace,
        semanticFace: packet.semanticFace,
        fill: fill,
        stroke: stroke,
        texture: appearance.semanticTextureSlot || null,
        textureColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
        semanticTextureSlot: appearance.semanticTextureSlot || null,
        semanticTextureSlotColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
        colorMode: appearance.colorMode,
        paletteUsed: appearance.paletteUsed || null,
        faces: []
      });
    }
    batchMap.get(batchKey).faces.push({
      pointsNoCamera: packet.pointsNoCamera,
      fill: fill,
      stroke: stroke,
      width: 1,
      worldPts: packet.worldPts,
      x: packet.x,
      y: packet.y,
      semanticFace: packet.semanticFace,
      screenFace: packet.screenFace,
      zStart: packet.zStart,
      zEnd: packet.zEnd,
      layerZ: packet.layerZ
    });
  }
  var out = [];
  batchMap.forEach(function (batch, batchKey) {
    var first = batch.faces[0] || null;
    var centroid = first ? averageScreenPoint((first.pointsNoCamera || []).map(function (pt) {
      var cam = getRuntimeCameraForTerrain();
      return { x: pt.x + Number(cam.x || 0), y: pt.y + Number(cam.y || 0) };
    })) : { x: 0, y: 0 };
    out.push({
      id: 'terrain-batch-' + String(entry.key || 'chunk') + '-' + batchKey,
      kind: 'voxel-face-batch',
      sortKey: batch.sortKey,
      tie: batch.tie,
      instanceId: null,
      prefabId: 'terrain-column',
      generatedBy: 'terrain-generator',
      terrainBatchId: model && model.activeTerrainBatchId || null,
      renderPath: 'terrain-voxel-face-batch',
      cacheViewRotation: viewRotation,
      drawScreenPosition: { x: Math.round(centroid.x || 0), y: Math.round(centroid.y || 0) },
      screenFace: batch.screenFace,
      semanticFace: batch.semanticFace,
      fill: batch.fill,
      stroke: batch.stroke,
      texture: batch.texture,
      textureColor: batch.textureColor,
      semanticTextureSlot: batch.semanticTextureSlot,
      semanticTextureSlotColor: batch.semanticTextureSlotColor,
      terrainColorMode: batch.colorMode,
      terrainDebugPalette: batch.paletteUsed || null,
      terrainUsesOriginalVoxelFacePipeline: true,
      terrainUsesCustomColumnSurfacePipeline: false,
      terrainBatchDraw: true,
      chunkKey: entry.key || null,
      worldBounds: entry.bounds || null,
      faces: batch.faces,
      draw: createTerrainBatchDrawFunction()
    });
  });
  return out;
}



function buildTerrainFaceRenderableItem(x, y, faceDesc, viewRotation, model) {
  if (!faceDesc) return null;
  var worldPts = Array.isArray(faceDesc.worldPts) && faceDesc.worldPts.length ? faceDesc.worldPts : buildTerrainFaceWorldPolygon(x, y, faceDesc.semanticFace, faceDesc.zStart, faceDesc.zEnd);
  if (!worldPts.length) return null;
  var screenPts = screenPointsFromWorldFace(worldPts);
  var normal = getSemanticFaceNormal(faceDesc.semanticFace);
  var appearance = getTerrainFaceAppearanceForRender(model, x, y, faceDesc);
  var litFill = appearance.colorMode === 'debug-semantic' ? appearance.fill : rgbToCss(litFaceColor(appearance.fillRgb, worldPts, normal, null));
  var stroke = appearance.stroke;
  var centroid = averageScreenPoint(screenPts);
  var cellZ = Math.max(0, Number(faceDesc.layerZ != null ? faceDesc.layerZ : (faceDesc.zEnd - 1)) || 0);
  var orderMeta = computeViewAwareSortMeta({ x:x, y:y, z: cellZ }, 1, viewRotation);
  var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
  var item = {
    id: 'terrain-face-' + [model && model.activeTerrainBatchId || 'terrain', x, y, faceDesc.semanticFace, faceDesc.zStart, faceDesc.zEnd].join('-'),
    kind: 'voxel-face',
    sortKey: Number(orderMeta.sortKey || 0),
    tie: Number(orderMeta.tie || 0) + ((faceTiePrio[faceDesc.screenFace] || 0) * 0.01),
    instanceId: null,
    prefabId: 'terrain-column',
    generatedBy: 'terrain-generator',
    terrainBatchId: model && model.activeTerrainBatchId || null,
    terrainCellX: x,
    terrainCellY: y,
    renderPath: 'terrain-voxel-face',
    cacheViewRotation: viewRotation,
    drawScreenPosition: { x: Math.round(centroid.x || 0), y: Math.round(centroid.y || 0) },
    semanticFace: faceDesc.semanticFace,
    screenFace: faceDesc.screenFace,
    depthKey: faceDesc.depthKey != null ? faceDesc.depthKey : 0,
    points: screenPts,
    fill: litFill,
    stroke: stroke,
    texture: appearance.semanticTextureSlot || null,
    textureColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
    semanticTextureSlot: appearance.semanticTextureSlot || null,
    semanticTextureSlotColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
    width: 1,
    shadowOverlays: isXrayFacesEnabledForTerrain() ? [] : buildVoxelFaceShadowOverlays(worldPts, normal, null),
    worldPts: worldPts,
    worldBounds: { minX: x, minY: y, maxX: x + 1, maxY: y + 1 },
    cellX: x,
    cellY: y,
    cellZ: cellZ,
    faceKey: ['terrain', x, y, faceDesc.semanticFace, cellZ].join('|'),
    terrainColorMode: appearance.colorMode,
    terrainMaterialId: appearance.terrainMaterialId || null,
    terrainPatternDescriptor: appearance.terrainPatternDescriptor || null,
    terrainPatternOpacity: appearance.terrainPatternDescriptor && Number.isFinite(Number(appearance.terrainPatternDescriptor.opacity)) ? Number(appearance.terrainPatternDescriptor.opacity) : null,
    terrainDebugPalette: appearance.paletteUsed || null,
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    draw: createTerrainCachedFaceDrawFunction()
  };
  return item;
}



function buildTerrainColumnRenderablesForScope(columnEntry, model, viewRotation) {
  var x = Number(columnEntry && columnEntry.x || 0);
  var y = Number(columnEntry && columnEntry.y || 0);
  var faces = Array.isArray(columnEntry && columnEntry.faces) ? columnEntry.faces : [];
  var mapping = getVisibleSemanticMappingForRender(0, viewRotation);
  var visibleByScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : { top:'top', lowerLeft:'south', lowerRight:'east' };
  var screenFaceBySemantic = {
    top: 'top',
    east: visibleByScreen.lowerRight === 'east' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'east' ? 'lowerLeft' : null),
    south: visibleByScreen.lowerRight === 'south' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'south' ? 'lowerLeft' : null),
    west: visibleByScreen.lowerRight === 'west' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'west' ? 'lowerLeft' : null),
    north: visibleByScreen.lowerRight === 'north' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'north' ? 'lowerLeft' : null)
  };
  var out = [];
  for (var i = 0; i < faces.length; i++) {
    var face = faces[i];
    var screenFace = face.semanticFace === 'top' ? 'top' : screenFaceBySemantic[face.semanticFace];
    if (!screenFace) continue;
    var renderable = buildTerrainFaceRenderableItem(x, y, {
      semanticFace: face.semanticFace,
      zStart: face.zStart,
      zEnd: face.zEnd,
      layerZ: face.layerZ,
      unit: face.unit !== false,
      worldPts: face.worldPts,
      screenFace: screenFace,
      depthKey: face.semanticFace === 'top' ? 3 : (screenFace === 'lowerLeft' ? 2 : 1)
    }, viewRotation, model);
    if (renderable) out.push(renderable);
  }
  return out;
}



function buildScopedTerrainRenderables(model, scope, viewRotation) {
  if (!terrainModelHasData(model)) {
    return { renderables: [], stats: { terrainCellCount: 0, terrainColumnCount: 0, terrainExpandedVoxelInstanceCount: 0, terrainUsesColumnModel: false, visibleColumnCount: 0, visibleChunkCount: 0, culledColumnCount: 0, culledChunkCount: 0, terrainBuildWasScoped: true, logicalVoxelCountEstimated: 0, visibleTopFaceCount: 0, visibleSideFaceCount: 0, internalVoxelSkippedCount: 0, hiddenInternalSurfaceSkippedCount: 0, renderableCount: 0, buildMode: 'cached' } };
  }
  var buildStart = perfNow();
  var cacheReset = invalidateTerrainChunkRenderCacheForModel(model);
  var chunkCoords = getVisibleTerrainChunkCoordsForScope(model, scope);
  var renderables = [];
  if (cacheReset) {
    var prewarmChunkSize = getTerrainChunkSizeForRender(model);
    var maxChunkX = Math.max(0, Math.ceil((Number(model.width) || 0) / prewarmChunkSize));
    var maxChunkY = Math.max(0, Math.ceil((Number(model.height) || 0) / prewarmChunkSize));
    for (var pcx = 0; pcx < maxChunkX; pcx++) {
      for (var pcy = 0; pcy < maxChunkY; pcy++) {
        getTerrainChunkSurfaceSources(model, { chunkX: pcx, chunkY: pcy, key: getTerrainChunkKey(pcx, pcy) }, scope);
      }
    }
  }
  var visibleColumnCount = 0;
  var visibleTopFaceCount = 0;
  var visibleSideFaceCount = 0;
  var internalVoxelSkippedCount = 0;
  var hiddenInternalSurfaceSkippedCount = 0;
  var visibleChunkCount = chunkCoords.length;
  var rebuiltChunkCount = 0;
  var cacheHitCount = 0;
  var cacheMissCount = 0;
  var totalChunks = Math.max(0, Math.ceil((Number(model.width) || 0) / getTerrainChunkSizeForRender(model)) * Math.ceil((Number(model.height) || 0) / getTerrainChunkSizeForRender(model)));
  for (var i = 0; i < chunkCoords.length; i++) {
    var chunkResult = getTerrainChunkSurfaceSources(model, chunkCoords[i], scope);
    var entry = chunkResult.entry;
    if (chunkResult.cacheHit) cacheHitCount += 1;
    else cacheMissCount += 1;
    if (chunkResult.rebuilt) rebuiltChunkCount += 1;
    visibleColumnCount += Number(entry && entry.visibleColumnCount || 0);
    visibleTopFaceCount += Number(entry && entry.visibleTopFaceCount || 0);
    visibleSideFaceCount += Number(entry && entry.visibleSideFaceCount || 0);
    internalVoxelSkippedCount += Number(entry && entry.internalVoxelSkippedCount || 0);
    hiddenInternalSurfaceSkippedCount += Number(entry && entry.hiddenInternalSurfaceSkippedCount || 0);
    var batched = buildTerrainChunkBatchedRenderables(entry, model, viewRotation);
    for (var j = 0; j < batched.length; j++) renderables.push(batched[j]);
  }
  var generatedCellCount = model && model.lastSummary ? Number(model.lastSummary.generatedCellCount || 0) : 0;
  var generatedVoxelCount = model && model.lastSummary ? Number(model.lastSummary.generatedVoxelCount || 0) : 0;
  var terrainOwnedDeltaBlockCount = model ? Number(model.terrainOwnedDeltaBlockCount || 0) : 0;
  var existingManualBlockCount = model ? Number(model.existingManualBlockCount || 0) : 0;
  var overlappingColumnCount = model ? Number(model.overlappingColumnCount || 0) : 0;
  var colorMode = getTerrainColorModeForRender();
  var mapping = getVisibleSemanticMappingForRender(0, viewRotation);
  var byScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : { top: 'top', lowerLeft: 'south', lowerRight: 'east' };
  var palette = getTerrainSemanticDebugPalette();
  var terrainFaceColorSummary = {
    terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null,
    colorMode: colorMode,
    terrainDebugFaceColorsEnabled: colorMode === 'debug-semantic',
    terrainPaletteSource: colorMode === 'debug-semantic' ? 'item-facing-core.defaultSemanticTextureMap' : 'terrain-base-face-colors',
    manualBlockPaletteSource: 'item-facing-core.defaultSemanticTextureMap',
    paletteExactlyShared: colorMode === 'debug-semantic',
    usesSemanticFaceColors: false,
    usesSemanticTextures: colorMode === 'debug-semantic',
    topColor: colorMode === 'debug-semantic' ? palette[byScreen.top || 'top'] || palette.top : getTerrainBaseFaceColorsForRender(model, 0, 0).top,
    lowerLeftColor: colorMode === 'debug-semantic' ? palette[byScreen.lowerLeft || 'south'] || palette.south : getTerrainBaseFaceColorsForRender(model, 0, 0).south,
    lowerRightColor: colorMode === 'debug-semantic' ? palette[byScreen.lowerRight || 'east'] || palette.east : getTerrainBaseFaceColorsForRender(model, 0, 0).east,
    semanticFacePaletteUsed: colorMode === 'debug-semantic'
  };
  logItemRotationPrototype('terrain-face-color-summary', terrainFaceColorSummary);
  logItemRotationPrototype('terrain-face-color-mode-summary', terrainFaceColorSummary);
  logItemRotationPrototype('terrain-render-palette-check', terrainFaceColorSummary);
  var camera = (typeof runtimeState !== 'undefined' && runtimeState && runtimeState.camera) ? runtimeState.camera : { x: 0, y: 0 };
  var cameraMoveKey = JSON.stringify({ batch: model && model.activeTerrainBatchId || null, x: Number(camera.x || 0).toFixed(2), y: Number(camera.y || 0).toFixed(2), zoom: Number(scope && scope.zoom || 1).toFixed(3), rot: Number(viewRotation || 0).toFixed(3) });
  var previousCameraMoveState = lastTerrainCameraMoveState || { key: '', terrainBatchId: null };
  var cameraMoved = previousCameraMoveState.key && previousCameraMoveState.key !== cameraMoveKey && previousCameraMoveState.terrainBatchId === (model && model.activeTerrainBatchId || null);
  var stats = {
    terrainCellCount: Number(model.width || 0) * Number(model.height || 0),
    terrainColumnCount: generatedCellCount,
    terrainExpandedVoxelInstanceCount: 0,
    terrainUsesColumnModel: true,
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    terrainVisibleUnitFaceCount: renderables.length,
    visibleColumnCount: visibleColumnCount,
    visibleChunkCount: visibleChunkCount,
    culledColumnCount: Math.max(0, generatedCellCount - visibleColumnCount),
    culledChunkCount: Math.max(0, totalChunks - visibleChunkCount),
    logicalVoxelCountEstimated: generatedVoxelCount,
    terrainOwnedDeltaBlockCount: terrainOwnedDeltaBlockCount,
    existingManualBlockCount: existingManualBlockCount,
    overlappingColumnCount: overlappingColumnCount,
    mergedWithExistingOccupancy: model && model.mergedWithExistingOccupancy === true,
    stackedOnExistingBlocks: model && model.stackedOnExistingBlocks === true,
    visibleTopFaceCount: visibleTopFaceCount,
    visibleSideFaceCount: visibleSideFaceCount,
    internalVoxelSkippedCount: internalVoxelSkippedCount,
    hiddenInternalSurfaceSkippedCount: hiddenInternalSurfaceSkippedCount,
    terrainBuildWasScoped: true,
    surfaceOnlyRenderingEnabled: scope && scope.surfaceOnlyRenderingEnabled !== false,
    renderableCount: renderables.length,
    terrainBatchDrawCount: renderables.length,
    terrainVisibleFaceCount: visibleTopFaceCount + visibleSideFaceCount,
    buildMode: cacheReset ? 'full' : (rebuiltChunkCount > 0 ? 'dirty-chunk' : 'cached'),
    buildMs: Math.max(0, perfNow() - buildStart),
    chunkSize: getTerrainChunkSizeForRender(model),
    chunkCount: totalChunks,
    cachedChunkCount: terrainChunkRenderCache.chunks.size,
    visibleChunkCount: visibleChunkCount,
    rebuiltChunkCount: rebuiltChunkCount,
    dirtyChunkCount: Math.max(terrainChunkRenderCache.dirtyChunkKeys.size, model && Array.isArray(model.dirtyChunkKeys) ? model.dirtyChunkKeys.length : 0),
    cacheHitCount: cacheHitCount,
    cacheMissCount: cacheMissCount,
    terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null,
    allHeightsAreIntegers: true,
    unitHeightStep: 1,
    renderedAsDiscreteBlockLayers: true,
    cameraMoveTriggeredTerrainRebuild: !!(cameraMoved && rebuiltChunkCount > 0),
    reusedChunkCount: Math.max(0, visibleChunkCount - rebuiltChunkCount),
    cullingOnly: !!(cameraMoved && rebuiltChunkCount === 0)
  };
  lastTerrainCameraMoveState = { key: cameraMoveKey, terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null };
  terrainChunkRenderCache.summary = stats;
  terrainRuntimeSummary = stats;
  logItemRotationPrototype('terrain-logic-summary', {
    terrainCellCount: stats.terrainCellCount,
    terrainColumnCount: Number(stats.terrainColumnCount || 0),
    terrainExpandedVoxelInstanceCount: 0,
    terrainUsesColumnModel: true
  });
  logItemRotationPrototype('terrain-render-pipeline-check', {
    terrainUsesColumnModel: true,
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    terrainExpandedVoxelInstanceCount: 0,
    terrainVisibleUnitFaceCount: Number(stats.terrainVisibleUnitFaceCount || 0),
    terrainVisibleColumnCount: Number(stats.visibleColumnCount || 0)
  });
  logItemRotationPrototype('terrain-block-quantization-check', {
    terrainBatchId: stats.terrainBatchId,
    minHeightObserved: model && model.lastSummary ? Number(model.lastSummary.minHeightObserved || 0) : 0,
    maxHeightObserved: model && model.lastSummary ? Number(model.lastSummary.maxHeightObserved || 0) : 0,
    allHeightsAreIntegers: true,
    unitHeightStep: 1,
    renderedAsDiscreteBlockLayers: true
  });
  logItemRotationPrototype('terrain-camera-move-cost-summary', {
    cameraMoveTriggeredTerrainRebuild: !!stats.cameraMoveTriggeredTerrainRebuild,
    rebuiltChunkCount: Number(stats.rebuiltChunkCount || 0),
    reusedChunkCount: Number(stats.reusedChunkCount || 0),
    visibleChunkCount: Number(stats.visibleChunkCount || 0),
    cullingOnly: !!stats.cullingOnly,
    cameraPanEventId: cameraMoveKey
  });
  logItemRotationPrototype('camera-pan-performance-summary', {
    cameraPanActive: !!cameraMoved,
    cameraMoveTriggeredTerrainRebuild: !!stats.cameraMoveTriggeredTerrainRebuild,
    rebuiltChunkCount: Number(stats.rebuiltChunkCount || 0),
    reusedChunkCount: Number(stats.reusedChunkCount || 0),
    cullingOnly: !!stats.cullingOnly,
    panFrameCostMs: Number(stats.buildMs || 0)
  });
  logItemRotationPrototype('terrain-world-integration-summary', {
    terrainBatchId: stats.terrainBatchId,
    terrainTargetColumnCount: Number(stats.terrainColumnCount || 0),
    terrainOwnedDeltaBlockCount: Number(stats.terrainOwnedDeltaBlockCount || 0),
    mergedWithExistingOccupancy: stats.mergedWithExistingOccupancy === true,
    existingManualBlockCount: Number(stats.existingManualBlockCount || 0),
    overlappingColumnCount: Number(stats.overlappingColumnCount || 0),
    stackedOnExistingBlocks: stats.stackedOnExistingBlocks === true
  });
  logItemRotationPrototype('terrain-build-scope-summary', {
    visibleColumnCount: Number(stats.visibleColumnCount || 0),
    visibleChunkCount: Number(stats.visibleChunkCount || 0),
    culledColumnCount: Number(stats.culledColumnCount || 0),
    culledChunkCount: Number(stats.culledChunkCount || 0),
    terrainBuildWasScoped: true
  });
  logItemRotationPrototype('terrain-chunk-cache-summary', {
    terrainBatchId: stats.terrainBatchId,
    chunkSize: stats.chunkSize,
    chunkCount: stats.chunkCount,
    cachedChunkCount: stats.cachedChunkCount,
    visibleChunkCount: stats.visibleChunkCount,
    rebuiltChunkCount: stats.rebuiltChunkCount,
    dirtyChunkCount: stats.dirtyChunkCount,
    cacheHitCount: stats.cacheHitCount,
    cacheMissCount: stats.cacheMissCount
  });
  logItemRotationPrototype('terrain-render-build-summary', {
    terrainBatchId: stats.terrainBatchId,
    terrainColumnCount: stats.terrainColumnCount,
    visibleColumnCount: stats.visibleColumnCount,
    renderableCount: stats.renderableCount,
    buildMode: stats.buildMode,
    terrainBuildMs: stats.buildMs
  });
  return { renderables: renderables, stats: stats };
}



  function exposeTerrainFunction(fn) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      var deps = args.pop() || {};
      return withDeps(deps, function () { return fn.apply(null, args); });
    };
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    layer: LAYER,
    getTerrainRuntimeSummary: function () { return terrainRuntimeSummary; },
    getTerrainSemanticDebugPalette: exposeTerrainFunction(getTerrainSemanticDebugPalette),
    getTerrainColorModeForRender: exposeTerrainFunction(getTerrainColorModeForRender),
    terrainModelHasData: exposeTerrainFunction(terrainModelHasData),
    getTerrainColumnHeightForRender: exposeTerrainFunction(getTerrainColumnHeightForRender),
    getTerrainExistingHeightForRender: exposeTerrainFunction(getTerrainExistingHeightForRender),
    getTerrainMergedHeightForRender: exposeTerrainFunction(getTerrainMergedHeightForRender),
    getTerrainChunkSizeForRender: exposeTerrainFunction(getTerrainChunkSizeForRender),
    getTerrainChunkKey: exposeTerrainFunction(getTerrainChunkKey),
    getTerrainChunkBounds: exposeTerrainFunction(getTerrainChunkBounds),
    getTerrainChunkCacheSignature: exposeTerrainFunction(getTerrainChunkCacheSignature),
    getVisibleTerrainChunkCoordsForScope: exposeTerrainFunction(getVisibleTerrainChunkCoordsForScope),
    addTerrainOwnedOccupancyToSet: exposeTerrainFunction(addTerrainOwnedOccupancyToSet),
    invalidateTerrainChunkRenderCacheForModel: exposeTerrainFunction(invalidateTerrainChunkRenderCacheForModel),
    buildTerrainChunkSurfaceSources: exposeTerrainFunction(buildTerrainChunkSurfaceSources),
    getTerrainChunkSurfaceSources: exposeTerrainFunction(getTerrainChunkSurfaceSources),
    buildTerrainFaceWorldPolygon: exposeTerrainFunction(buildTerrainFaceWorldPolygon),
    getTerrainMaterialIdForRenderModelCell: exposeTerrainFunction(getTerrainMaterialIdForRenderModelCell),
    getTerrainBaseFaceColorsForRender: exposeTerrainFunction(getTerrainBaseFaceColorsForRender),
    getTerrainFaceAppearanceForRender: exposeTerrainFunction(getTerrainFaceAppearanceForRender),
    getMainViewProjectionConfigWithoutCamera: exposeTerrainFunction(getMainViewProjectionConfigWithoutCamera),
    screenPointsFromWorldFaceNoCamera: exposeTerrainFunction(screenPointsFromWorldFaceNoCamera),
    getTerrainScreenFaceLookup: exposeTerrainFunction(getTerrainScreenFaceLookup),
    buildTerrainGeometryPacket: exposeTerrainFunction(buildTerrainGeometryPacket),
    getTerrainChunkGeometryPackets: exposeTerrainFunction(getTerrainChunkGeometryPackets),
    drawTerrainFaceBatchRenderable: exposeTerrainFunction(drawTerrainFaceBatchRenderable),
    buildTerrainChunkBatchedRenderables: exposeTerrainFunction(buildTerrainChunkBatchedRenderables),
    buildTerrainFaceRenderableItem: exposeTerrainFunction(buildTerrainFaceRenderableItem),
    buildTerrainColumnRenderablesForScope: exposeTerrainFunction(buildTerrainColumnRenderablesForScope),
    buildScopedTerrainRenderables: exposeTerrainFunction(buildScopedTerrainRenderables),
  };

  global.__APP_PRESENTATION_TERRAIN_RENDERABLE_BUILDER__ = api;
  global.__TERRAIN_RENDERABLE_BUILDER__ = api;
  global.IsometricTerrainRenderableBuilder = api;
})(typeof window !== 'undefined' ? window : globalThis);
