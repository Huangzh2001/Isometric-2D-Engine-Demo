// P12a-4: Habbo composite / placement visual renderer owner.
(function (global) {
  'use strict';

  var prefabSpriteImageCache = new Map();
  var habboCompositeCache = new Map();
  var habboSpriteDrawDebugOnce = new Set();

  function getHabboLayerConfigList(prefab, rotation) {
    if (!prefab || !prefab.habboLayerDirections) return null;
    var facingApi = getItemFacingCoreApi();
    var resolved = facingApi && typeof facingApi.resolveSpriteFacing === 'function'
      ? facingApi.resolveSpriteFacing(prefab, rotation)
      : { directionKey: rotKeyForSprite(rotation), mirrorX: false, strategy: 'single', availableKeys: [rotKeyForSprite(rotation)] };
    var rawList = prefab.habboLayerDirections[resolved.directionKey] || prefab.habboLayerDirections['0'] || null;
    if (!rawList) return null;
    return rawList.map(function (layer) {
      return Object.assign({}, layer, {
        flipX: !!layer.flipX !== !!resolved.mirrorX,
        __resolvedDirectionKey: resolved.directionKey,
        __spriteStrategy: resolved.strategy
      });
    });
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

  function getHabboLayerDrawable(layer, cacheKey) {
    if (!layer) return null;
    if (layer.canvas && (layer.canvas.width || layer.canvas.height)) return layer.canvas;
    if (layer.image) return getCachedImageFromDataUrl(cacheKey || ('habbo-layer|' + String(layer.name || 'unnamed')), layer.image);
    return null;
  }

  function getHabboCanvasBlendMode(blend) {
    var mode = String(blend || '').toUpperCase();
    if (mode === 'ADD') return 'lighter';
    // Habbo XML 里的 COPY 不是 HTML canvas 那种“清空整张目标画布后再复制”的语义。
    // 直接映射成 canvas 'copy' 会把先前已经画好的对象层整块抹掉，造成蓝屏/蓝块假象。
    // 这里退回到 source-over，保持旧版本更接近用户预期的叠加效果。
    return 'source-over';
  }

  function habboCompositeCacheKey(prefab, rotation) {
    var sig = '';
    if (prefab && prefab.habboLayerDirections) {
      var keys = Object.keys(prefab.habboLayerDirections).sort();
      sig = keys.map(function (k) {
        var arr = prefab.habboLayerDirections[k] || [];
        var first = arr[0] && arr[0].name ? arr[0].name : '';
        return k + ':' + arr.length + ':' + first;
      }).join('|');
    }
    return String(prefab && prefab.id || 'unknown') + '|habbo-composite|' + rotKeyForSprite(rotation) + '|tileW=' + String(settings && settings.tileW || 64) + '|tileH=' + String(settings && settings.tileH || 32) + '|sig=' + sig;
  }

  function getHabboPlacementCoreApiForRender() {
    try {
      if (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.habboPlacementCore) return window.App.domain.habboPlacementCore;
    } catch (_) {}
    try {
      if (typeof window !== 'undefined' && window.__HABBO_PLACEMENT_CORE__) return window.__HABBO_PLACEMENT_CORE__;
    } catch (_) {}
    return null;
  }

  function requireHabboPlacementCoreForRender() {
    var api = getHabboPlacementCoreApiForRender();
    if (!api) throw new Error('Missing Habbo placement core: src/core/domain/habbo-placement-core.js must load before src/presentation/render/render.js');
    return api;
  }

  function getHabboTileMetricsForRender() {
    return {
      tileW: Number(settings && settings.tileW || 64),
      tileH: Number(settings && settings.tileH || 32)
    };
  }

  function getHabboPlacementShift(prefab, rotation) {
    return requireHabboPlacementCoreForRender().getHabboPlacementShift(prefab, rotation, getHabboTileMetricsForRender());
  }

  function pixelShiftToCellShift(shift) {
    return requireHabboPlacementCoreForRender().pixelShiftToCellShift(shift, getHabboTileMetricsForRender());
  }

  function cellShiftToPixelShift(cellShift) {
    return requireHabboPlacementCoreForRender().cellShiftToPixelShift(cellShift, getHabboTileMetricsForRender());
  }

  function getHabboPlacementDecomposition(prefab, rotation) {
    return requireHabboPlacementCoreForRender().getHabboPlacementDecomposition(prefab, rotation, getHabboTileMetricsForRender());
  }

  function getHabboPlacementCellShift(prefab, rotation) {
    return requireHabboPlacementCoreForRender().getHabboPlacementCellShift(prefab, rotation, getHabboTileMetricsForRender());
  }

  function getHabboRoomOrigin(prefab, origin, anchor, rotation) {
    return requireHabboPlacementCoreForRender().getHabboRoomOrigin(prefab, origin, anchor, rotation, getHabboTileMetricsForRender(), iso, { floorBaselineOffset: 20 });
  }

  function getHabboProxyVisualShift(prefab, rotation) {
    return requireHabboPlacementCoreForRender().getHabboProxyVisualShift(prefab, rotation, getHabboTileMetricsForRender());
  }

  function withScreenTranslate(shift, drawFn) {
    var sx = Math.round(shift && shift.x || 0);
    var sy = Math.round(shift && shift.y || 0);
    if (!sx && !sy) {
      drawFn();
      return;
    }
    ctx.save();
    ctx.translate(sx, sy);
    try {
      drawFn();
    } finally {
      ctx.restore();
    }
  }

  function getHabboInstanceVisualShift(instance, prefab) {
    return requireHabboPlacementCoreForRender().getHabboInstanceVisualShift(instance, prefab, getHabboTileMetricsForRender());
  }

  function getHabboLayerLocalBox(layer, totalScale, srcW, srcH, prefab) {
    return requireHabboPlacementCoreForRender().getHabboLayerLocalBox(layer, totalScale, srcW, srcH, prefab);
  }

  function buildHabboComposite(prefab, rotation) {
    if (!prefab || prefab.kind !== 'habbo_import') return null;
    var layers = getHabboLayerConfigList(prefab, rotation);
    if (!layers || !layers.length) return null;
    var sortedLayers = layers.slice().sort(function (a, b) {
      if ((a.zOrderHint || 0) !== (b.zOrderHint || 0)) return (a.zOrderHint || 0) - (b.zOrderHint || 0);
      var ak = a.kind === 'shadow' ? 0 : 1;
      var bk = b.kind === 'shadow' ? 0 : 1;
      if (ak !== bk) return ak - bk;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    var prepared = [];
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var li = 0; li < sortedLayers.length; li++) {
      var layer = sortedLayers[li];
      var cacheKey = prefab.id + '|layer|' + rotKeyForSprite(rotation) + '|' + String(layer.name || li);
      var img = getHabboLayerDrawable(layer, cacheKey);
      if (!img) continue;
      var srcW = img.naturalWidth || img.videoWidth || img.width || 0;
      var srcH = img.naturalHeight || img.videoHeight || img.height || 0;
      var needsReady = typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement;
      if ((needsReady && !img.complete) || !srcW || !srcH) {
        pushHabboDebug('habbo-composite:skip-layer', { prefab: prefab.id, rotation: rotation, layer: layer ? layer.name || li : li, reason: 'image-not-ready', natural: { w: srcW || 0, h: srcH || 0 } });
        continue;
      }
      var visualSize = Math.max(1, Number(layer.visualSize) || 64);
      var totalScale = settings.tileW / visualSize;
      var drawW = Math.max(1, Math.round(srcW * totalScale));
      var drawH = Math.max(1, Math.round(srcH * totalScale));
      var layerBox = getHabboLayerLocalBox(layer, totalScale, srcW, srcH, prefab);
      var offsetX = Math.round((layer.offsetPx && layer.offsetPx.x || 0) * totalScale);
      var offsetY = Math.round((layer.offsetPx && layer.offsetPx.y || 0) * totalScale);
      var drawXMin = layerBox.drawX;
      var y = layerBox.drawY;
      var drawXMax = layerBox.drawXMax;
      minX = Math.min(minX, drawXMin);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, drawXMax);
      maxY = Math.max(maxY, y + drawH);
      prepared.push({
        layer: layer,
        img: img,
        drawX: drawXMin,
        drawY: y,
        drawXMax: drawXMax,
        drawW: drawW,
        drawH: drawH,
        alpha: Math.max(0, Math.min(1, Number(layer.alpha == null ? 1 : layer.alpha))),
        blend: String(layer.blend || '').toUpperCase(),
        visualSize: visualSize,
        offsetX: offsetX,
        offsetY: offsetY,
        regX: layerBox.regX,
        regY: layerBox.regY,
        propX: layerBox.propX,
        propY: layerBox.propY,
        offsetZ: layer.offsetZ || 0,
        flipX: !!layer.flipX,
      });
    }
    if (!prepared.length || !Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
    var width = Math.max(1, Math.ceil(maxX - minX));
    var height = Math.max(1, Math.ceil(maxY - minY));
    if (width > 4096 || height > 4096 || width * height > 4194304) {
      pushHabboDebug('habbo-composite:oversize', { prefab: prefab.id, rotation: rotation, width: width, height: height, area: width * height });
      return null;
    }
    var localCanvas = document.createElement('canvas');
    localCanvas.width = width;
    localCanvas.height = height;
    var localCtx = localCanvas.getContext('2d');
    localCtx.imageSmoothingEnabled = false;
    var layerSnapshots = [];
    for (var pi = 0; pi < prepared.length; pi++) {
      var item = prepared[pi];
      var prevAlpha = localCtx.globalAlpha;
      var prevBlend = localCtx.globalCompositeOperation;
      localCtx.globalAlpha = item.alpha;
      localCtx.globalCompositeOperation = getHabboCanvasBlendMode(item.blend);
      if (item.flipX) {
        localCtx.save();
        localCtx.translate(item.drawXMax - minX, item.drawY - minY);
        localCtx.scale(-1, 1);
        localCtx.drawImage(item.img, 0, 0, item.drawW, item.drawH);
        localCtx.restore();
      } else {
        localCtx.drawImage(item.img, item.drawX - minX, item.drawY - minY, item.drawW, item.drawH);
      }
      localCtx.globalCompositeOperation = prevBlend;
      localCtx.globalAlpha = prevAlpha;
      layerSnapshots.push({
        name: item.layer.name || ('L' + pi),
        kind: item.layer.kind || 'body',
        layerIndex: item.layer.layerIndex || 0,
        offsetX: item.offsetX,
        offsetY: item.offsetY,
        offsetZ: item.offsetZ,
        drawX: item.drawX,
        drawY: item.drawY,
        drawW: item.drawW,
        drawH: item.drawH,
        drawXMax: item.drawXMax,
        flipX: item.flipX,
        alpha: item.alpha,
        blend: item.blend || 'NORMAL',
        zOrderHint: item.layer.zOrderHint || 0,
        visualSize: item.visualSize,
        source: item.layer.source || ''
      });
    }
    pushHabboDebug('habbo-composite:built', { prefab: prefab.id, rotation: rotation, bbox: { x: minX, y: minY, w: width, h: height }, layers: layerSnapshots.map(function (l) { return { name: l.name, kind: l.kind, drawX: l.drawX, drawY: l.drawY, drawW: l.drawW, drawH: l.drawH, flipX: l.flipX, alpha: l.alpha, blend: l.blend, zOrderHint: l.zOrderHint }; }) });
    detailLog('callsite src/presentation/render/render.js::buildHabboComposite prefab=' + String(prefab.id || 'unknown') + ' rotation=' + String(rotation || 0) + ' bbox=(' + [minX, minY, width, height].join(',') + ') layers=' + String(layerSnapshots.length));
    return { canvas: localCanvas, offsetPx: { x: minX, y: minY }, width: width, height: height, layers: layerSnapshots };
  }

  function getHabboComposite(prefab, rotation) {
    var key = habboCompositeCacheKey(prefab, rotation);
    var cached = habboCompositeCache.get(key);
    if (cached) return cached;
    var built = buildHabboComposite(prefab, rotation);
    if (built) habboCompositeCache.set(key, built);
    return built;
  }

  function rotKeyForSprite(rotation) {
    return String((((parseInt(rotation || 0, 10) % 4) + 4) % 4));
  }

  var api = {
    getHabboLayerConfigList: getHabboLayerConfigList,
    getCachedImageFromDataUrl: getCachedImageFromDataUrl,
    getHabboLayerDrawable: getHabboLayerDrawable,
    getHabboCanvasBlendMode: getHabboCanvasBlendMode,
    habboCompositeCacheKey: habboCompositeCacheKey,
    getHabboPlacementCoreApiForRender: getHabboPlacementCoreApiForRender,
    requireHabboPlacementCoreForRender: requireHabboPlacementCoreForRender,
    getHabboTileMetricsForRender: getHabboTileMetricsForRender,
    getHabboPlacementShift: getHabboPlacementShift,
    pixelShiftToCellShift: pixelShiftToCellShift,
    cellShiftToPixelShift: cellShiftToPixelShift,
    getHabboPlacementDecomposition: getHabboPlacementDecomposition,
    getHabboPlacementCellShift: getHabboPlacementCellShift,
    getHabboRoomOrigin: getHabboRoomOrigin,
    getHabboProxyVisualShift: getHabboProxyVisualShift,
    withScreenTranslate: withScreenTranslate,
    getHabboInstanceVisualShift: getHabboInstanceVisualShift,
    getHabboLayerLocalBox: getHabboLayerLocalBox,
    buildHabboComposite: buildHabboComposite,
    getHabboComposite: getHabboComposite,
    rotKeyForSprite: rotKeyForSprite,
  };
  global.__APP_PRESENTATION_HABBO_COMPOSITE_RENDERER__ = api;
  global.__HABBO_COMPOSITE_RENDERER__ = api;
  global.IsometricHabboCompositeRenderer = api;
})(typeof window !== 'undefined' ? window : globalThis);
