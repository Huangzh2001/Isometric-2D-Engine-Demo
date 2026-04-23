(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/infrastructure/audit/placement-route-audit.js';
  var PHASE = 'P8-S3';
  var MAX_HISTORY = 120;
  var audit = {
    phase: PHASE,
    owner: OWNER,
    events: [],
    counters: {
      controllerCalls: 0,
      controllerStateActionHits: 0,
      controllerUiAdapterHits: 0,
      controllerLegacyFallbacks: 0,
      controllerUiFallbacks: 0,
      controllerMissingRoutes: 0,
      coreEvents: 0,
      coreNewPathHits: 0,
      coreLegacyFallbacks: 0,
      coreUiSyncHits: 0,
      coreUiSyncFallbacks: 0
    },
    lastEvent: null,
    lastFallback: null
  };

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function nowIso() {
    try { return new Date().toISOString(); } catch (_) { return ''; }
  }

  function log(message, extra) {
    var line = '[PLACEMENT-ROUTES] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function pushEvent(kind, action, route, detail) {
    var entry = {
      at: nowIso(),
      kind: String(kind || ''),
      action: String(action || ''),
      route: String(route || ''),
      detail: safeClone(detail || null)
    };
    audit.events.push(entry);
    if (audit.events.length > MAX_HISTORY) audit.events.splice(0, audit.events.length - MAX_HISTORY);
    audit.lastEvent = entry;
    return entry;
  }

  function classifyController(route, detail) {
    var value = String(route || '');
    audit.counters.controllerCalls += 1;
    if (value.indexOf('state-actions.') === 0) audit.counters.controllerStateActionHits += 1;
    else if (value.indexOf('placement.effects.') === 0) audit.counters.controllerUiAdapterHits += 1;
    else if (value.indexOf('legacy.') === 0) {
      audit.counters.controllerLegacyFallbacks += 1;
      audit.lastFallback = { at: nowIso(), kind: 'controller', route: value, detail: safeClone(detail || null) };
    } else if (value.indexOf('ui-fallback.') === 0) {
      audit.counters.controllerUiFallbacks += 1;
      audit.lastFallback = { at: nowIso(), kind: 'controller-ui', route: value, detail: safeClone(detail || null) };
    } else if (value.indexOf('missing-') >= 0) {
      audit.counters.controllerMissingRoutes += 1;
      audit.lastFallback = { at: nowIso(), kind: 'controller-missing', route: value, detail: safeClone(detail || null) };
    }
  }

  function classifyCore(event, detail) {
    var value = String(event || '');
    audit.counters.coreEvents += 1;
    if (value.indexOf('new-path-hit') >= 0) audit.counters.coreNewPathHits += 1;
    if (value.indexOf('legacy-fallback') >= 0) {
      audit.counters.coreLegacyFallbacks += 1;
      audit.lastFallback = { at: nowIso(), kind: 'core', route: value, detail: safeClone(detail || null) };
    }
    if (value.indexOf('ui-sync-new-path-hit') >= 0) audit.counters.coreUiSyncHits += 1;
    if (value.indexOf('ui-sync-legacy-fallback') >= 0) {
      audit.counters.coreUiSyncFallbacks += 1;
      audit.lastFallback = { at: nowIso(), kind: 'core-ui', route: value, detail: safeClone(detail || null) };
    }
  }

  function recordControllerRoute(action, route, detail) {
    classifyController(route, detail);
    var entry = pushEvent('controller', action, route, detail);
    return safeClone(entry);
  }

  function recordCoreRoute(event, detail) {
    classifyCore(event, detail);
    var entry = pushEvent('core', event, event, detail);
    return safeClone(entry);
  }

  function summarize(label) {
    return {
      phase: PHASE,
      owner: OWNER,
      counters: safeClone(audit.counters),
      lastEvent: safeClone(audit.lastEvent),
      lastFallback: safeClone(audit.lastFallback),
      recentEvents: audit.events.slice(-10).map(safeClone),
      label: String(label || ''),
      available: true
    };
  }

  function resetAudit(meta) {
    audit.events = [];
    audit.counters.controllerCalls = 0;
    audit.counters.controllerStateActionHits = 0;
    audit.counters.controllerUiAdapterHits = 0;
    audit.counters.controllerLegacyFallbacks = 0;
    audit.counters.controllerUiFallbacks = 0;
    audit.counters.controllerMissingRoutes = 0;
    audit.counters.coreEvents = 0;
    audit.counters.coreNewPathHits = 0;
    audit.counters.coreLegacyFallbacks = 0;
    audit.counters.coreUiSyncHits = 0;
    audit.counters.coreUiSyncFallbacks = 0;
    audit.lastEvent = null;
    audit.lastFallback = null;
    log('audit-reset', { source: meta && meta.source ? String(meta.source) : 'unknown' });
    return summarize();
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    recordControllerRoute: recordControllerRoute,
    recordCoreRoute: recordCoreRoute,
    summarize: summarize,
    resetAudit: resetAudit
  };

  try {
    window.__PLACEMENT_ROUTE_AUDIT__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('placement.routeAudit', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}

  log('bound', { phase: PHASE, owner: OWNER });
})();
