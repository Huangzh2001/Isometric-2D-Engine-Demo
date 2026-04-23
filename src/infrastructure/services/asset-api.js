(function () {
  var OWNER = 'src/infrastructure/services/asset-api.js';

  function serviceLog(name, detail) {
    var suffix = detail ? (' ' + String(detail)) : '';
    try { pushLog('[service:asset-api] ' + String(name) + suffix); } catch (_) {}
  }

  async function requestJsonAsset(path, options) {
    options = options || {};
    var url = String(path || '');
    serviceLog('request:start', 'name=json-asset url=' + url);
    try {
      var response = await fetch(url, { cache: 'no-store' });
      serviceLog('request:response', 'name=json-asset status=' + response.status);
      var rawText = await response.text();
      serviceLog('request:text', 'name=json-asset bytes=' + rawText.length);
      var data = rawText ? JSON.parse(rawText) : null;
      serviceLog('request:json', 'name=json-asset ok=' + (!!data));
      serviceLog('request:done', 'name=json-asset status=' + response.status);
      return { response: response, rawText: rawText, data: data };
    } catch (err) {
      serviceLog('request:error', 'name=json-asset error=' + String(err && err.message ? err.message : err));
      throw err;
    }
  }

  async function requestArrayBufferAsset(path, options) {
    options = options || {};
    var url = String(path || '');
    serviceLog('request:start', 'name=arraybuffer-asset url=' + url);
    try {
      var response = await fetch(url, { cache: 'no-store' });
      serviceLog('request:response', 'name=arraybuffer-asset status=' + response.status);
      var buffer = await response.arrayBuffer();
      serviceLog('request:done', 'name=arraybuffer-asset bytes=' + (buffer ? buffer.byteLength : 0));
      return { response: response, buffer: buffer };
    } catch (err) {
      serviceLog('request:error', 'name=arraybuffer-asset error=' + String(err && err.message ? err.message : err));
      throw err;
    }
  }

  var assetApi = {
    owner: OWNER,
    fetchJsonAsset: requestJsonAsset,
    fetchArrayBufferAsset: requestArrayBufferAsset,
  };
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('services.assetApi', assetApi, { owner: OWNER, legacy: [], phase: 'P2-C' });
  }

  if (typeof logCompatMapping === 'function') {
    logCompatMapping('asset-api', OWNER);
  }
  if (typeof markRefactorCheckpoint === 'function') {
    markRefactorCheckpoint('Services', 'service-boundary-tightened', {
      owner: 'src/services',
      sceneApi: !!(window.App && window.App.services && window.App.services.sceneApi),
      prefabApi: !!(window.App && window.App.services && window.App.services.prefabApi),
      habboApi: !!(window.App && window.App.services && window.App.services.habboApi),
      assetApi: !!(window.App && window.App.services && window.App.services.assetApi)
    });
  }
})();
