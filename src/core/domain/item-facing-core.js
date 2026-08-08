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

  // Convert a persistent world-facing into the face visible from the current
  // editor camera. Placement/footprint code must keep using worldFacing;
  // sprite selection uses this relative facing.
  function resolveViewRelativeFacing(worldFacing, viewRotation) {
    return normalizeFacing(normalizeFacing(worldFacing) - normalizeViewRotation(viewRotation));
  }

  function getFacingLabel(value) {
    return FACE_LABELS[normalizeFacing(value)] || 'N';
  }

  function getSemanticFaceColors() {
    return withLegacySemanticAliases(SEMANTIC_FACE_COLORS);
  }

  function toFiniteNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function getRawAnchor(prefab) {
    var anchor = prefab && prefab.anchor ? prefab.anchor : null;
    return {
      x: toFiniteNumber(anchor && anchor.x, 0),
      y: toFiniteNumber(anchor && anchor.y, 0),
      z: toFiniteNumber(anchor && anchor.z, 0)
    };
  }

  function getRelativeVoxelAlignment(prefab) {
    if (!prefab || typeof prefab !== 'object') return null;
    // A runtime local frame and authored sprite/voxel registration are
    // complementary. Do not discard the registration merely because the
    // prefab has already been compiled into a local frame.
    if (prefab.sprite && prefab.sprite.relativeVoxelAlignment) return prefab.sprite.relativeVoxelAlignment;
    var dirs = prefab.spriteDirections;
    if (dirs && typeof dirs === 'object') {
      var keys = Object.keys(dirs);
      for (var i = 0; i < keys.length; i++) {
        var cfg = dirs[keys[i]];
        if (cfg && cfg.relativeVoxelAlignment) return cfg.relativeVoxelAlignment;
      }
    }
    return null;
  }

  // Runtime geometry is expressed in a prefab-local frame.
  //
  // IMPORTANT FOR UNIFIED HZH ASSETS:
  // The voxel editor already has a real authored registration point:
  // prefab/state.anchor.  Voxel coordinates are meaningful *relative to that
  // anchor*.  They must not be normalized back to the occupied bounding-box
  // minimum, because doing so destroys intentionally offset voxel geometry.
  // The old translation-invariant metadata is useful for calibration/learning
  // but is not the runtime placement origin.
  function getPrefabLocalFrame(prefab) {
    var safe = prefab || {};
    if (safe.localFrame && safe.localFrame.origin && safe.localFrame.bounds && safe.localFrame.anchor) {
      var fastAnchor = {
        x: toFiniteNumber(safe.localFrame.anchor.x, 0),
        y: toFiniteNumber(safe.localFrame.anchor.y, 0),
        z: toFiniteNumber(safe.localFrame.anchor.z, 0)
      };
      var fastRotationSpace = String(safe.localFrame.rotationSpace || '');
      var fastIsEditorAnchorCorner = fastRotationSpace === 'editor-anchor-corner';
      var fastPivot = safe.localFrame.pivot && typeof safe.localFrame.pivot === 'object'
        ? {
            x: toFiniteNumber(safe.localFrame.pivot.x, fastAnchor.x + (fastIsEditorAnchorCorner ? 0 : 0.5)),
            y: toFiniteNumber(safe.localFrame.pivot.y, fastAnchor.y + (fastIsEditorAnchorCorner ? 0 : 0.5)),
            z: toFiniteNumber(safe.localFrame.pivot.z, fastAnchor.z)
          }
        : {
            x: fastAnchor.x + (fastIsEditorAnchorCorner ? 0 : 0.5),
            y: fastAnchor.y + (fastIsEditorAnchorCorner ? 0 : 0.5),
            z: fastAnchor.z
          };
      return {
        version: String(safe.localFrame.version || 'prefab-local-frame-v1'),
        origin: {
          x: toFiniteNumber(safe.localFrame.origin.x, 0),
          y: toFiniteNumber(safe.localFrame.origin.y, 0),
          z: toFiniteNumber(safe.localFrame.origin.z, 0)
        },
        bounds: {
          w: Math.max(0.001, toFiniteNumber(safe.localFrame.bounds.w, 1)),
          d: Math.max(0.001, toFiniteNumber(safe.localFrame.bounds.d, 1)),
          h: Math.max(0.001, toFiniteNumber(safe.localFrame.bounds.h, 1))
        },
        anchor: fastAnchor,
        pivot: fastPivot,
        rotationSpace: fastRotationSpace || 'legacy-bounds'
      };
    }

    var voxels = Array.isArray(safe.voxels) ? safe.voxels : [];
    var minX = Infinity, minY = Infinity, minZ = Infinity;
    var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (var i = 0; i < voxels.length; i++) {
      var v = voxels[i] || {};
      var x = toFiniteNumber(v.x, 0), y = toFiniteNumber(v.y, 0), z = toFiniteNumber(v.z, 0);
      var w = Math.max(0.001, toFiniteNumber(v.w, 1));
      var d = Math.max(0.001, toFiniteNumber(v.d, 1));
      var h = Math.max(0.001, toFiniteNumber(v.h, 1));
      minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + d); maxZ = Math.max(maxZ, z + h);
    }

    var alignment = getRelativeVoxelAlignment(safe);
    var rawAnchor = getRawAnchor(safe);
    var hasUnifiedAuthoredRegistration = !!(
      alignment ||
      safe.hzhUnifiedRuntime === true ||
      safe.useLegacyHabboRuntime === false ||
      safe.materialStates ||
      safe.artworkStateBundle ||
      safe.voxelStateBundle
    );

    // Unified assets use the authored anchor itself as local origin.  This is
    // exactly the coordinate reference used by the voxel editor's iso(anchor)
    // overlay.  Do not substitute occupied minX/minY here.
    var originX = hasUnifiedAuthoredRegistration
      ? rawAnchor.x
      : (Number.isFinite(minX) ? minX : 0);
    var originY = hasUnifiedAuthoredRegistration
      ? rawAnchor.y
      : (Number.isFinite(minY) ? minY : 0);
    var originZ = hasUnifiedAuthoredRegistration
      ? rawAnchor.z
      : (Number.isFinite(minZ) ? minZ : 0);

    var inferredW = Number.isFinite(maxX) ? Math.max(0.001, maxX - originX) : Math.max(1, toFiniteNumber(safe.w, 1));
    var inferredD = Number.isFinite(maxY) ? Math.max(0.001, maxY - originY) : Math.max(1, toFiniteNumber(safe.d, 1));
    var inferredH = Number.isFinite(maxZ) ? Math.max(0.001, maxZ - originZ) : Math.max(1, toFiniteNumber(safe.h, 1));
    var boundsW = alignment && alignment.localBounds && Number.isFinite(Number(alignment.localBounds.w))
      ? Math.max(0.001, Number(alignment.localBounds.w)) : inferredW;
    var boundsD = alignment && alignment.localBounds && Number.isFinite(Number(alignment.localBounds.d))
      ? Math.max(0.001, Number(alignment.localBounds.d)) : inferredD;

    // Legacy prefabs without editor registration metadata may intentionally use
    // explicit w/d/h larger than their occupied voxels.
    if (!alignment) {
      boundsW = Math.max(boundsW, toFiniteNumber(safe.w, boundsW));
      boundsD = Math.max(boundsD, toFiniteNumber(safe.d, boundsD));
      inferredH = Math.max(inferredH, toFiniteNumber(safe.h, inferredH));
    }

    var localAnchor = { x: rawAnchor.x - originX, y: rawAnchor.y - originY, z: rawAnchor.z - originZ };

    return {
      version: hasUnifiedAuthoredRegistration ? 'prefab-anchor-local-frame-v3' : 'prefab-local-frame-v1',
      origin: { x: originX, y: originY, z: originZ },
      bounds: { w: Math.max(0.001, boundsW), d: Math.max(0.001, boundsD), h: Math.max(0.001, inferredH) },
      anchor: localAnchor,
      pivot: hasUnifiedAuthoredRegistration
        ? { x: localAnchor.x, y: localAnchor.y, z: localAnchor.z }
        : { x: localAnchor.x + 0.5, y: localAnchor.y + 0.5, z: localAnchor.z },
      rotationSpace: hasUnifiedAuthoredRegistration ? 'editor-anchor-corner' : 'legacy-bounds'
    };
  }

  function getBaseDimensions(prefab) {
    var frame = getPrefabLocalFrame(prefab);
    return {
      w: Math.max(0.001, toFiniteNumber(frame && frame.bounds && frame.bounds.w, 1)),
      d: Math.max(0.001, toFiniteNumber(frame && frame.bounds && frame.bounds.d, 1)),
      h: Math.max(0.001, toFiniteNumber(frame && frame.bounds && frame.bounds.h, 1))
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
    var frame = getPrefabLocalFrame(prefab);
    var anchor = frame && frame.anchor ? frame.anchor : { x: 0, y: 0, z: 0 };
    return {
      x: toFiniteNumber(anchor.x, 0),
      y: toFiniteNumber(anchor.y, 0),
      z: toFiniteNumber(anchor.z, 0)
    };
  }

  function usesAnchorRelativeRotation(prefab) {
    var frame = getPrefabLocalFrame(prefab);
    var mode = frame ? String(frame.rotationSpace || '') : '';
    return mode === 'anchor-cell-center' || mode === 'editor-anchor-corner';
  }

  function usesEditorAnchorCornerRotation(prefab) {
    var frame = getPrefabLocalFrame(prefab);
    return !!(frame && String(frame.rotationSpace || '') === 'editor-anchor-corner');
  }

  function getAnchorRotationPivot(prefab) {
    var frame = getPrefabLocalFrame(prefab);
    var anchor = frame && frame.anchor ? frame.anchor : { x: 0, y: 0, z: 0 };
    var editorAnchorCorner = usesEditorAnchorCornerRotation(prefab);
    if (frame && frame.pivot) {
      return {
        x: toFiniteNumber(frame.pivot.x, toFiniteNumber(anchor.x, 0) + (editorAnchorCorner ? 0 : 0.5)),
        y: toFiniteNumber(frame.pivot.y, toFiniteNumber(anchor.y, 0) + (editorAnchorCorner ? 0 : 0.5)),
        z: toFiniteNumber(frame.pivot.z, toFiniteNumber(anchor.z, 0))
      };
    }
    if (editorAnchorCorner) {
      return {
        x: toFiniteNumber(anchor.x, 0),
        y: toFiniteNumber(anchor.y, 0),
        z: toFiniteNumber(anchor.z, 0)
      };
    }
    // anchor denotes the authored positioning cell; the physical rotation
    // pivot is that cell's centre. This keeps a 1x1 voxel in the same cell and
    // lets offset voxels rotate around the exact point used by the artwork.
    return {
      x: toFiniteNumber(anchor.x, 0) + 0.5,
      y: toFiniteNumber(anchor.y, 0) + 0.5,
      z: toFiniteNumber(anchor.z, 0)
    };
  }

  function rotatePointAroundAnchorPivot(x, y, prefab, facing) {
    var pivot = getAnchorRotationPivot(prefab);
    var dx = toFiniteNumber(x, 0) - pivot.x;
    var dy = toFiniteNumber(y, 0) - pivot.y;
    var editorAnchorCorner = usesEditorAnchorCornerRotation(prefab);
    switch (normalizeFacing(facing)) {
      // These two mappings intentionally differ from the legacy room-item
      // rotation. They are the exact relative transforms used by the voxel
      // editor's viewPoint():
      //   f1: (dx,dy) -> (-dy,+dx)
      //   f3: (dx,dy) -> (+dy,-dx)
      case 1: return editorAnchorCorner
        ? { x: pivot.x - dy, y: pivot.y + dx }
        : { x: pivot.x + dy, y: pivot.y - dx };
      case 2: return { x: pivot.x - dx, y: pivot.y - dy };
      case 3: return editorAnchorCorner
        ? { x: pivot.x + dy, y: pivot.y - dx }
        : { x: pivot.x - dy, y: pivot.y + dx };
      default: return { x: toFiniteNumber(x, 0), y: toFiniteNumber(y, 0) };
    }
  }

  function rotateBoxAroundAnchorPivot(x, y, w, d, prefab, facing) {
    var p0 = rotatePointAroundAnchorPivot(x, y, prefab, facing);
    var p1 = rotatePointAroundAnchorPivot(x + w, y, prefab, facing);
    var p2 = rotatePointAroundAnchorPivot(x, y + d, prefab, facing);
    var p3 = rotatePointAroundAnchorPivot(x + w, y + d, prefab, facing);
    var xs = [p0.x, p1.x, p2.x, p3.x];
    var ys = [p0.y, p1.y, p2.y, p3.y];
    var minX = Math.min.apply(Math, xs), maxX = Math.max.apply(Math, xs);
    var minY = Math.min.apply(Math, ys), maxY = Math.max.apply(Math, ys);
    return { x: minX, y: minY, w: Math.max(0.001, maxX - minX), d: Math.max(0.001, maxY - minY) };
  }

  function getRotatedAnchor(prefab, facing) {
    var anchor = getBaseAnchor(prefab);
    if (usesAnchorRelativeRotation(prefab)) {
      // The authored positioning cell is the rotation pivot and therefore does
      // not walk around the voxel bounding rectangle when the item rotates.
      return { x: anchor.x, y: anchor.y, z: anchor.z };
    }
    var dims = getBaseDimensions(prefab);
    switch (normalizeFacing(facing)) {
      case 0: return { x: anchor.x, y: anchor.y, z: anchor.z };
      case 1: return { x: anchor.y, y: dims.w - 1 - anchor.x, z: anchor.z };
      case 2: return { x: dims.w - 1 - anchor.x, y: dims.d - 1 - anchor.y, z: anchor.z };
      case 3: return { x: dims.d - 1 - anchor.y, y: anchor.x, z: anchor.z };
      default: return { x: anchor.x, y: anchor.y, z: anchor.z };
    }
  }

  function normalizeCardinalDirection(value) {
    var dir = String(value || '').trim().toLowerCase();
    if (dir === 'east' || dir === 'south' || dir === 'west' || dir === 'north') return dir;
    return 'east';
  }

  function cardinalDirectionFromVector(dx, dy) {
    var ax = Math.abs(Number(dx) || 0);
    var ay = Math.abs(Number(dy) || 0);
    if (ax >= ay) return (Number(dx) || 0) >= 0 ? 'east' : 'west';
    return (Number(dy) || 0) >= 0 ? 'south' : 'north';
  }

  function rotateCardinalDirection(value, facing, prefab) {
    var dir = normalizeCardinalDirection(value);
    var r = normalizeFacing(facing);
    var vectors = {
      east: { dx: 1, dy: 0 },
      south: { dx: 0, dy: 1 },
      west: { dx: -1, dy: 0 },
      north: { dx: 0, dy: -1 }
    };
    var vector = vectors[dir] || vectors.east;
    var dx = vector.dx;
    var dy = vector.dy;
    var editorAnchorCorner = usesEditorAnchorCornerRotation(prefab);
    if (r === 1) return editorAnchorCorner
      ? cardinalDirectionFromVector(-dy, dx)
      : cardinalDirectionFromVector(dy, -dx);
    if (r === 2) return cardinalDirectionFromVector(-dx, -dy);
    if (r === 3) return editorAnchorCorner
      ? cardinalDirectionFromVector(dy, -dx)
      : cardinalDirectionFromVector(-dy, dx);
    return dir;
  }

  function rotateVoxel(v, prefab, facing) {
    var frame = getPrefabLocalFrame(prefab);
    var x = toFiniteNumber(v && v.x, 0) - toFiniteNumber(frame && frame.origin && frame.origin.x, 0);
    var y = toFiniteNumber(v && v.y, 0) - toFiniteNumber(frame && frame.origin && frame.origin.y, 0);
    var z = toFiniteNumber(v && v.z, 0) - toFiniteNumber(frame && frame.origin && frame.origin.z, 0);
    var w = Math.max(0.001, toFiniteNumber(v && v.w, 1));
    var d = Math.max(0.001, toFiniteNumber(v && v.d, 1));
    var h = Math.max(0.001, toFiniteNumber(v && v.h, 1));
    var r = normalizeFacing(facing);
    var base;
    if (usesAnchorRelativeRotation(prefab)) {
      var rotatedBox = rotateBoxAroundAnchorPivot(x, y, w, d, prefab, r);
      base = { x: rotatedBox.x, y: rotatedBox.y, z: z, w: rotatedBox.w, d: rotatedBox.d, h: h };
    } else {
      var dims = getBaseDimensions(prefab);
      switch (r) {
        case 0: base = { x: x, y: y, z: z, w: w, d: d, h: h }; break;
        case 1: base = { x: y, y: dims.w - x - w, z: z, w: d, d: w, h: h }; break;
        case 2: base = { x: dims.w - x - w, y: dims.d - y - d, z: z, w: w, d: d, h: h }; break;
        case 3: base = { x: dims.d - y - d, y: x, z: z, w: d, d: w, h: h }; break;
        default: base = { x: x, y: y, z: z, w: w, d: d, h: h }; break;
      }
    }
    if (Array.isArray(v && v.collisionPolygon2d)) {
      base.collisionPolygon2d = v.collisionPolygon2d.map(function (pt) { return rotatePrimitivePoint(pt, prefab, r); });
    }
    if (v && v.slopeDirection != null) {
      base.slopeDirection = rotateCardinalDirection(v.slopeDirection, r, prefab);
    }
    return base;
  }

  function rotateVoxelList(prefab, facing) {
    var list = Array.isArray(prefab && prefab.voxels) ? prefab.voxels : [];
    return list.map(function (v) {
      var rotated = rotateVoxel(v, prefab, facing);
      return Object.assign({}, v, rotated);
    });
  }
  function rotatePrimitivePoint(pt, prefab, facing) {
    var frame = getPrefabLocalFrame(prefab);
    var x = toFiniteNumber(pt && pt.x, 0) - toFiniteNumber(frame && frame.origin && frame.origin.x, 0);
    var y = toFiniteNumber(pt && pt.y, 0) - toFiniteNumber(frame && frame.origin && frame.origin.y, 0);
    if (usesAnchorRelativeRotation(prefab)) return rotatePointAroundAnchorPivot(x, y, prefab, facing);
    var dims = getBaseDimensions(prefab);
    switch (normalizeFacing(facing)) {
      case 0: return { x: x, y: y };
      case 1: return { x: y, y: dims.w - x };
      case 2: return { x: dims.w - x, y: dims.d - y };
      case 3: return { x: dims.d - y, y: x };
      default: return { x: x, y: y };
    }
  }

  function rotatePrimitiveSortCell(cell, prefab, facing) {
    var frame = getPrefabLocalFrame(prefab);
    var x = toFiniteNumber(cell && cell.x, 0) - toFiniteNumber(frame && frame.origin && frame.origin.x, 0);
    var y = toFiniteNumber(cell && cell.y, 0) - toFiniteNumber(frame && frame.origin && frame.origin.y, 0);
    var z = toFiniteNumber(cell && cell.z, 0) - toFiniteNumber(frame && frame.origin && frame.origin.z, 0);
    if (usesAnchorRelativeRotation(prefab)) {
      var p = rotatePointAroundAnchorPivot(x + 0.5, y + 0.5, prefab, facing);
      return { x: p.x - 0.5, y: p.y - 0.5, z: z };
    }
    var dims = getBaseDimensions(prefab);
    switch (normalizeFacing(facing)) {
      case 0: return { x: x, y: y, z: z };
      case 1: return { x: y, y: dims.w - 1 - x, z: z };
      case 2: return { x: dims.w - 1 - x, y: dims.d - 1 - y, z: z };
      case 3: return { x: dims.d - 1 - y, y: x, z: z };
      default: return { x: x, y: y, z: z };
    }
  }

  function rotatePrimitive(p, prefab, facing) {
    var safe = p && typeof p === 'object' ? p : {};
    var vertices = Array.isArray(safe.vertices2d) ? safe.vertices2d : [];
    return Object.assign({}, safe, {
      vertices2d: vertices.map(function (pt) { return rotatePrimitivePoint(pt, prefab, facing); }),
      sortCell: rotatePrimitiveSortCell(safe.sortCell || { x: safe.cellX || 0, y: safe.cellY || 0, z: safe.cellZ || 0 }, prefab, facing),
      z: toFiniteNumber(safe.z, 0),
      h: Math.max(0.001, toFiniteNumber(safe.h, 1))
    });
  }

  function rotatePrimitiveList(prefab, facing) {
    var list = Array.isArray(prefab && prefab.primitives) ? prefab.primitives : [];
    return list.map(function (p) { return rotatePrimitive(p, prefab, facing); });
  }


  function getAvailableDirectionKeys(prefab) {
    var source = null;
    if (prefab && prefab.spriteDirections) source = prefab.spriteDirections;
    else if (prefab && prefab.habboLayerDirections) source = prefab.habboLayerDirections;
    if (!source || typeof source !== 'object') return ['0'];
    var keys = Object.keys(source).map(function (key) { return String(key); });
    return keys.length ? keys : ['0'];
  }

  function normalizeHabboSourceDirections(values) {
    var list = Array.isArray(values) ? values : [];
    return list.map(function (value) { return toInt(value, 0); })
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
        if (score < bestScore) {
          bestScore = score;
          best = [dirs[i], dirs[j]];
        }
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
    for (var j = 0; j < dirs.length && out.length < 4; j++) {
      if (out.indexOf(dirs[j]) < 0) out.push(dirs[j]);
    }
    return out.slice(0, 4);
  }

  function buildHabboFacingPlan(sourceDirections) {
    var source = normalizeHabboSourceDirections(sourceDirections);
    if (!source.length) source = [0];
    var selected;
    var strategy;
    if (source.length >= 4) {
      selected = chooseHabboFourDirections(source);
      strategy = 'four-native';
    } else if (source.length >= 2) {
      selected = chooseHabboOrthogonalPair(source);
      strategy = 'two-mirror';
    } else {
      selected = [source[0]];
      strategy = 'single-mirror';
    }
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

  function normalizeSpriteStrategyName(value) {
    var name = String(value || '').toLowerCase();
    if (name === 'four' || name === 'four-native') return 'four';
    if (name === 'two' || name === 'two-mirror') return 'two-mirror';
    if (name === 'single-mirror') return 'single-mirror';
    return name === 'single' ? 'single' : '';
  }

  function getExplicitHabboDirectionMap(prefab) {
    var meta = prefab && prefab.habboMeta ? prefab.habboMeta : null;
    var map = meta && Array.isArray(meta.directionMap) ? meta.directionMap : null;
    if (!map || !map.length) return null;
    return map.map(function (entry) {
      return {
        gameFacing: normalizeFacing(entry && entry.gameFacing),
        directionKey: String(entry && entry.directionKey != null ? entry.directionKey : '0'),
        sourceDirection: toInt(entry && entry.sourceDirection, 0),
        mirrorX: !!(entry && entry.mirrorX),
        sourceKind: String(entry && entry.sourceKind || '')
      };
    });
  }

  function detectSpriteStrategy(prefab) {
    var rawKeys = getAvailableDirectionKeys(prefab);
    var keys = rawKeys.map(function (key) { return normalizeFacing(parseInt(key, 10)); })
      .filter(function (value, index, arr) { return arr.indexOf(value) === index; })
      .sort(function (a, b) { return a - b; });
    var meta = prefab && prefab.habboMeta ? prefab.habboMeta : null;
    var explicit = normalizeSpriteStrategyName(meta && meta.generatedFacingStrategy);
    var explicitMap = getExplicitHabboDirectionMap(prefab);
    if (explicitMap && explicitMap.length) {
      return { strategy: explicit || (keys.length >= 4 ? 'four' : (keys.length >= 2 ? 'two-mirror' : 'single-mirror')), keys: keys.length ? keys : [0], directionMap: explicitMap };
    }
    var sourceDirectionCount = meta && Number(meta.sourceDirectionCount || (Array.isArray(meta.sourceVisualDirections) ? meta.sourceVisualDirections.length : 0) || (Array.isArray(meta.visualDirections) ? meta.visualDirections.length : 0));
    if (prefab && prefab.kind === 'habbo_import' && sourceDirectionCount === 1) return { strategy: 'single-mirror', keys: keys.length ? keys : [0], directionMap: null };
    if (explicit) return { strategy: explicit, keys: keys.length ? keys : [0], directionMap: null };
    if (keys.length >= 4) return { strategy: 'four', keys: keys };
    if (keys.length === 2) return { strategy: 'two-mirror', keys: keys };
    if (prefab && prefab.kind === 'habbo_import') return { strategy: 'single-mirror', keys: keys.length ? keys : [0] };
    return { strategy: 'single', keys: keys.length ? keys : [0] };
  }

  function resolveSpriteFacing(prefab, facing) {
    var analysis = detectSpriteStrategy(prefab);
    var r = normalizeFacing(facing);
    if (analysis.directionMap && analysis.directionMap.length) {
      var mapped = analysis.directionMap.filter(function (entry) { return normalizeFacing(entry.gameFacing) === r; })[0] || analysis.directionMap[0];
      var mappedKey = String(mapped.directionKey);
      var availableRawKeys = getAvailableDirectionKeys(prefab);
      if (availableRawKeys.indexOf(mappedKey) < 0) mappedKey = availableRawKeys[0] || '0';
      return {
        strategy: analysis.strategy,
        directionKey: mappedKey,
        mirrorX: !!mapped.mirrorX,
        sourceDirection: mapped.sourceDirection,
        sourceKind: mapped.sourceKind || '',
        gameFacing: r,
        availableKeys: availableRawKeys.slice()
      };
    }
    if (analysis.strategy === 'four') {
      var fourKey = analysis.keys.indexOf(r) >= 0 ? r : analysis.keys[r % analysis.keys.length];
      return { strategy: 'four', directionKey: String(fourKey), mirrorX: false, sourceDirection: null, sourceKind: 'native', gameFacing: r, availableKeys: analysis.keys.slice() };
    }
    if (analysis.strategy === 'two-mirror') {
      var lowKey = analysis.keys[0];
      var highKey = analysis.keys[1] == null ? analysis.keys[0] : analysis.keys[1];
      if (r === 0) return { strategy: 'two-mirror', directionKey: String(lowKey), mirrorX: false, sourceDirection: null, sourceKind: 'native', gameFacing: r, availableKeys: analysis.keys.slice() };
      if (r === 1) return { strategy: 'two-mirror', directionKey: String(highKey), mirrorX: false, sourceDirection: null, sourceKind: 'native', gameFacing: r, availableKeys: analysis.keys.slice() };
      if (r === 2) return { strategy: 'two-mirror', directionKey: String(lowKey), mirrorX: true, sourceDirection: null, sourceKind: 'generated-mirror', gameFacing: r, availableKeys: analysis.keys.slice() };
      return { strategy: 'two-mirror', directionKey: String(highKey), mirrorX: true, sourceDirection: null, sourceKind: 'generated-mirror', gameFacing: r, availableKeys: analysis.keys.slice() };
    }
    var singleKey = String((analysis.keys && analysis.keys.length ? analysis.keys[0] : 0));
    var singleMirror = analysis.strategy === 'single-mirror' && (r % 2 === 1);
    return {
      strategy: analysis.strategy,
      directionKey: singleKey,
      mirrorX: singleMirror,
      sourceDirection: null,
      sourceKind: singleMirror ? 'generated-mirror' : (r === 2 && analysis.strategy === 'single-mirror' ? 'reused-native' : 'native'),
      gameFacing: r,
      availableKeys: analysis.keys.slice()
    };
  }

  function buildSpriteFacingMatrix(prefab) {
    return [0, 1, 2, 3].map(function (facing) { return resolveSpriteFacing(prefab, facing); });
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
    resolveViewRelativeFacing: resolveViewRelativeFacing,
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
    getPrefabLocalFrame: getPrefabLocalFrame,
    getRotatedFootprint: getRotatedFootprint,
    getBaseAnchor: getBaseAnchor,
    getRotatedAnchor: getRotatedAnchor,
    rotateCardinalDirection: rotateCardinalDirection,
    rotateVoxel: rotateVoxel,
    rotateVoxelList: rotateVoxelList,
    rotatePrimitiveList: rotatePrimitiveList,
    buildHabboFacingPlan: buildHabboFacingPlan,
    buildSpriteFacingMatrix: buildSpriteFacingMatrix,
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
