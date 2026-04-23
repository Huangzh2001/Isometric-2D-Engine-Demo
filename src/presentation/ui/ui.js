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
    var nextCamera = { x: camera.x + (anchorScreen.x - anchored.x), y: camera.y + (anchorScreen.y - anchored.y) };
    if (window.App && window.App.state && window.App.state.runtimeState && typeof window.App.state.runtimeState.setCamera === 'function') window.App.state.runtimeState.setCamera(nextCamera, { source: 'ui:applyWorldDisplayScale' });
    else {
      camera.x = nextCamera.x;
      camera.y = nextCamera.y;
    }
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
  if (dispatched) { uiRefreshMainCameraPanel(source); return dispatched; }
  if (controller && typeof controller.setMainEditorZoom === 'function') {
    var result = controller.setMainEditorZoom(zoom, source || 'camera-panel:zoom');
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
  return {
    seed: ui.terrainSeed ? String(ui.terrainSeed.value || '').trim() : '1337',
    width: Number(ui.terrainWidth && ui.terrainWidth.value || 0),
    height: Number(ui.terrainHeight && ui.terrainHeight.value || 0),
    detailScale: Number(ui.terrainDetailScale && ui.terrainDetailScale.value || 0),
    detailOctaves: Number(ui.terrainDetailOctaves && ui.terrainDetailOctaves.value || 0),
    detailPersistence: Number(ui.terrainDetailPersistence && ui.terrainDetailPersistence.value || 0),
    detailLacunarity: Number(ui.terrainDetailLacunarity && ui.terrainDetailLacunarity.value || 0),
    detailStrength: Number(ui.terrainDetailStrength && ui.terrainDetailStrength.value || 0),
    macroScale: Number(ui.terrainMacroScale && ui.terrainMacroScale.value || 0),
    macroOctaves: Number(ui.terrainMacroOctaves && ui.terrainMacroOctaves.value || 0),
    macroPersistence: Number(ui.terrainMacroPersistence && ui.terrainMacroPersistence.value || 0),
    macroLacunarity: Number(ui.terrainMacroLacunarity && ui.terrainMacroLacunarity.value || 0),
    minHeight: Number(ui.terrainMinHeight && ui.terrainMinHeight.value || 0),
    maxHeight: Number(ui.terrainMaxHeight && ui.terrainMaxHeight.value || 0),
    waterLevel: Number(ui.terrainWaterLevel && ui.terrainWaterLevel.value || 0),
    baseHeightOffset: Number(ui.terrainBaseHeightOffset && ui.terrainBaseHeightOffset.value || 0),
    terrainDebugFaceColorsEnabled: !!(ui.terrainDebugFaceColorsEnabled && ui.terrainDebugFaceColorsEnabled.checked),
    terrainColorMode: (ui.terrainDebugFaceColorsEnabled && ui.terrainDebugFaceColorsEnabled.checked) ? 'debug-semantic' : 'natural',
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
  if (ui.terrainSeed) ui.terrainSeed.value = String(settings.seed != null ? settings.seed : '1337');
  if (ui.terrainWidth) ui.terrainWidth.value = String(Math.max(1, Number(settings.width) || 1));
  if (ui.terrainHeight) ui.terrainHeight.value = String(Math.max(1, Number(settings.height) || 1));
  if (ui.terrainDetailScale) ui.terrainDetailScale.value = String(Number(settings.detailScale) || 0);
  if (ui.terrainDetailOctaves) ui.terrainDetailOctaves.value = String(Number(settings.detailOctaves) || 0);
  if (ui.terrainDetailPersistence) ui.terrainDetailPersistence.value = String(Number(settings.detailPersistence) || 0);
  if (ui.terrainDetailLacunarity) ui.terrainDetailLacunarity.value = String(Number(settings.detailLacunarity) || 0);
  if (ui.terrainDetailStrength) ui.terrainDetailStrength.value = String(Number(settings.detailStrength) || 0);
  if (ui.terrainMacroScale) ui.terrainMacroScale.value = String(Number(settings.macroScale) || 0);
  if (ui.terrainMacroOctaves) ui.terrainMacroOctaves.value = String(Number(settings.macroOctaves) || 0);
  if (ui.terrainMacroPersistence) ui.terrainMacroPersistence.value = String(Number(settings.macroPersistence) || 0);
  if (ui.terrainMacroLacunarity) ui.terrainMacroLacunarity.value = String(Number(settings.macroLacunarity) || 0);
  if (ui.terrainMinHeight) ui.terrainMinHeight.value = String(Number(settings.minHeight) || 0);
  if (ui.terrainMaxHeight) ui.terrainMaxHeight.value = String(Number(settings.maxHeight) || 0);
  if (ui.terrainWaterLevel) ui.terrainWaterLevel.value = String(Number(settings.waterLevel) || 0);
  if (ui.terrainBaseHeightOffset) ui.terrainBaseHeightOffset.value = String(Number(settings.baseHeightOffset) || 0);
  if (ui.terrainDebugFaceColorsEnabled) ui.terrainDebugFaceColorsEnabled.checked = settings.terrainDebugFaceColorsEnabled === true;
  var profile = Array.isArray(settings.heightProfileConfig) ? settings.heightProfileConfig : [];
  [0, 1, 2, 3].forEach(function (idx) {
    var segment = profile[idx] || { start: 0, end: 1, baseHeight: 0 };
    if (ui['terrainProfile' + idx + 'Start']) ui['terrainProfile' + idx + 'Start'].value = String(Number(segment.start) || 0);
    if (ui['terrainProfile' + idx + 'End']) ui['terrainProfile' + idx + 'End'].value = String(Number(segment.end) || 0);
    if (ui['terrainProfile' + idx + 'Base']) ui['terrainProfile' + idx + 'Base'].value = String(Number(segment.baseHeight) || 0);
  });
}

function uiRefreshMainTerrainPanel(source) {
  var settings = uiGetMainTerrainSettings(source || 'terrain-panel:refresh') || null;
  if (!settings) return null;
  uiApplyMainTerrainSettingsToForm(settings);
  if (ui.terrainSummary) {
    var summary = settings.lastSummary || null;
    ui.terrainSummary.textContent = summary
      ? ('Terrain：batch=' + String(summary.terrainBatchId || '-') + ' · cells=' + String(summary.generatedCellCount || 0) + ' · voxels=' + String(summary.generatedVoxelCount || 0) + ' · min/max=' + String(summary.minHeightObserved || 0) + '/' + String(summary.maxHeightObserved || 0) + ((settings.terrainDebugFaceColorsEnabled === true) ? ' · debug-colors=on' : ''))
      : 'Terrain：尚未生成。';
  }
  if (ui.terrainDetails) {
    try { ui.terrainDetails.textContent = JSON.stringify(settings, null, 2); } catch (_) { ui.terrainDetails.textContent = String(settings); }
  }
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

safeListen(ui.terrainGenerate, 'click', () => uiHandleTerrainGenerate('terrain-panel:generate'));
safeListen(ui.terrainClear, 'click', () => uiHandleTerrainClear('terrain-panel:clear'));
safeListen(ui.terrainResetParams, 'click', () => uiHandleTerrainReset('terrain-panel:reset'));
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
uiRefreshMainTerrainPanel('ui:init');
