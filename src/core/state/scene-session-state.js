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

  function rebuildSceneBoxes(reason) {
    if (typeof rebuildBoxesFromInstances === 'function') {
      rebuildBoxesFromInstances();
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
    instances = Array.isArray(payload.instances) ? payload.instances.slice() : (Array.isArray(instances) ? instances.slice() : []);
    if (Array.isArray(payload.boxes)) boxes = payload.boxes.slice();
    else rebuildSceneBoxes('replaceSceneGraph');
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
    rebuildSceneBoxes('addInstance');
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
    rebuildSceneBoxes('replaceInstances');
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
    rebuildSceneBoxes('removeInstanceByIdOwned');
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
    boxes = (boxes || []).filter(function (box) { return box && box.id !== boxId; });
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
    rebuildSceneBoxes('restoreDefaultScene');
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
    rebuildSceneBoxes('syncDerivedState');
    recomputeDerivedIdentifiers('syncDerivedState');
    recordWrite('syncDerivedState', {
      source: meta && meta.source ? String(meta.source) : 'unknown',
      instances: instances.length,
      boxes: boxes.length
    });
    return summarizeSession();
  }

  rebuildSceneBoxes('boot');
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
    }
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
    getBoxes: function () { return boxes; }
  };

  try {
    window.__SCENE_GRAPH_STATE__ = sceneGraphApi;
    window.__SCENE_SESSION_STATE__ = sessionApi;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('state.sceneGraph', sceneGraphApi, { owner: OWNER, phase: PHASE });
      window.__APP_NAMESPACE.bind('state.sceneSession', sessionApi, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}

  emit('SUMMARY', 'scene-session-ready', summarizeWrites('boot'));
})();
