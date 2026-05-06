// P9c shell diagnostics owner extracted from app.js.
// Owns function-call trace configuration and trace installer globals used by the shell.
// v1 split file generated from original monolithic app.js
// 注意：此文件为保持行为稳定的第一刀拆分，允许存在少量跨层函数。

// function-call trace installer: logs file + function name so main/editor or wrong-path issues are obvious.
var __functionTraceSeq = 0;
function summarizeTraceArg(value) {
  if (value == null) return String(value);
  if (typeof value === 'string') return value.length > 48 ? JSON.stringify(value.slice(0, 48) + '…') : JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return 'array(len=' + value.length + ')';
  if (typeof value === 'function') return 'fn';
  if (typeof value === 'object') {
    try {
      if (value.id) return 'obj(id=' + value.id + ')';
      if (value.prefabId) return 'obj(prefabId=' + value.prefabId + ')';
      if (value.instanceId) return 'obj(instanceId=' + value.instanceId + ')';
      var keys = Object.keys(value).slice(0, 4);
      return 'obj{' + keys.join(',') + (Object.keys(value).length > 4 ? ',…' : '') + '}';
    } catch (err) {
      return 'obj';
    }
  }
  return typeof value;
}
function traceFunctionCall(file, name, argsLike) {
  try {
    var args = [];
    for (var i = 0; i < Math.min((argsLike && argsLike.length) || 0, 3); i++) args.push(summarizeTraceArg(argsLike[i]));
    detailLog('[fn-enter#' + String(++__functionTraceSeq).padStart(5, '0') + '] ' + file + '::' + name + '(' + args.join(', ') + ')');
  } catch (err) {
    detailLog('[fn-enter#' + String(++__functionTraceSeq).padStart(5, '0') + '] ' + file + '::' + name + '(trace-error)');
  }
}
function installFunctionTrace(file, names) {
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var original = window[name];
    if (typeof original !== 'function' || original.__isFunctionTraceWrapped) continue;
    (function (fnName, fnOriginal) {
      function wrapped() {
        traceFunctionCall(file, fnName, arguments);
        return fnOriginal.apply(this, arguments);
      }
      wrapped.__isFunctionTraceWrapped = true;
      wrapped.__originalFunction = fnOriginal;
      window[fnName] = wrapped;
      try { eval(fnName + ' = window[\"' + fnName + '\"]'); } catch (err) {}
    })(name, original);
  }
}
var __traceSearch = (typeof location !== 'undefined' && location.search) ? String(location.search) : '';
var __fullFunctionTraceEnabled = /(?:[?&](?:fntrace|trace)=1)|(?:[?&]trace=all)/i.test(__traceSearch);
var __coreFunctionTraceOnly = !__fullFunctionTraceEnabled;

var __functionTraceSpec = {
  'src/core/scene/scene-keys.js': [],
  'src/infrastructure/storage/scene-storage.js': ['saveScene','loadScene','buildSceneSnapshot','applySceneSnapshot'],
  'src/application/controllers/app-controllers.js': ['openEditorFromMain','handleOpenEditorButton','requestModeChange','handleModeButton','handlePrefabSelectChange','applyPlacementIntent','runAssetScan','handleRescanAssetsButton','saveSceneTarget','loadSceneTarget','saveLocalScene','loadLocalScene','saveSceneFile','openDefaultScene','importSceneFile','openHabboLibrary','handleOpenBrowserClick','handleRefreshBrowserClick','handleTypeSwitch','handleCategorySelect','handleSearchInput','handlePageAction','handlePlaceSelectedItem','processEditorReturn'],
  'src/presentation/shell/dom-registry.js': [],
  'src/core/state/runtime-state.js': [],
  'src/core/state/prefab-registry.js': [
    'normalizePrefab','ensurePrefabRegistered','getPrefabById','prefabVariant'
  ],
  'src/application/state/state-actions.js': ['requestModeChange','selectPrefabByIndex','selectPrefabById','handlePrefabSelectChange'],
  'src/core/lighting/lighting-state.js': [
    'normalizeLight','makeLightingPreset','applyLightingPreset','activeLight','isLightingSystemEnabled','getLightingRenderLights','shouldUseFastShadowSampling','shouldUseMediumAreaSampling','serializeLightForLayer'
  ],
  'src/infrastructure/legacy/state.js': [
    'applySceneSnapshot','saveScene','loadScene','buildSceneSnapshot','saveSceneToLocalStorage','loadSceneFromLocalStorage','updateModeButtons','setEditorMode',
    'parseHabboVisualizationGraphics','chooseHabboVisualization','getHabboVisualizationState','getHabboLayerLetter','getHabboAnimationFrameForLayer','chooseHabboAssetForLayer',
    'parseHabboSwfMetadataFromXmls','buildHabboLayerDirectionsFromBitmaps','buildHabboSpriteDirectionsFromBitmaps','buildHabboFloorAnchor',
    'parseHabboSwfRuntime','buildHabboPrefabDefinition','importHabboSwfToSceneFromBuffer','importHabboSwfFileToScene','importBundledHabboDemoToScene',
    'isLegacyFlatHabboPrefab','queueLegacyHabboPrefabRepair','runLegacyHabboRepairQueue','scanAssetPrefabs'
  ],
  'src/application/placement/placement.js': [
    'makeInstance','expandInstanceToBoxes','rebuildBoxesFromInstances','removeInstanceById','findInstanceById','findInstanceForBox',
    'startDragging','commitPreview','cancelDrag','placeCurrentPrefab','movePlacedInstance','refreshPlacementOrdering','legacyBoxesToInstances'
  ],
  'src/application/player/player.js': [
    'resetPlayer','clampPlayerToWorld','getPlayerProxyBox','getPlayerShadowCenter','getPlayerGroundBounds','getPlayerInput','collidesPlayer','canPlayerMoveTo','applyPlayerInput','updatePlayerMovement'
  ],
  'src/presentation/lighting/lighting-editor.js': [
    'syncLightUI','renderLightList','addLight','deleteActiveLight','hitLightAxis','startLightAxisDrag','updateLightAxisDrag','axisHandle','bindLightingUi'
  ],
  'src/presentation/lighting/lighting-render.js': [
    'renderLightingShadows','renderLightingGlow','drawLightingBulb','drawLightingAxes'
  ],
  'src/presentation/lighting/lighting.js': [],
  'src/application/assets/asset-import.js': [
    'importPrefabDefinition','registerImportedPrefab','prepareImportedPrefabForPlacement','selectImportedPrefabForEditor','enterPlacementModeForImportedPrefab','dedupeImportedPrefab'
  ],
  'src/presentation/shell/app-shell.js': [
    'initializeMainApp','bootstrapApplication','bindApplicationModules','runStartupRestorePipeline','runStartupAssetPipeline'
  ],
  'src/infrastructure/assets/asset-management.js': [
    'fetchHabboLibrarySummary','fetchHabboLibraryPage','fetchHabboLibraryIndex','loadHabboLibraryItemToPlacement'
  ],
  'src/presentation/ui/ui-tabs.js': [
    'setActivePanelTab','bindPanelTabs'
  ],
  'src/presentation/ui/ui-inspectors.js': [
    'refreshAssetScanStatus','refreshItemInspector','refreshPlayerInspector','refreshWorldInspector','refreshInspectorPanels'
  ],
  'src/presentation/ui/ui-habbo-library.js': [
    'setHabboLibraryVisibility','renderHabboLibraryBrowser','openHabboLibraryBrowser','bindHabboLibraryUi'
  ],
  'src/presentation/ui/ui.js': [
    'applyWorldDisplayScale','applySettings'
  ],
  'src/presentation/render/logic.js': [
    'currentProto','screenToFloor','projectGroundPoint','buildShadowComponents','drawProjectedShadow','drawPlayerShadow'
  ],
  'src/presentation/render/render.js': [
    'prefabDrawsVoxels','prefabHasSprite','getPrefabSpriteConfig','getHabboLayerConfigList','getCachedImageFromDataUrl','getPrefabSpriteImage','rotKeyForSprite',
    'drawPrefabSpriteAt','drawPrefabSpriteInstance','drawHabboDebugOverlay','getInstanceProxyBounds','classifyPlayerAgainstProxyBox','computeSpriteRenderableSort',
    'rebuildStaticBoxRenderCacheIfNeeded','mergeSortedRenderables','drawFloor','drawPlayerAvatar','updatePreview','pickBoxAtScreen','update','render'
  ],
  'src/presentation/render/renderer/canvas2d-renderer.js': ['renderFrame', 'runFramePipeline', 'getRenderablesApi', 'drawRenderableOrder', 'drawOverlayPasses', 'drawHudPass'],
  'src/presentation/shell/app.js': ['loop']
};
window.__FUNCTION_TRACE_INFO = { enabled: __fullFunctionTraceEnabled, mode: (__fullFunctionTraceEnabled ? 'all' : 'targeted-only'), files: Object.keys(__functionTraceSpec) };

if (typeof markRefactorCheckpoint === 'function') {
  markRefactorCheckpoint('Bootstrap', 'app-loaded', {
    traceMode: (__fullFunctionTraceEnabled ? 'all' : 'targeted-only'),
    search: __traceSearch || ''
  });
}


(function exposeShellDiagnosticsApi() {
  if (typeof window === 'undefined') return;
  window.__SHELL_DIAGNOSTICS__ = {
    owner: 'src/presentation/shell/diagnostics/shell-diagnostics.js',
    phase: 'P9c-CONTROLLER-SHELL',
    getTraceInfo: function () { return window.__FUNCTION_TRACE_INFO || null; },
    installFunctionTrace: (typeof installFunctionTrace === 'function') ? installFunctionTrace : null,
    traceFunctionCall: (typeof traceFunctionCall === 'function') ? traceFunctionCall : null
  };
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('shell.diagnostics', window.__SHELL_DIAGNOSTICS__, {
        owner: 'src/presentation/shell/diagnostics/shell-diagnostics.js',
        phase: 'P9c-CONTROLLER-SHELL',
        legacy: ['src/presentation/shell/app.js']
      });
    }
  } catch (_) {}
})();
