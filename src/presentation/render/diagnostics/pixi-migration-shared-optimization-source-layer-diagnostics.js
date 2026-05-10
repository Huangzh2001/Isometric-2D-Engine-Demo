// PXM-07.7A: Shared optimization source layer diagnostics.
// Layer: presentation/render/diagnostics.
//
// This module logs read-only shared optimization source snapshots. It does not
// render, mutate caches, migrate consumers, select backends, change dirty flags,
// or alter Canvas2D/PixiJS behavior.
(function registerPixiMigrationSharedOptimizationSourceLayerDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-shared-optimization-source-layer-diagnostics.js';
  var STEP = 'PXM-07.7A';
  var PHASE = 'shared-optimization-source-layer-readonly';
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

  function getSourceLayerApi() {
    return global.__SHARED_RENDER_OPTIMIZATION_SOURCE_LAYER__ || null;
  }

  function maybeEmitStart(reason) {
    if (state.started) return;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: PHASE,
      sharedSourceLayerMode: 'readonly-snapshot',
      consumerMigration: false,
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
      snapshot.readySources && snapshot.readySources.join(','),
      snapshot.partialSources && snapshot.partialSources.join(','),
      snapshot.blockedSources && snapshot.blockedSources.join(','),
      snapshot.missingSources && snapshot.missingSources.join(',')
    ].join('|');
    var current = nowMs();
    if (signature === state.lastSignature && (current - Number(state.lastAt || 0)) < 2500) return false;
    state.lastSignature = signature;
    state.lastAt = current;
    return true;
  }

  function emitSourceLayerSnapshot(snapshot, meta) {
    maybeEmitStart(meta && meta.source || 'shared-source-layer');
    if (!snapshot) return;
    state.lastSnapshot = snapshot;
    if (!shouldEmit(snapshot)) return;

    emit('source-layer', {
      activeBackend: snapshot.activeBackend,
      sharedSourceLayerMode: snapshot.sharedSourceLayerMode || 'readonly-snapshot',
      sourceCount: snapshot.sourceCount,
      observedCount: snapshot.observedCount,
      readyCount: snapshot.readyCount,
      partialCount: snapshot.partialCount,
      conditionalCount: snapshot.conditionalCount,
      missingCount: snapshot.missingCount,
      blockedCount: snapshot.blockedCount,
      consumerMigration: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      source: meta && meta.source || snapshot.source || 'shared-source-layer'
    });

    (snapshot.sources || []).forEach(function (row) {
      emit('shared-source', {
        id: row.id,
        activeBackend: snapshot.activeBackend,
        ready: !!row.ready,
        observed: !!row.observed,
        partial: !!row.partial,
        conditional: !!row.conditional,
        blocked: !!row.blocked,
        sourceStatus: row.sourceStatus,
        currentConsumer: row.currentConsumer,
        canvas2dConsumerStatus: row.canvas2dConsumerStatus,
        pixiConsumerStatus: row.pixiConsumerStatus,
        consumerMigration: false,
        modifiesRendering: false,
        runtimeDetail: row.runtimeDetail
      });
    });

    emit('source-readiness', {
      activeBackend: snapshot.activeBackend,
      readySources: snapshot.readySources,
      partialSources: snapshot.partialSources,
      missingSources: snapshot.missingSources,
      blockedSources: snapshot.blockedSources,
      consumerMigration: false,
      sharedSourceLayerMode: snapshot.sharedSourceLayerMode || 'readonly-snapshot'
    });

    emit('summary', {
      ok: true,
      activeBackend: snapshot.activeBackend,
      sourceCount: snapshot.sourceCount,
      readyCount: snapshot.readyCount,
      partialCount: snapshot.partialCount,
      missingCount: snapshot.missingCount,
      blockedCount: snapshot.blockedCount,
      sharedSourceLayerMode: snapshot.sharedSourceLayerMode || 'readonly-snapshot',
      consumerMigration: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      source: meta && meta.source || snapshot.source || 'shared-source-layer'
    });

    try {
      var canvas2dConsumerDiagnostics = global.__PIXI_MIGRATION_CANVAS2D_CONSUMER_NORMALIZATION_DIAGNOSTICS__ || null;
      if (canvas2dConsumerDiagnostics && typeof canvas2dConsumerDiagnostics.noteSharedSourceSnapshot === 'function') {
        canvas2dConsumerDiagnostics.noteSharedSourceSnapshot(snapshot, {
          source: meta && meta.source || snapshot.source || 'shared-source-layer'
        });
      }
    } catch (_) {}
  }

  function noteOptimizationAuditSnapshot(auditSnapshot, meta) {
    maybeEmitStart(meta && meta.source || 'optimization-audit-snapshot');
    var api = getSourceLayerApi();
    if (!api || typeof api.buildSharedSourceSnapshot !== 'function') {
      emit('summary', {
        ok: false,
        reason: 'missing-shared-source-layer-api',
        consumerMigration: false,
        modifiesRendering: false,
        canvas2dBehaviorChanged: false,
        pixiBehaviorChanged: false
      });
      return;
    }
    var snapshot = api.buildSharedSourceSnapshot(auditSnapshot || {}, { source: meta && meta.source || 'optimization-audit-snapshot' });
    emitSourceLayerSnapshot(snapshot, meta || { source: 'optimization-audit-snapshot' });
  }

  function getLastSharedSourceSnapshot() {
    return state.lastSnapshot || null;
  }

  var api = {
    owner: OWNER,
    step: STEP,
    phase: PHASE,
    noteOptimizationAuditSnapshot: noteOptimizationAuditSnapshot,
    emitSourceLayerSnapshot: emitSourceLayerSnapshot,
    getLastSharedSourceSnapshot: getLastSharedSourceSnapshot
  };

  try {
    global.__PIXI_MIGRATION_SHARED_OPTIMIZATION_SOURCE_LAYER_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationSharedOptimizationSourceLayer', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.diagnostics = global.App.renderer.diagnostics || {};
      global.App.renderer.diagnostics.pixiMigrationSharedOptimizationSourceLayer = api;
    }
  } catch (_) {
    global.__PIXI_MIGRATION_SHARED_OPTIMIZATION_SOURCE_LAYER_DIAGNOSTICS__ = api;
  }

  maybeEmitStart('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
