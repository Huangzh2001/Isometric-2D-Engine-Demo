(function (global) {
  if (!global) return;

  var OWNER = 'src/application/controllers/terrain-clear-controller.js';
  var PHASE = 'P11b-5-TERRAIN-CLEAR-CONTROLLER';

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

  function createTerrainClearController(deps) {
    var d = asObject(deps);

    function clearMainEditorTerrain(source) {
      var requestSource = String(source || 'terrain:clear');
      if (typeof d.cancelPendingTerrainApplyJob === 'function') d.cancelPendingTerrainApplyJob(requestSource + ':cancel-pending');
      var current = call(d.readCurrentSceneInstances, []) || [];
      var isTerrainGeneratedInstance = typeof d.isTerrainGeneratedInstance === 'function'
        ? d.isTerrainGeneratedInstance
        : function () { return false; };
      var removedLegacy = current.filter(isTerrainGeneratedInstance);
      var survivors = current.filter(function (inst) { return !isTerrainGeneratedInstance(inst); });
      if (typeof d.replaceCurrentSceneInstances === 'function') d.replaceCurrentSceneInstances(survivors, requestSource);
      var terrainRuntime = call(d.getTerrainRuntimeModel, null);
      var lastSettings = typeof d.getMainEditorTerrainSettings === 'function' ? d.getMainEditorTerrainSettings(requestSource) : null;
      var removedTerrainVoxelCount = terrainRuntime && terrainRuntime.lastSummary && Number.isFinite(Number(terrainRuntime.lastSummary.generatedVoxelCount))
        ? Math.round(Number(terrainRuntime.lastSummary.generatedVoxelCount))
        : removedLegacy.length;
      if (typeof d.clearTerrainRuntimeModelState === 'function') d.clearTerrainRuntimeModelState(requestSource + ':runtime-model');
      if (typeof d.applyTerrainBatchState === 'function') d.applyTerrainBatchState({ activeTerrainBatchId: null, lastSummary: null }, requestSource + ':runtime');
      if (typeof d.invalidateMainEditorTerrainRenderCaches === 'function') d.invalidateMainEditorTerrainRenderCaches(requestSource + ':invalidate');
      var payload = {
        terrainBatchId: (terrainRuntime && terrainRuntime.activeTerrainBatchId) || (lastSettings && lastSettings.activeTerrainBatchId) || 'all-terrain-generated',
        removedTerrainInstanceCount: removedLegacy.length,
        removedTerrainVoxelCount: removedTerrainVoxelCount
      };
      if (typeof d.recordTerrainDiagnostic === 'function') d.recordTerrainDiagnostic('terrain-generator-clear', payload);
      notifyTerrainSceneChanged(d);
      return Object.assign({ ok: true }, payload);
    }

    return {
      owner: OWNER,
      phase: PHASE,
      clearMainEditorTerrain: clearMainEditorTerrain
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    createTerrainClearController: createTerrainClearController
  };

  global.__APP_TERRAIN_CLEAR_CONTROLLER__ = api;

  try {
    var ns = global.__APP_NAMESPACE || null;
    if (ns && typeof ns.bind === 'function') {
      ns.bind('controllers.terrainClear', api, { owner: OWNER, legacy: [], phase: PHASE });
      ns.bind('application.terrainClearController', api, { owner: OWNER, legacy: [], phase: PHASE });
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
