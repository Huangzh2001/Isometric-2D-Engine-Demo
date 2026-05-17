// P12b-6 owner: stable local actor demerge and support-top predicate helpers.
(function initStableLocalDemergeBoundary(global) {
  'use strict';
  var OWNER = {
    phase: 'P12b-6',
    layer: 'presentation/render/interaction',
    owner: 'stable-local-demerge',
    responsibility: 'actor stable local demerge, support-top packet predicates, and demerge cache only'
  };
  var __stableLocalDemergeCache = { key: '', result: null, hitCount: 0, missCount: 0 };
  var activeDeps = null;

  function withDeps(deps, fn) {
    var prev = activeDeps;
    activeDeps = deps && typeof deps === 'object' ? deps : {};
    try { return fn(); }
    finally { activeDeps = prev; }
  }

  function dep(name) {
    return activeDeps && typeof activeDeps[name] === 'function' ? activeDeps[name] : null;
  }

  function callDep(name, args, fallbackValue) {
    var fn = dep(name);
    if (fn) return fn.apply(null, args || []);
    return typeof fallbackValue === 'function' ? fallbackValue() : fallbackValue;
  }

  function getStableActorSortApiForRender() { return callDep('getStableActorSortApiForRender', [], null); }
  function isStableActorSortModeEnabledForRender() { return callDep('isStableActorSortModeEnabledForRender', [], false) === true; }
  function normalizeMainEditorViewRotationValue(value) { return callDep('normalizeMainEditorViewRotationValue', [value], function () { return Number(value || 0) || 0; }); }
  function getActorInteractionSortRadiusForRender() { return callDep('getActorInteractionSortRadiusForRender', [], 2); }
  function compareRenderablesByDomain(a, b) { return callDep('compareRenderablesByDomain', [a, b], function () { return (Number(a && a.sortKey || 0) - Number(b && b.sortKey || 0)) || (Number(a && a.tie || 0) - Number(b && b.tie || 0)); }); }
  function summarizeActorDiagRenderable(value) { return callDep('summarizeActorDiagRenderable', [value], value || null); }
  function summarizeActorDiagPlayer(value) { return callDep('summarizeActorDiagPlayer', [value], value || null); }
  function emitActorInteractionOrderDiag(tag, payload, options) { return callDep('emitActorInteractionOrderDiag', [tag, payload, options], false); }
  function isActorInteractionOrderDiagEnabled() { return callDep('isActorInteractionOrderDiagEnabled', [], false) === true; }

  function isStableLocalDemergeExplicitlyEnabled() {
    return callDep('isStableLocalDemergeExplicitlyEnabledForRender', [], false) === true;
  }

function publishStableLocalDemergeLastState(result, playerObj, enabled) {
  try {
    global.__STABLE_LOCAL_DEMERGE_LAST_STATE__ = {
      active: enabled === true && !!(result && String(result.mode || '').indexOf('disabled') < 0),
      mode: result && result.mode ? String(result.mode) : '',
      playerInteractionCellKey: result && result.playerInteractionCellKey ? String(result.playerInteractionCellKey) : buildStableLocalDemergeInteractionCellKey(playerObj),
      playerInteractionChunkKey: result && result.playerInteractionChunkKey ? String(result.playerInteractionChunkKey) : buildStableLocalDemergeInteractionChunkKey(playerObj),
      splitPacketCount: Number(result && result.splitPacketCount || 0),
      createdFaceCount: Number(result && result.createdFaceCount || 0),
      cacheHit: result && result.cacheHit === true,
      source: 'stable-local-demerge'
    };
  } catch (_) {}
}

  function buildStableLocalDemergeDisabledResult(list, playerObj, normalizedViewRotation, reason) {
  return {
    staticRenderables: list,
    inputCount: list.length,
    outputCount: list.length,
    splitPacketCount: 0,
    createdFaceCount: 0,
    residualMergedPacketCount: 0,
    playerInteractionCellKey: buildStableLocalDemergeInteractionCellKey(playerObj),
    playerInteractionChunkKey: buildStableLocalDemergeInteractionChunkKey(playerObj),
    checkedPacketCount: 0,
    skippedFarPacketCount: 0,
    cacheHit: false,
    cacheHitCount: __stableLocalDemergeCache ? __stableLocalDemergeCache.hitCount : 0,
    cacheMissCount: __stableLocalDemergeCache ? __stableLocalDemergeCache.missCount : 0,
    mode: 'stable-local-demerge-disabled-by-default',
    reason: String(reason || 'requires-explicit-stableActorSortDemerge-1')
    };
  }

  function isActorDiagTerrainCell(cell) { return callDep('isActorDiagTerrainCell', [cell], false) === true; }
  function roundActorDiagNumber(value) { return callDep('roundActorDiagNumber', [value], function () { return Number(value || 0); }); }
  function buildActorInteractionCellFaceKey(cell, semanticFace, viewRotation) { return callDep('buildActorInteractionCellFaceKey', [cell, semanticFace, viewRotation], null); }
  function getActorInteractionMemberDescriptorsFromFaceDescriptor(descriptor) { return callDep('getActorInteractionMemberDescriptorsFromFaceDescriptor', [descriptor], function () { return descriptor ? [descriptor] : []; }); }
  function buildActorInteractionMemberFaceKeysFromFaceDescriptor(descriptor, viewRotation) { return callDep('buildActorInteractionMemberFaceKeysFromFaceDescriptor', [descriptor, viewRotation], []); }
  function getScreenFaceForSemanticFace(face, viewRotation) { return callDep('getScreenFaceForSemanticFace', [face, viewRotation], face || null); }
  function getStaticWorldFaceMergeCoreApi() { return callDep('getStaticWorldFaceMergeCoreApi', [], null); }
  function getTerrainFaceMergeCoreApi() { return callDep('getTerrainFaceMergeCoreApi', [], null); }
  function buildMergedVoxelFaceWorldGeometry(descriptor) { return callDep('buildMergedVoxelFaceWorldGeometry', [descriptor], function () { return { worldPts: [] }; }); }
  function getSemanticFaceNormal(face) { return callDep('getSemanticFaceNormal', [face], null); }
  function getSemanticFaceNeighborDeltaForRender(face) { return callDep('getSemanticFaceNeighborDeltaForRender', [face], { dx: 0, dy: 0, dz: 0 }); }
  function getTerrainMaterialPatternDescriptorForRenderCell(cell, semanticFace) { return callDep('getTerrainMaterialPatternDescriptorForRenderCell', [cell, semanticFace], null); }
  function getTerrainMaterialBaseFaceColorsForRenderCell(cell) { return callDep('getTerrainMaterialBaseFaceColorsForRenderCell', [cell], null); }
  function getCachedBaseFaceColorsForRenderable(base) { return callDep('getCachedBaseFaceColorsForRenderable', [base], function () { return { line: '#000000', top: '#ffffff', left: '#dddddd', right: '#bbbbbb' }; }); }
  function getCachedStaticRenderableFill(cell, semanticFace, worldPts, normal, viewRotation, extra) { return callDep('getCachedStaticRenderableFill', [cell, semanticFace, worldPts, normal, viewRotation, extra], function () { return { fill: '#ffffff' }; }); }
  function getTerrainRenderSettingsForRender() { return callDep('getTerrainRenderSettingsForRender', [], null); }
  function isStaticRenderableLightingActiveForBuild(settings) { return callDep('isStaticRenderableLightingActiveForBuild', [settings], false) === true; }
  function buildVoxelFaceShadowWorldOverlays(worldPts, normal, instanceId, extra) { return callDep('buildVoxelFaceShadowWorldOverlays', [worldPts, normal, instanceId, extra], []); }
  function buildTerrainTopBoundarySegmentsWorldFromDescriptor(descriptor, reader) { return callDep('buildTerrainTopBoundarySegmentsWorldFromDescriptor', [descriptor, reader], []); }
  function getGlobalTerrainBoundaryOccupancyReaderForRender(reason) { return callDep('getGlobalTerrainBoundaryOccupancyReaderForRender', [reason], null); }
  function buildTerrainPolygonLoopSignature(descriptor) { return callDep('buildTerrainPolygonLoopSignature', [descriptor], ''); }
  function getTerrainMaterialIdForRenderCell(cell) { return callDep('getTerrainMaterialIdForRenderCell', [cell], null); }
  function getSettingsForStableLocalDemerge() { return callDep('getSettingsForStableLocalDemerge', [], function () { return (typeof global.settings !== 'undefined' && global.settings) ? global.settings : null; }); }

function getActorInteractionPacketMemberCells(packet) {
  var out = [];
  if (!packet || typeof packet !== 'object') return out;
  var members = Array.isArray(packet.actorInteractionMemberDescriptors) && packet.actorInteractionMemberDescriptors.length
    ? packet.actorInteractionMemberDescriptors
    : (Array.isArray(packet.members) && packet.members.length ? packet.members : [packet.box || packet.cell || null]);
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var cell = m && (m.cell || m.box || m);
    if (cell && typeof cell === 'object') out.push(cell);
  }
  return out;
}

function isActorInteractionTerrainSupportTopPacket(packet, cells) {
  if (!packet || typeof packet !== 'object') return false;
  if (packet.terrainMaterialMergeKey != null || packet.terrainMaterialId != null || packet.terrainMaterialLabel != null) return true;
  var packetMaterial = String(packet.materialType || packet.terrainBand || packet.prefabId || packet.instanceId || '').toLowerCase();
  if (packetMaterial.indexOf('terrain') >= 0) return true;
  var list = Array.isArray(cells) ? cells : [];
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (!c) continue;
    if (c.generatedBy === 'terrain-generator' || c.terrain === true || c.isTerrain === true) return true;
    if (c.terrainBand != null || c.terrainMaterialId != null || c.terrainMaterialMergeKey != null) return true;
    var cellText = String(c.materialType || c.prefabId || c.instanceId || '').toLowerCase();
    if (cellText.indexOf('terrain') >= 0) return true;
  }
  return false;
}

function getActorInteractionPacketGroupKeys(packet, cells) {
  var keys = [];
  var seen = new Set();
  var list = Array.isArray(cells) ? cells : [];
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (!c) continue;
    var instanceId = c.instanceId != null ? String(c.instanceId) : (packet && packet.instanceId != null ? String(packet.instanceId) : '');
    var key = getActorInteractionGroupKeyForCell(c, instanceId);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

function doesTopPacketActAsPlayerSupportFloor(packet, playerRef, groupSummaryMap) {
  if (!packet || !playerRef) return false;
  if (packet.kind !== 'static-world-face-packet') return false;
  if (String(packet.semanticFace || '') !== 'top') return false;

  var px = Number(playerRef.x || 0);
  var py = Number(playerRef.y || 0);
  var pz = Number(playerRef.z || 0);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) return false;

  var cells = getActorInteractionPacketMemberCells(packet);
  if (!cells.length) return false;

  var isTerrainPacket = isActorInteractionTerrainSupportTopPacket(packet, cells);
  if (!isTerrainPacket) {
    var groupKeys = getActorInteractionPacketGroupKeys(packet, cells);
    if (groupKeys.length !== 1 || !groupSummaryMap || typeof groupSummaryMap.get !== 'function') return false;
    var group = groupSummaryMap.get(groupKeys[0]);
    var footprintCount = group && group.footprintKeys && typeof group.footprintKeys.size === 'number'
      ? group.footprintKeys.size
      : 0;
    // Preserve the original stable path for normal multi-footprint objects such as 2x1 bench/table/sofa.
    // The support-top override is only needed for terrain top packets and normal single-cell top packets.
    if (footprintCount !== 1) return false;
  }

  // Use a half-open footprint interval for support-top ownership.
  // The previous +/- margin made two adjacent merged top packets both claim the
  // player at cell borders, so the same visible floor switched between one and
  // two support packets while walking and produced frame-to-frame flicker.
  var supportEpsilon = 0.0001;
  for (var i = 0; i < cells.length; i++) {
    var c = cells[i];
    if (!c) continue;
    var cx = Math.floor(Number(c.x || 0));
    var cy = Math.floor(Number(c.y || 0));
    var cz = Number(c.z || 0);
    var cw = Math.max(1, Number(c.w != null ? c.w : 1));
    var cd = Math.max(1, Number(c.d != null ? c.d : 1));
    var ch = Math.max(1, Number(c.h != null ? c.h : 1));
    var topZ = cz + ch;
    if (Math.abs(topZ - pz) > 0.001) continue;
    if (px >= cx - supportEpsilon && px < cx + cw - supportEpsilon
      && py >= cy - supportEpsilon && py < cy + cd - supportEpsilon) {
      return true;
    }
  }
  return false;
}
function getActorInteractionPacketMemberDescriptors(packet) {
  if (!packet || typeof packet !== 'object') return [];
  if (Array.isArray(packet.actorInteractionMemberDescriptors) && packet.actorInteractionMemberDescriptors.length) {
    return packet.actorInteractionMemberDescriptors.filter(Boolean);
  }
  if (Array.isArray(packet.members) && packet.members.length) return packet.members.filter(Boolean);
  var fallback = packet.box || packet.cell || null;
  return fallback ? [Object.assign({}, packet, { cell: fallback, box: fallback })] : [];
}

function hashStableLocalDemergeString(seed, value) {
  var hash = Number(seed || 2166136261) >>> 0;
  var str = String(value == null ? '' : value);
  for (var i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function getStableLocalDemergePacketIdentity(packet) {
  if (!packet || typeof packet !== 'object') return 'null';
  return [
    packet.id || '',
    packet.faceKey || '',
    packet.semanticFace || '',
    packet.screenFace || '',
    Number(packet.sortKey || 0).toFixed(3),
    Number(packet.tie || 0).toFixed(3),
    Number(packet.mergedFaceCount || packet.memberCount || 1),
    packet.terrainMaterialMergeKey || '',
    packet.cacheViewRotation != null ? Number(packet.cacheViewRotation || 0) : ''
  ].join('~');
}

function buildStableLocalDemergeListHash(staticRenderables) {
  var list = Array.isArray(staticRenderables) ? staticRenderables : [];
  var hash = 2166136261 >>> 0;
  hash = hashStableLocalDemergeString(hash, list.length);
  for (var i = 0; i < list.length; i++) {
    hash = hashStableLocalDemergeString(hash, getStableLocalDemergePacketIdentity(list[i]));
  }
  return String(hash >>> 0);
}

function floorStableLocalDemergeCoord(value) {
  var n = Number(value || 0);
  if (!Number.isFinite(n)) n = 0;
  return Math.floor(n);
}

function getStableLocalDemergeInteractionCell(playerRef) {
  if (!playerRef || typeof playerRef !== 'object') return null;
  return {
    x: floorStableLocalDemergeCoord(playerRef.x),
    y: floorStableLocalDemergeCoord(playerRef.y),
    z: floorStableLocalDemergeCoord(playerRef.z)
  };
}

function buildStableLocalDemergeInteractionCellKey(playerRef) {
  var cell = getStableLocalDemergeInteractionCell(playerRef);
  if (!cell) return 'none';
  return [cell.x, cell.y, cell.z].join(',');
}

function getStaticWorldChunkCacheApiForStableLocalDemerge() {
  try { return global.__STATIC_WORLD_CHUNK_CACHE__ || null; } catch (_) {}
  return null;
}

function getStableLocalDemergeChunkSize() {
  try {
    var api = getStaticWorldChunkCacheApiForStableLocalDemerge();
    if (api && typeof api.getChunkSize === 'function') return Math.max(1, Math.round(Number(api.getChunkSize() || 16) || 16));
  } catch (_) {}
  try {
    var settings = getSettingsForStableLocalDemerge() || {};
    if (Number(settings.chunkSize) > 0) return Math.max(1, Math.round(Number(settings.chunkSize) || 16));
  } catch (_) {}
  return 16;
}

function buildStableLocalDemergeChunkKeyFromXY(x, y) {
  var size = getStableLocalDemergeChunkSize();
  var cx = Math.floor((Number(x) || 0) / size);
  var cy = Math.floor((Number(y) || 0) / size);
  return String(cx) + ',' + String(cy);
}

function buildStableLocalDemergeInteractionChunkKey(playerRef) {
  if (!playerRef || typeof playerRef !== 'object') return 'none';
  return buildStableLocalDemergeChunkKeyFromXY(playerRef.x, playerRef.y);
}

function buildStableLocalDemergeCacheKey(staticRenderables, viewRotation, playerRef, radius) {
  var list = Array.isArray(staticRenderables) ? staticRenderables : [];
  var surfaceStats = typeof __lastSurfaceCacheStats !== 'undefined' && __lastSurfaceCacheStats ? __lastSurfaceCacheStats : {};
  var staticCache = typeof staticBoxRenderCache !== 'undefined' && staticBoxRenderCache ? staticBoxRenderCache : {};
  var interactionChunkKey = buildStableLocalDemergeInteractionChunkKey(playerRef);
  return [
    'v5-interaction-chunk-wide',
    normalizeMainEditorViewRotationValue(viewRotation),
    // PXM-07.14H: chunk-wide local demerge is keyed by the active player chunk,
    // not by player cell or height. Walking or climbing inside the same chunk must
    // not reshuffle/rebuild the local demerge set.
    'chunk=' + interactionChunkKey,
    String(staticCache.geometrySignature || ''),
    String(staticCache.cacheSignature || ''),
    Number(surfaceStats.visibleChunkCount || 0),
    Number(surfaceStats.visibleStaticPacketCount || list.length || 0),
    Number(surfaceStats.rebuiltChunkCountThisFrame || 0),
    Number(surfaceStats.reusedChunkCountThisFrame || 0),
    buildStableLocalDemergeListHash(list)
  ].join('|');
}

function getActorInteractionDescriptorChunkKeyForLocalDemerge(descriptor) {
  var cell = descriptor && (descriptor.cell || descriptor.box) ? (descriptor.cell || descriptor.box) : null;
  if (!cell) return 'none';
  return buildStableLocalDemergeChunkKeyFromXY(cell.x, cell.y);
}

function isActorInteractionDescriptorNearPlayerForLocalDemerge(descriptor, playerRef, radius) {
  if (!descriptor || !playerRef) return false;

  // PXM-07.14H: true chunk-wide local demerge.
  // If a descriptor belongs to the same XY static chunk as the player, it is
  // included regardless of height. This keeps the demerge/cache boundary fixed
  // for the whole chunk until the player crosses into another chunk.
  var playerChunkKey = buildStableLocalDemergeInteractionChunkKey(playerRef);
  var descriptorChunkKey = getActorInteractionDescriptorChunkKeyForLocalDemerge(descriptor);
  if (playerChunkKey === 'none') return false;
  return descriptorChunkKey === playerChunkKey;
}

function buildStaticWorldFacePacketFromDescriptorForActorDemerge(descriptor, sourcePacket, viewRotation, mode, localIndex) {
  if (!descriptor || !sourcePacket) return null;
  var sf = String(descriptor.semanticFace || sourcePacket.semanticFace || '');
  if (!sf) return null;
  var cell = descriptor.cell || descriptor.box || sourcePacket.box || null;
  if (!cell) return null;
  var normal = descriptor.normal || sourcePacket.packetNormal || getSemanticFaceNormal(sf);
  var worldGeometry = buildMergedVoxelFaceWorldGeometry(descriptor);
  var worldPts = Array.isArray(worldGeometry && worldGeometry.worldPts) ? worldGeometry.worldPts : [];
  var worldLoops = Array.isArray(worldGeometry && worldGeometry.worldLoops) ? worldGeometry.worldLoops : null;
  var worldOutlineSegments = Array.isArray(worldGeometry && worldGeometry.worldOutlineSegments) ? worldGeometry.worldOutlineSegments : null;
  if (!worldPts.length) return null;
  var screenFace = descriptor.screenFace || sourcePacket.screenFace || getScreenFaceForSemanticFace(sf, viewRotation);
  var terrainPatternDescriptor = getTerrainMaterialPatternDescriptorForRenderCell(cell, sf);
  var terrainFc = getTerrainMaterialBaseFaceColorsForRenderCell(cell);
  var fc = terrainFc || getCachedBaseFaceColorsForRenderable((cell && cell.base) || '#7aa2f7');
  var stroke = terrainPatternDescriptor && terrainPatternDescriptor.lineColor ? terrainPatternDescriptor.lineColor : (sourcePacket.stroke || fc.line);
  var fill = getCachedStaticRenderableFill(cell, sf, worldPts, normal, viewRotation, null).fill;
  var terrainSettings = getTerrainRenderSettingsForRender();
  var lightingActive = isStaticRenderableLightingActiveForBuild(terrainSettings);
  var suppressMergedTerrainTopShadows = !!(descriptor && descriptor.isTerrainFaceMergeCandidate === true && sf === 'top' && Array.isArray(worldLoops) && worldLoops.length > 0);
  var shadowOverlaysWorld = lightingActive && !suppressMergedTerrainTopShadows
    ? buildVoxelFaceShadowWorldOverlays(worldPts, normal, cell.instanceId || null, null)
    : [];
  var terrainBoundarySegmentsWorld = buildTerrainTopBoundarySegmentsWorldFromDescriptor(
    descriptor,
    sourcePacket.terrainBoundaryOccupancyReader || getGlobalTerrainBoundaryOccupancyReaderForRender('stable-local-demerge:terrain-boundary')
  );
  var terrainLoopSignature = buildTerrainPolygonLoopSignature(descriptor);
  var merged = descriptor.merged === true;
  var faceKey = merged
    ? [cell.instanceId || 'unknown', [Number(descriptor.mergePlane || 0), Number(descriptor.mergeU || 0), Number(descriptor.mergeV || 0), Number(descriptor.mergeWidth || 1), Number(descriptor.mergeHeight || 1), Number(descriptor.memberCount || 1)].join(','), terrainLoopSignature || '', sf, screenFace].join('|')
    : buildActorInteractionCellFaceKey(cell, sf, viewRotation);
  if (!faceKey) return null;
  var modeLabel = String(mode || (merged ? 'residual-merged' : 'near-single'));
  return {
    id: 'stable-local-demerge-' + modeLabel + '-' + String(sourcePacket.id || 'packet') + '-' + String(localIndex || 0) + '-' + String(faceKey || 'face'),
    kind: 'static-world-face-packet',
    sortKey: Number(descriptor.sortKey != null ? descriptor.sortKey : sourcePacket.sortKey || 0),
    tie: Number(descriptor.tie != null ? descriptor.tie : sourcePacket.tie || 0),
    instanceId: cell.instanceId || sourcePacket.instanceId || null,
    prefabId: cell.prefabId || sourcePacket.prefabId || null,
    renderPath: 'stable-actor-sort-local-demerge-' + modeLabel,
    cacheViewRotation: viewRotation,
    cacheContentType: 'world-face-packets',
    cameraIndependent: true,
    usesScreenSpaceCache: false,
    semanticFace: sf,
    screenFace: screenFace,
    depthKey: descriptor.depthKey != null ? descriptor.depthKey : sourcePacket.depthKey || 0,
    fill: fill,
    stroke: stroke,
    texture: sourcePacket.texture || null,
    textureColor: sourcePacket.textureColor || null,
    semanticTextureSlot: sourcePacket.semanticTextureSlot || null,
    semanticTextureSlotColor: sourcePacket.semanticTextureSlotColor || null,
    width: sourcePacket.width || 1,
    worldPts: worldPts,
    worldLoops: worldLoops,
    worldOutlineSegments: worldOutlineSegments,
    terrainBoundarySegmentsWorld: terrainBoundarySegmentsWorld,
    terrainBoundaryStroke: sourcePacket.terrainBoundaryStroke || stroke,
    terrainBoundaryStrokeWidth: terrainBoundarySegmentsWorld.length ? (sourcePacket.terrainBoundaryStrokeWidth || 2.6) : 0,
    shadowOverlaysWorld: shadowOverlaysWorld,
    box: cell,
    cellX: Number(cell.x || 0),
    cellY: Number(cell.y || 0),
    cellZ: Number(cell.z || 0),
    faceKey: faceKey,
    chunkKey: descriptor.chunkKey || sourcePacket.chunkKey || getActorInteractionDescriptorChunkKeyForLocalDemerge(descriptor),
    actorInteractionStableDemergeChunkKey: descriptor.chunkKey || sourcePacket.chunkKey || getActorInteractionDescriptorChunkKeyForLocalDemerge(descriptor),
    actorInteractionMemberFaceKeys: buildActorInteractionMemberFaceKeysFromFaceDescriptor(descriptor, viewRotation),
    actorInteractionMemberDescriptors: getActorInteractionMemberDescriptorsFromFaceDescriptor(descriptor),
    packetNormal: normal,
    mergedFace: merged,
    mergedFaceCount: Number(descriptor.memberCount || 1),
    mergeWidth: Number(descriptor.mergeWidth || 1),
    mergeHeight: Number(descriptor.mergeHeight || 1),
    terrainMaterialMergeKey: descriptor.terrainMaterialMergeKey || sourcePacket.terrainMaterialMergeKey || null,
    terrainMaterialId: getTerrainMaterialIdForRenderCell(cell),
    terrainMaterialLabel: terrainPatternDescriptor && terrainPatternDescriptor.label ? terrainPatternDescriptor.label : sourcePacket.terrainMaterialLabel || null,
    materialType: cell && (cell.materialType || cell.terrainBand) ? String(cell.materialType || cell.terrainBand) : (sourcePacket.materialType || null),
    terrainPatternDescriptor: terrainPatternDescriptor || sourcePacket.terrainPatternDescriptor || null,
    terrainPatternOpacity: terrainPatternDescriptor && Number.isFinite(Number(terrainPatternDescriptor.opacity)) ? Number(terrainPatternDescriptor.opacity) : sourcePacket.terrainPatternOpacity || null,
    actorInteractionReplacement: false,
    actorInteractionStableDemergedFace: modeLabel === 'near-single',
    actorInteractionStableLocalDemerge: true,
    actorInteractionStableDemergeSourcePacketId: sourcePacket.id || null,
    actorInteractionStableDemergeMode: modeLabel,
    actorInteractionGroupFootprintMode: modeLabel === 'near-single' ? 'stable-local-demerge-near-player' : 'stable-local-demerge-residual-merged'
  };
}

function mergeActorInteractionResidualDescriptorsForPacket(sourcePacket, residualMembers) {
  var list = Array.isArray(residualMembers) ? residualMembers.filter(Boolean) : [];
  if (list.length <= 1) return list.slice();
  var cells = getActorInteractionPacketMemberCells(sourcePacket);
  var terrainLike = isActorInteractionTerrainSupportTopPacket(sourcePacket, cells);
  if (terrainLike) {
    var terrainCore = getTerrainFaceMergeCoreApi();
    if (terrainCore && typeof terrainCore.mergeTerrainFaceDescriptors === 'function') {
      var terrainResult = terrainCore.mergeTerrainFaceDescriptors(list, { enabled: true });
      if (terrainResult && Array.isArray(terrainResult.descriptors)) return terrainResult.descriptors;
    }
  }
  var faceMergeCore = getStaticWorldFaceMergeCoreApi();
  if (faceMergeCore && typeof faceMergeCore.mergeFaceDescriptors === 'function') {
    var result = faceMergeCore.mergeFaceDescriptors(list, { enabled: true });
    if (result && Array.isArray(result.descriptors)) return result.descriptors;
  }
  return list.slice();
}

function applyStableActorSortDemergeToStaticRenderables(staticRenderables, viewRotation, playerRef, options) {
  var list = Array.isArray(staticRenderables) ? staticRenderables : [];
  var api = getStableActorSortApiForRender();
  if (!api || typeof api.shouldDemergeStaticPacket !== 'function' || !isStableActorSortModeEnabledForRender()) {
    return {
      staticRenderables: list,
      inputCount: list.length,
      outputCount: list.length,
      splitPacketCount: 0,
      createdFaceCount: 0,
      residualMergedPacketCount: 0,
      cacheHit: false,
      mode: isStableActorSortModeEnabledForRender() ? 'stable-no-demerge-api' : 'legacy-disabled'
    };
  }

  var opts = options && typeof options === 'object' ? options : {};
  var radius = Math.max(1, Number(opts.radius || getActorInteractionSortRadiusForRender() || 2));
  var playerObj = playerRef && typeof playerRef === 'object' ? playerRef : null;
  if (!playerObj) {
    return {
      staticRenderables: list,
      inputCount: list.length,
      outputCount: list.length,
      splitPacketCount: 0,
      createdFaceCount: 0,
      residualMergedPacketCount: 0,
      cacheHit: false,
      mode: 'stable-local-demerge-no-player'
    };
  }

  var normalizedViewRotation = normalizeMainEditorViewRotationValue(viewRotation);
  if (!isStableLocalDemergeExplicitlyEnabled()) {
    var disabledResult = buildStableLocalDemergeDisabledResult(list, playerObj, normalizedViewRotation, 'disabled-to-preserve-static-terrain-order');
    if (isActorInteractionOrderDiagEnabled()) {
      emitActorInteractionOrderDiag('stable-local-demerge-disabled', {
        mode: disabledResult.mode,
        reason: disabledResult.reason,
        viewRotation: normalizedViewRotation,
        playerInteractionCellKey: disabledResult.playerInteractionCellKey,
        playerInteractionChunkKey: disabledResult.playerInteractionChunkKey,
        inputStaticRenderableCount: Number(list.length || 0),
        outputStaticRenderableCount: Number(list.length || 0),
        splitPacketCount: 0,
        createdFaceCount: 0,
        residualMergedPacketCount: 0,
        player: summarizeActorDiagPlayer(playerObj)
      }, { maxCount: 6000 });
    }
    publishStableLocalDemergeLastState(disabledResult, playerObj, false);
    return disabledResult;
  }

  var cacheKey = buildStableLocalDemergeCacheKey(list, normalizedViewRotation, playerObj, radius);
  if (__stableLocalDemergeCache && __stableLocalDemergeCache.key === cacheKey && __stableLocalDemergeCache.result) {
    __stableLocalDemergeCache.hitCount += 1;
    var cachedResult = Object.assign({}, __stableLocalDemergeCache.result, {
      cacheHit: true,
      cacheHitCount: __stableLocalDemergeCache.hitCount,
      cacheMissCount: __stableLocalDemergeCache.missCount
    });
    publishStableLocalDemergeLastState(cachedResult, playerObj, true);
    return cachedResult;
  }
  if (__stableLocalDemergeCache) __stableLocalDemergeCache.missCount += 1;

  var out = [];
  var splitPacketCount = 0;
  var createdFaceCount = 0;
  var residualMergedPacketCount = 0;
  var nearMemberCount = 0;
  var farMemberCount = 0;
  var checkedPacketCount = 0;
  var skippedFarPacketCount = 0;
  var samples = [];
  var residualSamples = [];

  for (var i = 0; i < list.length; i++) {
    var packet = list[i];
    var members = getActorInteractionPacketMemberDescriptors(packet);
    if (!members.length || members.length <= 1) {
      out.push(packet);
      continue;
    }

    var nearMembers = [];
    var farMembers = [];
    for (var mi = 0; mi < members.length; mi++) {
      var member = members[mi];
      if (isActorInteractionDescriptorNearPlayerForLocalDemerge(member, playerObj, radius)) nearMembers.push(member);
      else farMembers.push(member);
    }
    if (!nearMembers.length) {
      out.push(packet);
      skippedFarPacketCount += 1;
      continue;
    }

    var shouldSplit = false;
    checkedPacketCount += 1;
    try { shouldSplit = api.shouldDemergeStaticPacket(packet) === true; } catch (_) { shouldSplit = false; }
    if (!shouldSplit) {
      out.push(packet);
      continue;
    }

    var createdForPacket = 0;
    for (var ni = 0; ni < nearMembers.length; ni++) {
      var replacement = buildStaticWorldFacePacketFromDescriptorForActorDemerge(nearMembers[ni], packet, normalizedViewRotation, 'near-single', ni);
      if (!replacement) continue;
      out.push(replacement);
      createdForPacket += 1;
      createdFaceCount += 1;
      nearMemberCount += 1;
      if (samples.length < 16) samples.push(summarizeActorDiagRenderable(replacement));
    }

    var residualDescriptors = farMembers.length ? mergeActorInteractionResidualDescriptorsForPacket(packet, farMembers) : [];
    for (var ri = 0; ri < residualDescriptors.length; ri++) {
      var residual = buildStaticWorldFacePacketFromDescriptorForActorDemerge(residualDescriptors[ri], packet, normalizedViewRotation, 'residual-merged', ri);
      if (!residual) continue;
      out.push(residual);
      if (residual.mergedFace === true) residualMergedPacketCount += 1;
      farMemberCount += Math.max(1, Number(residual.mergedFaceCount || 1));
      if (residualSamples.length < 12) residualSamples.push(summarizeActorDiagRenderable(residual));
    }

    if (createdForPacket > 0) splitPacketCount += 1;
    else out.push(packet);
  }

  if (splitPacketCount > 0) out.sort(compareRenderablesByDomain);
  if (splitPacketCount > 0 && isActorInteractionOrderDiagEnabled()) {
    emitActorInteractionOrderDiag('stable-local-demerge-static-packets', {
      mode: 'stable-local-player-chunk-wide-demerge',
      viewRotation: normalizedViewRotation,
      radius: radius,
      playerInteractionCellKey: buildStableLocalDemergeInteractionCellKey(playerObj),
      playerInteractionChunkKey: buildStableLocalDemergeInteractionChunkKey(playerObj),
      player: summarizeActorDiagPlayer(playerObj),
      inputStaticRenderableCount: Number(list.length || 0),
      outputStaticRenderableCount: Number(out.length || 0),
      splitPacketCount: Number(splitPacketCount || 0),
      createdFaceCount: Number(createdFaceCount || 0),
      nearMemberCount: Number(nearMemberCount || 0),
      farMemberCount: Number(farMemberCount || 0),
      checkedPacketCount: Number(checkedPacketCount || 0),
      skippedFarPacketCount: Number(skippedFarPacketCount || 0),
      residualMergedPacketCount: Number(residualMergedPacketCount || 0),
      samples: samples,
      residualSamples: residualSamples
    }, { maxCount: 6000 });
  }

  var result = {
    staticRenderables: out,
    inputCount: list.length,
    outputCount: out.length,
    splitPacketCount: splitPacketCount,
    createdFaceCount: createdFaceCount,
    residualMergedPacketCount: residualMergedPacketCount,
    playerInteractionCellKey: buildStableLocalDemergeInteractionCellKey(playerObj),
    playerInteractionChunkKey: buildStableLocalDemergeInteractionChunkKey(playerObj),
    checkedPacketCount: checkedPacketCount,
    skippedFarPacketCount: skippedFarPacketCount,
    cacheHit: false,
    cacheHitCount: __stableLocalDemergeCache ? __stableLocalDemergeCache.hitCount : 0,
    cacheMissCount: __stableLocalDemergeCache ? __stableLocalDemergeCache.missCount : 0,
    mode: 'stable-local-player-chunk-wide-demerge'
  };
  if (__stableLocalDemergeCache) {
    __stableLocalDemergeCache.key = cacheKey;
    __stableLocalDemergeCache.result = result;
  }
  publishStableLocalDemergeLastState(result, playerObj, true);
  return result;
}



  var api = {
    __owner: OWNER,
    getActorInteractionPacketMemberCells: function (packet, deps) { return withDeps(deps, function () { return getActorInteractionPacketMemberCells(packet); }); },
    isActorInteractionTerrainSupportTopPacket: function (packet, cells, deps) { return withDeps(deps, function () { return isActorInteractionTerrainSupportTopPacket(packet, cells); }); },
    getActorInteractionPacketGroupKeys: function (packet, cells, deps) { return withDeps(deps, function () { return getActorInteractionPacketGroupKeys(packet, cells); }); },
    doesTopPacketActAsPlayerSupportFloor: function (packet, playerRef, groupSummaryMap, deps) { return withDeps(deps, function () { return doesTopPacketActAsPlayerSupportFloor(packet, playerRef, groupSummaryMap); }); },
    getActorInteractionPacketMemberDescriptors: function (packet, deps) { return withDeps(deps, function () { return getActorInteractionPacketMemberDescriptors(packet); }); },
    hashStableLocalDemergeString: function (seed, value, deps) { return withDeps(deps, function () { return hashStableLocalDemergeString(seed, value); }); },
    getStableLocalDemergePacketIdentity: function (packet, deps) { return withDeps(deps, function () { return getStableLocalDemergePacketIdentity(packet); }); },
    buildStableLocalDemergeListHash: function (staticRenderables, deps) { return withDeps(deps, function () { return buildStableLocalDemergeListHash(staticRenderables); }); },
    floorStableLocalDemergeCoord: function (value, deps) { return withDeps(deps, function () { return floorStableLocalDemergeCoord(value); }); },
    getStableLocalDemergeInteractionCell: function (playerRef, deps) { return withDeps(deps, function () { return getStableLocalDemergeInteractionCell(playerRef); }); },
    buildStableLocalDemergeInteractionCellKey: function (playerRef, deps) { return withDeps(deps, function () { return buildStableLocalDemergeInteractionCellKey(playerRef); }); },
    buildStableLocalDemergeInteractionChunkKey: function (playerRef, deps) { return withDeps(deps, function () { return buildStableLocalDemergeInteractionChunkKey(playerRef); }); },
    buildStableLocalDemergeCacheKey: function (staticRenderables, viewRotation, playerRef, radius, deps) { return withDeps(deps, function () { return buildStableLocalDemergeCacheKey(staticRenderables, viewRotation, playerRef, radius); }); },
    isActorInteractionDescriptorNearPlayerForLocalDemerge: function (descriptor, playerRef, radius, deps) { return withDeps(deps, function () { return isActorInteractionDescriptorNearPlayerForLocalDemerge(descriptor, playerRef, radius); }); },
    buildStaticWorldFacePacketFromDescriptorForActorDemerge: function (descriptor, sourcePacket, viewRotation, mode, localIndex, deps) { return withDeps(deps, function () { return buildStaticWorldFacePacketFromDescriptorForActorDemerge(descriptor, sourcePacket, viewRotation, mode, localIndex); }); },
    mergeActorInteractionResidualDescriptorsForPacket: function (sourcePacket, residualMembers, deps) { return withDeps(deps, function () { return mergeActorInteractionResidualDescriptorsForPacket(sourcePacket, residualMembers); }); },
    isStableLocalDemergeExplicitlyEnabled: function () { return isStableLocalDemergeExplicitlyEnabled(); },
    applyStableActorSortDemergeToStaticRenderables: function (staticRenderables, viewRotation, playerRef, options, deps) { return withDeps(deps, function () { return applyStableActorSortDemergeToStaticRenderables(staticRenderables, viewRotation, playerRef, options); }); },
    resetStableLocalDemergeCacheForTests: function () { __stableLocalDemergeCache = { key: '', result: null, hitCount: 0, missCount: 0 }; return true; }
  };
  global.IsometricStableLocalDemerge = api;
  global.__STABLE_LOCAL_DEMERGE__ = api;
  global.__APP_PRESENTATION_STABLE_LOCAL_DEMERGE__ = api;
  if (global.App) {
    global.App.presentation = global.App.presentation || {};
    global.App.presentation.render = global.App.presentation.render || {};
    global.App.presentation.render.interaction = global.App.presentation.render.interaction || {};
    global.App.presentation.render.interaction.stableLocalDemerge = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
