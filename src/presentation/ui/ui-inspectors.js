// ui-inspectors.js
// Step-04: 从 ui.js 中迁出 inspectors 刷新逻辑，保留全局调用兼容。

var UI_INSPECTORS_OWNER = 'src/presentation/ui/ui-inspectors.js';

function uiInspectorsRoute(event, extra = '') {
  try {
    if (typeof logRoute === 'function') logRoute('ui-inspectors', event, extra);
    else if (typeof detailLog === 'function') detailLog(`[route][ui-inspectors] ${event}${extra ? ' ' + extra : ''}`);
  } catch (_err) {}
}

function getUiItemFacingCoreApi() {
  try { return window.App && window.App.domain ? window.App.domain.itemFacingCore || null : (window.__ITEM_FACING_CORE__ || null); } catch (_) { return window.__ITEM_FACING_CORE__ || null; }
}

function refreshItemFacingStatusOnly() {
  var facingApi = getUiItemFacingCoreApi();
  var previewLabel = ui.previewFacingLabel;
  var selectedLabel = ui.selectedFacingLabel;
  var viewLabel = ui.mainViewRotationLabel;
  var previewFacing = editor && typeof editor.previewFacing === 'number' ? editor.previewFacing : 0;
  var viewRotation = 0;
  try {
    var controller = window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (controller && typeof controller.getMainEditorViewRotation === 'function') viewRotation = controller.getMainEditorViewRotation('presentation.ui.ui-inspectors');
    else if (window.App && window.App.state && window.App.state.runtimeState && window.App.state.runtimeState.editor && typeof window.App.state.runtimeState.editor.rotation === 'number') viewRotation = window.App.state.runtimeState.editor.rotation;
  } catch (_) {}
  if (previewLabel) previewLabel.textContent = facingApi && typeof facingApi.getFacingLabel === 'function' ? facingApi.getFacingLabel(previewFacing) : String(previewFacing);
  if (viewLabel) {
    var dirs = ['NE', 'SE', 'SW', 'NW'];
    var dir = dirs[((viewRotation % 4) + 4) % 4] || 'NE';
    viewLabel.textContent = dir + ' / rot=' + String((((viewRotation % 4) + 4) % 4));
  }
  if (typeof uiRefreshMainCameraPanel === 'function') uiRefreshMainCameraPanel('presentation.ui.ui-inspectors');
  if (selectedLabel) {
    var inst = getSelectedInstance();
    if (!inst) selectedLabel.textContent = '未选中';
    else selectedLabel.textContent = (facingApi && typeof facingApi.getFacingLabel === 'function' ? facingApi.getFacingLabel(inst.rotation || 0) : String(inst.rotation || 0)) + ' / rot=' + String(inst.rotation || 0);
  }
}

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

function refreshItemInspector() {
  var inst = getSelectedInstance();
  var prefab = getSelectedPrefab();
  if (!inst || !prefab) {
    if (ui.itemInspectorEmpty) ui.itemInspectorEmpty.classList.remove('hidden');
    if (ui.itemInspectorPanel) ui.itemInspectorPanel.classList.add('hidden');
    if (ui.itemInspectorSummary) { ui.itemInspectorSummary.classList.add('hidden'); ui.itemInspectorSummary.textContent = ''; }
    if (ui.itemInspectorInstance) ui.itemInspectorInstance.textContent = '';
    if (ui.itemInspectorPrefab) ui.itemInspectorPrefab.textContent = '';
    if (ui.itemInspectorFacingPrototype) ui.itemInspectorFacingPrototype.textContent = '';
    refreshItemFacingStatusOnly();
    refreshAssetScanStatus();
    return;
  }
  if (ui.itemInspectorEmpty) ui.itemInspectorEmpty.classList.add('hidden');
  if (ui.itemInspectorPanel) ui.itemInspectorPanel.classList.remove('hidden');
  var facingApi = getUiItemFacingCoreApi();
  var facingPrototype = facingApi && typeof facingApi.buildFacingPrototype === 'function'
    ? facingApi.buildFacingPrototype(prefab, inst.rotation || 0, inst)
    : null;
  if (ui.itemInspectorSummary) {
    ui.itemInspectorSummary.classList.remove('hidden');
    ui.itemInspectorSummary.textContent = `已选中：${prefab.name} / ${inst.instanceId} · 位置=(${inst.x}, ${inst.y}, ${inst.z}) · 朝向=${facingPrototype ? facingPrototype.facingLabel : (inst.rotation || 0)} · spriteStrategy=${facingPrototype ? facingPrototype.spriteStrategy : 'n/a'}`;
  }
  if (ui.itemInspectorInstance) ui.itemInspectorInstance.textContent = prettyJson({
    instanceId: inst.instanceId,
    prefabId: inst.prefabId,
    kind: prefab.kind || prefab.id,
    position: { x: inst.x, y: inst.y, z: inst.z },
    rotation: inst.rotation || 0,
    facingLabel: facingPrototype ? facingPrototype.facingLabel : null,
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
    habboMeta: prefab.habboMeta || null,
    itemFacingPrototypeEnabled: true
  });
  if (ui.itemInspectorFacingPrototype) ui.itemInspectorFacingPrototype.textContent = prettyJson({
    facing: facingPrototype ? facingPrototype.facing : (inst.rotation || 0),
    facingLabel: facingPrototype ? facingPrototype.facingLabel : null,
    semanticDirections: facingPrototype ? facingPrototype.semanticDirections : null,
    semanticColors: facingPrototype ? facingPrototype.semanticColors : null,
    visibleSemanticFaces: facingPrototype ? facingPrototype.visibleSemanticFaces : null,
    footprint: facingPrototype ? facingPrototype.footprint : null,
    baseAnchor: facingPrototype ? facingPrototype.baseAnchor : null,
    rotatedAnchor: facingPrototype ? facingPrototype.rotatedAnchor : null,
    spriteStrategy: facingPrototype ? facingPrototype.spriteStrategy : null,
    spriteDirectionKey: facingPrototype ? facingPrototype.spriteDirectionKey : null,
    spriteMirrorX: facingPrototype ? facingPrototype.spriteMirrorX : null,
    sortBase: facingPrototype ? facingPrototype.sortBase : null
  });
  refreshItemFacingStatusOnly();
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
  refreshItemFacingStatusOnly();
  refreshWorldInspector();
  refreshItemInspector();
  refreshPlayerInspector();
  refreshAssetScanStatus();
}


window.__UI_INSPECTORS_API = {
  owner: UI_INSPECTORS_OWNER,
  refreshAssetScanStatus,
  refreshItemInspector,
  refreshPlayerInspector,
  refreshWorldInspector,
  refreshItemFacingStatusOnly,
  refreshInspectorPanels,
};

if (typeof markRefactorCheckpoint === 'function') {
  markRefactorCheckpoint('UiInspectors', 'inspectors-api-ready', {
    owner: UI_INSPECTORS_OWNER,
    hasWorldSummary: !!(ui && ui.worldInspectorSummary),
    hasItemPanel: !!(ui && ui.itemInspectorPanel),
    hasPlayerSummary: !!(ui && ui.playerInspectorSummary),
  });
}
