(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/infrastructure/self-check/self-check.js';
  var PHASE = 'P8X';
  var lastReport = null;
  var inFlightPromise = null;

  function getUi() { try { return window.ui || null; } catch (_) { return null; } }
  function log(line, extra) {
    var text = '[SELF-CHECK] ' + String(line || '');
    if (typeof extra !== 'undefined') { try { text += ' ' + JSON.stringify(extra); } catch (_) {} }
    try { if (typeof pushLog === 'function') pushLog(text); else console.log(text); } catch (_) {}
    var ui = getUi(); if (ui && ui.selfCheckStatus) ui.selfCheckStatus.textContent = text;
    return text;
  }
  function nowIso() { return new Date().toISOString(); }
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function readQueryFlag(name) {
    try { var params = new URLSearchParams(window.location.search || ''); var raw = params.get(name); return raw != null && (raw === '' || raw === '1' || raw === 'true' || raw === 'yes'); } catch (_) { return false; }
  }
  function getAppPath(path) {
    try {
      var parts = String(path || '').split('.').filter(Boolean); var node = window.App;
      for (var i = 0; i < parts.length; i++) { if (!node) return undefined; node = node[parts[i]]; }
      return node;
    } catch (_) { return undefined; }
  }

  function cloneJson(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
  }
  function buildPortableCoreContext() {
    var selectors = getAppPath('state.selectors');
    var runtimeState = getAppPath('state.runtimeState');
    var prefabRegistry = getAppPath('state.prefabRegistry');
    var sceneSession = getAppPath('state.sceneSession');
    var sceneIo = window.__SCENE_STORAGE_IO_API || null;
    var prefabs = prefabRegistry && typeof prefabRegistry.getPrototypes === 'function' ? prefabRegistry.getPrototypes() : (Array.isArray(window.prototypes) ? window.prototypes : []);
    var snapshot = sceneIo && typeof sceneIo.buildSceneSnapshot === 'function'
      ? sceneIo.buildSceneSnapshot({ kind: 'persistent', log: false, source: 'self-check:portable-core-context' })
      : {
          instances: sceneSession && typeof sceneSession.getInstances === 'function' ? cloneJson(sceneSession.getInstances()) : [],
          boxes: sceneSession && typeof sceneSession.getBoxes === 'function' ? cloneJson(sceneSession.getBoxes()) : [],
          lights: Array.isArray(typeof lights !== 'undefined' ? lights : null) ? cloneJson(lights) : []
        };
    var settingsRef = runtimeState && runtimeState.settings ? runtimeState.settings : null;
    var world = settingsRef ? {
      worldCols: Number(settingsRef.worldCols || 0),
      worldRows: Number(settingsRef.worldRows || 0),
      gridW: Number(settingsRef.gridW || settingsRef.worldCols || 0),
      gridH: Number(settingsRef.gridH || settingsRef.worldRows || 0),
      worldResolution: Number(settingsRef.worldResolution || 1),
      worldDisplayScale: Number(settingsRef.worldDisplayScale || 1),
      tileScale: Number(settingsRef.tileScale || 1),
      tileW: Number(settingsRef.tileW || 0),
      tileH: Number(settingsRef.tileH || 0)
    } : null;
    var context = {
      source: 'self-check:portable-core-context',
      sceneCore: getAppPath('domain.sceneCore'),
      selectors: selectors || null,
      sceneSnapshot: snapshot,
      prefabs: Array.isArray(prefabs) ? prefabs : [],
      existingBoxes: snapshot && Array.isArray(snapshot.boxes) ? snapshot.boxes : [],
      playerBox: (typeof getPlayerProxyBox === 'function') ? getPlayerProxyBox() : null,
      world: world,
      grid: world,
      runtimeSummary: selectors && typeof selectors.getRuntimeSummary === 'function' ? selectors.getRuntimeSummary() : null,
      lightingSummary: selectors && typeof selectors.getLightingSummary === 'function' ? selectors.getLightingSummary() : null,
      domSummary: selectors && typeof selectors.getDomSummary === 'function' ? selectors.getDomSummary() : null,
      selectedPrefabId: selectors && typeof selectors.getSelectedPrefabId === 'function' ? selectors.getSelectedPrefabId() : null
    };
    context.summary = {
      hasSceneCore: !!context.sceneCore,
      prefabCount: Array.isArray(context.prefabs) ? context.prefabs.length : 0,
      sceneInstances: snapshot && Array.isArray(snapshot.instances) ? snapshot.instances.length : 0,
      sceneBoxes: snapshot && Array.isArray(snapshot.boxes) ? snapshot.boxes.length : 0,
      hasPlayerBox: !!context.playerBox,
      hasWorld: !!context.world,
      source: context.source
    };
    return context;
  }
  async function fetchJson(url, options) {
    var res = await fetch(url, options || {}); var text = await res.text(); var data = null; try { data = text ? JSON.parse(text) : null; } catch (_) {}
    return { response: res, rawText: text, data: data };
  }
  function record(checks, group, name, ok, detail) {
    var item = { group: group, name: name, ok: !!ok, detail: detail || null, at: nowIso() }; checks.push(item); log(group + ':' + name + ':' + (ok ? 'ok' : 'fail'), detail || null); return item;
  }
  function summarizeChecks(checks) {
    var total = checks.length, failed = checks.filter(function (c) { return !c.ok; });
    var groups = {};
    checks.forEach(function (item) { groups[item.group] = groups[item.group] || { total: 0, failed: 0 }; groups[item.group].total += 1; if (!item.ok) groups[item.group].failed += 1; });
    return { total: total, passed: total - failed.length, failed: failed.length, groups: groups };
  }
  async function saveReportToServer(report) {
    try {
      var result = await fetchJson('/api/self-check/report', { method: 'POST', headers: { 'Content-Type': 'application/json;charset=utf-8' }, body: JSON.stringify({ report: report, filenameHint: 'self-check-' + Date.now() + '.json' }) });
      return { ok: !!(result.response && result.response.ok && result.data && result.data.ok), status: result.response ? result.response.status : 0, data: result.data || null };
    } catch (err) { return { ok: false, status: 0, error: String(err && err.message ? err.message : err) }; }
  }
  function downloadReport(report) {
    var blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'isometric-self-check-' + Date.now() + '.json'; a.click(); URL.revokeObjectURL(url);
  }
  async function waitForBootstrapReady(timeoutMs) {
    var started = Date.now();
    while ((Date.now() - started) < timeoutMs) {
      var ready = !!getAppPath('services.sceneApi') && !!getAppPath('services.prefabApi') && !!getAppPath('controllers.main') && !!getAppPath('domain.sceneCore');
      if (ready) return true;
      await sleep(150);
    }
    return false;
  }
  async function runSelfCheck(options) {
    options = options || {};
    if (inFlightPromise) return inFlightPromise;
    inFlightPromise = (async function () {
      var checks = [];
      log('start', { owner: OWNER, phase: PHASE });
      var ready = await waitForBootstrapReady(Number(options.bootstrapTimeoutMs || 12000));
      record(checks, 'bootstrap', 'ready', ready, { waitedMs: Number(options.bootstrapTimeoutMs || 12000) });
      var nsSummary = (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.summarize === 'function') ? window.__APP_NAMESPACE.summarize() : null;
      record(checks, 'architecture', 'namespace', !!nsSummary, nsSummary || {});
      record(checks, 'architecture', 'controllers', !!getAppPath('controllers.main') && !!getAppPath('controllers.assetLibrary') && !!getAppPath('controllers.editorHandoff'), { main: !!getAppPath('controllers.main'), assetLibrary: !!getAppPath('controllers.assetLibrary'), editorHandoff: !!getAppPath('controllers.editorHandoff') });
      record(checks, 'architecture', 'workflows', !!getAppPath('services.assetWorkflow') && !!getAppPath('services.sceneWorkflow'), { assetWorkflow: !!getAppPath('services.assetWorkflow'), sceneWorkflow: !!getAppPath('services.sceneWorkflow') });
      record(checks, 'architecture', 'portableCore', !!getAppPath('domain.portableCore'), getAppPath('domain.portableCore') && getAppPath('domain.portableCore').summarizeBoundary ? getAppPath('domain.portableCore').summarizeBoundary() : {});
      try { var health = await fetchJson('/api/health'); record(checks, 'server', 'health', !!(health.response && health.response.ok && health.data && health.data.ok), health.data || {}); } catch (err) { record(checks, 'server', 'health', false, { error: String(err && err.message ? err.message : err) }); }
      try { var sceneDefault = await fetchJson('/api/scenes/default'); record(checks, 'server', 'scene-default', !!(sceneDefault.response && sceneDefault.response.ok), sceneDefault.data || {}); } catch (err) { record(checks, 'server', 'scene-default', false, { error: String(err && err.message ? err.message : err) }); }
      try { var prefabIndex = await fetchJson('/api/prefabs/index'); record(checks, 'server', 'prefab-index', !!(prefabIndex.response && prefabIndex.response.ok), { status: prefabIndex.response ? prefabIndex.response.status : 0, items: prefabIndex.data && Array.isArray(prefabIndex.data.items) ? prefabIndex.data.items.length : 0 }); } catch (err) { record(checks, 'server', 'prefab-index', false, { error: String(err && err.message ? err.message : err) }); }
      try {
        var habboConfig = await fetchJson('/api/habbo/config');
        var habboOk = !!(habboConfig.response && habboConfig.response.ok && habboConfig.data && habboConfig.data.ok);
        record(checks, 'server', 'habbo-config', habboOk, habboConfig.data || {});
        if (habboOk && habboConfig.data && habboConfig.data.configured && habboConfig.data.exists) {
          var summary = await fetchJson('/api/habbo/library/summary?reqId=self-check-summary');
          record(checks, 'habbo', 'summary', !!(summary.response && summary.response.ok && summary.data && summary.data.ok), { status: summary.response ? summary.response.status : 0, totalItems: summary.data ? summary.data.totalItems : 0, pending: summary.data ? !!summary.data.pending : null });
          var page = await fetchJson('/api/habbo/library/page?type=room&category=all&page=1&pageSize=1&reqId=self-check-page');
          record(checks, 'habbo', 'page', !!(page.response && page.response.ok && page.data && page.data.ok), { status: page.response ? page.response.status : 0, total: page.data ? page.data.total : 0, items: page.data && Array.isArray(page.data.items) ? page.data.items.length : 0 });
        }
      } catch (err) { record(checks, 'habbo', 'summary-page', false, { error: String(err && err.message ? err.message : err) }); }
      var selectors = getAppPath('state.selectors');
      var originalMode = selectors && typeof selectors.getEditorMode === 'function' ? selectors.getEditorMode() : (window.editor ? window.editor.mode : null);
      var originalPrefabId = selectors && typeof selectors.getSelectedPrefabId === 'function' ? selectors.getSelectedPrefabId() : null;
      try {
        var modeResult = window.App && window.App.controllers && typeof window.App.controllers.dispatch === 'function' ? window.App.controllers.dispatch('placement', 'handleModeButton', ['place', 'self-check']) : null;
        if (modeResult && typeof modeResult.then === 'function') await modeResult;
        var afterMode = selectors && typeof selectors.getEditorMode === 'function' ? selectors.getEditorMode() : (window.editor ? window.editor.mode : null);
        record(checks, 'controller', 'mode-place', String(afterMode) === 'place', { before: originalMode, after: afterMode });
      } catch (err) { record(checks, 'controller', 'mode-place', false, { error: String(err && err.message ? err.message : err) }); }
      try { if (window.App && window.App.controllers && typeof window.App.controllers.dispatch === 'function' && originalMode) { var restoreMode = window.App.controllers.dispatch('placement', 'handleModeButton', [originalMode, 'self-check:restore']); if (restoreMode && typeof restoreMode.then === 'function') await restoreMode; } } catch (_) {}
      try {
        var protoList = Array.isArray(window.prototypes) ? window.prototypes : [];
        var targetPrefabId = protoList.some(function (p) { return p && p.id === 'custom_prefab_01'; }) ? 'custom_prefab_01' : ((protoList[0] && protoList[0].id) || null);
        var selResult = targetPrefabId && window.App && window.App.controllers && typeof window.App.controllers.dispatch === 'function' ? window.App.controllers.dispatch('placement', 'selectPrefabById', [targetPrefabId, 'self-check']) : null;
        if (selResult && typeof selResult.then === 'function') await selResult;
        var afterPrefab = selectors && typeof selectors.getSelectedPrefabId === 'function' ? selectors.getSelectedPrefabId() : null;
        record(checks, 'controller', 'select-prefab', !!targetPrefabId && String(afterPrefab) === String(targetPrefabId), { target: targetPrefabId, selected: afterPrefab });
      } catch (err) { record(checks, 'controller', 'select-prefab', false, { error: String(err && err.message ? err.message : err) }); }
      try { if (window.App && window.App.controllers && typeof window.App.controllers.dispatch === 'function' && originalPrefabId) { var restorePrefab = window.App.controllers.dispatch('placement', 'selectPrefabById', [originalPrefabId, 'self-check:restore']); if (restorePrefab && typeof restorePrefab.then === 'function') await restorePrefab; } } catch (_) {}
      try {
        var portableCore = getAppPath('domain.portableCore');
        var portableContext = buildPortableCoreContext();
        var chosenId = originalPrefabId || (portableContext.prefabs[0] && portableContext.prefabs[0].id) || null;
        var evalResult = portableCore && typeof portableCore.findFirstValidPlacement === 'function' && chosenId
          ? portableCore.findFirstValidPlacement(portableContext, chosenId)
          : { ok: false, reason: 'portable-core-unavailable' };
        record(checks, 'portable-core', 'find-first-placement', !!(evalResult && evalResult.ok), {
          context: portableContext.summary,
          result: evalResult || {}
        });
      } catch (err) { record(checks, 'portable-core', 'find-first-placement', false, { error: String(err && err.message ? err.message : err) }); }
      try {
        var portableCoreApi = getAppPath('domain.portableCore');
        var portableSnapshotContext = buildPortableCoreContext();
        var snapshot = portableCoreApi && typeof portableCoreApi.buildPortableSceneSnapshot === 'function'
          ? portableCoreApi.buildPortableSceneSnapshot(portableSnapshotContext, { kind: 'persistent' })
          : null;
        record(checks, 'portable-core', 'snapshot', !!snapshot, snapshot ? {
          context: portableSnapshotContext.summary,
          instances: snapshot.scene && Array.isArray(snapshot.scene.instances) ? snapshot.scene.instances.length : 0,
          prefabs: Array.isArray(snapshot.prefabs) ? snapshot.prefabs.length : 0
        } : {});
      } catch (err) { record(checks, 'portable-core', 'snapshot', false, { error: String(err && err.message ? err.message : err) }); }
      var portableBoundary = getAppPath('domain.portableCore') && typeof getAppPath('domain.portableCore').summarizeBoundary === 'function' ? getAppPath('domain.portableCore').summarizeBoundary() : null;
      var report = {
        generatedAt: nowIso(), phase: PHASE, owner: OWNER,
        entry: (typeof APP_ENTRY_INFO !== 'undefined' && APP_ENTRY_INFO) ? APP_ENTRY_INFO : null,
        query: String(window.location.search || ''), namespace: nsSummary,
        fallbackStats: window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getFallbackStats === 'function' ? window.__APP_NAMESPACE.getFallbackStats() : null,
        checks: checks, summary: summarizeChecks(checks),
        portableBoundary: portableBoundary,
        assetWorkflow: getAppPath('services.assetWorkflow') && typeof getAppPath('services.assetWorkflow').summarize === 'function' ? getAppPath('services.assetWorkflow').summarize() : null,
        sceneWorkflow: getAppPath('services.sceneWorkflow') && typeof getAppPath('services.sceneWorkflow').summarize === 'function' ? getAppPath('services.sceneWorkflow').summarize() : null
      };
      if (options.saveToServer !== false) report.savedToServer = await saveReportToServer(report);
      lastReport = report;
      if (options.download !== false) try { downloadReport(report); } catch (_) {}
      var ui = getUi(); if (ui && ui.selfCheckStatus) ui.selfCheckStatus.textContent = '自检完成：通过 ' + report.summary.passed + ' / ' + report.summary.total + '，失败 ' + report.summary.failed + ((report.savedToServer && report.savedToServer.ok && report.savedToServer.data) ? (' · 已保存 ' + String(report.savedToServer.data.path || '')) : '');
      log('done', report.summary);
      return report;
    })();
    try { return await inFlightPromise; } finally { inFlightPromise = null; }
  }
  function getLastReport() { return lastReport; }
  var api = { phase: PHASE, owner: OWNER, runSelfCheck: runSelfCheck, getLastReport: getLastReport, downloadLastReport: function () { if (lastReport) downloadReport(lastReport); return !!lastReport; } };
  try { if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') window.__APP_NAMESPACE.bind('debug.selfCheck', api, { owner: OWNER, phase: PHASE }); else { window.App = window.App || {}; window.App.debug = window.App.debug || {}; window.App.debug.selfCheck = api; } } catch (_) {}
  window.addEventListener('load', function () { if (readQueryFlag('selfCheck')) { setTimeout(function () { api.runSelfCheck({ saveToServer: true, download: readQueryFlag('selfCheckDownload') }); }, 1200); } });
})();
