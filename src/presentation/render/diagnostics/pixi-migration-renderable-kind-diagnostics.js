// PXM-03: PixiJS migration renderable-kind diagnostics.
// Layer: presentation/render/diagnostics.
//
// This module only inspects framePlan.order shape for migration planning. It
// does not initialize PixiJS, mutate renderables, change depth ordering, draw,
// or own input / picking / editor state.
(function registerPixiMigrationRenderableKindDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-renderable-kind-diagnostics.js';
  var STEP = 'PXM-03';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var PHASE = 'pixi-migration-renderable-kind-diagnostics';

  var PIXI_READY_KINDS = {
    'static-world-face-packet': true
  };
  var PARTIAL_KINDS = {
    'voxel': true,
    'cached-voxel': true,
    'static-voxel': true,
    'voxel-face': true
  };
  var SPRITE_CANVAS_ONLY_KINDS = {
    'prefab-sprite': true,
    'prefab-sprite-part': true,
    'player-avatar': true
  };

  var state = {
    started: false,
    backendLogged: false,
    fallbackLogged: false,
    summaryLogged: false,
    lastFrameSignature: '',
    lastFrameLogAt: 0,
    lastRenderSignature: '',
    lastRenderLogAt: 0,
    lastSummarySignature: '',
    lastSummary: null
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

  function getBackendSnapshot() {
    try {
      if (global.__WORLD_RENDERER_BACKEND_SELECTION__ && typeof global.__WORLD_RENDERER_BACKEND_SELECTION__.getSnapshot === 'function') {
        return global.__WORLD_RENDERER_BACKEND_SELECTION__.getSnapshot() || {};
      }
    } catch (_) {}
    return {};
  }

  function detectActiveBackend() {
    var snapshot = getBackendSnapshot();
    if (snapshot.activeBackend) return String(snapshot.activeBackend);
    try {
      var api = global.App && global.App.renderer && global.App.renderer.active;
      if (api && api.backend) return String(api.backend);
      return api ? 'registered-unknown' : 'missing';
    } catch (_) {}
    return 'unknown';
  }

  function maybeEmitStart(reason) {
    if (state.started) return false;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: 'framePlan-renderable-kind-diagnostics',
      pixiImported: false,
      pixiInitialized: false,
      pixiEnabled: false,
      reason: reason || 'module-load'
    });
    return true;
  }

  function emitBackendStatus(reason) {
    maybeEmitStart('backend-status');
    var snapshot = getBackendSnapshot();
    var active = snapshot.activeBackend || detectActiveBackend();
    var signature = [
      snapshot.requestedBackend || 'canvas2d',
      active || 'unknown',
      snapshot.canvas2dRegistered === true ? 1 : 0,
      snapshot.pixiRegistered === true ? 1 : 0,
      snapshot.pixiEnabled === true ? 1 : 0
    ].join('|');
    if (state.backendLogged && state.lastBackendSignature === signature) return snapshot;
    state.backendLogged = true;
    state.lastBackendSignature = signature;
    emit('backend', {
      requested: snapshot.requestedBackend || 'canvas2d',
      active: active || 'unknown',
      canvas2dRegistered: snapshot.canvas2dRegistered === true,
      pixiRegistered: snapshot.pixiRegistered === true,
      pixiEnabled: snapshot.pixiEnabled === true,
      touchedFeature: 'framePlan-renderable-kind-diagnostics',
      source: reason || 'status'
    });
    return snapshot;
  }

  function emitFallbackStatus(reason) {
    maybeEmitStart('fallback-status');
    if (state.fallbackLogged) return;
    state.fallbackLogged = true;
    var snapshot = getBackendSnapshot();
    emit('fallback', {
      canvas2dFallback: 'enabled',
      active: snapshot.activeBackend || detectActiveBackend(),
      pixiRendererCreated: false,
      pixiOwnsPicking: false,
      pixiUsesZIndex: false,
      reason: reason || 'diagnostics-only'
    });
  }

  function classifyKind(kind) {
    var safeKind = String(kind || 'unknown');
    if (PIXI_READY_KINDS[safeKind]) return 'pixi-ready';
    if (PARTIAL_KINDS[safeKind]) return 'partial';
    if (SPRITE_CANVAS_ONLY_KINDS[safeKind]) return 'canvas-only-sprite';
    return 'canvas-only-unknown';
  }

  function buildKindSummary(order) {
    var arr = Array.isArray(order) ? order : [];
    var kindCounts = {};
    var unsupportedCounts = {};
    var pixiReadyCount = 0;
    var partialPixiReadyCount = 0;
    var canvasOnlyCount = 0;
    var spriteDescriptorRequiredCount = 0;
    var firstKind = 'none';
    var lastKind = 'none';

    for (var i = 0; i < arr.length; i++) {
      var renderable = arr[i] || {};
      var kind = String(renderable.kind || 'unknown');
      if (i === 0) firstKind = kind;
      lastKind = kind;
      kindCounts[kind] = (kindCounts[kind] || 0) + 1;
      var bucket = classifyKind(kind);
      if (bucket === 'pixi-ready') {
        pixiReadyCount += 1;
      } else if (bucket === 'partial') {
        partialPixiReadyCount += 1;
        canvasOnlyCount += 1;
        unsupportedCounts[kind] = (unsupportedCounts[kind] || 0) + 1;
      } else {
        canvasOnlyCount += 1;
        unsupportedCounts[kind] = (unsupportedCounts[kind] || 0) + 1;
        if (SPRITE_CANVAS_ONLY_KINDS[kind]) spriteDescriptorRequiredCount += 1;
      }
    }

    var unsupportedKinds = Object.keys(unsupportedCounts).sort();
    return {
      order: arr.length,
      kindCounts: kindCounts,
      staticWorldFacePacket: Number(kindCounts['static-world-face-packet'] || 0),
      prefabSprite: Number(kindCounts['prefab-sprite'] || 0),
      prefabSpritePart: Number(kindCounts['prefab-sprite-part'] || 0),
      playerAvatar: Number(kindCounts['player-avatar'] || 0),
      pixiReadyCount: pixiReadyCount,
      partialPixiReadyCount: partialPixiReadyCount,
      canvasOnlyCount: canvasOnlyCount,
      spriteDescriptorRequiredCount: spriteDescriptorRequiredCount,
      unsupportedKinds: unsupportedKinds,
      unsupportedKindsText: unsupportedKinds.join(',') || 'none',
      firstKind: firstKind,
      lastKind: lastKind
    };
  }

  function summarizeFramePlan(framePlan) {
    var order = framePlan && Array.isArray(framePlan.order) ? framePlan.order : [];
    var kindSummary = buildKindSummary(order);
    return Object.assign({}, kindSummary, {
      framePlanId: framePlan && framePlan.id ? String(framePlan.id) : 'unknown',
      signature: framePlan && framePlan.signature ? String(framePlan.signature) : '',
      currentViewRotation: framePlan && framePlan.currentViewRotation != null ? Number(framePlan.currentViewRotation) : null,
      countsRenderables: framePlan && framePlan.counts ? Number(framePlan.counts.renderables || 0) : order.length,
      countsStaticRenderableCount: framePlan && framePlan.counts ? Number(framePlan.counts.staticRenderableCount || 0) : 0,
      countsDynamicRenderableCount: framePlan && framePlan.counts ? Number(framePlan.counts.dynamicRenderableCount || 0) : 0
    });
  }

  function shouldEmitFrame(summary) {
    var signature = [
      summary.order,
      summary.staticWorldFacePacket,
      summary.prefabSprite,
      summary.prefabSpritePart,
      summary.playerAvatar,
      summary.pixiReadyCount,
      summary.partialPixiReadyCount,
      summary.canvasOnlyCount,
      summary.currentViewRotation,
      summary.unsupportedKindsText
    ].join('|');
    var current = nowMs();
    if (state.lastFrameSignature === signature && (current - Number(state.lastFrameLogAt || 0)) < 5000) return false;
    state.lastFrameSignature = signature;
    state.lastFrameLogAt = current;
    return true;
  }

  function emitSummary(summary, reason) {
    var snapshot = getBackendSnapshot();
    var active = snapshot.activeBackend || detectActiveBackend();
    var signature = [active, summary.order, summary.pixiReadyCount, summary.canvasOnlyCount, summary.unsupportedKindsText].join('|');
    if (state.summaryLogged && state.lastSummarySignature === signature) return;
    state.summaryLogged = true;
    state.lastSummarySignature = signature;
    emit('summary', {
      ok: active === 'canvas2d' && snapshot.pixiEnabled !== true,
      touchedFeature: 'framePlan-renderable-kind-diagnostics',
      active: active,
      order: summary.order,
      pixiReadyCount: summary.pixiReadyCount,
      partialPixiReadyCount: summary.partialPixiReadyCount,
      canvasOnlyCount: summary.canvasOnlyCount,
      unsupportedKinds: summary.unsupportedKindsText,
      canvas2dFallback: 'enabled',
      pixiRendererCreated: false,
      source: reason || 'frame-plan'
    });
  }

  function noteFramePlan(framePlan, extra) {
    maybeEmitStart('frame-plan');
    emitBackendStatus('frame-plan');
    emitFallbackStatus('frame-plan');
    var summary = summarizeFramePlan(framePlan);
    state.lastSummary = summary;
    if (shouldEmitFrame(summary)) {
      emit('frame', {
        active: detectActiveBackend(),
        framePlanId: summary.framePlanId,
        order: summary.order,
        staticWorldFacePacket: summary.staticWorldFacePacket,
        prefabSprite: summary.prefabSprite,
        prefabSpritePart: summary.prefabSpritePart,
        playerAvatar: summary.playerAvatar,
        pixiReadyCount: summary.pixiReadyCount,
        partialPixiReadyCount: summary.partialPixiReadyCount,
        canvasOnlyCount: summary.canvasOnlyCount,
        spriteDescriptorRequiredCount: summary.spriteDescriptorRequiredCount,
        unsupportedKinds: summary.unsupportedKindsText,
        kindCounts: summary.kindCounts,
        source: extra && extra.source ? String(extra.source) : 'buildRendererFramePlan'
      });
      emitSummary(summary, 'frame-plan');
    }
    return summary;
  }

  function noteRenderSummary(renderSummary) {
    maybeEmitStart('render-summary');
    var safe = renderSummary && typeof renderSummary === 'object' ? renderSummary : {};
    var active = detectActiveBackend();
    var signature = [active, safe.framePlanId || 'unknown', Number(safe.renderableCount || 0), safe.renderer || 'canvas2d'].join('|');
    var current = nowMs();
    if (state.lastRenderSignature === signature && (current - Number(state.lastRenderLogAt || 0)) < 5000) return safe;
    state.lastRenderSignature = signature;
    state.lastRenderLogAt = current;
    emit('render', {
      active: active,
      framePlanId: safe.framePlanId || 'unknown',
      renderableCount: Number(safe.renderableCount || 0),
      renderer: safe.renderer || 'canvas2d',
      buildFramePlanMs: Number(safe.buildFramePlanMs || 0),
      drawRenderableOrderMs: Number(safe.drawRenderableOrderMs || 0),
      touchedFeature: 'framePlan-renderable-kind-diagnostics',
      source: safe.source || 'render-summary'
    });
    return safe;
  }

  function getSnapshot() {
    return {
      step: STEP,
      phase: PHASE,
      owner: OWNER,
      started: !!state.started,
      activeBackend: detectActiveBackend(),
      lastSummary: state.lastSummary,
      canvas2dFallback: 'enabled',
      pixiRendererCreated: false,
      pixiEnabled: false
    };
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    step: STEP,
    noteFramePlan: noteFramePlan,
    noteRenderSummary: noteRenderSummary,
    getSnapshot: getSnapshot
  };

  global.__PIXI_MIGRATION_RENDERABLE_KIND_DIAGNOSTICS__ = api;
  try {
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationRenderableKinds', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}

  maybeEmitStart('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
