// P12b-9: actor interaction replacement boundary.
// Layer: presentation/render/interaction.
// Owns actor/static replacement candidate face-set, packet suppression, replacement renderable construction, and replacement result assembly only.
// This file must not draw, mutate scene state, own stable-local demerge, or own support-top sort override.
(function registerActorInteractionReplacement(global) {
  'use strict';

  var OWNER = {
    phase: 'P12b-9',
    layer: 'presentation/render/interaction',
    owner: 'actor-interaction-replacement',
    responsibility: 'actor/static replacement candidate, suppression, replacement renderable, and replacement assembly only'
  };

  var __deps = null;
  function nullFn() { return null; }
  function fallbackValue(value) { return typeof value === 'function' ? value() : value; }
  function withDeps(deps, fn) {
    var prev = __deps;
    __deps = deps && typeof deps === 'object' ? deps : null;
    try { return fn(); } finally { __deps = prev; }
  }
  function callDep(name, args, fallback) {
    var fn = __deps && typeof __deps[name] === 'function' ? __deps[name] : null;
    if (!fn && global && typeof global[name] === 'function') fn = global[name];
    if (fn) return fn.apply(null, args || []);
    return fallbackValue(fallback);
  }
  function safeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function normalizeMainEditorViewRotationValue(value) { return callDep('normalizeMainEditorViewRotationValue', [value], function () { return safeNumber(value, 0); }); }
  function getSafeMainEditorViewRotation(value) { return callDep('getSafeMainEditorViewRotation', [value], { viewRotation: 0 }); }
  function getActorInteractionSortRadiusForRender() { return callDep('getActorInteractionSortRadiusForRender', [], 2); }
  function buildActorInteractionBoxGroupSummaryMap(sourceBoxes) { return callDep('buildActorInteractionBoxGroupSummaryMap', [sourceBoxes], function () { return new Map(); }); }
  function isActorDiagTerrainCell(box) { return callDep('isActorDiagTerrainCell', [box], false) === true; }
  function getActorInteractionGroupKeyForCell(cell, fallbackInstanceId) { return callDep('getActorInteractionGroupKeyForCell', [cell, fallbackInstanceId], function () { return fallbackInstanceId != null ? String(fallbackInstanceId) : ''; }); }
  function getSemanticFaceNeighborDeltaForRender(face) { return callDep('getSemanticFaceNeighborDeltaForRender', [face], { x: 0, y: 0, z: 0 }); }
  function buildActorInteractionCellFaceKey(cell, semanticFace, viewRotation) { return callDep('buildActorInteractionCellFaceKey', [cell, semanticFace, viewRotation], null); }
  function isActorInteractionOrderDiagEnabled() { return callDep('isActorInteractionOrderDiagEnabled', [], false) === true; }
  function roundActorDiagNumber(value, digits) { return callDep('roundActorDiagNumber', [value, digits], function () { return safeNumber(value, 0); }); }
  function shouldEmitActorInteractionDiagSignature(channel, signature) { return callDep('shouldEmitActorInteractionDiagSignature', [channel, signature], true) !== false; }
  function emitActorInteractionOrderDiag(tag, payload, options) { return callDep('emitActorInteractionOrderDiag', [tag, payload, options], false); }
  function summarizeActorDiagPlayer(player) { return callDep('summarizeActorDiagPlayer', [player], player || null); }
  function summarizeActorDiagRenderable(renderable) { return callDep('summarizeActorDiagRenderable', [renderable], renderable || null); }
  function summarizeActorDiagReplacementRelations(replacements) { return callDep('summarizeActorDiagReplacementRelations', [replacements], null); }
  function getActorDiagFaceKeyCountsByFace(set) { return callDep('getActorDiagFaceKeyCountsByFace', [set], {}); }
  function summarizeActorDiagFaceKeySet(set, limit) { return callDep('summarizeActorDiagFaceKeySet', [set, limit], function () { return Array.from(set || []).slice(0, limit || 16); }); }
  function summarizeActorDiagNearbyBoxes(player, boxes, radius, limit) { return callDep('summarizeActorDiagNearbyBoxes', [player, boxes, radius, limit], []); }
  function getMainFramePlanSeqForActorInteractionReplacement() { return safeNumber(callDep('getMainFramePlanSeqForActorInteractionReplacement', [], 0), 0); }
  function getSemanticFaceNormal(face) { return callDep('getSemanticFaceNormal', [face], null); }
  function buildMergedVoxelFaceWorldGeometry(descriptor) { return callDep('buildMergedVoxelFaceWorldGeometry', [descriptor], { worldPts: [] }); }
  function getScreenFaceForSemanticFace(face, viewRotation) { return callDep('getScreenFaceForSemanticFace', [face, viewRotation], face || null); }
  function getTerrainMaterialPatternDescriptorForRenderCell(cell, face) { return callDep('getTerrainMaterialPatternDescriptorForRenderCell', [cell, face], null); }
  function getTerrainMaterialBaseFaceColorsForRenderCell(cell) { return callDep('getTerrainMaterialBaseFaceColorsForRenderCell', [cell], null); }
  function getCachedBaseFaceColorsForRenderable(base) { return callDep('getCachedBaseFaceColorsForRenderable', [base], { line: '#000000' }); }
  function getCachedStaticRenderableFill(cell, face, worldPts, normal, viewRotation, extra) { return callDep('getCachedStaticRenderableFill', [cell, face, worldPts, normal, viewRotation, extra], { fill: '#ffffff' }); }
  function getTerrainRenderSettingsForRender() { return callDep('getTerrainRenderSettingsForRender', [], null); }
  function isStaticRenderableLightingActiveForBuild(settings) { return callDep('isStaticRenderableLightingActiveForBuild', [settings], false) === true; }
  function buildVoxelFaceShadowWorldOverlays(worldPts, normal, instanceId, extra) { return callDep('buildVoxelFaceShadowWorldOverlays', [worldPts, normal, instanceId, extra], []); }
  function getTerrainMaterialIdForRenderCell(cell) { return callDep('getTerrainMaterialIdForRenderCell', [cell], null); }
  function buildActorInteractionGroupSummaryMapFromPackets(renderables) { return callDep('buildActorInteractionGroupSummaryMapFromPackets', [renderables], function () { return new Map(); }); }
  function classifyActorInteractionSingleFootprintGroupAgainstPlayer(group, playerRef, viewRotation) { return callDep('classifyActorInteractionSingleFootprintGroupAgainstPlayer', [group, playerRef, viewRotation], 'none'); }
  function computeActorInteractionPlayerSortMeta(playerRef, viewRotation) { return callDep('computeActorInteractionPlayerSortMeta', [playerRef, viewRotation], { sortKey: 0, tie: 0 }); }
  function compareRenderablesByDomain(a, b) { return callDep('compareRenderablesByDomain', [a, b], function () { return (safeNumber(a && a.sortKey, 0) - safeNumber(b && b.sortKey, 0)) || (safeNumber(a && a.tie, 0) - safeNumber(b && b.tie, 0)); }); }

  function isActorInteractionReplacementEligibleBox(box, groupSummaryMap) {
    if (!box || typeof box !== 'object') return false;

    // Actor-interaction replacement is only stable when the replacement face can
    // be assigned a deterministic player relation later in
    // applyActorInteractionGroupSortOverride(). That override deliberately only
    // supports single-footprint groups. Letting multi-footprint objects or large
    // terrain batches enter this path makes whole packets switch between
    // merged/static and actor-replacement renderables at tile boundaries, which is
    // the main source of the remaining flicker.
    if (isActorDiagTerrainCell(box)) return false;

    var instanceId = box.instanceId != null ? String(box.instanceId) : '';
    var groupKey = getActorInteractionGroupKeyForCell(box, instanceId);
    if (!groupKey || !groupSummaryMap || typeof groupSummaryMap.get !== 'function') return false;
    var group = groupSummaryMap.get(groupKey);
    if (!group) return false;
    var footprintCount = group.footprintKeys && typeof group.footprintKeys.size === 'number'
      ? group.footprintKeys.size
      : 0;

    // Keep the original reliable case: single-footprint objects, including tall
    // 1x1 stacks, can still be split locally and sorted against the player by the
    // single-footprint line anchor. Normal 2x1/large objects and terrain are left
    // on the stable static path; their top support is handled separately by the
    // support-top override.
    return footprintCount === 1;
  }

  function applyActorInteractionGroupSortOverride(renderable, sourcePacket, groupSummaryMap, playerRef, viewRotation) {
    if (!renderable || !sourcePacket || !groupSummaryMap || !playerRef) return renderable;
    var sourceCell = renderable.box || sourcePacket.box || null;
    var instanceId = sourceCell && sourceCell.instanceId != null
      ? String(sourceCell.instanceId)
      : (renderable.instanceId != null ? String(renderable.instanceId) : (sourcePacket.instanceId != null ? String(sourcePacket.instanceId) : ''));
    var groupKey = getActorInteractionGroupKeyForCell(sourceCell, instanceId);
    if (!groupKey) return renderable;
    var group = groupSummaryMap.get(groupKey);
    if (!group) return renderable;
    var footprintCount = group.footprintKeys && typeof group.footprintKeys.size === 'number' ? group.footprintKeys.size : 0;
    if (footprintCount !== 1) return renderable;
    var relation = classifyActorInteractionSingleFootprintGroupAgainstPlayer(group, playerRef, viewRotation);
    if (relation === 'none') return renderable;
    var playerSortMeta = computeActorInteractionPlayerSortMeta(playerRef, viewRotation);
    var intraTie = Number(renderable.tie != null ? renderable.tie : (sourcePacket.tie || 0));
    var tieOffset = (Math.abs(intraTie) % 1000) * 0.000001;
    if (relation === 'player-in-front') {
      renderable.sortKey = Number(playerSortMeta.sortKey || 0) - 0.0006;
      renderable.tie = Number(playerSortMeta.tie || 0) - 50 + tieOffset;
    } else if (relation === 'player-behind') {
      renderable.sortKey = Number(playerSortMeta.sortKey || 0) + 0.0006;
      renderable.tie = Number(playerSortMeta.tie || 0) + 50 + tieOffset;
    }
    renderable.actorInteractionGroupSortRelation = relation;
    renderable.actorInteractionGroupFootprintMode = 'single-footprint-line-anchor';
    return renderable;
  }

  function buildActorInteractionCandidateFaceKeySetForPlayer(options) {
    var safe = options && typeof options === 'object' ? options : {};
    var playerRef = safe.player && typeof safe.player === 'object' ? safe.player : null;
    var sourceBoxes = Array.isArray(safe.sourceBoxes) ? safe.sourceBoxes : [];
    var occ = safe.occ && typeof safe.occ.has === 'function' ? safe.occ : new Map();
    var dynamicInstanceIdSet = safe.dynamicInstanceIdSet && typeof safe.dynamicInstanceIdSet.has === 'function' ? safe.dynamicInstanceIdSet : null;
    var viewRotation = normalizeMainEditorViewRotationValue(safe.viewRotation != null ? safe.viewRotation : getSafeMainEditorViewRotation(null).viewRotation);
    var radius = Math.max(1, Number(safe.radius || getActorInteractionSortRadiusForRender()));
    var out = new Set();
    if (!playerRef || !sourceBoxes.length) return out;
    var groupSummaryMap = buildActorInteractionBoxGroupSummaryMap(sourceBoxes);
    var eligibleBoxCount = 0;
    var skippedReplacementIneligibleBoxCount = 0;
    var skippedTerrainBoxCount = 0;
    var skippedMultiFootprintBoxCount = 0;
    var px = Number(playerRef.x || 0);
    var py = Number(playerRef.y || 0);
    var pz = Number(playerRef.z || 0);
    var faces = ['top', 'east', 'south', 'west', 'north'];
    for (var bi = 0; bi < sourceBoxes.length; bi++) {
      var box = sourceBoxes[bi];
      if (!box) continue;
      if (box.instanceId && dynamicInstanceIdSet && dynamicInstanceIdSet.has(String(box.instanceId))) continue;
      if (!isActorInteractionReplacementEligibleBox(box, groupSummaryMap)) {
        skippedReplacementIneligibleBoxCount += 1;
        if (isActorDiagTerrainCell(box)) skippedTerrainBoxCount += 1;
        else {
          var diagInstanceId = box.instanceId != null ? String(box.instanceId) : '';
          var diagGroupKey = getActorInteractionGroupKeyForCell(box, diagInstanceId);
          var diagGroup = diagGroupKey && groupSummaryMap && typeof groupSummaryMap.get === 'function' ? groupSummaryMap.get(diagGroupKey) : null;
          var diagFootprintCount = diagGroup && diagGroup.footprintKeys && typeof diagGroup.footprintKeys.size === 'number' ? diagGroup.footprintKeys.size : 0;
          if (diagFootprintCount > 1) skippedMultiFootprintBoxCount += 1;
        }
        continue;
      }
      eligibleBoxCount += 1;
      var bx = Math.floor(Number(box.x || 0));
      var by = Math.floor(Number(box.y || 0));
      var bz = Math.floor(Number(box.z || 0));
      var bw = Math.max(1, Math.floor(Number(box.w || 1)));
      var bd = Math.max(1, Math.floor(Number(box.d || 1)));
      var bh = Math.max(1, Math.floor(Number(box.h || 1)));
      if ((bz + bh) <= pz) continue;
      if ((bx - radius) > px || (bx + bw + radius) < px) continue;
      if ((by - radius) > py || (by + bd + radius) < py) continue;
      for (var dx = 0; dx < bw; dx++) {
        for (var dy = 0; dy < bd; dy++) {
          var cx = bx + dx;
          var cy = by + dy;
          if (Math.abs((cx + 0.5) - px) > (radius + 0.5)) continue;
          if (Math.abs((cy + 0.5) - py) > (radius + 0.5)) continue;
          for (var dz = 0; dz < bh; dz++) {
            var cz = bz + dz;
            if ((cz + 1) <= pz) continue;
            var cell = { x: cx, y: cy, z: cz, instanceId: box.instanceId || null };
            for (var fi = 0; fi < faces.length; fi++) {
              var sf = faces[fi];
              var delta = getSemanticFaceNeighborDeltaForRender(sf);
              if (occ.has(String(cx + delta.x) + ',' + String(cy + delta.y) + ',' + String(cz + delta.z))) continue;
              var key = buildActorInteractionCellFaceKey(cell, sf, viewRotation);
              if (key) out.add(key);
            }
          }
        }
      }
    }
    if (isActorInteractionOrderDiagEnabled()) {
      var candidateSignature = [roundActorDiagNumber(px, 2), roundActorDiagNumber(py, 2), roundActorDiagNumber(pz, 2), out.size, sourceBoxes.length, viewRotation].join('|');
      if (shouldEmitActorInteractionDiagSignature('candidate', candidateSignature)) {
        emitActorInteractionOrderDiag('candidate-face-set', {
          frameHint: 'frameplan-' + String(getMainFramePlanSeqForActorInteractionReplacement() + 1),
          viewRotation: viewRotation,
          player: summarizeActorDiagPlayer(playerRef),
          radius: radius,
          sourceBoxCount: sourceBoxes.length,
          candidateFaceKeyCount: out.size,
          candidateFaceCountsByFace: getActorDiagFaceKeyCountsByFace(out),
          eligibleBoxCount: eligibleBoxCount,
          skippedReplacementIneligibleBoxCount: skippedReplacementIneligibleBoxCount,
          skippedTerrainBoxCount: skippedTerrainBoxCount,
          skippedMultiFootprintBoxCount: skippedMultiFootprintBoxCount,
          candidateFaceKeySamples: summarizeActorDiagFaceKeySet(out, 28),
          nearbyBoxes: summarizeActorDiagNearbyBoxes(playerRef, sourceBoxes, radius, 24)
        });
      }
    }
    return out;
  }

  function shouldSuppressStaticPacketForActorInteraction(packet, actorFaceKeySet) {
    if (!packet || packet.kind !== 'static-world-face-packet') return false;
    if (!actorFaceKeySet || typeof actorFaceKeySet.has !== 'function' || actorFaceKeySet.size <= 0) return false;
    var keys = Array.isArray(packet.actorInteractionMemberFaceKeys) ? packet.actorInteractionMemberFaceKeys : [];
    if (!keys.length) return false;
    for (var i = 0; i < keys.length; i++) {
      if (!actorFaceKeySet.has(keys[i])) return false;
    }
    return true;
  }

  function buildActorInteractionReplacementRenderableFromDescriptor(descriptor, sourcePacket, viewRotation) {
    if (!descriptor || !sourcePacket) return null;
    var sf = String(descriptor.semanticFace || sourcePacket.semanticFace || '');
    if (!sf) return null;
    var cell = descriptor.cell || descriptor.box || sourcePacket.box || null;
    if (!cell) return null;
    var normal = descriptor.normal || getSemanticFaceNormal(sf);
    var worldGeometry = buildMergedVoxelFaceWorldGeometry(Object.assign({}, descriptor, {
      merged: false,
      mergeWidth: 1,
      mergeHeight: 1,
      memberCount: 1
    }));
    var worldPts = Array.isArray(worldGeometry && worldGeometry.worldPts) ? worldGeometry.worldPts : [];
    var worldLoops = Array.isArray(worldGeometry && worldGeometry.worldLoops) ? worldGeometry.worldLoops : null;
    var worldOutlineSegments = Array.isArray(worldGeometry && worldGeometry.worldOutlineSegments) ? worldGeometry.worldOutlineSegments : null;
    if (!worldPts.length) return null;
    var screenFace = descriptor.screenFace || getScreenFaceForSemanticFace(sf, viewRotation);
    var terrainPatternDescriptor = getTerrainMaterialPatternDescriptorForRenderCell(cell, sf);
    var terrainFc = getTerrainMaterialBaseFaceColorsForRenderCell(cell);
    var fc = terrainFc || getCachedBaseFaceColorsForRenderable((cell && cell.base) || '#7aa2f7');
    var stroke = terrainPatternDescriptor && terrainPatternDescriptor.lineColor ? terrainPatternDescriptor.lineColor : fc.line;
    var fill = getCachedStaticRenderableFill(cell, sf, worldPts, normal, viewRotation, null).fill;
    var terrainSettings = getTerrainRenderSettingsForRender();
    var lightingActive = isStaticRenderableLightingActiveForBuild(terrainSettings);
    var shadowOverlaysWorld = lightingActive ? buildVoxelFaceShadowWorldOverlays(worldPts, normal, cell.instanceId || null, null) : [];
    var faceKey = buildActorInteractionCellFaceKey(cell, sf, viewRotation);
    if (!faceKey) return null;
    return {
      id: 'actor-interaction-packet-' + String(sourcePacket.id || 'packet') + '-' + String(faceKey || 'face'),
      kind: 'static-world-face-packet',
      sortKey: Number(descriptor.sortKey != null ? descriptor.sortKey : sourcePacket.sortKey || 0),
      tie: Number(descriptor.tie != null ? descriptor.tie : sourcePacket.tie || 0),
      instanceId: cell.instanceId || sourcePacket.instanceId || null,
      prefabId: cell.prefabId || sourcePacket.prefabId || null,
      renderPath: 'actor-interaction-replacement-packet',
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
      width: 1,
      worldPts: worldPts,
      worldLoops: worldLoops,
      worldOutlineSegments: worldOutlineSegments,
      shadowOverlaysWorld: shadowOverlaysWorld,
      box: cell,
      cellX: Number(cell.x || 0),
      cellY: Number(cell.y || 0),
      cellZ: Number(cell.z || 0),
      faceKey: faceKey,
      actorInteractionMemberFaceKeys: [faceKey],
      actorInteractionMemberDescriptors: [descriptor],
      packetNormal: normal,
      mergedFace: false,
      mergedFaceCount: 1,
      mergeWidth: 1,
      mergeHeight: 1,
      terrainMaterialMergeKey: descriptor.terrainMaterialMergeKey || sourcePacket.terrainMaterialMergeKey || null,
      terrainMaterialId: getTerrainMaterialIdForRenderCell(cell),
      terrainMaterialLabel: terrainPatternDescriptor && terrainPatternDescriptor.label ? terrainPatternDescriptor.label : null,
      materialType: cell && (cell.materialType || cell.terrainBand) ? String(cell.materialType || cell.terrainBand) : null,
      terrainPatternDescriptor: terrainPatternDescriptor || null,
      terrainPatternOpacity: terrainPatternDescriptor && Number.isFinite(Number(terrainPatternDescriptor.opacity)) ? Number(terrainPatternDescriptor.opacity) : null,
      actorInteractionReplacement: true,
      actorInteractionSourcePacketId: sourcePacket.id || null
    };
  }

  function applyActorInteractionReplacementToRenderables(staticRenderables, actorFaceKeySet, viewRotation, playerRef) {
    var list = Array.isArray(staticRenderables) ? staticRenderables : [];
    var filtered = [];
    var replacements = [];
    var suppressedPacketCount = 0;
    var checkedPacketCount = 0;
    var suppressedFaceKeySet = new Set();
    var groupSummaryMap = buildActorInteractionGroupSummaryMapFromPackets(list);
    var diagEnabled = isActorInteractionOrderDiagEnabled();
    var diagSuppressedPackets = [];
    for (var i = 0; i < list.length; i++) {
      var packet = list[i];
      if (packet && packet.kind === 'static-world-face-packet') checkedPacketCount += 1;

      if (shouldSuppressStaticPacketForActorInteraction(packet, actorFaceKeySet)) {
        suppressedPacketCount += 1;
        var keys = Array.isArray(packet.actorInteractionMemberFaceKeys) ? packet.actorInteractionMemberFaceKeys : [];
        var diagHitKeys = [];
        if (diagEnabled) {
          for (var dki = 0; dki < keys.length; dki++) {
            if (actorFaceKeySet && typeof actorFaceKeySet.has === 'function' && actorFaceKeySet.has(keys[dki])) diagHitKeys.push(keys[dki]);
          }
        }
        for (var ki = 0; ki < keys.length; ki++) suppressedFaceKeySet.add(keys[ki]);
        var members = Array.isArray(packet.actorInteractionMemberDescriptors) ? packet.actorInteractionMemberDescriptors : [];
        var diagReplacementCountBefore = replacements.length;
        for (var mi = 0; mi < members.length; mi++) {
          var replacement = buildActorInteractionReplacementRenderableFromDescriptor(members[mi], packet, viewRotation);
          if (replacement && replacement.faceKey && suppressedFaceKeySet.has(replacement.faceKey)) {
            replacement = applyActorInteractionGroupSortOverride(replacement, packet, groupSummaryMap, playerRef, viewRotation);
            replacements.push(replacement);
          }
        }
        if (diagEnabled && diagSuppressedPackets.length < 24) {
          diagSuppressedPackets.push({
            packet: summarizeActorDiagRenderable(packet),
            keyCount: keys.length,
            hitKeyCount: diagHitKeys.length,
            hitKeySamples: diagHitKeys.slice(0, 8),
            memberCount: members.length,
            replacementCreatedCount: replacements.length - diagReplacementCountBefore
          });
        }
        continue;
      }
      filtered.push(packet);
    }
    for (var ri = 0; ri < replacements.length; ri++) filtered.push(replacements[ri]);
    filtered.sort(compareRenderablesByDomain);
    if (diagEnabled) {
      var replacementRelationSummary = summarizeActorDiagReplacementRelations(replacements);
      var replacementSignature = [list.length, filtered.length, replacements.length, suppressedPacketCount, suppressedFaceKeySet.size, replacementRelationSummary && JSON.stringify(replacementRelationSummary)].join('|');
      if (shouldEmitActorInteractionDiagSignature('replacement', replacementSignature)) {
        emitActorInteractionOrderDiag('replacement-result', {
          inputStaticRenderableCount: list.length,
          outputStaticRenderableCount: filtered.length,
          actorFaceKeyCount: actorFaceKeySet && actorFaceKeySet.size != null ? actorFaceKeySet.size : null,
          checkedPacketCount: checkedPacketCount,
          suppressedPacketCount: suppressedPacketCount,
          suppressedFaceKeyCount: suppressedFaceKeySet.size,
          replacementRenderableCount: replacements.length,
          replacementRelationCounts: replacementRelationSummary,
          suppressedPackets: diagSuppressedPackets,
          replacementSamples: replacements.slice(0, 30).map(summarizeActorDiagRenderable)
        });
      }
    }
    return {
      staticRenderables: filtered,
      replacementRenderables: replacements,
      suppressedPacketCount: suppressedPacketCount,
      checkedPacketCount: checkedPacketCount,
      suppressedFaceKeyCount: suppressedFaceKeySet.size
    };
  }

  function summarizeBoundary() {
    return {
      owner: OWNER.owner,
      phase: OWNER.phase,
      layer: OWNER.layer,
      owns: [
        'actor-interaction-candidate-face-set',
        'actor-interaction-replacement-eligibility',
        'static-packet-suppression-for-actor-interaction',
        'replacement-renderable-construction',
        'replacement-result-assembly'
      ],
      doesNotOwn: [
        'actor-interaction-geometry',
        'stable-local-demerge',
        'support-top-sort-override',
        'canvas-drawing',
        'scene-mutation'
      ]
    };
  }

  var api = {
    __owner: OWNER,
    summarizeBoundary: summarizeBoundary,
    isActorInteractionReplacementEligibleBox: function (box, groupSummaryMap, deps) { return withDeps(deps, function () { return isActorInteractionReplacementEligibleBox(box, groupSummaryMap); }); },
    applyActorInteractionGroupSortOverride: function (renderable, sourcePacket, groupSummaryMap, playerRef, viewRotation, deps) { return withDeps(deps, function () { return applyActorInteractionGroupSortOverride(renderable, sourcePacket, groupSummaryMap, playerRef, viewRotation); }); },
    buildActorInteractionCandidateFaceKeySetForPlayer: function (options, deps) { return withDeps(deps, function () { return buildActorInteractionCandidateFaceKeySetForPlayer(options); }); },
    shouldSuppressStaticPacketForActorInteraction: function (packet, actorFaceKeySet, deps) { return withDeps(deps, function () { return shouldSuppressStaticPacketForActorInteraction(packet, actorFaceKeySet); }); },
    buildActorInteractionReplacementRenderableFromDescriptor: function (descriptor, sourcePacket, viewRotation, deps) { return withDeps(deps, function () { return buildActorInteractionReplacementRenderableFromDescriptor(descriptor, sourcePacket, viewRotation); }); },
    applyActorInteractionReplacementToRenderables: function (staticRenderables, actorFaceKeySet, viewRotation, playerRef, deps) { return withDeps(deps, function () { return applyActorInteractionReplacementToRenderables(staticRenderables, actorFaceKeySet, viewRotation, playerRef); }); }
  };

  global.IsometricActorInteractionReplacement = api;
  global.__ACTOR_INTERACTION_REPLACEMENT__ = api;
  global.__APP_PRESENTATION_ACTOR_INTERACTION_REPLACEMENT__ = api;
  if (global.App) {
    global.App.presentation = global.App.presentation || {};
    global.App.presentation.render = global.App.presentation.render || {};
    global.App.presentation.render.interaction = global.App.presentation.render.interaction || {};
    global.App.presentation.render.interaction.actorInteractionReplacement = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
