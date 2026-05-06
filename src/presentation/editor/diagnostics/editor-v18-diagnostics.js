// editor-v18-diagnostics.js
// P9e: owns editor health-check reporting and editor-side diagnostics helpers for START_V18_ONLY.
(function () {
  'use strict';

  function createHealthReporter(root, meta) {
    root = root || (typeof window !== 'undefined' ? window : null);
    meta = meta || {};
    var health = null;
    try {
      health = root && root.__EDITOR_HEALTH_CHECK__ && root.__EDITOR_HEALTH_CHECK__.active ? root.__EDITOR_HEALTH_CHECK__ : null;
    } catch (_) {
      health = null;
    }
    function post(tag, ok, details) {
      try {
        if (!health || typeof health.post !== 'function') return;
        var payload = details && typeof details === 'object' ? details : {};
        if (meta && meta.owner && !payload.owner) payload.owner = meta.owner;
        if (meta && meta.build && !payload.build) payload.build = meta.build;
        health.post(String(tag || 'unknown'), !!ok, payload);
      } catch (_) {}
    }
    function finish(ok, tag, details) {
      try {
        if (!health || typeof health.finish !== 'function') return;
        var payload = details && typeof details === 'object' ? details : {};
        if (meta && meta.owner && !payload.owner) payload.owner = meta.owner;
        if (meta && meta.build && !payload.build) payload.build = meta.build;
        health.__finished = true;
        health.finish(!!ok, String(tag || (ok ? 'ready' : 'failed')), payload);
      } catch (_) {}
    }
    return { post: post, finish: finish, active: !!health };
  }

  var api = { createHealthReporter: createHealthReporter };
  try {
    if (typeof window !== 'undefined') {
      window.__EDITOR_V18_DIAGNOSTICS__ = api;
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
        window.__APP_NAMESPACE.bind('presentation.editor.v18Diagnostics', api, { owner: 'src/presentation/editor/diagnostics/editor-v18-diagnostics.js', phase: 'P9e' });
      }
    }
  } catch (_) {}
})();
