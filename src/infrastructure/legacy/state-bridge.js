(function (global) {
  'use strict';

  var OWNER = 'src/infrastructure/legacy/state-bridge.js';
  var VERSION = 'P9b-state-bridge-v1';

  function getNamespaceApi() {
    return global && global.__APP_NAMESPACE ? global.__APP_NAMESPACE : null;
  }

  function getStateNamespacePath(path) {
    var namespace = getNamespaceApi();
    if (!namespace || typeof namespace.getPath !== 'function') return null;
    return namespace.getPath(path) || null;
  }

  function getStateApis() {
    return {
      lightingState: getStateNamespacePath('state.lightingState'),
      prefabRegistry: getStateNamespacePath('state.prefabRegistry'),
      domRegistry: getStateNamespacePath('shell.domRegistry'),
      runtimeState: getStateNamespacePath('state.runtimeState'),
      sceneGraph: getStateNamespacePath('state.sceneGraph'),
      sceneSession: getStateNamespacePath('state.sceneSession')
    };
  }

  function getPlacementLegacyBridgeState() {
    return getStateNamespacePath('legacy.placement') || (global ? global.__PLACEMENT_LEGACY_BRIDGE__ || null : null);
  }

  function callLegacyPlacement(action, args, meta) {
    action = String(action || '');
    args = Array.isArray(args) ? args : [];
    meta = meta || {};
    var bridge = getPlacementLegacyBridgeState();
    if (bridge && typeof bridge[action] === 'function') return bridge[action].apply(bridge, args.concat(meta));
    if (global && typeof global[action] === 'function') return global[action].apply(global, args);
    return null;
  }

  function getGlobal(name) {
    return global ? global[name] : undefined;
  }

  function getMaybeGlobal(name) {
    try { return getGlobal(name); }
    catch (_) { return undefined; }
  }

  function countUiKeys() {
    var ui = getMaybeGlobal('ui');
    return ui && typeof ui === 'object' ? Object.keys(ui).length : 0;
  }

  function hasUiKey(key) {
    var ui = getMaybeGlobal('ui');
    return !!(ui && ui[key]);
  }

  function hasCanvas() {
    return !!getMaybeGlobal('canvas');
  }

  function safeOwner(api) {
    return api && api.owner ? api.owner : null;
  }

  function safeCall(api, method) {
    if (!api || typeof api[method] !== 'function') return null;
    try { return api[method](); }
    catch (_) { return null; }
  }

  function currentEntryInfo() {
    return (global && (global.__APP_ENTRY_INFO_RESOLVED || global.__APP_ENTRY_INFO))
      ? (global.__APP_ENTRY_INFO_RESOLVED || global.__APP_ENTRY_INFO)
      : null;
  }

  function emitCompatMappings(logCompatMapping) {
    var mappings = [
      ['LOCAL_SCENE_STORAGE_KEY', 'src/core/scene/scene-keys.js'],
      ['saveScene', 'src/infrastructure/storage/scene-storage.js'],
      ['loadScene', 'src/infrastructure/storage/scene-storage.js'],
      ['buildSceneSnapshot', 'src/infrastructure/storage/scene-storage.js'],
      ['applySceneSnapshot', 'src/infrastructure/storage/scene-storage.js'],
      ['repairSceneSnapshot', 'src/infrastructure/storage/scene-storage.js'],
      ['repairLegacySceneSnapshot', 'src/infrastructure/storage/scene-storage.js'],
      ['restoreScenePrefabRefs', 'src/infrastructure/storage/scene-storage.js'],
      ['restoreSceneHabboRefs', 'src/infrastructure/storage/scene-storage.js'],
      ['applyLightingPreset', 'src/core/lighting/lighting-state.js'],
      ['normalizeLight', 'src/core/lighting/lighting-state.js'],
      ['bindLightingUi', 'src/presentation/lighting/lighting-editor.js'],
      ['syncLightUI', 'src/presentation/lighting/lighting-editor.js'],
      ['renderLightList', 'src/presentation/lighting/lighting-editor.js'],
      ['hitLightAxis', 'src/presentation/lighting/lighting-editor.js'],
      ['renderLightingShadows', 'src/presentation/lighting/lighting-render.js'],
      ['renderLightingGlow', 'src/presentation/lighting/lighting-render.js'],
      ['drawLightingBulb', 'src/presentation/lighting/lighting-render.js'],
      ['drawLightingAxes', 'src/presentation/lighting/lighting-render.js'],
      ['normalizePrefab', 'src/core/state/prefab-registry.js'],
      ['ensurePrefabRegistered', 'src/core/state/prefab-registry.js'],
      ['getPrefabById', 'src/core/state/prefab-registry.js'],
      ['prefabVariant', 'src/core/state/prefab-registry.js'],
      ['prototypes', 'src/core/state/prefab-registry.js'],
      ['setActivePanelTab', 'src/presentation/ui/ui-tabs.js'],
      ['refreshAssetScanStatus', 'src/presentation/ui/ui-inspectors.js'],
      ['refreshItemInspector', 'src/presentation/ui/ui-inspectors.js'],
      ['refreshPlayerInspector', 'src/presentation/ui/ui-inspectors.js'],
      ['refreshWorldInspector', 'src/presentation/ui/ui-inspectors.js'],
      ['refreshInspectorPanels', 'src/presentation/ui/ui-inspectors.js'],
      ['setHabboLibraryVisibility', 'src/presentation/ui/ui-habbo-library.js'],
      ['renderHabboLibraryBrowser', 'src/presentation/ui/ui-habbo-library.js'],
      ['openHabboLibraryBrowser', 'src/presentation/ui/ui-habbo-library.js'],
      ['bindHabboLibraryUi', 'src/presentation/ui/ui-habbo-library.js'],
      ['canvas', 'src/presentation/shell/dom-registry.js'],
      ['ui', 'src/presentation/shell/dom-registry.js'],
      ['mouse', 'src/core/state/runtime-state.js'],
      ['camera', 'src/core/state/runtime-state.js'],
      ['settings', 'src/core/state/runtime-state.js'],
      ['editor', 'src/core/state/runtime-state.js'],
      ['player', 'src/core/state/runtime-state.js'],
      ['inspectorState', 'src/core/state/runtime-state.js']
    ];
    mappings.forEach(function (pair) { logCompatMapping(pair[0], pair[1]); });
    return mappings.length;
  }

  function emitCleanupLogs(refactorLogCurrent) {
    var removedLegacyEntries = [
      ['requestPrefabSelectRefresh', 'src/infrastructure/assets/asset-management.js', 'unused-global-alias'],
      ['window.initializeMainApp', 'src/presentation/shell/app-shell.js', 'use-app-shell-api-object'],
      ['window.bootstrapApplication', 'src/presentation/shell/app-shell.js', 'api-object-only'],
      ['window.bindApplicationModules', 'src/presentation/shell/app-shell.js', 'api-object-only'],
      ['window.runStartupRestorePipeline', 'src/presentation/shell/app-shell.js', 'api-object-only'],
      ['window.runStartupAssetPipeline', 'src/presentation/shell/app-shell.js', 'api-object-only']
    ];
    removedLegacyEntries.forEach(function (entry) {
      refactorLogCurrent('Cleanup', 'cleanup-legacy-entry removed -> ' + entry[0], { owner: entry[1], reason: entry[2] });
    });

    var removedCompatMappings = [
      'importPrefabDefinition',
      'registerImportedPrefab',
      'prepareImportedPrefabForPlacement',
      'selectImportedPrefabForEditor',
      'enterPlacementModeForImportedPrefab',
      'dedupeImportedPrefab'
    ];
    removedCompatMappings.forEach(function (name) {
      refactorLogCurrent('Cleanup', 'cleanup-compat-mapping removed -> ' + name, { owner: 'src/infrastructure/legacy/state.js', reason: 'asset-import-self-reported' });
    });

    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping kept -> saveScene', { reason: 'still-needed-across-ui-and-app-shell' });
    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping kept -> loadScene', { reason: 'still-needed-across-ui-and-app-shell' });
    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping kept -> refreshInspectorPanels', { reason: 'still-needed-across-import-placement-and-selection' });
    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping kept -> editor/runtime globals', { reason: 'unsafe-to-remove-before-final-render-pass' });

    refactorLogCurrent('Cleanup', 'cleanup-fallback-route removed -> src/presentation/shell/app.js:initializeMainApp-missing', { owner: 'src/presentation/shell/app.js', reason: 'app-shell-api-required' });
    refactorLogCurrent('Cleanup', 'cleanup-fallback-route kept -> asset-management-ownership-check', { owner: 'src/infrastructure/assets/asset-management.js', reason: 'unsafe-to-remove' });
    refactorLogCurrent('Cleanup', 'cleanup-fallback-route kept -> legacy-habbo-prefab-repair', { owner: 'src/infrastructure/legacy/state.js', reason: 'still-needed-for-flat-habbo-recovery' });
  }

  function reportLegacyStateBootOwnership() {
    var apis = getStateApis();
    var setRefactorStepFn = getMaybeGlobal('setRefactorStep');
    if (typeof setRefactorStepFn === 'function') {
      setRefactorStepFn('Phase-A-02', {
        entry: currentEntryInfo(),
        note: 'tighten frontend service boundaries, reduce duplicate request orchestration logs, and partially dedupe repeated asset scan imports without changing backend behavior'
      });
    }

    var markRefactorCheckpointFn = getMaybeGlobal('markRefactorCheckpoint');
    if (typeof markRefactorCheckpointFn === 'function') {
      markRefactorCheckpointFn('Bootstrap', 'ui-bound', {
        entryFile: currentEntryInfo() && currentEntryInfo().entryFile ? currentEntryInfo().entryFile : 'unknown',
        hasCanvas: hasCanvas(),
        hasDebugLog: hasUiKey('debugLog')
      });
      markRefactorCheckpointFn('Bootstrap', 'logging-ready', {
        loggerBound: typeof getMaybeGlobal('bindLoggingUi') === 'function',
        uiKeys: countUiKeys()
      });
      markRefactorCheckpointFn('SceneKeys', 'shared-keys-ready', {
        owner: global.__SCENE_STORAGE_KEYS && global.__SCENE_STORAGE_KEYS.owner,
        sceneKey: typeof getMaybeGlobal('LOCAL_SCENE_STORAGE_KEY') !== 'undefined' ? getMaybeGlobal('LOCAL_SCENE_STORAGE_KEY') : null,
        prefabKey: typeof getMaybeGlobal('LOCAL_PREFAB_STORAGE_KEY') !== 'undefined' ? getMaybeGlobal('LOCAL_PREFAB_STORAGE_KEY') : null,
        sceneApiSave: typeof getMaybeGlobal('SCENE_API_SAVE_URL') !== 'undefined' ? getMaybeGlobal('SCENE_API_SAVE_URL') : null
      });
      markRefactorCheckpointFn('LightingState', 'shared-state-ready', {
        owner: safeOwner(apis.lightingState),
        lightCount: Array.isArray(getMaybeGlobal('lights')) ? getMaybeGlobal('lights').length : null,
        activeLightId: typeof getMaybeGlobal('activeLightId') !== 'undefined' ? getMaybeGlobal('activeLightId') : null
      });
      markRefactorCheckpointFn('LightingEditor', 'editor-api-ready', {
        owner: global.__LIGHTING_EDITOR_API && global.__LIGHTING_EDITOR_API.owner,
        hasLightList: hasUiKey('lightList'),
        hasLightingEnabledToggle: hasUiKey('lightingEnabled')
      });
      markRefactorCheckpointFn('LightingRender', 'render-api-ready', {
        owner: global.__LIGHTING_RENDER_API && global.__LIGHTING_RENDER_API.owner,
        hasGlow: !!(global.__LIGHTING_RENDER_API && global.__LIGHTING_RENDER_API.renderLightingGlow),
        hasShadowPass: !!(global.__LIGHTING_RENDER_API && global.__LIGHTING_RENDER_API.renderLightingShadows)
      });
      markRefactorCheckpointFn('PrefabRegistry', 'registry-api-ready', {
        owner: safeOwner(apis.prefabRegistry),
        prototypeCount: safeCall(apis.prefabRegistry, 'getPrototypeCount'),
        builtInCount: safeCall(apis.prefabRegistry, 'getBuiltInCount')
      });
      markRefactorCheckpointFn('DomRegistry', 'dom-api-ready', {
        owner: safeOwner(apis.domRegistry),
        keyCount: safeCall(apis.domRegistry, 'getKeyCount'),
        missingKeyCount: apis.domRegistry && typeof apis.domRegistry.getMissingKeys === 'function' ? apis.domRegistry.getMissingKeys().length : null,
        hasCanvas: hasCanvas()
      });
      markRefactorCheckpointFn('RuntimeState', 'runtime-state-ready', Object.assign({
        owner: safeOwner(apis.runtimeState)
      }, (apis.runtimeState && apis.runtimeState.summarize ? apis.runtimeState.summarize() : {})));
      markRefactorCheckpointFn('SceneSession', 'scene-session-ready', Object.assign({
        owner: safeOwner(apis.sceneSession)
      }, (apis.sceneSession && typeof apis.sceneSession.summarizeSession === 'function' ? apis.sceneSession.summarizeSession() : {})));
    }

    var logCompatMappingFn = getMaybeGlobal('logCompatMapping');
    var compatMappingCount = 0;
    if (typeof logCompatMappingFn === 'function') compatMappingCount = emitCompatMappings(logCompatMappingFn);

    if (typeof markRefactorCheckpointFn === 'function') {
      markRefactorCheckpointFn('Cleanup', 'cleanup-ready', {
        owner: 'src/infrastructure/legacy/state.js',
        bridgeOwner: OWNER,
        removedLegacyEntries: 6,
        removedCompatMappings: 6,
        keptCompatMappings: compatMappingCount,
        keptFallbackRoutes: 2
      });
    }

    var refactorLogCurrentFn = getMaybeGlobal('refactorLogCurrent');
    if (typeof refactorLogCurrentFn === 'function') emitCleanupLogs(refactorLogCurrentFn);

    return summarizeBoundary();
  }

  function summarizeBoundary() {
    return {
      phase: 'P9b',
      version: VERSION,
      owner: OWNER,
      legacyStateOwner: 'src/infrastructure/legacy/state.js',
      canonicalOwners: {
        runtime: 'src/core/state/runtime-state.js',
        prefabRegistry: 'src/core/state/prefab-registry.js',
        sceneSession: 'src/core/state/scene-session-state.js',
        stateActions: 'src/application/state/state-actions.js',
        legacyBridge: OWNER
      },
      exposes: [
        'getStateNamespacePath',
        'getStateApis',
        'getPlacementLegacyBridgeState',
        'callLegacyPlacement',
        'reportLegacyStateBootOwnership',
        'summarizeBoundary'
      ]
    };
  }

  var api = {
    owner: OWNER,
    version: VERSION,
    getStateNamespacePath: getStateNamespacePath,
    getStateApis: getStateApis,
    getPlacementLegacyBridgeState: getPlacementLegacyBridgeState,
    callLegacyPlacement: callLegacyPlacement,
    reportLegacyStateBootOwnership: reportLegacyStateBootOwnership,
    summarizeBoundary: summarizeBoundary
  };

  global.__LEGACY_STATE_BRIDGE__ = api;
  if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
    global.__APP_NAMESPACE.bind('infrastructure.legacyStateBridge', api, {
      owner: OWNER,
      phase: 'P9b',
      legacy: ['src/infrastructure/legacy/state.js']
    });
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
