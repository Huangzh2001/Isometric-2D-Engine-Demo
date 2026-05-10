// PXM-07.9E: PixiJS static-run glitch localization diagnostics.
// Layer: presentation/render/diagnostics.
//
// This is diagnostics-only. It records adoption-plan transitions, sprite bounds,
// orphan cleanup, and Canvas2D skip decisions so horizontal-line/flicker issues can
// be localized before changing rendering behavior again.
(function registerPixiStaticRunGlitchDiagnostics(global) {
  if (!global) return;
  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-static-run-glitch-diagnostics.js';
  var STEP = 'PXM-07.9E';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var started = false;
  var lastSignatureBySection = Object.create(null);
  var lastAtBySection = Object.create(null);
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
      touchedFeature: 'pixi-static-run-horizontal-line-and-flicker-localization',
      diagnosticsOnly: true,
      modifiesRendering: false,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false
    });
  }

  function normalize(payload, meta) {
    payload = payload || {};
    meta = meta || {};
    return Object.assign({
      ok: payload.ok !== false,
      activeBackend: payload.activeBackend || 'unknown',
      diagnosticsOnly: true,
      modifiesRendering: false,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: payload.source || meta.source || 'pixi-static-run-glitch-probe'
    }, payload);
  }

  function makeSignature(section, payload) {
    payload = payload || {};
    if (section === 'sprite-bounds') {
      return [
        section,
        payload.activeBackend || '',
        payload.adoptionRevision || 0,
        payload.activeVisualSpriteCount || 0,
        payload.removedOrphanPixiStaticSprites || 0,
        payload.possibleHorizontalLineRiskCount || 0,
        stringify(payload.sampleVisualSprites || [])
      ].join('|');
    }
    if (section === 'plan-transition') {
      return [
        section,
        payload.activeBackend || '',
        payload.adoptionRevision || 0,
        payload.visualStaticRunAdoption ? 1 : 0,
        payload.previousVisualPlanRunKeyCount || 0,
        payload.currentVisualPlanRunKeyCount || 0,
        payload.adoptionToggledOn ? 1 : 0,
        payload.adoptionToggledOff ? 1 : 0,
        payload.removedOrphanPixiStaticSprites || 0,
        payload.fallbackReason || ''
      ].join('|');
    }
    if (section === 'canvas2d-skip-debug') {
      return [
        section,
        payload.activeBackend || '',
        payload.runKey || '',
        payload.planFresh ? 1 : 0,
        payload.skipDecision ? 1 : 0,
        payload.planRevision || 0,
        payload.adoptionRevision || 0,
        payload.skipReason || ''
      ].join('|');
    }
    return section + '|' + stringify(payload);
  }

  function shouldEmit(section, payload) {
    var now = nowMs();
    var sig = makeSignature(section, payload);
    var lastSig = lastSignatureBySection[section] || '';
    var lastAt = Number(lastAtBySection[section] || 0);
    var anomaly = payload.adoptionToggledOn === true || payload.adoptionToggledOff === true ||
      Number(payload.removedOrphanPixiStaticSprites || 0) > 0 ||
      Number(payload.possibleHorizontalLineRiskCount || 0) > 0 ||
      payload.planFresh === false || payload.skipDecision === false;
    if (sig !== lastSig || anomaly || now - lastAt > 2000) {
      lastSignatureBySection[section] = sig;
      lastAtBySection[section] = now;
      return true;
    }
    return false;
  }

  function notePixiStaticRunGlitchProbe(payload, meta) {
    maybeStart();
    var normalized = normalize(payload, meta);
    var section = String(normalized.section || 'event');
    lastSummary = normalized;
    if (shouldEmit(section, normalized)) emit(section, normalized);
    if (section !== 'summary') {
      var summary = {
        ok: normalized.ok,
        activeBackend: normalized.activeBackend,
        diagnosticsOnly: true,
        lastSection: section,
        adoptionRevision: Number(normalized.adoptionRevision || 0),
        visualStaticRunAdoption: normalized.visualStaticRunAdoption === true,
        activeVisualSpriteCount: Number(normalized.activeVisualSpriteCount || normalized.currentVisualPlanRunKeyCount || 0),
        previousVisualPlanRunKeyCount: Number(normalized.previousVisualPlanRunKeyCount || 0),
        currentVisualPlanRunKeyCount: Number(normalized.currentVisualPlanRunKeyCount || 0),
        removedOrphanPixiStaticSprites: Number(normalized.removedOrphanPixiStaticSprites || 0),
        possibleHorizontalLineRiskCount: Number(normalized.possibleHorizontalLineRiskCount || 0),
        planFresh: normalized.planFresh !== false,
        skipDecision: normalized.skipDecision !== false,
        modifiesRendering: false,
        changesDepthSort: false,
        changesPicking: false,
        source: normalized.source
      };
      if (shouldEmit('summary', summary)) emit('summary', summary);
    }
    return normalized;
  }

  var api = {
    owner: OWNER,
    step: STEP,
    notePixiStaticRunGlitchProbe: notePixiStaticRunGlitchProbe,
    getLastSummary: function () { return lastSummary; }
  };

  try {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_GLITCH_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiStaticRunGlitchDiagnostics', api, { owner: OWNER, step: STEP });
    }
  } catch (_) {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_GLITCH_DIAGNOSTICS__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
