const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/core/domain/render-visibility-core.js'), 'utf8');
const sandbox = { window: {}, Math, Number, String, Object, Array, Set, Map, Date, JSON, console };
vm.runInNewContext(source, sandbox, { filename: 'render-visibility-core.js' });
const api = sandbox.window.__RENDER_VISIBILITY_CORE__;
assert(api, 'render visibility core should expose API');

function facesById(surface) {
  const out = {};
  for (const entry of surface.surfaceCells) out[entry.box.id] = entry.visibleFaces.slice().sort();
  return out;
}

let surface = api.buildVisibleSurfaceCache([
  { id: 'a', instanceId: 'same', prefabId: 'cube_1x1', x: 0, y: 0, z: 0 },
  { id: 'b', instanceId: 'same', prefabId: 'cube_1x1', x: 1, y: 0, z: 0 }
], { surfaceOnlyRenderingEnabled: true });
let faces = facesById(surface);
assert(!faces.a.includes('east'), 'same-instance voxel neighbor should cull internal east face');
assert(!faces.b.includes('west'), 'same-instance voxel neighbor should cull internal west face');

surface = api.buildVisibleSurfaceCache([
  { id: 'a', instanceId: 'a', prefabId: 'cube_1x1', x: 0, y: 0, z: 0 },
  { id: 'b', instanceId: 'b', prefabId: 'cube_1x1', x: 1, y: 0, z: 0 }
], { surfaceOnlyRenderingEnabled: true });
faces = facesById(surface);
assert(faces.a.includes('east'), 'different object instances must not erase each other\'s side faces');
assert(faces.b.includes('west'), 'different object instances must not erase each other\'s side faces');

surface = api.buildVisibleSurfaceCache([
  { id: 'cube', instanceId: 'cubeA', prefabId: 'cube_1x1', x: 0, y: 0, z: 0 },
  { id: 'slope', instanceId: 'slopeA', prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east', x: 1, y: 0, z: 0 }
], { surfaceOnlyRenderingEnabled: true });
faces = facesById(surface);
assert(faces.cube.includes('east'), 'slope should not behave as a full cube occluder for adjacent cube faces');

surface = api.buildVisibleSurfaceCache([
  { id: 'cube', instanceId: 'cubeA', prefabId: 'cube_1x1', x: 0, y: 0, z: 0 },
  { id: 'terrain', generatedBy: 'terrain-generator', x: 1, y: 0, z: 0 }
], { surfaceOnlyRenderingEnabled: true });
faces = facesById(surface);
assert(!faces.cube.includes('east'), 'generated terrain should still occlude an embedded object side');

surface = api.buildVisibleSurfaceCache([
  { id: 'a', instanceId: 'same', prefabId: 'cube_1x1', slopeDirection: 'east', x: 0, y: 0, z: 0 },
  { id: 'b', instanceId: 'same', prefabId: 'cube_1x1', x: 1, y: 0, z: 0 }
], { surfaceOnlyRenderingEnabled: true });
faces = facesById(surface);
assert(!faces.a.includes('east'), 'stale slopeDirection alone must not classify a normal cube as a slope/non-occluder');


// Liquid occupancy regression: render-visible cube faces must not be hidden by
// adjacent liquid cells, because liquid is visual material, not a solid occluder.
const liquidOcc = api.buildStructuredVoxelOccupancy([
  { x: 0, y: 0, z: 0, w: 1, d: 1, h: 1, prefabId: 'cube_1x1' },
  { x: 1, y: 0, z: 0, w: 1, d: 1, h: 1, shapeKind: 'liquid_water', liquidType: 'water', prefabId: 'liquid_water_100' }
]);
const cubeFacesNextToLiquid = api.getVisibleFacesForVoxelCell({ x: 0, y: 0, z: 0, prefabId: 'cube_1x1' }, liquidOcc);
assert(cubeFacesNextToLiquid.includes('east'), 'cube side face adjacent to liquid should remain visible');

console.log('render-visibility-core.test.js PASS');
