// ui.js
// Step-05: tabs / inspectors / Habbo library 已迁移到独立模块。
// 当前文件保留 world settings、Habbo 导入按钮与其余 UI 绑定。
// v1 split file generated from original monolithic app.js
// 注意：此文件为保持行为稳定的第一刀拆分，允许存在少量跨层函数。

function emitP1bUi(kind, message, extra) {
  var line = '[P1b][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (err) { line += ' "[unserializable]"'; }
  }
  try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (err) { try { console.log(line); } catch (_) {} }
  return line;
}

function readEditorHandoff() {
  var service = getUiEditorHandoffService();
  if (!service || typeof service.readHandoff !== 'function') return null;
  return service.readHandoff({ source: 'presentation:ui-read-editor-handoff' });
}

function clearEditorHandoff() {
  var service = getUiEditorHandoffService();
  if (!service || typeof service.clearHandoff !== 'function') return false;
  return service.clearHandoff({ source: 'presentation:ui-clear-editor-handoff' });
}


function getUiAssetWorkflow() {
  try { return window.App && window.App.services ? window.App.services.assetWorkflow || null : null; } catch (_) { return null; }
}

function getUiSceneWorkflow() {
  try { return window.App && window.App.services ? window.App.services.sceneWorkflow || null : null; } catch (_) { return null; }
}

function getUiEditorHandoffService() {
  try { return window.App && window.App.services ? window.App.services.editorHandoff || null : null; } catch (_) { return null; }
}

function getUiMainController() {
  try { return window.App && window.App.controllers ? window.App.controllers.main || null : null; } catch (_) { return null; }
}

function getUiSceneController() {
  try { return window.App && window.App.controllers ? window.App.controllers.scene || null : null; } catch (_) { return null; }
}

function getUiPlacementController() {
  try { return window.App && window.App.controllers ? window.App.controllers.placement || null : null; } catch (_) { return null; }
}

function getUiAssetLibraryController() {
  try { return window.App && window.App.controllers ? window.App.controllers.assetLibrary || null : null; } catch (_) { return null; }
}

function uiDispatchController(controller, action, payload) {
  try {
    if (controller && typeof controller.dispatch === 'function') return controller.dispatch(action, payload);
  } catch (_) {}
  return null;
}

function uiDispatchControllerCommand(controllerName, action, payload) {
  try {
    if (window.App && window.App.controllers && typeof window.App.controllers.dispatch === 'function') {
      var dispatched = window.App.controllers.dispatch(controllerName, action, payload);
      if (dispatched && dispatched.ok !== false) return dispatched;
    }
  } catch (_) {}
  var controller = null;
  if (controllerName === 'main') controller = getUiMainController();
  else if (controllerName === 'scene') controller = getUiSceneController();
  else if (controllerName === 'placement') controller = getUiPlacementController();
  else if (controllerName === 'assetLibrary') controller = getUiAssetLibraryController();
  return uiDispatchController(controller, action, payload);
}

function uiDirectPatchRenderSettings(patch, source) {
  try {
    var runtimeApi = window.App && window.App.state ? window.App.state.runtimeStateApi || null : null;
    if (!runtimeApi && window.__RUNTIME_STATE_API__) runtimeApi = window.__RUNTIME_STATE_API__;
    if (runtimeApi && typeof runtimeApi.patchEditorCameraSettings === 'function') {
      return runtimeApi.patchEditorCameraSettings(patch || {}, { source: String(source || 'ui-direct-render-patch') });
    }
  } catch (_) {}
  return null;
}


async function uiRunAssetScan(force, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', (!!force ? 'handleRescanAssetsButton' : 'runAssetScan'), (!!force ? [String(source || 'ui:run-asset-scan')] : [{ force: !!force, source: String(source || 'ui:run-asset-scan') }]));
  if (dispatched) return await dispatched;
  if (controller && typeof controller.handleRescanAssetsButton === 'function' && !!force) return await controller.handleRescanAssetsButton(String(source || 'ui:run-asset-scan'));
  if (controller && typeof controller.runAssetScan === 'function') return await controller.runAssetScan({ force: !!force, source: String(source || 'ui:run-asset-scan') });
  var workflow = getUiAssetWorkflow();
  if (workflow && typeof workflow.runAssetScan === 'function') {
    return await workflow.runAssetScan({ force: !!force, source: String(source || 'ui:run-asset-scan') });
  }
  return { ok: false, reason: 'missing-asset-workflow-service' };
}

async function uiSaveSceneTarget(options) {
  options = options || {};
  var sceneController = getUiSceneController();
  var dispatched = uiDispatchControllerCommand('scene', 'saveSceneTarget', [options]);
  if (dispatched) return await dispatched;
  if (sceneController && typeof sceneController.saveSceneTarget === 'function') return await sceneController.saveSceneTarget(options);
  var controller = getUiMainController();
  dispatched = uiDispatchControllerCommand('main', 'saveSceneTarget', [options]);
  if (dispatched) return await dispatched;
  if (controller && typeof controller.saveSceneTarget === 'function') return await controller.saveSceneTarget(options);
  var workflow = getUiSceneWorkflow();
  if (workflow && typeof workflow.saveSceneTarget === 'function') return await workflow.saveSceneTarget(options);
  return { ok: false, reason: 'missing-scene-workflow-service' };
}

async function uiLoadSceneTarget(options) {
  options = options || {};
  var sceneController = getUiSceneController();
  var dispatched = uiDispatchControllerCommand('scene', 'loadSceneTarget', [options]);
  if (dispatched) return await dispatched;
  if (sceneController && typeof sceneController.loadSceneTarget === 'function') return await sceneController.loadSceneTarget(options);
  var controller = getUiMainController();
  dispatched = uiDispatchControllerCommand('main', 'loadSceneTarget', [options]);
  if (dispatched) return await dispatched;
  if (controller && typeof controller.loadSceneTarget === 'function') return await controller.loadSceneTarget(options);
  var workflow = getUiSceneWorkflow();
  if (workflow && typeof workflow.loadSceneTarget === 'function') return await workflow.loadSceneTarget(options);
  return { ok: false, reason: 'missing-scene-workflow-service' };
}

function getUnifiedWorldZoomValue() {
  try {
    if (window.App && window.App.state && window.App.state.runtimeState && typeof window.App.state.runtimeState.getEditorCameraSettingsValue === 'function') {
      var cameraSettings = window.App.state.runtimeState.getEditorCameraSettingsValue();
      var runtimeZoom = Number(cameraSettings && cameraSettings.zoom);
      if (Number.isFinite(runtimeZoom)) return runtimeZoom;
    }
  } catch (_) {}
  return Number(settings && settings.worldDisplayScale) || 1;
}

function requestUnifiedWorldZoom(nextZoom, source) {
  var requestSource = String(source || 'ui:world-zoom');
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorZoom', [nextZoom, requestSource]);
  if (dispatched && dispatched.zoom != null) return Number(dispatched.zoom) || Number(nextZoom) || 1;
  if (controller && typeof controller.setMainEditorZoom === 'function') {
    var result = controller.setMainEditorZoom(nextZoom, requestSource);
    if (result && result.zoom != null) return Number(result.zoom) || Number(nextZoom) || 1;
  }
  try {
    if (window.App && window.App.state && window.App.state.runtimeState && typeof window.App.state.runtimeState.patchEditorCameraSettings === 'function') {
      var fallbackResult = window.App.state.runtimeState.patchEditorCameraSettings({ zoom: nextZoom }, { source: requestSource + ':fallback-runtime' });
      if (fallbackResult && fallbackResult.zoom != null) return Number(fallbackResult.zoom) || Number(nextZoom) || 1;
    }
  } catch (_) {}
  settings.worldDisplayScale = Number(nextZoom) || 1;
  settings.tileScale = settings.worldDisplayScale / Math.max(1, Number(settings.worldResolution) || 1);
  settings.tileW = BASE_TILE_W * settings.tileScale;
  settings.tileH = BASE_TILE_H * settings.tileScale;
  return Number(settings.worldDisplayScale) || 1;
}

function applyWorldDisplayScale(nextDisplayScale, anchorWorld = null, anchorScreen = null, options = null) {
  var opts = options && typeof options === 'object' ? options : {};
  var requestSource = String(opts.source || 'ui:applyWorldDisplayScale');
  var isReuseFirstInteractionZoom = requestSource.indexOf('wheel-zoom-reuse') >= 0 || requestSource.indexOf('pinch-zoom-reuse') >= 0;
  var prevDisplayScale = getUnifiedWorldZoomValue();
  nextDisplayScale = clamp(Number(nextDisplayScale) || prevDisplayScale || 1, 0.5, 2.4);
  if (opts.forceApply !== true && Math.abs(nextDisplayScale - prevDisplayScale) < 0.0001) return false;
  var appliedZoom = requestUnifiedWorldZoom(nextDisplayScale, requestSource);
  if (ui.tileScale) ui.tileScale.value = String(Number(appliedZoom.toFixed(2)));
  if (anchorWorld && anchorScreen && Number.isFinite(anchorWorld.x) && Number.isFinite(anchorWorld.y) && Number.isFinite(anchorScreen.x) && Number.isFinite(anchorScreen.y)) {
    var anchored = iso(anchorWorld.x, anchorWorld.y, anchorWorld.z || 0);
    var nextCamera = { x: camera.x + (anchorScreen.x - anchored.x), y: camera.y + (anchorScreen.y - anchored.y) };
    if (window.App && window.App.state && window.App.state.runtimeState && typeof window.App.state.runtimeState.setCamera === 'function') window.App.state.runtimeState.setCamera(nextCamera, { source: requestSource });
    else {
      camera.x = nextCamera.x;
      camera.y = nextCamera.y;
    }
  }
  if (!isReuseFirstInteractionZoom) {
    invalidateShadowGeometryCache('world-zoom');
    refreshInspectorPanels();
    if (editor.mode === 'place' || editor.mode === 'drag') updatePreview();
    pushLog(`world-zoom: displayScale=${Number(settings.worldDisplayScale || appliedZoom).toFixed(2)} tileScale=${Number(settings.tileScale || appliedZoom).toFixed(2)} runtimeZoom=${Number(appliedZoom).toFixed(2)} camera=(${camera.x.toFixed(1)},${camera.y.toFixed(1)})`);
  }
  return true;
}

function applySettings() {
  setPhase('boot', 'applySettings');
  detailLog(`applySettings:start raw worldCols=${ui.gridW?.value} worldRows=${ui.gridH?.value} resolution=${ui.worldResolution?.value} displayScale=${ui.tileScale?.value} playerHeightCells=${ui.playerHeightCells?.value} playerProxyW=${ui.playerProxyW?.value} playerProxyD=${ui.playerProxyD?.value}`);
  settings.worldCols = clamp(parseInt(ui.gridW.value || '11', 10), WORLD_SIZE_MIN, WORLD_SIZE_MAX);
  settings.worldRows = clamp(parseInt(ui.gridH.value || '9', 10), WORLD_SIZE_MIN, WORLD_SIZE_MAX);
  settings.worldResolution = clamp(parseInt((ui.worldResolution && ui.worldResolution.value) || '1', 10) || 1, 1, 4);
  if (![1, 2, 4].includes(settings.worldResolution)) settings.worldResolution = 1;
  var requestedWorldDisplayScale = clamp(parseFloat(ui.tileScale.value || '1'), 0.5, 2.4);
  settings.gridW = settings.worldCols * settings.worldResolution;
  settings.gridH = settings.worldRows * settings.worldResolution;
  settings.playerHeightCells = clamp(parseFloat(ui.playerHeightCells.value || '1.7'), 0.2, 6);
  settings.playerProxyW = clamp(parseFloat((ui.playerProxyW && ui.playerProxyW.value) || '0.32'), 0.15, 4);
  settings.playerProxyD = clamp(parseFloat((ui.playerProxyD && ui.playerProxyD.value) || '0.24'), 0.15, 4);
  applyWorldDisplayScale(requestedWorldDisplayScale, null, null, { source: 'ui:applySettings', forceApply: true });
  settings.originX = VIEW_W * 0.57;
  settings.originY = 150;

  filterInstancesToGrid();
  var sceneSessionApi = (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.sceneSession) ? window.App.state.sceneSession : null;
  if (!instances.length) {
    if (sceneSessionApi && typeof sceneSessionApi.ensureNonEmptyScene === 'function') sceneSessionApi.ensureNonEmptyScene({ source: 'ui:applySettings:empty-scene' });
    else instances = defaultInstances();
  }
  if (sceneSessionApi && typeof sceneSessionApi.syncDerivedState === 'function') sceneSessionApi.syncDerivedState({ source: 'ui:applySettings' });
  else rebuildBoxesFromInstances();
  invalidateShadowGeometryCache('applySettings');
  clampPlayerToWorld();
  if (editor.mode === 'place' || editor.mode === 'drag') updatePreview();
  detailLog(`applySettings:done grid=${settings.gridW}x${settings.gridH} tile=${settings.tileW}x${settings.tileH} view=${VIEW_W}x${VIEW_H} dpr=${dpr.toFixed(2)} instances=${instances.length} boxes=${boxes.length} player=(${player.x.toFixed(2)},${player.y.toFixed(2)})`);
}


function uiHandlePreviewFacingRotate(delta, source) {
  var controller = getUiPlacementController();
  var dispatched = uiDispatchControllerCommand('placement', 'rotatePreviewFacing', [delta, source]);
  if (dispatched) { if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly(); return dispatched; }
  if (controller && typeof controller.rotatePreviewFacing === 'function') {
    var result = controller.rotatePreviewFacing(delta, source);
    if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
    return result;
  }
  if (typeof pushLog === 'function') pushLog('[preview-facing] controller missing; UI rotate ignored to avoid presentation direct state write');
  if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
  return { ok: false, reason: 'missing-placement-controller', source: source || 'ui.preview-facing.rotate' };
}

function uiHandlePreviewFacingSet(rotation, source) {
  var controller = getUiPlacementController();
  var dispatched = uiDispatchControllerCommand('placement', 'setPreviewFacing', [rotation, source]);
  if (dispatched) { if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly(); return dispatched; }
  if (controller && typeof controller.setPreviewFacing === 'function') {
    var result = controller.setPreviewFacing(rotation, source);
    if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
    return result;
  }
  if (typeof pushLog === 'function') pushLog('[preview-facing] controller missing; UI set ignored to avoid presentation direct state write');
  if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
  return { ok: false, reason: 'missing-placement-controller', source: source || 'ui.preview-facing.set' };
}

function uiHandleSelectedFacingRotate(delta, source) {
  var controller = getUiPlacementController();
  var dispatched = uiDispatchControllerCommand('placement', 'rotateSelectedInstanceFacing', [delta, source]);
  if (dispatched) { if (typeof refreshInspectorPanels === 'function') refreshInspectorPanels(); return dispatched; }
  if (controller && typeof controller.rotateSelectedInstanceFacing === 'function') {
    var result = controller.rotateSelectedInstanceFacing(delta, source);
    if (typeof refreshInspectorPanels === 'function') refreshInspectorPanels();
    return result;
  }
  return { ok: false, reason: 'missing-selected-facing-controller' };
}

function uiHandleModeButton(mode, source) {
  var c = getUiPlacementController();
  var dispatched = uiDispatchControllerCommand('placement', 'handleModeButton', [mode, source]);
  if (dispatched) return dispatched;
  if (c && typeof c.handleModeButton === 'function') return c.handleModeButton(mode, source);
  if (c && typeof c.requestModeChange === 'function') return c.requestModeChange(mode, { source: source });
  return requestEditorModeChange(mode, { source: source });
}

function uiHandleMainViewRotate(delta, source) {
  uiLogMainCameraAction((Number(delta) || 0) < 0 ? 'rotateLeft' : 'rotateRight', source || 'camera-panel:rotate');
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'rotateMainEditorView', [delta, source]);
  if (dispatched) { uiRefreshMainCameraPanel(source); if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly(); return dispatched; }
  if (controller && typeof controller.rotateMainEditorView === 'function') {
    var result = controller.rotateMainEditorView(delta, source);
    uiRefreshMainCameraPanel(source);
    if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
    return result;
  }
  return { ok: false, reason: 'missing-main-view-rotation-controller' };
}

function uiHandleMainViewRotationDiagnosticExport(source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'exportMainViewRotationDiagnostic', [source]);
  if (dispatched) return dispatched;
  if (controller && typeof controller.exportMainViewRotationDiagnostic === 'function') return controller.exportMainViewRotationDiagnostic(source);
  return null;
}

function uiGetMainCameraSettings(source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'getMainEditorCameraSettings', [source || 'camera-panel:read']);
  if (dispatched) return dispatched;
  if (controller && typeof controller.getMainEditorCameraSettings === 'function') return controller.getMainEditorCameraSettings(source || 'camera-panel:read');
  return null;
}

function uiRefreshMainCameraPanel(source) {
  var settings = uiGetMainCameraSettings(source || 'camera-panel:refresh') || null;
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

var __uiRenderControlInteractionLockUntil = 0;

function uiLockRenderControlsInteraction(ms) {
  try { __uiRenderControlInteractionLockUntil = Date.now() + Math.max(0, Number(ms) || 0); } catch (_) { __uiRenderControlInteractionLockUntil = 0; }
}

function uiIsRenderControlsInteractionLocked() {
  try { return Date.now() < __uiRenderControlInteractionLockUntil; } catch (_) { return false; }
}

function uiGetRenderControlOverrides() {
  try {
    if (typeof window === 'undefined') return null;
    var overrides = window.__RENDER_CONTROL_OVERRIDES__;
    return overrides && typeof overrides === 'object' ? overrides : null;
  } catch (_) {
    return null;
  }
}

function uiSetRenderControlOverrides(patch) {
  try {
    if (typeof window === 'undefined') return null;
    if (!window.__RENDER_CONTROL_OVERRIDES__ || typeof window.__RENDER_CONTROL_OVERRIDES__ !== 'object') window.__RENDER_CONTROL_OVERRIDES__ = {};
    var target = window.__RENDER_CONTROL_OVERRIDES__;
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

function uiBuildEffectiveRenderSettings(settings) {
  var base = settings && typeof settings === 'object' ? settings : {};
  var effective = Object.assign({}, base);
  var overrides = uiGetRenderControlOverrides();
  if (overrides) {
    if (Object.prototype.hasOwnProperty.call(overrides, 'staticWorldFaceMergeEnabled')) effective.staticWorldFaceMergeEnabled = overrides.staticWorldFaceMergeEnabled !== false;
    if (Object.prototype.hasOwnProperty.call(overrides, 'disableFaceMergeAtOrAboveZoomEnabled')) effective.disableFaceMergeAtOrAboveZoomEnabled = !!overrides.disableFaceMergeAtOrAboveZoomEnabled;
    if (Object.prototype.hasOwnProperty.call(overrides, 'disableFaceMergeAtOrAboveZoomThreshold')) effective.disableFaceMergeAtOrAboveZoomThreshold = Math.max(0.05, Number(overrides.disableFaceMergeAtOrAboveZoomThreshold) || 1.6);
  }
  return effective;
}

function uiRefreshRenderPanel(source) {
  var settings = uiGetMainCameraSettings(source || 'render-panel:refresh') || null;
  if (!settings) return null;
  var effectiveSettings = uiBuildEffectiveRenderSettings(settings);
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

function uiHandleRenderSetFaceMergeEnabled(enabled, source) {
  uiLockRenderControlsInteraction(1200);
  enabled = enabled !== false;
  if (ui.renderFaceMergeEnabled) ui.renderFaceMergeEnabled.checked = enabled;
  uiSetRenderControlOverrides({ staticWorldFaceMergeEnabled: enabled });
  uiDirectPatchRenderSettings({ staticWorldFaceMergeEnabled: enabled }, source || 'render-panel:face-merge-enabled:direct');
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorStaticWorldFaceMergeEnabled', [enabled, source || 'render-panel:face-merge-enabled']);
  if (dispatched) { uiRefreshRenderPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorStaticWorldFaceMergeEnabled === 'function') {
    var result = controller.setMainEditorStaticWorldFaceMergeEnabled(enabled, source || 'render-panel:face-merge-enabled');
    uiRefreshRenderPanel(source);
    return result;
  }
  uiRefreshRenderPanel(source);
  return { ok: false, reason: 'missing-render-face-merge-controller' };
}

function uiHandleRenderSetZoomDisableEnabled(enabled, source) {
  uiLockRenderControlsInteraction(1200);
  enabled = !!enabled;
  if (ui.renderDisableFaceMergeAtZoomEnabled) ui.renderDisableFaceMergeAtZoomEnabled.checked = enabled;
  uiSetRenderControlOverrides({ disableFaceMergeAtOrAboveZoomEnabled: enabled });
  uiDirectPatchRenderSettings({ disableFaceMergeAtOrAboveZoomEnabled: enabled }, source || 'render-panel:zoom-disable-enabled:direct');
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorDisableFaceMergeAtOrAboveZoomEnabled', [enabled, source || 'render-panel:zoom-disable-enabled']);
  if (dispatched) { uiRefreshRenderPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorDisableFaceMergeAtOrAboveZoomEnabled === 'function') {
    var result = controller.setMainEditorDisableFaceMergeAtOrAboveZoomEnabled(enabled, source || 'render-panel:zoom-disable-enabled');
    uiRefreshRenderPanel(source);
    return result;
  }
  uiRefreshRenderPanel(source);
  return { ok: false, reason: 'missing-render-zoom-disable-enabled-controller' };
}

function uiHandleRenderSetZoomDisableThreshold(threshold, source) {
  uiLockRenderControlsInteraction(1200);
  threshold = Math.max(0.05, Number(threshold) || 1.6);
  if (ui.renderDisableFaceMergeAtZoomThreshold) ui.renderDisableFaceMergeAtZoomThreshold.value = String(Number(threshold).toFixed(2));
  uiSetRenderControlOverrides({ disableFaceMergeAtOrAboveZoomThreshold: threshold });
  uiDirectPatchRenderSettings({ disableFaceMergeAtOrAboveZoomThreshold: threshold }, source || 'render-panel:zoom-disable-threshold:direct');
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorDisableFaceMergeAtOrAboveZoomThreshold', [threshold, source || 'render-panel:zoom-disable-threshold']);
  if (dispatched) { uiRefreshRenderPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorDisableFaceMergeAtOrAboveZoomThreshold === 'function') {
    var result = controller.setMainEditorDisableFaceMergeAtOrAboveZoomThreshold(threshold, source || 'render-panel:zoom-disable-threshold');
    uiRefreshRenderPanel(source);
    return result;
  }
  uiRefreshRenderPanel(source);
  return { ok: false, reason: 'missing-render-zoom-disable-threshold-controller' };
}

function uiLogMainCameraAction(action, source) {
  var settings = uiGetMainCameraSettings(String(source || 'camera-panel:action')) || {};
  try {
    if (typeof recordItemRotationDiagnostic === 'function') recordItemRotationDiagnostic('main-camera-ui-action', {
      action: String(action || ''),
      currentViewRotation: Number(settings.viewRotation || 0),
      animationEnabled: settings.rotationAnimationEnabled !== false,
      source: 'camera-panel'
    });
  } catch (_) {}
}

function uiHandleMainCameraReset(source) {
  uiLogMainCameraAction('resetView', source || 'camera-panel:reset-view');
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'resetMainEditorViewRotation', [source || 'camera-panel:reset-view']);
  if (dispatched) { uiRefreshMainCameraPanel(source); if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly(); return dispatched; }
  if (controller && typeof controller.resetMainEditorViewRotation === 'function') {
    var result = controller.resetMainEditorViewRotation(source || 'camera-panel:reset-view');
    uiRefreshMainCameraPanel(source);
    if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-reset-controller' };
}

function uiHandleMainCameraSetAnimationEnabled(enabled, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorRotationAnimationEnabled', [enabled, source || 'camera-panel:animation-enabled']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorRotationAnimationEnabled === 'function') {
    var result = controller.setMainEditorRotationAnimationEnabled(enabled, source || 'camera-panel:animation-enabled');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-animation-enabled-controller' };
}

function uiHandleMainCameraSetAnimationMs(ms, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorRotationAnimationMs', [ms, source || 'camera-panel:animation-ms']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorRotationAnimationMs === 'function') {
    var result = controller.setMainEditorRotationAnimationMs(ms, source || 'camera-panel:animation-ms');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-animation-ms-controller' };
}

function uiHandleMainCameraSetInterpolationEnabled(enabled, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorRotationInterpolationEnabled', [enabled, source || 'camera-panel:interpolation-enabled']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorRotationInterpolationEnabled === 'function') {
    var result = controller.setMainEditorRotationInterpolationEnabled(enabled, source || 'camera-panel:interpolation-enabled');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-interpolation-enabled-controller' };
}

function uiHandleMainCameraSetInterpolationMode(mode, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorRotationInterpolationMode', [mode, source || 'camera-panel:interpolation-mode']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorRotationInterpolationMode === 'function') {
    var result = controller.setMainEditorRotationInterpolationMode(mode, source || 'camera-panel:interpolation-mode');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-interpolation-mode-controller' };
}

function uiHandleMainCameraSetZoom(zoom, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorZoom', [zoom, source || 'camera-panel:zoom']);
  if (dispatched) {
    if (ui.tileScale) ui.tileScale.value = String(Number((((dispatched && dispatched.zoom) != null ? dispatched.zoom : getUnifiedWorldZoomValue()) || 1).toFixed(2)));
    uiRefreshMainCameraPanel(source);
    return dispatched;
  }
  if (controller && typeof controller.setMainEditorZoom === 'function') {
    var result = controller.setMainEditorZoom(zoom, source || 'camera-panel:zoom');
    if (ui.tileScale) ui.tileScale.value = String(Number((((result && result.zoom) != null ? result.zoom : getUnifiedWorldZoomValue()) || 1).toFixed(2)));
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-zoom-controller' };
}

function uiHandleMainCameraSetZoomBounds(minZoom, maxZoom, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorZoomBounds', [minZoom, maxZoom, source || 'camera-panel:zoom-bounds']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorZoomBounds === 'function') {
    var result = controller.setMainEditorZoomBounds(minZoom, maxZoom, source || 'camera-panel:zoom-bounds');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-zoom-bounds-controller' };
}

function uiHandleMainCameraSetCullingEnabled(enabled, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorCameraCullingEnabled', [enabled, source || 'camera-panel:culling-enabled']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorCameraCullingEnabled === 'function') {
    var result = controller.setMainEditorCameraCullingEnabled(enabled, source || 'camera-panel:culling-enabled');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-culling-enabled-controller' };
}

function uiHandleMainCameraSetCullingMargin(margin, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorCullingMargin', [margin, source || 'camera-panel:culling-margin']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorCullingMargin === 'function') {
    var result = controller.setMainEditorCullingMargin(margin, source || 'camera-panel:culling-margin');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-culling-margin-controller' };
}

function uiHandleMainCameraSetShowBounds(enabled, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorShowCameraBounds', [enabled, source || 'camera-panel:show-bounds']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorShowCameraBounds === 'function') {
    var result = controller.setMainEditorShowCameraBounds(enabled, source || 'camera-panel:show-bounds');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-show-bounds-controller' };
}

function uiHandleMainCameraSetShowCullingBounds(enabled, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorShowCullingBounds', [enabled, source || 'camera-panel:show-culling-bounds']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorShowCullingBounds === 'function') {
    var result = controller.setMainEditorShowCullingBounds(enabled, source || 'camera-panel:show-culling-bounds');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-show-culling-bounds-controller' };
}

function uiHandleMainCameraSetSurfaceOnlyRenderingEnabled(enabled, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorSurfaceOnlyRenderingEnabled', [enabled, source || 'camera-panel:surface-only-rendering']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorSurfaceOnlyRenderingEnabled === 'function') {
    var result = controller.setMainEditorSurfaceOnlyRenderingEnabled(enabled, source || 'camera-panel:surface-only-rendering');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-surface-only-controller' };
}

function uiHandleMainCameraSetDebugVisibleSurfaces(enabled, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorDebugVisibleSurfaces', [enabled, source || 'camera-panel:debug-visible-surfaces']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorDebugVisibleSurfaces === 'function') {
    var result = controller.setMainEditorDebugVisibleSurfaces(enabled, source || 'camera-panel:debug-visible-surfaces');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  return { ok: false, reason: 'missing-main-camera-debug-visible-surfaces-controller' };
}


function uiNormalizeTerrainAlgorithmValue(value) {
  var raw = String(value == null ? '' : value).trim();
  if (!raw) return 'profile_fbm';
  if (raw === 'random' || raw === 'rand') return 'random_height';
  if (raw === 'sin') return 'sin_wave';
  if (raw === 'fbm' || raw === 'simple_fbm' || raw === 'simple-fbm' || raw === 'noise') return 'perlin_octaves';
  if (raw === 'profile_perlin' || raw === 'profile-fbm' || raw === 'profile_fbm' || raw === 'profile' || raw === 'height_profile') return 'profile_fbm';
  if (raw === 'multiple_perlin') return 'multi_perlin';
  if (raw === 'single_perlin') return 'perlin';
  if (['random_height', 'sin_wave', 'perlin', 'perlin_octaves', 'multi_perlin', 'profile_fbm'].indexOf(raw) >= 0) return raw;
  return 'profile_fbm';
}

function uiTerrainNumberSetting(settings, key, fallback) {
  if (!settings || !Object.prototype.hasOwnProperty.call(settings, key)) return fallback;
  var value = Number(settings[key]);
  return Number.isFinite(value) ? value : fallback;
}

function uiSetTerrainInputValue(el, value) {
  if (!el) return;
  el.value = String(value);
}

function uiSetTerrainSelectValue(el, value) {
  if (!el) return;
  el.value = String(value);
}

function uiSetTerrainAlgorithmPanelVisible(el, visible) {
  if (!el) return;
  try { el.hidden = !visible; } catch (_) {}
  el.style.display = visible ? '' : 'none';
}

function uiUpdateTerrainAlgorithmPanel(source) {
  var algorithm = uiNormalizeTerrainAlgorithmValue(ui.terrainAlgorithm && ui.terrainAlgorithm.value || 'profile_fbm');

  uiSetTerrainAlgorithmPanelVisible(ui.terrainRandomParamsPanel, algorithm === 'random_height');
  uiSetTerrainAlgorithmPanelVisible(ui.terrainSinParamsPanel, algorithm === 'sin_wave');
  uiSetTerrainAlgorithmPanelVisible(ui.terrainPerlinParamsPanel, algorithm === 'perlin');
  uiSetTerrainAlgorithmPanelVisible(ui.terrainOctaveParamsPanel, algorithm === 'perlin_octaves');
  uiSetTerrainAlgorithmPanelVisible(ui.terrainMultiPerlinParamsPanel, algorithm === 'multi_perlin');
  uiSetTerrainAlgorithmPanelVisible(ui.terrainProfileParamsPanel, algorithm === 'profile_fbm');

  if (ui.terrainAlgorithmHint) {
    if (algorithm === 'random_height') {
      ui.terrainAlgorithmHint.textContent = 'Random：每个格子独立随机取高度，变化最突兀，主要用于对照测试。';
    } else if (algorithm === 'sin_wave') {
      ui.terrainAlgorithmHint.textContent = 'Sin：用正弦函数生成平滑且周期性的高低起伏，参数控制波长、相位和混合方式。';
    } else if (algorithm === 'perlin') {
      ui.terrainAlgorithmHint.textContent = 'Perlin(x,z)：单层平滑噪声，Scale 控制起伏尺度，Offset 控制采样平移。';
    } else if (algorithm === 'perlin_octaves') {
      ui.terrainAlgorithmHint.textContent = 'Perlin + Octaves：多八度 fBm 噪声，Octaves / Persistence / Lacunarity 控制细节层级。';
    } else if (algorithm === 'multi_perlin') {
      ui.terrainAlgorithmHint.textContent = 'Multiple Perlin：多个不同尺度、权重、偏移和 seedOffset 的 Perlin 函数叠加。';
    } else {
      ui.terrainAlgorithmHint.textContent = 'Perlin + Height Profile：macro noise 选择基础海拔档位，detail noise 叠加局部起伏，可生成突兀山体、悬崖和台地。';
    }
  }
  return { algorithm: algorithm, source: String(source || 'terrain-panel:algorithm-panel') };
}

function uiHandleTerrainAlgorithmChange(source) {
  var panelState = uiUpdateTerrainAlgorithmPanel(source || 'terrain-panel:algorithm-change');
  var controller = getUiMainController();
  var payload = { terrainAlgorithm: panelState.algorithm };
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorTerrainSettings', [payload, source || 'terrain-panel:algorithm-change']);
  return dispatched || (controller && typeof controller.setMainEditorTerrainSettings === 'function' ? controller.setMainEditorTerrainSettings(payload, source || 'terrain-panel:algorithm-change') : panelState);
}

function uiHandleTerrainParamGroupToggle(button, source) {
  if (!button) return { ok: false, reason: 'missing-button' };
  var group = button.closest ? button.closest('.terrainParamGroup') : null;
  if (!group) return { ok: false, reason: 'missing-param-group' };
  var nextCollapsed = !group.classList.contains('collapsed');
  group.classList.toggle('collapsed', nextCollapsed);
  try { button.setAttribute('aria-expanded', nextCollapsed ? 'false' : 'true'); } catch (_) {}
  return {
    ok: true,
    collapsed: nextCollapsed,
    source: String(source || 'terrain-panel:param-group-toggle')
  };
}

function uiReadTerrainProfileRows() {
  return [0, 1, 2, 3].map(function (idx) {
    var startEl = ui['terrainProfile' + idx + 'Start'];
    var endEl = ui['terrainProfile' + idx + 'End'];
    var baseEl = ui['terrainProfile' + idx + 'Base'];
    return {
      start: Number(startEl && startEl.value || 0),
      end: Number(endEl && endEl.value || 0),
      baseHeight: Number(baseEl && baseEl.value || 0)
    };
  });
}

function uiReadMainTerrainFormValues() {
  var octaveScale = Number(ui.terrainOctaveScale && ui.terrainOctaveScale.value || 0);
  var octaveCount = Number(ui.terrainOctaves && ui.terrainOctaves.value || 0);
  var octavePersistence = Number(ui.terrainPersistence && ui.terrainPersistence.value || 0);
  var octaveLacunarity = Number(ui.terrainLacunarity && ui.terrainLacunarity.value || 0);
  var detailScale = Number(ui.terrainDetailScale && ui.terrainDetailScale.value || 0);
  var detailOctaves = Number(ui.terrainDetailOctaves && ui.terrainDetailOctaves.value || 0);
  var detailPersistence = Number(ui.terrainDetailPersistence && ui.terrainDetailPersistence.value || 0);
  var detailLacunarity = Number(ui.terrainDetailLacunarity && ui.terrainDetailLacunarity.value || 0);

  return {
    seed: ui.terrainSeed ? String(ui.terrainSeed.value || '').trim() : '1337',
    width: Number(ui.terrainWidth && ui.terrainWidth.value || 0),
    height: Number(ui.terrainHeight && ui.terrainHeight.value || 0),
    minHeight: Number(ui.terrainMinHeight && ui.terrainMinHeight.value || 0),
    maxHeight: Number(ui.terrainMaxHeight && ui.terrainMaxHeight.value || 0),
    waterLevel: Number(ui.terrainWaterLevel && ui.terrainWaterLevel.value || 0),
    baseHeightOffset: Number(ui.terrainBaseHeightOffset && ui.terrainBaseHeightOffset.value || 0),

    terrainAlgorithm: uiNormalizeTerrainAlgorithmValue(ui.terrainAlgorithm && ui.terrainAlgorithm.value || 'profile_fbm'),

    sinScaleX: Number(ui.terrainSinScaleX && ui.terrainSinScaleX.value || 0),
    sinScaleZ: Number(ui.terrainSinScaleZ && ui.terrainSinScaleZ.value || 0),
    sinScaleY: Number(ui.terrainSinScaleZ && ui.terrainSinScaleZ.value || 0),
    sinPhaseX: Number(ui.terrainSinPhaseX && ui.terrainSinPhaseX.value || 0),
    sinPhaseZ: Number(ui.terrainSinPhaseZ && ui.terrainSinPhaseZ.value || 0),
    sinPhaseY: Number(ui.terrainSinPhaseZ && ui.terrainSinPhaseZ.value || 0),
    sinMixMode: String(ui.terrainSinMixMode && ui.terrainSinMixMode.value || 'add'),

    perlinScale: Number(ui.terrainPerlinScale && ui.terrainPerlinScale.value || 0),
    perlinOffsetX: Number(ui.terrainPerlinOffsetX && ui.terrainPerlinOffsetX.value || 0),
    perlinOffsetZ: Number(ui.terrainPerlinOffsetZ && ui.terrainPerlinOffsetZ.value || 0),

    octaveScale: octaveScale,
    octaves: octaveCount,
    persistence: octavePersistence,
    lacunarity: octaveLacunarity,
    octaveOffsetX: Number(ui.terrainOctaveOffsetX && ui.terrainOctaveOffsetX.value || 0),
    octaveOffsetZ: Number(ui.terrainOctaveOffsetZ && ui.terrainOctaveOffsetZ.value || 0),

    multiScale1: Number(ui.terrainMultiScale1 && ui.terrainMultiScale1.value || 0),
    multiWeight1: Number(ui.terrainMultiWeight1 && ui.terrainMultiWeight1.value || 0),
    multiOffsetX1: Number(ui.terrainMultiOffsetX1 && ui.terrainMultiOffsetX1.value || 0),
    multiOffsetZ1: Number(ui.terrainMultiOffsetZ1 && ui.terrainMultiOffsetZ1.value || 0),
    multiSeedOffset1: Number(ui.terrainMultiSeedOffset1 && ui.terrainMultiSeedOffset1.value || 0),
    multiScale2: Number(ui.terrainMultiScale2 && ui.terrainMultiScale2.value || 0),
    multiWeight2: Number(ui.terrainMultiWeight2 && ui.terrainMultiWeight2.value || 0),
    multiOffsetX2: Number(ui.terrainMultiOffsetX2 && ui.terrainMultiOffsetX2.value || 0),
    multiOffsetZ2: Number(ui.terrainMultiOffsetZ2 && ui.terrainMultiOffsetZ2.value || 0),
    multiSeedOffset2: Number(ui.terrainMultiSeedOffset2 && ui.terrainMultiSeedOffset2.value || 0),
    multiScale3: Number(ui.terrainMultiScale3 && ui.terrainMultiScale3.value || 0),
    multiWeight3: Number(ui.terrainMultiWeight3 && ui.terrainMultiWeight3.value || 0),
    multiOffsetX3: Number(ui.terrainMultiOffsetX3 && ui.terrainMultiOffsetX3.value || 0),
    multiOffsetZ3: Number(ui.terrainMultiOffsetZ3 && ui.terrainMultiOffsetZ3.value || 0),
    multiSeedOffset3: Number(ui.terrainMultiSeedOffset3 && ui.terrainMultiSeedOffset3.value || 0),

    macroScale: Number(ui.terrainMacroScale && ui.terrainMacroScale.value || 0),
    macroOctaves: Number(ui.terrainMacroOctaves && ui.terrainMacroOctaves.value || 0),
    macroPersistence: Number(ui.terrainMacroPersistence && ui.terrainMacroPersistence.value || 0),
    macroLacunarity: Number(ui.terrainMacroLacunarity && ui.terrainMacroLacunarity.value || 0),
    macroOffsetX: Number(ui.terrainMacroOffsetX && ui.terrainMacroOffsetX.value || 0),
    macroOffsetZ: Number(ui.terrainMacroOffsetZ && ui.terrainMacroOffsetZ.value || 0),

    detailScale: detailScale,
    detailOctaves: detailOctaves,
    detailPersistence: detailPersistence,
    detailLacunarity: detailLacunarity,
    detailStrength: Number(ui.terrainDetailStrength && ui.terrainDetailStrength.value || 0),
    detailOffsetX: Number(ui.terrainDetailOffsetX && ui.terrainDetailOffsetX.value || 0),
    detailOffsetZ: Number(ui.terrainDetailOffsetZ && ui.terrainDetailOffsetZ.value || 0),

    // Legacy mirror fields kept so older terrain paths/tests reading detail* for octave mode do not break.
    legacyOctaveScale: octaveScale,
    legacyOctaves: octaveCount,

    terrainDebugFaceColorsEnabled: !!(ui.terrainDebugFaceColorsEnabled && ui.terrainDebugFaceColorsEnabled.checked),
    terrainColorMode: (ui.terrainDebugFaceColorsEnabled && ui.terrainDebugFaceColorsEnabled.checked) ? 'debug-semantic' : 'natural',
    terrainBuildColorMode: String(ui.terrainBuildColorMode && ui.terrainBuildColorMode.value || 'natural'),
    terrainBuildLightingBypass: !!(ui.terrainBuildLightingBypass && ui.terrainBuildLightingBypass.checked),
    terrainDetailedProfilingEnabled: !!(ui.terrainDetailedProfilingEnabled && ui.terrainDetailedProfilingEnabled.checked),
    heightProfileConfig: uiReadTerrainProfileRows()
  };
}

function uiGetMainTerrainSettings(source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'getMainEditorTerrainSettings', [source || 'terrain-panel:read']);
  if (dispatched) return dispatched;
  if (controller && typeof controller.getMainEditorTerrainSettings === 'function') return controller.getMainEditorTerrainSettings(source || 'terrain-panel:read');
  return null;
}

function uiApplyMainTerrainSettingsToForm(settings) {
  if (!settings) return;

  uiSetTerrainInputValue(ui.terrainSeed, settings.seed != null ? settings.seed : '1337');
  uiSetTerrainInputValue(ui.terrainWidth, Math.max(1, Number(settings.width) || 1));
  uiSetTerrainInputValue(ui.terrainHeight, Math.max(1, Number(settings.height) || 1));
  uiSetTerrainInputValue(ui.terrainMinHeight, uiTerrainNumberSetting(settings, 'minHeight', -10));
  uiSetTerrainInputValue(ui.terrainMaxHeight, uiTerrainNumberSetting(settings, 'maxHeight', 25));
  uiSetTerrainInputValue(ui.terrainWaterLevel, uiTerrainNumberSetting(settings, 'waterLevel', 0));
  uiSetTerrainInputValue(ui.terrainBaseHeightOffset, uiTerrainNumberSetting(settings, 'baseHeightOffset', 0));

  uiSetTerrainSelectValue(ui.terrainAlgorithm, uiNormalizeTerrainAlgorithmValue(settings.terrainAlgorithm || 'profile_fbm'));
  uiUpdateTerrainAlgorithmPanel('terrain-panel:apply-settings');

  uiSetTerrainInputValue(ui.terrainSinScaleX, uiTerrainNumberSetting(settings, 'sinScaleX', 8));
  uiSetTerrainInputValue(ui.terrainSinScaleZ, uiTerrainNumberSetting(settings, 'sinScaleZ', uiTerrainNumberSetting(settings, 'sinScaleY', 8)));
  uiSetTerrainInputValue(ui.terrainSinPhaseX, uiTerrainNumberSetting(settings, 'sinPhaseX', 0));
  uiSetTerrainInputValue(ui.terrainSinPhaseZ, uiTerrainNumberSetting(settings, 'sinPhaseZ', uiTerrainNumberSetting(settings, 'sinPhaseY', 0)));
  uiSetTerrainSelectValue(ui.terrainSinMixMode, String(settings.sinMixMode || 'add'));

  uiSetTerrainInputValue(ui.terrainPerlinScale, uiTerrainNumberSetting(settings, 'perlinScale', 16));
  uiSetTerrainInputValue(ui.terrainPerlinOffsetX, uiTerrainNumberSetting(settings, 'perlinOffsetX', 0));
  uiSetTerrainInputValue(ui.terrainPerlinOffsetZ, uiTerrainNumberSetting(settings, 'perlinOffsetZ', 0));

  uiSetTerrainInputValue(ui.terrainOctaveScale, uiTerrainNumberSetting(settings, 'octaveScale', uiTerrainNumberSetting(settings, 'detailScale', 8)));
  uiSetTerrainInputValue(ui.terrainOctaves, uiTerrainNumberSetting(settings, 'octaves', uiTerrainNumberSetting(settings, 'detailOctaves', 4)));
  uiSetTerrainInputValue(ui.terrainPersistence, uiTerrainNumberSetting(settings, 'persistence', uiTerrainNumberSetting(settings, 'detailPersistence', 0.5)));
  uiSetTerrainInputValue(ui.terrainLacunarity, uiTerrainNumberSetting(settings, 'lacunarity', uiTerrainNumberSetting(settings, 'detailLacunarity', 2)));
  uiSetTerrainInputValue(ui.terrainOctaveOffsetX, uiTerrainNumberSetting(settings, 'octaveOffsetX', 0));
  uiSetTerrainInputValue(ui.terrainOctaveOffsetZ, uiTerrainNumberSetting(settings, 'octaveOffsetZ', 0));

  uiSetTerrainInputValue(ui.terrainMultiScale1, uiTerrainNumberSetting(settings, 'multiScale1', 10));
  uiSetTerrainInputValue(ui.terrainMultiWeight1, uiTerrainNumberSetting(settings, 'multiWeight1', 1));
  uiSetTerrainInputValue(ui.terrainMultiOffsetX1, uiTerrainNumberSetting(settings, 'multiOffsetX1', 0));
  uiSetTerrainInputValue(ui.terrainMultiOffsetZ1, uiTerrainNumberSetting(settings, 'multiOffsetZ1', 0));
  uiSetTerrainInputValue(ui.terrainMultiSeedOffset1, uiTerrainNumberSetting(settings, 'multiSeedOffset1', 101));
  uiSetTerrainInputValue(ui.terrainMultiScale2, uiTerrainNumberSetting(settings, 'multiScale2', 22));
  uiSetTerrainInputValue(ui.terrainMultiWeight2, uiTerrainNumberSetting(settings, 'multiWeight2', 0.65));
  uiSetTerrainInputValue(ui.terrainMultiOffsetX2, uiTerrainNumberSetting(settings, 'multiOffsetX2', 0));
  uiSetTerrainInputValue(ui.terrainMultiOffsetZ2, uiTerrainNumberSetting(settings, 'multiOffsetZ2', 0));
  uiSetTerrainInputValue(ui.terrainMultiSeedOffset2, uiTerrainNumberSetting(settings, 'multiSeedOffset2', 202));
  uiSetTerrainInputValue(ui.terrainMultiScale3, uiTerrainNumberSetting(settings, 'multiScale3', 48));
  uiSetTerrainInputValue(ui.terrainMultiWeight3, uiTerrainNumberSetting(settings, 'multiWeight3', 0.35));
  uiSetTerrainInputValue(ui.terrainMultiOffsetX3, uiTerrainNumberSetting(settings, 'multiOffsetX3', 0));
  uiSetTerrainInputValue(ui.terrainMultiOffsetZ3, uiTerrainNumberSetting(settings, 'multiOffsetZ3', 0));
  uiSetTerrainInputValue(ui.terrainMultiSeedOffset3, uiTerrainNumberSetting(settings, 'multiSeedOffset3', 303));

  uiSetTerrainInputValue(ui.terrainMacroScale, uiTerrainNumberSetting(settings, 'macroScale', 28));
  uiSetTerrainInputValue(ui.terrainMacroOctaves, uiTerrainNumberSetting(settings, 'macroOctaves', 3));
  uiSetTerrainInputValue(ui.terrainMacroPersistence, uiTerrainNumberSetting(settings, 'macroPersistence', 0.55));
  uiSetTerrainInputValue(ui.terrainMacroLacunarity, uiTerrainNumberSetting(settings, 'macroLacunarity', 2));
  uiSetTerrainInputValue(ui.terrainMacroOffsetX, uiTerrainNumberSetting(settings, 'macroOffsetX', 0));
  uiSetTerrainInputValue(ui.terrainMacroOffsetZ, uiTerrainNumberSetting(settings, 'macroOffsetZ', 0));

  uiSetTerrainInputValue(ui.terrainDetailScale, uiTerrainNumberSetting(settings, 'detailScale', 8));
  uiSetTerrainInputValue(ui.terrainDetailOctaves, uiTerrainNumberSetting(settings, 'detailOctaves', 4));
  uiSetTerrainInputValue(ui.terrainDetailPersistence, uiTerrainNumberSetting(settings, 'detailPersistence', 0.5));
  uiSetTerrainInputValue(ui.terrainDetailLacunarity, uiTerrainNumberSetting(settings, 'detailLacunarity', 2));
  uiSetTerrainInputValue(ui.terrainDetailStrength, uiTerrainNumberSetting(settings, 'detailStrength', 4));
  uiSetTerrainInputValue(ui.terrainDetailOffsetX, uiTerrainNumberSetting(settings, 'detailOffsetX', 0));
  uiSetTerrainInputValue(ui.terrainDetailOffsetZ, uiTerrainNumberSetting(settings, 'detailOffsetZ', 0));

  if (ui.terrainDebugFaceColorsEnabled) ui.terrainDebugFaceColorsEnabled.checked = settings.terrainDebugFaceColorsEnabled === true;
  if (ui.terrainBuildColorMode) ui.terrainBuildColorMode.value = String(settings.terrainBuildColorMode || 'natural');
  if (ui.terrainBuildLightingBypass) ui.terrainBuildLightingBypass.checked = settings.terrainBuildLightingBypass === true;
  if (ui.terrainDetailedProfilingEnabled) ui.terrainDetailedProfilingEnabled.checked = settings.terrainDetailedProfilingEnabled === true;

  var profile = Array.isArray(settings.heightProfileConfig) ? settings.heightProfileConfig : [];
  [0, 1, 2, 3].forEach(function (idx) {
    var defaults = [
      { start: 0, end: 0.25, baseHeight: -10 },
      { start: 0.25, end: 0.58, baseHeight: 5 },
      { start: 0.58, end: 0.60, baseHeight: 25 },
      { start: 0.60, end: 1.01, baseHeight: 25 }
    ];
    var segment = profile[idx] || defaults[idx];
    uiSetTerrainInputValue(ui['terrainProfile' + idx + 'Start'], Number(segment.start) || 0);
    uiSetTerrainInputValue(ui['terrainProfile' + idx + 'End'], Number(segment.end) || 0);
    uiSetTerrainInputValue(ui['terrainProfile' + idx + 'Base'], Number(segment.baseHeight) || 0);
  });
}

function uiGetRuntimeStateApiForTerrainMap() {
  try {
    if (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.runtimeState) return window.App.state.runtimeState;
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.resolve === 'function') return window.__APP_NAMESPACE.resolve('state.runtimeState') || null;
  } catch (_) {}
  return null;
}

function uiGetTerrainRuntimeModelForMap() {
  var runtimeApi = uiGetRuntimeStateApiForTerrainMap();
  if (!runtimeApi) return null;
  if (typeof runtimeApi.getTerrainRuntimeModelValue === 'function') {
    try { return runtimeApi.getTerrainRuntimeModelValue(); } catch (_) {}
  }
  return runtimeApi.terrainLogic || null;
}

function uiSyncTerrainMapColorMode(source) {
  var sourceText = String(source || '');
  var preferWindow = sourceText.indexOf('window') >= 0;
  var mode = preferWindow
    ? String((ui.terrainMapWindowColorMode && ui.terrainMapWindowColorMode.value) || (ui.terrainMapColorMode && ui.terrainMapColorMode.value) || 'height')
    : String((ui.terrainMapColorMode && ui.terrainMapColorMode.value) || (ui.terrainMapWindowColorMode && ui.terrainMapWindowColorMode.value) || 'height');
  if (ui.terrainMapColorMode && ui.terrainMapColorMode.value !== mode) ui.terrainMapColorMode.value = mode;
  if (ui.terrainMapWindowColorMode && ui.terrainMapWindowColorMode.value !== mode) ui.terrainMapWindowColorMode.value = mode;
  if (ui.terrainMapInlineSummary && source) {
    ui.terrainMapInlineSummary.textContent = 'Terrain Map：' + ((ui.terrainMapWindow && ui.terrainMapWindow.hidden === false) ? '已打开' : '未打开') + ' · mode=' + mode;
  }
  return mode;
}

function uiSetTerrainMapWindowVisible(visible, source) {
  if (!ui.terrainMapWindow) return { ok: false, reason: 'missing-window' };
  try { ui.terrainMapWindow.hidden = !visible; } catch (_) {}
  if (ui.terrainMapInlineSummary) {
    var mode = uiSyncTerrainMapColorMode();
    ui.terrainMapInlineSummary.textContent = visible ? ('Terrain Map：已打开 · mode=' + mode) : 'Terrain Map：已关闭。';
  }
  if (visible) uiRenderTerrainMapWindow(source || 'terrain-map:open');
  return { ok: true, visible: !!visible, source: String(source || 'terrain-map:visibility') };
}

function uiHandleTerrainMapToggle(source) {
  var visible = !!(ui.terrainMapWindow && ui.terrainMapWindow.hidden === false);
  return uiSetTerrainMapWindowVisible(!visible, source || 'terrain-map:toggle');
}

function uiHandleTerrainMapClose(source) {
  return uiSetTerrainMapWindowVisible(false, source || 'terrain-map:close');
}

function uiClamp01(value) {
  var n = Number(value) || 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function uiMixRgb(a, b, t) {
  var x = uiClamp01(t);
  return {
    r: Math.round((Number(a.r) || 0) + ((Number(b.r) || 0) - (Number(a.r) || 0)) * x),
    g: Math.round((Number(a.g) || 0) + ((Number(b.g) || 0) - (Number(a.g) || 0)) * x),
    b: Math.round((Number(a.b) || 0) + ((Number(b.b) || 0) - (Number(a.b) || 0)) * x)
  };
}

function uiRgbToCss(rgb) {
  var src = rgb && typeof rgb === 'object' ? rgb : { r: 127, g: 127, b: 127 };
  return 'rgb(' + Math.round(Number(src.r) || 0) + ',' + Math.round(Number(src.g) || 0) + ',' + Math.round(Number(src.b) || 0) + ')';
}

function uiSampleGradient(stops, t) {
  var list = Array.isArray(stops) ? stops : [];
  if (list.length <= 0) return 'rgb(127,127,127)';
  if (list.length === 1) return uiRgbToCss(list[0].color || { r: 127, g: 127, b: 127 });
  var x = uiClamp01(t);
  for (var i = 0; i < list.length - 1; i++) {
    var a = list[i];
    var b = list[i + 1];
    var aAt = Number(a.at);
    var bAt = Number(b.at);
    if (x >= aAt && x <= bAt) {
      var span = Math.max(1e-6, bAt - aAt);
      return uiRgbToCss(uiMixRgb(a.color || { r: 127, g: 127, b: 127 }, b.color || { r: 127, g: 127, b: 127 }, (x - aAt) / span));
    }
  }
  return uiRgbToCss((x <= Number(list[0].at)) ? (list[0].color || { r: 127, g: 127, b: 127 }) : (list[list.length - 1].color || { r: 127, g: 127, b: 127 }));
}

function uiResolveTerrainBiomeColor(heightValue, x, y, runtimeModel) {
  var runtime = runtimeModel && typeof runtimeModel === 'object' ? runtimeModel : {};
  var params = runtime.params && typeof runtime.params === 'object' ? runtime.params : {};
  var materialMap = runtime.materialMap || null;
  var waterLevel = Math.round(Number(params.waterLevel) || 0);
  var minHeight = Number(params.minHeight);
  var maxHeight = Number(params.maxHeight);
  if (!Number.isFinite(minHeight)) minHeight = Number((runtime.lastSummary && runtime.lastSummary.minHeightObserved) || 0);
  if (!Number.isFinite(maxHeight)) maxHeight = Number((runtime.lastSummary && runtime.lastSummary.maxHeightObserved) || 1);
  var span = Math.max(1, maxHeight - minHeight);
  var snowCutoff = maxHeight - Math.max(2, Math.round(span * 0.18));
  var h = Math.round(Number(heightValue) || 0);
  if (h <= waterLevel) return '#4f8cff';
  if (h >= snowCutoff) return '#f4f8ff';
  var materialId = null;
  try {
    if (typeof window !== 'undefined' && window.__TERRAIN_MATERIAL_CORE__ && typeof window.__TERRAIN_MATERIAL_CORE__.getTerrainMaterialIdAt === 'function') {
      materialId = window.__TERRAIN_MATERIAL_CORE__.getTerrainMaterialIdAt(materialMap, x, y, 'grass');
    }
  } catch (_) {}
  if (!materialId) {
    var ratio = (h - minHeight) / span;
    if (ratio < 0.12) materialId = 'sand';
    else if (ratio < 0.72) materialId = 'grass';
    else materialId = 'rock';
  }
  if (materialId === 'sand') return '#d8c285';
  if (materialId === 'rock') return '#8f949b';
  return '#73b64f';
}

function uiResolveTerrainHeightColor(heightValue, runtimeModel) {
  var runtime = runtimeModel && typeof runtimeModel === 'object' ? runtimeModel : {};
  var params = runtime.params && typeof runtime.params === 'object' ? runtime.params : {};
  var waterLevel = Math.round(Number(params.waterLevel) || 0);
  var minHeight = Number(params.minHeight);
  var maxHeight = Number(params.maxHeight);
  if (!Number.isFinite(minHeight)) minHeight = Number((runtime.lastSummary && runtime.lastSummary.minHeightObserved) || 0);
  if (!Number.isFinite(maxHeight)) maxHeight = Number((runtime.lastSummary && runtime.lastSummary.maxHeightObserved) || 1);
  var h = Number(heightValue) || 0;
  if (h <= waterLevel) {
    var low = Math.min(minHeight, waterLevel - 1);
    var denom = Math.max(1, waterLevel - low);
    return uiSampleGradient([{ at: 0, color: { r: 26, g: 58, b: 120 } }, { at: 1, color: { r: 95, g: 168, b: 255 } }], (h - low) / denom);
  }
  return uiSampleGradient([
    { at: 0.00, color: { r: 212, g: 196, b: 127 } },
    { at: 0.18, color: { r: 115, g: 182, b: 79 } },
    { at: 0.55, color: { r: 89, g: 144, b: 61 } },
    { at: 0.78, color: { r: 143, g: 148, b: 155 } },
    { at: 1.00, color: { r: 244, g: 248, b: 255 } }
  ], (h - Math.max(waterLevel + 1, minHeight)) / Math.max(1, maxHeight - Math.max(waterLevel + 1, minHeight)));
}

function uiBuildTerrainMapLegend(mode, runtimeModel) {
  var runtime = runtimeModel && typeof runtimeModel === 'object' ? runtimeModel : {};
  var params = runtime.params && typeof runtime.params === 'object' ? runtime.params : {};
  var waterLevel = Math.round(Number(params.waterLevel) || 0);
  var minHeight = Number(params.minHeight);
  var maxHeight = Number(params.maxHeight);
  if (!Number.isFinite(minHeight)) minHeight = Number((runtime.lastSummary && runtime.lastSummary.minHeightObserved) || 0);
  if (!Number.isFinite(maxHeight)) maxHeight = Number((runtime.lastSummary && runtime.lastSummary.maxHeightObserved) || 0);
  var items = mode === 'biome'
    ? [
        { color: '#4f8cff', label: 'Water / 水域 ≤ ' + waterLevel },
        { color: '#d8c285', label: 'Sand / 沙地' },
        { color: '#73b64f', label: 'Grass / 草地' },
        { color: '#8f949b', label: 'Rock / 岩石' },
        { color: '#f4f8ff', label: 'Snow / 雪线高地' }
      ]
    : [
        { color: '#3b78dd', label: 'Low / 低海拔' },
        { color: '#73b64f', label: 'Mid / 中海拔' },
        { color: '#8f949b', label: 'High / 高海拔' },
        { color: '#f4f8ff', label: 'Peak / 最高处' }
      ];
  if (ui.terrainMapLegend) {
    ui.terrainMapLegend.innerHTML = items.map(function (item) {
      return '<div class="terrainMapLegendItem"><span class="terrainMapLegendSwatch" style="background:' + String(item.color) + ';"></span><span>' + String(item.label) + '</span></div>';
    }).join('') + '<div class="terrainMapLegendMeta">Height range：' + String(minHeight) + ' ~ ' + String(maxHeight) + '</div>';
  }
}

function uiRenderTerrainMapWindow(source) {
  var runtime = uiGetTerrainRuntimeModelForMap();
  var canvas = ui.terrainMapCanvas;
  if (!canvas) return { ok: false, reason: 'missing-canvas' };
  var ctx2d = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  if (!ctx2d) return { ok: false, reason: 'missing-context' };
  var mode = uiSyncTerrainMapColorMode(source || 'terrain-map:render');
  var width = Math.max(0, Math.round(Number(runtime && runtime.width) || 0));
  var height = Math.max(0, Math.round(Number(runtime && runtime.height) || 0));
  var heightMap = runtime && Array.isArray(runtime.heightMap) ? runtime.heightMap : [];
  if (!runtime || !width || !height || !heightMap.length) {
    canvas.width = 512;
    canvas.height = 512;
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    ctx2d.fillStyle = '#0d1421';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    ctx2d.fillStyle = '#d7e7ff';
    ctx2d.font = '16px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText('No terrain data', canvas.width / 2, canvas.height / 2 - 10);
    ctx2d.font = '12px sans-serif';
    ctx2d.fillStyle = '#90a4c8';
    ctx2d.fillText('请先生成地形，然后再打开大地图。', canvas.width / 2, canvas.height / 2 + 14);
    if (ui.terrainMapSummary) ui.terrainMapSummary.textContent = 'Terrain Map：暂无数据。请先生成地形。';
    if (ui.terrainMapLegend) ui.terrainMapLegend.innerHTML = '<div class="terrainMapLegendMeta">暂无可显示的图例。</div>';
    if (ui.terrainMapInlineSummary) ui.terrainMapInlineSummary.textContent = (ui.terrainMapWindow && ui.terrainMapWindow.hidden === false) ? 'Terrain Map：已打开，但当前没有地形数据。' : 'Terrain Map：尚未打开。';
    return { ok: true, empty: true, source: String(source || 'terrain-map:render-empty') };
  }
  var maxCanvasSize = 520;
  var maxDim = Math.max(width, height);
  var cellSize = Math.max(3, Math.floor(maxCanvasSize / Math.max(1, maxDim)));
  if (maxDim <= 24) cellSize = Math.max(cellSize, 18);
  else if (maxDim <= 48) cellSize = Math.max(cellSize, 10);
  canvas.width = Math.max(1, width * cellSize);
  canvas.height = Math.max(1, height * cellSize);
  ctx2d.imageSmoothingEnabled = false;
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  for (var x = 0; x < width; x++) {
    var col = Array.isArray(heightMap[x]) ? heightMap[x] : [];
    for (var y = 0; y < height; y++) {
      var h = Number(col[y]) || 0;
      ctx2d.fillStyle = mode === 'biome' ? uiResolveTerrainBiomeColor(h, x, y, runtime) : uiResolveTerrainHeightColor(h, runtime);
      ctx2d.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      if (cellSize >= 8) {
        ctx2d.strokeStyle = 'rgba(8,12,20,.22)';
        ctx2d.strokeRect(x * cellSize + 0.5, y * cellSize + 0.5, cellSize - 1, cellSize - 1);
      }
    }
  }
  var summary = runtime.lastSummary || {};
  if (ui.terrainMapSummary) {
    ui.terrainMapSummary.textContent = 'Terrain Map：batch=' + String(summary.terrainBatchId || '-') + ' · size=' + width + '×' + height + ' · min/max=' + String(summary.minHeightObserved != null ? summary.minHeightObserved : '?') + '/' + String(summary.maxHeightObserved != null ? summary.maxHeightObserved : '?') + ' · mode=' + mode;
  }
  if (ui.terrainMapInlineSummary) {
    ui.terrainMapInlineSummary.textContent = 'Terrain Map：' + ((ui.terrainMapWindow && ui.terrainMapWindow.hidden === false) ? '已打开' : '未打开') + ' · size=' + width + '×' + height + ' · mode=' + mode;
  }
  uiBuildTerrainMapLegend(mode, runtime);
  return { ok: true, width: width, height: height, cellSize: cellSize, mode: mode, source: String(source || 'terrain-map:render') };
}

function uiRefreshMainTerrainPanel(source) {
  var settings = uiGetMainTerrainSettings(source || 'terrain-panel:refresh') || null;
  if (!settings) return null;
  uiApplyMainTerrainSettingsToForm(settings);
  if (ui.terrainSummary) {
    var summary = settings.lastSummary || null;
    ui.terrainSummary.textContent = summary
      ? ('Terrain：algorithm=' + String(settings.terrainAlgorithm || 'profile_fbm') + ' · batch=' + String(summary.terrainBatchId || '-') + ' · cells=' + String(summary.generatedCellCount || 0) + ' · voxels=' + String(summary.generatedVoxelCount || 0) + (summary.appliedVoxelCount != null ? (' · applied=' + String(summary.appliedVoxelCount || 0)) : '') + ' · min/max=' + String(summary.minHeightObserved || 0) + '/' + String(summary.maxHeightObserved || 0) + ((settings.terrainDebugFaceColorsEnabled === true) ? ' · debug-colors=on' : '') + ' · buildColor=' + String(settings.terrainBuildColorMode || 'natural') + ' · lightingBypass=' + String(settings.terrainBuildLightingBypass === true) + ' · detailedLog=' + String(settings.terrainDetailedProfilingEnabled === true))
      : 'Terrain：尚未生成。';
  }
  if (ui.terrainDetails) {
    try { ui.terrainDetails.textContent = JSON.stringify(settings, null, 2); } catch (_) { ui.terrainDetails.textContent = String(settings); }
  }
  uiSyncTerrainMapColorMode(source || 'terrain-panel:refresh');
  if (ui.terrainMapWindow && ui.terrainMapWindow.hidden === false) uiRenderTerrainMapWindow((source || 'terrain-panel:refresh') + ':terrain-map');
  return settings;
}


function uiHandleTerrainDebugFaceColorsToggle(source) {

  var controller = getUiMainController();
  var payload = {
    terrainDebugFaceColorsEnabled: !!(ui.terrainDebugFaceColorsEnabled && ui.terrainDebugFaceColorsEnabled.checked),
    terrainColorMode: (ui.terrainDebugFaceColorsEnabled && ui.terrainDebugFaceColorsEnabled.checked) ? 'debug-semantic' : 'natural'
  };
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorTerrainSettings', [payload, source || 'terrain-panel:debug-face-colors']);
  var result = dispatched || (controller && typeof controller.setMainEditorTerrainSettings === 'function' ? controller.setMainEditorTerrainSettings(payload, source || 'terrain-panel:debug-face-colors') : null);
  uiRefreshMainTerrainPanel(source);
  if (typeof refreshInspectorPanels === 'function') { try { refreshInspectorPanels(); } catch (_) {} }
  if (typeof updatePreview === 'function') { try { updatePreview(); } catch (_) {} }
  return result;
}

function uiHandleTerrainBuildColorModeChange(source) {
  var controller = getUiMainController();
  var payload = {
    terrainBuildColorMode: String(ui.terrainBuildColorMode && ui.terrainBuildColorMode.value || 'natural'),
    terrainBuildLightingBypass: !!(ui.terrainBuildLightingBypass && ui.terrainBuildLightingBypass.checked)
  };
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorTerrainSettings', [payload, source || 'terrain-panel:build-color-mode']);
  var result = dispatched || (controller && typeof controller.setMainEditorTerrainSettings === 'function' ? controller.setMainEditorTerrainSettings(payload, source || 'terrain-panel:build-color-mode') : null);
  uiRefreshMainTerrainPanel(source);
  return result;
}

function uiHandleTerrainBuildLightingBypassToggle(source) {
  return uiHandleTerrainBuildColorModeChange(source || 'terrain-panel:build-lighting-bypass');
}
function uiHandleTerrainDetailedProfilingToggle(source) {
  var controller = getUiMainController();
  var payload = {
    terrainDetailedProfilingEnabled: !!(ui.terrainDetailedProfilingEnabled && ui.terrainDetailedProfilingEnabled.checked)
  };
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorTerrainSettings', [payload, source || 'terrain-panel:detailed-terrain-profiling']);
  var result = dispatched || (controller && typeof controller.setMainEditorTerrainSettings === 'function' ? controller.setMainEditorTerrainSettings(payload, source || 'terrain-panel:detailed-terrain-profiling') : null);
  uiRefreshMainTerrainPanel(source);
  return result;
}


function uiHandleTerrainGenerate(source) {
  var controller = getUiMainController();
  var settings = uiReadMainTerrainFormValues();
  var dispatchedSet = uiDispatchControllerCommand('main', 'setMainEditorTerrainSettings', [settings, source || 'terrain-panel:generate:set']);
  if (!dispatchedSet && controller && typeof controller.setMainEditorTerrainSettings === 'function') controller.setMainEditorTerrainSettings(settings, source || 'terrain-panel:generate:set');
  var dispatched = uiDispatchControllerCommand('main', 'generateMainEditorTerrain', [source || 'terrain-panel:generate']);
  var result = dispatched || (controller && typeof controller.generateMainEditorTerrain === 'function' ? controller.generateMainEditorTerrain(source || 'terrain-panel:generate') : null);
  uiRefreshMainTerrainPanel(source);
  return result;
}

function uiHandleTerrainClear(source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'clearMainEditorTerrain', [source || 'terrain-panel:clear']);
  var result = dispatched || (controller && typeof controller.clearMainEditorTerrain === 'function' ? controller.clearMainEditorTerrain(source || 'terrain-panel:clear') : null);
  uiRefreshMainTerrainPanel(source);
  return result;
}

function uiHandleTerrainReset(source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'resetMainEditorTerrainSettings', [source || 'terrain-panel:reset']);
  var result = dispatched || (controller && typeof controller.resetMainEditorTerrainSettings === 'function' ? controller.resetMainEditorTerrainSettings(source || 'terrain-panel:reset') : null);
  uiRefreshMainTerrainPanel(source);
  return result;
}

safeListen(ui.applyWorld, 'click', applyWorldToNewScene);
safeListen(ui.modeView, 'click', () => uiHandleModeButton('view', 'ui.modeView.click'));
safeListen(ui.modePlace, 'click', () => uiHandleModeButton('place', 'ui.modePlace.click'));
safeListen(ui.modeDelete, 'click', () => uiHandleModeButton('delete', 'ui.modeDelete.click'));
safeListen(ui.mainViewRotateLeft, 'click', () => uiHandleMainViewRotate(-1, 'camera-panel:rotate-left'));
safeListen(ui.mainViewRotateRight, 'click', () => uiHandleMainViewRotate(1, 'camera-panel:rotate-right'));
safeListen(ui.mainCameraResetView, 'click', () => uiHandleMainCameraReset('camera-panel:reset-view'));
safeListen(ui.mainCameraAnimationEnabled, 'change', () => uiHandleMainCameraSetAnimationEnabled(!!(ui.mainCameraAnimationEnabled && ui.mainCameraAnimationEnabled.checked), 'camera-panel:animation-enabled'));
safeListen(ui.mainCameraAnimationMs, 'change', () => uiHandleMainCameraSetAnimationMs(Number(ui.mainCameraAnimationMs && ui.mainCameraAnimationMs.value || 0), 'camera-panel:animation-ms'));
safeListen(ui.mainCameraInterpolationEnabled, 'change', () => uiHandleMainCameraSetInterpolationEnabled(!!(ui.mainCameraInterpolationEnabled && ui.mainCameraInterpolationEnabled.checked), 'camera-panel:interpolation-enabled'));
safeListen(ui.mainCameraInterpolationMode, 'change', () => uiHandleMainCameraSetInterpolationMode(String(ui.mainCameraInterpolationMode && ui.mainCameraInterpolationMode.value || 'easeInOut'), 'camera-panel:interpolation-mode'));
safeListen(ui.mainCameraZoom, 'change', () => uiHandleMainCameraSetZoom(Number(ui.mainCameraZoom && ui.mainCameraZoom.value || 1), 'camera-panel:zoom'));
safeListen(ui.mainCameraMinZoom, 'change', () => uiHandleMainCameraSetZoomBounds(Number(ui.mainCameraMinZoom && ui.mainCameraMinZoom.value || 0.5), Number(ui.mainCameraMaxZoom && ui.mainCameraMaxZoom.value || 2), 'camera-panel:min-zoom'));
safeListen(ui.mainCameraMaxZoom, 'change', () => uiHandleMainCameraSetZoomBounds(Number(ui.mainCameraMinZoom && ui.mainCameraMinZoom.value || 0.5), Number(ui.mainCameraMaxZoom && ui.mainCameraMaxZoom.value || 2), 'camera-panel:max-zoom'));
safeListen(ui.mainCameraCullingEnabled, 'change', () => uiHandleMainCameraSetCullingEnabled(!!(ui.mainCameraCullingEnabled && ui.mainCameraCullingEnabled.checked), 'camera-panel:culling-enabled'));
safeListen(ui.mainCameraCullingMargin, 'change', () => uiHandleMainCameraSetCullingMargin(Number(ui.mainCameraCullingMargin && ui.mainCameraCullingMargin.value || 0), 'camera-panel:culling-margin'));
safeListen(ui.mainCameraShowBounds, 'change', () => uiHandleMainCameraSetShowBounds(!!(ui.mainCameraShowBounds && ui.mainCameraShowBounds.checked), 'camera-panel:show-bounds'));
safeListen(ui.mainCameraShowCullingBounds, 'change', () => uiHandleMainCameraSetShowCullingBounds(!!(ui.mainCameraShowCullingBounds && ui.mainCameraShowCullingBounds.checked), 'camera-panel:show-culling-bounds'));
safeListen(ui.mainCameraSurfaceOnlyRenderingEnabled, 'change', () => uiHandleMainCameraSetSurfaceOnlyRenderingEnabled(!!(ui.mainCameraSurfaceOnlyRenderingEnabled && ui.mainCameraSurfaceOnlyRenderingEnabled.checked), 'camera-panel:surface-only-rendering'));
safeListen(ui.mainCameraDebugVisibleSurfaces, 'change', () => uiHandleMainCameraSetDebugVisibleSurfaces(!!(ui.mainCameraDebugVisibleSurfaces && ui.mainCameraDebugVisibleSurfaces.checked), 'camera-panel:debug-visible-surfaces'));
safeListen(ui.downloadMainViewRotationDiagnostic, 'click', () => uiHandleMainViewRotationDiagnosticExport('camera-panel:download-diagnostic'));
safeListen(ui.renderFaceMergeEnabled, 'click', () => uiHandleRenderSetFaceMergeEnabled(!!(ui.renderFaceMergeEnabled && ui.renderFaceMergeEnabled.checked), 'render-panel:face-merge-enabled:click'));
safeListen(ui.renderFaceMergeEnabled, 'change', () => uiHandleRenderSetFaceMergeEnabled(!!(ui.renderFaceMergeEnabled && ui.renderFaceMergeEnabled.checked), 'render-panel:face-merge-enabled'));
safeListen(ui.renderDisableFaceMergeAtZoomEnabled, 'click', () => uiHandleRenderSetZoomDisableEnabled(!!(ui.renderDisableFaceMergeAtZoomEnabled && ui.renderDisableFaceMergeAtZoomEnabled.checked), 'render-panel:zoom-disable-enabled:click'));
safeListen(ui.renderDisableFaceMergeAtZoomEnabled, 'change', () => uiHandleRenderSetZoomDisableEnabled(!!(ui.renderDisableFaceMergeAtZoomEnabled && ui.renderDisableFaceMergeAtZoomEnabled.checked), 'render-panel:zoom-disable-enabled'));
safeListen(ui.renderDisableFaceMergeAtZoomThreshold, 'input', () => uiHandleRenderSetZoomDisableThreshold(Number(ui.renderDisableFaceMergeAtZoomThreshold && ui.renderDisableFaceMergeAtZoomThreshold.value || 1.6), 'render-panel:zoom-disable-threshold:input'));
safeListen(ui.renderDisableFaceMergeAtZoomThreshold, 'change', () => uiHandleRenderSetZoomDisableThreshold(Number(ui.renderDisableFaceMergeAtZoomThreshold && ui.renderDisableFaceMergeAtZoomThreshold.value || 1.6), 'render-panel:zoom-disable-threshold'));

safeListen(ui.terrainAlgorithm, 'change', () => uiHandleTerrainAlgorithmChange('terrain-panel:algorithm-change'));
if (typeof document !== 'undefined' && document.querySelectorAll) {
  Array.prototype.forEach.call(document.querySelectorAll('[data-terrain-param-toggle]'), function (button) {
    safeListen(button, 'click', function () {
      uiHandleTerrainParamGroupToggle(button, 'terrain-panel:param-group-toggle');
    });
  });
}
safeListen(ui.terrainGenerate, 'click', () => uiHandleTerrainGenerate('terrain-panel:generate'));
safeListen(ui.terrainClear, 'click', () => uiHandleTerrainClear('terrain-panel:clear'));
safeListen(ui.terrainResetParams, 'click', () => uiHandleTerrainReset('terrain-panel:reset'));
safeListen(ui.terrainMapToggle, 'click', () => uiHandleTerrainMapToggle('terrain-panel:map-toggle'));
safeListen(ui.terrainMapRefresh, 'click', () => uiRenderTerrainMapWindow('terrain-panel:map-refresh'));
safeListen(ui.terrainMapClose, 'click', () => uiHandleTerrainMapClose('terrain-panel:map-close'));
safeListen(ui.terrainMapWindowRefresh, 'click', () => uiRenderTerrainMapWindow('terrain-panel:map-window-refresh'));
safeListen(ui.terrainMapColorMode, 'change', () => { uiSyncTerrainMapColorMode('terrain-panel:map-color-mode'); uiRenderTerrainMapWindow('terrain-panel:map-color-mode'); });
safeListen(ui.terrainMapWindowColorMode, 'change', () => { uiSyncTerrainMapColorMode('terrain-panel:map-window-color-mode'); uiRenderTerrainMapWindow('terrain-panel:map-window-color-mode'); });
safeListen(ui.terrainBuildColorMode, 'change', () => uiHandleTerrainBuildColorModeChange('terrain-panel:build-color-mode'));
safeListen(ui.terrainBuildLightingBypass, 'change', () => uiHandleTerrainBuildLightingBypassToggle('terrain-panel:build-lighting-bypass'));
safeListen(ui.terrainDetailedProfilingEnabled, 'change', () => uiHandleTerrainDetailedProfilingToggle('terrain-panel:detailed-terrain-profiling'));
safeListen(ui.terrainDebugFaceColorsEnabled, 'change', () => { uiHandleTerrainDebugFaceColorsToggle('terrain-panel:debug-face-colors-toggle'); });

safeListen(ui.previewRotateLeft, 'click', () => uiHandlePreviewFacingRotate(-1, 'ui.previewRotateLeft.click'));
safeListen(ui.previewRotateRight, 'click', () => uiHandlePreviewFacingRotate(1, 'ui.previewRotateRight.click'));
safeListen(ui.previewFacing0, 'click', () => uiHandlePreviewFacingSet(0, 'ui.previewFacing0.click'));
safeListen(ui.previewFacing1, 'click', () => uiHandlePreviewFacingSet(1, 'ui.previewFacing1.click'));
safeListen(ui.previewFacing2, 'click', () => uiHandlePreviewFacingSet(2, 'ui.previewFacing2.click'));
safeListen(ui.previewFacing3, 'click', () => uiHandlePreviewFacingSet(3, 'ui.previewFacing3.click'));
safeListen(ui.selectedRotateLeft, 'click', () => uiHandleSelectedFacingRotate(-1, 'ui.selectedRotateLeft.click'));
safeListen(ui.selectedRotateRight, 'click', () => uiHandleSelectedFacingRotate(1, 'ui.selectedRotateRight.click'));
safeListen(ui.showItemFacingDebug, 'change', () => { if (typeof refreshInspectorPanels === 'function') refreshInspectorPanels(); });
safeListen(ui.prefabSelect, 'change', () => {
  var placementController = getUiPlacementController();
  var registryApi = (window.App && window.App.state && window.App.state.prefabRegistry) ? window.App.state.prefabRegistry : null;
  var nextIndex = clamp(parseInt(ui.prefabSelect.value || '0', 10), 0, prototypes.length - 1);
  var dispatched = uiDispatchControllerCommand('placement', 'applyPlacementIntent', [{ prefabIndex: nextIndex, source: 'ui.prefabSelect.change', mode: 'place', forcePreview: true, syncUi: true }]);
  if (dispatched) dispatched;
  else if (placementController && typeof placementController.applyPlacementIntent === 'function') placementController.applyPlacementIntent({ prefabIndex: nextIndex, source: 'ui.prefabSelect.change', mode: 'place', forcePreview: true, syncUi: true });
  else if (placementController && typeof placementController.handlePrefabSelectChange === 'function') {
    placementController.handlePrefabSelectChange(nextIndex, 'ui.prefabSelect.change');
    placementController.syncPlacementUi({ source: 'ui.prefabSelect.change', forcePreview: true });
  }
  else if (placementController && typeof placementController.selectPrefabByIndex === 'function') placementController.selectPrefabByIndex(nextIndex, 'ui.prefabSelect.change');
  else if (registryApi && typeof registryApi.setSelectedPrototypeIndex === 'function') registryApi.setSelectedPrototypeIndex(nextIndex, { source: 'ui.prefabSelect.change' });
  else editor.prototypeIndex = nextIndex;
  var proto = currentProto();
  if (ui.prefabHint) ui.prefabHint.textContent = `当前模板：${proto.name}，局部体素 ${proto.voxels.length} 个，尺寸 ${proto.w}×${proto.d}×${proto.h}。`;
  if (!(placementController && typeof placementController.applyPlacementIntent === 'function')) {
    if (placementController && typeof placementController.syncPlacementUi === 'function') placementController.syncPlacementUi({ source: 'ui.prefabSelect.change', forcePreview: true });
    else {
      if (editor.mode !== 'delete' && !(placementController && typeof placementController.handlePrefabSelectChange === 'function')) { var placementController2 = getUiPlacementController(); if (placementController2 && typeof placementController2.requestModeChange === 'function') placementController2.requestModeChange('place', { source: 'ui.prefabSelect.change' }); else requestEditorModeChange('place', { source: 'ui.prefabSelect.change' }); }
      updatePreview();
    }
  }
  pushLog(`ui: prefab -> ${proto.name} voxels=${proto.voxels.length}`);
});

safeListen(ui.openEditor, 'click', () => {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'handleOpenEditorButton', [{ source: 'ui.openEditor.click' }]);
  if (dispatched) return dispatched;
  if (controller && typeof controller.handleOpenEditorButton === 'function') return controller.handleOpenEditorButton({ source: 'ui.openEditor.click' });
  if (controller && typeof controller.openEditorFromMain === 'function') return controller.openEditorFromMain({ source: 'ui.openEditor.click' });
  try {
    var replayCtx = (typeof window !== 'undefined') ? window.__ACCEPTANCE_REPLAY_CONTEXT__ : null;
    var href = replayCtx && replayCtx.active && replayCtx.openEditorHref ? String(replayCtx.openEditorHref) : `START_V18_ONLY.html?fromMain=1&t=${Date.now()}`;
    emitP1bUi('BOUNDARY', 'open-editor-from-main', { href: href, selectedPrefabId: (typeof currentProto === 'function' && currentProto()) ? currentProto().id : null, prototypeCount: Array.isArray(prototypes) ? prototypes.length : null });
    window.location.href = href;
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

safeListen(ui.rescanAssetPrefabs, 'click', async () => {
  try {
    await uiRunAssetScan(true, 'ui:rescan-asset-prefabs');
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
    const imported = importPrefabDefinition(parsed, { persist: true, source: `file:${file.name}`, sourceKind: 'custom' });
    if (imported) {
      prepareImportedPrefabForPlacement(imported, {
        source: 'ui-prefab-file:' + file.name,
        refreshSource: 'asset-import:ui-prefab-file',
      });
      if (ui.prefabHint) ui.prefabHint.textContent = `已导入：${imported.name}，局部体素 ${imported.voxels.length} 个，尺寸 ${imported.w}×${imported.d}×${imported.h}。`;
      refreshAssetScanStatus();
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
safeListen(ui.showFaceDebugOverlay, 'change', () => showFaceDebugOverlay = !!(ui.showFaceDebugOverlay && ui.showFaceDebugOverlay.checked));
safeListen(ui.showFrontLines, 'change', () => showFrontLines = ui.showFrontLines.checked);
ui.verboseLog.checked = false;
verboseLog = false;
safeListen(ui.verboseLog, 'change', () => {
  verboseLog = ui.verboseLog.checked;
  pushLog(`ui: verboseLog=${verboseLog}`);
});
if (ui.shadowDebugDetailed) ui.shadowDebugDetailed.checked = false;
if (typeof shadowDebugDetailed !== 'undefined') shadowDebugDetailed = false;
safeListen(ui.shadowDebugDetailed, 'change', () => {
  shadowDebugDetailed = !!(ui.shadowDebugDetailed && ui.shadowDebugDetailed.checked);
  pushLog(`ui: shadowDebugDetailed=${shadowDebugDetailed}`);
});
safeListen(ui.clearLog, 'click', () => { if (typeof clearLogs === 'function') clearLogs(); else { logs.length = 0; logSeq = 0; logFlushScheduled = false; lastLogUiFlushAt = 0; if (ui.debugLog) ui.debugLog.value = ''; } });
safeListen(ui.downloadLog, 'click', exportLogs);
safeListen(ui.runSelfCheck, 'click', async () => {
  try {
    var selfCheckApi = window.App && window.App.debug ? window.App.debug.selfCheck || null : null;
    if (!selfCheckApi || typeof selfCheckApi.runSelfCheck !== 'function') throw new Error('missing-self-check-api');
    if (ui.selfCheckStatus) ui.selfCheckStatus.textContent = '自检：正在运行，请稍候……';
    await selfCheckApi.runSelfCheck({ saveToServer: true, download: false });
  } catch (err) {
    if (ui.selfCheckStatus) ui.selfCheckStatus.textContent = '自检失败：' + (err && err.message ? err.message : err);
    pushLog('self-check:error ' + (err && err.message ? err.message : err));
  }
});
safeListen(ui.downloadSelfCheckReport, 'click', () => {
  try {
    var selfCheckApi = window.App && window.App.debug ? window.App.debug.selfCheck || null : null;
    if (!selfCheckApi || typeof selfCheckApi.downloadLastReport !== 'function' || !selfCheckApi.downloadLastReport()) {
      if (ui.selfCheckStatus) ui.selfCheckStatus.textContent = '自检：当前没有最近报告，请先运行一次。';
    }
  } catch (err) {
    if (ui.selfCheckStatus) ui.selfCheckStatus.textContent = '下载自检报告失败：' + (err && err.message ? err.message : err);
  }
});
safeListen(ui.downloadHabboDebug, 'click', exportHabboDebug);
safeListen(ui.showHabboDebugOverlay, 'change', () => { pushLog('ui: showHabboDebugOverlay=' + (!!ui.showHabboDebugOverlay.checked)); });
safeListen(ui.dumpScene, 'click', () => exportSceneJsonDownload());
safeListen(ui.dumpCandidate, 'click', () => pushLog(`candidate-json: ${JSON.stringify(editor.preview || null)}`));
safeListen(ui.applyPlayerSettings, 'click', applySettings);
safeListen(ui.resetPlayerButton, 'click', () => { resetPlayer(); refreshInspectorPanels(); pushLog('ui: reset player'); });
safeListen(ui.saveScene, 'click', async () => { var dispatched = uiDispatchControllerCommand('scene', 'saveLocalScene', ['ui-save-local']); if (dispatched) await dispatched; else { var c = getUiSceneController(); if (c && typeof c.saveLocalScene === 'function') await c.saveLocalScene('ui-save-local'); else await uiSaveSceneTarget({ target: 'local', source: 'ui-save-local' }); } });
safeListen(ui.loadScene, 'click', async () => { var dispatched = uiDispatchControllerCommand('scene', 'loadLocalScene', ['ui-load-local']); if (dispatched) await dispatched; else { var c = getUiSceneController(); if (c && typeof c.loadLocalScene === 'function') await c.loadLocalScene('ui-load-local'); else await uiLoadSceneTarget({ target: 'local', source: 'ui-load-local' }); } });
safeListen(ui.saveSceneFile, 'click', async () => {
  var seed = (typeof recallCurrentSceneServerFileName === 'function' && recallCurrentSceneServerFileName()) || 'scene.json';
  var filename = window.prompt('请输入场景文件名（会保存到项目 assets/scenes 中，并作为下次默认打开文件）', suggestSceneFilename(seed));
  if (filename == null) return;
  filename = suggestSceneFilename(filename);
  var c = getUiSceneController();
  if (c && typeof c.saveSceneFile === 'function') await c.saveSceneFile(filename, 'ui-save-file');
  else await uiSaveSceneTarget({ target: 'server-file', source: 'ui-save-file', filename: filename, setDefault: true });
});
safeListen(ui.openDefaultSceneFile, 'click', async () => { var c = getUiSceneController(); if (c && typeof c.openDefaultScene === 'function') await c.openDefaultScene('ui-open-default'); else await uiLoadSceneTarget({ target: 'default', source: 'ui-open-default' }); });
safeListen(ui.importSceneFile, 'click', () => { if (ui.sceneImportFileInput) ui.sceneImportFileInput.click(); });
safeListen(ui.sceneImportFileInput, 'change', async () => {
  var file = ui.sceneImportFileInput && ui.sceneImportFileInput.files && ui.sceneImportFileInput.files[0];
  if (!file) return;
  var c = getUiSceneController();
  if (c && typeof c.importSceneFile === 'function') await c.importSceneFile(file, 'ui-import-file');
  else await uiLoadSceneTarget({ target: 'import-file', source: 'ui-import-file', file: file, setDefault: true });
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
});
safeListen(ui.shadowAlpha, 'change', () => {
  pushLog(`ui: shadowAlpha=${lightState.shadowAlpha.toFixed(2)}`);
});
safeListen(ui.shadowOpacity, 'input', () => {
  lightState.shadowOpacityScale = Number(ui.shadowOpacity.value);
  setElText(ui.shadowOpacityValue, `${lightState.shadowOpacityScale.toFixed(2)}×`);
});
safeListen(ui.shadowOpacity, 'change', () => {
  pushLog(`ui: shadowOpacityScale=${lightState.shadowOpacityScale.toFixed(2)}`);
});
safeListen(ui.shadowDistanceFadeEnabled, 'change', () => {
  lightState.shadowDistanceFadeEnabled = !!ui.shadowDistanceFadeEnabled.checked;
  pushLog(`ui: shadowDistanceFadeEnabled=${lightState.shadowDistanceFadeEnabled}`);
});
safeListen(ui.shadowDistanceFadeRate, 'input', () => {
  lightState.shadowDistanceFadeRate = Number(ui.shadowDistanceFadeRate.value);
  setElText(ui.shadowDistanceFadeRateValue, `${lightState.shadowDistanceFadeRate.toFixed(2)}`);
});
safeListen(ui.shadowDistanceFadeRate, 'change', () => {
  pushLog(`ui: shadowDistanceFadeRate=${lightState.shadowDistanceFadeRate.toFixed(2)}`);
});
safeListen(ui.shadowDistanceFadeMin, 'input', () => {
  lightState.shadowDistanceFadeMin = Number(ui.shadowDistanceFadeMin.value);
  setElText(ui.shadowDistanceFadeMinValue, `${lightState.shadowDistanceFadeMin.toFixed(2)}`);
});
safeListen(ui.shadowDistanceFadeMin, 'change', () => {
  pushLog(`ui: shadowDistanceFadeMin=${lightState.shadowDistanceFadeMin.toFixed(2)}`);
});
safeListen(ui.shadowEdgeFadeEnabled, 'change', () => {
  lightState.shadowEdgeFadeEnabled = !!ui.shadowEdgeFadeEnabled.checked;
  pushLog(`ui: shadowEdgeFadeEnabled=${lightState.shadowEdgeFadeEnabled}`);
});
safeListen(ui.shadowEdgeFadePx, 'input', () => {
  lightState.shadowEdgeFadePx = Number(ui.shadowEdgeFadePx.value);
  setElText(ui.shadowEdgeFadePxValue, `${lightState.shadowEdgeFadePx.toFixed(1)} px`);
});
safeListen(ui.shadowEdgeFadePx, 'change', () => {
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

if (typeof refreshItemFacingStatusOnly === 'function') refreshItemFacingStatusOnly();
uiRefreshMainCameraPanel('ui:init');
window.__UI_RENDER_CONTROLS_API__ = {
  refresh: uiRefreshRenderPanel,
  getOverrides: uiGetRenderControlOverrides,
  setFaceMergeEnabled: uiHandleRenderSetFaceMergeEnabled,
  setZoomDisableEnabled: uiHandleRenderSetZoomDisableEnabled,
  setZoomDisableThreshold: uiHandleRenderSetZoomDisableThreshold
};

uiRefreshRenderPanel('ui:init');
uiRefreshMainTerrainPanel('ui:init');
