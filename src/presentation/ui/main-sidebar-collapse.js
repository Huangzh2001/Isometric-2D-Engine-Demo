(function () {
  'use strict';

  var STORAGE_KEY = 'hzh.main.sidebarCollapsed';
  var layout = document.querySelector('.layout');
  var sidebar = document.getElementById('mainSidebar');
  var toggle = document.getElementById('sidebarCollapseToggle');
  if (!layout || !sidebar || !toggle) return;

  function readStoredState() {
    try { return window.localStorage.getItem(STORAGE_KEY) === '1'; }
    catch (_) { return false; }
  }

  function storeState(collapsed) {
    try { window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); }
    catch (_) {}
  }

  function notifyViewportChanged() {
    try { window.dispatchEvent(new Event('resize')); } catch (_) {}
  }

  function applyCollapsed(collapsed, persist) {
    layout.classList.toggle('sidebarCollapsed', collapsed);
    sidebar.classList.toggle('collapsed', collapsed);
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggle.setAttribute('title', collapsed ? '展开侧边栏' : '收起侧边栏');
    var hiddenLabel = toggle.querySelector('.srOnly');
    if (hiddenLabel) hiddenLabel.textContent = collapsed ? '展开侧边栏' : '收起侧边栏';
    var glyph = toggle.querySelector('.sidebarCollapseGlyph');
    if (glyph) glyph.textContent = collapsed ? '›' : '‹';
    if (persist) storeState(collapsed);

    // The stage width changes with the sidebar. The renderer already owns its
    // resize pipeline; emit the same browser signal instead of resizing it here.
    requestAnimationFrame(notifyViewportChanged);
    window.setTimeout(notifyViewportChanged, 240);
  }

  toggle.addEventListener('click', function () {
    applyCollapsed(!layout.classList.contains('sidebarCollapsed'), true);
  });

  applyCollapsed(readStoredState(), false);

  window.__HZH_MAIN_SIDEBAR_UI__ = {
    version: 'apple-ui-theme-v12',
    isCollapsed: function () { return layout.classList.contains('sidebarCollapsed'); },
    setCollapsed: function (collapsed) { applyCollapsed(!!collapsed, true); }
  };
})();
