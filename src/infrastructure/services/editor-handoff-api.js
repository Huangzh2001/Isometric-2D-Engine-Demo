(function () {
  var OWNER = 'src/infrastructure/services/editor-handoff-api.js';
  var HANDOFF_KEY = 'isometric-editor-main-handoff-v1';
  var counters = { readCalls: 0, clearCalls: 0, writeCalls: 0, errors: 0 };
  var lastEvent = null;
  var recentEvents = [];

  function serviceLog(name, detail) {
    var suffix = detail ? (' ' + String(detail)) : '';
    try { pushLog('[service:editor-handoff] ' + String(name) + suffix); } catch (_) {}
  }

  function remember(kind, detail) {
    var entry = {
      at: new Date().toISOString(),
      kind: String(kind || ''),
      detail: detail || null
    };
    lastEvent = entry;
    recentEvents.push(entry);
    if (recentEvents.length > 12) recentEvents.shift();
    return entry;
  }

  function safeParse(raw) {
    if (!raw) return null;
    return JSON.parse(raw);
  }

  function readHandoff(options) {
    options = options || {};
    counters.readCalls += 1;
    try {
      var raw = localStorage.getItem(HANDOFF_KEY);
      var parsed = safeParse(raw);
      serviceLog('read', 'source=' + String(options.source || 'unknown') + ' hasValue=' + (!!parsed));
      remember('read', { source: String(options.source || 'unknown'), hasValue: !!parsed });
      return parsed;
    } catch (err) {
      counters.errors += 1;
      serviceLog('read:error', 'source=' + String(options.source || 'unknown') + ' error=' + String(err && err.message ? err.message : err));
      remember('read:error', { source: String(options.source || 'unknown'), error: String(err && err.message ? err.message : err) });
      return null;
    }
  }

  function clearHandoff(options) {
    options = options || {};
    counters.clearCalls += 1;
    try {
      localStorage.removeItem(HANDOFF_KEY);
      serviceLog('clear', 'source=' + String(options.source || 'unknown'));
      remember('clear', { source: String(options.source || 'unknown') });
      return true;
    } catch (err) {
      counters.errors += 1;
      serviceLog('clear:error', 'source=' + String(options.source || 'unknown') + ' error=' + String(err && err.message ? err.message : err));
      remember('clear:error', { source: String(options.source || 'unknown'), error: String(err && err.message ? err.message : err) });
      return false;
    }
  }

  function writeHandoff(payload, options) {
    options = options || {};
    counters.writeCalls += 1;
    try {
      localStorage.setItem(HANDOFF_KEY, JSON.stringify(payload || null));
      serviceLog('write', 'source=' + String(options.source || 'unknown') + ' hasValue=' + (!!payload));
      remember('write', { source: String(options.source || 'unknown'), hasValue: !!payload });
      return true;
    } catch (err) {
      counters.errors += 1;
      serviceLog('write:error', 'source=' + String(options.source || 'unknown') + ' error=' + String(err && err.message ? err.message : err));
      remember('write:error', { source: String(options.source || 'unknown'), error: String(err && err.message ? err.message : err) });
      return false;
    }
  }

  function summarize(label) {
    return {
      owner: OWNER,
      label: String(label || ''),
      counters: {
        readCalls: counters.readCalls,
        clearCalls: counters.clearCalls,
        writeCalls: counters.writeCalls,
        errors: counters.errors
      },
      lastEvent: lastEvent,
      recentEvents: recentEvents.slice()
    };
  }

  var api = {
    owner: OWNER,
    readHandoff: readHandoff,
    clearHandoff: clearHandoff,
    writeHandoff: writeHandoff,
    summarize: summarize
  };

  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('services.editorHandoff', api, { owner: OWNER, legacy: [], phase: 'P14' });
  }
  if (typeof logCompatMapping === 'function') logCompatMapping('editor-handoff-api', OWNER);
})();
