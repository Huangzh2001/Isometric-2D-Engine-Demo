// scene-storage.js
function sceneStorageRouteLog(name, detail) {
  var suffix = detail ? (' ' + String(detail)) : '';
  try { if (typeof logRoute === 'function') logRoute('scene-storage', name + suffix); else pushLog('[route][scene-storage] ' + name + suffix); } catch (_) {}
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
  if (loaded > 0) refreshPrefabSelectOptions();
  return { ok: failed === 0, loaded: loaded, skipped: skipped, failed: failed };
}

async function applySceneSnapshotWithExternalAssets(snapshot, options) {
  options = options || {};
  await ensureSceneHabboRefsLoaded(snapshot, { source: options.source || 'scene-load' });
  applySceneSnapshot(snapshot, options);
  if (snapshot && Array.isArray(snapshot.habboRefs) && snapshot.habboRefs.length) {
    var summary = collectSceneHabboRefs(snapshot.instances || []).length;
    detailLog('scene-habbo: refs=' + snapshot.habboRefs.length + ' active=' + summary);
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
    var res = await fetch(HABBO_INDEX_API_URL + '?t=' + Date.now(), { cache: 'no-store' });
    var data = await res.json();
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
    refreshPrefabSelectOptions();
    if (currentPrefabId) {
      var idx = prototypes.findIndex(function (p) { return p.id === currentPrefabId; });
      if (idx >= 0) {
        editor.prototypeIndex = idx;
        if (ui.prefabSelect) ui.prefabSelect.value = String(idx);
      }
    }
    editor.mode = currentMode;
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
    instances: instances.map(inst => ({ ...inst })),
    boxes: boxes.map(b => ({ ...b })),
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
    instances: instances.map(inst => ({ ...inst })),
    habboRefs: collectSceneHabboRefs(instances),
    boxes: boxes.map(b => ({ ...b })),
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

  var nextInstances = Array.isArray(incoming.instances) && incoming.instances.length ? incoming.instances : null;
  if (!nextInstances && Array.isArray(incoming.boxes) && incoming.boxes.length) nextInstances = legacyBoxesToInstances(incoming.boxes);
  if (!nextInstances || !nextInstances.length) nextInstances = base.instances;
  instances = nextInstances.map(function (inst, idx) {
    return {
      instanceId: typeof inst.instanceId === 'string' && inst.instanceId ? inst.instanceId : 'obj_' + String(idx + 1).padStart(4, '0'),
      prefabId: (findPrefabByIdExact(inst.prefabId || '') || ensureMissingPrefabRegistered(inst.prefabId || '')).id,
      x: Number(inst.x) || 0,
      y: Number(inst.y) || 0,
      z: Number(inst.z) || 0,
      rotation: ((parseInt(inst.rotation || 0, 10) % 2) + 2) % 2,
      name: inst.name || undefined,
    };
  });
  filterInstancesToGrid();
  recomputeNextInstanceSerial();
  rebuildBoxesFromInstances();

  const nextLights = Array.isArray(incoming.lights) && incoming.lights.length ? incoming.lights : base.lights;
  lights = nextLights.map((l, idx) => normalizeLight({ ...l, id: Number.isFinite(Number(l.id)) ? Number(l.id) : idx + 1 }));
  nextLightId = lights.reduce((m, l) => Math.max(m, l.id || 0), 0) + 1;
  activeLightId = lights.some(l => l.id === incoming.activeLightId) ? incoming.activeLightId : (lights[0]?.id ?? 1);

  const nextCamera = { ...base.camera, ...(incoming.camera || {}) };
  camera.x = Number(nextCamera.x) || 0;
  camera.y = Number(nextCamera.y) || 0;

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
  editor.prototypeIndex = clamp(parseInt(nextEditor.prototypeIndex ?? base.editor.prototypeIndex, 10) || 0, 0, prototypes.length - 1);
  refreshPrefabSelectOptions();
  if (ui.prefabSelect) ui.prefabSelect.value = String(editor.prototypeIndex);
  editor.rotation = (parseInt(nextEditor.rotation ?? base.editor.rotation, 10) || 0) % 2;
  editor.draggingInstance = null;
  editor.preview = null;
  editor.hoverDeleteBox = null;
  editor.mode = ['view', 'place', 'delete'].includes(nextEditor.mode) ? nextEditor.mode : base.editor.mode;

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
    pushLog(`scene-apply: source=${options.source || 'unknown'} instances=${instances.length} boxes=${boxes.length} lights=${lights.length} grid=${settings.gridW}x${settings.gridH}`);
  }
}

function saveSceneToLocalStorage() {
  if (!sceneStorageAvailable()) {
    pushLog('scene-save: localStorage unavailable');
    return false;
  }
  const snapshot = persistentSceneSnapshot();
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
    scheduleLegacyHabboRepairs('scene-load');
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
    var snapshot = persistentSceneSnapshot();
    var res = await fetch(SCENE_API_SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ filename: nextFilename, scene: snapshot, setDefault: options.setDefault !== false })
    });
    var data = await res.json();
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
    var res = await fetch(`${SCENE_API_LOAD_URL}?file=${encodeURIComponent(nextFilename)}`, { cache: 'no-store' });
    var data = await res.json();
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
    await applySceneSnapshotWithExternalAssets(data.scene, { source: options.source || 'scene-file', reason: options.reason || 'loadSceneFile', log: !options.silent });
    scheduleLegacyHabboRepairs('scene-file-load');
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
    var res = await fetch(SCENE_API_DEFAULT_URL, { cache: 'no-store' });
    var data = await res.json();
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
    if (!data.hasDefault || !data.scene) {
      persistCurrentSceneServerFileName('');
      if (!options.silent) updateSceneFileStatus('场景文件：还没有默认文件；可先点“保存到文件”。');
      return false;
    }
    await applySceneSnapshotWithExternalAssets(data.scene, { source: options.source || 'scene-default', reason: options.reason || 'loadDefaultSceneFile', log: !options.silent });
    scheduleLegacyHabboRepairs('scene-default-load');
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
    scheduleLegacyHabboRepairs('scene-import');
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
    const snapshot = persistentSceneSnapshot();
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
