// PXM-07.6C: Shared optimization runtime manifest diagnostics.
// Layer: presentation/render/diagnostics.
//
// This file logs the renderer-neutral optimization interface boundaries. It is
// read-only: it does not render, mutate caches, choose a backend, or alter any
// Canvas2D/PixiJS behavior.
(function registerPixiMigrationSharedOptimizationManifestDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-shared-optimization-manifest-diagnostics.js';
  var STEP = 'PXM-07.6C';
  var PHASE = 'shared-optimization-runtime-manifest-diagnostics';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';

  var state = {
    started: false,
    lastSignature: '',
    lastAt: 0,
    lastContractSnapshot: null
  };

  function nowMs() {
    try { return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }

  function formatValue(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.join(',');
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch (_) { return '[object]'; }
    }
    return String(value);
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

  function getManifestApi() {
    return global.__SHARED_RENDER_OPTIMIZATION_RUNTIME_MANIFEST__ || null;
  }

  function getAuditSnapshot() {
    var audit = global.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__ || null;
    if (audit && typeof audit.getLastAuditSnapshot === 'function') {
      try { return audit.getLastAuditSnapshot() || null; } catch (_) {}
    }
    return null;
  }

  function getBackend(snapshot) {
    if (snapshot && snapshot.activeBackend) return String(snapshot.activeBackend);
    var audit = getAuditSnapshot();
    if (audit && audit.activeBackend) return String(audit.activeBackend);
    try {
      var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      if (selection && typeof selection.getSnapshot === 'function') {
        var backend = selection.getSnapshot() || {};
        if (backend.activeBackend) return String(backend.activeBackend);
      }
    } catch (_) {}
    return 'unknown';
  }

  function getManifestRows() {
    var manifest = getManifestApi();
    if (manifest && typeof manifest.listRuntimeManifest === 'function') {
      try { return manifest.listRuntimeManifest() || []; } catch (_) {}
    }
    return [];
  }

  function getManifestSummary() {
    var manifest = getManifestApi();
    if (manifest && typeof manifest.summarizeRuntimeManifest === 'function') {
      try { return manifest.summarizeRuntimeManifest() || {}; } catch (_) {}
    }
    return { total: getManifestRows().length };
  }

  function getImplementationOrder() {
    var manifest = getManifestApi();
    if (manifest && typeof manifest.getImplementationOrder === 'function') {
      try { return manifest.getImplementationOrder() || []; } catch (_) {}
    }
    return [];
  }

  function maybeEmitStart(reason) {
    if (state.started) return;
    state.started = true;
    var summary = getManifestSummary();
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: PHASE,
      contractCount: Number(summary.total || 0),
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      implementsPixiCacheBridge: false,
      source: reason || 'module-load'
    });
  }

  function listConsumerGaps(rows) {
    return rows.filter(function (row) {
      return row.pixiConsumer && /missing|future/.test(String(row.pixiConsumer.status || ''));
    });
  }

  function listSplitRows(rows) {
    return rows.filter(function (row) {
      return /split/.test(String(row.implementationReadiness || row.sourceStatus || ''));
    });
  }

  function listHighRiskRows(rows) {
    return rows.filter(function (row) {
      return /high|very-high|Do not/.test(String(row.riskGate || ''));
    });
  }

  function emitManifestSections(contractSnapshot, meta) {
    maybeEmitStart(meta && meta.source || 'manifest-audit');
    state.lastContractSnapshot = contractSnapshot || state.lastContractSnapshot || null;

    var rows = getManifestRows();
    var summary = getManifestSummary();
    var order = getImplementationOrder();
    var activeBackend = getBackend(contractSnapshot);
    var gaps = listConsumerGaps(rows);
    var splitRows = listSplitRows(rows);
    var highRiskRows = listHighRiskRows(rows);
    var signature = [
      activeBackend,
      rows.length,
      gaps.map(function (row) { return row.id; }).join(','),
      order.join(',')
    ].join('|');
    var current = nowMs();
    if (signature === state.lastSignature && (current - Number(state.lastAt || 0)) < 2500) return;
    state.lastSignature = signature;
    state.lastAt = current;

    emit('manifest', {
      activeBackend: activeBackend,
      contractCount: rows.length,
      sharedSourceCount: Number(summary.sharedSourceCount || 0),
      splitRequiredCount: Number(summary.splitRequiredCount || 0),
      pixiConsumerGapCount: gaps.length,
      highRiskCount: highRiskRows.length,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      implementsPixiCacheBridge: false,
      source: meta && meta.source || 'manifest-audit'
    });

    rows.forEach(function (row) {
      emit('contract-interface', {
        id: row.id,
        sourceStatus: row.sourceStatus,
        implementationReadiness: row.implementationReadiness,
        sharedSource: row.sharedSource,
        dirtyVersionSignature: row.dirtyVersionSignature,
        runtimeStats: row.runtimeStats,
        canvas2dConsumer: row.canvas2dConsumer && row.canvas2dConsumer.status || 'unknown',
        pixiConsumer: row.pixiConsumer && row.pixiConsumer.status || 'unknown',
        fallbackPolicy: row.fallbackPolicy,
        nextAction: row.nextAction,
        riskGate: row.riskGate
      });
    });

    emit('implementation-order', {
      nextImplementationOrder: order.join(','),
      first: order[0] || 'none',
      second: order[1] || 'none',
      third: order[2] || 'none',
      blockedUntilContractsReviewed: true,
      source: meta && meta.source || 'manifest-audit'
    });

    emit('safety-gate', {
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      implementsPixiCacheBridge: false,
      changesDepthSort: false,
      changesPicking: false,
      changesMapData: false,
      changesObjectData: false,
      consumerGapContracts: gaps.map(function (row) { return row.id; }).join(',') || 'none',
      splitRequiredContracts: splitRows.map(function (row) { return row.id; }).join(',') || 'none',
      highRiskContracts: highRiskRows.map(function (row) { return row.id; }).join(',') || 'none'
    });

    emit('summary', {
      ok: true,
      activeBackend: activeBackend,
      contractCount: rows.length,
      pixiConsumerGapCount: gaps.length,
      splitRequiredCount: splitRows.length,
      highRiskCount: highRiskRows.length,
      nextImplementationOrder: order.join(','),
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      implementsPixiCacheBridge: false,
      source: meta && meta.source || 'manifest-audit'
    });
  }

  function noteContractSnapshot(contractSnapshot, meta) {
    emitManifestSections(contractSnapshot, meta || { source: 'contract-snapshot' });
  }

  function getLastManifestSnapshot() {
    return {
      owner: OWNER,
      step: STEP,
      phase: PHASE,
      activeBackend: getBackend(state.lastContractSnapshot),
      manifest: getManifestRows(),
      summary: getManifestSummary(),
      nextImplementationOrder: getImplementationOrder()
    };
  }

  var api = {
    owner: OWNER,
    step: STEP,
    phase: PHASE,
    noteContractSnapshot: noteContractSnapshot,
    emitManifestSections: emitManifestSections,
    getLastManifestSnapshot: getLastManifestSnapshot
  };

  try {
    global.__PIXI_MIGRATION_SHARED_OPTIMIZATION_MANIFEST_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationSharedOptimizationManifest', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.diagnostics = global.App.renderer.diagnostics || {};
      global.App.renderer.diagnostics.pixiMigrationSharedOptimizationManifest = api;
    }
  } catch (_) {
    global.__PIXI_MIGRATION_SHARED_OPTIMIZATION_MANIFEST_DIAGNOSTICS__ = api;
  }

  maybeEmitStart('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
