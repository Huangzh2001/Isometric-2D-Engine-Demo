// Application render helper for static world face descriptor construction.
// Owns visible surface cell -> static/terrain face descriptor mapping.
// No DOM, no canvas context, no Image, no storage, no platform API.

(function (global) {
  'use strict';

  var OWNER = 'src/application/render/static-world-face-descriptor-builder.js';
  var PHASE = 'P12D-STATIC-WORLD-FACE-DESCRIPTOR-BUILDER-TOP-BOUNDARY-DIAGNOSTICS';
  var FACE_TIE_PRIORITY = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };

  function noop() {}
  function nullFn() { return null; }
  function defaultPerfNow() {
    try { if (global && global.performance && typeof global.performance.now === 'function') return global.performance.now(); } catch (_) {}
    return Date.now();
  }
  function resolveFunction(deps, name, fallback) {
    if (deps && typeof deps[name] === 'function') return deps[name];
    return fallback || nullFn;
  }
  function defaultComputeViewAwareSortMeta(cell) {
    var x = Number(cell && cell.x || 0);
    var y = Number(cell && cell.y || 0);
    var z = Number(cell && cell.z || 0);
    return { sortKey: x + y + z, tie: z, rotatedPoint: { x: x, y: y, z: z } };
  }
  function normalizeVisibleFaces(entry) {
    if (Array.isArray(entry && entry.visibleFaces) && entry.visibleFaces.length) return entry.visibleFaces.slice();
    return ['top', 'east', 'south'];
  }

  function getItemFacingCoreApiForStaticFaceVisibility() {
    try {
      if (global && global.App && global.App.domain && global.App.domain.itemFacingCore) return global.App.domain.itemFacingCore;
    } catch (_) {}
    try { if (global && global.__ITEM_FACING_CORE__) return global.__ITEM_FACING_CORE__; } catch (_) {}
    return null;
  }

  function isTerrainGeneratedCell(cell) {
    return !!(cell && cell.generatedBy === 'terrain-generator');
  }

  function getCellItemFacing(cell) {
    if (cell && cell.rotation != null) return Number(cell.rotation || 0) || 0;
    if (cell && cell.itemRotation != null) return Number(cell.itemRotation || 0) || 0;
    if (cell && cell.facing != null) return Number(cell.facing || 0) || 0;
    return 0;
  }

  function resolveCameraVisibleSemanticFaceSet(cell, currentViewRotation) {
    // Camera-facing visibility is renderer-neutral and must be applied before
    // both regular static objects and terrain face-merge candidates emit
    // descriptors.  Terrain still owns its boundary/exposure rules, but exposed
    // side faces that are not camera-visible for the current viewRotation must
    // not enter merge/render packets, otherwise face merge bakes hidden sides
    // into visible terrain slabs.
    var facingApi = getItemFacingCoreApiForStaticFaceVisibility();
    if (!facingApi || typeof facingApi.getVisibleSemanticFaceMapping !== 'function') return null;
    var mapping = null;
    try {
      mapping = facingApi.getVisibleSemanticFaceMapping({
        itemFacing: getCellItemFacing(cell),
        viewRotation: currentViewRotation
      });
    } catch (_) { mapping = null; }
    var visible = mapping && Array.isArray(mapping.visibleFaces) ? mapping.visibleFaces : null;
    if (!visible || !visible.length) return null;
    var set = Object.create(null);
    for (var i = 0; i < visible.length; i++) set[String(visible[i])] = true;
    return set;
  }

  function filterVisibleFacesForCamera(cell, visibleFaces, currentViewRotation, stats) {
    var list = Array.isArray(visibleFaces) ? visibleFaces.slice() : [];
    var cameraVisible = resolveCameraVisibleSemanticFaceSet(cell, currentViewRotation);
    if (!cameraVisible) return list;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var face = String(list[i] || 'top');
      if (cameraVisible[face]) out.push(face);
      else if (stats) stats.cameraHiddenFaceSkippedCount = Number(stats.cameraHiddenFaceSkippedCount || 0) + 1;
    }
    if (stats) {
      stats.cameraFaceFilterAppliedCount = Number(stats.cameraFaceFilterAppliedCount || 0) + 1;
      if (out.length !== list.length) stats.cameraFaceFilterChangedCellCount = Number(stats.cameraFaceFilterChangedCellCount || 0) + 1;
    }
    return out;
  }

  function buildFaceDescriptor(cell, semanticFace, depthKey, context, deps) {
    var getScreenFaceForSemanticFace = resolveFunction(deps, 'getScreenFaceForSemanticFace', function (face) { return String(face || 'top'); });
    var getSemanticFaceNormal = resolveFunction(deps, 'getSemanticFaceNormal', nullFn);
    var getStaticWorldFaceMergeCoords = resolveFunction(deps, 'getStaticWorldFaceMergeCoords', nullFn);
    var computeViewAwareSortMeta = resolveFunction(deps, 'computeViewAwareSortMeta', defaultComputeViewAwareSortMeta);
    var getTerrainSortBandKeyForRenderFace = resolveFunction(deps, 'getTerrainSortBandKeyForRenderFace', nullFn);
    var getTerrainSideEdgeVisibilitySignature = resolveFunction(deps, 'getTerrainSideEdgeVisibilitySignature', nullFn);
    var getTerrainSideStepBreakSignature = resolveFunction(deps, 'getTerrainSideStepBreakSignature', nullFn);
    var getTerrainTopStepBoundarySignature = resolveFunction(deps, 'getTerrainTopStepBoundarySignature', nullFn);
    var getTerrainMaterialMergeKeyForRenderCell = resolveFunction(deps, 'getTerrainMaterialMergeKeyForRenderCell', nullFn);
    var getTerrainFaceMergeSignature = resolveFunction(deps, 'getTerrainFaceMergeSignature', nullFn);
    var getStaticWorldFaceMergeSignature = resolveFunction(deps, 'getStaticWorldFaceMergeSignature', nullFn);

    var currentViewRotation = Number(context && context.currentViewRotation || 0);
    var chunkOcc = context ? context.chunkOcc : null;
    var domainCore = context ? context.domainCore : null;
    var screenFace = getScreenFaceForSemanticFace(semanticFace, currentViewRotation);
    var normal = getSemanticFaceNormal(semanticFace || screenFace);
    var mergeCoords = getStaticWorldFaceMergeCoords(cell, semanticFace);
    if (!mergeCoords) return null;

    var orderMeta = domainCore && typeof domainCore.computeVoxelRenderableSort === 'function'
      ? domainCore.computeVoxelRenderableSort({ cell: { x: Number(cell.x || 0), y: Number(cell.y || 0), z: Number(cell.z || 0) }, box: cell, viewRotation: currentViewRotation })
      : computeViewAwareSortMeta({ x: Number(cell.x || 0), y: Number(cell.y || 0), z: Number(cell.z || 0) }, 1, currentViewRotation);
    orderMeta = orderMeta || {};
    var sortKey = Number(orderMeta.sortKey || 0);
    var tie = Number(orderMeta.tie || 0) + ((FACE_TIE_PRIORITY[screenFace] || 0) * 0.01);
    var terrainSortBandKey = getTerrainSortBandKeyForRenderFace(cell, semanticFace, mergeCoords, orderMeta);
    var isTerrainSide = !!(cell && cell.generatedBy === 'terrain-generator' && (semanticFace === 'east' || semanticFace === 'south'));
    var edgeVisibilitySignature = isTerrainSide ? getTerrainSideEdgeVisibilitySignature(context.visibleFaces || [], semanticFace) : null;
    var sideStepBreakSignature = isTerrainSide ? getTerrainSideStepBreakSignature(cell, semanticFace, chunkOcc) : null;
    var topStepBoundarySignature = cell && cell.generatedBy === 'terrain-generator' && semanticFace === 'top'
      ? getTerrainTopStepBoundarySignature(cell, chunkOcc)
      : null;
    var isTerrainFaceMergeCandidate = !!(cell && cell.generatedBy === 'terrain-generator');
    var terrainMaterialMergeKey = getTerrainMaterialMergeKeyForRenderCell(cell);
    var terrainMergeSignature = isTerrainFaceMergeCandidate
      ? getTerrainFaceMergeSignature(cell, semanticFace, screenFace, currentViewRotation)
      : null;

    return {
      cell: cell,
      box: cell || null,
      instanceId: cell.instanceId || null,
      prefabId: cell.prefabId || null,
      semanticFace: semanticFace,
      screenFace: screenFace,
      depthKey: depthKey,
      sortKey: sortKey,
      tie: tie,
      sortViewRotation: currentViewRotation,
      sortWorldAnchor: { x: Number(cell.x || 0), y: Number(cell.y || 0), z: Number(cell.z || 0), h: 1 },
      sortRotatedPoint: orderMeta.rotatedPoint || null,
      normal: normal,
      mergePlane: Number(mergeCoords.plane || 0),
      mergeU: Number(mergeCoords.u || 0),
      mergeV: Number(mergeCoords.v || 0),
      mergeWidth: 1,
      mergeHeight: 1,
      mergeSignature: isTerrainFaceMergeCandidate
        ? terrainMergeSignature
        : getStaticWorldFaceMergeSignature(cell, semanticFace, screenFace, currentViewRotation),
      terrainMaterialMergeKey: terrainMaterialMergeKey,
      terrainMergeSignature: terrainMergeSignature,
      terrainSortBandKey: terrainSortBandKey,
      edgeVisibilitySignature: edgeVisibilitySignature,
      sideStepBreakSignature: sideStepBreakSignature,
      topStepBoundarySignature: topStepBoundarySignature,
      isTerrainFaceMergeCandidate: isTerrainFaceMergeCandidate,
      memberCount: 1,
      merged: false
    };
  }
  function buildStaticWorldFaceDescriptors(options, deps) {
    var opts = options && typeof options === 'object' ? options : {};
    var __deps = deps && typeof deps === 'object' ? deps : {};
    var perfNow = resolveFunction(__deps, 'perfNow', defaultPerfNow);
    var surfaceCells = Array.isArray(opts.surfaceCells) ? opts.surfaceCells : [];
    var faceDescriptors = [];
    var scannedFaceCount = 0;
    var inputFaceDescriptorCount = 0;
    var step1PrepareFaceInputsMs = 0;
    var step5ComputeSortKeyMs = 0;
    var faceVisibilityFilterStats = {
      cameraFaceFilterAppliedCount: 0,
      cameraFaceFilterChangedCellCount: 0,
      cameraHiddenFaceSkippedCount: 0,
      cameraTerrainFaceFilterAppliedCount: 0,
      cameraTerrainHiddenFaceSkippedCount: 0
    };

    for (var i = 0; i < surfaceCells.length; i++) {
      var entry = surfaceCells[i];
      var cell = entry && entry.box ? entry.box : entry;
      if (!cell) continue;
      var visibleFaces = normalizeVisibleFaces(entry);
      var beforeCameraFilterFaceCount = visibleFaces.length;
      visibleFaces = filterVisibleFacesForCamera(cell, visibleFaces, opts.currentViewRotation, faceVisibilityFilterStats);
      if (isTerrainGeneratedCell(cell)) {
        faceVisibilityFilterStats.cameraTerrainFaceFilterAppliedCount = Number(faceVisibilityFilterStats.cameraTerrainFaceFilterAppliedCount || 0) + 1;
        faceVisibilityFilterStats.cameraTerrainHiddenFaceSkippedCount = Number(faceVisibilityFilterStats.cameraTerrainHiddenFaceSkippedCount || 0) + Math.max(0, beforeCameraFilterFaceCount - visibleFaces.length);
      }
      for (var vf = 0; vf < visibleFaces.length; vf++) {
        scannedFaceCount += 1;
        var prepareFaceInputsStartAt = perfNow();
        var semanticFace = String(visibleFaces[vf] || 'top');
        step1PrepareFaceInputsMs += Math.max(0, perfNow() - prepareFaceInputsStartAt);
        var sortKeyStartAt = perfNow();
        var descriptor = buildFaceDescriptor(cell, semanticFace, vf, {
          currentViewRotation: opts.currentViewRotation,
          chunkOcc: opts.chunkOcc,
          domainCore: opts.domainCore,
          visibleFaces: visibleFaces
        }, __deps);
        step5ComputeSortKeyMs += Math.max(0, perfNow() - sortKeyStartAt);
        if (!descriptor) continue;
        inputFaceDescriptorCount += 1;
        faceDescriptors.push(descriptor);
      }
    }
    return {
      faceDescriptors: faceDescriptors,
      scannedFaceCount: scannedFaceCount,
      inputFaceDescriptorCount: inputFaceDescriptorCount,
      cameraFaceFilterAppliedCount: Number(faceVisibilityFilterStats.cameraFaceFilterAppliedCount || 0),
      cameraFaceFilterChangedCellCount: Number(faceVisibilityFilterStats.cameraFaceFilterChangedCellCount || 0),
      cameraHiddenFaceSkippedCount: Number(faceVisibilityFilterStats.cameraHiddenFaceSkippedCount || 0),
      cameraTerrainFaceFilterAppliedCount: Number(faceVisibilityFilterStats.cameraTerrainFaceFilterAppliedCount || 0),
      cameraTerrainHiddenFaceSkippedCount: Number(faceVisibilityFilterStats.cameraTerrainHiddenFaceSkippedCount || 0),
      step1PrepareFaceInputsMs: step1PrepareFaceInputsMs,
      step5ComputeSortKeyMs: step5ComputeSortKeyMs
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    buildFaceDescriptor: buildFaceDescriptor,
    buildStaticWorldFaceDescriptors: buildStaticWorldFaceDescriptors,
    summarizeBoundary: function () {
      return { owner: OWNER, phase: PHASE, layer: 'application/render', input: 'visible surface cells', output: 'static world face descriptors', forbidden: ['ctx', 'canvas', 'document', 'Image', 'localStorage', 'fetch'] };
    }
  };

  try {
    global.__STATIC_WORLD_FACE_DESCRIPTOR_BUILDER__ = api;
    global.__APP_APPLICATION_STATIC_WORLD_FACE_DESCRIPTOR_BUILDER__ = api;
    global.IsometricStaticWorldFaceDescriptorBuilder = api;
    global.App = global.App || {};
    global.App.application = global.App.application || {};
    global.App.application.render = global.App.application.render || {};
    global.App.application.render.staticWorldFaceDescriptorBuilder = api;
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
