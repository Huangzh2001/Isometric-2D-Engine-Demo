// v1 split file generated from original monolithic app.js
// 注意：此文件为保持行为稳定的第一刀拆分，允许存在少量跨层函数。

// Step-06: canvas/ctx/ui moved to src/presentation/shell/dom-registry.js
/* moved */
if (typeof bindLoggingUi === 'function') bindLoggingUi(ui);

function getStateNamespacePath(path) {
  if (typeof window === 'undefined' || !window.__APP_NAMESPACE || typeof window.__APP_NAMESPACE.getPath !== 'function') return null;
  return window.__APP_NAMESPACE.getPath(path);
}

var __lightingStateApi = getStateNamespacePath('state.lightingState');
var __prefabRegistryApi = getStateNamespacePath('state.prefabRegistry');
var __domRegistryApi = getStateNamespacePath('shell.domRegistry');
var __runtimeStateApi = getStateNamespacePath('state.runtimeState');
var __sceneGraphApi = getStateNamespacePath('state.sceneGraph');
var __sceneSessionApi = getStateNamespacePath('state.sceneSession');
function getPlacementLegacyBridgeState() {
  return getStateNamespacePath('legacy.placement') || (typeof window !== 'undefined' ? window.__PLACEMENT_LEGACY_BRIDGE__ || null : null);
}
function callLegacyPlacement(action, args, meta) {
  args = Array.isArray(args) ? args : [];
  meta = meta || {};
  var bridge = getPlacementLegacyBridgeState();
  if (bridge && typeof bridge[action] === 'function') return bridge[action].apply(bridge, args.concat(meta));
  if (typeof window !== 'undefined' && typeof window[action] === 'function') return window[action].apply(window, args);
  return null;
}

if (typeof setRefactorStep === 'function') {
  setRefactorStep('Phase-A-02', {
    entry: (typeof window !== 'undefined' && (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO)) ? (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO) : null,
    note: 'tighten frontend service boundaries, reduce duplicate request orchestration logs, and partially dedupe repeated asset scan imports without changing backend behavior'
  });
}
if (typeof markRefactorCheckpoint === 'function') {
  markRefactorCheckpoint('Bootstrap', 'ui-bound', {
    entryFile: (typeof APP_ENTRY_INFO !== 'undefined' && APP_ENTRY_INFO && APP_ENTRY_INFO.entryFile) ? APP_ENTRY_INFO.entryFile : 'unknown',
    hasCanvas: !!canvas,
    hasDebugLog: !!(ui && ui.debugLog)
  });
  markRefactorCheckpoint('Bootstrap', 'logging-ready', {
    loggerBound: typeof bindLoggingUi === 'function',
    uiKeys: Object.keys(ui || {}).length
  });
  markRefactorCheckpoint('SceneKeys', 'shared-keys-ready', {
    owner: window.__SCENE_STORAGE_KEYS && window.__SCENE_STORAGE_KEYS.owner,
    sceneKey: typeof LOCAL_SCENE_STORAGE_KEY !== 'undefined' ? LOCAL_SCENE_STORAGE_KEY : null,
    prefabKey: typeof LOCAL_PREFAB_STORAGE_KEY !== 'undefined' ? LOCAL_PREFAB_STORAGE_KEY : null,
    sceneApiSave: typeof SCENE_API_SAVE_URL !== 'undefined' ? SCENE_API_SAVE_URL : null,
  });
  markRefactorCheckpoint('LightingState', 'shared-state-ready', {
    owner: __lightingStateApi && __lightingStateApi.owner,
    lightCount: Array.isArray(lights) ? lights.length : null,
    activeLightId: typeof activeLightId !== 'undefined' ? activeLightId : null,
  });
  markRefactorCheckpoint('LightingEditor', 'editor-api-ready', {
    owner: window.__LIGHTING_EDITOR_API && window.__LIGHTING_EDITOR_API.owner,
    hasLightList: !!(ui && ui.lightList),
    hasLightingEnabledToggle: !!(ui && ui.lightingEnabled),
  });
  markRefactorCheckpoint('LightingRender', 'render-api-ready', {
    owner: window.__LIGHTING_RENDER_API && window.__LIGHTING_RENDER_API.owner,
    hasGlow: !!(window.__LIGHTING_RENDER_API && window.__LIGHTING_RENDER_API.renderLightingGlow),
    hasShadowPass: !!(window.__LIGHTING_RENDER_API && window.__LIGHTING_RENDER_API.renderLightingShadows),
  });
  markRefactorCheckpoint('PrefabRegistry', 'registry-api-ready', {
    owner: __prefabRegistryApi && __prefabRegistryApi.owner,
    prototypeCount: __prefabRegistryApi && __prefabRegistryApi.getPrototypeCount ? __prefabRegistryApi.getPrototypeCount() : null,
    builtInCount: __prefabRegistryApi && __prefabRegistryApi.getBuiltInCount ? __prefabRegistryApi.getBuiltInCount() : null,
  });
  markRefactorCheckpoint('DomRegistry', 'dom-api-ready', {
    owner: __domRegistryApi && __domRegistryApi.owner,
    keyCount: __domRegistryApi && __domRegistryApi.getKeyCount ? __domRegistryApi.getKeyCount() : null,
    missingKeyCount: __domRegistryApi && __domRegistryApi.getMissingKeys ? __domRegistryApi.getMissingKeys().length : null,
    hasCanvas: !!canvas,
  });
  markRefactorCheckpoint('RuntimeState', 'runtime-state-ready', Object.assign({
    owner: __runtimeStateApi && __runtimeStateApi.owner
  }, (__runtimeStateApi && __runtimeStateApi.summarize ? __runtimeStateApi.summarize() : {})));
  markRefactorCheckpoint('SceneSession', 'scene-session-ready', Object.assign({
    owner: __sceneSessionApi && __sceneSessionApi.owner
  }, (__sceneSessionApi && typeof __sceneSessionApi.summarizeSession === 'function' ? __sceneSessionApi.summarizeSession() : {})));
  if (typeof logCompatMapping === 'function') {
    logCompatMapping('LOCAL_SCENE_STORAGE_KEY', 'src/core/scene/scene-keys.js');
    logCompatMapping('saveScene', 'src/infrastructure/storage/scene-storage.js');
    logCompatMapping('loadScene', 'src/infrastructure/storage/scene-storage.js');
    logCompatMapping('buildSceneSnapshot', 'src/infrastructure/storage/scene-storage.js');
    logCompatMapping('applySceneSnapshot', 'src/infrastructure/storage/scene-storage.js');
    logCompatMapping('repairSceneSnapshot', 'src/infrastructure/storage/scene-storage.js');
    logCompatMapping('repairLegacySceneSnapshot', 'src/infrastructure/storage/scene-storage.js');
    logCompatMapping('restoreScenePrefabRefs', 'src/infrastructure/storage/scene-storage.js');
    logCompatMapping('restoreSceneHabboRefs', 'src/infrastructure/storage/scene-storage.js');
    logCompatMapping('applyLightingPreset', 'src/core/lighting/lighting-state.js');
    logCompatMapping('normalizeLight', 'src/core/lighting/lighting-state.js');
    logCompatMapping('bindLightingUi', 'src/presentation/lighting/lighting-editor.js');
    logCompatMapping('syncLightUI', 'src/presentation/lighting/lighting-editor.js');
    logCompatMapping('renderLightList', 'src/presentation/lighting/lighting-editor.js');
    logCompatMapping('hitLightAxis', 'src/presentation/lighting/lighting-editor.js');
    logCompatMapping('renderLightingShadows', 'src/presentation/lighting/lighting-render.js');
    logCompatMapping('renderLightingGlow', 'src/presentation/lighting/lighting-render.js');
    logCompatMapping('drawLightingBulb', 'src/presentation/lighting/lighting-render.js');
    logCompatMapping('drawLightingAxes', 'src/presentation/lighting/lighting-render.js');
    logCompatMapping('normalizePrefab', 'src/core/state/prefab-registry.js');
    logCompatMapping('ensurePrefabRegistered', 'src/core/state/prefab-registry.js');
    logCompatMapping('getPrefabById', 'src/core/state/prefab-registry.js');
    logCompatMapping('prefabVariant', 'src/core/state/prefab-registry.js');
    logCompatMapping('prototypes', 'src/core/state/prefab-registry.js');
    logCompatMapping('setActivePanelTab', 'src/presentation/ui/ui-tabs.js');
    logCompatMapping('refreshAssetScanStatus', 'src/presentation/ui/ui-inspectors.js');
    logCompatMapping('refreshItemInspector', 'src/presentation/ui/ui-inspectors.js');
    logCompatMapping('refreshPlayerInspector', 'src/presentation/ui/ui-inspectors.js');
    logCompatMapping('refreshWorldInspector', 'src/presentation/ui/ui-inspectors.js');
    logCompatMapping('refreshInspectorPanels', 'src/presentation/ui/ui-inspectors.js');
    logCompatMapping('setHabboLibraryVisibility', 'src/presentation/ui/ui-habbo-library.js');
    logCompatMapping('renderHabboLibraryBrowser', 'src/presentation/ui/ui-habbo-library.js');
    logCompatMapping('openHabboLibraryBrowser', 'src/presentation/ui/ui-habbo-library.js');
    logCompatMapping('bindHabboLibraryUi', 'src/presentation/ui/ui-habbo-library.js');
    logCompatMapping('canvas', 'src/presentation/shell/dom-registry.js');
    logCompatMapping('ui', 'src/presentation/shell/dom-registry.js');
    logCompatMapping('mouse', 'src/core/state/runtime-state.js');
    logCompatMapping('camera', 'src/core/state/runtime-state.js');
    logCompatMapping('settings', 'src/core/state/runtime-state.js');
    logCompatMapping('editor', 'src/core/state/runtime-state.js');
    logCompatMapping('player', 'src/core/state/runtime-state.js');
    logCompatMapping('inspectorState', 'src/core/state/runtime-state.js');
  }
  markRefactorCheckpoint('Cleanup', 'cleanup-ready', {
    owner: 'src/infrastructure/legacy/state.js',
    removedLegacyEntries: 6,
    removedCompatMappings: 6,
    removedFallbackRoutes: 1,
    keptCompatMappings: 43,
    keptFallbackRoutes: 2
  });
  if (typeof refactorLogCurrent === 'function') {
    refactorLogCurrent('Cleanup', 'cleanup-legacy-entry removed -> requestPrefabSelectRefresh', { owner: 'src/infrastructure/assets/asset-management.js', reason: 'unused-global-alias' });
    refactorLogCurrent('Cleanup', 'cleanup-legacy-entry removed -> window.initializeMainApp', { owner: 'src/presentation/shell/app-shell.js', reason: 'use-app-shell-api-object' });
    refactorLogCurrent('Cleanup', 'cleanup-legacy-entry removed -> window.bootstrapApplication', { owner: 'src/presentation/shell/app-shell.js', reason: 'api-object-only' });
    refactorLogCurrent('Cleanup', 'cleanup-legacy-entry removed -> window.bindApplicationModules', { owner: 'src/presentation/shell/app-shell.js', reason: 'api-object-only' });
    refactorLogCurrent('Cleanup', 'cleanup-legacy-entry removed -> window.runStartupRestorePipeline', { owner: 'src/presentation/shell/app-shell.js', reason: 'api-object-only' });
    refactorLogCurrent('Cleanup', 'cleanup-legacy-entry removed -> window.runStartupAssetPipeline', { owner: 'src/presentation/shell/app-shell.js', reason: 'api-object-only' });

    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping removed -> importPrefabDefinition', { owner: 'src/infrastructure/legacy/state.js', reason: 'asset-import-self-reported' });
    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping removed -> registerImportedPrefab', { owner: 'src/infrastructure/legacy/state.js', reason: 'asset-import-self-reported' });
    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping removed -> prepareImportedPrefabForPlacement', { owner: 'src/infrastructure/legacy/state.js', reason: 'asset-import-self-reported' });
    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping removed -> selectImportedPrefabForEditor', { owner: 'src/infrastructure/legacy/state.js', reason: 'asset-import-self-reported' });
    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping removed -> enterPlacementModeForImportedPrefab', { owner: 'src/infrastructure/legacy/state.js', reason: 'asset-import-self-reported' });
    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping removed -> dedupeImportedPrefab', { owner: 'src/infrastructure/legacy/state.js', reason: 'asset-import-self-reported' });

    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping kept -> saveScene', { reason: 'still-needed-across-ui-and-app-shell' });
    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping kept -> loadScene', { reason: 'still-needed-across-ui-and-app-shell' });
    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping kept -> refreshInspectorPanels', { reason: 'still-needed-across-import-placement-and-selection' });
    refactorLogCurrent('Cleanup', 'cleanup-compat-mapping kept -> editor/runtime globals', { reason: 'unsafe-to-remove-before-final-render-pass' });

    refactorLogCurrent('Cleanup', 'cleanup-fallback-route removed -> src/presentation/shell/app.js:initializeMainApp-missing', { owner: 'src/presentation/shell/app.js', reason: 'app-shell-api-required' });
    refactorLogCurrent('Cleanup', 'cleanup-fallback-route kept -> asset-management-ownership-check', { owner: 'src/infrastructure/assets/asset-management.js', reason: 'unsafe-to-remove' });
    refactorLogCurrent('Cleanup', 'cleanup-fallback-route kept -> legacy-habbo-prefab-repair', { owner: 'src/infrastructure/legacy/state.js', reason: 'still-needed-for-flat-habbo-recovery' });
  }
}


var VIEW_W = 1180;
var VIEW_H = 780;
var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5));
var WORLD_SIZE_MIN = 6;
var WORLD_SIZE_MAX = 128;
function isServerMode() {
  return /^https?:$/i.test(window.location.protocol);
}
function getCanvasViewportSize() {
  var wrap = canvas ? canvas.parentElement : null;
  var cssW = wrap ? Math.max(640, Math.floor(wrap.clientWidth || 0)) : 1180;
  var cssH = wrap ? Math.max(520, Math.floor(wrap.clientHeight || 0)) : 780;
  return { w: cssW, h: cssH };
}
function configureCanvasForDisplay() {
  if (!canvas) return;
  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5));
  var viewport = getCanvasViewportSize();
  VIEW_W = viewport.w;
  VIEW_H = viewport.h;
  canvas.style.width = `${VIEW_W}px`;
  canvas.style.height = `${VIEW_H}px`;
  canvas.width = Math.round(VIEW_W * dpr);
  canvas.height = Math.round(VIEW_H * dpr);
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }
  detailLog(`canvas-config: css=${VIEW_W}x${VIEW_H} dpr=${dpr.toFixed(2)} backing=${canvas.width}x${canvas.height}`);
}
// Step-06: debugState/shadowProbeState moved to src/core/state/runtime-state.js
function shadowProbeClonePoint3(p) {
  return p ? { x: Number(p.x) || 0, y: Number(p.y) || 0, z: Number(p.z) || 0 } : null;
}

function shadowProbeClonePoint2(p) {
  return p ? { x: Number(p.x) || 0, y: Number(p.y) || 0 } : null;
}

function shadowProbeClonePoly3(poly) {
  return Array.isArray(poly) ? poly.map(shadowProbeClonePoint3).filter(Boolean) : [];
}

function shadowProbeClonePoly2(poly) {
  return Array.isArray(poly) ? poly.map(shadowProbeClonePoint2).filter(Boolean) : [];
}

function shadowProbeBoundsFromPts3(pts) {
  if (!pts || !pts.length) return null;
  var minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    if (!p) continue;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (p.z > maxZ) maxZ = p.z;
  }
  if (!isFinite(minX)) return null;
  return { minX:minX, minY:minY, minZ:minZ, maxX:maxX, maxY:maxY, maxZ:maxZ };
}

function shadowProbeCenterFromPts3(pts) {
  if (!pts || !pts.length) return null;
  var x = 0, y = 0, z = 0, n = 0;
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    if (!p) continue;
    x += Number(p.x) || 0;
    y += Number(p.y) || 0;
    z += Number(p.z) || 0;
    n += 1;
  }
  if (!n) return null;
  return { x: x / n, y: y / n, z: z / n };
}

function shadowProbeMarkerLabel(marker) {
  if (!marker) return 'none';
  var owner = marker.instanceId || marker.boxId || 'none';
  var cell = marker.cell ? ('(' + marker.cell.x + ',' + marker.cell.y + ',' + marker.cell.z + ')') : '(?, ?, ?)';
  return '#' + String(marker.id) + ' ' + String(marker.dir || 'face') + ' ' + String(owner) + ' ' + cell;
}

function getShadowProbeSnapshot() {
  var m = shadowProbeState && shadowProbeState.activeMarker ? shadowProbeState.activeMarker : null;
  return {
    markMode: !!(shadowProbeState && shadowProbeState.markMode),
    active: !!m,
    marker: m ? {
      id: m.id,
      label: shadowProbeMarkerLabel(m),
      dir: m.dir || '',
      boxId: m.boxId || null,
      instanceId: m.instanceId || null,
      cell: m.cell ? { x: m.cell.x, y: m.cell.y, z: m.cell.z } : null,
      planeKey: m.planeKey || '',
      patchId: m.patchId != null ? m.patchId : null,
      center: m.center ? shadowProbeClonePoint3(m.center) : null,
      bounds: m.bounds ? {
        minX: Number(m.bounds.minX), minY: Number(m.bounds.minY), minZ: Number(m.bounds.minZ),
        maxX: Number(m.bounds.maxX), maxY: Number(m.bounds.maxY), maxZ: Number(m.bounds.maxZ)
      } : null,
      frame: m.frame,
      createdAt: m.createdAt,
      screenPick: m.screenPick ? { x: m.screenPick.x, y: m.screenPick.y } : null,
    } : null
  };
}

function setShadowProbeMarkMode(enabled, reason) {
  shadowProbeState.markMode = !!enabled;
  if (typeof pushLog === 'function') pushLog('[shadow-probe] mark-mode ' + (shadowProbeState.markMode ? 'on' : 'off') + (reason ? ' reason=' + reason : ''));
}

function clearShadowProbeMarker(reason) {
  var had = !!(shadowProbeState && shadowProbeState.activeMarker);
  var marker = shadowProbeState ? shadowProbeState.activeMarker : null;
  shadowProbeState.activeMarker = null;
  if (typeof pushStructuredShadowLog === 'function') {
    pushStructuredShadowLog('shadow-probe-clear', {
      reason: reason || 'manual',
      hadMarker: had,
      marker: marker ? getShadowProbeSnapshot().marker : null,
      frame: (typeof debugState !== 'undefined' && debugState) ? debugState.frame : -1
    }, true);
  }
  if (typeof pushLog === 'function') pushLog('[shadow-probe] clear ' + (reason || 'manual') + ' had=' + (had ? '1' : '0'));
}

function setShadowProbeMarkerFromFace(face, sx, sy, reason) {
  if (!face || !face.worldPts || !face.worldPts.length) return null;
  var marker = {
    id: Date.now() + '-' + Math.round(Math.random() * 1000),
    createdAt: Date.now(),
    frame: (typeof debugState !== 'undefined' && debugState) ? debugState.frame : -1,
    reason: reason || 'manual-click',
    boxId: face.boxId || null,
    instanceId: face.instanceId || null,
    dir: face.dir || '',
    cell: face.cell ? { x: face.cell.x, y: face.cell.y, z: face.cell.z } : null,
    planeKey: face.planeKey || '',
    patchId: face.patchId != null ? face.patchId : null,
    worldPts: shadowProbeClonePoly3(face.worldPts),
    screenPoly: shadowProbeClonePoly2(face.poly || []),
    screenPick: { x: Number(sx) || 0, y: Number(sy) || 0 },
    aabb: face.aabb ? JSON.parse(JSON.stringify(face.aabb)) : null,
    fallbackDepth: Number(face.fallbackDepth) || 0,
  };
  marker.bounds = shadowProbeBoundsFromPts3(marker.worldPts);
  marker.center = shadowProbeCenterFromPts3(marker.worldPts);
  shadowProbeState.activeMarker = marker;
  shadowProbeState.markMode = false;
  if (typeof pushStructuredShadowLog === 'function') {
    pushStructuredShadowLog('shadow-probe-mark', {
      reason: marker.reason,
      marker: getShadowProbeSnapshot().marker,
      cameraSig: (typeof cameraSignatureForDebug === 'function') ? cameraSignatureForDebug() : '',
      lightSig: (typeof lightsSignatureForDebug === 'function') ? lightsSignatureForDebug() : '',
      boxesSig: (typeof boxesSignatureForDebug === 'function') ? boxesSignatureForDebug() : ''
    }, true);
  }
  if (typeof pushLog === 'function') pushLog('[shadow-probe] marked ' + shadowProbeMarkerLabel(marker));
  return marker;
}

function captureShadowProbeFrame(reason) {
  var snapshot = (typeof buildSceneSnapshotForDebug === 'function')
    ? buildSceneSnapshotForDebug('shadow-probe-capture', {
        reason: reason || 'manual-capture',
        captureSeq: ++shadowProbeState.captureSeq,
        shadowProbe: getShadowProbeSnapshot()
      })
    : {
        tag: 'shadow-probe-capture',
        reason: reason || 'manual-capture',
        captureSeq: ++shadowProbeState.captureSeq,
        frame: (typeof debugState !== 'undefined' && debugState) ? debugState.frame : -1,
        shadowProbe: getShadowProbeSnapshot()
      };
  if (typeof pushStructuredShadowLog === 'function') pushStructuredShadowLog('shadow-probe-capture', snapshot, true);
  if (typeof pushLog === 'function') pushLog('[shadow-probe] capture seq=' + String(snapshot.extra && snapshot.extra.captureSeq || shadowProbeState.captureSeq) + ' reason=' + String(reason || 'manual-capture'));
  return snapshot;
}

function shadowProbeMatchReceiver(receiverKind, ownerInstanceId, receiverPts, planeKey, patchId) {
  var marker = shadowProbeState && shadowProbeState.activeMarker ? shadowProbeState.activeMarker : null;
  if (!marker || !marker.center || !receiverPts || !receiverPts.length) return null;
  var match = {
    active: true,
    markerId: marker.id,
    markerLabel: shadowProbeMarkerLabel(marker),
    markerDir: marker.dir || '',
    markerOwner: marker.instanceId || null,
    receiverKind: receiverKind || '',
    receiverOwner: ownerInstanceId || null,
    planeKey: planeKey || '',
    patchId: patchId != null ? patchId : null,
    sameKind: String(marker.dir || '') === String(receiverKind || ''),
    sameOwner: !marker.instanceId || String(marker.instanceId) === String(ownerInstanceId || ''),
    containsCenter: false,
    matched: false,
  };
  if (!match.sameKind || !match.sameOwner) return match;
  var rb = shadowProbeBoundsFromPts3(receiverPts);
  if (!rb) return match;
  var c = marker.center;
  var eps = 1e-4;
  if (receiverKind === 'top') {
    match.containsCenter = Math.abs((rb.maxZ || rb.minZ || 0) - c.z) <= eps && c.x >= rb.minX - eps && c.x <= rb.maxX + eps && c.y >= rb.minY - eps && c.y <= rb.maxY + eps;
  } else if (receiverKind === 'east') {
    var px = rb.maxX;
    match.containsCenter = Math.abs(px - c.x) <= eps && c.y >= rb.minY - eps && c.y <= rb.maxY + eps && c.z >= rb.minZ - eps && c.z <= rb.maxZ + eps;
  } else if (receiverKind === 'south') {
    var py = rb.maxY;
    match.containsCenter = Math.abs(py - c.y) <= eps && c.x >= rb.minX - eps && c.x <= rb.maxX + eps && c.z >= rb.minZ - eps && c.z <= rb.maxZ + eps;
  }
  match.receiverBounds = rb;
  match.matched = !!match.containsCenter;
  return match;
}

var perfStats = {
  sampleFrames: 0,
  loopMs: 0,
  updateMs: 0,
  renderMs: 0,
  playerSpriteHits: 0,
  playerSpriteMisses: 0,
  floorRebuilds: 0,
  staticShadowRebuilds: 0,
  staticBoxRebuilds: 0,
};
function perfNow() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
}
function notePlayerSpriteCache(hit, meta = '') {
  if (hit) perfStats.playerSpriteHits += 1;
  else perfStats.playerSpriteMisses += 1;
  if (!hit && (verboseLog || debugState.frame <= 10)) detailLog(`perf:player-sprite-cache miss ${meta}`);
}
function noteLayerRebuild(kind, meta = '') {
  if (kind === 'floor') perfStats.floorRebuilds += 1;
  if (kind === 'static-shadow') perfStats.staticShadowRebuilds += 1;
  if (kind === 'static-box') perfStats.staticBoxRebuilds += 1;
  if (verboseLog || debugState.frame <= 10 || kind === 'static-box' || kind === 'floor' || kind === 'static-shadow') detailLog(`perf:${kind}-rebuild ${meta}`);
}
function recordPerfSample(loopMs, updateMs, renderMs) {
  perfStats.sampleFrames += 1;
  perfStats.loopMs += loopMs;
  perfStats.updateMs += updateMs;
  perfStats.renderMs += renderMs;
  if (loopMs >= 18 || renderMs >= 14) {
    detailLog(`perf:slow-frame frame=${debugState.frame} loopMs=${loopMs.toFixed(2)} updateMs=${updateMs.toFixed(2)} renderMs=${renderMs.toFixed(2)} step=${debugState.renderStep} interactive=${isInteractiveRenderPressure ? isInteractiveRenderPressure() : false}`);
  }
}
function flushPerfSummary(force = false) {
  if (!perfStats.sampleFrames) return;
  if (!force && perfStats.sampleFrames < 30) return;
  var frames = perfStats.sampleFrames;
  detailLog(
    `perf-summary frames=${frames} avgLoopMs=${(perfStats.loopMs / frames).toFixed(2)} avgUpdateMs=${(perfStats.updateMs / frames).toFixed(2)} avgRenderMs=${(perfStats.renderMs / frames).toFixed(2)} playerSpriteCache=${perfStats.playerSpriteHits}H/${perfStats.playerSpriteMisses}M floorRebuilds=${perfStats.floorRebuilds} staticBoxRebuilds=${perfStats.staticBoxRebuilds} staticShadowRebuilds=${perfStats.staticShadowRebuilds} interactive=${isInteractiveRenderPressure ? isInteractiveRenderPressure() : false}`
  );
  perfStats.sampleFrames = 0;
  perfStats.loopMs = 0;
  perfStats.updateMs = 0;
  perfStats.renderMs = 0;
  perfStats.playerSpriteHits = 0;
  perfStats.playerSpriteMisses = 0;
  perfStats.floorRebuilds = 0;
  perfStats.staticShadowRebuilds = 0;
  perfStats.staticBoxRebuilds = 0;
}
function setPhase(phase, step = '') {
  debugState.phase = phase;
  if (phase === 'update') debugState.updateStep = step || debugState.updateStep;
  if (phase === 'render') debugState.renderStep = step || debugState.renderStep;
}
function errorBanner(msg) {
  let banner = document.querySelector('.startupBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'startupBanner';
    document.body.appendChild(banner);
  }
  var text = String(msg == null ? '' : msg);
  banner.textContent = text;
  try {
    var entry = {
      at: new Date().toISOString(),
      message: text,
      phase: debugState && debugState.phase ? String(debugState.phase) : 'unknown',
      frame: debugState && Number.isFinite(Number(debugState.frame)) ? Number(debugState.frame) : 0,
      updateStep: debugState && debugState.updateStep ? String(debugState.updateStep) : '',
      renderStep: debugState && debugState.renderStep ? String(debugState.renderStep) : '',
      lastRenderable: debugState && debugState.lastRenderable ? String(debugState.lastRenderable) : '',
      lastEvent: debugState && debugState.lastEvent ? String(debugState.lastEvent) : ''
    };
    window.__RUNTIME_ERROR_BANNER_HISTORY__ = Array.isArray(window.__RUNTIME_ERROR_BANNER_HISTORY__) ? window.__RUNTIME_ERROR_BANNER_HISTORY__ : [];
    window.__RUNTIME_ERROR_BANNER_HISTORY__.push(entry);
    if (window.__RUNTIME_ERROR_BANNER_HISTORY__.length > 80) window.__RUNTIME_ERROR_BANNER_HISTORY__ = window.__RUNTIME_ERROR_BANNER_HISTORY__.slice(-80);
    window.__LAST_RUNTIME_ERROR_BANNER__ = entry;
    banner.dataset.errorAt = entry.at;
    banner.dataset.errorCount = String(window.__RUNTIME_ERROR_BANNER_HISTORY__.length);
  } catch (_) {}
}
function formatErrorDetails(message, source, lineno, colno, error) {
  const preview = editor && editor.preview ? {
    valid: editor.preview.valid ?? null,
    reason: editor.preview.reason ?? '',
    prefabId: editor.preview.prefabId ?? '',
    hasBox: !!editor.preview.box,
    box: editor.preview.box ? { x: editor.preview.box.x, y: editor.preview.box.y, z: editor.preview.box.z, w: editor.preview.box.w, d: editor.preview.box.d, h: editor.preview.box.h, name: editor.preview.box.name } : null,
    origin: editor.preview.origin ? { x: editor.preview.origin.x, y: editor.preview.origin.y, z: editor.preview.origin.z } : null,
    boxes: editor.preview.boxes ? editor.preview.boxes.length : 0,
  } : null;
  const parts = [
    `message=${message || 'n/a'}`,
    `source=${source || 'n/a'}`,
    `line=${lineno ?? 'n/a'}`,
    `col=${colno ?? 'n/a'}`,
    `phase=${debugState.phase}`,
    `frame=${debugState.frame}`,
    `updateStep=${debugState.updateStep}`,
    `renderStep=${debugState.renderStep}`,
    `lastRenderable=${debugState.lastRenderable}`,
    `lastEvent=${debugState.lastEvent}`,
    `instances=${typeof instances !== 'undefined' ? instances.length : 'n/a'}`,
    `boxes=${typeof boxes !== 'undefined' ? boxes.length : 'n/a'}`,
    `currentPrefab=${typeof currentPrefab === 'function' && currentPrefab() ? currentPrefab().id : 'n/a'}`,
    `editorMode=${editor?.mode ?? 'n/a'}`,
    `preview=${preview ? JSON.stringify(preview) : 'null'}`,
  ];
  if (error && error.stack) parts.push(`stack=${error.stack}`);
  return parts.join(' | ');
}
function safeListen(el, event, handler, label = '') {
  if (!el) return false;
  el.addEventListener(event, (ev) => {
    const tag = label || `${el.id || el.tagName || 'node'}:${event}`;
    debugState.lastEvent = tag;
    const valueBits = [];
    if (ev && 'clientX' in ev) valueBits.push(`client=(${Number(ev.clientX||0).toFixed(1)},${Number(ev.clientY||0).toFixed(1)})`);
    if (ev && 'button' in ev) valueBits.push(`button=${ev.button}`);
    if (ev && 'key' in ev) valueBits.push(`key=${ev.key}`);
    if (el && 'value' in el && typeof el.value !== 'undefined') valueBits.push(`value=${JSON.stringify(el.value)}`);
    detailLog(`[event-start] ${tag}${valueBits.length ? ' | ' + valueBits.join(' | ') : ''}`);
    try {
      const out = handler(ev);
      detailLog(`[event-done] ${tag}`);
      return out;
    } catch (err) {
      const detail = formatErrorDetails(err?.message || `event-handler failed: ${tag}`, 'event-handler', 0, 0, err);
      detailLog(`[event-error] ${detail}`);
      errorBanner(`事件处理错误：
${detail}`);
      throw err;
    }
  });
  return true;
}
function setElValue(el, value) { if (el) el.value = value; }
function setElText(el, value) { if (el) el.textContent = value; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
var missingUiKeys = Object.entries(ui).filter(([, v]) => !v).map(([k]) => k);
rawBootLog(`[env] href=${location.href} userAgent=${navigator.userAgent}`, 'log');
rawBootLog(`[dom] canvas=${!!canvas} ctx=${!!ctx} uiCount=${Object.keys(ui).length}`, 'log');
if (missingUiKeys.length) noteStartupIssue(`缺失 UI 节点: ${missingUiKeys.join(', ')}`);
window.onerror = function(message, source, lineno, colno, error) {
  const detail = formatErrorDetails(message, source, lineno, colno, error);
  rawBootLog(`[runtime-error] ${detail}`, 'error');
  errorBanner(`运行时错误：
${detail}`);
  return false;
};
window.addEventListener('error', (event) => {
  const target = event?.target;
  if (target && target !== window) {
    const tag = target.tagName || 'unknown-target';
    const src = target.src || target.href || target.currentSrc || 'n/a';
    rawBootLog(`[resource-error] tag=${tag} src=${src}`, 'error');
    errorBanner(`资源加载错误：
${tag} ${src}`);
    return;
  }
  const detail = formatErrorDetails(event?.message, event?.filename, event?.lineno, event?.colno, event?.error);
  rawBootLog(`[runtime-error-event] ${detail}`, 'error');
}, true);
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const msg = reason?.stack || String(reason || 'Unhandled rejection');
  rawBootLog(`[promise-error] phase=${debugState.phase} frame=${debugState.frame} reason=${msg}`, 'error');
  errorBanner(`Promise 错误：
${msg}`);
});

configureCanvasForDisplay();

if (typeof markRefactorCheckpoint === 'function') {
  markRefactorCheckpoint('Bootstrap', 'canvas-configured', {
    viewW: VIEW_W,
    viewH: VIEW_H,
    dpr: dpr,
    backingW: canvas ? canvas.width : 0,
    backingH: canvas ? canvas.height : 0
  });
}
window.addEventListener('resize', () => {
  debugState.lastEvent = 'window:resize';
  configureCanvasForDisplay();
  if (typeof applySettings === 'function') applySettings();
});

// Step-06: core runtime vars moved to src/core/state/runtime-state.js
var spriteSliceBuffer = document.createElement('canvas');
var spriteSliceCtx = spriteSliceBuffer.getContext('2d');
var playerSpriteFrameBuffer = document.createElement('canvas');
var playerSpriteFrameCtx = playerSpriteFrameBuffer.getContext('2d');
var playerSpriteFrameCache = {
  key: '',
  frame: 0,
  row: 0,
  xLeft: 0,
  yTop: 0,
  visibleHeight: 0,
  totalH: 1.72,
  brightness: 1,
  tint: { r: 255, g: 255, b: 255 },
  weight: 0,
};

function describeBox(b) {
  return `#${b.id ?? 'preview'} ${b.name ?? 'Box'} @(${b.x},${b.y},${b.z}) ${b.w}x${b.d}x${b.h}`;
}

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (err) {
    return String(value);
  }
}


// scene 存储/恢复相关逻辑已抽离到 src/infrastructure/storage/scene-storage.js
// 这里保留其依赖的全局状态、常量与工具函数定义。


function updateModeButtons() {
  ui.modeView.classList.toggle('active', editor.mode === 'view');
  ui.modePlace.classList.toggle('active', editor.mode === 'place' || editor.mode === 'drag');
  ui.modeDelete.classList.toggle('active', editor.mode === 'delete');
}

function setEditorMode(mode, meta) {
  var source = meta && meta.source ? String(meta.source) : 'state:setEditorMode';
  if (__runtimeStateApi && __runtimeStateApi.logWrite) __runtimeStateApi.logWrite('RuntimeState', 'editor.mode', { from: editor && editor.mode, to: mode, source: source });
  if (mode === 'view') {
    callLegacyPlacement('cancelDrag', [], { source: 'legacy.state:cancelDrag' });
    if (__runtimeStateApi && typeof __runtimeStateApi.setEditorModeValue === 'function') __runtimeStateApi.setEditorModeValue('view', { source: source });
    else editor.mode = 'view';
    editor.preview = null;
  } else if (mode === 'place') {
    if (editor.mode === 'drag' && editor.draggingInstance) callLegacyPlacement('cancelDrag', [], { source: 'legacy.state:cancelDrag-dragging' });
    if (__runtimeStateApi && typeof __runtimeStateApi.setEditorModeValue === 'function') __runtimeStateApi.setEditorModeValue('place', { source: source });
    else editor.mode = 'place';
    updatePreview();
  } else if (mode === 'delete') {
    callLegacyPlacement('cancelDrag', [], { source: 'legacy.state:cancelDrag' });
    if (__runtimeStateApi && typeof __runtimeStateApi.setEditorModeValue === 'function') __runtimeStateApi.setEditorModeValue('delete', { source: source });
    else editor.mode = 'delete';
    editor.preview = null;
  }
  pushLog(`mode: ${mode}`);
  updateModeButtons();
}

function requestEditorModeChange(mode, meta) {
  if (__runtimeStateApi && __runtimeStateApi.logRead) __runtimeStateApi.logRead('RuntimeState', 'editor.mode', { current: editor && editor.mode, requested: mode });
  var allowedModes = { view: true, place: true, delete: true };
  var source = meta && meta.source ? String(meta.source) : 'unknown';
  var fromMode = editor && editor.mode ? String(editor.mode) : 'unknown';
  if (!allowedModes[mode]) {
    if (typeof pushLog === 'function') pushLog('[audit][mode] source=' + source + ' from=' + fromMode + ' to=' + String(mode) + ' result=ignored-invalid');
    return false;
  }

  setEditorMode(mode, { source: source });
  if (typeof pushLog === 'function') pushLog('[audit][mode] source=' + source + ' from=' + fromMode + ' to=' + String(mode) + ' result=applied');
  return true;
}

function requestDeleteFromPickedBox(picked, meta) {
  var source = meta && meta.source ? String(meta.source) : 'unknown';
  if (!picked) {
    if (typeof pushLog === 'function') {
      pushLog('delete: none');
      pushLog('[audit][delete] source=' + source + ' result=none');
    }
    if (typeof updatePreview === 'function') updatePreview();
    return { ok: false, result: 'none' };
  }

  var targetInstance = callLegacyPlacement('findInstanceForBox', [picked], { source: 'legacy.state:requestDeleteFromPickedBox' });
  if (targetInstance) {
    var prefab = (typeof getPrefabById === 'function') ? getPrefabById(targetInstance.prefabId) : null;
    callLegacyPlacement('removeInstanceById', [targetInstance.instanceId], { source: 'legacy.state:requestDeleteFromPickedBox' });
    if (typeof pushLog === 'function') {
      pushLog('delete: removed instance ' + targetInstance.instanceId + ':' + (prefab && prefab.name ? prefab.name : String(targetInstance.prefabId || 'unknown')));
      pushLog('[audit][delete] source=' + source + ' targetType=instance instanceId=' + targetInstance.instanceId + ' prefabId=' + String(targetInstance.prefabId || 'unknown') + ' result=removed');
    }
    if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('delete');
    if (typeof updatePreview === 'function') updatePreview();
    return { ok: true, result: 'removed-instance', instanceId: targetInstance.instanceId };
  }

  if (__sceneGraphApi && typeof __sceneGraphApi.removeLooseBoxById === 'function') __sceneGraphApi.removeLooseBoxById(picked.id, { source: 'state:requestDeleteFromPickedBox' });
  else boxes = boxes.filter(function (b) { return b.id !== picked.id; });
  if (typeof pushLog === 'function') {
    pushLog('delete: removed ' + describeBox(picked));
    pushLog('[audit][delete] source=' + source + ' targetType=box boxId=' + String(picked.id) + ' result=removed');
  }
  if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('delete');
  if (typeof updatePreview === 'function') updatePreview();
  return { ok: true, result: 'removed-box', boxId: picked.id };
}

function requestPlaceFromPreview(preview, meta) {
  var source = meta && meta.source ? String(meta.source) : 'unknown';
  var activePreview = preview || editor.preview;
  if ((!activePreview || !activePreview.valid || !activePreview.origin) && typeof updatePreview === 'function') {
    try { updatePreview(); } catch (_) {}
    activePreview = editor.preview || activePreview;
  }
  if (!activePreview || !activePreview.valid || !activePreview.origin) {
    if (typeof pushLog === 'function') {
      pushLog('place: skipped');
      pushLog('[audit][place] source=' + source + ' result=skipped-invalid-preview');
    }
    return { ok: false, result: 'skipped-invalid-preview' };
  }

  var previewBoxCount = activePreview.boxes ? activePreview.boxes.length : 0;
  var instance = callLegacyPlacement('placeCurrentPrefab', [activePreview], { source: 'legacy.state:requestPlaceFromPreview' });
  if (!instance || !instance.instanceId) {
    if (typeof pushLog === 'function') {
      pushLog('place: failed');
      pushLog('[audit][place] source=' + source + ' prefabId=' + String(activePreview.prefabId || 'unknown') + ' result=failed invalidResult=' + JSON.stringify(instance || null));
    }
    return { ok: false, result: 'failed' };
  }

  var placedPrefab = (typeof getPrefabById === 'function') ? getPrefabById(instance.prefabId) : null;
  if (typeof pushLog === 'function') {
    pushLog('place ' + instance.instanceId + ':' + (placedPrefab && placedPrefab.name ? placedPrefab.name : String(instance.prefabId || 'unknown')) + ' at (' + instance.x + ',' + instance.y + ',' + instance.z + ') voxels=' + previewBoxCount);
    pushLog('[audit][place] source=' + source + ' instanceId=' + instance.instanceId + ' prefabId=' + String(instance.prefabId || 'unknown') + ' origin=(' + [instance.x, instance.y, instance.z].join(',') + ') voxels=' + previewBoxCount + ' result=placed');
  }
  if (placedPrefab && placedPrefab.kind === 'habbo_import' && typeof detailLog === 'function') detailLog('[place-trace] commit habbo prefab=' + placedPrefab.id + ' instance=' + instance.instanceId + ' origin=(' + [instance.x,instance.y,instance.z].join(',') + ') previewOrigin=(' + [activePreview.origin.x,activePreview.origin.y,activePreview.origin.z].join(',') + ') previewBBox=' + JSON.stringify(activePreview.bbox || null) + ' proxy=' + [placedPrefab.w,placedPrefab.d,placedPrefab.h].join('x'));
  if (typeof pushLog === 'function') pushLog('scene-after-place: instances=' + instances.length + ' boxes=' + boxes.length);
  if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('place');
  return { ok: true, result: 'placed', instanceId: instance.instanceId };
}

if (typeof initializeLoggingSystem === 'function') initializeLoggingSystem();

// Step-06: settings moved to src/core/state/runtime-state.js
var spriteSheet = new Image();
spriteSheet.onload = () => {
  assetsReady = true;
  detailLog(`asset: sprite loaded ${spriteSheet.naturalWidth}x${spriteSheet.naturalHeight}`);
};
spriteSheet.onerror = () => {
  assetsReady = false;
  detailLog(`asset-error: sprite load failed src=${spriteSheet.src}`);
};
detailLog('asset: start loading assets/chibi_walk.png');
spriteSheet.src = 'assets/chibi_walk.png';
setTimeout(() => {
  if (!assetsReady) detailLog(`asset-wait: sprite not ready after 1200ms src=${spriteSheet.src}`);
}, 1200);

var SPRITE = {
  frameW: 72,
  frameH: 96,
  bottom: 88,
  top: 10,
  rows: { down: 0, left: 2, right: 1, up: 3 },
  frames: 4,
};

var PREFAB_KEY_LIMIT = 7;

// Step-07d: remove lighting-editor -> prefab-select refresh dependency; keep prefab hint/value sync only

function currentPrefab() {
  return prototypes[editor.prototypeIndex] || prototypes[0];
}


// placement（物品放置与排序）相关逻辑已抽离到 src/application/placement/placement.js
// scene/session owner 已前移到 src/core/state/scene-session-state.js，这里只消费 owner api。

pushLog(`lab-mode=${LAB_MODE} showPlayer=${SHOW_PLAYER} focus=merged-room-lighting-player-proxy`);
pushLog(`log-system-ready=${logSystemReady} bufferedBootLines=${bootBuffer.length}`);

function prefabToSerializable(prefab) {
  return {
    id: prefab.id,
    key: prefab.key || '',
    name: prefab.name || prefab.id,
    kind: prefab.kind || prefab.id,
    asset: prefab.asset || '',
    base: prefab.base || '#c7b0df',
    renderMode: prefab.renderMode || 'voxel',
    anchor: prefab.anchor ? { x: Number(prefab.anchor.x) || 0, y: Number(prefab.anchor.y) || 0, z: Number(prefab.anchor.z) || 0 } : { x: 0, y: 0, z: 0 },
    sprite: prefab.sprite ? {
      image: prefab.sprite.image || '',
      fileName: prefab.sprite.fileName || '',
      scale: Number(prefab.sprite.scale) || 1,
      offsetPx: { x: Number(prefab.sprite.offsetPx && prefab.sprite.offsetPx.x) || 0, y: Number(prefab.sprite.offsetPx && prefab.sprite.offsetPx.y) || 0 },
      anchorMode: prefab.sprite.anchorMode || 'bottom-center',
      sortMode: prefab.sprite.sortMode || 'box_occlusion',
    } : null,
    spriteDirections: prefab.spriteDirections ? Object.keys(prefab.spriteDirections).reduce(function (acc, key) {
      var cfg = prefab.spriteDirections[key];
      acc[key] = {
        image: cfg.image || '',
        fileName: cfg.fileName || '',
        scale: Number(cfg.scale) || 1,
        offsetPx: { x: Number(cfg.offsetPx && cfg.offsetPx.x) || 0, y: Number(cfg.offsetPx && cfg.offsetPx.y) || 0 },
        anchorMode: cfg.anchorMode || 'bottom-center',
        sortMode: cfg.sortMode || 'box_occlusion',
        flipX: !!cfg.flipX,
      };
      return acc;
    }, {}) : null,
    habboLayerDirections: prefab.habboLayerDirections ? Object.keys(prefab.habboLayerDirections).reduce(function (acc, key) {
      acc[key] = (prefab.habboLayerDirections[key] || []).map(function (layer) {
        return {
          image: layer.image || '',
          fileName: layer.fileName || '',
          width: Number(layer.width) || 1,
          height: Number(layer.height) || 1,
          visualSize: Number(layer.visualSize) || 64,
          offsetPx: { x: Number(layer.offsetPx && layer.offsetPx.x) || 0, y: Number(layer.offsetPx && layer.offsetPx.y) || 0 },
          offsetZ: Number(layer.offsetZ) || 0,
          flipX: !!layer.flipX,
          kind: layer.kind || 'body',
          layerId: layer.layerId || '',
          layerIndex: Number(layer.layerIndex) || 0,
          name: layer.name || '',
          zOrderHint: Number(layer.zOrderHint) || 0,
          alpha: layer.alpha == null ? 1 : Math.max(0, Math.min(1, Number(layer.alpha))),
          blend: layer.blend || '',
          source: layer.source || '',
          frameId: Number(layer.frameId) || 0,
          direction: Number(layer.direction) || 0,
        };
      });
      return acc;
    }, {}) : null,
    habboMeta: prefab.habboMeta ? cloneJsonSafe(prefab.habboMeta) : null,
    slices: Array.isArray(prefab.slices) ? prefab.slices.slice() : [],
    voxels: (prefab.voxels || []).map(function (v) {
      return {
        x: Number(v.x) || 0,
        y: Number(v.y) || 0,
        z: Number(v.z) || 0,
        solid: v.solid !== false,
        collidable: v.collidable !== false,
        base: v.base || prefab.base || '#c7b0df',
      };
    }),
    custom: !!prefab.custom,
  };
}

function importPrefabDefinition(def, options) {
  options = options || {};
  if (!def || typeof def !== 'object') {
    pushLog('prefab-import: invalid object');
    return null;
  }
  var rawId = String(def.id || '').trim();
  if (!rawId) {
    pushLog('prefab-import: missing id');
    return null;
  }
  var existing = prototypes.find(function (p) { return p.id === rawId; });
  if (existing && !existing.custom && !options.replaceBuiltIn) {
    pushLog(`prefab-import: rejected built-in id=${rawId}`);
    return null;
  }
  var normalized = normalizePrefab(Object.assign({}, def, { id: rawId, key: def.key || '', custom: true }));
  var isAssetManaged = options.sourceKind === 'asset';
  var isExternalManaged = options.sourceKind === 'habbo-root';
  normalized.custom = !(isAssetManaged || isExternalManaged);
  normalized.assetManaged = isAssetManaged;
  normalized.externalManaged = isExternalManaged;
  normalized.missingPrefab = false;
  if (__prefabRegistryApi && typeof __prefabRegistryApi.replacePrefabById === 'function' && existing && (existing.custom || existing.assetManaged || existing.externalManaged || existing.missingPrefab)) {
    __prefabRegistryApi.replacePrefabById(rawId, normalized, { source: 'state:import-prefab-definition' });
  } else if (__prefabRegistryApi && typeof __prefabRegistryApi.registerPrefab === 'function') {
    __prefabRegistryApi.registerPrefab(normalized, { source: 'state:import-prefab-definition' });
  } else if (existing && (existing.custom || existing.assetManaged || existing.externalManaged || existing.missingPrefab)) {
    var idx = prototypes.findIndex(function (p) { return p.id === rawId; });
    if (idx >= 0) prototypes[idx] = normalized;
  } else {
    prototypes.push(normalized);
  }
  var importedIndex = prototypes.findIndex(function (p) { return p.id === rawId; });
  if (options.select !== false) {
    if (__prefabRegistryApi && typeof __prefabRegistryApi.setSelectedPrototypeIndex === 'function') __prefabRegistryApi.setSelectedPrototypeIndex(importedIndex, { source: 'state:import-prefab-definition' });
    else editor.prototypeIndex = importedIndex;
  }
  if (__prefabRegistryApi && typeof __prefabRegistryApi.refreshPrototypeSelection === 'function') __prefabRegistryApi.refreshPrototypeSelection({ source: 'state:import-prefab-definition' });
  else refreshPrefabSelectOptions('state:import-prefab-definition');
  if (ui.prefabSelect && options.select !== false) ui.prefabSelect.value = String(editor.prototypeIndex);
  if (options.persist !== false) saveCustomPrefabsToLocalStorage();
  if (normalized.assetManaged) { var __st = ensureAssetPrefabScanState(); __st.ids.add(normalized.id); assetManagedPrefabIds = __st.ids; }
  if (typeof tracePrefabRegister === 'function') tracePrefabRegister(normalized.id, options.sourceKind || 'import', { builtIn: false, voxels: normalized.voxels.length, custom: !!normalized.custom, assetManaged: !!normalized.assetManaged, externalManaged: !!normalized.externalManaged });
  pushLog(`prefab-import: id=${normalized.id} voxels=${normalized.voxels.length} explicit=${normalized.explicitVoxelCount == null ? 'n/a' : normalized.explicitVoxelCount} fallback=${normalized.proxyFallbackUsed ? 1 : 0} source=${options.source || 'unknown'}`);
  if (isLegacyFlatHabboPrefab(normalized)) {
    pushLog('habbo-repair:queued prefab=' + normalized.id + ' source=' + String(options.source || 'unknown') + ' reason=legacy-flat-prefab');
    queueLegacyHabboPrefabRepair(normalized.id, 'import:' + String(options.source || 'unknown'));
  }
  return normalized;
}


function bytesToLatin1Text(bytes) {
  return new TextDecoder('latin1').decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
}

async function inflateZlibBytes(input) {
  var bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (typeof DecompressionStream !== 'function') throw new Error('当前浏览器不支持 DecompressionStream，无法解压 SWF / bitmap 数据');
  var ds = new DecompressionStream('deflate');
  var decompressed = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(decompressed);
}

async function inflateSwfBytes(arrayBuffer) {
  var bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
  if (bytes.length < 8) throw new Error('SWF 文件过小');
  var sig = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
  if (sig === 'FWS') return bytes;
  if (sig !== 'CWS') throw new Error('当前只支持 FWS/CWS 的 SWF');
  var header = bytes.slice(0, 8);
  var body = bytes.slice(8);
  var decompressed = await inflateZlibBytes(body);
  var out = new Uint8Array(8 + decompressed.byteLength);
  out.set(header, 0);
  out.set(decompressed, 8);
  out[0] = 70; out[1] = 87; out[2] = 83;
  return out;
}

function parseXmlAttributes(fragment) {
  var attrs = {};
  String(fragment || '').replace(/(\w+)="([^"]*)"/g, function (_, key, value) {
    attrs[key] = value;
    return _;
  });
  return attrs;
}

function extractHabboXmlFragment(text, tagName) {
  var re = new RegExp('<' + tagName + '\\b[\\s\\S]*?<\\/' + tagName + '>', 'i');
  var m = String(text || '').match(re);
  return m ? m[0] : '';
}

function readSwfBits(bytes, bitIndex, count) {
  var value = 0;
  for (var i = 0; i < count; i++) {
    var byteIndex = bitIndex >> 3;
    var bitOffset = 7 - (bitIndex & 7);
    value = (value << 1) | ((bytes[byteIndex] >> bitOffset) & 1);
    bitIndex += 1;
  }
  return { value: value, bitIndex: bitIndex };
}

function readSwfSignedBits(bytes, bitIndex, count) {
  var out = readSwfBits(bytes, bitIndex, count);
  var value = out.value;
  if (count > 0 && (value & (1 << (count - 1)))) value -= (1 << count);
  return { value: value, bitIndex: out.bitIndex };
}

function getSwfTagStreamOffset(bytes) {
  var bitIndex = 8 * 8;
  var head = readSwfBits(bytes, bitIndex, 5);
  var nbits = head.value;
  bitIndex = head.bitIndex;
  for (var i = 0; i < 4; i++) {
    var signed = readSwfSignedBits(bytes, bitIndex, nbits);
    bitIndex = signed.bitIndex;
  }
  return Math.ceil(bitIndex / 8) + 4;
}

function parseSwfTags(bytes) {
  var out = [];
  var pos = getSwfTagStreamOffset(bytes);
  habboTrace('parseSwfTags:start bytes=' + bytes.length + ' tagStreamOffset=' + pos);
  while (pos + 2 <= bytes.length) {
    var header = bytes[pos] | (bytes[pos + 1] << 8);
    pos += 2;
    var code = header >> 6;
    var length = header & 0x3f;
    if (length === 0x3f) {
      if (pos + 4 > bytes.length) break;
      length = (bytes[pos]) | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24);
      pos += 4;
    }
    var body = bytes.slice(pos, pos + length);
    pos += length;
    out.push({ code: code, length: length, body: body });
    if (code === 0) break;
  }
  habboTrace('parseSwfTags:done tags=' + out.length + ' codes=' + out.slice(0, 24).map(function (t) { return t.code + ':' + t.length; }).join(','));
  return out;
}

function parseSwfSymbolClassMap(tags) {
  var map = {};
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    if (!tag || tag.code !== 76) continue;
    var body = tag.body;
    var pos = 0;
    if (body.length < 2) continue;
    var count = body[pos] | (body[pos + 1] << 8);
    pos += 2;
    for (var j = 0; j < count; j++) {
      if (pos + 2 > body.length) break;
      var characterId = body[pos] | (body[pos + 1] << 8);
      pos += 2;
      var start = pos;
      while (pos < body.length && body[pos] !== 0) pos += 1;
      var name = bytesToLatin1Text(body.slice(start, pos));
      pos += 1;
      map[characterId] = name;
    }
  }
  habboTrace('symbolClassMap:count=' + Object.keys(map).length + ' sample=' + Object.keys(map).slice(0, 16).map(function (k) { return k + '=>' + map[k]; }).join(' | '));
  return map;
}

function getHabboAssetNameFromSymbolClass(className, type) {
  var raw = String(className || '');
  var prefix = String(type || '');
  if (prefix && raw.indexOf(prefix + '_') === 0) return raw.slice(prefix.length + 1);
  return raw;
}

function collectHabboXmlTextsFromTags(tags) {
  var out = {
    objectDataXml: '',
    assetsXml: '',
    visualizationXml: '',
    objectXml: '',
    manifestXml: '',
  };
  function normalizeXmlText(raw) {
    var s = String(raw || '');
    s = s.replace(/^\uFEFF?\s*/, '');
    s = s.replace(/^<\?xml[^>]*>\s*/i, '');
    return s.trim();
  }
  function startsWithRoot(s, rootTag) {
    return new RegExp('^\\s*<' + rootTag + '(?:\\s|>)', 'i').test(String(s || ''));
  }
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    if (!tag || tag.code !== 87 || !tag.body || tag.body.length < 6) continue;
    var payload = tag.body.slice(6);
    var normalized = normalizeXmlText(bytesToLatin1Text(payload));
    if (!normalized || normalized.charAt(0) !== '<') continue;

    if (!out.objectDataXml && startsWithRoot(normalized, 'objectData')) { out.objectDataXml = normalized; continue; }
    if (!out.visualizationXml && startsWithRoot(normalized, 'visualizationData')) { out.visualizationXml = normalized; continue; }
    if (!out.objectXml && startsWithRoot(normalized, 'object')) { out.objectXml = normalized; continue; }
    if (!out.manifestXml && startsWithRoot(normalized, 'manifest')) { out.manifestXml = normalized; continue; }
    if (!out.assetsXml && startsWithRoot(normalized, 'assets')) { out.assetsXml = normalized; continue; }

    if (!out.objectDataXml) {
      var od = extractHabboXmlFragment(normalized, 'objectData');
      if (od) out.objectDataXml = od;
    }
    if (!out.visualizationXml) {
      var vz = extractHabboXmlFragment(normalized, 'visualizationData');
      if (vz) out.visualizationXml = vz;
    }
    if (!out.objectXml) {
      var ox = normalized.match(/<object\b[^>]*\/?>/i);
      if (ox) out.objectXml = ox[0];
    }
    if (!out.manifestXml) {
      var mf = extractHabboXmlFragment(normalized, 'manifest');
      if (mf) out.manifestXml = mf;
    }
  }
  habboTrace('xml-blocks objectData=' + (!!out.objectDataXml) + ' visualization=' + (!!out.visualizationXml) + ' object=' + (!!out.objectXml) + ' assets=' + (!!out.assetsXml) + ' manifest=' + (!!out.manifestXml));
  return out;
}

function parseHabboAssetDescriptor(name) {
  var raw = String(name || '');
  var info = {
    size: 0,
    direction: 0,
    frame: 0,
    layerId: '',
    kind: 'body'
  };
  var iconMatch = raw.match(/_icon(?:_([a-z0-9]+))?$/i);
  if (iconMatch) {
    info.layerId = 'icon';
    info.kind = 'icon';
    return info;
  }
  var m = raw.match(/_(\d+)_([a-z]+)_(\d+)_(\d+)$/i);
  if (m) {
    info.size = Number(m[1]) || 0;
    info.layerId = String(m[2] || '').toLowerCase();
    info.direction = Number(m[3]) || 0;
    info.frame = Number(m[4]) || 0;
    if (info.layerId === 'sd') info.kind = 'shadow';
    else info.kind = 'body';
    return info;
  }
  if (/_sd_/i.test(raw)) info.kind = 'shadow';
  return info;
}

function parseHabboVisualizationGraphics(xmlText) {
  var out = { sizes: {}, raw: String(xmlText || '') };
  var text = String(xmlText || '');
  if (!text) return out;
  var visRe = /<visualization\b([^>]*)>([\s\S]*?)<\/visualization>/ig;
  var visMatch;
  while ((visMatch = visRe.exec(text))) {
    var visAttrs = parseXmlAttributes(visMatch[1]);
    var size = Math.max(0, Number(visAttrs.size) || 0);
    var body = visMatch[2] || '';
    var vis = {
      size: size,
      layerCount: Math.max(0, Number(visAttrs.layerCount) || 0),
      angle: Number(visAttrs.angle) || 0,
      layers: {},
      directions: [],
      animations: {},
    };
    var layerRe = /<layer\b([^>]*)\/?>(?:<\/layer>)?/ig;
    var m;
    while ((m = layerRe.exec(body))) {
      var a = parseXmlAttributes(m[1]);
      var id = Number(a.id);
      if (!Number.isFinite(id)) continue;
      vis.layers[id] = {
        id: id,
        x: Number(a.x) || 0,
        y: Number(a.y) || 0,
        z: Number(a.z) || 0,
        alpha: a.alpha != null ? Number(a.alpha) : null,
        ink: a.ink || '',
        tag: a.tag || '',
        interactive: a.interactive === '1' || a.interactive === 'true',
      };
    }
    var dirRe = /<direction\b([^>]*)\/>/ig;
    while ((m = dirRe.exec(body))) {
      var da = parseXmlAttributes(m[1]);
      if (da.id != null) vis.directions.push(Number(da.id));
    }
    vis.directions = vis.directions.filter(function (v, i, arr) { return arr.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    var animRe = /<animation\b([^>]*)>([\s\S]*?)<\/animation>/ig;
    var animMatch;
    while ((animMatch = animRe.exec(body))) {
      var aa = parseXmlAttributes(animMatch[1]);
      var stateId = aa.id != null ? Number(aa.id) : (aa.state != null ? Number(aa.state) : 0);
      var animBody = animMatch[2] || '';
      var anim = { id: stateId, layers: {} };
      var alRe = /<animationLayer\b([^>]*)>([\s\S]*?)<\/animationLayer>/ig;
      var alMatch;
      while ((alMatch = alRe.exec(animBody))) {
        var ala = parseXmlAttributes(alMatch[1]);
        var layerId = Number(ala.id);
        if (!Number.isFinite(layerId)) continue;
        var frames = [];
        var fsRe = /<frame\b([^>]*)\/>/ig;
        var fMatch;
        while ((fMatch = fsRe.exec(alMatch[2] || ''))) {
          var fa = parseXmlAttributes(fMatch[1]);
          if (fa.id != null) frames.push(Number(fa.id));
        }
        anim.layers[layerId] = {
          id: layerId,
          frames: frames,
          frameRepeat: ala.frameRepeat != null ? Number(ala.frameRepeat) : 0,
          loopCount: ala.loopCount != null ? Number(ala.loopCount) : 0,
        };
      }
      vis.animations[String(stateId)] = anim;
    }
    out.sizes[String(size)] = vis;
  }
  return out;
}

function chooseHabboVisualization(meta, preferredSize) {
  var sizes = meta && meta.visualizationInfo && meta.visualizationInfo.sizes ? meta.visualizationInfo.sizes : null;
  if (!sizes) return null;
  var requested = String(Math.max(0, Number(preferredSize) || 0));
  if (sizes[requested]) return sizes[requested];
  var keys = Object.keys(sizes).map(function (k) { return Number(k); }).filter(function (n) { return Number.isFinite(n); }).sort(function (a, b) { return b - a; });
  if (!keys.length) return null;
  return sizes[String(keys[0])] || null;
}

function getHabboVisualizationState(meta) {
  return 0;
}

function getHabboLayerLetter(layerId, layerCount) {
  return layerId === layerCount ? 'sd' : String.fromCharCode(97 + layerId);
}

function getHabboAnimationFrameForLayer(vis, layerId, stateId) {
  var anims = vis && vis.animations ? vis.animations : null;
  if (!anims) return 0;
  var anim = anims[String(stateId)] || anims['0'] || null;
  if (!anim || !anim.layers) return 0;
  var layer = anim.layers[layerId];
  if (!layer || !layer.frames || !layer.frames.length) return 0;
  return Number(layer.frames[0]) || 0;
}

function chooseHabboAssetForLayer(meta, letter, direction, frame, preferredSize) {
  var all = (meta && meta.assets ? meta.assets : []).filter(function (asset) {
    return asset && String(asset.layerId || '') === String(letter || '');
  });
  if (!all.length) return null;
  function best(candidates) {
    if (!candidates.length) return null;
    candidates = candidates.slice().sort(function (a, b) {
      function score(asset) {
        var s = 0;
        if (Number(asset.direction || 0) === Number(direction || 0)) s += 100;
        else if (Number(asset.direction || 0) === 0) s += 50;
        if (Number(asset.frame || 0) === Number(frame || 0)) s += 20;
        else if (Number(asset.frame || 0) === 0) s += 10;
        if (Number(asset.size || 0) === Number(preferredSize || 0)) s += 5;
        if (asset.source) s += 1;
        return s;
      }
      var ds = score(b) - score(a);
      if (ds) return ds;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return candidates[0] || null;
  }
  var bySize = preferredSize > 0 ? all.filter(function (a) { return Number(a.size || 0) === Number(preferredSize || 0); }) : all.slice();
  return best(bySize) || best(all);
}

function parseHabboSwfMetadataFromXmls(xmls) {
  var text = [xmls && xmls.assetsXml || '', xmls && xmls.objectDataXml || '', xmls && xmls.visualizationXml || '', xmls && xmls.objectXml || ''].join('\n');
  var out = {
    type: '',
    dimensions: { x: 1, y: 1, z: 1 },
    logicDirections: [],
    visualDirections: [],
    visualization: '',
    logic: '',
    assets: [],
    visualizationInfo: null,
    raw: {
      objectDataXml: xmls && xmls.objectDataXml || '',
      assetsXml: xmls && xmls.assetsXml || '',
      visualizationXml: xmls && xmls.visualizationXml || '',
      objectXml: xmls && xmls.objectXml || '',
      manifestXml: xmls && xmls.manifestXml || '',
      fullText: text,
    },
  };
  var objectDataXml = xmls && xmls.objectDataXml || '';
  var objectXml = xmls && xmls.objectXml || '';
  var assetsXml = xmls && xmls.assetsXml || '';
  var visualizationXml = xmls && xmls.visualizationXml || '';

  var objectXmlMatch = objectXml ? objectXml.match(/<object\b([^>]*)\/?>/i) : null;
  if (objectXmlMatch) {
    var objectAttrs = parseXmlAttributes(objectXmlMatch[1]);
    out.type = objectAttrs.type || out.type;
    out.visualization = objectAttrs.visualization || '';
    out.logic = objectAttrs.logic || '';
  }
  if (objectDataXml) {
    var headerMatch = objectDataXml.match(/<objectData\b([^>]*)>/i);
    if (headerMatch) {
      var dataAttrs = parseXmlAttributes(headerMatch[1]);
      out.type = dataAttrs.type || out.type;
    }
    var dimMatch = objectDataXml.match(/<dimensions\b([^>]*)\/>/i);
    if (dimMatch) {
      var dimAttrs = parseXmlAttributes(dimMatch[1]);
      out.dimensions = {
        x: Math.max(1, Number(dimAttrs.x) || 1),
        y: Math.max(1, Number(dimAttrs.y) || 1),
        z: Math.max(1, Number(dimAttrs.z) || 1),
      };
    }
    var dirMatch;
    var dirRe = /<direction\b([^>]*)\/>/ig;
    while ((dirMatch = dirRe.exec(objectDataXml))) {
      var dirAttrs = parseXmlAttributes(dirMatch[1]);
      if (dirAttrs.id != null) out.logicDirections.push(Number(dirAttrs.id));
    }
  }
  if (visualizationXml) {
    var visHeader = visualizationXml.match(/<visualizationData\b([^>]*)>/i);
    if (visHeader) {
      var visAttrs = parseXmlAttributes(visHeader[1]);
      if (!out.type) out.type = visAttrs.type || out.type;
    }
    out.visualizationInfo = parseHabboVisualizationGraphics(visualizationXml);
    try {
      var __visKeys = out.visualizationInfo && out.visualizationInfo.sizes ? Object.keys(out.visualizationInfo.sizes) : [];
      pushHabboDebug('visualization:parsed', { type: out.type || '', sizes: __visKeys, rawLength: visualizationXml.length || 0 });
      habboTrace('visualization:parsed type=' + String(out.type || '') + ' sizes=' + __visKeys.join(','));
    } catch (__visErr) {
      detailLog('visualization:parsed:error ' + (__visErr && __visErr.message ? __visErr.message : __visErr));
    }
  }
  if (assetsXml) {
    var assetMatch;
    var assetRe = /<asset\b([^>]*)\/>/ig;
    while ((assetMatch = assetRe.exec(assetsXml))) {
      var attrs = parseXmlAttributes(assetMatch[1]);
      if (!attrs.name) continue;
      var parsed = parseHabboAssetDescriptor(attrs.name);
      if (out.visualDirections.indexOf(parsed.direction) < 0) out.visualDirections.push(parsed.direction);
      out.assets.push({
        name: attrs.name,
        kind: parsed.kind,
        layerId: parsed.layerId,
        source: attrs.source || '',
        flipH: attrs.flipH === '1',
        direction: parsed.direction,
        frame: parsed.frame,
        size: parsed.size,
        x: Number(attrs.x) || 0,
        y: Number(attrs.y) || 0,
      });
    }
  }
  out.logicDirections = out.logicDirections.filter(function (v, idx, arr) { return arr.indexOf(v) === idx; }).sort(function (a, b) { return a - b; });
  out.visualDirections = out.visualDirections.filter(function (v, idx, arr) { return arr.indexOf(v) === idx; }).sort(function (a, b) { return a - b; });
  if (!out.type) {
    var full = text;
    var mType = full.match(/<objectData\b[^>]*\btype="([^"]+)"/i) || full.match(/<object\b[^>]*\btype="([^"]+)"/i);
    if (mType) out.type = mType[1];
  }
  if (!out.type) throw new Error('SWF 中未找到 objectData.type');
  if (!out.assets.length && assetsXml) {
    var fallbackAssetRe = /<asset\b([^>]*)\/?\>/ig;
    var fallbackMatch;
    while ((fallbackMatch = fallbackAssetRe.exec(assetsXml))) {
      var attrs = parseXmlAttributes(fallbackMatch[1]);
      if (!attrs.name) continue;
      var parsed2 = parseHabboAssetDescriptor(attrs.name);
      if (out.visualDirections.indexOf(parsed2.direction) < 0) out.visualDirections.push(parsed2.direction);
      out.assets.push({
        name: attrs.name,
        kind: parsed2.kind,
        layerId: parsed2.layerId,
        source: attrs.source || '',
        flipH: attrs.flipH === '1',
        direction: parsed2.direction,
        frame: parsed2.frame,
        size: parsed2.size,
        x: Number(attrs.x) || 0,
        y: Number(attrs.y) || 0,
      });
    }
  }
  if (!out.assets.length) throw new Error('SWF 中未找到 assets 图层定义');
  habboTrace('metadata type=' + out.type + ' dims=' + [out.dimensions.x, out.dimensions.y, out.dimensions.z].join('x') + ' logicDirs=' + out.logicDirections.join(',') + ' visualDirs=' + out.visualDirections.join(',') + ' assets=' + out.assets.length + ' assetSample=' + out.assets.slice(0, 12).map(function(a){ return a.name + '@(' + a.x + ',' + a.y + '):dir' + a.direction + ':size' + a.size + (a.flipH ? ':flip' : ''); }).join(' | '));
  return out;
}

function makeCanvas2D(width, height) {
  var canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width | 0);
  canvas.height = Math.max(1, height | 0);
  return canvas;
}

async function decodeSwfLosslessBitmapTag(tagBody) {
  if (!tagBody || tagBody.length < 7) throw new Error('Lossless bitmap tag 数据过短');
  var characterId = tagBody[0] | (tagBody[1] << 8);
  var bitmapFormat = tagBody[2];
  var width = tagBody[3] | (tagBody[4] << 8);
  var height = tagBody[5] | (tagBody[6] << 8);
  var pos = 7;
  if (bitmapFormat === 3) {
    throw new Error('当前版本暂不支持 indexed color 的 bitmapFormat=3');
  }
  if (bitmapFormat !== 5) {
    throw new Error('当前版本只支持 Habbo 常见的 DefineBitsLossless2 format=5');
  }
  var inflated = await inflateZlibBytes(tagBody.slice(pos));
  var raw = inflated instanceof Uint8Array ? inflated : new Uint8Array(inflated);
  var canvas = makeCanvas2D(width, height);
  var ctx2d = canvas.getContext('2d');
  var imageData = ctx2d.createImageData(width, height);
  var dst = imageData.data;
  for (var src = 0, di = 0; src + 3 < raw.length && di + 3 < dst.length; src += 4, di += 4) {
    var a = raw[src];
    var r = raw[src + 1];
    var g = raw[src + 2];
    var b = raw[src + 3];
    dst[di] = r;
    dst[di + 1] = g;
    dst[di + 2] = b;
    dst[di + 3] = a;
  }
  ctx2d.putImageData(imageData, 0, 0);
  return {
    characterId: characterId,
    width: width,
    height: height,
    canvas: canvas,
    dataUrl: canvas.toDataURL('image/png')
  };
}

function chooseHabboPreferredVisualSize(meta) {
  var sizes = [];
  (meta.assets || []).forEach(function (asset) {
    if (!asset || asset.kind === 'icon') return;
    if (asset.size > 0 && sizes.indexOf(asset.size) < 0) sizes.push(asset.size);
  });
  if (sizes.indexOf(64) >= 0) return 64;
  if (!sizes.length) return 0;
  sizes.sort(function (a, b) { return b - a; });
  return sizes[0];
}

async function extractHabboBitmapAssetsFromTags(tags, symbolMap, type) {
  var out = {};
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    if (!tag || tag.code !== 36) continue;
    var characterId = tag.body[0] | (tag.body[1] << 8);
    var className = symbolMap[characterId] || '';
    var assetName = getHabboAssetNameFromSymbolClass(className, type);
    var decoded = await decodeSwfLosslessBitmapTag(tag.body);
    habboTrace('bitmap characterId=' + characterId + ' class=' + className + ' asset=' + assetName + ' ' + decoded.width + 'x' + decoded.height);
    out[assetName] = {
      name: assetName,
      characterId: characterId,
      className: className,
      width: decoded.width,
      height: decoded.height,
      canvas: decoded.canvas,
      dataUrl: decoded.dataUrl
    };
  }
  habboTrace('bitmap-extract:count=' + Object.keys(out).length + ' sample=' + Object.keys(out).slice(0, 20).join(','));
  return out;
}

function resolveHabboLayerImage(bitmaps, asset) {
  if (!asset) return null;
  var sourceName = asset.source || asset.name;
  return bitmaps[sourceName] || bitmaps[asset.name] || null;
}

function pickHabboDirectionLayers(meta, bitmaps, direction, options) {
  options = options || {};
  var includeShadow = !!options.includeShadow;
  var preferredSize = options.preferredSize == null ? chooseHabboPreferredVisualSize(meta) : options.preferredSize;
  var targetDir = Number(direction) || 0;
  var skipReasons = [];
  var all = (meta.assets || []).filter(function (asset) {
    if (!asset) { skipReasons.push({ reason: 'null-asset' }); return false; }
    if (asset.kind === 'icon') { skipReasons.push({ name: asset.name, reason: 'icon' }); return false; }
    if (!includeShadow && asset.kind === 'shadow') { skipReasons.push({ name: asset.name, reason: 'shadow-excluded' }); return false; }
    var img = resolveHabboLayerImage(bitmaps, asset);
    if (!img) { skipReasons.push({ name: asset.name, reason: 'missing-bitmap', source: asset.source || '' }); return false; }
    return true;
  });
  pushHabboDebug('pickLayers:input', { type: meta.type || '', targetDir: targetDir, includeShadow: includeShadow, preferredSize: preferredSize, assetCount: (meta.assets || []).length, candidateCount: all.length, skipped: skipReasons.slice(0, 80) });
  var tryDirections = [targetDir];
  if (targetDir !== 0) tryDirections.push(0);
  for (var d = 0; d < tryDirections.length; d++) {
    var dir = tryDirections[d];
    var dirAssets = all.filter(function (asset) { return Number(asset.direction || 0) === dir; });
    if (!dirAssets.length) {
      pushHabboDebug('pickLayers:dir-empty', { type: meta.type || '', dir: dir, targetDir: targetDir });
      continue;
    }
    var sizeAssets = preferredSize > 0 ? dirAssets.filter(function (asset) { return Number(asset.size || 0) === preferredSize; }) : dirAssets.slice();
    if (!sizeAssets.length) {
      var largest = 0;
      dirAssets.forEach(function (asset) { largest = Math.max(largest, Number(asset.size || 0)); });
      sizeAssets = dirAssets.filter(function (asset) { return Number(asset.size || 0) === largest; });
      pushHabboDebug('pickLayers:fallback-size', { type: meta.type || '', dir: dir, requestedSize: preferredSize, fallbackSize: largest, dirAssets: dirAssets.map(function(a){ return { name:a.name, kind:a.kind, size:a.size, layerId:a.layerId }; }) });
    }
    var bodyAssets = sizeAssets.filter(function (asset) { return asset.kind === 'body'; });
    var layers = bodyAssets.length ? bodyAssets : sizeAssets.slice();
    if (!layers.length) continue;
    layers.sort(function (a, b) {
      var ak = a.kind === 'shadow' ? 0 : 1;
      var bk = b.kind === 'shadow' ? 0 : 1;
      if (ak !== bk) return ak - bk;
      if (a.layerId !== b.layerId) return String(a.layerId).localeCompare(String(b.layerId));
      return String(a.name).localeCompare(String(b.name));
    });
    pushHabboDebug('pickLayers:result', { type: meta.type || '', dir: dir, targetDir: targetDir, includeShadow: includeShadow, preferredSize: preferredSize, layers: layers.map(function (a) { return { name:a.name, kind:a.kind, size:a.size, x:a.x, y:a.y, layerId:a.layerId, source:a.source || '', flipH:!!a.flipH }; }) });
    habboTrace('pickLayers dir=' + dir + ' target=' + targetDir + ' includeShadow=' + includeShadow + ' preferredSize=' + preferredSize + ' picked=' + layers.map(function (a) { return a.name + ':' + a.kind + '@(' + a.x + ',' + a.y + ')' + (a.flipH ? ':flip' : '') + ':src=' + (a.source || a.name); }).join(' | '));
    return layers;
  }
  pushHabboDebug('pickLayers:none', { type: meta.type || '', targetDir: targetDir, includeShadow: includeShadow, preferredSize: preferredSize });
  habboTrace('pickLayers dir=' + targetDir + ' includeShadow=' + includeShadow + ' preferredSize=' + preferredSize + ' picked=NONE');
  return [];
}

function composeHabboDirectionSprite(meta, bitmaps, direction, options) {
  options = options || {};
  var layers = pickHabboDirectionLayers(meta, bitmaps, direction, options);
  if (!layers.length) return null;
  // 这里严肃参考 Scuti 的“room object container + texture trim”语义：
  // Scuti 运行时真正用到的是 extractor 产出的 frame trim + visualization layer offsets，
  // 而不是直接把 SWF assets.xml 里的 x/y 当成 top-left 来加到 container 上。
  // 对于我们当前“直接吃 SWF”的方案，必须先把 assets.xml 里的注册点 x/y 还原成
  // “图片左上角相对 room object origin 的偏移”。
  // Habbo 常见 floor furni 中，asset.x / asset.y 更接近 registration point（对象原点落在图片内部的像素坐标），
  // 所以 top-left 应该是 (-asset.x, -asset.y)，而不是 (+asset.x, +asset.y)。
  var placements = [];
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < layers.length; i++) {
    var asset = layers[i];
    var image = resolveHabboLayerImage(bitmaps, asset);
    if (!image) continue;
    var regX = Number(asset.x || 0);
    var regY = Number(asset.y || 0);
    var topLeftX = asset.flipH ? (regX - Number(image.width || 0)) : -regX;
    var topLeftY = -regY;
    placements.push({
      asset: asset,
      image: image,
      regX: regX,
      regY: regY,
      topLeftX: topLeftX,
      topLeftY: topLeftY,
    });
    minX = Math.min(minX, topLeftX);
    minY = Math.min(minY, topLeftY);
    maxX = Math.max(maxX, topLeftX + Number(image.width || 0));
    maxY = Math.max(maxY, topLeftY + Number(image.height || 0));
  }
  if (!placements.length || !Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  var width = Math.max(1, Math.round(maxX - minX));
  var height = Math.max(1, Math.round(maxY - minY));
  var canvas = makeCanvas2D(width, height);
  var ctx2d = canvas.getContext('2d');
  for (var j = 0; j < placements.length; j++) {
    var placed = placements[j];
    var layer = placed.asset;
    var bitmap = placed.image;
    if (!bitmap || !bitmap.canvas) continue;
    var dx = Math.round(placed.topLeftX - minX);
    var dy = Math.round(placed.topLeftY - minY);
    ctx2d.save();
    if (layer.flipH) {
      ctx2d.translate(dx + bitmap.width, dy);
      ctx2d.scale(-1, 1);
      ctx2d.drawImage(bitmap.canvas, 0, 0);
    } else {
      ctx2d.drawImage(bitmap.canvas, dx, dy);
    }
    ctx2d.restore();
  }
  detailLog('habbo-compose: type=' + String(meta.type || 'habbo') + ' dir=' + String(direction) +
    ' bbox=(' + [Math.round(minX), Math.round(minY), Math.round(maxX), Math.round(maxY)].join(',') + ')' +
    ' size=' + width + 'x' + height +
    ' layers=' + placements.map(function (p) {
      return p.asset.name + '[' + p.image.width + 'x' + p.image.height + '] reg=(' + p.regX + ',' + p.regY + ') tl=(' + Math.round(p.topLeftX) + ',' + Math.round(p.topLeftY) + ') flip=' + (!!p.asset.flipH);
    }).join(' | '));
  return {
    image: canvas.toDataURL('image/png'),
    fileName: (meta.type || 'habbo') + '_dir' + direction + '.png',
    scale: 1,
    visualSize: Math.max(1, Number(options.preferredSize == null ? chooseHabboPreferredVisualSize(meta) : options.preferredSize) || 64),
    offsetPx: { x: Math.round(minX), y: Math.round(minY) },
    // 这里的 offsetPx 已经是“flatten 后整张图左上角相对 room object floor origin 的偏移”。
    anchorMode: 'scuti-floor-origin',
    sortMode: 'box_occlusion',
    flipX: false,
    width: width,
    height: height,
    debugPlacement: placements.map(function (p) {
      return {
        name: p.asset.name,
        kind: p.asset.kind,
        regX: p.regX,
        regY: p.regY,
        topLeftX: Math.round(p.topLeftX),
        topLeftY: Math.round(p.topLeftY),
        width: p.image.width,
        height: p.image.height,
        flipH: !!p.asset.flipH,
      };
    }),
    layersUsed: layers.map(function (layer) {
      return {
        name: layer.name,
        source: layer.source || '',
        kind: layer.kind,
        layerId: layer.layerId,
        size: layer.size,
        x: layer.x,
        y: layer.y,
        flipH: !!layer.flipH
      };
    })
  };
}

function buildHabboLayerDirectionsFromBitmaps(meta, bitmaps) {
  var preferredSize = chooseHabboPreferredVisualSize(meta);
  var vis = chooseHabboVisualization(meta, preferredSize);
  var directions = [];
  if (vis && vis.directions && vis.directions.length) directions = vis.directions.slice();
  if (!directions.length) directions = (meta.visualDirections && meta.visualDirections.length) ? meta.visualDirections.slice() : [0];
  directions = directions.filter(function (v, i, arr) { return arr.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
  var baseDirection = directions.indexOf(0) >= 0 ? 0 : (directions[0] || 0);
  var altDirection = directions.indexOf(2) >= 0 ? 2 : (directions.length > 1 ? directions[1] : baseDirection);
  var activeState = getHabboVisualizationState(meta);

  function buildForDirection(direction) {
    var chosenVis = chooseHabboVisualization(meta, preferredSize);
    if (!chosenVis) {
      pushHabboDebug('buildLayers:none-visualization', { type: meta.type || '', dir: direction, preferredSize: preferredSize, visualizationSizes: meta && meta.visualizationInfo && meta.visualizationInfo.sizes ? Object.keys(meta.visualizationInfo.sizes) : [] });
      return null;
    }
    var actualDirection = chosenVis.directions.indexOf(direction) >= 0 ? direction : (chosenVis.directions.indexOf(0) >= 0 ? 0 : (chosenVis.directions[0] || direction));
    var built = [];
    for (var layerId = 0; layerId <= chosenVis.layerCount; layerId++) {
      var letter = getHabboLayerLetter(layerId, chosenVis.layerCount);
      var frameId = getHabboAnimationFrameForLayer(chosenVis, layerId, activeState);
      var asset = chooseHabboAssetForLayer(meta, letter, actualDirection, frameId, chosenVis.size || preferredSize);
      if (!asset && frameId !== 0) asset = chooseHabboAssetForLayer(meta, letter, actualDirection, 0, chosenVis.size || preferredSize);
      if (!asset && actualDirection !== 0) asset = chooseHabboAssetForLayer(meta, letter, 0, frameId, chosenVis.size || preferredSize);
      if (!asset) {
        pushHabboDebug('buildLayers:skip', { type: meta.type || '', dir: direction, actualDirection: actualDirection, layerId: layerId, letter: letter, frame: frameId, reason: 'missing-asset' });
        continue;
      }
      var image = resolveHabboLayerImage(bitmaps, asset);
      if (!image) {
        pushHabboDebug('buildLayers:skip', { type: meta.type || '', dir: direction, actualDirection: actualDirection, asset: asset.name, layerId: layerId, frame: frameId, reason: 'missing-image', source: asset.source || '' });
        continue;
      }
      var props = layerId === chosenVis.layerCount ? { x: 0, y: 0, z: 0, alpha: 51, ink: '' } : (chosenVis.layers[layerId] || { x: 0, y: 0, z: 0, alpha: null, ink: '' });
      var propX = Number(props.x) || 0;
      var propY = Number(props.y) || 0;
      var regX = Number(asset.x) || 0;
      var regY = Number(asset.y) || 0;
      var alpha = props.alpha == null ? (letter === 'sd' ? 0.2 : 1) : Math.max(0, Math.min(1, Number(props.alpha) / 255));
      var blend = String(props.ink || '').toUpperCase();
      // Scuti 语义里，layer 的 x/y 是贴图左上角相对 furniture container 原点的偏移；
      // 对镜像资源，左上角不是 -regX，而要先把图片宽度吃进去：regX - image.width。
      // 之前 layered/composite 路径一直把 flip 图层也当成 -regX，导致 mirrored part/body 被系统性甩错。
      var topLeftX = (asset.flipH ? (regX - Number(image.width || 0)) : (-regX)) + propX;
      var topLeftY = (-regY) + propY;
      var layerObj = {
        image: image.dataUrl,
        imageCanvas: image.canvas || null,
        fileName: asset.name + '.png',
        width: image.width,
        height: image.height,
        visualSize: Math.max(1, Number(asset.size) || chooseHabboPreferredVisualSize(meta) || 64),
        offsetPx: { x: topLeftX, y: topLeftY },
        regX: regX,
        regY: regY,
        propX: propX,
        propY: propY,
        offsetZ: Number(props.z) || 0,
        flipX: !!asset.flipH,
        kind: letter === 'sd' ? 'shadow' : (layerId === 0 ? 'body' : 'part'),
        layerId: asset.layerId,
        layerIndex: layerId,
        name: asset.name,
        source: asset.source || '',
        alpha: alpha,
        blend: blend,
        frameId: frameId,
        direction: actualDirection,
        zOrderHint: (letter === 'sd' ? -10000 : 0) + (Number(props.z) || 0),
      };
      pushHabboDebug('buildLayers:layer', { type: meta.type || '', dir: direction, actualDirection: actualDirection, asset: asset.name, layerId: layerId, kind: layerObj.kind, frame: frameId, size: asset.size, reg: { x: regX, y: regY }, props: { x: propX, y: propY, z: Number(props.z) || 0 }, offsetPx: layerObj.offsetPx, offsetZ: layerObj.offsetZ, alpha: alpha, blend: blend, flipX: layerObj.flipX, wh: { w: image.width, h: image.height }, source: asset.source || '' });
      built.push(layerObj);
    }
    built.sort(function (a, b) {
      if ((a.zOrderHint || 0) !== (b.zOrderHint || 0)) return (a.zOrderHint || 0) - (b.zOrderHint || 0);
      if ((a.layerIndex || 0) !== (b.layerIndex || 0)) return (a.layerIndex || 0) - (b.layerIndex || 0);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    pushHabboDebug('buildLayers:dir-done', { type: meta.type || '', dir: direction, actualDirection: actualDirection, count: built.length, layers: built.map(function(l){ return { name:l.name, kind:l.kind, layerIndex:l.layerIndex, frame:l.frameId, offsetPx:l.offsetPx, offsetZ:l.offsetZ, alpha:l.alpha, blend:l.blend, wh:{w:l.width,h:l.height}, flipX:l.flipX }; }) });
    return built;
  }
  var baseLayers = buildForDirection(baseDirection);
  if (!baseLayers || !baseLayers.length) { habboTrace('layerDirections:none baseDir=' + baseDirection); return null; }
  var altLayers = buildForDirection(altDirection) || baseLayers;
  habboTrace('layerDirections baseDir=' + baseDirection + ' altDir=' + altDirection + ' base=' + baseLayers.map(function (l) { return l.name + '@(' + l.offsetPx.x + ',' + l.offsetPx.y + ',' + l.offsetZ + ')/' + l.width + 'x' + l.height + (l.flipX ? ':flip' : '') + ':a=' + l.alpha + ':b=' + l.blend; }).join(' | ') + ' alt=' + altLayers.map(function (l) { return l.name + '@(' + l.offsetPx.x + ',' + l.offsetPx.y + ',' + l.offsetZ + ')/' + l.width + 'x' + l.height + (l.flipX ? ':flip' : '') + ':a=' + l.alpha + ':b=' + l.blend; }).join(' | '));
  return { '0': baseLayers, '1': altLayers };
}

function buildHabboSpriteDirectionsFromBitmaps(meta, bitmaps) {
  var baseDirection = meta.visualDirections.indexOf(0) >= 0 ? 0 : (meta.visualDirections.length ? meta.visualDirections[0] : 0);
  var altDirection = meta.visualDirections.indexOf(2) >= 0 ? 2 : (meta.visualDirections.length > 1 ? meta.visualDirections[1] : baseDirection);
  var baseSprite = composeHabboDirectionSprite(meta, bitmaps, baseDirection, { includeShadow: false });
  var altSprite = composeHabboDirectionSprite(meta, bitmaps, altDirection, { includeShadow: false }) || baseSprite;
  if (!baseSprite) { habboTrace('spriteDirections:none baseDir=' + baseDirection); return null; }
  habboTrace('spriteDirections baseDir=' + baseDirection + ' altDir=' + altDirection + ' base=' + baseSprite.width + 'x' + baseSprite.height + ' offset=(' + (baseSprite.offsetPx && baseSprite.offsetPx.x || 0) + ',' + (baseSprite.offsetPx && baseSprite.offsetPx.y || 0) + ') alt=' + ((altSprite||baseSprite).width) + 'x' + ((altSprite||baseSprite).height));
  return {
    '0': baseSprite,
    '1': altSprite || baseSprite
  };
}

function buildHabboFloorAnchor(meta) {
  // 这里给 proxy / boxes 用的仍然是 prefab 原点，不去人为挪 footprint。
  // 视觉层真正的 Scuti 对齐由 sprite.anchorMode = scuti-floor-origin 负责：
  // room object 先落到 origin tile 的 floor origin，再叠加 layer offset。
  return {
    x: 0,
    y: 0,
    z: 0
  };
}

async function parseHabboSwfRuntime(arrayBuffer) {
  habboTrace('runtime-parse:start inputBytes=' + ((arrayBuffer && (arrayBuffer.byteLength || arrayBuffer.length)) || 0));
  pushHabboDebug('runtime-parse:start', { inputBytes: ((arrayBuffer && (arrayBuffer.byteLength || arrayBuffer.length)) || 0) });
  var inflated = await inflateSwfBytes(arrayBuffer);
  var tags = parseSwfTags(inflated);
  var symbolMap = parseSwfSymbolClassMap(tags);
  var xmls = collectHabboXmlTextsFromTags(tags);
  var meta = parseHabboSwfMetadataFromXmls(xmls);
  var bitmaps = await extractHabboBitmapAssetsFromTags(tags, symbolMap, meta.type);
  if (!Object.keys(bitmaps).length) throw new Error('SWF 中未找到可解码的位图层');
  pushHabboDebug('runtime-parse:meta', { type: meta.type || '', dimensions: meta.dimensions || null, logicDirections: meta.logicDirections || [], visualDirections: meta.visualDirections || [], visualizationSizes: meta && meta.visualizationInfo && meta.visualizationInfo.sizes ? Object.keys(meta.visualizationInfo.sizes) : [], assetsCount: (meta.assets || []).length });
  detailLog('habbo-xml: type=' + String(meta.type || '') +
    ' assetsXmlRoot=' + ((xmls && xmls.assetsXml || '').slice(0, 24).replace(/\s+/g, ' ')) +
    ' assets=' + String((meta.assets || []).length) +
    ' firstAssets=' + (meta.assets || []).slice(0, 4).map(function (a) { return a.name + '@(' + a.x + ',' + a.y + ')'; }).join(' | '));
  var builtLayerDirs = buildHabboLayerDirectionsFromBitmaps(meta, bitmaps) || {};
  // 逐 layer 渲染已经足够；大件 furni 再额外 flatten 一次会显著拖慢导入，还会放大日志量。
  // 只有在 layer 构建失败时，才退回到扁平 sprite fallback。
  var builtSpriteDirs = Object.keys(builtLayerDirs).length ? {} : (buildHabboSpriteDirectionsFromBitmaps(meta, bitmaps) || {});
  pushHabboDebug('runtime-parse:done', { type: String(meta.type || ''), bitmaps: Object.keys(bitmaps).length, spriteDirs: Object.keys(builtSpriteDirs), layerDirs: Object.keys(builtLayerDirs), assets: (meta.assets || []).length });
  habboTrace('runtime-parse:done type=' + String(meta.type || '') + ' bitmaps=' + Object.keys(bitmaps).length + ' spriteDirs=' + Object.keys(builtSpriteDirs).join(',') + ' layerDirs=' + Object.keys(builtLayerDirs).join(',') + ' assets=' + (meta.assets || []).length);
  return {
    bytes: inflated,
    tags: tags,
    symbolMap: symbolMap,
    xmls: xmls,
    meta: meta,
    bitmaps: bitmaps,
    spriteDirections: builtSpriteDirs,
    habboLayerDirections: builtLayerDirs
  };
}

async function buildHabboPrefabDefinition(runtime, options) {
  options = options || {};
  var meta = runtime && runtime.meta ? runtime.meta : runtime;
  var type = String(meta.type || 'habbo_item');
  var safeType = type.replace(/[^a-zA-Z0-9_\-]/g, '_');
  var id = String(options.id || ('habbo_' + safeType));
  var name = String(options.name || ('Habbo ' + safeType));
  var base = options.base || '#b7d0d4';
  var spriteDirections = runtime && runtime.spriteDirections ? runtime.spriteDirections : null;
  var habboLayerDirections = runtime && runtime.habboLayerDirections ? runtime.habboLayerDirections : null;
  var directionGroups = {};
  (meta.assets || []).forEach(function (asset) {
    var key = String(asset.direction || 0);
    if (!directionGroups[key]) directionGroups[key] = [];
    directionGroups[key].push({
      name: asset.name,
      kind: asset.kind,
      layerId: asset.layerId,
      size: asset.size,
      source: asset.source || '',
      flipH: !!asset.flipH,
      offsetPx: { x: asset.x || 0, y: asset.y || 0 },
      zOrderHint: 0,
    });
  });
  var floorAnchor = buildHabboFloorAnchor(meta);
  var proxyDims = {
    x: Math.max(1, Math.round(Number(meta.dimensions && meta.dimensions.x) || 1)),
    y: Math.max(1, Math.round(Number(meta.dimensions && meta.dimensions.y) || 1)),
    z: Math.max(1, Math.round(Number(meta.dimensions && meta.dimensions.z) || 1)),
  };
  return {
    id: id,
    name: name,
    kind: 'habbo_import',
    asset: options.asset || (safeType + '.swf'),
    base: base,
    renderMode: (spriteDirections || habboLayerDirections) ? 'sprite_proxy' : 'hybrid',
    renderUpdateMode: 'dynamic',
    anchor: floorAnchor,
    voxels: makeRectVoxels(proxyDims.x, proxyDims.y, proxyDims.z, base),
    sprite: spriteDirections && spriteDirections['0'] ? Object.assign({}, spriteDirections['0']) : null,
    spriteDirections: spriteDirections,
    habboLayerDirections: habboLayerDirections,
    habboMeta: {
      sourceKind: 'habbo_swf',
      sourceName: options.asset || '',
      relativePath: normalizeHabboRelativePathClient(options.relativePath || options.asset || ''),
      type: type,
      dimensions: cloneJsonSafe(meta.dimensions),
      proxyDims: cloneJsonSafe(proxyDims),
      logicDirections: cloneJsonSafe(meta.logicDirections),
      visualDirections: cloneJsonSafe(meta.visualDirections),
      visualization: meta.visualization || '',
      logic: meta.logic || '',
      scutiReference: {
        roomAnchor: 'position-tile-center-not-footprint-center',
        spriteOrganization: 'direction -> extracted bitmap layers with offsets',
        sorting: 'proxy-first + sprite overlay',
        zoomSelection: 'prefer-size-64-then-largest'
      },
      layersByDirection: directionGroups,
      usesFlattenedFrame: false,
      notes: [
        '当前版会直接从 SWF 的 DefineBitsLossless2 位图 tag 重建 2D 图层，不再依赖外部 _frame.png。',
        '组织方式参考 Scuti：先读 objectData / visualization / assets，再按 direction + layer offsets 组装显示对象。',
        '当前渲染按 direction + layer 逐层绘制，包含 shadow/body/part；多格 floor furni 的锚点按 Scuti 的 room object 逻辑固定在放置 tile 的中心，而不是整个 footprint 的中心。',
        '如果某个 SWF 含有更复杂的动画/状态/特殊 visualization，这一版仍会先按 static floor furni 的方式处理。'
      ],
    },
  };
}

function findAutoPlacementForPrefab(prefab, rotation) {
  var cells = [];
  var centerX = Math.max(0, (settings.gridW - 1) / 2);
  var centerY = Math.max(0, (settings.gridH - 1) / 2);
  for (var y = 0; y < settings.gridH; y++) {
    for (var x = 0; x < settings.gridW; x++) {
      cells.push({ x: x, y: y, dist: Math.abs(x - centerX) + Math.abs(y - centerY) });
    }
  }
  cells.sort(function (a, b) {
    if (a.dist !== b.dist) return a.dist - b.dist;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
  var variant = prefabVariant(prefab, rotation || 0);
  var fallback = null;
  for (var i = 0; i < cells.length; i++) {
    var c = cells[i];
    var candidate = computeCandidate(c.x, c.y, variant, null);
    if (!candidate || !candidate.valid || !candidate.origin) continue;
    if (candidate.origin.z === 0) return candidate;
    if (!fallback) fallback = candidate;
  }
  return fallback;
}

function prepareImportedPrefabForPlacement(prefab, options) {
  options = options || {};
  var protoIndex = prototypes.findIndex(function (p) { return p.id === prefab.id; });
  if (protoIndex < 0) throw new Error('Habbo prefab 导入成功，但没有注册到原型列表');
  if (__prefabRegistryApi && typeof __prefabRegistryApi.setSelectedPrototypeIndex === 'function') __prefabRegistryApi.setSelectedPrototypeIndex(protoIndex, { source: 'state:prepare-imported-prefab-for-placement' });
  else editor.prototypeIndex = protoIndex;
  if (__prefabRegistryApi && typeof __prefabRegistryApi.refreshPrototypeSelection === 'function') __prefabRegistryApi.refreshPrototypeSelection({ source: 'state:prepare-imported-prefab-for-placement' });
  else refreshPrefabSelectOptions('state:prepare-imported-prefab-for-placement');
  if (ui.prefabSelect) ui.prefabSelect.value = String(protoIndex);
  requestEditorModeChange('place', { source: 'state:prepare-imported-prefab-for-placement' });
  updateModeButtons();
  setSelectedInstance(null, { source: 'state:prepare-imported-prefab-for-placement' });
  updatePreview();
  if (typeof refreshInspectorPanels === 'function') refreshInspectorPanels();
  var sprite0 = prefab && prefab.spriteDirections && prefab.spriteDirections['0'] ? prefab.spriteDirections['0'] : (prefab ? prefab.sprite : null);
  var debugBits = [];
  if (prefab && prefab.habboMeta && prefab.habboMeta.dimensions) {
    var rawDims = prefab.habboMeta.dimensions;
    debugBits.push('rawDims=' + [rawDims.x, rawDims.y, rawDims.z].join('x'));
    if (prefab.habboMeta.proxyDims) debugBits.push('proxyDims=' + [prefab.habboMeta.proxyDims.x, prefab.habboMeta.proxyDims.y, prefab.habboMeta.proxyDims.z].join('x'));
  }
  if (sprite0) {
    debugBits.push('sprite0=' + (sprite0.width || '?') + 'x' + (sprite0.height || '?'));
    debugBits.push('offset=(' + ((sprite0.offsetPx && sprite0.offsetPx.x) || 0) + ',' + ((sprite0.offsetPx && sprite0.offsetPx.y) || 0) + ')');
    if (Array.isArray(sprite0.debugPlacement)) {
      debugBits.push('layers=' + sprite0.debugPlacement.map(function (p) { return p.name + '@reg(' + p.regX + ',' + p.regY + ')->tl(' + p.topLeftX + ',' + p.topLeftY + ')'; }).join('|'));
    }
  }
  pushHabboDebug('prefab-built', { id: prefab.id, name: prefab.name, anchor: prefab.anchor || null, proxy: { w: prefab.w, d: prefab.d, h: prefab.h }, voxels: ((prefab.voxels && prefab.voxels.length) || 0), layerDirs: Object.keys(prefab.habboLayerDirections || {}), spriteDirs: Object.keys(prefab.spriteDirections || {}), habboMeta: prefab.habboMeta || null });
  habboTrace('prefab-built id=' + prefab.id + ' name=' + prefab.name + ' anchor=' + JSON.stringify(prefab.anchor || null) + ' proxy=' + [prefab.w,prefab.d,prefab.h].join('x') + ' voxels=' + ((prefab.voxels && prefab.voxels.length) || 0) + ' layerDirs=' + Object.keys(prefab.habboLayerDirections || {}).join(',') + ' spriteDirs=' + Object.keys(prefab.spriteDirections || {}).join(','));
  pushLog('habbo-import: ready prefab=' + prefab.id + ' dims=' + prefab.w + 'x' + prefab.d + 'x' + prefab.h + ' mode=place autoInstance=false ' + debugBits.join(' '));
  return { prefab: prefab, prototypeIndex: protoIndex };
}

async function importHabboSwfToSceneFromBuffer(arrayBuffer, options) {
  options = options || {};
  habboTrace('importFromBuffer:start assetName=' + String(options.assetName || '') + ' displayName=' + String(options.displayName || ''));
  var runtime = await parseHabboSwfRuntime(arrayBuffer);
  var meta = runtime.meta;
  var prefabId = options.prefabId || ('habbo_' + meta.type);
  var relativePath = normalizeHabboRelativePathClient(options.relativePath || options.assetName || '');
  var prefabDef = await buildHabboPrefabDefinition(runtime, {
    id: prefabId,
    name: options.displayName || ('Habbo ' + meta.type),
    asset: relativePath || options.assetName || (meta.type + '.swf'),
    relativePath: relativePath,
  });
  var importSource = options.source || ((options.sourceKind === 'habbo-root' ? 'habbo-root:' : 'habbo-swf:') + (relativePath || options.assetName || meta.type));
  var imported = importPrefabDefinition(prefabDef, {
    persist: false,
    source: importSource,
    sourceKind: options.sourceKind || 'habbo-import',
    select: options.prepareForPlacement === false ? (options.select !== false) : false,
  });
  if (!imported) throw new Error('导入 prefab 失败');
  var prepared = options.prepareForPlacement === false ? { prefab: imported, prototypeIndex: prototypes.findIndex(function (p) { return p.id === imported.id; }) } : prepareImportedPrefabForPlacement(imported, { source: importSource, refreshSource: 'asset-import:habbo-prepare' });
  habboTrace('importFromBuffer:done prefab=' + imported.id + ' type=' + meta.type + ' dims=' + [meta.dimensions.x, meta.dimensions.y, meta.dimensions.z].join('x') + ' preparedIndex=' + prepared.prototypeIndex);
  return { prefab: imported, prepared: prepared, meta: meta };
}

async function importHabboSwfFileToScene(file) {
  if (!file) throw new Error('未选择 SWF 文件');
  habboTrace('importFile:start name=' + file.name + ' size=' + file.size);
  var arrayBuffer = await file.arrayBuffer();
  var result = await importHabboSwfToSceneFromBuffer(arrayBuffer, {
    assetName: file.name,
    displayName: 'Habbo ' + file.name.replace(/\.swf$/i, ''),
    prefabId: 'habbo_' + file.name.replace(/\.swf$/i, '').replace(/[^a-zA-Z0-9_\-]/g, '_')
  });
  habboTrace('importFile:done name=' + file.name + ' prefab=' + result.prefab.id);
  return result;
}

async function importBundledHabboDemoToScene(sampleName) {
  var selected = String(sampleName || (ui && ui.habboSampleSelect && ui.habboSampleSelect.value) || 'nft_h26_silverelf.swf');
  var path = 'assets/habbo_import_samples/' + selected;
  habboTrace('importBundled:start sample=' + selected + ' path=' + path);
  var assetApi = getStateAssetApiAdapter();
  var assetResult = await assetApi.fetchArrayBufferAsset(path + '?t=' + Date.now());
  var res = assetResult.response;
  if (!res.ok) throw new Error('内置示例读取失败：' + res.status + ' / ' + selected);
  var arrayBuffer = assetResult.buffer;
  var result = await importHabboSwfToSceneFromBuffer(arrayBuffer, {
    assetName: selected,
    displayName: 'Habbo ' + selected.replace(/\.swf$/i, ''),
    prefabId: 'habbo_' + selected.replace(/\.swf$/i, '').replace(/[^a-zA-Z0-9_\-]/g, '_')
  });
  habboTrace('importBundled:done sample=' + selected + ' prefab=' + result.prefab.id);
  return result;
}


var legacyHabboRepairState = { running: false, queue: [], queued: new Set(), done: new Set(), failed: {} };

function isHabboSwfAssetName(value) {
  return /\.swf(?:$|[?#])/i.test(String(value || ''));
}

function isLegacyFlatHabboPrefab(prefab) {
  if (!prefab || !isHabboSwfAssetName(prefab.asset || (prefab.habboMeta && prefab.habboMeta.sourceName) || '')) return false;
  var looksHabbo = prefab.kind === 'habbo_import' || /^habbo_/i.test(String(prefab.id || '')) || !!prefab.habboMeta;
  if (!looksHabbo) return false;
  var hasLayers = !!(prefab.habboLayerDirections && Object.keys(prefab.habboLayerDirections).length);
  var hasFlat = !!((prefab.spriteDirections && Object.keys(prefab.spriteDirections).length) || (prefab.sprite && prefab.sprite.image));
  return !hasLayers && hasFlat;
}

function getHabboRepairCandidates(prefab) {
  var out = [];
  function addOne(raw) {
    var value = String(raw || '').trim();
    if (!value || out.indexOf(value) >= 0) return;
    out.push(value);
  }
  addOne(prefab && prefab.asset);
  if (prefab && prefab.habboMeta) {
    addOne(prefab.habboMeta.sourceName);
    addOne(prefab.habboMeta.sourceAsset);
    addOne(prefab.habboMeta.originalAsset);
  }
  var expanded = [];
  out.forEach(function (value) {
    if (expanded.indexOf(value) < 0) expanded.push(value);
    var file = value.split('/').pop();
    if (file && file !== value && expanded.indexOf(file) < 0) expanded.push(file);
    if (file && isHabboSwfAssetName(file)) {
      var samplePath = 'assets/habbo_import_samples/' + file;
      if (expanded.indexOf(samplePath) < 0) expanded.push(samplePath);
    }
  });
  return expanded.filter(function (value) { return isHabboSwfAssetName(value); });
}

async function fetchHabboRepairBuffer(prefab) {
  var candidates = getHabboRepairCandidates(prefab);
  var misses = [];
  for (var i = 0; i < candidates.length; i++) {
    var candidate = candidates[i];
    try {
      var assetApi = getStateAssetApiAdapter();
      var assetResult = await assetApi.fetchArrayBufferAsset(candidate);
      var res = assetResult.response;
      if (res && res.ok) return { candidate: candidate, buffer: assetResult.buffer };
      misses.push(candidate + ':http-' + (res ? res.status : 'no-response'));
    } catch (err) {
      misses.push(candidate + ':error-' + (err && err.message ? err.message : err));
    }
  }
  throw new Error('无法重新读取 SWF；candidates=' + candidates.join(',') + ' misses=' + misses.join(','));
}

async function repairLegacyHabboPrefab(prefabId, reason) {
  var prefab = getPrefabById(prefabId);
  if (!isLegacyFlatHabboPrefab(prefab)) return false;
  pushLog('habbo-repair:start prefab=' + prefab.id + ' reason=' + String(reason || 'unknown') + ' candidates=' + getHabboRepairCandidates(prefab).join(','));
  var fetched = await fetchHabboRepairBuffer(prefab);
  var runtime = await parseHabboSwfRuntime(fetched.buffer);
  var rebuiltDef = await buildHabboPrefabDefinition(runtime, {
    id: prefab.id,
    name: prefab.name || prefab.id,
    asset: prefab.asset || fetched.candidate,
    base: prefab.base || '#b7d0d4'
  });
  var merged = normalizePrefab(Object.assign({}, prefab, rebuiltDef, {
    id: prefab.id,
    key: prefab.key || '',
    name: prefab.name || rebuiltDef.name,
    asset: prefab.asset || rebuiltDef.asset,
    base: prefab.base || rebuiltDef.base,
    custom: !!prefab.custom
  }));
  merged.custom = !!prefab.custom;
  merged.assetManaged = !!prefab.assetManaged;
  var idx = prototypes.findIndex(function (p) { return p.id === prefab.id; });
  if (__prefabRegistryApi && typeof __prefabRegistryApi.replacePrefabById === 'function') __prefabRegistryApi.replacePrefabById(prefab.id, merged, { source: 'state:repair-legacy-habbo-prefab' });
  else if (idx >= 0) prototypes[idx] = merged;
  if (__prefabRegistryApi && typeof __prefabRegistryApi.refreshPrototypeSelection === 'function') __prefabRegistryApi.refreshPrototypeSelection({ source: 'state:repair-legacy-habbo-prefab' });
  else refreshPrefabSelectOptions('state:repair-legacy-habbo-prefab');
  if (ui.prefabSelect) ui.prefabSelect.value = String(editor.prototypeIndex);
  if (prefab.custom && !prefab.assetManaged) saveCustomPrefabsToLocalStorage();
  invalidateShadowGeometryCache('habbo-repair');
  if (editor.mode === 'place' || editor.mode === 'drag') updatePreview();
  pushLog('habbo-repair:success prefab=' + prefab.id + ' candidate=' + fetched.candidate + ' layerDirs=' + Object.keys(merged.habboLayerDirections || {}).join(',') + ' spriteDirs=' + Object.keys(merged.spriteDirections || {}).join(','));
  return true;
}

async function processLegacyHabboRepairQueue() {
  if (legacyHabboRepairState.running) return;
  legacyHabboRepairState.running = true;
  try {
    while (legacyHabboRepairState.queue.length) {
      var task = legacyHabboRepairState.queue.shift();
      legacyHabboRepairState.queued.delete(task.prefabId);
      try {
        var ok = await repairLegacyHabboPrefab(task.prefabId, task.reason);
        if (ok) legacyHabboRepairState.done.add(task.prefabId);
      } catch (err) {
        legacyHabboRepairState.failed[task.prefabId] = String(err && err.message ? err.message : err);
        pushLog('habbo-repair:error prefab=' + task.prefabId + ' reason=' + String(task.reason || 'unknown') + ' error=' + legacyHabboRepairState.failed[task.prefabId]);
      }
    }
  } finally {
    legacyHabboRepairState.running = false;
  }
}

function queueLegacyHabboPrefabRepair(prefabId, reason) {
  var id = String(prefabId || '');
  if (!id || legacyHabboRepairState.done.has(id) || legacyHabboRepairState.queued.has(id)) return false;
  var prefab = getPrefabById(id);
  if (!isLegacyFlatHabboPrefab(prefab)) return false;
  legacyHabboRepairState.queue.push({ prefabId: id, reason: reason || 'unknown' });
  legacyHabboRepairState.queued.add(id);
  Promise.resolve().then(processLegacyHabboRepairQueue);
  return true;
}

function scheduleLegacyHabboRepairs(reason) {
  for (var i = 0; i < prototypes.length; i++) {
    var prefab = prototypes[i];
    if (isLegacyFlatHabboPrefab(prefab)) queueLegacyHabboPrefabRepair(prefab.id, reason || 'scan');
  }
}

// Step-06: player/editor/inspectorState moved to src/core/state/runtime-state.js
function getSelectedInstance() {
  return inspectorState.selectedInstanceId ? findInstanceById(inspectorState.selectedInstanceId) : null;
}

function getSelectedPrefab() {
  var inst = getSelectedInstance();
  return inst ? getPrefabById(inst.prefabId) : null;
}

function clearSelectedInstance(meta) {
  if (__runtimeStateApi && __runtimeStateApi.logWrite) __runtimeStateApi.logWrite('RuntimeState', 'inspectorState.selectedInstanceId', { from: inspectorState.selectedInstanceId, to: null });
  if (__runtimeStateApi && typeof __runtimeStateApi.setSelectedInstanceIdValue === 'function') __runtimeStateApi.setSelectedInstanceIdValue(null, { source: meta && meta.source ? meta.source : 'state:clearSelectedInstance' });
  else inspectorState.selectedInstanceId = null;
}

function setSelectedInstance(instanceId, meta) {
  if (__runtimeStateApi && __runtimeStateApi.logWrite) __runtimeStateApi.logWrite('RuntimeState', 'inspectorState.selectedInstanceId', { from: inspectorState.selectedInstanceId, to: instanceId || null });
  if (__runtimeStateApi && typeof __runtimeStateApi.setSelectedInstanceIdValue === 'function') __runtimeStateApi.setSelectedInstanceIdValue(instanceId || null, { source: meta && meta.source ? meta.source : 'state:setSelectedInstance' });
  else inspectorState.selectedInstanceId = instanceId || null;
}


// --- v1.3 render-performance caches ---
var FLOOR_LAYER_INTERACTION_MS = 28;
var SHADOW_LAYER_INTERACTION_MS = 28;
var STATIC_BOX_LAYER_INTERACTION_MS = 28;
var floorLayerCanvas = null;
var floorLayerCtx = null;
var floorLayerCache = {
  signature: '',
  cacheSignature: '',
  viewRotation: 0,
  lastBuiltAt: 0,
  dirty: true,
  chunkSize: 16,
  contentSignature: '',
  viewSignature: '',
  visibleChunkKeys: [],
  chunks: null,
};
var staticShadowCanvas = null;
var staticShadowCtx = null;
var staticShadowCache = { signature: '', lastBuiltAt: 0, dirty: true };
var staticBoxRenderCache = {
  geometrySignature: '',
  lightingSignature: '',
  viewRotation: 0,
  cacheSignature: '',
  occupancy: null,
  renderables: [],
  lastBuiltAt: 0,
  dirtyGeometry: true,
  dirtyLighting: true,
};

function sigNum(v, digits = 3) {
  const n = Number(v || 0);
  const m = Math.pow(10, digits);
  return Math.round(n * m) / m;
}

function isInteractiveRenderPressure() {
  var interactionType = null;
  try { interactionType = window && window.__habboActiveCameraInteractionType ? String(window.__habboActiveCameraInteractionType) : null; } catch (_) { interactionType = null; }
  return !!(mouse.draggingView || lightState.dragAxis || player.moving || editor.mode === 'drag' || interactionType === 'zoom' || interactionType === 'pinch' || interactionType === 'pan');
}


function getRuntimeMainEditorViewRotationForLayer() {
  var currentViewRotation = 0;
  var rotationSource = 'runtime-state-unavailable';
  if (typeof window !== 'undefined' && window.App && window.App.controllers && window.App.controllers.main && typeof window.App.controllers.main.getMainEditorVisualRotation === 'function') {
    currentViewRotation = Number(window.App.controllers.main.getMainEditorVisualRotation('legacy.state:layerVisualRotation')) || 0;
    currentViewRotation = ((currentViewRotation % 4) + 4) % 4;
    rotationSource = 'app.controllers.main.getMainEditorVisualRotation';
  } else if (typeof window !== 'undefined' && window.App && window.App.controllers && window.App.controllers.main && typeof window.App.controllers.main.getMainEditorViewRotation === 'function') {
    currentViewRotation = Number(window.App.controllers.main.getMainEditorViewRotation('legacy.state:layerViewRotation')) || 0;
    currentViewRotation = ((currentViewRotation % 4) + 4) % 4;
    rotationSource = 'app.controllers.main.getMainEditorViewRotation';
  } else if (__runtimeStateApi && __runtimeStateApi.editor && typeof __runtimeStateApi.editor.visualRotation === 'number') {
    currentViewRotation = (((__runtimeStateApi.editor.visualRotation % 4) + 4) % 4);
    rotationSource = 'runtime-state-api.visualRotation';
  } else if (__runtimeStateApi && __runtimeStateApi.editor && typeof __runtimeStateApi.editor.rotation === 'number') {
    currentViewRotation = (((__runtimeStateApi.editor.rotation % 4) + 4) % 4);
    rotationSource = 'runtime-state-api.rotation';
  } else if (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.runtimeState && window.App.state.runtimeState.editor && typeof window.App.state.runtimeState.editor.visualRotation === 'number') {
    currentViewRotation = (((window.App.state.runtimeState.editor.visualRotation % 4) + 4) % 4);
    rotationSource = 'app.state.runtimeState.editor.visualRotation';
  } else if (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.runtimeState && window.App.state.runtimeState.editor && typeof window.App.state.runtimeState.editor.rotation === 'number') {
    currentViewRotation = (((window.App.state.runtimeState.editor.rotation % 4) + 4) % 4);
    rotationSource = 'app.state.runtimeState.editor.rotation';
  }
  return { viewRotation: currentViewRotation, source: rotationSource };
}


function getRuntimeMainEditorCameraSettingsForLayer() {
  var defaults = {
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 2,
    cameraCullingEnabled: true,
    cullingMargin: 2,
    showCameraBounds: false,
    showCullingBounds: false,
    source: 'runtime-state-unavailable'
  };
  try {
    if (typeof window !== 'undefined' && window.App && window.App.controllers && window.App.controllers.main && typeof window.App.controllers.main.getMainEditorCameraSettings === 'function') {
      var settings = window.App.controllers.main.getMainEditorCameraSettings('legacy.state:layerCameraSettings');
      return Object.assign({}, defaults, settings || {}, { source: 'app.controllers.main.getMainEditorCameraSettings' });
    }
  } catch (_) {}
  try {
    if (__runtimeStateApi && typeof __runtimeStateApi.getEditorCameraSettingsValue === 'function') {
      return Object.assign({}, defaults, __runtimeStateApi.getEditorCameraSettingsValue() || {}, { source: 'runtime-state-api.cameraSettings' });
    }
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.runtimeState && typeof window.App.state.runtimeState.getEditorCameraSettingsValue === 'function') {
      return Object.assign({}, defaults, window.App.state.runtimeState.getEditorCameraSettingsValue() || {}, { source: 'app.state.runtimeState.cameraSettings' });
    }
  } catch (_) {}
  return defaults;
}

function floorLayerSignature() {
  var rotationInfo = getRuntimeMainEditorViewRotationForLayer();
  var cameraSettings = getRuntimeMainEditorCameraSettingsForLayer();
  return JSON.stringify({
    viewW: VIEW_W,
    viewH: VIEW_H,
    dpr: sigNum(dpr, 2),
    gridW: settings.gridW,
    gridH: settings.gridH,
    tileW: sigNum(settings.tileW),
    tileH: sigNum(settings.tileH),
    originX: sigNum(settings.originX),
    originY: sigNum(settings.originY),
    viewRotation: rotationInfo.viewRotation,
    rotationSource: rotationInfo.source,
    zoom: sigNum(cameraSettings.zoom, 3),
    ambient: sigNum(settings.ambient),
    lights: lights.map(serializeLightForLayer),
    lightingEnabled: !!(lightState && lightState.enabled !== false),
  });
}

function staticShadowLayerSignature() {
  var rotationInfo = getRuntimeMainEditorViewRotationForLayer();
  var cameraSettings = getRuntimeMainEditorCameraSettingsForLayer();
  return JSON.stringify({
    viewW: VIEW_W,
    viewH: VIEW_H,
    dpr: sigNum(dpr, 2),
    tileW: sigNum(settings.tileW),
    tileH: sigNum(settings.tileH),
    originX: sigNum(settings.originX),
    originY: sigNum(settings.originY),
    cameraX: sigNum(camera.x),
    cameraY: sigNum(camera.y),
    viewRotation: sigNum(rotationInfo.viewRotation, 4),
    rotationSource: rotationInfo.source,
    zoom: sigNum(cameraSettings.zoom, 3),
    cameraCullingEnabled: cameraSettings.cameraCullingEnabled !== false,
    cullingMargin: sigNum(cameraSettings.cullingMargin, 2),
    boxes: boxesShadowSignature(),
    lights: lights.map(serializeLightForLayer),
    lightingEnabled: !!(lightState && lightState.enabled !== false),
    showShadows: !!lightState.showShadows,
    highContrastShadow: !!lightState.highContrastShadow,
    shadowDebugColor: lightState.shadowDebugColor,
    shadowAlpha: sigNum(lightState.shadowAlpha),
    shadowOpacityScale: sigNum(lightState.shadowOpacityScale),
    shadowDistanceFadeEnabled: !!lightState.shadowDistanceFadeEnabled,
    shadowDistanceFadeRate: sigNum(lightState.shadowDistanceFadeRate),
    shadowDistanceFadeMin: sigNum(lightState.shadowDistanceFadeMin),
    shadowEdgeFadeEnabled: !!lightState.shadowEdgeFadeEnabled,
    shadowEdgeFadePx: sigNum(lightState.shadowEdgeFadePx),
  });
}

function staticBoxGeometrySignature() {
  var currentViewRotation = 0;
  var rotationSource = 'runtime-state';
  var cameraSettings = getRuntimeMainEditorCameraSettingsForLayer();
  if (typeof window !== 'undefined' && window.App && window.App.controllers && window.App.controllers.main && typeof window.App.controllers.main.getMainEditorVisualRotation === 'function') {
    currentViewRotation = (((window.App.controllers.main.getMainEditorVisualRotation('legacy.state:staticBoxGeometrySignature') % 4) + 4) % 4);
    rotationSource = 'app.controllers.main.getMainEditorVisualRotation';
  } else if (typeof window !== 'undefined' && window.App && window.App.controllers && window.App.controllers.main && typeof window.App.controllers.main.getMainEditorViewRotation === 'function') {
    currentViewRotation = (((window.App.controllers.main.getMainEditorViewRotation('legacy.state:staticBoxGeometrySignature') % 4) + 4) % 4);
    rotationSource = 'app.controllers.main.getMainEditorViewRotation';
  } else if (__runtimeStateApi && __runtimeStateApi.editor && typeof __runtimeStateApi.editor.visualRotation === 'number') {
    currentViewRotation = (((__runtimeStateApi.editor.visualRotation % 4) + 4) % 4);
    rotationSource = 'runtime-state-api.visualRotation';
  } else if (__runtimeStateApi && __runtimeStateApi.editor && typeof __runtimeStateApi.editor.rotation === 'number') {
    currentViewRotation = (((__runtimeStateApi.editor.rotation % 4) + 4) % 4);
    rotationSource = 'runtime-state-api';
  } else if (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.runtimeState && window.App.state.runtimeState.editor && typeof window.App.state.runtimeState.editor.rotation === 'number') {
    currentViewRotation = (((window.App.state.runtimeState.editor.rotation % 4) + 4) % 4);
    rotationSource = 'app.state.runtimeState.editor.rotation';
  } else {
    rotationSource = 'runtime-state-unavailable';
  }
  var rotationInfo = getRuntimeMainEditorViewRotationForLayer();
  return JSON.stringify({
    viewW: VIEW_W,
    viewH: VIEW_H,
    dpr: sigNum(dpr, 2),
    tileW: sigNum(settings.tileW),
    tileH: sigNum(settings.tileH),
    originX: sigNum(settings.originX),
    originY: sigNum(settings.originY),
    cameraX: sigNum(camera.x),
    cameraY: sigNum(camera.y),
    viewRotation: sigNum(currentViewRotation, 4),
    rotationSource: rotationSource,
    zoom: sigNum(cameraSettings.zoom, 3),
    cameraCullingEnabled: cameraSettings.cameraCullingEnabled !== false,
    cullingMargin: sigNum(cameraSettings.cullingMargin, 2),
    boxes: boxesShadowSignature(),
    xrayFaces: !!xrayFaces,
    showDebug: !!showDebug,
  });
}

function staticBoxLightingSignature() {
  return JSON.stringify({
    ambient: sigNum(settings.ambient),
    lights: lights.map(serializeLightForLayer),
    lightingEnabled: !!(lightState && lightState.enabled !== false),
    showShadows: !!(lightState && lightState.showShadows),
    shadowAlpha: sigNum(lightState && lightState.shadowAlpha),
    shadowOpacityScale: sigNum(lightState && lightState.shadowOpacityScale),
    highContrastShadow: !!(lightState && lightState.highContrastShadow),
    shadowDistanceFadeEnabled: !!(lightState && lightState.shadowDistanceFadeEnabled),
    shadowDistanceFadeRate: sigNum(lightState && lightState.shadowDistanceFadeRate),
    shadowDistanceFadeMin: sigNum(lightState && lightState.shadowDistanceFadeMin),
    shadowEdgeFadeEnabled: !!(lightState && lightState.shadowEdgeFadeEnabled),
    shadowEdgeFadePx: sigNum(lightState && lightState.shadowEdgeFadePx),
  });
}

function markFloorLayerDirty(reason = 'unknown') {
  floorLayerCache.dirty = true;
  if (verboseLog) detailLog(`floor-layer: dirty reason=${reason}`);
}

function markStaticShadowLayerDirty(reason = 'unknown') {
  staticShadowCache.dirty = true;
  if (verboseLog) detailLog(`static-shadows: dirty reason=${reason}`);
}

function markStaticBoxLayerDirty(reason = 'unknown', geometry = false) {
  if (geometry) staticBoxRenderCache.dirtyGeometry = true;
  staticBoxRenderCache.dirtyLighting = true;
  if (verboseLog) detailLog(`static-boxes: dirty reason=${reason} geometry=${geometry}`);
}

function markRenderCachesDirty(reason = 'unknown') {
  markFloorLayerDirty(reason);
  markStaticShadowLayerDirty(reason);
  markStaticBoxLayerDirty(reason, true);
}


