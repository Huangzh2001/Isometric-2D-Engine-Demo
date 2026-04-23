(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/presentation/render/static-world-cache.js';

  function perfNow() {
    try {
      if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') return performance.now();
    } catch (_) {}
    return Date.now();
  }

  function safeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function cloneJsonSafe(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function getRuntimeStateApi() {
    try {
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath('state.runtimeState') || null;
      }
    } catch (_) {}
    try {
      return window.App && window.App.state ? window.App.state.runtimeState || null : null;
    } catch (_) {}
    return null;
  }

  function getChunkSizeFromRuntime(fallback) {
    var size = Number(fallback || 16);
    try {
      var runtimeApi = getRuntimeStateApi();
      if (runtimeApi && typeof runtimeApi.getTerrainRuntimeModelValue === 'function') {
        var model = runtimeApi.getTerrainRuntimeModelValue();
        if (model && Number(model.chunkSize) > 0) size = Number(model.chunkSize);
      } else if (runtimeApi && runtimeApi.terrainLogic && Number(runtimeApi.terrainLogic.chunkSize) > 0) {
        size = Number(runtimeApi.terrainLogic.chunkSize);
      }
    } catch (_) {}
    return Math.max(1, Math.round(size) || 16);
  }

  function getChunkKey(chunkX, chunkY) {
    return String(chunkX) + ',' + String(chunkY);
  }

  function parseChunkKey(key) {
    var parts = String(key || '0,0').split(',');
    return {
      chunkX: Math.round(Number(parts[0]) || 0),
      chunkY: Math.round(Number(parts[1]) || 0)
    };
  }

  function getChunkCoordsForPoint(x, y, chunkSize) {
    var size = Math.max(1, Math.round(Number(chunkSize) || 16));
    return {
      chunkX: Math.floor((Number(x) || 0) / size),
      chunkY: Math.floor((Number(y) || 0) / size)
    };
  }

  function getPrimaryChunkKeyForBox(box, chunkSize) {
    var coords = getChunkCoordsForPoint(box && box.x, box && box.y, chunkSize);
    return getChunkKey(coords.chunkX, coords.chunkY);
  }

  function getChunkBounds(chunkKey, chunkSize) {
    var parsed = parseChunkKey(chunkKey);
    var size = Math.max(1, Math.round(Number(chunkSize) || 16));
    return {
      minX: parsed.chunkX * size,
      minY: parsed.chunkY * size,
      maxX: (parsed.chunkX + 1) * size,
      maxY: (parsed.chunkY + 1) * size
    };
  }

  function buildStaticWorldBoxSignature(box) {
    if (!box || typeof box !== 'object') return '';
    return [
      box.instanceId || '',
      box.prefabId || '',
      box.generatedBy || '',
      safeNumber(box.x, 0),
      safeNumber(box.y, 0),
      safeNumber(box.z, 0),
      Math.max(1, safeNumber(box.w, 1)),
      Math.max(1, safeNumber(box.d, 1)),
      Math.max(1, safeNumber(box.h, 1)),
      box.base || '',
      safeNumber(box.rotation, 0),
      box.renderUpdateMode || '',
      box.terrainBatchId || '',
      box.terrainCellX != null ? safeNumber(box.terrainCellX, 0) : '',
      box.terrainCellY != null ? safeNumber(box.terrainCellY, 0) : '',
      box.localIndex != null ? safeNumber(box.localIndex, 0) : ''
    ].join('|');
  }

  function createChunkEntry(chunkKey, chunkSize) {
    var parsed = parseChunkKey(chunkKey);
    return {
      key: chunkKey,
      chunkX: parsed.chunkX,
      chunkY: parsed.chunkY,
      bounds: getChunkBounds(chunkKey, chunkSize),
      boxKeys: new Set(),
      boxMap: new Map(),
      cachedPackets: [],
      renderSignature: '',
      dirtyGeometry: true,
      lastBuiltAt: 0,
      lastStats: null
    };
  }

  var state = {
    chunkSize: getChunkSizeFromRuntime(16),
    initialized: false,
    sceneCacheVersion: 0,
    chunks: new Map(),
    boxSignatureToChunkKey: new Map(),
    totalStaticBoxes: 0,
    totalStaticRenderables: 0,
    lastSceneSync: null,
    lastFrameSummary: null,
    lastVisibleChunkKeys: [],
    dirtyChunkKeys: new Set(),
    rebuildBudgetMode: 'count',
    rebuildBudgetValue: 1,
    lastSchedulerSummary: null,
    lastRenderSignature: ''
  };

  function resetState(reason, chunkSize) {
    state.chunkSize = Math.max(1, Math.round(Number(chunkSize) || getChunkSizeFromRuntime(16)));
    state.initialized = false;
    state.sceneCacheVersion = 0;
    state.chunks = new Map();
    state.boxSignatureToChunkKey = new Map();
    state.totalStaticBoxes = 0;
    state.totalStaticRenderables = 0;
    state.lastSceneSync = {
      reason: String(reason || 'reset'),
      atMs: Number(perfNow().toFixed ? perfNow().toFixed(3) : perfNow())
    };
    state.lastFrameSummary = null;
    state.lastVisibleChunkKeys = [];
    state.dirtyChunkKeys = new Set();
    state.lastRenderSignature = '';
    return state;
  }

  function ensureChunk(chunkKey, chunkSize) {
    var key = String(chunkKey || '0,0');
    var size = Math.max(1, Math.round(Number(chunkSize) || state.chunkSize || 16));
    if (!state.chunks.has(key)) state.chunks.set(key, createChunkEntry(key, size));
    return state.chunks.get(key);
  }

  function collectNeighborBoxesForChunkKey(chunkKey) {
    var parsed = parseChunkKey(chunkKey);
    var out = [];
    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        var neighborKey = getChunkKey(parsed.chunkX + dx, parsed.chunkY + dy);
        if (neighborKey === String(chunkKey || '')) continue;
        var neighbor = state.chunks.get(neighborKey);
        if (!neighbor || !neighbor.boxMap || typeof neighbor.boxMap.forEach !== 'function') continue;
        neighbor.boxMap.forEach(function (box) { if (box) out.push(box); });
      }
    }
    return out;
  }

  function collectNeighborContextForChunkKey(chunkKey) {
    var parsed = parseChunkKey(chunkKey);
    var boxes = [];
    var keys = [String(chunkKey || '')];
    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        var neighborKey = getChunkKey(parsed.chunkX + dx, parsed.chunkY + dy);
        if (neighborKey === String(chunkKey || '')) continue;
        var neighbor = state.chunks.get(neighborKey);
        if (!neighbor || !neighbor.boxMap || typeof neighbor.boxMap.forEach !== 'function') continue;
        keys.push(neighborKey);
        neighbor.boxMap.forEach(function (box) { if (box) boxes.push(box); });
      }
    }
    return { neighborBoxes: boxes, touchedChunkKeys: keys };
  }

  function markChunkDirty(chunkKey) {
    var key = String(chunkKey || '0,0');
    var chunk = ensureChunk(key, state.chunkSize);
    chunk.dirtyGeometry = true;
    state.dirtyChunkKeys.add(key);
    return chunk;
  }

  function addStaticBox(box) {
    var signature = buildStaticWorldBoxSignature(box);
    if (!signature) return null;
    var chunkKey = getPrimaryChunkKeyForBox(box, state.chunkSize);
    var chunk = ensureChunk(chunkKey, state.chunkSize);
    chunk.boxKeys.add(signature);
    chunk.boxMap.set(signature, box);
    state.boxSignatureToChunkKey.set(signature, chunkKey);
    state.totalStaticBoxes = state.boxSignatureToChunkKey.size;
    return { signature: signature, chunkKey: chunkKey, chunk: chunk };
  }

  function removeStaticBoxBySignature(signature) {
    var sig = String(signature || '');
    if (!sig) return null;
    var chunkKey = state.boxSignatureToChunkKey.get(sig);
    if (!chunkKey) return null;
    var chunk = state.chunks.get(chunkKey) || null;
    if (chunk) {
      chunk.boxKeys.delete(sig);
      chunk.boxMap.delete(sig);
      chunk.dirtyGeometry = true;
    }
    state.boxSignatureToChunkKey.delete(sig);
    state.totalStaticBoxes = state.boxSignatureToChunkKey.size;
    return { signature: sig, chunkKey: chunkKey, chunk: chunk };
  }

  function applyFullRebuild(boxes, options) {
    var opts = options && typeof options === 'object' ? options : {};
    resetState(opts.reason || 'scene-full-rebuild', opts.chunkSize || getChunkSizeFromRuntime(16));
    var list = Array.isArray(boxes) ? boxes : [];
    for (var i = 0; i < list.length; i++) {
      var added = addStaticBox(list[i]);
      if (added && added.chunkKey) state.dirtyChunkKeys.add(added.chunkKey);
    }
    state.initialized = true;
    state.sceneCacheVersion = Math.max(0, Math.round(Number(opts.sceneCacheVersion) || 0));
    state.lastRenderSignature = '';
    state.lastSceneSync = {
      mode: 'full-rebuild',
      reason: String(opts.reason || 'scene-full-rebuild'),
      chunkSize: state.chunkSize,
      sceneCacheVersion: state.sceneCacheVersion,
      totalStaticBoxes: state.totalStaticBoxes,
      dirtyChunkCount: state.dirtyChunkKeys.size,
      durationMs: Number(Math.max(0, safeNumber(opts.durationMs, 0)).toFixed ? Math.max(0, safeNumber(opts.durationMs, 0)).toFixed(3) : safeNumber(opts.durationMs, 0))
    };
    return summarizeState('full-rebuild');
  }

  function applyIncrementalUpdate(update) {
    var payload = update && typeof update === 'object' ? update : {};
    var addedBoxes = Array.isArray(payload.addedBoxes) ? payload.addedBoxes : [];
    var removedBoxes = Array.isArray(payload.removedBoxes) ? payload.removedBoxes : [];
    for (var i = 0; i < removedBoxes.length; i++) {
      var removedSignature = buildStaticWorldBoxSignature(removedBoxes[i]);
      if (!removedSignature) continue;
      var removed = removeStaticBoxBySignature(removedSignature);
      if (removed && removed.chunkKey) state.dirtyChunkKeys.add(removed.chunkKey);
    }
    for (var j = 0; j < addedBoxes.length; j++) {
      var added = addStaticBox(addedBoxes[j]);
      if (added && added.chunkKey) state.dirtyChunkKeys.add(added.chunkKey);
    }
    var affected = Array.isArray(payload.affectedChunkKeys) ? payload.affectedChunkKeys : [];
    for (var k = 0; k < affected.length; k++) markChunkDirty(affected[k]);
    state.initialized = true;
    state.sceneCacheVersion = Math.max(state.sceneCacheVersion, Math.max(0, Math.round(Number(payload.cacheVersion) || 0)));
    state.lastSceneSync = {
      mode: String(payload.mode || 'incremental'),
      reason: String(payload.reason || 'scene-change'),
      chunkSize: state.chunkSize,
      sceneCacheVersion: state.sceneCacheVersion,
      affectedChunkKeys: affected.slice(),
      dirtyChunkCount: state.dirtyChunkKeys.size,
      addedBoxCount: addedBoxes.length,
      removedBoxCount: removedBoxes.length,
      updatedBoxCount: Math.max(0, Math.round(Number(payload.updatedBoxCount) || (addedBoxes.length + removedBoxes.length))),
      durationMs: Number(Math.max(0, safeNumber(payload.durationMs, 0)).toFixed ? Math.max(0, safeNumber(payload.durationMs, 0)).toFixed(3) : safeNumber(payload.durationMs, 0))
    };
    return summarizeState('incremental-update');
  }

  function summarizeState(label) {
    return {
      owner: OWNER,
      label: String(label || ''),
      chunkSize: state.chunkSize,
      initialized: state.initialized === true,
      sceneCacheVersion: state.sceneCacheVersion,
      totalChunkCount: state.chunks.size,
      dirtyChunkCount: state.dirtyChunkKeys.size,
      totalStaticBoxes: state.totalStaticBoxes,
      totalStaticRenderables: state.totalStaticRenderables,
      cacheContentType: 'world-face-packets',
      cameraIndependent: true,
      usesScreenSpaceCache: false,
      rebuildBudgetMode: state.rebuildBudgetMode,
      rebuildBudgetValue: state.rebuildBudgetValue,
      lastSchedulerSummary: cloneJsonSafe(state.lastSchedulerSummary),
      lastSceneSync: cloneJsonSafe(state.lastSceneSync),
      lastFrameSummary: cloneJsonSafe(state.lastFrameSummary)
    };
  }

  function isDetailedTerrainProfilingEnabledForStaticWorld() {
    try {
      var runtimeApi = window.App && window.App.state ? window.App.state.runtimeState || null : null;
      if (runtimeApi && typeof runtimeApi.getTerrainGeneratorSettingsValue === 'function') {
        var settings = runtimeApi.getTerrainGeneratorSettingsValue();
        return !!(settings && settings.terrainDetailedProfilingEnabled === true);
      }
    } catch (_) {}
    return false;
  }

  function emitStaticChunkRebuildScheduler(payload) {
    var line = '[STATIC-CHUNK-REBUILD-SCHEDULER] ';
    try { line += JSON.stringify(payload || {}); } catch (_) { line += '{}'; }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function emitChunkCacheSchedulerDetail(payload) {
    if (!isDetailedTerrainProfilingEnabledForStaticWorld()) return null;
    var line = '[CHUNK-CACHE-SCHEDULER-DETAIL] ';
    try { line += JSON.stringify(payload || {}); } catch (_) { line += '{}'; }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function computeVisibleChunkKeys(scope) {
    if (!scope || scope.cameraCullingEnabled === false || !scope.cullingWorldBounds) return Array.from(state.chunks.keys());
    var bounds = scope.cullingWorldBounds;
    var paddingChunks = 1;
    var size = state.chunkSize;
    var minChunkX = Math.floor((safeNumber(bounds.minX, 0) - paddingChunks * size) / size);
    var minChunkY = Math.floor((safeNumber(bounds.minY, 0) - paddingChunks * size) / size);
    var maxChunkX = Math.floor((safeNumber(bounds.maxX, 0) + paddingChunks * size - 1) / size);
    var maxChunkY = Math.floor((safeNumber(bounds.maxY, 0) + paddingChunks * size - 1) / size);
    var out = [];
    for (var cx = minChunkX; cx <= maxChunkX; cx++) {
      for (var cy = minChunkY; cy <= maxChunkY; cy++) {
        var key = getChunkKey(cx, cy);
        if (state.chunks.has(key)) out.push(key);
      }
    }
    return out;
  }

  function sortVisibleChunkKeys(keys, scope) {
    var list = Array.isArray(keys) ? keys.slice() : [];
    if (!scope || !scope.cullingWorldBounds) return list;
    var centerX = (safeNumber(scope.cullingWorldBounds.minX, 0) + safeNumber(scope.cullingWorldBounds.maxX, 0)) * 0.5;
    var centerY = (safeNumber(scope.cullingWorldBounds.minY, 0) + safeNumber(scope.cullingWorldBounds.maxY, 0)) * 0.5;
    list.sort(function (left, right) {
      var lChunk = state.chunks.get(left);
      var rChunk = state.chunks.get(right);
      var lCenterX = lChunk ? (lChunk.bounds.minX + lChunk.bounds.maxX) * 0.5 : 0;
      var lCenterY = lChunk ? (lChunk.bounds.minY + lChunk.bounds.maxY) * 0.5 : 0;
      var rCenterX = rChunk ? (rChunk.bounds.minX + rChunk.bounds.maxX) * 0.5 : 0;
      var rCenterY = rChunk ? (rChunk.bounds.minY + rChunk.bounds.maxY) * 0.5 : 0;
      var lDist = Math.abs(lCenterX - centerX) + Math.abs(lCenterY - centerY);
      var rDist = Math.abs(rCenterX - centerX) + Math.abs(rCenterY - centerY);
      return lDist - rDist;
    });
    return list;
  }

  function syncWithScene(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var sceneSnapshot = opts.sceneSnapshot && typeof opts.sceneSnapshot === 'object' ? opts.sceneSnapshot : {};
    var chunkSize = Math.max(1, Math.round(Number(sceneSnapshot.chunkSize || opts.chunkSize || getChunkSizeFromRuntime(16)) || 16));
    var getBoxes = typeof opts.getBoxes === 'function' ? opts.getBoxes : function () { return []; };
    var updates = Array.isArray(opts.updates) ? opts.updates : [];
    var summary = null;
    if (state.initialized === true
      && opts.forceFullRebuild !== true
      && state.chunkSize === chunkSize
      && !updates.length
      && Number(sceneSnapshot.cacheVersion || 0) === Number(state.sceneCacheVersion || 0)) {
      summary = summarizeState('scene-sync-cached');
      state.lastSceneSync = {
        mode: 'cached',
        reason: String(opts.reason || 'scene-sync-cached'),
        chunkSize: state.chunkSize,
        sceneCacheVersion: state.sceneCacheVersion,
        dirtyChunkCount: state.dirtyChunkKeys.size,
        durationMs: 0
      };
      return { mode: 'cached', summary: summary, appliedUpdateCount: 0 };
    }
    var requiresFullRebuild = !state.initialized
      || state.chunkSize !== chunkSize
      || sceneSnapshot.mode === 'full-rebuild'
      || updates.some(function (update) { return update && update.mode === 'full-rebuild'; })
      || opts.forceFullRebuild === true;
    if (requiresFullRebuild) {
      summary = applyFullRebuild(getBoxes(), {
        reason: (sceneSnapshot.lastUpdate && sceneSnapshot.lastUpdate.reason) || sceneSnapshot.reason || opts.reason || 'scene-sync',
        chunkSize: chunkSize,
        sceneCacheVersion: sceneSnapshot.cacheVersion,
        durationMs: (sceneSnapshot.lastUpdate && sceneSnapshot.lastUpdate.durationMs) || sceneSnapshot.durationMs || 0
      });
      return { mode: 'full-rebuild', summary: summary, appliedUpdateCount: updates.length };
    }
    if (!updates.length && Number(sceneSnapshot.cacheVersion || 0) !== Number(state.sceneCacheVersion || 0)) {
      summary = applyFullRebuild(getBoxes(), {
        reason: (sceneSnapshot.lastUpdate && sceneSnapshot.lastUpdate.reason) || sceneSnapshot.reason || opts.reason || 'scene-version-mismatch',
        chunkSize: chunkSize,
        sceneCacheVersion: sceneSnapshot.cacheVersion,
        durationMs: (sceneSnapshot.lastUpdate && sceneSnapshot.lastUpdate.durationMs) || sceneSnapshot.durationMs || 0
      });
      return { mode: 'full-rebuild', summary: summary, appliedUpdateCount: 0 };
    }
    for (var i = 0; i < updates.length; i++) applyIncrementalUpdate(updates[i]);
    summary = summarizeState('scene-sync');
    return { mode: updates.length ? 'incremental' : 'cached', summary: summary, appliedUpdateCount: updates.length };
  }

  function mergeSortedPacketLists(packetLists, comparePackets) {
    var lists = Array.isArray(packetLists) ? packetLists : [];
    var comparator = typeof comparePackets === 'function' ? comparePackets : function (a, b) {
      var aSort = Number(a && a.sortKey || 0);
      var bSort = Number(b && b.sortKey || 0);
      if (Math.abs(aSort - bSort) > 1e-6) return aSort - bSort;
      return Number(a && a.tie || 0) - Number(b && b.tie || 0);
    };
    var cursors = [];
    for (var i = 0; i < lists.length; i++) {
      var packetList = Array.isArray(lists[i]) ? lists[i] : [];
      if (packetList.length) cursors.push({ listIndex: i, itemIndex: 0, list: packetList });
    }
    var merged = [];
    while (cursors.length) {
      var bestIndex = 0;
      var bestCursor = cursors[0];
      for (var c = 1; c < cursors.length; c++) {
        var cursor = cursors[c];
        if (comparator(cursor.list[cursor.itemIndex], bestCursor.list[bestCursor.itemIndex]) < 0) {
          bestIndex = c;
          bestCursor = cursor;
        }
      }
      merged.push(bestCursor.list[bestCursor.itemIndex]);
      bestCursor.itemIndex += 1;
      if (bestCursor.itemIndex >= bestCursor.list.length) cursors.splice(bestIndex, 1);
    }
    return merged;
  }

  function collectVisibleRenderables(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var rebuildChunk = typeof opts.rebuildChunk === 'function' ? opts.rebuildChunk : function () { return { renderables: [], stats: null }; };
    var renderSignature = String(opts.renderSignature || 'default');
    var scope = opts.scope || null;
    var comparePackets = typeof opts.comparePackets === 'function' ? opts.comparePackets : null;
    var profileContext = opts.profileContext && typeof opts.profileContext === 'object' ? opts.profileContext : {};
    var deferVisibleRebuild = opts.deferVisibleRebuild === true;
    var startAt = perfNow();
    var requestedVisibleChunkKeys = sortVisibleChunkKeys(computeVisibleChunkKeys(scope), scope);
    var renderSignatureChanged = state.lastRenderSignature !== renderSignature;
    if (renderSignatureChanged && !deferVisibleRebuild) {
      state.chunks.forEach(function (chunk, key) {
        if (!chunk) return;
        chunk.dirtyGeometry = true;
        state.dirtyChunkKeys.add(String(key));
      });
      state.lastRenderSignature = renderSignature;
    }
    var visibleChunkKeys = [];
    var visibleDirtyChunkCount = 0;
    var queuedChunkKeys = [];
    var sourceVisibleChunkKeys = deferVisibleRebuild && Array.isArray(state.lastVisibleChunkKeys) && state.lastVisibleChunkKeys.length
      ? state.lastVisibleChunkKeys.slice()
      : requestedVisibleChunkKeys.slice();
    for (var q = 0; q < sourceVisibleChunkKeys.length; q++) {
      var visibleKey = sourceVisibleChunkKeys[q];
      if (!state.chunks.has(visibleKey)) continue;
      var visibleChunk = state.chunks.get(visibleKey);
      visibleChunkKeys.push(visibleKey);
      var needsRebuild = !deferVisibleRebuild && visibleChunk && (visibleChunk.dirtyGeometry === true || visibleChunk.renderSignature !== renderSignature);
      if (needsRebuild) queuedChunkKeys.push(visibleKey);
      if (!deferVisibleRebuild && state.dirtyChunkKeys.has(visibleKey)) visibleDirtyChunkCount += 1;
    }
    var rebuildBudgetMode = String(opts.rebuildBudgetMode || state.rebuildBudgetMode || 'count');
    var rebuildBudgetValue = Math.max(1, Math.round(Number(opts.rebuildBudgetValue || state.rebuildBudgetValue || 1) || 1));
    state.rebuildBudgetMode = rebuildBudgetMode;
    state.rebuildBudgetValue = rebuildBudgetValue;
    var queuedChunkCountBefore = queuedChunkKeys.length;
    var rebuiltChunkCountThisFrame = 0;
    var reusedChunkCountThisFrame = 0;
    var rebuildMsThisFrame = 0;
    var rebuiltChunkKeySet = new Set();
    var pickedChunkKeysThisFrame = [];
    var rebuiltChunkTotalBoxCount = 0;
    var rebuiltChunkTotalRenderableCount = 0;
    var rebuiltChunkTotalVisibleFaceCount = 0;
    var globalOccupancyChunkCountThisFrame = 0;
    var localOccupancyFallbackChunkCountThisFrame = 0;
    var mergedStaticFaceCountThisFrame = 0;
    var inputFaceDescriptorCountThisFrame = 0;
    var mergedFaceDescriptorCountThisFrame = 0;
    var faceMergeBuildMsThisFrame = 0;
    var terrainInputFaceDescriptorCountThisFrame = 0;
    var terrainMergedFaceDescriptorCountThisFrame = 0;
    var terrainMergedStaticFaceCountThisFrame = 0;
    var terrainMergeBuildMsThisFrame = 0;
    var terrainVisiblePacketCountThisFrame = 0;
    for (var rq = 0; rq < queuedChunkKeys.length; rq++) {
      if (rebuildBudgetMode === 'count' && rebuiltChunkCountThisFrame >= rebuildBudgetValue) break;
      var rebuildKey = queuedChunkKeys[rq];
      var rebuildTarget = state.chunks.get(rebuildKey) || ensureChunk(rebuildKey, state.chunkSize);
      var rebuildContext = collectNeighborContextForChunkKey(rebuildKey);
      var rebuildStartAt = perfNow();
      var rebuilt = rebuildChunk(rebuildTarget, Object.assign({}, opts, {
        neighborBoxes: rebuildContext.neighborBoxes,
        touchedChunkKeys: rebuildContext.touchedChunkKeys,
        profileContext: profileContext
      })) || { packets: [], stats: null };
      rebuildTarget.cachedPackets = Array.isArray(rebuilt.packets)
        ? rebuilt.packets
        : (Array.isArray(rebuilt.renderables) ? rebuilt.renderables : []);
      rebuildTarget.renderSignature = renderSignature;
      rebuildTarget.dirtyGeometry = false;
      rebuildTarget.lastBuiltAt = perfNow();
      rebuildTarget.lastStats = rebuilt.stats || null;
      state.dirtyChunkKeys.delete(rebuildKey);
      rebuiltChunkKeySet.add(rebuildKey);
      pickedChunkKeysThisFrame.push(rebuildKey);
      rebuiltChunkCountThisFrame += 1;
      rebuildMsThisFrame += Math.max(0, perfNow() - rebuildStartAt);
      if (rebuildTarget.lastStats) {
        rebuiltChunkTotalBoxCount += Math.max(0, Math.round(Number(rebuildTarget.lastStats.localBoxCount || rebuildTarget.lastStats.structuredBoxCount) || 0));
        rebuiltChunkTotalRenderableCount += Math.max(0, Math.round(Number(rebuildTarget.lastStats.finalRenderableCount || rebuildTarget.lastStats.packetCount) || 0));
        rebuiltChunkTotalVisibleFaceCount += Math.max(0, Math.round(Number(rebuildTarget.lastStats.visibleFaceCountAfterCull || (Number(rebuildTarget.lastStats.visibleTopFaceCount || 0) + Number(rebuildTarget.lastStats.visibleSideFaceCount || 0))) || 0));
        if (rebuildTarget.lastStats.usedGlobalOccupancy === true) globalOccupancyChunkCountThisFrame += 1;
        if (rebuildTarget.lastStats.usedLocalOccupancyFallback === true) localOccupancyFallbackChunkCountThisFrame += 1;
        mergedStaticFaceCountThisFrame += Math.max(0, Math.round(Number(rebuildTarget.lastStats.mergedStaticFaceCount || 0) || 0));
        inputFaceDescriptorCountThisFrame += Math.max(0, Math.round(Number(rebuildTarget.lastStats.inputFaceDescriptorCount || 0) || 0));
        mergedFaceDescriptorCountThisFrame += Math.max(0, Math.round(Number(rebuildTarget.lastStats.mergedFaceDescriptorCount || 0) || 0));
        faceMergeBuildMsThisFrame += Math.max(0, Number(rebuildTarget.lastStats.mergeFaceDescriptorsMs || 0));
        terrainInputFaceDescriptorCountThisFrame += Math.max(0, Math.round(Number(rebuildTarget.lastStats.terrainInputFaceDescriptorCount || 0) || 0));
        terrainMergedFaceDescriptorCountThisFrame += Math.max(0, Math.round(Number(rebuildTarget.lastStats.terrainMergedFaceDescriptorCount || 0) || 0));
        terrainMergedStaticFaceCountThisFrame += Math.max(0, Math.round(Number(rebuildTarget.lastStats.terrainMergedStaticFaceCount || 0) || 0));
        terrainMergeBuildMsThisFrame += Math.max(0, Number(rebuildTarget.lastStats.terrainMergeFaceDescriptorsMs || 0));
        terrainVisiblePacketCountThisFrame += Math.max(0, Math.round(Number(rebuildTarget.lastStats.terrainPacketCount || 0) || 0));
      }
      if (rebuildBudgetMode === 'ms' && rebuildMsThisFrame >= rebuildBudgetValue) break;
    }
    var visiblePacketLists = [];
    var visibleTopFaceCount = 0;
    var visibleSideFaceCount = 0;
    var logicalVoxelCountEstimated = 0;
    var hiddenInternalSurfaceSkippedCount = 0;
    var voxelFurnitureProcessedCount = 0;
    var renderSourceCountBeforeVisibility = 0;
    var renderSourceCountAfterVisibility = 0;
    var visibleStaticPacketCount = 0;
    for (var i = 0; i < visibleChunkKeys.length; i++) {
      var key = visibleChunkKeys[i];
      var chunk = state.chunks.get(key);
      if (!rebuiltChunkKeySet.has(key) && !(chunk.dirtyGeometry === true || chunk.renderSignature !== renderSignature)) {
        reusedChunkCountThisFrame += 1;
      }
      visiblePacketLists.push(Array.isArray(chunk.cachedPackets) ? chunk.cachedPackets : []);
      visibleStaticPacketCount += Array.isArray(chunk.cachedPackets) ? chunk.cachedPackets.length : 0;
      var stats = chunk.lastStats || null;
      if (stats) {
        visibleTopFaceCount += Math.max(0, Math.round(Number(stats.visibleTopFaceCount) || 0));
        visibleSideFaceCount += Math.max(0, Math.round(Number(stats.visibleSideFaceCount) || 0));
        logicalVoxelCountEstimated += Math.max(0, Math.round(Number(stats.logicalVoxelCountEstimated) || 0));
        hiddenInternalSurfaceSkippedCount += Math.max(0, Math.round(Number(stats.hiddenInternalSurfaceSkippedCount) || 0));
        voxelFurnitureProcessedCount += Math.max(0, Math.round(Number(stats.voxelFurnitureProcessedCount) || 0));
        renderSourceCountBeforeVisibility += Math.max(0, Math.round(Number(stats.renderSourceCountBeforeVisibility) || 0));
        renderSourceCountAfterVisibility += Math.max(0, Math.round(Number(stats.renderSourceCountAfterVisibility) || 0));
      }
    }
    var mergeStartAt = perfNow();
    var renderables = mergeSortedPacketLists(visiblePacketLists, comparePackets);
    var packetMergeMs = Math.max(0, perfNow() - mergeStartAt);
    state.totalStaticRenderables = 0;
    state.chunks.forEach(function (chunk) {
      state.totalStaticRenderables += Array.isArray(chunk.cachedPackets) ? chunk.cachedPackets.length : 0;
    });
    if (!(deferVisibleRebuild && Array.isArray(state.lastVisibleChunkKeys) && state.lastVisibleChunkKeys.length)) {
      state.lastVisibleChunkKeys = visibleChunkKeys.slice();
    }
    var totalDirtyChunkCount = state.dirtyChunkKeys.size;
    var deferredChunkCountAfter = Math.max(0, queuedChunkCountBefore - rebuiltChunkCountThisFrame);
    state.lastSchedulerSummary = {
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      totalDirtyChunkCount: totalDirtyChunkCount,
      visibleDirtyChunkCount: visibleDirtyChunkCount,
      queuedChunkCountBefore: queuedChunkCountBefore,
      pickedChunkKeysThisFrame: pickedChunkKeysThisFrame.slice(),
      rebuiltChunkCountThisFrame: rebuiltChunkCountThisFrame,
      deferredChunkCountAfter: deferredChunkCountAfter,
      rebuildBudgetMode: rebuildBudgetMode,
      rebuildBudgetValue: rebuildBudgetValue,
      rebuildMsThisFrame: Number(rebuildMsThisFrame.toFixed ? rebuildMsThisFrame.toFixed(3) : rebuildMsThisFrame),
      renderSignatureChanged: renderSignatureChanged === true,
      deferVisibleRebuild: deferVisibleRebuild === true
    };
    if (totalDirtyChunkCount > 0 || queuedChunkCountBefore > 0 || rebuiltChunkCountThisFrame > 0) {
      emitStaticChunkRebuildScheduler(cloneJsonSafe(state.lastSchedulerSummary));
      emitChunkCacheSchedulerDetail(cloneJsonSafe(state.lastSchedulerSummary));
    }
    state.lastFrameSummary = {
      terrainBatchId: profileContext.terrainBatchId || null,
      frameIndexAfterTerrainApply: profileContext.frameIndexAfterTerrainApply != null ? Number(profileContext.frameIndexAfterTerrainApply) : null,
      totalChunkCount: state.chunks.size,
      dirtyChunkCount: state.dirtyChunkKeys.size,
      remainingDirtyChunkCount: state.dirtyChunkKeys.size,
      visibleChunkCount: visibleChunkKeys.length,
      rebuiltChunkCountThisFrame: rebuiltChunkCountThisFrame,
      rebuiltChunkKeysThisFrame: pickedChunkKeysThisFrame.slice(),
      rebuiltChunkTotalBoxCount: rebuiltChunkTotalBoxCount,
      rebuiltChunkTotalRenderableCount: rebuiltChunkTotalRenderableCount,
      rebuiltChunkTotalVisibleFaceCount: rebuiltChunkTotalVisibleFaceCount,
      globalOccupancyChunkCountThisFrame: globalOccupancyChunkCountThisFrame,
      localOccupancyFallbackChunkCountThisFrame: localOccupancyFallbackChunkCountThisFrame,
      reusedChunkCountThisFrame: reusedChunkCountThisFrame,
      chunkSize: state.chunkSize,
      totalStaticBoxes: state.totalStaticBoxes,
      totalStaticRenderables: state.totalStaticRenderables,
      visibleStaticPacketCount: visibleStaticPacketCount,
      packetMergeMs: Number(packetMergeMs.toFixed ? packetMergeMs.toFixed(3) : packetMergeMs),
      mergedStaticFaceCountThisFrame: mergedStaticFaceCountThisFrame,
      inputFaceDescriptorCountThisFrame: inputFaceDescriptorCountThisFrame,
      mergedFaceDescriptorCountThisFrame: mergedFaceDescriptorCountThisFrame,
      mergeReductionRatio: inputFaceDescriptorCountThisFrame > 0 ? Number((Math.max(0, inputFaceDescriptorCountThisFrame - mergedFaceDescriptorCountThisFrame) / inputFaceDescriptorCountThisFrame).toFixed(6)) : 0,
      faceMergeBuildMsThisFrame: Number(faceMergeBuildMsThisFrame.toFixed ? faceMergeBuildMsThisFrame.toFixed(3) : faceMergeBuildMsThisFrame),
      terrainInputFaceDescriptorCountThisFrame: terrainInputFaceDescriptorCountThisFrame,
      terrainMergedFaceDescriptorCountThisFrame: terrainMergedFaceDescriptorCountThisFrame,
      terrainMergedStaticFaceCountThisFrame: terrainMergedStaticFaceCountThisFrame,
      terrainMergeReductionRatio: terrainInputFaceDescriptorCountThisFrame > 0 ? Number((Math.max(0, terrainInputFaceDescriptorCountThisFrame - terrainMergedFaceDescriptorCountThisFrame) / terrainInputFaceDescriptorCountThisFrame).toFixed(6)) : 0,
      terrainMergeBuildMsThisFrame: Number(terrainMergeBuildMsThisFrame.toFixed ? terrainMergeBuildMsThisFrame.toFixed(3) : terrainMergeBuildMsThisFrame),
      terrainVisiblePacketCountThisFrame: terrainVisiblePacketCountThisFrame,
      cacheContentType: 'world-face-packets',
      cameraIndependent: true,
      usesScreenSpaceCache: false,
      visibleTopFaceCount: visibleTopFaceCount,
      visibleSideFaceCount: visibleSideFaceCount,
      logicalVoxelCountEstimated: logicalVoxelCountEstimated,
      hiddenInternalSurfaceSkippedCount: hiddenInternalSurfaceSkippedCount,
      voxelFurnitureProcessedCount: voxelFurnitureProcessedCount,
      renderSourceCountBeforeVisibility: renderSourceCountBeforeVisibility,
      renderSourceCountAfterVisibility: renderSourceCountAfterVisibility,
      rebuildBudgetMode: rebuildBudgetMode,
      rebuildBudgetValue: rebuildBudgetValue,
      rebuildMsThisFrame: Number(rebuildMsThisFrame.toFixed ? rebuildMsThisFrame.toFixed(3) : rebuildMsThisFrame),
      renderSignatureChanged: renderSignatureChanged === true,
      buildMs: Number(Math.max(0, perfNow() - startAt).toFixed ? Math.max(0, perfNow() - startAt).toFixed(3) : Math.max(0, perfNow() - startAt))
    };
    return {
      packets: renderables,
      renderables: renderables,
      summary: cloneJsonSafe(state.lastFrameSummary),
      schedulerSummary: cloneJsonSafe(state.lastSchedulerSummary),
      visibleChunkKeys: visibleChunkKeys.slice()
    };
  }


  var api = {
    owner: OWNER,
    getChunkSize: function () { return state.chunkSize; },
    getChunkKey: getChunkKey,
    getPrimaryChunkKeyForBox: getPrimaryChunkKeyForBox,
    buildStaticWorldBoxSignature: buildStaticWorldBoxSignature,
    syncWithScene: syncWithScene,
    collectVisibleRenderables: collectVisibleRenderables,
    summarize: summarizeState,
    reset: function (reason) { resetState(reason || 'reset', getChunkSizeFromRuntime(16)); return summarizeState('reset'); }
  };

  try {
    window.__STATIC_WORLD_CHUNK_CACHE__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.staticWorldChunkCache', api, { owner: OWNER, phase: 'shared-static-world-chunks' });
    }
  } catch (_) {}
})();
