(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/infrastructure/legacy/placement-legacy-bridge.js';
  var PHASE = 'P13-LEGACY';
  function ns(path) {
    try { return (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') ? window.__APP_NAMESPACE.getPath(path) : null; } catch (_) { return null; }
  }
  function runtimeAudit() {
    try { return ns('audit.runtimeRoutes') || window.__RUNTIME_ROUTE_AUDIT__ || null; } catch (_) { return window.__RUNTIME_ROUTE_AUDIT__ || null; }
  }
  function record(kind, route, detail) {
    try { var api = runtimeAudit(); if (api && typeof api.record === 'function') api.record(kind, route, detail || {}); } catch (_) {}
  }
  function placementController() { try { return ns('controllers.placement') || (window.App && window.App.controllers ? window.App.controllers.placement : null) || null; } catch (_) { return null; } }
  function placementCore() { try { return ns('application.placementCore') || window.__PLACEMENT_CORE_API__ || null; } catch (_) { return window.__PLACEMENT_CORE_API__ || null; } }
  function shouldFallThrough(result) {
    return !!(result && typeof result === 'object' && result.ok === false && String(result.reason || '') === 'missing-controller-action');
  }
  function call(action, args, detail) {
    args = Array.isArray(args) ? args : [];
    detail = detail || {};
    var controller = placementController();
    if (controller && typeof controller.dispatch === 'function') {
      var dispatchResult = controller.dispatch(action, args);
      if (!shouldFallThrough(dispatchResult)) {
        record('owner-api', 'controllers.placement.dispatch', Object.assign({ action: action, accepted: true }, detail));
        return dispatchResult;
      }
      record('fallback', 'controllers.placement.dispatch:missing-controller-action', Object.assign({ action: action }, detail));
    }
    if (controller && typeof controller[action] === 'function') {
      record('owner-api', 'controllers.placement.' + String(action), Object.assign({ accepted: true }, detail));
      return controller[action].apply(controller, args);
    }
    var core = placementCore();
    if (core && typeof core[action] === 'function') {
      record('legacy-bridge', 'application.placementCore.' + String(action), detail);
      return core[action].apply(core, args);
    }
    if (typeof window[action] === 'function') {
      record('direct-global', 'window.' + String(action), detail);
      return window[action].apply(window, args);
    }
    record('fallback', 'missing-placement-route', Object.assign({ action: String(action || '') }, detail));
    return null;
  }
  var api = {
    owner: OWNER,
    phase: PHASE,
    startDragging: function (picked, meta) { return call('startDragging', [picked], { source: meta && meta.source || 'legacy-bridge:startDragging' }); },
    commitPreview: function (meta) { return call('commitPreview', [], { source: meta && meta.source || 'legacy-bridge:commitPreview' }); },
    cancelDrag: function (meta) { return call('cancelDrag', [], { source: meta && meta.source || 'legacy-bridge:cancelDrag' }); },
    placeCurrentPrefab: function (preview, meta) { return call('placeCurrentPrefab', [preview], { source: meta && meta.source || 'legacy-bridge:placeCurrentPrefab' }); },
    removeInstanceById: function (instanceId, meta) { return call('removeInstanceById', [instanceId], { source: meta && meta.source || 'legacy-bridge:removeInstanceById', instanceId: instanceId }); },
    findInstanceForBox: function (box, meta) { return call('findInstanceForBox', [box], { source: meta && meta.source || 'legacy-bridge:findInstanceForBox', boxId: box && box.id || null }); }
  };
  window.__PLACEMENT_LEGACY_BRIDGE__ = api;
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('legacy.placement', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
})();
