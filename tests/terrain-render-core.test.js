const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function clean(value) {
  return JSON.parse(JSON.stringify(value));
}

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const isometricFaceSource = fs.readFileSync(path.join(root, 'src/core/domain/isometric-face-core.js'), 'utf8');
const terrainRenderSource = fs.readFileSync(path.join(root, 'src/core/domain/terrain-render-core.js'), 'utf8');
const renderSource = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');
const bindingsSource = fs.readFileSync(path.join(root, 'src/infrastructure/bootstrap/core-domain-bindings.js'), 'utf8');

const sandbox = { window: {}, Math, Number, String, Object, Array, JSON, console };
vm.runInNewContext(isometricFaceSource, sandbox, { filename: 'isometric-face-core.js' });
vm.runInNewContext(terrainRenderSource, sandbox, { filename: 'terrain-render-core.js' });

const api = sandbox.window.__TERRAIN_RENDER_CORE__;
assert(api, 'terrain render core should expose window.__TERRAIN_RENDER_CORE__');
assert.strictEqual(sandbox.window.__APP_CORE_TERRAIN_RENDER_CORE__, api, 'terrain render core should expose app bootstrap handle');
assert.strictEqual(typeof api.getTerrainFaceMergeSignature, 'function', 'getTerrainFaceMergeSignature should be a core function');
assert.strictEqual(typeof api.getTerrainSideStepBreakSignature, 'function', 'getTerrainSideStepBreakSignature should be a core function');
assert.strictEqual(typeof api.buildTerrainTopBoundarySegmentsWorldFromDescriptor, 'function', 'buildTerrainTopBoundarySegmentsWorldFromDescriptor should be a core function');
assert.strictEqual(typeof api.buildMergedVoxelFaceWorldGeometry, 'function', 'buildMergedVoxelFaceWorldGeometry should be a core function');

assert(indexSource.includes('src/core/domain/terrain-render-core.js'), 'index should load terrain render core');
assert(indexSource.indexOf('src/core/domain/terrain-face-merge-core.js') < indexSource.indexOf('src/core/domain/terrain-render-core.js'), 'terrain face merge core should load before terrain render core');
assert(indexSource.indexOf('src/core/domain/terrain-render-core.js') < indexSource.indexOf('src/presentation/render/render.js'), 'terrain render core must load before render.js');
assert(bindingsSource.includes('domain.terrainRenderCore'), 'bootstrap should bind terrain render core into App.domain');
assert(renderSource.includes('requireTerrainRenderCoreForRender'), 'render.js should delegate terrain render rules through a thin wrapper');
assert(!renderSource.includes("'terrain-face',\n    String(semanticFace || 'top')"), 'render.js should not re-own terrain face merge signature body');
assert(!renderSource.includes("if (semanticFace === 'east') return { x: x, y: y + dir, z: z };"), 'render.js should not re-own terrain side tangent rules');
assert(!renderSource.includes('function hasSameHeightTopSurface(nx, ny, plane)'), 'render.js should not re-own terrain boundary segment body');
assert(!renderSource.includes("if (face === 'top') return { x: uu, y: vv, z: p };"), 'render.js should not re-own merge-UV world point conversion');

const terrainCell = {
  generatedBy: 'terrain-generator',
  terrainMaterialMergeKey: 'terrain:sand',
  semanticTextureMap: { top: 'grass' },
  semanticFaceColors: { top: '#fff' }
};
assert.strictEqual(api.getTerrainMaterialMergeKeyForRenderCell(terrainCell), 'terrain:sand', 'explicit terrain material merge key should be preserved');
assert.strictEqual(api.getTerrainMaterialMergeKeyForRenderCell({ generatedBy: 'terrain-generator' }), '__terrain_default__', 'terrain cells without a merge key should use legacy default');
assert.strictEqual(api.getTerrainMaterialMergeKeyForRenderCell({ generatedBy: 'manual' }), null, 'non-terrain cells should not get terrain merge keys');
assert.strictEqual(api.getTerrainFaceMergeSignature(terrainCell, 'top', 'top', 1), 'terrain-face|top|top|1|terrain:sand|{"top":"grass"}||{"top":"#fff"}', 'terrain face merge signature should stay stable');
assert.strictEqual(api.getTerrainSortBandKeyForRenderFace({ generatedBy: 'terrain-generator' }, 'top', { u: 2, v: 3 }, { rotatedPoint: { y: 7 } }), 'ry:7', 'top terrain sort band should use rotated y');
assert.strictEqual(api.getTerrainSortBandKeyForRenderFace({ generatedBy: 'terrain-generator' }, 'east', { u: 4, v: 5 }, {}), 'east|u:4', 'side terrain sort band should use merge u');
assert.strictEqual(api.getTerrainSideEdgeVisibilitySignature(['top', 'east'], 'east'), 'east|east,top', 'side edge visibility signature should sort visible faces');

const occupied = new Set(['1,2,3', '1,1,2', '1,3,2']);
const reader = { has: (x, y, z) => occupied.has([x, y, z].join(',')) };
assert.strictEqual(api.occupancyReaderHasSolid(reader, 1, 2, 3), true, 'occupancy reader .has should be supported');
assert.deepStrictEqual(clean(api.getTerrainSideTangentNeighbor({ x: 1, y: 2, z: 3 }, 'east', 'neg')), { x: 1, y: 1, z: 3 }, 'east side tangent neighbor should step along y');
assert.deepStrictEqual(clean(api.getTerrainSideTangentNeighbor({ x: 1, y: 2, z: 3 }, 'south', 'pos')), { x: 2, y: 2, z: 3 }, 'south side tangent neighbor should step along x');
assert.strictEqual(api.getTerrainSideStepBreakSignature({ x: 1, y: 2, z: 2 }, 'east', reader), 'east|selfTop:0|neg:open|pos:open', 'terrain side step break signature should stay stable');

assert.deepStrictEqual(clean(api.worldPointFromMergeUV('east', 3, 4, 5)), { x: 3, y: 4, z: 5 }, 'east merge UV point should stay stable');
assert.strictEqual(api.buildTerrainPolygonLoopSignature({ polygonLoopsUV: [[{ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 1 }]] }), '0,0;1,0;1,1', 'terrain polygon loop signature should stay stable');

const faceDescriptor = {
  isTerrainFaceMergeCandidate: true,
  semanticFace: 'top',
  members: [
    { cell: { generatedBy: 'terrain-generator', x: 0, y: 0, z: 0 } },
    { cell: { generatedBy: 'terrain-generator', x: 1, y: 0, z: 0 } }
  ]
};
const topReader = { has: (x, y, z) => z === 0 && ((x === 0 && y === 0) || (x === 1 && y === 0)) };
const segments = api.buildTerrainTopBoundarySegmentsWorldFromDescriptor(faceDescriptor, topReader);
assert(segments.length >= 4, 'terrain top boundary should generate outline segments for exposed edges');

assert.deepStrictEqual(clean(api.buildMergedVoxelFaceWorldPolygon({ semanticFace: 'top', mergePlane: 2, mergeU: 3, mergeV: 4, mergeWidth: 2, mergeHeight: 1 })), [
  { x: 3, y: 4, z: 2 },
  { x: 5, y: 4, z: 2 },
  { x: 5, y: 5, z: 2 },
  { x: 3, y: 5, z: 2 }
], 'merged top terrain face polygon should stay stable');

const loopGeometry = api.buildMergedVoxelFaceWorldGeometry({
  semanticFace: 'top',
  mergePlane: 6,
  polygonLoopsUV: [[{ u: 0, v: 0 }, { u: 2, v: 0 }, { u: 2, v: 1 }, { u: 0, v: 1 }]]
});
assert.strictEqual(loopGeometry.worldLoops.length, 1, 'polygon-loop terrain geometry should preserve world loops');
assert.strictEqual(loopGeometry.worldOutlineSegments.length, 4, 'polygon-loop terrain geometry should expose outline segments');

console.log('terrain-render-core.test.js: OK');
