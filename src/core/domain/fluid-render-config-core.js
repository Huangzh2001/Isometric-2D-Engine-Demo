(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/fluid-render-config-core.js';
  var PHASE = 'FLUID-RENDER-CONFIG-V1';
  var config = {
    surfaceSubdivisions: 2,
    topSubdivisionLinesEnabled: true,
    edgeCurveStrength: 0
  };

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function normalizeSurfaceSubdivisions(value) {
    var n = Math.round(toNumber(value, 2));
    if (n < 2) n = 2;
    if (n > 16) n = 16;
    return n;
  }

  function normalizeEdgeCurveStrength(value) {
    return Math.max(0, Math.min(1, toNumber(value, 0)));
  }

  function normalizeTopSubdivisionLinesEnabled(value) {
    return value !== false;
  }

  function setSurfaceSubdivisions(value, meta) {
    var next = normalizeSurfaceSubdivisions(value);
    var prev = config.surfaceSubdivisions;
    config.surfaceSubdivisions = next;
    return {
      ok: true,
      previous: prev,
      value: next,
      source: meta && meta.source ? String(meta.source) : 'unknown'
    };
  }

  function getSurfaceSubdivisions() {
    return normalizeSurfaceSubdivisions(config.surfaceSubdivisions);
  }

  function setTopSubdivisionLinesEnabled(value, meta) {
    var next = normalizeTopSubdivisionLinesEnabled(value);
    var prev = config.topSubdivisionLinesEnabled;
    config.topSubdivisionLinesEnabled = next;
    return {
      ok: true,
      previous: prev,
      value: next,
      source: meta && meta.source ? String(meta.source) : 'unknown'
    };
  }

  function getTopSubdivisionLinesEnabled() {
    return normalizeTopSubdivisionLinesEnabled(config.topSubdivisionLinesEnabled);
  }

  function setEdgeCurveStrength(value, meta) {
    var next = normalizeEdgeCurveStrength(value);
    var prev = config.edgeCurveStrength;
    config.edgeCurveStrength = next;
    return {
      ok: true,
      previous: prev,
      value: next,
      source: meta && meta.source ? String(meta.source) : 'unknown'
    };
  }

  function getEdgeCurveStrength() {
    return normalizeEdgeCurveStrength(config.edgeCurveStrength);
  }

  function summarize() {
    return {
      owner: OWNER,
      phase: PHASE,
      surfaceSubdivisions: getSurfaceSubdivisions(),
      topSubdivisionLinesEnabled: getTopSubdivisionLinesEnabled(),
      edgeCurveStrength: getEdgeCurveStrength()
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    normalizeSurfaceSubdivisions: normalizeSurfaceSubdivisions,
    normalizeEdgeCurveStrength: normalizeEdgeCurveStrength,
    normalizeTopSubdivisionLinesEnabled: normalizeTopSubdivisionLinesEnabled,
    setSurfaceSubdivisions: setSurfaceSubdivisions,
    getSurfaceSubdivisions: getSurfaceSubdivisions,
    setTopSubdivisionLinesEnabled: setTopSubdivisionLinesEnabled,
    getTopSubdivisionLinesEnabled: getTopSubdivisionLinesEnabled,
    setEdgeCurveStrength: setEdgeCurveStrength,
    getEdgeCurveStrength: getEdgeCurveStrength,
    summarize: summarize
  };

  window.__FLUID_RENDER_CONFIG_CORE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('domain.fluidRenderConfigCore', api, { owner: OWNER, phase: PHASE });
  }
})();
