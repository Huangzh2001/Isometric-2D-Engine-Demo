(function () {
  var OWNER = 'src/application/world/world-file-controller.js';

  function log(message) {
    try {
      if (typeof pushLog === 'function') pushLog('[world-files] ' + String(message));
      else if (console && console.log) console.log('[world-files] ' + String(message));
    } catch (_) {}
  }

  function getSceneApi() {
    try { return window.App && window.App.services ? window.App.services.sceneApi : null; } catch (_) { return null; }
  }

  function getSceneWorkflow() {
    try { return window.App && window.App.services ? window.App.services.sceneWorkflow : null; } catch (_) { return null; }
  }

  function sanitizeWorldFilename(name, fallback) {
    var base = String(name || '').trim().replace(/[<>:"/\\|?*]+/g, '_').replace(/[\r\n\t]+/g, ' ').replace(/^\.+/, '').replace(/[. ]+$/g, '');
    if (!base) base = String(fallback || 'world');
    if (!/\.json$/i.test(base)) base += '.json';
    return base;
  }

  function timestampToken() {
    var now = new Date();
    return String(now.getFullYear())
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0')
      + '_'
      + String(now.getHours()).padStart(2, '0')
      + String(now.getMinutes()).padStart(2, '0')
      + String(now.getSeconds()).padStart(2, '0');
  }

  function suggestWorldFilename(seed) {
    var fallback = 'world_' + timestampToken() + '.json';
    try {
      if (typeof suggestSceneFilename === 'function') return suggestSceneFilename(seed || fallback);
    } catch (_) {}
    return sanitizeWorldFilename(seed || fallback, fallback);
  }

  function getCurrentSceneFile() {
    try {
      if (typeof recallCurrentSceneServerFileName === 'function') return recallCurrentSceneServerFileName() || '';
    } catch (_) {}
    try {
      var keys = window.__SCENE_STORAGE_KEYS;
      if (keys && typeof keys.getCurrentSceneServerFile === 'function') return keys.getCurrentSceneServerFile() || '';
    } catch (_) {}
    return '';
  }

  async function listWorldFiles(options) {
    options = options || {};
    var sceneApi = getSceneApi();
    if (!sceneApi || typeof sceneApi.listScenes !== 'function') {
      throw new Error('sceneApi.listScenes unavailable; start the local server or update scene-api service');
    }
    var result = await sceneApi.listScenes({ source: options.source || 'world-file-controller:list' });
    var response = result && result.response;
    var data = result && result.data;
    if (!response || !response.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + (response && response.status)));
    var scenes = Array.isArray(data.scenes) ? data.scenes : [];
    log('list count=' + scenes.length + ' default=' + String(data.defaultFile || ''));
    return {
      ok: true,
      scenes: scenes,
      defaultFile: data.defaultFile || '',
      sceneDir: data.sceneDir || 'assets/scenes',
      currentFile: getCurrentSceneFile()
    };
  }

  async function saveWorldFile(filename, options) {
    options = options || {};
    var workflow = getSceneWorkflow();
    if (!workflow || typeof workflow.saveSceneTarget !== 'function') throw new Error('sceneWorkflow.saveSceneTarget unavailable');
    var name = suggestWorldFilename(filename || getCurrentSceneFile() || ('world_' + timestampToken() + '.json'));
    var result = await workflow.saveSceneTarget({
      target: 'server-file',
      filename: name,
      setDefault: options.setDefault !== false,
      source: options.source || 'world-file-controller:save'
    });
    if (!result || result.ok === false) throw new Error('save world failed: ' + name);
    log('save file=' + name + ' default=' + String(options.setDefault !== false));
    return { ok: true, file: name, result: result };
  }

  async function loadWorldFile(filename, options) {
    options = options || {};
    var workflow = getSceneWorkflow();
    if (!workflow || typeof workflow.loadSceneTarget !== 'function') throw new Error('sceneWorkflow.loadSceneTarget unavailable');
    var name = suggestWorldFilename(filename || getCurrentSceneFile() || 'scene.json');
    var result = await workflow.loadSceneTarget({
      target: 'server-file',
      filename: name,
      source: options.source || 'world-file-controller:load'
    });
    if (!result || result.ok === false) throw new Error('load world failed: ' + name);
    log('load file=' + name);
    return { ok: true, file: name, result: result };
  }

  async function createEmptyWorldAndSave(filename, options) {
    options = options || {};
    try {
      if (typeof resetSceneToDefault === 'function') resetSceneToDefault();
      else if (typeof applyWorldToNewScene === 'function') applyWorldToNewScene();
    } catch (_) {}
    var name = suggestWorldFilename(filename || ('world_' + timestampToken() + '.json'));
    return await saveWorldFile(name, { source: options.source || 'world-file-controller:create-empty', setDefault: options.setDefault !== false });
  }

  var api = {
    owner: OWNER,
    phase: 'WORLD-FILES-V1-SCENE-FOLDER',
    sanitizeWorldFilename: sanitizeWorldFilename,
    suggestWorldFilename: suggestWorldFilename,
    getCurrentSceneFile: getCurrentSceneFile,
    listWorldFiles: listWorldFiles,
    saveWorldFile: saveWorldFile,
    loadWorldFile: loadWorldFile,
    createEmptyWorldAndSave: createEmptyWorldAndSave
  };

  window.__WORLD_FILE_CONTROLLER__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('application.worldFileController', api, { owner: OWNER, phase: api.phase });
    window.__APP_NAMESPACE.bind('controllers.worldFiles', api, { owner: OWNER, phase: api.phase });
  } else {
    window.App = window.App || {};
    window.App.application = window.App.application || {};
    window.App.controllers = window.App.controllers || {};
    window.App.application.worldFileController = api;
    window.App.controllers.worldFiles = api;
  }
})();
