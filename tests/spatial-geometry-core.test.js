const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const coreSource = fs.readFileSync(path.join(__dirname, '..', 'src/core/domain/spatial-geometry-core.js'), 'utf8');
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');

const sandbox = { window: { EPS: 1e-5 }, Map, Math, Number, String, Array, Object };
vm.runInNewContext(coreSource, sandbox, { filename: 'spatial-geometry-core.js' });

const api = sandbox.window.IsometricSpatialGeometryCore;
assert(api, 'spatial geometry core should expose IsometricSpatialGeometryCore');
assert.strictEqual(typeof api.pointInPoly, 'function', 'pointInPoly should be a core function');
assert.strictEqual(typeof api.buildOccupancy, 'function', 'buildOccupancy should be a core function');
assert(indexSource.indexOf('src/core/domain/spatial-geometry-core.js') >= 0, 'index should load spatial geometry core');
assert(indexSource.indexOf('src/core/domain/spatial-geometry-core.js') < indexSource.indexOf('src/presentation/render/render.js'), 'spatial geometry core must load before render.js');
assert(!renderSource.includes('function pointInPoly('), 'render.js should not re-own pointInPoly');
assert(!renderSource.includes('function buildOccupancy('), 'render.js should not re-own buildOccupancy');

const square = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }];
assert(api.pointInPoly({ x: 2, y: 2 }, square), 'point inside square should be detected');
assert(!api.pointInPoly({ x: 5, y: 2 }, square), 'point outside square should be rejected');
const aabb = api.makeAABB(1, 2, 3, 4, 5, 6);
assert(aabb.minX === 1 && aabb.maxX === 5 && aabb.minY === 2 && aabb.maxY === 7 && aabb.minZ === 3 && aabb.maxZ === 9, 'makeAABB should preserve bounds');
assert(api.rectCircleCollide(1, 1, 1, 0, 0, 1, 1), 'rectCircleCollide should detect overlap');
assert(api.boxRectOverlap3D({ x: 0, y: 0, z: 0, w: 2, d: 2, h: 2 }, { x: 1, y: 1, z: 1, w: 1, d: 1, h: 1 }), 'boxRectOverlap3D should detect overlap');
const occ = api.buildOccupancy([{ id: 'a', x: 0, y: 0, z: 0, w: 2, d: 1, h: 1 }]);
assert.strictEqual(occ.size, 2, 'buildOccupancy should enumerate occupied cells');
assert(occ.has('0,0,0') && occ.has('1,0,0'), 'buildOccupancy should use x,y,z keys');

console.log('spatial-geometry-core.test.js: OK');
