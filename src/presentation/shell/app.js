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
    'rebuildStaticBoxRenderCacheIfNeeded','mergeSortedRenderables','drawFloor','drawPlayerSlice','updatePreview','pickBoxAtScreen','update','render'
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
function emitP1Main(kind, message, extra) {
  var line = '[P1][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (err) { line += ' "[unserializable]"'; }
  }
  try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (err) { try { console.log(line); } catch (_) {} }
  return line;
}
function emitP2Main(kind, message, extra) {
  var line = '[P2][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (err) { line += ' "[unserializable]"'; }
  }
  try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (err) { try { console.log(line); } catch (_) {} }
  return line;
}
function emitP3Main(kind, message, extra) {
  var line = '[P3][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (err) { line += ' "[unserializable]"'; }
  }
  try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (err) { try { console.log(line); } catch (_) {} }
  return line;
}

function emitP4Main(kind, message, extra) {
  var line = '[P4][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (err) { line += ' "[unserializable]"'; }
  }
  try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (err) { try { console.log(line); } catch (_) {} }
  return line;
}
function emitP5Main(kind, message, extra) {
  var line = '[P5][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (err) { line += ' "[unserializable]"'; }
  }
  try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (err) { try { console.log(line); } catch (_) {} }
  return line;
}
function installP2NamespaceLogs() {
  if (typeof window !== 'undefined' && window.__P2_NAMESPACE_LOGGED_MAIN) return;
  if (typeof window !== 'undefined') window.__P2_NAMESPACE_LOGGED_MAIN = true;
  var ns = (typeof window !== 'undefined' && window.__APP_NAMESPACE) ? window.__APP_NAMESPACE : null;
  var summary = ns && typeof ns.summarize === 'function' ? ns.summarize() : { topLevelKeys: [], registeredPaths: [], counts: {}, leakedGlobals: [] };
  emitP2Main('BOOT', 'namespace-ready', { entry: (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO || null), topLevelKeys: summary.topLevelKeys, registeredPaths: summary.registeredPaths });
  emitP2Main('BOUNDARY', 'app-shell-bound-to-namespace', { hasNamespace: !!ns, hasAppShell: !!(window.App && window.App.shell && window.App.shell.appShell), hasServiceRoot: !!(window.App && window.App.services), hasStateRoot: !!(window.App && window.App.state) });
  emitP2Main('INVARIANT', 'leaked-global-count', { count: summary.leakedGlobals ? summary.leakedGlobals.length : null, globals: summary.leakedGlobals || [] });
  emitP2Main('SUMMARY', 'bootstrap-ready', { phase: 'P2-A', registeredCount: summary.registeredPaths ? summary.registeredPaths.length : 0, serviceCount: summary.counts ? summary.counts.services : null, stateCount: summary.counts ? summary.counts.state : null, shellCount: summary.counts ? summary.counts.shell : null });
}
function installP3StateLogsMain() {
  if (typeof window !== 'undefined' && window.__P3_STATE_LOGGED_MAIN) return;
  if (typeof window !== 'undefined') window.__P3_STATE_LOGGED_MAIN = true;
  var mapApi = (typeof window !== 'undefined' && window.__STATE_OWNER_MAP__) ? window.__STATE_OWNER_MAP__ : null;
  var selectorApi = (typeof window !== 'undefined' && window.__STATE_SELECTORS__) ? window.__STATE_SELECTORS__ : null;
  var inventory = mapApi && typeof mapApi.summarizeInventory === 'function'
    ? mapApi.summarizeInventory()
    : { phase: 'P3-C', version: 'missing', docs: ['docs/STATE_INVENTORY.zh-CN.md', 'docs/STATE_OWNER_MAP.zh-CN.md'], categoryCount: 0, ownerCount: 0, scopes: {}, owners: [], categories: [] };
  var dashboard = selectorApi && typeof selectorApi.buildMainSnapshot === 'function'
    ? selectorApi.buildMainSnapshot()
    : (mapApi && typeof mapApi.summarizeMainDashboard === 'function'
      ? mapApi.summarizeMainDashboard()
      : { phase: 'P3-C', entry: (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO || null), roots: {}, runtimeSummary: null, sceneSummary: null, prefabSummary: null, lightingSummary: null, domSummary: null });
  emitP3Main('BOOT', 'state-owner-map-ready', {
    entry: (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO || null),
    version: inventory.version,
    docs: inventory.docs,
    categoryCount: inventory.categoryCount,
    ownerCount: inventory.ownerCount
  });
  emitP3Main('BOUNDARY', 'state-dashboard-ready', {
    phase: 'P3-C',
    roots: dashboard.roots || {},
    runtimeOwner: 'src/core/state/runtime-state.js',
    sceneOwner: 'src/core/state/scene-session-state.js',
    prefabOwner: 'src/core/state/prefab-registry.js',
    lightingOwner: 'src/core/lighting/lighting-state.js',
    domOwner: 'src/presentation/shell/dom-registry.js'
  });
  emitP3Main('SUMMARY', 'state-inventory', inventory);
  emitP3Main('SUMMARY', 'state-dashboard', Object.assign({}, dashboard, { writeSummary: mapApi && typeof mapApi.summarizeWriteOwners === 'function' ? mapApi.summarizeWriteOwners() : null }));
  emitP3Main('SUMMARY', 'state-write-owners', mapApi && typeof mapApi.summarizeWriteOwners === 'function' ? mapApi.summarizeWriteOwners() : { phase: 'P3-C', totalWrites: 0, byOwner: {}, byAction: {} });
  emitP3Main('SUMMARY', 'selector-coverage', selectorApi && typeof selectorApi.summarizeCoverage === 'function' ? selectorApi.summarizeCoverage() : { phase: 'P3-C', selectorCount: 0, snapshotCount: 0 });
  var domainApi = (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.sceneCore) ? window.App.domain.sceneCore : null;
  if (domainApi && typeof domainApi.summarizeCoverage === 'function') emitP4Main('SUMMARY', 'domain-core-coverage', domainApi.summarizeCoverage());
  var rendererApi = (typeof window !== 'undefined' && window.App && window.App.renderer && (window.App.renderer.active || window.App.renderer.canvas2d)) ? (window.App.renderer.active || window.App.renderer.canvas2d) : null;
  if (rendererApi && typeof rendererApi.summarizeCoverage === 'function') emitP5Main('SUMMARY', 'renderer-adapter-coverage', rendererApi.summarizeCoverage());
}
function collectLegacyRootScriptRefs() {
  try {
    var scripts = document && document.scripts ? document.scripts : [];
    var refs = [];
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i] && scripts[i].getAttribute ? (scripts[i].getAttribute('src') || '') : '';
      if (!src) continue;
      if (/^(app|state|app-shell|lighting-editor)\.js(?:[?#].*)?$/i.test(src)) refs.push(src);
    }
    return refs;
  } catch (_) { return []; }
}
(function installP1SourceOfTruthLogs() {
  if (typeof window !== 'undefined' && window.__P1_SOURCE_OF_TRUTH_LOGGED) return;
  if (typeof window !== 'undefined') window.__P1_SOURCE_OF_TRUTH_LOGGED = true;
  var canonical = {
    mainEntry: 'index.html',
    editorEntry: 'START_V18_ONLY.html',
    app: 'src/presentation/shell/app.js',
    state: 'src/infrastructure/legacy/state.js',
    appShell: 'src/presentation/shell/app-shell.js',
    lightingEditor: 'src/presentation/lighting/lighting-editor.js',
    server: 'server/local_server.py',
    sourceDoc: '001_SOURCE_OF_TRUTH.md'
  };
  var deprecated = ['app.js', 'state.js', 'app-shell.js', 'lighting-editor.js'];
  emitP1Main('BOOT', 'source-of-truth-ready', { canonical: canonical, deprecatedRootFiles: deprecated });
  emitP1Main('INVARIANT', 'legacy-root-references', { rootLevelScripts: collectLegacyRootScriptRefs(), deprecatedRootFiles: deprecated, bakRemoved: true });
  emitP1Main('SUMMARY', 'phase-ready', { phase: 'P1', sourceDoc: canonical.sourceDoc, rootStubCount: deprecated.length, mainUsesSrcOnly: collectLegacyRootScriptRefs().length === 0 });
  installP2NamespaceLogs();
  installP3StateLogsMain();
  emitP8XMain('BOOT', 'final-cleanup-stage-ready', {
    phase: 'P8X',
    mergedFrom: ['P8', 'P9', 'P10'],
    focus: ['compat-cleanup', 'regression-verification', 'handoff-docs'],
    retainedCompat: ['saveScene', 'loadScene', 'refreshInspectorPanels', 'editor/runtime globals', 'asset-management-ownership-check', 'legacy-habbo-prefab-repair']
  });
  emitP8XMain('SUMMARY', 'final-cleanup-scope', {
    phase: 'P8X',
    layers: ['App/UI Controller', 'Domain Core', 'Renderer Adapter', 'Asset/Scene Service'],
    note: 'P4-P7 are complete; remaining work is merged cleanup, regression verification, and handoff documentation.'
  });
})();


function getNamespacePath(path) {
  try {
    if (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
      return window.__APP_NAMESPACE.getPath(path);
    }
  } catch (_) {}
  return undefined;
}

function recordLegacyFallback(bridge, detail) {
  try {
    if (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.recordFallback === 'function') {
      window.__APP_NAMESPACE.recordFallback(bridge, 'src/presentation/shell/app.js', detail);
    }
  } catch (_) {}
}

function resolveMainExplicitDependencies() {
  return {
    appShellApi: getNamespacePath('shell.appShell') || null,
    runtimeStateApi: getNamespacePath('state.runtimeState'),
    serviceRoot: getNamespacePath('services') || null,
    stateRoot: getNamespacePath('state') || {},
    shellRoot: getNamespacePath('shell') || {}
  };
}

function getPlacementLegacyBridge() {
  return getNamespacePath('legacy.placement') || (typeof window !== 'undefined' ? window.__PLACEMENT_LEGACY_BRIDGE__ || null : null);
}

function callPlacementBridge(action, args, detail) {
  var bridge = getPlacementLegacyBridge();
  args = Array.isArray(args) ? args : [];
  detail = detail || {};
  if (bridge && typeof bridge[action] === 'function') return bridge[action].apply(bridge, args.concat(detail));
  recordLegacyFallback('legacy.placement.missing', Object.assign({ action: action }, detail));
  if (typeof window !== 'undefined' && typeof window[action] === 'function') return window[action].apply(window, args);
  return null;
}


function loop(now) {
  debugState.frame += 1;
  if (debugState.frame === 1 && typeof markRefactorCheckpoint === 'function') {
    markRefactorCheckpoint('Renderer', 'first-frame-enter', { now: Number(now || 0), phase: debugState.phase || 'boot' });
  }
  const dt = Math.min(0.033, loop.last ? (now - loop.last) / 1000 : 0.016);
  loop.last = now;
  if (typeof document !== 'undefined' && document.hidden) {
    requestAnimationFrame(loop);
    return;
  }
  const loopStartMs = perfNow();
  let updateStartMs = loopStartMs;
  let renderStartMs = loopStartMs;
  let updateEndMs = loopStartMs;
  let renderEndMs = loopStartMs;
  try {
    if (debugState.frame <= 5 || verboseLog) detailLog(`loop:start frame=${debugState.frame} now=${now.toFixed(2)} dt=${dt.toFixed(4)}`);
    updateStartMs = perfNow();
    update(dt);
    try {
      var mainController = window.App && window.App.controllers ? window.App.controllers.main || null : null;
      if (mainController && typeof mainController.tickMainEditorViewRotationAnimation === 'function') {
        mainController.tickMainEditorViewRotationAnimation(now, 'src/presentation/shell/app.js:loop');
      }
    } catch (_) {}
    updateEndMs = perfNow();
    renderStartMs = perfNow();
    var rendererApi = getNamespacePath('renderer.active') || getNamespacePath('renderer.canvas2d') || (window.App && window.App.renderer && (window.App.renderer.active || window.App.renderer.canvas2d));
    if (rendererApi && typeof rendererApi.renderFrame === 'function') rendererApi.renderFrame({ now: now, frame: debugState.frame, source: 'src/presentation/shell/app.js:loop' });
    else render();
    renderEndMs = perfNow();
    recordPerfSample(renderEndMs - loopStartMs, updateEndMs - updateStartMs, renderEndMs - renderStartMs);
    flushPerfSummary(false);
    if (debugState.frame <= 5 || verboseLog) detailLog(`loop:done frame=${debugState.frame}`);
  } catch (err) {
    const detail = formatErrorDetails(err?.message || 'loop failed', 'loop', 0, 0, err);
    detailLog(`[loop-error] ${detail}`);
    errorBanner(`主循环错误：
${detail}`);
    throw err;
  }
  requestAnimationFrame(loop);
}
if (__fullFunctionTraceEnabled) {
  Object.keys(__functionTraceSpec).forEach(function (file) { installFunctionTrace(file, __functionTraceSpec[file]); });
  detailLog('function-trace: installed ' + JSON.stringify(__functionTraceSpec));
} else {
  detailLog('function-trace: disabled full wrapping; mode=targeted-only search=' + JSON.stringify(__traceSearch));
}


safeListen(canvas, 'mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (VIEW_W / rect.width);
  mouse.y = (e.clientY - rect.top) * (VIEW_H / rect.height);
  mouse.inside = true;

  if (lightState.dragAxis) {
    updateLightAxisDrag();
  } else {
    lightState.hoverAxis = hitLightAxis(mouse.x, mouse.y);
  }

  if (mouse.draggingView && editor.mode === 'view' && !lightState.dragAxis) {
    const dx = mouse.x - mouse.panStartX;
    const dy = mouse.y - mouse.panStartY;
    if (window.App && window.App.state && window.App.state.runtimeState && typeof window.App.state.runtimeState.setCamera === 'function') {
      window.App.state.runtimeState.setCamera({ x: mouse.cameraStartX + dx, y: mouse.cameraStartY + dy }, { source: 'app:mousemove.pan-view' });
    } else {
      camera.x = mouse.cameraStartX + dx;
      camera.y = mouse.cameraStartY + dy;
    }
  }
}, 'canvas:mousemove');
safeListen(canvas, 'mouseenter', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (VIEW_W / rect.width);
  mouse.y = (e.clientY - rect.top) * (VIEW_H / rect.height);
  mouse.inside = true;
  if (typeof updatePreview === 'function') {
    try { updatePreview(); } catch (_) {}
  }
}, 'canvas:mouseenter');
safeListen(canvas, 'mouseleave', () => { mouse.inside = false; mouse.draggingView = false; editor.preview = null; lightState.hoverAxis = null; }, 'canvas:mouseleave');
safeListen(canvas, 'wheel', (e) => {
  var rect = canvas.getBoundingClientRect();
  var sx = (e.clientX - rect.left) * (VIEW_W / rect.width);
  var sy = (e.clientY - rect.top) * (VIEW_H / rect.height);
  mouse.x = sx;
  mouse.y = sy;
  mouse.inside = true;

  var placementPreviewActive = !!(editor && editor.mode === 'place' && editor.preview && mouse.inside);
  if (placementPreviewActive) {
    var placementControllerWheel = window.App && window.App.controllers ? window.App.controllers.placement || null : null;
    if (placementControllerWheel && typeof placementControllerWheel.rotatePreviewFacingByWheel === 'function') {
      placementControllerWheel.rotatePreviewFacingByWheel(e.deltaY, 'canvas.wheel.preview-facing');
    } else if (placementControllerWheel && typeof placementControllerWheel.rotatePreviewFacing === 'function') {
      placementControllerWheel.rotatePreviewFacing(e.deltaY < 0 ? 1 : -1, 'canvas.wheel.preview-facing:fallback');
    } else {
      if (typeof pushLog === 'function') pushLog('[preview-facing] controller missing; wheel ignored to avoid presentation direct state write');
    }
    if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
    if (typeof updatePreview === 'function') { try { updatePreview(); } catch (_) {} }
    e.preventDefault();
    return;
  }

  var anchorWorld = screenToFloor(sx, sy);
  var factor = e.deltaY < 0 ? 1.1 : 0.9;
  if (applyWorldDisplayScale(settings.worldDisplayScale * factor, anchorWorld, { x: sx, y: sy })) {
    e.preventDefault();
  }
}, 'canvas:wheel');
safeListen(canvas, 'mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (VIEW_W / rect.width);
  mouse.y = (e.clientY - rect.top) * (VIEW_H / rect.height);
  mouse.inside = true;
  if (typeof updatePreview === 'function' && (editor.mode === 'place' || editor.mode === 'drag' || editor.mode === 'delete')) {
    try { updatePreview(); } catch (_) {}
  }

  if (e.button === 0 && typeof shadowProbeState !== 'undefined' && shadowProbeState && shadowProbeState.markMode) {
    const face = (typeof pickFaceAtScreen === 'function') ? pickFaceAtScreen(mouse.x, mouse.y, xrayFaces) : null;
    if (face && typeof setShadowProbeMarkerFromFace === 'function') {
      setShadowProbeMarkerFromFace(face, mouse.x, mouse.y, 'manual-mark');
    } else {
      if (typeof pushLog === 'function') pushLog('[shadow-probe] mark miss at (' + mouse.x.toFixed(1) + ',' + mouse.y.toFixed(1) + ')');
    }
    e.preventDefault();
    return;
  }
  const axis = hitLightAxis(mouse.x, mouse.y);
  if (e.button === 0 && axis) {
    startLightAxisDrag(axis);
    return;
  }

  if (e.button === 2) {
    pushLog('mouse: right-click cancel');
    var placementControllerCancel = window.App && window.App.controllers ? window.App.controllers.placement || null : null;
    if (placementControllerCancel && typeof placementControllerCancel.cancelDrag === 'function') placementControllerCancel.cancelDrag('presentation.app:canvas-right-click-cancel');
    else callPlacementBridge('cancelDrag', [], { source: 'presentation.app:canvas-right-click-cancel' });
    e.preventDefault();
    return;
  }

  if (editor.mode === 'view') {
    mouse.draggingView = true;
    mouse.panStartX = mouse.x;
    mouse.panStartY = mouse.y;
    mouse.cameraStartX = camera.x;
    mouse.cameraStartY = camera.y;
    mouse.viewDownX = mouse.x;
    mouse.viewDownY = mouse.y;
    pushLog(`mouse: start-pan at (${mouse.x.toFixed(1)},${mouse.y.toFixed(1)}) camera=(${camera.x.toFixed(1)},${camera.y.toFixed(1)})`);
    return;
  }

  if (editor.mode === 'delete') {
    const picked = pickBoxAtScreen(mouse.x, mouse.y);
    requestDeleteFromPickedBox(picked, { source: 'canvas.mousedown.delete' });
    return;
  }

  pushLog(`mouse: left-click mode=${editor.mode} shift=${e.shiftKey} preview=${editor.preview ? JSON.stringify({valid:editor.preview.valid, reason:editor.preview.reason, prefabId:editor.preview.prefabId || null, origin:editor.preview.origin || null, box:editor.preview.box || null, boxesCount:editor.preview.boxes ? editor.preview.boxes.length : 0, overlapIds:editor.preview.overlapIds || []}) : 'null'}`);

  if (editor.mode === 'drag') {
    pushLog('mouse: drag mode -> commitPreview');
    var placementControllerCommit = window.App && window.App.controllers ? window.App.controllers.placement || null : null;
    if (placementControllerCommit && typeof placementControllerCommit.commitPreview === 'function') placementControllerCommit.commitPreview('presentation.app:drag-commit-preview');
    else callPlacementBridge('commitPreview', [], { source: 'presentation.app:drag-commit-preview' });
    return;
  }

  if (!e.shiftKey) {
    if (editor.mode === 'place') {
      pushLog('mouse: normal left -> commitPreview');
      var placementControllerPlace = window.App && window.App.controllers ? window.App.controllers.placement || null : null;
      if (placementControllerPlace && typeof placementControllerPlace.commitPreview === 'function') placementControllerPlace.commitPreview('canvas.mousedown.place');
      else requestPlaceFromPreview(editor.preview, { source: 'canvas.mousedown.place' });
      return;
    }
    pushLog('mouse: normal left -> commitPreview');
    var placementControllerNormalCommit = window.App && window.App.controllers ? window.App.controllers.placement || null : null;
    if (placementControllerNormalCommit && typeof placementControllerNormalCommit.commitPreview === 'function') placementControllerNormalCommit.commitPreview('presentation.app:normal-commit-preview');
    else callPlacementBridge('commitPreview', [], { source: 'presentation.app:normal-commit-preview' });
    return;
  }

  const picked = pickBoxAtScreen(mouse.x, mouse.y);
  if (picked) {
    pushLog(`mouse: shift-pick ${describeBox(picked)}`);
    var placementControllerStartDrag = window.App && window.App.controllers ? window.App.controllers.placement || null : null;
    if (placementControllerStartDrag && typeof placementControllerStartDrag.startDragging === 'function') placementControllerStartDrag.startDragging(picked, 'presentation.app:shift-pick-start-drag');
    else callPlacementBridge('startDragging', [picked], { source: 'presentation.app:shift-pick-start-drag' });
  } else {
    pushLog('mouse: shift-pick none');
  }
}, 'canvas:mousedown');
safeListen(window, 'mouseup', () => {
  if (mouse.draggingView) {
    pushLog(`mouse: end-pan camera=(${camera.x.toFixed(1)},${camera.y.toFixed(1)})`);
    if (editor.mode === 'view' && !lightState.dragAxis) {
      var dx = mouse.x - (mouse.viewDownX || mouse.panStartX || mouse.x);
      var dy = mouse.y - (mouse.viewDownY || mouse.panStartY || mouse.y);
      if (Math.hypot(dx, dy) < 6) {
        var picked = pickBoxAtScreen(mouse.x, mouse.y);
        var targetInst = picked ? callPlacementBridge('findInstanceForBox', [picked], { source: 'presentation.app:view-select-find-instance' }) : null;
        if (targetInst) {
          setSelectedInstance(targetInst.instanceId);
          setActivePanelTab('items');
          refreshInspectorPanels();
          pushLog(`inspect: selected ${targetInst.instanceId}:${getPrefabById(targetInst.prefabId).name}`);
        } else {
          clearSelectedInstance();
          refreshInspectorPanels();
          pushLog('inspect: cleared selection');
        }
      }
    }
  }
  mouse.draggingView = false;
  lightState.dragAxis = null;
  lightState.dragStartMouse = null;
  lightState.dragStartLight = null;
}, 'window:mouseup');
safeListen(canvas, 'contextmenu', (e) => e.preventDefault(), 'canvas:contextmenu');

safeListen(window, 'keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'g' && !e.repeat) { showDebug = !showDebug; ui.showDebugBox.checked = showDebug; }
  else if (k === 't' && !e.repeat) { xrayFaces = !xrayFaces; ui.xrayFaces.checked = xrayFaces; }
  else if (k === 'l' && !e.repeat) { showFrontLines = !showFrontLines; ui.showFrontLines.checked = showFrontLines; }
  else if (k === 'o' && !e.repeat) { showFaceDebugOverlay = !showFaceDebugOverlay; if (ui.showFaceDebugOverlay) ui.showFaceDebugOverlay.checked = showFaceDebugOverlay; }
  else if (k === 'm' && !e.repeat) { if (typeof setShadowProbeMarkMode === 'function') setShadowProbeMarkMode(!(shadowProbeState && shadowProbeState.markMode), 'key-m'); }
  else if (k === 'n' && !e.repeat) { if (typeof clearShadowProbeMarker === 'function') clearShadowProbeMarker('key-n'); }
  else if (k === 'p' && !e.repeat) { if (typeof captureShadowProbeFrame === 'function') captureShadowProbeFrame('key-p'); }
  else if (k === 'u' && !e.repeat) { lightState.showAxes = !lightState.showAxes; }
  else if (k === '[' && !e.repeat) {
    var mainControllerRotateLeft = window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (mainControllerRotateLeft && typeof mainControllerRotateLeft.rotateMainEditorView === 'function') mainControllerRotateLeft.rotateMainEditorView(-1, 'window.keydown:[');
    if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
  }
  else if (k === ']' && !e.repeat) {
    var mainControllerRotateRight = window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (mainControllerRotateRight && typeof mainControllerRotateRight.rotateMainEditorView === 'function') mainControllerRotateRight.rotateMainEditorView(1, 'window.keydown:]');
    if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
  }
  else if (k === 'r' && !e.repeat) resetPlayer();
  else if ((k === 'v' || k === 'b' || k === 'x') && !e.repeat) {
    var placementControllerMode = window.App && window.App.controllers ? window.App.controllers.placement || null : null;
    var modeMap = { v: 'view', b: 'place', x: 'delete' };
    if (placementControllerMode && typeof placementControllerMode.handleModeButton === 'function') placementControllerMode.handleModeButton(modeMap[k], 'window.keydown:' + k);
    else { var stateActions = getAppStateActions(); if (stateActions && typeof stateActions.requestModeChange === 'function') stateActions.requestModeChange(modeMap[k], { source: 'window.keydown:' + k }); else requestEditorModeChange(modeMap[k], { source: 'window.keydown:' + k }); }
  }
  else if (k === 'q' && !e.repeat) {
    var placementControllerFacing = window.App && window.App.controllers ? window.App.controllers.placement || null : null;
    if (placementControllerFacing && typeof placementControllerFacing.rotatePreviewFacing === 'function') placementControllerFacing.rotatePreviewFacing(-1, 'window.keydown:q');
    else if (typeof pushLog === 'function') pushLog('[preview-facing] controller missing; Q key ignored to avoid presentation direct state write');
    if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
    pushLog(`key: preview-facing-left -> ${editor.previewFacing}`);
  }
  else if (k === 'e' && !e.repeat) {
    var placementControllerFacing2 = window.App && window.App.controllers ? window.App.controllers.placement || null : null;
    if (placementControllerFacing2 && typeof placementControllerFacing2.rotatePreviewFacing === 'function') placementControllerFacing2.rotatePreviewFacing(1, 'window.keydown:e');
    else if (typeof pushLog === 'function') pushLog('[preview-facing] controller missing; E key ignored to avoid presentation direct state write');
    if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
    pushLog(`key: preview-facing-right -> ${editor.previewFacing}`);
  }
  else if (/^[1-7]$/.test(k) && !e.repeat) {
    var nextIndex = clamp(Number(k) - 1, 0, Math.min(PREFAB_KEY_LIMIT, prototypes.length) - 1);
    var placementController = window.App && window.App.controllers ? window.App.controllers.placement || null : null;
    if (placementController && typeof placementController.applyPlacementIntent === 'function') {
      placementController.applyPlacementIntent({ prefabIndex: nextIndex, source: 'window.keydown:' + k, mode: 'place', forcePreview: true, syncUi: true });
    } else {
      var stateActions = getAppStateActions();
      if (stateActions && typeof stateActions.selectPrefabByIndex === 'function') stateActions.selectPrefabByIndex(nextIndex, { source: 'window.keydown:' + k });
      else {
        var registryApi = (window.App && window.App.state && window.App.state.prefabRegistry) ? window.App.state.prefabRegistry : null;
        if (registryApi && typeof registryApi.setSelectedPrototypeIndex === 'function') registryApi.setSelectedPrototypeIndex(nextIndex, { source: 'window.keydown:' + k });
        else {
          editor.prototypeIndex = nextIndex;
          if (ui.prefabSelect) ui.prefabSelect.value = String(editor.prototypeIndex);
        }
      }
      if (placementController && typeof placementController.handleModeButton === 'function') placementController.handleModeButton('place', 'window.keydown:' + k);
      else if (stateActions && typeof stateActions.requestModeChange === 'function') stateActions.requestModeChange('place', { source: 'window.keydown:' + k });
      else requestEditorModeChange('place', { source: 'window.keydown:' + k });
      if (placementController && typeof placementController.syncPlacementUi === 'function') placementController.syncPlacementUi({ source: 'window.keydown:' + k, forcePreview: true });
      else updatePreview();
    }
    pushLog(`key: prefab -> ${currentProto().name}`);
  }
  keys.add(k);
  if (k.startsWith('arrow')) e.preventDefault();
}, 'window:keydown');
safeListen(window, 'keyup', (e) => keys.delete(e.key.toLowerCase()), 'window:keyup');

detailLog('boot-seq: begin app-shell bootstrap');
var explicitDeps = resolveMainExplicitDependencies();
var appShellApi = explicitDeps.appShellApi;
if (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
  window.__APP_NAMESPACE.bind('boot.main', { owner: 'src/presentation/shell/app.js', entry: (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO || null) }, { owner: 'src/presentation/shell/app.js', legacy: [], phase: 'P2-A' });
}
emitP2Main('BOUNDARY', 'explicit-deps-bound', {
  phase: 'P2-B',
  appShell: !!explicitDeps.appShellApi,
  runtimeState: !!explicitDeps.runtimeStateApi,
  serviceKeys: explicitDeps.serviceRoot ? Object.keys(explicitDeps.serviceRoot) : [],
  shellKeys: explicitDeps.shellRoot ? Object.keys(explicitDeps.shellRoot) : []
});
emitP2Main('SUMMARY', 'explicit-dependency-bindings', {
  phase: 'P2-B',
  sourcePriority: ['App.*', 'legacy-bridge'],
  appShellSource: (getNamespacePath('shell.appShell') ? 'App.shell.appShell' : 'missing')
});
if (appShellApi && typeof appShellApi.initializeMainApp === 'function') {
  appShellApi.initializeMainApp();
} else {
  errorBanner('启动阶段错误：\nApp.shell.appShell.initializeMainApp 未就绪');
}



function getAppAssetWorkflow() {
  try { return window.App && window.App.services ? window.App.services.assetWorkflow || null : null; } catch (_) { return null; }
}

function getAppEditorHandoffController() {
  try { return window.App && window.App.controllers ? window.App.controllers.editorHandoff || null : null; } catch (_) { return null; }
}

function getAppEditorHandoffService() {
  try { return window.App && window.App.services ? window.App.services.editorHandoff || null : null; } catch (_) { return null; }
}

function getAppStateActions() {
  try { return window.App && window.App.state && window.App.state.actions ? window.App.state.actions : (window.__STATE_ACTIONS__ || null); } catch (_) { return window.__STATE_ACTIONS__ || null; }
}

function dispatchAppEditorHandoff(action, payload) {
  try {
    if (window.App && window.App.controllers && typeof window.App.controllers.dispatch === 'function') {
      var dispatched = window.App.controllers.dispatch('editorHandoff', action, payload);
      if (dispatched && dispatched.ok !== false) return dispatched;
    }
  } catch (_) {}
  var c = getAppEditorHandoffController();
  try {
    if (c && typeof c.dispatch === 'function') return c.dispatch(action, payload);
  } catch (_) {}
  return null;
}

function emitP8XMain(kind, message, extra) {
  var line = '[P8X][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (err) { line += ' "[unserializable]"'; }
  }
  try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (err) { try { console.log(line); } catch (_) {} }
  return line;
}


async function runEditorReturnAssetScan(force, source) {
  var workflow = getAppAssetWorkflow();
  if (workflow && typeof workflow.runAssetScan === 'function') {
    return await workflow.runAssetScan({ force: !!force, source: String(source || 'app:editor-return-asset-scan') });
  }
  return { ok: false, reason: 'missing-asset-workflow-service' };
}

function emitP1bMain(kind, message, extra) {
  var line = '[P1b][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (err) { line += ' "[unserializable]"'; }
  }
  try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (err) { try { console.log(line); } catch (_) {} }
  return line;
}

function readEditorMainHandoff() {
  var service = getAppEditorHandoffService();
  if (!service || typeof service.readHandoff !== 'function') return null;
  return service.readHandoff({ source: 'presentation:app-read-editor-handoff' });
}

function clearEditorMainHandoff() {
  var service = getAppEditorHandoffService();
  if (!service || typeof service.clearHandoff !== 'function') return false;
  return service.clearHandoff({ source: 'presentation:app-clear-editor-handoff' });
}

async function processEditorReturn(reason) {
  try {
    var params = new URLSearchParams(String(location.search || ''));
    var fromEditor = params.get('fromEditor') === '1';
    var handoff = readEditorMainHandoff();
    if (!fromEditor && !handoff) return false;
    emitP1bMain('SUMMARY', 'return-from-editor-detected', {
      reason: reason || 'startup',
      fromEditorQuery: fromEditor,
      handoffKind: handoff && handoff.kind ? handoff.kind : null,
      prefabId: handoff && handoff.prefabId ? handoff.prefabId : (params.get('prefabId') || null),
      savedAtMs: handoff && handoff.savedAtMs ? handoff.savedAtMs : null
    });
    if (getAppAssetWorkflow()) {
      await runEditorReturnAssetScan(true, 'app:return-from-editor');
      emitP1bMain('SUMMARY', 'prefab-rescan-after-editor', {
        reason: reason || 'startup',
        prototypeCount: Array.isArray(prototypes) ? prototypes.length : null,
        prefabId: handoff && handoff.prefabId ? handoff.prefabId : (params.get('prefabId') || null)
      });
    }
    var targetPrefabId = handoff && handoff.prefabId ? handoff.prefabId : (params.get('prefabId') || '');
    if (targetPrefabId && Array.isArray(prototypes)) {
      var placementController = window.App && window.App.controllers ? window.App.controllers.placement || null : null;
      var stateActions = getAppStateActions();
      var registryApi = (window.App && window.App.state && window.App.state.prefabRegistry) ? window.App.state.prefabRegistry : null;
      var idx = prototypes.findIndex(function (p) { return p && p.id === targetPrefabId; });
      if (idx >= 0) {
        if (placementController && typeof placementController.applyPlacementIntent === 'function') {
          placementController.applyPlacementIntent({ prefabId: targetPrefabId, source: 'p1b:return-from-editor', mode: 'place', forcePreview: true, requeuePreview: true, syncUi: true });
        } else {
          if (stateActions && typeof stateActions.requestModeChange === 'function') stateActions.requestModeChange('place', { source: 'p1b:return-from-editor' });
          else if (typeof requestEditorModeChange === 'function') requestEditorModeChange('place', { source: 'p1b:return-from-editor' });
          if (placementController && typeof placementController.syncPlacementUi === 'function') placementController.syncPlacementUi({ source: 'p1b:return-from-editor', forcePreview: true, requeuePreview: true });
          else if (typeof updatePreview === 'function') {
            try { updatePreview(); } catch (_) {}
            try { requestAnimationFrame(function () { try { updatePreview(); } catch (_) {} }); } catch (_) {}
          }
        }
        emitP1bMain('SUMMARY', 'prefab-selected-after-editor', { prefabId: targetPrefabId, prototypeIndex: idx, reason: reason || 'startup' });
      } else {
        emitP1bMain('INVARIANT', 'prefab-select-after-editor-miss', { prefabId: targetPrefabId, prototypeCount: Array.isArray(prototypes) ? prototypes.length : null, reason: reason || 'startup' });
      }
    }
    clearEditorMainHandoff();
    return true;
  } catch (err) {
    emitP1bMain('INVARIANT', 'return-from-editor-failed', { reason: reason || 'startup', error: err && err.message ? err.message : String(err) });
    return false;
  }
}

setTimeout(function () { var dispatched = dispatchAppEditorHandoff('processEditorReturn', ['startup']); if (dispatched) dispatched; else { var c = getAppEditorHandoffController(); if (c && typeof c.processEditorReturn === 'function') c.processEditorReturn('startup'); else processEditorReturn('startup'); } }, 0);

if (getAppAssetWorkflow() || getAppEditorHandoffController() || getAppEditorHandoffService()) {
  window.addEventListener('focus', () => { var c = getAppEditorHandoffController(); try { var dispatched = dispatchAppEditorHandoff('processEditorReturn', ['focus']); if (dispatched) dispatched; else if (c && typeof c.processEditorReturn === 'function') c.processEditorReturn('focus'); else processEditorReturn('focus'); } catch (_) {} try { var scanDispatched = dispatchAppEditorHandoff('runAssetScan', [{ force: true, source: 'app:window-focus' }]); if (scanDispatched) scanDispatched; else if (c && typeof c.runAssetScan === 'function') c.runAssetScan({ force: true, source: 'app:window-focus' }); else runEditorReturnAssetScan(true, 'app:window-focus'); } catch {} });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { var c = getAppEditorHandoffController(); try { var dispatched = dispatchAppEditorHandoff('processEditorReturn', ['visibility']); if (dispatched) dispatched; else if (c && typeof c.processEditorReturn === 'function') c.processEditorReturn('visibility'); else processEditorReturn('visibility'); } catch (_) {} try { var scanDispatched = dispatchAppEditorHandoff('runAssetScan', [{ force: true, source: 'app:visibility-visible' }]); if (scanDispatched) scanDispatched; else if (c && typeof c.runAssetScan === 'function') c.runAssetScan({ force: true, source: 'app:visibility-visible' }); else runEditorReturnAssetScan(true, 'app:visibility-visible'); } catch {} } });
}
