const fs = require('fs');
const path = require('path');
const vm = require('vm');

function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const context = { window: { __APP_NAMESPACE: { bind() {} } }, console, Math, Number, String, Object, Array, JSON };
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
const api = context.window.__ITEM_FACING_CORE__;

assert(api.normalizeFacing(-1) === 3, 'normalizeFacing should wrap negative values');
assert(api.rotateFacing(0, 1) === 1, 'rotateFacing should rotate clockwise');
assert(api.rotateFacing(0, -1) === 3, 'rotateFacing should rotate counter-clockwise');
assert(api.getFacingLabel(0) === 'N' && api.getFacingLabel(3) === 'W', 'facing labels should be stable');

const prefab = {
  w: 2,
  d: 3,
  h: 2,
  anchor: { x: 1, y: 0, z: 0 },
  voxels: [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 2, z: 1 }
  ],
  spriteDirections: { '0': { image: 'a' }, '1': { image: 'b' } }
};

const dims1 = api.getRotatedFootprint(prefab, 1);
assert(dims1.w === 3 && dims1.d === 2, 'odd facings should swap footprint');
const anchor1 = api.getRotatedAnchor(prefab, 1);
assert(anchor1.x === 0 && anchor1.y === 0, 'rotated anchor should map into rotated footprint');
const spriteStrategy = api.detectSpriteStrategy(prefab);
assert(spriteStrategy.strategy === 'two-mirror', 'two sprite directions should resolve to two-mirror strategy');
const facing2 = api.resolveSpriteFacing(prefab, 2);
assert(facing2.mirrorX === true, 'facing 2 should mirror in two-mirror strategy');
const proto = api.buildFacingPrototype(prefab, 3, { x: 4, y: 6, z: 1 });
assert(proto.sortBase.sortKey > 0, 'prototype should include sort base mapping');
assert(proto.semanticColors.front && proto.semanticDirections.front, 'prototype should include semantic face colors and directions');

assert(api.rotateCardinalDirection('east', 0) === 'east', 'slope direction should stay east at facing 0');
assert(api.rotateCardinalDirection('east', 1) === 'north', 'slope direction should rotate with voxel transform at facing 1');
assert(api.rotateCardinalDirection('east', 2) === 'west', 'slope direction should rotate with voxel transform at facing 2');
assert(api.rotateCardinalDirection('east', 3) === 'south', 'slope direction should rotate with voxel transform at facing 3');
const slopeVoxels = api.rotateVoxelList({ w: 1, d: 1, h: 1, voxels: [{ x: 0, y: 0, z: 0, shapeKind: 'slope_1x1', slopeDirection: 'east' }] }, 1);
assert(slopeVoxels[0].shapeKind === 'slope_1x1', 'rotated slope voxel should keep shape kind');
assert(slopeVoxels[0].slopeDirection === 'north', 'rotated slope voxel should carry rotated slope direction');



const singlePlan = api.buildHabboFacingPlan([2]);
assert(singlePlan.strategy === 'single-mirror', 'one Habbo source direction should use single-mirror');
assert(singlePlan.directionMap.map(entry => entry.mirrorX).join(',') === 'false,true,false,true', 'single-mirror should alternate original and horizontal mirror');
const twoPlan = api.buildHabboFacingPlan([0, 2]);
assert(twoPlan.strategy === 'two-mirror', 'two Habbo source directions should use two-mirror');
assert(twoPlan.selectedSourceDirections.join(',') === '0,2', 'two direction plan should preserve the orthogonal native pair');
const fourPlan = api.buildHabboFacingPlan([0, 1, 2, 3, 4, 5, 6, 7]);
assert(fourPlan.strategy === 'four-native', 'four or more Habbo source directions should use four native views');
assert(fourPlan.selectedSourceDirections.join(',') === '0,2,4,6', 'eight-direction Habbo assets should select the four cardinal views');

const singleHabboPrefab = {
  id: 'single_habbo', kind: 'habbo_import', w: 1, d: 2, h: 1,
  habboLayerDirections: { '0': [{ name: 'single' }] },
  habboMeta: {
    generatedFacingStrategy: singlePlan.strategy,
    sourceDirectionCount: singlePlan.sourceDirectionCount,
    sourceVisualDirections: singlePlan.sourceDirections,
    directionMap: singlePlan.directionMap
  }
};
const singleMatrix = api.buildSpriteFacingMatrix(singleHabboPrefab);
assert(singleMatrix.map(entry => entry.directionKey).join(',') === '0,0,0,0', 'single Habbo view should always reuse the only native direction key');
assert(singleMatrix.map(entry => entry.mirrorX).join(',') === 'false,true,false,true', 'single Habbo view should mirror odd rotations');
assert(api.getRotatedFootprint(singleHabboPrefab, 0).w === 1 && api.getRotatedFootprint(singleHabboPrefab, 0).d === 2, 'single Habbo footprint should keep 1x2 at rotation 0');
assert(api.getRotatedFootprint(singleHabboPrefab, 1).w === 2 && api.getRotatedFootprint(singleHabboPrefab, 1).d === 1, 'single Habbo footprint should become 2x1 at rotation 1');

const fourHabboPrefab = {
  id: 'four_habbo', kind: 'habbo_import', w: 1, d: 2, h: 1,
  habboLayerDirections: { '0': [{}], '1': [{}], '2': [{}], '3': [{}] },
  habboMeta: {
    generatedFacingStrategy: fourPlan.strategy,
    sourceDirectionCount: fourPlan.sourceDirectionCount,
    sourceVisualDirections: fourPlan.sourceDirections,
    directionMap: fourPlan.directionMap
  }
};
const fourMatrix = api.buildSpriteFacingMatrix(fourHabboPrefab);
assert(fourMatrix.map(entry => entry.directionKey).join(',') === '0,1,2,3', 'four-native should use a different native direction for every rotation');
assert(fourMatrix.every(entry => entry.mirrorX === false), 'four-native should not add generated mirrors');

console.log('item-facing-core.test.js: OK');
