
function isUnifiedVertexSquarePrefabId(prefabId) {
  var id = String(prefabId || '');
  return id === 'vertex_square_tri_block' || id === 'vertex_square_quarter_block';
}

function buildUnifiedVertexSquarePrimitiveRenderList(primitives, inst, prefab) {
  const list = Array.isArray(primitives) ? primitives : [];
  if (!list.length) return [];
  const points = [];
  const seen = new Set();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let minZ = Infinity, maxH = 1;
  for (let i = 0; i < list.length; i++) {
    const prim = list[i] || {};
    const verts = Array.isArray(prim.vertices2d) ? prim.vertices2d : [];
    for (let j = 0; j < verts.length; j++) {
      const x = Number(verts[j] && verts[j].x || 0);
      const y = Number(verts[j] && verts[j].y || 0);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      const key = x.toFixed(6) + ',' + y.toFixed(6);
      if (!seen.has(key)) { seen.add(key); points.push({ x, y }); }
    }
    const z = Number(prim.z || 0);
    if (Number.isFinite(z)) minZ = Math.min(minZ, z);
    const h = Number(prim.h != null ? prim.h : 1);
    if (Number.isFinite(h)) maxH = Math.max(maxH, h);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return list;
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const boundary = points
    .filter(function (pt) {
      const onBounds = Math.abs(pt.x - minX) < 1e-6 || Math.abs(pt.x - maxX) < 1e-6 || Math.abs(pt.y - minY) < 1e-6 || Math.abs(pt.y - maxY) < 1e-6;
      const isCenter = Math.abs(pt.x - cx) < 1e-6 && Math.abs(pt.y - cy) < 1e-6;
      return onBounds && !isCenter;
    })
    .sort(function (a, b) { return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx); });
  if (boundary.length < 3) return list;
  return [{
    id: 'vertex-square-unified-visual',
    primitiveId: 'vertex-square-unified-visual',
    primitiveKind: 'vertical_polygon_prism',
    kind: 'vertical_polygon_prism',
    shapeKind: 'vertex_square_unified_visual',
    visualComposite: true,
    vertices2d: boundary,
    z: Number.isFinite(minZ) ? minZ : Number(inst && inst.z || 0),
    h: Math.max(0.001, maxH || 1),
    sortCell: { x: minX, y: minY, z: Number.isFinite(minZ) ? minZ : Number(inst && inst.z || 0) },
    sortFootprint: { w: Math.max(0.001, maxX - minX), d: Math.max(0.001, maxY - minY) },
    base: (inst && inst.base) || (prefab && prefab.base) || '#d59a62',
    sourcePrimitiveCount: list.length
  }];
}

// P6c: main frame renderable assembly owner.
// Layer: application/render.
//
// This file owns the transitional main-frame assembly path: static renderables,
// dynamic renderables, actor renderables, diagnostics, and frame-order finalization.
// It intentionally does not call ctx/canvas/drawImage directly. Existing draw callbacks
// are injected by the global non-module runtime as presentation hooks until P8.

(function registerMainFrameRenderableAssembler(global) {
  function summarizeBoundary() {
    return {
      layer: 'application/render',
      owns: [
        'main-frame-renderable-assembly',
        'static-dynamic-renderable-merge',
        'dynamic-instance-renderable-collection',
        'main-frame-renderable-finalization'
      ],
      doesNotOwn: [
        'canvas-drawing',
        'camera-transform-execution',
        'scene-storage-protocol',
        'prefab-data-protocol'
      ]
    };
  }

function buildRenderablesForMainFrameAssembler() {
  const faceMergeControlState = getStaticWorldFaceMergeControlStateSnapshotForRender();
  beginRenderFrameDiagnosticState();
  noteActorInteractionRenderEntryForRender({
    totalInstances: Number(instances && instances.length || 0),
    totalBoxes: Number(boxes && boxes.length || 0),
    hasPushLog: typeof pushLog === 'function',
    hasForceExportLog: typeof window !== 'undefined' && typeof window.__forceExportLog === 'function'
  });
  const buildStartAt = perfNow();
  const viewRotationInfoStartAt = perfNow();
  const viewRotationInfo = getSafeMainEditorViewRotation(null);
  recordRenderFunctionTiming('render.buildMainFrameRenderables.getSafeMainEditorViewRotation', perfNow() - viewRotationInfoStartAt);
  const cameraScopeStartAt = perfNow();
  const cameraScope = getMainCameraRenderScope(viewRotationInfo.viewRotation);
  recordRenderFunctionTiming('render.buildMainFrameRenderables.getMainCameraRenderScope', perfNow() - cameraScopeStartAt, { frameViewRotation: Number(viewRotationInfo && viewRotationInfo.viewRotation || 0) });
  const terrainModelStartAt = perfNow();
  const terrainModel = getTerrainRuntimeModelForRender();
  recordRenderFunctionTiming('render.buildMainFrameRenderables.getTerrainRuntimeModelForRender', perfNow() - terrainModelStartAt);
  const terrainBuildStartAt = perfNow();
  const terrainBuild = { renderables: [], stats: { terrainCellCount: 0, terrainColumnCount: 0, terrainExpandedVoxelInstanceCount: 0, terrainUsesColumnModel: false, visibleColumnCount: 0, visibleChunkCount: 0, culledColumnCount: 0, culledChunkCount: 0, terrainBuildWasScoped: false, logicalVoxelCountEstimated: 0, visibleTopFaceCount: 0, visibleSideFaceCount: 0, internalVoxelSkippedCount: 0, hiddenInternalSurfaceSkippedCount: 0, renderableCount: 0, buildMode: 'shared-block-pipeline' } };
  const terrainBuildMs = Math.max(0, perfNow() - terrainBuildStartAt);
  recordRenderFunctionTiming('render.buildMainFrameRenderables.terrainBuildPlaceholder', terrainBuildMs);
  const staticCacheStartAt = perfNow();
  rebuildStaticBoxRenderCacheIfNeeded();
  recordRenderFunctionTiming('render.buildMainFrameRenderables.rebuildStaticBoxRenderCacheIfNeeded', perfNow() - staticCacheStartAt);
  const afterStaticCacheAt = perfNow();
  const staticRenderablesAll = staticBoxRenderCache.renderables || [];
  const dynamicRenderables = [];
  const surfaceStats = __lastSurfaceCacheStats || { visibleTopFaceCount: 0, visibleSideFaceCount: 0, hiddenInternalSurfaceSkippedCount: 0, terrainColumnCount: 0, logicalVoxelCountEstimated: 0, voxelFurnitureProcessedCount: 0, surfaceOnlyRenderingEnabled: true, visibleChunkCount: 0, rebuiltChunkCountThisFrame: 0, reusedChunkCountThisFrame: 0, visibleStaticPacketCount: 0, packetMergeMs: 0 };
  const occupancySnapshotStartAt = perfNow();
  const occupancySnapshot = getSceneOccupancySnapshotForRender('render:buildRenderables');
  recordRenderFunctionTiming('render.buildMainFrameRenderables.getSceneOccupancySnapshotForRender', perfNow() - occupancySnapshotStartAt);
  const visibleOcc = occupancySnapshot && occupancySnapshot.map && typeof occupancySnapshot.map.has === 'function' ? occupancySnapshot.map : new Map();
  const occupancyCacheVersion = occupancySnapshot && occupancySnapshot.cacheVersion != null ? Number(occupancySnapshot.cacheVersion || 0) : 0;
  const occupancyRebuiltThisFrame = __lastRenderFrameOccupancyVersion != null && Number(__lastRenderFrameOccupancyVersion || 0) !== occupancyCacheVersion;
  let occupiedKeySet = null;
  const dynamicSplitStartAt = perfNow();
  const dynamicInstanceSplit = getDynamicInstanceSplitForRender(instances);
  recordRenderFunctionTiming('render.buildMainFrameRenderables.getDynamicInstanceSplitForRender', perfNow() - dynamicSplitStartAt, { totalInstancesForSplit: Number(instances && instances.length || 0) });
  const dynamicCandidates = Array.isArray(dynamicInstanceSplit.dynamicInstances) ? dynamicInstanceSplit.dynamicInstances : [];
  const dynamicInstanceIdSet = new Set(dynamicCandidates.map(function (inst) { return inst && inst.instanceId ? String(inst.instanceId) : null; }).filter(Boolean));
  const dynamicFilterStartAt = perfNow();
  const visibleDynamicInstances = filterInstancesForMainCameraScope(dynamicCandidates, cameraScope);
  const dynamicFilterMs = Math.max(0, perfNow() - dynamicFilterStartAt);
  recordRenderFunctionTiming('render.buildMainFrameRenderables.filterInstancesForMainCameraScope', dynamicFilterMs, { dynamicCandidateCount: Number(dynamicCandidates.length || 0), visibleDynamicInstanceCount: Number(visibleDynamicInstances.length || 0) });
  const shouldForceExactVisibleSummaryAt = perfNow();
  const shouldForceExactVisibleSummary = typeof shouldForceExactVisibleSummaryForRender === 'function'
    ? shouldForceExactVisibleSummaryForRender(__terrainFirstFrameWindow, shouldForceExactVisibleSummaryAt)
    : ((__terrainFirstFrameWindow && Number(__terrainFirstFrameWindow.remaining || 0) > 0) || true);
  const visibleSummaryStartAt = perfNow();
  const visibleInstanceSummary = getVisibleInstanceSummaryForRender(cameraScope, visibleDynamicInstances, dynamicInstanceSplit, shouldForceExactVisibleSummary);
  recordRenderFunctionTiming('render.buildMainFrameRenderables.getVisibleInstanceSummaryForRender', perfNow() - visibleSummaryStartAt, { visibleInstanceCount: Number(visibleInstanceSummary && visibleInstanceSummary.visibleInstances || 0) });

  const dynamicBuildStartAt = perfNow();
  var debugFaceBuildMs = 0;
  var habboVoxelFilterMs = 0;
  var habboVoxelBuildMs = 0;
  var spriteSortBuildMs = 0;
  var spriteRenderableBuildMs = 0;
  for (const inst of visibleDynamicInstances) {
    const prefab = getPrefabById(inst.prefabId);
    if (prefab && isFiveFaceDebugPrefab(prefab) && prefabDrawsVoxels(prefab)) {
      if (!occupiedKeySet) occupiedKeySet = createOccupiedKeySetFromOccupancy(visibleOcc);
      const debugFaceStartAt = perfNow();
      const placedFaces = buildPlacedDebugInstanceFaceRenderables(inst, prefab, occupiedKeySet, viewRotationInfo);
      debugFaceBuildMs += Math.max(0, perfNow() - debugFaceStartAt);
      for (const item of placedFaces) dynamicRenderables.push(item);
    } else if (prefab && prefab.kind === 'habbo_import' && prefabDrawsVoxels(prefab)) {
      const shift = getHabboInstanceVisualShift(inst, prefab);
      const habboFilterStartAt = perfNow();
      const instBoxes = filterBoxesForMainCameraScope(boxes.filter(function (b) { return b.instanceId === inst.instanceId; }), cameraScope);
      habboVoxelFilterMs += Math.max(0, perfNow() - habboFilterStartAt);
      for (const cell of instBoxes) {
        const habboVoxelBuildStartAt = perfNow();
        const item = buildShiftedVoxelRenderable({ x: cell.x, y: cell.y, z: cell.z, box: cell, base: cell.base }, visibleOcc, shift, 'habbo-voxel-' + inst.instanceId);
        habboVoxelBuildMs += Math.max(0, perfNow() - habboVoxelBuildStartAt);
        if (item) dynamicRenderables.push(item);
      }
    }
    else if (prefab && prefabDrawsVoxels(prefab)) {
      const domainCoreForVoxelProxy = getDomainSceneCoreApi();
      const instPrimitives = (typeof expandInstanceToPrimitives === 'function') ? expandInstanceToPrimitives(inst, false, { source: 'render:dynamic-primitives' }) : [];
      if (Array.isArray(instPrimitives) && instPrimitives.length) {
        const primitiveRenderList = (prefab && isUnifiedVertexSquarePrefabId(prefab.id))
          ? buildUnifiedVertexSquarePrimitiveRenderList(instPrimitives, inst, prefab)
          : instPrimitives;
        for (let primitiveIndex = 0; primitiveIndex < primitiveRenderList.length; primitiveIndex++) {
          const primitive = primitiveRenderList[primitiveIndex];
          const sortCell = primitive && primitive.sortCell ? primitive.sortCell : { x: inst.x || 0, y: inst.y || 0, z: inst.z || 0 };
          const sortFootprint = primitive && primitive.sortFootprint ? primitive.sortFootprint : { w: 1, d: 1 };
          const primitiveSort = domainCoreForVoxelProxy && typeof domainCoreForVoxelProxy.computeVoxelRenderableSort === 'function'
            ? domainCoreForVoxelProxy.computeVoxelRenderableSort({ cell: { x: sortCell.x, y: sortCell.y, z: sortCell.z, w: sortFootprint.w, d: sortFootprint.d, h: primitive && primitive.h != null ? primitive.h : 1 }, viewRotation: normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation) })
            : computeViewAwareSortMeta({ x: sortCell.x, y: sortCell.y, z: sortCell.z }, primitive && primitive.h != null ? primitive.h : 1, normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation));
          dynamicRenderables.push({
            id: 'primitive-tri-prism-' + String(inst.instanceId || 'unknown') + '-' + String(primitive && primitive.primitiveId || primitiveIndex),
            kind: 'primitive-tri-prism',
            dynamic: true,
            sortKey: Number(primitiveSort.sortKey || 0),
            tie: Number(primitiveSort.tie || 0) + 120000 + primitiveIndex,
            instanceId: inst.instanceId || null,
            prefabId: prefab && prefab.id || null,
            primitiveId: primitive && primitive.primitiveId || null,
            primitiveKind: primitive && primitive.primitiveKind || 'vertical_tri_prism',
            renderPath: 'dynamic-renderables',
            primitive: primitive,
            worldBounds: { x: sortCell.x, y: sortCell.y, z: sortCell.z, w: sortFootprint.w, d: sortFootprint.d, h: primitive && primitive.h != null ? primitive.h : 1 },
            sortWorldAnchor: { x: sortCell.x, y: sortCell.y, z: sortCell.z, w: sortFootprint.w, d: sortFootprint.d, h: primitive && primitive.h != null ? primitive.h : 1 },
            drawScreenPosition: deriveRenderableDrawPosition({ debugFoot: iso(Number(sortCell.x || 0) + Number(sortFootprint.w || 1), Number(sortCell.y || 0) + Number(sortFootprint.d || 1), Number(sortCell.z || 0)) }),
            worldX: Number(sortCell.x || 0) + Number(sortFootprint.w || 1),
            worldY: Number(sortCell.y || 0) + Number(sortFootprint.d || 1),
            draw: () => {}
          });
        }
        try { detailLog('[TRI-PRISM-TRACE] ' + JSON.stringify({ phase: 'main-frame-primitive-renderables', instanceId: inst.instanceId || null, prefabId: prefab.id || null, primitiveCount: instPrimitives.length, renderPrimitiveCount: primitiveRenderList.length, renderMode: prefab && isUnifiedVertexSquarePrefabId(prefab.id) ? 'unified-vertex-square' : 'per-primitive', source: 'src/application/render/main-frame-renderable-assembler.js' })); } catch (_) {}
      }
      const instBoxes = filterBoxesForMainCameraScope(boxes.filter(function (b) { return b.instanceId === inst.instanceId && b.renderHidden !== true; }), cameraScope);
      for (let voxelProxyIndex = 0; voxelProxyIndex < instBoxes.length; voxelProxyIndex++) {
        const cell = instBoxes[voxelProxyIndex];
        const cellBounds = {
          x: Number(cell && cell.x || 0),
          y: Number(cell && cell.y || 0),
          z: Number(cell && cell.z || 0),
          w: Math.max(0.001, Number(cell && cell.w != null ? cell.w : 1) || 1),
          d: Math.max(0.001, Number(cell && cell.d != null ? cell.d : 1) || 1),
          h: Math.max(0.001, Number(cell && cell.h != null ? cell.h : 1) || 1)
        };
        const voxelSort = domainCoreForVoxelProxy && typeof domainCoreForVoxelProxy.computeVoxelRenderableSort === 'function'
          ? domainCoreForVoxelProxy.computeVoxelRenderableSort({ cell: cellBounds, box: cell, viewRotation: normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation) })
          : computeViewAwareSortMeta({ x: cellBounds.x, y: cellBounds.y, z: cellBounds.z }, cellBounds.h, normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation));
        dynamicRenderables.push({
          id: 'voxel-proxy-' + String(inst.instanceId || 'unknown') + '-' + String(cell && cell.id != null ? cell.id : voxelProxyIndex),
          kind: 'voxel-proxy-box',
          dynamic: true,
          sortKey: Number(voxelSort.sortKey || 0),
          tie: Number(voxelSort.tie || 0) + 100000 + voxelProxyIndex,
          instanceId: inst.instanceId || null,
          prefabId: prefab && prefab.id || null,
          boxId: cell && cell.id != null ? cell.id : null,
          renderPath: 'dynamic-renderables',
          worldBounds: Object.assign({}, cellBounds),
          sortWorldAnchor: Object.assign({}, cellBounds),
          drawScreenPosition: deriveRenderableDrawPosition({ debugFoot: iso(cellBounds.x + cellBounds.w, cellBounds.y + cellBounds.d, cellBounds.z) }),
          worldX: cellBounds.x + cellBounds.w,
          worldY: cellBounds.y + cellBounds.d,
          draw: () => drawBox(cell, 0.92),
        });
      }
    }
    if (prefabHasSprite(prefab)) {
      const spriteSortStartAt = perfNow();
      const spriteParts = getSpriteDepthSplitCandidate(inst, prefab, viewRotationInfo.viewRotation);
      if (spriteParts && Array.isArray(spriteParts.parts) && spriteParts.parts.length > 1) {
        const domainCoreForSpriteParts = getDomainSceneCoreApi();
        for (let partIndex = 0; partIndex < spriteParts.parts.length; partIndex++) {
          const part = spriteParts.parts[partIndex];
          const partSort = domainCoreForSpriteParts && typeof domainCoreForSpriteParts.computeVoxelRenderableSort === 'function'
            ? domainCoreForSpriteParts.computeVoxelRenderableSort({ cell: part.cell || { x: inst.x, y: inst.y, z: inst.z, h: 1 }, viewRotation: normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation) })
            : computeViewAwareSortMeta(part.cell || { x: inst.x, y: inst.y, z: inst.z }, 1, normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation));
          const spriteRenderableStartAt = perfNow();
          dynamicRenderables.push({
            id: 'sprite-part-' + inst.instanceId + '-' + String(partIndex),
            kind: 'prefab-sprite-part',
            sortKey: Number(partSort.sortKey || 0) + 0.0005,
            tie: Number(partSort.tie || 0) + 300000 + partIndex,
            instanceId: inst.instanceId || null,
            prefabId: prefab && prefab.id || null,
            renderPath: 'dynamic-renderables',
            spritePart: part,
            spritePartCount: spriteParts.parts.length,
            worldBounds: getInstanceWorldBoundsForRender(inst),
            drawScreenPosition: deriveRenderableDrawPosition({ debugFoot: iso(Number(part.cell && part.cell.x || inst.x || 0) + 0.5, Number(part.cell && part.cell.y || inst.y || 0) + 0.5, Number(part.cell && part.cell.z || inst.z || 0)) }),
            worldX: Number(part.cell && part.cell.x || inst.x || 0) + 0.5,
            worldY: Number(part.cell && part.cell.y || inst.y || 0) + 0.5,
            draw: () => {
              const drawn = drawPrefabSpritePartInstance(inst, prefab, part, 1);
              if (!drawn && !prefabDrawsVoxels(prefab)) drawInstanceProxyBoxes(inst, 0.82);
            },
          });
          spriteRenderableBuildMs += Math.max(0, perfNow() - spriteRenderableStartAt);
        }
        if (inst.__lastSpriteDepthSplitSignature !== spriteParts.reason + ':' + spriteParts.parts.length) {
          inst.__lastSpriteDepthSplitSignature = spriteParts.reason + ':' + spriteParts.parts.length;
          detailLog('sprite-depth-split: ' + String(inst.instanceId) + ' prefab=' + String(prefab && prefab.id || 'unknown') + ' parts=' + String(spriteParts.parts.length) + ' reason=' + String(spriteParts.reason || 'tile-aligned-footprint-split'));
        }
      } else {
        const spriteSort = computeSpriteRenderableSort(inst, prefab);
        if (inst.__lastSpriteOcclusion !== spriteSort.occlusion) {
          inst.__lastSpriteOcclusion = spriteSort.occlusion;
          detailLog(`sprite-sort: ${inst.instanceId} prefab=${prefab.id} mode=${getSpriteProxySortMode(prefab)} occlusion=${spriteSort.occlusion} sortKey=${spriteSort.sortKey.toFixed(4)}`);
        }
        const spriteRenderableStartAt = perfNow();
        dynamicRenderables.push({
          id: 'sprite-' + inst.instanceId,
          kind: 'prefab-sprite',
          sortKey: spriteSort.sortKey,
          tie: spriteSort.tie,
          instanceId: inst.instanceId || null,
          prefabId: prefab && prefab.id || null,
          renderPath: 'dynamic-renderables',
          worldBounds: getInstanceWorldBoundsForRender(inst),
          drawScreenPosition: deriveRenderableDrawPosition({ debugFoot: iso(Number(inst && inst.x || 0) + 0.5, Number(inst && inst.y || 0) + 0.5, Number(inst && inst.z || 0)) }),
          worldX: Number(inst && inst.x || 0) + 0.5,
          worldY: Number(inst && inst.y || 0) + 0.5,
          draw: () => {
            const drawn = drawPrefabSpriteInstance(inst, 1);
            if (!drawn && !prefabDrawsVoxels(prefab)) drawInstanceProxyBoxes(inst, 0.82);
          },
        });
        spriteRenderableBuildMs += Math.max(0, perfNow() - spriteRenderableStartAt);
      }
      spriteSortBuildMs += Math.max(0, perfNow() - spriteSortStartAt);
    }
  }

  recordRenderFunctionTiming('render.buildMainFrameRenderables.dynamicLoop.total', Math.max(0, perfNow() - dynamicBuildStartAt), { visibleDynamicInstanceCount: Number(visibleDynamicInstances.length || 0) });
  recordRenderFunctionTiming('render.buildMainFrameRenderables.dynamicLoop.buildPlacedDebugInstanceFaceRenderables', debugFaceBuildMs);
  recordRenderFunctionTiming('render.buildMainFrameRenderables.dynamicLoop.filterHabboInstanceBoxes', habboVoxelFilterMs);
  recordRenderFunctionTiming('render.buildMainFrameRenderables.dynamicLoop.buildShiftedVoxelRenderable', habboVoxelBuildMs);
  recordRenderFunctionTiming('render.buildMainFrameRenderables.dynamicLoop.computeSpriteRenderableSort', spriteSortBuildMs);
  recordRenderFunctionTiming('render.buildMainFrameRenderables.dynamicLoop.pushSpriteRenderable', spriteRenderableBuildMs);

  var playerActorBuildMs = 0;
  if (SHOW_PLAYER && pointWithinWorldBoundsXY(player.x, player.y, cameraScope.cullingWorldBounds)) {
    var playerActorStartAt = perfNow();
    var playerZ = Number(player && player.z != null ? player.z : 0);
    var playerSortMeta = (getDomainSceneCoreApi() && typeof getDomainSceneCoreApi().computePlayerActorRenderableSort === 'function')
      ? getDomainSceneCoreApi().computePlayerActorRenderableSort({ player: player, viewRotation: normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation) })
      : Object.assign({ tie: 700000 }, computeViewAwareSortMeta({ x: player.x, y: player.y, z: playerZ }, 0, normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation)));
    var playerRenderZ = Number(playerSortMeta && playerSortMeta.depthAnchor && playerSortMeta.depthAnchor.z != null ? playerSortMeta.depthAnchor.z : playerZ);
    if (!Number.isFinite(playerRenderZ)) playerRenderZ = playerZ;
    dynamicRenderables.push({
      id: 'player-avatar',
      kind: 'player-avatar',
      sortMode: 'player-foot-anchor',
      sortKey: playerSortMeta.sortKey,
      tie: playerSortMeta.tie,
      depthAnchor: playerSortMeta.depthAnchor || { x: Number(player.x || 0), y: Number(player.y || 0), z: playerRenderZ },
      worldX: Number(player.x || 0),
      worldY: Number(player.y || 0),
      worldZ: playerRenderZ,
      draw: () => drawPlayerAvatar(),
    });
    playerActorBuildMs += Math.max(0, perfNow() - playerActorStartAt);
  }
  recordRenderFunctionTiming('render.buildMainFrameRenderables.playerActor', playerActorBuildMs, { playerRenderableCount: SHOW_PLAYER ? 1 : 0, playerSortMode: 'player-foot-anchor' });

  var actorInteractionReplacementMs = 0;
  var actorInteractionFaceKeySet = new Set();
  var actorInteractionStableModeEnabled = isStableActorSortModeEnabledForRender();
  var actorInteractionResult = { staticRenderables: staticRenderablesAll, replacementRenderables: [], suppressedPacketCount: 0, checkedPacketCount: 0, suppressedFaceKeyCount: 0, stableModeSkipped: actorInteractionStableModeEnabled === true };
  if (SHOW_PLAYER && pointWithinWorldBoundsXY(player.x, player.y, cameraScope.cullingWorldBounds) && !actorInteractionStableModeEnabled) {
    var actorInteractionStartAt = perfNow();
    actorInteractionFaceKeySet = buildActorInteractionCandidateFaceKeySetForPlayer({
      player: player,
      sourceBoxes: boxes,
      occ: visibleOcc,
      viewRotation: viewRotationInfo.viewRotation,
      radius: getActorInteractionSortRadiusForRender(),
      dynamicInstanceIdSet: dynamicInstanceIdSet
    });
    actorInteractionResult = applyActorInteractionReplacementToRenderables(
      staticRenderablesAll,
      actorInteractionFaceKeySet,
      normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation),
      SHOW_PLAYER ? player : null
    );
    actorInteractionReplacementMs += Math.max(0, perfNow() - actorInteractionStartAt);
  } else if (actorInteractionStableModeEnabled && isActorInteractionOrderDiagEnabled()) {
    emitActorInteractionOrderDiag('stable-mode-skip-dynamic-replacement', {
      mode: 'stable-renderable-identity',
      reason: 'dynamic-suppress-replacement-disabled',
      inputStaticRenderableCount: Number(staticRenderablesAll && staticRenderablesAll.length || 0),
      player: summarizeActorDiagPlayer(typeof player !== 'undefined' ? player : null)
    }, { maxCount: 6000 });
  }
  recordRenderFunctionTiming('render.buildMainFrameRenderables.actorInteractionReplacement', actorInteractionReplacementMs, {
    actorInteractionMode: actorInteractionStableModeEnabled ? 'stable-renderable-identity' : 'legacy-dynamic-replacement',
    actorInteractionStableModeSkippedDynamicReplacement: actorInteractionStableModeEnabled === true,
    actorInteractionCandidateFaceKeyCount: Number(actorInteractionFaceKeySet && actorInteractionFaceKeySet.size || 0),
    actorInteractionReplacementRenderableCount: Number(actorInteractionResult && actorInteractionResult.replacementRenderables && actorInteractionResult.replacementRenderables.length || 0),
    actorInteractionSuppressedStaticPacketCount: Number(actorInteractionResult && actorInteractionResult.suppressedPacketCount || 0),
    actorInteractionRadius: Number(getActorInteractionSortRadiusForRender() || 0)
  });

  const dynamicSortStartAt = perfNow();
  const sortedDynamicRenderables = typeof sortRenderablesByOrderForRender === 'function'
    ? sortRenderablesByOrderForRender(dynamicRenderables)
    : dynamicRenderables.slice().sort(compareRenderablesByDomain);
  dynamicRenderables.length = 0;
  for (var dynamicSortIndex = 0; dynamicSortIndex < sortedDynamicRenderables.length; dynamicSortIndex++) {
    dynamicRenderables.push(sortedDynamicRenderables[dynamicSortIndex]);
  }
  recordRenderFunctionTiming('render.buildMainFrameRenderables.dynamicRenderables.sort', perfNow() - dynamicSortStartAt, { dynamicRenderableCount: Number(dynamicRenderables.length || 0) });
  const dynamicObjectBuildMs = Math.max(0, perfNow() - dynamicBuildStartAt);
  const mergeStartAt = perfNow();
  const staticRenderablesBase = actorInteractionResult && Array.isArray(actorInteractionResult.staticRenderables) ? actorInteractionResult.staticRenderables : staticRenderablesAll;
  const stableDemergeResult = applyStableActorSortDemergeToStaticRenderables(staticRenderablesBase, normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation), SHOW_PLAYER ? player : null, { radius: getActorInteractionSortRadiusForRender() });
  const staticRenderablesForSupportTop = stableDemergeResult && Array.isArray(stableDemergeResult.staticRenderables) ? stableDemergeResult.staticRenderables : staticRenderablesBase;
  const supportTopSortResult = SHOW_PLAYER && pointWithinWorldBoundsXY(player.x, player.y, cameraScope.cullingWorldBounds)
    ? applyPlayerSupportTopSortOverrideToRenderables(staticRenderablesForSupportTop, player, normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation))
    : { staticRenderables: staticRenderablesForSupportTop, overrideCount: 0, overrideSamples: [], mode: 'stable-no-player' };
  const staticRenderables = supportTopSortResult && Array.isArray(supportTopSortResult.staticRenderables) ? supportTopSortResult.staticRenderables : staticRenderablesForSupportTop;
  const dynamicRenderablesCulled = dynamicRenderables;
  const renderables = mergeSortedRenderables(staticRenderables, dynamicRenderablesCulled);
  updatePlayerMoveFastPathStaticOrderCacheForRender({
    viewRotation: normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation),
    cameraScope: cameraScope,
    staticRenderablesForSupportTop: staticRenderablesForSupportTop,
    staticRenderables: staticRenderables,
    dynamicRenderableCount: dynamicRenderablesCulled.length,
    stableDemergeResult: stableDemergeResult,
    supportTopSortResult: supportTopSortResult,
    surfaceStats: surfaceStats,
    occupancyCacheVersion: occupancyCacheVersion
  });
  if (isActorInteractionOrderDiagEnabled()) {
    emitActorInteractionOrderDiag('build-renderables-summary', {
      frameHint: 'frameplan-' + String((typeof __mainFramePlanSeq !== 'undefined' ? __mainFramePlanSeq : 0) + 1),
      viewRotation: normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation),
      player: summarizeActorDiagPlayer(typeof player !== 'undefined' ? player : null),
      staticRenderableCountBeforeReplacement: Number(staticRenderablesAll.length || 0),
      staticRenderableCountAfterReplacement: Number(staticRenderables.length || 0),
      dynamicRenderableCount: Number(dynamicRenderablesCulled.length || 0),
      mergedRenderableCount: Number(renderables.length || 0),
      actorInteractionMode: actorInteractionStableModeEnabled ? 'stable-renderable-identity' : 'legacy-dynamic-replacement',
      actorInteractionStableModeSkippedDynamicReplacement: actorInteractionStableModeEnabled === true,
      actorInteractionCandidateFaceKeyCount: Number(actorInteractionFaceKeySet && actorInteractionFaceKeySet.size || 0),
      actorInteractionReplacementRenderableCount: Number(actorInteractionResult && actorInteractionResult.replacementRenderables && actorInteractionResult.replacementRenderables.length || 0),
      actorInteractionSuppressedStaticPacketCount: Number(actorInteractionResult && actorInteractionResult.suppressedPacketCount || 0),
      stableDemergeMode: String(stableDemergeResult && stableDemergeResult.mode || 'none'),
      stableDemergeInputStaticRenderableCount: Number(stableDemergeResult && stableDemergeResult.inputCount || 0),
      stableDemergeOutputStaticRenderableCount: Number(stableDemergeResult && stableDemergeResult.outputCount || 0),
      stableDemergeSplitPacketCount: Number(stableDemergeResult && stableDemergeResult.splitPacketCount || 0),
      stableDemergeCreatedFaceCount: Number(stableDemergeResult && stableDemergeResult.createdFaceCount || 0),
      supportTopSortMode: String(supportTopSortResult && supportTopSortResult.mode || 'legacy-support-top'),
      supportTopSortOverrideCount: Number(supportTopSortResult && supportTopSortResult.overrideCount || 0),
      nearbyBoxes: summarizeActorDiagNearbyBoxes(typeof player !== 'undefined' ? player : null, boxes, getActorInteractionSortRadiusForRender(), 18)
    }, { maxCount: 6000 });
  }
  recordRenderFunctionTiming('render.buildMainFrameRenderables.mergeSortedRenderables', perfNow() - mergeStartAt, {
    staticRenderableCount: Number(staticRenderables.length || 0),
    dynamicRenderableCount: Number(dynamicRenderablesCulled.length || 0),
    mergedRenderableCount: Number(renderables.length || 0),
    stableDemergeMode: String(stableDemergeResult && stableDemergeResult.mode || 'none'),
    stableDemergeSplitPacketCount: Number(stableDemergeResult && stableDemergeResult.splitPacketCount || 0),
    stableDemergeCreatedFaceCount: Number(stableDemergeResult && stableDemergeResult.createdFaceCount || 0),
    stableDemergePlayerInteractionCellKey: String(stableDemergeResult && stableDemergeResult.playerInteractionCellKey || ''),
    stableDemergeCacheHit: stableDemergeResult && stableDemergeResult.cacheHit === true,
    stableDemergeCacheHitCount: Number(stableDemergeResult && stableDemergeResult.cacheHitCount || 0),
    stableDemergeCacheMissCount: Number(stableDemergeResult && stableDemergeResult.cacheMissCount || 0)
  });
  const staticPacketDrawPrepMs = 0;
  const mergeMs = Math.max(0, perfNow() - mergeStartAt);
  const beforeVisibilityAt = perfNow();
  const visibleLightsForStats = getMainCameraVisibleLightsForRender(viewRotationInfo.viewRotation);
  const afterVisibilityAt = perfNow();
  recordRenderFunctionTiming('render.buildMainFrameRenderables.getMainCameraVisibleLightsForRender', afterVisibilityAt - beforeVisibilityAt, { visibleLightCount: Number(visibleLightsForStats && visibleLightsForStats.length || 0) });
  const staticCacheFrameState = getCurrentRenderFrameStaticCacheState();
  const staticCacheRebuiltThisFrame = staticCacheFrameState && staticCacheFrameState.rebuilt === true;
  const staticCacheBuildMs = Number(staticCacheFrameState && staticCacheFrameState.buildMs || 0);
  const staticCacheFrameProfile = staticCacheFrameState && staticCacheFrameState.profile && typeof staticCacheFrameState.profile === 'object' ? staticCacheFrameState.profile : {};
  const terrainStats = terrainBuild && terrainBuild.stats ? terrainBuild.stats : { visibleColumnCount: 0, culledColumnCount: 0, visibleChunkCount: 0, culledChunkCount: 0, terrainColumnCount: 0, logicalVoxelCountEstimated: 0, visibleTopFaceCount: 0, visibleSideFaceCount: 0, internalVoxelSkippedCount: 0, hiddenInternalSurfaceSkippedCount: 0, terrainBuildWasScoped: true, terrainCellCount: 0, terrainExpandedVoxelInstanceCount: 0, terrainUsesColumnModel: false };
  __lastMainRenderableBuildStats = {
    currentViewRotation: normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation),
    staticRenderableCount: staticRenderables.length,
    dynamicRenderableCount: dynamicRenderablesCulled.length,
    staticRenderableCountBeforeCulling: staticRenderablesAll.length,
    dynamicRenderableCountBeforeCulling: dynamicRenderables.length,
    renderablesBeforeCulling: staticRenderablesAll.length + dynamicRenderables.length,
    renderablesAfterCulling: renderables.length,
    cameraCullingEnabled: cameraScope.cameraCullingEnabled !== false,
    zoom: cameraScope.zoom,
    reason: 'buildRenderables',
    terrainBuildMs: terrainBuildMs,
    staticBuildMs: Math.max(0, afterStaticCacheAt - (terrainBuildStartAt + terrainBuildMs)),
    dynamicBuildMs: Number(dynamicObjectBuildMs.toFixed(3)),
    dynamicFilterMs: Number(dynamicFilterMs.toFixed(3)),
    staticPacketMergeMs: Number(surfaceStats.packetMergeMs || 0),
    staticPacketProjectMs: 0,
    staticPacketSortMs: Number(mergeMs.toFixed(3)),
    staticPacketDrawPrepMs: Number(staticPacketDrawPrepMs.toFixed(3)),
    visibleStaticChunkCount: Number(surfaceStats.visibleChunkCount || 0),
    visibleStaticPacketCount: Number(surfaceStats.visibleStaticPacketCount || staticRenderables.length || 0),
    renderSourceBuildMs: Math.max(0, afterStaticCacheAt - buildStartAt) + terrainBuildMs,
    visibilityFilterMs: Math.max(0, afterVisibilityAt - beforeVisibilityAt),
    visibleSurfaceCount: Number(surfaceStats.visibleTopFaceCount || 0) + Number(surfaceStats.visibleSideFaceCount || 0) + Number(terrainStats.visibleTopFaceCount || 0) + Number(terrainStats.visibleSideFaceCount || 0),
    hiddenInternalSurfaceSkippedCount: Number(surfaceStats.hiddenInternalSurfaceSkippedCount || 0) + Number(terrainStats.hiddenInternalSurfaceSkippedCount || 0),
    surfaceOnlyRenderingEnabled: surfaceStats.surfaceOnlyRenderingEnabled !== false,
    colorCacheEnabled: surfaceStats.colorCacheEnabled === true,
    colorCacheHitCount: Number(surfaceStats.colorCacheHitCount || 0),
    colorCacheMissCount: Number(surfaceStats.colorCacheMissCount || 0),
    shadowOverlayCacheHitCount: Number(surfaceStats.shadowOverlayCacheHitCount || 0),
    shadowOverlayCacheMissCount: Number(surfaceStats.shadowOverlayCacheMissCount || 0),
    shadowOverlayTotalCount: Number(surfaceStats.shadowOverlayTotalCount || 0),
    step4_buildColorMs: Number(surfaceStats.step4_buildColorMs || 0),
    step4d_shadowOverlayTotalMs: Number(surfaceStats.step4d_shadowOverlayTotalMs || 0),
    cacheContentType: String(surfaceStats.cacheContentType || 'world-face-packets'),
    cameraIndependent: surfaceStats.cameraIndependent !== false,
    usesScreenSpaceCache: surfaceStats.usesScreenSpaceCache === true,
    totalChunkCount: Number(surfaceStats.totalChunkCount || 0),
    dirtyChunkCount: Number(surfaceStats.dirtyChunkCount || 0),
    remainingDirtyChunkCount: Number(surfaceStats.remainingDirtyChunkCount || surfaceStats.dirtyChunkCount || 0),
    totalStaticRenderables: Number(surfaceStats.totalStaticRenderables || staticRenderables.length || 0),
    chunkSize: Number(surfaceStats.chunkSize || 0),
    mergeReductionRatio: Number(surfaceStats.mergeReductionRatio || 0),
    packetMergeMs: Number(surfaceStats.packetMergeMs || 0),
    worldObjectCount: Number(instances.length || 0) + Number(lights.length || 0) + Number(boxes.length || 0) + Number(terrainStats.terrainCellCount || 0),
    lightSourcesBeforeCulling: Number(lights.length || 0),
    lightSourcesAfterCulling: Number(visibleLightsForStats.length || 0),
    objectsBeforeCulling: Number(instances.length || 0),
    objectsAfterCulling: Number(visibleInstanceSummary.visibleInstances || visibleDynamicInstances.length || 0),
    dynamicLoopCandidatesBeforeFilter: Number(dynamicCandidates.length || 0),
    dynamicLoopInstanceCount: Number(visibleDynamicInstances.length || 0),
    dynamicObjectCount: Number(dynamicRenderablesCulled.length || 0),
    actorInteractionMode: actorInteractionStableModeEnabled ? 'stable-renderable-identity' : 'legacy-dynamic-replacement',
    actorInteractionStableModeSkippedDynamicReplacement: actorInteractionStableModeEnabled === true,
    supportTopSortMode: String(supportTopSortResult && supportTopSortResult.mode || 'legacy-support-top'),
    actorInteractionCandidateFaceKeyCount: Number(actorInteractionFaceKeySet && actorInteractionFaceKeySet.size || 0),
    actorInteractionReplacementRenderableCount: Number(actorInteractionResult && actorInteractionResult.replacementRenderables && actorInteractionResult.replacementRenderables.length || 0),
    actorInteractionSuppressedStaticPacketCount: Number(actorInteractionResult && actorInteractionResult.suppressedPacketCount || 0),
    actorInteractionSuppressionCheckedStaticPacketCount: Number(actorInteractionResult && actorInteractionResult.checkedPacketCount || 0),
    actorInteractionSuppressedFaceKeyCount: Number(actorInteractionResult && actorInteractionResult.suppressedFaceKeyCount || 0),
    supportTopSortOverrideCount: Number(supportTopSortResult && supportTopSortResult.overrideCount || 0),
    actorInteractionRadius: Number(getActorInteractionSortRadiusForRender() || 0),
    staticInstanceSkippedByDynamicLoop: Number(visibleInstanceSummary.staticSkippedByDynamicLoop || 0),
    occupancyCacheVersion: occupancyCacheVersion,
    occupancyRebuiltThisFrame: occupancyRebuiltThisFrame,
    staticCacheRebuiltThisFrame: staticCacheRebuiltThisFrame,
    staticCacheBuildMs: staticCacheBuildMs,
    staticCacheInvalidationReason: String(staticCacheFrameState && staticCacheFrameState.invalidationReason || staticCacheFrameProfile.invalidationReason || 'none'),
    staticCacheProfileTotalMs: Number(staticCacheFrameProfile.totalMs || 0),
    staticCacheRenderSignatureChanged: staticCacheFrameProfile.renderSignatureChanged === true,
    staticCacheRenderSignatureChangedFieldNames: Array.isArray(staticCacheFrameProfile.renderSignatureChangedFieldNames) ? staticCacheFrameProfile.renderSignatureChangedFieldNames.slice() : [],
    staticCacheRenderSignatureChangedFieldCount: Number(staticCacheFrameProfile.renderSignatureChangedFieldCount || 0),
    staticCacheRenderSignaturePreviousValues: staticCacheFrameProfile.renderSignaturePreviousValues || {},
    staticCacheRenderSignatureNextValues: staticCacheFrameProfile.renderSignatureNextValues || {},
    staticCacheForcedVisibleStructuralRebuild: staticCacheFrameProfile.forcedVisibleStructuralRebuild === true,
    staticCacheStructuralRenderSignatureChanged: staticCacheFrameProfile.structuralRenderSignatureChanged === true,
    staticCacheRebuiltChunkKeysThisFrame: Array.isArray(staticCacheFrameProfile.rebuiltChunkKeysThisFrame) ? staticCacheFrameProfile.rebuiltChunkKeysThisFrame.slice() : [],
    activeRendererBackend: String(staticCacheFrameProfile.activeRendererBackend || 'unknown'),
    activeRendererType: String(staticCacheFrameProfile.activeRendererType || 'unknown'),
    gpuAccelerated: staticCacheFrameProfile.gpuAccelerated === true,
    gpuBackendFamily: String(staticCacheFrameProfile.gpuBackendFamily || 'unknown'),
    gpuRenderer: String(staticCacheFrameProfile.gpuRenderer || ''),
    gpuVendor: String(staticCacheFrameProfile.gpuVendor || ''),
    pixiInitialized: staticCacheFrameProfile.pixiInitialized === true,
    pixiRendererCreated: staticCacheFrameProfile.pixiRendererCreated === true,
    visibleChunkCount: Number(surfaceStats.visibleChunkCount || 0),
    rebuiltChunkCountThisFrame: Number(surfaceStats.rebuiltChunkCountThisFrame || 0),
    reusedChunkCountThisFrame: Number(surfaceStats.reusedChunkCountThisFrame || 0),
    zoomInteractionActive: faceMergeControlState.zoomInteractionActive === true,
    zoomSettlePending: faceMergeControlState.zoomSettlePending === true,
    effectiveFaceMergeMode: String(faceMergeControlState.effectiveFaceMergeMode || 'merge'),
    pendingFaceMergeMode: String(faceMergeControlState.pendingFaceMergeMode || faceMergeControlState.effectiveFaceMergeMode || 'merge'),
    faceMergeModeSwitchCount: Number(faceMergeControlState.faceMergeModeSwitchCount || 0),
    hysteresisHitCount: Number(faceMergeControlState.hysteresisHitCount || 0),
    stableDemergeMode: String(stableDemergeResult && stableDemergeResult.mode || 'none'),
    stableDemergeSplitPacketCount: Number(stableDemergeResult && stableDemergeResult.splitPacketCount || 0),
    stableDemergeCreatedFaceCount: Number(stableDemergeResult && stableDemergeResult.createdFaceCount || 0),
    stableDemergePlayerInteractionCellKey: String(stableDemergeResult && stableDemergeResult.playerInteractionCellKey || ''),
    stableDemergeCacheHit: stableDemergeResult && stableDemergeResult.cacheHit === true,
    stableDemergeCacheHitCount: Number(stableDemergeResult && stableDemergeResult.cacheHitCount || 0),
    stableDemergeCacheMissCount: Number(stableDemergeResult && stableDemergeResult.cacheMissCount || 0)
  };
  __lastRenderFrameOccupancyVersion = occupancyCacheVersion;
  var frameBuildMs = Number(Math.max(0, perfNow() - buildStartAt).toFixed(3));
  __lastMainRenderableBuildStats.frameBuildMs = frameBuildMs;
  var terrainModelForFirstFrames = getTerrainRuntimeModelForRender();
  var currentTerrainBatchIdForFrames = terrainModelForFirstFrames && terrainModelForFirstFrames.activeTerrainBatchId ? String(terrainModelForFirstFrames.activeTerrainBatchId) : null;
  if (currentTerrainBatchIdForFrames && currentTerrainBatchIdForFrames !== __lastObservedTerrainBatchIdForFrames) {
    __terrainFirstFrameWindow = { terrainBatchId: currentTerrainBatchIdForFrames, remaining: 10, nextFrameIndex: 1 };
  } else if (!currentTerrainBatchIdForFrames) {
    __terrainFirstFrameWindow = { terrainBatchId: null, remaining: 0, nextFrameIndex: 1 };
  }
  __lastObservedTerrainBatchIdForFrames = currentTerrainBatchIdForFrames;
  if (__terrainFirstFrameWindow.remaining > 0 && currentTerrainBatchIdForFrames && __terrainFirstFrameWindow.terrainBatchId === currentTerrainBatchIdForFrames) {
    emitTerrainFirstFrames({
      terrainBatchId: currentTerrainBatchIdForFrames,
      frameIndexAfterTerrainApply: Number(__terrainFirstFrameWindow.nextFrameIndex || 1),
      visibleInstances: Number(visibleInstanceSummary.visibleInstances || visibleDynamicInstances.length || 0),
      visibleDynamicInstances: Number(visibleInstanceSummary.visibleDynamicInstances || visibleDynamicInstances.length || 0),
      staticSkippedByDynamicLoop: Number(visibleInstanceSummary.staticSkippedByDynamicLoop || 0),
      totalBoxes: Number(boxes.length || 0),
      occupancyCacheVersion: occupancyCacheVersion,
      occupancyRebuiltThisFrame: occupancyRebuiltThisFrame,
      staticCacheRebuiltThisFrame: staticCacheRebuiltThisFrame,
      visibleChunkCount: Number(surfaceStats.visibleChunkCount || 0),
      rebuiltChunkCountThisFrame: Number(surfaceStats.rebuiltChunkCountThisFrame || 0),
      reusedChunkCountThisFrame: Number(surfaceStats.reusedChunkCountThisFrame || 0),
      remainingDirtyChunkCount: Number(surfaceStats.remainingDirtyChunkCount || surfaceStats.dirtyChunkCount || 0),
      frameBuildMs: frameBuildMs,
      staticCacheBuildMs: Number(staticCacheBuildMs.toFixed(3)),
      dynamicLoopBuildMs: Number(__lastMainRenderableBuildStats && __lastMainRenderableBuildStats.dynamicBuildMs || 0)
    });
    emitTerrainFirstFramesDetail({
      terrainBatchId: currentTerrainBatchIdForFrames,
      frameIndexAfterTerrainApply: Number(__terrainFirstFrameWindow.nextFrameIndex || 1),
      visibleChunkCount: Number(surfaceStats.visibleChunkCount || 0),
      rebuiltChunkCountThisFrame: Number(surfaceStats.rebuiltChunkCountThisFrame || 0),
      rebuiltChunkKeysThisFrame: Array.isArray(surfaceStats.rebuiltChunkKeysThisFrame) ? surfaceStats.rebuiltChunkKeysThisFrame.slice() : [],
      reusedChunkCountThisFrame: Number(surfaceStats.reusedChunkCountThisFrame || 0),
      remainingDirtyChunkCount: Number(surfaceStats.remainingDirtyChunkCount || surfaceStats.dirtyChunkCount || 0),
      staticCacheBuildMs: Number(staticCacheBuildMs.toFixed(3)),
      frameBuildMs: frameBuildMs,
      rebuiltChunkTotalBoxCount: Number(surfaceStats.rebuiltChunkTotalBoxCount || 0),
      rebuiltChunkTotalRenderableCount: Number(surfaceStats.rebuiltChunkTotalRenderableCount || 0),
      rebuiltChunkTotalVisibleFaceCount: Number(surfaceStats.rebuiltChunkTotalVisibleFaceCount || 0)
    });
    __terrainFirstFrameWindow.remaining = Math.max(0, Number(__terrainFirstFrameWindow.remaining || 0) - 1);
    __terrainFirstFrameWindow.nextFrameIndex = Number(__terrainFirstFrameWindow.nextFrameIndex || 1) + 1;
  }
  maybeLogRenderFrameSummary({
    cameraX: Number(cameraScope.cameraX || 0),
    cameraY: Number(cameraScope.cameraY || 0),
    zoom: Number(cameraScope.zoom || 1),
    visibleInstances: Number(visibleInstanceSummary.visibleInstances || visibleDynamicInstances.length || 0),
    visibleDynamicInstances: Number(visibleInstanceSummary.visibleDynamicInstances || visibleDynamicInstances.length || 0),
    staticSkippedByDynamicLoop: Number(visibleInstanceSummary.staticSkippedByDynamicLoop || 0),
    totalBoxes: Number(boxes.length || 0),
    occupancyCacheVersion: occupancyCacheVersion,
    occupancyRebuiltThisFrame: occupancyRebuiltThisFrame,
    staticCacheRebuiltThisFrame: staticCacheRebuiltThisFrame,
    staticCacheBuildMs: Number(staticCacheBuildMs.toFixed(3)),
    visibleChunkCount: Number(surfaceStats.visibleChunkCount || 0),
    rebuiltChunkCountThisFrame: Number(surfaceStats.rebuiltChunkCountThisFrame || 0),
    reusedChunkCountThisFrame: Number(surfaceStats.reusedChunkCountThisFrame || 0),
    zoomInteractionActive: faceMergeControlState.zoomInteractionActive === true,
    zoomSettlePending: faceMergeControlState.zoomSettlePending === true,
    effectiveFaceMergeMode: String(faceMergeControlState.effectiveFaceMergeMode || 'merge'),
    pendingFaceMergeMode: String(faceMergeControlState.pendingFaceMergeMode || faceMergeControlState.effectiveFaceMergeMode || 'merge'),
    faceMergeModeSwitchCount: Number(faceMergeControlState.faceMergeModeSwitchCount || 0),
    hysteresisHitCount: Number(faceMergeControlState.hysteresisHitCount || 0),
    frameBuildMs: frameBuildMs
  });
  maybeLogCameraStaticWorldVerify({
    cameraX: Number(cameraScope.cameraX || 0),
    cameraY: Number(cameraScope.cameraY || 0),
    zoom: Number(cameraScope.zoom || 1),
    visibleChunkCount: Number(surfaceStats.visibleChunkCount || 0),
    rebuiltChunkCountThisFrame: Number(surfaceStats.rebuiltChunkCountThisFrame || 0),
    reusedChunkCountThisFrame: Number(surfaceStats.reusedChunkCountThisFrame || 0),
    staticCacheRebuiltThisFrame: staticCacheRebuiltThisFrame,
    staticCacheBuildMs: Number(staticCacheBuildMs.toFixed(3)),
    zoomInteractionActive: faceMergeControlState.zoomInteractionActive === true,
    zoomSettlePending: faceMergeControlState.zoomSettlePending === true,
    effectiveFaceMergeMode: String(faceMergeControlState.effectiveFaceMergeMode || 'merge'),
    pendingFaceMergeMode: String(faceMergeControlState.pendingFaceMergeMode || faceMergeControlState.effectiveFaceMergeMode || 'merge'),
    cacheContentType: String(surfaceStats.cacheContentType || 'world-face-packets'),
    cameraIndependent: surfaceStats.cameraIndependent !== false,
    usesScreenSpaceCache: surfaceStats.usesScreenSpaceCache === true,
    frameBuildMs: frameBuildMs
  });
  maybeLogCameraMoveVerify({
    cameraX: Number(cameraScope.cameraX || 0),
    cameraY: Number(cameraScope.cameraY || 0),
    zoom: Number(cameraScope.zoom || 1),
    visibleChunkCount: Number(surfaceStats.visibleChunkCount || 0),
    staticCacheRebuiltThisFrame: staticCacheRebuiltThisFrame,
    rebuiltChunkCountThisFrame: Number(surfaceStats.rebuiltChunkCountThisFrame || 0),
    reusedChunkCountThisFrame: Number(surfaceStats.reusedChunkCountThisFrame || 0),
    frameBuildMs: frameBuildMs
  });
  __lastRenderVisibilityStats = {
    worldObjectCount: __lastMainRenderableBuildStats.worldObjectCount,
    renderSourceCountBeforeVisibility: __lastMainRenderableBuildStats.renderablesBeforeCulling + __lastMainRenderableBuildStats.lightSourcesBeforeCulling,
    renderSourceCountAfterVisibility: __lastMainRenderableBuildStats.renderablesAfterCulling + __lastMainRenderableBuildStats.lightSourcesAfterCulling,
    culledByCameraCount: Math.max(0, (__lastMainRenderableBuildStats.renderablesBeforeCulling + __lastMainRenderableBuildStats.lightSourcesBeforeCulling) - (__lastMainRenderableBuildStats.renderablesAfterCulling + __lastMainRenderableBuildStats.lightSourcesAfterCulling)),
    visibleSurfaceCount: __lastMainRenderableBuildStats.visibleSurfaceCount,
    hiddenInternalSurfaceSkippedCount: __lastMainRenderableBuildStats.hiddenInternalSurfaceSkippedCount,
    terrainSourcesBeforeCulling: Number(terrainStats.terrainColumnCount || 0),
    terrainSourcesAfterCulling: Number(terrainStats.visibleColumnCount || 0),
    objectsBeforeCulling: Number(__lastMainRenderableBuildStats.objectsBeforeCulling || 0),
    objectsAfterCulling: Number(__lastMainRenderableBuildStats.objectsAfterCulling || 0),
    terrainColumnCount: Number(terrainStats.terrainColumnCount || 0),
    logicalVoxelCountEstimated: Number(terrainStats.logicalVoxelCountEstimated || 0) + Number(surfaceStats.logicalVoxelCountEstimated || 0),
    voxelFurnitureProcessedCount: Number(surfaceStats.voxelFurnitureProcessedCount || 0),
    surfaceOnlyRenderingEnabled: (surfaceStats.surfaceOnlyRenderingEnabled !== false) && (terrainStats.surfaceOnlyRenderingEnabled !== false),
    renderSourceBuildMs: __lastMainRenderableBuildStats.renderSourceBuildMs,
    visibilityFilterMs: __lastMainRenderableBuildStats.visibilityFilterMs,
    finalRenderableCount: renderables.length,
    cameraZoom: cameraScope.zoom,
    currentViewRotation: normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation),
    terrainBuildMs: terrainBuildMs,
    staticBuildMs: __lastMainRenderableBuildStats.staticBuildMs,
    dynamicBuildMs: __lastMainRenderableBuildStats.dynamicBuildMs,
    visibleChunkCount: Number(terrainStats.visibleChunkCount || 0),
    culledChunkCount: Number(terrainStats.culledChunkCount || 0),
    terrainCellCount: Number(terrainStats.terrainCellCount || 0),
    terrainExpandedVoxelInstanceCount: Number(terrainStats.terrainExpandedVoxelInstanceCount || 0),
    terrainUsesColumnModel: terrainStats.terrainUsesColumnModel === true,
    terrainBatchDrawCount: Number(terrainStats.terrainBatchDrawCount || 0),
    terrainVisibleFaceCount: Number(terrainStats.terrainVisibleFaceCount || 0),
    terrainVisibleChunkCount: Number(terrainStats.visibleChunkCount || 0)
  };
  logItemRotationPrototype('render-camera-culling-summary', {
    cameraCullingEnabled: cameraScope.cameraCullingEnabled !== false,
    viewportWorldBounds: cameraScope.viewportWorldBounds,
    cullingWorldBounds: cameraScope.cullingWorldBounds,
    objectsBeforeCulling: Number(__lastRenderVisibilityStats.objectsBeforeCulling || 0),
    objectsAfterCulling: Number(__lastRenderVisibilityStats.objectsAfterCulling || 0),
    terrainSourcesBeforeCulling: Number(__lastRenderVisibilityStats.terrainSourcesBeforeCulling || 0),
    terrainSourcesAfterCulling: Number(__lastRenderVisibilityStats.terrainSourcesAfterCulling || 0),
    lightSourcesBeforeCulling: Number(__lastMainRenderableBuildStats.lightSourcesBeforeCulling || 0),
    lightSourcesAfterCulling: Number(__lastMainRenderableBuildStats.lightSourcesAfterCulling || 0)
  });

  logItemRotationPrototype('render-surface-cache-summary', {
    terrainColumnCount: Number(__lastRenderVisibilityStats.terrainColumnCount || 0),
    logicalVoxelCountEstimated: Number(__lastRenderVisibilityStats.logicalVoxelCountEstimated || 0),
    visibleTopFaceCount: Number((terrainStats && terrainStats.visibleTopFaceCount) || 0) + Number((surfaceStats && surfaceStats.visibleTopFaceCount) || 0),
    visibleSideFaceCount: Number((terrainStats && terrainStats.visibleSideFaceCount) || 0) + Number((surfaceStats && surfaceStats.visibleSideFaceCount) || 0),
    internalVoxelSkippedCount: Number((terrainStats && terrainStats.internalVoxelSkippedCount) || 0) + Number((surfaceStats && surfaceStats.internalVoxelSkippedCount) || 0),
    voxelFurnitureProcessedCount: Number(__lastRenderVisibilityStats.voxelFurnitureProcessedCount || 0),
    surfaceOnlyRenderingEnabled: __lastRenderVisibilityStats.surfaceOnlyRenderingEnabled !== false
  });
  logItemRotationPrototype('render-visibility-summary', {
    worldObjectCount: Number(__lastRenderVisibilityStats.worldObjectCount || 0),
    renderSourceCountBeforeVisibility: Number(__lastRenderVisibilityStats.renderSourceCountBeforeVisibility || 0),
    renderSourceCountAfterVisibility: Number(__lastRenderVisibilityStats.renderSourceCountAfterVisibility || 0),
    culledByCameraCount: Number(__lastRenderVisibilityStats.culledByCameraCount || 0),
    visibleSurfaceCount: Number(__lastRenderVisibilityStats.visibleSurfaceCount || 0),
    hiddenInternalSurfaceSkippedCount: Number(__lastRenderVisibilityStats.hiddenInternalSurfaceSkippedCount || 0)
  });
  var mem = (typeof performance !== 'undefined' && performance && performance.memory) ? performance.memory : null;
  __lastLoggingCostSummary = {
    highFrequencyLogCount: 0,
    loggingEnabled: typeof pushLog === 'function',
    logFlushMs: 0,
    debugLogHeavyModeEnabled: verboseLog === true
  };
  logItemRotationPrototype('logging-cost-summary', __lastLoggingCostSummary);
  logItemRotationPrototype('render-memory-summary', mem ? {
    usedJSHeapSize: Number(mem.usedJSHeapSize || 0),
    totalJSHeapSize: Number(mem.totalJSHeapSize || 0),
    jsHeapSizeLimit: Number(mem.jsHeapSizeLimit || 0),
    memoryApiSupported: true
  } : {
    memoryApiSupported: false
  });
  __lastRenderResourceSummary = {
    frameDtMs: 0,
    terrainBuildMs: Number(__lastRenderVisibilityStats.terrainBuildMs || 0),
    staticBuildMs: Number(__lastMainRenderableBuildStats.staticBuildMs || 0),
    dynamicBuildMs: Number(__lastMainRenderableBuildStats.dynamicBuildMs || 0),
    framePlanBuildMs: 0,
    drawMs: 0,
    finalRenderableCount: renderables.length,
    terrainBatchDrawCount: Number(__lastRenderVisibilityStats.terrainBatchDrawCount || 0),
    terrainVisibleFaceCount: Number(__lastRenderVisibilityStats.terrainVisibleFaceCount || 0),
    terrainVisibleChunkCount: Number(__lastRenderVisibilityStats.terrainVisibleChunkCount || 0)
  };
  logItemRotationPrototype('render-resource-summary', __lastRenderResourceSummary);

  logItemRotationPrototype('render-build-cost-summary', {
    terrainBuildMs: Number(__lastRenderVisibilityStats.terrainBuildMs || 0),
    staticBuildMs: Number(__lastMainRenderableBuildStats.staticBuildMs || 0),
    dynamicBuildMs: Number(__lastMainRenderableBuildStats.dynamicBuildMs || 0),
    framePlanBuildMs: 0,
    renderablesBeforeCulling: Number(__lastMainRenderableBuildStats.renderablesBeforeCulling || 0),
    renderablesAfterCulling: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || 0)
  });
  recordRenderFunctionTiming('render.buildMainFrameRenderables.summary', Math.max(0, perfNow() - buildStartAt), {
    totalRenderableCount: Number(renderables.length || 0),
    staticRenderableCount: Number(staticRenderables.length || 0),
    dynamicRenderableCount: Number(dynamicRenderablesCulled.length || 0),
    visibleStaticPacketCountForSummary: Number(surfaceStats.visibleStaticPacketCount || 0),
    visibleChunkCountForSummary: Number(surfaceStats.visibleChunkCount || 0)
  });

  if (verboseLog) {
    const sec = Math.floor(time);
    if (sec !== lastRenderLogSecond) {
      lastRenderLogSecond = sec;
      pushLog(`render-order ok: total=${renderables.length} static=${staticRenderables.length} dynamic=${dynamicRenderables.length} dynamicLoop=${visibleDynamicInstances.length}/${Number(visibleInstanceSummary.visibleInstances || visibleDynamicInstances.length)} first20=${renderables.slice(0,20).map(r => r.id).join(',')}`);
    }
  }
  return renderables;
}

function buildMainFrameRenderablesForMainFrameAssembler() {
  var fnStartAt = perfNow();
  debugState.renderStep = 'build-renderables';
  var buildRenderablesStartAt = perfNow();
  const order = buildRenderablesForMainFrameAssembler();
  recordRenderFunctionTiming('render.buildMainFrameRenderables.buildRenderables', perfNow() - buildRenderablesStartAt, { renderableCount: Number(order && order.length || 0) });
  var currentViewRotation = normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation);
  for (const item of order) {
    if (!item || typeof item !== 'object') continue;
    if (item.kind === 'static-world-face-packet') continue;
    item.currentViewRotation = currentViewRotation;
    if (typeof item.drawUsedCurrentViewRotation === 'undefined') item.drawUsedCurrentViewRotation = true;
    if (!item.drawScreenPosition) item.drawScreenPosition = deriveRenderableDrawPosition(item);
  }
  if (debugState.frame < 5 || verboseLog) detailLog(`render:buildRenderables count=${order.length} first10=${order.slice(0, 10).map(r => r.id).join(',')}`);
  recordRenderFunctionTiming('render.buildMainFrameRenderables.total', perfNow() - fnStartAt, { renderableCount: Number(order && order.length || 0) });
  return order;
}

  var api = {
    summarizeBoundary: summarizeBoundary,
    buildRenderables: buildRenderablesForMainFrameAssembler,
    buildMainFrameRenderables: buildMainFrameRenderablesForMainFrameAssembler
  };

  global.IsometricMainFrameRenderableAssembler = api;
  global.__MAIN_FRAME_RENDERABLE_ASSEMBLER__ = api;
  global.__APP_APPLICATION_MAIN_FRAME_RENDERABLE_ASSEMBLER__ = api;
  if (!global.App) global.App = {};
  if (!global.App.application) global.App.application = {};
  if (!global.App.application.render) global.App.application.render = {};
  global.App.application.render.mainFrameRenderableAssembler = api;
})(typeof window !== 'undefined' ? window : globalThis);
