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


function getTerrainRenderableBuilderApiForRender() {
  try {
    if (typeof window !== 'undefined' && window.__APP_PRESENTATION_TERRAIN_RENDERABLE_BUILDER__) return window.__APP_PRESENTATION_TERRAIN_RENDERABLE_BUILDER__;
    if (typeof window !== 'undefined' && window.__TERRAIN_RENDERABLE_BUILDER__) return window.__TERRAIN_RENDERABLE_BUILDER__;
    if (typeof window !== 'undefined' && window.IsometricTerrainRenderableBuilder) return window.IsometricTerrainRenderableBuilder;
  } catch (_) {}
  try {
    if (typeof globalThis !== 'undefined' && globalThis.__APP_PRESENTATION_TERRAIN_RENDERABLE_BUILDER__) return globalThis.__APP_PRESENTATION_TERRAIN_RENDERABLE_BUILDER__;
    if (typeof globalThis !== 'undefined' && globalThis.__TERRAIN_RENDERABLE_BUILDER__) return globalThis.__TERRAIN_RENDERABLE_BUILDER__;
    if (typeof globalThis !== 'undefined' && globalThis.IsometricTerrainRenderableBuilder) return globalThis.IsometricTerrainRenderableBuilder;
  } catch (_) {}
  return null;
}

function requireTerrainRenderableBuilderForRender() {
  var api = getTerrainRenderableBuilderApiForRender();
  if (!api) throw new Error('terrain-renderable-builder.js must load before presentation/render/render.js');
  return api;
}

function createTerrainRenderableBuilderDepsForRender() {
  return {
    getSettingsForRender: function () { return settings; },
    getRuntimeCameraForRender: function () { return (typeof runtimeState !== 'undefined' && runtimeState && runtimeState.camera) ? runtimeState.camera : { x: 0, y: 0 }; },
    getCanvasContextForRender: function () { return ctx; },
    isXrayFacesEnabledForRender: function () { return typeof xrayFaces !== 'undefined' && xrayFaces === true; },
    getTerrainRenderSettingsForRender: getTerrainRenderSettingsForRender,
    getMainEditorCameraSettingsForRender: getMainEditorCameraSettingsForRender,
    getItemFacingCoreApi: getItemFacingCoreApi,
    getTerrainMaterialCoreApi: getTerrainMaterialCoreApi,
    getRenderVisibilityCoreApi: getRenderVisibilityCoreApi,
    getTerrainMaterialPatternDescriptorForRenderCell: getTerrainMaterialPatternDescriptorForRenderCell,
    getMainViewProjectionConfig: getMainViewProjectionConfig,
    getMainViewRotationCoreApi: getMainViewRotationCoreApi,
    getVisibleSemanticMappingForRender: getVisibleSemanticMappingForRender,
    normalizeMainEditorViewRotationValue: normalizeMainEditorViewRotationValue,
    getSemanticFaceNormal: getSemanticFaceNormal,
    buildVoxelFaceShadowOverlays: buildVoxelFaceShadowOverlays,
    screenPointsFromWorldFace: screenPointsFromWorldFace,
    averageScreenPoint: averageScreenPoint,
    computeViewAwareSortMeta: computeViewAwareSortMeta,
    drawCachedVoxelFaceRenderable: drawCachedVoxelFaceRenderable,
    logItemRotationPrototype: logItemRotationPrototype,
    rgbToCss: rgbToCss,
    litFaceColor: litFaceColor,
    hexToRgb: hexToRgb,
    baseFaceColors: baseFaceColors,
    perfNow: perfNow,
    drawPoly: drawPoly
  };
}


function getProjectionDebugOverlayApiForRender() {
  try {
    if (typeof window !== 'undefined') return window.__APP_PRESENTATION_PROJECTION_DEBUG_OVERLAY__ || window.__PROJECTION_DEBUG_OVERLAY__ || window.IsometricProjectionDebugOverlay || null;
    if (typeof globalThis !== 'undefined') return globalThis.__APP_PRESENTATION_PROJECTION_DEBUG_OVERLAY__ || globalThis.__PROJECTION_DEBUG_OVERLAY__ || globalThis.IsometricProjectionDebugOverlay || null;
  } catch (_) {}
  return null;
}

function requireProjectionDebugOverlayForRender() {
  var api = getProjectionDebugOverlayApiForRender();
  if (!api) throw new Error('projection-debug-overlay.js must load before presentation/render/render.js');
  return api;
}

function getPlacementPreviewRendererApiForRender() {
  try {
    if (typeof window !== 'undefined') return window.__APP_PRESENTATION_PLACEMENT_PREVIEW_RENDERER__ || window.__PLACEMENT_PREVIEW_RENDERER__ || window.IsometricPlacementPreviewRenderer || null;
    if (typeof globalThis !== 'undefined') return globalThis.__APP_PRESENTATION_PLACEMENT_PREVIEW_RENDERER__ || globalThis.__PLACEMENT_PREVIEW_RENDERER__ || globalThis.IsometricPlacementPreviewRenderer || null;
  } catch (_) {}
  return null;
}

function requirePlacementPreviewRendererForRender() {
  var api = getPlacementPreviewRendererApiForRender();
  if (!api) throw new Error('placement-preview-renderer.js must load before presentation/render/render.js');
  return api;
}

// P12a-5 note: placement preview and projection debug overlay rendering are
// delegated to presentation/render/preview/placement-preview-renderer.js and
// presentation/render/debug/projection-debug-overlay.js; render.js keeps
// compatibility wrappers only.

// P12a-1 note: terrain runtime/chunk/face renderable construction is delegated
// to presentation/render/terrain/terrain-renderable-builder.js; render.js keeps
// compatibility wrappers only.

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


// polyBounds is owned by src/core/domain/spatial-geometry-core.js

// overlap2D is owned by src/core/domain/spatial-geometry-core.js

// isBehind is owned by src/core/domain/spatial-geometry-core.js

// makeAABB is owned by src/core/domain/spatial-geometry-core.js

// rectCircleCollide is owned by src/core/domain/spatial-geometry-core.js

// boxRectOverlap3D is owned by src/core/domain/spatial-geometry-core.js

// buildOccupancy is owned by src/core/domain/spatial-geometry-core.js
var __lastRenderFrameOccupancyVersion = null;
var __lastObservedTerrainBatchIdForFrames = null;
var __terrainFirstFrameWindow = { terrainBatchId: null, remaining: 0, nextFrameIndex: 1 };

var __lastFrameDrawMs = 0;
var __lastFrameDrawStats = null;
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

function getRenderableOrderAdapterApiForRender() {
  try {
    if (typeof window !== 'undefined') {
      return (window.App && window.App.presentation && window.App.presentation.render && window.App.presentation.render.renderables && window.App.presentation.render.renderables.renderableOrderAdapter)
        || window.__APP_PRESENTATION_RENDERABLE_ORDER_ADAPTER__
        || window.__RENDERABLE_ORDER_ADAPTER__
        || window.IsometricRenderableOrderAdapter
        || null;
    }
    if (typeof globalThis !== 'undefined') {
      return globalThis.__APP_PRESENTATION_RENDERABLE_ORDER_ADAPTER__ || globalThis.__RENDERABLE_ORDER_ADAPTER__ || globalThis.IsometricRenderableOrderAdapter || null;
    }
  } catch (_) {}
  return null;
}

function requireRenderableOrderAdapterForRender() {
  var api = getRenderableOrderAdapterApiForRender();
  if (!api || typeof api.computeViewAwareSortMeta !== 'function') {
    throw new Error('renderable-order-adapter.js must load before render.js');
  }
  return api;
}

function createRenderableOrderAdapterDepsForRender() {
  return {
    averageScreenPoint: averageScreenPoint,
    getDomainSceneCoreApi: getDomainSceneCoreApi,
    requireRenderOrderCoreForRender: requireRenderOrderCoreForRender
  };
}

// P12b-7 note: render-facing renderable order adapter is delegated to
// src/presentation/render/renderables/renderable-order-adapter.js.

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

// P12b-4: render diagnostics/debug payload facade moved to
// presentation/render/diagnostics/render-diagnostics-facade.js.

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
  var packetDiagnostics = getStaticPacketViewRotationDiagnosticsForRender(currentViewRotation);
  var packetViewRotation = packetDiagnostics.staticPacketViewRotation;
  return JSON.stringify({
    lightingSignature: staticBoxLightingSignature(),
    xrayFaces: !!xrayFaces,
    showDebug: !!showDebug,
    surfaceOnlyRenderingEnabled: getMainEditorCameraSettingsForRender().surfaceOnlyRenderingEnabled !== false,
    packetViewRotation: Number(packetViewRotation || 0),
    packetViewRotationMode: String(packetDiagnostics.staticPacketViewRotationMode || ''),
    packetViewRotationDelta: Number(packetDiagnostics.staticPacketViewRotationDelta || 0),
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

// P12b-4: build diagnostics emitters are owned by render-diagnostics-facade.js.

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

// P12b-3: static renderable builder facade moved to
// presentation/render/renderables/static-renderable-facade.js.

// P12b-4: render frame/cache/zoom diagnostic emitters are owned by
// presentation/render/diagnostics/render-diagnostics-facade.js.

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
  const sourceBoxes = Array.isArray(boxList) ? boxList : [];
  const faces = [];
  const e = 0.001;
  const prio = { bottom: 0, north: 1, west: 2, east: 3, south: 4, top: 5 };

  function safeSize(value, fallback = 1) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.max(0.001, n) : fallback;
  }

  function hasFractionalAabb(box) {
    if (!box) return false;
    const vals = [box.x, box.y, box.z, box.w, box.d, box.h];
    for (let i = 0; i < vals.length; i++) {
      const n = Number(vals[i] == null ? (i >= 3 ? 1 : 0) : vals[i]);
      if (!Number.isFinite(n)) continue;
      if (Math.abs(n - Math.round(n)) > 1e-6) return true;
    }
    return false;
  }

  function makeFace(cell, dir, poly, fill, aabb, worldPts) {
    const depth = poly.reduce((sum, p) => sum + p.y, 0) / poly.length + prio[dir] * 0.0001;
    faces.push({
      id: `box-${cell.box && cell.box.id != null ? cell.box.id : 'x'}-${cell.x}-${cell.y}-${cell.z}-${dir}`,
      kind: 'box-face',
      boxId: cell.box && cell.box.id != null ? cell.box.id : null,
      instanceId: cell.box && cell.box.instanceId || null,
      dir,
      cell: { x: cell.x, y: cell.y, z: cell.z, w: cell.w, d: cell.d, h: cell.h },
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

  function emitDirectCuboidFaces(box) {
    const x = Number(box && box.x) || 0;
    const y = Number(box && box.y) || 0;
    const z = Number(box && box.z) || 0;
    const w = safeSize(box && box.w, 1);
    const d = safeSize(box && box.d, 1);
    const h = safeSize(box && box.h, 1);
    const cell = { box, x, y, z, w, d, h };
    const pts = cubePoints(x, y, z, w, d, h);
    const { p000,p100,p110,p010,p001,p101,p111,p011 } = pts;
    const fc = faceColors((box && box.base) || '#7aa2f7');
    makeFace(cell, 'top', [p001,p101,p111,p011], xrayFaces ? 'rgba(255,255,255,.20)' : fc.top,
             makeAABB(x, y, z + h, w, d, e), [
               { x, y, z: z + h }, { x: x + w, y, z: z + h }, { x: x + w, y: y + d, z: z + h }, { x, y: y + d, z: z + h }
             ]);
    makeFace(cell, 'east', [p101,p111,p110,p100], xrayFaces ? 'rgba(255,255,255,.18)' : fc.left,
             makeAABB(x + w, y, z, e, d, h), [
               { x: x + w, y, z }, { x: x + w, y: y + d, z }, { x: x + w, y: y + d, z: z + h }, { x: x + w, y, z: z + h }
             ]);
    makeFace(cell, 'south', [p011,p111,p110,p010], xrayFaces ? 'rgba(255,255,255,.16)' : fc.right,
             makeAABB(x, y + d, z, w, e, h), [
               { x, y: y + d, z }, { x: x + w, y: y + d, z }, { x: x + w, y: y + d, z: z + h }, { x, y: y + d, z: z + h }
             ]);
    if (includeHidden) {
      makeFace(cell, 'bottom', [p000,p100,p110,p010], 'rgba(255,255,255,.08)',
               makeAABB(x, y, z - e, w, d, e), [
                 { x, y, z }, { x: x + w, y, z }, { x: x + w, y: y + d, z }, { x, y: y + d, z }
               ]);
      makeFace(cell, 'north', [p001,p101,p100,p000], 'rgba(255,255,255,.10)',
               makeAABB(x, y - e, z, w, e, h), [
                 { x, y, z: z + h }, { x: x + w, y, z: z + h }, { x: x + w, y, z }, { x, y, z }
               ]);
      makeFace(cell, 'west', [p001,p011,p010,p000], 'rgba(255,255,255,.10)',
               makeAABB(x - e, y, z, e, d, h), [
                 { x, y, z: z + h }, { x, y: y + d, z: z + h }, { x, y: y + d, z }, { x, y, z }
               ]);
    }
  }

  if (sourceBoxes.some(hasFractionalAabb)) {
    for (let i = 0; i < sourceBoxes.length; i++) emitDirectCuboidFaces(sourceBoxes[i]);
    return faces;
  }

  const occ = buildOccupancy(sourceBoxes);

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
      makeFace({ box, x, y, z, w: 1, d: 1, h: 1 }, 'top', [p001,p101,p111,p011], xrayFaces ? 'rgba(255,255,255,.20)' : fc.top,
               makeAABB(x, y, z + 1, 1, 1, e), [p001,p101,p111,p011]);
    }
    if (!neighbors.east) {
      makeFace({ box, x, y, z, w: 1, d: 1, h: 1 }, 'east', [p101,p111,p110,p100], xrayFaces ? 'rgba(255,255,255,.18)' : fc.left,
               makeAABB(x + 1, y, z, e, 1, 1), [p101,p111,p110,p100]);
    }
    if (!neighbors.south) {
      makeFace({ box, x, y, z, w: 1, d: 1, h: 1 }, 'south', [p011,p111,p110,p010], xrayFaces ? 'rgba(255,255,255,.16)' : fc.right,
               makeAABB(x, y + 1, z, 1, e, 1), [p011,p111,p110,p010]);
    }

    if (includeHidden) {
      if (!neighbors.bottom) {
        makeFace({ box, x, y, z, w: 1, d: 1, h: 1 }, 'bottom', [p000,p100,p110,p010], 'rgba(255,255,255,.08)',
                 makeAABB(x, y, z - e, 1, 1, e), [p000,p100,p110,p010]);
      }
      if (!neighbors.north) {
        makeFace({ box, x, y, z, w: 1, d: 1, h: 1 }, 'north', [p001,p101,p100,p000], 'rgba(255,255,255,.10)',
                 makeAABB(x, y - e, z, 1, e, 1), [p001,p101,p100,p000]);
      }
      if (!neighbors.west) {
        makeFace({ box, x, y, z, w: 1, d: 1, h: 1 }, 'west', [p001,p011,p010,p000], 'rgba(255,255,255,.10)',
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




function getHabboCompositeRendererApiForRender() {
  try {
    if (typeof window !== 'undefined') {
      return window.__APP_PRESENTATION_HABBO_COMPOSITE_RENDERER__ || window.__HABBO_COMPOSITE_RENDERER__ || window.IsometricHabboCompositeRenderer || null;
    }
    if (typeof globalThis !== 'undefined') {
      return globalThis.__APP_PRESENTATION_HABBO_COMPOSITE_RENDERER__ || globalThis.__HABBO_COMPOSITE_RENDERER__ || globalThis.IsometricHabboCompositeRenderer || null;
    }
  } catch (_) {}
  return null;
}

function requireHabboCompositeRendererForRender() {
  var api = getHabboCompositeRendererApiForRender();
  if (!api) throw new Error('habbo-composite-renderer.js must load before presentation/render/render.js');
  return api;
}

function getPrefabSpriteRendererApiForRender() {
  try {
    if (typeof window !== 'undefined') {
      return window.__APP_PRESENTATION_PREFAB_SPRITE_RENDERER__ || window.__PREFAB_SPRITE_RENDERER__ || window.IsometricPrefabSpriteRenderer || null;
    }
    if (typeof globalThis !== 'undefined') {
      return globalThis.__APP_PRESENTATION_PREFAB_SPRITE_RENDERER__ || globalThis.__PREFAB_SPRITE_RENDERER__ || globalThis.IsometricPrefabSpriteRenderer || null;
    }
  } catch (_) {}
  return null;
}

function requirePrefabSpriteRendererForRender() {
  var api = getPrefabSpriteRendererApiForRender();
  if (!api) throw new Error('prefab-sprite-renderer.js must load before presentation/render/render.js');
  return api;
}

function getPlayerSpriteFrameApiForRender() {
  try {
    if (typeof window !== 'undefined') {
      return window.__APP_PRESENTATION_PLAYER_SPRITE_FRAME__ || window.__PLAYER_SPRITE_FRAME__ || window.IsometricPlayerSpriteFrame || null;
    }
    if (typeof globalThis !== 'undefined') {
      return globalThis.__APP_PRESENTATION_PLAYER_SPRITE_FRAME__ || globalThis.__PLAYER_SPRITE_FRAME__ || globalThis.IsometricPlayerSpriteFrame || null;
    }
  } catch (_) {}
  return null;
}

function requirePlayerSpriteFrameForRender() {
  var api = getPlayerSpriteFrameApiForRender();
  if (!api) throw new Error('player-sprite-frame.js must load before presentation/render/render.js');
  return api;
}

function getPrefabSpriteConfig() {
  return requirePrefabSpriteRendererForRender().getPrefabSpriteConfig.apply(null, arguments);
}

function getHabboLayerConfigList() {
  return requireHabboCompositeRendererForRender().getHabboLayerConfigList.apply(null, arguments);
}

function getCachedImageFromDataUrl() {
  return requireHabboCompositeRendererForRender().getCachedImageFromDataUrl.apply(null, arguments);
}

function getPrefabSpriteImage() {
  return requirePrefabSpriteRendererForRender().getPrefabSpriteImage.apply(null, arguments);
}

function getHabboLayerDrawable() {
  return requireHabboCompositeRendererForRender().getHabboLayerDrawable.apply(null, arguments);
}

function getHabboCanvasBlendMode() {
  return requireHabboCompositeRendererForRender().getHabboCanvasBlendMode.apply(null, arguments);
}

function habboCompositeCacheKey() {
  return requireHabboCompositeRendererForRender().habboCompositeCacheKey.apply(null, arguments);
}

function getHabboPlacementCoreApiForRender() {
  return requireHabboCompositeRendererForRender().getHabboPlacementCoreApiForRender.apply(null, arguments);
}

function requireHabboPlacementCoreForRender() {
  return requireHabboCompositeRendererForRender().requireHabboPlacementCoreForRender.apply(null, arguments);
}

function getHabboTileMetricsForRender() {
  return requireHabboCompositeRendererForRender().getHabboTileMetricsForRender.apply(null, arguments);
}

function getHabboPlacementShift() {
  return requireHabboCompositeRendererForRender().getHabboPlacementShift.apply(null, arguments);
}

function pixelShiftToCellShift() {
  return requireHabboCompositeRendererForRender().pixelShiftToCellShift.apply(null, arguments);
}

function cellShiftToPixelShift() {
  return requireHabboCompositeRendererForRender().cellShiftToPixelShift.apply(null, arguments);
}

function getHabboPlacementDecomposition() {
  return requireHabboCompositeRendererForRender().getHabboPlacementDecomposition.apply(null, arguments);
}

function getHabboPlacementCellShift() {
  return requireHabboCompositeRendererForRender().getHabboPlacementCellShift.apply(null, arguments);
}

function getHabboRoomOrigin() {
  return requireHabboCompositeRendererForRender().getHabboRoomOrigin.apply(null, arguments);
}

function getHabboProxyVisualShift() {
  return requireHabboCompositeRendererForRender().getHabboProxyVisualShift.apply(null, arguments);
}

function withScreenTranslate() {
  return requireHabboCompositeRendererForRender().withScreenTranslate.apply(null, arguments);
}

function getHabboInstanceVisualShift() {
  return requireHabboCompositeRendererForRender().getHabboInstanceVisualShift.apply(null, arguments);
}

function getHabboLayerLocalBox() {
  return requireHabboCompositeRendererForRender().getHabboLayerLocalBox.apply(null, arguments);
}

function buildHabboComposite() {
  return requireHabboCompositeRendererForRender().buildHabboComposite.apply(null, arguments);
}

function getHabboComposite() {
  return requireHabboCompositeRendererForRender().getHabboComposite.apply(null, arguments);
}

function prefabDrawsVoxels() {
  return requirePrefabSpriteRendererForRender().prefabDrawsVoxels.apply(null, arguments);
}

function prefabHasSprite() {
  return requirePrefabSpriteRendererForRender().prefabHasSprite.apply(null, arguments);
}

function rotKeyForSprite() {
  return requireHabboCompositeRendererForRender().rotKeyForSprite.apply(null, arguments);
}

function drawPrefabSpriteAt() {
  return requirePrefabSpriteRendererForRender().drawPrefabSpriteAt.apply(null, arguments);
}

function drawPrefabSpriteInstance() {
  return requirePrefabSpriteRendererForRender().drawPrefabSpriteInstance.apply(null, arguments);
}

function getSpriteDepthSplitCandidate() {
  return requirePrefabSpriteRendererForRender().getSpriteDepthSplitCandidate.apply(null, arguments);
}

function drawPrefabSpritePartInstance() {
  return requirePrefabSpriteRendererForRender().drawPrefabSpritePartInstance.apply(null, arguments);
}

function drawHabboDebugOverlay() {
  return requirePrefabSpriteRendererForRender().drawHabboDebugOverlay.apply(null, arguments);
}

function getInstanceProxyBounds() {
  return requirePrefabSpriteRendererForRender().getInstanceProxyBounds.apply(null, arguments);
}

function lineYAtX() {
  return requirePrefabSpriteRendererForRender().lineYAtX.apply(null, arguments);
}

function classifyPlayerAgainstProxyBox() {
  return requirePrefabSpriteRendererForRender().classifyPlayerAgainstProxyBox.apply(null, arguments);
}

function getSpriteProxySortMode() {
  return requirePrefabSpriteRendererForRender().getSpriteProxySortMode.apply(null, arguments);
}

function computeSpriteRenderableSort() {
  return requirePrefabSpriteRendererForRender().computeSpriteRenderableSort.apply(null, arguments);
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


// P12b-3: static render cache coordinator facade moved to
// presentation/render/renderables/static-renderable-facade.js.

function mergeSortedRenderables(staticRenderables, dynamicRenderables) {
  return requireRenderableOrderAdapterForRender().mergeSortedRenderables(
    staticRenderables,
    dynamicRenderables,
    createRenderableOrderAdapterDepsForRender()
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

function getPlayerVisualScale() {
  return requirePlayerSpriteFrameForRender().getPlayerVisualScale.apply(null, arguments);
}

function currentAnimFrame() {
  return requirePlayerSpriteFrameForRender().currentAnimFrame.apply(null, arguments);
}

function getPlayerUnifiedLightCenter() {
  return requirePlayerSpriteFrameForRender().getPlayerUnifiedLightCenter.apply(null, arguments);
}

function preparePlayerSpriteFrame() {
  return requirePlayerSpriteFrameForRender().preparePlayerSpriteFrame.apply(null, arguments);
}

function drawPlayerAvatar() {
  return requirePlayerSpriteFrameForRender().drawPlayerAvatar.apply(null, arguments);
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

// PXM-07.18H: static world chunk geometry is built only for discrete
// view rotations. Visual camera rotation may animate through fractional
// PXM-07.18J: keep rotation tween frames visually honest.
// Tiny numeric drift near 0/1/2/3 is snapped for static cache stability, but
// true interpolation values must remain fractional and enter the render/cache
// path. Otherwise the visual rotation animation is effectively deleted.
function getStaticPacketRotationSnapEpsilonForRender() {
  var raw = null;
  try { if (window && window.localStorage) raw = window.localStorage.getItem('pixiStaticRotationSnapEpsilon'); } catch (_) {}
  var n = Number(raw);
  if (!Number.isFinite(n) || n < 0) n = 0.001;
  return Math.max(0, Math.min(0.05, n));
}

function getStaticPacketRotationNearestIntegerInfoForRender(value) {
  var visual = normalizeMainEditorViewRotationValue(value);
  var snapped = Math.round(visual) % 4;
  if (snapped < 0) snapped += 4;
  var directDistance = Math.abs(visual - snapped);
  var wrapDistance = Math.min(directDistance, Math.abs(visual + 4 - snapped), Math.abs(visual - 4 - snapped));
  var epsilon = getStaticPacketRotationSnapEpsilonForRender();
  return {
    visual: visual,
    snapped: snapped,
    wrapDistance: wrapDistance,
    epsilon: epsilon,
    settled: wrapDistance <= epsilon
  };
}

function resolveStaticPacketViewRotationForRender(value) {
  var info = getStaticPacketRotationNearestIntegerInfoForRender(value);
  return info.settled ? info.snapped : info.visual;
}

function getStaticPacketViewRotationDiagnosticsForRender(value) {
  var info = getStaticPacketRotationNearestIntegerInfoForRender(value);
  var packet = info.settled ? info.snapped : info.visual;
  return {
    visualViewRotation: Number(info.visual.toFixed ? info.visual.toFixed(6) : info.visual),
    staticPacketViewRotation: Number(packet.toFixed ? packet.toFixed(6) : packet),
    staticPacketViewRotationMode: info.settled ? 'settled-discrete-snap' : 'visual-interpolation',
    staticPacketViewRotationDelta: Number(info.wrapDistance.toFixed ? info.wrapDistance.toFixed(6) : info.wrapDistance),
    staticPacketRotationSnapEpsilon: Number(info.epsilon || 0),
    staticPacketRotationWasFractional: info.settled !== true
  };
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


var __terrainChunkRenderCache = { signature: '', chunks: new Map(), summary: null, dirtyChunkKeys: new Set(), totalChunkCount: 0 };
var __terrainRuntimeSummary = null;
var __lastTerrainCameraMoveState = { key: '', terrainBatchId: null };
var __lastRenderVisibilityStats = null;
var __lastSurfaceCacheStats = null;
var __lastRenderResourceSummary = null;
var __lastLoggingCostSummary = null;

// P12b-2: moved camera/projection/render-scope implementation to src/presentation/render/projection/render-scope-builder.js.

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
  return requireTerrainRenderableBuilderForRender().getTerrainSemanticDebugPalette(
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainColorModeForRender() {
  return requireTerrainRenderableBuilderForRender().getTerrainColorModeForRender(
    createTerrainRenderableBuilderDepsForRender()
  );
}

function terrainModelHasData(model) {
  return requireTerrainRenderableBuilderForRender().terrainModelHasData(
    model,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainColumnHeightForRender(model, x, y) {
  return requireTerrainRenderableBuilderForRender().getTerrainColumnHeightForRender(
    model,
    x,
    y,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainExistingHeightForRender(model, x, y) {
  return requireTerrainRenderableBuilderForRender().getTerrainExistingHeightForRender(
    model,
    x,
    y,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainMergedHeightForRender(model, x, y) {
  return requireTerrainRenderableBuilderForRender().getTerrainMergedHeightForRender(
    model,
    x,
    y,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainChunkSizeForRender(model) {
  return requireTerrainRenderableBuilderForRender().getTerrainChunkSizeForRender(
    model,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainChunkKey(cx, cy) {
  return requireTerrainRenderableBuilderForRender().getTerrainChunkKey(
    cx,
    cy,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainChunkBounds(model, chunkX, chunkY) {
  return requireTerrainRenderableBuilderForRender().getTerrainChunkBounds(
    model,
    chunkX,
    chunkY,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainChunkCacheSignature(model) {
  return requireTerrainRenderableBuilderForRender().getTerrainChunkCacheSignature(
    model,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getVisibleTerrainChunkCoordsForScope(model, scope) {
  return requireTerrainRenderableBuilderForRender().getVisibleTerrainChunkCoordsForScope(
    model,
    scope,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function addTerrainOwnedOccupancyToSet(occupancy, model, scope) {
  return requireTerrainRenderableBuilderForRender().addTerrainOwnedOccupancyToSet(
    occupancy,
    model,
    scope,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function invalidateTerrainChunkRenderCacheForModel(model) {
  return requireTerrainRenderableBuilderForRender().invalidateTerrainChunkRenderCacheForModel(
    model,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function buildTerrainChunkSurfaceSources(model, chunkX, chunkY, scope) {
  return requireTerrainRenderableBuilderForRender().buildTerrainChunkSurfaceSources(
    model,
    chunkX,
    chunkY,
    scope,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainChunkSurfaceSources(model, chunkCoord, scope) {
  return requireTerrainRenderableBuilderForRender().getTerrainChunkSurfaceSources(
    model,
    chunkCoord,
    scope,
    createTerrainRenderableBuilderDepsForRender()
  );
}

// P12b-2: moved camera/projection/render-scope implementation to src/presentation/render/projection/render-scope-builder.js.

function buildTerrainFaceWorldPolygon(x, y, semanticFace, zStart, zEnd) {
  return requireTerrainRenderableBuilderForRender().buildTerrainFaceWorldPolygon(
    x,
    y,
    semanticFace,
    zStart,
    zEnd,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainMaterialIdForRenderModelCell(model, x, y) {
  return requireTerrainRenderableBuilderForRender().getTerrainMaterialIdForRenderModelCell(
    model,
    x,
    y,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainBaseFaceColorsForRender(model, x, y) {
  return requireTerrainRenderableBuilderForRender().getTerrainBaseFaceColorsForRender(
    model,
    x,
    y,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainFaceAppearanceForRender(model, x, y, faceDesc) {
  return requireTerrainRenderableBuilderForRender().getTerrainFaceAppearanceForRender(
    model,
    x,
    y,
    faceDesc,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getMainViewProjectionConfigWithoutCamera() {
  return requireTerrainRenderableBuilderForRender().getMainViewProjectionConfigWithoutCamera(
    createTerrainRenderableBuilderDepsForRender()
  );
}

function screenPointsFromWorldFaceNoCamera(worldPts, viewRotation) {
  return requireTerrainRenderableBuilderForRender().screenPointsFromWorldFaceNoCamera(
    worldPts,
    viewRotation,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainScreenFaceLookup(viewRotation) {
  return requireTerrainRenderableBuilderForRender().getTerrainScreenFaceLookup(
    viewRotation,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function buildTerrainGeometryPacket(faceSource, viewRotation) {
  return requireTerrainRenderableBuilderForRender().buildTerrainGeometryPacket(
    faceSource,
    viewRotation,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function getTerrainChunkGeometryPackets(entry, viewRotation) {
  return requireTerrainRenderableBuilderForRender().getTerrainChunkGeometryPackets(
    entry,
    viewRotation,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function drawTerrainFaceBatchRenderable(item) {
  return requireTerrainRenderableBuilderForRender().drawTerrainFaceBatchRenderable(
    item,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function buildTerrainChunkBatchedRenderables(entry, model, viewRotation) {
  return requireTerrainRenderableBuilderForRender().buildTerrainChunkBatchedRenderables(
    entry,
    model,
    viewRotation,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function buildTerrainFaceRenderableItem(x, y, faceDesc, viewRotation, model) {
  return requireTerrainRenderableBuilderForRender().buildTerrainFaceRenderableItem(
    x,
    y,
    faceDesc,
    viewRotation,
    model,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function buildTerrainColumnRenderablesForScope(columnEntry, model, viewRotation) {
  return requireTerrainRenderableBuilderForRender().buildTerrainColumnRenderablesForScope(
    columnEntry,
    model,
    viewRotation,
    createTerrainRenderableBuilderDepsForRender()
  );
}

function buildScopedTerrainRenderables(model, scope, viewRotation) {
  var result = requireTerrainRenderableBuilderForRender().buildScopedTerrainRenderables(
    model,
    scope,
    viewRotation,
    createTerrainRenderableBuilderDepsForRender()
  );
  if (result && result.stats) __terrainRuntimeSummary = result.stats;
  else if (requireTerrainRenderableBuilderForRender().getTerrainRuntimeSummary) __terrainRuntimeSummary = requireTerrainRenderableBuilderForRender().getTerrainRuntimeSummary();
  return result;
}

// P12b-2: moved camera/projection/render-scope implementation to src/presentation/render/projection/render-scope-builder.js.

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
  return requireRenderableOrderAdapterForRender().getViewRotationCoreApi(createRenderableOrderAdapterDepsForRender());
}

function computeViewAwareSortMeta(point, height, viewRotation) {
  return requireRenderableOrderAdapterForRender().computeViewAwareSortMeta(
    point,
    height,
    viewRotation,
    createRenderableOrderAdapterDepsForRender()
  );
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


function deriveRenderableDrawPosition(renderable) {
  return requireRenderableOrderAdapterForRender().deriveRenderableDrawPosition(
    renderable,
    createRenderableOrderAdapterDepsForRender()
  );
}

function compareRenderablesByDomain(a, b) {
  return requireRenderableOrderAdapterForRender().compareRenderablesByDomain(
    a,
    b,
    createRenderableOrderAdapterDepsForRender()
  );
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
  return requireProjectionDebugOverlayForRender().drawSelectedInstanceProjectionDebug.apply(null, arguments);
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

function getFacingFacePolygons() {
  return requireProjectionDebugOverlayForRender().getFacingFacePolygons.apply(null, arguments);
}

function buildFacingOverlayPrototype() {
  return requireProjectionDebugOverlayForRender().buildFacingOverlayPrototype.apply(null, arguments);
}

function isFiveFaceDebugPrefab() {
  return requirePlacementPreviewRendererForRender().isFiveFaceDebugPrefab.apply(null, arguments);
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

function buildFiveFaceEntries() {
  return requirePlacementPreviewRendererForRender().buildFiveFaceEntries.apply(null, arguments);
}

function expandPreviewBoxesToUnitCells() {
  return requirePlacementPreviewRendererForRender().expandPreviewBoxesToUnitCells.apply(null, arguments);
}

function screenPointsFromWorldFace(worldPts) {
  return (Array.isArray(worldPts) ? worldPts : []).map(function (p) {
    return iso(p.x, p.y, p.z);
  });
}

function drawDebugFaceRenderable() {
  return requirePlacementPreviewRendererForRender().drawDebugFaceRenderable.apply(null, arguments);
}

function createOccupiedKeySetFromOccupancy() {
  return requirePlacementPreviewRendererForRender().createOccupiedKeySetFromOccupancy.apply(null, arguments);
}

function buildPlacedDebugInstanceFaceRenderables() {
  return requirePlacementPreviewRendererForRender().buildPlacedDebugInstanceFaceRenderables.apply(null, arguments);
}

function buildDebugPreviewFaceRenderables() {
  return requirePlacementPreviewRendererForRender().buildDebugPreviewFaceRenderables.apply(null, arguments);
}

function drawDebugFiveFacePlacementPreview() {
  return requirePlacementPreviewRendererForRender().drawDebugFiveFacePlacementPreview.apply(null, arguments);
}

function drawFacingLegendPanel() {
  return requireProjectionDebugOverlayForRender().drawFacingLegendPanel.apply(null, arguments);
}

function drawItemFacingPrototypeOverlay() {
  return requireProjectionDebugOverlayForRender().drawItemFacingPrototypeOverlay.apply(null, arguments);
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
  return requirePlacementPreviewRendererForRender().drawPlacementPreview.apply(null, arguments);
}


function getActorInteractionOrderDiagnosticsApiForRender() {
  try {
    if (typeof window !== 'undefined' && window.__APP_PRESENTATION_ACTOR_INTERACTION_ORDER_DIAGNOSTICS__) return window.__APP_PRESENTATION_ACTOR_INTERACTION_ORDER_DIAGNOSTICS__;
    if (typeof window !== 'undefined' && window.__ACTOR_INTERACTION_ORDER_DIAGNOSTICS__) return window.__ACTOR_INTERACTION_ORDER_DIAGNOSTICS__;
    if (typeof window !== 'undefined' && window.IsometricActorInteractionOrderDiagnostics) return window.IsometricActorInteractionOrderDiagnostics;
  } catch (_) {}
  try {
    if (typeof globalThis !== 'undefined' && globalThis.__APP_PRESENTATION_ACTOR_INTERACTION_ORDER_DIAGNOSTICS__) return globalThis.__APP_PRESENTATION_ACTOR_INTERACTION_ORDER_DIAGNOSTICS__;
    if (typeof globalThis !== 'undefined' && globalThis.__ACTOR_INTERACTION_ORDER_DIAGNOSTICS__) return globalThis.__ACTOR_INTERACTION_ORDER_DIAGNOSTICS__;
    if (typeof globalThis !== 'undefined' && globalThis.IsometricActorInteractionOrderDiagnostics) return globalThis.IsometricActorInteractionOrderDiagnostics;
  } catch (_) {}
  return null;
}

function requireActorInteractionOrderDiagnosticsForRender() {
  var api = getActorInteractionOrderDiagnosticsApiForRender();
  if (!api) throw new Error('actor-interaction-order-diagnostics.js must load before render.js');
  return api;
}

function createActorInteractionOrderDiagnosticsDepsForRender() {
  return {
    getPlayerForActorInteractionDiagnostics: function () {
      try { return (typeof player !== 'undefined' && player) ? player : null; } catch (_) { return null; }
    },
    normalizeMainEditorViewRotationValue: normalizeMainEditorViewRotationValue
  };
}

// P12b-5 note: actor interaction order diagnostics are delegated to
// src/presentation/render/diagnostics/actor-interaction-order-diagnostics.js.
function getActorInteractionSortRadiusForRender() {
  return requireActorInteractionOrderDiagnosticsForRender().getActorInteractionSortRadiusForRender();
}

function isActorInteractionOrderDiagEnabled() {
  return requireActorInteractionOrderDiagnosticsForRender().isActorInteractionOrderDiagEnabled(createActorInteractionOrderDiagnosticsDepsForRender());
}

function emitActorInteractionOrderDiag(tag, payload, options) {
  return requireActorInteractionOrderDiagnosticsForRender().emitActorInteractionOrderDiag(tag, payload, options, createActorInteractionOrderDiagnosticsDepsForRender());
}

function getActorInteractionDiagStorageSnapshotForRender() {
  return requireActorInteractionOrderDiagnosticsForRender().getActorInteractionDiagStorageSnapshotForRender(createActorInteractionOrderDiagnosticsDepsForRender());
}

function noteActorInteractionRenderEntryForRender(payload) {
  return requireActorInteractionOrderDiagnosticsForRender().noteActorInteractionRenderEntryForRender(payload, createActorInteractionOrderDiagnosticsDepsForRender());
}

function roundActorDiagNumber(value, digits) {
  return requireActorInteractionOrderDiagnosticsForRender().roundActorDiagNumber(value, digits);
}

function isActorDiagTerrainCell(cell) {
  return requireActorInteractionOrderDiagnosticsForRender().isActorDiagTerrainCell(cell);
}

function summarizeActorDiagPlayer(playerRef) {
  return requireActorInteractionOrderDiagnosticsForRender().summarizeActorDiagPlayer(playerRef, createActorInteractionOrderDiagnosticsDepsForRender());
}

function summarizeActorDiagCell(cell) {
  return requireActorInteractionOrderDiagnosticsForRender().summarizeActorDiagCell(cell);
}

function summarizeActorDiagRenderable(renderable) {
  return requireActorInteractionOrderDiagnosticsForRender().summarizeActorDiagRenderable(renderable);
}

function summarizeActorDiagFaceKeySet(faceKeySet, limit) {
  return requireActorInteractionOrderDiagnosticsForRender().summarizeActorDiagFaceKeySet(faceKeySet, limit);
}

function getActorDiagFaceKeyCountsByFace(faceKeySet) {
  return requireActorInteractionOrderDiagnosticsForRender().getActorDiagFaceKeyCountsByFace(faceKeySet);
}

function summarizeActorDiagNearbyBoxes(playerRef, sourceBoxes, radius, limit) {
  return requireActorInteractionOrderDiagnosticsForRender().summarizeActorDiagNearbyBoxes(playerRef, sourceBoxes, radius, limit);
}

function summarizeActorDiagReplacementRelations(replacements) {
  return requireActorInteractionOrderDiagnosticsForRender().summarizeActorDiagReplacementRelations(replacements);
}

function shouldEmitActorInteractionDiagSignature(channel, signature) {
  return requireActorInteractionOrderDiagnosticsForRender().shouldEmitActorInteractionDiagSignature(channel, signature);
}

function logActorInteractionFinalOrderDiagnostics(framePlanId, viewRotation, order) {
  return requireActorInteractionOrderDiagnosticsForRender().logActorInteractionFinalOrderDiagnostics(framePlanId, viewRotation, order, createActorInteractionOrderDiagnosticsDepsForRender());
}


function requireActorInteractionGeometryForRender() {
  var globalObj = (typeof window !== 'undefined') ? window : globalThis;
  var api = (globalObj.App && globalObj.App.presentation && globalObj.App.presentation.render && globalObj.App.presentation.render.interaction && globalObj.App.presentation.render.interaction.actorInteractionGeometry)
    || globalObj.__APP_PRESENTATION_ACTOR_INTERACTION_GEOMETRY__
    || globalObj.__ACTOR_INTERACTION_GEOMETRY__
    || globalObj.IsometricActorInteractionGeometry
    || null;
  if (!api || typeof api.buildActorInteractionCellFaceKey !== 'function') {
    throw new Error('actor-interaction-geometry.js must load before render.js');
  }
  return api;
}

function createActorInteractionGeometryDepsForRender() {
  return {
    normalizeMainEditorViewRotationValue: normalizeMainEditorViewRotationValue,
    getScreenFaceForSemanticFace: getScreenFaceForSemanticFace,
    getMainViewRotationCoreApi: getMainViewRotationCoreApi,
    getMainViewProjectionConfigWithoutCamera: getMainViewProjectionConfigWithoutCamera,
    getDomainSceneCoreApi: getDomainSceneCoreApi,
    computeViewAwareSortMeta: computeViewAwareSortMeta,
    lineYAtX: lineYAtX
  };
}

// P12b-8 note: actor interaction geometry / group summaries are delegated to
// src/presentation/render/interaction/actor-interaction-geometry.js.

function buildActorInteractionCellFaceKey(cell, semanticFace, viewRotation) {
  return requireActorInteractionGeometryForRender().buildActorInteractionCellFaceKey(cell, semanticFace, viewRotation, createActorInteractionGeometryDepsForRender());
}

function getActorInteractionMemberDescriptorsFromFaceDescriptor(descriptor) {
  return requireActorInteractionGeometryForRender().getActorInteractionMemberDescriptorsFromFaceDescriptor(descriptor, createActorInteractionGeometryDepsForRender());
}

function buildActorInteractionMemberFaceKeysFromFaceDescriptor(descriptor, viewRotation) {
  return requireActorInteractionGeometryForRender().buildActorInteractionMemberFaceKeysFromFaceDescriptor(descriptor, viewRotation, createActorInteractionGeometryDepsForRender());
}


function getActorInteractionGroupKeyForCell(cell, fallbackInstanceId) {
  return requireActorInteractionGeometryForRender().getActorInteractionGroupKeyForCell(cell, fallbackInstanceId, createActorInteractionGeometryDepsForRender());
}

function buildActorInteractionBoxGroupSummaryMap(sourceBoxes) {
  return requireActorInteractionGeometryForRender().buildActorInteractionBoxGroupSummaryMap(sourceBoxes, createActorInteractionGeometryDepsForRender());
}

function isActorInteractionReplacementEligibleBox(box, groupSummaryMap) {
  return requireActorInteractionReplacementForRender().isActorInteractionReplacementEligibleBox(box, groupSummaryMap, createActorInteractionReplacementDepsForRender());
}

function buildActorInteractionGroupSummaryMapFromPackets(renderables) {
  return requireActorInteractionGeometryForRender().buildActorInteractionGroupSummaryMapFromPackets(renderables, createActorInteractionGeometryDepsForRender());
}

function projectActorInteractionWorldPointNoCamera(point, viewRotation) {
  return requireActorInteractionGeometryForRender().projectActorInteractionWorldPointNoCamera(point, viewRotation, createActorInteractionGeometryDepsForRender());
}

function computeActorInteractionPlayerSortMeta(playerRef, viewRotation) {
  return requireActorInteractionGeometryForRender().computeActorInteractionPlayerSortMeta(playerRef, viewRotation, createActorInteractionGeometryDepsForRender());
}

function classifyActorInteractionSingleFootprintGroupAgainstPlayer(group, playerRef, viewRotation) {
  return requireActorInteractionGeometryForRender().classifyActorInteractionSingleFootprintGroupAgainstPlayer(group, playerRef, viewRotation, createActorInteractionGeometryDepsForRender());
}


function requireActorInteractionReplacementForRender() {
  var globalObj = (typeof window !== 'undefined') ? window : globalThis;
  var api = (globalObj.App && globalObj.App.presentation && globalObj.App.presentation.render && globalObj.App.presentation.render.interaction && globalObj.App.presentation.render.interaction.actorInteractionReplacement)
    || globalObj.__APP_PRESENTATION_ACTOR_INTERACTION_REPLACEMENT__
    || globalObj.__ACTOR_INTERACTION_REPLACEMENT__
    || globalObj.IsometricActorInteractionReplacement
    || null;
  if (!api || typeof api.applyActorInteractionReplacementToRenderables !== 'function') {
    throw new Error('actor-interaction-replacement.js must load before render.js');
  }
  return api;
}

function createActorInteractionReplacementDepsForRender() {
  return {
    normalizeMainEditorViewRotationValue: normalizeMainEditorViewRotationValue,
    getSafeMainEditorViewRotation: getSafeMainEditorViewRotation,
    getActorInteractionSortRadiusForRender: getActorInteractionSortRadiusForRender,
    buildActorInteractionBoxGroupSummaryMap: buildActorInteractionBoxGroupSummaryMap,
    isActorDiagTerrainCell: isActorDiagTerrainCell,
    getActorInteractionGroupKeyForCell: getActorInteractionGroupKeyForCell,
    getSemanticFaceNeighborDeltaForRender: getSemanticFaceNeighborDeltaForRender,
    buildActorInteractionCellFaceKey: buildActorInteractionCellFaceKey,
    isActorInteractionOrderDiagEnabled: isActorInteractionOrderDiagEnabled,
    roundActorDiagNumber: roundActorDiagNumber,
    shouldEmitActorInteractionDiagSignature: shouldEmitActorInteractionDiagSignature,
    emitActorInteractionOrderDiag: emitActorInteractionOrderDiag,
    summarizeActorDiagPlayer: summarizeActorDiagPlayer,
    summarizeActorDiagRenderable: summarizeActorDiagRenderable,
    summarizeActorDiagReplacementRelations: summarizeActorDiagReplacementRelations,
    getActorDiagFaceKeyCountsByFace: getActorDiagFaceKeyCountsByFace,
    summarizeActorDiagFaceKeySet: summarizeActorDiagFaceKeySet,
    summarizeActorDiagNearbyBoxes: summarizeActorDiagNearbyBoxes,
    getMainFramePlanSeqForActorInteractionReplacement: function () { return (typeof __mainFramePlanSeq !== 'undefined' ? __mainFramePlanSeq : 0); },
    getSemanticFaceNormal: getSemanticFaceNormal,
    buildMergedVoxelFaceWorldGeometry: buildMergedVoxelFaceWorldGeometry,
    getScreenFaceForSemanticFace: getScreenFaceForSemanticFace,
    getTerrainMaterialPatternDescriptorForRenderCell: getTerrainMaterialPatternDescriptorForRenderCell,
    getTerrainMaterialBaseFaceColorsForRenderCell: getTerrainMaterialBaseFaceColorsForRenderCell,
    getCachedBaseFaceColorsForRenderable: getCachedBaseFaceColorsForRenderable,
    getCachedStaticRenderableFill: getCachedStaticRenderableFill,
    getTerrainRenderSettingsForRender: getTerrainRenderSettingsForRender,
    isStaticRenderableLightingActiveForBuild: isStaticRenderableLightingActiveForBuild,
    buildVoxelFaceShadowWorldOverlays: buildVoxelFaceShadowWorldOverlays,
    getTerrainMaterialIdForRenderCell: getTerrainMaterialIdForRenderCell,
    buildActorInteractionGroupSummaryMapFromPackets: buildActorInteractionGroupSummaryMapFromPackets,
    classifyActorInteractionSingleFootprintGroupAgainstPlayer: classifyActorInteractionSingleFootprintGroupAgainstPlayer,
    computeActorInteractionPlayerSortMeta: computeActorInteractionPlayerSortMeta,
    compareRenderablesByDomain: compareRenderablesByDomain
  };
}

// P12b-9 note: actor interaction candidate / suppression / replacement assembly is delegated to
// src/presentation/render/interaction/actor-interaction-replacement.js.

function applyActorInteractionGroupSortOverride(renderable, sourcePacket, groupSummaryMap, playerRef, viewRotation) {
  return requireActorInteractionReplacementForRender().applyActorInteractionGroupSortOverride(renderable, sourcePacket, groupSummaryMap, playerRef, viewRotation, createActorInteractionReplacementDepsForRender());
}

function buildActorInteractionCandidateFaceKeySetForPlayer(options) {
  return requireActorInteractionReplacementForRender().buildActorInteractionCandidateFaceKeySetForPlayer(options, createActorInteractionReplacementDepsForRender());
}

function shouldSuppressStaticPacketForActorInteraction(packet, actorFaceKeySet) {
  return requireActorInteractionReplacementForRender().shouldSuppressStaticPacketForActorInteraction(packet, actorFaceKeySet, createActorInteractionReplacementDepsForRender());
}

function buildActorInteractionReplacementRenderableFromDescriptor(descriptor, sourcePacket, viewRotation) {
  return requireActorInteractionReplacementForRender().buildActorInteractionReplacementRenderableFromDescriptor(descriptor, sourcePacket, viewRotation, createActorInteractionReplacementDepsForRender());
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

function isStableLocalDemergeExplicitlyEnabledForRender() {
  try {
    var faceMergeState = getStaticWorldFaceMergeControlStateSnapshotForRender();
    if (faceMergeState && String(faceMergeState.effectiveFaceMergeMode || 'merge') === 'no-merge') return false;
  } catch (_) {}
  try {
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem('pixiAutoStableActorSortDemerge') === '0') return false;
      if (localStorage.getItem('stableActorSortDemerge') === '1' || localStorage.getItem('experimentalStableLocalDemerge') === '1') return true;
    }
  } catch (_) {}
  try {
    var selection = window.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
    var snapshot = selection && typeof selection.getSnapshot === 'function' ? selection.getSnapshot() : null;
    if (snapshot && String(snapshot.activeBackend || '') === 'pixi') return true;
  } catch (_) {}
  try {
    var api = window.App && window.App.renderer && window.App.renderer.active;
    if (api && String(api.backend || '') === 'pixi') return true;
  } catch (_) {}
  return false;
}


function requireStableLocalDemergeForRender() {
  var globalObj = (typeof window !== 'undefined') ? window : globalThis;
  var api = (globalObj.App && globalObj.App.presentation && globalObj.App.presentation.render && globalObj.App.presentation.render.interaction && globalObj.App.presentation.render.interaction.stableLocalDemerge)
    || globalObj.__APP_PRESENTATION_STABLE_LOCAL_DEMERGE__
    || globalObj.__STABLE_LOCAL_DEMERGE__
    || globalObj.IsometricStableLocalDemerge
    || null;
  if (!api || typeof api.applyStableActorSortDemergeToStaticRenderables !== 'function') {
    throw new Error('stable-local-demerge.js must load before render.js');
  }
  return api;
}

function createStableLocalDemergeDepsForRender() {
  return {
    getStableActorSortApiForRender: getStableActorSortApiForRender,
    isStableActorSortModeEnabledForRender: isStableActorSortModeEnabledForRender,
    isStableLocalDemergeExplicitlyEnabledForRender: isStableLocalDemergeExplicitlyEnabledForRender,
    normalizeMainEditorViewRotationValue: normalizeMainEditorViewRotationValue,
    getActorInteractionSortRadiusForRender: getActorInteractionSortRadiusForRender,
    compareRenderablesByDomain: compareRenderablesByDomain,
    summarizeActorDiagRenderable: summarizeActorDiagRenderable,
    summarizeActorDiagPlayer: summarizeActorDiagPlayer,
    emitActorInteractionOrderDiag: emitActorInteractionOrderDiag,
    isActorInteractionOrderDiagEnabled: isActorInteractionOrderDiagEnabled,
    isActorDiagTerrainCell: isActorDiagTerrainCell,
    roundActorDiagNumber: roundActorDiagNumber,
    buildActorInteractionCellFaceKey: buildActorInteractionCellFaceKey,
    getActorInteractionMemberDescriptorsFromFaceDescriptor: getActorInteractionMemberDescriptorsFromFaceDescriptor,
    buildActorInteractionMemberFaceKeysFromFaceDescriptor: buildActorInteractionMemberFaceKeysFromFaceDescriptor,
    getScreenFaceForSemanticFace: getScreenFaceForSemanticFace,
    getStaticWorldFaceMergeCoreApi: getStaticWorldFaceMergeCoreApi,
    getTerrainFaceMergeCoreApi: getTerrainFaceMergeCoreApi,
    buildMergedVoxelFaceWorldGeometry: buildMergedVoxelFaceWorldGeometry,
    getSemanticFaceNormal: getSemanticFaceNormal,
    getSemanticFaceNeighborDeltaForRender: getSemanticFaceNeighborDeltaForRender,
    getTerrainMaterialPatternDescriptorForRenderCell: getTerrainMaterialPatternDescriptorForRenderCell,
    getTerrainMaterialBaseFaceColorsForRenderCell: getTerrainMaterialBaseFaceColorsForRenderCell,
    getCachedBaseFaceColorsForRenderable: getCachedBaseFaceColorsForRenderable,
    getCachedStaticRenderableFill: getCachedStaticRenderableFill,
    getTerrainRenderSettingsForRender: getTerrainRenderSettingsForRender,
    isStaticRenderableLightingActiveForBuild: isStaticRenderableLightingActiveForBuild,
    buildVoxelFaceShadowWorldOverlays: buildVoxelFaceShadowWorldOverlays,
    buildTerrainTopBoundarySegmentsWorldFromDescriptor: buildTerrainTopBoundarySegmentsWorldFromDescriptor,
    getGlobalTerrainBoundaryOccupancyReaderForRender: getGlobalTerrainBoundaryOccupancyReaderForRender,
    buildTerrainPolygonLoopSignature: buildTerrainPolygonLoopSignature,
    getTerrainMaterialIdForRenderCell: getTerrainMaterialIdForRenderCell,
    getSettingsForStableLocalDemerge: function () { return (typeof settings !== 'undefined' && settings) ? settings : null; }
  };
}

// P12b-6 note: stable local actor demerge is delegated to
// src/presentation/render/interaction/stable-local-demerge.js.

function getActorInteractionPacketMemberCells(packet) {
  return requireStableLocalDemergeForRender().getActorInteractionPacketMemberCells(packet, createStableLocalDemergeDepsForRender());
}

function isActorInteractionTerrainSupportTopPacket(packet, cells) {
  return requireStableLocalDemergeForRender().isActorInteractionTerrainSupportTopPacket(packet, cells, createStableLocalDemergeDepsForRender());
}

function getActorInteractionPacketGroupKeys(packet, cells) {
  return requireStableLocalDemergeForRender().getActorInteractionPacketGroupKeys(packet, cells, createStableLocalDemergeDepsForRender());
}

function doesTopPacketActAsPlayerSupportFloor(packet, playerRef, groupSummaryMap) {
  return requireStableLocalDemergeForRender().doesTopPacketActAsPlayerSupportFloor(packet, playerRef, groupSummaryMap, createStableLocalDemergeDepsForRender());
}

function getActorInteractionPacketMemberDescriptors(packet) {
  return requireStableLocalDemergeForRender().getActorInteractionPacketMemberDescriptors(packet, createStableLocalDemergeDepsForRender());
}

function hashStableLocalDemergeString(seed, value) {
  return requireStableLocalDemergeForRender().hashStableLocalDemergeString(seed, value, createStableLocalDemergeDepsForRender());
}

function getStableLocalDemergePacketIdentity(packet) {
  return requireStableLocalDemergeForRender().getStableLocalDemergePacketIdentity(packet, createStableLocalDemergeDepsForRender());
}

function buildStableLocalDemergeListHash(staticRenderables) {
  return requireStableLocalDemergeForRender().buildStableLocalDemergeListHash(staticRenderables, createStableLocalDemergeDepsForRender());
}

function floorStableLocalDemergeCoord(value) {
  return requireStableLocalDemergeForRender().floorStableLocalDemergeCoord(value, createStableLocalDemergeDepsForRender());
}

function getStableLocalDemergeInteractionCell(playerRef) {
  return requireStableLocalDemergeForRender().getStableLocalDemergeInteractionCell(playerRef, createStableLocalDemergeDepsForRender());
}

function buildStableLocalDemergeInteractionCellKey(playerRef) {
  return requireStableLocalDemergeForRender().buildStableLocalDemergeInteractionCellKey(playerRef, createStableLocalDemergeDepsForRender());
}

function buildStableLocalDemergeCacheKey(staticRenderables, viewRotation, playerRef, radius) {
  return requireStableLocalDemergeForRender().buildStableLocalDemergeCacheKey(staticRenderables, viewRotation, playerRef, radius, createStableLocalDemergeDepsForRender());
}

function isActorInteractionDescriptorNearPlayerForLocalDemerge(descriptor, playerRef, radius) {
  return requireStableLocalDemergeForRender().isActorInteractionDescriptorNearPlayerForLocalDemerge(descriptor, playerRef, radius, createStableLocalDemergeDepsForRender());
}

function buildStaticWorldFacePacketFromDescriptorForActorDemerge(descriptor, sourcePacket, viewRotation, mode, localIndex) {
  return requireStableLocalDemergeForRender().buildStaticWorldFacePacketFromDescriptorForActorDemerge(descriptor, sourcePacket, viewRotation, mode, localIndex, createStableLocalDemergeDepsForRender());
}

function mergeActorInteractionResidualDescriptorsForPacket(sourcePacket, residualMembers) {
  return requireStableLocalDemergeForRender().mergeActorInteractionResidualDescriptorsForPacket(sourcePacket, residualMembers, createStableLocalDemergeDepsForRender());
}

function applyStableActorSortDemergeToStaticRenderables(staticRenderables, viewRotation, playerRef, options) {
  return requireStableLocalDemergeForRender().applyStableActorSortDemergeToStaticRenderables(staticRenderables, viewRotation, playerRef, options, createStableLocalDemergeDepsForRender());
}


function requireActorSupportTopSortOverrideForRender() {
  var globalObj = (typeof window !== 'undefined') ? window : globalThis;
  var api = (globalObj.App && globalObj.App.presentation && globalObj.App.presentation.render && globalObj.App.presentation.render.interaction && globalObj.App.presentation.render.interaction.actorSupportTopSortOverride)
    || globalObj.__APP_PRESENTATION_ACTOR_SUPPORT_TOP_SORT_OVERRIDE__
    || globalObj.__ACTOR_SUPPORT_TOP_SORT_OVERRIDE__
    || globalObj.IsometricActorSupportTopSortOverride
    || null;
  if (!api || typeof api.applyPlayerSupportTopSortOverrideToRenderables !== 'function') {
    throw new Error('actor-support-top-sort-override.js must load before render.js');
  }
  return api;
}

function createActorSupportTopSortOverrideDepsForRender() {
  return {
    getStableActorSortApiForRender: getStableActorSortApiForRender,
    isStableActorSortModeEnabledForRender: isStableActorSortModeEnabledForRender,
    computeActorInteractionPlayerSortMeta: computeActorInteractionPlayerSortMeta,
    compareRenderablesByDomain: compareRenderablesByDomain,
    summarizeActorDiagRenderable: summarizeActorDiagRenderable,
    summarizeActorDiagPlayer: summarizeActorDiagPlayer,
    emitActorInteractionOrderDiag: emitActorInteractionOrderDiag,
    isActorInteractionOrderDiagEnabled: isActorInteractionOrderDiagEnabled,
    normalizeMainEditorViewRotationValue: normalizeMainEditorViewRotationValue,
    buildActorInteractionGroupSummaryMapFromPackets: buildActorInteractionGroupSummaryMapFromPackets,
    doesTopPacketActAsPlayerSupportFloor: doesTopPacketActAsPlayerSupportFloor
  };
}

// P12b-10 note: player support-top sort override is delegated to
// src/presentation/render/interaction/actor-support-top-sort-override.js.
function applyPlayerSupportTopSortOverrideToRenderables(staticRenderables, playerRef, viewRotation) {
  return requireActorSupportTopSortOverrideForRender().applyPlayerSupportTopSortOverrideToRenderables(staticRenderables, playerRef, viewRotation, createActorSupportTopSortOverrideDepsForRender());
}

function applyActorInteractionReplacementToRenderables(staticRenderables, actorFaceKeySet, viewRotation, playerRef) {
  return requireActorInteractionReplacementForRender().applyActorInteractionReplacementToRenderables(staticRenderables, actorFaceKeySet, viewRotation, playerRef, createActorInteractionReplacementDepsForRender());
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

function getPixiMigrationCanvas2dBaseWorldOverrideForRender() {
  try {
    if (typeof window !== 'undefined' && window.__PIXI_MIGRATION_CANVAS2D_BASEWORLD_OVERRIDE__ && window.__PIXI_MIGRATION_CANVAS2D_BASEWORLD_OVERRIDE__.active) {
      return window.__PIXI_MIGRATION_CANVAS2D_BASEWORLD_OVERRIDE__;
    }
  } catch (_) {}
  return null;
}

function clearAndPaintMainBackground() {
  debugState.renderStep = 'clear';
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  var pixiBaseWorldOverride = getPixiMigrationCanvas2dBaseWorldOverrideForRender();
  if (pixiBaseWorldOverride && pixiBaseWorldOverride.skipBackground) {
    debugState.renderStep = 'background-pixi-delegated';
    return;
  }
  debugState.renderStep = 'background';
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, '#0e1320');
  bg.addColorStop(1, '#141b2b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

// P12b-4: render function timing/debug breakdown helpers are owned by
// presentation/render/diagnostics/render-diagnostics-facade.js.

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
  var pixiBaseWorldOverride = getPixiMigrationCanvas2dBaseWorldOverrideForRender();
  if (pixiBaseWorldOverride && pixiBaseWorldOverride.skipFloor) {
    debugState.renderStep = 'floor-pixi-delegated';
    var pixiFloorSummary = pixiBaseWorldOverride.floorSummary || (typeof window !== 'undefined' ? window.__PIXI_MIGRATION_LAST_PIXI_FLOOR_SUMMARY__ : null) || {};
    try {
      if (typeof window !== 'undefined') {
        window.__LAST_DRAW_FLOOR_BREAKDOWN__ = {
          floorTotalWallMs: 0,
          floorLoopWallMs: 0,
          floorProjectionWallMs: 0,
          floorColorMaterialWallMs: 0,
          floorCanvasDrawWallMs: 0,
          floorLayerReusedDuringInteraction: false,
          floorLayerRebuildWallMs: 0,
          floorLayerBlitWallMs: 0,
          floorVisibleChunkCount: 0,
          floorBuiltChunkCountThisFrame: 0,
          floorMissingChunkCountBefore: 0,
          floorMissingChunkCountAfter: 0,
          floorBuiltTileCountThisFrame: Number(pixiFloorSummary.drawnTiles || 0),
          floorChunkSize: 0,
          floorVersionTag: 'pixi-floor-first-pass-v1',
          baseWorldActualBranch: 'pixi-floor-delegated-to-pixi',
          pixiFloorDelegated: true,
          pixiFloorVisibleTiles: Number(pixiFloorSummary.visibleTiles || 0),
          pixiFloorDrawnTiles: Number(pixiFloorSummary.drawnTiles || 0)
        };
      }
    } catch (_) {}
  } else {
    drawFloor(scope);
  }
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

function getSharedFloorLayerCacheSnapshotForRender(options) {
  var api = requireCanvas2dFloorLayerDrawPassForRender();
  var deps = createCanvas2dFloorLayerDrawPassDepsForRender();
  var safeOptions = options && typeof options === 'object' ? options : {};
  if (typeof api.ensureSharedFloorLayerCacheSnapshot === 'function') {
    return api.ensureSharedFloorLayerCacheSnapshot(safeOptions.force === true, deps, Object.assign({
      source: safeOptions.source || 'src/presentation/render/render.js:getSharedFloorLayerCacheSnapshotForRender',
      preferCameraTransformReuse: safeOptions.preferCameraTransformReuse === true || safeOptions.consumer === 'pixi-floor-layer-cache-shared-consumer'
    }, safeOptions));
  }
  if (typeof api.buildSharedFloorLayerCacheSnapshot === 'function') {
    return api.buildSharedFloorLayerCacheSnapshot(deps, null, Object.assign({
      source: safeOptions.source || 'src/presentation/render/render.js:getSharedFloorLayerCacheSnapshotForRender'
    }, safeOptions));
  }
  return null;
}

function bindSharedFloorLayerCacheSourceForRender() {
  if (typeof window === 'undefined') return null;
  var api = {
    owner: 'src/presentation/render/render.js',
    phase: 'shared-floor-layer-cache-source-render-wrapper',
    getSnapshot: function getSnapshot(options) {
      return getSharedFloorLayerCacheSnapshotForRender(options || {});
    }
  };
  try {
    window.__SHARED_FLOOR_LAYER_CACHE_SOURCE_FOR_RENDER__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.optimization.floorLayerCacheSource', api, {
        owner: api.owner,
        phase: api.phase
      });
    } else {
      window.App = window.App || {};
      window.App.renderer = window.App.renderer || {};
      window.App.renderer.optimization = window.App.renderer.optimization || {};
      window.App.renderer.optimization.floorLayerCacheSource = api;
    }
  } catch (_) {
    window.__SHARED_FLOOR_LAYER_CACHE_SOURCE_FOR_RENDER__ = api;
  }
  return api;
}

bindSharedFloorLayerCacheSourceForRender();

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
