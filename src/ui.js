// Inspector + tabs helpers

function refreshAssetScanStatus() {
  if (!ui.assetScanStatus && !ui.assetScanDetails) return;
  var snap = (typeof getAssetPrefabScanSnapshot === 'function') ? getAssetPrefabScanSnapshot() : null;
  if (!snap) {
    if (ui.assetScanStatus) ui.assetScanStatus.textContent = 'assets 扫描状态：不可用';
    if (ui.assetScanDetails) ui.assetScanDetails.textContent = '';
    return;
  }
  var summary = `assets 扫描：${snap.serverMode ? 'server' : 'static'} · inFlight=${snap.inFlight} · files=${snap.totalFiles} · imported=${snap.importedCount}`;
  if (snap.lastError) summary += ` · error=${snap.lastError}`;
  else if (snap.lastSummary) summary += ` · ${snap.lastSummary}`;
  if (ui.assetScanStatus) ui.assetScanStatus.textContent = summary;
  if (ui.assetScanDetails) ui.assetScanDetails.textContent = prettyJson({
    serverMode: snap.serverMode,
    inFlight: snap.inFlight,
    lastAt: snap.lastAt ? new Date(snap.lastAt).toLocaleTimeString() : null,
    lastSummary: snap.lastSummary,
    lastError: snap.lastError,
    totalFiles: snap.totalFiles,
    importedCount: snap.importedCount,
    assetManagedIds: snap.ids,
    lastItems: snap.lastItems
  });
}

function setActivePanelTab(tab) {
  inspectorState.activeTab = tab;
  if (ui.tabWorld) ui.tabWorld.classList.toggle('active', tab === 'world');
  if (ui.tabItems) ui.tabItems.classList.toggle('active', tab === 'items');
  if (ui.tabLights) ui.tabLights.classList.toggle('active', tab === 'lights');
  if (ui.tabPlayer) ui.tabPlayer.classList.toggle('active', tab === 'player');
  if (ui.tabWorldPage) ui.tabWorldPage.classList.toggle('active', tab === 'world');
  if (ui.tabItemsPage) ui.tabItemsPage.classList.toggle('active', tab === 'items');
  if (ui.tabLightsPage) ui.tabLightsPage.classList.toggle('active', tab === 'lights');
  if (ui.tabPlayerPage) ui.tabPlayerPage.classList.toggle('active', tab === 'player');
}

function refreshItemInspector() {
  var inst = getSelectedInstance();
  var prefab = getSelectedPrefab();
  if (!inst || !prefab) {
    if (ui.itemInspectorEmpty) ui.itemInspectorEmpty.classList.remove('hidden');
    if (ui.itemInspectorPanel) ui.itemInspectorPanel.classList.add('hidden');
    if (ui.itemInspectorSummary) { ui.itemInspectorSummary.classList.add('hidden'); ui.itemInspectorSummary.textContent = ''; }
    if (ui.itemInspectorInstance) ui.itemInspectorInstance.textContent = '';
    if (ui.itemInspectorPrefab) ui.itemInspectorPrefab.textContent = '';
    refreshAssetScanStatus();
    return;
  }
  if (ui.itemInspectorEmpty) ui.itemInspectorEmpty.classList.add('hidden');
  if (ui.itemInspectorPanel) ui.itemInspectorPanel.classList.remove('hidden');
  if (ui.itemInspectorSummary) {
    ui.itemInspectorSummary.classList.remove('hidden');
    ui.itemInspectorSummary.textContent = `已选中：${prefab.name} / ${inst.instanceId} · 位置=(${inst.x}, ${inst.y}, ${inst.z}) · 旋转=${inst.rotation || 0}`;
  }
  if (ui.itemInspectorInstance) ui.itemInspectorInstance.textContent = prettyJson({
    instanceId: inst.instanceId,
    prefabId: inst.prefabId,
    kind: prefab.kind || prefab.id,
    position: { x: inst.x, y: inst.y, z: inst.z },
    rotation: inst.rotation || 0,
    name: inst.name || prefab.name,
    tags: inst.tags || [],
    state: inst.state || {},
    subpartState: inst.subpartState || {}
  });
  if (ui.itemInspectorPrefab) ui.itemInspectorPrefab.textContent = prettyJson({
    id: prefab.id,
    name: prefab.name,
    kind: prefab.kind || prefab.id,
    dimensions: { w: prefab.w, d: prefab.d, h: prefab.h },
    voxelCount: prefab.voxels.length,
    anchor: prefab.anchor || { x: 0, y: 0, z: 0 },
    supportCells: (prefab.supportCells || []).length,
    subparts: prefab.subparts ? Object.keys(prefab.subparts) : [],
    placementPolicy: prefab.placementPolicy || null,
    callableActions: prefab.callableActions ? Object.keys(prefab.callableActions) : [],
    spriteDirections: prefab.spriteDirections ? Object.keys(prefab.spriteDirections) : [],
    habboMeta: prefab.habboMeta || null
  });
}

function refreshPlayerInspector() {
  var proxy = getPlayerProxyBox();
  if (ui.playerInspectorSummary) ui.playerInspectorSummary.textContent = `角色位置=(${player.x.toFixed(2)}, ${player.y.toFixed(2)}) · 朝向=${player.dir} · moving=${!!player.moving}`;
  if (ui.playerInspectorDetails) ui.playerInspectorDetails.textContent = prettyJson({
    position: { x: Number(player.x.toFixed(3)), y: Number(player.y.toFixed(3)) },
    radius: player.r,
    speed: player.speed,
    moving: !!player.moving,
    dir: player.dir,
    walkPhase: Number(player.walk.toFixed(3)),
    proxyBox: { x: Number(proxy.x.toFixed(3)), y: Number(proxy.y.toFixed(3)), z: proxy.z, w: Number(proxy.w.toFixed(3)), d: Number(proxy.d.toFixed(3)), h: Number(proxy.h.toFixed(3)) },
    settings: { playerHeightCells: settings.playerHeightCells, playerProxyW: settings.playerProxyW, playerProxyD: settings.playerProxyD }
  });
}

function refreshWorldInspector() {
  var effectiveTileScale = Number(settings.tileScale.toFixed(3));
  var summary = `世界=${settings.worldCols}×${settings.worldRows} · 颗粒度=${settings.worldResolution}x · 实际网格=${settings.gridW}×${settings.gridH}`;
  if (ui.worldInspectorSummary) ui.worldInspectorSummary.textContent = summary;
  if (ui.worldInspectorDetails) ui.worldInspectorDetails.textContent = prettyJson({
    worldCols: settings.worldCols,
    worldRows: settings.worldRows,
    worldResolution: settings.worldResolution,
    worldDisplayScale: settings.worldDisplayScale,
    actualGrid: { w: settings.gridW, h: settings.gridH },
    actualTileScale: effectiveTileScale,
    tileSizePx: { w: Number(settings.tileW.toFixed(2)), h: Number(settings.tileH.toFixed(2)) },
    scene: { instances: instances.length, boxes: boxes.length, lights: lights.length },
    note: '第一版中，颗粒度主要作用于新建/重置世界；现有 Prefab 仍按当前最小格单位定义。'
  });
}

function refreshInspectorPanels() {
  refreshWorldInspector();
  refreshItemInspector();
  refreshPlayerInspector();
  refreshAssetScanStatus();
}


function setHabboLibraryVisibility(visible) {
  if (!ui || !ui.habboLibraryModal) return;
  ui.habboLibraryModal.classList.toggle('hidden', !visible);
}

function getHabboLibraryBrowseMode() {
  var search = String(habboLibraryState.search || '').trim();
  if (search) return 'items';
  if ((habboLibraryState.activeCategory || 'all') === 'all') return 'categories';
  return 'items';
}

function clampHabboLibraryPage(page, totalCount) {
  var size = Math.max(1, parseInt(habboLibraryState.pageSize || 15, 10) || 15);
  var totalPages = Math.max(1, Math.ceil((totalCount || 0) / size));
  var nextPage = Math.min(Math.max(parseInt(page || 1, 10) || 1, 1), totalPages);
  habboLibraryState.page = nextPage;
  return { page: nextPage, totalPages: totalPages, pageSize: size };
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
  if (ui.habboLibraryRootLabel) {
    var rootText = (habboAssetRootState && habboAssetRootState.root) ? habboAssetRootState.root : '未配置';
    ui.habboLibraryRootLabel.textContent = '当前资源库根目录：' + rootText;
  }
  if (ui.habboLibraryTypeRoom) ui.habboLibraryTypeRoom.classList.toggle('active', (habboLibraryState.activeType || 'room') === 'room');
  if (ui.habboLibraryTypeWall) ui.habboLibraryTypeWall.classList.toggle('active', (habboLibraryState.activeType || 'room') === 'wall');
  if (ui.habboLibrarySearch && ui.habboLibrarySearch.value !== String(habboLibraryState.search || '')) ui.habboLibrarySearch.value = String(habboLibraryState.search || '');

  if (habboLibraryState.loading) {
    if (ui.habboLibraryStatus) ui.habboLibraryStatus.textContent = 'Habbo 资源库：正在读取索引…';
  } else if (habboLibraryState.loadError) {
    if (ui.habboLibraryStatus) ui.habboLibraryStatus.textContent = 'Habbo 资源库读取失败：' + habboLibraryState.loadError;
  } else {
    var modeText = habboLibraryState.libraryMode === 'classified-index' ? '分类索引模式' : '目录回退扫描模式';
    if (ui.habboLibraryStatus) ui.habboLibraryStatus.textContent = 'Habbo 资源库：共 ' + (habboLibraryState.items || []).length + ' 个条目 · ' + modeText + ' · 已改为分类/分页浏览，避免一次渲染上万张卡片。';
  }

  var currentType = habboLibraryState.activeType || 'room';
  var currentCategory = habboLibraryState.activeCategory || 'all';
  if (ui.habboLibraryCategoryList) {
    var categories = getHabboLibraryCategoriesForType(currentType);
    var totalInType = ((habboLibraryState.items || []).filter(function (item) { return (item.type || 'room') === currentType; }).length);
    var html = ['<button type="button" class="habboCategoryBtn ' + (currentCategory === 'all' ? 'active' : '') + '" data-category="all">全部分类 · ' + totalInType + '</button>'];
    categories.forEach(function (cat) {
      html.push('<button type="button" class="habboCategoryBtn ' + ((currentCategory === cat.key) ? 'active' : '') + '" data-category="' + cat.key + '">' + cat.label + ' · ' + cat.count + '</button>');
    });
    ui.habboLibraryCategoryList.innerHTML = html.join('');
    Array.from(ui.habboLibraryCategoryList.querySelectorAll('[data-category]')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        habboLibraryState.activeCategory = btn.getAttribute('data-category') || 'all';
        habboLibraryState.page = 1;
        ensureHabboLibrarySelection();
        renderHabboLibraryBrowser();
      });
    });
  }

  var browseMode = getHabboLibraryBrowseMode();
  var filtered = getHabboLibraryFilteredItems();
  ensureHabboLibrarySelection();

  if (browseMode === 'categories') {
    var categoriesForType = getHabboLibraryCategoriesForType(currentType);
    if (ui.habboLibrarySummary) {
      ui.habboLibrarySummary.innerHTML = prettyHabboLibraryTypeLabel(currentType) + ' · 共 ' + categoriesForType.length + ' 个粗分类。先点左侧分类，或直接搜索家具名。';
    }
    if (!categoriesForType.length) {
      ui.habboLibraryGrid.innerHTML = '<div class="habboLibraryEmpty">当前类型下没有可用分类。请检查 index.json 是否成功读取，或切换到另一类。</div>';
    } else {
      var firstItemByCategory = new Map();
      (habboLibraryState.items || []).forEach(function (item) {
        if ((item.type || 'room') !== currentType) return;
        var key = String(item.category || 'other');
        if (!firstItemByCategory.has(key)) firstItemByCategory.set(key, item);
      });
      ui.habboLibraryGrid.innerHTML = categoriesForType.map(function (cat) {
        var sample = firstItemByCategory.get(cat.key);
        var thumb = (sample && sample.iconRelativePath) ? ('<div class="habboLibraryThumb"><img src="' + makeHabboLibraryIconUrl(sample.iconRelativePath) + '" alt="' + cat.label + '"></div>') : '<div class="habboLibraryThumb placeholder">' + cat.label + '</div>';
        return '<button type="button" class="habboLibraryItem habboLibraryCategoryCard" data-category-card="' + cat.key + '">' + thumb + '<div class="habboLibraryItemName">' + cat.label + '</div><div class="habboLibraryItemMeta">' + prettyHabboLibraryTypeLabel(currentType) + '<br>' + cat.count + ' 项</div></button>';
      }).join('');
      Array.from(ui.habboLibraryGrid.querySelectorAll('[data-category-card]')).forEach(function (btn) {
        btn.addEventListener('click', function () {
          habboLibraryState.activeCategory = btn.getAttribute('data-category-card') || 'all';
          habboLibraryState.page = 1;
          ensureHabboLibrarySelection();
          renderHabboLibraryBrowser();
        });
      });
    }
  } else {
    var pager = clampHabboLibraryPage(habboLibraryState.page, filtered.length);
    var start = (pager.page - 1) * pager.pageSize;
    var pageItems = filtered.slice(start, start + pager.pageSize);
    if (ui.habboLibrarySummary) {
      var summaryHtml = prettyHabboLibraryTypeLabel(currentType) + ' / ' + (currentCategory === 'all' ? '全部分类' : prettyHabboLibraryCategoryLabel(currentCategory)) + ' · 当前结果 ' + filtered.length + ' 项';
      if (filtered.length > pager.pageSize) {
        summaryHtml += '<span class="habboLibraryPager"><button type="button" class="habboPagerBtn" data-page-action="prev" ' + (pager.page <= 1 ? 'disabled' : '') + '>上一页</button><span class="habboPagerInfo">第 ' + pager.page + ' / ' + pager.totalPages + ' 页</span><button type="button" class="habboPagerBtn" data-page-action="next" ' + (pager.page >= pager.totalPages ? 'disabled' : '') + '>下一页</button></span>';
      }
      ui.habboLibrarySummary.innerHTML = summaryHtml;
      Array.from(ui.habboLibrarySummary.querySelectorAll('[data-page-action]')).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var action = btn.getAttribute('data-page-action');
          habboLibraryState.page = action === 'prev' ? (pager.page - 1) : (pager.page + 1);
          renderHabboLibraryBrowser();
        });
      });
    }
    if (!filtered.length) {
      ui.habboLibraryGrid.innerHTML = '<div class="habboLibraryEmpty">当前筛选下没有结果。可以换一个分类，或直接搜索 furniture/classname 关键词。</div>';
    } else {
      ui.habboLibraryGrid.innerHTML = pageItems.map(function (item) {
        var active = String(item.assetId) === String(habboLibraryState.selectedAssetId || '');
        var thumb = item.iconRelativePath ? ('<div class="habboLibraryThumb"><img loading="lazy" src="' + makeHabboLibraryIconUrl(item.iconRelativePath) + '" alt="' + item.displayName + '"></div>') : '<div class="habboLibraryThumb placeholder">无 icon</div>';
        return '<button type="button" class="habboLibraryItem ' + (active ? 'active' : '') + '" data-asset-id="' + item.assetId + '">' + thumb + '<div class="habboLibraryItemName">' + item.displayName + '</div><div class="habboLibraryItemMeta">' + prettyHabboLibraryCategoryLabel(item.category) + '<br>' + prettyHabboLibraryCategoryLabel(item.furniLine || 'other') + '</div></button>';
      }).join('');
      Array.from(ui.habboLibraryGrid.querySelectorAll('[data-asset-id]')).forEach(function (btn) {
        btn.addEventListener('click', function () {
          habboLibraryState.selectedAssetId = btn.getAttribute('data-asset-id') || '';
          renderHabboLibraryBrowser();
        });
        btn.addEventListener('dblclick', async function () {
          habboLibraryState.selectedAssetId = btn.getAttribute('data-asset-id') || '';
          renderHabboLibraryBrowser();
          try {
            await loadHabboLibraryItemToPlacement(getSelectedHabboLibraryItem());
            setHabboLibraryVisibility(false);
            setActivePanelTab('items');
          } catch (err) {
            if (ui.habboLibraryStatus) ui.habboLibraryStatus.textContent = '加载失败：' + (err && err.message ? err.message : err);
          }
        });
      });
    }
  }

  var selected = getSelectedHabboLibraryItem();
  if (ui.habboLibraryPreviewThumb) {
    if (selected && selected.iconRelativePath) {
      ui.habboLibraryPreviewThumb.classList.remove('empty');
      ui.habboLibraryPreviewThumb.innerHTML = '<img src="' + makeHabboLibraryIconUrl(selected.iconRelativePath) + '" alt="' + selected.displayName + '">';
    } else {
      ui.habboLibraryPreviewThumb.classList.add('empty');
      ui.habboLibraryPreviewThumb.textContent = selected ? '无 icon' : (browseMode === 'categories' ? '先选分类' : '未选择');
    }
  }
  if (ui.habboLibraryPreviewMeta) {
    ui.habboLibraryPreviewMeta.textContent = selected ? prettyJson({
      name: selected.displayName,
      classname: selected.classname,
      type: selected.type,
      category: selected.category,
      furniLine: selected.furniLine,
      swfRelativePath: selected.swfRelativePath,
      prefabId: selected.prefabId,
    }) : (browseMode === 'categories' ? '当前处于分类浏览模式。先点一个粗分类，再从中间网格里选具体资源。' : '请先从中间网格里选择一个资源。');
  }
  if (ui.habboLibraryPlace) ui.habboLibraryPlace.disabled = !selected || browseMode === 'categories';
}

async function openHabboLibraryBrowser(forceRefresh) {
  setHabboLibraryVisibility(true);
  renderHabboLibraryBrowser();
  await fetchHabboLibraryIndex(!!forceRefresh);
  ensureHabboLibrarySelection();
  renderHabboLibraryBrowser();
}

// v1 split file generated from original monolithic app.js
// 注意：此文件为保持行为稳定的第一刀拆分，允许存在少量跨层函数。

function applyWorldDisplayScale(nextDisplayScale, anchorWorld = null, anchorScreen = null) {
  var prevDisplayScale = settings.worldDisplayScale;
  nextDisplayScale = clamp(Number(nextDisplayScale) || prevDisplayScale || 1, 0.5, 2.4);
  if (Math.abs(nextDisplayScale - prevDisplayScale) < 0.0001) return false;
  settings.worldDisplayScale = nextDisplayScale;
  settings.tileScale = settings.worldDisplayScale / settings.worldResolution;
  settings.tileW = BASE_TILE_W * settings.tileScale;
  settings.tileH = BASE_TILE_H * settings.tileScale;
  if (ui.tileScale) ui.tileScale.value = String(Number(settings.worldDisplayScale.toFixed(2)));
  if (anchorWorld && anchorScreen && Number.isFinite(anchorWorld.x) && Number.isFinite(anchorWorld.y) && Number.isFinite(anchorScreen.x) && Number.isFinite(anchorScreen.y)) {
    var anchored = iso(anchorWorld.x, anchorWorld.y, anchorWorld.z || 0);
    camera.x += anchorScreen.x - anchored.x;
    camera.y += anchorScreen.y - anchored.y;
  }
  invalidateShadowGeometryCache('world-zoom');
  refreshInspectorPanels();
  if (editor.mode === 'place' || editor.mode === 'drag') updatePreview();
  pushLog(`world-zoom: displayScale=${settings.worldDisplayScale.toFixed(2)} tileScale=${settings.tileScale.toFixed(2)} camera=(${camera.x.toFixed(1)},${camera.y.toFixed(1)})`);
  return true;
}

function applySettings() {
  setPhase('boot', 'applySettings');
  detailLog(`applySettings:start raw worldCols=${ui.gridW?.value} worldRows=${ui.gridH?.value} resolution=${ui.worldResolution?.value} displayScale=${ui.tileScale?.value} playerHeightCells=${ui.playerHeightCells?.value} playerProxyW=${ui.playerProxyW?.value} playerProxyD=${ui.playerProxyD?.value}`);
  settings.worldCols = clamp(parseInt(ui.gridW.value || '11', 10), WORLD_SIZE_MIN, WORLD_SIZE_MAX);
  settings.worldRows = clamp(parseInt(ui.gridH.value || '9', 10), WORLD_SIZE_MIN, WORLD_SIZE_MAX);
  settings.worldResolution = clamp(parseInt((ui.worldResolution && ui.worldResolution.value) || '1', 10) || 1, 1, 4);
  if (![1, 2, 4].includes(settings.worldResolution)) settings.worldResolution = 1;
  settings.worldDisplayScale = clamp(parseFloat(ui.tileScale.value || '1'), 0.5, 2.4);
  settings.gridW = settings.worldCols * settings.worldResolution;
  settings.gridH = settings.worldRows * settings.worldResolution;
  settings.tileScale = settings.worldDisplayScale / settings.worldResolution;
  settings.playerHeightCells = clamp(parseFloat(ui.playerHeightCells.value || '1.7'), 0.2, 6);
  settings.playerProxyW = clamp(parseFloat((ui.playerProxyW && ui.playerProxyW.value) || '0.32'), 0.15, 4);
  settings.playerProxyD = clamp(parseFloat((ui.playerProxyD && ui.playerProxyD.value) || '0.24'), 0.15, 4);
  settings.tileW = BASE_TILE_W * settings.tileScale;
  settings.tileH = BASE_TILE_H * settings.tileScale;
  settings.originX = VIEW_W * 0.57;
  settings.originY = 150;

  filterInstancesToGrid();
  if (!instances.length) instances = defaultInstances();
  rebuildBoxesFromInstances();
  invalidateShadowGeometryCache('applySettings');
  clampPlayerToWorld();
  if (editor.mode === 'place' || editor.mode === 'drag') updatePreview();
  detailLog(`applySettings:done grid=${settings.gridW}x${settings.gridH} tile=${settings.tileW}x${settings.tileH} view=${VIEW_W}x${VIEW_H} dpr=${dpr.toFixed(2)} instances=${instances.length} boxes=${boxes.length} player=(${player.x.toFixed(2)},${player.y.toFixed(2)})`);
}

safeListen(ui.applyWorld, 'click', applyWorldToNewScene);
safeListen(ui.modeView, 'click', () => setEditorMode('view'));
safeListen(ui.modePlace, 'click', () => setEditorMode('place'));
safeListen(ui.modeDelete, 'click', () => setEditorMode('delete'));
safeListen(ui.tabWorld, 'click', () => setActivePanelTab('world'));
safeListen(ui.tabItems, 'click', () => setActivePanelTab('items'));
safeListen(ui.tabLights, 'click', () => setActivePanelTab('lights'));
safeListen(ui.tabPlayer, 'click', () => setActivePanelTab('player'));
safeListen(ui.prefabSelect, 'change', () => {
  editor.prototypeIndex = clamp(parseInt(ui.prefabSelect.value || '0', 10), 0, prototypes.length - 1);
  var proto = currentProto();
  if (ui.prefabHint) ui.prefabHint.textContent = `当前模板：${proto.name}，局部体素 ${proto.voxels.length} 个，尺寸 ${proto.w}×${proto.d}×${proto.h}。`;
  if (editor.mode !== 'delete') setEditorMode('place');
  updatePreview();
  pushLog(`ui: prefab -> ${proto.name} voxels=${proto.voxels.length}`);
});

safeListen(ui.openEditor, 'click', () => {
  try {
    window.location.href = `START_V18_ONLY.html?fromMain=1&t=${Date.now()}`;
    pushLog('ui: open editor');
  } catch (err) {
    pushLog(`ui: open editor failed ${err?.message || err}`);
  }
});

safeListen(ui.importPrefabJson, 'click', () => {
  if (ui.prefabFileInput) ui.prefabFileInput.click();
});

safeListen(ui.importHabboSwf, 'click', () => {
  if (ui.habboSwfFileInput) ui.habboSwfFileInput.click();
});

safeListen(ui.importHabboDemo, 'click', async () => {
  try {
    var sampleName = (ui.habboSampleSelect && ui.habboSampleSelect.value) || 'nft_h26_silverelf.swf';
    if (ui.habboImportStatus) ui.habboImportStatus.textContent = 'Habbo 导入：正在读取内置示例 ' + sampleName + '，会直接从 SWF 的 bitmap tags 重建图层，并按 Scuti 的“房间对象 + 图层偏移 + proxy”方式注册到当前项目，然后切换到放置模式。';
    pushLog('habbo-ui: bundled import requested sample=' + sampleName);
    var result = await importBundledHabboDemoToScene(sampleName);
    if (ui.prefabHint) ui.prefabHint.textContent = '已导入 Habbo 示例：' + result.prefab.name + '，自动代理尺寸 ' + result.prefab.w + '×' + result.prefab.d + '×' + result.prefab.h + '。';
    if (ui.habboImportStatus) ui.habboImportStatus.textContent = 'Habbo 导入成功：' + result.prefab.id + ' · type=' + result.meta.type + ' · dimensions=' + result.meta.dimensions.x + '×' + result.meta.dimensions.y + '×' + result.meta.dimensions.z + ' · 已加入物品列表，并切换到放置模式。';
    pushLog('habbo-ui: bundled import success prefab=' + result.prefab.id + ' currentProto=' + (typeof currentProto === "function" && currentProto() ? currentProto().id : 'n/a'));
    setActivePanelTab('items');
  } catch (err) {
    pushLog('habbo-import:error ' + (err && err.message ? err.message : err));
    if (ui.habboImportStatus) ui.habboImportStatus.textContent = 'Habbo 导入失败：' + (err && err.message ? err.message : err);
  }
});

safeListen(ui.setHabboAssetRoot, 'click', async () => {
  var seed = (habboAssetRootState && habboAssetRootState.root) || '';
  var path = window.prompt('请输入“分类后的 Habbo 素材库根目录”（里面应有 index.json、room/wall 目录，以及每个物件目录中的 swf + icon）', seed);
  if (path == null) return;
  await setHabboAssetRootConfig(path);
});

safeListen(ui.scanHabboAssetRoot, 'click', async () => {
  if (ui.habboImportStatus) ui.habboImportStatus.textContent = 'Habbo 根目录批量导入中：会递归读取已配置目录中的 SWF，并加入当前物品列表。这个入口更适合调试，日常建议用“打开 Habbo 资源选择器”。';
  await scanHabboAssetRoot(true);
});

safeListen(ui.openHabboLibrary, 'click', async () => {
  habboLibraryLog('selector button clicked from items tab');
  await openHabboLibraryBrowser(false);
});

safeListen(ui.refreshHabboLibrary, 'click', async () => {
  habboLibraryLog('refresh button clicked from items tab');
  await openHabboLibraryBrowser(true);
});

safeListen(ui.habboLibraryRefresh, 'click', async () => {
  habboLibraryLog('refresh button clicked inside modal');
  await openHabboLibraryBrowser(true);
});

safeListen(ui.habboLibraryClose, 'click', () => setHabboLibraryVisibility(false));
safeListen(ui.habboLibraryBackdrop, 'click', () => setHabboLibraryVisibility(false));
safeListen(ui.habboLibrarySearch, 'input', async () => {
  habboLibraryState.search = String((ui.habboLibrarySearch && ui.habboLibrarySearch.value) || '');
  habboLibraryState.page = 1;
  habboLibraryState.queryKey = '';
  habboLibraryLog('search input=' + habboLibraryState.search);
  renderHabboLibraryBrowser();
  if (String(habboLibraryState.search || '').trim()) await fetchHabboLibraryPage(true);
  renderHabboLibraryBrowser();
});
safeListen(ui.habboLibraryTypeRoom, 'click', async () => {
  habboLibraryState.activeType = 'room';
  habboLibraryState.activeCategory = 'all';
  habboLibraryState.page = 1;
  habboLibraryState.queryKey = '';
  habboLibraryLog('type switch -> room');
  renderHabboLibraryBrowser();
  await fetchHabboLibrarySummary(false);
  renderHabboLibraryBrowser();
});
safeListen(ui.habboLibraryTypeWall, 'click', async () => {
  habboLibraryState.activeType = 'wall';
  habboLibraryState.activeCategory = 'all';
  habboLibraryState.page = 1;
  habboLibraryState.queryKey = '';
  habboLibraryLog('type switch -> wall');
  renderHabboLibraryBrowser();
  await fetchHabboLibrarySummary(false);
  renderHabboLibraryBrowser();
});
safeListen(ui.habboLibraryPlace, 'click', async () => {
  try {
    await loadHabboLibraryItemToPlacement(getSelectedHabboLibraryItem());
    setHabboLibraryVisibility(false);
    setActivePanelTab('items');
  } catch (err) {
    if (ui.habboLibraryStatus) ui.habboLibraryStatus.textContent = '加载失败：' + (err && err.message ? err.message : err);
  }
});

safeListen(ui.rescanAssetPrefabs, 'click', async () => {
  try {
    await scanAssetPrefabs(true);
    var proto = currentProto();
    if (ui.prefabHint && proto) ui.prefabHint.textContent = `已重新扫描 assets：当前模板 ${proto.name}，局部体素 ${proto.voxels.length} 个，尺寸 ${proto.w}×${proto.d}×${proto.h}。`;
    refreshAssetScanStatus();
    pushLog('ui: rescan assets prefabs');
  } catch (err) {
    pushLog(`ui: rescan assets prefabs failed ${err?.message || err}`);
  }
});
safeListen(ui.prefabFileInput, 'change', async () => {
  const file = ui.prefabFileInput && ui.prefabFileInput.files && ui.prefabFileInput.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const imported = importPrefabDefinition(parsed, { persist: true, source: `file:${file.name}` });
    if (imported) {
      if (ui.prefabHint) ui.prefabHint.textContent = `已导入：${imported.name}，局部体素 ${imported.voxels.length} 个，尺寸 ${imported.w}×${imported.d}×${imported.h}。`;
      refreshAssetScanStatus();
      if (editor.mode !== 'delete') setEditorMode('place');
      updatePreview();
    }
  } catch (err) {
    pushLog(`prefab-import:error ${err?.message || err}`);
  } finally {
    if (ui.prefabFileInput) ui.prefabFileInput.value = '';
  }
});

safeListen(ui.habboSwfFileInput, 'change', async () => {
  const file = ui.habboSwfFileInput && ui.habboSwfFileInput.files && ui.habboSwfFileInput.files[0];
  if (!file) return;
  try {
    if (ui.habboImportStatus) ui.habboImportStatus.textContent = 'Habbo 导入：正在读取 ' + file.name + '，会直接从 SWF 的 objectData / visualization / assets / bitmap tags 生成 sprite+proxy，并加入当前项目的物品列表。';
    pushLog('habbo-ui: file import requested name=' + file.name + ' size=' + file.size);
    const result = await importHabboSwfFileToScene(file);
    if (ui.prefabHint) ui.prefabHint.textContent = '已导入 Habbo SWF：' + result.prefab.name + '，自动代理尺寸 ' + result.prefab.w + '×' + result.prefab.d + '×' + result.prefab.h + '。';
    if (ui.habboImportStatus) ui.habboImportStatus.textContent = 'Habbo 导入成功：' + result.prefab.id + ' · type=' + result.meta.type + ' · dimensions=' + result.meta.dimensions.x + '×' + result.meta.dimensions.y + '×' + result.meta.dimensions.z + ' · 已加入物品列表，并切换到放置模式。';
    pushLog('habbo-ui: file import success prefab=' + result.prefab.id + ' currentProto=' + (typeof currentProto === "function" && currentProto() ? currentProto().id : 'n/a'));
    setActivePanelTab('items');
  } catch (err) {
    pushLog('habbo-import:error ' + (err && err.message ? err.message : err));
    if (ui.habboImportStatus) ui.habboImportStatus.textContent = 'Habbo 导入失败：' + (err && err.message ? err.message : err);
  } finally {
    if (ui.habboSwfFileInput) ui.habboSwfFileInput.value = '';
  }
});
safeListen(ui.xrayFaces, 'change', () => xrayFaces = ui.xrayFaces.checked);
safeListen(ui.showDebugBox, 'change', () => showDebug = ui.showDebugBox.checked);
safeListen(ui.showFrontLines, 'change', () => showFrontLines = ui.showFrontLines.checked);
ui.verboseLog.checked = true;
verboseLog = true;
safeListen(ui.verboseLog, 'change', () => {
  verboseLog = ui.verboseLog.checked;
  pushLog(`ui: verboseLog=${verboseLog}`);
});
if (ui.shadowDebugDetailed) ui.shadowDebugDetailed.checked = true;
if (typeof shadowDebugDetailed !== 'undefined') shadowDebugDetailed = true;
safeListen(ui.shadowDebugDetailed, 'change', () => {
  shadowDebugDetailed = !!(ui.shadowDebugDetailed && ui.shadowDebugDetailed.checked);
  pushLog(`ui: shadowDebugDetailed=${shadowDebugDetailed}`);
});
safeListen(ui.clearLog, 'click', () => { if (typeof clearLogs === 'function') clearLogs(); else { logs.length = 0; logSeq = 0; logFlushScheduled = false; lastLogUiFlushAt = 0; if (ui.debugLog) ui.debugLog.value = ''; } });
safeListen(ui.downloadLog, 'click', exportLogs);
safeListen(ui.downloadHabboDebug, 'click', exportHabboDebug);
safeListen(ui.showHabboDebugOverlay, 'change', () => { pushLog('ui: showHabboDebugOverlay=' + (!!ui.showHabboDebugOverlay.checked)); });
safeListen(ui.dumpScene, 'click', () => exportSceneJsonDownload());
safeListen(ui.dumpCandidate, 'click', () => pushLog(`candidate-json: ${JSON.stringify(editor.preview || null)}`));
safeListen(ui.applyPlayerSettings, 'click', applySettings);
safeListen(ui.resetPlayerButton, 'click', () => { resetPlayer(); refreshInspectorPanels(); pushLog('ui: reset player'); });
safeListen(ui.saveScene, 'click', () => saveSceneToLocalStorage());
safeListen(ui.loadScene, 'click', async () => { await loadSceneFromLocalStorage({ source: 'ui-button' }); });
safeListen(ui.saveSceneFile, 'click', async () => {
  var seed = (typeof recallCurrentSceneServerFileName === 'function' && recallCurrentSceneServerFileName()) || 'scene.json';
  var filename = window.prompt('请输入场景文件名（会保存到项目 assets/scenes 中，并作为下次默认打开文件）', suggestSceneFilename(seed));
  if (filename == null) return;
  filename = suggestSceneFilename(filename);
  await saveSceneToServerFile(filename, { setDefault: true });
});
safeListen(ui.openDefaultSceneFile, 'click', async () => { await loadDefaultSceneFromServer({ source: 'ui-open-default' }); });
safeListen(ui.importSceneFile, 'click', () => { if (ui.sceneImportFileInput) ui.sceneImportFileInput.click(); });
safeListen(ui.sceneImportFileInput, 'change', async () => {
  var file = ui.sceneImportFileInput && ui.sceneImportFileInput.files && ui.sceneImportFileInput.files[0];
  if (!file) return;
  await importSceneJsonFile(file, { source: 'ui-import-file', setDefault: true });
  ui.sceneImportFileInput.value = '';
});
safeListen(ui.resetScene, 'click', () => { resetSceneToDefault(); setActivePanelTab('world'); });
safeListen(ui.addLight, 'click', addLight);
safeListen(ui.deleteLight, 'click', deleteActiveLight);
safeListen(ui.toggleLightAxes, 'click', () => { lightState.showAxes = !lightState.showAxes; });
safeListen(ui.showLightShadows, 'change', () => { lightState.showShadows = ui.showLightShadows.checked; pushLog(`ui: showLightShadows=${lightState.showShadows}`); });
safeListen(ui.showLightGlow, 'change', () => { lightState.showGlow = ui.showLightGlow.checked; pushLog(`ui: showLightGlow=${lightState.showGlow}`); });
safeListen(ui.shadowHighContrast, 'change', () => {
  lightState.highContrastShadow = ui.shadowHighContrast.checked;
  pushLog(`ui: highContrastShadow=${lightState.highContrastShadow} color=${lightState.shadowDebugColor} alpha=${lightState.shadowAlpha.toFixed(2)} opacityScale=${lightState.shadowOpacityScale.toFixed(2)}`);
});
safeListen(ui.shadowDebugColor, 'input', () => {
  lightState.shadowDebugColor = ui.shadowDebugColor.value || '#ff2a6d';
  pushLog(`ui: shadowDebugColor=${lightState.shadowDebugColor}`);
});
safeListen(ui.shadowAlpha, 'input', () => {
  lightState.shadowAlpha = Number(ui.shadowAlpha.value);
  setElText(ui.shadowAlphaValue, `${lightState.shadowAlpha.toFixed(2)}`);
  pushLog(`ui: shadowAlpha=${lightState.shadowAlpha.toFixed(2)}`);
});
safeListen(ui.shadowOpacity, 'input', () => {
  lightState.shadowOpacityScale = Number(ui.shadowOpacity.value);
  setElText(ui.shadowOpacityValue, `${lightState.shadowOpacityScale.toFixed(2)}×`);
  pushLog(`ui: shadowOpacityScale=${lightState.shadowOpacityScale.toFixed(2)}`);
});
safeListen(ui.shadowDistanceFadeEnabled, 'change', () => {
  lightState.shadowDistanceFadeEnabled = !!ui.shadowDistanceFadeEnabled.checked;
  pushLog(`ui: shadowDistanceFadeEnabled=${lightState.shadowDistanceFadeEnabled}`);
});
safeListen(ui.shadowDistanceFadeRate, 'input', () => {
  lightState.shadowDistanceFadeRate = Number(ui.shadowDistanceFadeRate.value);
  setElText(ui.shadowDistanceFadeRateValue, `${lightState.shadowDistanceFadeRate.toFixed(2)}`);
  pushLog(`ui: shadowDistanceFadeRate=${lightState.shadowDistanceFadeRate.toFixed(2)}`);
});
safeListen(ui.shadowDistanceFadeMin, 'input', () => {
  lightState.shadowDistanceFadeMin = Number(ui.shadowDistanceFadeMin.value);
  setElText(ui.shadowDistanceFadeMinValue, `${lightState.shadowDistanceFadeMin.toFixed(2)}`);
  pushLog(`ui: shadowDistanceFadeMin=${lightState.shadowDistanceFadeMin.toFixed(2)}`);
});
safeListen(ui.shadowEdgeFadeEnabled, 'change', () => {
  lightState.shadowEdgeFadeEnabled = !!ui.shadowEdgeFadeEnabled.checked;
  pushLog(`ui: shadowEdgeFadeEnabled=${lightState.shadowEdgeFadeEnabled}`);
});
safeListen(ui.shadowEdgeFadePx, 'input', () => {
  lightState.shadowEdgeFadePx = Number(ui.shadowEdgeFadePx.value);
  setElText(ui.shadowEdgeFadePxValue, `${lightState.shadowEdgeFadePx.toFixed(1)} px`);
  pushLog(`ui: shadowEdgeFadePx=${lightState.shadowEdgeFadePx.toFixed(1)}`);
});
safeListen(ui.presetAllOn, 'click', () => applyLightingPreset('allOn'));
safeListen(ui.presetWarmHome, 'click', () => applyLightingPreset('warmHome'));
safeListen(ui.presetCoolShowroom, 'click', () => applyLightingPreset('coolShowroom'));
safeListen(ui.presetMoonNight, 'click', () => applyLightingPreset('moonNight'));
safeListen(ui.ambientStrength, 'input', () => {
  settings.ambient = Number(ui.ambientStrength.value);
  ui.ambientValue.textContent = settings.ambient.toFixed(2);
});

// ---- Habbo library selector fix 20260323B ----
function renderHabboLibraryBrowser() {
  if (!ui || !ui.habboLibraryGrid) return;
  if (ui.habboLibraryRootLabel) ui.habboLibraryRootLabel.textContent = '当前资源库根目录：' + ((habboAssetRootState && habboAssetRootState.root) ? habboAssetRootState.root : '未配置');
  if (ui.habboLibraryTypeRoom) ui.habboLibraryTypeRoom.classList.toggle('active', (habboLibraryState.activeType || 'room') === 'room');
  if (ui.habboLibraryTypeWall) ui.habboLibraryTypeWall.classList.toggle('active', (habboLibraryState.activeType || 'room') === 'wall');
  if (ui.habboLibrarySearch && ui.habboLibrarySearch.value !== String(habboLibraryState.search || '')) ui.habboLibrarySearch.value = String(habboLibraryState.search || '');
  if (ui.habboLibraryDiagnostics) ui.habboLibraryDiagnostics.textContent = habboLibraryState.debugText || '无调试信息';
  var status = 'Habbo 资源库：';
  if (habboLibraryState.summaryLoading || habboLibraryState.loading) status += '正在读取…';
  else if (habboLibraryState.loadError) status += '读取失败：' + habboLibraryState.loadError;
  else status += '总计 ' + Number(habboLibraryState.totalItems || 0) + ' 项；room=' + Number((habboLibraryState.totalsByType || {}).room || 0) + '；wall=' + Number((habboLibraryState.totalsByType || {}).wall || 0) + '；模式=' + (habboLibraryState.libraryMode || '');
  if (ui.habboLibraryStatus) ui.habboLibraryStatus.textContent = status;
  var currentType = habboLibraryState.activeType || 'room';
  var currentCategory = habboLibraryState.activeCategory || 'all';
  var categories = getHabboLibraryCategoriesForType(currentType);
  if (ui.habboLibraryCategoryList) {
    var totalInType = Number((habboLibraryState.totalsByType || {})[currentType] || 0);
    var html = ['<button type="button" class="habboCategoryBtn ' + (currentCategory === 'all' ? 'active' : '') + '" data-category="all">全部分类 · ' + totalInType + '</button>'];
    categories.forEach(function (cat) { html.push('<button type="button" class="habboCategoryBtn ' + ((currentCategory === cat.key) ? 'active' : '') + '" data-category="' + cat.key + '">' + (cat.label || cat.key) + ' · ' + (cat.count || 0) + '</button>'); });
    ui.habboLibraryCategoryList.innerHTML = html.join('');
    Array.from(ui.habboLibraryCategoryList.querySelectorAll('[data-category]')).forEach(function (btn) { btn.addEventListener('click', async function () { habboLibraryState.activeCategory = btn.getAttribute('data-category') || 'all'; habboLibraryState.page = 1; habboLibraryState.queryKey = ''; habboLibraryLog('category-click type=' + currentType + ' category=' + habboLibraryState.activeCategory); renderHabboLibraryBrowser(); if ((habboLibraryState.activeCategory || 'all') !== 'all' || String(habboLibraryState.search || '').trim()) { await fetchHabboLibraryPage(true); renderHabboLibraryBrowser(); } }); });
  }
  var browseMode = (String(habboLibraryState.search || '').trim() || currentCategory !== 'all') ? 'items' : 'categories';
  if (browseMode === 'categories') {
    if (ui.habboLibrarySummary) ui.habboLibrarySummary.innerHTML = prettyHabboLibraryTypeLabel(currentType) + ' · 共 ' + categories.length + ' 个粗分类。先点左侧分类，或直接搜索家具名。';
    if (!categories.length) ui.habboLibraryGrid.innerHTML = '<div class="habboLibraryEmpty">没有读到分类。请先确认根目录正确，或点击“刷新索引”。</div>';
    else {
      ui.habboLibraryGrid.innerHTML = categories.map(function (cat) { var thumb = (cat.sampleIconRelativePath) ? ('<div class="habboLibraryThumb"><img loading="lazy" src="' + makeHabboLibraryIconUrl(cat.sampleIconRelativePath) + '" alt="' + (cat.label || cat.key) + '"></div>') : ('<div class="habboLibraryThumb placeholder">' + (cat.label || cat.key) + '</div>'); return '<button type="button" class="habboLibraryItem habboLibraryCategoryCard" data-category-card="' + cat.key + '">' + thumb + '<div class="habboLibraryItemName">' + (cat.label || cat.key) + '</div><div class="habboLibraryItemMeta">' + prettyHabboLibraryTypeLabel(currentType) + '<br>' + (cat.count || 0) + ' 项</div></button>'; }).join('');
      Array.from(ui.habboLibraryGrid.querySelectorAll('[data-category-card]')).forEach(function (btn) { btn.addEventListener('click', async function () { habboLibraryState.activeCategory = btn.getAttribute('data-category-card') || 'all'; habboLibraryState.page = 1; habboLibraryState.queryKey = ''; habboLibraryLog('category-card-click type=' + currentType + ' category=' + habboLibraryState.activeCategory); renderHabboLibraryBrowser(); await fetchHabboLibraryPage(true); renderHabboLibraryBrowser(); }); });
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
    Array.from(ui.habboLibrarySummary.querySelectorAll('[data-page-action]')).forEach(function (btn) { btn.addEventListener('click', async function () { var action = btn.getAttribute('data-page-action'); habboLibraryState.page = action === 'prev' ? Math.max(1, page - 1) : Math.min(totalPages, page + 1); habboLibraryState.queryKey = ''; habboLibraryLog('page-click action=' + action + ' next=' + habboLibraryState.page); renderHabboLibraryBrowser(); await fetchHabboLibraryPage(true); renderHabboLibraryBrowser(); }); });
  }
  if (!items.length) ui.habboLibraryGrid.innerHTML = '<div class="habboLibraryEmpty">当前页没有结果。可以换一个分类，或换个关键词。</div>';
  else {
    ui.habboLibraryGrid.innerHTML = items.map(function (item) { var active = String(item.assetId) === String(habboLibraryState.selectedAssetId || ''); var thumb = item.iconRelativePath ? ('<div class="habboLibraryThumb"><img loading="lazy" src="' + makeHabboLibraryIconUrl(item.iconRelativePath) + '" alt="' + item.displayName + '"></div>') : '<div class="habboLibraryThumb placeholder">无 icon</div>'; return '<button type="button" class="habboLibraryItem ' + (active ? 'active' : '') + '" data-asset-id="' + item.assetId + '">' + thumb + '<div class="habboLibraryItemName">' + item.displayName + '</div><div class="habboLibraryItemMeta">' + prettyHabboLibraryCategoryLabel(item.category) + '<br>' + prettyHabboLibraryCategoryLabel(item.furniLine || 'other') + '</div></button>'; }).join('');
    Array.from(ui.habboLibraryGrid.querySelectorAll('[data-asset-id]')).forEach(function (btn) { btn.addEventListener('click', function () { habboLibraryState.selectedAssetId = btn.getAttribute('data-asset-id') || ''; ensureHabboLibrarySelection(); renderHabboLibraryBrowser(); }); btn.addEventListener('dblclick', async function () { habboLibraryState.selectedAssetId = btn.getAttribute('data-asset-id') || ''; ensureHabboLibrarySelection(); renderHabboLibraryBrowser(); try { await loadHabboLibraryItemToPlacement(getSelectedHabboLibraryItem()); setHabboLibraryVisibility(false); setActivePanelTab('items'); } catch (err) { if (ui.habboLibraryStatus) ui.habboLibraryStatus.textContent = '加载失败：' + (err && err.message ? err.message : err); } }); });
  }
  var selected = ensureHabboLibrarySelection();
  if (ui.habboLibraryPreviewThumb) { if (selected && selected.iconRelativePath) { ui.habboLibraryPreviewThumb.classList.remove('empty'); ui.habboLibraryPreviewThumb.innerHTML = '<img src="' + makeHabboLibraryIconUrl(selected.iconRelativePath) + '" alt="' + selected.displayName + '">'; } else { ui.habboLibraryPreviewThumb.classList.add('empty'); ui.habboLibraryPreviewThumb.textContent = selected ? '无 icon' : '未选择'; } }
  if (ui.habboLibraryPreviewMeta) ui.habboLibraryPreviewMeta.innerHTML = renderHabboLibraryPreviewMeta(selected);
  if (ui.habboLibraryPlace) ui.habboLibraryPlace.disabled = !selected;
}
async function openHabboLibraryBrowser(forceRefresh) { habboLibraryLog('selector-open-click force=' + (!!forceRefresh) + ' root=' + String((habboAssetRootState && habboAssetRootState.root) || '')); setHabboLibraryVisibility(true); renderHabboLibraryBrowser(); await fetchHabboLibrarySummary(!!forceRefresh); renderHabboLibraryBrowser(); }
