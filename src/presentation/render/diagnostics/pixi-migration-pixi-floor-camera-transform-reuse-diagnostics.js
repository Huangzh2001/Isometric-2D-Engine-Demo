// PXM-07.8E: PixiJS floor camera-transform reuse diagnostics.
// Layer: presentation/render/diagnostics.
//
// This module records whether PixiJS floor camera pan is handled by sprite
// transform rather than by rebuilding/uploading the shared floor texture. It
// does not render, mutate scene data, own picking, change depth sorting, or
// disable Canvas2D fallback.
(function registerPixiMigrationPixiFloorCameraTransformReuseDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-floor-camera-transform-reuse-diagnostics.js';
  var STEP = 'PXM-07.8E';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';

  var state = {
    started: false,
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
          intervalMs: Number(intervalMs || 2000),
          critical: options && options.critical === true,
          stateChange: options && options.stateChange === true
        })) return false;
      }
    } catch (_) {}
    var current = nowMs();
    var last = state.lastSectionSignature[key] || { signature: '', at: 0 };
    if (last.signature === signature && (current - Number(last.at || 0)) < Number(intervalMs || 2000)) return false;
    state.lastSectionSignature[key] = { signature: signature, at: current };
    return true;
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function maybeEmitStart(reason) {
    if (state.started) return false;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: 'pixi-floor-camera-transform-reuse',
      floorOnly: true,
      throttlesOnly: false,
      modifiesRendering: false,
      changesDepthSort: false,
      changesPicking: false,
      canvas2dFallback: 'enabled',
      source: reason || 'module-load'
    });
    return true;
  }

  function summarize(payload, meta) {
    var safe = payload && typeof payload === 'object' ? payload : {};
    var usesShared = safe.usesSharedFloorLayerCache === true;
    var bypass = safe.pixiFloorBypassesSharedCache === true;
    var fallback = safe.fallbackToFirstPass === true;
    var ok = usesShared && !bypass && !fallback && safe.changesDepthSort !== true && safe.changesPicking !== true;
    return {
      ok: ok,
      activeBackend: String(safe.activeBackend || safe.active || 'pixi'),
      floorOnly: true,
      usesSharedFloorLayerCache: usesShared,
      pixiFloorBypassesSharedCache: bypass,
      fallbackToFirstPass: fallback,
      cameraMoveOnly: safe.cameraMoveOnly === true,
      spriteTransformUpdated: safe.spriteTransformUpdated === true,
      textureUpdatedOnDirty: safe.textureUpdatedOnDirty === true,
      spriteReusedOnStableFrame: safe.spriteReusedOnStableFrame === true,
      sharedSurfaceRevisionStableOnPan: safe.sharedSurfaceRevisionStableOnPan === true,
      floorTextureCameraIndependent: safe.floorTextureCameraIndependent === true,
      textureUpdateReason: String(safe.textureUpdateReason || ''),
      stableFloorTextureVersion: String(safe.stableFloorTextureVersion || safe.floorCacheVersion || ''),
      sharedSurfaceRevision: toNumber(safe.sharedSurfaceRevision, 0),
      cameraTransformDX: toNumber(safe.cameraTransformDX, 0),
      cameraTransformDY: toNumber(safe.cameraTransformDY, 0),
      cameraTransformScale: toNumber(safe.cameraTransformScale, 1),
      textureUpdateCount: toNumber(safe.textureUpdateCount, 0),
      spriteReuseCount: toNumber(safe.spriteReuseCount, 0),
      canvas2dFallback: 'enabled',
      canvas2dFloorFallback: 'enabled',
      drawBehaviorChanged: false,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false,
      source: meta && meta.source || safe.source || 'pixi-floor-camera-transform-reuse'
    };
  }

  function notePixiFloorCameraTransformReuse(payload, meta) {
    maybeEmitStart('consumer-note');
    var summary = summarize(payload, meta || {});
    state.lastSummary = summary;

    var transformSig = [
      summary.activeBackend,
      summary.cameraMoveOnly ? 1 : 0,
      summary.spriteTransformUpdated ? 1 : 0,
      summary.textureUpdatedOnDirty ? 1 : 0,
      summary.spriteReusedOnStableFrame ? 1 : 0,
      summary.sharedSurfaceRevisionStableOnPan ? 1 : 0,
      summary.textureUpdateReason,
      summary.stableFloorTextureVersion
    ].join('|');
    if (shouldEmit('camera-transform', transformSig, 2500, { stateChange: summary.cameraMoveOnly || summary.textureUpdatedOnDirty })) {
      emit('camera-transform', {
        activeBackend: summary.activeBackend,
        cameraMoveOnly: summary.cameraMoveOnly,
        spriteTransformUpdated: summary.spriteTransformUpdated,
        textureUpdatedOnDirty: summary.textureUpdatedOnDirty,
        spriteReusedOnStableFrame: summary.spriteReusedOnStableFrame,
        sharedSurfaceRevisionStableOnPan: summary.sharedSurfaceRevisionStableOnPan,
        floorTextureCameraIndependent: summary.floorTextureCameraIndependent,
        cameraTransformDX: summary.cameraTransformDX,
        cameraTransformDY: summary.cameraTransformDY,
        cameraTransformScale: summary.cameraTransformScale,
        textureUpdateReason: summary.textureUpdateReason,
        source: summary.source
      });
    }

    var revisionSig = [summary.activeBackend, summary.sharedSurfaceRevision, summary.textureUpdateCount, summary.spriteReuseCount, summary.stableFloorTextureVersion].join('|');
    if (shouldEmit('texture-reuse', revisionSig, 3500)) {
      emit('texture-reuse', {
        activeBackend: summary.activeBackend,
        stableFloorTextureVersion: summary.stableFloorTextureVersion,
        sharedSurfaceRevision: summary.sharedSurfaceRevision,
        textureUpdateCount: summary.textureUpdateCount,
        spriteReuseCount: summary.spriteReuseCount,
        textureUpdatedOnDirty: summary.textureUpdatedOnDirty,
        spriteReusedOnStableFrame: summary.spriteReusedOnStableFrame,
        source: summary.source
      });
    }

    var safetySig = [summary.activeBackend, summary.canvas2dFallback, summary.changesDepthSort ? 1 : 0, summary.changesPicking ? 1 : 0].join('|');
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
        drawBehaviorChanged: false,
        modifiesRendering: false,
        source: summary.source
      });
    }

    var summarySig = [summary.activeBackend, summary.ok ? 1 : 0, summary.cameraMoveOnly ? 1 : 0, summary.textureUpdatedOnDirty ? 1 : 0, summary.sharedSurfaceRevisionStableOnPan ? 1 : 0, summary.stableFloorTextureVersion].join('|');
    if (shouldEmit('summary', summarySig, 3500)) emit('summary', summary);
    return summary;
  }

  function getLastSummary() { return state.lastSummary || null; }

  var api = {
    owner: OWNER,
    step: STEP,
    notePixiFloorCameraTransformReuse: notePixiFloorCameraTransformReuse,
    getLastSummary: getLastSummary
  };

  maybeEmitStart('module-load');
  try {
    global.__PIXI_MIGRATION_PIXI_FLOOR_CAMERA_TRANSFORM_REUSE_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiFloorCameraTransformReuse', api, { owner: OWNER, step: STEP });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.diagnostics = global.App.renderer.diagnostics || {};
      global.App.renderer.diagnostics.pixiFloorCameraTransformReuse = api;
    }
  } catch (_) {
    global.__PIXI_MIGRATION_PIXI_FLOOR_CAMERA_TRANSFORM_REUSE_DIAGNOSTICS__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
