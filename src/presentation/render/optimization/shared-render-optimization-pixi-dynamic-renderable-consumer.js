// PXM-07.11A: PixiJS dynamic renderable visual consumer.
// Layer: presentation/render/optimization.
//
// This module lets PixiJS adopt additional dynamic renderables from the
// existing framePlan.order path. It supports prefab-sprite and voxel-proxy-box
// renderables; static-world-face-packet, actor/player ownership, picking,
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
    previewAdoptedThisFrame: false,
    previewBoxCountThisFrame: 0,
    debugFaceAdoptedCountThisFrame: 0,
    lastWorldOwnerTraceSignature: '',
    lastStairPlaceTraceSignature: "",
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
      targetKinds: 'prefab-sprite,voxel-proxy-box,primitive-tri-prism,debug-cuboid-face,placement-preview',
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



  function summarizeVoxelProxyTraceBox(renderable) {
    var b = renderable && (renderable.worldBounds || renderable.sortWorldAnchor) || {};
    return {
      x: Number(b.x || 0),
      y: Number(b.y || 0),
      z: Number(b.z || 0),
      w: Number(b.w != null ? b.w : 1),
      d: Number(b.d != null ? b.d : 1),
      h: Number(b.h != null ? b.h : 1),
      role: renderable && renderable.stairRole || b.stairRole || null,
      localIndex: renderable && renderable.localIndex != null ? renderable.localIndex : null
    };
  }

  function emitStairPlaceTrace(phase, payload) {
    payload = payload || {};
    payload.phase = String(phase || 'unknown');
    payload.source = payload.source || 'src/presentation/render/optimization/shared-render-optimization-pixi-dynamic-renderable-consumer.js';
    try {
      var line = '[STAIR-PLACE-TRACE] ' + JSON.stringify(payload);
      if (typeof global.detailLog === 'function') global.detailLog(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }


  function emitWorldOwnerTrace(phase, payload) {
    payload = payload || {};
    payload.phase = String(phase || 'unknown');
    payload.source = payload.source || OWNER;
    try {
      var line = '[PIXI-WORLD-OWNER] ' + JSON.stringify(payload);
      var sig = line;
      if (sig === state.lastWorldOwnerTraceSignature && phase !== 'violation') return;
      state.lastWorldOwnerTraceSignature = sig;
      if (typeof global.detailLog === 'function') global.detailLog(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function parseCssColorForPixi(value, fallback) {
    var text = String(value == null ? (fallback || '#7aa2f7') : value).trim();
    var alpha = 1;
    var rgba = text.match(/^rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
    if (rgba) {
      var r = clampByte(Number(rgba[1] || 0));
      var g = clampByte(Number(rgba[2] || 0));
      var b = clampByte(Number(rgba[3] || 0));
      if (rgba[4] != null) alpha = Math.max(0, Math.min(1, Number(rgba[4]) || 0));
      return { color: (r << 16) | (g << 8) | b, alpha: alpha };
    }
    if (typeof value === 'number' && Number.isFinite(value)) return { color: value >>> 0, alpha: 1 };
    var rgb = parseHexColor(text, fallback || '#7aa2f7');
    return { color: (clampByte(rgb.r) << 16) | (clampByte(rgb.g) << 8) | clampByte(rgb.b), alpha: alpha };
  }

  function normalizePointsToLocalBounds(points) {
    var pts = Array.isArray(points) ? points : [];
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      var x = Number(pts[i] && pts[i].x || 0);
      var y = Number(pts[i] && pts[i].y || 0);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return { x: 0, y: 0, width: 0, height: 0, points: [] };
    return {
      x: minX,
      y: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
      points: pts.map(function (pt) { return { x: Number(pt && pt.x || 0) - minX, y: Number(pt && pt.y || 0) - minY }; })
    };
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


  function clampByte(value) {
    var n = Math.round(Number(value || 0));
    if (!Number.isFinite(n)) n = 0;
    return Math.max(0, Math.min(255, n));
  }

  function parseHexColor(value, fallback) {
    var text = String(value || fallback || '#7aa2f7').trim();
    if (text.charAt(0) === '#') text = text.slice(1);
    if (text.length === 3) text = text.charAt(0) + text.charAt(0) + text.charAt(1) + text.charAt(1) + text.charAt(2) + text.charAt(2);
    var n = parseInt(text.slice(0, 6), 16);
    if (!Number.isFinite(n)) n = parseInt(String(fallback || '#7aa2f7').replace('#', '').slice(0, 6), 16) || 0x7aa2f7;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function shadeColor(rgb, factor) {
    rgb = rgb || { r: 122, g: 162, b: 247 };
    factor = Number(factor);
    if (!Number.isFinite(factor)) factor = 1;
    return (clampByte(rgb.r * factor) << 16) | (clampByte(rgb.g * factor) << 8) | clampByte(rgb.b * factor);
  }

  function isoPoint(x, y, z) {
    var p = isoSafe(x, y, z);
    return { x: Number(p && p.x || 0), y: Number(p && p.y || 0) };
  }

  function makeVoxelProxyFaces(renderable) {
    var b = renderable && renderable.worldBounds || renderable && renderable.sortWorldAnchor || {};
    var x = Number(b.x || 0);
    var y = Number(b.y || 0);
    var z = Number(b.z || 0);
    var w = Math.max(0.001, Number(b.w != null ? b.w : 1) || 1);
    var d = Math.max(0.001, Number(b.d != null ? b.d : 1) || 1);
    var h = Math.max(0.001, Number(b.h != null ? b.h : 1) || 1);
    var base = '#7aa2f7';
    try {
      var instance = getInstanceByIdSafe(renderable && renderable.instanceId);
      var prefab = getPrefabByIdSafe((renderable && renderable.prefabId) || (instance && instance.prefabId));
      base = (renderable && renderable.base) || (prefab && prefab.base) || (instance && instance.base) || base;
    } catch (_) {}
    var rgb = parseHexColor(base, '#7aa2f7');
    var p000 = isoPoint(x, y, z);
    var p100 = isoPoint(x + w, y, z);
    var p110 = isoPoint(x + w, y + d, z);
    var p010 = isoPoint(x, y + d, z);
    var p001 = isoPoint(x, y, z + h);
    var p101 = isoPoint(x + w, y, z + h);
    var p111 = isoPoint(x + w, y + d, z + h);
    var p011 = isoPoint(x, y + d, z + h);
    var faces = [
      { name: 'top', points: [p001, p101, p111, p011], fill: shadeColor(rgb, 1.14), prio: 5 },
      { name: 'east', points: [p101, p111, p110, p100], fill: shadeColor(rgb, 0.86), prio: 3 },
      { name: 'south', points: [p011, p111, p110, p010], fill: shadeColor(rgb, 0.76), prio: 4 }
    ];
    faces.sort(function (a, b) {
      function depth(face) {
        var sum = 0;
        for (var i = 0; i < face.points.length; i++) sum += Number(face.points[i].y || 0);
        return sum / Math.max(1, face.points.length) + Number(face.prio || 0) * 0.0001;
      }
      return depth(a) - depth(b);
    });
    return faces;
  }





  function isVertexSquareTriBlockPrefabId(prefabId) {
    var id = String(prefabId || '');
    return id === 'vertex_square_tri_block' || id === 'vertex_square_quarter_block';
  }

  function coalesceVertexSquarePreviewPrimitives(prefabId, primitives, baseOverride) {
    var list = Array.isArray(primitives) ? primitives : [];
    if (!isVertexSquareTriBlockPrefabId(prefabId) || list.length < 2) return list;
    var points = [];
    var seen = Object.create(null);
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var minZ = Infinity, maxH = 1;
    for (var i = 0; i < list.length; i++) {
      var prim = list[i] || {};
      var verts = Array.isArray(prim.vertices2d) ? prim.vertices2d : [];
      for (var j = 0; j < verts.length; j++) {
        var x = Number(verts[j] && verts[j].x || 0);
        var y = Number(verts[j] && verts[j].y || 0);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        var key = x.toFixed(6) + ',' + y.toFixed(6);
        if (!seen[key]) { seen[key] = true; points.push({ x: x, y: y }); }
      }
      var z = Number(prim.z || 0);
      if (Number.isFinite(z) && z < minZ) minZ = z;
      var h = Number(prim.h != null ? prim.h : 1);
      if (Number.isFinite(h) && h > maxH) maxH = h;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return list;
    var cx = (minX + maxX) * 0.5;
    var cy = (minY + maxY) * 0.5;
    var boundary = points.filter(function (pt) {
      var onBounds = Math.abs(pt.x - minX) < 1e-6 || Math.abs(pt.x - maxX) < 1e-6 || Math.abs(pt.y - minY) < 1e-6 || Math.abs(pt.y - maxY) < 1e-6;
      var isCenter = Math.abs(pt.x - cx) < 1e-6 && Math.abs(pt.y - cy) < 1e-6;
      return onBounds && !isCenter;
    }).sort(function (a, b) { return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx); });
    if (boundary.length < 3) return list;
    return [{
      id: 'vertex-square-preview-unified-visual',
      primitiveId: 'vertex-square-preview-unified-visual',
      primitiveKind: 'vertical_polygon_prism',
      kind: 'vertical_polygon_prism',
      shapeKind: 'vertex_square_unified_visual',
      visualComposite: true,
      vertices2d: boundary,
      z: Number.isFinite(minZ) ? minZ : 0,
      h: Math.max(0.001, maxH || 1),
      base: baseOverride || (list[0] && list[0].base) || '#d59a62',
      sourcePrimitiveCount: list.length
    }];
  }

  function makeTriPrismFacesFromPrimitive(primitive, baseOverride) {
    var p = primitive && primitive.primitive ? primitive.primitive : primitive;
    p = p || {};
    var verts = Array.isArray(p.vertices2d) ? p.vertices2d : [];
    if (verts.length < 3) return [];
    var z = Number(p.z || 0);
    var h = Math.max(0.001, Number(p.h != null ? p.h : 1) || 1);
    var base = baseOverride || p.base || '#d59a62';
    var rgb = parseHexColor(base, '#d59a62');
    var bottom = verts.map(function (pt) { return { x: Number(pt && pt.x || 0), y: Number(pt && pt.y || 0), z: z }; });
    var top = verts.map(function (pt) { return { x: Number(pt && pt.x || 0), y: Number(pt && pt.y || 0), z: z + h }; });
    var faces = [];
    faces.push({ name: 'top-triangle', points: top.map(function (pt) { return isoPoint(pt.x, pt.y, pt.z); }), fill: shadeColor(rgb, 1.14), prio: 5 });
    for (var i = 0; i < bottom.length; i++) {
      var j = (i + 1) % bottom.length;
      var b0 = bottom[i];
      var b1 = bottom[j];
      var t1 = top[j];
      var t0 = top[i];
      var avgY = (b0.y + b1.y) * 0.5;
      var avgX = (b0.x + b1.x) * 0.5;
      var shade = avgY >= avgX ? 0.78 : 0.88;
      faces.push({
        name: 'side-' + String(i),
        points: [isoPoint(t0.x, t0.y, t0.z), isoPoint(t1.x, t1.y, t1.z), isoPoint(b1.x, b1.y, b1.z), isoPoint(b0.x, b0.y, b0.z)],
        fill: shadeColor(rgb, shade),
        prio: 2 + i * 0.01
      });
    }
    faces.sort(function (a, b) {
      function depth(face) {
        var sum = 0;
        for (var k = 0; k < face.points.length; k++) sum += Number(face.points[k].y || 0);
        return sum / Math.max(1, face.points.length) + Number(face.prio || 0) * 0.0001;
      }
      return depth(a) - depth(b);
    });
    return faces;
  }

  function normalizeFacesToLocalBounds(faces) {
    var list = Array.isArray(faces) ? faces : [];
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    for (var i = 0; i < list.length; i++) {
      var pts = Array.isArray(list[i] && list[i].points) ? list[i].points : [];
      for (var j = 0; j < pts.length; j++) {
        var x = Number(pts[j] && pts[j].x || 0);
        var y = Number(pts[j] && pts[j].y || 0);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      return { x: 0, y: 0, width: 0, height: 0, faces: list };
    }
    var localFaces = list.map(function (face) {
      var clone = Object.assign({}, face || {});
      clone.points = (Array.isArray(face && face.points) ? face.points : []).map(function (pt) {
        return { x: Number(pt && pt.x || 0) - minX, y: Number(pt && pt.y || 0) - minY };
      });
      return clone;
    });
    return {
      x: minX,
      y: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
      faces: localFaces
    };
  }

  function drawGraphicsPolygon(graphics, points, fillColor, alpha) {
    points = Array.isArray(points) ? points : [];
    if (points.length < 3) return;
    alpha = Number(alpha);
    if (!Number.isFinite(alpha)) alpha = 0.92;
    var flat = [];
    for (var i = 0; i < points.length; i++) {
      flat.push(Number(points[i].x || 0));
      flat.push(Number(points[i].y || 0));
    }
    try {
      if (typeof graphics.poly === 'function' && typeof graphics.fill === 'function') {
        graphics.poly(flat).fill({ color: fillColor, alpha: alpha });
        if (typeof graphics.stroke === 'function') graphics.stroke({ color: 0x000000, alpha: 0.16, width: 1 });
        return;
      }
    } catch (_) {}
    try {
      if (typeof graphics.beginFill === 'function') graphics.beginFill(fillColor, alpha);
      if (typeof graphics.lineStyle === 'function') graphics.lineStyle(1, 0x000000, 0.16);
      if (typeof graphics.moveTo === 'function') graphics.moveTo(Number(points[0].x || 0), Number(points[0].y || 0));
      for (var j = 1; j < points.length; j++) if (typeof graphics.lineTo === 'function') graphics.lineTo(Number(points[j].x || 0), Number(points[j].y || 0));
      if (typeof graphics.closePath === 'function') graphics.closePath();
      else if (typeof graphics.lineTo === 'function') graphics.lineTo(Number(points[0].x || 0), Number(points[0].y || 0));
      if (typeof graphics.endFill === 'function') graphics.endFill();
    } catch (_) {}
  }

  function getRenderableOrderIndex(renderable) {
    var z = Number(renderable && renderable.__drawIndex != null ? renderable.__drawIndex : (renderable && renderable.zIndex != null ? renderable.zIndex : 0));
    return Number.isFinite(z) ? z : 0;
  }


  function getOrCreateGraphicsForKey(key, label) {
    var Graphics = getPixiConstructor('Graphics');
    if (!state.container || typeof Graphics !== 'function') return null;
    var graphics = state.sprites[key];
    if (!graphics) {
      try {
        graphics = new Graphics();
        graphics.label = label || ('pixi-migration-dynamic-' + key);
        try { graphics.eventMode = 'none'; } catch (_) {}
        state.sprites[key] = graphics;
        state.spriteCreatedCount += 1;
        if (typeof state.container.addChild === 'function') state.container.addChild(graphics);
      } catch (_) { return null; }
    } else {
      state.spriteReusedCount += 1;
      if (graphics.parent !== state.container && typeof state.container.addChild === 'function') state.container.addChild(graphics);
    }
    return graphics;
  }

  function markContainerNeedsSort() {
    try {
      if (state.container) {
        state.container.sortableChildren = true;
        if (typeof state.container.sortChildren === 'function') state.container.sortChildren();
      }
    } catch (_) {}
  }


  function emitTriPrismTrace(phase, payload) {
    payload = payload || {};
    payload.phase = String(phase || 'unknown');
    payload.source = payload.source || OWNER;
    try {
      var line = '[TRI-PRISM-TRACE] ' + JSON.stringify(payload);
      if (typeof global.detailLog === 'function') global.detailLog(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function summarizeTriPrimitive(primitive) {
    var p = primitive || {};
    return {
      primitiveId: p.primitiveId || p.id || null,
      primitiveKind: p.primitiveKind || p.kind || null,
      z: Number(p.z || 0),
      h: Number(p.h != null ? p.h : 1),
      sortCell: p.sortCell || null,
      vertexCount: Array.isArray(p.vertices2d) ? p.vertices2d.length : 0,
      vertices2d: (Array.isArray(p.vertices2d) ? p.vertices2d : []).map(function (pt) { return { x: Number(pt && pt.x || 0), y: Number(pt && pt.y || 0) }; })
    };
  }

  function adoptTriPrismRenderable(renderable, meta) {
    if (!state.container) return false;
    var primitive = renderable && renderable.primitive || null;
    if (!primitive || !Array.isArray(primitive.vertices2d) || primitive.vertices2d.length < 3) return false;
    var key = makeRenderableKey(renderable);
    var graphics = getOrCreateGraphicsForKey(key, 'pixi-migration-tri-prism-' + key);
    if (!graphics) return false;
    try {
      if (typeof graphics.clear === 'function') graphics.clear();
      graphics.visible = true;
      graphics.alpha = 1;
      graphics.zIndex = getRenderableOrderIndex(renderable);
      graphics.eventMode = 'none';
      var faces = makeTriPrismFacesFromPrimitive(primitive, renderable && renderable.base);
      var local = normalizeFacesToLocalBounds(faces);
      graphics.x = Number(local.x || 0);
      graphics.y = Number(local.y || 0);
      for (var i = 0; i < local.faces.length; i++) drawGraphicsPolygon(graphics, local.faces[i].points, local.faces[i].fill, 0.94);
      markContainerNeedsSort();
      emitTriPrismTrace('pixi-adopt-tri-prism', {
        renderableId: renderable && renderable.id || '',
        instanceId: renderable && renderable.instanceId || '',
        prefabId: renderable && renderable.prefabId || '',
        kind: 'primitive-tri-prism',
        zIndex: Number(graphics.zIndex || 0),
        primitive: summarizeTriPrimitive(primitive),
        localBounds: { x: Number(local.x || 0), y: Number(local.y || 0), width: Number(local.width || 0), height: Number(local.height || 0) },
        container: { sortableChildren: !!(state.container && state.container.sortableChildren), childCount: state.container && state.container.children ? state.container.children.length : null }
      });
    } catch (_) { return false; }
    state.seenKeys[key] = true;
    state.adoptedKeys[key] = {
      frameId: state.frameId,
      renderableId: renderable && renderable.id || '',
      instanceId: renderable && renderable.instanceId || '',
      prefabId: renderable && renderable.prefabId || '',
      kind: 'primitive-tri-prism',
      zIndex: getRenderableOrderIndex(renderable),
      textureSourceType: 'pixi-graphics',
      prefabKind: 'tri-prism',
      anchorMode: 'cell-sortkey-local-polygon-bounds'
    };
    state.adoptedCountThisFrame += 1;
    state.skippedByCanvas2dThisFrame += 1;
    notify({
      section: 'dynamic-renderable-adopted',
      activeBackend: 'pixi',
      renderableId: renderable && renderable.id || '',
      kind: 'primitive-tri-prism',
      instanceId: renderable && renderable.instanceId || '',
      prefabId: renderable && renderable.prefabId || '',
      pixiDrawsDynamicRenderable: true,
      canvas2dSkipsDynamicRenderable: true,
      textureSourceType: 'pixi-graphics',
      zIndex: getRenderableOrderIndex(renderable),
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: true,
      pixiZIndexUsed: true,
      source: 'pixi-dynamic-adopt-tri-prism'
    }, 'dynamic-renderable-adopted');
    return true;
  }

  function adoptVoxelProxyBoxRenderable(renderable, meta) {
    if (!state.container) return false;
    var key = makeRenderableKey(renderable);
    var graphics = getOrCreateGraphicsForKey(key, 'pixi-migration-dynamic-voxel-proxy-' + key);
    if (!graphics) return false;
    try {
      if (typeof graphics.clear === 'function') graphics.clear();
      graphics.visible = true;
      graphics.alpha = 1;
      graphics.zIndex = getRenderableOrderIndex(renderable);
      graphics.eventMode = 'none';
      var faces = makeVoxelProxyFaces(renderable);
      var local = normalizeFacesToLocalBounds(faces);
      graphics.x = Number(local.x || 0);
      graphics.y = Number(local.y || 0);
      for (var i = 0; i < local.faces.length; i++) drawGraphicsPolygon(graphics, local.faces[i].points, local.faces[i].fill, 0.92);
      try {
        if (/^stair_mc_(2|4|8)step$/.test(String((renderable && renderable.prefabId) || ''))) {
          var tracePayload = {
            frameId: state.frameId,
            renderableId: renderable && renderable.id || '',
            instanceId: renderable && renderable.instanceId || '',
            prefabId: renderable && renderable.prefabId || '',
            kind: 'voxel-proxy-box',
            key: key,
            zIndex: getRenderableOrderIndex(renderable),
            worldBounds: summarizeVoxelProxyTraceBox(renderable),
            localBounds: { x: Number(local.x || 0), y: Number(local.y || 0), width: Number(local.width || 0), height: Number(local.height || 0) },
            graphics: { x: Number(graphics.x || 0), y: Number(graphics.y || 0), zIndex: Number(graphics.zIndex || 0) },
            container: { sortableChildren: !!(state.container && state.container.sortableChildren), childCount: state.container && state.container.children ? state.container.children.length : null }
          };
          var traceSig = JSON.stringify(tracePayload);
          if (traceSig !== state.lastStairPlaceTraceSignature) {
            state.lastStairPlaceTraceSignature = traceSig;
            emitStairPlaceTrace('pixi-adopt-voxel-proxy-box', tracePayload);
          }
        }
      } catch (_) {}
      if (state.container) {
        state.container.sortableChildren = true;
        if (typeof state.container.sortChildren === 'function') state.container.sortChildren();
      }
    } catch (_) { return false; }
    state.seenKeys[key] = true;
    state.adoptedKeys[key] = {
      frameId: state.frameId,
      renderableId: renderable && renderable.id || '',
      instanceId: renderable && renderable.instanceId || '',
      prefabId: renderable && renderable.prefabId || '',
      kind: 'voxel-proxy-box',
      zIndex: getRenderableOrderIndex(renderable),
      textureSourceType: 'pixi-graphics',
      prefabKind: 'voxel-proxy',
      anchorMode: 'frameplan-zindex-local-bounds'
    };
    state.adoptedCountThisFrame += 1;
    state.skippedByCanvas2dThisFrame += 1;
    notify({
      section: 'dynamic-renderable-adopted',
      activeBackend: 'pixi',
      renderableId: renderable && renderable.id || '',
      kind: 'voxel-proxy-box',
      instanceId: renderable && renderable.instanceId || '',
      prefabId: renderable && renderable.prefabId || '',
      pixiDrawsDynamicRenderable: true,
      canvas2dSkipsDynamicRenderable: true,
      textureSourceType: 'pixi-graphics',
      zIndex: getRenderableOrderIndex(renderable),
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: true,
      pixiZIndexUsed: true,
      placementMode: 'local-bounds-positioned-graphics',
      source: 'pixi-dynamic-adopt-voxel-proxy-box'
    }, 'dynamic-renderable-adopted');
    return true;
  }


  function adoptDebugCuboidFaceRenderable(renderable, meta) {
    if (!state.container) return false;
    var pts = Array.isArray(renderable && renderable.points) ? renderable.points : [];
    if (pts.length < 3) return false;
    var key = makeRenderableKey(renderable);
    var graphics = getOrCreateGraphicsForKey(key, 'pixi-migration-debug-cuboid-face-' + key);
    if (!graphics) return false;
    try {
      if (typeof graphics.clear === 'function') graphics.clear();
      graphics.visible = true;
      graphics.alpha = 1;
      graphics.zIndex = getRenderableOrderIndex(renderable);
      graphics.eventMode = 'none';
      var local = normalizePointsToLocalBounds(pts);
      graphics.x = Number(local.x || 0);
      graphics.y = Number(local.y || 0);
      var fill = parseCssColorForPixi(renderable && (renderable.fill || renderable.textureColor || renderable.color), '#7aa2f7');
      drawGraphicsPolygon(graphics, local.points, fill.color, Math.min(1, Math.max(0.08, fill.alpha * 0.84)));
      markContainerNeedsSort();
    } catch (_) { return false; }
    state.seenKeys[key] = true;
    state.adoptedKeys[key] = {
      frameId: state.frameId,
      renderableId: renderable && renderable.id || '',
      instanceId: renderable && renderable.instanceId || '',
      prefabId: renderable && renderable.prefabId || '',
      kind: 'debug-cuboid-face',
      zIndex: getRenderableOrderIndex(renderable),
      textureSourceType: 'pixi-graphics',
      anchorMode: 'screen-points-local-bounds'
    };
    state.adoptedCountThisFrame += 1;
    state.skippedByCanvas2dThisFrame += 1;
    state.debugFaceAdoptedCountThisFrame += 1;
    notify({
      section: 'dynamic-renderable-adopted',
      activeBackend: 'pixi',
      renderableId: renderable && renderable.id || '',
      kind: 'debug-cuboid-face',
      instanceId: renderable && renderable.instanceId || '',
      prefabId: renderable && renderable.prefabId || '',
      pixiDrawsDynamicRenderable: true,
      canvas2dSkipsDynamicRenderable: true,
      textureSourceType: 'pixi-graphics',
      zIndex: getRenderableOrderIndex(renderable),
      pixiSortChildren: true,
      pixiZIndexUsed: true,
      source: 'pixi-dynamic-adopt-debug-cuboid-face'
    }, 'dynamic-renderable-adopted');
    return true;
  }

  function unionScreenBounds(a, b) {
    if (!b) return a || null;
    if (!a) return {
      x: Number(b.x || 0),
      y: Number(b.y || 0),
      maxX: Number(b.x || 0) + Number(b.width || 0),
      maxY: Number(b.y || 0) + Number(b.height || 0)
    };
    var minX = Math.min(Number(a.x || 0), Number(b.x || 0));
    var minY = Math.min(Number(a.y || 0), Number(b.y || 0));
    var maxX = Math.max(Number(a.maxX || 0), Number(b.x || 0) + Number(b.width || 0));
    var maxY = Math.max(Number(a.maxY || 0), Number(b.y || 0) + Number(b.height || 0));
    return { x: minX, y: minY, maxX: maxX, maxY: maxY };
  }

  function roundDynamicDiag(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) return null;
    var m = Math.pow(10, digits == null ? 2 : digits);
    return Math.round(n * m) / m;
  }

  function finalizeScreenBounds(bounds) {
    if (!bounds) return null;
    return {
      x: roundDynamicDiag(bounds.x, 2),
      y: roundDynamicDiag(bounds.y, 2),
      width: roundDynamicDiag(Number(bounds.maxX || 0) - Number(bounds.x || 0), 2),
      height: roundDynamicDiag(Number(bounds.maxY || 0) - Number(bounds.y || 0), 2),
      maxX: roundDynamicDiag(bounds.maxX, 2),
      maxY: roundDynamicDiag(bounds.maxY, 2)
    };
  }

  function emitPreviewAlignmentPixiSnapshot(payload) {
    payload = payload || {};
    payload.phase = 'pixi-preview-adopted';
    payload.source = payload.source || OWNER;
    payload.timestamp = Date.now();
    try { if (global) global.__PIXI_PREVIEW_ALIGNMENT_LAST_PIXI__ = payload; } catch (_) {}
    try {
      var line = '[PIXI-PREVIEW-ALIGNMENT] ' + JSON.stringify(payload);
      if (typeof global.detailLog === 'function') global.detailLog(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function drawPlacementPreview(options) {
    maybeStart('placement-preview');
    options = options || {};
    if (!state.container) return { ok: false, reason: 'pixi-world-container-missing' };
    var previewBoxes = Array.isArray(options.previewBoxes) ? options.previewBoxes : [];
    var previewPrimitivesRaw = Array.isArray(options.previewPrimitives) ? options.previewPrimitives : [];
    var prefabId = String(options.prefabId || 'unknown');
    var previewPrimitives = coalesceVertexSquarePreviewPrimitives(prefabId, previewPrimitivesRaw, options.valid !== false ? '#36c96c' : '#f04949');
    var valid = options.valid !== false;
    var alpha = Number(options.alpha != null ? options.alpha : (valid ? 0.42 : 0.22));
    if (!Number.isFinite(alpha)) alpha = valid ? 0.42 : 0.22;
    var seen = Object.create(null);
    var adopted = 0;
    var graphicsBoundsUnion = null;
    var graphicsSamples = [];
    for (var pi = 0; pi < previewPrimitives.length; pi++) {
      var primitive = previewPrimitives[pi] || {};
      if (!Array.isArray(primitive.vertices2d) || primitive.vertices2d.length < 3) continue;
      var pKey = 'placement-preview-primitive|' + prefabId + '|' + String(pi);
      seen[pKey] = true;
      var pGraphics = getOrCreateGraphicsForKey(pKey, 'pixi-migration-placement-preview-' + pKey);
      if (!pGraphics) continue;
      try {
        if (typeof pGraphics.clear === 'function') pGraphics.clear();
        pGraphics.visible = true;
        pGraphics.alpha = 1;
        pGraphics.zIndex = Number(options.zIndex != null ? options.zIndex : 900000) + pi;
        pGraphics.eventMode = 'none';
        var pFaces = makeTriPrismFacesFromPrimitive(primitive, valid ? '#36c96c' : '#f04949');
        var pLocal = normalizeFacesToLocalBounds(pFaces);
        pGraphics.x = Number(pLocal.x || 0);
        pGraphics.y = Number(pLocal.y || 0);
        for (var pf = 0; pf < pLocal.faces.length; pf++) drawGraphicsPolygon(pGraphics, pLocal.faces[pf].points, pLocal.faces[pf].fill, alpha);
        var pBounds = { x: Number(pGraphics.x || 0), y: Number(pGraphics.y || 0), width: Number(pLocal.width || 0), height: Number(pLocal.height || 0) };
        graphicsBoundsUnion = unionScreenBounds(graphicsBoundsUnion, pBounds);
        if (graphicsSamples.length < 4) graphicsSamples.push({
          key: pKey,
          x: roundDynamicDiag(pBounds.x, 2),
          y: roundDynamicDiag(pBounds.y, 2),
          width: roundDynamicDiag(pBounds.width, 2),
          height: roundDynamicDiag(pBounds.height, 2),
          zIndex: Number(pGraphics.zIndex || 0),
          primitive: summarizeTriPrimitive(primitive)
        });
        state.seenKeys[pKey] = true;
        adopted += 1;
      } catch (_) {}
    }
    for (var i = 0; i < previewBoxes.length && previewPrimitives.length === 0; i++) {
      var box = previewBoxes[i] || {};
      var fakeRenderable = {
        id: 'placement-preview-' + prefabId + '-' + String(i),
        kind: 'placement-preview-box',
        instanceId: 'placement-preview',
        prefabId: prefabId,
        worldBounds: {
          x: Number(box.x || 0),
          y: Number(box.y || 0),
          z: Number(box.z || 0),
          w: Math.max(0.001, Number(box.w != null ? box.w : 1) || 1),
          d: Math.max(0.001, Number(box.d != null ? box.d : 1) || 1),
          h: Math.max(0.001, Number(box.h != null ? box.h : 1) || 1)
        },
        base: valid ? '#36c96c' : '#f04949',
        __drawIndex: Number(options.zIndex != null ? options.zIndex : 900000) + i
      };
      var key = 'placement-preview|' + prefabId + '|' + String(i);
      seen[key] = true;
      var graphics = getOrCreateGraphicsForKey(key, 'pixi-migration-placement-preview-' + key);
      if (!graphics) continue;
      try {
        if (typeof graphics.clear === 'function') graphics.clear();
        graphics.visible = true;
        graphics.alpha = 1;
        graphics.zIndex = Number(fakeRenderable.__drawIndex || 900000 + i);
        graphics.eventMode = 'none';
        var faces = makeVoxelProxyFaces(fakeRenderable);
        var local = normalizeFacesToLocalBounds(faces);
        graphics.x = Number(local.x || 0);
        graphics.y = Number(local.y || 0);
        for (var f = 0; f < local.faces.length; f++) drawGraphicsPolygon(graphics, local.faces[f].points, local.faces[f].fill, alpha);
        var gBounds = { x: Number(graphics.x || 0), y: Number(graphics.y || 0), width: Number(local.width || 0), height: Number(local.height || 0) };
        graphicsBoundsUnion = unionScreenBounds(graphicsBoundsUnion, gBounds);
        if (graphicsSamples.length < 4) graphicsSamples.push({
          key: key,
          x: roundDynamicDiag(gBounds.x, 2),
          y: roundDynamicDiag(gBounds.y, 2),
          width: roundDynamicDiag(gBounds.width, 2),
          height: roundDynamicDiag(gBounds.height, 2),
          zIndex: Number(graphics.zIndex || 0),
          worldBounds: fakeRenderable.worldBounds
        });
        state.seenKeys[key] = true;
        adopted += 1;
      } catch (_) {}
    }
    // Hide stale preview graphics if preview now has fewer boxes or was cleared.
    try {
      var keys = Object.keys(state.sprites || {});
      for (var k = 0; k < keys.length; k++) {
        var existingKey = keys[k];
        if (existingKey.indexOf('placement-preview|') !== 0 && existingKey.indexOf('placement-preview-primitive|') !== 0) continue;
        if (seen[existingKey]) continue;
        var stale = state.sprites[existingKey];
        if (stale) stale.visible = false;
      }
    } catch (_) {}
    if (adopted > 0) {
      state.previewAdoptedThisFrame = true;
      state.previewBoxCountThisFrame = adopted;
      markContainerNeedsSort();
    }
    var summary = {
      ok: adopted > 0,
      activeBackend: 'pixi',
      phase: 'placement-preview',
      pixiDrawsPlacementPreview: adopted > 0,
      canvas2dSkipsPlacementPreviewWorld: adopted > 0,
      previewBoxCount: adopted,
      previewPrimitiveCount: previewPrimitives.length,
      previewPrimitiveSourceCount: previewPrimitivesRaw.length,
      previewRenderMode: isVertexSquareTriBlockPrefabId(prefabId) && previewPrimitivesRaw.length !== previewPrimitives.length ? 'unified-vertex-square' : 'default',
      prefabId: prefabId,
      valid: valid,
      origin: options.origin || null,
      rotation: options.rotation != null ? Number(options.rotation) : null,
      container: { sortableChildren: !!(state.container && state.container.sortableChildren), childCount: state.container && state.container.children ? state.container.children.length : null },
      graphicsBoundsUnion: finalizeScreenBounds(graphicsBoundsUnion),
      graphicsSamples: graphicsSamples,
      source: options.source || 'pixi-dynamic-placement-preview'
    };
    emitWorldOwnerTrace('placement-preview', summary);
    if (adopted > 0) emitPreviewAlignmentPixiSnapshot({
      prefabId: prefabId,
      valid: valid,
      origin: options.origin || null,
      rotation: options.rotation != null ? Number(options.rotation) : null,
      previewBoxCount: adopted,
      graphicsBoundsUnion: summary.graphicsBoundsUnion,
      graphicsSamples: graphicsSamples,
      container: summary.container
    });
    if (/^stair_mc_(2|4|8)step$/.test(String(prefabId || ''))) {
      emitStairPlaceTrace('preview-pixi-adopted', Object.assign({}, summary, {
        boxes: previewBoxes.map(function (b, bi) { return { i: bi, x: Number(b && b.x || 0), y: Number(b && b.y || 0), z: Number(b && b.z || 0), w: Number(b && b.w != null ? b.w : 1), d: Number(b && b.d != null ? b.d : 1), h: Number(b && b.h != null ? b.h : 1) }; })
      }));
    }
    return summary;
  }

  function clearPlacementPreview(reason) {
    var hidden = 0;
    var activePreviewBefore = 0;
    var activePreviewAfter = 0;
    try {
      var keys = Object.keys(state.sprites || {});
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        if (key.indexOf('placement-preview|') !== 0 && key.indexOf('placement-preview-primitive|') !== 0) continue;
        var sprite = state.sprites[key];
        if (sprite && sprite.visible !== false) activePreviewBefore += 1;
        if (sprite && sprite.visible !== false) {
          sprite.visible = false;
          hidden += 1;
        }
      }
      for (var k2 = 0; k2 < keys.length; k2++) {
        var key2 = keys[k2];
        if (key2.indexOf('placement-preview|') !== 0 && key2.indexOf('placement-preview-primitive|') !== 0) continue;
        var sprite2 = state.sprites[key2];
        if (sprite2 && sprite2.visible !== false) activePreviewAfter += 1;
      }
    } catch (_) {}
    var summary = {
      ok: true,
      activeBackend: 'pixi',
      phase: 'preview-cleared',
      valid: false,
      pixiDrawsPlacementPreview: false,
      canvas2dSkipsPlacementPreviewWorld: true,
      previewBoxCount: 0,
      hiddenPreviewGraphics: hidden,
      activePreviewCountBeforeClear: activePreviewBefore,
      activePreviewCountAfterClear: activePreviewAfter,
      reason: reason || 'clear',
      source: 'pixi-dynamic-placement-preview-clear'
    };
    emitWorldOwnerTrace('placement-preview-clear', summary);
    emitPreviewAlignmentPixiSnapshot(summary);
    try { if (global) global.__PIXI_PREVIEW_ALIGNMENT_LAST_PIXI__ = summary; } catch (_) {}
    return summary;
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
    state.previewAdoptedThisFrame = false;
    state.previewBoxCountThisFrame = 0;
    state.debugFaceAdoptedCountThisFrame = 0;
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
      targetKinds: 'prefab-sprite,voxel-proxy-box,primitive-tri-prism,debug-cuboid-face,placement-preview',
      experimentalDynamicAdoption: true,
      canvas2dFallback: 'screen-ui-only-for-adopted-world-renderables',
      source: options.source || 'pixi-dynamic-begin-frame'
    }, 'begin-frame');
    return true;
  }

  function adoptRenderable(renderable, meta) {
    maybeStart('adopt-renderable');
    if (!state.container) return false;
    var kind = String(renderable && renderable.kind || 'unknown');
    if (kind === 'primitive-tri-prism') return adoptTriPrismRenderable(renderable, meta || {});
    if (kind === 'voxel-proxy-box') return adoptVoxelProxyBoxRenderable(renderable, meta || {});
    if (kind === 'debug-cuboid-face') return adoptDebugCuboidFaceRenderable(renderable, meta || {});

    var Sprite = getPixiConstructor('Sprite');
    var Texture = getPixiConstructor('Texture');
    if (typeof Sprite !== 'function' || !Texture) return false;
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
      sprite.zIndex = getRenderableOrderIndex(renderable);
      sprite.eventMode = 'none';
      if (state.container) {
        state.container.sortableChildren = true;
        if (typeof state.container.sortChildren === 'function') state.container.sortChildren();
      }
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
      zIndex: getRenderableOrderIndex(renderable),
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
      zIndex: getRenderableOrderIndex(renderable),
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: true,
      pixiZIndexUsed: true,
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
      pixiDrawsPlacementPreview: state.previewAdoptedThisFrame === true,
      canvas2dSkipsPlacementPreviewWorld: state.previewAdoptedThisFrame === true,
      previewBoxCount: Number(state.previewBoxCountThisFrame || 0),
      debugFaceAdoptedCount: Number(state.debugFaceAdoptedCountThisFrame || 0),
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
      targetKinds: 'prefab-sprite,voxel-proxy-box,primitive-tri-prism,debug-cuboid-face,placement-preview',
      experimentalDynamicAdoption: true,
      canvas2dFallback: 'screen-ui-only-for-adopted-world-renderables',
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: state.visualAdoptionEnabled && state.adoptedCountThisFrame > 0,
      pixiZIndexUsed: state.visualAdoptionEnabled && state.adoptedCountThisFrame > 0,
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
      targetKinds: 'prefab-sprite,voxel-proxy-box,primitive-tri-prism,debug-cuboid-face,placement-preview',
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
    drawPlacementPreview: drawPlacementPreview,
    clearPlacementPreview: clearPlacementPreview,
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
