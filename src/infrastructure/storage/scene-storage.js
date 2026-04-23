// scene-storage.js
function sceneStorageRouteLog(name, detail) {
  var suffix = detail ? (' ' + String(detail)) : '';
  try { if (typeof logRoute === 'function') logRoute('scene-storage', name + suffix); else pushLog('[route][scene-storage] ' + name + suffix); } catch (_) {}
}

function sceneIoLog(name, detail) {
  var suffix = detail ? (' ' + String(detail)) : '';
  try { pushLog('[scene-io] ' + String(name) + suffix); } catch (_) {}
}

function getAppServiceRoot() {
  return (typeof window !== 'undefined' && window.App && window.App.services) ? window.App.services : null;
}

function recordLegacyFallback(bridge, detail) {
  try {
    if (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.recordFallback === 'function') {
      window.__APP_NAMESPACE.recordFallback(bridge, 'src/infrastructure/storage/scene-storage.js', detail);
    }
  } catch (_) {}
}

function getSceneApiAdapter() {
  var appServices = getAppServiceRoot();
  return appServices && appServices.sceneApi;
}

function getHabboApiAdapter() {
  var appServices = getAppServiceRoot();
  return appServices && appServices.habboApi;
}

function getSceneSessionStateApi() {
  try {
    if (typeof window === 'undefined') return null;
    if (window.App && window.App.state && window.App.state.sceneSession) return window.App.state.sceneSession;
    return window.__SCENE_SESSION_STATE__ || null;
  } catch (_) {
    try { return window.__SCENE_SESSION_STATE__ || null; } catch (_) { return null; }
  }
}

function getSceneGraphStateApi() {
  try {
    if (typeof window === 'undefined') return null;
    if (window.App && window.App.state && window.App.state.sceneGraph) return window.App.state.sceneGraph;
    return window.__SCENE_GRAPH_STATE__ || null;
  } catch (_) {
    try { return window.__SCENE_GRAPH_STATE__ || null; } catch (_) { return null; }
  }
}

function currentSceneInstances() {
  var sessionApi = getSceneSessionStateApi();
  try {
    if (sessionApi && typeof sessionApi.getInstances === 'function') {
      var arr = sessionApi.getInstances();
      if (Array.isArray(arr)) return arr;
    }
  } catch (_) {}
  try { return Array.isArray(instances) ? instances : []; } catch (_) { return []; }
}

function currentSceneBoxes() {
  var sessionApi = getSceneSessionStateApi();
  try {
    if (sessionApi && typeof sessionApi.getBoxes === 'function') {
      var arr = sessionApi.getBoxes();
      if (Array.isArray(arr)) return arr;
    }
  } catch (_) {}
  try { return Array.isArray(boxes) ? boxes : []; } catch (_) { return []; }
}

function summarizeCurrentSceneSession(label) {
  var sessionApi = getSceneSessionStateApi();
  try {
    if (sessionApi && typeof sessionApi.summarizeSession === 'function') {
      var summary = sessionApi.summarizeSession() || {};
      summary.label = String(label || '');
      summary.available = true;
      return summary;
    }
  } catch (_) {}
  return {
    label: String(label || ''),
    available: false,
    instances: currentSceneInstances().length,
    boxes: currentSceneBoxes().length
  };
}

function emitP6SceneWorkflow(kind, message, extra) {
  var line = '[P6][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
  }
  try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (_) {}
  return line;
}

var __sceneStorageServiceUsageLogged = false;
function logSceneStorageServiceUsageOnce() {
  if (__sceneStorageServiceUsageLogged) return;
  __sceneStorageServiceUsageLogged = true;
  if (typeof refactorLogCurrent === 'function') {
    refactorLogCurrent('Services', 'service-usage scene-api -> scene-storage', { owner: 'src/infrastructure/storage/scene-storage.js', usage: 'scene-save-load-default' });
    refactorLogCurrent('Services', 'service-usage habbo-api -> scene-storage', { owner: 'src/infrastructure/storage/scene-storage.js', usage: 'habbo-root-index/file' });
  }
}

logSceneStorageServiceUsageOnce();
if (typeof refactorLogCurrent === 'function') {
  refactorLogCurrent('Services', 'explicit-deps-bound', {
    owner: 'src/infrastructure/storage/scene-storage.js',
    phase: 'P2-B',
    bindings: { sceneApi: !!getSceneApiAdapter(), habboApi: !!getHabboApiAdapter() },
    source: (getAppServiceRoot() ? 'App.services-only' : 'missing-service-root')
  });
}

function summarizeSceneSnapshotMeta(snapshot) {
  var data = snapshot && typeof snapshot === 'object' ? snapshot : {};
  return {
    instances: Array.isArray(data.instances) ? data.instances.length : 0,
    boxes: Array.isArray(data.boxes) ? data.boxes.length : 0,
    lights: Array.isArray(data.lights) ? data.lights.length : 0,
    habboRefs: Array.isArray(data.habboRefs) ? data.habboRefs.length : 0,
  };
}

function sceneRepairLog(name, detail) {
  var suffix = detail ? (' ' + String(detail)) : '';
  try { pushLog('[scene-repair] ' + String(name) + suffix); } catch (_) {}
}

function cloneSceneSnapshotShallow(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return {};
  var copy = Object.assign({}, snapshot);
  if (snapshot.settings && typeof snapshot.settings === 'object') copy.settings = Object.assign({}, snapshot.settings);
  if (snapshot.camera && typeof snapshot.camera === 'object') copy.camera = Object.assign({}, snapshot.camera);
  if (snapshot.player && typeof snapshot.player === 'object') copy.player = Object.assign({}, snapshot.player);
  if (snapshot.editor && typeof snapshot.editor === 'object') copy.editor = Object.assign({}, snapshot.editor);
  if (snapshot.shadowUi && typeof snapshot.shadowUi === 'object') copy.shadowUi = Object.assign({}, snapshot.shadowUi);
  if (Array.isArray(snapshot.instances)) copy.instances = snapshot.instances.map(function (inst) { return inst && typeof inst === 'object' ? Object.assign({}, inst) : inst; });
  if (Array.isArray(snapshot.boxes)) copy.boxes = snapshot.boxes.map(function (box) { return box && typeof box === 'object' ? Object.assign({}, box) : box; });
  if (Array.isArray(snapshot.lights)) copy.lights = snapshot.lights.map(function (light) { return light && typeof light === 'object' ? Object.assign({}, light) : light; });
  if (Array.isArray(snapshot.habboRefs)) copy.habboRefs = snapshot.habboRefs.map(function (ref) { return ref && typeof ref === 'object' ? Object.assign({}, ref) : ref; });
  return copy;
}

function repairLegacySceneSnapshot(snapshot, options) {
  options = options || {};
  var source = String(options.source || 'unknown');
  sceneRepairLog('repair-legacy-scene:start', 'source=' + source);
  var incoming = cloneSceneSnapshotShallow(snapshot);
  var beforeBoxes = Array.isArray(incoming.boxes) ? incoming.boxes.length : 0;
  var beforeInstances = Array.isArray(incoming.instances) ? incoming.instances.length : 0;
  if (!Array.isArray(incoming.instances) && Array.isArray(incoming.boxes) && incoming.boxes.length) {
    incoming.instances = legacyBoxesToInstances(incoming.boxes);
  }
  if (!Array.isArray(incoming.instances)) incoming.instances = [];
  if (!Array.isArray(incoming.lights)) incoming.lights = [];
  if (!Array.isArray(incoming.habboRefs)) incoming.habboRefs = [];
  if (!incoming.shadowUi || typeof incoming.shadowUi !== 'object') incoming.shadowUi = {};
  if (!incoming.editor || typeof incoming.editor !== 'object') incoming.editor = {};
  if (!incoming.settings || typeof incoming.settings !== 'object') incoming.settings = {};
  sceneRepairLog('repair-legacy-scene:done', 'source=' + source + ' beforeInstances=' + beforeInstances + ' beforeBoxes=' + beforeBoxes + ' afterInstances=' + incoming.instances.length + ' lights=' + incoming.lights.length + ' habboRefs=' + incoming.habboRefs.length);
  return incoming;
}

function restoreScenePrefabRefs(snapshot, options) {
  options = options || {};
  var source = String(options.source || 'unknown');
  var instanceList = snapshot && Array.isArray(snapshot.instances) ? snapshot.instances : [];
  sceneRepairLog('restore-prefab-refs:start', 'source=' + source + ' instances=' + instanceList.length);
  if (!instanceList.length) {
    sceneRepairLog('restore-prefab-refs:skipped', 'source=' + source + ' reason=no-instances');
    return { restored: 0, placeholders: 0, queuedLegacyHabbo: 0 };
  }
  var restored = 0;
  var placeholders = 0;
  var queuedLegacyHabbo = 0;
  for (var i = 0; i < instanceList.length; i++) {
    var inst = instanceList[i] || {};
    var prefabId = String(inst.prefabId || '').trim();
    if (!prefabId) continue;
    var existing = findPrefabByIdExact(prefabId);
    if (!existing) {
      var placeholder = ensureMissingPrefabRegistered(prefabId);
      if (placeholder) placeholders += 1;
      continue;
    }
    restored += 1;
    if (typeof queueLegacyHabboPrefabRepair === 'function' && isLegacyFlatHabboPrefab(existing)) {
      if (queueLegacyHabboPrefabRepair(existing.id, options.reason || 'scene-repair')) queuedLegacyHabbo += 1;
    }
  }
  sceneRepairLog('restore-prefab-refs:done', 'source=' + source + ' instances=' + instanceList.length + ' restored=' + restored + ' placeholders=' + placeholders + ' queuedLegacyHabbo=' + queuedLegacyHabbo);
  return { restored: restored, placeholders: placeholders, queuedLegacyHabbo: queuedLegacyHabbo };
}

async function restoreSceneHabboRefs(snapshot, options) {
  options = options || {};
  var source = String(options.source || 'unknown');
  var refs = snapshot && Array.isArray(snapshot.habboRefs) ? snapshot.habboRefs : [];
  sceneRepairLog('restore-habbo-refs:start', 'source=' + source + ' refs=' + refs.length);
  if (!refs.length) {
    sceneRepairLog('restore-habbo-refs:skipped', 'source=' + source + ' reason=no-habbo-refs');
    return { ok: true, loaded: 0, skipped: 0, failed: 0 };
  }
  var result = await ensureSceneHabboRefsLoaded(snapshot, { source: source });
  sceneRepairLog('restore-habbo-refs:done', 'source=' + source + ' ok=' + (!!(result && result.ok)) + ' loaded=' + (result && result.loaded || 0) + ' skipped=' + (result && result.skipped || 0) + ' failed=' + (result && result.failed || 0));
  return result || { ok: false, loaded: 0, skipped: 0, failed: refs.length };
}

async function repairSceneSnapshot(snapshot, options) {
  options = options || {};
  var source = String(options.source || 'unknown');
  var reason = String(options.reason || 'unknown');
  sceneRepairLog('repair-scene:start', 'source=' + source + ' reason=' + reason);
  var repaired = repairLegacySceneSnapshot(snapshot, options);
  var prefabSummary = restoreScenePrefabRefs(repaired, options);
  var habboSummary = await restoreSceneHabboRefs(repaired, options);
  sceneRepairLog('repair-scene:done', 'source=' + source + ' reason=' + reason + ' instances=' + (Array.isArray(repaired.instances) ? repaired.instances.length : 0) + ' prefabsRestored=' + (prefabSummary.restored || 0) + ' placeholders=' + (prefabSummary.placeholders || 0) + ' habboLoaded=' + (habboSummary && habboSummary.loaded || 0) + ' habboFailed=' + (habboSummary && habboSummary.failed || 0));
  return repaired;
}

function buildSceneSnapshot(options) {
  options = options || {};
  var kind = options.kind === 'debug' ? 'debug' : 'persistent';
  var snapshot = kind === 'debug' ? sceneSnapshot() : persistentSceneSnapshot();
  if (options.log !== false) {
    var meta = summarizeSceneSnapshotMeta(snapshot);
    sceneIoLog('build-snapshot:done', 'kind=' + kind + ' source=' + String(options.source || 'unknown') + ' instances=' + meta.instances + ' boxes=' + meta.boxes + ' lights=' + meta.lights + ' habboRefs=' + meta.habboRefs);
  }
  return snapshot;
}

function saveScene(options) {
  options = options || {};
  var workflow = shouldUseSceneWorkflowCompat(options) ? getSceneWorkflowCompatApi() : null;
  if (workflow && typeof workflow.saveSceneTarget === 'function') {
    return Promise.resolve(workflow.saveSceneTarget(Object.assign({}, options, { __fromLegacyCompat: true, source: options.source || 'scene-storage:compat:saveSceneTarget' }))).then(function (result) {
      return !!(result && result.ok);
    });
  }
  return saveSceneCore(options);
}

async function loadScene(options) {
  options = options || {};
  var workflow = shouldUseSceneWorkflowCompat(options) ? getSceneWorkflowCompatApi() : null;
  if (workflow && typeof workflow.loadSceneTarget === 'function') {
    var result = await workflow.loadSceneTarget(Object.assign({}, options, { __fromLegacyCompat: true, source: options.source || 'scene-storage:compat:loadSceneTarget' }));
    return !!(result && result.ok);
  }
  return await loadSceneCore(options);
}

// 场景存储与恢复系统：从 state.js 中抽离，保持原有全局函数接口不变。
// 注意：当前仍使用 script 顺序加载与全局函数，不引入 ES module。

async function ensureSceneHabboRefsLoaded(snapshot, options) {
  sceneStorageRouteLog('ensureSceneHabboRefsLoaded');
  options = options || {};
  var refs = snapshot && Array.isArray(snapshot.habboRefs) ? snapshot.habboRefs : [];
  if (!refs.length) return { ok: true, loaded: 0, skipped: 0, failed: 0 };
  if (!habboRootSupported()) return { ok: false, loaded: 0, skipped: refs.length, failed: refs.length, reason: 'server-mode-unavailable' };
  if (!habboAssetRootState.fetchedAt) await fetchHabboAssetRootConfig({ silent: true });
  var loaded = 0;
  var skipped = 0;
  var failed = 0;
  for (var i = 0; i < refs.length; i++) {
    var ref = refs[i] || {};
    var prefabId = String(ref.prefabId || '').trim();
    var relativePath = normalizeHabboRelativePathClient(ref.relativePath || ref.sourceName || '');
    if (!prefabId || !relativePath) { failed += 1; continue; }
    var existing = findPrefabByIdExact(prefabId);
    if (existing && !existing.missingPrefab) { skipped += 1; continue; }
    try {
      var buffer = await fetchHabboAssetFileBuffer(relativePath);
      await importHabboSwfToSceneFromBuffer(buffer, {
        assetName: basenameFromPath(relativePath),
        relativePath: relativePath,
        displayName: String(ref.displayName || makeHabboDisplayNameFromRelativePath(relativePath)),
        prefabId: prefabId,
        select: false,
        prepareForPlacement: false,
        sourceKind: 'habbo-root',
      });
      loaded += 1;
    } catch (err) {
      ensureMissingPrefabRegistered(prefabId);
      failed += 1;
      pushLog('habbo-scene-ref:error prefab=' + prefabId + ' relativePath=' + relativePath + ' error=' + (err && err.message ? err.message : err));
    }
  }
  if (loaded > 0) refreshPrefabSelectOptions('scene-storage:ensure-habbo-refs-loaded');
  return { ok: failed === 0, loaded: loaded, skipped: skipped, failed: failed };
}

async function applySceneSnapshotWithExternalAssets(snapshot, options) {
  options = options || {};
  var repairedSnapshot = await repairSceneSnapshot(snapshot, options);
  applySceneSnapshot(repairedSnapshot, options);
  if (repairedSnapshot && Array.isArray(repairedSnapshot.habboRefs) && repairedSnapshot.habboRefs.length) {
    var summary = collectSceneHabboRefs(repairedSnapshot.instances || []).length;
    detailLog('scene-habbo: refs=' + repairedSnapshot.habboRefs.length + ' active=' + summary);
  }
  return true;
}

async function scanHabboAssetRoot(force) {
  sceneStorageRouteLog('scanHabboAssetRoot', 'force=' + (!!force));
  if (!habboRootSupported()) {
    updateHabboRootStatus();
    pushLog('habbo-root-scan: server mode unavailable');
    return false;
  }
  var currentPrefabId = currentPrefab() ? currentPrefab().id : '';
  var currentMode = editor.mode;
  try {
    var habboApi = getHabboApiAdapter();
    var indexResult = await habboApi.fetchIndex();
    var res = indexResult.response;
    var data = indexResult.data;
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
    var items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      habboAssetRootState.itemCount = 0;
      updateHabboRootStatus('Habbo 根目录已配置，但当前没有找到 SWF 文件。');
      return true;
    }
    updateHabboRootStatus('Habbo 根目录：正在扫描 ' + items.length + ' 个 SWF，请稍候…');
    var imported = 0;
    var failed = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      try {
        var buffer = await fetchHabboAssetFileBuffer(item.relativePath);
        await importHabboSwfToSceneFromBuffer(buffer, {
          assetName: item.name,
          relativePath: item.relativePath,
          displayName: makeHabboDisplayNameFromRelativePath(item.relativePath),
          prefabId: makeHabboPrefabIdFromRelativePath(item.relativePath),
          select: false,
          prepareForPlacement: false,
          sourceKind: 'habbo-root',
        });
        imported += 1;
      } catch (err) {
        failed += 1;
        pushLog('habbo-root-scan:file-error path=' + item.relativePath + ' error=' + (err && err.message ? err.message : err));
      }
    }
    if (typeof __prefabRegistryApi !== 'undefined' && __prefabRegistryApi && typeof __prefabRegistryApi.refreshPrototypeSelection === 'function') __prefabRegistryApi.refreshPrototypeSelection({ source: 'scene-storage:scan-habbo-root' });
    else refreshPrefabSelectOptions('scene-storage:scan-habbo-root');
    if (currentPrefabId) {
      var idx = (typeof __prefabRegistryApi !== 'undefined' && __prefabRegistryApi && typeof __prefabRegistryApi.setSelectedPrefabId === 'function')
        ? __prefabRegistryApi.setSelectedPrefabId(currentPrefabId, { source: 'scene-storage:scan-habbo-root' })
        : prototypes.findIndex(function (p) { return p.id === currentPrefabId; });
      if (idx >= 0 && ui.prefabSelect) ui.prefabSelect.value = String(idx);
    }
    if (typeof requestEditorModeChange === 'function') requestEditorModeChange(currentMode, { source: 'scene-storage:scan-habbo-root' });
    else editor.mode = currentMode;
    updateModeButtons();
    if (editor.mode === 'place' || editor.mode === 'drag') updatePreview();
    habboAssetRootState.itemCount = items.length;
    habboAssetRootState.configured = true;
    habboAssetRootState.exists = true;
    habboAssetRootState.lastError = '';
    habboAssetRootState.fetchedAt = Date.now();
    updateHabboRootStatus('Habbo 根目录扫描完成：共 ' + items.length + ' 个 SWF，成功导入 ' + imported + ' 个，失败 ' + failed + ' 个。');
    pushLog('habbo-root-scan: files=' + items.length + ' imported=' + imported + ' failed=' + failed + ' force=' + (!!force));
    if (ui.prefabHint && currentPrefab()) ui.prefabHint.textContent = `当前模板：${currentPrefab().name}，局部体素 ${currentPrefab().voxels.length} 个，尺寸 ${currentPrefab().w}×${currentPrefab().d}×${currentPrefab().h}。`;
    return true;
  } catch (err) {
    updateHabboRootStatus('Habbo 根目录扫描失败：' + (err && err.message ? err.message : err));
    pushLog('habbo-root-scan:error ' + (err && err.message ? err.message : err));
    return false;
  }
}

function sceneSnapshot() {
  return {
    settings: { ...settings },
    camera: { ...camera },
    player: { x: player.x, y: player.y, dir: player.dir, r: player.r },
    editor: {
      mode: editor.mode,
      prototypeIndex: editor.prototypeIndex,
      rotation: editor.rotation,
      previewFacing: editor.previewFacing || 0,
      draggingInstance: editor.draggingInstance ? { ...editor.draggingInstance } : null,
      preview: editor.preview ? {
        valid: editor.preview.valid,
        reason: editor.preview.reason ?? '',
        supportZ: editor.preview.supportZ ?? null,
        supportHeights: editor.preview.supportHeights ?? [],
        overlapIds: editor.preview.overlapIds ?? [],
        box: editor.preview.box ? { ...editor.preview.box } : null,
      } : null,
    },
    instances: currentSceneInstances().map(inst => ({ ...inst })),
    boxes: currentSceneBoxes().map(b => ({ ...b })),
    lights: lights.map(l => ({ ...l })),
    activeLightId,
  };
}

function persistentSceneSnapshot() {
  return {
    settings: {
      worldCols: settings.worldCols,
      worldRows: settings.worldRows,
      worldResolution: settings.worldResolution,
      worldDisplayScale: settings.worldDisplayScale,
      gridW: settings.gridW,
      gridH: settings.gridH,
      tileScale: settings.tileScale,
      playerHeightCells: settings.playerHeightCells,
      playerProxyW: settings.playerProxyW,
      playerProxyD: settings.playerProxyD,
      ambient: settings.ambient,
    },
    camera: { x: camera.x, y: camera.y },
    player: { x: player.x, y: player.y, dir: player.dir, r: player.r },
    editor: {
      mode: editor.mode,
      prototypeIndex: editor.prototypeIndex,
      rotation: editor.rotation,
      previewFacing: editor.previewFacing || 0,
    },
    shadowUi: {
      highContrastShadow: !!lightState.highContrastShadow,
      shadowDebugColor: lightState.shadowDebugColor || '#ff2a6d',
      lightingEnabled: !!(lightState.enabled !== false),
      shadowAlpha: Number.isFinite(Number(lightState.shadowAlpha)) ? Number(lightState.shadowAlpha) : 0.24,
      shadowOpacityScale: Number.isFinite(Number(lightState.shadowOpacityScale)) ? Number(lightState.shadowOpacityScale) : 1,
      shadowDistanceFadeEnabled: !!lightState.shadowDistanceFadeEnabled,
      shadowDistanceFadeRate: Number.isFinite(Number(lightState.shadowDistanceFadeRate)) ? Number(lightState.shadowDistanceFadeRate) : 0.35,
      shadowDistanceFadeMin: Number.isFinite(Number(lightState.shadowDistanceFadeMin)) ? Number(lightState.shadowDistanceFadeMin) : 0.18,
      shadowEdgeFadeEnabled: !!lightState.shadowEdgeFadeEnabled,
      shadowEdgeFadePx: Number.isFinite(Number(lightState.shadowEdgeFadePx)) ? Number(lightState.shadowEdgeFadePx) : 6,
    },
    instances: currentSceneInstances().map(inst => ({ ...inst })),
    habboRefs: collectSceneHabboRefs(currentSceneInstances()),
    boxes: currentSceneBoxes().map(b => ({ ...b })),
    lights: lights.map(l => ({ ...l })),
    activeLightId,
  };
}

function createDefaultSceneData() {
  return {
    settings: {
      worldCols: 11,
      worldRows: 9,
      worldResolution: 1,
      worldDisplayScale: 1,
      gridW: 11,
      gridH: 9,
      tileScale: 1,
      playerHeightCells: 1.7,
      playerProxyW: 0.32,
      playerProxyD: 0.24,
      ambient: 0.22,
    },
    camera: { x: 0, y: 0 },
    player: { x: 1.1, y: 1.1, dir: 'down', r: 0.22 },
    editor: {
      mode: 'view',
      prototypeIndex: 0,
      rotation: 0,
    },
    shadowUi: {
      highContrastShadow: false,
      shadowDebugColor: '#ff2a6d',
      lightingEnabled: true,
      shadowAlpha: 0.24,
      shadowOpacityScale: 1,
      shadowDistanceFadeEnabled: false,
      shadowDistanceFadeRate: 0.35,
      shadowDistanceFadeMin: 0.18,
      shadowEdgeFadeEnabled: false,
      shadowEdgeFadePx: 6,
    },
    instances: defaultInstances().map(inst => ({ ...inst })),
    boxes: defaultBoxes().map(b => ({ ...b })),
    lights: makeLightingPreset('allOn').lights.map(l => normalizeLight({ ...l })),
    activeLightId: 1,
  };
}

function sceneStorageAvailable() {
  try {
    if (!window.localStorage) return false;
    const probe = '__scene_storage_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch (err) {
    detailLog(`scene-storage: unavailable reason=${err?.message || err}`);
    return false;
  }
}

function applySceneSnapshot(snapshot, options = {}) {
  var sourceName = String((options && options.source) || 'unknown');
  var reasonName = String((options && options.reason) || 'applySceneSnapshot');
  var incomingMeta = summarizeSceneSnapshotMeta(snapshot);
  sceneIoLog('apply-snapshot:start', 'source=' + sourceName + ' reason=' + reasonName + ' instances=' + incomingMeta.instances + ' boxes=' + incomingMeta.boxes + ' lights=' + incomingMeta.lights + ' habboRefs=' + incomingMeta.habboRefs);
  clearSelectedInstance();
  const base = createDefaultSceneData();
  const incoming = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const nextSettings = { ...base.settings, ...(incoming.settings || {}) };
  nextSettings.worldResolution = clamp(parseInt(nextSettings.worldResolution || 1, 10) || 1, 1, 4);
  if (![1, 2, 4].includes(nextSettings.worldResolution)) nextSettings.worldResolution = 1;
  nextSettings.worldCols = clamp(parseInt(nextSettings.worldCols ?? nextSettings.gridW ?? base.settings.worldCols, 10) || base.settings.worldCols, WORLD_SIZE_MIN, WORLD_SIZE_MAX);
  nextSettings.worldRows = clamp(parseInt(nextSettings.worldRows ?? nextSettings.gridH ?? base.settings.worldRows, 10) || base.settings.worldRows, WORLD_SIZE_MIN, WORLD_SIZE_MAX);
  nextSettings.worldDisplayScale = clamp(parseFloat(nextSettings.worldDisplayScale ?? ((nextSettings.tileScale || base.settings.worldDisplayScale) * nextSettings.worldResolution)), 0.5, 2.4);
  setElValue(ui.gridW, String(nextSettings.worldCols));
  setElValue(ui.gridH, String(nextSettings.worldRows));
  setElValue(ui.worldResolution, String(nextSettings.worldResolution));
  setElValue(ui.tileScale, String(nextSettings.worldDisplayScale));
  setElValue(ui.playerHeightCells, String(nextSettings.playerHeightCells));
  setElValue(ui.playerProxyW, String(nextSettings.playerProxyW));
  setElValue(ui.playerProxyD, String(nextSettings.playerProxyD));
  applySettings();
  settings.ambient = clamp(Number(nextSettings.ambient ?? base.settings.ambient), 0, 1.4);
  setElValue(ui.ambientStrength, String(settings.ambient));
  setElText(ui.ambientValue, settings.ambient.toFixed(2));

  var __sceneGraphApi = getSceneGraphStateApi();
  var nextInstances = Array.isArray(incoming.instances) && incoming.instances.length ? incoming.instances : null;
  if (!nextInstances && Array.isArray(incoming.boxes) && incoming.boxes.length) nextInstances = legacyBoxesToInstances(incoming.boxes);
  if (!nextInstances || !nextInstances.length) nextInstances = base.instances;
  var normalizedInstances = nextInstances.map(function (inst, idx) {
    var normalized = {
      instanceId: typeof inst.instanceId === 'string' && inst.instanceId ? inst.instanceId : 'obj_' + String(idx + 1).padStart(4, '0'),
      prefabId: (findPrefabByIdExact(inst.prefabId || '') || ensureMissingPrefabRegistered(inst.prefabId || '')).id,
      x: Number(inst.x) || 0,
      y: Number(inst.y) || 0,
      z: Number(inst.z) || 0,
      rotation: ((parseInt(inst.rotation || 0, 10) % 4) + 4) % 4,
      name: inst.name || undefined,
    };
    if (inst && (inst.renderUpdateMode === 'static' || inst.renderUpdateMode === 'dynamic')) {
      normalized.renderUpdateMode = String(inst.renderUpdateMode);
    }
    return normalized;
  });
  if (__sceneGraphApi && typeof __sceneGraphApi.replaceSceneGraph === 'function') {
    __sceneGraphApi.replaceSceneGraph({ instances: normalizedInstances }, { source: 'scene-storage:applySceneSnapshot' });
    var __sceneSessionApi = getSceneSessionStateApi();
    if (__sceneSessionApi && typeof __sceneSessionApi.syncDerivedState === 'function') {
      __sceneSessionApi.syncDerivedState({ source: 'scene-storage:applySceneSnapshot:post-owner-sync' });
    }
  } else {
    instances = normalizedInstances;
    if (typeof filterInstancesToGrid === 'function') filterInstancesToGrid();
    if (typeof recomputeNextInstanceSerial === 'function') recomputeNextInstanceSerial();
    if (typeof rebuildBoxesFromInstances === 'function') rebuildBoxesFromInstances();
  }
  filterInstancesToGrid();
  recomputeNextInstanceSerial();
  rebuildBoxesFromInstances();

  const nextLights = Array.isArray(incoming.lights) && incoming.lights.length ? incoming.lights : base.lights;
  lights = nextLights.map((l, idx) => normalizeLight({ ...l, id: Number.isFinite(Number(l.id)) ? Number(l.id) : idx + 1 }));
  nextLightId = lights.reduce((m, l) => Math.max(m, l.id || 0), 0) + 1;
  activeLightId = lights.some(l => l.id === incoming.activeLightId) ? incoming.activeLightId : (lights[0]?.id ?? 1);

  const nextCamera = { ...base.camera, ...(incoming.camera || {}) };
  if (typeof __runtimeStateApi !== 'undefined' && __runtimeStateApi && typeof __runtimeStateApi.setCamera === 'function') __runtimeStateApi.setCamera({ x: Number(nextCamera.x) || 0, y: Number(nextCamera.y) || 0 }, { source: 'scene-storage:applySceneSnapshot' });
  else {
    camera.x = Number(nextCamera.x) || 0;
    camera.y = Number(nextCamera.y) || 0;
  }

  const nextShadowUi = { ...base.shadowUi, ...(incoming.shadowUi || {}) };
  lightState.enabled = nextShadowUi.lightingEnabled !== false;
  lightState.highContrastShadow = !!nextShadowUi.highContrastShadow;
  lightState.shadowDebugColor = typeof nextShadowUi.shadowDebugColor === 'string' ? nextShadowUi.shadowDebugColor : base.shadowUi.shadowDebugColor;
  lightState.shadowAlpha = clamp(Number(nextShadowUi.shadowAlpha ?? base.shadowUi.shadowAlpha), 0.1, 1.6);
  lightState.shadowOpacityScale = clamp(Number(nextShadowUi.shadowOpacityScale ?? base.shadowUi.shadowOpacityScale), 0.3, 3);
  lightState.shadowDistanceFadeEnabled = !!nextShadowUi.shadowDistanceFadeEnabled;
  lightState.shadowDistanceFadeRate = clamp(Number(nextShadowUi.shadowDistanceFadeRate ?? base.shadowUi.shadowDistanceFadeRate), 0, 1.5);
  lightState.shadowDistanceFadeMin = clamp(Number(nextShadowUi.shadowDistanceFadeMin ?? base.shadowUi.shadowDistanceFadeMin), 0, 1);
  lightState.shadowEdgeFadeEnabled = !!nextShadowUi.shadowEdgeFadeEnabled;
  lightState.shadowEdgeFadePx = clamp(Number(nextShadowUi.shadowEdgeFadePx ?? base.shadowUi.shadowEdgeFadePx), 0, 20);

  const nextPlayer = { ...base.player, ...(incoming.player || {}) };
  player.x = clamp(Number(nextPlayer.x) || base.player.x, player.r + 0.05, settings.gridW - player.r - 0.05);
  player.y = clamp(Number(nextPlayer.y) || base.player.y, player.r + 0.05, settings.gridH - player.r - 0.05);
  player.dir = typeof nextPlayer.dir === 'string' ? nextPlayer.dir : base.player.dir;
  player.r = Math.max(0.05, Number(nextPlayer.r) || base.player.r);
  player.walk = 0;
  player.moving = false;

  const nextEditor = { ...base.editor, ...(incoming.editor || {}) };
  var nextPrototypeIndex = clamp(parseInt(nextEditor.prototypeIndex ?? base.editor.prototypeIndex, 10) || 0, 0, prototypes.length - 1);
  if (typeof __prefabRegistryApi !== 'undefined' && __prefabRegistryApi && typeof __prefabRegistryApi.setSelectedPrototypeIndex === 'function') __prefabRegistryApi.setSelectedPrototypeIndex(nextPrototypeIndex, { source: 'scene-storage:applySceneSnapshot' });
  else editor.prototypeIndex = nextPrototypeIndex;
  if (typeof __prefabRegistryApi !== 'undefined' && __prefabRegistryApi && typeof __prefabRegistryApi.refreshPrototypeSelection === 'function') __prefabRegistryApi.refreshPrototypeSelection({ source: 'scene-storage:apply-scene-snapshot' });
  else refreshPrefabSelectOptions('scene-storage:apply-scene-snapshot');
  if (ui.prefabSelect) ui.prefabSelect.value = String(editor.prototypeIndex);
  editor.rotation = ((parseInt(nextEditor.rotation ?? base.editor.rotation, 10) || 0) % 4 + 4) % 4;
  editor.previewFacing = ((parseInt(nextEditor.previewFacing ?? base.editor.previewFacing ?? 0, 10) || 0) % 4 + 4) % 4;
  editor.draggingInstance = null;
  editor.preview = null;
  editor.hoverDeleteBox = null;
  var nextMode = ['view', 'place', 'delete'].includes(nextEditor.mode) ? nextEditor.mode : base.editor.mode;
  if (typeof __runtimeStateApi !== 'undefined' && __runtimeStateApi && typeof __runtimeStateApi.setEditorModeValue === 'function') __runtimeStateApi.setEditorModeValue(nextMode, { source: 'scene-storage:applySceneSnapshot' });
  else editor.mode = nextMode;

  mouse.draggingView = false;
  lightState.dragAxis = null;
  lightState.hoverAxis = null;
  lightState.dragStartMouse = null;
  lightState.dragStartLight = null;

  updateModeButtons();
  if (editor.mode === 'place' || editor.mode === 'drag') updatePreview();
  invalidateShadowGeometryCache(options.reason || 'applySceneSnapshot');
  syncLightUI();
  if (options.log !== false) {
    var __currentInstances = currentSceneInstances();
    var __currentBoxes = currentSceneBoxes();
    pushLog(`scene-apply: source=${options.source || 'unknown'} instances=${__currentInstances.length} boxes=${__currentBoxes.length} lights=${lights.length} grid=${settings.gridW}x${settings.gridH}`);
  }
  var __applyInstances = currentSceneInstances();
  var __applyBoxes = currentSceneBoxes();
  sceneIoLog('apply-snapshot:done', 'source=' + sourceName + ' reason=' + reasonName + ' instances=' + __applyInstances.length + ' boxes=' + __applyBoxes.length + ' lights=' + lights.length + ' grid=' + settings.gridW + 'x' + settings.gridH);
}

function saveSceneToLocalStorage() {
  if (!sceneStorageAvailable()) {
    pushLog('scene-save: localStorage unavailable');
    return false;
  }
  const snapshot = buildSceneSnapshot({ kind: 'persistent', source: 'scene-storage:save-local', log: false });
  window.localStorage.setItem(LOCAL_SCENE_STORAGE_KEY, JSON.stringify(snapshot));
  pushLog(`scene-save: key=${LOCAL_SCENE_STORAGE_KEY} instances=${snapshot.instances.length} boxes=${snapshot.boxes.length} lights=${snapshot.lights.length}`);
  return true;
}

async function loadSceneFromLocalStorage(options = {}) {
  if (!sceneStorageAvailable()) {
    pushLog('scene-load: localStorage unavailable');
    return false;
  }
  const raw = window.localStorage.getItem(LOCAL_SCENE_STORAGE_KEY);
  if (!raw) {
    if (!options.silent) pushLog('scene-load: no saved scene');
    return false;
  }
  try {
    const snapshot = JSON.parse(raw);
    await applySceneSnapshotWithExternalAssets(snapshot, { source: options.source || 'localStorage', reason: 'loadScene', log: !options.silent });
    return true;
  } catch (err) {
    pushLog(`scene-load:error ${err?.message || err}`);
    return false;
  }
}

function clearSavedSceneFromLocalStorage() {
  if (!sceneStorageAvailable()) return false;
  window.localStorage.removeItem(LOCAL_SCENE_STORAGE_KEY);
  pushLog(`scene-clear: key=${LOCAL_SCENE_STORAGE_KEY}`);
  return true;
}

function sanitizeSceneFilenameClient(name, fallback) {
  var base = String(name || '').trim().replace(/[<>:"/\\|?*]+/g, '_').replace(/[\r\n\t]+/g, ' ').replace(/^\.+/, '').replace(/[. ]+$/g, '');
  if (!base) base = String(fallback || 'scene');
  if (!/\.json$/i.test(base)) base += '.json';
  return base;
}

function makeSceneTimestampToken() {
  var now = new Date();
  var y = now.getFullYear();
  var m = String(now.getMonth() + 1).padStart(2, '0');
  var d = String(now.getDate()).padStart(2, '0');
  var hh = String(now.getHours()).padStart(2, '0');
  var mm = String(now.getMinutes()).padStart(2, '0');
  var ss = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${hh}${mm}${ss}`;
}

function suggestSceneFilename(seed) {
  return sanitizeSceneFilenameClient(seed || currentSceneServerFile || `scene_${makeSceneTimestampToken()}` , 'scene');
}

function sceneFilesSupported() {
  return isServerMode() && typeof fetch === 'function';
}

function persistCurrentSceneServerFileName(filename) {
  currentSceneServerFile = filename ? String(filename) : '';
  if (!sceneStorageAvailable()) return currentSceneServerFile;
  try {
    if (currentSceneServerFile) window.localStorage.setItem(LOCAL_SCENE_CURRENT_FILE_KEY, currentSceneServerFile);
    else window.localStorage.removeItem(LOCAL_SCENE_CURRENT_FILE_KEY);
  } catch (err) {
    detailLog(`scene-current-file:error ${err?.message || err}`);
  }
  return currentSceneServerFile;
}

function recallCurrentSceneServerFileName() {
  if (currentSceneServerFile) return currentSceneServerFile;
  if (!sceneStorageAvailable()) return '';
  try {
    currentSceneServerFile = String(window.localStorage.getItem(LOCAL_SCENE_CURRENT_FILE_KEY) || '');
  } catch (err) {
    currentSceneServerFile = '';
  }
  return currentSceneServerFile;
}

function updateSceneFileStatus(message) {
  if (!ui || !ui.sceneFileStatus) return;
  if (message) {
    ui.sceneFileStatus.textContent = String(message);
    return;
  }
  if (!sceneFilesSupported()) {
    ui.sceneFileStatus.textContent = '场景文件：当前不是 http 本地服务器模式；“保存到文件 / 默认打开”不可用，但仍可用导出 JSON 与浏览器存档。';
    return;
  }
  var current = recallCurrentSceneServerFileName();
  ui.sceneFileStatus.textContent = current ? `场景文件：当前默认文件为 ${current}，下次启动会优先打开它。` : '场景文件：还没有默认文件；可先点“保存到文件”。';
}

async function saveSceneToServerFile(filename, options = {}) {
  if (!sceneFilesSupported()) {
    updateSceneFileStatus();
    pushLog('scene-file-save: server mode unavailable');
    return false;
  }
  var nextFilename = suggestSceneFilename(filename);
  try {
    var snapshot = buildSceneSnapshot({ kind: 'persistent', source: 'scene-storage:save-server-file', log: false });
    var sceneApi = getSceneApiAdapter();
    var saveResult = await sceneApi.saveScene({ filename: nextFilename, scene: snapshot, setDefault: options.setDefault !== false });
    var res = saveResult.response;
    var data = saveResult.data;
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
    persistCurrentSceneServerFileName(data.file || nextFilename);
    updateSceneFileStatus(`场景文件：已保存到 ${data.path || ('assets/scenes/' + (data.file || nextFilename))}，并设为默认打开。`);
    pushLog(`scene-file-save: file=${data.file || nextFilename} instances=${snapshot.instances.length} boxes=${snapshot.boxes.length} lights=${snapshot.lights.length} default=${options.setDefault !== false}`);
    return true;
  } catch (err) {
    updateSceneFileStatus(`场景文件保存失败：${err?.message || err}`);
    pushLog(`scene-file-save:error ${err?.message || err}`);
    return false;
  }
}

async function loadSceneFromServerFile(filename, options = {}) {
  if (!sceneFilesSupported()) {
    updateSceneFileStatus();
    pushLog('scene-file-load: server mode unavailable');
    return false;
  }
  var nextFilename = suggestSceneFilename(filename, 'scene');
  try {
    var sceneApi = getSceneApiAdapter();
    var loadResult = await sceneApi.loadScene(nextFilename);
    var res = loadResult.response;
    var data = loadResult.data;
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
    await applySceneSnapshotWithExternalAssets(data.scene, { source: options.source || 'scene-file', reason: options.reason || 'loadSceneFile', log: !options.silent });
    persistCurrentSceneServerFileName(data.file || nextFilename);
    updateSceneFileStatus(`场景文件：已打开 ${data.file || nextFilename}。`);
    pushLog(`scene-file-load: file=${data.file || nextFilename}`);
    return true;
  } catch (err) {
    updateSceneFileStatus(`场景文件读取失败：${err?.message || err}`);
    pushLog(`scene-file-load:error ${err?.message || err}`);
    return false;
  }
}

async function loadDefaultSceneFromServer(options = {}) {
  if (!sceneFilesSupported()) {
    updateSceneFileStatus();
    return false;
  }
  try {
    var sceneApi = getSceneApiAdapter();
    var defaultResult = await sceneApi.loadDefaultScene();
    var res = defaultResult.response;
    var data = defaultResult.data;
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
    if (!data.hasDefault || !data.scene) {
      persistCurrentSceneServerFileName('');
      if (!options.silent) updateSceneFileStatus('场景文件：还没有默认文件；可先点“保存到文件”。');
      return false;
    }
    await applySceneSnapshotWithExternalAssets(data.scene, { source: options.source || 'scene-default', reason: options.reason || 'loadDefaultSceneFile', log: !options.silent });
    persistCurrentSceneServerFileName(data.file || '');
    updateSceneFileStatus(`场景文件：已自动打开默认文件 ${data.file}。`);
    pushLog(`scene-default-load: file=${data.file}`);
    return true;
  } catch (err) {
    updateSceneFileStatus(`默认场景文件读取失败：${err?.message || err}`);
    pushLog(`scene-default-load:error ${err?.message || err}`);
    return false;
  }
}

async function importSceneJsonFile(file, options = {}) {
  if (!file) return false;
  try {
    var text = await file.text();
    var snapshot = JSON.parse(text);
    await applySceneSnapshotWithExternalAssets(snapshot, { source: options.source || 'scene-import', reason: 'importSceneFile', log: true });
    pushLog(`scene-import: name=${file.name} bytes=${file.size || 0}`);
    if (sceneFilesSupported()) {
      var importedFilename = suggestSceneFilename(file.name || 'imported_scene.json');
      await saveSceneToServerFile(importedFilename, { setDefault: options.setDefault !== false });
    } else {
      saveSceneToLocalStorage();
      updateSceneFileStatus('场景文件：已导入到当前场景；当前模式不支持默认文件，已同时写入浏览器存档。');
    }
    return true;
  } catch (err) {
    updateSceneFileStatus(`场景导入失败：${err?.message || err}`);
    pushLog(`scene-import:error ${err?.message || err}`);
    return false;
  }
}

function exportSceneJsonDownload(filename = 'scene.json') {
  try {
    const snapshot = buildSceneSnapshot({ kind: 'persistent', source: 'scene-storage:export-download', log: false });
    const payload = `${JSON.stringify(snapshot, null, 2)}
`;
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    pushLog(`scene-export: file=${filename} instances=${snapshot.instances.length} boxes=${snapshot.boxes.length} lights=${snapshot.lights.length}`);
    return true;
  } catch (err) {
    pushLog(`scene-export:error ${err?.message || err}`);
    return false;
  }
}

function createWorldSceneDataFromUi(options) {
  options = options || {};
  var base = createDefaultSceneData();
  var worldCols = clamp(parseInt((ui.gridW && ui.gridW.value) || '11', 10) || 11, WORLD_SIZE_MIN, WORLD_SIZE_MAX);
  var worldRows = clamp(parseInt((ui.gridH && ui.gridH.value) || '9', 10) || 9, WORLD_SIZE_MIN, WORLD_SIZE_MAX);
  var worldResolution = clamp(parseInt((ui.worldResolution && ui.worldResolution.value) || '1', 10) || 1, 1, 4);
  if (![1, 2, 4].includes(worldResolution)) worldResolution = 1;
  var worldDisplayScale = clamp(parseFloat((ui.tileScale && ui.tileScale.value) || '1'), 0.5, 2.4);
  base.settings.worldCols = worldCols;
  base.settings.worldRows = worldRows;
  base.settings.worldResolution = worldResolution;
  base.settings.worldDisplayScale = worldDisplayScale;
  base.settings.gridW = worldCols * worldResolution;
  base.settings.gridH = worldRows * worldResolution;
  base.settings.tileScale = worldDisplayScale / worldResolution;
  base.settings.playerHeightCells = settings.playerHeightCells;
  base.settings.playerProxyW = settings.playerProxyW;
  base.settings.playerProxyD = settings.playerProxyD;
  base.settings.ambient = settings.ambient;
  base.player = { x: 1.1 * worldResolution, y: 1.1 * worldResolution, dir: 'down', r: player.r };
  base.instances = [];
  base.boxes = [];
  if (options.keepLights !== false) {
    base.lights = lights.map(function (l) { return normalizeLight({ ...l }); });
    base.activeLightId = activeLightId;
    base.shadowUi = {
      highContrastShadow: !!lightState.highContrastShadow,
      shadowDebugColor: lightState.shadowDebugColor || '#ff2a6d',
      lightingEnabled: !!(lightState.enabled !== false),
      shadowAlpha: Number.isFinite(Number(lightState.shadowAlpha)) ? Number(lightState.shadowAlpha) : 0.24,
      shadowOpacityScale: Number.isFinite(Number(lightState.shadowOpacityScale)) ? Number(lightState.shadowOpacityScale) : 1,
      shadowDistanceFadeEnabled: !!lightState.shadowDistanceFadeEnabled,
      shadowDistanceFadeRate: Number.isFinite(Number(lightState.shadowDistanceFadeRate)) ? Number(lightState.shadowDistanceFadeRate) : 0.35,
      shadowDistanceFadeMin: Number.isFinite(Number(lightState.shadowDistanceFadeMin)) ? Number(lightState.shadowDistanceFadeMin) : 0.18,
      shadowEdgeFadeEnabled: !!lightState.shadowEdgeFadeEnabled,
      shadowEdgeFadePx: Number.isFinite(Number(lightState.shadowEdgeFadePx)) ? Number(lightState.shadowEdgeFadePx) : 6,
    };
  }
  base.editor.mode = 'view';
  base.editor.prototypeIndex = editor.prototypeIndex;
  base.editor.rotation = 0;
  base.editor.previewFacing = 0;
  return base;
}

function resetSceneToDefault() {
  clearSelectedInstance();
  clearSavedSceneFromLocalStorage();
  applySceneSnapshot(createDefaultSceneData(), { source: 'default', reason: 'resetScene' });
}

function applyWorldToNewScene() {
  clearSelectedInstance();
  var scene = createWorldSceneDataFromUi({ keepLights: true });
  applySceneSnapshot(scene, { source: 'world-ui', reason: 'newWorld' });
  pushLog(`world-apply: cols=${settings.worldCols} rows=${settings.worldRows} resolution=${settings.worldResolution} actualGrid=${settings.gridW}x${settings.gridH} tileScale=${settings.tileScale.toFixed(2)}`);
}

var sceneWorkflowCounters = { saveSceneTargetCalls: 0, loadSceneTargetCalls: 0, startupRestoreCalls: 0 };
var sceneWorkflowLastEvent = null;
var sceneWorkflowRecentEvents = [];

function recordSceneWorkflowEvent(kind, detail) {
  var entry = { at: new Date().toISOString(), kind: String(kind || ''), detail: detail || null };
  sceneWorkflowLastEvent = entry;
  sceneWorkflowRecentEvents.push(entry);
  if (sceneWorkflowRecentEvents.length > 16) sceneWorkflowRecentEvents.shift();
  return entry;
}

function summarizeSceneWorkflowState() {
  return {
    currentFile: recallCurrentSceneServerFileName(),
    counters: {
      saveSceneTargetCalls: sceneWorkflowCounters.saveSceneTargetCalls,
      loadSceneTargetCalls: sceneWorkflowCounters.loadSceneTargetCalls,
      startupRestoreCalls: sceneWorkflowCounters.startupRestoreCalls
    },
    lastEvent: sceneWorkflowLastEvent,
    recentEvents: sceneWorkflowRecentEvents.slice(),
    sceneStorageAvailable: sceneStorageAvailable(),
    sceneFilesSupported: sceneFilesSupported(),
    instanceCount: currentSceneInstances().length,
    boxCount: currentSceneBoxes().length,
    sceneSession: summarizeCurrentSceneSession('scene-workflow'),
    lightCount: Array.isArray(lights) ? lights.length : 0
  };
}

function getSceneWorkflowCompatApi() {
  try { return window.App && window.App.services ? window.App.services.sceneWorkflow || null : null; } catch (_) { return null; }
}

function shouldUseSceneWorkflowCompat(options) {
  return !(options && (options.__fromSceneWorkflow || options.__skipWorkflowCompat));
}

function buildSceneWorkflowResult(operation, options, extra) {
  options = options || {};
  return Object.assign({
    ok: true,
    operation: String(operation || 'unknown'),
    protocolVersion: 'P6-C-scene-workflow-v1',
    source: String(options.source || ('services.sceneWorkflow:' + String(operation || 'unknown'))),
    target: String(options.target || 'local'),
    compatDelegated: !!options.__fromLegacyCompat
  }, summarizeSceneWorkflowState(), extra || {});
}

function saveSceneCore(options) {
  options = options || {};
  var target = String(options.target || 'local');
  var source = String(options.source || 'unknown');
  sceneIoLog('save-scene:start', 'target=' + target + ' source=' + source);
  if (target === 'local') {
    var ok = saveSceneToLocalStorage();
    sceneIoLog('save-scene:done', 'target=' + target + ' source=' + source + ' ok=' + (!!ok));
    return Promise.resolve(!!ok);
  }
  if (target === 'server-file') {
    return Promise.resolve(saveSceneToServerFile(options.filename, options)).then(function(ok) {
      sceneIoLog('save-scene:done', 'target=' + target + ' source=' + source + ' ok=' + (!!ok) + ' filename=' + String(options.filename || ''));
      return !!ok;
    });
  }
  if (target === 'export') {
    var exported = exportSceneJsonDownload(options.filename || 'scene.json');
    sceneIoLog('save-scene:done', 'target=' + target + ' source=' + source + ' ok=' + (!!exported) + ' filename=' + String(options.filename || 'scene.json'));
    return Promise.resolve(!!exported);
  }
  sceneIoLog('save-scene:done', 'target=' + target + ' source=' + source + ' ok=false reason=unsupported-target');
  return Promise.resolve(false);
}

async function loadSceneCore(options) {
  options = options || {};
  var target = String(options.target || 'local');
  var source = String(options.source || 'unknown');
  sceneIoLog('load-scene:start', 'target=' + target + ' source=' + source);
  var ok = false;
  if (target === 'local') ok = await loadSceneFromLocalStorage(options);
  else if (target === 'server-file') ok = await loadSceneFromServerFile(options.filename, options);
  else if (target === 'default') ok = await loadDefaultSceneFromServer(options);
  else if (target === 'import-file') ok = await importSceneJsonFile(options.file, options);
  else {
    sceneIoLog('load-scene:done', 'target=' + target + ' source=' + source + ' ok=false reason=unsupported-target');
    return false;
  }
  sceneIoLog('load-scene:done', 'target=' + target + ' source=' + source + ' ok=' + (!!ok));
  return !!ok;
}

async function saveSceneViaWorkflow(options) {
  options = options || {};
  sceneWorkflowCounters.saveSceneTargetCalls += 1;
  recordSceneWorkflowEvent('saveSceneTarget', { target: String(options.target || 'local'), source: String(options.source || 'unknown') });
  var ok = await saveSceneCore(Object.assign({}, options, { __fromSceneWorkflow: true }));
  return buildSceneWorkflowResult('saveSceneTarget', options, { ok: !!ok });
}

async function loadSceneViaWorkflow(options) {
  options = options || {};
  sceneWorkflowCounters.loadSceneTargetCalls += 1;
  recordSceneWorkflowEvent('loadSceneTarget', { target: String(options.target || 'local'), source: String(options.source || 'unknown') });
  var ok = await loadSceneCore(Object.assign({}, options, { __fromSceneWorkflow: true }));
  return buildSceneWorkflowResult('loadSceneTarget', options, { ok: !!ok });
}

async function runStartupRestoreViaWorkflow(options) {
  options = options || {};
  sceneWorkflowCounters.startupRestoreCalls += 1;
  recordSceneWorkflowEvent('runStartupRestore', { source: String(options.source || 'unknown'), defaultSource: String(options.defaultSource || ''), localSource: String(options.localSource || '') });
  var restored = false;
  var target = '';
  try {
    restored = await loadSceneCore({ target: 'default', source: options.defaultSource || 'startup-default-file', silent: options.silent !== false, __fromSceneWorkflow: true });
    if (restored) target = 'default';
  } catch (_) {}
  if (!restored) {
    try {
      restored = await loadSceneCore({ target: 'local', source: options.localSource || 'startup-auto-restore', silent: options.silent !== false, __fromSceneWorkflow: true });
      if (restored) target = 'local';
    } catch (_) {}
  }
  return buildSceneWorkflowResult('runStartupRestore', options, { ok: !!restored, target: target || (restored ? 'unknown' : '') });
}

var sceneWorkflowApi = {
  owner: 'src/infrastructure/storage/scene-storage.js',
  phase: 'P6-C',
  apiPath: 'services.sceneWorkflow',
  saveSceneTarget: saveSceneViaWorkflow,
  loadSceneTarget: loadSceneViaWorkflow,
  runStartupRestore: runStartupRestoreViaWorkflow,
  summarize: summarizeSceneWorkflowState
};

try {
  if (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('services.sceneWorkflow', sceneWorkflowApi, { owner: 'src/infrastructure/storage/scene-storage.js', legacy: [], phase: 'P6-C' });
  } else if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.services = window.App.services || {};
    window.App.services.sceneWorkflow = sceneWorkflowApi;
  }
} catch (_) {}

emitP6SceneWorkflow('BOOT', 'scene-workflow-ready', {
  phase: 'P6-C',
  owner: sceneWorkflowApi.owner,
  apiPath: sceneWorkflowApi.apiPath,
  functions: ['saveSceneTarget', 'loadSceneTarget', 'runStartupRestore', 'summarize']
});
emitP6SceneWorkflow('SUMMARY', 'scene-workflow-coverage', {
  phase: 'P6-C',
  owner: sceneWorkflowApi.owner,
  apiPath: sceneWorkflowApi.apiPath,
  wiredInto: ['src/presentation/shell/app-shell.js:runStartupRestorePipeline', 'src/presentation/ui/ui.js:save/load/import actions', 'src/infrastructure/storage/scene-storage.js:load/save wrappers'],
  notes: ['P6-C keeps services.sceneWorkflow as the canonical orchestration entry and makes legacy scene-storage wrappers prefer workflow-first delegation before falling back to local compatibility logic.']
});

window.__SCENE_STORAGE_IO_API = {
  owner: 'src/infrastructure/storage/scene-storage.js',
  buildSceneSnapshot: buildSceneSnapshot,
  applySceneSnapshot: applySceneSnapshot,
  saveScene: saveScene,
  loadScene: loadScene,
  repairSceneSnapshot: repairSceneSnapshot,
  repairLegacySceneSnapshot: repairLegacySceneSnapshot,
  restoreScenePrefabRefs: restoreScenePrefabRefs,
  restoreSceneHabboRefs: restoreSceneHabboRefs,
  summarize: function () {
    return {
      currentFile: recallCurrentSceneServerFileName(),
    counters: {
      saveSceneTargetCalls: sceneWorkflowCounters.saveSceneTargetCalls,
      loadSceneTargetCalls: sceneWorkflowCounters.loadSceneTargetCalls,
      startupRestoreCalls: sceneWorkflowCounters.startupRestoreCalls
    },
    lastEvent: sceneWorkflowLastEvent,
    recentEvents: sceneWorkflowRecentEvents.slice(),
      sceneStorageAvailable: sceneStorageAvailable(),
      sceneFilesSupported: sceneFilesSupported(),
      instanceCount: currentSceneInstances().length,
      boxCount: currentSceneBoxes().length,
      sceneSession: summarizeCurrentSceneSession('scene-storage-io'),
      lightCount: Array.isArray(lights) ? lights.length : 0,
    };
  }
};
if (typeof markRefactorCheckpoint === 'function') {
  markRefactorCheckpoint('SceneStorage', 'scene-io-ready', Object.assign({
    owner: window.__SCENE_STORAGE_IO_API.owner,
    hasSaveScene: typeof saveScene === 'function',
    hasLoadScene: typeof loadScene === 'function',
    hasBuildSceneSnapshot: typeof buildSceneSnapshot === 'function',
    hasApplySceneSnapshot: typeof applySceneSnapshot === 'function'
  }, window.__SCENE_STORAGE_IO_API.summarize ? window.__SCENE_STORAGE_IO_API.summarize() : {}));
  markRefactorCheckpoint('SceneStorage', 'scene-repair-ready', {
    owner: window.__SCENE_STORAGE_IO_API.owner,
    hasRepairSceneSnapshot: typeof repairSceneSnapshot === 'function',
    hasRepairLegacySceneSnapshot: typeof repairLegacySceneSnapshot === 'function',
    hasRestoreScenePrefabRefs: typeof restoreScenePrefabRefs === 'function',
    hasRestoreSceneHabboRefs: typeof restoreSceneHabboRefs === 'function'
  });
}
