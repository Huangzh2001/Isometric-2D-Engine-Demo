// PXM-07.8A: PixiJS floor-layer-cache shared consumer diagnostics.
// Layer: presentation/render/diagnostics.
//
// This module only records evidence that the PixiJS floor consumer is using
// the renderer-neutral shared floor-layer-cache source. It does not render,
// mutate scene data, own picking, change depth sorting, or disable fallback.
(function registerPixiMigrationPixiFloorSharedConsumerDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-floor-shared-consumer-diagnostics.js';
  var STEP = 'PXM-07.8A';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';

  var state = {
    started: false,
    lastConsumer: null,
    lastSummary: null,
    lastSectionSignature: Object.create(null)
  };

  function nowMs() {
    try { return global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }

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

  function emit(section, payload) {
    var line = PREFIX + '[' + String(section || 'event') + ']';
    var extra = formatPayload(payload);
    if (extra) line += ' ' + extra;
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
    return line;
  }

  function maybeEmitStart(reason) {
    if (state.started) return false;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: 'pixi-floor-layer-cache-shared-consumer',
      floorOnly: true,
      canvas2dFallback: 'enabled',
      changesDepthSort: false,
      changesPicking: false,
      changesObjectData: false,
      changesRenderOrder: false,
      source: reason || 'module-load'
    });
    return true;
  }

  function shouldEmit(section, signature, intervalMs, options) {
    var key = String(section || 'event');
    try {
      var throttle = global.__PIXI_MIGRATION_DIAGNOSTICS_THROTTLE__ || null;
      if (throttle && typeof throttle.shouldEmit === 'function') {
        if (!throttle.shouldEmit({
          step: STEP,
          section: section,
          bucket: key,
          signature: String(signature || ''),
          intervalMs: Number(intervalMs || 1500),
          critical: options && options.critical === true,
          stateChange: options && options.stateChange === true
        })) return false;
      }
    } catch (_) {}
    var current = nowMs();
    var last = state.lastSectionSignature[key] || { signature: '', at: 0 };
    if (last.signature === signature && (current - Number(last.at || 0)) < Number(intervalMs || 1500)) return false;
    state.lastSectionSignature[key] = { signature: signature, at: current };
    return true;
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function summarize(payload, meta) {
    var safe = payload && typeof payload === 'object' ? payload : {};
    var ok = safe.ok === true && safe.canvas2dFallback === 'enabled' && safe.changesDepthSort !== true && safe.changesPicking !== true;
    return {
      ok: ok,
      activeBackend: String(safe.activeBackend || 'pixi'),
      floorOnly: true,
      usesSharedFloorLayerCache: safe.usesSharedFloorLayerCache === true,
      pixiFloorBypassesSharedCache: safe.pixiFloorBypassesSharedCache === true,
      fallbackToFirstPass: safe.fallbackToFirstPass === true,
      textureUpdatedOnDirty: safe.textureUpdatedOnDirty === true,
      spriteReusedOnStableFrame: safe.spriteReusedOnStableFrame === true,
      sharedSurfaceReady: safe.sharedSurfaceReady === true,
      floorCacheVersion: String(safe.floorCacheVersion || ''),
      floorCacheSignature: String(safe.floorCacheSignature || ''),
      stableFloorTextureVersion: String(safe.stableFloorTextureVersion || safe.floorCacheVersion || ''),
      sharedSurfaceRevision: toNumber(safe.sharedSurfaceRevision, 0),
      textureSignatureStable: safe.textureSignatureStable === true,
      textureUpdateReason: String(safe.textureUpdateReason || ''),
      sharedSourceReady: safe.sharedSourceReady === true,
      sharedSourceDirty: safe.sharedSourceDirty === true,
      canvas2dFallback: 'enabled',
      canvas2dFloorFallback: 'enabled',
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false,
      changesObjectData: false,
      changesRenderOrder: false,
      source: meta && meta.source || safe.source || 'pixi-floor-shared-consumer'
    };
  }

  function notePixiFloorSharedConsumer(payload, meta) {
    maybeEmitStart('consumer-note');
    var safe = payload && typeof payload === 'object' ? payload : {};
    var summary = summarize(safe, meta || {});
    state.lastConsumer = safe;
    state.lastSummary = summary;

    var consumerSig = [
      summary.activeBackend,
      summary.usesSharedFloorLayerCache ? 1 : 0,
      summary.pixiFloorBypassesSharedCache ? 1 : 0,
      summary.fallbackToFirstPass ? 1 : 0,
      summary.sharedSurfaceReady ? 1 : 0,
      summary.floorCacheVersion,
      summary.stableFloorTextureVersion,
      summary.textureUpdateReason
    ].join('|');
    if (shouldEmit('pixi-floor-consumer', consumerSig, 4000)) {
      emit('pixi-floor-consumer', {
        activeBackend: summary.activeBackend,
        usesSharedFloorLayerCache: summary.usesSharedFloorLayerCache,
        pixiFloorBypassesSharedCache: summary.pixiFloorBypassesSharedCache,
        fallbackToFirstPass: summary.fallbackToFirstPass,
        sharedSurfaceReady: summary.sharedSurfaceReady,
        sharedSourceReady: summary.sharedSourceReady,
        sharedSourceDirty: summary.sharedSourceDirty,
        floorCacheVersion: summary.floorCacheVersion,
        floorCacheSignature: summary.floorCacheSignature,
        stableFloorTextureVersion: summary.stableFloorTextureVersion,
        sharedSurfaceRevision: summary.sharedSurfaceRevision,
        textureSignatureStable: summary.textureSignatureStable,
        visibleTiles: toNumber(safe.visibleTiles, 0),
        drawnTiles: toNumber(safe.drawnTiles, 0),
        pixiOwnsPicking: false,
        pixiSortChildren: false,
        pixiZIndexUsed: false,
        canvas2dFallback: 'enabled',
        drawBehaviorChanged: false,
        source: summary.source
      });
    }

    var textureSig = [
      summary.activeBackend,
      summary.textureUpdatedOnDirty ? 1 : 0,
      summary.spriteReusedOnStableFrame ? 1 : 0,
      safe.textureWidth || 0,
      safe.textureHeight || 0,
      summary.stableFloorTextureVersion,
      summary.textureUpdateReason
    ].join('|');
    if (shouldEmit('texture', textureSig, 4000)) {
      emit('texture', {
        activeBackend: summary.activeBackend,
        textureUpdatedOnDirty: summary.textureUpdatedOnDirty,
        spriteReusedOnStableFrame: summary.spriteReusedOnStableFrame,
        textureUpdateCount: toNumber(safe.textureUpdateCount, 0),
        spriteReuseCount: toNumber(safe.spriteReuseCount, 0),
        textureWidth: toNumber(safe.textureWidth, 0),
        textureHeight: toNumber(safe.textureHeight, 0),
        textureSource: String(safe.textureSource || 'shared-floor-layer-canvas'),
        textureUpdateReason: summary.textureUpdateReason,
        stableFloorTextureVersion: summary.stableFloorTextureVersion,
        sharedSurfaceRevision: summary.sharedSurfaceRevision,
        textureSignatureStable: summary.textureSignatureStable,
        source: summary.source
      });
    }

    var fallbackSig = [summary.activeBackend, summary.fallbackToFirstPass ? 1 : 0, String(safe.fallbackReason || '')].join('|');
    if (summary.fallbackToFirstPass && shouldEmit('fallback', fallbackSig, 4000, { critical: true })) {
      emit('fallback', {
        activeBackend: summary.activeBackend,
        fallbackToFirstPass: true,
        fallbackReason: String(safe.fallbackReason || 'shared-floor-cache-unavailable'),
        canvas2dFallback: 'enabled',
        canvas2dFloorFallback: 'enabled',
        pixiFloorBypassesSharedCache: summary.pixiFloorBypassesSharedCache,
        source: summary.source
      });
    }

    var safetySig = [
      summary.activeBackend,
      summary.canvas2dFallback,
      summary.changesDepthSort ? 1 : 0,
      summary.changesPicking ? 1 : 0,
      summary.changesObjectData ? 1 : 0,
      summary.changesRenderOrder ? 1 : 0
    ].join('|');
    if (shouldEmit('safety', safetySig, 6000)) {
      emit('safety', {
        activeBackend: summary.activeBackend,
        canvas2dFallback: 'enabled',
        canvas2dFloorFallback: 'enabled',
        pixiOwnsPointer: false,
        pixiOwnsPicking: false,
        pixiSortChildren: false,
        pixiZIndexUsed: false,
        changesDepthSort: false,
        changesPicking: false,
        changesObjectData: false,
        changesRenderOrder: false,
        source: summary.source
      });
    }

    var summarySig = [summary.activeBackend, summary.ok ? 1 : 0, summary.usesSharedFloorLayerCache ? 1 : 0, summary.pixiFloorBypassesSharedCache ? 1 : 0, summary.fallbackToFirstPass ? 1 : 0, summary.stableFloorTextureVersion, summary.textureUpdateReason].join('|');
    if (shouldEmit('summary', summarySig, 4000)) {
      summary.diagnosticsThrottle = 'light';
      emit('summary', summary);
    }
    return summary;
  }

  function getLastSummary() { return state.lastSummary || null; }

  var api = {
    owner: OWNER,
    step: STEP,
    notePixiFloorSharedConsumer: notePixiFloorSharedConsumer,
    getLastSummary: getLastSummary
  };

  maybeEmitStart('module-load');
  try {
    global.__PIXI_MIGRATION_PIXI_FLOOR_SHARED_CONSUMER_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiFloorSharedConsumer', api, { owner: OWNER, step: STEP });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.diagnostics = global.App.renderer.diagnostics || {};
      global.App.renderer.diagnostics.pixiFloorSharedConsumer = api;
    }
  } catch (_) {
    global.__PIXI_MIGRATION_PIXI_FLOOR_SHARED_CONSUMER_DIAGNOSTICS__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
