(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/fluid-render-config-core.js';
  var PHASE = 'FLUID-RENDER-CONFIG-V1';
  var config = {
    surfaceSubdivisions: 2,
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
      edgeCurveStrength: getEdgeCurveStrength()
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    normalizeSurfaceSubdivisions: normalizeSurfaceSubdivisions,
    normalizeEdgeCurveStrength: normalizeEdgeCurveStrength,
    setSurfaceSubdivisions: setSurfaceSubdivisions,
    getSurfaceSubdivisions: getSurfaceSubdivisions,
    setEdgeCurveStrength: setEdgeCurveStrength,
    getEdgeCurveStrength: getEdgeCurveStrength,
    summarize: summarize
  };

  window.__FLUID_RENDER_CONFIG_CORE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('domain.fluidRenderConfigCore', api, { owner: OWNER, phase: PHASE });
  }
})();
