// PXM-07.12A: PixiJS interleaved framePlan renderer skeleton diagnostics.
// Layer: presentation/render/diagnostics.
(function registerPixiMigrationPixiInterleavedFramePlanSkeletonDiagnostics(global) {
  if (!global) return;

  var STEP = 'PXM-07.12A';
  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-interleaved-frameplan-skeleton-diagnostics.js';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var started = false;
  var lastSignatureBySection = Object.create(null);
  var lastEmitAtBySection = Object.create(null);

  function nowMs() {
    try { return global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }

  function stringify(value) {
    if (value == null) return String(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }

  function format(payload) {
    payload = payload || {};
    return Object.keys(payload).map(function (key) {
      return key + '=' + stringify(payload[key]);
    }).join(' ');
  }

  function push(line) {
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function getThrottle() {
    try { return global.__PIXI_MIGRATION_DIAGNOSTICS_THROTTLE__ || null; } catch (_) {}
    return null;
  }

  function shouldEmit(section, signature, intervalMs) {
    var throttle = getThrottle();
    try {
      if (throttle && typeof throttle.shouldEmit === 'function') {
        return throttle.shouldEmit(STEP + ':' + section, signature, intervalMs || 1200);
      }
    } catch (_) {}
    var at = nowMs();
    var key = String(section || 'event');
    if (lastSignatureBySection[key] !== signature || at - Number(lastEmitAtBySection[key] || 0) >= (intervalMs || 1200)) {
      lastSignatureBySection[key] = signature;
      lastEmitAtBySection[key] = at;
      return true;
    }
    return false;
  }

  function emit(section, payload, options) {
    payload = Object.assign({}, payload || {});
    payload.source = payload.source || (options && options.source) || 'pixi-interleaved-frameplan-skeleton';
    var signature = payload.signature || [
      section,
      payload.framePlanId || '',
      payload.orderCount || '',
      payload.supportedCandidateCount || '',
      payload.staticRunSegmentCount || '',
      payload.visualAdoption || '',
      payload.canvas2dSkip || '',
      payload.activeBackend || ''
    ].join('|');
    if (options && options.force !== true && !shouldEmit(section, signature, options && options.intervalMs || 1200)) return payload;
    delete payload.signature;
    push(PREFIX + '[' + section + '] ' + format(payload));
    return payload;
  }

  function maybeStart(source) {
    if (started) return;
    started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: 'pixi-interleaved-frameplan-renderer-skeleton',
      readsFramePlanOrder: true,
      visualAdoption: false,
      modifiesRendering: false,
      changesDepthSort: false,
      changesPicking: false,
      source: source || 'module-load'
    }, { force: true });
  }

  function noteInterleavedFramePlan(payload, options) {
    maybeStart(payload && payload.source || 'note-frame-plan');
    return emit('frameplan-order', payload || {}, options || {});
  }

  function noteInterleavedRenderPlan(payload, options) {
    maybeStart(payload && payload.source || 'note-render-plan');
    return emit('render-plan', payload || {}, options || {});
  }

  function noteInterleavedOwnership(payload, options) {
    maybeStart(payload && payload.source || 'note-ownership');
    return emit('ownership', payload || {}, options || {});
  }

  function noteInterleavedSummary(payload, options) {
    maybeStart(payload && payload.source || 'note-summary');
    return emit('summary', Object.assign({ ok: true }, payload || {}), options || {});
  }

  var api = {
    step: STEP,
    owner: OWNER,
    noteInterleavedFramePlan: noteInterleavedFramePlan,
    noteInterleavedRenderPlan: noteInterleavedRenderPlan,
    noteInterleavedOwnership: noteInterleavedOwnership,
    noteInterleavedSummary: noteInterleavedSummary
  };

  maybeStart('module-load');
  global.__PIXI_MIGRATION_PIXI_INTERLEAVED_FRAMEPLAN_SKELETON_DIAGNOSTICS__ = api;
  try {
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiInterleavedFramePlanSkeleton', api, { owner: OWNER, phase: STEP });
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : globalThis);
