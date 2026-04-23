(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/infrastructure/storage/floor-editor-storage.js';
  var PHASE = 'FLOOR-STORAGE-V21';
  var STORAGE_KEY = '__ISO_ROOM_FLOOR_EDITOR_AUTOSAVE_V21__';
  var LEGACY_KEYS = ['__ISO_ROOM_FLOOR_EDITOR_AUTOSAVE_V2__'];

  function cloneJson(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function buildProjectPayload(editorState) {
    editorState = editorState || {};
    return {
      schema: 'iso-room-floor-editor-project/v2.1',
      exportedAt: new Date().toISOString(),
      activeTool: String(editorState.activeTool || 'brush-floor'),
      activeLevel: Number(editorState.activeLevel) || 0,
      wallBrushHeight: Number(editorState.wallBrushHeight) || 2,
      floorPlan: cloneJson(editorState.floorPlan || null)
    };
  }

  function validatePayload(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid floor project payload');
    if (!payload.floorPlan || typeof payload.floorPlan !== 'object') throw new Error('Missing floorPlan in payload');
    if (!payload.floorPlan.schema || String(payload.floorPlan.schema).indexOf('iso-room-floorplan/') !== 0) throw new Error('Unknown floor plan schema');
    return payload;
  }

  function saveAutosave(editorState) {
    var payload = buildProjectPayload(editorState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
  }

  function tryLoadRaw(raw) {
    if (!raw) return null;
    try { return validatePayload(JSON.parse(raw)); } catch (_) { return null; }
  }

  function loadAutosave() {
    var direct = tryLoadRaw(localStorage.getItem(STORAGE_KEY));
    if (direct) return direct;
    for (var i = 0; i < LEGACY_KEYS.length; i++) {
      var legacy = tryLoadRaw(localStorage.getItem(LEGACY_KEYS[i]));
      if (legacy) return legacy;
    }
    return null;
  }

  function clearAutosave() {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  }

  function downloadProject(editorState, filename) {
    var payload = buildProjectPayload(editorState);
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = String(filename || ((payload.floorPlan && payload.floorPlan.meta && payload.floorPlan.meta.name) || 'room-floor-plan'))
      .replace(/\s+/g, '_')
      .replace(/[^\w\-\u4e00-\u9fa5]/g, '') + '.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return payload;
  }

  function parseText(text) { return validatePayload(JSON.parse(String(text || '{}'))); }

  function readProjectFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('No file selected')); return; }
      var reader = new FileReader();
      reader.onload = function () {
        try { resolve(parseText(reader.result)); } catch (err) { reject(err); }
      };
      reader.onerror = function () { reject(new Error('Failed to read file')); };
      reader.readAsText(file, 'utf-8');
    });
  }

  function summarize(label) {
    var hasAutosave = false;
    try { hasAutosave = !!loadAutosave(); } catch (_) {}
    return {
      phase: PHASE,
      owner: OWNER,
      label: String(label || ''),
      autosaveKey: STORAGE_KEY,
      hasAutosave: hasAutosave,
      capabilities: ['localStorage', 'download-json', 'import-json']
    };
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    storageKey: STORAGE_KEY,
    buildProjectPayload: buildProjectPayload,
    saveAutosave: saveAutosave,
    loadAutosave: loadAutosave,
    clearAutosave: clearAutosave,
    downloadProject: downloadProject,
    parseText: parseText,
    readProjectFile: readProjectFile,
    summarize: summarize
  };

  window.__FLOOR_EDITOR_STORAGE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('services.floorEditorStorage', api, { owner: OWNER, phase: PHASE });
  }
})();
