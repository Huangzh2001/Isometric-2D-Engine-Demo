// P11f-1a: Main camera/render panel presentation owner.
// Owns DOM refresh and transient control state for the main camera + render settings panels.
(function installUiCameraRenderPanel(global) {
  'use strict';

  var OWNER = 'src/presentation/ui/ui-camera-render-panel.js';
  var renderControlInteractionLockUntil = 0;

  function depsOrEmpty(deps) { return deps || {}; }
  function getUi(deps) {
    return deps && typeof deps.getUi === 'function' ? (deps.getUi() || {}) : {};
  }
  function getInspectorState(deps) {
    return deps && typeof deps.getInspectorState === 'function' ? (deps.getInspectorState() || {}) : {};
  }
  function getGlobal(deps) {
    return deps && typeof deps.getGlobal === 'function' ? (deps.getGlobal() || global) : global;
  }
  function getMainController(deps) {
    try { return deps && typeof deps.getUiMainController === 'function' ? deps.getUiMainController() : null; } catch (_) { return null; }
  }
  function dispatchMain(deps, command, args) {
    try {
      if (deps && typeof deps.uiDispatchControllerCommand === 'function') return deps.uiDispatchControllerCommand('main', command, args || []);
    } catch (_) {}
    return null;
  }

  function uiGetMainCameraSettings(source, deps) {
    deps = depsOrEmpty(deps);
    var requestSource = source || 'camera-panel:read';
    var dispatched = dispatchMain(deps, 'getMainEditorCameraSettings', [requestSource]);
    if (dispatched) return dispatched;
    var controller = getMainController(deps);
    if (controller && typeof controller.getMainEditorCameraSettings === 'function') return controller.getMainEditorCameraSettings(requestSource);
    return null;
  }

  function uiRefreshMainCameraPanel(source, deps) {
    deps = depsOrEmpty(deps);
    var ui = getUi(deps);
    var settings = uiGetMainCameraSettings(source || 'camera-panel:refresh', deps) || null;
    if (!settings) return null;
    if (ui.mainCameraAnimationEnabled) ui.mainCameraAnimationEnabled.checked = settings.rotationAnimationEnabled !== false;
    if (ui.mainCameraAnimationMs) ui.mainCameraAnimationMs.value = String(Math.max(0, Number(settings.rotationAnimationMs) || 0));
    if (ui.mainCameraInterpolationEnabled) ui.mainCameraInterpolationEnabled.checked = settings.rotationInterpolationEnabled !== false;
    if (ui.mainCameraInterpolationMode) ui.mainCameraInterpolationMode.value = String(settings.rotationInterpolationMode || 'easeInOut');
    if (ui.mainCameraZoom) ui.mainCameraZoom.value = String(Number(settings.zoom || 1).toFixed(2));
    if (ui.mainCameraMinZoom) ui.mainCameraMinZoom.value = String(Number(settings.minZoom || 0.5).toFixed(2));
    if (ui.mainCameraMaxZoom) ui.mainCameraMaxZoom.value = String(Number(settings.maxZoom || 2).toFixed(2));
    if (ui.mainCameraCullingEnabled) ui.mainCameraCullingEnabled.checked = settings.cameraCullingEnabled !== false;
    if (ui.mainCameraCullingMargin) ui.mainCameraCullingMargin.value = String(Number(settings.cullingMargin || 0));
    if (ui.mainCameraShowBounds) ui.mainCameraShowBounds.checked = !!settings.showCameraBounds;
    if (ui.mainCameraShowCullingBounds) ui.mainCameraShowCullingBounds.checked = !!settings.showCullingBounds;
    if (ui.mainCameraSurfaceOnlyRenderingEnabled) ui.mainCameraSurfaceOnlyRenderingEnabled.checked = settings.surfaceOnlyRenderingEnabled !== false;
    if (ui.mainCameraDebugVisibleSurfaces) ui.mainCameraDebugVisibleSurfaces.checked = !!settings.debugVisibleSurfaces;
    if (ui.mainCameraSettingsSummary) {
      ui.mainCameraSettingsSummary.textContent = '动画：' + ((settings.rotationAnimationEnabled !== false) ? '开启' : '关闭') +
        '，' + String(Math.max(0, Number(settings.rotationAnimationMs) || 0)) + 'ms，插值：' + ((settings.rotationInterpolationEnabled !== false) ? '开启' : '关闭') +
        ' / ' + String(settings.rotationInterpolationMode || 'easeInOut') +
        '，缩放：' + Number(settings.zoom || 1).toFixed(2) + 'x [' + Number(settings.minZoom || 0.5).toFixed(2) + ',' + Number(settings.maxZoom || 2).toFixed(2) + ']'+
        '，裁剪：' + ((settings.cameraCullingEnabled !== false) ? '开启' : '关闭') + ' margin=' + String(Number(settings.cullingMargin || 0)) +
        '，表面渲染：' + ((settings.surfaceOnlyRenderingEnabled !== false) ? '开启' : '关闭') +
        (settings.debugVisibleSurfaces ? '，可见面调试：开' : '') +
        (settings.isViewRotating ? ' · 视角过渡中' : '');
    }
    return settings;
  }

  function uiLockRenderControlsInteraction(ms) {
    try { renderControlInteractionLockUntil = Date.now() + Math.max(0, Number(ms) || 0); } catch (_) { renderControlInteractionLockUntil = 0; }
  }

  function uiIsRenderControlsInteractionLocked() {
    try { return Date.now() < renderControlInteractionLockUntil; } catch (_) { return false; }
  }

  function uiGetRenderControlOverrides(deps) {
    try {
      var root = getGlobal(depsOrEmpty(deps));
      var overrides = root && root.__RENDER_CONTROL_OVERRIDES__;
      return overrides && typeof overrides === 'object' ? overrides : null;
    } catch (_) {
      return null;
    }
  }

  function uiSetRenderControlOverrides(patch, deps) {
    try {
      var root = getGlobal(depsOrEmpty(deps));
      if (!root) return null;
      if (!root.__RENDER_CONTROL_OVERRIDES__ || typeof root.__RENDER_CONTROL_OVERRIDES__ !== 'object') root.__RENDER_CONTROL_OVERRIDES__ = {};
      var target = root.__RENDER_CONTROL_OVERRIDES__;
      if (patch && typeof patch === 'object') {
        if (Object.prototype.hasOwnProperty.call(patch, 'staticWorldFaceMergeEnabled')) target.staticWorldFaceMergeEnabled = patch.staticWorldFaceMergeEnabled !== false;
        if (Object.prototype.hasOwnProperty.call(patch, 'disableFaceMergeAtOrAboveZoomEnabled')) target.disableFaceMergeAtOrAboveZoomEnabled = !!patch.disableFaceMergeAtOrAboveZoomEnabled;
        if (Object.prototype.hasOwnProperty.call(patch, 'disableFaceMergeAtOrAboveZoomThreshold')) target.disableFaceMergeAtOrAboveZoomThreshold = Math.max(0.05, Number(patch.disableFaceMergeAtOrAboveZoomThreshold) || 1.6);
        target.updatedAt = Date.now();
      }
      return target;
    } catch (_) {
      return null;
    }
  }

  function uiBuildEffectiveRenderSettings(settings, deps) {
    var base = settings && typeof settings === 'object' ? settings : {};
    var effective = Object.assign({}, base);
    var overrides = uiGetRenderControlOverrides(deps);
    if (overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, 'staticWorldFaceMergeEnabled')) effective.staticWorldFaceMergeEnabled = overrides.staticWorldFaceMergeEnabled !== false;
      if (Object.prototype.hasOwnProperty.call(overrides, 'disableFaceMergeAtOrAboveZoomEnabled')) effective.disableFaceMergeAtOrAboveZoomEnabled = !!overrides.disableFaceMergeAtOrAboveZoomEnabled;
      if (Object.prototype.hasOwnProperty.call(overrides, 'disableFaceMergeAtOrAboveZoomThreshold')) effective.disableFaceMergeAtOrAboveZoomThreshold = Math.max(0.05, Number(overrides.disableFaceMergeAtOrAboveZoomThreshold) || 1.6);
    }
    return effective;
  }

  function uiRefreshRenderPanel(source, deps) {
    deps = depsOrEmpty(deps);
    var ui = getUi(deps);
    var settings = uiGetMainCameraSettings(source || 'render-panel:refresh', deps) || null;
    if (!settings) return null;
    var effectiveSettings = uiBuildEffectiveRenderSettings(settings, deps);
    var inspectorState = getInspectorState(deps);
    var skipControlWrite = uiIsRenderControlsInteractionLocked() || !!(inspectorState && inspectorState.activeTab === 'render');
    if (!skipControlWrite && ui.renderFaceMergeEnabled) ui.renderFaceMergeEnabled.checked = effectiveSettings.staticWorldFaceMergeEnabled !== false;
    if (!skipControlWrite && ui.renderDisableFaceMergeAtZoomEnabled) ui.renderDisableFaceMergeAtZoomEnabled.checked = !!effectiveSettings.disableFaceMergeAtOrAboveZoomEnabled;
    if (!skipControlWrite && ui.renderDisableFaceMergeAtZoomThreshold) ui.renderDisableFaceMergeAtZoomThreshold.value = String(Number(effectiveSettings.disableFaceMergeAtOrAboveZoomThreshold || 1.6).toFixed(2));
    if (ui.renderSettingsSummary) {
      var mergeSummary = effectiveSettings.staticWorldFaceMergeEnabled === false ? '关闭' : '开启';
      var zoomRuleSummary = effectiveSettings.disableFaceMergeAtOrAboveZoomEnabled === true
        ? ('开启（zoom ≥ ' + Number(effectiveSettings.disableFaceMergeAtOrAboveZoomThreshold || 1.6).toFixed(2) + ' 时禁用）')
        : '关闭';
      ui.renderSettingsSummary.textContent = 'Face Merge：' + mergeSummary + '；Zoom 条件禁用：' + zoomRuleSummary + '；当前 Zoom：' + Number(effectiveSettings.zoom || 1).toFixed(2) + 'x';
    }
    return effectiveSettings;
  }

  global.__UI_CAMERA_RENDER_PANEL__ = {
    OWNER: OWNER,
    uiGetMainCameraSettings: uiGetMainCameraSettings,
    uiRefreshMainCameraPanel: uiRefreshMainCameraPanel,
    uiLockRenderControlsInteraction: uiLockRenderControlsInteraction,
    uiIsRenderControlsInteractionLocked: uiIsRenderControlsInteractionLocked,
    uiGetRenderControlOverrides: uiGetRenderControlOverrides,
    uiSetRenderControlOverrides: uiSetRenderControlOverrides,
    uiBuildEffectiveRenderSettings: uiBuildEffectiveRenderSettings,
    uiRefreshRenderPanel: uiRefreshRenderPanel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
