const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function runFile(context, relPath) { vm.runInContext(fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8'), context, { filename: relPath }); }
const context = { window: { __APP_NAMESPACE: { bind() {} } }, console, Math, Number, String, Object, Array, JSON };
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
const api = context.window.__ITEM_FACING_CORE__;
assert(api && typeof api.buildDebugCuboidFaceRenderables === 'function', 'core should expose buildDebugCuboidFaceRenderables');
const prefab = { id: 'debug_rect_2x1_5faces', semanticFaceColors: { top: '#2F80ED', north: '#E74C3C', east: '#27AE60', south: '#F2C94C', west: '#9B51E0' } };
const result0 = api.buildDebugCuboidFaceRenderables({ prefab, itemFacing: 0, viewRotation: 0, ownerId: 'test', cells: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] });
assert(result0.faceRenderables.length > 0, 'debug rect should produce face renderables');
assert(result0.faceRenderables.every(f => f.semanticFace && f.color && Array.isArray(f.worldPts)), 'each renderable should carry semanticFace/color/worldPts');
assert(result0.faceDrawOrder.length === result0.faceRenderables.length, 'draw order should list all renderable faces');
const sem0 = new Set(result0.faceRenderables.map(f => f.semanticFace));
assert(sem0.has('top'), 'top face should be a real renderable');
assert(sem0.has('east') || sem0.has('south') || sem0.has('north') || sem0.has('west'), 'a side semantic face should be real renderable');
const result1 = api.buildDebugCuboidFaceRenderables({ prefab, itemFacing: 1, viewRotation: 0, ownerId: 'test', cells: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }] });
const sides0 = result0.faceRenderables.filter(f => f.screenFace !== 'top').map(f => f.semanticFace).join(',');
const sides1 = result1.faceRenderables.filter(f => f.screenFace !== 'top').map(f => f.semanticFace).join(',');
assert(sides0 !== sides1, 'visible side semantic faces should change when itemFacing changes');
console.log('debug-cuboid-face-renderables.test.js: OK');
