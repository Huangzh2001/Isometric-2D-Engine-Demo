// asset-management.js
// 受控重构：从 state.js 抽离素材管理与导入相关逻辑，保持全局函数调用兼容。

var ASSET_PREFAB_INDEX_URL = '/api/prefabs/index';
var HABBO_CONFIG_API_URL = '/api/habbo/config';
var HABBO_INDEX_API_URL = '/api/habbo/index';
var HABBO_FILE_API_URL = '/api/habbo/file';
var HABBO_LIBRARY_INDEX_API_URL = '/api/habbo/library/index';
var HABBO_LIBRARY_SUMMARY_API_URL = '/api/habbo/library/summary';
var HABBO_LIBRARY_PAGE_API_URL = '/api/habbo/library/page';
var HABBO_LIBRARY_ICON_API_URL = '/api/habbo/library/icon';

var ASSET_MANAGEMENT_OWNER = 'src/asset-management/asset-management.js';
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
  'fetchHabboAssetFileBuffer'
];

function ensureAssetPrefabScanState() {
  if (!window.__assetPrefabScanState) {
    window.__assetPrefabScanState = {
      inFlight: false,
      lastAt: 0,
      lastError: '',
      lastSummary: '',
      lastItems: [],
      ids: new Set(),
      totalFiles: 0,
      importedCount: 0,
    };
  }
  if (!(window.__assetPrefabScanState.ids instanceof Set)) {
    window.__assetPrefabScanState.ids = new Set(Array.isArray(window.__assetPrefabScanState.ids) ? window.__assetPrefabScanState.ids : []);
  }
  return window.__assetPrefabScanState;
}

var assetPrefabScanInFlight = false;
var lastAssetPrefabScanAt = 0;
var assetManagedPrefabIds = ensureAssetPrefabScanState().ids;

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
  debugText: '',
  versionTag: '20260326-shadow-controls-v10',
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
  prototypes.push(placeholder);
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
  if (!habboRootSupported()) {
    habboAssetRootState = { configured: false, root: '', exists: false, itemCount: 0, lastError: 'server-mode-unavailable', fetchedAt: Date.now() };
    updateHabboRootStatus();
    return habboAssetRootState;
  }
  try {
    var res = await fetch(HABBO_CONFIG_API_URL + '?t=' + Date.now(), { cache: 'no-store' });
    var data = await res.json();
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
    habboAssetRootState = {
      configured: !!data.configured,
      root: String(data.root || ''),
      exists: !!data.exists,
      itemCount: Number.isFinite(Number(data.itemCount)) ? Number(data.itemCount) : 0,
      lastError: '',
      fetchedAt: Date.now(),
    };
  } catch (err) {
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
  var root = String(rootPath || '').trim();
  try {
    var res = await fetch(HABBO_CONFIG_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: root }),
    });
    var data = await res.json();
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
    return habboAssetRootState;
  } catch (err) {
    updateHabboRootStatus('Habbo 根目录设置失败：' + (err && err.message ? err.message : err));
    throw err;
  }
}

async function fetchHabboAssetFileBuffer(relativePath) {
  var rel = normalizeHabboRelativePathClient(relativePath);
  if (!rel) throw new Error('缺少 Habbo 资源相对路径');
  var res = await fetch(HABBO_FILE_API_URL + '?path=' + encodeURIComponent(rel) + '&t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) {
    var errText = await res.text().catch(function () { return ''; });
    throw new Error(errText || ('HTTP ' + res.status));
  }
  return await res.arrayBuffer();
}

async function fetchHabboLibrarySummary(force) {
  if (!habboRootSupported()) {
    habboLibraryState.summaryLoaded = false;
    habboLibraryState.loadError = '当前不是本地 server 模式，无法读取外部 Habbo 资源库。';
    setHabboLibraryDebugText(['serverMode=false']);
    return habboLibraryState;
  }
  if (habboLibraryState.summaryLoading) return habboLibraryState;
  if (habboLibraryState.summaryLoaded && !force) return habboLibraryState;
  habboLibraryState.summaryLoading = true;
  habboLibraryLog('summary-fetch:start force=' + (!!force) + ' root=' + String((habboAssetRootState && habboAssetRootState.root) || ''));
  try {
    var res = await fetch(HABBO_LIBRARY_SUMMARY_API_URL + '?t=' + Date.now(), { cache: 'no-store' });
    var data = await res.json();
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
    habboLibraryState.summaryLoaded = true;
    habboLibraryState.loaded = true;
    habboLibraryState.loadError = '';
    habboLibraryState.libraryMode = String(data.libraryMode || '');
    habboLibraryState.lastAt = Date.now();
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
    setHabboLibraryDebugText([
      'build=' + habboLibraryState.versionTag,
      'mode=' + String(data.libraryMode || ''),
      'root=' + String(data.root || ''),
      'configured=' + String(!!data.configured) + ' exists=' + String(!!data.exists),
      'total=' + habboLibraryState.totalItems + ' room=' + habboLibraryState.totalsByType.room + ' wall=' + habboLibraryState.totalsByType.wall,
      'roomCategories=' + getHabboLibraryCategoriesForType('room').length + ' wallCategories=' + getHabboLibraryCategoriesForType('wall').length,
    ]);
    habboLibraryLog('summary-fetch:done total=' + habboLibraryState.totalItems + ' room=' + habboLibraryState.totalsByType.room + ' wall=' + habboLibraryState.totalsByType.wall + ' roomCats=' + getHabboLibraryCategoriesForType('room').length + ' wallCats=' + getHabboLibraryCategoriesForType('wall').length);
  } catch (err) {
    habboLibraryState.summaryLoaded = false;
    habboLibraryState.loaded = false;
    habboLibraryState.loadError = String(err && err.message ? err.message : err);
    habboLibraryState.categoriesByType = { room: [], wall: [] };
    habboLibraryState.totalsByType = { room: 0, wall: 0 };
    habboLibraryState.totalItems = 0;
    setHabboLibraryDebugText(['summary-error=' + habboLibraryState.loadError]);
    habboLibraryLog('summary-fetch:error ' + habboLibraryState.loadError);
  } finally {
    habboLibraryState.summaryLoading = false;
  }
  return habboLibraryState;
}

async function fetchHabboLibraryPage(force) {
  if (!habboRootSupported()) {
    habboLibraryState.loadError = '当前不是本地 server 模式，无法读取外部 Habbo 资源库。';
    return habboLibraryState;
  }
  var key = buildHabboLibraryQueryKey();
  if (habboLibraryState.pageLoading) return habboLibraryState;
  if (!force && habboLibraryState.queryKey === key && Array.isArray(habboLibraryState.items) && habboLibraryState.items.length) return habboLibraryState;
  habboLibraryState.pageLoading = true;
  habboLibraryState.loading = true;
  var params = new URLSearchParams({
    type: String(habboLibraryState.activeType || 'room'),
    category: String(habboLibraryState.activeCategory || 'all'),
    search: String(habboLibraryState.search || ''),
    page: String(parseInt(habboLibraryState.page || 1, 10) || 1),
    pageSize: String(parseInt(habboLibraryState.pageSize || 15, 10) || 15),
  });
  habboLibraryLog('page-fetch:start ' + params.toString());
  try {
    var res = await fetch(HABBO_LIBRARY_PAGE_API_URL + '?' + params.toString() + '&t=' + Date.now(), { cache: 'no-store' });
    var data = await res.json();
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
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
    habboLibraryLog('page-fetch:done items=' + items.length + ' total=' + habboLibraryState.totalItems + ' totalPages=' + habboLibraryState.totalPages + ' first=' + (items[0] ? items[0].classname : 'none'));
  } catch (err) {
    habboLibraryState.items = [];
    habboLibraryState.loadError = String(err && err.message ? err.message : err);
    habboLibraryLog('page-fetch:error ' + habboLibraryState.loadError);
  } finally {
    habboLibraryState.pageLoading = false;
    habboLibraryState.loading = false;
  }
  return habboLibraryState;
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

async function loadHabboLibraryItemToPlacement(item) {
  var target = item || getSelectedHabboLibraryItem();
  if (!target) throw new Error('当前没有可加载的 Habbo 资源');
  var prefabId = String(target.prefabId || makeHabboPrefabIdFromRelativePath(target.swfRelativePath));
  var existing = findPrefabByIdExact(prefabId);
  if (existing && !existing.missingPrefab) {
    prepareImportedPrefabForPlacement(existing);
    if (ui && ui.habboImportStatus) ui.habboImportStatus.textContent = '已从资源库选择：' + (existing.name || target.displayName) + '，已切换到放置模式。';
    return { prefab: existing, reused: true };
  }
  var buffer = await fetchHabboAssetFileBuffer(target.swfRelativePath);
  var result = await importHabboSwfToSceneFromBuffer(buffer, {
    assetName: basenameFromPath(target.swfRelativePath),
    relativePath: target.swfRelativePath,
    displayName: String(target.displayName || target.classname || makeHabboDisplayNameFromRelativePath(target.swfRelativePath)),
    prefabId: prefabId,
    select: true,
    prepareForPlacement: true,
    sourceKind: 'habbo-root',
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

async function scanAssetPrefabs(force) {
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
    if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
    return false;
  }
  if (!force && Date.now() - (st.lastAt || 0) < 500) {
    pushLog('prefab-assets: scan skipped debounce');
    if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
    return false;
  }
  st.inFlight = true;
  st.lastError = '';
  if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
  pushLog('prefab-assets: scan start force=' + (!!force) + ' existingManaged=' + st.ids.size);
  try {
    var res = await fetch(ASSET_PREFAB_INDEX_URL + '?t=' + Date.now(), { cache: 'no-store' });
    var data = await res.json();
    if (!res.ok || !data || !Array.isArray(data.items)) throw new Error('invalid prefab index');
    st.totalFiles = data.items.length;
    st.lastItems = data.items.map(function (item) { return { file: item.file, id: item.id || '', name: item.name || '', kind: item.kind || '' }; });
    st.ids.forEach(function (id) {
      var idx = prototypes.findIndex(function (p) { return p.id === id && p.assetManaged; });
      if (idx >= 0) prototypes.splice(idx, 1);
    });
    st.ids.clear();
    var imported = 0;
    for (var i = 0; i < data.items.length; i++) {
      var item = data.items[i];
      try {
        var resp = await fetch('assets/prefabs/' + encodeURIComponent(item.file) + '?t=' + (item.mtimeMs || Date.now()), { cache: 'no-store' });
        var def = await resp.json();
        var importedDef = importPrefabDefinition(def, { persist: false, source: 'assets:' + item.file, sourceKind: 'asset' });
        if (importedDef) {
          imported += 1;
          pushLog('prefab-assets:file ok file=' + item.file + ' id=' + importedDef.id + ' name=' + JSON.stringify(importedDef.name || ''));
        } else {
          pushLog('prefab-assets:file skipped file=' + item.file + ' id=' + JSON.stringify(def && def.id || ''));
        }
      } catch (err) {
        pushLog('prefab-assets:error file=' + item.file + ' ' + (err && err.message ? err.message : err));
      }
    }
    refreshPrefabSelectOptions();
    st.importedCount = imported;
    st.lastAt = Date.now();
    lastAssetPrefabScanAt = st.lastAt;
    st.lastSummary = '扫描 ' + data.items.length + ' 个文件，导入 ' + imported + ' 个 prefab';
    pushLog('prefab-assets: scanned files=' + data.items.length + ' imported=' + imported + ' prototypeCount=' + prototypes.length);
    if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
    return true;
  } catch (err) {
    st.lastError = String(err && err.message ? err.message : err);
    st.lastSummary = '扫描失败';
    pushLog('prefab-assets:error ' + st.lastError);
    if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
    return false;
  } finally {
    st.inFlight = false;
    assetPrefabScanInFlight = false;
    if (typeof refreshAssetScanStatus === 'function') refreshAssetScanStatus();
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

function refreshPrefabSelectOptions() {
  if (!ui.prefabSelect) return;
  ui.prefabSelect.innerHTML = '';
  prototypes.forEach(function (prefab, idx) {
    var variant = prefabVariant(prefab, 0);
    var opt = document.createElement('option');
    opt.value = String(idx);
    var voxelInfo = prefab.proxyFallbackUsed ? ('源代理=0，运行时回退=' + normalizedCountText(variant.voxels.length)) : ('代理=' + normalizedCountText(variant.voxels.length));
    opt.textContent = (prefab.key ? prefab.key + '. ' : '') + prefab.name + (prefab.custom ? ' [自定义]' : prefab.assetManaged ? ' [assets]' : '') + (prefab.sprite && prefab.sprite.image ? ' [sprite]' : '') + ' (' + variant.w + '×' + variant.d + '×' + variant.h + ' · ' + voxelInfo + ')';
    ui.prefabSelect.appendChild(opt);
  });
  ui.prefabSelect.value = String(clamp(editor ? editor.prototypeIndex : 0, 0, Math.max(0, prototypes.length - 1)));
}

pushLog('[habbo-library] boot hook active on start.bat main entry build=' + habboLibraryState.versionTag + ' presetRoot=' + String((habboAssetRootState && habboAssetRootState.root) || ''));

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
  try { pushLog('[asset-management-owner-ok] context=' + ctx + ' exports=' + ASSET_MANAGEMENT_CRITICAL_EXPORTS.length); } catch (_) {}
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
