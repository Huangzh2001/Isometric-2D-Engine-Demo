// PXM-07.11C diagnostics: zoom-time single world owner guard.
// Layer: presentation/render/diagnostics.
(function registerPixiMigrationZoomSingleWorldOwnerDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-zoom-single-world-owner-diagnostics.js';
  var STEP = 'PXM-07.11C';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var state = {
    started: false,
    lastSignatureBySection: Object.create(null),
    emitCountBySection: Object.create(null),
    lastSummary: null
  };

  function stringifyValue(value) {
    if (value == null) return String(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }

  function formatPayload(payload) {
    if (!payload || typeof payload !== 'object') return '';
    return Object.keys(payload).map(function (key) { return String(key) + '=' + stringifyValue(payload[key]); }).join(' ');
  }

  function emit(section, payload, opts) {
    section = String(section || 'event');
    payload = payload || {};
    opts = opts || {};
    var signature = [
      payload.zoomSingleWorldOwnerActive === true ? 1 : 0,
      payload.canvas2dOwnsWholeWorldDuringZoom === true ? 1 : 0,
      payload.pixiWorldVisualSuppressed === true ? 1 : 0,
      payload.pixiFloorSuppressed === true ? 1 : 0,
      payload.pixiPlayerSuppressed === true ? 1 : 0,
      payload.pixiStaticSuppressed === true ? 1 : 0,
      payload.pixiDynamicSuppressed === true ? 1 : 0,
      payload.mixedRendererSplitDetected === true ? 1 : 0,
      payload.fallbackReason || ''
    ].join('|');
    state.emitCountBySection[section] = Number(state.emitCountBySection[section] || 0) + 1;
    var shouldEmit = opts.force === true || state.emitCountBySection[section] <= 8 || state.lastSignatureBySection[section] !== signature;
    state.lastSignatureBySection[section] = signature;
    if (!shouldEmit) return false;
    var line = PREFIX + '[' + section + '] ' + formatPayload(payload);
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
    return true;
  }

  function emitStart() {
    if (state.started) return;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: 'zoom-single-world-owner-guard-diagnostics',
      diagnosticOnly: false,
      changesPicking: false,
      changesDepthSort: false,
      source: 'module-load'
    }, { force: true });
  }

  function noteZoomSingleWorldOwner(payload) {
    emitStart();
    payload = payload && typeof payload === 'object' ? payload : {};
    var summary = {
      ok: payload.ok !== false,
      activeBackend: payload.activeBackend || 'unknown',
      zoomSingleWorldOwnerActive: payload.zoomSingleWorldOwnerActive === true,
      zoomInteractionActive: payload.zoomInteractionActive === true,
      zoomSettlePending: payload.zoomSettlePending === true,
      zoom: Number(payload.zoom || 0),
      canvas2dOwnsWholeWorldDuringZoom: payload.canvas2dOwnsWholeWorldDuringZoom === true,
      pixiWorldVisualSuppressed: payload.pixiWorldVisualSuppressed === true,
      pixiFloorSuppressed: payload.pixiFloorSuppressed === true,
      pixiStaticSuppressed: payload.pixiStaticSuppressed === true,
      pixiPlayerSuppressed: payload.pixiPlayerSuppressed === true,
      pixiDynamicSuppressed: payload.pixiDynamicSuppressed === true,
      canvas2dBaseWorldOverrideApplied: payload.canvas2dBaseWorldOverrideApplied === true,
      mixedRendererSplitDetected: payload.mixedRendererSplitDetected === true,
      seamRiskPrevented: payload.seamRiskPrevented === true,
      objectFloorAlignmentProbeNeeded: payload.objectFloorAlignmentProbeNeeded === true,
      fallbackReason: payload.fallbackReason || '',
      changesDepthSort: false,
      changesPicking: false,
      changesRenderOrder: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: payload.source || 'zoom-single-world-owner-guard'
    };
    var section = String(payload.section || (summary.zoomSingleWorldOwnerActive ? 'single-world-owner' : 'inactive'));
    emit(section, summary, { force: payload.force === true });
    state.lastSummary = summary;
    emit('summary', summary);
    return summary;
  }

  var api = {
    owner: OWNER,
    step: STEP,
    noteZoomSingleWorldOwner: noteZoomSingleWorldOwner,
    getLastSummary: function () { return state.lastSummary || null; }
  };

  try {
    global.__PIXI_MIGRATION_ZOOM_SINGLE_WORLD_OWNER_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationZoomSingleWorldOwner', api, { owner: OWNER, step: STEP });
    }
  } catch (_) {
    global.__PIXI_MIGRATION_ZOOM_SINGLE_WORLD_OWNER_DIAGNOSTICS__ = api;
  }
  emitStart();
})(typeof window !== 'undefined' ? window : globalThis);
