// P12b-7: render-facing renderable order adapter.
// Layer: presentation/render/renderables.
// Owns adapter glue between render.js callers and pure domain render-order / view-rotation cores.
// This file must not draw, mutate scene state, or own actor/static replacement algorithms.
(function registerRenderableOrderAdapter(global) {
  'use strict';

  var OWNER = 'src/presentation/render/renderables/renderable-order-adapter.js';
  var PHASE = 'P12b-7';

  function nullFn() { return null; }
  function safeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }
  function resolveFunction(deps, name, fallback) {
    if (deps && typeof deps[name] === 'function') return deps[name];
    try { if (global && typeof global[name] === 'function') return global[name]; } catch (_) {}
    return fallback || nullFn;
  }

  function getViewRotationCoreApi(deps) {
    var getInjected = resolveFunction(deps, 'getViewRotationCoreApi', null);
    if (getInjected) {
      var injected = getInjected();
      if (injected) return injected;
    }
    try {
      return (global && global.App && global.App.domain && global.App.domain.viewRotationCore)
        ? global.App.domain.viewRotationCore
        : (global ? global.__VIEW_ROTATION_CORE__ || null : null);
    } catch (_) {
      return global ? global.__VIEW_ROTATION_CORE__ || null : null;
    }
  }

  function computeViewAwareSortMeta(point, height, viewRotation, deps) {
    var api = getViewRotationCoreApi(deps);
    if (api && typeof api.computeRenderableSortMeta === 'function') {
      return api.computeRenderableSortMeta({
        x: point && point.x,
        y: point && point.y,
        z: point && point.z,
        h: height,
        viewRotation: viewRotation
      });
    }
    return {
      sortKey: safeNumber(point && point.x, 0) + safeNumber(point && point.y, 0) + safeNumber(point && point.z, 0) + safeNumber(height, 0),
      tie: (safeNumber(point && point.z, 0) * 100000) + (safeNumber(point && point.y, 0) * 100) + safeNumber(point && point.x, 0)
    };
  }

  function deriveRenderableDrawPosition(renderable, deps) {
    var averageScreenPoint = resolveFunction(deps, 'averageScreenPoint', function () { return { x: 0, y: 0 }; });
    if (!renderable) return { x: 0, y: 0 };
    if (renderable.drawScreenPosition && typeof renderable.drawScreenPosition.x === 'number' && typeof renderable.drawScreenPosition.y === 'number') {
      return { x: Math.round(renderable.drawScreenPosition.x), y: Math.round(renderable.drawScreenPosition.y) };
    }
    if (renderable.debugFoot && typeof renderable.debugFoot.x === 'number' && typeof renderable.debugFoot.y === 'number') {
      return { x: Math.round(renderable.debugFoot.x), y: Math.round(renderable.debugFoot.y) };
    }
    if (Array.isArray(renderable.faces) && renderable.faces.length && Array.isArray(renderable.faces[0].points) && renderable.faces[0].points.length) {
      var mid = averageScreenPoint(renderable.faces[0].points);
      return { x: Math.round(mid.x), y: Math.round(mid.y) };
    }
    return { x: 0, y: 0 };
  }

  function compareRenderablesByDomain(a, b, deps) {
    var getDomainSceneCoreApi = resolveFunction(deps, 'getDomainSceneCoreApi', nullFn);
    var requireRenderOrderCoreForRender = resolveFunction(deps, 'requireRenderOrderCoreForRender', nullFn);
    var domainCore = getDomainSceneCoreApi();
    if (domainCore && typeof domainCore.compareRenderableOrder === 'function') {
      return domainCore.compareRenderableOrder(a, b);
    }
    var orderCore = requireRenderOrderCoreForRender();
    if (orderCore && typeof orderCore.compareRenderableOrder === 'function') {
      return orderCore.compareRenderableOrder(a, b);
    }
    return safeNumber(a && a.sortKey, 0) - safeNumber(b && b.sortKey, 0) || safeNumber(a && a.tie, 0) - safeNumber(b && b.tie, 0);
  }

  function mergeSortedRenderables(staticRenderables, dynamicRenderables, deps) {
    var requireRenderOrderCoreForRender = resolveFunction(deps, 'requireRenderOrderCoreForRender', nullFn);
    var compareRenderables = resolveFunction(deps, 'compareRenderablesByDomain', function (a, b) { return compareRenderablesByDomain(a, b, deps); });
    var orderCore = requireRenderOrderCoreForRender();
    if (orderCore && typeof orderCore.mergeSortedRenderables === 'function') {
      return orderCore.mergeSortedRenderables(staticRenderables, dynamicRenderables, compareRenderables);
    }
    var staticList = Array.isArray(staticRenderables) ? staticRenderables.slice() : [];
    var dynamicList = Array.isArray(dynamicRenderables) ? dynamicRenderables.slice() : [];
    return staticList.concat(dynamicList).sort(compareRenderables);
  }

  function summarizeBoundary() {
    return {
      layer: 'presentation/render/renderables',
      owner: OWNER,
      phase: PHASE,
      owns: [
        'render-facing-sort-meta-adapter',
        'renderable-draw-position-derivation',
        'domain-comparator-adapter',
        'sorted-static-dynamic-renderable-stream-adapter'
      ],
      doesNotOwn: [
        'pure-order-algorithm-core',
        'static-world-face-descriptor-construction',
        'actor-interaction-replacement',
        'stable-local-demerge',
        'canvas-drawing',
        'scene-state-mutation'
      ]
    };
  }

  var api = {
    summarizeBoundary: summarizeBoundary,
    getViewRotationCoreApi: getViewRotationCoreApi,
    computeViewAwareSortMeta: computeViewAwareSortMeta,
    deriveRenderableDrawPosition: deriveRenderableDrawPosition,
    compareRenderablesByDomain: compareRenderablesByDomain,
    mergeSortedRenderables: mergeSortedRenderables
  };

  global.IsometricRenderableOrderAdapter = api;
  global.__RENDERABLE_ORDER_ADAPTER__ = api;
  global.__APP_PRESENTATION_RENDERABLE_ORDER_ADAPTER__ = api;
  if (!global.App) global.App = {};
  if (!global.App.presentation) global.App.presentation = {};
  if (!global.App.presentation.render) global.App.presentation.render = {};
  if (!global.App.presentation.render.renderables) global.App.presentation.render.renderables = {};
  global.App.presentation.render.renderables.renderableOrderAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis);
