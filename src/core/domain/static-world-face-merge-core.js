(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/static-world-face-merge-core.js';
  var PHASE = 'STATIC-WORLD-FACE-MERGE-V1';

  function safeInt(value, fallback) {
    var n = Math.round(Number(value));
    return Number.isFinite(n) ? n : Math.round(Number(fallback) || 0);
  }

  function buildCellKey(u, v) {
    return String(safeInt(u, 0)) + ',' + String(safeInt(v, 0));
  }

  function mergeFaceDescriptors(descriptors, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var list = Array.isArray(descriptors) ? descriptors : [];
    if (!list.length) return {
      descriptors: [],
      inputCount: 0,
      outputCount: 0,
      mergedFaceCount: 0,
      reductionRatio: 0,
      usedMerge: opts.enabled !== false
    };
    if (opts.enabled === false) {
      return {
        descriptors: list.slice(),
        inputCount: list.length,
        outputCount: list.length,
        mergedFaceCount: 0,
        reductionRatio: 0,
        usedMerge: false
      };
    }
    var groups = new Map();
    for (var i = 0; i < list.length; i++) {
      var face = list[i];
      if (!face || typeof face !== 'object') continue;
      var key = [
        String(face.semanticFace || 'top'),
        String(face.screenFace || ''),
        String(face.mergePlane != null ? face.mergePlane : ''),
        String(face.mergeSignature || '')
      ].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(face);
    }
    var merged = [];
    groups.forEach(function (faces) {
      var grid = new Map();
      for (var fi = 0; fi < faces.length; fi++) {
        var face = faces[fi];
        grid.set(buildCellKey(face.mergeU, face.mergeV), face);
      }
      var ordered = faces.slice().sort(function (a, b) {
        var av = safeInt(a && a.mergeV, 0);
        var bv = safeInt(b && b.mergeV, 0);
        if (av !== bv) return av - bv;
        return safeInt(a && a.mergeU, 0) - safeInt(b && b.mergeU, 0);
      });
      var visited = new Set();
      for (var oi = 0; oi < ordered.length; oi++) {
        var seed = ordered[oi];
        if (!seed) continue;
        var seedKey = buildCellKey(seed.mergeU, seed.mergeV);
        if (visited.has(seedKey)) continue;
        var maxWidth = 1;
        while (grid.has(buildCellKey(seed.mergeU + maxWidth, seed.mergeV)) && !visited.has(buildCellKey(seed.mergeU + maxWidth, seed.mergeV))) {
          maxWidth += 1;
        }
        var height = 1;
        var width = maxWidth;
        while (width > 0) {
          var nextV = seed.mergeV + height;
          var rowWidth = 0;
          while (rowWidth < width) {
            var rowKey = buildCellKey(seed.mergeU + rowWidth, nextV);
            if (!grid.has(rowKey) || visited.has(rowKey)) break;
            rowWidth += 1;
          }
          if (rowWidth !== width) break;
          height += 1;
        }
        var members = [];
        var bestSortKey = Number(seed.sortKey || 0);
        var bestTie = Number(seed.tie || 0);
        var bestCell = seed.cell || seed.box || null;
        for (var dv = 0; dv < height; dv++) {
          for (var du = 0; du < width; du++) {
            var memberKey = buildCellKey(seed.mergeU + du, seed.mergeV + dv);
            visited.add(memberKey);
            var member = grid.get(memberKey);
            if (!member) continue;
            members.push(member);
            var sortKey = Number(member.sortKey || 0);
            var tie = Number(member.tie || 0);
            if (sortKey > bestSortKey || (Math.abs(sortKey - bestSortKey) < 1e-6 && tie >= bestTie)) {
              bestSortKey = sortKey;
              bestTie = tie;
              bestCell = member.cell || member.box || bestCell;
            }
          }
        }
        var mergedFace = Object.assign({}, seed, {
          cell: bestCell || seed.cell || null,
          box: bestCell || seed.box || null,
          sortKey: bestSortKey,
          tie: bestTie,
          mergeWidth: width,
          mergeHeight: height,
          memberCount: members.length,
          merged: members.length > 1,
          members: members
        });
        merged.push(mergedFace);
      }
    });
    return {
      descriptors: merged,
      inputCount: list.length,
      outputCount: merged.length,
      mergedFaceCount: Math.max(0, list.length - merged.length),
      reductionRatio: list.length > 0 ? Math.max(0, (list.length - merged.length) / list.length) : 0,
      usedMerge: true
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    mergeFaceDescriptors: mergeFaceDescriptors
  };

  try {
    window.__STATIC_WORLD_FACE_MERGE_CORE__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('core.staticWorldFaceMerge', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
})();
