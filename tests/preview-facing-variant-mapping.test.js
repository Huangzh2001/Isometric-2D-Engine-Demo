const fs = require('fs');
const path = require('path');
const vm = require('vm');
function runFile(context, relPath) { vm.runInContext(fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8'), context, { filename: relPath }); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const context = { window: { __APP_NAMESPACE: { bind() {} } }, console, Math, Number, String, Object, Array, JSON };
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
const api = context.window.__ITEM_FACING_CORE__;
const rect = { id: 'debug_rect_2x1_5faces', w: 2, d: 1, h: 1, anchor: { x: 0, y: 0, z: 0 }, voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] };
const p0 = api.buildFacingPrototype(rect, 0, { x: 2, y: 3, z: 0 });
const p1 = api.buildFacingPrototype(rect, 1, { x: 2, y: 3, z: 0 });
const p2 = api.buildFacingPrototype(rect, 2, { x: 2, y: 3, z: 0 });
assert(p0.footprint.w === 2 && p0.footprint.d === 1, 'facing 0 keeps 2x1 footprint');
assert(p1.footprint.w === 1 && p1.footprint.d === 2, 'facing 1 swaps footprint to 1x2');
assert(p0.rotatedAnchor.x !== p2.rotatedAnchor.x || p0.rotatedAnchor.y !== p2.rotatedAnchor.y, 'anchor should update under 180 rotation');
assert(p0.sortBase && p1.sortBase && p0.sortBase.sortKey !== undefined && p1.sortBase.sortKey !== undefined, 'sortBase should be present for preview facing variants');
console.log('preview-facing-variant-mapping.test.js: OK');
