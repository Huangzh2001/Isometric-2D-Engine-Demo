(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/terrain-face-merge-core.js';
  var PHASE = 'TERRAIN-FACE-MERGE-V16C-TOP-STEP-BOUNDARY-MERGE-KEY-ACTIVE';

  function safeInt(value, fallback) {
    var n = Math.round(Number(value));
    return Number.isFinite(n) ? n : Math.round(Number(fallback) || 0);
  }

  function buildCellKey(u, v) {
    return String(safeInt(u, 0)) + ',' + String(safeInt(v, 0));
  }


  function getTerrainTopOcclusionSortSpanLimit() {
    // Top terrain merge is only safe when the merged strip can still be
    // represented by one draw-order slot.  Large sort/tie/cell-Z spans mean a
    // visible side face may need to be interleaved inside the strip; merging it
    // would bake an invalid stacking order into one packet/texture.
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem('terrainTopMergeOcclusionSortSpanLimit');
        if (raw != null && raw !== '') {
          var n = Number(raw);
          if (Number.isFinite(n) && n >= 0) return n;
        }
      }
    } catch (_) {}
    return 4;
  }

  function getTerrainTopOcclusionCellZSpanLimit() {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem('terrainTopMergeOcclusionCellZSpanLimit');
        if (raw != null && raw !== '') {
          var n = Number(raw);
          if (Number.isFinite(n) && n >= 0) return n;
        }
      }
    } catch (_) {}
    return 0;
  }

  function computeStripOcclusionStats(strip) {
    var members = strip && Array.isArray(strip.members) ? strip.members : [];
    var out = {
      memberCount: members.length,
      minSortKey: Infinity,
      maxSortKey: -Infinity,
      minTie: Infinity,
      maxTie: -Infinity,
      minCellZ: Infinity,
      maxCellZ: -Infinity,
      sortSpan: 0,
      tieSpan: 0,
      cellZSpan: 0
    };
    for (var i = 0; i < members.length; i++) {
      var face = members[i] || {};
      var cell = face.cell || face.box || {};
      var sortKey = Number(face.sortKey || 0);
      var tie = Number(face.tie || 0);
      var z = Number(cell.z || 0);
      if (sortKey < out.minSortKey) out.minSortKey = sortKey;
      if (sortKey > out.maxSortKey) out.maxSortKey = sortKey;
      if (tie < out.minTie) out.minTie = tie;
      if (tie > out.maxTie) out.maxTie = tie;
      if (z < out.minCellZ) out.minCellZ = z;
      if (z > out.maxCellZ) out.maxCellZ = z;
    }
    if (!Number.isFinite(out.minSortKey)) out.minSortKey = out.maxSortKey = 0;
    if (!Number.isFinite(out.minTie)) out.minTie = out.maxTie = 0;
    if (!Number.isFinite(out.minCellZ)) out.minCellZ = out.maxCellZ = 0;
    out.sortSpan = Math.max(0, Number(out.maxSortKey || 0) - Number(out.minSortKey || 0));
    out.tieSpan = Math.max(0, Number(out.maxTie || 0) - Number(out.minTie || 0));
    out.cellZSpan = Math.max(0, Number(out.maxCellZ || 0) - Number(out.minCellZ || 0));
    return out;
  }

  function isOcclusionSafeTerrainTopStrip(strip) {
    var members = strip && Array.isArray(strip.members) ? strip.members : [];
    if (members.length <= 1) return true;
    var stats = computeStripOcclusionStats(strip);
    var sortLimit = getTerrainTopOcclusionSortSpanLimit();
    var zLimit = getTerrainTopOcclusionCellZSpanLimit();
    if (Number(stats.cellZSpan || 0) > zLimit + 1e-6) return false;
    if (Number(stats.sortSpan || 0) > sortLimit + 1e-6) return false;
    return true;
  }

  function statsForMembers(members) {
    return computeStripOcclusionStats({ members: members });
  }

  function isTerrainSideFace(face) {
    var sf = String(face && face.semanticFace || '');
    return sf === 'north' || sf === 'south' || sf === 'east' || sf === 'west';
  }

  function getFaceCell(face) {
    var cell = face && (face.cell || face.box) ? (face.cell || face.box) : null;
    return {
      x: safeInt(cell && cell.x, 0),
      y: safeInt(cell && cell.y, 0),
      z: safeInt(cell && cell.z, 0)
    };
  }

  function getSideFaceNeighborDelta(face) {
    var sf = String(face && face.semanticFace || '').toLowerCase();
    if (sf === 'east') return { x: 1, y: 0, z: 0 };
    if (sf === 'west') return { x: -1, y: 0, z: 0 };
    if (sf === 'south') return { x: 0, y: 1, z: 0 };
    if (sf === 'north') return { x: 0, y: -1, z: 0 };
    return { x: 0, y: 0, z: 0 };
  }

  function isAdjacentSideFacingTopCell(side, topFace) {
    var sc = getFaceCell(side);
    var tc = getFaceCell(topFace);
    if (sc.z !== tc.z) return false;
    var d = getSideFaceNeighborDelta(side);
    return (sc.x + d.x === tc.x && sc.y + d.y === tc.y && sc.z + d.z === tc.z);
  }

  function getTerrainAdjacentSideBlockerEnabled() {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem('terrainTopMergeAdjacentSideBlocker');
        if (raw === '0' || raw === 'false') return false;
      }
    } catch (_) {}
    return true;
  }

  function getFaceSortValue(face) {
    // Legacy 07.15A diagnostic value.  This is intentionally kept so the log can
    // compare the previous tie-scaled sort test against the safer sortKey-only
    // test.  Do not use this as the mathematical order-convexity predicate.
    return Number(face && face.sortKey || 0) + Number(face && face.tie || 0) * 0.001;
  }

  function getFaceSortKeyOnly(face) {
    return Number(face && face.sortKey || 0);
  }

  function getTopMemberAxis(strip) {
    var width = Math.max(1, safeInt(strip && strip.width, 1));
    var height = Math.max(1, safeInt(strip && strip.height, 1));
    return width >= height ? 'u' : 'v';
  }

  function getTopStepBoundarySignature(face) {
    var sig = face && face.topStepBoundarySignature != null ? String(face.topStepBoundarySignature) : '';
    return sig || '__missing_top_step_boundary_signature__';
  }


  function getTerrainTopStepBoundaryMergeKeyEnabled() {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem('terrainTopStepBoundaryMergeKeyEnabled');
        if (raw === '0' || raw === 'false') return false;
      }
    } catch (_) {}
    return true;
  }

  function summarizeTerrainTopStepBoundarySignaturesForStrip(strip) {
    var members = strip && Array.isArray(strip.members) ? strip.members : [];
    var counts = Object.create(null);
    var ordered = [];
    var descriptorCount = 0;
    for (var i = 0; i < members.length; i++) {
      var face = members[i] || {};
      if (String(face.semanticFace || '') !== 'top') continue;
      descriptorCount += 1;
      var sig = getTopStepBoundarySignature(face);
      if (!counts[sig]) {
        counts[sig] = 0;
        ordered.push(sig);
      }
      counts[sig] += 1;
    }
    var runCount = 0;
    var previous = null;
    for (var ri = 0; ri < members.length; ri++) {
      var cur = getTopStepBoundarySignature(members[ri] || {});
      if (ri === 0 || cur !== previous) runCount += 1;
      previous = cur;
    }
    return {
      descriptorCount: descriptorCount,
      uniqueSignatureCount: ordered.length,
      mixed: ordered.length > 1,
      wouldBreakCount: ordered.length > 1 ? Math.max(0, runCount - 1) : 0,
      runCount: runCount,
      counts: counts,
      signatures: ordered
    };
  }

  function pushTopStepBoundaryDiagnosticSample(bucket, strip, summary) {
    if (!Array.isArray(bucket) || bucket.length >= 12) return;
    var members = strip && Array.isArray(strip.members) ? strip.members : [];
    var sampleMembers = [];
    for (var i = 0; i < members.length && sampleMembers.length < 8; i++) {
      var face = members[i] || {};
      var cell = getFaceCell(face);
      sampleMembers.push({
        id: String(face.id || face.packetId || face.faceKey || ''),
        cell: cell,
        mergeU: safeInt(face.mergeU, 0),
        mergeV: safeInt(face.mergeV, 0),
        sortKey: Number(face.sortKey || 0),
        signature: getTopStepBoundarySignature(face)
      });
    }
    bucket.push({
      reason: 'top-step-boundary-signature-mixed-strip-diagnostic-only',
      stripMergeBox: {
        minU: safeInt(strip && strip.minU, 0),
        minV: safeInt(strip && strip.minV, 0),
        width: Math.max(1, safeInt(strip && strip.width, 1)),
        height: Math.max(1, safeInt(strip && strip.height, 1))
      },
      descriptorCount: Number(summary && summary.descriptorCount || 0),
      uniqueSignatureCount: Number(summary && summary.uniqueSignatureCount || 0),
      wouldBreakCount: Number(summary && summary.wouldBreakCount || 0),
      signatures: summary && Array.isArray(summary.signatures) ? summary.signatures.slice(0, 8) : [],
      counts: summary && summary.counts ? summary.counts : {},
      members: sampleMembers
    });
  }


  function getTerrainTopBarrierSplitEnabled() {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem('terrainTopMergeBarrierSplitEnabled');
        if (raw === '0' || raw === 'false') return false;
      }
    } catch (_) {}
    return true;
  }

  function getTerrainTopBarrierLocalRadius() {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem('terrainTopMergeBarrierLocalRadius');
        if (raw != null && raw !== '') {
          var n = Number(raw);
          if (Number.isFinite(n) && n >= 0) return n;
        }
      }
    } catch (_) {}
    return 1;
  }

  function getTopStripCellBounds(strip) {
    var members = strip && Array.isArray(strip.members) ? strip.members : [];
    var out = {
      memberCount: members.length,
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
      zSpan: 0,
      topPlane: 0
    };
    for (var i = 0; i < members.length; i++) {
      var c = getFaceCell(members[i]);
      if (c.x < out.minX) out.minX = c.x;
      if (c.x > out.maxX) out.maxX = c.x;
      if (c.y < out.minY) out.minY = c.y;
      if (c.y > out.maxY) out.maxY = c.y;
      if (c.z < out.minZ) out.minZ = c.z;
      if (c.z > out.maxZ) out.maxZ = c.z;
    }
    if (!Number.isFinite(out.minX)) out.minX = out.maxX = 0;
    if (!Number.isFinite(out.minY)) out.minY = out.maxY = 0;
    if (!Number.isFinite(out.minZ)) out.minZ = out.maxZ = 0;
    out.zSpan = Math.max(0, out.maxZ - out.minZ);
    out.topPlane = out.minZ + 1;
    return out;
  }

  function buildTerrainSideBarrierIndex(sideBlockers) {
    var list = Array.isArray(sideBlockers) ? sideBlockers : [];
    var byPlane = new Map();
    var byUpperPlane = new Map();
    var byVerticalIntervalPlane = new Map();
    var allSides = [];
    var indexedSideCount = 0;

    function push(map, planeKey, side) {
      var key = String(planeKey);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(side);
    }

    for (var i = 0; i < list.length; i++) {
      var side = list[i];
      if (!isTerrainSideFace(side)) continue;
      var sc = getFaceCell(side);
      push(byPlane, sc.z, side);
      // A vertical terrain side spans the height interval [z, z + 1].  07.15A
      // only indexed sc.z, which misses side faces whose upper edge lies on the
      // top plane being tested.  Keep both maps diagnostic-only here.
      push(byUpperPlane, sc.z + 1, side);
      push(byVerticalIntervalPlane, sc.z, side);
      push(byVerticalIntervalPlane, sc.z + 1, side);
      allSides.push(side);
      indexedSideCount += 1;
    }
    return {
      byPlane: byPlane,
      byUpperPlane: byUpperPlane,
      byVerticalIntervalPlane: byVerticalIntervalPlane,
      allSides: allSides,
      indexedSideCount: indexedSideCount,
      planeCount: byPlane.size,
      upperPlaneCount: byUpperPlane.size,
      verticalIntervalPlaneCount: byVerticalIntervalPlane.size
    };
  }

  function isCellInsideExpandedTopStripBounds(cell, stripBounds, radius) {
    var c = cell || {};
    var r = Math.max(0, Number(radius || 0));
    return Number(c.x || 0) >= Number(stripBounds.minX) - r
      && Number(c.x || 0) <= Number(stripBounds.maxX) + r
      && Number(c.y || 0) >= Number(stripBounds.minY) - r
      && Number(c.y || 0) <= Number(stripBounds.maxY) + r;
  }

  function getSideFaceContactCell(side) {
    var sc = getFaceCell(side);
    var d = getSideFaceNeighborDelta(side);
    return {
      x: sc.x + safeInt(d.x, 0),
      y: sc.y + safeInt(d.y, 0),
      z: sc.z + safeInt(d.z, 0)
    };
  }

  function isSideFaceContactInsideExpandedTopStripBounds(side, stripBounds, radius) {
    // For a vertical step wall, the side cell itself belongs to the higher block.
    // The lower top strip that must be order-split usually lies on the outward
    // contact cell across the visible side face.  07.15C checked only sideCell,
    // so lower-plane step-wall barriers were often rejected as "outside bounds".
    var sc = getFaceCell(side);
    var contact = getSideFaceContactCell(side);
    return isCellInsideExpandedTopStripBounds(sc, stripBounds, radius)
      || isCellInsideExpandedTopStripBounds(contact, stripBounds, radius);
  }

  function isSideInsideExpandedTopStripBounds(side, stripBounds, radius) {
    return isCellInsideExpandedTopStripBounds(getFaceCell(side), stripBounds, radius);
  }

  function getSideTopPlaneRelation(side, topPlane) {
    var sc = getFaceCell(side);
    var plane = Number(topPlane || 0);
    if (Math.abs(Number(sc.z || 0) - plane) <= 1e-6) return 'lower-plane';
    if (Math.abs(Number(sc.z + 1 || 0) - plane) <= 1e-6) return 'upper-plane';
    return 'interval-plane';
  }

  function isMonotonicSortRun(values) {
    var list = Array.isArray(values) ? values : [];
    if (list.length <= 2) return true;
    var inc = true;
    var dec = true;
    for (var i = 1; i < list.length; i++) {
      if (list[i] + 1e-6 < list[i - 1]) inc = false;
      if (list[i] - 1e-6 > list[i - 1]) dec = false;
    }
    return inc || dec;
  }

  function findSortInsertionCutIndexForMembers(members, sideSort) {
    return findSortInsertionCutIndexForMembersWithAccessor(members, sideSort, getFaceSortValue);
  }

  function findSortKeyOnlyInsertionCutIndexForMembers(members, sideSortKey) {
    return findSortInsertionCutIndexForMembersWithAccessor(members, sideSortKey, getFaceSortKeyOnly);
  }

  function findSortInsertionCutIndexForMembersWithAccessor(members, sideSort, accessor) {
    var list = Array.isArray(members) ? members : [];
    var getValue = typeof accessor === 'function' ? accessor : getFaceSortValue;
    if (list.length <= 1) return null;
    var best = null;
    for (var i = 1; i < list.length; i++) {
      var a = getValue(list[i - 1]);
      var b = getValue(list[i]);
      var lo = Math.min(a, b);
      var hi = Math.max(a, b);
      if (sideSort >= lo - 1e-6 && sideSort <= hi + 1e-6) {
        var mid = (lo + hi) * 0.5;
        var score = Math.abs(Number(sideSort || 0) - mid);
        if (!best || score < best.score) best = { index: i, score: score };
      }
    }
    return best ? best.index : null;
  }

  function splitTopStripByTerrainBarriers(strip, sideBarrierIndex) {
    var members = strip && Array.isArray(strip.members) ? strip.members : [];
    var result = {
      segments: [strip],
      barrierSplitCount: 0,
      barrierCutPointCount: 0,
      barrierCandidateCount: 0,
      barrierAcceptedCount: 0,
      barrierRejectedOutOfPlaneCount: 0,
      barrierRejectedOutsideStripBoundsCount: 0,
      barrierRejectedOutsideSortRangeCount: 0,
      barrierRejectedNoInsertionIndexCount: 0,
      barrierNonMonotonicStripCount: 0,
      barrierMaxSegmentLength: members.length,
      barrierSamples: [],
      barrierLegacyPlaneCandidateCount: 0,
      barrierUpperPlaneCandidateCount: 0,
      barrierIntervalPlaneCandidateCount: 0,
      barrierWouldAcceptBySideUpperPlaneCount: 0,
      barrierWouldAcceptBySortKeyOnlyCount: 0,
      barrierTieSortMismatchCount: 0,
      barrierPlaneMissButWouldAcceptCount: 0,
      barrierSortKeyInsertionIndexCount: 0,
      barrierTieSortInsertionIndexCount: 0,
      barrierDiagnosticsOnlySuppressedSplitCount: 0,
      correctedBarrierAcceptedCount: 0,
      correctedBarrierSplitCount: 0,
      correctedBarrierCutPointCount: 0,
      correctedBarrierRejectedOutsideStripBoundsCount: 0,
      correctedBarrierRejectedOutsideSortRangeCount: 0,
      correctedBarrierRejectedNoInsertionIndexCount: 0,
      barrierRejectedOutsideStripBoundsSamples: [],
      barrierRejectedOutsideSortRangeSamples: [],
      barrierTieSortMismatchSamples: [],
      barrierPlaneMissButWouldAcceptSamples: [],
      barrierSortKeyOnlyAcceptSamples: []
    };
    if (members.length <= 1 || !sideBarrierIndex || !sideBarrierIndex.byPlane) return result;
    if (!getTerrainTopBarrierSplitEnabled()) return result;

    var bounds = getTopStripCellBounds(strip);
    if (Number(bounds.zSpan || 0) !== 0) {
      result.barrierRejectedOutOfPlaneCount += 1;
      return result;
    }

    var topSortValues = members.map(getFaceSortValue);
    var minTopSort = Math.min.apply(Math, topSortValues);
    var maxTopSort = Math.max.apply(Math, topSortValues);
    var topSortKeyValues = members.map(getFaceSortKeyOnly);
    var minTopSortKey = Math.min.apply(Math, topSortKeyValues);
    var maxTopSortKey = Math.max.apply(Math, topSortKeyValues);
    var monotonic = isMonotonicSortRun(topSortValues);
    var monotonicSortKeyOnly = isMonotonicSortRun(topSortKeyValues);
    if (!monotonic) result.barrierNonMonotonicStripCount += 1;

    var planeKey = String(bounds.topPlane);
    var legacyCandidates = sideBarrierIndex.byPlane.get(planeKey) || [];
    var upperCandidates = sideBarrierIndex.byUpperPlane && sideBarrierIndex.byUpperPlane.get(planeKey) || [];
    var intervalCandidates = sideBarrierIndex.byVerticalIntervalPlane && sideBarrierIndex.byVerticalIntervalPlane.get(planeKey) || [];
    var radius = getTerrainTopBarrierLocalRadius();
    var cut = Object.create(null);

    result.barrierLegacyPlaneCandidateCount = legacyCandidates.length;
    result.barrierUpperPlaneCandidateCount = upperCandidates.length;
    result.barrierIntervalPlaneCandidateCount = intervalCandidates.length;

    function pushSample(bucket, side, reason, extra) {
      if (!Array.isArray(bucket) || bucket.length >= 10) return;
      var sc = getFaceCell(side);
      var sideSort = getFaceSortValue(side);
      var sideSortKey = getFaceSortKeyOnly(side);
      bucket.push(Object.assign({
        sideId: String(side && (side.id || side.packetId || side.faceKey) || ''),
        sideFace: String(side && side.semanticFace || ''),
        sideCell: sc,
        sideSort: Number(sideSort || 0),
        sideSortKey: Number(sideSortKey || 0),
        sideTie: Number(side && side.tie || 0),
        sideLowerPlane: Number(sc.z || 0),
        sideUpperPlane: Number(sc.z + 1 || 0),
        topPlane: Number(bounds.topPlane || 0),
        topSortRange: { min: Number(minTopSort || 0), max: Number(maxTopSort || 0) },
        topSortKeyRange: { min: Number(minTopSortKey || 0), max: Number(maxTopSortKey || 0) },
        stripBounds: {
          minX: Number(bounds.minX || 0),
          maxX: Number(bounds.maxX || 0),
          minY: Number(bounds.minY || 0),
          maxY: Number(bounds.maxY || 0),
          minZ: Number(bounds.minZ || 0),
          maxZ: Number(bounds.maxZ || 0)
        },
        stripMergeBox: {
          minU: safeInt(strip && strip.minU, 0),
          minV: safeInt(strip && strip.minV, 0),
          width: Math.max(1, safeInt(strip && strip.width, 1)),
          height: Math.max(1, safeInt(strip && strip.height, 1))
        },
        memberCount: members.length,
        monotonicTieSort: monotonic,
        monotonicSortKeyOnly: monotonicSortKeyOnly,
        reason: String(reason || '')
      }, extra || {}));
    }

    function analyzeCandidate(side, source) {
      if (!isTerrainSideFace(side)) return null;
      var sideSort = getFaceSortValue(side);
      var sideSortKey = getFaceSortKeyOnly(side);
      var sc = getFaceCell(side);
      var legacyPlaneMatch = String(sc.z) === planeKey;
      var upperPlaneMatch = String(sc.z + 1) === planeKey;
      var planeRelation = getSideTopPlaneRelation(side, bounds.topPlane);
      var insideSideCellBounds = isSideInsideExpandedTopStripBounds(side, bounds, radius);
      var insideContactBounds = isSideFaceContactInsideExpandedTopStripBounds(side, bounds, radius);
      var insideBounds = insideSideCellBounds;
      // Upper-plane barriers split top strips on the same elevated block; sideCell
      // bounds are appropriate.  Lower-plane step walls split adjacent lower top
      // strips; the outward contact cell across the side face is the correct
      // geometric footprint to test.
      if (planeRelation === 'lower-plane') insideBounds = insideContactBounds;
      var insideTieSortOpen = sideSort > minTopSort + 1e-6 && sideSort < maxTopSort - 1e-6;
      var insideSortKeyOpen = sideSortKey > minTopSortKey + 1e-6 && sideSortKey < maxTopSortKey - 1e-6;
      var tieCutIndex = insideTieSortOpen ? findSortInsertionCutIndexForMembers(members, sideSort) : null;
      var sortKeyCutIndex = insideSortKeyOpen ? findSortKeyOnlyInsertionCutIndexForMembers(members, sideSortKey) : null;
      return {
        source: source,
        insideBounds: insideBounds,
        insideSideCellBounds: insideSideCellBounds,
        insideContactBounds: insideContactBounds,
        planeRelation: planeRelation,
        contactCell: getSideFaceContactCell(side),
        insideTieSortOpen: insideTieSortOpen,
        insideSortKeyOpen: insideSortKeyOpen,
        tieCutIndex: tieCutIndex,
        sortKeyCutIndex: sortKeyCutIndex,
        legacyPlaneMatch: legacyPlaneMatch,
        upperPlaneMatch: upperPlaneMatch,
        sideSort: sideSort,
        sideSortKey: sideSortKey
      };
    }

    // Diagnostic pass over the interval-indexed candidates.  This does not
    // change rendering; it only tells us whether 07.15A missed the true barrier
    // because of plane indexing, tie-scaled sorting, or local bounds.
    var seen = new Set();
    for (var di = 0; di < intervalCandidates.length; di++) {
      var dside = intervalCandidates[di];
      var did = String(dside && (dside.id || dside.packetId || dside.faceKey) || di);
      if (seen.has(did)) continue;
      seen.add(did);
      var d = analyzeCandidate(dside, 'interval-plane-diagnostic');
      if (!d) continue;
      if (d.insideBounds && d.insideSortKeyOpen) {
        result.barrierWouldAcceptBySortKeyOnlyCount += 1;
        if (d.sortKeyCutIndex != null) result.barrierSortKeyInsertionIndexCount += 1;
        pushSample(result.barrierSortKeyOnlyAcceptSamples, dside, 'would-accept-by-sortKey-only-diagnostic', {
          sortKeyCutIndex: d.sortKeyCutIndex,
          tieCutIndex: d.tieCutIndex,
          legacyPlaneMatch: d.legacyPlaneMatch,
          upperPlaneMatch: d.upperPlaneMatch,
          planeRelation: d.planeRelation,
          insideSideCellBounds: d.insideSideCellBounds,
          insideContactBounds: d.insideContactBounds,
          contactCell: d.contactCell
        });
      }
      if (d.upperPlaneMatch && d.insideBounds && d.insideSortKeyOpen) {
        result.barrierWouldAcceptBySideUpperPlaneCount += 1;
      }
      if (!d.legacyPlaneMatch && d.upperPlaneMatch && d.insideBounds && d.insideSortKeyOpen) {
        result.barrierPlaneMissButWouldAcceptCount += 1;
        pushSample(result.barrierPlaneMissButWouldAcceptSamples, dside, 'legacy-plane-miss-but-upper-plane-sortKey-would-accept', {
          sortKeyCutIndex: d.sortKeyCutIndex,
          tieCutIndex: d.tieCutIndex
        });
      }
      if (d.insideBounds && d.insideSortKeyOpen && !d.insideTieSortOpen) {
        result.barrierTieSortMismatchCount += 1;
        pushSample(result.barrierTieSortMismatchSamples, dside, 'sortKey-inside-but-tieSort-outside', {
          sortKeyCutIndex: d.sortKeyCutIndex,
          tieCutIndex: d.tieCutIndex
        });
      }
    }

    // 07.16A frozen diagnostics pass.  Keep the corrected interval-plane /
    // contact-bounds / sortKey-only analysis so logs remain comparable, but do
    // not use side-face sort insertion to split top strips.  Top-face merging
    // will be reworked at the voxel/grid meshing layer in the next steps.
    var activeSeen = new Set();
    for (var si = 0; si < intervalCandidates.length; si++) {
      var side = intervalCandidates[si];
      var sid = String(side && (side.id || side.packetId || side.faceKey) || si);
      if (activeSeen.has(sid)) continue;
      activeSeen.add(sid);
      if (!isTerrainSideFace(side)) continue;
      result.barrierCandidateCount += 1;
      var a = analyzeCandidate(side, 'corrected-interval-plane-sortKey-only');
      if (!a || !a.insideBounds) {
        result.barrierRejectedOutsideStripBoundsCount += 1;
        result.correctedBarrierRejectedOutsideStripBoundsCount += 1;
        pushSample(result.barrierRejectedOutsideStripBoundsSamples, side, 'corrected-rejected-outside-expanded-strip-bounds', {
          legacyPlaneMatch: a ? a.legacyPlaneMatch : null,
          upperPlaneMatch: a ? a.upperPlaneMatch : null,
          planeRelation: a ? a.planeRelation : null,
          insideSideCellBounds: a ? a.insideSideCellBounds : null,
          insideContactBounds: a ? a.insideContactBounds : null,
          contactCell: a ? a.contactCell : null,
          activePredicate: 'interval-plane+contact-bounds+sortKey-only'
        });
        continue;
      }
      if (!a.insideSortKeyOpen) {
        result.barrierRejectedOutsideSortRangeCount += 1;
        result.correctedBarrierRejectedOutsideSortRangeCount += 1;
        pushSample(result.barrierRejectedOutsideSortRangeSamples, side, 'corrected-rejected-outside-sortKey-range', {
          tieSortInsideOpenRange: a.insideTieSortOpen,
          planeRelation: a.planeRelation,
          insideSideCellBounds: a.insideSideCellBounds,
          insideContactBounds: a.insideContactBounds,
          contactCell: a.contactCell,
          sortKeyCutIndex: a.sortKeyCutIndex,
          tieCutIndex: a.tieCutIndex,
          planeRelation: a.planeRelation,
          insideSideCellBounds: a.insideSideCellBounds,
          insideContactBounds: a.insideContactBounds,
          contactCell: a.contactCell,
          activePredicate: 'interval-plane+contact-bounds+sortKey-only'
        });
        continue;
      }
      if (a.sortKeyCutIndex == null || a.sortKeyCutIndex <= 0 || a.sortKeyCutIndex >= members.length) {
        result.barrierRejectedNoInsertionIndexCount += 1;
        result.correctedBarrierRejectedNoInsertionIndexCount += 1;
        pushSample(result.barrierSamples, side, 'corrected-rejected-no-valid-sortKey-insertion-index', {
          sortKeyCutIndex: a.sortKeyCutIndex,
          tieCutIndex: a.tieCutIndex,
          planeRelation: a.planeRelation,
          insideSideCellBounds: a.insideSideCellBounds,
          insideContactBounds: a.insideContactBounds,
          contactCell: a.contactCell,
          activePredicate: 'interval-plane+contact-bounds+sortKey-only'
        });
        continue;
      }
      cut[String(a.sortKeyCutIndex)] = true;
      result.barrierAcceptedCount += 1;
      result.correctedBarrierAcceptedCount += 1;
      pushSample(result.barrierSamples, side, 'corrected-accepted-interval-plane-sortKey-only', {
        cutIndex: a.sortKeyCutIndex,
        tieCutIndex: a.tieCutIndex,
        planeRelation: a.planeRelation,
        insideSideCellBounds: a.insideSideCellBounds,
        insideContactBounds: a.insideContactBounds,
        contactCell: a.contactCell,
        legacyPlaneMatch: a.legacyPlaneMatch,
        upperPlaneMatch: a.upperPlaneMatch,
        activePredicate: 'interval-plane+contact-bounds+sortKey-only'
      });
    }

    var cutPoints = Object.keys(cut).map(function (key) { return safeInt(key, 0); }).sort(function (a, b) { return a - b; });
    result.barrierCutPointCount = cutPoints.length;
    result.correctedBarrierCutPointCount = cutPoints.length;
    if (cutPoints.length) {
      // 07.16A is intentionally diagnostics-only.  These cut points show where
      // the previous order-convex barrier predicate would have split the top
      // strip, but they must not alter the merged terrain output.  The root fix
      // will move top-face admissibility into boundary-aware voxel meshing.
      result.barrierDiagnosticsOnlySuppressedSplitCount += 1;
    }
    result.segments = [strip];
    result.barrierSplitCount = 0;
    result.correctedBarrierSplitCount = 0;
    result.barrierMaxSegmentLength = members.length;
    return result;
  }

  function classifySideTopBlockerRelation(side, topFace) {
    if (!side || !topFace) return 'none';
    var sc = getFaceCell(side);
    var tc = getFaceCell(topFace);
    if (sc.x === tc.x && sc.y === tc.y && sc.z === tc.z) return 'same-cell';
    var dx = Math.abs(sc.x - tc.x);
    var dy = Math.abs(sc.y - tc.y);
    if (sc.z === tc.z && dx + dy === 1) return 'adjacent-cell';
    // PXM-07.14W: the terrain stair bug is not a same-height adjacency.
    // A higher block's visible vertical side can need to be interleaved inside
    // a lower top strip.  Treat this as a distinct step-wall blocker relation:
    // side cell is one level above the top member and horizontally local.
    if (sc.z === tc.z + 1 && dx + dy <= 1) return 'step-wall';
    if (sc.z !== tc.z) return 'different-z';
    return 'far-cell';
  }

  function sideMayBlockTopMember(side, topFace, withinSortRange) {
    // Same-cell blockers are always valid.  Same-height adjacent blockers and
    // step-wall blockers are valid only when their sort value lies inside the
    // candidate top strip.  This keeps far/sort-only ghost blockers diagnostic
    // only while allowing the real stair case: a higher side face interrupting a
    // lower top strip.
    var relation = classifySideTopBlockerRelation(side, topFace);
    if (relation === 'same-cell') return true;
    if (relation !== 'adjacent-cell' && relation !== 'step-wall') return false;
    if (withinSortRange !== true) return false;
    if (!getTerrainAdjacentSideBlockerEnabled()) return false;
    return true;
  }

  function buildBlockerCutPointsForTopStrip(strip, sideBlockers) {
    var members = strip && Array.isArray(strip.members) ? strip.members : [];
    var blockers = Array.isArray(sideBlockers) ? sideBlockers : [];
    var result = {
      cutPoints: [],
      blockerCount: 0,
      directHitCount: 0,
      insertionHitCount: 0,
      exactCellHitCount: 0,
      adjacentCellCandidateCount: 0,
      adjacentCellAcceptedCount: 0,
      adjacentCellRejectedCount: 0,
      stepWallCandidateCount: 0,
      stepWallAcceptedCount: 0,
      stepWallRejectedCount: 0,
      sortInsertionCandidateCount: 0,
      rejectedNonExactBlockerCount: 0,
      rejectedOutOfSortRangeCount: 0,
      sampleAcceptedBlockers: [],
      sampleRejectedBlockers: []
    };
    if (members.length <= 1 || !blockers.length) return result;
    var cut = Object.create(null);
    var topSortValues = members.map(getFaceSortValue);
    var minTopSort = Math.min.apply(Math, topSortValues);
    var maxTopSort = Math.max.apply(Math, topSortValues);

    function addCut(index) {
      var idx = safeInt(index, 0);
      if (idx > 0 && idx < members.length) cut[String(idx)] = true;
    }

    function pushSample(bucket, side, topFace, relation, sideSort, extra) {
      if (!Array.isArray(bucket) || bucket.length >= 8) return;
      var sc = getFaceCell(side);
      var tc = getFaceCell(topFace);
      bucket.push(Object.assign({
        sideId: String(side && (side.id || side.packetId || side.faceKey) || ''),
        topId: String(topFace && (topFace.id || topFace.packetId || topFace.faceKey) || ''),
        sideFace: String(side && side.semanticFace || ''),
        relation: relation,
        sideCell: sc,
        topCell: tc,
        sideSort: Number(sideSort || 0),
        topSort: Number(getFaceSortValue(topFace) || 0)
      }, extra || {}));
    }

    for (var bi = 0; bi < blockers.length; bi++) {
      var side = blockers[bi];
      if (!isTerrainSideFace(side)) continue;
      var sideSort = getFaceSortValue(side);
      var withinSortRange = sideSort >= minTopSort - 1e-6 && sideSort <= maxTopSort + 1e-6;
      var touched = false;
      var hadRejectedNearby = false;
      for (var mi = 0; mi < members.length; mi++) {
        var relation = classifySideTopBlockerRelation(side, members[mi]);
        if (relation !== 'same-cell' && relation !== 'adjacent-cell' && relation !== 'step-wall') continue;
        if (!withinSortRange) {
          result.rejectedOutOfSortRangeCount += 1;
          if (relation === 'adjacent-cell') result.adjacentCellRejectedCount += 1;
          if (relation === 'step-wall') result.stepWallRejectedCount += 1;
          pushSample(result.sampleRejectedBlockers, side, members[mi], relation, sideSort, { reason: relation + '-outside-strip-sort-range' });
          continue;
        }
        if (relation === 'adjacent-cell' || relation === 'step-wall') {
          if (relation === 'adjacent-cell') result.adjacentCellCandidateCount += 1;
          if (relation === 'step-wall') result.stepWallCandidateCount += 1;
          if (!sideMayBlockTopMember(side, members[mi], withinSortRange)) {
            if (relation === 'adjacent-cell') result.adjacentCellRejectedCount += 1;
            if (relation === 'step-wall') result.stepWallRejectedCount += 1;
            result.rejectedNonExactBlockerCount += 1;
            hadRejectedNearby = true;
            pushSample(result.sampleRejectedBlockers, side, members[mi], relation, sideSort, {
              reason: relation + '-rejected-disabled-or-outside-local-sort-insertion',
              adjacentSideFacesTopCell: isAdjacentSideFacingTopCell(side, members[mi])
            });
            continue;
          }
          touched = true;
          result.directHitCount += 1;
          if (relation === 'adjacent-cell') result.adjacentCellAcceptedCount += 1;
          if (relation === 'step-wall') result.stepWallAcceptedCount += 1;
          pushSample(result.sampleAcceptedBlockers, side, members[mi], relation, sideSort, {
            cutBefore: mi,
            cutAfter: mi + 1,
            adjacentSideFacesTopCell: isAdjacentSideFacingTopCell(side, members[mi]),
            acceptedBy: relation === 'step-wall'
              ? 'final-visible-step-wall-higher-side-blocks-lower-top-strip'
              : 'final-visible-adjacent-local-sort-insertion'
          });
          addCut(mi);
          addCut(mi + 1);
          continue;
        }
        if (!sideMayBlockTopMember(side, members[mi], withinSortRange)) continue;
        touched = true;
        result.directHitCount += 1;
        result.exactCellHitCount += 1;
        pushSample(result.sampleAcceptedBlockers, side, members[mi], relation, sideSort, { cutBefore: mi, cutAfter: mi + 1 });
        addCut(mi);
        addCut(mi + 1);
      }
      if (!touched && withinSortRange) {
        // Diagnostic only.  The 07.14S insertion fallback caused false cuts from
        // side faces that were not tied to a concrete top member.  Keep the count
        // in the log so that real misses can be inspected, but do not cut.
        result.sortInsertionCandidateCount += 1;
        result.rejectedNonExactBlockerCount += 1;
        if (!hadRejectedNearby && members.length) {
          pushSample(result.sampleRejectedBlockers, side, members[0], 'sort-range-only', sideSort, { reason: 'sort-insertion-candidate-diagnostic-only' });
        }
      }
      if (touched) result.blockerCount += 1;
    }
    result.cutPoints = Object.keys(cut).map(function (key) { return safeInt(key, 0); }).sort(function (a, b) { return a - b; });
    return result;
  }

  function splitMembersByCutPoints(members, cutPoints, fallbackStrip) {
    var list = Array.isArray(members) ? members : [];
    var cuts = Array.isArray(cutPoints) ? cutPoints.slice().sort(function (a, b) { return a - b; }) : [];
    if (!list.length) return [];
    var out = [];
    var start = 0;
    for (var i = 0; i < cuts.length; i++) {
      var cut = safeInt(cuts[i], 0);
      if (cut <= start || cut >= list.length) continue;
      var segment = buildStripFromSegmentMembers(list.slice(start, cut), fallbackStrip);
      if (segment) out.push(segment);
      start = cut;
    }
    var last = buildStripFromSegmentMembers(list.slice(start), fallbackStrip);
    if (last) out.push(last);
    return out.length ? out : [fallbackStrip];
  }

  function splitTopStripByBlockers(strip, sideBlockers) {
    var members = strip && Array.isArray(strip.members) ? strip.members : [];
    var cuts = buildBlockerCutPointsForTopStrip(strip, sideBlockers);
    if (!cuts.cutPoints.length) {
      return Object.assign({ segments: [strip], blockerSplitCount: 0, blockerCutPointCount: 0 }, cuts);
    }
    var segments = splitMembersByCutPoints(members, cuts.cutPoints, strip);
    return Object.assign({
      segments: segments,
      blockerSplitCount: Math.max(0, segments.length - 1),
      blockerCutPointCount: cuts.cutPoints.length
    }, cuts);
  }

  function canAppendToOcclusionSegment(segmentMembers, nextFace) {
    var list = Array.isArray(segmentMembers) ? segmentMembers.slice() : [];
    list.push(nextFace);
    var stats = statsForMembers(list);
    var sortLimit = getTerrainTopOcclusionSortSpanLimit();
    var zLimit = getTerrainTopOcclusionCellZSpanLimit();
    if (Number(stats.cellZSpan || 0) > zLimit + 1e-6) return false;
    if (Number(stats.sortSpan || 0) > sortLimit + 1e-6) return false;
    return true;
  }

  function buildStripFromSegmentMembers(members, fallbackStrip) {
    var list = Array.isArray(members) ? members.filter(Boolean) : [];
    if (!list.length) return null;
    var minU = Infinity;
    var maxU = -Infinity;
    var minV = Infinity;
    var maxV = -Infinity;
    for (var i = 0; i < list.length; i++) {
      var face = list[i] || {};
      var u = safeInt(face.mergeU, fallbackStrip && fallbackStrip.minU || 0);
      var v = safeInt(face.mergeV, fallbackStrip && fallbackStrip.minV || 0);
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    if (!Number.isFinite(minU)) minU = safeInt(fallbackStrip && fallbackStrip.minU, 0);
    if (!Number.isFinite(maxU)) maxU = minU;
    if (!Number.isFinite(minV)) minV = safeInt(fallbackStrip && fallbackStrip.minV, 0);
    if (!Number.isFinite(maxV)) maxV = minV;
    return {
      minU: minU,
      minV: minV,
      width: Math.max(1, maxU - minU + 1),
      height: Math.max(1, maxV - minV + 1),
      members: list
    };
  }

  function splitStripIntoOcclusionSafeSegments(strip) {
    var members = strip && Array.isArray(strip.members) ? strip.members : [];
    if (members.length <= 1) return [strip];
    var out = [];
    var current = [];
    for (var i = 0; i < members.length; i++) {
      var face = members[i] || {};
      if (!current.length) {
        current.push(face);
        continue;
      }
      if (canAppendToOcclusionSegment(current, face)) {
        current.push(face);
        continue;
      }
      var built = buildStripFromSegmentMembers(current, strip);
      if (built) out.push(built);
      current = [face];
    }
    if (current.length) {
      var last = buildStripFromSegmentMembers(current, strip);
      if (last) out.push(last);
    }
    return out.length ? out : [strip];
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
        mergeStrategy: 'top-and-side-strip',
        terrainTopStepBoundaryDescriptorCount: 0,
        terrainTopStepBoundaryUniqueSignatureCount: 0,
        terrainTopStepBoundaryMixedStripCount: 0,
        terrainTopStepBoundaryMixedMemberCount: 0,
        terrainTopStepBoundaryWouldBreakCount: 0,
        terrainTopStepBoundarySamples: [],
        terrainTopStepBoundaryMergeKeyEnabled: getTerrainTopStepBoundaryMergeKeyEnabled()
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
        mergeStrategy: 'disabled',
        terrainTopStepBoundaryDescriptorCount: 0,
        terrainTopStepBoundaryUniqueSignatureCount: 0,
        terrainTopStepBoundaryMixedStripCount: 0,
        terrainTopStepBoundaryMixedMemberCount: 0,
        terrainTopStepBoundaryWouldBreakCount: 0,
        terrainTopStepBoundarySamples: [],
        terrainTopStepBoundaryMergeKeyEnabled: false
      };
    }

    var groups = new Map();
    var topStepBoundaryMergeKeyEnabled = getTerrainTopStepBoundaryMergeKeyEnabled();
    var passthrough = [];
    var terrainSideBlockers = [];
    for (var i = 0; i < list.length; i++) {
      var face = list[i];
      if (!face || typeof face !== 'object') continue;
      var semanticFace = String(face.semanticFace || 'top');
      if (isTerrainSideFace(face)) terrainSideBlockers.push(face);
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
      if (semanticFace === 'top' && topStepBoundaryMergeKeyEnabled) {
        // PXM-07.16C: make step-boundary topology part of the renderer-neutral
        // top-face merge key.  This prevents a top strip from being formed
        // across a visible height discontinuity in the first place, rather than
        // attempting to cut it later with screen-space side-face sortKey barriers.
        keyParts.push(String(getTopStepBoundarySignature(face)));
      }
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
    var terrainTopOcclusionBreakCount = 0;
    var terrainTopStepBoundaryDescriptorCount = 0;
    var terrainTopStepBoundaryUniqueSignatureCount = 0;
    var terrainTopStepBoundarySignatureSet = Object.create(null);
    var terrainTopStepBoundaryMixedStripCount = 0;
    var terrainTopStepBoundaryMixedMemberCount = 0;
    var terrainTopStepBoundaryWouldBreakCount = 0;
    var terrainTopStepBoundarySamples = [];
    var sideBarrierIndex = buildTerrainSideBarrierIndex(terrainSideBlockers);
    var terrainTopBarrierSplitCount = 0;
    var terrainTopBarrierCutPointCount = 0;
    var terrainTopBarrierCandidateCount = 0;
    var terrainTopBarrierAcceptedCount = 0;
    var terrainTopBarrierRejectedOutOfPlaneCount = 0;
    var terrainTopBarrierRejectedOutsideStripBoundsCount = 0;
    var terrainTopBarrierRejectedOutsideSortRangeCount = 0;
    var terrainTopBarrierRejectedNoInsertionIndexCount = 0;
    var terrainTopBarrierNonMonotonicStripCount = 0;
    var terrainTopBarrierMaxSegmentLength = 0;
    var terrainTopBarrierSamples = [];
    var terrainTopBarrierRejectedOutsideStripBoundsSamples = [];
    var terrainTopBarrierRejectedOutsideSortRangeSamples = [];
    var terrainTopBarrierTieSortMismatchSamples = [];
    var terrainTopBarrierPlaneMissButWouldAcceptSamples = [];
    var terrainTopBarrierSortKeyOnlyAcceptSamples = [];
    var terrainTopBarrierLegacyPlaneCandidateCount = 0;
    var terrainTopBarrierUpperPlaneCandidateCount = 0;
    var terrainTopBarrierIntervalPlaneCandidateCount = 0;
    var terrainTopBarrierWouldAcceptBySideUpperPlaneCount = 0;
    var terrainTopBarrierWouldAcceptBySortKeyOnlyCount = 0;
    var terrainTopBarrierTieSortMismatchCount = 0;
    var terrainTopBarrierPlaneMissButWouldAcceptCount = 0;
    var terrainTopBarrierSortKeyInsertionIndexCount = 0;
    var terrainTopBarrierTieSortInsertionIndexCount = 0;
    var terrainTopBarrierDiagnosticsOnlySuppressedSplitCount = 0;
    var terrainTopBarrierCorrectedAcceptedCount = 0;
    var terrainTopBarrierCorrectedSplitCount = 0;
    var terrainTopBarrierCorrectedCutPointCount = 0;
    var terrainTopBarrierCorrectedRejectedOutsideStripBoundsCount = 0;
    var terrainTopBarrierCorrectedRejectedOutsideSortRangeCount = 0;
    var terrainTopBarrierCorrectedRejectedNoInsertionIndexCount = 0;
    var terrainTopBarrierIndexSideCount = Number(sideBarrierIndex && sideBarrierIndex.indexedSideCount || 0);
    var terrainTopBarrierIndexPlaneCount = Number(sideBarrierIndex && sideBarrierIndex.planeCount || 0);
    var terrainTopBarrierIndexUpperPlaneCount = Number(sideBarrierIndex && sideBarrierIndex.upperPlaneCount || 0);
    var terrainTopBarrierIndexVerticalIntervalPlaneCount = Number(sideBarrierIndex && sideBarrierIndex.verticalIntervalPlaneCount || 0);
    var terrainTopBlockerSplitCount = 0;
    var terrainTopBlockerCutPointCount = 0;
    var terrainTopBlockerCount = 0;
    var terrainTopBlockerDirectHitCount = 0;
    var terrainTopBlockerInsertionHitCount = 0;
    var terrainTopBlockerExactCellHitCount = 0;
    var terrainTopBlockerAdjacentCellCandidateCount = 0;
    var terrainTopBlockerAdjacentCellAcceptedCount = 0;
    var terrainTopBlockerAdjacentCellRejectedCount = 0;
    var terrainTopBlockerStepWallCandidateCount = 0;
    var terrainTopBlockerStepWallAcceptedCount = 0;
    var terrainTopBlockerStepWallRejectedCount = 0;
    var terrainTopBlockerSortInsertionCandidateCount = 0;
    var terrainTopBlockerRejectedNonExactCount = 0;
    var terrainTopBlockerRejectedOutOfSortRangeCount = 0;
    var terrainTopBlockerAcceptedSamples = [];
    var terrainTopBlockerRejectedSamples = [];
    groups.forEach(function (faces) {
      if (!faces.length) return;
      var semanticFace = String(faces[0].semanticFace || 'top');
      var strips = null;
      var topOcclusionBreakCountForGroup = 0;
      if (semanticFace === 'top') {
        var rawTopStrips = extractTopStrips(faces);
        strips = [];
        for (var ti = 0; ti < rawTopStrips.length; ti++) {
          var topStrip = rawTopStrips[ti];
          var topBoundarySummary = summarizeTerrainTopStepBoundarySignaturesForStrip(topStrip);
          terrainTopStepBoundaryDescriptorCount += Number(topBoundarySummary.descriptorCount || 0);
          var topBoundarySigs = Array.isArray(topBoundarySummary.signatures) ? topBoundarySummary.signatures : [];
          for (var tbsi = 0; tbsi < topBoundarySigs.length; tbsi++) terrainTopStepBoundarySignatureSet[String(topBoundarySigs[tbsi])] = true;
          terrainTopStepBoundaryUniqueSignatureCount = Object.keys(terrainTopStepBoundarySignatureSet).length;
          if (topBoundarySummary.mixed) {
            terrainTopStepBoundaryMixedStripCount += 1;
            terrainTopStepBoundaryMixedMemberCount += Number(topBoundarySummary.descriptorCount || 0);
            terrainTopStepBoundaryWouldBreakCount += Number(topBoundarySummary.wouldBreakCount || 0);
            pushTopStepBoundaryDiagnosticSample(terrainTopStepBoundarySamples, topStrip, topBoundarySummary);
          }
          var barrierSplit = splitTopStripByTerrainBarriers(topStrip, sideBarrierIndex);
          terrainTopBarrierSplitCount += Number(barrierSplit.barrierSplitCount || 0);
          terrainTopBarrierCutPointCount += Number(barrierSplit.barrierCutPointCount || 0);
          terrainTopBarrierCandidateCount += Number(barrierSplit.barrierCandidateCount || 0);
          terrainTopBarrierAcceptedCount += Number(barrierSplit.barrierAcceptedCount || 0);
          terrainTopBarrierRejectedOutOfPlaneCount += Number(barrierSplit.barrierRejectedOutOfPlaneCount || 0);
          terrainTopBarrierRejectedOutsideStripBoundsCount += Number(barrierSplit.barrierRejectedOutsideStripBoundsCount || 0);
          terrainTopBarrierRejectedOutsideSortRangeCount += Number(barrierSplit.barrierRejectedOutsideSortRangeCount || 0);
          terrainTopBarrierRejectedNoInsertionIndexCount += Number(barrierSplit.barrierRejectedNoInsertionIndexCount || 0);
          terrainTopBarrierNonMonotonicStripCount += Number(barrierSplit.barrierNonMonotonicStripCount || 0);
          terrainTopBarrierMaxSegmentLength = Math.max(terrainTopBarrierMaxSegmentLength, Number(barrierSplit.barrierMaxSegmentLength || 0));
          if (barrierSplit && Array.isArray(barrierSplit.barrierSamples)) {
            for (var bai = 0; bai < barrierSplit.barrierSamples.length && terrainTopBarrierSamples.length < 12; bai++) {
              terrainTopBarrierSamples.push(barrierSplit.barrierSamples[bai]);
            }
          }
          terrainTopBarrierLegacyPlaneCandidateCount += Number(barrierSplit.barrierLegacyPlaneCandidateCount || 0);
          terrainTopBarrierUpperPlaneCandidateCount += Number(barrierSplit.barrierUpperPlaneCandidateCount || 0);
          terrainTopBarrierIntervalPlaneCandidateCount += Number(barrierSplit.barrierIntervalPlaneCandidateCount || 0);
          terrainTopBarrierWouldAcceptBySideUpperPlaneCount += Number(barrierSplit.barrierWouldAcceptBySideUpperPlaneCount || 0);
          terrainTopBarrierWouldAcceptBySortKeyOnlyCount += Number(barrierSplit.barrierWouldAcceptBySortKeyOnlyCount || 0);
          terrainTopBarrierTieSortMismatchCount += Number(barrierSplit.barrierTieSortMismatchCount || 0);
          terrainTopBarrierPlaneMissButWouldAcceptCount += Number(barrierSplit.barrierPlaneMissButWouldAcceptCount || 0);
          terrainTopBarrierSortKeyInsertionIndexCount += Number(barrierSplit.barrierSortKeyInsertionIndexCount || 0);
          terrainTopBarrierTieSortInsertionIndexCount += Number(barrierSplit.barrierTieSortInsertionIndexCount || 0);
          terrainTopBarrierDiagnosticsOnlySuppressedSplitCount += Number(barrierSplit.barrierDiagnosticsOnlySuppressedSplitCount || 0);
          terrainTopBarrierCorrectedAcceptedCount += Number(barrierSplit.correctedBarrierAcceptedCount || 0);
          terrainTopBarrierCorrectedSplitCount += Number(barrierSplit.correctedBarrierSplitCount || 0);
          terrainTopBarrierCorrectedCutPointCount += Number(barrierSplit.correctedBarrierCutPointCount || 0);
          terrainTopBarrierCorrectedRejectedOutsideStripBoundsCount += Number(barrierSplit.correctedBarrierRejectedOutsideStripBoundsCount || 0);
          terrainTopBarrierCorrectedRejectedOutsideSortRangeCount += Number(barrierSplit.correctedBarrierRejectedOutsideSortRangeCount || 0);
          terrainTopBarrierCorrectedRejectedNoInsertionIndexCount += Number(barrierSplit.correctedBarrierRejectedNoInsertionIndexCount || 0);
          function copyBarrierSamples(source, target, limit) {
            var src = Array.isArray(source) ? source : [];
            for (var csi = 0; csi < src.length && target.length < limit; csi++) target.push(src[csi]);
          }
          copyBarrierSamples(barrierSplit.barrierRejectedOutsideStripBoundsSamples, terrainTopBarrierRejectedOutsideStripBoundsSamples, 12);
          copyBarrierSamples(barrierSplit.barrierRejectedOutsideSortRangeSamples, terrainTopBarrierRejectedOutsideSortRangeSamples, 12);
          copyBarrierSamples(barrierSplit.barrierTieSortMismatchSamples, terrainTopBarrierTieSortMismatchSamples, 12);
          copyBarrierSamples(barrierSplit.barrierPlaneMissButWouldAcceptSamples, terrainTopBarrierPlaneMissButWouldAcceptSamples, 12);
          copyBarrierSamples(barrierSplit.barrierSortKeyOnlyAcceptSamples, terrainTopBarrierSortKeyOnlyAcceptSamples, 12);
          var blockerSegments = barrierSplit && Array.isArray(barrierSplit.segments) ? barrierSplit.segments : [topStrip];
          for (var bsi = 0; bsi < blockerSegments.length; bsi++) {
            var candidateSegment = blockerSegments[bsi];
            if (isOcclusionSafeTerrainTopStrip(candidateSegment)) {
              strips.push(candidateSegment);
            } else {
              var segments = splitStripIntoOcclusionSafeSegments(candidateSegment);
              topOcclusionBreakCountForGroup += Math.max(0, segments.length - 1);
              for (var tsi = 0; tsi < segments.length; tsi++) strips.push(segments[tsi]);
            }
          }
        }
      } else {
        var sideResult = extractSideStrips(faces);
        strips = sideResult && Array.isArray(sideResult.strips) ? sideResult.strips : [];
        sideStepBreakCount += Number(sideResult && sideResult.breakCount || 0);
      }
      terrainTopOcclusionBreakCount += topOcclusionBreakCountForGroup;
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
      terrainTopOcclusionBreakCount: terrainTopOcclusionBreakCount,
      terrainTopStepBoundaryDescriptorCount: terrainTopStepBoundaryDescriptorCount,
      terrainTopStepBoundaryUniqueSignatureCount: terrainTopStepBoundaryUniqueSignatureCount,
      terrainTopStepBoundaryMixedStripCount: terrainTopStepBoundaryMixedStripCount,
      terrainTopStepBoundaryMixedMemberCount: terrainTopStepBoundaryMixedMemberCount,
      terrainTopStepBoundaryWouldBreakCount: terrainTopStepBoundaryWouldBreakCount,
      terrainTopStepBoundarySamples: terrainTopStepBoundarySamples,
      terrainTopStepBoundaryMergeKeyEnabled: !!topStepBoundaryMergeKeyEnabled,
      terrainTopBarrierSplitCount: terrainTopBarrierSplitCount,
      terrainTopBarrierCutPointCount: terrainTopBarrierCutPointCount,
      terrainTopBarrierCandidateCount: terrainTopBarrierCandidateCount,
      terrainTopBarrierAcceptedCount: terrainTopBarrierAcceptedCount,
      terrainTopBarrierRejectedOutOfPlaneCount: terrainTopBarrierRejectedOutOfPlaneCount,
      terrainTopBarrierRejectedOutsideStripBoundsCount: terrainTopBarrierRejectedOutsideStripBoundsCount,
      terrainTopBarrierRejectedOutsideSortRangeCount: terrainTopBarrierRejectedOutsideSortRangeCount,
      terrainTopBarrierRejectedNoInsertionIndexCount: terrainTopBarrierRejectedNoInsertionIndexCount,
      terrainTopBarrierNonMonotonicStripCount: terrainTopBarrierNonMonotonicStripCount,
      terrainTopBarrierMaxSegmentLength: terrainTopBarrierMaxSegmentLength,
      terrainTopBarrierIndexSideCount: terrainTopBarrierIndexSideCount,
      terrainTopBarrierIndexPlaneCount: terrainTopBarrierIndexPlaneCount,
      terrainTopBarrierIndexUpperPlaneCount: terrainTopBarrierIndexUpperPlaneCount,
      terrainTopBarrierIndexVerticalIntervalPlaneCount: terrainTopBarrierIndexVerticalIntervalPlaneCount,
      terrainTopBarrierLegacyPlaneCandidateCount: terrainTopBarrierLegacyPlaneCandidateCount,
      terrainTopBarrierUpperPlaneCandidateCount: terrainTopBarrierUpperPlaneCandidateCount,
      terrainTopBarrierIntervalPlaneCandidateCount: terrainTopBarrierIntervalPlaneCandidateCount,
      terrainTopBarrierWouldAcceptBySideUpperPlaneCount: terrainTopBarrierWouldAcceptBySideUpperPlaneCount,
      terrainTopBarrierWouldAcceptBySortKeyOnlyCount: terrainTopBarrierWouldAcceptBySortKeyOnlyCount,
      terrainTopBarrierTieSortMismatchCount: terrainTopBarrierTieSortMismatchCount,
      terrainTopBarrierPlaneMissButWouldAcceptCount: terrainTopBarrierPlaneMissButWouldAcceptCount,
      terrainTopBarrierSortKeyInsertionIndexCount: terrainTopBarrierSortKeyInsertionIndexCount,
      terrainTopBarrierTieSortInsertionIndexCount: terrainTopBarrierTieSortInsertionIndexCount,
      terrainTopBarrierDiagnosticsOnlySuppressedSplitCount: terrainTopBarrierDiagnosticsOnlySuppressedSplitCount,
      terrainTopBarrierCorrectedAcceptedCount: terrainTopBarrierCorrectedAcceptedCount,
      terrainTopBarrierCorrectedSplitCount: terrainTopBarrierCorrectedSplitCount,
      terrainTopBarrierCorrectedCutPointCount: terrainTopBarrierCorrectedCutPointCount,
      terrainTopBarrierCorrectedRejectedOutsideStripBoundsCount: terrainTopBarrierCorrectedRejectedOutsideStripBoundsCount,
      terrainTopBarrierCorrectedRejectedOutsideSortRangeCount: terrainTopBarrierCorrectedRejectedOutsideSortRangeCount,
      terrainTopBarrierCorrectedRejectedNoInsertionIndexCount: terrainTopBarrierCorrectedRejectedNoInsertionIndexCount,
      terrainTopBarrierSamples: terrainTopBarrierSamples,
      terrainTopBarrierRejectedOutsideStripBoundsSamples: terrainTopBarrierRejectedOutsideStripBoundsSamples,
      terrainTopBarrierRejectedOutsideSortRangeSamples: terrainTopBarrierRejectedOutsideSortRangeSamples,
      terrainTopBarrierTieSortMismatchSamples: terrainTopBarrierTieSortMismatchSamples,
      terrainTopBarrierPlaneMissButWouldAcceptSamples: terrainTopBarrierPlaneMissButWouldAcceptSamples,
      terrainTopBarrierSortKeyOnlyAcceptSamples: terrainTopBarrierSortKeyOnlyAcceptSamples,
      terrainTopBlockerSplitCount: terrainTopBlockerSplitCount,
      terrainTopBlockerCutPointCount: terrainTopBlockerCutPointCount,
      terrainTopBlockerCount: terrainTopBlockerCount,
      terrainTopBlockerDirectHitCount: terrainTopBlockerDirectHitCount,
      terrainTopBlockerInsertionHitCount: terrainTopBlockerInsertionHitCount,
      terrainTopBlockerExactCellHitCount: terrainTopBlockerExactCellHitCount,
      terrainTopBlockerAdjacentCellCandidateCount: terrainTopBlockerAdjacentCellCandidateCount,
      terrainTopBlockerAdjacentCellAcceptedCount: terrainTopBlockerAdjacentCellAcceptedCount,
      terrainTopBlockerAdjacentCellRejectedCount: terrainTopBlockerAdjacentCellRejectedCount,
      terrainTopBlockerStepWallCandidateCount: terrainTopBlockerStepWallCandidateCount,
      terrainTopBlockerStepWallAcceptedCount: terrainTopBlockerStepWallAcceptedCount,
      terrainTopBlockerStepWallRejectedCount: terrainTopBlockerStepWallRejectedCount,
      terrainTopBlockerSortInsertionCandidateCount: terrainTopBlockerSortInsertionCandidateCount,
      terrainTopBlockerRejectedNonExactCount: terrainTopBlockerRejectedNonExactCount,
      terrainTopBlockerRejectedOutOfSortRangeCount: terrainTopBlockerRejectedOutOfSortRangeCount,
      terrainTopBlockerAcceptedSamples: terrainTopBlockerAcceptedSamples,
      terrainTopBlockerRejectedSamples: terrainTopBlockerRejectedSamples,
      mergeStrategy: topStepBoundaryMergeKeyEnabled
        ? 'top-step-boundary-merge-key-active+barrier-frozen-diagnostics-only'
        : 'top-step-boundary-diagnostics-only+barrier-frozen-diagnostics-only'
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    mergeTerrainFaceDescriptors: mergeTerrainFaceDescriptors,
    summarizeTerrainTopStepBoundarySignaturesForStrip: summarizeTerrainTopStepBoundarySignaturesForStrip
  };
  try {
    window.__TERRAIN_FACE_MERGE_CORE__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('core.terrainFaceMerge', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
})();
