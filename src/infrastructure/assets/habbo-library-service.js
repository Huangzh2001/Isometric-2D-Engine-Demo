// P11d-2: Habbo library service owner.
// Owns Habbo library summary/page/index fetch orchestration.
(function installHabboLibraryService(global) {
  'use strict';

  var OWNER = 'src/infrastructure/assets/habbo-library-service.js';

async function fetchHabboLibrarySummary(forceOrOptions) {
  var options = (typeof forceOrOptions === 'object' && forceOrOptions !== null) ? forceOrOptions : { force: !!forceOrOptions };
  var force = !!options.force;
  var workflow = shouldUseAssetWorkflowCompat(options) ? getAssetWorkflowCompatApi() : null;
  if (workflow && typeof workflow.ensureHabboLibrarySummary === 'function') {
    await workflow.ensureHabboLibrarySummary(Object.assign({}, options, { force: force, __fromLegacyCompat: true, source: options.source || 'asset-management:compat:ensureHabboLibrarySummary' }));
    return habboLibraryState;
  }
  if (habboRootConfigInFlightPromise) await awaitHabboRootConfigInFlight(options.source || 'fetchHabboLibrarySummary');
  if (!habboRootSupported()) {
    habboLibraryState.summaryLoaded = false;
    habboLibraryState.summaryPending = false;
    habboLibraryState.loadError = '当前不是本地 server 模式，无法读取外部 Habbo 资源库。';
    setHabboLibraryDebugText(['serverMode=false']);
    return habboLibraryState;
  }
  if (habboLibraryState.summaryLoading && habboLibraryState.summaryPromise) {
    habboLibraryLog('summary-fetch:reuse inFlight=true force=' + (!!force));
    logRequestOrchestration('reused', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-summary', reason: 'in-flight', force: !!force });
    return await habboLibraryState.summaryPromise;
  }
  if (habboLibraryState.summaryLoaded && !force && !habboLibraryState.summaryPending) {
    if (Number(habboLibraryState.totalItems || 0) <= 0 && Number((habboAssetRootState && habboAssetRootState.itemCount) || 0) > 0) {
      habboLibraryLog('summary-fetch:cached-empty-summary-stale rootCount=' + Number((habboAssetRootState && habboAssetRootState.itemCount) || 0) + ' total=' + Number(habboLibraryState.totalItems || 0) + ' mode=' + String(habboLibraryState.libraryMode || ''));
      logRequestOrchestration('skipped', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-summary', reason: 'cached-empty-summary-stale', force: !!force });
    } else {
      logRequestOrchestration('reused', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-summary', reason: 'cached-summary', force: !!force });
      return habboLibraryState;
    }
  }
  habboLibraryState.summaryLoading = true;
  habboLibraryState.loading = true;
  habboLibraryState.summaryPending = false;
  habboLibraryState.loadError = '';
  var requestId = ++habboLibraryState.summaryRequestSeq;
  var startedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  habboLibraryState.lastSummaryStartedAt = Date.now();
  habboLibraryLog('summary-fetch:start force=' + (!!force) + ' root=' + String((habboAssetRootState && habboAssetRootState.root) || '') + ' requestId=' + requestId);
  logRequestOrchestration('start', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-summary', requestId: requestId, force: !!force });
  var controller = makeHabboLibraryAbortController();
  var slowWarn1 = setTimeout(function () { habboLibraryLog('summary-fetch:slow requestId=' + requestId + ' waitedMs=2000'); }, 2000);
  var slowWarn2 = setTimeout(function () { habboLibraryLog('summary-fetch:slow requestId=' + requestId + ' waitedMs=8000'); }, 8000);
  var slowWarn3 = setTimeout(function () { habboLibraryLog('summary-fetch:slow requestId=' + requestId + ' waitedMs=20000'); }, 20000);
  var slowWarn4 = setTimeout(function () { habboLibraryLog('summary-fetch:slow requestId=' + requestId + ' waitedMs=40000'); }, 40000);
  var promise = (async function () {
    try {
      var habboApi = getHabboApiAdapter();
      var summaryResult = await habboApi.fetchLibrarySummary({ requestId: requestId, signal: controller ? controller.signal : undefined });
      var res = summaryResult.response;
      var data = summaryResult.data;
      if (data && data.reqId) habboLibraryLog('summary-fetch:server-req-id requestId=' + requestId + ' serverReqId=' + String(data.reqId));
      if (data && data.buildState) habboLibraryLog('summary-fetch:build-state requestId=' + requestId + ' startedAtMs=' + Number(data.buildState.startedAtMs || 0) + ' elapsedMs=' + Number(data.buildState.elapsedMs || 0));
      if (data && data.debug) habboLibraryLog('summary-fetch:server-debug requestId=' + requestId + ' branch=' + String(data.debug.branch || '') + ' rootCount=' + Number(data.debug.rootCount || 0) + ' indexExists=' + String(!!data.debug.indexExists) + ' indexSize=' + Number(data.debug.indexSize || 0) + ' recordSource=' + String(data.debug.recordSource || '') + ' itemsFieldKind=' + String(data.debug.itemsFieldKind || '') + ' itemsFieldCount=' + Number(data.debug.itemsFieldCount || 0) + ' totalItemsField=' + Number(data.debug.totalItemsField || 0) + ' topKeys=' + JSON.stringify(data.debug.topLevelKeys || []) + ' summaryKeys=' + JSON.stringify(data.debug.summaryFieldKeys || []) + ' firstRecordKeys=' + JSON.stringify(data.debug.firstRecordKeys || []));
      if (data && data.tracebackTail) habboLibraryLog('summary-fetch:server-trace requestId=' + requestId + ' tail=' + JSON.stringify(data.tracebackTail));
      if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
      habboLibraryState.libraryMode = String(data.libraryMode || '');
      habboLibraryState.lastAt = Date.now();
      if (data.pending) {
        habboLibraryState.summaryLoaded = false;
        habboLibraryState.loaded = false;
        habboLibraryState.summaryPending = true;
        habboLibraryState.categoriesByType = { room: [], wall: [] };
        habboLibraryState.totalsByType = { room: 0, wall: 0 };
        habboLibraryState.totalItems = 0;
        var pendingElapsed = Number((data.buildState && data.buildState.elapsedMs) || 0);
        setHabboLibraryDebugText([
          'build=' + habboLibraryState.versionTag,
          'mode=' + String(data.libraryMode || ''),
          'root=' + String(data.root || ''),
          'configured=' + String(!!data.configured) + ' exists=' + String(!!data.exists),
          'pending=true elapsedMs=' + pendingElapsed,
          'hint=索引构建中，请等待自动轮询完成',
        ]);
        habboLibraryLog('summary-fetch:pending requestId=' + requestId + ' elapsedMs=' + pendingElapsed);
        if (pendingElapsed >= 6000) habboLibraryLog('summary-fetch:waiting-for-server-build requestId=' + requestId + ' elapsedMs=' + pendingElapsed);
        habboLibraryLog('summary-fetch:pending-wait requestId=' + requestId + ' nextPollMs=1500');
        logRequestOrchestration('done', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-summary', requestId: requestId, pending: true, elapsedMs: pendingElapsed });
        scheduleHabboLibrarySummaryPoll('server-pending');
        return habboLibraryState;
      }
      clearHabboLibrarySummaryPoll();
      habboLibraryState.summaryPending = false;
      habboLibraryState.summaryLoaded = true;
      habboLibraryState.loaded = true;
      habboLibraryState.loadError = '';
      habboLibraryState.totalsByType = {
        room: Number((data.totalsByType && data.totalsByType.room) || 0),
        wall: Number((data.totalsByType && data.totalsByType.wall) || 0),
      };
      habboLibraryState.totalItems = Number(data.totalItems || 0);
      habboLibraryState.categoriesByType = {
        room: Array.isArray(data.categoriesRoom) ? data.categoriesRoom : [],
        wall: Array.isArray(data.categoriesWall) ? data.categoriesWall : [],
      };
      if (habboLibraryState.activeCategory !== 'all') {
        var cats = getHabboLibraryCategoriesForType(habboLibraryState.activeType || 'room');
        if (!cats.some(function (x) { return String(x.key) === String(habboLibraryState.activeCategory); })) habboLibraryState.activeCategory = 'all';
      }
      var finishedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      var durationMs = Math.round(finishedAt - startedAt);
      habboLibraryState.lastSummaryFinishedAt = Date.now();
      setHabboLibraryDebugText([
        'build=' + habboLibraryState.versionTag,
        'mode=' + String(data.libraryMode || ''),
        'root=' + String(data.root || ''),
        'configured=' + String(!!data.configured) + ' exists=' + String(!!data.exists),
        'total=' + habboLibraryState.totalItems + ' room=' + habboLibraryState.totalsByType.room + ' wall=' + habboLibraryState.totalsByType.wall,
        'roomCategories=' + getHabboLibraryCategoriesForType('room').length + ' wallCategories=' + getHabboLibraryCategoriesForType('wall').length,
        'requestId=' + requestId + ' durationMs=' + durationMs + ' serverBuildMs=' + Number(data.buildMs || 0),
      ]);
      habboLibraryLog('summary-fetch:done requestId=' + requestId + ' total=' + habboLibraryState.totalItems + ' room=' + habboLibraryState.totalsByType.room + ' wall=' + habboLibraryState.totalsByType.wall + ' roomCats=' + getHabboLibraryCategoriesForType('room').length + ' wallCats=' + getHabboLibraryCategoriesForType('wall').length + ' durationMs=' + durationMs + ' serverBuildMs=' + Number(data.buildMs || 0));
      if (Number(habboLibraryState.totalItems || 0) <= 0 && Number((data && data.itemCount) || (habboAssetRootState && habboAssetRootState.itemCount) || 0) > 0) {
        habboLibraryLog('summary-fetch:empty-inconsistent requestId=' + requestId + ' rootCount=' + Number((data && data.itemCount) || (habboAssetRootState && habboAssetRootState.itemCount) || 0) + ' total=' + Number(habboLibraryState.totalItems || 0) + ' mode=' + String(data && data.libraryMode || '') + ' branch=' + String(data && data.debug && data.debug.branch || '') + ' recordSource=' + String(data && data.debug && data.debug.recordSource || '') + ' itemsFieldCount=' + Number(data && data.debug && data.debug.itemsFieldCount || 0) + ' totalItemsField=' + Number(data && data.debug && data.debug.totalItemsField || 0));
      }
      logRequestOrchestration('done', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-summary', requestId: requestId, pending: false, total: habboLibraryState.totalItems, durationMs: durationMs });
    } catch (err) {
      clearHabboLibrarySummaryPoll();
      habboLibraryState.summaryLoaded = false;
      habboLibraryState.loaded = false;
      habboLibraryState.summaryPending = false;
      habboLibraryState.loadError = String(err && err.message ? err.message : err);
      try {
        habboLibraryLog('summary-fetch:error-detail requestId=' + requestId + ' name=' + String(err && err.name || '') + ' message=' + String(err && err.message || err) + ' online=' + String(typeof navigator !== 'undefined' ? navigator.onLine : 'unknown'));
        if (err && err.stack) habboLibraryLog('summary-fetch:error-stack requestId=' + requestId + ' stack=' + String(err.stack).split('\n').slice(0,6).join(' | '));
      } catch (_) {}
      habboLibraryState.categoriesByType = { room: [], wall: [] };
      habboLibraryState.totalsByType = { room: 0, wall: 0 };
      habboLibraryState.totalItems = 0;
      setHabboLibraryDebugText(['summary-error=' + habboLibraryState.loadError, 'requestId=' + requestId]);
      habboLibraryLog('summary-fetch:error requestId=' + requestId + ' ' + habboLibraryState.loadError);
      logRequestOrchestration('skipped', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-summary', requestId: requestId, reason: habboLibraryState.loadError });
    } finally {
      clearTimeout(slowWarn1); clearTimeout(slowWarn2); clearTimeout(slowWarn3); clearTimeout(slowWarn4);
      habboLibraryState.summaryLoading = false;
      habboLibraryState.loading = false;
      habboLibraryState.summaryPromise = null;
    }
    return habboLibraryState;
  })();
  habboLibraryState.summaryPromise = promise;
  return await promise;
}

async function fetchHabboLibraryPage(forceOrOptions) {
  var options = (typeof forceOrOptions === 'object' && forceOrOptions !== null) ? forceOrOptions : { force: !!forceOrOptions };
  if (habboRootConfigInFlightPromise) await awaitHabboRootConfigInFlight(options.source || 'fetchHabboLibraryPage');
  var force = !!options.force;
  var workflow = shouldUseAssetWorkflowCompat(options) ? getAssetWorkflowCompatApi() : null;
  if (workflow && typeof workflow.ensureHabboLibraryPage === 'function') {
    await workflow.ensureHabboLibraryPage(Object.assign({}, options, { force: force, __fromLegacyCompat: true, source: options.source || 'asset-management:compat:ensureHabboLibraryPage' }));
    return habboLibraryState;
  }
  if (!habboRootSupported()) {
    habboLibraryState.loadError = '当前不是本地 server 模式，无法读取外部 Habbo 资源库。';
    return habboLibraryState;
  }
  if (habboLibraryState.summaryPending) {
    habboLibraryLog('page-fetch:blocked summaryPending=true');
    logRequestOrchestration('skipped', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-page', reason: 'summary-pending' });
    scheduleHabboLibrarySummaryPoll('page-blocked-by-summary');
    return habboLibraryState;
  }
  var key = buildHabboLibraryQueryKey();
  if (habboLibraryState.pageLoading && habboLibraryState.pagePromise) {
    if (String(habboLibraryState.pageInFlightKey || '') === key) {
      habboLibraryLog('page-fetch:reuse inFlight=true key=' + key);
      logRequestOrchestration('reused', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-page', reason: 'in-flight', key: key });
      return await habboLibraryState.pagePromise;
    }
    if (habboLibraryState.pageAbortController) {
      habboLibraryLog('page-fetch:abort previousKey=' + String(habboLibraryState.pageInFlightKey || '') + ' nextKey=' + key);
      try { habboLibraryState.pageAbortController.abort(); } catch (_) {}
    }
  }
  if (!force && habboLibraryState.queryKey === key && Array.isArray(habboLibraryState.items) && habboLibraryState.items.length) {
    logRequestOrchestration('reused', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-page', reason: 'cached-page', key: key });
    return habboLibraryState;
  }
  habboLibraryState.pageLoading = true;
  habboLibraryState.loading = true;
  habboLibraryState.pageInFlightKey = key;
  habboLibraryState.pageAbortController = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var params = new URLSearchParams({
    type: String(habboLibraryState.activeType || 'room'),
    category: String(habboLibraryState.activeCategory || 'all'),
    search: String(habboLibraryState.search || ''),
    page: String(parseInt(habboLibraryState.page || 1, 10) || 1),
    pageSize: String(parseInt(habboLibraryState.pageSize || 15, 10) || 15),
  });
  var requestId = ++habboLibraryState.pageRequestSeq;
  habboLibraryState.pageActiveRequestId = requestId;
  habboLibraryLog('page-fetch:start requestId=' + requestId + ' ' + params.toString());
  logRequestOrchestration('start', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-page', requestId: requestId, query: params.toString() });
  var promise = (async function () {
  try {
    var habboApi = getHabboApiAdapter();
    var pageResult = await habboApi.fetchLibraryPage(params.toString(), { requestId: requestId, signal: habboLibraryState.pageAbortController ? habboLibraryState.pageAbortController.signal : undefined });
    var res = pageResult.response;
    var data = pageResult.data;
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
    if (data && data.debug) habboLibraryLog('page-fetch:server-debug requestId=' + requestId + ' branch=' + String(data.debug.branch || '') + ' rootCount=' + Number(data.debug.rootCount || 0) + ' indexExists=' + String(!!data.debug.indexExists) + ' recordSource=' + String(data.debug.recordSource || '') + ' itemsFieldKind=' + String(data.debug.itemsFieldKind || '') + ' itemsFieldCount=' + Number(data.debug.itemsFieldCount || 0) + ' totalItemsField=' + Number(data.debug.totalItemsField || 0) + ' pageTotal=' + Number(data.debug.pageTotal || data.total || 0) + ' returnedCount=' + Number(data.debug.returnedCount || (Array.isArray(data.items) ? data.items.length : 0)) + ' topKeys=' + JSON.stringify(data.debug.topLevelKeys || []) + ' summaryKeys=' + JSON.stringify(data.debug.summaryFieldKeys || []) + ' firstRecordKeys=' + JSON.stringify(data.debug.firstRecordKeys || []));
    if (data.pending) {
      habboLibraryState.summaryPending = true;
      habboLibraryLog('page-fetch:pending requestId=' + requestId);
      logRequestOrchestration('done', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-page', requestId: requestId, pending: true });
      scheduleHabboLibrarySummaryPoll('page-pending');
      return habboLibraryState;
    }
    var items = Array.isArray(data.items) ? data.items.map(function (item) {
      var swfRel = normalizeHabboRelativePathClient(item.swfRelativePath || item.relativePath || '');
      var iconRel = normalizeHabboRelativePathClient(item.iconRelativePath || '');
      return {
        assetId: String(item.assetId || swfRel || Math.random()),
        prefabId: String(item.prefabId || makeHabboPrefabIdFromRelativePath(swfRel)),
        displayName: String(item.displayName || item.name || stemFromPath(swfRel) || 'Habbo item'),
        classname: String(item.classname || stemFromPath(swfRel) || ''),
        type: String(item.type || 'room').toLowerCase(),
        category: String(item.category || 'other').toLowerCase(),
        furniLine: String(item.furniLine || item.furni_line || 'other').toLowerCase(),
        swfRelativePath: swfRel,
        iconRelativePath: iconRel,
        hasIcon: !!(item.hasIcon || iconRel),
        tags: Array.isArray(item.tags) ? item.tags : [],
      };
    }).filter(function (item) { return !!item.swfRelativePath; }) : [];
    habboLibraryState.items = items;
    habboLibraryState.totalItems = Number(data.total || items.length || 0);
    habboLibraryState.page = Number(data.page || habboLibraryState.page || 1);
    habboLibraryState.totalPages = Number(data.totalPages || 1);
    habboLibraryState.queryKey = key;
    habboLibraryState.loadError = '';
    ensureHabboLibrarySelection();
    var baseLines = (habboLibraryState.debugText || '').split('\n').filter(Boolean).filter(function (line) {
      return line.indexOf('query=') !== 0 && line.indexOf('pageItems=') !== 0 && line.indexOf('first=') !== 0;
    });
    baseLines.push(
      'query=' + params.toString(),
      'pageItems=' + items.length + ' total=' + habboLibraryState.totalItems + ' totalPages=' + habboLibraryState.totalPages,
      'first=' + (items[0] ? (items[0].displayName + ' [' + items[0].swfRelativePath + ']') : 'none')
    );
    setHabboLibraryDebugText(baseLines);
    habboLibraryLog('page-fetch:done requestId=' + requestId + ' items=' + items.length + ' total=' + habboLibraryState.totalItems + ' totalPages=' + habboLibraryState.totalPages + ' first=' + (items[0] ? items[0].classname : 'none'));
    if (Number(habboLibraryState.totalItems || 0) <= 0 && Number((habboAssetRootState && habboAssetRootState.itemCount) || 0) > 0) {
      habboLibraryLog('page-fetch:empty-inconsistent requestId=' + requestId + ' rootCount=' + Number((habboAssetRootState && habboAssetRootState.itemCount) || 0) + ' total=' + Number(habboLibraryState.totalItems || 0) + ' activeType=' + String(habboLibraryState.activeType || '') + ' activeCategory=' + String(habboLibraryState.activeCategory || '') + ' search=' + JSON.stringify(String(habboLibraryState.search || '')));
    }
    logRequestOrchestration('done', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-page', requestId: requestId, items: items.length, total: habboLibraryState.totalItems, totalPages: habboLibraryState.totalPages });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      habboLibraryLog('page-fetch:aborted requestId=' + requestId + ' key=' + key);
      logRequestOrchestration('skipped', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-page', requestId: requestId, reason: 'aborted', key: key });
      return habboLibraryState;
    }
    habboLibraryState.items = [];
    habboLibraryState.loadError = String(err && err.message ? err.message : err);
    try {
      habboLibraryLog('summary-fetch:error-detail requestId=' + requestId + ' name=' + String(err && err.name || '') + ' message=' + String(err && err.message || err) + ' online=' + String(typeof navigator !== 'undefined' ? navigator.onLine : 'unknown'));
      if (err && err.stack) habboLibraryLog('summary-fetch:error-stack requestId=' + requestId + ' stack=' + String(err.stack).split('\n').slice(0,6).join(' | '));
    } catch (_) {}
    habboLibraryLog('page-fetch:error requestId=' + requestId + ' ' + habboLibraryState.loadError);
    logRequestOrchestration('skipped', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-library-page', requestId: requestId, reason: habboLibraryState.loadError });
  } finally {
    if (habboLibraryState.pageActiveRequestId === requestId) {
      habboLibraryState.pageLoading = false;
      habboLibraryState.loading = false;
      habboLibraryState.pagePromise = null;
      habboLibraryState.pageAbortController = null;
      habboLibraryState.pageInFlightKey = '';
      habboLibraryState.pageActiveRequestId = 0;
    }
  }
  return habboLibraryState;
  })();
  habboLibraryState.pagePromise = promise;
  return await promise;
}

async function fetchHabboLibraryIndex(force) {
  await fetchHabboLibrarySummary(force);
  var browseMode = (String(habboLibraryState.search || '').trim() || String(habboLibraryState.activeCategory || 'all') !== 'all') ? 'items' : 'categories';
  if (browseMode === 'categories') {
    habboLibraryState.items = [];
    habboLibraryState.totalPages = 1;
    habboLibraryState.queryKey = '';
    return habboLibraryState;
  }
  return await fetchHabboLibraryPage(force);
}

  global.__HABBO_LIBRARY_SERVICE__ = {
    owner: OWNER,
    fetchHabboLibrarySummary: fetchHabboLibrarySummary,
    fetchHabboLibraryPage: fetchHabboLibraryPage,
    fetchHabboLibraryIndex: fetchHabboLibraryIndex
  };
})(typeof window !== 'undefined' ? window : globalThis);
