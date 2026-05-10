// PXM-01: PixiJS migration baseline diagnostics.
// Layer: presentation/render/diagnostics.
//
// This module only emits migration-readiness evidence for the existing Canvas2D
// world renderer path. It must not initialize PixiJS, mutate renderables, change
// frame ordering, or own any business/editor interaction state.
(function registerPixiMigrationBaselineDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-baseline-diagnostics.js';
  var STEP = 'PXM-01';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var PHASE = 'pixi-migration-baseline';

  var state = {
    started: false,
    backendLogged: false,
    firstFrameLogged: false,
    firstPipelineLogged: false,
    summaryLogged: false,
    lastFrameSignature: '',
    lastFrameLogAt: 0,
    lastPipelineSignature: '',
    lastPipelineLogAt: 0,
    lastBackend: 'unknown',
    lastFrameSummary: null,
    lastPipelineSummary: null
  };

  function nowMs() {
    try {
      if (global.performance && typeof global.performance.now === 'function') return global.performance.now();
    } catch (_) {}
    return Date.now();
  }

  function stringifyValue(value) {
    if (value == null) return String(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }

  function formatPayload(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = Object.keys(payload);
    if (!keys.length) return '';
    return keys.map(function (key) {
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

  function getNamespacePath(path) {
    try {
      if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.getPath === 'function') {
        return global.__APP_NAMESPACE.getPath(path);
      }
    } catch (_) {}
    try {
      var parts = String(path || '').split('.');
      var cursor = global.App;
      if (!cursor) return null;
      for (var i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;
        cursor = cursor && cursor[parts[i]];
      }
      return cursor || null;
    } catch (_) {}
    return null;
  }

  function detectActiveBackend(explicitApi) {
    var api = explicitApi || getNamespacePath('renderer.active');
    if (api && api.backend) return String(api.backend);
    return api ? 'registered-unknown' : 'missing';
  }

  function countRenderableKinds(order) {
    var counts = {};
    var canvasOnly = 0;
    var pixiReady = 0;
    var unsupported = {};
    var arr = Array.isArray(order) ? order : [];
    for (var i = 0; i < arr.length; i++) {
      var renderable = arr[i] || {};
      var kind = String(renderable.kind || 'unknown');
      counts[kind] = (counts[kind] || 0) + 1;
      if (kind === 'static-world-face-packet') {
        pixiReady += 1;
      } else {
        canvasOnly += 1;
        unsupported[kind] = (unsupported[kind] || 0) + 1;
      }
    }
    return {
      kindCounts: counts,
      pixiReadyCount: pixiReady,
      canvasOnlyCount: canvasOnly,
      unsupportedKinds: Object.keys(unsupported).sort()
    };
  }

  function summarizeFramePlan(framePlan) {
    var order = framePlan && Array.isArray(framePlan.order) ? framePlan.order : [];
    var kindSummary = countRenderableKinds(order);
    return {
      framePlanId: framePlan && framePlan.id ? String(framePlan.id) : 'unknown',
      order: order.length,
      currentViewRotation: framePlan && framePlan.currentViewRotation != null ? Number(framePlan.currentViewRotation) : null,
      staticWorldFacePacket: Number(kindSummary.kindCounts['static-world-face-packet'] || 0),
      prefabSprite: Number(kindSummary.kindCounts['prefab-sprite'] || 0),
      prefabSpritePart: Number(kindSummary.kindCounts['prefab-sprite-part'] || 0),
      playerAvatar: Number(kindSummary.kindCounts['player-avatar'] || 0),
      pixiReady: kindSummary.pixiReadyCount,
      canvasOnly: kindSummary.canvasOnlyCount,
      unsupportedKinds: kindSummary.unsupportedKinds.join(',') || 'none',
      kindCounts: kindSummary.kindCounts
    };
  }

  function maybeEmitStart(reason) {
    if (state.started) return false;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: 'baseline-diagnostics-only',
      pixiImported: false,
      pixiEnabled: false,
      reason: reason || 'module-load'
    });
    emit('fallback', {
      canvas2dFallback: 'enabled',
      reason: 'baseline-default-backend',
      pixiRendererCreated: false
    });
    return true;
  }

  function noteBackendStatus(payload) {
    maybeEmitStart('backend-status');
    var safe = payload && typeof payload === 'object' ? payload : {};
    var activeBackend = String(safe.active || detectActiveBackend(safe.activeApi) || 'unknown');
    state.lastBackend = activeBackend;
    var signature = [
      activeBackend,
      safe.canvas2dRegistered === true ? 1 : 0,
      safe.pixiRegistered === true ? 1 : 0,
      safe.fallback || 'canvas2d'
    ].join('|');
    if (!state.backendLogged || state.lastBackendSignature !== signature) {
      state.backendLogged = true;
      state.lastBackendSignature = signature;
      emit('backend', {
        active: activeBackend,
        canvas2dRegistered: safe.canvas2dRegistered === false ? false : true,
        pixiRegistered: safe.pixiRegistered === true,
        pixiEnabled: safe.pixiEnabled === true,
        fallback: safe.fallback || 'canvas2d',
        source: safe.source || 'unknown'
      });
    }
    return activeBackend;
  }

  function noteFramePlan(framePlan, extra) {
    maybeEmitStart('frame-plan');
    var summary = summarizeFramePlan(framePlan);
    var activeBackend = detectActiveBackend();
    state.lastBackend = activeBackend;
    state.lastFrameSummary = summary;
    var signature = [
      summary.order,
      summary.staticWorldFacePacket,
      summary.prefabSprite,
      summary.prefabSpritePart,
      summary.playerAvatar,
      summary.canvasOnly,
      summary.currentViewRotation
    ].join('|');
    var current = nowMs();
    var shouldEmit = !state.firstFrameLogged || signature !== state.lastFrameSignature || (current - state.lastFrameLogAt) >= 5000;
    if (!shouldEmit) return summary;
    state.firstFrameLogged = true;
    state.lastFrameSignature = signature;
    state.lastFrameLogAt = current;
    emit('frame', {
      activeBackend: activeBackend,
      framePlanId: summary.framePlanId,
      order: summary.order,
      staticWorldFacePacket: summary.staticWorldFacePacket,
      prefabSprite: summary.prefabSprite,
      prefabSpritePart: summary.prefabSpritePart,
      playerAvatar: summary.playerAvatar,
      pixiReady: summary.pixiReady,
      canvasOnly: summary.canvasOnly,
      unsupportedKinds: summary.unsupportedKinds,
      source: extra && extra.source ? String(extra.source) : 'buildRendererFramePlan'
    });
    emit('summary', {
      ok: true,
      activeBackend: activeBackend,
      touchedFeature: 'baseline-diagnostics-only',
      canvas2dFallback: 'enabled',
      pixiRendererCreated: false,
      order: summary.order
    });
    state.summaryLogged = true;
    return summary;
  }

  function noteRenderPipelineSummary(payload) {
    maybeEmitStart('render-pipeline');
    var safe = payload && typeof payload === 'object' ? payload : {};
    var activeBackend = detectActiveBackend();
    var signature = [
      safe.framePlanId || 'unknown',
      Number(safe.renderableCount || 0),
      Number(safe.buildFramePlanMs || 0).toFixed(1),
      Number(safe.drawRenderableOrderMs || 0).toFixed(1),
      safe.zoomPreviewFastPathUsed === true ? 1 : 0
    ].join('|');
    var current = nowMs();
    if (state.firstPipelineLogged && signature === state.lastPipelineSignature && (current - state.lastPipelineLogAt) < 5000) return safe;
    state.firstPipelineLogged = true;
    state.lastPipelineSignature = signature;
    state.lastPipelineLogAt = current;
    state.lastPipelineSummary = safe;
    emit('render', {
      activeBackend: activeBackend,
      framePlanId: safe.framePlanId || 'unknown',
      renderableCount: Number(safe.renderableCount || 0),
      buildFramePlanMs: Number(safe.buildFramePlanMs || 0),
      drawRenderableOrderMs: Number(safe.drawRenderableOrderMs || 0),
      drawOverlayPassesMs: Number(safe.drawOverlayPassesMs || 0),
      drawHudPassMs: Number(safe.drawHudPassMs || 0),
      zoomPreviewFastPathUsed: safe.zoomPreviewFastPathUsed === true,
      renderer: 'canvas2d'
    });
    return safe;
  }

  function getSnapshot() {
    return {
      step: STEP,
      phase: PHASE,
      owner: OWNER,
      started: !!state.started,
      activeBackend: state.lastBackend || detectActiveBackend(),
      backendLogged: !!state.backendLogged,
      firstFrameLogged: !!state.firstFrameLogged,
      firstPipelineLogged: !!state.firstPipelineLogged,
      summaryLogged: !!state.summaryLogged,
      lastFrameSummary: state.lastFrameSummary,
      lastPipelineSummary: state.lastPipelineSummary,
      canvas2dFallback: 'enabled',
      pixiRendererCreated: false
    };
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    step: STEP,
    maybeEmitStart: maybeEmitStart,
    noteBackendStatus: noteBackendStatus,
    noteFramePlan: noteFramePlan,
    noteRenderPipelineSummary: noteRenderPipelineSummary,
    getSnapshot: getSnapshot
  };

  global.__PIXI_MIGRATION_BASELINE_DIAGNOSTICS__ = api;
  global.__PIXI_MIGRATION_DIAGNOSTICS__ = api;
  try {
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationBaseline', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}

  maybeEmitStart('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
