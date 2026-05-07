// P12a-3 owner: render order / frame-plan diagnostics.
// Loaded before render.js. This file intentionally owns only render-order diagnostics
// gating and payload emission; it does not build renderables or draw frames.

function isRenderOrderHeavyDiagnosticsEnabled() {
  try {
    if (typeof window !== 'undefined' && window.__RENDER_ORDER_HEAVY_DIAGNOSTICS__ === true) return true;
  } catch (_) {}
  try {
    if (typeof localStorage !== 'undefined') {
      var stored = localStorage.getItem('renderOrderHeavyDiagnostics');
      if (stored === '1' || stored === 'true') return true;
    }
  } catch (_) {}
  return false;
}

function isFramePlanDiagnosticsEnabled() {
  try {
    if (typeof window !== 'undefined' && window.__FRAME_PLAN_DIAGNOSTICS__ === true) return true;
  } catch (_) {}
  try {
    if (typeof localStorage !== 'undefined') {
      var stored = localStorage.getItem('framePlanDiagnostics');
      if (stored === '1' || stored === 'true') return true;
    }
  } catch (_) {}
  return isRenderOrderHeavyDiagnosticsEnabled();
}

function logRenderOrderDiagnostics(framePlanId, framePlanSignature, currentViewRotation, order) {
  if (!isRenderOrderHeavyDiagnosticsEnabled()) return;

  var ordered = [];
  var objectLevelCount = 0;
  var faceLevelCount = 0;
  var buckets = {
    floorRenderableCount: 1,
    staticVoxelRenderableCount: 0,
    debugFaceRenderableCount: 0,
    spriteRenderableCount: 0,
    shadowRenderableCount: (typeof lights !== 'undefined' && Array.isArray(lights) && lights.length) ? 1 : 0,
    overlayRenderableCount: 1
  };
  for (var i = 0; i < order.length; i++) {
    var r = order[i] || null;
    if (!r) continue;
    ordered.push({
      index: i,
      id: r.id || null,
      kind: r.kind || null,
      prefabId: r.prefabId || null,
      instanceId: r.instanceId || null,
      renderPath: r.renderPath || null,
      sortKey: r.sortKey != null ? r.sortKey : null,
      tie: r.tie != null ? r.tie : null
    });
    if (Array.isArray(r.faces) && r.faces.length) objectLevelCount += 1;
    if (r.kind === 'debug-cuboid-face' || r.kind === 'voxel-face') faceLevelCount += 1;
    if (r.kind === 'voxel' || r.kind === 'voxel-face') buckets.staticVoxelRenderableCount += 1;
    else if (r.kind === 'debug-cuboid-face') buckets.debugFaceRenderableCount += 1;
    else if (r.kind === 'prefab-sprite') buckets.spriteRenderableCount += 1;
  }
  logItemRotationPrototype('main-render-order-snapshot', {
    currentViewRotation: currentViewRotation,
    framePlanId: framePlanId,
    framePlanSignature: framePlanSignature,
    orderedRenderables: ordered
  });
  logItemRotationPrototype('main-render-layer-bucket-summary', Object.assign({
    currentViewRotation: currentViewRotation,
    framePlanId: framePlanId,
    mixedGranularityDetected: objectLevelCount > 0 && faceLevelCount > 0,
    objectLevelRenderableCount: objectLevelCount,
    faceLevelRenderableCount: faceLevelCount
  }, buckets));
  for (var j = 0; j < order.length; j++) {
    var rr = order[j];
    if (!rr) continue;
    var faces = snapshotFacesForRenderable(rr);
    if (!faces.length) continue;
    logItemRotationPrototype('main-render-face-order-snapshot', {
      currentViewRotation: currentViewRotation,
      framePlanId: framePlanId,
      renderableId: rr.id || null,
      prefabId: rr.prefabId || null,
      instanceId: rr.instanceId || null,
      renderPath: rr.renderPath || null,
      renderableSortKey: rr.sortKey != null ? rr.sortKey : null,
      renderableTie: rr.tie != null ? rr.tie : null,
      faces: faces
    });
  }
  logRenderOracleChecks(order, currentViewRotation);
  var conflictBudget = 0;
  for (var li = 0; li < order.length; li++) {
    var left = order[li];
    if (!left) continue;
    var leftBBox = computeRenderableSnapshotBBox(left);
    for (var ri = li + 1; ri < order.length; ri++) {
      var right = order[ri];
      if (!right) continue;
      var rightBBox = computeRenderableSnapshotBBox(right);
      var overlap = bboxOverlapArea(leftBBox, rightBBox);
      if (overlap <= 0) continue;
      logItemRotationPrototype('main-render-overlap-conflict', {
        currentViewRotation: currentViewRotation,
        framePlanId: framePlanId,
        leftId: left.id || null,
        rightId: right.id || null,
        leftKind: left.kind || null,
        rightKind: right.kind || null,
        leftSortKey: left.sortKey != null ? left.sortKey : null,
        rightSortKey: right.sortKey != null ? right.sortKey : null,
        leftTie: left.tie != null ? left.tie : null,
        rightTie: right.tie != null ? right.tie : null,
        leftBBox: leftBBox,
        rightBBox: rightBBox,
        overlapArea: overlap,
        expectedFront: (compareRenderablesByDomain(left, right) <= 0) ? (right.id || null) : (left.id || null),
        actualDrawOrder: { front: right.id || null, back: left.id || null }
      });
      conflictBudget += 1;
      if (conflictBudget >= 24) return;
    }
  }
}
