(function (global) {
  if (!global) return;

  var OWNER = 'src/application/controllers/terrain-generation-controller.js';
  var PHASE = 'P11b-6-TERRAIN-GENERATION-CONTROLLER';

  function asObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function call(fn, fallback) {
    if (typeof fn !== 'function') return fallback;
    try { return fn(); } catch (_) { return fallback; }
  }

  function notifyTerrainSceneChanged(deps) {
    var fn = deps && deps.notifyTerrainSceneChanged;
    if (typeof fn !== 'function') return false;
    try { fn(); return true; } catch (_) { return false; }
  }

  function createTerrainGenerationController(deps) {
    var d = asObject(deps);

    function generateMainEditorTerrain(source) {
      var requestSource = String(source || 'terrain:generate');
      if (typeof d.cancelPendingTerrainApplyJob === 'function') d.cancelPendingTerrainApplyJob(requestSource + ':cancel-pending');
      var terrainCore = call(d.getTerrainGeneratorCoreApi, null);
      if (!terrainCore || typeof terrainCore.generateHeightMap !== 'function' || typeof terrainCore.heightMapToVoxelStacks !== 'function') {
        return { ok: false, reason: 'missing-terrain-generator-core' };
      }
      var terrainProfileStartAt = d.controllerPerfNowMs();
      var terrainProfile = {
        terrainBatchId: null,
        width: 0,
        height: 0,
        heightMapCellCount: 0,
        terrainPlacementPlanLength: 0,
        terrainGeneratedInstanceCount: 0,
        survivorsCount: 0,
        existingInstanceCountBefore: 0,
        existingBoxCountBefore: 0,
        finalInstanceCountAfter: 0,
        finalBoxCountAfter: 0,
        timings: {
          buildHeightMapMs: 0,
          buildOccupancySummaryMs: 0,
          buildPlacementPlanMs: 0,
          buildTerrainInstancesMs: 0,
          clearLegacyCommitMs: 0,
          sceneCommitMs: 0,
          totalMs: 0
        }
      };
      var currentSettings = d.getMainEditorTerrainSettings(requestSource);
      var runtimeApi = call(d.getRuntimeStateApi, null);
      var sceneSessionApi = call(d.getSceneSessionApi, null);
      var gridW = runtimeApi && runtimeApi.settings ? Number(runtimeApi.settings.gridW || runtimeApi.settings.worldCols || currentSettings.width || 1) : Number(currentSettings.width || 1);
      var gridH = runtimeApi && runtimeApi.settings ? Number(runtimeApi.settings.gridH || runtimeApi.settings.worldRows || currentSettings.height || 1) : Number(currentSettings.height || 1);
      var requestedParams = Object.assign({}, currentSettings, {
        width: Math.max(1, Math.min(Math.round(Number(currentSettings.width) || 1), Math.max(1, Math.round(gridW) || 1))),
        height: Math.max(1, Math.min(Math.round(Number(currentSettings.height) || 1), Math.max(1, Math.round(gridH) || 1)))
      });
      var normalizedParams = terrainCore.normalizeTerrainParams ? terrainCore.normalizeTerrainParams(requestedParams) : requestedParams;
      terrainProfile.width = Number(normalizedParams.width || 0);
      terrainProfile.height = Number(normalizedParams.height || 0);
      d.emitTerrainGeneratorParamsDiagnostic(normalizedParams);
      var current = d.readCurrentSceneInstances();
      terrainProfile.existingInstanceCountBefore = Number(current.length || 0);
      terrainProfile.existingBoxCountBefore = Number(sceneSessionApi && typeof sceneSessionApi.getBoxes === 'function'
        ? ((sceneSessionApi.getBoxes() || []).length)
        : ((d.readCurrentSceneBoxes() || []).length));
      var buildHeightMapStartAt = d.controllerPerfNowMs();
      var generated = terrainCore.generateHeightMap(normalizedParams);
      var terrainMaterialMap = d.buildTerrainMaterialMapForApply(generated && generated.heightMap, normalizedParams);
      if (generated && typeof generated === 'object') generated.materialMap = terrainMaterialMap;
      var stacks = terrainCore.heightMapToVoxelStacks(generated);
      terrainProfile.timings.buildHeightMapMs = Number(Math.max(0, d.controllerPerfNowMs() - buildHeightMapStartAt).toFixed(3));
      terrainProfile.heightMapCellCount = Number((Array.isArray(generated && generated.heightMap) ? generated.heightMap.length : 0) && Array.isArray(generated && generated.heightMap && generated.heightMap[0])
        ? (generated.heightMap.length * generated.heightMap[0].length)
        : (normalizedParams.width * normalizedParams.height));
      var isTerrainGeneratedInstance = typeof d.isTerrainGeneratedInstance === 'function' ? d.isTerrainGeneratedInstance : function () { return false; };
      var survivors = current.filter(function (inst) { return !isTerrainGeneratedInstance(inst); });
      terrainProfile.survivorsCount = Number(survivors.length || 0);
      var clearLegacyCommitStartAt = d.controllerPerfNowMs();
      d.replaceCurrentSceneInstances(survivors, requestSource + ':clear-legacy');
      terrainProfile.timings.clearLegacyCommitMs = Number(Math.max(0, d.controllerPerfNowMs() - clearLegacyCommitStartAt).toFixed(3));
      var manualBoxes = (d.getManualTerrainGenerationBoxes() || []);
      var occupancySummaryStartAt = d.controllerPerfNowMs();
      var occupancySummary = d.buildManualColumnHeightMapFromBoxes(manualBoxes, normalizedParams.width, normalizedParams.height);
      var worldIntegration = d.summarizeTerrainWorldIntegration(generated.heightMap, occupancySummary.existingHeightMap);
      terrainProfile.timings.buildOccupancySummaryMs = Number(Math.max(0, d.controllerPerfNowMs() - occupancySummaryStartAt).toFixed(3));
      var batchId = d.allocateTerrainBatchId(requestSource);
      terrainProfile.terrainBatchId = batchId;
      var terrainRuntime = d.getTerrainRuntimeModel();
      var buildPlacementPlanStartAt = d.controllerPerfNowMs();
      var terrainPlacementPlan = d.buildTerrainPlacementPlan(generated.heightMap, occupancySummary.existingHeightMap);
      terrainProfile.timings.buildPlacementPlanMs = Number(Math.max(0, d.controllerPerfNowMs() - buildPlacementPlanStartAt).toFixed(3));
      terrainProfile.terrainPlacementPlanLength = Number(terrainPlacementPlan.length || 0);
      terrainProfile.terrainGeneratedInstanceCount = Number(terrainPlacementPlan.length || 0);
      var summary = {
        generatedCellCount: stacks.generatedCellCount,
        generatedVoxelCount: terrainPlacementPlan.length,
        appliedVoxelCount: 0,
        applyInProgress: terrainPlacementPlan.length > 0,
        minHeightObserved: generated.minHeightObserved,
        maxHeightObserved: generated.maxHeightObserved,
        avgHeightObserved: generated.avgHeightObserved,
        terrainBatchId: batchId,
        terrainOwnedDeltaBlockCount: worldIntegration.terrainOwnedDeltaBlockCount,
        existingManualBlockCount: occupancySummary.manualBlockCount,
        overlappingColumnCount: worldIntegration.overlappingColumnCount
      };
      var survivorsBoxes = d.readCurrentSceneBoxes();
      d.applyTerrainRuntimeModel({
        activeTerrainBatchId: batchId,
        width: normalizedParams.width,
        height: normalizedParams.height,
        heightMap: generated.heightMap,
        existingHeightMap: occupancySummary.existingHeightMap,
        materialMap: terrainMaterialMap,
        editDiff: {},
        params: normalizedParams,
        lastSummary: summary,
        terrainUsesColumnModel: false,
        terrainExpandedVoxelInstanceCount: 0,
        terrainOwnedDeltaBlockCount: worldIntegration.terrainOwnedDeltaBlockCount,
        existingManualBlockCount: occupancySummary.manualBlockCount,
        overlappingColumnCount: worldIntegration.overlappingColumnCount,
        mergedWithExistingOccupancy: true,
        stackedOnExistingBlocks: worldIntegration.stackedOnExistingBlocks,
        chunkSize: 16,
        dirtyChunkKeys: [],
        terrainChunkCacheVersion: Number((terrainRuntime && terrainRuntime.terrainChunkCacheVersion) || 0) + 1
      }, requestSource + ':runtime-model');
      d.applyTerrainBatchState({ activeTerrainBatchId: batchId, lastSummary: summary }, requestSource + ':runtime');
      d.beginTerrainApplyJob({
        batchId: batchId,
        source: requestSource,
        normalizedParams: normalizedParams,
        generated: generated,
        occupancySummary: occupancySummary,
        worldIntegration: worldIntegration,
        terrainPlacementPlan: terrainPlacementPlan,
        survivors: survivors,
        survivorsBoxes: survivorsBoxes,
        appliedInstances: [],
        appliedBoxes: [],
        nextPlanIndex: 0,
        nextBoxId: 1,
        semanticMeta: d.buildTerrainInstanceSemanticMetadata(normalizedParams),
        batchSize: d.getTerrainApplyBatchInstanceCountForAppControllers(),
        summary: summary,
        startedAt: terrainProfileStartAt,
        materializeMsTotal: 0,
        sceneCommitMsTotal: terrainProfile.timings.clearLegacyCommitMs,
        profile: terrainProfile
      });
      d.emitTerrainWorldIntegrationSummaryDiagnostic(batchId, worldIntegration, occupancySummary);
      d.emitTerrainLogicSummaryDiagnostic(normalizedParams, stacks, terrainPlacementPlan);
      d.emitTerrainPlacementUnificationCheckDiagnostic(batchId, terrainPlacementPlan);
      d.emitTerrainDebugFaceUnificationCheckDiagnostic(batchId, normalizedParams);
      d.emitTerrainCameraUnificationCheckDiagnostic(batchId);
      d.emitSharedRenderOptimizationCheckDiagnostic(batchId);
      d.emitTerrainGeneratorSummaryDiagnostic(summary);
      d.emitTerrainGeneratorApplyDiagnostic(batchId, terrainPlacementPlan);
      terrainProfile.timings.totalMs = Number(Math.max(0, d.controllerPerfNowMs() - terrainProfileStartAt).toFixed(3));
      d.emitTerrainGenerateProfile(Object.assign({}, terrainProfile, {
        finalInstanceCountAfter: Number(d.readCurrentSceneInstances().length || 0),
        finalBoxCountAfter: Number(d.readCurrentSceneBoxes().length || 0),
        generateQueued: true
      }));
      notifyTerrainSceneChanged(d);
      return Object.assign({ ok: true }, summary, { terrainInstanceCount: terrainPlacementPlan.length, terrainVoxelCount: terrainPlacementPlan.length, terrainUsesColumnModel: false, applyMode: 'batched' });
    }

    return {
      owner: OWNER,
      phase: PHASE,
      generateMainEditorTerrain: generateMainEditorTerrain
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    createTerrainGenerationController: createTerrainGenerationController
  };

  global.__APP_TERRAIN_GENERATION_CONTROLLER__ = api;

  try {
    var ns = global.__APP_NAMESPACE || null;
    if (ns && typeof ns.bind === 'function') {
      ns.bind('controllers.terrainGeneration', api, { owner: OWNER, legacy: [], phase: PHASE });
      ns.bind('application.terrainGenerationController', api, { owner: OWNER, legacy: [], phase: PHASE });
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
