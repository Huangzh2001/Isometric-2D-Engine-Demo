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

function getHabboRootConfigService() {
  return (typeof window !== 'undefined' && window.__HABBO_ROOT_CONFIG_SERVICE__) || null;
}

function createHabboRootConfigDeps() {
  return {
    owner: ASSET_MANAGEMENT_OWNER,
    getRootState: function () { return habboAssetRootState; },
    setRootState: function (state) { habboAssetRootState = state; return habboAssetRootState; },
    getInFlightPromise: function () { return habboRootConfigInFlightPromise; },
    setInFlightPromise: function (promise) { habboRootConfigInFlightPromise = promise || null; },
    getInFlightRequestId: function () { return habboRootConfigInFlightRequestId || 0; },
    setInFlightRequestId: function (requestId) { habboRootConfigInFlightRequestId = Number(requestId) || 0; },
    getPendingRoot: function () { return habboRootConfigPendingRoot || ''; },
    setPendingRoot: function (root) { habboRootConfigPendingRoot = String(root || ''); },
    nextRequestId: function () { habboRootConfigRequestSeq += 1; return habboRootConfigRequestSeq; },
    shouldUseAssetWorkflowCompat: shouldUseAssetWorkflowCompat,
    getAssetWorkflowCompatApi: getAssetWorkflowCompatApi,
    habboRootSupported: habboRootSupported,
    updateHabboRootStatus: updateHabboRootStatus,
    getHabboApiAdapter: getHabboApiAdapter,
    habboLibraryLog: habboLibraryLog,
    logRequestOrchestration: logRequestOrchestration,
    pushLog: pushLog
  };
}

function getHabboRootConfigInFlightState() {
  var service = getHabboRootConfigService();
  if (service && typeof service.getHabboRootConfigInFlightState === 'function') return service.getHabboRootConfigInFlightState(createHabboRootConfigDeps());
  return {
    inFlight: !!habboRootConfigInFlightPromise,
    requestId: habboRootConfigInFlightRequestId || 0,
    pendingRoot: String(habboRootConfigPendingRoot || '')
  };
}

async function awaitHabboRootConfigInFlight(source) {
  var service = getHabboRootConfigService();
  if (service && typeof service.awaitHabboRootConfigInFlight === 'function') return await service.awaitHabboRootConfigInFlight(source, createHabboRootConfigDeps());
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

function getAssetWorkflowCompatApi() {
  try { return window.App && window.App.services ? window.App.services.assetWorkflow || null : null; } catch (_) { return null; }
}

function shouldUseAssetWorkflowCompat(options) {
  return !(options && (options.__fromAssetWorkflow || options.__skipWorkflowCompat));
}

function getAssetWorkflowService() {
  return (typeof window !== 'undefined' && window.__ASSET_WORKFLOW_SERVICE__) || null;
}

function createAssetWorkflowDeps() {
  return {
    owner: ASSET_MANAGEMENT_OWNER,
    getHabboAssetRootState: function () { return habboAssetRootState; },
    getHabboLibraryState: function () { return habboLibraryState; },
    getHabboRootConfigInFlightState: getHabboRootConfigInFlightState,
    getAssetPrefabScanSnapshot: getAssetPrefabScanSnapshot,
    getHabboLibraryCategoriesForType: getHabboLibraryCategoriesForType,
    fetchHabboAssetRootConfig: fetchHabboAssetRootConfig,
    fetchHabboLibrarySummary: fetchHabboLibrarySummary,
    fetchHabboLibraryPage: fetchHabboLibraryPage,
    scanAssetPrefabs: scanAssetPrefabs,
    saveCustomPrefabsToLocalStorage: saveCustomPrefabsToLocalStorage,
    listCustomPrefabs: listCustomPrefabs,
    getAssetPrefabScanService: getAssetPrefabScanService,
    createAssetPrefabScanDeps: createAssetPrefabScanDeps,
    ensureAssetPrefabScanState: ensureAssetPrefabScanState
  };
}

var assetWorkflowService = getAssetWorkflowService();
if (!assetWorkflowService || typeof assetWorkflowService.createAssetWorkflowApi !== 'function') {
  throw new Error('asset-workflow-service missing');
}
var assetWorkflowApi = assetWorkflowService.createAssetWorkflowApi(createAssetWorkflowDeps());

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
  owner: assetWorkflowApi.owner || ASSET_MANAGEMENT_OWNER,
  apiPath: assetWorkflowApi.apiPath,
  functions: ['ensureHabboRootReady', 'ensureHabboLibrarySummary', 'ensureHabboLibraryPage', 'runAssetScan', 'summarize']
});
emitP6AssetWorkflow('SUMMARY', 'asset-workflow-coverage', {
  phase: 'P6-C',
  owner: assetWorkflowApi.owner || ASSET_MANAGEMENT_OWNER,
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

function getAssetPrefabScanService() {
  return (typeof window !== 'undefined' && window.__ASSET_PREFAB_SCAN_SERVICE__) ? window.__ASSET_PREFAB_SCAN_SERVICE__ : null;
}

function createAssetPrefabScanDeps() {
  return {
    owner: ASSET_MANAGEMENT_OWNER,
    isServerMode: function () { return isServerMode(); },
    pushLog: function (msg) { return pushLog(msg); },
    shouldUseAssetWorkflowCompat: shouldUseAssetWorkflowCompat,
    getAssetWorkflowCompatApi: getAssetWorkflowCompatApi,
    getPrefabApiAdapter: getPrefabApiAdapter,
    getAssetApiAdapter: getAssetApiAdapter,
    getPrefabRegistryWriteApi: getPrefabRegistryWriteApi,
    logRequestOrchestration: logRequestOrchestration,
    logAssetScanPrefabDecision: logAssetScanPrefabDecision,
    refreshAssetScanStatus: function () { if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus(); },
    refreshPrefabSelectOptions: refreshPrefabSelectOptions,
    importPrefabDefinition: importPrefabDefinition,
    getPrototypes: function () { return prototypes; },
    recordPrefabRegistryWrite: function (owner, action, detail) {
      try {
        if (window.__STATE_OWNER_MAP__ && typeof window.__STATE_OWNER_MAP__.recordWrite === 'function') window.__STATE_OWNER_MAP__.recordWrite(owner, action, detail);
      } catch (_) {}
    },
    setAssetManagedPrefabIds: function (ids) { assetManagedPrefabIds = ids; },
    setLastAssetPrefabScanAt: function (value) { lastAssetPrefabScanAt = value; },
    setAssetPrefabScanInFlight: function (value) { assetPrefabScanInFlight = !!value; }
  };
}

function ensureAssetPrefabScanState() {
  var service = getAssetPrefabScanService();
  if (service && typeof service.ensureAssetPrefabScanState === 'function') return service.ensureAssetPrefabScanState();
  if (!window.__assetPrefabScanState) window.__assetPrefabScanState = { inFlight: false, lastAt: 0, lastError: '', lastSummary: '', lastItems: [], ids: new Set(), records: {}, totalFiles: 0, importedCount: 0 };
  if (!(window.__assetPrefabScanState.ids instanceof Set)) window.__assetPrefabScanState.ids = new Set(Array.isArray(window.__assetPrefabScanState.ids) ? window.__assetPrefabScanState.ids : []);
  if (!window.__assetPrefabScanState.records || typeof window.__assetPrefabScanState.records !== 'object') window.__assetPrefabScanState.records = {};
  return window.__assetPrefabScanState;
}

var assetPrefabScanInFlight = false;
var lastAssetPrefabScanAt = 0;
var assetManagedPrefabIds = ensureAssetPrefabScanState().ids;
var habboRootConfigRequestSeq = 0;

function getAssetPrefabScanSnapshot() {
  var service = getAssetPrefabScanService();
  if (service && typeof service.getAssetPrefabScanSnapshot === 'function') return service.getAssetPrefabScanSnapshot(createAssetPrefabScanDeps());
  var st = ensureAssetPrefabScanState();
  return { inFlight: !!st.inFlight, lastAt: st.lastAt || 0, lastError: st.lastError || '', lastSummary: st.lastSummary || '', totalFiles: st.totalFiles || 0, importedCount: st.importedCount || 0, ids: Array.from(st.ids || []), recordCount: st.records ? Object.keys(st.records).length : 0, lastItems: Array.isArray(st.lastItems) ? st.lastItems.slice(0, 20) : [], serverMode: isServerMode() };
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
  var service = getHabboRootConfigService();
  if (!service || typeof service.fetchHabboAssetRootConfig !== 'function') {
    throw new Error('habbo-root-config-service missing');
  }
  return await service.fetchHabboAssetRootConfig(options, createHabboRootConfigDeps());
}

function sanitizeHabboAssetRootInput(rootPath, existingRoot) {
  var service = getHabboRootConfigService();
  if (service && typeof service.sanitizeHabboAssetRootInput === 'function') return service.sanitizeHabboAssetRootInput(rootPath, existingRoot);
  var raw = String(rootPath == null ? '' : rootPath).trim();
  return { value: raw, normalized: false, reason: raw ? '' : 'empty' };
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
  var service = getHabboRootConfigService();
  if (!service || typeof service.setHabboAssetRootConfig !== 'function') {
    throw new Error('habbo-root-config-service missing');
  }
  return await service.setHabboAssetRootConfig(rootPath, createHabboRootConfigDeps());
}


function getHabboAssetFileService() {
  return (typeof window !== 'undefined' && window.__HABBO_ASSET_FILE_SERVICE__) || null;
}

function createHabboAssetFileDeps() {
  return {
    normalizeHabboRelativePathClient: normalizeHabboRelativePathClient,
    getHabboApiAdapter: getHabboApiAdapter
  };
}

async function fetchHabboAssetFileBuffer(relativePath) {
  var service = getHabboAssetFileService();
  if (!service || typeof service.fetchHabboAssetFileBuffer !== 'function') {
    throw new Error('habbo-asset-file-service missing');
  }
  return await service.fetchHabboAssetFileBuffer(relativePath, createHabboAssetFileDeps());
}

function getHabboLibraryService() {
  return (typeof window !== 'undefined' && window.__HABBO_LIBRARY_SERVICE__) || null;
}

async function fetchHabboLibrarySummary(forceOrOptions) {
  var service = getHabboLibraryService();
  if (!service || typeof service.fetchHabboLibrarySummary !== 'function') {
    throw new Error('habbo-library-service missing');
  }
  return await service.fetchHabboLibrarySummary(forceOrOptions);
}


async function fetchHabboLibraryPage(forceOrOptions) {
  var service = getHabboLibraryService();
  if (!service || typeof service.fetchHabboLibraryPage !== 'function') {
    throw new Error('habbo-library-service missing');
  }
  return await service.fetchHabboLibraryPage(forceOrOptions);
}


async function fetchHabboLibraryIndex(force) {
  var service = getHabboLibraryService();
  if (!service || typeof service.fetchHabboLibraryIndex !== 'function') {
    throw new Error('habbo-library-service missing');
  }
  return await service.fetchHabboLibraryIndex(force);
}

function getHabboPlacementImportService() {
  return (typeof window !== 'undefined' && window.__HABBO_PLACEMENT_IMPORT_SERVICE__) || null;
}

function createHabboPlacementImportDeps() {
  return {
    getSelectedHabboLibraryItem: getSelectedHabboLibraryItem,
    makeHabboPrefabIdFromRelativePath: makeHabboPrefabIdFromRelativePath,
    findPrefabByIdExact: findPrefabByIdExact,
    dedupeImportedPrefab: (typeof dedupeImportedPrefab === 'function') ? dedupeImportedPrefab : null,
    pushLog: pushLog,
    prepareImportedPrefabForPlacement: prepareImportedPrefabForPlacement,
    fetchHabboAssetFileBuffer: fetchHabboAssetFileBuffer,
    basenameFromPath: basenameFromPath,
    makeHabboDisplayNameFromRelativePath: makeHabboDisplayNameFromRelativePath,
    importHabboSwfToSceneFromBuffer: importHabboSwfToSceneFromBuffer,
    setHabboImportStatus: function (message) { if (ui && ui.habboImportStatus) ui.habboImportStatus.textContent = String(message || ''); },
    alert: function (message) { if (typeof window !== 'undefined' && typeof window.alert === 'function') { try { window.alert(message); } catch (_) {} } }
  };
}

async function loadHabboLibraryItemToPlacement(item, options) {
  var service = getHabboPlacementImportService();
  if (!service || typeof service.loadHabboLibraryItemToPlacement !== 'function') {
    throw new Error('habbo-placement-import-service missing');
  }
  return await service.loadHabboLibraryItemToPlacement(item, options, createHabboPlacementImportDeps());
}

function getCustomPrefabStorageService() {
  return (typeof window !== 'undefined' && window.__CUSTOM_PREFAB_STORAGE__) || null;
}

function listCustomPrefabs() {
  var service = getCustomPrefabStorageService();
  if (!service || typeof service.listCustomPrefabs !== 'function') {
    throw new Error('custom-prefab-storage missing');
  }
  return service.listCustomPrefabs();
}

function saveCustomPrefabsToLocalStorage() {
  var service = getCustomPrefabStorageService();
  if (!service || typeof service.saveCustomPrefabsToLocalStorage !== 'function') {
    throw new Error('custom-prefab-storage missing');
  }
  return service.saveCustomPrefabsToLocalStorage();
}

async function scanAssetPrefabs(forceOrOptions) {
  var service = getAssetPrefabScanService();
  if (!service || typeof service.scanAssetPrefabs !== 'function') {
    throw new Error('asset-prefab-scan-service missing');
  }
  return await service.scanAssetPrefabs(forceOrOptions, createAssetPrefabScanDeps());
}


function getPrefabSelectRefreshService() {
  return (typeof window !== 'undefined' && window.__PREFAB_SELECT_REFRESH__) || null;
}

function createPrefabSelectRefreshDeps() {
  return {
    getUi: function () { return ui; },
    getPrototypes: function () { return Array.isArray(prototypes) ? prototypes : []; },
    getEditorPrototypeIndex: function () { return editor ? editor.prototypeIndex : 0; },
    prefabVariant: prefabVariant,
    clamp: clamp,
    document: document,
    pushLog: pushLog
  };
}

function normalizedCountText(count) {
  var service = getPrefabSelectRefreshService();
  if (service && typeof service.normalizedCountText === 'function') return service.normalizedCountText(count, createPrefabSelectRefreshDeps());
  var n = Number(count);
  if (!Number.isFinite(n) || n < 0) return '0';
  return String(Math.floor(n));
}

function loadCustomPrefabsFromLocalStorage() {
  var service = getCustomPrefabStorageService();
  if (!service || typeof service.loadCustomPrefabsFromLocalStorage !== 'function') {
    throw new Error('custom-prefab-storage missing');
  }
  return service.loadCustomPrefabsFromLocalStorage();
}

function refreshPrefabSelectOptions(reason) {
  var service = getPrefabSelectRefreshService();
  if (!service || typeof service.refreshPrefabSelectOptions !== 'function') {
    throw new Error('prefab-select-refresh owner missing');
  }
  return service.refreshPrefabSelectOptions(reason, createPrefabSelectRefreshDeps());
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
