// ui-fluid-panel.js
// Fluid page entry. Current scope: Fluid / Render only.
// It keeps water render placement out of the generic Object page.

(function () {
  var OWNER = 'src/presentation/ui/ui-fluid-panel.js';

  function getUi() {
    try { return window.ui || ui || null; } catch (_) { return window.ui || null; }
  }

  function getRegistry() {
    try { return window.App && window.App.state && window.App.state.prefabRegistry ? window.App.state.prefabRegistry : null; } catch (_) { return null; }
  }

  function getPrototypes() {
    try { return Array.isArray(window.prototypes) ? window.prototypes : (Array.isArray(prototypes) ? prototypes : []); }
    catch (_) { return Array.isArray(window.prototypes) ? window.prototypes : []; }
  }

  function clampEvenLayerCount(value) {
    var n = Math.round(Number(value) || 4);
    if (n < 2) n = 2;
    if (n > 64) n = 64;
    if (n % 2 !== 0) n += 1;
    if (n > 64) n = 64;
    return n;
  }

  function readLayerCount() {
    var u = getUi();
    var n = clampEvenLayerCount(u && u.fluidRenderLayerCount ? u.fluidRenderLayerCount.value : 4);
    if (u && u.fluidRenderLayerCount && String(u.fluidRenderLayerCount.value) !== String(n)) u.fluidRenderLayerCount.value = String(n);
    return n;
  }

  function getFluidRenderConfigCoreApi() {
    try { return window.__FLUID_RENDER_CONFIG_CORE__ || (window.App && window.App.domain && window.App.domain.fluidRenderConfigCore) || null; }
    catch (_) { return window.__FLUID_RENDER_CONFIG_CORE__ || null; }
  }

  function clampSurfaceSubdivisions(value) {
    var n = Math.round(Number(value) || 2);
    if (n < 2) n = 2;
    if (n > 16) n = 16;
    return n;
  }

  function readSurfaceSubdivisions() {
    var u = getUi();
    var api = getFluidRenderConfigCoreApi();
    var fallback = api && typeof api.getSurfaceSubdivisions === 'function' ? api.getSurfaceSubdivisions() : 2;
    var n = clampSurfaceSubdivisions(u && u.fluidRenderSurfaceSubdivisions ? u.fluidRenderSurfaceSubdivisions.value : fallback);
    if (u && u.fluidRenderSurfaceSubdivisions && String(u.fluidRenderSurfaceSubdivisions.value) !== String(n)) u.fluidRenderSurfaceSubdivisions.value = String(n);
    if (api && typeof api.setSurfaceSubdivisions === 'function') api.setSurfaceSubdivisions(n, { source: 'fluid-ui:readSurfaceSubdivisions' });
    return n;
  }

  function readTopSubdivisionLinesEnabled() {
    var u = getUi();
    var api = getFluidRenderConfigCoreApi();
    var fallback = api && typeof api.getTopSubdivisionLinesEnabled === 'function' ? api.getTopSubdivisionLinesEnabled() : true;
    var enabled = u && u.fluidRenderTopSubdivisionLinesEnabled ? !!u.fluidRenderTopSubdivisionLinesEnabled.checked : fallback !== false;
    if (api && typeof api.setTopSubdivisionLinesEnabled === 'function') api.setTopSubdivisionLinesEnabled(enabled, { source: 'fluid-ui:readTopSubdivisionLinesEnabled' });
    return enabled;
  }

  function applyTopSubdivisionLinesEnabled(source) {
    var enabled = readTopSubdivisionLinesEnabled();
    var api = getFluidRenderConfigCoreApi();
    if (api && typeof api.setTopSubdivisionLinesEnabled === 'function') api.setTopSubdivisionLinesEnabled(enabled, { source: source || 'fluid-ui' });
    try {
      if (typeof invalidateStaticWorldRenderCache === 'function') invalidateStaticWorldRenderCache(source || 'fluid-ui:top-subdivision-lines-change');
    } catch (_) {}
    try {
      if (typeof invalidateRenderCache === 'function') invalidateRenderCache(source || 'fluid-ui:top-subdivision-lines-change');
    } catch (_) {}
    try { if (typeof requestRender === 'function') requestRender(); } catch (_) {}
    var u = getUi();
    if (u && u.fluidRenderHint) {
      var sub = readSurfaceSubdivisions();
      u.fluidRenderHint.textContent = '流体 / 渲染：顶面仍由 ' + sub + '×' + sub + ' 个面片组成；顶面分割线=' + (enabled ? '显示' : '隐藏') + '。隐藏只影响线条，不改变面片结构。';
    }
    log('top-subdivision-lines=' + (enabled ? 'on' : 'off') + ' source=' + String(source || 'unknown'));
    return enabled;
  }

  function applySurfaceSubdivisions(source) {
    var n = readSurfaceSubdivisions();
    var api = getFluidRenderConfigCoreApi();
    if (api && typeof api.setSurfaceSubdivisions === 'function') api.setSurfaceSubdivisions(n, { source: source || 'fluid-ui' });
    try {
      if (typeof invalidateStaticWorldRenderCache === 'function') invalidateStaticWorldRenderCache(source || 'fluid-ui:surface-subdivisions-change');
    } catch (_) {}
    try {
      if (typeof invalidateRenderCache === 'function') invalidateRenderCache(source || 'fluid-ui:surface-subdivisions-change');
    } catch (_) {}
    try { if (typeof requestRender === 'function') requestRender(); } catch (_) {}
    var u = getUi();
    if (u && u.fluidRenderHint) {
      u.fluidRenderHint.textContent = '流体 / 渲染：顶面细分=' + n + '，每个水格顶面最多 ' + (n * n) + ' 个面片。水体分层数量仍只控制可放置的高度档位。';
    }
    log('surface-subdivisions=' + n + ' source=' + String(source || 'unknown'));
    return n;
  }

  function clampEdgeCurveStrength(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    return Math.max(0, Math.min(1, n));
  }

  function readEdgeCurveStrength() {
    var u = getUi();
    var api = getFluidRenderConfigCoreApi();
    var fallback = api && typeof api.getEdgeCurveStrength === 'function' ? api.getEdgeCurveStrength() : 0;
    var n = clampEdgeCurveStrength(u && u.fluidRenderEdgeCurveStrength ? u.fluidRenderEdgeCurveStrength.value : fallback);
    var text = String(Number(n.toFixed(2)));
    if (u && u.fluidRenderEdgeCurveStrength && String(u.fluidRenderEdgeCurveStrength.value) !== text) u.fluidRenderEdgeCurveStrength.value = text;
    if (api && typeof api.setEdgeCurveStrength === 'function') api.setEdgeCurveStrength(n, { source: 'fluid-ui:readEdgeCurveStrength' });
    return n;
  }

  function applyEdgeCurveStrength(source) {
    var n = readEdgeCurveStrength();
    var api = getFluidRenderConfigCoreApi();
    if (api && typeof api.setEdgeCurveStrength === 'function') api.setEdgeCurveStrength(n, { source: source || 'fluid-ui' });
    try {
      if (typeof invalidateStaticWorldRenderCache === 'function') invalidateStaticWorldRenderCache(source || 'fluid-ui:edge-curve-strength-change');
    } catch (_) {}
    try {
      if (typeof invalidateRenderCache === 'function') invalidateRenderCache(source || 'fluid-ui:edge-curve-strength-change');
    } catch (_) {}
    try { if (typeof requestRender === 'function') requestRender(); } catch (_) {}
    var u = getUi();
    if (u && u.fluidRenderHint) {
      var sub = readSurfaceSubdivisions();
      u.fluidRenderHint.textContent = '流体 / 渲染：顶面细分=' + sub + '×' + sub + '，连线插值曲线强度=' + Number(n.toFixed(2)) + '。0 为直线，1 为最大 ease 曲线。';
    }
    log('edge-curve-strength=' + Number(n.toFixed(2)) + ' source=' + String(source || 'unknown'));
    return n;
  }

  function isLiquidPrefab(prefab) {
    if (!prefab || typeof prefab !== 'object') return false;
    var id = String(prefab.id || '').toLowerCase();
    var shapeKind = String(prefab.shapeKind || '').toLowerCase();
    var kind = String(prefab.kind || '').toLowerCase();
    if (id.indexOf('liquid_water') === 0 || shapeKind === 'liquid_water' || kind === 'liquid_water') return true;
    var voxels = Array.isArray(prefab.voxels) ? prefab.voxels : [];
    return voxels.some(function (v) {
      if (!v || typeof v !== 'object') return false;
      var vk = String(v.shapeKind || v.kind || '').toLowerCase();
      var lt = String(v.liquidType || v.fluidType || '').toLowerCase();
      return vk === 'liquid_water' || lt === 'water';
    });
  }

  function makeFallbackWaterPrefabDef(layerIndex, layerCount) {
    var n = clampEvenLayerCount(layerCount);
    var i = Math.max(1, Math.min(n, Math.round(Number(layerIndex) || 1)));
    var depth = i / n;
    var pct = Math.round(depth * 100);
    var id = n === 4
      ? (i === 1 ? 'liquid_water_025' : i === 2 ? 'liquid_water_050' : i === 3 ? 'liquid_water_075' : 'liquid_water_100')
      : 'liquid_water_l' + n + '_' + String(Math.round(depth * 1000)).padStart(4, '0');
    return {
      key: 'fluid-water-' + n + '-' + i,
      id: id,
      name: 'Water Render · ' + pct + '%',
      kind: 'liquid_water',
      base: '#42b8ff',
      renderUpdateMode: 'static',
      supportCells: [],
      fluidRenderLayerCount: n,
      fluidRenderLayerIndex: i,
      fluidRenderDepth: depth,
      voxels: [{
        x: 0, y: 0, z: 0, w: 1, d: 1, h: depth,
        solid: false, collidable: false, renderHidden: true,
        base: '#42b8ff',
        shapeKind: 'liquid_water',
        liquidType: 'water',
        liquidDepth: depth,
        waterAmount: depth,
        fluidRenderPrototype: true
      }]
    };
  }

  function ensureLayerPrefabs(layerCount, source) {
    var n = clampEvenLayerCount(layerCount);
    var registry = getRegistry();
    if (registry && typeof registry.ensureLiquidWaterLayerPrefabs === 'function') {
      return registry.ensureLiquidWaterLayerPrefabs(n, { source: source || 'fluid-ui' }) || [];
    }

    var list = getPrototypes();
    var result = [];
    for (var i = 1; i <= n; i++) {
      var def = makeFallbackWaterPrefabDef(i, n);
      var existingIndex = list.findIndex(function (p) { return p && p.id === def.id; });
      if (existingIndex < 0) {
        list.push(def);
        existingIndex = list.length - 1;
      }
      result.push({ prefab: list[existingIndex], index: existingIndex, id: def.id, depth: i / n, layerIndex: i, layerCount: n });
    }
    return result;
  }

  function log(msg) {
    try {
      if (typeof pushLog === 'function') pushLog('[fluid-ui] ' + msg);
      else if (console && console.log) console.log('[fluid-ui] ' + msg);
    } catch (_) {}
  }

  function currentSelectedIndex() {
    try {
      var registry = getRegistry();
      if (registry && typeof registry.getSelectedPrototypeIndex === 'function') return registry.getSelectedPrototypeIndex();
    } catch (_) {}
    try { return Number(editor && editor.prototypeIndex || 0); } catch (_) { return 0; }
  }

  function getDepthFromPrefab(prefab) {
    try {
      if (prefab && Number.isFinite(Number(prefab.fluidRenderDepth))) return Number(prefab.fluidRenderDepth);
      var v = Array.isArray(prefab.voxels) && prefab.voxels.length ? prefab.voxels[0] : null;
      return Number((v && (v.liquidDepth || v.waterAmount || v.h)) || prefab.h || 0);
    } catch (_) { return 0; }
  }

  function refreshFluidRenderPrefabSelect(reason) {
    var u = getUi();
    if (!u || !u.fluidRenderPrefabSelect) return false;

    var layerCount = readLayerCount();
    var surfaceSubdivisions = readSurfaceSubdivisions();
    var topSubdivisionLinesEnabled = readTopSubdivisionLinesEnabled();
    var edgeCurveStrength = readEdgeCurveStrength();
    var entries = ensureLayerPrefabs(layerCount, 'fluid-ui:refresh:' + String(reason || 'unknown'));
    u.fluidRenderPrefabSelect.innerHTML = '';
    var doc = document;
    entries.forEach(function (entry) {
      var opt = doc.createElement('option');
      opt.value = String(entry.index);
      var p = entry.prefab || {};
      var depth = entry.depth || getDepthFromPrefab(p);
      var pct = Math.round(depth * 100);
      opt.textContent = pct + '% · ' + (p.name || p.id || 'Water Render');
      u.fluidRenderPrefabSelect.appendChild(opt);
    });

    var selectedIndex = currentSelectedIndex();
    var selectedEntry = entries.find(function (entry) { return entry.index === selectedIndex; });
    var targetEntry = selectedEntry || entries[entries.length - 1] || null; // default to 100%
    if (targetEntry) u.fluidRenderPrefabSelect.value = String(targetEntry.index);

    if (u.fluidRenderHint) {
      u.fluidRenderHint.textContent = entries.length
        ? '流体 / 渲染：当前分层=' + layerCount + '，顶面细分=' + surfaceSubdivisions + '×' + surfaceSubdivisions + '（每格最多 ' + (surfaceSubdivisions * surfaceSubdivisions) + ' 个顶面片），顶面分割线=' + (topSubdivisionLinesEnabled ? '显示' : '隐藏') + '，连线插值曲线强度=' + Number(edgeCurveStrength.toFixed(2)) + '，可放置 ' + entries.map(function (e) { return Math.round((e.depth || 0) * 100) + '%'; }).join(' / ') + '。这里只改变渲染放置档位，不启动流体规则。'
        : '流体 / 渲染：没有找到 water render prefab。';
    }

    try {
      var registry = getRegistry();
      if (registry && typeof registry.refreshPrototypeSelection === 'function') registry.refreshPrototypeSelection({ source: 'fluid-ui:refresh-object-select-after-layer-prefabs' });
      else if (typeof refreshPrefabSelectOptions === 'function') refreshPrefabSelectOptions('fluid-ui:refresh-object-select-after-layer-prefabs');
    } catch (_) {}

    log('refresh reason=' + String(reason || 'unknown') + ' layerCount=' + layerCount + ' entries=' + entries.length + ' selected=' + String(u.fluidRenderPrefabSelect.value || ''));
    return true;
  }

  function selectFluidRenderPrefab(index, source) {
    index = Number(index);
    if (!Number.isFinite(index)) return false;
    var p = getPrototypes()[index] || null;
    if (!p || !isLiquidPrefab(p)) return false;

    var selected = false;
    try {
      var controller = window.App && window.App.controllers && window.App.controllers.placement;
      if (controller && typeof controller.applyPlacementIntent === 'function') {
        controller.applyPlacementIntent({ prefabIndex: index, source: source || 'fluid-ui', mode: 'place', forcePreview: true, syncUi: true });
        selected = true;
      }
    } catch (_) {}

    if (!selected) {
      try {
        var actions = window.App && window.App.state && window.App.state.actions;
        if (actions && typeof actions.selectPrefabByIndex === 'function') actions.selectPrefabByIndex(index, { source: source || 'fluid-ui' });
        else if (getRegistry() && typeof getRegistry().setSelectedPrototypeIndex === 'function') getRegistry().setSelectedPrototypeIndex(index, { source: source || 'fluid-ui' });
        else if (typeof editor !== 'undefined' && editor) editor.prototypeIndex = index;
        selected = true;
      } catch (_) {}
    }

    try {
      var actions2 = window.App && window.App.state && window.App.state.actions;
      if (actions2 && typeof actions2.requestModeChange === 'function') actions2.requestModeChange('place', { source: source || 'fluid-ui' });
      else if (typeof requestEditorModeChange === 'function') requestEditorModeChange('place', { source: source || 'fluid-ui' });
      else if (typeof editor !== 'undefined' && editor) editor.mode = 'place';
    } catch (_) {}

    try { if (typeof updateModeButtons === 'function') updateModeButtons(); } catch (_) {}
    try { if (typeof updatePreview === 'function') updatePreview(); } catch (_) {}

    var u = getUi();
    if (u && u.fluidRenderHint) u.fluidRenderHint.textContent = '当前水体渲染原型：' + (p.name || p.id) + '。在网格中左键放置。';
    log('select prefabIndex=' + index + ' prefabId=' + String(p.id || '') + ' selected=' + selected);
    return selected;
  }

  function bindFluidPanel() {
    var u = getUi();
    if (!u) return false;
    refreshFluidRenderPrefabSelect('bind');

    if (u.fluidRenderLayerCount && !u.fluidRenderLayerCount.__fluidPanelBound) {
      u.fluidRenderLayerCount.__fluidPanelBound = true;
      u.fluidRenderLayerCount.addEventListener('change', function () {
        refreshFluidRenderPrefabSelect('layer-count-change');
      });
      u.fluidRenderLayerCount.addEventListener('blur', function () {
        refreshFluidRenderPrefabSelect('layer-count-blur');
      });
    }

    if (u.fluidRenderSurfaceSubdivisions && !u.fluidRenderSurfaceSubdivisions.__fluidPanelBound) {
      u.fluidRenderSurfaceSubdivisions.__fluidPanelBound = true;
      u.fluidRenderSurfaceSubdivisions.addEventListener('change', function () {
        applySurfaceSubdivisions('ui.fluidRenderSurfaceSubdivisions.change');
      });
      u.fluidRenderSurfaceSubdivisions.addEventListener('blur', function () {
        applySurfaceSubdivisions('ui.fluidRenderSurfaceSubdivisions.blur');
      });
    }

    if (u.fluidRenderTopSubdivisionLinesEnabled && !u.fluidRenderTopSubdivisionLinesEnabled.__fluidPanelBound) {
      u.fluidRenderTopSubdivisionLinesEnabled.__fluidPanelBound = true;
      u.fluidRenderTopSubdivisionLinesEnabled.addEventListener('change', function () {
        applyTopSubdivisionLinesEnabled('ui.fluidRenderTopSubdivisionLinesEnabled.change');
      });
    }

    if (u.fluidRenderEdgeCurveStrength && !u.fluidRenderEdgeCurveStrength.__fluidPanelBound) {
      u.fluidRenderEdgeCurveStrength.__fluidPanelBound = true;
      u.fluidRenderEdgeCurveStrength.addEventListener('change', function () {
        applyEdgeCurveStrength('ui.fluidRenderEdgeCurveStrength.change');
      });
      u.fluidRenderEdgeCurveStrength.addEventListener('blur', function () {
        applyEdgeCurveStrength('ui.fluidRenderEdgeCurveStrength.blur');
      });
    }

    if (u.fluidRenderPrefabSelect && !u.fluidRenderPrefabSelect.__fluidPanelBound) {
      u.fluidRenderPrefabSelect.__fluidPanelBound = true;
      u.fluidRenderPrefabSelect.addEventListener('change', function () {
        selectFluidRenderPrefab(u.fluidRenderPrefabSelect.value, 'ui.fluidRenderPrefabSelect.change');
      });
    }

    if (u.fluidRenderPlace && !u.fluidRenderPlace.__fluidPanelBound) {
      u.fluidRenderPlace.__fluidPanelBound = true;
      u.fluidRenderPlace.addEventListener('click', function () {
        refreshFluidRenderPrefabSelect('place-click');
        selectFluidRenderPrefab(u.fluidRenderPrefabSelect && u.fluidRenderPrefabSelect.value, 'ui.fluidRenderPlace.click');
      });
    }

    if (u.fluidRenderView && !u.fluidRenderView.__fluidPanelBound) {
      u.fluidRenderView.__fluidPanelBound = true;
      u.fluidRenderView.addEventListener('click', function () {
        try {
          var actions = window.App && window.App.state && window.App.state.actions;
          if (actions && typeof actions.requestModeChange === 'function') actions.requestModeChange('view', { source: 'ui.fluidRenderView.click' });
          else if (typeof requestEditorModeChange === 'function') requestEditorModeChange('view', { source: 'ui.fluidRenderView.click' });
          else if (typeof editor !== 'undefined' && editor) editor.mode = 'view';
        } catch (_) {}
        try { if (typeof updateModeButtons === 'function') updateModeButtons(); } catch (_) {}
      });
    }

    return true;
  }

  window.__FLUID_UI_PANEL__ = {
    owner: OWNER,
    clampEvenLayerCount: clampEvenLayerCount,
    clampSurfaceSubdivisions: clampSurfaceSubdivisions,
    readTopSubdivisionLinesEnabled: readTopSubdivisionLinesEnabled,
    applyTopSubdivisionLinesEnabled: applyTopSubdivisionLinesEnabled,
    clampEdgeCurveStrength: clampEdgeCurveStrength,
    applyEdgeCurveStrength: applyEdgeCurveStrength,
    applySurfaceSubdivisions: applySurfaceSubdivisions,
    isLiquidPrefab: isLiquidPrefab,
    refreshFluidRenderPrefabSelect: refreshFluidRenderPrefabSelect,
    selectFluidRenderPrefab: selectFluidRenderPrefab,
    bindFluidPanel: bindFluidPanel
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindFluidPanel);
  } else {
    bindFluidPanel();
  }
  setTimeout(function () { refreshFluidRenderPrefabSelect('delayed-refresh'); }, 250);
})();
