const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.includes('id="tabFluid"'), 'index should define Fluid tab button');
assert(html.includes('id="tabFluidPage"'), 'index should define Fluid tab page');
assert(html.includes('id="fluidRenderLayerCount"'), 'Fluid / Render should have a layer count input');
assert(html.includes('id="fluidRenderSurfaceSubdivisions"'), 'Fluid / Render should have a surface subdivision input');
assert(html.includes('id="fluidRenderEdgeCurveStrength"'), 'Fluid / Render should have an edge interpolation curve strength input');
assert(html.includes('id="fluidRenderPrefabSelect"'), 'Fluid / Render should have a fluid prefab select');
assert(html.includes('流体 / 渲染'), 'Fluid page should contain Render subsection');
assert(html.includes('流体 / 规则'), 'Fluid page should reserve Rules subsection');
assert(html.includes('src/presentation/ui/ui-fluid-panel.js'), 'index should load fluid UI panel script');

const dom = fs.readFileSync(path.join(root, 'src/presentation/shell/dom-registry.js'), 'utf8');
assert(dom.includes('tabFluid:'), 'dom registry should expose tabFluid');
assert(dom.includes('tabFluidPage:'), 'dom registry should expose tabFluidPage');
assert(dom.includes('fluidRenderLayerCount:'), 'dom registry should expose fluidRenderLayerCount');
assert(dom.includes('fluidRenderSurfaceSubdivisions:'), 'dom registry should expose fluidRenderSurfaceSubdivisions');
assert(dom.includes('fluidRenderEdgeCurveStrength:'), 'dom registry should expose fluidRenderEdgeCurveStrength');
assert(dom.includes('fluidRenderPrefabSelect:'), 'dom registry should expose fluidRenderPrefabSelect');

const tabs = fs.readFileSync(path.join(root, 'src/presentation/ui/ui-tabs.js'), 'utf8');
assert(tabs.includes("tab === 'fluid'"), 'tab switching should support fluid tab');

const prefabRefresh = fs.readFileSync(path.join(root, 'src/presentation/ui/prefab-select-refresh.js'), 'utf8');
assert(prefabRefresh.includes('isFluidRenderPrefab'), 'object prefab select refresh should classify fluid prefabs');
assert(prefabRefresh.includes('getObjectPrefabEntries'), 'object prefab select refresh should filter fluid prefabs');

const registry = fs.readFileSync(path.join(root, 'src/core/state/prefab-registry.js'), 'utf8');
assert(registry.includes('ensureLiquidWaterLayerPrefabs'), 'prefab registry should generate layer-count water prefabs');
assert(registry.includes('normalizeLiquidWaterLayerCount'), 'prefab registry should normalize even water layer counts');

const fluidPanel = fs.readFileSync(path.join(root, 'src/presentation/ui/ui-fluid-panel.js'), 'utf8');
assert(fluidPanel.includes('fluidRenderLayerCount'), 'fluid panel should bind the layer-count control');
assert(fluidPanel.includes('fluidRenderSurfaceSubdivisions'), 'fluid panel should bind the surface subdivision control');
assert(fluidPanel.includes('fluidRenderEdgeCurveStrength'), 'fluid panel should bind the edge curve strength control');
assert(fluidPanel.includes('applyEdgeCurveStrength'), 'fluid panel should apply edge curve strength changes');
assert(fluidPanel.includes('applySurfaceSubdivisions'), 'fluid panel should apply surface subdivision changes');

const configCore = fs.readFileSync(path.join(root, 'src/core/domain/fluid-render-config-core.js'), 'utf8');
assert(configCore.includes('normalizeSurfaceSubdivisions'), 'fluid render config core should normalize surface subdivisions');
assert(configCore.includes('normalizeEdgeCurveStrength'), 'fluid render config core should normalize edge curve strength');
assert(fluidPanel.includes('ensureLayerPrefabs'), 'fluid panel should ensure layer-count water prefabs');

console.log('fluid-ui-page-structure.test.js PASS');

const rulesCore = fs.readFileSync(path.join(root, 'src/core/domain/fluid-rules-core.js'), 'utf8');
assert(rulesCore.includes('FLUID-RULES-V1D-EMPTY-CELL-GRAVITY-FIRST'), 'fluid rules core should define V1 gravity-first CA');
const rulesUi = fs.readFileSync(path.join(root, 'src/presentation/ui/ui-fluid-rules-panel.js'), 'utf8');
assert(rulesUi.includes('fluidRulesIntervalSec'), 'fluid rules UI should bind update interval seconds');
assert(rulesUi.includes('stepOnce'), 'fluid rules UI should provide single-step execution');
assert(html.includes('id="fluidRulesIntervalSec"'), 'Fluid / Rules should expose update interval seconds');
assert(html.includes('id="fluidRulesStepOnce"'), 'Fluid / Rules should expose Step Once button');

assert(html.includes('id="fluidRulesGravityEnabled"'), 'Fluid / Rules should expose gravity enabled control');
assert(html.includes('id="fluidRulesGravityMaxFlow"'), 'Fluid / Rules should expose gravity max flow control');

const staticBuilder = fs.readFileSync(path.join(root, 'src/application/render/static-world-renderable-builder.js'), 'utf8');
assert(staticBuilder.includes('liquidPacketSortOffset'), 'liquid packets should use normal world-cell sort offset');
assert(staticBuilder.includes('liquid-render-v16-liquid-not-solid-occluder'), 'liquid render path should identify normal voxel world ordering');

const liquidSortBuilder = fs.readFileSync(path.join(root, 'src/application/render/static-world-renderable-builder.js'), 'utf8');
assert(liquidSortBuilder.includes('computeLiquidRenderableSortMeta'), 'liquid packets should compute order through normal voxel sorting');
assert(liquidSortBuilder.includes('domainCore.computeVoxelRenderableSort'), 'liquid packets should reuse domainCore.computeVoxelRenderableSort');
assert(liquidSortBuilder.includes('liquid-render-v16-liquid-not-solid-occluder'), 'liquid render path should identify per-packet transparent liquid ordering');

const pixiConsumer = fs.readFileSync(path.join(root, 'src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js'), 'utf8');
assert(pixiConsumer.includes('isLiquidStaticWorldPacket'), 'Pixi static packet consumer should classify liquid packets');
assert(pixiConsumer.includes('Chunk render textures flatten all packets'), 'liquid packets should be excluded from chunk render textures');
assert(pixiConsumer.includes('isLiquidStaticWorldPacket(packet) || isPlayerSensitiveDemergedPacket(packet)'), 'liquid packets should use per-packet path instead of chunk sprites');

const staticBuilderVisibility = fs.readFileSync(path.join(root, 'src/application/render/static-world-renderable-builder.js'), 'utf8');
assert(staticBuilderVisibility.includes('buildVisibilityOccupancyWithoutLiquids'), 'static builder should build visibility-only occupancy without liquid occluders');
assert(staticBuilderVisibility.includes('visibilityCore.buildStructuredVoxelOccupancy'), 'static builder should use render-visibility-core occupancy to exclude liquids');
assert(staticBuilderVisibility.includes('liquid-render-v16-liquid-not-solid-occluder'), 'liquid render path should identify non-occluding liquid visibility fix');
