(function (global) {
  'use strict';

  var VERSION = 'HZH-PIXEL-ART-CORE-V3-UNBOUNDED-LAYER-SURFACE';
  var nextIdCounter = 1;

  function clampInt(value, min, max) {
    var n = Math.round(Number(value));
    if (!Number.isFinite(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  function clampByte(value) {
    return clampInt(value, 0, 255);
  }

  function makeId(prefix) {
    nextIdCounter += 1;
    return String(prefix || 'id') + '_' + Date.now().toString(36) + '_' + nextIdCounter.toString(36);
  }

  function createPixelBuffer(width, height, fill) {
    width = clampInt(width, 1, 2048);
    height = clampInt(height, 1, 2048);
    var out = new Uint8ClampedArray(width * height * 4);
    if (Array.isArray(fill) && fill.length >= 4) {
      for (var i = 0; i < width * height; i += 1) {
        var o = i * 4;
        out[o] = clampByte(fill[0]);
        out[o + 1] = clampByte(fill[1]);
        out[o + 2] = clampByte(fill[2]);
        out[o + 3] = clampByte(fill[3]);
      }
    }
    return out;
  }

  function createLayer(width, height, options) {
    options = options || {};
    var surface = options.surface && typeof options.surface === 'object' ? options.surface : null;
    var surfaceWidth = clampInt(surface && surface.w != null ? surface.w : (options.surfaceWidth || width), 1, 4096);
    var surfaceHeight = clampInt(surface && surface.h != null ? surface.h : (options.surfaceHeight || height), 1, 4096);
    var expectedLength = surfaceWidth * surfaceHeight * 4;
    var pixels;
    if (options.pixels instanceof Uint8ClampedArray) {
      pixels = new Uint8ClampedArray(expectedLength);
      pixels.set(options.pixels.subarray(0, expectedLength));
    } else pixels = createPixelBuffer(surfaceWidth, surfaceHeight, options.fill);
    var offsetX = surface && surface.x != null ? surface.x : (options.offsetPx && options.offsetPx.x != null ? options.offsetPx.x : options.offsetX);
    var offsetY = surface && surface.y != null ? surface.y : (options.offsetPx && options.offsetPx.y != null ? options.offsetPx.y : options.offsetY);
    return {
      id: String(options.id || makeId('layer')),
      name: String(options.name || '图层'),
      visible: options.visible !== false,
      locked: options.locked === true,
      opacity: Math.max(0, Math.min(1, Number(options.opacity == null ? 1 : options.opacity) || 0)),
      blendMode: String(options.blendMode || 'normal'),
      source: options.source && typeof options.source === 'object' ? JSON.parse(JSON.stringify(options.source)) : null,
      metadata: options.metadata && typeof options.metadata === 'object' ? JSON.parse(JSON.stringify(options.metadata)) : {},
      offsetPx: { x: Math.round(Number(offsetX) || 0), y: Math.round(Number(offsetY) || 0) },
      surfaceSize: { w: surfaceWidth, h: surfaceHeight },
      pixels: pixels
    };
  }

  function createFacing(width, height, id, name) {
    return {
      id: clampInt(id, 0, 3),
      name: String(name || ('方向 ' + id)),
      layers: [createLayer(width, height, { name: '图层 1' })],
      activeLayerId: ''
    };
  }

  function createDocument(width, height, options) {
    options = options || {};
    width = clampInt(width || 32, 1, 512);
    height = clampInt(height || 32, 1, 512);
    var names = ['北 / N', '东 / E', '南 / S', '西 / W'];
    var facings = [];
    for (var i = 0; i < 4; i += 1) {
      var facing = createFacing(width, height, i, names[i]);
      facing.activeLayerId = facing.layers[0].id;
      facings.push(facing);
    }
    return {
      version: VERSION,
      width: width,
      height: height,
      facings: facings,
      activeFacing: 0,
      palette: Array.isArray(options.palette) ? options.palette.slice(0, 256) : [],
      metadata: Object.assign({ createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, options.metadata || {})
    };
  }

  function getFacing(doc, facingIndex) {
    if (!doc || !Array.isArray(doc.facings)) return null;
    var index = clampInt(facingIndex == null ? doc.activeFacing : facingIndex, 0, 3);
    return doc.facings[index] || null;
  }

  function getLayer(doc, facingIndex, layerId) {
    var facing = getFacing(doc, facingIndex);
    if (!facing || !Array.isArray(facing.layers)) return null;
    var id = String(layerId || facing.activeLayerId || '');
    for (var i = 0; i < facing.layers.length; i += 1) {
      if (String(facing.layers[i].id) === id) return facing.layers[i];
    }
    return facing.layers[0] || null;
  }

  function pixelOffset(doc, x, y) {
    x = Math.round(Number(x));
    y = Math.round(Number(y));
    if (!doc || x < 0 || y < 0 || x >= doc.width || y >= doc.height) return -1;
    return (y * doc.width + x) * 4;
  }

  function getLayerOffset(layer) {
    var raw = layer && layer.offsetPx && typeof layer.offsetPx === 'object' ? layer.offsetPx : null;
    return { x: Math.round(Number(raw && raw.x) || 0), y: Math.round(Number(raw && raw.y) || 0) };
  }

  function getLayerSurfaceSize(layer, fallbackWidth, fallbackHeight) {
    var raw = layer && layer.surfaceSize && typeof layer.surfaceSize === 'object' ? layer.surfaceSize : null;
    var w = clampInt(raw && raw.w != null ? raw.w : fallbackWidth, 1, 4096);
    var h = clampInt(raw && raw.h != null ? raw.h : fallbackHeight, 1, 4096);
    if (layer && layer.pixels instanceof Uint8ClampedArray && layer.pixels.length !== w * h * 4) {
      var pixelCount = Math.floor(layer.pixels.length / 4);
      if (pixelCount === Math.max(1, fallbackWidth) * Math.max(1, fallbackHeight)) { w = Math.max(1, fallbackWidth); h = Math.max(1, fallbackHeight); }
      else if (pixelCount > 0) { w = Math.max(1, Math.min(4096, pixelCount)); h = 1; }
    }
    return { w: w, h: h };
  }

  function normalizeLayerSurface(layer, fallbackWidth, fallbackHeight) {
    if (!layer) return null;
    var size = getLayerSurfaceSize(layer, fallbackWidth, fallbackHeight);
    var expected = size.w * size.h * 4;
    if (!(layer.pixels instanceof Uint8ClampedArray)) layer.pixels = createPixelBuffer(size.w, size.h);
    else if (layer.pixels.length !== expected) {
      var next = new Uint8ClampedArray(expected);
      next.set(layer.pixels.subarray(0, expected));
      layer.pixels = next;
    }
    layer.surfaceSize = size;
    layer.offsetPx = getLayerOffset(layer);
    return size;
  }

  function expandLayerSurfaceToInclude(layer, fallbackWidth, fallbackHeight, x, y) {
    var size = normalizeLayerSurface(layer, fallbackWidth, fallbackHeight);
    if (!size) return false;
    x = Math.round(Number(x)); y = Math.round(Number(y));
    var offset = getLayerOffset(layer);
    if (x >= offset.x && y >= offset.y && x < offset.x + size.w && y < offset.y + size.h) return false;
    var minX = Math.min(offset.x, x), minY = Math.min(offset.y, y);
    var maxX = Math.max(offset.x + size.w, x + 1), maxY = Math.max(offset.y + size.h, y + 1);
    var nextW = clampInt(maxX - minX, 1, 4096), nextH = clampInt(maxY - minY, 1, 4096);
    var next = createPixelBuffer(nextW, nextH);
    var shiftX = offset.x - minX, shiftY = offset.y - minY;
    for (var sy = 0; sy < size.h; sy += 1) {
      var srcStart = sy * size.w * 4;
      var dstStart = ((sy + shiftY) * nextW + shiftX) * 4;
      next.set(layer.pixels.subarray(srcStart, srcStart + size.w * 4), dstStart);
    }
    layer.pixels = next;
    layer.surfaceSize = { w: nextW, h: nextH };
    layer.offsetPx = { x: minX, y: minY };
    return true;
  }

  function layerPixelOffset(doc, layer, x, y, expand) {
    if (!doc || !layer) return -1;
    x = Math.round(Number(x)); y = Math.round(Number(y));
    if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return -1;
    if (expand) expandLayerSurfaceToInclude(layer, doc.width, doc.height, x, y);
    var size = normalizeLayerSurface(layer, doc.width, doc.height);
    var offset = getLayerOffset(layer);
    var lx = x - offset.x, ly = y - offset.y;
    if (lx < 0 || ly < 0 || lx >= size.w || ly >= size.h) return -1;
    return (ly * size.w + lx) * 4;
  }

  function setPixel(doc, layer, x, y, color) {
    var offset = layerPixelOffset(doc, layer, x, y, true);
    if (offset < 0 || !layer || !(layer.pixels instanceof Uint8ClampedArray)) return false;
    var r = clampByte(color && color[0]);
    var g = clampByte(color && color[1]);
    var b = clampByte(color && color[2]);
    var a = clampByte(color && color[3]);
    var changed = layer.pixels[offset] !== r || layer.pixels[offset + 1] !== g || layer.pixels[offset + 2] !== b || layer.pixels[offset + 3] !== a;
    if (!changed) return false;
    layer.pixels[offset] = r; layer.pixels[offset + 1] = g; layer.pixels[offset + 2] = b; layer.pixels[offset + 3] = a;
    return true;
  }

  function getPixel(doc, layer, x, y) {
    var offset = layerPixelOffset(doc, layer, x, y, false);
    if (offset < 0 || !layer || !(layer.pixels instanceof Uint8ClampedArray)) return [0, 0, 0, 0];
    return [layer.pixels[offset], layer.pixels[offset + 1], layer.pixels[offset + 2], layer.pixels[offset + 3]];
  }

  function colorsEqual(a, b) {
    return !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }

  function floodFill(doc, layer, startX, startY, replacement) {
    var target = getPixel(doc, layer, startX, startY);
    var next = [clampByte(replacement[0]), clampByte(replacement[1]), clampByte(replacement[2]), clampByte(replacement[3])];
    if (colorsEqual(target, next)) return 0;
    var width = doc.width;
    var height = doc.height;
    var stack = [[Math.round(startX), Math.round(startY)]];
    var visited = new Uint8Array(width * height);
    var changed = 0;
    while (stack.length) {
      var point = stack.pop();
      var x = point[0];
      var y = point[1];
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      var index = y * width + x;
      if (visited[index]) continue;
      visited[index] = 1;
      if (!colorsEqual(getPixel(doc, layer, x, y), target)) continue;
      if (setPixel(doc, layer, x, y, next)) changed += 1;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return changed;
  }

  function drawLine(doc, layer, x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0);
    var sx = x0 < x1 ? 1 : -1;
    var dy = -Math.abs(y1 - y0);
    var sy = y0 < y1 ? 1 : -1;
    var err = dx + dy;
    var changed = 0;
    while (true) {
      if (setPixel(doc, layer, x0, y0, color)) changed += 1;
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return changed;
  }

  function drawRect(doc, layer, x0, y0, x1, y1, color, filled) {
    var minX = Math.min(Math.round(x0), Math.round(x1));
    var maxX = Math.max(Math.round(x0), Math.round(x1));
    var minY = Math.min(Math.round(y0), Math.round(y1));
    var maxY = Math.max(Math.round(y0), Math.round(y1));
    var changed = 0;
    for (var y = minY; y <= maxY; y += 1) {
      for (var x = minX; x <= maxX; x += 1) {
        if (!filled && x !== minX && x !== maxX && y !== minY && y !== maxY) continue;
        if (setPixel(doc, layer, x, y, color)) changed += 1;
      }
    }
    return changed;
  }

  function alphaComposite(dst, dstOffset, src, srcOffset, opacity) {
    var sa = (src[srcOffset + 3] / 255) * opacity;
    if (sa <= 0) return;
    var da = dst[dstOffset + 3] / 255;
    var outA = sa + da * (1 - sa);
    if (outA <= 0) {
      dst[dstOffset] = dst[dstOffset + 1] = dst[dstOffset + 2] = dst[dstOffset + 3] = 0;
      return;
    }
    dst[dstOffset] = Math.round((src[srcOffset] * sa + dst[dstOffset] * da * (1 - sa)) / outA);
    dst[dstOffset + 1] = Math.round((src[srcOffset + 1] * sa + dst[dstOffset + 1] * da * (1 - sa)) / outA);
    dst[dstOffset + 2] = Math.round((src[srcOffset + 2] * sa + dst[dstOffset + 2] * da * (1 - sa)) / outA);
    dst[dstOffset + 3] = Math.round(outA * 255);
  }

  function renderLayerToDocumentPixels(layer, width, height) {
    var output = createPixelBuffer(width, height);
    if (!layer || !(layer.pixels instanceof Uint8ClampedArray)) return output;
    var size = normalizeLayerSurface(layer, width, height);
    var offset = getLayerOffset(layer);
    for (var sy = 0; sy < size.h; sy += 1) {
      var dy = offset.y + sy;
      if (dy < 0 || dy >= height) continue;
      for (var sx = 0; sx < size.w; sx += 1) {
        var dx = offset.x + sx;
        if (dx < 0 || dx >= width) continue;
        var src = (sy * size.w + sx) * 4;
        var dst = (dy * width + dx) * 4;
        output[dst] = layer.pixels[src]; output[dst + 1] = layer.pixels[src + 1]; output[dst + 2] = layer.pixels[src + 2]; output[dst + 3] = layer.pixels[src + 3];
      }
    }
    return output;
  }

  function compositeFacing(doc, facingIndex) {
    var facing = getFacing(doc, facingIndex);
    var output = createPixelBuffer(doc.width, doc.height);
    if (!facing) return output;
    for (var i = 0; i < facing.layers.length; i += 1) {
      var layer = facing.layers[i];
      if (!layer || layer.visible === false || layer.opacity <= 0) continue;
      var shifted = renderLayerToDocumentPixels(layer, doc.width, doc.height);
      for (var o = 0; o < output.length; o += 4) alphaComposite(output, o, shifted, o, layer.opacity);
    }
    return output;
  }

  // Moving a layer is deliberately non-destructive. Pixels remain in the backing
  // buffer and only the viewport transform changes, so content outside the
  // document frame can be moved back later without being cropped.
  function translateLayerPixels(layer, width, height, dx, dy) {
    if (!layer || !(layer.pixels instanceof Uint8ClampedArray)) return false;
    dx = Math.round(Number(dx) || 0);
    dy = Math.round(Number(dy) || 0);
    if (!dx && !dy) return false;
    var offset = getLayerOffset(layer);
    layer.offsetPx = { x: offset.x + dx, y: offset.y + dy };
    return true;
  }

  function nearestResizePixels(source, sourceWidth, sourceHeight, targetWidth, targetHeight) {
    targetWidth = clampInt(targetWidth, 1, 2048);
    targetHeight = clampInt(targetHeight, 1, 2048);
    var out = createPixelBuffer(targetWidth, targetHeight);
    for (var y = 0; y < targetHeight; y += 1) {
      var sy = Math.min(sourceHeight - 1, Math.floor(y * sourceHeight / targetHeight));
      for (var x = 0; x < targetWidth; x += 1) {
        var sx = Math.min(sourceWidth - 1, Math.floor(x * sourceWidth / targetWidth));
        var srcOffset = (sy * sourceWidth + sx) * 4;
        var dstOffset = (y * targetWidth + x) * 4;
        out[dstOffset] = source[srcOffset];
        out[dstOffset + 1] = source[srcOffset + 1];
        out[dstOffset + 2] = source[srcOffset + 2];
        out[dstOffset + 3] = source[srcOffset + 3];
      }
    }
    return out;
  }

  function colorDistanceSq(a, b) {
    var dr = a[0] - b[0];
    var dg = a[1] - b[1];
    var db = a[2] - b[2];
    var da = (a[3] - b[3]) * 0.35;
    return dr * dr + dg * dg + db * db + da * da;
  }

  function buildFrequentPalette(pixels, limit) {
    limit = clampInt(limit || 0, 0, 256);
    if (!limit) return [];
    var map = new Map();
    for (var i = 0; i < pixels.length; i += 4) {
      var a = pixels[i + 3];
      if (a === 0) continue;
      var key = pixels[i] + ',' + pixels[i + 1] + ',' + pixels[i + 2] + ',' + a;
      map.set(key, (map.get(key) || 0) + 1);
    }
    var entries = Array.from(map.entries()).sort(function (a, b) { return b[1] - a[1]; });
    if (entries.length <= limit) {
      return entries.map(function (entry) { return entry[0].split(',').map(Number); });
    }
    var seedCount = Math.min(limit, entries.length);
    var palette = [];
    for (var s = 0; s < seedCount; s += 1) {
      var index = Math.floor(s * entries.length / seedCount);
      palette.push(entries[index][0].split(',').map(Number));
    }
    for (var iteration = 0; iteration < 4; iteration += 1) {
      var sums = palette.map(function () { return [0, 0, 0, 0, 0]; });
      for (var e = 0; e < entries.length; e += 1) {
        var color = entries[e][0].split(',').map(Number);
        var weight = entries[e][1];
        var best = 0;
        var bestDistance = Infinity;
        for (var p = 0; p < palette.length; p += 1) {
          var distance = colorDistanceSq(color, palette[p]);
          if (distance < bestDistance) { bestDistance = distance; best = p; }
        }
        sums[best][0] += color[0] * weight;
        sums[best][1] += color[1] * weight;
        sums[best][2] += color[2] * weight;
        sums[best][3] += color[3] * weight;
        sums[best][4] += weight;
      }
      for (var q = 0; q < palette.length; q += 1) {
        if (!sums[q][4]) continue;
        palette[q] = [
          Math.round(sums[q][0] / sums[q][4]),
          Math.round(sums[q][1] / sums[q][4]),
          Math.round(sums[q][2] / sums[q][4]),
          Math.round(sums[q][3] / sums[q][4])
        ];
      }
    }
    return palette;
  }

  function quantizePixels(pixels, limit) {
    var palette = buildFrequentPalette(pixels, limit);
    if (!palette.length) return { pixels: new Uint8ClampedArray(pixels), palette: [] };
    var out = new Uint8ClampedArray(pixels.length);
    for (var i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue;
      var color = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
      var best = 0;
      var bestDistance = Infinity;
      for (var p = 0; p < palette.length; p += 1) {
        var distance = colorDistanceSq(color, palette[p]);
        if (distance < bestDistance) { bestDistance = distance; best = p; }
      }
      out[i] = palette[best][0];
      out[i + 1] = palette[best][1];
      out[i + 2] = palette[best][2];
      out[i + 3] = palette[best][3];
    }
    return { pixels: out, palette: palette };
  }

  function resizeDocument(doc, targetWidth, targetHeight) {
    targetWidth = clampInt(targetWidth, 1, 512);
    targetHeight = clampInt(targetHeight, 1, 512);
    var oldWidth = doc.width, oldHeight = doc.height;
    var sx = targetWidth / oldWidth, sy = targetHeight / oldHeight;
    for (var f = 0; f < doc.facings.length; f += 1) {
      var facing = doc.facings[f];
      for (var l = 0; l < facing.layers.length; l += 1) {
        var layer = facing.layers[l];
        var size = normalizeLayerSurface(layer, oldWidth, oldHeight);
        var nextW = Math.max(1, Math.round(size.w * sx)), nextH = Math.max(1, Math.round(size.h * sy));
        layer.pixels = nearestResizePixels(layer.pixels, size.w, size.h, nextW, nextH);
        var layerOffset = getLayerOffset(layer);
        layer.offsetPx = { x: Math.round(layerOffset.x * sx), y: Math.round(layerOffset.y * sy) };
        layer.surfaceSize = { w: nextW, h: nextH };
      }
    }
    doc.width = targetWidth; doc.height = targetHeight;
    doc.metadata.updatedAt = new Date().toISOString();
    return doc;
  }

  function copyFacing(doc, sourceIndex, targetIndex) {
    var source = getFacing(doc, sourceIndex);
    var target = getFacing(doc, targetIndex);
    if (!source || !target) return false;
    target.layers = source.layers.map(function (layer, index) {
      return createLayer(doc.width, doc.height, {
        id: makeId('layer'),
        name: layer.name + (index === 0 ? '' : ''),
        visible: layer.visible,
        opacity: layer.opacity,
        locked: layer.locked === true,
        blendMode: layer.blendMode || 'normal',
        source: layer.source,
        metadata: layer.metadata,
        offsetPx: getLayerOffset(layer),
        surface: Object.assign({ x: getLayerOffset(layer).x, y: getLayerOffset(layer).y }, getLayerSurfaceSize(layer, doc.width, doc.height)),
        pixels: layer.pixels
      });
    });
    target.activeLayerId = target.layers[0] ? target.layers[0].id : '';
    doc.metadata.updatedAt = new Date().toISOString();
    return true;
  }

  function encodeRleRgba(pixels) {
    var runs = [];
    if (!(pixels instanceof Uint8ClampedArray) || pixels.length === 0) return runs;
    var count = 1;
    var r = pixels[0], g = pixels[1], b = pixels[2], a = pixels[3];
    for (var i = 4; i < pixels.length; i += 4) {
      if (pixels[i] === r && pixels[i + 1] === g && pixels[i + 2] === b && pixels[i + 3] === a && count < 65535) {
        count += 1;
      } else {
        runs.push(count, r, g, b, a);
        count = 1; r = pixels[i]; g = pixels[i + 1]; b = pixels[i + 2]; a = pixels[i + 3];
      }
    }
    runs.push(count, r, g, b, a);
    return runs;
  }

  function decodeRleRgba(runs, expectedPixelCount) {
    var out = new Uint8ClampedArray(Math.max(0, expectedPixelCount) * 4);
    var cursor = 0;
    for (var i = 0; Array.isArray(runs) && i + 4 < runs.length; i += 5) {
      var count = clampInt(runs[i], 0, 65535);
      var color = [clampByte(runs[i + 1]), clampByte(runs[i + 2]), clampByte(runs[i + 3]), clampByte(runs[i + 4])];
      for (var n = 0; n < count && cursor < out.length; n += 1) {
        out[cursor] = color[0]; out[cursor + 1] = color[1]; out[cursor + 2] = color[2]; out[cursor + 3] = color[3];
        cursor += 4;
      }
    }
    return out;
  }

  function serializeDocument(doc) {
    return {
      version: VERSION,
      width: doc.width,
      height: doc.height,
      activeFacing: clampInt(doc.activeFacing, 0, 3),
      palette: Array.isArray(doc.palette) ? doc.palette.slice(0, 256) : [],
      metadata: Object.assign({}, doc.metadata || {}, { updatedAt: new Date().toISOString() }),
      facings: doc.facings.map(function (facing) {
        return {
          id: facing.id,
          name: facing.name,
          activeLayerId: facing.activeLayerId,
          layers: facing.layers.map(function (layer) {
            return {
              id: layer.id,
              name: layer.name,
              visible: layer.visible !== false,
              locked: layer.locked === true,
              opacity: Math.max(0, Math.min(1, Number(layer.opacity) || 0)),
              blendMode: String(layer.blendMode || 'normal'),
              source: layer.source && typeof layer.source === 'object' ? JSON.parse(JSON.stringify(layer.source)) : null,
              metadata: layer.metadata && typeof layer.metadata === 'object' ? JSON.parse(JSON.stringify(layer.metadata)) : {},
              offsetPx: getLayerOffset(layer),
              surface: (function () { var o = getLayerOffset(layer), z = getLayerSurfaceSize(layer, doc.width, doc.height); return { x: o.x, y: o.y, w: z.w, h: z.h }; })(),
              encoding: 'rle-rgba-v2-unbounded-surface',
              runs: encodeRleRgba(layer.pixels)
            };
          })
        };
      })
    };
  }

  function deserializeDocument(serialized) {
    if (!serialized || !Array.isArray(serialized.facings)) return createDocument(32, 32);
    var doc = createDocument(serialized.width, serialized.height, { palette: serialized.palette, metadata: serialized.metadata });
    doc.activeFacing = clampInt(serialized.activeFacing, 0, 3);
    doc.facings = [];
    for (var f = 0; f < 4; f += 1) {
      var sourceFacing = serialized.facings[f] || {};
      var facing = { id: f, name: String(sourceFacing.name || ('方向 ' + f)), layers: [], activeLayerId: String(sourceFacing.activeLayerId || '') };
      var sourceLayers = Array.isArray(sourceFacing.layers) && sourceFacing.layers.length ? sourceFacing.layers : [{ name: '图层 1', runs: [] }];
      for (var l = 0; l < sourceLayers.length; l += 1) {
        var sourceLayer = sourceLayers[l] || {};
        facing.layers.push(createLayer(doc.width, doc.height, {
          id: sourceLayer.id,
          name: sourceLayer.name || ('图层 ' + (l + 1)),
          visible: sourceLayer.visible !== false,
          locked: sourceLayer.locked === true,
          opacity: sourceLayer.opacity == null ? 1 : sourceLayer.opacity,
          blendMode: sourceLayer.blendMode || 'normal',
          source: sourceLayer.source,
          metadata: sourceLayer.metadata,
          offsetPx: sourceLayer.surface || sourceLayer.offsetPx,
          surface: sourceLayer.surface || null,
          pixels: decodeRleRgba(sourceLayer.runs, sourceLayer.surface && sourceLayer.surface.w && sourceLayer.surface.h ? sourceLayer.surface.w * sourceLayer.surface.h : doc.width * doc.height)
        }));
      }
      if (!facing.layers.some(function (layer) { return layer.id === facing.activeLayerId; })) facing.activeLayerId = facing.layers[0].id;
      doc.facings.push(facing);
    }
    return doc;
  }

  function cloneDocument(doc) {
    return deserializeDocument(serializeDocument(doc));
  }

  var api = {
    VERSION: VERSION,
    clampInt: clampInt,
    createDocument: createDocument,
    createLayer: createLayer,
    createPixelBuffer: createPixelBuffer,
    getFacing: getFacing,
    getLayer: getLayer,
    getPixel: getPixel,
    getLayerOffset: getLayerOffset,
    getLayerSurfaceSize: getLayerSurfaceSize,
    normalizeLayerSurface: normalizeLayerSurface,
    expandLayerSurfaceToInclude: expandLayerSurfaceToInclude,
    renderLayerToDocumentPixels: renderLayerToDocumentPixels,
    setPixel: setPixel,
    floodFill: floodFill,
    drawLine: drawLine,
    drawRect: drawRect,
    translateLayerPixels: translateLayerPixels,
    compositeFacing: compositeFacing,
    nearestResizePixels: nearestResizePixels,
    quantizePixels: quantizePixels,
    resizeDocument: resizeDocument,
    copyFacing: copyFacing,
    encodeRleRgba: encodeRleRgba,
    decodeRleRgba: decodeRleRgba,
    serializeDocument: serializeDocument,
    deserializeDocument: deserializeDocument,
    cloneDocument: cloneDocument,
    makeId: makeId
  };

  global.__HZH_PIXEL_ART_CORE__ = api;
  if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
    global.__APP_NAMESPACE.bind('core.pixelArt', api, { owner: 'src/core/domain/pixel-art-core.js', phase: 'asset-editor-v2' });
  }
})(typeof window !== 'undefined' ? window : globalThis);
