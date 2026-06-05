const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const context = { console, Math, Number, String, Object, Array, JSON };
vm.createContext(context);
const source = fs.readFileSync(path.join(__dirname, '..', 'src/core/domain/scene-domain-core.js'), 'utf8');
vm.runInContext(source, context, { filename: 'scene-domain-core.js' });
const api = context.__APP_CORE_SCENE_DOMAIN_CORE__;
assert(api && typeof api.projectWorldBoxes === 'function', 'scene-domain core should expose projectWorldBoxes');

const proto = {
  id: 'slope_1x1',
  name: 'Slope · 1×1',
  slopeDirection: 'east',
  voxels: [{ x: 0, y: 0, z: 0, shapeKind: 'slope_1x1', slopeDirection: 'north' }]
};
const boxes = api.projectWorldBoxes(proto, 4, 7, 2);
assert(boxes.length === 1, 'single-cell slope should project to one preview box');
assert(boxes[0].prefabId === 'slope_1x1', 'preview box should preserve prefab id');
assert(boxes[0].shapeKind === 'slope_1x1', 'preview box should preserve slope shape kind');
assert(boxes[0].slopeDirection === 'north', 'preview box should preserve rotated slope direction');
assert(boxes[0].x === 4 && boxes[0].y === 7 && boxes[0].z === 2, 'preview box should use target world origin');

console.log('scene-domain-slope-preview-metadata.test.js: OK');
