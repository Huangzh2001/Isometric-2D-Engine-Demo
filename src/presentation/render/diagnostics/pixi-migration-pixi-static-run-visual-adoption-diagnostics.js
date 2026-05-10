// PXM-07.9A: PixiJS depth-aware static-run visual adoption diagnostics.
// Layer: presentation/render/diagnostics.
(function registerPixiStaticRunVisualAdoptionDiagnostics(global) {
  if (!global) return;
  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-static-run-visual-adoption-diagnostics.js';
  var STEP = 'PXM-07.9A';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var started = false;
  var lastSummarySignature = '';
  var lastEventSignature = '';
  var lastEventAt = 0;
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
      touchedFeature: 'pixi-static-run-depth-aware-visual-adoption',
      adoptionPolicy: 'prefix-static-run-only',
      modifiesRendering: true,
      changesDepthSort: false,
      changesPicking: false,
      canvas2dFallback: 'enabled'
    });
  }

  function makeSignature(payload) {
    payload = payload || {};
    return [
      payload.section || '',
      payload.activeBackend || '',
      payload.visualStaticRunAdoption ? 1 : 0,
      Number(payload.depthSafeAdoptedRunCount || 0),
      Number(payload.canvas2dSkipPlannedRunCount || 0),
      Number(payload.canvas2dSkippedAdoptedRun ? 1 : 0),
      payload.fallbackReason || ''
    ].join('|');
  }

  function notePixiStaticRunVisualAdoption(payload, meta) {
    maybeStart();
    payload = payload || {};
    meta = meta || {};
    var section = payload.section || (payload.canvas2dSkippedAdoptedRun ? 'canvas2d-skip' : (payload.visualStaticRunAdoption ? 'visual-adoption' : 'fallback'));
    var normalized = Object.assign({
      ok: payload.ok !== false,
      activeBackend: payload.activeBackend || 'unknown',
      visualStaticRunAdoption: payload.visualStaticRunAdoption === true,
      pixiDrawsStaticPacketRuns: payload.pixiDrawsStaticPacketRuns === true,
      depthSafeAdoptedRunCount: Number(payload.depthSafeAdoptedRunCount || 0),
      canvas2dSkipPlannedRunCount: Number(payload.canvas2dSkipPlannedRunCount || 0),
      canvas2dSkippedAdoptedRun: payload.canvas2dSkippedAdoptedRun === true,
      canvas2dStaticFallback: payload.canvas2dStaticFallback || 'enabled-for-nonadopted-runs',
      depthInterleavingProtected: payload.depthInterleavingProtected !== false,
      onlyPrefixBeforeFirstDynamic: payload.onlyPrefixBeforeFirstDynamic !== false,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: payload.source || meta.source || 'pixi-static-run-visual-adoption'
    }, payload);
    lastPayload = normalized;
    var sig = makeSignature(normalized);
    var now = nowMs();
    if (sig !== lastEventSignature || now - lastEventAt > 2000 || section === 'canvas2d-skip') {
      lastEventSignature = sig;
      lastEventAt = now;
      emit(section, normalized);
    }
    var summarySig = [normalized.activeBackend, normalized.visualStaticRunAdoption ? 1 : 0, normalized.depthSafeAdoptedRunCount, normalized.canvas2dSkipPlannedRunCount, normalized.fallbackReason || ''].join('|');
    if (summarySig !== lastSummarySignature || now - lastEventAt > 2000) {
      lastSummarySignature = summarySig;
      emit('summary', {
        ok: true,
        activeBackend: normalized.activeBackend,
        visualStaticRunAdoption: normalized.visualStaticRunAdoption,
        pixiDrawsStaticPacketRuns: normalized.pixiDrawsStaticPacketRuns,
        depthSafeAdoptedRunCount: normalized.depthSafeAdoptedRunCount,
        canvas2dSkipPlannedRunCount: normalized.canvas2dSkipPlannedRunCount,
        canvas2dStaticFallback: normalized.canvas2dStaticFallback,
        depthInterleavingProtected: true,
        onlyPrefixBeforeFirstDynamic: true,
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
    notePixiStaticRunVisualAdoption: notePixiStaticRunVisualAdoption,
    getLastSummary: function () { return lastPayload; }
  };

  try {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_VISUAL_ADOPTION_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiStaticRunVisualAdoption', api, { owner: OWNER, step: STEP });
    }
  } catch (_) {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_VISUAL_ADOPTION_DIAGNOSTICS__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
