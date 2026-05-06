const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function clean(value) {
  return JSON.parse(JSON.stringify(value));
}

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const itemFacingSource = fs.readFileSync(path.join(root, 'src/core/domain/item-facing-core.js'), 'utf8');
const coreSource = fs.readFileSync(path.join(root, 'src/core/domain/isometric-face-core.js'), 'utf8');
const renderSource = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');
const bindingsSource = fs.readFileSync(path.join(root, 'src/infrastructure/bootstrap/core-domain-bindings.js'), 'utf8');

const sandbox = { window: {}, Math, Number, String, Object, Array, parseInt, console };
vm.runInNewContext(itemFacingSource, sandbox, { filename: 'item-facing-core.js' });
vm.runInNewContext(coreSource, sandbox, { filename: 'isometric-face-core.js' });

const api = sandbox.window.__ISOMETRIC_FACE_CORE__;
assert(api, 'isometric face core should expose window.__ISOMETRIC_FACE_CORE__');
assert.strictEqual(sandbox.window.__APP_CORE_ISOMETRIC_FACE_CORE__, api, 'isometric face core should expose app bootstrap handle');
assert.strictEqual(typeof api.getScreenFaceForSemanticFace, 'function', 'getScreenFaceForSemanticFace should be a core function');
assert.strictEqual(typeof api.buildVoxelFaceWorldPolygon, 'function', 'buildVoxelFaceWorldPolygon should be a core function');
assert.strictEqual(typeof api.getSemanticFaceNeighborDelta, 'function', 'getSemanticFaceNeighborDelta should be a core function');
assert.strictEqual(typeof api.getStaticWorldFaceMergeSignature, 'function', 'getStaticWorldFaceMergeSignature should be a core function');

assert(indexSource.includes('src/core/domain/isometric-face-core.js'), 'index should load isometric face core');
assert(indexSource.indexOf('src/core/domain/item-facing-core.js') < indexSource.indexOf('src/core/domain/isometric-face-core.js'), 'item-facing core should load before isometric face core');
assert(indexSource.indexOf('src/core/domain/isometric-face-core.js') < indexSource.indexOf('src/presentation/render/render.js'), 'isometric face core must load before render.js');
assert(bindingsSource.includes('domain.isometricFaceCore'), 'bootstrap should bind isometric face core into App.domain');
assert(renderSource.includes('requireIsometricFaceCoreForRender'), 'render.js should delegate isometric face rules through a thin wrapper');
assert(!renderSource.includes('function getSemanticFaceGeometryHelpers'), 'render.js should not own semantic face helper lookup');
assert(!renderSource.includes('var cellX = Number(x || 0);'), 'render.js should not re-own voxel face polygon math');
assert(!renderSource.includes('var ownerKey = safeCell.instanceId'), 'render.js should not re-own static world face merge signature rules');
assert(!renderSource.includes("if (screenFace === 'top') return { x: 0, y: 0, z: 1 };"), 'render.js should not re-own semantic face normal rules');

assert.deepStrictEqual(clean(api.getVisibleSemanticMapping(0, 0).visibleFacesByScreenPosition), { top: 'top', lowerLeft: 'south', lowerRight: 'east' }, 'rotation 0 screen mapping should stay stable');
assert.strictEqual(api.getScreenFaceForSemanticFace('south', 0), 'lowerLeft', 'south should map to lowerLeft at view rotation 0');
assert.strictEqual(api.getScreenFaceForSemanticFace('east', 0), 'lowerRight', 'east should map to lowerRight at view rotation 0');
assert.strictEqual(api.getScreenFaceForSemanticFace('north', 2), 'lowerLeft', 'north should map to lowerLeft at view rotation 2');

const fc = { top: { r: 1 }, east: { r: 2 }, south: { r: 3 } };
assert.deepStrictEqual(clean(api.getBaseFaceFillRgbForSemanticFace(fc, 'west')), { r: 2 }, 'west uses east base color for legacy lighting parity');
assert.deepStrictEqual(clean(api.getBaseFaceFillRgbForSemanticFace(fc, 'north')), { r: 3 }, 'north uses south base color for legacy lighting parity');
assert.deepStrictEqual(clean(api.getStaticWorldFaceMergeCoords({ x: 2, y: 3, z: 4 }, 'south')), { plane: 4, u: 2, v: 4 }, 'south merge coords should stay stable');
assert.strictEqual(api.getStaticWorldFaceMergeSignature({ instanceId: 'i1', prefabId: 'cube_1x1', semanticTextureMap: { top: 'grass' } }, 'top', 'top', 0), 'instance:i1|cube_1x1||||||top|top|0|{\"top\":\"grass\"}||', 'static world face merge signature should stay stable');
assert.deepStrictEqual(clean(api.getSemanticFaceNeighborDelta('west')), { x: -1, y: 0, z: 0 }, 'west neighbor delta should stay stable');
assert.deepStrictEqual(clean(api.getSemanticFaceNormal('lowerRight')), { x: 1, y: 0, z: 0 }, 'lowerRight normal should stay stable');
assert.deepStrictEqual(clean(api.buildVoxelFaceWorldPolygon(1, 2, 3, 'top')), [
  { x: 1, y: 2, z: 4 },
  { x: 2, y: 2, z: 4 },
  { x: 2, y: 3, z: 4 },
  { x: 1, y: 3, z: 4 }
], 'top face polygon should stay stable');

console.log('isometric-face-core.test.js: OK');
