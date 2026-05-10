// PXM-07.7C: Canvas2D shared optimization source consumption layer.
// Layer: presentation/render/optimization.
//
// This module is the first real consumption boundary for the renderer-neutral
// optimization sources. Canvas2D draw paths call this layer before/after using
// their existing optimized implementations. It is intentionally behavior-neutral:
// it does not draw, mutate cache state, replace draw functions, change dirty
// invalidation, change framePlan.order, change depth sorting, or migrate PixiJS.
(function registerSharedRenderOptimizationCanvas2dSharedConsumer(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/shared-render-optimization-canvas2d-shared-consumer.js';
  var PHASE = 'canvas2d-shared-source-consumption';
  var MODE = 'shared-source-consumption-with-legacy-implementation';

  var SOURCE_IDS = [
    'floor-layer-cache',
    'static-world-chunk-cache',
    'static-packet-run-cache',
    'projected-geometry-cache',
    'material-color-cache',
    'shadow-overlay-cache',
    'visibility-culling-contract',
    'occupancy-cache-contract',
    'interaction-fast-path-contract',
    'performance-audit-contract'
  ];

  var state = {
    callSeq: 0,
    callsBySource: Object.create(null),
    lastBySource: Object.create(null),
    lastSnapshot: null,
    lastSummarySignature: ''
  };

  function nowMs() {
    try { return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }

  function toBool(value) { return value === true; }

  function toText(value, fallback) {
    if (value == null || value === '') return fallback || '';
    return String(value);
  }

  function safeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function getLastSharedSnapshot() {
    try {
      var diagnostics = global.__PIXI_MIGRATION_SHARED_OPTIMIZATION_SOURCE_LAYER_DIAGNOSTICS__ || null;
      if (diagnostics && typeof diagnostics.getLastSharedSourceSnapshot === 'function') {
        return diagnostics.getLastSharedSourceSnapshot() || null;
      }
    } catch (_) {}
    return null;
  }

  function getSourceRow(id) {
    var snapshot = getLastSharedSnapshot();
    if (!snapshot || !Array.isArray(snapshot.sources)) return null;
    for (var i = 0; i < snapshot.sources.length; i++) {
      if (snapshot.sources[i] && snapshot.sources[i].id === id) return snapshot.sources[i];
    }
    return null;
  }

  function getConsumerRow(id) {
    try {
      var diagnostics = global.__PIXI_MIGRATION_CANVAS2D_CONSUMER_NORMALIZATION_DIAGNOSTICS__ || null;
      var adapterSnapshot = diagnostics && typeof diagnostics.getLastCanvas2dConsumerSnapshot === 'function'
        ? diagnostics.getLastCanvas2dConsumerSnapshot()
        : null;
      if (adapterSnapshot && Array.isArray(adapterSnapshot.sources)) {
        for (var i = 0; i < adapterSnapshot.sources.length; i++) {
          if (adapterSnapshot.sources[i] && adapterSnapshot.sources[i].id === id) return adapterSnapshot.sources[i];
        }
      }
    } catch (_) {}
    return null;
  }

  function noteConsumerUse(id, payload) {
    id = String(id || 'unknown');
    payload = payload || {};
    var sourceRow = getSourceRow(id) || {};
    var consumerRow = getConsumerRow(id) || {};
    var activeBackend = toText(payload.activeBackend || sourceRow.activeBackend || consumerRow.activeBackend, 'canvas2d');
    var callSeq = ++state.callSeq;
    var record = {
      id: id,
      callSeq: callSeq,
      atMs: nowMs(),
      activeBackend: activeBackend,
      stage: toText(payload.stage, 'unknown'),
      caller: toText(payload.caller, 'unknown'),
      sharedSourceReady: sourceRow.ready === true || consumerRow.sharedSourceReady === true,
      sharedSourceObserved: sourceRow.observed === true || consumerRow.sharedSourceObserved === true,
      sharedSourcePartial: sourceRow.partial === true || consumerRow.sharedSourcePartial === true,
      sharedSourceBlocked: sourceRow.blocked === true || consumerRow.sharedSourceBlocked === true,
      canvas2dConsumerNormalized: consumerRow.canvas2dConsumerNormalized === true || payload.canvas2dConsumerNormalized === true,
      canvas2dConsumerPath: toText(payload.canvas2dConsumerPath || consumerRow.canvas2dConsumerPath, 'shared-source-consumption-plus-existing-canvas2d-implementation'),
      legacyFallback: 'enabled',
      fallbackUsed: payload.fallbackUsed === true,
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false,
      statsSummary: toText(payload.statsSummary || sourceRow.runtimeDetail || consumerRow.statsSummary, ''),
      runtimeDetail: payload.runtimeDetail || null
    };
    state.callsBySource[id] = safeNumber(state.callsBySource[id], 0) + 1;
    state.lastBySource[id] = record;
    state.lastSnapshot = buildConsumptionSnapshot({ source: payload.source || record.caller || record.stage });
    try {
      var diag = global.__PIXI_MIGRATION_CANVAS2D_SHARED_CONSUMPTION_DIAGNOSTICS__ || null;
      if (diag && typeof diag.noteCanvas2dSharedConsumption === 'function') diag.noteCanvas2dSharedConsumption(record, state.lastSnapshot);
    } catch (_) {}
    return record;
  }

  function buildConsumptionSnapshot(options) {
    options = options || {};
    var rows = SOURCE_IDS.map(function (id) {
      var last = state.lastBySource[id] || null;
      var sourceRow = getSourceRow(id) || {};
      var consumerRow = getConsumerRow(id) || {};
      return {
        id: id,
        callCount: safeNumber(state.callsBySource[id], 0),
        consumed: !!last,
        lastStage: last ? last.stage : '',
        activeBackend: last ? last.activeBackend : toText(sourceRow.activeBackend || consumerRow.activeBackend, 'unknown'),
        sharedSourceReady: sourceRow.ready === true || consumerRow.sharedSourceReady === true,
        sharedSourceObserved: sourceRow.observed === true || consumerRow.sharedSourceObserved === true,
        sharedSourceBlocked: sourceRow.blocked === true || consumerRow.sharedSourceBlocked === true,
        canvas2dConsumerNormalized: consumerRow.canvas2dConsumerNormalized === true,
        canvas2dConsumerPath: last ? last.canvas2dConsumerPath : toText(consumerRow.canvas2dConsumerPath, 'pending-consumption'),
        legacyFallback: 'enabled',
        fallbackUsed: last ? !!last.fallbackUsed : false,
        drawBehaviorChanged: false,
        modifiesRendering: false
      };
    });
    var consumed = rows.filter(function (row) { return row.consumed; });
    var unconsumed = rows.filter(function (row) { return !row.consumed; });
    var blocked = rows.filter(function (row) { return row.sharedSourceBlocked; });
    return {
      owner: OWNER,
      phase: PHASE,
      mode: MODE,
      sourceCount: rows.length,
      consumedSourceCount: consumed.length,
      unconsumedSourceCount: unconsumed.length,
      blockedSourceCount: blocked.length,
      consumedSources: consumed.map(function (row) { return row.id; }),
      unconsumedSources: unconsumed.map(function (row) { return row.id; }),
      blockedSources: blocked.map(function (row) { return row.id; }),
      sources: rows,
      canvas2dCallsSharedOptimizationLayer: true,
      consumerMigration: 'shared-source-consumption-layer',
      legacyFallback: 'enabled',
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false,
      orderHashUnchanged: 'unknown-not-applicable',
      source: options.source || 'canvas2d-shared-consumer'
    };
  }

  function getLastConsumptionSnapshot() {
    return state.lastSnapshot || buildConsumptionSnapshot({ source: 'last-snapshot' });
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    mode: MODE,
    sourceIds: SOURCE_IDS.slice(),
    noteConsumerUse: noteConsumerUse,
    buildConsumptionSnapshot: buildConsumptionSnapshot,
    getLastConsumptionSnapshot: getLastConsumptionSnapshot
  };

  try {
    global.__SHARED_RENDER_OPTIMIZATION_CANVAS2D_SHARED_CONSUMER__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.optimization.canvas2dSharedConsumer', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.optimization = global.App.renderer.optimization || {};
      global.App.renderer.optimization.canvas2dSharedConsumer = api;
    }
  } catch (_) {
    global.__SHARED_RENDER_OPTIMIZATION_CANVAS2D_SHARED_CONSUMER__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
