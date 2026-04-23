(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/infrastructure/audit/runtime-route-audit.js';
  var PHASE = 'P13-RUNTIME';
  var audit = {
    counters: {
      ownerApiHits: 0,
      legacyBridgeHits: 0,
      directGlobalHits: 0,
      fallbackCount: 0
    },
    lastEvent: null,
    lastFallback: null,
    recentEvents: []
  };

  function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (_) { return v; } }
  function pushEvent(kind, route, detail) {
    var event = { at: new Date().toISOString(), kind: String(kind || ''), route: String(route || ''), detail: clone(detail || {}) };
    audit.lastEvent = event;
    audit.recentEvents.push(event);
    if (audit.recentEvents.length > 12) audit.recentEvents.shift();
    return event;
  }
  function record(kind, route, detail) {
    var k = String(kind || '');
    if (k === 'owner-api') audit.counters.ownerApiHits += 1;
    else if (k === 'legacy-bridge') audit.counters.legacyBridgeHits += 1;
    else if (k === 'direct-global') audit.counters.directGlobalHits += 1;
    else if (k === 'fallback') {
      audit.counters.fallbackCount += 1;
      audit.lastFallback = { at: new Date().toISOString(), route: String(route || ''), detail: clone(detail || {}) };
    }
    return pushEvent(k, route, detail);
  }
  function summarize(label) {
    return {
      phase: PHASE,
      owner: OWNER,
      counters: clone(audit.counters),
      lastEvent: clone(audit.lastEvent),
      lastFallback: clone(audit.lastFallback),
      recentEvents: clone(audit.recentEvents),
      label: String(label || ''),
      available: true
    };
  }
  function resetAudit(meta) {
    audit.counters.ownerApiHits = 0;
    audit.counters.legacyBridgeHits = 0;
    audit.counters.directGlobalHits = 0;
    audit.counters.fallbackCount = 0;
    audit.lastEvent = null;
    audit.lastFallback = null;
    audit.recentEvents = [];
    if (meta && meta.source) pushEvent('reset', 'runtime-routes.reset', { source: String(meta.source) });
    return summarize(meta && meta.label ? String(meta.label) : '');
  }
  var api = { owner: OWNER, phase: PHASE, record: record, summarize: summarize, resetAudit: resetAudit };
  window.__RUNTIME_ROUTE_AUDIT__ = api;
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('audit.runtimeRoutes', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
})();
