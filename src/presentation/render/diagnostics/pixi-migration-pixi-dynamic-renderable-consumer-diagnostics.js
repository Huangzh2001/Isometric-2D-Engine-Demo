// PXM-07.11A diagnostics: PixiJS dynamic prefab-sprite visual adoption.
// Layer: presentation/render/diagnostics.
(function registerPixiDynamicRenderableConsumerDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-dynamic-renderable-consumer-diagnostics.js';
  var STEP = 'PXM-07.11A';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var started = false;
  var lastSignatures = Object.create(null);
  var lastEmitAt = Object.create(null);

  function nowMs() {
    try { if (global.performance && typeof global.performance.now === 'function') return global.performance.now(); } catch (_) {}
    return Date.now();
  }

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

  function emit(section, payload) {
    var line = PREFIX + '[' + String(section || 'event') + ']';
    var extra = formatPayload(payload);
    if (extra) line += ' ' + extra;
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function shouldEmit(section, signature, intervalMs) {
    var key = String(section || 'event');
    var now = nowMs();
    if (lastSignatures[key] !== signature || now - Number(lastEmitAt[key] || 0) >= Number(intervalMs || 1500)) {
      lastSignatures[key] = signature;
      lastEmitAt[key] = now;
      return true;
    }
    return false;
  }

  function maybeStart() {
    if (started) return;
    started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: 'pixi-dynamic-prefab-sprite-visual-adoption-diagnostics',
      targetKinds: 'prefab-sprite',
      experimentalDynamicAdoption: true,
      modifiesRendering: true,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: 'module-load'
    });
  }

  function notePixiDynamicRenderableConsumer(payload, meta) {
    maybeStart();
    payload = payload || {};
    meta = meta || {};
    var section = String(meta.section || payload.section || 'event');
    var signature = [
      section,
      payload.framePlanId || '',
      payload.renderableId || '',
      payload.kind || '',
      payload.instanceId || '',
      payload.prefabId || '',
      payload.adoptedDynamicRenderableCount || '',
      payload.activeDynamicSpriteCount || '',
      payload.fallbackReason || ''
    ].join('|');
    var interval = section === 'summary' ? 750 : 2000;
    if (!shouldEmit(section, signature, interval)) return;
    emit(section, Object.assign({
      activeBackend: payload.activeBackend || 'pixi',
      targetKinds: payload.targetKinds || 'prefab-sprite',
      experimentalDynamicAdoption: payload.experimentalDynamicAdoption !== false,
      pixiDrawsDynamicRenderables: payload.pixiDrawsDynamicRenderables === true || payload.pixiDrawsDynamicRenderable === true,
      canvas2dSkipsAdoptedDynamicRenderables: payload.canvas2dSkipsAdoptedDynamicRenderables === true || payload.canvas2dSkipsDynamicRenderable === true,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: payload.source || meta.source || 'pixi-dynamic-renderable-consumer-diagnostics'
    }, payload));
  }

  maybeStart();
  global.__PIXI_MIGRATION_PIXI_DYNAMIC_RENDERABLE_CONSUMER_DIAGNOSTICS__ = {
    owner: OWNER,
    step: STEP,
    notePixiDynamicRenderableConsumer: notePixiDynamicRenderableConsumer
  };
})(typeof window !== 'undefined' ? window : globalThis);
