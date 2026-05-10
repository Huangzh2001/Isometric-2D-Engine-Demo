// PXM-07.11D diagnostics: keep Pixi-owned migrated world visuals in Pixi during zoom.
// Layer: presentation/render/diagnostics.
(function registerPixiMigrationPixiZoomOwnershipDiagnostics(global) {
  if (!global) return;
  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-zoom-ownership-diagnostics.js';
  var STEP = 'PXM-07.11D';
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
    return Object.keys(payload).map(function (key) {
      return String(key) + '=' + stringifyValue(payload[key]);
    }).join(' ');
  }

  function emit(section, payload, opts) {
    section = String(section || 'event');
    payload = payload || {};
    opts = opts || {};
    var signature = [
      payload.activeBackend || '',
      payload.zoomInteractionActive === true ? 1 : 0,
      payload.zoomSettlePending === true ? 1 : 0,
      payload.pixiModeKeepsMigratedPartsInPixi === true ? 1 : 0,
      payload.zoomCanvasWorldTakeoverDisabled === true ? 1 : 0,
      payload.canvas2dOwnsWholeWorldDuringZoom === true ? 1 : 0,
      payload.pixiWorldVisualSuppressed === true ? 1 : 0,
      payload.pixiFloorKeptDuringZoom === true ? 1 : 0,
      payload.pixiStaticKeptDuringZoom === true ? 1 : 0,
      payload.pixiPlayerKeptDuringZoom === true ? 1 : 0,
      payload.pixiDynamicKeptDuringZoom === true ? 1 : 0
    ].join('|');
    state.emitCountBySection[section] = Number(state.emitCountBySection[section] || 0) + 1;
    var shouldEmit = opts.force === true || state.emitCountBySection[section] <= 10 || state.lastSignatureBySection[section] !== signature;
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
      touchedFeature: 'pixi-zoom-ownership-correction',
      diagnosticOnly: true,
      modifiesRendering: false,
      changesDepthSort: false,
      changesPicking: false,
      source: 'module-load'
    }, { force: true });
  }

  function notePixiZoomOwnership(payload) {
    emitStart();
    payload = payload && typeof payload === 'object' ? payload : {};
    var summary = {
      ok: payload.ok !== false,
      activeBackend: payload.activeBackend || 'unknown',
      zoomInteractionActive: payload.zoomInteractionActive === true,
      zoomSettlePending: payload.zoomSettlePending === true,
      zoom: Number(payload.zoom || 0),
      pixiModeKeepsMigratedPartsInPixi: payload.pixiModeKeepsMigratedPartsInPixi === true,
      zoomCanvasWorldTakeoverDisabled: payload.zoomCanvasWorldTakeoverDisabled === true,
      canvas2dOwnsWholeWorldDuringZoom: payload.canvas2dOwnsWholeWorldDuringZoom === true,
      pixiWorldVisualSuppressed: payload.pixiWorldVisualSuppressed === true,
      pixiFloorKeptDuringZoom: payload.pixiFloorKeptDuringZoom === true,
      pixiStaticKeptDuringZoom: payload.pixiStaticKeptDuringZoom === true,
      pixiPlayerKeptDuringZoom: payload.pixiPlayerKeptDuringZoom === true,
      pixiDynamicKeptDuringZoom: payload.pixiDynamicKeptDuringZoom === true,
      migratedPartsStayPixi: payload.migratedPartsStayPixi === true,
      fallbackOnlyForUnsupportedRenderables: payload.fallbackOnlyForUnsupportedRenderables === true,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: payload.source || 'pixi-zoom-ownership'
    };
    emit('ownership', summary, { force: payload.force === true });
    state.lastSummary = summary;
    emit('summary', summary);
    return summary;
  }

  var api = {
    owner: OWNER,
    step: STEP,
    notePixiZoomOwnership: notePixiZoomOwnership,
    getLastSummary: function () { return state.lastSummary || null; }
  };
  try {
    global.__PIXI_MIGRATION_PIXI_ZOOM_OWNERSHIP_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationPixiZoomOwnership', api, { owner: OWNER, step: STEP });
    }
  } catch (_) {
    global.__PIXI_MIGRATION_PIXI_ZOOM_OWNERSHIP_DIAGNOSTICS__ = api;
  }
  emitStart();
})(typeof window !== 'undefined' ? window : globalThis);
