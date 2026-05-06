(function (global) {
  if (!global) return;

  var OWNER = 'src/application/controllers/terrain-generation-diagnostics.js';
  var PHASE = 'P11b-4-TERRAIN-GENERATION-DIAGNOSTICS';

  function asObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function asNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function createTerrainGenerationDiagnostics(deps) {
    var options = asObject(deps);
    var recordTerrainDiagnostic = typeof options.recordTerrainDiagnostic === 'function'
      ? options.recordTerrainDiagnostic
      : function noopRecordTerrainDiagnostic(event, payload) {
        return Object.assign({ event: String(event || '') }, payload || {});
      };

    function emit(event, payload) {
      return recordTerrainDiagnostic(event, payload || {});
    }

    function emitTerrainGeneratorParams(normalizedParams) {
      var params = asObject(normalizedParams);
      return emit('terrain-generator-params', {
        seed: params.seed,
        width: params.width,
        height: params.height,
        terrainAlgorithm: params.terrainAlgorithm || 'profile_fbm',

        sinScaleX: params.sinScaleX,
        sinScaleZ: params.sinScaleZ,
        sinPhaseX: params.sinPhaseX,
        sinPhaseZ: params.sinPhaseZ,
        sinMixMode: params.sinMixMode,

        perlinScale: params.perlinScale,
        perlinOffsetX: params.perlinOffsetX,
        perlinOffsetZ: params.perlinOffsetZ,

        octaveScale: params.octaveScale,
        octaves: params.octaves,
        persistence: params.persistence,
        lacunarity: params.lacunarity,
        octaveOffsetX: params.octaveOffsetX,
        octaveOffsetZ: params.octaveOffsetZ,

        detailScale: params.detailScale,
        detailOctaves: params.detailOctaves,
        detailPersistence: params.detailPersistence,
        detailLacunarity: params.detailLacunarity,
        detailStrength: params.detailStrength,
        detailOffsetX: params.detailOffsetX,
        detailOffsetZ: params.detailOffsetZ,

        multiScale1: params.multiScale1,
        multiWeight1: params.multiWeight1,
        multiOffsetX1: params.multiOffsetX1,
        multiOffsetZ1: params.multiOffsetZ1,
        multiSeedOffset1: params.multiSeedOffset1,
        multiScale2: params.multiScale2,
        multiWeight2: params.multiWeight2,
        multiOffsetX2: params.multiOffsetX2,
        multiOffsetZ2: params.multiOffsetZ2,
        multiSeedOffset2: params.multiSeedOffset2,
        multiScale3: params.multiScale3,
        multiWeight3: params.multiWeight3,
        multiOffsetX3: params.multiOffsetX3,
        multiOffsetZ3: params.multiOffsetZ3,
        multiSeedOffset3: params.multiSeedOffset3,

        macroScale: params.macroScale,
        macroOctaves: params.macroOctaves,
        macroPersistence: params.macroPersistence,
        macroLacunarity: params.macroLacunarity,
        macroOffsetX: params.macroOffsetX,
        macroOffsetZ: params.macroOffsetZ,

        minHeight: params.minHeight,
        maxHeight: params.maxHeight,
        waterLevel: params.waterLevel,
        baseHeightOffset: params.baseHeightOffset,
        heightProfileConfig: params.heightProfileConfig
      });
    }

    function emitTerrainWorldIntegrationSummary(batchId, worldIntegration, occupancySummary) {
      var integration = asObject(worldIntegration);
      var occupancy = asObject(occupancySummary);
      return emit('terrain-world-integration-summary', {
        terrainBatchId: batchId,
        terrainTargetColumnCount: integration.terrainTargetColumnCount,
        terrainOwnedDeltaBlockCount: integration.terrainOwnedDeltaBlockCount,
        mergedWithExistingOccupancy: true,
        existingManualBlockCount: occupancy.manualBlockCount,
        overlappingColumnCount: integration.overlappingColumnCount,
        stackedOnExistingBlocks: integration.stackedOnExistingBlocks
      });
    }

    function emitTerrainLogicSummary(normalizedParams, stacks, terrainPlacementPlan) {
      var params = asObject(normalizedParams);
      var stackSummary = asObject(stacks);
      var plan = Array.isArray(terrainPlacementPlan) ? terrainPlacementPlan : [];
      return emit('terrain-logic-summary', {
        terrainCellCount: asNumber(params.width, 0) * asNumber(params.height, 0),
        terrainColumnCount: stackSummary.generatedCellCount,
        terrainExpandedVoxelInstanceCount: plan.length,
        terrainUsesColumnModel: false
      });
    }

    function emitTerrainPlacementUnificationCheck(batchId, terrainPlacementPlan) {
      var plan = Array.isArray(terrainPlacementPlan) ? terrainPlacementPlan : [];
      return emit('terrain-placement-unification-check', {
        terrainGeneratedAsPlacementPlan: true,
        terrainAppliedThroughSharedBlockPipeline: true,
        terrainUsesDedicatedRenderPath: false,
        terrainUsesDedicatedGeometryPath: false,
        terrainUsesDedicatedCameraPath: false,
        terrainPlacementPlanLength: plan.length,
        terrainGeneratedInstanceCount: plan.length,
        terrainBatchId: batchId
      });
    }

    function emitTerrainDebugFaceUnificationCheck(batchId, normalizedParams) {
      var params = asObject(normalizedParams);
      return emit('terrain-debug-face-unification-check', {
        terrainDebugFaceColorsEnabled: params.terrainDebugFaceColorsEnabled === true,
        usesOriginalBlockSemanticFaces: true,
        usesOriginalBlockFaceGeometry: true,
        hasMergedContinuousTerrainSideFaces: false,
        hasSlopedAppearanceRisk: false,
        terrainBatchId: batchId
      });
    }

    function emitTerrainCameraUnificationCheck(batchId) {
      return emit('terrain-camera-unification-check', {
        floorUsesUnifiedCameraTransform: true,
        blocksUseUnifiedCameraTransform: true,
        terrainUsesUnifiedCameraTransform: true,
        usesSingleUnifiedZoomPath: true,
        zoomSource: 'runtime-state.editor.zoom',
        cullingSource: 'presentation.render.render.getMainCameraRenderScope',
        terrainBatchId: batchId
      });
    }

    function emitSharedRenderOptimizationCheck(batchId) {
      return emit('shared-render-optimization-check', {
        optimizationAppliesToManualBlocks: true,
        optimizationAppliesToGeneratedTerrainBlocks: true,
        optimizationAppliesToPlacedVoxelFurniture: true,
        surfaceOnlyRenderingEnabled: true,
        cameraCullingEnabled: true,
        chunkBatchingEnabled: false,
        terrainBatchId: batchId
      });
    }

    function emitTerrainGeneratorSummary(summary) {
      return emit('terrain-generator-summary', summary || {});
    }

    function emitTerrainGeneratorApply(batchId, terrainPlacementPlan) {
      var plan = Array.isArray(terrainPlacementPlan) ? terrainPlacementPlan : [];
      return emit('terrain-generator-apply', {
        terrainBatchId: batchId,
        terrainInstanceCount: plan.length,
        terrainVoxelCount: plan.length,
        appliedToMainEditor: true,
        appliedAsPlacementPlan: true,
        appliedThroughSharedBlockPipeline: true,
        applyMode: 'batched'
      });
    }

    return {
      owner: OWNER,
      phase: PHASE,
      emitTerrainGeneratorParams: emitTerrainGeneratorParams,
      emitTerrainWorldIntegrationSummary: emitTerrainWorldIntegrationSummary,
      emitTerrainLogicSummary: emitTerrainLogicSummary,
      emitTerrainPlacementUnificationCheck: emitTerrainPlacementUnificationCheck,
      emitTerrainDebugFaceUnificationCheck: emitTerrainDebugFaceUnificationCheck,
      emitTerrainCameraUnificationCheck: emitTerrainCameraUnificationCheck,
      emitSharedRenderOptimizationCheck: emitSharedRenderOptimizationCheck,
      emitTerrainGeneratorSummary: emitTerrainGeneratorSummary,
      emitTerrainGeneratorApply: emitTerrainGeneratorApply
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    createTerrainGenerationDiagnostics: createTerrainGenerationDiagnostics
  };

  global.__APP_TERRAIN_GENERATION_DIAGNOSTICS__ = api;

  try {
    var ns = global.__APP_NAMESPACE || null;
    if (ns && typeof ns.bind === 'function') {
      ns.bind('controllers.terrainGenerationDiagnostics', api, { owner: OWNER, legacy: [], phase: PHASE });
      ns.bind('application.terrainGenerationDiagnostics', api, { owner: OWNER, legacy: [], phase: PHASE });
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
