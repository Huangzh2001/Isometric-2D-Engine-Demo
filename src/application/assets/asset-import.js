var ASSET_IMPORT_OWNER = 'src/application/assets/asset-import.js';
var ASSET_IMPORT_PHASE = 'P16-ASSET';
var ASSET_IMPORT_AUDIT_LIMIT = 80;
var assetImportBoundaryAudit = {
  owner: ASSET_IMPORT_OWNER,
  phase: ASSET_IMPORT_PHASE,
  counters: {
    stateActionHits: 0,
    prefabRegistryHits: 0,
    runtimeStateHits: 0,
    placementControllerHits: 0,
    selectorHits: 0,
    serviceWorkflowHits: 0,
    legacyGlobalHits: 0,
    fallbackCount: 0
  },
  lastEvent: null,
  lastFallback: null,
  recentEvents: [],
  recentFallbacks: []
};

function getAssetImportNs() {
  return (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') ? window.__APP_NAMESPACE : null;
}

function assetImportPath(path) {
  var ns = getAssetImportNs();
  if (!ns) return null;
  try { return ns.getPath(String(path || '')) || null; } catch (_) { return null; }
}

function safeAssetImportClone(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
}

function pushAssetImportAudit(bucket, entry) {
  bucket.push(entry);
  if (bucket.length > ASSET_IMPORT_AUDIT_LIMIT) bucket.splice(0, bucket.length - ASSET_IMPORT_AUDIT_LIMIT);
  return entry;
}

function recordAssetImportEvent(kind, route, detail) {
  var entry = {
    at: (function () { try { return new Date().toISOString(); } catch (_) { return ''; } })(),
    kind: String(kind || ''),
    route: String(route || ''),
    detail: safeAssetImportClone(detail || null)
  };
  if (kind === 'state-action') assetImportBoundaryAudit.counters.stateActionHits += 1;
  else if (kind === 'prefab-registry') assetImportBoundaryAudit.counters.prefabRegistryHits += 1;
  else if (kind === 'runtime-state') assetImportBoundaryAudit.counters.runtimeStateHits += 1;
  else if (kind === 'placement-controller') assetImportBoundaryAudit.counters.placementControllerHits += 1;
  else if (kind === 'selector') assetImportBoundaryAudit.counters.selectorHits += 1;
  else if (kind === 'service-workflow') assetImportBoundaryAudit.counters.serviceWorkflowHits += 1;
  else if (kind === 'legacy-global') assetImportBoundaryAudit.counters.legacyGlobalHits += 1;
  assetImportBoundaryAudit.lastEvent = entry;
  pushAssetImportAudit(assetImportBoundaryAudit.recentEvents, entry);
  return entry;
}

function recordAssetImportFallback(route, detail) {
  var entry = {
    at: (function () { try { return new Date().toISOString(); } catch (_) { return ''; } })(),
    route: String(route || ''),
    detail: safeAssetImportClone(detail || null)
  };
  assetImportBoundaryAudit.counters.fallbackCount += 1;
  assetImportBoundaryAudit.lastFallback = entry;
  pushAssetImportAudit(assetImportBoundaryAudit.recentFallbacks, entry);
  return entry;
}

function summarizeAssetImportBoundary(label) {
  return {
    owner: ASSET_IMPORT_OWNER,
    phase: ASSET_IMPORT_PHASE,
    label: String(label || ''),
    available: true,
    counters: safeAssetImportClone(assetImportBoundaryAudit.counters),
    lastEvent: safeAssetImportClone(assetImportBoundaryAudit.lastEvent),
    lastFallback: safeAssetImportClone(assetImportBoundaryAudit.lastFallback),
    recentEvents: assetImportBoundaryAudit.recentEvents.slice(-8).map(safeAssetImportClone),
    recentFallbacks: assetImportBoundaryAudit.recentFallbacks.slice(-5).map(safeAssetImportClone)
  };
}

function resetAssetImportBoundary(meta) {
  assetImportBoundaryAudit.counters.stateActionHits = 0;
  assetImportBoundaryAudit.counters.prefabRegistryHits = 0;
  assetImportBoundaryAudit.counters.runtimeStateHits = 0;
  assetImportBoundaryAudit.counters.placementControllerHits = 0;
  assetImportBoundaryAudit.counters.selectorHits = 0;
  assetImportBoundaryAudit.counters.serviceWorkflowHits = 0;
  assetImportBoundaryAudit.counters.legacyGlobalHits = 0;
  assetImportBoundaryAudit.counters.fallbackCount = 0;
  assetImportBoundaryAudit.lastEvent = null;
  assetImportBoundaryAudit.lastFallback = null;
  assetImportBoundaryAudit.recentEvents = [];
  assetImportBoundaryAudit.recentFallbacks = [];
  recordAssetImportEvent('reset', 'asset-import-boundary.reset', meta || { source: 'asset-import:reset' });
  return summarizeAssetImportBoundary(meta && meta.label ? String(meta.label) : 'reset');
}

function getPrefabRegistryWriteApi() {
  return assetImportPath('state.prefabRegistry') || null;
}

function getRuntimeStateWriteApi() {
  return assetImportPath('state.runtimeState') || null;
}

function getStateActionsApi() {
  return assetImportPath('state.actions') || null;
}

function getPlacementControllerApi() {
  return assetImportPath('controllers.placement') || null;
}

function getSelectorsApi() {
  return assetImportPath('state.selectors') || null;
}

function getAssetWorkflowService() {
  return assetImportPath('services.assetWorkflow') || null;
}

function runStateAction(actionName, arg, source) {
  var actions = getStateActionsApi();
  if (!actions || typeof actions[actionName] !== 'function') return { ok: false, reason: 'missing-state-action', action: actionName };
  try {
    var result = actions[actionName](arg, { source: String(source || ('asset-import:' + actionName)) });
    recordAssetImportEvent('state-action', 'state.actions.' + String(actionName), { source: String(source || 'unknown'), arg: safeAssetImportClone(arg), result: result });
    assetImportLog('state-action:' + actionName + ' source=' + String(source || 'unknown') + ' ok=1');
    return { ok: true, result: result };
  } catch (err) {
    recordAssetImportFallback('state.actions.' + String(actionName), { source: String(source || 'unknown'), error: String(err && err.message ? err.message : err) });
    assetImportLog('state-action:' + actionName + ' source=' + String(source || 'unknown') + ' ok=0 error=' + String(err && err.message ? err.message : err));
    return { ok: false, reason: 'state-action-threw', action: actionName, error: err };
  }
}

function assetImportRefactorLog(message, extra) {
  if (typeof refactorLogCurrent === 'function') {
    refactorLogCurrent('AssetImport', message, extra);
    return;
  }
  if (typeof pushLog === 'function') {
    if (extra !== undefined) pushLog('[Refactor][Step-16][AssetImport] ' + message + ' ' + JSON.stringify(extra));
    else pushLog('[Refactor][Step-16][AssetImport] ' + message);
  }
}

function assetImportLog(message) {
  if (typeof pushLog === 'function') pushLog('[asset-import] ' + message);
}

function getRegistryPrototypes(source) {
  var registryApi = getPrefabRegistryWriteApi();
  if (registryApi && typeof registryApi.getPrototypes === 'function') {
    var list = registryApi.getPrototypes() || [];
    recordAssetImportEvent('prefab-registry', 'state.prefabRegistry.getPrototypes', { source: String(source || 'unknown'), count: Array.isArray(list) ? list.length : 0 });
    return Array.isArray(list) ? list : [];
  }
  recordAssetImportFallback('missing-state.prefabRegistry.getPrototypes', { source: String(source || 'unknown'), reason: 'prefab-registry-unavailable' });
  return [];
}

function findPrototypeIndexById(id, source) {
  var key = String(id || '').trim();
  if (!key) return -1;
  var list = getRegistryPrototypes(String(source || 'asset-import:find-prototype-index'));
  for (var i = 0; i < list.length; i++) {
    if (String(list[i] && list[i].id || '') === key) return i;
  }
  return -1;
}

function getImportedPrefabById(id) {
  var key = String(id || '').trim();
  var registryApi = getPrefabRegistryWriteApi();
  if (!key) return null;
  if (registryApi && typeof registryApi.getPrefabById === 'function') {
    var hit = registryApi.getPrefabById(key);
    var exact = hit && String(hit && hit.id || '') === key ? hit : null;
    recordAssetImportEvent('prefab-registry', 'state.prefabRegistry.getPrefabById', { prefabId: key, hit: !!exact });
    if (exact) return exact;
  }
  var list = getRegistryPrototypes('asset-import:getImportedPrefabById');
  for (var i = 0; i < list.length; i++) {
    if (String(list[i] && list[i].id || '') === key) return list[i];
  }
  return null;
}

function getEditorModeValue(source) {
  var selectors = getSelectorsApi();
  if (selectors && typeof selectors.getEditorMode === 'function') {
    var modeFromSelectors = String(selectors.getEditorMode() || 'view');
    recordAssetImportEvent('selector', 'state.selectors.getEditorMode', { source: String(source || 'unknown'), mode: modeFromSelectors });
    return modeFromSelectors;
  }
  var runtimeApi = getRuntimeStateWriteApi();
  if (runtimeApi && typeof runtimeApi.summarize === 'function') {
    var runtimeSummary = runtimeApi.summarize() || {};
    var modeFromRuntime = String(runtimeSummary.editorMode || 'view');
    recordAssetImportEvent('runtime-state', 'state.runtimeState.summarize', { source: String(source || 'unknown'), mode: modeFromRuntime });
    return modeFromRuntime;
  }
  if (runtimeApi && runtimeApi.editor) {
    var modeFromEditor = String(runtimeApi.editor.mode || 'view');
    recordAssetImportEvent('runtime-state', 'state.runtimeState.editor.mode', { source: String(source || 'unknown'), mode: modeFromEditor });
    return modeFromEditor;
  }
  recordAssetImportFallback('missing-editor-mode', { source: String(source || 'unknown'), reason: 'missing-selectors-and-runtime-state' });
  return 'view';
}

function refreshPrototypeSelection(source) {
  var registryApi = getPrefabRegistryWriteApi();
  if (registryApi && typeof registryApi.refreshPrototypeSelection === 'function') {
    var result = registryApi.refreshPrototypeSelection({ source: String(source || 'asset-import:refresh-prototype-selection') });
    recordAssetImportEvent('prefab-registry', 'state.prefabRegistry.refreshPrototypeSelection', { source: String(source || 'unknown') });
    return result;
  }
  recordAssetImportFallback('missing-refresh-prototype-selection', { source: String(source || 'unknown'), reason: 'missing-prefab-registry.refreshPrototypeSelection' });
  return null;
}

function persistCustomPrefabs(source) {
  var workflow = getAssetWorkflowService();
  if (workflow && typeof workflow.persistCustomPrefabs === 'function') {
    var result = workflow.persistCustomPrefabs({ source: String(source || 'asset-import:persistCustomPrefabs') });
    recordAssetImportEvent('service-workflow', 'services.assetWorkflow.persistCustomPrefabs', { source: String(source || 'unknown'), ok: !!(result && result.ok) });
    return !!(result && result.ok);
  }
  recordAssetImportFallback('missing-services.assetWorkflow.persistCustomPrefabs', { source: String(source || 'unknown') });
  return false;
}

function markAssetManagedPrefab(prefabId, source) {
  var workflow = getAssetWorkflowService();
  if (workflow && typeof workflow.markAssetManagedPrefab === 'function') {
    var result = workflow.markAssetManagedPrefab(prefabId, { source: String(source || 'asset-import:markAssetManagedPrefab') });
    recordAssetImportEvent('service-workflow', 'services.assetWorkflow.markAssetManagedPrefab', { source: String(source || 'unknown'), prefabId: String(prefabId || ''), ok: !!(result && result.ok) });
    return !!(result && result.ok);
  }
  recordAssetImportFallback('missing-services.assetWorkflow.markAssetManagedPrefab', { source: String(source || 'unknown'), prefabId: String(prefabId || '') });
  return false;
}

function traceImportedPrefab(prefab, sourceKind, source) {
  if (typeof tracePrefabRegister === 'function' && prefab && prefab.id) {
    tracePrefabRegister(prefab.id, sourceKind || 'import', {
      builtIn: false,
      voxels: (prefab.voxels && prefab.voxels.length) || 0,
      custom: !!prefab.custom,
      assetManaged: !!prefab.assetManaged,
      externalManaged: !!prefab.externalManaged
    });
    recordAssetImportEvent('legacy-global', 'global.tracePrefabRegister', { source: String(source || 'unknown'), prefabId: String(prefab.id || '') });
  }
}

function queueImportedLegacyRepair(prefab, source) {
  if (!prefab || !(typeof isLegacyFlatHabboPrefab === 'function') || !isLegacyFlatHabboPrefab(prefab)) return;
  pushLog('habbo-repair:queued prefab=' + prefab.id + ' source=' + source + ' reason=legacy-flat-prefab');
  if (typeof queueLegacyHabboPrefabRepair === 'function') {
    queueLegacyHabboPrefabRepair(prefab.id, 'import:' + source);
    recordAssetImportEvent('legacy-global', 'global.queueLegacyHabboPrefabRepair', { source: String(source || 'unknown'), prefabId: String(prefab.id || '') });
  }
}

function isBuiltInPrefabRecord(prefab) {
  return !!(prefab && !prefab.custom && !prefab.assetManaged && !prefab.externalManaged && !prefab.missingPrefab);
}

function normalizeImportedPrefabDefinition(def, options) {
  options = options || {};
  if (!def || typeof def !== 'object') {
    assetImportLog('import-prefab:skipped reason=invalid-object');
    return null;
  }
  var rawId = String(def.id || '').trim();
  if (!rawId) {
    assetImportLog('import-prefab:skipped reason=missing-id');
    return null;
  }
  var sourceKind = String(options.sourceKind || '').trim() || 'custom';
  var normalized = normalizePrefab(Object.assign({}, def, {
    id: rawId,
    key: def.key || '',
    custom: true,
  }));
  normalized.custom = !(sourceKind === 'asset' || sourceKind === 'habbo-root');
  normalized.assetManaged = sourceKind === 'asset';
  normalized.externalManaged = sourceKind === 'habbo-root';
  normalized.missingPrefab = false;
  normalized.importSourceKind = sourceKind;
  normalized.importSource = String(options.source || 'unknown');
  return normalized;
}

function dedupeImportedPrefab(defOrId, options) {
  options = options || {};
  var id = typeof defOrId === 'string'
    ? String(defOrId || '').trim()
    : String(defOrId && defOrId.id || '').trim();
  var existing = getImportedPrefabById(id);
  if (!existing) return { kind: 'new-prefab', id: id, existing: null };
  if (isBuiltInPrefabRecord(existing) && !options.replaceBuiltIn) {
    assetImportLog('import-prefab:skipped reason=built-in-conflict id=' + id + ' source=' + String(options.source || 'unknown'));
    return { kind: 'reject-built-in', id: id, existing: existing, reason: 'built-in-conflict' };
  }
  return { kind: 'existing-prefab', id: id, existing: existing, reason: existing.missingPrefab ? 'replace-missing-placeholder' : 'reuse-existing-prefab' };
}

function registerImportedPrefab(def, options) {
  options = options || {};
  var source = String(options.source || 'unknown');
  var sourceKind = String(options.sourceKind || '').trim() || 'custom';
  assetImportLog('import-prefab:start id=' + JSON.stringify(def && def.id || '') + ' source=' + source + ' sourceKind=' + sourceKind);
  var normalized = normalizeImportedPrefabDefinition(def, options);
  if (!normalized) return null;
  assetImportLog('import-prefab:normalized id=' + normalized.id + ' voxels=' + normalized.voxels.length + ' custom=' + (!!normalized.custom) + ' assetManaged=' + (!!normalized.assetManaged) + ' externalManaged=' + (!!normalized.externalManaged));

  var dedupe = dedupeImportedPrefab(normalized, options);
  if (dedupe.kind === 'reject-built-in') {
    return null;
  }

  var action = 'append-new';
  var resultPrefab = normalized;
  var existingIndex = dedupe.existing ? findPrototypeIndexById(dedupe.existing.id, 'asset-import:register-existing-index') : -1;
  var registryApi = getPrefabRegistryWriteApi();

  if (dedupe.kind === 'existing-prefab') {
    assetImportLog('import-prefab:dedupe-hit id=' + normalized.id + ' kind=existing-prefab strategy=' + dedupe.reason + ' source=' + source);
    action = existingIndex >= 0 ? 'update-existing' : 'append-missing-index';
  }

  assetImportLog('import-prefab:register-start id=' + normalized.id + ' action=' + action + ' source=' + source);
  if (registryApi && typeof registryApi.replacePrefabById === 'function' && existingIndex >= 0) {
    resultPrefab = registryApi.replacePrefabById(normalized.id, normalized, { source: source });
    recordAssetImportEvent('prefab-registry', 'state.prefabRegistry.replacePrefabById', { source: source, prefabId: normalized.id, action: action });
  } else if (registryApi && typeof registryApi.registerPrefab === 'function') {
    resultPrefab = registryApi.registerPrefab(normalized, { source: source });
    recordAssetImportEvent('prefab-registry', 'state.prefabRegistry.registerPrefab', { source: source, prefabId: normalized.id, action: action });
  } else {
    var list = getRegistryPrototypes('asset-import:register-legacy-prototypes');
    if (existingIndex >= 0) {
      list[existingIndex] = normalized;
      resultPrefab = list[existingIndex];
    } else {
      list.push(normalized);
      resultPrefab = normalized;
    }
    recordAssetImportEvent('legacy-global', 'global.prototypes.mutate', { source: source, prefabId: normalized.id, action: action });
    recordAssetImportFallback('global.prototypes.mutate', { source: source, prefabId: normalized.id, reason: 'missing-prefab-registry.register-or-replace' });
  }
  resultPrefab = getImportedPrefabById(normalized.id) || resultPrefab || normalized;

  if (options.persist !== false) {
    persistCustomPrefabs(source);
  }
  if (resultPrefab.assetManaged) {
    markAssetManagedPrefab(resultPrefab.id, source);
  }
  traceImportedPrefab(resultPrefab, sourceKind || 'import', source);
  assetImportLog('import-prefab:register-done id=' + resultPrefab.id + ' action=' + action + ' index=' + findPrototypeIndexById(resultPrefab.id, 'asset-import:register-done-index'));
  pushLog('prefab-import: id=' + resultPrefab.id + ' voxels=' + resultPrefab.voxels.length + ' explicit=' + (resultPrefab.explicitVoxelCount == null ? 'n/a' : resultPrefab.explicitVoxelCount) + ' fallback=' + (resultPrefab.proxyFallbackUsed ? 1 : 0) + ' source=' + source);
  queueImportedLegacyRepair(resultPrefab, source);
  return resultPrefab;
}

function selectImportedPrefabForEditor(prefab, options) {
  options = options || {};
  if (!prefab) return { prefab: null, prototypeIndex: -1 };
  var protoIndex = findPrototypeIndexById(prefab.id, 'asset-import:select-start');
  if (protoIndex < 0) throw new Error('导入 prefab 成功，但没有注册到原型列表');
  assetImportLog('import-prefab:select-start id=' + prefab.id + ' source=' + String(options.source || 'unknown') + ' index=' + protoIndex);
  var selectSource = String(options.source || 'asset-import:select');
  var stateActionResult = runStateAction('selectPrefabById', prefab.id, selectSource);
  if (stateActionResult.ok) {
    protoIndex = Number(stateActionResult.result);
    if (!Number.isFinite(protoIndex) || protoIndex < 0) protoIndex = findPrototypeIndexById(prefab.id, 'asset-import:select-after-state-action');
  } else {
    var registryApi = getPrefabRegistryWriteApi();
    if (registryApi && typeof registryApi.setSelectedPrefabId === 'function') {
      protoIndex = registryApi.setSelectedPrefabId(prefab.id, { source: selectSource });
      recordAssetImportEvent('prefab-registry', 'state.prefabRegistry.setSelectedPrefabId', { source: selectSource, prefabId: String(prefab.id || ''), result: protoIndex });
      recordAssetImportFallback('state.actions.selectPrefabById', { source: selectSource, reason: stateActionResult.reason || 'missing-state-action' });
      assetImportLog('state-action:selectPrefabById fallback=1 source=' + selectSource + ' index=' + protoIndex);
    } else {
      recordAssetImportFallback('state.prefabRegistry.setSelectedPrefabId', { source: selectSource, reason: 'missing-prefab-route', prefabId: String(prefab.id || '') });
      assetImportLog('state-action:selectPrefabById fallback=1 source=' + selectSource + ' index=missing-prefab-route');
      return { prefab: prefab, prototypeIndex: -1 };
    }
  }
  refreshPrototypeSelection(String(options.refreshSource || 'asset-import:select-imported-prefab'));
  assetImportLog('import-prefab:select-done id=' + prefab.id + ' source=' + String(options.source || 'unknown') + ' index=' + protoIndex);
  return { prefab: prefab, prototypeIndex: protoIndex };
}

function enterPlacementModeForImportedPrefab(prefab, options) {
  options = options || {};
  if (!prefab) return { prefab: null, mode: getEditorModeValue('asset-import:placement-empty') };
  var source = String(options.source || 'unknown');
  var runtimeApi = getRuntimeStateWriteApi();
  var modeBefore = getEditorModeValue('asset-import:placement-ready');
  assetImportLog('import-prefab:placement-ready id=' + prefab.id + ' source=' + source + ' modeBefore=' + modeBefore);
  var modeAction = runStateAction('requestModeChange', 'place', source);
  if (!modeAction.ok) {
    if (runtimeApi && typeof runtimeApi.setEditorModeValue === 'function') {
      runtimeApi.setEditorModeValue('place', { source: source });
      recordAssetImportEvent('runtime-state', 'state.runtimeState.setEditorModeValue', { source: source, mode: 'place' });
      recordAssetImportFallback('state.actions.requestModeChange', { source: source, reason: modeAction.reason || 'missing-state-action' });
    } else {
      recordAssetImportFallback('state.runtimeState.setEditorModeValue', { source: source, reason: 'missing-runtime-setEditorModeValue' });
    }
    assetImportLog('state-action:requestModeChange fallback=1 source=' + source + ' targetMode=place');
  }
  return { prefab: prefab, mode: getEditorModeValue('asset-import:placement-after') };
}

function prepareImportedPrefabForPlacement(prefab, options) {
  options = options || {};
  var source = String(options.source || 'unknown');
  var placementController = getPlacementControllerApi();
  var selected = null;
  if (placementController && typeof placementController.applyPlacementIntent === 'function') {
    var applied = placementController.applyPlacementIntent({
      prefabId: prefab && prefab.id ? prefab.id : null,
      mode: 'place',
      source: source,
      forcePreview: true,
      requeuePreview: false,
      syncUi: true
    }) || {};
    var appliedIndex = (applied.state && typeof applied.state.afterIndex !== 'undefined') ? Number(applied.state.afterIndex) : findPrototypeIndexById(prefab && prefab.id, 'asset-import:apply-intent-index');
    selected = { prefab: prefab, prototypeIndex: appliedIndex, application: true, result: applied };
    recordAssetImportEvent('placement-controller', 'controllers.placement.applyPlacementIntent', { source: source, prefabId: String(prefab && prefab.id || ''), mode: 'place', index: appliedIndex });
    assetImportLog('placement-application:applyPlacementIntent source=' + source + ' prefab=' + String(prefab && prefab.id || '') + ' ok=1 index=' + appliedIndex);
  } else {
    selected = selectImportedPrefabForEditor(prefab, {
      source: source,
      refreshSource: String(options.refreshSource || 'asset-import:prepare-imported-prefab-for-placement'),
    });
    enterPlacementModeForImportedPrefab(prefab, { source: source });
    recordAssetImportFallback('controllers.placement.applyPlacementIntent', { source: source, reason: 'missing-placement-controller.applyPlacementIntent' });
    assetImportLog('placement-application:applyPlacementIntent source=' + source + ' prefab=' + String(prefab && prefab.id || '') + ' ok=0 fallback=legacy-select-and-mode');
  }
  var sprite0 = prefab && prefab.spriteDirections && prefab.spriteDirections['0'] ? prefab.spriteDirections['0'] : (prefab ? prefab.sprite : null);
  var debugBits = [];
  if (prefab && prefab.habboMeta && prefab.habboMeta.dimensions) {
    var rawDims = prefab.habboMeta.dimensions;
    debugBits.push('rawDims=' + [rawDims.x, rawDims.y, rawDims.z].join('x'));
    if (prefab.habboMeta.proxyDims) debugBits.push('proxyDims=' + [prefab.habboMeta.proxyDims.x, prefab.habboMeta.proxyDims.y, prefab.habboMeta.proxyDims.z].join('x'));
  }
  if (sprite0) {
    debugBits.push('sprite0=' + (sprite0.width || '?') + 'x' + (sprite0.height || '?'));
    debugBits.push('offset=(' + ((sprite0.offsetPx && sprite0.offsetPx.x) || 0) + ',' + ((sprite0.offsetPx && sprite0.offsetPx.y) || 0) + ')');
    if (Array.isArray(sprite0.debugPlacement)) {
      debugBits.push('layers=' + sprite0.debugPlacement.map(function (p) { return p.name + '@reg(' + p.regX + ',' + p.regY + ')->tl(' + p.topLeftX + ',' + p.topLeftY + ')'; }).join('|'));
    }
  }
  if (prefab && (prefab.kind === 'habbo_import' || prefab.habboMeta)) {
    if (typeof pushHabboDebug === 'function') {
      pushHabboDebug('prefab-built', { id: prefab.id, name: prefab.name, anchor: prefab.anchor || null, proxy: { w: prefab.w, d: prefab.d, h: prefab.h }, voxels: ((prefab.voxels && prefab.voxels.length) || 0), layerDirs: Object.keys(prefab.habboLayerDirections || {}), spriteDirs: Object.keys(prefab.spriteDirections || {}), habboMeta: prefab.habboMeta || null });
    }
    if (typeof habboTrace === 'function') {
      habboTrace('prefab-built id=' + prefab.id + ' name=' + prefab.name + ' anchor=' + JSON.stringify(prefab.anchor || null) + ' proxy=' + [prefab.w,prefab.d,prefab.h].join('x') + ' voxels=' + ((prefab.voxels && prefab.voxels.length) || 0) + ' layerDirs=' + Object.keys(prefab.habboLayerDirections || {}).join(',') + ' spriteDirs=' + Object.keys(prefab.spriteDirections || {}).join(','));
    }
    pushLog('habbo-import: ready prefab=' + prefab.id + ' dims=' + prefab.w + 'x' + prefab.d + 'x' + prefab.h + ' mode=place autoInstance=false ' + debugBits.join(' '));
  }
  assetImportLog('import-prefab:done id=' + prefab.id + ' source=' + source + ' prototypeIndex=' + selected.prototypeIndex + ' mode=' + getEditorModeValue('asset-import:done-mode'));
  return selected;
}

function importPrefabDefinition(def, options) {
  options = options || {};
  var imported = registerImportedPrefab(def, options);
  if (!imported) return null;
  if (options.select !== false) {
    selectImportedPrefabForEditor(imported, {
      source: String(options.source || 'unknown'),
      refreshSource: String(options.refreshSource || 'state:import-prefab-definition'),
    });
  }
  assetImportLog('import-prefab:done id=' + imported.id + ' source=' + String(options.source || 'unknown') + ' select=' + String(options.select !== false));
  return imported;
}

var ASSET_IMPORT_API = {
  owner: ASSET_IMPORT_OWNER,
  phase: ASSET_IMPORT_PHASE,
  normalizeImportedPrefabDefinition: normalizeImportedPrefabDefinition,
  dedupeImportedPrefab: dedupeImportedPrefab,
  registerImportedPrefab: registerImportedPrefab,
  selectImportedPrefabForEditor: selectImportedPrefabForEditor,
  enterPlacementModeForImportedPrefab: enterPlacementModeForImportedPrefab,
  prepareImportedPrefabForPlacement: prepareImportedPrefabForPlacement,
  importPrefabDefinition: importPrefabDefinition,
  summarizeBoundary: summarizeAssetImportBoundary,
  resetBoundaryAudit: resetAssetImportBoundary,
};

window.__ASSET_IMPORT_API = ASSET_IMPORT_API;
try {
  var assetNs = getAssetImportNs();
  if (assetNs && typeof assetNs.bind === 'function') assetNs.bind('application.assetImport', ASSET_IMPORT_API, { owner: ASSET_IMPORT_OWNER, phase: ASSET_IMPORT_PHASE });
} catch (_) {}

if (typeof markRefactorCheckpoint === 'function') {
  markRefactorCheckpoint('AssetImport', 'import-pipeline-ready', {
    owner: ASSET_IMPORT_OWNER,
    hasImportPrefabDefinition: typeof importPrefabDefinition === 'function',
    hasRegisterImportedPrefab: typeof registerImportedPrefab === 'function',
    hasPrepareImportedPrefabForPlacement: typeof prepareImportedPrefabForPlacement === 'function',
    hasSelectImportedPrefabForEditor: typeof selectImportedPrefabForEditor === 'function',
    hasEnterPlacementModeForImportedPrefab: typeof enterPlacementModeForImportedPrefab === 'function',
    hasDedupeImportedPrefab: typeof dedupeImportedPrefab === 'function',
  });
}
if (typeof logCompatMapping === 'function') {
  logCompatMapping('importPrefabDefinition', ASSET_IMPORT_OWNER);
  logCompatMapping('registerImportedPrefab', ASSET_IMPORT_OWNER);
  logCompatMapping('prepareImportedPrefabForPlacement', ASSET_IMPORT_OWNER);
  logCompatMapping('selectImportedPrefabForEditor', ASSET_IMPORT_OWNER);
  logCompatMapping('enterPlacementModeForImportedPrefab', ASSET_IMPORT_OWNER);
  logCompatMapping('dedupeImportedPrefab', ASSET_IMPORT_OWNER);
}
