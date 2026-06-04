// ui.js
// Step-05: tabs / inspectors / Habbo library 已迁移到独立模块。
// 当前文件保留 world settings、Habbo 导入按钮与其余 UI 绑定。
// v1 split file generated from original monolithic app.js
// 注意：此文件为保持行为稳定的第一刀拆分，允许存在少量跨层函数。

// P9e: UI boundary/service/controller accessors moved to src/presentation/ui/ui-boundary.js.

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

function getUiCameraRenderPanelService() {
  try {
    if (typeof window !== 'undefined' && window.__UI_CAMERA_RENDER_PANEL__) return window.__UI_CAMERA_RENDER_PANEL__;
  } catch (_) {}
  return null;
}

function createUiCameraRenderPanelDeps() {
  return {
    getUi: function () { return ui; },
    getGlobal: function () { return (typeof window !== 'undefined') ? window : globalThis; },
    getInspectorState: function () { return inspectorState; },
    getUiMainController: getUiMainController,
    uiDispatchControllerCommand: uiDispatchControllerCommand,
  };
}
function uiGetMainCameraSettings(source) {
  var service = getUiCameraRenderPanelService();
  if (service && typeof service.uiGetMainCameraSettings === 'function') return service.uiGetMainCameraSettings(source, createUiCameraRenderPanelDeps());
  return null;
}


function uiRefreshMainCameraPanel(source) {
  var service = getUiCameraRenderPanelService();
  if (service && typeof service.uiRefreshMainCameraPanel === 'function') return service.uiRefreshMainCameraPanel(source, createUiCameraRenderPanelDeps());
  return null;
}


function uiLockRenderControlsInteraction(ms) {
  var service = getUiCameraRenderPanelService();
  if (service && typeof service.uiLockRenderControlsInteraction === 'function') return service.uiLockRenderControlsInteraction(ms, createUiCameraRenderPanelDeps());
}


function uiIsRenderControlsInteractionLocked() {
  var service = getUiCameraRenderPanelService();
  if (service && typeof service.uiIsRenderControlsInteractionLocked === 'function') return service.uiIsRenderControlsInteractionLocked(createUiCameraRenderPanelDeps());
  return false;
}


function uiGetRenderControlOverrides() {
  var service = getUiCameraRenderPanelService();
  if (service && typeof service.uiGetRenderControlOverrides === 'function') return service.uiGetRenderControlOverrides(createUiCameraRenderPanelDeps());
  return null;
}


function uiSetRenderControlOverrides(patch) {
  var service = getUiCameraRenderPanelService();
  if (service && typeof service.uiSetRenderControlOverrides === 'function') return service.uiSetRenderControlOverrides(patch, createUiCameraRenderPanelDeps());
  return null;
}


function uiBuildEffectiveRenderSettings(settings) {
  var service = getUiCameraRenderPanelService();
  if (service && typeof service.uiBuildEffectiveRenderSettings === 'function') return service.uiBuildEffectiveRenderSettings(settings, createUiCameraRenderPanelDeps());
  return Object.assign({}, settings && typeof settings === 'object' ? settings : {});
}


function uiRefreshRenderPanel(source) {
  var service = getUiCameraRenderPanelService();
  if (service && typeof service.uiRefreshRenderPanel === 'function') return service.uiRefreshRenderPanel(source, createUiCameraRenderPanelDeps());
  return null;
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

function uiHandleMainCameraSetSubTileGridEnabled(enabled, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorSubTileGridEnabled', [!!enabled, source || 'camera-panel:sub-tile-grid']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorSubTileGridEnabled === 'function') {
    var result = controller.setMainEditorSubTileGridEnabled(!!enabled, source || 'camera-panel:sub-tile-grid');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  try {
    if (window.App && window.App.state && window.App.state.runtimeState && typeof window.App.state.runtimeState.patchEditorCameraSettings === 'function') {
      var fallback = window.App.state.runtimeState.patchEditorCameraSettings({ subTileGridEnabled: !!enabled, subTileGridMode: 'diamond_quarters' }, { source: source || 'camera-panel:sub-tile-grid:fallback' });
      uiRefreshMainCameraPanel(source);
      return fallback;
    }
  } catch (_) {}
  return { ok: false, reason: 'missing-main-camera-sub-tile-grid-controller' };
}

function uiHandleMainCameraSetSubTileGridSubdivision(subdivision, source) {
  var nextSubdivision = Math.max(1, Math.min(64, Math.round(Number(subdivision) || 1)));
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorSubTileGridSubdivision', [nextSubdivision, source || 'camera-panel:sub-tile-grid-subdivision']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorSubTileGridSubdivision === 'function') {
    var result = controller.setMainEditorSubTileGridSubdivision(nextSubdivision, source || 'camera-panel:sub-tile-grid-subdivision');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  try {
    if (window.App && window.App.state && window.App.state.runtimeState && typeof window.App.state.runtimeState.patchEditorCameraSettings === 'function') {
      var fallback = window.App.state.runtimeState.patchEditorCameraSettings({ subTileGridSubdivision: nextSubdivision, subTileGridMode: 'diamond_quarters' }, { source: source || 'camera-panel:sub-tile-grid-subdivision:fallback' });
      uiRefreshMainCameraPanel(source);
      return fallback;
    }
  } catch (_) {}
  return { ok: false, reason: 'missing-main-camera-sub-tile-grid-subdivision-controller' };
}


function uiHandleTerrainMapSetDerivedAxisGridEnabled(enabled, source) {
  var controller = getUiMainController();
  var dispatched = uiDispatchControllerCommand('main', 'setMainEditorDerivedAxisGridEnabled', [!!enabled, source || 'terrain-map:derived-axis-grid']);
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorDerivedAxisGridEnabled === 'function') {
    var result = controller.setMainEditorDerivedAxisGridEnabled(!!enabled, source || 'terrain-map:derived-axis-grid');
    uiRefreshMainCameraPanel(source);
    return result;
  }
  try {
    if (window.App && window.App.state && window.App.state.runtimeState && typeof window.App.state.runtimeState.patchEditorCameraSettings === 'function') {
      var fallback = window.App.state.runtimeState.patchEditorCameraSettings({ derivedAxisGridEnabled: !!enabled, subTileGridEnabled: !!enabled, subTileGridMode: 'diamond_quarters' }, { source: source || 'terrain-map:derived-axis-grid:fallback' });
      uiRefreshMainCameraPanel(source);
      return fallback;
    }
  } catch (_) {}
  return { ok: false, reason: 'missing-derived-axis-grid-controller' };
}

function getUiTerrainPanelRefreshService() {
  try {
    if (typeof window !== 'undefined' && window.__UI_TERRAIN_PANEL_REFRESH__) return window.__UI_TERRAIN_PANEL_REFRESH__;
  } catch (_) {}
  return null;
}

function createUiTerrainPanelRefreshDeps() {
  return {
    getUi: function () { return ui; },
    getUiMainController: getUiMainController,
    uiDispatchControllerCommand: uiDispatchControllerCommand,
    uiSyncTerrainMapColorMode: uiSyncTerrainMapColorMode,
    uiRenderTerrainMapWindow: uiRenderTerrainMapWindow,
  };
}
function uiNormalizeTerrainAlgorithmValue(value) {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiNormalizeTerrainAlgorithmValue === 'function') return service.uiNormalizeTerrainAlgorithmValue(value, createUiTerrainPanelRefreshDeps());
  var raw = String(value == null ? '' : value).trim();
  return raw || 'profile_fbm';
}


function uiTerrainNumberSetting(settings, key, fallback) {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiTerrainNumberSetting === 'function') return service.uiTerrainNumberSetting(settings, key, fallback, createUiTerrainPanelRefreshDeps());
  if (!settings || !Object.prototype.hasOwnProperty.call(settings, key)) return fallback;
  var value = Number(settings[key]);
  return Number.isFinite(value) ? value : fallback;
}


function uiSetTerrainInputValue(el, value) {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiSetTerrainInputValue === 'function') return service.uiSetTerrainInputValue(el, value, createUiTerrainPanelRefreshDeps());
  if (el) el.value = String(value);
}


function uiSetTerrainSelectValue(el, value) {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiSetTerrainSelectValue === 'function') return service.uiSetTerrainSelectValue(el, value, createUiTerrainPanelRefreshDeps());
  if (el) el.value = String(value);
}


function uiSetTerrainAlgorithmPanelVisible(el, visible) {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiSetTerrainAlgorithmPanelVisible === 'function') return service.uiSetTerrainAlgorithmPanelVisible(el, visible, createUiTerrainPanelRefreshDeps());
  if (!el) return;
  try { el.hidden = !visible; } catch (_) {}
  el.style.display = visible ? '' : 'none';
}


function uiUpdateTerrainAlgorithmPanel(source) {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiUpdateTerrainAlgorithmPanel === 'function') return service.uiUpdateTerrainAlgorithmPanel(source, createUiTerrainPanelRefreshDeps());
  return { algorithm: uiNormalizeTerrainAlgorithmValue(ui.terrainAlgorithm && ui.terrainAlgorithm.value || 'profile_fbm'), source: String(source || 'terrain-panel:algorithm-panel') };
}


function uiHandleTerrainAlgorithmChange(source) {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiHandleTerrainAlgorithmChange === 'function') return service.uiHandleTerrainAlgorithmChange(source, createUiTerrainPanelRefreshDeps());
  return uiUpdateTerrainAlgorithmPanel(source || 'terrain-panel:algorithm-change');
}


function uiHandleTerrainParamGroupToggle(button, source) {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiHandleTerrainParamGroupToggle === 'function') return service.uiHandleTerrainParamGroupToggle(button, source, createUiTerrainPanelRefreshDeps());
  return { ok: false, reason: 'missing-terrain-panel-refresh-service' };
}


function uiReadTerrainProfileRows() {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiReadTerrainProfileRows === 'function') return service.uiReadTerrainProfileRows(createUiTerrainPanelRefreshDeps());
  return [];
}


function uiReadMainTerrainFormValues() {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiReadMainTerrainFormValues === 'function') return service.uiReadMainTerrainFormValues(createUiTerrainPanelRefreshDeps());
  return {};
}


function uiGetMainTerrainSettings(source) {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiGetMainTerrainSettings === 'function') return service.uiGetMainTerrainSettings(source, createUiTerrainPanelRefreshDeps());
  return null;
}


function uiApplyMainTerrainSettingsToForm(settings) {
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiApplyMainTerrainSettingsToForm === 'function') return service.uiApplyMainTerrainSettingsToForm(settings, createUiTerrainPanelRefreshDeps());
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
  var service = getUiTerrainPanelRefreshService();
  if (service && typeof service.uiRefreshMainTerrainPanel === 'function') return service.uiRefreshMainTerrainPanel(source, createUiTerrainPanelRefreshDeps());
  return null;
}



function uiSyncTerrainBoundaryDebugRedToggleFromStorage() {
  var enabled = false;
  try {
    if (typeof localStorage !== 'undefined') {
      var value = localStorage.getItem('terrainBoundaryDebugRed');
      enabled = value === '1' || value === 'true';
    }
  } catch (_) {}
  try {
    if (typeof window !== 'undefined') window.__TERRAIN_BOUNDARY_DEBUG_RED__ = enabled;
  } catch (_) {}
  if (ui.terrainBoundaryDebugRedEnabled) ui.terrainBoundaryDebugRedEnabled.checked = enabled;
  return enabled;
}

function uiHandleTerrainBoundaryDebugRedToggle(source) {
  var enabled = !!(ui.terrainBoundaryDebugRedEnabled && ui.terrainBoundaryDebugRedEnabled.checked);
  try { if (typeof window !== 'undefined') window.__TERRAIN_BOUNDARY_DEBUG_RED__ = enabled; } catch (_) {}
  try { if (typeof localStorage !== 'undefined') localStorage.setItem('terrainBoundaryDebugRed', enabled ? '1' : '0'); } catch (_) {}
  try {
    if (typeof pushLog === 'function') pushLog('terrain-boundary-debug-red=' + String(enabled) + ' source=' + String(source || 'terrain-panel'));
  } catch (_) {}
  try { if (typeof refreshInspectorPanels === 'function') refreshInspectorPanels(); } catch (_) {}
  try { if (typeof updatePreview === 'function') updatePreview(); } catch (_) {}
  return enabled;
}

uiSyncTerrainBoundaryDebugRedToggleFromStorage();

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

function getUiPlacementCoreApi() {
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
      var api = window.__APP_NAMESPACE.getPath('application.placementCore');
      if (api) return api;
    }
  } catch (_) {}
  try { return window.__PLACEMENT_CORE_API__ || null; } catch (_) { return null; }
}

function uiGetTerrainBlockPlacementShapeId() {
  try {
    if (ui && ui.terrainPlaceBlockShape && ui.terrainPlaceBlockShape.value) return String(ui.terrainPlaceBlockShape.value);
  } catch (_) {}
  return 'cube_1x1';
}

function uiHandleTerrainBlockPlacement(active, source) {
  var placementCore = getUiPlacementCoreApi();
  var result = null;
  if (placementCore && active && typeof placementCore.enterTerrainBlockPlacement === 'function') {
    result = placementCore.enterTerrainBlockPlacement({ source: source || 'ui.terrainPlaceBlock.click', prefabId: uiGetTerrainBlockPlacementShapeId() });
  } else if (placementCore && !active && typeof placementCore.exitTerrainBlockPlacement === 'function') {
    result = placementCore.exitTerrainBlockPlacement({ source: source || 'ui.terrainPlaceBlockOff.click' });
  } else {
    result = { ok: false, reason: 'missing-placement-core-terrain-block-api', active: !!active };
    if (typeof pushLog === 'function') pushLog('[manual-terrain-place] missing placement core terrain block API');
  }
  try { if (ui.terrainPlaceBlockStatus && result && result.message) ui.terrainPlaceBlockStatus.textContent = result.message; } catch (_) {}
  if (typeof updateModeButtons === 'function') updateModeButtons();
  if (typeof updatePreview === 'function') updatePreview();
  return result;
}


function uiHandleTerrainFaceMergeStressPreset(presetId, source) {
  var placementCore = getUiPlacementCoreApi();
  var result = null;
  if (placementCore && typeof placementCore.addManualTerrainFaceMergeStressPreset === 'function') {
    result = placementCore.addManualTerrainFaceMergeStressPreset(presetId, { source: source || 'ui.terrainFaceMergeStress.click' });
  } else {
    result = { ok: false, reason: 'missing-placement-core-face-merge-stress-api', presetId: String(presetId || '') };
    if (typeof pushLog === 'function') pushLog('[manual-terrain-face-merge-stress] missing placement core API');
  }
  try {
    if (ui.terrainPlaceBlockStatus && result) {
      ui.terrainPlaceBlockStatus.textContent = result.ok
        ? ('已生成 face-merge 地形测试：' + String(result.presetLabel || result.presetId || presetId) + '，数量=' + String(result.createdCount || 0))
        : ('生成 face-merge 地形测试失败：' + String(result.reason || 'unknown'));
    }
  } catch (_) {}
  if (typeof updatePreview === 'function') updatePreview();
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
safeListen(ui.mainCameraSubTileGridEnabled, 'change', () => uiHandleMainCameraSetSubTileGridEnabled(!!(ui.mainCameraSubTileGridEnabled && ui.mainCameraSubTileGridEnabled.checked), 'camera-panel:sub-tile-grid'));
safeListen(ui.mainCameraSubTileGridSubdivision, 'input', () => uiHandleMainCameraSetSubTileGridSubdivision(Number(ui.mainCameraSubTileGridSubdivision && ui.mainCameraSubTileGridSubdivision.value || 1), 'camera-panel:sub-tile-grid-subdivision:input'));
safeListen(ui.mainCameraSubTileGridSubdivision, 'change', () => uiHandleMainCameraSetSubTileGridSubdivision(Number(ui.mainCameraSubTileGridSubdivision && ui.mainCameraSubTileGridSubdivision.value || 1), 'camera-panel:sub-tile-grid-subdivision'));
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
safeListen(ui.terrainPlaceBlock, 'click', () => uiHandleTerrainBlockPlacement(true, 'ui.terrainPlaceBlock.click'));
safeListen(ui.terrainPlaceBlockShape, 'change', () => {
  var placementCore = getUiPlacementCoreApi();
  var active = false;
  try { active = !!(placementCore && typeof placementCore.isTerrainBlockPlacementActive === 'function' && placementCore.isTerrainBlockPlacementActive()); } catch (_) {}
  if (active) uiHandleTerrainBlockPlacement(true, 'ui.terrainPlaceBlockShape.change');
});
safeListen(ui.terrainPlaceBlockOff, 'click', () => uiHandleTerrainBlockPlacement(false, 'ui.terrainPlaceBlockOff.click'));
safeListen(ui.terrainAddFaceMergeColumnRow, 'click', () => uiHandleTerrainFaceMergeStressPreset('side_merged_column_row', 'ui.terrainAddFaceMergeColumnRow.click'));
safeListen(ui.terrainAddFaceMergeStepCluster, 'click', () => uiHandleTerrainFaceMergeStressPreset('step_adjacent_column_cluster', 'ui.terrainAddFaceMergeStepCluster.click'));
safeListen(ui.terrainAddFaceMergeColumnBlock, 'click', () => uiHandleTerrainFaceMergeStressPreset('side_merged_column_block', 'ui.terrainAddFaceMergeColumnBlock.click'));
safeListen(ui.terrainAddFaceMergeLWall, 'click', () => uiHandleTerrainFaceMergeStressPreset('l_shaped_column_wall', 'ui.terrainAddFaceMergeLWall.click'));
safeListen(ui.terrainMapToggle, 'click', () => uiHandleTerrainMapToggle('terrain-panel:map-toggle'));
safeListen(ui.terrainMapRefresh, 'click', () => uiRenderTerrainMapWindow('terrain-panel:map-refresh'));
safeListen(ui.terrainMapDerivedAxisGridEnabled, 'change', () => uiHandleTerrainMapSetDerivedAxisGridEnabled(!!(ui.terrainMapDerivedAxisGridEnabled && ui.terrainMapDerivedAxisGridEnabled.checked), 'terrain-map:derived-axis-grid'));
safeListen(ui.terrainMapClose, 'click', () => uiHandleTerrainMapClose('terrain-panel:map-close'));
safeListen(ui.terrainMapWindowRefresh, 'click', () => uiRenderTerrainMapWindow('terrain-panel:map-window-refresh'));
safeListen(ui.terrainMapColorMode, 'change', () => { uiSyncTerrainMapColorMode('terrain-panel:map-color-mode'); uiRenderTerrainMapWindow('terrain-panel:map-color-mode'); });
safeListen(ui.terrainMapWindowColorMode, 'change', () => { uiSyncTerrainMapColorMode('terrain-panel:map-window-color-mode'); uiRenderTerrainMapWindow('terrain-panel:map-window-color-mode'); });
safeListen(ui.terrainBuildColorMode, 'change', () => uiHandleTerrainBuildColorModeChange('terrain-panel:build-color-mode'));
safeListen(ui.terrainBuildLightingBypass, 'change', () => uiHandleTerrainBuildLightingBypassToggle('terrain-panel:build-lighting-bypass'));
safeListen(ui.terrainDetailedProfilingEnabled, 'change', () => uiHandleTerrainDetailedProfilingToggle('terrain-panel:detailed-terrain-profiling'));
safeListen(ui.terrainDebugFaceColorsEnabled, 'change', () => { uiHandleTerrainDebugFaceColorsToggle('terrain-panel:debug-face-colors-toggle'); });
safeListen(ui.terrainBoundaryDebugRedEnabled, 'change', () => { uiHandleTerrainBoundaryDebugRedToggle('terrain-panel:boundary-red-debug-toggle'); });

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
  var placementCoreForTerrainBlock = getUiPlacementCoreApi();
  if (placementCoreForTerrainBlock && typeof placementCoreForTerrainBlock.isTerrainBlockPlacementActive === 'function' && placementCoreForTerrainBlock.isTerrainBlockPlacementActive()) {
    placementCoreForTerrainBlock.exitTerrainBlockPlacement({ source: 'ui.prefabSelect.change' });
  }
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
var ACTOR_SORT_DIAG_FLAG_KEYS = [
  'debugConsoleToExport',
  'actorSortDiag',
  'terrainPlayerDiag',
  'terrainSortDiag',
  'renderOrderHeavyDiagnostics'
];

function readActorSortDiagStorageSnapshot() {
  var flags = {};
  var enabled = false;
  var allEnabled = true;
  try {
    ACTOR_SORT_DIAG_FLAG_KEYS.forEach(function (key) {
      var value = localStorage.getItem(key);
      flags[key] = value;
      var on = value === '1' || value === 'true';
      if (on) enabled = true;
      if (!on) allEnabled = false;
    });
  } catch (err) {
    flags.error = String(err && err.message || err || 'localStorage-error');
    allEnabled = false;
  }
  return { enabled: enabled, allEnabled: allEnabled, flags: flags };
}

function writeActorSortDiagStorageProfile(enabled) {
  var next = !!enabled;
  try {
    ACTOR_SORT_DIAG_FLAG_KEYS.forEach(function (key) {
      if (next) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
    });
  } catch (_) {}
  return readActorSortDiagStorageSnapshot();
}

function stringifyActorSortDiagFlags(flags) {
  try {
    return ACTOR_SORT_DIAG_FLAG_KEYS.map(function (key) {
      return key + '=' + String(flags && Object.prototype.hasOwnProperty.call(flags, key) ? flags[key] : null);
    }).join(', ');
  } catch (_) {
    return 'flags-unavailable';
  }
}

function updateActorSortDiagUiStatus(reason) {
  var snapshot = readActorSortDiagStorageSnapshot();
  if (ui.actorSortDiagEnabled) ui.actorSortDiagEnabled.checked = snapshot.enabled;
  if (ui.actorSortDiagStatus) {
    var status = snapshot.allEnabled ? '已开启' : (snapshot.enabled ? '部分开启' : '关闭');
    ui.actorSortDiagStatus.textContent = '排序诊断：' + status + '。' + stringifyActorSortDiagFlags(snapshot.flags) + (reason ? '。' + reason : '。');
  }
  return snapshot;
}

function setActorSortDiagFromUi(enabled, opts) {
  var options = opts || {};
  var next = !!enabled;
  var snapshot = writeActorSortDiagStorageProfile(next);
  updateActorSortDiagUiStatus(next ? '已写入诊断开关。' : '已移除诊断开关。');
  try {
    if (typeof pushLog === 'function') {
      pushLog('[actor-sort-diag][ui-toggle] enabled=' + next + ' flags=' + stringifyActorSortDiagFlags(snapshot.flags));
    }
  } catch (_) {}
  if (options.reload === true) {
    try {
      if (ui.actorSortDiagStatus) ui.actorSortDiagStatus.textContent += ' 即将刷新页面……';
      if (typeof pushLog === 'function') pushLog('[actor-sort-diag][ui-toggle-reload] enabled=' + next);
    } catch (_) {}
    setTimeout(function () {
      try { window.location.reload(); } catch (_) { location.reload(); }
    }, 120);
  }
}

updateActorSortDiagUiStatus('可点击“启动排序诊断并刷新”。');
safeListen(ui.actorSortDiagEnabled, 'change', () => {
  setActorSortDiagFromUi(!!(ui.actorSortDiagEnabled && ui.actorSortDiagEnabled.checked));
});
safeListen(ui.enableActorSortDiagAndReload, 'click', () => {
  setActorSortDiagFromUi(true, { reload: true });
});
safeListen(ui.disableActorSortDiagAndReload, 'click', () => {
  setActorSortDiagFromUi(false, { reload: true });
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
