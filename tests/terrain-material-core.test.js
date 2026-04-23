const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const coreSource = fs.readFileSync(path.join(__dirname, '..', 'src/core/domain/terrain-material-core.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(coreSource, sandbox, { filename: 'terrain-material-core.js' });
const api = sandbox.window.__TERRAIN_MATERIAL_CORE__;
assert(indexSource.includes('src/core/domain/terrain-material-core.js'), 'main entry should load terrain material core');
assert(api && typeof api.getTerrainMaterialDefinition === 'function', 'terrain material core should expose getTerrainMaterialDefinition');
assert(api && typeof api.buildTerrainMaterialMap === 'function', 'terrain material core should expose buildTerrainMaterialMap');
const grass = api.getTerrainMaterialDefinition('grass');
assert(grass && grass.id === 'grass', 'grass definition should resolve');
assert(grass.colors && grass.colors.top, 'grass definition should carry colors');
const map = api.buildTerrainMaterialMap(Array.from({ length: 9 }, () => Array(4).fill(3)), { waterLevel: 0, minHeight: 0, maxHeight: 8 });
assert(Array.isArray(map) && Array.isArray(map[0]), 'material map should be grid-shaped');
assert(map[0][0] === 'sand', 'left zone should default to sand');
assert(map[4][0] === 'grass', 'middle zone should default to grass');
assert(map[8][0] === 'rock', 'right zone should default to rock');
console.log('terrain-material-core.test.js: OK');
