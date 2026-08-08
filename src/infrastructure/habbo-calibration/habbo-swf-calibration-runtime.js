// Standalone Habbo SWF calibration runtime.
// Reuses the project's SWF/XML/bitmap rules without bootstrapping the main scene editor.
(function (global) {
  'use strict';

  function habboTrace() {}
  function pushHabboDebug() {}
  function detailLog() {}
  function cloneJsonSafe(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
  }
  function bytesToLatin1Text(bytes) {
    return new TextDecoder('latin1').decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  }
  function toInt(value, fallback) {
    var n = parseInt(value, 10);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }
  function normalizeHabboSourceDirections(list) {
    return (Array.isArray(list) ? list : []).map(function (value) { return toInt(value, 0); })
      .filter(function (value, index, arr) { return arr.indexOf(value) === index; })
      .sort(function (a, b) { return a - b; });
  }
  function habboDirectionDistance(a, b) {
    var delta = Math.abs(toInt(a, 0) - toInt(b, 0)) % 8;
    return Math.min(delta, 8 - delta);
  }
  function chooseHabboOrthogonalPair(directions) {
    var dirs = normalizeHabboSourceDirections(directions);
    if (dirs.length <= 2) return dirs.slice(0, 2);
    var best = [dirs[0], dirs[1]];
    var bestScore = Infinity;
    for (var i = 0; i < dirs.length; i++) {
      for (var j = i + 1; j < dirs.length; j++) {
        var distance = habboDirectionDistance(dirs[i], dirs[j]);
        var score = Math.abs(distance - 2) * 100 + i * 10 + j;
        if (score < bestScore) { bestScore = score; best = [dirs[i], dirs[j]]; }
      }
    }
    return best;
  }
  function chooseHabboFourDirections(directions) {
    var dirs = normalizeHabboSourceDirections(directions);
    var canonical = [0, 2, 4, 6];
    if (canonical.every(function (dir) { return dirs.indexOf(dir) >= 0; })) return canonical;
    if (dirs.length <= 4) return dirs.slice(0, 4);
    var out = [];
    for (var i = 0; i < 4; i++) {
      var index = Math.floor(i * dirs.length / 4);
      var selected = dirs[Math.min(dirs.length - 1, index)];
      if (out.indexOf(selected) < 0) out.push(selected);
    }
    for (var j = 0; j < dirs.length && out.length < 4; j++) if (out.indexOf(dirs[j]) < 0) out.push(dirs[j]);
    return out.slice(0, 4);
  }
  function buildHabboFacingPlan(sourceDirections) {
    var source = normalizeHabboSourceDirections(sourceDirections);
    if (!source.length) source = [0];
    var selected;
    var strategy;
    if (source.length >= 4) { selected = chooseHabboFourDirections(source); strategy = 'four-native'; }
    else if (source.length >= 2) { selected = chooseHabboOrthogonalPair(source); strategy = 'two-mirror'; }
    else { selected = [source[0]]; strategy = 'single-mirror'; }
    var directionMap;
    if (strategy === 'four-native') {
      directionMap = [0, 1, 2, 3].map(function (facing) {
        return { gameFacing: facing, directionKey: String(facing), sourceDirection: selected[facing], mirrorX: false, sourceKind: 'native' };
      });
    } else if (strategy === 'two-mirror') {
      directionMap = [
        { gameFacing: 0, directionKey: '0', sourceDirection: selected[0], mirrorX: false, sourceKind: 'native' },
        { gameFacing: 1, directionKey: '1', sourceDirection: selected[1], mirrorX: false, sourceKind: 'native' },
        { gameFacing: 2, directionKey: '0', sourceDirection: selected[0], mirrorX: true, sourceKind: 'generated-mirror' },
        { gameFacing: 3, directionKey: '1', sourceDirection: selected[1], mirrorX: true, sourceKind: 'generated-mirror' }
      ];
    } else {
      directionMap = [
        { gameFacing: 0, directionKey: '0', sourceDirection: selected[0], mirrorX: false, sourceKind: 'native' },
        { gameFacing: 1, directionKey: '0', sourceDirection: selected[0], mirrorX: true, sourceKind: 'generated-mirror' },
        { gameFacing: 2, directionKey: '0', sourceDirection: selected[0], mirrorX: false, sourceKind: 'reused-native' },
        { gameFacing: 3, directionKey: '0', sourceDirection: selected[0], mirrorX: true, sourceKind: 'generated-mirror' }
      ];
    }
    return {
      strategy: strategy,
      sourceDirections: source.slice(),
      sourceDirectionCount: source.length,
      selectedSourceDirections: selected.slice(),
      ignoredSourceDirections: source.filter(function (dir) { return selected.indexOf(dir) < 0; }),
      directionMap: directionMap
    };
  }
  global.__ITEM_FACING_CORE__ = global.__ITEM_FACING_CORE__ || { buildHabboFacingPlan: buildHabboFacingPlan };
async function inflateZlibBytes(input) {
  var bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (typeof DecompressionStream !== 'function') throw new Error('当前浏览器不支持 DecompressionStream，无法解压 SWF / bitmap 数据');
  var ds = new DecompressionStream('deflate');
  var decompressed = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(decompressed);
}

async function inflateSwfBytes(arrayBuffer) {
  var bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
  if (bytes.length < 8) throw new Error('SWF 文件过小');
  var sig = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
  if (sig === 'FWS') return bytes;
  if (sig !== 'CWS') throw new Error('当前只支持 FWS/CWS 的 SWF');
  var header = bytes.slice(0, 8);
  var body = bytes.slice(8);
  var decompressed = await inflateZlibBytes(body);
  var out = new Uint8Array(8 + decompressed.byteLength);
  out.set(header, 0);
  out.set(decompressed, 8);
  out[0] = 70; out[1] = 87; out[2] = 83;
  return out;
}

function parseXmlAttributes(fragment) {
  var attrs = {};
  String(fragment || '').replace(/(\w+)="([^"]*)"/g, function (_, key, value) {
    attrs[key] = value;
    return _;
  });
  return attrs;
}

function extractHabboXmlFragment(text, tagName) {
  var re = new RegExp('<' + tagName + '\\b[\\s\\S]*?<\\/' + tagName + '>', 'i');
  var m = String(text || '').match(re);
  return m ? m[0] : '';
}

function readSwfBits(bytes, bitIndex, count) {
  var value = 0;
  for (var i = 0; i < count; i++) {
    var byteIndex = bitIndex >> 3;
    var bitOffset = 7 - (bitIndex & 7);
    value = (value << 1) | ((bytes[byteIndex] >> bitOffset) & 1);
    bitIndex += 1;
  }
  return { value: value, bitIndex: bitIndex };
}

function readSwfSignedBits(bytes, bitIndex, count) {
  var out = readSwfBits(bytes, bitIndex, count);
  var value = out.value;
  if (count > 0 && (value & (1 << (count - 1)))) value -= (1 << count);
  return { value: value, bitIndex: out.bitIndex };
}

function getSwfTagStreamOffset(bytes) {
  var bitIndex = 8 * 8;
  var head = readSwfBits(bytes, bitIndex, 5);
  var nbits = head.value;
  bitIndex = head.bitIndex;
  for (var i = 0; i < 4; i++) {
    var signed = readSwfSignedBits(bytes, bitIndex, nbits);
    bitIndex = signed.bitIndex;
  }
  return Math.ceil(bitIndex / 8) + 4;
}

function parseSwfTags(bytes) {
  var out = [];
  var pos = getSwfTagStreamOffset(bytes);
  habboTrace('parseSwfTags:start bytes=' + bytes.length + ' tagStreamOffset=' + pos);
  while (pos + 2 <= bytes.length) {
    var header = bytes[pos] | (bytes[pos + 1] << 8);
    pos += 2;
    var code = header >> 6;
    var length = header & 0x3f;
    if (length === 0x3f) {
      if (pos + 4 > bytes.length) break;
      length = (bytes[pos]) | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24);
      pos += 4;
    }
    var body = bytes.slice(pos, pos + length);
    pos += length;
    out.push({ code: code, length: length, body: body });
    if (code === 0) break;
  }
  habboTrace('parseSwfTags:done tags=' + out.length + ' codes=' + out.slice(0, 24).map(function (t) { return t.code + ':' + t.length; }).join(','));
  return out;
}

function parseSwfSymbolClassMap(tags) {
  var map = {};
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    if (!tag || tag.code !== 76) continue;
    var body = tag.body;
    var pos = 0;
    if (body.length < 2) continue;
    var count = body[pos] | (body[pos + 1] << 8);
    pos += 2;
    for (var j = 0; j < count; j++) {
      if (pos + 2 > body.length) break;
      var characterId = body[pos] | (body[pos + 1] << 8);
      pos += 2;
      var start = pos;
      while (pos < body.length && body[pos] !== 0) pos += 1;
      var name = bytesToLatin1Text(body.slice(start, pos));
      pos += 1;
      map[characterId] = name;
    }
  }
  habboTrace('symbolClassMap:count=' + Object.keys(map).length + ' sample=' + Object.keys(map).slice(0, 16).map(function (k) { return k + '=>' + map[k]; }).join(' | '));
  return map;
}

function getHabboAssetNameFromSymbolClass(className, type) {
  var raw = String(className || '');
  var prefix = String(type || '');
  if (prefix && raw.indexOf(prefix + '_') === 0) return raw.slice(prefix.length + 1);
  return raw;
}

function collectHabboXmlTextsFromTags(tags) {
  var out = {
    objectDataXml: '',
    assetsXml: '',
    visualizationXml: '',
    objectXml: '',
    manifestXml: '',
  };
  function normalizeXmlText(raw) {
    var s = String(raw || '');
    s = s.replace(/^\uFEFF?\s*/, '');
    s = s.replace(/^<\?xml[^>]*>\s*/i, '');
    return s.trim();
  }
  function startsWithRoot(s, rootTag) {
    return new RegExp('^\\s*<' + rootTag + '(?:\\s|>)', 'i').test(String(s || ''));
  }
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    if (!tag || tag.code !== 87 || !tag.body || tag.body.length < 6) continue;
    var payload = tag.body.slice(6);
    var normalized = normalizeXmlText(bytesToLatin1Text(payload));
    if (!normalized || normalized.charAt(0) !== '<') continue;

    if (!out.objectDataXml && startsWithRoot(normalized, 'objectData')) { out.objectDataXml = normalized; continue; }
    if (!out.visualizationXml && startsWithRoot(normalized, 'visualizationData')) { out.visualizationXml = normalized; continue; }
    if (!out.objectXml && startsWithRoot(normalized, 'object')) { out.objectXml = normalized; continue; }
    if (!out.manifestXml && startsWithRoot(normalized, 'manifest')) { out.manifestXml = normalized; continue; }
    if (!out.assetsXml && startsWithRoot(normalized, 'assets')) { out.assetsXml = normalized; continue; }

    if (!out.objectDataXml) {
      var od = extractHabboXmlFragment(normalized, 'objectData');
      if (od) out.objectDataXml = od;
    }
    if (!out.visualizationXml) {
      var vz = extractHabboXmlFragment(normalized, 'visualizationData');
      if (vz) out.visualizationXml = vz;
    }
    if (!out.objectXml) {
      var ox = normalized.match(/<object\b[^>]*\/?>/i);
      if (ox) out.objectXml = ox[0];
    }
    if (!out.manifestXml) {
      var mf = extractHabboXmlFragment(normalized, 'manifest');
      if (mf) out.manifestXml = mf;
    }
  }
  habboTrace('xml-blocks objectData=' + (!!out.objectDataXml) + ' visualization=' + (!!out.visualizationXml) + ' object=' + (!!out.objectXml) + ' assets=' + (!!out.assetsXml) + ' manifest=' + (!!out.manifestXml));
  return out;
}

function parseHabboAssetDescriptor(name) {
  var raw = String(name || '');
  var info = {
    size: 0,
    direction: 0,
    frame: 0,
    layerId: '',
    kind: 'body'
  };
  var iconMatch = raw.match(/_icon(?:_([a-z0-9]+))?$/i);
  if (iconMatch) {
    info.layerId = 'icon';
    info.kind = 'icon';
    return info;
  }
  var m = raw.match(/_(\d+)_([a-z]+)_(\d+)_(\d+)$/i);
  if (m) {
    info.size = Number(m[1]) || 0;
    info.layerId = String(m[2] || '').toLowerCase();
    info.direction = Number(m[3]) || 0;
    info.frame = Number(m[4]) || 0;
    if (info.layerId === 'sd') info.kind = 'shadow';
    else info.kind = 'body';
    return info;
  }
  if (/_sd_/i.test(raw)) info.kind = 'shadow';
  return info;
}

function parseHabboVisualizationGraphics(xmlText) {
  var out = { sizes: {}, raw: String(xmlText || '') };
  var text = String(xmlText || '');
  if (!text) return out;
  var visRe = /<visualization\b([^>]*)>([\s\S]*?)<\/visualization>/ig;
  var visMatch;
  while ((visMatch = visRe.exec(text))) {
    var visAttrs = parseXmlAttributes(visMatch[1]);
    var size = Math.max(0, Number(visAttrs.size) || 0);
    var body = visMatch[2] || '';
    var vis = {
      size: size,
      layerCount: Math.max(0, Number(visAttrs.layerCount) || 0),
      angle: Number(visAttrs.angle) || 0,
      layers: {},
      directions: [],
      directionLayers: {},
      animations: {},
    };

    function parseLayerMap(layerBody) {
      var map = {};
      var layerRe = /<layer\b([^>]*)\/?>(?:<\/layer>)?/ig;
      var layerMatch;
      while ((layerMatch = layerRe.exec(layerBody || ''))) {
        var a = parseXmlAttributes(layerMatch[1]);
        var id = Number(a.id);
        if (!Number.isFinite(id)) continue;
        map[id] = {
          id: id,
          x: Number(a.x) || 0,
          y: Number(a.y) || 0,
          z: Number(a.z) || 0,
          alpha: a.alpha != null ? Number(a.alpha) : null,
          ink: a.ink || '',
          tag: a.tag || '',
          interactive: a.interactive === '1' || a.interactive === 'true',
        };
      }
      return map;
    }

    var layersSection = body.match(/<layers\b[^>]*>([\s\S]*?)<\/layers>/i);
    vis.layers = parseLayerMap(layersSection ? layersSection[1] : body.replace(/<directions\b[\s\S]*?<\/directions>/ig, '').replace(/<animations\b[\s\S]*?<\/animations>/ig, ''));

    var directionsSection = body.match(/<directions\b[^>]*>([\s\S]*?)<\/directions>/i);
    var directionBody = directionsSection ? directionsSection[1] : body;
    var dirRe = /<direction\b([^>]*?)(?:\/>|>([\s\S]*?)<\/direction>)/ig;
    var dirMatch;
    while ((dirMatch = dirRe.exec(directionBody))) {
      var da = parseXmlAttributes(dirMatch[1]);
      var directionId = Number(da.id);
      if (!Number.isFinite(directionId)) continue;
      vis.directions.push(directionId);
      vis.directionLayers[String(directionId)] = parseLayerMap(dirMatch[2] || '');
    }
    vis.directions = vis.directions.filter(function (v, i, arr) { return arr.indexOf(v) === i; }).sort(function (a, b) { return a - b; });

    var animRe = /<animation\b([^>]*)>([\s\S]*?)<\/animation>/ig;
    var animMatch;
    while ((animMatch = animRe.exec(body))) {
      var aa = parseXmlAttributes(animMatch[1]);
      var stateId = aa.id != null ? Number(aa.id) : (aa.state != null ? Number(aa.state) : 0);
      if (!Number.isFinite(stateId)) stateId = 0;
      var animBody = animMatch[2] || '';
      var anim = { id: stateId, layers: {} };
      var alRe = /<animationLayer\b([^>]*?)(?:\/>|>([\s\S]*?)<\/animationLayer>)/ig;
      var alMatch;
      while ((alMatch = alRe.exec(animBody))) {
        var ala = parseXmlAttributes(alMatch[1]);
        var layerId = Number(ala.id);
        if (!Number.isFinite(layerId)) continue;
        var frames = [];
        var fsRe = /<frame\b([^>]*)\/>/ig;
        var fMatch;
        while ((fMatch = fsRe.exec(alMatch[2] || ''))) {
          var fa = parseXmlAttributes(fMatch[1]);
          if (fa.id != null && Number.isFinite(Number(fa.id))) frames.push(Number(fa.id));
        }
        // A self-closing animationLayer means the layer stays on its default frame.
        if (!frames.length) frames.push(0);
        anim.layers[layerId] = {
          id: layerId,
          frames: frames,
          frameRepeat: ala.frameRepeat != null ? Number(ala.frameRepeat) : 0,
          loopCount: ala.loopCount != null ? Number(ala.loopCount) : 0,
        };
      }
      vis.animations[String(stateId)] = anim;
    }
    out.sizes[String(size)] = vis;
  }
  return out;
}

function chooseHabboVisualization(meta, preferredSize) {
  var sizes = meta && meta.visualizationInfo && meta.visualizationInfo.sizes ? meta.visualizationInfo.sizes : null;
  if (!sizes) return null;
  var requested = String(Math.max(0, Number(preferredSize) || 0));
  if (sizes[requested]) return sizes[requested];
  var keys = Object.keys(sizes).map(function (k) { return Number(k); }).filter(function (n) { return Number.isFinite(n); }).sort(function (a, b) { return b - a; });
  if (!keys.length) return null;
  return sizes[String(keys[0])] || null;
}

function getHabboVisualizationStates(meta, preferredSize) {
  var vis = chooseHabboVisualization(meta, preferredSize == null ? chooseHabboPreferredVisualSize(meta) : preferredSize);
  var keys = vis && vis.animations ? Object.keys(vis.animations).map(Number).filter(function (value) { return Number.isFinite(value); }) : [];
  keys = keys.filter(function (value, index, array) { return array.indexOf(value) === index; }).sort(function (a, b) { return a - b; });
  return keys.length ? keys : [0];
}

function scoreHabboVisualizationState(meta, bitmaps, stateId, preferredSize) {
  var vis = chooseHabboVisualization(meta, preferredSize == null ? chooseHabboPreferredVisualSize(meta) : preferredSize);
  if (!vis) return { stateId: stateId, validLayers: 0, totalLayers: 0 };
  var directions = vis.directions && vis.directions.length ? vis.directions : [0];
  var valid = 0, total = 0;
  for (var d = 0; d < directions.length; d += 1) {
    for (var layerId = 0; layerId <= vis.layerCount; layerId += 1) {
      total += 1;
      var letter = getHabboLayerLetter(layerId, vis.layerCount);
      var frame = getHabboAnimationFrameForLayer(vis, layerId, stateId);
      var asset = chooseHabboAssetForLayer(meta, letter, directions[d], frame, vis.size || preferredSize);
      var image = asset ? resolveHabboLayerImage(bitmaps || {}, asset) : null;
      if (image && (Number(image.width) > 1 || Number(image.height) > 1 || letter === 'sd')) valid += 1;
    }
  }
  return { stateId: stateId, validLayers: valid, totalLayers: total };
}

function getHabboVisualizationState(meta, bitmaps, preferredSize) {
  var states = getHabboVisualizationStates(meta, preferredSize);
  var scored = states.map(function (stateId) { return scoreHabboVisualizationState(meta, bitmaps, stateId, preferredSize); });
  scored.sort(function (a, b) { return b.validLayers - a.validLayers || a.stateId - b.stateId; });
  return scored.length ? scored[0].stateId : 0;
}

function getHabboLayerLetter(layerId, layerCount) {
  return layerId === layerCount ? 'sd' : String.fromCharCode(97 + layerId);
}

function getHabboAnimationFrameForLayer(vis, layerId, stateId) {
  var anims = vis && vis.animations ? vis.animations : null;
  if (!anims) return 0;
  var anim = anims[String(stateId)] || anims['0'] || null;
  if (!anim || !anim.layers) return 0;
  var layer = anim.layers[layerId];
  if (!layer || !layer.frames || !layer.frames.length) return 0;
  return Number(layer.frames[0]) || 0;
}

function chooseHabboAssetForLayer(meta, letter, direction, frame, preferredSize) {
  var all = (meta && meta.assets ? meta.assets : []).filter(function (asset) {
    return asset && String(asset.layerId || '') === String(letter || '');
  });
  if (!all.length) return null;
  function best(candidates) {
    if (!candidates.length) return null;
    candidates = candidates.slice().sort(function (a, b) {
      function score(asset) {
        var s = 0;
        if (Number(asset.direction || 0) === Number(direction || 0)) s += 100;
        else if (Number(asset.direction || 0) === 0) s += 50;
        if (Number(asset.frame || 0) === Number(frame || 0)) s += 20;
        else if (Number(asset.frame || 0) === 0) s += 10;
        if (Number(asset.size || 0) === Number(preferredSize || 0)) s += 5;
        if (asset.source) s += 1;
        return s;
      }
      var ds = score(b) - score(a);
      if (ds) return ds;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return candidates[0] || null;
  }
  var bySize = preferredSize > 0 ? all.filter(function (a) { return Number(a.size || 0) === Number(preferredSize || 0); }) : all.slice();
  return best(bySize) || best(all);
}

function parseHabboSwfMetadataFromXmls(xmls) {
  var text = [xmls && xmls.assetsXml || '', xmls && xmls.objectDataXml || '', xmls && xmls.visualizationXml || '', xmls && xmls.objectXml || ''].join('\n');
  var out = {
    type: '',
    dimensions: { x: 1, y: 1, z: 1 },
    logicDirections: [],
    visualDirections: [],
    visualization: '',
    logic: '',
    assets: [],
    visualizationInfo: null,
    raw: {
      objectDataXml: xmls && xmls.objectDataXml || '',
      assetsXml: xmls && xmls.assetsXml || '',
      visualizationXml: xmls && xmls.visualizationXml || '',
      objectXml: xmls && xmls.objectXml || '',
      manifestXml: xmls && xmls.manifestXml || '',
      fullText: text,
    },
  };
  var objectDataXml = xmls && xmls.objectDataXml || '';
  var objectXml = xmls && xmls.objectXml || '';
  var assetsXml = xmls && xmls.assetsXml || '';
  var visualizationXml = xmls && xmls.visualizationXml || '';

  var objectXmlMatch = objectXml ? objectXml.match(/<object\b([^>]*)\/?>/i) : null;
  if (objectXmlMatch) {
    var objectAttrs = parseXmlAttributes(objectXmlMatch[1]);
    out.type = objectAttrs.type || out.type;
    out.visualization = objectAttrs.visualization || '';
    out.logic = objectAttrs.logic || '';
  }
  if (objectDataXml) {
    var headerMatch = objectDataXml.match(/<objectData\b([^>]*)>/i);
    if (headerMatch) {
      var dataAttrs = parseXmlAttributes(headerMatch[1]);
      out.type = dataAttrs.type || out.type;
    }
    var dimMatch = objectDataXml.match(/<dimensions\b([^>]*)\/>/i);
    if (dimMatch) {
      var dimAttrs = parseXmlAttributes(dimMatch[1]);
      out.dimensions = {
        x: Math.max(1, Number(dimAttrs.x) || 1),
        y: Math.max(1, Number(dimAttrs.y) || 1),
        z: Math.max(1, Number(dimAttrs.z) || 1),
      };
    }
    var dirMatch;
    var dirRe = /<direction\b([^>]*)\/>/ig;
    while ((dirMatch = dirRe.exec(objectDataXml))) {
      var dirAttrs = parseXmlAttributes(dirMatch[1]);
      if (dirAttrs.id != null) out.logicDirections.push(Number(dirAttrs.id));
    }
  }
  if (visualizationXml) {
    var visHeader = visualizationXml.match(/<visualizationData\b([^>]*)>/i);
    if (visHeader) {
      var visAttrs = parseXmlAttributes(visHeader[1]);
      if (!out.type) out.type = visAttrs.type || out.type;
    }
    out.visualizationInfo = parseHabboVisualizationGraphics(visualizationXml);
    try {
      var __visKeys = out.visualizationInfo && out.visualizationInfo.sizes ? Object.keys(out.visualizationInfo.sizes) : [];
      pushHabboDebug('visualization:parsed', { type: out.type || '', sizes: __visKeys, rawLength: visualizationXml.length || 0 });
      habboTrace('visualization:parsed type=' + String(out.type || '') + ' sizes=' + __visKeys.join(','));
    } catch (__visErr) {
      detailLog('visualization:parsed:error ' + (__visErr && __visErr.message ? __visErr.message : __visErr));
    }
  }
  if (assetsXml) {
    var assetMatch;
    var assetRe = /<asset\b([^>]*)\/>/ig;
    while ((assetMatch = assetRe.exec(assetsXml))) {
      var attrs = parseXmlAttributes(assetMatch[1]);
      if (!attrs.name) continue;
      var parsed = parseHabboAssetDescriptor(attrs.name);
      if (out.visualDirections.indexOf(parsed.direction) < 0) out.visualDirections.push(parsed.direction);
      out.assets.push({
        name: attrs.name,
        kind: parsed.kind,
        layerId: parsed.layerId,
        source: attrs.source || '',
        flipH: attrs.flipH === '1',
        direction: parsed.direction,
        frame: parsed.frame,
        size: parsed.size,
        x: Number(attrs.x) || 0,
        y: Number(attrs.y) || 0,
      });
    }
  }
  out.logicDirections = out.logicDirections.filter(function (v, idx, arr) { return arr.indexOf(v) === idx; }).sort(function (a, b) { return a - b; });
  out.visualDirections = out.visualDirections.filter(function (v, idx, arr) { return arr.indexOf(v) === idx; }).sort(function (a, b) { return a - b; });
  if (!out.type) {
    var full = text;
    var mType = full.match(/<objectData\b[^>]*\btype="([^"]+)"/i) || full.match(/<object\b[^>]*\btype="([^"]+)"/i);
    if (mType) out.type = mType[1];
  }
  if (!out.type) throw new Error('SWF 中未找到 objectData.type');
  if (!out.assets.length && assetsXml) {
    var fallbackAssetRe = /<asset\b([^>]*)\/?\>/ig;
    var fallbackMatch;
    while ((fallbackMatch = fallbackAssetRe.exec(assetsXml))) {
      var attrs = parseXmlAttributes(fallbackMatch[1]);
      if (!attrs.name) continue;
      var parsed2 = parseHabboAssetDescriptor(attrs.name);
      if (out.visualDirections.indexOf(parsed2.direction) < 0) out.visualDirections.push(parsed2.direction);
      out.assets.push({
        name: attrs.name,
        kind: parsed2.kind,
        layerId: parsed2.layerId,
        source: attrs.source || '',
        flipH: attrs.flipH === '1',
        direction: parsed2.direction,
        frame: parsed2.frame,
        size: parsed2.size,
        x: Number(attrs.x) || 0,
        y: Number(attrs.y) || 0,
      });
    }
  }
  if (!out.assets.length) throw new Error('SWF 中未找到 assets 图层定义');
  habboTrace('metadata type=' + out.type + ' dims=' + [out.dimensions.x, out.dimensions.y, out.dimensions.z].join('x') + ' logicDirs=' + out.logicDirections.join(',') + ' visualDirs=' + out.visualDirections.join(',') + ' assets=' + out.assets.length + ' assetSample=' + out.assets.slice(0, 12).map(function(a){ return a.name + '@(' + a.x + ',' + a.y + '):dir' + a.direction + ':size' + a.size + (a.flipH ? ':flip' : ''); }).join(' | '));
  return out;
}

function makeCanvas2D(width, height) {
  var canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width | 0);
  canvas.height = Math.max(1, height | 0);
  return canvas;
}

async function decodeSwfLosslessBitmapTag(tagBody) {
  if (!tagBody || tagBody.length < 7) throw new Error('Lossless bitmap tag 数据过短');
  var characterId = tagBody[0] | (tagBody[1] << 8);
  var bitmapFormat = tagBody[2];
  var width = tagBody[3] | (tagBody[4] << 8);
  var height = tagBody[5] | (tagBody[6] << 8);
  var pos = 7;
  if (bitmapFormat === 3) {
    throw new Error('当前版本暂不支持 indexed color 的 bitmapFormat=3');
  }
  if (bitmapFormat !== 5) {
    throw new Error('当前版本只支持 Habbo 常见的 DefineBitsLossless2 format=5');
  }
  var inflated = await inflateZlibBytes(tagBody.slice(pos));
  var raw = inflated instanceof Uint8Array ? inflated : new Uint8Array(inflated);
  var canvas = makeCanvas2D(width, height);
  var ctx2d = canvas.getContext('2d');
  var imageData = ctx2d.createImageData(width, height);
  var dst = imageData.data;
  for (var src = 0, di = 0; src + 3 < raw.length && di + 3 < dst.length; src += 4, di += 4) {
    var a = raw[src];
    var r = raw[src + 1];
    var g = raw[src + 2];
    var b = raw[src + 3];
    dst[di] = r;
    dst[di + 1] = g;
    dst[di + 2] = b;
    dst[di + 3] = a;
  }
  ctx2d.putImageData(imageData, 0, 0);
  return {
    characterId: characterId,
    width: width,
    height: height,
    canvas: canvas,
    dataUrl: canvas.toDataURL('image/png')
  };
}

function chooseHabboPreferredVisualSize(meta) {
  var sizes = [];
  (meta.assets || []).forEach(function (asset) {
    if (!asset || asset.kind === 'icon') return;
    if (asset.size > 0 && sizes.indexOf(asset.size) < 0) sizes.push(asset.size);
  });
  if (sizes.indexOf(64) >= 0) return 64;
  if (!sizes.length) return 0;
  sizes.sort(function (a, b) { return b - a; });
  return sizes[0];
}

async function extractHabboBitmapAssetsFromTags(tags, symbolMap, type) {
  var out = {};
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    if (!tag || tag.code !== 36) continue;
    var characterId = tag.body[0] | (tag.body[1] << 8);
    var className = symbolMap[characterId] || '';
    var assetName = getHabboAssetNameFromSymbolClass(className, type);
    var decoded = await decodeSwfLosslessBitmapTag(tag.body);
    habboTrace('bitmap characterId=' + characterId + ' class=' + className + ' asset=' + assetName + ' ' + decoded.width + 'x' + decoded.height);
    out[assetName] = {
      name: assetName,
      characterId: characterId,
      className: className,
      width: decoded.width,
      height: decoded.height,
      canvas: decoded.canvas,
      dataUrl: decoded.dataUrl
    };
  }
  habboTrace('bitmap-extract:count=' + Object.keys(out).length + ' sample=' + Object.keys(out).slice(0, 20).join(','));
  return out;
}

function resolveHabboLayerImage(bitmaps, asset) {
  if (!asset) return null;
  var sourceName = asset.source || asset.name;
  return bitmaps[sourceName] || bitmaps[asset.name] || null;
}

function pickHabboDirectionLayers(meta, bitmaps, direction, options) {
  options = options || {};
  var includeShadow = !!options.includeShadow;
  var preferredSize = options.preferredSize == null ? chooseHabboPreferredVisualSize(meta) : options.preferredSize;
  var targetDir = Number(direction) || 0;
  var skipReasons = [];
  var all = (meta.assets || []).filter(function (asset) {
    if (!asset) { skipReasons.push({ reason: 'null-asset' }); return false; }
    if (asset.kind === 'icon') { skipReasons.push({ name: asset.name, reason: 'icon' }); return false; }
    if (!includeShadow && asset.kind === 'shadow') { skipReasons.push({ name: asset.name, reason: 'shadow-excluded' }); return false; }
    var img = resolveHabboLayerImage(bitmaps, asset);
    if (!img) { skipReasons.push({ name: asset.name, reason: 'missing-bitmap', source: asset.source || '' }); return false; }
    return true;
  });
  pushHabboDebug('pickLayers:input', { type: meta.type || '', targetDir: targetDir, includeShadow: includeShadow, preferredSize: preferredSize, assetCount: (meta.assets || []).length, candidateCount: all.length, skipped: skipReasons.slice(0, 80) });
  var tryDirections = [targetDir];
  if (targetDir !== 0) tryDirections.push(0);
  for (var d = 0; d < tryDirections.length; d++) {
    var dir = tryDirections[d];
    var dirAssets = all.filter(function (asset) { return Number(asset.direction || 0) === dir; });
    if (!dirAssets.length) {
      pushHabboDebug('pickLayers:dir-empty', { type: meta.type || '', dir: dir, targetDir: targetDir });
      continue;
    }
    var sizeAssets = preferredSize > 0 ? dirAssets.filter(function (asset) { return Number(asset.size || 0) === preferredSize; }) : dirAssets.slice();
    if (!sizeAssets.length) {
      var largest = 0;
      dirAssets.forEach(function (asset) { largest = Math.max(largest, Number(asset.size || 0)); });
      sizeAssets = dirAssets.filter(function (asset) { return Number(asset.size || 0) === largest; });
      pushHabboDebug('pickLayers:fallback-size', { type: meta.type || '', dir: dir, requestedSize: preferredSize, fallbackSize: largest, dirAssets: dirAssets.map(function(a){ return { name:a.name, kind:a.kind, size:a.size, layerId:a.layerId }; }) });
    }
    var bodyAssets = sizeAssets.filter(function (asset) { return asset.kind === 'body'; });
    var layers = bodyAssets.length ? bodyAssets : sizeAssets.slice();
    if (!layers.length) continue;
    layers.sort(function (a, b) {
      var ak = a.kind === 'shadow' ? 0 : 1;
      var bk = b.kind === 'shadow' ? 0 : 1;
      if (ak !== bk) return ak - bk;
      if (a.layerId !== b.layerId) return String(a.layerId).localeCompare(String(b.layerId));
      return String(a.name).localeCompare(String(b.name));
    });
    pushHabboDebug('pickLayers:result', { type: meta.type || '', dir: dir, targetDir: targetDir, includeShadow: includeShadow, preferredSize: preferredSize, layers: layers.map(function (a) { return { name:a.name, kind:a.kind, size:a.size, x:a.x, y:a.y, layerId:a.layerId, source:a.source || '', flipH:!!a.flipH }; }) });
    habboTrace('pickLayers dir=' + dir + ' target=' + targetDir + ' includeShadow=' + includeShadow + ' preferredSize=' + preferredSize + ' picked=' + layers.map(function (a) { return a.name + ':' + a.kind + '@(' + a.x + ',' + a.y + ')' + (a.flipH ? ':flip' : '') + ':src=' + (a.source || a.name); }).join(' | '));
    return layers;
  }
  pushHabboDebug('pickLayers:none', { type: meta.type || '', targetDir: targetDir, includeShadow: includeShadow, preferredSize: preferredSize });
  habboTrace('pickLayers dir=' + targetDir + ' includeShadow=' + includeShadow + ' preferredSize=' + preferredSize + ' picked=NONE');
  return [];
}

function composeHabboDirectionSprite(meta, bitmaps, direction, options) {
  options = options || {};
  var layers = pickHabboDirectionLayers(meta, bitmaps, direction, options);
  if (!layers.length) return null;
  // 这里严肃参考 Scuti 的“room object container + texture trim”语义：
  // Scuti 运行时真正用到的是 extractor 产出的 frame trim + visualization layer offsets，
  // 而不是直接把 SWF assets.xml 里的 x/y 当成 top-left 来加到 container 上。
  // 对于我们当前“直接吃 SWF”的方案，必须先把 assets.xml 里的注册点 x/y 还原成
  // “图片左上角相对 room object origin 的偏移”。
  // Habbo 常见 floor furni 中，asset.x / asset.y 更接近 registration point（对象原点落在图片内部的像素坐标），
  // 所以 top-left 应该是 (-asset.x, -asset.y)，而不是 (+asset.x, +asset.y)。
  var placements = [];
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < layers.length; i++) {
    var asset = layers[i];
    var image = resolveHabboLayerImage(bitmaps, asset);
    if (!image) continue;
    var regX = Number(asset.x || 0);
    var regY = Number(asset.y || 0);
    var topLeftX = asset.flipH ? (regX - Number(image.width || 0)) : -regX;
    var topLeftY = -regY;
    placements.push({
      asset: asset,
      image: image,
      regX: regX,
      regY: regY,
      topLeftX: topLeftX,
      topLeftY: topLeftY,
    });
    minX = Math.min(minX, topLeftX);
    minY = Math.min(minY, topLeftY);
    maxX = Math.max(maxX, topLeftX + Number(image.width || 0));
    maxY = Math.max(maxY, topLeftY + Number(image.height || 0));
  }
  if (!placements.length || !Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  var width = Math.max(1, Math.round(maxX - minX));
  var height = Math.max(1, Math.round(maxY - minY));
  var canvas = makeCanvas2D(width, height);
  var ctx2d = canvas.getContext('2d');
  for (var j = 0; j < placements.length; j++) {
    var placed = placements[j];
    var layer = placed.asset;
    var bitmap = placed.image;
    if (!bitmap || !bitmap.canvas) continue;
    var dx = Math.round(placed.topLeftX - minX);
    var dy = Math.round(placed.topLeftY - minY);
    ctx2d.save();
    if (layer.flipH) {
      ctx2d.translate(dx + bitmap.width, dy);
      ctx2d.scale(-1, 1);
      ctx2d.drawImage(bitmap.canvas, 0, 0);
    } else {
      ctx2d.drawImage(bitmap.canvas, dx, dy);
    }
    ctx2d.restore();
  }
  detailLog('habbo-compose: type=' + String(meta.type || 'habbo') + ' dir=' + String(direction) +
    ' bbox=(' + [Math.round(minX), Math.round(minY), Math.round(maxX), Math.round(maxY)].join(',') + ')' +
    ' size=' + width + 'x' + height +
    ' layers=' + placements.map(function (p) {
      return p.asset.name + '[' + p.image.width + 'x' + p.image.height + '] reg=(' + p.regX + ',' + p.regY + ') tl=(' + Math.round(p.topLeftX) + ',' + Math.round(p.topLeftY) + ') flip=' + (!!p.asset.flipH);
    }).join(' | '));
  return {
    image: canvas.toDataURL('image/png'),
    fileName: (meta.type || 'habbo') + '_dir' + direction + '.png',
    scale: 1,
    visualSize: Math.max(1, Number(options.preferredSize == null ? chooseHabboPreferredVisualSize(meta) : options.preferredSize) || 64),
    offsetPx: { x: Math.round(minX), y: Math.round(minY) },
    // 这里的 offsetPx 已经是“flatten 后整张图左上角相对 room object floor origin 的偏移”。
    anchorMode: 'scuti-floor-origin',
    sortMode: 'box_occlusion',
    flipX: false,
    width: width,
    height: height,
    debugPlacement: placements.map(function (p) {
      return {
        name: p.asset.name,
        kind: p.asset.kind,
        regX: p.regX,
        regY: p.regY,
        topLeftX: Math.round(p.topLeftX),
        topLeftY: Math.round(p.topLeftY),
        width: p.image.width,
        height: p.image.height,
        flipH: !!p.asset.flipH,
      };
    }),
    layersUsed: layers.map(function (layer) {
      return {
        name: layer.name,
        source: layer.source || '',
        kind: layer.kind,
        layerId: layer.layerId,
        size: layer.size,
        x: layer.x,
        y: layer.y,
        flipH: !!layer.flipH
      };
    })
  };
}


function getHabboFacingPlanForMeta(meta) {
  var preferredSize = chooseHabboPreferredVisualSize(meta);
  var vis = chooseHabboVisualization(meta, preferredSize);
  var directions = (vis && Array.isArray(vis.directions) && vis.directions.length)
    ? vis.directions.slice()
    : ((meta && Array.isArray(meta.visualDirections) && meta.visualDirections.length) ? meta.visualDirections.slice() : [0]);
  var facingApi = null;
  try { facingApi = window.__ITEM_FACING_CORE__ || (window.App && window.App.domain && window.App.domain.itemFacingCore) || null; } catch (_) {}
  if (!facingApi || typeof facingApi.buildHabboFacingPlan !== 'function') {
    throw new Error('Missing Habbo facing plan owner: src/core/domain/item-facing-core.js');
  }
  var plan = facingApi.buildHabboFacingPlan(directions);
  meta.habboFacingPlan = cloneJsonSafe(plan);
  return plan;
}

function buildHabboLayerDirectionsFromBitmaps(meta, bitmaps) {
  var preferredSize = chooseHabboPreferredVisualSize(meta);
  var facingPlan = getHabboFacingPlanForMeta(meta);
  var activeState = getHabboVisualizationState(meta, bitmaps, preferredSize);

  function buildForDirection(direction, logicalDirectionKey) {
    var chosenVis = chooseHabboVisualization(meta, preferredSize);
    if (!chosenVis) {
      pushHabboDebug('buildLayers:none-visualization', { type: meta.type || '', dir: direction, logicalDirectionKey: logicalDirectionKey, preferredSize: preferredSize, visualizationSizes: meta && meta.visualizationInfo && meta.visualizationInfo.sizes ? Object.keys(meta.visualizationInfo.sizes) : [] });
      return null;
    }
    var actualDirection = chosenVis.directions.indexOf(direction) >= 0 ? direction : (chosenVis.directions.indexOf(0) >= 0 ? 0 : (chosenVis.directions[0] || direction));
    var built = [];
    for (var layerId = 0; layerId <= chosenVis.layerCount; layerId++) {
      var letter = getHabboLayerLetter(layerId, chosenVis.layerCount);
      var frameId = getHabboAnimationFrameForLayer(chosenVis, layerId, activeState);
      var asset = chooseHabboAssetForLayer(meta, letter, actualDirection, frameId, chosenVis.size || preferredSize);
      if (!asset && frameId !== 0) asset = chooseHabboAssetForLayer(meta, letter, actualDirection, 0, chosenVis.size || preferredSize);
      if (!asset && actualDirection !== 0) asset = chooseHabboAssetForLayer(meta, letter, 0, frameId, chosenVis.size || preferredSize);
      if (!asset) {
        pushHabboDebug('buildLayers:skip', { type: meta.type || '', dir: direction, logicalDirectionKey: logicalDirectionKey, actualDirection: actualDirection, layerId: layerId, letter: letter, frame: frameId, reason: 'missing-asset' });
        continue;
      }
      var image = resolveHabboLayerImage(bitmaps, asset);
      if (!image) {
        pushHabboDebug('buildLayers:skip', { type: meta.type || '', dir: direction, logicalDirectionKey: logicalDirectionKey, actualDirection: actualDirection, asset: asset.name, layerId: layerId, frame: frameId, reason: 'missing-image', source: asset.source || '' });
        continue;
      }
      var baseProps = layerId === chosenVis.layerCount ? { x: 0, y: 0, z: 0, alpha: 51, ink: '' } : (chosenVis.layers[layerId] || { x: 0, y: 0, z: 0, alpha: null, ink: '' });
      var directionProps = chosenVis.directionLayers && chosenVis.directionLayers[String(actualDirection)] ? chosenVis.directionLayers[String(actualDirection)][layerId] : null;
      var props = Object.assign({}, baseProps, directionProps || {});
      var propX = Number(props.x) || 0;
      var propY = Number(props.y) || 0;
      var regX = Number(asset.x) || 0;
      var regY = Number(asset.y) || 0;
      var alpha = props.alpha == null ? (letter === 'sd' ? 0.2 : 1) : Math.max(0, Math.min(1, Number(props.alpha) / 255));
      var blend = String(props.ink || '').toUpperCase();
      var topLeftX = (asset.flipH ? (regX - Number(image.width || 0)) : (-regX)) + propX;
      var topLeftY = (-regY) + propY;
      var layerObj = {
        image: image.dataUrl,
        imageCanvas: image.canvas || null,
        fileName: asset.name + '.png',
        width: image.width,
        height: image.height,
        visualSize: Math.max(1, Number(asset.size) || chooseHabboPreferredVisualSize(meta) || 64),
        offsetPx: { x: topLeftX, y: topLeftY },
        regX: regX,
        regY: regY,
        propX: propX,
        propY: propY,
        offsetZ: Number(props.z) || 0,
        flipX: !!asset.flipH,
        kind: letter === 'sd' ? 'shadow' : (layerId === 0 ? 'body' : 'part'),
        layerId: asset.layerId,
        layerIndex: layerId,
        name: asset.name,
        source: asset.source || '',
        alpha: alpha,
        blend: blend,
        frameId: frameId,
        direction: actualDirection,
        logicalDirectionKey: String(logicalDirectionKey),
        zOrderHint: (letter === 'sd' ? -10000 : 0) + (Number(props.z) || 0),
      };
      pushHabboDebug('buildLayers:layer', { type: meta.type || '', dir: direction, logicalDirectionKey: logicalDirectionKey, actualDirection: actualDirection, asset: asset.name, layerId: layerId, kind: layerObj.kind, frame: frameId, size: asset.size, reg: { x: regX, y: regY }, props: { x: propX, y: propY, z: Number(props.z) || 0 }, offsetPx: layerObj.offsetPx, offsetZ: layerObj.offsetZ, alpha: alpha, blend: blend, flipX: layerObj.flipX, wh: { w: image.width, h: image.height }, source: asset.source || '' });
      built.push(layerObj);
    }
    built.sort(function (a, b) {
      if ((a.zOrderHint || 0) !== (b.zOrderHint || 0)) return (a.zOrderHint || 0) - (b.zOrderHint || 0);
      if ((a.layerIndex || 0) !== (b.layerIndex || 0)) return (a.layerIndex || 0) - (b.layerIndex || 0);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    pushHabboDebug('buildLayers:dir-done', { type: meta.type || '', dir: direction, logicalDirectionKey: String(logicalDirectionKey), actualDirection: actualDirection, count: built.length, layers: built.map(function(l){ return { name:l.name, kind:l.kind, layerIndex:l.layerIndex, frame:l.frameId, offsetPx:l.offsetPx, offsetZ:l.offsetZ, alpha:l.alpha, blend:l.blend, wh:{w:l.width,h:l.height}, flipX:l.flipX }; }) });
    return built;
  }

  var out = {};
  facingPlan.selectedSourceDirections.forEach(function (sourceDirection, index) {
    var layers = buildForDirection(sourceDirection, index);
    if (layers && layers.length) out[String(index)] = layers;
  });
  var keys = Object.keys(out).sort();
  if (!keys.length) {
    habboTrace('layerDirections:none sourceDirs=' + facingPlan.sourceDirections.join(','));
    return null;
  }
  meta.habboFacingPlan = cloneJsonSafe(facingPlan);
  pushHabboDebug('habbo-facing:import-plan', { type: meta.type || '', preferredSize: preferredSize, sourceDirections: facingPlan.sourceDirections, selectedSourceDirections: facingPlan.selectedSourceDirections, ignoredSourceDirections: facingPlan.ignoredSourceDirections, generatedFacingStrategy: facingPlan.strategy, directionMap: facingPlan.directionMap, builtDirectionKeys: keys });
  habboTrace('layerDirections strategy=' + facingPlan.strategy + ' sourceDirs=' + facingPlan.sourceDirections.join(',') + ' selected=' + facingPlan.selectedSourceDirections.join(',') + ' keys=' + keys.join(','));
  return out;
}

function buildHabboSpriteDirectionsFromBitmaps(meta, bitmaps) {
  var facingPlan = getHabboFacingPlanForMeta(meta);
  var out = {};
  facingPlan.selectedSourceDirections.forEach(function (sourceDirection, index) {
    var sprite = composeHabboDirectionSprite(meta, bitmaps, sourceDirection, { includeShadow: false });
    if (!sprite) return;
    sprite.sourceDirection = sourceDirection;
    sprite.logicalDirectionKey = String(index);
    out[String(index)] = sprite;
  });
  var keys = Object.keys(out).sort();
  if (!keys.length) {
    habboTrace('spriteDirections:none sourceDirs=' + facingPlan.sourceDirections.join(','));
    return null;
  }
  meta.habboFacingPlan = cloneJsonSafe(facingPlan);
  habboTrace('spriteDirections strategy=' + facingPlan.strategy + ' sourceDirs=' + facingPlan.sourceDirections.join(',') + ' selected=' + facingPlan.selectedSourceDirections.join(',') + ' keys=' + keys.join(','));
  return out;
}

function buildHabboFloorAnchor(meta) {
  // 这里给 proxy / boxes 用的仍然是 prefab 原点，不去人为挪 footprint。
  // 视觉层真正的 Scuti 对齐由 sprite.anchorMode = scuti-floor-origin 负责：
  // room object 先落到 origin tile 的 floor origin，再叠加 layer offset。
  return {
    x: 0,
    y: 0,
    z: 0
  };
}

async function parseHabboSwfRuntime(arrayBuffer) {
  habboTrace('runtime-parse:start inputBytes=' + ((arrayBuffer && (arrayBuffer.byteLength || arrayBuffer.length)) || 0));
  pushHabboDebug('runtime-parse:start', { inputBytes: ((arrayBuffer && (arrayBuffer.byteLength || arrayBuffer.length)) || 0) });
  var inflated = await inflateSwfBytes(arrayBuffer);
  var tags = parseSwfTags(inflated);
  var symbolMap = parseSwfSymbolClassMap(tags);
  var xmls = collectHabboXmlTextsFromTags(tags);
  var meta = parseHabboSwfMetadataFromXmls(xmls);
  var bitmaps = await extractHabboBitmapAssetsFromTags(tags, symbolMap, meta.type);
  if (!Object.keys(bitmaps).length) throw new Error('SWF 中未找到可解码的位图层');
  pushHabboDebug('runtime-parse:meta', { type: meta.type || '', dimensions: meta.dimensions || null, logicDirections: meta.logicDirections || [], visualDirections: meta.visualDirections || [], visualizationSizes: meta && meta.visualizationInfo && meta.visualizationInfo.sizes ? Object.keys(meta.visualizationInfo.sizes) : [], assetsCount: (meta.assets || []).length });
  detailLog('habbo-xml: type=' + String(meta.type || '') +
    ' assetsXmlRoot=' + ((xmls && xmls.assetsXml || '').slice(0, 24).replace(/\s+/g, ' ')) +
    ' assets=' + String((meta.assets || []).length) +
    ' firstAssets=' + (meta.assets || []).slice(0, 4).map(function (a) { return a.name + '@(' + a.x + ',' + a.y + ')'; }).join(' | '));
  var builtLayerDirs = buildHabboLayerDirectionsFromBitmaps(meta, bitmaps) || {};
  // 逐 layer 渲染已经足够；大件 furni 再额外 flatten 一次会显著拖慢导入，还会放大日志量。
  // 只有在 layer 构建失败时，才退回到扁平 sprite fallback。
  var builtSpriteDirs = Object.keys(builtLayerDirs).length ? {} : (buildHabboSpriteDirectionsFromBitmaps(meta, bitmaps) || {});
  pushHabboDebug('runtime-parse:done', { type: String(meta.type || ''), bitmaps: Object.keys(bitmaps).length, spriteDirs: Object.keys(builtSpriteDirs), layerDirs: Object.keys(builtLayerDirs), assets: (meta.assets || []).length });
  habboTrace('runtime-parse:done type=' + String(meta.type || '') + ' bitmaps=' + Object.keys(bitmaps).length + ' spriteDirs=' + Object.keys(builtSpriteDirs).join(',') + ' layerDirs=' + Object.keys(builtLayerDirs).join(',') + ' assets=' + (meta.assets || []).length);
  return {
    bytes: inflated,
    tags: tags,
    symbolMap: symbolMap,
    xmls: xmls,
    meta: meta,
    bitmaps: bitmaps,
    spriteDirections: builtSpriteDirs,
    habboLayerDirections: builtLayerDirs
  };
}

  global.HabboCalibrationRuntime = {
    parseHabboSwfRuntime: parseHabboSwfRuntime,
    parseHabboSwfMetadataFromXmls: parseHabboSwfMetadataFromXmls,
    buildHabboLayerDirectionsFromBitmaps: buildHabboLayerDirectionsFromBitmaps,
    chooseHabboPreferredVisualSize: chooseHabboPreferredVisualSize,
    chooseHabboVisualization: chooseHabboVisualization,
    chooseHabboAssetForLayer: chooseHabboAssetForLayer,
    getHabboAnimationFrameForLayer: getHabboAnimationFrameForLayer,
    getHabboVisualizationStates: getHabboVisualizationStates,
    getHabboVisualizationState: getHabboVisualizationState,
    scoreHabboVisualizationState: scoreHabboVisualizationState,
    getHabboLayerLetter: getHabboLayerLetter,
    resolveHabboLayerImage: resolveHabboLayerImage,
    buildHabboFacingPlan: buildHabboFacingPlan,
    cloneJsonSafe: cloneJsonSafe
  };
})(window);
