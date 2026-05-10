// PXM-07.9F: PixiJS static-run stable adoption and sprite edge diagnostics.
// Layer: presentation/render/diagnostics.
(function registerPixiStaticRunStableAdoptionDiagnostics(global) {
  if (!global) return;
  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-static-run-stable-adoption-diagnostics.js';
  var STEP = 'PXM-07.9F';
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
      touchedFeature: 'pixi-static-run-stable-adoption-and-sprite-edge-fix',
      stableCommittedPlan: true,
      spritePixelSnapping: true,
      textureSamplingGuardApplied: true,
      modifiesRendering: true,
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
      stableCommittedPlan: true,
      spriteEdgeFixApplied: true,
      spritePixelSnapping: true,
      textureSamplingGuardApplied: true,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: payload.source || meta.source || 'pixi-static-run-stable-adoption'
    }, payload);
  }

  function makeSignature(section, payload) {
    payload = payload || {};
    return [
      section || '',
      payload.activeBackend || '',
      payload.visualStaticRunAdoption ? 1 : 0,
      payload.adoptedRunCount || 0,
      payload.committedPlanRetainedCount || 0,
      payload.orphanPixiStaticSprites || 0,
      payload.spritePixelSnappedCount || 0,
      payload.possibleHorizontalLineRiskCount || 0,
      payload.fallbackReason || ''
    ].join('|');
  }

  function shouldEmit(section, payload) {
    var now = nowMs();
    var sig = makeSignature(section, payload);
    var lastSig = lastSignatureBySection[section] || '';
    var lastAt = Number(lastAtBySection[section] || 0);
    var important = Number(payload.committedPlanRetainedCount || 0) > 0 ||
      Number(payload.orphanPixiStaticSprites || 0) > 0 ||
      Number(payload.possibleHorizontalLineRiskCount || 0) > 0 ||
      section === 'summary';
    if (sig !== lastSig || important || now - lastAt > 2000) {
      lastSignatureBySection[section] = sig;
      lastAtBySection[section] = now;
      return true;
    }
    return false;
  }

  function notePixiStaticRunStableAdoption(payload, meta) {
    maybeStart();
    var normalized = normalize(payload, meta);
    var section = String(normalized.section || 'event');
    lastSummary = normalized;
    if (shouldEmit(section, normalized)) emit(section, normalized);
    if (section !== 'summary') {
      var summary = {
        ok: normalized.ok,
        activeBackend: normalized.activeBackend,
        stableCommittedPlan: true,
        visualStaticRunAdoption: normalized.visualStaticRunAdoption === true,
        pixiDrawsStaticPacketRuns: normalized.pixiDrawsStaticPacketRuns === true,
        adoptedRunCount: Number(normalized.adoptedRunCount || 0),
        committedPlanRetainedCount: Number(normalized.committedPlanRetainedCount || 0),
        totalCommittedPlanRetainedCount: Number(normalized.totalCommittedPlanRetainedCount || 0),
        orphanPixiStaticSprites: Number(normalized.orphanPixiStaticSprites || 0),
        activeVisualSpriteCount: Number(normalized.activeVisualSpriteCount || 0),
        spritePixelSnapping: true,
        spritePixelSnappedCount: Number(normalized.spritePixelSnappedCount || 0),
        textureSamplingGuardApplied: true,
        possibleHorizontalLineRiskCount: Number(normalized.possibleHorizontalLineRiskCount || 0),
        adoptionToggledOffPrevented: normalized.adoptionToggledOffPrevented === true,
        changesDepthSort: false,
        changesPicking: false,
        pixiOwnsPicking: false,
        pixiSortChildren: false,
        pixiZIndexUsed: false,
        source: normalized.source
      };
      if (shouldEmit('summary', summary)) emit('summary', summary);
    }
    return normalized;
  }

  var api = {
    owner: OWNER,
    step: STEP,
    notePixiStaticRunStableAdoption: notePixiStaticRunStableAdoption,
    getLastSummary: function () { return lastSummary; }
  };

  try {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_STABLE_ADOPTION_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiStaticRunStableAdoption', api, { owner: OWNER, step: STEP });
    }
  } catch (_) {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_STABLE_ADOPTION_DIAGNOSTICS__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
