// PXM-07.8D: Migration diagnostics throttle / light mode.
// Layer: presentation/render/diagnostics.
//
// Provides a tiny shared throttle gate for migration diagnostics. It only
// reduces logging pressure; it does not render, mutate scene data, change
// sorting, change picking, or alter Canvas2D/PixiJS behavior.
(function registerPixiMigrationDiagnosticsThrottle(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-diagnostics-throttle.js';
  var STEP = 'PXM-07.8D';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var DEFAULT_MODE = 'light';
  var state = {
    started: false,
    gates: Object.create(null),
    suppressed: Object.create(null)
  };

  function nowMs() {
    try { return global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }

  function getMode() {
    try {
      var stored = global.localStorage && global.localStorage.getItem('pixiMigrationDiagnosticsMode');
      if (stored === 'verbose' || stored === 'light' || stored === 'silent') return stored;
    } catch (_) {}
    return DEFAULT_MODE;
  }

  function stringifyValue(value) {
    if (value == null) return String(value);
    if (Array.isArray(value)) return value.join(',') || 'none';
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    try { return JSON.stringify(value); } catch (_) { return '[object]'; }
  }

  function emit(section, payload) {
    var line = PREFIX + '[' + String(section || 'event') + ']';
    if (payload && typeof payload === 'object') {
      var parts = Object.keys(payload).map(function (key) { return String(key) + '=' + stringifyValue(payload[key]); });
      if (parts.length) line += ' ' + parts.join(' ');
    }
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function maybeStart(reason) {
    if (state.started) return;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: 'migration-diagnostics-throttle-light-mode',
      diagnosticsMode: getMode(),
      throttlesOnly: true,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false,
      source: reason || 'module-load'
    });
  }

  function getIntervalMs(section, requestedMs, options) {
    var mode = getMode();
    if (mode === 'verbose') return Number(requestedMs || 0);
    if (mode === 'silent') return Infinity;
    options = options || {};
    if (options.critical === true || options.stateChange === true) return Number(requestedMs || 0);
    var base = Number(requestedMs || 0);
    var s = String(section || 'event');
    if (s === 'summary') return Math.max(base, 4000);
    if (s === 'safety' || s === 'fallback') return Math.max(base, 4000);
    if (s.indexOf('source') >= 0 || s.indexOf('cache') >= 0 || s.indexOf('texture') >= 0) return Math.max(base, 5000);
    return Math.max(base, 5000);
  }

  function shouldEmit(args) {
    maybeStart('shouldEmit');
    args = args || {};
    var mode = getMode();
    var key = [String(args.step || 'unknown'), String(args.section || 'event'), String(args.bucket || '')].join('|');
    var signature = String(args.signature || '');
    if (mode === 'verbose') {
      state.gates[key] = { signature: signature, at: nowMs() };
      return true;
    }
    if (mode === 'silent' && args.critical !== true) {
      state.suppressed[key] = (state.suppressed[key] || 0) + 1;
      return false;
    }
    var interval = getIntervalMs(args.section, args.intervalMs, args);
    var current = nowMs();
    var last = state.gates[key] || { signature: '', at: 0 };
    var signatureChanged = signature !== last.signature;
    var intervalPassed = (current - Number(last.at || 0)) >= interval;
    if (args.critical === true || signatureChanged || intervalPassed) {
      state.gates[key] = { signature: signature, at: current };
      return true;
    }
    state.suppressed[key] = (state.suppressed[key] || 0) + 1;
    return false;
  }

  function getSummary() {
    var keys = Object.keys(state.suppressed);
    var total = keys.reduce(function (sum, key) { return sum + Number(state.suppressed[key] || 0); }, 0);
    return {
      owner: OWNER,
      step: STEP,
      diagnosticsMode: getMode(),
      suppressedEventCount: total,
      suppressedBucketCount: keys.length,
      throttlesOnly: true,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false
    };
  }

  var api = {
    owner: OWNER,
    step: STEP,
    getMode: getMode,
    shouldEmit: shouldEmit,
    getSummary: getSummary
  };

  try {
    global.__PIXI_MIGRATION_DIAGNOSTICS_THROTTLE__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationThrottle', api, { owner: OWNER, step: STEP });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.diagnostics = global.App.renderer.diagnostics || {};
      global.App.renderer.diagnostics.pixiMigrationThrottle = api;
    }
  } catch (_) {
    global.__PIXI_MIGRATION_DIAGNOSTICS_THROTTLE__ = api;
  }

  maybeStart('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
