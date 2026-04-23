(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/application/state/state-actions.js';
  var PHASE = 'P19-SA';
  var MAX_HISTORY = 80;
  var audit = {
    phase: PHASE,
    owner: OWNER,
    modeChanges: [],
    prefabSelections: [],
    counters: {
      modeChangeCalls: 0,
      prefabSelectByIndexCalls: 0,
      prefabSelectByIdCalls: 0,
      modeFallbacks: 0,
      prefabFallbacks: 0
    },
    lastModeChange: null,
    lastPrefabSelection: null
  };
  var boundaryAudit = {
    phase: PHASE,
    owner: OWNER,
    counters: {
      runtimeStateHits: 0,
      selectorHits: 0,
      prefabRegistryHits: 0,
      legacyGlobalHits: 0,
      oldEntryHits: 0,
      fallbackCount: 0
    },
    lastEvent: null,
    lastFallback: null,
    recentEvents: [],
    recentFallbacks: []
  };

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function log(message, extra) {
    var line = '[STATE-ACTIONS] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function getNs() {
    try {
      return (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') ? window.__APP_NAMESPACE : null;
    } catch (_) { return null; }
  }

  function path(name) {
    var ns = getNs();
    if (!ns) return null;
    try { return ns.getPath(String(name || '')) || null; } catch (_) { return null; }
  }

  function getRuntimeApi() {
    return path('state.runtimeState') || null;
  }

  function getPrefabApi() {
    return path('state.prefabRegistry') || null;
  }

  function getSelectors() {
    return path('state.selectors') || null;
  }

  function nowIso() {
    try { return new Date().toISOString(); } catch (_) { return ''; }
  }

  function pushHistory(bucket, entry) {
    bucket.push(entry);
    if (bucket.length > MAX_HISTORY) bucket.splice(0, bucket.length - MAX_HISTORY);
    return entry;
  }

  function recordBoundaryEvent(kind, route, detail) {
    var entry = {
      at: nowIso(),
      kind: String(kind || ''),
      route: String(route || ''),
      detail: safeClone(detail || null)
    };
    if (kind === 'runtime-state') boundaryAudit.counters.runtimeStateHits += 1;
    else if (kind === 'selector') boundaryAudit.counters.selectorHits += 1;
    else if (kind === 'prefab-registry') boundaryAudit.counters.prefabRegistryHits += 1;
    else if (kind === 'legacy-global') boundaryAudit.counters.legacyGlobalHits += 1;
    else if (kind === 'old-entry') boundaryAudit.counters.oldEntryHits += 1;
    boundaryAudit.lastEvent = entry;
    pushHistory(boundaryAudit.recentEvents, entry);
    return entry;
  }

  function recordBoundaryFallback(route, detail) {
    var entry = {
      at: nowIso(),
      route: String(route || ''),
      detail: safeClone(detail || null)
    };
    boundaryAudit.counters.fallbackCount += 1;
    boundaryAudit.lastFallback = entry;
    pushHistory(boundaryAudit.recentFallbacks, entry);
    return entry;
  }

  function summarizeBoundary(label) {
    return {
      phase: PHASE,
      owner: OWNER,
      label: String(label || ''),
      available: true,
      counters: safeClone(boundaryAudit.counters),
      lastEvent: safeClone(boundaryAudit.lastEvent),
      lastFallback: safeClone(boundaryAudit.lastFallback),
      recentEvents: boundaryAudit.recentEvents.slice(-8).map(safeClone),
      recentFallbacks: boundaryAudit.recentFallbacks.slice(-5).map(safeClone)
    };
  }

  function resetBoundaryAudit(meta) {
    boundaryAudit.counters.runtimeStateHits = 0;
    boundaryAudit.counters.selectorHits = 0;
    boundaryAudit.counters.prefabRegistryHits = 0;
    boundaryAudit.counters.legacyGlobalHits = 0;
    boundaryAudit.counters.oldEntryHits = 0;
    boundaryAudit.counters.fallbackCount = 0;
    boundaryAudit.lastEvent = null;
    boundaryAudit.lastFallback = null;
    boundaryAudit.recentEvents = [];
    boundaryAudit.recentFallbacks = [];
    recordBoundaryEvent('reset', 'state-actions.boundary.reset', meta || { source: 'state-actions:boundary-reset' });
    return summarizeBoundary(meta && meta.label ? String(meta.label) : 'reset');
  }

  function readEditorMode() {
    var selectors = getSelectors();
    if (selectors && typeof selectors.getEditorMode === 'function') {
      var mode = String(selectors.getEditorMode() || 'view');
      recordBoundaryEvent('selector', 'state.selectors.getEditorMode', { mode: mode, source: 'state-actions:readEditorMode' });
      return mode;
    }
    var runtimeApi = getRuntimeApi();
    if (runtimeApi && typeof runtimeApi.summarize === 'function') {
      var summary = runtimeApi.summarize() || {};
      var runtimeMode = String(summary.editorMode || 'view');
      recordBoundaryEvent('runtime-state', 'state.runtimeState.summarize', { mode: runtimeMode, source: 'state-actions:readEditorMode' });
      recordBoundaryFallback('state.selectors.getEditorMode', { source: 'state-actions:readEditorMode', reason: 'missing-selector' });
      return runtimeMode;
    }
    if (runtimeApi && runtimeApi.editor) {
      var runtimeEditorMode = String(runtimeApi.editor.mode || 'view');
      recordBoundaryEvent('runtime-state', 'state.runtimeState.editor.mode', { mode: runtimeEditorMode, source: 'state-actions:readEditorMode' });
      recordBoundaryFallback('state.runtimeState.summarize', { source: 'state-actions:readEditorMode', reason: 'missing-runtime-summarize' });
      return runtimeEditorMode;
    }
    try {
      var legacyMode = String((window.editor && window.editor.mode) || 'view');
      recordBoundaryEvent('legacy-global', 'window.editor.mode', { mode: legacyMode, source: 'state-actions:readEditorMode' });
      recordBoundaryFallback('window.editor.mode', { source: 'state-actions:readEditorMode', reason: 'missing-runtime-and-selector' });
      return legacyMode;
    } catch (_) {
      recordBoundaryFallback('missing-editor-mode', { source: 'state-actions:readEditorMode' });
      return 'view';
    }
  }

  function readSelectedPrefabId() {
    var selectors = getSelectors();
    if (selectors && typeof selectors.getSelectedPrefabId === 'function') {
      var selectedId = selectors.getSelectedPrefabId() || null;
      recordBoundaryEvent('selector', 'state.selectors.getSelectedPrefabId', { prefabId: selectedId, source: 'state-actions:readSelectedPrefabId' });
      return selectedId;
    }
    var prefabApi = getPrefabApi();
    if (prefabApi && typeof prefabApi.summarize === 'function') {
      var summary = prefabApi.summarize() || {};
      var summaryId = summary.selectedPrefabId || null;
      recordBoundaryEvent('prefab-registry', 'state.prefabRegistry.summarize', { prefabId: summaryId, source: 'state-actions:readSelectedPrefabId' });
      recordBoundaryFallback('state.selectors.getSelectedPrefabId', { source: 'state-actions:readSelectedPrefabId', reason: 'missing-selector' });
      return summaryId;
    }
    try {
      if (typeof currentProto === 'function') {
        var proto = currentProto();
        var legacyId = proto && proto.id ? String(proto.id) : null;
        recordBoundaryEvent('legacy-global', 'currentProto', { prefabId: legacyId, source: 'state-actions:readSelectedPrefabId' });
        recordBoundaryFallback('currentProto', { source: 'state-actions:readSelectedPrefabId', reason: 'missing-selector-and-prefab-summary' });
        return legacyId;
      }
    } catch (_) {}
    recordBoundaryFallback('missing-selected-prefab-id', { source: 'state-actions:readSelectedPrefabId' });
    return null;
  }

  function readSelectedPrototypeIndex() {
    var selectors = getSelectors();
    if (selectors && typeof selectors.getSelectedPrototypeIndex === 'function') {
      var index = Number(selectors.getSelectedPrototypeIndex()) || 0;
      recordBoundaryEvent('selector', 'state.selectors.getSelectedPrototypeIndex', { index: index, source: 'state-actions:readSelectedPrototypeIndex' });
      return index;
    }
    var prefabApi = getPrefabApi();
    if (prefabApi && typeof prefabApi.getSelectedPrototypeIndex === 'function') {
      var registryIndex = Number(prefabApi.getSelectedPrototypeIndex()) || 0;
      recordBoundaryEvent('prefab-registry', 'state.prefabRegistry.getSelectedPrototypeIndex', { index: registryIndex, source: 'state-actions:readSelectedPrototypeIndex' });
      recordBoundaryFallback('state.selectors.getSelectedPrototypeIndex', { source: 'state-actions:readSelectedPrototypeIndex', reason: 'missing-selector' });
      return registryIndex;
    }
    try {
      var legacyIndex = (window.editor && typeof window.editor.prototypeIndex === 'number') ? Number(window.editor.prototypeIndex) || 0 : 0;
      recordBoundaryEvent('legacy-global', 'window.editor.prototypeIndex', { index: legacyIndex, source: 'state-actions:readSelectedPrototypeIndex' });
      recordBoundaryFallback('window.editor.prototypeIndex', { source: 'state-actions:readSelectedPrototypeIndex', reason: 'missing-selector-and-prefab-api' });
      return legacyIndex;
    } catch (_) {
      recordBoundaryFallback('missing-selected-prototype-index', { source: 'state-actions:readSelectedPrototypeIndex' });
      return 0;
    }
  }

  function recordModeChange(entry) {
    audit.counters.modeChangeCalls += 1;
    audit.lastModeChange = entry;
    pushHistory(audit.modeChanges, entry);
    return entry;
  }

  function recordPrefabSelection(entry, counterField) {
    if (audit.counters[counterField] != null) audit.counters[counterField] += 1;
    audit.lastPrefabSelection = entry;
    pushHistory(audit.prefabSelections, entry);
    return entry;
  }

  function summarize() {
    return {
      phase: PHASE,
      owner: OWNER,
      counters: safeClone(audit.counters),
      lastModeChange: safeClone(audit.lastModeChange),
      lastPrefabSelection: safeClone(audit.lastPrefabSelection),
      recentModeChanges: audit.modeChanges.slice(-5).map(safeClone),
      recentPrefabSelections: audit.prefabSelections.slice(-5).map(safeClone)
    };
  }

  function requestModeChange(mode, meta) {
    meta = meta || {};
    var source = meta && meta.source ? String(meta.source) : 'state-actions:requestModeChange';
    var before = readEditorMode();
    var route = 'none';
    var result = false;
    try {
      var runtimeApi = getRuntimeApi();
      if (runtimeApi && typeof runtimeApi.setEditorModeValue === 'function') {
        route = 'state.runtimeState.setEditorModeValue';
        runtimeApi.setEditorModeValue(mode, { source: source });
        recordBoundaryEvent('runtime-state', route, { source: source, mode: String(mode || '') });
        result = true;
      } else if (typeof requestEditorModeChange === 'function') {
        route = 'requestEditorModeChange';
        recordBoundaryEvent('old-entry', route, { source: source, mode: String(mode || '') });
        recordBoundaryFallback(route, { source: source, reason: 'missing-runtimeState.setEditorModeValue' });
        audit.counters.modeFallbacks += 1;
        result = requestEditorModeChange(mode, { source: source });
      } else if (typeof setEditorMode === 'function') {
        route = 'setEditorMode';
        recordBoundaryEvent('old-entry', route, { source: source, mode: String(mode || '') });
        recordBoundaryFallback(route, { source: source, reason: 'missing-runtimeState.setEditorModeValue-and-requestEditorModeChange' });
        audit.counters.modeFallbacks += 1;
        result = setEditorMode(mode, { source: source });
      }
    } catch (err) {
      result = false;
      route = route + ':threw';
      var failedEntry = recordModeChange({
        at: nowIso(),
        source: source,
        requestedMode: String(mode || ''),
        beforeMode: before,
        afterMode: readEditorMode(),
        ok: false,
        route: route,
        error: String(err && err.message ? err.message : err)
      });
      log('mode-change-failed', failedEntry);
      return false;
    }
    var entry = recordModeChange({
      at: nowIso(),
      source: source,
      requestedMode: String(mode || ''),
      beforeMode: before,
      afterMode: readEditorMode(),
      ok: !!result,
      route: route,
      fallbackUsed: route !== 'state.runtimeState.setEditorModeValue'
    });
    log('mode-change', entry);
    return result;
  }

  function selectPrefabByIndex(index, meta) {
    meta = meta || {};
    var source = meta && meta.source ? String(meta.source) : 'state-actions:selectPrefabByIndex';
    var beforeIndex = readSelectedPrototypeIndex();
    var beforePrefabId = readSelectedPrefabId();
    var route = 'none';
    var result = null;
    try {
      var registryApi = getPrefabApi();
      if (registryApi && typeof registryApi.setSelectedPrototypeIndex === 'function') {
        route = 'state.prefabRegistry.setSelectedPrototypeIndex';
        result = registryApi.setSelectedPrototypeIndex(index, { source: source });
        recordBoundaryEvent('prefab-registry', route, { source: source, index: Number(index) || 0, result: result });
      } else {
        audit.counters.prefabFallbacks += 1;
        route = 'window.editor.prototypeIndex';
        recordBoundaryEvent('legacy-global', route, { source: source, index: Number(index) || 0 });
        recordBoundaryFallback(route, { source: source, reason: 'missing-state.prefabRegistry.setSelectedPrototypeIndex' });
        if (typeof window.editor !== 'undefined' && window.editor) {
          window.editor.prototypeIndex = Number(index) || 0;
          result = window.editor.prototypeIndex;
        }
      }
    } catch (err) {
      var failedEntry = recordPrefabSelection({
        at: nowIso(),
        source: source,
        kind: 'index',
        requestedIndex: Number(index) || 0,
        beforeIndex: beforeIndex,
        afterIndex: readSelectedPrototypeIndex(),
        beforePrefabId: beforePrefabId,
        afterPrefabId: readSelectedPrefabId(),
        ok: false,
        route: route + ':threw',
        error: String(err && err.message ? err.message : err)
      }, 'prefabSelectByIndexCalls');
      log('prefab-select-failed', failedEntry);
      return -1;
    }
    var entry = recordPrefabSelection({
      at: nowIso(),
      source: source,
      kind: 'index',
      requestedIndex: Number(index) || 0,
      beforeIndex: beforeIndex,
      afterIndex: readSelectedPrototypeIndex(),
      beforePrefabId: beforePrefabId,
      afterPrefabId: readSelectedPrefabId(),
      ok: typeof result !== 'undefined' && result !== null,
      route: route,
      fallbackUsed: route !== 'state.prefabRegistry.setSelectedPrototypeIndex'
    }, 'prefabSelectByIndexCalls');
    log('prefab-select-index', entry);
    return result;
  }

  function selectPrefabById(prefabId, meta) {
    meta = meta || {};
    var source = meta && meta.source ? String(meta.source) : 'state-actions:selectPrefabById';
    var beforeIndex = readSelectedPrototypeIndex();
    var beforePrefabId = readSelectedPrefabId();
    var route = 'none';
    var result = null;
    try {
      var registryApi = getPrefabApi();
      if (registryApi && typeof registryApi.setSelectedPrefabId === 'function') {
        route = 'state.prefabRegistry.setSelectedPrefabId';
        result = registryApi.setSelectedPrefabId(prefabId, { source: source });
        recordBoundaryEvent('prefab-registry', route, { source: source, prefabId: String(prefabId || ''), result: result });
      } else if (Array.isArray(window.prototypes)) {
        audit.counters.prefabFallbacks += 1;
        route = 'window.prototypes.findIndex';
        recordBoundaryEvent('legacy-global', route, { source: source, prefabId: String(prefabId || '') });
        recordBoundaryFallback(route, { source: source, reason: 'missing-state.prefabRegistry.setSelectedPrefabId' });
        result = window.prototypes.findIndex(function (p) { return p && p.id === prefabId; });
        if (result >= 0 && typeof window.editor !== 'undefined' && window.editor) window.editor.prototypeIndex = result;
      }
    } catch (err) {
      var failedEntry = recordPrefabSelection({
        at: nowIso(),
        source: source,
        kind: 'id',
        requestedPrefabId: String(prefabId || ''),
        beforeIndex: beforeIndex,
        afterIndex: readSelectedPrototypeIndex(),
        beforePrefabId: beforePrefabId,
        afterPrefabId: readSelectedPrefabId(),
        ok: false,
        route: route + ':threw',
        error: String(err && err.message ? err.message : err)
      }, 'prefabSelectByIdCalls');
      log('prefab-select-failed', failedEntry);
      return -1;
    }
    var entry = recordPrefabSelection({
      at: nowIso(),
      source: source,
      kind: 'id',
      requestedPrefabId: String(prefabId || ''),
      beforeIndex: beforeIndex,
      afterIndex: readSelectedPrototypeIndex(),
      beforePrefabId: beforePrefabId,
      afterPrefabId: readSelectedPrefabId(),
      ok: !(typeof result === 'number' && result < 0),
      route: route,
      fallbackUsed: route !== 'state.prefabRegistry.setSelectedPrefabId'
    }, 'prefabSelectByIdCalls');
    log('prefab-select-id', entry);
    return result;
  }

  function handlePrefabSelectChange(index, meta) {
    meta = meta || {};
    var source = meta && meta.source ? String(meta.source) : 'state-actions:handlePrefabSelectChange';
    var selectedIndex = selectPrefabByIndex(index, { source: source });
    var beforeMode = readEditorMode();
    var modeChanged = false;
    if (beforeMode !== 'delete') modeChanged = !!requestModeChange('place', { source: source + ':place-after-prefab' });
    return {
      ok: true,
      index: Number(selectedIndex) || 0,
      prefabId: readSelectedPrefabId(),
      modeBefore: beforeMode,
      modeAfter: readEditorMode(),
      modeChanged: !!modeChanged
    };
  }

  function resetAudit(meta) {
    audit.modeChanges = [];
    audit.prefabSelections = [];
    audit.counters.modeChangeCalls = 0;
    audit.counters.prefabSelectByIndexCalls = 0;
    audit.counters.prefabSelectByIdCalls = 0;
    audit.counters.modeFallbacks = 0;
    audit.counters.prefabFallbacks = 0;
    audit.lastModeChange = null;
    audit.lastPrefabSelection = null;
    log('audit-reset', { source: meta && meta.source ? String(meta.source) : 'unknown' });
    return summarize();
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    requestModeChange: requestModeChange,
    selectPrefabByIndex: selectPrefabByIndex,
    selectPrefabById: selectPrefabById,
    handlePrefabSelectChange: handlePrefabSelectChange,
    summarize: summarize,
    resetAudit: resetAudit,
    summarizeBoundary: summarizeBoundary,
    resetBoundaryAudit: resetBoundaryAudit
  };

  try {
    window.__STATE_ACTIONS__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('state.actions', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}

  log('bound', {
    phase: PHASE,
    owner: OWNER,
    roots: {
      runtimeState: !!getRuntimeApi(),
      prefabRegistry: !!getPrefabApi(),
      selectors: !!getSelectors()
    }
  });
})();
