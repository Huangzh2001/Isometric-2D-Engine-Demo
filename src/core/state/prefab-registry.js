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

function finiteNumber(value, fallback) {
  var n = Number(value);
  return Number.isFinite(n) ? n : Number(fallback || 0);
}

function positiveNumber(value, fallback) {
  return Math.max(0, finiteNumber(value, fallback));
}

function cloneVoxel(v) {
  var safe = v && typeof v === 'object' ? v : {};
  return {
    x: finiteNumber(safe.x, 0),
    y: finiteNumber(safe.y, 0),
    z: finiteNumber(safe.z, 0),
    w: Math.max(0.001, positiveNumber(safe.w, 1) || 1),
    d: Math.max(0.001, positiveNumber(safe.d, 1) || 1),
    h: Math.max(0.001, positiveNumber(safe.h, 1) || 1),
    solid: safe.solid !== false,
    collidable: safe.collidable !== false,
    renderHidden: safe.renderHidden === true,
    collisionOnly: safe.collisionOnly === true,
    base: safe.base || null,
    shapeKind: safe.shapeKind || null,
    slopeDirection: safe.slopeDirection != null ? String(safe.slopeDirection) : null,
    liquidType: safe.liquidType != null ? String(safe.liquidType) : (safe.fluidType != null ? String(safe.fluidType) : null),
    liquidDepth: safe.liquidDepth != null ? Math.max(0, Math.min(1, finiteNumber(safe.liquidDepth, 1))) : (safe.waterAmount != null ? Math.max(0, Math.min(1, finiteNumber(safe.waterAmount, 1))) : null),
    waterAmount: safe.waterAmount != null ? Math.max(0, Math.min(1, finiteNumber(safe.waterAmount, 1))) : (safe.liquidDepth != null ? Math.max(0, Math.min(1, finiteNumber(safe.liquidDepth, 1))) : null),
    fluidRenderPrototype: safe.fluidRenderPrototype === true,
    collisionPolygon2d: Array.isArray(safe.collisionPolygon2d) ? safe.collisionPolygon2d.map(function (pt) { return { x: finiteNumber(pt && pt.x, 0), y: finiteNumber(pt && pt.y, 0) }; }) : null,
    stairRole: safe.stairRole || null,
    stairStepIndex: safe.stairStepIndex != null ? finiteNumber(safe.stairStepIndex, 0) : null,
    stairStepCount: safe.stairStepCount != null ? Math.max(1, finiteNumber(safe.stairStepCount, 1)) : null,
    stairMaxStepUpCells: safe.stairMaxStepUpCells != null ? Math.max(0, finiteNumber(safe.stairMaxStepUpCells, 0.6)) : null,
    cylinderResolution: safe.cylinderResolution != null ? Math.max(1, finiteNumber(safe.cylinderResolution, 1)) : null,
    cylinderCellX: safe.cylinderCellX != null ? finiteNumber(safe.cylinderCellX, 0) : null,
    cylinderCellY: safe.cylinderCellY != null ? finiteNumber(safe.cylinderCellY, 0) : null,
    cylinderCellIndex: safe.cylinderCellIndex != null ? finiteNumber(safe.cylinderCellIndex, 0) : null,
  };
}

function clonePrimitive(p) {
  var safe = p && typeof p === 'object' ? p : {};
  var vertices = Array.isArray(safe.vertices2d) ? safe.vertices2d : [];
  return {
    id: String(safe.id || safe.primitiveId || ''),
    kind: String(safe.kind || safe.primitiveKind || 'vertical_tri_prism'),
    primitiveKind: String(safe.primitiveKind || safe.kind || 'vertical_tri_prism'),
    z: finiteNumber(safe.z, 0),
    h: Math.max(0.001, positiveNumber(safe.h, 1) || 1),
    vertices2d: vertices.map(function (pt) { return { x: finiteNumber(pt && pt.x, 0), y: finiteNumber(pt && pt.y, 0) }; }),
    sortCell: {
      x: finiteNumber(safe.sortCell && safe.sortCell.x, safe.cellX != null ? safe.cellX : 0),
      y: finiteNumber(safe.sortCell && safe.sortCell.y, safe.cellY != null ? safe.cellY : 0),
      z: finiteNumber(safe.sortCell && safe.sortCell.z, safe.cellZ != null ? safe.cellZ : 0)
    },
    base: safe.base || null,
    shapeKind: safe.shapeKind || 'vertical_tri_prism'
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
    sourceFacing: Number.isFinite(Number(sprite.sourceFacing)) ? Number(sprite.sourceFacing) : null,
    flipY: !!sprite.flipY,
    previewOpacity: sprite.previewOpacity == null ? 1 : Number(sprite.previewOpacity),
    activeFacing: Number.isFinite(Number(sprite.activeFacing)) ? Number(sprite.activeFacing) : null,
    facingTransforms: Array.isArray(sprite.facingTransforms) ? cloneJsonSafe(sprite.facingTransforms) : null,
    registrationPx: sprite.registrationPx ? cloneJsonSafe(sprite.registrationPx) : null,
    relativeVoxelAlignment: sprite.relativeVoxelAlignment ? cloneJsonSafe(sprite.relativeVoxelAlignment) : null,
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

function normalizeRenderUpdateMode(value, fallback) {
  var mode = String(value || '').trim().toLowerCase();
  if (mode === 'dynamic') return 'dynamic';
  if (mode === 'static') return 'static';
  return String(fallback || 'static') === 'dynamic' ? 'dynamic' : 'static';
}

function derivePrefabRenderUpdateMode(def, context) {
  context = context || {};
  if (def && (def.renderUpdateMode === 'static' || def.renderUpdateMode === 'dynamic')) {
    return normalizeRenderUpdateMode(def.renderUpdateMode, 'static');
  }
  var hasSpriteVisual = !!(context.sprite || context.spriteDirections || context.habboLayerDirections);
  return hasSpriteVisual ? 'dynamic' : 'static';
}

function getPrefabRenderUpdateMode(prefab, instanceOrOverride) {
  var instanceMode = null;
  if (instanceOrOverride && typeof instanceOrOverride === 'object') instanceMode = instanceOrOverride.renderUpdateMode;
  else if (typeof instanceOrOverride === 'string') instanceMode = instanceOrOverride;
  if (instanceMode === 'static' || instanceMode === 'dynamic') return normalizeRenderUpdateMode(instanceMode, 'static');
  if (prefab && (prefab.renderUpdateMode === 'static' || prefab.renderUpdateMode === 'dynamic')) {
    return normalizeRenderUpdateMode(prefab.renderUpdateMode, 'static');
  }
  return normalizeRenderUpdateMode(null, prefab && (prefab.renderMode || 'voxel') !== 'voxel' ? 'dynamic' : 'static');
}

function normalizePrefab(def) {
  var hasExplicitVoxelArray = Array.isArray(def.voxels);
  var explicitVoxelCount = hasExplicitVoxelArray ? def.voxels.length : null;
  var rawVoxels = hasExplicitVoxelArray && def.voxels.length
    ? def.voxels.map(function (v) { return Object.assign({ solid: true, collidable: true, base: def.base || '#c7b0df' }, cloneVoxel(v)); })
    : makeRectVoxels(Math.max(1, def.w || 1), Math.max(1, def.d || 1), Math.max(1, def.h || 1), def.base || '#c7b0df');
  var rawPrimitives = Array.isArray(def.primitives) ? def.primitives.map(function (p) {
    return Object.assign({ base: def.base || '#c7b0df' }, clonePrimitive(p));
  }).filter(function (p) { return Array.isArray(p.vertices2d) && p.vertices2d.length >= 3; }) : [];
  var sprite = normalizeSpriteInfo(def.sprite);
  var spriteDirections = normalizeSpriteDirections(def.spriteDirections);
  var habboLayerDirections = normalizeHabboLayerDirections(def.habboLayerDirections);
  var habboMeta = cloneJsonSafe(def.habboMeta);
  var semanticTextureMap = normalizeSemanticTextureMap(def || {});
  var semanticFaceColors = Object.assign({}, def.semanticFaceColors || {});
  ['top', 'north', 'east', 'south', 'west'].forEach(function (key) {
    if (!semanticFaceColors[key] && semanticTextureMap[key]) semanticFaceColors[key] = semanticTextureMap[key].color;
  });
  var inferredRenderMode = String((sprite || spriteDirections || habboLayerDirections) ? (def.renderMode || 'sprite_proxy') : 'voxel');
  var renderUpdateMode = derivePrefabRenderUpdateMode(def, {
    sprite: sprite,
    spriteDirections: spriteDirections,
    habboLayerDirections: habboLayerDirections,
    renderMode: inferredRenderMode
  });
  var maxX = 0, maxY = 0, maxZ = 0;
  for (var i = 0; i < rawVoxels.length; i++) {
    var v = rawVoxels[i];
    maxX = Math.max(maxX, finiteNumber(v.x, 0) + Math.max(0.001, finiteNumber(v.w, 1)));
    maxY = Math.max(maxY, finiteNumber(v.y, 0) + Math.max(0.001, finiteNumber(v.d, 1)));
    maxZ = Math.max(maxZ, finiteNumber(v.z, 0) + Math.max(0.001, finiteNumber(v.h, 1)));
  }
  var explicitSupportCells = Array.isArray(def.supportCells)
    ? def.supportCells.map(function (cell) { return { x: finiteNumber(cell && cell.x, 0), y: finiteNumber(cell && cell.y, 0), localZ: finiteNumber(cell && cell.localZ, 0) }; })
    : null;
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
    renderMode: inferredRenderMode,
    renderUpdateMode: renderUpdateMode,
    slices: Array.isArray(def.slices) ? def.slices.slice() : [],
    voxels: rawVoxels,
    primitives: rawPrimitives,
    supportCells: explicitSupportCells,
    explicitVoxelCount: explicitVoxelCount,
    proxyFallbackUsed: !!(hasExplicitVoxelArray && explicitVoxelCount === 0),
    w: Math.max(1, finiteNumber(def.w, maxX), maxX),
    d: Math.max(1, finiteNumber(def.d, maxY), maxY),
    h: Math.max(1, finiteNumber(def.h, maxZ), maxZ),
  });
}

var DEBUG_5FACE_TEXTURE_MAP = {
  top: { textureId: 'debug.semantic.top.solid-blue', kind: 'solid-color', color: '#2F80ED', semanticFace: 'top' },
  north: { textureId: 'debug.semantic.north.solid-red', kind: 'solid-color', color: '#E74C3C', semanticFace: 'north' },
  east: { textureId: 'debug.semantic.east.solid-green', kind: 'solid-color', color: '#27AE60', semanticFace: 'east' },
  south: { textureId: 'debug.semantic.south.solid-yellow', kind: 'solid-color', color: '#F2C94C', semanticFace: 'south' },
  west: { textureId: 'debug.semantic.west.solid-purple', kind: 'solid-color', color: '#9B51E0', semanticFace: 'west' }
};



function makeVoxelCylinderVoxels(resolution, base) {
  var n = Math.max(4, Math.round(Number(resolution) || 8));
  var voxels = [];
  var radius = 0.5;
  var radiusSq = radius * radius;
  for (var y = 0; y < n; y++) {
    for (var x = 0; x < n; x++) {
      var cx = ((x + 0.5) / n) - 0.5;
      var cy = ((y + 0.5) / n) - 0.5;
      if ((cx * cx + cy * cy) > radiusSq + 1e-9) continue;
      voxels.push({
        x: x / n,
        y: y / n,
        z: 0,
        w: 1 / n,
        d: 1 / n,
        h: 1,
        base: base || '#a8b66f',
        shapeKind: 'cylinder_voxel_' + n,
        cylinderResolution: n,
        cylinderCellX: x,
        cylinderCellY: y,
        cylinderCellIndex: voxels.length
      });
    }
  }
  return voxels;
}



function makeTriPrismCollisionVoxelFromPolygonWithHeight(id, vertices, base, height, shapeKind) {
  var verts = Array.isArray(vertices) ? vertices : [];
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < verts.length; i++) {
    var x = finiteNumber(verts[i] && verts[i].x, 0);
    var y = finiteNumber(verts[i] && verts[i].y, 0);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    minX = 0; minY = 0; maxX = 1; maxY = 1;
  }
  return {
    x: minX,
    y: minY,
    z: 0,
    w: Math.max(0.001, maxX - minX),
    d: Math.max(0.001, maxY - minY),
    h: Math.max(0.001, finiteNumber(height, 1)),
    renderHidden: true,
    collisionOnly: true,
    base: base || '#d59a62',
    shapeKind: shapeKind || 'tri_prism_collision',
    collisionPolygon2d: verts.map(function (pt) { return { x: finiteNumber(pt && pt.x, 0), y: finiteNumber(pt && pt.y, 0) }; }),
    primitiveId: id || null
  };
}

function makeTriPrismCollisionVoxelFromPolygon(id, vertices, base) {
  return makeTriPrismCollisionVoxelFromPolygonWithHeight(id, vertices, base, 1, 'tri_prism_collision');
}

function makeTriHalfCollisionVoxels(kind, base) {
  var verts = kind === 'diag_b'
    ? [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
    : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
  return [makeTriPrismCollisionVoxelFromPolygon('tri-half-collision-' + String(kind || 'diag_a'), verts, base)];
}

function getTileQuarterTriVertices(kind) {
  var c = { x: 0.5, y: 0.5 };
  switch (String(kind || 'ne')) {
    case 'se': return [{ x: 1, y: 0 }, { x: 1, y: 1 }, c];
    case 'sw': return [{ x: 1, y: 1 }, { x: 0, y: 1 }, c];
    case 'nw': return [{ x: 0, y: 1 }, { x: 0, y: 0 }, c];
    case 'ne':
    default: return [{ x: 0, y: 0 }, { x: 1, y: 0 }, c];
  }
}

function makeTriQuarterCollisionVoxels(kind, base) {
  var safeKind = String(kind || 'ne');
  return [makeTriPrismCollisionVoxelFromPolygon('tri-quarter-collision-' + safeKind, getTileQuarterTriVertices(safeKind), base)];
}

function makeVertexQuadTriCollisionVoxels(base) {
  return [
    makeTriPrismCollisionVoxelFromPolygon('vertex-collision-nw', [{ x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 }], base),
    makeTriPrismCollisionVoxelFromPolygon('vertex-collision-ne', [{ x: 1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 1 }], base),
    makeTriPrismCollisionVoxelFromPolygon('vertex-collision-sw', [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 1 }], base),
    makeTriPrismCollisionVoxelFromPolygon('vertex-collision-se', [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }], base)
  ];
}


function getQuarterTriLeg() {
  // Each corner triangle has area 1/4 of a 1×1 diamond-tile footprint:
  // area = leg² / 2 = 1/4, so leg = sqrt(1/2).
  return Math.SQRT1_2 || Math.sqrt(0.5);
}

function makeVertexQuarterTriCollisionVoxels(base) {
  var q = getQuarterTriLeg();
  var c = { x: 1, y: 1 };
  return [
    makeTriPrismCollisionVoxelFromPolygon('vertex-quarter-collision-nw', [c, { x: 1 - q, y: 1 }, { x: 1, y: 1 - q }], base),
    makeTriPrismCollisionVoxelFromPolygon('vertex-quarter-collision-ne', [c, { x: 1, y: 1 - q }, { x: 1 + q, y: 1 }], base),
    makeTriPrismCollisionVoxelFromPolygon('vertex-quarter-collision-sw', [c, { x: 1, y: 1 + q }, { x: 1 - q, y: 1 }], base),
    makeTriPrismCollisionVoxelFromPolygon('vertex-quarter-collision-se', [c, { x: 1 + q, y: 1 }, { x: 1, y: 1 + q }], base)
  ];
}

function makeTriHalfPrimitives(kind, base) {
  var verts = kind === 'diag_b'
    ? [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
    : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
  return [{
    id: 'tri-half-' + String(kind || 'diag_a'),
    kind: 'vertical_tri_prism',
    primitiveKind: 'vertical_tri_prism',
    vertices2d: verts,
    z: 0,
    h: 1,
    sortCell: { x: 0, y: 0, z: 0 },
    base: base || '#d59a62',
    shapeKind: 'vertical_tri_prism'
  }];
}

function makeTriQuarterPrimitives(kind, base) {
  var safeKind = String(kind || 'ne');
  return [{
    id: 'tri-quarter-' + safeKind,
    kind: 'vertical_tri_prism',
    primitiveKind: 'vertical_tri_prism',
    vertices2d: getTileQuarterTriVertices(safeKind),
    z: 0,
    h: 1,
    sortCell: { x: 0, y: 0, z: 0 },
    base: base || '#d59a62',
    shapeKind: 'quarter_tile_tri_prism'
  }];
}


function getDerivedGridUnitHeight() {
  // The derived axis grid uses the natural altitude of a unit equilateral-triangle split:
  // h = sqrt(3) / 2 ≈ 0.866. This keeps the new derived-grid atom height tied
  // to the same geometric scale as the four-way diamond split.
  return Math.sqrt(3) / 2;
}

function makeDerivedQuarterTriCollisionVoxels(kind, base) {
  var safeKind = String(kind || 'ne');
  return [makeTriPrismCollisionVoxelFromPolygonWithHeight(
    'derived-quarter-collision-' + safeKind,
    getTileQuarterTriVertices(safeKind),
    base || '#7fb4d8',
    getDerivedGridUnitHeight(),
    'derived_quarter_tri_prism'
  )];
}

function makeDerivedQuarterTriPrimitives(kind, base) {
  var safeKind = String(kind || 'ne');
  return [{
    id: 'derived-quarter-tri-' + safeKind,
    kind: 'vertical_tri_prism',
    primitiveKind: 'vertical_tri_prism',
    vertices2d: getTileQuarterTriVertices(safeKind),
    z: 0,
    h: getDerivedGridUnitHeight(),
    sortCell: { x: 0, y: 0, z: 0 },
    base: base || '#7fb4d8',
    shapeKind: 'derived_quarter_tri_prism'
  }];
}

function translateVertices2d(vertices, dx, dy) {
  return (Array.isArray(vertices) ? vertices : []).map(function (pt) {
    return { x: finiteNumber(pt && pt.x, 0) + finiteNumber(dx, 0), y: finiteNumber(pt && pt.y, 0) + finiteNumber(dy, 0) };
  });
}

function getDerivedAxisUnitAdjacentParts(kind) {
  var safeKind = String(kind || 'right');
  // A derived axis unit is not two quarters inside the same diamond. It is made
  // from two adjacent diamond cells, each contributing the quarter triangle that
  // touches their shared edge. The base/right unit crosses the edge between
  // cell(0,0) and cell(1,0): left cell SE + right cell NW.
  // The prefab itself declares a 2×2 rotation frame and does NOT use explicit
  // supportCells, so prefabVariant() derives support from the rotated polygon
  // footprints instead of keeping the right-facing support cells for all rotations.
  if (safeKind === 'top') {
    return [
      { part: 'ne', dx: 0, dy: 0, sortCell: { x: 0, y: 0, z: 0 } },
      { part: 'sw', dx: 0, dy: -1, sortCell: { x: 0, y: -1, z: 0 } }
    ];
  }
  if (safeKind === 'left') {
    return [
      { part: 'nw', dx: 0, dy: 0, sortCell: { x: 0, y: 0, z: 0 } },
      { part: 'se', dx: -1, dy: 0, sortCell: { x: -1, y: 0, z: 0 } }
    ];
  }
  if (safeKind === 'bottom') {
    return [
      { part: 'sw', dx: 0, dy: 0, sortCell: { x: 0, y: 0, z: 0 } },
      { part: 'ne', dx: 0, dy: 1, sortCell: { x: 0, y: 1, z: 0 } }
    ];
  }
  return [
    { part: 'se', dx: 0, dy: 0, sortCell: { x: 0, y: 0, z: 0 } },
    { part: 'nw', dx: 1, dy: 0, sortCell: { x: 1, y: 0, z: 0 } }
  ];
}

function makeDerivedAxisUnitCollisionVoxels(kind, base) {
  var safeKind = String(kind || 'right');
  return getDerivedAxisUnitAdjacentParts(safeKind).map(function (entry, idx) {
    return makeTriPrismCollisionVoxelFromPolygonWithHeight(
      'derived-axis-unit-collision-' + safeKind + '-' + entry.part + '-' + idx,
      translateVertices2d(getTileQuarterTriVertices(entry.part), entry.dx, entry.dy),
      base || '#72c49b',
      getDerivedGridUnitHeight(),
      'derived_axis_unit_adjacent_tri_part'
    );
  });
}

function makeDerivedAxisUnitPrimitives(kind, base) {
  var safeKind = String(kind || 'right');
  return getDerivedAxisUnitAdjacentParts(safeKind).map(function (entry, idx) {
    return {
      id: 'derived-axis-unit-' + safeKind + '-' + entry.part + '-' + idx,
      kind: 'vertical_tri_prism',
      primitiveKind: 'vertical_tri_prism',
      vertices2d: translateVertices2d(getTileQuarterTriVertices(entry.part), entry.dx, entry.dy),
      z: 0,
      h: getDerivedGridUnitHeight(),
      sortCell: entry.sortCell || { x: 0, y: 0, z: 0 },
      base: base || '#72c49b',
      shapeKind: 'derived_axis_unit_adjacent_tri_part',
      derivedAxisPartIndex: idx,
      derivedAxisSourceCell: { x: finiteNumber(entry.dx, 0), y: finiteNumber(entry.dy, 0) }
    };
  });
}

function getMicroTriPrismDefaultVertices() {
  // Catalog/default visual only. Runtime placement replaces this with the
  // current scene subdivision + pointed micro-diamond triangle.
  return [{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.25, y: 0.25 }];
}

function makeMicroTriPrismCollisionVoxels(base) {
  return [makeTriPrismCollisionVoxelFromPolygon('micro-tri-collision-default', getMicroTriPrismDefaultVertices(), base || '#e39b4f')];
}

function makeMicroTriPrismPrimitives(base) {
  return [{
    id: 'micro-tri-default',
    kind: 'vertical_tri_prism',
    primitiveKind: 'vertical_tri_prism',
    vertices2d: getMicroTriPrismDefaultVertices(),
    z: 0,
    h: 1,
    sortCell: { x: 0, y: 0, z: 0 },
    base: base || '#e39b4f',
    shapeKind: 'micro_tri_prism'
  }];
}

function getCompatibleAxisBlockDefaultVertices() {
  // Catalog/default visual only. Runtime placement replaces this with an
  // atom-grid-aligned rectangle based on the active subTileGridSubdivision.
  return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
}

function makeCompatibleAxisBlockCollisionVoxels(base) {
  return [makeTriPrismCollisionVoxelFromPolygon('compatible-axis-collision-default', getCompatibleAxisBlockDefaultVertices(), base || '#5dbb8a')];
}

function makeCompatibleAxisBlockPrimitives(base) {
  return [{
    id: 'compatible-axis-default',
    kind: 'vertical_polygon_prism',
    primitiveKind: 'vertical_polygon_prism',
    vertices2d: getCompatibleAxisBlockDefaultVertices(),
    z: 0,
    h: 1,
    sortCell: { x: 0, y: 0, z: 0 },
    base: base || '#5dbb8a',
    shapeKind: 'compatible_axis_block'
  }];
}

function makeVertexQuadTriPrimitives(base) {
  var fill = base || '#d59a62';
  return [
    { id: 'vertex-tri-nw', kind: 'vertical_tri_prism', primitiveKind: 'vertical_tri_prism', vertices2d: [{ x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 }], z: 0, h: 1, sortCell: { x: 0, y: 0, z: 0 }, base: fill, shapeKind: 'vertical_tri_prism' },
    { id: 'vertex-tri-ne', kind: 'vertical_tri_prism', primitiveKind: 'vertical_tri_prism', vertices2d: [{ x: 1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 1 }], z: 0, h: 1, sortCell: { x: 1, y: 0, z: 0 }, base: fill, shapeKind: 'vertical_tri_prism' },
    { id: 'vertex-tri-sw', kind: 'vertical_tri_prism', primitiveKind: 'vertical_tri_prism', vertices2d: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 1 }], z: 0, h: 1, sortCell: { x: 0, y: 1, z: 0 }, base: fill, shapeKind: 'vertical_tri_prism' },
    { id: 'vertex-tri-se', kind: 'vertical_tri_prism', primitiveKind: 'vertical_tri_prism', vertices2d: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }], z: 0, h: 1, sortCell: { x: 1, y: 1, z: 0 }, base: fill, shapeKind: 'vertical_tri_prism' }
  ];
}


function makeVertexQuarterTriPrimitives(base) {
  var fill = base || '#d59a62';
  var q = getQuarterTriLeg();
  var c = { x: 1, y: 1 };
  return [
    { id: 'vertex-quarter-tri-nw', kind: 'vertical_tri_prism', primitiveKind: 'vertical_tri_prism', vertices2d: [c, { x: 1 - q, y: 1 }, { x: 1, y: 1 - q }], z: 0, h: 1, sortCell: { x: 0, y: 0, z: 0 }, base: fill, shapeKind: 'quarter_tile_tri_prism' },
    { id: 'vertex-quarter-tri-ne', kind: 'vertical_tri_prism', primitiveKind: 'vertical_tri_prism', vertices2d: [c, { x: 1, y: 1 - q }, { x: 1 + q, y: 1 }], z: 0, h: 1, sortCell: { x: 1, y: 0, z: 0 }, base: fill, shapeKind: 'quarter_tile_tri_prism' },
    { id: 'vertex-quarter-tri-sw', kind: 'vertical_tri_prism', primitiveKind: 'vertical_tri_prism', vertices2d: [c, { x: 1, y: 1 + q }, { x: 1 - q, y: 1 }], z: 0, h: 1, sortCell: { x: 0, y: 1, z: 0 }, base: fill, shapeKind: 'quarter_tile_tri_prism' },
    { id: 'vertex-quarter-tri-se', kind: 'vertical_tri_prism', primitiveKind: 'vertical_tri_prism', vertices2d: [c, { x: 1 + q, y: 1 }, { x: 1, y: 1 + q }], z: 0, h: 1, sortCell: { x: 1, y: 1, z: 0 }, base: fill, shapeKind: 'quarter_tile_tri_prism' }
  ];
}

function makeLiquidWaterVoxel(depth) {
  var d = Math.max(0.05, Math.min(1, finiteNumber(depth, 0.5)));
  return {
    x: 0, y: 0, z: 0, w: 1, d: 1, h: d,
    solid: false, collidable: false, renderHidden: true,
    base: '#42b8ff',
    shapeKind: 'liquid_water',
    liquidType: 'water',
    liquidDepth: d,
    waterAmount: d,
    fluidRenderPrototype: true
  };
}

function normalizeLiquidWaterLayerCount(layerCount) {
  var n = Math.round(finiteNumber(layerCount, 4));
  if (n < 2) n = 2;
  if (n > 64) n = 64;
  if (n % 2 !== 0) n += 1;
  if (n > 64) n = 64;
  return n;
}

function liquidWaterDepthForLayer(layerIndex, layerCount) {
  var n = normalizeLiquidWaterLayerCount(layerCount);
  var i = Math.max(1, Math.min(n, Math.round(finiteNumber(layerIndex, 1))));
  return i / n;
}

function liquidWaterLayerPrefabId(layerIndex, layerCount) {
  var n = normalizeLiquidWaterLayerCount(layerCount);
  var i = Math.max(1, Math.min(n, Math.round(finiteNumber(layerIndex, 1))));
  if (n === 4) {
    if (i === 1) return 'liquid_water_025';
    if (i === 2) return 'liquid_water_050';
    if (i === 3) return 'liquid_water_075';
    return 'liquid_water_100';
  }
  var pct = Math.round((i / n) * 1000);
  return 'liquid_water_l' + n + '_' + String(pct).padStart(4, '0');
}

function makeLiquidWaterLayerPrefabDef(layerIndex, layerCount) {
  var n = normalizeLiquidWaterLayerCount(layerCount);
  var i = Math.max(1, Math.min(n, Math.round(finiteNumber(layerIndex, 1))));
  var depth = liquidWaterDepthForLayer(i, n);
  var percent = Math.round(depth * 100);
  return {
    key: 'fluid-water-' + n + '-' + i,
    id: liquidWaterLayerPrefabId(i, n),
    name: 'Water Render · ' + percent + '%',
    kind: 'liquid_water',
    base: '#42b8ff',
    renderUpdateMode: 'static',
    supportCells: [],
    fluidRenderLayerCount: n,
    fluidRenderLayerIndex: i,
    fluidRenderDepth: depth,
    voxels: [makeLiquidWaterVoxel(depth)]
  };
}

function ensureLiquidWaterLayerPrefabs(layerCount, meta) {
  meta = meta || {};
  var n = normalizeLiquidWaterLayerCount(layerCount);
  var result = [];
  for (var i = 1; i <= n; i++) {
    var def = makeLiquidWaterLayerPrefabDef(i, n);
    var prefab = registerPrefab(def, { source: meta.source || 'ensureLiquidWaterLayerPrefabs' });
    var idx = prototypes.findIndex(function (p) { return p && p.id === prefab.id; });
    result.push({
      prefab: prefab,
      index: idx,
      id: prefab.id,
      depth: liquidWaterDepthForLayer(i, n),
      layerIndex: i,
      layerCount: n
    });
  }
  prefabWrite('ensureLiquidWaterLayerPrefabs', { source: meta.source || 'unknown', layerCount: n, generated: result.length, prototypeCount: prototypes.length });
  return result;
}


function normalizeTerrainHeightSurfaceLayerCount(value) {
  var n = Math.round(finiteNumber(value, 4));
  if (n < 2) n = 2;
  if (n > 64) n = 64;
  if (n % 2 !== 0) n += 1;
  if (n > 64) n = 64;
  return n;
}

function terrainHeightSurfaceHeightForLayer(index, layerCount) {
  var n = normalizeTerrainHeightSurfaceLayerCount(layerCount);
  var i = Math.max(1, Math.min(n, Math.round(finiteNumber(index, 1))));
  return i / n;
}

function terrainHeightSurfaceLayerPrefabId(index, layerCount) {
  var n = normalizeTerrainHeightSurfaceLayerCount(layerCount);
  var i = Math.max(1, Math.min(n, Math.round(finiteNumber(index, 1))));
  if (n === 4) {
    if (i === 1) return 'terrain_height_025';
    if (i === 2) return 'terrain_height_050';
    if (i === 3) return 'terrain_height_075';
    return 'terrain_height_100';
  }
  var pct = Math.round((i / n) * 1000);
  return 'terrain_height_l' + n + '_' + String(pct).padStart(4, '0');
}

function makeTerrainHeightSurfaceVoxel(height) {
  var h = Math.max(0.05, Math.min(2, finiteNumber(height, 1)));
  return {
    x: 0,
    y: 0,
    z: 0,
    w: 1,
    d: 1,
    h: h,
    base: '#79b35a',
    solid: true,
    collidable: true,
    shapeKind: 'terrain_height_surface',
    terrainHeight: h,
    terrainSurfaceHeight: h
  };
}

function makeTerrainHeightSurfaceLayerPrefabDef(index, layerCount) {
  var n = normalizeTerrainHeightSurfaceLayerCount(layerCount);
  var i = Math.max(1, Math.min(n, Math.round(finiteNumber(index, 1))));
  var height = terrainHeightSurfaceHeightForLayer(i, n);
  var percent = Math.round(height * 100);
  return {
    key: '3th' + n + '_' + i,
    id: terrainHeightSurfaceLayerPrefabId(i, n),
    name: 'Terrain Height Surface · ' + percent + '%',
    kind: 'terrain_height_surface',
    base: '#79b35a',
    renderUpdateMode: 'static',
    supportCells: [{ x: 0, y: 0, localZ: 0 }],
    terrainHeightSurfaceLayerCount: n,
    terrainHeightSurfaceLayerIndex: i,
    terrainHeight: height,
    voxels: [makeTerrainHeightSurfaceVoxel(height)]
  };
}

function ensureTerrainHeightSurfaceLayerPrefabs(layerCount, meta) {
  meta = meta || {};
  var n = normalizeTerrainHeightSurfaceLayerCount(layerCount);
  var result = [];
  for (var i = 1; i <= n; i++) {
    var def = makeTerrainHeightSurfaceLayerPrefabDef(i, n);
    var prefab = registerPrefab(def, { source: meta.source || 'ensureTerrainHeightSurfaceLayerPrefabs' });
    var idx = prototypes.findIndex(function (p) { return p && p.id === prefab.id; });
    result.push({
      prefab: prefab,
      index: idx,
      id: prefab.id,
      height: terrainHeightSurfaceHeightForLayer(i, n),
      layerIndex: i,
      layerCount: n
    });
  }
  prefabWrite('ensureTerrainHeightSurfaceLayerPrefabs', { source: meta.source || 'unknown', layerCount: n, generated: result.length, prototypeCount: prototypes.length });
  return result;
}


function makeMcStairStepVoxels(stepCount, stepLimit, base) {
  var n = Math.max(2, Math.round(Number(stepCount) || 2));
  var limit = Math.max(0, finiteNumber(stepLimit, Math.min(0.6, 1 / n + 0.1)));
  var voxels = [];
  for (var i = 0; i < n; i++) {
    var role = i === 0 ? 'lower' : (i === n - 1 ? 'upper' : 'middle');
    voxels.push({
      x: i / n,
      y: 0,
      z: 0,
      w: 1 / n,
      d: 1,
      h: (i + 1) / n,
      base: base || '#c99568',
      shapeKind: 'stair_mc_' + n + 'step',
      stairRole: role,
      stairStepIndex: i,
      stairStepCount: n,
      stairMaxStepUpCells: limit
    });
  }
  return voxels;
}

var prefabRuntimeSnapshots = new Map();

function retainPrefabRuntimeSnapshot(prefab, meta) {
  meta = meta || {};
  if (!prefab || !prefab.id) return null;
  var id = String(prefab.id);
  var previous = prefabRuntimeSnapshots.get(id) || null;
  prefabRuntimeSnapshots.set(id, prefab);
  if (previous !== prefab) {
    prefabWrite('retainPrefabRuntimeSnapshot', { source: meta.source || 'unknown', prefabId: id, snapshotCount: prefabRuntimeSnapshots.size });
  }
  return prefab;
}

function getPrefabRuntimeSnapshot(prefabId) {
  var id = String(prefabId || '').trim();
  return id ? (prefabRuntimeSnapshots.get(id) || null) : null;
}

var prototypes = [
  normalizePrefab({ key: '1', id: 'debug_cube_5faces', name: 'Debug Cube · 5 Faces', base: '#c7b0df', renderUpdateMode: 'dynamic', spriteStrategyHint: 'single', itemRotationDebug: true, semanticTextureMap: DEBUG_5FACE_TEXTURE_MAP, semanticTextures: DEBUG_5FACE_TEXTURE_MAP, semanticFaceColors: { top: '#2F80ED', north: '#E74C3C', east: '#27AE60', south: '#F2C94C', west: '#9B51E0' }, voxels: [{ x: 0, y: 0, z: 0 }] }),
  normalizePrefab({ key: '2', id: 'debug_rect_2x1_5faces', name: 'Debug Rect 2×1 · 5 Faces', base: '#d4bb90', renderUpdateMode: 'dynamic', spriteStrategyHint: 'single', itemRotationDebug: true, semanticTextureMap: DEBUG_5FACE_TEXTURE_MAP, semanticTextures: DEBUG_5FACE_TEXTURE_MAP, semanticFaceColors: { top: '#2F80ED', north: '#E74C3C', east: '#27AE60', south: '#F2C94C', west: '#9B51E0' }, voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] }),
  normalizePrefab({ key: '3', id: 'cube_1x1', name: 'Cube', base: '#c7b0df', renderUpdateMode: 'static', voxels: [{ x: 0, y: 0, z: 0 }] }),
  normalizePrefab({ key: '3s', id: 'slope_1x1', name: 'Slope · 1×1', kind: 'slope_1x1', base: '#79b35a', renderUpdateMode: 'static', supportCells: [{ x: 0, y: 0, localZ: 0 }], slopeDirection: 'east', voxels: [{ x: 0, y: 0, z: 0, solid: true, collidable: true, shapeKind: 'slope_1x1', slopeDirection: 'east' }] }),
  normalizePrefab({ key: '3w25', id: 'liquid_water_025', name: 'Water Render · 25%', kind: 'liquid_water', base: '#42b8ff', renderUpdateMode: 'static', supportCells: [], voxels: [makeLiquidWaterVoxel(0.25)] }),
  normalizePrefab({ key: '3w50', id: 'liquid_water_050', name: 'Water Render · 50%', kind: 'liquid_water', base: '#42b8ff', renderUpdateMode: 'static', supportCells: [], voxels: [makeLiquidWaterVoxel(0.50)] }),
  normalizePrefab({ key: '3w75', id: 'liquid_water_075', name: 'Water Render · 75%', kind: 'liquid_water', base: '#42b8ff', renderUpdateMode: 'static', supportCells: [], voxels: [makeLiquidWaterVoxel(0.75)] }),
  normalizePrefab({ key: '3w100', id: 'liquid_water_100', name: 'Water Render · 100%', kind: 'liquid_water', base: '#42b8ff', renderUpdateMode: 'static', supportCells: [], voxels: [makeLiquidWaterVoxel(1.00)] }),
  normalizePrefab({ key: '3th25', id: 'terrain_height_025', name: 'Terrain Height Surface · 25%', kind: 'terrain_height_surface', base: '#79b35a', renderUpdateMode: 'static', supportCells: [{ x: 0, y: 0, localZ: 0 }], terrainHeight: 0.25, voxels: [makeTerrainHeightSurfaceVoxel(0.25)] }),
  normalizePrefab({ key: '3th50', id: 'terrain_height_050', name: 'Terrain Height Surface · 50%', kind: 'terrain_height_surface', base: '#79b35a', renderUpdateMode: 'static', supportCells: [{ x: 0, y: 0, localZ: 0 }], terrainHeight: 0.50, voxels: [makeTerrainHeightSurfaceVoxel(0.50)] }),
  normalizePrefab({ key: '3th75', id: 'terrain_height_075', name: 'Terrain Height Surface · 75%', kind: 'terrain_height_surface', base: '#79b35a', renderUpdateMode: 'static', supportCells: [{ x: 0, y: 0, localZ: 0 }], terrainHeight: 0.75, voxels: [makeTerrainHeightSurfaceVoxel(0.75)] }),
  normalizePrefab({ key: '3th100', id: 'terrain_height_100', name: 'Terrain Height Surface · 100%', kind: 'terrain_height_surface', base: '#79b35a', renderUpdateMode: 'static', supportCells: [{ x: 0, y: 0, localZ: 0 }], terrainHeight: 1.00, voxels: [makeTerrainHeightSurfaceVoxel(1.00)] }),
  normalizePrefab({ key: '3a', id: 'stair_mc_2step', name: 'MC Stair · 2-step', kind: 'stair_mc', base: '#c99568', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeMcStairStepVoxels(2, 0.6, '#c99568') }),
  normalizePrefab({ key: '3b', id: 'stair_mc_4step', name: 'MC Stair · 4-step', kind: 'stair_mc', base: '#c99568', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeMcStairStepVoxels(4, 0.35, '#c99568') }),
  normalizePrefab({ key: '3c', id: 'stair_mc_8step', name: 'MC Stair · 8-step', kind: 'stair_mc', base: '#c99568', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeMcStairStepVoxels(8, 0.2, '#c99568') }),
  normalizePrefab({ key: '3d', id: 'cylinder_voxel_4', name: 'Voxel Cylinder · 4×4', kind: 'cylinder_voxel', base: '#a8b66f', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeVoxelCylinderVoxels(4, '#a8b66f') }),
  normalizePrefab({ key: '3e', id: 'cylinder_voxel_8', name: 'Voxel Cylinder · 8×8', kind: 'cylinder_voxel', base: '#a8b66f', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeVoxelCylinderVoxels(8, '#a8b66f') }),
  normalizePrefab({ key: '3f', id: 'cylinder_voxel_12', name: 'Voxel Cylinder · 12×12', kind: 'cylinder_voxel', base: '#a8b66f', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeVoxelCylinderVoxels(12, '#a8b66f') }),
  normalizePrefab({ key: '3g', id: 'tri_prism_half_a', name: 'Tri Prism Half · A', kind: 'tri_prism', base: '#d59a62', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeTriHalfCollisionVoxels('diag_a', '#d59a62'), primitives: makeTriHalfPrimitives('diag_a', '#d59a62') }),
  normalizePrefab({ key: '3h', id: 'tri_prism_half_b', name: 'Tri Prism Half · B', kind: 'tri_prism', base: '#d59a62', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeTriHalfCollisionVoxels('diag_b', '#d59a62'), primitives: makeTriHalfPrimitives('diag_b', '#d59a62') }),
  normalizePrefab({ key: '3l', id: 'tri_prism_quarter_ne', name: 'Tri Prism Quarter · NE', kind: 'tri_prism', base: '#d59a62', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeTriQuarterCollisionVoxels('ne', '#d59a62'), primitives: makeTriQuarterPrimitives('ne', '#d59a62') }),
  normalizePrefab({ key: '3m', id: 'tri_prism_quarter_se', name: 'Tri Prism Quarter · SE', kind: 'tri_prism', base: '#d59a62', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeTriQuarterCollisionVoxels('se', '#d59a62'), primitives: makeTriQuarterPrimitives('se', '#d59a62') }),
  normalizePrefab({ key: '3n', id: 'tri_prism_quarter_sw', name: 'Tri Prism Quarter · SW', kind: 'tri_prism', base: '#d59a62', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeTriQuarterCollisionVoxels('sw', '#d59a62'), primitives: makeTriQuarterPrimitives('sw', '#d59a62') }),
  normalizePrefab({ key: '3o', id: 'tri_prism_quarter_nw', name: 'Tri Prism Quarter · NW', kind: 'tri_prism', base: '#d59a62', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeTriQuarterCollisionVoxels('nw', '#d59a62'), primitives: makeTriQuarterPrimitives('nw', '#d59a62') }),
  normalizePrefab({ key: '4a', id: 'derived_tri_prism_ne', name: 'Derived Tri Prism · NE · h√3/2', kind: 'derived_tri_prism', base: '#7fb4d8', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeDerivedQuarterTriCollisionVoxels('ne', '#7fb4d8'), primitives: makeDerivedQuarterTriPrimitives('ne', '#7fb4d8') }),
  normalizePrefab({ key: '4b', id: 'derived_tri_prism_se', name: 'Derived Tri Prism · SE · h√3/2', kind: 'derived_tri_prism', base: '#7fb4d8', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeDerivedQuarterTriCollisionVoxels('se', '#7fb4d8'), primitives: makeDerivedQuarterTriPrimitives('se', '#7fb4d8') }),
  normalizePrefab({ key: '4c', id: 'derived_tri_prism_sw', name: 'Derived Tri Prism · SW · h√3/2', kind: 'derived_tri_prism', base: '#7fb4d8', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeDerivedQuarterTriCollisionVoxels('sw', '#7fb4d8'), primitives: makeDerivedQuarterTriPrimitives('sw', '#7fb4d8') }),
  normalizePrefab({ key: '4d', id: 'derived_tri_prism_nw', name: 'Derived Tri Prism · NW · h√3/2', kind: 'derived_tri_prism', base: '#7fb4d8', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeDerivedQuarterTriCollisionVoxels('nw', '#7fb4d8'), primitives: makeDerivedQuarterTriPrimitives('nw', '#7fb4d8') }),
  normalizePrefab({ key: '4e', id: 'derived_axis_unit_block', name: 'Derived Axis Unit · Adjacent 2 Tri Prisms', kind: 'derived_axis_unit', w: 2, d: 2, base: '#72c49b', renderUpdateMode: 'dynamic', voxels: makeDerivedAxisUnitCollisionVoxels('right', '#72c49b'), primitives: makeDerivedAxisUnitPrimitives('right', '#72c49b') }),
  normalizePrefab({ key: '3p', id: 'micro_tri_prism', name: 'Micro Tri Prism · Atomic', kind: 'micro_tri_prism', base: '#e39b4f', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeMicroTriPrismCollisionVoxels('#e39b4f'), primitives: makeMicroTriPrismPrimitives('#e39b4f') }),
  normalizePrefab({ key: '3q', id: 'compatible_axis_block', name: 'Compatible Axis Block · Atom-fit', kind: 'compatible_axis_block', base: '#5dbb8a', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }], voxels: makeCompatibleAxisBlockCollisionVoxels('#5dbb8a'), primitives: makeCompatibleAxisBlockPrimitives('#5dbb8a') }),
  normalizePrefab({ key: '3i', id: 'vertex_quad_tri_block', name: 'Vertex Block · 4 Tri Prisms', kind: 'tri_prism_compound', w: 2, d: 2, base: '#d59a62', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }, { x: 1, y: 0, localZ: 0 }, { x: 0, y: 1, localZ: 0 }, { x: 1, y: 1, localZ: 0 }], voxels: makeVertexQuadTriCollisionVoxels('#d59a62'), primitives: makeVertexQuadTriPrimitives('#d59a62') }),
  normalizePrefab({ key: '3j', id: 'vertex_square_tri_block', name: 'Vertex Square · Unified Tri Prism Block', kind: 'tri_prism_compound', w: 2, d: 2, base: '#d59a62', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }, { x: 1, y: 0, localZ: 0 }, { x: 0, y: 1, localZ: 0 }, { x: 1, y: 1, localZ: 0 }], voxels: makeVertexQuadTriCollisionVoxels('#d59a62'), primitives: makeVertexQuadTriPrimitives('#d59a62') }),
  normalizePrefab({ key: '3k', id: 'vertex_square_quarter_block', name: 'Vertex Square · Quarter Tri Block', kind: 'tri_prism_compound', w: 2, d: 2, base: '#d59a62', renderUpdateMode: 'dynamic', supportCells: [{ x: 0, y: 0, localZ: 0 }, { x: 1, y: 0, localZ: 0 }, { x: 0, y: 1, localZ: 0 }, { x: 1, y: 1, localZ: 0 }], voxels: makeVertexQuarterTriCollisionVoxels('#d59a62'), primitives: makeVertexQuarterTriPrimitives('#d59a62') }),
  normalizePrefab({ key: '2', id: 'bench_2x1', name: 'Bench', base: '#d4bb90', renderUpdateMode: 'static', voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] }),
  normalizePrefab({ key: '3', id: 'sofa_2x1', name: 'Sofa', base: '#9eb6dd', renderUpdateMode: 'static', voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] }),
  normalizePrefab({ key: '4', id: 'cabinet_1x1x2', name: 'Cabinet', base: '#a8c46d', renderUpdateMode: 'static', voxels: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }] }),
  normalizePrefab({ key: '4a', id: 'terrain_column_1x1x3', name: 'Terrain Column 1×1×3', base: '#79b35a', renderUpdateMode: 'static', voxels: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 2 }] }),
  normalizePrefab({ key: '4b', id: 'terrain_column_1x1x4', name: 'Terrain Column 1×1×4', base: '#79b35a', renderUpdateMode: 'static', voxels: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 2 }, { x: 0, y: 0, z: 3 }] }),
  normalizePrefab({ key: '4c', id: 'terrain_column_1x1x5', name: 'Terrain Column 1×1×5', base: '#79b35a', renderUpdateMode: 'static', voxels: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 2 }, { x: 0, y: 0, z: 3 }, { x: 0, y: 0, z: 4 }] }),
  normalizePrefab({ key: '4d', id: 'terrain_column_1x1x6', name: 'Terrain Column 1×1×6', base: '#79b35a', renderUpdateMode: 'static', voxels: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 2 }, { x: 0, y: 0, z: 3 }, { x: 0, y: 0, z: 4 }, { x: 0, y: 0, z: 5 }] }),
  normalizePrefab({ key: '5', id: 'stair_3step', name: 'Stair', base: '#c99568', renderUpdateMode: 'static', voxels: [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 1 },
    { x: 2, y: 0, z: 0 }, { x: 2, y: 0, z: 1 }, { x: 2, y: 0, z: 2 }
  ] }),
  normalizePrefab({ key: '6', id: 't_shape', name: 'T Shape', base: '#7fbf9a', renderUpdateMode: 'static', voxels: [
    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }
  ] }),
  normalizePrefab({ key: '7', id: 'table_2x1', name: 'Table', base: '#cfa670', renderUpdateMode: 'static', voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] })
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
  retainPrefabRuntimeSnapshot(found, { source: 'ensurePrefabRegistered' });
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
    retainPrefabRuntimeSnapshot(prototypes[existingIndex], { source: meta.source || 'registerPrefab:update-existing' });
    return prototypes[existingIndex];
  }
  prototypes.push(normalized);
  tracePrefabRegister(normalized.id, meta.source || 'registerPrefab', { builtIn: false, voxels: normalized.voxels.length, action: 'append-new' });
  prefabWrite('registerPrefab', { source: meta.source || 'unknown', prefabId: normalized.id, action: 'append-new', prototypeIndex: prototypes.length - 1, prototypeCount: prototypes.length });
  retainPrefabRuntimeSnapshot(prototypes[prototypes.length - 1], { source: meta.source || 'registerPrefab:append-new' });
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
  retainPrefabRuntimeSnapshot(prototypes[existingIndex], { source: meta.source || 'replacePrefabById' });
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

function getPrefabByIdExact(id) {
  var key = String(id || '').trim();
  if (!key) return null;
  var found = prototypes.find(function (p) { return p && String(p.id) === key; }) || null;
  if (found) {
    retainPrefabRuntimeSnapshot(found, { source: 'getPrefabByIdExact:registry-hit' });
    tracePrefabLookup(key, true, { name: found.name, custom: !!found.custom, voxels: Array.isArray(found.voxels) ? found.voxels.length : 0, exact: true });
    return found;
  }
  var retained = getPrefabRuntimeSnapshot(key);
  if (retained) {
    tracePrefabLookup(key, true, { name: retained.name, custom: !!retained.custom, voxels: Array.isArray(retained.voxels) ? retained.voxels.length : 0, exact: true, retainedSnapshot: true });
    return retained;
  }
  tracePrefabLookup(key, false, { fallbackId: null, exact: true });
  return null;
}

function getPrefabById(id) {
  var found = getPrefabByIdExact(id);
  if (found) return found;
  var fallback = prototypes[0] || null;
  tracePrefabLookup(id, false, { fallbackId: fallback ? fallback.id : null, exact: false });
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
  var primitives = facingApi && typeof facingApi.rotatePrimitiveList === 'function'
    ? facingApi.rotatePrimitiveList(prefab, r)
    : (Array.isArray(prefab.primitives) ? prefab.primitives.map(function (p) { return clonePrimitive(p); }) : []);
  var maxX = 0, maxY = 0, maxZ = 0;
  var bottomMap = new Map();
  for (var i = 0; i < voxels.length; i++) {
    var vv = voxels[i];
    var vx = finiteNumber(vv.x, 0);
    var vy = finiteNumber(vv.y, 0);
    var vz = finiteNumber(vv.z, 0);
    var vw = Math.max(0.001, finiteNumber(vv.w, 1));
    var vd = Math.max(0.001, finiteNumber(vv.d, 1));
    var vh = Math.max(0.001, finiteNumber(vv.h, 1));
    maxX = Math.max(maxX, vx + vw);
    maxY = Math.max(maxY, vy + vd);
    maxZ = Math.max(maxZ, vz + vh);
    var minCellX = Math.floor(vx + 1e-6);
    var maxCellX = Math.ceil(vx + vw - 1e-6);
    var minCellY = Math.floor(vy + 1e-6);
    var maxCellY = Math.ceil(vy + vd - 1e-6);
    for (var bx = minCellX; bx < maxCellX; bx++) {
      for (var by = minCellY; by < maxCellY; by++) {
        var key = bx + ',' + by;
        var prev = bottomMap.get(key);
        if (prev == null || vz < prev) bottomMap.set(key, vz);
      }
    }
  }
  var supportCells = Array.isArray(prefab.supportCells) && prefab.supportCells.length
    ? prefab.supportCells.map(function (cell) { return { x: finiteNumber(cell && cell.x, 0), y: finiteNumber(cell && cell.y, 0), localZ: finiteNumber(cell && cell.localZ, 0) }; })
    : Array.from(bottomMap.entries()).map(function (entry) {
        var xy = entry[0].split(',').map(Number);
        return { x: xy[0], y: xy[1], localZ: entry[1] };
      });
  var rotatedAnchor = facingApi && typeof facingApi.getRotatedAnchor === 'function'
    ? facingApi.getRotatedAnchor(prefab, r)
    : (prefab.anchor ? { x: Number(prefab.anchor.x) || 0, y: Number(prefab.anchor.y) || 0, z: Number(prefab.anchor.z) || 0 } : { x: 0, y: 0, z: 0 });
  var rotatedFootprint = facingApi && typeof facingApi.getRotatedFootprint === 'function'
    ? facingApi.getRotatedFootprint(prefab, r)
    : null;
  var facingPrototype = facingApi && typeof facingApi.buildFacingPrototype === 'function'
    ? facingApi.buildFacingPrototype(prefab, r, null)
    : null;
  var variant = Object.assign({}, prefab, {
    rotation: r,
    facing: r,
    voxels: voxels,
    primitives: primitives,
    w: Math.max(1, rotatedFootprint && Number(rotatedFootprint.w) || 0, maxX),
    d: Math.max(1, rotatedFootprint && Number(rotatedFootprint.d) || 0, maxY),
    h: Math.max(1, rotatedFootprint && Number(rotatedFootprint.h) || 0, maxZ),
    supportCells: supportCells,
    anchor: rotatedAnchor,
    itemFacingPrototype: facingPrototype
  });
  prefab._variantCache.set(r, variant);
  tracePrefabVariant(prefab.id, r, { voxels: voxels.length, primitives: primitives.length, w: variant.w, d: variant.d, h: variant.h, anchor: rotatedAnchor });
  return variant;
}

for (var __prefabSnapshotSeedIndex = 0; __prefabSnapshotSeedIndex < prototypes.length; __prefabSnapshotSeedIndex++) {
  retainPrefabRuntimeSnapshot(prototypes[__prefabSnapshotSeedIndex], { source: 'prefab-registry:initial-seed' });
}

var PREFAB_REGISTRY_API = {
  owner: PREFAB_REGISTRY_OWNER,
  normalizeRenderUpdateMode: normalizeRenderUpdateMode,
  getPrefabRenderUpdateMode: getPrefabRenderUpdateMode,
  normalizePrefab: normalizePrefab,
  ensurePrefabRegistered: ensurePrefabRegistered,
  registerPrefab: registerPrefab,
  replacePrefabById: replacePrefabById,
  setSelectedPrototypeIndex: setSelectedPrototypeIndex,
  setSelectedPrefabId: setSelectedPrefabId,
  refreshPrototypeSelection: refreshPrototypeSelection,
  getSelectedPrototypeIndex: getSelectedPrototypeIndex,
  summarize: summarizePrefabRegistry,
  getPrefabByIdExact: getPrefabByIdExact,
  getPrefabById: getPrefabById,
  retainPrefabRuntimeSnapshot: retainPrefabRuntimeSnapshot,
  getPrefabRuntimeSnapshot: getPrefabRuntimeSnapshot,
  prefabVariant: prefabVariant,
  normalizeLiquidWaterLayerCount: normalizeLiquidWaterLayerCount,
  liquidWaterLayerPrefabId: liquidWaterLayerPrefabId,
  makeLiquidWaterLayerPrefabDef: makeLiquidWaterLayerPrefabDef,
  ensureLiquidWaterLayerPrefabs: ensureLiquidWaterLayerPrefabs,
  normalizeTerrainHeightSurfaceLayerCount: normalizeTerrainHeightSurfaceLayerCount,
  terrainHeightSurfaceLayerPrefabId: terrainHeightSurfaceLayerPrefabId,
  makeTerrainHeightSurfaceLayerPrefabDef: makeTerrainHeightSurfaceLayerPrefabDef,
  ensureTerrainHeightSurfaceLayerPrefabs: ensureTerrainHeightSurfaceLayerPrefabs,
  getPrototypeCount: function () { return prototypes.length; },
  getBuiltInCount: function () { return prototypes.filter(function (p) { return !p.custom && !p.assetManaged && !p.externalManaged; }).length; },
  getPrototypes: function () { return prototypes; }
};
if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
  window.__APP_NAMESPACE.bind('state.prefabRegistry', PREFAB_REGISTRY_API, { owner: PREFAB_REGISTRY_OWNER, phase: 'P3-B' });
}
