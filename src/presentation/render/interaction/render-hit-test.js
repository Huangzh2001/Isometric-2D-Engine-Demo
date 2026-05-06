/*
 * P11a-2 render hit-test / projection boundary.
 *
 * Owner: src/presentation/render/interaction/
 * Purpose: centralize render-facing screen/world projection helpers used by
 * render/logic.js. This module may depend on injected camera/settings/view
 * rotation config, but it must not perform Canvas drawing, DOM mutation,
 * storage, fetch, or scene/prefab mutation.
 */
(function attachRenderHitTest(global) {
  'use strict';

  function getWindow() {
    return global || (typeof window !== 'undefined' ? window : null);
  }

  function num(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function getTileW(input) {
    return num(input && input.settings && input.settings.tileW, num(input && input.tileW, 64));
  }

  function getTileH(input) {
    return num(input && input.settings && input.settings.tileH, num(input && input.tileH, 32));
  }

  function getOriginX(input) {
    return num(input && input.settings && input.settings.originX, num(input && input.originX, 0));
  }

  function getOriginY(input) {
    return num(input && input.settings && input.settings.originY, num(input && input.originY, 0));
  }

  function getCameraX(input) {
    return num(input && input.camera && input.camera.x, num(input && input.cameraX, 0));
  }

  function getCameraY(input) {
    return num(input && input.camera && input.camera.y, num(input && input.cameraY, 0));
  }

  function getGridW(input) {
    return num(input && input.settings && input.settings.gridW, num(input && input.gridW, 0));
  }

  function getGridH(input) {
    return num(input && input.settings && input.settings.gridH, num(input && input.gridH, 0));
  }

  function getViewW(input) {
    return num(input && input.viewW, num(input && input.width, 0));
  }

  function getViewH(input) {
    return num(input && input.viewH, num(input && input.height, 0));
  }

  function getRotation(input) {
    return ((num(input && input.rotation, 0) % 4) + 4) % 4;
  }

  function getProjectionConfig(input) {
    return input && input.projectionConfig ? input.projectionConfig : {
      tileW: getTileW(input),
      tileH: getTileH(input),
      originX: getOriginX(input),
      originY: getOriginY(input),
      cameraX: getCameraX(input),
      cameraY: getCameraY(input),
      worldBoundsOrOrigin: {
        cols: getGridW(input),
        rows: getGridH(input),
      },
    };
  }

  function worldToScreen(input) {
    var x = num(input && input.x, 0);
    var y = num(input && input.y, 0);
    var z = num(input && input.z, 0);
    var api = input && input.viewRotationCoreApi;
    if (api && typeof api.worldToScreenWithViewRotation === 'function') {
      return api.worldToScreenWithViewRotation({ x: x, y: y, z: z }, getRotation(input), getProjectionConfig(input));
    }
    return {
      x: getOriginX(input) + getCameraX(input) + (x - y) * getTileW(input) / 2,
      y: getOriginY(input) + getCameraY(input) + (x + y) * getTileH(input) / 2 - z * getTileH(input),
    };
  }

  function screenToFloor(input) {
    var sx = num(input && input.sx, num(input && input.x, 0));
    var sy = num(input && input.sy, num(input && input.y, 0));
    var api = input && input.viewRotationCoreApi;
    if (api && typeof api.screenToWorldWithViewRotation === 'function') {
      var world = api.screenToWorldWithViewRotation({ x: sx, y: sy, z: 0 }, getRotation(input), getProjectionConfig(input));
      return { x: world.x, y: world.y };
    }
    var dx = (sx - getOriginX(input) - getCameraX(input)) / (getTileW(input) / 2);
    var dy = (sy - getOriginY(input) - getCameraY(input)) / (getTileH(input) / 2);
    return { x: (dx + dy) / 2, y: (dy - dx) / 2 };
  }

  function computeFloorScreenBounds(input) {
    var gridW = getGridW(input);
    var gridH = getGridH(input);
    var viewW = getViewW(input);
    var viewH = getViewH(input);
    var pts = [
      worldToScreen(Object.assign({}, input, { x: 0, y: 0, z: 0 })),
      worldToScreen(Object.assign({}, input, { x: gridW, y: 0, z: 0 })),
      worldToScreen(Object.assign({}, input, { x: gridW, y: gridH, z: 0 })),
      worldToScreen(Object.assign({}, input, { x: 0, y: gridH, z: 0 })),
    ];
    var xs = pts.map(function (p) { return p.x; });
    var ys = pts.map(function (p) { return p.y; });
    return {
      minX: Math.max(0, Math.floor(Math.min.apply(Math, xs)) - 2),
      maxX: Math.min(viewW, Math.ceil(Math.max.apply(Math, xs)) + 2),
      minY: Math.max(0, Math.floor(Math.min.apply(Math, ys)) - 2),
      maxY: Math.min(viewH, Math.ceil(Math.max.apply(Math, ys)) + 2),
    };
  }

  var api = {
    worldToScreen: worldToScreen,
    screenToFloor: screenToFloor,
    computeFloorScreenBounds: computeFloorScreenBounds,
  };

  var w = getWindow();
  if (w) {
    w.__RENDER_HIT_TEST__ = api;
    w.IsometricRenderHitTest = api;
    try {
      w.App = w.App || {};
      w.App.presentation = w.App.presentation || {};
      w.App.presentation.render = w.App.presentation.render || {};
      w.App.presentation.render.hitTest = api;
    } catch (_) {}
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
