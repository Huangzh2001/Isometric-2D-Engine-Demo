// P12b-10: actor support-top sort override boundary.
// Layer: presentation/render/interaction.
// Owns the player support-top sort override only. It must not own replacement, stable-local demerge, or diagnostics runtime state.
(function registerActorSupportTopSortOverride(global) {
  'use strict';

  var OWNER = {
    phase: 'P12b-10',
    layer: 'presentation/render/interaction',
    owner: 'actor-support-top-sort-override',
    responsibility: 'player support-top sort override only'
  };

  var __deps = null;
  function fallbackValue(value) { return typeof value === 'function' ? value() : value; }
  function withDeps(deps, fn) {
    var prev = __deps;
    __deps = deps && typeof deps === 'object' ? deps : null;
    try { return fn(); } finally { __deps = prev; }
  }
  function callDep(name, args, fallback) {
    var fn = __deps && typeof __deps[name] === 'function' ? __deps[name] : null;
    if (!fn && global && typeof global[name] === 'function') fn = global[name];
    if (fn) return fn.apply(null, args || []);
    return fallbackValue(fallback);
  }
  function safeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function getStableActorSortApiForRender() { return callDep('getStableActorSortApiForRender', [], null); }
  function isStableActorSortModeEnabledForRender() { return callDep('isStableActorSortModeEnabledForRender', [], true) !== false; }
  function computeActorInteractionPlayerSortMeta(playerRef, viewRotation) { return callDep('computeActorInteractionPlayerSortMeta', [playerRef, viewRotation], { sortKey: 0, tie: 0 }); }
  function compareRenderablesByDomain(a, b) { return callDep('compareRenderablesByDomain', [a, b], function () { return (safeNumber(a && a.sortKey, 0) - safeNumber(b && b.sortKey, 0)) || (safeNumber(a && a.tie, 0) - safeNumber(b && b.tie, 0)); }); }
  function summarizeActorDiagRenderable(renderable) { return callDep('summarizeActorDiagRenderable', [renderable], renderable || null); }
  function summarizeActorDiagPlayer(player) { return callDep('summarizeActorDiagPlayer', [player], player || null); }
  function emitActorInteractionOrderDiag(tag, payload, options) { return callDep('emitActorInteractionOrderDiag', [tag, payload, options], false); }
  function isActorInteractionOrderDiagEnabled() { return callDep('isActorInteractionOrderDiagEnabled', [], false) === true; }
  function normalizeMainEditorViewRotationValue(value) { return callDep('normalizeMainEditorViewRotationValue', [value], function () { return safeNumber(value, 0); }); }
  function buildActorInteractionGroupSummaryMapFromPackets(renderables) { return callDep('buildActorInteractionGroupSummaryMapFromPackets', [renderables], function () { return new Map(); }); }
  function doesTopPacketActAsPlayerSupportFloor(packet, playerRef, groupSummaryMap) { return callDep('doesTopPacketActAsPlayerSupportFloor', [packet, playerRef, groupSummaryMap], false) === true; }

  function applyPlayerSupportTopSortOverrideToRenderables(staticRenderables, playerRef, viewRotation) {
    var list = Array.isArray(staticRenderables) ? staticRenderables : [];
    var stableActorSortApi = getStableActorSortApiForRender();
    if (stableActorSortApi && typeof stableActorSortApi.applyStablePlayerFaceSort === 'function' && isStableActorSortModeEnabledForRender()) {
      if (isActorInteractionOrderDiagEnabled()) {
        emitActorInteractionOrderDiag('support-top-sort-entry', {
          version: 'support-top-sort-entry-diag-v1-20260508',
          functionPath: 'actor-support-top-sort-override.applyPlayerSupportTopSortOverrideToRenderables -> stableActorSortApi.applyStablePlayerFaceSort',
          behaviorNote: 'diagnostic-only payload; support sort behavior is unchanged by this log',
          stableActorSortApiVersion: stableActorSortApi.version != null ? String(stableActorSortApi.version) : null,
          viewRotation: normalizeMainEditorViewRotationValue(viewRotation),
          staticRenderableCount: list.length,
          player: summarizeActorDiagPlayer(playerRef)
        }, { maxCount: 6000 });
      }
      return stableActorSortApi.applyStablePlayerFaceSort({
        staticRenderables: list,
        player: playerRef,
        viewRotation: viewRotation,
        helpers: {
          computePlayerSortMeta: computeActorInteractionPlayerSortMeta,
          compareRenderables: compareRenderablesByDomain,
          summarizeRenderable: summarizeActorDiagRenderable,
          summarizePlayer: summarizeActorDiagPlayer,
          emitDiag: emitActorInteractionOrderDiag
        }
      });
    }
    if (!list.length || !playerRef) {
      return { staticRenderables: list, overrideCount: 0, overrideSamples: [] };
    }
    var playerSortMeta = computeActorInteractionPlayerSortMeta(playerRef, viewRotation);
    var overrideCount = 0;
    var samples = [];
    var out = list.slice();
    var groupSummaryMap = buildActorInteractionGroupSummaryMapFromPackets(out);
    for (var i = 0; i < out.length; i++) {
      var packet = out[i];
      if (!doesTopPacketActAsPlayerSupportFloor(packet, playerRef, groupSummaryMap)) continue;
      var originalTie = Number(packet && packet.tie != null ? packet.tie : 0);
      var clone = Object.assign({}, packet, {
        sortKey: Number(playerSortMeta.sortKey || 0) - 0.0012,
        tie: Number(playerSortMeta.tie || 0) - 120 + ((Math.abs(originalTie) % 1000) * 0.000001),
        actorInteractionSupportTopSortOverride: true,
        actorInteractionSupportFloor: true,
        actorInteractionGroupSortRelation: 'support-top-before-player',
        actorInteractionGroupFootprintMode: 'support-top-only-no-split',
        renderPath: String(packet && packet.renderPath || 'static-world-chunk-packet') + '+support-top-sort-override'
      });
      out[i] = clone;
      overrideCount += 1;
      if (samples.length < 16) samples.push(summarizeActorDiagRenderable(clone));
    }
    if (overrideCount > 0) out.sort(compareRenderablesByDomain);
    if (overrideCount > 0 && isActorInteractionOrderDiagEnabled()) {
      emitActorInteractionOrderDiag('support-top-sort-override', {
        viewRotation: normalizeMainEditorViewRotationValue(viewRotation),
        player: summarizeActorDiagPlayer(playerRef),
        overrideCount: overrideCount,
        samples: samples
      }, { maxCount: 6000 });
    }
    return { staticRenderables: out, overrideCount: overrideCount, overrideSamples: samples };
  }

  function summarizeBoundary() {
    return {
      owner: OWNER.owner,
      phase: OWNER.phase,
      layer: OWNER.layer,
      owns: ['player-support-top-sort-override'],
      doesNotOwn: ['actor-interaction-replacement', 'stable-local-demerge', 'diagnostics-runtime', 'canvas-drawing']
    };
  }

  var api = {
    __owner: OWNER,
    summarizeBoundary: summarizeBoundary,
    applyPlayerSupportTopSortOverrideToRenderables: function (staticRenderables, playerRef, viewRotation, deps) { return withDeps(deps, function () { return applyPlayerSupportTopSortOverrideToRenderables(staticRenderables, playerRef, viewRotation); }); }
  };

  global.IsometricActorSupportTopSortOverride = api;
  global.__ACTOR_SUPPORT_TOP_SORT_OVERRIDE__ = api;
  global.__APP_PRESENTATION_ACTOR_SUPPORT_TOP_SORT_OVERRIDE__ = api;
  if (global.App) {
    global.App.presentation = global.App.presentation || {};
    global.App.presentation.render = global.App.presentation.render || {};
    global.App.presentation.render.interaction = global.App.presentation.render.interaction || {};
    global.App.presentation.render.interaction.actorSupportTopSortOverride = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
