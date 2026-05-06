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


function cloneSceneSerializable(value, fallback) {
  try {
    if (typeof value === 'undefined') return fallback;
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return typeof fallback === 'undefined' ? null : fallback;
  }
}

function getRuntimeStateStorageApi() {
  try {
    if (typeof window === 'undefined') return null;
    if (window.App && window.App.state && window.App.state.runtimeState) return window.App.state.runtimeState;
    if (typeof __runtimeStateApi !== 'undefined' && __runtimeStateApi) return __runtimeStateApi;
  } catch (_) {}
  return null;
}

function getCurrentTerrainGeneratorSnapshot() {
  var runtimeApi = getRuntimeStateStorageApi();
  try {
    if (runtimeApi && typeof runtimeApi.getTerrainGeneratorSettingsValue === 'function') return cloneSceneSerializable(runtimeApi.getTerrainGeneratorSettingsValue(), null);
    if (runtimeApi && runtimeApi.terrainGenerator) return cloneSceneSerializable(runtimeApi.terrainGenerator, null);
  } catch (_) {}
  return null;
}

function getCurrentTerrainRuntimeSnapshot() {
  var runtimeApi = getRuntimeStateStorageApi();
  try {
    if (runtimeApi && typeof runtimeApi.getTerrainRuntimeModelValue === 'function') return cloneSceneSerializable(runtimeApi.getTerrainRuntimeModelValue(), null);
    if (runtimeApi && runtimeApi.terrainLogic) return cloneSceneSerializable(runtimeApi.terrainLogic, null);
  } catch (_) {}
  return null;
}

function restoreTerrainStateFromSnapshot(incoming, sourceName) {
  var runtimeApi = getRuntimeStateStorageApi();
  if (!runtimeApi || typeof incoming !== 'object' || !incoming) return { generator: false, runtime: false };
  var source = String(sourceName || 'scene-storage:applySceneSnapshot');
  var restoredGenerator = false;
  var restoredRuntime = false;
  var terrainGeneratorSnapshot = incoming.terrainGenerator && typeof incoming.terrainGenerator === 'object' ? incoming.terrainGenerator : null;
  var terrainRuntimeSnapshot = incoming.terrainRuntime && typeof incoming.terrainRuntime === 'object' ? incoming.terrainRuntime : (incoming.terrainLogic && typeof incoming.terrainLogic === 'object' ? incoming.terrainLogic : null);
  try {
    if (terrainGeneratorSnapshot && typeof runtimeApi.patchTerrainGeneratorSettings === 'function') {
      runtimeApi.patchTerrainGeneratorSettings(cloneSceneSerializable(terrainGeneratorSnapshot, {}), { source: source + ':restore-terrain-generator' });
      restoredGenerator = true;
    }
  } catch (err) {
    try { pushLog('scene-terrain-restore:generator-error ' + (err && err.message ? err.message : err)); } catch (_) {}
  }
  try {
    if (terrainRuntimeSnapshot && typeof runtimeApi.patchTerrainRuntimeModel === 'function') {
      var restored = cloneSceneSerializable(terrainRuntimeSnapshot, {});
      restored.terrainChunkCacheVersion = Math.max(0, Math.round(Number(restored.terrainChunkCacheVersion) || 0)) + 1;
      restored.dirtyChunkKeys = Array.isArray(restored.dirtyChunkKeys) ? restored.dirtyChunkKeys.slice() : [];
      runtimeApi.patchTerrainRuntimeModel(restored, { source: source + ':restore-terrain-runtime' });
      restoredRuntime = true;
    } else if (typeof runtimeApi.clearTerrainRuntimeModel === 'function') {
      runtimeApi.clearTerrainRuntimeModel({ source: source + ':clear-missing-terrain-runtime' });
    }
  } catch (err2) {
    try { pushLog('scene-terrain-restore:runtime-error ' + (err2 && err2.message ? err2.message : err2)); } catch (_) {}
  }
  if (restoredGenerator || restoredRuntime) {
    try {
      var runtimeSummary = terrainRuntimeSnapshot && terrainRuntimeSnapshot.lastSummary ? terrainRuntimeSnapshot.lastSummary : null;
      pushLog('scene-terrain-restore:done source=' + source + ' generator=' + restoredGenerator + ' runtime=' + restoredRuntime + ' terrainBatchId=' + String((terrainRuntimeSnapshot && terrainRuntimeSnapshot.activeTerrainBatchId) || (terrainGeneratorSnapshot && terrainGeneratorSnapshot.activeTerrainBatchId) || '') + ' terrainVoxels=' + String((runtimeSummary && runtimeSummary.generatedVoxelCount) || (terrainRuntimeSnapshot && terrainRuntimeSnapshot.terrainExpandedVoxelInstanceCount) || 0));
    } catch (_) {}
  }
  return { generator: restoredGenerator, runtime: restoredRuntime };
}

function copyScenePersistenceFields(target, source) {
  if (!target || !source || typeof source !== 'object') return target;
  var keys = ['generatedBy', 'terrainBatchId', 'terrainCellX', 'terrainCellY', 'semanticTextureMap', 'semanticTextures', 'semanticFaceColors', 'terrainMaterialId', 'materialType', 'terrainMaterialLabel', 'base', 'renderUpdateMode'];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = cloneSceneSerializable(source[key], source[key]);
  }
  return target;
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
    hasTerrainRuntime: !!(data.terrainRuntime || data.terrainLogic),
    hasTerrainGenerator: !!data.terrainGenerator,
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
  if (snapshot.terrainGenerator && typeof snapshot.terrainGenerator === 'object') copy.terrainGenerator = cloneSceneSerializable(snapshot.terrainGenerator, null);
  if (snapshot.terrainRuntime && typeof snapshot.terrainRuntime === 'object') copy.terrainRuntime = cloneSceneSerializable(snapshot.terrainRuntime, null);
  if (snapshot.terrainLogic && typeof snapshot.terrainLogic === 'object') copy.terrainLogic = cloneSceneSerializable(snapshot.terrainLogic, null);
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

function getSceneSnapshotBuilderOwner() {
  try { return (typeof window !== 'undefined' ? window.__SCENE_SNAPSHOT_BUILDER__ : globalThis.__SCENE_SNAPSHOT_BUILDER__) || null; } catch (_) { return null; }
}

function buildSceneSnapshot(options) {
  var owner = getSceneSnapshotBuilderOwner();
  if (!owner || typeof owner.buildSceneSnapshot !== 'function') throw new Error('scene snapshot builder owner missing');
  return owner.buildSceneSnapshot(options);
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
  var owner = getSceneSnapshotBuilderOwner();
  if (!owner || typeof owner.sceneSnapshot !== 'function') throw new Error('scene snapshot builder owner missing');
  return owner.sceneSnapshot();
}

function persistentSceneSnapshot() {
  var owner = getSceneSnapshotBuilderOwner();
  if (!owner || typeof owner.persistentSceneSnapshot !== 'function') throw new Error('scene snapshot builder owner missing');
  return owner.persistentSceneSnapshot();
}

function createDefaultSceneData() {
  var owner = getSceneSnapshotBuilderOwner();
  if (!owner || typeof owner.createDefaultSceneData !== 'function') throw new Error('scene snapshot builder owner missing');
  return owner.createDefaultSceneData();
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

function getSceneSnapshotApplierOwner() {
  try { return (typeof window !== 'undefined' ? window.__SCENE_SNAPSHOT_APPLIER__ : globalThis.__SCENE_SNAPSHOT_APPLIER__) || null; } catch (_) { return null; }
}

function applySceneSnapshot(snapshot, options = {}) {
  var owner = getSceneSnapshotApplierOwner();
  if (!owner || typeof owner.applySceneSnapshot !== 'function') throw new Error('scene snapshot applier owner missing');
  return owner.applySceneSnapshot(snapshot, options);
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
