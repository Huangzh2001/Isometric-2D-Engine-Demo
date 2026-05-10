// PXM-02: World renderer backend selection boundary.
// Layer: presentation/render/renderer.
//
// This module only records and resolves the active world renderer backend. It
// does not import PixiJS, initialize a Pixi Application, mutate business
// objects, change frame ordering, or own input / picking / editor state.
(function registerWorldRendererBackendSelection(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/renderer/world-renderer-backend-selection.js';
  var STEP = 'PXM-02';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var PHASE = 'world-renderer-backend-selection';
  var VALID_BACKENDS = { canvas2d: true, pixi: true };
  var DEFAULT_BACKEND = 'pixi';

  function nowMs() {
    try {
      if (global.performance && typeof global.performance.now === 'function') return global.performance.now();
    } catch (_) {}
    return Date.now();
  }

  var state = {
    started: false,
    lastRequestedBackend: DEFAULT_BACKEND,
    lastActiveBackend: 'missing',
    fallbackBackend: 'canvas2d',
    fallbackReason: 'default-backend',
    backends: {},
    backendMeta: {},
    selectedAtLeastOnce: false,
    lastBackendSignature: '',
    lastSummarySignature: '',
    lastFrameSignature: '',
    lastFrameLogAt: 0,
    lastRenderSignature: '',
    lastRenderLogAt: 0
  };

  function stringifyValue(value) {
    if (value == null) return String(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }

  function formatPayload(payload) {
    if (!payload || typeof payload !== 'object') return '';
    return Object.keys(payload).map(function (key) {
      return String(key) + '=' + stringifyValue(payload[key]);
    }).join(' ');
  }

  function emit(section, payload) {
    var line = PREFIX + '[' + String(section || 'event') + ']';
    var extra = formatPayload(payload);
    if (extra) line += ' ' + extra;
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
    return line;
  }

  function getNamespace() {
    return (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') ? global.__APP_NAMESPACE : null;
  }

  function bindPath(path, value, meta) {
    var ns = getNamespace();
    if (ns && typeof ns.bind === 'function') return ns.bind(path, value, meta || {});
    global.App = global.App || {};
    var parts = String(path || '').split('.').filter(Boolean);
    var node = global.App;
    for (var i = 0; i < parts.length - 1; i++) {
      var key = parts[i];
      if (!node[key] || typeof node[key] !== 'object') node[key] = {};
      node = node[key];
    }
    if (parts.length) node[parts[parts.length - 1]] = value;
    return value;
  }

  function sanitizeBackendName(value) {
    var name = String(value || '').trim().toLowerCase();
    if (!name) return DEFAULT_BACKEND;
    if (name === 'canvas' || name === 'canvas2d-renderer') return 'canvas2d';
    if (name === 'pixijs' || name === 'pixi-js') return 'pixi';
    return VALID_BACKENDS[name] ? name : DEFAULT_BACKEND;
  }

  function readQueryBackend() {
    try {
      if (!global.location || !global.location.search) return '';
      var params = new URLSearchParams(global.location.search);
      return params.get('worldRendererBackend') || params.get('worldRenderer') || params.get('rendererBackend') || '';
    } catch (_) {}
    return '';
  }

  function getRequestedBackend() {
    var explicit = global.__WORLD_RENDERER_BACKEND_REQUEST__ || global.__WORLD_RENDERER_BACKEND__ || readQueryBackend();
    return sanitizeBackendName(explicit || DEFAULT_BACKEND);
  }

  function maybeEmitStart(reason) {
    if (state.started) return false;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/renderer',
      touchedFeature: 'world-renderer-backend-selection',
      requested: getRequestedBackend(),
      defaultBackend: DEFAULT_BACKEND,
      pixiImported: false,
      pixiInitialized: false,
      reason: reason || 'module-load'
    });
    return true;
  }

  function getRegisteredStatus() {
    return {
      canvas2dRegistered: !!state.backends.canvas2d,
      pixiRegistered: !!state.backends.pixi
    };
  }

  function emitBackendStatus(reason) {
    var requested = getRequestedBackend();
    var registered = getRegisteredStatus();
    var signature = [
      requested,
      state.lastActiveBackend,
      registered.canvas2dRegistered ? 1 : 0,
      registered.pixiRegistered ? 1 : 0,
      state.fallbackBackend,
      state.fallbackReason
    ].join('|');
    if (signature === state.lastBackendSignature) return;
    state.lastBackendSignature = signature;
    emit('backend', {
      requested: requested,
      active: state.lastActiveBackend || 'missing',
      canvas2dRegistered: registered.canvas2dRegistered,
      pixiRegistered: registered.pixiRegistered,
      pixiEnabled: state.lastActiveBackend === 'pixi',
      fallback: state.fallbackBackend || 'canvas2d',
      source: reason || 'status'
    });
  }

  function emitFallbackStatus(reason) {
    emit('fallback', {
      canvas2dFallback: 'enabled',
      requested: state.lastRequestedBackend || getRequestedBackend(),
      active: state.lastActiveBackend || 'missing',
      fallbackBackend: state.fallbackBackend || 'canvas2d',
      fallbackReason: state.fallbackReason || 'default-backend',
      source: reason || 'status'
    });
  }

  function emitSummary(reason) {
    var registered = getRegisteredStatus();
    var signature = [
      state.lastRequestedBackend,
      state.lastActiveBackend,
      registered.canvas2dRegistered ? 1 : 0,
      registered.pixiRegistered ? 1 : 0,
      state.fallbackReason
    ].join('|');
    if (signature === state.lastSummarySignature) return;
    state.lastSummarySignature = signature;
    emit('summary', {
      ok: !!state.backends[state.lastActiveBackend],
      touchedFeature: 'world-renderer-backend-selection',
      requested: state.lastRequestedBackend || getRequestedBackend(),
      active: state.lastActiveBackend || 'missing',
      canvas2dRegistered: registered.canvas2dRegistered,
      pixiRegistered: registered.pixiRegistered,
      canvas2dFallback: 'enabled',
      pixiRendererCreated: false,
      source: reason || 'summary'
    });
  }

  function registerBackend(name, api, meta) {
    maybeEmitStart('register-backend');
    var backendName = sanitizeBackendName(name);
    if (!VALID_BACKENDS[backendName]) backendName = DEFAULT_BACKEND;
    if (backendName === 'pixi') {
      // PXM-02 deliberately does not create or initialize PixiJS. This branch
      // only allows a future renderer to register through the same boundary.
    }
    state.backends[backendName] = api || null;
    state.backendMeta[backendName] = meta || {};
    bindPath('renderer.' + backendName, api || null, {
      owner: meta && meta.owner || OWNER,
      phase: meta && meta.phase || PHASE
    });
    emitBackendStatus('register-' + backendName);
    return api || null;
  }

  function selectActiveBackend(options) {
    maybeEmitStart('select-active-backend');
    var opts = options && typeof options === 'object' ? options : {};
    var requested = sanitizeBackendName(opts.requested || getRequestedBackend());
    var activeName = requested;
    var activeApi = state.backends[activeName] || null;
    var fallbackReason = 'requested-backend-available';

    if (!activeApi) {
      if (state.backends.canvas2d) {
        activeName = 'canvas2d';
        activeApi = state.backends.canvas2d;
        fallbackReason = requested === 'canvas2d' ? 'default-backend' : 'requested-backend-unavailable';
      } else {
        activeName = 'missing';
        activeApi = null;
        fallbackReason = 'canvas2d-backend-missing';
      }
    }

    state.lastRequestedBackend = requested;
    state.lastActiveBackend = activeName;
    state.fallbackBackend = 'canvas2d';
    state.fallbackReason = fallbackReason;
    state.selectedAtLeastOnce = true;

    if (activeApi) {
      bindPath('renderer.active', activeApi, {
        owner: OWNER,
        phase: PHASE,
        requested: requested,
        active: activeName
      });
    }

    emitBackendStatus(opts.source || 'select-active-backend');
    emitFallbackStatus(opts.source || 'select-active-backend');
    emitSummary(opts.source || 'select-active-backend');
    return activeApi;
  }

  function shouldEmitThrottled(kind, signature, intervalMs) {
    var current = nowMs();
    var lastSignatureKey = kind === 'render' ? 'lastRenderSignature' : 'lastFrameSignature';
    var lastLogAtKey = kind === 'render' ? 'lastRenderLogAt' : 'lastFrameLogAt';
    if (state[lastSignatureKey] === signature && (current - Number(state[lastLogAtKey] || 0)) < Number(intervalMs || 5000)) return false;
    state[lastSignatureKey] = signature;
    state[lastLogAtKey] = current;
    return true;
  }

  function noteFrameSummary(frameSummary) {
    maybeEmitStart('frame-summary');
    var safe = frameSummary && typeof frameSummary === 'object' ? frameSummary : {};
    var order = Number(safe.order || safe.renderableCount || 0);
    var signature = [state.lastRequestedBackend || getRequestedBackend(), state.lastActiveBackend || 'missing', order, safe.framePlanId || 'unknown'].join('|');
    if (!shouldEmitThrottled('frame', signature, 5000)) return safe;
    emit('frame', {
      requested: state.lastRequestedBackend || getRequestedBackend(),
      active: state.lastActiveBackend || 'missing',
      framePlanId: safe.framePlanId || 'unknown',
      order: order,
      touchedFeature: 'world-renderer-backend-selection',
      source: safe.source || 'backend-selection-frame-summary'
    });
    return safe;
  }

  function noteRenderSummary(renderSummary) {
    maybeEmitStart('render-summary');
    var safe = renderSummary && typeof renderSummary === 'object' ? renderSummary : {};
    var renderableCount = Number(safe.renderableCount || 0);
    var signature = [state.lastRequestedBackend || getRequestedBackend(), state.lastActiveBackend || 'missing', renderableCount, safe.framePlanId || 'unknown'].join('|');
    if (!shouldEmitThrottled('render', signature, 5000)) return safe;
    emit('render', {
      requested: state.lastRequestedBackend || getRequestedBackend(),
      active: state.lastActiveBackend || 'missing',
      framePlanId: safe.framePlanId || 'unknown',
      renderableCount: renderableCount,
      renderer: safe.renderer || 'canvas2d',
      touchedFeature: 'world-renderer-backend-selection',
      source: safe.source || 'backend-selection-render-summary'
    });
    return safe;
  }

  function getSnapshot() {
    var registered = getRegisteredStatus();
    return {
      step: STEP,
      phase: PHASE,
      owner: OWNER,
      requestedBackend: state.lastRequestedBackend || getRequestedBackend(),
      activeBackend: state.lastActiveBackend || 'missing',
      selectedAtLeastOnce: !!state.selectedAtLeastOnce,
      canvas2dRegistered: registered.canvas2dRegistered,
      pixiRegistered: registered.pixiRegistered,
      pixiEnabled: state.lastActiveBackend === 'pixi',
      canvas2dFallback: 'enabled',
      fallbackBackend: state.fallbackBackend || 'canvas2d',
      fallbackReason: state.fallbackReason || 'default-backend',
      pixiRendererCreated: false
    };
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    step: STEP,
    getRequestedBackend: getRequestedBackend,
    registerBackend: registerBackend,
    selectActiveBackend: selectActiveBackend,
    noteFrameSummary: noteFrameSummary,
    noteRenderSummary: noteRenderSummary,
    getSnapshot: getSnapshot
  };

  global.__WORLD_RENDERER_BACKEND_SELECTION__ = api;
  global.__PIXI_MIGRATION_BACKEND_SELECTION__ = api;
  try {
    bindPath('renderer.backendSelection', api, { owner: OWNER, phase: PHASE });
  } catch (_) {}

  maybeEmitStart('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
