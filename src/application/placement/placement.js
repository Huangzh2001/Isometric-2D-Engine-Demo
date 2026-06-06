// placement（物品放置与排序）独立模块
// 第一刀只集中“物品如何放入、移动、删除，以及何时触发排序”的入口。

var PLACEMENT_MODULE_OWNER = 'src/application/placement/placement.js';
var PLACEMENT_CRITICAL_EXPORTS = [
  'allocInstanceId',
  'makeInstance',
  'createPlacedInstance',
  'recomputeNextInstanceSerial',
  'expandInstanceToBoxes',
  'rebuildBoxesFromInstances',
  'refreshPlacementOrdering',
  'findInstanceById',
  'findInstanceForBox',
  'removeInstanceById',
  'removePlacedInstance',
  'defaultInstances',
  'defaultBoxes',
  'legacyBoxesToInstances',
  'startDragging',
  'movePlacedInstance',
  'enterTerrainBlockPlacement',
  'exitTerrainBlockPlacement',
  'isTerrainBlockPlacementActive',
  'addManualTerrainFaceMergeStressPreset',
  'placeCurrentPrefab',
  'commitPreview',
  'commitPlacementPreview',
  'cancelDrag'
];
var PLACEMENT_MAINPATH_COMPAT_EXPORTS = ['startDragging', 'commitPreview', 'cancelDrag'];

(function () {
  var PLACEMENT_BOUNDARY_AUDIT_LIMIT = 80;
  var manualTerrainBlockPlacementState = {
    active: false,
    prefabId: 'cube_1x1',
    shapeLabel: '1×1×1',
    columnHeight: 1,
    materialId: '__terrain_default__',
    label: 'Manual Terrain Block',
    base: '#79b35a',
    batchId: 'manual-terrain-placement'
  };

  var placementBoundaryAudit = {
    owner: PLACEMENT_MODULE_OWNER,
    phase: 'P20-PLACEMENT',
    counters: {
      runtimeStateHits: 0,
      selectorHits: 0,
      placementEffectsHits: 0,
      routeAuditHits: 0,
      controllerHits: 0,
      ownerApiHits: 0,
      legacyGlobalHits: 0,
      compatExportHits: 0,
      compatHelperHits: 0,
      compatTotalHits: 0,
      fallbackCount: 0
    },
    compatByName: {},
    lastEvent: null,
    lastFallback: null,
    recentEvents: [],
    recentFallbacks: [],
    recentCompatExports: []
  };

  function placementSafeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function pushPlacementBoundary(bucket, entry) {
    bucket.push(entry);
    if (bucket.length > PLACEMENT_BOUNDARY_AUDIT_LIMIT) bucket.splice(0, bucket.length - PLACEMENT_BOUNDARY_AUDIT_LIMIT);
    return entry;
  }

  function placementCompatKind(name) {
    var exportName = String(name || '');
    return PLACEMENT_MAINPATH_COMPAT_EXPORTS.indexOf(exportName) >= 0 ? 'main-path' : 'helper';
  }

  function readCompatReplayContext() {
    try {
      var ctx = (typeof window !== 'undefined' && window.__ACCEPTANCE_REPLAY_CONTEXT__) ? window.__ACCEPTANCE_REPLAY_CONTEXT__ : null;
      if (!ctx) return null;
      return placementSafeClone({
        active: !!ctx.active,
        tab: ctx.tab || null,
        rootStage: ctx.rootStage || null,
        source: ctx.source || null
      });
    } catch (_) {
      return null;
    }
  }

  function readCompatCaller() {
    try {
      var stack = String((new Error()).stack || '');
      var lines = stack.split('\n').slice(2, 6).map(function (line) { return String(line || '').trim(); }).filter(Boolean);
      return lines.length ? lines.join(' | ') : '';
    } catch (_) {
      return '';
    }
  }

  function recordPlacementBoundaryEvent(kind, route, detail) {
    var entry = {
      at: (function () { try { return new Date().toISOString(); } catch (_) { return ''; } })(),
      kind: String(kind || ''),
      route: String(route || ''),
      detail: placementSafeClone(detail || null)
    };
    if (kind === 'runtime-state') placementBoundaryAudit.counters.runtimeStateHits += 1;
    else if (kind === 'selector') placementBoundaryAudit.counters.selectorHits += 1;
    else if (kind === 'placement-effects') placementBoundaryAudit.counters.placementEffectsHits += 1;
    else if (kind === 'route-audit') placementBoundaryAudit.counters.routeAuditHits += 1;
    else if (kind === 'controller') placementBoundaryAudit.counters.controllerHits += 1;
    else if (kind === 'owner-api') placementBoundaryAudit.counters.ownerApiHits += 1;
    else if (kind === 'legacy-global') placementBoundaryAudit.counters.legacyGlobalHits += 1;
    else if (kind === 'compat-export') {
      var exportName = entry.detail && entry.detail.exportName ? String(entry.detail.exportName) : '';
      var compatKind = entry.detail && entry.detail.compatKind ? String(entry.detail.compatKind) : placementCompatKind(exportName);
      placementBoundaryAudit.counters.compatTotalHits += 1;
      if (compatKind === 'main-path') placementBoundaryAudit.counters.compatExportHits += 1;
      else placementBoundaryAudit.counters.compatHelperHits += 1;
      if (!placementBoundaryAudit.compatByName[exportName]) placementBoundaryAudit.compatByName[exportName] = { total: 0, mainPath: 0, helper: 0, lastSource: '', lastCaller: '' };
      placementBoundaryAudit.compatByName[exportName].total += 1;
      if (compatKind === 'main-path') placementBoundaryAudit.compatByName[exportName].mainPath += 1;
      else placementBoundaryAudit.compatByName[exportName].helper += 1;
      placementBoundaryAudit.compatByName[exportName].lastSource = entry.detail && entry.detail.source ? String(entry.detail.source) : '';
      placementBoundaryAudit.compatByName[exportName].lastCaller = entry.detail && entry.detail.caller ? String(entry.detail.caller) : '';
      pushPlacementBoundary(placementBoundaryAudit.recentCompatExports, {
        at: entry.at,
        exportName: exportName,
        compatKind: compatKind,
        source: entry.detail && entry.detail.source ? String(entry.detail.source) : '',
        caller: entry.detail && entry.detail.caller ? String(entry.detail.caller) : ''
      });
    }
    placementBoundaryAudit.lastEvent = entry;
    pushPlacementBoundary(placementBoundaryAudit.recentEvents, entry);
    return entry;
  }

  function recordPlacementBoundaryFallback(route, detail) {
    var entry = {
      at: (function () { try { return new Date().toISOString(); } catch (_) { return ''; } })(),
      route: String(route || ''),
      detail: placementSafeClone(detail || null)
    };
    placementBoundaryAudit.counters.fallbackCount += 1;
    placementBoundaryAudit.lastFallback = entry;
    pushPlacementBoundary(placementBoundaryAudit.recentFallbacks, entry);
    return entry;
  }

  function summarizePlacementBoundary(label) {
    return {
      owner: PLACEMENT_MODULE_OWNER,
      phase: placementBoundaryAudit.phase,
      label: String(label || ''),
      available: true,
      counters: placementSafeClone(placementBoundaryAudit.counters),
      compatByName: placementSafeClone(placementBoundaryAudit.compatByName),
      compatMainPathExports: placementSafeClone(PLACEMENT_MAINPATH_COMPAT_EXPORTS),
      lastEvent: placementSafeClone(placementBoundaryAudit.lastEvent),
      lastFallback: placementSafeClone(placementBoundaryAudit.lastFallback),
      recentEvents: placementBoundaryAudit.recentEvents.slice(-8).map(placementSafeClone),
      recentFallbacks: placementBoundaryAudit.recentFallbacks.slice(-5).map(placementSafeClone),
      recentCompatExports: placementBoundaryAudit.recentCompatExports.slice(-12).map(placementSafeClone)
    };
  }

  function resetPlacementBoundaryAudit(meta) {
    placementBoundaryAudit.counters.runtimeStateHits = 0;
    placementBoundaryAudit.counters.selectorHits = 0;
    placementBoundaryAudit.counters.placementEffectsHits = 0;
    placementBoundaryAudit.counters.routeAuditHits = 0;
    placementBoundaryAudit.counters.controllerHits = 0;
    placementBoundaryAudit.counters.ownerApiHits = 0;
    placementBoundaryAudit.counters.legacyGlobalHits = 0;
    placementBoundaryAudit.counters.compatExportHits = 0;
    placementBoundaryAudit.counters.compatHelperHits = 0;
    placementBoundaryAudit.counters.compatTotalHits = 0;
    placementBoundaryAudit.counters.fallbackCount = 0;
    placementBoundaryAudit.compatByName = {};
    placementBoundaryAudit.lastEvent = null;
    placementBoundaryAudit.lastFallback = null;
    placementBoundaryAudit.recentEvents = [];
    placementBoundaryAudit.recentFallbacks = [];
    placementBoundaryAudit.recentCompatExports = [];
    recordPlacementBoundaryEvent('reset', 'placement.boundary.reset', meta || { source: 'placement:boundary-reset' });
    return summarizePlacementBoundary(meta && meta.label ? String(meta.label) : 'reset');
  }

  function getPlacementNs() {
    try {
      return (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') ? window.__APP_NAMESPACE : null;
    } catch (_) { return null; }
  }

  function placementPath(name) {
    var ns = getPlacementNs();
    if (!ns) return null;
    try { return ns.getPath(String(name || '')) || null; } catch (_) { return null; }
  }

  function getPlacementRouteAuditApi() {
    var api = placementPath('placement.routeAudit') || null;
    if (api) {
      recordPlacementBoundaryEvent('route-audit', 'placement.routeAudit', { source: 'placement:getPlacementRouteAuditApi' });
      return api;
    }
    try {
      var legacy = (typeof window !== 'undefined') ? (window.__PLACEMENT_ROUTE_AUDIT__ || null) : null;
      if (legacy) {
        recordPlacementBoundaryEvent('legacy-global', 'window.__PLACEMENT_ROUTE_AUDIT__', { source: 'placement:getPlacementRouteAuditApi' });
        recordPlacementBoundaryFallback('window.__PLACEMENT_ROUTE_AUDIT__', { source: 'placement:getPlacementRouteAuditApi', reason: 'missing-placement.routeAudit-path' });
      }
      return legacy;
    } catch (_) {
      return null;
    }
  }

  function recordItemRotationDiagnostic(kind, payload) {
    var api = placementPath('infrastructure.itemRotationDiagnostic') || (typeof window !== 'undefined' ? window.__ITEM_ROTATION_DIAGNOSTIC__ || null : null);
    if (api && typeof api.record === 'function') {
      try { api.record(kind, payload || null); } catch (_) {}
    }
  }

  function placementRoute(event, payload) {
    var audit = getPlacementRouteAuditApi();
    if (audit && typeof audit.recordCoreRoute === 'function') {
      try { audit.recordCoreRoute(event, payload || null); } catch (_) {}
    }
    try {
      if (typeof logRoute === 'function') {
        logRoute('placement', event, payload);
        return;
      }
    } catch (err) {}
    if (typeof detailLog === 'function') {
      try {
        detailLog('[route][placement] ' + event + (payload ? ' ' + JSON.stringify(payload) : ''));
      } catch (err) {}
    }
  }

  function placementStateWrite(action, extra) {
    if (typeof window !== 'undefined' && window.__STATE_OWNER_MAP__ && typeof window.__STATE_OWNER_MAP__.recordWrite === 'function') {
      window.__STATE_OWNER_MAP__.recordWrite('src/infrastructure/legacy/state.js', action, extra || null);
    }
  }

  function getSceneGraphOwnerApi() {
    var api = placementPath('state.sceneGraph') || null;
    if (api) {
      recordPlacementBoundaryEvent('owner-api', 'state.sceneGraph', { source: 'placement:getSceneGraphOwnerApi' });
      return api;
    }
    return null;
  }

  function getSceneSessionApi() {
    var api = placementPath('state.sceneSession') || null;
    if (api) {
      recordPlacementBoundaryEvent('owner-api', 'state.sceneSession', { source: 'placement:getSceneSessionApi' });
      return api;
    }
    return null;
  }

  function getDomainSceneCoreApi() {
    var api = placementPath('domain.sceneCore') || null;
    if (api) {
      recordPlacementBoundaryEvent('owner-api', 'domain.sceneCore', { source: 'placement:getDomainSceneCoreApi' });
      return api;
    }
    return null;
  }

  function getPlacementEffectsApi() {
    var api = placementPath('placement.effects') || null;
    if (api) {
      recordPlacementBoundaryEvent('placement-effects', 'placement.effects', { source: 'placement:getPlacementEffectsApi' });
      return api;
    }
    try {
      var legacy = (typeof window !== 'undefined') ? (window.__PLACEMENT_EFFECTS__ || null) : null;
      if (legacy) {
        recordPlacementBoundaryEvent('legacy-global', 'window.__PLACEMENT_EFFECTS__', { source: 'placement:getPlacementEffectsApi' });
        recordPlacementBoundaryFallback('window.__PLACEMENT_EFFECTS__', { source: 'placement:getPlacementEffectsApi', reason: 'missing-placement.effects-path' });
      }
      return legacy;
    } catch (_) {
      return null;
    }
  }

  function getPlacementControllerApi() {
    var api = placementPath('controllers.placement') || null;
    if (api) {
      recordPlacementBoundaryEvent('controller', 'controllers.placement', { source: 'placement:getPlacementControllerApi' });
      return api;
    }
    return null;
  }

  function getRuntimeStateApi() {
    var api = placementPath('state.runtimeState') || null;
    if (api) {
      recordPlacementBoundaryEvent('runtime-state', 'state.runtimeState', { source: 'placement:getRuntimeStateApi' });
      return api;
    }
    return null;
  }

  function getStateActionsApi() {
    var api = placementPath('state.actions') || null;
    if (api) {
      recordPlacementBoundaryEvent('owner-api', 'state.actions', { source: 'placement:getStateActionsApi' });
      return api;
    }
    return null;
  }

  function getSelectorsApi() {
    var api = placementPath('state.selectors') || null;
    if (api) {
      recordPlacementBoundaryEvent('selector', 'state.selectors', { source: 'placement:getSelectorsApi' });
      return api;
    }
    return null;
  }

  function getPlacementEditorRef() {
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && runtimeApi.editor) return runtimeApi.editor;
    try {
      var legacyEditor = (typeof editor !== 'undefined' && editor) ? editor : null;
      if (legacyEditor) {
        recordPlacementBoundaryEvent('legacy-global', 'global.editor', { source: 'placement:getPlacementEditorRef' });
        recordPlacementBoundaryFallback('global.editor', { source: 'placement:getPlacementEditorRef', reason: 'missing-runtimeState.editor' });
      }
      return legacyEditor;
    } catch (_) {
      return null;
    }
  }

  function getPlacementSettings() {
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && runtimeApi.settings) return runtimeApi.settings;
    try {
      var legacySettings = (typeof settings !== 'undefined' && settings) ? settings : null;
      if (legacySettings) {
        recordPlacementBoundaryEvent('legacy-global', 'global.settings', { source: 'placement:getPlacementSettings' });
        recordPlacementBoundaryFallback('global.settings', { source: 'placement:getPlacementSettings', reason: 'missing-runtimeState.settings' });
      }
      return legacySettings || {};
    } catch (_) {
      return {};
    }
  }

  function getSelectedPrefabIdForPlacement(source) {
    var selectors = getSelectorsApi();
    if (selectors && typeof selectors.getSelectedPrefabId === 'function') {
      var selectedId = selectors.getSelectedPrefabId() || null;
      recordPlacementBoundaryEvent('selector', 'state.selectors.getSelectedPrefabId', { source: String(source || 'unknown'), prefabId: selectedId });
      return selectedId;
    }
    try {
      if (typeof currentProto === 'function' && currentProto()) {
        var legacyId = currentProto().id || null;
        recordPlacementBoundaryEvent('legacy-global', 'currentProto', { source: String(source || 'unknown'), prefabId: legacyId });
        recordPlacementBoundaryFallback('currentProto', { source: String(source || 'unknown'), reason: 'missing-state.selectors.getSelectedPrefabId' });
        return legacyId;
      }
    } catch (_) {}
    return null;
  }

  function placementWarn(message, extra) {
    try {
      if (typeof logWarn === 'function') {
        logWarn(message, extra);
        return;
      }
    } catch (err) {}
    if (typeof pushLog === 'function') {
      try { pushLog('[placement-warn] ' + message); } catch (err) {}
    }
  }


  function placementFailFast(name, reason) {
    var msg = '[LEGACY-PLACEMENT-PATH-CALLED] ' + String(name || 'unknown') + ' ' + String(reason || ('should only resolve through ' + PLACEMENT_MODULE_OWNER));
    try {
      if (typeof logFailFast === 'function') {
        logFailFast('LEGACY-PLACEMENT-PATH-CALLED', String(name || 'unknown'), String(reason || ('should only resolve through ' + PLACEMENT_MODULE_OWNER)));
      }
    } catch (err) {}
    try {
      if (typeof detailLog === 'function') detailLog(msg);
      else if (typeof pushLog === 'function') pushLog(msg);
      else if (typeof console !== 'undefined' && console.error) console.error(msg);
    } catch (err) {}
    throw new Error(msg);
  }

  function assertPlacementOwnership(context) {
    var label = String(context || 'unspecified');
    for (var i = 0; i < PLACEMENT_CRITICAL_EXPORTS.length; i++) {
      var name = PLACEMENT_CRITICAL_EXPORTS[i];
      var fn = window[name];
      if (typeof fn !== 'function') {
        placementFailFast(name, 'missing export during ' + label);
      }
      if (fn.__placementModuleOwner !== PLACEMENT_MODULE_OWNER) {
        placementFailFast(name, 'owner=' + String(fn.__placementModuleOwner || 'unknown') + ' during ' + label);
      }
    }
    placementRoute('ownership-ok', { context: label, exports: PLACEMENT_CRITICAL_EXPORTS.length });
    return true;
  }

  function tagPlacementExport(name) {
    var fn = window[name];
    if (typeof fn !== 'function') return;
    try {
      fn.__placementModuleOwner = PLACEMENT_MODULE_OWNER;
      fn.__placementExportName = name;
    } catch (err) {}
  }

  function installCompatExport(name, fn) {
    if (typeof fn !== 'function') return;
    var wrapped = function () {
      var exportName = String(name || '');
      recordPlacementBoundaryEvent('compat-export', 'window.' + exportName, {
        source: 'placement:compat-export-call',
        exportName: exportName,
        compatKind: placementCompatKind(exportName),
        caller: readCompatCaller(),
        replayContext: readCompatReplayContext()
      });
      return fn.apply(this, arguments);
    };
    window[name] = wrapped;
    tagPlacementExport(name);
  }



  function isStairTracePrefabId(prefabId) {
    return /^stair_mc_(2|4|8)step$/.test(String(prefabId || ''));
  }

  function summarizeStairTraceBoxes(boxList) {
    var list = Array.isArray(boxList) ? boxList : [];
    return list.map(function (b, i) {
      return {
        i: i,
        id: b && b.id != null ? b.id : null,
        instanceId: b && b.instanceId || null,
        prefabId: b && b.prefabId || null,
        role: b && b.stairRole || null,
        localIndex: b && b.localIndex != null ? b.localIndex : null,
        x: Number(b && b.x || 0),
        y: Number(b && b.y || 0),
        z: Number(b && b.z || 0),
        w: Number(b && b.w != null ? b.w : 1),
        d: Number(b && b.d != null ? b.d : 1),
        h: Number(b && b.h != null ? b.h : 1)
      };
    });
  }

  function emitStairPlaceTrace(phase, payload) {
    payload = payload || {};
    payload.phase = String(phase || 'unknown');
    payload.source = payload.source || 'src/application/placement/placement.js';
    try {
      var line = '[STAIR-PLACE-TRACE] ' + JSON.stringify(payload);
      if (typeof detailLog === 'function') detailLog(line);
      else if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console && typeof console.log === 'function') console.log(line);
    } catch (_) {}
  }

  function allocInstanceId(meta) {
    var sceneSessionApi = getSceneSessionApi();
    if (sceneSessionApi && typeof sceneSessionApi.allocateInstanceId === 'function') {
      placementRoute('allocInstanceId:owner-hit', { source: meta && meta.source ? String(meta.source) : 'placement:allocInstanceId' });
      return sceneSessionApi.allocateInstanceId({ source: meta && meta.source ? String(meta.source) : 'placement:allocInstanceId' });
    }
    placementRoute('allocInstanceId:legacy-fallback', { reason: 'missing-scene-session-api' });
    placementStateWrite('allocInstanceId', { source: meta && meta.source ? String(meta.source) : 'placement:allocInstanceId', fallback: true });
    return 'obj_' + String(nextInstanceSerial++).padStart(4, '0');
  }

  function makeInstance(prefabId, x, y, z, rotation, extras) {
    extras = extras || {};
    placementRoute('makeInstance', { prefabId: prefabId, x: x, y: y, z: z || 0, rotation: rotation || 0, instanceId: extras.instanceId || null });
    var base = {
      instanceId: extras.instanceId || allocInstanceId({ source: extras && extras.source ? extras.source : 'placement:makeInstance' }),
      prefabId: prefabId,
      x: x,
      y: y,
      z: z || 0,
      rotation: rotation || 0,
      name: extras.name,
    };
    var merged = Object.assign({}, extras, base);
    delete merged.source;
    return merged;
  }

  function createPlacedInstance(prefabId, x, y, z, rotation, extras) {
    return makeInstance(prefabId, x, y, z, rotation, extras);
  }

  function isMicroTriPrismPrefabId(prefabId) {
    return String(prefabId || '') === 'micro_tri_prism';
  }

  function isCompatibleAxisBlockPrefabId(prefabId) {
    return String(prefabId || '') === 'compatible_axis_block';
  }

  function normalizeMicroTriMeta(meta) {
    var safe = meta && typeof meta === 'object' ? meta : {};
    var subdivision = Math.max(1, Math.min(64, Math.round(Number(safe.subdivision) || Number(safe.subTileGridSubdivision) || 1)));
    var rawTri = safe.baseTriIndex != null ? safe.baseTriIndex : (safe.rawTriIndex != null ? safe.rawTriIndex : safe.triIndex);
    var baseTriIndex = Math.max(0, Math.min(3, Math.round(Number(rawTri) || 0)));
    var rotation = (((Math.round(Number(safe.rotation) || 0) % 4) + 4) % 4);
    var triIndex = (baseTriIndex + rotation) % 4;
    var subX = Math.max(0, Math.min(subdivision - 1, Math.round(Number(safe.subX) || 0)));
    var subY = Math.max(0, Math.min(subdivision - 1, Math.round(Number(safe.subY) || 0)));
    var cellX = Math.floor(Number(safe.cellX != null ? safe.cellX : safe.baseCellX) || Number(safe.originCellX) || 0);
    var cellY = Math.floor(Number(safe.cellY != null ? safe.cellY : safe.baseCellY) || Number(safe.originCellY) || 0);
    var size = 1 / subdivision;
    var originX = cellX + subX * size;
    var originY = cellY + subY * size;
    return {
      subdivision: subdivision,
      subX: subX,
      subY: subY,
      baseTriIndex: baseTriIndex,
      rawTriIndex: baseTriIndex,
      rotation: rotation,
      triIndex: triIndex,
      cellX: cellX,
      cellY: cellY,
      originX: originX,
      originY: originY,
      size: size,
      h: Math.max(0.001, Number(safe.h) || 1)
    };
  }

  function buildMicroTriVertices(meta) {
    var m = normalizeMicroTriMeta(meta);
    var x0 = Number(m.originX || 0);
    var y0 = Number(m.originY || 0);
    var s = Number(m.size || 1);
    var c = { x: x0 + s / 2, y: y0 + s / 2 };
    switch (m.triIndex) {
      case 1: return [{ x: x0 + s, y: y0 }, { x: x0 + s, y: y0 + s }, c];
      case 2: return [{ x: x0 + s, y: y0 + s }, { x: x0, y: y0 + s }, c];
      case 3: return [{ x: x0, y: y0 + s }, { x: x0, y: y0 }, c];
      case 0:
      default: return [{ x: x0, y: y0 }, { x: x0 + s, y: y0 }, c];
    }
  }

  function buildMicroTriBoxFromMeta(instance, meta, assignId, localIndex) {
    var m = normalizeMicroTriMeta(Object.assign({}, meta || (instance && instance.microTri) || {}, { rotation: instance && instance.rotation != null ? instance.rotation : (meta && meta.rotation) }));
    var verts = buildMicroTriVertices(m);
    var minX = Math.min(verts[0].x, verts[1].x, verts[2].x);
    var minY = Math.min(verts[0].y, verts[1].y, verts[2].y);
    var maxX = Math.max(verts[0].x, verts[1].x, verts[2].x);
    var maxY = Math.max(verts[0].y, verts[1].y, verts[2].y);
    return {
      id: assignId,
      instanceId: instance && instance.instanceId || null,
      prefabId: 'micro_tri_prism',
      name: instance && instance.name || 'Micro Tri Prism',
      x: minX,
      y: minY,
      z: Number(instance && instance.z || 0),
      w: Math.max(0.001, maxX - minX),
      d: Math.max(0.001, maxY - minY),
      h: Math.max(0.001, Number(m.h) || 1),
      shapeKind: 'micro_tri_prism',
      collisionPolygon2d: verts,
      renderHidden: true,
      collisionOnly: true,
      base: instance && instance.base || '#e39b4f',
      microTriSubdivision: m.subdivision,
      microTriSubX: m.subX,
      microTriSubY: m.subY,
      microTriIndex: m.triIndex,
      microTriCellX: m.cellX,
      microTriCellY: m.cellY,
      localX: minX - m.cellX,
      localY: minY - m.cellY,
      localZ: 0,
      localW: Math.max(0.001, maxX - minX),
      localD: Math.max(0.001, maxY - minY),
      localH: Math.max(0.001, Number(m.h) || 1),
      rotation: Number(instance && instance.rotation) || 0,
      localIndex: localIndex || 0
    };
  }

  function buildMicroTriPrimitiveFromMeta(instance, meta, localIndex) {
    var m = normalizeMicroTriMeta(Object.assign({}, meta || (instance && instance.microTri) || {}, { rotation: instance && instance.rotation != null ? instance.rotation : (meta && meta.rotation) }));
    var verts = buildMicroTriVertices(m);
    return {
      id: String(instance && instance.instanceId || 'instance') + ':micro-tri:' + String(localIndex || 0),
      instanceId: instance && instance.instanceId || null,
      prefabId: 'micro_tri_prism',
      name: instance && instance.name || 'Micro Tri Prism',
      primitiveId: 'micro-tri-' + m.cellX + '-' + m.cellY + '-' + m.subX + '-' + m.subY + '-' + m.triIndex,
      primitiveKind: 'vertical_tri_prism',
      kind: 'vertical_tri_prism',
      vertices2d: verts,
      z: Number(instance && instance.z || 0),
      h: Math.max(0.001, Number(m.h) || 1),
      sortCell: { x: m.cellX, y: m.cellY, z: Number(instance && instance.z || 0) },
      sortFootprint: { w: 1 / m.subdivision, d: 1 / m.subdivision },
      base: instance && instance.base || '#e39b4f',
      shapeKind: 'micro_tri_prism',
      rotation: Number(instance && instance.rotation) || 0,
      localIndex: localIndex || 0,
      microTri: m,
      renderUpdateMode: instance && instance.renderUpdateMode || 'dynamic'
    };
  }


  function normalizeCompatibleAxisMeta(meta) {
    var safe = meta && typeof meta === 'object' ? meta : {};
    var subdivision = Math.max(1, Math.min(64, Math.round(Number(safe.subdivision) || Number(safe.subTileGridSubdivision) || 1)));
    var subX = Math.max(0, Math.min(subdivision - 1, Math.round(Number(safe.subX) || 0)));
    var subY = Math.max(0, Math.min(subdivision - 1, Math.round(Number(safe.subY) || 0)));
    var cellX = Math.floor(Number(safe.cellX != null ? safe.cellX : safe.baseCellX) || Number(safe.originCellX) || 0);
    var cellY = Math.floor(Number(safe.cellY != null ? safe.cellY : safe.baseCellY) || Number(safe.originCellY) || 0);
    var k = Math.max(1, Math.round(Number(safe.k) || (2 * subdivision / Math.sqrt(3))));
    var atomStep = Math.sqrt(3) / (2 * subdivision);
    var approximatedLength = k * atomStep;
    var size = 1 / subdivision;
    var x0 = cellX + subX * size;
    var y0 = cellY + subY * size;
    // Non-slanted visual/logic footprint: use the two isometric diagonal axes.
    // u projects horizontally on screen; v projects vertically/down on screen.
    // The first logical edge is fixed to 1, represented as 2 * uScale.
    // The second edge uses k atom steps, represented by vScale = k/(2N),
    // whose metric length is k*sqrt(3)/(2N) ~= 1.
    var uScale = 0.5;
    var vScale = k / (2 * subdivision);
    var rotation = ((Math.round(Number(safe.rotation) || 0) % 4) + 4) % 4;
    return {
      subdivision: subdivision,
      cellX: cellX,
      cellY: cellY,
      subX: subX,
      subY: subY,
      rotation: rotation,
      k: k,
      atomStep: atomStep,
      targetLength: 1,
      approximatedLength: approximatedLength,
      errorAbs: Math.abs(approximatedLength - 1),
      errorPctOfOne: Math.abs(approximatedLength - 1) * 100,
      originX: x0,
      originY: y0,
      axisWidth: 1,
      axisDepth: approximatedLength,
      uScale: uScale,
      vScale: vScale,
      h: Math.max(0.001, Number(safe.h) || 1)
    };
  }

  function buildCompatibleAxisVertices(meta) {
    var m = normalizeCompatibleAxisMeta(meta);
    var x0 = Number(m.originX || 0);
    var y0 = Number(m.originY || 0);
    var exact = Number(m.uScale || 0.5);
    var approx = Number(m.vScale || 0.5);
    var r = ((Math.round(Number(m.rotation) || 0) % 4) + 4) % 4;
    // Two screen-axis directions in world coordinates:
    // A=(+,-) maps to the horizontal compatible edge. A length 1 is exact=0.5.
    // B=(+,+) maps to the vertical/down compatible edge. B length is approximated by approx=k/(2N).
    // Rotation swaps/signs these two axes while keeping both edges on the same atom-compatible lattice.
    var e1;
    var e2;
    if (r === 1) {
      e1 = { x: approx, y: approx };
      e2 = { x: -exact, y: exact };
    } else if (r === 2) {
      e1 = { x: -exact, y: exact };
      e2 = { x: -approx, y: -approx };
    } else if (r === 3) {
      e1 = { x: -approx, y: -approx };
      e2 = { x: exact, y: -exact };
    } else {
      e1 = { x: exact, y: -exact };
      e2 = { x: approx, y: approx };
    }
    return [
      { x: x0, y: y0 },
      { x: x0 + e1.x, y: y0 + e1.y },
      { x: x0 + e1.x + e2.x, y: y0 + e1.y + e2.y },
      { x: x0 + e2.x, y: y0 + e2.y }
    ];
  }

  function getPolygonBounds2d(points) {
    var pts = Array.isArray(points) ? points : [];
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      var x = Number(pts[i] && pts[i].x || 0);
      var y = Number(pts[i] && pts[i].y || 0);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return { x: 0, y: 0, w: 1, d: 1 };
    return { x: minX, y: minY, w: Math.max(0.001, maxX - minX), d: Math.max(0.001, maxY - minY) };
  }

  function pointInPolygon2dCompat(pt, poly) {
    var x = Number(pt && pt.x || 0);
    var y = Number(pt && pt.y || 0);
    var vs = Array.isArray(poly) ? poly : [];
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      var xi = Number(vs[i] && vs[i].x || 0), yi = Number(vs[i] && vs[i].y || 0);
      var xj = Number(vs[j] && vs[j].x || 0), yj = Number(vs[j] && vs[j].y || 0);
      var cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi);
      var dot = (x - xi) * (xj - xi) + (y - yi) * (yj - yi);
      var len2 = (xj - xi) * (xj - xi) + (yj - yi) * (yj - yi);
      if (Math.abs(cross) < 1e-9 && dot >= -1e-9 && dot <= len2 + 1e-9) return true;
      var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function buildMicroTriVerticesFromCell(cellX, cellY, subX, subY, triIndex, subdivision) {
    var n = Math.max(1, Math.min(64, Math.round(Number(subdivision) || 1)));
    var s = 1 / n;
    var x0 = Number(cellX || 0) + Math.max(0, Math.min(n - 1, Math.round(Number(subX) || 0))) * s;
    var y0 = Number(cellY || 0) + Math.max(0, Math.min(n - 1, Math.round(Number(subY) || 0))) * s;
    var c = { x: x0 + s / 2, y: y0 + s / 2 };
    switch (Math.max(0, Math.min(3, Math.round(Number(triIndex) || 0)))) {
      case 1: return [{ x: x0 + s, y: y0 }, { x: x0 + s, y: y0 + s }, c];
      case 2: return [{ x: x0 + s, y: y0 + s }, { x: x0, y: y0 + s }, c];
      case 3: return [{ x: x0, y: y0 + s }, { x: x0, y: y0 }, c];
      case 0:
      default: return [{ x: x0, y: y0 }, { x: x0 + s, y: y0 }, c];
    }
  }

  function centroidOfTriangle2d(verts) {
    return {
      x: (Number(verts[0].x || 0) + Number(verts[1].x || 0) + Number(verts[2].x || 0)) / 3,
      y: (Number(verts[0].y || 0) + Number(verts[1].y || 0) + Number(verts[2].y || 0)) / 3
    };
  }

  function buildCompatibleAxisAtomMetas(meta) {
    var m = normalizeCompatibleAxisMeta(meta || {});
    var n = Math.max(1, Math.min(64, Math.round(Number(m.subdivision) || 1)));
    var k = Math.max(1, Math.round(Number(m.k) || (2 * n / Math.sqrt(3))));
    var halfStep = 1 / (2 * n);
    var r = ((Math.round(Number(m.rotation) || 0) % 4) + 4) % 4;

    // Deterministic atom strip generator.
    // Do NOT select atoms by centroid-in-polygon; that changes the real bounds
    // with rotation and makes the reported L_N disagree with the generated shape.
    // Instead, generate exactly N strips along the exact edge and k strips along
    // the approximated edge.  Each strip cell is split into two triangular atoms.
    var exactDir;
    var approxDir;
    if (r === 1) {
      exactDir = { x: 1, y: 1 };
      approxDir = { x: -1, y: 1 };
    } else if (r === 2) {
      exactDir = { x: -1, y: 1 };
      approxDir = { x: -1, y: -1 };
    } else if (r === 3) {
      exactDir = { x: -1, y: -1 };
      approxDir = { x: 1, y: -1 };
    } else {
      exactDir = { x: 1, y: -1 };
      approxDir = { x: 1, y: 1 };
    }
    var exactStep = { x: exactDir.x * halfStep, y: exactDir.y * halfStep };
    var approxStep = { x: approxDir.x * halfStep, y: approxDir.y * halfStep };
    var origin = { x: Number(m.originX || 0), y: Number(m.originY || 0) };
    var atoms = [];
    var allPts = [];
    function sortCellFromVerts(verts) {
      var cx = (Number(verts[0].x || 0) + Number(verts[1].x || 0) + Number(verts[2].x || 0)) / 3;
      var cy = (Number(verts[0].y || 0) + Number(verts[1].y || 0) + Number(verts[2].y || 0)) / 3;
      return { x: Math.floor(cx), y: Math.floor(cy) };
    }
    function pushTri(verts, exactIndex, approxIndex, splitIndex) {
      var sc = sortCellFromVerts(verts);
      for (var p = 0; p < verts.length; p++) allPts.push(verts[p]);
      atoms.push({
        subdivision: n,
        cellX: sc.x,
        cellY: sc.y,
        subX: Math.max(0, Math.min(n - 1, Math.floor(((verts[0].x - sc.x) + 1) * n) % n)),
        subY: Math.max(0, Math.min(n - 1, Math.floor(((verts[0].y - sc.y) + 1) * n) % n)),
        baseTriIndex: splitIndex,
        rawTriIndex: splitIndex,
        rotation: 0,
        triIndex: splitIndex,
        h: m.h,
        compatibleAxis: true,
        verts: verts,
        exactIndex: exactIndex,
        approxIndex: approxIndex,
        splitIndex: splitIndex,
        sortCell: sc
      });
    }
    for (var b = 0; b < k; b++) {
      for (var a = 0; a < n; a++) {
        var p0 = {
          x: origin.x + exactStep.x * a + approxStep.x * b,
          y: origin.y + exactStep.y * a + approxStep.y * b
        };
        var p1 = { x: p0.x + exactStep.x, y: p0.y + exactStep.y };
        var p2 = { x: p1.x + approxStep.x, y: p1.y + approxStep.y };
        var p3 = { x: p0.x + approxStep.x, y: p0.y + approxStep.y };
        pushTri([p0, p1, p2], a, b, 0);
        pushTri([p0, p2, p3], a, b, 1);
      }
    }
    var footprint = [
      origin,
      { x: origin.x + exactStep.x * n, y: origin.y + exactStep.y * n },
      { x: origin.x + exactStep.x * n + approxStep.x * k, y: origin.y + exactStep.y * n + approxStep.y * k },
      { x: origin.x + approxStep.x * k, y: origin.y + approxStep.y * k }
    ];
    var actualBounds = getPolygonBounds2d(allPts.length ? allPts : footprint);
    return {
      meta: Object.assign({}, m, {
        k: k,
        atomCount: atoms.length,
        generatedMode: 'integer-atom-strip',
        actualBounds: actualBounds,
        exactAtomCount: n,
        approximateAtomCount: k
      }),
      polygon: footprint,
      atoms: atoms
    };
  }


  function buildCompatibleAxisBoxesFromMeta(instance, meta, assignIdStart, localIndexStart) {
    var built = buildCompatibleAxisAtomMetas(meta || (instance && instance.compatibleAxis) || {});
    var atoms = built.atoms;
    var out = [];
    for (var i = 0; i < atoms.length; i++) {
      var atomMeta = atoms[i];
      var verts = Array.isArray(atomMeta.verts) ? atomMeta.verts : buildMicroTriVerticesFromCell(atomMeta.cellX, atomMeta.cellY, atomMeta.subX, atomMeta.subY, atomMeta.triIndex, atomMeta.subdivision);
      var bounds = getPolygonBounds2d(verts);
      out.push({
        id: (assignIdStart || 1) + i,
        instanceId: instance && instance.instanceId || null,
        prefabId: 'compatible_axis_block',
        name: instance && instance.name || 'Compatible Axis Block',
        x: bounds.x,
        y: bounds.y,
        z: Number(instance && instance.z || 0),
        w: bounds.w,
        d: bounds.d,
        h: Math.max(0.001, Number(built.meta.h) || 1),
        shapeKind: 'compatible_axis_block_atom',
        collisionPolygon2d: verts,
        renderHidden: true,
        collisionOnly: true,
        base: instance && instance.base || '#5dbb8a',
        compatibleAxisSubdivision: built.meta.subdivision,
        compatibleAxisK: built.meta.k,
        compatibleAxisApproximatedLength: built.meta.approximatedLength,
        compatibleAxisErrorAbs: built.meta.errorAbs,
        compatibleAxisAtomCount: atoms.length,
        compatibleAxisAtomIndex: i,
        microTriSubdivision: atomMeta.subdivision,
        microTriSubX: atomMeta.subX,
        microTriSubY: atomMeta.subY,
        microTriIndex: atomMeta.triIndex,
        microTriCellX: atomMeta.cellX,
        microTriCellY: atomMeta.cellY,
        localX: bounds.x - built.meta.cellX,
        localY: bounds.y - built.meta.cellY,
        localZ: 0,
        localW: bounds.w,
        localD: bounds.d,
        localH: Math.max(0.001, Number(built.meta.h) || 1),
        rotation: Number(instance && instance.rotation) || 0,
        localIndex: (localIndexStart || 0) + i
      });
    }
    return out;
  }

  function buildCompatibleAxisPrimitivesFromMeta(instance, meta, localIndexStart) {
    var built = buildCompatibleAxisAtomMetas(meta || (instance && instance.compatibleAxis) || {});
    var atoms = built.atoms;
    var out = [];
    for (var i = 0; i < atoms.length; i++) {
      var atomMeta = atoms[i];
      var verts = Array.isArray(atomMeta.verts) ? atomMeta.verts : buildMicroTriVerticesFromCell(atomMeta.cellX, atomMeta.cellY, atomMeta.subX, atomMeta.subY, atomMeta.triIndex, atomMeta.subdivision);
      out.push({
        id: String(instance && instance.instanceId || 'instance') + ':compatible-axis-atom:' + String(i),
        instanceId: instance && instance.instanceId || null,
        prefabId: 'compatible_axis_block',
        name: instance && instance.name || 'Compatible Axis Block',
        primitiveId: 'compatible-axis-atom-' + atomMeta.cellX + '-' + atomMeta.cellY + '-' + atomMeta.subX + '-' + atomMeta.subY + '-' + atomMeta.triIndex,
        primitiveKind: 'vertical_tri_prism',
        kind: 'vertical_tri_prism',
        vertices2d: verts,
        z: Number(instance && instance.z || 0),
        h: Math.max(0.001, Number(built.meta.h) || 1),
        sortCell: { x: (atomMeta.sortCell && atomMeta.sortCell.x != null ? atomMeta.sortCell.x : atomMeta.cellX), y: (atomMeta.sortCell && atomMeta.sortCell.y != null ? atomMeta.sortCell.y : atomMeta.cellY), z: Number(instance && instance.z || 0) },
        sortFootprint: { w: 1 / atomMeta.subdivision, d: 1 / atomMeta.subdivision },
        base: instance && instance.base || '#5dbb8a',
        shapeKind: 'compatible_axis_block_atom',
        rotation: Number(instance && instance.rotation) || 0,
        localIndex: (localIndexStart || 0) + i,
        microTri: atomMeta,
        compatibleAxis: Object.assign({}, built.meta, { atomCount: atoms.length }),
        renderUpdateMode: instance && instance.renderUpdateMode || 'dynamic'
      });
    }
    return out;
  }

  function recomputeNextInstanceSerial() {
    var maxNum = 0;
    for (var i = 0; i < instances.length; i++) {
      var m = String(instances[i].instanceId || '').match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, Number(m[1]));
    }
    nextInstanceSerial = maxNum + 1;
    placementRoute('recomputeNextInstanceSerial', { nextInstanceSerial: nextInstanceSerial });
  }

  function expandInstanceToBoxes(instance, assignIds, options) {
    if (assignIds === void 0) assignIds = true;
    options = options || {};
    var prefab = getPrefabById(instance.prefabId);
    if (isMicroTriPrismPrefabId(instance && instance.prefabId)) {
      var microId = assignIds ? 1 : 1;
      return [buildMicroTriBoxFromMeta(instance, instance.microTri || instance, microId, 0)];
    }
    if (isCompatibleAxisBlockPrefabId(instance && instance.prefabId)) {
      var compatibleId = assignIds ? 1 : 1;
      return buildCompatibleAxisBoxesFromMeta(instance, Object.assign({}, instance.compatibleAxis || {}, { rotation: instance.rotation }), compatibleId, 0);
    }
    var variant = prefabVariant(prefab, instance.rotation || 0);
    var out = [];
    var nextBoxId = 1;
    if (assignIds) {
      if (options.localIds) nextBoxId = Math.max(1, Number(options.startingBoxId) || 1);
      else {
        var sceneSessionApi = getSceneSessionApi();
        if (sceneSessionApi && typeof sceneSessionApi.allocateBoxIdRange === 'function') {
          var range = sceneSessionApi.allocateBoxIdRange(variant.voxels.length, { source: options.source || 'placement:expandInstanceToBoxes' });
          nextBoxId = range && typeof range.start === 'number' ? range.start : 1;
          placementRoute('expandInstanceToBoxes:owner-hit', { source: options.source || 'placement:expandInstanceToBoxes', count: variant.voxels.length });
        } else {
          placementRoute('expandInstanceToBoxes:legacy-fallback', { reason: 'missing-scene-session-api', count: variant.voxels.length });
          nextBoxId = nextId;
          nextId += variant.voxels.length;
          placementStateWrite('allocateBoxIdRange', { source: options.source || 'placement:expandInstanceToBoxes', count: variant.voxels.length, fallback: true });
        }
      }
    }
    for (var i = 0; i < variant.voxels.length; i++) {
      var v = variant.voxels[i];
      // Metadata preservation regression markers: liquidDepth: v.liquidDepth / waterAmount: v.waterAmount
      var voxelShapeKind = v.shapeKind || prefab.shapeKind || null;
      var voxelLiquidType = v.liquidType != null ? String(v.liquidType) : (v.fluidType != null ? String(v.fluidType) : null);
      var isRuntimeLiquidVoxel = String(voxelShapeKind || '').toLowerCase() === 'liquid_water'
        || String(voxelLiquidType || '').toLowerCase() === 'water'
        || String(prefab.id || '').indexOf('liquid_water') === 0;
      var instanceWaterAmount = instance && instance.waterAmount != null
        ? Math.max(0, Math.min(1, Number(instance.waterAmount) || 0))
        : (instance && instance.fluidAmount != null ? Math.max(0, Math.min(1, Number(instance.fluidAmount) || 0)) : null);
      var instanceRenderLevel = instance && instance.renderWaterLevel != null
        ? Math.max(0, Math.min(1, Number(instance.renderWaterLevel) || 0))
        : (instance && instance.liquidDepth != null ? Math.max(0, Math.min(1, Number(instance.liquidDepth) || 0)) : instanceWaterAmount);
      var voxelLiquidDepth = v.liquidDepth != null ? Math.max(0, Math.min(1, Number(v.liquidDepth) || 0)) : (v.waterAmount != null ? Math.max(0, Math.min(1, Number(v.waterAmount) || 0)) : null);
      var voxelWaterAmount = v.waterAmount != null ? Math.max(0, Math.min(1, Number(v.waterAmount) || 0)) : voxelLiquidDepth;
      var renderLevel = isRuntimeLiquidVoxel && instanceRenderLevel != null ? instanceRenderLevel : voxelLiquidDepth;
      var logicalAmount = isRuntimeLiquidVoxel && instanceWaterAmount != null ? instanceWaterAmount : voxelWaterAmount;
      var isTerrainHeightSurfaceVoxel = String(voxelShapeKind || '').toLowerCase() === 'terrain_height_surface'
        || String(prefab.kind || '').toLowerCase() === 'terrain_height_surface'
        || String(prefab.id || '').indexOf('terrain_height_') === 0;
      var instanceTerrainHeight = instance && instance.terrainHeight != null
        ? Math.max(0.05, Math.min(2, Number(instance.terrainHeight) || 1))
        : (instance && instance.terrainSurfaceHeight != null ? Math.max(0.05, Math.min(2, Number(instance.terrainSurfaceHeight) || 1)) : null);
      var voxelTerrainHeight = v.terrainHeight != null ? Math.max(0.05, Math.min(2, Number(v.terrainHeight) || 1)) : (v.terrainSurfaceHeight != null ? Math.max(0.05, Math.min(2, Number(v.terrainSurfaceHeight) || 1)) : null);
      var terrainHeightValue = isTerrainHeightSurfaceVoxel ? (instanceTerrainHeight != null ? instanceTerrainHeight : (voxelTerrainHeight != null ? voxelTerrainHeight : Math.max(0.05, Math.min(2, Number(v.h != null ? v.h : 1) || 1)))) : null;
      out.push({
        id: assignIds ? (nextBoxId + i) : i + 1,
        instanceId: instance.instanceId,
        prefabId: prefab.id,
        name: instance.name || prefab.name,
        x: Number(instance.x || 0) + Number(v.x || 0),
        y: Number(instance.y || 0) + Number(v.y || 0),
        z: Number(instance.z || 0) + Number(v.z || 0),
        w: Math.max(0.001, Number(v.w != null ? v.w : 1) || 1),
        d: Math.max(0.001, Number(v.d != null ? v.d : 1) || 1),
        h: isTerrainHeightSurfaceVoxel && terrainHeightValue != null ? Math.max(0.05, Number(terrainHeightValue) || 1) : (isRuntimeLiquidVoxel && renderLevel != null ? Math.max(0.001, Number(renderLevel) || 0.001) : Math.max(0.001, Number(v.h != null ? v.h : 1) || 1)),
        shapeKind: voxelShapeKind,
        slopeDirection: v.slopeDirection || prefab.slopeDirection || null,
        liquidType: voxelLiquidType,
        fluidType: v.fluidType != null ? String(v.fluidType) : (v.liquidType != null ? String(v.liquidType) : null),
        liquidDepth: renderLevel,
        waterAmount: logicalAmount,
        fluidAmount: isRuntimeLiquidVoxel && logicalAmount != null ? logicalAmount : (v.fluidAmount != null ? Math.max(0, Math.min(1, Number(v.fluidAmount) || 0)) : null),
        renderWaterLevel: isRuntimeLiquidVoxel && renderLevel != null ? renderLevel : null,
        fluidRuntimeAmount: isRuntimeLiquidVoxel && logicalAmount != null ? logicalAmount : null,
        terrainHeight: isTerrainHeightSurfaceVoxel && terrainHeightValue != null ? terrainHeightValue : (v.terrainHeight != null ? Number(v.terrainHeight) : null),
        terrainSurfaceHeight: isTerrainHeightSurfaceVoxel && terrainHeightValue != null ? terrainHeightValue : (v.terrainSurfaceHeight != null ? Number(v.terrainSurfaceHeight) : null),
        terrainHeightSurfacePrototype: isTerrainHeightSurfaceVoxel || v.terrainHeightSurfacePrototype === true,
        fluidRenderPrototype: v.fluidRenderPrototype === true,
        collisionPolygon2d: Array.isArray(v.collisionPolygon2d) ? v.collisionPolygon2d.map(function (pt) { return { x: Number(instance.x || 0) + Number(pt && pt.x || 0), y: Number(instance.y || 0) + Number(pt && pt.y || 0) }; }) : null,
        renderHidden: v.renderHidden === true,
        collisionOnly: v.collisionOnly === true,
        stairRole: v.stairRole || null,
        stairStepIndex: v.stairStepIndex != null ? Number(v.stairStepIndex) : null,
        stairStepCount: v.stairStepCount != null ? Math.max(1, Number(v.stairStepCount) || 1) : null,
        stairMaxStepUpCells: v.stairMaxStepUpCells != null ? Math.max(0, Number(v.stairMaxStepUpCells) || 0) : null,
        cylinderResolution: v.cylinderResolution != null ? Math.max(1, Number(v.cylinderResolution) || 1) : null,
        cylinderCellX: v.cylinderCellX != null ? Number(v.cylinderCellX) : null,
        cylinderCellY: v.cylinderCellY != null ? Number(v.cylinderCellY) : null,
        cylinderCellIndex: v.cylinderCellIndex != null ? Number(v.cylinderCellIndex) : null,
        localX: Number(v.x || 0),
        localY: Number(v.y || 0),
        localZ: Number(v.z || 0),
        localW: Math.max(0.001, Number(v.w != null ? v.w : 1) || 1),
        localD: Math.max(0.001, Number(v.d != null ? v.d : 1) || 1),
        localH: Math.max(0.001, Number(v.h != null ? v.h : 1) || 1),
        base: instance.base || v.base || prefab.base,
        generatedBy: instance.generatedBy || null,
        terrainBatchId: instance.terrainBatchId || null,
        terrainCellX: instance.terrainCellX != null ? instance.terrainCellX : null,
        terrainCellY: instance.terrainCellY != null ? instance.terrainCellY : null,
        terrainMaterialId: instance.terrainMaterialId != null ? instance.terrainMaterialId : null,
        materialType: instance.materialType != null ? instance.materialType : null,
        terrainMaterialLabel: instance.terrainMaterialLabel != null ? instance.terrainMaterialLabel : null,
        terrainManualShapePrefabId: instance.terrainManualShapePrefabId != null ? instance.terrainManualShapePrefabId : null,
        terrainManualShapeLabel: instance.terrainManualShapeLabel != null ? instance.terrainManualShapeLabel : null,
        terrainManualColumnHeight: instance.terrainManualColumnHeight != null ? instance.terrainManualColumnHeight : null,
        semanticTextureMap: instance.semanticTextureMap || null,
        semanticTextures: instance.semanticTextures || null,
        semanticFaceColors: instance.semanticFaceColors || null,
        renderUpdateMode: instance.renderUpdateMode || prefab.renderUpdateMode || null,
        rotation: Number(instance.rotation) || 0,
        localIndex: i,
      });
    }
    return out;
  }


  function expandInstanceToPrimitives(instance, assignIds, options) {
    if (assignIds === void 0) assignIds = true;
    options = options || {};
    if (!instance || !instance.prefabId) return [];
    if (isMicroTriPrismPrefabId(instance && instance.prefabId)) {
      var microPrimitive = buildMicroTriPrimitiveFromMeta(instance, instance.microTri || instance, 0);
      try { if (typeof detailLog === 'function') detailLog('[MICRO-TRI-PRISM] ' + JSON.stringify({ phase: 'expand-instance-primitives', instanceId: instance.instanceId || null, subdivision: microPrimitive.microTri && microPrimitive.microTri.subdivision, subX: microPrimitive.microTri && microPrimitive.microTri.subX, subY: microPrimitive.microTri && microPrimitive.microTri.subY, baseTriIndex: microPrimitive.microTri && microPrimitive.microTri.baseTriIndex, rotation: microPrimitive.microTri && microPrimitive.microTri.rotation, triIndex: microPrimitive.microTri && microPrimitive.microTri.triIndex, source: 'src/application/placement/placement.js' })); } catch (_) {}
      return [microPrimitive];
    }
    if (isCompatibleAxisBlockPrefabId(instance && instance.prefabId)) {
      var compatiblePrimitives = buildCompatibleAxisPrimitivesFromMeta(instance, Object.assign({}, instance.compatibleAxis || {}, { rotation: instance.rotation }), 0);
      var compatibleMeta = compatiblePrimitives.length ? compatiblePrimitives[0].compatibleAxis : normalizeCompatibleAxisMeta(Object.assign({}, instance.compatibleAxis || {}, { rotation: instance.rotation }));
      try { if (typeof detailLog === 'function') detailLog('[COMPATIBLE-AXIS-BLOCK] ' + JSON.stringify({ phase: 'expand-instance-primitives', instanceId: instance.instanceId || null, subdivision: compatibleMeta && compatibleMeta.subdivision, rotation: compatibleMeta && compatibleMeta.rotation, k: compatibleMeta && compatibleMeta.k, approximatedLength: compatibleMeta && compatibleMeta.approximatedLength, errorAbs: compatibleMeta && compatibleMeta.errorAbs, atomCount: compatiblePrimitives.length, generatedMode: compatibleMeta && compatibleMeta.generatedMode || 'integer-atom-strip', exactAtomCount: compatibleMeta && compatibleMeta.exactAtomCount, approximateAtomCount: compatibleMeta && compatibleMeta.approximateAtomCount, actualBounds: compatibleMeta && compatibleMeta.actualBounds || null, renderMode: 'micro-tri-atom-composite', source: 'src/application/placement/placement.js' })); } catch (_) {}
      return compatiblePrimitives;
    }
    var prefab = getPrefabById(instance.prefabId);
    var variant = prefabVariant(prefab, instance.rotation || 0);
    var primitives = Array.isArray(variant && variant.primitives) ? variant.primitives : [];
    var out = [];
    for (var i = 0; i < primitives.length; i++) {
      var p = primitives[i] || {};
      var verts = Array.isArray(p.vertices2d) ? p.vertices2d : [];
      if (verts.length < 3) continue;
      var sortCell = p.sortCell || { x: 0, y: 0, z: 0 };
      out.push({
        id: assignIds ? String(instance.instanceId || 'instance') + ':primitive:' + String(p.id || i) : String(i + 1),
        instanceId: instance.instanceId || null,
        prefabId: prefab.id,
        name: instance.name || prefab.name,
        primitiveId: p.id || ('primitive-' + i),
        primitiveKind: p.primitiveKind || p.kind || 'vertical_tri_prism',
        kind: p.kind || p.primitiveKind || 'vertical_tri_prism',
        vertices2d: verts.map(function (pt) { return { x: Number(instance.x || 0) + Number(pt && pt.x || 0), y: Number(instance.y || 0) + Number(pt && pt.y || 0) }; }),
        z: Number(instance.z || 0) + Number(p.z || 0),
        h: Math.max(0.001, Number(p.h != null ? p.h : 1) || 1),
        sortCell: {
          x: Number(instance.x || 0) + Number(sortCell && sortCell.x || 0),
          y: Number(instance.y || 0) + Number(sortCell && sortCell.y || 0),
          z: Number(instance.z || 0) + Number(sortCell && sortCell.z || 0)
        },
        base: instance.base || p.base || prefab.base,
        shapeKind: p.shapeKind || 'vertical_tri_prism',
        rotation: Number(instance.rotation) || 0,
        localIndex: i,
        renderUpdateMode: instance.renderUpdateMode || prefab.renderUpdateMode || null
      });
    }
    try {
      if (out.length && typeof detailLog === 'function') {
        detailLog('[TRI-PRISM-TRACE] ' + JSON.stringify({ phase: 'expand-instance-primitives', prefabId: prefab.id, instanceId: instance.instanceId || null, primitiveCount: out.length, source: 'src/application/placement/placement.js' }));
      }
    } catch (_) {}
    return out;
  }

  function placementPerfNowMs() {
    try {
      if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') return performance.now();
    } catch (_) {}
    return Date.now();
  }

  function emitPlacementSceneCommitProfile(payload) {
    var line = '[SCENE-COMMIT-PROFILE] ';
    try { line += JSON.stringify(payload || {}); } catch (_) { line += '{}'; }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function rebuildBoxesFromInstances(meta) {
    var source = meta && meta.source ? String(meta.source) : 'placement:rebuildBoxesFromInstances';
    var totalStartAt = placementPerfNowMs();
    var previousBoxes = Array.isArray(boxes) ? boxes.slice() : [];
    nextId = 1;
    var deriveBoxesStartAt = placementPerfNowMs();
    var domainCore = getDomainSceneCoreApi();
    if (domainCore && typeof domainCore.deriveBoxesFromInstances === 'function') {
      boxes = domainCore.deriveBoxesFromInstances(instances, expandInstanceToBoxes);
    } else {
      var rebuilt = [];
      for (var i = 0; i < instances.length; i++) rebuilt.push.apply(rebuilt, expandInstanceToBoxes(instances[i], true));
      boxes = rebuilt;
    }
    var deriveBoxesMs = Math.max(0, placementPerfNowMs() - deriveBoxesStartAt);
    var occupancyUpdateMs = 0;
    var sceneSessionApi = getSceneSessionApi();
    if (sceneSessionApi && typeof sceneSessionApi.updateOccupancyCacheFromBoxDiff === 'function') {
      try {
        var occupancyUpdateStartAt = placementPerfNowMs();
        sceneSessionApi.updateOccupancyCacheFromBoxDiff({
          previousBoxes: previousBoxes,
          nextBoxes: boxes,
          reason: source,
          source: source
        });
        occupancyUpdateMs = Math.max(0, placementPerfNowMs() - occupancyUpdateStartAt);
      } catch (_) {}
    } else if (typeof window !== 'undefined' && window.__SCENE_OCCUPANCY_CACHE__ && typeof window.__SCENE_OCCUPANCY_CACHE__.updateFromBoxDiff === 'function') {
      try {
        var legacyOccupancyUpdateStartAt = placementPerfNowMs();
        window.__SCENE_OCCUPANCY_CACHE__.updateFromBoxDiff({
          previousBoxes: previousBoxes,
          nextBoxes: boxes,
          reason: source,
          source: source
        });
        occupancyUpdateMs = Math.max(0, placementPerfNowMs() - legacyOccupancyUpdateStartAt);
      } catch (_) {}
    }
    var quarterOccupancySummary = null;
    try {
      if (domainCore && typeof domainCore.buildQuarterOccupancyIndex === 'function') {
        var quarterOcc = domainCore.buildQuarterOccupancyIndex(boxes, { sampleLimit: 8 });
        quarterOccupancySummary = quarterOcc && quarterOcc.summary ? quarterOcc.summary : null;
        var quarterLine = '[QUARTER-OCCUPANCY] ' + JSON.stringify(Object.assign({
          phase: 'placement-rebuild',
          reason: source,
          source: 'src/application/placement/placement.js',
          diamondQuarterOccupancyEnabled: true
        }, quarterOccupancySummary || {}));
        if (typeof detailLog === 'function') detailLog(quarterLine);
        else if (typeof pushLog === 'function') pushLog(quarterLine);
      }
    } catch (_) {}
    emitPlacementSceneCommitProfile({
      reason: source,
      step: 'rebuildBoxesFromInstances',
      instancesBefore: Number(instances.length || 0),
      instancesAfter: Number(instances.length || 0),
      boxesBefore: Number(previousBoxes.length || 0),
      boxesAfter: Number(boxes.length || 0),
      deriveBoxesMs: Number(deriveBoxesMs.toFixed(3)),
      occupancyUpdateMs: Number(occupancyUpdateMs.toFixed(3)),
      quarterOccupancy: quarterOccupancySummary ? {
        occupiedCellLayerCount: quarterOccupancySummary.occupiedCellLayerCount,
        fullMaskCellLayerCount: quarterOccupancySummary.fullMaskCellLayerCount,
        partialMaskCellLayerCount: quarterOccupancySummary.partialMaskCellLayerCount,
        quarterHitCount: quarterOccupancySummary.quarterHitCount
      } : null,
      totalMs: Number(Math.max(0, placementPerfNowMs() - totalStartAt).toFixed(3))
    });
    placementStateWrite('replaceSceneGraph', { source: source, instances: instances.length, boxes: boxes.length });
    placementRoute('rebuildBoxesFromInstances', { source: source, instances: instances.length, boxes: boxes.length });
    return boxes;
  }

  function refreshPlacementOrdering(reason) {
    placementRoute('refreshPlacementOrdering', { reason: reason || 'unspecified' });
    rebuildBoxesFromInstances({ source: reason || 'placement:refreshPlacementOrdering' });
    if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache(reason || 'placement-refresh');
    return boxes;
  }

  function instanceFitsGrid(instance) {
    var previewBoxes = expandInstanceToBoxes(instance, false);
    return previewBoxes.every(function (b) { return b.x >= 0 && b.y >= 0 && b.x + b.w <= settings.gridW && b.y + b.d <= settings.gridH && b.z >= 0; });
  }

  function filterInstancesToGrid() {
    var filtered = instances.filter(instanceFitsGrid);
    var sceneSessionApi = getSceneSessionApi();
    if (sceneSessionApi && typeof sceneSessionApi.replaceInstances === 'function') {
      sceneSessionApi.replaceInstances(filtered, { source: 'placement:filterInstancesToGrid' });
      placementRoute('filterInstancesToGrid:owner-hit', { instances: filtered.length });
      return filtered;
    }
    placementRoute('filterInstancesToGrid:legacy-fallback', { reason: 'missing-scene-session-api', instances: filtered.length });
    instances = filtered;
    placementStateWrite('replaceInstances', { source: 'placement:filterInstancesToGrid', fallback: true, instances: instances.length });
    return filtered;
  }

  function findInstanceById(instanceId) {
    return instances.find(function (inst) { return inst.instanceId === instanceId; }) || null;
  }

  function findInstanceForBox(box) {
    return box && box.instanceId ? findInstanceById(box.instanceId) : null;
  }

  function removeInstanceById(instanceId, meta) {
    placementRoute('removeInstanceById', { instanceId: instanceId });
    var sceneGraphApi = getSceneGraphOwnerApi();
    if (sceneGraphApi && typeof sceneGraphApi.removeInstanceById === 'function' && !(meta && meta.internalOwnerCall)) {
      placementRoute('removeInstanceById:owner-hit', { instanceId: instanceId, source: meta && meta.source ? String(meta.source) : 'placement:removeInstanceById' });
      return sceneGraphApi.removeInstanceById(instanceId, { source: meta && meta.source ? String(meta.source) : 'placement:removeInstanceById' });
    }
    instances = instances.filter(function (inst) { return inst.instanceId !== instanceId; });
    if (inspectorState.selectedInstanceId === instanceId) clearSelectedInstance({ source: 'placement:removeInstanceById' });
    rebuildBoxesFromInstances({ source: meta && meta.source ? String(meta.source) : 'placement:removeInstanceById' });
    placementStateWrite('removeInstanceById', { source: 'placement:removeInstanceById', instanceId: instanceId, instances: instances.length, boxes: boxes.length, fallback: true });
    return true;
  }

  function removePlacedInstance(instanceId) {
    return removeInstanceById(instanceId);
  }


  function getTerrainMaterialCoreForPlacement() {
    try {
      if (typeof window !== 'undefined' && window.__TERRAIN_MATERIAL_CORE__) return window.__TERRAIN_MATERIAL_CORE__;
    } catch (_) {}
    return null;
  }

  function buildDefaultTerrainMaterialDemoInstances(nextDefaultId) {
    var materialCore = getTerrainMaterialCoreForPlacement();
    var patches = [
      { id: 'sand', x0: 0, y0: 0, w: 2, h: 2 },
      { id: 'grass', x0: 4, y0: 0, w: 2, h: 2 },
      { id: 'rock', x0: 8, y0: 0, w: 2, h: 2 }
    ];
    var out = [];
    for (var p = 0; p < patches.length; p++) {
      var patch = patches[p];
      var def = materialCore && typeof materialCore.getTerrainMaterialDefinition === 'function'
        ? materialCore.getTerrainMaterialDefinition(patch.id)
        : null;
      var baseColor = def && def.colors && def.colors.top ? def.colors.top : '#79b35a';
      for (var y = 0; y < patch.h; y++) {
        for (var x = 0; x < patch.w; x++) {
          out.push(makeInstance('cube_1x1', patch.x0 + x, patch.y0 + y, 0, 0, {
            instanceId: nextDefaultId(),
            source: 'placement:defaultTerrainMaterialDemo',
            name: String(def && def.label ? def.label : patch.id) + ' Sample',
            generatedBy: 'terrain-generator',
            terrainBatchId: 'demo-terrain-materials',
            terrainCellX: patch.x0 + x,
            terrainCellY: patch.y0 + y,
            terrainMaterialId: patch.id,
            materialType: patch.id,
            terrainMaterialLabel: def && def.label ? def.label : patch.id,
            base: baseColor,
            renderUpdateMode: 'static'
          }));
        }
      }
    }
    return out;
  }

  function defaultInstances() {
    var localSerial = 1;
    function nextDefaultId() {
      return 'obj_' + String(localSerial++).padStart(4, '0');
    }
    var baseInstances = [
      makeInstance('bench_2x1', 1, 5, 0, 0, { instanceId: nextDefaultId(), source: 'placement:defaultInstances' }),
      makeInstance('table_2x1', 2, 2, 0, 0, { instanceId: nextDefaultId(), name: 'Table', source: 'placement:defaultInstances' }),
      makeInstance('sofa_2x1', 4, 5, 0, 0, { instanceId: nextDefaultId(), source: 'placement:defaultInstances' }),
      makeInstance('cabinet_1x1x2', 7, 2, 0, 0, { instanceId: nextDefaultId(), source: 'placement:defaultInstances' }),
      makeInstance('cube_1x1', 8, 6, 0, 0, { instanceId: nextDefaultId(), source: 'placement:defaultInstances' })
    ];
    return baseInstances;
  }

  function defaultBoxes() {
    var localInstances = defaultInstances();
    var result = [];
    var nextLocalBoxId = 1;
    for (var i = 0; i < localInstances.length; i++) {
      var expanded = expandInstanceToBoxes(localInstances[i], true, {
        localIds: true,
        startingBoxId: nextLocalBoxId,
        source: 'placement:defaultBoxes'
      });
      nextLocalBoxId += expanded.length;
      result.push.apply(result, expanded);
    }
    return result;
  }

  function legacyPrefabIdForBox(box) {
    return 'legacy_' + (box.w || 1) + 'x' + (box.d || 1) + 'x' + (box.h || 1) + '_' + String(box.base || '#c7b0df').replace('#', '');
  }

  function ensureLegacyPrefabFromBox(box) {
    var prefabId = legacyPrefabIdForBox(box);
    ensurePrefabRegistered({
      id: prefabId,
      name: box.name || 'Legacy Box',
      base: box.base || '#c7b0df',
      voxels: makeRectVoxels(Math.max(1, box.w || 1), Math.max(1, box.d || 1), Math.max(1, box.h || 1), box.base || '#c7b0df')
    });
    return prefabId;
  }

  function legacyBoxesToInstances(boxList) {
    var out = [];
    for (var i = 0; i < (boxList || []).length; i++) {
      var box = boxList[i];
      var prefabId = ensureLegacyPrefabFromBox(box);
      out.push(makeInstance(prefabId, Number(box.x) || 0, Number(box.y) || 0, Number(box.z) || 0, 0, { name: box.name || 'Legacy Box' }));
    }
    placementRoute('legacyBoxesToInstances', { input: (boxList || []).length, output: out.length });
    return out;
  }

  function startDragging(box) {
    var instance = findInstanceForBox(box);
    if (!instance) {
      placementWarn('startDragging: target instance not found', { boxId: box && box.id ? box.id : null });
      return;
    }
    placementRoute('startDragging', { instanceId: instance.instanceId, prefabId: instance.prefabId });
    if (verboseLog) pushLog(`drag-start ${instance.instanceId}:${getPrefabById(instance.prefabId).name} @(${instance.x},${instance.y},${instance.z})`);
    var placementEffects = getPlacementEffectsApi();
    var runtimeApi = getRuntimeStateApi();
    var editorRef = getPlacementEditorRef();
    if (placementEffects && typeof placementEffects.beginDragSession === 'function') {
      placementRoute('startDragging:new-path-hit', placementEffects.beginDragSession(instance, { source: 'placement:startDragging' }));
    } else {
      placementRoute('startDragging:legacy-fallback', { reason: 'missing-placement-effects' });
      recordPlacementBoundaryFallback('placement.effects.beginDragSession', { source: 'placement:startDragging', reason: 'missing-placement-effects' });
      if (runtimeApi && typeof runtimeApi.setEditorModeValue === 'function') {
        runtimeApi.setEditorModeValue('drag', { source: 'placement:startDragging' });
        recordPlacementBoundaryEvent('runtime-state', 'state.runtimeState.setEditorModeValue', { source: 'placement:startDragging', mode: 'drag' });
      }
      if (editorRef) {
        editorRef.draggingInstance = Object.assign({}, instance);
        editorRef.preview = null;
      }
    }
    removeInstanceById(instance.instanceId, { source: 'placement:startDragging' });
    if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('startDragging');
    pushLog(`scene-after-drag-start: instances=${instances.length} boxes=${boxes.length}`);
  }

  function movePlacedInstance(instance, nextOrigin) {
    if (!instance || !nextOrigin) return null;
    return Object.assign({}, instance, { x: nextOrigin.x, y: nextOrigin.y, z: nextOrigin.z });
  }

  function resolveAuthoritativePlacement(preview, options) {
    var editorRef = getPlacementEditorRef();
    var sourcePreview = preview || (editorRef && editorRef.preview) || null;
    var opts = options || {};
    if (!sourcePreview || !sourcePreview.origin) return null;
    var prefabId = sourcePreview.prefabId || getSelectedPrefabIdForPlacement(opts.source || 'placement:resolve-authority');
    if (!prefabId || typeof getPrefabById !== 'function' || typeof prefabVariant !== 'function') {
      placementWarn('resolveAuthoritativePlacement: prefab-resolution-failed', { prefabId: prefabId || null, source: opts.source || 'placement:resolve-authority' });
      return null;
    }
    var baseProto = getPrefabById(prefabId);
    if (!baseProto) {
      placementWarn('resolveAuthoritativePlacement: prefab-not-found', { prefabId: prefabId, source: opts.source || 'placement:resolve-authority' });
      return null;
    }
    if (isMicroTriPrismPrefabId(prefabId) && sourcePreview.microTri && sourcePreview.valid === true) {
      return Object.assign({}, sourcePreview, { authority: 'domain', source: opts.source || 'placement:resolve-authority' });
    }
    if (isCompatibleAxisBlockPrefabId(prefabId) && sourcePreview.compatibleAxis && sourcePreview.valid === true) {
      return Object.assign({}, sourcePreview, { authority: 'domain', source: opts.source || 'placement:resolve-authority' });
    }
    var rotation = sourcePreview.rotation != null ? sourcePreview.rotation : (opts.rotation != null ? opts.rotation : 0);
    var proto = prefabVariant(baseProto, rotation);
    var domainCore = getDomainSceneCoreApi();
    if (!domainCore || typeof domainCore.evaluatePlacementCandidate !== 'function') {
      placementWarn('resolveAuthoritativePlacement: domain-core-unavailable', { prefabId: prefabId, source: opts.source || 'placement:resolve-authority' });
      return null;
    }
    var evaluated = domainCore.evaluatePlacementCandidate({
      proto: proto,
      cellX: Number(sourcePreview.origin.x) || 0,
      cellY: Number(sourcePreview.origin.y) || 0,
      ignoreInstanceId: opts.ignoreInstanceId || null,
      existingBoxes: Array.isArray(boxes) ? boxes.slice() : [],
      grid: { gridW: getPlacementSettings().gridW, gridH: getPlacementSettings().gridH },
      playerBox: (typeof playerPlacementAABB === 'function') ? playerPlacementAABB() : null
    }) || null;
    if (evaluated) {
      evaluated.authority = 'domain';
      evaluated.source = opts.source || 'placement:resolve-authority';
    }
    return evaluated;
  }


  function isTerrainBlockPlacementActive() {
    return !!(manualTerrainBlockPlacementState && manualTerrainBlockPlacementState.active === true);
  }

  function getManualTerrainBlockPlacementState() {
    return placementSafeClone(manualTerrainBlockPlacementState || {});
  }

  function getManualTerrainBlockShapeCatalog() {
    return {
      cube_1x1: { prefabId: 'cube_1x1', label: '1×1×1', columnHeight: 1, name: 'Terrain Block · 1×1×1 Manual Placement' },
      cabinet_1x1x2: { prefabId: 'cabinet_1x1x2', label: '1×1×2', columnHeight: 2, name: 'Terrain Block · 1×1×2 Manual Placement' },
      terrain_column_1x1x3: { prefabId: 'terrain_column_1x1x3', label: '1×1×3', columnHeight: 3, name: 'Terrain Column · 1×1×3 Manual Placement' },
      terrain_column_1x1x4: { prefabId: 'terrain_column_1x1x4', label: '1×1×4', columnHeight: 4, name: 'Terrain Column · 1×1×4 Manual Placement' },
      terrain_column_1x1x5: { prefabId: 'terrain_column_1x1x5', label: '1×1×5', columnHeight: 5, name: 'Terrain Column · 1×1×5 Manual Placement' },
      terrain_column_1x1x6: { prefabId: 'terrain_column_1x1x6', label: '1×1×6', columnHeight: 6, name: 'Terrain Column · 1×1×6 Manual Placement' }
    };
  }

  function normalizeManualTerrainBlockPrefabId(prefabId) {
    var id = String(prefabId || '').trim();
    var catalog = getManualTerrainBlockShapeCatalog();
    if (catalog[id]) return id;
    return 'cube_1x1';
  }

  function getManualTerrainBlockShapeDefinition(prefabId) {
    var catalog = getManualTerrainBlockShapeCatalog();
    var id = normalizeManualTerrainBlockPrefabId(prefabId || manualTerrainBlockPlacementState.prefabId);
    return catalog[id] || catalog.cube_1x1;
  }

  function setManualTerrainBlockShape(prefabId, meta) {
    var shape = getManualTerrainBlockShapeDefinition(prefabId);
    manualTerrainBlockPlacementState.prefabId = shape.prefabId;
    manualTerrainBlockPlacementState.shapeLabel = shape.label;
    manualTerrainBlockPlacementState.columnHeight = Math.max(1, Math.round(Number(shape.columnHeight) || 1));
    placementRoute('terrainBlockPlacement:set-shape', {
      prefabId: shape.prefabId,
      shapeLabel: shape.label,
      columnHeight: manualTerrainBlockPlacementState.columnHeight,
      source: meta && meta.source ? String(meta.source) : 'placement:setManualTerrainBlockShape'
    });
    return shape;
  }

  function setTerrainBlockPlacementStatusText(message) {
    try {
      if (typeof document === 'undefined') return;
      var el = document.getElementById('terrainPlaceBlockStatus');
      if (el) el.textContent = String(message || '');
    } catch (_) {}
  }

  function syncTerrainBlockPlacementUi(source) {
    var active = isTerrainBlockPlacementActive();
    var shape = getManualTerrainBlockShapeDefinition(manualTerrainBlockPlacementState.prefabId);
    var message = active
      ? '地形方块放置：已启用。左键放置的 ' + shape.label + ' 方块会以 generatedBy=terrain-generator 进入 terrain face merge path。'
      : '地形方块放置：未启用。点击“放置地形方块”后，左键会放置进入 terrain merge path 的 ' + shape.label + ' 方块。';
    setTerrainBlockPlacementStatusText(message);
    placementRoute('terrainBlockPlacement:ui-sync', { active: active, prefabId: shape.prefabId, shapeLabel: shape.label, columnHeight: shape.columnHeight || null, source: String(source || 'placement:terrain-block-ui-sync') });
    return { active: active, prefabId: shape.prefabId, shapeLabel: shape.label, columnHeight: shape.columnHeight || null, message: message };
  }

  function setTerrainBlockPlacementActive(active, meta) {
    manualTerrainBlockPlacementState.active = !!active;
    placementRoute('terrainBlockPlacement:set-active', {
      active: manualTerrainBlockPlacementState.active,
      source: meta && meta.source ? String(meta.source) : 'placement:setTerrainBlockPlacementActive'
    });
    syncTerrainBlockPlacementUi(meta && meta.source ? String(meta.source) : 'placement:setTerrainBlockPlacementActive');
    return getManualTerrainBlockPlacementState();
  }

  function enterTerrainBlockPlacement(meta) {
    var source = meta && meta.source ? String(meta.source) : 'placement:enterTerrainBlockPlacement';
    var shape = setManualTerrainBlockShape(meta && meta.prefabId ? meta.prefabId : manualTerrainBlockPlacementState.prefabId, { source: source + ':shape' });
    manualTerrainBlockPlacementState.active = true;
    var stateActions = getStateActionsApi();
    var selected = null;
    if (stateActions && typeof stateActions.selectPrefabById === 'function') selected = stateActions.selectPrefabById(shape.prefabId, { source: source + ':select-' + shape.prefabId });
    else {
      try {
        if (Array.isArray(prototypes) && typeof editor !== 'undefined' && editor) {
          var idx = prototypes.findIndex(function (p) { return p && p.id === shape.prefabId; });
          if (idx >= 0) { editor.prototypeIndex = idx; selected = idx; }
        }
      } catch (_) {}
    }
    try { if (typeof refreshPrefabSelectOptions === 'function') refreshPrefabSelectOptions(source + ':refresh-prefab-select'); } catch (_) {}
    if (stateActions && typeof stateActions.requestModeChange === 'function') stateActions.requestModeChange('place', { source: source + ':mode-place' });
    else {
      try {
        if (typeof requestEditorModeChange === 'function') requestEditorModeChange('place', { source: source + ':mode-place' });
        else if (typeof editor !== 'undefined' && editor) editor.mode = 'place';
      } catch (_) {}
    }
    try { if (typeof updatePreview === 'function') updatePreview(); } catch (_) {}
    var uiSync = syncTerrainBlockPlacementUi(source);
    placementRoute('terrainBlockPlacement:enter', { active: true, selectedPrefabId: shape.prefabId, shapeLabel: shape.label, columnHeight: shape.columnHeight || null, selectedResult: selected, ui: uiSync, source: source });
    return Object.assign({ ok: true, selectedPrefabId: shape.prefabId, shapeLabel: shape.label, columnHeight: shape.columnHeight || null }, getManualTerrainBlockPlacementState());
  }

  function exitTerrainBlockPlacement(meta) {
    var source = meta && meta.source ? String(meta.source) : 'placement:exitTerrainBlockPlacement';
    manualTerrainBlockPlacementState.active = false;
    var uiSync = syncTerrainBlockPlacementUi(source);
    placementRoute('terrainBlockPlacement:exit', { active: false, ui: uiSync, source: source });
    return Object.assign({ ok: true }, getManualTerrainBlockPlacementState());
  }


  function getManualTerrainColumnPrefabIdForHeight(height) {
    var h = Math.max(1, Math.round(Number(height) || 1));
    if (h <= 1) return 'cube_1x1';
    if (h === 2) return 'cabinet_1x1x2';
    if (h === 3) return 'terrain_column_1x1x3';
    if (h === 4) return 'terrain_column_1x1x4';
    if (h === 5) return 'terrain_column_1x1x5';
    return 'terrain_column_1x1x6';
  }

  function getManualTerrainFaceMergeStressPresetCatalog() {
    return {
      side_merged_column_row: {
        id: 'side_merged_column_row',
        label: 'Side-merged 1×1×N column row',
        description: '相邻同高地形柱行：用于强制触发 vertical side face merge。',
        placements: [
          { dx: 0, dy: 0, h: 4 },
          { dx: 1, dy: 0, h: 4 },
          { dx: 2, dy: 0, h: 4 },
          { dx: 3, dy: 0, h: 4 }
        ]
      },
      side_merged_column_block: {
        id: 'side_merged_column_block',
        label: 'Side-merged 2×2 high column block',
        description: '2×2 同高高柱块：同时触发 top merge 与四侧 side merge。',
        placements: [
          { dx: 0, dy: 0, h: 4 },
          { dx: 1, dy: 0, h: 4 },
          { dx: 0, dy: 1, h: 4 },
          { dx: 1, dy: 1, h: 4 }
        ]
      },
      step_adjacent_column_cluster: {
        id: 'step_adjacent_column_cluster',
        label: 'Step-adjacent mixed-height column cluster',
        description: '高低相邻柱簇：用于复现 merged side wall 与 lower top 面的邻接关系。',
        placements: [
          { dx: 0, dy: 0, h: 1 },
          { dx: 1, dy: 0, h: 2 },
          { dx: 2, dy: 0, h: 3 },
          { dx: 3, dy: 0, h: 4 },
          { dx: 0, dy: 1, h: 1 },
          { dx: 1, dy: 1, h: 2 },
          { dx: 2, dy: 1, h: 3 },
          { dx: 3, dy: 1, h: 4 }
        ]
      },
      l_shaped_column_wall: {
        id: 'l_shaped_column_wall',
        label: 'L-shaped merged column wall',
        description: 'L 型同高柱墙：用于检查拐角处 side merge / top merge 是否跨边界。',
        placements: [
          { dx: 0, dy: 0, h: 4 },
          { dx: 1, dy: 0, h: 4 },
          { dx: 2, dy: 0, h: 4 },
          { dx: 0, dy: 1, h: 4 },
          { dx: 0, dy: 2, h: 4 }
        ]
      }
    };
  }

  function normalizeManualTerrainFaceMergeStressPresetId(presetId) {
    var id = String(presetId || '').trim();
    var catalog = getManualTerrainFaceMergeStressPresetCatalog();
    if (catalog[id]) return id;
    return 'side_merged_column_row';
  }

  function getManualTerrainFaceMergeStressPreset(presetId) {
    var catalog = getManualTerrainFaceMergeStressPresetCatalog();
    var id = normalizeManualTerrainFaceMergeStressPresetId(presetId);
    return catalog[id] || catalog.side_merged_column_row;
  }

  function getManualTerrainFaceMergeStressBaseOrigin(preset) {
    var gridW = getPlacementSettings().gridW || 12;
    var gridH = getPlacementSettings().gridH || 12;
    var placements = preset && Array.isArray(preset.placements) ? preset.placements : [];
    var maxDx = 0;
    var maxDy = 0;
    for (var i = 0; i < placements.length; i++) {
      maxDx = Math.max(maxDx, Math.round(Number(placements[i].dx) || 0));
      maxDy = Math.max(maxDy, Math.round(Number(placements[i].dy) || 0));
    }
    return {
      x: Math.max(0, Math.min(Math.max(0, gridW - maxDx - 1), Math.floor((gridW - maxDx - 1) / 2))),
      y: Math.max(0, Math.min(Math.max(0, gridH - maxDy - 1), Math.floor((gridH - maxDy - 1) / 2))),
      z: 0
    };
  }

  function buildManualTerrainFaceMergeStressExtras(origin, preset, placement, index, meta) {
    var material = resolveManualTerrainMaterialForPlacement();
    var h = Math.max(1, Math.min(6, Math.round(Number(placement && placement.h) || 1)));
    var prefabId = getManualTerrainColumnPrefabIdForHeight(h);
    return {
      source: meta && meta.source ? String(meta.source) : 'placement:manualTerrainFaceMergeStressPreset',
      name: 'Terrain Face-Merge Stress · ' + String(preset.label || preset.id || 'preset') + ' · h' + h,
      generatedBy: 'terrain-generator',
      terrainBatchId: 'manual-terrain-face-merge-stress',
      terrainManualShapePrefabId: prefabId,
      terrainManualShapeLabel: '1×1×' + h,
      terrainManualColumnHeight: h,
      terrainStressPresetId: String(preset.id || ''),
      terrainStressPresetLabel: String(preset.label || preset.id || ''),
      terrainStressPlacementIndex: index,
      terrainCellX: Math.round(Number(origin.x) || 0),
      terrainCellY: Math.round(Number(origin.y) || 0),
      terrainMaterialId: material.terrainMaterialId,
      terrainMaterialMergeKey: material.terrainMaterialMergeKey,
      materialType: material.materialType,
      terrainMaterialLabel: material.terrainMaterialLabel,
      base: material.base,
      renderUpdateMode: 'static'
    };
  }

  function addManualTerrainFaceMergeStressPreset(presetId, meta) {
    var source = meta && meta.source ? String(meta.source) : 'placement:addManualTerrainFaceMergeStressPreset';
    var preset = getManualTerrainFaceMergeStressPreset(presetId);
    var base = getManualTerrainFaceMergeStressBaseOrigin(preset);
    var placements = Array.isArray(preset.placements) ? preset.placements : [];
    var created = [];
    var sceneGraphApi = getSceneGraphOwnerApi();
    for (var i = 0; i < placements.length; i++) {
      var placement = placements[i] || {};
      var origin = {
        x: base.x + Math.round(Number(placement.dx) || 0),
        y: base.y + Math.round(Number(placement.dy) || 0),
        z: base.z + Math.round(Number(placement.z) || 0)
      };
      var h = Math.max(1, Math.min(6, Math.round(Number(placement.h) || 1)));
      var prefabId = getManualTerrainColumnPrefabIdForHeight(h);
      var extras = buildManualTerrainFaceMergeStressExtras(origin, preset, placement, i, { source: source });
      var instance = makeInstance(prefabId, origin.x, origin.y, origin.z, 0, extras);
      created.push(instance);
      if (sceneGraphApi && typeof sceneGraphApi.addInstance === 'function') sceneGraphApi.addInstance(instance, { source: source + ':addInstance' });
      else instances.push(instance);
    }
    if (!(sceneGraphApi && typeof sceneGraphApi.addInstance === 'function')) {
      rebuildBoxesFromInstances({ source: source + ':rebuildBoxes' });
      placementStateWrite('addManualTerrainFaceMergeStressPreset', { source: source, presetId: preset.id, instances: instances.length, created: created.length, fallback: true });
    }
    var payload = {
      ok: true,
      presetId: preset.id,
      presetLabel: preset.label,
      description: preset.description || '',
      baseOrigin: base,
      createdCount: created.length,
      created: created.map(function (inst) {
        return {
          instanceId: inst.instanceId || null,
          prefabId: inst.prefabId || null,
          x: inst.x,
          y: inst.y,
          z: inst.z,
          terrainManualColumnHeight: inst.terrainManualColumnHeight || null
        };
      })
    };
    placementRoute('manual-terrain-face-merge-stress-preset', Object.assign({ source: source }, payload));
    if (typeof pushLog === 'function') {
      try { pushLog('[MANUAL-TERRAIN-FACE-MERGE-STRESS] ' + JSON.stringify(payload)); } catch (_) {}
    }
    try { if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache(source); } catch (_) {}
    return payload;
  }

  function resolveManualTerrainMaterialForPlacement() {
    var materialId = String(manualTerrainBlockPlacementState.materialId || '__terrain_default__');
    var out = {
      terrainMaterialId: materialId,
      terrainMaterialMergeKey: '__terrain_default__',
      materialType: materialId,
      terrainMaterialLabel: manualTerrainBlockPlacementState.label || 'Manual Terrain Block',
      base: manualTerrainBlockPlacementState.base || '#79b35a'
    };
    try {
      var materialCore = getTerrainMaterialCoreForPlacement();
      if (materialCore && typeof materialCore.getTerrainMaterialDefinition === 'function') {
        var def = materialCore.getTerrainMaterialDefinition(materialId);
        if (def) {
          out.terrainMaterialLabel = def.label || out.terrainMaterialLabel;
          if (def.colors && def.colors.top) out.base = def.colors.top;
        }
      }
    } catch (_) {}
    return out;
  }

  function buildManualTerrainBlockPlacementExtras(origin, meta) {
    var o = origin || {};
    var material = resolveManualTerrainMaterialForPlacement();
    var shape = getManualTerrainBlockShapeDefinition(manualTerrainBlockPlacementState.prefabId);
    return {
      source: meta && meta.source ? String(meta.source) : 'placement:manualTerrainBlock',
      name: shape.name,
      generatedBy: 'terrain-generator',
      terrainBatchId: manualTerrainBlockPlacementState.batchId || 'manual-terrain-placement',
      terrainManualShapePrefabId: shape.prefabId,
      terrainManualShapeLabel: shape.label,
      terrainManualColumnHeight: Math.max(1, Math.round(Number(shape.columnHeight) || Number(manualTerrainBlockPlacementState.columnHeight) || 1)),
      terrainCellX: Math.round(Number(o.x) || 0),
      terrainCellY: Math.round(Number(o.y) || 0),
      terrainMaterialId: material.terrainMaterialId,
      terrainMaterialMergeKey: material.terrainMaterialMergeKey,
      materialType: material.materialType,
      terrainMaterialLabel: material.terrainMaterialLabel,
      base: material.base,
      renderUpdateMode: 'static'
    };
  }

  function shouldCommitAsManualTerrainBlock(prefabId, sourcePreview) {
    if (!isTerrainBlockPlacementActive()) return false;
    var id = String(prefabId || (sourcePreview && sourcePreview.prefabId) || '');
    var normalized = normalizeManualTerrainBlockPrefabId(id);
    return normalized === id && normalized === normalizeManualTerrainBlockPrefabId(manualTerrainBlockPlacementState.prefabId);
  }

  function placeCurrentPrefab(preview) {
    var editorRef = getPlacementEditorRef();
    var sourcePreview = preview || (editorRef && editorRef.preview) || null;
    if (!sourcePreview || !sourcePreview.valid || !sourcePreview.origin) return null;
    var authoritative = resolveAuthoritativePlacement(sourcePreview, { source: 'placement:placeCurrentPrefab' });
    if (!authoritative || !authoritative.valid || !authoritative.origin) {
      placementWarn('placeCurrentPrefab: domain-authority-rejected', {
        reason: authoritative && authoritative.reason ? authoritative.reason : 'domain-null',
        prefabId: sourcePreview.prefabId || null,
        source: 'placement:placeCurrentPrefab'
      });
      return null;
    }
    var selectedPrefabId = getSelectedPrefabIdForPlacement('placement:placeCurrentPrefab');
    var fallbackPrefabId = null;
    try { fallbackPrefabId = (typeof currentPrefab === 'function' && currentPrefab()) ? currentPrefab().id : null; } catch (_) {}
    if (fallbackPrefabId && !selectedPrefabId) {
      recordPlacementBoundaryEvent('legacy-global', 'currentPrefab', { source: 'placement:placeCurrentPrefab', prefabId: fallbackPrefabId });
      recordPlacementBoundaryFallback('currentPrefab', { source: 'placement:placeCurrentPrefab', reason: 'missing-selector-selected-prefab' });
    }
    var committedRotation = authoritative.rotation != null ? authoritative.rotation : (sourcePreview.rotation != null ? sourcePreview.rotation : 0);
    var committedPrefabId = authoritative.prefabId || sourcePreview.prefabId || selectedPrefabId || fallbackPrefabId;
    var terrainBlockExtras = shouldCommitAsManualTerrainBlock(committedPrefabId, sourcePreview)
      ? buildManualTerrainBlockPlacementExtras(authoritative.origin, { source: 'placement:placeCurrentPrefab.manual-terrain-block' })
      : null;
    var microTriExtras = isMicroTriPrismPrefabId(committedPrefabId) && (sourcePreview.microTri || authoritative.microTri)
      ? { microTri: normalizeMicroTriMeta(Object.assign({}, sourcePreview.microTri || authoritative.microTri || {}, { rotation: committedRotation })), source: 'placement:placeCurrentPrefab.micro-tri' }
      : null;
    var compatibleAxisExtras = isCompatibleAxisBlockPrefabId(committedPrefabId) && (sourcePreview.compatibleAxis || authoritative.compatibleAxis)
      ? { compatibleAxis: normalizeCompatibleAxisMeta(Object.assign({}, sourcePreview.compatibleAxis || authoritative.compatibleAxis || {}, { rotation: committedRotation })), source: 'placement:placeCurrentPrefab.compatible-axis' }
      : null;
    var instanceExtras = Object.assign({}, terrainBlockExtras || {}, microTriExtras || {}, compatibleAxisExtras || {});
    var instance = makeInstance(committedPrefabId, authoritative.origin.x, authoritative.origin.y, authoritative.origin.z, committedRotation, Object.keys(instanceExtras).length ? instanceExtras : undefined);
    try {
      if (isStairTracePrefabId(committedPrefabId)) {
        var committedBoxesTrace = expandInstanceToBoxes(instance, false, { source: 'placement:placeCurrentPrefab:trace-expand-committed' });
        emitStairPlaceTrace('commit-authority', {
          prefabId: committedPrefabId,
          instanceId: instance.instanceId || null,
          previewOrigin: sourcePreview.origin || null,
          previewRotation: sourcePreview.rotation != null ? sourcePreview.rotation : null,
          previewBox: sourcePreview.box || null,
          previewBbox: sourcePreview.bbox || null,
          previewBoxes: summarizeStairTraceBoxes(sourcePreview.boxes || []),
          authoritativeOrigin: authoritative.origin || null,
          authoritativeRotation: authoritative.rotation != null ? authoritative.rotation : null,
          authoritativeBox: authoritative.box || null,
          authoritativeBbox: authoritative.bbox || null,
          authoritativeBoxes: summarizeStairTraceBoxes(authoritative.boxes || []),
          committedOrigin: { x: instance.x, y: instance.y, z: instance.z },
          committedRotation: committedRotation,
          committedBoxes: summarizeStairTraceBoxes(committedBoxesTrace || [])
        });
      }
    } catch (_) {}
    var commitPayload = {
      instanceId: instance.instanceId || null,
      prefabId: instance.prefabId || null,
      committedFacing: committedRotation,
      origin: { x: instance.x, y: instance.y, z: instance.z },
      footprint: authoritative.bbox ? { w: authoritative.bbox.w, d: authoritative.bbox.d, h: authoritative.bbox.h } : null,
      previewFacing: sourcePreview.rotation != null ? sourcePreview.rotation : null,
      selectedInstanceUnchanged: true,
      terrainBlockPlacementActive: isTerrainBlockPlacementActive(),
      committedAsTerrainBlock: !!terrainBlockExtras,
      generatedBy: terrainBlockExtras ? terrainBlockExtras.generatedBy : null,
      terrainMaterialMergeKey: terrainBlockExtras ? terrainBlockExtras.terrainMaterialMergeKey : null,
      terrainManualShapePrefabId: terrainBlockExtras ? terrainBlockExtras.terrainManualShapePrefabId : null,
      terrainManualShapeLabel: terrainBlockExtras ? terrainBlockExtras.terrainManualShapeLabel : null,
      terrainManualColumnHeight: terrainBlockExtras ? terrainBlockExtras.terrainManualColumnHeight : null
    };
    placementRoute('placement-commit', commitPayload);
    if (terrainBlockExtras && typeof pushLog === 'function') {
      try { pushLog('[MANUAL-TERRAIN-PLACE] ' + JSON.stringify(commitPayload)); } catch (_) {}
    }
    recordItemRotationDiagnostic('placement-commit', commitPayload);
    var sceneGraphApi = getSceneGraphOwnerApi();
    if (sceneGraphApi && typeof sceneGraphApi.addInstance === 'function') sceneGraphApi.addInstance(instance, { source: 'placement:placeCurrentPrefab' });
    else {
      instances.push(instance);
      rebuildBoxesFromInstances({ source: 'placement:placeCurrentPrefab' });
      placementStateWrite('addInstance', { source: 'placement:placeCurrentPrefab', instanceId: instance.instanceId, prefabId: instance.prefabId, instances: instances.length, boxes: boxes.length });
    }
    return instance;
  }

  function commitPreview() {
    var editorRef = getPlacementEditorRef();
    if (!editorRef || !editorRef.preview || !editorRef.preview.valid) {
      if (verboseLog) pushLog(`commit-preview skipped: preview=${JSON.stringify((editorRef && editorRef.preview) || null)}`);
      return;
    }
    placementRoute('commitPreview', { mode: editorRef.mode, prefabId: editorRef.preview.prefabId || null, origin: editorRef.preview.origin || null, boxes: editorRef.preview.boxes ? editorRef.preview.boxes.length : 0 });
    if (editorRef.mode === 'drag' && editorRef.draggingInstance) {
      var authoritativeDrag = resolveAuthoritativePlacement(editorRef.preview, {
        source: 'placement:commitPreview.drag',
        ignoreInstanceId: editorRef.draggingInstance.instanceId || null,
        rotation: editorRef.draggingInstance.rotation || 0
      });
      if (!authoritativeDrag || !authoritativeDrag.valid || !authoritativeDrag.origin) {
        placementWarn('commitPreview.drag: domain-authority-rejected', {
          reason: authoritativeDrag && authoritativeDrag.reason ? authoritativeDrag.reason : 'domain-null',
          instanceId: editorRef.draggingInstance.instanceId || null,
          source: 'placement:commitPreview.drag'
        });
        return;
      }
      var moved = movePlacedInstance(editorRef.draggingInstance, authoritativeDrag.origin);
      var sceneGraphApi = getSceneGraphOwnerApi();
      if (sceneGraphApi && typeof sceneGraphApi.addInstance === 'function') sceneGraphApi.addInstance(moved, { source: 'placement:commitPreview.drag' });
      else {
        instances.push(moved);
        rebuildBoxesFromInstances({ source: 'placement:commitPreview.drag' });
        placementStateWrite('addInstance', { source: 'placement:commitPreview.drag', instanceId: moved.instanceId, prefabId: moved.prefabId, instances: instances.length, boxes: boxes.length });
      }
      if (verboseLog) pushLog(`drag-commit ${moved.instanceId}:${getPrefabById(moved.prefabId).name} -> (${moved.x},${moved.y},${moved.z})`);
      var placementControllerAfterCommit = getPlacementControllerApi();
      if (placementControllerAfterCommit && typeof placementControllerAfterCommit.completeDragInteraction === 'function') {
        placementRoute('commitPreview.drag:application-new-path-hit', placementControllerAfterCommit.completeDragInteraction('commit', { source: 'placement:commitPreview.drag', syncUi: true, requeuePreview: false }));
      } else {
        var placementEffectsAfterCommit = getPlacementEffectsApi();
        if (placementEffectsAfterCommit && typeof placementEffectsAfterCommit.finishDragCommit === 'function') {
          placementRoute('commitPreview.drag:new-path-hit', placementEffectsAfterCommit.finishDragCommit({ source: 'placement:commitPreview.drag' }));
          if (placementEffectsAfterCommit && typeof placementEffectsAfterCommit.syncPlacementUi === 'function') {
            placementRoute('commitPreview.drag:ui-sync-new-path-hit', placementEffectsAfterCommit.syncPlacementUi({ source: 'placement:commitPreview.drag', requeuePreview: false }));
          }
        } else {
          placementRoute('commitPreview.drag:legacy-fallback', { reason: 'missing-placement-effects-and-controller' });
          if (editorRef) editorRef.draggingInstance = null;
          var runtimeApiAfterCommit = getRuntimeStateApi();
          if (runtimeApiAfterCommit && typeof runtimeApiAfterCommit.setEditorModeValue === 'function') runtimeApiAfterCommit.setEditorModeValue('place', { source: 'placement:commitPreview.drag' });
          else if (editorRef) editorRef.mode = 'place';
        }
      }
      pushLog(`scene-after-drag-commit: instances=${instances.length} boxes=${boxes.length}`);
      if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('drag-commit');
    } else if (editor.mode === 'place') {
      var instance = placeCurrentPrefab(editorRef.preview);
      if (!instance) {
        if (verboseLog) pushLog('place skipped: domain validation rejected preview');
        return;
      }
      var placedPrefab = getPrefabById(instance.prefabId);
      pushLog(`place ${instance.instanceId}:${placedPrefab.name} at (${instance.x},${instance.y},${instance.z}) voxels=${editorRef.preview.boxes.length}`);
      if (placedPrefab && placedPrefab.kind === 'habbo_import') detailLog('[place-trace] commit habbo prefab=' + placedPrefab.id + ' instance=' + instance.instanceId + ' origin=(' + [instance.x,instance.y,instance.z].join(',') + ') previewOrigin=(' + [editorRef.preview.origin.x,editorRef.preview.origin.y,editorRef.preview.origin.z].join(',') + ') previewBBox=' + JSON.stringify(editorRef.preview.bbox || null) + ' proxy=' + [placedPrefab.w,placedPrefab.d,placedPrefab.h].join('x'));
      var placementControllerAfterPlace = getPlacementControllerApi();
      if (placementControllerAfterPlace && typeof placementControllerAfterPlace.syncPlacementUi === 'function') {
        recordPlacementBoundaryEvent('controller', 'controllers.placement.syncPlacementUi', { source: 'placement:commitPreview.place', requeuePreview: true });
        recordPlacementBoundaryEvent('placement-effects', 'placement.effects.syncPlacementUi(via-controller)', { source: 'placement:commitPreview.place', viaController: true, requeuePreview: true });
        placementRoute('commitPreview.place:application-ui-new-path-hit', placementControllerAfterPlace.syncPlacementUi({ source: 'placement:commitPreview.place', requeuePreview: true }));
      } else {
        var placementEffectsAfterPlace = getPlacementEffectsApi();
        if (placementEffectsAfterPlace && typeof placementEffectsAfterPlace.syncPlacementUi === 'function') {
          placementRoute('commitPreview.place:ui-sync-new-path-hit', placementEffectsAfterPlace.syncPlacementUi({ source: 'placement:commitPreview.place', requeuePreview: true }));
        } else {
          placementRoute('commitPreview.place:ui-sync-legacy-fallback', { reason: 'missing-placement-effects-and-controller' });
          recordPlacementBoundaryFallback('placement.effects.syncPlacementUi', { source: 'placement:commitPreview.place', reason: 'missing-placement-effects-and-controller' });
        }
      }
      pushLog(`scene-after-place: instances=${instances.length} boxes=${boxes.length}`);
      if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('place');
    }
  }

  function commitPlacementPreview() {
    return commitPreview();
  }

  function cancelDrag() {
    var editorRef = getPlacementEditorRef();
    placementRoute('cancelDrag', { mode: editorRef && editorRef.mode ? editorRef.mode : null, draggingInstanceId: editorRef && editorRef.draggingInstance && editorRef.draggingInstance.instanceId ? editorRef.draggingInstance.instanceId : null });
    if (editorRef && editorRef.mode === 'drag' && editorRef.draggingInstance) {
      if (verboseLog) pushLog(`drag-cancel ${editorRef.draggingInstance.instanceId}:${getPrefabById(editorRef.draggingInstance.prefabId).name}`);
      var sceneGraphApi = getSceneGraphOwnerApi();
      if (sceneGraphApi && typeof sceneGraphApi.addInstance === 'function') sceneGraphApi.addInstance(editorRef.draggingInstance, { source: 'placement:cancelDrag' });
      else {
        instances.push(editorRef.draggingInstance);
        rebuildBoxesFromInstances({ source: 'placement:cancelDrag' });
        placementStateWrite('addInstance', { source: 'placement:cancelDrag', instanceId: editorRef.draggingInstance.instanceId, prefabId: editorRef.draggingInstance.prefabId, instances: instances.length, boxes: boxes.length });
      }
      var placementControllerOnCancel = getPlacementControllerApi();
      if (placementControllerOnCancel && typeof placementControllerOnCancel.completeDragInteraction === 'function') {
        placementRoute('cancelDrag:application-new-path-hit', placementControllerOnCancel.completeDragInteraction('cancel', { source: 'placement:cancelDrag', syncUi: true, requeuePreview: false }));
      } else {
        var placementEffectsOnCancel = getPlacementEffectsApi();
        if (placementEffectsOnCancel && typeof placementEffectsOnCancel.finishDragCancel === 'function') {
          placementRoute('cancelDrag:new-path-hit', placementEffectsOnCancel.finishDragCancel({ source: 'placement:cancelDrag' }));
        } else {
          placementRoute('cancelDrag:legacy-fallback', { reason: 'missing-placement-effects-and-controller' });
          if (editorRef) editorRef.draggingInstance = null;
        }
      }
      pushLog(`scene-after-drag-cancel: instances=${instances.length} boxes=${boxes.length}`);
      if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('drag-cancel');
    }
    if (editorRef && editorRef.mode === 'drag') {
      var placementEffectsForMode = getPlacementEffectsApi();
      if (placementEffectsForMode && typeof placementEffectsForMode.finishDragCancel === 'function') placementEffectsForMode.finishDragCancel({ source: 'placement:cancelDrag:mode-reset' });
      else {
        var runtimeApiForMode = getRuntimeStateApi();
        if (runtimeApiForMode && typeof runtimeApiForMode.setEditorModeValue === 'function') runtimeApiForMode.setEditorModeValue('place', { source: 'placement:cancelDrag:mode-reset' });
        else editorRef.mode = 'place';
      }
    }
    var placementControllerSync = getPlacementControllerApi();
    if (placementControllerSync && typeof placementControllerSync.completeDragInteraction === 'function' && (!editorRef || editorRef.mode !== 'drag')) {
      placementRoute('cancelDrag:ui-application-postcheck', { source: 'placement:cancelDrag', mode: editorRef && editorRef.mode ? editorRef.mode : null, alreadyHandled: true });
    } else {
      var placementEffectsSync = getPlacementEffectsApi();
      if (placementEffectsSync && typeof placementEffectsSync.syncPlacementUi === 'function') {
        placementRoute('cancelDrag:ui-sync-new-path-hit', placementEffectsSync.syncPlacementUi({ source: 'placement:cancelDrag', requeuePreview: false }));
      } else {
        placementRoute('cancelDrag:ui-sync-legacy-fallback', { reason: 'missing-placement-effects' });
        recordPlacementBoundaryFallback('placement.effects.syncPlacementUi', { source: 'placement:cancelDrag', reason: 'missing-placement-effects' });
        if (editorRef && editorRef.mode !== 'place') editorRef.preview = null;
      }
    }
  }


  function normalizeItemFacing(rotation) {
    return ((parseInt(rotation || 0, 10) % 4) + 4) % 4;
  }

  function updateInstanceRotation(instanceId, rotation, meta) {
    var targetId = String(instanceId || '');
    var nextRotation = normalizeItemFacing(rotation);
    var inst = findInstanceById(targetId);
    if (!inst) {
      placementRoute('updateInstanceRotation:missing', { instanceId: targetId, rotation: nextRotation, source: meta && meta.source ? String(meta.source) : 'placement:updateInstanceRotation' });
      return null;
    }
    inst.rotation = nextRotation;
    rebuildBoxesFromInstances({ source: meta && meta.source ? String(meta.source) : 'placement:updateInstanceRotation' });
    placementStateWrite('updateInstanceRotation', {
      source: meta && meta.source ? String(meta.source) : 'placement:updateInstanceRotation',
      instanceId: targetId,
      rotation: nextRotation,
      instances: instances.length,
      boxes: boxes.length
    });
    placementRoute('updateInstanceRotation', {
      instanceId: targetId,
      rotation: nextRotation,
      source: meta && meta.source ? String(meta.source) : 'placement:updateInstanceRotation'
    });
    return inst;
  }

  function rotatePlacedInstance(instanceId, step, meta) {
    var inst = findInstanceById(instanceId);
    if (!inst) return null;
    return updateInstanceRotation(instanceId, normalizeItemFacing((inst.rotation || 0) + (parseInt(step || 0, 10) || 0)), meta || { source: 'placement:rotatePlacedInstance' });
  }

  var placementCoreApi = {
    summarizeBoundary: summarizePlacementBoundary,
    resetBoundaryAudit: resetPlacementBoundaryAudit,
    owner: PLACEMENT_MODULE_OWNER,
    allocInstanceId: allocInstanceId,
    makeInstance: makeInstance,
    createPlacedInstance: createPlacedInstance,
    recomputeNextInstanceSerial: recomputeNextInstanceSerial,
    expandInstanceToBoxes: expandInstanceToBoxes,
    expandInstanceToPrimitives: expandInstanceToPrimitives,
    normalizeMicroTriMeta: normalizeMicroTriMeta,
    rebuildBoxesFromInstances: rebuildBoxesFromInstances,
    refreshPlacementOrdering: refreshPlacementOrdering,
    instanceFitsGrid: instanceFitsGrid,
    filterInstancesToGrid: filterInstancesToGrid,
    findInstanceById: findInstanceById,
    findInstanceForBox: findInstanceForBox,
    removeInstanceById: removeInstanceById,
    removePlacedInstance: removePlacedInstance,
    defaultInstances: defaultInstances,
    defaultBoxes: defaultBoxes,
    legacyPrefabIdForBox: legacyPrefabIdForBox,
    ensureLegacyPrefabFromBox: ensureLegacyPrefabFromBox,
    legacyBoxesToInstances: legacyBoxesToInstances,
    startDragging: startDragging,
    movePlacedInstance: movePlacedInstance,
    enterTerrainBlockPlacement: enterTerrainBlockPlacement,
    exitTerrainBlockPlacement: exitTerrainBlockPlacement,
    isTerrainBlockPlacementActive: isTerrainBlockPlacementActive,
    getManualTerrainBlockPlacementState: getManualTerrainBlockPlacementState,
    addManualTerrainFaceMergeStressPreset: addManualTerrainFaceMergeStressPreset,
    updateInstanceRotation: updateInstanceRotation,
    rotatePlacedInstance: rotatePlacedInstance,
    placeCurrentPrefab: placeCurrentPrefab,
    commitPreview: commitPreview,
    commitPlacementPreview: commitPlacementPreview,
    cancelDrag: cancelDrag,
    assertPlacementOwnership: assertPlacementOwnership
  };
  window.__PLACEMENT_CORE_API__ = placementCoreApi;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('application.placementCore', placementCoreApi, { owner: PLACEMENT_MODULE_OWNER, phase: 'P13-APP' });
    window.__APP_NAMESPACE.bind('application.placementBoundary', placementCoreApi, { owner: PLACEMENT_MODULE_OWNER, phase: 'P20-PLACEMENT' });
  }

  installCompatExport('allocInstanceId', allocInstanceId);
  installCompatExport('makeInstance', makeInstance);
  installCompatExport('createPlacedInstance', createPlacedInstance);
  installCompatExport('recomputeNextInstanceSerial', recomputeNextInstanceSerial);
  installCompatExport('expandInstanceToBoxes', expandInstanceToBoxes);
  installCompatExport('expandInstanceToPrimitives', expandInstanceToPrimitives);
  installCompatExport('rebuildBoxesFromInstances', rebuildBoxesFromInstances);
  installCompatExport('refreshPlacementOrdering', refreshPlacementOrdering);
  installCompatExport('instanceFitsGrid', instanceFitsGrid);
  installCompatExport('filterInstancesToGrid', filterInstancesToGrid);
  installCompatExport('findInstanceById', findInstanceById);
  installCompatExport('findInstanceForBox', findInstanceForBox);
  installCompatExport('removeInstanceById', removeInstanceById);
  installCompatExport('removePlacedInstance', removePlacedInstance);
  installCompatExport('defaultInstances', defaultInstances);
  installCompatExport('defaultBoxes', defaultBoxes);
  installCompatExport('legacyPrefabIdForBox', legacyPrefabIdForBox);
  installCompatExport('ensureLegacyPrefabFromBox', ensureLegacyPrefabFromBox);
  installCompatExport('legacyBoxesToInstances', legacyBoxesToInstances);
  installCompatExport('startDragging', startDragging);
  installCompatExport('movePlacedInstance', movePlacedInstance);
  installCompatExport('enterTerrainBlockPlacement', enterTerrainBlockPlacement);
  installCompatExport('exitTerrainBlockPlacement', exitTerrainBlockPlacement);
  installCompatExport('isTerrainBlockPlacementActive', isTerrainBlockPlacementActive);
  installCompatExport('getManualTerrainBlockPlacementState', getManualTerrainBlockPlacementState);
  installCompatExport('addManualTerrainFaceMergeStressPreset', addManualTerrainFaceMergeStressPreset);
  installCompatExport('updateInstanceRotation', updateInstanceRotation);
  installCompatExport('rotatePlacedInstance', rotatePlacedInstance);
  installCompatExport('placeCurrentPrefab', placeCurrentPrefab);
  installCompatExport('commitPreview', commitPreview);
  installCompatExport('commitPlacementPreview', commitPlacementPreview);
  installCompatExport('cancelDrag', cancelDrag);
  installCompatExport('assertPlacementOwnership', assertPlacementOwnership);

  for (var __i = 0; __i < PLACEMENT_CRITICAL_EXPORTS.length; __i++) {
    tagPlacementExport(PLACEMENT_CRITICAL_EXPORTS[__i]);
  }
  tagPlacementExport('assertPlacementOwnership');
  assertPlacementOwnership('module-load');

  placementRoute('module-loaded', {
    exported: [
      'makeInstance','rebuildBoxesFromInstances','removeInstanceById','startDragging','commitPreview','cancelDrag','enterTerrainBlockPlacement','addManualTerrainFaceMergeStressPreset'
    ],
    owner: PLACEMENT_MODULE_OWNER,
    criticalExports: PLACEMENT_CRITICAL_EXPORTS.length
  });
})();
