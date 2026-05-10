// PXM-07.7C: Canvas2D shared optimization source consumption diagnostics.
// Layer: presentation/render/diagnostics.
//
// Logs the fact that Canvas2D draw paths now call the shared optimization
// source-consumption boundary. This is behavior-neutral diagnostics: it does
// not draw, mutate caches, change sorting, or change picking.
(function registerPixiMigrationCanvas2dSharedConsumptionDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-canvas2d-shared-consumption-diagnostics.js';
  var STEP = 'PXM-07.7C';
  var PHASE = 'canvas2d-shared-optimization-source-consumption';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';

  var state = {
    started: false,
    lastSignature: '',
    lastAt: 0,
    eventCount: 0,
    lastSnapshot: null
  };

  function nowMs() {
    try { return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }


  function shouldEmitViaThrottle(section, signature, intervalMs, options) {
    try {
      var throttle = global.__PIXI_MIGRATION_DIAGNOSTICS_THROTTLE__ || null;
      if (throttle && typeof throttle.shouldEmit === 'function') {
        return throttle.shouldEmit({
          step: STEP,
          section: section,
          bucket: options && options.bucket || '',
          signature: signature,
          intervalMs: intervalMs,
          critical: options && options.critical === true,
          stateChange: options && options.stateChange === true
        });
      }
    } catch (_) {}
    return true;
  }

  function formatValue(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.join(',') || 'none';
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch (_) { return '[object]'; }
    }
    return String(value).replace(/\s+/g, ' ');
  }

  function formatPayload(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var parts = [];
    Object.keys(payload).forEach(function (key) {
      var value = payload[key];
      if (value === undefined) return;
      parts.push(key + '=' + formatValue(value));
    });
    return parts.join(' ');
  }

  function emit(section, payload) {
    var line = PREFIX + '[' + String(section || 'event') + ']';
    var extra = formatPayload(payload);
    if (extra) line += ' ' + extra;
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
    return line;
  }

  function maybeEmitStart(reason) {
    if (state.started) return;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: PHASE,
      canvas2dCallsSharedOptimizationLayer: true,
      consumerMigration: 'shared-source-consumption-layer',
      legacyFallback: 'enabled',
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false,
      source: reason || 'module-load'
    });
  }

  function shouldEmitSnapshot(record, snapshot) {
    if (!snapshot) return false;
    // PXM-07.8D: light diagnostics intentionally ignores per-call id/stage
    // churn. Those fields changed many times per frame and made player
    // movement feel worse by flooding pushLog/logInfo. Keep state-change and
    // coarse summary evidence only.
    var signature = [
      snapshot.sourceCount,
      snapshot.consumedSourceCount,
      snapshot.unconsumedSourceCount,
      snapshot.blockedSourceCount,
      snapshot.consumedSources && snapshot.consumedSources.join(','),
      snapshot.unconsumedSources && snapshot.unconsumedSources.join(','),
      snapshot.blockedSources && snapshot.blockedSources.join(',')
    ].join('|');
    var current = nowMs();
    if (signature === state.lastSignature && (current - Number(state.lastAt || 0)) < 4000) return false;
    if (!shouldEmitViaThrottle('summary', signature, 4000, { bucket: 'canvas2d-shared-consumption' })) return false;
    state.lastSignature = signature;
    state.lastAt = current;
    return true;
  }

  function noteCanvas2dSharedConsumption(record, snapshot) {
    maybeEmitStart(record && record.caller || 'canvas2d-shared-consumption');
    state.eventCount += 1;
    state.lastSnapshot = snapshot || null;
    if (!record || !snapshot) return;
    if (!shouldEmitSnapshot(record, snapshot)) return;

    emit('source-consumed', {
      id: record.id,
      activeBackend: record.activeBackend,
      stage: record.stage,
      caller: record.caller,
      sharedSourceReady: !!record.sharedSourceReady,
      sharedSourceObserved: !!record.sharedSourceObserved,
      sharedSourceBlocked: !!record.sharedSourceBlocked,
      canvas2dConsumerNormalized: !!record.canvas2dConsumerNormalized,
      canvas2dConsumerPath: record.canvas2dConsumerPath,
      legacyFallback: 'enabled',
      fallbackUsed: !!record.fallbackUsed,
      drawBehaviorChanged: false,
      modifiesRendering: false,
      statsSummary: record.statsSummary || ''
    });

    emit('canvas2d-shared-consumer', {
      sourceCount: snapshot.sourceCount,
      consumedSourceCount: snapshot.consumedSourceCount,
      unconsumedSourceCount: snapshot.unconsumedSourceCount,
      blockedSourceCount: snapshot.blockedSourceCount,
      consumedSources: snapshot.consumedSources,
      unconsumedSources: snapshot.unconsumedSources,
      blockedSources: snapshot.blockedSources,
      canvas2dCallsSharedOptimizationLayer: true,
      consumerMigration: 'shared-source-consumption-layer',
      legacyFallback: 'enabled',
      drawBehaviorChanged: false,
      modifiesRendering: false
    });

    emit('safety', {
      legacyFallback: 'enabled',
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false,
      changesMapData: false,
      changesObjectData: false,
      orderHashUnchanged: snapshot.orderHashUnchanged || 'unknown-not-applicable'
    });

    emit('summary', {
      ok: true,
      sourceCount: snapshot.sourceCount,
      consumedSourceCount: snapshot.consumedSourceCount,
      unconsumedSourceCount: snapshot.unconsumedSourceCount,
      blockedSourceCount: snapshot.blockedSourceCount,
      canvas2dCallsSharedOptimizationLayer: true,
      consumerMigration: 'shared-source-consumption-layer',
      legacyFallback: 'enabled',
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false,
      source: record.caller || snapshot.source || 'canvas2d-shared-consumption',
      diagnosticsThrottle: 'light'
    });
  }

  function getLastConsumptionSnapshot() { return state.lastSnapshot || null; }

  var api = {
    owner: OWNER,
    step: STEP,
    phase: PHASE,
    noteCanvas2dSharedConsumption: noteCanvas2dSharedConsumption,
    getLastConsumptionSnapshot: getLastConsumptionSnapshot
  };

  try {
    global.__PIXI_MIGRATION_CANVAS2D_SHARED_CONSUMPTION_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationCanvas2dSharedConsumption', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.diagnostics = global.App.renderer.diagnostics || {};
      global.App.renderer.diagnostics.pixiMigrationCanvas2dSharedConsumption = api;
    }
  } catch (_) {
    global.__PIXI_MIGRATION_CANVAS2D_SHARED_CONSUMPTION_DIAGNOSTICS__ = api;
  }

  maybeEmitStart('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
