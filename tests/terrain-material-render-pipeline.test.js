const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const controllers = fs.readFileSync(path.join(__dirname, '..', 'src/application/controllers/app-controllers.js'), 'utf8');
const placement = fs.readFileSync(path.join(__dirname, '..', 'src/application/placement/placement.js'), 'utf8');
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');

assert(controllers.includes('terrainMaterialId'), 'terrain generator path should propagate terrainMaterialId');
assert(controllers.includes('materialMap: terrainMaterialMap'), 'terrain runtime model should carry materialMap');
assert(renderSource.includes('getTerrainMaterialCoreApi'), 'render path should resolve terrain material core');
assert(renderSource.includes('terrainPatternDescriptor'), 'render path should attach terrain pattern descriptors');
assert(renderSource.includes('applyTerrainMaterialPatternOverlay'), 'render path should apply terrain material pattern overlays');
assert(placement.includes('demo-terrain-materials'), 'default placement path should include small terrain material demo patch');
console.log('terrain-material-render-pipeline.test.js: OK');
