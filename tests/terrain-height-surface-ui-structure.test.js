const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.includes('地形高度曲面 / Height Surface V0'), 'terrain page should expose Height Surface V0 panel');
assert(html.includes('id="terrainHeightSurfaceConnectThreshold"'), 'terrain height surface should expose connect threshold control');
assert(html.includes('id="terrainHeightSurfacePrefabSelect"'), 'terrain height surface should expose prefab select');
assert(html.includes('src/core/domain/terrain-height-surface-config-core.js'), 'config core should be loaded');
assert(html.includes('src/core/domain/terrain-height-surface-render-core.js'), 'render core should be loaded');
assert(html.includes('src/presentation/ui/ui-terrain-height-surface-panel.js'), 'UI panel should be loaded');

const dom = fs.readFileSync(path.join(root, 'src/presentation/shell/dom-registry.js'), 'utf8');
assert(dom.includes('terrainHeightSurfaceConnectThreshold:'), 'dom registry should expose threshold input');
assert(dom.includes('terrainHeightSurfacePrefabSelect:'), 'dom registry should expose height surface prefab select');

const prefab = fs.readFileSync(path.join(root, 'src/core/state/prefab-registry.js'), 'utf8');
assert(prefab.includes('ensureTerrainHeightSurfaceLayerPrefabs'), 'prefab registry should generate terrain height surface prefabs');
assert(prefab.includes('terrain_height_025'), 'built-in 25% terrain height prefab should exist');
assert(prefab.includes("shapeKind: 'terrain_height_surface'"), 'terrain height prefabs should mark shapeKind');

const builder = fs.readFileSync(path.join(root, 'src/application/render/static-world-renderable-builder.js'), 'utf8');
assert(builder.includes('buildTerrainHeightSurfacePacketsForChunk'), 'static builder should build terrain height surface packets');
assert(builder.includes('terrain-height-surface-render-v0'), 'terrain height surface packets should identify render path');
assert(builder.includes('isTerrainHeightSurfaceBox'), 'static builder should filter height surface boxes from normal cube rendering when enabled');

const panel = fs.readFileSync(path.join(root, 'src/presentation/ui/ui-terrain-height-surface-panel.js'), 'utf8');
assert(panel.includes('terrainHeightSurfaceConnectThreshold'), 'panel should bind threshold input');
assert(panel.includes('enterPlaceMode'), 'panel should provide placement entry');

console.log('terrain-height-surface-ui-structure.test.js PASS');
