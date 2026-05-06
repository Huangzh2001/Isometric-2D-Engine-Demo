/*
 * P11a-1 render logic interaction boundary.
 *
 * Owner: src/presentation/render/interaction/
 * Purpose: centralize render-logic access to shell/controller/runtime view state.
 *
 * This module is intentionally presentation-layer code. It may read window.App
 * and render-facing runtime state, but it must not perform Canvas drawing,
 * storage, fetch, or DOM mutation. render/logic.js should call this API through
 * thin wrappers instead of directly probing controllers for view-rotation state.
 */
(function attachRenderLogicInteractionBoundary(global) {
  'use strict';

  function getWindow() {
    return global || (typeof window !== 'undefined' ? window : null);
  }

  function getApp() {
    var w = getWindow();
    return w && w.App ? w.App : null;
  }

  function normalizeRotation(value) {
    return ((Number(value) || 0) % 4 + 4) % 4;
  }

  function getMainController() {
    try {
      var app = getApp();
      return app && app.controllers ? app.controllers.main || null : null;
    } catch (_) {
      return null;
    }
  }

  function getRuntimeState() {
    try {
      var app = getApp();
      return app && app.state ? app.state.runtimeState || null : null;
    } catch (_) {
      return null;
    }
  }

  function getMainViewRotationCoreApi() {
    try {
      var app = getApp();
      if (app && app.domain && app.domain.viewRotationCore) return app.domain.viewRotationCore;
    } catch (_) {}
    try {
      var w = getWindow();
      return w ? w.__VIEW_ROTATION_CORE__ || null : null;
    } catch (_) {
      return null;
    }
  }

  function isMainEditorViewAnimating(owner) {
    var callOwner = owner || 'presentation.render.logic';
    try {
      var controller = getMainController();
      if (controller && typeof controller.isMainEditorViewRotating === 'function') {
        return !!controller.isMainEditorViewRotating(callOwner);
      }
    } catch (_) {}
    try {
      var runtimeApi = getRuntimeState();
      return !!(runtimeApi && runtimeApi.editor && runtimeApi.editor.isViewRotating);
    } catch (_) {}
    return false;
  }

  function getSafeMainEditorViewRotationValue(owner) {
    var callOwner = owner || 'presentation.render.logic';
    try {
      var controller = getMainController();
      if (controller && typeof controller.getMainEditorVisualRotation === 'function') {
        return normalizeRotation(controller.getMainEditorVisualRotation(callOwner));
      }
      if (controller && typeof controller.getMainEditorViewRotation === 'function') {
        return normalizeRotation(controller.getMainEditorViewRotation(callOwner));
      }
    } catch (_) {}
    try {
      var runtimeApi = getRuntimeState();
      if (runtimeApi && runtimeApi.editor && typeof runtimeApi.editor.rotation === 'number') {
        return normalizeRotation(runtimeApi.editor.rotation);
      }
    } catch (_) {}
    return 0;
  }

  function getMainViewProjectionConfig(input) {
    var settings = (input && input.settings) || {};
    var camera = (input && input.camera) || {};
    return {
      tileW: settings.tileW,
      tileH: settings.tileH,
      originX: settings.originX,
      originY: settings.originY,
      cameraX: camera.x,
      cameraY: camera.y,
      worldBoundsOrOrigin: {
        cols: settings.gridW || settings.worldCols,
        rows: settings.gridH || settings.worldRows,
      },
    };
  }

  var api = {
    normalizeRotation: normalizeRotation,
    getMainController: getMainController,
    getRuntimeState: getRuntimeState,
    getMainViewRotationCoreApi: getMainViewRotationCoreApi,
    isMainEditorViewAnimating: isMainEditorViewAnimating,
    getSafeMainEditorViewRotationValue: getSafeMainEditorViewRotationValue,
    getMainViewProjectionConfig: getMainViewProjectionConfig,
  };

  var w = getWindow();
  if (w) {
    w.__RENDER_LOGIC_INTERACTION_BOUNDARY__ = api;
    w.IsometricRenderLogicInteractionBoundary = api;
    try {
      w.App = w.App || {};
      w.App.presentation = w.App.presentation || {};
      w.App.presentation.render = w.App.presentation.render || {};
      w.App.presentation.render.interactionBoundary = api;
    } catch (_) {}
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
