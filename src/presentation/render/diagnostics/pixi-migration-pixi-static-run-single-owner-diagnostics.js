// PXM-07.9D: PixiJS static-run single adoption owner diagnostics.
// Layer: presentation/render/diagnostics.
(function registerPixiStaticRunSingleOwnerDiagnostics(global) {
  if (!global) return;
  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-static-run-single-owner-diagnostics.js';
  var STEP = 'PXM-07.9D';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var started = false;
  var lastEventSignature = '';
  var lastSummarySignature = '';
  var lastAt = 0;
  var lastSummary = null;

  function nowMs() {
    try { return global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }

  function stringify(value) {
    if (value == null) return String(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }

  function emit(section, payload) {
    payload = payload || {};
    var line = PREFIX + '[' + String(section || 'event') + ']';
    var keys = Object.keys(payload);
    if (keys.length) line += ' ' + keys.map(function (key) { return key + '=' + stringify(payload[key]); }).join(' ');
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function maybeStart() {
    if (started) return;
    started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: 'single-static-run-adoption-owner-cleanup',
      adoptionOwner: 'segmented-static-adoption-single-owner',
      singleAdoptionOwner: true,
      disablesLegacyPXM079AVisualOwner: true,
      disablesFullStaticAdoption: true,
      stalePlanBlocksCanvas2dSkip: true,
      orphanPixiStaticSpritesTarget: 0,
      modifiesRendering: true,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false
    });
  }

  function makeSignature(payload) {
    payload = payload || {};
    return [
      payload.section || '',
      payload.activeBackend || '',
      payload.adoptionRevision || 0,
      payload.adoptedRunCount || 0,
      payload.canvas2dSkipPlannedRunCount || 0,
      payload.canvas2dSkippedOnlyFreshAdoptedRuns ? 1 : 0,
      payload.stalePlanBlocksCanvas2dSkip ? 1 : 0,
      payload.orphanPixiStaticSprites || 0,
      payload.fallbackReason || ''
    ].join('|');
  }

  function normalize(payload, meta) {
    payload = payload || {};
    meta = meta || {};
    return Object.assign({
      ok: payload.ok !== false,
      activeBackend: payload.activeBackend || 'unknown',
      adoptionOwner: 'segmented-static-adoption-single-owner',
      singleAdoptionOwner: true,
      legacyPXM079AVisualOwnerDisabled: true,
      legacyPXM079ACanvas2dSkipDisabled: true,
      experimentalFullStaticAdoption: false,
      fullStaticAdoptionDisabled: true,
      adoptionPolicy: payload.adoptionPolicy || 'single-owner-prefix-exclusive',
      visualStaticRunAdoption: payload.visualStaticRunAdoption === true,
      pixiDrawsStaticPacketRuns: payload.pixiDrawsStaticPacketRuns === true,
      adoptedRunCount: Number(payload.adoptedRunCount || payload.depthSafeAdoptedRunCount || 0),
      canvas2dSkipPlannedRunCount: Number(payload.canvas2dSkipPlannedRunCount || 0),
      canvas2dSkippedOnlyFreshAdoptedRuns: payload.canvas2dSkippedOnlyFreshAdoptedRuns !== false,
      stalePlanBlocksCanvas2dSkip: payload.stalePlanBlocksCanvas2dSkip !== false,
      staleCanvas2dSkipBlocked: Number(payload.staleCanvas2dSkipBlocked || 0),
      orphanPixiStaticSprites: Number(payload.orphanPixiStaticSprites || 0),
      activeVisualSpriteCount: Number(payload.activeVisualSpriteCount || 0),
      runKey: payload.runKey || '',
      runStartIndex: Number(payload.runStartIndex || 0),
      packetCount: Number(payload.packetCount || 0),
      adoptionRevision: Number(payload.adoptionRevision || 0),
      planRevision: Number(payload.planRevision || 0),
      runKeyRevisionMatched: payload.runKeyRevisionMatched !== false,
      noDoubleDrawForAdoptedRuns: payload.noDoubleDrawForAdoptedRuns !== false,
      canvas2dFallback: payload.canvas2dFallback || 'enabled-for-nonadopted-runs-only',
      depthInterleavingProtected: payload.depthInterleavingProtected !== false,
      onlyPrefixBeforeFirstDynamic: payload.onlyPrefixBeforeFirstDynamic !== false,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: payload.source || meta.source || 'pixi-static-run-single-owner-cleanup'
    }, payload);
  }

  function notePixiStaticRunSingleOwner(payload, meta) {
    maybeStart();
    var normalized = normalize(payload, meta);
    var section = normalized.section || 'event';
    lastSummary = normalized;
    var now = nowMs();
    var sig = makeSignature(normalized);
    var shouldEmit = sig !== lastEventSignature || now - lastAt > 2000 || section === 'ownership-violation' || section === 'canvas2d-skip';
    if (shouldEmit) {
      lastEventSignature = sig;
      lastAt = now;
      emit(section, normalized);
    }
    var summarySig = [
      normalized.activeBackend,
      normalized.adoptionRevision,
      normalized.adoptedRunCount,
      normalized.canvas2dSkipPlannedRunCount,
      normalized.orphanPixiStaticSprites,
      normalized.staleCanvas2dSkipBlocked
    ].join('|');
    if (summarySig !== lastSummarySignature || now - lastAt > 2000) {
      lastSummarySignature = summarySig;
      emit('summary', {
        ok: normalized.ok,
        activeBackend: normalized.activeBackend,
        adoptionOwner: normalized.adoptionOwner,
        singleAdoptionOwner: true,
        legacyPXM079AVisualOwnerDisabled: true,
        visualStaticRunAdoption: normalized.visualStaticRunAdoption,
        pixiDrawsStaticPacketRuns: normalized.pixiDrawsStaticPacketRuns,
        adoptedRunCount: normalized.adoptedRunCount,
        canvas2dSkipPlannedRunCount: normalized.canvas2dSkipPlannedRunCount,
        canvas2dSkippedOnlyFreshAdoptedRuns: normalized.canvas2dSkippedOnlyFreshAdoptedRuns,
        stalePlanBlocksCanvas2dSkip: normalized.stalePlanBlocksCanvas2dSkip,
        staleCanvas2dSkipBlocked: normalized.staleCanvas2dSkipBlocked,
        orphanPixiStaticSprites: normalized.orphanPixiStaticSprites,
        depthInterleavingProtected: normalized.depthInterleavingProtected,
        onlyPrefixBeforeFirstDynamic: normalized.onlyPrefixBeforeFirstDynamic,
        changesDepthSort: false,
        changesPicking: false,
        source: normalized.source
      });
    }
    return normalized;
  }

  var api = {
    owner: OWNER,
    step: STEP,
    notePixiStaticRunSingleOwner: notePixiStaticRunSingleOwner,
    getLastSummary: function () { return lastSummary; }
  };

  try {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_SINGLE_OWNER_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiStaticRunSingleOwner', api, { owner: OWNER, step: STEP });
    }
  } catch (_) {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_SINGLE_OWNER_DIAGNOSTICS__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
