(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/terrain-face-merge-core.js';
  var PHASE = 'TERRAIN-FACE-MERGE-V6-SIDE-STEP-BREAK';

  function safeInt(value, fallback) {
    var n = Math.round(Number(value));
    return Number.isFinite(n) ? n : Math.round(Number(fallback) || 0);
  }

  function buildCellKey(u, v) {
    return String(safeInt(u, 0)) + ',' + String(safeInt(v, 0));
  }

  function pickBestMember(members) {
    var list = Array.isArray(members) ? members : [];
    var seed = list.length ? list[0] : null;
    if (!seed) return { seed: null, sortKey: 0, tie: 0, cell: null };
    var bestSortKey = Number(seed.sortKey || 0);
    var bestTie = Number(seed.tie || 0);
    var bestCell = seed.cell || seed.box || null;
    for (var i = 0; i < list.length; i++) {
      var member = list[i] || {};
      var sortKey = Number(member.sortKey || 0);
      var tie = Number(member.tie || 0);
      if (sortKey > bestSortKey || (Math.abs(sortKey - bestSortKey) < 1e-6 && tie >= bestTie)) {
        bestSortKey = sortKey;
        bestTie = tie;
        bestCell = member.cell || member.box || bestCell;
      }
    }
    return { seed: seed, sortKey: bestSortKey, tie: bestTie, cell: bestCell };
  }

  function buildMergedDescriptorFromStrip(strip) {
    var members = strip && Array.isArray(strip.members) ? strip.members : [];
    var best = pickBestMember(members);
    var seed = best.seed;
    if (!seed) return null;
    var width = Math.max(1, safeInt(strip && strip.width, 1));
    var height = Math.max(1, safeInt(strip && strip.height, 1));
    var semanticFace = String(seed.semanticFace || 'top');
    var mode = null;
    if (semanticFace === 'top') {
      mode = width > 1 && height === 1 ? 'terrain-top-strip-horizontal'
        : height > 1 && width === 1 ? 'terrain-top-strip-vertical'
        : 'terrain-top-strip-single';
    } else {
      mode = width > 1 && height === 1 ? 'terrain-side-strip-horizontal'
        : height > 1 && width === 1 ? 'terrain-side-strip-vertical'
        : 'terrain-side-strip-single';
    }
    return Object.assign({}, seed, {
      cell: best.cell || seed.cell || null,
      box: best.cell || seed.box || null,
      sortKey: best.sortKey,
      tie: best.tie,
      mergeU: safeInt(strip.minU, 0),
      mergeV: safeInt(strip.minV, 0),
      mergeWidth: width,
      mergeHeight: height,
      memberCount: members.length,
      merged: members.length > 1,
      members: members,
      polygonLoopsUV: null,
      componentBounds: {
        minU: safeInt(strip.minU, 0),
        maxU: safeInt(strip.minU, 0) + width,
        minV: safeInt(strip.minV, 0),
        maxV: safeInt(strip.minV, 0) + height
      },
      boundarySegmentCount: 0,
      mergeMode: mode
    });
  }

  function extractTopStrips(faces) {
    var list = Array.isArray(faces) ? faces : [];
    var map = new Map();
    for (var i = 0; i < list.length; i++) {
      var face = list[i] || {};
      map.set(buildCellKey(face.mergeU, face.mergeV), face);
    }
    var used = new Set();
    var keys = Array.from(map.keys()).map(function (key) {
      var idx = key.indexOf(',');
      return {
        key: key,
        u: safeInt(idx >= 0 ? key.slice(0, idx) : key, 0),
        v: safeInt(idx >= 0 ? key.slice(idx + 1) : 0, 0)
      };
    }).sort(function (a, b) { return a.v - b.v || a.u - b.u; });
    var strips = [];

    function runLengthHorizontal(u, v) {
      var width = 0;
      while (map.has(buildCellKey(u + width, v)) && !used.has(buildCellKey(u + width, v))) width += 1;
      return width;
    }
    function runLengthVertical(u, v) {
      var height = 0;
      while (map.has(buildCellKey(u, v + height)) && !used.has(buildCellKey(u, v + height))) height += 1;
      return height;
    }

    for (var ki = 0; ki < keys.length; ki++) {
      var pt = keys[ki];
      if (used.has(pt.key)) continue;
      var width = runLengthHorizontal(pt.u, pt.v);
      var height = runLengthVertical(pt.u, pt.v);
      var horizontalPreferred = width >= height;
      if (width <= 1 && height <= 1) {
        horizontalPreferred = true;
        width = 1;
        height = 1;
      }
      var members = [];
      if (horizontalPreferred) {
        for (var du = 0; du < width; du++) {
          var hKey = buildCellKey(pt.u + du, pt.v);
          if (!map.has(hKey) || used.has(hKey)) break;
          used.add(hKey);
          members.push(map.get(hKey));
        }
        strips.push({ minU: pt.u, minV: pt.v, width: Math.max(1, members.length), height: 1, members: members });
      } else {
        for (var dv = 0; dv < height; dv++) {
          var vKey = buildCellKey(pt.u, pt.v + dv);
          if (!map.has(vKey) || used.has(vKey)) break;
          used.add(vKey);
          members.push(map.get(vKey));
        }
        strips.push({ minU: pt.u, minV: pt.v, width: 1, height: Math.max(1, members.length), members: members });
      }
    }
    return strips;
  }

  function shouldBreakSideStripAtStepEdge(previousFace, nextFace) {
    var prev = previousFace && typeof previousFace === 'object' ? previousFace : null;
    var next = nextFace && typeof nextFace === 'object' ? nextFace : null;
    if (!prev || !next) return false;
    return String(prev.sideStepBreakSignature || '') !== String(next.sideStepBreakSignature || '');
  }

  function extractSideStrips(faces) {
    var list = Array.isArray(faces) ? faces : [];
    var byU = new Map();
    for (var i = 0; i < list.length; i++) {
      var face = list[i] || {};
      var uKey = String(safeInt(face.mergeU, 0));
      if (!byU.has(uKey)) byU.set(uKey, []);
      byU.get(uKey).push(face);
    }
    var strips = [];
    var breakCount = 0;
    byU.forEach(function (group, uKey) {
      var sorted = group.slice().sort(function (a, b) {
        return safeInt(a.mergeV, 0) - safeInt(b.mergeV, 0);
      });
      var current = null;
      for (var i = 0; i < sorted.length; i++) {
        var face = sorted[i];
        var u = safeInt(face.mergeU, 0);
        var v = safeInt(face.mergeV, 0);
        if (!current) {
          current = { minU: u, minV: v, width: 1, height: 1, members: [face], lastV: v };
          continue;
        }
        if (v === current.lastV + 1) {
          if (!shouldBreakSideStripAtStepEdge(current.members[current.members.length - 1], face)) {
            current.members.push(face);
            current.height += 1;
            current.lastV = v;
            continue;
          }
          breakCount += 1;
        }
        strips.push({ minU: current.minU, minV: current.minV, width: 1, height: current.height, members: current.members.slice() });
        current = { minU: u, minV: v, width: 1, height: 1, members: [face], lastV: v };
      }
      if (current) strips.push({ minU: current.minU, minV: current.minV, width: 1, height: current.height, members: current.members.slice() });
    });
    return { strips: strips, breakCount: breakCount };
  }

  function mergeTerrainFaceDescriptors(descriptors, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var list = Array.isArray(descriptors) ? descriptors : [];
    if (!list.length) {
      return {
        descriptors: [],
        inputCount: 0,
        outputCount: 0,
        mergedFaceCount: 0,
        reductionRatio: 0,
        usedMerge: opts.enabled !== false,
        mergedComponentCount: 0,
        boundarySegmentCount: 0,
        mergeStrategy: 'top-and-side-strip'
      };
    }
    if (opts.enabled === false) {
      return {
        descriptors: list.slice(),
        inputCount: list.length,
        outputCount: list.length,
        mergedFaceCount: 0,
        reductionRatio: 0,
        usedMerge: false,
        mergedComponentCount: 0,
        boundarySegmentCount: 0,
        mergeStrategy: 'disabled'
      };
    }

    var groups = new Map();
    var passthrough = [];
    for (var i = 0; i < list.length; i++) {
      var face = list[i];
      if (!face || typeof face !== 'object') continue;
      var semanticFace = String(face.semanticFace || 'top');
      if (semanticFace !== 'top' && semanticFace !== 'east' && semanticFace !== 'south') {
        passthrough.push(face);
        continue;
      }
      var bandKey = face.terrainSortBandKey != null ? String(face.terrainSortBandKey) : '';
      if (!bandKey) {
        passthrough.push(face);
        continue;
      }
      var keyParts = [
        semanticFace,
        String(face.screenFace || ''),
        String(face.mergePlane != null ? face.mergePlane : ''),
        String(face.terrainMaterialMergeKey || '__terrain_default__'),
        bandKey,
        String(face.terrainMergeSignature || '')
      ];
      if (semanticFace === 'east' || semanticFace === 'south') {
        keyParts.push(String(face.edgeVisibilitySignature || ''));
      }
      var key = keyParts.join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(face);
    }

    var merged = passthrough.slice();
    var mergedComponentCount = 0;
    var sideStepBreakCount = 0;
    groups.forEach(function (faces) {
      if (!faces.length) return;
      var semanticFace = String(faces[0].semanticFace || 'top');
      var strips = null;
      if (semanticFace === 'top') strips = extractTopStrips(faces);
      else {
        var sideResult = extractSideStrips(faces);
        strips = sideResult && Array.isArray(sideResult.strips) ? sideResult.strips : [];
        sideStepBreakCount += Number(sideResult && sideResult.breakCount || 0);
      }
      for (var si = 0; si < strips.length; si++) {
        var descriptor = buildMergedDescriptorFromStrip(strips[si]);
        if (!descriptor) continue;
        merged.push(descriptor);
        if (Number(descriptor.memberCount || 1) > 1) mergedComponentCount += 1;
      }
    });

    return {
      descriptors: merged,
      inputCount: list.length,
      outputCount: merged.length,
      mergedFaceCount: Math.max(0, list.length - merged.length),
      reductionRatio: list.length > 0 ? Math.max(0, (list.length - merged.length) / list.length) : 0,
      usedMerge: true,
      mergedComponentCount: mergedComponentCount,
      boundarySegmentCount: 0,
      sideStepBreakCount: sideStepBreakCount,
      mergeStrategy: 'top-and-side-strip'
    };
  }

  var api = { owner: OWNER, phase: PHASE, mergeTerrainFaceDescriptors: mergeTerrainFaceDescriptors };
  try {
    window.__TERRAIN_FACE_MERGE_CORE__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('core.terrainFaceMerge', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
})();
