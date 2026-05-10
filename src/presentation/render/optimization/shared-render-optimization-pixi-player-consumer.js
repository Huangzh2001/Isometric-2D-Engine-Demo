// PXM-07.10A: PixiJS player-avatar shared sprite consumer.
// Layer: presentation/render/optimization.
//
// This module starts removing Canvas2D fallback work by letting PixiJS draw the
// player avatar from the same prepared player sprite frame buffer used by
// Canvas2D. It does not change framePlan.order, picking, player state, or actor
// sorting. Canvas2D skips only the player-avatar renderable when the Pixi player
// sprite was successfully committed for the current frame.
(function registerSharedRenderOptimizationPixiPlayerConsumer(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/shared-render-optimization-pixi-player-consumer.js';
  var STEP = 'PXM-07.12G-player-interleaved';
  var PHASE = 'pixi-player-avatar-shared-sprite-consumer';

  var state = {
    frameSeq: 0,
    activeRevision: 0,
    lastCommittedRevision: 0,
    lastCommittedFramePlanId: '',
    lastCommittedSignature: '',
    lastSummary: null,
    texture: null,
    sprite: null,
    textureSignature: '',
    textureCreateCount: 0,
    textureUpdateCount: 0,
    spriteReuseCount: 0,
    canvas2dSkipCount: 0,
    fallbackCount: 0
  };

  function nowMs() {
    try { return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function getActiveBackend() {
    try {
      var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      if (selection && typeof selection.getSnapshot === 'function') {
        var snapshot = selection.getSnapshot() || {};
        if (snapshot.activeBackend) return String(snapshot.activeBackend);
      }
    } catch (_) {}
    return 'unknown';
  }

  function isZoomSingleWorldOwnerActive() {
    try { return global.__PIXI_MIGRATION_ZOOM_SINGLE_WORLD_OWNER_ACTIVE__ === true; } catch (_) {}
    return false;
  }

  function getPixi() {
    try { return global.PIXI || null; } catch (_) { return null; }
  }

  function getPlayerFrameApi() {
    try { return global.__PLAYER_SPRITE_FRAME__ || global.__APP_PRESENTATION_PLAYER_SPRITE_FRAME__ || null; } catch (_) { return null; }
  }

  function getPreparedPlayerSnapshot() {
    try {
      var api = getPlayerFrameApi();
      if (api && typeof api.getPreparedPlayerSpriteFrameSnapshot === 'function') return api.getPreparedPlayerSpriteFrameSnapshot() || null;
    } catch (_) {}
    return null;
  }

  function makeTextureSignature(snapshot) {
    snapshot = snapshot || {};
    return [
      String(snapshot.cacheKey || ''),
      toNumber(snapshot.sourceWidth, 0),
      toNumber(snapshot.sourceHeight, 0),
      toNumber(snapshot.frame, 0),
      toNumber(snapshot.row, 0),
      toNumber(snapshot.dir, 0),
      snapshot.moving ? 1 : 0,
      toNumber(snapshot.spriteScale, 0).toFixed(4)
    ].join('|');
  }

  function makePlacementSignature(snapshot) {
    snapshot = snapshot || {};
    return [
      Math.round(toNumber(snapshot.xLeft, 0)),
      Math.round(toNumber(snapshot.yTop, 0)),
      Math.round(toNumber(snapshot.scaledFrameW, 0)),
      Math.round(toNumber(snapshot.scaledFrameH, 0)),
      toNumber(snapshot.worldX, 0).toFixed(3),
      toNumber(snapshot.worldY, 0).toFixed(3),
      toNumber(snapshot.worldZ, 0).toFixed(3)
    ].join('|');
  }

  function updateTexture(texture) {
    if (!texture) return false;
    try {
      if (texture.source && typeof texture.source.update === 'function') {
        texture.source.update();
        return true;
      }
    } catch (_) {}
    try {
      if (texture.baseTexture && typeof texture.baseTexture.update === 'function') {
        texture.baseTexture.update();
        return true;
      }
    } catch (_) {}
    try {
      if (typeof texture.update === 'function') {
        texture.update();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function applyTextureGuards(texture) {
    var applied = false;
    var pixi = getPixi();
    try {
      if (pixi && pixi.SCALE_MODES && texture && texture.baseTexture) {
        texture.baseTexture.scaleMode = pixi.SCALE_MODES.NEAREST;
        applied = true;
      }
    } catch (_) {}
    try {
      if (texture && texture.source) {
        if ('scaleMode' in texture.source) texture.source.scaleMode = 'nearest';
        if ('autoGenerateMipmaps' in texture.source) texture.source.autoGenerateMipmaps = false;
        applied = true;
      }
    } catch (_) {}
    return applied;
  }

  function notify(section, payload) {
    payload = Object.assign({
      section: section || 'event',
      step: STEP,
      owner: OWNER,
      phase: PHASE
    }, payload || {});
    try {
      var diag = global.__PIXI_MIGRATION_PIXI_PLAYER_CONSUMER_DIAGNOSTICS__ || null;
      if (diag && typeof diag.notePixiPlayerConsumer === 'function') {
        diag.notePixiPlayerConsumer(payload, { source: payload.source || 'pixi-player-consumer' });
      }
    } catch (_) {}
    return payload;
  }

  function isPlayerConsumerSprite(child) {
    try {
      return !!(child && (child.__pixiPlayerAvatarSharedSprite === true || String(child.label || '').indexOf('pixi-migration-player-avatar') === 0));
    } catch (_) {}
    return false;
  }

  function clearPlayerContainer(container, preserveSprite, onlyPlayerSprites) {
    if (!container || !container.children) return 0;
    var removed = 0;
    try {
      var children = container.children.slice();
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (!child || child === preserveSprite) continue;
        if (onlyPlayerSprites === true && !isPlayerConsumerSprite(child)) continue;
        try { if (typeof container.removeChild === 'function') container.removeChild(child); } catch (_) {}
        try { if (typeof child.destroy === 'function') child.destroy({ children: true, texture: false, baseTexture: false }); } catch (_) {}
        removed += 1;
      }
    } catch (_) {}
    return removed;
  }

  function consume(options) {
    options = options || {};
    var startAt = nowMs();
    var activeBackend = getActiveBackend();
    var pixi = getPixi();
    var Texture = pixi && pixi.Texture || null;
    var Sprite = pixi && pixi.Sprite || null;
    var container = options.container || null;
    var framePlanId = String(options.framePlanId || '');
    var zoomSingleWorldOwnerActive = isZoomSingleWorldOwnerActive();
    var visualEnabled = options.visualAdoption === true && activeBackend === 'pixi' && !zoomSingleWorldOwnerActive;
    var interleavedWorldContainer = options.interleavedWorldContainer === true;
    var orderIndex = Number(options.orderIndex != null ? options.orderIndex : options.zIndex);
    var snapshot = getPreparedPlayerSnapshot();
    var ok = false;
    var fallbackReason = '';
    var textureUpdated = false;
    var textureCreated = false;
    var spriteReused = false;
    var textureSignature = snapshot ? makeTextureSignature(snapshot) : '';
    var placementSignature = snapshot ? makePlacementSignature(snapshot) : '';
    var revision = state.frameSeq + 1;

    if (zoomSingleWorldOwnerActive) fallbackReason = 'zoom-single-world-owner-player-visual-adoption-disabled';
    else if (!visualEnabled) fallbackReason = 'visual-adoption-disabled-or-backend-not-pixi';
    else if (!snapshot || snapshot.ready !== true || !snapshot.surfaceCanvas) fallbackReason = 'player-frame-snapshot-not-ready';
    else if (!container || typeof Sprite !== 'function' || !Texture || typeof Texture.from !== 'function') fallbackReason = 'pixi-player-container-or-texture-api-missing';

    if (!fallbackReason) {
      try {
        if (!state.texture || state.textureSignature !== textureSignature) {
          if (!state.texture) {
            state.texture = Texture.from(snapshot.surfaceCanvas);
            textureCreated = true;
            state.textureCreateCount += 1;
          } else {
            updateTexture(state.texture);
            textureUpdated = true;
            state.textureUpdateCount += 1;
          }
          state.textureSignature = textureSignature;
        } else {
          spriteReused = true;
          state.spriteReuseCount += 1;
        }
        applyTextureGuards(state.texture);
        if (!state.sprite) {
          state.sprite = new Sprite(state.texture);
          state.sprite.label = 'pixi-migration-player-avatar-shared-sprite';
          try { state.sprite.__pixiPlayerAvatarSharedSprite = true; } catch (_) {}
          try { state.sprite.eventMode = 'none'; } catch (_) {}
        } else {
          state.sprite.texture = state.texture;
        }
        state.sprite.x = Math.round(toNumber(snapshot.xLeft, 0));
        state.sprite.y = Math.round(toNumber(snapshot.yTop, 0));
        state.sprite.width = Math.max(1, Math.round(toNumber(snapshot.scaledFrameW, snapshot.sourceWidth || 1)));
        state.sprite.height = Math.max(1, Math.round(toNumber(snapshot.scaledFrameH, snapshot.sourceHeight || 1)));
        try { state.sprite.roundPixels = true; } catch (_) {}
        try { if (Number.isFinite(orderIndex)) state.sprite.zIndex = orderIndex; } catch (_) {}
        try { if (interleavedWorldContainer && container) container.sortableChildren = true; } catch (_) {}
        if (state.sprite.parent !== container && typeof container.addChild === 'function') container.addChild(state.sprite);
        clearPlayerContainer(container, state.sprite, interleavedWorldContainer);
        try { if (interleavedWorldContainer && container && typeof container.sortChildren === 'function') container.sortChildren(); } catch (_) {}
        ok = true;
        state.lastCommittedRevision = revision;
        state.lastCommittedFramePlanId = framePlanId;
        state.lastCommittedSignature = textureSignature + '|' + placementSignature;
      } catch (_) {
        fallbackReason = 'pixi-player-sprite-commit-failed';
        ok = false;
      }
    }

    state.frameSeq = revision;
    state.activeRevision = revision;
    if (!ok) {
      state.fallbackCount += 1;
      try { clearPlayerContainer(container, null, interleavedWorldContainer); } catch (_) {}
      state.lastCommittedRevision = 0;
      state.lastCommittedFramePlanId = '';
      state.lastCommittedSignature = '';
    }

    var summary = {
      ok: true,
      activeBackend: activeBackend,
      usesSharedPlayerSpriteFrame: ok,
      pixiDrawsPlayerAvatar: ok,
      canvas2dSkipsPlayerAvatar: ok,
      playerVisualAdoption: ok,
      playerFrameReady: !!(snapshot && snapshot.ready),
      textureCreatedThisFrame: textureCreated,
      textureUpdatedThisFrame: textureUpdated,
      spriteReusedOnStableFrame: spriteReused,
      textureCreateCount: state.textureCreateCount,
      textureUpdateCount: state.textureUpdateCount,
      spriteReuseCount: state.spriteReuseCount,
      playerSpriteX: ok ? Math.round(toNumber(snapshot.xLeft, 0)) : 0,
      playerSpriteY: ok ? Math.round(toNumber(snapshot.yTop, 0)) : 0,
      playerSpriteWidth: ok ? Math.round(toNumber(snapshot.scaledFrameW, 0)) : 0,
      playerSpriteHeight: ok ? Math.round(toNumber(snapshot.scaledFrameH, 0)) : 0,
      framePlanId: framePlanId,
      adoptionRevision: state.lastCommittedRevision,
      fallbackReason: fallbackReason,
      canvas2dFallback: 'enabled-for-nonplayer-renderables',
      depthInterleavingMode: interleavedWorldContainer ? 'pixi-frameplan-zindex-static-plus-player' : (zoomSingleWorldOwnerActive ? 'canvas2d-world-owner-during-zoom' : 'pixi-player-between-pixi-static-prefix-and-canvas2d-foreground-static'),
      interleavedWorldContainer: interleavedWorldContainer,
      reusesFramePlanOrderForDepth: interleavedWorldContainer && ok,
      zoomSingleWorldOwnerActive: zoomSingleWorldOwnerActive,
      changesDepthSort: false,
      changesPicking: false,
      changesRenderOrder: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      modifiesRendering: ok,
      drawBehaviorChanged: ok,
      wallMs: Math.max(0, nowMs() - startAt),
      source: options.source || 'pixi-player-consumer'
    };
    state.lastSummary = summary;
    notify(ok ? 'player-visual-adoption' : 'fallback', summary);
    return summary;
  }

  function shouldSkipCanvas2dPlayerAvatar(renderable, meta) {
    if (!(renderable && (renderable.id === 'player-avatar' || renderable.kind === 'player-avatar'))) return false;
    if (isZoomSingleWorldOwnerActive()) return false;
    var activeBackend = getActiveBackend();
    var last = state.lastSummary || null;
    var canSkip = activeBackend === 'pixi'
      && !!last
      && last.pixiDrawsPlayerAvatar === true
      && state.lastCommittedRevision === state.activeRevision
      && state.lastCommittedRevision > 0;
    if (canSkip) {
      state.canvas2dSkipCount += 1;
      notify('canvas2d-skip', {
        ok: true,
        activeBackend: activeBackend,
        canvas2dSkippedPlayerAvatar: true,
        pixiDrawsPlayerAvatar: true,
        canvas2dSkipCount: state.canvas2dSkipCount,
        framePlanId: String(meta && meta.framePlanId || ''),
        adoptionRevision: state.lastCommittedRevision,
        changesDepthSort: false,
        changesPicking: false,
        source: 'canvas2d-renderable-order-draw'
      });
      return true;
    }
    return false;
  }

  function getLastSummary() {
    return state.lastSummary || {
      ok: true,
      activeBackend: getActiveBackend(),
      usesSharedPlayerSpriteFrame: false,
      pixiDrawsPlayerAvatar: false,
      canvas2dSkipsPlayerAvatar: false,
      fallbackReason: 'not-run',
      source: 'last-summary'
    };
  }

  var api = {
    owner: OWNER,
    step: STEP,
    phase: PHASE,
    consume: consume,
    shouldSkipCanvas2dPlayerAvatar: shouldSkipCanvas2dPlayerAvatar,
    getLastSummary: getLastSummary
  };

  try {
    global.__SHARED_RENDER_OPTIMIZATION_PIXI_PLAYER_CONSUMER__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.optimization.pixiPlayerConsumer', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.optimization = global.App.renderer.optimization || {};
      global.App.renderer.optimization.pixiPlayerConsumer = api;
    }
  } catch (_) {
    global.__SHARED_RENDER_OPTIMIZATION_PIXI_PLAYER_CONSUMER__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
