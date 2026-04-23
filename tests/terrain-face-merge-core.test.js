const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('src/core/domain/terrain-face-merge-core.js', 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const api = sandbox.window.__TERRAIN_FACE_MERGE_CORE__;
assert(api && typeof api.mergeTerrainFaceDescriptors === 'function', 'terrain face merge core should expose mergeTerrainFaceDescriptors');

const topBase = { isTerrainFaceMergeCandidate: true, terrainMaterialMergeKey: '__terrain_default__', terrainMergeSignature: 'terrain-face|top|top|0|__terrain_default__|', semanticFace: 'top', screenFace: 'top', mergePlane: 1, sortKey: 1, tie: 1, terrainSortBandKey: 'ry:0', cell: { x: 0, y: 0, z: 0 } };
const safeRun = api.mergeTerrainFaceDescriptors([
  Object.assign({}, topBase, { mergeU: 0, mergeV: 0 }),
  Object.assign({}, topBase, { mergeU: 1, mergeV: 0, sortKey: 2, tie: 2, cell: { x: 1, y: 0, z: 0 } })
], { enabled: true });
assert.strictEqual(safeRun.outputCount, 1, 'same safe sort band terrain top run should merge into one strip descriptor');
assert.strictEqual(safeRun.descriptors[0].mergeWidth, 2, 'merged strip should span two cells horizontally');
assert.strictEqual(safeRun.descriptors[0].mergeHeight, 1, 'merged strip should remain one cell tall');

const mixedBand = api.mergeTerrainFaceDescriptors([
  Object.assign({}, topBase, { mergeU: 0, mergeV: 0, terrainSortBandKey: 'ry:0' }),
  Object.assign({}, topBase, { mergeU: 1, mergeV: 0, terrainSortBandKey: 'ry:1', cell: { x: 1, y: 0, z: 0 } })
], { enabled: true });
assert.strictEqual(mixedBand.outputCount, 2, 'different safe sort bands should not merge');

const res2 = api.mergeTerrainFaceDescriptors([
  Object.assign({}, topBase, { mergeU: 0, mergeV: 0 }),
  Object.assign({}, topBase, { mergeU: 1, mergeV: 0, terrainMaterialMergeKey: 'sand', terrainMergeSignature: 'terrain-face|top|top|0|sand|', cell: { x: 1, y: 0, z: 0 } })
], { enabled: true });
assert.strictEqual(res2.outputCount, 2, 'terrain faces with different material merge keys should not merge');

const sideBase = { isTerrainFaceMergeCandidate: true, terrainMaterialMergeKey: '__terrain_default__', terrainMergeSignature: 'terrain-face|east|east|0|__terrain_default__|', semanticFace: 'east', screenFace: 'east', mergePlane: 1, sortKey: 1, tie: 1, terrainSortBandKey: 'east|u:0', edgeVisibilitySignature: 'east|east,top', cell: { x: 0, y: 0, z: 0 } };
const sideMerged = api.mergeTerrainFaceDescriptors([
  Object.assign({}, sideBase, { mergeU: 0, mergeV: 0 }),
  Object.assign({}, sideBase, { mergeU: 0, mergeV: 1, cell: { x: 0, y: 0, z: 1 } }),
  Object.assign({}, sideBase, { mergeU: 0, mergeV: 2, cell: { x: 0, y: 0, z: 2 } })
], { enabled: true });
assert.strictEqual(sideMerged.outputCount, 1, 'same-column east side faces should merge into one vertical strip');
assert.strictEqual(sideMerged.descriptors[0].mergeWidth, 1);
assert.strictEqual(sideMerged.descriptors[0].mergeHeight, 3);

const sideDifferentEdge = api.mergeTerrainFaceDescriptors([
  Object.assign({}, sideBase, { mergeU: 0, mergeV: 0, edgeVisibilitySignature: 'east|east,top' }),
  Object.assign({}, sideBase, { mergeU: 0, mergeV: 1, edgeVisibilitySignature: 'east|east', cell: { x: 0, y: 0, z: 1 } })
], { enabled: true });
assert.strictEqual(sideDifferentEdge.outputCount, 2, 'different edge visibility signatures should not merge side strips');

const sideWest = api.mergeTerrainFaceDescriptors([
  Object.assign({}, sideBase, { semanticFace: 'west', screenFace: 'west', mergeU: 0, mergeV: 0 }),
  Object.assign({}, sideBase, { semanticFace: 'west', screenFace: 'west', mergeU: 0, mergeV: 1, cell: { x: 0, y: 0, z: 1 } })
], { enabled: true });
assert.strictEqual(sideWest.outputCount, 2, 'west side faces should remain passthrough in first side-strip merge version');
console.log('terrain-face-merge-core.test.js: OK');
