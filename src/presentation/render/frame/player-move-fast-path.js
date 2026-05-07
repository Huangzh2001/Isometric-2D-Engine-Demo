// P12a-3 owner: player move fast-path frame-order helpers.
// Loaded before render.js. This file intentionally owns only player move fast-path
// eligibility/runtime state and order construction.

var __playerMoveFastPathDiagState = {
  frameCount: 0,
  emittedCount: 0,
  lastSignature: '',
  lastPlayerInteractionCellKey: '',
  lastViewRotation: null,
  lastStaticOrderSignature: '',
  lastStaticRenderableCount: 0,
  lastDynamicRenderableCount: 0,
  warmStaticOrderAvailable: false
};


var __playerMoveFastPathRuntimeState = {
  staticRenderablesForSupportTop: null,
  staticOrderSignature: '',
  cacheSignature: '',
  geometrySignature: '',
  viewRotation: null,
  playerInteractionCellKey: '',
  cameraChunkSignature: '',
  chunkSize: 16,
  occupancyCacheVersion: null,
  staticRenderableCount: 0,
  visibleStaticPacketCount: 0,
  visibleChunkCount: 0,
  stableDemergeMode: '',
  stableDemergeSplitPacketCount: 0,
  stableDemergeCreatedFaceCount: 0,
  stableDemergeCacheHitCount: 0,
  stableDemergeCacheMissCount: 0,
  supportTopSortOverrideCount: 0,
  hitCount: 0,
  missCount: 0,
  emittedCount: 0,
  lastRuntimeSignature: '',
  lastRejectReasons: []
};

function getMainEditorModeForPlayerMoveFastPathDiag() {
  try {
    var selectors = (typeof App !== 'undefined' && App && App.state && App.state.selectors) ? App.state.selectors : null;
    if (selectors && typeof selectors.getEditorMode === 'function') return String(selectors.getEditorMode() || 'view');
  } catch (_) {}
  try {
    if (typeof editor !== 'undefined' && editor && editor.mode != null) return String(editor.mode || 'view');
  } catch (_) {}
  return 'view';
}

function getPlayerMoveFastPathStaticOrderSignature(order, currentViewRotation) {
  return requireRenderOrderCoreForRender().getRenderableStaticOrderSignature(
    order,
    currentViewRotation,
    normalizeMainEditorViewRotationValue
  );
}

function shouldEmitPlayerMoveFastPathDiag(signature, candidateEligible, rejectReasons) {
  __playerMoveFastPathDiagState.frameCount += 1;
  if (__playerMoveFastPathDiagState.emittedCount < 12) return true;
  if (__playerMoveFastPathDiagState.lastSignature !== signature) return true;
  if (candidateEligible === true && (__playerMoveFastPathDiagState.frameCount % 30) === 0) return true;
  if (rejectReasons && rejectReasons.length && (__playerMoveFastPathDiagState.frameCount % 90) === 0) return true;
  return false;
}

function emitPlayerMoveFastPathEligibilityDiagnostic(payload) {
  try {
    if (typeof detailLog === 'function') detailLog('[PLAYER-MOVE-FASTPATH-ELIGIBILITY] ' + JSON.stringify(payload || {}));
    else if (typeof pushLog === 'function') pushLog('[PLAYER-MOVE-FASTPATH-ELIGIBILITY] ' + JSON.stringify(payload || {}));
    else if (typeof console !== 'undefined' && console.log) console.log('[PLAYER-MOVE-FASTPATH-ELIGIBILITY]', payload || {});
  } catch (_) {}
}

function evaluatePlayerMoveFastPathEligibilityForRender(framePlanId, order, currentViewRotation, interactionState) {
  var stats = __lastMainRenderableBuildStats || {};
  var rejectReasons = [];
  var warnings = [];
  var editorModeValue = getMainEditorModeForPlayerMoveFastPathDiag();
  var playerObj = (typeof player !== 'undefined' && player && typeof player === 'object') ? player : null;
  var playerInteractionCellKey = playerObj ? buildStableLocalDemergeInteractionCellKey(playerObj) : 'none';
  var currentStaticOrderSignature = getPlayerMoveFastPathStaticOrderSignature(order, currentViewRotation);
  var staticOrderChanged = __playerMoveFastPathDiagState.lastStaticOrderSignature !== '' && __playerMoveFastPathDiagState.lastStaticOrderSignature !== currentStaticOrderSignature;
  var playerInteractionCellChanged = __playerMoveFastPathDiagState.lastPlayerInteractionCellKey !== '' && __playerMoveFastPathDiagState.lastPlayerInteractionCellKey !== playerInteractionCellKey;
  var viewRotationChanged = __playerMoveFastPathDiagState.lastViewRotation != null && Number(__playerMoveFastPathDiagState.lastViewRotation) !== Number(currentViewRotation);
  var dynamicRenderableCount = Number(stats.dynamicRenderableCount || 0);
  var staticRenderableCount = Number(stats.staticRenderableCount || 0);
  var orderLength = Array.isArray(order) ? order.length : 0;

  if (editorModeValue !== 'view') rejectReasons.push('editorModeNotView');
  if (typeof SHOW_PLAYER !== 'undefined' && SHOW_PLAYER !== true) rejectReasons.push('playerHidden');
  if (!playerObj) rejectReasons.push('playerMissing');
  if (dynamicRenderableCount !== 1) rejectReasons.push('dynamicRenderableCountNotOne');
  if (staticRenderableCount <= 0) rejectReasons.push('staticOrderEmpty');
  if (stats.staticCacheRebuiltThisFrame === true) rejectReasons.push('staticCacheRebuiltThisFrame');
  if (stats.occupancyRebuiltThisFrame === true) rejectReasons.push('occupancyRebuiltThisFrame');
  if (typeof isMainEditorViewAnimatingForRender === 'function' && isMainEditorViewAnimatingForRender()) rejectReasons.push('viewRotationAnimating');
  if (viewRotationChanged) rejectReasons.push('viewRotationChanged');
  if (playerInteractionCellChanged) rejectReasons.push('playerInteractionCellChanged');
  if (staticOrderChanged) warnings.push('staticOrderSignatureChanged');
  if (__playerMoveFastPathDiagState.warmStaticOrderAvailable !== true) rejectReasons.push('staticOrderCacheMissing');
  if (stats.staticCacheBuildMs != null && Number(stats.staticCacheBuildMs || 0) > 4) warnings.push('staticCacheBuildMsHigh');
  if (stats.staticPacketSortMs != null && Number(stats.staticPacketSortMs || 0) > 4) warnings.push('mergeSortedRenderablesHigh');

  var candidateEligible = rejectReasons.length === 0;
  var signature = [
    candidateEligible ? 'eligible' : 'blocked',
    rejectReasons.join(','),
    warnings.join(','),
    editorModeValue,
    playerInteractionCellKey,
    Number(currentViewRotation || 0),
    staticRenderableCount,
    dynamicRenderableCount,
    Number(stats.staticCacheRebuiltThisFrame === true ? 1 : 0),
    Number(stats.occupancyRebuiltThisFrame === true ? 1 : 0)
  ].join('|');

  var fastPathUsedThisFrame = stats.playerMoveFastPathUsed === true;
  var payload = {
    phase: fastPathUsedThisFrame ? 'step3-active' : 'step2-diagnostic-only',
    framePlanId: String(framePlanId || ''),
    implementedActive: fastPathUsedThisFrame,
    actuallyUsedThisFrame: fastPathUsedThisFrame,
    candidateEligible: candidateEligible,
    wouldUseFastPathIfImplemented: candidateEligible,
    rejectReasons: rejectReasons,
    warnings: warnings,
    editorMode: editorModeValue,
    currentViewRotation: normalizeMainEditorViewRotationValue(currentViewRotation),
    viewRotationChanged: viewRotationChanged,
    playerInteractionCellKey: playerInteractionCellKey,
    playerInteractionCellChanged: playerInteractionCellChanged,
    staticOrderCacheWarm: __playerMoveFastPathDiagState.warmStaticOrderAvailable === true,
    staticOrderSignatureChanged: staticOrderChanged,
    staticRenderableCount: staticRenderableCount,
    dynamicRenderableCount: dynamicRenderableCount,
    renderableCount: Number(orderLength || 0),
    visibleStaticPacketCount: Number(stats.visibleStaticPacketCount || 0),
    visibleChunkCount: Number(stats.visibleChunkCount || 0),
    staticCacheRebuiltThisFrame: stats.staticCacheRebuiltThisFrame === true,
    occupancyRebuiltThisFrame: stats.occupancyRebuiltThisFrame === true,
    staticCacheBuildMs: Number(stats.staticCacheBuildMs || 0),
    frameBuildMs: Number(stats.frameBuildMs || 0),
    mergeSortedRenderablesMs: Number(stats.staticPacketSortMs || 0),
    stableDemergePlayerInteractionCellKey: String(stats.stableDemergePlayerInteractionCellKey || playerInteractionCellKey),
    stableDemergeCacheHit: stats.stableDemergeCacheHit === true,
    stableDemergeCacheHitCount: Number(stats.stableDemergeCacheHitCount || 0),
    stableDemergeCacheMissCount: Number(stats.stableDemergeCacheMissCount || 0),
    stableDemergeSplitPacketCount: Number(stats.stableDemergeSplitPacketCount || 0),
    stableDemergeCreatedFaceCount: Number(stats.stableDemergeCreatedFaceCount || 0),
    interactionStateActive: !!interactionState,
    playerMoveFastPathHitCount: Number(stats.playerMoveFastPathHitCount || 0),
    playerMoveFastPathMissCount: Number(stats.playerMoveFastPathMissCount || 0),
    playerMoveFastPathRejectReasons: Array.isArray(stats.playerMoveFastPathRejectReasons) ? stats.playerMoveFastPathRejectReasons.slice(0, 8) : []
  };

  if (shouldEmitPlayerMoveFastPathDiag(signature, candidateEligible, rejectReasons)) {
    __playerMoveFastPathDiagState.emittedCount += 1;
    __playerMoveFastPathDiagState.lastSignature = signature;
    emitPlayerMoveFastPathEligibilityDiagnostic(payload);
  }

  __playerMoveFastPathDiagState.lastPlayerInteractionCellKey = playerInteractionCellKey;
  __playerMoveFastPathDiagState.lastViewRotation = normalizeMainEditorViewRotationValue(currentViewRotation);
  __playerMoveFastPathDiagState.lastStaticOrderSignature = currentStaticOrderSignature;
  __playerMoveFastPathDiagState.lastStaticRenderableCount = staticRenderableCount;
  __playerMoveFastPathDiagState.lastDynamicRenderableCount = dynamicRenderableCount;
  __playerMoveFastPathDiagState.warmStaticOrderAvailable = staticRenderableCount > 0 && dynamicRenderableCount === 1 && stats.staticCacheRebuiltThisFrame !== true && stats.occupancyRebuiltThisFrame !== true;
  return payload;
}


function buildPlayerMoveFastPathCameraChunkSignature(cameraScope, chunkSize) {
  var scope = cameraScope && typeof cameraScope === 'object' ? cameraScope : null;
  var bounds = scope && scope.cullingWorldBounds ? scope.cullingWorldBounds : null;
  var size = Math.max(1, Math.round(Number(chunkSize || 16) || 16));
  if (!bounds) return 'none';
  var minX = Number(bounds.minX != null ? bounds.minX : bounds.x0 != null ? bounds.x0 : bounds.left != null ? bounds.left : 0);
  var maxX = Number(bounds.maxX != null ? bounds.maxX : bounds.x1 != null ? bounds.x1 : bounds.right != null ? bounds.right : minX);
  var minY = Number(bounds.minY != null ? bounds.minY : bounds.y0 != null ? bounds.y0 : bounds.top != null ? bounds.top : 0);
  var maxY = Number(bounds.maxY != null ? bounds.maxY : bounds.y1 != null ? bounds.y1 : bounds.bottom != null ? bounds.bottom : minY);
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) return 'invalid';
  return [
    Math.floor(minX / size),
    Math.floor(maxX / size),
    Math.floor(minY / size),
    Math.floor(maxY / size),
    Number(scope && scope.zoom != null ? scope.zoom : 1),
    scope && scope.cameraCullingEnabled === false ? 0 : 1,
    scope && scope.surfaceOnlyRenderingEnabled === false ? 0 : 1
  ].join('|');
}

function buildPlayerAvatarRenderableForFastPath(viewRotation, cameraScope) {
  if (typeof SHOW_PLAYER !== 'undefined' && SHOW_PLAYER !== true) return null;
  var playerObj = (typeof player !== 'undefined' && player && typeof player === 'object') ? player : null;
  if (!playerObj) return null;
  if (cameraScope && !pointWithinWorldBoundsXY(playerObj.x, playerObj.y, cameraScope.cullingWorldBounds)) return null;
  var normalizedViewRotation = normalizeMainEditorViewRotationValue(viewRotation);
  var playerZ = Number(playerObj && playerObj.z != null ? playerObj.z : 0);
  var domainApi = getDomainSceneCoreApi();
  var playerSortMeta = (domainApi && typeof domainApi.computePlayerActorRenderableSort === 'function')
    ? domainApi.computePlayerActorRenderableSort({ player: playerObj, viewRotation: normalizedViewRotation })
    : Object.assign({ tie: 700000 }, computeViewAwareSortMeta({ x: playerObj.x, y: playerObj.y, z: playerZ }, 0, normalizedViewRotation));
  return {
    id: 'player-avatar',
    kind: 'player-avatar',
    sortMode: 'player-foot-anchor',
    sortKey: Number(playerSortMeta.sortKey || 0),
    tie: Number(playerSortMeta.tie || 0),
    depthAnchor: playerSortMeta.depthAnchor || { x: Number(playerObj.x || 0), y: Number(playerObj.y || 0), z: playerZ },
    worldX: Number(playerObj.x || 0),
    worldY: Number(playerObj.y || 0),
    worldZ: playerZ,
    playerMoveFastPathDynamic: true,
    draw: () => drawPlayerAvatar(),
  };
}

function insertSingleDynamicRenderableIntoSortedOrder(staticRenderables, dynamicRenderable) {
  return requireRenderOrderCoreForRender().insertRenderableIntoSortedOrder(
    staticRenderables,
    dynamicRenderable,
    compareRenderablesByDomain
  );
}

function sortRenderablesByOrderForRender(renderables) {
  return requireRenderOrderCoreForRender().sortRenderablesByOrder(
    renderables,
    compareRenderablesByDomain
  );
}

function emitPlayerMoveFastPathRuntimeDiagnostic(payload, forceLog) {
  try {
    var safe = payload && typeof payload === 'object' ? payload : {};
    var signature = [
      safe.used === true ? 'used' : 'blocked',
      Array.isArray(safe.rejectReasons) ? safe.rejectReasons.join(',') : '',
      String(safe.playerInteractionCellKey || ''),
      String(safe.cameraChunkSignature || ''),
      Number(safe.staticRenderableCount || 0),
      Number(safe.visibleChunkCount || 0)
    ].join('|');
    if (!forceLog && __playerMoveFastPathRuntimeState.emittedCount >= 12 && __playerMoveFastPathRuntimeState.lastRuntimeSignature === signature) return false;
    __playerMoveFastPathRuntimeState.emittedCount += 1;
    __playerMoveFastPathRuntimeState.lastRuntimeSignature = signature;
    var line = '[PLAYER-MOVE-FASTPATH-RUNTIME] ' + JSON.stringify(safe);
    if (typeof detailLog === 'function') detailLog(line);
    else if (typeof pushLog === 'function') pushLog(line);
    else if (typeof console !== 'undefined' && console.log) console.log(line);
    return true;
  } catch (_) { return false; }
}

function getStaticWorldChunkCacheSummaryForPlayerFastPath() {
  try {
    var api = getSharedStaticWorldChunkCacheApiForRender();
    if (api && typeof api.summarize === 'function') return api.summarize('player-move-fastpath-precheck') || null;
  } catch (_) {}
  return null;
}

function updatePlayerMoveFastPathStaticOrderCacheForRender(options) {
  var opts = options && typeof options === 'object' ? options : {};
  var staticBase = Array.isArray(opts.staticRenderablesForSupportTop) ? opts.staticRenderablesForSupportTop : [];
  var currentViewRotation = normalizeMainEditorViewRotationValue(opts.viewRotation);
  var playerObj = (typeof player !== 'undefined' && player && typeof player === 'object') ? player : null;
  var dynamicRenderableCount = Number(opts.dynamicRenderableCount || 0);
  if (!staticBase.length || !playerObj || dynamicRenderableCount !== 1) return false;
  var cameraScope = opts.cameraScope || null;
  var surfaceStats = opts.surfaceStats || {};
  var chunkSize = Number(surfaceStats.chunkSize || staticBoxRenderCache && staticBoxRenderCache.surfaceStats && staticBoxRenderCache.surfaceStats.chunkSize || 16);
  var playerInteractionCellKey = buildStableLocalDemergeInteractionCellKey(playerObj);
  __playerMoveFastPathRuntimeState.staticRenderablesForSupportTop = staticBase.slice();
  __playerMoveFastPathRuntimeState.staticOrderSignature = getPlayerMoveFastPathStaticOrderSignature(staticBase, currentViewRotation);
  __playerMoveFastPathRuntimeState.cacheSignature = String(staticBoxRenderCache && staticBoxRenderCache.cacheSignature || buildStaticWorldRenderSignature(currentViewRotation));
  __playerMoveFastPathRuntimeState.geometrySignature = String(staticBoxRenderCache && staticBoxRenderCache.geometrySignature || '');
  __playerMoveFastPathRuntimeState.viewRotation = currentViewRotation;
  __playerMoveFastPathRuntimeState.playerInteractionCellKey = playerInteractionCellKey;
  __playerMoveFastPathRuntimeState.cameraChunkSignature = buildPlayerMoveFastPathCameraChunkSignature(cameraScope, chunkSize);
  __playerMoveFastPathRuntimeState.chunkSize = Math.max(1, Math.round(chunkSize || 16));
  __playerMoveFastPathRuntimeState.occupancyCacheVersion = opts.occupancyCacheVersion != null ? Number(opts.occupancyCacheVersion || 0) : (staticBoxRenderCache && staticBoxRenderCache.occupancyCacheVersion != null ? Number(staticBoxRenderCache.occupancyCacheVersion || 0) : null);
  __playerMoveFastPathRuntimeState.staticRenderableCount = staticBase.length;
  __playerMoveFastPathRuntimeState.visibleStaticPacketCount = Number(surfaceStats.visibleStaticPacketCount || staticBase.length || 0);
  __playerMoveFastPathRuntimeState.visibleChunkCount = Number(surfaceStats.visibleChunkCount || 0);
  __playerMoveFastPathRuntimeState.stableDemergeMode = String(opts.stableDemergeResult && opts.stableDemergeResult.mode || 'none');
  __playerMoveFastPathRuntimeState.stableDemergeSplitPacketCount = Number(opts.stableDemergeResult && opts.stableDemergeResult.splitPacketCount || 0);
  __playerMoveFastPathRuntimeState.stableDemergeCreatedFaceCount = Number(opts.stableDemergeResult && opts.stableDemergeResult.createdFaceCount || 0);
  __playerMoveFastPathRuntimeState.stableDemergeCacheHitCount = Number(opts.stableDemergeResult && opts.stableDemergeResult.cacheHitCount || 0);
  __playerMoveFastPathRuntimeState.stableDemergeCacheMissCount = Number(opts.stableDemergeResult && opts.stableDemergeResult.cacheMissCount || 0);
  __playerMoveFastPathRuntimeState.supportTopSortOverrideCount = Number(opts.supportTopSortResult && opts.supportTopSortResult.overrideCount || 0);
  return true;
}

function tryBuildPlayerMoveFastPathFrameOrderForRender(framePlanId, currentViewRotation, interactionState) {
  var startAt = perfNow();
  var rejectReasons = [];
  var warnings = [];
  var cache = __playerMoveFastPathRuntimeState || {};
  var normalizedViewRotation = normalizeMainEditorViewRotationValue(currentViewRotation);
  var editorModeValue = getMainEditorModeForPlayerMoveFastPathDiag();
  var playerObj = (typeof player !== 'undefined' && player && typeof player === 'object') ? player : null;
  var playerInteractionCellKey = playerObj ? buildStableLocalDemergeInteractionCellKey(playerObj) : 'none';

  if (editorModeValue !== 'view') rejectReasons.push('editorModeNotView');
  if (typeof SHOW_PLAYER !== 'undefined' && SHOW_PLAYER !== true) rejectReasons.push('playerHidden');
  if (!playerObj) rejectReasons.push('playerMissing');
  if (!Array.isArray(cache.staticRenderablesForSupportTop) || !cache.staticRenderablesForSupportTop.length) rejectReasons.push('staticOrderCacheMissing');
  if (cache.viewRotation == null || Number(cache.viewRotation) !== Number(normalizedViewRotation)) rejectReasons.push('viewRotationChanged');
  if (cache.playerInteractionCellKey && cache.playerInteractionCellKey !== playerInteractionCellKey) rejectReasons.push('playerInteractionCellChanged');
  if (typeof isMainEditorViewAnimatingForRender === 'function' && isMainEditorViewAnimatingForRender()) rejectReasons.push('viewRotationAnimating');

  var currentSignature = '';
  try { currentSignature = String(buildStaticWorldRenderSignature(normalizedViewRotation)); } catch (_) { currentSignature = ''; }
  if (cache.cacheSignature && currentSignature && cache.cacheSignature !== currentSignature) rejectReasons.push('staticRenderSignatureChanged');
  if (staticBoxRenderCache && staticBoxRenderCache.cacheSignature && currentSignature && String(staticBoxRenderCache.cacheSignature) !== currentSignature) rejectReasons.push('staticCacheSignatureStale');
  if (staticBoxRenderCache && cache.geometrySignature && String(staticBoxRenderCache.geometrySignature || '') !== String(cache.geometrySignature || '')) rejectReasons.push('staticGeometrySignatureChanged');
  if (staticBoxRenderCache && staticBoxRenderCache.dirtyGeometry === true) rejectReasons.push('staticDirtyGeometry');
  if (staticBoxRenderCache && staticBoxRenderCache.dirtyLighting === true) rejectReasons.push('staticDirtyLighting');

  var sceneStaticWorldApi = getSceneStaticWorldCacheApiForRender();
  var sceneSnapshot = null;
  try { sceneSnapshot = sceneStaticWorldApi && typeof sceneStaticWorldApi.getSnapshot === 'function' ? sceneStaticWorldApi.getSnapshot() : null; } catch (_) { sceneSnapshot = null; }
  if (sceneSnapshot && Array.isArray(sceneSnapshot.dirtyChunkKeys) && sceneSnapshot.dirtyChunkKeys.length > 0) rejectReasons.push('sceneDirtyChunks');
  if (sceneSnapshot && cache.geometrySignature && sceneSnapshot.cacheVersion != null && String(sceneSnapshot.cacheVersion) !== String(cache.geometrySignature)) rejectReasons.push('sceneCacheVersionChanged');

  var chunkCacheSummary = getStaticWorldChunkCacheSummaryForPlayerFastPath();
  if (chunkCacheSummary && Number(chunkCacheSummary.dirtyChunkCount || 0) > 0) rejectReasons.push('staticChunkCacheDirty');

  var cameraScope = getMainCameraRenderScope(normalizedViewRotation);
  var cameraChunkSignature = buildPlayerMoveFastPathCameraChunkSignature(cameraScope, cache.chunkSize || 16);
  if (cache.cameraChunkSignature && cache.cameraChunkSignature !== cameraChunkSignature) rejectReasons.push('visibleChunkWindowChanged');

  var playerRenderable = null;
  if (!rejectReasons.length) {
    playerRenderable = buildPlayerAvatarRenderableForFastPath(normalizedViewRotation, cameraScope);
    if (!playerRenderable) rejectReasons.push('playerRenderableMissingOrCulled');
  }

  if (rejectReasons.length) {
    cache.missCount += 1;
    cache.lastRejectReasons = rejectReasons.slice();
    emitPlayerMoveFastPathRuntimeDiagnostic({
      phase: 'step3-active-guarded',
      framePlanId: String(framePlanId || ''),
      used: false,
      rejectReasons: rejectReasons,
      warnings: warnings,
      editorMode: editorModeValue,
      playerInteractionCellKey: playerInteractionCellKey,
      cameraChunkSignature: cameraChunkSignature,
      cachedCameraChunkSignature: String(cache.cameraChunkSignature || ''),
      staticRenderableCount: Number(cache.staticRenderableCount || 0),
      visibleChunkCount: Number(cache.visibleChunkCount || 0),
      hitCount: Number(cache.hitCount || 0),
      missCount: Number(cache.missCount || 0)
    }, cache.missCount <= 8);
    return { used: false, rejectReasons: rejectReasons, warnings: warnings };
  }

  var supportTopStartAt = perfNow();
  var supportTopSortResult = applyPlayerSupportTopSortOverrideToRenderables(cache.staticRenderablesForSupportTop, playerObj, normalizedViewRotation);
  var supportTopSortMs = Math.max(0, perfNow() - supportTopStartAt);
  var staticRenderables = supportTopSortResult && Array.isArray(supportTopSortResult.staticRenderables) ? supportTopSortResult.staticRenderables : cache.staticRenderablesForSupportTop;
  var insertStartAt = perfNow();
  var order = insertSingleDynamicRenderableIntoSortedOrder(staticRenderables, playerRenderable);
  var insertMs = Math.max(0, perfNow() - insertStartAt);
  var totalMs = Math.max(0, perfNow() - startAt);
  cache.hitCount += 1;
  cache.lastRejectReasons = [];

  __lastMainRenderableBuildStats = Object.assign({}, __lastMainRenderableBuildStats || {}, {
    frameBuildMs: Number(totalMs.toFixed ? totalMs.toFixed(3) : totalMs),
    staticBuildMs: 0,
    dynamicBuildMs: Number(insertMs.toFixed ? insertMs.toFixed(3) : insertMs),
    renderSourceBuildMs: Number(totalMs.toFixed ? totalMs.toFixed(3) : totalMs),
    visibilityFilterMs: 0,
    staticRenderableCount: Number(staticRenderables.length || 0),
    dynamicRenderableCount: 1,
    renderableCount: Number(order.length || 0),
    renderablesBeforeCulling: Number(order.length || 0),
    renderablesAfterCulling: Number(order.length || 0),
    objectsBeforeCulling: Number(order.length || 0),
    objectsAfterCulling: Number(order.length || 0),
    worldObjectCount: Number(order.length || 0),
    visibleSurfaceCount: Number(cache.visibleStaticPacketCount || staticRenderables.length || 0),
    hiddenInternalSurfaceSkippedCount: Number(__lastMainRenderableBuildStats && __lastMainRenderableBuildStats.hiddenInternalSurfaceSkippedCount || 0),
    totalBoxes: Number(boxes && boxes.length || 0),
    totalInstancesForSplit: Number(instances && instances.length || 0),
    visibleInstanceCount: Number(__lastMainRenderableBuildStats && __lastMainRenderableBuildStats.visibleInstanceCount || 0),
    visibleDynamicInstanceCount: 0,
    visibleInstances: Number(__lastMainRenderableBuildStats && __lastMainRenderableBuildStats.visibleInstances || 0),
    staticSkippedByDynamicLoop: Number(__lastMainRenderableBuildStats && __lastMainRenderableBuildStats.staticSkippedByDynamicLoop || 0),
    visibleChunkCount: Number(cache.visibleChunkCount || 0),
    visibleStaticPacketCount: Number(cache.visibleStaticPacketCount || staticRenderables.length || 0),
    rebuiltChunkCountThisFrame: 0,
    reusedChunkCountThisFrame: Number(__lastMainRenderableBuildStats && __lastMainRenderableBuildStats.reusedChunkCountThisFrame || 0),
    staticCacheRebuiltThisFrame: false,
    occupancyRebuiltThisFrame: false,
    staticCacheBuildMs: 0,
    staticPacketMergeMs: 0,
    staticPacketProjectMs: 0,
    staticPacketSortMs: Number(insertMs.toFixed ? insertMs.toFixed(3) : insertMs),
    staticPacketDrawPrepMs: 0,
    stableDemergeMode: String(cache.stableDemergeMode || 'cached'),
    stableDemergeSplitPacketCount: Number(cache.stableDemergeSplitPacketCount || 0),
    stableDemergeCreatedFaceCount: Number(cache.stableDemergeCreatedFaceCount || 0),
    stableDemergePlayerInteractionCellKey: String(playerInteractionCellKey || ''),
    stableDemergeCacheHit: true,
    stableDemergeCacheHitCount: Number(cache.stableDemergeCacheHitCount || 0),
    stableDemergeCacheMissCount: Number(cache.stableDemergeCacheMissCount || 0),
    playerMoveFastPathUsed: true,
    playerMoveFastPathHitCount: Number(cache.hitCount || 0),
    playerMoveFastPathMissCount: Number(cache.missCount || 0),
    playerMoveFastPathRejectReasons: [],
    playerMoveFastPathSupportTopSortMs: Number(supportTopSortMs.toFixed ? supportTopSortMs.toFixed(3) : supportTopSortMs),
    playerMoveFastPathInsertMs: Number(insertMs.toFixed ? insertMs.toFixed(3) : insertMs),
    playerMoveFastPathCellKey: String(playerInteractionCellKey || ''),
    cameraCullingEnabled: cameraScope && cameraScope.cameraCullingEnabled !== false,
    zoom: Number(cameraScope && cameraScope.zoom || getMainEditorZoomValueForRender())
  });
  recordRenderFunctionTiming('render.buildMainFrameRenderables.playerMoveFastPath', totalMs, {
    framePlanId: String(framePlanId || ''),
    staticRenderableCount: Number(staticRenderables.length || 0),
    dynamicRenderableCount: 1,
    supportTopSortMs: Number(supportTopSortMs.toFixed ? supportTopSortMs.toFixed(3) : supportTopSortMs),
    playerInsertMs: Number(insertMs.toFixed ? insertMs.toFixed(3) : insertMs),
    hitCount: Number(cache.hitCount || 0)
  });
  emitPlayerMoveFastPathRuntimeDiagnostic({
    phase: 'step3-active-guarded',
    framePlanId: String(framePlanId || ''),
    used: true,
    rejectReasons: [],
    warnings: warnings,
    playerInteractionCellKey: playerInteractionCellKey,
    cameraChunkSignature: cameraChunkSignature,
    staticRenderableCount: Number(staticRenderables.length || 0),
    visibleStaticPacketCount: Number(cache.visibleStaticPacketCount || staticRenderables.length || 0),
    visibleChunkCount: Number(cache.visibleChunkCount || 0),
    supportTopSortMs: Number(supportTopSortMs.toFixed ? supportTopSortMs.toFixed(3) : supportTopSortMs),
    playerInsertMs: Number(insertMs.toFixed ? insertMs.toFixed(3) : insertMs),
    totalMs: Number(totalMs.toFixed ? totalMs.toFixed(3) : totalMs),
    hitCount: Number(cache.hitCount || 0),
    missCount: Number(cache.missCount || 0)
  }, cache.hitCount <= 8 || (cache.hitCount % 60) === 0);
  return {
    used: true,
    order: order,
    rejectReasons: [],
    warnings: warnings,
    frameBuildMs: totalMs,
    supportTopSortMs: supportTopSortMs,
    insertMs: insertMs,
    cameraScope: cameraScope
  };
}
