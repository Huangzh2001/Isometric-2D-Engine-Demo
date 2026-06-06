(function () {
  var OWNER = 'src/presentation/ui/ui-terrain-height-surface-panel.js';

  function getUi() {
    try { return window.ui || ui || null; } catch (_) { return window.ui || null; }
  }

  function getConfig() {
    try { return window.__TERRAIN_HEIGHT_SURFACE_CONFIG_CORE__ || (window.App && window.App.domain && window.App.domain.terrainHeightSurfaceConfigCore) || null; }
    catch (_) { return window.__TERRAIN_HEIGHT_SURFACE_CONFIG_CORE__ || null; }
  }

  function getRegistry() {
    try { return window.App && window.App.state && window.App.state.prefabRegistry ? window.App.state.prefabRegistry : null; } catch (_) { return null; }
  }

  function log(msg) {
    try {
      if (typeof pushLog === 'function') pushLog('[terrain-height-surface] ' + msg);
      else if (console && console.log) console.log('[terrain-height-surface] ' + msg);
    } catch (_) {}
  }

  function clamp(value, fallback, min, max) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = Number(fallback || 0);
    return Math.max(min, Math.min(max, n));
  }

  function readEnabled() {
    var u = getUi();
    var api = getConfig();
    var enabled = u && u.terrainHeightSurfaceEnabled ? !!u.terrainHeightSurfaceEnabled.checked : true;
    if (api && typeof api.setEnabled === 'function') api.setEnabled(enabled, { source: 'terrain-height-ui:readEnabled' });
    return enabled;
  }

  function readConnectThreshold() {
    var u = getUi();
    var api = getConfig();
    var fallback = api && typeof api.getConnectThreshold === 'function' ? api.getConnectThreshold() : 0.35;
    var n = clamp(u && u.terrainHeightSurfaceConnectThreshold ? u.terrainHeightSurfaceConnectThreshold.value : fallback, 0.35, 0, 2);
    if (u && u.terrainHeightSurfaceConnectThreshold) u.terrainHeightSurfaceConnectThreshold.value = String(Number(n.toFixed(2)));
    if (api && typeof api.setConnectThreshold === 'function') api.setConnectThreshold(n, { source: 'terrain-height-ui:readConnectThreshold' });
    return n;
  }

  function readSubdivisions() {
    var u = getUi();
    var api = getConfig();
    var fallback = api && typeof api.getSurfaceSubdivisions === 'function' ? api.getSurfaceSubdivisions() : 4;
    var n = Math.round(clamp(u && u.terrainHeightSurfaceSubdivisions ? u.terrainHeightSurfaceSubdivisions.value : fallback, 4, 1, 16));
    if (u && u.terrainHeightSurfaceSubdivisions) u.terrainHeightSurfaceSubdivisions.value = String(n);
    if (api && typeof api.setSurfaceSubdivisions === 'function') api.setSurfaceSubdivisions(n, { source: 'terrain-height-ui:readSubdivisions' });
    return n;
  }

  function readTopLinesEnabled() {
    var u = getUi();
    var api = getConfig();
    var enabled = u && u.terrainHeightSurfaceTopLinesEnabled ? !!u.terrainHeightSurfaceTopLinesEnabled.checked : false;
    if (api && typeof api.setTopLinesEnabled === 'function') api.setTopLinesEnabled(enabled, { source: 'terrain-height-ui:readTopLinesEnabled' });
    return enabled;
  }

  function invalidate(reason) {
    try { if (typeof invalidateStaticWorldRenderCache === 'function') invalidateStaticWorldRenderCache(reason || 'terrain-height-surface'); } catch (_) {}
    try { if (typeof invalidateRenderCache === 'function') invalidateRenderCache(reason || 'terrain-height-surface'); } catch (_) {}
    try { if (typeof requestRender === 'function') requestRender(); } catch (_) {}
  }

  function applyConfig(source) {
    var enabled = readEnabled();
    var threshold = readConnectThreshold();
    var sub = readSubdivisions();
    var lines = readTopLinesEnabled();
    invalidate(source || 'terrain-height-ui:applyConfig');
    updateStatus('配置已更新');
    log('config enabled=' + enabled + ' threshold=' + threshold + ' subdivisions=' + sub + ' topLines=' + lines + ' source=' + String(source || 'unknown'));
  }

  function ensurePrefabs() {
    var reg = getRegistry();
    if (reg && typeof reg.ensureTerrainHeightSurfaceLayerPrefabs === 'function') {
      return reg.ensureTerrainHeightSurfaceLayerPrefabs(4, { source: 'terrain-height-ui:ensurePrefabs' }) || [];
    }
    return [
      { id: 'terrain_height_025', height: 0.25 },
      { id: 'terrain_height_050', height: 0.50 },
      { id: 'terrain_height_075', height: 0.75 },
      { id: 'terrain_height_100', height: 1.00 }
    ];
  }

  function refreshSelect() {
    var u = getUi();
    if (!u || !u.terrainHeightSurfacePrefabSelect) return [];
    var entries = ensurePrefabs();
    var prev = u.terrainHeightSurfacePrefabSelect.value || 'terrain_height_100';
    u.terrainHeightSurfacePrefabSelect.innerHTML = '';
    entries.forEach(function (entry) {
      var opt = document.createElement('option');
      opt.value = entry.id;
      opt.textContent = Math.round(Number(entry.height || 0) * 100) + '% · ' + entry.id;
      u.terrainHeightSurfacePrefabSelect.appendChild(opt);
    });
    var found = entries.some(function (entry) { return entry.id === prev; });
    u.terrainHeightSurfacePrefabSelect.value = found ? prev : (entries.length ? entries[entries.length - 1].id : 'terrain_height_100');
    return entries;
  }

  function selectedPrefabId() {
    var u = getUi();
    if (!u || !u.terrainHeightSurfacePrefabSelect) refreshSelect();
    return u && u.terrainHeightSurfacePrefabSelect ? String(u.terrainHeightSurfacePrefabSelect.value || 'terrain_height_100') : 'terrain_height_100';
  }

  function selectPrefab(prefabId, source) {
    var reg = getRegistry();
    if (reg && typeof reg.setSelectedPrefabId === 'function') {
      try { reg.setSelectedPrefabId(prefabId, { source: source || 'terrain-height-ui:selectPrefab' }); } catch (_) {}
    }
    try {
      if (window.App && window.App.state && window.App.state.actions && typeof window.App.state.actions.selectPrefabById === 'function') {
        window.App.state.actions.selectPrefabById(prefabId, { source: source || 'terrain-height-ui:selectPrefab' });
      } else if (Array.isArray(window.prototypes) && window.editor) {
        var idx = window.prototypes.findIndex(function (p) { return p && p.id === prefabId; });
        if (idx >= 0) window.editor.prototypeIndex = idx;
      }
    } catch (_) {}
    try { if (typeof refreshPrefabSelectOptions === 'function') refreshPrefabSelectOptions(source || 'terrain-height-ui:refreshPrefabSelect'); } catch (_) {}
  }

  function enterPlaceMode() {
    var prefabId = selectedPrefabId();
    ensurePrefabs();
    selectPrefab(prefabId, 'terrain-height-ui:enterPlaceMode');
    try {
      if (window.App && window.App.state && window.App.state.actions && typeof window.App.state.actions.requestModeChange === 'function') {
        window.App.state.actions.requestModeChange('place', { source: 'terrain-height-ui:enterPlaceMode' });
      } else if (typeof requestEditorModeChange === 'function') requestEditorModeChange('place', { source: 'terrain-height-ui:enterPlaceMode' });
      else if (window.editor) window.editor.mode = 'place';
    } catch (_) {}
    try { if (typeof updatePreview === 'function') updatePreview(); } catch (_) {}
    updateStatus('已进入放置模式：' + prefabId);
    log('place prefab=' + prefabId);
  }

  function enterViewMode() {
    try {
      if (window.App && window.App.state && window.App.state.actions && typeof window.App.state.actions.requestModeChange === 'function') {
        window.App.state.actions.requestModeChange('view', { source: 'terrain-height-ui:enterViewMode' });
      } else if (typeof requestEditorModeChange === 'function') requestEditorModeChange('view', { source: 'terrain-height-ui:enterViewMode' });
      else if (window.editor) window.editor.mode = 'view';
    } catch (_) {}
    updateStatus('已切回拖动画面模式');
  }

  function updateStatus(prefix) {
    var u = getUi();
    if (!u || !u.terrainHeightSurfaceStatus) return;
    var enabled = readEnabled();
    var threshold = readConnectThreshold();
    var sub = readSubdivisions();
    var lines = readTopLinesEnabled();
    var prefabId = selectedPrefabId();
    u.terrainHeightSurfaceStatus.textContent = String(prefix || '高度曲面')
      + '；启用=' + (enabled ? '是' : '否')
      + '；连接阈值=' + threshold.toFixed(2)
      + '；顶面=' + sub + '×' + sub
      + '；分割线=' + (lines ? '显示' : '隐藏')
      + '；当前=' + prefabId
      + '。注意：只做渲染连续，不做连续人物行走。';
  }

  function bind() {
    var u = getUi();
    if (!u) return false;
    refreshSelect();
    [
      u.terrainHeightSurfaceEnabled,
      u.terrainHeightSurfaceConnectThreshold,
      u.terrainHeightSurfaceSubdivisions,
      u.terrainHeightSurfaceTopLinesEnabled
    ].forEach(function (el) {
      if (!el || el.__terrainHeightSurfaceBound) return;
      el.__terrainHeightSurfaceBound = true;
      el.addEventListener('change', function () { applyConfig('ui.terrainHeightSurface.change'); });
      el.addEventListener('blur', function () { applyConfig('ui.terrainHeightSurface.blur'); });
    });
    if (u.terrainHeightSurfacePrefabSelect && !u.terrainHeightSurfacePrefabSelect.__terrainHeightSurfaceBound) {
      u.terrainHeightSurfacePrefabSelect.__terrainHeightSurfaceBound = true;
      u.terrainHeightSurfacePrefabSelect.addEventListener('change', function () {
        selectPrefab(selectedPrefabId(), 'ui.terrainHeightSurfacePrefabSelect.change');
        updateStatus('已选择高度原型');
      });
    }
    if (u.terrainHeightSurfacePlace && !u.terrainHeightSurfacePlace.__terrainHeightSurfaceBound) {
      u.terrainHeightSurfacePlace.__terrainHeightSurfaceBound = true;
      u.terrainHeightSurfacePlace.addEventListener('click', enterPlaceMode);
    }
    if (u.terrainHeightSurfaceView && !u.terrainHeightSurfaceView.__terrainHeightSurfaceBound) {
      u.terrainHeightSurfaceView.__terrainHeightSurfaceBound = true;
      u.terrainHeightSurfaceView.addEventListener('click', enterViewMode);
    }
    applyConfig('terrain-height-ui:bind');
    return true;
  }

  window.__TERRAIN_HEIGHT_SURFACE_PANEL__ = {
    owner: OWNER,
    bind: bind,
    refreshSelect: refreshSelect,
    applyConfig: applyConfig,
    enterPlaceMode: enterPlaceMode,
    enterViewMode: enterViewMode,
    updateStatus: updateStatus
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
