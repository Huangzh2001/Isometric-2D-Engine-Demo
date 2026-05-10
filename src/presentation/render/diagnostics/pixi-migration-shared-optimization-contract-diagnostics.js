// PXM-07.6B: Shared optimization contract diagnostics for PixiJS migration.
// Layer: presentation/render/diagnostics.
//
// This module logs the renderer-neutral optimization contract boundary. It is
// read-only: no rendering, no cache bridge, no scene mutation, no sorting, and
// no PixiJS consumer implementation is performed here.
(function registerPixiMigrationSharedOptimizationContractDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-shared-optimization-contract-diagnostics.js';
  var STEP = 'PXM-07.6B';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var PHASE = 'shared-optimization-contract-boundary';

  var state = {
    started: false,
    lastSignature: '',
    lastAt: 0,
    lastSnapshot: null
  };

  function nowMs() {
    try { if (global.performance && typeof global.performance.now === 'function') return global.performance.now(); } catch (_) {}
    return Date.now();
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function stringifyValue(value) {
    if (value == null) return String(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    if (Array.isArray(value)) return value.slice(0, 16).join(',') || 'none';
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }

  function formatPayload(payload) {
    if (!payload || typeof payload !== 'object') return '';
    return Object.keys(payload).map(function (key) {
      return String(key) + '=' + stringifyValue(payload[key]);
    }).join(' ');
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

  function getContractsApi() {
    return global.__SHARED_RENDER_OPTIMIZATION_CONTRACTS__ || null;
  }

  function getContracts() {
    var api = getContractsApi();
    if (api && typeof api.listContracts === 'function') {
      try { return api.listContracts() || []; } catch (_) {}
    }
    return [];
  }

  function getContractsSummary() {
    var api = getContractsApi();
    if (api && typeof api.summarizeContracts === 'function') {
      try { return api.summarizeContracts() || {}; } catch (_) {}
    }
    return { total: getContracts().length };
  }

  function getAuditSnapshot(fallbackSnapshot) {
    if (fallbackSnapshot && typeof fallbackSnapshot === 'object') return fallbackSnapshot;
    var audit = global.__PIXI_MIGRATION_OPTIMIZATION_AUDIT_DIAGNOSTICS__ || null;
    if (audit && typeof audit.getLastAuditSnapshot === 'function') {
      try { return audit.getLastAuditSnapshot() || null; } catch (_) {}
    }
    return null;
  }

  function getBackend(snapshot) {
    if (snapshot && snapshot.activeBackend) return String(snapshot.activeBackend);
    try {
      var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      if (selection && typeof selection.getSnapshot === 'function') {
        var backend = selection.getSnapshot() || {};
        if (backend.activeBackend) return String(backend.activeBackend);
      }
    } catch (_) {}
    return 'unknown';
  }

  function maybeEmitStart(reason) {
    if (state.started) return;
    state.started = true;
    var summary = getContractsSummary();
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: PHASE,
      modifiesRendering: false,
      implementsPixiCacheBridge: false,
      contractCount: toNumber(summary.total, 0),
      source: reason || 'module-load'
    });
  }

  function getRuntimeSignals(snapshot) {
    snapshot = snapshot || {};
    var floor = snapshot.floor || {};
    var staticWorld = snapshot.staticWorld || {};
    var run = snapshot.staticRun || {};
    var geometry = snapshot.geometry || {};
    var materialShadow = snapshot.materialShadow || {};
    var visibility = snapshot.visibility || {};
    var fastPath = snapshot.fastPath || {};
    return {
      'floor-layer-cache': {
        observed: floor.canvas2dFloorCacheActive === true || floor.pixiFloorFirstPassActive === true,
        sharedSourceObserved: floor.canvas2dFloorCacheActive === true,
        pixiConsumerMissing: floor.pixiFloorBypassesSharedCache === true,
        pixiBypassesSharedCache: floor.pixiFloorBypassesSharedCache === true,
        detail: 'canvas2dFloorCacheActive=' + !!floor.canvas2dFloorCacheActive + ',pixiFloorFirstPassActive=' + !!floor.pixiFloorFirstPassActive
      },
      'static-world-chunk-cache': {
        observed: staticWorld.staticWorldChunkCacheActive === true,
        sharedSourceObserved: staticWorld.staticWorldChunkCacheActive === true,
        pixiConsumerMissing: false,
        detail: 'visibleChunks=' + toNumber(staticWorld.visibleChunkCount, 0) + ',reusedChunks=' + toNumber(staticWorld.reusedChunkCountThisFrame, 0)
      },
      'static-packet-run-cache': {
        observed: run.staticPacketRunCacheActive === true,
        sharedSourceObserved: run.staticPacketRunCacheActive === true,
        pixiConsumerMissing: getBackend(snapshot) === 'pixi',
        detail: 'runs=' + toNumber(run.staticBitmapRunCount, 0) + ',hits=' + toNumber(run.staticBitmapRunCacheHitCount, 0) + ',misses=' + toNumber(run.staticBitmapRunCacheMissCount, 0)
      },
      'projected-geometry-cache': {
        observed: geometry.projectedGeometryCacheActive === true,
        sharedSourceObserved: geometry.projectedGeometryCacheActive === true,
        pixiConsumerMissing: getBackend(snapshot) === 'pixi',
        detail: 'geometryHits=' + toNumber(geometry.staticPacketGeometryCacheHitCount, 0) + ',geometryMisses=' + toNumber(geometry.staticPacketGeometryCacheMissCount, 0)
      },
      'material-color-cache': {
        observed: materialShadow.colorCacheObserved === true,
        sharedSourceObserved: materialShadow.colorCacheObserved === true,
        pixiConsumerMissing: false,
        detail: 'colorHits=' + toNumber(materialShadow.colorCacheHitCount, 0) + ',colorMisses=' + toNumber(materialShadow.colorCacheMissCount, 0)
      },
      'shadow-overlay-cache': {
        observed: materialShadow.shadowOverlayCacheObserved === true,
        sharedSourceObserved: materialShadow.shadowOverlayCacheObserved === true,
        pixiConsumerMissing: materialShadow.shadowOverlayCacheObserved === true && getBackend(snapshot) === 'pixi',
        detail: 'shadowTotal=' + toNumber(materialShadow.shadowOverlayTotalCount, 0)
      },
      'visibility-culling-contract': {
        observed: visibility.cameraCullingActive === true,
        sharedSourceObserved: visibility.cameraCullingActive === true,
        pixiConsumerMissing: false,
        detail: 'afterCulling=' + toNumber(visibility.renderablesAfterCulling, 0) + ',occupancy=' + !!visibility.occupancyCacheActive
      },
      'occupancy-cache-contract': {
        observed: visibility.occupancyCacheActive === true,
        sharedSourceObserved: visibility.occupancyCacheActive === true,
        pixiConsumerMissing: false,
        detail: 'occupancyVersion=' + toNumber(visibility.occupancyCacheVersion, 0)
      },
      'interaction-fast-path-contract': {
        observed: fastPath.playerMoveFastPathUsed === true || fastPath.zoomPreviewFastPathUsed === true,
        sharedSourceObserved: fastPath.playerMoveFastPathUsed === true || fastPath.zoomPreviewFastPathUsed === true,
        pixiConsumerMissing: fastPath.zoomPreviewFastPathUsed === true && getBackend(snapshot) === 'pixi',
        detail: 'playerMoveFastPath=' + !!fastPath.playerMoveFastPathUsed + ',zoomPreview=' + !!fastPath.zoomPreviewFastPathUsed
      },
      'performance-audit-contract': {
        observed: true,
        sharedSourceObserved: true,
        pixiConsumerMissing: false,
        detail: 'auditSnapshot=' + !!snapshot
      }
    };
  }

  function classifyContracts(snapshot) {
    var contracts = getContracts();
    var signals = getRuntimeSignals(snapshot);
    var rows = [];
    contracts.forEach(function (contract) {
      var signal = signals[contract.id] || { observed: false, sharedSourceObserved: false, pixiConsumerMissing: false, detail: 'no-runtime-signal' };
      rows.push({
        id: contract.id,
        sourceStatus: contract.sourceStatus || 'unknown',
        observed: signal.observed === true,
        sharedSourceObserved: signal.sharedSourceObserved === true,
        canvas2dConsumerStatus: contract.canvas2dConsumer && contract.canvas2dConsumer.status || 'unknown',
        pixiConsumerStatus: contract.pixiConsumer && contract.pixiConsumer.status || 'unknown',
        pixiConsumerMissing: signal.pixiConsumerMissing === true || /missing|future/.test(String(contract.pixiConsumer && contract.pixiConsumer.status || '')),
        migrationRisk: contract.migrationRisk || 'unknown',
        reuseRule: contract.reuseRule || '',
        runtimeDetail: signal.detail || ''
      });
    });
    return rows;
  }

  function emitContractSections(snapshot, reason) {
    maybeEmitStart(reason || 'contract-audit');
    snapshot = getAuditSnapshot(snapshot) || {};
    state.lastSnapshot = snapshot;

    var activeBackend = getBackend(snapshot);
    var summary = getContractsSummary();
    var rows = classifyContracts(snapshot);
    var observed = rows.filter(function (row) { return row.observed; });
    var shared = rows.filter(function (row) { return row.sharedSourceObserved; });
    var gaps = rows.filter(function (row) { return row.pixiConsumerMissing; });
    var highRiskGaps = gaps.filter(function (row) { return /high|very-high/.test(String(row.migrationRisk)); });

    var signature = [
      activeBackend,
      observed.map(function (row) { return row.id + ':' + (row.observed ? 1 : 0); }).join(','),
      gaps.map(function (row) { return row.id; }).join(',')
    ].join('|');
    var current = nowMs();
    if (signature === state.lastSignature && (current - Number(state.lastAt || 0)) < 2000) return;
    state.lastSignature = signature;
    state.lastAt = current;

    emit('contract', {
      activeBackend: activeBackend,
      contractCount: toNumber(summary.total, rows.length),
      sharedSourceReady: toNumber(summary.sharedSourceReady, 0),
      sharedSourceRequired: toNumber(summary.sharedSourceRequired, 0),
      splitRequired: toNumber(summary.splitRequired, 0),
      pixiConsumerMissingDeclared: toNumber(summary.pixiConsumerMissing, 0),
      implementsPixiCacheBridge: false,
      modifiesRendering: false,
      source: reason || 'contract-audit'
    });
    emit('shared-source', {
      activeBackend: activeBackend,
      observedCount: observed.length,
      sharedSourceObservedCount: shared.length,
      observedContracts: observed.map(function (row) { return row.id; }).join(',') || 'none',
      sharedSourceContracts: shared.map(function (row) { return row.id; }).join(',') || 'none'
    });
    emit('consumer-gap', {
      activeBackend: activeBackend,
      gapCount: gaps.length,
      highRiskGapCount: highRiskGaps.length,
      pixiConsumerMissingContracts: gaps.map(function (row) { return row.id; }).join(',') || 'none',
      highRiskContracts: highRiskGaps.map(function (row) { return row.id; }).join(',') || 'none',
      floorBypassesSharedCache: !!(snapshot.floor && snapshot.floor.pixiFloorBypassesSharedCache)
    });

    rows.forEach(function (row) {
      if (!row.observed && !row.pixiConsumerMissing) return;
      emit('contract-detail', {
        id: row.id,
        observed: row.observed,
        sharedSourceObserved: row.sharedSourceObserved,
        sourceStatus: row.sourceStatus,
        canvas2dConsumer: row.canvas2dConsumerStatus,
        pixiConsumer: row.pixiConsumerStatus,
        pixiConsumerMissing: row.pixiConsumerMissing,
        migrationRisk: row.migrationRisk,
        runtimeDetail: row.runtimeDetail
      });
    });

    emit('summary', {
      ok: true,
      activeBackend: activeBackend,
      contractCount: rows.length,
      observedOptimizationCount: observed.length,
      sharedSourceObservedCount: shared.length,
      pixiConsumerGapCount: gaps.length,
      highRiskGapCount: highRiskGaps.length,
      floorLayerCacheNeedsSharedConsumer: gaps.some(function (row) { return row.id === 'floor-layer-cache'; }),
      staticPacketRunNeedsSharedConsumer: gaps.some(function (row) { return row.id === 'static-packet-run-cache'; }),
      projectedGeometryNeedsSplit: gaps.some(function (row) { return row.id === 'projected-geometry-cache'; }),
      implementsPixiCacheBridge: false,
      modifiesRendering: false,
      source: reason || 'contract-audit'
    });

    try {
      var manifestDiagnostics = global.__PIXI_MIGRATION_SHARED_OPTIMIZATION_MANIFEST_DIAGNOSTICS__ || null;
      if (manifestDiagnostics && typeof manifestDiagnostics.noteContractSnapshot === 'function') {
        manifestDiagnostics.noteContractSnapshot(getLastContractSnapshot(), {
          source: reason || 'contract-audit'
        });
      }
    } catch (_) {}
  }

  function noteOptimizationAuditSnapshot(snapshot, meta) {
    emitContractSections(snapshot, meta && meta.source || 'optimization-audit-snapshot');
  }

  function getLastContractSnapshot() {
    var snapshot = getAuditSnapshot(state.lastSnapshot) || {};
    return {
      owner: OWNER,
      step: STEP,
      phase: PHASE,
      activeBackend: getBackend(snapshot),
      contracts: classifyContracts(snapshot)
    };
  }

  var api = {
    owner: OWNER,
    step: STEP,
    phase: PHASE,
    noteOptimizationAuditSnapshot: noteOptimizationAuditSnapshot,
    emitContractSections: emitContractSections,
    getLastContractSnapshot: getLastContractSnapshot
  };

  try {
    global.__PIXI_MIGRATION_SHARED_OPTIMIZATION_CONTRACT_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationSharedOptimizationContracts', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.diagnostics = global.App.renderer.diagnostics || {};
      global.App.renderer.diagnostics.pixiMigrationSharedOptimizationContracts = api;
    }
  } catch (_) {
    global.__PIXI_MIGRATION_SHARED_OPTIMIZATION_CONTRACT_DIAGNOSTICS__ = api;
  }

  maybeEmitStart('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
