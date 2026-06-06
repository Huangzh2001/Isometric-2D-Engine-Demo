const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const faceDescriptorBuilderSource = fs.readFileSync(path.join(root, 'src/application/render/static-world-face-descriptor-builder.js'), 'utf8');
const packetOrderingSource = fs.readFileSync(path.join(root, 'src/application/render/static-world-packet-ordering.js'), 'utf8');
const builderSource = fs.readFileSync(path.join(root, 'src/application/render/static-world-renderable-builder.js'), 'utf8');
const renderSource = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');
const staticRenderableFacadeSource = fs.readFileSync(path.join(root, 'src/presentation/render/renderables/static-renderable-facade.js'), 'utf8');

const sandbox = {
  window: {},
  Math,
  Number,
  String,
  Object,
  Array,
  Set,
  Map,
  Date,
  JSON,
  console,
  performance: { now: () => 0 }
};
vm.runInNewContext(faceDescriptorBuilderSource, sandbox, { filename: 'static-world-face-descriptor-builder.js' });
vm.runInNewContext(packetOrderingSource, sandbox, { filename: 'static-world-packet-ordering.js' });
vm.runInNewContext(builderSource, sandbox, { filename: 'static-world-renderable-builder.js' });

const api = sandbox.window.__STATIC_WORLD_RENDERABLE_BUILDER__;
assert(api, 'static world renderable builder should expose window.__STATIC_WORLD_RENDERABLE_BUILDER__');
assert.strictEqual(sandbox.window.__APP_APPLICATION_STATIC_WORLD_RENDERABLE_BUILDER__, api, 'builder should expose app bootstrap handle');
assert.strictEqual(typeof api.buildStaticWorldChunkRenderables, 'function', 'buildStaticWorldChunkRenderables should be an application function');
assert(indexSource.includes('src/application/render/static-world-face-descriptor-builder.js'), 'index should load face descriptor builder');
assert(indexSource.includes('src/application/render/static-world-packet-ordering.js'), 'index should load packet ordering owner');
assert(indexSource.includes('src/application/render/static-world-renderable-builder.js'), 'index should load static world renderable builder');
assert(indexSource.indexOf('src/application/render/static-world-face-descriptor-builder.js') < indexSource.indexOf('src/application/render/static-world-renderable-builder.js'), 'face descriptor owner must load before static world renderable builder');
assert(indexSource.indexOf('src/application/render/static-world-packet-ordering.js') < indexSource.indexOf('src/application/render/static-world-renderable-builder.js'), 'packet ordering owner must load before static world renderable builder');
assert(indexSource.indexOf('src/application/render/static-world-renderable-builder.js') < indexSource.indexOf('src/presentation/render/render.js'), 'builder must load before render.js');

assert(staticRenderableFacadeSource.includes('requireStaticWorldRenderableBuilderForRender'), 'static-renderable-facade should use builder require wrapper');
assert(staticRenderableFacadeSource.includes('createStaticWorldRenderableBuilderDepsForRender'), 'static-renderable-facade should provide explicit builder deps');
assert(staticRenderableFacadeSource.includes('staticWorldRenderableBuilder'), 'static-renderable-facade wrapper should call application builder');
assert(!renderSource.includes('function requireStaticWorldRenderableBuilderForRender('), 'render.js should not own builder require wrapper');
assert(!renderSource.includes('function createStaticWorldRenderableBuilderDepsForRender('), 'render.js should not own explicit builder deps');
assert(!/function buildStaticWorldChunkRenderables\s*\([^)]*\)\s*\{[\s\S]{3000,}var surfaceCells/.test(renderSource), 'render.js should no longer own the large static world chunk builder body');

assert(!/\bctx\s*\./.test(builderSource), 'builder must not draw to canvas ctx');
assert(!/\bdocument\s*\./.test(builderSource), 'builder must not access document');
assert(!/\blocalStorage\s*\./.test(builderSource) && !/global\s*\.\s*localStorage/.test(builderSource), 'builder must not access localStorage');
assert(!/\bnew\s+Image\b/.test(builderSource), 'builder must not allocate Image');

assert(builderSource.includes('requireStaticWorldFaceDescriptorBuilder'), 'builder should require face descriptor owner');
assert(builderSource.includes('requireStaticWorldPacketOrdering'), 'builder should require packet ordering owner');
assert(!builderSource.includes('var faceTiePrio ='), 'builder should not own face tie priority table');
assert(!builderSource.includes('packets.sort(compareRenderablesByDomain)'), 'builder should delegate packet sorting to ordering owner');

const emitted = [];
function emit(name) {
  return function (payload) {
    emitted.push({ name, payload });
  };
}

const deps = {
  perfNow: () => 0,
  getRenderVisibilityCoreApi: () => ({
    buildVisibleSurfaceCache: (boxes) => ({
      surfaceCells: boxes.map((box) => ({ box, visibleFaces: ['top'] })),
      logicalVoxelCountEstimated: boxes.length,
      visibleTopFaceCount: boxes.length,
      visibleSideFaceCount: 0,
      hiddenInternalSurfaceSkippedCount: 0,
      voxelFurnitureProcessedCount: boxes.length,
      surfaceOnlyRenderingEnabled: true,
      internalVoxelSkippedCount: 0,
      cameraCulledCount: 0
    })
  }),
  getMainCameraRenderScope: () => ({ surfaceOnlyRenderingEnabled: true }),
  resolveChunkOccupancyReaderForRender: () => ({
    reader: { hasSolid: () => false },
    source: 'test-global',
    validationSampleCount: 1
  }),
  buildChunkLocalOccupancyMap: () => ({ hasSolid: () => false }),
  getDomainSceneCoreApi: () => ({
    computeVoxelRenderableSort: () => ({ sortKey: 10, tie: 2, rotatedPoint: { y: 0 } })
  }),
  isStaticWorldFaceMergeEnabledForRender: () => false,
  isStaticRenderableLightingUiEnabledForBuild: () => false,
  getScreenFaceForSemanticFace: (face) => String(face || 'top'),
  getSemanticFaceNormal: () => ({ x: 0, y: 0, z: 1 }),
  getStaticWorldFaceMergeCoords: () => ({ plane: 1, u: 2, v: 3 }),
  computeViewAwareSortMeta: () => ({ sortKey: 10, tie: 2, rotatedPoint: { y: 0 } }),
  getTerrainSortBandKeyForRenderFace: () => null,
  getTerrainSideEdgeVisibilitySignature: () => null,
  getTerrainSideStepBreakSignature: () => null,
  getTerrainMaterialMergeKeyForRenderCell: () => null,
  getTerrainFaceMergeSignature: () => null,
  getStaticWorldFaceMergeSignature: () => 'sig',
  getStaticWorldFaceMergeCoreApi: () => null,
  getTerrainFaceMergeCoreApi: () => null,
  buildMergedVoxelFaceWorldGeometry: () => ({
    worldPts: [{ x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }, { x: 1, y: 1, z: 1 }, { x: 0, y: 1, z: 1 }],
    worldLoops: null,
    worldOutlineSegments: null
  }),
  buildTerrainTopBoundarySegmentsWorldFromDescriptor: () => [],
  buildTerrainPolygonLoopSignature: () => '',
  getTerrainMaterialPatternDescriptorForRenderCell: () => null,
  getTerrainMaterialBaseFaceColorsForRenderCell: () => null,
  getCachedBaseFaceColorsForRenderable: () => ({ line: '#000000' }),
  getTerrainRenderSettingsForRender: () => ({ terrainBuildColorMode: 'natural', terrainBuildLightingBypass: true }),
  isStaticRenderableLightingActiveForBuild: () => false,
  getCachedStaticRenderableFill: () => ({ fill: '#ffffff' }),
  buildVoxelFaceShadowWorldOverlays: () => [],
  buildActorInteractionMemberFaceKeysFromFaceDescriptor: () => [],
  getActorInteractionMemberDescriptorsFromFaceDescriptor: () => [],
  getTerrainMaterialIdForRenderCell: () => null,
  compareRenderablesByDomain: (a, b) => Number(a.sortKey || 0) - Number(b.sortKey || 0) || Number(a.tie || 0) - Number(b.tie || 0),
  emitChunkRebuildScopeVerify: emit('emitChunkRebuildScopeVerify'),
  emitChunkRebuildDetail: emit('emitChunkRebuildDetail'),
  emitChunkRebuildHotspot: emit('emitChunkRebuildHotspot'),
  emitStaticRenderableBuildDetail: emit('emitStaticRenderableBuildDetail'),
  emitStaticRenderableBuildScopeVerify: emit('emitStaticRenderableBuildScopeVerify'),
  emitStaticRenderableBuildHotspot: emit('emitStaticRenderableBuildHotspot'),
  emitColorBuildDetail: emit('emitColorBuildDetail'),
  emitStep4ColorBuildDetail: emit('emitStep4ColorBuildDetail'),
  emitStep4ColorBuildScopeVerify: emit('emitStep4ColorBuildScopeVerify'),
  getStaticRenderableActualColorPathUsed: () => 'natural+bypass',
  getStaticRenderableBuildColorModeForRender: () => 'natural',
  emitBuildColorPathVerify: emit('emitBuildColorPathVerify'),
  emitLightingShadowBypassVerify: emit('emitLightingShadowBypassVerify'),
  emitStep4ShadowPathSummary: emit('emitStep4ShadowPathSummary'),
  emitColorBuildMissBreakdown: emit('emitColorBuildMissBreakdown'),
  emitColorBuildHotspot: emit('emitColorBuildHotspot'),
  emitStep4ColorBuildHotspot: emit('emitStep4ColorBuildHotspot'),
  emitChunkRebuildBreakdown: emit('emitChunkRebuildBreakdown')
};

const cell = {
  id: 'c1',
  instanceId: 'inst1',
  prefabId: 'cube_1x1',
  x: 0,
  y: 0,
  z: 0,
  w: 1,
  d: 1,
  h: 1,
  base: '#7aa2f7'
};
const chunk = {
  key: '0,0',
  bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
  boxMap: new Map([['c1', cell]])
};

const result = api.buildStaticWorldChunkRenderables(chunk, {
  currentViewRotation: 0,
  cameraScope: { surfaceOnlyRenderingEnabled: true },
  neighborBoxes: [],
  profileContext: { terrainBatchId: 'test-batch' },
  touchedChunkKeys: ['0,0']
}, deps);

assert(result && Array.isArray(result.packets), 'builder should return packets array');
assert.strictEqual(result.packets.length, 1, 'one visible top face should produce one packet');
assert.strictEqual(result.packets[0].kind, 'static-world-face-packet', 'packet kind should be stable');
assert.strictEqual(result.packets[0].renderPath, 'static-world-chunk-packet', 'render path should be stable');
assert.strictEqual(result.stats.packetCount, 1, 'stats should include packet count');
assert(emitted.some((entry) => entry.name === 'emitChunkRebuildDetail'), 'builder should emit chunk rebuild detail through injected hook');



console.log('static-world-renderable-builder.test.js PASS');
