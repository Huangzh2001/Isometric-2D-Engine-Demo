# v50 main editor committed semantic face rendering

## Modified files

- `src/core/domain/item-facing-core.js`
- `src/presentation/render/render.js`
- `tests/placed-instance-semantic-face-pipeline.test.js`
- `tests/placed-instance-semantic-face-evidence.test.js`
- `tests/generate_v50_committed_face_evidence.js`

## Directory tree (focused)

```
v42proj/
├── src/
│   ├── core/domain/item-facing-core.js
│   └── presentation/render/render.js
└── tests/
    ├── placed-instance-semantic-face-pipeline.test.js
    ├── placed-instance-semantic-face-evidence.test.js
    └── generate_v50_committed_face_evidence.js
```

## `src/core/domain/item-facing-core.js`

```js

(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/item-facing-core.js';
  var PHASE = 'P-ITEM-FACING-S1';
  var FACE_LABELS = ['N', 'E', 'S', 'W'];
  var SEMANTIC_FACE_COLORS = {
    top: '#2F80ED',
    north: '#E74C3C',
    east: '#27AE60',
    south: '#F2C94C',
    west: '#9B51E0'
  };

  var DEFAULT_SEMANTIC_TEXTURE_MAP = {
    top: { textureId: 'debug.semantic.top.solid-blue', kind: 'solid-color', color: SEMANTIC_FACE_COLORS.top, semanticFace: 'top' },
    north: { textureId: 'debug.semantic.north.solid-red', kind: 'solid-color', color: SEMANTIC_FACE_COLORS.north, semanticFace: 'north' },
    east: { textureId: 'debug.semantic.east.solid-green', kind: 'solid-color', color: SEMANTIC_FACE_COLORS.east, semanticFace: 'east' },
    south: { textureId: 'debug.semantic.south.solid-yellow', kind: 'solid-color', color: SEMANTIC_FACE_COLORS.south, semanticFace: 'south' },
    west: { textureId: 'debug.semantic.west.solid-purple', kind: 'solid-color', color: SEMANTIC_FACE_COLORS.west, semanticFace: 'west' }
  };

  function cloneTextureSpec(spec, semanticFace) {
    var fallback = DEFAULT_SEMANTIC_TEXTURE_MAP[semanticFace] || { textureId: 'debug.semantic.' + semanticFace, kind: 'solid-color', color: '#ffffff', semanticFace: semanticFace };
    var src = spec && typeof spec === 'object' ? spec : {};
    var color = src.color || src.fill || fallback.color;
    return {
      textureId: String(src.textureId || src.id || fallback.textureId),
      kind: String(src.kind || src.type || fallback.kind || 'solid-color'),
      color: color,
      semanticFace: semanticFace
    };
  }

  function buildSemanticTextureMapFromColors(colors) {
    var input = colors || {};
    var out = {};
    ['top', 'north', 'east', 'south', 'west'].forEach(function (key) {
      out[key] = cloneTextureSpec({
        textureId: 'debug.semantic.' + key + '.solid',
        kind: 'solid-color',
        color: input[key] || SEMANTIC_FACE_COLORS[key]
      }, key);
    });
    return out;
  }

  function getDefaultSemanticTextureMap() {
    return buildSemanticTextureMapFromColors(SEMANTIC_FACE_COLORS);
  }

  function getSemanticTextureMap(prefab) {
    var src = null;
    if (prefab && prefab.semanticTextureMap && typeof prefab.semanticTextureMap === 'object') src = prefab.semanticTextureMap;
    else if (prefab && prefab.semanticTextures && typeof prefab.semanticTextures === 'object') src = prefab.semanticTextures;
    var out = {};
    ['top', 'north', 'east', 'south', 'west'].forEach(function (key) {
      var directKey = key + 'Texture';
      var spec = (src && src[key]) || (prefab && prefab[directKey]) || null;
      if (!spec && prefab && prefab.semanticFaceColors && prefab.semanticFaceColors[key]) {
        spec = { textureId: 'debug.semantic.' + key + '.solid', kind: 'solid-color', color: prefab.semanticFaceColors[key] };
      }
      out[key] = cloneTextureSpec(spec, key);
    });
    return out;
  }

  function withLegacySemanticAliases(colors) {
    var out = Object.assign({}, colors || {});
    // Legacy aliases kept only for old inspector/test consumers. New prototype code
    // uses top/north/east/south/west.
    out.front = out.north;
    out.right = out.east;
    out.back = out.south;
    out.left = out.west;
    return out;
  }

  function toInt(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : Math.round(Number(fallback) || 0);
  }

  function normalizeFacing(value) {
    var n = toInt(value, 0);
    return ((n % 4) + 4) % 4;
  }

  function normalizeViewRotation(value) {
    return normalizeFacing(value);
  }

  function rotateFacing(value, delta) {
    return normalizeFacing(normalizeFacing(value) + toInt(delta, 0));
  }

  function getFacingLabel(value) {
    return FACE_LABELS[normalizeFacing(value)] || 'N';
  }

  function getSemanticFaceColors() {
    return withLegacySemanticAliases(SEMANTIC_FACE_COLORS);
  }

  function getBaseDimensions(prefab) {
    var safe = prefab || {};
    return {
      w: Math.max(1, toInt(safe.w, 1)),
      d: Math.max(1, toInt(safe.d, 1)),
      h: Math.max(1, toInt(safe.h, 1))
    };
  }

  function getFacingDirections(value) {
    switch (normalizeFacing(value)) {
      case 0: return { top: 'top', north: 'north', east: 'east', south: 'south', west: 'west', front: 'north', right: 'east', back: 'south', left: 'west' };
      case 1: return { top: 'top', north: 'east', east: 'south', south: 'west', west: 'north', front: 'east', right: 'south', back: 'west', left: 'north' };
      case 2: return { top: 'top', north: 'south', east: 'west', south: 'north', west: 'east', front: 'south', right: 'west', back: 'north', left: 'east' };
      case 3: return { top: 'top', north: 'west', east: 'north', south: 'east', west: 'south', front: 'west', right: 'north', back: 'east', left: 'south' };
      default: return { top: 'top', north: 'north', east: 'east', south: 'south', west: 'west', front: 'north', right: 'east', back: 'south', left: 'west' };
    }
  }

  function getAllSemanticFaceEntries(itemFacing, viewRotation) {
    var netFacing = normalizeFacing(normalizeFacing(itemFacing) - normalizeFacing(viewRotation));
    var dirs = getFacingDirections(netFacing);
    return [
      { semantic: 'top', screenFace: 'top', color: SEMANTIC_FACE_COLORS.top, textureId: DEFAULT_SEMANTIC_TEXTURE_MAP.top.textureId },
      { semantic: 'north', screenFace: dirs.north, color: SEMANTIC_FACE_COLORS.north, textureId: DEFAULT_SEMANTIC_TEXTURE_MAP.north.textureId },
      { semantic: 'east', screenFace: dirs.east, color: SEMANTIC_FACE_COLORS.east, textureId: DEFAULT_SEMANTIC_TEXTURE_MAP.east.textureId },
      { semantic: 'south', screenFace: dirs.south, color: SEMANTIC_FACE_COLORS.south, textureId: DEFAULT_SEMANTIC_TEXTURE_MAP.south.textureId },
      { semantic: 'west', screenFace: dirs.west, color: SEMANTIC_FACE_COLORS.west, textureId: DEFAULT_SEMANTIC_TEXTURE_MAP.west.textureId }
    ];
  }

  function getVisibleSemanticFaceMapping(input) {
    var itemFacing = (input && typeof input === 'object') ? input.itemFacing : input;
    var viewRotation = (input && typeof input === 'object') ? input.viewRotation : 0;
    var entries = getAllSemanticFaceEntries(itemFacing, viewRotation);
    var byScreen = {};
    entries.forEach(function (entry) { byScreen[entry.screenFace] = entry; });
    var sideA = byScreen.east || null;
    var sideB = byScreen.south || null;
    return {
      top: true,
      sideA: sideA ? sideA.semantic : null,
      sideB: sideB ? sideB.semantic : null,
      screenFaces: { top: 'top', east: sideA ? sideA.semantic : null, south: sideB ? sideB.semantic : null },
      visibleFaces: ['top'].concat(sideA ? [sideA.semantic] : []).concat(sideB ? [sideB.semantic] : []),
      entries: entries,
      renderedEntries: [
        { semantic: 'top', screenFace: 'top', color: SEMANTIC_FACE_COLORS.top },
        sideA ? { semantic: sideA.semantic, screenFace: 'east', color: SEMANTIC_FACE_COLORS[sideA.semantic], textureId: DEFAULT_SEMANTIC_TEXTURE_MAP[sideA.semantic].textureId } : null,
        sideB ? { semantic: sideB.semantic, screenFace: 'south', color: SEMANTIC_FACE_COLORS[sideB.semantic], textureId: DEFAULT_SEMANTIC_TEXTURE_MAP[sideB.semantic].textureId } : null
      ].filter(Boolean),
      colors: withLegacySemanticAliases(SEMANTIC_FACE_COLORS),
      itemFacing: normalizeFacing(itemFacing),
      viewRotation: normalizeViewRotation(viewRotation)
    };
  }

  function getVisibleSemanticFaces(value) {
    if (value && typeof value === 'object') return getVisibleSemanticFaceMapping(value);
    return getAllSemanticFaceEntries(value, 0);
  }

  function faceWorldPoints(cell, screenFace) {
    var x = toInt(cell && cell.x, 0);
    var y = toInt(cell && cell.y, 0);
    var z = toInt(cell && cell.z, 0);
    if (screenFace === 'top') return [
      { x: x, y: y, z: z + 1 }, { x: x + 1, y: y, z: z + 1 }, { x: x + 1, y: y + 1, z: z + 1 }, { x: x, y: y + 1, z: z + 1 }
    ];
    if (screenFace === 'east') return [
      { x: x + 1, y: y, z: z }, { x: x + 1, y: y + 1, z: z }, { x: x + 1, y: y + 1, z: z + 1 }, { x: x + 1, y: y, z: z + 1 }
    ];
    if (screenFace === 'south') return [
      { x: x, y: y + 1, z: z }, { x: x + 1, y: y + 1, z: z }, { x: x + 1, y: y + 1, z: z + 1 }, { x: x, y: y + 1, z: z + 1 }
    ];
    if (screenFace === 'north') return [
      { x: x, y: y, z: z + 1 }, { x: x + 1, y: y, z: z + 1 }, { x: x + 1, y: y, z: z }, { x: x, y: y, z: z }
    ];
    if (screenFace === 'west') return [
      { x: x, y: y, z: z + 1 }, { x: x, y: y + 1, z: z + 1 }, { x: x, y: y + 1, z: z }, { x: x, y: y, z: z }
    ];
    return [];
  }

  function buildDebugCuboidFaceRenderables(args) {
    args = args || {};
    var prefab = args.prefab || null;
    var cells = Array.isArray(args.cells) ? args.cells : [];
    var itemFacing = normalizeFacing(args.itemFacing);
    var viewRotation = normalizeViewRotation(args.viewRotation);
    var ownerId = String(args.ownerId || 'preview');
    var mapping = getVisibleSemanticFaceMapping({ itemFacing: itemFacing, viewRotation: viewRotation });
    var semanticTextureMap = getSemanticTextureMap(prefab || {});
    var localOcc = {};
    var occupiedSet = args.occupiedSet || null;
    cells.forEach(function (c) { localOcc[toInt(c.x, 0) + ',' + toInt(c.y, 0) + ',' + toInt(c.z, 0)] = true; });
    function keyOf(x, y, z) { return toInt(x,0) + ',' + toInt(y,0) + ',' + toInt(z,0); }
    function hasOccupied(x, y, z) {
      var key = keyOf(x, y, z);
      if (localOcc[key]) return true;
      if (!occupiedSet) return false;
      if (occupiedSet instanceof Map) return occupiedSet.has(key);
      if (occupiedSet instanceof Set) return occupiedSet.has(key);
      return !!occupiedSet[key];
    }
    var facePrio = { east: 1, south: 2, top: 3, north: 0, west: 0 };
    var out = [];
    cells.forEach(function (raw, idx) {
      var cell = { x: toInt(raw.x, 0), y: toInt(raw.y, 0), z: toInt(raw.z, 0) };
      var candidates = [
        { screenFace: 'east', semanticFace: mapping.screenFaces.east, hidden: hasOccupied(cell.x + 1, cell.y, cell.z) },
        { screenFace: 'south', semanticFace: mapping.screenFaces.south, hidden: hasOccupied(cell.x, cell.y + 1, cell.z) },
        { screenFace: 'top', semanticFace: 'top', hidden: hasOccupied(cell.x, cell.y, cell.z + 1) }
      ];
      candidates.forEach(function (entry) {
        if (entry.hidden || !entry.semanticFace) return;
        var depthKey = ((cell.x + cell.y) * 1000) + (cell.z * 100) + (facePrio[entry.screenFace] || 0) + (idx * 0.001);
        var texture = semanticTextureMap[entry.semanticFace] || cloneTextureSpec(null, entry.semanticFace);
        var polygon = faceWorldPoints(cell, entry.screenFace);
        out.push({
          faceId: ownerId + ':' + cell.x + ',' + cell.y + ',' + cell.z + ':' + entry.screenFace + ':' + entry.semanticFace,
          itemId: ownerId,
          previewId: ownerId,
          prefabId: prefab && prefab.id || null,
          semanticFace: entry.semanticFace,
          screenFace: entry.screenFace,
          textureId: texture.textureId,
          texture: texture,
          color: texture.color,
          polygon: polygon,
          worldPts: polygon,
          cell: cell,
          depthKey: depthKey,
          itemFacing: itemFacing,
          viewRotation: viewRotation,
          facePriority: facePrio[entry.screenFace] || 0
        });
      });
    });
    out.sort(function (a, b) {
      if (Math.abs(a.depthKey - b.depthKey) > 1e-9) return a.depthKey - b.depthKey;
      return String(a.faceId).localeCompare(String(b.faceId));
    });
    return {
      prefabId: prefab && prefab.id || null,
      itemFacing: itemFacing,
      viewRotation: viewRotation,
      visibleSemanticFaces: mapping,
      semanticTextureMap: semanticTextureMap,
      faceRenderables: out,
      faceDrawOrder: out.map(function (f) { return f.faceId; })
    };
  }

  function getRotatedFootprint(prefab, facing) {
    var dims = getBaseDimensions(prefab);
    var r = normalizeFacing(facing);
    return {
      w: (r % 2 === 0) ? dims.w : dims.d,
      d: (r % 2 === 0) ? dims.d : dims.w,
      h: dims.h
    };
  }

  function getBaseAnchor(prefab) {
    var anchor = prefab && prefab.anchor ? prefab.anchor : null;
    return {
      x: toInt(anchor && anchor.x, 0),
      y: toInt(anchor && anchor.y, 0),
      z: toInt(anchor && anchor.z, 0)
    };
  }

  function getRotatedAnchor(prefab, facing) {
    var anchor = getBaseAnchor(prefab);
    var dims = getBaseDimensions(prefab);
    switch (normalizeFacing(facing)) {
      case 0: return { x: anchor.x, y: anchor.y, z: anchor.z };
      case 1: return { x: anchor.y, y: Math.max(0, dims.w - 1 - anchor.x), z: anchor.z };
      case 2: return { x: Math.max(0, dims.w - 1 - anchor.x), y: Math.max(0, dims.d - 1 - anchor.y), z: anchor.z };
      case 3: return { x: Math.max(0, dims.d - 1 - anchor.y), y: anchor.x, z: anchor.z };
      default: return { x: anchor.x, y: anchor.y, z: anchor.z };
    }
  }

  function rotateVoxel(v, prefab, facing) {
    var x = toInt(v && v.x, 0);
    var y = toInt(v && v.y, 0);
    var z = toInt(v && v.z, 0);
    var dims = getBaseDimensions(prefab);
    switch (normalizeFacing(facing)) {
      case 0: return { x: x, y: y, z: z };
      case 1: return { x: y, y: Math.max(0, dims.w - 1 - x), z: z };
      case 2: return { x: Math.max(0, dims.w - 1 - x), y: Math.max(0, dims.d - 1 - y), z: z };
      case 3: return { x: Math.max(0, dims.d - 1 - y), y: x, z: z };
      default: return { x: x, y: y, z: z };
    }
  }

  function rotateVoxelList(prefab, facing) {
    var list = Array.isArray(prefab && prefab.voxels) ? prefab.voxels : [];
    return list.map(function (v) {
      var rotated = rotateVoxel(v, prefab, facing);
      return Object.assign({}, v, rotated);
    });
  }

  function getAvailableDirectionKeys(prefab) {
    var source = null;
    if (prefab && prefab.spriteDirections) source = prefab.spriteDirections;
    else if (prefab && prefab.habboLayerDirections) source = prefab.habboLayerDirections;
    if (!source || typeof source !== 'object') return ['0'];
    var keys = Object.keys(source).map(function (key) { return String(key); });
    return keys.length ? keys : ['0'];
  }

  function detectSpriteStrategy(prefab) {
    var keys = getAvailableDirectionKeys(prefab)
      .map(function (key) { return normalizeFacing(parseInt(key, 10)); })
      .filter(function (value, index, arr) { return arr.indexOf(value) === index; })
      .sort(function (a, b) { return a - b; });
    if (keys.length >= 4) return { strategy: 'four', keys: keys };
    if (keys.length === 2) return { strategy: 'two-mirror', keys: keys };
    return { strategy: 'single', keys: keys.length ? keys : [0] };
  }

  function resolveSpriteFacing(prefab, facing) {
    var analysis = detectSpriteStrategy(prefab);
    var r = normalizeFacing(facing);
    if (analysis.strategy === 'four') {
      return {
        strategy: 'four',
        directionKey: String(r),
        mirrorX: false,
        availableKeys: analysis.keys.slice()
      };
    }
    if (analysis.strategy === 'two-mirror') {
      var lowKey = analysis.keys[0];
      var highKey = analysis.keys[1];
      if (r === 0) return { strategy: 'two-mirror', directionKey: String(lowKey), mirrorX: false, availableKeys: analysis.keys.slice() };
      if (r === 1) return { strategy: 'two-mirror', directionKey: String(highKey), mirrorX: false, availableKeys: analysis.keys.slice() };
      if (r === 2) return { strategy: 'two-mirror', directionKey: String(lowKey), mirrorX: true, availableKeys: analysis.keys.slice() };
      return { strategy: 'two-mirror', directionKey: String(highKey), mirrorX: true, availableKeys: analysis.keys.slice() };
    }
    return {
      strategy: 'single',
      directionKey: String((analysis.keys && analysis.keys.length ? analysis.keys[0] : 0)),
      mirrorX: false,
      availableKeys: analysis.keys.slice()
    };
  }

  function computeSortBase(prefab, facing, instance) {
    var anchor = getRotatedAnchor(prefab, facing);
    var inst = instance || {};
    var sortKey = (Number(inst.x) || 0) + (Number(inst.y) || 0) + anchor.x + anchor.y + 0.0005;
    var tie = 300000 + (((Number(inst.z) || 0) + anchor.z) * 1000);
    return {
      sortKey: sortKey,
      tie: tie,
      rotatedAnchor: anchor
    };
  }

  function buildFacingPrototype(prefab, facing, instance) {
    var normalizedFacing = normalizeFacing(facing);
    var footprint = getRotatedFootprint(prefab, normalizedFacing);
    var anchor = getRotatedAnchor(prefab, normalizedFacing);
    var sprite = resolveSpriteFacing(prefab, normalizedFacing);
    var sortBase = computeSortBase(prefab, normalizedFacing, instance || null);
    return {
      facing: normalizedFacing,
      facingLabel: getFacingLabel(normalizedFacing),
      footprint: footprint,
      baseAnchor: getBaseAnchor(prefab),
      rotatedAnchor: anchor,
      semanticDirections: getFacingDirections(normalizedFacing),
      semanticColors: getSemanticFaceColors(),
      semanticTextureMap: getSemanticTextureMap(prefab || {}),
      visibleSemanticFaces: getVisibleSemanticFaces(normalizedFacing),
      spriteStrategy: sprite.strategy,
      spriteDirectionKey: sprite.directionKey,
      spriteMirrorX: sprite.mirrorX,
      availableDirectionKeys: sprite.availableKeys.slice(),
      sortBase: sortBase
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    normalizeFacing: normalizeFacing,
    normalizeViewRotation: normalizeViewRotation,
    rotateFacing: rotateFacing,
    getFacingLabel: getFacingLabel,
    getSemanticFaceColors: getSemanticFaceColors,
    getDefaultSemanticTextureMap: getDefaultSemanticTextureMap,
    getSemanticTextureMap: getSemanticTextureMap,
    buildSemanticTextureMapFromColors: buildSemanticTextureMapFromColors,
    getSemanticFaceDirections: getFacingDirections,
    getVisibleSemanticFaces: getVisibleSemanticFaces,
    getVisibleSemanticFaceMapping: getVisibleSemanticFaceMapping,
    buildDebugCuboidFaceRenderables: buildDebugCuboidFaceRenderables,
    getRotatedFootprint: getRotatedFootprint,
    getBaseAnchor: getBaseAnchor,
    getRotatedAnchor: getRotatedAnchor,
    rotateVoxel: rotateVoxel,
    rotateVoxelList: rotateVoxelList,
    detectSpriteStrategy: detectSpriteStrategy,
    resolveSpriteFacing: resolveSpriteFacing,
    computeSortBase: computeSortBase,
    buildFacingPrototype: buildFacingPrototype
  };

  window.__ITEM_FACING_CORE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('domain.itemFacingCore', api, { owner: OWNER, phase: PHASE });
  }
})();


```

## `src/presentation/render/render.js`

```js

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
      sortMode: getSpriteProxySortMode(prefab)
    });
  }
  var facingApi = getItemFacingCoreApi();
  var sortBase = facingApi && typeof facingApi.computeSortBase === 'function'
    ? facingApi.computeSortBase(prefab, instance && instance.rotation != null ? instance.rotation : 0, instance)
    : null;
  var baseSortLine = sortBase ? Number(sortBase.sortKey || 0) : (instance.x + instance.y + 0.0005);
  var baseTie = sortBase ? Number(sortBase.tie || 0) : (300000 + (instance.z || 0) * 1000);
  return { sortKey: baseSortLine, tie: baseTie, occlusion: occlusion, sortBase: sortBase };
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

  const allVisibleBoxes = boxes.filter(function (b) { return prefabDrawsVoxels(getPrefabById(b.prefabId)); });
  const occ = buildOccupancy(allVisibleBoxes);
  const visibleBoxes = allVisibleBoxes.filter(function (b) {
    var prefab = getPrefabById(b.prefabId);
    return !isFiveFaceDebugPrefab(prefab);
  });
  const renderables = [];
  for (const cell of visibleBoxes) renderables.push(buildStaticVoxelRenderable({ x: cell.x, y: cell.y, z: cell.z, box: cell, base: cell.base }, occ));
  renderables.sort(compareRenderablesByDomain);
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

function getEditorPreviewFacingValue() {
  return (((editor && typeof editor.previewFacing === 'number' ? editor.previewFacing : 0) % 4) + 4) % 4;
}

function normalizeMainEditorViewRotationValue(value) {
  var n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return ((Math.round(n) % 4) + 4) % 4;
}

function getSafeMainEditorViewRotation(snapshot) {
  var candidates = [];
  if (snapshot && snapshot.runtime) {
    candidates.push({ source: 'snapshot.runtime.viewRotation', value: snapshot.runtime.viewRotation });
  }
  if (snapshot && snapshot.view) {
    candidates.push({ source: 'snapshot.view.rotation', value: snapshot.view.rotation });
  }
  if (snapshot && snapshot.editor) {
    candidates.push({ source: 'snapshot.editor.viewRotation', value: snapshot.editor.viewRotation });
  }
  for (var i = 0; i < candidates.length; i++) {
    if (Number.isInteger(candidates[i].value)) {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(candidates[i].value),
        fallbackUsed: false,
        source: candidates[i].source
      };
    }
  }
  return {
    hasViewRotation: false,
    viewRotation: 0,
    fallbackUsed: true,
    source: 'main-editor-view-rotation-not-yet-formalized'
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

function getTextureFill(texture, fallback) {
  if (!texture) return fallback || '#fff';
  if (texture.kind === 'solid-color' || texture.type === 'solid-color') return texture.color || texture.fill || fallback || '#fff';
  return texture.color || texture.fill || fallback || '#fff';
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

function buildFiveFaceEntries(proto, prefab) {
  if (!proto) return [];
  var semantic = proto.semanticDirections || {};
  var colors = Object.assign({}, proto.semanticColors || {}, (prefab && prefab.semanticFaceColors) || {});
  var sourceFaces = proto.visibleSemanticFaces && proto.visibleSemanticFaces.length ? proto.visibleSemanticFaces : [
    { semantic: 'top', screenFace: 'top', color: colors.top },
    { semantic: 'north', screenFace: semantic.north || 'north', color: colors.north },
    { semantic: 'east', screenFace: semantic.east || 'east', color: colors.east },
    { semantic: 'south', screenFace: semantic.south || 'south', color: colors.south },
    { semantic: 'west', screenFace: semantic.west || 'west', color: colors.west }
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
  var domainCore = getDomainSceneCoreApi();
  var faceTiePrio = { east: 1, south: 2, top: 3, north: 0, west: 0 };
  var renderables = renderData.faceRenderables.map(function (face) {
    var key = String(face.cell && face.cell.x || 0) + ',' + String(face.cell && face.cell.y || 0) + ',' + String(face.cell && face.cell.z || 0);
    var box = boxByKey[key] || null;
    var orderMeta = domainCore && typeof domainCore.computeVoxelRenderableSort === 'function'
      ? domainCore.computeVoxelRenderableSort({ cell: face.cell || { x: 0, y: 0, z: 0 }, box: box })
      : { sortKey: (face.cell && ((face.cell.x || 0) + (face.cell.y || 0) + 1)) || 0, tie: ((face.cell && face.cell.z) || 0) * 100000 + ((face.cell && face.cell.y) || 0) * 100 + ((face.cell && face.cell.x) || 0) };
    return {
      id: 'debug-face-' + String(face.faceId || key),
      kind: 'debug-cuboid-face',
      sortKey: Number(orderMeta.sortKey || 0),
      tie: Number(orderMeta.tie || 0) + ((faceTiePrio[face.screenFace] || 0) * 0.01),
      semanticFace: face.semanticFace,
      textureId: face.textureId,
      depthKey: face.depthKey,
      draw: function () { drawDebugFaceRenderable(face, 1, true); }
    };
  });
  var logKey = [instance.instanceId, facing, viewRotation, instBoxes.length].join('|');
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
    prefabId: prefab && prefab.id || null,
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
  rebuildStaticBoxRenderCacheIfNeeded();
  const staticRenderables = staticBoxRenderCache.renderables || [];
  const dynamicRenderables = [];
  const visibleOcc = buildOccupancy(boxes.filter(function (b) { return prefabDrawsVoxels(getPrefabById(b.prefabId)); }));
  const occupiedKeySet = createOccupiedKeySetFromOccupancy(visibleOcc);
  const viewRotationInfo = getSafeMainEditorViewRotation(null);

  for (const inst of instances) {
    const prefab = getPrefabById(inst.prefabId);
    if (prefab && isFiveFaceDebugPrefab(prefab) && prefabDrawsVoxels(prefab)) {
      const placedFaces = buildPlacedDebugInstanceFaceRenderables(inst, prefab, occupiedKeySet, viewRotationInfo);
      for (const item of placedFaces) dynamicRenderables.push(item);
    } else if (prefab && prefab.kind === 'habbo_import' && prefabDrawsVoxels(prefab)) {
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
      var playerSortMeta = (getDomainSceneCoreApi() && typeof getDomainSceneCoreApi().computePlayerSliceRenderableSort === 'function')
        ? getDomainSceneCoreApi().computePlayerSliceRenderableSort({ slice: s, player: player })
        : { sortKey: playerLine, tie: 500000 + s.z * 1000 };
      dynamicRenderables.push({
        id: s.id,
        kind: 'player-slice',
        sortKey: playerSortMeta.sortKey,
        tie: playerSortMeta.tie,
        draw: () => drawPlayerSlice(s),
      });
    }
  }

  dynamicRenderables.sort(compareRenderablesByDomain);

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
  debugState.renderStep = 'floor';
  drawFloor();
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
  renderBaseWorldPasses();
  const order = buildMainFrameRenderables();
  drawMainFrameRenderables(order);
  drawMainFrameOverlays();
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
  var order = buildMainFrameRenderables();
  return {
    order: order,
    counts: {
      renderables: order.length,
      instances: instances.length,
      boxes: boxes.length,
      lights: lights.length
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


```

## `tests/placed-instance-semantic-face-pipeline.test.js`

```js

const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
assert(renderSource.includes('buildPlacedDebugInstanceFaceRenderables'), 'render.js should build placed debug instance face renderables');
assert(renderSource.includes("mode: 'placed-instance-real-face-renderables'"), 'placed instance render path should log real face rendering mode');
assert(renderSource.includes('renderedAsRealFaces: true'), 'placed instance render path should record real face rendering');
assert(renderSource.includes('renderedAsOverlay: false'), 'placed instance render path should prove overlay is not used');
assert(renderSource.includes('boxBaseUsedForDebugFaces: false'), 'placed instance render path should prove base color is not used');
assert(renderSource.includes('const placedFaces = buildPlacedDebugInstanceFaceRenderables(inst, prefab, occupiedKeySet, viewRotationInfo);'), 'buildRenderables should route debug prefabs through placed face renderables');
assert(renderSource.includes('return !isFiveFaceDebugPrefab(prefab);'), 'static voxel cache should exclude debug prefabs from monochrome static path');
console.log('placed-instance-semantic-face-pipeline.test.js: OK');


```

## `tests/placed-instance-semantic-face-evidence.test.js`

```js

const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function runFile(context, relPath) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8'), context, { filename: relPath });
}
const bindings = {};
const context = { window: { __APP_NAMESPACE: { bind(path, api) { bindings[path] = api; } } }, console, Math, Number, String, Object, Array, JSON, Set, Map };
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
runFile(context, 'src/core/state/prefab-registry.js');
const api = bindings['domain.itemFacingCore'] || context.window.__ITEM_FACING_CORE__;
const registry = bindings['state.prefabRegistry'];
assert(api && typeof api.buildDebugCuboidFaceRenderables === 'function', 'facing core should expose buildDebugCuboidFaceRenderables');
assert(registry && typeof registry.getPrefabById === 'function', 'prefab registry should expose getPrefabById');
const cube = registry.getPrefabById('debug_cube_5faces');
const rect = registry.getPrefabById('debug_rect_2x1_5faces');
const cubeRes = api.buildDebugCuboidFaceRenderables({ prefab: cube, itemFacing: 1, viewRotation: 0, ownerId: 'instance:test-cube', cells: [{ x: 4, y: 4, z: 0 }], occupiedSet: new Set(['4,4,0']) });
const rectRes = api.buildDebugCuboidFaceRenderables({ prefab: rect, itemFacing: 1, viewRotation: 0, ownerId: 'instance:test-rect', cells: [{ x: 1, y: 1, z: 0 }, { x: 1, y: 2, z: 0 }], occupiedSet: new Set(['1,1,0','1,2,0']) });
assert(cubeRes.faceRenderables.length >= 3, 'placed cube should produce top + two visible sides');
assert(rectRes.faceRenderables.length >= 5, 'placed rect should produce multi-voxel face renderables');
assert(cubeRes.faceRenderables.every(f => f.textureId && f.semanticFace && Array.isArray(f.worldPts)), 'cube face renderables should carry textureId / semanticFace / worldPts');
assert(rectRes.faceRenderables.every(f => f.textureId && f.semanticFace && Array.isArray(f.worldPts)), 'rect face renderables should carry textureId / semanticFace / worldPts');
const cubeSem = new Set(cubeRes.faceRenderables.map(f => f.semanticFace));
assert(cubeSem.has('top'), 'placed cube should render top semantic face');
assert(cubeSem.size >= 3, 'placed cube should render top + two semantic side faces');
console.log('placed-instance-semantic-face-evidence.test.js: OK');


```

## `tests/generate_v50_committed_face_evidence.js`

```js

const fs = require('fs');
const path = require('path');
const vm = require('vm');
function runFile(context, relPath) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8'), context, { filename: relPath });
}
const bindings = {};
const context = { window: { __APP_NAMESPACE: { bind(path, api) { bindings[path] = api; } } }, console, Math, Number, String, Object, Array, JSON, Set, Map };
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
runFile(context, 'src/core/state/prefab-registry.js');
const api = bindings['domain.itemFacingCore'] || context.window.__ITEM_FACING_CORE__;
const registry = bindings['state.prefabRegistry'];
function sample(prefabId, facing, cells) {
  const prefab = registry.getPrefabById(prefabId);
  const occupiedSet = new Set(cells.map(c => `${c.x},${c.y},${c.z}`));
  const res = api.buildDebugCuboidFaceRenderables({
    prefab,
    itemFacing: facing,
    viewRotation: 0,
    ownerId: 'instance:' + prefabId,
    cells,
    occupiedSet
  });
  return {
    prefabId,
    facing,
    visibleSemanticFaces: res.visibleSemanticFaces.visibleFaces,
    renderedFaces: res.faceRenderables.map(f => ({
      faceId: f.faceId,
      semanticFace: f.semanticFace,
      screenFace: f.screenFace,
      textureId: f.textureId,
      color: f.color,
      depthKey: f.depthKey,
      polygon: f.worldPts
    })),
    faceDrawOrder: res.faceDrawOrder,
    topTexture: res.semanticTextureMap.top,
    northTexture: res.semanticTextureMap.north,
    eastTexture: res.semanticTextureMap.east,
    southTexture: res.semanticTextureMap.south,
    westTexture: res.semanticTextureMap.west,
    renderedAsRealFaces: true,
    renderedAsOverlay: false,
    helperLayerUsed: false,
    boxBaseUsedForDebugFaces: false
  };
}
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
const evidence = {
  schema: 'main-editor-placed-semantic-face-evidence/v50',
  cubeFacing0: sample('debug_cube_5faces', 0, [{ x: 4, y: 4, z: 0 }]),
  cubeFacing1: sample('debug_cube_5faces', 1, [{ x: 4, y: 4, z: 0 }]),
  rectFacing0: sample('debug_rect_2x1_5faces', 0, [{ x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }]),
  rectFacing1: sample('debug_rect_2x1_5faces', 1, [{ x: 1, y: 1, z: 0 }, { x: 1, y: 2, z: 0 }]),
  sourceContracts: {
    placedFaceBuilderExists: renderSource.includes('buildPlacedDebugInstanceFaceRenderables'),
    staticCacheExcludesDebugPrefabs: renderSource.includes('return !isFiveFaceDebugPrefab(prefab);'),
    placedModeLogExists: renderSource.includes("mode: 'placed-instance-real-face-renderables'"),
    overlayDisabled: renderSource.includes('renderedAsOverlay: false') && renderSource.includes('helperLayerUsed: false')
  }
};
const out = path.join('/mnt/data', 'v50_committed_face_evidence.json');
fs.writeFileSync(out, JSON.stringify(evidence, null, 2));
console.log('wrote ' + out);


```
