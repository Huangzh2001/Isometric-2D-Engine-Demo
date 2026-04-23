var PREFAB_REGISTRY_OWNER = 'src/core/state/prefab-registry.js';
var __prefabLookupHits = new Set();
var __prefabLookupMisses = new Set();
var __prefabVariantBuilds = new Set();
var __prefabRegisterLogs = new Set();

function prefabRegistryLog(message, extra) {
  if (typeof refactorLogCurrent === 'function') {
    refactorLogCurrent('PrefabRegistry', message, extra);
    return;
  }
  if (typeof pushLog === 'function') {
    if (extra !== undefined) pushLog('[Refactor][Step-07][PrefabRegistry] ' + message + ' ' + JSON.stringify(extra));
    else pushLog('[Refactor][Step-07][PrefabRegistry] ' + message);
  }
}

function tracePrefabLookup(id, hit, extra) {
  var key = String(id || '');
  var bucket = hit ? __prefabLookupHits : __prefabLookupMisses;
  if (bucket.has(key)) return;
  bucket.add(key);
  prefabRegistryLog('lookup ' + (hit ? 'hit' : 'miss'), Object.assign({ prefabId: key }, extra || {}));
}

function tracePrefabVariant(prefabId, rotation, extra) {
  var key = String(prefabId || '') + '@' + String(rotation || 0);
  if (__prefabVariantBuilds.has(key)) return;
  __prefabVariantBuilds.add(key);
  prefabRegistryLog('variant build', Object.assign({ prefabId: prefabId || '', rotation: rotation || 0 }, extra || {}));
}

function tracePrefabRegister(prefabId, source, extra) {
  var key = String(prefabId || '');
  if (!__prefabRegisterLogs.has(key)) __prefabRegisterLogs.add(key);
  prefabRegistryLog('register prefab', Object.assign({ prefabId: key, source: source || 'unknown' }, extra || {}));
}

function cloneVoxel(v) {
  return {
    x: Number(v && v.x) || 0,
    y: Number(v && v.y) || 0,
    z: Number(v && v.z) || 0,
    solid: v && v.solid !== false,
    collidable: v && v.collidable !== false,
    base: (v && v.base) || null,
  };
}

function makeRectVoxels(w, d, h, base) {
  var voxels = [];
  for (var z = 0; z < h; z++) {
    for (var y = 0; y < d; y++) {
      for (var x = 0; x < w; x++) {
        voxels.push({ x: x, y: y, z: z, solid: true, collidable: true, base: base || '#c7b0df' });
      }
    }
  }
  return voxels;
}

function normalizeSpriteInfo(sprite) {
  if (!sprite || typeof sprite !== 'object') return null;
  return {
    image: sprite.image || '',
    fileName: sprite.fileName || sprite.image || '',
    scale: Number(sprite.scale) || 1,
    offsetPx: { x: Number(sprite.offsetPx && sprite.offsetPx.x) || 0, y: Number(sprite.offsetPx && sprite.offsetPx.y) || 0 },
    anchorMode: sprite.anchorMode || 'bottom-center',
    sortMode: sprite.sortMode || 'box_occlusion',
    flipX: !!sprite.flipX,
    width: Number(sprite.width) || 0,
    height: Number(sprite.height) || 0,
    visualSize: Number(sprite.visualSize) || 0,
  };
}

function normalizeSpriteDirections(map) {
  if (!map || typeof map !== 'object') return null;
  var out = {};
  Object.keys(map).forEach(function (key) {
    var raw = map[key];
    var cfg = normalizeSpriteInfo(raw);
    if (cfg) out[String(key)] = cfg;
  });
  return Object.keys(out).length ? out : null;
}

function normalizeHabboLayerDirections(map) {
  if (!map || typeof map !== 'object') return null;
  var out = {};
  Object.keys(map).forEach(function (key) {
    var layers = Array.isArray(map[key]) ? map[key] : [];
    var norm = layers.map(function (raw, idx) {
      if (!raw || typeof raw !== 'object') return null;
      return {
        image: raw.image || '',
        fileName: raw.fileName || raw.image || '',
        width: Number(raw.width) || 1,
        height: Number(raw.height) || 1,
        visualSize: Number(raw.visualSize) || 64,
        offsetPx: { x: Number(raw.offsetPx && raw.offsetPx.x) || 0, y: Number(raw.offsetPx && raw.offsetPx.y) || 0 },
        offsetZ: Number(raw.offsetZ) || 0,
        flipX: !!raw.flipX,
        kind: raw.kind || 'body',
        layerId: raw.layerId || '',
        layerIndex: Number(raw.layerIndex != null ? raw.layerIndex : idx) || 0,
        name: raw.name || '',
        zOrderHint: Number(raw.zOrderHint) || 0,
        alpha: raw.alpha == null ? 1 : Math.max(0, Math.min(1, Number(raw.alpha))),
        blend: raw.blend || '',
        source: raw.source || '',
        frameId: Number(raw.frameId) || 0,
        direction: Number(raw.direction) || 0,
        debug: raw.debug ? cloneJsonSafe(raw.debug) : null,
      };
    }).filter(Boolean);
    if (norm.length) out[String(key)] = norm;
  });
  return Object.keys(out).length ? out : null;
}


function normalizeSemanticTextureMap(def) {
  var api = getItemFacingCoreApi();
  if (api && typeof api.getSemanticTextureMap === 'function') return api.getSemanticTextureMap(def || {});
  var colors = (def && def.semanticFaceColors) || {};
  var defaults = { top: '#2F80ED', north: '#E74C3C', east: '#27AE60', south: '#F2C94C', west: '#9B51E0' };
  var out = {};
  ['top', 'north', 'east', 'south', 'west'].forEach(function (key) {
    var direct = def && def[key + 'Texture'];
    var src = (def && def.semanticTextureMap && def.semanticTextureMap[key]) || (def && def.semanticTextures && def.semanticTextures[key]) || direct || {};
    out[key] = {
      textureId: String(src.textureId || src.id || ('debug.semantic.' + key + '.solid')),
      kind: String(src.kind || src.type || 'solid-color'),
      color: src.color || src.fill || colors[key] || defaults[key],
      semanticFace: key
    };
  });
  return out;
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

function cloneJsonSafe(value) {
  if (value == null) return value;
  try { return JSON.parse(JSON.stringify(value)); }
  catch (err) { return value; }
}

function normalizePrefab(def) {
  var hasExplicitVoxelArray = Array.isArray(def.voxels);
  var explicitVoxelCount = hasExplicitVoxelArray ? def.voxels.length : null;
  var rawVoxels = hasExplicitVoxelArray && def.voxels.length
    ? def.voxels.map(function (v) { return Object.assign({ solid: true, collidable: true, base: def.base || '#c7b0df' }, cloneVoxel(v)); })
    : makeRectVoxels(Math.max(1, def.w || 1), Math.max(1, def.d || 1), Math.max(1, def.h || 1), def.base || '#c7b0df');
  var sprite = normalizeSpriteInfo(def.sprite);
  var spriteDirections = normalizeSpriteDirections(def.spriteDirections);
  var habboLayerDirections = normalizeHabboLayerDirections(def.habboLayerDirections);
  var habboMeta = cloneJsonSafe(def.habboMeta);
  var semanticTextureMap = normalizeSemanticTextureMap(def || {});
  var semanticFaceColors = Object.assign({}, def.semanticFaceColors || {});
  ['top', 'north', 'east', 'south', 'west'].forEach(function (key) {
    if (!semanticFaceColors[key] && semanticTextureMap[key]) semanticFaceColors[key] = semanticTextureMap[key].color;
  });
  var maxX = 0, maxY = 0, maxZ = 0;
  for (var i = 0; i < rawVoxels.length; i++) {
    var v = rawVoxels[i];
    maxX = Math.max(maxX, v.x || 0);
    maxY = Math.max(maxY, v.y || 0);
    maxZ = Math.max(maxZ, v.z || 0);
  }
  return Object.assign({}, def, {
    id: def.id,
    key: def.key || '',
    name: def.name || def.id || 'Prefab',
    base: def.base || '#c7b0df',
    semanticTextureMap: semanticTextureMap,
    semanticTextures: semanticTextureMap,
    topTexture: semanticTextureMap.top,
    northTexture: semanticTextureMap.north,
    eastTexture: semanticTextureMap.east,
    southTexture: semanticTextureMap.south,
    westTexture: semanticTextureMap.west,
    semanticFaceColors: semanticFaceColors,
    sprite: sprite,
    spriteDirections: spriteDirections,
    habboLayerDirections: habboLayerDirections,
    habboMeta: habboMeta,
    renderMode: String((sprite || spriteDirections || habboLayerDirections) ? (def.renderMode || 'sprite_proxy') : 'voxel'),
    slices: Array.isArray(def.slices) ? def.slices.slice() : [],
    voxels: rawVoxels,
    explicitVoxelCount: explicitVoxelCount,
    proxyFallbackUsed: !!(hasExplicitVoxelArray && explicitVoxelCount === 0),
    w: maxX + 1,
    d: maxY + 1,
    h: maxZ + 1,
  });
}

var DEBUG_5FACE_TEXTURE_MAP = {
  top: { textureId: 'debug.semantic.top.solid-blue', kind: 'solid-color', color: '#2F80ED', semanticFace: 'top' },
  north: { textureId: 'debug.semantic.north.solid-red', kind: 'solid-color', color: '#E74C3C', semanticFace: 'north' },
  east: { textureId: 'debug.semantic.east.solid-green', kind: 'solid-color', color: '#27AE60', semanticFace: 'east' },
  south: { textureId: 'debug.semantic.south.solid-yellow', kind: 'solid-color', color: '#F2C94C', semanticFace: 'south' },
  west: { textureId: 'debug.semantic.west.solid-purple', kind: 'solid-color', color: '#9B51E0', semanticFace: 'west' }
};

var prototypes = [
  normalizePrefab({ key: '1', id: 'debug_cube_5faces', name: 'Debug Cube · 5 Faces', base: '#c7b0df', spriteStrategyHint: 'single', itemRotationDebug: true, semanticTextureMap: DEBUG_5FACE_TEXTURE_MAP, semanticTextures: DEBUG_5FACE_TEXTURE_MAP, semanticFaceColors: { top: '#2F80ED', north: '#E74C3C', east: '#27AE60', south: '#F2C94C', west: '#9B51E0' }, voxels: [{ x: 0, y: 0, z: 0 }] }),
  normalizePrefab({ key: '2', id: 'debug_rect_2x1_5faces', name: 'Debug Rect 2×1 · 5 Faces', base: '#d4bb90', spriteStrategyHint: 'single', itemRotationDebug: true, semanticTextureMap: DEBUG_5FACE_TEXTURE_MAP, semanticTextures: DEBUG_5FACE_TEXTURE_MAP, semanticFaceColors: { top: '#2F80ED', north: '#E74C3C', east: '#27AE60', south: '#F2C94C', west: '#9B51E0' }, voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] }),
  normalizePrefab({ key: '3', id: 'cube_1x1', name: 'Cube', base: '#c7b0df', voxels: [{ x: 0, y: 0, z: 0 }] }),
  normalizePrefab({ key: '2', id: 'bench_2x1', name: 'Bench', base: '#d4bb90', voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] }),
  normalizePrefab({ key: '3', id: 'sofa_2x1', name: 'Sofa', base: '#9eb6dd', voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] }),
  normalizePrefab({ key: '4', id: 'cabinet_1x1x2', name: 'Cabinet', base: '#a8c46d', voxels: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }] }),
  normalizePrefab({ key: '5', id: 'stair_3step', name: 'Stair', base: '#c99568', voxels: [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 1 },
    { x: 2, y: 0, z: 0 }, { x: 2, y: 0, z: 1 }, { x: 2, y: 0, z: 2 }
  ] }),
  normalizePrefab({ key: '6', id: 't_shape', name: 'T Shape', base: '#7fbf9a', voxels: [
    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }
  ] }),
  normalizePrefab({ key: '7', id: 'table_2x1', name: 'Table', base: '#cfa670', voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] })
];
prototypes.forEach(function (prefab) {
  tracePrefabRegister(prefab.id, 'built-in', { builtIn: true, voxels: prefab.voxels.length });
});

function getP3StateOwnerMapApi() {
  return (typeof window !== 'undefined' && window.__STATE_OWNER_MAP__) ? window.__STATE_OWNER_MAP__ : null;
}

function prefabWrite(action, extra) {
  var mapApi = getP3StateOwnerMapApi();
  if (mapApi && typeof mapApi.recordWrite === 'function') {
    mapApi.recordWrite(PREFAB_REGISTRY_OWNER, action, extra || null);
  }
}

function getSelectedPrototypeIndex() {
  return editor && typeof editor.prototypeIndex === 'number' ? editor.prototypeIndex : 0;
}

function summarizePrefabRegistry() {
  var selectedIndex = getSelectedPrototypeIndex();
  var selected = prototypes[selectedIndex] || null;
  return {
    prototypeCount: prototypes.length,
    selectedPrototypeIndex: selectedIndex,
    selectedPrefabId: selected ? String(selected.id || '') : null
  };
}

function ensurePrefabRegistered(def) {
  var id = def.id;
  var found = prototypes.find(function (p) { return p.id === id; });
  if (!found) {
    found = normalizePrefab(def);
    prototypes.push(found);
    tracePrefabRegister(found.id, 'ensure', { builtIn: false, voxels: found.voxels.length });
    prefabWrite('registerPrefab', { source: 'ensurePrefabRegistered', prefabId: found.id, action: 'append-new', prototypeCount: prototypes.length });
  }
  return found;
}

function registerPrefab(def, meta) {
  meta = meta || {};
  var normalized = normalizePrefab(def || {});
  var existingIndex = prototypes.findIndex(function (p) { return p && p.id === normalized.id; });
  if (existingIndex >= 0) {
    prototypes[existingIndex] = normalized;
    tracePrefabRegister(normalized.id, meta.source || 'registerPrefab', { builtIn: false, voxels: normalized.voxels.length, action: 'update-existing' });
    prefabWrite('registerPrefab', { source: meta.source || 'unknown', prefabId: normalized.id, action: 'update-existing', prototypeIndex: existingIndex, prototypeCount: prototypes.length });
    return prototypes[existingIndex];
  }
  prototypes.push(normalized);
  tracePrefabRegister(normalized.id, meta.source || 'registerPrefab', { builtIn: false, voxels: normalized.voxels.length, action: 'append-new' });
  prefabWrite('registerPrefab', { source: meta.source || 'unknown', prefabId: normalized.id, action: 'append-new', prototypeIndex: prototypes.length - 1, prototypeCount: prototypes.length });
  return prototypes[prototypes.length - 1];
}

function replacePrefabById(prefabId, nextDef, meta) {
  meta = meta || {};
  var id = String(prefabId || (nextDef && nextDef.id) || '').trim();
  if (!id) return null;
  var normalized = normalizePrefab(Object.assign({}, nextDef || {}, { id: id }));
  var existingIndex = prototypes.findIndex(function (p) { return p && p.id === id; });
  if (existingIndex < 0) return registerPrefab(normalized, Object.assign({}, meta, { source: meta.source || 'replacePrefabById:append' }));
  prototypes[existingIndex] = normalized;
  tracePrefabRegister(normalized.id, meta.source || 'replacePrefabById', { builtIn: false, voxels: normalized.voxels.length, action: 'replace-existing' });
  prefabWrite('replacePrefabById', { source: meta.source || 'unknown', prefabId: id, prototypeIndex: existingIndex, prototypeCount: prototypes.length });
  return prototypes[existingIndex];
}

function setSelectedPrototypeIndex(index, meta) {
  meta = meta || {};
  var prevIndex = getSelectedPrototypeIndex();
  var safeIndex = Math.max(0, Math.min(Number(index) || 0, Math.max(0, prototypes.length - 1)));
  editor.prototypeIndex = safeIndex;
  if (typeof ui !== 'undefined' && ui && ui.prefabSelect) ui.prefabSelect.value = String(safeIndex);
  var selected = prototypes[safeIndex] || null;
  prefabWrite('setSelectedPrototypeIndex', { source: meta.source || 'unknown', from: prevIndex, to: safeIndex, prefabId: selected ? selected.id : null });
  return safeIndex;
}

function setSelectedPrefabId(prefabId, meta) {
  meta = meta || {};
  var id = String(prefabId || '').trim();
  if (!id) return -1;
  var idx = prototypes.findIndex(function (p) { return p && p.id === id; });
  if (idx < 0) {
    prefabWrite('setSelectedPrefabId', { source: meta.source || 'unknown', prefabId: id, result: 'missing' });
    return -1;
  }
  setSelectedPrototypeIndex(idx, Object.assign({}, meta, { source: meta.source || 'setSelectedPrefabId' }));
  prefabWrite('setSelectedPrefabId', { source: meta.source || 'unknown', prefabId: id, prototypeIndex: idx, result: 'selected' });
  return idx;
}

function refreshPrototypeSelection(meta) {
  meta = meta || {};
  if (typeof refreshPrefabSelectOptions === 'function') refreshPrefabSelectOptions(String(meta.source || 'prefab-registry:refresh'));
  prefabWrite('refreshPrototypeSelection', { source: meta.source || 'unknown', prototypeCount: prototypes.length, selectedIndex: getSelectedPrototypeIndex() });
  return summarizePrefabRegistry();
}

function getPrefabById(id) {
  var found = prototypes.find(function (p) { return p.id === id; }) || null;
  if (found) {
    tracePrefabLookup(id, true, { name: found.name, custom: !!found.custom, voxels: Array.isArray(found.voxels) ? found.voxels.length : 0 });
    return found;
  }
  var fallback = prototypes[0] || null;
  tracePrefabLookup(id, false, { fallbackId: fallback ? fallback.id : null });
  return fallback;
}

function prefabVariant(prefab, rotation) {
  var facingApi = getItemFacingCoreApi();
  var r = facingApi && typeof facingApi.normalizeFacing === 'function'
    ? facingApi.normalizeFacing(rotation)
    : (((rotation || 0) % 4 + 4) % 4);
  if (!prefab._variantCache) prefab._variantCache = new Map();
  if (prefab._variantCache.has(r)) return prefab._variantCache.get(r);
  var voxels = facingApi && typeof facingApi.rotateVoxelList === 'function'
    ? facingApi.rotateVoxelList(prefab, r)
    : (Array.isArray(prefab.voxels) ? prefab.voxels.map(function (v) { return Object.assign({}, v); }) : []);
  var maxX = 0, maxY = 0, maxZ = 0;
  var bottomMap = new Map();
  for (var i = 0; i < voxels.length; i++) {
    var vv = voxels[i];
    maxX = Math.max(maxX, vv.x || 0);
    maxY = Math.max(maxY, vv.y || 0);
    maxZ = Math.max(maxZ, vv.z || 0);
    var key = vv.x + ',' + vv.y;
    var prev = bottomMap.get(key);
    if (prev == null || vv.z < prev) bottomMap.set(key, vv.z);
  }
  var supportCells = Array.from(bottomMap.entries()).map(function (entry) {
    var xy = entry[0].split(',').map(Number);
    return { x: xy[0], y: xy[1], localZ: entry[1] };
  });
  var rotatedAnchor = facingApi && typeof facingApi.getRotatedAnchor === 'function'
    ? facingApi.getRotatedAnchor(prefab, r)
    : (prefab.anchor ? { x: Number(prefab.anchor.x) || 0, y: Number(prefab.anchor.y) || 0, z: Number(prefab.anchor.z) || 0 } : { x: 0, y: 0, z: 0 });
  var facingPrototype = facingApi && typeof facingApi.buildFacingPrototype === 'function'
    ? facingApi.buildFacingPrototype(prefab, r, null)
    : null;
  var variant = Object.assign({}, prefab, {
    rotation: r,
    facing: r,
    voxels: voxels,
    w: maxX + 1,
    d: maxY + 1,
    h: maxZ + 1,
    supportCells: supportCells,
    anchor: rotatedAnchor,
    itemFacingPrototype: facingPrototype
  });
  prefab._variantCache.set(r, variant);
  tracePrefabVariant(prefab.id, r, { voxels: voxels.length, w: variant.w, d: variant.d, h: variant.h, anchor: rotatedAnchor });
  return variant;
}

var PREFAB_REGISTRY_API = {
  owner: PREFAB_REGISTRY_OWNER,
  normalizePrefab: normalizePrefab,
  ensurePrefabRegistered: ensurePrefabRegistered,
  registerPrefab: registerPrefab,
  replacePrefabById: replacePrefabById,
  setSelectedPrototypeIndex: setSelectedPrototypeIndex,
  setSelectedPrefabId: setSelectedPrefabId,
  refreshPrototypeSelection: refreshPrototypeSelection,
  getSelectedPrototypeIndex: getSelectedPrototypeIndex,
  summarize: summarizePrefabRegistry,
  getPrefabById: getPrefabById,
  prefabVariant: prefabVariant,
  getPrototypeCount: function () { return prototypes.length; },
  getBuiltInCount: function () { return prototypes.filter(function (p) { return !p.custom && !p.assetManaged && !p.externalManaged; }).length; },
  getPrototypes: function () { return prototypes; }
};
if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
  window.__APP_NAMESPACE.bind('state.prefabRegistry', PREFAB_REGISTRY_API, { owner: PREFAB_REGISTRY_OWNER, phase: 'P3-B' });
}
