// P12b-2 owner: main camera projection / render-scope builder.
// Loaded before render.js. This file intentionally owns only camera settings,
// viewport/world bounds projection, camera culling/filtering, visibility counts,
// and camera bounds debug drawing. It must not grow into a generic render utility file.

var __mainCameraScopeCache = { key: '', scope: null };
var __mainCameraScopeCountsCache = { key: '', counts: null };
var __visibilityCountSamplingEnabled = false;

function getMainEditorCameraSettingsForRender() {
  var defaults = {
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 2,
    cameraCullingEnabled: true,
    cullingMargin: 2,
    showCameraBounds: false,
    showCullingBounds: false,
    rotationAnimationEnabled: true,
    rotationAnimationMs: 160,
    rotationInterpolationEnabled: true,
    rotationInterpolationMode: 'easeInOut'
  };
  try {
    var controller = window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (controller && typeof controller.getMainEditorCameraSettings === 'function') {
      var settings = controller.getMainEditorCameraSettings('presentation.render.render');
      return Object.assign({}, defaults, settings || {});
    }
  } catch (_) {}
  try {
    var runtimeApi = window.App && window.App.state ? window.App.state.runtimeState || null : null;
    if (runtimeApi && typeof runtimeApi.getEditorCameraSettingsValue === 'function') {
      return Object.assign({}, defaults, runtimeApi.getEditorCameraSettingsValue() || {});
    }
  } catch (_) {}
  return defaults;
}

function getMainEditorDisplayScaleForRender() {
  var cameraSettings = getMainEditorCameraSettingsForRender();
  var minZoom = Math.max(0.05, Number(cameraSettings.minZoom) || 0.5);
  var maxZoom = Math.max(minZoom, Number(cameraSettings.maxZoom) || 2);
  var worldDisplayScale = Number(settings && settings.worldDisplayScale);
  if (!Number.isFinite(worldDisplayScale)) worldDisplayScale = Number(cameraSettings.zoom);
  if (!Number.isFinite(worldDisplayScale)) worldDisplayScale = 1;
  return Math.max(minZoom, Math.min(maxZoom, worldDisplayScale));
}

function getMainEditorZoomValueForRender() {
  return getMainEditorDisplayScaleForRender();
}

function getMainEditorCullingMarginForRender() {
  return Math.max(0, Number(getMainEditorCameraSettingsForRender().cullingMargin) || 0);
}

function isPrimitiveDynamicInstanceForRenderScope(inst) {
  var id = String(inst && inst.prefabId || '');
  return id === 'micro_tri_prism' || id === 'compatible_axis_block';
}

function getPrimitiveDynamicInstanceWorldBoundsForRender(inst) {
  if (!inst || !isPrimitiveDynamicInstanceForRenderScope(inst)) return null;

  // These primitive-backed objects are not regular AABB voxel prefabs. Their
  // persisted collision boxes are intentionally hidden/collision-only and can be
  // much smaller than a full tile.  The old camera-scope filter asked the
  // legacy voxel proxy bounds for visibility; after view rotation this path can
  // classify the primitive as outside the camera scope even though the Pixi
  // primitive itself would be visible.  Use a conservative source-cell bound for
  // render-scope culling.  The actual rendered primitive still uses its exact
  // triangle/polygon vertices later in the Pixi render path.
  if (String(inst.prefabId || '') === 'micro_tri_prism') {
    var m = inst.microTri && typeof inst.microTri === 'object' ? inst.microTri : inst;
    var subdivision = Math.max(1, Math.min(64, Math.round(Number(m.subdivision) || Number(m.subTileGridSubdivision) || 1)));
    var cellX = Math.floor(Number(m.cellX != null ? m.cellX : inst.x) || 0);
    var cellY = Math.floor(Number(m.cellY != null ? m.cellY : inst.y) || 0);
    var subX = Math.max(0, Math.min(subdivision - 1, Math.round(Number(m.subX) || 0)));
    var subY = Math.max(0, Math.min(subdivision - 1, Math.round(Number(m.subY) || 0)));
    var size = 1 / subdivision;
    var minX = cellX + subX * size;
    var minY = cellY + subY * size;
    // One-cell padding keeps tiny atom primitives from being clipped by
    // rotation-dependent scope rounding while still remaining local.
    return { minX: minX - 1, minY: minY - 1, maxX: minX + size + 1, maxY: minY + size + 1 };
  }

  if (String(inst.prefabId || '') === 'compatible_axis_block') {
    var c = inst.compatibleAxis && typeof inst.compatibleAxis === 'object' ? inst.compatibleAxis : inst;
    var cx = Math.floor(Number(c.cellX != null ? c.cellX : inst.x) || 0);
    var cy = Math.floor(Number(c.cellY != null ? c.cellY : inst.y) || 0);
    return { minX: cx - 2, minY: cy - 2, maxX: cx + 3, maxY: cy + 3 };
  }

  return null;
}

function getInstanceWorldBoundsForRender(inst) {
  var primitiveBounds = getPrimitiveDynamicInstanceWorldBoundsForRender(inst);
  if (primitiveBounds) return primitiveBounds;

  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.getRenderSourceWorldBounds === 'function') {
    var proxy = getInstanceProxyBounds(inst);
    if (proxy) return { minX: proxy.minX, minY: proxy.minY, maxX: proxy.maxX, maxY: proxy.maxY };
  }
  return getInstanceProxyBounds(inst);
}

function filterInstancesForMainCameraScope(inputInstances, scope) {
  var list = Array.isArray(inputInstances) ? inputInstances : [];
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.filterByCameraScope === 'function') {
    return visibilityCore.filterByCameraScope(list, scope, getInstanceWorldBoundsForRender);
  }
  if (!scope || scope.cameraCullingEnabled === false) return list.slice();
  return list.filter(function (inst) {
    var bounds = getInstanceWorldBoundsForRender(inst);
    return !bounds || worldBoundsIntersectXY(bounds, scope.cullingWorldBounds);
  });
}

function getMainEditorCameraScreenViewportBounds() {
  return { minX: 0, minY: 0, maxX: VIEW_W, maxY: VIEW_H, width: VIEW_W, height: VIEW_H };
}

function getMainEditorViewportScreenBoundsBeforeZoom(zoom) {
  void zoom;
  var tl = { x: 0, y: 0 };
  var tr = { x: VIEW_W, y: 0 };
  var br = { x: VIEW_W, y: VIEW_H };
  var bl = { x: 0, y: VIEW_H };
  return {
    minX: 0,
    minY: 0,
    maxX: VIEW_W,
    maxY: VIEW_H,
    corners: [tl, tr, br, bl]
  };
}

function expandWorldBounds(bounds, margin) {
  var m = Math.max(0, Number(margin) || 0);
  if (!bounds) return null;
  return {
    minX: bounds.minX - m,
    minY: bounds.minY - m,
    maxX: bounds.maxX + m,
    maxY: bounds.maxY + m
  };
}

function worldBoundsIntersectXY(a, b) {
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.worldBoundsIntersectXY === 'function') return visibilityCore.worldBoundsIntersectXY(a, b);
  if (!a || !b) return false;
  return !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxY <= b.minY || a.minY >= b.maxY);
}

function pointWithinWorldBoundsXY(x, y, bounds) {
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.pointWithinWorldBoundsXY === 'function') return visibilityCore.pointWithinWorldBoundsXY(x, y, bounds);
  if (!bounds) return true;
  return Number(x) >= bounds.minX && Number(x) < bounds.maxX && Number(y) >= bounds.minY && Number(y) < bounds.maxY;
}

function boxWithinWorldBoundsXY(box, bounds) {
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.getBoxWorldBounds === 'function' && typeof visibilityCore.isWithinCameraScope === 'function') {
    return visibilityCore.isWithinCameraScope(box, { cameraCullingEnabled: true, cullingWorldBounds: bounds }, visibilityCore.getBoxWorldBounds);
  }
  if (!box || !bounds) return true;
  var minX = Number(box.x) || 0;
  var minY = Number(box.y) || 0;
  var maxX = minX + Math.max(1, Number(box.w) || 1);
  var maxY = minY + Math.max(1, Number(box.d) || 1);
  return worldBoundsIntersectXY({ minX: minX, minY: minY, maxX: maxX, maxY: maxY }, bounds);
}

function computeMainEditorViewportWorldBounds(currentViewRotation, zoom) {
  var api = getMainViewRotationCoreApi();
  var rect = getMainEditorViewportScreenBoundsBeforeZoom(zoom);
  var corners = rect.corners || [];
  if (!api || typeof api.screenToWorldWithViewRotation !== 'function' || !corners.length) {
    return { minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity, source: 'fallback-unbounded' };
  }
  var cfg = {
    tileW: settings.tileW,
    tileH: settings.tileH,
    originX: settings.originX,
    originY: settings.originY,
    cameraX: camera.x,
    cameraY: camera.y,
    worldBoundsOrOrigin: { cols: settings.gridW || settings.worldCols, rows: settings.gridH || settings.worldRows }
  };
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < corners.length; i++) {
    var world = api.screenToWorldWithViewRotation({ x: corners[i].x, y: corners[i].y, z: 0 }, currentViewRotation, cfg);
    minX = Math.min(minX, Number(world.x) || 0);
    minY = Math.min(minY, Number(world.y) || 0);
    maxX = Math.max(maxX, Number(world.x) || 0);
    maxY = Math.max(maxY, Number(world.y) || 0);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity, source: 'fallback-unbounded' };
  }
  return { minX: Math.floor(minX), minY: Math.floor(minY), maxX: Math.ceil(maxX), maxY: Math.ceil(maxY), source: 'viewport-corners' };
}

function getMainCameraInteractionStateForRender() {
  if (typeof window === 'undefined' || !window.__CAMERA_INTERACTION_LOG_BUFFER_STATE) return null;
  var state = window.__CAMERA_INTERACTION_LOG_BUFFER_STATE;
  return state && state.active === true ? state : null;
}

function getMainCameraVisibilityCountDefaultsForRender(terrainModel) {
  var terrainColumnCount = terrainModel && terrainModel.lastSummary && Number.isFinite(Number(terrainModel.lastSummary.generatedCellCount))
    ? Math.max(0, Math.round(Number(terrainModel.lastSummary.generatedCellCount) || 0))
    : 0;
  var terrainVisible = __terrainRuntimeSummary && Number.isFinite(Number(__terrainRuntimeSummary.visibleColumnCount))
    ? Math.max(0, Math.round(Number(__terrainRuntimeSummary.visibleColumnCount) || 0))
    : 0;
  return {
    visibleTerrainCount: terrainVisible,
    visibleVoxelCount: 0,
    visibleObjectCount: 0,
    culledTerrainCount: Math.max(0, terrainColumnCount - terrainVisible),
    culledVoxelCount: 0,
    culledObjectCount: 0,
    visibilityCountSamplingEnabled: __visibilityCountSamplingEnabled === true,
    countsDeferredDuringInteraction: true,
    countsSource: 'interaction-deferred'
  };
}

function countWorldVisibilityForScope(scope, options) {
  options = options || {};
  var bounds = scope && scope.cullingWorldBounds ? scope.cullingWorldBounds : null;
  var terrainModel = options.terrainModel || getTerrainRuntimeModelForRender();
  var interactionState = options.interactionState || getMainCameraInteractionStateForRender();
  if (interactionState) {
    if (__mainCameraScopeCountsCache.counts) {
      return Object.assign({}, __mainCameraScopeCountsCache.counts, {
        countsDeferredDuringInteraction: true,
        countsSource: 'interaction-reuse-cache'
      });
    }
    return getMainCameraVisibilityCountDefaultsForRender(terrainModel);
  }
  var cacheKey = JSON.stringify({
    bounds: bounds,
    terrainBatchId: terrainModel && terrainModel.activeTerrainBatchId ? terrainModel.activeTerrainBatchId : null,
    terrainChunkCacheVersion: terrainModel && terrainModel.terrainChunkCacheVersion ? terrainModel.terrainChunkCacheVersion : 0,
    visibilityCountSamplingEnabled: __visibilityCountSamplingEnabled === true,
    boxCount: Array.isArray(boxes) ? boxes.length : 0,
    instanceCount: Array.isArray(instances) ? instances.length : 0,
    lightCount: Array.isArray(lights) ? lights.length : 0
  });
  if (__mainCameraScopeCountsCache.key === cacheKey && __mainCameraScopeCountsCache.counts) {
    return Object.assign({}, __mainCameraScopeCountsCache.counts, {
      countsDeferredDuringInteraction: false,
      countsSource: 'cache-hit'
    });
  }
  var defaults = getMainCameraVisibilityCountDefaultsForRender(terrainModel);
  var voxels = 0, voxelsVisible = 0;
  for (var i = 0; i < boxes.length; i++) {
    var box = boxes[i];
    voxels += 1;
    if (boxWithinWorldBoundsXY(box, bounds)) voxelsVisible += 1;
  }
  var objectVisible = 0;
  var objectTotal = 0;
  for (var j = 0; j < instances.length; j++) {
    var inst = instances[j];
    objectTotal += 1;
    var instBounds = getInstanceWorldBoundsForRender(inst);
    if (!instBounds || worldBoundsIntersectXY({ minX: instBounds.minX, minY: instBounds.minY, maxX: instBounds.maxX, maxY: instBounds.maxY }, bounds)) objectVisible += 1;
  }
  var counts = {
    visibleTerrainCount: defaults.visibleTerrainCount,
    visibleVoxelCount: voxelsVisible,
    visibleObjectCount: objectVisible,
    culledTerrainCount: defaults.culledTerrainCount,
    culledVoxelCount: Math.max(0, voxels - voxelsVisible),
    culledObjectCount: Math.max(0, objectTotal - objectVisible),
    visibilityCountSamplingEnabled: __visibilityCountSamplingEnabled === true,
    countsDeferredDuringInteraction: false,
    countsSource: 'full-scan'
  };
  __mainCameraScopeCountsCache = { key: cacheKey, counts: counts };
  return counts;
}

function getMainCameraRenderScope(currentViewRotation) {
  currentViewRotation = normalizeMainEditorViewRotationValue(currentViewRotation);
  var settingsForRender = getMainEditorCameraSettingsForRender();
  var zoom = getMainEditorZoomValueForRender();
  var terrainModel = getTerrainRuntimeModelForRender();
  var interactionState = getMainCameraInteractionStateForRender();
  var cacheKey = [currentViewRotation, zoom, settingsForRender.cameraCullingEnabled !== false, Number(settingsForRender.cullingMargin || 0), Number(camera.x || 0), Number(camera.y || 0), VIEW_W, VIEW_H, terrainModel && terrainModel.activeTerrainBatchId ? terrainModel.activeTerrainBatchId : 'none', terrainModel && terrainModel.width || 0, terrainModel && terrainModel.height || 0].join('|');
  if (__mainCameraScopeCache.scope && __mainCameraScopeCache.key === cacheKey) {
    logItemRotationPrototype('camera-scope-cache-summary', {
      cacheReused: true,
      cacheKeyExcludesFrameCounter: true,
      visibilityCountSamplingEnabled: (__mainCameraScopeCountsCache.counts && __mainCameraScopeCountsCache.counts.visibilityCountSamplingEnabled) === true,
      countsDeferredDuringInteraction: (__mainCameraScopeCountsCache.counts && __mainCameraScopeCountsCache.counts.countsDeferredDuringInteraction) === true,
      countsSource: __mainCameraScopeCountsCache.counts && __mainCameraScopeCountsCache.counts.countsSource || 'cache-hit'
    });
    return __mainCameraScopeCache.scope;
  }
  var viewportWorldBounds = computeMainEditorViewportWorldBounds(currentViewRotation, zoom);
  var cullingWorldBounds = expandWorldBounds(viewportWorldBounds, getMainEditorCullingMarginForRender());
  var counts = countWorldVisibilityForScope({ cullingWorldBounds: cullingWorldBounds }, { terrainModel: terrainModel, interactionState: interactionState });
  var scope = {
    currentViewRotation: currentViewRotation,
    zoom: zoom,
    cameraX: Number(camera && camera.x || 0),
    cameraY: Number(camera && camera.y || 0),
    cameraCullingEnabled: settingsForRender.cameraCullingEnabled !== false,
    cullingMargin: Math.max(0, Number(settingsForRender.cullingMargin) || 0),
    showCameraBounds: !!settingsForRender.showCameraBounds,
    showCullingBounds: !!settingsForRender.showCullingBounds,
    surfaceOnlyRenderingEnabled: settingsForRender.surfaceOnlyRenderingEnabled !== false,
    debugVisibleSurfaces: !!settingsForRender.debugVisibleSurfaces,
    viewportScreenBounds: getMainEditorCameraScreenViewportBounds(),
    viewportLocalScreenBounds: getMainEditorViewportScreenBoundsBeforeZoom(zoom),
    viewportWorldBounds: viewportWorldBounds,
    cullingWorldBounds: cullingWorldBounds,
    visibleTerrainCount: counts.visibleTerrainCount,
    visibleVoxelCount: counts.visibleVoxelCount,
    visibleObjectCount: counts.visibleObjectCount,
    culledTerrainCount: counts.culledTerrainCount,
    culledVoxelCount: counts.culledVoxelCount,
    culledObjectCount: counts.culledObjectCount,
    countsDeferredDuringInteraction: counts.countsDeferredDuringInteraction === true,
    countsSource: counts.countsSource || 'unknown'
  };
  logItemRotationPrototype('main-camera-viewport-culling-check', {
    currentViewRotation: currentViewRotation,
    zoom: zoom,
    viewportWorldBounds: viewportWorldBounds,
    cullingWorldBounds: cullingWorldBounds,
    visibleTerrainCount: scope.visibleTerrainCount,
    visibleVoxelCount: scope.visibleVoxelCount,
    visibleObjectCount: scope.visibleObjectCount,
    culledTerrainCount: scope.culledTerrainCount,
    culledVoxelCount: scope.culledVoxelCount,
    culledObjectCount: scope.culledObjectCount,
    countsDeferredDuringInteraction: scope.countsDeferredDuringInteraction === true,
    countsSource: scope.countsSource || 'unknown'
  });
  logItemRotationPrototype('main-camera-zoom-unification-check', {
    cameraZoomValue: zoom,
    worldDisplayScaleValue: Number(settings.worldDisplayScale || 1),
    tileScaleValue: Number(settings.tileScale || 1),
    usesSingleUnifiedZoom: true,
    terrainUsesUnifiedZoom: true,
    blocksUseUnifiedZoom: true
  });
  __mainCameraScopeCache = { key: cacheKey, scope: scope };
  logItemRotationPrototype('camera-scope-cache-summary', {
    cacheReused: false,
    cacheKeyExcludesFrameCounter: true,
    visibilityCountSamplingEnabled: counts.visibilityCountSamplingEnabled === true,
    countsDeferredDuringInteraction: counts.countsDeferredDuringInteraction === true,
    countsSource: counts.countsSource || 'unknown'
  });
  return scope;
}

function renderableIntersectsMainCameraScope(renderable, scope) {
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.isWithinCameraScope === 'function' && typeof visibilityCore.getRenderableWorldBounds === 'function') {
    return visibilityCore.isWithinCameraScope(renderable, scope, visibilityCore.getRenderableWorldBounds);
  }
  if (!scope || scope.cameraCullingEnabled === false) return true;
  var bounds = scope.cullingWorldBounds;
  if (!bounds) return true;
  if (Number.isFinite(Number(renderable && renderable.cellX)) && Number.isFinite(Number(renderable && renderable.cellY))) {
    return worldBoundsIntersectXY({ minX: Number(renderable.cellX), minY: Number(renderable.cellY), maxX: Number(renderable.cellX) + 1, maxY: Number(renderable.cellY) + 1 }, bounds);
  }
  if (renderable && renderable.box) return boxWithinWorldBoundsXY(renderable.box, bounds);
  if (Number.isFinite(Number(renderable && renderable.worldX)) && Number.isFinite(Number(renderable && renderable.worldY))) {
    return pointWithinWorldBoundsXY(renderable.worldX, renderable.worldY, bounds);
  }
  return true;
}

function filterRenderablesForMainCameraScope(renderables, scope) {
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.filterByCameraScope === 'function' && typeof visibilityCore.getRenderableWorldBounds === 'function') {
    return visibilityCore.filterByCameraScope(renderables, scope, visibilityCore.getRenderableWorldBounds);
  }
  if (!scope || scope.cameraCullingEnabled === false) return Array.isArray(renderables) ? renderables.slice() : [];
  return (Array.isArray(renderables) ? renderables : []).filter(function (item) { return renderableIntersectsMainCameraScope(item, scope); });
}

function filterLightsForMainCameraScope(inputLights, scope) {
  var list = Array.isArray(inputLights) ? inputLights : [];
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.filterByCameraScope === 'function') {
    return visibilityCore.filterByCameraScope(list, scope, function (light) {
      return { minX: Number(light && light.x || 0), minY: Number(light && light.y || 0), maxX: Number(light && light.x || 0) + 1, maxY: Number(light && light.y || 0) + 1 };
    });
  }
  if (!scope || scope.cameraCullingEnabled === false) return list.slice();
  return list.filter(function (light) {
    return pointWithinWorldBoundsXY(Number(light && light.x || 0), Number(light && light.y || 0), scope.cullingWorldBounds);
  });
}

function filterBoxesForMainCameraScope(inputBoxes, scope) {
  var list = Array.isArray(inputBoxes) ? inputBoxes : [];
  var visibilityCore = getRenderVisibilityCoreApi();
  if (visibilityCore && typeof visibilityCore.filterByCameraScope === 'function' && typeof visibilityCore.getBoxWorldBounds === 'function') {
    return visibilityCore.filterByCameraScope(list, scope, visibilityCore.getBoxWorldBounds);
  }
  if (!scope || scope.cameraCullingEnabled === false) return list.slice();
  return list.filter(function (box) { return boxWithinWorldBoundsXY(box, scope.cullingWorldBounds); });
}

function getMainCameraVisibleLightsForRender(currentViewRotation) {
  return filterLightsForMainCameraScope(typeof getLightingRenderLights === 'function' ? getLightingRenderLights() : lights, getMainCameraRenderScope(currentViewRotation));
}

function applyMainCameraWorldTransform(targetCtx, drawFn) {
  if (typeof drawFn !== 'function') return null;
  void targetCtx;
  return drawFn();
}

function drawMainCameraBoundsDebug(scope) {
  if (!scope) return;
  function drawBounds(bounds, stroke, lineWidth) {
    if (!bounds) return;
    var pts = [
      iso(bounds.minX, bounds.minY, 0),
      iso(bounds.maxX, bounds.minY, 0),
      iso(bounds.maxX, bounds.maxY, 0),
      iso(bounds.minX, bounds.maxY, 0)
    ];
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth || 1.5;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  if (scope.showCameraBounds) drawBounds(scope.viewportWorldBounds, 'rgba(80,200,255,0.92)', 2);
  if (scope.showCullingBounds) drawBounds(scope.cullingWorldBounds, 'rgba(255,180,80,0.92)', 1.6);
}

if (typeof window !== 'undefined') {
  window.__MAIN_CAMERA_CULLING_API__ = {
    getScope: getMainCameraRenderScope,
    filterLights: filterLightsForMainCameraScope,
    filterBoxesForShadowSource: filterBoxesForMainCameraScope,
    filterRenderables: filterRenderablesForMainCameraScope,
    getRenderSourceWorldBounds: function (source) {
      var visibilityCore = getRenderVisibilityCoreApi();
      return visibilityCore && typeof visibilityCore.getRenderSourceWorldBounds === 'function'
        ? visibilityCore.getRenderSourceWorldBounds(source)
        : null;
    }
  };
}
