(function () {
  var OWNER = 'src/infrastructure/services/prefab-api.js';
  var PREFAB_INDEX_URL = '/api/prefabs/index';
  var PREFAB_SAVE_URL = '/api/prefabs/save';
  var BROWSER_LIBRARY_KEY = 'isometric-room-prefabs-v1';
  var counters = {
    fetchIndexCalls: 0,
    savePrefabToServerCalls: 0,
    listBrowserLibraryCalls: 0,
    savePrefabToBrowserLibraryCalls: 0,
    errors: 0
  };
  var lastEvent = null;
  var recentEvents = [];

  function serviceLog(name, detail) {
    var suffix = detail ? (' ' + String(detail)) : '';
    try { pushLog('[service:prefab-api] ' + String(name) + suffix); } catch (_) {}
  }

  function remember(kind, detail) {
    var entry = {
      at: new Date().toISOString(),
      kind: String(kind || ''),
      detail: detail || null
    };
    lastEvent = entry;
    recentEvents.push(entry);
    if (recentEvents.length > 12) recentEvents.shift();
    return entry;
  }

  function safeParseJson(raw) {
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async function requestJson(name, url, options) {
    options = options || {};
    var method = String(options.method || 'GET');
    serviceLog('request:start', 'name=' + name + ' method=' + method + ' url=' + url);
    try {
      var response = await fetch(url, options);
      serviceLog('request:response', 'name=' + name + ' status=' + response.status);
      var rawText = await response.text();
      serviceLog('request:text', 'name=' + name + ' bytes=' + rawText.length);
      var data = rawText ? JSON.parse(rawText) : null;
      serviceLog('request:json', 'name=' + name + ' items=' + ((data && Array.isArray(data.items)) ? data.items.length : 'n/a'));
      serviceLog('request:done', 'name=' + name + ' status=' + response.status);
      return { response: response, rawText: rawText, data: data };
    } catch (err) {
      counters.errors += 1;
      serviceLog('request:error', 'name=' + name + ' error=' + String(err && err.message ? err.message : err));
      remember('request:error', { name: String(name || ''), error: String(err && err.message ? err.message : err) });
      throw err;
    }
  }

  async function fetchIndex(options) {
    options = options || {};
    counters.fetchIndexCalls += 1;
    var requestId = options.requestId;
    var url = PREFAB_INDEX_URL + '?t=' + Date.now() + (typeof requestId !== 'undefined' ? ('&reqId=' + encodeURIComponent(String(requestId))) : '');
    var result = await requestJson('prefab-index', url, { cache: 'no-store' });
    remember('fetch-index', { requestId: requestId || null, count: result && result.data && Array.isArray(result.data.items) ? result.data.items.length : null });
    return result;
  }

  async function savePrefabToServer(filename, prefab, options) {
    options = options || {};
    counters.savePrefabToServerCalls += 1;
    var result = await requestJson('save-prefab', PREFAB_SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      cache: 'no-store',
      body: JSON.stringify({ filename: String(filename || ''), prefab: prefab || null })
    });
    remember('save-server', {
      source: String(options.source || 'unknown'),
      filename: String(filename || ''),
      prefabId: prefab && prefab.id ? String(prefab.id) : null,
      ok: !!(result && result.response && result.response.ok && result.data && result.data.ok)
    });
    return result;
  }

  function listBrowserLibrary(options) {
    options = options || {};
    counters.listBrowserLibraryCalls += 1;
    try {
      var raw = localStorage.getItem(BROWSER_LIBRARY_KEY);
      var parsed = safeParseJson(raw);
      var list = Array.isArray(parsed) ? parsed : [];
      remember('list-browser-library', { source: String(options.source || 'unknown'), count: list.length });
      return list;
    } catch (err) {
      counters.errors += 1;
      serviceLog('browser-library:list:error', 'source=' + String(options.source || 'unknown') + ' error=' + String(err && err.message ? err.message : err));
      remember('browser-library:list:error', { source: String(options.source || 'unknown'), error: String(err && err.message ? err.message : err) });
      return [];
    }
  }

  function savePrefabToBrowserLibrary(prefab, options) {
    options = options || {};
    counters.savePrefabToBrowserLibraryCalls += 1;
    try {
      var list = listBrowserLibrary({ source: String(options.source || 'unknown') + ':list' });
      var next = Array.isArray(list) ? list.slice() : [];
      var idx = next.findIndex(function (item) { return item && prefab && item.id === prefab.id; });
      if (idx >= 0) next[idx] = prefab; else next.push(prefab);
      localStorage.setItem(BROWSER_LIBRARY_KEY, JSON.stringify(next));
      remember('save-browser-library', {
        source: String(options.source || 'unknown'),
        prefabId: prefab && prefab.id ? String(prefab.id) : null,
        count: next.length
      });
      return { ok: true, count: next.length, prefabId: prefab && prefab.id ? String(prefab.id) : null };
    } catch (err) {
      counters.errors += 1;
      serviceLog('browser-library:save:error', 'source=' + String(options.source || 'unknown') + ' error=' + String(err && err.message ? err.message : err));
      remember('save-browser-library:error', { source: String(options.source || 'unknown'), error: String(err && err.message ? err.message : err) });
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  }

  function summarize(label) {
    return {
      owner: OWNER,
      label: String(label || ''),
      counters: {
        fetchIndexCalls: counters.fetchIndexCalls,
        savePrefabToServerCalls: counters.savePrefabToServerCalls,
        listBrowserLibraryCalls: counters.listBrowserLibraryCalls,
        savePrefabToBrowserLibraryCalls: counters.savePrefabToBrowserLibraryCalls,
        errors: counters.errors
      },
      lastEvent: lastEvent,
      recentEvents: recentEvents.slice()
    };
  }

  var prefabApi = {
    owner: OWNER,
    fetchIndex: fetchIndex,
    savePrefabToServer: savePrefabToServer,
    listBrowserLibrary: listBrowserLibrary,
    savePrefabToBrowserLibrary: savePrefabToBrowserLibrary,
    summarize: summarize,
  };
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('services.prefabApi', prefabApi, { owner: OWNER, legacy: [], phase: 'P15' });
  }

  if (typeof logCompatMapping === 'function') logCompatMapping('prefab-api', OWNER);
})();
