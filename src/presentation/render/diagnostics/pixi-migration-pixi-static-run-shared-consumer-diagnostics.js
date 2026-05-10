// PXM-07.8B: PixiJS static-packet-run shared consumer diagnostics.
// Layer: presentation/render/diagnostics.
(function registerPixiMigrationPixiStaticRunSharedConsumerDiagnostics(global) {
  if (!global) return;

  var STEP = 'PXM-07.8B';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-static-run-shared-consumer-diagnostics.js';
  var state = {
    started: false,
    lastSummary: null,
    lastSignature: '',
    lastLogAt: 0
  };

  function nowMs() {
    try { return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }

  function stringifyValue(value) {
    if (value == null) return String(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.join(',');
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }

  function emit(section, payload) {
    var line = PREFIX + '[' + String(section || 'event') + ']';
    if (payload && typeof payload === 'object') {
      var extra = Object.keys(payload).map(function (key) { return String(key) + '=' + stringifyValue(payload[key]); }).join(' ');
      if (extra) line += ' ' + extra;
    }
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function maybeStart() {
    if (state.started) return;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: 'pixi-static-packet-run-shared-consumer',
      visualStaticRunAdoption: false,
      canvas2dStaticFallback: 'enabled',
      drawBehaviorChanged: false,
      modifiesRendering: false,
      changesDepthSort: false,
      changesPicking: false,
      source: 'module-load'
    });
  }

  function shouldLog(summary) {
    // PXM-07.8D: ignore per-frame reused counters in light mode. They caused
    // unchanged static-run cache evidence to be logged many times during player
    // movement. Keep cache size/readiness/fallback changes and a coarse interval.
    var sig = [
      summary.activeBackend || 'unknown',
      summary.usesSharedStaticPacketRunCache === true ? 1 : 0,
      summary.visualStaticRunAdoption === true ? 1 : 0,
      summary.staticRunCandidateCount || 0,
      summary.staticRunTextureConsumedCount || 0,
      summary.textureCacheSize || 0,
      summary.fallbackReason || ''
    ].join('|');
    try {
      var throttle = global.__PIXI_MIGRATION_DIAGNOSTICS_THROTTLE__ || null;
      if (throttle && typeof throttle.shouldEmit === 'function') {
        if (!throttle.shouldEmit({
          step: STEP,
          section: 'summary',
          bucket: 'pixi-static-run-consumer',
          signature: sig,
          intervalMs: 5000
        })) return false;
      }
    } catch (_) {}
    var t = nowMs();
    if (sig === state.lastSignature && (t - Number(state.lastLogAt || 0)) < 5000) return false;
    state.lastSignature = sig;
    state.lastLogAt = t;
    return true;
  }

  function notePixiStaticRunSharedConsumer(summary, meta) {
    maybeStart();
    summary = summary && typeof summary === 'object' ? summary : {};
    meta = meta || {};
    state.lastSummary = summary;
    if (!shouldLog(summary)) return summary;

    emit('shared-static-run-source', {
      activeBackend: summary.activeBackend || 'unknown',
      sharedStaticRunSourceReady: summary.sharedStaticRunSourceReady === true,
      sharedStaticRunSourceObserved: summary.sharedStaticRunSourceObserved === true,
      staticRunCandidateCount: Number(summary.staticRunCandidateCount || 0),
      staticRunPacketCount: Number(summary.staticRunPacketCount || 0),
      sourceRuntimeDetail: summary.sourceRuntimeDetail || '',
      source: meta.source || summary.source || 'pixi-static-run-consumer'
    });
    emit('texture-cache', {
      activeBackend: summary.activeBackend || 'unknown',
      usesSharedStaticPacketRunCache: summary.usesSharedStaticPacketRunCache === true,
      staticRunTextureConsumedCount: Number(summary.staticRunTextureConsumedCount || 0),
      textureCreatedThisFrame: Number(summary.textureCreatedThisFrame || 0),
      textureReusedThisFrame: Number(summary.textureReusedThisFrame || 0),
      textureUpdatedThisFrame: Number(summary.textureUpdatedThisFrame || 0),
      textureCacheSize: Number(summary.textureCacheSize || 0),
      firstSignature: summary.firstSignature || '',
      source: meta.source || summary.source || 'pixi-static-run-consumer'
    });
    emit('pixi-static-run-consumer', {
      activeBackend: summary.activeBackend || 'unknown',
      usesSharedStaticPacketRunCache: summary.usesSharedStaticPacketRunCache === true,
      visualStaticRunAdoption: summary.visualStaticRunAdoption === true,
      pixiDrawsStaticPacketRuns: summary.pixiDrawsStaticPacketRuns === true,
      canvas2dStaticFallback: summary.canvas2dStaticFallback || 'enabled',
      consumerMigration: summary.consumerMigration || 'pixi-texture-cache-nonvisual',
      fallbackReason: summary.fallbackReason || '',
      wallMs: Number(summary.wallMs || 0),
      source: meta.source || summary.source || 'pixi-static-run-consumer'
    });
    emit('safety', {
      activeBackend: summary.activeBackend || 'unknown',
      depthInterleavingProtected: summary.depthInterleavingProtected === true,
      blockedByDepthInterleaving: summary.blockedByDepthInterleaving === true,
      canvas2dFallback: summary.canvas2dFallback || 'enabled',
      canvas2dStaticFallback: summary.canvas2dStaticFallback || 'enabled',
      drawBehaviorChanged: summary.drawBehaviorChanged === true,
      modifiesRendering: summary.modifiesRendering === true,
      changesDepthSort: summary.changesDepthSort === true,
      changesPicking: summary.changesPicking === true,
      pixiOwnsPicking: summary.pixiOwnsPicking === true,
      pixiSortChildren: summary.pixiSortChildren === true,
      pixiZIndexUsed: summary.pixiZIndexUsed === true,
      source: meta.source || summary.source || 'pixi-static-run-consumer'
    });
    emit('summary', {
      ok: summary.ok !== false,
      activeBackend: summary.activeBackend || 'unknown',
      usesSharedStaticPacketRunCache: summary.usesSharedStaticPacketRunCache === true,
      visualStaticRunAdoption: summary.visualStaticRunAdoption === true,
      staticRunTextureConsumedCount: Number(summary.staticRunTextureConsumedCount || 0),
      textureCacheSize: Number(summary.textureCacheSize || 0),
      canvas2dStaticFallback: summary.canvas2dStaticFallback || 'enabled',
      drawBehaviorChanged: summary.drawBehaviorChanged === true,
      modifiesRendering: summary.modifiesRendering === true,
      changesDepthSort: summary.changesDepthSort === true,
      changesPicking: summary.changesPicking === true,
      source: meta.source || summary.source || 'pixi-static-run-consumer',
      diagnosticsThrottle: 'light'
    });
    return summary;
  }

  function getLastSummary() { return state.lastSummary || null; }

  var api = {
    owner: OWNER,
    step: STEP,
    notePixiStaticRunSharedConsumer: notePixiStaticRunSharedConsumer,
    getLastSummary: getLastSummary
  };

  try {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_SHARED_CONSUMER_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiStaticRunSharedConsumer', api, { owner: OWNER, step: STEP });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.diagnostics = global.App.renderer.diagnostics || {};
      global.App.renderer.diagnostics.pixiStaticRunSharedConsumer = api;
    }
  } catch (_) {
    global.__PIXI_MIGRATION_PIXI_STATIC_RUN_SHARED_CONSUMER_DIAGNOSTICS__ = api;
  }

  maybeStart();
})(typeof window !== 'undefined' ? window : globalThis);
