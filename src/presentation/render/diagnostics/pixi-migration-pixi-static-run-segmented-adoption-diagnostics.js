// PXM-07.9C: PixiJS segmented static-run adoption diagnostics.
// Layer: presentation/render/diagnostics.
(function registerPixiStaticRunSegmentedAdoptionDiagnostics(global) {
  if (!global) return;
  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-static-run-segmented-adoption-diagnostics.js';
  var STEP = 'PXM-07.9C';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var started = false;
  var lastSignature = '';
  var lastSummarySignature = '';
  var lastAt = 0;
  var lastPayload = null;

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
      touchedFeature: 'pixi-static-run-segmented-adoption-step1-prefix-exclusive',
      splitPlanStep: '1/3',
      fullStaticAdoptionDisabled: true,
      experimentalFullStaticAdoption: false,
      adoptionPolicy: 'segmented-prefix-exclusive-step1',
      noDoubleDrawForAdoptedRuns: true,
      canvas2dFallback: 'enabled-for-nonadopted-runs-only',
      modifiesRendering: true,
      changesDepthSort: false,
      changesPicking: false
    });
  }

  function makeSignature(payload) {
    payload = payload || {};
    return [
      payload.section || '',
      payload.activeBackend || '',
      payload.visualStaticRunAdoption ? 1 : 0,
      Number(payload.adoptedSegmentCount || 0),
      Number(payload.nonAdoptedSegmentCount || 0),
      Number(payload.unsafeAfterDynamicSegmentCount || 0),
      payload.adoptionPolicy || ''
    ].join('|');
  }

  function notePixiStaticRunSegmentedAdoption(payload, meta) {
    maybeStart();
    payload = payload || {};
    meta = meta || {};
    var section = payload.section || 'event';
    var normalized = Object.assign({
      ok: payload.ok !== false,
      activeBackend: payload.activeBackend || 'unknown',
      splitPlanStep: payload.splitPlanStep || '1/3',
      currentStage: payload.currentStage || 'prefix-exclusive-adoption-plus-segment-classifier',
      nextStage: payload.nextStage || 'depth-segment-plan-review',
      finalStage: payload.finalStage || 'single-renderer-or-mixed-depth-handoff',
      adoptionPolicy: payload.adoptionPolicy || 'segmented-prefix-exclusive-step1',
      fullStaticAdoptionDisabled: true,
      experimentalFullStaticAdoption: false,
      visualStaticRunAdoption: payload.visualStaticRunAdoption === true,
      pixiDrawsStaticPacketRuns: payload.pixiDrawsStaticPacketRuns === true,
      segmentCount: Number(payload.segmentCount || 0),
      prefixSafeSegmentCount: Number(payload.prefixSafeSegmentCount || 0),
      adoptedSegmentCount: Number(payload.adoptedSegmentCount || 0),
      nonAdoptedSegmentCount: Number(payload.nonAdoptedSegmentCount || 0),
      unsafeAfterDynamicSegmentCount: Number(payload.unsafeAfterDynamicSegmentCount || 0),
      unsafeCrossDynamicSegmentCount: Number(payload.unsafeCrossDynamicSegmentCount || 0),
      canvas2dSkipPlannedRunCount: Number(payload.canvas2dSkipPlannedRunCount || 0),
      pixiOwnsAdoptedStaticRuns: payload.pixiOwnsAdoptedStaticRuns === true,
      canvas2dSkipsAdoptedRuns: payload.canvas2dSkipsAdoptedRuns === true,
      noDoubleDrawForAdoptedRuns: payload.noDoubleDrawForAdoptedRuns !== false,
      nonAdoptedStaticFallback: payload.nonAdoptedStaticFallback || 'canvas2d-temporary-until-pixi-depth-handoff',
      canvas2dFallback: payload.canvas2dFallback || 'enabled-for-nonadopted-runs-only',
      depthInterleavingProtected: payload.depthInterleavingProtected !== false,
      onlyPrefixBeforeFirstDynamic: payload.onlyPrefixBeforeFirstDynamic !== false,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: payload.source || meta.source || 'pixi-static-run-segmented-adoption'
    }, payload);
    lastPayload = normalized;
    var now = nowMs();
    var sig = makeSignature(normalized);
    if (sig !== lastSignature || now - lastAt > 2000 || section === 'exclusive-ownership') {
      lastSignature = sig;
      lastAt = now;
      emit(section, normalized);
    }
    var summarySig = [normalized.activeBackend, normalized.adoptedSegmentCount, normalized.nonAdoptedSegmentCount, normalized.fullStaticAdoptionDisabled ? 1 : 0].join('|');
    if (summarySig !== lastSummarySignature || now - lastAt > 2000) {
      lastSummarySignature = summarySig;
      emit('summary', {
        ok: true,
        activeBackend: normalized.activeBackend,
        splitPlanStep: normalized.splitPlanStep,
        currentStage: normalized.currentStage,
        adoptionPolicy: normalized.adoptionPolicy,
        fullStaticAdoptionDisabled: true,
        experimentalFullStaticAdoption: false,
        visualStaticRunAdoption: normalized.visualStaticRunAdoption,
        pixiDrawsStaticPacketRuns: normalized.pixiDrawsStaticPacketRuns,
        segmentCount: normalized.segmentCount,
        adoptedSegmentCount: normalized.adoptedSegmentCount,
        nonAdoptedSegmentCount: normalized.nonAdoptedSegmentCount,
        noDoubleDrawForAdoptedRuns: normalized.noDoubleDrawForAdoptedRuns,
        canvas2dFallback: normalized.canvas2dFallback,
        depthInterleavingProtected: true,
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
    notePixiStaticRunSegmentedAdoption: notePixiStaticRunSegmentedAdoption,
    getLastSummary: function () { return lastPayload; }
  };

  try {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_SEGMENTED_ADOPTION_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiStaticRunSegmentedAdoption', api, { owner: OWNER, step: STEP });
    }
  } catch (_) {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_SEGMENTED_ADOPTION_DIAGNOSTICS__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
