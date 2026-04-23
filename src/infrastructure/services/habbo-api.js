(function () {
  var OWNER = 'src/infrastructure/services/habbo-api.js';
  var CONFIG_URL = '/api/habbo/config';
  var INDEX_URL = '/api/habbo/index';
  var FILE_URL = '/api/habbo/file';
  var LIBRARY_INDEX_URL = '/api/habbo/library/index';
  var LIBRARY_SUMMARY_URL = '/api/habbo/library/summary';
  var LIBRARY_PAGE_URL = '/api/habbo/library/page';

  function serviceLog(name, detail) {
    var suffix = detail ? (' ' + String(detail)) : '';
    try { pushLog('[service:habbo-api] ' + String(name) + suffix); } catch (_) {}
  }

  async function requestText(name, url, options) {
    options = options || {};
    var method = String(options.method || 'GET');
    serviceLog('request:start', 'name=' + name + ' method=' + method + ' url=' + url);
    try {
      var response = await fetch(url, options);
      serviceLog('request:response', 'name=' + name + ' status=' + response.status);
      var rawText = await response.text();
      serviceLog('request:text', 'name=' + name + ' bytes=' + rawText.length);
      var data = rawText ? JSON.parse(rawText) : null;
      serviceLog('request:json', 'name=' + name + ' pending=' + String(!!(data && data.pending)));
      serviceLog('request:done', 'name=' + name + ' status=' + response.status);
      return { response: response, rawText: rawText, data: data };
    } catch (err) {
      serviceLog('request:error', 'name=' + name + ' error=' + String(err && err.message ? err.message : err));
      throw err;
    }
  }

  async function requestArrayBuffer(name, url, options) {
    options = options || {};
    var method = String(options.method || 'GET');
    serviceLog('request:start', 'name=' + name + ' method=' + method + ' url=' + url);
    try {
      var response = await fetch(url, options);
      serviceLog('request:response', 'name=' + name + ' status=' + response.status);
      if (!response.ok) {
        var errorText = await response.text().catch(function () { return ''; });
        serviceLog('request:error', 'name=' + name + ' status=' + response.status + ' body=' + errorText.slice(0, 200));
        throw new Error(errorText || ('HTTP ' + response.status));
      }
      var buffer = await response.arrayBuffer();
      serviceLog('request:done', 'name=' + name + ' bytes=' + (buffer ? buffer.byteLength : 0));
      return { response: response, buffer: buffer };
    } catch (err) {
      serviceLog('request:error', 'name=' + name + ' error=' + String(err && err.message ? err.message : err));
      throw err;
    }
  }

  async function getConfig(options) {
    options = options || {};
    var requestId = options.requestId;
    var url = CONFIG_URL + '?t=' + Date.now() + (typeof requestId !== 'undefined' ? ('&reqId=' + encodeURIComponent(String(requestId))) : '');
    return await requestText('habbo-config:get', url, { cache: 'no-store' });
  }

  async function setConfig(root, options) {
    options = options || {};
    var requestId = options.requestId;
    var url = CONFIG_URL + (typeof requestId !== 'undefined' ? ('?reqId=' + encodeURIComponent(String(requestId))) : '');
    return await requestText('habbo-config:set', url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: String(root || '').trim() })
    });
  }

  async function fetchFileBuffer(relativePath, options) {
    options = options || {};
    var rel = String(relativePath || '').trim();
    var url = FILE_URL + '?path=' + encodeURIComponent(rel) + '&t=' + Date.now();
    return await requestArrayBuffer('habbo-file', url, { cache: 'no-store', signal: options.signal });
  }

  async function fetchIndex(options) {
    options = options || {};
    var requestId = options.requestId;
    var url = INDEX_URL + '?t=' + Date.now() + (typeof requestId !== 'undefined' ? ('&reqId=' + encodeURIComponent(String(requestId))) : '');
    return await requestText('habbo-index', url, { cache: 'no-store' });
  }

  async function fetchLibrarySummary(options) {
    options = options || {};
    var requestId = options.requestId;
    var url = LIBRARY_SUMMARY_URL + '?t=' + Date.now() + (typeof requestId !== 'undefined' ? ('&reqId=' + encodeURIComponent(String(requestId))) : '');
    return await requestText('habbo-library-summary', url, { cache: 'no-store', signal: options.signal });
  }

  async function fetchLibraryPage(params, options) {
    options = options || {};
    var requestId = options.requestId;
    var query = String(params || '');
    var url = LIBRARY_PAGE_URL + '?' + query + '&t=' + Date.now() + (typeof requestId !== 'undefined' ? ('&reqId=' + encodeURIComponent(String(requestId))) : '');
    return await requestText('habbo-library-page', url, { cache: 'no-store', signal: options.signal });
  }

  async function fetchLibraryIndex(options) {
    options = options || {};
    var requestId = options.requestId;
    var url = LIBRARY_INDEX_URL + '?t=' + Date.now() + (typeof requestId !== 'undefined' ? ('&reqId=' + encodeURIComponent(String(requestId))) : '');
    return await requestText('habbo-library-index', url, { cache: 'no-store' });
  }

  var habboApi = {
    owner: OWNER,
    getConfig: getConfig,
    setConfig: setConfig,
    fetchFileBuffer: fetchFileBuffer,
    fetchIndex: fetchIndex,
    fetchLibrarySummary: fetchLibrarySummary,
    fetchLibraryPage: fetchLibraryPage,
    fetchLibraryIndex: fetchLibraryIndex,
  };
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('services.habboApi', habboApi, { owner: OWNER, legacy: [], phase: 'P2-C' });
  }

  if (typeof logCompatMapping === 'function') logCompatMapping('habbo-api', OWNER);
})();
