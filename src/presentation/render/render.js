// v1 split file generated from original monolithic app.js
// 注意：此文件为保持行为稳定的第一刀拆分，允许存在少量跨层函数。

function faceColors(base) {
  const fc = baseFaceColors(base);
  return {
    top: rgbToCss(fc.top),
    left: rgbToCss(fc.east),
    right: rgbToCss(fc.south),
    line: fc.line,
  };
}

function drawPoly(points, fill, stroke = 'rgba(0,0,0,.22)', width = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function pointInPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function cubePoints(x, y, z, w = 1, d = 1, h = 1) {
  return {
    p000: iso(x,     y,     z),
    p100: iso(x + w, y,     z),
    p110: iso(x + w, y + d, z),
    p010: iso(x,     y + d, z),
    p001: iso(x,     y,     z + h),
    p101: iso(x + w, y,     z + h),
    p111: iso(x + w, y + d, z + h),
    p011: iso(x,     y + d, z + h),
  };
}

function projectedBounds(box) {
  const pts = cubePoints(box.x, box.y, box.z, box.w, box.d, box.h);
  const arr = Object.values(pts);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of arr) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

function polyBounds(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

function buildBoxFaces(box, alpha = 1) {
  // 保留兼容接口：单个 box 的可见外表面（不是内部面）
  return buildSurfaceFaces([box], alpha, false);
}

function overlap2D(a, b) {
  return !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxY <= b.minY || a.minY >= b.maxY);
}

function isBehind(a, b) {
  return a.maxX <= b.minX + EPS || a.maxY <= b.minY + EPS || a.maxZ <= b.minZ + EPS;
}

function makeAABB(x, y, z, w, d, h) {
  return { minX: x, maxX: x + w, minY: y, maxY: y + d, minZ: z, maxZ: z + h };
}

function rectCircleCollide(cx, cy, cr, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < cr * cr;
}

function boxRectOverlap3D(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y && a.z < b.z + b.h && a.z + a.h > b.z;
}


function buildOccupancy(boxList) {
  const occ = new Map();
  for (const b of boxList) {
    for (let x = b.x; x < b.x + b.w; x++) {
      for (let y = b.y; y < b.y + b.d; y++) {
        for (let z = b.z; z < b.z + b.h; z++) {
          occ.set(`${x},${y},${z}`, { box: b, x, y, z });
        }
      }
    }
  }
  return occ;
}


function buildColumnTops(boxList) {
  const tops = new Map();
  for (const b of boxList) {
    for (let x = b.x; x < b.x + b.w; x++) {
      for (let y = b.y; y < b.y + b.d; y++) {
        const key = `${x},${y}`;
        tops.set(key, Math.max(tops.get(key) ?? 0, b.z + b.h));
      }
    }
  }
  return tops;
}

function hitTopFace(sx, sy) {
  const p = { x: sx, y: sy };
  const visibleBoxes = boxes.filter(function (b) {
    var prefab = getPrefabById(b.prefabId);
    return prefabDrawsVoxels(prefab) && (!prefab || prefab.kind !== 'habbo_import');
  });
  const occ = buildOccupancy(visibleBoxes);
  let best = null;
  for (const cell of occ.values()) {
    if (occ.has(`${cell.x},${cell.y},${cell.z + 1}`)) continue; // 不是顶部
    const pts = cubePoints(cell.x, cell.y, cell.z, 1, 1, 1);
    const poly = [pts.p001, pts.p101, pts.p111, pts.p011];
    if (!pointInPoly(p, poly)) continue;
    const topZ = cell.z + 1;
    const score = topZ * 1000 + (cell.x + cell.y);
    if (!best || score > best.score) {
      best = { x: cell.x, y: cell.y, z: topZ, score };
    }
  }
  return best;
}

function drawFrontLines() {
  const tops = buildColumnTops(boxes);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,64,64,.95)';
  ctx.lineWidth = 2;
  for (const key of tops.keys()) {
    const [x, y] = key.split(',').map(Number);
    const a = iso(x, y + 1, 0);
    const b = iso(x + 1, y + 1, 0);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function buildSurfaceFaces(boxList, alpha = 1, includeHidden = false) {
  const occ = buildOccupancy(boxList);
  const faces = [];
  const e = 0.001;
  const prio = { bottom: 0, north: 1, west: 2, east: 3, south: 4, top: 5 };

  function makeFace(cell, dir, poly, fill, aabb, worldPts) {
    const depth = poly.reduce((s, p) => s + p.y, 0) / poly.length + prio[dir] * 0.0001;
    faces.push({
      id: `box-${cell.box.id}-${cell.x}-${cell.y}-${cell.z}-${dir}`,
      kind: 'box-face',
      boxId: cell.box.id,
      instanceId: cell.box.instanceId || null,
      dir,
      cell: { x: cell.x, y: cell.y, z: cell.z },
      poly,
      worldPts: Array.isArray(worldPts) ? worldPts.map(function (p) { return { x: p.x, y: p.y, z: p.z }; }) : [],
      aabb,
      screen: polyBounds(poly),
      fallbackDepth: depth,
      draw: () => {
        ctx.save();
        ctx.globalAlpha = alpha;
        drawPoly(poly, fill, 'rgba(0,0,0,.16)');
        ctx.restore();
      },
    });
  }

  for (const cell of occ.values()) {
    const { box, x, y, z } = cell;
    const pts = cubePoints(x, y, z, 1, 1, 1);
    const { p000,p100,p110,p010,p001,p101,p111,p011 } = pts;
    const fc = faceColors(box.base);

    const neighbors = {
      bottom: occ.has(`${x},${y},${z - 1}`),
      north:  occ.has(`${x},${y - 1},${z}`),
      south:  occ.has(`${x},${y + 1},${z}`),
      west:   occ.has(`${x - 1},${y},${z}`),
      east:   occ.has(`${x + 1},${y},${z}`),
      top:    occ.has(`${x},${y},${z + 1}`),
    };

    // 当前相机下真正可见的是：top + east + south
    if (!neighbors.top) {
      makeFace(cell, 'top', [p001,p101,p111,p011], xrayFaces ? 'rgba(255,255,255,.20)' : fc.top,
               makeAABB(x, y, z + 1, 1, 1, e), [p001,p101,p111,p011]);
    }
    if (!neighbors.east) {
      makeFace(cell, 'east', [p101,p111,p110,p100], xrayFaces ? 'rgba(255,255,255,.18)' : fc.left,
               makeAABB(x + 1, y, z, e, 1, 1), [p101,p111,p110,p100]);
    }
    if (!neighbors.south) {
      makeFace(cell, 'south', [p011,p111,p110,p010], xrayFaces ? 'rgba(255,255,255,.16)' : fc.right,
               makeAABB(x, y + 1, z, 1, e, 1), [p011,p111,p110,p010]);
    }

    if (includeHidden) {
      if (!neighbors.bottom) {
        makeFace(cell, 'bottom', [p000,p100,p110,p010], 'rgba(255,255,255,.08)',
                 makeAABB(x, y, z - e, 1, 1, e), [p000,p100,p110,p010]);
      }
      if (!neighbors.north) {
        makeFace(cell, 'north', [p001,p101,p100,p000], 'rgba(255,255,255,.10)',
                 makeAABB(x, y - e, z, 1, e, 1), [p001,p101,p100,p000]);
      }
      if (!neighbors.west) {
        makeFace(cell, 'west', [p001,p011,p010,p000], 'rgba(255,255,255,.10)',
                 makeAABB(x - e, y, z, e, 1, 1), [p001,p011,p010,p000]);
      }
    }
  }

  return faces;
}


function drawBox(box, alpha = 1) {
  const faces = buildSurfaceFaces([box], alpha, xrayFaces).sort((a, b) => a.fallbackDepth - b.fallbackDepth);
  for (const f of faces) f.draw();

  if (showDebug) {
    const p = iso(box.x + box.w, box.y + box.d, box.z + box.h);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }
}


var prefabSpriteImageCache = new Map();
var habboCompositeCache = new Map();

var habboSpriteDrawDebugOnce = new Set();

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

function getHabboPlacementShift(prefab, rotation) {
  var dims = prefab && prefab.habboMeta && prefab.habboMeta.dimensions ? prefab.habboMeta.dimensions : null;
  var vis = String(prefab && prefab.habboMeta && prefab.habboMeta.visualization || '');
  if (!dims) return { x: 0, y: 0 };
  var spanX = Math.max(1, Math.round(Number(dims.x) || Number(prefab && prefab.w) || 1));
  var spanY = Math.max(1, Math.round(Number(dims.y) || Number(prefab && prefab.d) || 1));
  var rotKey = ((parseInt(rotation || 0, 10) % 2) + 2) % 2;
  if (vis === 'furniture_static' && ((spanX === 1 && spanY > 1) || (spanY === 1 && spanX > 1))) {
    var depthSpan = rotKey === 0 ? spanY : spanX;
    if (depthSpan > 1) {
      var shiftX = -Math.round((depthSpan - 1) * settings.tileW / 2);
      return { x: shiftX, y: 0 };
    }
  }
  return { x: 0, y: 0 };
}

function pixelShiftToCellShift(shift) {
  var sx = Number(shift && shift.x || 0);
  var sy = Number(shift && shift.y || 0);
  if (!sx && !sy) return { x: 0, y: 0 };
  var halfW = settings.tileW / 2;
  var halfH = settings.tileH / 2;
  if (!halfW || !halfH) return { x: 0, y: 0 };
  var dx = Math.round(((sx / halfW) + (sy / halfH)) / 2);
  var dy = Math.round(((sy / halfH) - (sx / halfW)) / 2);
  return { x: dx, y: dy };
}

function cellShiftToPixelShift(cellShift) {
  var dx = Number(cellShift && cellShift.x || 0);
  var dy = Number(cellShift && cellShift.y || 0);
  return {
    x: Math.round((dx - dy) * settings.tileW / 2),
    y: Math.round((dx + dy) * settings.tileH / 2)
  };
}

function getHabboPlacementDecomposition(prefab, rotation) {
  var raw = getHabboPlacementShift(prefab, rotation);
  var cellShift = pixelShiftToCellShift(raw);
  var snapped = cellShiftToPixelShift(cellShift);
  return {
    rawShift: { x: Math.round(raw.x || 0), y: Math.round(raw.y || 0) },
    cellShift: cellShift,
    residualShift: {
      x: Math.round((raw.x || 0) - (snapped.x || 0)),
      y: Math.round((raw.y || 0) - (snapped.y || 0))
    }
  };
}

function getHabboPlacementCellShift(prefab, rotation) {
  var info = getHabboPlacementDecomposition(prefab, rotation);
  return info && info.cellShift ? info.cellShift : { x: 0, y: 0 };
}

function getHabboRoomOrigin(prefab, origin, anchor, rotation) {
  var foot = iso((origin.x || 0) + (anchor.x || 0), (origin.y || 0) + (anchor.y || 0), (origin.z || 0) + (anchor.z || 0));
  var info = getHabboPlacementDecomposition(prefab, rotation);
  var shift = info && info.residualShift ? info.residualShift : { x: 0, y: 0 };
  return {
    x: Math.round(foot.x + (shift.x || 0)),
    // Scuti 的示例房间里 floorThickness 按本轮测试改为 20，
    // 而当前项目的地面顶面近似按 0 厚度显示。
    // Habbo floor furni 若直接贴到这里，会整体显得悬浮一小截，
    // 所以把这段 floor-thickness 差额一次性补到 sprite 基线里。
    y: Math.round(foot.y + (shift.y || 0) + 20)
  };
}


function getHabboProxyVisualShift(prefab, rotation) {
  var info = getHabboPlacementDecomposition(prefab, rotation);
  var residual = info && info.residualShift ? info.residualShift : { x: 0, y: 0 };
  return {
    x: Math.round(residual.x || 0),
    y: Math.round(residual.y || 0)
  };
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
  if (!prefab || prefab.kind !== 'habbo_import') return { x: 0, y: 0 };
  return getHabboProxyVisualShift(prefab, instance && instance.rotation || 0);
}

function getHabboLayerLocalBox(layer, totalScale, srcW, srcH, prefab) {
  var regX = Number(layer && layer.regX);
  var regY = Number(layer && layer.regY);
  var propX = Number(layer && layer.propX);
  var propY = Number(layer && layer.propY);
  var drawW = Math.max(1, Math.round((srcW || 0) * totalScale));
  var drawH = Math.max(1, Math.round((srcH || 0) * totalScale));
  // 这里不再在 draw 阶段重新发明 flip 盒子。
  // offsetPx 在 state.js 建 layer 时就已经被还原成“真实 top-left”。
  // draw 阶段只负责把这个 top-left 乘缩放后用同一套 left-anchored 语义画出来。
  var drawXMin = Math.round((layer && layer.offsetPx && layer.offsetPx.x || 0) * totalScale);
  var drawY = Math.round((layer && layer.offsetPx && layer.offsetPx.y || 0) * totalScale);

  return {
    drawX: drawXMin,
    drawY: drawY,
    drawW: drawW,
    drawH: drawH,
    drawXMax: drawXMin + drawW,
    regX: regX,
    regY: regY,
    propX: propX,
    propY: propY
  };
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

function rotKeyForSprite(rotation) {
  return String((((parseInt(rotation || 0, 10) % 4) + 4) % 4));
}

function drawInstanceProxyBoxes(instance, alpha) {
  var prefab = getPrefabById(instance.prefabId);
  var shift = getHabboInstanceVisualShift(instance, prefab);
  var instanceBoxes = boxes.filter(function (b) { return b.instanceId === instance.instanceId; });
  withScreenTranslate(shift, function () {
    for (var i = 0; i < instanceBoxes.length; i++) drawBox(instanceBoxes[i], alpha == null ? 0.82 : alpha);
  });
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

function drawVoxelCell(cell, occ, alpha = 1) {
var pts = cubePoints(cell.x, cell.y, cell.z, 1, 1, 1);
var { p100,p110,p010,p001,p101,p111,p011 } = pts;
var fc = baseFaceColors((cell.box && cell.box.base) || cell.base || "#7aa2f7");

var hasTop = !occ.has(`${cell.x},${cell.y},${cell.z + 1}`);
var hasEast = !occ.has(`${cell.x + 1},${cell.y},${cell.z}`);
var hasSouth = !occ.has(`${cell.x},${cell.y + 1},${cell.z}`);

var topCenter = { x: cell.x + 0.5, y: cell.y + 0.5, z: cell.z + 1 };
var eastCenter = { x: cell.x + 1, y: cell.y + 0.5, z: cell.z + 0.5 };
var southCenter = { x: cell.x + 0.5, y: cell.y + 1, z: cell.z + 0.5 };

ctx.save();
ctx.globalAlpha = alpha;

if (hasTop) {
  var topFace = buildRenderableFace(
    [p001,p101,p111,p011],
    [ {x: cell.x, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ],
    fc.top,
    { x: 0, y: 0, z: 1 },
    cell.box && cell.box.instanceId,
    fc.line,
    null
  );
  drawPoly(topFace.points, topFace.fill, topFace.stroke, topFace.width || 1);
  if (topFace.overlays) for (const ov of topFace.overlays) drawPoly(ov.points, ov.fill, ov.stroke, ov.width || 0);
}
if (hasEast) {
  var eastFace = buildRenderableFace(
    [p101,p111,p110,p100],
    [ {x: cell.x + 1, y: cell.y, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1} ],
    fc.east,
    { x: 1, y: 0, z: 0 },
    cell.box && cell.box.instanceId,
    fc.line,
    xrayFaces ? 'rgba(255,255,255,.18)' : null
  );
  drawPoly(eastFace.points, eastFace.fill, eastFace.stroke, eastFace.width || 1);
  if (eastFace.overlays) for (const ov of eastFace.overlays) drawPoly(ov.points, ov.fill, ov.stroke, ov.width || 0);
}
if (hasSouth) {
  var southFace = buildRenderableFace(
    [p011,p111,p110,p010],
    [ {x: cell.x, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ],
    fc.south,
    { x: 0, y: 1, z: 0 },
    cell.box && cell.box.instanceId,
    fc.line,
    xrayFaces ? 'rgba(255,255,255,.14)' : null
  );
  drawPoly(southFace.points, southFace.fill, southFace.stroke, southFace.width || 1);
  if (southFace.overlays) for (const ov of southFace.overlays) drawPoly(ov.points, ov.fill, ov.stroke, ov.width || 0);
}

if (xrayFaces) {
  const { p000 } = pts;
  const hasWest = !occ.has(`${cell.x - 1},${cell.y},${cell.z}`);
  const hasNorth = !occ.has(`${cell.x},${cell.y - 1},${cell.z}`);
  if (hasWest) drawPoly([p001,p011,p010,p000], 'rgba(255,255,255,.08)', fc.line);
  if (hasNorth) drawPoly([p001,p101,p100,p000], 'rgba(255,255,255,.08)', fc.line);
}

ctx.restore();


if (showDebug) {
  const foot = iso(cell.x + 1, cell.y + 1, cell.z);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(foot.x, foot.y, 2.5, 0, Math.PI * 2); ctx.fill();
}
}

function buildStaticVoxelRenderable(cell, occ) {
var pts = cubePoints(cell.x, cell.y, cell.z, 1, 1, 1);
var fc = baseFaceColors((cell.box && cell.box.base) || cell.base || "#7aa2f7");
var { p000,p100,p110,p010,p001,p101,p111,p011 } = pts;
var hasTop = !occ.has(`${cell.x},${cell.y},${cell.z + 1}`);
var hasEast = !occ.has(`${cell.x + 1},${cell.y},${cell.z}`);
var hasSouth = !occ.has(`${cell.x},${cell.y + 1},${cell.z}`);
var topCenter = { x: cell.x + 0.5, y: cell.y + 0.5, z: cell.z + 1 };
var eastCenter = { x: cell.x + 1, y: cell.y + 0.5, z: cell.z + 0.5 };
var southCenter = { x: cell.x + 0.5, y: cell.y + 1, z: cell.z + 0.5 };
var faces = [];
if (hasTop) faces.push(buildRenderableFace(
  [p001,p101,p111,p011],
  [ {x: cell.x, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ],
  fc.top,
  { x: 0, y: 0, z: 1 },
  cell.box && cell.box.instanceId,
  fc.line,
  null
));
if (hasEast) faces.push(buildRenderableFace(
  [p101,p111,p110,p100],
  [ {x: cell.x + 1, y: cell.y, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1} ],
  fc.east,
  { x: 1, y: 0, z: 0 },
  cell.box && cell.box.instanceId,
  fc.line,
  xrayFaces ? 'rgba(255,255,255,.18)' : null
));
if (hasSouth) faces.push(buildRenderableFace(
  [p011,p111,p110,p010],
  [ {x: cell.x, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ],
  fc.south,
  { x: 0, y: 1, z: 0 },
  cell.box && cell.box.instanceId,
  fc.line,
  xrayFaces ? 'rgba(255,255,255,.14)' : null
));
if (xrayFaces) {
  const hasWest = !occ.has(`${cell.x - 1},${cell.y},${cell.z}`);
  const hasNorth = !occ.has(`${cell.x},${cell.y - 1},${cell.z}`);
  if (hasWest) faces.push({ points: [p001,p011,p010,p000], fill: 'rgba(255,255,255,.08)', stroke: fc.line, width: 1 });
  if (hasNorth) faces.push({ points: [p001,p101,p100,p000], fill: 'rgba(255,255,255,.08)', stroke: fc.line, width: 1 });
}
const domainCore = getDomainSceneCoreApi();
const orderMeta = domainCore && typeof domainCore.computeVoxelRenderableSort === 'function'
  ? domainCore.computeVoxelRenderableSort({ cell: cell, box: cell.box || null })
  : { sortKey: cell.x + cell.y + 1, tie: cell.z * 100000 + cell.y * 100 + cell.x };
return {
  id: `voxel-${cell.box.id}-${cell.x}-${cell.y}-${cell.z}`,
  kind: 'voxel',
  sortKey: orderMeta.sortKey,
  tie: orderMeta.tie,
  faces,
  debugFoot: showDebug ? iso(cell.x + 1, cell.y + 1, cell.z) : null,
};
}



function buildRenderableFace(points, worldPts, baseRgb, normal, ownerInstanceId, stroke, xrayFill) {
  var fill = xrayFill || rgbToCss(litFaceColor(baseRgb, worldPts, normal, ownerInstanceId));
  var face = { points: points, fill: fill, stroke: stroke, width: 1 };
  if (!xrayFill) {
    var patches = buildFaceShadowPatches(worldPts, normal, ownerInstanceId);
    if (patches && patches.length) {
      face.overlays = patches.map(function (patch) {
        return {
          points: patch.pts.map(function (pt) { return iso(pt.x, pt.y, pt.z); }),
          fill: shadowFillCss(patch.alpha),
          stroke: null,
          width: 0,
        };
      });
    }
  }
  return face;
}

function buildShiftedVoxelRenderable(cell, occ, shift, idPrefix) {
  var base = buildStaticVoxelRenderable(cell, occ);
  if (!base || !Array.isArray(base.faces) || !base.faces.length) return null;
  var sx = Math.round(shift && shift.x || 0);
  var sy = Math.round(shift && shift.y || 0);
  if (!sx && !sy) return base;
  var movedFaces = base.faces.map(function (face) {
    return {
      points: face.points.map(function (pt) { return { x: pt.x + sx, y: pt.y + sy }; }),
      fill: face.fill,
      stroke: face.stroke,
      width: face.width || 1,
      overlays: (face.overlays || []).map(function (ov) {
        return {
          points: ov.points.map(function (pt) { return { x: pt.x + sx, y: pt.y + sy }; }),
          fill: ov.fill,
          stroke: ov.stroke,
          width: ov.width || 0,
        };
      })
    };
  });
  return {
    id: (idPrefix || 'habbo-voxel') + '-' + String(cell.box && cell.box.id || 'x') + '-' + String(cell.x) + '-' + String(cell.y) + '-' + String(cell.z),
    kind: 'voxel',
    sortKey: base.sortKey,
    tie: base.tie,
    faces: movedFaces,
    debugFoot: base.debugFoot ? { x: base.debugFoot.x + sx, y: base.debugFoot.y + sy } : null,
  };
}

function drawCachedVoxelRenderable(item) {
  for (const face of item.faces) {
    drawPoly(face.points, face.fill, face.stroke, face.width || 1);
    if (face.overlays) for (const ov of face.overlays) drawPoly(ov.points, ov.fill, ov.stroke, ov.width || 0);
  }
  if (item.debugFoot) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(item.debugFoot.x, item.debugFoot.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

function rebuildStaticBoxRenderCacheIfNeeded(force = false) {
  const currentViewRotation = normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation);
  const geometrySignature = staticBoxGeometrySignature();
  const lightingSignature = staticBoxLightingSignature();
  const cacheSignature = String(geometrySignature || '') + '|' + String(lightingSignature || '');
  const semanticLogSeen = Object.create(null);
  const geometryChanged = force || staticBoxRenderCache.dirtyGeometry || staticBoxRenderCache.geometrySignature !== geometrySignature;
  const lightingChanged = force || staticBoxRenderCache.dirtyLighting || staticBoxRenderCache.lightingSignature !== lightingSignature;
  const viewRotationChanged = force || Number(staticBoxRenderCache.viewRotation || 0) !== Number(currentViewRotation || 0) || staticBoxRenderCache.cacheSignature !== cacheSignature;
  if (!geometryChanged && !lightingChanged && !viewRotationChanged && staticBoxRenderCache.renderables.length) return;

  const now = perfNow();
  if (!force && isInteractiveRenderPressure() && !isMainEditorViewAnimatingForRender() && staticBoxRenderCache.renderables.length && (now - staticBoxRenderCache.lastBuiltAt) < STATIC_BOX_LAYER_INTERACTION_MS) {
    return;
  }

  const visibilityCore = getRenderVisibilityCoreApi();
  const cameraScope = getMainCameraRenderScope(currentViewRotation);
  const allStructuredBoxes = boxes.filter(function (b) {
    if (!b) return false;
    var prefab = getPrefabById(b.prefabId);
    return prefabDrawsVoxels(prefab) && !isFiveFaceDebugPrefab(prefab);
  });
  const occ = buildOccupancy(allStructuredBoxes);
  const scopedStructuredBoxes = filterBoxesForMainCameraScope(allStructuredBoxes, cameraScope);
  const surfaceCache = visibilityCore && typeof visibilityCore.buildVisibleSurfaceCache === 'function'
    ? visibilityCore.buildVisibleSurfaceCache(scopedStructuredBoxes, {
        scope: null,
        occupancy: occ,
        surfaceOnlyRenderingEnabled: cameraScope.surfaceOnlyRenderingEnabled !== false,
        classifyBox: function (box) {
          return {
            isTerrain: !!(box && box.generatedBy === 'terrain-generator'),
            isStructured: true,
            isVoxelFurniture: !(box && box.generatedBy === 'terrain-generator')
          };
        }
      })
    : {
        surfaceCells: scopedStructuredBoxes.map(function (box) { return { box: box, visibleFaces: ['top', 'east', 'south'] }; }),
        terrainColumnCount: 0,
        logicalVoxelCountEstimated: allStructuredBoxes.length,
        visibleTopFaceCount: 0,
        visibleSideFaceCount: 0,
        internalVoxelSkippedCount: 0,
        hiddenInternalSurfaceSkippedCount: 0,
        voxelFurnitureProcessedCount: scopedStructuredBoxes.length,
        cameraCulledCount: Math.max(0, allStructuredBoxes.length - scopedStructuredBoxes.length),
        surfaceOnlyRenderingEnabled: true
      };
  const renderables = [];
  const surfaceCells = Array.isArray(surfaceCache.surfaceCells) ? surfaceCache.surfaceCells : [];
  for (const entry of surfaceCells) {
    const cell = entry && entry.box ? entry.box : entry;
    if (!cell) continue;
    var staticVoxel = buildStaticVoxelRenderable({ x: cell.x, y: cell.y, z: cell.z, box: cell, base: cell.base, visibleFaces: entry && Array.isArray(entry.visibleFaces) ? entry.visibleFaces.slice() : null }, occ, currentViewRotation, semanticLogSeen);
    var flattenedFaces = flattenStaticVoxelRenderable(staticVoxel, currentViewRotation);
    for (const faceRenderable of flattenedFaces) {
      renderables.push(faceRenderable);
    }
  }
  renderables.sort(compareRenderablesByDomain);
  for (const item of renderables) {
    if (!item || typeof item !== 'object') continue;
    if (!item.renderPath) item.renderPath = 'static-cache-face';
    item.cacheViewRotation = currentViewRotation;
    item.cacheSignature = cacheSignature;
    item.drawScreenPosition = deriveRenderableDrawPosition(item);
  }
  staticBoxRenderCache.occupancy = occ;
  staticBoxRenderCache.renderables = renderables;
  staticBoxRenderCache.geometrySignature = geometrySignature;
  staticBoxRenderCache.lightingSignature = lightingSignature;
  staticBoxRenderCache.viewRotation = currentViewRotation;
  staticBoxRenderCache.cacheSignature = cacheSignature;
  staticBoxRenderCache.lastBuiltAt = now;
  staticBoxRenderCache.dirtyGeometry = false;
  staticBoxRenderCache.dirtyLighting = false;
  staticBoxRenderCache.surfaceStats = {
    terrainColumnCount: Number(surfaceCache.terrainColumnCount || 0),
    logicalVoxelCountEstimated: Number(surfaceCache.logicalVoxelCountEstimated || allStructuredBoxes.length),
    visibleTopFaceCount: Number(surfaceCache.visibleTopFaceCount || 0),
    visibleSideFaceCount: Number(surfaceCache.visibleSideFaceCount || 0),
    internalVoxelSkippedCount: Number(surfaceCache.internalVoxelSkippedCount || 0),
    hiddenInternalSurfaceSkippedCount: Number(surfaceCache.hiddenInternalSurfaceSkippedCount || 0),
    voxelFurnitureProcessedCount: Number(surfaceCache.voxelFurnitureProcessedCount || 0),
    cameraCulledCount: Number(surfaceCache.cameraCulledCount || 0),
    surfaceOnlyRenderingEnabled: surfaceCache.surfaceOnlyRenderingEnabled !== false,
    renderSourceCountBeforeVisibility: allStructuredBoxes.length,
    renderSourceCountAfterVisibility: surfaceCells.length,
    finalRenderableCount: renderables.length,
    buildMs: Math.max(0, perfNow() - now)
  };
  __lastSurfaceCacheStats = staticBoxRenderCache.surfaceStats;
  var rebuildReason = force ? 'force' : (viewRotationChanged ? 'viewRotation-changed' : (geometryChanged ? 'geometry-changed' : 'lighting-changed'));
  var currentViewRotationInfo = getSafeMainEditorViewRotation(null);
  var visibleTopFaceCount = Number((staticBoxRenderCache.surfaceStats && staticBoxRenderCache.surfaceStats.visibleTopFaceCount) || 0);
  var visibleSideFaceCount = Number((staticBoxRenderCache.surfaceStats && staticBoxRenderCache.surfaceStats.visibleSideFaceCount) || 0);
  logItemRotationPrototype('main-static-cache-rebuilt', {
    currentViewRotation: currentViewRotation,
    cacheSignature: cacheSignature,
    geometrySignature: geometrySignature,
    cacheSignatureIncludesRuntimeViewRotation: true,
    sourceOfViewRotation: currentViewRotationInfo && currentViewRotationInfo.source ? currentViewRotationInfo.source : 'runtime-state',
    renderableCount: renderables.length,
    terrainBatchDrawCount: renderables.length,
    terrainVisibleFaceCount: visibleTopFaceCount + visibleSideFaceCount,
    reason: rebuildReason
  });
  logItemRotationPrototype('render-surface-cache-summary', {
    terrainColumnCount: Number(staticBoxRenderCache.surfaceStats.terrainColumnCount || 0),
    logicalVoxelCountEstimated: Number(staticBoxRenderCache.surfaceStats.logicalVoxelCountEstimated || 0),
    visibleTopFaceCount: Number(staticBoxRenderCache.surfaceStats.visibleTopFaceCount || 0),
    visibleSideFaceCount: Number(staticBoxRenderCache.surfaceStats.visibleSideFaceCount || 0),
    internalVoxelSkippedCount: Number(staticBoxRenderCache.surfaceStats.internalVoxelSkippedCount || 0),
    voxelFurnitureProcessedCount: Number(staticBoxRenderCache.surfaceStats.voxelFurnitureProcessedCount || 0),
    surfaceOnlyRenderingEnabled: staticBoxRenderCache.surfaceStats.surfaceOnlyRenderingEnabled !== false
  });
  logItemRotationPrototype('main-view-rotation-source-check', buildMainViewRotationSourceCheckPayload(currentViewRotation, currentViewRotation, geometrySignature));
  noteLayerRebuild('static-box', `interactive=${isInteractiveRenderPressure()} voxels=${renderables.length} lights=${lights.length} viewRotation=${currentViewRotation}`);
}

function mergeSortedRenderables(staticRenderables, dynamicRenderables) {
  if (!dynamicRenderables.length) return staticRenderables.slice();
  const merged = [];
  let i = 0, j = 0;
  while (i < staticRenderables.length && j < dynamicRenderables.length) {
    const a = staticRenderables[i], b = dynamicRenderables[j];
    if (compareRenderablesByDomain(a, b) <= 0) {
      merged.push(a); i += 1;
    } else {
      merged.push(b); j += 1;
    }
  }
  while (i < staticRenderables.length) merged.push(staticRenderables[i++]);
  while (j < dynamicRenderables.length) merged.push(dynamicRenderables[j++]);
  return merged;
}

function drawFloor(scope) {
  for (let y = 0; y < settings.gridH; y++) {
    for (let x = 0; x < settings.gridW; x++) {
      const p0 = iso(x, y, 0), p1 = iso(x + 1, y, 0), p2 = iso(x + 1, y + 1, 0), p3 = iso(x, y + 1, 0);
      const base = (x + y) % 2 === 0 ? '#33415a' : '#29344b';
      const lit = rgbToCss(litColor(hexToRgb(base), { x: x + 0.5, y: y + 0.5, z: 0 }, { x: 0, y: 0, z: 1 }));
      drawPoly([p0, p1, p2, p3], lit, 'rgba(255,255,255,.05)');
    }
  }
  const a = iso(0,0,0), b = iso(settings.gridW,0,0), c = iso(settings.gridW,settings.gridH,0), d = iso(0,settings.gridH,0);
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.lineTo(c.x,c.y); ctx.lineTo(d.x,d.y); ctx.closePath(); ctx.stroke();
}

function playerPlacementAABB() {
  return getPlayerProxyBox();
}

const PLAYER_VISUAL_BASE_HEIGHT = 1.7;
const PLAYER_SLICE_RATIOS = [0.00, 0.16, 0.32, 0.48, 0.64, 0.80, 0.96, 1.08, 1.18, 1.28, 1.38, 1.48, 1.58, 1.72].map(function(v){ return v / 1.72; });

function getPlayerVisualScale() {
  return Math.max(0.2, (settings.playerHeightCells / PLAYER_VISUAL_BASE_HEIGHT) * settings.tileScale);
}

function getPlayerSlices() {
  const totalH = Math.max(0.2, settings.playerHeightCells);
  const footprint = {
    x: player.x - Math.max(0.14, settings.playerProxyW * 0.44),
    y: player.y - Math.max(0.09, settings.playerProxyD * 0.42),
    w: Math.max(0.28, settings.playerProxyW * 0.88),
    d: Math.max(0.18, settings.playerProxyD * 0.86),
  };

  // 切得更细，尤其是头部区域切片更密，减少“半个头提前露出来”的穿模感。
  const zCuts = PLAYER_SLICE_RATIOS.map(function(r){ return totalH * r; });
  const out = [];
  for (let i = 0; i < zCuts.length - 1; i++) {
    out.push({ id: `playerSlice${i}`, x: footprint.x, y: footprint.y, z: zCuts[i], w: footprint.w, d: footprint.d, h: zCuts[i + 1] - zCuts[i] });
  }
  return out;
}

function currentAnimFrame() {
  if (!player.moving) return 0;
  return Math.floor(player.walk) % SPRITE.frames;
}

function getPlayerUnifiedLightCenter() {
  return {
    x: player.x,
    y: player.y,
    z: Math.max(0.55, settings.playerHeightCells * 0.52),
  };
}

function preparePlayerSpriteFrame() {
  if (!assetsReady) return null;

  var frame = currentAnimFrame();
  var row = SPRITE.rows[player.dir] ?? 0;
  var frameX = frame * SPRITE.frameW;
  var rowY = row * SPRITE.frameH;
  var foot = iso(player.x, player.y, 0);
  var spriteScale = getPlayerVisualScale();
  var scaledFrameW = Math.max(1, Math.round(SPRITE.frameW * spriteScale));
  var scaledFrameH = Math.max(1, Math.round(SPRITE.frameH * spriteScale));
  var xLeft = Math.round(foot.x - scaledFrameW / 2);
  var yTop = Math.round(foot.y - SPRITE.bottom * spriteScale);
  var visibleHeight = SPRITE.bottom - SPRITE.top;
  var totalH = Math.max(0.2, settings.playerHeightCells);

  var spriteLight = spriteLightAt(getPlayerUnifiedLightCenter());
  var brightness = spriteLight.brightness;
  var tint = spriteLight.tint;
  var weight = spriteLight.weight;
  var tintAlpha = clamp(weight * 0.18, 0, 0.35);

  var cacheKey = [
    frame,
    row,
    brightness.toFixed(3),
    tint.r.toFixed(1),
    tint.g.toFixed(1),
    tint.b.toFixed(1),
    tintAlpha.toFixed(3),
  ].join('|');

  var cacheHit = playerSpriteFrameCache.key === cacheKey;
  notePlayerSpriteCache(cacheHit, `frame=${frame} row=${row} brightness=${brightness.toFixed(3)} tintAlpha=${tintAlpha.toFixed(3)} moving=${player.moving}`);

  if (!cacheHit) {
    playerSpriteFrameBuffer.width = SPRITE.frameW;
    playerSpriteFrameBuffer.height = SPRITE.frameH;
    playerSpriteFrameCtx.clearRect(0, 0, SPRITE.frameW, SPRITE.frameH);

    playerSpriteFrameCtx.save();
    playerSpriteFrameCtx.filter = `brightness(${Math.round(brightness * 100)}%)`;
    playerSpriteFrameCtx.drawImage(spriteSheet, frameX, rowY, SPRITE.frameW, SPRITE.frameH, 0, 0, SPRITE.frameW, SPRITE.frameH);
    playerSpriteFrameCtx.restore();

    playerSpriteFrameCtx.save();
    playerSpriteFrameCtx.globalCompositeOperation = 'source-atop';
    playerSpriteFrameCtx.fillStyle = rgbToCss(tint, tintAlpha);
    playerSpriteFrameCtx.fillRect(0, 0, SPRITE.frameW, SPRITE.frameH);
    playerSpriteFrameCtx.restore();

    playerSpriteFrameCache.key = cacheKey;
    playerSpriteFrameCache.frame = frame;
    playerSpriteFrameCache.row = row;
    playerSpriteFrameCache.xLeft = xLeft;
    playerSpriteFrameCache.scaledFrameW = scaledFrameW;
    playerSpriteFrameCache.scaledFrameH = scaledFrameH;
    playerSpriteFrameCache.spriteScale = spriteScale;
    playerSpriteFrameCache.yTop = yTop;
    playerSpriteFrameCache.visibleHeight = visibleHeight;
    playerSpriteFrameCache.totalH = totalH;
    playerSpriteFrameCache.brightness = brightness;
    playerSpriteFrameCache.tint = tint;
    playerSpriteFrameCache.weight = weight;
  }

  playerSpriteFrameCache.xLeft = xLeft;
  playerSpriteFrameCache.yTop = yTop;
  playerSpriteFrameCache.scaledFrameW = scaledFrameW;
  playerSpriteFrameCache.scaledFrameH = scaledFrameH;
  playerSpriteFrameCache.spriteScale = spriteScale;
  playerSpriteFrameCache.visibleHeight = visibleHeight;
  playerSpriteFrameCache.totalH = totalH;

  return playerSpriteFrameCache;
}

function drawPlayerSlice(s) {
var prepared = preparePlayerSpriteFrame();
var totalH = prepared ? prepared.totalH : Math.max(0.2, settings.playerHeightCells);
var visibleHeight = prepared ? prepared.visibleHeight : (SPRITE.bottom - SPRITE.top);
var spriteScale = prepared ? prepared.spriteScale : getPlayerVisualScale();
var rowY = (prepared ? prepared.row : (SPRITE.rows[player.dir] ?? 0)) * SPRITE.frameH;
var z1 = s.z, z2 = s.z + s.h;
var srcY0 = rowY + Math.round(SPRITE.bottom - (z2 / totalH) * visibleHeight);
var srcY1 = rowY + Math.round(SPRITE.bottom - (z1 / totalH) * visibleHeight);
var srcH = Math.max(1, srcY1 - srcY0);
var localSrcY = srcY0 - rowY;
var destY = (prepared ? prepared.yTop : Math.round(iso(player.x, player.y, 0).y - SPRITE.bottom * spriteScale)) + Math.round(localSrcY * spriteScale);

if (assetsReady && prepared) {
  ctx.drawImage(playerSpriteFrameBuffer, 0, localSrcY, SPRITE.frameW, srcH, prepared.xLeft, destY, prepared.scaledFrameW, Math.max(1, Math.round(srcH * spriteScale)));
} else {
  var center = { x: s.x + s.w * 0.5, y: s.y + s.d * 0.5, z: s.z + s.h * 0.5 };
  const c = rgbToCss(litColor({ r: 106, g: 177, b: 255 }, center, { x: 0, y: 0, z: 1 }));
  const xLeft = prepared ? prepared.xLeft : Math.round(iso(player.x, player.y, 0).x - (SPRITE.frameW * spriteScale) / 2);
  ctx.fillStyle = c;
  ctx.fillRect(xLeft + Math.round(28 * spriteScale), destY, Math.max(2, Math.round(16 * spriteScale)), Math.max(1, Math.round(srcH * spriteScale)));
}

if (showDebug) {
  const pts = cubePoints(s.x, s.y, s.z, s.w, s.d, s.h);
  drawPoly([pts.p000,pts.p100,pts.p110,pts.p010], 'rgba(124,242,154,.05)', 'rgba(124,242,154,.85)');
}
}

function highestTopAtCell(cellX, cellY, ignoreId = null, ignoreInstanceId = null) {
  let top = 0;
  for (const b of boxes) {
    if (ignoreId != null && b.id === ignoreId) continue;
    if (ignoreInstanceId != null && b.instanceId === ignoreInstanceId) continue;
    if (cellX >= b.x && cellX < b.x + b.w && cellY >= b.y && cellY < b.y + b.d) top = Math.max(top, b.z + b.h);
  }
  return top;
}

function getDomainSceneCoreApi() {
  return (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.sceneCore) ? window.App.domain.sceneCore : null;
}

function getItemFacingCoreApi() {
  try {
    return (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.itemFacingCore)
      ? window.App.domain.itemFacingCore
      : (typeof window !== 'undefined' ? window.__ITEM_FACING_CORE__ || null : null);
  } catch (_) {
    return (typeof window !== 'undefined' ? window.__ITEM_FACING_CORE__ || null : null);
  }
}

function getRenderFaceOracleApi() {
  try {
    return (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.renderFaceOracleCore)
      ? window.App.domain.renderFaceOracleCore
      : (typeof window !== 'undefined' ? window.__RENDER_FACE_ORACLE_CORE__ || null : null);
  } catch (_) {
    return (typeof window !== 'undefined' ? window.__RENDER_FACE_ORACLE_CORE__ || null : null);
  }
}

function getRenderVisibilityCoreApi() {
  try {
    return (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.renderVisibilityCore)
      ? window.App.domain.renderVisibilityCore
      : (typeof window !== 'undefined' ? window.__RENDER_VISIBILITY_CORE__ || null : null);
  } catch (_) {
    return (typeof window !== 'undefined' ? window.__RENDER_VISIBILITY_CORE__ || null : null);
  }
}

function getEditorPreviewFacingValue() {
  return (((editor && typeof editor.previewFacing === 'number' ? editor.previewFacing : 0) % 4) + 4) % 4;
}

function normalizeMainEditorViewRotationValue(value) {
  var n = Number(value);
  if (!Number.isFinite(n)) return 0;
  n = n % 4;
  if (n < 0) n += 4;
  return n;
}

function readRuntimeMainEditorViewRotation() {
  try {
    var controller = window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (controller && typeof controller.getMainEditorVisualRotation === 'function') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(controller.getMainEditorVisualRotation('presentation.render.render')),
        source: 'app.controllers.main.getMainEditorVisualRotation'
      };
    }
    if (controller && typeof controller.getMainEditorViewRotation === 'function') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(controller.getMainEditorViewRotation('presentation.render.render')),
        source: 'app.controllers.main.getMainEditorViewRotation'
      };
    }
  } catch (_) {}
  try {
    var runtimeApi = window.App && window.App.state ? window.App.state.runtimeState || null : null;
    if (runtimeApi && runtimeApi.editor && typeof runtimeApi.editor.visualRotation === 'number') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(runtimeApi.editor.visualRotation),
        source: 'app.state.runtimeState.editor.visualRotation'
      };
    }
    if (runtimeApi && runtimeApi.editor && typeof runtimeApi.editor.rotation === 'number') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(runtimeApi.editor.rotation),
        source: 'app.state.runtimeState.editor.rotation'
      };
    }
  } catch (_) {}
  try {
    var runtimeNs = window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function' ? window.__APP_NAMESPACE.getPath('state.runtimeState') : null;
    if (runtimeNs && runtimeNs.editor && typeof runtimeNs.editor.visualRotation === 'number') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(runtimeNs.editor.visualRotation),
        source: 'namespace.state.runtimeState.editor.visualRotation'
      };
    }
    if (runtimeNs && runtimeNs.editor && typeof runtimeNs.editor.rotation === 'number') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(runtimeNs.editor.rotation),
        source: 'namespace.state.runtimeState.editor.rotation'
      };
    }
  } catch (_) {}
  return { hasViewRotation: false, viewRotation: 0, source: 'runtime-state-unavailable' };
}

function readLegacyMainEditorViewRotation() {
  return (typeof editor !== 'undefined' && editor && typeof editor.rotation === 'number') ? normalizeMainEditorViewRotationValue(editor.rotation) : null;
}

function getSafeMainEditorViewRotation(_snapshot) {
  var runtimeInfo = readRuntimeMainEditorViewRotation();
  if (runtimeInfo && runtimeInfo.hasViewRotation) {
    return {
      hasViewRotation: true,
      viewRotation: normalizeMainEditorViewRotationValue(runtimeInfo.viewRotation),
      fallbackUsed: false,
      source: runtimeInfo.source
    };
  }
  return {
    hasViewRotation: false,
    viewRotation: 0,
    fallbackUsed: true,
    source: 'runtime-state-unavailable'
  };
}

function isMainEditorViewAnimatingForRender() {
  try {
    var controller = window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (controller && typeof controller.isMainEditorViewRotating === 'function') return !!controller.isMainEditorViewRotating('presentation.render.render');
  } catch (_) {}
  try {
    var runtimeApi = window.App && window.App.state ? window.App.state.runtimeState || null : null;
    return !!(runtimeApi && runtimeApi.editor && runtimeApi.editor.isViewRotating);
  } catch (_) {}
  return false;
}

function logMainViewRotationVisualConsumerCheck(currentViewRotation) {
  if (!isMainEditorViewAnimatingForRender()) return;
  logItemRotationPrototype('main-view-rotation-visual-consumer-check', {
    visualRotationUsedByFloor: normalizeMainEditorViewRotationValue(currentViewRotation),
    visualRotationUsedByStaticVoxel: normalizeMainEditorViewRotationValue(currentViewRotation),
    visualRotationUsedBySemanticFaces: normalizeMainEditorViewRotationValue(currentViewRotation),
    visualRotationUsedByLights: normalizeMainEditorViewRotationValue(currentViewRotation),
    visualRotationUsedByShadows: normalizeMainEditorViewRotationValue(currentViewRotation),
    allConsumersAligned: true
  });
}

function logMainViewRotationRenderConsumerMode(currentViewRotation) {
  if (!isMainEditorViewAnimatingForRender()) return;
  logItemRotationPrototype('main-view-rotation-render-consumer-mode', {
    usesContinuousVisualRotation: true,
    usesDiscreteViewRotation: false,
    cacheByVisualRotation: true,
    cacheByDiscreteRotation: false,
    floorUsesContinuousVisualRotation: true,
    voxelUsesContinuousVisualRotation: true,
    lightUsesContinuousVisualRotation: true,
    shadowUsesContinuousVisualRotation: true,
    currentVisualRotation: normalizeMainEditorViewRotationValue(currentViewRotation)
  });
}


var __mainCameraScopeCache = { key: '', scope: null };
var __mainCameraScopeCountsCache = { key: '', counts: null };
var __terrainChunkRenderCache = { signature: '', chunks: new Map(), summary: null, dirtyChunkKeys: new Set(), totalChunkCount: 0 };
var __terrainRuntimeSummary = null;
var __lastTerrainCameraMoveState = { key: '', terrainBatchId: null };
var __lastRenderVisibilityStats = null;
var __lastSurfaceCacheStats = null;
var __visibilityCountSamplingEnabled = false;
var __lastRenderResourceSummary = null;
var __lastLoggingCostSummary = null;

function getMainEditorCameraSettingsForRender() {
  var defaults = {
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 2,
    cameraCullingEnabled: true,
    cullingMargin: 2,
    showCameraBounds: false,
    showCullingBounds: false,
    rotationAnimationEnabled: true,
    rotationAnimationMs: 160,
    rotationInterpolationEnabled: true,
    rotationInterpolationMode: 'easeInOut'
  };
  try {
    var controller = window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (controller && typeof controller.getMainEditorCameraSettings === 'function') {
      var settings = controller.getMainEditorCameraSettings('presentation.render.render');
      return Object.assign({}, defaults, settings || {});
    }
  } catch (_) {}
  try {
    var runtimeApi = window.App && window.App.state ? window.App.state.runtimeState || null : null;
    if (runtimeApi && typeof runtimeApi.getEditorCameraSettingsValue === 'function') {
      return Object.assign({}, defaults, runtimeApi.getEditorCameraSettingsValue() || {});
    }
  } catch (_) {}
  return defaults;
}

function getMainEditorZoomValueForRender() {
  var settings = getMainEditorCameraSettingsForRender();
  var minZoom = Math.max(0.05, Number(settings.minZoom) || 0.5);
  var maxZoom = Math.max(minZoom, Number(settings.maxZoom) || 2);
  var zoom = Number(settings.zoom);
  if (!Number.isFinite(zoom)) zoom = 1;
  return Math.max(minZoom, Math.min(maxZoom, zoom));
}

function isMainEditorCameraCullingEnabledForRender() {
  return getMainEditorCameraSettingsForRender().cameraCullingEnabled !== false;
}

function getMainEditorCullingMarginForRender() {
  return Math.max(0, Number(getMainEditorCameraSettingsForRender().cullingMargin) || 0);
}


function getTerrainRuntimeModelForRender() {
  try {
    var runtimeApi = window.App && window.App.state ? window.App.state.runtimeState || null : null;
    if (runtimeApi && typeof runtimeApi.getTerrainRuntimeModelValue === 'function') {
      var terrain = runtimeApi.getTerrainRuntimeModelValue();
      if (terrain && Array.isArray(terrain.heightMap) && terrain.width > 0 && terrain.height > 0) return terrain;
    }
  } catch (_) {}
  return null;
}

function getTerrainRenderSettingsForRender() {
  var defaults = { terrainDebugFaceColorsEnabled: false, terrainColorMode: 'natural' };
  try {
    var controller = window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (controller && typeof controller.getMainEditorTerrainSettings === 'function') {
      var settings = controller.getMainEditorTerrainSettings('presentation.render.render:terrain-settings');
      if (settings) return Object.assign({}, defaults, settings || {});
    }
  } catch (_) {}
  try {
    var runtimeApi = window.App && window.App.state ? window.App.state.runtimeState || null : null;
    if (runtimeApi && typeof runtimeApi.getTerrainGeneratorSettingsValue === 'function') {
      return Object.assign({}, defaults, runtimeApi.getTerrainGeneratorSettingsValue() || {});
    }
  } catch (_) {}
  return defaults;
}

function getTerrainSemanticDebugPalette() {
  var facingApi = getItemFacingCoreApi();
  if (facingApi && typeof facingApi.getDefaultSemanticTextureMap === 'function') {
    try {
      var map = facingApi.getDefaultSemanticTextureMap() || {};
      return {
        top: (map.top && map.top.color) || '#2F80ED',
        north: (map.north && map.north.color) || '#E74C3C',
        east: (map.east && map.east.color) || '#27AE60',
        south: (map.south && map.south.color) || '#F2C94C',
        west: (map.west && map.west.color) || '#9B51E0'
      };
    } catch (_) {}
  }
  return { top: '#2F80ED', north: '#E74C3C', east: '#27AE60', south: '#F2C94C', west: '#9B51E0' };
}

function getTerrainColorModeForRender() {
  var settings = getTerrainRenderSettingsForRender();
  return settings.terrainDebugFaceColorsEnabled === true ? 'debug-semantic' : String(settings.terrainColorMode || 'natural');
}


function terrainModelHasData(model) {
  return !!(model && Array.isArray(model.heightMap) && Number(model.width) > 0 && Number(model.height) > 0);
}

function getTerrainColumnHeightForRender(model, x, y) {
  if (!terrainModelHasData(model)) return 0;
  var xi = Math.round(Number(x) || 0);
  var yi = Math.round(Number(y) || 0);
  var col = Array.isArray(model.heightMap[xi]) ? model.heightMap[xi] : null;
  return Math.max(0, Math.round(Number(col && col[yi]) || 0));
}

function getTerrainExistingHeightForRender(model, x, y) {
  if (!terrainModelHasData(model)) return 0;
  var xi = Math.round(Number(x) || 0);
  var yi = Math.round(Number(y) || 0);
  var col = Array.isArray(model.existingHeightMap && model.existingHeightMap[xi]) ? model.existingHeightMap[xi] : null;
  return Math.max(0, Math.round(Number(col && col[yi]) || 0));
}

function getTerrainMergedHeightForRender(model, x, y) {
  return Math.max(getTerrainColumnHeightForRender(model, x, y), getTerrainExistingHeightForRender(model, x, y));
}

function getTerrainChunkSizeForRender(model) {
  return Math.max(1, Math.round(Number(model && model.chunkSize) || 16));
}

function getTerrainChunkKey(cx, cy) {
  return String(cx) + ',' + String(cy);
}

function getTerrainChunkBounds(model, chunkX, chunkY) {
  var chunkSize = getTerrainChunkSizeForRender(model);
  var minX = chunkX * chunkSize;
  var minY = chunkY * chunkSize;
  return {
    minX: minX,
    minY: minY,
    maxX: Math.min(Number(model.width) || 0, minX + chunkSize),
    maxY: Math.min(Number(model.height) || 0, minY + chunkSize)
  };
}

function getTerrainChunkCacheSignature(model) {
  var settings = getMainEditorCameraSettingsForRender();
  return JSON.stringify({
    terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null,
    width: model && model.width || 0,
    height: model && model.height || 0,
    chunkSize: getTerrainChunkSizeForRender(model),
    cacheVersion: model && model.terrainChunkCacheVersion || 0,
    surfaceOnlyRenderingEnabled: settings && settings.surfaceOnlyRenderingEnabled !== false
  });
}

function getVisibleTerrainChunkCoordsForScope(model, scope) {
  var bounds = scope && scope.cullingWorldBounds ? scope.cullingWorldBounds : null;
  var chunkSize = getTerrainChunkSizeForRender(model);
  var width = Math.max(0, Math.round(Number(model && model.width) || 0));
  var height = Math.max(0, Math.round(Number(model && model.height) || 0));
  if (!(width > 0 && height > 0)) return [];
  var minX = 0, minY = 0, maxX = width, maxY = height;
  if (bounds) {
    minX = Math.max(0, Math.floor(Number(bounds.minX) || 0));
    minY = Math.max(0, Math.floor(Number(bounds.minY) || 0));
    maxX = Math.min(width, Math.ceil(Number(bounds.maxX) || width));
    maxY = Math.min(height, Math.ceil(Number(bounds.maxY) || height));
  }
  var minChunkX = Math.max(0, Math.floor(minX / chunkSize));
  var minChunkY = Math.max(0, Math.floor(minY / chunkSize));
  var maxChunkX = Math.max(minChunkX, Math.ceil(maxX / chunkSize) - 1);
  var maxChunkY = Math.max(minChunkY, Math.ceil(maxY / chunkSize) - 1);
  var out = [];
  for (var cx = minChunkX; cx <= maxChunkX; cx++) {
    for (var cy = minChunkY; cy <= maxChunkY; cy++) {
      out.push({ chunkX: cx, chunkY: cy, key: getTerrainChunkKey(cx, cy), bounds: getTerrainChunkBounds(model, cx, cy) });
    }
  }
  return out;
}

function addTerrainOwnedOccupancyToSet(occupancy, model, scope) {
  if (!terrainModelHasData(model) || !occupancy || typeof occupancy.add !== 'function') return occupancy;
  var chunkCoords = getVisibleTerrainChunkCoordsForScope(model, scope || null);
  for (var i = 0; i < chunkCoords.length; i++) {
    var bounds = chunkCoords[i] && chunkCoords[i].bounds ? chunkCoords[i].bounds : null;
    if (!bounds) continue;
    for (var x = bounds.minX; x < bounds.maxX; x++) {
      for (var y = bounds.minY; y < bounds.maxY; y++) {
        var target = getTerrainColumnHeightForRender(model, x, y);
        var existing = getTerrainExistingHeightForRender(model, x, y);
        for (var z = existing; z < target; z++) occupancy.add(String(x) + ',' + String(y) + ',' + String(z));
      }
    }
  }
  return occupancy;
}

function invalidateTerrainChunkRenderCacheForModel(model) {
  var signature = getTerrainChunkCacheSignature(model);
  if (__terrainChunkRenderCache.signature !== signature) {
    __terrainChunkRenderCache = { signature: signature, chunks: new Map(), summary: null, dirtyChunkKeys: new Set(), totalChunkCount: 0 };
    return true;
  }
  return false;
}

function buildTerrainChunkSurfaceSources(model, chunkX, chunkY, scope) {
  var visibilityCore = getRenderVisibilityCoreApi();
  var chunkSize = getTerrainChunkSizeForRender(model);
  var chunkStats = visibilityCore && typeof visibilityCore.buildVisibleSurfaceCacheForTerrainChunk === 'function'
    ? visibilityCore.buildVisibleSurfaceCacheForTerrainChunk(model, chunkX, chunkY, { chunkSize: chunkSize, surfaceOnlyRenderingEnabled: scope && scope.surfaceOnlyRenderingEnabled !== false })
    : { chunkKey: getTerrainChunkKey(chunkX, chunkY), chunkX: chunkX, chunkY: chunkY, bounds: getTerrainChunkBounds(model, chunkX, chunkY), columns: [], visibleColumnCount: 0, logicalVoxelCountEstimated: 0, visibleTopFaceCount: 0, visibleSideFaceCount: 0, internalVoxelSkippedCount: 0, hiddenInternalSurfaceSkippedCount: 0, surfaceOnlyRenderingEnabled: true };
  var columns = Array.isArray(chunkStats.columns) ? chunkStats.columns : [];
  var faceSources = [];
  for (var c = 0; c < columns.length; c++) {
    var column = columns[c];
    var faces = Array.isArray(column && column.faces) ? column.faces : [];
    for (var i = 0; i < faces.length; i++) {
      var face = faces[i];
      var worldPts = buildTerrainFaceWorldPolygon(column.x, column.y, face.semanticFace, face.zStart, face.zEnd);
      if (!Array.isArray(worldPts) || worldPts.length < 3) continue;
      faceSources.push({
        x: Number(column.x || 0),
        y: Number(column.y || 0),
        height: Number(column.height || 0),
        semanticFace: face.semanticFace,
        zStart: Number(face.zStart || 0),
        zEnd: Number(face.zEnd || 0),
        layerZ: Number(face.layerZ != null ? face.layerZ : Math.max(0, Number(face.zEnd || 1) - 1)),
        unit: face.unit !== false,
        worldPts: worldPts
      });
    }
  }
  return {
    key: chunkStats.chunkKey || getTerrainChunkKey(chunkX, chunkY),
    chunkX: chunkX,
    chunkY: chunkY,
    bounds: chunkStats.bounds || getTerrainChunkBounds(model, chunkX, chunkY),
    columns: columns,
    faceSources: faceSources,
    visibleColumnCount: Number(chunkStats.visibleColumnCount || 0),
    logicalVoxelCountEstimated: Number(chunkStats.logicalVoxelCountEstimated || 0),
    visibleTopFaceCount: Number(chunkStats.visibleTopFaceCount || 0),
    visibleSideFaceCount: Number(chunkStats.visibleSideFaceCount || 0),
    internalVoxelSkippedCount: Number(chunkStats.internalVoxelSkippedCount || 0),
    hiddenInternalSurfaceSkippedCount: Number(chunkStats.hiddenInternalSurfaceSkippedCount || 0),
    surfaceOnlyRenderingEnabled: chunkStats.surfaceOnlyRenderingEnabled !== false,
    builtAt: perfNow(),
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    geometryPacketsByViewRotation: Object.create(null)
  };
}

function getTerrainChunkSurfaceSources(model, chunkCoord, scope) {
  var key = chunkCoord && chunkCoord.key ? chunkCoord.key : getTerrainChunkKey(chunkCoord && chunkCoord.chunkX || 0, chunkCoord && chunkCoord.chunkY || 0);
  var modelDirty = model && Array.isArray(model.dirtyChunkKeys) ? model.dirtyChunkKeys.indexOf(key) >= 0 : false;
  if (__terrainChunkRenderCache.chunks.has(key) && !__terrainChunkRenderCache.dirtyChunkKeys.has(key) && !modelDirty) {
    return { entry: __terrainChunkRenderCache.chunks.get(key), cacheHit: true, rebuilt: false };
  }
  var entry = buildTerrainChunkSurfaceSources(model, chunkCoord.chunkX, chunkCoord.chunkY, scope);
  __terrainChunkRenderCache.chunks.set(key, entry);
  __terrainChunkRenderCache.dirtyChunkKeys.delete(key);
  return { entry: entry, cacheHit: false, rebuilt: true };
}

function getInstanceWorldBoundsForRender(inst) {
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.getRenderSourceWorldBounds === 'function') {
    var proxy = getInstanceProxyBounds(inst);
    if (proxy) return { minX: proxy.minX, minY: proxy.minY, maxX: proxy.maxX, maxY: proxy.maxY };
  }
  return getInstanceProxyBounds(inst);
}

function filterInstancesForMainCameraScope(inputInstances, scope) {
  var list = Array.isArray(inputInstances) ? inputInstances : [];
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.filterByCameraScope === 'function') {
    return visibilityCore.filterByCameraScope(list, scope, getInstanceWorldBoundsForRender);
  }
  if (!scope || scope.cameraCullingEnabled === false) return list.slice();
  return list.filter(function (inst) {
    var bounds = getInstanceWorldBoundsForRender(inst);
    return !bounds || worldBoundsIntersectXY(bounds, scope.cullingWorldBounds);
  });
}


function buildTerrainFaceWorldPolygon(x, y, semanticFace, zStart, zEnd) {
  var bottom = Math.max(0, Number(zStart) || 0);
  var top = Math.max(bottom, Number(zEnd) || 0);
  if (semanticFace === 'top') return [{ x:x, y:y, z:top }, { x:x+1, y:y, z:top }, { x:x+1, y:y+1, z:top }, { x:x, y:y+1, z:top }];
  if (semanticFace === 'east') return [{ x:x+1, y:y, z:bottom }, { x:x+1, y:y+1, z:bottom }, { x:x+1, y:y+1, z:top }, { x:x+1, y:y, z:top }];
  if (semanticFace === 'south') return [{ x:x, y:y+1, z:bottom }, { x:x+1, y:y+1, z:bottom }, { x:x+1, y:y+1, z:top }, { x:x, y:y+1, z:top }];
  if (semanticFace === 'west') return [{ x:x, y:y, z:top }, { x:x, y:y+1, z:top }, { x:x, y:y+1, z:bottom }, { x:x, y:y, z:bottom }];
  if (semanticFace === 'north') return [{ x:x, y:y, z:top }, { x:x+1, y:y, z:top }, { x:x+1, y:y, z:bottom }, { x:x, y:y, z:bottom }];
  return [];
}

function getTerrainBaseFaceColorsForRender(model, x, y) {
  var params = model && model.params ? model.params : null;
  var waterLevel = params ? Math.round(Number(params.waterLevel) || 0) : 0;
  var h = getTerrainColumnHeightForRender(model, x, y);
  var base = h <= waterLevel ? '#4f8cff' : (h > 10 ? '#b39b6b' : '#79b35a');
  return baseFaceColors(base);
}

function getTerrainFaceAppearanceForRender(model, x, y, faceDesc) {
  var colorMode = getTerrainColorModeForRender();
  var semanticFace = faceDesc && faceDesc.semanticFace ? String(faceDesc.semanticFace) : 'top';
  var facingApi = getItemFacingCoreApi();
  if (colorMode === 'debug-semantic') {
    var textureMap = facingApi && typeof facingApi.getDefaultSemanticTextureMap === 'function'
      ? facingApi.getDefaultSemanticTextureMap()
      : null;
    var slot = textureMap && textureMap[semanticFace] ? textureMap[semanticFace] : null;
    var raw = slot && slot.color ? slot.color : (getTerrainSemanticDebugPalette()[semanticFace] || '#ffffff');
    return {
      colorMode: 'debug-semantic',
      paletteSource: 'item-facing-core.defaultSemanticTextureMap',
      manualBlockPaletteSource: 'item-facing-core.defaultSemanticTextureMap',
      paletteExactlyShared: true,
      paletteUsed: textureMap || null,
      semanticTextureSlot: slot,
      fill: raw,
      stroke: 'rgba(0,0,0,0.18)',
      usesSemanticTextures: !!slot,
      usesSemanticFaceColors: false
    };
  }
  var fc = getTerrainBaseFaceColorsForRender(model, x, y);
  var fillRgb = semanticFace === 'top' ? fc.top : (semanticFace === 'east' ? fc.east : (semanticFace === 'south' ? fc.south : (semanticFace === 'west' ? fc.east : fc.south)));
  return {
    colorMode: 'natural',
    paletteSource: 'terrain-base-face-colors',
    paletteUsed: null,
    semanticTextureSlot: null,
    fillRgb: fillRgb,
    stroke: fc.line,
    usesSemanticTextures: false,
    usesSemanticFaceColors: false
  };
}

function getMainViewProjectionConfigWithoutCamera() {
  if (typeof getMainViewProjectionConfig === 'function') {
    var cfg = getMainViewProjectionConfig();
    if (cfg && typeof cfg === 'object') {
      return Object.assign({}, cfg, { cameraX: 0, cameraY: 0 });
    }
  }
  return {
    tileW: settings.tileW,
    tileH: settings.tileH,
    originX: settings.originX,
    originY: settings.originY,
    cameraX: 0,
    cameraY: 0,
    worldBoundsOrOrigin: { cols: settings.gridW || settings.worldCols, rows: settings.gridH || settings.worldRows }
  };
}

function screenPointsFromWorldFaceNoCamera(worldPts, viewRotation) {
  var pts = Array.isArray(worldPts) ? worldPts : [];
  var cfg = getMainViewProjectionConfigWithoutCamera();
  var api = getMainViewRotationCoreApi();
  return pts.map(function (p) {
    if (api && typeof api.worldToScreenWithViewRotation === 'function') {
      var out = api.worldToScreenWithViewRotation({ x: p.x, y: p.y, z: p.z }, viewRotation, cfg);
      return { x: out.x, y: out.y };
    }
    return {
      x: cfg.originX + (p.x - p.y) * cfg.tileW / 2,
      y: cfg.originY + (p.x + p.y) * cfg.tileH / 2 - p.z * cfg.tileH
    };
  });
}

function getTerrainScreenFaceLookup(viewRotation) {
  var mapping = getVisibleSemanticMappingForRender(0, viewRotation);
  var visibleByScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : { top: 'top', lowerLeft: 'south', lowerRight: 'east' };
  return {
    top: 'top',
    east: visibleByScreen.lowerRight === 'east' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'east' ? 'lowerLeft' : null),
    south: visibleByScreen.lowerRight === 'south' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'south' ? 'lowerLeft' : null),
    west: visibleByScreen.lowerRight === 'west' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'west' ? 'lowerLeft' : null),
    north: visibleByScreen.lowerRight === 'north' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'north' ? 'lowerLeft' : null)
  };
}

function buildTerrainGeometryPacket(faceSource, viewRotation) {
  if (!faceSource || !Array.isArray(faceSource.worldPts) || !faceSource.worldPts.length) return null;
  var lookup = getTerrainScreenFaceLookup(viewRotation);
  var screenFace = faceSource.semanticFace === 'top' ? 'top' : lookup[faceSource.semanticFace];
  if (!screenFace) return null;
  var pointsNoCamera = screenPointsFromWorldFaceNoCamera(faceSource.worldPts, viewRotation);
  var cellZ = Math.max(0, Number(faceSource.layerZ != null ? faceSource.layerZ : (Number(faceSource.zEnd || 1) - 1)) || 0);
  var orderMeta = computeViewAwareSortMeta({ x: faceSource.x, y: faceSource.y, z: cellZ }, 1, viewRotation);
  var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
  return {
    x: Number(faceSource.x || 0),
    y: Number(faceSource.y || 0),
    semanticFace: faceSource.semanticFace,
    screenFace: screenFace,
    zStart: Number(faceSource.zStart || 0),
    zEnd: Number(faceSource.zEnd || 0),
    layerZ: cellZ,
    worldPts: faceSource.worldPts,
    pointsNoCamera: pointsNoCamera,
    sortKey: Number(orderMeta.sortKey || 0),
    tie: Number(orderMeta.tie || 0) + ((faceTiePrio[screenFace] || 0) * 0.01)
  };
}

function getTerrainChunkGeometryPackets(entry, viewRotation) {
  if (!entry) return [];
  var key = String(normalizeMainEditorViewRotationValue(viewRotation));
  entry.geometryPacketsByViewRotation = entry.geometryPacketsByViewRotation || Object.create(null);
  if (entry.geometryPacketsByViewRotation[key]) return entry.geometryPacketsByViewRotation[key];
  var faceSources = Array.isArray(entry.faceSources) ? entry.faceSources : [];
  var packets = [];
  for (var i = 0; i < faceSources.length; i++) {
    var packet = buildTerrainGeometryPacket(faceSources[i], viewRotation);
    if (packet) packets.push(packet);
  }
  entry.geometryPacketsByViewRotation[key] = packets;
  return packets;
}

function drawTerrainFaceBatchRenderable(item) {
  if (!item || !Array.isArray(item.faces) || !item.faces.length) return;
  var cam = (typeof runtimeState !== 'undefined' && runtimeState && runtimeState.camera) ? runtimeState.camera : { x: 0, y: 0 };
  ctx.save();
  ctx.translate(Number(cam.x || 0), Number(cam.y || 0));
  for (var i = 0; i < item.faces.length; i++) {
    var face = item.faces[i];
    drawPoly(face.pointsNoCamera || [], face.fill, face.stroke, face.width || 1);
  }
  ctx.restore();
}

function buildTerrainChunkBatchedRenderables(entry, model, viewRotation) {
  var packets = getTerrainChunkGeometryPackets(entry, viewRotation);
  var batchMap = new Map();
  for (var i = 0; i < packets.length; i++) {
    var packet = packets[i];
    var appearance = getTerrainFaceAppearanceForRender(model, packet.x, packet.y, packet);
    var fill = appearance.colorMode === 'debug-semantic' ? appearance.fill : rgbToCss(litFaceColor(appearance.fillRgb, packet.worldPts, getSemanticFaceNormal(packet.semanticFace), null));
    var stroke = appearance.stroke;
    var batchKey = [packet.sortKey.toFixed(3), packet.tie.toFixed(3), packet.screenFace, fill, stroke].join('|');
    if (!batchMap.has(batchKey)) {
      batchMap.set(batchKey, {
        sortKey: packet.sortKey,
        tie: packet.tie,
        screenFace: packet.screenFace,
        semanticFace: packet.semanticFace,
        fill: fill,
        stroke: stroke,
        texture: appearance.semanticTextureSlot || null,
        textureColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
        semanticTextureSlot: appearance.semanticTextureSlot || null,
        semanticTextureSlotColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
        colorMode: appearance.colorMode,
        paletteUsed: appearance.paletteUsed || null,
        faces: []
      });
    }
    batchMap.get(batchKey).faces.push({
      pointsNoCamera: packet.pointsNoCamera,
      fill: fill,
      stroke: stroke,
      width: 1,
      worldPts: packet.worldPts,
      x: packet.x,
      y: packet.y,
      semanticFace: packet.semanticFace,
      screenFace: packet.screenFace,
      zStart: packet.zStart,
      zEnd: packet.zEnd,
      layerZ: packet.layerZ
    });
  }
  var out = [];
  batchMap.forEach(function (batch, batchKey) {
    var first = batch.faces[0] || null;
    var centroid = first ? averageScreenPoint((first.pointsNoCamera || []).map(function (pt) {
      var cam = (typeof runtimeState !== 'undefined' && runtimeState && runtimeState.camera) ? runtimeState.camera : { x: 0, y: 0 };
      return { x: pt.x + Number(cam.x || 0), y: pt.y + Number(cam.y || 0) };
    })) : { x: 0, y: 0 };
    out.push({
      id: 'terrain-batch-' + String(entry.key || 'chunk') + '-' + batchKey,
      kind: 'voxel-face-batch',
      sortKey: batch.sortKey,
      tie: batch.tie,
      instanceId: null,
      prefabId: 'terrain-column',
      generatedBy: 'terrain-generator',
      terrainBatchId: model && model.activeTerrainBatchId || null,
      renderPath: 'terrain-voxel-face-batch',
      cacheViewRotation: viewRotation,
      drawScreenPosition: { x: Math.round(centroid.x || 0), y: Math.round(centroid.y || 0) },
      screenFace: batch.screenFace,
      semanticFace: batch.semanticFace,
      fill: batch.fill,
      stroke: batch.stroke,
      texture: batch.texture,
      textureColor: batch.textureColor,
      semanticTextureSlot: batch.semanticTextureSlot,
      semanticTextureSlotColor: batch.semanticTextureSlotColor,
      terrainColorMode: batch.colorMode,
      terrainDebugPalette: batch.paletteUsed || null,
      terrainUsesOriginalVoxelFacePipeline: true,
      terrainUsesCustomColumnSurfacePipeline: false,
      terrainBatchDraw: true,
      chunkKey: entry.key || null,
      worldBounds: entry.bounds || null,
      faces: batch.faces,
      draw: function () { drawTerrainFaceBatchRenderable(this); }
    });
  });
  return out;
}

function buildTerrainFaceRenderableItem(x, y, faceDesc, viewRotation, model) {
  if (!faceDesc) return null;
  var worldPts = Array.isArray(faceDesc.worldPts) && faceDesc.worldPts.length ? faceDesc.worldPts : buildTerrainFaceWorldPolygon(x, y, faceDesc.semanticFace, faceDesc.zStart, faceDesc.zEnd);
  if (!worldPts.length) return null;
  var screenPts = screenPointsFromWorldFace(worldPts);
  var normal = getSemanticFaceNormal(faceDesc.semanticFace);
  var appearance = getTerrainFaceAppearanceForRender(model, x, y, faceDesc);
  var litFill = appearance.colorMode === 'debug-semantic' ? appearance.fill : rgbToCss(litFaceColor(appearance.fillRgb, worldPts, normal, null));
  var stroke = appearance.stroke;
  var centroid = averageScreenPoint(screenPts);
  var cellZ = Math.max(0, Number(faceDesc.layerZ != null ? faceDesc.layerZ : (faceDesc.zEnd - 1)) || 0);
  var orderMeta = computeViewAwareSortMeta({ x:x, y:y, z: cellZ }, 1, viewRotation);
  var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
  var item = {
    id: 'terrain-face-' + [model && model.activeTerrainBatchId || 'terrain', x, y, faceDesc.semanticFace, faceDesc.zStart, faceDesc.zEnd].join('-'),
    kind: 'voxel-face',
    sortKey: Number(orderMeta.sortKey || 0),
    tie: Number(orderMeta.tie || 0) + ((faceTiePrio[faceDesc.screenFace] || 0) * 0.01),
    instanceId: null,
    prefabId: 'terrain-column',
    generatedBy: 'terrain-generator',
    terrainBatchId: model && model.activeTerrainBatchId || null,
    terrainCellX: x,
    terrainCellY: y,
    renderPath: 'terrain-voxel-face',
    cacheViewRotation: viewRotation,
    drawScreenPosition: { x: Math.round(centroid.x || 0), y: Math.round(centroid.y || 0) },
    semanticFace: faceDesc.semanticFace,
    screenFace: faceDesc.screenFace,
    depthKey: faceDesc.depthKey != null ? faceDesc.depthKey : 0,
    points: screenPts,
    fill: litFill,
    stroke: stroke,
    texture: appearance.semanticTextureSlot || null,
    textureColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
    semanticTextureSlot: appearance.semanticTextureSlot || null,
    semanticTextureSlotColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
    width: 1,
    shadowOverlays: xrayFaces ? [] : buildVoxelFaceShadowOverlays(worldPts, normal, null),
    worldPts: worldPts,
    worldBounds: { minX: x, minY: y, maxX: x + 1, maxY: y + 1 },
    cellX: x,
    cellY: y,
    cellZ: cellZ,
    faceKey: ['terrain', x, y, faceDesc.semanticFace, cellZ].join('|'),
    terrainColorMode: appearance.colorMode,
    terrainDebugPalette: appearance.paletteUsed || null,
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    draw: function () { drawCachedVoxelFaceRenderable(this); }
  };
  return item;
}

function buildTerrainColumnRenderablesForScope(columnEntry, model, viewRotation) {
  var x = Number(columnEntry && columnEntry.x || 0);
  var y = Number(columnEntry && columnEntry.y || 0);
  var faces = Array.isArray(columnEntry && columnEntry.faces) ? columnEntry.faces : [];
  var mapping = getVisibleSemanticMappingForRender(0, viewRotation);
  var visibleByScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : { top:'top', lowerLeft:'south', lowerRight:'east' };
  var screenFaceBySemantic = {
    top: 'top',
    east: visibleByScreen.lowerRight === 'east' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'east' ? 'lowerLeft' : null),
    south: visibleByScreen.lowerRight === 'south' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'south' ? 'lowerLeft' : null),
    west: visibleByScreen.lowerRight === 'west' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'west' ? 'lowerLeft' : null),
    north: visibleByScreen.lowerRight === 'north' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'north' ? 'lowerLeft' : null)
  };
  var out = [];
  for (var i = 0; i < faces.length; i++) {
    var face = faces[i];
    var screenFace = face.semanticFace === 'top' ? 'top' : screenFaceBySemantic[face.semanticFace];
    if (!screenFace) continue;
    var renderable = buildTerrainFaceRenderableItem(x, y, {
      semanticFace: face.semanticFace,
      zStart: face.zStart,
      zEnd: face.zEnd,
      layerZ: face.layerZ,
      unit: face.unit !== false,
      worldPts: face.worldPts,
      screenFace: screenFace,
      depthKey: face.semanticFace === 'top' ? 3 : (screenFace === 'lowerLeft' ? 2 : 1)
    }, viewRotation, model);
    if (renderable) out.push(renderable);
  }
  return out;
}

function buildScopedTerrainRenderables(model, scope, viewRotation) {
  if (!terrainModelHasData(model)) {
    return { renderables: [], stats: { terrainCellCount: 0, terrainColumnCount: 0, terrainExpandedVoxelInstanceCount: 0, terrainUsesColumnModel: false, visibleColumnCount: 0, visibleChunkCount: 0, culledColumnCount: 0, culledChunkCount: 0, terrainBuildWasScoped: true, logicalVoxelCountEstimated: 0, visibleTopFaceCount: 0, visibleSideFaceCount: 0, internalVoxelSkippedCount: 0, hiddenInternalSurfaceSkippedCount: 0, renderableCount: 0, buildMode: 'cached' } };
  }
  var buildStart = perfNow();
  var cacheReset = invalidateTerrainChunkRenderCacheForModel(model);
  var chunkCoords = getVisibleTerrainChunkCoordsForScope(model, scope);
  var renderables = [];
  if (cacheReset) {
    var prewarmChunkSize = getTerrainChunkSizeForRender(model);
    var maxChunkX = Math.max(0, Math.ceil((Number(model.width) || 0) / prewarmChunkSize));
    var maxChunkY = Math.max(0, Math.ceil((Number(model.height) || 0) / prewarmChunkSize));
    for (var pcx = 0; pcx < maxChunkX; pcx++) {
      for (var pcy = 0; pcy < maxChunkY; pcy++) {
        getTerrainChunkSurfaceSources(model, { chunkX: pcx, chunkY: pcy, key: getTerrainChunkKey(pcx, pcy) }, scope);
      }
    }
  }
  var visibleColumnCount = 0;
  var visibleTopFaceCount = 0;
  var visibleSideFaceCount = 0;
  var internalVoxelSkippedCount = 0;
  var hiddenInternalSurfaceSkippedCount = 0;
  var visibleChunkCount = chunkCoords.length;
  var rebuiltChunkCount = 0;
  var cacheHitCount = 0;
  var cacheMissCount = 0;
  var totalChunks = Math.max(0, Math.ceil((Number(model.width) || 0) / getTerrainChunkSizeForRender(model)) * Math.ceil((Number(model.height) || 0) / getTerrainChunkSizeForRender(model)));
  for (var i = 0; i < chunkCoords.length; i++) {
    var chunkResult = getTerrainChunkSurfaceSources(model, chunkCoords[i], scope);
    var entry = chunkResult.entry;
    if (chunkResult.cacheHit) cacheHitCount += 1;
    else cacheMissCount += 1;
    if (chunkResult.rebuilt) rebuiltChunkCount += 1;
    visibleColumnCount += Number(entry && entry.visibleColumnCount || 0);
    visibleTopFaceCount += Number(entry && entry.visibleTopFaceCount || 0);
    visibleSideFaceCount += Number(entry && entry.visibleSideFaceCount || 0);
    internalVoxelSkippedCount += Number(entry && entry.internalVoxelSkippedCount || 0);
    hiddenInternalSurfaceSkippedCount += Number(entry && entry.hiddenInternalSurfaceSkippedCount || 0);
    var batched = buildTerrainChunkBatchedRenderables(entry, model, viewRotation);
    for (var j = 0; j < batched.length; j++) renderables.push(batched[j]);
  }
  var generatedCellCount = model && model.lastSummary ? Number(model.lastSummary.generatedCellCount || 0) : 0;
  var generatedVoxelCount = model && model.lastSummary ? Number(model.lastSummary.generatedVoxelCount || 0) : 0;
  var terrainOwnedDeltaBlockCount = model ? Number(model.terrainOwnedDeltaBlockCount || 0) : 0;
  var existingManualBlockCount = model ? Number(model.existingManualBlockCount || 0) : 0;
  var overlappingColumnCount = model ? Number(model.overlappingColumnCount || 0) : 0;
  var colorMode = getTerrainColorModeForRender();
  var mapping = getVisibleSemanticMappingForRender(0, viewRotation);
  var byScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : { top: 'top', lowerLeft: 'south', lowerRight: 'east' };
  var palette = getTerrainSemanticDebugPalette();
  var terrainFaceColorSummary = {
    terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null,
    colorMode: colorMode,
    terrainDebugFaceColorsEnabled: colorMode === 'debug-semantic',
    terrainPaletteSource: colorMode === 'debug-semantic' ? 'item-facing-core.defaultSemanticTextureMap' : 'terrain-base-face-colors',
    manualBlockPaletteSource: 'item-facing-core.defaultSemanticTextureMap',
    paletteExactlyShared: colorMode === 'debug-semantic',
    usesSemanticFaceColors: false,
    usesSemanticTextures: colorMode === 'debug-semantic',
    topColor: colorMode === 'debug-semantic' ? palette[byScreen.top || 'top'] || palette.top : getTerrainBaseFaceColorsForRender(model, 0, 0).top,
    lowerLeftColor: colorMode === 'debug-semantic' ? palette[byScreen.lowerLeft || 'south'] || palette.south : getTerrainBaseFaceColorsForRender(model, 0, 0).south,
    lowerRightColor: colorMode === 'debug-semantic' ? palette[byScreen.lowerRight || 'east'] || palette.east : getTerrainBaseFaceColorsForRender(model, 0, 0).east,
    semanticFacePaletteUsed: colorMode === 'debug-semantic'
  };
  logItemRotationPrototype('terrain-face-color-summary', terrainFaceColorSummary);
  logItemRotationPrototype('terrain-face-color-mode-summary', terrainFaceColorSummary);
  logItemRotationPrototype('terrain-render-palette-check', terrainFaceColorSummary);
  var camera = (typeof runtimeState !== 'undefined' && runtimeState && runtimeState.camera) ? runtimeState.camera : { x: 0, y: 0 };
  var cameraMoveKey = JSON.stringify({ batch: model && model.activeTerrainBatchId || null, x: Number(camera.x || 0).toFixed(2), y: Number(camera.y || 0).toFixed(2), zoom: Number(scope && scope.zoom || 1).toFixed(3), rot: Number(viewRotation || 0).toFixed(3) });
  var previousCameraMoveState = __lastTerrainCameraMoveState || { key: '', terrainBatchId: null };
  var cameraMoved = previousCameraMoveState.key && previousCameraMoveState.key !== cameraMoveKey && previousCameraMoveState.terrainBatchId === (model && model.activeTerrainBatchId || null);
  var stats = {
    terrainCellCount: Number(model.width || 0) * Number(model.height || 0),
    terrainColumnCount: generatedCellCount,
    terrainExpandedVoxelInstanceCount: 0,
    terrainUsesColumnModel: true,
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    terrainVisibleUnitFaceCount: renderables.length,
    visibleColumnCount: visibleColumnCount,
    visibleChunkCount: visibleChunkCount,
    culledColumnCount: Math.max(0, generatedCellCount - visibleColumnCount),
    culledChunkCount: Math.max(0, totalChunks - visibleChunkCount),
    logicalVoxelCountEstimated: generatedVoxelCount,
    terrainOwnedDeltaBlockCount: terrainOwnedDeltaBlockCount,
    existingManualBlockCount: existingManualBlockCount,
    overlappingColumnCount: overlappingColumnCount,
    mergedWithExistingOccupancy: model && model.mergedWithExistingOccupancy === true,
    stackedOnExistingBlocks: model && model.stackedOnExistingBlocks === true,
    visibleTopFaceCount: visibleTopFaceCount,
    visibleSideFaceCount: visibleSideFaceCount,
    internalVoxelSkippedCount: internalVoxelSkippedCount,
    hiddenInternalSurfaceSkippedCount: hiddenInternalSurfaceSkippedCount,
    terrainBuildWasScoped: true,
    surfaceOnlyRenderingEnabled: scope && scope.surfaceOnlyRenderingEnabled !== false,
    renderableCount: renderables.length,
    terrainBatchDrawCount: renderables.length,
    terrainVisibleFaceCount: visibleTopFaceCount + visibleSideFaceCount,
    buildMode: cacheReset ? 'full' : (rebuiltChunkCount > 0 ? 'dirty-chunk' : 'cached'),
    buildMs: Math.max(0, perfNow() - buildStart),
    chunkSize: getTerrainChunkSizeForRender(model),
    chunkCount: totalChunks,
    cachedChunkCount: __terrainChunkRenderCache.chunks.size,
    visibleChunkCount: visibleChunkCount,
    rebuiltChunkCount: rebuiltChunkCount,
    dirtyChunkCount: Math.max(__terrainChunkRenderCache.dirtyChunkKeys.size, model && Array.isArray(model.dirtyChunkKeys) ? model.dirtyChunkKeys.length : 0),
    cacheHitCount: cacheHitCount,
    cacheMissCount: cacheMissCount,
    terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null,
    allHeightsAreIntegers: true,
    unitHeightStep: 1,
    renderedAsDiscreteBlockLayers: true,
    cameraMoveTriggeredTerrainRebuild: !!(cameraMoved && rebuiltChunkCount > 0),
    reusedChunkCount: Math.max(0, visibleChunkCount - rebuiltChunkCount),
    cullingOnly: !!(cameraMoved && rebuiltChunkCount === 0)
  };
  __lastTerrainCameraMoveState = { key: cameraMoveKey, terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null };
  __terrainChunkRenderCache.summary = stats;
  __terrainRuntimeSummary = stats;
  logItemRotationPrototype('terrain-logic-summary', {
    terrainCellCount: stats.terrainCellCount,
    terrainColumnCount: Number(stats.terrainColumnCount || 0),
    terrainExpandedVoxelInstanceCount: 0,
    terrainUsesColumnModel: true
  });
  logItemRotationPrototype('terrain-render-pipeline-check', {
    terrainUsesColumnModel: true,
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    terrainExpandedVoxelInstanceCount: 0,
    terrainVisibleUnitFaceCount: Number(stats.terrainVisibleUnitFaceCount || 0),
    terrainVisibleColumnCount: Number(stats.visibleColumnCount || 0)
  });
  logItemRotationPrototype('terrain-block-quantization-check', {
    terrainBatchId: stats.terrainBatchId,
    minHeightObserved: model && model.lastSummary ? Number(model.lastSummary.minHeightObserved || 0) : 0,
    maxHeightObserved: model && model.lastSummary ? Number(model.lastSummary.maxHeightObserved || 0) : 0,
    allHeightsAreIntegers: true,
    unitHeightStep: 1,
    renderedAsDiscreteBlockLayers: true
  });
  logItemRotationPrototype('terrain-camera-move-cost-summary', {
    cameraMoveTriggeredTerrainRebuild: !!stats.cameraMoveTriggeredTerrainRebuild,
    rebuiltChunkCount: Number(stats.rebuiltChunkCount || 0),
    reusedChunkCount: Number(stats.reusedChunkCount || 0),
    visibleChunkCount: Number(stats.visibleChunkCount || 0),
    cullingOnly: !!stats.cullingOnly,
    cameraPanEventId: cameraMoveKey
  });
  logItemRotationPrototype('camera-pan-performance-summary', {
    cameraPanActive: !!cameraMoved,
    cameraMoveTriggeredTerrainRebuild: !!stats.cameraMoveTriggeredTerrainRebuild,
    rebuiltChunkCount: Number(stats.rebuiltChunkCount || 0),
    reusedChunkCount: Number(stats.reusedChunkCount || 0),
    cullingOnly: !!stats.cullingOnly,
    panFrameCostMs: Number(stats.buildMs || 0)
  });
  logItemRotationPrototype('terrain-world-integration-summary', {
    terrainBatchId: stats.terrainBatchId,
    terrainTargetColumnCount: Number(stats.terrainColumnCount || 0),
    terrainOwnedDeltaBlockCount: Number(stats.terrainOwnedDeltaBlockCount || 0),
    mergedWithExistingOccupancy: stats.mergedWithExistingOccupancy === true,
    existingManualBlockCount: Number(stats.existingManualBlockCount || 0),
    overlappingColumnCount: Number(stats.overlappingColumnCount || 0),
    stackedOnExistingBlocks: stats.stackedOnExistingBlocks === true
  });
  logItemRotationPrototype('terrain-build-scope-summary', {
    visibleColumnCount: Number(stats.visibleColumnCount || 0),
    visibleChunkCount: Number(stats.visibleChunkCount || 0),
    culledColumnCount: Number(stats.culledColumnCount || 0),
    culledChunkCount: Number(stats.culledChunkCount || 0),
    terrainBuildWasScoped: true
  });
  logItemRotationPrototype('terrain-chunk-cache-summary', {
    terrainBatchId: stats.terrainBatchId,
    chunkSize: stats.chunkSize,
    chunkCount: stats.chunkCount,
    cachedChunkCount: stats.cachedChunkCount,
    visibleChunkCount: stats.visibleChunkCount,
    rebuiltChunkCount: stats.rebuiltChunkCount,
    dirtyChunkCount: stats.dirtyChunkCount,
    cacheHitCount: stats.cacheHitCount,
    cacheMissCount: stats.cacheMissCount
  });
  logItemRotationPrototype('terrain-render-build-summary', {
    terrainBatchId: stats.terrainBatchId,
    terrainColumnCount: stats.terrainColumnCount,
    visibleColumnCount: stats.visibleColumnCount,
    renderableCount: stats.renderableCount,
    buildMode: stats.buildMode,
    terrainBuildMs: stats.buildMs
  });
  return { renderables: renderables, stats: stats };
}

function getMainEditorCameraScreenViewportBounds() {
  return { minX: 0, minY: 0, maxX: VIEW_W, maxY: VIEW_H, width: VIEW_W, height: VIEW_H };
}

function getMainEditorViewportScreenBoundsBeforeZoom(zoom) {
  zoom = Math.max(0.05, Number(zoom) || 1);
  var cx = VIEW_W * 0.5;
  var cy = VIEW_H * 0.5;
  function unzoomPoint(x, y) {
    return { x: cx + (x - cx) / zoom, y: cy + (y - cy) / zoom };
  }
  var tl = unzoomPoint(0, 0);
  var tr = unzoomPoint(VIEW_W, 0);
  var br = unzoomPoint(VIEW_W, VIEW_H);
  var bl = unzoomPoint(0, VIEW_H);
  return {
    minX: Math.min(tl.x, tr.x, br.x, bl.x),
    minY: Math.min(tl.y, tr.y, br.y, bl.y),
    maxX: Math.max(tl.x, tr.x, br.x, bl.x),
    maxY: Math.max(tl.y, tr.y, br.y, bl.y),
    corners: [tl, tr, br, bl]
  };
}

function expandWorldBounds(bounds, margin) {
  var m = Math.max(0, Number(margin) || 0);
  if (!bounds) return null;
  return {
    minX: bounds.minX - m,
    minY: bounds.minY - m,
    maxX: bounds.maxX + m,
    maxY: bounds.maxY + m
  };
}

function worldBoundsIntersectXY(a, b) {
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.worldBoundsIntersectXY === 'function') return visibilityCore.worldBoundsIntersectXY(a, b);
  if (!a || !b) return false;
  return !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxY <= b.minY || a.minY >= b.maxY);
}

function pointWithinWorldBoundsXY(x, y, bounds) {
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.pointWithinWorldBoundsXY === 'function') return visibilityCore.pointWithinWorldBoundsXY(x, y, bounds);
  if (!bounds) return true;
  return Number(x) >= bounds.minX && Number(x) < bounds.maxX && Number(y) >= bounds.minY && Number(y) < bounds.maxY;
}

function boxWithinWorldBoundsXY(box, bounds) {
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.getBoxWorldBounds === 'function' && typeof visibilityCore.isWithinCameraScope === 'function') {
    return visibilityCore.isWithinCameraScope(box, { cameraCullingEnabled: true, cullingWorldBounds: bounds }, visibilityCore.getBoxWorldBounds);
  }
  if (!box || !bounds) return true;
  var minX = Number(box.x) || 0;
  var minY = Number(box.y) || 0;
  var maxX = minX + Math.max(1, Number(box.w) || 1);
  var maxY = minY + Math.max(1, Number(box.d) || 1);
  return worldBoundsIntersectXY({ minX: minX, minY: minY, maxX: maxX, maxY: maxY }, bounds);
}

function computeMainEditorViewportWorldBounds(currentViewRotation, zoom) {
  var api = getMainViewRotationCoreApi();
  var rect = getMainEditorViewportScreenBoundsBeforeZoom(zoom);
  var corners = rect.corners || [];
  if (!api || typeof api.screenToWorldWithViewRotation !== 'function' || !corners.length) {
    return { minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity, source: 'fallback-unbounded' };
  }
  var cfg = {
    tileW: settings.tileW,
    tileH: settings.tileH,
    originX: settings.originX,
    originY: settings.originY,
    cameraX: camera.x,
    cameraY: camera.y,
    worldBoundsOrOrigin: { cols: settings.gridW || settings.worldCols, rows: settings.gridH || settings.worldRows }
  };
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < corners.length; i++) {
    var world = api.screenToWorldWithViewRotation({ x: corners[i].x, y: corners[i].y, z: 0 }, currentViewRotation, cfg);
    minX = Math.min(minX, Number(world.x) || 0);
    minY = Math.min(minY, Number(world.y) || 0);
    maxX = Math.max(maxX, Number(world.x) || 0);
    maxY = Math.max(maxY, Number(world.y) || 0);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity, source: 'fallback-unbounded' };
  }
  return { minX: Math.floor(minX), minY: Math.floor(minY), maxX: Math.ceil(maxX), maxY: Math.ceil(maxY), source: 'viewport-corners' };
}

function countWorldVisibilityForScope(scope) {
  var bounds = scope && scope.cullingWorldBounds ? scope.cullingWorldBounds : null;
  var terrainModel = getTerrainRuntimeModelForRender();
  var cacheKey = JSON.stringify({
    bounds: bounds,
    terrainBatchId: terrainModel && terrainModel.activeTerrainBatchId ? terrainModel.activeTerrainBatchId : null,
    terrainChunkCacheVersion: terrainModel && terrainModel.terrainChunkCacheVersion ? terrainModel.terrainChunkCacheVersion : 0,
    visibilityCountSamplingEnabled: __visibilityCountSamplingEnabled === true,
    boxCount: Array.isArray(boxes) ? boxes.length : 0,
    instanceCount: Array.isArray(instances) ? instances.length : 0,
    lightCount: Array.isArray(lights) ? lights.length : 0
  });
  if (__mainCameraScopeCountsCache.key === cacheKey && __mainCameraScopeCountsCache.counts) {
    return __mainCameraScopeCountsCache.counts;
  }
  var terrainColumnCount = terrainModel && terrainModel.lastSummary && Number.isFinite(Number(terrainModel.lastSummary.generatedCellCount))
    ? Math.max(0, Math.round(Number(terrainModel.lastSummary.generatedCellCount) || 0))
    : 0;
  var terrainVisible = __terrainRuntimeSummary && Number.isFinite(Number(__terrainRuntimeSummary.visibleColumnCount))
    ? Math.max(0, Math.round(Number(__terrainRuntimeSummary.visibleColumnCount) || 0))
    : 0;
  var voxels = 0, voxelsVisible = 0;
  for (var i = 0; i < boxes.length; i++) {
    var box = boxes[i];
    voxels += 1;
    if (boxWithinWorldBoundsXY(box, bounds)) voxelsVisible += 1;
  }
  var objectVisible = 0;
  var objectTotal = 0;
  for (var j = 0; j < instances.length; j++) {
    var inst = instances[j];
    objectTotal += 1;
    var instBounds = getInstanceWorldBoundsForRender(inst);
    if (!instBounds || worldBoundsIntersectXY({ minX: instBounds.minX, minY: instBounds.minY, maxX: instBounds.maxX, maxY: instBounds.maxY }, bounds)) objectVisible += 1;
  }
  var counts = {
    visibleTerrainCount: terrainVisible,
    visibleVoxelCount: voxelsVisible,
    visibleObjectCount: objectVisible,
    culledTerrainCount: Math.max(0, terrainColumnCount - terrainVisible),
    culledVoxelCount: Math.max(0, voxels - voxelsVisible),
    culledObjectCount: Math.max(0, objectTotal - objectVisible),
    visibilityCountSamplingEnabled: __visibilityCountSamplingEnabled === true
  };
  __mainCameraScopeCountsCache = { key: cacheKey, counts: counts };
  return counts;
}

function getMainCameraRenderScope(currentViewRotation) {
  currentViewRotation = normalizeMainEditorViewRotationValue(currentViewRotation);
  var settingsForRender = getMainEditorCameraSettingsForRender();
  var zoom = getMainEditorZoomValueForRender();
  var terrainModel = getTerrainRuntimeModelForRender();
  var cacheKey = [currentViewRotation, zoom, settingsForRender.cameraCullingEnabled !== false, Number(settingsForRender.cullingMargin || 0), Number(camera.x || 0), Number(camera.y || 0), VIEW_W, VIEW_H, terrainModel && terrainModel.activeTerrainBatchId ? terrainModel.activeTerrainBatchId : 'none', terrainModel && terrainModel.width || 0, terrainModel && terrainModel.height || 0].join('|');
  if (__mainCameraScopeCache.scope && __mainCameraScopeCache.key === cacheKey) {
    logItemRotationPrototype('camera-scope-cache-summary', { cacheReused: true, cacheKeyExcludesFrameCounter: true, visibilityCountSamplingEnabled: (__mainCameraScopeCountsCache.counts && __mainCameraScopeCountsCache.counts.visibilityCountSamplingEnabled) === true });
    return __mainCameraScopeCache.scope;
  }
  var viewportWorldBounds = computeMainEditorViewportWorldBounds(currentViewRotation, zoom);
  var cullingWorldBounds = expandWorldBounds(viewportWorldBounds, getMainEditorCullingMarginForRender());
  var counts = countWorldVisibilityForScope({ cullingWorldBounds: cullingWorldBounds });
  var scope = {
    currentViewRotation: currentViewRotation,
    zoom: zoom,
    cameraCullingEnabled: settingsForRender.cameraCullingEnabled !== false,
    cullingMargin: Math.max(0, Number(settingsForRender.cullingMargin) || 0),
    showCameraBounds: !!settingsForRender.showCameraBounds,
    showCullingBounds: !!settingsForRender.showCullingBounds,
    surfaceOnlyRenderingEnabled: settingsForRender.surfaceOnlyRenderingEnabled !== false,
    debugVisibleSurfaces: !!settingsForRender.debugVisibleSurfaces,
    viewportScreenBounds: getMainEditorCameraScreenViewportBounds(),
    viewportLocalScreenBounds: getMainEditorViewportScreenBoundsBeforeZoom(zoom),
    viewportWorldBounds: viewportWorldBounds,
    cullingWorldBounds: cullingWorldBounds,
    visibleTerrainCount: counts.visibleTerrainCount,
    visibleVoxelCount: counts.visibleVoxelCount,
    visibleObjectCount: counts.visibleObjectCount,
    culledTerrainCount: counts.culledTerrainCount,
    culledVoxelCount: counts.culledVoxelCount,
    culledObjectCount: counts.culledObjectCount
  };
  logItemRotationPrototype('main-camera-viewport-culling-check', {
    currentViewRotation: currentViewRotation,
    zoom: zoom,
    viewportWorldBounds: viewportWorldBounds,
    cullingWorldBounds: cullingWorldBounds,
    visibleTerrainCount: scope.visibleTerrainCount,
    visibleVoxelCount: scope.visibleVoxelCount,
    visibleObjectCount: scope.visibleObjectCount,
    culledTerrainCount: scope.culledTerrainCount,
    culledVoxelCount: scope.culledVoxelCount,
    culledObjectCount: scope.culledObjectCount
  });
  logItemRotationPrototype('main-camera-zoom-unification-check', {
    cameraZoomValue: zoom,
    worldDisplayScaleValue: Number(settings.worldDisplayScale || 1),
    tileScaleValue: Number(settings.tileScale || 1),
    usesSingleUnifiedZoom: true,
    terrainUsesUnifiedZoom: true,
    blocksUseUnifiedZoom: true
  });
  __mainCameraScopeCache = { key: cacheKey, scope: scope };
  logItemRotationPrototype('camera-scope-cache-summary', { cacheReused: false, cacheKeyExcludesFrameCounter: true, visibilityCountSamplingEnabled: counts.visibilityCountSamplingEnabled === true });
  return scope;
}

function renderableIntersectsMainCameraScope(renderable, scope) {
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.isWithinCameraScope === 'function' && typeof visibilityCore.getRenderableWorldBounds === 'function') {
    return visibilityCore.isWithinCameraScope(renderable, scope, visibilityCore.getRenderableWorldBounds);
  }
  if (!scope || scope.cameraCullingEnabled === false) return true;
  var bounds = scope.cullingWorldBounds;
  if (!bounds) return true;
  if (Number.isFinite(Number(renderable && renderable.cellX)) && Number.isFinite(Number(renderable && renderable.cellY))) {
    return worldBoundsIntersectXY({ minX: Number(renderable.cellX), minY: Number(renderable.cellY), maxX: Number(renderable.cellX) + 1, maxY: Number(renderable.cellY) + 1 }, bounds);
  }
  if (renderable && renderable.box) return boxWithinWorldBoundsXY(renderable.box, bounds);
  if (Number.isFinite(Number(renderable && renderable.worldX)) && Number.isFinite(Number(renderable && renderable.worldY))) {
    return pointWithinWorldBoundsXY(renderable.worldX, renderable.worldY, bounds);
  }
  return true;
}

function filterRenderablesForMainCameraScope(renderables, scope) {
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.filterByCameraScope === 'function' && typeof visibilityCore.getRenderableWorldBounds === 'function') {
    return visibilityCore.filterByCameraScope(renderables, scope, visibilityCore.getRenderableWorldBounds);
  }
  if (!scope || scope.cameraCullingEnabled === false) return Array.isArray(renderables) ? renderables.slice() : [];
  return (Array.isArray(renderables) ? renderables : []).filter(function (item) { return renderableIntersectsMainCameraScope(item, scope); });
}

function filterLightsForMainCameraScope(inputLights, scope) {
  var list = Array.isArray(inputLights) ? inputLights : [];
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.filterByCameraScope === 'function') {
    return visibilityCore.filterByCameraScope(list, scope, function (light) {
      return { minX: Number(light && light.x || 0), minY: Number(light && light.y || 0), maxX: Number(light && light.x || 0) + 1, maxY: Number(light && light.y || 0) + 1 };
    });
  }
  if (!scope || scope.cameraCullingEnabled === false) return list.slice();
  return list.filter(function (light) {
    return pointWithinWorldBoundsXY(Number(light && light.x || 0), Number(light && light.y || 0), scope.cullingWorldBounds);
  });
}

function filterBoxesForMainCameraScope(inputBoxes, scope) {
  var list = Array.isArray(inputBoxes) ? inputBoxes : [];
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.filterByCameraScope === 'function' && typeof visibilityCore.getBoxWorldBounds === 'function') {
    return visibilityCore.filterByCameraScope(list, scope, visibilityCore.getBoxWorldBounds);
  }
  if (!scope || scope.cameraCullingEnabled === false) return list.slice();
  return list.filter(function (box) { return boxWithinWorldBoundsXY(box, scope.cullingWorldBounds); });
}

function getMainCameraVisibleLightsForRender(currentViewRotation) {
  return filterLightsForMainCameraScope(typeof getLightingRenderLights === 'function' ? getLightingRenderLights() : lights, getMainCameraRenderScope(currentViewRotation));
}

function getMainCameraVisibleBoxesForRender(currentViewRotation) {
  return filterBoxesForMainCameraScope(boxes, getMainCameraRenderScope(currentViewRotation));
}

function applyMainCameraWorldTransform(targetCtx, drawFn) {
  if (typeof drawFn !== 'function') return null;
  var zoom = getMainEditorZoomValueForRender();
  if (!targetCtx || Math.abs(zoom - 1) < 1e-6) return drawFn();
  var cx = VIEW_W * 0.5;
  var cy = VIEW_H * 0.5;
  targetCtx.save();
  targetCtx.translate(cx, cy);
  targetCtx.scale(zoom, zoom);
  targetCtx.translate(-cx, -cy);
  try {
    return drawFn();
  } finally {
    targetCtx.restore();
  }
}

function drawMainCameraBoundsDebug(scope) {
  if (!scope) return;
  function drawBounds(bounds, stroke, lineWidth) {
    if (!bounds) return;
    var pts = [
      iso(bounds.minX, bounds.minY, 0),
      iso(bounds.maxX, bounds.minY, 0),
      iso(bounds.maxX, bounds.maxY, 0),
      iso(bounds.minX, bounds.maxY, 0)
    ];
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth || 1.5;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  if (scope.showCameraBounds) drawBounds(scope.viewportWorldBounds, 'rgba(80,200,255,0.92)', 2);
  if (scope.showCullingBounds) drawBounds(scope.cullingWorldBounds, 'rgba(255,180,80,0.92)', 1.6);
}

if (typeof window !== 'undefined') {
  window.__MAIN_CAMERA_CULLING_API__ = {
    getScope: getMainCameraRenderScope,
    filterLights: filterLightsForMainCameraScope,
    filterBoxesForShadowSource: filterBoxesForMainCameraScope,
    filterRenderables: filterRenderablesForMainCameraScope,
    getRenderSourceWorldBounds: function (source) {
      var visibilityCore = getRenderVisibilityCoreApi();
      return visibilityCore && typeof visibilityCore.getRenderSourceWorldBounds === 'function'
        ? visibilityCore.getRenderSourceWorldBounds(source)
        : null;
    }
  };
}

function buildMainViewRotationSourceCheckPayload(currentViewRotationFromRender, currentViewRotationFromCache, geometrySignature) {
  var runtimeInfo = readRuntimeMainEditorViewRotation();
  var runtimeRotation = runtimeInfo && runtimeInfo.hasViewRotation ? normalizeMainEditorViewRotationValue(runtimeInfo.viewRotation) : 0;
  var parsedGeometry = null;
  try { parsedGeometry = geometrySignature ? JSON.parse(geometrySignature) : null; } catch (_) { parsedGeometry = null; }
  var geometryRotation = parsedGeometry && typeof parsedGeometry.viewRotation === 'number' ? normalizeMainEditorViewRotationValue(parsedGeometry.viewRotation) : runtimeRotation;
  var cacheRotation = typeof currentViewRotationFromCache === 'number' ? normalizeMainEditorViewRotationValue(currentViewRotationFromCache) : runtimeRotation;
  var legacyRotation = readLegacyMainEditorViewRotation();
  var aligned = runtimeRotation === normalizeMainEditorViewRotationValue(currentViewRotationFromRender) && runtimeRotation === cacheRotation && runtimeRotation === geometryRotation;
  return {
    currentViewRotationFromRuntime: runtimeRotation,
    currentViewRotationFromRender: normalizeMainEditorViewRotationValue(currentViewRotationFromRender),
    currentViewRotationFromCache: cacheRotation,
    currentViewRotationFromGeometrySignature: geometryRotation,
    legacyEditorRotation: legacyRotation,
    allRotationSourcesAligned: aligned,
    legacyEditorRotationIsolated: legacyRotation == null || legacyRotation === runtimeRotation
  };
}

function getViewRotationCoreApi() {
  try {
    return (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.viewRotationCore)
      ? window.App.domain.viewRotationCore
      : (typeof window !== 'undefined' ? window.__VIEW_ROTATION_CORE__ || null : null);
  } catch (_) {
    return (typeof window !== 'undefined' ? window.__VIEW_ROTATION_CORE__ || null : null);
  }
}

function computeViewAwareSortMeta(point, height, viewRotation) {
  var api = getViewRotationCoreApi();
  if (api && typeof api.computeRenderableSortMeta === 'function') {
    return api.computeRenderableSortMeta({
      x: point && point.x,
      y: point && point.y,
      z: point && point.z,
      h: height,
      viewRotation: viewRotation
    });
  }
  return {
    sortKey: (Number(point && point.x) || 0) + (Number(point && point.y) || 0) + (Number(point && point.z) || 0) + (Number(height) || 0),
    tie: ((Number(point && point.z) || 0) * 100000) + ((Number(point && point.y) || 0) * 100) + (Number(point && point.x) || 0)
  };
}

function logRenderDependency(name, detail) {
  logItemRotationPrototype('render-dependency', Object.assign({ dependency: String(name || 'unknown') }, detail || {}));
}

function logItemRotationPrototype(kind, payload) {
  try {
    var api = (typeof window !== 'undefined' && window.__ITEM_ROTATION_DIAGNOSTIC__) ? window.__ITEM_ROTATION_DIAGNOSTIC__ : null;
    if (api && typeof api.record === 'function') api.record(kind, payload || null);
  } catch (_) {}
  try { if (typeof detailLog === 'function') detailLog('[item-rotation] ' + String(kind || 'event') + ' ' + JSON.stringify(payload || {})); } catch (_) {}
}

var __mainFramePlanSeq = 0;
var __lastMainRenderableBuildStats = {
  currentViewRotation: 0,
  staticRenderableCount: 0,
  dynamicRenderableCount: 0,
  renderableCount: 0,
  reason: 'startup'
};

function deriveRenderableDrawPosition(renderable) {
  if (!renderable) return { x: 0, y: 0 };
  if (renderable.drawScreenPosition && typeof renderable.drawScreenPosition.x === 'number' && typeof renderable.drawScreenPosition.y === 'number') {
    return { x: Math.round(renderable.drawScreenPosition.x), y: Math.round(renderable.drawScreenPosition.y) };
  }
  if (renderable.debugFoot && typeof renderable.debugFoot.x === 'number' && typeof renderable.debugFoot.y === 'number') {
    return { x: Math.round(renderable.debugFoot.x), y: Math.round(renderable.debugFoot.y) };
  }
  if (Array.isArray(renderable.faces) && renderable.faces.length && Array.isArray(renderable.faces[0].points) && renderable.faces[0].points.length) {
    var mid = averageScreenPoint(renderable.faces[0].points);
    return { x: Math.round(mid.x), y: Math.round(mid.y) };
  }
  return { x: 0, y: 0 };
}

function compareRenderablesByDomain(a, b) {
  var domainCore = getDomainSceneCoreApi();
  if (domainCore && typeof domainCore.compareRenderableOrder === 'function') {
    return domainCore.compareRenderableOrder(a, b);
  }
  if (Math.abs((a.sortKey || 0) - (b.sortKey || 0)) > EPS) return (a.sortKey || 0) - (b.sortKey || 0);
  return (a.tie || 0) - (b.tie || 0);
}

function computeCandidate(cellX, cellY, proto, ignoreInstanceId = null) {
  var rotatedProto = proto && proto.voxels ? proto : currentProto();
  if (rotatedProto && rotatedProto.kind === 'habbo_import') {
    var cellShift = getHabboPlacementCellShift(rotatedProto, rotatedProto.rotation || 0);
    if (cellShift && (cellShift.x || cellShift.y)) {
      cellX += (cellShift.x || 0);
      cellY += (cellShift.y || 0);
    }
  }

  var domainCore = getDomainSceneCoreApi();
  if (!domainCore || typeof domainCore.evaluatePlacementCandidate !== 'function') {
    var unavailable = {
      valid: false,
      reason: 'domain-unavailable',
      supportZ: null,
      supportHeights: [],
      overlapIds: [],
      box: null,
      boxes: [],
      bbox: null,
      origin: null,
      prefabId: rotatedProto && rotatedProto.id ? rotatedProto.id : null,
      rotation: rotatedProto ? rotatedProto.rotation : null,
      authority: 'domain-required'
    };
    if (typeof logWarn === 'function') {
      try {
        logWarn('computeCandidate: domain-core-unavailable', {
          source: 'src/presentation/render/render.js:computeCandidate',
          prefabId: unavailable.prefabId,
          cellX: cellX,
          cellY: cellY,
          ignoreInstanceId: ignoreInstanceId || null
        });
      } catch (_) {}
    }
    return unavailable;
  }

  var evaluated = domainCore.evaluatePlacementCandidate({
    proto: rotatedProto,
    cellX: cellX,
    cellY: cellY,
    ignoreInstanceId: ignoreInstanceId,
    existingBoxes: boxes.slice(),
    grid: { gridW: settings.gridW, gridH: settings.gridH },
    playerBox: playerPlacementAABB()
  }) || null;

  if (!evaluated) {
    return {
      valid: false,
      reason: 'domain-null',
      supportZ: null,
      supportHeights: [],
      overlapIds: [],
      box: null,
      boxes: [],
      bbox: null,
      origin: null,
      prefabId: rotatedProto && rotatedProto.id ? rotatedProto.id : null,
      rotation: rotatedProto ? rotatedProto.rotation : null,
      authority: 'domain-required'
    };
  }

  evaluated.authority = 'domain';
  evaluated.source = 'src/presentation/render/render.js:computeCandidate';
  if (verboseLog && evaluated.valid && evaluated.origin) {
    pushLog(`candidate: VALID ${rotatedProto.name} voxels=${evaluated.boxes.length} at (${evaluated.origin.x},${evaluated.origin.y},${evaluated.origin.z}) authority=domain`);
  }
  return evaluated;
}

function updatePreview() {
  editor.hoverDeleteBox = null;
  if (!mouse.inside) { editor.preview = null; return; }

  if (editor.mode === 'view') {
    editor.preview = null;
    return;
  }

  if (editor.mode === 'delete') {
    editor.preview = null;
    editor.hoverDeleteBox = pickBoxAtScreen(mouse.x, mouse.y);
    return;
  }

  let cellX, cellY;
  const topHit = hitTopFace(mouse.x, mouse.y);
  if (topHit && editor.mode === 'place') {
    cellX = topHit.x;
    cellY = topHit.y;
  } else {
    const floor = screenToFloor(mouse.x, mouse.y);
    cellX = Math.floor(floor.x);
    cellY = Math.floor(floor.y);
  }

  if (editor.mode === 'drag' && editor.draggingInstance) {
    editor.preview = computeCandidate(cellX, cellY, prefabVariant(getPrefabById(editor.draggingInstance.prefabId), editor.draggingInstance.rotation || 0), editor.draggingInstance.instanceId);
  } else if (editor.mode === 'place') {
    editor.preview = computeCandidate(cellX, cellY, currentProto());
  } else {
    editor.preview = null;
  }

  if (editor.preview && editor.mode === 'place') {
    try {
      logItemRotationPrototype('placement-preview', {
        prefabId: editor.preview.prefabId || (typeof currentPrefab === 'function' && currentPrefab() ? currentPrefab().id : null),
        previewFacing: getEditorPreviewFacingValue(),
        origin: editor.preview.origin || null,
        footprint: editor.preview.bbox ? { w: editor.preview.bbox.w, d: editor.preview.bbox.d, h: editor.preview.bbox.h } : null,
        valid: !!editor.preview.valid,
        reason: editor.preview.reason || 'ok'
      });
    } catch (_) {}
  }

  if (editor.preview && topHit && editor.preview.valid) {
    detailLog(`preview-hit-top: cell=(${topHit.x},${topHit.y}) topZ=${topHit.z}`);
  }

  if (editor.preview && editor.preview.prefabId) {
    var __pp = getPrefabById(editor.preview.prefabId);
    if (__pp && __pp.kind === 'habbo_import') {
      detailLog('[place-trace] preview-candidate prefab=' + __pp.id + ' origin=(' + [editor.preview.origin && editor.preview.origin.x, editor.preview.origin && editor.preview.origin.y, editor.preview.origin && editor.preview.origin.z].join(',') + ') bbox=' + (editor.preview.bbox ? JSON.stringify(editor.preview.bbox) : 'null') + ' boxes=' + (editor.preview.boxes ? editor.preview.boxes.length : 0) + ' valid=' + editor.preview.valid + ' reason=' + editor.preview.reason);
    }
  }

  if (editor.preview) {
    const sig = JSON.stringify({
      mode: editor.mode,
      x: editor.preview.box ? editor.preview.box.x : null,
      y: editor.preview.box ? editor.preview.box.y : null,
      z: editor.preview.box ? editor.preview.box.z : null,
      valid: editor.preview.valid,
      reason: editor.preview.reason,
      overlapIds: editor.preview.overlapIds,
    });
    if (sig != lastPreviewSignature && verboseLog) {
      lastPreviewSignature = sig;
      pushLog(`preview: ${sig}`);
    }
  }
}

function pickBoxAtScreen(sx, sy) {
  const p = { x: sx, y: sy };
  const faces = buildSurfaceFaces(boxes, 1, xrayFaces).sort((a, b) => a.fallbackDepth - b.fallbackDepth);
  let picked = null;
  for (const f of faces) {
    if (!pointInPoly(p, f.poly)) continue;
    if (!picked || f.fallbackDepth >= picked.depth) {
      const box = boxes.find(b => b.id === f.boxId);
      if (box) picked = { box, depth: f.fallbackDepth };
    }
  }
  return picked ? picked.box : null;
}

function pickFaceAtScreen(sx, sy, includeHidden) {
  const p = { x: sx, y: sy };
  const faces = buildSurfaceFaces(boxes, 1, includeHidden == null ? xrayFaces : includeHidden).sort((a, b) => a.fallbackDepth - b.fallbackDepth);
  let picked = null;
  for (const f of faces) {
    if (!pointInPoly(p, f.poly)) continue;
    if (!picked || f.fallbackDepth >= picked.fallbackDepth) picked = f;
  }
  return picked || null;
}

// placement 拖拽/落地入口已抽离到 src/application/placement/placement.js
// 这里保留预览计算、拾取和绘制等渲染相关实现。


function drawWorldPolyline(points3, stroke, width, dash) {
  if (!points3 || points3.length < 2) return;
  ctx.save();
  ctx.strokeStyle = stroke || 'rgba(255,255,255,0.9)';
  ctx.lineWidth = width || 1;
  if (dash && dash.length) ctx.setLineDash(dash);
  var p0 = iso(points3[0].x, points3[0].y, points3[0].z);
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < points3.length; i++) {
    var sp = iso(points3[i].x, points3[i].y, points3[i].z);
    ctx.lineTo(sp.x, sp.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawScreenPointMarker(pt, fill, stroke, radius) {
  if (!pt) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, radius || 3, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawWorldFaceOutline(facePts, stroke, width) {
  if (!facePts || facePts.length < 3) return;
  ctx.save();
  ctx.strokeStyle = stroke || 'rgba(255,255,255,0.9)';
  ctx.lineWidth = width || 1;
  var sp = iso(facePts[0].x, facePts[0].y, facePts[0].z);
  ctx.beginPath();
  ctx.moveTo(sp.x, sp.y);
  for (var i = 1; i < facePts.length; i++) {
    var p = iso(facePts[i].x, facePts[i].y, facePts[i].z);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawShadowProbeOverlay() {
  if (typeof shadowProbeState === 'undefined' || !shadowProbeState) return;
  var marker = shadowProbeState.activeMarker || null;
  if (!marker || !marker.worldPts || marker.worldPts.length < 3) return;
  var poly = marker.worldPts.map(function (p) { return iso(p.x, p.y, p.z); });
  var cx = 0, cy = 0;
  for (var i = 0; i < poly.length; i++) { cx += poly[i].x; cy += poly[i].y; }
  cx /= poly.length;
  cy /= poly.length;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (var j = 1; j < poly.length; j++) ctx.lineTo(poly[j].x, poly[j].y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,220,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,220,255,0.95)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8,4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0,220,255,0.98)';
  ctx.font = '12px sans-serif';
  ctx.fillText('Probe ' + String(marker.dir || 'face') + ' #' + String(marker.id).slice(-4), cx + 8, cy - 8);
  ctx.restore();
}

function drawSelectedInstanceProjectionDebug() {
  if (typeof shadowDebugDetailed !== 'undefined' && !shadowDebugDetailed) return;
  var inst = getSelectedInstance();
  if (!inst) return;
  var light = activeLight ? activeLight() : ((typeof getLightingRenderLights === 'function' ? getLightingRenderLights() : lights) || [])[0];
  if (!light) return;
  if (typeof collectInstanceShadowProjectionDebug !== 'function') return;
  var debug = collectInstanceShadowProjectionDebug(inst.instanceId, light);
  if (!debug || !debug.rays || !debug.rays.length) return;

  for (var i = 0; i < debug.hitFaces.length; i++) {
    var face = debug.hitFaces[i];
    var stroke = face.kind === 'top' ? 'rgba(255,220,120,0.92)' : (face.kind === 'east' ? 'rgba(255,140,220,0.92)' : 'rgba(120,255,180,0.92)');
    drawWorldFaceOutline(face.pts, stroke, 1.25);
  }

  var lines = [];
  var hitCount = 0;
  for (var r = 0; r < debug.rays.length; r++) {
    var ray = debug.rays[r];
    var srcScreen = iso(ray.src.x, ray.src.y, ray.src.z);
    drawScreenPointMarker(srcScreen, 'rgba(90,220,255,0.96)', 'rgba(0,0,0,0.65)', 3.5);
    ctx.fillStyle = 'rgba(90,220,255,0.96)';
    ctx.font = '11px monospace';
    ctx.fillText(String(ray.index), srcScreen.x + 5, srcScreen.y - 5);
    if (ray.bestHit) {
      hitCount += 1;
      drawWorldPolyline([ray.src, ray.bestHit.point], 'rgba(255,235,120,0.92)', 1.5, null);
      var hitScreen = iso(ray.bestHit.point.x, ray.bestHit.point.y, ray.bestHit.point.z);
      drawScreenPointMarker(hitScreen, 'rgba(255,235,120,0.98)', 'rgba(0,0,0,0.75)', 4.2);
      ctx.fillStyle = 'rgba(255,235,120,0.98)';
      ctx.font = '11px monospace';
      ctx.fillText(ray.bestHit.receiverKind + '@' + ray.bestHit.receiverOwnerKey, hitScreen.x + 6, hitScreen.y - 6);
      lines.push('#' + ray.index + ' ' + fmt3Shadow(ray.src) + ' -> ' + ray.bestHit.receiverKind + '/' + ray.bestHit.receiverOwnerKey + ' ' + fmt3Shadow(ray.bestHit.point) + ' dir=(' + ray.bestHit.dirSign.x + ',' + ray.bestHit.dirSign.y + ',' + ray.bestHit.dirSign.z + ')');
    } else {
      drawWorldPolyline([ray.src, ray.missFar], 'rgba(255,120,120,0.7)', 1.0, [4, 3]);
      var missScreen = iso(ray.missFar.x, ray.missFar.y, ray.missFar.z);
      drawScreenPointMarker(missScreen, 'rgba(255,120,120,0.78)', null, 2.8);
      lines.push('#' + ray.index + ' ' + fmt3Shadow(ray.src) + ' -> miss dir=(' + (ray.dir.x>=0?'+':'-') + ',' + (ray.dir.y>=0?'+':'-') + ',' + (ray.dir.z>=0?'+':'-') + ')');
    }
  }

  var anchor = debug.bounds ? iso(debug.bounds.minX, debug.bounds.minY, debug.bounds.maxZ) : iso(debug.rays[0].src.x, debug.rays[0].src.y, debug.rays[0].src.z);
  var panelX = Math.min(VIEW_W - 460, Math.max(16, anchor.x + 16));
  var panelY = Math.max(90, anchor.y - 18);
  var rowCount = Math.min(8, lines.length);
  var panelW = 440;
  var panelH = 28 + rowCount * 16;
  ctx.save();
  ctx.fillStyle = 'rgba(8,12,20,0.82)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(110,180,255,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.fillStyle = 'rgba(230,244,255,0.96)';
  ctx.font = '12px monospace';
  var title = '投影调试 ' + inst.instanceId + ' / light=' + String(light.name || light.id || light.type) + ' hits=' + hitCount + '/' + debug.rays.length + ' dir=(' + debug.lightDirSign.x + ',' + debug.lightDirSign.y + ',' + debug.lightDirSign.z + ')';
  ctx.fillText(title, panelX + 8, panelY + 16);
  for (var li = 0; li < rowCount; li++) ctx.fillText(lines[li], panelX + 8, panelY + 34 + li * 16);
  ctx.restore();
}


function averageScreenPoint(points) {
  var list = Array.isArray(points) ? points : [];
  if (!list.length) return { x: 0, y: 0 };
  var sx = 0, sy = 0;
  for (var i = 0; i < list.length; i++) { sx += Number(list[i].x) || 0; sy += Number(list[i].y) || 0; }
  return { x: sx / list.length, y: sy / list.length };
}


function computeScreenBBox(points) {
  var list = Array.isArray(points) ? points : [];
  if (!list.length) return null;
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < list.length; i++) {
    var px = Number(list[i] && list[i].x);
    var py = Number(list[i] && list[i].y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return { x: Math.round(minX), y: Math.round(minY), w: Math.round(maxX - minX), h: Math.round(maxY - minY) };
}

function bboxOverlapArea(a, b) {
  if (!a || !b) return 0;
  var x1 = Math.max(Number(a.x) || 0, Number(b.x) || 0);
  var y1 = Math.max(Number(a.y) || 0, Number(b.y) || 0);
  var x2 = Math.min((Number(a.x) || 0) + (Number(a.w) || 0), (Number(b.x) || 0) + (Number(b.w) || 0));
  var y2 = Math.min((Number(a.y) || 0) + (Number(a.h) || 0), (Number(b.y) || 0) + (Number(b.h) || 0));
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
}

function snapshotFaceFromRenderableFace(face, localIndex) {
  var pts = Array.isArray(face && face.points) ? face.points : [];
  return {
    localIndex: localIndex,
    semanticFace: face && face.semanticFace || null,
    screenFace: face && face.screenFace || null,
    depthKey: face && face.depthKey != null ? face.depthKey : null,
    centroid: averageScreenPoint(pts),
    bbox: computeScreenBBox(pts)
  };
}

function snapshotFacesForRenderable(renderable) {
  if (!renderable) return [];
  if (Array.isArray(renderable.faces) && renderable.faces.length) {
    return renderable.faces.map(function (face, idx) { return snapshotFaceFromRenderableFace(face, idx); });
  }
  if (renderable.kind === 'debug-cuboid-face' || renderable.kind === 'voxel-face') {
    var pts = Array.isArray(renderable.points) && renderable.points.length
      ? renderable.points
      : (Array.isArray(renderable.worldPts) ? screenPointsFromWorldFace(renderable.worldPts) : []);
    return [{
      localIndex: 0,
      semanticFace: renderable.semanticFace || null,
      screenFace: renderable.screenFace || null,
      depthKey: renderable.depthKey != null ? renderable.depthKey : null,
      centroid: averageScreenPoint(pts),
      bbox: computeScreenBBox(pts)
    }];
  }
  return [];
}

function computeRenderableSnapshotBBox(renderable) {
  var faces = snapshotFacesForRenderable(renderable);
  if (faces.length) {
    var boxes = faces.map(function (f) { return f.bbox; }).filter(Boolean);
    if (boxes.length) {
      var minX = Math.min.apply(null, boxes.map(function (b) { return b.x; }));
      var minY = Math.min.apply(null, boxes.map(function (b) { return b.y; }));
      var maxX = Math.max.apply(null, boxes.map(function (b) { return b.x + b.w; }));
      var maxY = Math.max.apply(null, boxes.map(function (b) { return b.y + b.h; }));
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
  }
  var dp = deriveRenderableDrawPosition(renderable);
  return { x: dp.x - 1, y: dp.y - 1, w: 2, h: 2 };
}

function collectOracleActualFaces(order) {
  var out = [];
  var list = Array.isArray(order) ? order : [];
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (!r || !(r.kind === 'voxel-face' || r.kind === 'debug-cuboid-face')) continue;
    out.push({
      faceKey: r.faceKey || [r.instanceId || 'unknown', [Number(r.cellX || 0), Number(r.cellY || 0), Number(r.cellZ || 0)].join(','), r.semanticFace || '', r.screenFace || ''].join('|'),
      instanceId: r.instanceId || null,
      semanticFace: r.semanticFace || null,
      screenFace: r.screenFace || null,
      drawIndex: i,
      cellX: Number(r.cellX || 0),
      cellY: Number(r.cellY || 0),
      cellZ: Number(r.cellZ || 0)
    });
  }
  return out;
}

function collectCubeOracleSceneEntries() {
  var out = [];
  var seen = Object.create(null);
  var list = Array.isArray(boxes) ? boxes : [];
  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    if (!b || b.prefabId !== 'cube_1x1') continue;
    var key = [String(b.instanceId || b.id || 'cube'), Number(b.x || 0), Number(b.y || 0), Number(b.z || 0)].join('|');
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ instanceId: b.instanceId || null, prefabId: b.prefabId || null, x: Number(b.x || 0), y: Number(b.y || 0), z: Number(b.z || 0) });
  }
  return out;
}

function logRenderOracleChecks(order, currentViewRotation) {
  var oracleApi = getRenderFaceOracleApi();
  if (!oracleApi || typeof oracleApi.identifyOracleTestScene !== 'function' || typeof oracleApi.runOracleCheck !== 'function') return;
  var sceneEntries = collectCubeOracleSceneEntries();
  var sceneDef = oracleApi.identifyOracleTestScene(sceneEntries);
  if (!sceneDef) return;
  var payload = oracleApi.runOracleCheck(sceneDef.sceneId || sceneDef, currentViewRotation, collectOracleActualFaces(order));
  if (!payload) return;
  logItemRotationPrototype('main-render-oracle-check', payload);
}

function logRenderOrderDiagnostics(framePlanId, framePlanSignature, currentViewRotation, order) {

  var ordered = [];
  var objectLevelCount = 0;
  var faceLevelCount = 0;
  var buckets = {
    floorRenderableCount: 1,
    staticVoxelRenderableCount: 0,
    debugFaceRenderableCount: 0,
    spriteRenderableCount: 0,
    shadowRenderableCount: (typeof lights !== 'undefined' && Array.isArray(lights) && lights.length) ? 1 : 0,
    overlayRenderableCount: 1
  };
  for (var i = 0; i < order.length; i++) {
    var r = order[i] || null;
    if (!r) continue;
    ordered.push({
      index: i,
      id: r.id || null,
      kind: r.kind || null,
      prefabId: r.prefabId || null,
      instanceId: r.instanceId || null,
      renderPath: r.renderPath || null,
      sortKey: r.sortKey != null ? r.sortKey : null,
      tie: r.tie != null ? r.tie : null
    });
    if (Array.isArray(r.faces) && r.faces.length) objectLevelCount += 1;
    if (r.kind === 'debug-cuboid-face' || r.kind === 'voxel-face') faceLevelCount += 1;
    if (r.kind === 'voxel' || r.kind === 'voxel-face') buckets.staticVoxelRenderableCount += 1;
    else if (r.kind === 'debug-cuboid-face') buckets.debugFaceRenderableCount += 1;
    else if (r.kind === 'prefab-sprite') buckets.spriteRenderableCount += 1;
  }
  logItemRotationPrototype('main-render-order-snapshot', {
    currentViewRotation: currentViewRotation,
    framePlanId: framePlanId,
    framePlanSignature: framePlanSignature,
    orderedRenderables: ordered
  });
  logItemRotationPrototype('main-render-layer-bucket-summary', Object.assign({
    currentViewRotation: currentViewRotation,
    framePlanId: framePlanId,
    mixedGranularityDetected: objectLevelCount > 0 && faceLevelCount > 0,
    objectLevelRenderableCount: objectLevelCount,
    faceLevelRenderableCount: faceLevelCount
  }, buckets));
  for (var j = 0; j < order.length; j++) {
    var rr = order[j];
    if (!rr) continue;
    var faces = snapshotFacesForRenderable(rr);
    if (!faces.length) continue;
    logItemRotationPrototype('main-render-face-order-snapshot', {
      currentViewRotation: currentViewRotation,
      framePlanId: framePlanId,
      renderableId: rr.id || null,
      prefabId: rr.prefabId || null,
      instanceId: rr.instanceId || null,
      renderPath: rr.renderPath || null,
      renderableSortKey: rr.sortKey != null ? rr.sortKey : null,
      renderableTie: rr.tie != null ? rr.tie : null,
      faces: faces
    });
  }
  logRenderOracleChecks(order, currentViewRotation);
  var conflictBudget = 0;
  for (var li = 0; li < order.length; li++) {
    var left = order[li];
    if (!left) continue;
    var leftBBox = computeRenderableSnapshotBBox(left);
    for (var ri = li + 1; ri < order.length; ri++) {
      var right = order[ri];
      if (!right) continue;
      var rightBBox = computeRenderableSnapshotBBox(right);
      var overlap = bboxOverlapArea(leftBBox, rightBBox);
      if (overlap <= 0) continue;
      logItemRotationPrototype('main-render-overlap-conflict', {
        currentViewRotation: currentViewRotation,
        framePlanId: framePlanId,
        leftId: left.id || null,
        rightId: right.id || null,
        leftKind: left.kind || null,
        rightKind: right.kind || null,
        leftSortKey: left.sortKey != null ? left.sortKey : null,
        rightSortKey: right.sortKey != null ? right.sortKey : null,
        leftTie: left.tie != null ? left.tie : null,
        rightTie: right.tie != null ? right.tie : null,
        leftBBox: leftBBox,
        rightBBox: rightBBox,
        overlapArea: overlap,
        expectedFront: (compareRenderablesByDomain(left, right) <= 0) ? (right.id || null) : (left.id || null),
        actualDrawOrder: { front: right.id || null, back: left.id || null }
      });
      conflictBudget += 1;
      if (conflictBudget >= 24) return;
    }
  }
}

function getFacingFacePolygons(bounds) {
  if (!bounds) return null;
  var pts = cubePoints(bounds.x, bounds.y, bounds.z, bounds.w, bounds.d, bounds.h);
  return {
    top: [pts.p001, pts.p101, pts.p111, pts.p011],
    north: [pts.p001, pts.p101, pts.p100, pts.p000],
    east: [pts.p101, pts.p111, pts.p110, pts.p100],
    south: [pts.p011, pts.p111, pts.p110, pts.p010],
    west: [pts.p001, pts.p011, pts.p010, pts.p000]
  };
}

function buildFacingOverlayPrototype(prefab, rotation, instance) {
  var facingApi = getItemFacingCoreApi();
  if (!facingApi || typeof facingApi.buildFacingPrototype !== 'function') return null;
  return facingApi.buildFacingPrototype(prefab, rotation, instance || null);
}


function isFiveFaceDebugPrefab(prefab) {
  if (!prefab || !prefab.itemRotationDebug) return false;
  var textures = prefab.semanticTextureMap || prefab.semanticTextures || {};
  var colors = prefab.semanticFaceColors || {};
  return ['top','north','east','south','west'].every(function (key) {
    return !!((textures[key] && (textures[key].textureId || textures[key].color)) || colors[key]);
  });
}

function getSemanticTextureMapForRender(prefab) {
  var api = getItemFacingCoreApi();
  if (api && typeof api.getSemanticTextureMap === 'function') return api.getSemanticTextureMap(prefab || {});
  return (prefab && (prefab.semanticTextureMap || prefab.semanticTextures)) || {};
}

function hasExplicitSemanticTexturesForRender(prefab) {
  var api = getItemFacingCoreApi();
  if (api && typeof api.hasExplicitSemanticTextures === 'function') return !!api.hasExplicitSemanticTextures(prefab || {});
  return !!(prefab && (prefab.itemRotationDebug || prefab.semanticTextureMap || prefab.semanticTextures || prefab.semanticFaceColors));
}

function getTextureFill(texture, fallback) {
  if (!texture) return fallback || '#fff';
  if (texture.kind === 'solid-color' || texture.type === 'solid-color') return texture.color || texture.fill || fallback || '#fff';
  return texture.color || texture.fill || fallback || '#fff';
}


function buildStaticVoxelSemanticMapping(cell, viewRotation, defaultColors, seenLogMap) {
  var prefab = cell && cell.box && typeof getPrefabById === 'function' ? getPrefabById(cell.box.prefabId) : null;
  var facingApi = getItemFacingCoreApi();
  var boxSemanticInput = cell && cell.box && (cell.box.semanticTextureMap || cell.box.semanticTextures || cell.box.semanticFaceColors)
    ? Object.assign({}, prefab || {}, {
        semanticTextureMap: cell.box.semanticTextureMap || cell.box.semanticTextures || null,
        semanticTextures: cell.box.semanticTextures || cell.box.semanticTextureMap || null,
        semanticFaceColors: cell.box.semanticFaceColors || null,
        itemRotationDebug: !!(cell.box.semanticTextureMap || cell.box.semanticTextures || cell.box.semanticFaceColors)
      })
    : prefab;
  var textureMap = boxSemanticInput ? getSemanticTextureMapForRender(boxSemanticInput) : null;
  var hasSemanticTextures = !!(boxSemanticInput && hasExplicitSemanticTexturesForRender(boxSemanticInput) && textureMap && (textureMap.top || textureMap.north || textureMap.east || textureMap.south || textureMap.west));
  if (!boxSemanticInput || !facingApi || !hasSemanticTextures) return null;
  var itemFacing = cell && cell.box && cell.box.rotation || 0;
  var binding = typeof facingApi.resolveSemanticTextureBinding === 'function'
    ? facingApi.resolveSemanticTextureBinding({ prefab: boxSemanticInput, itemFacing: itemFacing, viewRotation: viewRotation })
    : null;
  if (!binding) return null;
  var mapping = binding.mapping || null;
  var screenFaceToSemanticFace = binding.screenFaceToSemanticFace || { top: 'top', lowerLeft: null, lowerRight: null };
  var semanticFaceToTextureSlot = binding.semanticFaceToTextureSlot || { top: null, north: null, east: null, south: null, west: null };
  var screenFaceToTextureSlot = binding.screenFaceToTextureSlot || { top: null, lowerLeft: null, lowerRight: null };
  var screenFill = {
    top: getTextureFill(screenFaceToTextureSlot.top, rgbToCss(defaultColors.top)),
    lowerLeft: getTextureFill(screenFaceToTextureSlot.lowerLeft, rgbToCss(defaultColors.south)),
    lowerRight: getTextureFill(screenFaceToTextureSlot.lowerRight, rgbToCss(defaultColors.east))
  };
  if (seenLogMap) {
    var key = String(cell.box && cell.box.instanceId || 'no-instance') + '|' + String(viewRotation);
    if (!seenLogMap[key]) {
      seenLogMap[key] = true;
      logItemRotationPrototype('main-semantic-texture-mapping-check', {
        instanceId: cell.box && cell.box.instanceId || null,
        prefabId: boxSemanticInput && boxSemanticInput.id || prefab && prefab.id || null,
        instanceFacing: normalizeMainEditorViewRotationValue(itemFacing),
        viewRotation: normalizeMainEditorViewRotationValue(viewRotation),
        effectiveFacing: typeof binding.effectiveFacing === 'number' ? binding.effectiveFacing : (mapping && typeof mapping.effectiveFacing === 'number' ? mapping.effectiveFacing : normalizeMainEditorViewRotationValue(itemFacing)),
        visibleFaces: Array.isArray(binding.visibleFaces) ? binding.visibleFaces.slice() : (mapping && Array.isArray(mapping.visibleFaces) ? mapping.visibleFaces.slice() : []),
        screenFaceToSemanticFace: screenFaceToSemanticFace,
        semanticFaceToTextureSlot: semanticFaceToTextureSlot
      });
      var canonicalTruth = facingApi && typeof facingApi.getCanonicalSingleVoxelTruth === 'function' ? facingApi.getCanonicalSingleVoxelTruth(viewRotation) : null;
      var visibleByScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : { top: 'top', lowerLeft: screenFaceToSemanticFace.lowerLeft || null, lowerRight: screenFaceToSemanticFace.lowerRight || null };
      var passedTruth = null;
      if (canonicalTruth && normalizeMainEditorViewRotationValue(itemFacing) === 0) {
        passedTruth = String(visibleByScreen.top || '') === String(canonicalTruth.top || 'top') && String(visibleByScreen.lowerLeft || '') === String(canonicalTruth.lowerLeft || '') && String(visibleByScreen.lowerRight || '') === String(canonicalTruth.lowerRight || '');
      }
      logItemRotationPrototype('main-visible-face-truth-check', {
        currentViewRotation: normalizeMainEditorViewRotationValue(viewRotation),
        instanceId: cell.box && cell.box.instanceId || null,
        prefabId: boxSemanticInput && boxSemanticInput.id || prefab && prefab.id || null,
        visibleFacesByScreenPosition: visibleByScreen,
        visibleFacesBySemantic: Array.isArray(binding.visibleFaces) ? binding.visibleFaces.slice() : (mapping && Array.isArray(mapping.visibleFaces) ? mapping.visibleFaces.slice() : []),
        passedAgainstCanonicalTruthTable: passedTruth
      });
      logItemRotationPrototype('main-static-voxel-semantic-pipeline-check', {
        instanceId: cell.box && cell.box.instanceId || null,
        prefabId: boxSemanticInput && boxSemanticInput.id || prefab && prefab.id || null,
        instanceFacing: normalizeMainEditorViewRotationValue(itemFacing),
        viewRotation: normalizeMainEditorViewRotationValue(viewRotation),
        effectiveFacing: typeof binding.effectiveFacing === 'number' ? binding.effectiveFacing : (mapping && typeof mapping.effectiveFacing === 'number' ? mapping.effectiveFacing : normalizeMainEditorViewRotationValue(itemFacing)),
        visibleSemanticFaces: Array.isArray(binding.visibleFaces) ? binding.visibleFaces.slice() : (mapping && Array.isArray(mapping.visibleFaces) ? mapping.visibleFaces.slice() : []),
        screenFaceToSemanticFace: screenFaceToSemanticFace,
        semanticFaceToTextureSlot: semanticFaceToTextureSlot,
        renderPipelineSharedWithDebugFiveFace: true
      });
    }
  }
  return {
    prefab: prefab,
    binding: binding,
    mapping: mapping,
    textureMap: textureMap,
    screenFaceToSemanticFace: screenFaceToSemanticFace,
    semanticFaceToTextureSlot: semanticFaceToTextureSlot,
    screenFaceToTextureSlot: screenFaceToTextureSlot,
    screenFill: screenFill,
    useSharedSemanticPipeline: true
  };
}

function getSemanticFaceNormal(screenFace) {
  if (screenFace === 'top') return { x: 0, y: 0, z: 1 };
  if (screenFace === 'lowerRight' || screenFace === 'east') return { x: 1, y: 0, z: 0 };
  if (screenFace === 'lowerLeft' || screenFace === 'south') return { x: 0, y: 1, z: 0 };
  if (screenFace === 'north') return { x: 0, y: -1, z: 0 };
  if (screenFace === 'west') return { x: -1, y: 0, z: 0 };
  return { x: 0, y: 0, z: 1 };
}

function getSemanticFaceGeometryHelpers() {
  var api = getItemFacingCoreApi();
  return {
    getWorldPoints: api && typeof api.getSemanticFaceWorldPoints === 'function' ? api.getSemanticFaceWorldPoints : null,
    getNeighborDelta: api && typeof api.getSemanticFaceNeighborDelta === 'function' ? api.getSemanticFaceNeighborDelta : null,
    getVisibleMapping: api && typeof api.getVisibleSemanticFaceMapping === 'function' ? api.getVisibleSemanticFaceMapping : null
  };
}

function getSemanticFaceWorldPolygon(cell, semanticFace) {
  var helpers = getSemanticFaceGeometryHelpers();
  if (helpers.getWorldPoints) return helpers.getWorldPoints(cell, semanticFace);
  var c = cell || {};
  var x = Number(c.x || 0), y = Number(c.y || 0), z = Number(c.z || 0);
  if (semanticFace === 'top') return [{x:x,y:y,z:z+1},{x:x+1,y:y,z:z+1},{x:x+1,y:y+1,z:z+1},{x:x,y:y+1,z:z+1}];
  if (semanticFace === 'east') return [{x:x+1,y:y,z:z},{x:x+1,y:y+1,z:z},{x:x+1,y:y+1,z:z+1},{x:x+1,y:y,z:z+1}];
  if (semanticFace === 'south') return [{x:x,y:y+1,z:z},{x:x+1,y:y+1,z:z},{x:x+1,y:y+1,z:z+1},{x:x,y:y+1,z:z+1}];
  if (semanticFace === 'north') return [{x:x,y:y,z:z+1},{x:x+1,y:y,z:z+1},{x:x+1,y:y,z:z},{x:x,y:y,z:z}];
  if (semanticFace === 'west') return [{x:x,y:y,z:z+1},{x:x,y:y+1,z:z+1},{x:x,y:y+1,z:z},{x:x,y:y,z:z}];
  return [];
}

function getSemanticFaceNeighborDeltaForRender(semanticFace) {
  var helpers = getSemanticFaceGeometryHelpers();
  if (helpers.getNeighborDelta) return helpers.getNeighborDelta(semanticFace);
  if (semanticFace === 'east') return { x: 1, y: 0, z: 0 };
  if (semanticFace === 'south') return { x: 0, y: 1, z: 0 };
  if (semanticFace === 'west') return { x: -1, y: 0, z: 0 };
  if (semanticFace === 'north') return { x: 0, y: -1, z: 0 };
  if (semanticFace === 'top') return { x: 0, y: 0, z: 1 };
  return { x: 0, y: 0, z: 0 };
}

function getVisibleSemanticMappingForRender(itemFacing, viewRotation) {
  var helpers = getSemanticFaceGeometryHelpers();
  if (helpers.getVisibleMapping) return helpers.getVisibleMapping({ itemFacing: itemFacing, viewRotation: viewRotation });
  return null;
}

function textureFillToRgb(fill, fallbackRgb) {
  if (fill && typeof fill === 'object' && typeof fill.r === 'number' && typeof fill.g === 'number' && typeof fill.b === 'number') return fill;
  if (typeof fill === 'string') {
    var value = fill.trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
      return hexToRgb(value);
    }
    var match = value.match(/^rgba?\(([^)]+)\)$/i);
    if (match) {
      var parts = match[1].split(',').map(function (part) { return Number(part.trim()); });
      if (parts.length >= 3 && parts.every(function (part, idx) { return idx > 2 || Number.isFinite(part); })) {
        return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0 };
      }
    }
  }
  return fallbackRgb || { r: 255, g: 255, b: 255 };
}


function classifyCentroidRelation(value, ref) {
  var a = Number(value || 0);
  var b = Number(ref || 0);
  if (Math.abs(a - b) < 0.01) return 'same-as-top';
  return a < b ? 'left-of-top' : 'right-of-top';
}

function classifyVerticalRelation(value, ref) {
  var a = Number(value || 0);
  var b = Number(ref || 0);
  if (Math.abs(a - b) < 0.01) return 'same-as-top';
  return a < b ? 'above-top' : 'below-top';
}

function logFaceGeometryOracleChecks(faces, meta) {
  if (!Array.isArray(faces) || !faces.length) return;
  meta = meta || {};
  var centroidsByScreen = Object.create(null);
  var projectedByFace = new Map();
  faces.forEach(function (face) {
    if (!face) return;
    var pts = screenPointsFromWorldFace(face.worldPts || face.polygon || []);
    projectedByFace.set(face, pts);
    centroidsByScreen[String(face.screenFace || '')] = averageScreenPoint(pts);
  });
  var topCentroid = centroidsByScreen.top || null;
  if (!topCentroid) return;
  var lowerLeftCentroid = centroidsByScreen.lowerLeft || null;
  var lowerRightCentroid = centroidsByScreen.lowerRight || null;
  var sideXSeparated = !lowerLeftCentroid || !lowerRightCentroid || Math.abs((lowerLeftCentroid.x || 0) - (lowerRightCentroid.x || 0)) > 0.01;
  faces.forEach(function (face) {
    if (!face) return;
    var pts = projectedByFace.get(face) || screenPointsFromWorldFace(face.worldPts || face.polygon || []);
    var centroid = averageScreenPoint(pts);
    var xRel = classifyCentroidRelation(centroid.x, topCentroid.x);
    var yRel = classifyVerticalRelation(centroid.y, topCentroid.y);
    var passed = true;
    if (face.screenFace === 'top') {
      passed = (!lowerLeftCentroid || centroid.y < lowerLeftCentroid.y) && (!lowerRightCentroid || centroid.y < lowerRightCentroid.y);
    } else if (face.screenFace === 'lowerLeft') {
      passed = centroid.x < topCentroid.x && sideXSeparated;
    } else if (face.screenFace === 'lowerRight') {
      passed = centroid.x > topCentroid.x && sideXSeparated;
    }
    logItemRotationPrototype('main-face-geometry-oracle-check', {
      currentViewRotation: meta.currentViewRotation,
      instanceId: meta.instanceId || null,
      prefabId: meta.prefabId || null,
      semanticFace: face.semanticFace || null,
      screenFace: face.screenFace || null,
      centroid: { x: Number((centroid.x || 0).toFixed(2)), y: Number((centroid.y || 0).toFixed(2)) },
      topCentroid: { x: Number((topCentroid.x || 0).toFixed(2)), y: Number((topCentroid.y || 0).toFixed(2)) },
      centroidXRelationToTop: xRel,
      centroidYRelationToTop: yRel,
      passedGeometryOracle: !!passed
    });
    logItemRotationPrototype('main-side-face-polygon-template-check', {
      currentViewRotation: meta.currentViewRotation,
      instanceId: meta.instanceId || null,
      prefabId: meta.prefabId || null,
      semanticFace: face.semanticFace || null,
      screenFace: face.screenFace || null,
      polygon: pts.map(function (pt) { return { x: Number((pt.x || 0).toFixed(2)), y: Number((pt.y || 0).toFixed(2)) }; }),
      polygonTemplateId: face.polygonTemplateId || null,
      polygonSource: face.polygonSource || null,
      reusedFromOldEastSouthTemplate: !!face.reusedFromOldEastSouthTemplate
    });
  });
}

function buildSharedSemanticVoxelFaces(cell, occ, semanticMapping, ownerInstanceId) {
  if (!semanticMapping || !semanticMapping.useSharedSemanticPipeline) return null;
  var facingApi = getItemFacingCoreApi();
  if (!facingApi || typeof facingApi.buildDebugCuboidFaceRenderables !== 'function') return null;
  var renderData = facingApi.buildDebugCuboidFaceRenderables({
    prefab: semanticMapping.prefab,
    cells: [{ x: cell.x, y: cell.y, z: cell.z, box: cell.box, base: cell.base }],
    itemFacing: cell.box && cell.box.rotation || 0,
    viewRotation: semanticMapping.binding && typeof semanticMapping.binding.viewRotation === 'number' ? semanticMapping.binding.viewRotation : 0,
    ownerId: 'static-voxel:' + String(cell.box && cell.box.instanceId || cell.box && cell.box.id || 'unknown'),
    occupiedSet: occ
  });
  if (!renderData || !Array.isArray(renderData.faceRenderables) || !renderData.faceRenderables.length) return null;
  logItemRotationPrototype('main-render-face-binding-snapshot', {
    currentViewRotation: semanticMapping.binding && typeof semanticMapping.binding.viewRotation === 'number' ? semanticMapping.binding.viewRotation : 0,
    instanceId: cell.box && cell.box.instanceId || null,
    prefabId: semanticMapping.prefab && semanticMapping.prefab.id || null,
    instanceFacing: cell.box && cell.box.rotation || 0,
    effectiveFacing: semanticMapping.binding && typeof semanticMapping.binding.effectiveFacing === 'number' ? semanticMapping.binding.effectiveFacing : null,
    visibleSemanticFaces: semanticMapping.binding && Array.isArray(semanticMapping.binding.visibleFaces) ? semanticMapping.binding.visibleFaces.slice() : [],
    screenFaceToSemanticFace: semanticMapping.screenFaceToSemanticFace || {},
    semanticFaceToTextureSlot: semanticMapping.semanticFaceToTextureSlot || {},
    emittedFaces: renderData.faceRenderables.map(function (face) {
      return {
        semanticFace: face.semanticFace || null,
        screenFace: face.screenFace || null,
        textureId: face.textureId || null,
        polygon: face.worldPts || face.polygon || [],
        depthKey: face.depthKey != null ? face.depthKey : null
      };
    })
  });
  renderData.faceRenderables.forEach(function (face) {
    var projectedPts = screenPointsFromWorldFace(face.worldPts || face.polygon || []);
    var centroid = averageScreenPoint(projectedPts);
    logItemRotationPrototype('main-face-screen-position-check', {
      currentViewRotation: semanticMapping.binding && typeof semanticMapping.binding.viewRotation === 'number' ? semanticMapping.binding.viewRotation : 0,
      instanceId: cell.box && cell.box.instanceId || null,
      prefabId: semanticMapping.prefab && semanticMapping.prefab.id || null,
      semanticFace: face.semanticFace || null,
      resolvedScreenFace: face.screenFace || null,
      polygon: projectedPts.map(function (pt) { return { x: Number((pt.x || 0).toFixed(2)), y: Number((pt.y || 0).toFixed(2)) }; }),
      centroid: { x: Number((centroid.x || 0).toFixed(2)), y: Number((centroid.y || 0).toFixed(2)) }
    });
  });
  logFaceGeometryOracleChecks(renderData.faceRenderables, {
    currentViewRotation: semanticMapping.binding && typeof semanticMapping.binding.viewRotation === 'number' ? semanticMapping.binding.viewRotation : 0,
    instanceId: cell.box && cell.box.instanceId || null,
    prefabId: semanticMapping.prefab && semanticMapping.prefab.id || null
  });
  return renderData.faceRenderables.map(function (face, faceIndex) {
    var texture = face.texture || { textureId: face.textureId || '', kind: 'solid-color', color: face.color };
    var rawFill = getTextureFill(texture, face.color || '#fff');
    var normal = getSemanticFaceNormal(face.semanticFace || face.screenFace);
    var litFill = rgbToCss(litFaceColor(textureFillToRgb(rawFill, hexToRgb(face.color || '#ffffff')), face.worldPts || face.polygon || [], normal, ownerInstanceId));
    var cameraSettingsForFaces = getMainEditorCameraSettingsForRender();
    var debugSurfaceStroke = cameraSettingsForFaces.debugVisibleSurfaces ? '#ffffff' : colorWithAlpha(rawFill, 0.95);
    return buildFaceRenderable(
      screenPointsFromWorldFace(face.worldPts || face.polygon || []),
      litFill,
      debugSurfaceStroke,
      1,
      buildVoxelFaceShadowOverlays(face.worldPts || face.polygon || [], normal, ownerInstanceId),
      {
        semanticFace: face.semanticFace || null,
        screenFace: face.screenFace || null,
        depthKey: face.depthKey != null ? face.depthKey : faceIndex,
        textureId: face.textureId || null,
        texture: texture,
        textureColor: texture && texture.color || null,
        semanticTextureSlot: texture,
        semanticTextureSlotColor: texture && texture.color || null,
        color: face.color || (texture && texture.color) || null,
        worldPts: face.worldPts || face.polygon || [],
        polygonTemplateId: face.polygonTemplateId || null,
        polygonSource: face.polygonSource || null,
        reusedFromOldEastSouthTemplate: !!face.reusedFromOldEastSouthTemplate
      }
    );
  });
}

function colorWithAlpha(color, alpha) {
  var fallback = 'rgba(255,255,255,' + String(alpha == null ? 1 : alpha) + ')';
  if (!color) return fallback;
  var c = String(color).trim();
  var a = Math.max(0, Math.min(1, Number(alpha == null ? 1 : alpha)));
  if (/^rgba?\(/i.test(c)) return c;
  var m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return c;
  var hex = m[1];
  if (hex.length === 3) hex = hex.split('').map(function (ch) { return ch + ch; }).join('');
  var r = parseInt(hex.slice(0, 2), 16);
  var g = parseInt(hex.slice(2, 4), 16);
  var b = parseInt(hex.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function drawTextBadge(text, x, y, fill, stroke) {
  ctx.save();
  ctx.font = '11px monospace';
  var label = String(text || '');
  var w = Math.ceil(ctx.measureText(label).width) + 8;
  ctx.fillStyle = 'rgba(5,8,14,0.78)';
  ctx.fillRect(x - 3, y - 11, w, 15);
  ctx.strokeStyle = stroke || 'rgba(255,255,255,0.25)';
  ctx.strokeRect(x - 3, y - 11, w, 15);
  ctx.fillStyle = fill || '#fff';
  ctx.fillText(label, x + 1, y);
  ctx.restore();
}

function drawMultilineBadge(lines, x, y, fill, stroke) {
  var list = (Array.isArray(lines) ? lines : []).map(function (line) {
    if (line && typeof line === 'object') {
      return {
        text: String(line.text || ''),
        color: line.color || null,
        stroke: line.stroke || null
      };
    }
    return { text: String(line || ''), color: null, stroke: null };
  }).filter(function (line) { return !!line.text; });
  if (!list.length) return;
  ctx.save();
  ctx.font = '10px monospace';
  var maxW = 0;
  for (var i = 0; i < list.length; i++) maxW = Math.max(maxW, Math.ceil(ctx.measureText(list[i].text).width));
  var pad = 6;
  var lineH = 12;
  var boxW = maxW + pad * 2;
  var boxH = list.length * lineH + 4;
  ctx.fillStyle = 'rgba(5,8,14,0.78)';
  ctx.fillRect(x - 4, y - boxH + 3, boxW, boxH);
  ctx.strokeStyle = stroke || 'rgba(255,255,255,0.28)';
  ctx.strokeRect(x - 4, y - boxH + 3, boxW, boxH);
  for (var j = 0; j < list.length; j++) {
    var yy = y - boxH + 14 + j * lineH;
    var lineColor = list[j].color || fill || '#fff';
    var lineStroke = list[j].stroke || 'rgba(5,8,14,0.92)';
    ctx.lineWidth = 3;
    ctx.strokeStyle = lineStroke;
    ctx.strokeText(list[j].text, x + 1, yy);
    ctx.fillStyle = lineColor;
    ctx.fillText(list[j].text, x + 1, yy);
  }
  ctx.restore();
}

function pickRenderableColorCandidate(value) {
  if (!value) return null;
  var str = String(value).trim();
  if (!str || str === 'transparent' || str === 'none') return null;
  return str;
}

function getCoreDefaultSemanticFaceColor(semanticFace) {
  var api = getItemFacingCoreApi();
  if (!api || typeof api.getSemanticFaceColors !== 'function') return null;
  try {
    var colors = api.getSemanticFaceColors() || {};
    return pickRenderableColorCandidate(colors[semanticFace]);
  } catch (_) {
    return null;
  }
}

function resolveFaceDebugOverlayColor(renderable) {
  var semanticFace = String(renderable && renderable.semanticFace || '').toLowerCase();
  var resolved = null;
  var source = null;
  if (renderable) {
    resolved = pickRenderableColorCandidate(renderable.fill);
    if (resolved) source = 'renderable.fill';
    if (!resolved) {
      resolved = pickRenderableColorCandidate(renderable.stroke);
      if (resolved) source = 'renderable.stroke';
    }
    if (!resolved && renderable.texture) {
      resolved = pickRenderableColorCandidate(renderable.texture.color);
      if (resolved) source = 'texture.color';
    }
    if (!resolved) {
      resolved = pickRenderableColorCandidate(renderable.textureColor);
      if (resolved) source = 'texture.color';
    }
    if (!resolved && renderable.semanticTextureSlot) {
      resolved = pickRenderableColorCandidate(renderable.semanticTextureSlot.color);
      if (resolved) source = 'semanticTextureSlot.color';
    }
    if (!resolved) {
      resolved = pickRenderableColorCandidate(renderable.semanticTextureSlotColor);
      if (resolved) source = 'semanticTextureSlot.color';
    }
    if (!resolved && renderable.prefabId && typeof getPrefabById === 'function') {
      try {
        var prefab = getPrefabById(renderable.prefabId);
        if (prefab && prefab.semanticFaceColors && semanticFace) {
          resolved = pickRenderableColorCandidate(prefab.semanticFaceColors[semanticFace]);
          if (resolved) source = 'semanticFaceColors';
        }
      } catch (_) {}
    }
  }
  if (!resolved && semanticFace) {
    resolved = getCoreDefaultSemanticFaceColor(semanticFace);
    if (resolved) source = 'core-default-fallback';
  }
  if (!resolved) {
    resolved = '#ffffff';
    source = 'core-default-fallback';
  }
  return { color: resolved, source: source };
}

var __faceDebugOverlayHitCache = new Map();

function drawFaceDebugOverlayRenderable(renderable, drawIndex) {
  if (!showFaceDebugOverlay || !renderable) return;
  if (!(renderable.kind === 'voxel-face' || renderable.kind === 'debug-cuboid-face')) return;
  var pts = Array.isArray(renderable.points) && renderable.points.length
    ? renderable.points
    : (Array.isArray(renderable.worldPts) && renderable.worldPts.length ? screenPointsFromWorldFace(renderable.worldPts) : []);
  if (!pts.length) return;
  var centroid = averageScreenPoint(pts);
  var overlayColorInfo = resolveFaceDebugOverlayColor(renderable);
  var overlayColor = overlayColorInfo.color;
  drawMultilineBadge([
    { text: String(renderable.instanceId || renderable.id || 'face'), color: '#ffffff' },
    { text: String(renderable.semanticFace || '?') + ' -> ' + String(renderable.screenFace || '?'), color: overlayColor },
    { text: '#' + String(drawIndex), color: overlayColor }
  ], Math.round(centroid.x) + 8, Math.round(centroid.y) - 8, '#ffffff', overlayColor);
  var frameKey = [String(renderable.framePlanId || 'frame:none'), String(renderable.id || 'no-id'), String(drawIndex)].join('|');
  if (__faceDebugOverlayHitCache.get(frameKey)) return;
  __faceDebugOverlayHitCache.set(frameKey, true);
  var textureColor = pickRenderableColorCandidate(renderable.texture && renderable.texture.color) || pickRenderableColorCandidate(renderable.textureColor);
  var semanticTextureSlotColor = pickRenderableColorCandidate(renderable.semanticTextureSlot && renderable.semanticTextureSlot.color) || pickRenderableColorCandidate(renderable.semanticTextureSlotColor);
  logItemRotationPrototype('main-face-debug-overlay-hit', {
    currentViewRotation: normalizeMainEditorViewRotationValue(renderable.currentViewRotation != null ? renderable.currentViewRotation : getSafeMainEditorViewRotation(null).viewRotation),
    instanceId: renderable.instanceId || null,
    prefabId: renderable.prefabId || null,
    semanticFace: renderable.semanticFace || null,
    screenFace: renderable.screenFace || null,
    drawIndex: drawIndex,
    sortKey: renderable.sortKey != null ? renderable.sortKey : null,
    tie: renderable.tie != null ? renderable.tie : null,
    centroid: { x: Number(centroid.x.toFixed(2)), y: Number(centroid.y.toFixed(2)) },
    polygon: pts.map(function (pt) { return { x: Number(pt.x.toFixed(2)), y: Number(pt.y.toFixed(2)) }; })
  });
  logItemRotationPrototype('main-face-debug-overlay-color-check', {
    instanceId: renderable.instanceId || null,
    prefabId: renderable.prefabId || null,
    semanticFace: renderable.semanticFace || null,
    screenFace: renderable.screenFace || null,
    drawIndex: drawIndex,
    renderableFill: pickRenderableColorCandidate(renderable.fill),
    renderableStroke: pickRenderableColorCandidate(renderable.stroke),
    textureColor: textureColor,
    semanticTextureSlotColor: semanticTextureSlotColor,
    resolvedOverlayColor: overlayColor,
    overlayColorSource: overlayColorInfo.source,
    textureId: (renderable.texture && renderable.texture.textureId) || renderable.textureId || null,
    slotId: (renderable.semanticTextureSlot && renderable.semanticTextureSlot.textureId) || renderable.textureId || null
  });
}

function buildFiveFaceEntries(proto, prefab) {
  if (!proto) return [];
  var semantic = proto.semanticDirections || {};
  var colors = Object.assign({}, proto.semanticColors || {}, (prefab && prefab.semanticFaceColors) || {});
  var sourceFaces = proto.visibleSemanticFaces && proto.visibleSemanticFaces.length ? proto.visibleSemanticFaces : [
    { semantic: 'top', screenFace: 'top', color: colors.top },
    { semantic: 'north', screenFace: semantic.north || 'lowerRight', color: colors.north },
    { semantic: 'east', screenFace: semantic.east || 'lowerRight', color: colors.east },
    { semantic: 'south', screenFace: semantic.south || 'lowerLeft', color: colors.south },
    { semantic: 'west', screenFace: semantic.west || 'lowerLeft', color: colors.west }
  ];
  var seen = {};
  var entries = [];
  sourceFaces.forEach(function (entry) {
    var sem = String(entry.semantic || '').toLowerCase();
    if (!sem || seen[sem]) return;
    if (['top','north','east','south','west'].indexOf(sem) < 0) return;
    seen[sem] = true;
    entries.push({
      semantic: sem,
      screenFace: entry.screenFace || semantic[sem] || sem,
      color: entry.color || colors[sem] || '#fff',
      label: sem === 'top' ? 'TOP' : sem.toUpperCase()
    });
  });
  return entries;
}

function expandPreviewBoxesToUnitCells(previewBoxes) {
  var cells = [];
  var list = Array.isArray(previewBoxes) ? previewBoxes : [];
  list.forEach(function (box) {
    var w = Math.max(1, Math.round(Number(box && box.w) || 1));
    var d = Math.max(1, Math.round(Number(box && box.d) || 1));
    var h = Math.max(1, Math.round(Number(box && box.h) || 1));
    for (var z = 0; z < h; z++) {
      for (var y = 0; y < d; y++) {
        for (var x = 0; x < w; x++) {
          cells.push({
            x: Math.round(Number(box.x) || 0) + x,
            y: Math.round(Number(box.y) || 0) + y,
            z: Math.round(Number(box.z) || 0) + z,
            box: box
          });
        }
      }
    }
  });
  return cells;
}

function screenPointsFromWorldFace(worldPts) {
  return (Array.isArray(worldPts) ? worldPts : []).map(function (p) {
    return iso(p.x, p.y, p.z);
  });
}

function drawDebugFaceRenderable(face, alpha, valid) {
  if (!face || !Array.isArray(face.worldPts) || face.worldPts.length < 3) return false;
  var pts = screenPointsFromWorldFace(face.worldPts);
  var texture = face.texture || { textureId: face.textureId || '', kind: 'solid-color', color: face.color };
  var rawFill = getTextureFill(texture, face.color || '#fff');
  var fill = colorWithAlpha(rawFill, alpha == null ? 0.82 : alpha);
  var stroke = colorWithAlpha(rawFill, valid ? 1 : 0.68);
  drawPoly(pts, fill, stroke, 1.35);
  return true;
}


var __placedDebugFaceRenderLogCache = new Map();

function createOccupiedKeySetFromOccupancy(occ) {
  var out = new Set();
  if (!occ || !occ.values || typeof occ.values !== 'function') return out;
  for (const cell of occ.values()) {
    out.add(String(cell.x) + ',' + String(cell.y) + ',' + String(cell.z));
  }
  return out;
}

function buildPlacedDebugInstanceFaceRenderables(instance, prefab, occupiedSet, viewRotationInfo) {
  if (!instance || !prefab || !isFiveFaceDebugPrefab(prefab)) return [];
  var api = getItemFacingCoreApi();
  if (!api || typeof api.buildDebugCuboidFaceRenderables !== 'function') return [];
  viewRotationInfo = viewRotationInfo || getSafeMainEditorViewRotation(null);
  var viewRotation = normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation);
  var instBoxes = boxes.filter(function (b) { return b.instanceId === instance.instanceId; });
  if (!instBoxes.length) return [];
  var cells = instBoxes.map(function (b) {
    return { x: b.x, y: b.y, z: b.z, box: b, base: b.base };
  });
  var boxByKey = {};
  cells.forEach(function (c) { boxByKey[String(c.x) + ',' + String(c.y) + ',' + String(c.z)] = c.box || null; });
  var facing = instance.rotation != null ? instance.rotation : 0;
  var renderData = api.buildDebugCuboidFaceRenderables({
    prefab: prefab,
    cells: cells,
    itemFacing: facing,
    viewRotation: viewRotation,
    ownerId: 'instance:' + String(instance.instanceId || prefab.id || 'unknown'),
    occupiedSet: occupiedSet
  });
  if (!renderData || !Array.isArray(renderData.faceRenderables) || !renderData.faceRenderables.length) return [];
  logItemRotationPrototype('main-render-face-binding-snapshot', {
    currentViewRotation: viewRotation,
    instanceId: instance.instanceId || null,
    prefabId: prefab.id || null,
    instanceFacing: facing,
    effectiveFacing: renderData.visibleSemanticFaces && typeof renderData.visibleSemanticFaces.effectiveFacing === 'number' ? renderData.visibleSemanticFaces.effectiveFacing : null,
    visibleSemanticFaces: renderData.visibleSemanticFaces && Array.isArray(renderData.visibleSemanticFaces.visibleFaces) ? renderData.visibleSemanticFaces.visibleFaces.slice() : [],
    screenFaceToSemanticFace: renderData.visibleSemanticFaces && renderData.visibleSemanticFaces.screenFaces ? renderData.visibleSemanticFaces.screenFaces : {},
    semanticFaceToTextureSlot: renderData.semanticTextureMap || {},
    emittedFaces: renderData.faceRenderables.map(function (face) {
      return {
        semanticFace: face.semanticFace || null,
        screenFace: face.screenFace || null,
        textureId: face.textureId || null,
        polygon: face.worldPts || face.polygon || [],
        depthKey: face.depthKey != null ? face.depthKey : null
      };
    })
  });
  var domainCore = getDomainSceneCoreApi();
  var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
  var renderables = renderData.faceRenderables.map(function (face) {
    var key = String(face.cell && face.cell.x || 0) + ',' + String(face.cell && face.cell.y || 0) + ',' + String(face.cell && face.cell.z || 0);
    var box = boxByKey[key] || null;
    var orderMeta = domainCore && typeof domainCore.computeVoxelRenderableSort === 'function'
      ? domainCore.computeVoxelRenderableSort({ cell: face.cell || { x: 0, y: 0, z: 0 }, box: box, viewRotation: viewRotation })
      : computeViewAwareSortMeta(face.cell || { x: 0, y: 0, z: 0 }, 1, viewRotation);
    var screenPts = screenPointsFromWorldFace(face.worldPts || face.polygon || []);
    return {
      id: 'debug-face-' + String(face.faceId || key),
      kind: 'debug-cuboid-face',
      sortKey: Number(orderMeta.sortKey || 0),
      tie: Number(orderMeta.tie || 0) + ((faceTiePrio[face.screenFace] || 0) * 0.01),
      semanticFace: face.semanticFace,
      screenFace: face.screenFace,
      textureId: face.textureId,
      texture: face.texture || null,
      textureColor: face.texture && face.texture.color || face.color || null,
      semanticTextureSlot: face.texture || null,
      semanticTextureSlotColor: face.texture && face.texture.color || face.color || null,
      fill: getTextureFill(face.texture || { textureId: face.textureId || '', kind: 'solid-color', color: face.color }, face.color || '#fff'),
      stroke: colorWithAlpha(getTextureFill(face.texture || { textureId: face.textureId || '', kind: 'solid-color', color: face.color }, face.color || '#fff'), 0.95),
      depthKey: face.depthKey,
      instanceId: instance.instanceId || null,
      prefabId: prefab.id || null,
      renderPath: 'dynamic-renderables',
      drawScreenPosition: averageScreenPoint(screenPts),
      points: screenPts,
      worldPts: face.worldPts || face.polygon || [],
      cellX: Number(face.cell && face.cell.x || 0),
      cellY: Number(face.cell && face.cell.y || 0),
      cellZ: Number(face.cell && face.cell.z || 0),
      faceKey: [instance.instanceId || 'unknown', [Number(face.cell && face.cell.x || 0), Number(face.cell && face.cell.y || 0), Number(face.cell && face.cell.z || 0)].join(','), face.semanticFace || '', face.screenFace || ''].join('|'),
      draw: function () { drawDebugFaceRenderable(face, 1, true); }
    };
  });
  var logKey = [instance.instanceId, facing, viewRotation, instBoxes.length].join('|');
  logFaceGeometryOracleChecks(renderData.faceRenderables, {
    currentViewRotation: viewRotation,
    instanceId: instance.instanceId || null,
    prefabId: prefab.id || null
  });
  if (__placedDebugFaceRenderLogCache.get(instance.instanceId) !== logKey) {
    __placedDebugFaceRenderLogCache.set(instance.instanceId, logKey);
    logItemRotationPrototype('debug-face-render', {
      mode: 'placed-instance-real-face-renderables',
      prefabId: prefab.id || null,
      instanceId: instance.instanceId || null,
      instanceFacing: facing,
      viewRotation: viewRotation,
      renderedAsRealFaces: true,
      renderedAsOverlay: false,
      helperLayerUsed: false,
      boxBaseUsedForDebugFaces: false,
      visibleSemanticFaces: renderData.visibleSemanticFaces ? renderData.visibleSemanticFaces.visibleFaces : [],
      renderedFaces: renderData.faceRenderables.map(function (f) {
        return {
          faceId: f.faceId,
          semanticFace: f.semanticFace,
          screenFace: f.screenFace,
          textureId: f.textureId,
          color: f.color,
          polygon: screenPointsFromWorldFace(f.worldPts || f.polygon || []),
          depthKey: f.depthKey,
          cell: f.cell
        };
      }),
      faceDrawOrder: renderData.faceDrawOrder || [],
      semanticTextureMap: getSemanticTextureMapForRender(prefab),
      topColor: (getSemanticTextureMapForRender(prefab).top || {}).color || null,
      northColor: (getSemanticTextureMapForRender(prefab).north || {}).color || null,
      eastColor: (getSemanticTextureMapForRender(prefab).east || {}).color || null,
      southColor: (getSemanticTextureMapForRender(prefab).south || {}).color || null,
      westColor: (getSemanticTextureMapForRender(prefab).west || {}).color || null
    });
  }
  return renderables;
}

function buildDebugPreviewFaceRenderables(args) {
  args = args || {};
  var previewPrefab = args.prefab || args.previewPrefab || null;
  var previewBoxes = Array.isArray(args.previewBoxes) ? args.previewBoxes : [];
  var facing = args.previewFacing != null ? args.previewFacing : (args.facing != null ? args.facing : 0);
  var viewRotationInfo = args.viewRotationInfo || getSafeMainEditorViewRotation(args.snapshot || null);
  var viewRotation = normalizeMainEditorViewRotationValue(
    args.viewRotation != null ? args.viewRotation : viewRotationInfo.viewRotation
  );
  var api = getItemFacingCoreApi();
  if (!api || typeof api.buildDebugCuboidFaceRenderables !== 'function') return null;
  var cells = expandPreviewBoxesToUnitCells(previewBoxes);
  return api.buildDebugCuboidFaceRenderables({
    prefab: previewPrefab,
    cells: cells,
    itemFacing: facing,
    viewRotation: viewRotation,
    ownerId: 'placement-preview:' + String(previewPrefab && previewPrefab.id || 'unknown')
  });
}

function drawDebugFiveFacePlacementPreview(previewPrefab, proto, ok, previewBoxes, viewRotationInfo) {
  viewRotationInfo = viewRotationInfo || getSafeMainEditorViewRotation(null);
  var viewRotation = normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation);
  if (!isFiveFaceDebugPrefab(previewPrefab)) return false;
  if (!editor || !editor.preview || !editor.preview.bbox) return false;
  var facing = editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue();
  var renderData = buildDebugPreviewFaceRenderables({
    prefab: previewPrefab,
    previewBoxes: previewBoxes || editor.preview.boxes || [],
    previewFacing: facing,
    viewRotation: viewRotation,
    viewRotationInfo: viewRotationInfo
  });
  if (!renderData || !Array.isArray(renderData.faceRenderables) || !renderData.faceRenderables.length) return false;
  var drawn = [];
  ctx.save();
  renderData.faceRenderables.forEach(function (face) {
    if (drawDebugFaceRenderable(face, ok ? 0.88 : 0.38, !!ok)) drawn.push(face);
  });
  ctx.restore();
  var renderedFaces = drawn.map(function (f) {
    return {
      faceId: f.faceId,
      semanticFace: f.semanticFace,
      screenFace: f.screenFace,
      textureId: f.textureId || (f.texture && f.texture.textureId) || null,
      texture: f.texture || null,
      color: f.color,
      polygon: screenPointsFromWorldFace(f.worldPts || f.polygon || []),
      depthKey: f.depthKey,
      cell: f.cell
    };
  });
  var visibleMap = renderData.visibleSemanticFaces || getSemanticFaceMappingForPreview(previewPrefab, facing);
  logItemRotationPrototype('preview-renderable-faces', {
    prefabId: previewPrefab.id || null,
    previewFacing: facing,
    viewRotation: viewRotation,
    voxelCount: expandPreviewBoxesToUnitCells(previewBoxes || editor.preview.boxes || []).length,
    faceRenderableCount: renderedFaces.length,
    sortedFaceOrder: renderedFaces.map(function (f) { return f.faceId; }),
    semanticTextureMap: getSemanticTextureMapForRender(previewPrefab),
    textureIds: renderedFaces.map(function (f) { return f.textureId; })
  });
  logItemRotationPrototype('debug-face-render', {
    mode: 'placement-preview-real-face-renderables',
    prefabId: previewPrefab.id || null,
    previewFacing: facing,
    viewRotation: viewRotation,
    renderedAsRealFaces: true,
    renderedAsOverlay: false,
    helperLayerUsed: false,
    baseMonochromeSuppressed: true,
    visibleSemanticFaces: visibleMap ? visibleMap.visibleFaces : renderedFaces.map(function (f) { return f.semanticFace; }),
    renderedFaces: renderedFaces,
    faceDrawOrder: renderedFaces.map(function (f) { return f.faceId; }),
    semanticTextureMap: getSemanticTextureMapForRender(previewPrefab),
    topTexture: getSemanticTextureMapForRender(previewPrefab).top || null,
    northTexture: getSemanticTextureMapForRender(previewPrefab).north || null,
    eastTexture: getSemanticTextureMapForRender(previewPrefab).east || null,
    southTexture: getSemanticTextureMapForRender(previewPrefab).south || null,
    westTexture: getSemanticTextureMapForRender(previewPrefab).west || null,
    topColor: (getSemanticTextureMapForRender(previewPrefab).top || {}).color || null,
    northColor: (getSemanticTextureMapForRender(previewPrefab).north || {}).color || null,
    eastColor: (getSemanticTextureMapForRender(previewPrefab).east || {}).color || null,
    southColor: (getSemanticTextureMapForRender(previewPrefab).south || {}).color || null,
    westColor: (getSemanticTextureMapForRender(previewPrefab).west || {}).color || null,
    footprint: editor.preview.bbox ? { w: editor.preview.bbox.w, d: editor.preview.bbox.d, h: editor.preview.bbox.h } : null,
    origin: editor.preview.origin || null,
    valid: !!editor.preview.valid
  });
  return true;
}


function drawFacingLegendPanel(proto, anchorPoint) {
  if (!proto || !anchorPoint) return;
  var colors = proto.semanticColors || {};
  var entries = [
    ['TOP', colors.top],
    ['NORTH', colors.north],
    ['EAST', colors.east],
    ['SOUTH', colors.south],
    ['WEST', colors.west]
  ];
  var x = Math.round(anchorPoint.x + 14);
  var y = Math.round(anchorPoint.y - 70);
  ctx.save();
  ctx.fillStyle = 'rgba(10,15,24,0.82)';
  ctx.fillRect(x, y, 146, 86);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.strokeRect(x, y, 146, 86);
  ctx.fillStyle = 'rgba(230,240,255,0.96)';
  ctx.font = '11px monospace';
  ctx.fillText('Facing ' + String(proto.facingLabel || '?') + ' · ' + String(proto.spriteStrategy || 'single'), x + 8, y + 14);
  for (var i = 0; i < entries.length; i++) {
    var rowY = y + 30 + i * 11;
    ctx.fillStyle = entries[i][1] || '#fff';
    ctx.fillRect(x + 8, rowY - 8, 10, 8);
    ctx.fillStyle = 'rgba(230,240,255,0.96)';
    ctx.fillText(entries[i][0], x + 24, rowY);
  }
  ctx.restore();
}

function drawItemFacingPrototypeOverlay() {
  if (!ui.showItemFacingDebug || !ui.showItemFacingDebug.checked) return;
  var target = null;
  var bounds = null;
  var prefab = null;
  var rotation = 0;
  var anchorPoint = null;

  if (editor && editor.mode === 'place' && editor.preview && editor.preview.bbox) {
    prefab = currentPrefab();
    rotation = editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue();
    bounds = editor.preview.bbox ? { x: editor.preview.bbox.x, y: editor.preview.bbox.y, z: editor.preview.bbox.z, w: editor.preview.bbox.w, d: editor.preview.bbox.d, h: editor.preview.bbox.h } : null;
    target = Object.assign({}, editor.preview.origin || {}, { rotation: rotation });
    anchorPoint = bounds ? iso(bounds.x, bounds.y, bounds.z + bounds.h) : null;
  } else {
    var inst = getSelectedInstance();
    if (!inst) return;
    prefab = getPrefabById(inst.prefabId);
    rotation = inst.rotation || 0;
    var b = getInstanceProxyBounds(inst);
    if (!b) return;
    bounds = { x: b.minX, y: b.minY, z: b.minZ, w: b.maxX - b.minX, d: b.maxY - b.minY, h: b.maxZ - b.minZ };
    target = inst;
    anchorPoint = iso(bounds.x, bounds.y, bounds.z + bounds.h);
  }

  var proto = buildFacingOverlayPrototype(prefab, rotation, target);
  if (!proto || !bounds) return;
  if (editor && editor.mode === 'place' && isFiveFaceDebugPrefab(prefab)) return;
  var polys = getFacingFacePolygons(bounds);
  if (!polys) return;
  var semantic = proto.semanticDirections || {};
  var colors = proto.semanticColors || {};
  var faces = (proto.visibleSemanticFaces && proto.visibleSemanticFaces.length) ? proto.visibleSemanticFaces.map(function (entry) {
    return { semantic: entry.semantic, dir: entry.screenFace || semantic[entry.semantic] || entry.semantic, color: entry.color || colors[entry.semantic], label: String(entry.semantic || '?').slice(0, 1).toUpperCase() };
  }) : [
    { semantic: 'top', dir: 'top', color: colors.top, label: 'T' },
    { semantic: 'north', dir: semantic.north || 'north', color: colors.north, label: 'N' },
    { semantic: 'east', dir: semantic.east || 'east', color: colors.east, label: 'E' },
    { semantic: 'south', dir: semantic.south || 'south', color: colors.south, label: 'S' },
    { semantic: 'west', dir: semantic.west || 'west', color: colors.west, label: 'W' }
  ];
  logItemRotationPrototype('debug-face-render', {
    prefabId: boxSemanticInput && boxSemanticInput.id || prefab && prefab.id || null,
    previewFacing: rotation,
    visibleSemanticFaces: faces.map(function (f) { return f.semantic; }),
    topColor: colors.top || null,
    northColor: colors.north || null,
    eastColor: colors.east || null,
    southColor: colors.south || null,
    westColor: colors.west || null
  });
  ctx.save();
  ctx.font = '11px monospace';
  faces.forEach(function (entry) {
    var poly = polys[entry.dir];
    if (!poly) return;
    drawPoly(poly, colorWithAlpha(entry.color || '#fff', 0.38), entry.color || '#fff', 1.7);
    var mid = averageScreenPoint(poly);
    drawTextBadge(entry.label, mid.x + 2, mid.y - 2, entry.color || '#fff', entry.color || '#fff');
  });
  ctx.restore();
  drawFacingLegendPanel(proto, anchorPoint);
}

function drawSelectedInstanceHighlight() {
  var inst = getSelectedInstance();
  if (!inst) return;
  var targetBoxes = boxes.filter(function (b) { return b.instanceId === inst.instanceId; });
  if (!targetBoxes.length) return;
  var occ = buildOccupancy(targetBoxes);
  for (const cell of occ.values()) {
    drawVoxelCell({ x: cell.x, y: cell.y, z: cell.z, base: '#6fb7ff' }, occ, 0.18);
  }
  var top = targetBoxes.reduce(function (best, b) {
    var score = b.x + b.y + b.z + b.h;
    if (!best || score > best.score) return { box: b, score: score };
    return best;
  }, null);
  if (top && top.box) {
    var topPt = iso(top.box.x, top.box.y, top.box.z + top.box.h);
    ctx.fillStyle = 'rgba(120,190,255,.95)';
    ctx.font = '13px sans-serif';
    ctx.fillText(`选中: ${inst.instanceId} / ${getPrefabById(inst.prefabId).name}`, topPt.x + 8, topPt.y - 8);
  }
}

function drawDeleteHover() {
if (!editor.hoverDeleteBox) return;
var b = editor.hoverDeleteBox;
var targetBoxes = b && b.instanceId ? boxes.filter(function (item) { return item.instanceId === b.instanceId; }) : [b];
var occ = buildOccupancy(targetBoxes);
for (const cell of occ.values()) {
  drawVoxelCell({ x: cell.x, y: cell.y, z: cell.z, base: '#ff6b6b' }, occ, 0.33);
}
var topPt = iso(b.x, b.y, b.z + b.h);
ctx.fillStyle = 'rgba(255,120,120,.95)';
ctx.font = '13px sans-serif';
ctx.fillText(`删除: ${b.name}${b.instanceId ? ' ' + b.instanceId : ' #' + b.id}`, topPt.x + 8, topPt.y - 8);
}

function drawPlacementPreview() {
  if (!editor.preview) return;
  var previewBoxes = editor.preview.boxes || [];
  if (!previewBoxes.length) return;
  var b = editor.preview.box;
  var ok = editor.preview.valid;
  var fill = ok ? 'rgba(54, 201, 108, .22)' : 'rgba(240, 73, 73, .22)';
  var stroke = ok ? 'rgba(80, 255, 148, 1)' : 'rgba(255, 84, 84, 1)';
  var proto = editor.mode === 'drag' && editor.draggingInstance ? prefabVariant(getPrefabById(editor.draggingInstance.prefabId), editor.draggingInstance.rotation || 0) : currentProto();
  var origin = editor.preview.origin || null;

  var previewPrefab = editor.mode === 'drag' && editor.draggingInstance ? getPrefabById(editor.draggingInstance.prefabId) : currentProto();
  var viewRotationInfo = getSafeMainEditorViewRotation(null);
  logRenderDependency('main-editor-view-rotation', {
    hasViewRotation: viewRotationInfo.hasViewRotation,
    viewRotation: viewRotationInfo.viewRotation,
    fallbackUsed: viewRotationInfo.fallbackUsed,
    source: viewRotationInfo.source,
    previewFacing: editor.preview && editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue(),
    prefabId: previewPrefab && previewPrefab.id || null
  });
  var previewShift = previewPrefab && previewPrefab.kind === 'habbo_import'
    ? getHabboProxyVisualShift(previewPrefab, editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue())
    : { x: 0, y: 0 };

  if (origin) {
    withScreenTranslate(previewShift, function () {
      for (var i = 0; i < (proto.supportCells || []).length; i++) {
        var support = proto.supportCells[i];
        var p0 = iso(origin.x + support.x,     origin.y + support.y,     origin.z + support.localZ);
        var p1 = iso(origin.x + support.x + 1, origin.y + support.y,     origin.z + support.localZ);
        var p2 = iso(origin.x + support.x + 1, origin.y + support.y + 1, origin.z + support.localZ);
        var p3 = iso(origin.x + support.x,     origin.y + support.y + 1, origin.z + support.localZ);
        drawPoly([p0, p1, p2, p3], fill, stroke, 2.5);
      }
    });
  }

  var occ = buildOccupancy(previewBoxes);
  var drewFiveFacePreview = false;
  withScreenTranslate(previewShift, function () {
    if (previewPrefab && isFiveFaceDebugPrefab(previewPrefab)) {
      drewFiveFacePreview = drawDebugFiveFacePlacementPreview(previewPrefab, proto, ok, previewBoxes, viewRotationInfo);
    }
    if (!drewFiveFacePreview) {
      for (var cell of occ.values()) drawVoxelCell({ x: cell.x, y: cell.y, z: cell.z, base: cell.box.base }, occ, ok ? 0.42 : 0.22);
    }
  });
  if (origin) {
    if (previewPrefab && prefabHasSprite(previewPrefab)) {
      if (previewPrefab.kind === 'habbo_import') {
        detailLog('[place-trace] src/presentation/render/render.js::drawPlacementPreview preview-habbo-sprite prefab=' + previewPrefab.id + ' origin=(' + [origin.x, origin.y, origin.z].join(',') + ') rotation=' + String(editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue()) + ' valid=' + ok + ' proxyShift=(' + [previewShift.x || 0, previewShift.y || 0].join(',') + ')');
      }
      drawPrefabSpriteAt(previewPrefab, Object.assign({}, origin, { rotation: editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue() }), ok ? 0.78 : 0.42);
    }
  }

  ctx.fillStyle = stroke;
  ctx.font = '13px sans-serif';
  var labelPt = b
    ? iso(b.x, b.y, b.z + b.h)
    : (origin
        ? iso(origin.x, origin.y, origin.z + 1)
        : iso(previewBoxes[0].x, previewBoxes[0].y, previewBoxes[0].z + 1));
  var labelX = labelPt.x + 6;
  var labelY = labelPt.y - 8;
  var status = ok
    ? `${b.name} 体素=${previewBoxes.length} 尺寸 ${b.w}×${b.d}×${b.h}`
    : `不可放置：${editor.preview.reason} / prefab=${editor.preview.prefabId || proto.id || 'n/a'} / 体素=${previewBoxes.length}`;
  ctx.fillText(status, labelX, labelY);
  if (!ok && editor.preview.reason === 'player' && origin) {
    ctx.fillText(`阻挡：玩家占位 (${origin.x}, ${origin.y}, z=${origin.z})`, labelX, labelY - 16);
  }
}

function buildRenderables() {
  const buildStartAt = perfNow();
  const viewRotationInfo = getSafeMainEditorViewRotation(null);
  const cameraScope = getMainCameraRenderScope(viewRotationInfo.viewRotation);
  const terrainModel = getTerrainRuntimeModelForRender();
  const terrainBuildStartAt = perfNow();
  const terrainBuild = { renderables: [], stats: { terrainCellCount: 0, terrainColumnCount: 0, terrainExpandedVoxelInstanceCount: 0, terrainUsesColumnModel: false, visibleColumnCount: 0, visibleChunkCount: 0, culledColumnCount: 0, culledChunkCount: 0, terrainBuildWasScoped: false, logicalVoxelCountEstimated: 0, visibleTopFaceCount: 0, visibleSideFaceCount: 0, internalVoxelSkippedCount: 0, hiddenInternalSurfaceSkippedCount: 0, renderableCount: 0, buildMode: 'shared-block-pipeline' } };
  const terrainBuildMs = Math.max(0, perfNow() - terrainBuildStartAt);
  rebuildStaticBoxRenderCacheIfNeeded();
  const afterStaticCacheAt = perfNow();
  const staticRenderablesAll = staticBoxRenderCache.renderables || [];
  const dynamicRenderables = [];
  const visibleOcc = buildOccupancy(boxes.filter(function (b) { return prefabDrawsVoxels(getPrefabById(b.prefabId)); }));
  const occupiedKeySet = createOccupiedKeySetFromOccupancy(visibleOcc);
  const visibleInstances = filterInstancesForMainCameraScope(instances, cameraScope);

  for (const inst of visibleInstances) {
    const prefab = getPrefabById(inst.prefabId);
    if (prefab && isFiveFaceDebugPrefab(prefab) && prefabDrawsVoxels(prefab)) {
      const placedFaces = buildPlacedDebugInstanceFaceRenderables(inst, prefab, occupiedKeySet, viewRotationInfo);
      for (const item of placedFaces) dynamicRenderables.push(item);
    } else if (prefab && prefab.kind === 'habbo_import' && prefabDrawsVoxels(prefab)) {
      const shift = getHabboInstanceVisualShift(inst, prefab);
      const instBoxes = filterBoxesForMainCameraScope(boxes.filter(function (b) { return b.instanceId === inst.instanceId; }), cameraScope);
      for (const cell of instBoxes) {
        const item = buildShiftedVoxelRenderable({ x: cell.x, y: cell.y, z: cell.z, box: cell, base: cell.base }, visibleOcc, shift, 'habbo-voxel-' + inst.instanceId);
        if (item) dynamicRenderables.push(item);
      }
    }
    if (prefabHasSprite(prefab)) {
      const spriteSort = computeSpriteRenderableSort(inst, prefab);
      if (inst.__lastSpriteOcclusion !== spriteSort.occlusion) {
        inst.__lastSpriteOcclusion = spriteSort.occlusion;
        detailLog(`sprite-sort: ${inst.instanceId} prefab=${prefab.id} mode=${getSpriteProxySortMode(prefab)} occlusion=${spriteSort.occlusion} sortKey=${spriteSort.sortKey.toFixed(4)}`);
      }
      dynamicRenderables.push({
        id: 'sprite-' + inst.instanceId,
        kind: 'prefab-sprite',
        sortKey: spriteSort.sortKey,
        tie: spriteSort.tie,
        instanceId: inst.instanceId || null,
        prefabId: boxSemanticInput && boxSemanticInput.id || prefab && prefab.id || null,
        renderPath: 'dynamic-renderables',
        worldBounds: getInstanceWorldBoundsForRender(inst),
        drawScreenPosition: deriveRenderableDrawPosition({ debugFoot: iso(Number(inst && inst.x || 0) + 0.5, Number(inst && inst.y || 0) + 0.5, Number(inst && inst.z || 0)) }),
        worldX: Number(inst && inst.x || 0) + 0.5,
        worldY: Number(inst && inst.y || 0) + 0.5,
        draw: () => {
          const drawn = drawPrefabSpriteInstance(inst, 1);
          if (!drawn && !prefabDrawsVoxels(prefab)) drawInstanceProxyBoxes(inst, 0.82);
        },
      });
    }
  }

  if (SHOW_PLAYER && pointWithinWorldBoundsXY(player.x, player.y, cameraScope.cullingWorldBounds)) {
    const playerLine = player.x + player.y + 0.001;
    for (const s of getPlayerSlices()) {
      var playerSortMeta = (getDomainSceneCoreApi() && typeof getDomainSceneCoreApi().computePlayerSliceRenderableSort === 'function')
        ? getDomainSceneCoreApi().computePlayerSliceRenderableSort({ slice: s, player: player, viewRotation: normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation) })
        : Object.assign({ tie: 500000 + s.z * 1000 }, computeViewAwareSortMeta({ x: player.x, y: player.y, z: s.z }, 0, normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation)));
      dynamicRenderables.push({
        id: s.id,
        kind: 'player-slice',
        sortKey: playerSortMeta.sortKey,
        tie: playerSortMeta.tie,
        worldX: Number(player.x || 0),
        worldY: Number(player.y || 0),
        draw: () => drawPlayerSlice(s),
      });
    }
  }

  dynamicRenderables.sort(compareRenderablesByDomain);
  const beforeVisibilityAt = perfNow();
  const staticRenderables = filterRenderablesForMainCameraScope(staticRenderablesAll, cameraScope);
  const dynamicRenderablesCulled = dynamicRenderables;
  const renderables = mergeSortedRenderables(staticRenderables, dynamicRenderablesCulled);
  const visibleLightsForStats = getMainCameraVisibleLightsForRender(viewRotationInfo.viewRotation);
  const afterVisibilityAt = perfNow();
  const surfaceStats = __lastSurfaceCacheStats || { visibleTopFaceCount: 0, visibleSideFaceCount: 0, hiddenInternalSurfaceSkippedCount: 0, terrainColumnCount: 0, logicalVoxelCountEstimated: 0, voxelFurnitureProcessedCount: 0, surfaceOnlyRenderingEnabled: true };
  const terrainStats = terrainBuild && terrainBuild.stats ? terrainBuild.stats : { visibleColumnCount: 0, culledColumnCount: 0, visibleChunkCount: 0, culledChunkCount: 0, terrainColumnCount: 0, logicalVoxelCountEstimated: 0, visibleTopFaceCount: 0, visibleSideFaceCount: 0, internalVoxelSkippedCount: 0, hiddenInternalSurfaceSkippedCount: 0, terrainBuildWasScoped: true, terrainCellCount: 0, terrainExpandedVoxelInstanceCount: 0, terrainUsesColumnModel: false };
  __lastMainRenderableBuildStats = {
    currentViewRotation: normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation),
    staticRenderableCount: staticRenderables.length,
    dynamicRenderableCount: dynamicRenderablesCulled.length,
    staticRenderableCountBeforeCulling: staticRenderablesAll.length,
    dynamicRenderableCountBeforeCulling: dynamicRenderables.length,
    renderablesBeforeCulling: staticRenderablesAll.length + dynamicRenderables.length,
    renderablesAfterCulling: renderables.length,
    cameraCullingEnabled: cameraScope.cameraCullingEnabled !== false,
    zoom: cameraScope.zoom,
    reason: 'buildRenderables',
    terrainBuildMs: terrainBuildMs,
    staticBuildMs: Math.max(0, afterStaticCacheAt - (terrainBuildStartAt + terrainBuildMs)),
    dynamicBuildMs: Math.max(0, beforeVisibilityAt - afterStaticCacheAt),
    renderSourceBuildMs: Math.max(0, afterStaticCacheAt - buildStartAt) + terrainBuildMs,
    visibilityFilterMs: Math.max(0, afterVisibilityAt - beforeVisibilityAt),
    visibleSurfaceCount: Number(surfaceStats.visibleTopFaceCount || 0) + Number(surfaceStats.visibleSideFaceCount || 0) + Number(terrainStats.visibleTopFaceCount || 0) + Number(terrainStats.visibleSideFaceCount || 0),
    hiddenInternalSurfaceSkippedCount: Number(surfaceStats.hiddenInternalSurfaceSkippedCount || 0) + Number(terrainStats.hiddenInternalSurfaceSkippedCount || 0),
    worldObjectCount: Number(instances.length || 0) + Number(lights.length || 0) + Number(boxes.length || 0) + Number(terrainStats.terrainCellCount || 0),
    lightSourcesBeforeCulling: Number(lights.length || 0),
    lightSourcesAfterCulling: Number(visibleLightsForStats.length || 0),
    objectsBeforeCulling: Number(instances.length || 0),
    objectsAfterCulling: Number(visibleInstances.length || 0)
  };
  __lastRenderVisibilityStats = {
    worldObjectCount: __lastMainRenderableBuildStats.worldObjectCount,
    renderSourceCountBeforeVisibility: __lastMainRenderableBuildStats.renderablesBeforeCulling + __lastMainRenderableBuildStats.lightSourcesBeforeCulling,
    renderSourceCountAfterVisibility: __lastMainRenderableBuildStats.renderablesAfterCulling + __lastMainRenderableBuildStats.lightSourcesAfterCulling,
    culledByCameraCount: Math.max(0, (__lastMainRenderableBuildStats.renderablesBeforeCulling + __lastMainRenderableBuildStats.lightSourcesBeforeCulling) - (__lastMainRenderableBuildStats.renderablesAfterCulling + __lastMainRenderableBuildStats.lightSourcesAfterCulling)),
    visibleSurfaceCount: __lastMainRenderableBuildStats.visibleSurfaceCount,
    hiddenInternalSurfaceSkippedCount: __lastMainRenderableBuildStats.hiddenInternalSurfaceSkippedCount,
    terrainSourcesBeforeCulling: Number(terrainStats.terrainColumnCount || 0),
    terrainSourcesAfterCulling: Number(terrainStats.visibleColumnCount || 0),
    objectsBeforeCulling: Number(__lastMainRenderableBuildStats.objectsBeforeCulling || 0),
    objectsAfterCulling: Number(__lastMainRenderableBuildStats.objectsAfterCulling || 0),
    terrainColumnCount: Number(terrainStats.terrainColumnCount || 0),
    logicalVoxelCountEstimated: Number(terrainStats.logicalVoxelCountEstimated || 0) + Number(surfaceStats.logicalVoxelCountEstimated || 0),
    voxelFurnitureProcessedCount: Number(surfaceStats.voxelFurnitureProcessedCount || 0),
    surfaceOnlyRenderingEnabled: (surfaceStats.surfaceOnlyRenderingEnabled !== false) && (terrainStats.surfaceOnlyRenderingEnabled !== false),
    renderSourceBuildMs: __lastMainRenderableBuildStats.renderSourceBuildMs,
    visibilityFilterMs: __lastMainRenderableBuildStats.visibilityFilterMs,
    finalRenderableCount: renderables.length,
    cameraZoom: cameraScope.zoom,
    currentViewRotation: normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation),
    terrainBuildMs: terrainBuildMs,
    staticBuildMs: __lastMainRenderableBuildStats.staticBuildMs,
    dynamicBuildMs: __lastMainRenderableBuildStats.dynamicBuildMs,
    visibleChunkCount: Number(terrainStats.visibleChunkCount || 0),
    culledChunkCount: Number(terrainStats.culledChunkCount || 0),
    terrainCellCount: Number(terrainStats.terrainCellCount || 0),
    terrainExpandedVoxelInstanceCount: Number(terrainStats.terrainExpandedVoxelInstanceCount || 0),
    terrainUsesColumnModel: terrainStats.terrainUsesColumnModel === true,
    terrainBatchDrawCount: Number(terrainStats.terrainBatchDrawCount || 0),
    terrainVisibleFaceCount: Number(terrainStats.terrainVisibleFaceCount || 0),
    terrainVisibleChunkCount: Number(terrainStats.visibleChunkCount || 0)
  };
  logItemRotationPrototype('render-camera-culling-summary', {
    cameraCullingEnabled: cameraScope.cameraCullingEnabled !== false,
    viewportWorldBounds: cameraScope.viewportWorldBounds,
    cullingWorldBounds: cameraScope.cullingWorldBounds,
    objectsBeforeCulling: Number(__lastRenderVisibilityStats.objectsBeforeCulling || 0),
    objectsAfterCulling: Number(__lastRenderVisibilityStats.objectsAfterCulling || 0),
    terrainSourcesBeforeCulling: Number(__lastRenderVisibilityStats.terrainSourcesBeforeCulling || 0),
    terrainSourcesAfterCulling: Number(__lastRenderVisibilityStats.terrainSourcesAfterCulling || 0),
    lightSourcesBeforeCulling: Number(__lastMainRenderableBuildStats.lightSourcesBeforeCulling || 0),
    lightSourcesAfterCulling: Number(__lastMainRenderableBuildStats.lightSourcesAfterCulling || 0)
  });

  logItemRotationPrototype('render-surface-cache-summary', {
    terrainColumnCount: Number(__lastRenderVisibilityStats.terrainColumnCount || 0),
    logicalVoxelCountEstimated: Number(__lastRenderVisibilityStats.logicalVoxelCountEstimated || 0),
    visibleTopFaceCount: Number((terrainStats && terrainStats.visibleTopFaceCount) || 0) + Number((surfaceStats && surfaceStats.visibleTopFaceCount) || 0),
    visibleSideFaceCount: Number((terrainStats && terrainStats.visibleSideFaceCount) || 0) + Number((surfaceStats && surfaceStats.visibleSideFaceCount) || 0),
    internalVoxelSkippedCount: Number((terrainStats && terrainStats.internalVoxelSkippedCount) || 0) + Number((surfaceStats && surfaceStats.internalVoxelSkippedCount) || 0),
    voxelFurnitureProcessedCount: Number(__lastRenderVisibilityStats.voxelFurnitureProcessedCount || 0),
    surfaceOnlyRenderingEnabled: __lastRenderVisibilityStats.surfaceOnlyRenderingEnabled !== false
  });
  logItemRotationPrototype('render-visibility-summary', {
    worldObjectCount: Number(__lastRenderVisibilityStats.worldObjectCount || 0),
    renderSourceCountBeforeVisibility: Number(__lastRenderVisibilityStats.renderSourceCountBeforeVisibility || 0),
    renderSourceCountAfterVisibility: Number(__lastRenderVisibilityStats.renderSourceCountAfterVisibility || 0),
    culledByCameraCount: Number(__lastRenderVisibilityStats.culledByCameraCount || 0),
    visibleSurfaceCount: Number(__lastRenderVisibilityStats.visibleSurfaceCount || 0),
    hiddenInternalSurfaceSkippedCount: Number(__lastRenderVisibilityStats.hiddenInternalSurfaceSkippedCount || 0)
  });
  var mem = (typeof performance !== 'undefined' && performance && performance.memory) ? performance.memory : null;
  __lastLoggingCostSummary = {
    highFrequencyLogCount: 0,
    loggingEnabled: typeof pushLog === 'function',
    logFlushMs: 0,
    debugLogHeavyModeEnabled: verboseLog === true
  };
  logItemRotationPrototype('logging-cost-summary', __lastLoggingCostSummary);
  logItemRotationPrototype('render-memory-summary', mem ? {
    usedJSHeapSize: Number(mem.usedJSHeapSize || 0),
    totalJSHeapSize: Number(mem.totalJSHeapSize || 0),
    jsHeapSizeLimit: Number(mem.jsHeapSizeLimit || 0),
    memoryApiSupported: true
  } : {
    memoryApiSupported: false
  });
  __lastRenderResourceSummary = {
    frameDtMs: 0,
    terrainBuildMs: Number(__lastRenderVisibilityStats.terrainBuildMs || 0),
    staticBuildMs: Number(__lastMainRenderableBuildStats.staticBuildMs || 0),
    dynamicBuildMs: Number(__lastMainRenderableBuildStats.dynamicBuildMs || 0),
    framePlanBuildMs: 0,
    drawMs: 0,
    finalRenderableCount: renderables.length,
    terrainBatchDrawCount: Number(__lastRenderVisibilityStats.terrainBatchDrawCount || 0),
    terrainVisibleFaceCount: Number(__lastRenderVisibilityStats.terrainVisibleFaceCount || 0),
    terrainVisibleChunkCount: Number(__lastRenderVisibilityStats.terrainVisibleChunkCount || 0)
  };
  logItemRotationPrototype('render-resource-summary', __lastRenderResourceSummary);

  logItemRotationPrototype('render-build-cost-summary', {
    terrainBuildMs: Number(__lastRenderVisibilityStats.terrainBuildMs || 0),
    staticBuildMs: Number(__lastMainRenderableBuildStats.staticBuildMs || 0),
    dynamicBuildMs: Number(__lastMainRenderableBuildStats.dynamicBuildMs || 0),
    framePlanBuildMs: 0,
    renderablesBeforeCulling: Number(__lastMainRenderableBuildStats.renderablesBeforeCulling || 0),
    renderablesAfterCulling: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || 0)
  });
  if (verboseLog) {
    const sec = Math.floor(time);
    if (sec !== lastRenderLogSecond) {
      lastRenderLogSecond = sec;
      pushLog(`render-order ok: total=${renderables.length} static=${staticRenderables.length} dynamic=${dynamicRenderables.length} first20=${renderables.slice(0,20).map(r => r.id).join(',')}`);
    }
  }
  return renderables;
}

function update(dt) {
  setPhase('update', 'start');
  debugState.updateStep = 'time';
  time += dt;
  updatePlayerMovement(dt);
  debugState.updateStep = 'preview';
  updatePreview();
  debugState.updateStep = 'done';
}

function clearAndPaintMainBackground() {
  debugState.renderStep = 'clear';
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  debugState.renderStep = 'background';
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, '#0e1320');
  bg.addColorStop(1, '#141b2b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function renderBaseWorldPasses() {
  var currentViewRotation = normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation);
  var scope = getMainCameraRenderScope(currentViewRotation);
  var visibleLights = getMainCameraVisibleLightsForRender(currentViewRotation);
  if (typeof window !== 'undefined') window.__MAIN_CAMERA_VISIBLE_LIGHTS_OVERRIDE__ = visibleLights;
  debugState.renderStep = 'floor';
  drawFloor(scope);
  debugState.renderStep = 'light-shadows';
  renderLightingShadows();
  if (showFrontLines) {
    debugState.renderStep = 'front-lines';
    drawFrontLines();
  }
  if (SHOW_PLAYER && assetsReady) preparePlayerSpriteFrame();
}

function buildMainFrameRenderables() {
  debugState.renderStep = 'build-renderables';
  const order = buildRenderables();
  var currentViewRotation = normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation);
  for (const item of order) {
    if (!item || typeof item !== 'object') continue;
    item.currentViewRotation = currentViewRotation;
    if (typeof item.drawUsedCurrentViewRotation === 'undefined') item.drawUsedCurrentViewRotation = true;
    if (!item.drawScreenPosition) item.drawScreenPosition = deriveRenderableDrawPosition(item);
  }
  if (debugState.frame < 5 || verboseLog) detailLog(`render:buildRenderables count=${order.length} first10=${order.slice(0, 10).map(r => r.id).join(',')}`);
  return order;
}

function drawMainFrameRenderablesLocal(order) {
  order = Array.isArray(order) ? order : [];
  debugState.renderStep = 'draw-renderables';
  for (let i = 0; i < order.length; i++) {
    const r = order[i];
    debugState.lastRenderable = `${i + 1}/${order.length}:${r.kind || 'unknown'}:${r.id || 'no-id'}`;
    try {
      if (r.draw) r.draw();
      else if (r.kind === 'voxel') drawCachedVoxelRenderable(r);
      else throw new Error(`missing draw for renderable ${r.id}`);
    } catch (err) {
      detailLog(`[renderable-error] ${debugState.lastRenderable} stack=${err?.stack || err}`);
      throw err;
    }
  }
  return order;
}

function drawMainFrameRenderables(order) {
  var rendererAdapter = resolveActiveRendererAdapter();
  if (rendererAdapter && typeof rendererAdapter.drawRenderableOrder === 'function' && !rendererAdapter.__inDrawRenderableOrder) {
    return rendererAdapter.drawRenderableOrder(order, { source: 'src/presentation/render/render.js:drawMainFrameRenderables' });
  }
  return drawMainFrameRenderablesLocal(order);
}

function drawMainFrameOverlaysLocal() {
  debugState.renderStep = 'editor-overlay';
  drawSelectedInstanceHighlight();
  drawSelectedInstanceProjectionDebug();
  drawItemFacingPrototypeOverlay();
  drawShadowProbeOverlay();
  if (editor.mode === 'delete') drawDeleteHover();
  else drawPlacementPreview();
  debugState.renderStep = 'light-glow';
  renderLightingGlow();
  debugState.renderStep = 'light-bulbs';
  for (const l of getLightingRenderLights()) drawLightingBulb(l, l.id === activeLightId);
  debugState.renderStep = 'light-axes';
  drawLightingAxes();

  debugState.renderStep = 'habbo-debug-overlay';
  drawHabboDebugOverlay();
  drawMainCameraBoundsDebug(getMainCameraRenderScope(normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation)));
}

function drawMainFrameOverlays() {
  var rendererAdapter = resolveActiveRendererAdapter();
  if (rendererAdapter && typeof rendererAdapter.drawOverlayPasses === 'function' && !rendererAdapter.__inDrawOverlayPasses) {
    return rendererAdapter.drawOverlayPasses({ source: 'src/presentation/render/render.js:drawMainFrameOverlays' });
  }
  return drawMainFrameOverlaysLocal();
}

function drawMainHudPassLocal() {
  debugState.renderStep = 'hud';
  refreshInspectorPanels();
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '14px sans-serif';
  const proto = currentProto();
  const modeLabel = editor.mode === 'view' ? '不编辑/拖动画面' : (editor.mode === 'delete' ? '删除物件' : '建立物件');
  const l = activeLight();
  ctx.fillText('一体化 Demo：房间编辑 + 多光源 + 人物代理体积阴影，可自由组合。', 18, 28);
  ctx.fillText(`模式=${modeLabel}  当前=${proto.name} ${proto.w}×${proto.d}×${proto.h} / 体素${proto.voxels.length}  instances=${instances.length}  boxes=${boxes.length}  人物代理=${settings.playerProxyW.toFixed(2)}×${settings.playerProxyD.toFixed(2)}×${settings.playerHeightCells.toFixed(2)}  环境光=${settings.ambient.toFixed(2)}  选中=${l.name}(${LIGHT_TYPE_LABELS[l.type]})`, 18, 50);
  if (editor.preview) {
    const pb = editor.preview.box || null;
    const previewLabel = pb
      ? `预览: (${pb.x}, ${pb.y}, z=${pb.z}) valid=${editor.preview.valid}`
      : `预览: box=null valid=${editor.preview.valid} reason=${editor.preview.reason || 'n/a'} prefab=${editor.preview.prefabId || 'n/a'} origin=${editor.preview.origin ? `(${editor.preview.origin.x},${editor.preview.origin.y},${editor.preview.origin.z})` : 'null'} boxes=${editor.preview.boxes ? editor.preview.boxes.length : 0}`;
    if (!pb) detailLog(`[debug:hud-preview-null] ${previewLabel}`);
    ctx.fillText(previewLabel, 18, 72);
  }
  if (showDebug) ctx.fillText(`${SHOW_PLAYER ? `player=(${player.x.toFixed(2)}, ${player.y.toFixed(2)}) dir=${player.dir}  ` : ''}light=(${l.x.toFixed(2)},${l.y.toFixed(2)},${l.z.toFixed(2)}) angle=${l.angle.toFixed(0)} pitch=${l.pitch.toFixed(0)}`, 18, 94);
  if (typeof shadowProbeState !== 'undefined' && shadowProbeState) {
    var probeLabel = shadowProbeState.activeMarker ? shadowProbeMarkerLabel(shadowProbeState.activeMarker) : 'none';
    ctx.fillText('阴影探针: M=标记模式 P=记录当前帧 N=清除  模式=' + (shadowProbeState.markMode ? 'ON' : 'OFF') + '  当前=' + probeLabel, 18, showDebug ? 116 : 94);
  }
}

function drawMainHudPass() {
  var rendererAdapter = resolveActiveRendererAdapter();
  if (rendererAdapter && typeof rendererAdapter.drawHudPass === 'function' && !rendererAdapter.__inDrawHudPass) {
    return rendererAdapter.drawHudPass({ source: 'src/presentation/render/render.js:drawMainHudPass' });
  }
  return drawMainHudPassLocal();
}

function renderWithInternalPasses() {
  clearAndPaintMainBackground();
  var order = [];
  applyMainCameraWorldTransform(ctx, function () {
    renderBaseWorldPasses();
    order = buildMainFrameRenderables();
    drawMainFrameRenderables(order);
    drawMainFrameOverlays();
  });
  drawMainHudPass();
  debugState.renderStep = 'done';
  return order;
}

function emitP5Render(kind, message, extra) {
  var line = '[P5][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
  }
  try {
    if (typeof pushLog === 'function') pushLog(line);
    else if (typeof console !== 'undefined' && console.log) console.log(line);
  } catch (err) {
    try { console.log(line); } catch (_) {}
  }
  return line;
}

function summarizeRendererPassCoverage() {
  return {
    phase: 'P5-D',
    owner: 'src/presentation/render/render.js',
    apiPath: 'renderer.passApi',
    backend: 'canvas2d-pass-api',
    framePipeline: [
      'clearAndPaintMainBackground',
      'renderBaseWorldPasses',
      'buildMainFrameRenderables',
      'drawMainFrameRenderables',
      'drawMainFrameOverlays',
      'drawMainHudPass'
    ],
    notes: [
      'P5-D keeps render.js frame passes behind renderer.passApi and leaves draw execution to the active renderer adapter when available.',
      'render.js now acts more like a render description / fallback layer, while Canvas2D adapter owns more draw execution details.'
    ]
  };
}

function summarizeRendererRenderablesCoverage() {
  return {
    phase: 'P5-D',
    owner: 'src/presentation/render/render.js',
    apiPath: 'renderer.renderablesApi',
    capabilities: [
      'buildFramePlan',
      'drawFramePlan',
      'buildMainFrameRenderables',
      'drawMainFrameRenderables'
    ],
    notes: [
      'P5-D keeps renderables production behind renderer.renderablesApi while allowing the active renderer adapter to own direct draw execution.',
      'Canvas2D adapter can now execute frame plans and overlay / HUD drawing without routing every Canvas2D detail back through render.js.'
    ]
  };
}

function bindRendererPassApi() {
  if (typeof window === 'undefined') return null;
  var passApi = {
    phase: 'P5-D',
    owner: 'src/presentation/render/render.js',
    clearAndPaintMainBackground: clearAndPaintMainBackground,
    renderBaseWorldPasses: renderBaseWorldPasses,
    buildMainFrameRenderables: buildMainFrameRenderables,
    drawMainFrameRenderables: drawMainFrameRenderables,
    drawMainFrameOverlays: drawMainFrameOverlays,
    drawMainHudPass: drawMainHudPass,
    renderWithInternalPasses: renderWithInternalPasses,
    summarizeCoverage: summarizeRendererPassCoverage
  };
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.passApi', passApi, { owner: 'src/presentation/render/render.js', phase: 'P5-D' });
    } else {
      window.App = window.App || {};
      window.App.renderer = window.App.renderer || {};
      window.App.renderer.passApi = passApi;
    }
  } catch (_) {}
  emitP5Render('BOUNDARY', 'renderer-pass-api-ready', {
    phase: 'P5-D',
    owner: 'src/presentation/render/render.js',
    apiPath: 'renderer.passApi',
    framePipeline: summarizeRendererPassCoverage().framePipeline
  });
  return passApi;
}

function buildRendererFramePlan() {
  var buildStartAtFramePlan = perfNow();
  var order = buildMainFrameRenderables();
  var currentViewRotation = normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation);
  var framePlanId = 'frameplan-' + String(++__mainFramePlanSeq);
  var framePlanSignature = [currentViewRotation, order.length, __lastMainRenderableBuildStats.staticRenderableCount, __lastMainRenderableBuildStats.dynamicRenderableCount].join('|');
  for (var i = 0; i < order.length; i++) {
    if (!order[i] || typeof order[i] !== 'object') continue;
    order[i].framePlanId = framePlanId;
    order[i].framePlanSignature = framePlanSignature;
  }
  logItemRotationPrototype('main-render-frameplan-rebuilt', {
    currentViewRotation: currentViewRotation,
    framePlanId: framePlanId,
    framePlanSignature: framePlanSignature,
    renderableCount: order.length,
    staticRenderableCount: __lastMainRenderableBuildStats.staticRenderableCount,
    dynamicRenderableCount: __lastMainRenderableBuildStats.dynamicRenderableCount,
    reason: 'buildFramePlan'
  });
  logItemRotationPrototype('main-view-rotation-source-check', buildMainViewRotationSourceCheckPayload(currentViewRotation, staticBoxRenderCache && typeof staticBoxRenderCache.viewRotation === 'number' ? staticBoxRenderCache.viewRotation : currentViewRotation, typeof staticBoxGeometrySignature === 'function' ? staticBoxGeometrySignature() : null));
  logRenderOrderDiagnostics(framePlanId, framePlanSignature, currentViewRotation, order);
  logMainViewRotationVisualConsumerCheck(currentViewRotation);
  logMainViewRotationRenderConsumerMode(currentViewRotation);
  logItemRotationPrototype('main-camera-render-scope-check', {
    framePlanId: framePlanId,
    zoom: __lastMainRenderableBuildStats.zoom != null ? Number(__lastMainRenderableBuildStats.zoom) : getMainEditorZoomValueForRender(),
    cameraCullingEnabled: __lastMainRenderableBuildStats.cameraCullingEnabled !== false,
    renderablesBeforeCulling: Number(__lastMainRenderableBuildStats.renderablesBeforeCulling || order.length),
    renderablesAfterCulling: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length),
    cullingApplied: (__lastMainRenderableBuildStats.cameraCullingEnabled !== false) && Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length) <= Number(__lastMainRenderableBuildStats.renderablesBeforeCulling || order.length)
  });
  if (isMainEditorViewAnimatingForRender()) {
    logItemRotationPrototype('main-view-rotation-visible-frame-check', {
      visualRotation: normalizeMainEditorViewRotationValue(currentViewRotation),
      discreteViewRotation: normalizeMainEditorViewRotationValue(readLegacyMainEditorViewRotation() != null ? readLegacyMainEditorViewRotation() : currentViewRotation),
      framePlanId: framePlanId,
      floorFrameBuiltFrom: 'visualRotation',
      voxelFrameBuiltFrom: 'visualRotation',
      lightsFrameBuiltFrom: 'visualRotation',
      shadowsFrameBuiltFrom: 'visualRotation'
    });
  }
  if (__lastRenderVisibilityStats) {
    var framePlanBuildMs = Math.max(0, perfNow() - buildStartAtFramePlan);
    logItemRotationPrototype('render-build-cost-summary', {
      terrainBuildMs: Number(__lastRenderVisibilityStats.terrainBuildMs || 0),
      staticBuildMs: Number(__lastRenderVisibilityStats.staticBuildMs || 0),
      dynamicBuildMs: Number(__lastRenderVisibilityStats.dynamicBuildMs || 0),
      framePlanBuildMs: framePlanBuildMs,
      renderablesBeforeCulling: Number(__lastMainRenderableBuildStats.renderablesBeforeCulling || 0),
      renderablesAfterCulling: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length)
    });
    logItemRotationPrototype('render-performance-summary', {
      framePlanBuildMs: framePlanBuildMs,
      renderSourceBuildMs: Number(__lastRenderVisibilityStats.renderSourceBuildMs || 0),
      visibilityFilterMs: Number(__lastRenderVisibilityStats.visibilityFilterMs || 0),
      finalRenderableCount: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length),
      cameraZoom: Number(__lastMainRenderableBuildStats.zoom || getMainEditorZoomValueForRender()),
      currentViewRotation: normalizeMainEditorViewRotationValue(currentViewRotation)
    });
    __lastRenderResourceSummary = Object.assign({}, __lastRenderResourceSummary || {}, {
      framePlanBuildMs: framePlanBuildMs,
      finalRenderableCount: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length),
      terrainBatchDrawCount: Number(__lastRenderVisibilityStats.terrainBatchDrawCount || 0),
      terrainVisibleFaceCount: Number(__lastRenderVisibilityStats.terrainVisibleFaceCount || 0),
      terrainVisibleChunkCount: Number(__lastRenderVisibilityStats.terrainVisibleChunkCount || 0)
    });
    logItemRotationPrototype('render-resource-summary', __lastRenderResourceSummary);
  }
  return {
    id: framePlanId,
    signature: framePlanSignature,
    currentViewRotation: currentViewRotation,
    order: order,
    counts: {
      renderables: order.length,
      instances: instances.length,
      boxes: boxes.length,
      lights: lights.length,
      staticRenderableCount: __lastMainRenderableBuildStats.staticRenderableCount,
      dynamicRenderableCount: __lastMainRenderableBuildStats.dynamicRenderableCount
    }
  };
}

function drawRendererFramePlan(framePlan) {
  var order = framePlan && Array.isArray(framePlan.order) ? framePlan.order : [];
  drawMainFrameRenderables(order);
  return order;
}

function bindRendererRenderablesApi() {
  if (typeof window === 'undefined') return null;
  var renderablesApi = {
    phase: 'P5-C',
    owner: 'src/presentation/render/render.js',
    buildFramePlan: buildRendererFramePlan,
    drawFramePlan: drawRendererFramePlan,
    buildMainFrameRenderables: buildMainFrameRenderables,
    drawMainFrameRenderables: drawMainFrameRenderables,
    summarizeCoverage: summarizeRendererRenderablesCoverage
  };
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.renderablesApi', renderablesApi, { owner: 'src/presentation/render/render.js', phase: 'P5-D' });
    } else {
      window.App = window.App || {};
      window.App.renderer = window.App.renderer || {};
      window.App.renderer.renderablesApi = renderablesApi;
    }
  } catch (_) {}
  emitP5Render('BOUNDARY', 'renderer-renderables-api-ready', {
    phase: 'P5-D',
    owner: 'src/presentation/render/render.js',
    apiPath: 'renderer.renderablesApi',
    capabilities: summarizeRendererRenderablesCoverage().capabilities
  });
  return renderablesApi;
}

var __rendererPassApi = bindRendererPassApi();
var __rendererRenderablesApi = bindRendererRenderablesApi();

function resolveActiveRendererAdapter() {
  if (typeof window === 'undefined') return null;
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
      var active = window.__APP_NAMESPACE.getPath('renderer.active');
      if (active) return active;
    }
  } catch (_) {}
  return (window.App && window.App.renderer && (window.App.renderer.active || window.App.renderer.canvas2d)) || null;
}

function render() {
  var rendererAdapter = resolveActiveRendererAdapter();
  if (rendererAdapter && typeof rendererAdapter.renderFrame === 'function' && !rendererAdapter.__inRenderFrame) {
    return rendererAdapter.renderFrame({ source: 'src/presentation/render/render.js:render' });
  }
  setPhase('render', 'start');
  if (debugState.firstFrameAt == null) debugState.firstFrameAt = performance.now();
  if (typeof beginRenderFrameDebug === 'function') beginRenderFrameDebug('render:start', { canvasCss: { w: VIEW_W, h: VIEW_H }, backing: { w: canvas.width, h: canvas.height }, boxes: boxes.length, lights: lights.length, assetsReady: !!assetsReady });
  if (debugState.frame < 5 || verboseLog) detailLog(`render:start frame=${debugState.frame} canvasCss=${VIEW_W}x${VIEW_H} backing=${canvas.width}x${canvas.height} boxes=${boxes.length} lights=${lights.length} assetsReady=${assetsReady}`);
  (__rendererPassApi || { renderWithInternalPasses: renderWithInternalPasses }).renderWithInternalPasses();
  if (debugState.frame < 5 || verboseLog) detailLog(`render:done frame=${debugState.frame}`);
}


// --- v1.3 floor-layer cache override ---
function drawPolyOn(targetCtx, points, fill, stroke = 'rgba(0,0,0,.22)', width = 1) {
  targetCtx.beginPath();
  targetCtx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) targetCtx.lineTo(points[i].x, points[i].y);
  targetCtx.closePath();
  if (fill) { targetCtx.fillStyle = fill; targetCtx.fill(); }
  if (stroke) { targetCtx.strokeStyle = stroke; targetCtx.lineWidth = width; targetCtx.stroke(); }
}

function ensureFloorLayerCanvas() {
  if (!floorLayerCanvas) {
    floorLayerCanvas = document.createElement('canvas');
    floorLayerCtx = floorLayerCanvas.getContext('2d');
  }
  var backingW = Math.round(VIEW_W * dpr);
  var backingH = Math.round(VIEW_H * dpr);
  if (floorLayerCanvas.width !== backingW || floorLayerCanvas.height !== backingH) {
    floorLayerCanvas.width = backingW;
    floorLayerCanvas.height = backingH;
    floorLayerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    floorLayerCtx.imageSmoothingEnabled = true;
    floorLayerCache.dirty = true;
  }
  return floorLayerCtx;
}

function rebuildFloorLayerIfNeeded(force = false) {
  var currentViewRotation = normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation);
  var sig = floorLayerSignature();
  var previousViewRotation = typeof floorLayerCache.viewRotation === 'number' ? floorLayerCache.viewRotation : currentViewRotation;
  var needsRebuild = force || floorLayerCache.dirty || floorLayerCache.signature !== sig || !floorLayerCanvas;
  if (!needsRebuild) return false;

  var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (!force && isInteractiveRenderPressure() && !isMainEditorViewAnimatingForRender() && floorLayerCache.signature && (now - floorLayerCache.lastBuiltAt) < FLOOR_LAYER_INTERACTION_MS) {
    return false;
  }

  var parsedSignature = null;
  try { parsedSignature = sig ? JSON.parse(sig) : null; } catch (_) { parsedSignature = null; }
  var targetCtx = ensureFloorLayerCanvas();
  targetCtx.clearRect(0, 0, VIEW_W, VIEW_H);
  var scope = getMainCameraRenderScope(currentViewRotation);
  var floorBounds = scope && scope.cameraCullingEnabled !== false ? scope.cullingWorldBounds : null;
  var startY = floorBounds ? Math.max(0, Math.floor(floorBounds.minY)) : 0;
  var endY = floorBounds ? Math.min(settings.gridH, Math.ceil(floorBounds.maxY)) : settings.gridH;
  var startX = floorBounds ? Math.max(0, Math.floor(floorBounds.minX)) : 0;
  var endX = floorBounds ? Math.min(settings.gridW, Math.ceil(floorBounds.maxX)) : settings.gridW;
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const p0 = iso(x, y, 0), p1 = iso(x + 1, y, 0), p2 = iso(x + 1, y + 1, 0), p3 = iso(x, y + 1, 0);
      const base = (x + y) % 2 === 0 ? '#33415a' : '#29344b';
      const lit = rgbToCss(litColor(hexToRgb(base), { x: x + 0.5, y: y + 0.5, z: 0 }, { x: 0, y: 0, z: 1 }));
      drawPolyOn(targetCtx, [p0, p1, p2, p3], lit, 'rgba(255,255,255,.05)');
    }
  }
  const a = iso(0, 0, 0), b = iso(settings.gridW, 0, 0), c = iso(settings.gridW, settings.gridH, 0), d = iso(0, settings.gridH, 0);
  targetCtx.strokeStyle = 'rgba(255,255,255,.14)';
  targetCtx.lineWidth = 2;
  targetCtx.beginPath();
  targetCtx.moveTo(a.x, a.y); targetCtx.lineTo(b.x, b.y); targetCtx.lineTo(c.x, c.y); targetCtx.lineTo(d.x, d.y); targetCtx.closePath(); targetCtx.stroke();

  floorLayerCache.signature = sig;
  floorLayerCache.cacheSignature = sig;
  floorLayerCache.viewRotation = currentViewRotation;
  floorLayerCache.lastBuiltAt = now;
  floorLayerCache.dirty = false;
  logItemRotationPrototype('main-floor-rotation-cache-check', {
    previousViewRotation: normalizeMainEditorViewRotationValue(previousViewRotation),
    nextViewRotation: currentViewRotation,
    floorCacheInvalidated: true,
    floorCacheRebuilt: true,
    floorSignatureIncludesViewRotation: !!(parsedSignature && typeof parsedSignature.viewRotation === 'number'),
    floorDrawUsedCurrentViewRotation: true
  });
  noteLayerRebuild('floor', `interactive=${isInteractiveRenderPressure()} lights=${lights.length} grid=${settings.gridW}x${settings.gridH} viewRotation=${currentViewRotation}`);
  return true;
}

function drawFloor() {
  rebuildFloorLayerIfNeeded();
  if (floorLayerCanvas) {
    ctx.drawImage(floorLayerCanvas, 0, 0, VIEW_W, VIEW_H);
    logItemRotationPrototype('main-floor-draw-hit', {
      currentViewRotation: normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation),
      floorRenderPath: 'floor-layer-cache',
      floorCacheSignature: floorLayerCache && floorLayerCache.cacheSignature ? floorLayerCache.cacheSignature : floorLayerCache.signature,
      floorDrawUsedCurrentViewRotation: !!(floorLayerCache && typeof floorLayerCache.viewRotation === 'number' && floorLayerCache.viewRotation === normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation))
    });
  }
}


// --- v1.4 geometric face-shadow overlay override ---
function worldShadowOverlaysToScreen(overlays) {
  return (overlays || []).map(function (overlay) {
    return {
      alpha: overlay.alpha,
      baseAlpha: overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha,
      worldPolys: overlay.worldPolys || [],
      clipWorldPts: overlay.clipWorldPts || null,
      clipPoly: (overlay.clipWorldPts || null) ? overlay.clipWorldPts.map(function (p) { return iso(p.x, p.y, p.z); }) : null,
      receiverKind: overlay.receiverKind || '',
      owner: overlay.owner || null,
      patchId: overlay.patchId != null ? overlay.patchId : null,
      mergedPlaneKey: overlay.mergedPlaneKey || '',
      receiverCenter: overlay.receiverCenter || null,
      sourceComp: overlay.sourceComp || null,
      casterCenter: overlay.casterCenter || null,
      lightType: overlay.lightType || 'unknown',
      polys: (overlay.worldPolys || []).map(function (poly) {
        return poly.map(function (p) { return iso(p.x, p.y, p.z); });
      })
    };
  });
}

function drawFaceShadowOverlays(targetCtx, receiverPoints, overlays) {
  if (!overlays || !overlays.length) return;
  var unionCtx = ensureShadowPolyUnionCanvas();
  for (const overlay of overlays) {
    var clipPoints = (overlay && overlay.clipPoly && overlay.clipPoly.length >= 3) ? overlay.clipPoly : receiverPoints;
    unionCtx.clearRect(0, 0, VIEW_W, VIEW_H);
    unionCtx.globalCompositeOperation = 'source-over';
    var screenPolys = [];
    var worldPolys = [];
    for (let pi = 0; pi < (overlay.polys || []).length; pi++) {
      var poly = overlay.polys[pi];
      if (!poly || poly.length < 3) continue;
      screenPolys.push(poly);
      worldPolys.push((overlay.worldPolys || [])[pi] || []);
    }
    if (!screenPolys.length) continue;

    var fadeDebug = {};
    fillShadowUnionWithDistanceFade(unionCtx, screenPolys, worldPolys, overlay.casterCenter || null, { type: overlay.lightType || 'unknown' }, clamp(overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha, 0, 0.95), fadeDebug);

    if (typeof shadowDebugLog === 'function' && shadowDebugDetailed) {
      shadowDebugLog('recv-screen alpha=' + String(clamp(overlay.alpha,0,0.95).toFixed(3))
        + ' near=' + String(clamp((overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha) * Number((fadeDebug && fadeDebug.factorNear) || 1),0,0.95).toFixed(3))
        + ' far=' + String(clamp((overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha) * Number((fadeDebug && fadeDebug.factorFar) || 1),0,0.95).toFixed(3))
        + ' recvScreen=' + '[' + clipPoints.map(function (p) { return '(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')'; }).join(' ') + ']'
        + ' world=' + ((overlay.worldPolys || []).map(function (poly) { return '[' + poly.map(function (p) { return '(' + Number(p.x).toFixed(2) + ',' + Number(p.y).toFixed(2) + ',' + Number(p.z).toFixed(2) + ')'; }).join(' ') + ']'; }).join(' | '))
        + ' screen=' + ((overlay.polys || []).map(function (poly) { return '[' + poly.map(function (p) { return '(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')'; }).join(' ') + ']'; }).join(' | ')));
    }
    if (typeof logScreenOverlayDebug === 'function') logScreenOverlayDebug({ alpha: clamp(overlay.alpha,0,0.95), baseAlpha: clamp(overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha,0,0.95), fadeReason: (fadeDebug && fadeDebug.reason) || 'none', fadeMode: (fadeDebug && fadeDebug.mode) || 'solid', fadeDistanceNear: Number((fadeDebug && fadeDebug.distanceNear) || 0), fadeDistanceFar: Number((fadeDebug && fadeDebug.distanceFar) || 0), sourceComp: overlay.sourceComp || null, receiverKind: overlay.receiverKind || '', owner: overlay.owner || null, patchId: overlay.patchId != null ? overlay.patchId : null, receiverScreen: clipPoints, worldPolys: overlay.worldPolys || [], screenPolys: overlay.polys || [], clipWorldPts: overlay.clipWorldPts || null, mergedPlaneKey: overlay.mergedPlaneKey || '', receiverCenter: overlay.receiverCenter || null, casterCenter: overlay.casterCenter || null, gradientStart: (fadeDebug && fadeDebug.gradientStart) || null, gradientEnd: (fadeDebug && fadeDebug.gradientEnd) || null, polyCount: screenPolys.length, probeMatch: (typeof shadowProbeMatchReceiver === 'function') ? shadowProbeMatchReceiver(overlay.receiverKind || '', overlay.owner || null, overlay.clipWorldPts || null, overlay.mergedPlaneKey || '', overlay.patchId != null ? overlay.patchId : null) : null });

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.moveTo(clipPoints[0].x, clipPoints[0].y);
    for (let i = 1; i < clipPoints.length; i++) targetCtx.lineTo(clipPoints[i].x, clipPoints[i].y);
    targetCtx.closePath();
    targetCtx.clip();
    drawUnionShadowCanvasToTarget(targetCtx, overlay.alpha);
    if (lightState.highContrastShadow) {
      targetCtx.strokeStyle = shadowStrokeCss(clamp((overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha) * Number((fadeDebug && fadeDebug.factorFar) || 1), 0, 0.95));
      targetCtx.lineWidth = 0.7;
      for (const poly of screenPolys) {
        if (!poly || poly.length < 3) continue;
        targetCtx.beginPath();
        targetCtx.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i++) targetCtx.lineTo(poly[i].x, poly[i].y);
        targetCtx.closePath();
        targetCtx.stroke();
      }
    }
    targetCtx.restore();
  }
}

function buildFaceRenderable(points, fill, stroke, width, shadowOverlays, meta) {
  var face = { points: points, fill: fill, stroke: stroke, width: width || 1, shadowOverlays: shadowOverlays || [] };
  if (meta && typeof meta === 'object') {
    for (var key in meta) {
      if (Object.prototype.hasOwnProperty.call(meta, key)) face[key] = meta[key];
    }
  }
  return face;
}

function shiftShadowOverlays(overlays, sx, sy) {
  return (overlays || []).map(function (overlay) {
    return {
      alpha: overlay.alpha,
      baseAlpha: overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha,
      worldPolys: overlay.worldPolys || [],
      clipWorldPts: overlay.clipWorldPts || null,
      clipPoly: (overlay.clipPoly || []).map(function (pt) { return { x: pt.x + sx, y: pt.y + sy }; }),
      receiverKind: overlay.receiverKind || '',
      owner: overlay.owner || null,
      patchId: overlay.patchId != null ? overlay.patchId : null,
      mergedPlaneKey: overlay.mergedPlaneKey || '',
      receiverCenter: overlay.receiverCenter || null,
      sourceComp: overlay.sourceComp || null,
      casterCenter: overlay.casterCenter || null,
      lightType: overlay.lightType || 'unknown',
      polys: (overlay.polys || []).map(function (poly) {
        return poly.map(function (pt) { return { x: pt.x + sx, y: pt.y + sy }; });
      })
    };
  });
}

var voxelFaceShadowOverlayCache = { sig: '', map: new Map() };

function currentShadowOverlaySignature() {
  var parts = [];
  parts.push(typeof boxesShadowSignature === 'function' ? boxesShadowSignature() : String((boxes || []).length));
  parts.push(String(!!(lightState && lightState.showShadows)));
  parts.push(String(!!(typeof isLightingSystemEnabled === 'function' ? isLightingSystemEnabled() : true)));
  var ls = (typeof getShadowDebugRenderLights === 'function' ? getShadowDebugRenderLights() : ((typeof getLightingRenderLights === 'function' ? getLightingRenderLights() : lights) || [])) || [];
  for (var i = 0; i < ls.length; i++) {
    var l = ls[i] || {};
    parts.push([
      l.id || l.name || i,
      l.type || 'light',
      Number(l.x || 0).toFixed(3), Number(l.y || 0).toFixed(3), Number(l.z || 0).toFixed(3),
      Number(l.angle || 0).toFixed(3), Number(l.pitch || 0).toFixed(3),
      Number(l.intensity || 0).toFixed(3), Number(l.size || 0).toFixed(3), Number(l.softness || 0).toFixed(3)
    ].join(','));
  }
  parts.push([
    !!(lightState && lightState.shadowDistanceFadeEnabled),
    Number((lightState && lightState.shadowDistanceFadeRate) || 0).toFixed(3),
    Number((lightState && lightState.shadowDistanceFadeMin) || 0).toFixed(3),
    !!(lightState && lightState.shadowEdgeFadeEnabled),
    Number((lightState && lightState.shadowEdgeFadePx) || 0).toFixed(3)
  ].join(','));
  return parts.join('|');
}

function voxelFaceShadowCacheKey(facePts, normal, ownerInstanceId) {
  var faceKey = (facePts || []).map(function (p) {
    return [Number(p.x || 0).toFixed(3), Number(p.y || 0).toFixed(3), Number(p.z || 0).toFixed(3)].join(',');
  }).join(';');
  var normalKey = [Number((normal && normal.x) || 0).toFixed(3), Number((normal && normal.y) || 0).toFixed(3), Number((normal && normal.z) || 0).toFixed(3)].join(',');
  return String(ownerInstanceId || 'none') + '|' + normalKey + '|' + faceKey;
}

function buildVoxelFaceShadowOverlays(facePts, normal, ownerInstanceId) {
  var sig = currentShadowOverlaySignature();
  if (voxelFaceShadowOverlayCache.sig !== sig) {
    if (typeof noteShadowOverlayCache === 'function') noteShadowOverlayCache('invalidate-all', { oldSig: voxelFaceShadowOverlayCache.sig || '', newSig: sig, reason: 'signature-changed' });
    voxelFaceShadowOverlayCache.sig = sig;
    voxelFaceShadowOverlayCache.map = new Map();
  }
  var key = voxelFaceShadowCacheKey(facePts, normal, ownerInstanceId);
  var worldOverlays;
  var cacheHit = voxelFaceShadowOverlayCache.map.has(key);
  if (cacheHit) {
    worldOverlays = voxelFaceShadowOverlayCache.map.get(key);
  } else {
    worldOverlays = collectProjectedShadowPolysForReceiver(facePts, normal, ownerInstanceId);
    voxelFaceShadowOverlayCache.map.set(key, worldOverlays);
  }
  if (typeof noteShadowOverlayCache === 'function') noteShadowOverlayCache(cacheHit ? 'hit' : 'miss', { owner: ownerInstanceId || null, keyHash: (typeof dbgSimpleHash === 'function' ? dbgSimpleHash(key) : key), cacheSize: voxelFaceShadowOverlayCache.map.size, overlayCount: Array.isArray(worldOverlays) ? worldOverlays.length : 0, facePts: facePts, normal: normal, cameraSig: (typeof cameraSignatureForDebug === 'function' ? cameraSignatureForDebug() : ''), shadowSig: sig });
  return worldShadowOverlaysToScreen(worldOverlays);
}

function drawVoxelCell(cell, occ, alpha = 1) {
  var pts = cubePoints(cell.x, cell.y, cell.z, 1, 1, 1);
  var { p100,p110,p010,p001,p101,p111,p011 } = pts;
  var fc = baseFaceColors((cell.box && cell.box.base) || cell.base || "#7aa2f7");

  var explicitVisibleFaces = Array.isArray(cell.visibleFaces) ? cell.visibleFaces.slice() : null;
  var hasFace = function (name, fallback) {
    if (explicitVisibleFaces && explicitVisibleFaces.length) return explicitVisibleFaces.indexOf(name) >= 0;
    return !!fallback;
  };
  var hasTop = hasFace('top', !occ.has(`${cell.x},${cell.y},${cell.z + 1}`));
  var hasEast = hasFace('east', !occ.has(`${cell.x + 1},${cell.y},${cell.z}`));
  var hasSouth = hasFace('south', !occ.has(`${cell.x},${cell.y + 1},${cell.z}`));

  var topWorld = [ {x: cell.x, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ];
  var eastWorld = [ {x: cell.x + 1, y: cell.y, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1} ];
  var southWorld = [ {x: cell.x, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ];
  var ownerInstanceId = cell.box && cell.box.instanceId;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (hasTop) {
    var topPts = [p001,p101,p111,p011];
    drawPoly(topPts, rgbToCss(litFaceColor(fc.top, topWorld, { x: 0, y: 0, z: 1 }, ownerInstanceId)), fc.line);
    drawFaceShadowOverlays(ctx, topPts, buildVoxelFaceShadowOverlays(topWorld, { x: 0, y: 0, z: 1 }, ownerInstanceId));
  }
  if (hasEast) {
    var eastPts = [p101,p111,p110,p100];
    drawPoly(eastPts, xrayFaces ? 'rgba(255,255,255,.18)' : rgbToCss(litFaceColor(fc.east, eastWorld, { x: 1, y: 0, z: 0 }, ownerInstanceId)), fc.line);
    if (!xrayFaces) drawFaceShadowOverlays(ctx, eastPts, buildVoxelFaceShadowOverlays(eastWorld, { x: 1, y: 0, z: 0 }, ownerInstanceId));
  }
  if (hasSouth) {
    var southPts = [p011,p111,p110,p010];
    drawPoly(southPts, xrayFaces ? 'rgba(255,255,255,.14)' : rgbToCss(litFaceColor(fc.south, southWorld, { x: 0, y: 1, z: 0 }, ownerInstanceId)), fc.line);
    if (!xrayFaces) drawFaceShadowOverlays(ctx, southPts, buildVoxelFaceShadowOverlays(southWorld, { x: 0, y: 1, z: 0 }, ownerInstanceId));
  }

  if (xrayFaces) {
    const { p000 } = pts;
    const hasWest = !occ.has(`${cell.x - 1},${cell.y},${cell.z}`);
    const hasNorth = !occ.has(`${cell.x},${cell.y - 1},${cell.z}`);
    if (hasWest) drawPoly([p001,p011,p010,p000], 'rgba(255,255,255,.08)', fc.line);
    if (hasNorth) drawPoly([p001,p101,p100,p000], 'rgba(255,255,255,.08)', fc.line);
  }

  ctx.restore();
  if (showDebug) {
    const foot = iso(cell.x + 1, cell.y + 1, cell.z);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(foot.x, foot.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

function buildStaticVoxelRenderable(cell, occ, explicitViewRotation, semanticLogSeen) {
  var pts = cubePoints(cell.x, cell.y, cell.z, 1, 1, 1);
  var fc = baseFaceColors((cell.box && cell.box.base) || cell.base || "#7aa2f7");
  var p001 = pts.p001, p101 = pts.p101, p111 = pts.p111, p011 = pts.p011, p110 = pts.p110, p100 = pts.p100, p010 = pts.p010, p000 = pts.p000;
  var explicitVisibleFaces = Array.isArray(cell.visibleFaces) ? cell.visibleFaces.slice() : null;
  var hasFace = function (name, fallback) {
    if (explicitVisibleFaces && explicitVisibleFaces.length) return explicitVisibleFaces.indexOf(name) >= 0;
    return !!fallback;
  };
  var hasTop = hasFace('top', !occ.has(`${cell.x},${cell.y},${cell.z + 1}`));
  var hasEast = hasFace('east', !occ.has(`${cell.x + 1},${cell.y},${cell.z}`));
  var hasSouth = hasFace('south', !occ.has(`${cell.x},${cell.y + 1},${cell.z}`));
  var ownerInstanceId = cell.box && cell.box.instanceId;
  var topWorld = [ {x: cell.x, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ];
  var eastWorld = [ {x: cell.x + 1, y: cell.y, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1} ];
  var southWorld = [ {x: cell.x, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ];
  var viewRotation = normalizeMainEditorViewRotationValue(explicitViewRotation != null ? explicitViewRotation : getSafeMainEditorViewRotation(null).viewRotation);
  var semanticMapping = buildStaticVoxelSemanticMapping(cell, viewRotation, fc, semanticLogSeen);
  var faces = semanticMapping ? buildSharedSemanticVoxelFaces(cell, occ, semanticMapping, ownerInstanceId) : null;
  if (!faces) {
    faces = [];
    var fallbackMapping = getVisibleSemanticMappingForRender(cell.box && cell.box.rotation || 0, viewRotation);
    var fallbackScreenMap = fallbackMapping && fallbackMapping.screenFaces ? fallbackMapping.screenFaces : { top: 'top', lowerLeft: 'south', lowerRight: 'east' };
    var fallbackCandidates = [
      { screenFace: 'lowerRight', semanticFace: fallbackScreenMap.lowerRight || 'east', screenFill: fc.east, depthKey: 1 },
      { screenFace: 'lowerLeft', semanticFace: fallbackScreenMap.lowerLeft || 'south', screenFill: fc.south, depthKey: 2 },
      { screenFace: 'top', semanticFace: 'top', screenFill: fc.top, depthKey: 3 }
    ];
    fallbackCandidates.forEach(function (candidate) {
      if (!candidate.semanticFace) return;
      var delta = getSemanticFaceNeighborDeltaForRender(candidate.semanticFace);
      if (occ.has(`${cell.x + delta.x},${cell.y + delta.y},${cell.z + delta.z}`)) return;
      var worldPts = getSemanticFaceWorldPolygon(cell, candidate.semanticFace);
      if (!Array.isArray(worldPts) || worldPts.length < 3) return;
      var screenPts = screenPointsFromWorldFace(worldPts);
      var normal = getSemanticFaceNormal(candidate.semanticFace);
      var litFill = rgbToCss(litFaceColor(candidate.screenFill, worldPts, normal, ownerInstanceId));
      var cameraDebugSettings = getMainEditorCameraSettingsForRender();
      var fallbackStroke = cameraDebugSettings.debugVisibleSurfaces ? '#ffffff' : fc.line;
      faces.push(buildFaceRenderable(screenPts, xrayFaces ? colorWithAlpha(litFill, 0.18) : litFill, fallbackStroke, 1, xrayFaces ? [] : buildVoxelFaceShadowOverlays(worldPts, normal, ownerInstanceId), { semanticFace: candidate.semanticFace, screenFace: candidate.screenFace, depthKey: candidate.depthKey, worldPts: worldPts, polygonTemplateId: 'semantic-face-' + String(candidate.semanticFace), polygonSource: 'semantic-face-world-plane-fallback', reusedFromOldEastSouthTemplate: false, cell: { x: cell.x, y: cell.y, z: cell.z } }));
    });
    if (xrayFaces) {
      var hasWest = !occ.has(`${cell.x - 1},${cell.y},${cell.z}`);
      var hasNorth = !occ.has(`${cell.x},${cell.y - 1},${cell.z}`);
      if (hasWest) {
        var westWorld = getSemanticFaceWorldPolygon(cell, 'west');
        faces.push(buildFaceRenderable(screenPointsFromWorldFace(westWorld), 'rgba(255,255,255,.08)', fc.line, 1, [], { semanticFace: 'west', screenFace: 'west', depthKey: 0, worldPts: westWorld, polygonTemplateId: 'semantic-face-west', polygonSource: 'semantic-face-world-plane-fallback', reusedFromOldEastSouthTemplate: false, cell: { x: cell.x, y: cell.y, z: cell.z } }));
      }
      if (hasNorth) {
        var northWorld = getSemanticFaceWorldPolygon(cell, 'north');
        faces.push(buildFaceRenderable(screenPointsFromWorldFace(northWorld), 'rgba(255,255,255,.08)', fc.line, 1, [], { semanticFace: 'north', screenFace: 'north', depthKey: -1, worldPts: northWorld, polygonTemplateId: 'semantic-face-north', polygonSource: 'semantic-face-world-plane-fallback', reusedFromOldEastSouthTemplate: false, cell: { x: cell.x, y: cell.y, z: cell.z } }));
      }
    }
    logFaceGeometryOracleChecks(faces, {
      currentViewRotation: viewRotation,
      instanceId: cell.box && cell.box.instanceId || null,
      prefabId: cell.box && cell.box.prefabId || null
    });
  }
  var voxelSortMeta = computeViewAwareSortMeta({ x: cell.x, y: cell.y, z: cell.z }, 1, viewRotation);
  var debugFoot = iso(cell.x + 1, cell.y + 1, cell.z);
  return {
    id: `voxel-${cell.box.id}-${cell.x}-${cell.y}-${cell.z}`,
    kind: 'voxel',
    sortKey: voxelSortMeta.sortKey,
    tie: voxelSortMeta.tie,
    faces: faces,
    instanceId: cell.box && cell.box.instanceId || null,
    prefabId: cell.box && cell.box.prefabId || null,
    renderPath: 'static-cache',
    cacheViewRotation: viewRotation,
    drawScreenPosition: { x: Math.round(debugFoot.x), y: Math.round(debugFoot.y) },
    drawUsedSemanticTextureMapping: !!semanticMapping,
    semanticScreenFaceToTexture: semanticMapping ? semanticMapping.screenFaceToSemanticFace : null,
    debugFoot: showDebug ? debugFoot : null,
    box: cell.box || null,
    cellX: cell.x,
    cellY: cell.y,
    cellZ: cell.z
  };
}

function buildShiftedVoxelRenderable(cell, occ, shift, idPrefix) {
  var base = buildStaticVoxelRenderable(cell, occ);
  if (!base || !Array.isArray(base.faces) || !base.faces.length) return null;
  var sx = Math.round(shift && shift.x || 0);
  var sy = Math.round(shift && shift.y || 0);
  if (!sx && !sy) return base;
  var movedFaces = base.faces.map(function (face) {
    return {
      points: face.points.map(function (pt) { return { x: pt.x + sx, y: pt.y + sy }; }),
      fill: face.fill,
      stroke: face.stroke,
      width: face.width || 1,
      shadowOverlays: shiftShadowOverlays(face.shadowOverlays, sx, sy)
    };
  });
  return {
    id: (idPrefix || 'habbo-voxel') + '-' + String(cell.box && cell.box.id || 'x') + '-' + String(cell.x) + '-' + String(cell.y) + '-' + String(cell.z),
    kind: 'voxel',
    sortKey: base.sortKey,
    tie: base.tie,
    faces: movedFaces,
    debugFoot: base.debugFoot ? { x: base.debugFoot.x + sx, y: base.debugFoot.y + sy } : null,
  };
}

function drawCachedVoxelRenderable(item) {
  for (const face of item.faces) {
    drawPoly(face.points, face.fill, face.stroke, face.width || 1);
    drawFaceShadowOverlays(ctx, face.points, face.shadowOverlays);
  }
  if (item.debugFoot) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(item.debugFoot.x, item.debugFoot.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCachedVoxelFaceRenderable(item) {
  if (!item) return;
  drawPoly(item.points || [], item.fill, item.stroke, item.width || 1);
  drawFaceShadowOverlays(ctx, item.points || [], item.shadowOverlays || []);
}

function buildStaticVoxelFaceRenderable(baseRenderable, face, faceIndex, viewRotation) {
  if (!baseRenderable || !face) return null;
  var faceCell = face.cell || { x: Number(baseRenderable.cellX || 0), y: Number(baseRenderable.cellY || 0), z: Number(baseRenderable.cellZ || 0) };
  var domainCore = getDomainSceneCoreApi();
  var orderMeta = domainCore && typeof domainCore.computeVoxelRenderableSort === 'function'
    ? domainCore.computeVoxelRenderableSort({ cell: faceCell, box: baseRenderable.box || null, viewRotation: viewRotation })
    : computeViewAwareSortMeta(faceCell, 1, viewRotation);
  var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
  var centroid = averageScreenPoint(Array.isArray(face.points) ? face.points : []);
  return {
    id: String(baseRenderable.id || 'voxel') + '::' + String(face.semanticFace || face.screenFace || faceIndex),
    kind: 'voxel-face',
    sortKey: Number(orderMeta.sortKey || 0),
    tie: Number(orderMeta.tie || 0) + ((faceTiePrio[face.screenFace] || 0) * 0.01),
    instanceId: baseRenderable.instanceId || null,
    prefabId: baseRenderable.prefabId || null,
    renderPath: 'static-cache-face',
    cacheViewRotation: viewRotation,
    cacheSignature: baseRenderable.cacheSignature || null,
    drawUsedSemanticTextureMapping: !!baseRenderable.drawUsedSemanticTextureMapping,
    drawScreenPosition: { x: Math.round(centroid.x || 0), y: Math.round(centroid.y || 0) },
    semanticFace: face.semanticFace || null,
    screenFace: face.screenFace || null,
    depthKey: face.depthKey != null ? face.depthKey : faceIndex,
    points: Array.isArray(face.points) ? face.points : [],
    fill: face.fill,
    stroke: face.stroke,
    texture: face.texture || null,
    textureColor: face.textureColor || null,
    semanticTextureSlot: face.semanticTextureSlot || null,
    semanticTextureSlotColor: face.semanticTextureSlotColor || null,
    width: face.width || 1,
    shadowOverlays: face.shadowOverlays || [],
    worldPts: face.worldPts || null,
    box: baseRenderable.box || null,
    cellX: Number(faceCell.x || 0),
    cellY: Number(faceCell.y || 0),
    cellZ: Number(faceCell.z || 0),
    faceKey: [baseRenderable.instanceId || 'unknown', [Number(faceCell.x || 0), Number(faceCell.y || 0), Number(faceCell.z || 0)].join(','), face.semanticFace || '', face.screenFace || ''].join('|'),
    draw: function () { drawCachedVoxelFaceRenderable(this); }
  };
}

function flattenStaticVoxelRenderable(baseRenderable, viewRotation) {
  if (!baseRenderable) return [];
  if (!Array.isArray(baseRenderable.faces) || !baseRenderable.faces.length) return [];
  var out = [];
  for (var i = 0; i < baseRenderable.faces.length; i++) {
    var faceRenderable = buildStaticVoxelFaceRenderable(baseRenderable, baseRenderable.faces[i], i, viewRotation);
    if (faceRenderable) out.push(faceRenderable);
  }
  return out;
}
