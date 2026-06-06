(function () {
  var OWNER = 'src/presentation/ui/ui-world-files-panel.js';
  var lastList = [];

  function getUi() {
    try { return window.ui || ui || null; } catch (_) { return window.ui || null; }
  }

  function getController() {
    try {
      return window.__WORLD_FILE_CONTROLLER__
        || (window.App && window.App.application && window.App.application.worldFileController)
        || (window.App && window.App.controllers && window.App.controllers.worldFiles)
        || null;
    } catch (_) { return window.__WORLD_FILE_CONTROLLER__ || null; }
  }

  function status(message) {
    var u = getUi();
    if (u && u.worldSceneStatus) u.worldSceneStatus.textContent = String(message || '');
  }

  function log(message) {
    try {
      if (typeof pushLog === 'function') pushLog('[world-files-ui] ' + String(message));
      else if (console && console.log) console.log('[world-files-ui] ' + String(message));
    } catch (_) {}
  }

  function selectedFile() {
    var u = getUi();
    return u && u.worldSceneSelect ? String(u.worldSceneSelect.value || '') : '';
  }

  function inputFile() {
    var u = getUi();
    return u && u.worldSceneName ? String(u.worldSceneName.value || '').trim() : '';
  }

  function setInputFile(value) {
    var u = getUi();
    if (u && u.worldSceneName) u.worldSceneName.value = String(value || '');
  }

  function formatSceneLabel(scene) {
    var file = String(scene && scene.file || '');
    var label = String(scene && scene.label || file || '未命名世界');
    var counts = 'I' + String(scene && scene.instances != null ? scene.instances : 0) + '/B' + String(scene && scene.boxes != null ? scene.boxes : 0);
    var suffix = scene && scene.isDefault ? ' · 默认' : '';
    return label + ' — ' + file + ' · ' + counts + suffix;
  }

  function renderList(payload) {
    var u = getUi();
    if (!u || !u.worldSceneSelect) return;
    var scenes = payload && Array.isArray(payload.scenes) ? payload.scenes : [];
    lastList = scenes.slice();
    u.worldSceneSelect.innerHTML = '';
    var doc = document;
    if (!scenes.length) {
      var empty = doc.createElement('option');
      empty.value = '';
      empty.textContent = '没有已保存世界';
      u.worldSceneSelect.appendChild(empty);
      status('多世界：assets/scenes 中没有可选世界。可以先点“另存为新世界”。');
      return;
    }
    scenes.forEach(function (scene) {
      var opt = doc.createElement('option');
      opt.value = String(scene.file || '');
      opt.textContent = formatSceneLabel(scene);
      u.worldSceneSelect.appendChild(opt);
    });
    var current = String((payload && payload.currentFile) || (payload && payload.defaultFile) || '');
    if (current && scenes.some(function (s) { return String(s.file || '') === current; })) u.worldSceneSelect.value = current;
    if (!u.worldSceneSelect.value && scenes[0]) u.worldSceneSelect.value = String(scenes[0].file || '');
    setInputFile(u.worldSceneSelect.value || current || '');
    status('多世界：已读取 ' + scenes.length + ' 个世界；目录 ' + String(payload.sceneDir || 'assets/scenes') + '。');
  }

  async function refreshWorldScenes(source) {
    var c = getController();
    if (!c || typeof c.listWorldFiles !== 'function') {
      status('多世界：控制器未加载。');
      return null;
    }
    try {
      status('多世界：正在刷新世界列表...');
      var payload = await c.listWorldFiles({ source: source || 'ui-world-files:refresh' });
      renderList(payload);
      return payload;
    } catch (err) {
      status('多世界：刷新失败：' + (err && err.message ? err.message : err));
      log('refresh:error ' + (err && err.message ? err.message : err));
      return null;
    }
  }

  async function loadSelectedWorld() {
    var c = getController();
    var file = selectedFile();
    if (!file) { status('多世界：没有选择世界。'); return false; }
    try {
      status('多世界：正在加载 ' + file + ' ...');
      await c.loadWorldFile(file, { source: 'ui-world-files:load-selected' });
      setInputFile(file);
      await refreshWorldScenes('ui-world-files:after-load');
      status('多世界：已加载 ' + file + '。');
      return true;
    } catch (err) {
      status('多世界：加载失败：' + (err && err.message ? err.message : err));
      return false;
    }
  }

  async function saveCurrentWorld() {
    var c = getController();
    var file = selectedFile() || inputFile();
    if (!file) { status('多世界：没有当前文件名，请先另存为新世界。'); return false; }
    try {
      status('多世界：正在保存到 ' + file + ' ...');
      await c.saveWorldFile(file, { source: 'ui-world-files:save-current', setDefault: true });
      setInputFile(file);
      await refreshWorldScenes('ui-world-files:after-save-current');
      status('多世界：已保存当前世界到 ' + file + '。');
      return true;
    } catch (err) {
      status('多世界：保存失败：' + (err && err.message ? err.message : err));
      return false;
    }
  }

  async function saveAsWorld() {
    var c = getController();
    var seed = inputFile() || selectedFile() || (c && typeof c.suggestWorldFilename === 'function' ? c.suggestWorldFilename('world.json') : 'world.json');
    var file = window.prompt('请输入新世界文件名（保存到 assets/scenes）', seed);
    if (file == null) return false;
    try {
      file = c && typeof c.suggestWorldFilename === 'function' ? c.suggestWorldFilename(file) : file;
      status('多世界：正在另存为 ' + file + ' ...');
      await c.saveWorldFile(file, { source: 'ui-world-files:save-as', setDefault: true });
      setInputFile(file);
      await refreshWorldScenes('ui-world-files:after-save-as');
      var u = getUi();
      if (u && u.worldSceneSelect) u.worldSceneSelect.value = file;
      status('多世界：已另存为新世界 ' + file + '。');
      return true;
    } catch (err) {
      status('多世界：另存失败：' + (err && err.message ? err.message : err));
      return false;
    }
  }

  async function newWorldAndSave() {
    var c = getController();
    var seed = c && typeof c.suggestWorldFilename === 'function' ? c.suggestWorldFilename('world.json') : 'world.json';
    var file = window.prompt('新建空世界并保存为', seed);
    if (file == null) return false;
    try {
      file = c && typeof c.suggestWorldFilename === 'function' ? c.suggestWorldFilename(file) : file;
      status('多世界：正在新建空世界并保存 ' + file + ' ...');
      await c.createEmptyWorldAndSave(file, { source: 'ui-world-files:new-world', setDefault: true });
      setInputFile(file);
      await refreshWorldScenes('ui-world-files:after-new-world');
      var u = getUi();
      if (u && u.worldSceneSelect) u.worldSceneSelect.value = file;
      status('多世界：已新建并保存 ' + file + '。');
      return true;
    } catch (err) {
      status('多世界：新建失败：' + (err && err.message ? err.message : err));
      return false;
    }
  }

  function bind() {
    var u = getUi();
    if (!u) return false;
    if (u.refreshWorldScenes && !u.refreshWorldScenes.__worldFilesBound) {
      u.refreshWorldScenes.__worldFilesBound = true;
      u.refreshWorldScenes.addEventListener('click', function () { refreshWorldScenes('ui-world-files:refresh-click'); });
    }
    if (u.loadWorldScene && !u.loadWorldScene.__worldFilesBound) {
      u.loadWorldScene.__worldFilesBound = true;
      u.loadWorldScene.addEventListener('click', loadSelectedWorld);
    }
    if (u.saveWorldScene && !u.saveWorldScene.__worldFilesBound) {
      u.saveWorldScene.__worldFilesBound = true;
      u.saveWorldScene.addEventListener('click', saveCurrentWorld);
    }
    if (u.saveWorldSceneAs && !u.saveWorldSceneAs.__worldFilesBound) {
      u.saveWorldSceneAs.__worldFilesBound = true;
      u.saveWorldSceneAs.addEventListener('click', saveAsWorld);
    }
    if (u.newWorldScene && !u.newWorldScene.__worldFilesBound) {
      u.newWorldScene.__worldFilesBound = true;
      u.newWorldScene.addEventListener('click', newWorldAndSave);
    }
    if (u.worldSceneSelect && !u.worldSceneSelect.__worldFilesBound) {
      u.worldSceneSelect.__worldFilesBound = true;
      u.worldSceneSelect.addEventListener('change', function () { setInputFile(selectedFile()); });
    }
    setTimeout(function () { refreshWorldScenes('ui-world-files:startup'); }, 200);
    return true;
  }

  window.__WORLD_FILES_UI__ = {
    owner: OWNER,
    renderList: renderList,
    refreshWorldScenes: refreshWorldScenes,
    loadSelectedWorld: loadSelectedWorld,
    saveCurrentWorld: saveCurrentWorld,
    saveAsWorld: saveAsWorld,
    newWorldAndSave: newWorldAndSave,
    bind: bind
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
