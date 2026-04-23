const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const source = fs.readFileSync(path.join(__dirname, '..', 'src/core/state/prefab-registry.js'), 'utf8');
assert(source.includes('function normalizeRenderUpdateMode('), 'prefab registry should normalize render update mode');
assert(source.includes('function getPrefabRenderUpdateMode('), 'prefab registry should expose render update mode resolver');
assert(source.includes("renderUpdateMode: renderUpdateMode"), 'normalizePrefab should persist renderUpdateMode');
assert(source.includes("id: 'debug_cube_5faces'") && source.includes("renderUpdateMode: 'dynamic'"), 'debug cube prefab should be marked dynamic');
assert(source.includes("id: 'debug_rect_2x1_5faces'") && source.includes("renderUpdateMode: 'dynamic'"), 'debug rect prefab should be marked dynamic');
assert(source.includes("id: 'cube_1x1'") && source.includes("renderUpdateMode: 'static'"), 'cube prefab should be marked static');
assert(source.includes('getPrefabRenderUpdateMode: getPrefabRenderUpdateMode'), 'prefab registry API should export render update mode resolver');
console.log('render-update-mode-prefab-registry.test.js: OK');
