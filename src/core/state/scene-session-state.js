// Step-07: scene/session owner extracted from state.js
(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/core/state/scene-session-state.js';
  var PHASE = 'P9-A';
  var audit = {
    counters: {
      replaceSceneGraphCalls: 0,
      replaceInstancesCalls: 0,
      addInstanceCalls: 0,
      removeInstanceCalls: 0,
      removeLooseBoxCalls: 0,
      restoreDefaultSceneCalls: 0,
      ensureNonEmptySceneCalls: 0,
      syncDerivedStateCalls: 0,
      allocateInstanceIdCalls: 0,
      allocateBoxIdRangeCalls: 0,
      legacyFallbacks: 0
    },
    recentWrites: [],
    lastWrite: null
  };
  var MAX_RECENT = 16;

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function nowIso() {
    try { return new Date().toISOString(); } catch (_) { return ''; }
  }

  function emit(kind, message, extra) {
    var line = '[SCENE-SESSION][' + String(kind || 'SUMMARY') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function pushRecent(entry) {
    audit.recentWrites.push(entry);
    if (audit.recentWrites.length > MAX_RECENT) audit.recentWrites.splice(0, audit.recentWrites.length - MAX_RECENT);
    audit.lastWrite = entry;
    return entry;
  }

  function recordWrite(action, extra) {
    var key = String(action || 'unknown') + 'Calls';
    if (Object.prototype.hasOwnProperty.call(audit.counters, key)) audit.counters[key] += 1;
    var entry = {
      at: nowIso(),
      owner: OWNER,
      action: String(action || 'unknown'),
      extra: safeClone(extra || null),
      summary: summarizeSession()
    };
    pushRecent(entry);
    try {
      if (window.__STATE_OWNER_MAP__ && typeof window.__STATE_OWNER_MAP__.recordWrite === 'function') {
        window.__STATE_OWNER_MAP__.recordWrite(OWNER, action, extra || null);
      }
    } catch (_) {}
    emit('WRITE', action, entry);
    return entry;
  }

  function summarizeSession() {
    return {
      owner: OWNER,
      phase: PHASE,
      instances: Array.isArray(typeof instances !== 'undefined' ? instances : null) ? instances.length : 0,
      boxes: Array.isArray(typeof boxes !== 'undefined' ? boxes : null) ? boxes.length : 0,
      nextId: typeof nextId !== 'undefined' ? Number(nextId) || 0 : null,
      nextInstanceSerial: typeof nextInstanceSerial !== 'undefined' ? Number(nextInstanceSerial) || 0 : null,
      selectedInstanceId: (typeof inspectorState !== 'undefined' && inspectorState) ? (inspectorState.selectedInstanceId || null) : null,
      editorMode: (typeof editor !== 'undefined' && editor) ? (editor.mode || 'view') : null
    };
  }

  function summarizeWrites(label) {
    return {
      owner: OWNER,
      phase: PHASE,
      label: String(label || ''),
      counters: safeClone(audit.counters),
      lastWrite: safeClone(audit.lastWrite),
      recentWrites: audit.recentWrites.slice(-8).map(safeClone),
      session: summarizeSession()
    };
  }

  function resetAudit(meta) {
    audit.counters.replaceSceneGraphCalls = 0;
    audit.counters.replaceInstancesCalls = 0;
    audit.counters.addInstanceCalls = 0;
    audit.counters.removeInstanceCalls = 0;
    audit.counters.removeLooseBoxCalls = 0;
    audit.counters.restoreDefaultSceneCalls = 0;
    audit.counters.ensureNonEmptySceneCalls = 0;
    audit.counters.syncDerivedStateCalls = 0;
    audit.counters.allocateInstanceIdCalls = 0;
    audit.counters.allocateBoxIdRangeCalls = 0;
    audit.counters.legacyFallbacks = 0;
    audit.recentWrites = [];
    audit.lastWrite = null;
    emit('BOUNDARY', 'audit-reset', { source: meta && meta.source ? String(meta.source) : 'unknown' });
    return summarizeWrites('reset');
  }

  var nextInstanceSerial = 1;
  var nextId = 1;
  var instances = [];
  var boxes = [];
  var occupancyCacheState = {
    cacheVersion: 0,
    initialized: false,
    map: new Map(),
    totalBoxes: 0,
    structuredBoxCount: 0,
    structuredCellCount: 0,
    lastUpdate: null
  };

  var staticWorldChunkState = {
    cacheVersion: 0,
    initialized: false,
    chunkSize: 16,
    totalStaticBoxes: 0,
    dirtyChunkKeys: [],
    lastUpdate: null,
    updateQueue: []
  };

  function perfMs() {
    try {
      if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') return performance.now();
    } catch (_) {}
    return Date.now();
  }

  function emitOccupancyCacheLog(payload) {
    var line = '[OCCUPANCY-CACHE] ';
    try { line += JSON.stringify(payload || {}); } catch (_) { line += '{}'; }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }


  function emitStaticWorldUpdateLog(payload) {
    var line = '[STATIC-WORLD-UPDATE] ';
    try { line += JSON.stringify(payload || {}); } catch (_) { line += '{}'; }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function getStaticWorldChunkSizeValue() {
    var size = 16;
    try {
      if (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.runtimeState) {
        var runtimeApi = window.App.state.runtimeState;
        if (runtimeApi && typeof runtimeApi.getTerrainRuntimeModelValue === 'function') {
          var model = runtimeApi.getTerrainRuntimeModelValue();
          if (model && Number(model.chunkSize) > 0) size = Number(model.chunkSize);
        } else if (runtimeApi && runtimeApi.terrainLogic && Number(runtimeApi.terrainLogic.chunkSize) > 0) {
          size = Number(runtimeApi.terrainLogic.chunkSize);
        }
      }
    } catch (_) {}
    try {
      if (typeof terrainLogic !== 'undefined' && terrainLogic && Number(terrainLogic.chunkSize) > 0) size = Number(terrainLogic.chunkSize);
    } catch (_) {}
    return Math.max(1, Math.round(size) || 16);
  }

  function prefabDrawsStaticWorldBoxes(prefab, box) {
    if (!prefabDrawsOccupancyCells(prefab)) return false;
    var mode = 'static';
    try {
      if (typeof getPrefabRenderUpdateMode === 'function') mode = getPrefabRenderUpdateMode(prefab, box && box.renderUpdateMode ? { renderUpdateMode: box.renderUpdateMode } : null);
      else if (box && (box.renderUpdateMode === 'static' || box.renderUpdateMode === 'dynamic')) mode = String(box.renderUpdateMode);
      else if (prefab && (prefab.renderUpdateMode === 'static' || prefab.renderUpdateMode === 'dynamic')) mode = String(prefab.renderUpdateMode);
      else if (prefab && String(prefab.renderMode || 'voxel') !== 'voxel') mode = 'dynamic';
    } catch (_) {}
    return String(mode || 'static') !== 'dynamic';
  }

  function isStaticWorldChunkBox(box) {
    if (!box || typeof box !== 'object') return false;
    if (box.generatedBy === 'terrain-generator') return true;
    if (typeof getPrefabById === 'function') {
      try { return prefabDrawsStaticWorldBoxes(getPrefabById(box.prefabId), box); } catch (_) {}
    }
    return box.renderUpdateMode !== 'dynamic';
  }

  function buildStaticWorldBoxSignature(box) {
    if (!box || typeof box !== 'object') return '';
    return [
      box.instanceId || '',
      box.prefabId || '',
      box.generatedBy || '',
      Number(box.x) || 0,
      Number(box.y) || 0,
      Number(box.z) || 0,
      Math.max(1, Number(box.w) || 1),
      Math.max(1, Number(box.d) || 1),
      Math.max(1, Number(box.h) || 1),
      box.base || '',
      Number(box.rotation) || 0,
      box.renderUpdateMode || '',
      box.terrainBatchId || '',
      box.terrainCellX != null ? Number(box.terrainCellX) || 0 : '',
      box.terrainCellY != null ? Number(box.terrainCellY) || 0 : '',
      box.localIndex != null ? Number(box.localIndex) || 0 : ''
    ].join('|');
  }

  function buildBoxSignatureMap(boxList, filterFn, signatureFn) {
    var map = new Map();
    var list = Array.isArray(boxList) ? boxList : [];
    for (var i = 0; i < list.length; i++) {
      var box = list[i];
      if (typeof filterFn === 'function' && !filterFn(box)) continue;
      var signature = typeof signatureFn === 'function' ? signatureFn(box) : '';
      if (!signature) continue;
      map.set(signature, box);
    }
    return map;
  }

  function buildChunkKeysForBox(box, chunkSize, padding) {
    var size = Math.max(1, Math.round(Number(chunkSize) || 16));
    var pad = Math.max(0, Math.round(Number(padding) || 0));
    var set = new Set();
    if (!box) return set;
    var minChunkX = Math.floor((Number(box.x) || 0) / size) - pad;
    var minChunkY = Math.floor((Number(box.y) || 0) / size) - pad;
    var maxChunkX = Math.floor((((Number(box.x) || 0) + Math.max(1, Number(box.w) || 1) - 1)) / size) + pad;
    var maxChunkY = Math.floor((((Number(box.y) || 0) + Math.max(1, Number(box.d) || 1) - 1)) / size) + pad;
    for (var cx = minChunkX; cx <= maxChunkX; cx++) {
      for (var cy = minChunkY; cy <= maxChunkY; cy++) set.add(String(cx) + ',' + String(cy));
    }
    return set;
  }

  function buildAffectedChunkKeySet(removedBoxes, addedBoxes, chunkSize) {
    var set = new Set();
    var lists = [Array.isArray(removedBoxes) ? removedBoxes : [], Array.isArray(addedBoxes) ? addedBoxes : []];
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i];
      for (var j = 0; j < list.length; j++) {
        buildChunkKeysForBox(list[j], chunkSize, 1).forEach(function (key) { set.add(key); });
      }
    }
    return set;
  }

  function getStaticWorldCacheSnapshot() {
    return {
      cacheVersion: Number(staticWorldChunkState.cacheVersion || 0),
      initialized: staticWorldChunkState.initialized === true,
      chunkSize: Math.max(1, Math.round(Number(staticWorldChunkState.chunkSize) || 16)),
      totalStaticBoxes: Number(staticWorldChunkState.totalStaticBoxes || 0),
      dirtyChunkKeys: Array.isArray(staticWorldChunkState.dirtyChunkKeys) ? staticWorldChunkState.dirtyChunkKeys.slice() : [],
      lastUpdate: cloneOccupancyUpdateMeta(staticWorldChunkState.lastUpdate)
    };
  }

  function consumeStaticWorldUpdates() {
    var out = Array.isArray(staticWorldChunkState.updateQueue) ? staticWorldChunkState.updateQueue.slice() : [];
    staticWorldChunkState.updateQueue = [];
    return out;
  }

  function updateStaticWorldChunkStateFromBoxDiff(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var previousBoxes = Array.isArray(opts.previousBoxes) ? opts.previousBoxes.slice() : [];
    var nextBoxes = Array.isArray(opts.nextBoxes) ? opts.nextBoxes.slice() : [];
    var reason = normalizeOccupancyReason(opts.reason || opts.source || 'scene-change');
    var chunkSize = getStaticWorldChunkSizeValue();
    var startAt = perfMs();
    var previousMap = buildBoxSignatureMap(previousBoxes, isStaticWorldChunkBox, buildStaticWorldBoxSignature);
    var nextMap = buildBoxSignatureMap(nextBoxes, isStaticWorldChunkBox, buildStaticWorldBoxSignature);
    var removedBoxes = [];
    var addedBoxes = [];
    previousMap.forEach(function (box, signature) { if (!nextMap.has(signature)) removedBoxes.push(box); });
    nextMap.forEach(function (box, signature) { if (!previousMap.has(signature)) addedBoxes.push(box); });
    var affectedChunkKeys = Array.from(buildAffectedChunkKeySet(removedBoxes, addedBoxes, chunkSize));
    var mode = (opts.forceFullRebuild === true || staticWorldChunkState.initialized !== true || reason === 'scene-load' || reason === 'restore-default' || Number(staticWorldChunkState.chunkSize || 0) !== chunkSize) ? 'full-rebuild' : 'incremental';
    var changed = mode === 'full-rebuild'
      || addedBoxes.length > 0
      || removedBoxes.length > 0
      || Number(staticWorldChunkState.totalStaticBoxes || 0) !== nextMap.size
      || Number(staticWorldChunkState.chunkSize || 0) !== chunkSize;
    var durationMs = Math.max(0, perfMs() - startAt);
    if (changed) {
      staticWorldChunkState.cacheVersion = Number(staticWorldChunkState.cacheVersion || 0) + 1;
      staticWorldChunkState.initialized = true;
      staticWorldChunkState.chunkSize = chunkSize;
      staticWorldChunkState.totalStaticBoxes = nextMap.size;
      staticWorldChunkState.dirtyChunkKeys = affectedChunkKeys.slice();
      var updatePayload = {
        reason: reason,
        mode: mode,
        chunkSize: chunkSize,
        affectedChunkKeys: affectedChunkKeys.slice(),
        dirtyChunkCount: affectedChunkKeys.length,
        addedBoxCount: addedBoxes.length,
        removedBoxCount: removedBoxes.length,
        updatedBoxCount: addedBoxes.length + removedBoxes.length,
        totalStaticBoxes: nextMap.size,
        cacheVersion: Number(staticWorldChunkState.cacheVersion || 0),
        durationMs: Number(durationMs.toFixed(3)),
        source: opts.source ? String(opts.source) : null,
        addedBoxes: addedBoxes.slice(),
        removedBoxes: removedBoxes.slice()
      };
      staticWorldChunkState.lastUpdate = {
        reason: updatePayload.reason,
        mode: updatePayload.mode,
        chunkSize: updatePayload.chunkSize,
        affectedChunkKeys: updatePayload.affectedChunkKeys.slice(),
        dirtyChunkCount: updatePayload.dirtyChunkCount,
        addedBoxCount: updatePayload.addedBoxCount,
        removedBoxCount: updatePayload.removedBoxCount,
        updatedBoxCount: updatePayload.updatedBoxCount,
        totalStaticBoxes: updatePayload.totalStaticBoxes,
        cacheVersion: updatePayload.cacheVersion,
        durationMs: updatePayload.durationMs,
        source: updatePayload.source
      };
      staticWorldChunkState.updateQueue.push(updatePayload);
      emitStaticWorldUpdateLog(staticWorldChunkState.lastUpdate);
    }
    return getStaticWorldCacheSnapshot();
  }

  function prefabDrawsOccupancyCells(prefab) {
    return !prefab || String(prefab.renderMode || 'voxel') !== 'sprite_proxy';
  }

  function isOccupancyIndexedBox(box) {
    if (!box || typeof box !== 'object') return false;
    if (box.generatedBy === 'terrain-generator') return true;
    if (typeof getPrefabById === 'function') {
      try { return prefabDrawsOccupancyCells(getPrefabById(box.prefabId)); } catch (_) {}
    }
    return true;
  }

  function normalizeOccupancyReason(reason) {
    var raw = String(reason || 'scene-change');
    var text = raw.toLowerCase();
    if (text.indexOf('terrain') >= 0 && (text.indexOf('generate') >= 0 || text.indexOf('apply-placement-plan') >= 0 || text.indexOf('clear-legacy') >= 0)) return 'terrain-generate';
    if (text.indexOf('applyscenesnapshot') >= 0 || text.indexOf('loadscene') >= 0 || text.indexOf('loadscenefile') >= 0 || text.indexOf('importscenefile') >= 0 || text.indexOf('scene-load') >= 0 || text.indexOf('boot') >= 0) return 'scene-load';
    if (text.indexOf('restoredefaultscene') >= 0 || text.indexOf('restore-default') >= 0 || text.indexOf('resetscene') >= 0 || text.indexOf('newworld') >= 0) return 'restore-default';
    if (text.indexOf('updateinstancerotation') >= 0 || text.indexOf('rotateplacedinstance') >= 0 || text.indexOf('rotate') >= 0) return 'rotate-instance';
    if (text.indexOf('commitpreview.drag') >= 0 || text.indexOf('startdragging') >= 0 || text.indexOf('canceldrag') >= 0 || text.indexOf('move') >= 0 || text.indexOf('drag') >= 0) return 'move-instance';
    if (text.indexOf('removeinstance') >= 0 || text.indexOf('remove') >= 0 || text.indexOf('delete') >= 0) return 'remove-instance';
    if (text.indexOf('placecurrentprefab') >= 0 || text.indexOf('commitpreview.place') >= 0 || text.indexOf('addinstance') >= 0 || text.indexOf('place') >= 0) return 'place-instance';
    return raw;
  }

  function buildOccupancyCellMap(boxList) {
    var map = new Map();
    var list = Array.isArray(boxList) ? boxList : [];
    for (var i = 0; i < list.length; i++) {
      var box = list[i];
      if (!isOccupancyIndexedBox(box)) continue;
      var x0 = Number(box.x) || 0;
      var y0 = Number(box.y) || 0;
      var z0 = Number(box.z) || 0;
      var w = Math.max(1, Number(box.w) || 1);
      var d = Math.max(1, Number(box.d) || 1);
      var h = Math.max(1, Number(box.h) || 1);
      for (var x = x0; x < x0 + w; x++) {
        for (var y = y0; y < y0 + d; y++) {
          for (var z = z0; z < z0 + h; z++) {
            var key = String(x) + ',' + String(y) + ',' + String(z);
            map.set(key, { x: x, y: y, z: z });
          }
        }
      }
    }
    return map;
  }

  function buildOccupancyBoxSignatureSet(boxList) {
    var set = new Set();
    var list = Array.isArray(boxList) ? boxList : [];
    for (var i = 0; i < list.length; i++) {
      var box = list[i];
      if (!isOccupancyIndexedBox(box)) continue;
      set.add([
        box.instanceId || '',
        box.prefabId || '',
        box.generatedBy || '',
        Number(box.x) || 0,
        Number(box.y) || 0,
        Number(box.z) || 0,
        Math.max(1, Number(box.w) || 1),
        Math.max(1, Number(box.d) || 1),
        Math.max(1, Number(box.h) || 1),
        box.terrainCellX != null ? Number(box.terrainCellX) || 0 : '',
        box.terrainCellY != null ? Number(box.terrainCellY) || 0 : ''
      ].join('|'));
    }
    return set;
  }

  function countSetDelta(left, right) {
    var count = 0;
    if (!(left instanceof Set) || !(right instanceof Set)) return count;
    left.forEach(function (key) { if (!right.has(key)) count += 1; });
    return count;
  }

  function cloneOccupancyUpdateMeta(meta) {
    return safeClone(meta || null);
  }

  function getOccupancyCacheSnapshot() {
    return {
      cacheVersion: Number(occupancyCacheState.cacheVersion || 0),
      initialized: occupancyCacheState.initialized === true,
      map: occupancyCacheState.map instanceof Map ? occupancyCacheState.map : new Map(),
      totalBoxes: Number(occupancyCacheState.totalBoxes || 0),
      structuredBoxCount: Number(occupancyCacheState.structuredBoxCount || 0),
      structuredCellCount: Number(occupancyCacheState.structuredCellCount || 0),
      lastUpdate: cloneOccupancyUpdateMeta(occupancyCacheState.lastUpdate)
    };
  }

  function updateOccupancyCacheFromBoxDiff(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var previousBoxes = Array.isArray(opts.previousBoxes) ? opts.previousBoxes.slice() : [];
    var nextBoxes = Array.isArray(opts.nextBoxes) ? opts.nextBoxes.slice() : [];
    var reason = normalizeOccupancyReason(opts.reason || opts.source || 'scene-change');
    var totalBoxes = nextBoxes.length;
    var prevStructured = previousBoxes.filter(isOccupancyIndexedBox);
    var nextStructured = nextBoxes.filter(isOccupancyIndexedBox);
    var prevBoxSet = buildOccupancyBoxSignatureSet(prevStructured);
    var nextBoxSet = buildOccupancyBoxSignatureSet(nextStructured);
    var addedBoxCount = countSetDelta(nextBoxSet, prevBoxSet);
    var removedBoxCount = countSetDelta(prevBoxSet, nextBoxSet);
    var dirtyBoxCount = addedBoxCount + removedBoxCount;
    var startAt = perfMs();
    var previousCellMap = buildOccupancyCellMap(prevStructured);
    var nextCellMap = buildOccupancyCellMap(nextStructured);
    var mode = 'incremental';
    var canIncremental = occupancyCacheState.initialized === true
      && occupancyCacheState.map instanceof Map
      && occupancyCacheState.map.size === previousCellMap.size
      && opts.forceFullRebuild !== true
      && reason !== 'scene-load'
      && reason !== 'restore-default';
    var updatedCellCount = 0;
    if (!canIncremental) {
      mode = 'full-rebuild';
      occupancyCacheState.map = nextCellMap;
      updatedCellCount = nextCellMap.size;
    } else {
      previousCellMap.forEach(function (_, key) {
        if (!nextCellMap.has(key)) {
          occupancyCacheState.map.delete(key);
          updatedCellCount += 1;
        }
      });
      nextCellMap.forEach(function (value, key) {
        if (!previousCellMap.has(key)) {
          occupancyCacheState.map.set(key, value);
          updatedCellCount += 1;
        }
      });
    }
    var durationMs = Math.max(0, perfMs() - startAt);
    var changed = occupancyCacheState.initialized !== true
      || mode === 'full-rebuild'
      || updatedCellCount > 0
      || totalBoxes !== Number(occupancyCacheState.totalBoxes || 0)
      || nextStructured.length !== Number(occupancyCacheState.structuredBoxCount || 0);
    if (changed) {
      occupancyCacheState.cacheVersion = Number(occupancyCacheState.cacheVersion || 0) + 1;
      occupancyCacheState.initialized = true;
      occupancyCacheState.totalBoxes = totalBoxes;
      occupancyCacheState.structuredBoxCount = nextStructured.length;
      occupancyCacheState.structuredCellCount = occupancyCacheState.map.size;
      occupancyCacheState.lastUpdate = {
        reason: reason,
        mode: mode,
        totalBoxes: totalBoxes,
        structuredBoxCount: nextStructured.length,
        dirtyBoxCount: dirtyBoxCount,
        addedBoxCount: addedBoxCount,
        removedBoxCount: removedBoxCount,
        updatedCellCount: updatedCellCount,
        cacheVersion: Number(occupancyCacheState.cacheVersion || 0),
        durationMs: Number(durationMs.toFixed(3)),
        source: opts.source ? String(opts.source) : null
      };
      emitOccupancyCacheLog(occupancyCacheState.lastUpdate);
    }
    updateStaticWorldChunkStateFromBoxDiff({
      previousBoxes: previousBoxes,
      nextBoxes: nextBoxes,
      reason: reason,
      source: opts.source ? String(opts.source) : null,
      forceFullRebuild: opts.forceFullRebuild === true
    });
    return getOccupancyCacheSnapshot();
  }

  function ensureOccupancyCache(meta) {
    if (occupancyCacheState.initialized === true && occupancyCacheState.map instanceof Map) return getOccupancyCacheSnapshot();
    var source = meta && meta.source ? String(meta.source) : 'scene-session:ensure-occupancy-cache';
    return updateOccupancyCacheFromBoxDiff({ previousBoxes: [], nextBoxes: Array.isArray(boxes) ? boxes.slice() : [], reason: source, source: source, forceFullRebuild: true });
  }

  function bindCompatGlobal(name, getter, setter) {
    try {
      var existing = Object.getOwnPropertyDescriptor(window, name);
      if (!existing || existing.configurable) {
        Object.defineProperty(window, name, {
          configurable: true,
          enumerable: true,
          get: getter,
          set: setter
        });
        return true;
      }
      window[name] = getter();
      return false;
    } catch (_) {
      try { window[name] = getter(); } catch (_) {}
      return false;
    }
  }

  bindCompatGlobal('nextInstanceSerial', function () { return nextInstanceSerial; }, function (value) { nextInstanceSerial = Number(value) || 1; });
  bindCompatGlobal('nextId', function () { return nextId; }, function (value) { nextId = Number(value) || 1; });
  bindCompatGlobal('instances', function () { return instances; }, function (value) { instances = Array.isArray(value) ? value : []; });
  bindCompatGlobal('boxes', function () { return boxes; }, function (value) { boxes = Array.isArray(value) ? value : []; });

  instances = defaultInstances();

  function rebuildSceneBoxes(reason, meta) {
    if (typeof rebuildBoxesFromInstances === 'function') {
      rebuildBoxesFromInstances({
        source: meta && meta.source ? String(meta.source) : (reason || 'scene-session:rebuildSceneBoxes'),
        reason: reason || 'scene-session:rebuildSceneBoxes'
      });
      return true;
    }
    audit.counters.legacyFallbacks += 1;
    emit('BOUNDARY', 'rebuild-fallback-missing', { source: reason || 'unknown' });
    return false;
  }

  function recomputeDerivedIdentifiers(reason) {
    if (typeof recomputeNextInstanceSerial === 'function') recomputeNextInstanceSerial();
    if (Array.isArray(typeof boxes !== 'undefined' ? boxes : null) && boxes.length) {
      var maxBoxId = 0;
      for (var i = 0; i < boxes.length; i++) maxBoxId = Math.max(maxBoxId, Number(boxes[i] && boxes[i].id) || 0);
      nextId = maxBoxId + 1;
    } else {
      nextId = 1;
    }
    emit('BOUNDARY', 'derived-identifiers-ready', { source: reason || 'unknown', nextId: nextId, nextInstanceSerial: nextInstanceSerial });
    return { nextId: nextId, nextInstanceSerial: nextInstanceSerial };
  }

  function replaceSceneGraph(payload, meta) {
    payload = payload && typeof payload === 'object' ? payload : {};
    var previousBoxes = Array.isArray(boxes) ? boxes.slice() : [];
    instances = Array.isArray(payload.instances) ? payload.instances.slice() : (Array.isArray(instances) ? instances.slice() : []);
    if (Array.isArray(payload.boxes)) {
      boxes = payload.boxes.slice();
      updateOccupancyCacheFromBoxDiff({
        previousBoxes: previousBoxes,
        nextBoxes: boxes,
        reason: meta && meta.source ? String(meta.source) : 'replaceSceneGraph',
        source: meta && meta.source ? String(meta.source) : 'replaceSceneGraph',
        forceFullRebuild: true
      });
    } else rebuildSceneBoxes('replaceSceneGraph', meta);
    recomputeDerivedIdentifiers('replaceSceneGraph');
    recordWrite('replaceSceneGraph', {
      source: meta && meta.source ? String(meta.source) : 'unknown',
      instances: instances.length,
      boxes: boxes.length
    });
    return { instances: instances, boxes: boxes };
  }

  function addInstance(instance, meta) {
    if (!instance) return null;
    instances.push(instance);
    rebuildSceneBoxes('addInstance', meta);
    recomputeDerivedIdentifiers('addInstance');
    recordWrite('addInstance', {
      source: meta && meta.source ? String(meta.source) : 'unknown',
      instanceId: instance.instanceId || null,
      prefabId: instance.prefabId || null,
      instances: instances.length,
      boxes: boxes.length
    });
    return instance;
  }

  function replaceInstances(nextInstances, meta) {
    instances = Array.isArray(nextInstances) ? nextInstances.slice() : [];
    rebuildSceneBoxes('replaceInstances', meta);
    recomputeDerivedIdentifiers('replaceInstances');
    recordWrite('replaceInstances', {
      source: meta && meta.source ? String(meta.source) : 'unknown',
      instances: instances.length,
      boxes: boxes.length
    });
    return instances;
  }

  function allocateInstanceId(meta) {
    var value = 'obj_' + String(nextInstanceSerial++).padStart(4, '0');
    recordWrite('allocateInstanceId', {
      source: meta && meta.source ? String(meta.source) : 'unknown',
      value: value,
      nextInstanceSerial: nextInstanceSerial
    });
    return value;
  }

  function allocateBoxIdRange(count, meta) {
    var safeCount = Math.max(0, Number(count) || 0);
    var start = nextId;
    nextId += safeCount;
    recordWrite('allocateBoxIdRange', {
      source: meta && meta.source ? String(meta.source) : 'unknown',
      count: safeCount,
      start: start,
      endExclusive: nextId
    });
    return { start: start, count: safeCount, endExclusive: nextId };
  }

  function getPlacementCoreApi() {
    try {
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') return window.__APP_NAMESPACE.getPath('application.placementCore') || window.__PLACEMENT_CORE_API__ || null;
    } catch (_) {}
    try { return window.__PLACEMENT_CORE_API__ || null; } catch (_) { return null; }
  }

  function removeInstanceByIdOwned(instanceId, meta) {
    instances = (instances || []).filter(function (inst) { return inst.instanceId !== instanceId; });
    if (typeof clearSelectedInstance === 'function' && typeof inspectorState !== 'undefined' && inspectorState && inspectorState.selectedInstanceId === instanceId) {
      try { clearSelectedInstance({ source: meta && meta.source ? String(meta.source) : 'scene-session:removeInstanceById' }); } catch (_) {}
    }
    rebuildSceneBoxes('removeInstanceByIdOwned', meta);
    recomputeDerivedIdentifiers('removeInstanceById');
    recordWrite('removeInstance', {
      source: meta && meta.source ? String(meta.source) : 'unknown',
      instanceId: instanceId || null,
      instances: instances.length,
      boxes: boxes.length
    });
    return true;
  }

  function removeLooseBoxById(boxId, meta) {
    var previousBoxes = Array.isArray(boxes) ? boxes.slice() : [];
    boxes = (boxes || []).filter(function (box) { return box && box.id !== boxId; });
    updateOccupancyCacheFromBoxDiff({
      previousBoxes: previousBoxes,
      nextBoxes: boxes,
      reason: meta && meta.source ? String(meta.source) : 'removeLooseBoxById',
      source: meta && meta.source ? String(meta.source) : 'removeLooseBoxById'
    });
    recomputeDerivedIdentifiers('removeLooseBoxById');
    recordWrite('removeLooseBox', {
      source: meta && meta.source ? String(meta.source) : 'unknown',
      boxId: boxId || null,
      instances: instances.length,
      boxes: boxes.length
    });
    return true;
  }

  function restoreDefaultScene(meta) {
    nextInstanceSerial = 1;
    instances = defaultInstances();
    rebuildSceneBoxes('restoreDefaultScene', meta);
    recomputeDerivedIdentifiers('restoreDefaultScene');
    recordWrite('restoreDefaultScene', {
      source: meta && meta.source ? String(meta.source) : 'unknown',
      instances: instances.length,
      boxes: boxes.length
    });
    return summarizeSession();
  }

  function ensureNonEmptyScene(meta) {
    if (!Array.isArray(instances) || !instances.length) restoreDefaultScene({ source: meta && meta.source ? String(meta.source) : 'scene-session:ensureNonEmptyScene' });
    recordWrite('ensureNonEmptyScene', {
      source: meta && meta.source ? String(meta.source) : 'unknown',
      instances: instances.length,
      boxes: boxes.length
    });
    return summarizeSession();
  }

  function syncDerivedState(meta) {
    if (typeof filterInstancesToGrid === 'function') filterInstancesToGrid();
    rebuildSceneBoxes('syncDerivedState', meta);
    recomputeDerivedIdentifiers('syncDerivedState');
    recordWrite('syncDerivedState', {
      source: meta && meta.source ? String(meta.source) : 'unknown',
      instances: instances.length,
      boxes: boxes.length
    });
    return summarizeSession();
  }

  rebuildSceneBoxes('boot', { source: 'scene-session:boot' });
  updateOccupancyCacheFromBoxDiff({ previousBoxes: [], nextBoxes: Array.isArray(boxes) ? boxes.slice() : [], reason: 'scene-session:boot', source: 'scene-session:boot', forceFullRebuild: true });
  recomputeDerivedIdentifiers('boot');
  try {
    pushLog('初始化：instances=' + instances.length + ' boxes=' + boxes.length);
    pushLog('初始化 instances: ' + instances.map(function (inst) {
      var prefab = (typeof getPrefabById === 'function') ? getPrefabById(inst.prefabId) : null;
      var name = prefab && prefab.name ? prefab.name : String(inst.prefabId || 'unknown');
      return inst.instanceId + ':' + name + '@(' + inst.x + ',' + inst.y + ',' + inst.z + ')';
    }).join(' | '));
    pushLog('初始化 boxes: ' + boxes.map(function (b) { return typeof describeBox === 'function' ? describeBox(b) : String(b && b.id || '?'); }).join(' | '));
    pushLog('默认人物占高=' + (settings && settings.playerHeightCells != null ? settings.playerHeightCells : 'n/a') + '格');
    pushLog('scene-session-owner=' + OWNER + ' phase=' + PHASE);
  } catch (_) {}

  var sceneGraphApi = {
    owner: OWNER,
    phase: PHASE,
    summarize: summarizeSession,
    replaceSceneGraph: replaceSceneGraph,
    addInstance: addInstance,
    replaceInstances: replaceInstances,
    removeInstanceById: removeInstanceByIdOwned,
    removeLooseBoxById: removeLooseBoxById,
    applySceneSnapshotWithOwnership: function (snapshot, options) {
      recordWrite('replaceSceneGraph', { source: options && options.source ? String(options.source) : 'unknown', kind: 'applySceneSnapshotWithOwnership' });
      if (typeof applySceneSnapshot === 'function') return applySceneSnapshot(snapshot, options || {});
      audit.counters.legacyFallbacks += 1;
      return null;
    },
    getOccupancyCacheSnapshot: getOccupancyCacheSnapshot,
    ensureOccupancyCache: ensureOccupancyCache,
    updateOccupancyCacheFromBoxDiff: updateOccupancyCacheFromBoxDiff,
    getStaticWorldCacheSnapshot: getStaticWorldCacheSnapshot,
    consumeStaticWorldUpdates: consumeStaticWorldUpdates
  };

  var sessionApi = {
    owner: OWNER,
    phase: PHASE,
    summarizeSession: summarizeSession,
    summarizeWrites: summarizeWrites,
    resetAudit: resetAudit,
    restoreDefaultScene: restoreDefaultScene,
    ensureNonEmptyScene: ensureNonEmptyScene,
    syncDerivedState: syncDerivedState,
    allocateInstanceId: allocateInstanceId,
    allocateBoxIdRange: allocateBoxIdRange,
    getInstances: function () { return instances; },
    getBoxes: function () { return boxes; },
    getOccupancyCacheSnapshot: getOccupancyCacheSnapshot,
    ensureOccupancyCache: ensureOccupancyCache,
    updateOccupancyCacheFromBoxDiff: updateOccupancyCacheFromBoxDiff,
    getStaticWorldCacheSnapshot: getStaticWorldCacheSnapshot,
    consumeStaticWorldUpdates: consumeStaticWorldUpdates
  };

  try {
    window.__SCENE_GRAPH_STATE__ = sceneGraphApi;
    window.__SCENE_SESSION_STATE__ = sessionApi;
    window.__SCENE_OCCUPANCY_CACHE__ = {
      getSnapshot: getOccupancyCacheSnapshot,
      ensure: ensureOccupancyCache,
      updateFromBoxDiff: updateOccupancyCacheFromBoxDiff
    };
    window.__SCENE_STATIC_WORLD_CACHE__ = {
      getSnapshot: getStaticWorldCacheSnapshot,
      consumeUpdates: consumeStaticWorldUpdates
    };
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('state.sceneGraph', sceneGraphApi, { owner: OWNER, phase: PHASE });
      window.__APP_NAMESPACE.bind('state.sceneSession', sessionApi, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}

  emit('SUMMARY', 'scene-session-ready', summarizeWrites('boot'));
})();
