// P12a-4: Prefab sprite renderer owner.
(function (global) {
  'use strict';

  var prefabSpriteImageCache = new Map();

  function getHabboCompositeRendererApiForSpriteRenderer() {
    return global.__APP_PRESENTATION_HABBO_COMPOSITE_RENDERER__ || global.__HABBO_COMPOSITE_RENDERER__ || global.IsometricHabboCompositeRenderer || null;
  }

  function requireHabboCompositeRendererForSpriteRenderer() {
    var api = getHabboCompositeRendererApiForSpriteRenderer();
    if (!api) throw new Error('habbo-composite-renderer.js must load before prefab-sprite-renderer.js');
    return api;
  }

  function rotKeyForSprite() {
    return requireHabboCompositeRendererForSpriteRenderer().rotKeyForSprite.apply(null, arguments);
  }

  function getHabboLayerConfigList() {
    return requireHabboCompositeRendererForSpriteRenderer().getHabboLayerConfigList.apply(null, arguments);
  }

  function getHabboComposite() {
    return requireHabboCompositeRendererForSpriteRenderer().getHabboComposite.apply(null, arguments);
  }

  function getHabboRoomOrigin() {
    return requireHabboCompositeRendererForSpriteRenderer().getHabboRoomOrigin.apply(null, arguments);
  }

  function getHabboLayerDrawable() {
    return requireHabboCompositeRendererForSpriteRenderer().getHabboLayerDrawable.apply(null, arguments);
  }

  function getHabboLayerLocalBox() {
    return requireHabboCompositeRendererForSpriteRenderer().getHabboLayerLocalBox.apply(null, arguments);
  }

  function getHabboCanvasBlendMode() {
    return requireHabboCompositeRendererForSpriteRenderer().getHabboCanvasBlendMode.apply(null, arguments);
  }

  function getHabboInstanceVisualShift() {
    return requireHabboCompositeRendererForSpriteRenderer().getHabboInstanceVisualShift.apply(null, arguments);
  }

  function withScreenTranslate() {
    return requireHabboCompositeRendererForSpriteRenderer().withScreenTranslate.apply(null, arguments);
  }

  function getCachedImageFromDataUrl(key, dataUrl) {
    if (!dataUrl) return null;
    var cached = prefabSpriteImageCache.get(key);
    if (cached) return cached;
    var img = new Image();
    img.src = dataUrl;
    prefabSpriteImageCache.set(key, img);
    return img;
  }

  function getPrefabSpriteConfig(prefab, rotation) {
    if (!prefab) return null;
    var facingApi = getItemFacingCoreApi();
    var resolved = facingApi && typeof facingApi.resolveSpriteFacing === 'function'
      ? facingApi.resolveSpriteFacing(prefab, rotation)
      : { directionKey: rotKeyForSprite(rotation), mirrorX: false, strategy: 'single', availableKeys: [rotKeyForSprite(rotation)] };
    var raw = null;
    if (prefab.spriteDirections && prefab.spriteDirections[resolved.directionKey]) raw = prefab.spriteDirections[resolved.directionKey];
    else if (prefab.spriteDirections && prefab.spriteDirections['0']) raw = prefab.spriteDirections['0'];
    else raw = prefab.sprite || null;
    if (!raw) return null;
    return Object.assign({}, raw, {
      flipX: !!raw.flipX !== !!resolved.mirrorX,
      __resolvedDirectionKey: resolved.directionKey,
      __spriteStrategy: resolved.strategy,
      __availableDirectionKeys: resolved.availableKeys || []
    });
  }

  function getPrefabSpriteImage(prefab, rotation) {
    var spriteCfg = getPrefabSpriteConfig(prefab, rotation);
    if (!spriteCfg || !spriteCfg.image) return null;
    var key = prefab.id + '|' + rotKeyForSprite(rotation) + '|' + spriteCfg.image + '|' + (!!spriteCfg.flipX);
    var cached = prefabSpriteImageCache.get(key);
    if (cached) return cached;
    var img = new Image();
    img.onload = function(){ detailLog('prefab-sprite: loaded ' + prefab.id + ' ' + img.naturalWidth + 'x' + img.naturalHeight); };
    img.onerror = function(){ detailLog('prefab-sprite:error ' + prefab.id + ' ' + spriteCfg.image); };
    img.src = spriteCfg.image;
    prefabSpriteImageCache.set(key, img);
    return img;
  }

  function prefabDrawsVoxels(prefab) {
    return !prefab || (prefab.renderMode || 'voxel') !== 'sprite_proxy';
  }

  function prefabHasSprite(prefab) {
    if (!prefab || (prefab.renderMode || 'voxel') === 'voxel') return false;
    if (prefab.kind === 'habbo_import' && prefab.habboLayerDirections) {
      var layerKeys = Object.keys(prefab.habboLayerDirections);
      for (var li = 0; li < layerKeys.length; li++) {
        var rawLayers = prefab.habboLayerDirections[layerKeys[li]];
        if (Array.isArray(rawLayers) && rawLayers.some(function (layer) { return !!(layer && (layer.image || layer.canvas)); })) return true;
      }
    }
    if (prefab.sprite && prefab.sprite.image) return true;
    if (prefab.spriteDirections) {
      var keys = Object.keys(prefab.spriteDirections);
      for (var i = 0; i < keys.length; i++) {
        var cfg = prefab.spriteDirections[keys[i]];
        if (cfg && cfg.image) return true;
      }
    }
    return false;
  }

  function drawPrefabSpriteAt(prefab, origin, alpha) {
    if (prefab && prefab.kind === 'habbo_import') {
      detailLog('callsite src/presentation/render/render.js::drawPrefabSpriteAt prefab=' + String(prefab.id || 'unknown') +
        ' hasLayerDirs=' + Object.keys(prefab.habboLayerDirections || {}).join(',') +
        ' hasSpriteDirs=' + Object.keys(prefab.spriteDirections || {}).join(',') +
        ' renderMode=' + String(prefab.renderMode || 'unknown'));
    }
    if (!prefabHasSprite(prefab)) return false;
    var rotation = origin && origin.rotation != null ? origin.rotation : 0;
    var anchor = prefab.anchor || { x: 0, y: 0, z: 0 };
    if (prefab.kind === 'habbo_import' && prefab.habboLayerDirections) {
      var layers = getHabboLayerConfigList(prefab, rotation);
      if (!layers || !layers.length) {
        detailLog('callsite src/presentation/render/render.js::drawPrefabSpriteAt layered-miss prefab=' + String(prefab.id || 'unknown') + ' rotation=' + String(rotation) + ' keys=' + Object.keys(prefab.habboLayerDirections || {}).join(','));
        return false;
      }
      var roomOrigin = getHabboRoomOrigin(prefab, origin, anchor, rotation);
      var dbgKey = prefab.id + '|layers|' + String(rotation || 0) + '|' + String(origin.x || 0) + ',' + String(origin.y || 0) + ',' + String(origin.z || 0);
      var composite = getHabboComposite(prefab, rotation);
      if (composite && composite.canvas && composite.width > 0 && composite.height > 0) {
        var compX = Math.round(roomOrigin.x + (composite.offsetPx && composite.offsetPx.x || 0));
        var compY = Math.round(roomOrigin.y + (composite.offsetPx && composite.offsetPx.y || 0));
        ctx.save();
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(composite.canvas, compX, compY, composite.width, composite.height);
        ctx.restore();
        prefab.__habboLastDraw = { prefabId: prefab.id, origin: cloneJsonSafe(origin), roomOrigin: { x: Math.round(roomOrigin.x), y: Math.round(roomOrigin.y) }, anchor: cloneJsonSafe(anchor), rotation: rotation, composite: { x: compX, y: compY, width: composite.width, height: composite.height, offsetPx: cloneJsonSafe(composite.offsetPx), layers: composite.layers || [] } };
        detailLog('habbo-draw: prefab=' + prefab.id +
          ' origin=(' + [origin.x || 0, origin.y || 0, origin.z || 0].join(',') + ')' +
          ' roomOrigin=(' + Math.round(roomOrigin.x) + ',' + Math.round(roomOrigin.y) + ')' +
          ' anchor=(' + [(anchor.x || 0), (anchor.y || 0), (anchor.z || 0)].join(',') + ')' +
          ' composite=(' + [compX, compY, composite.width, composite.height].join(',') + ')' +
          ' layers=' + String((composite.layers || []).length));
        return true;
      }
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.imageSmoothingEnabled = prefab.kind === 'habbo_import' ? false : true;
      var debugParts = [];
      var drewAny = false;
      var sortedLayers = layers.slice().sort(function (a, b) {
        if ((a.zOrderHint || 0) !== (b.zOrderHint || 0)) return (a.zOrderHint || 0) - (b.zOrderHint || 0);
        var ak = a.kind === 'shadow' ? 0 : 1;
        var bk = b.kind === 'shadow' ? 0 : 1;
        if (ak !== bk) return ak - bk;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
      var layerSnapshots = [];
      for (var li = 0; li < sortedLayers.length; li++) {
        var layer = sortedLayers[li];
        var cacheKey = prefab.id + '|layer|' + rotKeyForSprite(rotation) + '|' + String(layer.name || li);
        var img = getHabboLayerDrawable(layer, cacheKey);
        if (!img) {
          pushHabboDebug('drawLayer:skip', { prefab: prefab.id, reason: 'no-image', rotation: rotation, layer: layer ? layer.name || li : li, origin: cloneJsonSafe(origin) });
          continue;
        }
        var srcW = img.naturalWidth || img.videoWidth || img.width || 0;
        var srcH = img.naturalHeight || img.videoHeight || img.height || 0;
        var needsReady = typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement;
        if ((needsReady && !img.complete) || !srcW || !srcH) {
          pushHabboDebug('drawLayer:skip', { prefab: prefab.id, reason: 'image-not-ready', rotation: rotation, layer: layer ? layer.name || li : li, cacheKey: cacheKey, natural: { w: srcW || 0, h: srcH || 0 }, origin: cloneJsonSafe(origin) });
          continue;
        }
        var visualSize = Math.max(1, Number(layer.visualSize) || 64);
        var habboPixelScale = settings.tileW / visualSize;
        var totalScale = habboPixelScale;
        var drawW = Math.max(1, Math.round(srcW * totalScale));
        var drawH = Math.max(1, Math.round(srcH * totalScale));
        var layerBox = getHabboLayerLocalBox(layer, totalScale, srcW, srcH, prefab);
        var offsetX = Math.round((layer.offsetPx && layer.offsetPx.x || 0) * totalScale);
        var offsetY = Math.round((layer.offsetPx && layer.offsetPx.y || 0) * totalScale);
        var y = Math.round(roomOrigin.y + layerBox.drawY);
        var drawXMin = Math.round(roomOrigin.x + layerBox.drawX);
        var drawXMax = Math.round(roomOrigin.x + layerBox.drawXMax);
        var prevAlpha = ctx.globalAlpha;
        var layerAlpha = Math.max(0, Math.min(1, Number(layer.alpha == null ? 1 : layer.alpha)));
        ctx.globalAlpha = prevAlpha * layerAlpha;
        var prevBlend = ctx.globalCompositeOperation;
        var blend = String(layer.blend || '').toUpperCase();
        ctx.globalCompositeOperation = getHabboCanvasBlendMode(blend);
        if (layer.flipX) {
          ctx.save();
          ctx.translate(drawXMax, y);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, drawW, drawH);
          ctx.restore();
        } else {
          ctx.drawImage(img, drawXMin, y, drawW, drawH);
        }
        ctx.globalCompositeOperation = prevBlend;
        ctx.globalAlpha = prevAlpha;
        drewAny = true;
        var snap = { name: layer.name || ('L' + li), kind: layer.kind || 'body', layerIndex: layer.layerIndex || 0, offsetX: offsetX, offsetY: offsetY, offsetZ: layer.offsetZ || 0, drawX: drawXMin, drawY: y, drawW: drawW, drawH: drawH, drawXMax: drawXMax, flipX: !!layer.flipX, alpha: layerAlpha, blend: blend || 'NORMAL', zOrderHint: layer.zOrderHint || 0, visualSize: visualSize, source: layer.source || '' };
        layerSnapshots.push(snap);
        pushHabboDebug('drawLayer:ok', { prefab: prefab.id, origin: cloneJsonSafe(origin), roomOrigin: { x: Math.round(roomOrigin.x), y: Math.round(roomOrigin.y) }, anchor: cloneJsonSafe(anchor), layer: snap });
        debugParts.push((layer.kind || 'body') + ':' + (layer.name || ('L' + li)) + '#'+String(layer.layerIndex || 0) + '@(' + offsetX + ',' + offsetY + ',' + (layer.offsetZ || 0) + ')' + ' ' + drawW + 'x' + drawH + (layer.flipX ? ' flip' : '') + ' a=' + String(layerAlpha) + (blend ? ' blend=' + blend : ''));
      }
      prefab.__habboLastDraw = { prefabId: prefab.id, origin: cloneJsonSafe(origin), roomOrigin: { x: Math.round(roomOrigin.x), y: Math.round(roomOrigin.y) }, anchor: cloneJsonSafe(anchor), rotation: rotation, layers: layerSnapshots };
      ctx.restore();
      if (drewAny) {
        detailLog('habbo-draw: prefab=' + prefab.id +
          ' origin=(' + [origin.x || 0, origin.y || 0, origin.z || 0].join(',') + ')' +
          ' roomOrigin=(' + Math.round(roomOrigin.x) + ',' + Math.round(roomOrigin.y) + ')' +
          ' anchor=(' + [(anchor.x || 0), (anchor.y || 0), (anchor.z || 0)].join(',') + ')' +
          ' layered=' + debugParts.join(' | '));
      } else {
        detailLog('habbo-draw: prefab=' + prefab.id + ' origin=(' + [origin.x || 0, origin.y || 0, origin.z || 0].join(',') + ') layered=NONE');
      }
      return drewAny;
    }
    var spriteCfg = getPrefabSpriteConfig(prefab, rotation);
    var img = getPrefabSpriteImage(prefab, rotation);
    if (!spriteCfg || !img || !img.complete || !img.naturalWidth || !img.naturalHeight) return false;
    var spritePixelScale = settings.tileW / 64;
    if (prefab.kind === 'habbo_import') {
      var visualSize = Math.max(1, Number(spriteCfg.visualSize) || 64);
      spritePixelScale = settings.tileW / visualSize;
    }
    var totalScale = Math.max(0.05, Number(spriteCfg.scale) || 1) * spritePixelScale;
    var drawW = Math.max(1, Math.round(img.naturalWidth * totalScale));
    var drawH = Math.max(1, Math.round(img.naturalHeight * totalScale));
    var offsetX = Math.round((spriteCfg.offsetPx && spriteCfg.offsetPx.x || 0) * spritePixelScale);
    var offsetY = Math.round((spriteCfg.offsetPx && spriteCfg.offsetPx.y || 0) * spritePixelScale);
    var x = 0;
    var y = 0;
    if (String(spriteCfg.anchorMode || '') === 'scuti-floor-origin') {
      var roomOrigin2 = getHabboRoomOrigin(prefab, origin, anchor, rotation);
      x = Math.round(roomOrigin2.x + offsetX);
      y = Math.round(roomOrigin2.y + offsetY);
    } else {
      var foot = iso((origin.x || 0) + (anchor.x || 0), (origin.y || 0) + (anchor.y || 0), (origin.z || 0) + (anchor.z || 0));
      x = Math.round(foot.x - drawW / 2 + offsetX);
      y = Math.round(foot.y - drawH + offsetY);
    }
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.imageSmoothingEnabled = prefab.kind === 'habbo_import' ? false : true;
    var flatDrawX = x;
    if (spriteCfg.flipX) {
      flatDrawX = x - drawW;
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(img, x, y, drawW, drawH);
    }
    ctx.restore();
    if (prefab.kind === 'habbo_import') detailLog('habbo-draw-flat: prefab=' + prefab.id + ' origin=(' + [origin.x || 0, origin.y || 0, origin.z || 0].join(',') + ') draw=(' + flatDrawX + ',' + y + ') size=' + drawW + 'x' + drawH + ' offset=(' + offsetX + ',' + offsetY + ') anchorMode=' + String(spriteCfg.anchorMode || 'default') + ' flip=' + (!!spriteCfg.flipX));
    return true;
  }

  function drawPrefabSpriteInstance(instance, alpha) {
    var prefab = getPrefabById(instance.prefabId);
    return drawPrefabSpriteAt(prefab, instance, alpha);
  }

  function getSpriteDepthSplitCandidate(instance, prefab, viewRotation) {
    if (!instance || !prefab || !prefabHasSprite(prefab)) return null;
    if (prefab.kind === 'habbo_import' && prefab.habboLayerDirections) return null;
    var spriteCfg = getPrefabSpriteConfig(prefab, instance && instance.rotation != null ? instance.rotation : 0);
    var img = getPrefabSpriteImage(prefab, instance && instance.rotation != null ? instance.rotation : 0);
    if (!spriteCfg || !img || !img.complete || !img.naturalWidth || !img.naturalHeight) return null;
    if (spriteCfg.flipX) return null;
    var splitMode = String(spriteCfg.depthSplitMode || prefab.depthSplitMode || 'auto-small-footprint');
    if (splitMode === 'off' || splitMode === 'disabled' || splitMode === 'none') return null;
    var instBoxes = boxes.filter(function (b) { return b && b.instanceId === instance.instanceId; });
    if (!instBoxes.length) return null;
    var domainCore = getDomainSceneCoreApi();
    if (!domainCore || typeof domainCore.buildTileAlignedSpriteRenderParts !== 'function') return null;
    var maxParts = Math.max(1, Number(spriteCfg.depthSplitMaxParts || prefab.depthSplitMaxParts || 4) || 4);
    var result = domainCore.buildTileAlignedSpriteRenderParts({
      cells: instBoxes.map(function (b) { return { x: b.x, y: b.y, z: b.z, h: b.h || 1 }; }),
      maxParts: maxParts,
      viewRotation: normalizeMainEditorViewRotationValue(viewRotation)
    });
    if (!result || result.split !== true || !Array.isArray(result.parts) || result.parts.length <= 1) return null;
    return result;
  }

  function drawPrefabSpritePartInstance(instance, prefab, part, alpha) {
    if (!instance || !prefab || !part) return false;
    if (prefab.kind === 'habbo_import' && prefab.habboLayerDirections) return false;
    var rotation = instance && instance.rotation != null ? instance.rotation : 0;
    var spriteCfg = getPrefabSpriteConfig(prefab, rotation);
    var img = getPrefabSpriteImage(prefab, rotation);
    if (!spriteCfg || !img || !img.complete || !img.naturalWidth || !img.naturalHeight) return false;
    if (spriteCfg.flipX) return drawPrefabSpriteAt(prefab, instance, alpha);
    var anchor = prefab.anchor || { x: 0, y: 0, z: 0 };
    var spritePixelScale = settings.tileW / 64;
    if (prefab.kind === 'habbo_import') {
      var visualSize = Math.max(1, Number(spriteCfg.visualSize) || 64);
      spritePixelScale = settings.tileW / visualSize;
    }
    var totalScale = Math.max(0.05, Number(spriteCfg.scale) || 1) * spritePixelScale;
    var drawW = Math.max(1, Math.round(img.naturalWidth * totalScale));
    var drawH = Math.max(1, Math.round(img.naturalHeight * totalScale));
    var offsetX = Math.round((spriteCfg.offsetPx && spriteCfg.offsetPx.x || 0) * spritePixelScale);
    var offsetY = Math.round((spriteCfg.offsetPx && spriteCfg.offsetPx.y || 0) * spritePixelScale);
    var x = 0;
    var y = 0;
    if (String(spriteCfg.anchorMode || '') === 'scuti-floor-origin') {
      var roomOrigin2 = getHabboRoomOrigin(prefab, instance, anchor, rotation);
      x = Math.round(roomOrigin2.x + offsetX);
      y = Math.round(roomOrigin2.y + offsetY);
    } else {
      var foot = iso((instance.x || 0) + (anchor.x || 0), (instance.y || 0) + (anchor.y || 0), (instance.z || 0) + (anchor.z || 0));
      x = Math.round(foot.x - drawW / 2 + offsetX);
      y = Math.round(foot.y - drawH + offsetY);
    }
    var count = Math.max(1, Math.round(Number(part.sourceCount) || 1));
    var index = Math.max(0, Math.min(count - 1, Math.round(Number(part.sourceIndex) || 0)));
    var srcX0 = Math.floor((img.naturalWidth * index) / count);
    var srcX1 = Math.floor((img.naturalWidth * (index + 1)) / count);
    var dstX0 = x + Math.floor((drawW * index) / count);
    var dstX1 = x + Math.floor((drawW * (index + 1)) / count);
    var srcW = Math.max(1, srcX1 - srcX0);
    var dstW = Math.max(1, dstX1 - dstX0);
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.imageSmoothingEnabled = prefab.kind === 'habbo_import' ? false : true;
    ctx.drawImage(img, srcX0, 0, srcW, img.naturalHeight, dstX0, y, dstW, drawH);
    ctx.restore();
    return true;
  }

  function drawHabboDebugOverlay() {
    if (!ui.showHabboDebugOverlay || !ui.showHabboDebugOverlay.checked || typeof prototypes === 'undefined') return;
    ctx.save();
    ctx.font = '11px monospace';
    var count = 0;
    for (var i = 0; i < prototypes.length; i++) {
      var prefab = prototypes[i];
      if (!prefab || prefab.kind !== 'habbo_import' || !prefab.__habboLastDraw) continue;
      var dbg = prefab.__habboLastDraw;
      count++;
      ctx.strokeStyle = 'rgba(255,0,255,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dbg.roomOrigin.x - 6, dbg.roomOrigin.y); ctx.lineTo(dbg.roomOrigin.x + 6, dbg.roomOrigin.y);
      ctx.moveTo(dbg.roomOrigin.x, dbg.roomOrigin.y - 6); ctx.lineTo(dbg.roomOrigin.x, dbg.roomOrigin.y + 6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(prefab.id + ' origin=(' + [dbg.origin.x||0, dbg.origin.y||0, dbg.origin.z||0].join(',') + ')', dbg.roomOrigin.x + 8, dbg.roomOrigin.y - 8);
      for (var li = 0; li < (dbg.layers || []).length; li++) {
        var layer = dbg.layers[li];
        ctx.strokeStyle = layer.kind === 'shadow' ? 'rgba(80,160,255,0.95)' : 'rgba(255,200,0,0.95)';
        ctx.strokeRect(layer.drawX, layer.drawY, layer.drawW, layer.drawH);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(layer.kind + ':' + layer.name + (layer.flipX ? ':flip' : ''), layer.drawX + 2, layer.drawY + 12);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText('HabboDebug overlay count=' + count, 18, VIEW_H - 18);
    ctx.restore();
  }

  function getInstanceProxyBounds(instance) {
    var domainCore = getDomainSceneCoreApi();
    if (domainCore && typeof domainCore.getInstanceBoundsFromBoxes === 'function') {
      return domainCore.getInstanceBoundsFromBoxes(boxes, instance && instance.instanceId ? instance.instanceId : null);
    }
    var instanceBoxes = boxes.filter(function (b) { return b.instanceId === instance.instanceId; });
    if (!instanceBoxes.length) return null;
    var minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (var i = 0; i < instanceBoxes.length; i++) {
      var b = instanceBoxes[i];
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      minZ = Math.min(minZ, b.z);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.d);
      maxZ = Math.max(maxZ, b.z + b.h);
    }
    return { minX: minX, minY: minY, minZ: minZ, maxX: maxX, maxY: maxY, maxZ: maxZ };
  }

  function lineYAtX(a, b, x) {
    var dx = b.x - a.x;
    if (Math.abs(dx) < EPS) return (a.y + b.y) / 2;
    var t = (x - a.x) / dx;
    return a.y + (b.y - a.y) * t;
  }

  function classifyPlayerAgainstProxyBox(bounds) {
    var domainCore = getDomainSceneCoreApi();
    if (domainCore && typeof domainCore.computeProjectedPlayerSpriteOcclusion === 'function') {
      if (!bounds) return 'none';
      return domainCore.computeProjectedPlayerSpriteOcclusion({
        bounds: bounds,
        playerFoot: iso(player.x, player.y, 0),
        left: iso(bounds.minX, bounds.maxY, 0),
        tip: iso(bounds.maxX, bounds.maxY, 0),
        right: iso(bounds.maxX, bounds.minY, 0),
        tileW: settings.tileW,
        tileH: settings.tileH,
        playerProxyW: settings.playerProxyW,
        playerProxyD: settings.playerProxyD
      });
    }
    if (!bounds) return 'none';
    var foot = iso(player.x, player.y, 0);
    var left = iso(bounds.minX, bounds.maxY, 0);
    var tip = iso(bounds.maxX, bounds.maxY, 0);
    var right = iso(bounds.maxX, bounds.minY, 0);
    var playerMarginX = Math.max(settings.tileW * 0.18, (settings.playerProxyW + settings.playerProxyD) * settings.tileW * 0.12);
    if (foot.x < left.x - playerMarginX || foot.x > right.x + playerMarginX) return 'none';
    var boundaryY = foot.x <= tip.x ? lineYAtX(left, tip, foot.x) : lineYAtX(tip, right, foot.x);
    var depthMargin = Math.max(4, settings.tileH * 0.18);
    if (foot.y < boundaryY - depthMargin) return 'occlude';
    if (foot.y > boundaryY + depthMargin) return 'in_front';
    return 'none';
  }

  function getSpriteProxySortMode(prefab) {
    var mode = prefab && prefab.sprite && prefab.sprite.sortMode;
    return String(mode || 'box_occlusion');
  }

  function computeSpriteRenderableSort(instance, prefab) {
    var domainCore = getDomainSceneCoreApi();
    var occlusion = 'none';
    var viewRotation = normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation);
    if (SHOW_PLAYER && prefabHasSprite(prefab) && getSpriteProxySortMode(prefab) === 'box_occlusion') {
      occlusion = classifyPlayerAgainstProxyBox(getInstanceProxyBounds(instance));
    }
    if (domainCore && typeof domainCore.computeSpriteRenderableSort === 'function') {
      return domainCore.computeSpriteRenderableSort({
        instance: instance,
        prefab: prefab,
        x: instance && instance.x,
        y: instance && instance.y,
        z: instance && instance.z,
        h: prefab && prefab.h,
        occlusion: occlusion,
        showPlayer: SHOW_PLAYER,
        playerLine: player.x + player.y + 0.001,
        sortMode: getSpriteProxySortMode(prefab),
        viewRotation: viewRotation
      });
    }
    var facingApi = getItemFacingCoreApi();
    var sortBase = facingApi && typeof facingApi.computeSortBase === 'function'
      ? facingApi.computeSortBase(prefab, instance && instance.rotation != null ? instance.rotation : 0, instance)
      : null;
    var anchor = sortBase && sortBase.rotatedAnchor ? sortBase.rotatedAnchor : { x: 0, y: 0, z: 0 };
    var sortMeta = computeViewAwareSortMeta({
      x: (instance && instance.x || 0) + (anchor.x || 0),
      y: (instance && instance.y || 0) + (anchor.y || 0),
      z: (instance && instance.z || 0) + (anchor.z || 0)
    }, prefab && prefab.h, viewRotation);
    return { sortKey: Number(sortMeta.sortKey || 0) + 0.0005, tie: Number(sortMeta.tie || 0) + 300000, occlusion: occlusion, sortBase: sortBase };
  }

  var api = {
    getCachedImageFromDataUrl: getCachedImageFromDataUrl,
    getPrefabSpriteConfig: getPrefabSpriteConfig,
    getPrefabSpriteImage: getPrefabSpriteImage,
    prefabDrawsVoxels: prefabDrawsVoxels,
    prefabHasSprite: prefabHasSprite,
    drawPrefabSpriteAt: drawPrefabSpriteAt,
    drawPrefabSpriteInstance: drawPrefabSpriteInstance,
    getSpriteDepthSplitCandidate: getSpriteDepthSplitCandidate,
    drawPrefabSpritePartInstance: drawPrefabSpritePartInstance,
    drawHabboDebugOverlay: drawHabboDebugOverlay,
    getInstanceProxyBounds: getInstanceProxyBounds,
    lineYAtX: lineYAtX,
    classifyPlayerAgainstProxyBox: classifyPlayerAgainstProxyBox,
    getSpriteProxySortMode: getSpriteProxySortMode,
    computeSpriteRenderableSort: computeSpriteRenderableSort,
  };
  global.__APP_PRESENTATION_PREFAB_SPRITE_RENDERER__ = api;
  global.__PREFAB_SPRITE_RENDERER__ = api;
  global.IsometricPrefabSpriteRenderer = api;
})(typeof window !== 'undefined' ? window : globalThis);
