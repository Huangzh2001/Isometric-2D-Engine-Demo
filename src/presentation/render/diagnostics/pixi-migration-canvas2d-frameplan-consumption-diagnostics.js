// PXM-04: Canvas2D framePlan consumption diagnostics.
// Layer: presentation/render/diagnostics.
//
// This module only verifies and logs that the existing Canvas2D backend
// consumes framePlan.order as its draw-order source. It does not mutate
// framePlan/order, change depth sorting, draw, initialize PixiJS, or own input /
// picking / editor state.
(function registerPixiMigrationCanvas2dFramePlanConsumptionDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-canvas2d-frameplan-consumption-diagnostics.js';
  var STEP = 'PXM-04';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var PHASE = 'pixi-migration-canvas2d-frameplan-consumption-diagnostics';

  var state = {
    started: false,
    backendLogged: false,
    fallbackLogged: false,
    summaryLogged: false,
    lastBackendSignature: '',
    lastFrameSignature: '',
    lastFrameLogAt: 0,
    lastDrawSignature: '',
    lastDrawLogAt: 0,
    lastRenderSignature: '',
    lastRenderLogAt: 0,
    lastSummarySignature: '',
    lastConsumption: null
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
      touchedFeature: 'canvas2d-framePlan-consumption-boundary',
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
      touchedFeature: 'canvas2d-framePlan-consumption-boundary',
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
      reason: reason || 'canvas2d-default-backend'
    });
  }

  function stableRenderOrderToken(renderable) {
    var safe = renderable && typeof renderable === 'object' ? renderable : {};
    return [
      safe.id != null ? String(safe.id) : '',
      safe.kind != null ? String(safe.kind) : 'unknown',
      safe.sortKey != null ? String(safe.sortKey) : '',
      safe.tie != null ? String(safe.tie) : '',
      safe.instanceId != null ? String(safe.instanceId) : '',
      safe.prefabId != null ? String(safe.prefabId) : '',
      safe.faceKey != null ? String(safe.faceKey) : ''
    ].join('#');
  }

  function hashString(value) {
    var source = String(value || '');
    var hash = 2166136261;
    for (var i = 0; i < source.length; i++) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function summarizeFramePlan(framePlan) {
    var order = framePlan && Array.isArray(framePlan.order) ? framePlan.order : [];
    var first = order.length ? order[0] : null;
    var last = order.length ? order[order.length - 1] : null;
    var tokens = [];
    for (var i = 0; i < order.length; i++) tokens.push(stableRenderOrderToken(order[i]));
    var orderHash = hashString(tokens.join('|'));
    return {
      framePlanId: framePlan && framePlan.id ? String(framePlan.id) : 'unknown',
      signature: framePlan && framePlan.signature ? String(framePlan.signature) : '',
      currentViewRotation: framePlan && framePlan.currentViewRotation != null ? Number(framePlan.currentViewRotation) : null,
      order: order.length,
      orderHash: orderHash,
      firstRenderableId: first && first.id != null ? String(first.id) : 'none',
      firstRenderableKind: first && first.kind != null ? String(first.kind) : 'none',
      lastRenderableId: last && last.id != null ? String(last.id) : 'none',
      lastRenderableKind: last && last.kind != null ? String(last.kind) : 'none',
      countsRenderables: framePlan && framePlan.counts ? Number(framePlan.counts.renderables || 0) : order.length,
      countsStaticRenderableCount: framePlan && framePlan.counts ? Number(framePlan.counts.staticRenderableCount || 0) : 0,
      countsDynamicRenderableCount: framePlan && framePlan.counts ? Number(framePlan.counts.dynamicRenderableCount || 0) : 0
    };
  }

  function shouldEmit(kind, signature, intervalMs) {
    var current = nowMs();
    var sigKey = kind === 'draw' ? 'lastDrawSignature' : (kind === 'render' ? 'lastRenderSignature' : 'lastFrameSignature');
    var atKey = kind === 'draw' ? 'lastDrawLogAt' : (kind === 'render' ? 'lastRenderLogAt' : 'lastFrameLogAt');
    if (state[sigKey] === signature && (current - Number(state[atKey] || 0)) < Number(intervalMs || 5000)) return false;
    state[sigKey] = signature;
    state[atKey] = current;
    return true;
  }

  function emitSummary(summary, reason) {
    var snapshot = getBackendSnapshot();
    var active = snapshot.activeBackend || detectActiveBackend();
    var signature = [active, summary.order, summary.orderHash, summary.framePlanId].join('|');
    if (state.summaryLogged && state.lastSummarySignature === signature) return;
    state.summaryLogged = true;
    state.lastSummarySignature = signature;
    emit('summary', {
      ok: active === 'canvas2d' && snapshot.pixiEnabled !== true && summary.canvas2dConsumedFramePlan === true,
      touchedFeature: 'canvas2d-framePlan-consumption-boundary',
      active: active,
      framePlanId: summary.framePlanId,
      order: summary.order,
      orderHash: summary.orderHash,
      canvas2dConsumedFramePlan: summary.canvas2dConsumedFramePlan === true,
      orderSource: 'framePlan.order',
      drawMethod: 'drawRenderableOrder',
      depthSortOwner: 'legacy-framePlan',
      canvas2dFallback: 'enabled',
      pixiRendererCreated: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: reason || 'frame-plan-consumption'
    });
  }

  function noteFramePlanReady(framePlan, extra) {
    maybeEmitStart('frame-plan-ready');
    emitBackendStatus('frame-plan-ready');
    emitFallbackStatus('frame-plan-ready');
    var summary = summarizeFramePlan(framePlan);
    summary.canvas2dConsumedFramePlan = false;
    state.lastConsumption = Object.assign({}, summary);
    var signature = [summary.framePlanId, summary.order, summary.orderHash, summary.currentViewRotation].join('|');
    if (shouldEmit('frame', signature, 5000)) {
      emit('frame', {
        active: detectActiveBackend(),
        framePlanId: summary.framePlanId,
        order: summary.order,
        orderHash: summary.orderHash,
        firstRenderableId: summary.firstRenderableId,
        firstRenderableKind: summary.firstRenderableKind,
        lastRenderableId: summary.lastRenderableId,
        lastRenderableKind: summary.lastRenderableKind,
        orderSource: 'framePlan.order',
        canvas2dConsumedFramePlan: false,
        source: extra && extra.source ? String(extra.source) : 'buildFramePlan'
      });
    }
    return summary;
  }

  function noteCanvas2dFramePlanConsumption(framePlan, extra) {
    maybeEmitStart('canvas2d-frame-plan-consumption');
    emitBackendStatus('canvas2d-frame-plan-consumption');
    emitFallbackStatus('canvas2d-frame-plan-consumption');
    var summary = summarizeFramePlan(framePlan);
    summary.canvas2dConsumedFramePlan = true;
    state.lastConsumption = Object.assign({}, summary);
    var signature = [summary.framePlanId, summary.order, summary.orderHash, extra && extra.stage || 'after-draw'].join('|');
    if (shouldEmit('draw', signature, 5000)) {
      emit('draw', {
        active: detectActiveBackend(),
        framePlanId: summary.framePlanId,
        order: summary.order,
        orderHash: summary.orderHash,
        canvas2dConsumedFramePlan: true,
        orderSource: 'framePlan.order',
        drawMethod: 'drawRenderableOrder',
        drawRenderableOrderMs: extra && extra.drawRenderableOrderMs != null ? Number(extra.drawRenderableOrderMs || 0) : 0,
        pixiSortChildren: false,
        pixiZIndexUsed: false,
        source: extra && extra.source ? String(extra.source) : 'canvas2d-frame-pipeline'
      });
      emitSummary(summary, 'draw');
    }
    return summary;
  }

  function noteRenderSummary(renderSummary) {
    maybeEmitStart('render-summary');
    var safe = renderSummary && typeof renderSummary === 'object' ? renderSummary : {};
    var last = state.lastConsumption || {};
    var framePlanId = safe.framePlanId || last.framePlanId || 'unknown';
    var orderHash = safe.orderHash || last.orderHash || 'unknown';
    var renderableCount = Number(safe.renderableCount || last.order || 0);
    var active = detectActiveBackend();
    var signature = [active, framePlanId, orderHash, renderableCount, safe.renderer || 'canvas2d'].join('|');
    if (!shouldEmit('render', signature, 5000)) return safe;
    emit('render', {
      active: active,
      framePlanId: framePlanId,
      renderableCount: renderableCount,
      orderHash: orderHash,
      renderer: safe.renderer || 'canvas2d',
      canvas2dConsumedFramePlan: last.canvas2dConsumedFramePlan === true,
      buildFramePlanMs: Number(safe.buildFramePlanMs || 0),
      drawRenderableOrderMs: Number(safe.drawRenderableOrderMs || 0),
      touchedFeature: 'canvas2d-framePlan-consumption-boundary',
      source: safe.source || 'render-summary'
    });
    if (last && last.framePlanId) emitSummary(last, 'render-summary');
    return safe;
  }

  function getSnapshot() {
    return {
      step: STEP,
      phase: PHASE,
      owner: OWNER,
      started: !!state.started,
      activeBackend: detectActiveBackend(),
      lastConsumption: state.lastConsumption,
      canvas2dFallback: 'enabled',
      pixiRendererCreated: false,
      pixiEnabled: false
    };
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    step: STEP,
    noteFramePlanReady: noteFramePlanReady,
    noteCanvas2dFramePlanConsumption: noteCanvas2dFramePlanConsumption,
    noteRenderSummary: noteRenderSummary,
    getSnapshot: getSnapshot
  };

  global.__PIXI_MIGRATION_CANVAS2D_FRAMEPLAN_CONSUMPTION_DIAGNOSTICS__ = api;
  try {
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationCanvas2dFramePlanConsumption', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}

  maybeEmitStart('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
