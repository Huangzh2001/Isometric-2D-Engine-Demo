(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/infrastructure/adapters/placement-effects.js';
  var PHASE = 'P8-S2';
  var MAX_HISTORY = 80;
  var audit = {
    phase: PHASE,
    owner: OWNER,
    events: [],
    counters: {
      beginDragCalls: 0,
      completeDragCalls: 0,
      cancelDragCalls: 0,
      syncUiCalls: 0,
      runtimeModeWrites: 0,
      legacyModeWrites: 0,
      draggingWrites: 0,
      previewClears: 0,
      previewRefreshCalls: 0,
      modeButtonRefreshCalls: 0,
      uiFallbacks: 0
    },
    lastEvent: null
  };

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function nowIso() {
    try { return new Date().toISOString(); } catch (_) { return ''; }
  }

  function log(message, extra) {
    var line = '[PLACEMENT-EFFECTS] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function pushEvent(name, detail) {
    var entry = { at: nowIso(), name: String(name || ''), detail: safeClone(detail || null) };
    audit.events.push(entry);
    if (audit.events.length > MAX_HISTORY) audit.events.splice(0, audit.events.length - MAX_HISTORY);
    audit.lastEvent = entry;
    return entry;
  }

  function getRuntimeApi() {
    try { return window.App && window.App.state ? window.App.state.runtimeState || null : null; } catch (_) { return null; }
  }

  function getEditor() {
    try { return window.editor || null; } catch (_) { return null; }
  }

  function setEditorMode(mode, source) {
    var editor = getEditor();
    if (!editor) return { ok: false, route: 'missing-editor', mode: String(mode || '') };
    var runtimeApi = getRuntimeApi();
    var route = 'editor.mode';
    if (runtimeApi && typeof runtimeApi.setEditorModeValue === 'function') {
      route = 'runtimeState.setEditorModeValue';
      audit.counters.runtimeModeWrites += 1;
      runtimeApi.setEditorModeValue(mode, { source: String(source || 'placement-effects:set-mode') });
    } else {
      audit.counters.legacyModeWrites += 1;
      editor.mode = String(mode || 'view');
    }
    return { ok: true, route: route, mode: String(editor.mode || mode || 'view') };
  }

  function setDraggingInstance(instance, source) {
    var editor = getEditor();
    if (!editor) return { ok: false, route: 'missing-editor' };
    audit.counters.draggingWrites += 1;
    editor.draggingInstance = instance ? Object.assign({}, instance) : null;
    return {
      ok: true,
      route: 'editor.draggingInstance',
      source: String(source || 'placement-effects:set-dragging-instance'),
      instanceId: editor.draggingInstance && editor.draggingInstance.instanceId ? String(editor.draggingInstance.instanceId) : null
    };
  }

  function clearPreview(source) {
    var editor = getEditor();
    if (!editor) return { ok: false, route: 'missing-editor' };
    audit.counters.previewClears += 1;
    editor.preview = null;
    return { ok: true, route: 'editor.preview', source: String(source || 'placement-effects:clear-preview') };
  }

  function refreshModeButtons(source) {
    if (typeof updateModeButtons === 'function') {
      audit.counters.modeButtonRefreshCalls += 1;
      try { updateModeButtons(); } catch (err) { return { ok: false, route: 'updateModeButtons:threw', error: String(err && err.message ? err.message : err) }; }
      return { ok: true, route: 'updateModeButtons', source: String(source || 'placement-effects:refresh-mode-buttons') };
    }
    audit.counters.uiFallbacks += 1;
    return { ok: false, route: 'missing-updateModeButtons' };
  }

  function refreshPreview(source, options) {
    options = options || {};
    var editor = getEditor();
    if (!editor) return { ok: false, route: 'missing-editor' };
    if (typeof updatePreview === 'function') {
      audit.counters.previewRefreshCalls += 1;
      try { updatePreview(); } catch (err) { return { ok: false, route: 'updatePreview:threw', error: String(err && err.message ? err.message : err) }; }
      if (options.requeue === true) {
        try { requestAnimationFrame(function () { try { updatePreview(); } catch (_) {} }); } catch (_) {}
      }
      return { ok: true, route: 'updatePreview', source: String(source || 'placement-effects:refresh-preview') };
    }
    audit.counters.uiFallbacks += 1;
    return { ok: false, route: 'missing-updatePreview' };
  }

  function beginDragSession(instance, meta) {
    meta = meta || {};
    audit.counters.beginDragCalls += 1;
    var source = String(meta.source || 'placement-effects:begin-drag');
    var preClear = null;
    try {
      if (typeof requestEditorModeChange === 'function') preClear = { ok: !!requestEditorModeChange('place', { source: source + ':pre-clear' }), route: 'requestEditorModeChange' };
      else preClear = setEditorMode('place', source + ':pre-clear');
    } catch (err) {
      preClear = { ok: false, route: 'pre-clear:threw', error: String(err && err.message ? err.message : err) };
    }
    var modeWrite = setEditorMode('drag', source);
    var dragWrite = setDraggingInstance(instance, source);
    var previewWrite = clearPreview(source);
    var entry = pushEvent('begin-drag-session', {
      source: source,
      preClear: preClear,
      modeWrite: modeWrite,
      dragging: dragWrite,
      preview: previewWrite,
      instanceId: instance && instance.instanceId ? String(instance.instanceId) : null,
      prefabId: instance && instance.prefabId ? String(instance.prefabId) : null
    });
    log('begin-drag-session', entry.detail);
    return entry.detail;
  }

  function finishDragCommit(meta) {
    meta = meta || {};
    audit.counters.completeDragCalls += 1;
    var source = String(meta.source || 'placement-effects:finish-drag-commit');
    var dragWrite = setDraggingInstance(null, source);
    var modeWrite = setEditorMode('place', source);
    var entry = pushEvent('finish-drag-commit', { source: source, dragging: dragWrite, modeWrite: modeWrite });
    log('finish-drag-commit', entry.detail);
    return entry.detail;
  }

  function finishDragCancel(meta) {
    meta = meta || {};
    audit.counters.cancelDragCalls += 1;
    var source = String(meta.source || 'placement-effects:finish-drag-cancel');
    var dragWrite = setDraggingInstance(null, source);
    var modeWrite = setEditorMode('place', source);
    var entry = pushEvent('finish-drag-cancel', { source: source, dragging: dragWrite, modeWrite: modeWrite });
    log('finish-drag-cancel', entry.detail);
    return entry.detail;
  }

  function syncPlacementUi(meta) {
    meta = meta || {};
    audit.counters.syncUiCalls += 1;
    var source = String(meta.source || 'placement-effects:sync-ui');
    var editor = getEditor();
    var mode = editor && editor.mode ? String(editor.mode) : 'unknown';
    var modeButtons = refreshModeButtons(source + ':mode-buttons');
    var preview = null;
    if (mode === 'place' || meta.forcePreview === true) preview = refreshPreview(source + ':preview', { requeue: !!meta.requeuePreview });
    else preview = clearPreview(source + ':clear-preview');
    var entry = pushEvent('sync-placement-ui', {
      source: source,
      mode: mode,
      modeButtons: modeButtons,
      preview: preview,
      forcePreview: !!meta.forcePreview,
      requeuePreview: !!meta.requeuePreview
    });
    log('sync-placement-ui', entry.detail);
    return entry.detail;
  }

  function summarize(label) {
    return {
      phase: PHASE,
      owner: OWNER,
      counters: safeClone(audit.counters),
      lastEvent: safeClone(audit.lastEvent),
      recentEvents: audit.events.slice(-6).map(safeClone),
      label: String(label || ''),
      available: true
    };
  }

  function resetAudit(meta) {
    audit.events = [];
    audit.counters.beginDragCalls = 0;
    audit.counters.completeDragCalls = 0;
    audit.counters.cancelDragCalls = 0;
    audit.counters.syncUiCalls = 0;
    audit.counters.runtimeModeWrites = 0;
    audit.counters.legacyModeWrites = 0;
    audit.counters.draggingWrites = 0;
    audit.counters.previewClears = 0;
    audit.counters.previewRefreshCalls = 0;
    audit.counters.modeButtonRefreshCalls = 0;
    audit.counters.uiFallbacks = 0;
    audit.lastEvent = null;
    log('audit-reset', { source: meta && meta.source ? String(meta.source) : 'unknown' });
    return summarize();
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    beginDragSession: beginDragSession,
    finishDragCommit: finishDragCommit,
    finishDragCancel: finishDragCancel,
    syncPlacementUi: syncPlacementUi,
    summarize: summarize,
    resetAudit: resetAudit
  };

  try {
    window.__PLACEMENT_EFFECTS__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('placement.effects', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}

  log('bound', { phase: PHASE, owner: OWNER, hasRuntimeState: !!getRuntimeApi(), hasUpdatePreview: typeof updatePreview === 'function', hasUpdateModeButtons: typeof updateModeButtons === 'function' });
})();
