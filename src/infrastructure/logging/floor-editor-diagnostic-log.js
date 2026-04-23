(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/infrastructure/logging/floor-editor-diagnostic-log.js';
  var PHASE = 'FLOOR-DIAG-LOG-V3.9';
  var MAX_ENTRIES = 3000;
  var MAX_RENDER_SNAPSHOTS = 240;
  var MAX_HIT_TESTS = 240;
  var MAX_DRAFT_ENTRIES = 240;
  var MAX_DOM_SNAPSHOTS = 120;
  var sessionId = 'floordiag-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  var entries = [];
  var renderSnapshots = [];
  var hitTests = [];
  var metaDraftEntries = [];
  var domSnapshots = [];
  var latest = {};
  var counters = {
    uiEventsByName: {},
    controllerReasons: {},
    skippedControllerReasons: {},
    lifecycleByName: {},
    consoleErrorCount: 0,
    consoleWarnCount: 0,
    windowErrorCount: 0,
    unhandledRejectionCount: 0,
    renderCount: 0,
    hitTestCount: 0,
    metaDraftCount: 0,
    domSnapshotCount: 0,
    renderSummaryCount: 0,
    rotationAnimationStartCount: 0,
    rotationAnimationCompleteCount: 0
  };
  var consoleHooked = false;
  var errorHooked = false;

  function nowIso() { return new Date().toISOString(); }
  function cloneJson(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
  }
  function safeString(value) {
    if (value == null) return '';
    try { return String(value); } catch (_) { return ''; }
  }
  function pushLimited(list, item, max) {
    list.push(item);
    if (list.length > max) list.splice(0, list.length - max);
  }
  function increment(counter, key) {
    if (!counter[key]) counter[key] = 0;
    counter[key] += 1;
  }
  function summarizeState(editorState) {
    var out = {
      hasState: !!editorState,
      activeTool: null,
      activeLevel: 0,
      wallBrushHeight: 0,
      selection: null,
      hover: null,
      view: null,
      floorPlan: null,
      summary: null,
      dirty: null,
      lastAction: null
    };
    if (!editorState || typeof editorState !== 'object') return out;
    out.activeTool = safeString(editorState.activeTool || '');
    out.activeLevel = Number(editorState.activeLevel) || 0;
    out.wallBrushHeight = Number(editorState.wallBrushHeight) || 0;
    out.selection = cloneJson(editorState.selection || null);
    out.hover = cloneJson(editorState.hover || null);
    out.view = cloneJson(editorState.view || null);
    out.dirty = !!editorState.dirty;
    out.lastAction = safeString(editorState.lastAction || '');
    var plan = editorState.floorPlan || null;
    if (plan) {
      out.floorPlan = {
        schema: safeString(plan.schema || ''),
        name: plan.meta && plan.meta.name ? safeString(plan.meta.name) : '',
        shapeMode: safeString(plan.shapeMode || ''),
        levelCount: Number(plan.levelCount) || 0,
        bounds: cloneJson(plan.bounds || null),
        defaultWallHeight: Number(plan.defaultWallHeight) || 0,
        maxWallHeight: Number(plan.maxWallHeight) || 0
      };
      try {
        var domain = window.__FLOOR_EDITOR_DOMAIN__ || null;
        if (domain && typeof domain.summarize === 'function') {
          out.summary = cloneJson(domain.summarize(plan, 'diagnostic-export', out.activeLevel));
        }
      } catch (_) {}
    }
    return out;
  }
  function push(kind, payload) {
    var item = {
      index: entries.length + 1,
      time: nowIso(),
      kind: safeString(kind || ''),
      payload: cloneJson(payload)
    };
    pushLimited(entries, item, MAX_ENTRIES);
    return item;
  }
  function recordLatest(label, payload) {
    latest[safeString(label || 'unknown')] = {
      time: nowIso(),
      payload: cloneJson(payload)
    };
  }
  function hookWindowErrors() {
    if (errorHooked) return;
    errorHooked = true;
    window.addEventListener('error', function (ev) {
      counters.windowErrorCount += 1;
      push('window-error', {
        message: safeString(ev && ev.message || ''),
        source: safeString(ev && ev.filename || ''),
        line: ev && ev.lineno || 0,
        col: ev && ev.colno || 0
      });
    });
    window.addEventListener('unhandledrejection', function (ev) {
      counters.unhandledRejectionCount += 1;
      var reason = ev && ev.reason;
      push('unhandledrejection', {
        reason: safeString(reason && reason.message ? reason.message : reason)
      });
    });
  }
  function hookConsoleError() {
    if (consoleHooked || !window.console) return;
    consoleHooked = true;
    function wrap(methodName, counterField, kind) {
      if (typeof window.console[methodName] !== 'function') return;
      var original = window.console[methodName].bind(window.console);
      window.console[methodName] = function () {
        counters[counterField] += 1;
        var args = Array.prototype.slice.call(arguments || []).map(function (item) {
          if (item && item.stack) return { message: safeString(item.message || item), stack: safeString(item.stack || '') };
          if (typeof item === 'object') return cloneJson(item);
          return safeString(item);
        });
        push(kind, { args: args });
        return original.apply(null, arguments);
      };
    }
    wrap('error', 'consoleErrorCount', 'console-error');
    wrap('warn', 'consoleWarnCount', 'console-warn');
  }
  function captureUiEvent(name, payload) {
    var safeName = safeString(name || '');
    increment(counters.uiEventsByName, safeName);
    recordLatest('ui-event:' + safeName, payload);
    return push('ui-event', { name: safeName, payload: cloneJson(payload) });
  }
  function captureLifecycle(name, payload) {
    var safeName = safeString(name || '');
    increment(counters.lifecycleByName, safeName);
    if (safeName === 'rotation-animation-start') counters.rotationAnimationStartCount += 1;
    if (safeName === 'rotation-animation-complete') counters.rotationAnimationCompleteCount += 1;
    recordLatest('lifecycle:' + safeName, payload);
    return push('lifecycle', { name: safeName, payload: cloneJson(payload) });
  }
  function shouldSkipControllerReason(reason) {
    return reason === 'hover' || reason === 'patch-view' || reason === 'update-rect-selection';
  }
  function captureControllerEvent(meta, state) {
    var reason = meta && meta.reason ? String(meta.reason) : 'unknown';
    var payload = cloneJson(meta && meta.payload || null);
    increment(counters.controllerReasons, reason);
    recordLatest('controller:' + reason, { payload: payload, state: summarizeState(state) });
    if (payload && payload.offsetChangedWithoutExplicitOffsetAction === true) {
      push('controller-anomaly', {
        reason: reason,
        payload: payload
      });
    }
    if (shouldSkipControllerReason(reason)) {
      increment(counters.skippedControllerReasons, reason);
      return null;
    }
    return push('controller-event', {
      reason: reason,
      payload: payload,
      state: summarizeState(state)
    });
  }
  function captureRenderCycle(stats) {
    counters.renderCount += 1;
    counters.renderSummaryCount += 1;
    var item = { time: nowIso(), stats: cloneJson(stats || null) };
    pushLimited(renderSnapshots, item, MAX_RENDER_SNAPSHOTS);
    recordLatest('render-cycle', item);
    return item;
  }
  function captureHitTest(stats) {
    counters.hitTestCount += 1;
    var item = { time: nowIso(), stats: cloneJson(stats || null) };
    pushLimited(hitTests, item, MAX_HIT_TESTS);
    recordLatest('hit-test', item);
    return item;
  }
  function captureMetaDraft(label, payload) {
    counters.metaDraftCount += 1;
    var item = { time: nowIso(), label: safeString(label || ''), payload: cloneJson(payload || null) };
    pushLimited(metaDraftEntries, item, MAX_DRAFT_ENTRIES);
    recordLatest('meta-draft:' + safeString(label || 'unknown'), item);
    return item;
  }
  function captureDomSnapshot(label, payload) {
    counters.domSnapshotCount += 1;
    var item = { time: nowIso(), label: safeString(label || ''), payload: cloneJson(payload || null) };
    pushLimited(domSnapshots, item, MAX_DOM_SNAPSHOTS);
    recordLatest('dom-snapshot:' + safeString(label || 'unknown'), item);
    return item;
  }
  function buildDiagnostic(editorState, extras) {
    var localStorageInfo = { available: false, keysChecked: [] };
    try {
      localStorageInfo.available = !!window.localStorage;
      if (window.localStorage) {
        var storage = window.__FLOOR_EDITOR_STORAGE__ || null;
        if (storage && storage.storageKey) {
          localStorageInfo.keysChecked.push(storage.storageKey);
          localStorageInfo.hasAutosave = !!window.localStorage.getItem(storage.storageKey);
        }
      }
    } catch (_) {}
    return {
      schema: 'iso-room-floor-editor-diagnostic-log/v2',
      generatedAt: nowIso(),
      owner: OWNER,
      phase: PHASE,
      sessionId: sessionId,
      entry: cloneJson(window.__APP_ENTRY_INFO || null),
      location: {
        href: safeString(window.location && window.location.href || ''),
        userAgent: safeString(window.navigator && window.navigator.userAgent || ''),
        language: safeString(window.navigator && window.navigator.language || ''),
        devicePixelRatio: Number(window.devicePixelRatio) || 1
      },
      localStorage: localStorageInfo,
      counters: cloneJson(counters),
      latest: cloneJson(latest),
      editorStateSummary: summarizeState(editorState),
      editorState: cloneJson(editorState),
      recentEntries: cloneJson(entries),
      renderSnapshots: cloneJson(renderSnapshots),
      hitTests: cloneJson(hitTests),
      metaDraftEntries: cloneJson(metaDraftEntries),
      domSnapshots: cloneJson(domSnapshots),
      extras: cloneJson(extras || null)
    };
  }
  function downloadDiagnostic(editorState, extras) {
    var payload = buildDiagnostic(editorState, extras);
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    var fallbackName = 'floor-editor-diagnostic-log';
    var planName = editorState && editorState.floorPlan && editorState.floorPlan.meta && editorState.floorPlan.meta.name
      ? safeString(editorState.floorPlan.meta.name)
      : fallbackName;
    anchor.href = url;
    anchor.download = planName.replace(/\s+/g, '_').replace(/[^\w\-\u4e00-\u9fa5]/g, '') + '_diagnostic_log_v2.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    push('diagnostic-export', { filename: anchor.download, extraKeys: extras ? Object.keys(extras) : [] });
    return payload;
  }
  function summarize(label) {
    return {
      phase: PHASE,
      owner: OWNER,
      label: safeString(label || ''),
      sessionId: sessionId,
      entryCount: entries.length,
      renderSnapshotCount: renderSnapshots.length,
      hitTestCount: hitTests.length,
      capabilities: ['window-error-hook', 'console-error-hook', 'console-warn-hook', 'controller-event-log', 'render-cycle-log', 'hit-test-log', 'meta-draft-log', 'dom-snapshot-log', 'download-json-v2']
    };
  }

  hookWindowErrors();
  hookConsoleError();
  push('boot', { entry: cloneJson(window.__APP_ENTRY_INFO || null) });

  var api = {
    phase: PHASE,
    owner: OWNER,
    sessionId: sessionId,
    push: push,
    captureUiEvent: captureUiEvent,
    captureLifecycle: captureLifecycle,
    captureControllerEvent: captureControllerEvent,
    captureRenderCycle: captureRenderCycle,
    captureHitTest: captureHitTest,
    captureMetaDraft: captureMetaDraft,
    captureDomSnapshot: captureDomSnapshot,
    summarizeState: summarizeState,
    buildDiagnostic: buildDiagnostic,
    downloadDiagnostic: downloadDiagnostic,
    summarize: summarize,
    setLatest: recordLatest
  };

  window.__FLOOR_EDITOR_DIAGNOSTIC_LOG__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('logging.floorEditorDiagnosticLog', api, { owner: OWNER, phase: PHASE });
  }
})();
