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

  var SCREEN_FACE_POSITIONS = Object.freeze({ top: 'top', lowerLeft: 'lowerLeft', lowerRight: 'lowerRight' });

  var SINGLE_VOXEL_SCREEN_TRUTH = Object.freeze({
    0: Object.freeze({ top: 'top', lowerLeft: 'south', lowerRight: 'east' }),
    1: Object.freeze({ top: 'top', lowerLeft: 'west', lowerRight: 'south' }),
    2: Object.freeze({ top: 'top', lowerLeft: 'north', lowerRight: 'west' }),
    3: Object.freeze({ top: 'top', lowerLeft: 'east', lowerRight: 'north' })
  });

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


  function hasExplicitSemanticTextures(prefab) {
    var safe = prefab || {};
    return !!(
      (safe.semanticTextureMap && typeof safe.semanticTextureMap === 'object' && Object.keys(safe.semanticTextureMap).length) ||
      (safe.semanticTextures && typeof safe.semanticTextures === 'object' && Object.keys(safe.semanticTextures).length) ||
      (safe.semanticFaceColors && typeof safe.semanticFaceColors === 'object' && Object.keys(safe.semanticFaceColors).length) ||
      safe.itemRotationDebug
    );
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

  function getCanonicalSingleVoxelTruth(viewRotation) {
    return SINGLE_VOXEL_SCREEN_TRUTH[normalizeViewRotation(viewRotation)] || SINGLE_VOXEL_SCREEN_TRUTH[0];
  }

  function getSemanticFaceNeighborDelta(semanticFace) {
    switch (String(semanticFace || '').toLowerCase()) {
      case 'east': return { x: 1, y: 0, z: 0 };
      case 'south': return { x: 0, y: 1, z: 0 };
      case 'west': return { x: -1, y: 0, z: 0 };
      case 'north': return { x: 0, y: -1, z: 0 };
      case 'top': return { x: 0, y: 0, z: 1 };
      default: return { x: 0, y: 0, z: 0 };
    }
  }

  function computeVisibleSemanticFaceMapping(input) {
    var itemFacing = (input && typeof input === 'object') ? input.itemFacing : input;
    var viewRotation = (input && typeof input === 'object') ? input.viewRotation : 0;
    var normalizedFacing = normalizeFacing(itemFacing);
    var normalizedViewRotation = normalizeViewRotation(viewRotation);
    var effectiveFacing = normalizeFacing(normalizedFacing - normalizedViewRotation);
    var entries = getAllSemanticFaceEntries(normalizedFacing, normalizedViewRotation);
    var byScreen = {};
    var bySemantic = {};
    entries.forEach(function (entry) {
      byScreen[entry.screenFace] = entry;
      bySemantic[entry.semantic] = entry;
    });
    var lowerRightEntry = byScreen.east || null;
    var lowerLeftEntry = byScreen.south || null;
    var visibleFaces = ['top'];
    if (lowerLeftEntry && visibleFaces.indexOf(lowerLeftEntry.semantic) < 0) visibleFaces.push(lowerLeftEntry.semantic);
    if (lowerRightEntry && visibleFaces.indexOf(lowerRightEntry.semantic) < 0) visibleFaces.push(lowerRightEntry.semantic);
    var visibleFacesByScreenPosition = {
      top: 'top',
      lowerLeft: lowerLeftEntry ? lowerLeftEntry.semantic : null,
      lowerRight: lowerRightEntry ? lowerRightEntry.semantic : null
    };
    return {
      top: true,
      lowerLeft: visibleFacesByScreenPosition.lowerLeft,
      lowerRight: visibleFacesByScreenPosition.lowerRight,
      itemFacing: normalizedFacing,
      viewRotation: normalizedViewRotation,
      effectiveFacing: effectiveFacing,
      screenFaces: visibleFacesByScreenPosition,
      visibleFacesByScreenPosition: visibleFacesByScreenPosition,
      semanticToScreen: {
        top: 'top',
        north: bySemantic.north ? (bySemantic.north.screenFace === 'south' ? 'lowerLeft' : (bySemantic.north.screenFace === 'east' ? 'lowerRight' : bySemantic.north.screenFace)) : null,
        east: bySemantic.east ? (bySemantic.east.screenFace === 'south' ? 'lowerLeft' : (bySemantic.east.screenFace === 'east' ? 'lowerRight' : bySemantic.east.screenFace)) : null,
        south: bySemantic.south ? (bySemantic.south.screenFace === 'south' ? 'lowerLeft' : (bySemantic.south.screenFace === 'east' ? 'lowerRight' : bySemantic.south.screenFace)) : null,
        west: bySemantic.west ? (bySemantic.west.screenFace === 'south' ? 'lowerLeft' : (bySemantic.west.screenFace === 'east' ? 'lowerRight' : bySemantic.west.screenFace)) : null
      },
      visibleFaces: visibleFaces,
      visibleFacesBySemantic: visibleFaces.slice(),
      entries: entries,
      renderedEntries: [
        { semantic: 'top', screenFace: 'top', color: SEMANTIC_FACE_COLORS.top, textureId: DEFAULT_SEMANTIC_TEXTURE_MAP.top.textureId },
        lowerLeftEntry ? { semantic: lowerLeftEntry.semantic, screenFace: 'lowerLeft', color: SEMANTIC_FACE_COLORS[lowerLeftEntry.semantic], textureId: DEFAULT_SEMANTIC_TEXTURE_MAP[lowerLeftEntry.semantic].textureId } : null,
        lowerRightEntry ? { semantic: lowerRightEntry.semantic, screenFace: 'lowerRight', color: SEMANTIC_FACE_COLORS[lowerRightEntry.semantic], textureId: DEFAULT_SEMANTIC_TEXTURE_MAP[lowerRightEntry.semantic].textureId } : null
      ].filter(Boolean),
      canonicalTruth: getCanonicalSingleVoxelTruth(normalizedViewRotation),
      colors: withLegacySemanticAliases(SEMANTIC_FACE_COLORS)
    };
  }

  function getVisibleSemanticFaceMapping(input) {
    return computeVisibleSemanticFaceMapping(input);
  }

  function resolveVisibleSemanticFaces(input) {
    return computeVisibleSemanticFaceMapping(input);
  }

  function getVisibleSemanticFaces(value) {
    if (value && typeof value === 'object') {
      var mapping = computeVisibleSemanticFaceMapping(value);
      return (mapping.renderedEntries || []).map(function (entry) {
        return {
          semantic: entry.semantic,
          screenFace: entry.screenFace,
          color: entry.color,
          textureId: entry.textureId
        };
      });
    }
    return getAllSemanticFaceEntries(value, 0);
  }

  function resolveSemanticTextureBinding(input) {
    var opts = input && typeof input === 'object' ? input : {};
    var mapping = computeVisibleSemanticFaceMapping({ itemFacing: opts.itemFacing, viewRotation: opts.viewRotation });
    var semanticTextureMap = getSemanticTextureMap(opts.prefab || {});
    var screenFaceToSemanticFace = {
      top: 'top',
      lowerLeft: mapping && mapping.screenFaces ? (mapping.screenFaces.lowerLeft || null) : null,
      lowerRight: mapping && mapping.screenFaces ? (mapping.screenFaces.lowerRight || null) : null
    };
    var screenFaceToTextureSlot = {
      top: semanticTextureMap.top || null,
      lowerLeft: screenFaceToSemanticFace.lowerLeft ? (semanticTextureMap[screenFaceToSemanticFace.lowerLeft] || null) : null,
      lowerRight: screenFaceToSemanticFace.lowerRight ? (semanticTextureMap[screenFaceToSemanticFace.lowerRight] || null) : null
    };
    return {
      itemFacing: mapping.itemFacing,
      viewRotation: mapping.viewRotation,
      effectiveFacing: mapping.effectiveFacing,
      visibleFaces: Array.isArray(mapping.visibleFaces) ? mapping.visibleFaces.slice() : [],
      mapping: mapping,
      semanticTextureMap: semanticTextureMap,
      screenFaceToSemanticFace: screenFaceToSemanticFace,
      semanticFaceToTextureSlot: {
        top: semanticTextureMap.top || null,
        north: semanticTextureMap.north || null,
        east: semanticTextureMap.east || null,
        south: semanticTextureMap.south || null,
        west: semanticTextureMap.west || null
      },
      screenFaceToTextureSlot: screenFaceToTextureSlot
    };
  }

  function faceWorldPoints(cell, semanticFace) {
    var x = toInt(cell && cell.x, 0);
    var y = toInt(cell && cell.y, 0);
    var z = toInt(cell && cell.z, 0);
    if (semanticFace === 'top') return [
      { x: x, y: y, z: z + 1 }, { x: x + 1, y: y, z: z + 1 }, { x: x + 1, y: y + 1, z: z + 1 }, { x: x, y: y + 1, z: z + 1 }
    ];
    if (semanticFace === 'east') return [
      { x: x + 1, y: y, z: z }, { x: x + 1, y: y + 1, z: z }, { x: x + 1, y: y + 1, z: z + 1 }, { x: x + 1, y: y, z: z + 1 }
    ];
    if (semanticFace === 'south') return [
      { x: x, y: y + 1, z: z }, { x: x + 1, y: y + 1, z: z }, { x: x + 1, y: y + 1, z: z + 1 }, { x: x, y: y + 1, z: z + 1 }
    ];
    if (semanticFace === 'north') return [
      { x: x, y: y, z: z + 1 }, { x: x + 1, y: y, z: z + 1 }, { x: x + 1, y: y, z: z }, { x: x, y: y, z: z }
    ];
    if (semanticFace === 'west') return [
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
    var binding = resolveSemanticTextureBinding({ prefab: prefab || {}, itemFacing: itemFacing, viewRotation: viewRotation });
    var mapping = binding.mapping;
    var semanticTextureMap = binding.semanticTextureMap;
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
    var facePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
    var out = [];
    cells.forEach(function (raw, idx) {
      var cell = { x: toInt(raw.x, 0), y: toInt(raw.y, 0), z: toInt(raw.z, 0) };
      var candidates = [
        { screenFace: 'lowerRight', semanticFace: mapping.screenFaces.lowerRight },
        { screenFace: 'lowerLeft', semanticFace: mapping.screenFaces.lowerLeft },
        { screenFace: 'top', semanticFace: 'top' }
      ];
      candidates.forEach(function (entry) {
        if (!entry.semanticFace) return;
        var delta = getSemanticFaceNeighborDelta(entry.semanticFace);
        var hidden = hasOccupied(cell.x + delta.x, cell.y + delta.y, cell.z + delta.z);
        if (hidden) return;
        var depthKey = ((cell.x + cell.y) * 1000) + (cell.z * 100) + (facePrio[entry.screenFace] || 0) + (idx * 0.001);
        var texture = binding.screenFaceToTextureSlot[entry.screenFace] || semanticTextureMap[entry.semanticFace] || cloneTextureSpec(null, entry.semanticFace);
        var polygon = faceWorldPoints(cell, entry.semanticFace);
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
          facePriority: facePrio[entry.screenFace] || 0,
          polygonTemplateId: 'semantic-face-' + String(entry.semanticFace),
          polygonSource: 'semantic-face-world-plane',
          reusedFromOldEastSouthTemplate: false
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
    hasExplicitSemanticTextures: hasExplicitSemanticTextures,
    getSemanticTextureMap: getSemanticTextureMap,
    buildSemanticTextureMapFromColors: buildSemanticTextureMapFromColors,
    getSemanticFaceDirections: getFacingDirections,
    getVisibleSemanticFaces: getVisibleSemanticFaces,
    resolveVisibleSemanticFaces: resolveVisibleSemanticFaces,
    getVisibleSemanticFaceMapping: getVisibleSemanticFaceMapping,
    SCREEN_FACE_POSITIONS: SCREEN_FACE_POSITIONS,
    SINGLE_VOXEL_SCREEN_TRUTH: SINGLE_VOXEL_SCREEN_TRUTH,
    getCanonicalSingleVoxelTruth: getCanonicalSingleVoxelTruth,
    resolveSemanticTextureBinding: resolveSemanticTextureBinding,
    getSemanticFaceNeighborDelta: getSemanticFaceNeighborDelta,
    getSemanticFaceWorldPoints: faceWorldPoints,
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
