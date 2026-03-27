// placement（物品放置与排序）独立模块
// 第一刀只集中“物品如何放入、移动、删除，以及何时触发排序”的入口。

var PLACEMENT_MODULE_OWNER = 'src/placement/placement.js';
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

(function () {
  function placementRoute(event, payload) {
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

  function allocInstanceId() {
    return 'obj_' + String(nextInstanceSerial++).padStart(4, '0');
  }

  function makeInstance(prefabId, x, y, z, rotation, extras) {
    extras = extras || {};
    placementRoute('makeInstance', { prefabId: prefabId, x: x, y: y, z: z || 0, rotation: rotation || 0, instanceId: extras.instanceId || null });
    return {
      instanceId: extras.instanceId || allocInstanceId(),
      prefabId: prefabId,
      x: x,
      y: y,
      z: z || 0,
      rotation: rotation || 0,
      name: extras.name,
    };
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

  function expandInstanceToBoxes(instance, assignIds) {
    if (assignIds === void 0) assignIds = true;
    var prefab = getPrefabById(instance.prefabId);
    var variant = prefabVariant(prefab, instance.rotation || 0);
    var out = [];
    for (var i = 0; i < variant.voxels.length; i++) {
      var v = variant.voxels[i];
      out.push({
        id: assignIds ? nextId++ : i + 1,
        instanceId: instance.instanceId,
        prefabId: prefab.id,
        name: instance.name || prefab.name,
        x: instance.x + v.x,
        y: instance.y + v.y,
        z: instance.z + v.z,
        w: 1,
        d: 1,
        h: 1,
        base: v.base || prefab.base,
        localIndex: i,
      });
    }
    return out;
  }

  function rebuildBoxesFromInstances() {
    nextId = 1;
    var rebuilt = [];
    for (var i = 0; i < instances.length; i++) rebuilt.push.apply(rebuilt, expandInstanceToBoxes(instances[i], true));
    boxes = rebuilt;
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
    instances = instances.filter(instanceFitsGrid);
    placementRoute('filterInstancesToGrid', { instances: instances.length });
  }

  function findInstanceById(instanceId) {
    return instances.find(function (inst) { return inst.instanceId === instanceId; }) || null;
  }

  function findInstanceForBox(box) {
    return box && box.instanceId ? findInstanceById(box.instanceId) : null;
  }

  function removeInstanceById(instanceId) {
    placementRoute('removeInstanceById', { instanceId: instanceId });
    instances = instances.filter(function (inst) { return inst.instanceId !== instanceId; });
    if (inspectorState.selectedInstanceId === instanceId) clearSelectedInstance();
    rebuildBoxesFromInstances();
  }

  function removePlacedInstance(instanceId) {
    return removeInstanceById(instanceId);
  }

  function defaultInstances() {
    nextInstanceSerial = 1;
    return [
      makeInstance('bench_2x1', 1, 5, 0, 0),
      makeInstance('table_2x1', 2, 2, 0, 0, { name: 'Table' }),
      makeInstance('sofa_2x1', 4, 5, 0, 0),
      makeInstance('cabinet_1x1x2', 7, 2, 0, 0),
      makeInstance('cube_1x1', 8, 6, 0, 0),
    ];
  }

  function defaultBoxes() {
    var savedInstances = instances;
    var savedNextId = nextId;
    instances = defaultInstances();
    nextId = 1;
    var result = [];
    for (var i = 0; i < instances.length; i++) result.push.apply(result, expandInstanceToBoxes(instances[i], true));
    instances = savedInstances;
    nextId = savedNextId;
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
    editor.mode = 'drag';
    editor.draggingInstance = Object.assign({}, instance);
    removeInstanceById(instance.instanceId);
    if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('startDragging');
    editor.preview = null;
    pushLog(`scene-after-drag-start: instances=${instances.length} boxes=${boxes.length}`);
  }

  function movePlacedInstance(instance, nextOrigin) {
    if (!instance || !nextOrigin) return null;
    return Object.assign({}, instance, { x: nextOrigin.x, y: nextOrigin.y, z: nextOrigin.z });
  }

  function placeCurrentPrefab(preview) {
    var sourcePreview = preview || editor.preview;
    if (!sourcePreview || !sourcePreview.valid || !sourcePreview.origin) return null;
    var instance = makeInstance(sourcePreview.prefabId || currentPrefab().id, sourcePreview.origin.x, sourcePreview.origin.y, sourcePreview.origin.z, sourcePreview.rotation || 0);
    instances.push(instance);
    rebuildBoxesFromInstances();
    return instance;
  }

  function commitPreview() {
    if (!editor.preview || !editor.preview.valid) {
      if (verboseLog) pushLog(`commit-preview skipped: preview=${JSON.stringify(editor.preview || null)}`);
      return;
    }
    placementRoute('commitPreview', { mode: editor.mode, prefabId: editor.preview.prefabId || null, origin: editor.preview.origin || null, boxes: editor.preview.boxes ? editor.preview.boxes.length : 0 });
    if (editor.mode === 'drag' && editor.draggingInstance) {
      var moved = movePlacedInstance(editor.draggingInstance, editor.preview.origin);
      instances.push(moved);
      rebuildBoxesFromInstances();
      if (verboseLog) pushLog(`drag-commit ${moved.instanceId}:${getPrefabById(moved.prefabId).name} -> (${moved.x},${moved.y},${moved.z})`);
      editor.draggingInstance = null;
      editor.mode = 'place';
      pushLog(`scene-after-drag-commit: instances=${instances.length} boxes=${boxes.length}`);
      if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('drag-commit');
    } else if (editor.mode === 'place') {
      var instance = placeCurrentPrefab(editor.preview);
      var placedPrefab = getPrefabById(instance.prefabId);
      pushLog(`place ${instance.instanceId}:${placedPrefab.name} at (${instance.x},${instance.y},${instance.z}) voxels=${editor.preview.boxes.length}`);
      if (placedPrefab && placedPrefab.kind === 'habbo_import') detailLog('[place-trace] commit habbo prefab=' + placedPrefab.id + ' instance=' + instance.instanceId + ' origin=(' + [instance.x,instance.y,instance.z].join(',') + ') previewOrigin=(' + [editor.preview.origin.x,editor.preview.origin.y,editor.preview.origin.z].join(',') + ') previewBBox=' + JSON.stringify(editor.preview.bbox || null) + ' proxy=' + [placedPrefab.w,placedPrefab.d,placedPrefab.h].join('x'));
      pushLog(`scene-after-place: instances=${instances.length} boxes=${boxes.length}`);
      if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('place');
    }
  }

  function commitPlacementPreview() {
    return commitPreview();
  }

  function cancelDrag() {
    placementRoute('cancelDrag', { mode: editor.mode, draggingInstanceId: editor.draggingInstance && editor.draggingInstance.instanceId ? editor.draggingInstance.instanceId : null });
    if (editor.mode === 'drag' && editor.draggingInstance) {
      if (verboseLog) pushLog(`drag-cancel ${editor.draggingInstance.instanceId}:${getPrefabById(editor.draggingInstance.prefabId).name}`);
      instances.push(editor.draggingInstance);
      rebuildBoxesFromInstances();
      editor.draggingInstance = null;
      pushLog(`scene-after-drag-cancel: instances=${instances.length} boxes=${boxes.length}`);
      if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('drag-cancel');
    }
    if (editor.mode === 'drag') editor.mode = 'place';
    updateModeButtons();
    if (editor.mode === 'place') updatePreview();
    else editor.preview = null;
  }

  window.allocInstanceId = allocInstanceId;
  window.makeInstance = makeInstance;
  window.createPlacedInstance = createPlacedInstance;
  window.recomputeNextInstanceSerial = recomputeNextInstanceSerial;
  window.expandInstanceToBoxes = expandInstanceToBoxes;
  window.rebuildBoxesFromInstances = rebuildBoxesFromInstances;
  window.refreshPlacementOrdering = refreshPlacementOrdering;
  window.instanceFitsGrid = instanceFitsGrid;
  window.filterInstancesToGrid = filterInstancesToGrid;
  window.findInstanceById = findInstanceById;
  window.findInstanceForBox = findInstanceForBox;
  window.removeInstanceById = removeInstanceById;
  window.removePlacedInstance = removePlacedInstance;
  window.defaultInstances = defaultInstances;
  window.defaultBoxes = defaultBoxes;
  window.legacyPrefabIdForBox = legacyPrefabIdForBox;
  window.ensureLegacyPrefabFromBox = ensureLegacyPrefabFromBox;
  window.legacyBoxesToInstances = legacyBoxesToInstances;
  window.startDragging = startDragging;
  window.movePlacedInstance = movePlacedInstance;
  window.placeCurrentPrefab = placeCurrentPrefab;
  window.commitPreview = commitPreview;
  window.commitPlacementPreview = commitPlacementPreview;
  window.cancelDrag = cancelDrag;
  window.assertPlacementOwnership = assertPlacementOwnership;

  for (var __i = 0; __i < PLACEMENT_CRITICAL_EXPORTS.length; __i++) tagPlacementExport(PLACEMENT_CRITICAL_EXPORTS[__i]);
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
