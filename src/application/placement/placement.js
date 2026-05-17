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
      out.push({
        id: assignIds ? (nextBoxId + i) : i + 1,
        instanceId: instance.instanceId,
        prefabId: prefab.id,
        name: instance.name || prefab.name,
        x: instance.x + v.x,
        y: instance.y + v.y,
        z: instance.z + v.z,
        w: 1,
        d: 1,
        h: 1,
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
    emitPlacementSceneCommitProfile({
      reason: source,
      step: 'rebuildBoxesFromInstances',
      instancesBefore: Number(instances.length || 0),
      instancesAfter: Number(instances.length || 0),
      boxesBefore: Number(previousBoxes.length || 0),
      boxesAfter: Number(boxes.length || 0),
      deriveBoxesMs: Number(deriveBoxesMs.toFixed(3)),
      occupancyUpdateMs: Number(occupancyUpdateMs.toFixed(3)),
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
    var instance = makeInstance(committedPrefabId, authoritative.origin.x, authoritative.origin.y, authoritative.origin.z, committedRotation, terrainBlockExtras || undefined);
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
