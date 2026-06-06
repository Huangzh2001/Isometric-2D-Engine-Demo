(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/terrain-height-surface-config-core.js';
  var PHASE = 'TERRAIN-HEIGHT-SURFACE-CONFIG-V0';
  var config = {
    enabled: true,
    connectThreshold: 0.35,
    surfaceSubdivisions: 4,
    topLinesEnabled: false
  };

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function normalizeEnabled(value) { return value !== false; }
  function normalizeConnectThreshold(value) { return Math.max(0, Math.min(2, toNumber(value, 0.35))); }
  function normalizeSurfaceSubdivisions(value) {
    var n = Math.round(toNumber(value, 4));
    if (n < 1) n = 1;
    if (n > 16) n = 16;
    return n;
  }
  function normalizeTopLinesEnabled(value) { return value === true; }

  function setEnabled(value, meta) {
    var prev = config.enabled;
    config.enabled = normalizeEnabled(value);
    return { ok: true, previous: prev, value: config.enabled, source: meta && meta.source ? String(meta.source) : 'unknown' };
  }
  function getEnabled() { return normalizeEnabled(config.enabled); }

  function setConnectThreshold(value, meta) {
    var prev = config.connectThreshold;
    config.connectThreshold = normalizeConnectThreshold(value);
    return { ok: true, previous: prev, value: config.connectThreshold, source: meta && meta.source ? String(meta.source) : 'unknown' };
  }
  function getConnectThreshold() { return normalizeConnectThreshold(config.connectThreshold); }

  function setSurfaceSubdivisions(value, meta) {
    var prev = config.surfaceSubdivisions;
    config.surfaceSubdivisions = normalizeSurfaceSubdivisions(value);
    return { ok: true, previous: prev, value: config.surfaceSubdivisions, source: meta && meta.source ? String(meta.source) : 'unknown' };
  }
  function getSurfaceSubdivisions() { return normalizeSurfaceSubdivisions(config.surfaceSubdivisions); }

  function setTopLinesEnabled(value, meta) {
    var prev = config.topLinesEnabled;
    config.topLinesEnabled = normalizeTopLinesEnabled(value);
    return { ok: true, previous: prev, value: config.topLinesEnabled, source: meta && meta.source ? String(meta.source) : 'unknown' };
  }
  function getTopLinesEnabled() { return normalizeTopLinesEnabled(config.topLinesEnabled); }

  function summarize() {
    return {
      owner: OWNER,
      phase: PHASE,
      enabled: getEnabled(),
      connectThreshold: getConnectThreshold(),
      surfaceSubdivisions: getSurfaceSubdivisions(),
      topLinesEnabled: getTopLinesEnabled()
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    normalizeEnabled: normalizeEnabled,
    normalizeConnectThreshold: normalizeConnectThreshold,
    normalizeSurfaceSubdivisions: normalizeSurfaceSubdivisions,
    normalizeTopLinesEnabled: normalizeTopLinesEnabled,
    setEnabled: setEnabled,
    getEnabled: getEnabled,
    setConnectThreshold: setConnectThreshold,
    getConnectThreshold: getConnectThreshold,
    setSurfaceSubdivisions: setSurfaceSubdivisions,
    getSurfaceSubdivisions: getSurfaceSubdivisions,
    setTopLinesEnabled: setTopLinesEnabled,
    getTopLinesEnabled: getTopLinesEnabled,
    summarize: summarize
  };

  window.__TERRAIN_HEIGHT_SURFACE_CONFIG_CORE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('domain.terrainHeightSurfaceConfigCore', api, { owner: OWNER, phase: PHASE });
  }
})();
