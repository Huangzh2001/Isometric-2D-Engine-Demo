// asset-management.js
// 受控重构：从 state.js 抽离素材管理与导入相关逻辑，保持全局函数调用兼容。

var HABBO_LIBRARY_ICON_API_URL = '/api/habbo/library/icon';

function getAppServiceRoot() {
  return (typeof window !== 'undefined' && window.App && window.App.services) ? window.App.services : null;
}

function recordLegacyFallback(bridge, detail) {
  try {
    if (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.recordFallback === 'function') {
      window.__APP_NAMESPACE.recordFallback(bridge, 'src/infrastructure/assets/asset-management.js', detail);
    }
  } catch (_) {}
}

function getSceneApiAdapter() {
  var appServices = getAppServiceRoot();
  return appServices && appServices.sceneApi;
}

function getPrefabApiAdapter() {
  var appServices = getAppServiceRoot();
  return appServices && appServices.prefabApi;
}

function getHabboApiAdapter() {
  var appServices = getAppServiceRoot();
  return appServices && appServices.habboApi;
}

function getAssetApiAdapter() {
  var appServices = getAppServiceRoot();
  return appServices && appServices.assetApi;
}


function getPrefabRegistryWriteApi() {
  return (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.prefabRegistry)
    ? window.App.state.prefabRegistry
    : null;
}

var __assetManagementServiceUsageLogged = false;
function logAssetManagementServiceUsageOnce() {
  if (__assetManagementServiceUsageLogged) return;
  __assetManagementServiceUsageLogged = true;
  if (typeof refactorLogCurrent === 'function') {
    refactorLogCurrent('Services', 'service-usage prefab-api -> asset-management', { owner: 'src/infrastructure/assets/asset-management.js', usage: 'prefab-index' });
    refactorLogCurrent('Services', 'service-usage habbo-api -> asset-management', { owner: 'src/infrastructure/assets/asset-management.js', usage: 'habbo-config/library/file' });
    refactorLogCurrent('Services', 'service-usage asset-api -> asset-management', { owner: 'src/infrastructure/assets/asset-management.js', usage: 'asset-prefab-json' });
  }
}

var ASSET_MANAGEMENT_OWNER = 'src/infrastructure/assets/asset-management.js';
var ASSET_MANAGEMENT_CRITICAL_EXPORTS = [
  'scanAssetPrefabs',
  'getAssetPrefabScanSnapshot',
  'ensureAssetPrefabScanState',
  'loadCustomPrefabsFromLocalStorage',
  'saveCustomPrefabsToLocalStorage',
  'refreshPrefabSelectOptions',
  'fetchHabboAssetRootConfig',
  'fetchHabboLibrarySummary',
  'fetchHabboLibraryPage',
  'fetchHabboLibraryIndex',
  'fetchHabboAssetFileBuffer',
  'getHabboRootConfigInFlightState'
];
var habboRootConfigInFlightPromise = null;
var habboRootConfigInFlightRequestId = 0;
var habboRootConfigPendingRoot = '';

function getHabboRootConfigInFlightState() {
  return {
    inFlight: !!habboRootConfigInFlightPromise,
    requestId: habboRootConfigInFlightRequestId || 0,
    pendingRoot: String(habboRootConfigPendingRoot || '')
  };
}

async function awaitHabboRootConfigInFlight(source) {
  if (!habboRootConfigInFlightPromise) return null;
  habboLibraryLog('habbo-root:await-config source=' + String(source || 'unknown') + ' requestId=' + habboRootConfigInFlightRequestId + ' pendingRoot=' + String(habboRootConfigPendingRoot || ''));
  try { return await habboRootConfigInFlightPromise; } catch (_) { return null; }
}

logAssetManagementServiceUsageOnce();


function serviceBoundaryLog(message, extra) {
  if (typeof refactorLogCurrent === 'function') {
    refactorLogCurrent('Services', message, extra);
    return;
  }
  if (typeof pushLog === 'function') {
    pushLog('[Refactor][Phase-A-02][Services] ' + String(message) + (extra !== undefined ? (' ' + JSON.stringify(extra)) : ''));
  }
}

function logRequestOrchestration(kind, extra) {
  serviceBoundaryLog('request-orchestration:' + String(kind || 'unknown'), extra || {});
}

function logAssetScanPrefabDecision(kind, item, extra) {
  var bits = [
    'asset-scan-prefab ' + String(kind || 'unknown'),
    'file=' + JSON.stringify(String(item && item.file || '')),
    'id=' + JSON.stringify(String(item && item.id || '')),
  ];
  if (extra && extra.reason) bits.push('reason=' + String(extra.reason));
  if (extra && extra.requestId) bits.push('requestId=' + String(extra.requestId));
  if (extra && extra.action) bits.push('action=' + String(extra.action));
  if (typeof pushLog === 'function') pushLog(bits.join(' '));
}

function emitP6AssetWorkflow(kind, message, extra) {
  var line = '[P6][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
  }
  try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (_) {}
  return line;
}

var assetWorkflowCounters = { ensureHabboRootReadyCalls: 0, ensureHabboLibrarySummaryCalls: 0, ensureHabboLibraryPageCalls: 0, runAssetScanCalls: 0, persistCustomPrefabsCalls: 0, markAssetManagedPrefabCalls: 0 };
var assetWorkflowLastEvent = null;
var assetWorkflowRecentEvents = [];

function recordAssetWorkflowEvent(kind, detail) {
  var entry = { at: new Date().toISOString(), kind: String(kind || ''), detail: detail || null };
  assetWorkflowLastEvent = entry;
  assetWorkflowRecentEvents.push(entry);
  if (assetWorkflowRecentEvents.length > 16) assetWorkflowRecentEvents.shift();
  return entry;
}

function summarizeAssetWorkflowState() {
  var st = getAssetPrefabScanSnapshot();
  return {
    counters: {
      ensureHabboRootReadyCalls: assetWorkflowCounters.ensureHabboRootReadyCalls,
      ensureHabboLibrarySummaryCalls: assetWorkflowCounters.ensureHabboLibrarySummaryCalls,
      ensureHabboLibraryPageCalls: assetWorkflowCounters.ensureHabboLibraryPageCalls,
      runAssetScanCalls: assetWorkflowCounters.runAssetScanCalls,
      persistCustomPrefabsCalls: assetWorkflowCounters.persistCustomPrefabsCalls,
      markAssetManagedPrefabCalls: assetWorkflowCounters.markAssetManagedPrefabCalls
    },
    lastEvent: assetWorkflowLastEvent,
    recentEvents: assetWorkflowRecentEvents.slice(),
    rootConfigured: !!habboAssetRootState.configured,
    rootExists: !!habboAssetRootState.exists,
    itemCount: habboAssetRootState.itemCount || 0,
    rootConfigInFlight: !!habboRootConfigInFlightPromise,
    pendingRoot: String(habboRootConfigPendingRoot || ''),
    summaryLoaded: !!habboLibraryState.summaryLoaded,
    pageLoaded: !!habboLibraryState.loaded,
    scanInFlight: !!st.inFlight,
    totalFiles: st.totalFiles || 0,
    importedCount: st.importedCount || 0
  };
}

function getAssetWorkflowCompatApi() {
  try { return window.App && window.App.services ? window.App.services.assetWorkflow || null : null; } catch (_) { return null; }
}

function shouldUseAssetWorkflowCompat(options) {
  return !(options && (options.__fromAssetWorkflow || options.__skipWorkflowCompat));
}

function buildAssetWorkflowResult(operation, options, extra) {
  options = options || {};
  return Object.assign({
    ok: true,
    operation: String(operation || 'unknown'),
    protocolVersion: 'P6-C-asset-workflow-v1',
    source: String(options.source || ('services.assetWorkflow:' + String(operation || 'unknown'))),
    compatDelegated: !!options.__fromLegacyCompat
  }, summarizeAssetWorkflowState(), extra || {});
}

async function ensureHabboRootReadyViaWorkflow(options) {
  options = options || {};
  assetWorkflowCounters.ensureHabboRootReadyCalls += 1;
  recordAssetWorkflowEvent('ensureHabboRootReady', { source: String(options.source || 'unknown') });
  try {
    await fetchHabboAssetRootConfig({ silent: options.silent !== false, __fromAssetWorkflow: true });
    return buildAssetWorkflowResult('ensureHabboRootReady', options, {
      ok: true,
      root: String(habboAssetRootState.root || ''),
      error: ''
    });
  } catch (err) {
    return buildAssetWorkflowResult('ensureHabboRootReady', options, {
      ok: false,
      error: String(err && err.message ? err.message : err),
      root: String(habboAssetRootState.root || '')
    });
  }
}

async function ensureHabboLibrarySummaryViaWorkflow(options) {
  options = options || {};
  assetWorkflowCounters.ensureHabboLibrarySummaryCalls += 1;
  recordAssetWorkflowEvent('ensureHabboLibrarySummary', { source: String(options.source || 'unknown'), force: !!options.force });
  var force = !!options.force;
  await fetchHabboLibrarySummary({ force: force, __fromAssetWorkflow: true, source: options.source || 'services.assetWorkflow:ensureHabboLibrarySummary' });
  return buildAssetWorkflowResult('ensureHabboLibrarySummary', options, {
    ok: !!habboLibraryState.summaryLoaded && !habboLibraryState.loadError,
    pending: !!habboLibraryState.summaryPending,
    totalItems: habboLibraryState.totalItems || 0,
    activeType: String(habboLibraryState.activeType || 'room'),
    categories: getHabboLibraryCategoriesForType(habboLibraryState.activeType || 'room').length,
    loadError: String(habboLibraryState.loadError || '')
  });
}

async function ensureHabboLibraryPageViaWorkflow(options) {
  options = options || {};
  assetWorkflowCounters.ensureHabboLibraryPageCalls += 1;
  recordAssetWorkflowEvent('ensureHabboLibraryPage', { source: String(options.source || 'unknown'), force: !!options.force, type: String(options.type || ''), category: String(options.category || '') });
  if (typeof options.type === 'string' && options.type) habboLibraryState.activeType = String(options.type);
  if (typeof options.category === 'string' && options.category) habboLibraryState.activeCategory = String(options.category);
  if (typeof options.search !== 'undefined') habboLibraryState.search = String(options.search || '');
  if (typeof options.page !== 'undefined') habboLibraryState.page = Math.max(1, parseInt(options.page, 10) || 1);
  if (typeof options.pageSize !== 'undefined') habboLibraryState.pageSize = Math.max(1, parseInt(options.pageSize, 10) || habboLibraryState.pageSize || 15);
  await fetchHabboLibraryPage({ force: !!options.force, __fromAssetWorkflow: true, source: options.source || 'services.assetWorkflow:ensureHabboLibraryPage' });
  return buildAssetWorkflowResult('ensureHabboLibraryPage', options, {
    ok: !habboLibraryState.loadError,
    totalItems: habboLibraryState.totalItems || 0,
    page: habboLibraryState.page || 1,
    pageSize: habboLibraryState.pageSize || 15,
    items: Array.isArray(habboLibraryState.items) ? habboLibraryState.items.length : 0,
    activeType: String(habboLibraryState.activeType || 'room'),
    activeCategory: String(habboLibraryState.activeCategory || 'all'),
    queryKey: String(habboLibraryState.queryKey || ''),
    loadError: String(habboLibraryState.loadError || '')
  });
}

async function runAssetScanViaWorkflow(options) {
  options = options || {};
  assetWorkflowCounters.runAssetScanCalls += 1;
  recordAssetWorkflowEvent('runAssetScan', { source: String(options.source || 'unknown'), force: !!options.force });
  var force = !!options.force;
  var ok = await scanAssetPrefabs({ force: force, __fromAssetWorkflow: true, source: options.source || 'services.assetWorkflow:runAssetScan' });
  var st = getAssetPrefabScanSnapshot();
  return buildAssetWorkflowResult('runAssetScan', options, {
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
  assetWorkflowCounters.persistCustomPrefabsCalls += 1;
  recordAssetWorkflowEvent('persistCustomPrefabs', { source: String(options.source || 'unknown') });
  var ok = !!saveCustomPrefabsToLocalStorage();
  return buildAssetWorkflowResult('persistCustomPrefabs', options, {
    ok: ok,
    persistedCount: listCustomPrefabs().length
  });
}

function markAssetManagedPrefabViaWorkflow(prefabId, options) {
  options = options || {};
  assetWorkflowCounters.markAssetManagedPrefabCalls += 1;
  var id = String(prefabId || '').trim();
  recordAssetWorkflowEvent('markAssetManagedPrefab', { source: String(options.source || 'unknown'), prefabId: id });
  if (!id) {
    return buildAssetWorkflowResult('markAssetManagedPrefab', options, {
      ok: false,
      prefabId: id,
      error: 'missing-prefab-id'
    });
  }
  var st = ensureAssetPrefabScanState();
  st.ids.add(id);
  assetManagedPrefabIds = st.ids;
  return buildAssetWorkflowResult('markAssetManagedPrefab', options, {
    ok: true,
    prefabId: id,
    ids: Array.from(st.ids || []).length
  });
}

var assetWorkflowApi = {
  owner: ASSET_MANAGEMENT_OWNER,
  phase: 'P6-C',
  apiPath: 'services.assetWorkflow',
  ensureHabboRootReady: ensureHabboRootReadyViaWorkflow,
  ensureHabboLibrarySummary: ensureHabboLibrarySummaryViaWorkflow,
  ensureHabboLibraryPage: ensureHabboLibraryPageViaWorkflow,
  runAssetScan: runAssetScanViaWorkflow,
  persistCustomPrefabs: persistCustomPrefabsViaWorkflow,
  markAssetManagedPrefab: markAssetManagedPrefabViaWorkflow,
  summarize: summarizeAssetWorkflowState
};

try {
  if (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('services.assetWorkflow', assetWorkflowApi, { owner: ASSET_MANAGEMENT_OWNER, legacy: [], phase: 'P6-C' });
  } else if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.services = window.App.services || {};
    window.App.services.assetWorkflow = assetWorkflowApi;
  }
} catch (_) {}

emitP6AssetWorkflow('BOOT', 'asset-workflow-ready', {
  phase: 'P6-C',
  owner: ASSET_MANAGEMENT_OWNER,
  apiPath: assetWorkflowApi.apiPath,
  functions: ['ensureHabboRootReady', 'ensureHabboLibrarySummary', 'ensureHabboLibraryPage', 'runAssetScan', 'summarize']
});
emitP6AssetWorkflow('SUMMARY', 'asset-workflow-coverage', {
  phase: 'P6-C',
  owner: ASSET_MANAGEMENT_OWNER,
  apiPath: assetWorkflowApi.apiPath,
  wiredInto: ['src/presentation/shell/app-shell.js:bootstrapApplication', 'src/presentation/ui/ui-habbo-library.js:summary/page interactions', 'src/presentation/ui/ui.js:rescan button', 'src/presentation/shell/app.js:editor-return/focus/visibility'],
  notes: ['P6-C keeps services.assetWorkflow as the canonical orchestration entry and makes legacy asset-management wrappers prefer workflow-first delegation before falling back to local compatibility logic.']
});

serviceBoundaryLog('service-boundary-tightened', {
  owner: 'src/infrastructure/assets/asset-management.js',
  prefabApi: !!getPrefabApiAdapter(),
  habboApi: !!getHabboApiAdapter(),
  assetApi: !!getAssetApiAdapter(),
});
serviceBoundaryLog('explicit-deps-bound', {
  owner: 'src/infrastructure/assets/asset-management.js',
  phase: 'P2-B',
  bindings: {
    sceneApi: !!getSceneApiAdapter(),
    prefabApi: !!getPrefabApiAdapter(),
    habboApi: !!getHabboApiAdapter(),
    assetApi: !!getAssetApiAdapter()
  },
  source: (getAppServiceRoot() ? 'App.services-only' : 'missing-service-root')
});

function ensureAssetPrefabScanState() {
  if (!window.__assetPrefabScanState) {
    window.__assetPrefabScanState = {
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
  if (!(window.__assetPrefabScanState.ids instanceof Set)) {
    window.__assetPrefabScanState.ids = new Set(Array.isArray(window.__assetPrefabScanState.ids) ? window.__assetPrefabScanState.ids : []);
  }
  if (!window.__assetPrefabScanState.records || typeof window.__assetPrefabScanState.records !== 'object') {
    window.__assetPrefabScanState.records = {};
  }
  return window.__assetPrefabScanState;
}

var assetPrefabScanInFlight = false;
var lastAssetPrefabScanAt = 0;
var assetManagedPrefabIds = ensureAssetPrefabScanState().ids;
var habboRootConfigRequestSeq = 0;
var assetPrefabIndexRequestSeq = 0;

function getAssetPrefabScanSnapshot() {
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
    serverMode: isServerMode(),
  };
}

var habboAssetRootState = {
  configured: false,
  root: '',
  exists: false,
  itemCount: 0,
  lastError: '',
  fetchedAt: 0,
};

var habboLibraryState = {
  loaded: false,
  loading: false,
  loadError: '',
  items: [],
  activeType: 'room',
  activeCategory: 'all',
  search: '',
  selectedAssetId: '',
  lastAt: 0,
  libraryMode: '',
  page: 1,
  pageSize: 15,
  summaryLoaded: false,
  summaryLoading: false,
  categoriesByType: { room: [], wall: [] },
  totalsByType: { room: 0, wall: 0 },
  totalItems: 0,
  selectedItem: null,
  queryKey: '',
  pageLoading: false,
  summaryPending: false,
  summaryPromise: null,
  pagePromise: null,
  pageAbortController: null,
  pageInFlightKey: '',
  pageActiveRequestId: 0,
  summaryPollTimer: 0,
  summaryRequestSeq: 0,
  pageRequestSeq: 0,
  lastSummaryStartedAt: 0,
  lastSummaryFinishedAt: 0,
  debugText: '',
  versionTag: '20260326-shadow-controls-v10-step05e',
};

function habboRootSupported() {
  return isServerMode() && typeof fetch === 'function';
}

function normalizeHabboRelativePathClient(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
}

function basenameFromPath(value) {
  var normalized = normalizeHabboRelativePathClient(value);
  if (!normalized) return '';
  var parts = normalized.split('/');
  return parts[parts.length - 1] || '';
}

function stemFromPath(value) {
  return basenameFromPath(value).replace(/\.swf$/i, '');
}

function hashHabboPath(value) {
  var text = String(value || '');
  var hash = 2166136261 >>> 0;
  for (var i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(36);
}

function makeHabboPrefabIdFromRelativePath(relativePath) {
  var normalized = normalizeHabboRelativePathClient(relativePath);
  var stem = normalized.replace(/\.swf$/i, '').replace(/[^a-zA-Z0-9_\-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'item';
  return 'habbo_' + stem + '_' + hashHabboPath(normalized);
}

function makeHabboDisplayNameFromRelativePath(relativePath) {
  return 'Habbo ' + (stemFromPath(relativePath) || 'item');
}

function prettyHabboLibraryTypeLabel(type) {
  return String(type || '') === 'wall' ? '墙面' : '物品';
}

function prettyHabboLibraryCategoryLabel(category) {
  var raw = String(category || 'other').trim();
  if (!raw) raw = 'other';
  return raw.replace(/[_\-]+/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
}

function makeHabboLibraryIconUrl(relativePath) {
  var rel = normalizeHabboRelativePathClient(relativePath);
  return rel ? (HABBO_LIBRARY_ICON_API_URL + '?path=' + encodeURIComponent(rel) + '&t=' + (habboLibraryState.lastAt || Date.now())) : '';
}

function habboLibraryLog(msg) {
  try { pushLog('[habbo-library] ' + msg); } catch (_) {}
}

function setHabboLibraryDebugText(lines) {
  habboLibraryState.debugText = Array.isArray(lines) ? lines.filter(Boolean).join('\n') : String(lines || '');
}

function clearHabboLibrarySummaryPoll() {
  if (habboLibraryState.summaryPollTimer) {
    clearTimeout(habboLibraryState.summaryPollTimer);
    habboLibraryState.summaryPollTimer = 0;
  }
}

function scheduleHabboLibrarySummaryPoll(reason) {
  if (habboLibraryState.summaryPollTimer) return;
  habboLibraryLog('summary-poll:schedule reason=' + String(reason || 'pending'));
  habboLibraryState.summaryPollTimer = setTimeout(async function () {
    habboLibraryState.summaryPollTimer = 0;
    if (!habboLibraryState.summaryPending) return;
    habboLibraryLog('summary-poll:tick');
    try {
      await fetchHabboLibrarySummary(false);
    } catch (_err) {}
    if (typeof renderHabboLibraryBrowser === 'function') renderHabboLibraryBrowser();
    if (habboLibraryState.summaryPending) scheduleHabboLibrarySummaryPoll('still-pending');
  }, 1500);
}

function makeHabboLibraryAbortController() {
  return (typeof AbortController === 'function') ? new AbortController() : null;
}

function buildHabboLibraryQueryKey() {
  return JSON.stringify({
    type: String(habboLibraryState.activeType || 'room'),
    category: String(habboLibraryState.activeCategory || 'all'),
    search: String(habboLibraryState.search || '').trim().toLowerCase(),
    page: parseInt(habboLibraryState.page || 1, 10) || 1,
    pageSize: parseInt(habboLibraryState.pageSize || 15, 10) || 15,
  });
}

function getHabboLibraryCategoriesForType(type) {
  var bucket = habboLibraryState.categoriesByType || {};
  return Array.isArray(bucket[type]) ? bucket[type] : [];
}

function getHabboLibraryFilteredItems() {
  return Array.isArray(habboLibraryState.items) ? habboLibraryState.items : [];
}

function getSelectedHabboLibraryItem() {
  var selectedId = String(habboLibraryState.selectedAssetId || '');
  var list = Array.isArray(habboLibraryState.items) ? habboLibraryState.items : [];
  for (var i = 0; i < list.length; i++) if (String(list[i].assetId) === selectedId) return list[i];
  return list.length ? list[0] : null;
}

function ensureHabboLibrarySelection() {
  var list = Array.isArray(habboLibraryState.items) ? habboLibraryState.items : [];
  if (!list.length) {
    habboLibraryState.selectedAssetId = '';
    habboLibraryState.selectedItem = null;
    return null;
  }
  var current = getSelectedHabboLibraryItem();
  if (!current) current = list[0];
  habboLibraryState.selectedAssetId = String(current.assetId || '');
  habboLibraryState.selectedItem = current;
  return current;
}

function findPrefabByIdExact(id) {
  return prototypes.find(function (p) { return p.id === id; }) || null;
}

function ensureMissingPrefabRegistered(rawId) {
  var id = String(rawId || '').trim();
  if (!id) return prototypes[0];
  var existing = findPrefabByIdExact(id);
  if (existing) return existing;
  var placeholder = normalizePrefab({
    id: id,
    name: 'Missing Prefab · ' + id,
    kind: 'missing_prefab',
    base: '#d96b6b',
    voxels: [{ x: 0, y: 0, z: 0 }],
    custom: true,
  });
  placeholder.custom = true;
  placeholder.externalManaged = true;
  placeholder.missingPrefab = true;
  var registryApi = getPrefabRegistryWriteApi();
  if (registryApi && typeof registryApi.registerPrefab === 'function') {
    placeholder = registryApi.registerPrefab(placeholder, { source: 'asset-management:missing-placeholder' });
  } else {
    prototypes.push(placeholder);
  }
  if (typeof tracePrefabRegister === 'function') tracePrefabRegister(placeholder.id, 'missing-placeholder', { builtIn: false, voxels: placeholder.voxels.length });
  return placeholder;
}

function getHabboSceneRefForPrefab(prefab) {
  if (!prefab || prefab.kind !== 'habbo_import' || !prefab.habboMeta) return null;
  var relativePath = normalizeHabboRelativePathClient(prefab.habboMeta.relativePath || prefab.habboMeta.sourceName || prefab.asset || '');
  if (!relativePath || !/\.swf$/i.test(relativePath)) return null;
  return {
    prefabId: String(prefab.id || makeHabboPrefabIdFromRelativePath(relativePath)),
    sourceKind: 'habbo_swf',
    relativePath: relativePath,
    displayName: String(prefab.name || makeHabboDisplayNameFromRelativePath(relativePath)),
    assetName: basenameFromPath(relativePath) || String(prefab.asset || ''),
    type: String(prefab.habboMeta.type || ''),
  };
}

function collectSceneHabboRefs(instanceList) {
  var seen = new Set();
  var out = [];
  (instanceList || []).forEach(function (inst) {
    var prefab = findPrefabByIdExact(inst && inst.prefabId);
    var ref = getHabboSceneRefForPrefab(prefab);
    if (!ref) return;
    var key = ref.prefabId + '|' + ref.relativePath;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(ref);
  });
  return out;
}

async function fetchHabboAssetRootConfig(options) {
  options = options || {};
  var workflow = shouldUseAssetWorkflowCompat(options) ? getAssetWorkflowCompatApi() : null;
  if (workflow && typeof workflow.ensureHabboRootReady === 'function') {
    await workflow.ensureHabboRootReady(Object.assign({}, options, { __fromLegacyCompat: true, source: options.source || 'asset-management:compat:ensureHabboRootReady' }));
    return habboAssetRootState;
  }
  if (!habboRootSupported()) {
    habboAssetRootState = { configured: false, root: '', exists: false, itemCount: 0, lastError: 'server-mode-unavailable', fetchedAt: Date.now() };
    updateHabboRootStatus();
    return habboAssetRootState;
  }
  var requestId = ++habboRootConfigRequestSeq;
  habboLibraryLog('habbo-root:get:start requestId=' + requestId + ' silent=' + (!!options.silent));
  logRequestOrchestration('start', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-root-config:get', requestId: requestId, silent: !!options.silent });
  try {
    var habboApi = getHabboApiAdapter();
    var configResult = await habboApi.getConfig({ requestId: requestId, silent: !!options.silent });
    var res = configResult.response;
    var data = configResult.data;
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
    habboAssetRootState = {
      configured: !!data.configured,
      root: String(data.root || ''),
      exists: !!data.exists,
      itemCount: Number.isFinite(Number(data.itemCount)) ? Number(data.itemCount) : 0,
      lastError: '',
      fetchedAt: Date.now(),
    };
    habboLibraryLog('habbo-root:get:done requestId=' + requestId + ' root=' + habboAssetRootState.root + ' count=' + habboAssetRootState.itemCount);
    logRequestOrchestration('done', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-root-config:get', requestId: requestId, configured: !!habboAssetRootState.configured, exists: !!habboAssetRootState.exists, itemCount: habboAssetRootState.itemCount });
  } catch (err) {
    habboLibraryLog('habbo-root:get:error requestId=' + requestId + ' ' + String(err && err.message ? err.message : err));
    if (err && err.stack) habboLibraryLog('habbo-root:get:stack requestId=' + requestId + ' stack=' + String(err.stack).split('\n').slice(0, 6).join(' | '));
    logRequestOrchestration('skipped', { owner: ASSET_MANAGEMENT_OWNER, flow: 'habbo-root-config:get', requestId: requestId, reason: String(err && err.message ? err.message : err) });
    habboAssetRootState = {
      configured: false,
      root: '',
      exists: false,
      itemCount: 0,
      lastError: String(err && err.message ? err.message : err),
      fetchedAt: Date.now(),
    };
  }
  if (!options.silent) updateHabboRootStatus();
  return habboAssetRootState;
}



function sanitizeHabboAssetRootInput(rootPath, existingRoot) {
  var raw = String(rootPath == null ? '' : rootPath).trim();
  if (!raw) return { value: '', normalized: false, reason: 'empty' };
  var value = raw;
  if ((value.startsWith('\"') && value.endsWith('\"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  var normalized = value !== raw;
  var reason = normalized ? 'trimmed-quotes' : '';
  var existing = String(existingRoot || '').trim();
  if (existing) {
    var doubledExisting = existing + existing;
    if (value === doubledExisting) {
      value = existing;
      normalized = true;
      reason = 'dedup-existing-root-repeat';
    }
  }
  if (value.length % 2 === 0) {
    var half = value.slice(0, value.length / 2);
    if (half && half === value.slice(value.length / 2)) {
      value = half;
      normalized = true;
      reason = reason || 'dedup-double-string';
    }
  }
  return { value: value, normalized: normalized, reason: reason || '' };
}

function updateHabboRootStatus(message) {
  if (!ui || !ui.habboRootStatus) return;
  if (message) {
    ui.habboRootStatus.textContent = message;
    return;
  }
  if (!habboRootSupported()) {
    ui.habboRootStatus.textContent = 'Habbo 根目录：当前不是本地 server 模式，无法读取外部目录。';
    return;
  }
  if (habboAssetRootState.lastError) {
    ui.habboRootStatus.textContent = 'Habbo 根目录：' + habboAssetRootState.lastError;
    return;
  }
  if (!habboAssetRootState.configured) {
    ui.habboRootStatus.textContent = 'Habbo 根目录：未配置。这里应指向你“分类后的 Habbo 素材库根目录”（里面有 index.json、room/wall 子目录，以及每个物件目录中的 swf+icon）。';
    return;
  }
  ui.habboRootStatus.textContent = 'Habbo 根目录：' + habboAssetRootState.root + (habboAssetRootState.exists ? (' · 已检测到 ' + habboAssetRootState.itemCount + ' 个 SWF') : ' · 路径不存在');
}

async function setHabboAssetRootConfig(rootPath) {
  if (!habboRootSupported()) {
    updateHabboRootStatus();
    throw new Error('当前不是本地 server 模式，无法设置 Habbo 根目录');
  }
  var normalizedInput = sanitizeHabboAssetRootInput(rootPath, habboAssetRootState && habboAssetRootState.root);
  var root = normalizedInput.value;
  var requestId = ++habboRootConfigRequestSeq;
  habboRootConfigInFlightRequestId = requestId;
  habboRootConfigPendingRoot = String(root || '');
  habboLibraryLog('habbo-root:set:start requestId=' + requestId + ' root=' + root);
  if (normalizedInput.normalized) habboLibraryLog('habbo-root:set:normalized requestId=' + requestId + ' reason=' + normalizedInput.reason + ' value=' + root);
  if (!root) {
    updateHabboRootStatus('Habbo 根目录设置失败：路径为空');
    habboRootConfigPendingRoot = '';
    throw new Error('Habbo 根目录不能为空');
  }
  var promise = (async function () {
    try {
      updateHabboRootStatus('Habbo 根目录设置中：' + root + ' · 正在等待 server 确认……');
      var habboApi = getHabboApiAdapter();
      var configResult = await habboApi.setConfig(root, { requestId: requestId });
      var res = configResult.response;
      habboLibraryLog('habbo-root:set:response requestId=' + requestId + ' status=' + res.status);
      var rawText = configResult.rawText || '';
      habboLibraryLog('habbo-root:set:text requestId=' + requestId + ' bytes=' + rawText.length);
      var data = configResult.data;
      habboLibraryLog('habbo-root:set:json requestId=' + requestId + ' configured=' + String(!!(data && data.configured)) + ' exists=' + String(!!(data && data.exists)));
      if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
      habboAssetRootState = {
        configured: !!data.configured,
        root: String(data.root || ''),
        exists: !!data.exists,
        itemCount: Number.isFinite(Number(data.itemCount)) ? Number(data.itemCount) : 0,
        lastError: '',
        fetchedAt: Date.now(),
      };
      updateHabboRootStatus('Habbo 根目录已设置为：' + habboAssetRootState.root + (habboAssetRootState.exists ? (' · 当前检测到 ' + habboAssetRootState.itemCount + ' 个 SWF') : ' · 但路径暂不存在'));
      pushLog('habbo-root:set root=' + habboAssetRootState.root + ' exists=' + habboAssetRootState.exists + ' count=' + habboAssetRootState.itemCount);
      habboLibraryLog('habbo-root:set:done requestId=' + requestId + ' root=' + habboAssetRootState.root + ' count=' + habboAssetRootState.itemCount);
      return habboAssetRootState;
    } catch (err) {
      habboLibraryLog('habbo-root:set:error requestId=' + requestId + ' ' + String(err && err.message ? err.message : err));
      if (err && err.stack) habboLibraryLog('habbo-root:set:stack requestId=' + requestId + ' stack=' + String(err.stack).split('\n').slice(0, 6).join(' | '));
      updateHabboRootStatus('Habbo 根目录设置失败：' + (err && err.message ? err.message : err));
      throw err;
    } finally {
      habboRootConfigPendingRoot = '';
      if (habboRootConfigInFlightRequestId === requestId) habboRootConfigInFlightRequestId = 0;
      if (habboRootConfigInFlightPromise && habboRootConfigInFlightPromise.__requestId === requestId) habboRootConfigInFlightPromise = null;
    }
  })();
  promise.__requestId = requestId;
  habboRootConfigInFlightPromise = promise;
  return await promise;
}

async function fetchHabboAssetFileBuffer(relativePath) {
  var rel = normalizeHabboRelativePathClient(relativePath);
  if (!rel) throw new Error('缺少 Habbo 资源相对路径');
  var habboApi = getHabboApiAdapter();
  var fileResult = await habboApi.fetchFileBuffer(rel);
  var res = fileResult.response;
  if (!res.ok) {
    throw new Error('HTTP ' + res.status);
  }
  return fileResult.buffer;
}

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

async function loadHabboLibraryItemToPlacement(item, options) {
  options = options || {};
  var target = item || getSelectedHabboLibraryItem();
  if (!target) throw new Error('当前没有可加载的 Habbo 资源');
  var prefabId = String(target.prefabId || makeHabboPrefabIdFromRelativePath(target.swfRelativePath));
  var importSource = String(options.source || ('habbo-root:' + String(target.swfRelativePath || '')));
  var existing = findPrefabByIdExact(prefabId);
  if (existing && !existing.missingPrefab) {
    if (typeof dedupeImportedPrefab === 'function') dedupeImportedPrefab(prefabId, { source: importSource, sourceKind: 'habbo-root' });
    if (typeof pushLog === 'function') pushLog('[asset-import] import-prefab:dedupe-hit id=' + prefabId + ' kind=existing-prefab strategy=refresh-existing-selection source=' + importSource);
    prepareImportedPrefabForPlacement(existing, {
      source: 'habbo-library:reuse-existing',
      refreshSource: 'asset-import:habbo-library-reuse',
    });
    if (ui && ui.habboImportStatus) ui.habboImportStatus.textContent = '已从资源库选择：' + (existing.name || target.displayName) + '，已切换到放置模式。';
    return { prefab: existing, reused: true };
  }
  var buffer;
  try {
    buffer = await fetchHabboAssetFileBuffer(target.swfRelativePath);
  } catch (err) {
    var missingMessage = '未找到对应的 SWF 文件：' + String(target.swfRelativePath || '');
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      try { window.alert(missingMessage); } catch (_) {}
    }
    throw new Error(missingMessage);
  }
  var result = await importHabboSwfToSceneFromBuffer(buffer, {
    assetName: basenameFromPath(target.swfRelativePath),
    relativePath: target.swfRelativePath,
    displayName: String(target.displayName || target.classname || makeHabboDisplayNameFromRelativePath(target.swfRelativePath)),
    prefabId: prefabId,
    select: true,
    prepareForPlacement: true,
    sourceKind: 'habbo-root',
    source: importSource,
  });
  if (ui && ui.habboImportStatus) ui.habboImportStatus.textContent = '资源库已加载：' + (result.prefab && result.prefab.name ? result.prefab.name : target.displayName) + '，现在可以直接在场景中点击放置。';
  return result;
}

function listCustomPrefabs() {
  return prototypes.filter(function (p) { return !!p.custom && !p.assetManaged; }).map(prefabToSerializable);
}

function saveCustomPrefabsToLocalStorage() {
  if (!sceneStorageAvailable()) return false;
  try {
    window.localStorage.setItem(LOCAL_PREFAB_STORAGE_KEY, JSON.stringify(listCustomPrefabs()));
    detailLog('prefab-storage: saved custom prefabs');
    return true;
  } catch (err) {
    pushLog('prefab-storage:error ' + (err && err.message ? err.message : err));
    return false;
  }
}

async function scanAssetPrefabs(forceOrOptions) {
  var options = (typeof forceOrOptions === 'object' && forceOrOptions !== null) ? forceOrOptions : { force: !!forceOrOptions };
  var force = !!options.force;
  var workflow = shouldUseAssetWorkflowCompat(options) ? getAssetWorkflowCompatApi() : null;
  if (workflow && typeof workflow.runAssetScan === 'function') {
    var workflowResult = await workflow.runAssetScan(Object.assign({}, options, { force: force, __fromLegacyCompat: true, source: options.source || 'asset-management:compat:runAssetScan' }));
    return !!(workflowResult && workflowResult.ok);
  }
  var st = ensureAssetPrefabScanState();
  assetManagedPrefabIds = st.ids;
  if (!isServerMode()) {
    st.lastError = 'not-server-mode';
    st.lastSummary = '未启用本地服务器模式';
    if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
    return false;
  }
  if (st.inFlight) {
    pushLog('prefab-assets: scan skipped inFlight=true');
    logRequestOrchestration('skipped', { owner: ASSET_MANAGEMENT_OWNER, flow: 'asset-scan', reason: 'in-flight' });
    if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
    return false;
  }
  if (!force && Date.now() - (st.lastAt || 0) < 500) {
    pushLog('prefab-assets: scan skipped debounce');
    logRequestOrchestration('skipped', { owner: ASSET_MANAGEMENT_OWNER, flow: 'asset-scan', reason: 'debounce' });
    if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
    return false;
  }
  var requestId = ++assetPrefabIndexRequestSeq;
  st.inFlight = true;
  st.lastError = '';
  if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
  pushLog('prefab-assets: scan start force=' + (!!force) + ' existingManaged=' + st.ids.size + ' requestId=' + requestId);
  logRequestOrchestration('start', { owner: ASSET_MANAGEMENT_OWNER, flow: 'asset-scan', requestId: requestId, force: !!force, existingManaged: st.ids.size });
  try {
    var prefabApi = getPrefabApiAdapter();
    var assetApi = getAssetApiAdapter();
    var indexResult = await prefabApi.fetchIndex({ requestId: requestId });
    var res = indexResult.response;
    var data = indexResult.data;
    if (!res.ok || !data || !Array.isArray(data.items)) throw new Error('invalid prefab index');
    st.totalFiles = data.items.length;
    st.lastItems = data.items.map(function (item) { return { file: item.file, id: item.id || '', name: item.name || '', kind: item.kind || '', mtimeMs: Number(item.mtimeMs || 0) }; });

    var previousRecords = st.records && typeof st.records === 'object' ? st.records : {};
    var nextRecords = {};
    var nextIds = new Set();
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
        logAssetScanPrefabDecision('reused-existing-prefab', item, { requestId: requestId, reason: 'same-mtime' });
        continue;
      }

      logAssetScanPrefabDecision(existingPrefab ? 'refresh-existing-prefab' : 'reimport-required', item, {
        requestId: requestId,
        reason: existingPrefab ? 'mtime-changed-or-record-missing' : 'new-or-missing-prefab',
        action: existingPrefab ? 'update-existing' : 'append-new'
      });

      try {
        var assetResult = await assetApi.fetchJsonAsset('assets/prefabs/' + encodeURIComponent(itemFile) + '?t=' + (mtimeMs || Date.now()));
        var def = assetResult.data;
        var importedDef = importPrefabDefinition(def, { persist: false, source: 'assets:' + itemFile, sourceKind: 'asset', select: false });
        if (importedDef) {
          nextIds.add(importedDef.id);
          if (existingPrefab) refreshed += 1;
          else imported += 1;
        } else {
          skipped += 1;
          logAssetScanPrefabDecision('skipped', item, { requestId: requestId, reason: 'import-returned-null' });
        }
      } catch (err) {
        skipped += 1;
        pushLog('prefab-assets:error file=' + itemFile + ' ' + (err && err.message ? err.message : err));
        logAssetScanPrefabDecision('skipped', item, { requestId: requestId, reason: String(err && err.message ? err.message : err) });
      }
    }

    var removed = 0;
    Array.from(st.ids || []).forEach(function (id) {
      if (nextIds.has(id)) return;
      var idx = prototypes.findIndex(function (p) { return p && p.id === id && p.assetManaged; });
      if (idx >= 0) {
        prototypes.splice(idx, 1);
        var registryApi = getPrefabRegistryWriteApi();
        if (registryApi && registryApi.summarize && window.__STATE_OWNER_MAP__ && typeof window.__STATE_OWNER_MAP__.recordWrite === 'function') {
          window.__STATE_OWNER_MAP__.recordWrite('src/core/state/prefab-registry.js', 'removeAssetManagedPrefab', { source: 'asset-management:scan-remove-missing', prefabId: id, prototypeCount: prototypes.length });
        }
        removed += 1;
      }
    });

    st.ids.clear();
    nextIds.forEach(function (id) { st.ids.add(id); });
    assetManagedPrefabIds = st.ids;
    st.records = nextRecords;
    var registryApi = getPrefabRegistryWriteApi();
    if (registryApi && typeof registryApi.refreshPrototypeSelection === 'function') registryApi.refreshPrototypeSelection({ source: 'asset-management:scan-complete' });
    else refreshPrefabSelectOptions('asset-management:scan-complete');
    st.importedCount = imported + refreshed;
    st.lastAt = Date.now();
    lastAssetPrefabScanAt = st.lastAt;
    st.lastSummary = '扫描 ' + data.items.length + ' 个文件，新增 ' + imported + ' 个，刷新 ' + refreshed + ' 个，复用 ' + reused + ' 个';
    pushLog('prefab-assets: scanned files=' + data.items.length + ' imported=' + imported + ' refreshed=' + refreshed + ' reused=' + reused + ' removed=' + removed + ' skipped=' + skipped + ' prototypeCount=' + prototypes.length);
    logRequestOrchestration('done', { owner: ASSET_MANAGEMENT_OWNER, flow: 'asset-scan', requestId: requestId, files: data.items.length, imported: imported, refreshed: refreshed, reused: reused, removed: removed, skipped: skipped });
    if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
    return true;
  } catch (err) {
    st.lastError = String(err && err.message ? err.message : err);
    st.lastSummary = '扫描失败';
    pushLog('prefab-assets:error requestId=' + requestId + ' ' + st.lastError);
    logRequestOrchestration('skipped', { owner: ASSET_MANAGEMENT_OWNER, flow: 'asset-scan', requestId: requestId, reason: st.lastError });
    if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
    return false;
  } finally {
    st.inFlight = false;
    assetPrefabScanInFlight = false;
    if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
  }
}


function normalizedCountText(count) {
  var n = Number(count);
  if (!Number.isFinite(n) || n < 0) {
    pushLog('[prefab-select] normalized-count-invalid raw=' + JSON.stringify(count));
    return '0';
  }
  return String(Math.floor(n));
}

var prefabSelectRefreshSeq = 0;
var prefabSelectRefreshGuard = {
  active: false,
  activeRequestId: 0,
  activeSource: '',
  lastSignature: '',
  lastSkipSignature: '',
  sameSignatureSkipCount: 0,
  lastSkipLogAt: 0,
  reentrantBlockCount: 0,
  lastSelectedPrefabId: '',
};
var prefabSelectRefreshRequestStats = {
  lastBucketKey: '',
  bucketCount: 0,
  firstRequestId: 0,
  firstAt: 0,
  lastAt: 0,
};

function logPrefabSelectRequest(source, requestId, state) {
  var now = Date.now();
  var bucketKey = String(source || 'unknown') + '||' + String(state && state.signature || '');
  var stats = prefabSelectRefreshRequestStats;
  if (stats.lastBucketKey === bucketKey && (now - stats.lastAt) < 400) {
    stats.bucketCount += 1;
    stats.lastAt = now;
    if (stats.bucketCount === 5 || stats.bucketCount === 20 || stats.bucketCount % 50 === 0) {
      pushLog('[prefab-select] refresh-request-burst requestId=' + requestId
        + ' source=' + JSON.stringify(String(source || 'unknown'))
        + ' signature=' + JSON.stringify(state && state.signature || '')
        + ' burstCount=' + stats.bucketCount
        + ' firstRequestId=' + stats.firstRequestId
        + ' windowMs=' + (stats.lastAt - stats.firstAt)
        + ' selectedIndex=' + (state && typeof state.selectedIndex === 'number' ? state.selectedIndex : -1)
        + ' selectedPrefabId=' + JSON.stringify(state && state.selectedPrefabId || ''));
    }
    return;
  }
  stats.lastBucketKey = bucketKey;
  stats.bucketCount = 1;
  stats.firstRequestId = requestId;
  stats.firstAt = now;
  stats.lastAt = now;
  pushLog('[prefab-select] refresh-request requestId=' + requestId
    + ' source=' + JSON.stringify(String(source || 'unknown'))
    + ' prototypeCount=' + (state && state.prototypeCount || 0)
    + ' selectedIndex=' + (state && typeof state.selectedIndex === 'number' ? state.selectedIndex : -1)
    + ' selectedPrefabId=' + JSON.stringify(state && state.selectedPrefabId || '')
    + ' signature=' + JSON.stringify(state && state.signature || ''));
}

function getPrefabSelectRefreshSource(explicitSource) {
  if (explicitSource) return String(explicitSource);
  try {
    var stack = String((new Error()).stack || '');
    var lines = stack.split(/\n+/).slice(1).map(function (line) { return String(line || '').trim(); }).filter(Boolean);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('refreshPrefabSelectOptions') >= 0) continue;
      if (line.indexOf('requestPrefabSelectRefresh') >= 0) continue;
      if (line.indexOf('asset-management.js') >= 0) return line;
      return line;
    }
  } catch (_) {}
  return 'unknown';
}

function computePrefabSelectSignature(selectedIndex) {
  var safeIndex = clamp(Number(selectedIndex) || 0, 0, Math.max(0, prototypes.length - 1));
  var selectedPrefab = prototypes[safeIndex] || null;
  var selectedPrefabId = selectedPrefab ? String(selectedPrefab.id || '') : '';
  return {
    selectedIndex: safeIndex,
    selectedPrefabId: selectedPrefabId,
    prototypeCount: Array.isArray(prototypes) ? prototypes.length : 0,
    optionCount: Array.isArray(prototypes) ? prototypes.length : 0,
    signature: [Array.isArray(prototypes) ? prototypes.length : 0, Array.isArray(prototypes) ? prototypes.length : 0, selectedPrefabId].join('|')
  };
}

function logPrefabSelectSkip(kind, requestId, source, extra) {
  var now = Date.now();
  if (kind === 'same-signature') {
    prefabSelectRefreshGuard.sameSignatureSkipCount += 1;
    prefabSelectRefreshGuard.lastSkipSignature = extra && extra.signature ? extra.signature : prefabSelectRefreshGuard.lastSkipSignature;
    if (prefabSelectRefreshGuard.sameSignatureSkipCount > 1 && now - prefabSelectRefreshGuard.lastSkipLogAt < 1000) return;
    prefabSelectRefreshGuard.lastSkipLogAt = now;
  }
  pushLog('[prefab-select] refresh-skip requestId=' + requestId
    + ' kind=' + kind
    + ' source=' + JSON.stringify(String(source || 'unknown'))
    + (extra && extra.signature ? ' signature=' + JSON.stringify(extra.signature) : '')
    + (extra && typeof extra.count === 'number' ? ' count=' + extra.count : '')
    + (extra && extra.activeRequestId ? ' activeRequestId=' + extra.activeRequestId : '')
    + (extra && extra.activeSource ? ' activeSource=' + JSON.stringify(extra.activeSource) : '')
    + (extra && typeof extra.selectedIndex === 'number' ? ' selectedIndex=' + extra.selectedIndex : '')
    + (extra && typeof extra.optionCount === 'number' ? ' optionCount=' + extra.optionCount : '')
    + (extra && extra.selectedPrefabId ? ' selectedPrefabId=' + JSON.stringify(extra.selectedPrefabId) : ''));
}

function buildPrefabSelectText(prefab, variant, idx, requestId) {
  var prefabId = String((prefab && prefab.id) || 'unknown');
  var variantVoxels = (variant && Array.isArray(variant.voxels)) ? variant.voxels.length : 0;
  var variantDims = variant ? (String(variant.w) + '×' + String(variant.d) + '×' + String(variant.h)) : 'unknown';
  try {
    var voxelInfo = prefab && prefab.proxyFallbackUsed
      ? ('源代理=0，运行时回退=' + normalizedCountText(variantVoxels))
      : ('代理=' + normalizedCountText(variantVoxels));
    return (prefab.key ? prefab.key + '. ' : '')
      + prefab.name
      + (prefab.custom ? ' [自定义]' : prefab.assetManaged ? ' [assets]' : '')
      + (prefab.sprite && prefab.sprite.image ? ' [sprite]' : '')
      + ' (' + variantDims + ' · ' + voxelInfo + ')';
  } catch (err) {
    pushLog('[prefab-select] option-build-error requestId=' + requestId
      + ' idx=' + idx
      + ' prefabId=' + JSON.stringify(prefabId)
      + ' name=' + JSON.stringify(prefab && prefab.name || '')
      + ' custom=' + (!!(prefab && prefab.custom))
      + ' assetManaged=' + (!!(prefab && prefab.assetManaged))
      + ' proxyFallbackUsed=' + (!!(prefab && prefab.proxyFallbackUsed))
      + ' variantDims=' + JSON.stringify(variantDims)
      + ' variantVoxelCount=' + variantVoxels
      + ' err=' + (err && err.message ? err.message : err));
    return (prefab && prefab.name ? prefab.name : '未知 prefab') + ' (' + variantDims + ' · 代理=' + normalizedCountText(variantVoxels) + ')';
  }
}

function loadCustomPrefabsFromLocalStorage() {
  if (!sceneStorageAvailable()) return false;
  try {
    var raw = window.localStorage.getItem(LOCAL_PREFAB_STORAGE_KEY);
    if (!raw) return false;
    var defs = JSON.parse(raw);
    if (!Array.isArray(defs)) return false;
    defs.forEach(function (def) { importPrefabDefinition(def, { persist: false, source: 'localStorage' }); });
    scheduleLegacyHabboRepairs('localStorage-prefabs');
    pushLog('prefab-storage: loaded ' + defs.length + ' custom prefabs');
    return defs.length > 0;
  } catch (err) {
    pushLog('prefab-storage:error ' + (err && err.message ? err.message : err));
    return false;
  }
}

function refreshPrefabSelectOptions(reason) {
  if (!ui.prefabSelect) {
    pushLog('[prefab-select] refresh-skip missing-select');
    return false;
  }
  var requestId = ++prefabSelectRefreshSeq;
  var source = getPrefabSelectRefreshSource(reason);
  var state = computePrefabSelectSignature(editor ? editor.prototypeIndex : 0);
  logPrefabSelectRequest(source, requestId, state);
  if (prefabSelectRefreshGuard.active) {
    prefabSelectRefreshGuard.reentrantBlockCount += 1;
    logPrefabSelectSkip('reentrant', requestId, source, {
      activeRequestId: prefabSelectRefreshGuard.activeRequestId,
      activeSource: prefabSelectRefreshGuard.activeSource,
      count: prefabSelectRefreshGuard.reentrantBlockCount,
      signature: state.signature,
      selectedIndex: state.selectedIndex,
      optionCount: ui.prefabSelect.options ? ui.prefabSelect.options.length : 0,
      selectedPrefabId: state.selectedPrefabId
    });
    return false;
  }
  if (prefabSelectRefreshGuard.lastSignature === state.signature
      && ui.prefabSelect.options
      && ui.prefabSelect.options.length === state.optionCount
      && String(ui.prefabSelect.value || '') === String(state.selectedIndex)) {
    logPrefabSelectSkip('same-signature', requestId, source, {
      signature: state.signature,
      count: prefabSelectRefreshGuard.sameSignatureSkipCount + 1,
      selectedIndex: state.selectedIndex,
      optionCount: ui.prefabSelect.options.length,
      selectedPrefabId: state.selectedPrefabId
    });
    return false;
  }
  prefabSelectRefreshGuard.active = true;
  prefabSelectRefreshGuard.activeRequestId = requestId;
  prefabSelectRefreshGuard.activeSource = source;
  prefabSelectRefreshGuard.sameSignatureSkipCount = 0;
  var beforeValue = String(ui.prefabSelect.value || '');
  pushLog('[prefab-select] refresh-start requestId=' + requestId
    + ' source=' + JSON.stringify(source)
    + ' prototypeCount=' + prototypes.length
    + ' signature=' + JSON.stringify(state.signature)
    + ' beforeValue=' + JSON.stringify(beforeValue));
  try {
    ui.prefabSelect.innerHTML = '';
    prototypes.forEach(function (prefab, idx) {
      try {
        var variant = prefabVariant(prefab, 0);
        var opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = buildPrefabSelectText(prefab, variant, idx, requestId);
        ui.prefabSelect.appendChild(opt);
      } catch (err) {
        pushLog('[prefab-select] refresh-item-error requestId=' + requestId
          + ' idx=' + idx
          + ' prefabId=' + JSON.stringify(prefab && prefab.id || 'unknown')
          + ' source=' + JSON.stringify(source)
          + ' err=' + (err && err.message ? err.message : err));
        var fallbackOpt = document.createElement('option');
        fallbackOpt.value = String(idx);
        fallbackOpt.textContent = (prefab && prefab.name ? prefab.name : '未知 prefab') + ' [option-error]';
        ui.prefabSelect.appendChild(fallbackOpt);
      }
    });
    ui.prefabSelect.value = String(state.selectedIndex);
    prefabSelectRefreshGuard.lastSignature = state.signature;
    prefabSelectRefreshGuard.lastSelectedPrefabId = state.selectedPrefabId;
    pushLog('[prefab-select] refresh-done requestId=' + requestId
      + ' source=' + JSON.stringify(source)
      + ' optionCount=' + ui.prefabSelect.options.length
      + ' selectedIndex=' + state.selectedIndex
      + ' selectedPrefabId=' + JSON.stringify(state.selectedPrefabId)
      + ' afterValue=' + JSON.stringify(String(ui.prefabSelect.value || '')));
    return true;
  } finally {
    prefabSelectRefreshGuard.active = false;
    prefabSelectRefreshGuard.activeRequestId = 0;
    prefabSelectRefreshGuard.activeSource = '';
  }
}

pushLog('[habbo-library] boot hook active on start.bat main entry build=' + habboLibraryState.versionTag + ' presetRoot=' + String((habboAssetRootState && habboAssetRootState.root) || ''));

if (typeof refactorLogCurrent === 'function') {
  refactorLogCurrent('Cleanup', 'cleanup-legacy-entry removed -> requestPrefabSelectRefresh', { owner: 'src/infrastructure/assets/asset-management.js', reason: 'unused-global-alias' });
}

function legacyAssetPathCalled(name, reason) {
  var msg = '[LEGACY-ASSET-PATH-CALLED] ' + String(name || 'unknown') + ' ' + String(reason || ('should only resolve through ' + ASSET_MANAGEMENT_OWNER));
  if (typeof logFailFast === 'function') logFailFast('LEGACY-ASSET-PATH-CALLED', String(name || 'unknown'), String(reason || ('should only resolve through ' + ASSET_MANAGEMENT_OWNER)));
  try { pushLog(msg); } catch (_) {}
  try { if (typeof console !== 'undefined' && console.error) console.error(msg); } catch (_) {}
  throw new Error(msg);
}

function assertAssetManagementOwnership(context) {
  var ctx = String(context || 'runtime-check');
  var missing = [];
  var mismatched = [];
  ASSET_MANAGEMENT_CRITICAL_EXPORTS.forEach(function (name) {
    var fn = window[name];
    if (typeof fn !== 'function') {
      missing.push(name);
      return;
    }
    if (fn.__assetModuleOwner !== ASSET_MANAGEMENT_OWNER) {
      mismatched.push(name + ' owner=' + String(fn.__assetModuleOwner || 'unknown'));
    }
  });
  if (missing.length || mismatched.length) {
    legacyAssetPathCalled('asset-management-ownership-check', 'context=' + ctx + ' missing=[' + missing.join(',') + '] mismatched=[' + mismatched.join(',') + ']');
  }
  return true;
}
window.assertAssetManagementOwnership = assertAssetManagementOwnership;

(function installAssetManagementTrace() {
  if (typeof window === 'undefined') return;
  if (window.__assetManagementTraceInstalled) return;
  window.__assetManagementTraceInstalled = true;

  function assetTraceLog(msg) {
    try {
      if (typeof logRoute === 'function') logRoute('asset-management', msg);
      else if (typeof pushLog === 'function') pushLog('[route][asset-management] ' + msg);
      else if (typeof console !== 'undefined' && console.log) console.log('[route][asset-management] ' + msg);
    } catch (_) {
      try {
        if (typeof console !== 'undefined' && console.log) console.log('[route][asset-management] ' + msg);
      } catch (__ ) {}
    }
  }

  function formatValue(value, depth) {
    depth = depth || 0;
    if (depth > 1) return '…';
    if (value === null) return 'null';
    if (typeof value === 'undefined') return 'undefined';
    var t = typeof value;
    if (t === 'string') {
      var s = value.length > 120 ? value.slice(0, 120) + '…' : value;
      return JSON.stringify(s);
    }
    if (t === 'number' || t === 'boolean' || t === 'bigint') return String(value);
    if (t === 'function') return '[Function ' + (value.name || 'anonymous') + ']';
    if (Array.isArray(value)) {
      var preview = value.slice(0, 3).map(function (x) { return formatValue(x, depth + 1); }).join(', ');
      return '[Array len=' + value.length + (preview ? ' ' + preview : '') + (value.length > 3 ? ', …' : '') + ']';
    }
    if (t === 'object') {
      try {
        var keys = Object.keys(value);
        var picked = {};
        keys.slice(0, 5).forEach(function (k) { picked[k] = value[k]; });
        return '{keys=' + keys.slice(0, 5).join(',') + (keys.length > 5 ? ',…' : '') + ' preview=' + JSON.stringify(picked).slice(0, 180) + (JSON.stringify(picked).length > 180 ? '…' : '') + '}';
      } catch (_) {
        return '[Object]';
      }
    }
    return String(value);
  }

  function formatArgs(argsLike) {
    try {
      return Array.prototype.slice.call(argsLike || []).map(function (x) { return formatValue(x, 0); }).join(', ');
    } catch (_) {
      return '[args-format-failed]';
    }
  }

  function wrapFunction(name) {
    var fn = window[name];
    if (typeof fn !== 'function') return;
    if (fn.__assetTraceWrapped) return;
    var wrapped = function () {
      var callId = name + '#' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
      assetTraceLog('enter ' + callId + ' args=(' + formatArgs(arguments) + ')');
      try {
        var result = fn.apply(this, arguments);
        if (result && typeof result.then === 'function') {
          return result.then(function (value) {
            assetTraceLog('ok ' + callId + ' result=' + formatValue(value, 0));
            return value;
          }).catch(function (err) {
            assetTraceLog('error ' + callId + ' err=' + formatValue(err && err.message ? err.message : err, 0));
            throw err;
          });
        }
        assetTraceLog('ok ' + callId + ' result=' + formatValue(result, 0));
        return result;
      } catch (err) {
        assetTraceLog('error ' + callId + ' err=' + formatValue(err && err.message ? err.message : err, 0));
        throw err;
      }
    };
    wrapped.__assetTraceWrapped = true;
    wrapped.__assetTraceOriginal = fn;
    wrapped.__assetModuleOwner = ASSET_MANAGEMENT_OWNER;
    wrapped.__assetExportName = name;
    window[name] = wrapped;
    if (typeof window[name] === 'function') {
      window[name].__assetModuleOwner = ASSET_MANAGEMENT_OWNER;
      window[name].__assetExportName = name;
    }
  }

  [
    'ensureAssetPrefabScanState',
    'getAssetPrefabScanSnapshot',
    'habboRootSupported',
    'normalizeHabboRelativePathClient',
    'basenameFromPath',
    'stemFromPath',
    'hashHabboPath',
    'makeHabboPrefabIdFromRelativePath',
    'makeHabboDisplayNameFromRelativePath',
    'prettyHabboLibraryTypeLabel',
    'prettyHabboLibraryCategoryLabel',
    'makeHabboLibraryIconUrl',
    'habboLibraryLog',
    'setHabboLibraryDebugText',
    'buildHabboLibraryQueryKey',
    'getHabboLibraryCategoriesForType',
    'getHabboLibraryFilteredItems',
    'getSelectedHabboLibraryItem',
    'ensureHabboLibrarySelection',
    'findPrefabByIdExact',
    'ensureMissingPrefabRegistered',
    'getHabboSceneRefForPrefab',
    'collectSceneHabboRefs',
    'fetchHabboAssetRootConfig',
    'updateHabboRootStatus',
    'setHabboAssetRootConfig',
    'fetchHabboAssetFileBuffer',
    'fetchHabboLibrarySummary',
    'fetchHabboLibraryPage',
    'fetchHabboLibraryIndex',
    'getHabboRootConfigInFlightState',
    'loadHabboLibraryItemToPlacement',
    'listCustomPrefabs',
    'saveCustomPrefabsToLocalStorage',
    'scanAssetPrefabs',
    'loadCustomPrefabsFromLocalStorage',
    'refreshPrefabSelectOptions'
  ].forEach(wrapFunction);

  assertAssetManagementOwnership('module-load');
  assetTraceLog('module-loaded wrappedFunctions=36 owner=' + ASSET_MANAGEMENT_OWNER);
})();
