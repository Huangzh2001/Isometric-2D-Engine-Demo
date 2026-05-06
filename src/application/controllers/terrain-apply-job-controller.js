(function (global) {
  if (!global) return;

  var OWNER = 'src/application/controllers/terrain-apply-job-controller.js';
  var PHASE = 'P11b-3-TERRAIN-APPLY-JOB';
  var DEFAULT_BATCH_INSTANCE_COUNT = 512;

  function asObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function call(fn, fallback) {
    if (typeof fn !== 'function') return fallback;
    try { return fn(); } catch (_) { return fallback; }
  }

  function getJobMaterialMap(job) {
    return job && job.generated && job.generated.materialMap ? job.generated.materialMap : null;
  }

  function notifyTerrainSceneChanged(deps) {
    var fn = deps && deps.notifyTerrainSceneChanged;
    if (typeof fn !== 'function') return false;
    try { fn(); return true; } catch (_) { return false; }
  }

  function createTerrainApplyJobController(deps) {
    var d = asObject(deps);
    var pendingTerrainApplyJob = null;
    var batchSize = Number(d.batchInstanceCount || DEFAULT_BATCH_INSTANCE_COUNT) || DEFAULT_BATCH_INSTANCE_COUNT;

    function cancelPendingTerrainApplyJob(reason) {
      if (!pendingTerrainApplyJob) return false;
      pendingTerrainApplyJob = null;
      return true;
    }

    function beginTerrainApplyJob(job) {
      pendingTerrainApplyJob = job || null;
      return pendingTerrainApplyJob;
    }

    function finalizePendingTerrainApplyJob(job, source) {
      var sceneSessionApi = call(d.getSceneSessionApi, null);
      var summary = job && job.summary ? Object.assign({}, job.summary, {
        appliedVoxelCount: job.appliedInstances.length,
        applyInProgress: false
      }) : null;
      if (job) {
        var terrainRuntime = call(d.getTerrainRuntimeModel, null);
        d.applyTerrainRuntimeModel({
          activeTerrainBatchId: job.batchId,
          width: job.normalizedParams.width,
          height: job.normalizedParams.height,
          heightMap: job.generated.heightMap,
          existingHeightMap: job.occupancySummary.existingHeightMap,
          materialMap: getJobMaterialMap(job),
          editDiff: {},
          params: job.normalizedParams,
          lastSummary: summary,
          terrainUsesColumnModel: false,
          terrainExpandedVoxelInstanceCount: job.appliedInstances.length,
          terrainOwnedDeltaBlockCount: job.worldIntegration.terrainOwnedDeltaBlockCount,
          existingManualBlockCount: job.occupancySummary.manualBlockCount,
          overlappingColumnCount: job.worldIntegration.overlappingColumnCount,
          mergedWithExistingOccupancy: true,
          stackedOnExistingBlocks: job.worldIntegration.stackedOnExistingBlocks,
          chunkSize: 16,
          dirtyChunkKeys: [],
          terrainChunkCacheVersion: Number((terrainRuntime && terrainRuntime.terrainChunkCacheVersion) || 0) + 1
        }, String(source || job.source || 'terrain:apply-complete') + ':runtime-model');
        d.applyTerrainBatchState({ activeTerrainBatchId: job.batchId, lastSummary: summary }, String(source || job.source || 'terrain:apply-complete') + ':runtime');
        job.profile.terrainGeneratedInstanceCount = Number(job.appliedInstances.length || 0);
        job.profile.finalInstanceCountAfter = Number((d.readCurrentSceneInstances() || []).length || 0);
        job.profile.finalBoxCountAfter = Number(sceneSessionApi && typeof sceneSessionApi.getBoxes === 'function' ? ((sceneSessionApi.getBoxes() || []).length) : (d.readCurrentSceneBoxes() || []).length);
        job.profile.timings.sceneCommitMs = Number(job.sceneCommitMsTotal.toFixed(3));
        job.profile.timings.totalMs = Number(Math.max(0, d.controllerPerfNowMs() - job.startedAt).toFixed(3));
        d.emitTerrainGenerateProfile(job.profile);
        d.recordTerrainDiagnostic('terrain-generator-apply-complete', {
          terrainBatchId: job.batchId,
          appliedTerrainInstanceCount: job.appliedInstances.length,
          plannedTerrainInstanceCount: job.terrainPlacementPlan.length,
          source: source || job.source || 'terrain:apply-complete'
        });
        notifyTerrainSceneChanged(d);
      }
      pendingTerrainApplyJob = null;
      return summary;
    }

    function tickMainEditorTerrainApply(now, source) {
      var job = pendingTerrainApplyJob;
      if (!job) return null;
      var sceneSessionApi = call(d.getSceneSessionApi, null);
      var requestSource = String(source || 'terrain:apply-batch');
      var remaining = Math.max(0, job.terrainPlacementPlan.length - job.nextPlanIndex);
      if (remaining <= 0) return finalizePendingTerrainApplyJob(job, requestSource + ':complete');
      var currentBatchCount = Math.min(job.batchSize || batchSize, remaining);
      var range = sceneSessionApi && typeof sceneSessionApi.allocateBoxIdRange === 'function'
        ? sceneSessionApi.allocateBoxIdRange(currentBatchCount, { source: requestSource + ':allocate-box-range' })
        : { start: job.nextBoxId, count: currentBatchCount };
      var startingBoxId = range && Number.isFinite(Number(range.start)) ? Number(range.start) : job.nextBoxId;
      var materializeStartAt = d.controllerPerfNowMs();
      var built = d.buildTerrainInstancesAndBoxesFromPlacementPlanRange(job.terrainPlacementPlan, job.nextPlanIndex, currentBatchCount, job.batchId, job.normalizedParams, job.generated.heightMap, getJobMaterialMap(job), job.semanticMeta, startingBoxId);
      var materializeMs = Math.max(0, d.controllerPerfNowMs() - materializeStartAt);
      var nextInstances = job.survivors.concat(job.appliedInstances, built.instances);
      var nextBoxes = job.survivorsBoxes.concat(job.appliedBoxes, built.boxes);
      var commitStartAt = d.controllerPerfNowMs();
      d.replaceCurrentSceneGraph(nextInstances, nextBoxes, requestSource + ':scene-graph');
      var commitMs = Math.max(0, d.controllerPerfNowMs() - commitStartAt);
      Array.prototype.push.apply(job.appliedInstances, built.instances);
      Array.prototype.push.apply(job.appliedBoxes, built.boxes);
      job.nextPlanIndex += built.instances.length;
      job.nextBoxId = startingBoxId + built.boxes.length;
      job.materializeMsTotal += materializeMs;
      job.sceneCommitMsTotal += commitMs;
      var appliedCount = job.appliedInstances.length;
      var summary = Object.assign({}, job.summary, {
        appliedVoxelCount: appliedCount,
        applyInProgress: appliedCount < job.terrainPlacementPlan.length
      });
      job.summary = summary;
      d.applyTerrainRuntimeModel({
        activeTerrainBatchId: job.batchId,
        width: job.normalizedParams.width,
        height: job.normalizedParams.height,
        heightMap: job.generated.heightMap,
        existingHeightMap: job.occupancySummary.existingHeightMap,
        materialMap: getJobMaterialMap(job),
        editDiff: {},
        params: job.normalizedParams,
        lastSummary: summary,
        terrainUsesColumnModel: false,
        terrainExpandedVoxelInstanceCount: appliedCount,
        terrainOwnedDeltaBlockCount: job.worldIntegration.terrainOwnedDeltaBlockCount,
        existingManualBlockCount: job.occupancySummary.manualBlockCount,
        overlappingColumnCount: job.worldIntegration.overlappingColumnCount,
        mergedWithExistingOccupancy: true,
        stackedOnExistingBlocks: job.worldIntegration.stackedOnExistingBlocks,
        chunkSize: 16,
        dirtyChunkKeys: []
      }, requestSource + ':runtime-model');
      d.applyTerrainBatchState({ activeTerrainBatchId: job.batchId, lastSummary: summary }, requestSource + ':runtime');
      if (d.isDetailedTerrainProfilingEnabledForController()) {
        d.recordTerrainDiagnostic('terrain-generator-apply-batch', {
          terrainBatchId: job.batchId,
          appliedTerrainInstanceCount: appliedCount,
          batchCount: built.instances.length,
          batchIndexStart: job.nextPlanIndex - built.instances.length,
          batchIndexEndExclusive: job.nextPlanIndex,
          remainingTerrainInstanceCount: Math.max(0, job.terrainPlacementPlan.length - job.nextPlanIndex),
          materializeMs: Number(materializeMs.toFixed(3)),
          sceneCommitMs: Number(commitMs.toFixed(3))
        });
      }
      if (job.nextPlanIndex >= job.terrainPlacementPlan.length) return finalizePendingTerrainApplyJob(job, requestSource + ':complete');
      return summary;
    }

    return {
      owner: OWNER,
      phase: PHASE,
      getBatchInstanceCount: function () { return batchSize; },
      hasPendingTerrainApplyJob: function () { return !!pendingTerrainApplyJob; },
      cancelPendingTerrainApplyJob: cancelPendingTerrainApplyJob,
      beginTerrainApplyJob: beginTerrainApplyJob,
      finalizePendingTerrainApplyJob: finalizePendingTerrainApplyJob,
      tickMainEditorTerrainApply: tickMainEditorTerrainApply
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    DEFAULT_BATCH_INSTANCE_COUNT: DEFAULT_BATCH_INSTANCE_COUNT,
    createTerrainApplyJobController: createTerrainApplyJobController
  };

  global.__APP_TERRAIN_APPLY_JOB_CONTROLLER__ = api;

  try {
    var ns = global.__APP_NAMESPACE || null;
    if (ns && typeof ns.bind === 'function') {
      ns.bind('controllers.terrainApplyJob', api, { owner: OWNER, legacy: [], phase: PHASE });
      ns.bind('application.terrainApplyJobController', api, { owner: OWNER, legacy: [], phase: PHASE });
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
