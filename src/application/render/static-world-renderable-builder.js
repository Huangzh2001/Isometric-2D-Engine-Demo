// Application renderable builder for static world chunks.
// Owns world/chunk/cell -> renderable packet construction flow.
// No DOM, no canvas context, no Image, no storage, no platform API.

(function (global) {
  'use strict';

  var OWNER = 'src/application/render/static-world-renderable-builder.js';
  var PHASE = 'P6A-STATIC-WORLD-RENDERABLE-BUILDER';

  function noop() {}
  function nullFn() { return null; }
  function emptyObjectFn() { return {}; }
  function defaultPerfNow() {
    try { if (global && global.performance && typeof global.performance.now === 'function') return global.performance.now(); } catch (_) {}
    return Date.now();
  }
  function resolveFunction(deps, name, fallback) {
    if (deps && typeof deps[name] === 'function') return deps[name];
    try { if (global && typeof global[name] === 'function') return global[name]; } catch (_) {}
    return fallback || nullFn;
  }
  function defaultCompareRenderablesByDomain(a, b) {
    var ak = Number(a && a.sortKey || 0);
    var bk = Number(b && b.sortKey || 0);
    if (ak !== bk) return ak - bk;
    return Number(a && a.tie || 0) - Number(b && b.tie || 0);
  }
  function requireStaticWorldFaceDescriptorBuilder(deps) {
    var api = deps && deps.staticWorldFaceDescriptorBuilder ? deps.staticWorldFaceDescriptorBuilder : null;
    try { api = api || (global && (global.__STATIC_WORLD_FACE_DESCRIPTOR_BUILDER__ || global.__APP_APPLICATION_STATIC_WORLD_FACE_DESCRIPTOR_BUILDER__)); } catch (_) {}
    if (!api || typeof api.buildStaticWorldFaceDescriptors !== 'function') {
      throw new Error('Missing static world face descriptor builder owner');
    }
    return api;
  }
  function requireStaticWorldPacketOrdering(deps) {
    var api = deps && deps.staticWorldPacketOrdering ? deps.staticWorldPacketOrdering : null;
    try { api = api || (global && (global.__STATIC_WORLD_PACKET_ORDERING__ || global.__APP_APPLICATION_STATIC_WORLD_PACKET_ORDERING__)); } catch (_) {}
    if (!api || typeof api.buildStaticWorldPacketIdentity !== 'function' || typeof api.sortStaticWorldPackets !== 'function') {
      throw new Error('Missing static world packet ordering owner');
    }
    return api;
  }

  function buildStaticWorldChunkRenderables(chunk, options, deps) {
    var __deps = deps && typeof deps === 'object' ? deps : {};
    var staticWorldFaceDescriptorBuilder = requireStaticWorldFaceDescriptorBuilder(__deps);
    var staticWorldPacketOrdering = requireStaticWorldPacketOrdering(__deps);
    var perfNow = resolveFunction(__deps, 'perfNow', defaultPerfNow);
    var getRenderVisibilityCoreApi = resolveFunction(__deps, 'getRenderVisibilityCoreApi', nullFn);
    var getMainCameraRenderScope = resolveFunction(__deps, 'getMainCameraRenderScope', nullFn);
    var resolveChunkOccupancyReaderForRender = resolveFunction(__deps, 'resolveChunkOccupancyReaderForRender', nullFn);
    var buildChunkLocalOccupancyMap = resolveFunction(__deps, 'buildChunkLocalOccupancyMap', emptyObjectFn);
    var getDomainSceneCoreApi = resolveFunction(__deps, 'getDomainSceneCoreApi', nullFn);
    var isStaticWorldFaceMergeEnabledForRender = resolveFunction(__deps, 'isStaticWorldFaceMergeEnabledForRender', nullFn);
    var isStaticRenderableLightingUiEnabledForBuild = resolveFunction(__deps, 'isStaticRenderableLightingUiEnabledForBuild', nullFn);
    var getScreenFaceForSemanticFace = resolveFunction(__deps, 'getScreenFaceForSemanticFace', nullFn);
    var getSemanticFaceNormal = resolveFunction(__deps, 'getSemanticFaceNormal', nullFn);
    var getStaticWorldFaceMergeCoords = resolveFunction(__deps, 'getStaticWorldFaceMergeCoords', nullFn);
    var computeViewAwareSortMeta = resolveFunction(__deps, 'computeViewAwareSortMeta', nullFn);
    var getTerrainSortBandKeyForRenderFace = resolveFunction(__deps, 'getTerrainSortBandKeyForRenderFace', nullFn);
    var getTerrainSideEdgeVisibilitySignature = resolveFunction(__deps, 'getTerrainSideEdgeVisibilitySignature', nullFn);
    var getTerrainSideStepBreakSignature = resolveFunction(__deps, 'getTerrainSideStepBreakSignature', nullFn);
    var getTerrainMaterialMergeKeyForRenderCell = resolveFunction(__deps, 'getTerrainMaterialMergeKeyForRenderCell', nullFn);
    var getTerrainFaceMergeSignature = resolveFunction(__deps, 'getTerrainFaceMergeSignature', nullFn);
    var getStaticWorldFaceMergeSignature = resolveFunction(__deps, 'getStaticWorldFaceMergeSignature', nullFn);
    var getStaticWorldFaceMergeCoreApi = resolveFunction(__deps, 'getStaticWorldFaceMergeCoreApi', nullFn);
    var getTerrainFaceMergeCoreApi = resolveFunction(__deps, 'getTerrainFaceMergeCoreApi', nullFn);
    var buildMergedVoxelFaceWorldGeometry = resolveFunction(__deps, 'buildMergedVoxelFaceWorldGeometry', nullFn);
    var buildTerrainTopBoundarySegmentsWorldFromDescriptor = resolveFunction(__deps, 'buildTerrainTopBoundarySegmentsWorldFromDescriptor', nullFn);
    var buildTerrainPolygonLoopSignature = resolveFunction(__deps, 'buildTerrainPolygonLoopSignature', nullFn);
    var getTerrainMaterialPatternDescriptorForRenderCell = resolveFunction(__deps, 'getTerrainMaterialPatternDescriptorForRenderCell', nullFn);
    var getTerrainMaterialBaseFaceColorsForRenderCell = resolveFunction(__deps, 'getTerrainMaterialBaseFaceColorsForRenderCell', nullFn);
    var getCachedBaseFaceColorsForRenderable = resolveFunction(__deps, 'getCachedBaseFaceColorsForRenderable', nullFn);
    var getTerrainRenderSettingsForRender = resolveFunction(__deps, 'getTerrainRenderSettingsForRender', nullFn);
    var isStaticRenderableLightingActiveForBuild = resolveFunction(__deps, 'isStaticRenderableLightingActiveForBuild', nullFn);
    var getCachedStaticRenderableFill = resolveFunction(__deps, 'getCachedStaticRenderableFill', nullFn);
    var buildVoxelFaceShadowWorldOverlays = resolveFunction(__deps, 'buildVoxelFaceShadowWorldOverlays', nullFn);
    var buildActorInteractionMemberFaceKeysFromFaceDescriptor = resolveFunction(__deps, 'buildActorInteractionMemberFaceKeysFromFaceDescriptor', nullFn);
    var getActorInteractionMemberDescriptorsFromFaceDescriptor = resolveFunction(__deps, 'getActorInteractionMemberDescriptorsFromFaceDescriptor', nullFn);
    var getTerrainMaterialIdForRenderCell = resolveFunction(__deps, 'getTerrainMaterialIdForRenderCell', nullFn);
    var compareRenderablesByDomain = resolveFunction(__deps, 'compareRenderablesByDomain', defaultCompareRenderablesByDomain);
    var emitChunkRebuildScopeVerify = resolveFunction(__deps, 'emitChunkRebuildScopeVerify', noop);
    var emitChunkRebuildDetail = resolveFunction(__deps, 'emitChunkRebuildDetail', noop);
    var emitChunkRebuildHotspot = resolveFunction(__deps, 'emitChunkRebuildHotspot', noop);
    var emitStaticRenderableBuildDetail = resolveFunction(__deps, 'emitStaticRenderableBuildDetail', noop);
    var emitStaticRenderableBuildScopeVerify = resolveFunction(__deps, 'emitStaticRenderableBuildScopeVerify', noop);
    var emitStaticRenderableBuildHotspot = resolveFunction(__deps, 'emitStaticRenderableBuildHotspot', noop);
    var emitColorBuildDetail = resolveFunction(__deps, 'emitColorBuildDetail', noop);
    var emitStep4ColorBuildDetail = resolveFunction(__deps, 'emitStep4ColorBuildDetail', noop);
    var emitStep4ColorBuildScopeVerify = resolveFunction(__deps, 'emitStep4ColorBuildScopeVerify', noop);
    var getStaticRenderableActualColorPathUsed = resolveFunction(__deps, 'getStaticRenderableActualColorPathUsed', nullFn);
    var getStaticRenderableBuildColorModeForRender = resolveFunction(__deps, 'getStaticRenderableBuildColorModeForRender', nullFn);
    var emitBuildColorPathVerify = resolveFunction(__deps, 'emitBuildColorPathVerify', noop);
    var emitLightingShadowBypassVerify = resolveFunction(__deps, 'emitLightingShadowBypassVerify', noop);
    var emitStep4ShadowPathSummary = resolveFunction(__deps, 'emitStep4ShadowPathSummary', noop);
    var emitColorBuildMissBreakdown = resolveFunction(__deps, 'emitColorBuildMissBreakdown', noop);
    var emitColorBuildHotspot = resolveFunction(__deps, 'emitColorBuildHotspot', noop);
    var emitStep4ColorBuildHotspot = resolveFunction(__deps, 'emitStep4ColorBuildHotspot', noop);
    var emitChunkRebuildBreakdown = resolveFunction(__deps, 'emitChunkRebuildBreakdown', noop);
  
    var opts = options && typeof options === 'object' ? options : {};
    var visibilityCore = opts.visibilityCore || getRenderVisibilityCoreApi();
    var currentViewRotation = Number(opts.currentViewRotation || 0);
    var cameraScope = opts.cameraScope || getMainCameraRenderScope(currentViewRotation);
    var semanticLogSeen = opts.semanticLogSeen || Object.create(null);
    var profileContext = opts.profileContext && typeof opts.profileContext === 'object' ? opts.profileContext : {};
    var chunkBuildStartAt = perfNow();
    var chunkBoxesCollectStartAt = perfNow();
    var chunkBoxes = [];
    if (chunk && chunk.boxMap && typeof chunk.boxMap.forEach === 'function') {
      chunk.boxMap.forEach(function (box) { if (box) chunkBoxes.push(box); });
    }
    var step1CollectChunkBoxesMs = Math.max(0, perfNow() - chunkBoxesCollectStartAt);
    var neighborBoxesCollectStartAt = perfNow();
    var neighborBoxes = [];
    if (Array.isArray(opts.neighborBoxes) && opts.neighborBoxes.length) {
      neighborBoxes = opts.neighborBoxes.filter(function (box) { return !!box; });
    }
    var step2CollectNeighborBoxesMs = Math.max(0, perfNow() - neighborBoxesCollectStartAt);
    var occupancyStartAt = perfNow();
    // Prefer the scene-level occupancy cache so chunk rebuilds can reuse the shared world occupancy index.
    // Keep the local fallback to preserve behavior and allow fast rollback if validation fails.
    var occupancyResolution = resolveChunkOccupancyReaderForRender({
      occupancy: opts.occupancy,
      localBoxes: chunkBoxes,
      neighborBoxes: neighborBoxes
    });
    var chunkOcc = occupancyResolution && occupancyResolution.reader ? occupancyResolution.reader : buildChunkLocalOccupancyMap(chunkBoxes, neighborBoxes);
    var occupancyBuildMs = Math.max(0, perfNow() - occupancyStartAt);
    var usedGlobalOccupancy = occupancyResolution && occupancyResolution.source === 'global';
    var usedLocalOccupancyFallback = !usedGlobalOccupancy;
    var occupancyAccessMode = occupancyResolution && occupancyResolution.source ? String(occupancyResolution.source) : 'local-fallback';
    var occupancyFallbackReason = occupancyResolution && occupancyResolution.fallbackReason ? String(occupancyResolution.fallbackReason) : null;
    var occupancyValidationSampleCount = Number(occupancyResolution && occupancyResolution.validationSampleCount || 0);
    var step3ResolveOccupancyMs = occupancyBuildMs;
    var step3BuildLocalOccupancyMs = usedLocalOccupancyFallback ? occupancyBuildMs : 0;
    var visibleSurfaceStartAt = perfNow();
    var surfaceCache = visibilityCore && typeof visibilityCore.buildVisibleSurfaceCache === 'function'
      ? visibilityCore.buildVisibleSurfaceCache(chunkBoxes, {
          scope: null,
          occupancy: chunkOcc,
          surfaceOnlyRenderingEnabled: cameraScope.surfaceOnlyRenderingEnabled !== false,
          classifyBox: function (box) {
            return {
              isTerrain: !!(box && box.generatedBy === 'terrain-generator'),
              isStructured: true,
              isVoxelFurniture: !(box && box.generatedBy === 'terrain-generator')
            };
          }
        })
      : {
          surfaceCells: chunkBoxes.map(function (box) { return { box: box, visibleFaces: ['top', 'east', 'south'] }; }),
          logicalVoxelCountEstimated: chunkBoxes.length,
          visibleTopFaceCount: 0,
          visibleSideFaceCount: 0,
          hiddenInternalSurfaceSkippedCount: 0,
          voxelFurnitureProcessedCount: chunkBoxes.length,
          surfaceOnlyRenderingEnabled: true,
          internalVoxelSkippedCount: 0,
          cameraCulledCount: 0
        };
    var visibleSurfaceBuildMs = Math.max(0, perfNow() - visibleSurfaceStartAt);
    var step4ComputeVisibleFacesMs = visibleSurfaceBuildMs;
    var packetBuildStartAt = perfNow();
    var packets = [];
    var surfaceCells = Array.isArray(surfaceCache.surfaceCells) ? surfaceCache.surfaceCells : [];
    var domainCore = getDomainSceneCoreApi();
    var staticRenderableBuildProfileStartAt = perfNow();
    var step1PrepareFaceInputsMs = 0;
    var step2BuildRenderableBaseMs = 0;
    var step3BuildStyleOrMaterialMs = 0;
    var step4BuildColorMs = 0;
    var step5ComputeSortKeyMs = 0;
    var step6ObjectAllocationMs = 0;
    var step7ArrayPushMs = 0;
    var step8FinalizeRenderableListMs = 0;
    var mergeFaceDescriptorsMs = 0;
    var inputFaceDescriptorCount = 0;
    var mergedFaceDescriptorCount = 0;
    var mergedStaticFaceCount = 0;
    var mergeReductionRatio = 0;
    var terrainPacketCount = 0;
    var faceMergeMode = 'disabled';
    var faceMergeFallbackReason = null;
    var faceMergeEnabled = isStaticWorldFaceMergeEnabledForRender();
    var colorBuildStats = {
      colorCacheEnabled: true,
      colorCacheHitCount: 0,
      colorCacheMissCount: 0,
      colorKeyUsage: new Map(),
      actualColorPathUsedCounts: new Map(),
      miss_step1_paletteLookupMs: 0,
      miss_step2_heightBucketMs: 0,
      miss_step3_materialColorMs: 0,
      miss_step4_lightingMixMs: 0,
      miss_step5_cssOrObjectBuildMs: 0,
      step4a_colorCacheLookupMs: 0,
      step4b_colorCacheHitFastPathMs: 0,
      step4c_colorMissPathMs: 0,
      step4d_shadowOverlayTotalMs: 0,
      step4e_shadowOverlayCacheLookupMs: 0,
      step4f_shadowOverlayCollectMs: 0,
      step4g_shadowOverlayCloneMs: 0,
      step4h_fillAndOverlayAssignMs: 0,
      shadowOverlayCacheHitCount: 0,
      shadowOverlayCacheMissCount: 0,
      shadowOverlayTotalCount: 0,
      touchedColorCachePath: false,
      touchedNaturalColorPath: false,
      touchedLightingPath: false,
      touchedShadowOverlayPath: false,
      touchedProjectedShadowCollector: false,
      shadowOverlaySkippedByLightingOff: false,
      lightingEnabledUi: isStaticRenderableLightingUiEnabledForBuild(),
      usedLightingSignature: false
    };
    var scannedFaceCount = 0;
    var touchedGlobalRenderableTemplates = false;
    var touchedGlobalStyleCache = false;
    var touchedGlobalMaterialCache = false;
    var faceDescriptorResult = staticWorldFaceDescriptorBuilder.buildStaticWorldFaceDescriptors({
      surfaceCells: surfaceCells,
      currentViewRotation: currentViewRotation,
      chunkOcc: chunkOcc,
      domainCore: domainCore
    }, {
      perfNow: perfNow,
      getScreenFaceForSemanticFace: getScreenFaceForSemanticFace,
      getSemanticFaceNormal: getSemanticFaceNormal,
      getStaticWorldFaceMergeCoords: getStaticWorldFaceMergeCoords,
      computeViewAwareSortMeta: computeViewAwareSortMeta,
      getTerrainSortBandKeyForRenderFace: getTerrainSortBandKeyForRenderFace,
      getTerrainSideEdgeVisibilitySignature: getTerrainSideEdgeVisibilitySignature,
      getTerrainSideStepBreakSignature: getTerrainSideStepBreakSignature,
      getTerrainMaterialMergeKeyForRenderCell: getTerrainMaterialMergeKeyForRenderCell,
      getTerrainFaceMergeSignature: getTerrainFaceMergeSignature,
      getStaticWorldFaceMergeSignature: getStaticWorldFaceMergeSignature
    });
    var faceDescriptors = faceDescriptorResult && Array.isArray(faceDescriptorResult.faceDescriptors) ? faceDescriptorResult.faceDescriptors : [];
    scannedFaceCount += Number(faceDescriptorResult && faceDescriptorResult.scannedFaceCount || 0);
    inputFaceDescriptorCount += Number(faceDescriptorResult && faceDescriptorResult.inputFaceDescriptorCount || faceDescriptors.length || 0);
    step1PrepareFaceInputsMs += Number(faceDescriptorResult && faceDescriptorResult.step1PrepareFaceInputsMs || 0);
    step5ComputeSortKeyMs += Number(faceDescriptorResult && faceDescriptorResult.step5ComputeSortKeyMs || 0);
    var renderFaceDescriptors = faceDescriptors;
    var terrainInputFaceDescriptorCount = 0;
    var terrainMergedFaceDescriptorCount = 0;
    var terrainMergedStaticFaceCount = 0;
    var terrainMergeReductionRatio = 0;
    var terrainMergeFaceDescriptorsMs = 0;
    var terrainSideInputFaceDescriptorCount = 0;
    var terrainSideMergedFaceDescriptorCount = 0;
    var terrainSideMergedStaticFaceCount = 0;
    var terrainSideMergeReductionRatio = 0;
    var terrainSideStepBreakCount = 0;
    var terrainFaceMergeMode = 'not-applicable';
    var terrainFaceMergeFallbackReason = null;
    var faceMergeCore = getStaticWorldFaceMergeCoreApi();
    var terrainFaceMergeCore = getTerrainFaceMergeCoreApi();
    var nonTerrainDescriptors = [];
    var terrainDescriptors = [];
    for (var fdi = 0; fdi < faceDescriptors.length; fdi++) {
      var faceDesc = faceDescriptors[fdi];
      if (faceDesc && faceDesc.isTerrainFaceMergeCandidate === true) terrainDescriptors.push(faceDesc);
      else nonTerrainDescriptors.push(faceDesc);
    }
    terrainInputFaceDescriptorCount = terrainDescriptors.length;
    terrainSideInputFaceDescriptorCount = terrainDescriptors.filter(function (face) {
      var sf = String(face && face.semanticFace || '');
      return sf === 'east' || sf === 'south';
    }).length;
    var mergedNonTerrainDescriptors = nonTerrainDescriptors;
    var mergedTerrainDescriptors = terrainDescriptors;
    var nonTerrainMergedCount = 0;
    var nonTerrainOutputCount = nonTerrainDescriptors.length;
    if (faceMergeEnabled && faceMergeCore && typeof faceMergeCore.mergeFaceDescriptors === 'function' && nonTerrainDescriptors.length > 0) {
      var nonTerrainMergeStartAt = perfNow();
      var nonTerrainMergeResult = faceMergeCore.mergeFaceDescriptors(nonTerrainDescriptors, { enabled: true });
      mergeFaceDescriptorsMs += Math.max(0, perfNow() - nonTerrainMergeStartAt);
      if (nonTerrainMergeResult && Array.isArray(nonTerrainMergeResult.descriptors)) {
        mergedNonTerrainDescriptors = nonTerrainMergeResult.descriptors;
        nonTerrainOutputCount = Number(nonTerrainMergeResult.outputCount || mergedNonTerrainDescriptors.length || 0);
        nonTerrainMergedCount = Number(nonTerrainMergeResult.mergedFaceCount || Math.max(0, nonTerrainDescriptors.length - nonTerrainOutputCount));
      } else {
        faceMergeFallbackReason = 'invalid-non-terrain-merge-result';
        faceMergeMode = 'fallback-no-merge';
      }
    } else if (!faceMergeEnabled) {
      faceMergeMode = 'disabled';
      faceMergeFallbackReason = 'face-merge-disabled';
    } else if (nonTerrainDescriptors.length > 0 && !(faceMergeCore && typeof faceMergeCore.mergeFaceDescriptors === 'function')) {
      faceMergeMode = 'fallback-no-merge';
      faceMergeFallbackReason = 'missing-face-merge-core';
    }
    if (terrainDescriptors.length > 0) {
      if (faceMergeEnabled && terrainFaceMergeCore && typeof terrainFaceMergeCore.mergeTerrainFaceDescriptors === 'function') {
        var terrainMergeStartAt = perfNow();
        var terrainMergeResult = terrainFaceMergeCore.mergeTerrainFaceDescriptors(terrainDescriptors, { enabled: true });
        terrainMergeFaceDescriptorsMs = Math.max(0, perfNow() - terrainMergeStartAt);
        mergeFaceDescriptorsMs += terrainMergeFaceDescriptorsMs;
        if (terrainMergeResult && Array.isArray(terrainMergeResult.descriptors)) {
          mergedTerrainDescriptors = terrainMergeResult.descriptors;
          terrainMergedFaceDescriptorCount = Number(terrainMergeResult.outputCount || mergedTerrainDescriptors.length || 0);
          terrainMergedStaticFaceCount = Number(terrainMergeResult.mergedFaceCount || Math.max(0, terrainDescriptors.length - terrainMergedFaceDescriptorCount));
          terrainMergeReductionRatio = Number(terrainMergeResult.reductionRatio || (terrainDescriptors.length > 0 ? Math.max(0, (terrainDescriptors.length - terrainMergedFaceDescriptorCount) / terrainDescriptors.length) : 0));
          terrainSideStepBreakCount = Number(terrainMergeResult.sideStepBreakCount || 0);
          terrainFaceMergeMode = 'terrain-core-merge';
        } else {
          terrainMergedFaceDescriptorCount = terrainDescriptors.length;
          terrainFaceMergeMode = 'fallback-no-merge';
          terrainFaceMergeFallbackReason = 'invalid-terrain-merge-result';
        }
      } else if (!faceMergeEnabled) {
        terrainMergedFaceDescriptorCount = terrainDescriptors.length;
        terrainFaceMergeMode = 'disabled';
        terrainFaceMergeFallbackReason = 'face-merge-disabled';
      } else {
        terrainMergedFaceDescriptorCount = terrainDescriptors.length;
        terrainFaceMergeMode = 'fallback-no-merge';
        terrainFaceMergeFallbackReason = 'missing-terrain-face-merge-core';
      }
    }
    if (terrainMergedFaceDescriptorCount <= 0 && terrainInputFaceDescriptorCount > 0) terrainMergedFaceDescriptorCount = terrainInputFaceDescriptorCount;
    terrainSideMergedFaceDescriptorCount = mergedTerrainDescriptors.filter(function (face) {
      var sf = String(face && face.semanticFace || '');
      return sf === 'east' || sf === 'south';
    }).length;
    terrainSideMergedStaticFaceCount = Math.max(0, Number(terrainSideInputFaceDescriptorCount || 0) - Number(terrainSideMergedFaceDescriptorCount || 0));
    terrainSideMergeReductionRatio = terrainSideInputFaceDescriptorCount > 0
      ? Math.max(0, (terrainSideInputFaceDescriptorCount - terrainSideMergedFaceDescriptorCount) / terrainSideInputFaceDescriptorCount)
      : 0;
    renderFaceDescriptors = mergedNonTerrainDescriptors.concat(mergedTerrainDescriptors);
    mergedFaceDescriptorCount = Number(nonTerrainOutputCount || mergedNonTerrainDescriptors.length || 0) + Number(terrainMergedFaceDescriptorCount || 0);
    mergedStaticFaceCount = Math.max(0, Number(nonTerrainMergedCount || 0) + Number(terrainMergedStaticFaceCount || 0));
    mergeReductionRatio = inputFaceDescriptorCount > 0 ? Math.max(0, (inputFaceDescriptorCount - mergedFaceDescriptorCount) / inputFaceDescriptorCount) : 0;
    if (terrainDescriptors.length > 0 && nonTerrainDescriptors.length > 0) faceMergeMode = 'split-terrain-generic';
    else if (terrainDescriptors.length > 0) faceMergeMode = terrainFaceMergeMode;
    else if (nonTerrainDescriptors.length > 0 && faceMergeEnabled && faceMergeCore && typeof faceMergeCore.mergeFaceDescriptors === 'function') faceMergeMode = 'generic-core-merge';
    if (mergedFaceDescriptorCount <= 0 && inputFaceDescriptorCount > 0) mergedFaceDescriptorCount = inputFaceDescriptorCount;
    for (var fd = 0; fd < renderFaceDescriptors.length; fd++) {
      var descriptor = renderFaceDescriptors[fd];
      var cell = descriptor && (descriptor.cell || descriptor.box) ? (descriptor.cell || descriptor.box) : null;
      if (!cell) continue;
      var prepareFaceInputsStartAt = perfNow();
      var semanticFace = String(descriptor.semanticFace || 'top');
      var screenFace = descriptor.screenFace || getScreenFaceForSemanticFace(semanticFace, currentViewRotation);
      var normal = descriptor.normal || getSemanticFaceNormal(semanticFace || screenFace);
      var worldGeometry = buildMergedVoxelFaceWorldGeometry(descriptor);
      var worldPts = Array.isArray(worldGeometry && worldGeometry.worldPts) ? worldGeometry.worldPts : [];
      var worldLoops = Array.isArray(worldGeometry && worldGeometry.worldLoops) ? worldGeometry.worldLoops : null;
      var worldOutlineSegments = Array.isArray(worldGeometry && worldGeometry.worldOutlineSegments) ? worldGeometry.worldOutlineSegments : null;
      var terrainBoundarySegmentsWorld = buildTerrainTopBoundarySegmentsWorldFromDescriptor(descriptor, chunkOcc);
      if (!worldPts.length) {
        step1PrepareFaceInputsMs += Math.max(0, perfNow() - prepareFaceInputsStartAt);
        continue;
      }
      step1PrepareFaceInputsMs += Math.max(0, perfNow() - prepareFaceInputsStartAt);
      var sortKey = Number(descriptor.sortKey || 0);
      var tie = Number(descriptor.tie || 0);
      var buildRenderableBaseStartAt = perfNow();
      var terrainLoopSignature = buildTerrainPolygonLoopSignature(descriptor);
      var packetIdentity = staticWorldPacketOrdering.buildStaticWorldPacketIdentity(descriptor, {
        cell: cell,
        semanticFace: semanticFace,
        screenFace: screenFace,
        terrainLoopSignature: terrainLoopSignature
      });
      var packetId = String(packetIdentity && packetIdentity.packetId || 'voxel-missing::' + semanticFace);
      var faceKey = String(packetIdentity && packetIdentity.faceKey || 'unknown|missing|' + semanticFace + '|' + screenFace);
      step2BuildRenderableBaseMs += Math.max(0, perfNow() - buildRenderableBaseStartAt);
      var styleOrMaterialStartAt = perfNow();
      var terrainPatternDescriptor = getTerrainMaterialPatternDescriptorForRenderCell(cell, semanticFace);
      var terrainFc = getTerrainMaterialBaseFaceColorsForRenderCell(cell);
      var fc = terrainFc || getCachedBaseFaceColorsForRenderable((cell && cell.base) || '#7aa2f7');
      var stroke = terrainPatternDescriptor && terrainPatternDescriptor.lineColor ? terrainPatternDescriptor.lineColor : fc.line;
      var texture = null;
      var textureColor = null;
      var semanticTextureSlot = null;
      var semanticTextureSlotColor = null;
      step3BuildStyleOrMaterialMs += Math.max(0, perfNow() - styleOrMaterialStartAt);
      var buildColorStartAt = perfNow();
      var terrainSettingsForStep4 = getTerrainRenderSettingsForRender();
      var lightingActiveForStep4 = isStaticRenderableLightingActiveForBuild(terrainSettingsForStep4);
      colorBuildStats.usedLightingSignature = lightingActiveForStep4;
      colorBuildStats.lightingEnabledUi = isStaticRenderableLightingUiEnabledForBuild();
      var cachedFillResult = getCachedStaticRenderableFill(cell, semanticFace, worldPts, normal, currentViewRotation, colorBuildStats);
      var assignStartAt = perfNow();
      var fill = cachedFillResult.fill;
      var shadowOverlaysWorld = [];
      var suppressMergedTerrainTopShadows = !!(descriptor && descriptor.isTerrainFaceMergeCandidate === true && String(semanticFace || 'top') === 'top' && Array.isArray(worldLoops) && worldLoops.length > 0);
      if (lightingActiveForStep4 && !suppressMergedTerrainTopShadows) shadowOverlaysWorld = buildVoxelFaceShadowWorldOverlays(worldPts, normal, cell.instanceId || null, colorBuildStats);
      else colorBuildStats.shadowOverlaySkippedByLightingOff = true;
      colorBuildStats.step4h_fillAndOverlayAssignMs += Math.max(0, perfNow() - assignStartAt);
      step4BuildColorMs += Math.max(0, perfNow() - buildColorStartAt);
      var objectAllocationStartAt = perfNow();
      if (descriptor && descriptor.isTerrainFaceMergeCandidate === true) terrainPacketCount += 1;
      var packet = {
        id: packetId,
        kind: 'static-world-face-packet',
        sortKey: sortKey,
        tie: tie,
        instanceId: cell.instanceId || null,
        prefabId: cell.prefabId || null,
        renderPath: 'static-world-chunk-packet',
        cacheViewRotation: currentViewRotation,
        cacheContentType: 'world-face-packets',
        cameraIndependent: true,
        usesScreenSpaceCache: false,
        semanticFace: semanticFace,
        screenFace: screenFace,
        depthKey: descriptor.depthKey != null ? descriptor.depthKey : 0,
        fill: fill,
        stroke: stroke,
        texture: texture,
        textureColor: textureColor,
        semanticTextureSlot: semanticTextureSlot,
        semanticTextureSlotColor: semanticTextureSlotColor,
        width: 1,
        worldPts: worldPts,
        worldLoops: worldLoops,
        worldOutlineSegments: worldOutlineSegments,
        terrainBoundarySegmentsWorld: terrainBoundarySegmentsWorld,
        terrainBoundaryStroke: stroke,
        terrainBoundaryStrokeWidth: terrainBoundarySegmentsWorld.length ? 2.6 : 0,
        shadowOverlaysWorld: shadowOverlaysWorld,
        box: cell || null,
        cellX: Number(cell.x || 0),
        cellY: Number(cell.y || 0),
        cellZ: Number(cell.z || 0),
        faceKey: faceKey,
        actorInteractionMemberFaceKeys: buildActorInteractionMemberFaceKeysFromFaceDescriptor(descriptor, currentViewRotation),
        actorInteractionMemberDescriptors: getActorInteractionMemberDescriptorsFromFaceDescriptor(descriptor),
        packetNormal: normal,
        mergedFace: descriptor.merged === true,
        mergedFaceCount: Number(descriptor.memberCount || 1),
        mergeWidth: Number(descriptor.mergeWidth || 1),
        mergeHeight: Number(descriptor.mergeHeight || 1),
        terrainMaterialMergeKey: descriptor.terrainMaterialMergeKey || null,
        terrainMaterialId: getTerrainMaterialIdForRenderCell(cell),
        terrainMaterialLabel: terrainPatternDescriptor && terrainPatternDescriptor.label ? terrainPatternDescriptor.label : null,
        materialType: cell && (cell.materialType || cell.terrainBand) ? String(cell.materialType || cell.terrainBand) : null,
        terrainPatternDescriptor: terrainPatternDescriptor || null,
        terrainPatternOpacity: terrainPatternDescriptor && Number.isFinite(Number(terrainPatternDescriptor.opacity)) ? Number(terrainPatternDescriptor.opacity) : null
      };
      step6ObjectAllocationMs += Math.max(0, perfNow() - objectAllocationStartAt);
      var arrayPushStartAt = perfNow();
      packets.push(packet);
      step7ArrayPushMs += Math.max(0, perfNow() - arrayPushStartAt);
    }
    var step5BuildPacketsMs = Math.max(0, perfNow() - packetBuildStartAt);
    var staticRenderableBuildStartAt = perfNow();
    var finalizeRenderableListStartAt = perfNow();
    var packetOrderResult = staticWorldPacketOrdering.sortStaticWorldPackets(packets, {
      compareRenderablesByDomain: compareRenderablesByDomain,
      perfNow: perfNow
    });
    step8FinalizeRenderableListMs += Number(packetOrderResult && packetOrderResult.sortMs || 0);
    var step6BuildStaticRenderablesMs = Math.max(0, perfNow() - staticRenderableBuildStartAt);
    var step7SortRenderablesMs = Number(step8FinalizeRenderableListMs.toFixed(3));
    var sortStartAt = perfNow();
    var finalizeStartAt = perfNow();
    var totalStaticRenderableBuildMs = Math.max(0, perfNow() - staticRenderableBuildProfileStartAt);
    var staticRenderableBuildMs = Number(totalStaticRenderableBuildMs.toFixed(3));
    var visibleFaceCountAfterCull = Number(surfaceCache.visibleTopFaceCount || 0) + Number(surfaceCache.visibleSideFaceCount || 0);
    var logicalVoxelCountEstimated = Number(surfaceCache.logicalVoxelCountEstimated || chunkBoxes.length || 0);
    var candidateFacesPerVoxel = cameraScope.surfaceOnlyRenderingEnabled !== false ? 3 : 5;
    var exposedFaceCountBeforeCull = Math.max(visibleFaceCountAfterCull, logicalVoxelCountEstimated * candidateFacesPerVoxel);
    var chunkBounds = chunk && chunk.bounds ? chunk.bounds : null;
    var overlappedBoxCount = 0;
    for (var nb = 0; nb < neighborBoxes.length; nb++) {
      var nbox = neighborBoxes[nb];
      if (!nbox || !chunkBounds) continue;
      var nMinX = Number(nbox.x || 0);
      var nMinY = Number(nbox.y || 0);
      var nMaxX = nMinX + Math.max(1, Number(nbox.w) || 1);
      var nMaxY = nMinY + Math.max(1, Number(nbox.d) || 1);
      if (nMinX < chunkBounds.maxX && nMaxX > chunkBounds.minX && nMinY < chunkBounds.maxY && nMaxY > chunkBounds.minY) overlappedBoxCount += 1;
    }
    var columnSet = new Set();
    for (var cb = 0; cb < chunkBoxes.length; cb++) {
      var cbox = chunkBoxes[cb];
      if (!cbox) continue;
      var w = Math.max(1, Number(cbox.w) || 1);
      var d = Math.max(1, Number(cbox.d) || 1);
      for (var dx = 0; dx < w; dx++) {
        for (var dy = 0; dy < d; dy++) columnSet.add(String(Number(cbox.x || 0) + dx) + ',' + String(Number(cbox.y || 0) + dy));
      }
    }
    var step8FinalizeChunkCacheMs = Math.max(0, perfNow() - finalizeStartAt);
    var totalChunkBuildMs = Math.max(0, perfNow() - chunkBuildStartAt);
    var touchedChunkKeys = Array.isArray(opts.touchedChunkKeys) ? opts.touchedChunkKeys.slice() : [chunk && chunk.key ? String(chunk.key) : null].filter(Boolean);
    var scopePayload = {
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      localBoxCount: Number(chunkBoxes.length || 0),
      scannedBoxCount: Number(chunkBoxes.length + neighborBoxes.length || 0),
      scannedChunkCount: Number(touchedChunkKeys.length || 0),
      touchedChunkKeys: touchedChunkKeys,
      touchedGlobalOccupancy: usedGlobalOccupancy === true,
      touchedGlobalRenderableList: false,
      touchedGlobalSurfacePass: false,
      isChunkLocalOnly: usedLocalOccupancyFallback === true
    };
    emitChunkRebuildScopeVerify(scopePayload);
    var detailPayload = {
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      localBoxCount: Number(chunkBoxes.length || 0),
      neighborBoxCount: Number(neighborBoxes.length || 0),
      overlappedBoxCount: Number(overlappedBoxCount || 0),
      uniqueColumnCount: Number(columnSet.size || 0),
      exposedFaceCountBeforeCull: Number(exposedFaceCountBeforeCull || 0),
      visibleFaceCountAfterCull: Number(visibleFaceCountAfterCull || 0),
      staticRenderableCount: Number(packets.length || 0),
      packetCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      faceMergeMode: faceMergeMode,
      faceMergeFallbackReason: faceMergeFallbackReason,
      terrainInputFaceDescriptorCount: Number(terrainInputFaceDescriptorCount || 0),
      terrainMergedFaceDescriptorCount: Number(terrainMergedFaceDescriptorCount || 0),
      terrainMergedStaticFaceCount: Number(terrainMergedStaticFaceCount || 0),
      terrainMergeReductionRatio: Number(terrainMergeReductionRatio || 0),
      terrainSideInputFaceDescriptorCount: Number(terrainSideInputFaceDescriptorCount || 0),
      terrainSideMergedFaceDescriptorCount: Number(terrainSideMergedFaceDescriptorCount || 0),
      terrainSideMergedStaticFaceCount: Number(terrainSideMergedStaticFaceCount || 0),
      terrainSideMergeReductionRatio: Number(terrainSideMergeReductionRatio || 0),
      terrainSideStepBreakCount: Number(terrainSideStepBreakCount || 0),
      terrainMergeFaceDescriptorsMs: Number(terrainMergeFaceDescriptorsMs.toFixed(3)),
      terrainFaceMergeMode: terrainFaceMergeMode,
      terrainFaceMergeFallbackReason: terrainFaceMergeFallbackReason,
      terrainPacketCount: Number(terrainPacketCount || 0),
      occupancyAccessMode: occupancyAccessMode,
      usedGlobalOccupancy: usedGlobalOccupancy === true,
      usedLocalOccupancyFallback: usedLocalOccupancyFallback === true,
      occupancyFallbackReason: occupancyFallbackReason,
      occupancyValidationSampleCount: occupancyValidationSampleCount,
      step1_collectChunkBoxesMs: Number(step1CollectChunkBoxesMs.toFixed(3)),
      step2_collectNeighborBoxesMs: Number(step2CollectNeighborBoxesMs.toFixed(3)),
      step3_resolveOccupancyMs: Number(step3ResolveOccupancyMs.toFixed(3)),
      step3_buildLocalOccupancyMs: Number(step3BuildLocalOccupancyMs.toFixed(3)),
      step4_computeVisibleFacesMs: Number(step4ComputeVisibleFacesMs.toFixed(3)),
      step5_buildPacketsMs: Number(step5BuildPacketsMs.toFixed(3)),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
      step6_buildStaticRenderablesMs: Number(step6BuildStaticRenderablesMs.toFixed(3)),
      step7_sortRenderablesMs: Number(step7SortRenderablesMs.toFixed(3)),
      step8_finalizeChunkCacheMs: Number(step8FinalizeChunkCacheMs.toFixed(3)),
      totalChunkBuildMs: Number(totalChunkBuildMs.toFixed(3))
    };
    emitChunkRebuildDetail(detailPayload);
    var hotspotThresholdMs = 50;
    if (totalChunkBuildMs >= hotspotThresholdMs) {
      var stepEntries = [
        ['step1_collectChunkBoxesMs', step1CollectChunkBoxesMs],
        ['step2_collectNeighborBoxesMs', step2CollectNeighborBoxesMs],
        ['step3_resolveOccupancyMs', step3ResolveOccupancyMs],
        ['step3_buildLocalOccupancyMs', step3BuildLocalOccupancyMs],
        ['step4_computeVisibleFacesMs', step4ComputeVisibleFacesMs],
        ['step5_buildPacketsMs', step5BuildPacketsMs],
        ['step6_buildStaticRenderablesMs', step6BuildStaticRenderablesMs],
        ['step7_sortRenderablesMs', step7SortRenderablesMs],
        ['step8_finalizeChunkCacheMs', step8FinalizeChunkCacheMs]
      ].sort(function (a, b) { return Number(b[1] || 0) - Number(a[1] || 0); });
      emitChunkRebuildHotspot({
        terrainBatchId: profileContext.terrainBatchId || null,
        frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
        chunkKey: chunk && chunk.key ? String(chunk.key) : null,
        totalChunkBuildMs: Number(totalChunkBuildMs.toFixed(3)),
        localBoxCount: Number(chunkBoxes.length || 0),
        visibleFaceCountAfterCull: Number(visibleFaceCountAfterCull || 0),
        staticRenderableCount: Number(packets.length || 0),
        packetCount: Number(packets.length || 0),
        inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
        mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
        mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
        mergeReductionRatio: Number(mergeReductionRatio || 0),
        mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        faceMergeMode: faceMergeMode,
        faceMergeFallbackReason: faceMergeFallbackReason,
        terrainInputFaceDescriptorCount: Number(terrainInputFaceDescriptorCount || 0),
        terrainMergedFaceDescriptorCount: Number(terrainMergedFaceDescriptorCount || 0),
        terrainMergedStaticFaceCount: Number(terrainMergedStaticFaceCount || 0),
        terrainMergeReductionRatio: Number(terrainMergeReductionRatio || 0),
        terrainMergeFaceDescriptorsMs: Number(terrainMergeFaceDescriptorsMs.toFixed(3)),
        terrainFaceMergeMode: terrainFaceMergeMode,
        terrainFaceMergeFallbackReason: terrainFaceMergeFallbackReason,
        terrainPacketCount: Number(terrainPacketCount || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      faceMergeMode: faceMergeMode,
      faceMergeFallbackReason: faceMergeFallbackReason,
        dominantStep: String(stepEntries[0] && stepEntries[0][0] || ''),
        dominantStepMs: Number(Number(stepEntries[0] && stepEntries[0][1] || 0).toFixed(3)),
        secondStep: String(stepEntries[1] && stepEntries[1][0] || ''),
        secondStepMs: Number(Number(stepEntries[1] && stepEntries[1][1] || 0).toFixed(3))
      });
    }
    var staticRenderableBuildDetailPayload = {
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      localBoxCount: Number(chunkBoxes.length || 0),
      visibleFaceCount: Number(visibleFaceCountAfterCull || 0),
      inputPacketCount: Number(packets.length || 0),
      step1_prepareFaceInputsMs: Number(step1PrepareFaceInputsMs.toFixed(3)),
      step2_buildRenderableBaseMs: Number(step2BuildRenderableBaseMs.toFixed(3)),
      step3_buildStyleOrMaterialMs: Number(step3BuildStyleOrMaterialMs.toFixed(3)),
      step4_buildColorMs: Number(step4BuildColorMs.toFixed(3)),
      step5_computeSortKeyMs: Number(step5ComputeSortKeyMs.toFixed(3)),
      step6_objectAllocationMs: Number(step6ObjectAllocationMs.toFixed(3)),
      step7_arrayPushMs: Number(step7ArrayPushMs.toFixed(3)),
      step8_finalizeRenderableListMs: Number(step8FinalizeRenderableListMs.toFixed(3)),
      outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
      totalStaticRenderableBuildMs: Number(totalStaticRenderableBuildMs.toFixed(3))
    };
    emitStaticRenderableBuildDetail(staticRenderableBuildDetailPayload);
    emitStaticRenderableBuildScopeVerify({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      localBoxCount: Number(chunkBoxes.length || 0),
      scannedFaceCount: Number(scannedFaceCount || 0),
      scannedRenderableCount: Number(packets.length || 0),
      touchedGlobalRenderableTemplates: touchedGlobalRenderableTemplates === true,
      touchedGlobalStyleCache: touchedGlobalStyleCache === true,
      touchedGlobalMaterialCache: touchedGlobalMaterialCache === true,
      isChunkLocalOnly: true
    });
    if (totalStaticRenderableBuildMs >= hotspotThresholdMs) {
      var renderableStepEntries = [
        ['step1_prepareFaceInputsMs', step1PrepareFaceInputsMs],
        ['step2_buildRenderableBaseMs', step2BuildRenderableBaseMs],
        ['step3_buildStyleOrMaterialMs', step3BuildStyleOrMaterialMs],
        ['step4_buildColorMs', step4BuildColorMs],
        ['step5_computeSortKeyMs', step5ComputeSortKeyMs],
        ['step6_objectAllocationMs', step6ObjectAllocationMs],
        ['step7_arrayPushMs', step7ArrayPushMs],
        ['step8_finalizeRenderableListMs', step8FinalizeRenderableListMs]
      ].sort(function (a, b) { return Number(b[1] || 0) - Number(a[1] || 0); });
      emitStaticRenderableBuildHotspot({
        terrainBatchId: profileContext.terrainBatchId || null,
        frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
        chunkKey: chunk && chunk.key ? String(chunk.key) : null,
        localBoxCount: Number(chunkBoxes.length || 0),
        outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        totalStaticRenderableBuildMs: Number(totalStaticRenderableBuildMs.toFixed(3)),
        dominantStep: String(renderableStepEntries[0] && renderableStepEntries[0][0] || ''),
        dominantStepMs: Number(Number(renderableStepEntries[0] && renderableStepEntries[0][1] || 0).toFixed(3)),
        secondStep: String(renderableStepEntries[1] && renderableStepEntries[1][0] || ''),
        secondStepMs: Number(Number(renderableStepEntries[1] && renderableStepEntries[1][1] || 0).toFixed(3))
      });
    }
    var uniqueColorKeyCount = Number(colorBuildStats.colorKeyUsage.size || 0);
    var avgColorBuildMsPerRenderable = packets.length > 0 ? step4BuildColorMs / packets.length : 0;
    emitColorBuildDetail({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
      colorCacheEnabled: colorBuildStats.colorCacheEnabled === true,
      colorCacheHitCount: Number(colorBuildStats.colorCacheHitCount || 0),
      colorCacheMissCount: Number(colorBuildStats.colorCacheMissCount || 0),
      uniqueColorKeyCount: uniqueColorKeyCount,
      step4_buildColorMs: Number(step4BuildColorMs.toFixed(3)),
      avgColorBuildMsPerRenderable: Number(avgColorBuildMsPerRenderable.toFixed(6))
    });
    emitStep4ColorBuildDetail({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
      colorCacheHitCount: Number(colorBuildStats.colorCacheHitCount || 0),
      colorCacheMissCount: Number(colorBuildStats.colorCacheMissCount || 0),
      shadowOverlayCacheHitCount: Number(colorBuildStats.shadowOverlayCacheHitCount || 0),
      shadowOverlayCacheMissCount: Number(colorBuildStats.shadowOverlayCacheMissCount || 0),
      shadowOverlayTotalCount: Number(colorBuildStats.shadowOverlayTotalCount || 0),
      step4a_colorCacheLookupMs: Number(colorBuildStats.step4a_colorCacheLookupMs.toFixed(3)),
      step4b_colorCacheHitFastPathMs: Number(colorBuildStats.step4b_colorCacheHitFastPathMs.toFixed(3)),
      step4c_colorMissPathMs: Number(colorBuildStats.step4c_colorMissPathMs.toFixed(3)),
      step4d_shadowOverlayTotalMs: Number(colorBuildStats.step4d_shadowOverlayTotalMs.toFixed(3)),
      step4e_shadowOverlayCacheLookupMs: Number(colorBuildStats.step4e_shadowOverlayCacheLookupMs.toFixed(3)),
      step4f_shadowOverlayCollectMs: Number(colorBuildStats.step4f_shadowOverlayCollectMs.toFixed(3)),
      step4g_shadowOverlayCloneMs: Number(colorBuildStats.step4g_shadowOverlayCloneMs.toFixed(3)),
      step4h_fillAndOverlayAssignMs: Number(colorBuildStats.step4h_fillAndOverlayAssignMs.toFixed(3)),
      totalStep4BuildColorMs: Number(step4BuildColorMs.toFixed(3))
    });
    emitStep4ColorBuildScopeVerify({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
      scannedFaceCount: Number(scannedFaceCount || 0),
      colorCacheHitCount: Number(colorBuildStats.colorCacheHitCount || 0),
      colorCacheMissCount: Number(colorBuildStats.colorCacheMissCount || 0),
      shadowOverlayCacheHitCount: Number(colorBuildStats.shadowOverlayCacheHitCount || 0),
      shadowOverlayCacheMissCount: Number(colorBuildStats.shadowOverlayCacheMissCount || 0),
      touchedColorCachePath: colorBuildStats.touchedColorCachePath === true,
      touchedNaturalColorPath: colorBuildStats.touchedNaturalColorPath === true,
      touchedLightingPath: colorBuildStats.touchedLightingPath === true,
      touchedShadowOverlayPath: colorBuildStats.touchedShadowOverlayPath === true,
      touchedProjectedShadowCollector: colorBuildStats.touchedProjectedShadowCollector === true,
      isStep4MostlyLocal: colorBuildStats.touchedProjectedShadowCollector !== true
    });
    var dominantPathEntry = null;
    colorBuildStats.actualColorPathUsedCounts.forEach(function (count, key) {
      if (!dominantPathEntry || Number(count || 0) > Number(dominantPathEntry.count || 0)) dominantPathEntry = { key: key, count: Number(count || 0) };
    });
    var terrainSettingsForBuild = getTerrainRenderSettingsForRender();
    emitBuildColorPathVerify({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      terrainBuildColorMode: String((terrainSettingsForBuild && terrainSettingsForBuild.terrainBuildColorMode) || 'natural'),
      terrainBuildLightingBypass: terrainSettingsForBuild && terrainSettingsForBuild.terrainBuildLightingBypass === true,
      lightingEnabledUi: isStaticRenderableLightingUiEnabledForBuild(),
      actualColorPathUsed: String(dominantPathEntry && dominantPathEntry.key || getStaticRenderableActualColorPathUsed(terrainSettingsForBuild)),
      usedLightingSignature: colorBuildStats.usedLightingSignature === true,
      dominantColorMode: String(dominantPathEntry && dominantPathEntry.key ? String(dominantPathEntry.key).split('+')[0] : getStaticRenderableBuildColorModeForRender(terrainSettingsForBuild))
    });
    emitLightingShadowBypassVerify({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      lightingEnabledUi: isStaticRenderableLightingUiEnabledForBuild(),
      terrainBuildLightingBypass: terrainSettingsForBuild && terrainSettingsForBuild.terrainBuildLightingBypass === true,
      usedLightingSignature: colorBuildStats.usedLightingSignature === true,
      touchedShadowOverlayPath: colorBuildStats.touchedShadowOverlayPath === true,
      touchedProjectedShadowCollector: colorBuildStats.touchedProjectedShadowCollector === true,
      shadowOverlaySkippedByLightingOff: colorBuildStats.shadowOverlaySkippedByLightingOff === true,
      actualColorPathUsed: String(dominantPathEntry && dominantPathEntry.key || getStaticRenderableActualColorPathUsed(terrainSettingsForBuild))
    });
    emitStep4ShadowPathSummary({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      step4_buildColorMs: Number(step4BuildColorMs.toFixed(3)),
      step4d_shadowOverlayTotalMs: Number(colorBuildStats.step4d_shadowOverlayTotalMs.toFixed(3)),
      step4h_fillAndOverlayAssignMs: Number(colorBuildStats.step4h_fillAndOverlayAssignMs.toFixed(3)),
      shadowOverlayCacheHitRate: Number((Number(colorBuildStats.shadowOverlayCacheHitCount || 0) + Number(colorBuildStats.shadowOverlayCacheMissCount || 0)) > 0 ? (Number(colorBuildStats.shadowOverlayCacheHitCount || 0) / (Number(colorBuildStats.shadowOverlayCacheHitCount || 0) + Number(colorBuildStats.shadowOverlayCacheMissCount || 0))).toFixed(6) : '0.000000'),
      shadowOverlayTotalCount: Number(colorBuildStats.shadowOverlayTotalCount || 0)
    });
    emitColorBuildMissBreakdown({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      colorCacheMissCount: Number(colorBuildStats.colorCacheMissCount || 0),
      miss_step1_paletteLookupMs: Number(colorBuildStats.miss_step1_paletteLookupMs.toFixed(3)),
      miss_step2_heightBucketMs: Number(colorBuildStats.miss_step2_heightBucketMs.toFixed(3)),
      miss_step3_materialColorMs: Number(colorBuildStats.miss_step3_materialColorMs.toFixed(3)),
      miss_step4_lightingMixMs: Number(colorBuildStats.miss_step4_lightingMixMs.toFixed(3)),
      miss_step5_cssOrObjectBuildMs: Number(colorBuildStats.miss_step5_cssOrObjectBuildMs.toFixed(3)),
      totalMissPathMs: Number((colorBuildStats.miss_step1_paletteLookupMs + colorBuildStats.miss_step2_heightBucketMs + colorBuildStats.miss_step3_materialColorMs + colorBuildStats.miss_step4_lightingMixMs + colorBuildStats.miss_step5_cssOrObjectBuildMs).toFixed(3))
    });
    if (step4BuildColorMs >= hotspotThresholdMs) {
      var dominantColorEntry = null;
      colorBuildStats.colorKeyUsage.forEach(function (entry) {
        if (!dominantColorEntry || Number(entry && entry.count || 0) > Number(dominantColorEntry && dominantColorEntry.count || 0)) dominantColorEntry = entry;
      });
      var totalColorOps = Number(colorBuildStats.colorCacheHitCount || 0) + Number(colorBuildStats.colorCacheMissCount || 0);
      var colorCacheHitRate = totalColorOps > 0 ? Number(colorBuildStats.colorCacheHitCount || 0) / totalColorOps : 0;
      emitColorBuildHotspot({
        terrainBatchId: profileContext.terrainBatchId || null,
        frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
        chunkKey: chunk && chunk.key ? String(chunk.key) : null,
        dominantColorMode: String(dominantColorEntry && dominantColorEntry.terrainColorMode || ''),
        dominantFaceType: String(dominantColorEntry && dominantColorEntry.dominantFaceType || ''),
        dominantMaterialType: String(dominantColorEntry && dominantColorEntry.dominantMaterialType || ''),
        dominantHeightBucket: Number(dominantColorEntry && dominantColorEntry.dominantHeightBucket != null ? dominantColorEntry.dominantHeightBucket : 0),
        colorCacheHitRate: Number(colorCacheHitRate.toFixed(6)),
        totalColorBuildMs: Number(step4BuildColorMs.toFixed(3))
      });
      var step4Substeps = [
        ['step4a_colorCacheLookupMs', colorBuildStats.step4a_colorCacheLookupMs],
        ['step4b_colorCacheHitFastPathMs', colorBuildStats.step4b_colorCacheHitFastPathMs],
        ['step4c_colorMissPathMs', colorBuildStats.step4c_colorMissPathMs],
        ['step4d_shadowOverlayTotalMs', colorBuildStats.step4d_shadowOverlayTotalMs],
        ['step4e_shadowOverlayCacheLookupMs', colorBuildStats.step4e_shadowOverlayCacheLookupMs],
        ['step4f_shadowOverlayCollectMs', colorBuildStats.step4f_shadowOverlayCollectMs],
        ['step4g_shadowOverlayCloneMs', colorBuildStats.step4g_shadowOverlayCloneMs],
        ['step4h_fillAndOverlayAssignMs', colorBuildStats.step4h_fillAndOverlayAssignMs]
      ].sort(function (a, b) { return Number(b[1] || 0) - Number(a[1] || 0); });
      emitStep4ColorBuildHotspot({
        terrainBatchId: profileContext.terrainBatchId || null,
        frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
        chunkKey: chunk && chunk.key ? String(chunk.key) : null,
        outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        totalStep4BuildColorMs: Number(step4BuildColorMs.toFixed(3)),
        shadowOverlayCacheHitRate: Number((Number(colorBuildStats.shadowOverlayCacheHitCount || 0) + Number(colorBuildStats.shadowOverlayCacheMissCount || 0)) > 0 ? (Number(colorBuildStats.shadowOverlayCacheHitCount || 0) / (Number(colorBuildStats.shadowOverlayCacheHitCount || 0) + Number(colorBuildStats.shadowOverlayCacheMissCount || 0))).toFixed(6) : '0.000000'),
        dominantSubstep: String(step4Substeps[0] && step4Substeps[0][0] || ''),
        dominantSubstepMs: Number(Number(step4Substeps[0] && step4Substeps[0][1] || 0).toFixed(3)),
        secondSubstep: String(step4Substeps[1] && step4Substeps[1][0] || ''),
        secondSubstepMs: Number(Number(step4Substeps[1] && step4Substeps[1][1] || 0).toFixed(3))
      });
    }
    emitChunkRebuildBreakdown({
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      localBoxCount: Number(chunkBoxes.length || 0),
      neighborBoxCount: Number(neighborBoxes.length || 0),
      occupancyBuildMs: Number(occupancyBuildMs.toFixed(3)),
      occupancyAccessMode: occupancyAccessMode,
      usedGlobalOccupancy: usedGlobalOccupancy === true,
      usedLocalOccupancyFallback: usedLocalOccupancyFallback === true,
      occupancyFallbackReason: occupancyFallbackReason,
      visibleSurfaceBuildMs: Number(visibleSurfaceBuildMs.toFixed(3)),
      staticRenderableBuildMs: Number(staticRenderableBuildMs.toFixed(3)),
      terrainInputFaceDescriptorCount: Number(terrainInputFaceDescriptorCount || 0),
      terrainMergedFaceDescriptorCount: Number(terrainMergedFaceDescriptorCount || 0),
      terrainMergedStaticFaceCount: Number(terrainMergedStaticFaceCount || 0),
      terrainMergeReductionRatio: Number(terrainMergeReductionRatio || 0),
      terrainSideInputFaceDescriptorCount: Number(terrainSideInputFaceDescriptorCount || 0),
      terrainSideMergedFaceDescriptorCount: Number(terrainSideMergedFaceDescriptorCount || 0),
      terrainSideMergedStaticFaceCount: Number(terrainSideMergedStaticFaceCount || 0),
      terrainSideMergeReductionRatio: Number(terrainSideMergeReductionRatio || 0),
      terrainSideStepBreakCount: Number(terrainSideStepBreakCount || 0),
      terrainMergeFaceDescriptorsMs: Number(terrainMergeFaceDescriptorsMs.toFixed(3)),
      terrainPacketCount: Number(terrainPacketCount || 0),
      totalChunkBuildMs: Number(totalChunkBuildMs.toFixed(3))
    });
    return {
      packets: packets,
      stats: {
        terrainBatchId: profileContext.terrainBatchId || null,
        frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
        chunkKey: chunk && chunk.key ? String(chunk.key) : null,
        localBoxCount: chunkBoxes.length,
        neighborBoxCount: neighborBoxes.length,
        overlappedBoxCount: Number(overlappedBoxCount || 0),
        uniqueColumnCount: Number(columnSet.size || 0),
        exposedFaceCountBeforeCull: Number(exposedFaceCountBeforeCull || 0),
        visibleFaceCountAfterCull: Number(visibleFaceCountAfterCull || 0),
        packetCount: Number(packets.length || 0),
        inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
        mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
        mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
        mergeReductionRatio: Number(mergeReductionRatio || 0),
        mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        faceMergeMode: faceMergeMode,
        faceMergeFallbackReason: faceMergeFallbackReason,
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      faceMergeMode: faceMergeMode,
      faceMergeFallbackReason: faceMergeFallbackReason,
        structuredBoxCount: chunkBoxes.length,
        renderSourceCountBeforeVisibility: chunkBoxes.length,
        renderSourceCountAfterVisibility: surfaceCells.length,
        logicalVoxelCountEstimated: logicalVoxelCountEstimated,
        visibleTopFaceCount: Number(surfaceCache.visibleTopFaceCount || 0),
        visibleSideFaceCount: Number(surfaceCache.visibleSideFaceCount || 0),
        hiddenInternalSurfaceSkippedCount: Number(surfaceCache.hiddenInternalSurfaceSkippedCount || 0),
        voxelFurnitureProcessedCount: Number(surfaceCache.voxelFurnitureProcessedCount || 0),
        cacheContentType: 'world-face-packets',
        cameraIndependent: true,
        usesScreenSpaceCache: false,
        occupancyAccessMode: occupancyAccessMode,
        usedGlobalOccupancy: usedGlobalOccupancy === true,
        usedLocalOccupancyFallback: usedLocalOccupancyFallback === true,
        occupancyFallbackReason: occupancyFallbackReason,
        occupancyValidationSampleCount: occupancyValidationSampleCount,
        occupancyBuildMs: Number(occupancyBuildMs.toFixed(3)),
        visibleSurfaceBuildMs: Number(visibleSurfaceBuildMs.toFixed(3)),
        staticRenderableBuildMs: Number(staticRenderableBuildMs.toFixed(3)),
        step1_collectChunkBoxesMs: Number(step1CollectChunkBoxesMs.toFixed(3)),
        step2_collectNeighborBoxesMs: Number(step2CollectNeighborBoxesMs.toFixed(3)),
        step3_resolveOccupancyMs: Number(step3ResolveOccupancyMs.toFixed(3)),
        step3_buildLocalOccupancyMs: Number(step3BuildLocalOccupancyMs.toFixed(3)),
        step4_computeVisibleFacesMs: Number(step4ComputeVisibleFacesMs.toFixed(3)),
        step5_buildPacketsMs: Number(step5BuildPacketsMs.toFixed(3)),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        step6_buildStaticRenderablesMs: Number(step6BuildStaticRenderablesMs.toFixed(3)),
        step7_sortRenderablesMs: Number(step7SortRenderablesMs.toFixed(3)),
        step8_finalizeChunkCacheMs: Number(step8FinalizeChunkCacheMs.toFixed(3)),
        step1_prepareFaceInputsMs: Number(step1PrepareFaceInputsMs.toFixed(3)),
        mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        step2_buildRenderableBaseMs: Number(step2BuildRenderableBaseMs.toFixed(3)),
        step3_buildStyleOrMaterialMs: Number(step3BuildStyleOrMaterialMs.toFixed(3)),
        step4_buildColorMs: Number(step4BuildColorMs.toFixed(3)),
        colorCacheEnabled: colorBuildStats.colorCacheEnabled === true,
        colorCacheHitCount: Number(colorBuildStats.colorCacheHitCount || 0),
        colorCacheMissCount: Number(colorBuildStats.colorCacheMissCount || 0),
        uniqueColorKeyCount: Number(colorBuildStats.colorKeyUsage.size || 0),
        avgColorBuildMsPerRenderable: Number((packets.length > 0 ? step4BuildColorMs / packets.length : 0).toFixed(6)),
        terrainBuildColorMode: String((getTerrainRenderSettingsForRender() && getTerrainRenderSettingsForRender().terrainBuildColorMode) || 'natural'),
        terrainBuildLightingBypass: getTerrainRenderSettingsForRender() && getTerrainRenderSettingsForRender().terrainBuildLightingBypass === true,
        miss_step1_paletteLookupMs: Number(colorBuildStats.miss_step1_paletteLookupMs.toFixed(3)),
        miss_step2_heightBucketMs: Number(colorBuildStats.miss_step2_heightBucketMs.toFixed(3)),
        miss_step3_materialColorMs: Number(colorBuildStats.miss_step3_materialColorMs.toFixed(3)),
        miss_step4_lightingMixMs: Number(colorBuildStats.miss_step4_lightingMixMs.toFixed(3)),
        miss_step5_cssOrObjectBuildMs: Number(colorBuildStats.miss_step5_cssOrObjectBuildMs.toFixed(3)),
        step4a_colorCacheLookupMs: Number(colorBuildStats.step4a_colorCacheLookupMs.toFixed(3)),
        step4b_colorCacheHitFastPathMs: Number(colorBuildStats.step4b_colorCacheHitFastPathMs.toFixed(3)),
        step4c_colorMissPathMs: Number(colorBuildStats.step4c_colorMissPathMs.toFixed(3)),
        step4d_shadowOverlayTotalMs: Number(colorBuildStats.step4d_shadowOverlayTotalMs.toFixed(3)),
        step4e_shadowOverlayCacheLookupMs: Number(colorBuildStats.step4e_shadowOverlayCacheLookupMs.toFixed(3)),
        step4f_shadowOverlayCollectMs: Number(colorBuildStats.step4f_shadowOverlayCollectMs.toFixed(3)),
        step4g_shadowOverlayCloneMs: Number(colorBuildStats.step4g_shadowOverlayCloneMs.toFixed(3)),
        step4h_fillAndOverlayAssignMs: Number(colorBuildStats.step4h_fillAndOverlayAssignMs.toFixed(3)),
        shadowOverlayCacheHitCount: Number(colorBuildStats.shadowOverlayCacheHitCount || 0),
        shadowOverlayCacheMissCount: Number(colorBuildStats.shadowOverlayCacheMissCount || 0),
        shadowOverlayTotalCount: Number(colorBuildStats.shadowOverlayTotalCount || 0),
        step5_computeSortKeyMs: Number(step5ComputeSortKeyMs.toFixed(3)),
        step6_objectAllocationMs: Number(step6ObjectAllocationMs.toFixed(3)),
        step7_arrayPushMs: Number(step7ArrayPushMs.toFixed(3)),
        step8_finalizeRenderableListMs: Number(step8FinalizeRenderableListMs.toFixed(3)),
        scannedFaceCount: Number(scannedFaceCount || 0),
        scannedRenderableCount: Number(packets.length || 0),
        touchedGlobalRenderableTemplates: touchedGlobalRenderableTemplates === true,
        touchedGlobalStyleCache: touchedGlobalStyleCache === true,
        touchedGlobalMaterialCache: touchedGlobalMaterialCache === true,
        touchedColorCachePath: colorBuildStats.touchedColorCachePath === true,
        touchedNaturalColorPath: colorBuildStats.touchedNaturalColorPath === true,
        touchedLightingPath: colorBuildStats.touchedLightingPath === true,
        touchedShadowOverlayPath: colorBuildStats.touchedShadowOverlayPath === true,
        touchedProjectedShadowCollector: colorBuildStats.touchedProjectedShadowCollector === true,
        totalStaticRenderableBuildMs: Number(totalStaticRenderableBuildMs.toFixed(3)),
        scannedBoxCount: Number(chunkBoxes.length + neighborBoxes.length || 0),
        scannedChunkCount: Number(touchedChunkKeys.length || 0),
        touchedChunkKeys: touchedChunkKeys,
        touchedGlobalOccupancy: usedGlobalOccupancy === true,
        touchedGlobalRenderableList: false,
        touchedGlobalSurfacePass: false,
        isChunkLocalOnly: usedLocalOccupancyFallback === true,
        finalRenderableCount: packets.length,
        totalChunkBuildMs: Number(totalChunkBuildMs.toFixed(3))
      }
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    buildStaticWorldChunkRenderables: buildStaticWorldChunkRenderables,
    summarizeBoundary: function () {
      return { owner: OWNER, phase: PHASE, layer: 'application/render', input: 'world chunk + render hooks', output: 'static world renderable packets', forbidden: ['ctx', 'canvas', 'document', 'Image', 'localStorage', 'fetch'] };
    }
  };

  try {
    global.__STATIC_WORLD_RENDERABLE_BUILDER__ = api;
    global.__APP_APPLICATION_STATIC_WORLD_RENDERABLE_BUILDER__ = api;
    global.IsometricStaticWorldRenderableBuilder = api;
    global.App = global.App || {};
    global.App.application = global.App.application || {};
    global.App.application.render = global.App.application.render || {};
    global.App.application.render.staticWorldRenderableBuilder = api;
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
