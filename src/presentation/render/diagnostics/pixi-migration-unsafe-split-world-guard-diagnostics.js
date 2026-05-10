// PXM-07.11E: unsafe split-world adoption guard diagnostics.
// Layer: presentation/render/diagnostics.
(function registerPixiMigrationUnsafeSplitWorldGuardDiagnostics(global) {
  if (!global) return;
  var STEP = 'PXM-07.11E';
  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-unsafe-split-world-guard-diagnostics.js';
  var lastSignature = '';
  function stringifyValue(value) {
    if (value == null) return String(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }
  function formatPayload(payload) {
    return Object.keys(payload || {}).map(function (key) { return String(key) + '=' + stringifyValue(payload[key]); }).join(' ');
  }
  function emit(section, payload) {
    payload = Object.assign({
      owner: OWNER,
      activeBackend: 'pixi',
      unsafeInterleavedWorldAdoptionDisabled: true,
      pixiWorldKeepsFloorOnly: true,
      pixiPlayerVisualAdoptionDisabled: true,
      pixiDynamicVisualAdoptionDisabled: true,
      pixiStaticVisualAdoptionDisabled: true,
      canvas2dDrawsInterleavedWorldRenderables: true,
      reason: 'prevent-split-world-depth-and-zoom-seams',
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false
    }, payload || {});
    var sig = String(section || '') + '|' + JSON.stringify(payload);
    // Light throttle: log only when state changes or every explicit summary source.
    if (sig === lastSignature && section !== 'summary') return;
    lastSignature = sig;
    var line = '[pixi-migration][step=' + STEP + '][' + String(section || 'event') + '] ' + formatPayload(payload);
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }
  function noteUnsafeSplitWorldGuard(payload, options) {
    payload = payload || {};
    options = options || {};
    payload.source = payload.source || options.source || 'pixi-unsafe-split-world-guard';
    emit(payload.section || options.section || 'summary', payload);
  }
  var api = { owner: OWNER, step: STEP, noteUnsafeSplitWorldGuard: noteUnsafeSplitWorldGuard };
  global.__PIXI_MIGRATION_UNSAFE_SPLIT_WORLD_GUARD_DIAGNOSTICS__ = api;
  emit('start', { source: 'module-load' });
})(typeof window !== 'undefined' ? window : globalThis);
