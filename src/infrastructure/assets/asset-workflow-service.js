// P11d-8: Asset workflow service owner.
// Owns services.assetWorkflow orchestration API and workflow counters.
(function installAssetWorkflowService(global) {
  'use strict';

  var OWNER = 'src/infrastructure/assets/asset-workflow-service.js';
  var PROTOCOL = 'P6-C-asset-workflow-v1';

  function safeDeps(deps) { return deps || {}; }
  function call(deps, name) {
    var args = Array.prototype.slice.call(arguments, 2);
    var fn = deps && deps[name];
    if (typeof fn !== 'function') return undefined;
    return fn.apply(null, args);
  }
  function getState(deps, name, fallback) {
    var value = call(deps, name);
    return value || fallback;
  }

  function createWorkflowState() {
    return {
      counters: {
        ensureHabboRootReadyCalls: 0,
        ensureHabboLibrarySummaryCalls: 0,
        ensureHabboLibraryPageCalls: 0,
        runAssetScanCalls: 0,
        persistCustomPrefabsCalls: 0,
        markAssetManagedPrefabCalls: 0
      },
      lastEvent: null,
      recentEvents: []
    };
  }

  function recordAssetWorkflowEvent(state, kind, detail) {
    var entry = { at: new Date().toISOString(), kind: String(kind || ''), detail: detail || null };
    state.lastEvent = entry;
    state.recentEvents.push(entry);
    if (state.recentEvents.length > 16) state.recentEvents.shift();
    return entry;
  }

  function summarizeAssetWorkflowState(state, deps) {
    deps = safeDeps(deps);
    var st = call(deps, 'getAssetPrefabScanSnapshot') || {};
    var root = getState(deps, 'getHabboAssetRootState', {});
    var lib = getState(deps, 'getHabboLibraryState', {});
    var rootFlight = call(deps, 'getHabboRootConfigInFlightState') || {};
    return {
      counters: Object.assign({}, state.counters),
      lastEvent: state.lastEvent,
      recentEvents: state.recentEvents.slice(),
      rootConfigured: !!root.configured,
      rootExists: !!root.exists,
      itemCount: root.itemCount || 0,
      rootConfigInFlight: !!rootFlight.inFlight,
      pendingRoot: String(rootFlight.pendingRoot || ''),
      summaryLoaded: !!lib.summaryLoaded,
      pageLoaded: !!lib.loaded,
      scanInFlight: !!st.inFlight,
      totalFiles: st.totalFiles || 0,
      importedCount: st.importedCount || 0
    };
  }

  function buildAssetWorkflowResult(state, deps, operation, options, extra) {
    options = options || {};
    return Object.assign({
      ok: true,
      operation: String(operation || 'unknown'),
      protocolVersion: PROTOCOL,
      source: String(options.source || ('services.assetWorkflow:' + String(operation || 'unknown'))),
      compatDelegated: !!options.__fromLegacyCompat
    }, summarizeAssetWorkflowState(state, deps), extra || {});
  }

  function createAssetWorkflowApi(deps) {
    deps = safeDeps(deps);
    var state = createWorkflowState();

    async function ensureHabboRootReadyViaWorkflow(options) {
      options = options || {};
      state.counters.ensureHabboRootReadyCalls += 1;
      recordAssetWorkflowEvent(state, 'ensureHabboRootReady', { source: String(options.source || 'unknown') });
      try {
        await call(deps, 'fetchHabboAssetRootConfig', { silent: options.silent !== false, __fromAssetWorkflow: true });
        var root = getState(deps, 'getHabboAssetRootState', {});
        return buildAssetWorkflowResult(state, deps, 'ensureHabboRootReady', options, {
          ok: true,
          root: String(root.root || ''),
          error: ''
        });
      } catch (err) {
        var rootAfterError = getState(deps, 'getHabboAssetRootState', {});
        return buildAssetWorkflowResult(state, deps, 'ensureHabboRootReady', options, {
          ok: false,
          error: String(err && err.message ? err.message : err),
          root: String(rootAfterError.root || '')
        });
      }
    }

    async function ensureHabboLibrarySummaryViaWorkflow(options) {
      options = options || {};
      state.counters.ensureHabboLibrarySummaryCalls += 1;
      recordAssetWorkflowEvent(state, 'ensureHabboLibrarySummary', { source: String(options.source || 'unknown'), force: !!options.force });
      await call(deps, 'fetchHabboLibrarySummary', { force: !!options.force, __fromAssetWorkflow: true, source: options.source || 'services.assetWorkflow:ensureHabboLibrarySummary' });
      var lib = getState(deps, 'getHabboLibraryState', {});
      return buildAssetWorkflowResult(state, deps, 'ensureHabboLibrarySummary', options, {
        ok: !!lib.summaryLoaded && !lib.loadError,
        pending: !!lib.summaryPending,
        totalItems: lib.totalItems || 0,
        activeType: String(lib.activeType || 'room'),
        categories: (call(deps, 'getHabboLibraryCategoriesForType', lib.activeType || 'room') || []).length,
        loadError: String(lib.loadError || '')
      });
    }

    async function ensureHabboLibraryPageViaWorkflow(options) {
      options = options || {};
      state.counters.ensureHabboLibraryPageCalls += 1;
      recordAssetWorkflowEvent(state, 'ensureHabboLibraryPage', { source: String(options.source || 'unknown'), force: !!options.force, type: String(options.type || ''), category: String(options.category || '') });
      var lib = getState(deps, 'getHabboLibraryState', {});
      if (typeof options.type === 'string' && options.type) lib.activeType = String(options.type);
      if (typeof options.category === 'string' && options.category) lib.activeCategory = String(options.category);
      if (typeof options.search !== 'undefined') lib.search = String(options.search || '');
      if (typeof options.page !== 'undefined') lib.page = Math.max(1, parseInt(options.page, 10) || 1);
      if (typeof options.pageSize !== 'undefined') lib.pageSize = Math.max(1, parseInt(options.pageSize, 10) || lib.pageSize || 15);
      await call(deps, 'fetchHabboLibraryPage', { force: !!options.force, __fromAssetWorkflow: true, source: options.source || 'services.assetWorkflow:ensureHabboLibraryPage' });
      return buildAssetWorkflowResult(state, deps, 'ensureHabboLibraryPage', options, {
        ok: !lib.loadError,
        totalItems: lib.totalItems || 0,
        page: lib.page || 1,
        pageSize: lib.pageSize || 15,
        items: Array.isArray(lib.items) ? lib.items.length : 0,
        activeType: String(lib.activeType || 'room'),
        activeCategory: String(lib.activeCategory || 'all'),
        queryKey: String(lib.queryKey || ''),
        loadError: String(lib.loadError || '')
      });
    }

    async function runAssetScanViaWorkflow(options) {
      options = options || {};
      state.counters.runAssetScanCalls += 1;
      recordAssetWorkflowEvent(state, 'runAssetScan', { source: String(options.source || 'unknown'), force: !!options.force });
      var ok = await call(deps, 'scanAssetPrefabs', { force: !!options.force, __fromAssetWorkflow: true, source: options.source || 'services.assetWorkflow:runAssetScan' });
      var st = call(deps, 'getAssetPrefabScanSnapshot') || {};
      return buildAssetWorkflowResult(state, deps, 'runAssetScan', options, {
        ok: !!ok && !st.lastError,
        inFlight: !!st.inFlight,
        totalFiles: st.totalFiles || 0,
        importedCount: st.importedCount || 0,
        ids: Array.isArray(st.ids) ? st.ids.length : 0,
        lastError: String(st.lastError || ''),
        lastSummary: String(st.lastSummary || '')
      });
    }

    function persistCustomPrefabsViaWorkflow(options) {
      options = options || {};
      state.counters.persistCustomPrefabsCalls += 1;
      recordAssetWorkflowEvent(state, 'persistCustomPrefabs', { source: String(options.source || 'unknown') });
      var ok = !!call(deps, 'saveCustomPrefabsToLocalStorage');
      var list = call(deps, 'listCustomPrefabs') || [];
      return buildAssetWorkflowResult(state, deps, 'persistCustomPrefabs', options, {
        ok: ok,
        persistedCount: list.length
      });
    }

    function markAssetManagedPrefabViaWorkflow(prefabId, options) {
      options = options || {};
      state.counters.markAssetManagedPrefabCalls += 1;
      var id = String(prefabId || '').trim();
      recordAssetWorkflowEvent(state, 'markAssetManagedPrefab', { source: String(options.source || 'unknown'), prefabId: id });
      if (!id) {
        return buildAssetWorkflowResult(state, deps, 'markAssetManagedPrefab', options, {
          ok: false,
          prefabId: id,
          error: 'missing-prefab-id'
        });
      }
      var scanService = call(deps, 'getAssetPrefabScanService');
      if (scanService && typeof scanService.markAssetManagedPrefab === 'function') scanService.markAssetManagedPrefab(id, call(deps, 'createAssetPrefabScanDeps'));
      else {
        var st = call(deps, 'ensureAssetPrefabScanState') || { ids: new Set() };
        if (st.ids && typeof st.ids.add === 'function') st.ids.add(id);
      }
      var scanState = call(deps, 'ensureAssetPrefabScanState') || {};
      return buildAssetWorkflowResult(state, deps, 'markAssetManagedPrefab', options, {
        ok: true,
        prefabId: id,
        ids: scanState.ids && typeof scanState.ids.size === 'number' ? scanState.ids.size : 0
      });
    }

    return {
      owner: OWNER,
      phase: 'P6-C',
      apiPath: 'services.assetWorkflow',
      ensureHabboRootReady: ensureHabboRootReadyViaWorkflow,
      ensureHabboLibrarySummary: ensureHabboLibrarySummaryViaWorkflow,
      ensureHabboLibraryPage: ensureHabboLibraryPageViaWorkflow,
      runAssetScan: runAssetScanViaWorkflow,
      persistCustomPrefabs: persistCustomPrefabsViaWorkflow,
      markAssetManagedPrefab: markAssetManagedPrefabViaWorkflow,
      summarize: function () { return summarizeAssetWorkflowState(state, deps); }
    };
  }

  global.__ASSET_WORKFLOW_SERVICE__ = {
    owner: OWNER,
    protocolVersion: PROTOCOL,
    createAssetWorkflowApi: createAssetWorkflowApi
  };
})(typeof window !== 'undefined' ? window : globalThis);
