// ui-boundary.js
// P9e: owns UI-side service/controller lookup, controller dispatch, and UI boundary logging.
// Keep this file free of DOM binding and visual panel synchronization logic.
(function () {
  'use strict';

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




  var api = {
    emitP1bUi: emitP1bUi,
    readEditorHandoff: readEditorHandoff,
    clearEditorHandoff: clearEditorHandoff,
    getUiAssetWorkflow: getUiAssetWorkflow,
    getUiSceneWorkflow: getUiSceneWorkflow,
    getUiEditorHandoffService: getUiEditorHandoffService,
    getUiMainController: getUiMainController,
    getUiSceneController: getUiSceneController,
    getUiPlacementController: getUiPlacementController,
    getUiAssetLibraryController: getUiAssetLibraryController,
    uiDispatchController: uiDispatchController,
    uiDispatchControllerCommand: uiDispatchControllerCommand,
    uiDirectPatchRenderSettings: uiDirectPatchRenderSettings
  };

  try {
    if (typeof window !== 'undefined') {
      window.__UI_BOUNDARY__ = api;
      Object.keys(api).forEach(function (key) {
        if (typeof window[key] !== 'function') window[key] = api[key];
      });
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
        window.__APP_NAMESPACE.bind('presentation.ui.boundary', api, { owner: 'src/presentation/ui/ui-boundary.js', phase: 'P9e' });
      }
    }
  } catch (_) {}
})();
