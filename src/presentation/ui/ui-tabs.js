// ui-tabs.js
// Step-04: 从 ui.js 中迁出 tabs 切换与绑定，保留全局调用兼容。

var UI_TABS_OWNER = 'src/presentation/ui/ui-tabs.js';

function uiTabsRoute(event, extra = '') {
  try {
    if (typeof logRoute === 'function') logRoute('ui-tabs', event, extra);
    else if (typeof detailLog === 'function') detailLog(`[route][ui-tabs] ${event}${extra ? ' ' + extra : ''}`);
  } catch (_err) {}
}

var __panelTabsBound = false;

function setActivePanelTab(tab) {
  inspectorState.activeTab = tab;
  if (ui.tabWorld) ui.tabWorld.classList.toggle('active', tab === 'world');
  if (ui.tabItems) ui.tabItems.classList.toggle('active', tab === 'items');
  if (ui.tabLights) ui.tabLights.classList.toggle('active', tab === 'lights');
  if (ui.tabCamera) ui.tabCamera.classList.toggle('active', tab === 'camera');
  if (ui.tabTerrain) ui.tabTerrain.classList.toggle('active', tab === 'terrain');
  if (ui.tabPlayer) ui.tabPlayer.classList.toggle('active', tab === 'player');
  if (ui.tabWorldPage) ui.tabWorldPage.classList.toggle('active', tab === 'world');
  if (ui.tabItemsPage) ui.tabItemsPage.classList.toggle('active', tab === 'items');
  if (ui.tabLightsPage) ui.tabLightsPage.classList.toggle('active', tab === 'lights');
  if (ui.tabCameraPage) ui.tabCameraPage.classList.toggle('active', tab === 'camera');
  if (ui.tabTerrainPage) ui.tabTerrainPage.classList.toggle('active', tab === 'terrain');
  if (ui.tabPlayerPage) ui.tabPlayerPage.classList.toggle('active', tab === 'player');
}

function bindPanelTabs() {
  if (__panelTabsBound) return true;
  if (!ui || typeof safeListen !== 'function') {
    uiTabsRoute('bind-skip', 'missing-ui-or-safeListen');
    return false;
  }
  safeListen(ui.tabWorld, 'click', () => setActivePanelTab('world'));
  safeListen(ui.tabItems, 'click', () => setActivePanelTab('items'));
  safeListen(ui.tabLights, 'click', () => setActivePanelTab('lights'));
  safeListen(ui.tabCamera, 'click', () => setActivePanelTab('camera'));
  safeListen(ui.tabTerrain, 'click', () => setActivePanelTab('terrain'));
  safeListen(ui.tabPlayer, 'click', () => setActivePanelTab('player'));
  __panelTabsBound = true;
  uiTabsRoute('bind-ok', 'active=' + String(inspectorState && inspectorState.activeTab || 'world'));
  return true;
}

window.__UI_TABS_API = {
  owner: UI_TABS_OWNER,
  setActivePanelTab,
  bindPanelTabs,
};

if (typeof markRefactorCheckpoint === 'function') {
  markRefactorCheckpoint('UiTabs', 'tabs-api-ready', {
    owner: UI_TABS_OWNER,
    hasWorldTab: !!(ui && ui.tabWorld),
    hasPlayerTab: !!(ui && ui.tabPlayer),
  });
}

bindPanelTabs();
setActivePanelTab((inspectorState && inspectorState.activeTab) || 'world');
