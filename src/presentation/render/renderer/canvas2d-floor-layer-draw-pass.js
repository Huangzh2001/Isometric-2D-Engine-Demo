// P8d: Canvas 2D floor layer draw pass.
// Layer: presentation/render/renderer.
//
// Owns the chunked floor-layer Canvas draw/cache path. render.js injects
// runtime state and adjacent helpers; this file must not own scene/prefab
// protocols, application renderable assembly, or domain sorting rules.
(function registerCanvas2dFloorLayerDrawPass(global) {
  var OWNER = 'src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js';
  function asNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function noop() {}

  function noteCanvas2dSharedOptimizationUse(id, payload) {
    try {
      var consumer = global.__SHARED_RENDER_OPTIMIZATION_CANVAS2D_SHARED_CONSUMER__ || null;
      if (consumer && typeof consumer.noteConsumerUse === 'function') {
        return consumer.noteConsumerUse(id, Object.assign({
          caller: OWNER,
          activeBackend: 'canvas2d',
          canvas2dConsumerNormalized: true
        }, payload || {}));
      }
    } catch (_) {}
    return null;
  }

  function getSettings(deps) {
    return deps && deps.settings ? deps.settings : {};
  }

  function getViewW(deps) { return Math.max(0, asNumber(deps && deps.VIEW_W, 0)); }
  function getViewH(deps) { return Math.max(0, asNumber(deps && deps.VIEW_H, 0)); }
  function getDpr(deps) { return Math.max(0.01, asNumber(deps && deps.dpr, 1)); }


  // Shared floor cache blit transform contract.
  // This is deliberately not Canvas2D-specific: Canvas2D consumes it as a
  // drawImage transform stack, while PixiJS consumes the same result as a
  // sprite position/size transform. The formula preserves the legacy cached
  // floor behavior during pan/zoom reuse:
  //   p' = anchor + delta + scale * (p - anchor)
  //      = delta + scale * p + (1 - scale) * anchor
  function buildFloorLayerCacheBlitTransformFromBreakdown(deps, breakdown) {
    var settings = getSettings(deps);
    var cssWidth = getViewW(deps);
    var cssHeight = getViewH(deps);
    var reuseDX = asNumber(breakdown && breakdown.floorLayerReuseCameraDX, 0);
    var reuseDY = asNumber(breakdown && breakdown.floorLayerReuseCameraDY, 0);
    var reuseScale = asNumber(breakdown && breakdown.floorLayerReuseScale, 1);
    if (!Number.isFinite(reuseScale) || Math.abs(reuseScale) < 0.0001) reuseScale = 1;
    var builtCameraX = asNumber(breakdown && breakdown.floorLayerBuiltCameraX, 0);
    var builtCameraY = asNumber(breakdown && breakdown.floorLayerBuiltCameraY, 0);
    var anchorX = asNumber(settings && settings.originX, 0) + builtCameraX;
    var anchorY = asNumber(settings && settings.originY, 0) + builtCameraY;
    var shouldReuse = !!(breakdown && (breakdown.skippedByInteractionBudget || breakdown.cameraTransformOnly));
    var scaled = shouldReuse && Math.abs(reuseScale - 1) > 0.001;
    var spriteX = scaled ? reuseDX + (1 - reuseScale) * anchorX : (shouldReuse ? reuseDX : 0);
    var spriteY = scaled ? reuseDY + (1 - reuseScale) * anchorY : (shouldReuse ? reuseDY : 0);
    return {
      id: 'floor-layer-cache-blit-transform',
      contract: 'shared-floor-cache-reuse-transform/v1',
      owner: OWNER,
      cssWidth: cssWidth,
      cssHeight: cssHeight,
      dx: reuseDX,
      dy: reuseDY,
      scale: reuseScale,
      builtCameraX: builtCameraX,
      builtCameraY: builtCameraY,
      builtZoom: asNumber(breakdown && breakdown.floorLayerBuiltZoom, 1),
      originX: asNumber(settings && settings.originX, 0),
      originY: asNumber(settings && settings.originY, 0),
      anchorX: anchorX,
      anchorY: anchorY,
      shouldReuse: shouldReuse,
      scaled: scaled,
      canvas2d: {
        drawX: shouldReuse && !scaled ? reuseDX : 0,
        drawY: shouldReuse && !scaled ? reuseDY : 0,
        drawWidth: cssWidth,
        drawHeight: cssHeight,
        translateX: scaled ? anchorX + reuseDX : 0,
        translateY: scaled ? anchorY + reuseDY : 0,
        scaleX: scaled ? reuseScale : 1,
        scaleY: scaled ? reuseScale : 1,
        postTranslateX: scaled ? -anchorX : 0,
        postTranslateY: scaled ? -anchorY : 0
      },
      pixi: {
        spriteX: spriteX,
        spriteY: spriteY,
        spriteWidth: Math.max(1, cssWidth * (scaled ? reuseScale : 1)),
        spriteHeight: Math.max(1, cssHeight * (scaled ? reuseScale : 1)),
        eventMode: 'none'
      }
    };
  }

  function getFloorLayerCanvas(deps) {
    return deps && typeof deps.getFloorLayerCanvas === 'function' ? deps.getFloorLayerCanvas() : null;
  }

  function setFloorLayerCanvas(deps, value) {
    if (deps && typeof deps.setFloorLayerCanvas === 'function') deps.setFloorLayerCanvas(value || null);
  }

  function getFloorLayerCtx(deps) {
    return deps && typeof deps.getFloorLayerCtx === 'function' ? deps.getFloorLayerCtx() : null;
  }

  function setFloorLayerCtx(deps, value) {
    if (deps && typeof deps.setFloorLayerCtx === 'function') deps.setFloorLayerCtx(value || null);
  }

  function getFloorLayerCache(deps) {
    var cache = deps && typeof deps.getFloorLayerCache === 'function' ? deps.getFloorLayerCache() : null;
    if (!cache || typeof cache !== 'object') {
      cache = { dirty: true };
      setFloorLayerCache(deps, cache);
    }
    return cache;
  }

  function setFloorLayerCache(deps, value) {
    if (deps && typeof deps.setFloorLayerCache === 'function') deps.setFloorLayerCache(value || { dirty: true });
  }

  function getActiveBaseWorldActualPathProfile(deps) {
    var fn = deps && typeof deps.getActiveBaseWorldActualPathProfile === 'function'
      ? deps.getActiveBaseWorldActualPathProfile
      : null;
    return fn ? fn() : null;
  }

  function writeBaseWorldActualPathProfile(partial, deps) {
    var fn = deps && typeof deps.writeBaseWorldActualPathProfile === 'function'
      ? deps.writeBaseWorldActualPathProfile
      : null;
    if (fn) return fn(partial || {});
    var profile = getActiveBaseWorldActualPathProfile(deps);
    if (!profile || !partial || typeof partial !== 'object') return profile;
    Object.keys(partial).forEach(function (key) { profile[key] = partial[key]; });
    return profile;
  }

  function completeFloorLayerBreakdown(partial, deps) {
    var data = Object.assign({
      rebuilt: false,
      skippedByInteractionBudget: false,
      floorLayerRebuildWallMs: 0,
      floorLayerPreSetupWallMs: 0,
      floorLayerLoopWallMs: 0,
      floorLayerProjectionWallMs: 0,
      floorLayerColorMaterialWallMs: 0,
      floorLayerCanvasDrawWallMs: 0,
      floorLayerPostFinalizeWallMs: 0,
      floorLayerResidualWallMs: 0,
      floorLayerReuseCameraDX: 0,
      floorLayerReuseCameraDY: 0,
      floorLayerReuseScale: 1,
      floorLayerBuiltCameraX: 0,
      floorLayerBuiltCameraY: 0,
      floorLayerBuiltZoom: 1,
      floorLayerBlitWallMs: 0,
      floorLayerActualBranch: 'unknown',
      floorVisibleChunkCount: 0,
      floorBuiltChunkCountThisFrame: 0,
      floorMissingChunkCountBefore: 0,
      floorMissingChunkCountAfter: 0,
      floorBuiltTileCountThisFrame: 0,
      floorChunkSize: 0,
      floorVersionTag: 'floor-static-chunk-v1'
    }, partial || {});
    writeBaseWorldActualPathProfile({
      baseWorldActualBranch: data.floorLayerActualBranch,
      floorLayerReusedDuringInteraction: !!data.skippedByInteractionBudget,
      floorLayerRebuildWallMs: Number(data.floorLayerRebuildWallMs || 0),
      floorLayerBlitWallMs: Number(data.floorLayerBlitWallMs || 0),
      floorLoopWallMs: Number(data.floorLayerLoopWallMs || 0),
      floorProjectionWallMs: Number(data.floorLayerProjectionWallMs || 0),
      floorColorMaterialWallMs: Number(data.floorLayerColorMaterialWallMs || 0),
      floorCanvasDrawWallMs: Number(data.floorLayerCanvasDrawWallMs || 0),
      floorPreSetupWallMs: Number(data.floorLayerPreSetupWallMs || 0),
      floorPostFinalizeWallMs: Number(data.floorLayerPostFinalizeWallMs || 0),
      floorResidualWallMs: Number(data.floorLayerResidualWallMs || 0),
      floorVisibleChunkCount: Number(data.floorVisibleChunkCount || 0),
      floorBuiltChunkCountThisFrame: Number(data.floorBuiltChunkCountThisFrame || 0),
      floorMissingChunkCountBefore: Number(data.floorMissingChunkCountBefore || 0),
      floorMissingChunkCountAfter: Number(data.floorMissingChunkCountAfter || 0),
      floorBuiltTileCountThisFrame: Number(data.floorBuiltTileCountThisFrame || 0),
      floorChunkSize: Number(data.floorChunkSize || 0),
      floorVersionTag: data.floorVersionTag || 'floor-static-chunk-v1'
    }, deps);
    return data;
  }

  function ensureFloorLayerCanvas(deps) {
    var canvas = getFloorLayerCanvas(deps);
    var floorCtx = getFloorLayerCtx(deps);
    if (!canvas) {
      var createCanvas = deps && typeof deps.createCanvas === 'function' ? deps.createCanvas : null;
      if (!createCanvas) throw new Error('canvas2d floor layer draw pass requires createCanvas dependency');
      canvas = createCanvas();
      floorCtx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
      setFloorLayerCanvas(deps, canvas);
      setFloorLayerCtx(deps, floorCtx);
    }
    var backingW = Math.round(getViewW(deps) * getDpr(deps));
    var backingH = Math.round(getViewH(deps) * getDpr(deps));
    if (canvas.width !== backingW || canvas.height !== backingH) {
      canvas.width = backingW;
      canvas.height = backingH;
      if (floorCtx && typeof floorCtx.setTransform === 'function') floorCtx.setTransform(getDpr(deps), 0, 0, getDpr(deps), 0, 0);
      if (floorCtx) floorCtx.imageSmoothingEnabled = true;
      getFloorLayerCache(deps).dirty = true;
    }
    return floorCtx;
  }

  function getActiveCameraInteractionTypeForFloorLayer(deps) {
    var fn = deps && typeof deps.getActiveCameraInteractionTypeForFloorLayer === 'function'
      ? deps.getActiveCameraInteractionTypeForFloorLayer
      : null;
    return fn ? fn() : null;
  }

  function getCameraSettleReuseStateForFloorLayer(deps) {
    var fn = deps && typeof deps.getCameraSettleReuseStateForFloorLayer === 'function'
      ? deps.getCameraSettleReuseStateForFloorLayer
      : null;
    return fn ? fn() : null;
  }

  function shouldDeferFloorLayerSettleCommit(currentViewRotation, deps) {
    var canvas = getFloorLayerCanvas(deps);
    var cache = getFloorLayerCache(deps);
    if (!canvas || !cache || !cache.signature) return false;
    if (Number(cache.viewRotation || currentViewRotation) !== Number(currentViewRotation || 0)) return false;
    var settleState = getCameraSettleReuseStateForFloorLayer(deps);
    if (!settleState || String(settleState.lastEndedType || '') !== 'zoom') return false;
    var nowMs = deps && typeof deps.perfNow === 'function' ? deps.perfNow() : Date.now();
    if (Number(settleState.deferCommitUntilMs || 0) <= nowMs) return false;
    var activeType = getActiveCameraInteractionTypeForFloorLayer(deps);
    return !activeType || activeType === 'drag' || activeType === 'pan' || activeType === 'pinch';
  }

  function shouldForceFloorLayerInteractionReuse(currentViewRotation, deps) {
    var activeType = getActiveCameraInteractionTypeForFloorLayer(deps);
    if (activeType !== 'zoom' && !shouldDeferFloorLayerSettleCommit(currentViewRotation, deps)) return false;
    var canvas = getFloorLayerCanvas(deps);
    var cache = getFloorLayerCache(deps);
    if (!canvas || !cache || !cache.signature) return false;
    return Number(cache.viewRotation || currentViewRotation) === Number(currentViewRotation || 0);
  }

  function getFloorChunkSizeForLayer(deps) {
    try {
      var staticWorldCacheApi = deps && typeof deps.getSharedStaticWorldChunkCacheApiForRender === 'function'
        ? deps.getSharedStaticWorldChunkCacheApiForRender()
        : null;
      if (staticWorldCacheApi && typeof staticWorldCacheApi.getChunkSize === 'function') {
        var chunkSize = Math.max(1, Math.round(Number(staticWorldCacheApi.getChunkSize() || 16) || 16));
        return chunkSize;
      }
    } catch (_) {}
    return 16;
  }

  function ensureFloorChunkCacheState(chunkSize, deps) {
    var targetChunkSize = Math.max(1, Math.round(Number(chunkSize || 16) || 16));
    var cache = getFloorLayerCache(deps);
    if (!(cache.chunks instanceof Map)) cache.chunks = new Map();
    if (!Array.isArray(cache.visibleChunkKeys)) cache.visibleChunkKeys = [];
    if (Number(cache.chunkSize || 0) !== targetChunkSize) {
      cache.chunkSize = targetChunkSize;
      cache.chunks = new Map();
      cache.visibleChunkKeys = [];
      cache.viewSignature = '';
      cache.dirty = true;
    }
    setFloorLayerCache(deps, cache);
    return cache;
  }

  function getFloorChunkKeyForLayer(chunkX, chunkY) {
    return String(chunkX) + ',' + String(chunkY);
  }

  function parseFloorChunkKeyForLayer(chunkKey) {
    var raw = String(chunkKey || '0,0').split(',');
    return {
      chunkX: Math.round(Number(raw[0] || 0) || 0),
      chunkY: Math.round(Number(raw[1] || 0) || 0)
    };
  }

  function computeVisibleFloorChunkKeysForLayer(scope, chunkSize, deps) {
    var settings = getSettings(deps);
    var size = Math.max(1, Math.round(Number(chunkSize || 16) || 16));
    var maxChunkX = Math.max(0, Math.ceil(Number(settings.gridW || 0) / size) - 1);
    var maxChunkY = Math.max(0, Math.ceil(Number(settings.gridH || 0) / size) - 1);
    var bounds = scope && scope.cameraCullingEnabled !== false && scope.cullingWorldBounds
      ? scope.cullingWorldBounds
      : { minX: 0, minY: 0, maxX: Number(settings.gridW || 0), maxY: Number(settings.gridH || 0) };
    var paddingChunks = 1;
    var minChunkX = Math.max(0, Math.floor((Number(bounds.minX || 0) - paddingChunks * size) / size));
    var minChunkY = Math.max(0, Math.floor((Number(bounds.minY || 0) - paddingChunks * size) / size));
    var maxVisibleChunkX = Math.min(maxChunkX, Math.floor((Number(bounds.maxX || 0) + paddingChunks * size - 1) / size));
    var maxVisibleChunkY = Math.min(maxChunkY, Math.floor((Number(bounds.maxY || 0) + paddingChunks * size - 1) / size));
    var centerX = (Number(bounds.minX || 0) + Number(bounds.maxX || 0)) * 0.5;
    var centerY = (Number(bounds.minY || 0) + Number(bounds.maxY || 0)) * 0.5;
    var keys = [];
    for (var chunkX = minChunkX; chunkX <= maxVisibleChunkX; chunkX++) {
      for (var chunkY = minChunkY; chunkY <= maxVisibleChunkY; chunkY++) {
        keys.push({
          key: getFloorChunkKeyForLayer(chunkX, chunkY),
          sortDistance: Math.abs((chunkX + 0.5) * size - centerX) + Math.abs((chunkY + 0.5) * size - centerY)
        });
      }
    }
    keys.sort(function (left, right) { return Number(left.sortDistance || 0) - Number(right.sortDistance || 0); });
    return keys.map(function (entry) { return entry.key; });
  }

  function normalizeFloorChunkKeyListForLayer(keys) {
    return (Array.isArray(keys) ? keys.slice() : []).map(function (key) { return String(key); }).sort();
  }

  function areFloorChunkKeyListsEqual(left, right) {
    var a = normalizeFloorChunkKeyListForLayer(left);
    var b = normalizeFloorChunkKeyListForLayer(right);
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function buildFloorLayerContentViewSignatureForLayer(visibleChunkKeys, currentViewRotation) {
    return JSON.stringify({
      viewRotation: Number(currentViewRotation || 0),
      visibleChunkKeys: normalizeFloorChunkKeyListForLayer(visibleChunkKeys)
    });
  }

  function buildFloorLayerViewSignatureForLayer(currentCameraX, currentCameraY, visibleChunkKeys, currentViewRotation) {
    return JSON.stringify({
      cameraX: Number((currentCameraX || 0).toFixed(3)),
      cameraY: Number((currentCameraY || 0).toFixed(3)),
      viewRotation: Number(currentViewRotation || 0),
      visibleChunkKeys: Array.isArray(visibleChunkKeys) ? visibleChunkKeys.slice() : []
    });
  }

  function screenPointsFromWorldFaceNoCamera(deps, points, viewRotation) {
    var fn = deps && typeof deps.screenPointsFromWorldFaceNoCamera === 'function'
      ? deps.screenPointsFromWorldFaceNoCamera
      : null;
    return fn ? fn(points || [], viewRotation) : [];
  }

  function buildFloorChunkEntryForLayer(chunkKey, currentViewRotation, contentSignature, deps) {
    var settings = getSettings(deps);
    var chunkSize = getFloorChunkSizeForLayer(deps);
    var parsed = parseFloorChunkKeyForLayer(chunkKey);
    var minX = Math.max(0, parsed.chunkX * chunkSize);
    var minY = Math.max(0, parsed.chunkY * chunkSize);
    var maxX = Math.min(Number(settings.gridW || 0), minX + chunkSize);
    var maxY = Math.min(Number(settings.gridH || 0), minY + chunkSize);
    var tiles = [];
    var minScreenX = Infinity;
    var minScreenY = Infinity;
    var maxScreenX = -Infinity;
    var maxScreenY = -Infinity;
    for (var y = minY; y < maxY; y++) {
      for (var x = minX; x < maxX; x++) {
        var points = screenPointsFromWorldFaceNoCamera(deps, [
          { x: x, y: y, z: 0 },
          { x: x + 1, y: y, z: 0 },
          { x: x + 1, y: y + 1, z: 0 },
          { x: x, y: y + 1, z: 0 }
        ], currentViewRotation);
        for (var p = 0; p < points.length; p++) {
          var pt = points[p];
          if (!pt) continue;
          if (pt.x < minScreenX) minScreenX = pt.x;
          if (pt.y < minScreenY) minScreenY = pt.y;
          if (pt.x > maxScreenX) maxScreenX = pt.x;
          if (pt.y > maxScreenY) maxScreenY = pt.y;
        }
        var base = (x + y) % 2 === 0 ? '#33415a' : '#29344b';
        var lit = deps && typeof deps.rgbToCss === 'function' && typeof deps.litColor === 'function' && typeof deps.hexToRgb === 'function'
          ? deps.rgbToCss(deps.litColor(deps.hexToRgb(base), { x: x + 0.5, y: y + 0.5, z: 0 }, { x: 0, y: 0, z: 1 }))
          : base;
        tiles.push({ points: points, fill: lit });
      }
    }
    var now = deps && typeof deps.perfNow === 'function' ? deps.perfNow : function () { return Date.now(); };
    if (!tiles.length || !isFinite(minScreenX) || !isFinite(minScreenY) || !isFinite(maxScreenX) || !isFinite(maxScreenY)) {
      return {
        key: chunkKey,
        chunkX: parsed.chunkX,
        chunkY: parsed.chunkY,
        minX: minX,
        minY: minY,
        maxX: maxX,
        maxY: maxY,
        contentSignature: String(contentSignature || ''),
        canvas: null,
        screenBoundsNoCamera: { x: 0, y: 0, w: 0, h: 0 },
        tileCount: 0,
        lastBuiltAt: now()
      };
    }
    var padding = 4;
    var width = Math.max(1, Math.ceil((maxScreenX - minScreenX) + padding * 2));
    var height = Math.max(1, Math.ceil((maxScreenY - minScreenY) + padding * 2));
    var createCanvas = deps && typeof deps.createCanvas === 'function' ? deps.createCanvas : null;
    if (!createCanvas) throw new Error('canvas2d floor layer draw pass requires createCanvas dependency');
    var canvasEl = createCanvas();
    canvasEl.width = Math.max(1, Math.round(width * getDpr(deps)));
    canvasEl.height = Math.max(1, Math.round(height * getDpr(deps)));
    var localCtx = canvasEl.getContext('2d');
    if (localCtx && typeof localCtx.setTransform === 'function') localCtx.setTransform(getDpr(deps), 0, 0, getDpr(deps), 0, 0);
    if (localCtx) localCtx.imageSmoothingEnabled = true;
    if (localCtx && typeof localCtx.translate === 'function') localCtx.translate(-minScreenX + padding, -minScreenY + padding);
    for (var i = 0; i < tiles.length; i++) {
      var tile = tiles[i];
      if (deps && typeof deps.drawPolyOn === 'function') deps.drawPolyOn(localCtx, tile.points, tile.fill, 'rgba(255,255,255,.05)');
    }
    return {
      key: chunkKey,
      chunkX: parsed.chunkX,
      chunkY: parsed.chunkY,
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY,
      contentSignature: String(contentSignature || ''),
      canvas: canvasEl,
      screenBoundsNoCamera: { x: minScreenX - padding, y: minScreenY - padding, w: width, h: height },
      tileCount: tiles.length,
      lastBuiltAt: now()
    };
  }

  function drawFloorOutlineToLayer(targetCtx, currentCameraX, currentCameraY, currentViewRotation, deps) {
    var settings = getSettings(deps);
    var outline = screenPointsFromWorldFaceNoCamera(deps, [
      { x: 0, y: 0, z: 0 },
      { x: Number(settings.gridW || 0), y: 0, z: 0 },
      { x: Number(settings.gridW || 0), y: Number(settings.gridH || 0), z: 0 },
      { x: 0, y: Number(settings.gridH || 0), z: 0 }
    ], currentViewRotation);
    if (!outline.length || !targetCtx) return;
    targetCtx.strokeStyle = 'rgba(255,255,255,.14)';
    targetCtx.lineWidth = 2;
    targetCtx.beginPath();
    targetCtx.moveTo(outline[0].x + currentCameraX, outline[0].y + currentCameraY);
    for (var i = 1; i < outline.length; i++) targetCtx.lineTo(outline[i].x + currentCameraX, outline[i].y + currentCameraY);
    targetCtx.closePath();
    targetCtx.stroke();
  }

  function getCurrentViewRotation(deps) {
    var safe = deps && typeof deps.getSafeMainEditorViewRotation === 'function'
      ? deps.getSafeMainEditorViewRotation(null)
      : { viewRotation: 0 };
    var raw = safe && safe.viewRotation;
    return deps && typeof deps.normalizeMainEditorViewRotationValue === 'function'
      ? deps.normalizeMainEditorViewRotationValue(raw)
      : Number(raw || 0);
  }

  function rebuildFloorLayerIfNeeded(force, deps) {
    force = force === true;
    var perfNow = deps && typeof deps.perfNow === 'function' ? deps.perfNow : function () { return Date.now(); };
    var camera = deps && deps.camera ? deps.camera : {};
    var rebuildStartAt = perfNow();
    var currentViewRotation = getCurrentViewRotation(deps);
    var currentZoomForLayer = deps && typeof deps.getMainEditorZoomValueForRender === 'function' ? Number(deps.getMainEditorZoomValueForRender()) || 1 : 1;
    var currentCameraXForLayer = Number(camera && camera.x || 0);
    var currentCameraYForLayer = Number(camera && camera.y || 0);
    var activeType = getActiveCameraInteractionTypeForFloorLayer(deps);
    var cache = getFloorLayerCache(deps);
    var forceInteractionReuse = !force && shouldForceFloorLayerInteractionReuse(currentViewRotation, deps);
    if (forceInteractionReuse && getFloorLayerCanvas(deps) && cache.signature && Number(cache.viewRotation || currentViewRotation) === Number(currentViewRotation || 0)) {
      var builtZoomForReuse = Number(cache.buildZoom || currentZoomForLayer) || 1;
      return completeFloorLayerBreakdown({
        rebuilt: false,
        skippedByInteractionBudget: true,
        floorLayerReuseCameraDX: Number((currentCameraXForLayer - Number(cache.buildCameraX || 0)).toFixed(3)),
        floorLayerReuseCameraDY: Number((currentCameraYForLayer - Number(cache.buildCameraY || 0)).toFixed(3)),
        floorLayerReuseScale: Number((currentZoomForLayer / builtZoomForReuse).toFixed(4)),
        floorLayerBuiltCameraX: Number(cache.buildCameraX || 0),
        floorLayerBuiltCameraY: Number(cache.buildCameraY || 0),
        floorLayerBuiltZoom: builtZoomForReuse,
        floorLayerActualBranch: (activeType === 'zoom') ? 'floor-layer-cache-reuse-zoom-lock' : 'floor-layer-cache-reuse-zoom-settle-defer'
      }, deps);
    }

    var contentSignature = deps && typeof deps.floorLayerSignature === 'function' ? deps.floorLayerSignature() : '';
    var previousViewRotation = typeof cache.viewRotation === 'number' ? cache.viewRotation : currentViewRotation;
    var scope = deps && typeof deps.getMainCameraRenderScope === 'function' ? deps.getMainCameraRenderScope(currentViewRotation) : null;
    var chunkSize = getFloorChunkSizeForLayer(deps);
    cache = ensureFloorChunkCacheState(chunkSize, deps);
    var preSetupStartAt = perfNow();
    var targetCtx = ensureFloorLayerCanvas(deps);
    var previousViewSignatureForSharedSurface = String(cache.viewSignature || '');
    var previousContentViewSignatureForSharedSurface = String(cache.contentViewSignature || '');
    var previousSharedSurfaceRevision = Math.max(0, Math.round(Number(cache.sharedSurfaceRevision || 0) || 0));
    var visibleChunkKeys = computeVisibleFloorChunkKeysForLayer(scope, chunkSize, deps);
    var viewSignature = buildFloorLayerViewSignatureForLayer(currentCameraXForLayer, currentCameraYForLayer, visibleChunkKeys, currentViewRotation);
    var contentViewSignature = buildFloorLayerContentViewSignatureForLayer(visibleChunkKeys, currentViewRotation);
    var contentChanged = force || cache.dirty || cache.signature !== contentSignature || Number(cache.viewRotation || currentViewRotation) !== Number(currentViewRotation || 0);
    if (contentChanged) {
      cache.chunks = new Map();
      cache.visibleChunkKeys = [];
      cache.viewSignature = '';
    }
    var preSetupEndAt = perfNow();

    var isInteractive = deps && typeof deps.isInteractiveRenderPressure === 'function' ? deps.isInteractiveRenderPressure() : false;
    var interactiveChunkBudget = !force && (activeType === 'drag' || activeType === 'pan' || activeType === 'pinch' || isInteractive);
    var buildBudgetValue = interactiveChunkBudget ? 1 : Math.max(1, visibleChunkKeys.length);
    if (!cache.chunks || cache.chunks.size === 0) buildBudgetValue = Math.max(1, visibleChunkKeys.length);

    var floorProjectionWallMs = 0;
    var floorColorMaterialWallMs = 0;
    var floorCanvasDrawWallMs = 0;
    var floorLoopStartAt = perfNow();
    var visibleEntries = [];
    var builtChunkCountThisFrame = 0;
    var missingChunkCountBefore = 0;
    var missingChunkCountAfter = 0;
    var builtTileCountThisFrame = 0;
    for (var i = 0; i < visibleChunkKeys.length; i++) {
      var chunkKey = visibleChunkKeys[i];
      var entry = cache.chunks.get(chunkKey) || null;
      if (!entry || entry.contentSignature !== contentSignature) {
        missingChunkCountBefore += 1;
        if (builtChunkCountThisFrame < buildBudgetValue) {
          var buildStartAt = perfNow();
          entry = buildFloorChunkEntryForLayer(chunkKey, currentViewRotation, contentSignature, deps);
          floorProjectionWallMs += Math.max(0, perfNow() - buildStartAt);
          cache.chunks.set(chunkKey, entry);
          builtChunkCountThisFrame += 1;
          builtTileCountThisFrame += Number(entry && entry.tileCount || 0);
        } else {
          missingChunkCountAfter += 1;
          continue;
        }
      }
      if (entry) visibleEntries.push(entry);
    }
    var composeStartAt = perfNow();
    if (targetCtx && typeof targetCtx.clearRect === 'function') targetCtx.clearRect(0, 0, getViewW(deps), getViewH(deps));
    for (var entryIndex = 0; entryIndex < visibleEntries.length; entryIndex++) {
      var visibleEntry = visibleEntries[entryIndex];
      if (!visibleEntry || !visibleEntry.canvas || !targetCtx || typeof targetCtx.drawImage !== 'function') continue;
      var bounds = visibleEntry.screenBoundsNoCamera || { x: 0, y: 0, w: 0, h: 0 };
      targetCtx.drawImage(visibleEntry.canvas, bounds.x + currentCameraXForLayer, bounds.y + currentCameraYForLayer, bounds.w, bounds.h);
    }
    floorCanvasDrawWallMs += Math.max(0, perfNow() - composeStartAt);
    floorColorMaterialWallMs += Number(floorCanvasDrawWallMs || 0);
    drawFloorOutlineToLayer(targetCtx, currentCameraXForLayer, currentCameraYForLayer, currentViewRotation, deps);
    var floorLoopEndAt = perfNow();
    var floorLoopWallMs = Math.max(0, floorLoopEndAt - floorLoopStartAt);

    var postFinalizeStartAt = perfNow();
    // PXM-07.8E: shared floor texture invalidation must be content-driven,
    // not camera-pan-driven. viewSignature remains diagnostic and can include
    // cameraX/cameraY, while contentViewSignature excludes camera pan so PixiJS
    // can keep the same texture and move the sprite transform during drag/pan.
    var sharedSurfaceChangedForConsumers = contentChanged || builtChunkCountThisFrame > 0 || previousContentViewSignatureForSharedSurface !== String(contentViewSignature || '');
    cache.signature = contentSignature;
    cache.contentSignature = contentSignature;
    cache.cacheSignature = contentSignature;
    cache.viewSignature = viewSignature;
    cache.contentViewSignature = contentViewSignature;
    cache.viewRotation = currentViewRotation;
    cache.sharedSurfaceRevision = sharedSurfaceChangedForConsumers ? previousSharedSurfaceRevision + 1 : previousSharedSurfaceRevision;
    cache.lastBuiltAt = perfNow();
    cache.dirty = false;
    cache.buildCameraX = currentCameraXForLayer;
    cache.buildCameraY = currentCameraYForLayer;
    cache.buildZoom = currentZoomForLayer;
    cache.visibleChunkKeys = visibleChunkKeys.slice();
    setFloorLayerCache(deps, cache);
    if (deps && typeof deps.logItemRotationPrototype === 'function') deps.logItemRotationPrototype('main-floor-rotation-cache-check', {
      previousViewRotation: deps.normalizeMainEditorViewRotationValue ? deps.normalizeMainEditorViewRotationValue(previousViewRotation) : previousViewRotation,
      nextViewRotation: currentViewRotation,
      floorCacheInvalidated: !!contentChanged,
      floorCacheRebuilt: builtChunkCountThisFrame > 0,
      floorSignatureIncludesViewRotation: true,
      floorSignatureIncludesCamera: false,
      floorDrawUsedCurrentViewRotation: true,
      floorVisibleChunkCount: visibleChunkKeys.length,
      floorBuiltChunkCountThisFrame: builtChunkCountThisFrame,
      floorMissingChunkCountAfter: missingChunkCountAfter,
      floorChunkSize: chunkSize,
      floorVersionTag: 'floor-static-chunk-v1'
    });
    if (deps && typeof deps.noteLayerRebuild === 'function') deps.noteLayerRebuild('floor', 'chunked static-world-aligned visible=' + String(visibleChunkKeys.length) + ' built=' + String(builtChunkCountThisFrame) + ' missing=' + String(missingChunkCountAfter) + ' chunkSize=' + String(chunkSize));
    var postFinalizeEndAt = perfNow();

    var floorLayerRebuildWallMs = Math.max(0, perfNow() - rebuildStartAt);
    var floorLayerPreSetupWallMs = Math.max(0, preSetupEndAt - preSetupStartAt);
    var floorLayerPostFinalizeWallMs = Math.max(0, postFinalizeEndAt - postFinalizeStartAt);
    var floorLayerResidualWallMs = Math.max(0, floorLayerRebuildWallMs - floorLayerPreSetupWallMs - floorLoopWallMs - floorLayerPostFinalizeWallMs);
    var floorLayerActualBranch = builtChunkCountThisFrame > 0
      ? (missingChunkCountAfter > 0 ? 'floor-layer-static-chunk-composite-build-deferred' : 'floor-layer-static-chunk-composite-build')
      : (contentChanged ? 'floor-layer-static-chunk-composite-content-hit' : 'floor-layer-static-chunk-composite');
    return completeFloorLayerBreakdown({
      rebuilt: builtChunkCountThisFrame > 0,
      floorLayerRebuildWallMs: floorLayerRebuildWallMs,
      floorLayerPreSetupWallMs: floorLayerPreSetupWallMs,
      floorLayerLoopWallMs: floorLoopWallMs,
      floorLayerProjectionWallMs: floorProjectionWallMs,
      floorLayerColorMaterialWallMs: floorColorMaterialWallMs,
      floorLayerCanvasDrawWallMs: floorCanvasDrawWallMs,
      floorLayerPostFinalizeWallMs: floorLayerPostFinalizeWallMs,
      floorLayerResidualWallMs: floorLayerResidualWallMs,
      floorLayerReuseCameraDX: 0,
      floorLayerReuseCameraDY: 0,
      floorLayerReuseScale: 1,
      floorLayerBuiltCameraX: currentCameraXForLayer,
      floorLayerBuiltCameraY: currentCameraYForLayer,
      floorLayerBuiltZoom: currentZoomForLayer,
      floorLayerActualBranch: floorLayerActualBranch,
      floorVisibleChunkCount: visibleChunkKeys.length,
      floorBuiltChunkCountThisFrame: builtChunkCountThisFrame,
      floorMissingChunkCountBefore: missingChunkCountBefore,
      floorMissingChunkCountAfter: missingChunkCountAfter,
      floorBuiltTileCountThisFrame: builtTileCountThisFrame,
      floorChunkSize: chunkSize,
      floorVersionTag: 'floor-static-chunk-v1'
    }, deps);
  }


  function tryBuildFloorLayerCameraTransformReuseBreakdown(deps, options) {
    options = options || {};
    if (options.preferCameraTransformReuse !== true && options.cameraTransformReuse !== true) return null;
    var canvas = getFloorLayerCanvas(deps);
    var cache = getFloorLayerCache(deps);
    if (!canvas || !cache || !cache.signature || cache.dirty === true) return null;
    var camera = deps && deps.camera ? deps.camera : {};
    var currentViewRotation = getCurrentViewRotation(deps);
    var currentZoomForLayer = deps && typeof deps.getMainEditorZoomValueForRender === 'function' ? Number(deps.getMainEditorZoomValueForRender()) || 1 : 1;
    var currentCameraXForLayer = Number(camera && camera.x || 0);
    var currentCameraYForLayer = Number(camera && camera.y || 0);
    var contentSignature = deps && typeof deps.floorLayerSignature === 'function' ? deps.floorLayerSignature() : '';
    if (String(cache.signature || '') !== String(contentSignature || '')) return null;
    if (Number(cache.viewRotation || currentViewRotation) !== Number(currentViewRotation || 0)) return null;
    var chunkSize = getFloorChunkSizeForLayer(deps);
    ensureFloorChunkCacheState(chunkSize, deps);
    var scope = deps && typeof deps.getMainCameraRenderScope === 'function' ? deps.getMainCameraRenderScope(currentViewRotation) : null;
    var visibleChunkKeys = computeVisibleFloorChunkKeysForLayer(scope, chunkSize, deps);
    if (!areFloorChunkKeyListsEqual(visibleChunkKeys, cache.visibleChunkKeys || [])) return null;
    var builtZoomForReuse = Number(cache.buildZoom || currentZoomForLayer) || 1;
    var reuseScale = Number((currentZoomForLayer / builtZoomForReuse).toFixed(4));
    var dx = Number((currentCameraXForLayer - Number(cache.buildCameraX || 0)).toFixed(3));
    var dy = Number((currentCameraYForLayer - Number(cache.buildCameraY || 0)).toFixed(3));
    var cameraMoveOnly = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001;
    var zoomMoveOnly = Math.abs(reuseScale - 1) > 0.001;
    return completeFloorLayerBreakdown({
      rebuilt: false,
      skippedByInteractionBudget: true,
      cameraTransformOnly: cameraMoveOnly || zoomMoveOnly,
      floorLayerReuseCameraDX: dx,
      floorLayerReuseCameraDY: dy,
      floorLayerReuseScale: reuseScale,
      floorLayerBuiltCameraX: Number(cache.buildCameraX || 0),
      floorLayerBuiltCameraY: Number(cache.buildCameraY || 0),
      floorLayerBuiltZoom: builtZoomForReuse,
      floorLayerActualBranch: cameraMoveOnly || zoomMoveOnly
        ? 'floor-layer-cache-reuse-camera-transform'
        : 'floor-layer-cache-reuse-stable-transform',
      floorVisibleChunkCount: visibleChunkKeys.length,
      floorBuiltChunkCountThisFrame: 0,
      floorMissingChunkCountBefore: 0,
      floorMissingChunkCountAfter: 0,
      floorBuiltTileCountThisFrame: 0,
      floorChunkSize: chunkSize,
      floorVersionTag: 'floor-static-chunk-v1'
    }, deps);
  }



  function buildSharedFloorLayerCacheSnapshot(deps, breakdown, options) {
    options = options || {};
    var canvas = getFloorLayerCanvas(deps);
    var cache = getFloorLayerCache(deps);
    var currentViewRotation = getCurrentViewRotation(deps);
    var surfaceReady = !!(canvas && canvas.width > 0 && canvas.height > 0 && cache && cache.signature);
    var signature = String(cache && (cache.cacheSignature || cache.signature || '') || '');
    var sharedSurfaceRevision = Math.max(0, Math.round(Number(cache && cache.sharedSurfaceRevision || 0) || 0));
    // PXM-07.8A-fix: texture version must describe the visible shared
    // floor surface, not the time at which the source was sampled. Including
    // cache.lastBuiltAt/perfNow here made PixiJS upload the same canvas every
    // frame and prevented stable-frame sprite reuse. The revision is updated
    // only when the surface contents/view signature actually change.
    var versionParts = [
      signature,
      String(cache && (cache.contentViewSignature || cache.viewSignature) || ''),
      String(cache && cache.viewRotation != null ? cache.viewRotation : currentViewRotation),
      String(sharedSurfaceRevision),
      String(canvas && canvas.width || 0),
      String(canvas && canvas.height || 0)
    ];
    var version = versionParts.join('|');
    return {
      id: 'floor-layer-cache',
      sourceLayerMode: 'shared-floor-layer-cache-source',
      ready: surfaceReady,
      observed: surfaceReady || !!(cache && cache.signature),
      dirty: !!(cache && cache.dirty),
      surfaceType: 'canvas',
      surfaceCanvas: canvas || null,
      surfaceWidth: Number(canvas && canvas.width || 0),
      surfaceHeight: Number(canvas && canvas.height || 0),
      cssWidth: getViewW(deps),
      cssHeight: getViewH(deps),
      dpr: getDpr(deps),
      signature: signature,
      version: version,
      textureVersion: version,
      sharedSurfaceRevision: sharedSurfaceRevision,
      lastBuiltAt: Number(cache && cache.lastBuiltAt || 0),
      viewSignature: String(cache && cache.viewSignature || ''),
      contentViewSignature: String(cache && cache.contentViewSignature || ''),
      viewRotation: Number(cache && cache.viewRotation != null ? cache.viewRotation : currentViewRotation),
      buildCameraX: Number(cache && cache.buildCameraX || 0),
      buildCameraY: Number(cache && cache.buildCameraY || 0),
      buildZoom: Number(cache && cache.buildZoom || 1),
      visibleChunkKeys: cache && Array.isArray(cache.visibleChunkKeys) ? cache.visibleChunkKeys.slice() : [],
      chunkSize: Number(cache && cache.chunkSize || 0),
      chunkCount: cache && cache.chunks && typeof cache.chunks.size === 'number' ? Number(cache.chunks.size || 0) : 0,
      currentCameraX: Number(deps && deps.camera && deps.camera.x || 0),
      currentCameraY: Number(deps && deps.camera && deps.camera.y || 0),
      currentZoom: deps && typeof deps.getMainEditorZoomValueForRender === 'function' ? Number(deps.getMainEditorZoomValueForRender()) || 1 : 1,
      floorCacheBlitTransform: buildFloorLayerCacheBlitTransformFromBreakdown(deps, breakdown),
      reuseTransform: {
        dx: Number(breakdown && breakdown.floorLayerReuseCameraDX || 0),
        dy: Number(breakdown && breakdown.floorLayerReuseCameraDY || 0),
        scale: Number(breakdown && breakdown.floorLayerReuseScale || 1),
        builtCameraX: Number(breakdown && breakdown.floorLayerBuiltCameraX || cache && cache.buildCameraX || 0),
        builtCameraY: Number(breakdown && breakdown.floorLayerBuiltCameraY || cache && cache.buildCameraY || 0),
        builtZoom: Number(breakdown && breakdown.floorLayerBuiltZoom || cache && cache.buildZoom || 1),
        skippedByInteractionBudget: !!(breakdown && breakdown.skippedByInteractionBudget),
        cameraTransformOnly: !!(breakdown && breakdown.cameraTransformOnly),
        branch: String(breakdown && breakdown.floorLayerActualBranch || '')
      },
      stats: {
        rebuilt: !!(breakdown && breakdown.rebuilt),
        floorLayerRebuildWallMs: Number(breakdown && breakdown.floorLayerRebuildWallMs || 0),
        floorLayerBlitWallMs: Number(breakdown && breakdown.floorLayerBlitWallMs || 0),
        floorVisibleChunkCount: Number(breakdown && breakdown.floorVisibleChunkCount || (cache && cache.visibleChunkKeys && cache.visibleChunkKeys.length) || 0),
        floorBuiltChunkCountThisFrame: Number(breakdown && breakdown.floorBuiltChunkCountThisFrame || 0),
        floorMissingChunkCountBefore: Number(breakdown && breakdown.floorMissingChunkCountBefore || 0),
        floorMissingChunkCountAfter: Number(breakdown && breakdown.floorMissingChunkCountAfter || 0),
        floorBuiltTileCountThisFrame: Number(breakdown && breakdown.floorBuiltTileCountThisFrame || 0),
        floorLayerActualBranch: String(breakdown && breakdown.floorLayerActualBranch || 'floor-layer-cache-shared-source')
      },
      canvas2dConsumer: 'existing-canvas2d-drawImage',
      pixiConsumer: 'eligible-texture-from-shared-canvas',
      fallbackPolicy: 'If this snapshot is not ready, PixiJS must fall back to the existing first-pass floor renderer while Canvas2D fallback remains enabled.',
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      source: options.source || 'buildSharedFloorLayerCacheSnapshot'
    };
  }

  function ensureSharedFloorLayerCacheSnapshot(force, deps, options) {
    options = options || {};
    var breakdown = null;
    try {
      breakdown = force === true ? null : tryBuildFloorLayerCameraTransformReuseBreakdown(deps, options);
      if (!breakdown) breakdown = rebuildFloorLayerIfNeeded(force === true, deps) || null;
    } catch (_) {
      breakdown = null;
    }
    return buildSharedFloorLayerCacheSnapshot(deps, breakdown, options || {});
  }

  function drawFloor(deps) {
    var perfNow = deps && typeof deps.perfNow === 'function' ? deps.perfNow : function () { return Date.now(); };
    var ctx = deps && deps.ctx;
    var settings = getSettings(deps);
    var floorDrawStartAt = perfNow();
    var rebuildBreakdown = rebuildFloorLayerIfNeeded(false, deps) || null;
    var blitStartAt = perfNow();
    var blitWallMs = 0;
    var blitTransform = buildFloorLayerCacheBlitTransformFromBreakdown(deps, rebuildBreakdown);
    var reuseDX = Number(blitTransform.dx || 0);
    var reuseDY = Number(blitTransform.dy || 0);
    var reuseScale = Number(blitTransform.scale || 1);
    var canvas = getFloorLayerCanvas(deps);
    if (canvas && ctx && typeof ctx.drawImage === 'function') {
      if (blitTransform.shouldReuse) {
        ctx.save();
        if (blitTransform.scaled) {
          ctx.translate(Number(blitTransform.canvas2d.translateX || 0), Number(blitTransform.canvas2d.translateY || 0));
          ctx.scale(Number(blitTransform.canvas2d.scaleX || 1), Number(blitTransform.canvas2d.scaleY || 1));
          ctx.translate(Number(blitTransform.canvas2d.postTranslateX || 0), Number(blitTransform.canvas2d.postTranslateY || 0));
          ctx.drawImage(canvas, 0, 0, Number(blitTransform.canvas2d.drawWidth || getViewW(deps)), Number(blitTransform.canvas2d.drawHeight || getViewH(deps)));
        } else {
          ctx.drawImage(canvas, Number(blitTransform.canvas2d.drawX || 0), Number(blitTransform.canvas2d.drawY || 0), Number(blitTransform.canvas2d.drawWidth || getViewW(deps)), Number(blitTransform.canvas2d.drawHeight || getViewH(deps)));
        }
        ctx.restore();
      } else {
        ctx.drawImage(canvas, 0, 0, Number(blitTransform.canvas2d.drawWidth || getViewW(deps)), Number(blitTransform.canvas2d.drawHeight || getViewH(deps)));
      }
      blitWallMs = Math.max(0, perfNow() - blitStartAt);
      noteCanvas2dSharedOptimizationUse('floor-layer-cache', {
        stage: 'drawFloor.blit',
        canvas2dConsumerPath: 'shared-floor-layer-cache-source-plus-existing-canvas2d-drawImage',
        statsSummary: 'floorLayerBlitWallMs=' + String(Number(blitWallMs || 0).toFixed ? Number(blitWallMs || 0).toFixed(3) : blitWallMs),
        runtimeDetail: {
          floorLayerRebuilt: !!(rebuildBreakdown && rebuildBreakdown.rebuilt),
          floorLayerReusedDuringInteraction: !!(rebuildBreakdown && rebuildBreakdown.skippedByInteractionBudget),
          floorVisibleChunkCount: Number(rebuildBreakdown && rebuildBreakdown.floorVisibleChunkCount || 0),
          floorBuiltChunkCountThisFrame: Number(rebuildBreakdown && rebuildBreakdown.floorBuiltChunkCountThisFrame || 0)
        }
      });
      var cache = getFloorLayerCache(deps);
      var currentViewRotation = getCurrentViewRotation(deps);
      if (deps && typeof deps.logItemRotationPrototype === 'function') deps.logItemRotationPrototype('main-floor-draw-hit', {
        currentViewRotation: currentViewRotation,
        floorRenderPath: 'floor-layer-cache',
        floorCacheSignature: cache && cache.cacheSignature ? cache.cacheSignature : cache.signature,
        floorDrawUsedCurrentViewRotation: !!(cache && typeof cache.viewRotation === 'number' && cache.viewRotation === currentViewRotation),
        floorLayerReusedDuringInteraction: !!(rebuildBreakdown && rebuildBreakdown.skippedByInteractionBudget),
        floorLayerReuseCameraDX: reuseDX,
        floorLayerReuseCameraDY: reuseDY,
        floorLayerReuseScale: reuseScale
      });
    }
    var drawFloorWallMs = Math.max(0, perfNow() - floorDrawStartAt);
    var floorLoopWallMs = Number(rebuildBreakdown && rebuildBreakdown.floorLayerLoopWallMs || 0);
    var floorProjectionWallMs = Number(rebuildBreakdown && rebuildBreakdown.floorLayerProjectionWallMs || 0);
    var floorColorMaterialWallMs = Number(rebuildBreakdown && rebuildBreakdown.floorLayerColorMaterialWallMs || 0);
    var floorCanvasDrawWallMs = Number(rebuildBreakdown && rebuildBreakdown.floorLayerCanvasDrawWallMs || 0) + Number(blitWallMs || 0);
    var breakdown = {
      baseWorldActualBranch: String(rebuildBreakdown && rebuildBreakdown.floorLayerActualBranch || 'floor-layer-cache-unknown'),
      drawFloorWallMs: Number(drawFloorWallMs.toFixed(3)),
      floorLoopWallMs: Number(floorLoopWallMs.toFixed(3)),
      floorProjectionWallMs: Number(floorProjectionWallMs.toFixed(3)),
      floorColorMaterialWallMs: Number(floorColorMaterialWallMs.toFixed(3)),
      floorCanvasDrawWallMs: Number(floorCanvasDrawWallMs.toFixed(3)),
      floorPreSetupWallMs: Number(rebuildBreakdown && rebuildBreakdown.floorLayerPreSetupWallMs || 0),
      floorPostFinalizeWallMs: Number(rebuildBreakdown && rebuildBreakdown.floorLayerPostFinalizeWallMs || 0),
      floorResidualWallMs: Number(rebuildBreakdown && rebuildBreakdown.floorLayerResidualWallMs || 0),
      floorLayerRebuildWallMs: Number(rebuildBreakdown && rebuildBreakdown.floorLayerRebuildWallMs || 0),
      floorLayerBlitWallMs: Number(blitWallMs.toFixed(3)),
      floorLayerRebuilt: !!(rebuildBreakdown && rebuildBreakdown.rebuilt),
      floorLayerSkippedByInteractionBudget: !!(rebuildBreakdown && rebuildBreakdown.skippedByInteractionBudget),
      floorLayerReusedDuringInteraction: !!(rebuildBreakdown && rebuildBreakdown.skippedByInteractionBudget),
      floorLayerReuseCameraDX: Number(reuseDX.toFixed(3)),
      floorLayerReuseCameraDY: Number(reuseDY.toFixed(3)),
      floorLayerReuseScale: Number(reuseScale.toFixed(4)),
      floorVisibleChunkCount: Number(rebuildBreakdown && rebuildBreakdown.floorVisibleChunkCount || 0),
      floorBuiltChunkCountThisFrame: Number(rebuildBreakdown && rebuildBreakdown.floorBuiltChunkCountThisFrame || 0),
      floorMissingChunkCountBefore: Number(rebuildBreakdown && rebuildBreakdown.floorMissingChunkCountBefore || 0),
      floorMissingChunkCountAfter: Number(rebuildBreakdown && rebuildBreakdown.floorMissingChunkCountAfter || 0),
      floorBuiltTileCountThisFrame: Number(rebuildBreakdown && rebuildBreakdown.floorBuiltTileCountThisFrame || 0),
      floorChunkSize: Number(rebuildBreakdown && rebuildBreakdown.floorChunkSize || 0),
      floorVersionTag: String(rebuildBreakdown && rebuildBreakdown.floorVersionTag || 'floor-static-chunk-v1')
    };
    writeBaseWorldActualPathProfile({
      baseWorldActualBranch: breakdown.baseWorldActualBranch,
      floorLayerReusedDuringInteraction: !!breakdown.floorLayerReusedDuringInteraction,
      floorLayerRebuildWallMs: Number(breakdown.floorLayerRebuildWallMs || 0),
      floorLayerBlitWallMs: Number(breakdown.floorLayerBlitWallMs || 0),
      floorLoopWallMs: Number(breakdown.floorLoopWallMs || 0),
      floorProjectionWallMs: Number(breakdown.floorProjectionWallMs || 0),
      floorColorMaterialWallMs: Number(breakdown.floorColorMaterialWallMs || 0),
      floorCanvasDrawWallMs: Number(breakdown.floorCanvasDrawWallMs || 0),
      floorPreSetupWallMs: Number(breakdown.floorPreSetupWallMs || 0),
      floorPostFinalizeWallMs: Number(breakdown.floorPostFinalizeWallMs || 0),
      floorResidualWallMs: Number(breakdown.floorResidualWallMs || 0),
      drawFloorWallMs: Number(breakdown.drawFloorWallMs || 0)
    }, deps);
    if (deps && typeof deps.setLastDrawFloorBreakdown === 'function') deps.setLastDrawFloorBreakdown(breakdown);
    return breakdown;
  }

  var api = {
    layer: 'presentation/render/renderer',
    phase: 'P8d',
    getActiveBaseWorldActualPathProfile: getActiveBaseWorldActualPathProfile,
    writeBaseWorldActualPathProfile: writeBaseWorldActualPathProfile,
    completeFloorLayerBreakdown: completeFloorLayerBreakdown,
    ensureFloorLayerCanvas: ensureFloorLayerCanvas,
    getActiveCameraInteractionTypeForFloorLayer: getActiveCameraInteractionTypeForFloorLayer,
    getCameraSettleReuseStateForFloorLayer: getCameraSettleReuseStateForFloorLayer,
    shouldDeferFloorLayerSettleCommit: shouldDeferFloorLayerSettleCommit,
    shouldForceFloorLayerInteractionReuse: shouldForceFloorLayerInteractionReuse,
    getFloorChunkSizeForLayer: getFloorChunkSizeForLayer,
    ensureFloorChunkCacheState: ensureFloorChunkCacheState,
    getFloorChunkKeyForLayer: getFloorChunkKeyForLayer,
    parseFloorChunkKeyForLayer: parseFloorChunkKeyForLayer,
    computeVisibleFloorChunkKeysForLayer: computeVisibleFloorChunkKeysForLayer,
    buildFloorLayerViewSignatureForLayer: buildFloorLayerViewSignatureForLayer,
    buildFloorChunkEntryForLayer: buildFloorChunkEntryForLayer,
    drawFloorOutlineToLayer: drawFloorOutlineToLayer,
    rebuildFloorLayerIfNeeded: rebuildFloorLayerIfNeeded,
    buildFloorLayerCacheBlitTransformFromBreakdown: buildFloorLayerCacheBlitTransformFromBreakdown,
    buildSharedFloorLayerCacheSnapshot: buildSharedFloorLayerCacheSnapshot,
    tryBuildFloorLayerCameraTransformReuseBreakdown: tryBuildFloorLayerCameraTransformReuseBreakdown,
    ensureSharedFloorLayerCacheSnapshot: ensureSharedFloorLayerCacheSnapshot,
    drawFloor: drawFloor
  };

  global.__CANVAS2D_FLOOR_LAYER_DRAW_PASS__ = api;
  global.__APP_PRESENTATION_CANVAS2D_FLOOR_LAYER_DRAW_PASS__ = api;
  global.IsometricCanvas2dFloorLayerDrawPass = api;
  if (global.App) {
    global.App.presentation = global.App.presentation || {};
    global.App.presentation.render = global.App.presentation.render || {};
    global.App.presentation.render.canvas2dFloorLayerDrawPass = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
