// Core isometric face helpers.
// Pure face mapping / polygon / normal / merge-coordinate rules only.
// No DOM, no canvas context, no storage, no platform API.

(function (global) {
  'use strict';

  var OWNER = 'src/core/domain/isometric-face-core.js';
  var PHASE = 'P4-ISOMETRIC-FACE-CORE';

  function toFiniteNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function normalizeFacing(value) {
    var n = Math.round(toFiniteNumber(value, 0));
    return ((n % 4) + 4) % 4;
  }

  function getItemFacingCoreApi() {
    try {
      if (global && global.App && global.App.domain && global.App.domain.itemFacingCore) return global.App.domain.itemFacingCore;
    } catch (_) {}
    try {
      if (global && global.__ITEM_FACING_CORE__) return global.__ITEM_FACING_CORE__;
    } catch (_) {}
    return null;
  }

  function getCanonicalSingleVoxelTruth(viewRotation) {
    var rot = normalizeFacing(viewRotation);
    var table = {
      0: { top: 'top', lowerLeft: 'south', lowerRight: 'east' },
      1: { top: 'top', lowerLeft: 'west', lowerRight: 'south' },
      2: { top: 'top', lowerLeft: 'north', lowerRight: 'west' },
      3: { top: 'top', lowerLeft: 'east', lowerRight: 'north' }
    };
    return table[rot] || table[0];
  }

  function buildFallbackVisibleSemanticMapping(itemFacing, viewRotation) {
    var truth = getCanonicalSingleVoxelTruth(viewRotation);
    var visibleFaces = ['top'];
    if (truth.lowerLeft && visibleFaces.indexOf(truth.lowerLeft) < 0) visibleFaces.push(truth.lowerLeft);
    if (truth.lowerRight && visibleFaces.indexOf(truth.lowerRight) < 0) visibleFaces.push(truth.lowerRight);
    return {
      itemFacing: normalizeFacing(itemFacing),
      viewRotation: normalizeFacing(viewRotation),
      effectiveFacing: normalizeFacing(normalizeFacing(itemFacing) - normalizeFacing(viewRotation)),
      screenFaces: { top: 'top', lowerLeft: truth.lowerLeft, lowerRight: truth.lowerRight },
      visibleFacesByScreenPosition: { top: 'top', lowerLeft: truth.lowerLeft, lowerRight: truth.lowerRight },
      visibleFaces: visibleFaces,
      visibleFacesBySemantic: visibleFaces.slice(),
      canonicalTruth: truth,
      useFallbackMapping: true
    };
  }

  function getVisibleSemanticMapping(itemFacing, viewRotation) {
    var itemFacingCore = getItemFacingCoreApi();
    if (itemFacingCore && typeof itemFacingCore.getVisibleSemanticFaceMapping === 'function') {
      try {
        return itemFacingCore.getVisibleSemanticFaceMapping({ itemFacing: itemFacing, viewRotation: viewRotation });
      } catch (_) {}
    }
    return buildFallbackVisibleSemanticMapping(itemFacing, viewRotation);
  }

  function getScreenFaceForSemanticFace(semanticFace, viewRotation, itemFacing) {
    var face = String(semanticFace || '');
    if (face === 'top') return 'top';
    var mapping = getVisibleSemanticMapping(itemFacing || 0, viewRotation || 0);
    var visibleByScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : null;
    if (visibleByScreen) {
      if (visibleByScreen.lowerLeft === face) return 'lowerLeft';
      if (visibleByScreen.lowerRight === face) return 'lowerRight';
    }
    return face;
  }

  function getBaseFaceFillRgbForSemanticFace(faceColors, semanticFace) {
    var fc = faceColors || {};
    var face = String(semanticFace || 'top');
    if (face === 'top') return fc.top;
    if (face === 'east') return fc.east;
    if (face === 'south') return fc.south;
    if (face === 'west') return fc.east;
    if (face === 'north') return fc.south;
    return fc.top;
  }

  function buildVoxelFaceWorldPolygon(x, y, z, semanticFace) {
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

  function getSemanticFaceWorldPolygon(cell, semanticFace) {
    var safe = cell && typeof cell === 'object' ? cell : {};
    return buildVoxelFaceWorldPolygon(safe.x, safe.y, safe.z, semanticFace);
  }

  function getStaticWorldFaceMergeCoords(cell, semanticFace) {
    var safeCell = cell && typeof cell === 'object' ? cell : null;
    if (!safeCell) return null;
    var x = toFiniteNumber(safeCell.x, 0);
    var y = toFiniteNumber(safeCell.y, 0);
    var z = toFiniteNumber(safeCell.z, 0);
    var face = String(semanticFace || '');
    if (face === 'top') return { plane: z + 1, u: x, v: y };
    if (face === 'east') return { plane: x + 1, u: y, v: z };
    if (face === 'south') return { plane: y + 1, u: x, v: z };
    if (face === 'west') return { plane: x, u: y, v: z };
    if (face === 'north') return { plane: y, u: x, v: z };
    return null;
  }

  function stableStringify(value) {
    if (value == null) return '';
    try {
      return JSON.stringify(value);
    } catch (_) {
      return '[unserializable]';
    }
  }

  function getStaticWorldFaceMergeSignature(cell, semanticFace, screenFace, currentViewRotation) {
    var safeCell = cell && typeof cell === 'object' ? cell : {};
    var ownerKey = safeCell.instanceId != null
      ? 'instance:' + String(safeCell.instanceId)
      : (safeCell.terrainBatchId != null
        ? 'terrain:' + String(safeCell.terrainBatchId)
        : 'prefab:' + String(safeCell.prefabId || '') + '|generated:' + String(safeCell.generatedBy || '') + '|base:' + String(safeCell.base || ''));
    var semanticTextureSignature = [
      safeCell.semanticTextureMap ? stableStringify(safeCell.semanticTextureMap) : '',
      safeCell.semanticTextures ? stableStringify(safeCell.semanticTextures) : '',
      safeCell.semanticFaceColors ? stableStringify(safeCell.semanticFaceColors) : ''
    ].join('|');
    return [
      ownerKey,
      String(safeCell.prefabId || ''),
      String(safeCell.generatedBy || ''),
      String(safeCell.base || ''),
      String(safeCell.terrainMaterialId || ''),
      String(safeCell.materialType || safeCell.terrainBand || ''),
      String(safeCell.rotation != null ? safeCell.rotation : ''),
      String(semanticFace || 'top'),
      String(screenFace || ''),
      Number(currentViewRotation || 0),
      semanticTextureSignature
    ].join('|');
  }

  function getSemanticFaceNormal(faceName) {
    var face = String(faceName || '');
    if (face === 'top') return { x: 0, y: 0, z: 1 };
    if (face === 'lowerRight' || face === 'east') return { x: 1, y: 0, z: 0 };
    if (face === 'lowerLeft' || face === 'south') return { x: 0, y: 1, z: 0 };
    if (face === 'north') return { x: 0, y: -1, z: 0 };
    if (face === 'west') return { x: -1, y: 0, z: 0 };
    return { x: 0, y: 0, z: 1 };
  }

  function getSemanticFaceNeighborDelta(semanticFace) {
    var face = String(semanticFace || '').toLowerCase();
    if (face === 'east') return { x: 1, y: 0, z: 0 };
    if (face === 'south') return { x: 0, y: 1, z: 0 };
    if (face === 'west') return { x: -1, y: 0, z: 0 };
    if (face === 'north') return { x: 0, y: -1, z: 0 };
    if (face === 'top') return { x: 0, y: 0, z: 1 };
    return { x: 0, y: 0, z: 0 };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    normalizeFacing: normalizeFacing,
    getCanonicalSingleVoxelTruth: getCanonicalSingleVoxelTruth,
    getVisibleSemanticMapping: getVisibleSemanticMapping,
    getScreenFaceForSemanticFace: getScreenFaceForSemanticFace,
    getBaseFaceFillRgbForSemanticFace: getBaseFaceFillRgbForSemanticFace,
    buildVoxelFaceWorldPolygon: buildVoxelFaceWorldPolygon,
    getSemanticFaceWorldPolygon: getSemanticFaceWorldPolygon,
    getStaticWorldFaceMergeCoords: getStaticWorldFaceMergeCoords,
    getStaticWorldFaceMergeSignature: getStaticWorldFaceMergeSignature,
    getSemanticFaceNormal: getSemanticFaceNormal,
    getSemanticFaceNeighborDelta: getSemanticFaceNeighborDelta
  };

  global.__ISOMETRIC_FACE_CORE__ = api;
  global.IsometricFaceCore = api;
  global.__APP_CORE_ISOMETRIC_FACE_CORE__ = api;
  if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
    global.__APP_NAMESPACE.bind('domain.isometricFaceCore', api, { owner: OWNER, phase: PHASE });
  }
})(window);
