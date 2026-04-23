(function () {
  var PHASE = 'P0';
  var PLAN = {
    currentPhase: 'P0',
    totalPhases: 10,
    roadmapDoc: '000_READ_THIS_FIRST_FOR_AI.md',
    detailedDoc: 'docs/PROJECT_REFACTOR_PHASE_PLAN.zh-CN.md'
  };
  var state = {
    createdAt: new Date().toISOString(),
    entry: null,
    manifestLogged: false,
    diagnosticsRunning: false,
    diagnosticsDone: false,
    moduleMarks: [],
    lastRuntimeSummary: null,
    lastBoundarySummary: null,
    lastDiagnosticsSummary: null
  };

  function safeJson(value) {
    try { return JSON.stringify(value); } catch (err) { return '"[unserializable]"'; }
  }

  function emit(kind, message, extra) {
    var line = '[' + PHASE + '][' + String(kind || 'BOOT') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      var suffix = safeJson(extra);
      if (suffix && suffix !== 'undefined') line += ' ' + suffix;
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (err) {
      try { if (typeof console !== 'undefined' && console.log) console.log(line); } catch (_) {}
    }
    return line;
  }

  function getAppRoot() {
    return (typeof window !== 'undefined' && window.App) ? window.App : null;
  }

  function getServiceRoot() {
    var app = getAppRoot();
    if (app && app.services && Object.keys(app.services).length) return app.services;
    return null;
  }

  function getStateRoot() {
    var app = getAppRoot();
    return (app && app.state) ? app.state : null;
  }

  function getShellRoot() {
    var app = getAppRoot();
    return (app && app.shell) ? app.shell : null;
  }

  function resolveEntryInfo() {
    var explicit = (typeof window !== 'undefined' && window.__APP_ENTRY_INFO_RESOLVED) ? window.__APP_ENTRY_INFO_RESOLVED : ((typeof window !== 'undefined' && window.__APP_ENTRY_INFO) ? window.__APP_ENTRY_INFO : null);
    var pathname = '';
    try { pathname = String((typeof location !== 'undefined' && location.pathname) || ''); } catch (_) { pathname = ''; }
    var file = pathname.split('/').pop() || 'unknown';
    var kind = explicit && explicit.kind ? String(explicit.kind) : (/START_V\d+_ONLY\.html$/i.test(file) ? 'editor' : (/index\.html$/i.test(file) ? 'main' : 'other'));
    return {
      kind: kind,
      label: explicit && explicit.label ? String(explicit.label) : (kind === 'main' ? '主程序' : (kind === 'editor' ? '编辑器' : '其它入口')),
      entryFile: explicit && explicit.entryFile ? String(explicit.entryFile) : file,
      launcherHint: explicit && explicit.launcherHint ? String(explicit.launcherHint) : (kind === 'editor' ? 'start_editor.bat' : 'start.bat'),
      build: explicit && explicit.build ? String(explicit.build) : '',
      href: (function () { try { return String((typeof location !== 'undefined' && location.href) || ''); } catch (_) { return ''; } })()
    };
  }

  function scriptManifest() {
    var list = [];
    try {
      var scripts = document && document.scripts ? document.scripts : [];
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i] && scripts[i].getAttribute ? (scripts[i].getAttribute('src') || '') : '';
        if (!src) continue;
        list.push(src);
      }
    } catch (_) {}
    return list;
  }

  function summarizeScriptManifest() {
    var manifest = scriptManifest();
    var srcScripts = manifest.length;
    var nonSrc = [];
    var rootScripts = manifest.filter(function (src) { return src.indexOf('src/') !== 0; });
    return {
      totalSrcScripts: srcScripts,
      rootLevelScripts: rootScripts,
      firstScripts: manifest.slice(0, 6),
      lastScripts: manifest.slice(-6),
      hasMainApp: manifest.indexOf('src/presentation/shell/app.js') >= 0,
      hasEditorApp: manifest.indexOf('src/presentation/editor/editor-unified-v18.js?v=20260320-v18-box-occlusion') >= 0 || manifest.indexOf('src/presentation/editor/editor-unified-v18.js') >= 0,
      inlineScriptCount: nonSrc.length
    };
  }

  function summarizeRuntime() {
    var app = getAppRoot();
    var selectors = app && app.state ? app.state.selectors : null;
    var runtimeSummary = selectors && typeof selectors.getRuntimeSummary === 'function' ? selectors.getRuntimeSummary() : null;
    var worldSummary = selectors && typeof selectors.getWorldSummary === 'function' ? selectors.getWorldSummary() : null;
    var sceneSummary = selectors && typeof selectors.getSceneSummary === 'function' ? selectors.getSceneSummary() : null;
    var lightingSummary = selectors && typeof selectors.getLightingSummary === 'function' ? selectors.getLightingSummary() : null;
    var summary = {
      entry: resolveEntryInfo(),
      hasCanvas: !!(typeof canvas !== 'undefined' && canvas),
      hasUi: !!(typeof ui !== 'undefined' && ui),
      uiKeyCount: (typeof ui !== 'undefined' && ui) ? Object.keys(ui).length : 0,
      serviceApis: (function () { var services = getServiceRoot(); return services ? Object.keys(services) : []; })(),
      modules: {
        appShellApi: !!(getShellRoot() && getShellRoot().appShell),
        runtimeStateApi: !!(getStateRoot() && getStateRoot().runtimeState),
        prefabRegistryApi: !!(getStateRoot() && getStateRoot().prefabRegistry),
        lightingStateApi: !!(getStateRoot() && getStateRoot().lightingState),
        domRegistryApi: !!(getShellRoot() && getShellRoot().domRegistry),
        selectorsApi: !!selectors
      },
      counts: {
        prototypes: sceneSummary && sceneSummary.prototypeCount != null ? sceneSummary.prototypeCount : (Array.isArray(typeof prototypes !== 'undefined' ? prototypes : null) ? prototypes.length : null),
        instances: sceneSummary && sceneSummary.instances != null ? sceneSummary.instances : (Array.isArray(typeof instances !== 'undefined' ? instances : null) ? instances.length : null),
        boxes: sceneSummary && sceneSummary.boxes != null ? sceneSummary.boxes : (Array.isArray(typeof boxes !== 'undefined' ? boxes : null) ? boxes.length : null),
        lights: lightingSummary && lightingSummary.lightCount != null ? lightingSummary.lightCount : (Array.isArray(typeof lights !== 'undefined' ? lights : null) ? lights.length : null)
      }
    };
    try {
      if (runtimeSummary) summary.editor = { mode: runtimeSummary.editorMode || null, prototypeIndex: selectors && typeof selectors.getSelectedPrototypeIndex === 'function' ? selectors.getSelectedPrototypeIndex() : (typeof editor !== 'undefined' && editor ? editor.prototypeIndex : null) };
      else if (typeof editor !== 'undefined' && editor) summary.editor = { mode: editor.mode || null, prototypeIndex: editor.prototypeIndex };
    } catch (_) {}
    try {
      if (worldSummary) summary.world = worldSummary;
      else if (typeof settings !== 'undefined' && settings) summary.world = { gridW: settings.gridW, gridH: settings.gridH, tileScale: settings.tileScale, displayScale: settings.worldDisplayScale };
    } catch (_) {}
    try {
      if (typeof state !== 'undefined' && state && typeof state.voxels !== 'undefined') {
        summary.editorState = { voxels: state.voxels && typeof state.voxels.size === 'number' ? state.voxels.size : null, currentLayer: state.currentLayer, tool: state.tool || null };
      }
    } catch (_) {}
    state.lastRuntimeSummary = summary;
    return summary;
  }

  function summarizeBoundaries() {
    var summary = {
      entry: resolveEntryInfo(),
      legacyRootScriptsReferenced: summarizeScriptManifest().rootLevelScripts,
      serviceOwners: {},
      hasInitializeMainApp: typeof initializeMainApp === 'function',
      hasBootstrapApplication: typeof bootstrapApplication === 'function',
      hasRenderLoop: typeof loop === 'function',
      hasEditorRerender: typeof rerender === 'function'
    };
    try {
      var services = getServiceRoot();
      if (services) {
        Object.keys(services).forEach(function (key) {
          var api = services[key] || {};
          summary.serviceOwners[key] = api.owner || 'unknown';
        });
      }
    } catch (_) {}
    state.lastBoundarySummary = summary;
    return summary;
  }

  function logEntry() {
    state.entry = resolveEntryInfo();
    emit('BOOT', 'entry-detected', {
      entry: state.entry,
      roadmapDoc: PLAN.roadmapDoc,
      detailedDoc: PLAN.detailedDoc,
      totalPhases: PLAN.totalPhases
    });
    return state.entry;
  }

  function logScriptManifestOnce(reason) {
    if (state.manifestLogged) return summarizeScriptManifest();
    state.manifestLogged = true;
    var manifest = summarizeScriptManifest();
    emit('BOOT', 'script-manifest ' + String(reason || 'window-load'), manifest);
    return manifest;
  }

  function logBoundarySummary(reason) {
    return emit('BOUNDARY', 'client-boundaries ' + String(reason || 'runtime'), summarizeBoundaries());
  }

  function logInvariantSummary(reason) {
    return emit('INVARIANT', 'runtime-counts ' + String(reason || 'runtime'), summarizeRuntime());
  }

  function markModule(name, extra) {
    var entry = {
      seq: state.moduleMarks.length + 1,
      name: String(name || 'unknown'),
      extra: typeof extra === 'undefined' ? null : extra,
      at: new Date().toISOString()
    };
    state.moduleMarks.push(entry);
    emit('BOUNDARY', 'module-mark', entry);
    return entry;
  }

  async function rawFetchJson(url) {
    var response = await fetch(url, { cache: 'no-store' });
    var text = await response.text();
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = null; }
    return { response: response, data: data, text: text };
  }

  async function runServiceDiagnostics(meta) {
    meta = meta || {};
    if (state.diagnosticsRunning) {
      emit('BOOT', 'service-diagnostics:skip', { reason: 'already-running', meta: meta });
      return state.lastDiagnosticsSummary;
    }
    state.diagnosticsRunning = true;
    emit('BOOT', 'service-diagnostics:start', { context: meta.context || 'unknown', entry: resolveEntryInfo() });
    var results = [];

    async function capture(name, runner, projector) {
      try {
        var outcome = await runner();
        var payload = projector ? projector(outcome) : outcome;
        var passed = !(payload && payload.ok === false) && !(payload && typeof payload.status === 'number' && payload.status >= 400);
        results.push({ name: name, ok: passed, payload: payload });
        emit(passed ? 'BOUNDARY' : 'INVARIANT', (passed ? 'service-response ' : 'service-response-failed ') + name, payload);
      } catch (err) {
        var payload = { error: String(err && err.message ? err.message : err) };
        results.push({ name: name, ok: false, payload: payload });
        emit('INVARIANT', 'service-response-failed ' + name, payload);
      }
    }

    await capture('health', function () {
      return rawFetchJson('/api/health?t=' + Date.now());
    }, function (outcome) {
      return {
        status: outcome.response.status,
        ok: !!(outcome.data && outcome.data.ok),
        routeCount: outcome.data && outcome.data.routeCount,
        role: outcome.data && outcome.data.role,
        root: outcome.data && outcome.data.root
      };
    });

    var services = getServiceRoot();
    if (services && services.sceneApi && typeof services.sceneApi.loadDefaultScene === 'function') {
      await capture('scene-default', function () { return services.sceneApi.loadDefaultScene({ requestId: 'p0-scene-default' }); }, function (outcome) {
        return {
          status: outcome.response.status,
          ok: !!(outcome.data && outcome.data.ok !== false),
          hasDefault: !!(outcome.data && outcome.data.hasDefault),
          file: outcome.data && outcome.data.file ? outcome.data.file : ''
        };
      });
    }

    services = getServiceRoot();
    if (services && services.prefabApi && typeof services.prefabApi.fetchIndex === 'function') {
      await capture('prefab-index', function () { return services.prefabApi.fetchIndex({ requestId: 'p0-prefab-index' }); }, function (outcome) {
        return {
          status: outcome.response.status,
          ok: !!(outcome.data && Array.isArray(outcome.data.items)),
          items: outcome.data && Array.isArray(outcome.data.items) ? outcome.data.items.length : null
        };
      });
    }

    services = getServiceRoot();
    if (services && services.habboApi) {
      if (typeof services.habboApi.fetchLibrarySummary === 'function') {
        await capture('habbo-library-summary', function () { return services.habboApi.fetchLibrarySummary({ requestId: 'p0-habbo-summary' }); }, function (outcome) {
          return {
            status: outcome.response.status,
            ok: !!(outcome.data && outcome.data.ok !== false),
            pending: !!(outcome.data && outcome.data.pending),
            totalItems: outcome.data && typeof outcome.data.totalItems === 'number' ? outcome.data.totalItems : null,
            configured: !!(outcome.data && outcome.data.configured),
            exists: !!(outcome.data && outcome.data.exists)
          };
        });
      }
      if (typeof services.habboApi.fetchLibraryPage === 'function') {
        await capture('habbo-library-page', function () { return services.habboApi.fetchLibraryPage('type=room&category=all&page=1&pageSize=1', { requestId: 'p0-habbo-page' }); }, function (outcome) {
          return {
            status: outcome.response.status,
            ok: !!(outcome.data && outcome.data.ok !== false),
            pending: !!(outcome.data && outcome.data.pending),
            total: outcome.data && typeof outcome.data.total === 'number' ? outcome.data.total : null,
            items: outcome.data && Array.isArray(outcome.data.items) ? outcome.data.items.length : null
          };
        });
      }
    }

    var summary = {
      context: meta.context || 'unknown',
      entry: resolveEntryInfo(),
      totalChecks: results.length,
      okChecks: results.filter(function (item) { return item.ok; }).length,
      failedChecks: results.filter(function (item) { return !item.ok; }).length,
      checks: results
    };
    state.lastDiagnosticsSummary = summary;
    state.diagnosticsRunning = false;
    state.diagnosticsDone = true;
    emit('SUMMARY', 'service-diagnostics:done', summary);
    return summary;
  }

  function emitWindowLoadSummary() {
    logEntry();
    logScriptManifestOnce('window-load');
    logBoundarySummary('window-load');
    logInvariantSummary('window-load');
  }

  if (typeof window !== 'undefined') {
    window.__PROJECT_REFACTOR_PLAN = PLAN;
  }
  window.__P0_LOGGER = {
    phase: PHASE,
    plan: PLAN,
    state: state,
    emit: emit,
    resolveEntryInfo: resolveEntryInfo,
    logEntry: logEntry,
    logScriptManifestOnce: logScriptManifestOnce,
    logBoundarySummary: logBoundarySummary,
    logInvariantSummary: logInvariantSummary,
    summarizeRuntime: summarizeRuntime,
    summarizeBoundaries: summarizeBoundaries,
    runServiceDiagnostics: runServiceDiagnostics,
    markModule: markModule
  };

  emit('BOOT', 'phase-plan-ready', PLAN);
  if (typeof window !== 'undefined') {
    window.addEventListener('load', function () { emitWindowLoadSummary(); }, { once: true });
    window.addEventListener('error', function (event) {
      emit('INVARIANT', 'window-error', {
        message: event && event.message ? event.message : 'unknown',
        source: event && event.filename ? event.filename : '',
        line: event && event.lineno ? event.lineno : 0,
        column: event && event.colno ? event.colno : 0
      });
    });
    window.addEventListener('unhandledrejection', function (event) {
      var reason = event && event.reason;
      emit('INVARIANT', 'window-unhandledrejection', {
        reason: reason && (reason.stack || reason.message) ? (reason.stack || reason.message) : String(reason)
      });
    });
  }
})();
