// P3-C: state selectors and snapshots
(function () {
  var OWNER = 'src/core/state/state-selectors.js';
  var PHASE = 'P3-C';

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function emitP3(kind, message, extra) {
    var line = '[P3][' + String(kind || 'BOOT') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function getAppRoot() {
    return (typeof window !== 'undefined' && window.App) ? window.App : null;
  }

  function getStateRoot() {
    var app = getAppRoot();
    return app && app.state ? app.state : null;
  }

  function getShellRoot() {
    var app = getAppRoot();
    return app && app.shell ? app.shell : null;
  }

  function getRuntimeApi() {
    var state = getStateRoot();
    return state && state.runtimeState ? state.runtimeState : null;
  }

  function getPrefabApi() {
    var state = getStateRoot();
    return state && state.prefabRegistry ? state.prefabRegistry : null;
  }

  function getSceneApi() {
    var state = getStateRoot();
    return state && state.sceneGraph ? state.sceneGraph : null;
  }

  function getLightingApi() {
    var state = getStateRoot();
    return state && state.lightingState ? state.lightingState : null;
  }

  function getDomApi() {
    var shell = getShellRoot();
    return shell && shell.domRegistry ? shell.domRegistry : null;
  }

  function getEntry() {
    return (typeof window !== 'undefined' && (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO)) ? (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO) : null;
  }

  function getEditorMode() {
    var runtimeApi = getRuntimeApi();
    if (runtimeApi && runtimeApi.editor) return runtimeApi.editor.mode || 'view';
    try { return editor && editor.mode ? editor.mode : 'view'; } catch (_) { return 'view'; }
  }

  function getSelectedInstanceId() {
    var runtimeApi = getRuntimeApi();
    if (runtimeApi && runtimeApi.inspectorState) return runtimeApi.inspectorState.selectedInstanceId || null;
    try { return inspectorState && inspectorState.selectedInstanceId ? inspectorState.selectedInstanceId : null; } catch (_) { return null; }
  }

  function getCamera() {
    var runtimeApi = getRuntimeApi();
    if (runtimeApi && runtimeApi.camera) return { x: Number(runtimeApi.camera.x) || 0, y: Number(runtimeApi.camera.y) || 0 };
    try { return { x: Number(camera.x) || 0, y: Number(camera.y) || 0 }; } catch (_) { return { x: 0, y: 0 }; }
  }

  function getWorldSummary() {
    var runtimeApi = getRuntimeApi();
    var settingsRef = runtimeApi && runtimeApi.settings ? runtimeApi.settings : (typeof settings !== 'undefined' ? settings : null);
    if (!settingsRef) return { gridW: null, gridH: null, tileScale: null, displayScale: null };
    return {
      gridW: Number(settingsRef.gridW != null ? settingsRef.gridW : settingsRef.worldCols) || 0,
      gridH: Number(settingsRef.gridH != null ? settingsRef.gridH : settingsRef.worldRows) || 0,
      tileScale: Number(settingsRef.tileScale) || 1,
      displayScale: Number(settingsRef.worldDisplayScale) || 1
    };
  }

  function getRuntimeSummary() {
    var runtimeApi = getRuntimeApi();
    if (runtimeApi && typeof runtimeApi.summarize === 'function') return runtimeApi.summarize();
    return {
      editorMode: getEditorMode(),
      selectedInstanceId: getSelectedInstanceId(),
      camera: getCamera(),
      mouseInside: !!(runtimeApi && runtimeApi.mouse && runtimeApi.mouse.inside),
      world: getWorldSummary()
    };
  }

  function getSelectedPrototypeIndex() {
    var prefabApi = getPrefabApi();
    if (prefabApi && typeof prefabApi.getSelectedPrototypeIndex === 'function') return Number(prefabApi.getSelectedPrototypeIndex()) || 0;
    try { return editor && typeof editor.prototypeIndex === 'number' ? editor.prototypeIndex : 0; } catch (_) { return 0; }
  }

  function getSelectedPrefabId() {
    var prefabApi = getPrefabApi();
    if (prefabApi && typeof prefabApi.summarize === 'function') {
      var summary = prefabApi.summarize() || {};
      return summary.selectedPrefabId || null;
    }
    var selected = getSelectedPrefab();
    return selected ? String(selected.id || '') : null;
  }

  function getSelectedPrefab() {
    var prefabApi = getPrefabApi();
    if (!prefabApi) return null;
    var id = getSelectedPrefabId();
    if (id && typeof prefabApi.getPrefabById === 'function') return prefabApi.getPrefabById(id);
    if (typeof prefabApi.getPrototypes === 'function') {
      var list = prefabApi.getPrototypes() || [];
      return list[getSelectedPrototypeIndex()] || list[0] || null;
    }
    return null;
  }

  function getSceneSummary() {
    var sceneApi = getSceneApi();
    if (sceneApi && typeof sceneApi.summarize === 'function') return sceneApi.summarize();
    return {
      instances: Array.isArray(typeof instances !== 'undefined' ? instances : null) ? instances.length : null,
      boxes: Array.isArray(typeof boxes !== 'undefined' ? boxes : null) ? boxes.length : null,
      lights: Array.isArray(typeof lights !== 'undefined' ? lights : null) ? lights.length : null
    };
  }

  function getLightingSummary() {
    var lightingApi = getLightingApi();
    if (!lightingApi) return { lightCount: null, activeLightId: null, lightingEnabled: null };
    return {
      lightCount: typeof lightingApi.getLights === 'function' ? (lightingApi.getLights() || []).length : null,
      activeLightId: typeof lightingApi.getActiveLightId === 'function' ? lightingApi.getActiveLightId() : null,
      lightingEnabled: typeof lightingApi.isLightingSystemEnabled === 'function' ? lightingApi.isLightingSystemEnabled() : null
    };
  }

  function getDomSummary() {
    var domApi = getDomApi();
    if (!domApi) return { keyCount: null, missingKeyCount: null };
    return {
      keyCount: typeof domApi.getKeyCount === 'function' ? domApi.getKeyCount() : null,
      missingKeyCount: typeof domApi.getMissingKeys === 'function' ? (domApi.getMissingKeys() || []).length : null
    };
  }

  function getSelectedPrefabViewModel() {
    var selected = getSelectedPrefab();
    if (!selected) return null;
    return {
      id: String(selected.id || ''),
      name: String(selected.name || selected.id || ''),
      renderMode: String(selected.renderMode || 'voxel'),
      voxels: Array.isArray(selected.voxels) ? selected.voxels.length : 0,
      dims: { w: Number(selected.w) || 0, d: Number(selected.d) || 0, h: Number(selected.h) || 0 },
      custom: !!selected.custom,
      assetManaged: !!selected.assetManaged,
      externalManaged: !!selected.externalManaged
    };
  }

  function buildMainSnapshot() {
    return {
      phase: PHASE,
      entry: getEntry(),
      runtime: getRuntimeSummary(),
      world: getWorldSummary(),
      scene: getSceneSummary(),
      lighting: getLightingSummary(),
      selectedPrefab: getSelectedPrefabViewModel(),
      dom: getDomSummary()
    };
  }

  function buildEditorSnapshot(extra) {
    return {
      phase: PHASE,
      entry: getEntry(),
      editorState: safeClone(extra || null)
    };
  }

  function summarizeCoverage() {
    return {
      phase: PHASE,
      owner: OWNER,
      selectorCount: 10,
      snapshotCount: 2,
      selectors: [
        'getEditorMode','getSelectedInstanceId','getCamera','getWorldSummary','getRuntimeSummary',
        'getSelectedPrefabId','getSelectedPrefab','getSelectedPrefabViewModel','getSceneSummary','getLightingSummary','getDomSummary'
      ],
      snapshots: ['buildMainSnapshot','buildEditorSnapshot'],
      owners: ['src/core/state/runtime-state.js','src/core/state/prefab-registry.js','src/core/state/scene-session-state.js','src/core/lighting/lighting-state.js','src/presentation/shell/dom-registry.js']
    };
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    getEditorMode: getEditorMode,
    getSelectedInstanceId: getSelectedInstanceId,
    getCamera: getCamera,
    getWorldSummary: getWorldSummary,
    getRuntimeSummary: getRuntimeSummary,
    getSelectedPrototypeIndex: getSelectedPrototypeIndex,
    getSelectedPrefabId: getSelectedPrefabId,
    getSelectedPrefab: getSelectedPrefab,
    getSelectedPrefabViewModel: getSelectedPrefabViewModel,
    getSceneSummary: getSceneSummary,
    getLightingSummary: getLightingSummary,
    getDomSummary: getDomSummary,
    buildMainSnapshot: buildMainSnapshot,
    buildEditorSnapshot: buildEditorSnapshot,
    summarizeCoverage: summarizeCoverage
  };

  if (typeof window !== 'undefined') {
    window.__STATE_SELECTORS__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('state.selectors', api, { owner: OWNER, phase: PHASE });
    }
  }

  emitP3('BOUNDARY', 'selector-bound', {
    phase: PHASE,
    roots: {
      runtimeState: !!getRuntimeApi(),
      prefabRegistry: !!getPrefabApi(),
      sceneGraph: !!getSceneApi(),
      lightingState: !!getLightingApi(),
      domRegistry: !!getDomApi()
    },
    selectorCount: summarizeCoverage().selectorCount,
    snapshotCount: summarizeCoverage().snapshotCount
  });
  emitP3('SUMMARY', 'selector-coverage', summarizeCoverage());
})();
