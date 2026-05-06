// P9c controller boundary owner extracted from app-controllers.js.
// Owns application controller namespace lookup, route audit, and controller-level boot logging.
(function (global) {
  if (!global) return;

  var OWNER = 'src/application/controllers/controller-boundary.js';
  var LEGACY_CONTROLLER_OWNER = 'src/application/controllers/app-controllers.js';
  var APP_BOUNDARY_PHASE = 'P9c-CONTROLLER-SHELL';
  var APP_BOUNDARY_MAX = 80;
  var appBoundaryAudit = {
    owner: OWNER,
    legacyOwner: LEGACY_CONTROLLER_OWNER,
    phase: APP_BOUNDARY_PHASE,
    counters: {
      stateActionHits: 0,
      prefabRegistryHits: 0,
      runtimeStateHits: 0,
      serviceWorkflowHits: 0,
      selectorHits: 0,
      legacyGlobalHits: 0,
      fallbackCount: 0
    },
    lastEvent: null,
    lastFallback: null,
    recentEvents: [],
    recentFallbacks: []
  };

  function emitP7(kind, message, extra) {
    var line = '[P7][' + String(kind || 'BOOT') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (err) {
      try { console.log(line); } catch (_) {}
    }
    return line;
  }

  function getNs() {
    return (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') ? global.__APP_NAMESPACE : null;
  }

  function appPath(path) {
    var ns = getNs();
    if (!ns || typeof ns.getPath !== 'function') return null;
    try { return ns.getPath(String(path || '')) || null; } catch (_) { return null; }
  }

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function pushAudit(bucket, entry) {
    bucket.push(entry);
    if (bucket.length > APP_BOUNDARY_MAX) bucket.splice(0, bucket.length - APP_BOUNDARY_MAX);
    return entry;
  }

  function recordAppBoundaryEvent(kind, route, detail) {
    var entry = {
      at: (function(){ try { return new Date().toISOString(); } catch (_) { return ''; } })(),
      kind: String(kind || ''),
      route: String(route || ''),
      detail: safeClone(detail || null)
    };
    if (kind === 'state-action') appBoundaryAudit.counters.stateActionHits += 1;
    else if (kind === 'prefab-registry') appBoundaryAudit.counters.prefabRegistryHits += 1;
    else if (kind === 'runtime-state') appBoundaryAudit.counters.runtimeStateHits += 1;
    else if (kind === 'service-workflow') appBoundaryAudit.counters.serviceWorkflowHits += 1;
    else if (kind === 'selector') appBoundaryAudit.counters.selectorHits += 1;
    else if (kind === 'legacy-global') appBoundaryAudit.counters.legacyGlobalHits += 1;
    appBoundaryAudit.lastEvent = entry;
    pushAudit(appBoundaryAudit.recentEvents, entry);
    return entry;
  }

  function recordAppBoundaryFallback(route, detail) {
    var entry = {
      at: (function(){ try { return new Date().toISOString(); } catch (_) { return ''; } })(),
      route: String(route || ''),
      detail: safeClone(detail || null)
    };
    appBoundaryAudit.counters.fallbackCount += 1;
    appBoundaryAudit.lastFallback = entry;
    pushAudit(appBoundaryAudit.recentFallbacks, entry);
    return entry;
  }

  function summarizeAppBoundary(label) {
    return {
      owner: OWNER,
      legacyOwner: LEGACY_CONTROLLER_OWNER,
      phase: APP_BOUNDARY_PHASE,
      label: String(label || ''),
      available: true,
      counters: safeClone(appBoundaryAudit.counters),
      lastEvent: safeClone(appBoundaryAudit.lastEvent),
      lastFallback: safeClone(appBoundaryAudit.lastFallback),
      recentEvents: appBoundaryAudit.recentEvents.slice(-8).map(safeClone),
      recentFallbacks: appBoundaryAudit.recentFallbacks.slice(-5).map(safeClone)
    };
  }

  function resetAppBoundary(meta) {
    appBoundaryAudit.counters.stateActionHits = 0;
    appBoundaryAudit.counters.prefabRegistryHits = 0;
    appBoundaryAudit.counters.runtimeStateHits = 0;
    appBoundaryAudit.counters.serviceWorkflowHits = 0;
    appBoundaryAudit.counters.selectorHits = 0;
    appBoundaryAudit.counters.legacyGlobalHits = 0;
    appBoundaryAudit.counters.fallbackCount = 0;
    appBoundaryAudit.lastEvent = null;
    appBoundaryAudit.lastFallback = null;
    appBoundaryAudit.recentEvents = [];
    appBoundaryAudit.recentFallbacks = [];
    recordAppBoundaryEvent('reset', 'application-boundary.reset', meta || { source: 'controller-boundary:reset' });
    return summarizeAppBoundary(meta && meta.label ? String(meta.label) : 'reset');
  }

  var api = {
    owner: OWNER,
    legacyOwner: LEGACY_CONTROLLER_OWNER,
    phase: APP_BOUNDARY_PHASE,
    emitP7: emitP7,
    getNs: getNs,
    appPath: appPath,
    safeClone: safeClone,
    recordAppBoundaryEvent: recordAppBoundaryEvent,
    recordAppBoundaryFallback: recordAppBoundaryFallback,
    summarizeAppBoundary: summarizeAppBoundary,
    resetAppBoundary: resetAppBoundary
  };

  global.__APP_CONTROLLER_BOUNDARY__ = api;
  try {
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('controllers.boundary', api, { owner: OWNER, phase: APP_BOUNDARY_PHASE, legacy: [LEGACY_CONTROLLER_OWNER] });
      global.__APP_NAMESPACE.bind('application.controllerBoundary', api, { owner: OWNER, phase: APP_BOUNDARY_PHASE, legacy: [LEGACY_CONTROLLER_OWNER] });
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
