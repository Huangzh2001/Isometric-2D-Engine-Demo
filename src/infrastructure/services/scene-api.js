(function () {
  var OWNER = 'src/infrastructure/services/scene-api.js';
  var SAVE_URL = '/api/scenes/save';
  var LOAD_URL = '/api/scenes/load';
  var DEFAULT_URL = '/api/scenes/default';

  function serviceLog(name, detail) {
    var suffix = detail ? (' ' + String(detail)) : '';
    try { pushLog('[service:scene-api] ' + String(name) + suffix); } catch (_) {}
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
      serviceLog('request:json', 'name=' + name + ' ok=' + (!!(data && data.ok !== false)));
      serviceLog('request:done', 'name=' + name + ' status=' + response.status);
      return { response: response, rawText: rawText, data: data };
    } catch (err) {
      serviceLog('request:error', 'name=' + name + ' error=' + String(err && err.message ? err.message : err));
      throw err;
    }
  }

  async function saveScene(payload, options) {
    options = options || {};
    return await requestJson('save-scene', SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload || {})
    });
  }

  async function loadScene(filename, options) {
    options = options || {};
    return await requestJson('load-scene', LOAD_URL + '?file=' + encodeURIComponent(String(filename || '')), {
      cache: 'no-store'
    });
  }

  async function loadDefaultScene(options) {
    options = options || {};
    return await requestJson('load-default-scene', DEFAULT_URL, { cache: 'no-store' });
  }

  var sceneApi = {
    owner: OWNER,
    saveScene: saveScene,
    loadScene: loadScene,
    loadDefaultScene: loadDefaultScene,
  };
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('services.sceneApi', sceneApi, { owner: OWNER, legacy: [], phase: 'P2-C' });
  }

  if (typeof logCompatMapping === 'function') logCompatMapping('scene-api', OWNER);
})();
