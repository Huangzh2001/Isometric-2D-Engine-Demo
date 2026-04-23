(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/infrastructure/bootstrap/core-domain-bindings.js';
  var PHASE = 'P14-BIND';

  function bind(path, api) {
    try {
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
        window.__APP_NAMESPACE.bind(path, api, { owner: OWNER, phase: PHASE });
        return 'namespace.bind';
      }
      window.App = window.App || {};
      var parts = String(path || '').split('.').filter(Boolean);
      var node = window.App;
      for (var i = 0; i < parts.length - 1; i++) {
        node[parts[i]] = node[parts[i]] || {};
        node = node[parts[i]];
      }
      node[parts[parts.length - 1]] = api;
      return 'window.App';
    } catch (_) {
      return 'bind-failed';
    }
  }

  function emit(kind, message, extra) {
    var line = '[P14][' + String(kind || 'BOOT') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  var sceneCore = typeof __APP_CORE_SCENE_DOMAIN_CORE__ !== 'undefined' ? __APP_CORE_SCENE_DOMAIN_CORE__ : null;
  var portableCore = typeof __APP_CORE_PORTABLE_CORE__ !== 'undefined' ? __APP_CORE_PORTABLE_CORE__ : null;

  if (sceneCore) {
    emit('BOOT', 'bind-scene-core', { route: bind('domain.sceneCore', sceneCore), phase: sceneCore.phase || null, owner: sceneCore.owner || null });
  } else {
    emit('BOOT', 'bind-scene-core-missing', { available: false });
  }

  if (portableCore) {
    emit('BOOT', 'bind-portable-core', { route: bind('domain.portableCore', portableCore), phase: portableCore.phase || null, owner: portableCore.owner || null, requiresExplicitContext: !!(portableCore.summarizeBoundary && portableCore.summarizeBoundary().purity && portableCore.summarizeBoundary().purity.requiresExplicitContext) });
  } else {
    emit('BOOT', 'bind-portable-core-missing', { available: false });
  }
})();
