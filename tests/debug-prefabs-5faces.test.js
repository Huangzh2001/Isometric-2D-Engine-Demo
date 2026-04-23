const fs = require('fs');
const path = require('path');
const vm = require('vm');
function runFile(context, relPath) { vm.runInContext(fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8'), context, { filename: relPath }); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const context = { window: { __APP_NAMESPACE: { bind() {} } }, console, Math, Number, String, Object, Array, JSON, editor: { prototypeIndex: 0 }, ui: null };
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
runFile(context, 'src/core/state/prefab-registry.js');
const prefabs = context.prototypes || [];
const cube = prefabs.find(p => p.id === 'debug_cube_5faces');
const rect = prefabs.find(p => p.id === 'debug_rect_2x1_5faces');
assert(cube, 'debug_cube_5faces should exist');
assert(rect, 'debug_rect_2x1_5faces should exist');
for (const prefab of [cube, rect]) {
  assert(prefab.semanticFaceColors, prefab.id + ' should carry semantic face colors');
  for (const key of ['top','north','east','south','west']) assert(prefab.semanticFaceColors[key], prefab.id + ' missing color ' + key);
}
const api = context.window.__ITEM_FACING_CORE__;
const proto = api.buildFacingPrototype(rect, 1, null);
assert(proto.visibleSemanticFaces.length === 5, 'prototype should expose five visible semantic faces');
assert(proto.semanticColors.north && proto.semanticColors.east && proto.semanticColors.south && proto.semanticColors.west, 'semantic colors should use cardinal keys');
console.log('debug-prefabs-5faces.test.js: OK');
