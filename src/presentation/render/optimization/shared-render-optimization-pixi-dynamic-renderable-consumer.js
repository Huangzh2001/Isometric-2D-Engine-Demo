// PXM-07.11A: PixiJS dynamic prefab-sprite renderable visual consumer.
// Layer: presentation/render/optimization.
//
// This module lets PixiJS adopt additional dynamic renderables from the
// existing framePlan.order path. It deliberately starts with prefab-sprite
// renderables only; static-world-face-packet, actor/player ownership, picking,
// depth sort, and render order are not redefined here.
(function registerPixiDynamicRenderableConsumer(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/shared-render-optimization-pixi-dynamic-renderable-consumer.js';
  var STEP = 'PXM-07.11A';
  var PHASE = 'pixi-dynamic-prefab-sprite-consumer';

  var state = {
    started: false,
    frameId: '',
    container: null,
    sprites: Object.create(null),
    textures: Object.create(null),
    adoptedKeys: Object.create(null),
    seenKeys: Object.create(null),
    adoptedCountThisFrame: 0,
    skippedByCanvas2dThisFrame: 0,
    unsupportedCountThisFrame: 0,
    textureCreatedCount: 0,
    textureReusedCount: 0,
    spriteCreatedCount: 0,
    spriteReusedCount: 0,
    lastSummary: null,
    visualAdoptionEnabled: false,
    disabledReason: ''
  };

  function isZoomSingleWorldOwnerActive() {
    try { return global.__PIXI_MIGRATION_ZOOM_SINGLE_WORLD_OWNER_ACTIVE__ === true; } catch (_) {}
    return false;
  }

  function nowMs() {
    try {
      if (global.performance && typeof global.performance.now === 'function') return global.performance.now();
    } catch (_) {}
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
    var line = '[pixi-migration][step=' + STEP + '][' + String(section || 'event') + ']';
    var extra = formatPayload(payload);
    if (extra) line += ' ' + extra;
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
    return line;
  }

  function notify(payload, section) {
    payload = payload || {};
    try {
      var diag = global.__PIXI_MIGRATION_PIXI_DYNAMIC_RENDERABLE_CONSUMER_DIAGNOSTICS__ || null;
      if (diag && typeof diag.notePixiDynamicRenderableConsumer === 'function') {
        diag.notePixiDynamicRenderableConsumer(payload, { section: section || payload.section || 'event', source: payload.source || PHASE });
        return;
      }
    } catch (_) {}
    emit(section || payload.section || 'event', payload);
  }

  function maybeStart(reason) {
    if (state.started) return;
    state.started = true;
    notify({
      owner: OWNER,
      layer: 'presentation/render/optimization',
      touchedFeature: 'pixi-dynamic-prefab-sprite-visual-adoption',
      targetKinds: 'prefab-sprite',
      experimentalDynamicAdoption: true,
      modifiesRendering: true,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: reason || 'module-load'
    }, 'start');
  }

  function getPixiConstructor(name) {
    try { return global.PIXI && global.PIXI[name] || null; } catch (_) {}
    return null;
  }

  function getSpriteRendererApi() {
    try { return global.__APP_PRESENTATION_PREFAB_SPRITE_RENDERER__ || global.__PREFAB_SPRITE_RENDERER__ || null; } catch (_) {}
    return null;
  }

  function getHabboCompositeApi() {
    try { return global.__APP_PRESENTATION_HABBO_COMPOSITE_RENDERER__ || global.__HABBO_COMPOSITE_RENDERER__ || null; } catch (_) {}
    return null;
  }

  function getPrefabByIdSafe(prefabId) {
    try {
      if (typeof global.getPrefabById === 'function') return global.getPrefabById(prefabId) || null;
    } catch (_) {}
    try {
      var list = Array.isArray(global.prototypes) ? global.prototypes : [];
      for (var i = 0; i < list.length; i++) if (list[i] && String(list[i].id) === String(prefabId)) return list[i];
    } catch (_) {}
    return null;
  }

  function getInstanceByIdSafe(instanceId) {
    try {
      var list = Array.isArray(global.instances) ? global.instances : [];
      for (var i = 0; i < list.length; i++) if (list[i] && String(list[i].instanceId) === String(instanceId)) return list[i];
    } catch (_) {}
    return null;
  }

  function getSettings() {
    try { if (global.settings && typeof global.settings === 'object') return global.settings; } catch (_) {}
    return { tileW: 80 };
  }

  function isoSafe(x, y, z) {
    try {
      if (typeof global.iso === 'function') return global.iso(Number(x || 0), Number(y || 0), Number(z || 0)) || { x: 0, y: 0 };
    } catch (_) {}
    var settings = getSettings();
    var tileW = Number(settings.tileW || 80);
    var tileH = Number(settings.tileH || 40);
    return { x: (Number(x || 0) - Number(y || 0)) * tileW / 2, y: (Number(x || 0) + Number(y || 0)) * tileH / 2 - Number(z || 0) * tileH };
  }

  function isImageReady(img) {
    if (!img) return false;
    var w = Number(img.naturalWidth || img.videoWidth || img.width || 0);
    var h = Number(img.naturalHeight || img.videoHeight || img.height || 0);
    if (!w || !h) return false;
    try {
      if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement && img.complete === false) return false;
    } catch (_) {}
    return true;
  }

  function getSimpleSpriteDrawSnapshot(renderable, instance, prefab) {
    var spriteApi = getSpriteRendererApi();
    if (!spriteApi || typeof spriteApi.getPrefabSpriteConfig !== 'function' || typeof spriteApi.getPrefabSpriteImage !== 'function') return { ok: false, reason: 'prefab-sprite-renderer-api-missing' };
    if (!prefab || (typeof spriteApi.prefabHasSprite === 'function' && !spriteApi.prefabHasSprite(prefab))) return { ok: false, reason: 'prefab-has-no-sprite' };
    var rotation = instance && instance.rotation != null ? Number(instance.rotation || 0) : 0;
    var spriteCfg = spriteApi.getPrefabSpriteConfig(prefab, rotation);
    var img = spriteApi.getPrefabSpriteImage(prefab, rotation);
    if (!spriteCfg || !img || !isImageReady(img)) return { ok: false, reason: 'sprite-image-not-ready' };
    if (spriteCfg.flipX) return { ok: false, reason: 'flipx-not-supported-in-pxm0711a' };
    var settings = getSettings();
    var spritePixelScale = Number(settings.tileW || 80) / 64;
    if (prefab.kind === 'habbo_import') {
      var visualSize = Math.max(1, Number(spriteCfg.visualSize) || 64);
      spritePixelScale = Number(settings.tileW || 80) / visualSize;
    }
    var totalScale = Math.max(0.05, Number(spriteCfg.scale) || 1) * spritePixelScale;
    var srcW = Number(img.naturalWidth || img.width || 0);
    var srcH = Number(img.naturalHeight || img.height || 0);
    var drawW = Math.max(1, Math.round(srcW * totalScale));
    var drawH = Math.max(1, Math.round(srcH * totalScale));
    var offsetX = Math.round((spriteCfg.offsetPx && spriteCfg.offsetPx.x || 0) * spritePixelScale);
    var offsetY = Math.round((spriteCfg.offsetPx && spriteCfg.offsetPx.y || 0) * spritePixelScale);
    var anchor = prefab.anchor || { x: 0, y: 0, z: 0 };
    var x = 0;
    var y = 0;
    if (String(spriteCfg.anchorMode || '') === 'scuti-floor-origin') {
      var habbo = getHabboCompositeApi();
      if (habbo && typeof habbo.getHabboRoomOrigin === 'function') {
        var roomOrigin = habbo.getHabboRoomOrigin(prefab, instance, anchor, rotation);
        x = Math.round(Number(roomOrigin && roomOrigin.x || 0) + offsetX);
        y = Math.round(Number(roomOrigin && roomOrigin.y || 0) + offsetY);
      } else {
        return { ok: false, reason: 'habbo-room-origin-api-missing' };
      }
    } else {
      var foot = isoSafe(Number(instance.x || 0) + Number(anchor.x || 0), Number(instance.y || 0) + Number(anchor.y || 0), Number(instance.z || 0) + Number(anchor.z || 0));
      x = Math.round(Number(foot.x || 0) - drawW / 2 + offsetX);
      y = Math.round(Number(foot.y || 0) - drawH + offsetY);
    }
    return {
      ok: true,
      source: img,
      x: x,
      y: y,
      width: drawW,
      height: drawH,
      textureKey: ['simple', prefab.id || '', rotation, spriteCfg.image || '', drawW, drawH, x, y].join('|'),
      textureSourceType: 'image',
      prefabKind: prefab.kind || '',
      anchorMode: String(spriteCfg.anchorMode || '')
    };
  }

  function getHabboCompositeDrawSnapshot(renderable, instance, prefab) {
    if (!(prefab && prefab.kind === 'habbo_import' && prefab.habboLayerDirections)) return { ok: false, reason: 'not-habbo-composite' };
    var habbo = getHabboCompositeApi();
    if (!habbo || typeof habbo.getHabboComposite !== 'function' || typeof habbo.getHabboRoomOrigin !== 'function') return { ok: false, reason: 'habbo-composite-api-missing' };
    var rotation = instance && instance.rotation != null ? Number(instance.rotation || 0) : 0;
    var composite = habbo.getHabboComposite(prefab, rotation);
    if (!composite || !composite.canvas || !Number(composite.width || 0) || !Number(composite.height || 0)) return { ok: false, reason: 'habbo-composite-not-ready' };
    var anchor = prefab.anchor || { x: 0, y: 0, z: 0 };
    var roomOrigin = habbo.getHabboRoomOrigin(prefab, instance, anchor, rotation);
    var x = Math.round(Number(roomOrigin && roomOrigin.x || 0) + Number(composite.offsetPx && composite.offsetPx.x || 0));
    var y = Math.round(Number(roomOrigin && roomOrigin.y || 0) + Number(composite.offsetPx && composite.offsetPx.y || 0));
    return {
      ok: true,
      source: composite.canvas,
      x: x,
      y: y,
      width: Math.max(1, Math.round(Number(composite.width || 0))),
      height: Math.max(1, Math.round(Number(composite.height || 0))),
      textureKey: ['habbo-composite', prefab.id || '', rotation, composite.width || 0, composite.height || 0].join('|'),
      textureSourceType: 'canvas',
      prefabKind: prefab.kind || 'habbo_import',
      anchorMode: 'habbo-composite'
    };
  }

  function getDrawSnapshot(renderable) {
    if (!renderable) return { ok: false, reason: 'renderable-missing' };
    if (String(renderable.kind || '') !== 'prefab-sprite') return { ok: false, reason: 'unsupported-kind-' + String(renderable.kind || 'unknown') };
    var instance = getInstanceByIdSafe(renderable.instanceId);
    if (!instance) return { ok: false, reason: 'instance-missing' };
    var prefab = getPrefabByIdSafe(renderable.prefabId || instance.prefabId);
    if (!prefab) return { ok: false, reason: 'prefab-missing' };
    var habboSnapshot = getHabboCompositeDrawSnapshot(renderable, instance, prefab);
    if (habboSnapshot && habboSnapshot.ok) return Object.assign(habboSnapshot, { instanceId: instance.instanceId || null, prefabId: prefab.id || null });
    var simpleSnapshot = getSimpleSpriteDrawSnapshot(renderable, instance, prefab);
    if (simpleSnapshot && simpleSnapshot.ok) return Object.assign(simpleSnapshot, { instanceId: instance.instanceId || null, prefabId: prefab.id || null });
    return simpleSnapshot || habboSnapshot || { ok: false, reason: 'draw-snapshot-unavailable' };
  }

  function makeRenderableKey(renderable) {
    return [String(renderable && renderable.id || 'dynamic'), String(renderable && renderable.instanceId || 'no-instance'), String(renderable && renderable.prefabId || 'no-prefab')].join('|');
  }

  function getTexture(Texture, snapshot) {
    if (!Texture || typeof Texture.from !== 'function' || !snapshot || !snapshot.source) return null;
    var key = String(snapshot.textureKey || 'texture');
    var cached = state.textures[key];
    if (cached) {
      state.textureReusedCount += 1;
      return cached;
    }
    try {
      var texture = Texture.from(snapshot.source);
      try {
        var SCALE_MODES = global.PIXI && global.PIXI.SCALE_MODES;
        if (texture && texture.baseTexture && SCALE_MODES && SCALE_MODES.NEAREST != null) texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        if (texture && texture.source && texture.source.scaleMode != null && SCALE_MODES && SCALE_MODES.NEAREST != null) texture.source.scaleMode = SCALE_MODES.NEAREST;
      } catch (_) {}
      state.textures[key] = texture;
      state.textureCreatedCount += 1;
      return texture;
    } catch (_) {}
    return null;
  }

  function beginFrame(options) {
    maybeStart('begin-frame');
    options = options || {};
    state.frameId = String(options.framePlanId || options.frameId || 'frame');
    state.container = options.container || null;
    state.seenKeys = Object.create(null);
    state.adoptedCountThisFrame = 0;
    state.skippedByCanvas2dThisFrame = 0;
    state.unsupportedCountThisFrame = 0;
    state.visualAdoptionEnabled = options.visualAdoption === true;
    state.disabledReason = String(options.disabledReason || '');
    if (!state.visualAdoptionEnabled) {
      // PXM-07.11E: prevent unsafe split-world dynamic adoption.
      try {
        var existingKeys = Object.keys(state.sprites || {});
        for (var ei = 0; ei < existingKeys.length; ei++) {
          var existingSprite = state.sprites[existingKeys[ei]];
          try { if (existingSprite && existingSprite.parent && typeof existingSprite.parent.removeChild === 'function') existingSprite.parent.removeChild(existingSprite); } catch (_) {}
          try { if (existingSprite && typeof existingSprite.destroy === 'function') existingSprite.destroy({ children: true, texture: false, baseTexture: false }); } catch (_) {}
          delete state.sprites[existingKeys[ei]];
          delete state.adoptedKeys[existingKeys[ei]];
        }
      } catch (_) {}
    }
    notify({
      section: 'begin-frame',
      activeBackend: options.activeBackend || 'pixi',
      framePlanId: state.frameId,
      hasContainer: !!state.container,
      visualAdoption: state.visualAdoptionEnabled,
      visualAdoptionDisabledReason: state.disabledReason,
      targetKinds: 'prefab-sprite',
      experimentalDynamicAdoption: true,
      canvas2dFallback: 'enabled-for-nonadopted-renderables',
      source: options.source || 'pixi-dynamic-begin-frame'
    }, 'begin-frame');
    return true;
  }

  function adoptRenderable(renderable, meta) {
    maybeStart('adopt-renderable');
    if (!state.container) return false;
    var Sprite = getPixiConstructor('Sprite');
    var Texture = getPixiConstructor('Texture');
    if (typeof Sprite !== 'function' || !Texture) return false;
    var kind = String(renderable && renderable.kind || 'unknown');
    if (kind !== 'prefab-sprite') {
      state.unsupportedCountThisFrame += 1;
      return false;
    }
    var snapshot = getDrawSnapshot(renderable);
    if (!snapshot || snapshot.ok !== true) {
      state.unsupportedCountThisFrame += 1;
      notify({
        section: 'dynamic-renderable-fallback',
        activeBackend: 'pixi',
        renderableId: renderable && renderable.id || '',
        kind: kind,
        instanceId: renderable && renderable.instanceId || '',
        prefabId: renderable && renderable.prefabId || '',
        pixiDrawsDynamicRenderable: false,
        canvas2dSkipsDynamicRenderable: false,
        fallbackReason: snapshot && snapshot.reason || 'snapshot-unavailable',
        source: 'pixi-dynamic-adopt-renderable'
      }, 'dynamic-renderable-fallback');
      return false;
    }
    var texture = getTexture(Texture, snapshot);
    if (!texture) return false;
    var key = makeRenderableKey(renderable);
    var sprite = state.sprites[key];
    if (!sprite) {
      try {
        sprite = new Sprite(texture);
        sprite.label = 'pixi-migration-dynamic-renderable-' + key;
        sprite.roundPixels = true;
        try { sprite.eventMode = 'none'; } catch (_) {}
        state.sprites[key] = sprite;
        state.spriteCreatedCount += 1;
        if (typeof state.container.addChild === 'function') state.container.addChild(sprite);
      } catch (_) { return false; }
    } else {
      state.spriteReusedCount += 1;
      try { sprite.texture = texture; } catch (_) {}
      if (sprite.parent !== state.container && typeof state.container.addChild === 'function') state.container.addChild(sprite);
    }
    try {
      sprite.x = Math.round(Number(snapshot.x || 0));
      sprite.y = Math.round(Number(snapshot.y || 0));
      sprite.width = Math.max(1, Math.round(Number(snapshot.width || 1)));
      sprite.height = Math.max(1, Math.round(Number(snapshot.height || 1)));
      sprite.visible = true;
      sprite.alpha = 1;
      sprite.eventMode = 'none';
    } catch (_) {}
    state.seenKeys[key] = true;
    state.adoptedKeys[key] = {
      frameId: state.frameId,
      renderableId: renderable && renderable.id || '',
      instanceId: snapshot.instanceId || renderable.instanceId || '',
      prefabId: snapshot.prefabId || renderable.prefabId || '',
      kind: kind,
      x: Math.round(Number(snapshot.x || 0)),
      y: Math.round(Number(snapshot.y || 0)),
      width: Math.round(Number(snapshot.width || 0)),
      height: Math.round(Number(snapshot.height || 0)),
      textureSourceType: snapshot.textureSourceType || '',
      prefabKind: snapshot.prefabKind || '',
      anchorMode: snapshot.anchorMode || ''
    };
    state.adoptedCountThisFrame += 1;
    state.skippedByCanvas2dThisFrame += 1;
    notify({
      section: 'dynamic-renderable-adopted',
      activeBackend: 'pixi',
      renderableId: renderable && renderable.id || '',
      kind: kind,
      instanceId: snapshot.instanceId || '',
      prefabId: snapshot.prefabId || '',
      pixiDrawsDynamicRenderable: true,
      canvas2dSkipsDynamicRenderable: true,
      textureSourceType: snapshot.textureSourceType || '',
      spriteX: Math.round(Number(snapshot.x || 0)),
      spriteY: Math.round(Number(snapshot.y || 0)),
      spriteWidth: Math.round(Number(snapshot.width || 0)),
      spriteHeight: Math.round(Number(snapshot.height || 0)),
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: 'pixi-dynamic-adopt-renderable'
    }, 'dynamic-renderable-adopted');
    return true;
  }

  function shouldSkipCanvas2dDynamicRenderable(renderable, meta) {
    if (isZoomSingleWorldOwnerActive()) return false;
    if (!state.visualAdoptionEnabled) return false;
    if (adoptRenderable(renderable, meta || {})) return true;
    return false;
  }

  function endFrame(options) {
    options = options || {};
    var removed = 0;
    try {
      var keys = Object.keys(state.sprites);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (state.seenKeys[key]) continue;
        var sprite = state.sprites[key];
        try { if (sprite && sprite.parent && typeof sprite.parent.removeChild === 'function') sprite.parent.removeChild(sprite); } catch (_) {}
        try { if (sprite && typeof sprite.destroy === 'function') sprite.destroy({ children: true, texture: false, baseTexture: false }); } catch (_) {}
        delete state.sprites[key];
        delete state.adoptedKeys[key];
        removed += 1;
      }
    } catch (_) {}
    var activeSpriteCount = 0;
    try { activeSpriteCount = Object.keys(state.sprites).length; } catch (_) {}
    var summary = {
      section: 'summary',
      ok: true,
      activeBackend: options.activeBackend || 'pixi',
      framePlanId: state.frameId,
      pixiDrawsDynamicRenderables: state.visualAdoptionEnabled && state.adoptedCountThisFrame > 0,
      canvas2dSkipsAdoptedDynamicRenderables: state.visualAdoptionEnabled && state.skippedByCanvas2dThisFrame > 0,
      adoptedDynamicRenderableCount: state.adoptedCountThisFrame,
      skippedByCanvas2dCount: state.skippedByCanvas2dThisFrame,
      unsupportedDynamicRenderableCount: state.unsupportedCountThisFrame,
      activeDynamicSpriteCount: activeSpriteCount,
      removedOrphanDynamicSprites: removed,
      textureCreatedCount: state.textureCreatedCount,
      textureReusedCount: state.textureReusedCount,
      spriteCreatedCount: state.spriteCreatedCount,
      spriteReusedCount: state.spriteReusedCount,
      targetKinds: 'prefab-sprite',
      experimentalDynamicAdoption: true,
      canvas2dFallback: 'enabled-for-nonadopted-renderables',
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: options.source || 'pixi-dynamic-end-frame'
    };
    state.lastSummary = summary;
    global.__PIXI_MIGRATION_LAST_DYNAMIC_RENDERABLE_CONSUMER_SUMMARY__ = summary;
    notify(summary, 'summary');
    return summary;
  }

  function getStatus() {
    return {
      step: STEP,
      phase: PHASE,
      owner: OWNER,
      frameId: state.frameId,
      activeSpriteCount: Object.keys(state.sprites).length,
      textureCount: Object.keys(state.textures).length,
      lastSummary: state.lastSummary,
      targetKinds: 'prefab-sprite',
      experimentalDynamicAdoption: true
    };
  }

  var api = {
    owner: OWNER,
    step: STEP,
    phase: PHASE,
    beginFrame: beginFrame,
    endFrame: endFrame,
    shouldSkipCanvas2dDynamicRenderable: shouldSkipCanvas2dDynamicRenderable,
    getStatus: getStatus
  };

  maybeStart('module-load');
  global.__SHARED_RENDER_OPTIMIZATION_PIXI_DYNAMIC_RENDERABLE_CONSUMER__ = api;
  try {
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.optimization.pixiDynamicRenderableConsumer', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : globalThis);
