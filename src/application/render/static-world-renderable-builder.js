// Application renderable builder for static world chunks.
// Owns world/chunk/cell -> renderable packet construction flow.
// No DOM, no canvas context, no Image, no storage, no platform API.

(function (global) {
  'use strict';

  var OWNER = 'src/application/render/static-world-renderable-builder.js';
  var PHASE = 'P6A-STATIC-WORLD-RENDERABLE-BUILDER';

  function noop() {}
  function nullFn() { return null; }
  function emptyObjectFn() { return {}; }
  function defaultPerfNow() {
    try { if (global && global.performance && typeof global.performance.now === 'function') return global.performance.now(); } catch (_) {}
    return Date.now();
  }
  function resolveFunction(deps, name, fallback) {
    if (deps && typeof deps[name] === 'function') return deps[name];
    try { if (global && typeof global[name] === 'function') return global[name]; } catch (_) {}
    return fallback || nullFn;
  }
  function defaultCompareRenderablesByDomain(a, b) {
    var ak = Number(a && a.sortKey || 0);
    var bk = Number(b && b.sortKey || 0);
    if (ak !== bk) return ak - bk;
    return Number(a && a.tie || 0) - Number(b && b.tie || 0);
  }
  function requireStaticWorldFaceDescriptorBuilder(deps) {
    var api = deps && deps.staticWorldFaceDescriptorBuilder ? deps.staticWorldFaceDescriptorBuilder : null;
    try { api = api || (global && (global.__STATIC_WORLD_FACE_DESCRIPTOR_BUILDER__ || global.__APP_APPLICATION_STATIC_WORLD_FACE_DESCRIPTOR_BUILDER__)); } catch (_) {}
    if (!api || typeof api.buildStaticWorldFaceDescriptors !== 'function') {
      throw new Error('Missing static world face descriptor builder owner');
    }
    return api;
  }

  function safeJson(value) {
    try { return JSON.stringify(value); } catch (_) { return 'null'; }
  }

  function emitStaticFaceRotationDiagnostic(section, payload) {
    try {
      var prefix = '[pixi-migration][step=PXM-07.14M][static-face-rotation-' + String(section || 'event') + ']';
      var parts = [prefix];
      payload = payload || {};
      Object.keys(payload).forEach(function (key) {
        var value = payload[key];
        if (value && typeof value === 'object') value = safeJson(value);
        parts.push(String(key) + '=' + String(value));
      });
      var line = parts.join(' ');
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function getItemFacingCoreApiForStaticRotationDiagnostics() {
    try {
      if (global && global.App && global.App.domain && global.App.domain.itemFacingCore) return global.App.domain.itemFacingCore;
    } catch (_) {}
    try { if (global && global.__ITEM_FACING_CORE__) return global.__ITEM_FACING_CORE__; } catch (_) {}
    return null;
  }

  function inferWorldPlaneFromFacePoints(points) {
    var pts = Array.isArray(points) ? points : [];
    if (!pts.length) return 'empty';
    var first = pts[0] || {};
    var sameX = true;
    var sameY = true;
    var sameZ = true;
    var eps = 1e-6;
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i] || {};
      if (Math.abs(Number(p.x || 0) - Number(first.x || 0)) > eps) sameX = false;
      if (Math.abs(Number(p.y || 0) - Number(first.y || 0)) > eps) sameY = false;
      if (Math.abs(Number(p.z || 0) - Number(first.z || 0)) > eps) sameZ = false;
    }
    if (sameZ) return 'z=' + String(Number(first.z || 0));
    if (sameX) return 'x=' + String(Number(first.x || 0));
    if (sameY) return 'y=' + String(Number(first.y || 0));
    return 'non-planar-or-merged';
  }

  function signedArea2d(points) {
    var pts = Array.isArray(points) ? points : [];
    if (pts.length < 3) return 0;
    var area = 0;
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i] || {};
      var b = pts[(i + 1) % pts.length] || {};
      area += (Number(a.x || 0) * Number(b.y || 0)) - (Number(b.x || 0) * Number(a.y || 0));
    }
    return area * 0.5;
  }

  function summarizeCountsBy(items, getter) {
    var out = Object.create(null);
    var list = Array.isArray(items) ? items : [];
    for (var i = 0; i < list.length; i++) {
      var key = 'unknown';
      try { key = String(getter(list[i]) || 'unknown'); } catch (_) {}
      out[key] = Number(out[key] || 0) + 1;
    }
    return out;
  }

  function shouldEmitStaticFaceRotationDiagnostics(currentViewRotation) {
    var rot = ((Math.round(Number(currentViewRotation || 0)) % 4) + 4) % 4;
    if (rot === 2 || rot === 3) return true;
    try { return global.localStorage && global.localStorage.getItem('pixiFaceRotationDiagnosticVerbose') === '1'; } catch (_) {}
    return false;
  }

  function buildVisibleMappingForPacketRotation(packet, currentViewRotation) {
    var facingApi = getItemFacingCoreApiForStaticRotationDiagnostics();
    var itemFacing = Number(packet && packet.itemRotation != null ? packet.itemRotation : (packet && packet.box && packet.box.rotation != null ? packet.box.rotation : 0)) || 0;
    if (facingApi && typeof facingApi.getVisibleSemanticFaceMapping === 'function') {
      try { return facingApi.getVisibleSemanticFaceMapping({ itemFacing: itemFacing, viewRotation: currentViewRotation }); } catch (_) {}
    }
    return null;
  }

  function emitStaticFaceRotationPacketDiagnostics(args) {
    var src = args && typeof args === 'object' ? args : {};
    var packets = Array.isArray(src.packets) ? src.packets : [];
    var currentViewRotation = Number(src.currentViewRotation || 0);
    if (!packets.length || !shouldEmitStaticFaceRotationDiagnostics(currentViewRotation)) return;
    var screenPointsFromWorldFaceNoCamera = src.screenPointsFromWorldFaceNoCamera;
    var faceCountsBySemantic = summarizeCountsBy(packets, function (p) { return p.semanticFace; });
    var faceCountsByScreen = summarizeCountsBy(packets, function (p) { return p.screenFace; });
    var faceCountsByPlane = summarizeCountsBy(packets, function (p) { return inferWorldPlaneFromFacePoints(p.worldPts); });
    var mergedCount = 0;
    var areaNegativeCount = 0;
    var areaPositiveCount = 0;
    var areaZeroCount = 0;
    var samples = [];
    var sampleLimit = 12;
    for (var i = 0; i < packets.length; i++) {
      var packet = packets[i] || {};
      if (packet.mergedFace === true) mergedCount += 1;
      var projected = [];
      var area = 0;
      var areaSign = 'n/a';
      if (typeof screenPointsFromWorldFaceNoCamera === 'function') {
        try { projected = screenPointsFromWorldFaceNoCamera(packet.worldPts || [], currentViewRotation) || []; } catch (_) { projected = []; }
        area = signedArea2d(projected);
        if (area > 1e-6) { areaSign = 'positive'; areaPositiveCount += 1; }
        else if (area < -1e-6) { areaSign = 'negative'; areaNegativeCount += 1; }
        else { areaSign = 'zero'; areaZeroCount += 1; }
      }
      if (samples.length < sampleLimit) {
        var mapping = buildVisibleMappingForPacketRotation(packet, currentViewRotation);
        samples.push({
          id: packet.id || null,
          chunkKey: packet.chunkKey || null,
          instanceId: packet.instanceId || null,
          prefabId: packet.prefabId || null,
          itemRotation: packet.itemRotation != null ? Number(packet.itemRotation) : null,
          viewRotation: currentViewRotation,
          semanticFace: packet.semanticFace || null,
          screenFace: packet.screenFace || null,
          visibleFaces: mapping && Array.isArray(mapping.visibleFaces) ? mapping.visibleFaces.slice() : null,
          screenFaces: mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : null,
          effectiveFacing: mapping && mapping.effectiveFacing != null ? mapping.effectiveFacing : null,
          mergedFace: packet.mergedFace === true,
          mergedFaceCount: Number(packet.mergedFaceCount || 1),
          cell: { x: Number(packet.cellX || 0), y: Number(packet.cellY || 0), z: Number(packet.cellZ || 0) },
          actualWorldPlane: inferWorldPlaneFromFacePoints(packet.worldPts || []),
          projectedAreaSign: areaSign,
          projectedArea: Number(Number(area || 0).toFixed(3)),
          fill: packet.fill || null,
          stroke: packet.stroke || null
        });
      }
    }
    emitStaticFaceRotationDiagnostic('summary', {
      chunkKey: src.chunkKey || null,
      viewRotation: currentViewRotation,
      packetCount: packets.length,
      mergedPacketCount: mergedCount,
      faceMergeMode: src.faceMergeMode || null,
      faceCountsBySemantic: faceCountsBySemantic,
      faceCountsByScreen: faceCountsByScreen,
      faceCountsByPlane: faceCountsByPlane,
      projectedAreaPositiveCount: areaPositiveCount,
      projectedAreaNegativeCount: areaNegativeCount,
      projectedAreaZeroCount: areaZeroCount,
      sampleCount: samples.length,
      samples: samples
    });
  }

  function requireStaticWorldPacketOrdering(deps) {
    var api = deps && deps.staticWorldPacketOrdering ? deps.staticWorldPacketOrdering : null;
    try { api = api || (global && (global.__STATIC_WORLD_PACKET_ORDERING__ || global.__APP_APPLICATION_STATIC_WORLD_PACKET_ORDERING__)); } catch (_) {}
    if (!api || typeof api.buildStaticWorldPacketIdentity !== 'function' || typeof api.sortStaticWorldPackets !== 'function') {
      throw new Error('Missing static world packet ordering owner');
    }
    return api;
  }


  function emitTerrainMergeStackDiagnostic(section, payload) {
    try {
      var prefix = '[pixi-migration][step=PXM-07.14P][terrain-merge-stack-' + String(section || 'event') + ']';
      var parts = [prefix];
      payload = payload || {};
      Object.keys(payload).forEach(function (key) {
        var value = payload[key];
        if (value && typeof value === 'object') value = safeJson(value);
        parts.push(String(key) + '=' + String(value));
      });
      var line = parts.join(' ');
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function isTerrainStaticPacketForStackDiagnostics(packet) {
    if (!packet || typeof packet !== 'object') return false;
    if (packet.terrainMaterialId != null || packet.terrainMaterialLabel != null || packet.terrainMaterialMergeKey != null) return true;
    var iid = String(packet.instanceId || '');
    if (iid.indexOf('terrain-') === 0) return true;
    var id = String(packet.id || '');
    return id.indexOf('voxel-merge-terrain-') === 0 || (id.indexOf('voxel-') === 0 && iid.indexOf('terrain-') === 0);
  }

  function summarizePacketMembersForStackDiagnostics(packet) {
    var members = Array.isArray(packet && packet.actorInteractionMemberDescriptors) && packet.actorInteractionMemberDescriptors.length
      ? packet.actorInteractionMemberDescriptors
      : [];
    var baseX = Number(packet && packet.cellX || 0);
    var baseY = Number(packet && packet.cellY || 0);
    var baseZ = Number(packet && packet.cellZ || 0);
    var out = {
      memberCount: members.length || Number(packet && packet.mergedFaceCount || 1),
      minX: baseX, maxX: baseX,
      minY: baseY, maxY: baseY,
      minZ: baseZ, maxZ: baseZ,
      minSortKey: Number(packet && packet.sortKey || 0), maxSortKey: Number(packet && packet.sortKey || 0),
      minTie: Number(packet && packet.tie || 0), maxTie: Number(packet && packet.tie || 0),
      semanticFaceCounts: Object.create(null)
    };
    if (!members.length) {
      out.semanticFaceCounts[String(packet && packet.semanticFace || 'unknown')] = 1;
      out.xSpan = out.ySpan = out.zSpan = out.sortSpan = out.tieSpan = 0;
      return out;
    }
    for (var i = 0; i < members.length; i++) {
      var m = members[i] || {};
      var cell = m.cell || m.box || {};
      var x = Number(cell.x || 0), y = Number(cell.y || 0), z = Number(cell.z || 0);
      var sk = Number(m.sortKey != null ? m.sortKey : (packet && packet.sortKey || 0));
      var tie = Number(m.tie != null ? m.tie : (packet && packet.tie || 0));
      if (i === 0) {
        out.minX = out.maxX = x; out.minY = out.maxY = y; out.minZ = out.maxZ = z;
        out.minSortKey = out.maxSortKey = sk; out.minTie = out.maxTie = tie;
      } else {
        out.minX = Math.min(out.minX, x); out.maxX = Math.max(out.maxX, x);
        out.minY = Math.min(out.minY, y); out.maxY = Math.max(out.maxY, y);
        out.minZ = Math.min(out.minZ, z); out.maxZ = Math.max(out.maxZ, z);
        out.minSortKey = Math.min(out.minSortKey, sk); out.maxSortKey = Math.max(out.maxSortKey, sk);
        out.minTie = Math.min(out.minTie, tie); out.maxTie = Math.max(out.maxTie, tie);
      }
      var sf = String(m.semanticFace || (packet && packet.semanticFace) || 'unknown');
      out.semanticFaceCounts[sf] = Number(out.semanticFaceCounts[sf] || 0) + 1;
    }
    out.xSpan = Number((out.maxX - out.minX).toFixed(3));
    out.ySpan = Number((out.maxY - out.minY).toFixed(3));
    out.zSpan = Number((out.maxZ - out.minZ).toFixed(3));
    out.sortSpan = Number((out.maxSortKey - out.minSortKey).toFixed(3));
    out.tieSpan = Number((out.maxTie - out.minTie).toFixed(3));
    return out;
  }

  function projectPacketBoundsForStackDiagnostics(packet, screenPointsFromWorldFaceNoCamera, currentViewRotation) {
    var points = [];
    try {
      if (typeof screenPointsFromWorldFaceNoCamera === 'function') points = screenPointsFromWorldFaceNoCamera(packet && packet.worldPts || [], currentViewRotation) || [];
    } catch (_) { points = []; }
    if (!Array.isArray(points) || points.length <= 0) return { exists: false };
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < points.length; i++) {
      var pt = points[i] || {};
      var x = Number(pt.x || 0), y = Number(pt.y || 0);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return { exists: true, minX: Number(minX.toFixed(3)), minY: Number(minY.toFixed(3)), maxX: Number(maxX.toFixed(3)), maxY: Number(maxY.toFixed(3)), width: Number(Math.max(0, maxX - minX).toFixed(3)), height: Number(Math.max(0, maxY - minY).toFixed(3)), centerX: Number(((minX + maxX) / 2).toFixed(3)), centerY: Number(((minY + maxY) / 2).toFixed(3)) };
  }

  function computeBoundsOverlapAreaForStackDiagnostics(a, b) {
    if (!a || !b || a.exists === false || b.exists === false) return 0;
    var ix = Math.max(0, Math.min(Number(a.maxX || 0), Number(b.maxX || 0)) - Math.max(Number(a.minX || 0), Number(b.minX || 0)));
    var iy = Math.max(0, Math.min(Number(a.maxY || 0), Number(b.maxY || 0)) - Math.max(Number(a.minY || 0), Number(b.minY || 0)));
    return ix * iy;
  }

  function emitTerrainMergeStackPacketDiagnostics(args) {
    var src = args && typeof args === 'object' ? args : {};
    var packets = Array.isArray(src.packets) ? src.packets : [];
    var currentViewRotation = Number(src.currentViewRotation || 0);
    var chunkKey = src.chunkKey || null;
    var screenPointsFromWorldFaceNoCamera = src.screenPointsFromWorldFaceNoCamera;
    if (!packets.length) return;
    var terrain = [];
    for (var i = 0; i < packets.length; i++) {
      var p = packets[i] || {};
      if (!isTerrainStaticPacketForStackDiagnostics(p)) continue;
      terrain.push({ packet: p, orderIndex: i, bounds: projectPacketBoundsForStackDiagnostics(p, screenPointsFromWorldFaceNoCamera, currentViewRotation), members: summarizePacketMembersForStackDiagnostics(p) });
    }
    if (!terrain.length) return;
    var merged = terrain.filter(function (entry) { return entry.packet && entry.packet.mergedFace === true; });
    var mergedTop = merged.filter(function (entry) { return String(entry.packet && entry.packet.semanticFace || '') === 'top'; });
    var side = terrain.filter(function (entry) {
      var sf = String(entry.packet && entry.packet.semanticFace || '');
      return sf === 'north' || sf === 'south' || sf === 'east' || sf === 'west';
    });
    var overlapRisks = [];
    var riskLimit = 18;
    for (var a = 0; a < mergedTop.length; a++) {
      var top = mergedTop[a];
      for (var b = 0; b < side.length; b++) {
        var s = side[b];
        var overlap = computeBoundsOverlapAreaForStackDiagnostics(top.bounds, s.bounds);
        if (overlap <= 1) continue;
        var orderDelta = Number(s.orderIndex || 0) - Number(top.orderIndex || 0);
        overlapRisks.push({
          overlapArea: Number(overlap.toFixed(3)),
          orderDelta: orderDelta,
          topOrderIndex: top.orderIndex,
          sideOrderIndex: s.orderIndex,
          topId: top.packet.id || null,
          sideId: s.packet.id || null,
          topFace: top.packet.semanticFace || null,
          sideFace: s.packet.semanticFace || null,
          topSortKey: Number(top.packet.sortKey || 0),
          sideSortKey: Number(s.packet.sortKey || 0),
          topTie: Number(top.packet.tie || 0),
          sideTie: Number(s.packet.tie || 0),
          topMembers: top.members,
          sideMembers: s.members,
          topBounds: top.bounds,
          sideBounds: s.bounds
        });
      }
    }
    overlapRisks.sort(function (a, b) { return Number(b.overlapArea || 0) - Number(a.overlapArea || 0); });
    var largeMerged = merged.slice().sort(function (a, b) { return Number(b.packet.mergedFaceCount || 1) - Number(a.packet.mergedFaceCount || 1); }).slice(0, 12).map(function (entry) {
      return {
        id: entry.packet.id || null,
        semanticFace: entry.packet.semanticFace || null,
        orderIndex: entry.orderIndex,
        sortKey: Number(entry.packet.sortKey || 0),
        tie: Number(entry.packet.tie || 0),
        mergedFaceCount: Number(entry.packet.mergedFaceCount || 1),
        mergeWidth: Number(entry.packet.mergeWidth || 1),
        mergeHeight: Number(entry.packet.mergeHeight || 1),
        cell: { x: Number(entry.packet.cellX || 0), y: Number(entry.packet.cellY || 0), z: Number(entry.packet.cellZ || 0) },
        plane: inferWorldPlaneFromFacePoints(entry.packet.worldPts || []),
        bounds: entry.bounds,
        members: entry.members
      };
    });
    emitTerrainMergeStackDiagnostic('summary', {
      diagnosticOnly: true,
      chunkKey: chunkKey,
      viewRotation: currentViewRotation,
      faceMergeMode: src.faceMergeMode || null,
      terrainPacketCount: terrain.length,
      mergedTerrainPacketCount: merged.length,
      mergedTerrainTopPacketCount: mergedTop.length,
      terrainSidePacketCount: side.length,
      topSideOverlapRiskCount: overlapRisks.length,
      maxTopSideOverlapArea: overlapRisks.length ? overlapRisks[0].overlapArea : 0,
      sampleTopSideOverlapRisks: overlapRisks.slice(0, riskLimit),
      sampleLargeMergedTerrainPackets: largeMerged
    });
  }

  function getLiquidRenderCoreApi() {
    try {
      return (global && (global.__LIQUID_RENDER_CORE__ || (global.App && global.App.domain && global.App.domain.liquidRenderCore))) || null;
    } catch (_) { return null; }
  }

  function getTerrainHeightSurfaceRenderCoreApi() {
    try {
      return (global && (global.__TERRAIN_HEIGHT_SURFACE_RENDER_CORE__ || (global.App && global.App.domain && global.App.domain.terrainHeightSurfaceRenderCore))) || null;
    } catch (_) { return null; }
  }

  function getTerrainHeightSurfaceConfigCoreApi() {
    try {
      return (global && (global.__TERRAIN_HEIGHT_SURFACE_CONFIG_CORE__ || (global.App && global.App.domain && global.App.domain.terrainHeightSurfaceConfigCore))) || null;
    } catch (_) { return null; }
  }

  function isTerrainHeightSurfaceEnabled() {
    var api = getTerrainHeightSurfaceConfigCoreApi();
    if (api && typeof api.getEnabled === 'function') {
      try { return api.getEnabled() !== false; } catch (_) {}
    }
    return true;
  }

  function getTerrainHeightSurfaceConnectThreshold() {
    var api = getTerrainHeightSurfaceConfigCoreApi();
    if (api && typeof api.getConnectThreshold === 'function') {
      try { return api.getConnectThreshold(); } catch (_) {}
    }
    return 0.35;
  }

  function getTerrainHeightSurfaceSubdivisions() {
    var api = getTerrainHeightSurfaceConfigCoreApi();
    if (api && typeof api.getSurfaceSubdivisions === 'function') {
      try { return api.getSurfaceSubdivisions(); } catch (_) {}
    }
    return 4;
  }

  function getTerrainHeightSurfaceTopLinesEnabled() {
    var api = getTerrainHeightSurfaceConfigCoreApi();
    if (api && typeof api.getTopLinesEnabled === 'function') {
      try { return api.getTopLinesEnabled(); } catch (_) {}
    }
    return false;
  }

  function isTerrainHeightSurfaceBox(box) {
    if (!box || typeof box !== 'object') return false;
    var shapeKind = String(box.shapeKind || '').toLowerCase();
    var kind = String(box.kind || '').toLowerCase();
    var prefabId = String(box.prefabId || '').toLowerCase();
    return shapeKind === 'terrain_height_surface'
      || kind === 'terrain_height_surface'
      || prefabId.indexOf('terrain_height_') === 0
      || box.terrainHeightSurfacePrototype === true;
  }

  function getFluidRenderConfigCoreApi() {
    try {
      return (global && (global.__FLUID_RENDER_CONFIG_CORE__ || (global.App && global.App.domain && global.App.domain.fluidRenderConfigCore))) || null;
    } catch (_) { return null; }
  }

  function getFluidSurfaceSubdivisions() {
    var api = getFluidRenderConfigCoreApi();
    if (api && typeof api.getSurfaceSubdivisions === 'function') {
      try { return api.getSurfaceSubdivisions(); } catch (_) {}
    }
    return 2;
  }

  function getFluidEdgeCurveStrength() {
    var api = getFluidRenderConfigCoreApi();
    if (api && typeof api.getEdgeCurveStrength === 'function') {
      try { return api.getEdgeCurveStrength(); } catch (_) {}
    }
    return 0;
  }

  function getFluidTopSubdivisionLinesEnabled() {
    var api = getFluidRenderConfigCoreApi();
    if (api && typeof api.getTopSubdivisionLinesEnabled === 'function') {
      try { return api.getTopSubdivisionLinesEnabled(); } catch (_) {}
    }
    return true;
  }

  function isLiquidLikeRenderBoxForStaticVisibility(box) {
    if (!box || typeof box !== 'object') return false;
    var shapeKind = String(box.shapeKind || '').toLowerCase();
    var prefabId = String(box.prefabId || '').toLowerCase();
    var kind = String(box.kind || '').toLowerCase();
    var liquidType = String(box.liquidType || box.fluidType || '').toLowerCase();
    return shapeKind === 'liquid_water'
      || kind === 'liquid_water'
      || prefabId.indexOf('liquid_water') === 0
      || liquidType === 'water';
  }

  function containsLiquidLikeRenderBox(list) {
    var boxes = Array.isArray(list) ? list : [];
    for (var i = 0; i < boxes.length; i++) {
      if (isLiquidLikeRenderBoxForStaticVisibility(boxes[i])) return true;
    }
    return false;
  }

  function buildVisibilityOccupancyWithoutLiquids(chunkBoxes, neighborBoxes, visibilityCore, fallbackReader) {
    // Do not use scene-level render occupancy when liquid boxes are present.
    // That global occupancy can include liquid cells, and liquid must not cull
    // cube side faces.  Build a visibility-only structured occupancy through
    // render-visibility-core; it deliberately excludes liquid-like cells.
    var local = Array.isArray(chunkBoxes) ? chunkBoxes : [];
    var neighbors = Array.isArray(neighborBoxes) ? neighborBoxes : [];
    if (!containsLiquidLikeRenderBox(local) && !containsLiquidLikeRenderBox(neighbors)) return fallbackReader;
    if (visibilityCore && typeof visibilityCore.buildStructuredVoxelOccupancy === 'function') {
      try { return visibilityCore.buildStructuredVoxelOccupancy(local.concat(neighbors)); } catch (_) {}
    }
    return fallbackReader;
  }

  function liquidPacketFaceTie(face) {
    var f = String(face || '');
    if (f === 'top') return 0.004;
    if (f === 'east') return 0.003;
    if (f === 'south') return 0.0035;
    return 0.002;
  }

  function liquidPacketSortOffset(face) {
    // Liquid is not a separate under-object layer. It is a normal world packet:
    // rules prevent same-cell solid overlap, and sorting follows the same
    // voxel footprint order as ordinary static boxes.
    return 0;
  }

  function averageWorldPoint(points) {
    var pts = Array.isArray(points) ? points : [];
    if (!pts.length) return { x: 0, y: 0, z: 0 };
    var x = 0, y = 0, z = 0;
    for (var i = 0; i < pts.length; i++) {
      x += Number(pts[i] && pts[i].x || 0);
      y += Number(pts[i] && pts[i].y || 0);
      z += Number(pts[i] && pts[i].z || 0);
    }
    return { x: x / pts.length, y: y / pts.length, z: z / pts.length };
  }

  function getLiquidSortHeight(sortCell) {
    var h = Number(sortCell && (sortCell.renderWaterLevel != null ? sortCell.renderWaterLevel : (sortCell.liquidDepth != null ? sortCell.liquidDepth : sortCell.h)));
    if (!Number.isFinite(h) || h <= 0) h = 0.001;
    return Math.max(0.001, Math.min(1, h));
  }

  function computeLiquidRenderableSortMeta(sortCell, currentViewRotation, computeViewAwareSortMeta, domainCore) {
    var cellX = Number(sortCell && sortCell.x || 0);
    var cellY = Number(sortCell && sortCell.y || 0);
    var cellZ = Number(sortCell && sortCell.z || 0);
    var h = getLiquidSortHeight(sortCell);
    if (domainCore && typeof domainCore.computeVoxelRenderableSort === 'function') {
      try {
        return domainCore.computeVoxelRenderableSort({
          cell: { x: cellX, y: cellY, z: cellZ, w: 1, d: 1, h: h },
          x: cellX,
          y: cellY,
          z: cellZ,
          w: 1,
          d: 1,
          h: h,
          viewRotation: currentViewRotation
        }) || {};
      } catch (_) {}
    }
    if (typeof computeViewAwareSortMeta === 'function') {
      try { return computeViewAwareSortMeta({ x: cellX, y: cellY, z: cellZ }, h, currentViewRotation) || {}; } catch (_) {}
    }
    return { sortKey: cellX + cellY + cellZ + h, tie: cellZ * 100000 + cellY * 100 + cellX };
  }

  function buildLiquidRenderPacketsForChunk(localBoxes, neighborBoxes, currentViewRotation, computeViewAwareSortMeta, domainCore) {
    var api = getLiquidRenderCoreApi();
    if (!api || typeof api.buildLiquidFaces !== 'function') return [];
    var local = Array.isArray(localBoxes) ? localBoxes : [];
    var all = local.concat(Array.isArray(neighborBoxes) ? neighborBoxes : []);
    var faces = [];
    try { faces = api.buildLiquidFaces(local, all, { currentViewRotation: currentViewRotation, surfaceSubdivisions: getFluidSurfaceSubdivisions(), edgeCurveStrength: getFluidEdgeCurveStrength(), topSubdivisionLinesEnabled: getFluidTopSubdivisionLinesEnabled() }) || []; } catch (_) { faces = []; }
    var packets = [];
    for (var i = 0; i < faces.length; i++) {
      var face = faces[i] || {};
      var cell = face.cell || null;
      // liquid-render-core keeps cell as source-free face geometry; recover a stable
      // cell anchor from the world face if no cell reference is carried.
      var anchor = averageWorldPoint(face.worldPts || []);
      var sortCell = cell || { x: Math.floor(Number(anchor.x || 0)), y: Math.floor(Number(anchor.y || 0)), z: Math.floor(Number(anchor.z || 0)) };
      var orderMeta = computeLiquidRenderableSortMeta(sortCell, currentViewRotation, computeViewAwareSortMeta, domainCore);
      orderMeta = orderMeta || {};
      var semanticFace = String(face.semanticFace || 'top');
      var screenFace = String(face.screenFace || semanticFace);
      var cellX = Number(sortCell.x || 0);
      var cellY = Number(sortCell.y || 0);
      var cellZ = Number(sortCell.z || 0);
      var edgeHint = String(face.edgeHint || 'none');
      var id = 'liquid-water-' + cellX + '-' + cellY + '-' + cellZ + '-' + semanticFace + '-' + String(face.liquidFaceKind || 'face') + '-' + edgeHint;
      packets.push({
        id: id,
        kind: 'static-world-face-packet',
        liquidRenderPacket: true,
        liquidFaceKind: face.liquidFaceKind || null,
        edgeHint: face.edgeHint || null,
        sortKey: Number(orderMeta.sortKey || ((cellX + cellY) * 100 + cellZ * 10)) + liquidPacketSortOffset(screenFace),
        tie: Number(orderMeta.tie || 0) + liquidPacketFaceTie(screenFace),
        sortViewRotation: currentViewRotation,
        itemRotation: 0,
        sortWorldAnchor: { x: cellX, y: cellY, z: cellZ, h: 1 },
        sortRotatedPoint: orderMeta.rotatedPoint || null,
        instanceId: sortCell.instanceId || null,
        prefabId: sortCell.prefabId || null,
        renderPath: 'liquid-render-v18-top-lines-off-preserved',
        cacheViewRotation: currentViewRotation,
        cacheContentType: 'world-face-packets',
        chunkKey: null,
        cameraIndependent: true,
        usesScreenSpaceCache: false,
        semanticFace: semanticFace,
        screenFace: screenFace,
        depthKey: semanticFace === 'top' ? 0 : 1,
        fill: face.fill || 'rgba(66, 184, 255, 0.42)',
        stroke: face.stroke !== undefined ? face.stroke : 'rgba(180, 235, 255, 0.52)',
        texture: null,
        textureColor: null,
        semanticTextureSlot: null,
        semanticTextureSlotColor: null,
        width: face.width !== undefined ? face.width : 1,
        worldPts: Array.isArray(face.worldPts) ? face.worldPts : [],
        worldLoops: null,
        worldOutlineSegments: null,
        terrainBoundarySegmentsWorld: [],
        terrainBoundaryStroke: null,
        terrainBoundaryStrokeWidth: 0,
        shadowOverlaysWorld: [],
        box: sortCell || null,
        cellX: cellX,
        cellY: cellY,
        cellZ: cellZ,
        faceKey: id,
        actorInteractionMemberFaceKeys: [],
        actorInteractionMemberDescriptors: [],
        packetNormal: face.normal || { x: 0, y: 0, z: 1 },
        mergedFace: false,
        mergedFaceCount: 1,
        mergeWidth: 1,
        mergeHeight: 1,
        terrainMaterialMergeKey: null,
        terrainMaterialId: null,
        terrainMaterialLabel: null,
        materialType: 'liquid-water',
        terrainPatternDescriptor: null,
        terrainPatternOpacity: null
      });
    }
    return packets;
  }

  function buildTerrainHeightSurfacePacketsForChunk(localBoxes, neighborBoxes, currentViewRotation, computeViewAwareSortMeta, domainCore) {
    if (!isTerrainHeightSurfaceEnabled()) return [];
    var api = getTerrainHeightSurfaceRenderCoreApi();
    if (!api || typeof api.buildTerrainHeightSurfaceFaces !== 'function') return [];
    var local = Array.isArray(localBoxes) ? localBoxes : [];
    var all = local.concat(Array.isArray(neighborBoxes) ? neighborBoxes : []);
    var faces = [];
    try {
      faces = api.buildTerrainHeightSurfaceFaces(local, all, {
        connectThreshold: getTerrainHeightSurfaceConnectThreshold(),
        surfaceSubdivisions: getTerrainHeightSurfaceSubdivisions(),
        topLinesEnabled: getTerrainHeightSurfaceTopLinesEnabled()
      }) || [];
    } catch (_) {
      faces = [];
    }
    var packets = [];
    for (var i = 0; i < faces.length; i++) {
      var face = faces[i] || {};
      var cell = face.cell || null;
      var anchor = averageWorldPoint(face.worldPts || []);
      var sortCell = cell || { x: Math.floor(Number(anchor.x || 0)), y: Math.floor(Number(anchor.y || 0)), z: Math.floor(Number(anchor.z || 0)) };
      var orderMeta = computeLiquidRenderableSortMeta(sortCell, currentViewRotation, computeViewAwareSortMeta, domainCore);
      orderMeta = orderMeta || {};
      var semanticFace = String(face.semanticFace || 'top');
      var screenFace = String(face.screenFace || semanticFace);
      var cellX = Number(sortCell.x || 0);
      var cellY = Number(sortCell.y || 0);
      var cellZ = Number(sortCell.z || 0);
      var edgeHint = String(face.edgeHint || 'none');
      var id = 'terrain-height-surface-' + cellX + '-' + cellY + '-' + cellZ + '-' + semanticFace + '-' + String(face.terrainHeightSurfaceFaceKind || 'face') + '-' + edgeHint;
      packets.push({
        id: id,
        kind: 'static-world-face-packet',
        terrainHeightSurfacePacket: true,
        terrainHeightSurfaceFaceKind: face.terrainHeightSurfaceFaceKind || null,
        edgeHint: face.edgeHint || null,
        sortKey: Number(orderMeta.sortKey || ((cellX + cellY) * 100 + cellZ * 10)),
        tie: Number(orderMeta.tie || 0) + liquidPacketFaceTie(screenFace),
        sortViewRotation: currentViewRotation,
        itemRotation: 0,
        sortWorldAnchor: { x: cellX, y: cellY, z: cellZ, h: Number(sortCell.h || sortCell.terrainHeight || 1) },
        sortRotatedPoint: orderMeta.rotatedPoint || null,
        instanceId: sortCell.instanceId || null,
        prefabId: sortCell.prefabId || null,
        renderPath: 'terrain-height-surface-render-v0',
        cacheViewRotation: currentViewRotation,
        cacheContentType: 'world-face-packets',
        chunkKey: null,
        cameraIndependent: true,
        usesScreenSpaceCache: false,
        semanticFace: semanticFace,
        screenFace: screenFace,
        depthKey: semanticFace === 'top' ? 0 : 1,
        fill: face.fill || 'rgba(112, 166, 82, 0.98)',
        stroke: face.stroke !== undefined ? face.stroke : 'rgba(55, 91, 42, 0.45)',
        texture: null,
        textureColor: null,
        semanticTextureSlot: null,
        semanticTextureSlotColor: null,
        width: face.width !== undefined ? face.width : 1,
        worldPts: Array.isArray(face.worldPts) ? face.worldPts : [],
        worldLoops: null,
        worldOutlineSegments: null,
        terrainBoundarySegmentsWorld: [],
        terrainBoundaryStroke: null,
        terrainBoundaryStrokeWidth: 0,
        shadowOverlaysWorld: [],
        box: sortCell || null,
        cellX: cellX,
        cellY: cellY,
        cellZ: cellZ,
        faceKey: id,
        actorInteractionMemberFaceKeys: [],
        actorInteractionMemberDescriptors: [],
        packetNormal: face.normal || { x: 0, y: 0, z: 1 },
        mergedFace: false,
        mergedFaceCount: 1,
        mergeWidth: 1,
        mergeHeight: 1,
        terrainMaterialMergeKey: 'terrain-height-surface',
        terrainMaterialId: 'terrain-height-surface',
        terrainMaterialLabel: 'Terrain Height Surface',
        materialType: 'terrain-height-surface',
        terrainPatternDescriptor: null,
        terrainPatternOpacity: null
      });
    }
    return packets;
  }


  function buildStaticWorldChunkRenderables(chunk, options, deps) {
    var __deps = deps && typeof deps === 'object' ? deps : {};
    var staticWorldFaceDescriptorBuilder = requireStaticWorldFaceDescriptorBuilder(__deps);
    var staticWorldPacketOrdering = requireStaticWorldPacketOrdering(__deps);
    var perfNow = resolveFunction(__deps, 'perfNow', defaultPerfNow);
    var getRenderVisibilityCoreApi = resolveFunction(__deps, 'getRenderVisibilityCoreApi', nullFn);
    var getMainCameraRenderScope = resolveFunction(__deps, 'getMainCameraRenderScope', nullFn);
    var resolveChunkOccupancyReaderForRender = resolveFunction(__deps, 'resolveChunkOccupancyReaderForRender', nullFn);
    var buildChunkLocalOccupancyMap = resolveFunction(__deps, 'buildChunkLocalOccupancyMap', emptyObjectFn);
    var getDomainSceneCoreApi = resolveFunction(__deps, 'getDomainSceneCoreApi', nullFn);
    var isStaticWorldFaceMergeEnabledForRender = resolveFunction(__deps, 'isStaticWorldFaceMergeEnabledForRender', nullFn);
    var isStaticRenderableLightingUiEnabledForBuild = resolveFunction(__deps, 'isStaticRenderableLightingUiEnabledForBuild', nullFn);
    var getScreenFaceForSemanticFace = resolveFunction(__deps, 'getScreenFaceForSemanticFace', nullFn);
    var getSemanticFaceNormal = resolveFunction(__deps, 'getSemanticFaceNormal', nullFn);
    var getStaticWorldFaceMergeCoords = resolveFunction(__deps, 'getStaticWorldFaceMergeCoords', nullFn);
    var computeViewAwareSortMeta = resolveFunction(__deps, 'computeViewAwareSortMeta', nullFn);
    var getTerrainSortBandKeyForRenderFace = resolveFunction(__deps, 'getTerrainSortBandKeyForRenderFace', nullFn);
    var getTerrainSideEdgeVisibilitySignature = resolveFunction(__deps, 'getTerrainSideEdgeVisibilitySignature', nullFn);
    var getTerrainSideStepBreakSignature = resolveFunction(__deps, 'getTerrainSideStepBreakSignature', nullFn);
    var getTerrainMaterialMergeKeyForRenderCell = resolveFunction(__deps, 'getTerrainMaterialMergeKeyForRenderCell', nullFn);
    var getTerrainFaceMergeSignature = resolveFunction(__deps, 'getTerrainFaceMergeSignature', nullFn);
    var getStaticWorldFaceMergeSignature = resolveFunction(__deps, 'getStaticWorldFaceMergeSignature', nullFn);
    var getStaticWorldFaceMergeCoreApi = resolveFunction(__deps, 'getStaticWorldFaceMergeCoreApi', nullFn);
    var getTerrainFaceMergeCoreApi = resolveFunction(__deps, 'getTerrainFaceMergeCoreApi', nullFn);
    var buildMergedVoxelFaceWorldGeometry = resolveFunction(__deps, 'buildMergedVoxelFaceWorldGeometry', nullFn);
    var buildTerrainTopBoundarySegmentsWorldFromDescriptor = resolveFunction(__deps, 'buildTerrainTopBoundarySegmentsWorldFromDescriptor', nullFn);
    var buildTerrainPolygonLoopSignature = resolveFunction(__deps, 'buildTerrainPolygonLoopSignature', nullFn);
    var getTerrainMaterialPatternDescriptorForRenderCell = resolveFunction(__deps, 'getTerrainMaterialPatternDescriptorForRenderCell', nullFn);
    var getTerrainMaterialBaseFaceColorsForRenderCell = resolveFunction(__deps, 'getTerrainMaterialBaseFaceColorsForRenderCell', nullFn);
    var getCachedBaseFaceColorsForRenderable = resolveFunction(__deps, 'getCachedBaseFaceColorsForRenderable', nullFn);
    var getTerrainRenderSettingsForRender = resolveFunction(__deps, 'getTerrainRenderSettingsForRender', nullFn);
    var isStaticRenderableLightingActiveForBuild = resolveFunction(__deps, 'isStaticRenderableLightingActiveForBuild', nullFn);
    var getCachedStaticRenderableFill = resolveFunction(__deps, 'getCachedStaticRenderableFill', nullFn);
    var buildVoxelFaceShadowWorldOverlays = resolveFunction(__deps, 'buildVoxelFaceShadowWorldOverlays', nullFn);
    var buildActorInteractionMemberFaceKeysFromFaceDescriptor = resolveFunction(__deps, 'buildActorInteractionMemberFaceKeysFromFaceDescriptor', nullFn);
    var getActorInteractionMemberDescriptorsFromFaceDescriptor = resolveFunction(__deps, 'getActorInteractionMemberDescriptorsFromFaceDescriptor', nullFn);
    var getTerrainMaterialIdForRenderCell = resolveFunction(__deps, 'getTerrainMaterialIdForRenderCell', nullFn);
    var compareRenderablesByDomain = resolveFunction(__deps, 'compareRenderablesByDomain', defaultCompareRenderablesByDomain);
    var screenPointsFromWorldFaceNoCamera = resolveFunction(__deps, 'screenPointsFromWorldFaceNoCamera', nullFn);
    var emitChunkRebuildScopeVerify = resolveFunction(__deps, 'emitChunkRebuildScopeVerify', noop);
    var emitChunkRebuildDetail = resolveFunction(__deps, 'emitChunkRebuildDetail', noop);
    var emitChunkRebuildHotspot = resolveFunction(__deps, 'emitChunkRebuildHotspot', noop);
    var emitStaticRenderableBuildDetail = resolveFunction(__deps, 'emitStaticRenderableBuildDetail', noop);
    var emitStaticRenderableBuildScopeVerify = resolveFunction(__deps, 'emitStaticRenderableBuildScopeVerify', noop);
    var emitStaticRenderableBuildHotspot = resolveFunction(__deps, 'emitStaticRenderableBuildHotspot', noop);
    var emitColorBuildDetail = resolveFunction(__deps, 'emitColorBuildDetail', noop);
    var emitStep4ColorBuildDetail = resolveFunction(__deps, 'emitStep4ColorBuildDetail', noop);
    var emitStep4ColorBuildScopeVerify = resolveFunction(__deps, 'emitStep4ColorBuildScopeVerify', noop);
    var getStaticRenderableActualColorPathUsed = resolveFunction(__deps, 'getStaticRenderableActualColorPathUsed', nullFn);
    var getStaticRenderableBuildColorModeForRender = resolveFunction(__deps, 'getStaticRenderableBuildColorModeForRender', nullFn);
    var emitBuildColorPathVerify = resolveFunction(__deps, 'emitBuildColorPathVerify', noop);
    var emitLightingShadowBypassVerify = resolveFunction(__deps, 'emitLightingShadowBypassVerify', noop);
    var emitStep4ShadowPathSummary = resolveFunction(__deps, 'emitStep4ShadowPathSummary', noop);
    var emitColorBuildMissBreakdown = resolveFunction(__deps, 'emitColorBuildMissBreakdown', noop);
    var emitColorBuildHotspot = resolveFunction(__deps, 'emitColorBuildHotspot', noop);
    var emitStep4ColorBuildHotspot = resolveFunction(__deps, 'emitStep4ColorBuildHotspot', noop);
    var emitChunkRebuildBreakdown = resolveFunction(__deps, 'emitChunkRebuildBreakdown', noop);
  
    var opts = options && typeof options === 'object' ? options : {};
    var visibilityCore = opts.visibilityCore || getRenderVisibilityCoreApi();
    var currentViewRotation = Number(opts.currentViewRotation || 0);
    var cameraScope = opts.cameraScope || getMainCameraRenderScope(currentViewRotation);
    var semanticLogSeen = opts.semanticLogSeen || Object.create(null);
    var profileContext = opts.profileContext && typeof opts.profileContext === 'object' ? opts.profileContext : {};
    var chunkBuildStartAt = perfNow();
    var chunkBoxesCollectStartAt = perfNow();
    var chunkBoxes = [];
    if (chunk && chunk.boxMap && typeof chunk.boxMap.forEach === 'function') {
      chunk.boxMap.forEach(function (box) { if (box) chunkBoxes.push(box); });
    }
    var step1CollectChunkBoxesMs = Math.max(0, perfNow() - chunkBoxesCollectStartAt);
    var neighborBoxesCollectStartAt = perfNow();
    var neighborBoxes = [];
    if (Array.isArray(opts.neighborBoxes) && opts.neighborBoxes.length) {
      neighborBoxes = opts.neighborBoxes.filter(function (box) { return !!box; });
    }
    var step2CollectNeighborBoxesMs = Math.max(0, perfNow() - neighborBoxesCollectStartAt);
    var occupancyStartAt = perfNow();
    // Prefer the scene-level occupancy cache so chunk rebuilds can reuse the shared world occupancy index.
    // Keep the local fallback to preserve behavior and allow fast rollback if validation fails.
    var occupancyResolution = resolveChunkOccupancyReaderForRender({
      occupancy: opts.occupancy,
      localBoxes: chunkBoxes,
      neighborBoxes: neighborBoxes
    });
    var chunkOcc = occupancyResolution && occupancyResolution.reader ? occupancyResolution.reader : buildChunkLocalOccupancyMap(chunkBoxes, neighborBoxes);
    var visibilityOcc = buildVisibilityOccupancyWithoutLiquids(chunkBoxes, neighborBoxes, visibilityCore, chunkOcc);
    var occupancyBuildMs = Math.max(0, perfNow() - occupancyStartAt);
    var usedGlobalOccupancy = occupancyResolution && occupancyResolution.source === 'global';
    var usedLocalOccupancyFallback = !usedGlobalOccupancy;
    var occupancyAccessMode = occupancyResolution && occupancyResolution.source ? String(occupancyResolution.source) : 'local-fallback';
    var occupancyFallbackReason = occupancyResolution && occupancyResolution.fallbackReason ? String(occupancyResolution.fallbackReason) : null;
    var occupancyValidationSampleCount = Number(occupancyResolution && occupancyResolution.validationSampleCount || 0);
    var step3ResolveOccupancyMs = occupancyBuildMs;
    var step3BuildLocalOccupancyMs = usedLocalOccupancyFallback ? occupancyBuildMs : 0;
    var visibleSurfaceStartAt = perfNow();
    var visibilityChunkBoxes = isTerrainHeightSurfaceEnabled() ? chunkBoxes.filter(function (box) { return !isTerrainHeightSurfaceBox(box); }) : chunkBoxes;
    var surfaceCache = visibilityCore && typeof visibilityCore.buildVisibleSurfaceCache === 'function'
      ? visibilityCore.buildVisibleSurfaceCache(visibilityChunkBoxes, {
          scope: null,
          occupancy: visibilityOcc,
          surfaceOnlyRenderingEnabled: cameraScope.surfaceOnlyRenderingEnabled !== false,
          classifyBox: function (box) {
            return {
              isTerrain: !!(box && box.generatedBy === 'terrain-generator'),
              isStructured: true,
              isVoxelFurniture: !(box && box.generatedBy === 'terrain-generator')
            };
          }
        })
      : {
          surfaceCells: visibilityChunkBoxes.map(function (box) { return { box: box, visibleFaces: ['top', 'east', 'south'] }; }),
          logicalVoxelCountEstimated: chunkBoxes.length,
          visibleTopFaceCount: 0,
          visibleSideFaceCount: 0,
          hiddenInternalSurfaceSkippedCount: 0,
          voxelFurnitureProcessedCount: chunkBoxes.length,
          surfaceOnlyRenderingEnabled: true,
          internalVoxelSkippedCount: 0,
          cameraCulledCount: 0
        };
    var visibleSurfaceBuildMs = Math.max(0, perfNow() - visibleSurfaceStartAt);
    var step4ComputeVisibleFacesMs = visibleSurfaceBuildMs;
    var packetBuildStartAt = perfNow();
    var packets = [];
    var surfaceCells = Array.isArray(surfaceCache.surfaceCells) ? surfaceCache.surfaceCells : [];
    var domainCore = getDomainSceneCoreApi();
    var staticRenderableBuildProfileStartAt = perfNow();
    var step1PrepareFaceInputsMs = 0;
    var step2BuildRenderableBaseMs = 0;
    var step3BuildStyleOrMaterialMs = 0;
    var step4BuildColorMs = 0;
    var step5ComputeSortKeyMs = 0;
    var step6ObjectAllocationMs = 0;
    var step7ArrayPushMs = 0;
    var step8FinalizeRenderableListMs = 0;
    var mergeFaceDescriptorsMs = 0;
    var inputFaceDescriptorCount = 0;
    var mergedFaceDescriptorCount = 0;
    var mergedStaticFaceCount = 0;
    var mergeReductionRatio = 0;
    var terrainPacketCount = 0;
    var faceMergeMode = 'disabled';
    var faceMergeFallbackReason = null;
    var faceMergeEnabled = isStaticWorldFaceMergeEnabledForRender();
    var colorBuildStats = {
      colorCacheEnabled: true,
      colorCacheHitCount: 0,
      colorCacheMissCount: 0,
      colorKeyUsage: new Map(),
      actualColorPathUsedCounts: new Map(),
      miss_step1_paletteLookupMs: 0,
      miss_step2_heightBucketMs: 0,
      miss_step3_materialColorMs: 0,
      miss_step4_lightingMixMs: 0,
      miss_step5_cssOrObjectBuildMs: 0,
      step4a_colorCacheLookupMs: 0,
      step4b_colorCacheHitFastPathMs: 0,
      step4c_colorMissPathMs: 0,
      step4d_shadowOverlayTotalMs: 0,
      step4e_shadowOverlayCacheLookupMs: 0,
      step4f_shadowOverlayCollectMs: 0,
      step4g_shadowOverlayCloneMs: 0,
      step4h_fillAndOverlayAssignMs: 0,
      shadowOverlayCacheHitCount: 0,
      shadowOverlayCacheMissCount: 0,
      shadowOverlayTotalCount: 0,
      touchedColorCachePath: false,
      touchedNaturalColorPath: false,
      touchedLightingPath: false,
      touchedShadowOverlayPath: false,
      touchedProjectedShadowCollector: false,
      shadowOverlaySkippedByLightingOff: false,
      lightingEnabledUi: isStaticRenderableLightingUiEnabledForBuild(),
      usedLightingSignature: false
    };
    var scannedFaceCount = 0;
    var touchedGlobalRenderableTemplates = false;
    var touchedGlobalStyleCache = false;
    var touchedGlobalMaterialCache = false;
    var faceDescriptorResult = staticWorldFaceDescriptorBuilder.buildStaticWorldFaceDescriptors({
      surfaceCells: surfaceCells,
      currentViewRotation: currentViewRotation,
      chunkOcc: chunkOcc,
      domainCore: domainCore
    }, {
      perfNow: perfNow,
      getScreenFaceForSemanticFace: getScreenFaceForSemanticFace,
      getSemanticFaceNormal: getSemanticFaceNormal,
      getStaticWorldFaceMergeCoords: getStaticWorldFaceMergeCoords,
      computeViewAwareSortMeta: computeViewAwareSortMeta,
      getTerrainSortBandKeyForRenderFace: getTerrainSortBandKeyForRenderFace,
      getTerrainSideEdgeVisibilitySignature: getTerrainSideEdgeVisibilitySignature,
      getTerrainSideStepBreakSignature: getTerrainSideStepBreakSignature,
      getTerrainTopStepBoundarySignature: (global && global.__TERRAIN_RENDER_CORE__ && typeof global.__TERRAIN_RENDER_CORE__.getTerrainTopStepBoundarySignature === 'function')
        ? global.__TERRAIN_RENDER_CORE__.getTerrainTopStepBoundarySignature
        : nullFn,
      getSlope1x1DrawableFaces: (global && global.__TERRAIN_RENDER_CORE__ && typeof global.__TERRAIN_RENDER_CORE__.getSlope1x1DrawableFaces === 'function')
        ? global.__TERRAIN_RENDER_CORE__.getSlope1x1DrawableFaces
        : nullFn,
      getTerrainMaterialMergeKeyForRenderCell: getTerrainMaterialMergeKeyForRenderCell,
      getTerrainFaceMergeSignature: getTerrainFaceMergeSignature,
      getStaticWorldFaceMergeSignature: getStaticWorldFaceMergeSignature
    });
    var faceDescriptors = faceDescriptorResult && Array.isArray(faceDescriptorResult.faceDescriptors) ? faceDescriptorResult.faceDescriptors : [];
    scannedFaceCount += Number(faceDescriptorResult && faceDescriptorResult.scannedFaceCount || 0);
    inputFaceDescriptorCount += Number(faceDescriptorResult && faceDescriptorResult.inputFaceDescriptorCount || faceDescriptors.length || 0);
    step1PrepareFaceInputsMs += Number(faceDescriptorResult && faceDescriptorResult.step1PrepareFaceInputsMs || 0);
    step5ComputeSortKeyMs += Number(faceDescriptorResult && faceDescriptorResult.step5ComputeSortKeyMs || 0);
    var renderFaceDescriptors = faceDescriptors;
    var terrainInputFaceDescriptorCount = 0;
    var terrainMergedFaceDescriptorCount = 0;
    var terrainMergedStaticFaceCount = 0;
    var terrainMergeReductionRatio = 0;
    var terrainMergeFaceDescriptorsMs = 0;
    var terrainSideInputFaceDescriptorCount = 0;
    var terrainSideMergedFaceDescriptorCount = 0;
    var terrainSideMergedStaticFaceCount = 0;
    var terrainSideMergeReductionRatio = 0;
    var terrainSideStepBreakCount = 0;
    var terrainTopOcclusionBreakCount = 0;
    var terrainTopStepBoundaryDescriptorCount = 0;
    var terrainTopStepBoundaryUniqueSignatureCount = 0;
    var terrainTopStepBoundaryMixedStripCount = 0;
    var terrainTopStepBoundaryMixedMemberCount = 0;
    var terrainTopStepBoundaryWouldBreakCount = 0;
    var terrainTopStepBoundarySampleCount = 0;
    var terrainTopStepBoundarySamples = [];
    var terrainTopStepBoundaryMergeKeyEnabled = false;
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
    var terrainTopBarrierIndexSideCount = 0;
    var terrainTopBarrierIndexPlaneCount = 0;
    var terrainTopBarrierIndexUpperPlaneCount = 0;
    var terrainTopBarrierIndexVerticalIntervalPlaneCount = 0;
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
    var terrainTopBarrierSamples = [];
    var terrainTopBarrierRejectedOutsideStripBoundsSamples = [];
    var terrainTopBarrierRejectedOutsideSortRangeSamples = [];
    var terrainTopBarrierTieSortMismatchSamples = [];
    var terrainTopBarrierPlaneMissButWouldAcceptSamples = [];
    var terrainTopBarrierSortKeyOnlyAcceptSamples = [];
    var terrainTopBlockerSplitCount = 0;
    var terrainTopBlockerCutPointCount = 0;
    var terrainTopBlockerCount = 0;
    var terrainTopBlockerExactCellHitCount = 0;
    var terrainTopBlockerAdjacentCellCandidateCount = 0;
    var terrainTopBlockerAdjacentCellAcceptedCount = 0;
    var terrainTopBlockerAdjacentCellRejectedNotFacingCount = 0;
    var terrainTopBlockerSortInsertionCandidateCount = 0;
    var terrainTopBlockerRejectedNonExactCount = 0;
    var terrainTopBlockerRejectedOutOfSortRangeCount = 0;
    var terrainTopBlockerAcceptedSamples = [];
    var terrainTopBlockerRejectedSamples = [];
    var terrainFinalVisibleSideDescriptorCount = 0;
    var terrainFaceMergeMode = 'not-applicable';
    var terrainFaceMergeFallbackReason = null;
    var faceMergeCore = getStaticWorldFaceMergeCoreApi();
    var terrainFaceMergeCore = getTerrainFaceMergeCoreApi();
    var nonTerrainDescriptors = [];
    var terrainDescriptors = [];
    for (var fdi = 0; fdi < faceDescriptors.length; fdi++) {
      var faceDesc = faceDescriptors[fdi];
      if (faceDesc && faceDesc.isTerrainFaceMergeCandidate === true) terrainDescriptors.push(faceDesc);
      else nonTerrainDescriptors.push(faceDesc);
    }
    terrainInputFaceDescriptorCount = terrainDescriptors.length;
    terrainSideInputFaceDescriptorCount = terrainDescriptors.filter(function (face) {
      var sf = String(face && face.semanticFace || '');
      return sf === 'east' || sf === 'south' || sf === 'north' || sf === 'west';
    }).length;
    terrainFinalVisibleSideDescriptorCount = terrainSideInputFaceDescriptorCount;
    var mergedNonTerrainDescriptors = nonTerrainDescriptors;
    var mergedTerrainDescriptors = terrainDescriptors;
    var nonTerrainMergedCount = 0;
    var nonTerrainOutputCount = nonTerrainDescriptors.length;
    if (faceMergeEnabled && faceMergeCore && typeof faceMergeCore.mergeFaceDescriptors === 'function' && nonTerrainDescriptors.length > 0) {
      var nonTerrainMergeStartAt = perfNow();
      var nonTerrainMergeResult = faceMergeCore.mergeFaceDescriptors(nonTerrainDescriptors, { enabled: true });
      mergeFaceDescriptorsMs += Math.max(0, perfNow() - nonTerrainMergeStartAt);
      if (nonTerrainMergeResult && Array.isArray(nonTerrainMergeResult.descriptors)) {
        mergedNonTerrainDescriptors = nonTerrainMergeResult.descriptors;
        nonTerrainOutputCount = Number(nonTerrainMergeResult.outputCount || mergedNonTerrainDescriptors.length || 0);
        nonTerrainMergedCount = Number(nonTerrainMergeResult.mergedFaceCount || Math.max(0, nonTerrainDescriptors.length - nonTerrainOutputCount));
      } else {
        faceMergeFallbackReason = 'invalid-non-terrain-merge-result';
        faceMergeMode = 'fallback-no-merge';
      }
    } else if (!faceMergeEnabled) {
      faceMergeMode = 'disabled';
      faceMergeFallbackReason = 'face-merge-disabled';
    } else if (nonTerrainDescriptors.length > 0 && !(faceMergeCore && typeof faceMergeCore.mergeFaceDescriptors === 'function')) {
      faceMergeMode = 'fallback-no-merge';
      faceMergeFallbackReason = 'missing-face-merge-core';
    }
    if (terrainDescriptors.length > 0) {
      if (faceMergeEnabled && terrainFaceMergeCore && typeof terrainFaceMergeCore.mergeTerrainFaceDescriptors === 'function') {
        var terrainMergeStartAt = perfNow();
        var terrainMergeResult = terrainFaceMergeCore.mergeTerrainFaceDescriptors(terrainDescriptors, { enabled: true });
        terrainMergeFaceDescriptorsMs = Math.max(0, perfNow() - terrainMergeStartAt);
        mergeFaceDescriptorsMs += terrainMergeFaceDescriptorsMs;
        if (terrainMergeResult && Array.isArray(terrainMergeResult.descriptors)) {
          mergedTerrainDescriptors = terrainMergeResult.descriptors;
          terrainMergedFaceDescriptorCount = Number(terrainMergeResult.outputCount || mergedTerrainDescriptors.length || 0);
          terrainMergedStaticFaceCount = Number(terrainMergeResult.mergedFaceCount || Math.max(0, terrainDescriptors.length - terrainMergedFaceDescriptorCount));
          terrainMergeReductionRatio = Number(terrainMergeResult.reductionRatio || (terrainDescriptors.length > 0 ? Math.max(0, (terrainDescriptors.length - terrainMergedFaceDescriptorCount) / terrainDescriptors.length) : 0));
          terrainSideStepBreakCount = Number(terrainMergeResult.sideStepBreakCount || 0);
          terrainTopOcclusionBreakCount = Number(terrainMergeResult.terrainTopOcclusionBreakCount || 0);
          terrainTopStepBoundaryDescriptorCount = Number(terrainMergeResult.terrainTopStepBoundaryDescriptorCount || 0);
          terrainTopStepBoundaryUniqueSignatureCount = Number(terrainMergeResult.terrainTopStepBoundaryUniqueSignatureCount || 0);
          terrainTopStepBoundaryMixedStripCount = Number(terrainMergeResult.terrainTopStepBoundaryMixedStripCount || 0);
          terrainTopStepBoundaryMixedMemberCount = Number(terrainMergeResult.terrainTopStepBoundaryMixedMemberCount || 0);
          terrainTopStepBoundaryWouldBreakCount = Number(terrainMergeResult.terrainTopStepBoundaryWouldBreakCount || 0);
          terrainTopStepBoundarySamples = Array.isArray(terrainMergeResult.terrainTopStepBoundarySamples) ? terrainMergeResult.terrainTopStepBoundarySamples.slice(0, 12) : [];
          terrainTopStepBoundarySampleCount = terrainTopStepBoundarySamples.length;
          terrainTopStepBoundaryMergeKeyEnabled = terrainMergeResult.terrainTopStepBoundaryMergeKeyEnabled === true;
          terrainTopBarrierSplitCount = Number(terrainMergeResult.terrainTopBarrierSplitCount || 0);
          terrainTopBarrierCutPointCount = Number(terrainMergeResult.terrainTopBarrierCutPointCount || 0);
          terrainTopBarrierCandidateCount = Number(terrainMergeResult.terrainTopBarrierCandidateCount || 0);
          terrainTopBarrierAcceptedCount = Number(terrainMergeResult.terrainTopBarrierAcceptedCount || 0);
          terrainTopBarrierRejectedOutOfPlaneCount = Number(terrainMergeResult.terrainTopBarrierRejectedOutOfPlaneCount || 0);
          terrainTopBarrierRejectedOutsideStripBoundsCount = Number(terrainMergeResult.terrainTopBarrierRejectedOutsideStripBoundsCount || 0);
          terrainTopBarrierRejectedOutsideSortRangeCount = Number(terrainMergeResult.terrainTopBarrierRejectedOutsideSortRangeCount || 0);
          terrainTopBarrierRejectedNoInsertionIndexCount = Number(terrainMergeResult.terrainTopBarrierRejectedNoInsertionIndexCount || 0);
          terrainTopBarrierNonMonotonicStripCount = Number(terrainMergeResult.terrainTopBarrierNonMonotonicStripCount || 0);
          terrainTopBarrierMaxSegmentLength = Number(terrainMergeResult.terrainTopBarrierMaxSegmentLength || 0);
          terrainTopBarrierIndexSideCount = Number(terrainMergeResult.terrainTopBarrierIndexSideCount || 0);
          terrainTopBarrierIndexPlaneCount = Number(terrainMergeResult.terrainTopBarrierIndexPlaneCount || 0);
          terrainTopBarrierIndexUpperPlaneCount = Number(terrainMergeResult.terrainTopBarrierIndexUpperPlaneCount || 0);
          terrainTopBarrierIndexVerticalIntervalPlaneCount = Number(terrainMergeResult.terrainTopBarrierIndexVerticalIntervalPlaneCount || 0);
          terrainTopBarrierLegacyPlaneCandidateCount = Number(terrainMergeResult.terrainTopBarrierLegacyPlaneCandidateCount || 0);
          terrainTopBarrierUpperPlaneCandidateCount = Number(terrainMergeResult.terrainTopBarrierUpperPlaneCandidateCount || 0);
          terrainTopBarrierIntervalPlaneCandidateCount = Number(terrainMergeResult.terrainTopBarrierIntervalPlaneCandidateCount || 0);
          terrainTopBarrierWouldAcceptBySideUpperPlaneCount = Number(terrainMergeResult.terrainTopBarrierWouldAcceptBySideUpperPlaneCount || 0);
          terrainTopBarrierWouldAcceptBySortKeyOnlyCount = Number(terrainMergeResult.terrainTopBarrierWouldAcceptBySortKeyOnlyCount || 0);
          terrainTopBarrierTieSortMismatchCount = Number(terrainMergeResult.terrainTopBarrierTieSortMismatchCount || 0);
          terrainTopBarrierPlaneMissButWouldAcceptCount = Number(terrainMergeResult.terrainTopBarrierPlaneMissButWouldAcceptCount || 0);
          terrainTopBarrierSortKeyInsertionIndexCount = Number(terrainMergeResult.terrainTopBarrierSortKeyInsertionIndexCount || 0);
          terrainTopBarrierTieSortInsertionIndexCount = Number(terrainMergeResult.terrainTopBarrierTieSortInsertionIndexCount || 0);
          terrainTopBarrierDiagnosticsOnlySuppressedSplitCount = Number(terrainMergeResult.terrainTopBarrierDiagnosticsOnlySuppressedSplitCount || 0);
          terrainTopBarrierCorrectedAcceptedCount = Number(terrainMergeResult.terrainTopBarrierCorrectedAcceptedCount || 0);
          terrainTopBarrierCorrectedSplitCount = Number(terrainMergeResult.terrainTopBarrierCorrectedSplitCount || 0);
          terrainTopBarrierCorrectedCutPointCount = Number(terrainMergeResult.terrainTopBarrierCorrectedCutPointCount || 0);
          terrainTopBarrierCorrectedRejectedOutsideStripBoundsCount = Number(terrainMergeResult.terrainTopBarrierCorrectedRejectedOutsideStripBoundsCount || 0);
          terrainTopBarrierCorrectedRejectedOutsideSortRangeCount = Number(terrainMergeResult.terrainTopBarrierCorrectedRejectedOutsideSortRangeCount || 0);
          terrainTopBarrierCorrectedRejectedNoInsertionIndexCount = Number(terrainMergeResult.terrainTopBarrierCorrectedRejectedNoInsertionIndexCount || 0);
          terrainTopBarrierSamples = Array.isArray(terrainMergeResult.terrainTopBarrierSamples) ? terrainMergeResult.terrainTopBarrierSamples.slice(0, 12) : [];
          terrainTopBarrierRejectedOutsideStripBoundsSamples = Array.isArray(terrainMergeResult.terrainTopBarrierRejectedOutsideStripBoundsSamples) ? terrainMergeResult.terrainTopBarrierRejectedOutsideStripBoundsSamples.slice(0, 12) : [];
          terrainTopBarrierRejectedOutsideSortRangeSamples = Array.isArray(terrainMergeResult.terrainTopBarrierRejectedOutsideSortRangeSamples) ? terrainMergeResult.terrainTopBarrierRejectedOutsideSortRangeSamples.slice(0, 12) : [];
          terrainTopBarrierTieSortMismatchSamples = Array.isArray(terrainMergeResult.terrainTopBarrierTieSortMismatchSamples) ? terrainMergeResult.terrainTopBarrierTieSortMismatchSamples.slice(0, 12) : [];
          terrainTopBarrierPlaneMissButWouldAcceptSamples = Array.isArray(terrainMergeResult.terrainTopBarrierPlaneMissButWouldAcceptSamples) ? terrainMergeResult.terrainTopBarrierPlaneMissButWouldAcceptSamples.slice(0, 12) : [];
          terrainTopBarrierSortKeyOnlyAcceptSamples = Array.isArray(terrainMergeResult.terrainTopBarrierSortKeyOnlyAcceptSamples) ? terrainMergeResult.terrainTopBarrierSortKeyOnlyAcceptSamples.slice(0, 12) : [];
          terrainTopBlockerSplitCount = Number(terrainMergeResult.terrainTopBlockerSplitCount || 0);
          terrainTopBlockerCutPointCount = Number(terrainMergeResult.terrainTopBlockerCutPointCount || 0);
          terrainTopBlockerCount = Number(terrainMergeResult.terrainTopBlockerCount || 0);
          terrainTopBlockerExactCellHitCount = Number(terrainMergeResult.terrainTopBlockerExactCellHitCount || 0);
          terrainTopBlockerAdjacentCellCandidateCount = Number(terrainMergeResult.terrainTopBlockerAdjacentCellCandidateCount || 0);
          terrainTopBlockerAdjacentCellAcceptedCount = Number(terrainMergeResult.terrainTopBlockerAdjacentCellAcceptedCount || 0);
          terrainTopBlockerAdjacentCellRejectedNotFacingCount = Number(terrainMergeResult.terrainTopBlockerAdjacentCellRejectedNotFacingCount || 0);
          terrainTopBlockerSortInsertionCandidateCount = Number(terrainMergeResult.terrainTopBlockerSortInsertionCandidateCount || 0);
          terrainTopBlockerRejectedNonExactCount = Number(terrainMergeResult.terrainTopBlockerRejectedNonExactCount || 0);
          terrainTopBlockerRejectedOutOfSortRangeCount = Number(terrainMergeResult.terrainTopBlockerRejectedOutOfSortRangeCount || 0);
          terrainTopBlockerAcceptedSamples = Array.isArray(terrainMergeResult.terrainTopBlockerAcceptedSamples) ? terrainMergeResult.terrainTopBlockerAcceptedSamples.slice(0, 12) : [];
          terrainTopBlockerRejectedSamples = Array.isArray(terrainMergeResult.terrainTopBlockerRejectedSamples) ? terrainMergeResult.terrainTopBlockerRejectedSamples.slice(0, 12) : [];
          terrainFaceMergeMode = 'terrain-core-merge';
        } else {
          terrainMergedFaceDescriptorCount = terrainDescriptors.length;
          terrainFaceMergeMode = 'fallback-no-merge';
          terrainFaceMergeFallbackReason = 'invalid-terrain-merge-result';
        }
      } else if (!faceMergeEnabled) {
        terrainMergedFaceDescriptorCount = terrainDescriptors.length;
        terrainFaceMergeMode = 'disabled';
        terrainFaceMergeFallbackReason = 'face-merge-disabled';
      } else {
        terrainMergedFaceDescriptorCount = terrainDescriptors.length;
        terrainFaceMergeMode = 'fallback-no-merge';
        terrainFaceMergeFallbackReason = 'missing-terrain-face-merge-core';
      }
    }
    if (terrainMergedFaceDescriptorCount <= 0 && terrainInputFaceDescriptorCount > 0) terrainMergedFaceDescriptorCount = terrainInputFaceDescriptorCount;
    terrainSideMergedFaceDescriptorCount = mergedTerrainDescriptors.filter(function (face) {
      var sf = String(face && face.semanticFace || '');
      return sf === 'east' || sf === 'south' || sf === 'north' || sf === 'west';
    }).length;
    terrainSideMergedStaticFaceCount = Math.max(0, Number(terrainSideInputFaceDescriptorCount || 0) - Number(terrainSideMergedFaceDescriptorCount || 0));
    terrainSideMergeReductionRatio = terrainSideInputFaceDescriptorCount > 0
      ? Math.max(0, (terrainSideInputFaceDescriptorCount - terrainSideMergedFaceDescriptorCount) / terrainSideInputFaceDescriptorCount)
      : 0;
    renderFaceDescriptors = mergedNonTerrainDescriptors.concat(mergedTerrainDescriptors);
    mergedFaceDescriptorCount = Number(nonTerrainOutputCount || mergedNonTerrainDescriptors.length || 0) + Number(terrainMergedFaceDescriptorCount || 0);
    mergedStaticFaceCount = Math.max(0, Number(nonTerrainMergedCount || 0) + Number(terrainMergedStaticFaceCount || 0));
    mergeReductionRatio = inputFaceDescriptorCount > 0 ? Math.max(0, (inputFaceDescriptorCount - mergedFaceDescriptorCount) / inputFaceDescriptorCount) : 0;
    if (terrainDescriptors.length > 0 && nonTerrainDescriptors.length > 0) faceMergeMode = 'split-terrain-generic';
    else if (terrainDescriptors.length > 0) faceMergeMode = terrainFaceMergeMode;
    else if (nonTerrainDescriptors.length > 0 && faceMergeEnabled && faceMergeCore && typeof faceMergeCore.mergeFaceDescriptors === 'function') faceMergeMode = 'generic-core-merge';
    if (mergedFaceDescriptorCount <= 0 && inputFaceDescriptorCount > 0) mergedFaceDescriptorCount = inputFaceDescriptorCount;
    for (var fd = 0; fd < renderFaceDescriptors.length; fd++) {
      var descriptor = renderFaceDescriptors[fd];
      var cell = descriptor && (descriptor.cell || descriptor.box) ? (descriptor.cell || descriptor.box) : null;
      if (!cell) continue;
      var prepareFaceInputsStartAt = perfNow();
      var semanticFace = String(descriptor.semanticFace || 'top');
      var screenFace = descriptor.screenFace || getScreenFaceForSemanticFace(semanticFace, currentViewRotation);
      var normal = descriptor.normal || getSemanticFaceNormal(semanticFace || screenFace);
      var worldGeometry = buildMergedVoxelFaceWorldGeometry(descriptor);
      var worldPts = Array.isArray(worldGeometry && worldGeometry.worldPts) ? worldGeometry.worldPts : [];
      var worldLoops = Array.isArray(worldGeometry && worldGeometry.worldLoops) ? worldGeometry.worldLoops : null;
      var worldOutlineSegments = Array.isArray(worldGeometry && worldGeometry.worldOutlineSegments) ? worldGeometry.worldOutlineSegments : null;
      var terrainBoundarySegmentsWorld = buildTerrainTopBoundarySegmentsWorldFromDescriptor(descriptor, chunkOcc);
      if (!worldPts.length) {
        step1PrepareFaceInputsMs += Math.max(0, perfNow() - prepareFaceInputsStartAt);
        continue;
      }
      step1PrepareFaceInputsMs += Math.max(0, perfNow() - prepareFaceInputsStartAt);
      var sortKey = Number(descriptor.sortKey || 0);
      var tie = Number(descriptor.tie || 0);
      var buildRenderableBaseStartAt = perfNow();
      var terrainLoopSignature = buildTerrainPolygonLoopSignature(descriptor);
      var packetIdentity = staticWorldPacketOrdering.buildStaticWorldPacketIdentity(descriptor, {
        cell: cell,
        semanticFace: semanticFace,
        screenFace: screenFace,
        terrainLoopSignature: terrainLoopSignature
      });
      var packetId = String(packetIdentity && packetIdentity.packetId || 'voxel-missing::' + semanticFace);
      var faceKey = String(packetIdentity && packetIdentity.faceKey || 'unknown|missing|' + semanticFace + '|' + screenFace);
      step2BuildRenderableBaseMs += Math.max(0, perfNow() - buildRenderableBaseStartAt);
      var styleOrMaterialStartAt = perfNow();
      var terrainPatternDescriptor = getTerrainMaterialPatternDescriptorForRenderCell(cell, semanticFace);
      var terrainFc = getTerrainMaterialBaseFaceColorsForRenderCell(cell);
      var fc = terrainFc || getCachedBaseFaceColorsForRenderable((cell && cell.base) || '#7aa2f7');
      var stroke = terrainPatternDescriptor && terrainPatternDescriptor.lineColor ? terrainPatternDescriptor.lineColor : fc.line;
      var texture = null;
      var textureColor = null;
      var semanticTextureSlot = null;
      var semanticTextureSlotColor = null;
      step3BuildStyleOrMaterialMs += Math.max(0, perfNow() - styleOrMaterialStartAt);
      var buildColorStartAt = perfNow();
      var terrainSettingsForStep4 = getTerrainRenderSettingsForRender();
      var lightingActiveForStep4 = isStaticRenderableLightingActiveForBuild(terrainSettingsForStep4);
      colorBuildStats.usedLightingSignature = lightingActiveForStep4;
      colorBuildStats.lightingEnabledUi = isStaticRenderableLightingUiEnabledForBuild();
      var cachedFillResult = getCachedStaticRenderableFill(cell, semanticFace, worldPts, normal, currentViewRotation, colorBuildStats);
      var assignStartAt = perfNow();
      var fill = cachedFillResult.fill;
      var shadowOverlaysWorld = [];
      var suppressMergedTerrainTopShadows = !!(descriptor && descriptor.isTerrainFaceMergeCandidate === true && String(semanticFace || 'top') === 'top' && Array.isArray(worldLoops) && worldLoops.length > 0);
      if (lightingActiveForStep4 && !suppressMergedTerrainTopShadows) shadowOverlaysWorld = buildVoxelFaceShadowWorldOverlays(worldPts, normal, cell.instanceId || null, colorBuildStats);
      else colorBuildStats.shadowOverlaySkippedByLightingOff = true;
      colorBuildStats.step4h_fillAndOverlayAssignMs += Math.max(0, perfNow() - assignStartAt);
      step4BuildColorMs += Math.max(0, perfNow() - buildColorStartAt);
      var objectAllocationStartAt = perfNow();
      if (descriptor && descriptor.isTerrainFaceMergeCandidate === true) terrainPacketCount += 1;
      var packet = {
        id: packetId,
        kind: 'static-world-face-packet',
        sortKey: sortKey,
        tie: tie,
        sortViewRotation: currentViewRotation,
        itemRotation: cell && cell.rotation != null ? Number(cell.rotation || 0) : 0,
        sortWorldAnchor: descriptor.sortWorldAnchor || { x: Number(cell.x || 0), y: Number(cell.y || 0), z: Number(cell.z || 0), h: 1 },
        sortRotatedPoint: descriptor.sortRotatedPoint || null,
        instanceId: cell.instanceId || null,
        prefabId: cell.prefabId || null,
        renderPath: 'static-world-chunk-packet',
        cacheViewRotation: currentViewRotation,
        cacheContentType: 'world-face-packets',
        chunkKey: chunk && chunk.key ? String(chunk.key) : null,
        cameraIndependent: true,
        usesScreenSpaceCache: false,
        semanticFace: semanticFace,
        screenFace: screenFace,
        depthKey: descriptor.depthKey != null ? descriptor.depthKey : 0,
        fill: fill,
        stroke: stroke,
        texture: texture,
        textureColor: textureColor,
        semanticTextureSlot: semanticTextureSlot,
        semanticTextureSlotColor: semanticTextureSlotColor,
        width: 1,
        worldPts: worldPts,
        worldLoops: worldLoops,
        worldOutlineSegments: worldOutlineSegments,
        terrainBoundarySegmentsWorld: terrainBoundarySegmentsWorld,
        terrainBoundaryStroke: stroke,
        terrainBoundaryStrokeWidth: terrainBoundarySegmentsWorld.length ? 2.6 : 0,
        shadowOverlaysWorld: shadowOverlaysWorld,
        box: cell || null,
        cellX: Number(cell.x || 0),
        cellY: Number(cell.y || 0),
        cellZ: Number(cell.z || 0),
        faceKey: faceKey,
        actorInteractionMemberFaceKeys: buildActorInteractionMemberFaceKeysFromFaceDescriptor(descriptor, currentViewRotation),
        actorInteractionMemberDescriptors: getActorInteractionMemberDescriptorsFromFaceDescriptor(descriptor),
        packetNormal: normal,
        mergedFace: descriptor.merged === true,
        mergedFaceCount: Number(descriptor.memberCount || 1),
        mergeWidth: Number(descriptor.mergeWidth || 1),
        mergeHeight: Number(descriptor.mergeHeight || 1),
        terrainMaterialMergeKey: descriptor.terrainMaterialMergeKey || null,
        terrainMaterialId: getTerrainMaterialIdForRenderCell(cell),
        terrainMaterialLabel: terrainPatternDescriptor && terrainPatternDescriptor.label ? terrainPatternDescriptor.label : null,
        materialType: cell && (cell.materialType || cell.terrainBand) ? String(cell.materialType || cell.terrainBand) : null,
        terrainPatternDescriptor: terrainPatternDescriptor || null,
        terrainPatternOpacity: terrainPatternDescriptor && Number.isFinite(Number(terrainPatternDescriptor.opacity)) ? Number(terrainPatternDescriptor.opacity) : null
      };
      step6ObjectAllocationMs += Math.max(0, perfNow() - objectAllocationStartAt);
      var arrayPushStartAt = perfNow();
      packets.push(packet);
      step7ArrayPushMs += Math.max(0, perfNow() - arrayPushStartAt);
    }
    var liquidPackets = buildLiquidRenderPacketsForChunk(chunkBoxes, neighborBoxes, currentViewRotation, computeViewAwareSortMeta, domainCore);
    var terrainHeightSurfacePackets = buildTerrainHeightSurfacePacketsForChunk(chunkBoxes, neighborBoxes, currentViewRotation, computeViewAwareSortMeta, domainCore);
    if (liquidPackets.length) {
      for (var lpi = 0; lpi < liquidPackets.length; lpi++) {
        if (liquidPackets[lpi] && chunk && chunk.key) liquidPackets[lpi].chunkKey = String(chunk.key);
        packets.push(liquidPackets[lpi]);
      }
    }
    if (terrainHeightSurfacePackets.length) {
      for (var thpi = 0; thpi < terrainHeightSurfacePackets.length; thpi++) {
        if (terrainHeightSurfacePackets[thpi] && chunk && chunk.key) terrainHeightSurfacePackets[thpi].chunkKey = String(chunk.key);
        packets.push(terrainHeightSurfacePackets[thpi]);
      }
    }
    var step5BuildPacketsMs = Math.max(0, perfNow() - packetBuildStartAt);
    var staticRenderableBuildStartAt = perfNow();
    var finalizeRenderableListStartAt = perfNow();
    var packetOrderResult = staticWorldPacketOrdering.sortStaticWorldPackets(packets, {
      compareRenderablesByDomain: compareRenderablesByDomain,
      perfNow: perfNow
    });
    step8FinalizeRenderableListMs += Number(packetOrderResult && packetOrderResult.sortMs || 0);
    emitStaticFaceRotationPacketDiagnostics({ packets: packets, currentViewRotation: currentViewRotation, chunkKey: chunk && chunk.key ? String(chunk.key) : null, faceMergeMode: faceMergeMode, screenPointsFromWorldFaceNoCamera: screenPointsFromWorldFaceNoCamera });
    emitTerrainMergeStackPacketDiagnostics({ packets: packets, currentViewRotation: currentViewRotation, chunkKey: chunk && chunk.key ? String(chunk.key) : null, faceMergeMode: faceMergeMode, screenPointsFromWorldFaceNoCamera: screenPointsFromWorldFaceNoCamera });
    var step6BuildStaticRenderablesMs = Math.max(0, perfNow() - staticRenderableBuildStartAt);
    var step7SortRenderablesMs = Number(step8FinalizeRenderableListMs.toFixed(3));
    var sortStartAt = perfNow();
    var finalizeStartAt = perfNow();
    var totalStaticRenderableBuildMs = Math.max(0, perfNow() - staticRenderableBuildProfileStartAt);
    var staticRenderableBuildMs = Number(totalStaticRenderableBuildMs.toFixed(3));
    var visibleFaceCountAfterCull = Number(surfaceCache.visibleTopFaceCount || 0) + Number(surfaceCache.visibleSideFaceCount || 0);
    var logicalVoxelCountEstimated = Number(surfaceCache.logicalVoxelCountEstimated || chunkBoxes.length || 0);
    var candidateFacesPerVoxel = cameraScope.surfaceOnlyRenderingEnabled !== false ? 3 : 5;
    var exposedFaceCountBeforeCull = Math.max(visibleFaceCountAfterCull, logicalVoxelCountEstimated * candidateFacesPerVoxel);
    var chunkBounds = chunk && chunk.bounds ? chunk.bounds : null;
    var overlappedBoxCount = 0;
    for (var nb = 0; nb < neighborBoxes.length; nb++) {
      var nbox = neighborBoxes[nb];
      if (!nbox || !chunkBounds) continue;
      var nMinX = Number(nbox.x || 0);
      var nMinY = Number(nbox.y || 0);
      var nMaxX = nMinX + Math.max(1, Number(nbox.w) || 1);
      var nMaxY = nMinY + Math.max(1, Number(nbox.d) || 1);
      if (nMinX < chunkBounds.maxX && nMaxX > chunkBounds.minX && nMinY < chunkBounds.maxY && nMaxY > chunkBounds.minY) overlappedBoxCount += 1;
    }
    var columnSet = new Set();
    for (var cb = 0; cb < chunkBoxes.length; cb++) {
      var cbox = chunkBoxes[cb];
      if (!cbox) continue;
      var w = Math.max(1, Number(cbox.w) || 1);
      var d = Math.max(1, Number(cbox.d) || 1);
      for (var dx = 0; dx < w; dx++) {
        for (var dy = 0; dy < d; dy++) columnSet.add(String(Number(cbox.x || 0) + dx) + ',' + String(Number(cbox.y || 0) + dy));
      }
    }
    var step8FinalizeChunkCacheMs = Math.max(0, perfNow() - finalizeStartAt);
    var totalChunkBuildMs = Math.max(0, perfNow() - chunkBuildStartAt);
    var touchedChunkKeys = Array.isArray(opts.touchedChunkKeys) ? opts.touchedChunkKeys.slice() : [chunk && chunk.key ? String(chunk.key) : null].filter(Boolean);
    var scopePayload = {
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      localBoxCount: Number(chunkBoxes.length || 0),
      scannedBoxCount: Number(chunkBoxes.length + neighborBoxes.length || 0),
      scannedChunkCount: Number(touchedChunkKeys.length || 0),
      touchedChunkKeys: touchedChunkKeys,
      touchedGlobalOccupancy: usedGlobalOccupancy === true,
      touchedGlobalRenderableList: false,
      touchedGlobalSurfacePass: false,
      isChunkLocalOnly: usedLocalOccupancyFallback === true
    };
    emitChunkRebuildScopeVerify(scopePayload);
    var detailPayload = {
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      localBoxCount: Number(chunkBoxes.length || 0),
      neighborBoxCount: Number(neighborBoxes.length || 0),
      overlappedBoxCount: Number(overlappedBoxCount || 0),
      uniqueColumnCount: Number(columnSet.size || 0),
      exposedFaceCountBeforeCull: Number(exposedFaceCountBeforeCull || 0),
      visibleFaceCountAfterCull: Number(visibleFaceCountAfterCull || 0),
      staticRenderableCount: Number(packets.length || 0),
      packetCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      faceMergeMode: faceMergeMode,
      faceMergeFallbackReason: faceMergeFallbackReason,
      terrainInputFaceDescriptorCount: Number(terrainInputFaceDescriptorCount || 0),
      terrainMergedFaceDescriptorCount: Number(terrainMergedFaceDescriptorCount || 0),
      terrainMergedStaticFaceCount: Number(terrainMergedStaticFaceCount || 0),
      terrainMergeReductionRatio: Number(terrainMergeReductionRatio || 0),
      terrainSideInputFaceDescriptorCount: Number(terrainSideInputFaceDescriptorCount || 0),
      terrainSideMergedFaceDescriptorCount: Number(terrainSideMergedFaceDescriptorCount || 0),
      terrainSideMergedStaticFaceCount: Number(terrainSideMergedStaticFaceCount || 0),
      terrainSideMergeReductionRatio: Number(terrainSideMergeReductionRatio || 0),
      terrainSideStepBreakCount: Number(terrainSideStepBreakCount || 0),
      terrainTopOcclusionBreakCount: Number(terrainTopOcclusionBreakCount || 0),
      terrainTopStepBoundaryDescriptorCount: Number(terrainTopStepBoundaryDescriptorCount || 0),
      terrainTopStepBoundaryUniqueSignatureCount: Number(terrainTopStepBoundaryUniqueSignatureCount || 0),
      terrainTopStepBoundaryMixedStripCount: Number(terrainTopStepBoundaryMixedStripCount || 0),
      terrainTopStepBoundaryMixedMemberCount: Number(terrainTopStepBoundaryMixedMemberCount || 0),
      terrainTopStepBoundaryWouldBreakCount: Number(terrainTopStepBoundaryWouldBreakCount || 0),
      terrainTopStepBoundarySampleCount: Number(terrainTopStepBoundarySampleCount || 0),
      terrainTopStepBoundarySamples: terrainTopStepBoundarySamples,
      terrainTopStepBoundaryMergeKeyEnabled: terrainTopStepBoundaryMergeKeyEnabled === true,
      terrainTopBarrierSplitCount: Number(terrainTopBarrierSplitCount || 0),
      terrainTopBarrierCutPointCount: Number(terrainTopBarrierCutPointCount || 0),
      terrainTopBarrierCandidateCount: Number(terrainTopBarrierCandidateCount || 0),
      terrainTopBarrierAcceptedCount: Number(terrainTopBarrierAcceptedCount || 0),
      terrainTopBarrierRejectedOutOfPlaneCount: Number(terrainTopBarrierRejectedOutOfPlaneCount || 0),
      terrainTopBarrierRejectedOutsideStripBoundsCount: Number(terrainTopBarrierRejectedOutsideStripBoundsCount || 0),
      terrainTopBarrierRejectedOutsideSortRangeCount: Number(terrainTopBarrierRejectedOutsideSortRangeCount || 0),
      terrainTopBarrierRejectedNoInsertionIndexCount: Number(terrainTopBarrierRejectedNoInsertionIndexCount || 0),
      terrainTopBarrierNonMonotonicStripCount: Number(terrainTopBarrierNonMonotonicStripCount || 0),
      terrainTopBarrierMaxSegmentLength: Number(terrainTopBarrierMaxSegmentLength || 0),
      terrainTopBarrierIndexSideCount: Number(terrainTopBarrierIndexSideCount || 0),
      terrainTopBarrierIndexPlaneCount: Number(terrainTopBarrierIndexPlaneCount || 0),
      terrainTopBarrierIndexUpperPlaneCount: Number(terrainTopBarrierIndexUpperPlaneCount || 0),
      terrainTopBarrierIndexVerticalIntervalPlaneCount: Number(terrainTopBarrierIndexVerticalIntervalPlaneCount || 0),
      terrainTopBarrierLegacyPlaneCandidateCount: Number(terrainTopBarrierLegacyPlaneCandidateCount || 0),
      terrainTopBarrierUpperPlaneCandidateCount: Number(terrainTopBarrierUpperPlaneCandidateCount || 0),
      terrainTopBarrierIntervalPlaneCandidateCount: Number(terrainTopBarrierIntervalPlaneCandidateCount || 0),
      terrainTopBarrierWouldAcceptBySideUpperPlaneCount: Number(terrainTopBarrierWouldAcceptBySideUpperPlaneCount || 0),
      terrainTopBarrierWouldAcceptBySortKeyOnlyCount: Number(terrainTopBarrierWouldAcceptBySortKeyOnlyCount || 0),
      terrainTopBarrierTieSortMismatchCount: Number(terrainTopBarrierTieSortMismatchCount || 0),
      terrainTopBarrierPlaneMissButWouldAcceptCount: Number(terrainTopBarrierPlaneMissButWouldAcceptCount || 0),
      terrainTopBarrierSortKeyInsertionIndexCount: Number(terrainTopBarrierSortKeyInsertionIndexCount || 0),
      terrainTopBarrierTieSortInsertionIndexCount: Number(terrainTopBarrierTieSortInsertionIndexCount || 0),
      terrainTopBarrierDiagnosticsOnlySuppressedSplitCount: Number(terrainTopBarrierDiagnosticsOnlySuppressedSplitCount || 0),
      terrainTopBarrierCorrectedAcceptedCount: Number(terrainTopBarrierCorrectedAcceptedCount || 0),
      terrainTopBarrierCorrectedSplitCount: Number(terrainTopBarrierCorrectedSplitCount || 0),
      terrainTopBarrierCorrectedCutPointCount: Number(terrainTopBarrierCorrectedCutPointCount || 0),
      terrainTopBarrierCorrectedRejectedOutsideStripBoundsCount: Number(terrainTopBarrierCorrectedRejectedOutsideStripBoundsCount || 0),
      terrainTopBarrierCorrectedRejectedOutsideSortRangeCount: Number(terrainTopBarrierCorrectedRejectedOutsideSortRangeCount || 0),
      terrainTopBarrierCorrectedRejectedNoInsertionIndexCount: Number(terrainTopBarrierCorrectedRejectedNoInsertionIndexCount || 0),
      terrainTopBarrierSamples: terrainTopBarrierSamples,
      terrainTopBarrierRejectedOutsideStripBoundsSamples: terrainTopBarrierRejectedOutsideStripBoundsSamples,
      terrainTopBarrierRejectedOutsideSortRangeSamples: terrainTopBarrierRejectedOutsideSortRangeSamples,
      terrainTopBarrierTieSortMismatchSamples: terrainTopBarrierTieSortMismatchSamples,
      terrainTopBarrierPlaneMissButWouldAcceptSamples: terrainTopBarrierPlaneMissButWouldAcceptSamples,
      terrainTopBarrierSortKeyOnlyAcceptSamples: terrainTopBarrierSortKeyOnlyAcceptSamples,
      terrainTopBlockerSplitCount: Number(terrainTopBlockerSplitCount || 0),
      terrainTopBlockerCutPointCount: Number(terrainTopBlockerCutPointCount || 0),
      terrainTopBlockerCount: Number(terrainTopBlockerCount || 0),
      terrainTopBlockerExactCellHitCount: Number(terrainTopBlockerExactCellHitCount || 0),
      terrainTopBlockerAdjacentCellCandidateCount: Number(terrainTopBlockerAdjacentCellCandidateCount || 0),
      terrainTopBlockerAdjacentCellAcceptedCount: Number(terrainTopBlockerAdjacentCellAcceptedCount || 0),
      terrainTopBlockerAdjacentCellRejectedNotFacingCount: Number(terrainTopBlockerAdjacentCellRejectedNotFacingCount || 0),
      terrainTopBlockerSortInsertionCandidateCount: Number(terrainTopBlockerSortInsertionCandidateCount || 0),
      terrainTopBlockerRejectedNonExactCount: Number(terrainTopBlockerRejectedNonExactCount || 0),
      terrainTopBlockerRejectedOutOfSortRangeCount: Number(terrainTopBlockerRejectedOutOfSortRangeCount || 0),
      terrainFinalVisibleSideDescriptorCount: Number(terrainFinalVisibleSideDescriptorCount || 0),
      terrainTopBlockerAcceptedSamples: terrainTopBlockerAcceptedSamples,
      terrainTopBlockerRejectedSamples: terrainTopBlockerRejectedSamples,
      terrainMergeFaceDescriptorsMs: Number(terrainMergeFaceDescriptorsMs.toFixed(3)),
      terrainFaceMergeMode: terrainFaceMergeMode,
      terrainFaceMergeFallbackReason: terrainFaceMergeFallbackReason,
      terrainPacketCount: Number(terrainPacketCount || 0),
      occupancyAccessMode: occupancyAccessMode,
      usedGlobalOccupancy: usedGlobalOccupancy === true,
      usedLocalOccupancyFallback: usedLocalOccupancyFallback === true,
      occupancyFallbackReason: occupancyFallbackReason,
      occupancyValidationSampleCount: occupancyValidationSampleCount,
      step1_collectChunkBoxesMs: Number(step1CollectChunkBoxesMs.toFixed(3)),
      step2_collectNeighborBoxesMs: Number(step2CollectNeighborBoxesMs.toFixed(3)),
      step3_resolveOccupancyMs: Number(step3ResolveOccupancyMs.toFixed(3)),
      step3_buildLocalOccupancyMs: Number(step3BuildLocalOccupancyMs.toFixed(3)),
      step4_computeVisibleFacesMs: Number(step4ComputeVisibleFacesMs.toFixed(3)),
      step5_buildPacketsMs: Number(step5BuildPacketsMs.toFixed(3)),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
      step6_buildStaticRenderablesMs: Number(step6BuildStaticRenderablesMs.toFixed(3)),
      step7_sortRenderablesMs: Number(step7SortRenderablesMs.toFixed(3)),
      step8_finalizeChunkCacheMs: Number(step8FinalizeChunkCacheMs.toFixed(3)),
      totalChunkBuildMs: Number(totalChunkBuildMs.toFixed(3))
    };
    emitChunkRebuildDetail(detailPayload);
    var hotspotThresholdMs = 50;
    if (totalChunkBuildMs >= hotspotThresholdMs) {
      var stepEntries = [
        ['step1_collectChunkBoxesMs', step1CollectChunkBoxesMs],
        ['step2_collectNeighborBoxesMs', step2CollectNeighborBoxesMs],
        ['step3_resolveOccupancyMs', step3ResolveOccupancyMs],
        ['step3_buildLocalOccupancyMs', step3BuildLocalOccupancyMs],
        ['step4_computeVisibleFacesMs', step4ComputeVisibleFacesMs],
        ['step5_buildPacketsMs', step5BuildPacketsMs],
        ['step6_buildStaticRenderablesMs', step6BuildStaticRenderablesMs],
        ['step7_sortRenderablesMs', step7SortRenderablesMs],
        ['step8_finalizeChunkCacheMs', step8FinalizeChunkCacheMs]
      ].sort(function (a, b) { return Number(b[1] || 0) - Number(a[1] || 0); });
      emitChunkRebuildHotspot({
        terrainBatchId: profileContext.terrainBatchId || null,
        frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
        chunkKey: chunk && chunk.key ? String(chunk.key) : null,
        totalChunkBuildMs: Number(totalChunkBuildMs.toFixed(3)),
        localBoxCount: Number(chunkBoxes.length || 0),
        visibleFaceCountAfterCull: Number(visibleFaceCountAfterCull || 0),
        staticRenderableCount: Number(packets.length || 0),
        packetCount: Number(packets.length || 0),
        inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
        mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
        mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
        mergeReductionRatio: Number(mergeReductionRatio || 0),
        mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        faceMergeMode: faceMergeMode,
        faceMergeFallbackReason: faceMergeFallbackReason,
        terrainInputFaceDescriptorCount: Number(terrainInputFaceDescriptorCount || 0),
        terrainMergedFaceDescriptorCount: Number(terrainMergedFaceDescriptorCount || 0),
        terrainMergedStaticFaceCount: Number(terrainMergedStaticFaceCount || 0),
        terrainMergeReductionRatio: Number(terrainMergeReductionRatio || 0),
        terrainMergeFaceDescriptorsMs: Number(terrainMergeFaceDescriptorsMs.toFixed(3)),
        terrainFaceMergeMode: terrainFaceMergeMode,
        terrainFaceMergeFallbackReason: terrainFaceMergeFallbackReason,
        terrainPacketCount: Number(terrainPacketCount || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      faceMergeMode: faceMergeMode,
      faceMergeFallbackReason: faceMergeFallbackReason,
        dominantStep: String(stepEntries[0] && stepEntries[0][0] || ''),
        dominantStepMs: Number(Number(stepEntries[0] && stepEntries[0][1] || 0).toFixed(3)),
        secondStep: String(stepEntries[1] && stepEntries[1][0] || ''),
        secondStepMs: Number(Number(stepEntries[1] && stepEntries[1][1] || 0).toFixed(3))
      });
    }
    var staticRenderableBuildDetailPayload = {
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      localBoxCount: Number(chunkBoxes.length || 0),
      visibleFaceCount: Number(visibleFaceCountAfterCull || 0),
      inputPacketCount: Number(packets.length || 0),
      step1_prepareFaceInputsMs: Number(step1PrepareFaceInputsMs.toFixed(3)),
      step2_buildRenderableBaseMs: Number(step2BuildRenderableBaseMs.toFixed(3)),
      step3_buildStyleOrMaterialMs: Number(step3BuildStyleOrMaterialMs.toFixed(3)),
      step4_buildColorMs: Number(step4BuildColorMs.toFixed(3)),
      step5_computeSortKeyMs: Number(step5ComputeSortKeyMs.toFixed(3)),
      step6_objectAllocationMs: Number(step6ObjectAllocationMs.toFixed(3)),
      step7_arrayPushMs: Number(step7ArrayPushMs.toFixed(3)),
      step8_finalizeRenderableListMs: Number(step8FinalizeRenderableListMs.toFixed(3)),
      outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
      totalStaticRenderableBuildMs: Number(totalStaticRenderableBuildMs.toFixed(3))
    };
    emitStaticRenderableBuildDetail(staticRenderableBuildDetailPayload);
    emitStaticRenderableBuildScopeVerify({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      localBoxCount: Number(chunkBoxes.length || 0),
      scannedFaceCount: Number(scannedFaceCount || 0),
      scannedRenderableCount: Number(packets.length || 0),
      touchedGlobalRenderableTemplates: touchedGlobalRenderableTemplates === true,
      touchedGlobalStyleCache: touchedGlobalStyleCache === true,
      touchedGlobalMaterialCache: touchedGlobalMaterialCache === true,
      isChunkLocalOnly: true
    });
    if (totalStaticRenderableBuildMs >= hotspotThresholdMs) {
      var renderableStepEntries = [
        ['step1_prepareFaceInputsMs', step1PrepareFaceInputsMs],
        ['step2_buildRenderableBaseMs', step2BuildRenderableBaseMs],
        ['step3_buildStyleOrMaterialMs', step3BuildStyleOrMaterialMs],
        ['step4_buildColorMs', step4BuildColorMs],
        ['step5_computeSortKeyMs', step5ComputeSortKeyMs],
        ['step6_objectAllocationMs', step6ObjectAllocationMs],
        ['step7_arrayPushMs', step7ArrayPushMs],
        ['step8_finalizeRenderableListMs', step8FinalizeRenderableListMs]
      ].sort(function (a, b) { return Number(b[1] || 0) - Number(a[1] || 0); });
      emitStaticRenderableBuildHotspot({
        terrainBatchId: profileContext.terrainBatchId || null,
        frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
        chunkKey: chunk && chunk.key ? String(chunk.key) : null,
        localBoxCount: Number(chunkBoxes.length || 0),
        outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        totalStaticRenderableBuildMs: Number(totalStaticRenderableBuildMs.toFixed(3)),
        dominantStep: String(renderableStepEntries[0] && renderableStepEntries[0][0] || ''),
        dominantStepMs: Number(Number(renderableStepEntries[0] && renderableStepEntries[0][1] || 0).toFixed(3)),
        secondStep: String(renderableStepEntries[1] && renderableStepEntries[1][0] || ''),
        secondStepMs: Number(Number(renderableStepEntries[1] && renderableStepEntries[1][1] || 0).toFixed(3))
      });
    }
    var uniqueColorKeyCount = Number(colorBuildStats.colorKeyUsage.size || 0);
    var avgColorBuildMsPerRenderable = packets.length > 0 ? step4BuildColorMs / packets.length : 0;
    emitColorBuildDetail({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
      colorCacheEnabled: colorBuildStats.colorCacheEnabled === true,
      colorCacheHitCount: Number(colorBuildStats.colorCacheHitCount || 0),
      colorCacheMissCount: Number(colorBuildStats.colorCacheMissCount || 0),
      uniqueColorKeyCount: uniqueColorKeyCount,
      step4_buildColorMs: Number(step4BuildColorMs.toFixed(3)),
      avgColorBuildMsPerRenderable: Number(avgColorBuildMsPerRenderable.toFixed(6))
    });
    emitStep4ColorBuildDetail({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
      colorCacheHitCount: Number(colorBuildStats.colorCacheHitCount || 0),
      colorCacheMissCount: Number(colorBuildStats.colorCacheMissCount || 0),
      shadowOverlayCacheHitCount: Number(colorBuildStats.shadowOverlayCacheHitCount || 0),
      shadowOverlayCacheMissCount: Number(colorBuildStats.shadowOverlayCacheMissCount || 0),
      shadowOverlayTotalCount: Number(colorBuildStats.shadowOverlayTotalCount || 0),
      step4a_colorCacheLookupMs: Number(colorBuildStats.step4a_colorCacheLookupMs.toFixed(3)),
      step4b_colorCacheHitFastPathMs: Number(colorBuildStats.step4b_colorCacheHitFastPathMs.toFixed(3)),
      step4c_colorMissPathMs: Number(colorBuildStats.step4c_colorMissPathMs.toFixed(3)),
      step4d_shadowOverlayTotalMs: Number(colorBuildStats.step4d_shadowOverlayTotalMs.toFixed(3)),
      step4e_shadowOverlayCacheLookupMs: Number(colorBuildStats.step4e_shadowOverlayCacheLookupMs.toFixed(3)),
      step4f_shadowOverlayCollectMs: Number(colorBuildStats.step4f_shadowOverlayCollectMs.toFixed(3)),
      step4g_shadowOverlayCloneMs: Number(colorBuildStats.step4g_shadowOverlayCloneMs.toFixed(3)),
      step4h_fillAndOverlayAssignMs: Number(colorBuildStats.step4h_fillAndOverlayAssignMs.toFixed(3)),
      totalStep4BuildColorMs: Number(step4BuildColorMs.toFixed(3))
    });
    emitStep4ColorBuildScopeVerify({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
      scannedFaceCount: Number(scannedFaceCount || 0),
      colorCacheHitCount: Number(colorBuildStats.colorCacheHitCount || 0),
      colorCacheMissCount: Number(colorBuildStats.colorCacheMissCount || 0),
      shadowOverlayCacheHitCount: Number(colorBuildStats.shadowOverlayCacheHitCount || 0),
      shadowOverlayCacheMissCount: Number(colorBuildStats.shadowOverlayCacheMissCount || 0),
      touchedColorCachePath: colorBuildStats.touchedColorCachePath === true,
      touchedNaturalColorPath: colorBuildStats.touchedNaturalColorPath === true,
      touchedLightingPath: colorBuildStats.touchedLightingPath === true,
      touchedShadowOverlayPath: colorBuildStats.touchedShadowOverlayPath === true,
      touchedProjectedShadowCollector: colorBuildStats.touchedProjectedShadowCollector === true,
      isStep4MostlyLocal: colorBuildStats.touchedProjectedShadowCollector !== true
    });
    var dominantPathEntry = null;
    colorBuildStats.actualColorPathUsedCounts.forEach(function (count, key) {
      if (!dominantPathEntry || Number(count || 0) > Number(dominantPathEntry.count || 0)) dominantPathEntry = { key: key, count: Number(count || 0) };
    });
    var terrainSettingsForBuild = getTerrainRenderSettingsForRender();
    emitBuildColorPathVerify({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      terrainBuildColorMode: String((terrainSettingsForBuild && terrainSettingsForBuild.terrainBuildColorMode) || 'natural'),
      terrainBuildLightingBypass: terrainSettingsForBuild && terrainSettingsForBuild.terrainBuildLightingBypass === true,
      lightingEnabledUi: isStaticRenderableLightingUiEnabledForBuild(),
      actualColorPathUsed: String(dominantPathEntry && dominantPathEntry.key || getStaticRenderableActualColorPathUsed(terrainSettingsForBuild)),
      usedLightingSignature: colorBuildStats.usedLightingSignature === true,
      dominantColorMode: String(dominantPathEntry && dominantPathEntry.key ? String(dominantPathEntry.key).split('+')[0] : getStaticRenderableBuildColorModeForRender(terrainSettingsForBuild))
    });
    emitLightingShadowBypassVerify({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      lightingEnabledUi: isStaticRenderableLightingUiEnabledForBuild(),
      terrainBuildLightingBypass: terrainSettingsForBuild && terrainSettingsForBuild.terrainBuildLightingBypass === true,
      usedLightingSignature: colorBuildStats.usedLightingSignature === true,
      touchedShadowOverlayPath: colorBuildStats.touchedShadowOverlayPath === true,
      touchedProjectedShadowCollector: colorBuildStats.touchedProjectedShadowCollector === true,
      shadowOverlaySkippedByLightingOff: colorBuildStats.shadowOverlaySkippedByLightingOff === true,
      actualColorPathUsed: String(dominantPathEntry && dominantPathEntry.key || getStaticRenderableActualColorPathUsed(terrainSettingsForBuild))
    });
    emitStep4ShadowPathSummary({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      step4_buildColorMs: Number(step4BuildColorMs.toFixed(3)),
      step4d_shadowOverlayTotalMs: Number(colorBuildStats.step4d_shadowOverlayTotalMs.toFixed(3)),
      step4h_fillAndOverlayAssignMs: Number(colorBuildStats.step4h_fillAndOverlayAssignMs.toFixed(3)),
      shadowOverlayCacheHitRate: Number((Number(colorBuildStats.shadowOverlayCacheHitCount || 0) + Number(colorBuildStats.shadowOverlayCacheMissCount || 0)) > 0 ? (Number(colorBuildStats.shadowOverlayCacheHitCount || 0) / (Number(colorBuildStats.shadowOverlayCacheHitCount || 0) + Number(colorBuildStats.shadowOverlayCacheMissCount || 0))).toFixed(6) : '0.000000'),
      shadowOverlayTotalCount: Number(colorBuildStats.shadowOverlayTotalCount || 0)
    });
    emitColorBuildMissBreakdown({
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      colorCacheMissCount: Number(colorBuildStats.colorCacheMissCount || 0),
      miss_step1_paletteLookupMs: Number(colorBuildStats.miss_step1_paletteLookupMs.toFixed(3)),
      miss_step2_heightBucketMs: Number(colorBuildStats.miss_step2_heightBucketMs.toFixed(3)),
      miss_step3_materialColorMs: Number(colorBuildStats.miss_step3_materialColorMs.toFixed(3)),
      miss_step4_lightingMixMs: Number(colorBuildStats.miss_step4_lightingMixMs.toFixed(3)),
      miss_step5_cssOrObjectBuildMs: Number(colorBuildStats.miss_step5_cssOrObjectBuildMs.toFixed(3)),
      totalMissPathMs: Number((colorBuildStats.miss_step1_paletteLookupMs + colorBuildStats.miss_step2_heightBucketMs + colorBuildStats.miss_step3_materialColorMs + colorBuildStats.miss_step4_lightingMixMs + colorBuildStats.miss_step5_cssOrObjectBuildMs).toFixed(3))
    });
    if (step4BuildColorMs >= hotspotThresholdMs) {
      var dominantColorEntry = null;
      colorBuildStats.colorKeyUsage.forEach(function (entry) {
        if (!dominantColorEntry || Number(entry && entry.count || 0) > Number(dominantColorEntry && dominantColorEntry.count || 0)) dominantColorEntry = entry;
      });
      var totalColorOps = Number(colorBuildStats.colorCacheHitCount || 0) + Number(colorBuildStats.colorCacheMissCount || 0);
      var colorCacheHitRate = totalColorOps > 0 ? Number(colorBuildStats.colorCacheHitCount || 0) / totalColorOps : 0;
      emitColorBuildHotspot({
        terrainBatchId: profileContext.terrainBatchId || null,
        frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
        chunkKey: chunk && chunk.key ? String(chunk.key) : null,
        dominantColorMode: String(dominantColorEntry && dominantColorEntry.terrainColorMode || ''),
        dominantFaceType: String(dominantColorEntry && dominantColorEntry.dominantFaceType || ''),
        dominantMaterialType: String(dominantColorEntry && dominantColorEntry.dominantMaterialType || ''),
        dominantHeightBucket: Number(dominantColorEntry && dominantColorEntry.dominantHeightBucket != null ? dominantColorEntry.dominantHeightBucket : 0),
        colorCacheHitRate: Number(colorCacheHitRate.toFixed(6)),
        totalColorBuildMs: Number(step4BuildColorMs.toFixed(3))
      });
      var step4Substeps = [
        ['step4a_colorCacheLookupMs', colorBuildStats.step4a_colorCacheLookupMs],
        ['step4b_colorCacheHitFastPathMs', colorBuildStats.step4b_colorCacheHitFastPathMs],
        ['step4c_colorMissPathMs', colorBuildStats.step4c_colorMissPathMs],
        ['step4d_shadowOverlayTotalMs', colorBuildStats.step4d_shadowOverlayTotalMs],
        ['step4e_shadowOverlayCacheLookupMs', colorBuildStats.step4e_shadowOverlayCacheLookupMs],
        ['step4f_shadowOverlayCollectMs', colorBuildStats.step4f_shadowOverlayCollectMs],
        ['step4g_shadowOverlayCloneMs', colorBuildStats.step4g_shadowOverlayCloneMs],
        ['step4h_fillAndOverlayAssignMs', colorBuildStats.step4h_fillAndOverlayAssignMs]
      ].sort(function (a, b) { return Number(b[1] || 0) - Number(a[1] || 0); });
      emitStep4ColorBuildHotspot({
        terrainBatchId: profileContext.terrainBatchId || null,
        frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
        chunkKey: chunk && chunk.key ? String(chunk.key) : null,
        outputRenderableCount: Number(packets.length || 0),
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        totalStep4BuildColorMs: Number(step4BuildColorMs.toFixed(3)),
        shadowOverlayCacheHitRate: Number((Number(colorBuildStats.shadowOverlayCacheHitCount || 0) + Number(colorBuildStats.shadowOverlayCacheMissCount || 0)) > 0 ? (Number(colorBuildStats.shadowOverlayCacheHitCount || 0) / (Number(colorBuildStats.shadowOverlayCacheHitCount || 0) + Number(colorBuildStats.shadowOverlayCacheMissCount || 0))).toFixed(6) : '0.000000'),
        dominantSubstep: String(step4Substeps[0] && step4Substeps[0][0] || ''),
        dominantSubstepMs: Number(Number(step4Substeps[0] && step4Substeps[0][1] || 0).toFixed(3)),
        secondSubstep: String(step4Substeps[1] && step4Substeps[1][0] || ''),
        secondSubstepMs: Number(Number(step4Substeps[1] && step4Substeps[1][1] || 0).toFixed(3))
      });
    }
    emitChunkRebuildBreakdown({
      chunkKey: chunk && chunk.key ? String(chunk.key) : null,
      localBoxCount: Number(chunkBoxes.length || 0),
      neighborBoxCount: Number(neighborBoxes.length || 0),
      occupancyBuildMs: Number(occupancyBuildMs.toFixed(3)),
      occupancyAccessMode: occupancyAccessMode,
      usedGlobalOccupancy: usedGlobalOccupancy === true,
      usedLocalOccupancyFallback: usedLocalOccupancyFallback === true,
      occupancyFallbackReason: occupancyFallbackReason,
      visibleSurfaceBuildMs: Number(visibleSurfaceBuildMs.toFixed(3)),
      staticRenderableBuildMs: Number(staticRenderableBuildMs.toFixed(3)),
      terrainInputFaceDescriptorCount: Number(terrainInputFaceDescriptorCount || 0),
      terrainMergedFaceDescriptorCount: Number(terrainMergedFaceDescriptorCount || 0),
      terrainMergedStaticFaceCount: Number(terrainMergedStaticFaceCount || 0),
      terrainMergeReductionRatio: Number(terrainMergeReductionRatio || 0),
      terrainSideInputFaceDescriptorCount: Number(terrainSideInputFaceDescriptorCount || 0),
      terrainSideMergedFaceDescriptorCount: Number(terrainSideMergedFaceDescriptorCount || 0),
      terrainSideMergedStaticFaceCount: Number(terrainSideMergedStaticFaceCount || 0),
      terrainSideMergeReductionRatio: Number(terrainSideMergeReductionRatio || 0),
      terrainSideStepBreakCount: Number(terrainSideStepBreakCount || 0),
      terrainTopOcclusionBreakCount: Number(terrainTopOcclusionBreakCount || 0),
      terrainTopStepBoundaryDescriptorCount: Number(terrainTopStepBoundaryDescriptorCount || 0),
      terrainTopStepBoundaryUniqueSignatureCount: Number(terrainTopStepBoundaryUniqueSignatureCount || 0),
      terrainTopStepBoundaryMixedStripCount: Number(terrainTopStepBoundaryMixedStripCount || 0),
      terrainTopStepBoundaryMixedMemberCount: Number(terrainTopStepBoundaryMixedMemberCount || 0),
      terrainTopStepBoundaryWouldBreakCount: Number(terrainTopStepBoundaryWouldBreakCount || 0),
      terrainTopStepBoundarySampleCount: Number(terrainTopStepBoundarySampleCount || 0),
      terrainTopStepBoundarySamples: terrainTopStepBoundarySamples,
      terrainTopStepBoundaryMergeKeyEnabled: terrainTopStepBoundaryMergeKeyEnabled === true,
      terrainTopBarrierSplitCount: Number(terrainTopBarrierSplitCount || 0),
      terrainTopBarrierCutPointCount: Number(terrainTopBarrierCutPointCount || 0),
      terrainTopBarrierCandidateCount: Number(terrainTopBarrierCandidateCount || 0),
      terrainTopBarrierAcceptedCount: Number(terrainTopBarrierAcceptedCount || 0),
      terrainTopBarrierRejectedOutOfPlaneCount: Number(terrainTopBarrierRejectedOutOfPlaneCount || 0),
      terrainTopBarrierRejectedOutsideStripBoundsCount: Number(terrainTopBarrierRejectedOutsideStripBoundsCount || 0),
      terrainTopBarrierRejectedOutsideSortRangeCount: Number(terrainTopBarrierRejectedOutsideSortRangeCount || 0),
      terrainTopBarrierRejectedNoInsertionIndexCount: Number(terrainTopBarrierRejectedNoInsertionIndexCount || 0),
      terrainTopBarrierNonMonotonicStripCount: Number(terrainTopBarrierNonMonotonicStripCount || 0),
      terrainTopBarrierMaxSegmentLength: Number(terrainTopBarrierMaxSegmentLength || 0),
      terrainTopBarrierIndexSideCount: Number(terrainTopBarrierIndexSideCount || 0),
      terrainTopBarrierIndexPlaneCount: Number(terrainTopBarrierIndexPlaneCount || 0),
      terrainTopBarrierIndexUpperPlaneCount: Number(terrainTopBarrierIndexUpperPlaneCount || 0),
      terrainTopBarrierIndexVerticalIntervalPlaneCount: Number(terrainTopBarrierIndexVerticalIntervalPlaneCount || 0),
      terrainTopBarrierLegacyPlaneCandidateCount: Number(terrainTopBarrierLegacyPlaneCandidateCount || 0),
      terrainTopBarrierUpperPlaneCandidateCount: Number(terrainTopBarrierUpperPlaneCandidateCount || 0),
      terrainTopBarrierIntervalPlaneCandidateCount: Number(terrainTopBarrierIntervalPlaneCandidateCount || 0),
      terrainTopBarrierWouldAcceptBySideUpperPlaneCount: Number(terrainTopBarrierWouldAcceptBySideUpperPlaneCount || 0),
      terrainTopBarrierWouldAcceptBySortKeyOnlyCount: Number(terrainTopBarrierWouldAcceptBySortKeyOnlyCount || 0),
      terrainTopBarrierTieSortMismatchCount: Number(terrainTopBarrierTieSortMismatchCount || 0),
      terrainTopBarrierPlaneMissButWouldAcceptCount: Number(terrainTopBarrierPlaneMissButWouldAcceptCount || 0),
      terrainTopBarrierSortKeyInsertionIndexCount: Number(terrainTopBarrierSortKeyInsertionIndexCount || 0),
      terrainTopBarrierTieSortInsertionIndexCount: Number(terrainTopBarrierTieSortInsertionIndexCount || 0),
      terrainTopBarrierDiagnosticsOnlySuppressedSplitCount: Number(terrainTopBarrierDiagnosticsOnlySuppressedSplitCount || 0),
      terrainTopBarrierCorrectedAcceptedCount: Number(terrainTopBarrierCorrectedAcceptedCount || 0),
      terrainTopBarrierCorrectedSplitCount: Number(terrainTopBarrierCorrectedSplitCount || 0),
      terrainTopBarrierCorrectedCutPointCount: Number(terrainTopBarrierCorrectedCutPointCount || 0),
      terrainTopBarrierCorrectedRejectedOutsideStripBoundsCount: Number(terrainTopBarrierCorrectedRejectedOutsideStripBoundsCount || 0),
      terrainTopBarrierCorrectedRejectedOutsideSortRangeCount: Number(terrainTopBarrierCorrectedRejectedOutsideSortRangeCount || 0),
      terrainTopBarrierCorrectedRejectedNoInsertionIndexCount: Number(terrainTopBarrierCorrectedRejectedNoInsertionIndexCount || 0),
      terrainTopBarrierSamples: terrainTopBarrierSamples,
      terrainTopBarrierRejectedOutsideStripBoundsSamples: terrainTopBarrierRejectedOutsideStripBoundsSamples,
      terrainTopBarrierRejectedOutsideSortRangeSamples: terrainTopBarrierRejectedOutsideSortRangeSamples,
      terrainTopBarrierTieSortMismatchSamples: terrainTopBarrierTieSortMismatchSamples,
      terrainTopBarrierPlaneMissButWouldAcceptSamples: terrainTopBarrierPlaneMissButWouldAcceptSamples,
      terrainTopBarrierSortKeyOnlyAcceptSamples: terrainTopBarrierSortKeyOnlyAcceptSamples,
      terrainTopBlockerSplitCount: Number(terrainTopBlockerSplitCount || 0),
      terrainTopBlockerCutPointCount: Number(terrainTopBlockerCutPointCount || 0),
      terrainTopBlockerCount: Number(terrainTopBlockerCount || 0),
      terrainTopBlockerExactCellHitCount: Number(terrainTopBlockerExactCellHitCount || 0),
      terrainTopBlockerAdjacentCellCandidateCount: Number(terrainTopBlockerAdjacentCellCandidateCount || 0),
      terrainTopBlockerAdjacentCellAcceptedCount: Number(terrainTopBlockerAdjacentCellAcceptedCount || 0),
      terrainTopBlockerAdjacentCellRejectedNotFacingCount: Number(terrainTopBlockerAdjacentCellRejectedNotFacingCount || 0),
      terrainTopBlockerSortInsertionCandidateCount: Number(terrainTopBlockerSortInsertionCandidateCount || 0),
      terrainTopBlockerRejectedNonExactCount: Number(terrainTopBlockerRejectedNonExactCount || 0),
      terrainTopBlockerRejectedOutOfSortRangeCount: Number(terrainTopBlockerRejectedOutOfSortRangeCount || 0),
      terrainFinalVisibleSideDescriptorCount: Number(terrainFinalVisibleSideDescriptorCount || 0),
      terrainTopBlockerAcceptedSamples: terrainTopBlockerAcceptedSamples,
      terrainTopBlockerRejectedSamples: terrainTopBlockerRejectedSamples,
      terrainMergeFaceDescriptorsMs: Number(terrainMergeFaceDescriptorsMs.toFixed(3)),
      terrainPacketCount: Number(terrainPacketCount || 0),
      totalChunkBuildMs: Number(totalChunkBuildMs.toFixed(3))
    });
    return {
      packets: packets,
      stats: {
        terrainBatchId: profileContext.terrainBatchId || null,
        frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
        chunkKey: chunk && chunk.key ? String(chunk.key) : null,
        localBoxCount: chunkBoxes.length,
        neighborBoxCount: neighborBoxes.length,
        overlappedBoxCount: Number(overlappedBoxCount || 0),
        uniqueColumnCount: Number(columnSet.size || 0),
        exposedFaceCountBeforeCull: Number(exposedFaceCountBeforeCull || 0),
        visibleFaceCountAfterCull: Number(visibleFaceCountAfterCull || 0),
        packetCount: Number(packets.length || 0),
        inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
        mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
        mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
        mergeReductionRatio: Number(mergeReductionRatio || 0),
        mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        faceMergeMode: faceMergeMode,
        faceMergeFallbackReason: faceMergeFallbackReason,
      inputFaceDescriptorCount: Number(inputFaceDescriptorCount || 0),
      mergedFaceDescriptorCount: Number(mergedFaceDescriptorCount || 0),
      mergedStaticFaceCount: Number(mergedStaticFaceCount || 0),
      mergeReductionRatio: Number(mergeReductionRatio || 0),
      faceMergeMode: faceMergeMode,
      faceMergeFallbackReason: faceMergeFallbackReason,
        structuredBoxCount: chunkBoxes.length,
        renderSourceCountBeforeVisibility: chunkBoxes.length,
        renderSourceCountAfterVisibility: surfaceCells.length,
        logicalVoxelCountEstimated: logicalVoxelCountEstimated,
        visibleTopFaceCount: Number(surfaceCache.visibleTopFaceCount || 0),
        visibleSideFaceCount: Number(surfaceCache.visibleSideFaceCount || 0),
        hiddenInternalSurfaceSkippedCount: Number(surfaceCache.hiddenInternalSurfaceSkippedCount || 0),
        voxelFurnitureProcessedCount: Number(surfaceCache.voxelFurnitureProcessedCount || 0),
        cacheContentType: 'world-face-packets',
        cameraIndependent: true,
        usesScreenSpaceCache: false,
        occupancyAccessMode: occupancyAccessMode,
        usedGlobalOccupancy: usedGlobalOccupancy === true,
        usedLocalOccupancyFallback: usedLocalOccupancyFallback === true,
        occupancyFallbackReason: occupancyFallbackReason,
        occupancyValidationSampleCount: occupancyValidationSampleCount,
        occupancyBuildMs: Number(occupancyBuildMs.toFixed(3)),
        visibleSurfaceBuildMs: Number(visibleSurfaceBuildMs.toFixed(3)),
        staticRenderableBuildMs: Number(staticRenderableBuildMs.toFixed(3)),
        step1_collectChunkBoxesMs: Number(step1CollectChunkBoxesMs.toFixed(3)),
        step2_collectNeighborBoxesMs: Number(step2CollectNeighborBoxesMs.toFixed(3)),
        step3_resolveOccupancyMs: Number(step3ResolveOccupancyMs.toFixed(3)),
        step3_buildLocalOccupancyMs: Number(step3BuildLocalOccupancyMs.toFixed(3)),
        step4_computeVisibleFacesMs: Number(step4ComputeVisibleFacesMs.toFixed(3)),
        step5_buildPacketsMs: Number(step5BuildPacketsMs.toFixed(3)),
      mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        step6_buildStaticRenderablesMs: Number(step6BuildStaticRenderablesMs.toFixed(3)),
        step7_sortRenderablesMs: Number(step7SortRenderablesMs.toFixed(3)),
        step8_finalizeChunkCacheMs: Number(step8FinalizeChunkCacheMs.toFixed(3)),
        step1_prepareFaceInputsMs: Number(step1PrepareFaceInputsMs.toFixed(3)),
        mergeFaceDescriptorsMs: Number(mergeFaceDescriptorsMs.toFixed(3)),
        step2_buildRenderableBaseMs: Number(step2BuildRenderableBaseMs.toFixed(3)),
        step3_buildStyleOrMaterialMs: Number(step3BuildStyleOrMaterialMs.toFixed(3)),
        step4_buildColorMs: Number(step4BuildColorMs.toFixed(3)),
        colorCacheEnabled: colorBuildStats.colorCacheEnabled === true,
        colorCacheHitCount: Number(colorBuildStats.colorCacheHitCount || 0),
        colorCacheMissCount: Number(colorBuildStats.colorCacheMissCount || 0),
        uniqueColorKeyCount: Number(colorBuildStats.colorKeyUsage.size || 0),
        avgColorBuildMsPerRenderable: Number((packets.length > 0 ? step4BuildColorMs / packets.length : 0).toFixed(6)),
        terrainBuildColorMode: String((getTerrainRenderSettingsForRender() && getTerrainRenderSettingsForRender().terrainBuildColorMode) || 'natural'),
        terrainBuildLightingBypass: getTerrainRenderSettingsForRender() && getTerrainRenderSettingsForRender().terrainBuildLightingBypass === true,
        miss_step1_paletteLookupMs: Number(colorBuildStats.miss_step1_paletteLookupMs.toFixed(3)),
        miss_step2_heightBucketMs: Number(colorBuildStats.miss_step2_heightBucketMs.toFixed(3)),
        miss_step3_materialColorMs: Number(colorBuildStats.miss_step3_materialColorMs.toFixed(3)),
        miss_step4_lightingMixMs: Number(colorBuildStats.miss_step4_lightingMixMs.toFixed(3)),
        miss_step5_cssOrObjectBuildMs: Number(colorBuildStats.miss_step5_cssOrObjectBuildMs.toFixed(3)),
        step4a_colorCacheLookupMs: Number(colorBuildStats.step4a_colorCacheLookupMs.toFixed(3)),
        step4b_colorCacheHitFastPathMs: Number(colorBuildStats.step4b_colorCacheHitFastPathMs.toFixed(3)),
        step4c_colorMissPathMs: Number(colorBuildStats.step4c_colorMissPathMs.toFixed(3)),
        step4d_shadowOverlayTotalMs: Number(colorBuildStats.step4d_shadowOverlayTotalMs.toFixed(3)),
        step4e_shadowOverlayCacheLookupMs: Number(colorBuildStats.step4e_shadowOverlayCacheLookupMs.toFixed(3)),
        step4f_shadowOverlayCollectMs: Number(colorBuildStats.step4f_shadowOverlayCollectMs.toFixed(3)),
        step4g_shadowOverlayCloneMs: Number(colorBuildStats.step4g_shadowOverlayCloneMs.toFixed(3)),
        step4h_fillAndOverlayAssignMs: Number(colorBuildStats.step4h_fillAndOverlayAssignMs.toFixed(3)),
        shadowOverlayCacheHitCount: Number(colorBuildStats.shadowOverlayCacheHitCount || 0),
        shadowOverlayCacheMissCount: Number(colorBuildStats.shadowOverlayCacheMissCount || 0),
        shadowOverlayTotalCount: Number(colorBuildStats.shadowOverlayTotalCount || 0),
        step5_computeSortKeyMs: Number(step5ComputeSortKeyMs.toFixed(3)),
        step6_objectAllocationMs: Number(step6ObjectAllocationMs.toFixed(3)),
        step7_arrayPushMs: Number(step7ArrayPushMs.toFixed(3)),
        step8_finalizeRenderableListMs: Number(step8FinalizeRenderableListMs.toFixed(3)),
        scannedFaceCount: Number(scannedFaceCount || 0),
        scannedRenderableCount: Number(packets.length || 0),
        touchedGlobalRenderableTemplates: touchedGlobalRenderableTemplates === true,
        touchedGlobalStyleCache: touchedGlobalStyleCache === true,
        touchedGlobalMaterialCache: touchedGlobalMaterialCache === true,
        touchedColorCachePath: colorBuildStats.touchedColorCachePath === true,
        touchedNaturalColorPath: colorBuildStats.touchedNaturalColorPath === true,
        touchedLightingPath: colorBuildStats.touchedLightingPath === true,
        touchedShadowOverlayPath: colorBuildStats.touchedShadowOverlayPath === true,
        touchedProjectedShadowCollector: colorBuildStats.touchedProjectedShadowCollector === true,
        totalStaticRenderableBuildMs: Number(totalStaticRenderableBuildMs.toFixed(3)),
        scannedBoxCount: Number(chunkBoxes.length + neighborBoxes.length || 0),
        scannedChunkCount: Number(touchedChunkKeys.length || 0),
        touchedChunkKeys: touchedChunkKeys,
        touchedGlobalOccupancy: usedGlobalOccupancy === true,
        touchedGlobalRenderableList: false,
        touchedGlobalSurfacePass: false,
        isChunkLocalOnly: usedLocalOccupancyFallback === true,
        finalRenderableCount: packets.length,
        totalChunkBuildMs: Number(totalChunkBuildMs.toFixed(3))
      }
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    buildStaticWorldChunkRenderables: buildStaticWorldChunkRenderables,
    summarizeBoundary: function () {
      return { owner: OWNER, phase: PHASE, layer: 'application/render', input: 'world chunk + render hooks', output: 'static world renderable packets', forbidden: ['ctx', 'canvas', 'document', 'Image', 'localStorage', 'fetch'] };
    }
  };

  try {
    global.__STATIC_WORLD_RENDERABLE_BUILDER__ = api;
    global.__APP_APPLICATION_STATIC_WORLD_RENDERABLE_BUILDER__ = api;
    global.IsometricStaticWorldRenderableBuilder = api;
    global.App = global.App || {};
    global.App.application = global.App.application || {};
    global.App.application.render = global.App.application.render || {};
    global.App.application.render.staticWorldRenderableBuilder = api;
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
