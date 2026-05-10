// PXM-07.7B: Canvas2D shared optimization consumer normalization adapter.
// Layer: presentation/render/optimization.
//
// This module turns the read-only shared optimization source snapshot from
// PXM-07.7A into a Canvas2D consumer-readiness snapshot. It is intentionally
// adapter-only: it does not draw, mutate caches, change dirty/rebuild behavior,
// change framePlan.order, replace Canvas2D draw paths, or migrate PixiJS.
(function registerSharedRenderOptimizationCanvas2dConsumerAdapter(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/shared-render-optimization-canvas2d-consumer-adapter.js';
  var PHASE = 'canvas2d-consumer-normalization-adapter';
  var MODE = 'adapter-only-normalization';

  function safeArray(value) { return Array.isArray(value) ? value : []; }
  function toBool(value) { return value === true; }
  function toText(value, fallback) {
    if (value == null || value === '') return fallback || '';
    return String(value);
  }

  function getSource(snapshot, id) {
    if (!snapshot || !Array.isArray(snapshot.sources)) return null;
    for (var i = 0; i < snapshot.sources.length; i++) {
      if (snapshot.sources[i] && snapshot.sources[i].id === id) return snapshot.sources[i];
    }
    return null;
  }

  function classifySource(row, activeBackend) {
    row = row || {};
    var id = row.id || 'unknown';
    var ready = toBool(row.ready);
    var observed = toBool(row.observed);
    var partial = toBool(row.partial);
    var blocked = toBool(row.blocked);
    var currentConsumer = toText(row.currentConsumer, 'none');
    var isCanvas2dLegacy = currentConsumer.indexOf('canvas2d') >= 0;
    var isSharedUpstream = currentConsumer.indexOf('shared-') === 0 || currentConsumer.indexOf('shared-') >= 0;
    var isConditional = toBool(row.conditional);

    var normalized = false;
    var adapterReadable = ready || partial || observed || isConditional;
    var fallbackReason = '';
    var consumerPath = 'legacy-fallback-preserved';
    var consumerStatus = 'fallback';

    if (id === 'floor-layer-cache') {
      normalized = ready && isCanvas2dLegacy;
      consumerPath = normalized ? 'shared-source-readonly-plus-canvas2d-legacy-floor-consumer' : 'canvas2d-floor-legacy-fallback';
      consumerStatus = normalized ? 'adapter-ready' : (blocked ? 'blocked-by-pixi-first-pass' : 'fallback');
      fallbackReason = normalized ? '' : 'shared-floor-source-not-ready-for-canvas2d-consumer';
    } else if (id === 'static-world-chunk-cache') {
      normalized = ready && (isSharedUpstream || observed);
      consumerPath = 'shared-upstream-framePlan-source-plus-canvas2d-order-consumer';
      consumerStatus = normalized ? 'adapter-ready' : 'fallback';
      fallbackReason = normalized ? '' : 'static-world-shared-source-not-ready';
    } else if (id === 'static-packet-run-cache') {
      normalized = ready && isCanvas2dLegacy;
      consumerPath = normalized ? 'shared-run-source-readonly-plus-canvas2d-bitmap-run-consumer' : 'canvas2d-static-run-legacy-fallback';
      consumerStatus = normalized ? 'adapter-ready' : 'fallback';
      fallbackReason = normalized ? '' : 'static-run-source-not-observed';
    } else if (id === 'projected-geometry-cache') {
      normalized = ready && isCanvas2dLegacy;
      consumerPath = normalized ? 'shared-generic-geometry-readonly-plus-canvas2d-path2d-derived-consumer' : 'canvas2d-projected-geometry-legacy-fallback';
      consumerStatus = normalized ? 'adapter-partial' : 'fallback';
      fallbackReason = normalized ? 'generic-payload-split-still-pending' : 'projected-geometry-source-not-observed';
    } else if (id === 'material-color-cache') {
      normalized = ready && (isSharedUpstream || currentConsumer.indexOf('material') >= 0 || currentConsumer.indexOf('packet') >= 0);
      consumerPath = 'shared-packet-material-source-plus-canvas2d-fill-stroke-consumer';
      consumerStatus = normalized ? 'adapter-ready' : 'fallback';
      fallbackReason = normalized ? '' : 'material-color-source-not-ready';
    } else if (id === 'shadow-overlay-cache') {
      normalized = ready && observed;
      consumerPath = normalized ? 'shared-shadow-overlay-source-plus-canvas2d-overlay-consumer' : 'canvas2d-shadow-conditional-fallback';
      consumerStatus = normalized ? 'adapter-ready' : (isConditional ? 'conditional-not-observed' : 'fallback');
      fallbackReason = normalized ? '' : 'shadow-source-not-observed-in-this-run';
      adapterReadable = adapterReadable || isConditional;
    } else if (id === 'visibility-culling-contract') {
      normalized = ready;
      consumerPath = 'shared-visibility-source-plus-canvas2d-framePlan-consumer';
      consumerStatus = normalized ? 'adapter-ready' : 'fallback';
      fallbackReason = normalized ? '' : 'visibility-source-not-ready';
    } else if (id === 'occupancy-cache-contract') {
      normalized = ready;
      consumerPath = 'shared-occupancy-source-plus-canvas2d-upstream-consumer';
      consumerStatus = normalized ? 'adapter-ready' : 'fallback';
      fallbackReason = normalized ? '' : 'occupancy-source-not-ready';
    } else if (id === 'interaction-fast-path-contract') {
      normalized = ready || partial;
      consumerPath = normalized ? 'shared-frame-order-fast-path-source-plus-canvas2d-consumer' : 'canvas2d-interaction-fast-path-fallback';
      consumerStatus = normalized ? 'adapter-partial' : 'fallback';
      fallbackReason = normalized ? 'zoom-preview-may-be-not-observed' : 'interaction-fast-path-source-not-ready';
    } else if (id === 'performance-audit-contract') {
      normalized = ready;
      consumerPath = 'shared-performance-audit-source-plus-canvas2d-timing-consumer';
      consumerStatus = normalized ? 'adapter-ready' : 'fallback';
      fallbackReason = normalized ? '' : 'performance-audit-source-not-ready';
    }

    return {
      id: id,
      activeBackend: activeBackend || row.activeBackend || 'unknown',
      sharedSourceReady: ready,
      sharedSourceObserved: observed,
      sharedSourcePartial: partial,
      sharedSourceBlocked: blocked,
      adapterReadable: !!adapterReadable,
      canvas2dConsumerNormalized: !!normalized,
      canvas2dConsumerStatus: consumerStatus,
      canvas2dConsumerPath: consumerPath,
      currentConsumer: currentConsumer,
      legacyFallback: 'enabled',
      fallbackReason: fallbackReason,
      drawBehaviorChanged: false,
      modifiesRendering: false,
      framePlanOrderChanged: false,
      statsSummary: row.runtimeDetail || ''
    };
  }

  function buildCanvas2dConsumerSnapshot(sharedSnapshot, options) {
    options = options || {};
    var activeBackend = sharedSnapshot && sharedSnapshot.activeBackend || 'unknown';
    var sourceIds = safeArray(sharedSnapshot && sharedSnapshot.sources).map(function (row) { return row && row.id; }).filter(Boolean);
    if (!sourceIds.length) {
      var sourceLayer = global.__SHARED_RENDER_OPTIMIZATION_SOURCE_LAYER__ || null;
      sourceIds = sourceLayer && sourceLayer.sourceIds ? sourceLayer.sourceIds.slice() : [];
    }
    var rows = sourceIds.map(function (id) {
      return classifySource(getSource(sharedSnapshot, id) || { id: id }, activeBackend);
    });
    var normalized = rows.filter(function (row) { return row.canvas2dConsumerNormalized === true; });
    var readable = rows.filter(function (row) { return row.adapterReadable === true; });
    var fallback = rows.filter(function (row) { return row.canvas2dConsumerNormalized !== true; });
    var blocked = rows.filter(function (row) { return row.sharedSourceBlocked === true; });
    var criticalFallback = fallback.filter(function (row) {
      return row.id === 'floor-layer-cache' || row.id === 'static-packet-run-cache' || row.id === 'projected-geometry-cache';
    });

    return {
      owner: OWNER,
      phase: PHASE,
      mode: MODE,
      activeBackend: activeBackend,
      canvas2dConsumerNormalization: true,
      consumerMigration: 'adapter-only',
      sourceCount: rows.length,
      adapterReadableCount: readable.length,
      normalizedConsumerCount: normalized.length,
      fallbackConsumerCount: fallback.length,
      blockedConsumerCount: blocked.length,
      criticalFallbackCount: criticalFallback.length,
      normalizedConsumers: normalized.map(function (row) { return row.id; }),
      fallbackConsumers: fallback.map(function (row) { return row.id; }),
      blockedConsumers: blocked.map(function (row) { return row.id; }),
      criticalFallbackConsumers: criticalFallback.map(function (row) { return row.id; }),
      sources: rows,
      legacyFallback: 'enabled',
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false,
      changesMapData: false,
      changesObjectData: false,
      orderHashUnchanged: options.orderHashUnchanged || 'unknown-not-applicable',
      source: options.source || 'canvas2d-consumer-adapter'
    };
  }

  function getConsumerById(snapshot, id) {
    if (!snapshot || !Array.isArray(snapshot.sources)) return null;
    for (var i = 0; i < snapshot.sources.length; i++) {
      if (snapshot.sources[i] && snapshot.sources[i].id === id) return snapshot.sources[i];
    }
    return null;
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    mode: MODE,
    buildCanvas2dConsumerSnapshot: buildCanvas2dConsumerSnapshot,
    getConsumerById: getConsumerById
  };

  try {
    global.__SHARED_RENDER_OPTIMIZATION_CANVAS2D_CONSUMER_ADAPTER__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.optimization.canvas2dConsumerAdapter', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.optimization = global.App.renderer.optimization || {};
      global.App.renderer.optimization.canvas2dConsumerAdapter = api;
    }
  } catch (_) {
    global.__SHARED_RENDER_OPTIMIZATION_CANVAS2D_CONSUMER_ADAPTER__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
