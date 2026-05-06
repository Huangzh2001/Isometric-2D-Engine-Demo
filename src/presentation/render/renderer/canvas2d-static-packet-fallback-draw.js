(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/presentation/render/renderer/canvas2d-static-packet-fallback-draw.js';
  var PHASE = 'P11c-4';

  function nowMs(deps) {
    if (deps && typeof deps.now === 'function') return deps.now();
    try { if (window.performance && typeof window.performance.now === 'function') return window.performance.now(); } catch (_) {}
    return Date.now();
  }

  function safeFixed(deps, value) {
    if (deps && typeof deps.safeFixed === 'function') return deps.safeFixed(value);
    var n = Number(value || 0);
    return Number(n.toFixed ? n.toFixed(3) : n);
  }

  function getRenderableKind(deps, renderable) {
    try {
      if (deps && typeof deps.getRenderableKind === 'function') return deps.getRenderableKind(renderable);
    } catch (_) {}
    if (!renderable) return 'unknown';
    return String(renderable.kind || renderable.renderPath || 'unknown');
  }

  function drawStaticWorldFacePacket(deps, renderable) {
    try {
      if (deps && typeof deps.drawStaticWorldFacePacket === 'function') return deps.drawStaticWorldFacePacket(renderable);
    } catch (_) {}
    return undefined;
  }

  function drawFaceDebugOverlayRenderable(deps, renderable, index) {
    try {
      if (deps && typeof deps.drawFaceDebugOverlayRenderable === 'function') {
        return deps.drawFaceDebugOverlayRenderable(renderable, index);
      }
    } catch (_) {}
    return undefined;
  }

  function ensureStats(stats) {
    stats = stats || {};
    stats.staticPacketDrawLoopMs = Number(stats.staticPacketDrawLoopMs || 0);
    stats.staticPacketGeometryCacheHitCount = Number(stats.staticPacketGeometryCacheHitCount || 0);
    stats.staticPacketGeometryCacheMissCount = Number(stats.staticPacketGeometryCacheMissCount || 0);
    stats.staticPacketOverlayCacheHitCount = Number(stats.staticPacketOverlayCacheHitCount || 0);
    stats.staticPacketOverlayCacheMissCount = Number(stats.staticPacketOverlayCacheMissCount || 0);
    return stats;
  }

  function prepareStaticPacketForFallbackDraw(packet, meta, index) {
    if (!packet) return null;
    meta = meta || {};
    packet.currentViewRotation = packet.currentViewRotation != null
      ? packet.currentViewRotation
      : ((typeof meta.currentViewRotation === 'number')
        ? meta.currentViewRotation
        : (packet.cacheViewRotation != null ? packet.cacheViewRotation : 0));
    packet.framePlanId = packet.framePlanId || meta.framePlanId || null;
    packet.__drawIndex = Number(meta.runStartIndex || 0) + Number(index || 0);
    return packet;
  }

  function accumulateStaticPacketFallbackCacheStats(packet, stats) {
    stats = ensureStats(stats);
    var packetCacheState = packet && packet.__lastStaticPacketCacheState ? packet.__lastStaticPacketCacheState : null;
    if (packetCacheState && packetCacheState.geometryCacheHit === true) stats.staticPacketGeometryCacheHitCount += 1;
    else stats.staticPacketGeometryCacheMissCount += 1;
    if (packetCacheState && packetCacheState.overlayCount > 0) {
      if (packetCacheState.overlayCacheHit === true) stats.staticPacketOverlayCacheHitCount += 1;
      else stats.staticPacketOverlayCacheMissCount += 1;
    }
    return stats;
  }

  function buildSlowRenderablePayload(deps, packet, meta, index, elapsedMs) {
    meta = meta || {};
    var drawIndex = Number(meta.runStartIndex || 0) + Number(index || 0);
    return {
      index: drawIndex,
      id: packet && (packet.id || packet.instanceId || null),
      kind: getRenderableKind(deps, packet),
      ms: safeFixed(deps, elapsedMs)
    };
  }

  function drawStaticPacketRunFallback(deps, packets, meta, stats, trackSlowRenderable) {
    packets = Array.isArray(packets) ? packets : [];
    meta = meta || {};
    stats = ensureStats(stats);
    for (var i = 0; i < packets.length; i += 1) {
      var packet = prepareStaticPacketForFallbackDraw(packets[i], meta, i);
      var renderableStartAt = nowMs(deps);
      drawStaticWorldFacePacket(deps, packet);
      if (packet) drawFaceDebugOverlayRenderable(deps, packet, Number(meta.runStartIndex || 0) + i);
      var renderableMs = Math.max(0, nowMs(deps) - renderableStartAt);
      stats.staticPacketDrawLoopMs += renderableMs;
      accumulateStaticPacketFallbackCacheStats(packet, stats);
      if (typeof trackSlowRenderable === 'function') {
        trackSlowRenderable(buildSlowRenderablePayload(deps, packet, meta, i, renderableMs));
      }
    }
    return stats;
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    ensureStats: ensureStats,
    prepareStaticPacketForFallbackDraw: prepareStaticPacketForFallbackDraw,
    accumulateStaticPacketFallbackCacheStats: accumulateStaticPacketFallbackCacheStats,
    buildSlowRenderablePayload: buildSlowRenderablePayload,
    drawStaticPacketRunFallback: drawStaticPacketRunFallback
  };

  try {
    window.__CANVAS2D_STATIC_PACKET_FALLBACK_DRAW__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.canvas2dStaticPacketFallbackDraw', api, { owner: OWNER, phase: PHASE });
      window.__APP_NAMESPACE.bind('renderer.diagnostics.canvas2dStaticPacketFallbackDraw', api, { owner: OWNER, phase: PHASE });
    } else {
      window.App = window.App || {};
      window.App.renderer = window.App.renderer || {};
      window.App.renderer.canvas2dStaticPacketFallbackDraw = api;
      window.App.renderer.diagnostics = window.App.renderer.diagnostics || {};
      window.App.renderer.diagnostics.canvas2dStaticPacketFallbackDraw = api;
    }
  } catch (_) {
    window.__CANVAS2D_STATIC_PACKET_FALLBACK_DRAW__ = api;
  }
})();
