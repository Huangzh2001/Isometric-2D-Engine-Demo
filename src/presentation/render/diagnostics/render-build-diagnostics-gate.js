// P11a-7: Render build diagnostics gate.
// Layer: presentation/render/diagnostics.
//
// Owns render-facing diagnostic emitter gating for detailed terrain/static build
// profiling. The concrete diagnostic sink remains render-diagnostics.js; this
// module only decides whether detailed build emitters should be forwarded.
(function registerRenderBuildDiagnosticsGate(global) {
  function requireFn(deps, name) {
    if (deps && typeof deps[name] === 'function') return deps[name];
    throw new Error('render-build-diagnostics-gate requires injected ' + name + ' dependency');
  }

  function getDiagnostics(deps) {
    var requireRenderDiagnosticsForRender = requireFn(deps, 'requireRenderDiagnosticsForRender');
    var api = requireRenderDiagnosticsForRender();
    if (!api) throw new Error('render-build-diagnostics-gate requires render diagnostics API');
    return api;
  }

  function isDetailedTerrainProfilingEnabled(deps) {
    var isDetailedTerrainProfilingEnabledForRender = deps && deps.isDetailedTerrainProfilingEnabledForRender;
    if (typeof isDetailedTerrainProfilingEnabledForRender !== 'function') return false;
    return !!isDetailedTerrainProfilingEnabledForRender();
  }

  function emitDiagnostic(name, payload, deps, options) {
    var detailedOnly = !!(options && options.detailedOnly === true);
    if (detailedOnly && !isDetailedTerrainProfilingEnabled(deps)) return null;
    var diagnostics = getDiagnostics(deps);
    var fn = diagnostics && diagnostics[name];
    if (typeof fn !== 'function') throw new Error('render diagnostics API missing ' + name);
    return fn(payload);
  }

  function emitChunkRebuildBreakdown(payload, deps) {
    return emitDiagnostic('emitChunkRebuildBreakdown', payload, deps);
  }

  function emitChunkRebuildDetail(payload, deps) {
    return emitDiagnostic('emitChunkRebuildDetail', payload, deps, { detailedOnly: true });
  }

  function emitChunkRebuildScopeVerify(payload, deps) {
    return emitDiagnostic('emitChunkRebuildScopeVerify', payload, deps, { detailedOnly: true });
  }

  function emitChunkRebuildHotspot(payload, deps) {
    return emitDiagnostic('emitChunkRebuildHotspot', payload, deps, { detailedOnly: true });
  }

  function emitStaticRenderableBuildDetail(payload, deps) {
    return emitDiagnostic('emitStaticRenderableBuildDetail', payload, deps, { detailedOnly: true });
  }

  function emitStaticRenderableBuildHotspot(payload, deps) {
    return emitDiagnostic('emitStaticRenderableBuildHotspot', payload, deps, { detailedOnly: true });
  }

  function emitStaticRenderableBuildScopeVerify(payload, deps) {
    return emitDiagnostic('emitStaticRenderableBuildScopeVerify', payload, deps, { detailedOnly: true });
  }

  function emitColorBuildDetail(payload, deps) {
    return emitDiagnostic('emitColorBuildDetail', payload, deps, { detailedOnly: true });
  }

  function emitColorBuildHotspot(payload, deps) {
    return emitDiagnostic('emitColorBuildHotspot', payload, deps, { detailedOnly: true });
  }

  function emitBuildColorPathVerify(payload, deps) {
    return emitDiagnostic('emitBuildColorPathVerify', payload, deps, { detailedOnly: true });
  }

  function emitColorBuildMissBreakdown(payload, deps) {
    return emitDiagnostic('emitColorBuildMissBreakdown', payload, deps, { detailedOnly: true });
  }

  function emitStep4ColorBuildDetail(payload, deps) {
    return emitDiagnostic('emitStep4ColorBuildDetail', payload, deps, { detailedOnly: true });
  }

  function emitStep4ColorBuildHotspot(payload, deps) {
    return emitDiagnostic('emitStep4ColorBuildHotspot', payload, deps, { detailedOnly: true });
  }

  function emitStep4ColorBuildScopeVerify(payload, deps) {
    return emitDiagnostic('emitStep4ColorBuildScopeVerify', payload, deps);
  }

  function emitLightingShadowBypassVerify(payload, deps) {
    return emitDiagnostic('emitLightingShadowBypassVerify', payload, deps);
  }

  function emitStep4ShadowPathSummary(payload, deps) {
    return emitDiagnostic('emitStep4ShadowPathSummary', payload, deps);
  }

  var api = {
    layer: 'presentation/render/diagnostics',
    phase: 'P11a-7',
    emitChunkRebuildBreakdown: emitChunkRebuildBreakdown,
    emitChunkRebuildDetail: emitChunkRebuildDetail,
    emitChunkRebuildScopeVerify: emitChunkRebuildScopeVerify,
    emitChunkRebuildHotspot: emitChunkRebuildHotspot,
    emitStaticRenderableBuildDetail: emitStaticRenderableBuildDetail,
    emitStaticRenderableBuildHotspot: emitStaticRenderableBuildHotspot,
    emitStaticRenderableBuildScopeVerify: emitStaticRenderableBuildScopeVerify,
    emitColorBuildDetail: emitColorBuildDetail,
    emitColorBuildHotspot: emitColorBuildHotspot,
    emitBuildColorPathVerify: emitBuildColorPathVerify,
    emitColorBuildMissBreakdown: emitColorBuildMissBreakdown,
    emitStep4ColorBuildDetail: emitStep4ColorBuildDetail,
    emitStep4ColorBuildHotspot: emitStep4ColorBuildHotspot,
    emitStep4ColorBuildScopeVerify: emitStep4ColorBuildScopeVerify,
    emitLightingShadowBypassVerify: emitLightingShadowBypassVerify,
    emitStep4ShadowPathSummary: emitStep4ShadowPathSummary
  };

  global.IsometricRenderBuildDiagnosticsGate = api;
  global.__RENDER_BUILD_DIAGNOSTICS_GATE__ = api;
  global.__APP_PRESENTATION_RENDER_BUILD_DIAGNOSTICS_GATE__ = api;
})(typeof window !== 'undefined' ? window : globalThis);
