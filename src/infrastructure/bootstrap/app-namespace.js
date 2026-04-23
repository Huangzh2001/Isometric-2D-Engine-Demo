(function () {
  if (typeof window === 'undefined') return;
  var root = window.App || {};
  var registry = window.__APP_NAMESPACE_REGISTRY || {};
  var fallbackStats = window.__APP_NAMESPACE_FALLBACKS || { total: 0, byBridge: {}, byOwner: {} };

  function setPath(path, value) {
    var parts = String(path || '').split('.').filter(Boolean);
    if (!parts.length) return value;
    var node = root;
    for (var i = 0; i < parts.length - 1; i++) {
      var key = parts[i];
      if (!node[key] || typeof node[key] !== 'object') node[key] = {};
      node = node[key];
    }
    node[parts[parts.length - 1]] = value;
    return value;
  }

  function getPath(path) {
    var parts = String(path || '').split('.').filter(Boolean);
    var node = root;
    for (var i = 0; i < parts.length; i++) {
      if (!node) return undefined;
      node = node[parts[i]];
    }
    return node;
  }

  function bind(path, value, meta) {
    meta = meta || {};
    setPath(path, value);
    registry[path] = {
      owner: meta.owner || 'unknown',
      legacy: Array.isArray(meta.legacy) ? meta.legacy.slice() : [],
      phase: meta.phase || 'P2-A',
      at: new Date().toISOString()
    };
    return value;
  }

  function recordFallback(bridge, owner, detail) {
    bridge = String(bridge || 'unknown-bridge');
    owner = String(owner || 'unknown-owner');
    fallbackStats.total += 1;
    fallbackStats.byBridge[bridge] = (fallbackStats.byBridge[bridge] || 0) + 1;
    fallbackStats.byOwner[owner] = (fallbackStats.byOwner[owner] || 0) + 1;
    emit('INVARIANT', 'legacy-bridge-fallback-hit', {
      bridge: bridge,
      owner: owner,
      bridgeCount: fallbackStats.byBridge[bridge],
      ownerCount: fallbackStats.byOwner[owner],
      total: fallbackStats.total,
      detail: detail || null
    });
    return getFallbackStats();
  }

  function getFallbackStats() {
    return {
      total: fallbackStats.total || 0,
      byBridge: Object.assign({}, fallbackStats.byBridge || {}),
      byOwner: Object.assign({}, fallbackStats.byOwner || {})
    };
  }

  function countKeys(obj) {
    return obj && typeof obj === 'object' ? Object.keys(obj).length : 0;
  }

  function listLegacyGlobals() {
    var globals = [
                              'initializeMainApp',
      'bootstrapApplication'
    ];
    return globals.filter(function (key) { return typeof window[key] !== 'undefined'; });
  }

  function summarize() {
    return {
      topLevelKeys: Object.keys(root),
      registeredPaths: Object.keys(registry).sort(),
      counts: {
        boot: countKeys(root.boot),
        shell: countKeys(root.shell),
        services: countKeys(root.services),
        state: countKeys(root.state),
        controllers: countKeys(root.controllers),
        editor: countKeys(root.editor),
        debug: countKeys(root.debug)
      },
      leakedGlobals: listLegacyGlobals()
    };
  }

  function emit(kind, message, extra) {
    var line = '[P2][' + String(kind || 'BOOT') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (err) {
      try { console.log(line); } catch (_) {}
    }
    return line;
  }

  root.boot = root.boot || {};
  root.shell = root.shell || {};
  root.services = root.services || {};
  root.state = root.state || {};
  root.controllers = root.controllers || {};
  root.domain = root.domain || {};
  root.renderer = root.renderer || {};
  root.editor = root.editor || {};
  root.debug = root.debug || {};

  window.App = root;
  window.__APP_NAMESPACE_REGISTRY = registry;
  window.__APP_NAMESPACE_FALLBACKS = fallbackStats;
  window.__APP_NAMESPACE = {
    setPath: setPath,
    getPath: getPath,
    bind: bind,
    summarize: summarize,
    listLegacyGlobals: listLegacyGlobals,
    recordFallback: recordFallback,
    getFallbackStats: getFallbackStats,
    emit: emit
  };

  emit('BOOT', 'namespace-ready', summarize());
})();
