(function (global) {
  'use strict';

  var VERSION = 'HZH-EMERGENT-ASSET-LIBRARY-V1';
  var serverItems = [];
  var localItems = [];
  var config = { configured: false, root: '', exists: false };
  var localSeq = 0;

  function safeClone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; } }
  function isServerMode() { return /^https?:$/i.test(global.location && global.location.protocol || ''); }

  function extractPrefab(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.prefab && typeof data.prefab === 'object') return data.prefab;
    return data;
  }

  async function parseFile(file) {
    if (!file) throw new Error('missing asset file');
    var lower = String(file.name || '').toLowerCase();
    if (lower.endsWith('.hzhmat')) {
      var parser = global.__HZH_UNIFIED_MATERIAL_EXPORT__;
      if (!parser || typeof parser.parseMaterialFile !== 'function') throw new Error('unified material parser missing');
      return await parser.parseMaterialFile(file);
    }
    var text = await file.text();
    return JSON.parse(text);
  }

  function makeItem(data, meta) {
    meta = meta || {};
    var prefab = extractPrefab(data) || {};
    return {
      source: String(meta.source || 'local'),
      key: String(meta.key || ''),
      relativePath: String(meta.relativePath || ''),
      file: meta.file || null,
      packageData: data || null,
      id: String(prefab.id || meta.id || ''),
      name: String(prefab.name || prefab.id || meta.name || meta.relativePath || 'Prefab'),
      kind: String(prefab.kind || meta.kind || ''),
      format: String(meta.format || (data && data.format) || ''),
      commands: Number(meta.commands || 0),
      events: Number(meta.events || 0)
    };
  }

  async function getConfig() {
    if (!isServerMode()) return safeClone(config);
    var response = await fetch('/api/asset-library/config?t=' + Date.now(), { cache: 'no-store' });
    var data = await response.json();
    if (!response.ok || !data || data.ok === false) throw new Error(data && data.error || ('HTTP ' + response.status));
    config = { configured: !!data.configured, root: String(data.root || ''), exists: !!data.exists };
    return safeClone(config);
  }

  async function setRoot(root) {
    if (!isServerMode()) throw new Error('必须通过 start_editor.bat 启动，才能直接读取任意素材库路径');
    var response = await fetch('/api/asset-library/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: String(root || '') })
    });
    var data = await response.json();
    if (!response.ok || !data || data.ok === false) throw new Error(data && data.error || ('HTTP ' + response.status));
    config = { configured: !!data.configured, root: String(data.root || ''), exists: !!data.exists };
    await fetchIndex();
    dispatchChanged('server-root');
    return safeClone(config);
  }

  async function fetchIndex() {
    if (!isServerMode()) return listItems();
    try { await getConfig(); } catch (_) {}
    if (!config.configured || !config.exists) { serverItems = []; return listItems(); }
    var response = await fetch('/api/asset-library/index?t=' + Date.now(), { cache: 'no-store' });
    var data = await response.json();
    if (!response.ok || !data || data.ok === false) throw new Error(data && data.error || ('HTTP ' + response.status));
    serverItems = (Array.isArray(data.items) ? data.items : []).map(function (item) {
      return makeItem(null, {
        source: 'server-library', key: 'server:' + String(item.relativePath || item.id || ''),
        relativePath: item.relativePath, id: item.id, name: item.name, kind: item.kind,
        format: item.format, commands: item.commands, events: item.events
      });
    });
    return listItems();
  }

  async function registerLocalFiles(fileList) {
    var files = Array.from(fileList || []).filter(function (file) {
      var n = String(file && file.name || '').toLowerCase();
      return n.endsWith('.hzhmat') || n.endsWith('.json');
    });
    var added = [], failed = [];
    for (var i = 0; i < files.length; i++) {
      try {
        var parsed = await parseFile(files[i]);
        var relativePath = String(files[i].webkitRelativePath || files[i].name || '');
        var item = makeItem(parsed, { source: 'local-folder', key: 'local:' + (++localSeq), relativePath: relativePath, file: files[i] });
        if (!item.id) throw new Error('素材缺少 prefab.id');
        added.push(item);
      } catch (err) {
        failed.push({ file: files[i] && files[i].name || '', error: String(err && err.message || err) });
      }
    }
    localItems = added;
    dispatchChanged('local-folder');
    return { items: listItems(), added: added.length, failed: failed };
  }

  function listItems() {
    var all = serverItems.concat(localItems), seen = new Set();
    return all.filter(function (item) {
      var key = item.source + ':' + (item.relativePath || item.id || item.key);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'zh-CN'); });
  }

  async function loadItem(item) {
    if (!item) throw new Error('missing library item');
    if (item.packageData) return safeClone(item.packageData) || item.packageData;
    if (item.file) return await parseFile(item.file);
    if (item.source === 'server-library' && item.relativePath) {
      var response = await fetch('/api/asset-library/file?path=' + encodeURIComponent(item.relativePath) + '&t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var blob = await response.blob();
      var file = new File([blob], item.relativePath.split('/').pop() || 'asset.hzhmat', { type: blob.type || 'application/octet-stream' });
      return await parseFile(file);
    }
    throw new Error('cannot load library item');
  }

  function dispatchChanged(reason) {
    try { global.dispatchEvent(new CustomEvent('hzh-emergent-asset-library:changed', { detail: { reason: reason, count: listItems().length, config: safeClone(config) } })); } catch (_) {}
  }

  var api = {
    VERSION: VERSION,
    isServerMode: isServerMode,
    getConfig: getConfig,
    setRoot: setRoot,
    fetchIndex: fetchIndex,
    registerLocalFiles: registerLocalFiles,
    listItems: listItems,
    loadItem: loadItem,
    extractPrefab: extractPrefab,
    getCachedConfig: function () { return safeClone(config); }
  };

  global.__HZH_EMERGENT_ASSET_LIBRARY__ = api;
  if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
    global.__APP_NAMESPACE.bind('infrastructure.emergentAssetLibrary', api, { owner: 'src/infrastructure/assets/emergent-asset-library-service.js', phase: 'emergent-asset-library-v1' });
  }
})(typeof window !== 'undefined' ? window : globalThis);
