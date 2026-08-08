// P12b-1 owner: instance / actor renderable builder support.
// Loaded before render.js. This file intentionally owns only instance render
// update-mode splitting, visible instance summary caching, and proxy-box draw
// fallback helpers. It must not grow into a generic render utility file.

var __renderDynamicInstanceCache = { source: null, length: 0, dynamicInstances: [], staticInstances: [] };
var __visibleInstanceSummaryCache = { signature: '', at: 0, summary: { visibleInstances: 0, visibleDynamicInstances: 0, staticSkippedByDynamicLoop: 0 } };

var __renderPrefabSnapshotCache = new Map();

function getExactPrefabForRender(prefabId) {
  var id = String(prefabId || '').trim();
  if (!id) return null;
  var registryApi = (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.prefabRegistry) ? window.App.state.prefabRegistry : null;
  var prefab = null;
  try {
    if (registryApi && typeof registryApi.getPrefabByIdExact === 'function') prefab = registryApi.getPrefabByIdExact(id);
  } catch (_) {}
  try {
    if (!prefab && typeof getPrefabById === 'function') {
      var candidate = getPrefabById(id);
      if (candidate && String(candidate.id) === id) prefab = candidate;
    }
  } catch (_) {}
  try {
    if (!prefab && Array.isArray(prototypes)) {
      prefab = prototypes.find(function (candidate) { return candidate && String(candidate.id) === id; }) || null;
    }
  } catch (_) {}
  if (prefab) __renderPrefabSnapshotCache.set(id, prefab);
  return prefab || __renderPrefabSnapshotCache.get(id) || null;
}

function normalizeRenderUpdateModeForRender(mode, fallback) {
  if (mode === 'dynamic') return 'dynamic';
  if (mode === 'static') return 'static';
  return fallback === 'dynamic' ? 'dynamic' : 'static';
}

function getPrefabRenderUpdateModeForRender(prefab, instanceOrOverride) {
  // A sprite is camera-dependent even when an old instance snapshot says
  // renderUpdateMode=static. Treating it as static makes it disappear from the
  // dynamic consumer after prefab registration or a view change.
  if (prefab && prefabHasSprite(prefab)) return 'dynamic';
  var registryApi = (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.prefabRegistry) ? window.App.state.prefabRegistry : null;
  if (registryApi && typeof registryApi.getPrefabRenderUpdateMode === 'function') {
    return normalizeRenderUpdateModeForRender(registryApi.getPrefabRenderUpdateMode(prefab, instanceOrOverride), prefabHasSprite(prefab) ? 'dynamic' : 'static');
  }
  if (instanceOrOverride && typeof instanceOrOverride === 'object' && (instanceOrOverride.renderUpdateMode === 'static' || instanceOrOverride.renderUpdateMode === 'dynamic')) {
    return normalizeRenderUpdateModeForRender(instanceOrOverride.renderUpdateMode, 'static');
  }
  if (typeof instanceOrOverride === 'string' && (instanceOrOverride === 'static' || instanceOrOverride === 'dynamic')) {
    return normalizeRenderUpdateModeForRender(instanceOrOverride, 'static');
  }
  if (prefab && (prefab.renderUpdateMode === 'static' || prefab.renderUpdateMode === 'dynamic')) {
    return normalizeRenderUpdateModeForRender(prefab.renderUpdateMode, 'static');
  }
  return normalizeRenderUpdateModeForRender(null, prefabHasSprite(prefab) ? 'dynamic' : 'static');
}

function isInstanceDynamicRenderableForFrame(inst, prefab) {
  if (prefab && prefabHasSprite(prefab)) return true;
  return getPrefabRenderUpdateModeForRender(prefab, inst) === 'dynamic';
}

function buildInstanceRenderUpdateModeIndex(sourceInstances) {
  var out = new Map();
  var list = Array.isArray(sourceInstances) ? sourceInstances : [];
  for (var i = 0; i < list.length; i++) {
    var inst = list[i];
    if (!inst || !inst.instanceId) continue;
    var prefab = getExactPrefabForRender(inst.prefabId);
    out.set(String(inst.instanceId), getPrefabRenderUpdateModeForRender(prefab, inst));
  }
  return out;
}

function getDynamicInstanceSplitForRender(sourceInstances) {
  var list = Array.isArray(sourceInstances) ? sourceInstances : [];
  // Do not reuse a split based only on array identity and length. Prefabs are
  // imported/replaced asynchronously, so the same instances array can change
  // from voxel-only to sprite-backed without changing either value.
  var dynamicInstances = [];
  var staticInstances = [];
  for (var i = 0; i < list.length; i++) {
    var inst = list[i];
    if (!inst) continue;
    var prefab = getExactPrefabForRender(inst.prefabId);
    if (isInstanceDynamicRenderableForFrame(inst, prefab)) dynamicInstances.push(inst);
    else staticInstances.push(inst);
  }
  __renderDynamicInstanceCache = {
    source: list,
    length: list.length,
    dynamicInstances: dynamicInstances,
    staticInstances: staticInstances
  };
  try {
    if (typeof window !== 'undefined') window.__DYNAMIC_INSTANCE_SPLIT_LAST__ = {
      version: 'dynamic-instance-split-sprite-stable-v2',
      inputCount: list.length,
      dynamicCount: dynamicInstances.length,
      staticCount: staticInstances.length,
      dynamicIds: dynamicInstances.map(function (inst) { return String(inst && inst.instanceId || ''); }),
      spriteDynamicIds: dynamicInstances.filter(function (inst) { var prefab = getExactPrefabForRender(inst && inst.prefabId); return !!(prefab && prefabHasSprite(prefab)); }).map(function (inst) { return String(inst && inst.instanceId || ''); })
    };
  } catch (_) {}
  return __renderDynamicInstanceCache;
}

function buildVisibleInstanceSummaryCacheKey(scope, dynamicCount, staticCount) {
  var bounds = scope && scope.cullingWorldBounds ? scope.cullingWorldBounds : null;
  return [
    Number(scope && scope.cameraX || 0).toFixed(3),
    Number(scope && scope.cameraY || 0).toFixed(3),
    Number(scope && scope.zoom || 1).toFixed(3),
    bounds ? Number(bounds.minX || 0).toFixed(3) : 'n/a',
    bounds ? Number(bounds.minY || 0).toFixed(3) : 'n/a',
    bounds ? Number(bounds.maxX || 0).toFixed(3) : 'n/a',
    bounds ? Number(bounds.maxY || 0).toFixed(3) : 'n/a',
    Number(dynamicCount || 0),
    Number(staticCount || 0)
  ].join('|');
}

function getVisibleInstanceSummaryForRender(scope, visibleDynamicInstances, dynamicSplit, forceExact) {
  var split = dynamicSplit && typeof dynamicSplit === 'object' ? dynamicSplit : getDynamicInstanceSplitForRender(instances);
  var dynamicVisibleCount = Array.isArray(visibleDynamicInstances) ? visibleDynamicInstances.length : 0;
  var signature = buildVisibleInstanceSummaryCacheKey(scope, dynamicVisibleCount, split.staticInstances.length);
  var now = perfNow();
  var surfaceStats = typeof __lastSurfaceCacheStats !== 'undefined' && __lastSurfaceCacheStats ? __lastSurfaceCacheStats : null;
  var estimatedStaticVisibleCount = 0;
  if (surfaceStats) {
    estimatedStaticVisibleCount = Math.max(
      0,
      Math.round(Number(surfaceStats.renderSourceCountAfterVisibility || surfaceStats.totalStaticBoxes || 0) || 0)
    );
  }
  if (!estimatedStaticVisibleCount && split && Array.isArray(split.staticInstances)) {
    estimatedStaticVisibleCount = Math.max(0, split.staticInstances.length || 0);
  }
  if (!forceExact) {
    var cachedStaticVisibleCount = Number(__visibleInstanceSummaryCache && __visibleInstanceSummaryCache.summary && __visibleInstanceSummaryCache.summary.staticSkippedByDynamicLoop || 0);
    if (!cachedStaticVisibleCount) cachedStaticVisibleCount = estimatedStaticVisibleCount;
    return {
      visibleInstances: Number(dynamicVisibleCount + cachedStaticVisibleCount || 0),
      visibleDynamicInstances: Number(dynamicVisibleCount || 0),
      staticSkippedByDynamicLoop: Number(cachedStaticVisibleCount || 0),
      approximate: true
    };
  }
  if (__visibleInstanceSummaryCache.signature === signature && (now - Number(__visibleInstanceSummaryCache.at || 0)) < 1000) {
    return __visibleInstanceSummaryCache.summary;
  }
  var allowExpensiveExactSummary = false;
  try {
    allowExpensiveExactSummary = !!(typeof window !== 'undefined' && (window.__EXACT_VISIBLE_INSTANCE_SUMMARY__ === true || (typeof localStorage !== 'undefined' && localStorage.getItem('exactVisibleInstanceSummary') === '1')));
  } catch (_) { allowExpensiveExactSummary = false; }
  var visibleStaticCount = estimatedStaticVisibleCount;
  if (allowExpensiveExactSummary && split.staticInstances.length) {
    visibleStaticCount = filterInstancesForMainCameraScope(split.staticInstances, scope).length;
  }
  var summary = {
    visibleInstances: Number(dynamicVisibleCount + visibleStaticCount || 0),
    visibleDynamicInstances: Number(dynamicVisibleCount || 0),
    staticSkippedByDynamicLoop: Number(visibleStaticCount || 0),
    approximate: allowExpensiveExactSummary !== true
  };
  __visibleInstanceSummaryCache = {
    signature: signature,
    at: now,
    summary: summary
  };
  return summary;
}


function drawInstanceProxyBoxes(instance, alpha) {
  var prefab = getExactPrefabForRender(instance.prefabId);
  var shift = getHabboInstanceVisualShift(instance, prefab);
  var instanceBoxes = boxes.filter(function (b) { return b.instanceId === instance.instanceId; });
  withScreenTranslate(shift, function () {
    for (var i = 0; i < instanceBoxes.length; i++) drawBox(instanceBoxes[i], alpha == null ? 0.82 : alpha);
  });
}

