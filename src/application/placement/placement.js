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
  'placeCurrentPrefab',
  'commitPreview',
  'commitPlacementPreview',
  'cancelDrag'
];
var PLACEMENT_MAINPATH_COMPAT_EXPORTS = ['startDragging', 'commitPreview', 'cancelDrag'];

(function () {
  var PLACEMENT_BOUNDARY_AUDIT_LIMIT = 80;
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
        semanticTextureMap: instance.semanticTextureMap || null,
        semanticTextures: instance.semanticTextures || null,
        semanticFaceColors: instance.semanticFaceColors || null,
        localIndex: i,
      });
    }
    return out;
  }

  function rebuildBoxesFromInstances() {
    nextId = 1;
    var domainCore = getDomainSceneCoreApi();
    if (domainCore && typeof domainCore.deriveBoxesFromInstances === 'function') {
      boxes = domainCore.deriveBoxesFromInstances(instances, expandInstanceToBoxes);
    } else {
      var rebuilt = [];
      for (var i = 0; i < instances.length; i++) rebuilt.push.apply(rebuilt, expandInstanceToBoxes(instances[i], true));
      boxes = rebuilt;
    }
    placementStateWrite('replaceSceneGraph', { source: 'placement:rebuildBoxesFromInstances', instances: instances.length, boxes: boxes.length });
    placementRoute('rebuildBoxesFromInstances', { instances: instances.length, boxes: boxes.length });
    return boxes;
  }

  function refreshPlacementOrdering(reason) {
    placementRoute('refreshPlacementOrdering', { reason: reason || 'unspecified' });
    rebuildBoxesFromInstances();
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
    rebuildBoxesFromInstances();
    placementStateWrite('removeInstanceById', { source: 'placement:removeInstanceById', instanceId: instanceId, instances: instances.length, boxes: boxes.length, fallback: true });
    return true;
  }

  function removePlacedInstance(instanceId) {
    return removeInstanceById(instanceId);
  }

  function defaultInstances() {
    var localSerial = 1;
    function nextDefaultId() {
      return 'obj_' + String(localSerial++).padStart(4, '0');
    }
    return [
      makeInstance('bench_2x1', 1, 5, 0, 0, { instanceId: nextDefaultId(), source: 'placement:defaultInstances' }),
      makeInstance('table_2x1', 2, 2, 0, 0, { instanceId: nextDefaultId(), name: 'Table', source: 'placement:defaultInstances' }),
      makeInstance('sofa_2x1', 4, 5, 0, 0, { instanceId: nextDefaultId(), source: 'placement:defaultInstances' }),
      makeInstance('cabinet_1x1x2', 7, 2, 0, 0, { instanceId: nextDefaultId(), source: 'placement:defaultInstances' }),
      makeInstance('cube_1x1', 8, 6, 0, 0, { instanceId: nextDefaultId(), source: 'placement:defaultInstances' }),
    ];
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
    removeInstanceById(instance.instanceId);
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
    var instance = makeInstance(authoritative.prefabId || sourcePreview.prefabId || selectedPrefabId || fallbackPrefabId, authoritative.origin.x, authoritative.origin.y, authoritative.origin.z, committedRotation);
    var commitPayload = {
      instanceId: instance.instanceId || null,
      prefabId: instance.prefabId || null,
      committedFacing: committedRotation,
      origin: { x: instance.x, y: instance.y, z: instance.z },
      footprint: authoritative.bbox ? { w: authoritative.bbox.w, d: authoritative.bbox.d, h: authoritative.bbox.h } : null,
      previewFacing: sourcePreview.rotation != null ? sourcePreview.rotation : null,
      selectedInstanceUnchanged: true
    };
    placementRoute('placement-commit', commitPayload);
    recordItemRotationDiagnostic('placement-commit', commitPayload);
    var sceneGraphApi = getSceneGraphOwnerApi();
    if (sceneGraphApi && typeof sceneGraphApi.addInstance === 'function') sceneGraphApi.addInstance(instance, { source: 'placement:placeCurrentPrefab' });
    else {
      instances.push(instance);
      rebuildBoxesFromInstances();
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
        rebuildBoxesFromInstances();
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
        rebuildBoxesFromInstances();
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
    rebuildBoxesFromInstances();
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
      'makeInstance','rebuildBoxesFromInstances','removeInstanceById','startDragging','commitPreview','cancelDrag'
    ],
    owner: PLACEMENT_MODULE_OWNER,
    criticalExports: PLACEMENT_CRITICAL_EXPORTS.length
  });
})();
