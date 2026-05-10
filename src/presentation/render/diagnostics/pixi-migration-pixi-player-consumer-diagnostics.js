// PXM-07.10A diagnostics: PixiJS player-avatar shared sprite consumer.
// Layer: presentation/render/diagnostics.
(function registerPixiMigrationPixiPlayerConsumerDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-pixi-player-consumer-diagnostics.js';
  var STEP = 'PXM-07.10A';
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
    return Object.keys(payload).map(function (key) { return String(key) + '=' + stringifyValue(payload[key]); }).join(' ');
  }

  function emit(section, payload, opts) {
    section = String(section || 'event');
    payload = payload || {};
    opts = opts || {};
    var signature = [
      payload.activeBackend || '',
      payload.pixiDrawsPlayerAvatar === true ? 1 : 0,
      payload.canvas2dSkipsPlayerAvatar === true ? 1 : 0,
      payload.textureCreatedThisFrame === true ? 1 : 0,
      payload.textureUpdatedThisFrame === true ? 1 : 0,
      payload.spriteReusedOnStableFrame === true ? 1 : 0,
      payload.fallbackReason || '',
      Math.round(Number(payload.playerSpriteX || 0)),
      Math.round(Number(payload.playerSpriteY || 0))
    ].join('|');
    state.emitCountBySection[section] = Number(state.emitCountBySection[section] || 0) + 1;
    var shouldEmit = opts.force === true || state.emitCountBySection[section] <= 8 || state.lastSignatureBySection[section] !== signature;
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
      touchedFeature: 'pixi-player-avatar-shared-sprite-consumer',
      playerOnlyStep: true,
      changesPicking: false,
      changesDepthSort: false,
      source: 'module-load'
    }, { force: true });
  }

  function notePixiPlayerConsumer(payload) {
    emitStart();
    payload = payload && typeof payload === 'object' ? payload : {};
    var section = String(payload.section || (payload.pixiDrawsPlayerAvatar ? 'player-visual-adoption' : 'fallback'));
    var summary = {
      ok: payload.ok !== false,
      activeBackend: payload.activeBackend || 'unknown',
      usesSharedPlayerSpriteFrame: payload.usesSharedPlayerSpriteFrame === true,
      pixiDrawsPlayerAvatar: payload.pixiDrawsPlayerAvatar === true,
      canvas2dSkipsPlayerAvatar: payload.canvas2dSkipsPlayerAvatar === true,
      playerVisualAdoption: payload.playerVisualAdoption === true,
      playerFrameReady: payload.playerFrameReady === true,
      textureCreatedThisFrame: payload.textureCreatedThisFrame === true,
      textureUpdatedThisFrame: payload.textureUpdatedThisFrame === true,
      spriteReusedOnStableFrame: payload.spriteReusedOnStableFrame === true,
      textureCreateCount: Number(payload.textureCreateCount || 0),
      textureUpdateCount: Number(payload.textureUpdateCount || 0),
      spriteReuseCount: Number(payload.spriteReuseCount || 0),
      canvas2dSkipCount: Number(payload.canvas2dSkipCount || 0),
      playerSpriteX: Number(payload.playerSpriteX || 0),
      playerSpriteY: Number(payload.playerSpriteY || 0),
      playerSpriteWidth: Number(payload.playerSpriteWidth || 0),
      playerSpriteHeight: Number(payload.playerSpriteHeight || 0),
      depthInterleavingMode: payload.depthInterleavingMode || 'pixi-player-between-pixi-static-prefix-and-canvas2d-foreground-static',
      canvas2dFallback: payload.canvas2dFallback || 'enabled-for-nonplayer-renderables',
      fallbackReason: payload.fallbackReason || '',
      changesDepthSort: false,
      changesPicking: false,
      changesRenderOrder: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      modifiesRendering: payload.modifiesRendering === true,
      drawBehaviorChanged: payload.drawBehaviorChanged === true,
      wallMs: Number(payload.wallMs || 0),
      source: payload.source || 'pixi-player-consumer'
    };
    if (section === 'canvas2d-skip') {
      emit('canvas2d-skip', Object.assign({}, summary, { canvas2dSkippedPlayerAvatar: payload.canvas2dSkippedPlayerAvatar === true }), { force: payload.canvas2dSkippedPlayerAvatar === true });
    } else {
      emit(section, summary);
    }
    state.lastSummary = summary;
    emit('summary', summary);
    return summary;
  }

  var api = {
    owner: OWNER,
    step: STEP,
    notePixiPlayerConsumer: notePixiPlayerConsumer,
    getLastSummary: function () { return state.lastSummary || null; }
  };

  try {
    global.__PIXI_MIGRATION_PIXI_PLAYER_CONSUMER_DIAGNOSTICS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.diagnostics.pixiMigrationPixiPlayerConsumer', api, { owner: OWNER, step: STEP });
    }
  } catch (_) {
    global.__PIXI_MIGRATION_PIXI_PLAYER_CONSUMER_DIAGNOSTICS__ = api;
  }
  emitStart();
})(typeof window !== 'undefined' ? window : globalThis);
