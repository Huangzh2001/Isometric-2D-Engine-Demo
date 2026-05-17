// P12b-3 owner: static renderable facade / glue cleanup.
// Layer: presentation/render/renderables.
//
// Owns static-world renderable-builder and static-world render-cache coordinator
// lookup/dependency glue. It must stay focused on static renderable build/cache
// delegation and must not become a generic render utility file.
(function registerStaticRenderableFacade(global) {
  function resolveRenderFunctionDependency(name) {
    try {
      if (typeof global !== 'undefined' && typeof global[name] === 'function') return global[name];
    } catch (_) {}
    try {
      if (typeof globalThis !== 'undefined' && typeof globalThis[name] === 'function') return globalThis[name];
    } catch (_) {}
    return null;
  }

  function requireStaticWorldRenderableBuilderForRender() {
    try {
      if (typeof global !== 'undefined' && global.App && global.App.application && global.App.application.render && global.App.application.render.staticWorldRenderableBuilder) return global.App.application.render.staticWorldRenderableBuilder;
    } catch (_) {}
    try {
      if (typeof global !== 'undefined' && global.__STATIC_WORLD_RENDERABLE_BUILDER__) return global.__STATIC_WORLD_RENDERABLE_BUILDER__;
    } catch (_) {}
    throw new Error('Missing static world renderable builder: src/application/render/static-world-renderable-builder.js must load before src/presentation/render/renderables/static-renderable-facade.js');
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

  function requireStaticWorldRenderCacheCoordinatorForRender() {
    var api = null;
    try {
      api = global.App && global.App.application && global.App.application.render
        ? global.App.application.render.staticWorldRenderCacheCoordinator || null
        : null;
    } catch (_) {}
    api = api || (typeof global !== 'undefined' ? global.__STATIC_WORLD_RENDER_CACHE_COORDINATOR__ : null);
    if (!api || typeof api.rebuildStaticWorldRenderCache !== 'function') {
      throw new Error('static world render cache coordinator is unavailable; ensure src/application/render/static-world-render-cache-coordinator.js loads before static-renderable-facade.js');
    }
    return api;
  }

  function createStaticWorldRenderCacheCoordinatorDepsForRender() {
    return {
      perfNow: resolveRenderFunctionDependency('perfNow'),
      getStaticWorldFaceMergeControlStateSnapshotForRender: resolveRenderFunctionDependency('getStaticWorldFaceMergeControlStateSnapshotForRender'),
      getSafeMainEditorViewRotation: resolveRenderFunctionDependency('getSafeMainEditorViewRotation'),
      normalizeMainEditorViewRotationValue: resolveRenderFunctionDependency('normalizeMainEditorViewRotationValue'),
      resolveStaticPacketViewRotationForRender: resolveRenderFunctionDependency('resolveStaticPacketViewRotationForRender'),
      getStaticPacketViewRotationDiagnosticsForRender: resolveRenderFunctionDependency('getStaticPacketViewRotationDiagnosticsForRender'),
      buildStaticWorldRenderSignature: resolveRenderFunctionDependency('buildStaticWorldRenderSignature'),
      getRenderVisibilityCoreApi: resolveRenderFunctionDependency('getRenderVisibilityCoreApi'),
      getMainCameraRenderScope: resolveRenderFunctionDependency('getMainCameraRenderScope'),
      getSceneOccupancySnapshotForRender: resolveRenderFunctionDependency('getSceneOccupancySnapshotForRender'),
      getSceneStaticWorldCacheApiForRender: resolveRenderFunctionDependency('getSceneStaticWorldCacheApiForRender'),
      getSharedStaticWorldChunkCacheApiForRender: resolveRenderFunctionDependency('getSharedStaticWorldChunkCacheApiForRender'),
      buildInstanceRenderUpdateModeIndex: resolveRenderFunctionDependency('buildInstanceRenderUpdateModeIndex'),
      isStaticWorldBoxForRender: resolveRenderFunctionDependency('isStaticWorldBoxForRender'),
      getTerrainFrameLogContextForRender: resolveRenderFunctionDependency('getTerrainFrameLogContextForRender'),
      compareRenderablesByDomain: resolveRenderFunctionDependency('compareRenderablesByDomain'),
      buildStaticWorldChunkRenderables: buildStaticWorldChunkRenderables,
      captureStaticBoxCacheFrameState: resolveRenderFunctionDependency('captureStaticBoxCacheFrameState'),
      maybeLogStaticBoxCacheProfile: resolveRenderFunctionDependency('maybeLogStaticBoxCacheProfile'),
      maybeLogStaticCacheInvalidationVerify: resolveRenderFunctionDependency('maybeLogStaticCacheInvalidationVerify'),
      maybeLogStaticWorldChunkSummary: resolveRenderFunctionDependency('maybeLogStaticWorldChunkSummary'),
      logItemRotationPrototype: resolveRenderFunctionDependency('logItemRotationPrototype'),
      buildMainViewRotationSourceCheckPayload: resolveRenderFunctionDependency('buildMainViewRotationSourceCheckPayload'),
      noteLayerRebuild: resolveRenderFunctionDependency('noteLayerRebuild'),
      isInteractiveRenderPressure: resolveRenderFunctionDependency('isInteractiveRenderPressure'),
      setLastSurfaceCacheStats: function (stats) { global.__lastSurfaceCacheStats = stats || null; try { __lastSurfaceCacheStats = stats || null; } catch (_) {} }
    };
  }

  function rebuildStaticBoxRenderCacheIfNeeded(force) {
    return requireStaticWorldRenderCacheCoordinatorForRender().rebuildStaticWorldRenderCache({
      force: force === true,
      boxes: global.boxes,
      instances: global.instances,
      staticBoxRenderCache: global.staticBoxRenderCache
    }, createStaticWorldRenderCacheCoordinatorDepsForRender());
  }

  var api = {
    layer: 'presentation/render/renderables',
    phase: 'P12b-3',
    resolveRenderFunctionDependency: resolveRenderFunctionDependency,
    requireStaticWorldRenderableBuilderForRender: requireStaticWorldRenderableBuilderForRender,
    createStaticWorldRenderableBuilderDepsForRender: createStaticWorldRenderableBuilderDepsForRender,
    buildStaticWorldChunkRenderables: buildStaticWorldChunkRenderables,
    requireStaticWorldRenderCacheCoordinatorForRender: requireStaticWorldRenderCacheCoordinatorForRender,
    createStaticWorldRenderCacheCoordinatorDepsForRender: createStaticWorldRenderCacheCoordinatorDepsForRender,
    rebuildStaticBoxRenderCacheIfNeeded: rebuildStaticBoxRenderCacheIfNeeded
  };

  global.IsometricStaticRenderableFacade = api;
  global.__STATIC_RENDERABLE_FACADE__ = api;
  global.__APP_PRESENTATION_STATIC_RENDERABLE_FACADE__ = api;

  global.resolveRenderFunctionDependency = resolveRenderFunctionDependency;
  global.requireStaticWorldRenderableBuilderForRender = requireStaticWorldRenderableBuilderForRender;
  global.createStaticWorldRenderableBuilderDepsForRender = createStaticWorldRenderableBuilderDepsForRender;
  global.buildStaticWorldChunkRenderables = buildStaticWorldChunkRenderables;
  global.requireStaticWorldRenderCacheCoordinatorForRender = requireStaticWorldRenderCacheCoordinatorForRender;
  global.createStaticWorldRenderCacheCoordinatorDepsForRender = createStaticWorldRenderCacheCoordinatorDepsForRender;
  global.rebuildStaticBoxRenderCacheIfNeeded = rebuildStaticBoxRenderCacheIfNeeded;
})(typeof window !== 'undefined' ? window : globalThis);
