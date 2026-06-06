const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/core/domain/terrain-height-surface-render-core.js'), 'utf8');
const sandbox = { window: {}, Math, Number, String, Object, Array, Map, console };
vm.runInNewContext(source, sandbox, { filename: 'terrain-height-surface-render-core.js' });
const api = sandbox.window.__TERRAIN_HEIGHT_SURFACE_RENDER_CORE__;
assert(api, 'terrain height surface render core should expose API');
assert.strictEqual(api.phase, 'TERRAIN-HEIGHT-SURFACE-RENDER-V0', 'phase should identify V0 renderer');

const a = { x: 0, y: 0, z: 0, w: 1, d: 1, h: 1.0, shapeKind: 'terrain_height_surface', terrainHeight: 1.0, prefabId: 'terrain_height_100' };
const b = { x: 1, y: 0, z: 0, w: 1, d: 1, h: 0.8, shapeKind: 'terrain_height_surface', terrainHeight: 0.8, prefabId: 'terrain_height_075' };
const connectedFaces = api.buildTerrainHeightSurfaceFaces([a], [a, b], { connectThreshold: 0.35, surfaceSubdivisions: 4, topLinesEnabled: false });
const connectedTop = connectedFaces.filter(f => f.terrainHeightSurfaceFaceKind === 'top-subface');
assert.strictEqual(connectedTop.length, 16, '4x4 top subdivision should create 16 top subfaces');
assert(!connectedFaces.some(f => f.semanticFace === 'east' && f.terrainHeightSurfaceFaceKind === 'cliff-side'), 'east side should not be a cliff when height diff is below threshold');
assert(connectedTop.every(f => f.stroke === '' && Number(f.width || 0) === 0), 'top subdivision lines should be hidden when disabled');

const cliffFaces = api.buildTerrainHeightSurfaceFaces([a], [a, b], { connectThreshold: 0.05, surfaceSubdivisions: 4, topLinesEnabled: true });
assert(cliffFaces.some(f => f.semanticFace === 'east' && f.terrainHeightSurfaceFaceKind === 'cliff-side'), 'east side should become cliff when height diff exceeds threshold');
assert(cliffFaces.filter(f => f.terrainHeightSurfaceFaceKind === 'top-subface').every(f => !!f.stroke && Number(f.width || 0) > 0), 'top lines should be visible when enabled');

console.log('terrain-height-surface-render-core.test.js PASS');
