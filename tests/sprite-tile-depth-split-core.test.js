const fs = require('fs');
const path = require('path');
const vm = require('vm');

function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const context = { console, Math, Number, String, Object, Array, JSON };
vm.createContext(context);
runFile(context, 'src/core/domain/scene-domain-core.js');
const api = context.__APP_CORE_SCENE_DOMAIN_CORE__;

const twoCell = api.buildTileAlignedSpriteRenderParts({
  cells: [
    { x: 4, y: 7, z: 0, h: 1 },
    { x: 5, y: 7, z: 0, h: 1 }
  ],
  maxParts: 4,
  viewRotation: 0
});
assert(twoCell.split === true, '2x1 footprint should split into render parts');
assert(twoCell.parts.length === 2, '2x1 footprint should emit exactly two parts');
assert(twoCell.parts[0].sourceCount === 2 && twoCell.parts[1].sourceCount === 2, 'parts should share source count');
assert(twoCell.parts[0].cell.x !== twoCell.parts[1].cell.x || twoCell.parts[0].cell.y !== twoCell.parts[1].cell.y, 'each part should keep its own sort cell');

const single = api.buildTileAlignedSpriteRenderParts({ cells: [{ x: 1, y: 1, z: 0, h: 1 }], maxParts: 4 });
assert(single.split === false && single.reason === 'single-footprint-cell', 'single-cell sprites should not split');

const tooMany = api.buildTileAlignedSpriteRenderParts({
  cells: [
    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 },
    { x: 3, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }
  ],
  maxParts: 4
});
assert(tooMany.split === false && tooMany.reason === 'too-many-footprint-cells', 'large sprites should keep the old single-sprite path by default');

console.log('sprite-tile-depth-split-core.test.js: OK');
