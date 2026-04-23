// ui-habbo-library.js
// Step-05: 从 ui.js 中迁出 Habbo library 选择器与 modal 绑定，保留全局调用兼容。

var UI_HABBO_LIBRARY_OWNER = 'src/presentation/ui/ui-habbo-library.js';

function uiHabboLibraryRoute(event, extra = '') {
  try {
    if (typeof logRoute === 'function') logRoute('ui-habbo-library', event, extra);
    else if (typeof detailLog === 'function') detailLog(`[route][ui-habbo-library] ${event}${extra ? ' ' + extra : ''}`);
  } catch (_err) {}
}

var __habboLibraryUiBound = false;

var __habboLibraryBusyClickTs = 0;

function isHabboLibraryBusy() {
  return !!(habboLibraryState && (habboLibraryState.summaryLoading || habboLibraryState.pageLoading || habboLibraryState.summaryPending));
}

function logHabboLibraryBusy(action) {
  var now = Date.now();
  if (now - __habboLibraryBusyClickTs < 400) return;
  __habboLibraryBusyClickTs = now;
  habboLibraryLog('ui-busy action=' + String(action || 'unknown') + ' summaryLoading=' + String(!!habboLibraryState.summaryLoading) + ' summaryPending=' + String(!!habboLibraryState.summaryPending) + ' pageLoading=' + String(!!habboLibraryState.pageLoading));
}


function getHabboLibraryAssetWorkflow() {
  try { return window.App && window.App.services ? window.App.services.assetWorkflow || null : null; } catch (_) { return null; }
}

function getHabboLibraryController() {
  try { return window.App && window.App.controllers ? window.App.controllers.assetLibrary || null : null; } catch (_) { return null; }
}

function dispatchHabboLibraryCommand(action, payload) {
  try {
    if (window.App && window.App.controllers && typeof window.App.controllers.dispatch === 'function') {
      var dispatched = window.App.controllers.dispatch('assetLibrary', action, payload);
      if (dispatched && dispatched.ok !== false) return dispatched;
    }
  } catch (_) {}
  var controller = getHabboLibraryController();
  try {
    if (controller && typeof controller.dispatch === 'function') return controller.dispatch(action, payload);
  } catch (_) {}
  return null;
}

function handleHabboLibraryUiError(action, err) {
  var message = String(err && err.message ? err.message : err || '未知错误');
  habboLibraryLog('ui-action:error action=' + String(action || 'unknown') + ' message=' + message);
  if (err && err.stack) habboLibraryLog('ui-action:stack action=' + String(action || 'unknown') + ' stack=' + String(err.stack).split('\n').slice(0, 6).join(' | '));
  try {
    habboLibraryState.loadError = message;
    habboLibraryState.loading = false;
    habboLibraryState.summaryLoading = false;
    habboLibraryState.pageLoading = false;
    habboLibraryState.summaryPending = false;
  } catch (_) {}
  try { updateHabboRootStatus('Habbo 根目录设置失败：' + message); } catch (_) {}
  try { renderHabboLibraryBrowser(); } catch (_) {}
  return { ok: false, error: message };
}

async function runHabboLibraryUiAction(action, fn) {
  try {
    return await fn();
  } catch (err) {
    return handleHabboLibraryUiError(action, err);
  }
}

async function ensureHabboLibrarySummaryFromWorkflow(force, source) {
  var workflow = getHabboLibraryAssetWorkflow();
  if (workflow && typeof workflow.ensureHabboLibrarySummary === 'function') {
    return await workflow.ensureHabboLibrarySummary({ force: !!force, source: String(source || 'ui-habbo-library:summary') });
  }
  return await fetchHabboLibrarySummary(!!force);
}

async function ensureHabboLibraryPageFromWorkflow(force, source) {
  var workflow = getHabboLibraryAssetWorkflow();
  if (workflow && typeof workflow.ensureHabboLibraryPage === 'function') {
    return await workflow.ensureHabboLibraryPage({
      force: !!force,
      type: habboLibraryState.activeType || 'room',
      category: habboLibraryState.activeCategory || 'all',
      search: habboLibraryState.search || '',
      page: habboLibraryState.page || 1,
      pageSize: habboLibraryState.pageSize || 15,
      source: String(source || 'ui-habbo-library:page')
    });
  }
  return await fetchHabboLibraryPage(!!force);
}

function setHabboLibraryVisibility(visible) {
  if (!ui || !ui.habboLibraryModal) return;
  ui.habboLibraryModal.classList.toggle('hidden', !visible);
}

function habboLibraryEscapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHabboLibraryPreviewMeta(item) {
  if (!item) return '请先选择一个资源。';
  var rows = [
    ['名称', item.displayName || ''],
    ['Classname', item.classname || ''],
    ['类型', prettyHabboLibraryTypeLabel(item.type || 'room')],
    ['分类', prettyHabboLibraryCategoryLabel(item.category || 'other')],
    ['系列', prettyHabboLibraryCategoryLabel(item.furniLine || 'other')],
    ['Prefab ID', item.prefabId || '']
  ];
  var html = ['<div class="metaGrid">'];
  rows.forEach(function(entry){
    if (!entry[1]) return;
    html.push('<div class="metaRow"><div class="metaLabel">' + habboLibraryEscapeHtml(entry[0]) + '</div><div class="metaValue">' + habboLibraryEscapeHtml(entry[1]) + '</div></div>');
  });
  if (item.swfRelativePath) {
    html.push('<div class="metaRow"><div class="metaLabel">SWF</div><div class="metaPath">' + habboLibraryEscapeHtml(item.swfRelativePath) + '</div></div>');
  }
  html.push('</div>');
  return html.join('');
}

function renderHabboLibraryBrowser() {
  if (!ui || !ui.habboLibraryGrid) return;
  if (ui.habboLibraryRootLabel) ui.habboLibraryRootLabel.textContent = '当前资源库根目录：' + ((habboAssetRootState && habboAssetRootState.root) ? habboAssetRootState.root : '未配置');
  if (ui.habboLibraryTypeRoom) ui.habboLibraryTypeRoom.classList.toggle('active', (habboLibraryState.activeType || 'room') === 'room');
  if (ui.habboLibraryTypeWall) ui.habboLibraryTypeWall.classList.toggle('active', (habboLibraryState.activeType || 'room') === 'wall');
  if (ui.habboLibrarySearch && ui.habboLibrarySearch.value !== String(habboLibraryState.search || '')) ui.habboLibrarySearch.value = String(habboLibraryState.search || '');
  if (ui.habboLibraryDiagnostics) ui.habboLibraryDiagnostics.textContent = habboLibraryState.debugText || '无调试信息';
  var status = 'Habbo 资源库：';
  if (habboLibraryState.summaryPending) status += '索引构建中，请稍候…';
  else if (habboLibraryState.summaryLoading || habboLibraryState.loading) status += '正在读取…';
  else if (habboLibraryState.loadError) status += '读取失败：' + habboLibraryState.loadError;
  else status += '总计 ' + Number(habboLibraryState.totalItems || 0) + ' 项；room=' + Number((habboLibraryState.totalsByType || {}).room || 0) + '；wall=' + Number((habboLibraryState.totalsByType || {}).wall || 0) + '；模式=' + (habboLibraryState.libraryMode || '');
  if (ui.habboLibraryStatus) ui.habboLibraryStatus.textContent = status;
  var disableBusy = !!(habboLibraryState.summaryLoading || habboLibraryState.pageLoading);
  if (ui.refreshHabboLibrary) ui.refreshHabboLibrary.disabled = disableBusy;
  if (ui.habboLibraryRefresh) ui.habboLibraryRefresh.disabled = disableBusy;
  if (ui.habboLibraryTypeRoom) ui.habboLibraryTypeRoom.disabled = disableBusy;
  if (ui.habboLibraryTypeWall) ui.habboLibraryTypeWall.disabled = disableBusy;
  if (ui.habboLibrarySearch) ui.habboLibrarySearch.disabled = !!habboLibraryState.summaryPending;
  var currentType = habboLibraryState.activeType || 'room';
  var currentCategory = habboLibraryState.activeCategory || 'all';
  var categories = getHabboLibraryCategoriesForType(currentType);
  if (ui.habboLibraryCategoryList) {
    var totalInType = Number((habboLibraryState.totalsByType || {})[currentType] || 0);
    var html = ['<button type="button" class="habboCategoryBtn ' + (currentCategory === 'all' ? 'active' : '') + '" data-category="all">全部分类 · ' + totalInType + '</button>'];
    categories.forEach(function (cat) { html.push('<button type="button" class="habboCategoryBtn ' + ((currentCategory === cat.key) ? 'active' : '') + '" data-category="' + cat.key + '">' + (cat.label || cat.key) + ' · ' + (cat.count || 0) + '</button>'); });
    ui.habboLibraryCategoryList.innerHTML = html.join('');
    Array.from(ui.habboLibraryCategoryList.querySelectorAll('[data-category]')).forEach(function (btn) { btn.addEventListener('click', async function () { var nextCategory = btn.getAttribute('data-category') || 'all'; habboLibraryLog('category-click type=' + currentType + ' category=' + nextCategory); var dispatched = dispatchHabboLibraryCommand('handleCategorySelect', [nextCategory, 'ui-habbo-library:category-filter']); if (dispatched) await dispatched; else { habboLibraryState.activeCategory = nextCategory; habboLibraryState.page = 1; habboLibraryState.queryKey = ''; if ((habboLibraryState.activeCategory || 'all') !== 'all' || String(habboLibraryState.search || '').trim()) await ensureHabboLibraryPageFromWorkflow(true, 'ui-habbo-library:category-filter'); } renderHabboLibraryBrowser(); }); });
  }
  var browseMode = (String(habboLibraryState.search || '').trim() || currentCategory !== 'all') ? 'items' : 'categories';
  if (browseMode === 'categories') {
    if (ui.habboLibrarySummary) ui.habboLibrarySummary.innerHTML = prettyHabboLibraryTypeLabel(currentType) + ' · 共 ' + categories.length + ' 个粗分类。先点左侧分类，或直接搜索家具名。';
    if (!categories.length) ui.habboLibraryGrid.innerHTML = '<div class="habboLibraryEmpty">没有读到分类。请先确认根目录正确，或点击“刷新索引”。</div>';
    else {
      ui.habboLibraryGrid.innerHTML = categories.map(function (cat) { var thumb = (cat.sampleIconRelativePath) ? ('<div class="habboLibraryThumb"><img loading="lazy" src="' + makeHabboLibraryIconUrl(cat.sampleIconRelativePath) + '" alt="' + (cat.label || cat.key) + '"></div>') : ('<div class="habboLibraryThumb placeholder">' + (cat.label || cat.key) + '</div>'); return '<button type="button" class="habboLibraryItem habboLibraryCategoryCard" data-category-card="' + cat.key + '">' + thumb + '<div class="habboLibraryItemName">' + (cat.label || cat.key) + '</div><div class="habboLibraryItemMeta">' + prettyHabboLibraryTypeLabel(currentType) + '<br>' + (cat.count || 0) + ' 项</div></button>'; }).join('');
      Array.from(ui.habboLibraryGrid.querySelectorAll('[data-category-card]')).forEach(function (btn) { btn.addEventListener('click', async function () { var nextCategory = btn.getAttribute('data-category-card') || 'all'; habboLibraryLog('category-card-click type=' + currentType + ' category=' + nextCategory); var dispatched = dispatchHabboLibraryCommand('handleCategorySelect', [nextCategory, 'ui-habbo-library:category-card']); if (dispatched) await dispatched; else { habboLibraryState.activeCategory = nextCategory; habboLibraryState.page = 1; habboLibraryState.queryKey = ''; await ensureHabboLibraryPageFromWorkflow(true, 'ui-habbo-library:category-card'); } renderHabboLibraryBrowser(); }); });
    }
    if (ui.habboLibraryPreviewThumb) { ui.habboLibraryPreviewThumb.classList.add('empty'); ui.habboLibraryPreviewThumb.textContent = '先选分类'; }
    if (ui.habboLibraryPreviewMeta) ui.habboLibraryPreviewMeta.textContent = '当前处于分类浏览模式。';
    if (ui.habboLibraryPlace) ui.habboLibraryPlace.disabled = true;
    return;
  }
  var items = Array.isArray(habboLibraryState.items) ? habboLibraryState.items : [];
  var total = Number(habboLibraryState.totalItems || items.length || 0);
  var page = Number(habboLibraryState.page || 1);
  var totalPages = Number(habboLibraryState.totalPages || 1);
  if (ui.habboLibrarySummary) {
    var summaryHtml = prettyHabboLibraryTypeLabel(currentType) + ' / ' + (currentCategory === 'all' ? '全部分类' : prettyHabboLibraryCategoryLabel(currentCategory)) + ' · 当前页 ' + items.length + ' 项 / 总计 ' + total + ' 项';
    if (totalPages > 1) summaryHtml += '<span class="habboLibraryPager"><button type="button" class="habboPagerBtn" data-page-action="prev" ' + (page <= 1 ? 'disabled' : '') + '>上一页</button><span class="habboPagerInfo">第 ' + page + ' / ' + totalPages + ' 页</span><button type="button" class="habboPagerBtn" data-page-action="next" ' + (page >= totalPages ? 'disabled' : '') + '>下一页</button></span>';
    ui.habboLibrarySummary.innerHTML = summaryHtml;
    Array.from(ui.habboLibrarySummary.querySelectorAll('[data-page-action]')).forEach(function (btn) { btn.addEventListener('click', async function () { var action = btn.getAttribute('data-page-action'); habboLibraryLog('page-click action=' + action + ' next=' + (action === 'prev' ? Math.max(1, page - 1) : Math.min(totalPages, page + 1))); var dispatched = dispatchHabboLibraryCommand('handlePageAction', [action, 'ui-habbo-library:page-click']); if (dispatched) await dispatched; else { habboLibraryState.page = action === 'prev' ? Math.max(1, page - 1) : Math.min(totalPages, page + 1); habboLibraryState.queryKey = ''; await ensureHabboLibraryPageFromWorkflow(true, 'ui-habbo-library:page-click'); } renderHabboLibraryBrowser(); }); });
  }
  if (!items.length) ui.habboLibraryGrid.innerHTML = '<div class="habboLibraryEmpty">当前页没有结果。可以换一个分类，或换个关键词。</div>';
  else {
    ui.habboLibraryGrid.innerHTML = items.map(function (item) { var active = String(item.assetId) === String(habboLibraryState.selectedAssetId || ''); var thumb = item.iconRelativePath ? ('<div class="habboLibraryThumb"><img loading="lazy" src="' + makeHabboLibraryIconUrl(item.iconRelativePath) + '" alt="' + item.displayName + '"></div>') : '<div class="habboLibraryThumb placeholder">无 icon</div>'; return '<button type="button" class="habboLibraryItem ' + (active ? 'active' : '') + '" data-asset-id="' + item.assetId + '">' + thumb + '<div class="habboLibraryItemName">' + item.displayName + '</div><div class="habboLibraryItemMeta">' + prettyHabboLibraryCategoryLabel(item.category) + '<br>' + prettyHabboLibraryCategoryLabel(item.furniLine || 'other') + '</div></button>'; }).join('');
    Array.from(ui.habboLibraryGrid.querySelectorAll('[data-asset-id]')).forEach(function (btn) { btn.addEventListener('click', function () { habboLibraryState.selectedAssetId = btn.getAttribute('data-asset-id') || ''; ensureHabboLibrarySelection(); renderHabboLibraryBrowser(); }); btn.addEventListener('dblclick', async function () { habboLibraryState.selectedAssetId = btn.getAttribute('data-asset-id') || ''; ensureHabboLibrarySelection(); renderHabboLibraryBrowser(); try { var dispatched = dispatchHabboLibraryCommand('handlePlaceSelectedItem', ['ui-habbo-library:item-dblclick']); if (dispatched) await dispatched; else await loadHabboLibraryItemToPlacement(getSelectedHabboLibraryItem()); setHabboLibraryVisibility(false); setActivePanelTab('items'); } catch (err) { if (ui.habboLibraryStatus) ui.habboLibraryStatus.textContent = '加载失败：' + (err && err.message ? err.message : err); } }); });
  }
  var selected = ensureHabboLibrarySelection();
  if (ui.habboLibraryPreviewThumb) { if (selected && selected.iconRelativePath) { ui.habboLibraryPreviewThumb.classList.remove('empty'); ui.habboLibraryPreviewThumb.innerHTML = '<img src="' + makeHabboLibraryIconUrl(selected.iconRelativePath) + '" alt="' + selected.displayName + '">'; } else { ui.habboLibraryPreviewThumb.classList.add('empty'); ui.habboLibraryPreviewThumb.textContent = selected ? '无 icon' : '未选择'; } }
  if (ui.habboLibraryPreviewMeta) ui.habboLibraryPreviewMeta.innerHTML = renderHabboLibraryPreviewMeta(selected);
  if (ui.habboLibraryPlace) ui.habboLibraryPlace.disabled = !selected;
}

async function openHabboLibraryBrowser(forceRefresh, extra) {
  var source = extra && extra.source ? String(extra.source) : 'ui-habbo-library:open-browser';
  habboLibraryLog('selector-open-click force=' + (!!forceRefresh) + ' root=' + String((habboAssetRootState && habboAssetRootState.root) || '') + ' source=' + source);
  setHabboLibraryVisibility(true);
  renderHabboLibraryBrowser();
  if (habboLibraryState.summaryLoading && habboLibraryState.summaryPromise) {
    logHabboLibraryBusy('open-reuse');
    await habboLibraryState.summaryPromise;
    renderHabboLibraryBrowser();
    return;
  }
  var dispatched = dispatchHabboLibraryCommand('handleOpenBrowserClick', [!!forceRefresh, source]);
  if (dispatched) {
    await dispatched;
    renderHabboLibraryBrowser();
    return;
  }
  if (controller && typeof controller.openHabboLibrary === 'function' && source !== 'p7a:open-habbo-library') {
    await controller.openHabboLibrary(!!forceRefresh, source);
    renderHabboLibraryBrowser();
    return;
  }
  await ensureHabboLibrarySummaryFromWorkflow(!!forceRefresh, source);
  renderHabboLibraryBrowser();
}

function bindHabboLibraryUi() {
  if (__habboLibraryUiBound) return true;
  if (!ui || typeof safeListen !== 'function') {
    uiHabboLibraryRoute('bind-skip', 'missing-ui-or-safeListen');
    return false;
  }
  safeListen(ui.setHabboAssetRoot, 'click', async () => {
    await runHabboLibraryUiAction('set-root', async () => {
      try {
        var replayCtx = (typeof window !== 'undefined') ? window.__ACCEPTANCE_REPLAY_CONTEXT__ : null;
        if (replayCtx && replayCtx.active && replayCtx.defaultHabboRoot) {
          habboLibraryLog('set-root using replay-context root=' + String(replayCtx.defaultHabboRoot));
          return await setHabboAssetRootConfig(String(replayCtx.defaultHabboRoot));
        }
      } catch (_) {}
      var seed = (habboAssetRootState && habboAssetRootState.root) || '';
      var path = window.prompt('请输入“分类后的 Habbo 素材库根目录”（里面应有 index.json、room/wall 目录，以及每个物件目录中的 swf + icon）', seed);
      if (path == null) return { ok: false, cancelled: true };
      return await setHabboAssetRootConfig(path);
    });
  });
  safeListen(ui.scanHabboAssetRoot, 'click', async () => {
    if (ui.habboImportStatus) ui.habboImportStatus.textContent = 'Habbo 根目录批量导入中：会递归读取已配置目录中的 SWF，并加入当前物品列表。这个入口更适合调试，日常建议用“打开 Habbo 资源选择器”。';
    await scanHabboAssetRoot(true);
  });
  safeListen(ui.openHabboLibrary, 'click', async () => {
    await runHabboLibraryUiAction('open-browser', async () => {
      habboLibraryLog('selector button clicked from items tab');
      if (isHabboLibraryBusy()) { logHabboLibraryBusy('open-button'); setHabboLibraryVisibility(true); renderHabboLibraryBrowser(); return { ok: true, reusedBusy: true }; }
      return await openHabboLibraryBrowser(false);
    });
  });
  safeListen(ui.refreshHabboLibrary, 'click', async () => {
    await runHabboLibraryUiAction('refresh-browser-items-tab', async () => {
      habboLibraryLog('refresh button clicked from items tab');
      if (isHabboLibraryBusy()) { logHabboLibraryBusy('refresh-items-tab'); setHabboLibraryVisibility(true); renderHabboLibraryBrowser(); return { ok: true, reusedBusy: true }; }
      var dispatched = dispatchHabboLibraryCommand('handleRefreshBrowserClick', ['ui-habbo-library:refresh-button']);
      if (dispatched) { await dispatched; setHabboLibraryVisibility(true); renderHabboLibraryBrowser(); return { ok: true, dispatched: true }; }
      return await openHabboLibraryBrowser(true);
    });
  });
  safeListen(ui.habboLibraryRefresh, 'click', async () => {
    await runHabboLibraryUiAction('refresh-browser-modal', async () => {
      habboLibraryLog('refresh button clicked inside modal');
      if (isHabboLibraryBusy()) { logHabboLibraryBusy('refresh-modal'); renderHabboLibraryBrowser(); return { ok: true, reusedBusy: true }; }
      var dispatched = dispatchHabboLibraryCommand('handleRefreshBrowserClick', ['ui-habbo-library:refresh-button']);
      if (dispatched) { await dispatched; setHabboLibraryVisibility(true); renderHabboLibraryBrowser(); return { ok: true, dispatched: true }; }
      return await openHabboLibraryBrowser(true);
    });
  });
  safeListen(ui.habboLibraryClose, 'click', () => setHabboLibraryVisibility(false));
  safeListen(ui.habboLibraryBackdrop, 'click', () => setHabboLibraryVisibility(false));
  safeListen(ui.habboLibrarySearch, 'input', async () => {
    var nextSearch = String((ui.habboLibrarySearch && ui.habboLibrarySearch.value) || '');
    habboLibraryLog('search input=' + nextSearch);
    var dispatched = dispatchHabboLibraryCommand('handleSearchInput', [nextSearch, 'ui-habbo-library:search-input']);
    if (dispatched) await dispatched;
    else {
      habboLibraryState.search = nextSearch;
      habboLibraryState.page = 1;
      habboLibraryState.queryKey = '';
      if (String(habboLibraryState.search || '').trim()) await ensureHabboLibraryPageFromWorkflow(true, 'ui-habbo-library:search-input');
    }
    renderHabboLibraryBrowser();
  });
  safeListen(ui.habboLibraryTypeRoom, 'click', async () => {
    habboLibraryLog('type switch -> room');
    var dispatched = dispatchHabboLibraryCommand('handleTypeSwitch', ['room', 'ui-habbo-library:type-switch']);
    if (dispatched) await dispatched;
    else {
      habboLibraryState.activeType = 'room';
      habboLibraryState.activeCategory = 'all';
      habboLibraryState.page = 1;
      habboLibraryState.queryKey = '';
      await ensureHabboLibrarySummaryFromWorkflow(false, 'ui-habbo-library:type-switch');
    }
    renderHabboLibraryBrowser();
  });
  safeListen(ui.habboLibraryTypeWall, 'click', async () => {
    habboLibraryLog('type switch -> wall');
    var dispatched = dispatchHabboLibraryCommand('handleTypeSwitch', ['wall', 'ui-habbo-library:type-switch']);
    if (dispatched) await dispatched;
    else {
      habboLibraryState.activeType = 'wall';
      habboLibraryState.activeCategory = 'all';
      habboLibraryState.page = 1;
      habboLibraryState.queryKey = '';
      await ensureHabboLibrarySummaryFromWorkflow(false, 'ui-habbo-library:type-switch');
    }
    renderHabboLibraryBrowser();
  });
  safeListen(ui.habboLibraryPlace, 'click', async () => {
    try {
      var dispatched = dispatchHabboLibraryCommand('handlePlaceSelectedItem', ['ui-habbo-library:place-selected']);
      if (dispatched) await dispatched;
      else await loadHabboLibraryItemToPlacement(getSelectedHabboLibraryItem());
      setHabboLibraryVisibility(false);
      setActivePanelTab('items');
    } catch (err) {
      if (ui.habboLibraryStatus) ui.habboLibraryStatus.textContent = '加载失败：' + (err && err.message ? err.message : err);
    }
  });
  __habboLibraryUiBound = true;
  uiHabboLibraryRoute('bind-ok', 'root=' + String((habboAssetRootState && habboAssetRootState.root) || 'unset'));
  return true;
}

window.__UI_HABBO_LIBRARY_API = {
  owner: UI_HABBO_LIBRARY_OWNER,
  setHabboLibraryVisibility,
  renderHabboLibraryPreviewMeta,
  renderHabboLibraryBrowser,
  openHabboLibraryBrowser,
  bindHabboLibraryUi,
};

if (typeof markRefactorCheckpoint === 'function') {
  markRefactorCheckpoint('UiHabboLibrary', 'habbo-library-api-ready', {
    owner: UI_HABBO_LIBRARY_OWNER,
    hasOpenButton: !!(ui && ui.openHabboLibrary),
    hasModal: !!(ui && ui.habboLibraryModal),
    hasGrid: !!(ui && ui.habboLibraryGrid),
  });
}

bindHabboLibraryUi();
