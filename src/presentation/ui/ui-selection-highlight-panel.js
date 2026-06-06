(function () {
  var OWNER = 'src/presentation/ui/ui-selection-highlight-panel.js';

  function getUi() {
    try { return window.ui || ui || null; } catch (_) { return window.ui || null; }
  }

  function getSelectedId() {
    try { return window.inspectorState && window.inspectorState.selectedInstanceId ? String(window.inspectorState.selectedInstanceId) : null; } catch (_) { return null; }
  }

  function getSelectedInstance() {
    try {
      var id = getSelectedId();
      if (!id) return null;
      if (typeof findInstanceById === 'function') return findInstanceById(id);
      if (Array.isArray(window.instances)) return window.instances.find(function (inst) { return inst && String(inst.instanceId) === id; }) || null;
    } catch (_) {}
    return null;
  }

  function getPrefabName(prefabId) {
    try {
      if (typeof getPrefabById === 'function') {
        var p = getPrefabById(prefabId);
        return p && (p.name || p.id) || String(prefabId || '');
      }
    } catch (_) {}
    return String(prefabId || '');
  }

  function syncSettingsFromUi() {
    var u = getUi();
    var enabled = true;
    if (u && u.selectedInstanceEdgeHighlightEnabled) enabled = !!u.selectedInstanceEdgeHighlightEnabled.checked;
    try { if (window.settings) window.settings.selectedInstanceEdgeHighlightEnabled = enabled; } catch (_) {}
    return enabled;
  }

  function refreshStatus() {
    var u = getUi();
    if (!u || !u.selectedInstanceHighlightStatus) return;
    var enabled = syncSettingsFromUi();
    var inst = getSelectedInstance();
    if (!inst) {
      u.selectedInstanceHighlightStatus.textContent = '选择高光：未选择。切到“不编辑 / 拖动画面”后单击物体进行选择。';
      return;
    }
    u.selectedInstanceHighlightStatus.textContent = '选择高光：' + (enabled ? '开启' : '关闭')
      + '；选中 ' + String(inst.instanceId || '')
      + ' / ' + getPrefabName(inst.prefabId)
      + ' @ (' + [inst.x, inst.y, inst.z].map(function (v) { return Number(v || 0); }).join(', ') + ')';
  }

  function clearSelection() {
    try {
      if (typeof clearSelectedInstance === 'function') clearSelectedInstance({ source: 'ui.selectionHighlight.clear' });
      else if (window.inspectorState) window.inspectorState.selectedInstanceId = null;
    } catch (_) {}
    refreshStatus();
    try { if (typeof requestRender === 'function') requestRender(); } catch (_) {}
  }

  function focusSelected() {
    var inst = getSelectedInstance();
    if (!inst) {
      refreshStatus();
      return;
    }
    try {
      if (typeof iso === 'function' && window.camera) {
        var pt = iso(Number(inst.x || 0) + 0.5, Number(inst.y || 0) + 0.5, Number(inst.z || 0));
        var canvas = document.getElementById('game') || document.querySelector('canvas');
        var w = canvas ? canvas.clientWidth || canvas.width || 1200 : 1200;
        var h = canvas ? canvas.clientHeight || canvas.height || 800 : 800;
        window.camera.x += (w / 2 - pt.x);
        window.camera.y += (h / 2 - pt.y);
      }
    } catch (_) {}
    refreshStatus();
    try { if (typeof requestRender === 'function') requestRender(); } catch (_) {}
  }

  function bind() {
    var u = getUi();
    if (!u) return false;
    if (u.selectedInstanceEdgeHighlightEnabled && !u.selectedInstanceEdgeHighlightEnabled.__selectionHighlightBound) {
      u.selectedInstanceEdgeHighlightEnabled.__selectionHighlightBound = true;
      u.selectedInstanceEdgeHighlightEnabled.addEventListener('change', function () {
        syncSettingsFromUi();
        refreshStatus();
        try { if (typeof requestRender === 'function') requestRender(); } catch (_) {}
      });
    }
    if (u.clearSelectedInstanceHighlight && !u.clearSelectedInstanceHighlight.__selectionHighlightBound) {
      u.clearSelectedInstanceHighlight.__selectionHighlightBound = true;
      u.clearSelectedInstanceHighlight.addEventListener('click', clearSelection);
    }
    if (u.focusSelectedInstanceDebug && !u.focusSelectedInstanceDebug.__selectionHighlightBound) {
      u.focusSelectedInstanceDebug.__selectionHighlightBound = true;
      u.focusSelectedInstanceDebug.addEventListener('click', focusSelected);
    }
    syncSettingsFromUi();
    refreshStatus();
    return true;
  }

  window.__SELECTION_HIGHLIGHT_PANEL__ = {
    owner: OWNER,
    bind: bind,
    refreshStatus: refreshStatus,
    clearSelection: clearSelection,
    focusSelected: focusSelected,
    syncSettingsFromUi: syncSettingsFromUi
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
