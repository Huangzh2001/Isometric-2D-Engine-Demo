// P12a-4: Habbo composite / placement visual renderer owner.
(function (global) {
  'use strict';

  var prefabSpriteImageCache = new Map();
  var habboCompositeCache = new Map();
  var habboSpriteDrawDebugOnce = new Set();
  var habboImageReadyRevision = 0;

  function getHabboCurrentViewRotation() {
    try {
      if (typeof getSafeMainEditorViewRotation === 'function') {
        var safe = getSafeMainEditorViewRotation(null);
        if (safe && safe.viewRotation != null) return Number(safe.viewRotation) || 0;
      }
    } catch (_) {}
    try {
      var runtime = global.App && global.App.state && global.App.state.runtimeState;
      if (runtime && runtime.editor && runtime.editor.visualRotation != null) return Number(runtime.editor.visualRotation) || 0;
      if (runtime && runtime.editor && runtime.editor.rotation != null) return Number(runtime.editor.rotation) || 0;
    } catch (_) {}
    try { if (global.editor && global.editor.rotation != null) return Number(global.editor.rotation) || 0; } catch (_) {}
    return 0;
  }

  function resolveHabboVisualFacing(worldRotation) {
    var facingApi = getItemFacingCoreApi();
    var viewRotation = getHabboCurrentViewRotation();
    var visualFacing = facingApi && typeof facingApi.resolveViewRelativeFacing === 'function'
      ? facingApi.resolveViewRelativeFacing(worldRotation, viewRotation)
      : ((((Math.round(Number(worldRotation) || 0) - Math.round(Number(viewRotation) || 0)) % 4) + 4) % 4);
    var snapshot = { version: 'habbo-view-relative-facing-v2', worldRotation: Number(worldRotation) || 0, viewRotation: viewRotation, visualFacing: visualFacing };
    try { global.__HABBO_VIEW_FACING_LAST__ = snapshot; } catch (_) {}
    return snapshot;
  }

  function getHabboLayerConfigList(prefab, rotation) {
    if (!prefab || !prefab.habboLayerDirections) return null;
    var facingApi = getItemFacingCoreApi();
    var visual = typeof resolveHabboVisualFacing === 'function'
      ? resolveHabboVisualFacing(rotation)
      : { worldRotation: Number(rotation) || 0, viewRotation: 0, visualFacing: Number(rotation) || 0 };
    var resolved = facingApi && typeof facingApi.resolveSpriteFacing === 'function'
      ? facingApi.resolveSpriteFacing(prefab, visual.visualFacing)
      : { directionKey: rotKeyForSprite(visual.visualFacing), mirrorX: false, strategy: 'single', availableKeys: [rotKeyForSprite(visual.visualFacing)] };
    var rawList = prefab.habboLayerDirections[resolved.directionKey] || prefab.habboLayerDirections['0'] || null;
    var normalizedRotation = Number(rotKeyForSprite(rotation));
    var normalizedVisualFacing = Number(rotKeyForSprite(visual.visualFacing));
    var diagKey = String(prefab.id || 'unknown') + '|world=' + normalizedRotation + '|view=' + Number(visual.viewRotation || 0).toFixed(3) + '|visual=' + normalizedVisualFacing + '|' + String(resolved.directionKey) + '|' + String(!!resolved.mirrorX);
    if (!habboSpriteDrawDebugOnce.has(diagKey)) {
      habboSpriteDrawDebugOnce.add(diagKey);
      if (typeof pushHabboDebug === 'function') {
        var footprint = facingApi && typeof facingApi.getRotatedFootprint === 'function' ? facingApi.getRotatedFootprint(prefab, normalizedRotation) : null;
        pushHabboDebug('habbo-facing:resolved', {
          prefab: prefab.id || '',
          rotation: normalizedRotation,
          worldRotation: normalizedRotation,
          viewRotation: visual.viewRotation,
          visualFacing: normalizedVisualFacing,
          strategy: resolved.strategy || '',
          directionKey: String(resolved.directionKey),
          sourceDirection: resolved.sourceDirection == null ? null : Number(resolved.sourceDirection),
          sourceKind: resolved.sourceKind || '',
          mirrorX: !!resolved.mirrorX,
          availableKeys: resolved.availableKeys || [],
          footprint: footprint,
          layerCount: rawList ? rawList.length : 0,
          sourceVisualDirections: prefab.habboMeta && prefab.habboMeta.sourceVisualDirections || [],
          directionMap: prefab.habboMeta && prefab.habboMeta.directionMap || []
        });
      }
    }
    if (!rawList) return null;
    return rawList.map(function (layer) {
      return Object.assign({}, layer, {
        flipX: !!layer.flipX !== !!resolved.mirrorX,
        __resolvedDirectionKey: resolved.directionKey,
        __resolvedSourceDirection: resolved.sourceDirection,
        __resolvedMirrorX: !!resolved.mirrorX,
        __spriteStrategy: resolved.strategy,
        __worldRotation: normalizedRotation,
        __viewRotation: visual.viewRotation,
        __visualFacing: normalizedVisualFacing
      });
    });
  }

  function requestHabboVisualRefresh(reason) {
    habboImageReadyRevision += 1;
    habboCompositeCache.clear();
    try { global.__HABBO_IMAGE_READY_REVISION__ = habboImageReadyRevision; } catch (_) {}
    try {
      if (typeof global.requestRender === 'function') global.requestRender(reason || 'habbo-image-ready');
      else if (typeof global.render === 'function') global.requestAnimationFrame(function () { try { global.render(); } catch (_) {} });
    } catch (_) {}
  }

  function getCachedImageFromDataUrl(key, dataUrl) {
    if (!dataUrl) return null;
    var cached = prefabSpriteImageCache.get(key);
    if (cached) return cached;
    var img = new Image();
    try {
      img.addEventListener('load', function () { requestHabboVisualRefresh('habbo-layer-image-load'); }, { once: true });
      img.addEventListener('error', function () { requestHabboVisualRefresh('habbo-layer-image-error'); }, { once: true });
    } catch (_) {
      img.onload = function () { requestHabboVisualRefresh('habbo-layer-image-load'); };
    }
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
    var visual = resolveHabboVisualFacing(rotation);
    var sig = '';
    if (prefab && prefab.habboLayerDirections) {
      var keys = Object.keys(prefab.habboLayerDirections).sort();
      sig = keys.map(function (k) {
        var arr = prefab.habboLayerDirections[k] || [];
        var first = arr[0] && arr[0].name ? arr[0].name : '';
        return k + ':' + arr.length + ':' + first;
      }).join('|');
    }
    return String(prefab && prefab.id || 'unknown') + '|habbo-composite|world=' + rotKeyForSprite(rotation) + '|visual=' + rotKeyForSprite(visual.visualFacing) + '|tileW=' + String(settings && settings.tileW || 64) + '|tileH=' + String(settings && settings.tileH || 32) + '|sig=' + sig;
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
    var result = requireHabboPlacementCoreForRender().getHabboRoomOrigin(prefab, origin, anchor, rotation, getHabboTileMetricsForRender(), iso, { floorBaselineOffset: 0 });
    try {
      global.__HABBO_SPRITE_VOXEL_ALIGNMENT_LAST__ = {
        version: 'habbo-sprite-voxel-anchor-v4',
        prefabId: prefab && prefab.id || null,
        instanceOrigin: { x: Number(origin && origin.x || 0), y: Number(origin && origin.y || 0), z: Number(origin && origin.z || 0) },
        rotation: Number(rotation || 0),
        roomAnchorCells: result && result.roomAnchorCells || null,
        worldAnchor: result && result.worldAnchor || null,
        screenAnchor: result ? { x: result.x, y: result.y } : null,
        floorBaselineOffset: 0
      };
    } catch (_) {}
    return result;
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
    var visual = resolveHabboVisualFacing(rotation);
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
      var cacheKey = prefab.id + '|layer|visual=' + rotKeyForSprite(visual.visualFacing) + '|' + String(layer.name || li);
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
    return { canvas: localCanvas, offsetPx: { x: minX, y: minY }, width: width, height: height, layers: layerSnapshots, worldRotation: Number(rotKeyForSprite(rotation)), viewRotation: visual.viewRotation, visualFacing: Number(rotKeyForSprite(visual.visualFacing)) };
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
    requestHabboVisualRefresh: requestHabboVisualRefresh,
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
    getHabboCurrentViewRotation: getHabboCurrentViewRotation,
    resolveHabboVisualFacing: resolveHabboVisualFacing,
  };
  global.__APP_PRESENTATION_HABBO_COMPOSITE_RENDERER__ = api;
  global.__HABBO_COMPOSITE_RENDERER__ = api;
  global.IsometricHabboCompositeRenderer = api;
})(typeof window !== 'undefined' ? window : globalThis);
