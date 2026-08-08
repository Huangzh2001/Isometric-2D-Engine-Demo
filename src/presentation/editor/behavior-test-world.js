(function (global) {
  'use strict';

  var VERSION = 'HZH-BEHAVIOR-MAIN-TEST-WORLD-V2';
  var editorApi = null;
  var libraryApi = null;
  var behaviorApi = null;
  var assets = [];
  var selectedAssetKey = 'current';
  var frameReady = false;

  function byId(id) { return document.getElementById(id); }
  var ui = {
    root: byId('behaviorTestWorld'),
    frame: byId('behaviorMainTestFrame'),
    loading: byId('behaviorMainTestFrameLoading'),
    syncCurrent: byId('behaviorTestSyncCurrent'),
    reset: byId('behaviorTestReset'),
    libraryPath: byId('behaviorTestLibraryPath'),
    connectLibrary: byId('behaviorTestConnectLibrary'),
    chooseFolder: byId('behaviorTestChooseFolder'),
    folderInput: byId('behaviorTestFolderInput'),
    libraryStatus: byId('behaviorTestLibraryStatus'),
    search: byId('behaviorTestAssetSearch'),
    assetList: byId('behaviorTestAssetList'),
    selected: byId('behaviorTestSelected'),
    console: byId('behaviorTestConsole')
  };

  function getEditorApi() { return global.App && global.App.editor && global.App.editor.unifiedV18 ? global.App.editor.unifiedV18 : null; }
  function getLibraryApi() { return global.__HZH_EMERGENT_ASSET_LIBRARY__ || null; }
  function getBehaviorApi() { return global.__HZH_BEHAVIOR_EDITOR__ || null; }
  function safeClone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (_) { return v; } }
  function extractPrefab(data) { return libraryApi && libraryApi.extractPrefab ? libraryApi.extractPrefab(data) : (data && data.prefab ? data.prefab : data); }

  function log(message, kind) {
    if (!ui.console) return;
    var div = document.createElement('div');
    div.className = 'behaviorTestLog ' + (kind || '');
    div.textContent = '[' + new Date().toLocaleTimeString() + '] ' + String(message || '');
    ui.console.appendChild(div);
    ui.console.scrollTop = ui.console.scrollHeight;
  }

  function syncBehaviorIntoCurrentPrefab() {
    editorApi = getEditorApi();
    behaviorApi = getBehaviorApi();
    if (editorApi && behaviorApi && typeof behaviorApi.getBehavior === 'function' && typeof editorApi.setBehaviorDraft === 'function') {
      editorApi.setBehaviorDraft(behaviorApi.getBehavior());
    }
  }

  function getCurrentAsset() {
    syncBehaviorIntoCurrentPrefab();
    editorApi = getEditorApi();
    if (!editorApi || typeof editorApi.getPrefabDraft !== 'function') return null;
    var prefab = editorApi.getPrefabDraft();
    if (!prefab) return null;
    return {
      source: 'current', key: 'current', id: String(prefab.id || 'current_prefab'),
      name: String(prefab.name || prefab.id || '当前编辑素材'), kind: String(prefab.kind || ''),
      loaded: { prefab: safeClone(prefab) }
    };
  }

  async function refreshAssets() {
    libraryApi = getLibraryApi();
    var next = [];
    var current = getCurrentAsset();
    if (current) next.push(current);
    if (libraryApi) {
      try { await libraryApi.fetchIndex(); } catch (err) { log('外部素材库索引失败：' + String(err && err.message || err), 'warn'); }
      (libraryApi.listItems ? libraryApi.listItems() : []).forEach(function (item) {
        next.push({
          source: 'library',
          key: String(item.key || item.source + ':' + (item.relativePath || item.id)),
          id: String(item.id || ''), name: String(item.name || item.id || ''), kind: String(item.kind || ''),
          libraryItem: item, loaded: null
        });
      });
      try {
        var cfg = libraryApi.getCachedConfig ? libraryApi.getCachedConfig() : null;
        if (cfg && ui.libraryPath && !ui.libraryPath.matches(':focus')) ui.libraryPath.value = cfg.root || '';
        if (ui.libraryStatus) ui.libraryStatus.textContent = cfg && cfg.configured ? ((cfg.exists ? '已连接：' : '路径不存在：') + cfg.root) : '未配置外部素材库';
      } catch (_) {}
    }
    var seen = new Set();
    assets = next.filter(function (a) { var k = a.key || a.id; if (!k || seen.has(k)) return false; seen.add(k); return true; });
    renderAssets();
  }

  function renderAssets() {
    if (!ui.assetList) return;
    var q = String(ui.search && ui.search.value || '').trim().toLowerCase();
    var visible = assets.filter(function (a) {
      return !q || (a.name + ' ' + a.id + ' ' + a.kind).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 100);
    ui.assetList.innerHTML = '';
    visible.forEach(function (asset) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'behaviorTestAsset' + (asset.key === selectedAssetKey ? ' active' : '');
      var strong = document.createElement('strong'); strong.textContent = asset.name || asset.id;
      var small = document.createElement('small'); small.textContent = asset.source === 'current' ? '当前正在编辑 · ' + asset.id : asset.id;
      b.appendChild(strong); b.appendChild(small);
      b.addEventListener('click', function () {
        selectedAssetKey = asset.key;
        renderAssets();
        importAssetIntoMain(asset, true);
      });
      ui.assetList.appendChild(b);
    });
    if (!visible.length) {
      var empty = document.createElement('div'); empty.className = 'behaviorEmptyState'; empty.textContent = '没有匹配素材'; ui.assetList.appendChild(empty);
    }
  }

  async function loadAsset(asset) {
    if (!asset) throw new Error('未选择素材');
    if (asset.source === 'current') return { prefab: getCurrentAsset().loaded.prefab };
    if (asset.loaded) return asset.loaded;
    if (!libraryApi || !asset.libraryItem) throw new Error('素材库服务不可用');
    var data = await libraryApi.loadItem(asset.libraryItem);
    var prefab = extractPrefab(data);
    if (!prefab || !prefab.id) throw new Error('素材文件缺少 prefab');
    asset.loaded = { packageData: data, prefab: prefab };
    return asset.loaded;
  }

  function postToMain(type, payload) {
    if (!ui.frame || !ui.frame.contentWindow) return false;
    ui.frame.contentWindow.postMessage(Object.assign({ type: type, source: 'hzh-behavior-editor' }, payload || {}), global.location.origin);
    return true;
  }

  async function importAssetIntoMain(asset, selectAfterImport) {
    if (!asset) return;
    try {
      var loaded = await loadAsset(asset);
      postToMain('HZH_TEST_IMPORT_PREFAB', { prefab: safeClone(loaded.prefab), select: selectAfterImport !== false });
      if (ui.selected) ui.selected.textContent = '已发送：' + (asset.name || asset.id) + ' · 可在下方主编辑器用原有“建立物件”逻辑摆放';
      log('载入主 TestWorld：' + (asset.name || asset.id), 'ok');
    } catch (err) {
      log('载入测试素材失败：' + String(err && err.message || err), 'error');
    }
  }

  async function syncCurrent() {
    var current = getCurrentAsset();
    if (!current) { log('当前素材尚未准备好。', 'warn'); return; }
    var oldIndex = assets.findIndex(function (a) { return a.key === 'current'; });
    if (oldIndex >= 0) assets[oldIndex] = current; else assets.unshift(current);
    selectedAssetKey = 'current';
    renderAssets();
    await importAssetIntoMain(current, true);
  }

  async function connectLibraryPath() {
    libraryApi = getLibraryApi();
    if (!libraryApi) return;
    var path = String(ui.libraryPath && ui.libraryPath.value || '').trim();
    if (!path) return;
    try {
      await libraryApi.setRoot(path);
      await refreshAssets();
      log('外部素材库已连接：' + path, 'ok');
    } catch (err) {
      if (ui.libraryStatus) ui.libraryStatus.textContent = '连接失败：' + String(err && err.message || err);
      log('连接素材库失败：' + String(err && err.message || err), 'error');
    }
  }

  async function importFolderFiles(files) {
    libraryApi = getLibraryApi();
    if (!libraryApi || !files) return;
    try {
      var result = await libraryApi.registerLocalFiles(files);
      await refreshAssets();
      log('浏览器文件夹读取：' + result.added + ' 个素材', result.failed && result.failed.length ? 'warn' : 'ok');
    } catch (err) { log('文件夹读取失败：' + String(err && err.message || err), 'error'); }
  }


  function resetMain() {
    if (!ui.frame) return;
    var oldSrc = ui.frame.getAttribute('src') || 'index.html?embeddedBehaviorTest=1';
    frameReady = false;
    if (ui.loading) ui.loading.classList.remove('isReady');
    ui.frame.src = oldSrc.split('#')[0] + (oldSrc.indexOf('?') >= 0 ? '&' : '?') + 'reset=' + Date.now();
    log('已重载主 TestWorld。', 'info');
  }

  function onMessage(event) {
    if (!ui.frame || event.source !== ui.frame.contentWindow) return;
    var data = event.data || {};
    if (!data || typeof data.type !== 'string') return;
    if (data.type === 'HZH_TEST_MAIN_READY') {
      frameReady = true;
      if (ui.loading) ui.loading.classList.add('isReady');
      log('主游戏 TestWorld 已就绪；摆放/人物/碰撞逻辑来自 start.bat 主程序。', 'ok');
      syncCurrent();
      return;
    }
    if (data.type === 'HZH_TEST_LOG') {
      log(data.message || '', data.kind || 'info');
      return;
    }
    if (data.type === 'HZH_TEST_STATE_CHANGED') {
      log((data.prefabId || 'Prefab') + '：' + data.fromState + ' → ' + data.toState, 'event');
    }
  }

  function bind() {
    if (ui.syncCurrent) ui.syncCurrent.addEventListener('click', syncCurrent);
    if (ui.reset) ui.reset.addEventListener('click', resetMain);
    if (ui.search) ui.search.addEventListener('input', renderAssets);
    if (ui.connectLibrary) ui.connectLibrary.addEventListener('click', connectLibraryPath);
    if (ui.chooseFolder) ui.chooseFolder.addEventListener('click', function () { if (ui.folderInput) ui.folderInput.click(); });
    if (ui.folderInput) ui.folderInput.addEventListener('change', function () { importFolderFiles(ui.folderInput.files); });
    global.addEventListener('message', onMessage);
    global.addEventListener('hzh-emergent-asset-library:changed', refreshAssets);
    global.addEventListener('unified-asset-editor:source-changed', refreshAssets);
    global.addEventListener('unified-asset-editor:step-changed', function (e) {
      if (e.detail && e.detail.step === 'behavior') refreshAssets();
    });
  }

  async function initialize() {
    if (!ui.root || !ui.frame) return;
    editorApi = getEditorApi(); libraryApi = getLibraryApi(); behaviorApi = getBehaviorApi();
    try {
      if (libraryApi && typeof libraryApi.getConfig === 'function') {
        var cfg = await libraryApi.getConfig();
        if (ui.libraryPath) ui.libraryPath.value = cfg.root || '';
      }
    } catch (_) {}
    bind();
    await refreshAssets();
    log('TestWorld 使用主游戏 iframe；Behavior 随素材始终运行，不需要额外开关。', 'info');
  }

  var api = { version: VERSION, refreshAssets: refreshAssets, syncCurrent: syncCurrent, reset: resetMain };
  global.__HZH_BEHAVIOR_TEST_WORLD__ = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true }); else initialize();
})(typeof window !== 'undefined' ? window : globalThis);
