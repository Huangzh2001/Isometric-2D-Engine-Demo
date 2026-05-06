// P11d-6: Habbo asset file service owner.
// Owns Habbo relative path validation and file buffer fetch.
(function installHabboAssetFileService(global) {
  'use strict';

  var OWNER = 'src/infrastructure/assets/habbo-asset-file-service.js';

  function safeDeps(deps) { return deps || {}; }

  function normalizeRelativePath(relativePath, deps) {
    deps = safeDeps(deps);
    if (typeof deps.normalizeHabboRelativePathClient === 'function') {
      return deps.normalizeHabboRelativePathClient(relativePath);
    }
    var rel = String(relativePath == null ? '' : relativePath).trim().replace(/\\+/g, '/');
    rel = rel.replace(/^\/+/, '');
    if (!rel || rel.indexOf('..') >= 0) return '';
    return rel;
  }

  async function fetchHabboAssetFileBuffer(relativePath, deps) {
    deps = safeDeps(deps);
    var rel = normalizeRelativePath(relativePath, deps);
    if (!rel) throw new Error('缺少 Habbo 资源相对路径');
    if (typeof deps.getHabboApiAdapter !== 'function') throw new Error('habbo-api adapter missing');
    var habboApi = deps.getHabboApiAdapter();
    if (!habboApi || typeof habboApi.fetchFileBuffer !== 'function') throw new Error('habbo-api.fetchFileBuffer missing');
    var fileResult = await habboApi.fetchFileBuffer(rel);
    var res = fileResult && fileResult.response;
    if (!res || !res.ok) throw new Error('HTTP ' + (res && typeof res.status !== 'undefined' ? res.status : 'unknown'));
    return fileResult.buffer;
  }

  global.__HABBO_ASSET_FILE_SERVICE__ = {
    owner: OWNER,
    normalizeRelativePath: normalizeRelativePath,
    fetchHabboAssetFileBuffer: fetchHabboAssetFileBuffer
  };
})(typeof window !== 'undefined' ? window : globalThis);
