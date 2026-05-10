// PXM-07.7B: Canvas2D consumer normalization diagnostics.
// Layer: presentation/render/diagnostics.
//
// This module logs whether Canvas2D consumers can read the shared optimization
// source layer through an adapter. It does not render, mutate caches, replace
// Canvas2D consumers, change framePlan.order, or change PixiJS behavior.
(function registerPixiMigrationCanvas2dConsumerNormalizationDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-canvas2d-consumer-normalization-diagnostics.js';
  var STEP = 'PXM-07.7B';
  var PHASE = 'canvas2d-consumer-normalization-adapter-only';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';

  var state = {
    started: false,
    lastSignature: '',
    lastAt: 0,
    lastSnapshot: null
  };

  function nowMs() {
    try { return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
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

  function getAdapter() {
    return global.__SHARED_RENDER_OPTIMIZATION_CANVAS2D_CONSUMER_ADAPTER__ || null;
  }

  function maybeEmitStart(reason) {
    if (state.started) return;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: PHASE,
      canvas2dConsumerNormalization: true,
      consumerMigration: 'adapter-only',
      legacyFallback: 'enabled',
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      source: reason || 'module-load'
    });
  }

  function shouldEmit(snapshot) {
    if (!snapshot) return false;
    var signature = [
      snapshot.activeBackend,
      snapshot.sourceCount,
      snapshot.normalizedConsumers && snapshot.normalizedConsumers.join(','),
      snapshot.fallbackConsumers && snapshot.fallbackConsumers.join(','),
      snapshot.blockedConsumers && snapshot.blockedConsumers.join(',')
    ].join('|');
    var current = nowMs();
    if (signature === state.lastSignature && (current - Number(state.lastAt || 0)) < 2500) return false;
    state.lastSignature = signature;
    state.lastAt = current;
    return true;
  }

  function emitConsumerSnapshot(snapshot, meta) {
    maybeEmitStart(meta && meta.source || 'canvas2d-consumer-normalization');
    if (!snapshot) return;
    state.lastSnapshot = snapshot;
    if (!shouldEmit(snapshot)) return;

    emit('canvas2d-consumer', {
      activeBackend: snapshot.activeBackend,
      canvas2dConsumerNormalization: true,
      consumerMigration: 'adapter-only',
      sourceCount: snapshot.sourceCount,
      adapterReadableCount: snapshot.adapterReadableCount,
      normalizedConsumerCount: snapshot.normalizedConsumerCount,
      fallbackConsumerCount: snapshot.fallbackConsumerCount,
      blockedConsumerCount: snapshot.blockedConsumerCount,
      criticalFallbackCount: snapshot.criticalFallbackCount,
      legacyFallback: 'enabled',
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      source: meta && meta.source || snapshot.source || 'canvas2d-consumer-normalization'
    });

    (snapshot.sources || []).forEach(function (row) {
      emit('consumer-source', {
        id: row.id,
        activeBackend: snapshot.activeBackend,
        sharedSourceReady: !!row.sharedSourceReady,
        sharedSourceObserved: !!row.sharedSourceObserved,
        sharedSourcePartial: !!row.sharedSourcePartial,
        sharedSourceBlocked: !!row.sharedSourceBlocked,
        adapterReadable: !!row.adapterReadable,
        canvas2dConsumerNormalized: !!row.canvas2dConsumerNormalized,
        canvas2dConsumerStatus: row.canvas2dConsumerStatus,
        canvas2dConsumerPath: row.canvas2dConsumerPath,
        currentConsumer: row.currentConsumer,
        legacyFallback: 'enabled',
        fallbackReason: row.fallbackReason || '',
        drawBehaviorChanged: false,
        modifiesRendering: false,
        statsSummary: row.statsSummary || ''
      });
    });

    emit('fallback', {
      activeBackend: snapshot.activeBackend,
      legacyFallback: 'enabled',
      fallbackConsumers: snapshot.fallbackConsumers,
      criticalFallbackConsumers: snapshot.criticalFallbackConsumers,
      blockedConsumers: snapshot.blockedConsumers,
      fallbackPolicy: 'legacy-canvas2d-path-preserved-if-shared-source-missing',
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false
    });

    emit('summary', {
      ok: true,
      activeBackend: snapshot.activeBackend,
      canvas2dConsumerNormalization: true,
      consumerMigration: 'adapter-only',
      sourceCount: snapshot.sourceCount,
      normalizedConsumerCount: snapshot.normalizedConsumerCount,
      fallbackConsumerCount: snapshot.fallbackConsumerCount,
      criticalFallbackCount: snapshot.criticalFallbackCount,
      legacyFallback: 'enabled',
      orderHashUnchanged: snapshot.orderHashUnchanged,
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false,
      changesMapData: false,
      changesObjectData: false,
      source: meta && meta.source || snapshot.source || 'canvas2d-consumer-normalization'
    });
  }

  function noteSharedSourceSnapshot(sharedSnapshot, meta) {
    maybeEmitStart(meta && meta.source || 'shared-source-snapshot');
    var adapter = getAdapter();
    if (!adapter || typeof adapter.buildCanvas2dConsumerSnapshot !== 'function') {
      emit('summary', {
        ok: false,
        reason: 'missing-canvas2d-consumer-adapter-api',
        canvas2dConsumerNormalization: false,
        consumerMigration: 'none',
        legacyFallback: 'enabled',
        drawBehaviorChanged: false,
        modifiesRendering: false,
        canvas2dBehaviorChanged: false,
        pixiBehaviorChanged: false
      });
      return;
    }
    var snapshot = adapter.buildCanvas2dConsumerSnapshot(sharedSnapshot || {}, {
      source: meta && meta.source || 'shared-source-snapshot',
      orderHashUnchanged: 'unknown-not-applicable'
    });
    emitConsumerSnapshot(snapshot, meta || { source: 'shared-source-snapshot' });
  }

  function getLastCanvas2dConsumerSnapshot() {
    return state.lastSnapshot || null;
  }

  var api = {
    owner: OWNER,
    step: STEP,
    phase: PHASE,
    noteSharedSourceSnapshot: noteSharedSourceSnapshot,
    emitConsumerSnapshot: emitConsumerSnapshot,
    getLastCanvas2dConsumerSnapshot: getLastCanvas2dConsumerSnapshot
  };

  try {
    global.__PIXI_MIGRATION_CANVAS2D_CONSUMER_NORMALIZATION_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationCanvas2dConsumerNormalization', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.diagnostics = global.App.renderer.diagnostics || {};
      global.App.renderer.diagnostics.pixiMigrationCanvas2dConsumerNormalization = api;
    }
  } catch (_) {
    global.__PIXI_MIGRATION_CANVAS2D_CONSUMER_NORMALIZATION_DIAGNOSTICS__ = api;
  }

  maybeEmitStart('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
