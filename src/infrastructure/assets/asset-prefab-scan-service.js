// asset-prefab-scan-service.js
// P11d-1: owns asset prefab scan state, snapshot, and scan execution.
(function installAssetPrefabScanService(global) {
  'use strict';

  var OWNER = 'src/infrastructure/assets/asset-prefab-scan-service.js';
  var assetPrefabIndexRequestSeq = 0;
  var lastAssetPrefabScanAt = 0;

  function safeCall(fn, fallback) {
    try { return (typeof fn === 'function') ? fn() : fallback; } catch (_) { return fallback; }
  }

  function getWindow() {
    return global && global.window ? global.window : global;
  }

  function getPushLog(deps) {
    return deps && typeof deps.pushLog === 'function'
      ? deps.pushLog
      : function (msg) { try { if (typeof global.pushLog === 'function') global.pushLog(msg); } catch (_) {} };
  }

  function ensureAssetPrefabScanState() {
    var win = getWindow();
    if (!win.__assetPrefabScanState) {
      win.__assetPrefabScanState = {
        inFlight: false,
        lastAt: 0,
        lastError: '',
        lastSummary: '',
        lastItems: [],
        ids: new Set(),
        records: {},
        totalFiles: 0,
        importedCount: 0,
      };
    }
    if (!(win.__assetPrefabScanState.ids instanceof Set)) {
      win.__assetPrefabScanState.ids = new Set(Array.isArray(win.__assetPrefabScanState.ids) ? win.__assetPrefabScanState.ids : []);
    }
    if (!win.__assetPrefabScanState.records || typeof win.__assetPrefabScanState.records !== 'object') {
      win.__assetPrefabScanState.records = {};
    }
    return win.__assetPrefabScanState;
  }

  function getAssetPrefabScanSnapshot(deps) {
    deps = deps || {};
    var st = ensureAssetPrefabScanState();
    return {
      inFlight: !!st.inFlight,
      lastAt: st.lastAt || 0,
      lastError: st.lastError || '',
      lastSummary: st.lastSummary || '',
      totalFiles: st.totalFiles || 0,
      importedCount: st.importedCount || 0,
      ids: Array.from(st.ids || []),
      recordCount: st.records ? Object.keys(st.records).length : 0,
      lastItems: Array.isArray(st.lastItems) ? st.lastItems.slice(0, 20) : [],
      serverMode: !!safeCall(deps.isServerMode, false),
    };
  }

  function markAssetManagedPrefab(prefabId, deps) {
    deps = deps || {};
    var id = String(prefabId || '').trim();
    if (!id) return false;
    var st = ensureAssetPrefabScanState();
    st.ids.add(id);
    if (typeof deps.setAssetManagedPrefabIds === 'function') deps.setAssetManagedPrefabIds(st.ids);
    return true;
  }

  async function scanAssetPrefabs(forceOrOptions, deps) {
    deps = deps || {};
    var pushLog = getPushLog(deps);
    var options = (typeof forceOrOptions === 'object' && forceOrOptions !== null) ? forceOrOptions : { force: !!forceOrOptions };
    var force = !!options.force;
    var logOwner = String(deps.owner || OWNER);
    var workflow = (typeof deps.shouldUseAssetWorkflowCompat === 'function' && deps.shouldUseAssetWorkflowCompat(options) && typeof deps.getAssetWorkflowCompatApi === 'function')
      ? deps.getAssetWorkflowCompatApi()
      : null;
    if (workflow && typeof workflow.runAssetScan === 'function') {
      var workflowResult = await workflow.runAssetScan(Object.assign({}, options, { force: force, __fromLegacyCompat: true, source: options.source || 'asset-management:compat:runAssetScan' }));
      return !!(workflowResult && workflowResult.ok);
    }

    var st = ensureAssetPrefabScanState();
    if (typeof deps.setAssetManagedPrefabIds === 'function') deps.setAssetManagedPrefabIds(st.ids);
    if (!safeCall(deps.isServerMode, false)) {
      st.lastError = 'not-server-mode';
      st.lastSummary = '未启用本地服务器模式';
      if (typeof deps.refreshAssetScanStatus === 'function') deps.refreshAssetScanStatus();
      return false;
    }
    if (st.inFlight) {
      pushLog('prefab-assets: scan skipped inFlight=true');
      if (typeof deps.logRequestOrchestration === 'function') deps.logRequestOrchestration('skipped', { owner: logOwner, flow: 'asset-scan', reason: 'in-flight' });
      if (typeof deps.refreshAssetScanStatus === 'function') deps.refreshAssetScanStatus();
      return false;
    }
    if (!force && Date.now() - (st.lastAt || 0) < 500) {
      pushLog('prefab-assets: scan skipped debounce');
      if (typeof deps.logRequestOrchestration === 'function') deps.logRequestOrchestration('skipped', { owner: logOwner, flow: 'asset-scan', reason: 'debounce' });
      if (typeof deps.refreshAssetScanStatus === 'function') deps.refreshAssetScanStatus();
      return false;
    }

    var requestId = ++assetPrefabIndexRequestSeq;
    st.inFlight = true;
    st.lastError = '';
    if (typeof deps.refreshAssetScanStatus === 'function') deps.refreshAssetScanStatus();
    pushLog('prefab-assets: scan start force=' + (!!force) + ' existingManaged=' + st.ids.size + ' requestId=' + requestId);
    if (typeof deps.logRequestOrchestration === 'function') deps.logRequestOrchestration('start', { owner: logOwner, flow: 'asset-scan', requestId: requestId, force: !!force, existingManaged: st.ids.size });

    try {
      var prefabApi = typeof deps.getPrefabApiAdapter === 'function' ? deps.getPrefabApiAdapter() : null;
      var assetApi = typeof deps.getAssetApiAdapter === 'function' ? deps.getAssetApiAdapter() : null;
      if (!prefabApi || typeof prefabApi.fetchIndex !== 'function') throw new Error('missing prefab api');
      if (!assetApi || typeof assetApi.fetchJsonAsset !== 'function') throw new Error('missing asset api');
      var indexResult = await prefabApi.fetchIndex({ requestId: requestId });
      var res = indexResult.response;
      var data = indexResult.data;
      if (!res.ok || !data || !Array.isArray(data.items)) throw new Error('invalid prefab index');
      st.totalFiles = data.items.length;
      st.lastItems = data.items.map(function (item) { return { file: item.file, id: item.id || '', name: item.name || '', kind: item.kind || '', mtimeMs: Number(item.mtimeMs || 0) }; });

      var previousRecords = st.records && typeof st.records === 'object' ? st.records : {};
      var nextRecords = {};
      var nextIds = new Set();
      var prototypes = typeof deps.getPrototypes === 'function' ? deps.getPrototypes() : [];
      var currentManagedById = new Map();
      prototypes.forEach(function (prefab) {
        if (prefab && prefab.assetManaged && prefab.id) currentManagedById.set(String(prefab.id), prefab);
      });

      var imported = 0;
      var reused = 0;
      var refreshed = 0;
      var skipped = 0;

      for (var i = 0; i < data.items.length; i++) {
        var item = data.items[i] || {};
        var itemFile = String(item.file || '');
        var itemId = String(item.id || '').trim();
        var recordKey = itemFile || itemId || ('index-' + i);
        var mtimeMs = Number(item.mtimeMs || 0);
        nextRecords[recordKey] = { file: itemFile, id: itemId, name: String(item.name || ''), kind: String(item.kind || ''), mtimeMs: mtimeMs };
        var existingPrefab = itemId ? currentManagedById.get(itemId) : null;
        var previousRecord = previousRecords[recordKey];
        var canReuseExisting = !!(existingPrefab && previousRecord && previousRecord.id === itemId && Number(previousRecord.mtimeMs || 0) === mtimeMs);

        if (canReuseExisting) {
          nextIds.add(itemId);
          reused += 1;
          if (typeof deps.logAssetScanPrefabDecision === 'function') deps.logAssetScanPrefabDecision('reused-existing-prefab', item, { requestId: requestId, reason: 'same-mtime' });
          continue;
        }

        if (typeof deps.logAssetScanPrefabDecision === 'function') deps.logAssetScanPrefabDecision(existingPrefab ? 'refresh-existing-prefab' : 'reimport-required', item, {
          requestId: requestId,
          reason: existingPrefab ? 'mtime-changed-or-record-missing' : 'new-or-missing-prefab',
          action: existingPrefab ? 'update-existing' : 'append-new'
        });

        try {
          var assetResult = await assetApi.fetchJsonAsset('assets/prefabs/' + encodeURIComponent(itemFile) + '?t=' + (mtimeMs || Date.now()));
          var def = assetResult.data;
          var importedDef = typeof deps.importPrefabDefinition === 'function'
            ? deps.importPrefabDefinition(def, { persist: false, source: 'assets:' + itemFile, sourceKind: 'asset', select: false })
            : null;
          if (importedDef) {
            nextIds.add(importedDef.id);
            if (existingPrefab) refreshed += 1;
            else imported += 1;
          } else {
            skipped += 1;
            if (typeof deps.logAssetScanPrefabDecision === 'function') deps.logAssetScanPrefabDecision('skipped', item, { requestId: requestId, reason: 'import-returned-null' });
          }
        } catch (err) {
          skipped += 1;
          pushLog('prefab-assets:error file=' + itemFile + ' ' + (err && err.message ? err.message : err));
          if (typeof deps.logAssetScanPrefabDecision === 'function') deps.logAssetScanPrefabDecision('skipped', item, { requestId: requestId, reason: String(err && err.message ? err.message : err) });
        }
      }

      var removed = 0;
      Array.from(st.ids || []).forEach(function (id) {
        if (nextIds.has(id)) return;
        var currentPrototypes = typeof deps.getPrototypes === 'function' ? deps.getPrototypes() : [];
        var idx = currentPrototypes.findIndex(function (p) { return p && p.id === id && p.assetManaged; });
        if (idx >= 0) {
          currentPrototypes.splice(idx, 1);
          if (typeof deps.recordPrefabRegistryWrite === 'function') {
            deps.recordPrefabRegistryWrite('src/core/state/prefab-registry.js', 'removeAssetManagedPrefab', { source: 'asset-management:scan-remove-missing', prefabId: id, prototypeCount: currentPrototypes.length });
          }
          removed += 1;
        }
      });

      st.ids.clear();
      nextIds.forEach(function (id) { st.ids.add(id); });
      if (typeof deps.setAssetManagedPrefabIds === 'function') deps.setAssetManagedPrefabIds(st.ids);
      st.records = nextRecords;
      var registryApi = typeof deps.getPrefabRegistryWriteApi === 'function' ? deps.getPrefabRegistryWriteApi() : null;
      if (registryApi && typeof registryApi.refreshPrototypeSelection === 'function') registryApi.refreshPrototypeSelection({ source: 'asset-management:scan-complete' });
      else if (typeof deps.refreshPrefabSelectOptions === 'function') deps.refreshPrefabSelectOptions('asset-management:scan-complete');
      st.importedCount = imported + refreshed;
      st.lastAt = Date.now();
      lastAssetPrefabScanAt = st.lastAt;
      if (typeof deps.setLastAssetPrefabScanAt === 'function') deps.setLastAssetPrefabScanAt(st.lastAt);
      st.lastSummary = '扫描 ' + data.items.length + ' 个文件，新增 ' + imported + ' 个，刷新 ' + refreshed + ' 个，复用 ' + reused + ' 个';
      var finalPrototypes = typeof deps.getPrototypes === 'function' ? deps.getPrototypes() : [];
      pushLog('prefab-assets: scanned files=' + data.items.length + ' imported=' + imported + ' refreshed=' + refreshed + ' reused=' + reused + ' removed=' + removed + ' skipped=' + skipped + ' prototypeCount=' + finalPrototypes.length);
      if (typeof deps.logRequestOrchestration === 'function') deps.logRequestOrchestration('done', { owner: logOwner, flow: 'asset-scan', requestId: requestId, files: data.items.length, imported: imported, refreshed: refreshed, reused: reused, removed: removed, skipped: skipped });
      if (typeof deps.refreshAssetScanStatus === 'function') deps.refreshAssetScanStatus();
      return true;
    } catch (err) {
      st.lastError = String(err && err.message ? err.message : err);
      st.lastSummary = '扫描失败';
      pushLog('prefab-assets:error requestId=' + requestId + ' ' + st.lastError);
      if (typeof deps.logRequestOrchestration === 'function') deps.logRequestOrchestration('skipped', { owner: logOwner, flow: 'asset-scan', requestId: requestId, reason: st.lastError });
      if (typeof deps.refreshAssetScanStatus === 'function') deps.refreshAssetScanStatus();
      return false;
    } finally {
      st.inFlight = false;
      if (typeof deps.setAssetPrefabScanInFlight === 'function') deps.setAssetPrefabScanInFlight(false);
      if (typeof deps.refreshAssetScanStatus === 'function') deps.refreshAssetScanStatus();
    }
  }

  var api = {
    owner: OWNER,
    ensureAssetPrefabScanState: ensureAssetPrefabScanState,
    getAssetPrefabScanSnapshot: getAssetPrefabScanSnapshot,
    markAssetManagedPrefab: markAssetManagedPrefab,
    scanAssetPrefabs: scanAssetPrefabs,
  };

  global.__ASSET_PREFAB_SCAN_SERVICE__ = api;
})(typeof window !== 'undefined' ? window : globalThis);
