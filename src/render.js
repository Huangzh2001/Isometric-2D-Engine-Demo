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
  var rotKey = String(((parseInt(rotation || 0, 10) % 2) + 2) % 2);
  if (prefab.spriteDirections && prefab.spriteDirections[rotKey]) return prefab.spriteDirections[rotKey];
  if (prefab.spriteDirections && prefab.spriteDirections['0']) return prefab.spriteDirections['0'];
  return prefab.sprite || null;
}

function getHabboLayerConfigList(prefab, rotation) {
  if (!prefab || !prefab.habboLayerDirections) return null;
  var rotKey = String(((parseInt(rotation || 0, 10) % 2) + 2) % 2);
  return prefab.habboLayerDirections[rotKey] || prefab.habboLayerDirections['0'] || null;
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
  detailLog('callsite src/render.js::buildHabboComposite prefab=' + String(prefab.id || 'unknown') + ' rotation=' + String(rotation || 0) + ' bbox=(' + [minX, minY, width, height].join(',') + ') layers=' + String(layerSnapshots.length));
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
  return String(((parseInt(rotation || 0, 10) % 2) + 2) % 2);
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
    detailLog('callsite src/render.js::drawPrefabSpriteAt prefab=' + String(prefab.id || 'unknown') +
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
      detailLog('callsite src/render.js::drawPrefabSpriteAt layered-miss prefab=' + String(prefab.id || 'unknown') + ' rotation=' + String(rotation) + ' keys=' + Object.keys(prefab.habboLayerDirections || {}).join(','));
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
  var anchor = prefab.anchor || { x: 0, y: 0, z: 0 };
  var baseSortLine = instance.x + instance.y + (anchor.x || 0) + (anchor.y || 0) + 0.0005;
  var baseTie = 300000 + ((instance.z || 0) + (anchor.z || 0)) * 1000;
  var occlusion = 'none';
  if (SHOW_PLAYER && prefabHasSprite(prefab) && getSpriteProxySortMode(prefab) === 'box_occlusion') {
    occlusion = classifyPlayerAgainstProxyBox(getInstanceProxyBounds(instance));
    var playerLine = player.x + player.y + 0.001;
    if (occlusion === 'occlude') {
      return { sortKey: Math.max(baseSortLine, playerLine + 0.0006), tie: 990000 + ((instance.z || 0) + (anchor.z || 0)) * 1000, occlusion: occlusion };
    }
    if (occlusion === 'in_front') {
      return { sortKey: Math.min(baseSortLine, playerLine - 0.0006), tie: 210000 + ((instance.z || 0) + (anchor.z || 0)) * 1000, occlusion: occlusion };
    }
  }
  return { sortKey: baseSortLine, tie: baseTie, occlusion: occlusion };
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
const columnLine = cell.x + cell.y + 1;
return {
  id: `voxel-${cell.box.id}-${cell.x}-${cell.y}-${cell.z}`,
  kind: 'voxel',
  sortKey: columnLine,
  tie: cell.z * 100000 + cell.y * 100 + cell.x,
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
  const geometrySignature = staticBoxGeometrySignature();
  const lightingSignature = staticBoxLightingSignature();
  const geometryChanged = force || staticBoxRenderCache.dirtyGeometry || staticBoxRenderCache.geometrySignature !== geometrySignature;
  const lightingChanged = force || staticBoxRenderCache.dirtyLighting || staticBoxRenderCache.lightingSignature !== lightingSignature;
  if (!geometryChanged && !lightingChanged && staticBoxRenderCache.renderables.length) return;

  const now = perfNow();
  if (!force && isInteractiveRenderPressure() && staticBoxRenderCache.renderables.length && (now - staticBoxRenderCache.lastBuiltAt) < STATIC_BOX_LAYER_INTERACTION_MS) {
    return;
  }

  const visibleBoxes = boxes.filter(function (b) { return prefabDrawsVoxels(getPrefabById(b.prefabId)); });
  const occ = buildOccupancy(visibleBoxes);
  const renderables = [];
  for (const cell of occ.values()) renderables.push(buildStaticVoxelRenderable(cell, occ));
  renderables.sort((a, b) => {
    if (Math.abs(a.sortKey - b.sortKey) > EPS) return a.sortKey - b.sortKey;
    return a.tie - b.tie;
  });
  staticBoxRenderCache.occupancy = occ;
  staticBoxRenderCache.renderables = renderables;
  staticBoxRenderCache.geometrySignature = geometrySignature;
  staticBoxRenderCache.lightingSignature = lightingSignature;
  staticBoxRenderCache.lastBuiltAt = now;
  staticBoxRenderCache.dirtyGeometry = false;
  staticBoxRenderCache.dirtyLighting = false;
  noteLayerRebuild('static-box', `interactive=${isInteractiveRenderPressure()} voxels=${renderables.length} lights=${lights.length}`);
}

function mergeSortedRenderables(staticRenderables, dynamicRenderables) {
  if (!dynamicRenderables.length) return staticRenderables.slice();
  const merged = [];
  let i = 0, j = 0;
  while (i < staticRenderables.length && j < dynamicRenderables.length) {
    const a = staticRenderables[i], b = dynamicRenderables[j];
    if (Math.abs(a.sortKey - b.sortKey) > EPS ? a.sortKey <= b.sortKey : a.tie <= b.tie) {
      merged.push(a); i += 1;
    } else {
      merged.push(b); j += 1;
    }
  }
  while (i < staticRenderables.length) merged.push(staticRenderables[i++]);
  while (j < dynamicRenderables.length) merged.push(dynamicRenderables[j++]);
  return merged;
}

function drawFloor() {
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

function computeCandidate(cellX, cellY, proto, ignoreInstanceId = null) {
  var rotatedProto = proto && proto.voxels ? proto : currentProto();
  if (rotatedProto && rotatedProto.kind === 'habbo_import') {
    var cellShift = getHabboPlacementCellShift(rotatedProto, rotatedProto.rotation || 0);
    if (cellShift && (cellShift.x || cellShift.y)) {
      cellX += (cellShift.x || 0);
      cellY += (cellShift.y || 0);
    }
  }
  var supportCells = rotatedProto.supportCells && rotatedProto.supportCells.length ? rotatedProto.supportCells : [{ x: 0, y: 0, localZ: 0 }];
  var relevantBoxes = ignoreInstanceId ? boxes.filter(function (b) { return b.instanceId !== ignoreInstanceId; }) : boxes.slice();
  var tops = buildColumnTops(relevantBoxes);
  var supportHeights = [];
  var originCandidates = [];
  for (var i = 0; i < supportCells.length; i++) {
    var support = supportCells[i];
    var worldX = cellX + support.x;
    var worldY = cellY + support.y;
    if (worldX < 0 || worldY < 0 || worldX >= settings.gridW || worldY >= settings.gridH) {
      return { valid: false, reason: 'out', supportZ: null, supportHeights: supportHeights, overlapIds: [], box: null, boxes: [], bbox: null, origin: null, prefabId: rotatedProto.id, rotation: rotatedProto.rotation };
    }
    var top = highestTopAtCell(worldX, worldY, null, ignoreInstanceId);
    supportHeights.push({ x: worldX, y: worldY, top: top });
    originCandidates.push(top - support.localZ);
  }
  var supportZ = originCandidates.length ? originCandidates[0] : 0;
  for (var oc = 1; oc < originCandidates.length; oc++) {
    if (Math.abs(originCandidates[oc] - supportZ) > EPS) {
      return { valid: false, reason: 'uneven', supportZ: null, supportHeights: supportHeights, overlapIds: [], box: null, boxes: [], bbox: null, origin: null, prefabId: rotatedProto.id, rotation: rotatedProto.rotation };
    }
  }

  var worldBoxes = rotatedProto.voxels.map(function (v, idx) {
    return { name: rotatedProto.name, x: cellX + v.x, y: cellY + v.y, z: supportZ + v.z, w: 1, d: 1, h: 1, base: v.base || rotatedProto.base, localIndex: idx };
  });

  for (var bi = 0; bi < worldBoxes.length; bi++) {
    var wb = worldBoxes[bi];
    if (wb.x < 0 || wb.y < 0 || wb.x + wb.w > settings.gridW || wb.y + wb.d > settings.gridH || wb.z < 0) {
      return { valid: false, reason: 'out', supportZ: supportZ, supportHeights: supportHeights, overlapIds: [], box: null, boxes: worldBoxes, bbox: null, origin: { x: cellX, y: cellY, z: supportZ }, prefabId: rotatedProto.id, rotation: rotatedProto.rotation };
    }
  }

  var overlapIds = [];
  for (var wi = 0; wi < worldBoxes.length; wi++) {
    for (var oi = 0; oi < relevantBoxes.length; oi++) {
      if (boxRectOverlap3D(worldBoxes[wi], relevantBoxes[oi])) overlapIds.push(relevantBoxes[oi].id);
    }
  }
  if (overlapIds.length) {
    overlapIds = Array.from(new Set(overlapIds));
    return { valid: false, reason: 'overlap', supportZ: supportZ, supportHeights: supportHeights, overlapIds: overlapIds, box: null, boxes: worldBoxes, bbox: null, origin: { x: cellX, y: cellY, z: supportZ }, prefabId: rotatedProto.id, rotation: rotatedProto.rotation };
  }

  var playerBlock = playerPlacementAABB();
  for (var pi = 0; pi < worldBoxes.length; pi++) {
    if (boxRectOverlap3D(worldBoxes[pi], playerBlock)) {
      return { valid: false, reason: 'player', supportZ: supportZ, supportHeights: supportHeights, overlapIds: [], box: null, boxes: worldBoxes, bbox: null, origin: { x: cellX, y: cellY, z: supportZ }, prefabId: rotatedProto.id, rotation: rotatedProto.rotation };
    }
  }

  var minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (var k = 0; k < worldBoxes.length; k++) {
    var bb = worldBoxes[k];
    minX = Math.min(minX, bb.x); minY = Math.min(minY, bb.y); minZ = Math.min(minZ, bb.z);
    maxX = Math.max(maxX, bb.x + bb.w); maxY = Math.max(maxY, bb.y + bb.d); maxZ = Math.max(maxZ, bb.z + bb.h);
  }
  var bbox = { x: minX, y: minY, z: minZ, w: maxX - minX, d: maxY - minY, h: maxZ - minZ };
  var anchorBox = Object.assign({ name: rotatedProto.name, base: rotatedProto.base }, bbox);
  if (verboseLog) pushLog(`candidate: VALID ${rotatedProto.name} voxels=${worldBoxes.length} at (${cellX},${cellY},${supportZ})`);
  return { valid: true, reason: 'ok', supportZ: supportZ, supportHeights: supportHeights, overlapIds: [], box: anchorBox, boxes: worldBoxes, bbox: bbox, origin: { x: cellX, y: cellY, z: supportZ }, prefabId: rotatedProto.id, rotation: rotatedProto.rotation };
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

  if (editor.preview && topHit && editor.preview.valid) {
    pushLog(`preview-hit-top: cell=(${topHit.x},${topHit.y}) topZ=${topHit.z}`);
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

// placement 拖拽/落地入口已抽离到 src/placement/placement.js
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
  var previewShift = previewPrefab && previewPrefab.kind === 'habbo_import'
    ? getHabboProxyVisualShift(previewPrefab, editor.preview.rotation != null ? editor.preview.rotation : editor.rotation || 0)
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
  withScreenTranslate(previewShift, function () {
    for (var cell of occ.values()) drawVoxelCell({ x: cell.x, y: cell.y, z: cell.z, base: cell.box.base }, occ, ok ? 0.42 : 0.22);
  });
  if (origin) {
    if (previewPrefab && prefabHasSprite(previewPrefab)) {
      if (previewPrefab.kind === 'habbo_import') {
        detailLog('[place-trace] src/render.js::drawPlacementPreview preview-habbo-sprite prefab=' + previewPrefab.id + ' origin=(' + [origin.x, origin.y, origin.z].join(',') + ') rotation=' + String(editor.preview.rotation != null ? editor.preview.rotation : editor.rotation || 0) + ' valid=' + ok + ' proxyShift=(' + [previewShift.x || 0, previewShift.y || 0].join(',') + ')');
      }
      drawPrefabSpriteAt(previewPrefab, Object.assign({}, origin, { rotation: editor.preview.rotation != null ? editor.preview.rotation : editor.rotation || 0 }), ok ? 0.78 : 0.42);
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
  rebuildStaticBoxRenderCacheIfNeeded();
  const staticRenderables = staticBoxRenderCache.renderables || [];
  const dynamicRenderables = [];
  const visibleOcc = buildOccupancy(boxes.filter(function (b) { return prefabDrawsVoxels(getPrefabById(b.prefabId)); }));

  for (const inst of instances) {
    const prefab = getPrefabById(inst.prefabId);
    if (prefab && prefab.kind === 'habbo_import' && prefabDrawsVoxels(prefab)) {
      const shift = getHabboInstanceVisualShift(inst, prefab);
      const instBoxes = boxes.filter(function (b) { return b.instanceId === inst.instanceId; });
      for (const cell of instBoxes) {
        const item = buildShiftedVoxelRenderable({ x: cell.x, y: cell.y, z: cell.z, box: cell, base: cell.base }, visibleOcc, shift, 'habbo-voxel-' + inst.instanceId);
        dynamicRenderables.push(item);
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
        draw: () => {
          const drawn = drawPrefabSpriteInstance(inst, 1);
          if (!drawn && !prefabDrawsVoxels(prefab)) drawInstanceProxyBoxes(inst, 0.82);
        },
      });
    }
  }

  if (SHOW_PLAYER) {
    const playerLine = player.x + player.y + 0.001;
    for (const s of getPlayerSlices()) {
      dynamicRenderables.push({
        id: s.id,
        kind: 'player-slice',
        sortKey: playerLine,
        tie: 500000 + s.z * 1000,
        draw: () => drawPlayerSlice(s),
      });
    }
  }

  dynamicRenderables.sort((a, b) => {
    if (Math.abs(a.sortKey - b.sortKey) > EPS) return a.sortKey - b.sortKey;
    return a.tie - b.tie;
  });

  const renderables = mergeSortedRenderables(staticRenderables, dynamicRenderables);

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

function render() {
  setPhase('render', 'start');
  if (debugState.firstFrameAt == null) debugState.firstFrameAt = performance.now();
  if (typeof beginRenderFrameDebug === 'function') beginRenderFrameDebug('render:start', { canvasCss: { w: VIEW_W, h: VIEW_H }, backing: { w: canvas.width, h: canvas.height }, boxes: boxes.length, lights: lights.length, assetsReady: !!assetsReady });
  if (debugState.frame < 5 || verboseLog) detailLog(`render:start frame=${debugState.frame} canvasCss=${VIEW_W}x${VIEW_H} backing=${canvas.width}x${canvas.height} boxes=${boxes.length} lights=${lights.length} assetsReady=${assetsReady}`);
  debugState.renderStep = 'clear';
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  debugState.renderStep = 'background';
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, '#0e1320');
  bg.addColorStop(1, '#141b2b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  debugState.renderStep = 'floor';
  drawFloor();
  debugState.renderStep = 'light-shadows';
  renderLightingShadows();
  if (showFrontLines) {
    debugState.renderStep = 'front-lines';
    drawFrontLines();
  }
  if (SHOW_PLAYER && assetsReady) preparePlayerSpriteFrame();
  debugState.renderStep = 'build-renderables';
  const order = buildRenderables();
  if (debugState.frame < 5 || verboseLog) detailLog(`render:buildRenderables count=${order.length} first10=${order.slice(0, 10).map(r => r.id).join(',')}`);
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
  debugState.renderStep = 'editor-overlay';
  drawSelectedInstanceHighlight();
  drawSelectedInstanceProjectionDebug();
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
  debugState.renderStep = 'done';
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
  var sig = floorLayerSignature();
  var needsRebuild = force || floorLayerCache.dirty || floorLayerCache.signature !== sig || !floorLayerCanvas;
  if (!needsRebuild) return;

  var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (!force && isInteractiveRenderPressure() && floorLayerCache.signature && (now - floorLayerCache.lastBuiltAt) < FLOOR_LAYER_INTERACTION_MS) {
    return;
  }

  var targetCtx = ensureFloorLayerCanvas();
  targetCtx.clearRect(0, 0, VIEW_W, VIEW_H);
  for (let y = 0; y < settings.gridH; y++) {
    for (let x = 0; x < settings.gridW; x++) {
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
  floorLayerCache.lastBuiltAt = now;
  floorLayerCache.dirty = false;
  noteLayerRebuild('floor', `interactive=${isInteractiveRenderPressure()} lights=${lights.length} grid=${settings.gridW}x${settings.gridH}`);
}

function drawFloor() {
  rebuildFloorLayerIfNeeded();
  if (floorLayerCanvas) ctx.drawImage(floorLayerCanvas, 0, 0, VIEW_W, VIEW_H);
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

function buildFaceRenderable(points, fill, stroke, width, shadowOverlays) {
  return { points: points, fill: fill, stroke: stroke, width: width || 1, shadowOverlays: shadowOverlays || [] };
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

  var hasTop = !occ.has(`${cell.x},${cell.y},${cell.z + 1}`);
  var hasEast = !occ.has(`${cell.x + 1},${cell.y},${cell.z}`);
  var hasSouth = !occ.has(`${cell.x},${cell.y + 1},${cell.z}`);

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

function buildStaticVoxelRenderable(cell, occ) {
  var pts = cubePoints(cell.x, cell.y, cell.z, 1, 1, 1);
  var fc = baseFaceColors((cell.box && cell.box.base) || cell.base || "#7aa2f7");
  var { p000,p100,p110,p010,p001,p101,p111,p011 } = pts;
  var hasTop = !occ.has(`${cell.x},${cell.y},${cell.z + 1}`);
  var hasEast = !occ.has(`${cell.x + 1},${cell.y},${cell.z}`);
  var hasSouth = !occ.has(`${cell.x},${cell.y + 1},${cell.z}`);
  var ownerInstanceId = cell.box && cell.box.instanceId;
  var faces = [];
  var topWorld = [ {x: cell.x, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ];
  var eastWorld = [ {x: cell.x + 1, y: cell.y, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1} ];
  var southWorld = [ {x: cell.x, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ];
  if (hasTop) faces.push(buildFaceRenderable([p001,p101,p111,p011], rgbToCss(litFaceColor(fc.top, topWorld, { x: 0, y: 0, z: 1 }, ownerInstanceId)), fc.line, 1, buildVoxelFaceShadowOverlays(topWorld, { x: 0, y: 0, z: 1 }, ownerInstanceId)));
  if (hasEast) faces.push(buildFaceRenderable([p101,p111,p110,p100], xrayFaces ? 'rgba(255,255,255,.18)' : rgbToCss(litFaceColor(fc.east, eastWorld, { x: 1, y: 0, z: 0 }, ownerInstanceId)), fc.line, 1, xrayFaces ? [] : buildVoxelFaceShadowOverlays(eastWorld, { x: 1, y: 0, z: 0 }, ownerInstanceId)));
  if (hasSouth) faces.push(buildFaceRenderable([p011,p111,p110,p010], xrayFaces ? 'rgba(255,255,255,.14)' : rgbToCss(litFaceColor(fc.south, southWorld, { x: 0, y: 1, z: 0 }, ownerInstanceId)), fc.line, 1, xrayFaces ? [] : buildVoxelFaceShadowOverlays(southWorld, { x: 0, y: 1, z: 0 }, ownerInstanceId)));
  if (xrayFaces) {
    const hasWest = !occ.has(`${cell.x - 1},${cell.y},${cell.z}`);
    const hasNorth = !occ.has(`${cell.x},${cell.y - 1},${cell.z}`);
    if (hasWest) faces.push(buildFaceRenderable([p001,p011,p010,p000], 'rgba(255,255,255,.08)', fc.line, 1, []));
    if (hasNorth) faces.push(buildFaceRenderable([p001,p101,p100,p000], 'rgba(255,255,255,.08)', fc.line, 1, []));
  }
  const columnLine = cell.x + cell.y + 1;
  return {
    id: `voxel-${cell.box.id}-${cell.x}-${cell.y}-${cell.z}`,
    kind: 'voxel',
    sortKey: columnLine,
    tie: cell.z * 100000 + cell.y * 100 + cell.x,
    faces: faces,
    debugFoot: showDebug ? iso(cell.x + 1, cell.y + 1, cell.z) : null,
  };
}

function buildShiftedVoxelRenderable(cell, occ, shift, idPrefix) {
  var base = buildStaticVoxelRenderable(cell, occ);
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
