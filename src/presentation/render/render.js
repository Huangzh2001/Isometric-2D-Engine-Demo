// v1 split file generated from original monolithic app.js
// P11a-3 note: preview update and screen picking are delegated to
// src/presentation/render/interaction/render-preview-interaction-controller.js.
// 注意：此文件为保持行为稳定的第一刀拆分，允许存在少量跨层函数。

function faceColors(base) {
  const fc = baseFaceColors(base);
  return {
    top: rgbToCss(fc.top),
    left: rgbToCss(fc.east),
    right: rgbToCss(fc.south),
    line: fc.line,
  };
}

function getCanvas2dDrawPrimitivesApiForRender() {
  try {
    if (typeof window !== 'undefined') {
      return window.__APP_PRESENTATION_CANVAS2D_DRAW_PRIMITIVES__ || window.__CANVAS2D_DRAW_PRIMITIVES__ || window.IsometricCanvas2dDrawPrimitives || null;
    }
    if (typeof globalThis !== 'undefined') {
      return globalThis.__APP_PRESENTATION_CANVAS2D_DRAW_PRIMITIVES__ || globalThis.__CANVAS2D_DRAW_PRIMITIVES__ || globalThis.IsometricCanvas2dDrawPrimitives || null;
    }
  } catch (_) {}
  return null;
}

function requireCanvas2dDrawPrimitivesForRender() {
  var api = getCanvas2dDrawPrimitivesApiForRender();
  if (!api) throw new Error('canvas2d-draw-primitives.js must load before presentation/render/render.js');
  return api;
}

function getCanvas2dShadowOverlaysApiForRender() {
  try {
    if (typeof window !== 'undefined') {
      return window.__APP_PRESENTATION_CANVAS2D_SHADOW_OVERLAYS__ || window.__CANVAS2D_SHADOW_OVERLAYS__ || window.IsometricCanvas2dShadowOverlays || null;
    }
    if (typeof globalThis !== 'undefined') {
      return globalThis.__APP_PRESENTATION_CANVAS2D_SHADOW_OVERLAYS__ || globalThis.__CANVAS2D_SHADOW_OVERLAYS__ || globalThis.IsometricCanvas2dShadowOverlays || null;
    }
  } catch (_) {}
  return null;
}

function requireCanvas2dShadowOverlaysForRender() {
  var api = getCanvas2dShadowOverlaysApiForRender();
  if (!api) throw new Error('canvas2d-shadow-overlays.js must load before presentation/render/render.js');
  return api;
}

function getCanvas2dShadowOverlayCacheApiForRender() {
  try {
    if (typeof window !== 'undefined') {
      return window.__APP_PRESENTATION_CANVAS2D_SHADOW_OVERLAY_CACHE__ || window.__CANVAS2D_SHADOW_OVERLAY_CACHE__ || window.IsometricCanvas2dShadowOverlayCache || null;
    }
    if (typeof globalThis !== 'undefined') {
      return globalThis.__APP_PRESENTATION_CANVAS2D_SHADOW_OVERLAY_CACHE__ || globalThis.__CANVAS2D_SHADOW_OVERLAY_CACHE__ || globalThis.IsometricCanvas2dShadowOverlayCache || null;
    }
  } catch (_) {}
  return null;
}

function requireCanvas2dShadowOverlayCacheForRender() {
  var api = getCanvas2dShadowOverlayCacheApiForRender();
  if (!api) throw new Error('canvas2d-shadow-overlay-cache.js must load before presentation/render/render.js');
  return api;
}

function createCanvas2dShadowOverlayCacheDepsForRender() {
  return {
    iso: typeof iso === 'function' ? iso : null,
    screenPointsFromWorldFaceNoCamera: typeof screenPointsFromWorldFaceNoCamera === 'function' ? screenPointsFromWorldFaceNoCamera : null,
    perfNow: typeof perfNow === 'function' ? perfNow : null,
    boxesShadowSignature: typeof boxesShadowSignature === 'function' ? boxesShadowSignature : null,
    boxes: typeof boxes !== 'undefined' ? boxes : [],
    lightState: typeof lightState !== 'undefined' ? lightState : null,
    isLightingSystemEnabled: typeof isLightingSystemEnabled === 'function' ? isLightingSystemEnabled : null,
    getShadowDebugRenderLights: typeof getShadowDebugRenderLights === 'function' ? getShadowDebugRenderLights : null,
    getLightingRenderLights: typeof getLightingRenderLights === 'function' ? getLightingRenderLights : null,
    lights: typeof lights !== 'undefined' ? lights : [],
    noteShadowOverlayCache: typeof noteShadowOverlayCache === 'function' ? noteShadowOverlayCache : null,
    dbgSimpleHash: typeof dbgSimpleHash === 'function' ? dbgSimpleHash : null,
    cameraSignatureForDebug: typeof cameraSignatureForDebug === 'function' ? cameraSignatureForDebug : null,
    collectProjectedShadowPolysForReceiver: typeof collectProjectedShadowPolysForReceiver === 'function' ? collectProjectedShadowPolysForReceiver : null
  };
}

function createCanvas2dShadowOverlayDepsForRender() {
  return {
    viewW: typeof VIEW_W !== 'undefined' ? VIEW_W : 0,
    viewH: typeof VIEW_H !== 'undefined' ? VIEW_H : 0,
    ensureShadowPolyUnionCanvas: typeof ensureShadowPolyUnionCanvas === 'function' ? ensureShadowPolyUnionCanvas : null,
    fillShadowUnionWithDistanceFade: typeof fillShadowUnionWithDistanceFade === 'function' ? fillShadowUnionWithDistanceFade : null,
    drawUnionShadowCanvasToTarget: typeof drawUnionShadowCanvasToTarget === 'function' ? drawUnionShadowCanvasToTarget : null,
    clamp: typeof clamp === 'function' ? clamp : null,
    shadowDebugLog: typeof shadowDebugLog === 'function' ? shadowDebugLog : null,
    shadowDebugDetailed: typeof shadowDebugDetailed !== 'undefined' ? !!shadowDebugDetailed : false,
    logScreenOverlayDebug: typeof logScreenOverlayDebug === 'function' ? logScreenOverlayDebug : null,
    shadowProbeMatchReceiver: typeof shadowProbeMatchReceiver === 'function' ? shadowProbeMatchReceiver : null,
    lightState: typeof lightState !== 'undefined' ? lightState : null,
    shadowStrokeCss: typeof shadowStrokeCss === 'function' ? shadowStrokeCss : null
  };
}


function getCanvas2dStaticWorldFaceDrawPassApiForRender() {
  try {
    if (typeof window !== 'undefined') {
      return window.__APP_PRESENTATION_CANVAS2D_STATIC_WORLD_FACE_DRAW_PASS__ || window.__CANVAS2D_STATIC_WORLD_FACE_DRAW_PASS__ || window.IsometricCanvas2dStaticWorldFaceDrawPass || null;
    }
    if (typeof globalThis !== 'undefined') {
      return globalThis.__APP_PRESENTATION_CANVAS2D_STATIC_WORLD_FACE_DRAW_PASS__ || globalThis.__CANVAS2D_STATIC_WORLD_FACE_DRAW_PASS__ || globalThis.IsometricCanvas2dStaticWorldFaceDrawPass || null;
    }
  } catch (_) {}
  return null;
}

function requireCanvas2dStaticWorldFaceDrawPassForRender() {
  var api = getCanvas2dStaticWorldFaceDrawPassApiForRender();
  if (!api) throw new Error('canvas2d-static-world-face-draw-pass.js must load before presentation/render/render.js');
  return api;
}

function createCanvas2dStaticWorldFaceDrawPassDepsForRender() {
  return {
    ctx: typeof ctx !== 'undefined' ? ctx : null,
    camera: typeof camera !== 'undefined' ? camera : null,
    settings: typeof settings !== 'undefined' ? settings : null,
    screenPointsFromWorldFaceNoCamera: typeof screenPointsFromWorldFaceNoCamera === 'function' ? screenPointsFromWorldFaceNoCamera : null,
    worldShadowOverlaysToNoCamera: typeof worldShadowOverlaysToNoCamera === 'function' ? worldShadowOverlaysToNoCamera : null,
    buildPath2DFromPoints: typeof buildPath2DFromPoints === 'function' ? buildPath2DFromPoints : null,
    buildPath2DFromLoops: typeof buildPath2DFromLoops === 'function' ? buildPath2DFromLoops : null,
    buildPath2DFromSegments: typeof buildPath2DFromSegments === 'function' ? buildPath2DFromSegments : null,
    drawPoly: typeof drawPoly === 'function' ? drawPoly : null,
    drawPolyWithOffset: typeof drawPolyWithOffset === 'function' ? drawPolyWithOffset : null,
    drawFaceShadowOverlays: typeof drawFaceShadowOverlays === 'function' ? drawFaceShadowOverlays : null,
    drawFaceShadowOverlaysNoCamera: typeof drawFaceShadowOverlaysNoCamera === 'function' ? drawFaceShadowOverlaysNoCamera : null,
    applyTerrainMaterialPatternOverlay: typeof applyTerrainMaterialPatternOverlay === 'function' ? applyTerrainMaterialPatternOverlay : null,
    getTerrainTopBoundaryRenderDebugSignature: typeof getTerrainTopBoundaryRenderDebugSignature === 'function' ? getTerrainTopBoundaryRenderDebugSignature : null,
    getTerrainTopBoundaryStrokeWidthForPacket: typeof getTerrainTopBoundaryStrokeWidthForPacket === 'function' ? getTerrainTopBoundaryStrokeWidthForPacket : null,
    getTerrainTopBoundaryStrokeStyleForPacket: typeof getTerrainTopBoundaryStrokeStyleForPacket === 'function' ? getTerrainTopBoundaryStrokeStyleForPacket : null,
    normalizeMainEditorViewRotationValue: typeof normalizeMainEditorViewRotationValue === 'function' ? normalizeMainEditorViewRotationValue : null,
    getSafeMainEditorViewRotation: typeof getSafeMainEditorViewRotation === 'function' ? getSafeMainEditorViewRotation : null
  };
}


function getStaticWorldFrameMaterializerApiForRender() {
  try {
    if (typeof window !== 'undefined' && window.__APP_PRESENTATION_STATIC_WORLD_FRAME_MATERIALIZER__) return window.__APP_PRESENTATION_STATIC_WORLD_FRAME_MATERIALIZER__;
    if (typeof window !== 'undefined' && window.__STATIC_WORLD_FRAME_MATERIALIZER__) return window.__STATIC_WORLD_FRAME_MATERIALIZER__;
    if (typeof window !== 'undefined' && window.IsometricStaticWorldFrameMaterializer) return window.IsometricStaticWorldFrameMaterializer;
  } catch (_) {}
  try {
    if (typeof globalThis !== 'undefined' && globalThis.__APP_PRESENTATION_STATIC_WORLD_FRAME_MATERIALIZER__) return globalThis.__APP_PRESENTATION_STATIC_WORLD_FRAME_MATERIALIZER__;
    if (typeof globalThis !== 'undefined' && globalThis.__STATIC_WORLD_FRAME_MATERIALIZER__) return globalThis.__STATIC_WORLD_FRAME_MATERIALIZER__;
    if (typeof globalThis !== 'undefined' && globalThis.IsometricStaticWorldFrameMaterializer) return globalThis.IsometricStaticWorldFrameMaterializer;
  } catch (_) {}
  return null;
}

function requireStaticWorldFrameMaterializerForRender() {
  var api = getStaticWorldFrameMaterializerApiForRender();
  if (!api) throw new Error('static-world-frame-materializer.js must load before presentation/render/render.js');
  return api;
}

function createStaticWorldFrameMaterializerDepsForRender() {
  return {
    averageScreenPoint: averageScreenPoint,
    drawCachedVoxelFaceRenderable: drawCachedVoxelFaceRenderable,
    getDomainSceneCoreApi: getDomainSceneCoreApi,
    computeViewAwareSortMeta: computeViewAwareSortMeta,
    screenPointsFromWorldFace: screenPointsFromWorldFace,
    worldShadowOverlaysToScreen: worldShadowOverlaysToScreen,
    compareRenderablesByDomain: compareRenderablesByDomain
  };
}

// P11a-5 note: static world frame materialization helpers are delegated to
// presentation/render/renderables/static-world-frame-materializer.js; render.js
// keeps compatibility wrappers only.

function getStaticRenderableColorCacheApiForRender() {
  try {
    if (typeof window !== 'undefined' && window.__APP_PRESENTATION_STATIC_RENDERABLE_COLOR_CACHE__) return window.__APP_PRESENTATION_STATIC_RENDERABLE_COLOR_CACHE__;
    if (typeof window !== 'undefined' && window.__STATIC_RENDERABLE_COLOR_CACHE__) return window.__STATIC_RENDERABLE_COLOR_CACHE__;
    if (typeof window !== 'undefined' && window.IsometricStaticRenderableColorCache) return window.IsometricStaticRenderableColorCache;
  } catch (_) {}
  try {
    if (typeof globalThis !== 'undefined' && globalThis.__APP_PRESENTATION_STATIC_RENDERABLE_COLOR_CACHE__) return globalThis.__APP_PRESENTATION_STATIC_RENDERABLE_COLOR_CACHE__;
    if (typeof globalThis !== 'undefined' && globalThis.__STATIC_RENDERABLE_COLOR_CACHE__) return globalThis.__STATIC_RENDERABLE_COLOR_CACHE__;
    if (typeof globalThis !== 'undefined' && globalThis.IsometricStaticRenderableColorCache) return globalThis.IsometricStaticRenderableColorCache;
  } catch (_) {}
  return null;
}

function requireStaticRenderableColorCacheForRender() {
  var api = getStaticRenderableColorCacheApiForRender();
  if (!api) throw new Error('static-renderable-color-cache.js must load before presentation/render/render.js');
  return api;
}

function createStaticRenderableColorCacheDepsForRender() {
  return {
    perfNow: perfNow,
    baseFaceColors: baseFaceColors,
    rgbToCss: rgbToCss,
    getTerrainRenderSettingsForRender: getTerrainRenderSettingsForRender,
    getLightStateForRender: function () { return (typeof lightState !== 'undefined' ? lightState : null); },
    staticBoxLightingSignature: (typeof staticBoxLightingSignature === 'function' ? staticBoxLightingSignature : null),
    getTerrainMaterialIdForRenderCell: getTerrainMaterialIdForRenderCell,
    getTerrainMaterialBaseFaceColorsForRenderCell: getTerrainMaterialBaseFaceColorsForRenderCell,
    getBaseFaceFillRgbForSemanticFace: getBaseFaceFillRgbForSemanticFace,
    litFaceColor: litFaceColor
  };
}

// P11a-6 note: static renderable color mode, lighting signature, and fill
// cache helpers are delegated to
// presentation/render/renderables/static-renderable-color-cache.js; render.js
// keeps compatibility wrappers only.

function drawPoly(points, fill, stroke = 'rgba(0,0,0,.22)', width = 1) {
  return requireCanvas2dDrawPrimitivesForRender().drawPolyOn(ctx, points, fill, stroke, width);
}

function drawPolyWithOffset(points, offsetX, offsetY, fill, stroke = 'rgba(0,0,0,.22)', width = 1) {
  return requireCanvas2dDrawPrimitivesForRender().drawPolyWithOffsetOn(ctx, points, offsetX, offsetY, fill, stroke, width);
}

function averagePointWithOffset(points, offsetX, offsetY) {
  return requireCanvas2dDrawPrimitivesForRender().averagePointWithOffset(points, offsetX, offsetY);
}


// pointInPoly is owned by src/core/domain/spatial-geometry-core.js
function cubePoints(x, y, z, w = 1, d = 1, h = 1) {
  return {
    p000: iso(x,     y,     z),
    p100: iso(x + w, y,     z),
    p110: iso(x + w, y + d, z),
    p010: iso(x,     y + d, z),
    p001: iso(x,     y,     z + h),
    p101: iso(x + w, y,     z + h),
    p111: iso(x + w, y + d, z + h),
    p011: iso(x,     y + d, z + h),
  };
}

function projectedBounds(box) {
  const pts = cubePoints(box.x, box.y, box.z, box.w, box.d, box.h);
  const arr = Object.values(pts);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of arr) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}


// polyBounds is owned by src/core/domain/spatial-geometry-core.js
function buildBoxFaces(box, alpha = 1) {
  // 保留兼容接口：单个 box 的可见外表面（不是内部面）
  return buildSurfaceFaces([box], alpha, false);
}


// overlap2D is owned by src/core/domain/spatial-geometry-core.js

// isBehind is owned by src/core/domain/spatial-geometry-core.js

// makeAABB is owned by src/core/domain/spatial-geometry-core.js

// rectCircleCollide is owned by src/core/domain/spatial-geometry-core.js

// boxRectOverlap3D is owned by src/core/domain/spatial-geometry-core.js

// buildOccupancy is owned by src/core/domain/spatial-geometry-core.js
var __lastRenderFrameOccupancyVersion = null;
var __stableLocalDemergeCache = { key: '', result: null, hitCount: 0, missCount: 0 };
var __lastObservedTerrainBatchIdForFrames = null;
var __terrainFirstFrameWindow = { terrainBatchId: null, remaining: 0, nextFrameIndex: 1 };

var __lastFrameDrawMs = 0;
var __lastFrameDrawStats = null;
var __renderDynamicInstanceCache = { source: null, length: 0, dynamicInstances: [], staticInstances: [] };
var __visibleInstanceSummaryCache = { signature: '', at: 0, summary: { visibleInstances: 0, visibleDynamicInstances: 0, staticSkippedByDynamicLoop: 0 } };
// P11a-6 note: static renderable color/lighting caches live in
// presentation/render/renderables/static-renderable-color-cache.js.

function getSceneOccupancyCacheApiForRender() {
  try {
    if (typeof window !== 'undefined' && window.__SCENE_OCCUPANCY_CACHE__) return window.__SCENE_OCCUPANCY_CACHE__;
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.sceneSession) {
      var sessionApi = window.App.state.sceneSession;
      if (sessionApi && typeof sessionApi.ensureOccupancyCache === 'function') {
        return {
          ensure: function (meta) { return sessionApi.ensureOccupancyCache(meta || null); },
          getSnapshot: function () { return sessionApi.getOccupancyCacheSnapshot ? sessionApi.getOccupancyCacheSnapshot() : null; }
        };
      }
    }
  } catch (_) {}
  return null;
}

function getSceneOccupancySnapshotForRender(reason) {
  var api = getSceneOccupancyCacheApiForRender();
  if (api && typeof api.ensure === 'function') {
    try {
      var snapshot = api.ensure({ source: reason || 'render:ensure-occupancy-cache' });
      if (snapshot && snapshot.map && typeof snapshot.map.has === 'function') return snapshot;
    } catch (_) {}
  }
  const structuredBoxes = boxes.filter(function (b) {
    if (!b) return false;
    if (b.generatedBy === 'terrain-generator') return true;
    return prefabDrawsVoxels(getPrefabById(b.prefabId));
  });
  return {
    cacheVersion: 0,
    totalBoxes: structuredBoxes.length,
    map: buildOccupancy(structuredBoxes),
    lastUpdate: null,
    initialized: false
  };
}

function getOccupancyReaderCoreApi() {
  try {
    if (typeof window !== 'undefined' && window.__OCCUPANCY_READER_CORE__) return window.__OCCUPANCY_READER_CORE__;
  } catch (_) {}
  return null;
}

function getStaticWorldFaceMergeCoreApi() {
  try {
    if (typeof window !== 'undefined' && window.__STATIC_WORLD_FACE_MERGE_CORE__) return window.__STATIC_WORLD_FACE_MERGE_CORE__;
  } catch (_) {}
  return null;
}

function getTerrainMaterialCoreApi() {
  try {
    if (typeof window !== 'undefined' && window.__TERRAIN_MATERIAL_CORE__) return window.__TERRAIN_MATERIAL_CORE__;
  } catch (_) {}
  return null;
}

function getTerrainFaceMergeCoreApi() {
  try {
    if (typeof window !== 'undefined' && window.__TERRAIN_FACE_MERGE_CORE__) return window.__TERRAIN_FACE_MERGE_CORE__;
  } catch (_) {}
  return null;
}


function getTerrainRenderCoreApi() {
  try {
    if (typeof window !== 'undefined' && window.__TERRAIN_RENDER_CORE__) return window.__TERRAIN_RENDER_CORE__;
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.terrainRenderCore) return window.App.domain.terrainRenderCore;
  } catch (_) {}
  return null;
}

function requireTerrainRenderCoreForRender() {
  var core = getTerrainRenderCoreApi();
  if (!core) throw new Error('Missing terrain render core: src/core/domain/terrain-render-core.js must load before render.js');
  return core;
}

function getRenderOrderCoreApi() {
  try {
    if (typeof window !== 'undefined' && window.__RENDER_ORDER_CORE__) return window.__RENDER_ORDER_CORE__;
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.renderOrderCore) return window.App.domain.renderOrderCore;
  } catch (_) {}
  return null;
}

function requireRenderOrderCoreForRender() {
  var core = getRenderOrderCoreApi();
  if (!core) throw new Error('Missing render order core: src/core/domain/render-order-core.js must load before render.js');
  return core;
}
function getIsometricFaceCoreApi() {
  try {
    if (typeof window !== 'undefined' && window.__ISOMETRIC_FACE_CORE__) return window.__ISOMETRIC_FACE_CORE__;
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.isometricFaceCore) return window.App.domain.isometricFaceCore;
  } catch (_) {}
  return null;
}

function isTerrainMaterialVisualsEnabledForRender() {
  try {
    if (typeof window !== 'undefined' && window.__TERRAIN_MATERIAL_VISUALS_ENABLED__ === true) return true;
  } catch (_) {}
  return false;
}

function getTerrainMaterialMergeKeyForRenderCell(cell) {
  return requireTerrainRenderCoreForRender().getTerrainMaterialMergeKeyForRenderCell(cell);
}

function getTerrainFaceMergeSignature(cell, semanticFace, screenFace, currentViewRotation) {
  return requireTerrainRenderCoreForRender().getTerrainFaceMergeSignature(cell, semanticFace, screenFace, currentViewRotation);
}

function getTerrainSortBandKeyForRenderFace(cell, semanticFace, mergeCoords, orderMeta) {
  return requireTerrainRenderCoreForRender().getTerrainSortBandKeyForRenderFace(cell, semanticFace, mergeCoords, orderMeta);
}

function getTerrainSideEdgeVisibilitySignature(visibleFaces, semanticFace) {
  return requireTerrainRenderCoreForRender().getTerrainSideEdgeVisibilitySignature(visibleFaces, semanticFace);
}

function occupancyReaderHasSolid(reader, x, y, z) {
  return requireTerrainRenderCoreForRender().occupancyReaderHasSolid(reader, x, y, z);
}

function getTerrainSideTangentNeighbor(cell, semanticFace, direction) {
  return requireTerrainRenderCoreForRender().getTerrainSideTangentNeighbor(cell, semanticFace, direction);
}

function getTerrainSideStepBreakSignature(cell, semanticFace, occupancyReader) {
  return requireTerrainRenderCoreForRender().getTerrainSideStepBreakSignature(cell, semanticFace, occupancyReader);
}

function readStaticWorldFaceMergeDomOverrides() {
  try {
    if (typeof window === 'undefined') return null;
    var overrides = window.__RENDER_CONTROL_OVERRIDES__;
    var result = {};
    if (overrides && typeof overrides === 'object') {
      if (Object.prototype.hasOwnProperty.call(overrides, 'staticWorldFaceMergeEnabled')) result.staticWorldFaceMergeEnabled = overrides.staticWorldFaceMergeEnabled !== false;
      if (Object.prototype.hasOwnProperty.call(overrides, 'disableFaceMergeAtOrAboveZoomEnabled')) result.disableFaceMergeAtOrAboveZoomEnabled = !!overrides.disableFaceMergeAtOrAboveZoomEnabled;
      if (Object.prototype.hasOwnProperty.call(overrides, 'disableFaceMergeAtOrAboveZoomThreshold')) result.disableFaceMergeAtOrAboveZoomThreshold = Math.max(0.05, Number(overrides.disableFaceMergeAtOrAboveZoomThreshold) || 1.6);
    }
    var enabledEl = document.getElementById('renderFaceMergeEnabled');
    var zoomDisableEl = document.getElementById('renderDisableFaceMergeAtZoomEnabled');
    var thresholdEl = document.getElementById('renderDisableFaceMergeAtZoomThreshold');
    if (enabledEl) result.staticWorldFaceMergeEnabled = enabledEl.checked !== false;
    if (zoomDisableEl) result.disableFaceMergeAtOrAboveZoomEnabled = !!zoomDisableEl.checked;
    if (thresholdEl) result.disableFaceMergeAtOrAboveZoomThreshold = Math.max(0.05, Number(thresholdEl.value) || 1.6);
    return result;
  } catch (_) {
    return null;
  }
}

var __staticWorldFaceMergeControlState = {
  hysteresisGap: 0.12,
  settleDelayMs: 140,
  lastObservedZoom: null,
  lastZoomInteractionAt: 0,
  zoomInteractionActive: false,
  zoomSettlePending: false,
  effectiveFaceMergeMode: null,
  pendingFaceMergeMode: null,
  faceMergeModeSwitchCount: 0,
  hysteresisHitCount: 0,
  lastRequestedSettingsSignature: ''
};

function getEffectiveStaticWorldFaceMergeSettingsForRender() {
  var settings = typeof getMainEditorCameraSettingsForRender === 'function' ? (getMainEditorCameraSettingsForRender() || {}) : {};
  var effective = Object.assign({}, settings);
  try {
    var domOverrides = readStaticWorldFaceMergeDomOverrides();
    if (domOverrides) {
      if (Object.prototype.hasOwnProperty.call(domOverrides, 'staticWorldFaceMergeEnabled')) effective.staticWorldFaceMergeEnabled = domOverrides.staticWorldFaceMergeEnabled !== false;
      if (Object.prototype.hasOwnProperty.call(domOverrides, 'disableFaceMergeAtOrAboveZoomEnabled')) effective.disableFaceMergeAtOrAboveZoomEnabled = !!domOverrides.disableFaceMergeAtOrAboveZoomEnabled;
      if (Object.prototype.hasOwnProperty.call(domOverrides, 'disableFaceMergeAtOrAboveZoomThreshold')) effective.disableFaceMergeAtOrAboveZoomThreshold = Math.max(0.05, Number(domOverrides.disableFaceMergeAtOrAboveZoomThreshold) || 1.6);
    }
  } catch (_) {}
  effective.staticWorldFaceMergeEnabled = effective.staticWorldFaceMergeEnabled !== false;
  effective.disableFaceMergeAtOrAboveZoomEnabled = !!effective.disableFaceMergeAtOrAboveZoomEnabled;
  effective.disableFaceMergeAtOrAboveZoomThreshold = Math.max(0.05, Number(effective.disableFaceMergeAtOrAboveZoomThreshold) || 1.6);
  effective.zoom = Math.max(0.05, Number(effective.zoom) || 1);
  return effective;
}

function resolveRequestedFaceMergeModeForRender(settings, basisMode, state) {
  var safe = settings && typeof settings === 'object' ? settings : {};
  var s = state && typeof state === 'object' ? state : __staticWorldFaceMergeControlState;
  var mergeAllowed = safe.staticWorldFaceMergeEnabled !== false;
  if (!mergeAllowed) {
    return {
      mode: 'no-merge',
      highThreshold: Math.max(0.05, Number(safe.disableFaceMergeAtOrAboveZoomThreshold) || 1.6),
      lowThreshold: Math.max(0.05, Number((Number(safe.disableFaceMergeAtOrAboveZoomThreshold) || 1.6) - Number(s.hysteresisGap || 0.12)) || 0.05)
    };
  }
  if (safe.disableFaceMergeAtOrAboveZoomEnabled !== true) {
    return {
      mode: 'merge',
      highThreshold: Math.max(0.05, Number(safe.disableFaceMergeAtOrAboveZoomThreshold) || 1.6),
      lowThreshold: Math.max(0.05, Number((Number(safe.disableFaceMergeAtOrAboveZoomThreshold) || 1.6) - Number(s.hysteresisGap || 0.12)) || 0.05)
    };
  }
  var high = Math.max(0.05, Number(safe.disableFaceMergeAtOrAboveZoomThreshold) || 1.6);
  var low = Math.max(0.05, high - Math.max(0.01, Number(s.hysteresisGap || 0.12)));
  var zoom = Math.max(0.05, Number(safe.zoom) || 1);
  var base = String(basisMode || 'merge');
  var mode = base;
  if (base === 'merge') mode = zoom >= high ? 'no-merge' : 'merge';
  else mode = zoom <= low ? 'merge' : 'no-merge';
  return { mode: mode, highThreshold: high, lowThreshold: low };
}

function updateStaticWorldFaceMergeControlStateForRender() {
  var state = __staticWorldFaceMergeControlState;
  var settings = getEffectiveStaticWorldFaceMergeSettingsForRender();
  var now = perfNow();
  var requestedSignature = [
    settings.staticWorldFaceMergeEnabled !== false ? 1 : 0,
    settings.disableFaceMergeAtOrAboveZoomEnabled === true ? 1 : 0,
    Number(settings.disableFaceMergeAtOrAboveZoomThreshold || 1.6).toFixed(3)
  ].join('|');
  var controlsChanged = state.lastRequestedSettingsSignature !== requestedSignature;
  var zoom = Math.max(0.05, Number(settings.zoom) || 1);
  var zoomChanged = state.lastObservedZoom == null ? false : Math.abs(zoom - Number(state.lastObservedZoom || 0)) > 1e-6;
  var basisMode = String(state.pendingFaceMergeMode || state.effectiveFaceMergeMode || 'merge');
  var requested = resolveRequestedFaceMergeModeForRender(settings, basisMode, state);
  if (state.effectiveFaceMergeMode == null) state.effectiveFaceMergeMode = requested.mode;
  if (state.pendingFaceMergeMode == null) state.pendingFaceMergeMode = state.effectiveFaceMergeMode;
  if (controlsChanged) {
    state.lastRequestedSettingsSignature = requestedSignature;
    state.pendingFaceMergeMode = requested.mode;
    if (!state.zoomInteractionActive) {
      if (state.effectiveFaceMergeMode !== state.pendingFaceMergeMode) state.faceMergeModeSwitchCount += 1;
      state.effectiveFaceMergeMode = state.pendingFaceMergeMode;
    }
  }
  if (zoomChanged) {
    state.lastObservedZoom = zoom;
    state.lastZoomInteractionAt = now;
    state.zoomInteractionActive = true;
    state.zoomSettlePending = true;
    state.pendingFaceMergeMode = requested.mode;
  } else {
    state.lastObservedZoom = zoom;
    state.pendingFaceMergeMode = requested.mode;
    if (state.zoomInteractionActive) {
      if ((now - Number(state.lastZoomInteractionAt || 0)) >= Number(state.settleDelayMs || 140)) {
        state.zoomInteractionActive = false;
        state.zoomSettlePending = false;
        if (state.effectiveFaceMergeMode !== state.pendingFaceMergeMode) state.faceMergeModeSwitchCount += 1;
        state.effectiveFaceMergeMode = state.pendingFaceMergeMode;
      } else {
        state.zoomSettlePending = true;
      }
    } else {
      state.zoomSettlePending = false;
      if (controlsChanged && state.effectiveFaceMergeMode !== state.pendingFaceMergeMode) {
        state.faceMergeModeSwitchCount += 1;
        state.effectiveFaceMergeMode = state.pendingFaceMergeMode;
      }
    }
  }
  if (settings.disableFaceMergeAtOrAboveZoomEnabled === true && requested.highThreshold > requested.lowThreshold && zoom > requested.lowThreshold && zoom < requested.highThreshold) {
    state.hysteresisHitCount += 1;
  }
  return {
    zoomInteractionActive: state.zoomInteractionActive === true,
    zoomSettlePending: state.zoomSettlePending === true,
    effectiveFaceMergeMode: String(state.effectiveFaceMergeMode || 'merge'),
    pendingFaceMergeMode: String(state.pendingFaceMergeMode || state.effectiveFaceMergeMode || 'merge'),
    faceMergeModeSwitchCount: Math.max(0, Math.round(Number(state.faceMergeModeSwitchCount || 0) || 0)),
    hysteresisHitCount: Math.max(0, Math.round(Number(state.hysteresisHitCount || 0) || 0)),
    disableThresholdHigh: Number(requested.highThreshold || settings.disableFaceMergeAtOrAboveZoomThreshold || 1.6),
    disableThresholdLow: Number(requested.lowThreshold || settings.disableFaceMergeAtOrAboveZoomThreshold || 1.48),
    staticWorldFaceMergeEnabled: settings.staticWorldFaceMergeEnabled !== false,
    disableFaceMergeAtOrAboveZoomEnabled: settings.disableFaceMergeAtOrAboveZoomEnabled === true,
    disableFaceMergeAtOrAboveZoomThreshold: Number(settings.disableFaceMergeAtOrAboveZoomThreshold || 1.6),
    zoom: zoom
  };
}

function getStaticWorldFaceMergeControlStateSnapshotForRender() {
  try {
    return updateStaticWorldFaceMergeControlStateForRender();
  } catch (_) {
    return {
      zoomInteractionActive: false,
      zoomSettlePending: false,
      effectiveFaceMergeMode: 'merge',
      pendingFaceMergeMode: 'merge',
      faceMergeModeSwitchCount: 0,
      hysteresisHitCount: 0,
      disableThresholdHigh: 1.6,
      disableThresholdLow: 1.48,
      staticWorldFaceMergeEnabled: true,
      disableFaceMergeAtOrAboveZoomEnabled: false,
      disableFaceMergeAtOrAboveZoomThreshold: 1.6,
      zoom: 1
    };
  }
}

function isStaticWorldFaceMergeEnabledForRender() {
  try {
    if (typeof window !== 'undefined' && window.__STATIC_WORLD_FACE_MERGE_ENABLED__ === false) return false;
  } catch (_) {}
  try {
    var controlState = getStaticWorldFaceMergeControlStateSnapshotForRender();
    return String(controlState.effectiveFaceMergeMode || 'merge') !== 'no-merge';
  } catch (_) {}
  return true;
}

function resolveChunkOccupancyReaderForRender(options) {
  var opts = options && typeof options === 'object' ? options : {};
  var occupancyReaderCore = getOccupancyReaderCoreApi();
  var localBoxes = Array.isArray(opts.localBoxes) ? opts.localBoxes : [];
  var occupancy = opts.occupancy || null;
  if (occupancyReaderCore && typeof occupancyReaderCore.createOccupancyReader === 'function') {
    var globalResult = occupancyReaderCore.createOccupancyReader({
      occupancy: occupancy,
      localBoxes: localBoxes,
      sourceLabel: 'global',
      validateLocalBoxes: true
    });
    if (globalResult && globalResult.valid === true && globalResult.reader) return globalResult;
    var localOccupancy = buildChunkLocalOccupancyMap(localBoxes, Array.isArray(opts.neighborBoxes) ? opts.neighborBoxes : []);
    var localResult = occupancyReaderCore.createOccupancyReader({
      occupancy: localOccupancy,
      localBoxes: localBoxes,
      sourceLabel: 'local-fallback',
      validateLocalBoxes: false
    });
    if (localResult && localResult.reader) {
      localResult.fallbackReason = globalResult && globalResult.fallbackReason ? globalResult.fallbackReason : 'missing-global-occupancy';
      localResult.localOccupancy = localOccupancy;
      return localResult;
    }
  }
  var fallbackOccupancy = buildChunkLocalOccupancyMap(localBoxes, Array.isArray(opts.neighborBoxes) ? opts.neighborBoxes : []);
  return {
    valid: true,
    source: 'local-fallback',
    fallbackReason: occupancy && typeof occupancy.has === 'function' ? 'missing-occupancy-reader-core' : 'missing-global-occupancy',
    validationSampleCount: 0,
    reader: fallbackOccupancy,
    localOccupancy: fallbackOccupancy
  };
}


function getSceneStaticWorldCacheApiForRender() {
  try {
    if (typeof window !== 'undefined' && window.__SCENE_STATIC_WORLD_CACHE__) return window.__SCENE_STATIC_WORLD_CACHE__;
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.sceneSession) {
      var sessionApi = window.App.state.sceneSession;
      if (sessionApi && typeof sessionApi.getStaticWorldCacheSnapshot === 'function' && typeof sessionApi.consumeStaticWorldUpdates === 'function') {
        return {
          getSnapshot: function () { return sessionApi.getStaticWorldCacheSnapshot(); },
          consumeUpdates: function () { return sessionApi.consumeStaticWorldUpdates(); }
        };
      }
    }
  } catch (_) {}
  return null;
}

function getSharedStaticWorldChunkCacheApiForRender() {
  try {
    if (typeof window !== 'undefined' && window.__STATIC_WORLD_CHUNK_CACHE__) return window.__STATIC_WORLD_CHUNK_CACHE__;
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.App && window.App.renderer && window.App.renderer.staticWorldChunkCache) {
      return window.App.renderer.staticWorldChunkCache;
    }
  } catch (_) {}
  return null;
}

function getRenderDiagnosticsApiForRender() {
  try {
    if (typeof window !== 'undefined' && window.App && window.App.renderer && window.App.renderer.renderDiagnostics) {
      return window.App.renderer.renderDiagnostics;
    }
  } catch (_) {}
  try { if (typeof window !== 'undefined' && window.__RENDER_DIAGNOSTICS__) return window.__RENDER_DIAGNOSTICS__; } catch (_) {}
  try { if (typeof window !== 'undefined' && window.IsometricRenderDiagnostics) return window.IsometricRenderDiagnostics; } catch (_) {}
  return null;
}

function requireRenderDiagnosticsForRender() {
  var api = getRenderDiagnosticsApiForRender();
  if (!api) throw new Error('Render diagnostics API is not loaded before render.js');
  return api;
}

function getRenderBuildDiagnosticsGateApiForRender() {
  try {
    if (typeof window !== 'undefined' && window.__APP_PRESENTATION_RENDER_BUILD_DIAGNOSTICS_GATE__) return window.__APP_PRESENTATION_RENDER_BUILD_DIAGNOSTICS_GATE__;
    if (typeof window !== 'undefined' && window.__RENDER_BUILD_DIAGNOSTICS_GATE__) return window.__RENDER_BUILD_DIAGNOSTICS_GATE__;
    if (typeof window !== 'undefined' && window.IsometricRenderBuildDiagnosticsGate) return window.IsometricRenderBuildDiagnosticsGate;
  } catch (_) {}
  try {
    if (typeof globalThis !== 'undefined' && globalThis.__APP_PRESENTATION_RENDER_BUILD_DIAGNOSTICS_GATE__) return globalThis.__APP_PRESENTATION_RENDER_BUILD_DIAGNOSTICS_GATE__;
    if (typeof globalThis !== 'undefined' && globalThis.__RENDER_BUILD_DIAGNOSTICS_GATE__) return globalThis.__RENDER_BUILD_DIAGNOSTICS_GATE__;
    if (typeof globalThis !== 'undefined' && globalThis.IsometricRenderBuildDiagnosticsGate) return globalThis.IsometricRenderBuildDiagnosticsGate;
  } catch (_) {}
  return null;
}

function requireRenderBuildDiagnosticsGateForRender() {
  var api = getRenderBuildDiagnosticsGateApiForRender();
  if (!api) throw new Error('render-build-diagnostics-gate.js must load before presentation/render/render.js');
  return api;
}

function createRenderBuildDiagnosticsGateDepsForRender() {
  return {
    requireRenderDiagnosticsForRender: requireRenderDiagnosticsForRender,
    isDetailedTerrainProfilingEnabledForRender: typeof isDetailedTerrainProfilingEnabledForRender === 'function' ? isDetailedTerrainProfilingEnabledForRender : null
  };
}

// P11a-7 note: detailed static/chunk/color build diagnostic emitter gating
// lives in src/presentation/render/diagnostics/render-build-diagnostics-gate.js.

function emitRenderBuildDiagnostic(name, payload) {
  var gate = requireRenderBuildDiagnosticsGateForRender();
  var fn = gate && gate[name];
  if (typeof fn !== 'function') throw new Error('render build diagnostics gate missing ' + name);
  return fn(payload, createRenderBuildDiagnosticsGateDepsForRender());
}

function emitStaticWorldChunkSummary(payload) {
  return requireRenderDiagnosticsForRender().emitStaticWorldChunkSummary(payload);
}

function maybeLogStaticWorldChunkSummary(payload, forceLog) {
  return requireRenderDiagnosticsForRender().maybeLogStaticWorldChunkSummary(payload, forceLog);
}

function isStaticWorldBoxForRender(box, instanceRenderUpdateModes) {
  if (!box) return false;
  if (box.generatedBy === 'terrain-generator') return true;
  var prefab = getPrefabById(box.prefabId);
  if (!prefabDrawsVoxels(prefab)) return false;
  if (!box.instanceId) return true;
  var mode = instanceRenderUpdateModes && typeof instanceRenderUpdateModes.get === 'function'
    ? instanceRenderUpdateModes.get(String(box.instanceId)) || 'static'
    : getPrefabRenderUpdateModeForRender(prefab, box);
  return mode === 'static';
}

function buildStaticWorldRenderSignature(currentViewRotation) {
  var faceMergeControlState = getStaticWorldFaceMergeControlStateSnapshotForRender();
  return JSON.stringify({
    lightingSignature: staticBoxLightingSignature(),
    xrayFaces: !!xrayFaces,
    showDebug: !!showDebug,
    surfaceOnlyRenderingEnabled: getMainEditorCameraSettingsForRender().surfaceOnlyRenderingEnabled !== false,
    packetViewRotation: Number(currentViewRotation || 0),
    cacheContentType: 'world-face-packets',
    cameraIndependent: true,
    usesScreenSpaceCache: false,
    faceMergeEffectiveMode: String(faceMergeControlState.effectiveFaceMergeMode || 'merge')
  });
}

function buildChunkLocalOccupancyMap(localBoxes, neighborBoxes) {
  var local = Array.isArray(localBoxes) ? localBoxes : [];
  var neighbors = Array.isArray(neighborBoxes) ? neighborBoxes : [];
  var combined = local.concat(neighbors);
  if (typeof buildOccupancy === 'function') return buildOccupancy(combined);
  var map = new Map();
  for (var i = 0; i < combined.length; i++) {
    var box = combined[i];
    if (!box) continue;
    var w = Math.max(1, Number(box.w) || 1);
    var d = Math.max(1, Number(box.d) || 1);
    var h = Math.max(1, Number(box.h) || 1);
    for (var dx = 0; dx < w; dx++) {
      for (var dy = 0; dy < d; dy++) {
        for (var dz = 0; dz < h; dz++) {
          map.set([Number(box.x || 0) + dx, Number(box.y || 0) + dy, Number(box.z || 0) + dz].join(','), true);
        }
      }
    }
  }
  return map;
}

function requireIsometricFaceCoreForRender() {
  var api = getIsometricFaceCoreApi();
  if (!api) throw new Error('Missing isometric face core: src/core/domain/isometric-face-core.js must load before render.js');
  return api;
}

function getScreenFaceForSemanticFace(semanticFace, viewRotation) {
  return requireIsometricFaceCoreForRender().getScreenFaceForSemanticFace(semanticFace, viewRotation, 0);
}

function getBaseFaceFillRgbForSemanticFace(fc, semanticFace) {
  return requireIsometricFaceCoreForRender().getBaseFaceFillRgbForSemanticFace(fc, semanticFace);
}

function buildVoxelFaceWorldPolygon(x, y, z, semanticFace) {
  return requireIsometricFaceCoreForRender().buildVoxelFaceWorldPolygon(x, y, z, semanticFace);
}

function getStaticWorldFaceMergeCoords(cell, semanticFace) {
  return requireIsometricFaceCoreForRender().getStaticWorldFaceMergeCoords(cell, semanticFace);
}

function getStaticWorldFaceMergeSignature(cell, semanticFace, screenFace, currentViewRotation) {
  return requireIsometricFaceCoreForRender().getStaticWorldFaceMergeSignature(cell, semanticFace, screenFace, currentViewRotation);
}


var __terrainMaterialPatternCache = new Map();

function getTerrainMaterialIdForRenderCell(cell) {
  var safeCell = cell && typeof cell === 'object' ? cell : null;
  if (!safeCell) return null;
  var materialCore = getTerrainMaterialCoreApi();
  var candidate = safeCell.terrainMaterialId != null
    ? safeCell.terrainMaterialId
    : ((safeCell.generatedBy === 'terrain-generator' && safeCell.materialType != null) ? safeCell.materialType : null);
  if (!candidate) return null;
  if (materialCore && typeof materialCore.normalizeTerrainMaterialId === 'function') {
    try { return materialCore.normalizeTerrainMaterialId(candidate); } catch (_) {}
  }
  return String(candidate);
}

function getTerrainMaterialDefinitionForRenderCell(cell) {
  var materialId = getTerrainMaterialIdForRenderCell(cell);
  if (!materialId) return null;
  var materialCore = getTerrainMaterialCoreApi();
  if (materialCore && typeof materialCore.getTerrainMaterialDefinition === 'function') {
    try { return materialCore.getTerrainMaterialDefinition(materialId); } catch (_) {}
  }
  return null;
}

function getTerrainMaterialFaceVariantForRender(semanticFace) {
  return String(semanticFace || 'top') === 'top' ? 'top' : 'side';
}

function getTerrainMaterialBaseFaceColorsForRenderCell(cell) {
  if (!isTerrainMaterialVisualsEnabledForRender()) return null;
  var def = getTerrainMaterialDefinitionForRenderCell(cell);
  if (!def || !def.colors) return null;
  var topHex = def.colors.top || '#79b35a';
  var sideHex = def.colors.side || topHex;
  return {
    top: hexToRgb(topHex),
    east: hexToRgb(sideHex),
    south: hexToRgb(sideHex),
    line: String(def.colors.edge || '#3c3c3c')
  };
}

function getTerrainMaterialPatternDescriptorForRenderCell(cell, semanticFace) {
  if (!isTerrainMaterialVisualsEnabledForRender()) return null;
  var def = getTerrainMaterialDefinitionForRenderCell(cell);
  if (!def) return null;
  var materialId = getTerrainMaterialIdForRenderCell(cell);
  var faceVariant = getTerrainMaterialFaceVariantForRender(semanticFace);
  var pattern = def.patterns && def.patterns[faceVariant] ? def.patterns[faceVariant] : null;
  var materialCore = getTerrainMaterialCoreApi();
  var signature = materialCore && typeof materialCore.resolveTerrainMaterialRenderSignature === 'function'
    ? materialCore.resolveTerrainMaterialRenderSignature(materialId, faceVariant, 'pixel-pattern')
    : [String(materialId || ''), faceVariant, 'pixel-pattern'].join('|');
  return {
    materialId: materialId,
    label: def.label || materialId,
    faceVariant: faceVariant,
    signature: signature,
    opacity: Number(pattern && pattern.opacity != null ? pattern.opacity : 0),
    pattern: pattern || null,
    lineColor: String(def.colors && def.colors.edge || '#3c3c3c')
  };
}

function buildTerrainMaterialPatternEntry(descriptor) {
  var desc = descriptor && typeof descriptor === 'object' ? descriptor : null;
  if (!desc || !desc.pattern || typeof document === 'undefined') return null;
  var key = String(desc.signature || [desc.materialId || '', desc.faceVariant || ''].join('|'));
  var cached = __terrainMaterialPatternCache.get(key);
  if (cached) return cached;
  var size = Math.max(2, Math.round(Number(desc.pattern.size || 8) || 8));
  var canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  var g = canvas.getContext('2d');
  if (!g) return null;
  g.clearRect(0, 0, size, size);
  var pixels = Array.isArray(desc.pattern.pixels) ? desc.pattern.pixels : [];
  for (var i = 0; i < pixels.length; i++) {
    var px = pixels[i] || {};
    g.fillStyle = String(px.color || '#ffffff');
    g.fillRect(Math.max(0, Math.round(Number(px.x) || 0)) % size, Math.max(0, Math.round(Number(px.y) || 0)) % size, 1, 1);
  }
  var pattern = null;
  try { pattern = ctx && typeof ctx.createPattern === 'function' ? ctx.createPattern(canvas, 'repeat') : null; } catch (_) { pattern = null; }
  if (!pattern) return null;
  cached = { key: key, pattern: pattern, opacity: Number(desc.opacity || 0.5) };
  __terrainMaterialPatternCache.set(key, cached);
  return cached;
}

function getPointBounds(points) {
  var pts = Array.isArray(points) ? points : [];
  if (!pts.length) return null;
  var minX = Number(pts[0].x || 0), maxX = minX, minY = Number(pts[0].y || 0), maxY = minY;
  for (var i = 1; i < pts.length; i++) {
    var px = Number(pts[i].x || 0), py = Number(pts[i].y || 0);
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  return { minX: minX, minY: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function applyTerrainMaterialPatternOverlay(ctxRef, points, path2d, offsetX, offsetY, renderable) {
  if (!isTerrainMaterialVisualsEnabledForRender()) return;
  var target = ctxRef || ctx;
  if (!target || !renderable) return;
  var descriptor = renderable.terrainPatternDescriptor && typeof renderable.terrainPatternDescriptor === 'object'
    ? renderable.terrainPatternDescriptor
    : null;
  if (!descriptor && renderable.terrainMaterialId) {
    descriptor = getTerrainMaterialPatternDescriptorForRenderCell(renderable, renderable.semanticFace || renderable.screenFace || 'top');
  }
  var entry = buildTerrainMaterialPatternEntry(descriptor);
  if (!entry || !entry.pattern) return;
  var bounds = getPointBounds(points);
  if (!bounds) return;
  var dx = Number(offsetX || 0), dy = Number(offsetY || 0);
  target.save();
  if (dx || dy) target.translate(dx, dy);
  if (path2d) {
    target.clip(path2d);
  } else {
    target.beginPath();
    target.moveTo(Number(points[0].x || 0), Number(points[0].y || 0));
    for (var i = 1; i < points.length; i++) target.lineTo(Number(points[i].x || 0), Number(points[i].y || 0));
    target.closePath();
    target.clip();
  }
  var oldAlpha = Number(target.globalAlpha || 1);
  target.globalAlpha = Math.max(0, Math.min(1, Number(renderable.terrainPatternOpacity != null ? renderable.terrainPatternOpacity : entry.opacity)));
  target.fillStyle = entry.pattern;
  target.fillRect(Math.floor(bounds.minX) - 8, Math.floor(bounds.minY) - 8, Math.ceil(bounds.width) + 16, Math.ceil(bounds.height) + 16);
  target.globalAlpha = oldAlpha;
  target.restore();
}


function worldPointFromMergeUV(semanticFace, plane, u, v) {
  return requireTerrainRenderCoreForRender().worldPointFromMergeUV(semanticFace, plane, u, v);
}

function buildTerrainPolygonLoopSignature(descriptor) {
  return requireTerrainRenderCoreForRender().buildTerrainPolygonLoopSignature(descriptor);
}

function isTerrainTopBoundaryDebugRedEnabled() {
  try {
    if (typeof window !== 'undefined' && window.__TERRAIN_BOUNDARY_DEBUG_RED__ === true) return true;
    if (typeof localStorage !== 'undefined') {
      var value = localStorage.getItem('terrainBoundaryDebugRed');
      return value === '1' || value === 'true';
    }
  } catch (_) {}
  return false;
}

function getTerrainTopBoundaryRenderDebugSignature() {
  return isTerrainTopBoundaryDebugRedEnabled() ? 'boundary-debug-red:1' : 'boundary-debug-red:0';
}

function getGlobalTerrainBoundaryOccupancyReaderForRender(reason) {
  try {
    var snapshot = getSceneOccupancySnapshotForRender(reason || 'terrain-boundary:global-reader');
    var occ = snapshot && snapshot.map ? snapshot.map : snapshot;
    var occupancyReaderCore = getOccupancyReaderCoreApi();
    if (occupancyReaderCore && typeof occupancyReaderCore.createOccupancyReader === 'function') {
      var result = occupancyReaderCore.createOccupancyReader({
        occupancy: occ,
        localBoxes: [],
        sourceLabel: 'terrain-boundary-global',
        validateLocalBoxes: false
      });
      if (result && result.reader) return result.reader;
    }
    if (occ && typeof occ.has === 'function') return occ;
  } catch (_) {}
  return null;
}

function buildTerrainTopBoundarySegmentsWorldFromDescriptor(descriptor, occupancyReader) {
  var reader = occupancyReader || getGlobalTerrainBoundaryOccupancyReaderForRender('terrain-boundary:descriptor-fallback');
  return requireTerrainRenderCoreForRender().buildTerrainTopBoundarySegmentsWorldFromDescriptor(descriptor, reader);
}

function getTerrainTopBoundaryStrokeWidthForPacket(packet) {
  if (!packet || !Array.isArray(packet.terrainBoundarySegmentsWorld) || !packet.terrainBoundarySegmentsWorld.length) return 0;
  if (isTerrainTopBoundaryDebugRedEnabled()) return 4.5;
  var explicit = Number(packet.terrainBoundaryStrokeWidth);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return 2.6;
}

function getTerrainTopBoundaryStrokeStyleForPacket(packet) {
  if (!packet) return null;
  if (isTerrainTopBoundaryDebugRedEnabled()) return 'rgba(255,0,0,0.98)';
  return packet.terrainBoundaryStroke || packet.stroke || 'rgba(17,24,39,0.78)';
}

function buildMergedVoxelFaceWorldGeometry(descriptor) {
  return requireTerrainRenderCoreForRender().buildMergedVoxelFaceWorldGeometry(descriptor);
}

function buildMergedVoxelFaceWorldPolygon(descriptor) {
  return requireTerrainRenderCoreForRender().buildMergedVoxelFaceWorldPolygon(descriptor);
}

function emitChunkRebuildBreakdown(payload) {
  return emitRenderBuildDiagnostic('emitChunkRebuildBreakdown', payload);
}

function emitChunkRebuildDetail(payload) {
  return emitRenderBuildDiagnostic('emitChunkRebuildDetail', payload);
}

function emitChunkRebuildScopeVerify(payload) {
  return emitRenderBuildDiagnostic('emitChunkRebuildScopeVerify', payload);
}

function emitChunkRebuildHotspot(payload) {
  return emitRenderBuildDiagnostic('emitChunkRebuildHotspot', payload);
}

function emitStaticRenderableBuildDetail(payload) {
  return emitRenderBuildDiagnostic('emitStaticRenderableBuildDetail', payload);
}

function emitStaticRenderableBuildHotspot(payload) {
  return emitRenderBuildDiagnostic('emitStaticRenderableBuildHotspot', payload);
}

function emitStaticRenderableBuildScopeVerify(payload) {
  return emitRenderBuildDiagnostic('emitStaticRenderableBuildScopeVerify', payload);
}

function emitColorBuildDetail(payload) {
  return emitRenderBuildDiagnostic('emitColorBuildDetail', payload);
}

function emitColorBuildHotspot(payload) {
  return emitRenderBuildDiagnostic('emitColorBuildHotspot', payload);
}

function emitBuildColorPathVerify(payload) {
  return emitRenderBuildDiagnostic('emitBuildColorPathVerify', payload);
}

function emitColorBuildMissBreakdown(payload) {
  return emitRenderBuildDiagnostic('emitColorBuildMissBreakdown', payload);
}

function emitStep4ColorBuildDetail(payload) {
  return emitRenderBuildDiagnostic('emitStep4ColorBuildDetail', payload);
}

function emitStep4ColorBuildHotspot(payload) {
  return emitRenderBuildDiagnostic('emitStep4ColorBuildHotspot', payload);
}

function emitStep4ColorBuildScopeVerify(payload) {
  return emitRenderBuildDiagnostic('emitStep4ColorBuildScopeVerify', payload);
}

function emitLightingShadowBypassVerify(payload) {
  return emitRenderBuildDiagnostic('emitLightingShadowBypassVerify', payload);
}

function emitStep4ShadowPathSummary(payload) {
  return emitRenderBuildDiagnostic('emitStep4ShadowPathSummary', payload);
}

function getCachedBaseFaceColorsForRenderable(base) {
  return requireStaticRenderableColorCacheForRender().getCachedBaseFaceColorsForRenderable(
    base,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function rgbToCssCachedForRenderable(rgb, a) {
  return requireStaticRenderableColorCacheForRender().rgbToCssCachedForRenderable(
    rgb,
    a,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function getStaticRenderableBuildColorModeForRender(terrainSettings) {
  return requireStaticRenderableColorCacheForRender().getStaticRenderableBuildColorModeForRender(
    terrainSettings,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function isStaticRenderableBuildLightingBypassEnabled(terrainSettings) {
  return requireStaticRenderableColorCacheForRender().isStaticRenderableBuildLightingBypassEnabled(
    terrainSettings,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function isStaticRenderableLightingUiEnabledForBuild() {
  return requireStaticRenderableColorCacheForRender().isStaticRenderableLightingUiEnabledForBuild(
    createStaticRenderableColorCacheDepsForRender()
  );
}

function isStaticRenderableLightingActiveForBuild(terrainSettings) {
  return requireStaticRenderableColorCacheForRender().isStaticRenderableLightingActiveForBuild(
    terrainSettings,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function getStaticRenderableBuildLightingSignature(terrainSettings) {
  return requireStaticRenderableColorCacheForRender().getStaticRenderableBuildLightingSignature(
    terrainSettings,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function getStaticRenderableActualColorPathUsed(terrainSettings) {
  return requireStaticRenderableColorCacheForRender().getStaticRenderableActualColorPathUsed(
    terrainSettings,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function getStaticRenderableFlatDebugFillRgb(semanticFace) {
  return requireStaticRenderableColorCacheForRender().getStaticRenderableFlatDebugFillRgb(
    semanticFace,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function getStaticRenderableColorScopeSignature(currentViewRotation) {
  return requireStaticRenderableColorCacheForRender().getStaticRenderableColorScopeSignature(
    currentViewRotation,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function ensureStaticRenderableColorCacheScope(currentViewRotation) {
  return requireStaticRenderableColorCacheForRender().ensureStaticRenderableColorCacheScope(
    currentViewRotation,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function getStaticRenderableColorCacheMeta(cell, semanticFace, currentViewRotation, terrainSettings) {
  return requireStaticRenderableColorCacheForRender().getStaticRenderableColorCacheMeta(
    cell,
    semanticFace,
    currentViewRotation,
    terrainSettings,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function getCachedStaticRenderableFill(cell, semanticFace, worldPts, normal, currentViewRotation, colorStats) {
  return requireStaticRenderableColorCacheForRender().getCachedStaticRenderableFill(
    cell,
    semanticFace,
    worldPts,
    normal,
    currentViewRotation,
    colorStats,
    createStaticRenderableColorCacheDepsForRender()
  );
}

function requireStaticWorldRenderableBuilderForRender() {
  try {
    if (typeof window !== 'undefined' && window.App && window.App.application && window.App.application.render && window.App.application.render.staticWorldRenderableBuilder) return window.App.application.render.staticWorldRenderableBuilder;
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.__STATIC_WORLD_RENDERABLE_BUILDER__) return window.__STATIC_WORLD_RENDERABLE_BUILDER__;
  } catch (_) {}
  throw new Error('Missing static world renderable builder: src/application/render/static-world-renderable-builder.js must load before src/presentation/render/render.js');
}

function resolveRenderFunctionDependency(name) {
  try {
    if (typeof window !== 'undefined' && typeof window[name] === 'function') return window[name];
  } catch (_) {}
  try {
    if (typeof globalThis !== 'undefined' && typeof globalThis[name] === 'function') return globalThis[name];
  } catch (_) {}
  return null;
}

function createStaticWorldRenderableBuilderDepsForRender() {
  return {
    perfNow: resolveRenderFunctionDependency('perfNow'),
    getRenderVisibilityCoreApi: resolveRenderFunctionDependency('getRenderVisibilityCoreApi'),
    getMainCameraRenderScope: resolveRenderFunctionDependency('getMainCameraRenderScope'),
    resolveChunkOccupancyReaderForRender: resolveRenderFunctionDependency('resolveChunkOccupancyReaderForRender'),
    buildChunkLocalOccupancyMap: resolveRenderFunctionDependency('buildChunkLocalOccupancyMap'),
    getDomainSceneCoreApi: resolveRenderFunctionDependency('getDomainSceneCoreApi'),
    isStaticWorldFaceMergeEnabledForRender: resolveRenderFunctionDependency('isStaticWorldFaceMergeEnabledForRender'),
    isStaticRenderableLightingUiEnabledForBuild: resolveRenderFunctionDependency('isStaticRenderableLightingUiEnabledForBuild'),
    getScreenFaceForSemanticFace: resolveRenderFunctionDependency('getScreenFaceForSemanticFace'),
    getSemanticFaceNormal: resolveRenderFunctionDependency('getSemanticFaceNormal'),
    getStaticWorldFaceMergeCoords: resolveRenderFunctionDependency('getStaticWorldFaceMergeCoords'),
    computeViewAwareSortMeta: resolveRenderFunctionDependency('computeViewAwareSortMeta'),
    getTerrainSortBandKeyForRenderFace: resolveRenderFunctionDependency('getTerrainSortBandKeyForRenderFace'),
    getTerrainSideEdgeVisibilitySignature: resolveRenderFunctionDependency('getTerrainSideEdgeVisibilitySignature'),
    getTerrainSideStepBreakSignature: resolveRenderFunctionDependency('getTerrainSideStepBreakSignature'),
    getTerrainMaterialMergeKeyForRenderCell: resolveRenderFunctionDependency('getTerrainMaterialMergeKeyForRenderCell'),
    getTerrainFaceMergeSignature: resolveRenderFunctionDependency('getTerrainFaceMergeSignature'),
    getStaticWorldFaceMergeSignature: resolveRenderFunctionDependency('getStaticWorldFaceMergeSignature'),
    getStaticWorldFaceMergeCoreApi: resolveRenderFunctionDependency('getStaticWorldFaceMergeCoreApi'),
    getTerrainFaceMergeCoreApi: resolveRenderFunctionDependency('getTerrainFaceMergeCoreApi'),
    buildMergedVoxelFaceWorldGeometry: resolveRenderFunctionDependency('buildMergedVoxelFaceWorldGeometry'),
    buildTerrainTopBoundarySegmentsWorldFromDescriptor: resolveRenderFunctionDependency('buildTerrainTopBoundarySegmentsWorldFromDescriptor'),
    buildTerrainPolygonLoopSignature: resolveRenderFunctionDependency('buildTerrainPolygonLoopSignature'),
    getTerrainMaterialPatternDescriptorForRenderCell: resolveRenderFunctionDependency('getTerrainMaterialPatternDescriptorForRenderCell'),
    getTerrainMaterialBaseFaceColorsForRenderCell: resolveRenderFunctionDependency('getTerrainMaterialBaseFaceColorsForRenderCell'),
    getCachedBaseFaceColorsForRenderable: resolveRenderFunctionDependency('getCachedBaseFaceColorsForRenderable'),
    getTerrainRenderSettingsForRender: resolveRenderFunctionDependency('getTerrainRenderSettingsForRender'),
    isStaticRenderableLightingActiveForBuild: resolveRenderFunctionDependency('isStaticRenderableLightingActiveForBuild'),
    getCachedStaticRenderableFill: resolveRenderFunctionDependency('getCachedStaticRenderableFill'),
    buildVoxelFaceShadowWorldOverlays: resolveRenderFunctionDependency('buildVoxelFaceShadowWorldOverlays'),
    buildActorInteractionMemberFaceKeysFromFaceDescriptor: resolveRenderFunctionDependency('buildActorInteractionMemberFaceKeysFromFaceDescriptor'),
    getActorInteractionMemberDescriptorsFromFaceDescriptor: resolveRenderFunctionDependency('getActorInteractionMemberDescriptorsFromFaceDescriptor'),
    getTerrainMaterialIdForRenderCell: resolveRenderFunctionDependency('getTerrainMaterialIdForRenderCell'),
    compareRenderablesByDomain: resolveRenderFunctionDependency('compareRenderablesByDomain'),
    emitChunkRebuildScopeVerify: resolveRenderFunctionDependency('emitChunkRebuildScopeVerify'),
    emitChunkRebuildDetail: resolveRenderFunctionDependency('emitChunkRebuildDetail'),
    emitChunkRebuildHotspot: resolveRenderFunctionDependency('emitChunkRebuildHotspot'),
    emitStaticRenderableBuildDetail: resolveRenderFunctionDependency('emitStaticRenderableBuildDetail'),
    emitStaticRenderableBuildScopeVerify: resolveRenderFunctionDependency('emitStaticRenderableBuildScopeVerify'),
    emitStaticRenderableBuildHotspot: resolveRenderFunctionDependency('emitStaticRenderableBuildHotspot'),
    emitColorBuildDetail: resolveRenderFunctionDependency('emitColorBuildDetail'),
    emitStep4ColorBuildDetail: resolveRenderFunctionDependency('emitStep4ColorBuildDetail'),
    emitStep4ColorBuildScopeVerify: resolveRenderFunctionDependency('emitStep4ColorBuildScopeVerify'),
    getStaticRenderableActualColorPathUsed: resolveRenderFunctionDependency('getStaticRenderableActualColorPathUsed'),
    getStaticRenderableBuildColorModeForRender: resolveRenderFunctionDependency('getStaticRenderableBuildColorModeForRender'),
    emitBuildColorPathVerify: resolveRenderFunctionDependency('emitBuildColorPathVerify'),
    emitLightingShadowBypassVerify: resolveRenderFunctionDependency('emitLightingShadowBypassVerify'),
    emitStep4ShadowPathSummary: resolveRenderFunctionDependency('emitStep4ShadowPathSummary'),
    emitColorBuildMissBreakdown: resolveRenderFunctionDependency('emitColorBuildMissBreakdown'),
    emitColorBuildHotspot: resolveRenderFunctionDependency('emitColorBuildHotspot'),
    emitStep4ColorBuildHotspot: resolveRenderFunctionDependency('emitStep4ColorBuildHotspot'),
    emitChunkRebuildBreakdown: resolveRenderFunctionDependency('emitChunkRebuildBreakdown')
  };
}

function buildStaticWorldChunkRenderables(chunk, options) {
  return requireStaticWorldRenderableBuilderForRender().buildStaticWorldChunkRenderables(
    chunk,
    options,
    createStaticWorldRenderableBuilderDepsForRender()
  );
}

function emitRenderFrameSummary(payload) {
  return requireRenderDiagnosticsForRender().emitRenderFrameSummary(payload);
}

function maybeLogRenderFrameSummary(payload) {
  return requireRenderDiagnosticsForRender().maybeLogRenderFrameSummary(payload);
}

function shouldForceExactVisibleSummaryForRender(terrainFirstFrameWindow, now) {
  return requireRenderDiagnosticsForRender().shouldForceExactVisibleSummary(terrainFirstFrameWindow, now);
}

function emitCameraStaticWorldVerify(payload) {
  return requireRenderDiagnosticsForRender().emitCameraStaticWorldVerify(payload);
}

function maybeLogCameraStaticWorldVerify(payload) {
  return requireRenderDiagnosticsForRender().maybeLogCameraStaticWorldVerify(payload);
}

function emitCameraMoveVerify(payload) {
  return requireRenderDiagnosticsForRender().emitCameraMoveVerify(payload);
}

function maybeLogCameraMoveVerify(payload) {
  return requireRenderDiagnosticsForRender().maybeLogCameraMoveVerify(payload);
}

function emitFrameWorkBreakdown(payload) {
  return requireRenderDiagnosticsForRender().emitFrameWorkBreakdown(payload);
}

function maybeLogFrameWorkBreakdown(payload) {
  return requireRenderDiagnosticsForRender().maybeLogFrameWorkBreakdown(payload);
}

function emitZoomStateVerify(payload) {
  return requireRenderDiagnosticsForRender().emitZoomStateVerify(payload);
}

function maybeLogZoomStateVerify(payload) {
  return requireRenderDiagnosticsForRender().maybeLogZoomStateVerify(payload);
}

function emitZoomCameraStateVerify(payload) {
  return requireRenderDiagnosticsForRender().emitZoomCameraStateVerify(payload);
}

function maybeLogZoomCameraStateVerify(payload) {
  return requireRenderDiagnosticsForRender().maybeLogZoomCameraStateVerify(payload);
}

function emitStaticCacheInvalidationVerify(payload) {
  return requireRenderDiagnosticsForRender().emitStaticCacheInvalidationVerify(payload);
}

function maybeLogStaticCacheInvalidationVerify(payload) {
  return requireRenderDiagnosticsForRender().maybeLogStaticCacheInvalidationVerify(payload);
}

function emitStaticBoxCacheProfile(payload) {
  return requireRenderDiagnosticsForRender().emitStaticBoxCacheProfile(payload);
}

function maybeLogStaticBoxCacheProfile(payload, forceLog) {
  return requireRenderDiagnosticsForRender().maybeLogStaticBoxCacheProfile(payload, forceLog);
}

function beginRenderFrameDiagnosticState() {
  return requireRenderDiagnosticsForRender().beginRenderFrameDiagnosticState();
}

function captureStaticBoxCacheFrameState(payload) {
  return requireRenderDiagnosticsForRender().captureStaticBoxCacheFrameState(payload);
}

function getCurrentRenderFrameStaticCacheState() {
  return requireRenderDiagnosticsForRender().getCurrentRenderFrameStaticCacheState();
}

function emitTerrainFirstFrames(payload) {
  return requireRenderDiagnosticsForRender().emitTerrainFirstFrames(payload);
}

function isDetailedTerrainProfilingEnabledForRender() {
  var settings = getTerrainRenderSettingsForRender();
  return !!(settings && settings.terrainDetailedProfilingEnabled === true);
}

function emitTerrainFirstFramesDetail(payload) {
  if (!isDetailedTerrainProfilingEnabledForRender()) return null;
  return requireRenderDiagnosticsForRender().emitTerrainFirstFramesDetail(payload);
}

function getTerrainFrameLogContextForRender() {
  var model = getTerrainRuntimeModelForRender();
  var terrainBatchId = model && model.activeTerrainBatchId ? String(model.activeTerrainBatchId) : null;
  var frameIndex = null;
  if (terrainBatchId) {
    if (__terrainFirstFrameWindow && __terrainFirstFrameWindow.terrainBatchId === terrainBatchId && Number(__terrainFirstFrameWindow.remaining || 0) > 0) {
      frameIndex = Number(__terrainFirstFrameWindow.nextFrameIndex || 1);
    } else if (__lastObservedTerrainBatchIdForFrames !== terrainBatchId) {
      frameIndex = 1;
    }
  }
  return {
    terrainBatchId: terrainBatchId,
    frameIndexAfterTerrainApply: frameIndex
  };
}

try {
  if (typeof window !== 'undefined') {
    window.__MAIN_RENDER_DIAGNOSTICS__ = Object.assign({}, window.__MAIN_RENDER_DIAGNOSTICS__ || {}, {
      getLastStaticBoxCacheProfile: function () { return requireRenderDiagnosticsForRender().getLastStaticBoxCacheProfile(); }
    });
  }
} catch (_) {}


function buildColumnTops(boxList) {
  const tops = new Map();
  for (const b of boxList) {
    for (let x = b.x; x < b.x + b.w; x++) {
      for (let y = b.y; y < b.y + b.d; y++) {
        const key = `${x},${y}`;
        tops.set(key, Math.max(tops.get(key) ?? 0, b.z + b.h));
      }
    }
  }
  return tops;
}

function hitTopFace(sx, sy) {
  const p = { x: sx, y: sy };
  const visibleBoxes = boxes.filter(function (b) {
    var prefab = getPrefabById(b.prefabId);
    return prefabDrawsVoxels(prefab) && (!prefab || prefab.kind !== 'habbo_import');
  });
  const occ = buildOccupancy(visibleBoxes);
  let best = null;
  for (const cell of occ.values()) {
    if (occ.has(`${cell.x},${cell.y},${cell.z + 1}`)) continue; // 不是顶部
    const pts = cubePoints(cell.x, cell.y, cell.z, 1, 1, 1);
    const poly = [pts.p001, pts.p101, pts.p111, pts.p011];
    if (!pointInPoly(p, poly)) continue;
    const topZ = cell.z + 1;
    const score = topZ * 1000 + (cell.x + cell.y);
    if (!best || score > best.score) {
      best = { x: cell.x, y: cell.y, z: topZ, score };
    }
  }
  return best;
}

function drawFrontLines() {
  const tops = buildColumnTops(boxes);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,64,64,.95)';
  ctx.lineWidth = 2;
  for (const key of tops.keys()) {
    const [x, y] = key.split(',').map(Number);
    const a = iso(x, y + 1, 0);
    const b = iso(x + 1, y + 1, 0);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function buildSurfaceFaces(boxList, alpha = 1, includeHidden = false) {
  const occ = buildOccupancy(boxList);
  const faces = [];
  const e = 0.001;
  const prio = { bottom: 0, north: 1, west: 2, east: 3, south: 4, top: 5 };

  function makeFace(cell, dir, poly, fill, aabb, worldPts) {
    const depth = poly.reduce((s, p) => s + p.y, 0) / poly.length + prio[dir] * 0.0001;
    faces.push({
      id: `box-${cell.box.id}-${cell.x}-${cell.y}-${cell.z}-${dir}`,
      kind: 'box-face',
      boxId: cell.box.id,
      instanceId: cell.box.instanceId || null,
      dir,
      cell: { x: cell.x, y: cell.y, z: cell.z },
      poly,
      worldPts: Array.isArray(worldPts) ? worldPts.map(function (p) { return { x: p.x, y: p.y, z: p.z }; }) : [],
      aabb,
      screen: polyBounds(poly),
      fallbackDepth: depth,
      draw: () => {
        ctx.save();
        ctx.globalAlpha = alpha;
        drawPoly(poly, fill, 'rgba(0,0,0,.16)');
        ctx.restore();
      },
    });
  }

  for (const cell of occ.values()) {
    const { box, x, y, z } = cell;
    const pts = cubePoints(x, y, z, 1, 1, 1);
    const { p000,p100,p110,p010,p001,p101,p111,p011 } = pts;
    const fc = faceColors(box.base);

    const neighbors = {
      bottom: occ.has(`${x},${y},${z - 1}`),
      north:  occ.has(`${x},${y - 1},${z}`),
      south:  occ.has(`${x},${y + 1},${z}`),
      west:   occ.has(`${x - 1},${y},${z}`),
      east:   occ.has(`${x + 1},${y},${z}`),
      top:    occ.has(`${x},${y},${z + 1}`),
    };

    // 当前相机下真正可见的是：top + east + south
    if (!neighbors.top) {
      makeFace(cell, 'top', [p001,p101,p111,p011], xrayFaces ? 'rgba(255,255,255,.20)' : fc.top,
               makeAABB(x, y, z + 1, 1, 1, e), [p001,p101,p111,p011]);
    }
    if (!neighbors.east) {
      makeFace(cell, 'east', [p101,p111,p110,p100], xrayFaces ? 'rgba(255,255,255,.18)' : fc.left,
               makeAABB(x + 1, y, z, e, 1, 1), [p101,p111,p110,p100]);
    }
    if (!neighbors.south) {
      makeFace(cell, 'south', [p011,p111,p110,p010], xrayFaces ? 'rgba(255,255,255,.16)' : fc.right,
               makeAABB(x, y + 1, z, 1, e, 1), [p011,p111,p110,p010]);
    }

    if (includeHidden) {
      if (!neighbors.bottom) {
        makeFace(cell, 'bottom', [p000,p100,p110,p010], 'rgba(255,255,255,.08)',
                 makeAABB(x, y, z - e, 1, 1, e), [p000,p100,p110,p010]);
      }
      if (!neighbors.north) {
        makeFace(cell, 'north', [p001,p101,p100,p000], 'rgba(255,255,255,.10)',
                 makeAABB(x, y - e, z, 1, e, 1), [p001,p101,p100,p000]);
      }
      if (!neighbors.west) {
        makeFace(cell, 'west', [p001,p011,p010,p000], 'rgba(255,255,255,.10)',
                 makeAABB(x - e, y, z, e, 1, 1), [p001,p011,p010,p000]);
      }
    }
  }

  return faces;
}


function drawBox(box, alpha = 1) {
  const faces = buildSurfaceFaces([box], alpha, xrayFaces).sort((a, b) => a.fallbackDepth - b.fallbackDepth);
  for (const f of faces) f.draw();

  if (showDebug) {
    const p = iso(box.x + box.w, box.y + box.d, box.z + box.h);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }
}


var prefabSpriteImageCache = new Map();
var habboCompositeCache = new Map();

var habboSpriteDrawDebugOnce = new Set();

function getPrefabSpriteConfig(prefab, rotation) {
  if (!prefab) return null;
  var facingApi = getItemFacingCoreApi();
  var resolved = facingApi && typeof facingApi.resolveSpriteFacing === 'function'
    ? facingApi.resolveSpriteFacing(prefab, rotation)
    : { directionKey: rotKeyForSprite(rotation), mirrorX: false, strategy: 'single', availableKeys: [rotKeyForSprite(rotation)] };
  var raw = null;
  if (prefab.spriteDirections && prefab.spriteDirections[resolved.directionKey]) raw = prefab.spriteDirections[resolved.directionKey];
  else if (prefab.spriteDirections && prefab.spriteDirections['0']) raw = prefab.spriteDirections['0'];
  else raw = prefab.sprite || null;
  if (!raw) return null;
  return Object.assign({}, raw, {
    flipX: !!raw.flipX !== !!resolved.mirrorX,
    __resolvedDirectionKey: resolved.directionKey,
    __spriteStrategy: resolved.strategy,
    __availableDirectionKeys: resolved.availableKeys || []
  });
}

function getHabboLayerConfigList(prefab, rotation) {
  if (!prefab || !prefab.habboLayerDirections) return null;
  var facingApi = getItemFacingCoreApi();
  var resolved = facingApi && typeof facingApi.resolveSpriteFacing === 'function'
    ? facingApi.resolveSpriteFacing(prefab, rotation)
    : { directionKey: rotKeyForSprite(rotation), mirrorX: false, strategy: 'single', availableKeys: [rotKeyForSprite(rotation)] };
  var rawList = prefab.habboLayerDirections[resolved.directionKey] || prefab.habboLayerDirections['0'] || null;
  if (!rawList) return null;
  return rawList.map(function (layer) {
    return Object.assign({}, layer, {
      flipX: !!layer.flipX !== !!resolved.mirrorX,
      __resolvedDirectionKey: resolved.directionKey,
      __spriteStrategy: resolved.strategy
    });
  });
}

function getCachedImageFromDataUrl(key, dataUrl) {
  if (!dataUrl) return null;
  var cached = prefabSpriteImageCache.get(key);
  if (cached) return cached;
  var img = new Image();
  img.src = dataUrl;
  prefabSpriteImageCache.set(key, img);
  return img;
}

function getPrefabSpriteImage(prefab, rotation) {
  var spriteCfg = getPrefabSpriteConfig(prefab, rotation);
  if (!spriteCfg || !spriteCfg.image) return null;
  var key = prefab.id + '|' + rotKeyForSprite(rotation) + '|' + spriteCfg.image + '|' + (!!spriteCfg.flipX);
  var cached = prefabSpriteImageCache.get(key);
  if (cached) return cached;
  var img = new Image();
  img.onload = function(){ detailLog('prefab-sprite: loaded ' + prefab.id + ' ' + img.naturalWidth + 'x' + img.naturalHeight); };
  img.onerror = function(){ detailLog('prefab-sprite:error ' + prefab.id + ' ' + spriteCfg.image); };
  img.src = spriteCfg.image;
  prefabSpriteImageCache.set(key, img);
  return img;
}

function getHabboLayerDrawable(layer, cacheKey) {
  if (!layer) return null;
  if (layer.canvas && (layer.canvas.width || layer.canvas.height)) return layer.canvas;
  if (layer.image) return getCachedImageFromDataUrl(cacheKey || ('habbo-layer|' + String(layer.name || 'unnamed')), layer.image);
  return null;
}


function getHabboCanvasBlendMode(blend) {
  var mode = String(blend || '').toUpperCase();
  if (mode === 'ADD') return 'lighter';
  // Habbo XML 里的 COPY 不是 HTML canvas 那种“清空整张目标画布后再复制”的语义。
  // 直接映射成 canvas 'copy' 会把先前已经画好的对象层整块抹掉，造成蓝屏/蓝块假象。
  // 这里退回到 source-over，保持旧版本更接近用户预期的叠加效果。
  return 'source-over';
}

function habboCompositeCacheKey(prefab, rotation) {
  var sig = '';
  if (prefab && prefab.habboLayerDirections) {
    var keys = Object.keys(prefab.habboLayerDirections).sort();
    sig = keys.map(function (k) {
      var arr = prefab.habboLayerDirections[k] || [];
      var first = arr[0] && arr[0].name ? arr[0].name : '';
      return k + ':' + arr.length + ':' + first;
    }).join('|');
  }
  return String(prefab && prefab.id || 'unknown') + '|habbo-composite|' + rotKeyForSprite(rotation) + '|tileW=' + String(settings && settings.tileW || 64) + '|tileH=' + String(settings && settings.tileH || 32) + '|sig=' + sig;
}

function getHabboPlacementCoreApiForRender() {
  try {
    if (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.habboPlacementCore) return window.App.domain.habboPlacementCore;
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.__HABBO_PLACEMENT_CORE__) return window.__HABBO_PLACEMENT_CORE__;
  } catch (_) {}
  return null;
}

function requireHabboPlacementCoreForRender() {
  var api = getHabboPlacementCoreApiForRender();
  if (!api) throw new Error('Missing Habbo placement core: src/core/domain/habbo-placement-core.js must load before src/presentation/render/render.js');
  return api;
}

function getHabboTileMetricsForRender() {
  return {
    tileW: Number(settings && settings.tileW || 64),
    tileH: Number(settings && settings.tileH || 32)
  };
}

function getHabboPlacementShift(prefab, rotation) {
  return requireHabboPlacementCoreForRender().getHabboPlacementShift(prefab, rotation, getHabboTileMetricsForRender());
}

function pixelShiftToCellShift(shift) {
  return requireHabboPlacementCoreForRender().pixelShiftToCellShift(shift, getHabboTileMetricsForRender());
}

function cellShiftToPixelShift(cellShift) {
  return requireHabboPlacementCoreForRender().cellShiftToPixelShift(cellShift, getHabboTileMetricsForRender());
}

function getHabboPlacementDecomposition(prefab, rotation) {
  return requireHabboPlacementCoreForRender().getHabboPlacementDecomposition(prefab, rotation, getHabboTileMetricsForRender());
}

function getHabboPlacementCellShift(prefab, rotation) {
  return requireHabboPlacementCoreForRender().getHabboPlacementCellShift(prefab, rotation, getHabboTileMetricsForRender());
}

function getHabboRoomOrigin(prefab, origin, anchor, rotation) {
  return requireHabboPlacementCoreForRender().getHabboRoomOrigin(prefab, origin, anchor, rotation, getHabboTileMetricsForRender(), iso, { floorBaselineOffset: 20 });
}


function getHabboProxyVisualShift(prefab, rotation) {
  return requireHabboPlacementCoreForRender().getHabboProxyVisualShift(prefab, rotation, getHabboTileMetricsForRender());
}

function withScreenTranslate(shift, drawFn) {
  var sx = Math.round(shift && shift.x || 0);
  var sy = Math.round(shift && shift.y || 0);
  if (!sx && !sy) {
    drawFn();
    return;
  }
  ctx.save();
  ctx.translate(sx, sy);
  try {
    drawFn();
  } finally {
    ctx.restore();
  }
}

function getHabboInstanceVisualShift(instance, prefab) {
  return requireHabboPlacementCoreForRender().getHabboInstanceVisualShift(instance, prefab, getHabboTileMetricsForRender());
}

function getHabboLayerLocalBox(layer, totalScale, srcW, srcH, prefab) {
  return requireHabboPlacementCoreForRender().getHabboLayerLocalBox(layer, totalScale, srcW, srcH, prefab);
}

function buildHabboComposite(prefab, rotation) {
  if (!prefab || prefab.kind !== 'habbo_import') return null;
  var layers = getHabboLayerConfigList(prefab, rotation);
  if (!layers || !layers.length) return null;
  var sortedLayers = layers.slice().sort(function (a, b) {
    if ((a.zOrderHint || 0) !== (b.zOrderHint || 0)) return (a.zOrderHint || 0) - (b.zOrderHint || 0);
    var ak = a.kind === 'shadow' ? 0 : 1;
    var bk = b.kind === 'shadow' ? 0 : 1;
    if (ak !== bk) return ak - bk;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  var prepared = [];
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var li = 0; li < sortedLayers.length; li++) {
    var layer = sortedLayers[li];
    var cacheKey = prefab.id + '|layer|' + rotKeyForSprite(rotation) + '|' + String(layer.name || li);
    var img = getHabboLayerDrawable(layer, cacheKey);
    if (!img) continue;
    var srcW = img.naturalWidth || img.videoWidth || img.width || 0;
    var srcH = img.naturalHeight || img.videoHeight || img.height || 0;
    var needsReady = typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement;
    if ((needsReady && !img.complete) || !srcW || !srcH) {
      pushHabboDebug('habbo-composite:skip-layer', { prefab: prefab.id, rotation: rotation, layer: layer ? layer.name || li : li, reason: 'image-not-ready', natural: { w: srcW || 0, h: srcH || 0 } });
      continue;
    }
    var visualSize = Math.max(1, Number(layer.visualSize) || 64);
    var totalScale = settings.tileW / visualSize;
    var drawW = Math.max(1, Math.round(srcW * totalScale));
    var drawH = Math.max(1, Math.round(srcH * totalScale));
    var layerBox = getHabboLayerLocalBox(layer, totalScale, srcW, srcH, prefab);
    var offsetX = Math.round((layer.offsetPx && layer.offsetPx.x || 0) * totalScale);
    var offsetY = Math.round((layer.offsetPx && layer.offsetPx.y || 0) * totalScale);
    var drawXMin = layerBox.drawX;
    var y = layerBox.drawY;
    var drawXMax = layerBox.drawXMax;
    minX = Math.min(minX, drawXMin);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, drawXMax);
    maxY = Math.max(maxY, y + drawH);
    prepared.push({
      layer: layer,
      img: img,
      drawX: drawXMin,
      drawY: y,
      drawXMax: drawXMax,
      drawW: drawW,
      drawH: drawH,
      alpha: Math.max(0, Math.min(1, Number(layer.alpha == null ? 1 : layer.alpha))),
      blend: String(layer.blend || '').toUpperCase(),
      visualSize: visualSize,
      offsetX: offsetX,
      offsetY: offsetY,
      regX: layerBox.regX,
      regY: layerBox.regY,
      propX: layerBox.propX,
      propY: layerBox.propY,
      offsetZ: layer.offsetZ || 0,
      flipX: !!layer.flipX,
    });
  }
  if (!prepared.length || !Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  var width = Math.max(1, Math.ceil(maxX - minX));
  var height = Math.max(1, Math.ceil(maxY - minY));
  if (width > 4096 || height > 4096 || width * height > 4194304) {
    pushHabboDebug('habbo-composite:oversize', { prefab: prefab.id, rotation: rotation, width: width, height: height, area: width * height });
    return null;
  }
  var localCanvas = document.createElement('canvas');
  localCanvas.width = width;
  localCanvas.height = height;
  var localCtx = localCanvas.getContext('2d');
  localCtx.imageSmoothingEnabled = false;
  var layerSnapshots = [];
  for (var pi = 0; pi < prepared.length; pi++) {
    var item = prepared[pi];
    var prevAlpha = localCtx.globalAlpha;
    var prevBlend = localCtx.globalCompositeOperation;
    localCtx.globalAlpha = item.alpha;
    localCtx.globalCompositeOperation = getHabboCanvasBlendMode(item.blend);
    if (item.flipX) {
      localCtx.save();
      localCtx.translate(item.drawXMax - minX, item.drawY - minY);
      localCtx.scale(-1, 1);
      localCtx.drawImage(item.img, 0, 0, item.drawW, item.drawH);
      localCtx.restore();
    } else {
      localCtx.drawImage(item.img, item.drawX - minX, item.drawY - minY, item.drawW, item.drawH);
    }
    localCtx.globalCompositeOperation = prevBlend;
    localCtx.globalAlpha = prevAlpha;
    layerSnapshots.push({
      name: item.layer.name || ('L' + pi),
      kind: item.layer.kind || 'body',
      layerIndex: item.layer.layerIndex || 0,
      offsetX: item.offsetX,
      offsetY: item.offsetY,
      offsetZ: item.offsetZ,
      drawX: item.drawX,
      drawY: item.drawY,
      drawW: item.drawW,
      drawH: item.drawH,
      drawXMax: item.drawXMax,
      flipX: item.flipX,
      alpha: item.alpha,
      blend: item.blend || 'NORMAL',
      zOrderHint: item.layer.zOrderHint || 0,
      visualSize: item.visualSize,
      source: item.layer.source || ''
    });
  }
  pushHabboDebug('habbo-composite:built', { prefab: prefab.id, rotation: rotation, bbox: { x: minX, y: minY, w: width, h: height }, layers: layerSnapshots.map(function (l) { return { name: l.name, kind: l.kind, drawX: l.drawX, drawY: l.drawY, drawW: l.drawW, drawH: l.drawH, flipX: l.flipX, alpha: l.alpha, blend: l.blend, zOrderHint: l.zOrderHint }; }) });
  detailLog('callsite src/presentation/render/render.js::buildHabboComposite prefab=' + String(prefab.id || 'unknown') + ' rotation=' + String(rotation || 0) + ' bbox=(' + [minX, minY, width, height].join(',') + ') layers=' + String(layerSnapshots.length));
  return { canvas: localCanvas, offsetPx: { x: minX, y: minY }, width: width, height: height, layers: layerSnapshots };
}

function getHabboComposite(prefab, rotation) {
  var key = habboCompositeCacheKey(prefab, rotation);
  var cached = habboCompositeCache.get(key);
  if (cached) return cached;
  var built = buildHabboComposite(prefab, rotation);
  if (built) habboCompositeCache.set(key, built);
  return built;
}

function normalizeRenderUpdateModeForRender(mode, fallback) {
  if (mode === 'dynamic') return 'dynamic';
  if (mode === 'static') return 'static';
  return fallback === 'dynamic' ? 'dynamic' : 'static';
}

function getPrefabRenderUpdateModeForRender(prefab, instanceOrOverride) {
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
  return getPrefabRenderUpdateModeForRender(prefab, inst) === 'dynamic';
}

function buildInstanceRenderUpdateModeIndex(sourceInstances) {
  var out = new Map();
  var list = Array.isArray(sourceInstances) ? sourceInstances : [];
  for (var i = 0; i < list.length; i++) {
    var inst = list[i];
    if (!inst || !inst.instanceId) continue;
    var prefab = getPrefabById(inst.prefabId);
    out.set(String(inst.instanceId), getPrefabRenderUpdateModeForRender(prefab, inst));
  }
  return out;
}

function getDynamicInstanceSplitForRender(sourceInstances) {
  var list = Array.isArray(sourceInstances) ? sourceInstances : [];
  if (__renderDynamicInstanceCache.source === list && __renderDynamicInstanceCache.length === list.length) {
    return __renderDynamicInstanceCache;
  }
  var dynamicInstances = [];
  var staticInstances = [];
  for (var i = 0; i < list.length; i++) {
    var inst = list[i];
    if (!inst) continue;
    var prefab = getPrefabById(inst.prefabId);
    if (isInstanceDynamicRenderableForFrame(inst, prefab)) dynamicInstances.push(inst);
    else staticInstances.push(inst);
  }
  __renderDynamicInstanceCache = {
    source: list,
    length: list.length,
    dynamicInstances: dynamicInstances,
    staticInstances: staticInstances
  };
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

function prefabDrawsVoxels(prefab) {
  return !prefab || (prefab.renderMode || 'voxel') !== 'sprite_proxy';
}

function prefabHasSprite(prefab) {
  if (!prefab || (prefab.renderMode || 'voxel') === 'voxel') return false;
  if (prefab.kind === 'habbo_import' && prefab.habboLayerDirections) {
    var layerKeys = Object.keys(prefab.habboLayerDirections);
    for (var li = 0; li < layerKeys.length; li++) {
      var rawLayers = prefab.habboLayerDirections[layerKeys[li]];
      if (Array.isArray(rawLayers) && rawLayers.some(function (layer) { return !!(layer && (layer.image || layer.canvas)); })) return true;
    }
  }
  if (prefab.sprite && prefab.sprite.image) return true;
  if (prefab.spriteDirections) {
    var keys = Object.keys(prefab.spriteDirections);
    for (var i = 0; i < keys.length; i++) {
      var cfg = prefab.spriteDirections[keys[i]];
      if (cfg && cfg.image) return true;
    }
  }
  return false;
}

function rotKeyForSprite(rotation) {
  return String((((parseInt(rotation || 0, 10) % 4) + 4) % 4));
}

function drawInstanceProxyBoxes(instance, alpha) {
  var prefab = getPrefabById(instance.prefabId);
  var shift = getHabboInstanceVisualShift(instance, prefab);
  var instanceBoxes = boxes.filter(function (b) { return b.instanceId === instance.instanceId; });
  withScreenTranslate(shift, function () {
    for (var i = 0; i < instanceBoxes.length; i++) drawBox(instanceBoxes[i], alpha == null ? 0.82 : alpha);
  });
}

function drawPrefabSpriteAt(prefab, origin, alpha) {
  if (prefab && prefab.kind === 'habbo_import') {
    detailLog('callsite src/presentation/render/render.js::drawPrefabSpriteAt prefab=' + String(prefab.id || 'unknown') +
      ' hasLayerDirs=' + Object.keys(prefab.habboLayerDirections || {}).join(',') +
      ' hasSpriteDirs=' + Object.keys(prefab.spriteDirections || {}).join(',') +
      ' renderMode=' + String(prefab.renderMode || 'unknown'));
  }
  if (!prefabHasSprite(prefab)) return false;
  var rotation = origin && origin.rotation != null ? origin.rotation : 0;
  var anchor = prefab.anchor || { x: 0, y: 0, z: 0 };
  if (prefab.kind === 'habbo_import' && prefab.habboLayerDirections) {
    var layers = getHabboLayerConfigList(prefab, rotation);
    if (!layers || !layers.length) {
      detailLog('callsite src/presentation/render/render.js::drawPrefabSpriteAt layered-miss prefab=' + String(prefab.id || 'unknown') + ' rotation=' + String(rotation) + ' keys=' + Object.keys(prefab.habboLayerDirections || {}).join(','));
      return false;
    }
    var roomOrigin = getHabboRoomOrigin(prefab, origin, anchor, rotation);
    var dbgKey = prefab.id + '|layers|' + String(rotation || 0) + '|' + String(origin.x || 0) + ',' + String(origin.y || 0) + ',' + String(origin.z || 0);
    var composite = getHabboComposite(prefab, rotation);
    if (composite && composite.canvas && composite.width > 0 && composite.height > 0) {
      var compX = Math.round(roomOrigin.x + (composite.offsetPx && composite.offsetPx.x || 0));
      var compY = Math.round(roomOrigin.y + (composite.offsetPx && composite.offsetPx.y || 0));
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(composite.canvas, compX, compY, composite.width, composite.height);
      ctx.restore();
      prefab.__habboLastDraw = { prefabId: prefab.id, origin: cloneJsonSafe(origin), roomOrigin: { x: Math.round(roomOrigin.x), y: Math.round(roomOrigin.y) }, anchor: cloneJsonSafe(anchor), rotation: rotation, composite: { x: compX, y: compY, width: composite.width, height: composite.height, offsetPx: cloneJsonSafe(composite.offsetPx), layers: composite.layers || [] } };
      detailLog('habbo-draw: prefab=' + prefab.id +
        ' origin=(' + [origin.x || 0, origin.y || 0, origin.z || 0].join(',') + ')' +
        ' roomOrigin=(' + Math.round(roomOrigin.x) + ',' + Math.round(roomOrigin.y) + ')' +
        ' anchor=(' + [(anchor.x || 0), (anchor.y || 0), (anchor.z || 0)].join(',') + ')' +
        ' composite=(' + [compX, compY, composite.width, composite.height].join(',') + ')' +
        ' layers=' + String((composite.layers || []).length));
      return true;
    }
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.imageSmoothingEnabled = prefab.kind === 'habbo_import' ? false : true;
    var debugParts = [];
    var drewAny = false;
    var sortedLayers = layers.slice().sort(function (a, b) {
      if ((a.zOrderHint || 0) !== (b.zOrderHint || 0)) return (a.zOrderHint || 0) - (b.zOrderHint || 0);
      var ak = a.kind === 'shadow' ? 0 : 1;
      var bk = b.kind === 'shadow' ? 0 : 1;
      if (ak !== bk) return ak - bk;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    var layerSnapshots = [];
    for (var li = 0; li < sortedLayers.length; li++) {
      var layer = sortedLayers[li];
      var cacheKey = prefab.id + '|layer|' + rotKeyForSprite(rotation) + '|' + String(layer.name || li);
      var img = getHabboLayerDrawable(layer, cacheKey);
      if (!img) {
        pushHabboDebug('drawLayer:skip', { prefab: prefab.id, reason: 'no-image', rotation: rotation, layer: layer ? layer.name || li : li, origin: cloneJsonSafe(origin) });
        continue;
      }
      var srcW = img.naturalWidth || img.videoWidth || img.width || 0;
      var srcH = img.naturalHeight || img.videoHeight || img.height || 0;
      var needsReady = typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement;
      if ((needsReady && !img.complete) || !srcW || !srcH) {
        pushHabboDebug('drawLayer:skip', { prefab: prefab.id, reason: 'image-not-ready', rotation: rotation, layer: layer ? layer.name || li : li, cacheKey: cacheKey, natural: { w: srcW || 0, h: srcH || 0 }, origin: cloneJsonSafe(origin) });
        continue;
      }
      var visualSize = Math.max(1, Number(layer.visualSize) || 64);
      var habboPixelScale = settings.tileW / visualSize;
      var totalScale = habboPixelScale;
      var drawW = Math.max(1, Math.round(srcW * totalScale));
      var drawH = Math.max(1, Math.round(srcH * totalScale));
      var layerBox = getHabboLayerLocalBox(layer, totalScale, srcW, srcH, prefab);
      var offsetX = Math.round((layer.offsetPx && layer.offsetPx.x || 0) * totalScale);
      var offsetY = Math.round((layer.offsetPx && layer.offsetPx.y || 0) * totalScale);
      var y = Math.round(roomOrigin.y + layerBox.drawY);
      var drawXMin = Math.round(roomOrigin.x + layerBox.drawX);
      var drawXMax = Math.round(roomOrigin.x + layerBox.drawXMax);
      var prevAlpha = ctx.globalAlpha;
      var layerAlpha = Math.max(0, Math.min(1, Number(layer.alpha == null ? 1 : layer.alpha)));
      ctx.globalAlpha = prevAlpha * layerAlpha;
      var prevBlend = ctx.globalCompositeOperation;
      var blend = String(layer.blend || '').toUpperCase();
      ctx.globalCompositeOperation = getHabboCanvasBlendMode(blend);
      if (layer.flipX) {
        ctx.save();
        ctx.translate(drawXMax, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, drawW, drawH);
        ctx.restore();
      } else {
        ctx.drawImage(img, drawXMin, y, drawW, drawH);
      }
      ctx.globalCompositeOperation = prevBlend;
      ctx.globalAlpha = prevAlpha;
      drewAny = true;
      var snap = { name: layer.name || ('L' + li), kind: layer.kind || 'body', layerIndex: layer.layerIndex || 0, offsetX: offsetX, offsetY: offsetY, offsetZ: layer.offsetZ || 0, drawX: drawXMin, drawY: y, drawW: drawW, drawH: drawH, drawXMax: drawXMax, flipX: !!layer.flipX, alpha: layerAlpha, blend: blend || 'NORMAL', zOrderHint: layer.zOrderHint || 0, visualSize: visualSize, source: layer.source || '' };
      layerSnapshots.push(snap);
      pushHabboDebug('drawLayer:ok', { prefab: prefab.id, origin: cloneJsonSafe(origin), roomOrigin: { x: Math.round(roomOrigin.x), y: Math.round(roomOrigin.y) }, anchor: cloneJsonSafe(anchor), layer: snap });
      debugParts.push((layer.kind || 'body') + ':' + (layer.name || ('L' + li)) + '#'+String(layer.layerIndex || 0) + '@(' + offsetX + ',' + offsetY + ',' + (layer.offsetZ || 0) + ')' + ' ' + drawW + 'x' + drawH + (layer.flipX ? ' flip' : '') + ' a=' + String(layerAlpha) + (blend ? ' blend=' + blend : ''));
    }
    prefab.__habboLastDraw = { prefabId: prefab.id, origin: cloneJsonSafe(origin), roomOrigin: { x: Math.round(roomOrigin.x), y: Math.round(roomOrigin.y) }, anchor: cloneJsonSafe(anchor), rotation: rotation, layers: layerSnapshots };
    ctx.restore();
    if (drewAny) {
      detailLog('habbo-draw: prefab=' + prefab.id +
        ' origin=(' + [origin.x || 0, origin.y || 0, origin.z || 0].join(',') + ')' +
        ' roomOrigin=(' + Math.round(roomOrigin.x) + ',' + Math.round(roomOrigin.y) + ')' +
        ' anchor=(' + [(anchor.x || 0), (anchor.y || 0), (anchor.z || 0)].join(',') + ')' +
        ' layered=' + debugParts.join(' | '));
    } else {
      detailLog('habbo-draw: prefab=' + prefab.id + ' origin=(' + [origin.x || 0, origin.y || 0, origin.z || 0].join(',') + ') layered=NONE');
    }
    return drewAny;
  }
  var spriteCfg = getPrefabSpriteConfig(prefab, rotation);
  var img = getPrefabSpriteImage(prefab, rotation);
  if (!spriteCfg || !img || !img.complete || !img.naturalWidth || !img.naturalHeight) return false;
  var spritePixelScale = settings.tileW / 64;
  if (prefab.kind === 'habbo_import') {
    var visualSize = Math.max(1, Number(spriteCfg.visualSize) || 64);
    spritePixelScale = settings.tileW / visualSize;
  }
  var totalScale = Math.max(0.05, Number(spriteCfg.scale) || 1) * spritePixelScale;
  var drawW = Math.max(1, Math.round(img.naturalWidth * totalScale));
  var drawH = Math.max(1, Math.round(img.naturalHeight * totalScale));
  var offsetX = Math.round((spriteCfg.offsetPx && spriteCfg.offsetPx.x || 0) * spritePixelScale);
  var offsetY = Math.round((spriteCfg.offsetPx && spriteCfg.offsetPx.y || 0) * spritePixelScale);
  var x = 0;
  var y = 0;
  if (String(spriteCfg.anchorMode || '') === 'scuti-floor-origin') {
    var roomOrigin2 = getHabboRoomOrigin(prefab, origin, anchor, rotation);
    x = Math.round(roomOrigin2.x + offsetX);
    y = Math.round(roomOrigin2.y + offsetY);
  } else {
    var foot = iso((origin.x || 0) + (anchor.x || 0), (origin.y || 0) + (anchor.y || 0), (origin.z || 0) + (anchor.z || 0));
    x = Math.round(foot.x - drawW / 2 + offsetX);
    y = Math.round(foot.y - drawH + offsetY);
  }
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.imageSmoothingEnabled = prefab.kind === 'habbo_import' ? false : true;
  var flatDrawX = x;
  if (spriteCfg.flipX) {
    flatDrawX = x - drawW;
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, drawW, drawH);
  } else {
    ctx.drawImage(img, x, y, drawW, drawH);
  }
  ctx.restore();
  if (prefab.kind === 'habbo_import') detailLog('habbo-draw-flat: prefab=' + prefab.id + ' origin=(' + [origin.x || 0, origin.y || 0, origin.z || 0].join(',') + ') draw=(' + flatDrawX + ',' + y + ') size=' + drawW + 'x' + drawH + ' offset=(' + offsetX + ',' + offsetY + ') anchorMode=' + String(spriteCfg.anchorMode || 'default') + ' flip=' + (!!spriteCfg.flipX));
  return true;
}

function drawPrefabSpriteInstance(instance, alpha) {
  var prefab = getPrefabById(instance.prefabId);
  return drawPrefabSpriteAt(prefab, instance, alpha);
}

function getSpriteDepthSplitCandidate(instance, prefab, viewRotation) {
  if (!instance || !prefab || !prefabHasSprite(prefab)) return null;
  if (prefab.kind === 'habbo_import' && prefab.habboLayerDirections) return null;
  var spriteCfg = getPrefabSpriteConfig(prefab, instance && instance.rotation != null ? instance.rotation : 0);
  var img = getPrefabSpriteImage(prefab, instance && instance.rotation != null ? instance.rotation : 0);
  if (!spriteCfg || !img || !img.complete || !img.naturalWidth || !img.naturalHeight) return null;
  if (spriteCfg.flipX) return null;
  var splitMode = String(spriteCfg.depthSplitMode || prefab.depthSplitMode || 'auto-small-footprint');
  if (splitMode === 'off' || splitMode === 'disabled' || splitMode === 'none') return null;
  var instBoxes = boxes.filter(function (b) { return b && b.instanceId === instance.instanceId; });
  if (!instBoxes.length) return null;
  var domainCore = getDomainSceneCoreApi();
  if (!domainCore || typeof domainCore.buildTileAlignedSpriteRenderParts !== 'function') return null;
  var maxParts = Math.max(1, Number(spriteCfg.depthSplitMaxParts || prefab.depthSplitMaxParts || 4) || 4);
  var result = domainCore.buildTileAlignedSpriteRenderParts({
    cells: instBoxes.map(function (b) { return { x: b.x, y: b.y, z: b.z, h: b.h || 1 }; }),
    maxParts: maxParts,
    viewRotation: normalizeMainEditorViewRotationValue(viewRotation)
  });
  if (!result || result.split !== true || !Array.isArray(result.parts) || result.parts.length <= 1) return null;
  return result;
}

function drawPrefabSpritePartInstance(instance, prefab, part, alpha) {
  if (!instance || !prefab || !part) return false;
  if (prefab.kind === 'habbo_import' && prefab.habboLayerDirections) return false;
  var rotation = instance && instance.rotation != null ? instance.rotation : 0;
  var spriteCfg = getPrefabSpriteConfig(prefab, rotation);
  var img = getPrefabSpriteImage(prefab, rotation);
  if (!spriteCfg || !img || !img.complete || !img.naturalWidth || !img.naturalHeight) return false;
  if (spriteCfg.flipX) return drawPrefabSpriteAt(prefab, instance, alpha);
  var anchor = prefab.anchor || { x: 0, y: 0, z: 0 };
  var spritePixelScale = settings.tileW / 64;
  if (prefab.kind === 'habbo_import') {
    var visualSize = Math.max(1, Number(spriteCfg.visualSize) || 64);
    spritePixelScale = settings.tileW / visualSize;
  }
  var totalScale = Math.max(0.05, Number(spriteCfg.scale) || 1) * spritePixelScale;
  var drawW = Math.max(1, Math.round(img.naturalWidth * totalScale));
  var drawH = Math.max(1, Math.round(img.naturalHeight * totalScale));
  var offsetX = Math.round((spriteCfg.offsetPx && spriteCfg.offsetPx.x || 0) * spritePixelScale);
  var offsetY = Math.round((spriteCfg.offsetPx && spriteCfg.offsetPx.y || 0) * spritePixelScale);
  var x = 0;
  var y = 0;
  if (String(spriteCfg.anchorMode || '') === 'scuti-floor-origin') {
    var roomOrigin2 = getHabboRoomOrigin(prefab, instance, anchor, rotation);
    x = Math.round(roomOrigin2.x + offsetX);
    y = Math.round(roomOrigin2.y + offsetY);
  } else {
    var foot = iso((instance.x || 0) + (anchor.x || 0), (instance.y || 0) + (anchor.y || 0), (instance.z || 0) + (anchor.z || 0));
    x = Math.round(foot.x - drawW / 2 + offsetX);
    y = Math.round(foot.y - drawH + offsetY);
  }
  var count = Math.max(1, Math.round(Number(part.sourceCount) || 1));
  var index = Math.max(0, Math.min(count - 1, Math.round(Number(part.sourceIndex) || 0)));
  var srcX0 = Math.floor((img.naturalWidth * index) / count);
  var srcX1 = Math.floor((img.naturalWidth * (index + 1)) / count);
  var dstX0 = x + Math.floor((drawW * index) / count);
  var dstX1 = x + Math.floor((drawW * (index + 1)) / count);
  var srcW = Math.max(1, srcX1 - srcX0);
  var dstW = Math.max(1, dstX1 - dstX0);
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.imageSmoothingEnabled = prefab.kind === 'habbo_import' ? false : true;
  ctx.drawImage(img, srcX0, 0, srcW, img.naturalHeight, dstX0, y, dstW, drawH);
  ctx.restore();
  return true;
}

function drawHabboDebugOverlay() {
  if (!ui.showHabboDebugOverlay || !ui.showHabboDebugOverlay.checked || typeof prototypes === 'undefined') return;
  ctx.save();
  ctx.font = '11px monospace';
  var count = 0;
  for (var i = 0; i < prototypes.length; i++) {
    var prefab = prototypes[i];
    if (!prefab || prefab.kind !== 'habbo_import' || !prefab.__habboLastDraw) continue;
    var dbg = prefab.__habboLastDraw;
    count++;
    ctx.strokeStyle = 'rgba(255,0,255,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dbg.roomOrigin.x - 6, dbg.roomOrigin.y); ctx.lineTo(dbg.roomOrigin.x + 6, dbg.roomOrigin.y);
    ctx.moveTo(dbg.roomOrigin.x, dbg.roomOrigin.y - 6); ctx.lineTo(dbg.roomOrigin.x, dbg.roomOrigin.y + 6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(prefab.id + ' origin=(' + [dbg.origin.x||0, dbg.origin.y||0, dbg.origin.z||0].join(',') + ')', dbg.roomOrigin.x + 8, dbg.roomOrigin.y - 8);
    for (var li = 0; li < (dbg.layers || []).length; li++) {
      var layer = dbg.layers[li];
      ctx.strokeStyle = layer.kind === 'shadow' ? 'rgba(80,160,255,0.95)' : 'rgba(255,200,0,0.95)';
      ctx.strokeRect(layer.drawX, layer.drawY, layer.drawW, layer.drawH);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText(layer.kind + ':' + layer.name + (layer.flipX ? ':flip' : ''), layer.drawX + 2, layer.drawY + 12);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText('HabboDebug overlay count=' + count, 18, VIEW_H - 18);
  ctx.restore();
}


function getInstanceProxyBounds(instance) {
  var domainCore = getDomainSceneCoreApi();
  if (domainCore && typeof domainCore.getInstanceBoundsFromBoxes === 'function') {
    return domainCore.getInstanceBoundsFromBoxes(boxes, instance && instance.instanceId ? instance.instanceId : null);
  }
  var instanceBoxes = boxes.filter(function (b) { return b.instanceId === instance.instanceId; });
  if (!instanceBoxes.length) return null;
  var minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (var i = 0; i < instanceBoxes.length; i++) {
    var b = instanceBoxes[i];
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    minZ = Math.min(minZ, b.z);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.d);
    maxZ = Math.max(maxZ, b.z + b.h);
  }
  return { minX: minX, minY: minY, minZ: minZ, maxX: maxX, maxY: maxY, maxZ: maxZ };
}

function lineYAtX(a, b, x) {
  var dx = b.x - a.x;
  if (Math.abs(dx) < EPS) return (a.y + b.y) / 2;
  var t = (x - a.x) / dx;
  return a.y + (b.y - a.y) * t;
}

function classifyPlayerAgainstProxyBox(bounds) {
  var domainCore = getDomainSceneCoreApi();
  if (domainCore && typeof domainCore.computeProjectedPlayerSpriteOcclusion === 'function') {
    if (!bounds) return 'none';
    return domainCore.computeProjectedPlayerSpriteOcclusion({
      bounds: bounds,
      playerFoot: iso(player.x, player.y, 0),
      left: iso(bounds.minX, bounds.maxY, 0),
      tip: iso(bounds.maxX, bounds.maxY, 0),
      right: iso(bounds.maxX, bounds.minY, 0),
      tileW: settings.tileW,
      tileH: settings.tileH,
      playerProxyW: settings.playerProxyW,
      playerProxyD: settings.playerProxyD
    });
  }
  if (!bounds) return 'none';
  var foot = iso(player.x, player.y, 0);
  var left = iso(bounds.minX, bounds.maxY, 0);
  var tip = iso(bounds.maxX, bounds.maxY, 0);
  var right = iso(bounds.maxX, bounds.minY, 0);
  var playerMarginX = Math.max(settings.tileW * 0.18, (settings.playerProxyW + settings.playerProxyD) * settings.tileW * 0.12);
  if (foot.x < left.x - playerMarginX || foot.x > right.x + playerMarginX) return 'none';
  var boundaryY = foot.x <= tip.x ? lineYAtX(left, tip, foot.x) : lineYAtX(tip, right, foot.x);
  var depthMargin = Math.max(4, settings.tileH * 0.18);
  if (foot.y < boundaryY - depthMargin) return 'occlude';
  if (foot.y > boundaryY + depthMargin) return 'in_front';
  return 'none';
}

function getSpriteProxySortMode(prefab) {
  var mode = prefab && prefab.sprite && prefab.sprite.sortMode;
  return String(mode || 'box_occlusion');
}

function computeSpriteRenderableSort(instance, prefab) {
  var domainCore = getDomainSceneCoreApi();
  var occlusion = 'none';
  var viewRotation = normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation);
  if (SHOW_PLAYER && prefabHasSprite(prefab) && getSpriteProxySortMode(prefab) === 'box_occlusion') {
    occlusion = classifyPlayerAgainstProxyBox(getInstanceProxyBounds(instance));
  }
  if (domainCore && typeof domainCore.computeSpriteRenderableSort === 'function') {
    return domainCore.computeSpriteRenderableSort({
      instance: instance,
      prefab: prefab,
      x: instance && instance.x,
      y: instance && instance.y,
      z: instance && instance.z,
      h: prefab && prefab.h,
      occlusion: occlusion,
      showPlayer: SHOW_PLAYER,
      playerLine: player.x + player.y + 0.001,
      sortMode: getSpriteProxySortMode(prefab),
      viewRotation: viewRotation
    });
  }
  var facingApi = getItemFacingCoreApi();
  var sortBase = facingApi && typeof facingApi.computeSortBase === 'function'
    ? facingApi.computeSortBase(prefab, instance && instance.rotation != null ? instance.rotation : 0, instance)
    : null;
  var anchor = sortBase && sortBase.rotatedAnchor ? sortBase.rotatedAnchor : { x: 0, y: 0, z: 0 };
  var sortMeta = computeViewAwareSortMeta({
    x: (instance && instance.x || 0) + (anchor.x || 0),
    y: (instance && instance.y || 0) + (anchor.y || 0),
    z: (instance && instance.z || 0) + (anchor.z || 0)
  }, prefab && prefab.h, viewRotation);
  return { sortKey: Number(sortMeta.sortKey || 0) + 0.0005, tie: Number(sortMeta.tie || 0) + 300000, occlusion: occlusion, sortBase: sortBase };
}

function drawVoxelCell(cell, occ, alpha = 1) {
var pts = cubePoints(cell.x, cell.y, cell.z, 1, 1, 1);
var { p100,p110,p010,p001,p101,p111,p011 } = pts;
var fc = baseFaceColors((cell.box && cell.box.base) || cell.base || "#7aa2f7");

var hasTop = !occ.has(`${cell.x},${cell.y},${cell.z + 1}`);
var hasEast = !occ.has(`${cell.x + 1},${cell.y},${cell.z}`);
var hasSouth = !occ.has(`${cell.x},${cell.y + 1},${cell.z}`);

var topCenter = { x: cell.x + 0.5, y: cell.y + 0.5, z: cell.z + 1 };
var eastCenter = { x: cell.x + 1, y: cell.y + 0.5, z: cell.z + 0.5 };
var southCenter = { x: cell.x + 0.5, y: cell.y + 1, z: cell.z + 0.5 };

ctx.save();
ctx.globalAlpha = alpha;

if (hasTop) {
  var topFace = buildRenderableFace(
    [p001,p101,p111,p011],
    [ {x: cell.x, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ],
    fc.top,
    { x: 0, y: 0, z: 1 },
    cell.box && cell.box.instanceId,
    fc.line,
    null
  );
  drawPoly(topFace.points, topFace.fill, topFace.stroke, topFace.width || 1);
  if (topFace.overlays) for (const ov of topFace.overlays) drawPoly(ov.points, ov.fill, ov.stroke, ov.width || 0);
}
if (hasEast) {
  var eastFace = buildRenderableFace(
    [p101,p111,p110,p100],
    [ {x: cell.x + 1, y: cell.y, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1} ],
    fc.east,
    { x: 1, y: 0, z: 0 },
    cell.box && cell.box.instanceId,
    fc.line,
    xrayFaces ? 'rgba(255,255,255,.18)' : null
  );
  drawPoly(eastFace.points, eastFace.fill, eastFace.stroke, eastFace.width || 1);
  if (eastFace.overlays) for (const ov of eastFace.overlays) drawPoly(ov.points, ov.fill, ov.stroke, ov.width || 0);
}
if (hasSouth) {
  var southFace = buildRenderableFace(
    [p011,p111,p110,p010],
    [ {x: cell.x, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ],
    fc.south,
    { x: 0, y: 1, z: 0 },
    cell.box && cell.box.instanceId,
    fc.line,
    xrayFaces ? 'rgba(255,255,255,.14)' : null
  );
  drawPoly(southFace.points, southFace.fill, southFace.stroke, southFace.width || 1);
  if (southFace.overlays) for (const ov of southFace.overlays) drawPoly(ov.points, ov.fill, ov.stroke, ov.width || 0);
}

if (xrayFaces) {
  const { p000 } = pts;
  const hasWest = !occ.has(`${cell.x - 1},${cell.y},${cell.z}`);
  const hasNorth = !occ.has(`${cell.x},${cell.y - 1},${cell.z}`);
  if (hasWest) drawPoly([p001,p011,p010,p000], 'rgba(255,255,255,.08)', fc.line);
  if (hasNorth) drawPoly([p001,p101,p100,p000], 'rgba(255,255,255,.08)', fc.line);
}

ctx.restore();


if (showDebug) {
  const foot = iso(cell.x + 1, cell.y + 1, cell.z);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(foot.x, foot.y, 2.5, 0, Math.PI * 2); ctx.fill();
}
}

function buildStaticVoxelRenderable(cell, occ) {
var pts = cubePoints(cell.x, cell.y, cell.z, 1, 1, 1);
var fc = baseFaceColors((cell.box && cell.box.base) || cell.base || "#7aa2f7");
var { p000,p100,p110,p010,p001,p101,p111,p011 } = pts;
var hasTop = !occ.has(`${cell.x},${cell.y},${cell.z + 1}`);
var hasEast = !occ.has(`${cell.x + 1},${cell.y},${cell.z}`);
var hasSouth = !occ.has(`${cell.x},${cell.y + 1},${cell.z}`);
var topCenter = { x: cell.x + 0.5, y: cell.y + 0.5, z: cell.z + 1 };
var eastCenter = { x: cell.x + 1, y: cell.y + 0.5, z: cell.z + 0.5 };
var southCenter = { x: cell.x + 0.5, y: cell.y + 1, z: cell.z + 0.5 };
var faces = [];
if (hasTop) faces.push(buildRenderableFace(
  [p001,p101,p111,p011],
  [ {x: cell.x, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ],
  fc.top,
  { x: 0, y: 0, z: 1 },
  cell.box && cell.box.instanceId,
  fc.line,
  null
));
if (hasEast) faces.push(buildRenderableFace(
  [p101,p111,p110,p100],
  [ {x: cell.x + 1, y: cell.y, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1} ],
  fc.east,
  { x: 1, y: 0, z: 0 },
  cell.box && cell.box.instanceId,
  fc.line,
  xrayFaces ? 'rgba(255,255,255,.18)' : null
));
if (hasSouth) faces.push(buildRenderableFace(
  [p011,p111,p110,p010],
  [ {x: cell.x, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ],
  fc.south,
  { x: 0, y: 1, z: 0 },
  cell.box && cell.box.instanceId,
  fc.line,
  xrayFaces ? 'rgba(255,255,255,.14)' : null
));
if (xrayFaces) {
  const hasWest = !occ.has(`${cell.x - 1},${cell.y},${cell.z}`);
  const hasNorth = !occ.has(`${cell.x},${cell.y - 1},${cell.z}`);
  if (hasWest) faces.push({ points: [p001,p011,p010,p000], fill: 'rgba(255,255,255,.08)', stroke: fc.line, width: 1 });
  if (hasNorth) faces.push({ points: [p001,p101,p100,p000], fill: 'rgba(255,255,255,.08)', stroke: fc.line, width: 1 });
}
const domainCore = getDomainSceneCoreApi();
const orderMeta = domainCore && typeof domainCore.computeVoxelRenderableSort === 'function'
  ? domainCore.computeVoxelRenderableSort({ cell: cell, box: cell.box || null })
  : { sortKey: cell.x + cell.y + 1, tie: cell.z * 100000 + cell.y * 100 + cell.x };
return {
  id: `voxel-${cell.box.id}-${cell.x}-${cell.y}-${cell.z}`,
  kind: 'voxel',
  sortKey: orderMeta.sortKey,
  tie: orderMeta.tie,
  faces,
  debugFoot: showDebug ? iso(cell.x + 1, cell.y + 1, cell.z) : null,
};
}



function buildRenderableFace(points, worldPts, baseRgb, normal, ownerInstanceId, stroke, xrayFill) {
  var fill = xrayFill || rgbToCss(litFaceColor(baseRgb, worldPts, normal, ownerInstanceId));
  var face = { points: points, fill: fill, stroke: stroke, width: 1 };
  if (!xrayFill) {
    var patches = buildFaceShadowPatches(worldPts, normal, ownerInstanceId);
    if (patches && patches.length) {
      face.overlays = patches.map(function (patch) {
        return {
          points: patch.pts.map(function (pt) { return iso(pt.x, pt.y, pt.z); }),
          fill: shadowFillCss(patch.alpha),
          stroke: null,
          width: 0,
        };
      });
    }
  }
  return face;
}

function buildShiftedVoxelRenderable(cell, occ, shift, idPrefix) {
  var base = buildStaticVoxelRenderable(cell, occ);
  if (!base || !Array.isArray(base.faces) || !base.faces.length) return null;
  var sx = Math.round(shift && shift.x || 0);
  var sy = Math.round(shift && shift.y || 0);
  if (!sx && !sy) return base;
  var movedFaces = base.faces.map(function (face) {
    return {
      points: face.points.map(function (pt) { return { x: pt.x + sx, y: pt.y + sy }; }),
      fill: face.fill,
      stroke: face.stroke,
      width: face.width || 1,
      overlays: (face.overlays || []).map(function (ov) {
        return {
          points: ov.points.map(function (pt) { return { x: pt.x + sx, y: pt.y + sy }; }),
          fill: ov.fill,
          stroke: ov.stroke,
          width: ov.width || 0,
        };
      })
    };
  });
  return {
    id: (idPrefix || 'habbo-voxel') + '-' + String(cell.box && cell.box.id || 'x') + '-' + String(cell.x) + '-' + String(cell.y) + '-' + String(cell.z),
    kind: 'voxel',
    sortKey: base.sortKey,
    tie: base.tie,
    faces: movedFaces,
    debugFoot: base.debugFoot ? { x: base.debugFoot.x + sx, y: base.debugFoot.y + sy } : null,
  };
}

function drawCachedVoxelRenderable(item) {
  return requireCanvas2dStaticWorldFaceDrawPassForRender().drawCachedVoxelRenderable(
    item,
    createCanvas2dStaticWorldFaceDrawPassDepsForRender()
  );
}


function requireStaticWorldRenderCacheCoordinatorForRender() {
  var api = null;
  try {
    api = window.App && window.App.application && window.App.application.render
      ? window.App.application.render.staticWorldRenderCacheCoordinator || null
      : null;
  } catch (_) {}
  api = api || (typeof window !== 'undefined' ? window.__STATIC_WORLD_RENDER_CACHE_COORDINATOR__ : null);
  if (!api || typeof api.rebuildStaticWorldRenderCache !== 'function') {
    throw new Error('static world render cache coordinator is unavailable; ensure src/application/render/static-world-render-cache-coordinator.js loads before render.js');
  }
  return api;
}

function createStaticWorldRenderCacheCoordinatorDepsForRender() {
  return {
    perfNow: perfNow,
    getStaticWorldFaceMergeControlStateSnapshotForRender: getStaticWorldFaceMergeControlStateSnapshotForRender,
    getSafeMainEditorViewRotation: getSafeMainEditorViewRotation,
    normalizeMainEditorViewRotationValue: normalizeMainEditorViewRotationValue,
    buildStaticWorldRenderSignature: buildStaticWorldRenderSignature,
    getRenderVisibilityCoreApi: getRenderVisibilityCoreApi,
    getMainCameraRenderScope: getMainCameraRenderScope,
    getSceneOccupancySnapshotForRender: getSceneOccupancySnapshotForRender,
    getSceneStaticWorldCacheApiForRender: getSceneStaticWorldCacheApiForRender,
    getSharedStaticWorldChunkCacheApiForRender: getSharedStaticWorldChunkCacheApiForRender,
    buildInstanceRenderUpdateModeIndex: buildInstanceRenderUpdateModeIndex,
    isStaticWorldBoxForRender: isStaticWorldBoxForRender,
    getTerrainFrameLogContextForRender: getTerrainFrameLogContextForRender,
    compareRenderablesByDomain: compareRenderablesByDomain,
    buildStaticWorldChunkRenderables: buildStaticWorldChunkRenderables,
    captureStaticBoxCacheFrameState: captureStaticBoxCacheFrameState,
    maybeLogStaticBoxCacheProfile: maybeLogStaticBoxCacheProfile,
    maybeLogStaticCacheInvalidationVerify: maybeLogStaticCacheInvalidationVerify,
    maybeLogStaticWorldChunkSummary: maybeLogStaticWorldChunkSummary,
    logItemRotationPrototype: logItemRotationPrototype,
    buildMainViewRotationSourceCheckPayload: buildMainViewRotationSourceCheckPayload,
    noteLayerRebuild: noteLayerRebuild,
    isInteractiveRenderPressure: isInteractiveRenderPressure,
    setLastSurfaceCacheStats: function (stats) { __lastSurfaceCacheStats = stats || null; }
  };
}

function rebuildStaticBoxRenderCacheIfNeeded(force = false) {
  return requireStaticWorldRenderCacheCoordinatorForRender().rebuildStaticWorldRenderCache({
    force: force === true,
    boxes: boxes,
    instances: instances,
    staticBoxRenderCache: staticBoxRenderCache
  }, createStaticWorldRenderCacheCoordinatorDepsForRender());
}

function mergeSortedRenderables(staticRenderables, dynamicRenderables) {
  return requireRenderOrderCoreForRender().mergeSortedRenderables(
    staticRenderables,
    dynamicRenderables,
    compareRenderablesByDomain
  );
}

function drawFloor(scope) {
  var floorLoopStartAt = perfNow();
  var isoTotalMs = 0;
  var lightingTotalMs = 0;
  var drawPolyTotalMs = 0;
  var tileCount = 0;
  for (let y = 0; y < settings.gridH; y++) {
    for (let x = 0; x < settings.gridW; x++) {
      var isoStartAt = perfNow();
      const p0 = iso(x, y, 0), p1 = iso(x + 1, y, 0), p2 = iso(x + 1, y + 1, 0), p3 = iso(x, y + 1, 0);
      isoTotalMs += Math.max(0, perfNow() - isoStartAt);
      var lightingStartAt = perfNow();
      const base = (x + y) % 2 === 0 ? '#33415a' : '#29344b';
      const lit = rgbToCss(litColor(hexToRgb(base), { x: x + 0.5, y: y + 0.5, z: 0 }, { x: 0, y: 0, z: 1 }));
      lightingTotalMs += Math.max(0, perfNow() - lightingStartAt);
      var drawPolyStartAt = perfNow();
      drawPoly([p0, p1, p2, p3], lit, 'rgba(255,255,255,.05)');
      drawPolyTotalMs += Math.max(0, perfNow() - drawPolyStartAt);
      tileCount += 1;
    }
  }
  var outlineStartAt = perfNow();
  const a = iso(0,0,0), b = iso(settings.gridW,0,0), c = iso(settings.gridW,settings.gridH,0), d = iso(0,settings.gridH,0);
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.lineTo(c.x,c.y); ctx.lineTo(d.x,d.y); ctx.closePath(); ctx.stroke();
  var outlineMs = Math.max(0, perfNow() - outlineStartAt);
  var floorTotalWallMs = Math.max(0, perfNow() - floorLoopStartAt);
  var floorCanvasDrawWallMs = Math.max(0, drawPolyTotalMs + outlineMs);
  var floorLoopWallMs = Math.max(0, floorTotalWallMs - isoTotalMs - lightingTotalMs - floorCanvasDrawWallMs);
  try {
    if (typeof window !== 'undefined') {
      window.__LAST_DRAW_FLOOR_BREAKDOWN__ = {
        floorTotalWallMs: Number(floorTotalWallMs.toFixed(3)),
        floorLoopWallMs: Number(floorLoopWallMs.toFixed(3)),
        floorProjectionWallMs: Number(isoTotalMs.toFixed(3)),
        floorColorMaterialWallMs: Number(lightingTotalMs.toFixed(3)),
        floorCanvasDrawWallMs: Number(floorCanvasDrawWallMs.toFixed(3)),
        floorTileCount: Number(tileCount || 0)
      };
    }
  } catch (_) {}
  recordRenderFunctionTiming('render.renderBaseWorldPasses.drawFloor.gridLoop', floorTotalWallMs, { floorTileCount: Number(tileCount || 0) });
  recordRenderFunctionTiming('render.renderBaseWorldPasses.drawFloor.isoProjection', isoTotalMs, { floorTileCount: Number(tileCount || 0) });
  recordRenderFunctionTiming('render.renderBaseWorldPasses.drawFloor.lighting', lightingTotalMs, { floorTileCount: Number(tileCount || 0) });
  recordRenderFunctionTiming('render.renderBaseWorldPasses.drawFloor.drawPoly', drawPolyTotalMs, { floorTileCount: Number(tileCount || 0) });
  recordRenderFunctionTiming('render.renderBaseWorldPasses.drawFloor.outline', outlineMs, { floorTileCount: Number(tileCount || 0) });
}


function playerPlacementAABB() {
  return getPlayerProxyBox();
}

const PLAYER_VISUAL_BASE_HEIGHT = 1.7;

function getPlayerVisualScale() {
  return Math.max(0.2, (settings.playerHeightCells / PLAYER_VISUAL_BASE_HEIGHT) * settings.tileScale);
}

function currentAnimFrame() {
  if (!player.moving) return 0;
  return Math.floor(player.walk) % SPRITE.frames;
}

function getPlayerUnifiedLightCenter() {
  var baseZ = Number(player && player.visualZ != null ? player.visualZ : player && player.z || 0);
  return {
    x: player.x,
    y: player.y,
    z: baseZ + Math.max(0.55, settings.playerHeightCells * 0.52),
  };
}

function preparePlayerSpriteFrame() {
  if (!assetsReady) return null;

  var frame = currentAnimFrame();
  var row = SPRITE.rows[player.dir] ?? 0;
  var frameX = frame * SPRITE.frameW;
  var rowY = row * SPRITE.frameH;
  var foot = iso(player.x, player.y, Number(player && player.visualZ != null ? player.visualZ : player && player.z || 0));
  var spriteScale = getPlayerVisualScale();
  var scaledFrameW = Math.max(1, Math.round(SPRITE.frameW * spriteScale));
  var scaledFrameH = Math.max(1, Math.round(SPRITE.frameH * spriteScale));
  var xLeft = Math.round(foot.x - scaledFrameW / 2);
  var yTop = Math.round(foot.y - SPRITE.bottom * spriteScale);
  var visibleHeight = SPRITE.bottom - SPRITE.top;
  var totalH = Math.max(0.2, settings.playerHeightCells);

  var spriteLight = spriteLightAt(getPlayerUnifiedLightCenter());
  var brightness = spriteLight.brightness;
  var tint = spriteLight.tint;
  var weight = spriteLight.weight;
  var tintAlpha = clamp(weight * 0.18, 0, 0.35);

  var cacheKey = [
    frame,
    row,
    brightness.toFixed(3),
    tint.r.toFixed(1),
    tint.g.toFixed(1),
    tint.b.toFixed(1),
    tintAlpha.toFixed(3),
  ].join('|');

  var cacheHit = playerSpriteFrameCache.key === cacheKey;
  notePlayerSpriteCache(cacheHit, `frame=${frame} row=${row} brightness=${brightness.toFixed(3)} tintAlpha=${tintAlpha.toFixed(3)} moving=${player.moving}`);

  if (!cacheHit) {
    playerSpriteFrameBuffer.width = SPRITE.frameW;
    playerSpriteFrameBuffer.height = SPRITE.frameH;
    playerSpriteFrameCtx.clearRect(0, 0, SPRITE.frameW, SPRITE.frameH);

    playerSpriteFrameCtx.save();
    playerSpriteFrameCtx.filter = `brightness(${Math.round(brightness * 100)}%)`;
    playerSpriteFrameCtx.drawImage(spriteSheet, frameX, rowY, SPRITE.frameW, SPRITE.frameH, 0, 0, SPRITE.frameW, SPRITE.frameH);
    playerSpriteFrameCtx.restore();

    playerSpriteFrameCtx.save();
    playerSpriteFrameCtx.globalCompositeOperation = 'source-atop';
    playerSpriteFrameCtx.fillStyle = rgbToCss(tint, tintAlpha);
    playerSpriteFrameCtx.fillRect(0, 0, SPRITE.frameW, SPRITE.frameH);
    playerSpriteFrameCtx.restore();

    playerSpriteFrameCache.key = cacheKey;
    playerSpriteFrameCache.frame = frame;
    playerSpriteFrameCache.row = row;
    playerSpriteFrameCache.xLeft = xLeft;
    playerSpriteFrameCache.scaledFrameW = scaledFrameW;
    playerSpriteFrameCache.scaledFrameH = scaledFrameH;
    playerSpriteFrameCache.spriteScale = spriteScale;
    playerSpriteFrameCache.yTop = yTop;
    playerSpriteFrameCache.visibleHeight = visibleHeight;
    playerSpriteFrameCache.totalH = totalH;
    playerSpriteFrameCache.brightness = brightness;
    playerSpriteFrameCache.tint = tint;
    playerSpriteFrameCache.weight = weight;
  }

  playerSpriteFrameCache.xLeft = xLeft;
  playerSpriteFrameCache.yTop = yTop;
  playerSpriteFrameCache.scaledFrameW = scaledFrameW;
  playerSpriteFrameCache.scaledFrameH = scaledFrameH;
  playerSpriteFrameCache.spriteScale = spriteScale;
  playerSpriteFrameCache.visibleHeight = visibleHeight;
  playerSpriteFrameCache.totalH = totalH;

  return playerSpriteFrameCache;
}

function drawPlayerAvatar() {
  var prepared = preparePlayerSpriteFrame();
  var spriteScale = prepared ? prepared.spriteScale : getPlayerVisualScale();
  if (assetsReady && prepared) {
    ctx.drawImage(playerSpriteFrameBuffer, 0, 0, SPRITE.frameW, SPRITE.frameH, prepared.xLeft, prepared.yTop, prepared.scaledFrameW, prepared.scaledFrameH);
  } else {
    var foot = iso(player.x, player.y, Number(player && player.visualZ != null ? player.visualZ : player && player.z || 0));
    var xLeft = Math.round(foot.x - (SPRITE.frameW * spriteScale) / 2);
    var yTop = Math.round(foot.y - SPRITE.bottom * spriteScale);
    var boxW = Math.max(2, Math.round(16 * spriteScale));
    var boxH = Math.max(8, Math.round((SPRITE.bottom - SPRITE.top) * spriteScale));
    var center = getPlayerUnifiedLightCenter();
    var c = rgbToCss(litColor({ r: 106, g: 177, b: 255 }, center, { x: 0, y: 0, z: 1 }));
    ctx.fillStyle = c;
    ctx.fillRect(xLeft + Math.round(28 * spriteScale), yTop + Math.round(SPRITE.top * spriteScale), boxW, boxH);
  }

  if (showDebug) {
    var proxy = playerPlacementAABB();
    var pts = cubePoints(proxy.x, proxy.y, proxy.z || 0, proxy.w, proxy.d, proxy.h);
    drawPoly([pts.p000, pts.p100, pts.p110, pts.p010], 'rgba(124,242,154,.05)', 'rgba(124,242,154,.85)');
  }
}
function highestTopAtCell(cellX, cellY, ignoreId = null, ignoreInstanceId = null) {
  let top = 0;
  for (const b of boxes) {
    if (ignoreId != null && b.id === ignoreId) continue;
    if (ignoreInstanceId != null && b.instanceId === ignoreInstanceId) continue;
    if (cellX >= b.x && cellX < b.x + b.w && cellY >= b.y && cellY < b.y + b.d) top = Math.max(top, b.z + b.h);
  }
  return top;
}

function getDomainSceneCoreApi() {
  return (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.sceneCore) ? window.App.domain.sceneCore : null;
}

function getItemFacingCoreApi() {
  try {
    return (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.itemFacingCore)
      ? window.App.domain.itemFacingCore
      : (typeof window !== 'undefined' ? window.__ITEM_FACING_CORE__ || null : null);
  } catch (_) {
    return (typeof window !== 'undefined' ? window.__ITEM_FACING_CORE__ || null : null);
  }
}

function getRenderFaceOracleApi() {
  try {
    return (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.renderFaceOracleCore)
      ? window.App.domain.renderFaceOracleCore
      : (typeof window !== 'undefined' ? window.__RENDER_FACE_ORACLE_CORE__ || null : null);
  } catch (_) {
    return (typeof window !== 'undefined' ? window.__RENDER_FACE_ORACLE_CORE__ || null : null);
  }
}

function getRenderVisibilityCoreApi() {
  try {
    return (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.renderVisibilityCore)
      ? window.App.domain.renderVisibilityCore
      : (typeof window !== 'undefined' ? window.__RENDER_VISIBILITY_CORE__ || null : null);
  } catch (_) {
    return (typeof window !== 'undefined' ? window.__RENDER_VISIBILITY_CORE__ || null : null);
  }
}

function getEditorPreviewFacingValue() {
  return (((editor && typeof editor.previewFacing === 'number' ? editor.previewFacing : 0) % 4) + 4) % 4;
}

function normalizeMainEditorViewRotationValue(value) {
  var n = Number(value);
  if (!Number.isFinite(n)) return 0;
  n = n % 4;
  if (n < 0) n += 4;
  return n;
}

function readRuntimeMainEditorViewRotation() {
  try {
    var controller = window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (controller && typeof controller.getMainEditorVisualRotation === 'function') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(controller.getMainEditorVisualRotation('presentation.render.render')),
        source: 'app.controllers.main.getMainEditorVisualRotation'
      };
    }
    if (controller && typeof controller.getMainEditorViewRotation === 'function') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(controller.getMainEditorViewRotation('presentation.render.render')),
        source: 'app.controllers.main.getMainEditorViewRotation'
      };
    }
  } catch (_) {}
  try {
    var runtimeApi = window.App && window.App.state ? window.App.state.runtimeState || null : null;
    if (runtimeApi && runtimeApi.editor && typeof runtimeApi.editor.visualRotation === 'number') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(runtimeApi.editor.visualRotation),
        source: 'app.state.runtimeState.editor.visualRotation'
      };
    }
    if (runtimeApi && runtimeApi.editor && typeof runtimeApi.editor.rotation === 'number') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(runtimeApi.editor.rotation),
        source: 'app.state.runtimeState.editor.rotation'
      };
    }
  } catch (_) {}
  try {
    var runtimeNs = window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function' ? window.__APP_NAMESPACE.getPath('state.runtimeState') : null;
    if (runtimeNs && runtimeNs.editor && typeof runtimeNs.editor.visualRotation === 'number') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(runtimeNs.editor.visualRotation),
        source: 'namespace.state.runtimeState.editor.visualRotation'
      };
    }
    if (runtimeNs && runtimeNs.editor && typeof runtimeNs.editor.rotation === 'number') {
      return {
        hasViewRotation: true,
        viewRotation: normalizeMainEditorViewRotationValue(runtimeNs.editor.rotation),
        source: 'namespace.state.runtimeState.editor.rotation'
      };
    }
  } catch (_) {}
  return { hasViewRotation: false, viewRotation: 0, source: 'runtime-state-unavailable' };
}

function readLegacyMainEditorViewRotation() {
  return (typeof editor !== 'undefined' && editor && typeof editor.rotation === 'number') ? normalizeMainEditorViewRotationValue(editor.rotation) : null;
}

function getSafeMainEditorViewRotation(snapshot) {
  var runtimeInfo = readRuntimeMainEditorViewRotation();
  if (runtimeInfo && runtimeInfo.hasViewRotation) {
    return {
      hasViewRotation: true,
      viewRotation: normalizeMainEditorViewRotationValue(runtimeInfo.viewRotation),
      fallbackUsed: false,
      source: runtimeInfo.source
    };
  }
  return {
    hasViewRotation: false,
    viewRotation: 0,
    fallbackUsed: true,
    source: 'runtime-state-unavailable'
  };
}

function isMainEditorViewAnimatingForRender() {
  try {
    var controller = window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (controller && typeof controller.isMainEditorViewRotating === 'function') return !!controller.isMainEditorViewRotating('presentation.render.render');
  } catch (_) {}
  try {
    var runtimeApi = window.App && window.App.state ? window.App.state.runtimeState || null : null;
    return !!(runtimeApi && runtimeApi.editor && runtimeApi.editor.isViewRotating);
  } catch (_) {}
  return false;
}

function logMainViewRotationVisualConsumerCheck(currentViewRotation) {
  if (!isMainEditorViewAnimatingForRender()) return;
  logItemRotationPrototype('main-view-rotation-visual-consumer-check', {
    visualRotationUsedByFloor: normalizeMainEditorViewRotationValue(currentViewRotation),
    visualRotationUsedByStaticVoxel: normalizeMainEditorViewRotationValue(currentViewRotation),
    visualRotationUsedBySemanticFaces: normalizeMainEditorViewRotationValue(currentViewRotation),
    visualRotationUsedByLights: normalizeMainEditorViewRotationValue(currentViewRotation),
    visualRotationUsedByShadows: normalizeMainEditorViewRotationValue(currentViewRotation),
    allConsumersAligned: true
  });
}

function logMainViewRotationRenderConsumerMode(currentViewRotation) {
  if (!isMainEditorViewAnimatingForRender()) return;
  logItemRotationPrototype('main-view-rotation-render-consumer-mode', {
    usesContinuousVisualRotation: true,
    usesDiscreteViewRotation: false,
    cacheByVisualRotation: true,
    cacheByDiscreteRotation: false,
    floorUsesContinuousVisualRotation: true,
    voxelUsesContinuousVisualRotation: true,
    lightUsesContinuousVisualRotation: true,
    shadowUsesContinuousVisualRotation: true,
    currentVisualRotation: normalizeMainEditorViewRotationValue(currentViewRotation)
  });
}


var __mainCameraScopeCache = { key: '', scope: null };
var __mainCameraScopeCountsCache = { key: '', counts: null };
var __terrainChunkRenderCache = { signature: '', chunks: new Map(), summary: null, dirtyChunkKeys: new Set(), totalChunkCount: 0 };
var __terrainRuntimeSummary = null;
var __lastTerrainCameraMoveState = { key: '', terrainBatchId: null };
var __lastRenderVisibilityStats = null;
var __lastSurfaceCacheStats = null;
var __visibilityCountSamplingEnabled = false;
var __lastRenderResourceSummary = null;
var __lastLoggingCostSummary = null;

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

function isMainEditorCameraCullingEnabledForRender() {
  return getMainEditorCameraSettingsForRender().cameraCullingEnabled !== false;
}

function getMainEditorCullingMarginForRender() {
  return Math.max(0, Number(getMainEditorCameraSettingsForRender().cullingMargin) || 0);
}


function getTerrainRuntimeModelForRender() {
  try {
    var runtimeApi = window.App && window.App.state ? window.App.state.runtimeState || null : null;
    if (runtimeApi && typeof runtimeApi.getTerrainRuntimeModelValue === 'function') {
      var terrain = runtimeApi.getTerrainRuntimeModelValue();
      if (terrain && Array.isArray(terrain.heightMap) && terrain.width > 0 && terrain.height > 0) return terrain;
    }
  } catch (_) {}
  return null;
}

function getTerrainRenderSettingsForRender() {
  var defaults = { terrainDebugFaceColorsEnabled: false, terrainColorMode: 'natural', terrainBuildColorMode: 'natural', terrainBuildLightingBypass: false, terrainDetailedProfilingEnabled: false };
  try {
    var controller = window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (controller && typeof controller.getMainEditorTerrainSettings === 'function') {
      var settings = controller.getMainEditorTerrainSettings('presentation.render.render:terrain-settings');
      if (settings) return Object.assign({}, defaults, settings || {});
    }
  } catch (_) {}
  try {
    var runtimeApi = window.App && window.App.state ? window.App.state.runtimeState || null : null;
    if (runtimeApi && typeof runtimeApi.getTerrainGeneratorSettingsValue === 'function') {
      return Object.assign({}, defaults, runtimeApi.getTerrainGeneratorSettingsValue() || {});
    }
  } catch (_) {}
  return defaults;
}

function getTerrainSemanticDebugPalette() {
  var facingApi = getItemFacingCoreApi();
  if (facingApi && typeof facingApi.getDefaultSemanticTextureMap === 'function') {
    try {
      var map = facingApi.getDefaultSemanticTextureMap() || {};
      return {
        top: (map.top && map.top.color) || '#2F80ED',
        north: (map.north && map.north.color) || '#E74C3C',
        east: (map.east && map.east.color) || '#27AE60',
        south: (map.south && map.south.color) || '#F2C94C',
        west: (map.west && map.west.color) || '#9B51E0'
      };
    } catch (_) {}
  }
  return { top: '#2F80ED', north: '#E74C3C', east: '#27AE60', south: '#F2C94C', west: '#9B51E0' };
}

function getTerrainColorModeForRender() {
  var settings = getTerrainRenderSettingsForRender();
  return settings.terrainDebugFaceColorsEnabled === true ? 'debug-semantic' : String(settings.terrainColorMode || 'natural');
}


function terrainModelHasData(model) {
  return !!(model && Array.isArray(model.heightMap) && Number(model.width) > 0 && Number(model.height) > 0);
}

function getTerrainColumnHeightForRender(model, x, y) {
  if (!terrainModelHasData(model)) return 0;
  var xi = Math.round(Number(x) || 0);
  var yi = Math.round(Number(y) || 0);
  var col = Array.isArray(model.heightMap[xi]) ? model.heightMap[xi] : null;
  return Math.max(0, Math.round(Number(col && col[yi]) || 0));
}

function getTerrainExistingHeightForRender(model, x, y) {
  if (!terrainModelHasData(model)) return 0;
  var xi = Math.round(Number(x) || 0);
  var yi = Math.round(Number(y) || 0);
  var col = Array.isArray(model.existingHeightMap && model.existingHeightMap[xi]) ? model.existingHeightMap[xi] : null;
  return Math.max(0, Math.round(Number(col && col[yi]) || 0));
}

function getTerrainMergedHeightForRender(model, x, y) {
  return Math.max(getTerrainColumnHeightForRender(model, x, y), getTerrainExistingHeightForRender(model, x, y));
}

function getTerrainChunkSizeForRender(model) {
  return Math.max(1, Math.round(Number(model && model.chunkSize) || 16));
}

function getTerrainChunkKey(cx, cy) {
  return String(cx) + ',' + String(cy);
}

function getTerrainChunkBounds(model, chunkX, chunkY) {
  var chunkSize = getTerrainChunkSizeForRender(model);
  var minX = chunkX * chunkSize;
  var minY = chunkY * chunkSize;
  return {
    minX: minX,
    minY: minY,
    maxX: Math.min(Number(model.width) || 0, minX + chunkSize),
    maxY: Math.min(Number(model.height) || 0, minY + chunkSize)
  };
}

function getTerrainChunkCacheSignature(model) {
  var settings = getMainEditorCameraSettingsForRender();
  return JSON.stringify({
    terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null,
    width: model && model.width || 0,
    height: model && model.height || 0,
    chunkSize: getTerrainChunkSizeForRender(model),
    cacheVersion: model && model.terrainChunkCacheVersion || 0,
    surfaceOnlyRenderingEnabled: settings && settings.surfaceOnlyRenderingEnabled !== false
  });
}

function getVisibleTerrainChunkCoordsForScope(model, scope) {
  var bounds = scope && scope.cullingWorldBounds ? scope.cullingWorldBounds : null;
  var chunkSize = getTerrainChunkSizeForRender(model);
  var width = Math.max(0, Math.round(Number(model && model.width) || 0));
  var height = Math.max(0, Math.round(Number(model && model.height) || 0));
  if (!(width > 0 && height > 0)) return [];
  var minX = 0, minY = 0, maxX = width, maxY = height;
  if (bounds) {
    minX = Math.max(0, Math.floor(Number(bounds.minX) || 0));
    minY = Math.max(0, Math.floor(Number(bounds.minY) || 0));
    maxX = Math.min(width, Math.ceil(Number(bounds.maxX) || width));
    maxY = Math.min(height, Math.ceil(Number(bounds.maxY) || height));
  }
  var minChunkX = Math.max(0, Math.floor(minX / chunkSize));
  var minChunkY = Math.max(0, Math.floor(minY / chunkSize));
  var maxChunkX = Math.max(minChunkX, Math.ceil(maxX / chunkSize) - 1);
  var maxChunkY = Math.max(minChunkY, Math.ceil(maxY / chunkSize) - 1);
  var out = [];
  for (var cx = minChunkX; cx <= maxChunkX; cx++) {
    for (var cy = minChunkY; cy <= maxChunkY; cy++) {
      out.push({ chunkX: cx, chunkY: cy, key: getTerrainChunkKey(cx, cy), bounds: getTerrainChunkBounds(model, cx, cy) });
    }
  }
  return out;
}

function addTerrainOwnedOccupancyToSet(occupancy, model, scope) {
  if (!terrainModelHasData(model) || !occupancy || typeof occupancy.add !== 'function') return occupancy;
  var chunkCoords = getVisibleTerrainChunkCoordsForScope(model, scope || null);
  for (var i = 0; i < chunkCoords.length; i++) {
    var bounds = chunkCoords[i] && chunkCoords[i].bounds ? chunkCoords[i].bounds : null;
    if (!bounds) continue;
    for (var x = bounds.minX; x < bounds.maxX; x++) {
      for (var y = bounds.minY; y < bounds.maxY; y++) {
        var target = getTerrainColumnHeightForRender(model, x, y);
        var existing = getTerrainExistingHeightForRender(model, x, y);
        for (var z = existing; z < target; z++) occupancy.add(String(x) + ',' + String(y) + ',' + String(z));
      }
    }
  }
  return occupancy;
}

function invalidateTerrainChunkRenderCacheForModel(model) {
  var signature = getTerrainChunkCacheSignature(model);
  if (__terrainChunkRenderCache.signature !== signature) {
    __terrainChunkRenderCache = { signature: signature, chunks: new Map(), summary: null, dirtyChunkKeys: new Set(), totalChunkCount: 0 };
    return true;
  }
  return false;
}

function buildTerrainChunkSurfaceSources(model, chunkX, chunkY, scope) {
  var visibilityCore = getRenderVisibilityCoreApi();
  var chunkSize = getTerrainChunkSizeForRender(model);
  var chunkStats = visibilityCore && typeof visibilityCore.buildVisibleSurfaceCacheForTerrainChunk === 'function'
    ? visibilityCore.buildVisibleSurfaceCacheForTerrainChunk(model, chunkX, chunkY, { chunkSize: chunkSize, surfaceOnlyRenderingEnabled: scope && scope.surfaceOnlyRenderingEnabled !== false })
    : { chunkKey: getTerrainChunkKey(chunkX, chunkY), chunkX: chunkX, chunkY: chunkY, bounds: getTerrainChunkBounds(model, chunkX, chunkY), columns: [], visibleColumnCount: 0, logicalVoxelCountEstimated: 0, visibleTopFaceCount: 0, visibleSideFaceCount: 0, internalVoxelSkippedCount: 0, hiddenInternalSurfaceSkippedCount: 0, surfaceOnlyRenderingEnabled: true };
  var columns = Array.isArray(chunkStats.columns) ? chunkStats.columns : [];
  var faceSources = [];
  for (var c = 0; c < columns.length; c++) {
    var column = columns[c];
    var faces = Array.isArray(column && column.faces) ? column.faces : [];
    for (var i = 0; i < faces.length; i++) {
      var face = faces[i];
      var worldPts = buildTerrainFaceWorldPolygon(column.x, column.y, face.semanticFace, face.zStart, face.zEnd);
      if (!Array.isArray(worldPts) || worldPts.length < 3) continue;
      faceSources.push({
        x: Number(column.x || 0),
        y: Number(column.y || 0),
        height: Number(column.height || 0),
        semanticFace: face.semanticFace,
        zStart: Number(face.zStart || 0),
        zEnd: Number(face.zEnd || 0),
        layerZ: Number(face.layerZ != null ? face.layerZ : Math.max(0, Number(face.zEnd || 1) - 1)),
        unit: face.unit !== false,
        worldPts: worldPts
      });
    }
  }
  return {
    key: chunkStats.chunkKey || getTerrainChunkKey(chunkX, chunkY),
    chunkX: chunkX,
    chunkY: chunkY,
    bounds: chunkStats.bounds || getTerrainChunkBounds(model, chunkX, chunkY),
    columns: columns,
    faceSources: faceSources,
    visibleColumnCount: Number(chunkStats.visibleColumnCount || 0),
    logicalVoxelCountEstimated: Number(chunkStats.logicalVoxelCountEstimated || 0),
    visibleTopFaceCount: Number(chunkStats.visibleTopFaceCount || 0),
    visibleSideFaceCount: Number(chunkStats.visibleSideFaceCount || 0),
    internalVoxelSkippedCount: Number(chunkStats.internalVoxelSkippedCount || 0),
    hiddenInternalSurfaceSkippedCount: Number(chunkStats.hiddenInternalSurfaceSkippedCount || 0),
    surfaceOnlyRenderingEnabled: chunkStats.surfaceOnlyRenderingEnabled !== false,
    builtAt: perfNow(),
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    geometryPacketsByViewRotation: Object.create(null)
  };
}

function getTerrainChunkSurfaceSources(model, chunkCoord, scope) {
  var key = chunkCoord && chunkCoord.key ? chunkCoord.key : getTerrainChunkKey(chunkCoord && chunkCoord.chunkX || 0, chunkCoord && chunkCoord.chunkY || 0);
  var modelDirty = model && Array.isArray(model.dirtyChunkKeys) ? model.dirtyChunkKeys.indexOf(key) >= 0 : false;
  if (__terrainChunkRenderCache.chunks.has(key) && !__terrainChunkRenderCache.dirtyChunkKeys.has(key) && !modelDirty) {
    return { entry: __terrainChunkRenderCache.chunks.get(key), cacheHit: true, rebuilt: false };
  }
  var entry = buildTerrainChunkSurfaceSources(model, chunkCoord.chunkX, chunkCoord.chunkY, scope);
  __terrainChunkRenderCache.chunks.set(key, entry);
  __terrainChunkRenderCache.dirtyChunkKeys.delete(key);
  return { entry: entry, cacheHit: false, rebuilt: true };
}

function getInstanceWorldBoundsForRender(inst) {
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


function buildTerrainFaceWorldPolygon(x, y, semanticFace, zStart, zEnd) {
  var bottom = Math.max(0, Number(zStart) || 0);
  var top = Math.max(bottom, Number(zEnd) || 0);
  if (semanticFace === 'top') return [{ x:x, y:y, z:top }, { x:x+1, y:y, z:top }, { x:x+1, y:y+1, z:top }, { x:x, y:y+1, z:top }];
  if (semanticFace === 'east') return [{ x:x+1, y:y, z:bottom }, { x:x+1, y:y+1, z:bottom }, { x:x+1, y:y+1, z:top }, { x:x+1, y:y, z:top }];
  if (semanticFace === 'south') return [{ x:x, y:y+1, z:bottom }, { x:x+1, y:y+1, z:bottom }, { x:x+1, y:y+1, z:top }, { x:x, y:y+1, z:top }];
  if (semanticFace === 'west') return [{ x:x, y:y, z:top }, { x:x, y:y+1, z:top }, { x:x, y:y+1, z:bottom }, { x:x, y:y, z:bottom }];
  if (semanticFace === 'north') return [{ x:x, y:y, z:top }, { x:x+1, y:y, z:top }, { x:x+1, y:y, z:bottom }, { x:x, y:y, z:bottom }];
  return [];
}

function getTerrainMaterialIdForRenderModelCell(model, x, y) {
  var materialCore = getTerrainMaterialCoreApi();
  var materialMap = model && model.materialMap ? model.materialMap : null;
  if (materialCore && typeof materialCore.getTerrainMaterialIdAt === 'function') {
    try { return materialCore.getTerrainMaterialIdAt(materialMap, x, y, 'grass'); } catch (_) {}
  }
  return 'grass';
}

function getTerrainBaseFaceColorsForRender(model, x, y) {
  var materialCore = getTerrainMaterialCoreApi();
  var materialId = getTerrainMaterialIdForRenderModelCell(model, x, y);
  if (materialCore && typeof materialCore.getTerrainMaterialDefinition === 'function') {
    try {
      var def = materialCore.getTerrainMaterialDefinition(materialId);
      if (def && def.colors) {
        return {
          top: hexToRgb(def.colors.top || '#79b35a'),
          east: hexToRgb(def.colors.side || def.colors.top || '#79b35a'),
          south: hexToRgb(def.colors.side || def.colors.top || '#79b35a'),
          line: String(def.colors.edge || '#3c3c3c')
        };
      }
    } catch (_) {}
  }
  var params = model && model.params ? model.params : null;
  var waterLevel = params ? Math.round(Number(params.waterLevel) || 0) : 0;
  var h = getTerrainColumnHeightForRender(model, x, y);
  var base = h <= waterLevel ? '#4f8cff' : (h > 10 ? '#b39b6b' : '#79b35a');
  return baseFaceColors(base);
}

function getTerrainFaceAppearanceForRender(model, x, y, faceDesc) {
  var colorMode = getTerrainColorModeForRender();
  var semanticFace = faceDesc && faceDesc.semanticFace ? String(faceDesc.semanticFace) : 'top';
  var facingApi = getItemFacingCoreApi();
  if (colorMode === 'debug-semantic') {
    var textureMap = facingApi && typeof facingApi.getDefaultSemanticTextureMap === 'function'
      ? facingApi.getDefaultSemanticTextureMap()
      : null;
    var slot = textureMap && textureMap[semanticFace] ? textureMap[semanticFace] : null;
    var raw = slot && slot.color ? slot.color : (getTerrainSemanticDebugPalette()[semanticFace] || '#ffffff');
    return {
      colorMode: 'debug-semantic',
      paletteSource: 'item-facing-core.defaultSemanticTextureMap',
      manualBlockPaletteSource: 'item-facing-core.defaultSemanticTextureMap',
      paletteExactlyShared: true,
      paletteUsed: textureMap || null,
      semanticTextureSlot: slot,
      fill: raw,
      stroke: 'rgba(0,0,0,0.18)',
      usesSemanticTextures: !!slot,
      usesSemanticFaceColors: false
    };
  }
  var materialId = getTerrainMaterialIdForRenderModelCell(model, x, y);
  var fc = getTerrainBaseFaceColorsForRender(model, x, y);
  var fillRgb = semanticFace === 'top' ? fc.top : (semanticFace === 'east' ? fc.east : (semanticFace === 'south' ? fc.south : (semanticFace === 'west' ? fc.east : fc.south)));
  var terrainPatternDescriptor = getTerrainMaterialPatternDescriptorForRenderCell({ terrainMaterialId: materialId, generatedBy: 'terrain-generator' }, semanticFace);
  return {
    colorMode: 'natural',
    paletteSource: 'terrain-material-definition',
    paletteUsed: null,
    semanticTextureSlot: null,
    fillRgb: fillRgb,
    stroke: terrainPatternDescriptor && terrainPatternDescriptor.lineColor ? terrainPatternDescriptor.lineColor : fc.line,
    terrainMaterialId: materialId,
    terrainPatternDescriptor: terrainPatternDescriptor || null,
    usesSemanticTextures: false,
    usesSemanticFaceColors: false
  };
}

function getMainViewProjectionConfigWithoutCamera() {
  if (typeof getMainViewProjectionConfig === 'function') {
    var cfg = getMainViewProjectionConfig();
    if (cfg && typeof cfg === 'object') {
      return Object.assign({}, cfg, { cameraX: 0, cameraY: 0 });
    }
  }
  return {
    tileW: settings.tileW,
    tileH: settings.tileH,
    originX: settings.originX,
    originY: settings.originY,
    cameraX: 0,
    cameraY: 0,
    worldBoundsOrOrigin: { cols: settings.gridW || settings.worldCols, rows: settings.gridH || settings.worldRows }
  };
}

function screenPointsFromWorldFaceNoCamera(worldPts, viewRotation) {
  var pts = Array.isArray(worldPts) ? worldPts : [];
  var cfg = getMainViewProjectionConfigWithoutCamera();
  var api = getMainViewRotationCoreApi();
  return pts.map(function (p) {
    if (api && typeof api.worldToScreenWithViewRotation === 'function') {
      var out = api.worldToScreenWithViewRotation({ x: p.x, y: p.y, z: p.z }, viewRotation, cfg);
      return { x: out.x, y: out.y };
    }
    return {
      x: cfg.originX + (p.x - p.y) * cfg.tileW / 2,
      y: cfg.originY + (p.x + p.y) * cfg.tileH / 2 - p.z * cfg.tileH
    };
  });
}

function getTerrainScreenFaceLookup(viewRotation) {
  var mapping = getVisibleSemanticMappingForRender(0, viewRotation);
  var visibleByScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : { top: 'top', lowerLeft: 'south', lowerRight: 'east' };
  return {
    top: 'top',
    east: visibleByScreen.lowerRight === 'east' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'east' ? 'lowerLeft' : null),
    south: visibleByScreen.lowerRight === 'south' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'south' ? 'lowerLeft' : null),
    west: visibleByScreen.lowerRight === 'west' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'west' ? 'lowerLeft' : null),
    north: visibleByScreen.lowerRight === 'north' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'north' ? 'lowerLeft' : null)
  };
}

function buildTerrainGeometryPacket(faceSource, viewRotation) {
  if (!faceSource || !Array.isArray(faceSource.worldPts) || !faceSource.worldPts.length) return null;
  var lookup = getTerrainScreenFaceLookup(viewRotation);
  var screenFace = faceSource.semanticFace === 'top' ? 'top' : lookup[faceSource.semanticFace];
  if (!screenFace) return null;
  var pointsNoCamera = screenPointsFromWorldFaceNoCamera(faceSource.worldPts, viewRotation);
  var cellZ = Math.max(0, Number(faceSource.layerZ != null ? faceSource.layerZ : (Number(faceSource.zEnd || 1) - 1)) || 0);
  var orderMeta = computeViewAwareSortMeta({ x: faceSource.x, y: faceSource.y, z: cellZ }, 1, viewRotation);
  var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
  return {
    x: Number(faceSource.x || 0),
    y: Number(faceSource.y || 0),
    semanticFace: faceSource.semanticFace,
    screenFace: screenFace,
    zStart: Number(faceSource.zStart || 0),
    zEnd: Number(faceSource.zEnd || 0),
    layerZ: cellZ,
    worldPts: faceSource.worldPts,
    pointsNoCamera: pointsNoCamera,
    sortKey: Number(orderMeta.sortKey || 0),
    tie: Number(orderMeta.tie || 0) + ((faceTiePrio[screenFace] || 0) * 0.01)
  };
}

function getTerrainChunkGeometryPackets(entry, viewRotation) {
  if (!entry) return [];
  var key = String(normalizeMainEditorViewRotationValue(viewRotation));
  entry.geometryPacketsByViewRotation = entry.geometryPacketsByViewRotation || Object.create(null);
  if (entry.geometryPacketsByViewRotation[key]) return entry.geometryPacketsByViewRotation[key];
  var faceSources = Array.isArray(entry.faceSources) ? entry.faceSources : [];
  var packets = [];
  for (var i = 0; i < faceSources.length; i++) {
    var packet = buildTerrainGeometryPacket(faceSources[i], viewRotation);
    if (packet) packets.push(packet);
  }
  entry.geometryPacketsByViewRotation[key] = packets;
  return packets;
}

function drawTerrainFaceBatchRenderable(item) {
  if (!item || !Array.isArray(item.faces) || !item.faces.length) return;
  var cam = (typeof runtimeState !== 'undefined' && runtimeState && runtimeState.camera) ? runtimeState.camera : { x: 0, y: 0 };
  ctx.save();
  ctx.translate(Number(cam.x || 0), Number(cam.y || 0));
  for (var i = 0; i < item.faces.length; i++) {
    var face = item.faces[i];
    drawPoly(face.pointsNoCamera || [], face.fill, face.stroke, face.width || 1);
  }
  ctx.restore();
}

function buildTerrainChunkBatchedRenderables(entry, model, viewRotation) {
  var packets = getTerrainChunkGeometryPackets(entry, viewRotation);
  var batchMap = new Map();
  for (var i = 0; i < packets.length; i++) {
    var packet = packets[i];
    var appearance = getTerrainFaceAppearanceForRender(model, packet.x, packet.y, packet);
    var fill = appearance.colorMode === 'debug-semantic' ? appearance.fill : rgbToCss(litFaceColor(appearance.fillRgb, packet.worldPts, getSemanticFaceNormal(packet.semanticFace), null));
    var stroke = appearance.stroke;
    var batchKey = [packet.sortKey.toFixed(3), packet.tie.toFixed(3), packet.screenFace, fill, stroke].join('|');
    if (!batchMap.has(batchKey)) {
      batchMap.set(batchKey, {
        sortKey: packet.sortKey,
        tie: packet.tie,
        screenFace: packet.screenFace,
        semanticFace: packet.semanticFace,
        fill: fill,
        stroke: stroke,
        texture: appearance.semanticTextureSlot || null,
        textureColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
        semanticTextureSlot: appearance.semanticTextureSlot || null,
        semanticTextureSlotColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
        colorMode: appearance.colorMode,
        paletteUsed: appearance.paletteUsed || null,
        faces: []
      });
    }
    batchMap.get(batchKey).faces.push({
      pointsNoCamera: packet.pointsNoCamera,
      fill: fill,
      stroke: stroke,
      width: 1,
      worldPts: packet.worldPts,
      x: packet.x,
      y: packet.y,
      semanticFace: packet.semanticFace,
      screenFace: packet.screenFace,
      zStart: packet.zStart,
      zEnd: packet.zEnd,
      layerZ: packet.layerZ
    });
  }
  var out = [];
  batchMap.forEach(function (batch, batchKey) {
    var first = batch.faces[0] || null;
    var centroid = first ? averageScreenPoint((first.pointsNoCamera || []).map(function (pt) {
      var cam = (typeof runtimeState !== 'undefined' && runtimeState && runtimeState.camera) ? runtimeState.camera : { x: 0, y: 0 };
      return { x: pt.x + Number(cam.x || 0), y: pt.y + Number(cam.y || 0) };
    })) : { x: 0, y: 0 };
    out.push({
      id: 'terrain-batch-' + String(entry.key || 'chunk') + '-' + batchKey,
      kind: 'voxel-face-batch',
      sortKey: batch.sortKey,
      tie: batch.tie,
      instanceId: null,
      prefabId: 'terrain-column',
      generatedBy: 'terrain-generator',
      terrainBatchId: model && model.activeTerrainBatchId || null,
      renderPath: 'terrain-voxel-face-batch',
      cacheViewRotation: viewRotation,
      drawScreenPosition: { x: Math.round(centroid.x || 0), y: Math.round(centroid.y || 0) },
      screenFace: batch.screenFace,
      semanticFace: batch.semanticFace,
      fill: batch.fill,
      stroke: batch.stroke,
      texture: batch.texture,
      textureColor: batch.textureColor,
      semanticTextureSlot: batch.semanticTextureSlot,
      semanticTextureSlotColor: batch.semanticTextureSlotColor,
      terrainColorMode: batch.colorMode,
      terrainDebugPalette: batch.paletteUsed || null,
      terrainUsesOriginalVoxelFacePipeline: true,
      terrainUsesCustomColumnSurfacePipeline: false,
      terrainBatchDraw: true,
      chunkKey: entry.key || null,
      worldBounds: entry.bounds || null,
      faces: batch.faces,
      draw: function () { drawTerrainFaceBatchRenderable(this); }
    });
  });
  return out;
}

function buildTerrainFaceRenderableItem(x, y, faceDesc, viewRotation, model) {
  if (!faceDesc) return null;
  var worldPts = Array.isArray(faceDesc.worldPts) && faceDesc.worldPts.length ? faceDesc.worldPts : buildTerrainFaceWorldPolygon(x, y, faceDesc.semanticFace, faceDesc.zStart, faceDesc.zEnd);
  if (!worldPts.length) return null;
  var screenPts = screenPointsFromWorldFace(worldPts);
  var normal = getSemanticFaceNormal(faceDesc.semanticFace);
  var appearance = getTerrainFaceAppearanceForRender(model, x, y, faceDesc);
  var litFill = appearance.colorMode === 'debug-semantic' ? appearance.fill : rgbToCss(litFaceColor(appearance.fillRgb, worldPts, normal, null));
  var stroke = appearance.stroke;
  var centroid = averageScreenPoint(screenPts);
  var cellZ = Math.max(0, Number(faceDesc.layerZ != null ? faceDesc.layerZ : (faceDesc.zEnd - 1)) || 0);
  var orderMeta = computeViewAwareSortMeta({ x:x, y:y, z: cellZ }, 1, viewRotation);
  var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
  var item = {
    id: 'terrain-face-' + [model && model.activeTerrainBatchId || 'terrain', x, y, faceDesc.semanticFace, faceDesc.zStart, faceDesc.zEnd].join('-'),
    kind: 'voxel-face',
    sortKey: Number(orderMeta.sortKey || 0),
    tie: Number(orderMeta.tie || 0) + ((faceTiePrio[faceDesc.screenFace] || 0) * 0.01),
    instanceId: null,
    prefabId: 'terrain-column',
    generatedBy: 'terrain-generator',
    terrainBatchId: model && model.activeTerrainBatchId || null,
    terrainCellX: x,
    terrainCellY: y,
    renderPath: 'terrain-voxel-face',
    cacheViewRotation: viewRotation,
    drawScreenPosition: { x: Math.round(centroid.x || 0), y: Math.round(centroid.y || 0) },
    semanticFace: faceDesc.semanticFace,
    screenFace: faceDesc.screenFace,
    depthKey: faceDesc.depthKey != null ? faceDesc.depthKey : 0,
    points: screenPts,
    fill: litFill,
    stroke: stroke,
    texture: appearance.semanticTextureSlot || null,
    textureColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
    semanticTextureSlot: appearance.semanticTextureSlot || null,
    semanticTextureSlotColor: appearance.semanticTextureSlot && appearance.semanticTextureSlot.color ? appearance.semanticTextureSlot.color : null,
    width: 1,
    shadowOverlays: xrayFaces ? [] : buildVoxelFaceShadowOverlays(worldPts, normal, null),
    worldPts: worldPts,
    worldBounds: { minX: x, minY: y, maxX: x + 1, maxY: y + 1 },
    cellX: x,
    cellY: y,
    cellZ: cellZ,
    faceKey: ['terrain', x, y, faceDesc.semanticFace, cellZ].join('|'),
    terrainColorMode: appearance.colorMode,
    terrainMaterialId: appearance.terrainMaterialId || null,
    terrainPatternDescriptor: appearance.terrainPatternDescriptor || null,
    terrainPatternOpacity: appearance.terrainPatternDescriptor && Number.isFinite(Number(appearance.terrainPatternDescriptor.opacity)) ? Number(appearance.terrainPatternDescriptor.opacity) : null,
    terrainDebugPalette: appearance.paletteUsed || null,
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    draw: function () { drawCachedVoxelFaceRenderable(this); }
  };
  return item;
}

function buildTerrainColumnRenderablesForScope(columnEntry, model, viewRotation) {
  var x = Number(columnEntry && columnEntry.x || 0);
  var y = Number(columnEntry && columnEntry.y || 0);
  var faces = Array.isArray(columnEntry && columnEntry.faces) ? columnEntry.faces : [];
  var mapping = getVisibleSemanticMappingForRender(0, viewRotation);
  var visibleByScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : { top:'top', lowerLeft:'south', lowerRight:'east' };
  var screenFaceBySemantic = {
    top: 'top',
    east: visibleByScreen.lowerRight === 'east' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'east' ? 'lowerLeft' : null),
    south: visibleByScreen.lowerRight === 'south' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'south' ? 'lowerLeft' : null),
    west: visibleByScreen.lowerRight === 'west' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'west' ? 'lowerLeft' : null),
    north: visibleByScreen.lowerRight === 'north' ? 'lowerRight' : (visibleByScreen.lowerLeft === 'north' ? 'lowerLeft' : null)
  };
  var out = [];
  for (var i = 0; i < faces.length; i++) {
    var face = faces[i];
    var screenFace = face.semanticFace === 'top' ? 'top' : screenFaceBySemantic[face.semanticFace];
    if (!screenFace) continue;
    var renderable = buildTerrainFaceRenderableItem(x, y, {
      semanticFace: face.semanticFace,
      zStart: face.zStart,
      zEnd: face.zEnd,
      layerZ: face.layerZ,
      unit: face.unit !== false,
      worldPts: face.worldPts,
      screenFace: screenFace,
      depthKey: face.semanticFace === 'top' ? 3 : (screenFace === 'lowerLeft' ? 2 : 1)
    }, viewRotation, model);
    if (renderable) out.push(renderable);
  }
  return out;
}

function buildScopedTerrainRenderables(model, scope, viewRotation) {
  if (!terrainModelHasData(model)) {
    return { renderables: [], stats: { terrainCellCount: 0, terrainColumnCount: 0, terrainExpandedVoxelInstanceCount: 0, terrainUsesColumnModel: false, visibleColumnCount: 0, visibleChunkCount: 0, culledColumnCount: 0, culledChunkCount: 0, terrainBuildWasScoped: true, logicalVoxelCountEstimated: 0, visibleTopFaceCount: 0, visibleSideFaceCount: 0, internalVoxelSkippedCount: 0, hiddenInternalSurfaceSkippedCount: 0, renderableCount: 0, buildMode: 'cached' } };
  }
  var buildStart = perfNow();
  var cacheReset = invalidateTerrainChunkRenderCacheForModel(model);
  var chunkCoords = getVisibleTerrainChunkCoordsForScope(model, scope);
  var renderables = [];
  if (cacheReset) {
    var prewarmChunkSize = getTerrainChunkSizeForRender(model);
    var maxChunkX = Math.max(0, Math.ceil((Number(model.width) || 0) / prewarmChunkSize));
    var maxChunkY = Math.max(0, Math.ceil((Number(model.height) || 0) / prewarmChunkSize));
    for (var pcx = 0; pcx < maxChunkX; pcx++) {
      for (var pcy = 0; pcy < maxChunkY; pcy++) {
        getTerrainChunkSurfaceSources(model, { chunkX: pcx, chunkY: pcy, key: getTerrainChunkKey(pcx, pcy) }, scope);
      }
    }
  }
  var visibleColumnCount = 0;
  var visibleTopFaceCount = 0;
  var visibleSideFaceCount = 0;
  var internalVoxelSkippedCount = 0;
  var hiddenInternalSurfaceSkippedCount = 0;
  var visibleChunkCount = chunkCoords.length;
  var rebuiltChunkCount = 0;
  var cacheHitCount = 0;
  var cacheMissCount = 0;
  var totalChunks = Math.max(0, Math.ceil((Number(model.width) || 0) / getTerrainChunkSizeForRender(model)) * Math.ceil((Number(model.height) || 0) / getTerrainChunkSizeForRender(model)));
  for (var i = 0; i < chunkCoords.length; i++) {
    var chunkResult = getTerrainChunkSurfaceSources(model, chunkCoords[i], scope);
    var entry = chunkResult.entry;
    if (chunkResult.cacheHit) cacheHitCount += 1;
    else cacheMissCount += 1;
    if (chunkResult.rebuilt) rebuiltChunkCount += 1;
    visibleColumnCount += Number(entry && entry.visibleColumnCount || 0);
    visibleTopFaceCount += Number(entry && entry.visibleTopFaceCount || 0);
    visibleSideFaceCount += Number(entry && entry.visibleSideFaceCount || 0);
    internalVoxelSkippedCount += Number(entry && entry.internalVoxelSkippedCount || 0);
    hiddenInternalSurfaceSkippedCount += Number(entry && entry.hiddenInternalSurfaceSkippedCount || 0);
    var batched = buildTerrainChunkBatchedRenderables(entry, model, viewRotation);
    for (var j = 0; j < batched.length; j++) renderables.push(batched[j]);
  }
  var generatedCellCount = model && model.lastSummary ? Number(model.lastSummary.generatedCellCount || 0) : 0;
  var generatedVoxelCount = model && model.lastSummary ? Number(model.lastSummary.generatedVoxelCount || 0) : 0;
  var terrainOwnedDeltaBlockCount = model ? Number(model.terrainOwnedDeltaBlockCount || 0) : 0;
  var existingManualBlockCount = model ? Number(model.existingManualBlockCount || 0) : 0;
  var overlappingColumnCount = model ? Number(model.overlappingColumnCount || 0) : 0;
  var colorMode = getTerrainColorModeForRender();
  var mapping = getVisibleSemanticMappingForRender(0, viewRotation);
  var byScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : { top: 'top', lowerLeft: 'south', lowerRight: 'east' };
  var palette = getTerrainSemanticDebugPalette();
  var terrainFaceColorSummary = {
    terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null,
    colorMode: colorMode,
    terrainDebugFaceColorsEnabled: colorMode === 'debug-semantic',
    terrainPaletteSource: colorMode === 'debug-semantic' ? 'item-facing-core.defaultSemanticTextureMap' : 'terrain-base-face-colors',
    manualBlockPaletteSource: 'item-facing-core.defaultSemanticTextureMap',
    paletteExactlyShared: colorMode === 'debug-semantic',
    usesSemanticFaceColors: false,
    usesSemanticTextures: colorMode === 'debug-semantic',
    topColor: colorMode === 'debug-semantic' ? palette[byScreen.top || 'top'] || palette.top : getTerrainBaseFaceColorsForRender(model, 0, 0).top,
    lowerLeftColor: colorMode === 'debug-semantic' ? palette[byScreen.lowerLeft || 'south'] || palette.south : getTerrainBaseFaceColorsForRender(model, 0, 0).south,
    lowerRightColor: colorMode === 'debug-semantic' ? palette[byScreen.lowerRight || 'east'] || palette.east : getTerrainBaseFaceColorsForRender(model, 0, 0).east,
    semanticFacePaletteUsed: colorMode === 'debug-semantic'
  };
  logItemRotationPrototype('terrain-face-color-summary', terrainFaceColorSummary);
  logItemRotationPrototype('terrain-face-color-mode-summary', terrainFaceColorSummary);
  logItemRotationPrototype('terrain-render-palette-check', terrainFaceColorSummary);
  var camera = (typeof runtimeState !== 'undefined' && runtimeState && runtimeState.camera) ? runtimeState.camera : { x: 0, y: 0 };
  var cameraMoveKey = JSON.stringify({ batch: model && model.activeTerrainBatchId || null, x: Number(camera.x || 0).toFixed(2), y: Number(camera.y || 0).toFixed(2), zoom: Number(scope && scope.zoom || 1).toFixed(3), rot: Number(viewRotation || 0).toFixed(3) });
  var previousCameraMoveState = __lastTerrainCameraMoveState || { key: '', terrainBatchId: null };
  var cameraMoved = previousCameraMoveState.key && previousCameraMoveState.key !== cameraMoveKey && previousCameraMoveState.terrainBatchId === (model && model.activeTerrainBatchId || null);
  var stats = {
    terrainCellCount: Number(model.width || 0) * Number(model.height || 0),
    terrainColumnCount: generatedCellCount,
    terrainExpandedVoxelInstanceCount: 0,
    terrainUsesColumnModel: true,
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    terrainVisibleUnitFaceCount: renderables.length,
    visibleColumnCount: visibleColumnCount,
    visibleChunkCount: visibleChunkCount,
    culledColumnCount: Math.max(0, generatedCellCount - visibleColumnCount),
    culledChunkCount: Math.max(0, totalChunks - visibleChunkCount),
    logicalVoxelCountEstimated: generatedVoxelCount,
    terrainOwnedDeltaBlockCount: terrainOwnedDeltaBlockCount,
    existingManualBlockCount: existingManualBlockCount,
    overlappingColumnCount: overlappingColumnCount,
    mergedWithExistingOccupancy: model && model.mergedWithExistingOccupancy === true,
    stackedOnExistingBlocks: model && model.stackedOnExistingBlocks === true,
    visibleTopFaceCount: visibleTopFaceCount,
    visibleSideFaceCount: visibleSideFaceCount,
    internalVoxelSkippedCount: internalVoxelSkippedCount,
    hiddenInternalSurfaceSkippedCount: hiddenInternalSurfaceSkippedCount,
    terrainBuildWasScoped: true,
    surfaceOnlyRenderingEnabled: scope && scope.surfaceOnlyRenderingEnabled !== false,
    renderableCount: renderables.length,
    terrainBatchDrawCount: renderables.length,
    terrainVisibleFaceCount: visibleTopFaceCount + visibleSideFaceCount,
    buildMode: cacheReset ? 'full' : (rebuiltChunkCount > 0 ? 'dirty-chunk' : 'cached'),
    buildMs: Math.max(0, perfNow() - buildStart),
    chunkSize: getTerrainChunkSizeForRender(model),
    chunkCount: totalChunks,
    cachedChunkCount: __terrainChunkRenderCache.chunks.size,
    visibleChunkCount: visibleChunkCount,
    rebuiltChunkCount: rebuiltChunkCount,
    dirtyChunkCount: Math.max(__terrainChunkRenderCache.dirtyChunkKeys.size, model && Array.isArray(model.dirtyChunkKeys) ? model.dirtyChunkKeys.length : 0),
    cacheHitCount: cacheHitCount,
    cacheMissCount: cacheMissCount,
    terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null,
    allHeightsAreIntegers: true,
    unitHeightStep: 1,
    renderedAsDiscreteBlockLayers: true,
    cameraMoveTriggeredTerrainRebuild: !!(cameraMoved && rebuiltChunkCount > 0),
    reusedChunkCount: Math.max(0, visibleChunkCount - rebuiltChunkCount),
    cullingOnly: !!(cameraMoved && rebuiltChunkCount === 0)
  };
  __lastTerrainCameraMoveState = { key: cameraMoveKey, terrainBatchId: model && model.activeTerrainBatchId ? model.activeTerrainBatchId : null };
  __terrainChunkRenderCache.summary = stats;
  __terrainRuntimeSummary = stats;
  logItemRotationPrototype('terrain-logic-summary', {
    terrainCellCount: stats.terrainCellCount,
    terrainColumnCount: Number(stats.terrainColumnCount || 0),
    terrainExpandedVoxelInstanceCount: 0,
    terrainUsesColumnModel: true
  });
  logItemRotationPrototype('terrain-render-pipeline-check', {
    terrainUsesColumnModel: true,
    terrainUsesOriginalVoxelFacePipeline: true,
    terrainUsesCustomColumnSurfacePipeline: false,
    terrainExpandedVoxelInstanceCount: 0,
    terrainVisibleUnitFaceCount: Number(stats.terrainVisibleUnitFaceCount || 0),
    terrainVisibleColumnCount: Number(stats.visibleColumnCount || 0)
  });
  logItemRotationPrototype('terrain-block-quantization-check', {
    terrainBatchId: stats.terrainBatchId,
    minHeightObserved: model && model.lastSummary ? Number(model.lastSummary.minHeightObserved || 0) : 0,
    maxHeightObserved: model && model.lastSummary ? Number(model.lastSummary.maxHeightObserved || 0) : 0,
    allHeightsAreIntegers: true,
    unitHeightStep: 1,
    renderedAsDiscreteBlockLayers: true
  });
  logItemRotationPrototype('terrain-camera-move-cost-summary', {
    cameraMoveTriggeredTerrainRebuild: !!stats.cameraMoveTriggeredTerrainRebuild,
    rebuiltChunkCount: Number(stats.rebuiltChunkCount || 0),
    reusedChunkCount: Number(stats.reusedChunkCount || 0),
    visibleChunkCount: Number(stats.visibleChunkCount || 0),
    cullingOnly: !!stats.cullingOnly,
    cameraPanEventId: cameraMoveKey
  });
  logItemRotationPrototype('camera-pan-performance-summary', {
    cameraPanActive: !!cameraMoved,
    cameraMoveTriggeredTerrainRebuild: !!stats.cameraMoveTriggeredTerrainRebuild,
    rebuiltChunkCount: Number(stats.rebuiltChunkCount || 0),
    reusedChunkCount: Number(stats.reusedChunkCount || 0),
    cullingOnly: !!stats.cullingOnly,
    panFrameCostMs: Number(stats.buildMs || 0)
  });
  logItemRotationPrototype('terrain-world-integration-summary', {
    terrainBatchId: stats.terrainBatchId,
    terrainTargetColumnCount: Number(stats.terrainColumnCount || 0),
    terrainOwnedDeltaBlockCount: Number(stats.terrainOwnedDeltaBlockCount || 0),
    mergedWithExistingOccupancy: stats.mergedWithExistingOccupancy === true,
    existingManualBlockCount: Number(stats.existingManualBlockCount || 0),
    overlappingColumnCount: Number(stats.overlappingColumnCount || 0),
    stackedOnExistingBlocks: stats.stackedOnExistingBlocks === true
  });
  logItemRotationPrototype('terrain-build-scope-summary', {
    visibleColumnCount: Number(stats.visibleColumnCount || 0),
    visibleChunkCount: Number(stats.visibleChunkCount || 0),
    culledColumnCount: Number(stats.culledColumnCount || 0),
    culledChunkCount: Number(stats.culledChunkCount || 0),
    terrainBuildWasScoped: true
  });
  logItemRotationPrototype('terrain-chunk-cache-summary', {
    terrainBatchId: stats.terrainBatchId,
    chunkSize: stats.chunkSize,
    chunkCount: stats.chunkCount,
    cachedChunkCount: stats.cachedChunkCount,
    visibleChunkCount: stats.visibleChunkCount,
    rebuiltChunkCount: stats.rebuiltChunkCount,
    dirtyChunkCount: stats.dirtyChunkCount,
    cacheHitCount: stats.cacheHitCount,
    cacheMissCount: stats.cacheMissCount
  });
  logItemRotationPrototype('terrain-render-build-summary', {
    terrainBatchId: stats.terrainBatchId,
    terrainColumnCount: stats.terrainColumnCount,
    visibleColumnCount: stats.visibleColumnCount,
    renderableCount: stats.renderableCount,
    buildMode: stats.buildMode,
    terrainBuildMs: stats.buildMs
  });
  return { renderables: renderables, stats: stats };
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

function getMainCameraVisibleBoxesForRender(currentViewRotation) {
  return filterBoxesForMainCameraScope(boxes, getMainCameraRenderScope(currentViewRotation));
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

function buildMainViewRotationSourceCheckPayload(currentViewRotationFromRender, currentViewRotationFromCache, geometrySignature) {
  var runtimeInfo = readRuntimeMainEditorViewRotation();
  var runtimeRotation = runtimeInfo && runtimeInfo.hasViewRotation ? normalizeMainEditorViewRotationValue(runtimeInfo.viewRotation) : 0;
  var parsedGeometry = null;
  try { parsedGeometry = geometrySignature ? JSON.parse(geometrySignature) : null; } catch (_) { parsedGeometry = null; }
  var geometryRotation = parsedGeometry && typeof parsedGeometry.viewRotation === 'number' ? normalizeMainEditorViewRotationValue(parsedGeometry.viewRotation) : runtimeRotation;
  var cacheRotation = typeof currentViewRotationFromCache === 'number' ? normalizeMainEditorViewRotationValue(currentViewRotationFromCache) : runtimeRotation;
  var legacyRotation = readLegacyMainEditorViewRotation();
  var aligned = runtimeRotation === normalizeMainEditorViewRotationValue(currentViewRotationFromRender) && runtimeRotation === cacheRotation && runtimeRotation === geometryRotation;
  return {
    currentViewRotationFromRuntime: runtimeRotation,
    currentViewRotationFromRender: normalizeMainEditorViewRotationValue(currentViewRotationFromRender),
    currentViewRotationFromCache: cacheRotation,
    currentViewRotationFromGeometrySignature: geometryRotation,
    legacyEditorRotation: legacyRotation,
    allRotationSourcesAligned: aligned,
    legacyEditorRotationIsolated: legacyRotation == null || legacyRotation === runtimeRotation
  };
}

function getViewRotationCoreApi() {
  try {
    return (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.viewRotationCore)
      ? window.App.domain.viewRotationCore
      : (typeof window !== 'undefined' ? window.__VIEW_ROTATION_CORE__ || null : null);
  } catch (_) {
    return (typeof window !== 'undefined' ? window.__VIEW_ROTATION_CORE__ || null : null);
  }
}

function computeViewAwareSortMeta(point, height, viewRotation) {
  var api = getViewRotationCoreApi();
  if (api && typeof api.computeRenderableSortMeta === 'function') {
    return api.computeRenderableSortMeta({
      x: point && point.x,
      y: point && point.y,
      z: point && point.z,
      h: height,
      viewRotation: viewRotation
    });
  }
  return {
    sortKey: (Number(point && point.x) || 0) + (Number(point && point.y) || 0) + (Number(point && point.z) || 0) + (Number(height) || 0),
    tie: ((Number(point && point.z) || 0) * 100000) + ((Number(point && point.y) || 0) * 100) + (Number(point && point.x) || 0)
  };
}

function logRenderDependency(name, detail) {
  logItemRotationPrototype('render-dependency', Object.assign({ dependency: String(name || 'unknown') }, detail || {}));
}

function logItemRotationPrototype(kind, payload) {
  try {
    var api = (typeof window !== 'undefined' && window.__ITEM_ROTATION_DIAGNOSTIC__) ? window.__ITEM_ROTATION_DIAGNOSTIC__ : null;
    if (api && typeof api.record === 'function') api.record(kind, payload || null);
  } catch (_) {}
  try { if (typeof detailLog === 'function') detailLog('[item-rotation] ' + String(kind || 'event') + ' ' + JSON.stringify(payload || {})); } catch (_) {}
}

var __mainFramePlanSeq = 0;
var __lastMainRenderableBuildStats = {
  currentViewRotation: 0,
  staticRenderableCount: 0,
  dynamicRenderableCount: 0,
  renderableCount: 0,
  reason: 'startup'
};


var __playerMoveFastPathDiagState = {
  frameCount: 0,
  emittedCount: 0,
  lastSignature: '',
  lastPlayerInteractionCellKey: '',
  lastViewRotation: null,
  lastStaticOrderSignature: '',
  lastStaticRenderableCount: 0,
  lastDynamicRenderableCount: 0,
  warmStaticOrderAvailable: false
};


var __playerMoveFastPathRuntimeState = {
  staticRenderablesForSupportTop: null,
  staticOrderSignature: '',
  cacheSignature: '',
  geometrySignature: '',
  viewRotation: null,
  playerInteractionCellKey: '',
  cameraChunkSignature: '',
  chunkSize: 16,
  occupancyCacheVersion: null,
  staticRenderableCount: 0,
  visibleStaticPacketCount: 0,
  visibleChunkCount: 0,
  stableDemergeMode: '',
  stableDemergeSplitPacketCount: 0,
  stableDemergeCreatedFaceCount: 0,
  stableDemergeCacheHitCount: 0,
  stableDemergeCacheMissCount: 0,
  supportTopSortOverrideCount: 0,
  hitCount: 0,
  missCount: 0,
  emittedCount: 0,
  lastRuntimeSignature: '',
  lastRejectReasons: []
};

function getMainEditorModeForPlayerMoveFastPathDiag() {
  try {
    var selectors = (typeof App !== 'undefined' && App && App.state && App.state.selectors) ? App.state.selectors : null;
    if (selectors && typeof selectors.getEditorMode === 'function') return String(selectors.getEditorMode() || 'view');
  } catch (_) {}
  try {
    if (typeof editor !== 'undefined' && editor && editor.mode != null) return String(editor.mode || 'view');
  } catch (_) {}
  return 'view';
}

function getPlayerMoveFastPathStaticOrderSignature(order, currentViewRotation) {
  return requireRenderOrderCoreForRender().getRenderableStaticOrderSignature(
    order,
    currentViewRotation,
    normalizeMainEditorViewRotationValue
  );
}

function shouldEmitPlayerMoveFastPathDiag(signature, candidateEligible, rejectReasons) {
  __playerMoveFastPathDiagState.frameCount += 1;
  if (__playerMoveFastPathDiagState.emittedCount < 12) return true;
  if (__playerMoveFastPathDiagState.lastSignature !== signature) return true;
  if (candidateEligible === true && (__playerMoveFastPathDiagState.frameCount % 30) === 0) return true;
  if (rejectReasons && rejectReasons.length && (__playerMoveFastPathDiagState.frameCount % 90) === 0) return true;
  return false;
}

function emitPlayerMoveFastPathEligibilityDiagnostic(payload) {
  try {
    if (typeof detailLog === 'function') detailLog('[PLAYER-MOVE-FASTPATH-ELIGIBILITY] ' + JSON.stringify(payload || {}));
    else if (typeof pushLog === 'function') pushLog('[PLAYER-MOVE-FASTPATH-ELIGIBILITY] ' + JSON.stringify(payload || {}));
    else if (typeof console !== 'undefined' && console.log) console.log('[PLAYER-MOVE-FASTPATH-ELIGIBILITY]', payload || {});
  } catch (_) {}
}

function evaluatePlayerMoveFastPathEligibilityForRender(framePlanId, order, currentViewRotation, interactionState) {
  var stats = __lastMainRenderableBuildStats || {};
  var rejectReasons = [];
  var warnings = [];
  var editorModeValue = getMainEditorModeForPlayerMoveFastPathDiag();
  var playerObj = (typeof player !== 'undefined' && player && typeof player === 'object') ? player : null;
  var playerInteractionCellKey = playerObj ? buildStableLocalDemergeInteractionCellKey(playerObj) : 'none';
  var currentStaticOrderSignature = getPlayerMoveFastPathStaticOrderSignature(order, currentViewRotation);
  var staticOrderChanged = __playerMoveFastPathDiagState.lastStaticOrderSignature !== '' && __playerMoveFastPathDiagState.lastStaticOrderSignature !== currentStaticOrderSignature;
  var playerInteractionCellChanged = __playerMoveFastPathDiagState.lastPlayerInteractionCellKey !== '' && __playerMoveFastPathDiagState.lastPlayerInteractionCellKey !== playerInteractionCellKey;
  var viewRotationChanged = __playerMoveFastPathDiagState.lastViewRotation != null && Number(__playerMoveFastPathDiagState.lastViewRotation) !== Number(currentViewRotation);
  var dynamicRenderableCount = Number(stats.dynamicRenderableCount || 0);
  var staticRenderableCount = Number(stats.staticRenderableCount || 0);
  var orderLength = Array.isArray(order) ? order.length : 0;

  if (editorModeValue !== 'view') rejectReasons.push('editorModeNotView');
  if (typeof SHOW_PLAYER !== 'undefined' && SHOW_PLAYER !== true) rejectReasons.push('playerHidden');
  if (!playerObj) rejectReasons.push('playerMissing');
  if (dynamicRenderableCount !== 1) rejectReasons.push('dynamicRenderableCountNotOne');
  if (staticRenderableCount <= 0) rejectReasons.push('staticOrderEmpty');
  if (stats.staticCacheRebuiltThisFrame === true) rejectReasons.push('staticCacheRebuiltThisFrame');
  if (stats.occupancyRebuiltThisFrame === true) rejectReasons.push('occupancyRebuiltThisFrame');
  if (typeof isMainEditorViewAnimatingForRender === 'function' && isMainEditorViewAnimatingForRender()) rejectReasons.push('viewRotationAnimating');
  if (viewRotationChanged) rejectReasons.push('viewRotationChanged');
  if (playerInteractionCellChanged) rejectReasons.push('playerInteractionCellChanged');
  if (staticOrderChanged) warnings.push('staticOrderSignatureChanged');
  if (__playerMoveFastPathDiagState.warmStaticOrderAvailable !== true) rejectReasons.push('staticOrderCacheMissing');
  if (stats.staticCacheBuildMs != null && Number(stats.staticCacheBuildMs || 0) > 4) warnings.push('staticCacheBuildMsHigh');
  if (stats.staticPacketSortMs != null && Number(stats.staticPacketSortMs || 0) > 4) warnings.push('mergeSortedRenderablesHigh');

  var candidateEligible = rejectReasons.length === 0;
  var signature = [
    candidateEligible ? 'eligible' : 'blocked',
    rejectReasons.join(','),
    warnings.join(','),
    editorModeValue,
    playerInteractionCellKey,
    Number(currentViewRotation || 0),
    staticRenderableCount,
    dynamicRenderableCount,
    Number(stats.staticCacheRebuiltThisFrame === true ? 1 : 0),
    Number(stats.occupancyRebuiltThisFrame === true ? 1 : 0)
  ].join('|');

  var fastPathUsedThisFrame = stats.playerMoveFastPathUsed === true;
  var payload = {
    phase: fastPathUsedThisFrame ? 'step3-active' : 'step2-diagnostic-only',
    framePlanId: String(framePlanId || ''),
    implementedActive: fastPathUsedThisFrame,
    actuallyUsedThisFrame: fastPathUsedThisFrame,
    candidateEligible: candidateEligible,
    wouldUseFastPathIfImplemented: candidateEligible,
    rejectReasons: rejectReasons,
    warnings: warnings,
    editorMode: editorModeValue,
    currentViewRotation: normalizeMainEditorViewRotationValue(currentViewRotation),
    viewRotationChanged: viewRotationChanged,
    playerInteractionCellKey: playerInteractionCellKey,
    playerInteractionCellChanged: playerInteractionCellChanged,
    staticOrderCacheWarm: __playerMoveFastPathDiagState.warmStaticOrderAvailable === true,
    staticOrderSignatureChanged: staticOrderChanged,
    staticRenderableCount: staticRenderableCount,
    dynamicRenderableCount: dynamicRenderableCount,
    renderableCount: Number(orderLength || 0),
    visibleStaticPacketCount: Number(stats.visibleStaticPacketCount || 0),
    visibleChunkCount: Number(stats.visibleChunkCount || 0),
    staticCacheRebuiltThisFrame: stats.staticCacheRebuiltThisFrame === true,
    occupancyRebuiltThisFrame: stats.occupancyRebuiltThisFrame === true,
    staticCacheBuildMs: Number(stats.staticCacheBuildMs || 0),
    frameBuildMs: Number(stats.frameBuildMs || 0),
    mergeSortedRenderablesMs: Number(stats.staticPacketSortMs || 0),
    stableDemergePlayerInteractionCellKey: String(stats.stableDemergePlayerInteractionCellKey || playerInteractionCellKey),
    stableDemergeCacheHit: stats.stableDemergeCacheHit === true,
    stableDemergeCacheHitCount: Number(stats.stableDemergeCacheHitCount || 0),
    stableDemergeCacheMissCount: Number(stats.stableDemergeCacheMissCount || 0),
    stableDemergeSplitPacketCount: Number(stats.stableDemergeSplitPacketCount || 0),
    stableDemergeCreatedFaceCount: Number(stats.stableDemergeCreatedFaceCount || 0),
    interactionStateActive: !!interactionState,
    playerMoveFastPathHitCount: Number(stats.playerMoveFastPathHitCount || 0),
    playerMoveFastPathMissCount: Number(stats.playerMoveFastPathMissCount || 0),
    playerMoveFastPathRejectReasons: Array.isArray(stats.playerMoveFastPathRejectReasons) ? stats.playerMoveFastPathRejectReasons.slice(0, 8) : []
  };

  if (shouldEmitPlayerMoveFastPathDiag(signature, candidateEligible, rejectReasons)) {
    __playerMoveFastPathDiagState.emittedCount += 1;
    __playerMoveFastPathDiagState.lastSignature = signature;
    emitPlayerMoveFastPathEligibilityDiagnostic(payload);
  }

  __playerMoveFastPathDiagState.lastPlayerInteractionCellKey = playerInteractionCellKey;
  __playerMoveFastPathDiagState.lastViewRotation = normalizeMainEditorViewRotationValue(currentViewRotation);
  __playerMoveFastPathDiagState.lastStaticOrderSignature = currentStaticOrderSignature;
  __playerMoveFastPathDiagState.lastStaticRenderableCount = staticRenderableCount;
  __playerMoveFastPathDiagState.lastDynamicRenderableCount = dynamicRenderableCount;
  __playerMoveFastPathDiagState.warmStaticOrderAvailable = staticRenderableCount > 0 && dynamicRenderableCount === 1 && stats.staticCacheRebuiltThisFrame !== true && stats.occupancyRebuiltThisFrame !== true;
  return payload;
}


function buildPlayerMoveFastPathCameraChunkSignature(cameraScope, chunkSize) {
  var scope = cameraScope && typeof cameraScope === 'object' ? cameraScope : null;
  var bounds = scope && scope.cullingWorldBounds ? scope.cullingWorldBounds : null;
  var size = Math.max(1, Math.round(Number(chunkSize || 16) || 16));
  if (!bounds) return 'none';
  var minX = Number(bounds.minX != null ? bounds.minX : bounds.x0 != null ? bounds.x0 : bounds.left != null ? bounds.left : 0);
  var maxX = Number(bounds.maxX != null ? bounds.maxX : bounds.x1 != null ? bounds.x1 : bounds.right != null ? bounds.right : minX);
  var minY = Number(bounds.minY != null ? bounds.minY : bounds.y0 != null ? bounds.y0 : bounds.top != null ? bounds.top : 0);
  var maxY = Number(bounds.maxY != null ? bounds.maxY : bounds.y1 != null ? bounds.y1 : bounds.bottom != null ? bounds.bottom : minY);
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) return 'invalid';
  return [
    Math.floor(minX / size),
    Math.floor(maxX / size),
    Math.floor(minY / size),
    Math.floor(maxY / size),
    Number(scope && scope.zoom != null ? scope.zoom : 1),
    scope && scope.cameraCullingEnabled === false ? 0 : 1,
    scope && scope.surfaceOnlyRenderingEnabled === false ? 0 : 1
  ].join('|');
}

function buildPlayerAvatarRenderableForFastPath(viewRotation, cameraScope) {
  if (typeof SHOW_PLAYER !== 'undefined' && SHOW_PLAYER !== true) return null;
  var playerObj = (typeof player !== 'undefined' && player && typeof player === 'object') ? player : null;
  if (!playerObj) return null;
  if (cameraScope && !pointWithinWorldBoundsXY(playerObj.x, playerObj.y, cameraScope.cullingWorldBounds)) return null;
  var normalizedViewRotation = normalizeMainEditorViewRotationValue(viewRotation);
  var playerZ = Number(playerObj && playerObj.z != null ? playerObj.z : 0);
  var domainApi = getDomainSceneCoreApi();
  var playerSortMeta = (domainApi && typeof domainApi.computePlayerActorRenderableSort === 'function')
    ? domainApi.computePlayerActorRenderableSort({ player: playerObj, viewRotation: normalizedViewRotation })
    : Object.assign({ tie: 700000 }, computeViewAwareSortMeta({ x: playerObj.x, y: playerObj.y, z: playerZ }, 0, normalizedViewRotation));
  return {
    id: 'player-avatar',
    kind: 'player-avatar',
    sortMode: 'player-foot-anchor',
    sortKey: Number(playerSortMeta.sortKey || 0),
    tie: Number(playerSortMeta.tie || 0),
    depthAnchor: playerSortMeta.depthAnchor || { x: Number(playerObj.x || 0), y: Number(playerObj.y || 0), z: playerZ },
    worldX: Number(playerObj.x || 0),
    worldY: Number(playerObj.y || 0),
    worldZ: playerZ,
    playerMoveFastPathDynamic: true,
    draw: () => drawPlayerAvatar(),
  };
}

function insertSingleDynamicRenderableIntoSortedOrder(staticRenderables, dynamicRenderable) {
  return requireRenderOrderCoreForRender().insertRenderableIntoSortedOrder(
    staticRenderables,
    dynamicRenderable,
    compareRenderablesByDomain
  );
}

function sortRenderablesByOrderForRender(renderables) {
  return requireRenderOrderCoreForRender().sortRenderablesByOrder(
    renderables,
    compareRenderablesByDomain
  );
}

function emitPlayerMoveFastPathRuntimeDiagnostic(payload, forceLog) {
  try {
    var safe = payload && typeof payload === 'object' ? payload : {};
    var signature = [
      safe.used === true ? 'used' : 'blocked',
      Array.isArray(safe.rejectReasons) ? safe.rejectReasons.join(',') : '',
      String(safe.playerInteractionCellKey || ''),
      String(safe.cameraChunkSignature || ''),
      Number(safe.staticRenderableCount || 0),
      Number(safe.visibleChunkCount || 0)
    ].join('|');
    if (!forceLog && __playerMoveFastPathRuntimeState.emittedCount >= 12 && __playerMoveFastPathRuntimeState.lastRuntimeSignature === signature) return false;
    __playerMoveFastPathRuntimeState.emittedCount += 1;
    __playerMoveFastPathRuntimeState.lastRuntimeSignature = signature;
    var line = '[PLAYER-MOVE-FASTPATH-RUNTIME] ' + JSON.stringify(safe);
    if (typeof detailLog === 'function') detailLog(line);
    else if (typeof pushLog === 'function') pushLog(line);
    else if (typeof console !== 'undefined' && console.log) console.log(line);
    return true;
  } catch (_) { return false; }
}

function getStaticWorldChunkCacheSummaryForPlayerFastPath() {
  try {
    var api = getSharedStaticWorldChunkCacheApiForRender();
    if (api && typeof api.summarize === 'function') return api.summarize('player-move-fastpath-precheck') || null;
  } catch (_) {}
  return null;
}

function updatePlayerMoveFastPathStaticOrderCacheForRender(options) {
  var opts = options && typeof options === 'object' ? options : {};
  var staticBase = Array.isArray(opts.staticRenderablesForSupportTop) ? opts.staticRenderablesForSupportTop : [];
  var currentViewRotation = normalizeMainEditorViewRotationValue(opts.viewRotation);
  var playerObj = (typeof player !== 'undefined' && player && typeof player === 'object') ? player : null;
  var dynamicRenderableCount = Number(opts.dynamicRenderableCount || 0);
  if (!staticBase.length || !playerObj || dynamicRenderableCount !== 1) return false;
  var cameraScope = opts.cameraScope || null;
  var surfaceStats = opts.surfaceStats || {};
  var chunkSize = Number(surfaceStats.chunkSize || staticBoxRenderCache && staticBoxRenderCache.surfaceStats && staticBoxRenderCache.surfaceStats.chunkSize || 16);
  var playerInteractionCellKey = buildStableLocalDemergeInteractionCellKey(playerObj);
  __playerMoveFastPathRuntimeState.staticRenderablesForSupportTop = staticBase.slice();
  __playerMoveFastPathRuntimeState.staticOrderSignature = getPlayerMoveFastPathStaticOrderSignature(staticBase, currentViewRotation);
  __playerMoveFastPathRuntimeState.cacheSignature = String(staticBoxRenderCache && staticBoxRenderCache.cacheSignature || buildStaticWorldRenderSignature(currentViewRotation));
  __playerMoveFastPathRuntimeState.geometrySignature = String(staticBoxRenderCache && staticBoxRenderCache.geometrySignature || '');
  __playerMoveFastPathRuntimeState.viewRotation = currentViewRotation;
  __playerMoveFastPathRuntimeState.playerInteractionCellKey = playerInteractionCellKey;
  __playerMoveFastPathRuntimeState.cameraChunkSignature = buildPlayerMoveFastPathCameraChunkSignature(cameraScope, chunkSize);
  __playerMoveFastPathRuntimeState.chunkSize = Math.max(1, Math.round(chunkSize || 16));
  __playerMoveFastPathRuntimeState.occupancyCacheVersion = opts.occupancyCacheVersion != null ? Number(opts.occupancyCacheVersion || 0) : (staticBoxRenderCache && staticBoxRenderCache.occupancyCacheVersion != null ? Number(staticBoxRenderCache.occupancyCacheVersion || 0) : null);
  __playerMoveFastPathRuntimeState.staticRenderableCount = staticBase.length;
  __playerMoveFastPathRuntimeState.visibleStaticPacketCount = Number(surfaceStats.visibleStaticPacketCount || staticBase.length || 0);
  __playerMoveFastPathRuntimeState.visibleChunkCount = Number(surfaceStats.visibleChunkCount || 0);
  __playerMoveFastPathRuntimeState.stableDemergeMode = String(opts.stableDemergeResult && opts.stableDemergeResult.mode || 'none');
  __playerMoveFastPathRuntimeState.stableDemergeSplitPacketCount = Number(opts.stableDemergeResult && opts.stableDemergeResult.splitPacketCount || 0);
  __playerMoveFastPathRuntimeState.stableDemergeCreatedFaceCount = Number(opts.stableDemergeResult && opts.stableDemergeResult.createdFaceCount || 0);
  __playerMoveFastPathRuntimeState.stableDemergeCacheHitCount = Number(opts.stableDemergeResult && opts.stableDemergeResult.cacheHitCount || 0);
  __playerMoveFastPathRuntimeState.stableDemergeCacheMissCount = Number(opts.stableDemergeResult && opts.stableDemergeResult.cacheMissCount || 0);
  __playerMoveFastPathRuntimeState.supportTopSortOverrideCount = Number(opts.supportTopSortResult && opts.supportTopSortResult.overrideCount || 0);
  return true;
}

function tryBuildPlayerMoveFastPathFrameOrderForRender(framePlanId, currentViewRotation, interactionState) {
  var startAt = perfNow();
  var rejectReasons = [];
  var warnings = [];
  var cache = __playerMoveFastPathRuntimeState || {};
  var normalizedViewRotation = normalizeMainEditorViewRotationValue(currentViewRotation);
  var editorModeValue = getMainEditorModeForPlayerMoveFastPathDiag();
  var playerObj = (typeof player !== 'undefined' && player && typeof player === 'object') ? player : null;
  var playerInteractionCellKey = playerObj ? buildStableLocalDemergeInteractionCellKey(playerObj) : 'none';

  if (editorModeValue !== 'view') rejectReasons.push('editorModeNotView');
  if (typeof SHOW_PLAYER !== 'undefined' && SHOW_PLAYER !== true) rejectReasons.push('playerHidden');
  if (!playerObj) rejectReasons.push('playerMissing');
  if (!Array.isArray(cache.staticRenderablesForSupportTop) || !cache.staticRenderablesForSupportTop.length) rejectReasons.push('staticOrderCacheMissing');
  if (cache.viewRotation == null || Number(cache.viewRotation) !== Number(normalizedViewRotation)) rejectReasons.push('viewRotationChanged');
  if (cache.playerInteractionCellKey && cache.playerInteractionCellKey !== playerInteractionCellKey) rejectReasons.push('playerInteractionCellChanged');
  if (typeof isMainEditorViewAnimatingForRender === 'function' && isMainEditorViewAnimatingForRender()) rejectReasons.push('viewRotationAnimating');

  var currentSignature = '';
  try { currentSignature = String(buildStaticWorldRenderSignature(normalizedViewRotation)); } catch (_) { currentSignature = ''; }
  if (cache.cacheSignature && currentSignature && cache.cacheSignature !== currentSignature) rejectReasons.push('staticRenderSignatureChanged');
  if (staticBoxRenderCache && staticBoxRenderCache.cacheSignature && currentSignature && String(staticBoxRenderCache.cacheSignature) !== currentSignature) rejectReasons.push('staticCacheSignatureStale');
  if (staticBoxRenderCache && cache.geometrySignature && String(staticBoxRenderCache.geometrySignature || '') !== String(cache.geometrySignature || '')) rejectReasons.push('staticGeometrySignatureChanged');
  if (staticBoxRenderCache && staticBoxRenderCache.dirtyGeometry === true) rejectReasons.push('staticDirtyGeometry');
  if (staticBoxRenderCache && staticBoxRenderCache.dirtyLighting === true) rejectReasons.push('staticDirtyLighting');

  var sceneStaticWorldApi = getSceneStaticWorldCacheApiForRender();
  var sceneSnapshot = null;
  try { sceneSnapshot = sceneStaticWorldApi && typeof sceneStaticWorldApi.getSnapshot === 'function' ? sceneStaticWorldApi.getSnapshot() : null; } catch (_) { sceneSnapshot = null; }
  if (sceneSnapshot && Array.isArray(sceneSnapshot.dirtyChunkKeys) && sceneSnapshot.dirtyChunkKeys.length > 0) rejectReasons.push('sceneDirtyChunks');
  if (sceneSnapshot && cache.geometrySignature && sceneSnapshot.cacheVersion != null && String(sceneSnapshot.cacheVersion) !== String(cache.geometrySignature)) rejectReasons.push('sceneCacheVersionChanged');

  var chunkCacheSummary = getStaticWorldChunkCacheSummaryForPlayerFastPath();
  if (chunkCacheSummary && Number(chunkCacheSummary.dirtyChunkCount || 0) > 0) rejectReasons.push('staticChunkCacheDirty');

  var cameraScope = getMainCameraRenderScope(normalizedViewRotation);
  var cameraChunkSignature = buildPlayerMoveFastPathCameraChunkSignature(cameraScope, cache.chunkSize || 16);
  if (cache.cameraChunkSignature && cache.cameraChunkSignature !== cameraChunkSignature) rejectReasons.push('visibleChunkWindowChanged');

  var playerRenderable = null;
  if (!rejectReasons.length) {
    playerRenderable = buildPlayerAvatarRenderableForFastPath(normalizedViewRotation, cameraScope);
    if (!playerRenderable) rejectReasons.push('playerRenderableMissingOrCulled');
  }

  if (rejectReasons.length) {
    cache.missCount += 1;
    cache.lastRejectReasons = rejectReasons.slice();
    emitPlayerMoveFastPathRuntimeDiagnostic({
      phase: 'step3-active-guarded',
      framePlanId: String(framePlanId || ''),
      used: false,
      rejectReasons: rejectReasons,
      warnings: warnings,
      editorMode: editorModeValue,
      playerInteractionCellKey: playerInteractionCellKey,
      cameraChunkSignature: cameraChunkSignature,
      cachedCameraChunkSignature: String(cache.cameraChunkSignature || ''),
      staticRenderableCount: Number(cache.staticRenderableCount || 0),
      visibleChunkCount: Number(cache.visibleChunkCount || 0),
      hitCount: Number(cache.hitCount || 0),
      missCount: Number(cache.missCount || 0)
    }, cache.missCount <= 8);
    return { used: false, rejectReasons: rejectReasons, warnings: warnings };
  }

  var supportTopStartAt = perfNow();
  var supportTopSortResult = applyPlayerSupportTopSortOverrideToRenderables(cache.staticRenderablesForSupportTop, playerObj, normalizedViewRotation);
  var supportTopSortMs = Math.max(0, perfNow() - supportTopStartAt);
  var staticRenderables = supportTopSortResult && Array.isArray(supportTopSortResult.staticRenderables) ? supportTopSortResult.staticRenderables : cache.staticRenderablesForSupportTop;
  var insertStartAt = perfNow();
  var order = insertSingleDynamicRenderableIntoSortedOrder(staticRenderables, playerRenderable);
  var insertMs = Math.max(0, perfNow() - insertStartAt);
  var totalMs = Math.max(0, perfNow() - startAt);
  cache.hitCount += 1;
  cache.lastRejectReasons = [];

  __lastMainRenderableBuildStats = Object.assign({}, __lastMainRenderableBuildStats || {}, {
    frameBuildMs: Number(totalMs.toFixed ? totalMs.toFixed(3) : totalMs),
    staticBuildMs: 0,
    dynamicBuildMs: Number(insertMs.toFixed ? insertMs.toFixed(3) : insertMs),
    renderSourceBuildMs: Number(totalMs.toFixed ? totalMs.toFixed(3) : totalMs),
    visibilityFilterMs: 0,
    staticRenderableCount: Number(staticRenderables.length || 0),
    dynamicRenderableCount: 1,
    renderableCount: Number(order.length || 0),
    renderablesBeforeCulling: Number(order.length || 0),
    renderablesAfterCulling: Number(order.length || 0),
    objectsBeforeCulling: Number(order.length || 0),
    objectsAfterCulling: Number(order.length || 0),
    worldObjectCount: Number(order.length || 0),
    visibleSurfaceCount: Number(cache.visibleStaticPacketCount || staticRenderables.length || 0),
    hiddenInternalSurfaceSkippedCount: Number(__lastMainRenderableBuildStats && __lastMainRenderableBuildStats.hiddenInternalSurfaceSkippedCount || 0),
    totalBoxes: Number(boxes && boxes.length || 0),
    totalInstancesForSplit: Number(instances && instances.length || 0),
    visibleInstanceCount: Number(__lastMainRenderableBuildStats && __lastMainRenderableBuildStats.visibleInstanceCount || 0),
    visibleDynamicInstanceCount: 0,
    visibleInstances: Number(__lastMainRenderableBuildStats && __lastMainRenderableBuildStats.visibleInstances || 0),
    staticSkippedByDynamicLoop: Number(__lastMainRenderableBuildStats && __lastMainRenderableBuildStats.staticSkippedByDynamicLoop || 0),
    visibleChunkCount: Number(cache.visibleChunkCount || 0),
    visibleStaticPacketCount: Number(cache.visibleStaticPacketCount || staticRenderables.length || 0),
    rebuiltChunkCountThisFrame: 0,
    reusedChunkCountThisFrame: Number(__lastMainRenderableBuildStats && __lastMainRenderableBuildStats.reusedChunkCountThisFrame || 0),
    staticCacheRebuiltThisFrame: false,
    occupancyRebuiltThisFrame: false,
    staticCacheBuildMs: 0,
    staticPacketMergeMs: 0,
    staticPacketProjectMs: 0,
    staticPacketSortMs: Number(insertMs.toFixed ? insertMs.toFixed(3) : insertMs),
    staticPacketDrawPrepMs: 0,
    stableDemergeMode: String(cache.stableDemergeMode || 'cached'),
    stableDemergeSplitPacketCount: Number(cache.stableDemergeSplitPacketCount || 0),
    stableDemergeCreatedFaceCount: Number(cache.stableDemergeCreatedFaceCount || 0),
    stableDemergePlayerInteractionCellKey: String(playerInteractionCellKey || ''),
    stableDemergeCacheHit: true,
    stableDemergeCacheHitCount: Number(cache.stableDemergeCacheHitCount || 0),
    stableDemergeCacheMissCount: Number(cache.stableDemergeCacheMissCount || 0),
    playerMoveFastPathUsed: true,
    playerMoveFastPathHitCount: Number(cache.hitCount || 0),
    playerMoveFastPathMissCount: Number(cache.missCount || 0),
    playerMoveFastPathRejectReasons: [],
    playerMoveFastPathSupportTopSortMs: Number(supportTopSortMs.toFixed ? supportTopSortMs.toFixed(3) : supportTopSortMs),
    playerMoveFastPathInsertMs: Number(insertMs.toFixed ? insertMs.toFixed(3) : insertMs),
    playerMoveFastPathCellKey: String(playerInteractionCellKey || ''),
    cameraCullingEnabled: cameraScope && cameraScope.cameraCullingEnabled !== false,
    zoom: Number(cameraScope && cameraScope.zoom || getMainEditorZoomValueForRender())
  });
  recordRenderFunctionTiming('render.buildMainFrameRenderables.playerMoveFastPath', totalMs, {
    framePlanId: String(framePlanId || ''),
    staticRenderableCount: Number(staticRenderables.length || 0),
    dynamicRenderableCount: 1,
    supportTopSortMs: Number(supportTopSortMs.toFixed ? supportTopSortMs.toFixed(3) : supportTopSortMs),
    playerInsertMs: Number(insertMs.toFixed ? insertMs.toFixed(3) : insertMs),
    hitCount: Number(cache.hitCount || 0)
  });
  emitPlayerMoveFastPathRuntimeDiagnostic({
    phase: 'step3-active-guarded',
    framePlanId: String(framePlanId || ''),
    used: true,
    rejectReasons: [],
    warnings: warnings,
    playerInteractionCellKey: playerInteractionCellKey,
    cameraChunkSignature: cameraChunkSignature,
    staticRenderableCount: Number(staticRenderables.length || 0),
    visibleStaticPacketCount: Number(cache.visibleStaticPacketCount || staticRenderables.length || 0),
    visibleChunkCount: Number(cache.visibleChunkCount || 0),
    supportTopSortMs: Number(supportTopSortMs.toFixed ? supportTopSortMs.toFixed(3) : supportTopSortMs),
    playerInsertMs: Number(insertMs.toFixed ? insertMs.toFixed(3) : insertMs),
    totalMs: Number(totalMs.toFixed ? totalMs.toFixed(3) : totalMs),
    hitCount: Number(cache.hitCount || 0),
    missCount: Number(cache.missCount || 0)
  }, cache.hitCount <= 8 || (cache.hitCount % 60) === 0);
  return {
    used: true,
    order: order,
    rejectReasons: [],
    warnings: warnings,
    frameBuildMs: totalMs,
    supportTopSortMs: supportTopSortMs,
    insertMs: insertMs,
    cameraScope: cameraScope
  };
}

function deriveRenderableDrawPosition(renderable) {
  if (!renderable) return { x: 0, y: 0 };
  if (renderable.drawScreenPosition && typeof renderable.drawScreenPosition.x === 'number' && typeof renderable.drawScreenPosition.y === 'number') {
    return { x: Math.round(renderable.drawScreenPosition.x), y: Math.round(renderable.drawScreenPosition.y) };
  }
  if (renderable.debugFoot && typeof renderable.debugFoot.x === 'number' && typeof renderable.debugFoot.y === 'number') {
    return { x: Math.round(renderable.debugFoot.x), y: Math.round(renderable.debugFoot.y) };
  }
  if (Array.isArray(renderable.faces) && renderable.faces.length && Array.isArray(renderable.faces[0].points) && renderable.faces[0].points.length) {
    var mid = averageScreenPoint(renderable.faces[0].points);
    return { x: Math.round(mid.x), y: Math.round(mid.y) };
  }
  return { x: 0, y: 0 };
}

function compareRenderablesByDomain(a, b) {
  var domainCore = getDomainSceneCoreApi();
  if (domainCore && typeof domainCore.compareRenderableOrder === 'function') {
    return domainCore.compareRenderableOrder(a, b);
  }
  return requireRenderOrderCoreForRender().compareRenderableOrder(a, b);
}

function computeCandidate(cellX, cellY, proto, ignoreInstanceId = null) {
  var rotatedProto = proto && proto.voxels ? proto : currentProto();
  if (rotatedProto && rotatedProto.kind === 'habbo_import') {
    var cellShift = getHabboPlacementCellShift(rotatedProto, rotatedProto.rotation || 0);
    if (cellShift && (cellShift.x || cellShift.y)) {
      cellX += (cellShift.x || 0);
      cellY += (cellShift.y || 0);
    }
  }

  var domainCore = getDomainSceneCoreApi();
  if (!domainCore || typeof domainCore.evaluatePlacementCandidate !== 'function') {
    var unavailable = {
      valid: false,
      reason: 'domain-unavailable',
      supportZ: null,
      supportHeights: [],
      overlapIds: [],
      box: null,
      boxes: [],
      bbox: null,
      origin: null,
      prefabId: rotatedProto && rotatedProto.id ? rotatedProto.id : null,
      rotation: rotatedProto ? rotatedProto.rotation : null,
      authority: 'domain-required'
    };
    if (typeof logWarn === 'function') {
      try {
        logWarn('computeCandidate: domain-core-unavailable', {
          source: 'src/presentation/render/render.js:computeCandidate',
          prefabId: unavailable.prefabId,
          cellX: cellX,
          cellY: cellY,
          ignoreInstanceId: ignoreInstanceId || null
        });
      } catch (_) {}
    }
    return unavailable;
  }

  var evaluated = domainCore.evaluatePlacementCandidate({
    proto: rotatedProto,
    cellX: cellX,
    cellY: cellY,
    ignoreInstanceId: ignoreInstanceId,
    existingBoxes: boxes.slice(),
    grid: { gridW: settings.gridW, gridH: settings.gridH },
    playerBox: playerPlacementAABB()
  }) || null;

  if (!evaluated) {
    return {
      valid: false,
      reason: 'domain-null',
      supportZ: null,
      supportHeights: [],
      overlapIds: [],
      box: null,
      boxes: [],
      bbox: null,
      origin: null,
      prefabId: rotatedProto && rotatedProto.id ? rotatedProto.id : null,
      rotation: rotatedProto ? rotatedProto.rotation : null,
      authority: 'domain-required'
    };
  }

  evaluated.authority = 'domain';
  evaluated.source = 'src/presentation/render/render.js:computeCandidate';
  if (verboseLog && evaluated.valid && evaluated.origin) {
    pushLog(`candidate: VALID ${rotatedProto.name} voxels=${evaluated.boxes.length} at (${evaluated.origin.x},${evaluated.origin.y},${evaluated.origin.z}) authority=domain`);
  }
  return evaluated;
}

function requireRenderPreviewInteractionControllerForRender() {
  var api = null;
  try {
    api = (window.App && window.App.presentation && window.App.presentation.render && window.App.presentation.render.previewInteractionController) || null;
  } catch (_) {}
  if (!api) {
    try { api = window.__RENDER_PREVIEW_INTERACTION_CONTROLLER__ || null; } catch (_) {}
  }
  if (!api) throw new Error('P11a-3 missing render preview interaction controller');
  return api;
}

function createRenderPreviewInteractionDepsForRender() {
  return {
    editor: editor,
    mouse: mouse,
    boxes: function () { return boxes; },
    xrayFaces: function () { return xrayFaces; },
    buildSurfaceFaces: buildSurfaceFaces,
    pointInPoly: pointInPoly,
    hitTopFace: hitTopFace,
    screenToFloor: screenToFloor,
    computeCandidate: computeCandidate,
    prefabVariant: prefabVariant,
    getPrefabById: getPrefabById,
    currentProto: currentProto,
    currentPrefab: (typeof currentPrefab === 'function' ? currentPrefab : null),
    logItemRotationPrototype: (typeof logItemRotationPrototype === 'function' ? logItemRotationPrototype : null),
    getEditorPreviewFacingValue: getEditorPreviewFacingValue,
    detailLog: detailLog,
    verboseLog: function () { return verboseLog; },
    pushLog: pushLog,
    getLastPreviewSignature: function () { return lastPreviewSignature; },
    setLastPreviewSignature: function (value) { lastPreviewSignature = value; },
  };
}

function updatePreview() {
  return requireRenderPreviewInteractionControllerForRender().updatePreview({
    deps: createRenderPreviewInteractionDepsForRender()
  });
}

function pickBoxAtScreen(sx, sy) {
  return requireRenderPreviewInteractionControllerForRender().pickBoxAtScreen({
    deps: createRenderPreviewInteractionDepsForRender(),
    sx: sx,
    sy: sy
  });
}

function pickFaceAtScreen(sx, sy, includeHidden) {
  return requireRenderPreviewInteractionControllerForRender().pickFaceAtScreen({
    deps: createRenderPreviewInteractionDepsForRender(),
    sx: sx,
    sy: sy,
    includeHidden: includeHidden
  });
}

// placement 拖拽/落地入口已抽离到 src/application/placement/placement.js
// 这里保留预览计算、拾取和绘制等渲染相关实现。


function drawWorldPolyline(points3, stroke, width, dash) {
  if (!points3 || points3.length < 2) return;
  ctx.save();
  ctx.strokeStyle = stroke || 'rgba(255,255,255,0.9)';
  ctx.lineWidth = width || 1;
  if (dash && dash.length) ctx.setLineDash(dash);
  var p0 = iso(points3[0].x, points3[0].y, points3[0].z);
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < points3.length; i++) {
    var sp = iso(points3[i].x, points3[i].y, points3[i].z);
    ctx.lineTo(sp.x, sp.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawScreenPointMarker(pt, fill, stroke, radius) {
  if (!pt) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, radius || 3, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawWorldFaceOutline(facePts, stroke, width) {
  if (!facePts || facePts.length < 3) return;
  ctx.save();
  ctx.strokeStyle = stroke || 'rgba(255,255,255,0.9)';
  ctx.lineWidth = width || 1;
  var sp = iso(facePts[0].x, facePts[0].y, facePts[0].z);
  ctx.beginPath();
  ctx.moveTo(sp.x, sp.y);
  for (var i = 1; i < facePts.length; i++) {
    var p = iso(facePts[i].x, facePts[i].y, facePts[i].z);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawShadowProbeOverlay() {
  if (typeof shadowProbeState === 'undefined' || !shadowProbeState) return;
  var marker = shadowProbeState.activeMarker || null;
  if (!marker || !marker.worldPts || marker.worldPts.length < 3) return;
  var poly = marker.worldPts.map(function (p) { return iso(p.x, p.y, p.z); });
  var cx = 0, cy = 0;
  for (var i = 0; i < poly.length; i++) { cx += poly[i].x; cy += poly[i].y; }
  cx /= poly.length;
  cy /= poly.length;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (var j = 1; j < poly.length; j++) ctx.lineTo(poly[j].x, poly[j].y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,220,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,220,255,0.95)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8,4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0,220,255,0.98)';
  ctx.font = '12px sans-serif';
  ctx.fillText('Probe ' + String(marker.dir || 'face') + ' #' + String(marker.id).slice(-4), cx + 8, cy - 8);
  ctx.restore();
}

function drawSelectedInstanceProjectionDebug() {
  if (typeof shadowDebugDetailed !== 'undefined' && !shadowDebugDetailed) return;
  var inst = getSelectedInstance();
  if (!inst) return;
  var light = activeLight ? activeLight() : ((typeof getLightingRenderLights === 'function' ? getLightingRenderLights() : lights) || [])[0];
  if (!light) return;
  if (typeof collectInstanceShadowProjectionDebug !== 'function') return;
  var debug = collectInstanceShadowProjectionDebug(inst.instanceId, light);
  if (!debug || !debug.rays || !debug.rays.length) return;

  for (var i = 0; i < debug.hitFaces.length; i++) {
    var face = debug.hitFaces[i];
    var stroke = face.kind === 'top' ? 'rgba(255,220,120,0.92)' : (face.kind === 'east' ? 'rgba(255,140,220,0.92)' : 'rgba(120,255,180,0.92)');
    drawWorldFaceOutline(face.pts, stroke, 1.25);
  }

  var lines = [];
  var hitCount = 0;
  for (var r = 0; r < debug.rays.length; r++) {
    var ray = debug.rays[r];
    var srcScreen = iso(ray.src.x, ray.src.y, ray.src.z);
    drawScreenPointMarker(srcScreen, 'rgba(90,220,255,0.96)', 'rgba(0,0,0,0.65)', 3.5);
    ctx.fillStyle = 'rgba(90,220,255,0.96)';
    ctx.font = '11px monospace';
    ctx.fillText(String(ray.index), srcScreen.x + 5, srcScreen.y - 5);
    if (ray.bestHit) {
      hitCount += 1;
      drawWorldPolyline([ray.src, ray.bestHit.point], 'rgba(255,235,120,0.92)', 1.5, null);
      var hitScreen = iso(ray.bestHit.point.x, ray.bestHit.point.y, ray.bestHit.point.z);
      drawScreenPointMarker(hitScreen, 'rgba(255,235,120,0.98)', 'rgba(0,0,0,0.75)', 4.2);
      ctx.fillStyle = 'rgba(255,235,120,0.98)';
      ctx.font = '11px monospace';
      ctx.fillText(ray.bestHit.receiverKind + '@' + ray.bestHit.receiverOwnerKey, hitScreen.x + 6, hitScreen.y - 6);
      lines.push('#' + ray.index + ' ' + fmt3Shadow(ray.src) + ' -> ' + ray.bestHit.receiverKind + '/' + ray.bestHit.receiverOwnerKey + ' ' + fmt3Shadow(ray.bestHit.point) + ' dir=(' + ray.bestHit.dirSign.x + ',' + ray.bestHit.dirSign.y + ',' + ray.bestHit.dirSign.z + ')');
    } else {
      drawWorldPolyline([ray.src, ray.missFar], 'rgba(255,120,120,0.7)', 1.0, [4, 3]);
      var missScreen = iso(ray.missFar.x, ray.missFar.y, ray.missFar.z);
      drawScreenPointMarker(missScreen, 'rgba(255,120,120,0.78)', null, 2.8);
      lines.push('#' + ray.index + ' ' + fmt3Shadow(ray.src) + ' -> miss dir=(' + (ray.dir.x>=0?'+':'-') + ',' + (ray.dir.y>=0?'+':'-') + ',' + (ray.dir.z>=0?'+':'-') + ')');
    }
  }

  var anchor = debug.bounds ? iso(debug.bounds.minX, debug.bounds.minY, debug.bounds.maxZ) : iso(debug.rays[0].src.x, debug.rays[0].src.y, debug.rays[0].src.z);
  var panelX = Math.min(VIEW_W - 460, Math.max(16, anchor.x + 16));
  var panelY = Math.max(90, anchor.y - 18);
  var rowCount = Math.min(8, lines.length);
  var panelW = 440;
  var panelH = 28 + rowCount * 16;
  ctx.save();
  ctx.fillStyle = 'rgba(8,12,20,0.82)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(110,180,255,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.fillStyle = 'rgba(230,244,255,0.96)';
  ctx.font = '12px monospace';
  var title = '投影调试 ' + inst.instanceId + ' / light=' + String(light.name || light.id || light.type) + ' hits=' + hitCount + '/' + debug.rays.length + ' dir=(' + debug.lightDirSign.x + ',' + debug.lightDirSign.y + ',' + debug.lightDirSign.z + ')';
  ctx.fillText(title, panelX + 8, panelY + 16);
  for (var li = 0; li < rowCount; li++) ctx.fillText(lines[li], panelX + 8, panelY + 34 + li * 16);
  ctx.restore();
}


function averageScreenPoint(points) {
  var list = Array.isArray(points) ? points : [];
  if (!list.length) return { x: 0, y: 0 };
  var sx = 0, sy = 0;
  for (var i = 0; i < list.length; i++) { sx += Number(list[i].x) || 0; sy += Number(list[i].y) || 0; }
  return { x: sx / list.length, y: sy / list.length };
}


function computeScreenBBox(points) {
  var list = Array.isArray(points) ? points : [];
  if (!list.length) return null;
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < list.length; i++) {
    var px = Number(list[i] && list[i].x);
    var py = Number(list[i] && list[i].y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return { x: Math.round(minX), y: Math.round(minY), w: Math.round(maxX - minX), h: Math.round(maxY - minY) };
}

function bboxOverlapArea(a, b) {
  if (!a || !b) return 0;
  var x1 = Math.max(Number(a.x) || 0, Number(b.x) || 0);
  var y1 = Math.max(Number(a.y) || 0, Number(b.y) || 0);
  var x2 = Math.min((Number(a.x) || 0) + (Number(a.w) || 0), (Number(b.x) || 0) + (Number(b.w) || 0));
  var y2 = Math.min((Number(a.y) || 0) + (Number(a.h) || 0), (Number(b.y) || 0) + (Number(b.h) || 0));
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
}

function snapshotFaceFromRenderableFace(face, localIndex) {
  var pts = Array.isArray(face && face.points) ? face.points : [];
  return {
    localIndex: localIndex,
    semanticFace: face && face.semanticFace || null,
    screenFace: face && face.screenFace || null,
    depthKey: face && face.depthKey != null ? face.depthKey : null,
    centroid: averageScreenPoint(pts),
    bbox: computeScreenBBox(pts)
  };
}

function snapshotFacesForRenderable(renderable) {
  if (!renderable) return [];
  if (Array.isArray(renderable.faces) && renderable.faces.length) {
    return renderable.faces.map(function (face, idx) { return snapshotFaceFromRenderableFace(face, idx); });
  }
  if (renderable.kind === 'debug-cuboid-face' || renderable.kind === 'voxel-face') {
    var pts = Array.isArray(renderable.points) && renderable.points.length
      ? renderable.points
      : (Array.isArray(renderable.worldPts) ? screenPointsFromWorldFace(renderable.worldPts) : []);
    return [{
      localIndex: 0,
      semanticFace: renderable.semanticFace || null,
      screenFace: renderable.screenFace || null,
      depthKey: renderable.depthKey != null ? renderable.depthKey : null,
      centroid: averageScreenPoint(pts),
      bbox: computeScreenBBox(pts)
    }];
  }
  return [];
}

function computeRenderableSnapshotBBox(renderable) {
  var faces = snapshotFacesForRenderable(renderable);
  if (faces.length) {
    var boxes = faces.map(function (f) { return f.bbox; }).filter(Boolean);
    if (boxes.length) {
      var minX = Math.min.apply(null, boxes.map(function (b) { return b.x; }));
      var minY = Math.min.apply(null, boxes.map(function (b) { return b.y; }));
      var maxX = Math.max.apply(null, boxes.map(function (b) { return b.x + b.w; }));
      var maxY = Math.max.apply(null, boxes.map(function (b) { return b.y + b.h; }));
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
  }
  var dp = deriveRenderableDrawPosition(renderable);
  return { x: dp.x - 1, y: dp.y - 1, w: 2, h: 2 };
}

function collectOracleActualFaces(order) {
  var out = [];
  var list = Array.isArray(order) ? order : [];
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (!r || !(r.kind === 'voxel-face' || r.kind === 'debug-cuboid-face')) continue;
    out.push({
      faceKey: r.faceKey || [r.instanceId || 'unknown', [Number(r.cellX || 0), Number(r.cellY || 0), Number(r.cellZ || 0)].join(','), r.semanticFace || '', r.screenFace || ''].join('|'),
      instanceId: r.instanceId || null,
      semanticFace: r.semanticFace || null,
      screenFace: r.screenFace || null,
      drawIndex: i,
      cellX: Number(r.cellX || 0),
      cellY: Number(r.cellY || 0),
      cellZ: Number(r.cellZ || 0)
    });
  }
  return out;
}

function collectCubeOracleSceneEntries() {
  var out = [];
  var seen = Object.create(null);
  var list = Array.isArray(boxes) ? boxes : [];
  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    if (!b || b.prefabId !== 'cube_1x1') continue;
    var key = [String(b.instanceId || b.id || 'cube'), Number(b.x || 0), Number(b.y || 0), Number(b.z || 0)].join('|');
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ instanceId: b.instanceId || null, prefabId: b.prefabId || null, x: Number(b.x || 0), y: Number(b.y || 0), z: Number(b.z || 0) });
  }
  return out;
}

function logRenderOracleChecks(order, currentViewRotation) {
  var oracleApi = getRenderFaceOracleApi();
  if (!oracleApi || typeof oracleApi.identifyOracleTestScene !== 'function' || typeof oracleApi.runOracleCheck !== 'function') return;
  var sceneEntries = collectCubeOracleSceneEntries();
  var sceneDef = oracleApi.identifyOracleTestScene(sceneEntries);
  if (!sceneDef) return;
  var payload = oracleApi.runOracleCheck(sceneDef.sceneId || sceneDef, currentViewRotation, collectOracleActualFaces(order));
  if (!payload) return;
  logItemRotationPrototype('main-render-oracle-check', payload);
}

function isRenderOrderHeavyDiagnosticsEnabled() {
  try {
    if (typeof window !== 'undefined' && window.__RENDER_ORDER_HEAVY_DIAGNOSTICS__ === true) return true;
  } catch (_) {}
  try {
    if (typeof localStorage !== 'undefined') {
      var stored = localStorage.getItem('renderOrderHeavyDiagnostics');
      if (stored === '1' || stored === 'true') return true;
    }
  } catch (_) {}
  return false;
}

function isFramePlanDiagnosticsEnabled() {
  try {
    if (typeof window !== 'undefined' && window.__FRAME_PLAN_DIAGNOSTICS__ === true) return true;
  } catch (_) {}
  try {
    if (typeof localStorage !== 'undefined') {
      var stored = localStorage.getItem('framePlanDiagnostics');
      if (stored === '1' || stored === 'true') return true;
    }
  } catch (_) {}
  return isRenderOrderHeavyDiagnosticsEnabled();
}

function logRenderOrderDiagnostics(framePlanId, framePlanSignature, currentViewRotation, order) {
  if (!isRenderOrderHeavyDiagnosticsEnabled()) return;

  var ordered = [];
  var objectLevelCount = 0;
  var faceLevelCount = 0;
  var buckets = {
    floorRenderableCount: 1,
    staticVoxelRenderableCount: 0,
    debugFaceRenderableCount: 0,
    spriteRenderableCount: 0,
    shadowRenderableCount: (typeof lights !== 'undefined' && Array.isArray(lights) && lights.length) ? 1 : 0,
    overlayRenderableCount: 1
  };
  for (var i = 0; i < order.length; i++) {
    var r = order[i] || null;
    if (!r) continue;
    ordered.push({
      index: i,
      id: r.id || null,
      kind: r.kind || null,
      prefabId: r.prefabId || null,
      instanceId: r.instanceId || null,
      renderPath: r.renderPath || null,
      sortKey: r.sortKey != null ? r.sortKey : null,
      tie: r.tie != null ? r.tie : null
    });
    if (Array.isArray(r.faces) && r.faces.length) objectLevelCount += 1;
    if (r.kind === 'debug-cuboid-face' || r.kind === 'voxel-face') faceLevelCount += 1;
    if (r.kind === 'voxel' || r.kind === 'voxel-face') buckets.staticVoxelRenderableCount += 1;
    else if (r.kind === 'debug-cuboid-face') buckets.debugFaceRenderableCount += 1;
    else if (r.kind === 'prefab-sprite') buckets.spriteRenderableCount += 1;
  }
  logItemRotationPrototype('main-render-order-snapshot', {
    currentViewRotation: currentViewRotation,
    framePlanId: framePlanId,
    framePlanSignature: framePlanSignature,
    orderedRenderables: ordered
  });
  logItemRotationPrototype('main-render-layer-bucket-summary', Object.assign({
    currentViewRotation: currentViewRotation,
    framePlanId: framePlanId,
    mixedGranularityDetected: objectLevelCount > 0 && faceLevelCount > 0,
    objectLevelRenderableCount: objectLevelCount,
    faceLevelRenderableCount: faceLevelCount
  }, buckets));
  for (var j = 0; j < order.length; j++) {
    var rr = order[j];
    if (!rr) continue;
    var faces = snapshotFacesForRenderable(rr);
    if (!faces.length) continue;
    logItemRotationPrototype('main-render-face-order-snapshot', {
      currentViewRotation: currentViewRotation,
      framePlanId: framePlanId,
      renderableId: rr.id || null,
      prefabId: rr.prefabId || null,
      instanceId: rr.instanceId || null,
      renderPath: rr.renderPath || null,
      renderableSortKey: rr.sortKey != null ? rr.sortKey : null,
      renderableTie: rr.tie != null ? rr.tie : null,
      faces: faces
    });
  }
  logRenderOracleChecks(order, currentViewRotation);
  var conflictBudget = 0;
  for (var li = 0; li < order.length; li++) {
    var left = order[li];
    if (!left) continue;
    var leftBBox = computeRenderableSnapshotBBox(left);
    for (var ri = li + 1; ri < order.length; ri++) {
      var right = order[ri];
      if (!right) continue;
      var rightBBox = computeRenderableSnapshotBBox(right);
      var overlap = bboxOverlapArea(leftBBox, rightBBox);
      if (overlap <= 0) continue;
      logItemRotationPrototype('main-render-overlap-conflict', {
        currentViewRotation: currentViewRotation,
        framePlanId: framePlanId,
        leftId: left.id || null,
        rightId: right.id || null,
        leftKind: left.kind || null,
        rightKind: right.kind || null,
        leftSortKey: left.sortKey != null ? left.sortKey : null,
        rightSortKey: right.sortKey != null ? right.sortKey : null,
        leftTie: left.tie != null ? left.tie : null,
        rightTie: right.tie != null ? right.tie : null,
        leftBBox: leftBBox,
        rightBBox: rightBBox,
        overlapArea: overlap,
        expectedFront: (compareRenderablesByDomain(left, right) <= 0) ? (right.id || null) : (left.id || null),
        actualDrawOrder: { front: right.id || null, back: left.id || null }
      });
      conflictBudget += 1;
      if (conflictBudget >= 24) return;
    }
  }
}

function getFacingFacePolygons(bounds) {
  if (!bounds) return null;
  var pts = cubePoints(bounds.x, bounds.y, bounds.z, bounds.w, bounds.d, bounds.h);
  return {
    top: [pts.p001, pts.p101, pts.p111, pts.p011],
    north: [pts.p001, pts.p101, pts.p100, pts.p000],
    east: [pts.p101, pts.p111, pts.p110, pts.p100],
    south: [pts.p011, pts.p111, pts.p110, pts.p010],
    west: [pts.p001, pts.p011, pts.p010, pts.p000]
  };
}

function buildFacingOverlayPrototype(prefab, rotation, instance) {
  var facingApi = getItemFacingCoreApi();
  if (!facingApi || typeof facingApi.buildFacingPrototype !== 'function') return null;
  return facingApi.buildFacingPrototype(prefab, rotation, instance || null);
}


function isFiveFaceDebugPrefab(prefab) {
  if (!prefab || !prefab.itemRotationDebug) return false;
  var textures = prefab.semanticTextureMap || prefab.semanticTextures || {};
  var colors = prefab.semanticFaceColors || {};
  return ['top','north','east','south','west'].every(function (key) {
    return !!((textures[key] && (textures[key].textureId || textures[key].color)) || colors[key]);
  });
}

function getSemanticTextureMapForRender(prefab) {
  var api = getItemFacingCoreApi();
  if (api && typeof api.getSemanticTextureMap === 'function') return api.getSemanticTextureMap(prefab || {});
  return (prefab && (prefab.semanticTextureMap || prefab.semanticTextures)) || {};
}

function hasExplicitSemanticTexturesForRender(prefab) {
  var api = getItemFacingCoreApi();
  if (api && typeof api.hasExplicitSemanticTextures === 'function') return !!api.hasExplicitSemanticTextures(prefab || {});
  return !!(prefab && (prefab.itemRotationDebug || prefab.semanticTextureMap || prefab.semanticTextures || prefab.semanticFaceColors));
}

function getTextureFill(texture, fallback) {
  if (!texture) return fallback || '#fff';
  if (texture.kind === 'solid-color' || texture.type === 'solid-color') return texture.color || texture.fill || fallback || '#fff';
  return texture.color || texture.fill || fallback || '#fff';
}


function buildStaticVoxelSemanticMapping(cell, viewRotation, defaultColors, seenLogMap) {
  var prefab = cell && cell.box && typeof getPrefabById === 'function' ? getPrefabById(cell.box.prefabId) : null;
  var facingApi = getItemFacingCoreApi();
  var boxSemanticInput = cell && cell.box && (cell.box.semanticTextureMap || cell.box.semanticTextures || cell.box.semanticFaceColors)
    ? Object.assign({}, prefab || {}, {
        semanticTextureMap: cell.box.semanticTextureMap || cell.box.semanticTextures || null,
        semanticTextures: cell.box.semanticTextures || cell.box.semanticTextureMap || null,
        semanticFaceColors: cell.box.semanticFaceColors || null,
        itemRotationDebug: !!(cell.box.semanticTextureMap || cell.box.semanticTextures || cell.box.semanticFaceColors)
      })
    : prefab;
  var textureMap = boxSemanticInput ? getSemanticTextureMapForRender(boxSemanticInput) : null;
  var hasSemanticTextures = !!(boxSemanticInput && hasExplicitSemanticTexturesForRender(boxSemanticInput) && textureMap && (textureMap.top || textureMap.north || textureMap.east || textureMap.south || textureMap.west));
  if (!boxSemanticInput || !facingApi || !hasSemanticTextures) return null;
  var itemFacing = cell && cell.box && cell.box.rotation || 0;
  var binding = typeof facingApi.resolveSemanticTextureBinding === 'function'
    ? facingApi.resolveSemanticTextureBinding({ prefab: boxSemanticInput, itemFacing: itemFacing, viewRotation: viewRotation })
    : null;
  if (!binding) return null;
  var mapping = binding.mapping || null;
  var screenFaceToSemanticFace = binding.screenFaceToSemanticFace || { top: 'top', lowerLeft: null, lowerRight: null };
  var semanticFaceToTextureSlot = binding.semanticFaceToTextureSlot || { top: null, north: null, east: null, south: null, west: null };
  var screenFaceToTextureSlot = binding.screenFaceToTextureSlot || { top: null, lowerLeft: null, lowerRight: null };
  var screenFill = {
    top: getTextureFill(screenFaceToTextureSlot.top, rgbToCss(defaultColors.top)),
    lowerLeft: getTextureFill(screenFaceToTextureSlot.lowerLeft, rgbToCss(defaultColors.south)),
    lowerRight: getTextureFill(screenFaceToTextureSlot.lowerRight, rgbToCss(defaultColors.east))
  };
  if (seenLogMap) {
    var key = String(cell.box && cell.box.instanceId || 'no-instance') + '|' + String(viewRotation);
    if (!seenLogMap[key]) {
      seenLogMap[key] = true;
      logItemRotationPrototype('main-semantic-texture-mapping-check', {
        instanceId: cell.box && cell.box.instanceId || null,
        prefabId: boxSemanticInput && boxSemanticInput.id || prefab && prefab.id || null,
        instanceFacing: normalizeMainEditorViewRotationValue(itemFacing),
        viewRotation: normalizeMainEditorViewRotationValue(viewRotation),
        effectiveFacing: typeof binding.effectiveFacing === 'number' ? binding.effectiveFacing : (mapping && typeof mapping.effectiveFacing === 'number' ? mapping.effectiveFacing : normalizeMainEditorViewRotationValue(itemFacing)),
        visibleFaces: Array.isArray(binding.visibleFaces) ? binding.visibleFaces.slice() : (mapping && Array.isArray(mapping.visibleFaces) ? mapping.visibleFaces.slice() : []),
        screenFaceToSemanticFace: screenFaceToSemanticFace,
        semanticFaceToTextureSlot: semanticFaceToTextureSlot
      });
      var canonicalTruth = facingApi && typeof facingApi.getCanonicalSingleVoxelTruth === 'function' ? facingApi.getCanonicalSingleVoxelTruth(viewRotation) : null;
      var visibleByScreen = mapping && mapping.visibleFacesByScreenPosition ? mapping.visibleFacesByScreenPosition : { top: 'top', lowerLeft: screenFaceToSemanticFace.lowerLeft || null, lowerRight: screenFaceToSemanticFace.lowerRight || null };
      var passedTruth = null;
      if (canonicalTruth && normalizeMainEditorViewRotationValue(itemFacing) === 0) {
        passedTruth = String(visibleByScreen.top || '') === String(canonicalTruth.top || 'top') && String(visibleByScreen.lowerLeft || '') === String(canonicalTruth.lowerLeft || '') && String(visibleByScreen.lowerRight || '') === String(canonicalTruth.lowerRight || '');
      }
      logItemRotationPrototype('main-visible-face-truth-check', {
        currentViewRotation: normalizeMainEditorViewRotationValue(viewRotation),
        instanceId: cell.box && cell.box.instanceId || null,
        prefabId: boxSemanticInput && boxSemanticInput.id || prefab && prefab.id || null,
        visibleFacesByScreenPosition: visibleByScreen,
        visibleFacesBySemantic: Array.isArray(binding.visibleFaces) ? binding.visibleFaces.slice() : (mapping && Array.isArray(mapping.visibleFaces) ? mapping.visibleFaces.slice() : []),
        passedAgainstCanonicalTruthTable: passedTruth
      });
      logItemRotationPrototype('main-static-voxel-semantic-pipeline-check', {
        instanceId: cell.box && cell.box.instanceId || null,
        prefabId: boxSemanticInput && boxSemanticInput.id || prefab && prefab.id || null,
        instanceFacing: normalizeMainEditorViewRotationValue(itemFacing),
        viewRotation: normalizeMainEditorViewRotationValue(viewRotation),
        effectiveFacing: typeof binding.effectiveFacing === 'number' ? binding.effectiveFacing : (mapping && typeof mapping.effectiveFacing === 'number' ? mapping.effectiveFacing : normalizeMainEditorViewRotationValue(itemFacing)),
        visibleSemanticFaces: Array.isArray(binding.visibleFaces) ? binding.visibleFaces.slice() : (mapping && Array.isArray(mapping.visibleFaces) ? mapping.visibleFaces.slice() : []),
        screenFaceToSemanticFace: screenFaceToSemanticFace,
        semanticFaceToTextureSlot: semanticFaceToTextureSlot,
        renderPipelineSharedWithDebugFiveFace: true
      });
    }
  }
  return {
    prefab: prefab,
    binding: binding,
    mapping: mapping,
    textureMap: textureMap,
    screenFaceToSemanticFace: screenFaceToSemanticFace,
    semanticFaceToTextureSlot: semanticFaceToTextureSlot,
    screenFaceToTextureSlot: screenFaceToTextureSlot,
    screenFill: screenFill,
    useSharedSemanticPipeline: true
  };
}

function getSemanticFaceNormal(screenFace) {
  return requireIsometricFaceCoreForRender().getSemanticFaceNormal(screenFace);
}

function getSemanticFaceWorldPolygon(cell, semanticFace) {
  return requireIsometricFaceCoreForRender().getSemanticFaceWorldPolygon(cell, semanticFace);
}

function getSemanticFaceNeighborDeltaForRender(semanticFace) {
  return requireIsometricFaceCoreForRender().getSemanticFaceNeighborDelta(semanticFace);
}

function getVisibleSemanticMappingForRender(itemFacing, viewRotation) {
  return requireIsometricFaceCoreForRender().getVisibleSemanticMapping(itemFacing, viewRotation);
}

function textureFillToRgb(fill, fallbackRgb) {
  if (fill && typeof fill === 'object' && typeof fill.r === 'number' && typeof fill.g === 'number' && typeof fill.b === 'number') return fill;
  if (typeof fill === 'string') {
    var value = fill.trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
      return hexToRgb(value);
    }
    var match = value.match(/^rgba?\(([^)]+)\)$/i);
    if (match) {
      var parts = match[1].split(',').map(function (part) { return Number(part.trim()); });
      if (parts.length >= 3 && parts.every(function (part, idx) { return idx > 2 || Number.isFinite(part); })) {
        return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0 };
      }
    }
  }
  return fallbackRgb || { r: 255, g: 255, b: 255 };
}


function classifyCentroidRelation(value, ref) {
  var a = Number(value || 0);
  var b = Number(ref || 0);
  if (Math.abs(a - b) < 0.01) return 'same-as-top';
  return a < b ? 'left-of-top' : 'right-of-top';
}

function classifyVerticalRelation(value, ref) {
  var a = Number(value || 0);
  var b = Number(ref || 0);
  if (Math.abs(a - b) < 0.01) return 'same-as-top';
  return a < b ? 'above-top' : 'below-top';
}

function logFaceGeometryOracleChecks(faces, meta) {
  if (!Array.isArray(faces) || !faces.length) return;
  meta = meta || {};
  var centroidsByScreen = Object.create(null);
  var projectedByFace = new Map();
  faces.forEach(function (face) {
    if (!face) return;
    var pts = screenPointsFromWorldFace(face.worldPts || face.polygon || []);
    projectedByFace.set(face, pts);
    centroidsByScreen[String(face.screenFace || '')] = averageScreenPoint(pts);
  });
  var topCentroid = centroidsByScreen.top || null;
  if (!topCentroid) return;
  var lowerLeftCentroid = centroidsByScreen.lowerLeft || null;
  var lowerRightCentroid = centroidsByScreen.lowerRight || null;
  var sideXSeparated = !lowerLeftCentroid || !lowerRightCentroid || Math.abs((lowerLeftCentroid.x || 0) - (lowerRightCentroid.x || 0)) > 0.01;
  faces.forEach(function (face) {
    if (!face) return;
    var pts = projectedByFace.get(face) || screenPointsFromWorldFace(face.worldPts || face.polygon || []);
    var centroid = averageScreenPoint(pts);
    var xRel = classifyCentroidRelation(centroid.x, topCentroid.x);
    var yRel = classifyVerticalRelation(centroid.y, topCentroid.y);
    var passed = true;
    if (face.screenFace === 'top') {
      passed = (!lowerLeftCentroid || centroid.y < lowerLeftCentroid.y) && (!lowerRightCentroid || centroid.y < lowerRightCentroid.y);
    } else if (face.screenFace === 'lowerLeft') {
      passed = centroid.x < topCentroid.x && sideXSeparated;
    } else if (face.screenFace === 'lowerRight') {
      passed = centroid.x > topCentroid.x && sideXSeparated;
    }
    logItemRotationPrototype('main-face-geometry-oracle-check', {
      currentViewRotation: meta.currentViewRotation,
      instanceId: meta.instanceId || null,
      prefabId: meta.prefabId || null,
      semanticFace: face.semanticFace || null,
      screenFace: face.screenFace || null,
      centroid: { x: Number((centroid.x || 0).toFixed(2)), y: Number((centroid.y || 0).toFixed(2)) },
      topCentroid: { x: Number((topCentroid.x || 0).toFixed(2)), y: Number((topCentroid.y || 0).toFixed(2)) },
      centroidXRelationToTop: xRel,
      centroidYRelationToTop: yRel,
      passedGeometryOracle: !!passed
    });
    logItemRotationPrototype('main-side-face-polygon-template-check', {
      currentViewRotation: meta.currentViewRotation,
      instanceId: meta.instanceId || null,
      prefabId: meta.prefabId || null,
      semanticFace: face.semanticFace || null,
      screenFace: face.screenFace || null,
      polygon: pts.map(function (pt) { return { x: Number((pt.x || 0).toFixed(2)), y: Number((pt.y || 0).toFixed(2)) }; }),
      polygonTemplateId: face.polygonTemplateId || null,
      polygonSource: face.polygonSource || null,
      reusedFromOldEastSouthTemplate: !!face.reusedFromOldEastSouthTemplate
    });
  });
}

function buildSharedSemanticVoxelFaces(cell, occ, semanticMapping, ownerInstanceId) {
  if (!semanticMapping || !semanticMapping.useSharedSemanticPipeline) return null;
  var facingApi = getItemFacingCoreApi();
  if (!facingApi || typeof facingApi.buildDebugCuboidFaceRenderables !== 'function') return null;
  var renderData = facingApi.buildDebugCuboidFaceRenderables({
    prefab: semanticMapping.prefab,
    cells: [{ x: cell.x, y: cell.y, z: cell.z, box: cell.box, base: cell.base }],
    itemFacing: cell.box && cell.box.rotation || 0,
    viewRotation: semanticMapping.binding && typeof semanticMapping.binding.viewRotation === 'number' ? semanticMapping.binding.viewRotation : 0,
    ownerId: 'static-voxel:' + String(cell.box && cell.box.instanceId || cell.box && cell.box.id || 'unknown'),
    occupiedSet: occ
  });
  if (!renderData || !Array.isArray(renderData.faceRenderables) || !renderData.faceRenderables.length) return null;
  logItemRotationPrototype('main-render-face-binding-snapshot', {
    currentViewRotation: semanticMapping.binding && typeof semanticMapping.binding.viewRotation === 'number' ? semanticMapping.binding.viewRotation : 0,
    instanceId: cell.box && cell.box.instanceId || null,
    prefabId: semanticMapping.prefab && semanticMapping.prefab.id || null,
    instanceFacing: cell.box && cell.box.rotation || 0,
    effectiveFacing: semanticMapping.binding && typeof semanticMapping.binding.effectiveFacing === 'number' ? semanticMapping.binding.effectiveFacing : null,
    visibleSemanticFaces: semanticMapping.binding && Array.isArray(semanticMapping.binding.visibleFaces) ? semanticMapping.binding.visibleFaces.slice() : [],
    screenFaceToSemanticFace: semanticMapping.screenFaceToSemanticFace || {},
    semanticFaceToTextureSlot: semanticMapping.semanticFaceToTextureSlot || {},
    emittedFaces: renderData.faceRenderables.map(function (face) {
      return {
        semanticFace: face.semanticFace || null,
        screenFace: face.screenFace || null,
        textureId: face.textureId || null,
        polygon: face.worldPts || face.polygon || [],
        depthKey: face.depthKey != null ? face.depthKey : null
      };
    })
  });
  renderData.faceRenderables.forEach(function (face) {
    var projectedPts = screenPointsFromWorldFace(face.worldPts || face.polygon || []);
    var centroid = averageScreenPoint(projectedPts);
    logItemRotationPrototype('main-face-screen-position-check', {
      currentViewRotation: semanticMapping.binding && typeof semanticMapping.binding.viewRotation === 'number' ? semanticMapping.binding.viewRotation : 0,
      instanceId: cell.box && cell.box.instanceId || null,
      prefabId: semanticMapping.prefab && semanticMapping.prefab.id || null,
      semanticFace: face.semanticFace || null,
      resolvedScreenFace: face.screenFace || null,
      polygon: projectedPts.map(function (pt) { return { x: Number((pt.x || 0).toFixed(2)), y: Number((pt.y || 0).toFixed(2)) }; }),
      centroid: { x: Number((centroid.x || 0).toFixed(2)), y: Number((centroid.y || 0).toFixed(2)) }
    });
  });
  logFaceGeometryOracleChecks(renderData.faceRenderables, {
    currentViewRotation: semanticMapping.binding && typeof semanticMapping.binding.viewRotation === 'number' ? semanticMapping.binding.viewRotation : 0,
    instanceId: cell.box && cell.box.instanceId || null,
    prefabId: semanticMapping.prefab && semanticMapping.prefab.id || null
  });
  return renderData.faceRenderables.map(function (face, faceIndex) {
    var texture = face.texture || { textureId: face.textureId || '', kind: 'solid-color', color: face.color };
    var rawFill = getTextureFill(texture, face.color || '#fff');
    var normal = getSemanticFaceNormal(face.semanticFace || face.screenFace);
    var litFill = rgbToCss(litFaceColor(textureFillToRgb(rawFill, hexToRgb(face.color || '#ffffff')), face.worldPts || face.polygon || [], normal, ownerInstanceId));
    var cameraSettingsForFaces = getMainEditorCameraSettingsForRender();
    var debugSurfaceStroke = cameraSettingsForFaces.debugVisibleSurfaces ? '#ffffff' : colorWithAlpha(rawFill, 0.95);
    return buildFaceRenderable(
      screenPointsFromWorldFace(face.worldPts || face.polygon || []),
      litFill,
      debugSurfaceStroke,
      1,
      buildVoxelFaceShadowOverlays(face.worldPts || face.polygon || [], normal, ownerInstanceId),
      {
        semanticFace: face.semanticFace || null,
        screenFace: face.screenFace || null,
        depthKey: face.depthKey != null ? face.depthKey : faceIndex,
        textureId: face.textureId || null,
        texture: texture,
        textureColor: texture && texture.color || null,
        semanticTextureSlot: texture,
        semanticTextureSlotColor: texture && texture.color || null,
        color: face.color || (texture && texture.color) || null,
        worldPts: face.worldPts || face.polygon || [],
        polygonTemplateId: face.polygonTemplateId || null,
        polygonSource: face.polygonSource || null,
        reusedFromOldEastSouthTemplate: !!face.reusedFromOldEastSouthTemplate
      }
    );
  });
}

function colorWithAlpha(color, alpha) {
  var fallback = 'rgba(255,255,255,' + String(alpha == null ? 1 : alpha) + ')';
  if (!color) return fallback;
  var c = String(color).trim();
  var a = Math.max(0, Math.min(1, Number(alpha == null ? 1 : alpha)));
  if (/^rgba?\(/i.test(c)) return c;
  var m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return c;
  var hex = m[1];
  if (hex.length === 3) hex = hex.split('').map(function (ch) { return ch + ch; }).join('');
  var r = parseInt(hex.slice(0, 2), 16);
  var g = parseInt(hex.slice(2, 4), 16);
  var b = parseInt(hex.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function drawTextBadge(text, x, y, fill, stroke) {
  return requireCanvas2dDrawPrimitivesForRender().drawTextBadgeOn(ctx, text, x, y, fill, stroke);
}

function drawMultilineBadge(lines, x, y, fill, stroke) {
  return requireCanvas2dDrawPrimitivesForRender().drawMultilineBadgeOn(ctx, lines, x, y, fill, stroke);
}

function pickRenderableColorCandidate(value) {
  if (!value) return null;
  var str = String(value).trim();
  if (!str || str === 'transparent' || str === 'none') return null;
  return str;
}

function getCoreDefaultSemanticFaceColor(semanticFace) {
  var api = getItemFacingCoreApi();
  if (!api || typeof api.getSemanticFaceColors !== 'function') return null;
  try {
    var colors = api.getSemanticFaceColors() || {};
    return pickRenderableColorCandidate(colors[semanticFace]);
  } catch (_) {
    return null;
  }
}

function resolveFaceDebugOverlayColor(renderable) {
  var semanticFace = String(renderable && renderable.semanticFace || '').toLowerCase();
  var resolved = null;
  var source = null;
  if (renderable) {
    resolved = pickRenderableColorCandidate(renderable.fill);
    if (resolved) source = 'renderable.fill';
    if (!resolved) {
      resolved = pickRenderableColorCandidate(renderable.stroke);
      if (resolved) source = 'renderable.stroke';
    }
    if (!resolved && renderable.texture) {
      resolved = pickRenderableColorCandidate(renderable.texture.color);
      if (resolved) source = 'texture.color';
    }
    if (!resolved) {
      resolved = pickRenderableColorCandidate(renderable.textureColor);
      if (resolved) source = 'texture.color';
    }
    if (!resolved && renderable.semanticTextureSlot) {
      resolved = pickRenderableColorCandidate(renderable.semanticTextureSlot.color);
      if (resolved) source = 'semanticTextureSlot.color';
    }
    if (!resolved) {
      resolved = pickRenderableColorCandidate(renderable.semanticTextureSlotColor);
      if (resolved) source = 'semanticTextureSlot.color';
    }
    if (!resolved && renderable.prefabId && typeof getPrefabById === 'function') {
      try {
        var prefab = getPrefabById(renderable.prefabId);
        if (prefab && prefab.semanticFaceColors && semanticFace) {
          resolved = pickRenderableColorCandidate(prefab.semanticFaceColors[semanticFace]);
          if (resolved) source = 'semanticFaceColors';
        }
      } catch (_) {}
    }
  }
  if (!resolved && semanticFace) {
    resolved = getCoreDefaultSemanticFaceColor(semanticFace);
    if (resolved) source = 'core-default-fallback';
  }
  if (!resolved) {
    resolved = '#ffffff';
    source = 'core-default-fallback';
  }
  return { color: resolved, source: source };
}

var __faceDebugOverlayHitCache = new Map();

function drawFaceDebugOverlayRenderable(renderable, drawIndex) {
  if (!showFaceDebugOverlay || !renderable) return;
  if (!(renderable.kind === 'voxel-face' || renderable.kind === 'debug-cuboid-face')) return;
  var pts = Array.isArray(renderable.points) && renderable.points.length
    ? renderable.points
    : (Array.isArray(renderable.worldPts) && renderable.worldPts.length ? screenPointsFromWorldFace(renderable.worldPts) : []);
  if (!pts.length) return;
  var centroid = averageScreenPoint(pts);
  var overlayColorInfo = resolveFaceDebugOverlayColor(renderable);
  var overlayColor = overlayColorInfo.color;
  drawMultilineBadge([
    { text: String(renderable.instanceId || renderable.id || 'face'), color: '#ffffff' },
    { text: String(renderable.semanticFace || '?') + ' -> ' + String(renderable.screenFace || '?'), color: overlayColor },
    { text: '#' + String(drawIndex), color: overlayColor }
  ], Math.round(centroid.x) + 8, Math.round(centroid.y) - 8, '#ffffff', overlayColor);
  var frameKey = [String(renderable.framePlanId || 'frame:none'), String(renderable.id || 'no-id'), String(drawIndex)].join('|');
  if (__faceDebugOverlayHitCache.get(frameKey)) return;
  __faceDebugOverlayHitCache.set(frameKey, true);
  var textureColor = pickRenderableColorCandidate(renderable.texture && renderable.texture.color) || pickRenderableColorCandidate(renderable.textureColor);
  var semanticTextureSlotColor = pickRenderableColorCandidate(renderable.semanticTextureSlot && renderable.semanticTextureSlot.color) || pickRenderableColorCandidate(renderable.semanticTextureSlotColor);
  logItemRotationPrototype('main-face-debug-overlay-hit', {
    currentViewRotation: normalizeMainEditorViewRotationValue(renderable.currentViewRotation != null ? renderable.currentViewRotation : getSafeMainEditorViewRotation(null).viewRotation),
    instanceId: renderable.instanceId || null,
    prefabId: renderable.prefabId || null,
    semanticFace: renderable.semanticFace || null,
    screenFace: renderable.screenFace || null,
    drawIndex: drawIndex,
    sortKey: renderable.sortKey != null ? renderable.sortKey : null,
    tie: renderable.tie != null ? renderable.tie : null,
    centroid: { x: Number(centroid.x.toFixed(2)), y: Number(centroid.y.toFixed(2)) },
    polygon: pts.map(function (pt) { return { x: Number(pt.x.toFixed(2)), y: Number(pt.y.toFixed(2)) }; })
  });
  logItemRotationPrototype('main-face-debug-overlay-color-check', {
    instanceId: renderable.instanceId || null,
    prefabId: renderable.prefabId || null,
    semanticFace: renderable.semanticFace || null,
    screenFace: renderable.screenFace || null,
    drawIndex: drawIndex,
    renderableFill: pickRenderableColorCandidate(renderable.fill),
    renderableStroke: pickRenderableColorCandidate(renderable.stroke),
    textureColor: textureColor,
    semanticTextureSlotColor: semanticTextureSlotColor,
    resolvedOverlayColor: overlayColor,
    overlayColorSource: overlayColorInfo.source,
    textureId: (renderable.texture && renderable.texture.textureId) || renderable.textureId || null,
    slotId: (renderable.semanticTextureSlot && renderable.semanticTextureSlot.textureId) || renderable.textureId || null
  });
}

function buildFiveFaceEntries(proto, prefab) {
  if (!proto) return [];
  var semantic = proto.semanticDirections || {};
  var colors = Object.assign({}, proto.semanticColors || {}, (prefab && prefab.semanticFaceColors) || {});
  var sourceFaces = proto.visibleSemanticFaces && proto.visibleSemanticFaces.length ? proto.visibleSemanticFaces : [
    { semantic: 'top', screenFace: 'top', color: colors.top },
    { semantic: 'north', screenFace: semantic.north || 'lowerRight', color: colors.north },
    { semantic: 'east', screenFace: semantic.east || 'lowerRight', color: colors.east },
    { semantic: 'south', screenFace: semantic.south || 'lowerLeft', color: colors.south },
    { semantic: 'west', screenFace: semantic.west || 'lowerLeft', color: colors.west }
  ];
  var seen = {};
  var entries = [];
  sourceFaces.forEach(function (entry) {
    var sem = String(entry.semantic || '').toLowerCase();
    if (!sem || seen[sem]) return;
    if (['top','north','east','south','west'].indexOf(sem) < 0) return;
    seen[sem] = true;
    entries.push({
      semantic: sem,
      screenFace: entry.screenFace || semantic[sem] || sem,
      color: entry.color || colors[sem] || '#fff',
      label: sem === 'top' ? 'TOP' : sem.toUpperCase()
    });
  });
  return entries;
}

function expandPreviewBoxesToUnitCells(previewBoxes) {
  var cells = [];
  var list = Array.isArray(previewBoxes) ? previewBoxes : [];
  list.forEach(function (box) {
    var w = Math.max(1, Math.round(Number(box && box.w) || 1));
    var d = Math.max(1, Math.round(Number(box && box.d) || 1));
    var h = Math.max(1, Math.round(Number(box && box.h) || 1));
    for (var z = 0; z < h; z++) {
      for (var y = 0; y < d; y++) {
        for (var x = 0; x < w; x++) {
          cells.push({
            x: Math.round(Number(box.x) || 0) + x,
            y: Math.round(Number(box.y) || 0) + y,
            z: Math.round(Number(box.z) || 0) + z,
            box: box
          });
        }
      }
    }
  });
  return cells;
}

function screenPointsFromWorldFace(worldPts) {
  return (Array.isArray(worldPts) ? worldPts : []).map(function (p) {
    return iso(p.x, p.y, p.z);
  });
}

function drawDebugFaceRenderable(face, alpha, valid) {
  if (!face || !Array.isArray(face.worldPts) || face.worldPts.length < 3) return false;
  var pts = screenPointsFromWorldFace(face.worldPts);
  var texture = face.texture || { textureId: face.textureId || '', kind: 'solid-color', color: face.color };
  var rawFill = getTextureFill(texture, face.color || '#fff');
  var fill = colorWithAlpha(rawFill, alpha == null ? 0.82 : alpha);
  var stroke = colorWithAlpha(rawFill, valid ? 1 : 0.68);
  drawPoly(pts, fill, stroke, 1.35);
  return true;
}


var __placedDebugFaceRenderLogCache = new Map();

function createOccupiedKeySetFromOccupancy(occ) {
  var out = new Set();
  if (!occ) return out;
  if (occ instanceof Set) {
    occ.forEach(function (key) { out.add(String(key)); });
    return out;
  }
  if (!occ.values || typeof occ.values !== 'function') return out;
  for (const cell of occ.values()) {
    if (typeof cell === 'string') out.add(String(cell));
    else if (cell && typeof cell === 'object' && cell.x != null && cell.y != null && cell.z != null) out.add(String(cell.x) + ',' + String(cell.y) + ',' + String(cell.z));
  }
  return out;
}

function buildPlacedDebugInstanceFaceRenderables(instance, prefab, occupiedSet, viewRotationInfo) {
  if (!instance || !prefab || !isFiveFaceDebugPrefab(prefab)) return [];
  var api = getItemFacingCoreApi();
  if (!api || typeof api.buildDebugCuboidFaceRenderables !== 'function') return [];
  viewRotationInfo = viewRotationInfo || getSafeMainEditorViewRotation(null);
  var viewRotation = normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation);
  var instBoxes = boxes.filter(function (b) { return b.instanceId === instance.instanceId; });
  if (!instBoxes.length) return [];
  var cells = instBoxes.map(function (b) {
    return { x: b.x, y: b.y, z: b.z, box: b, base: b.base };
  });
  var boxByKey = {};
  cells.forEach(function (c) { boxByKey[String(c.x) + ',' + String(c.y) + ',' + String(c.z)] = c.box || null; });
  var facing = instance.rotation != null ? instance.rotation : 0;
  var renderData = api.buildDebugCuboidFaceRenderables({
    prefab: prefab,
    cells: cells,
    itemFacing: facing,
    viewRotation: viewRotation,
    ownerId: 'instance:' + String(instance.instanceId || prefab.id || 'unknown'),
    occupiedSet: occupiedSet
  });
  if (!renderData || !Array.isArray(renderData.faceRenderables) || !renderData.faceRenderables.length) return [];
  logItemRotationPrototype('main-render-face-binding-snapshot', {
    currentViewRotation: viewRotation,
    instanceId: instance.instanceId || null,
    prefabId: prefab.id || null,
    instanceFacing: facing,
    effectiveFacing: renderData.visibleSemanticFaces && typeof renderData.visibleSemanticFaces.effectiveFacing === 'number' ? renderData.visibleSemanticFaces.effectiveFacing : null,
    visibleSemanticFaces: renderData.visibleSemanticFaces && Array.isArray(renderData.visibleSemanticFaces.visibleFaces) ? renderData.visibleSemanticFaces.visibleFaces.slice() : [],
    screenFaceToSemanticFace: renderData.visibleSemanticFaces && renderData.visibleSemanticFaces.screenFaces ? renderData.visibleSemanticFaces.screenFaces : {},
    semanticFaceToTextureSlot: renderData.semanticTextureMap || {},
    emittedFaces: renderData.faceRenderables.map(function (face) {
      return {
        semanticFace: face.semanticFace || null,
        screenFace: face.screenFace || null,
        textureId: face.textureId || null,
        polygon: face.worldPts || face.polygon || [],
        depthKey: face.depthKey != null ? face.depthKey : null
      };
    })
  });
  var domainCore = getDomainSceneCoreApi();
  var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3, east: 1, south: 2, north: 0, west: 0 };
  var renderables = renderData.faceRenderables.map(function (face) {
    var key = String(face.cell && face.cell.x || 0) + ',' + String(face.cell && face.cell.y || 0) + ',' + String(face.cell && face.cell.z || 0);
    var box = boxByKey[key] || null;
    var orderMeta = domainCore && typeof domainCore.computeVoxelRenderableSort === 'function'
      ? domainCore.computeVoxelRenderableSort({ cell: face.cell || { x: 0, y: 0, z: 0 }, box: box, viewRotation: viewRotation })
      : computeViewAwareSortMeta(face.cell || { x: 0, y: 0, z: 0 }, 1, viewRotation);
    var screenPts = screenPointsFromWorldFace(face.worldPts || face.polygon || []);
    return {
      id: 'debug-face-' + String(face.faceId || key),
      kind: 'debug-cuboid-face',
      sortKey: Number(orderMeta.sortKey || 0),
      tie: Number(orderMeta.tie || 0) + ((faceTiePrio[face.screenFace] || 0) * 0.01),
      semanticFace: face.semanticFace,
      screenFace: face.screenFace,
      textureId: face.textureId,
      texture: face.texture || null,
      textureColor: face.texture && face.texture.color || face.color || null,
      semanticTextureSlot: face.texture || null,
      semanticTextureSlotColor: face.texture && face.texture.color || face.color || null,
      fill: getTextureFill(face.texture || { textureId: face.textureId || '', kind: 'solid-color', color: face.color }, face.color || '#fff'),
      stroke: colorWithAlpha(getTextureFill(face.texture || { textureId: face.textureId || '', kind: 'solid-color', color: face.color }, face.color || '#fff'), 0.95),
      depthKey: face.depthKey,
      instanceId: instance.instanceId || null,
      prefabId: prefab.id || null,
      renderPath: 'dynamic-renderables',
      drawScreenPosition: averageScreenPoint(screenPts),
      points: screenPts,
      worldPts: face.worldPts || face.polygon || [],
      cellX: Number(face.cell && face.cell.x || 0),
      cellY: Number(face.cell && face.cell.y || 0),
      cellZ: Number(face.cell && face.cell.z || 0),
      faceKey: [instance.instanceId || 'unknown', [Number(face.cell && face.cell.x || 0), Number(face.cell && face.cell.y || 0), Number(face.cell && face.cell.z || 0)].join(','), face.semanticFace || '', face.screenFace || ''].join('|'),
      draw: function () { drawDebugFaceRenderable(face, 1, true); }
    };
  });
  var logKey = [instance.instanceId, facing, viewRotation, instBoxes.length].join('|');
  logFaceGeometryOracleChecks(renderData.faceRenderables, {
    currentViewRotation: viewRotation,
    instanceId: instance.instanceId || null,
    prefabId: prefab.id || null
  });
  if (__placedDebugFaceRenderLogCache.get(instance.instanceId) !== logKey) {
    __placedDebugFaceRenderLogCache.set(instance.instanceId, logKey);
    logItemRotationPrototype('debug-face-render', {
      mode: 'placed-instance-real-face-renderables',
      prefabId: prefab.id || null,
      instanceId: instance.instanceId || null,
      instanceFacing: facing,
      viewRotation: viewRotation,
      renderedAsRealFaces: true,
      renderedAsOverlay: false,
      helperLayerUsed: false,
      boxBaseUsedForDebugFaces: false,
      visibleSemanticFaces: renderData.visibleSemanticFaces ? renderData.visibleSemanticFaces.visibleFaces : [],
      renderedFaces: renderData.faceRenderables.map(function (f) {
        return {
          faceId: f.faceId,
          semanticFace: f.semanticFace,
          screenFace: f.screenFace,
          textureId: f.textureId,
          color: f.color,
          polygon: screenPointsFromWorldFace(f.worldPts || f.polygon || []),
          depthKey: f.depthKey,
          cell: f.cell
        };
      }),
      faceDrawOrder: renderData.faceDrawOrder || [],
      semanticTextureMap: getSemanticTextureMapForRender(prefab),
      topColor: (getSemanticTextureMapForRender(prefab).top || {}).color || null,
      northColor: (getSemanticTextureMapForRender(prefab).north || {}).color || null,
      eastColor: (getSemanticTextureMapForRender(prefab).east || {}).color || null,
      southColor: (getSemanticTextureMapForRender(prefab).south || {}).color || null,
      westColor: (getSemanticTextureMapForRender(prefab).west || {}).color || null
    });
  }
  return renderables;
}

function buildDebugPreviewFaceRenderables(args) {
  args = args || {};
  var previewPrefab = args.prefab || args.previewPrefab || null;
  var previewBoxes = Array.isArray(args.previewBoxes) ? args.previewBoxes : [];
  var facing = args.previewFacing != null ? args.previewFacing : (args.facing != null ? args.facing : 0);
  var viewRotationInfo = args.viewRotationInfo || getSafeMainEditorViewRotation(args.snapshot || null);
  var viewRotation = normalizeMainEditorViewRotationValue(
    args.viewRotation != null ? args.viewRotation : viewRotationInfo.viewRotation
  );
  var api = getItemFacingCoreApi();
  if (!api || typeof api.buildDebugCuboidFaceRenderables !== 'function') return null;
  var cells = expandPreviewBoxesToUnitCells(previewBoxes);
  return api.buildDebugCuboidFaceRenderables({
    prefab: previewPrefab,
    cells: cells,
    itemFacing: facing,
    viewRotation: viewRotation,
    ownerId: 'placement-preview:' + String(previewPrefab && previewPrefab.id || 'unknown')
  });
}

function drawDebugFiveFacePlacementPreview(previewPrefab, proto, ok, previewBoxes, viewRotationInfo) {
  viewRotationInfo = viewRotationInfo || getSafeMainEditorViewRotation(null);
  var viewRotation = normalizeMainEditorViewRotationValue(viewRotationInfo.viewRotation);
  if (!isFiveFaceDebugPrefab(previewPrefab)) return false;
  if (!editor || !editor.preview || !editor.preview.bbox) return false;
  var facing = editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue();
  var renderData = buildDebugPreviewFaceRenderables({
    prefab: previewPrefab,
    previewBoxes: previewBoxes || editor.preview.boxes || [],
    previewFacing: facing,
    viewRotation: viewRotation,
    viewRotationInfo: viewRotationInfo
  });
  if (!renderData || !Array.isArray(renderData.faceRenderables) || !renderData.faceRenderables.length) return false;
  var drawn = [];
  ctx.save();
  renderData.faceRenderables.forEach(function (face) {
    if (drawDebugFaceRenderable(face, ok ? 0.88 : 0.38, !!ok)) drawn.push(face);
  });
  ctx.restore();
  var renderedFaces = drawn.map(function (f) {
    return {
      faceId: f.faceId,
      semanticFace: f.semanticFace,
      screenFace: f.screenFace,
      textureId: f.textureId || (f.texture && f.texture.textureId) || null,
      texture: f.texture || null,
      color: f.color,
      polygon: screenPointsFromWorldFace(f.worldPts || f.polygon || []),
      depthKey: f.depthKey,
      cell: f.cell
    };
  });
  var visibleMap = renderData.visibleSemanticFaces || getSemanticFaceMappingForPreview(previewPrefab, facing);
  logItemRotationPrototype('preview-renderable-faces', {
    prefabId: previewPrefab.id || null,
    previewFacing: facing,
    viewRotation: viewRotation,
    voxelCount: expandPreviewBoxesToUnitCells(previewBoxes || editor.preview.boxes || []).length,
    faceRenderableCount: renderedFaces.length,
    sortedFaceOrder: renderedFaces.map(function (f) { return f.faceId; }),
    semanticTextureMap: getSemanticTextureMapForRender(previewPrefab),
    textureIds: renderedFaces.map(function (f) { return f.textureId; })
  });
  logItemRotationPrototype('debug-face-render', {
    mode: 'placement-preview-real-face-renderables',
    prefabId: previewPrefab.id || null,
    previewFacing: facing,
    viewRotation: viewRotation,
    renderedAsRealFaces: true,
    renderedAsOverlay: false,
    helperLayerUsed: false,
    baseMonochromeSuppressed: true,
    visibleSemanticFaces: visibleMap ? visibleMap.visibleFaces : renderedFaces.map(function (f) { return f.semanticFace; }),
    renderedFaces: renderedFaces,
    faceDrawOrder: renderedFaces.map(function (f) { return f.faceId; }),
    semanticTextureMap: getSemanticTextureMapForRender(previewPrefab),
    topTexture: getSemanticTextureMapForRender(previewPrefab).top || null,
    northTexture: getSemanticTextureMapForRender(previewPrefab).north || null,
    eastTexture: getSemanticTextureMapForRender(previewPrefab).east || null,
    southTexture: getSemanticTextureMapForRender(previewPrefab).south || null,
    westTexture: getSemanticTextureMapForRender(previewPrefab).west || null,
    topColor: (getSemanticTextureMapForRender(previewPrefab).top || {}).color || null,
    northColor: (getSemanticTextureMapForRender(previewPrefab).north || {}).color || null,
    eastColor: (getSemanticTextureMapForRender(previewPrefab).east || {}).color || null,
    southColor: (getSemanticTextureMapForRender(previewPrefab).south || {}).color || null,
    westColor: (getSemanticTextureMapForRender(previewPrefab).west || {}).color || null,
    footprint: editor.preview.bbox ? { w: editor.preview.bbox.w, d: editor.preview.bbox.d, h: editor.preview.bbox.h } : null,
    origin: editor.preview.origin || null,
    valid: !!editor.preview.valid
  });
  return true;
}


function drawFacingLegendPanel(proto, anchorPoint) {
  if (!proto || !anchorPoint) return;
  var colors = proto.semanticColors || {};
  var entries = [
    ['TOP', colors.top],
    ['NORTH', colors.north],
    ['EAST', colors.east],
    ['SOUTH', colors.south],
    ['WEST', colors.west]
  ];
  var x = Math.round(anchorPoint.x + 14);
  var y = Math.round(anchorPoint.y - 70);
  ctx.save();
  ctx.fillStyle = 'rgba(10,15,24,0.82)';
  ctx.fillRect(x, y, 146, 86);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.strokeRect(x, y, 146, 86);
  ctx.fillStyle = 'rgba(230,240,255,0.96)';
  ctx.font = '11px monospace';
  ctx.fillText('Facing ' + String(proto.facingLabel || '?') + ' · ' + String(proto.spriteStrategy || 'single'), x + 8, y + 14);
  for (var i = 0; i < entries.length; i++) {
    var rowY = y + 30 + i * 11;
    ctx.fillStyle = entries[i][1] || '#fff';
    ctx.fillRect(x + 8, rowY - 8, 10, 8);
    ctx.fillStyle = 'rgba(230,240,255,0.96)';
    ctx.fillText(entries[i][0], x + 24, rowY);
  }
  ctx.restore();
}

function drawItemFacingPrototypeOverlay() {
  if (!ui.showItemFacingDebug || !ui.showItemFacingDebug.checked) return;
  var target = null;
  var bounds = null;
  var prefab = null;
  var rotation = 0;
  var anchorPoint = null;

  if (editor && editor.mode === 'place' && editor.preview && editor.preview.bbox) {
    prefab = currentPrefab();
    rotation = editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue();
    bounds = editor.preview.bbox ? { x: editor.preview.bbox.x, y: editor.preview.bbox.y, z: editor.preview.bbox.z, w: editor.preview.bbox.w, d: editor.preview.bbox.d, h: editor.preview.bbox.h } : null;
    target = Object.assign({}, editor.preview.origin || {}, { rotation: rotation });
    anchorPoint = bounds ? iso(bounds.x, bounds.y, bounds.z + bounds.h) : null;
  } else {
    var inst = getSelectedInstance();
    if (!inst) return;
    prefab = getPrefabById(inst.prefabId);
    rotation = inst.rotation || 0;
    var b = getInstanceProxyBounds(inst);
    if (!b) return;
    bounds = { x: b.minX, y: b.minY, z: b.minZ, w: b.maxX - b.minX, d: b.maxY - b.minY, h: b.maxZ - b.minZ };
    target = inst;
    anchorPoint = iso(bounds.x, bounds.y, bounds.z + bounds.h);
  }

  var proto = buildFacingOverlayPrototype(prefab, rotation, target);
  if (!proto || !bounds) return;
  if (editor && editor.mode === 'place' && isFiveFaceDebugPrefab(prefab)) return;
  var polys = getFacingFacePolygons(bounds);
  if (!polys) return;
  var semantic = proto.semanticDirections || {};
  var colors = proto.semanticColors || {};
  var faces = (proto.visibleSemanticFaces && proto.visibleSemanticFaces.length) ? proto.visibleSemanticFaces.map(function (entry) {
    return { semantic: entry.semantic, dir: entry.screenFace || semantic[entry.semantic] || entry.semantic, color: entry.color || colors[entry.semantic], label: String(entry.semantic || '?').slice(0, 1).toUpperCase() };
  }) : [
    { semantic: 'top', dir: 'top', color: colors.top, label: 'T' },
    { semantic: 'north', dir: semantic.north || 'north', color: colors.north, label: 'N' },
    { semantic: 'east', dir: semantic.east || 'east', color: colors.east, label: 'E' },
    { semantic: 'south', dir: semantic.south || 'south', color: colors.south, label: 'S' },
    { semantic: 'west', dir: semantic.west || 'west', color: colors.west, label: 'W' }
  ];
  logItemRotationPrototype('debug-face-render', {
    prefabId: boxSemanticInput && boxSemanticInput.id || prefab && prefab.id || null,
    previewFacing: rotation,
    visibleSemanticFaces: faces.map(function (f) { return f.semantic; }),
    topColor: colors.top || null,
    northColor: colors.north || null,
    eastColor: colors.east || null,
    southColor: colors.south || null,
    westColor: colors.west || null
  });
  ctx.save();
  ctx.font = '11px monospace';
  faces.forEach(function (entry) {
    var poly = polys[entry.dir];
    if (!poly) return;
    drawPoly(poly, colorWithAlpha(entry.color || '#fff', 0.38), entry.color || '#fff', 1.7);
    var mid = averageScreenPoint(poly);
    drawTextBadge(entry.label, mid.x + 2, mid.y - 2, entry.color || '#fff', entry.color || '#fff');
  });
  ctx.restore();
  drawFacingLegendPanel(proto, anchorPoint);
}

function drawSelectedInstanceHighlight() {
  var inst = getSelectedInstance();
  if (!inst) return;
  var targetBoxes = boxes.filter(function (b) { return b.instanceId === inst.instanceId; });
  if (!targetBoxes.length) return;
  var occ = buildOccupancy(targetBoxes);
  for (const cell of occ.values()) {
    drawVoxelCell({ x: cell.x, y: cell.y, z: cell.z, base: '#6fb7ff' }, occ, 0.18);
  }
  var top = targetBoxes.reduce(function (best, b) {
    var score = b.x + b.y + b.z + b.h;
    if (!best || score > best.score) return { box: b, score: score };
    return best;
  }, null);
  if (top && top.box) {
    var topPt = iso(top.box.x, top.box.y, top.box.z + top.box.h);
    ctx.fillStyle = 'rgba(120,190,255,.95)';
    ctx.font = '13px sans-serif';
    ctx.fillText(`选中: ${inst.instanceId} / ${getPrefabById(inst.prefabId).name}`, topPt.x + 8, topPt.y - 8);
  }
}

function drawDeleteHover() {
if (!editor.hoverDeleteBox) return;
var b = editor.hoverDeleteBox;
var targetBoxes = b && b.instanceId ? boxes.filter(function (item) { return item.instanceId === b.instanceId; }) : [b];
var occ = buildOccupancy(targetBoxes);
for (const cell of occ.values()) {
  drawVoxelCell({ x: cell.x, y: cell.y, z: cell.z, base: '#ff6b6b' }, occ, 0.33);
}
var topPt = iso(b.x, b.y, b.z + b.h);
ctx.fillStyle = 'rgba(255,120,120,.95)';
ctx.font = '13px sans-serif';
ctx.fillText(`删除: ${b.name}${b.instanceId ? ' ' + b.instanceId : ' #' + b.id}`, topPt.x + 8, topPt.y - 8);
}

function drawPlacementPreview() {
  if (!editor.preview) return;
  var previewBoxes = editor.preview.boxes || [];
  if (!previewBoxes.length) return;
  var b = editor.preview.box;
  var ok = editor.preview.valid;
  var fill = ok ? 'rgba(54, 201, 108, .22)' : 'rgba(240, 73, 73, .22)';
  var stroke = ok ? 'rgba(80, 255, 148, 1)' : 'rgba(255, 84, 84, 1)';
  var proto = editor.mode === 'drag' && editor.draggingInstance ? prefabVariant(getPrefabById(editor.draggingInstance.prefabId), editor.draggingInstance.rotation || 0) : currentProto();
  var origin = editor.preview.origin || null;

  var previewPrefab = editor.mode === 'drag' && editor.draggingInstance ? getPrefabById(editor.draggingInstance.prefabId) : currentProto();
  var viewRotationInfo = getSafeMainEditorViewRotation(null);
  logRenderDependency('main-editor-view-rotation', {
    hasViewRotation: viewRotationInfo.hasViewRotation,
    viewRotation: viewRotationInfo.viewRotation,
    fallbackUsed: viewRotationInfo.fallbackUsed,
    source: viewRotationInfo.source,
    previewFacing: editor.preview && editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue(),
    prefabId: previewPrefab && previewPrefab.id || null
  });
  var previewShift = previewPrefab && previewPrefab.kind === 'habbo_import'
    ? getHabboProxyVisualShift(previewPrefab, editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue())
    : { x: 0, y: 0 };

  if (origin) {
    withScreenTranslate(previewShift, function () {
      for (var i = 0; i < (proto.supportCells || []).length; i++) {
        var support = proto.supportCells[i];
        var p0 = iso(origin.x + support.x,     origin.y + support.y,     origin.z + support.localZ);
        var p1 = iso(origin.x + support.x + 1, origin.y + support.y,     origin.z + support.localZ);
        var p2 = iso(origin.x + support.x + 1, origin.y + support.y + 1, origin.z + support.localZ);
        var p3 = iso(origin.x + support.x,     origin.y + support.y + 1, origin.z + support.localZ);
        drawPoly([p0, p1, p2, p3], fill, stroke, 2.5);
      }
    });
  }

  var occ = buildOccupancy(previewBoxes);
  var drewFiveFacePreview = false;
  withScreenTranslate(previewShift, function () {
    if (previewPrefab && isFiveFaceDebugPrefab(previewPrefab)) {
      drewFiveFacePreview = drawDebugFiveFacePlacementPreview(previewPrefab, proto, ok, previewBoxes, viewRotationInfo);
    }
    if (!drewFiveFacePreview) {
      for (var cell of occ.values()) drawVoxelCell({ x: cell.x, y: cell.y, z: cell.z, base: cell.box.base }, occ, ok ? 0.42 : 0.22);
    }
  });
  if (origin) {
    if (previewPrefab && prefabHasSprite(previewPrefab)) {
      if (previewPrefab.kind === 'habbo_import') {
        detailLog('[place-trace] src/presentation/render/render.js::drawPlacementPreview preview-habbo-sprite prefab=' + previewPrefab.id + ' origin=(' + [origin.x, origin.y, origin.z].join(',') + ') rotation=' + String(editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue()) + ' valid=' + ok + ' proxyShift=(' + [previewShift.x || 0, previewShift.y || 0].join(',') + ')');
      }
      drawPrefabSpriteAt(previewPrefab, Object.assign({}, origin, { rotation: editor.preview.rotation != null ? editor.preview.rotation : getEditorPreviewFacingValue() }), ok ? 0.78 : 0.42);
    }
  }

  ctx.fillStyle = stroke;
  ctx.font = '13px sans-serif';
  var labelPt = b
    ? iso(b.x, b.y, b.z + b.h)
    : (origin
        ? iso(origin.x, origin.y, origin.z + 1)
        : iso(previewBoxes[0].x, previewBoxes[0].y, previewBoxes[0].z + 1));
  var labelX = labelPt.x + 6;
  var labelY = labelPt.y - 8;
  var status = ok
    ? `${b.name} 体素=${previewBoxes.length} 尺寸 ${b.w}×${b.d}×${b.h}`
    : `不可放置：${editor.preview.reason} / prefab=${editor.preview.prefabId || proto.id || 'n/a'} / 体素=${previewBoxes.length}`;
  ctx.fillText(status, labelX, labelY);
  if (!ok && editor.preview.reason === 'player' && origin) {
    ctx.fillText(`阻挡：玩家占位 (${origin.x}, ${origin.y}, z=${origin.z})`, labelX, labelY - 16);
  }
}


var ACTOR_INTERACTION_SORT_RADIUS = 2;

function getActorInteractionSortRadiusForRender() {
  return Math.max(1, Number(ACTOR_INTERACTION_SORT_RADIUS || 2));
}




var __actorInteractionOrderDiagState = {
  version: 'actor-sort-diag-v2-export-channel-20260428',
  lastCandidateSignature: '',
  lastReplacementSignature: '',
  lastFinalOrderSignature: '',
  emittedCount: 0,
  renderEntryCount: 0,
  lastEnabledCheck: false,
  lastEmitTag: '',
  lastEmitAt: 0,
  lastExportChannel: ''
};
if (typeof window !== 'undefined') {
  window.__ACTOR_SORT_DIAG_RUNTIME__ = __actorInteractionOrderDiagState;
}

function isActorInteractionOrderDiagEnabled() {
  var enabled = false;
  try {
    if (typeof window !== 'undefined' && window.__TERRAIN_PLAYER_DIAG__ === true) enabled = true;
    if (typeof window !== 'undefined' && window.__ACTOR_SORT_DIAG__ === true) enabled = true;
  } catch (_) {}
  if (!enabled) {
    try {
      if (typeof localStorage !== 'undefined') {
        var a = localStorage.getItem('terrainPlayerDiag');
        var b = localStorage.getItem('actorSortDiag');
        var c = localStorage.getItem('terrainSortDiag');
        enabled = a === '1' || a === 'true' || b === '1' || b === 'true' || c === '1' || c === 'true';
      }
    } catch (_) {}
  }
  try { __actorInteractionOrderDiagState.lastEnabledCheck = !!enabled; } catch (_) {}
  return !!enabled;
}

function emitActorInteractionOrderDiag(tag, payload, options) {
  if (!isActorInteractionOrderDiagEnabled()) return;
  var opts = options && typeof options === 'object' ? options : {};
  var maxCount = Number(opts.maxCount || 4000);
  if (__actorInteractionOrderDiagState.emittedCount >= maxCount) return;
  __actorInteractionOrderDiagState.emittedCount += 1;
  var text = "";
  try { text = JSON.stringify(payload || {}); } catch (_) { text = '"[unserializable]"'; }
  var line = '[actor-sort-diag][' + String(tag || 'event') + '] ' + text;
  try {
    __actorInteractionOrderDiagState.lastEmitTag = String(tag || 'event');
    __actorInteractionOrderDiagState.lastEmitAt = Date.now ? Date.now() : 0;
  } catch (_) {}
  try {
    if (typeof pushLog === 'function') {
      __actorInteractionOrderDiagState.lastExportChannel = 'pushLog';
      pushLog(line);
    } else if (typeof logInfo === 'function') {
      __actorInteractionOrderDiagState.lastExportChannel = 'logInfo';
      logInfo(line);
    } else if (typeof detailLog === 'function') {
      __actorInteractionOrderDiagState.lastExportChannel = 'detailLog';
      detailLog(line);
    } else if (typeof window !== 'undefined' && typeof window.__forceExportLog === 'function') {
      __actorInteractionOrderDiagState.lastExportChannel = 'window.__forceExportLog';
      window.__forceExportLog(line);
    } else {
      __actorInteractionOrderDiagState.lastExportChannel = 'console-only';
    }
  } catch (_) {}
  try {
    if (typeof console !== 'undefined' && console.log) console.log('[actor-sort-diag][' + String(tag || 'event') + ']', payload || {});
  } catch (_) {}
}

function getActorInteractionDiagStorageSnapshotForRender() {
  var out = { actorSortDiag: null, terrainPlayerDiag: null, terrainSortDiag: null };
  try {
    if (typeof localStorage !== 'undefined') {
      out.actorSortDiag = localStorage.getItem('actorSortDiag');
      out.terrainPlayerDiag = localStorage.getItem('terrainPlayerDiag');
      out.terrainSortDiag = localStorage.getItem('terrainSortDiag');
    }
  } catch (_) {
    out.actorSortDiag = 'error';
    out.terrainPlayerDiag = 'error';
    out.terrainSortDiag = 'error';
  }
  return out;
}

function noteActorInteractionRenderEntryForRender(payload) {
  if (!isActorInteractionOrderDiagEnabled()) return false;
  __actorInteractionOrderDiagState.renderEntryCount += 1;
  var count = Number(__actorInteractionOrderDiagState.renderEntryCount || 0);
  if (!(count <= 8 || (count % 120) === 0)) return false;
  var safe = payload && typeof payload === 'object' ? payload : {};
  var storage = getActorInteractionDiagStorageSnapshotForRender();
  emitActorInteractionOrderDiag('render-entry', {
    version: __actorInteractionOrderDiagState.version,
    renderEntryCount: count,
    hasPushLog: safe.hasPushLog === true,
    hasForceExportLog: safe.hasForceExportLog === true,
    localStorageActorSortDiag: storage.actorSortDiag,
    localStorageTerrainPlayerDiag: storage.terrainPlayerDiag,
    localStorageTerrainSortDiag: storage.terrainSortDiag,
    totalInstances: Number(safe.totalInstances || 0),
    totalBoxes: Number(safe.totalBoxes || 0)
  }, { maxCount: 1000 });
  return true;
}

function roundActorDiagNumber(value, digits) {
  var n = Number(value);
  if (!Number.isFinite(n)) return null;
  var scale = Math.pow(10, digits == null ? 3 : digits);
  return Math.round(n * scale) / scale;
}

function isActorDiagTerrainCell(cell) {
  var c = cell && typeof cell === 'object' ? cell : {};
  return c.generatedBy === 'terrain-generator'
    || c.isTerrain === true
    || c.terrainGenerated === true
    || c.terrainBatchId != null
    || c.terrainMaterialId != null
    || c.terrainBand != null
    || String(c.instanceId || '').indexOf('terrain-') === 0;
}

function summarizeActorDiagPlayer(playerRef) {
  var p = playerRef && typeof playerRef === 'object' ? playerRef : (typeof player !== 'undefined' ? player : {});
  return {
    x: roundActorDiagNumber(p && p.x, 3),
    y: roundActorDiagNumber(p && p.y, 3),
    z: roundActorDiagNumber(p && p.z, 3),
    visualZ: roundActorDiagNumber(p && p.visualZ, 3),
    moving: !!(p && p.moving),
    dir: p && p.dir != null ? String(p.dir) : null,
    jumpActive: !!(p && p.jump && p.jump.active),
    jumpMode: p && p.jump && p.jump.mode != null ? String(p.jump.mode) : null,
    jumpFromZ: roundActorDiagNumber(p && p.jump && p.jump.fromZ, 3),
    jumpToZ: roundActorDiagNumber(p && p.jump && p.jump.toZ, 3),
    jumpT: roundActorDiagNumber(p && p.jump && p.jump.t, 3)
  };
}

function summarizeActorDiagCell(cell) {
  if (!cell || typeof cell !== 'object') return null;
  return {
    id: cell.id != null ? String(cell.id) : null,
    instanceId: cell.instanceId != null ? String(cell.instanceId) : null,
    prefabId: cell.prefabId != null ? String(cell.prefabId) : null,
    x: roundActorDiagNumber(cell.x, 3),
    y: roundActorDiagNumber(cell.y, 3),
    z: roundActorDiagNumber(cell.z, 3),
    w: roundActorDiagNumber(cell.w != null ? cell.w : 1, 3),
    d: roundActorDiagNumber(cell.d != null ? cell.d : 1, 3),
    h: roundActorDiagNumber(cell.h != null ? cell.h : 1, 3),
    topZ: roundActorDiagNumber(Number(cell.z || 0) + Number(cell.h != null ? cell.h : 1), 3),
    terrain: isActorDiagTerrainCell(cell),
    terrainBatchId: cell.terrainBatchId != null ? String(cell.terrainBatchId) : null,
    terrainBand: cell.terrainBand != null ? String(cell.terrainBand) : null
  };
}

function summarizeActorDiagRenderable(renderable) {
  if (!renderable || typeof renderable !== 'object') return null;
  var cell = renderable.box || renderable.cell || null;
  return {
    id: renderable.id != null ? String(renderable.id).slice(0, 180) : null,
    kind: renderable.kind != null ? String(renderable.kind) : null,
    semanticFace: renderable.semanticFace != null ? String(renderable.semanticFace) : null,
    screenFace: renderable.screenFace != null ? String(renderable.screenFace) : null,
    instanceId: renderable.instanceId != null ? String(renderable.instanceId) : null,
    prefabId: renderable.prefabId != null ? String(renderable.prefabId) : null,
    sortKey: roundActorDiagNumber(renderable.sortKey, 6),
    tie: roundActorDiagNumber(renderable.tie, 6),
    depthKey: roundActorDiagNumber(renderable.depthKey, 6),
    mergedFace: renderable.mergedFace === true,
    mergedFaceCount: roundActorDiagNumber(renderable.mergedFaceCount, 0),
    mergeWidth: roundActorDiagNumber(renderable.mergeWidth, 0),
    mergeHeight: roundActorDiagNumber(renderable.mergeHeight, 0),
    actorReplacement: renderable.actorInteractionReplacement === true,
    actorSupportFloor: renderable.actorInteractionSupportFloor === true,
    actorRelation: renderable.actorInteractionGroupSortRelation != null ? String(renderable.actorInteractionGroupSortRelation) : null,
    actorFootprintMode: renderable.actorInteractionGroupFootprintMode != null ? String(renderable.actorInteractionGroupFootprintMode) : null,
    memberKeyCount: Array.isArray(renderable.actorInteractionMemberFaceKeys) ? renderable.actorInteractionMemberFaceKeys.length : 0,
    renderPath: renderable.renderPath != null ? String(renderable.renderPath) : null,
    cell: summarizeActorDiagCell(cell)
  };
}

function summarizeActorDiagFaceKeySet(faceKeySet, limit) {
  var keys = [];
  if (!faceKeySet || typeof faceKeySet.forEach !== 'function') return keys;
  var max = Math.max(1, Number(limit || 24));
  faceKeySet.forEach(function (key) {
    if (keys.length < max) keys.push(String(key));
  });
  return keys;
}

function getActorDiagFaceKeyCountsByFace(faceKeySet) {
  var out = Object.create(null);
  if (!faceKeySet || typeof faceKeySet.forEach !== 'function') return out;
  faceKeySet.forEach(function (key) {
    var parts = String(key || '').split('|');
    var face = parts.length >= 3 ? parts[2] : 'unknown';
    out[face] = (out[face] || 0) + 1;
  });
  return out;
}

function summarizeActorDiagNearbyBoxes(playerRef, sourceBoxes, radius, limit) {
  var out = [];
  var p = playerRef && typeof playerRef === 'object' ? playerRef : null;
  var boxesList = Array.isArray(sourceBoxes) ? sourceBoxes : [];
  if (!p || !boxesList.length) return out;
  var px = Number(p.x || 0);
  var py = Number(p.y || 0);
  var pz = Number(p.z || 0);
  var r = Math.max(1, Number(radius || 2));
  var max = Math.max(1, Number(limit || 20));
  for (var i = 0; i < boxesList.length; i++) {
    var b = boxesList[i];
    if (!b) continue;
    var bx = Number(b.x || 0);
    var by = Number(b.y || 0);
    var bz = Number(b.z || 0);
    var bw = Math.max(1, Number(b.w || 1));
    var bd = Math.max(1, Number(b.d || 1));
    var bh = Math.max(1, Number(b.h || 1));
    var nearestX = Math.max(bx, Math.min(px, bx + bw));
    var nearestY = Math.max(by, Math.min(py, by + bd));
    var distXY = Math.hypot(nearestX - px, nearestY - py);
    var topZ = bz + bh;
    if (distXY > r + 1.25) continue;
    if (topZ < pz - 2 || bz > pz + 3) continue;
    out.push(Object.assign({
      distXY: roundActorDiagNumber(distXY, 3),
      verticalDeltaTopMinusPlayerZ: roundActorDiagNumber(topZ - pz, 3)
    }, summarizeActorDiagCell(b)));
  }
  out.sort(function (a, b) {
    if (Math.abs(Number(a.verticalDeltaTopMinusPlayerZ || 0)) !== Math.abs(Number(b.verticalDeltaTopMinusPlayerZ || 0))) return Math.abs(Number(a.verticalDeltaTopMinusPlayerZ || 0)) - Math.abs(Number(b.verticalDeltaTopMinusPlayerZ || 0));
    return Number(a.distXY || 0) - Number(b.distXY || 0);
  });
  return out.slice(0, max);
}

function summarizeActorDiagReplacementRelations(replacements) {
  var out = Object.create(null);
  var list = Array.isArray(replacements) ? replacements : [];
  for (var i = 0; i < list.length; i++) {
    var r = list[i] || {};
    var relation = String(r.actorInteractionGroupSortRelation || 'none');
    var face = String(r.semanticFace || 'unknown');
    var terrainSuffix = isActorDiagTerrainCell(r.box || r.cell || null) ? ':terrain' : ':normal';
    var key = relation + ':' + face + terrainSuffix;
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function logActorInteractionFinalOrderDiagnostics(framePlanId, viewRotation, order) {
  if (!isActorInteractionOrderDiagEnabled()) return;
  var list = Array.isArray(order) ? order : [];
  var playerIndex = -1;
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].id === 'player-avatar') { playerIndex = i; break; }
  }
  var p = (typeof player !== 'undefined' && player) ? player : null;
  var px = Number(p && p.x || 0);
  var py = Number(p && p.y || 0);
  var pz = Number(p && p.z || 0);
  var windowItems = [];
  var start = Math.max(0, playerIndex - 10);
  var end = Math.min(list.length, playerIndex + 11);
  if (playerIndex < 0) { start = 0; end = Math.min(list.length, 24); }
  for (var wi = start; wi < end; wi++) {
    windowItems.push(Object.assign({ index: wi, relativeToPlayer: playerIndex >= 0 ? wi - playerIndex : null }, summarizeActorDiagRenderable(list[wi]) || {}));
  }
  var nearbyFaces = [];
  var supportTopFaces = [];
  for (var ri = 0; ri < list.length; ri++) {
    var r = list[ri];
    if (!r || r.kind === 'player-avatar') continue;
    var c = r.box || r.cell || null;
    if (!c) continue;
    var cx = Number(c.x || 0);
    var cy = Number(c.y || 0);
    var cw = Math.max(1, Number(c.w || 1));
    var cd = Math.max(1, Number(c.d || 1));
    var cz = Number(c.z || 0);
    var ch = Math.max(1, Number(c.h || 1));
    var centerX = cx + cw * 0.5;
    var centerY = cy + cd * 0.5;
    var nearXY = Math.abs(centerX - px) <= 2.75 && Math.abs(centerY - py) <= 2.75;
    if (!nearXY) continue;
    var item = Object.assign({ index: ri, relativeToPlayer: playerIndex >= 0 ? ri - playerIndex : null }, summarizeActorDiagRenderable(r) || {});
    if (nearbyFaces.length < 36) nearbyFaces.push(item);
    if (String(r.semanticFace || '') === 'top' && Math.abs((cz + ch) - pz) <= 0.001 && supportTopFaces.length < 16) supportTopFaces.push(item);
  }
  var signature = [framePlanId, playerIndex, roundActorDiagNumber(px, 2), roundActorDiagNumber(py, 2), roundActorDiagNumber(pz, 2), list.length, supportTopFaces.map(function (it) { return [it.index, it.relativeToPlayer, it.id].join(':'); }).join(';')].join('|');
  if (__actorInteractionOrderDiagState.lastFinalOrderSignature === signature) return;
  __actorInteractionOrderDiagState.lastFinalOrderSignature = signature;
  emitActorInteractionOrderDiag('final-order-window', {
    framePlanId: framePlanId,
    viewRotation: normalizeMainEditorViewRotationValue(viewRotation),
    renderableCount: list.length,
    playerIndex: playerIndex,
    player: summarizeActorDiagPlayer(p),
    supportTopFaceCount: supportTopFaces.length,
    supportTopFaces: supportTopFaces,
    window: windowItems,
    nearbyFaces: nearbyFaces
  });
}

function buildActorInteractionCellFaceKey(cell, semanticFace, viewRotation) {
  if (!cell) return null;
  var sf = String(semanticFace || '');
  if (!sf) return null;
  var screenFace = getScreenFaceForSemanticFace(sf, normalizeMainEditorViewRotationValue(viewRotation));
  return [
    cell.instanceId || 'unknown',
    [Number(cell.x || 0), Number(cell.y || 0), Number(cell.z || 0)].join(','),
    sf,
    screenFace || ''
  ].join('|');
}

function getActorInteractionMemberDescriptorsFromFaceDescriptor(descriptor) {
  if (!descriptor || typeof descriptor !== 'object') return [];
  if (Array.isArray(descriptor.members) && descriptor.members.length) return descriptor.members.filter(Boolean);
  return [descriptor];
}

function buildActorInteractionMemberFaceKeysFromFaceDescriptor(descriptor, viewRotation) {
  var members = getActorInteractionMemberDescriptorsFromFaceDescriptor(descriptor);
  var keys = [];
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    if (!m) continue;
    var cell = m.cell || m.box || null;
    var sf = String(m.semanticFace || descriptor.semanticFace || '');
    var key = buildActorInteractionCellFaceKey(cell, sf, viewRotation);
    if (key) keys.push(key);
  }
  return keys;
}


function getActorInteractionGroupKeyForCell(cell, fallbackInstanceId) {
  var c = cell && typeof cell === 'object' ? cell : {};
  var rawInstanceId = c.instanceId != null ? String(c.instanceId) : (fallbackInstanceId != null ? String(fallbackInstanceId) : '');
  return rawInstanceId || '';
}

function buildActorInteractionBoxGroupSummaryMap(sourceBoxes) {
  var map = new Map();
  var boxes = Array.isArray(sourceBoxes) ? sourceBoxes : [];
  for (var i = 0; i < boxes.length; i++) {
    var box = boxes[i];
    if (!box || typeof box !== 'object') continue;
    var instanceId = box.instanceId != null ? String(box.instanceId) : '';
    var groupKey = getActorInteractionGroupKeyForCell(box, instanceId);
    if (!groupKey) continue;
    var x = Math.floor(Number(box.x || 0));
    var y = Math.floor(Number(box.y || 0));
    var z = Math.floor(Number(box.z || 0));
    var w = Math.max(1, Math.floor(Number(box.w || 1)));
    var d = Math.max(1, Math.floor(Number(box.d || 1)));
    var h = Math.max(1, Math.floor(Number(box.h || 1)));
    var entry = map.get(groupKey);
    if (!entry) {
      entry = {
        instanceId: groupKey,
        sourceInstanceId: instanceId,
        footprintKeys: new Set(),
        minZ: z,
        maxZ: z + h,
        boxCount: 0
      };
      map.set(groupKey, entry);
    }
    entry.boxCount += 1;
    entry.minZ = Math.min(entry.minZ, z);
    entry.maxZ = Math.max(entry.maxZ, z + h);
    for (var dx = 0; dx < w; dx++) {
      for (var dy = 0; dy < d; dy++) {
        entry.footprintKeys.add(String(x + dx) + ',' + String(y + dy));
      }
    }
  }
  return map;
}

function isActorInteractionSingleColumnTallGroup(box, groupSummaryMap) {
  if (!box || !groupSummaryMap || typeof groupSummaryMap.get !== 'function') return false;
  var instanceId = box.instanceId != null ? String(box.instanceId) : '';
  var groupKey = getActorInteractionGroupKeyForCell(box, instanceId);
  if (!groupKey) return false;
  var group = groupSummaryMap.get(groupKey);
  if (!group) return false;
  var footprintCount = group.footprintKeys && typeof group.footprintKeys.size === 'number' ? group.footprintKeys.size : 0;
  var verticalSpan = Math.max(0, Number(group.maxZ || 0) - Number(group.minZ || 0));
  return footprintCount === 1 && verticalSpan > 1;
}

function isActorInteractionReplacementEligibleBox(box, groupSummaryMap) {
  if (!box || typeof box !== 'object') return false;

  // Actor-interaction replacement is only stable when the replacement face can
  // be assigned a deterministic player relation later in
  // applyActorInteractionGroupSortOverride(). That override deliberately only
  // supports single-footprint groups. Letting multi-footprint objects or large
  // terrain batches enter this path makes whole packets switch between
  // merged/static and actor-replacement renderables at tile boundaries, which is
  // the main source of the remaining flicker.
  if (isActorDiagTerrainCell(box)) return false;

  var instanceId = box.instanceId != null ? String(box.instanceId) : '';
  var groupKey = getActorInteractionGroupKeyForCell(box, instanceId);
  if (!groupKey || !groupSummaryMap || typeof groupSummaryMap.get !== 'function') return false;
  var group = groupSummaryMap.get(groupKey);
  if (!group) return false;
  var footprintCount = group.footprintKeys && typeof group.footprintKeys.size === 'number'
    ? group.footprintKeys.size
    : 0;

  // Keep the original reliable case: single-footprint objects, including tall
  // 1x1 stacks, can still be split locally and sorted against the player by the
  // single-footprint line anchor. Normal 2x1/large objects and terrain are left
  // on the stable static path; their top support is handled separately by the
  // support-top override.
  return footprintCount === 1;
}

function buildActorInteractionGroupSummaryMapFromPackets(renderables) {
  var list = Array.isArray(renderables) ? renderables : [];
  var map = new Map();
  for (var i = 0; i < list.length; i++) {
    var packet = list[i];
    if (!packet || packet.kind !== 'static-world-face-packet') continue;
    var members = Array.isArray(packet.actorInteractionMemberDescriptors) && packet.actorInteractionMemberDescriptors.length
      ? packet.actorInteractionMemberDescriptors
      : [packet.box || null];
    for (var mi = 0; mi < members.length; mi++) {
      var member = members[mi];
      var cell = member && (member.cell || member.box || member);
      if (!cell) continue;
      var instanceId = cell.instanceId != null ? String(cell.instanceId) : (packet.instanceId != null ? String(packet.instanceId) : '');
      var groupKey = getActorInteractionGroupKeyForCell(cell, instanceId);
      if (!groupKey) continue;
      var x = Math.floor(Number(cell.x || 0));
      var y = Math.floor(Number(cell.y || 0));
      var z = Math.floor(Number(cell.z || 0));
      var w = Math.max(1, Math.floor(Number(cell.w || 1)));
      var d = Math.max(1, Math.floor(Number(cell.d || 1)));
      var h = Math.max(1, Math.floor(Number(cell.h || 1)));
      var entry = map.get(groupKey);
      if (!entry) {
        entry = {
          instanceId: groupKey,
          sourceInstanceId: instanceId,
          minX: x,
          minY: y,
          maxX: x + w,
          maxY: y + d,
          minZ: z,
          maxZ: z + h,
          footprintKeys: new Set(),
          anchorCellX: x,
          anchorCellY: y
        };
        map.set(groupKey, entry);
      }
      entry.minX = Math.min(entry.minX, x);
      entry.minY = Math.min(entry.minY, y);
      entry.maxX = Math.max(entry.maxX, x + w);
      entry.maxY = Math.max(entry.maxY, y + d);
      entry.minZ = Math.min(entry.minZ, z);
      entry.maxZ = Math.max(entry.maxZ, z + h);
      for (var dx = 0; dx < w; dx++) {
        for (var dy = 0; dy < d; dy++) {
          var fx = x + dx;
          var fy = y + dy;
          entry.footprintKeys.add(String(fx) + ',' + String(fy));
          if (fx < entry.anchorCellX || (fx === entry.anchorCellX && fy < entry.anchorCellY)) {
            entry.anchorCellX = fx;
            entry.anchorCellY = fy;
          }
        }
      }
    }
  }
  return map;
}

function projectActorInteractionWorldPointNoCamera(point, viewRotation) {
  var api = getMainViewRotationCoreApi();
  var cfg = getMainViewProjectionConfigWithoutCamera();
  var p = point && typeof point === 'object' ? point : { x: 0, y: 0, z: 0 };
  if (api && typeof api.worldToScreenWithViewRotation === 'function') {
    var out = api.worldToScreenWithViewRotation({ x: Number(p.x || 0), y: Number(p.y || 0), z: Number(p.z || 0) }, viewRotation, cfg);
    return { x: Number(out && out.x || 0), y: Number(out && out.y || 0) };
  }
  return {
    x: cfg.originX + (Number(p.x || 0) - Number(p.y || 0)) * cfg.tileW / 2,
    y: cfg.originY + (Number(p.x || 0) + Number(p.y || 0)) * cfg.tileH / 2 - Number(p.z || 0) * cfg.tileH
  };
}

function computeActorInteractionPlayerSortMeta(playerRef, viewRotation) {
  var playerObj = playerRef && typeof playerRef === 'object' ? playerRef : { x: 0, y: 0, z: 0 };
  var domainCore = getDomainSceneCoreApi();
  if (domainCore && typeof domainCore.computePlayerActorRenderableSort === 'function') {
    return domainCore.computePlayerActorRenderableSort({ player: playerObj, viewRotation: normalizeMainEditorViewRotationValue(viewRotation) }) || { sortKey: 0, tie: 700000 };
  }
  var playerZ = Number(playerObj && playerObj.z != null ? playerObj.z : 0);
  var fallback = computeViewAwareSortMeta({ x: Number(playerObj.x || 0), y: Number(playerObj.y || 0), z: playerZ }, 0, normalizeMainEditorViewRotationValue(viewRotation));
  return { sortKey: Number(fallback.sortKey || 0) + 0.0007, tie: 700000 + Number(fallback.tie || 0) };
}

function classifyActorInteractionSingleFootprintGroupAgainstPlayer(group, playerRef, viewRotation) {
  if (!group || !playerRef) return 'none';
  var footprintCount = group.footprintKeys && typeof group.footprintKeys.size === 'number' ? group.footprintKeys.size : 0;
  if (footprintCount !== 1) return 'none';
  var px = Number(playerRef.x || 0);
  var py = Number(playerRef.y || 0);
  var pz = Number(playerRef.z || 0);
  var lineZ = Number(group.minZ || 0);
  var left = projectActorInteractionWorldPointNoCamera({ x: Number(group.anchorCellX || 0), y: Number(group.anchorCellY || 0) + 1, z: lineZ }, viewRotation);
  var right = projectActorInteractionWorldPointNoCamera({ x: Number(group.anchorCellX || 0) + 1, y: Number(group.anchorCellY || 0), z: lineZ }, viewRotation);
  var playerFoot = projectActorInteractionWorldPointNoCamera({ x: px, y: py, z: pz }, viewRotation);
  var lineY = lineYAtX(left, right, playerFoot.x);
  return playerFoot.y >= lineY ? 'player-in-front' : 'player-behind';
}

function applyActorInteractionGroupSortOverride(renderable, sourcePacket, groupSummaryMap, playerRef, viewRotation) {
  if (!renderable || !sourcePacket || !groupSummaryMap || !playerRef) return renderable;
  var sourceCell = renderable.box || sourcePacket.box || null;
  var instanceId = sourceCell && sourceCell.instanceId != null
    ? String(sourceCell.instanceId)
    : (renderable.instanceId != null ? String(renderable.instanceId) : (sourcePacket.instanceId != null ? String(sourcePacket.instanceId) : ''));
  var groupKey = getActorInteractionGroupKeyForCell(sourceCell, instanceId);
  if (!groupKey) return renderable;
  var group = groupSummaryMap.get(groupKey);
  if (!group) return renderable;
  var footprintCount = group.footprintKeys && typeof group.footprintKeys.size === 'number' ? group.footprintKeys.size : 0;
  if (footprintCount !== 1) return renderable;
  var relation = classifyActorInteractionSingleFootprintGroupAgainstPlayer(group, playerRef, viewRotation);
  if (relation === 'none') return renderable;
  var playerSortMeta = computeActorInteractionPlayerSortMeta(playerRef, viewRotation);
  var intraTie = Number(renderable.tie != null ? renderable.tie : (sourcePacket.tie || 0));
  var tieOffset = (Math.abs(intraTie) % 1000) * 0.000001;
  if (relation === 'player-in-front') {
    renderable.sortKey = Number(playerSortMeta.sortKey || 0) - 0.0006;
    renderable.tie = Number(playerSortMeta.tie || 0) - 50 + tieOffset;
  } else if (relation === 'player-behind') {
    renderable.sortKey = Number(playerSortMeta.sortKey || 0) + 0.0006;
    renderable.tie = Number(playerSortMeta.tie || 0) + 50 + tieOffset;
  }
  renderable.actorInteractionGroupSortRelation = relation;
  renderable.actorInteractionGroupFootprintMode = 'single-footprint-line-anchor';
  return renderable;
}

function buildActorInteractionCandidateFaceKeySetForPlayer(options) {
  var safe = options && typeof options === 'object' ? options : {};
  var playerRef = safe.player && typeof safe.player === 'object' ? safe.player : null;
  var sourceBoxes = Array.isArray(safe.sourceBoxes) ? safe.sourceBoxes : [];
  var occ = safe.occ && typeof safe.occ.has === 'function' ? safe.occ : new Map();
  var dynamicInstanceIdSet = safe.dynamicInstanceIdSet && typeof safe.dynamicInstanceIdSet.has === 'function' ? safe.dynamicInstanceIdSet : null;
  var viewRotation = normalizeMainEditorViewRotationValue(safe.viewRotation != null ? safe.viewRotation : getSafeMainEditorViewRotation(null).viewRotation);
  var radius = Math.max(1, Number(safe.radius || getActorInteractionSortRadiusForRender()));
  var out = new Set();
  if (!playerRef || !sourceBoxes.length) return out;
  var groupSummaryMap = buildActorInteractionBoxGroupSummaryMap(sourceBoxes);
  var eligibleBoxCount = 0;
  var skippedReplacementIneligibleBoxCount = 0;
  var skippedTerrainBoxCount = 0;
  var skippedMultiFootprintBoxCount = 0;
  var px = Number(playerRef.x || 0);
  var py = Number(playerRef.y || 0);
  var pz = Number(playerRef.z || 0);
  var faces = ['top', 'east', 'south', 'west', 'north'];
  for (var bi = 0; bi < sourceBoxes.length; bi++) {
    var box = sourceBoxes[bi];
    if (!box) continue;
    if (box.instanceId && dynamicInstanceIdSet && dynamicInstanceIdSet.has(String(box.instanceId))) continue;
    if (!isActorInteractionReplacementEligibleBox(box, groupSummaryMap)) {
      skippedReplacementIneligibleBoxCount += 1;
      if (isActorDiagTerrainCell(box)) skippedTerrainBoxCount += 1;
      else {
        var diagInstanceId = box.instanceId != null ? String(box.instanceId) : '';
        var diagGroupKey = getActorInteractionGroupKeyForCell(box, diagInstanceId);
        var diagGroup = diagGroupKey && groupSummaryMap && typeof groupSummaryMap.get === 'function' ? groupSummaryMap.get(diagGroupKey) : null;
        var diagFootprintCount = diagGroup && diagGroup.footprintKeys && typeof diagGroup.footprintKeys.size === 'number' ? diagGroup.footprintKeys.size : 0;
        if (diagFootprintCount > 1) skippedMultiFootprintBoxCount += 1;
      }
      continue;
    }
    eligibleBoxCount += 1;
    var bx = Math.floor(Number(box.x || 0));
    var by = Math.floor(Number(box.y || 0));
    var bz = Math.floor(Number(box.z || 0));
    var bw = Math.max(1, Math.floor(Number(box.w || 1)));
    var bd = Math.max(1, Math.floor(Number(box.d || 1)));
    var bh = Math.max(1, Math.floor(Number(box.h || 1)));
    if ((bz + bh) <= pz) continue;
    if ((bx - radius) > px || (bx + bw + radius) < px) continue;
    if ((by - radius) > py || (by + bd + radius) < py) continue;
    for (var dx = 0; dx < bw; dx++) {
      for (var dy = 0; dy < bd; dy++) {
        var cx = bx + dx;
        var cy = by + dy;
        if (Math.abs((cx + 0.5) - px) > (radius + 0.5)) continue;
        if (Math.abs((cy + 0.5) - py) > (radius + 0.5)) continue;
        for (var dz = 0; dz < bh; dz++) {
          var cz = bz + dz;
          if ((cz + 1) <= pz) continue;
          var cell = { x: cx, y: cy, z: cz, instanceId: box.instanceId || null };
          for (var fi = 0; fi < faces.length; fi++) {
            var sf = faces[fi];
            var delta = getSemanticFaceNeighborDeltaForRender(sf);
            if (occ.has(String(cx + delta.x) + ',' + String(cy + delta.y) + ',' + String(cz + delta.z))) continue;
            var key = buildActorInteractionCellFaceKey(cell, sf, viewRotation);
            if (key) out.add(key);
          }
        }
      }
    }
  }
  if (isActorInteractionOrderDiagEnabled()) {
    var candidateSignature = [roundActorDiagNumber(px, 2), roundActorDiagNumber(py, 2), roundActorDiagNumber(pz, 2), out.size, sourceBoxes.length, viewRotation].join('|');
    if (__actorInteractionOrderDiagState.lastCandidateSignature !== candidateSignature) {
      __actorInteractionOrderDiagState.lastCandidateSignature = candidateSignature;
      emitActorInteractionOrderDiag('candidate-face-set', {
        frameHint: 'frameplan-' + String((typeof __mainFramePlanSeq !== 'undefined' ? __mainFramePlanSeq : 0) + 1),
        viewRotation: viewRotation,
        player: summarizeActorDiagPlayer(playerRef),
        radius: radius,
        sourceBoxCount: sourceBoxes.length,
        candidateFaceKeyCount: out.size,
        candidateFaceCountsByFace: getActorDiagFaceKeyCountsByFace(out),
        eligibleBoxCount: eligibleBoxCount,
        skippedReplacementIneligibleBoxCount: skippedReplacementIneligibleBoxCount,
        skippedTerrainBoxCount: skippedTerrainBoxCount,
        skippedMultiFootprintBoxCount: skippedMultiFootprintBoxCount,
        candidateFaceKeySamples: summarizeActorDiagFaceKeySet(out, 28),
        nearbyBoxes: summarizeActorDiagNearbyBoxes(playerRef, sourceBoxes, radius, 24)
      });
    }
  }
  return out;
}

function areAllActorInteractionPacketKeysHit(packet, actorFaceKeySet) {
  if (!packet || packet.kind !== 'static-world-face-packet') return false;
  if (!actorFaceKeySet || typeof actorFaceKeySet.has !== 'function' || actorFaceKeySet.size <= 0) return false;
  var keys = Array.isArray(packet.actorInteractionMemberFaceKeys) ? packet.actorInteractionMemberFaceKeys : [];
  if (!keys.length) return false;
  for (var i = 0; i < keys.length; i++) {
    if (!actorFaceKeySet.has(keys[i])) return false;
  }
  return true;
}

function shouldSuppressStaticPacketForActorInteraction(packet, actorFaceKeySet) {
  if (!packet || packet.kind !== 'static-world-face-packet') return false;
  if (!actorFaceKeySet || typeof actorFaceKeySet.has !== 'function' || actorFaceKeySet.size <= 0) return false;
  var keys = Array.isArray(packet.actorInteractionMemberFaceKeys) ? packet.actorInteractionMemberFaceKeys : [];
  if (!keys.length) return false;
  for (var i = 0; i < keys.length; i++) {
    if (!actorFaceKeySet.has(keys[i])) return false;
  }
  return true;
}

function buildActorInteractionReplacementRenderableFromDescriptor(descriptor, sourcePacket, viewRotation) {
  if (!descriptor || !sourcePacket) return null;
  var sf = String(descriptor.semanticFace || sourcePacket.semanticFace || '');
  if (!sf) return null;
  var cell = descriptor.cell || descriptor.box || sourcePacket.box || null;
  if (!cell) return null;
  var normal = descriptor.normal || getSemanticFaceNormal(sf);
  var worldGeometry = buildMergedVoxelFaceWorldGeometry(Object.assign({}, descriptor, {
    merged: false,
    mergeWidth: 1,
    mergeHeight: 1,
    memberCount: 1
  }));
  var worldPts = Array.isArray(worldGeometry && worldGeometry.worldPts) ? worldGeometry.worldPts : [];
  var worldLoops = Array.isArray(worldGeometry && worldGeometry.worldLoops) ? worldGeometry.worldLoops : null;
  var worldOutlineSegments = Array.isArray(worldGeometry && worldGeometry.worldOutlineSegments) ? worldGeometry.worldOutlineSegments : null;
  if (!worldPts.length) return null;
  var screenFace = descriptor.screenFace || getScreenFaceForSemanticFace(sf, viewRotation);
  var terrainPatternDescriptor = getTerrainMaterialPatternDescriptorForRenderCell(cell, sf);
  var terrainFc = getTerrainMaterialBaseFaceColorsForRenderCell(cell);
  var fc = terrainFc || getCachedBaseFaceColorsForRenderable((cell && cell.base) || '#7aa2f7');
  var stroke = terrainPatternDescriptor && terrainPatternDescriptor.lineColor ? terrainPatternDescriptor.lineColor : fc.line;
  var fill = getCachedStaticRenderableFill(cell, sf, worldPts, normal, viewRotation, null).fill;
  var terrainSettings = getTerrainRenderSettingsForRender();
  var lightingActive = isStaticRenderableLightingActiveForBuild(terrainSettings);
  var shadowOverlaysWorld = lightingActive ? buildVoxelFaceShadowWorldOverlays(worldPts, normal, cell.instanceId || null, null) : [];
  var faceKey = buildActorInteractionCellFaceKey(cell, sf, viewRotation);
  if (!faceKey) return null;
  return {
    id: 'actor-interaction-packet-' + String(sourcePacket.id || 'packet') + '-' + String(faceKey || 'face'),
    kind: 'static-world-face-packet',
    sortKey: Number(descriptor.sortKey != null ? descriptor.sortKey : sourcePacket.sortKey || 0),
    tie: Number(descriptor.tie != null ? descriptor.tie : sourcePacket.tie || 0),
    instanceId: cell.instanceId || sourcePacket.instanceId || null,
    prefabId: cell.prefabId || sourcePacket.prefabId || null,
    renderPath: 'actor-interaction-replacement-packet',
    cacheViewRotation: viewRotation,
    cacheContentType: 'world-face-packets',
    cameraIndependent: true,
    usesScreenSpaceCache: false,
    semanticFace: sf,
    screenFace: screenFace,
    depthKey: descriptor.depthKey != null ? descriptor.depthKey : sourcePacket.depthKey || 0,
    fill: fill,
    stroke: stroke,
    texture: sourcePacket.texture || null,
    textureColor: sourcePacket.textureColor || null,
    semanticTextureSlot: sourcePacket.semanticTextureSlot || null,
    semanticTextureSlotColor: sourcePacket.semanticTextureSlotColor || null,
    width: 1,
    worldPts: worldPts,
    worldLoops: worldLoops,
    worldOutlineSegments: worldOutlineSegments,
    shadowOverlaysWorld: shadowOverlaysWorld,
    box: cell,
    cellX: Number(cell.x || 0),
    cellY: Number(cell.y || 0),
    cellZ: Number(cell.z || 0),
    faceKey: faceKey,
    actorInteractionMemberFaceKeys: [faceKey],
    actorInteractionMemberDescriptors: [descriptor],
    packetNormal: normal,
    mergedFace: false,
    mergedFaceCount: 1,
    mergeWidth: 1,
    mergeHeight: 1,
    terrainMaterialMergeKey: descriptor.terrainMaterialMergeKey || sourcePacket.terrainMaterialMergeKey || null,
    terrainMaterialId: getTerrainMaterialIdForRenderCell(cell),
    terrainMaterialLabel: terrainPatternDescriptor && terrainPatternDescriptor.label ? terrainPatternDescriptor.label : null,
    materialType: cell && (cell.materialType || cell.terrainBand) ? String(cell.materialType || cell.terrainBand) : null,
    terrainPatternDescriptor: terrainPatternDescriptor || null,
    terrainPatternOpacity: terrainPatternDescriptor && Number.isFinite(Number(terrainPatternDescriptor.opacity)) ? Number(terrainPatternDescriptor.opacity) : null,
    actorInteractionReplacement: true,
    actorInteractionSourcePacketId: sourcePacket.id || null
  };
}


function getStableActorSortApiForRender() {
  try {
    return (typeof window !== 'undefined' && window.__ACTOR_SORT_STABLE__)
      ? window.__ACTOR_SORT_STABLE__
      : null;
  } catch (_) {
    return null;
  }
}

function isStableActorSortModeEnabledForRender() {
  var api = getStableActorSortApiForRender();
  if (api && typeof api.isEnabled === 'function') {
    try { return api.isEnabled() !== false; } catch (_) {}
  }
  return true;
}

function getActorInteractionPacketMemberCells(packet) {
  var out = [];
  if (!packet || typeof packet !== 'object') return out;
  var members = Array.isArray(packet.actorInteractionMemberDescriptors) && packet.actorInteractionMemberDescriptors.length
    ? packet.actorInteractionMemberDescriptors
    : (Array.isArray(packet.members) && packet.members.length ? packet.members : [packet.box || packet.cell || null]);
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var cell = m && (m.cell || m.box || m);
    if (cell && typeof cell === 'object') out.push(cell);
  }
  return out;
}

function isActorInteractionTerrainSupportTopPacket(packet, cells) {
  if (!packet || typeof packet !== 'object') return false;
  if (packet.terrainMaterialMergeKey != null || packet.terrainMaterialId != null || packet.terrainMaterialLabel != null) return true;
  var packetMaterial = String(packet.materialType || packet.terrainBand || packet.prefabId || packet.instanceId || '').toLowerCase();
  if (packetMaterial.indexOf('terrain') >= 0) return true;
  var list = Array.isArray(cells) ? cells : [];
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (!c) continue;
    if (c.generatedBy === 'terrain-generator' || c.terrain === true || c.isTerrain === true) return true;
    if (c.terrainBand != null || c.terrainMaterialId != null || c.terrainMaterialMergeKey != null) return true;
    var cellText = String(c.materialType || c.prefabId || c.instanceId || '').toLowerCase();
    if (cellText.indexOf('terrain') >= 0) return true;
  }
  return false;
}

function getActorInteractionPacketGroupKeys(packet, cells) {
  var keys = [];
  var seen = new Set();
  var list = Array.isArray(cells) ? cells : [];
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (!c) continue;
    var instanceId = c.instanceId != null ? String(c.instanceId) : (packet && packet.instanceId != null ? String(packet.instanceId) : '');
    var key = getActorInteractionGroupKeyForCell(c, instanceId);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

function doesTopPacketActAsPlayerSupportFloor(packet, playerRef, groupSummaryMap) {
  if (!packet || !playerRef) return false;
  if (packet.kind !== 'static-world-face-packet') return false;
  if (String(packet.semanticFace || '') !== 'top') return false;

  var px = Number(playerRef.x || 0);
  var py = Number(playerRef.y || 0);
  var pz = Number(playerRef.z || 0);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) return false;

  var cells = getActorInteractionPacketMemberCells(packet);
  if (!cells.length) return false;

  var isTerrainPacket = isActorInteractionTerrainSupportTopPacket(packet, cells);
  if (!isTerrainPacket) {
    var groupKeys = getActorInteractionPacketGroupKeys(packet, cells);
    if (groupKeys.length !== 1 || !groupSummaryMap || typeof groupSummaryMap.get !== 'function') return false;
    var group = groupSummaryMap.get(groupKeys[0]);
    var footprintCount = group && group.footprintKeys && typeof group.footprintKeys.size === 'number'
      ? group.footprintKeys.size
      : 0;
    // Preserve the original stable path for normal multi-footprint objects such as 2x1 bench/table/sofa.
    // The support-top override is only needed for terrain top packets and normal single-cell top packets.
    if (footprintCount !== 1) return false;
  }

  // Use a half-open footprint interval for support-top ownership.
  // The previous +/- margin made two adjacent merged top packets both claim the
  // player at cell borders, so the same visible floor switched between one and
  // two support packets while walking and produced frame-to-frame flicker.
  var supportEpsilon = 0.0001;
  for (var i = 0; i < cells.length; i++) {
    var c = cells[i];
    if (!c) continue;
    var cx = Math.floor(Number(c.x || 0));
    var cy = Math.floor(Number(c.y || 0));
    var cz = Number(c.z || 0);
    var cw = Math.max(1, Number(c.w != null ? c.w : 1));
    var cd = Math.max(1, Number(c.d != null ? c.d : 1));
    var ch = Math.max(1, Number(c.h != null ? c.h : 1));
    var topZ = cz + ch;
    if (Math.abs(topZ - pz) > 0.001) continue;
    if (px >= cx - supportEpsilon && px < cx + cw - supportEpsilon
      && py >= cy - supportEpsilon && py < cy + cd - supportEpsilon) {
      return true;
    }
  }
  return false;
}
function getActorInteractionPacketMemberDescriptors(packet) {
  if (!packet || typeof packet !== 'object') return [];
  if (Array.isArray(packet.actorInteractionMemberDescriptors) && packet.actorInteractionMemberDescriptors.length) {
    return packet.actorInteractionMemberDescriptors.filter(Boolean);
  }
  if (Array.isArray(packet.members) && packet.members.length) return packet.members.filter(Boolean);
  var fallback = packet.box || packet.cell || null;
  return fallback ? [Object.assign({}, packet, { cell: fallback, box: fallback })] : [];
}

function hashStableLocalDemergeString(seed, value) {
  var hash = Number(seed || 2166136261) >>> 0;
  var str = String(value == null ? '' : value);
  for (var i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function getStableLocalDemergePacketIdentity(packet) {
  if (!packet || typeof packet !== 'object') return 'null';
  return [
    packet.id || '',
    packet.faceKey || '',
    packet.semanticFace || '',
    packet.screenFace || '',
    Number(packet.sortKey || 0).toFixed(3),
    Number(packet.tie || 0).toFixed(3),
    Number(packet.mergedFaceCount || packet.memberCount || 1),
    packet.terrainMaterialMergeKey || '',
    packet.cacheViewRotation != null ? Number(packet.cacheViewRotation || 0) : ''
  ].join('~');
}

function buildStableLocalDemergeListHash(staticRenderables) {
  var list = Array.isArray(staticRenderables) ? staticRenderables : [];
  var hash = 2166136261 >>> 0;
  hash = hashStableLocalDemergeString(hash, list.length);
  for (var i = 0; i < list.length; i++) {
    hash = hashStableLocalDemergeString(hash, getStableLocalDemergePacketIdentity(list[i]));
  }
  return String(hash >>> 0);
}

function floorStableLocalDemergeCoord(value) {
  var n = Number(value || 0);
  if (!Number.isFinite(n)) n = 0;
  return Math.floor(n);
}

function getStableLocalDemergeInteractionCell(playerRef) {
  if (!playerRef || typeof playerRef !== 'object') return null;
  return {
    x: floorStableLocalDemergeCoord(playerRef.x),
    y: floorStableLocalDemergeCoord(playerRef.y),
    z: floorStableLocalDemergeCoord(playerRef.z)
  };
}

function buildStableLocalDemergeInteractionCellKey(playerRef) {
  var cell = getStableLocalDemergeInteractionCell(playerRef);
  if (!cell) return 'none';
  return [cell.x, cell.y, cell.z].join(',');
}

function buildStableLocalDemergeCacheKey(staticRenderables, viewRotation, playerRef, radius) {
  var list = Array.isArray(staticRenderables) ? staticRenderables : [];
  var surfaceStats = typeof __lastSurfaceCacheStats !== 'undefined' && __lastSurfaceCacheStats ? __lastSurfaceCacheStats : {};
  var staticCache = typeof staticBoxRenderCache !== 'undefined' && staticBoxRenderCache ? staticBoxRenderCache : {};
  var interactionCellKey = buildStableLocalDemergeInteractionCellKey(playerRef);
  return [
    'v3-interaction-cell',
    normalizeMainEditorViewRotationValue(viewRotation),
    Number(radius || 0).toFixed(2),
    interactionCellKey,
    String(staticCache.geometrySignature || ''),
    String(staticCache.cacheSignature || ''),
    Number(surfaceStats.visibleChunkCount || 0),
    Number(surfaceStats.visibleStaticPacketCount || list.length || 0),
    Number(surfaceStats.rebuiltChunkCountThisFrame || 0),
    Number(surfaceStats.reusedChunkCountThisFrame || 0),
    buildStableLocalDemergeListHash(list)
  ].join('|');
}

function isActorInteractionDescriptorNearPlayerForLocalDemerge(descriptor, playerRef, radius) {
  var cell = descriptor && (descriptor.cell || descriptor.box) ? (descriptor.cell || descriptor.box) : null;
  if (!cell || !playerRef) return false;
  var interactionCell = getStableLocalDemergeInteractionCell(playerRef);
  if (!interactionCell) return false;
  // The local demerge set is intentionally keyed by the actor interaction tile,
  // not by sub-tile coordinates. Test against the whole tile AABB so walking
  // inside one tile updates only the player sprite position, not static splits.
  var px0 = Number(interactionCell.x || 0);
  var py0 = Number(interactionCell.y || 0);
  var px1 = px0 + 1;
  var py1 = py0 + 1;
  var pz = Number(interactionCell.z || 0);
  if (!Number.isFinite(px0) || !Number.isFinite(py0) || !Number.isFinite(pz)) return false;
  var bx = Math.floor(Number(cell.x || 0));
  var by = Math.floor(Number(cell.y || 0));
  var bz = Number(cell.z || 0);
  var bw = Math.max(1, Number(cell.w != null ? cell.w : 1));
  var bd = Math.max(1, Number(cell.d != null ? cell.d : 1));
  var bh = Math.max(1, Number(cell.h != null ? cell.h : 1));
  var r = Math.max(0.25, Number(radius || getActorInteractionSortRadiusForRender() || 2));
  var cellMinX = bx;
  var cellMaxX = bx + bw;
  var cellMinY = by;
  var cellMaxY = by + bd;
  var dx = Math.max(0, Math.max(cellMinX - px1, px0 - cellMaxX));
  var dy = Math.max(0, Math.max(cellMinY - py1, py0 - cellMaxY));
  var distXY = Math.hypot(dx, dy);
  if (distXY > r + 0.75) return false;

  // Keep local demerge around the actor's usable vertical interaction band only.
  // This includes the support floor under the feet and nearby side/top faces, but
  // avoids splitting distant merged terrain on other height levels.
  var playerHeight = Math.max(0.2, Number((typeof settings !== 'undefined' && settings && settings.playerHeightCells != null) ? settings.playerHeightCells : 1.7));
  var bottomZ = bz;
  var topZ = bz + bh;
  return topZ >= pz - 0.75 && bottomZ <= pz + playerHeight + 0.75;
}

function buildStaticWorldFacePacketFromDescriptorForActorDemerge(descriptor, sourcePacket, viewRotation, mode, localIndex) {
  if (!descriptor || !sourcePacket) return null;
  var sf = String(descriptor.semanticFace || sourcePacket.semanticFace || '');
  if (!sf) return null;
  var cell = descriptor.cell || descriptor.box || sourcePacket.box || null;
  if (!cell) return null;
  var normal = descriptor.normal || sourcePacket.packetNormal || getSemanticFaceNormal(sf);
  var worldGeometry = buildMergedVoxelFaceWorldGeometry(descriptor);
  var worldPts = Array.isArray(worldGeometry && worldGeometry.worldPts) ? worldGeometry.worldPts : [];
  var worldLoops = Array.isArray(worldGeometry && worldGeometry.worldLoops) ? worldGeometry.worldLoops : null;
  var worldOutlineSegments = Array.isArray(worldGeometry && worldGeometry.worldOutlineSegments) ? worldGeometry.worldOutlineSegments : null;
  if (!worldPts.length) return null;
  var screenFace = descriptor.screenFace || sourcePacket.screenFace || getScreenFaceForSemanticFace(sf, viewRotation);
  var terrainPatternDescriptor = getTerrainMaterialPatternDescriptorForRenderCell(cell, sf);
  var terrainFc = getTerrainMaterialBaseFaceColorsForRenderCell(cell);
  var fc = terrainFc || getCachedBaseFaceColorsForRenderable((cell && cell.base) || '#7aa2f7');
  var stroke = terrainPatternDescriptor && terrainPatternDescriptor.lineColor ? terrainPatternDescriptor.lineColor : (sourcePacket.stroke || fc.line);
  var fill = getCachedStaticRenderableFill(cell, sf, worldPts, normal, viewRotation, null).fill;
  var terrainSettings = getTerrainRenderSettingsForRender();
  var lightingActive = isStaticRenderableLightingActiveForBuild(terrainSettings);
  var suppressMergedTerrainTopShadows = !!(descriptor && descriptor.isTerrainFaceMergeCandidate === true && sf === 'top' && Array.isArray(worldLoops) && worldLoops.length > 0);
  var shadowOverlaysWorld = lightingActive && !suppressMergedTerrainTopShadows
    ? buildVoxelFaceShadowWorldOverlays(worldPts, normal, cell.instanceId || null, null)
    : [];
  var terrainBoundarySegmentsWorld = buildTerrainTopBoundarySegmentsWorldFromDescriptor(
    descriptor,
    sourcePacket.terrainBoundaryOccupancyReader || getGlobalTerrainBoundaryOccupancyReaderForRender('stable-local-demerge:terrain-boundary')
  );
  var terrainLoopSignature = buildTerrainPolygonLoopSignature(descriptor);
  var merged = descriptor.merged === true;
  var faceKey = merged
    ? [cell.instanceId || 'unknown', [Number(descriptor.mergePlane || 0), Number(descriptor.mergeU || 0), Number(descriptor.mergeV || 0), Number(descriptor.mergeWidth || 1), Number(descriptor.mergeHeight || 1), Number(descriptor.memberCount || 1)].join(','), terrainLoopSignature || '', sf, screenFace].join('|')
    : buildActorInteractionCellFaceKey(cell, sf, viewRotation);
  if (!faceKey) return null;
  var modeLabel = String(mode || (merged ? 'residual-merged' : 'near-single'));
  return {
    id: 'stable-local-demerge-' + modeLabel + '-' + String(sourcePacket.id || 'packet') + '-' + String(localIndex || 0) + '-' + String(faceKey || 'face'),
    kind: 'static-world-face-packet',
    sortKey: Number(descriptor.sortKey != null ? descriptor.sortKey : sourcePacket.sortKey || 0),
    tie: Number(descriptor.tie != null ? descriptor.tie : sourcePacket.tie || 0),
    instanceId: cell.instanceId || sourcePacket.instanceId || null,
    prefabId: cell.prefabId || sourcePacket.prefabId || null,
    renderPath: 'stable-actor-sort-local-demerge-' + modeLabel,
    cacheViewRotation: viewRotation,
    cacheContentType: 'world-face-packets',
    cameraIndependent: true,
    usesScreenSpaceCache: false,
    semanticFace: sf,
    screenFace: screenFace,
    depthKey: descriptor.depthKey != null ? descriptor.depthKey : sourcePacket.depthKey || 0,
    fill: fill,
    stroke: stroke,
    texture: sourcePacket.texture || null,
    textureColor: sourcePacket.textureColor || null,
    semanticTextureSlot: sourcePacket.semanticTextureSlot || null,
    semanticTextureSlotColor: sourcePacket.semanticTextureSlotColor || null,
    width: sourcePacket.width || 1,
    worldPts: worldPts,
    worldLoops: worldLoops,
    worldOutlineSegments: worldOutlineSegments,
    terrainBoundarySegmentsWorld: terrainBoundarySegmentsWorld,
    terrainBoundaryStroke: sourcePacket.terrainBoundaryStroke || stroke,
    terrainBoundaryStrokeWidth: terrainBoundarySegmentsWorld.length ? (sourcePacket.terrainBoundaryStrokeWidth || 2.6) : 0,
    shadowOverlaysWorld: shadowOverlaysWorld,
    box: cell,
    cellX: Number(cell.x || 0),
    cellY: Number(cell.y || 0),
    cellZ: Number(cell.z || 0),
    faceKey: faceKey,
    actorInteractionMemberFaceKeys: buildActorInteractionMemberFaceKeysFromFaceDescriptor(descriptor, viewRotation),
    actorInteractionMemberDescriptors: getActorInteractionMemberDescriptorsFromFaceDescriptor(descriptor),
    packetNormal: normal,
    mergedFace: merged,
    mergedFaceCount: Number(descriptor.memberCount || 1),
    mergeWidth: Number(descriptor.mergeWidth || 1),
    mergeHeight: Number(descriptor.mergeHeight || 1),
    terrainMaterialMergeKey: descriptor.terrainMaterialMergeKey || sourcePacket.terrainMaterialMergeKey || null,
    terrainMaterialId: getTerrainMaterialIdForRenderCell(cell),
    terrainMaterialLabel: terrainPatternDescriptor && terrainPatternDescriptor.label ? terrainPatternDescriptor.label : sourcePacket.terrainMaterialLabel || null,
    materialType: cell && (cell.materialType || cell.terrainBand) ? String(cell.materialType || cell.terrainBand) : (sourcePacket.materialType || null),
    terrainPatternDescriptor: terrainPatternDescriptor || sourcePacket.terrainPatternDescriptor || null,
    terrainPatternOpacity: terrainPatternDescriptor && Number.isFinite(Number(terrainPatternDescriptor.opacity)) ? Number(terrainPatternDescriptor.opacity) : sourcePacket.terrainPatternOpacity || null,
    actorInteractionReplacement: false,
    actorInteractionStableDemergedFace: modeLabel === 'near-single',
    actorInteractionStableLocalDemerge: true,
    actorInteractionStableDemergeSourcePacketId: sourcePacket.id || null,
    actorInteractionStableDemergeMode: modeLabel,
    actorInteractionGroupFootprintMode: modeLabel === 'near-single' ? 'stable-local-demerge-near-player' : 'stable-local-demerge-residual-merged'
  };
}

function mergeActorInteractionResidualDescriptorsForPacket(sourcePacket, residualMembers) {
  var list = Array.isArray(residualMembers) ? residualMembers.filter(Boolean) : [];
  if (list.length <= 1) return list.slice();
  var cells = getActorInteractionPacketMemberCells(sourcePacket);
  var terrainLike = isActorInteractionTerrainSupportTopPacket(sourcePacket, cells);
  if (terrainLike) {
    var terrainCore = getTerrainFaceMergeCoreApi();
    if (terrainCore && typeof terrainCore.mergeTerrainFaceDescriptors === 'function') {
      var terrainResult = terrainCore.mergeTerrainFaceDescriptors(list, { enabled: true });
      if (terrainResult && Array.isArray(terrainResult.descriptors)) return terrainResult.descriptors;
    }
  }
  var faceMergeCore = getStaticWorldFaceMergeCoreApi();
  if (faceMergeCore && typeof faceMergeCore.mergeFaceDescriptors === 'function') {
    var result = faceMergeCore.mergeFaceDescriptors(list, { enabled: true });
    if (result && Array.isArray(result.descriptors)) return result.descriptors;
  }
  return list.slice();
}

function applyStableActorSortDemergeToStaticRenderables(staticRenderables, viewRotation, playerRef, options) {
  var list = Array.isArray(staticRenderables) ? staticRenderables : [];
  var api = getStableActorSortApiForRender();
  if (!api || typeof api.shouldDemergeStaticPacket !== 'function' || !isStableActorSortModeEnabledForRender()) {
    return {
      staticRenderables: list,
      inputCount: list.length,
      outputCount: list.length,
      splitPacketCount: 0,
      createdFaceCount: 0,
      residualMergedPacketCount: 0,
      cacheHit: false,
      mode: isStableActorSortModeEnabledForRender() ? 'stable-no-demerge-api' : 'legacy-disabled'
    };
  }

  var opts = options && typeof options === 'object' ? options : {};
  var radius = Math.max(1, Number(opts.radius || getActorInteractionSortRadiusForRender() || 2));
  var playerObj = playerRef && typeof playerRef === 'object' ? playerRef : null;
  if (!playerObj) {
    return {
      staticRenderables: list,
      inputCount: list.length,
      outputCount: list.length,
      splitPacketCount: 0,
      createdFaceCount: 0,
      residualMergedPacketCount: 0,
      cacheHit: false,
      mode: 'stable-local-demerge-no-player'
    };
  }

  var normalizedViewRotation = normalizeMainEditorViewRotationValue(viewRotation);
  var cacheKey = buildStableLocalDemergeCacheKey(list, normalizedViewRotation, playerObj, radius);
  if (__stableLocalDemergeCache && __stableLocalDemergeCache.key === cacheKey && __stableLocalDemergeCache.result) {
    __stableLocalDemergeCache.hitCount += 1;
    return Object.assign({}, __stableLocalDemergeCache.result, {
      cacheHit: true,
      cacheHitCount: __stableLocalDemergeCache.hitCount,
      cacheMissCount: __stableLocalDemergeCache.missCount
    });
  }
  if (__stableLocalDemergeCache) __stableLocalDemergeCache.missCount += 1;

  var out = [];
  var splitPacketCount = 0;
  var createdFaceCount = 0;
  var residualMergedPacketCount = 0;
  var nearMemberCount = 0;
  var farMemberCount = 0;
  var checkedPacketCount = 0;
  var skippedFarPacketCount = 0;
  var samples = [];
  var residualSamples = [];

  for (var i = 0; i < list.length; i++) {
    var packet = list[i];
    var members = getActorInteractionPacketMemberDescriptors(packet);
    if (!members.length || members.length <= 1) {
      out.push(packet);
      continue;
    }

    var nearMembers = [];
    var farMembers = [];
    for (var mi = 0; mi < members.length; mi++) {
      var member = members[mi];
      if (isActorInteractionDescriptorNearPlayerForLocalDemerge(member, playerObj, radius)) nearMembers.push(member);
      else farMembers.push(member);
    }
    if (!nearMembers.length) {
      out.push(packet);
      skippedFarPacketCount += 1;
      continue;
    }

    var shouldSplit = false;
    checkedPacketCount += 1;
    try { shouldSplit = api.shouldDemergeStaticPacket(packet) === true; } catch (_) { shouldSplit = false; }
    if (!shouldSplit) {
      out.push(packet);
      continue;
    }

    var createdForPacket = 0;
    for (var ni = 0; ni < nearMembers.length; ni++) {
      var replacement = buildStaticWorldFacePacketFromDescriptorForActorDemerge(nearMembers[ni], packet, normalizedViewRotation, 'near-single', ni);
      if (!replacement) continue;
      out.push(replacement);
      createdForPacket += 1;
      createdFaceCount += 1;
      nearMemberCount += 1;
      if (samples.length < 16) samples.push(summarizeActorDiagRenderable(replacement));
    }

    var residualDescriptors = farMembers.length ? mergeActorInteractionResidualDescriptorsForPacket(packet, farMembers) : [];
    for (var ri = 0; ri < residualDescriptors.length; ri++) {
      var residual = buildStaticWorldFacePacketFromDescriptorForActorDemerge(residualDescriptors[ri], packet, normalizedViewRotation, 'residual-merged', ri);
      if (!residual) continue;
      out.push(residual);
      if (residual.mergedFace === true) residualMergedPacketCount += 1;
      farMemberCount += Math.max(1, Number(residual.mergedFaceCount || 1));
      if (residualSamples.length < 12) residualSamples.push(summarizeActorDiagRenderable(residual));
    }

    if (createdForPacket > 0) splitPacketCount += 1;
    else out.push(packet);
  }

  if (splitPacketCount > 0) out.sort(compareRenderablesByDomain);
  if (splitPacketCount > 0 && isActorInteractionOrderDiagEnabled()) {
    emitActorInteractionOrderDiag('stable-local-demerge-static-packets', {
      mode: 'stable-local-player-radius-demerge',
      viewRotation: normalizedViewRotation,
      radius: radius,
      playerInteractionCellKey: buildStableLocalDemergeInteractionCellKey(playerObj),
      player: summarizeActorDiagPlayer(playerObj),
      inputStaticRenderableCount: Number(list.length || 0),
      outputStaticRenderableCount: Number(out.length || 0),
      splitPacketCount: Number(splitPacketCount || 0),
      createdFaceCount: Number(createdFaceCount || 0),
      nearMemberCount: Number(nearMemberCount || 0),
      farMemberCount: Number(farMemberCount || 0),
      checkedPacketCount: Number(checkedPacketCount || 0),
      skippedFarPacketCount: Number(skippedFarPacketCount || 0),
      residualMergedPacketCount: Number(residualMergedPacketCount || 0),
      samples: samples,
      residualSamples: residualSamples
    }, { maxCount: 6000 });
  }

  var result = {
    staticRenderables: out,
    inputCount: list.length,
    outputCount: out.length,
    splitPacketCount: splitPacketCount,
    createdFaceCount: createdFaceCount,
    residualMergedPacketCount: residualMergedPacketCount,
    playerInteractionCellKey: buildStableLocalDemergeInteractionCellKey(playerObj),
    checkedPacketCount: checkedPacketCount,
    skippedFarPacketCount: skippedFarPacketCount,
    cacheHit: false,
    cacheHitCount: __stableLocalDemergeCache ? __stableLocalDemergeCache.hitCount : 0,
    cacheMissCount: __stableLocalDemergeCache ? __stableLocalDemergeCache.missCount : 0,
    mode: 'stable-local-player-radius-demerge'
  };
  if (__stableLocalDemergeCache) {
    __stableLocalDemergeCache.key = cacheKey;
    __stableLocalDemergeCache.result = result;
  }
  return result;
}


function applyPlayerSupportTopSortOverrideToRenderables(staticRenderables, playerRef, viewRotation) {
  var list = Array.isArray(staticRenderables) ? staticRenderables : [];
  var stableActorSortApi = getStableActorSortApiForRender();
  if (stableActorSortApi && typeof stableActorSortApi.applyStablePlayerFaceSort === 'function' && isStableActorSortModeEnabledForRender()) {
    return stableActorSortApi.applyStablePlayerFaceSort({
      staticRenderables: list,
      player: playerRef,
      viewRotation: viewRotation,
      helpers: {
        computePlayerSortMeta: computeActorInteractionPlayerSortMeta,
        compareRenderables: compareRenderablesByDomain,
        summarizeRenderable: summarizeActorDiagRenderable,
        summarizePlayer: summarizeActorDiagPlayer,
        emitDiag: emitActorInteractionOrderDiag
      }
    });
  }
  if (!list.length || !playerRef) {
    return { staticRenderables: list, overrideCount: 0, overrideSamples: [] };
  }
  var playerSortMeta = computeActorInteractionPlayerSortMeta(playerRef, viewRotation);
  var overrideCount = 0;
  var samples = [];
  var out = list.slice();
  var groupSummaryMap = buildActorInteractionGroupSummaryMapFromPackets(out);
  for (var i = 0; i < out.length; i++) {
    var packet = out[i];
    if (!doesTopPacketActAsPlayerSupportFloor(packet, playerRef, groupSummaryMap)) continue;
    var originalTie = Number(packet && packet.tie != null ? packet.tie : 0);
    var clone = Object.assign({}, packet, {
      sortKey: Number(playerSortMeta.sortKey || 0) - 0.0012,
      tie: Number(playerSortMeta.tie || 0) - 120 + ((Math.abs(originalTie) % 1000) * 0.000001),
      actorInteractionSupportTopSortOverride: true,
      actorInteractionSupportFloor: true,
      actorInteractionGroupSortRelation: 'support-top-before-player',
      actorInteractionGroupFootprintMode: 'support-top-only-no-split',
      renderPath: String(packet && packet.renderPath || 'static-world-chunk-packet') + '+support-top-sort-override'
    });
    out[i] = clone;
    overrideCount += 1;
    if (samples.length < 16) samples.push(summarizeActorDiagRenderable(clone));
  }
  if (overrideCount > 0) out.sort(compareRenderablesByDomain);
  if (overrideCount > 0 && isActorInteractionOrderDiagEnabled()) {
    emitActorInteractionOrderDiag('support-top-sort-override', {
      viewRotation: normalizeMainEditorViewRotationValue(viewRotation),
      player: summarizeActorDiagPlayer(playerRef),
      overrideCount: overrideCount,
      samples: samples
    }, { maxCount: 6000 });
  }
  return { staticRenderables: out, overrideCount: overrideCount, overrideSamples: samples };
}

function applyActorInteractionReplacementToRenderables(staticRenderables, actorFaceKeySet, viewRotation, playerRef) {
  var list = Array.isArray(staticRenderables) ? staticRenderables : [];
  var filtered = [];
  var replacements = [];
  var suppressedPacketCount = 0;
  var checkedPacketCount = 0;
  var suppressedFaceKeySet = new Set();
  var groupSummaryMap = buildActorInteractionGroupSummaryMapFromPackets(list);
  var diagEnabled = isActorInteractionOrderDiagEnabled();
  var diagSuppressedPackets = [];
  for (var i = 0; i < list.length; i++) {
    var packet = list[i];
    if (packet && packet.kind === 'static-world-face-packet') checkedPacketCount += 1;

    if (shouldSuppressStaticPacketForActorInteraction(packet, actorFaceKeySet)) {
      suppressedPacketCount += 1;
      var keys = Array.isArray(packet.actorInteractionMemberFaceKeys) ? packet.actorInteractionMemberFaceKeys : [];
      var diagHitKeys = [];
      if (diagEnabled) {
        for (var dki = 0; dki < keys.length; dki++) {
          if (actorFaceKeySet && typeof actorFaceKeySet.has === 'function' && actorFaceKeySet.has(keys[dki])) diagHitKeys.push(keys[dki]);
        }
      }
      for (var ki = 0; ki < keys.length; ki++) suppressedFaceKeySet.add(keys[ki]);
      var members = Array.isArray(packet.actorInteractionMemberDescriptors) ? packet.actorInteractionMemberDescriptors : [];
      var diagReplacementCountBefore = replacements.length;
      for (var mi = 0; mi < members.length; mi++) {
        var replacement = buildActorInteractionReplacementRenderableFromDescriptor(members[mi], packet, viewRotation);
        if (replacement && replacement.faceKey && suppressedFaceKeySet.has(replacement.faceKey)) {
          replacement = applyActorInteractionGroupSortOverride(replacement, packet, groupSummaryMap, playerRef, viewRotation);
          replacements.push(replacement);
        }
      }
      if (diagEnabled && diagSuppressedPackets.length < 24) {
        diagSuppressedPackets.push({
          packet: summarizeActorDiagRenderable(packet),
          keyCount: keys.length,
          hitKeyCount: diagHitKeys.length,
          hitKeySamples: diagHitKeys.slice(0, 8),
          memberCount: members.length,
          replacementCreatedCount: replacements.length - diagReplacementCountBefore
        });
      }
      continue;
    }
    filtered.push(packet);
  }
  for (var ri = 0; ri < replacements.length; ri++) filtered.push(replacements[ri]);
  filtered.sort(compareRenderablesByDomain);
  if (diagEnabled) {
    var replacementSignature = [list.length, filtered.length, replacements.length, suppressedPacketCount, suppressedFaceKeySet.size, summarizeActorDiagReplacementRelations(replacements) && JSON.stringify(summarizeActorDiagReplacementRelations(replacements))].join('|');
    if (__actorInteractionOrderDiagState.lastReplacementSignature !== replacementSignature) {
      __actorInteractionOrderDiagState.lastReplacementSignature = replacementSignature;
      emitActorInteractionOrderDiag('replacement-result', {
        inputStaticRenderableCount: list.length,
        outputStaticRenderableCount: filtered.length,
        actorFaceKeyCount: actorFaceKeySet && actorFaceKeySet.size != null ? actorFaceKeySet.size : null,
        checkedPacketCount: checkedPacketCount,
        suppressedPacketCount: suppressedPacketCount,
        suppressedFaceKeyCount: suppressedFaceKeySet.size,
        replacementRenderableCount: replacements.length,
        replacementRelationCounts: summarizeActorDiagReplacementRelations(replacements),
        suppressedPackets: diagSuppressedPackets,
        replacementSamples: replacements.slice(0, 30).map(summarizeActorDiagRenderable)
      });
    }
  }
  return {
    staticRenderables: filtered,
    replacementRenderables: replacements,
    suppressedPacketCount: suppressedPacketCount,
    checkedPacketCount: checkedPacketCount,
    suppressedFaceKeyCount: suppressedFaceKeySet.size
  };
}

function requireMainFrameRenderableAssemblerForRender() {
  var globalObj = (typeof window !== 'undefined') ? window : globalThis;
  var api = (globalObj.App && globalObj.App.application && globalObj.App.application.render && globalObj.App.application.render.mainFrameRenderableAssembler)
    || globalObj.__MAIN_FRAME_RENDERABLE_ASSEMBLER__
    || globalObj.IsometricMainFrameRenderableAssembler
    || globalObj.__APP_APPLICATION_MAIN_FRAME_RENDERABLE_ASSEMBLER__
    || null;
  if (!api || typeof api.buildRenderables !== 'function' || typeof api.buildMainFrameRenderables !== 'function') {
    throw new Error('main-frame-renderable-assembler missing; ensure src/application/render/main-frame-renderable-assembler.js loads before src/presentation/render/render.js');
  }
  return api;
}

function buildRenderables() {
  return requireMainFrameRenderableAssemblerForRender().buildRenderables();
}


function update(dt) {
  setPhase('update', 'start');
  debugState.updateStep = 'time';
  time += dt;
  updatePlayerMovement(dt);
  debugState.updateStep = 'preview';
  updatePreview();
  debugState.updateStep = 'done';
}

function clearAndPaintMainBackground() {
  debugState.renderStep = 'clear';
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  debugState.renderStep = 'background';
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, '#0e1320');
  bg.addColorStop(1, '#141b2b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function ensureRenderFunctionBreakdownBucket() {
  if (typeof window === 'undefined') return null;
  try {
    window.__RENDER_FUNCTION_BREAKDOWN__ = window.__RENDER_FUNCTION_BREAKDOWN__ || { timings: {}, counts: {}, extras: {} };
    return window.__RENDER_FUNCTION_BREAKDOWN__;
  } catch (_) { return null; }
}

function recordRenderFunctionTiming(name, ms, extra) {
  var bucket = ensureRenderFunctionBreakdownBucket();
  if (!bucket || !name) return;
  bucket.timings = bucket.timings || {};
  bucket.counts = bucket.counts || {};
  bucket.timings[name] = Number(Number(ms || 0).toFixed(3));
  bucket.counts[name] = Number(bucket.counts[name] || 0) + 1;
  if (extra && typeof extra === 'object') {
    bucket.extras = bucket.extras || {};
    Object.keys(extra).forEach(function (key) {
      var value = extra[key];
      if (value == null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') bucket.extras[key] = value;
    });
  }
}

function accumulateRenderFunctionTiming(name, ms, extra) {
  var bucket = ensureRenderFunctionBreakdownBucket();
  if (!bucket || !name) return;
  bucket.timings = bucket.timings || {};
  bucket.counts = bucket.counts || {};
  var prev = Number(bucket.timings[name] || 0);
  bucket.timings[name] = Number((prev + Number(ms || 0)).toFixed(3));
  bucket.counts[name] = Number(bucket.counts[name] || 0) + 1;
  if (extra && typeof extra === 'object') {
    bucket.extras = bucket.extras || {};
    Object.keys(extra).forEach(function (key) {
      var value = extra[key];
      if (value == null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') bucket.extras[key] = value;
    });
  }
}


function setLastBaseWorldPassesBreakdown(payload) {
  try {
    if (typeof window !== 'undefined') window.__LAST_BASEWORLD_PASSES_BREAKDOWN__ = payload || null;
  } catch (_) {}
}

function getLastDrawFloorBreakdown() {
  try {
    if (typeof window !== 'undefined' && window.__LAST_DRAW_FLOOR_BREAKDOWN__) return window.__LAST_DRAW_FLOOR_BREAKDOWN__;
  } catch (_) {}
  return null;
}

function renderBaseWorldPasses() {
  var fnStartAt = perfNow();
  var preSetupStartAt = fnStartAt;
  var currentViewRotation = 0;
  var scope = null;
  var visibleLights = null;
  var preSetupViewRotationStartAt = perfNow();
  currentViewRotation = normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation);
  var baseWorldPassesPreSetupViewRotationWallMs = Math.max(0, perfNow() - preSetupViewRotationStartAt);
  var preSetupScopeStartAt = perfNow();
  scope = getMainCameraRenderScope(currentViewRotation);
  var baseWorldPassesPreSetupScopeWallMs = Math.max(0, perfNow() - preSetupScopeStartAt);
  var preSetupVisibleLightsStartAt = perfNow();
  visibleLights = getMainCameraVisibleLightsForRender(currentViewRotation);
  var baseWorldPassesPreSetupVisibleLightsWallMs = Math.max(0, perfNow() - preSetupVisibleLightsStartAt);
  var preSetupOverrideStartAt = perfNow();
  if (typeof window !== 'undefined') window.__MAIN_CAMERA_VISIBLE_LIGHTS_OVERRIDE__ = visibleLights;
  var baseWorldPassesPreSetupOverrideWallMs = Math.max(0, perfNow() - preSetupOverrideStartAt);
  var drawFloorStartAt = perfNow();
  var baseWorldPassesPreSetupWallMs = Math.max(0, drawFloorStartAt - preSetupStartAt);
  var baseWorldPassesPreSetupKnownWallMs = Number(baseWorldPassesPreSetupViewRotationWallMs || 0) + Number(baseWorldPassesPreSetupScopeWallMs || 0) + Number(baseWorldPassesPreSetupVisibleLightsWallMs || 0) + Number(baseWorldPassesPreSetupOverrideWallMs || 0);
  var baseWorldPassesPreSetupResidualWallMs = Math.max(0, baseWorldPassesPreSetupWallMs - baseWorldPassesPreSetupKnownWallMs);
  debugState.renderStep = 'floor';
  drawFloor(scope);
  var drawFloorWallMs = Math.max(0, perfNow() - drawFloorStartAt);
  var drawFloorBreakdown = getLastDrawFloorBreakdown() || getActiveBaseWorldActualPathProfile() || null;
  recordRenderFunctionTiming('render.renderBaseWorldPasses.drawFloor', drawFloorWallMs, { visibleLights: Number(Array.isArray(visibleLights) ? visibleLights.length : 0) });
  debugState.renderStep = 'light-shadows';
  var lightingStartAt = perfNow();
  var lightingEnabledForShadowPass = (typeof isLightingSystemEnabled === 'function') ? isLightingSystemEnabled() : true;
  var showShadowsForShadowPass = !!(typeof lightState !== 'undefined' && lightState && lightState.showShadows);
  if (lightingEnabledForShadowPass && showShadowsForShadowPass) {
    renderLightingShadows();
  }
  var lightingWallMs = Math.max(0, perfNow() - lightingStartAt);
  recordRenderFunctionTiming('render.renderBaseWorldPasses.renderLightingShadows', lightingWallMs, {
    skipped: !(lightingEnabledForShadowPass && showShadowsForShadowPass),
    lightingEnabled: !!lightingEnabledForShadowPass,
    showShadows: !!showShadowsForShadowPass
  });
  var frontLinesWallMs = 0;
  if (showFrontLines) {
    debugState.renderStep = 'front-lines';
    var frontLinesStartAt = perfNow();
    drawFrontLines();
    frontLinesWallMs = Math.max(0, perfNow() - frontLinesStartAt);
    recordRenderFunctionTiming('render.renderBaseWorldPasses.drawFrontLines', frontLinesWallMs);
  }
  var spritePrepWallMs = 0;
  if (SHOW_PLAYER && assetsReady) {
    var spritePrepStartAt = perfNow();
    preparePlayerSpriteFrame();
    spritePrepWallMs = Math.max(0, perfNow() - spritePrepStartAt);
    recordRenderFunctionTiming('render.renderBaseWorldPasses.preparePlayerSpriteFrame', spritePrepWallMs);
  }
  var totalWallMs = Math.max(0, perfNow() - fnStartAt);
  var floorLoopWallMs = Number(drawFloorBreakdown && drawFloorBreakdown.floorLoopWallMs || 0);
  var floorProjectionWallMs = Number(drawFloorBreakdown && drawFloorBreakdown.floorProjectionWallMs || 0);
  var floorColorMaterialWallMs = Number(drawFloorBreakdown && drawFloorBreakdown.floorColorMaterialWallMs || 0);
  var floorCanvasDrawWallMs = Number(drawFloorBreakdown && drawFloorBreakdown.floorCanvasDrawWallMs || 0);
  var floorLayerReusedDuringInteraction = !!(drawFloorBreakdown && drawFloorBreakdown.floorLayerReusedDuringInteraction);
  var floorLayerRebuildWallMs = Number(drawFloorBreakdown && drawFloorBreakdown.floorLayerRebuildWallMs || 0);
  var floorLayerBlitWallMs = Number(drawFloorBreakdown && drawFloorBreakdown.floorLayerBlitWallMs || 0);
  var floorVisibleChunkCount = Number(drawFloorBreakdown && drawFloorBreakdown.floorVisibleChunkCount || 0);
  var floorBuiltChunkCountThisFrame = Number(drawFloorBreakdown && drawFloorBreakdown.floorBuiltChunkCountThisFrame || 0);
  var floorMissingChunkCountBefore = Number(drawFloorBreakdown && drawFloorBreakdown.floorMissingChunkCountBefore || 0);
  var floorMissingChunkCountAfter = Number(drawFloorBreakdown && drawFloorBreakdown.floorMissingChunkCountAfter || 0);
  var floorBuiltTileCountThisFrame = Number(drawFloorBreakdown && drawFloorBreakdown.floorBuiltTileCountThisFrame || 0);
  var floorChunkSize = Number(drawFloorBreakdown && drawFloorBreakdown.floorChunkSize || 0);
  var floorVersionTag = String(drawFloorBreakdown && drawFloorBreakdown.floorVersionTag || 'floor-static-chunk-v1');
  var baseWorldActualBranch = String(drawFloorBreakdown && drawFloorBreakdown.baseWorldActualBranch || 'unknown');
  var baseWorldPassesPlayerSpritePrepWallMs = Number(spritePrepWallMs || 0);
  var knownForResidual = Number(baseWorldPassesPreSetupWallMs || 0) + floorLoopWallMs + floorProjectionWallMs + floorColorMaterialWallMs + floorCanvasDrawWallMs + baseWorldPassesPlayerSpritePrepWallMs;
  var baseWorldPassesPostFinalizeWallMs = 0;
  var baseWorldPassesResidualWallMs = Math.max(0, totalWallMs - knownForResidual - baseWorldPassesPostFinalizeWallMs);
  setLastBaseWorldPassesBreakdown({
    baseWorldPassesWallMs: Number(totalWallMs.toFixed(3)),
    baseWorldPassesPreSetupWallMs: Number(baseWorldPassesPreSetupWallMs.toFixed(3)),
    baseWorldPassesPreSetupViewRotationWallMs: Number(baseWorldPassesPreSetupViewRotationWallMs.toFixed(3)),
    baseWorldPassesPreSetupScopeWallMs: Number(baseWorldPassesPreSetupScopeWallMs.toFixed(3)),
    baseWorldPassesPreSetupVisibleLightsWallMs: Number(baseWorldPassesPreSetupVisibleLightsWallMs.toFixed(3)),
    baseWorldPassesPreSetupOverrideWallMs: Number(baseWorldPassesPreSetupOverrideWallMs.toFixed(3)),
    baseWorldPassesPreSetupResidualWallMs: Number(baseWorldPassesPreSetupResidualWallMs.toFixed(3)),
    baseWorldPassesFloorLoopWallMs: Number(floorLoopWallMs.toFixed(3)),
    baseWorldPassesFloorProjectionWallMs: Number(floorProjectionWallMs.toFixed(3)),
    baseWorldPassesFloorColorMaterialWallMs: Number(floorColorMaterialWallMs.toFixed(3)),
    baseWorldPassesFloorCanvasDrawWallMs: Number(floorCanvasDrawWallMs.toFixed(3)),
    baseWorldPassesPlayerSpritePrepWallMs: Number(baseWorldPassesPlayerSpritePrepWallMs.toFixed(3)),
    baseWorldPassesPostFinalizeWallMs: Number(baseWorldPassesPostFinalizeWallMs.toFixed(3)),
    baseWorldPassesResidualWallMs: Number(baseWorldPassesResidualWallMs.toFixed(3)),
    drawFloorWallMs: Number(drawFloorWallMs.toFixed(3)),
    lightingWallMs: Number(lightingWallMs.toFixed(3)),
    frontLinesWallMs: Number(frontLinesWallMs.toFixed(3)),
    currentViewRotation: Number(currentViewRotation || 0),
    visibleLightCount: Number(Array.isArray(visibleLights) ? visibleLights.length : 0),
    floorLayerReusedDuringInteraction: floorLayerReusedDuringInteraction,
    floorLayerRebuildWallMs: Number(floorLayerRebuildWallMs.toFixed(3)),
    floorLayerBlitWallMs: Number(floorLayerBlitWallMs.toFixed(3)),
    floorVisibleChunkCount: floorVisibleChunkCount,
    floorBuiltChunkCountThisFrame: floorBuiltChunkCountThisFrame,
    floorMissingChunkCountBefore: floorMissingChunkCountBefore,
    floorMissingChunkCountAfter: floorMissingChunkCountAfter,
    floorBuiltTileCountThisFrame: floorBuiltTileCountThisFrame,
    floorChunkSize: floorChunkSize,
    floorVersionTag: floorVersionTag,
    baseWorldActualBranch: baseWorldActualBranch
  });
  recordRenderFunctionTiming('render.renderBaseWorldPasses.total', totalWallMs, { currentViewRotation: Number(currentViewRotation || 0) });
}

function buildMainFrameRenderables() {
  return requireMainFrameRenderableAssemblerForRender().buildMainFrameRenderables();
}


function drawMainFrameRenderablesLocal(order) {
  order = Array.isArray(order) ? order : [];
  debugState.renderStep = 'draw-renderables';
  const drawStartAt = perfNow();
  let staticPacketCount = 0;
  let dynamicRenderableCount = 0;
  for (let i = 0; i < order.length; i++) {
    const r = order[i];
    if (r && r.kind === 'static-world-face-packet') staticPacketCount += 1;
    else dynamicRenderableCount += 1;
    debugState.lastRenderable = `${i + 1}/${order.length}:${r.kind || 'unknown'}:${r.id || 'no-id'}`;
    try {
      if (r.draw) r.draw();
      else if (r.kind === 'voxel') drawCachedVoxelRenderable(r);
      else if (r.kind === 'static-world-face-packet') drawStaticWorldFacePacket(r);
      else throw new Error(`missing draw for renderable ${r.id}`);
    } catch (err) {
      detailLog(`[renderable-error] ${debugState.lastRenderable} stack=${err?.stack || err}`);
      throw err;
    }
  }
  __lastFrameDrawMs = Number(Math.max(0, perfNow() - drawStartAt).toFixed(3));
  __lastFrameDrawStats = {
    drawMs: __lastFrameDrawMs,
    renderableCount: Number(order.length || 0),
    staticPacketCount: Number(staticPacketCount || 0),
    dynamicRenderableCount: Number(dynamicRenderableCount || 0)
  };
  if (__lastMainRenderableBuildStats) {
    maybeLogFrameWorkBreakdown({
      cameraX: Number(camera && camera.x || 0),
      cameraY: Number(camera && camera.y || 0),
      zoom: Number(__lastMainRenderableBuildStats.zoom || getMainEditorZoomValueForRender()),
      visibleChunkCount: Number(__lastMainRenderableBuildStats.visibleChunkCount || __lastMainRenderableBuildStats.visibleStaticChunkCount || 0),
      visibleStaticChunkCount: Number(__lastMainRenderableBuildStats.visibleStaticChunkCount || 0),
      visibleStaticPacketCount: Number(__lastMainRenderableBuildStats.visibleStaticPacketCount || 0),
      staticPacketMergeMs: Number(__lastMainRenderableBuildStats.staticPacketMergeMs || 0),
      staticPacketProjectMs: Number(__lastMainRenderableBuildStats.staticPacketProjectMs || 0),
      staticPacketSortMs: Number(__lastMainRenderableBuildStats.staticPacketSortMs || 0),
      staticPacketDrawPrepMs: Number(__lastMainRenderableBuildStats.staticPacketDrawPrepMs || 0),
      dynamicObjectCount: Number(__lastMainRenderableBuildStats.dynamicObjectCount || 0),
      dynamicObjectBuildMs: Number(__lastMainRenderableBuildStats.dynamicBuildMs || 0),
      finalDrawMs: Number(__lastFrameDrawMs || 0),
      frameBuildMs: Number(__lastMainRenderableBuildStats.frameBuildMs || 0)
    });
    var runtimeZoomValue = getMainEditorZoomValueForRender();
    var renderSummaryZoomValue = Number(__lastMainRenderableBuildStats.zoom || runtimeZoomValue || 1);
    var frameBreakdownZoomValue = Number(__lastMainRenderableBuildStats.zoom || runtimeZoomValue || 1);
    var uiDisplayScaleValue = (typeof ui !== 'undefined' && ui && ui.tileScale) ? Number(ui.tileScale.value || settings.worldDisplayScale || runtimeZoomValue) : Number(settings.worldDisplayScale || runtimeZoomValue);
    var tileScaleValue = Number(settings.tileScale || 1);
    var worldResolutionValue = Math.max(1, Number(settings.worldResolution || 1));
    var cullingZoomValue = Number(renderSummaryZoomValue || runtimeZoomValue || 1);
    var projectionZoomValue = Number(settings.worldDisplayScale || runtimeZoomValue || 1);
    var normalizedTileDisplayScale = Number(tileScaleValue * worldResolutionValue || 0);
    var zoomValuesToCompare = [uiDisplayScaleValue, runtimeZoomValue, renderSummaryZoomValue, frameBreakdownZoomValue, cullingZoomValue, projectionZoomValue, normalizedTileDisplayScale];
    var isUnifiedZoomState = zoomValuesToCompare.every(function (value) { return Math.abs(Number(value || 0) - Number(runtimeZoomValue || 0)) < 0.01; });
    maybeLogZoomStateVerify({
      uiDisplayScale: Number(uiDisplayScaleValue || 0),
      tileScale: Number(tileScaleValue || 0),
      runtimeZoom: Number(runtimeZoomValue || 0),
      renderSummaryZoom: Number(renderSummaryZoomValue || 0),
      frameBreakdownZoom: Number(frameBreakdownZoomValue || 0),
      cullingZoom: Number(cullingZoomValue || 0),
      projectionZoom: Number(projectionZoomValue || 0),
      sourceOfTruth: 'runtime-state.editor.cameraSettings.zoom',
      isUnified: isUnifiedZoomState === true,
      worldResolution: Number(worldResolutionValue || 1)
    });
    maybeLogZoomCameraStateVerify({
      sourceOfTruth: 'runtime-state.editor.cameraSettings.zoom',
      runtimeZoom: Number(runtimeZoomValue || 0),
      summaryZoom: Number(renderSummaryZoomValue || 0),
      breakdownZoom: Number(frameBreakdownZoomValue || 0),
      runtimeCameraX: Number(cameraScope.cameraX || 0),
      runtimeCameraY: Number(cameraScope.cameraY || 0),
      summaryCameraX: Number(cameraScope.cameraX || 0),
      summaryCameraY: Number(cameraScope.cameraY || 0),
      breakdownCameraX: Number(cameraScope.cameraX || 0),
      breakdownCameraY: Number(cameraScope.cameraY || 0),
      cullingZoom: Number(cullingZoomValue || 0),
      projectionZoom: Number(projectionZoomValue || 0),
      isUnified: isUnifiedZoomState === true
    });
  }
  return order;
}

function drawMainFrameRenderables(order) {
  var rendererAdapter = resolveActiveRendererAdapter();
  if (rendererAdapter && typeof rendererAdapter.drawRenderableOrder === 'function' && !rendererAdapter.__inDrawRenderableOrder) {
    return rendererAdapter.drawRenderableOrder(order, { source: 'src/presentation/render/render.js:drawMainFrameRenderables' });
  }
  return drawMainFrameRenderablesLocal(order);
}

function drawMainFrameOverlaysLocal() {
  debugState.renderStep = 'editor-overlay';
  drawSelectedInstanceHighlight();
  drawSelectedInstanceProjectionDebug();
  drawItemFacingPrototypeOverlay();
  drawShadowProbeOverlay();
  if (editor.mode === 'delete') drawDeleteHover();
  else drawPlacementPreview();
  debugState.renderStep = 'light-glow';
  renderLightingGlow();
  debugState.renderStep = 'light-bulbs';
  for (const l of getLightingRenderLights()) drawLightingBulb(l, l.id === activeLightId);
  debugState.renderStep = 'light-axes';
  drawLightingAxes();

  debugState.renderStep = 'habbo-debug-overlay';
  drawHabboDebugOverlay();
  drawMainCameraBoundsDebug(getMainCameraRenderScope(normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation)));
}

function drawMainFrameOverlays() {
  var rendererAdapter = resolveActiveRendererAdapter();
  if (rendererAdapter && typeof rendererAdapter.drawOverlayPasses === 'function' && !rendererAdapter.__inDrawOverlayPasses) {
    return rendererAdapter.drawOverlayPasses({ source: 'src/presentation/render/render.js:drawMainFrameOverlays' });
  }
  return drawMainFrameOverlaysLocal();
}

function drawMainHudPassLocal() {
  var fnStartAt = perfNow();
  debugState.renderStep = 'hud';
  var refreshStartAt = perfNow();
  refreshInspectorPanels();
  recordRenderFunctionTiming('render.drawMainHudPassLocal.refreshInspectorPanels', perfNow() - refreshStartAt);
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '14px sans-serif';
  const proto = currentProto();
  const modeLabel = editor.mode === 'view' ? '不编辑/拖动画面' : (editor.mode === 'delete' ? '删除物件' : '建立物件');
  const l = activeLight();
  ctx.fillText('一体化 Demo：房间编辑 + 多光源 + 人物代理体积阴影，可自由组合。', 18, 28);
  ctx.fillText(`模式=${modeLabel}  当前=${proto.name} ${proto.w}×${proto.d}×${proto.h} / 体素${proto.voxels.length}  instances=${instances.length}  boxes=${boxes.length}  人物代理=${settings.playerProxyW.toFixed(2)}×${settings.playerProxyD.toFixed(2)}×${settings.playerHeightCells.toFixed(2)}  环境光=${settings.ambient.toFixed(2)}  选中=${l.name}(${LIGHT_TYPE_LABELS[l.type]})`, 18, 50);
  if (editor.preview) {
    const pb = editor.preview.box || null;
    const previewLabel = pb
      ? `预览: (${pb.x}, ${pb.y}, z=${pb.z}) valid=${editor.preview.valid}`
      : `预览: box=null valid=${editor.preview.valid} reason=${editor.preview.reason || 'n/a'} prefab=${editor.preview.prefabId || 'n/a'} origin=${editor.preview.origin ? `(${editor.preview.origin.x},${editor.preview.origin.y},${editor.preview.origin.z})` : 'null'} boxes=${editor.preview.boxes ? editor.preview.boxes.length : 0}`;
    if (!pb) detailLog(`[debug:hud-preview-null] ${previewLabel}`);
    ctx.fillText(previewLabel, 18, 72);
  }
  if (showDebug) ctx.fillText(`${SHOW_PLAYER ? `player=(${player.x.toFixed(2)}, ${player.y.toFixed(2)}, z=${Number(player.z || 0).toFixed(2)}, vZ=${Number(player.visualZ || 0).toFixed(2)}) dir=${player.dir}  ` : ''}light=(${l.x.toFixed(2)},${l.y.toFixed(2)},${l.z.toFixed(2)}) angle=${l.angle.toFixed(0)} pitch=${l.pitch.toFixed(0)}`, 18, 94);
  if (typeof shadowProbeState !== 'undefined' && shadowProbeState) {
    var probeLabel = shadowProbeState.activeMarker ? shadowProbeMarkerLabel(shadowProbeState.activeMarker) : 'none';
    ctx.fillText('阴影探针: M=标记模式 P=记录当前帧 N=清除  模式=' + (shadowProbeState.markMode ? 'ON' : 'OFF') + '  当前=' + probeLabel, 18, showDebug ? 116 : 94);
  }
  recordRenderFunctionTiming('render.drawMainHudPassLocal.total', perfNow() - fnStartAt);
}

function drawMainHudPass() {
  var rendererAdapter = resolveActiveRendererAdapter();
  if (rendererAdapter && typeof rendererAdapter.drawHudPass === 'function' && !rendererAdapter.__inDrawHudPass) {
    return rendererAdapter.drawHudPass({ source: 'src/presentation/render/render.js:drawMainHudPass' });
  }
  return drawMainHudPassLocal();
}

function renderWithInternalPasses() {
  clearAndPaintMainBackground();
  var order = [];
  applyMainCameraWorldTransform(ctx, function () {
    renderBaseWorldPasses();
    order = buildMainFrameRenderables();
    drawMainFrameRenderables(order);
    drawMainFrameOverlays();
  });
  drawMainHudPass();
  debugState.renderStep = 'done';
  return order;
}

function emitP5Render(kind, message, extra) {
  var line = '[P5][' + String(kind || 'BOOT') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
  }
  try {
    if (typeof pushLog === 'function') pushLog(line);
    else if (typeof console !== 'undefined' && console.log) console.log(line);
  } catch (err) {
    try { console.log(line); } catch (_) {}
  }
  return line;
}

function summarizeRendererPassCoverage() {
  return {
    phase: 'P5-D',
    owner: 'src/presentation/render/render.js',
    apiPath: 'renderer.passApi',
    backend: 'canvas2d-pass-api',
    framePipeline: [
      'clearAndPaintMainBackground',
      'renderBaseWorldPasses',
      'buildMainFrameRenderables',
      'drawMainFrameRenderables',
      'drawMainFrameOverlays',
      'drawMainHudPass'
    ],
    notes: [
      'P5-D keeps render.js frame passes behind renderer.passApi and leaves draw execution to the active renderer adapter when available.',
      'render.js now acts more like a render description / fallback layer, while Canvas2D adapter owns more draw execution details.'
    ]
  };
}

function summarizeRendererRenderablesCoverage() {
  return {
    phase: 'P5-D',
    owner: 'src/presentation/render/render.js',
    apiPath: 'renderer.renderablesApi',
    capabilities: [
      'buildFramePlan',
      'drawFramePlan',
      'buildMainFrameRenderables',
      'drawMainFrameRenderables'
    ],
    notes: [
      'P5-D keeps renderables production behind renderer.renderablesApi while allowing the active renderer adapter to own direct draw execution.',
      'Canvas2D adapter can now execute frame plans and overlay / HUD drawing without routing every Canvas2D detail back through render.js.'
    ]
  };
}

function bindRendererPassApi() {
  if (typeof window === 'undefined') return null;
  var passApi = {
    phase: 'P5-D',
    owner: 'src/presentation/render/render.js',
    clearAndPaintMainBackground: clearAndPaintMainBackground,
    renderBaseWorldPasses: renderBaseWorldPasses,
    getLastBaseWorldPassesBreakdown: function () { try { return (typeof window !== 'undefined' && window.__LAST_BASEWORLD_PASSES_BREAKDOWN__) ? window.__LAST_BASEWORLD_PASSES_BREAKDOWN__ : null; } catch (_) { return null; } },
    buildMainFrameRenderables: buildMainFrameRenderables,
    drawMainFrameRenderables: drawMainFrameRenderables,
    drawMainFrameOverlays: drawMainFrameOverlays,
    drawMainHudPass: drawMainHudPass,
    renderWithInternalPasses: renderWithInternalPasses,
    summarizeCoverage: summarizeRendererPassCoverage
  };
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.passApi', passApi, { owner: 'src/presentation/render/render.js', phase: 'P5-D' });
    } else {
      window.App = window.App || {};
      window.App.renderer = window.App.renderer || {};
      window.App.renderer.passApi = passApi;
    }
  } catch (_) {}
  emitP5Render('BOUNDARY', 'renderer-pass-api-ready', {
    phase: 'P5-D',
    owner: 'src/presentation/render/render.js',
    apiPath: 'renderer.passApi',
    framePipeline: summarizeRendererPassCoverage().framePipeline
  });
  return passApi;
}

function buildRendererFramePlan() {
  var buildStartAtFramePlan = perfNow();
  var interactionState = getMainCameraInteractionStateForRender();
  var currentViewRotation = normalizeMainEditorViewRotationValue(getSafeMainEditorViewRotation(null).viewRotation);
  var framePlanId = 'frameplan-' + String(++__mainFramePlanSeq);
  var playerFastPathStartAt = perfNow();
  var playerFastPathResult = tryBuildPlayerMoveFastPathFrameOrderForRender(framePlanId, currentViewRotation, interactionState);
  var playerFastPathUsed = playerFastPathResult && playerFastPathResult.used === true && Array.isArray(playerFastPathResult.order);
  var order = [];
  var buildMainRenderablesStartAt = perfNow();
  if (playerFastPathUsed) {
    order = playerFastPathResult.order;
    recordRenderFunctionTiming('render.buildRendererFramePlan.buildMainFrameRenderables', Math.max(0, perfNow() - playerFastPathStartAt), {
      renderableCount: Number(order && order.length || 0),
      interactionFastPath: true,
      playerMoveFastPathUsed: true
    });
  } else {
    order = buildMainFrameRenderables();
    recordRenderFunctionTiming('render.buildRendererFramePlan.buildMainFrameRenderables', perfNow() - buildMainRenderablesStartAt, {
      renderableCount: Number(order && order.length || 0),
      interactionFastPath: !!interactionState,
      playerMoveFastPathUsed: false,
      playerMoveFastPathRejectReasons: playerFastPathResult && Array.isArray(playerFastPathResult.rejectReasons) ? playerFastPathResult.rejectReasons.slice(0, 8) : []
    });
  }
  var framePlanSignature = [currentViewRotation, order.length, __lastMainRenderableBuildStats.staticRenderableCount, __lastMainRenderableBuildStats.dynamicRenderableCount].join('|');
  var playerMoveFastPathEligibility = evaluatePlayerMoveFastPathEligibilityForRender(framePlanId, order, currentViewRotation, interactionState);
  var framePlanDiagnosticsEnabled = isFramePlanDiagnosticsEnabled();
  var renderOrderHeavyDiagnosticsEnabled = isRenderOrderHeavyDiagnosticsEnabled();
  var interactionFastPath = (!!interactionState) || playerFastPathUsed === true;
  logActorInteractionFinalOrderDiagnostics(framePlanId, currentViewRotation, order);
  if (!interactionFastPath) {
    if (framePlanDiagnosticsEnabled || renderOrderHeavyDiagnosticsEnabled) {
      for (var i = 0; i < order.length; i++) {
        if (!order[i] || typeof order[i] !== 'object') continue;
        order[i].framePlanId = framePlanId;
        order[i].framePlanSignature = framePlanSignature;
      }
    }
    if (framePlanDiagnosticsEnabled) {
      logItemRotationPrototype('main-render-frameplan-rebuilt', {
        currentViewRotation: currentViewRotation,
        framePlanId: framePlanId,
        framePlanSignature: framePlanSignature,
        renderableCount: order.length,
        staticRenderableCount: __lastMainRenderableBuildStats.staticRenderableCount,
        dynamicRenderableCount: __lastMainRenderableBuildStats.dynamicRenderableCount,
        reason: 'buildFramePlan'
      });
      logItemRotationPrototype('main-view-rotation-source-check', buildMainViewRotationSourceCheckPayload(currentViewRotation, staticBoxRenderCache && typeof staticBoxRenderCache.viewRotation === 'number' ? staticBoxRenderCache.viewRotation : currentViewRotation, typeof staticBoxGeometrySignature === 'function' ? staticBoxGeometrySignature() : null));
      logMainViewRotationVisualConsumerCheck(currentViewRotation);
      logMainViewRotationRenderConsumerMode(currentViewRotation);
      logItemRotationPrototype('main-camera-render-scope-check', {
        framePlanId: framePlanId,
        zoom: __lastMainRenderableBuildStats.zoom != null ? Number(__lastMainRenderableBuildStats.zoom) : getMainEditorZoomValueForRender(),
        cameraCullingEnabled: __lastMainRenderableBuildStats.cameraCullingEnabled !== false,
        renderablesBeforeCulling: Number(__lastMainRenderableBuildStats.renderablesBeforeCulling || order.length),
        renderablesAfterCulling: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length),
        cullingApplied: (__lastMainRenderableBuildStats.cameraCullingEnabled !== false) && Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length) <= Number(__lastMainRenderableBuildStats.renderablesBeforeCulling || order.length)
      });
    }
    logRenderOrderDiagnostics(framePlanId, framePlanSignature, currentViewRotation, order);
    if (framePlanDiagnosticsEnabled && isMainEditorViewAnimatingForRender()) {
      logItemRotationPrototype('main-view-rotation-visible-frame-check', {
        visualRotation: normalizeMainEditorViewRotationValue(currentViewRotation),
        discreteViewRotation: normalizeMainEditorViewRotationValue(readLegacyMainEditorViewRotation() != null ? readLegacyMainEditorViewRotation() : currentViewRotation),
        framePlanId: framePlanId,
        floorFrameBuiltFrom: 'visualRotation',
        voxelFrameBuiltFrom: 'visualRotation',
        lightsFrameBuiltFrom: 'visualRotation',
        shadowsFrameBuiltFrom: 'visualRotation'
      });
    }
    if (__lastRenderVisibilityStats) {
      var framePlanBuildMs = Math.max(0, perfNow() - buildStartAtFramePlan);
      if (framePlanDiagnosticsEnabled) {
        logItemRotationPrototype('render-build-cost-summary', {
          terrainBuildMs: Number(__lastRenderVisibilityStats.terrainBuildMs || 0),
          staticBuildMs: Number(__lastRenderVisibilityStats.staticBuildMs || 0),
          dynamicBuildMs: Number(__lastRenderVisibilityStats.dynamicBuildMs || 0),
          framePlanBuildMs: framePlanBuildMs,
          renderablesBeforeCulling: Number(__lastMainRenderableBuildStats.renderablesBeforeCulling || 0),
          renderablesAfterCulling: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length)
        });
        logItemRotationPrototype('render-performance-summary', {
          framePlanBuildMs: framePlanBuildMs,
          renderSourceBuildMs: Number(__lastRenderVisibilityStats.renderSourceBuildMs || 0),
          visibilityFilterMs: Number(__lastRenderVisibilityStats.visibilityFilterMs || 0),
          finalRenderableCount: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length),
          cameraZoom: Number(__lastMainRenderableBuildStats.zoom || getMainEditorZoomValueForRender()),
          currentViewRotation: normalizeMainEditorViewRotationValue(currentViewRotation)
        });
      }
      __lastRenderResourceSummary = Object.assign({}, __lastRenderResourceSummary || {}, {
        framePlanBuildMs: framePlanBuildMs,
        finalRenderableCount: Number(__lastMainRenderableBuildStats.renderablesAfterCulling || order.length),
        terrainBatchDrawCount: Number(__lastRenderVisibilityStats.terrainBatchDrawCount || 0),
        terrainVisibleFaceCount: Number(__lastRenderVisibilityStats.terrainVisibleFaceCount || 0),
        terrainVisibleChunkCount: Number(__lastRenderVisibilityStats.visibleChunkCount || 0)
      });
      if (framePlanDiagnosticsEnabled) logItemRotationPrototype('render-resource-summary', __lastRenderResourceSummary);
    }
  }
  recordRenderFunctionTiming('render.buildRendererFramePlan.total', perfNow() - buildStartAtFramePlan, {
    framePlanId: framePlanId,
    renderableCount: Number(order && order.length || 0),
    interactionFastPath: interactionFastPath === true,
    playerMoveFastPathUsed: playerFastPathUsed === true,
    playerMoveFastPathCandidateEligible: playerMoveFastPathEligibility && playerMoveFastPathEligibility.candidateEligible === true,
    playerMoveFastPathRejectReasons: playerMoveFastPathEligibility && Array.isArray(playerMoveFastPathEligibility.rejectReasons) ? playerMoveFastPathEligibility.rejectReasons.slice(0, 8) : [],
    playerMoveFastPathCellKey: playerMoveFastPathEligibility ? String(playerMoveFastPathEligibility.playerInteractionCellKey || '') : ''
  });
  return {
    id: framePlanId,
    signature: framePlanSignature,
    currentViewRotation: currentViewRotation,
    order: order,
    playerMoveFastPathUsed: playerFastPathUsed === true,
    counts: {
      renderables: order.length,
      instances: instances.length,
      boxes: boxes.length,
      lights: lights.length,
      staticRenderableCount: __lastMainRenderableBuildStats.staticRenderableCount,
      dynamicRenderableCount: __lastMainRenderableBuildStats.dynamicRenderableCount
    }
  };
}

function drawRendererFramePlan(framePlan) {
  var order = framePlan && Array.isArray(framePlan.order) ? framePlan.order : [];
  drawMainFrameRenderables(order);
  return order;
}

function bindRendererRenderablesApi() {
  if (typeof window === 'undefined') return null;
  var renderablesApi = {
    phase: 'P5-C',
    owner: 'src/presentation/render/render.js',
    buildFramePlan: buildRendererFramePlan,
    drawFramePlan: drawRendererFramePlan,
    buildMainFrameRenderables: buildMainFrameRenderables,
    drawMainFrameRenderables: drawMainFrameRenderables,
    summarizeCoverage: summarizeRendererRenderablesCoverage
  };
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.renderablesApi', renderablesApi, { owner: 'src/presentation/render/render.js', phase: 'P5-D' });
    } else {
      window.App = window.App || {};
      window.App.renderer = window.App.renderer || {};
      window.App.renderer.renderablesApi = renderablesApi;
    }
  } catch (_) {}
  emitP5Render('BOUNDARY', 'renderer-renderables-api-ready', {
    phase: 'P5-D',
    owner: 'src/presentation/render/render.js',
    apiPath: 'renderer.renderablesApi',
    capabilities: summarizeRendererRenderablesCoverage().capabilities
  });
  return renderablesApi;
}

var __rendererPassApi = bindRendererPassApi();
var __rendererRenderablesApi = bindRendererRenderablesApi();

function resolveActiveRendererAdapter() {
  if (typeof window === 'undefined') return null;
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
      var active = window.__APP_NAMESPACE.getPath('renderer.active');
      if (active) return active;
    }
  } catch (_) {}
  return (window.App && window.App.renderer && (window.App.renderer.active || window.App.renderer.canvas2d)) || null;
}

function render() {
  var rendererAdapter = resolveActiveRendererAdapter();
  if (rendererAdapter && typeof rendererAdapter.renderFrame === 'function' && !rendererAdapter.__inRenderFrame) {
    return rendererAdapter.renderFrame({ source: 'src/presentation/render/render.js:render' });
  }
  setPhase('render', 'start');
  if (debugState.firstFrameAt == null) debugState.firstFrameAt = performance.now();
  if (typeof beginRenderFrameDebug === 'function') beginRenderFrameDebug('render:start', { canvasCss: { w: VIEW_W, h: VIEW_H }, backing: { w: canvas.width, h: canvas.height }, boxes: boxes.length, lights: lights.length, assetsReady: !!assetsReady });
  if (debugState.frame < 5 || verboseLog) detailLog(`render:start frame=${debugState.frame} canvasCss=${VIEW_W}x${VIEW_H} backing=${canvas.width}x${canvas.height} boxes=${boxes.length} lights=${lights.length} assetsReady=${assetsReady}`);
  (__rendererPassApi || { renderWithInternalPasses: renderWithInternalPasses }).renderWithInternalPasses();
  if (debugState.frame < 5 || verboseLog) detailLog(`render:done frame=${debugState.frame}`);
}


// --- v1.3 floor-layer cache override ---
function drawPolyOn(targetCtx, points, fill, stroke = 'rgba(0,0,0,.22)', width = 1) {
  return requireCanvas2dDrawPrimitivesForRender().drawPolyOn(targetCtx, points, fill, stroke, width);
}


function getCanvas2dFloorLayerDrawPassApiForRender() {
  try {
    return window.App && window.App.presentation && window.App.presentation.render
      ? window.App.presentation.render.canvas2dFloorLayerDrawPass || null
      : null;
  } catch (_) {
    return null;
  }
}

function requireCanvas2dFloorLayerDrawPassForRender() {
  var api = getCanvas2dFloorLayerDrawPassApiForRender();
  api = api || (typeof window !== 'undefined' ? window.__CANVAS2D_FLOOR_LAYER_DRAW_PASS__ : null);
  if (!api || typeof api.drawFloor !== 'function') {
    throw new Error('canvas2d floor layer draw pass is unavailable; ensure src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js loads before render.js');
  }
  return api;
}

function createCanvas2dFloorLayerDrawPassDepsForRender() {
  return {
    VIEW_W: VIEW_W,
    VIEW_H: VIEW_H,
    dpr: dpr,
    settings: settings,
    camera: camera,
    ctx: ctx,
    perfNow: perfNow,
    createCanvas: function () { return document.createElement('canvas'); },
    getFloorLayerCanvas: function () { return floorLayerCanvas; },
    setFloorLayerCanvas: function (value) { floorLayerCanvas = value || null; },
    getFloorLayerCtx: function () { return floorLayerCtx; },
    setFloorLayerCtx: function (value) { floorLayerCtx = value || null; },
    getFloorLayerCache: function () { return floorLayerCache; },
    setFloorLayerCache: function (value) { floorLayerCache = value || { dirty: true }; },
    getActiveBaseWorldActualPathProfile: function () {
      try {
        if (typeof window !== 'undefined' && window.__ACTIVE_BASEWORLD_ACTUAL_PATH_PROFILE__) return window.__ACTIVE_BASEWORLD_ACTUAL_PATH_PROFILE__;
      } catch (_) {}
      return null;
    },
    writeBaseWorldActualPathProfile: function (partial) {
      var profile = null;
      try {
        if (typeof window !== 'undefined' && window.__ACTIVE_BASEWORLD_ACTUAL_PATH_PROFILE__) profile = window.__ACTIVE_BASEWORLD_ACTUAL_PATH_PROFILE__;
      } catch (_) {}
      if (!profile || !partial || typeof partial !== 'object') return profile;
      Object.keys(partial).forEach(function (key) {
        profile[key] = partial[key];
      });
      return profile;
    },
    getActiveCameraInteractionTypeForFloorLayer: function () {
      try { return window && window.__habboActiveCameraInteractionType ? String(window.__habboActiveCameraInteractionType) : null; } catch (_) { return null; }
    },
    getCameraSettleReuseStateForFloorLayer: function () {
      try { return window && window.__habboCameraSettleReuseState ? window.__habboCameraSettleReuseState : null; } catch (_) { return null; }
    },
    getSharedStaticWorldChunkCacheApiForRender: getSharedStaticWorldChunkCacheApiForRender,
    screenPointsFromWorldFaceNoCamera: screenPointsFromWorldFaceNoCamera,
    getSafeMainEditorViewRotation: getSafeMainEditorViewRotation,
    normalizeMainEditorViewRotationValue: normalizeMainEditorViewRotationValue,
    getMainEditorZoomValueForRender: getMainEditorZoomValueForRender,
    getMainCameraRenderScope: getMainCameraRenderScope,
    floorLayerSignature: floorLayerSignature,
    isInteractiveRenderPressure: isInteractiveRenderPressure,
    logItemRotationPrototype: logItemRotationPrototype,
    noteLayerRebuild: noteLayerRebuild,
    rgbToCss: rgbToCss,
    litColor: litColor,
    hexToRgb: hexToRgb,
    drawPolyOn: drawPolyOn,
    setLastDrawFloorBreakdown: function (breakdown) {
      try {
        if (typeof window !== 'undefined') window.__LAST_DRAW_FLOOR_BREAKDOWN__ = breakdown;
      } catch (_) {}
    }
  };
}

function getActiveBaseWorldActualPathProfile() {
  return requireCanvas2dFloorLayerDrawPassForRender().getActiveBaseWorldActualPathProfile(
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function writeBaseWorldActualPathProfile(partial) {
  return requireCanvas2dFloorLayerDrawPassForRender().writeBaseWorldActualPathProfile(
    partial,
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function completeFloorLayerBreakdown(partial) {
  return requireCanvas2dFloorLayerDrawPassForRender().completeFloorLayerBreakdown(
    partial,
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function ensureFloorLayerCanvas() {
  return requireCanvas2dFloorLayerDrawPassForRender().ensureFloorLayerCanvas(
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function getActiveCameraInteractionTypeForFloorLayer() {
  return requireCanvas2dFloorLayerDrawPassForRender().getActiveCameraInteractionTypeForFloorLayer(
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function getCameraSettleReuseStateForFloorLayer() {
  return requireCanvas2dFloorLayerDrawPassForRender().getCameraSettleReuseStateForFloorLayer(
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function shouldDeferFloorLayerSettleCommit(currentViewRotation) {
  return requireCanvas2dFloorLayerDrawPassForRender().shouldDeferFloorLayerSettleCommit(
    currentViewRotation,
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function shouldForceFloorLayerInteractionReuse(currentViewRotation) {
  return requireCanvas2dFloorLayerDrawPassForRender().shouldForceFloorLayerInteractionReuse(
    currentViewRotation,
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function getFloorChunkSizeForLayer() {
  return requireCanvas2dFloorLayerDrawPassForRender().getFloorChunkSizeForLayer(
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function ensureFloorChunkCacheState(chunkSize) {
  return requireCanvas2dFloorLayerDrawPassForRender().ensureFloorChunkCacheState(
    chunkSize,
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function getFloorChunkKeyForLayer(chunkX, chunkY) {
  return requireCanvas2dFloorLayerDrawPassForRender().getFloorChunkKeyForLayer(chunkX, chunkY);
}

function parseFloorChunkKeyForLayer(chunkKey) {
  return requireCanvas2dFloorLayerDrawPassForRender().parseFloorChunkKeyForLayer(chunkKey);
}

function computeVisibleFloorChunkKeysForLayer(scope, chunkSize) {
  return requireCanvas2dFloorLayerDrawPassForRender().computeVisibleFloorChunkKeysForLayer(
    scope,
    chunkSize,
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function buildFloorLayerViewSignatureForLayer(currentCameraX, currentCameraY, visibleChunkKeys, currentViewRotation) {
  return requireCanvas2dFloorLayerDrawPassForRender().buildFloorLayerViewSignatureForLayer(
    currentCameraX,
    currentCameraY,
    visibleChunkKeys,
    currentViewRotation
  );
}

function buildFloorChunkEntryForLayer(chunkKey, currentViewRotation, contentSignature) {
  return requireCanvas2dFloorLayerDrawPassForRender().buildFloorChunkEntryForLayer(
    chunkKey,
    currentViewRotation,
    contentSignature,
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function drawFloorOutlineToLayer(targetCtx, currentCameraX, currentCameraY, currentViewRotation) {
  return requireCanvas2dFloorLayerDrawPassForRender().drawFloorOutlineToLayer(
    targetCtx,
    currentCameraX,
    currentCameraY,
    currentViewRotation,
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function rebuildFloorLayerIfNeeded(force = false) {
  return requireCanvas2dFloorLayerDrawPassForRender().rebuildFloorLayerIfNeeded(
    force === true,
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

function drawFloor() {
  return requireCanvas2dFloorLayerDrawPassForRender().drawFloor(
    createCanvas2dFloorLayerDrawPassDepsForRender()
  );
}

// --- v1.4 geometric face-shadow overlay override ---
// P11a-4 note: shadow overlay projection/cache helpers are delegated to
// src/presentation/render/renderer/canvas2d-shadow-overlay-cache.js.
function worldShadowOverlaysToScreen(overlays) {
  return requireCanvas2dShadowOverlayCacheForRender().worldShadowOverlaysToScreen(
    overlays,
    createCanvas2dShadowOverlayCacheDepsForRender()
  );
}

function worldShadowOverlaysToNoCamera(overlays, viewRotation) {
  return requireCanvas2dShadowOverlayCacheForRender().worldShadowOverlaysToNoCamera(
    overlays,
    viewRotation,
    createCanvas2dShadowOverlayCacheDepsForRender()
  );
}

function drawFaceShadowOverlays(targetCtx, receiverPoints, overlays) {
  return requireCanvas2dShadowOverlaysForRender().drawFaceShadowOverlays(
    targetCtx,
    receiverPoints,
    overlays,
    createCanvas2dShadowOverlayDepsForRender()
  );
}


function drawFaceShadowOverlaysNoCamera(targetCtx, receiverPointsNoCamera, overlaysNoCamera, offsetX, offsetY) {
  return requireCanvas2dShadowOverlaysForRender().drawFaceShadowOverlaysNoCamera(
    targetCtx,
    receiverPointsNoCamera,
    overlaysNoCamera,
    offsetX,
    offsetY,
    createCanvas2dShadowOverlayDepsForRender()
  );
}


function buildFaceRenderable(points, fill, stroke, width, shadowOverlays, meta) {
  var face = { points: points, fill: fill, stroke: stroke, width: width || 1, shadowOverlays: shadowOverlays || [] };
  if (meta && typeof meta === 'object') {
    for (var key in meta) {
      if (Object.prototype.hasOwnProperty.call(meta, key)) face[key] = meta[key];
    }
  }
  return face;
}

function shiftShadowOverlays(overlays, sx, sy) {
  return requireCanvas2dShadowOverlayCacheForRender().shiftShadowOverlays(overlays, sx, sy);
}

function currentShadowOverlaySignature() {
  return requireCanvas2dShadowOverlayCacheForRender().currentShadowOverlaySignature(
    createCanvas2dShadowOverlayCacheDepsForRender()
  );
}

function voxelFaceShadowCacheKey(facePts, normal, ownerInstanceId) {
  return requireCanvas2dShadowOverlayCacheForRender().voxelFaceShadowCacheKey(facePts, normal, ownerInstanceId);
}

function cloneWorldShadowOverlays(overlays) {
  return requireCanvas2dShadowOverlayCacheForRender().cloneWorldShadowOverlays(overlays);
}

function getVoxelFaceShadowWorldOverlays(facePts, normal, ownerInstanceId, profileStats) {
  return requireCanvas2dShadowOverlayCacheForRender().getVoxelFaceShadowWorldOverlays(
    facePts,
    normal,
    ownerInstanceId,
    profileStats,
    createCanvas2dShadowOverlayCacheDepsForRender()
  );
}

function buildVoxelFaceShadowWorldOverlays(facePts, normal, ownerInstanceId, profileStats) {
  return requireCanvas2dShadowOverlayCacheForRender().buildVoxelFaceShadowWorldOverlays(
    facePts,
    normal,
    ownerInstanceId,
    profileStats,
    createCanvas2dShadowOverlayCacheDepsForRender()
  );
}

function buildVoxelFaceShadowOverlays(facePts, normal, ownerInstanceId) {
  return requireCanvas2dShadowOverlayCacheForRender().buildVoxelFaceShadowOverlays(
    facePts,
    normal,
    ownerInstanceId,
    createCanvas2dShadowOverlayCacheDepsForRender()
  );
}

function drawVoxelCell(cell, occ, alpha = 1) {
  var pts = cubePoints(cell.x, cell.y, cell.z, 1, 1, 1);
  var { p100,p110,p010,p001,p101,p111,p011 } = pts;
  var fc = baseFaceColors((cell.box && cell.box.base) || cell.base || "#7aa2f7");

  var explicitVisibleFaces = Array.isArray(cell.visibleFaces) ? cell.visibleFaces.slice() : null;
  var hasFace = function (name, fallback) {
    if (explicitVisibleFaces && explicitVisibleFaces.length) return explicitVisibleFaces.indexOf(name) >= 0;
    return !!fallback;
  };
  var hasTop = hasFace('top', !occ.has(`${cell.x},${cell.y},${cell.z + 1}`));
  var hasEast = hasFace('east', !occ.has(`${cell.x + 1},${cell.y},${cell.z}`));
  var hasSouth = hasFace('south', !occ.has(`${cell.x},${cell.y + 1},${cell.z}`));

  var topWorld = [ {x: cell.x, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ];
  var eastWorld = [ {x: cell.x + 1, y: cell.y, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1} ];
  var southWorld = [ {x: cell.x, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ];
  var ownerInstanceId = cell.box && cell.box.instanceId;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (hasTop) {
    var topPts = [p001,p101,p111,p011];
    drawPoly(topPts, rgbToCss(litFaceColor(fc.top, topWorld, { x: 0, y: 0, z: 1 }, ownerInstanceId)), fc.line);
    drawFaceShadowOverlays(ctx, topPts, buildVoxelFaceShadowOverlays(topWorld, { x: 0, y: 0, z: 1 }, ownerInstanceId));
  }
  if (hasEast) {
    var eastPts = [p101,p111,p110,p100];
    drawPoly(eastPts, xrayFaces ? 'rgba(255,255,255,.18)' : rgbToCss(litFaceColor(fc.east, eastWorld, { x: 1, y: 0, z: 0 }, ownerInstanceId)), fc.line);
    if (!xrayFaces) drawFaceShadowOverlays(ctx, eastPts, buildVoxelFaceShadowOverlays(eastWorld, { x: 1, y: 0, z: 0 }, ownerInstanceId));
  }
  if (hasSouth) {
    var southPts = [p011,p111,p110,p010];
    drawPoly(southPts, xrayFaces ? 'rgba(255,255,255,.14)' : rgbToCss(litFaceColor(fc.south, southWorld, { x: 0, y: 1, z: 0 }, ownerInstanceId)), fc.line);
    if (!xrayFaces) drawFaceShadowOverlays(ctx, southPts, buildVoxelFaceShadowOverlays(southWorld, { x: 0, y: 1, z: 0 }, ownerInstanceId));
  }

  if (xrayFaces) {
    const { p000 } = pts;
    const hasWest = !occ.has(`${cell.x - 1},${cell.y},${cell.z}`);
    const hasNorth = !occ.has(`${cell.x},${cell.y - 1},${cell.z}`);
    if (hasWest) drawPoly([p001,p011,p010,p000], 'rgba(255,255,255,.08)', fc.line);
    if (hasNorth) drawPoly([p001,p101,p100,p000], 'rgba(255,255,255,.08)', fc.line);
  }

  ctx.restore();
  if (showDebug) {
    const foot = iso(cell.x + 1, cell.y + 1, cell.z);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(foot.x, foot.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

function buildStaticVoxelRenderable(cell, occ, explicitViewRotation, semanticLogSeen) {
  var pts = cubePoints(cell.x, cell.y, cell.z, 1, 1, 1);
  var fc = baseFaceColors((cell.box && cell.box.base) || cell.base || "#7aa2f7");
  var p001 = pts.p001, p101 = pts.p101, p111 = pts.p111, p011 = pts.p011, p110 = pts.p110, p100 = pts.p100, p010 = pts.p010, p000 = pts.p000;
  var explicitVisibleFaces = Array.isArray(cell.visibleFaces) ? cell.visibleFaces.slice() : null;
  var hasFace = function (name, fallback) {
    if (explicitVisibleFaces && explicitVisibleFaces.length) return explicitVisibleFaces.indexOf(name) >= 0;
    return !!fallback;
  };
  var hasTop = hasFace('top', !occ.has(`${cell.x},${cell.y},${cell.z + 1}`));
  var hasEast = hasFace('east', !occ.has(`${cell.x + 1},${cell.y},${cell.z}`));
  var hasSouth = hasFace('south', !occ.has(`${cell.x},${cell.y + 1},${cell.z}`));
  var ownerInstanceId = cell.box && cell.box.instanceId;
  var topWorld = [ {x: cell.x, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ];
  var eastWorld = [ {x: cell.x + 1, y: cell.y, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x + 1, y: cell.y, z: cell.z + 1} ];
  var southWorld = [ {x: cell.x, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z}, {x: cell.x + 1, y: cell.y + 1, z: cell.z + 1}, {x: cell.x, y: cell.y + 1, z: cell.z + 1} ];
  var viewRotation = normalizeMainEditorViewRotationValue(explicitViewRotation != null ? explicitViewRotation : getSafeMainEditorViewRotation(null).viewRotation);
  var semanticMapping = buildStaticVoxelSemanticMapping(cell, viewRotation, fc, semanticLogSeen);
  var faces = semanticMapping ? buildSharedSemanticVoxelFaces(cell, occ, semanticMapping, ownerInstanceId) : null;
  if (!faces) {
    faces = [];
    var fallbackMapping = getVisibleSemanticMappingForRender(cell.box && cell.box.rotation || 0, viewRotation);
    var fallbackScreenMap = fallbackMapping && fallbackMapping.screenFaces ? fallbackMapping.screenFaces : { top: 'top', lowerLeft: 'south', lowerRight: 'east' };
    var fallbackCandidates = [
      { screenFace: 'lowerRight', semanticFace: fallbackScreenMap.lowerRight || 'east', screenFill: fc.east, depthKey: 1 },
      { screenFace: 'lowerLeft', semanticFace: fallbackScreenMap.lowerLeft || 'south', screenFill: fc.south, depthKey: 2 },
      { screenFace: 'top', semanticFace: 'top', screenFill: fc.top, depthKey: 3 }
    ];
    fallbackCandidates.forEach(function (candidate) {
      if (!candidate.semanticFace) return;
      var delta = getSemanticFaceNeighborDeltaForRender(candidate.semanticFace);
      if (occ.has(`${cell.x + delta.x},${cell.y + delta.y},${cell.z + delta.z}`)) return;
      var worldPts = getSemanticFaceWorldPolygon(cell, candidate.semanticFace);
      if (!Array.isArray(worldPts) || worldPts.length < 3) return;
      var screenPts = screenPointsFromWorldFace(worldPts);
      var normal = getSemanticFaceNormal(candidate.semanticFace);
      var litFill = rgbToCss(litFaceColor(candidate.screenFill, worldPts, normal, ownerInstanceId));
      var cameraDebugSettings = getMainEditorCameraSettingsForRender();
      var fallbackStroke = cameraDebugSettings.debugVisibleSurfaces ? '#ffffff' : fc.line;
      faces.push(buildFaceRenderable(screenPts, xrayFaces ? colorWithAlpha(litFill, 0.18) : litFill, fallbackStroke, 1, xrayFaces ? [] : buildVoxelFaceShadowOverlays(worldPts, normal, ownerInstanceId), { semanticFace: candidate.semanticFace, screenFace: candidate.screenFace, depthKey: candidate.depthKey, worldPts: worldPts, polygonTemplateId: 'semantic-face-' + String(candidate.semanticFace), polygonSource: 'semantic-face-world-plane-fallback', reusedFromOldEastSouthTemplate: false, cell: { x: cell.x, y: cell.y, z: cell.z } }));
    });
    if (xrayFaces) {
      var hasWest = !occ.has(`${cell.x - 1},${cell.y},${cell.z}`);
      var hasNorth = !occ.has(`${cell.x},${cell.y - 1},${cell.z}`);
      if (hasWest) {
        var westWorld = getSemanticFaceWorldPolygon(cell, 'west');
        faces.push(buildFaceRenderable(screenPointsFromWorldFace(westWorld), 'rgba(255,255,255,.08)', fc.line, 1, [], { semanticFace: 'west', screenFace: 'west', depthKey: 0, worldPts: westWorld, polygonTemplateId: 'semantic-face-west', polygonSource: 'semantic-face-world-plane-fallback', reusedFromOldEastSouthTemplate: false, cell: { x: cell.x, y: cell.y, z: cell.z } }));
      }
      if (hasNorth) {
        var northWorld = getSemanticFaceWorldPolygon(cell, 'north');
        faces.push(buildFaceRenderable(screenPointsFromWorldFace(northWorld), 'rgba(255,255,255,.08)', fc.line, 1, [], { semanticFace: 'north', screenFace: 'north', depthKey: -1, worldPts: northWorld, polygonTemplateId: 'semantic-face-north', polygonSource: 'semantic-face-world-plane-fallback', reusedFromOldEastSouthTemplate: false, cell: { x: cell.x, y: cell.y, z: cell.z } }));
      }
    }
    logFaceGeometryOracleChecks(faces, {
      currentViewRotation: viewRotation,
      instanceId: cell.box && cell.box.instanceId || null,
      prefabId: cell.box && cell.box.prefabId || null
    });
  }
  var voxelSortMeta = computeViewAwareSortMeta({ x: cell.x, y: cell.y, z: cell.z }, 1, viewRotation);
  var debugFoot = iso(cell.x + 1, cell.y + 1, cell.z);
  return {
    id: `voxel-${cell.box.id}-${cell.x}-${cell.y}-${cell.z}`,
    kind: 'voxel',
    sortKey: voxelSortMeta.sortKey,
    tie: voxelSortMeta.tie,
    faces: faces,
    instanceId: cell.box && cell.box.instanceId || null,
    prefabId: cell.box && cell.box.prefabId || null,
    renderPath: 'static-cache',
    cacheViewRotation: viewRotation,
    drawScreenPosition: { x: Math.round(debugFoot.x), y: Math.round(debugFoot.y) },
    drawUsedSemanticTextureMapping: !!semanticMapping,
    semanticScreenFaceToTexture: semanticMapping ? semanticMapping.screenFaceToSemanticFace : null,
    debugFoot: showDebug ? debugFoot : null,
    box: cell.box || null,
    cellX: cell.x,
    cellY: cell.y,
    cellZ: cell.z
  };
}

function buildShiftedVoxelRenderable(cell, occ, shift, idPrefix) {
  var base = buildStaticVoxelRenderable(cell, occ);
  if (!base || !Array.isArray(base.faces) || !base.faces.length) return null;
  var sx = Math.round(shift && shift.x || 0);
  var sy = Math.round(shift && shift.y || 0);
  if (!sx && !sy) return base;
  var movedFaces = base.faces.map(function (face) {
    return {
      points: face.points.map(function (pt) { return { x: pt.x + sx, y: pt.y + sy }; }),
      fill: face.fill,
      stroke: face.stroke,
      width: face.width || 1,
      shadowOverlays: shiftShadowOverlays(face.shadowOverlays, sx, sy)
    };
  });
  return {
    id: (idPrefix || 'habbo-voxel') + '-' + String(cell.box && cell.box.id || 'x') + '-' + String(cell.x) + '-' + String(cell.y) + '-' + String(cell.z),
    kind: 'voxel',
    sortKey: base.sortKey,
    tie: base.tie,
    faces: movedFaces,
    debugFoot: base.debugFoot ? { x: base.debugFoot.x + sx, y: base.debugFoot.y + sy } : null,
  };
}

function drawCachedVoxelRenderable(item) {
  return requireCanvas2dStaticWorldFaceDrawPassForRender().drawCachedVoxelRenderable(
    item,
    createCanvas2dStaticWorldFaceDrawPassDepsForRender()
  );
}


function drawCachedVoxelFaceRenderable(item) {
  return requireCanvas2dStaticWorldFaceDrawPassForRender().drawCachedVoxelFaceRenderable(
    item,
    createCanvas2dStaticWorldFaceDrawPassDepsForRender()
  );
}


function buildPath2DFromPoints(points) {
  return requireCanvas2dDrawPrimitivesForRender().buildPath2DFromPoints(points);
}

function buildPath2DFromLoops(loops) {
  return requireCanvas2dDrawPrimitivesForRender().buildPath2DFromLoops(loops);
}

function buildPath2DFromSegments(segments) {
  return requireCanvas2dDrawPrimitivesForRender().buildPath2DFromSegments(segments);
}

function buildStaticWorldPacketProjectionCacheKey(packet, viewRotation) {
  return requireCanvas2dStaticWorldFaceDrawPassForRender().buildStaticWorldPacketProjectionCacheKey(
    packet,
    viewRotation,
    createCanvas2dStaticWorldFaceDrawPassDepsForRender()
  );
}


function getStaticWorldPacketProjectedGeometry(packet, viewRotation) {
  return requireCanvas2dStaticWorldFaceDrawPassForRender().getStaticWorldPacketProjectedGeometry(
    packet,
    viewRotation,
    createCanvas2dStaticWorldFaceDrawPassDepsForRender()
  );
}


function drawTerrainTopBoundarySegmentsForPacket(targetCtx, packet, projected) {
  return requireCanvas2dStaticWorldFaceDrawPassForRender().drawTerrainTopBoundarySegmentsForPacket(
    targetCtx,
    packet,
    projected,
    createCanvas2dStaticWorldFaceDrawPassDepsForRender()
  );
}


function drawStaticWorldFacePacket(packet) {
  return requireCanvas2dStaticWorldFaceDrawPassForRender().drawStaticWorldFacePacket(
    packet,
    createCanvas2dStaticWorldFaceDrawPassDepsForRender()
  );
}


function buildStaticVoxelFaceRenderable(baseRenderable, face, faceIndex, viewRotation) {
  return requireStaticWorldFrameMaterializerForRender().buildStaticVoxelFaceRenderable(
    baseRenderable,
    face,
    faceIndex,
    viewRotation,
    createStaticWorldFrameMaterializerDepsForRender()
  );
}

function flattenStaticVoxelRenderable(baseRenderable, viewRotation) {
  return requireStaticWorldFrameMaterializerForRender().flattenStaticVoxelRenderable(
    baseRenderable,
    viewRotation,
    createStaticWorldFrameMaterializerDepsForRender()
  );
}


function materializeStaticWorldFacePacket(packet) {
  return requireStaticWorldFrameMaterializerForRender().materializeStaticWorldFacePacket(
    packet,
    createStaticWorldFrameMaterializerDepsForRender()
  );
}

function materializeStaticWorldFrameRenderables(packets) {
  return requireStaticWorldFrameMaterializerForRender().materializeStaticWorldFrameRenderables(
    packets,
    createStaticWorldFrameMaterializerDepsForRender()
  );
}
