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

const sideStepBreak = api.mergeTerrainFaceDescriptors([
  Object.assign({}, sideBase, { mergeU: 0, mergeV: 0, sideStepBreakSignature: 'east|selfTop:1|neg:void|pos:open' }),
  Object.assign({}, sideBase, { mergeU: 0, mergeV: 1, sideStepBreakSignature: 'east|selfTop:1|neg:void|pos:closed', cell: { x: 0, y: 0, z: 1 } })
]);
assert.strictEqual(sideStepBreak.outputCount, 2, 'different side step break signatures should proactively split side strips');
assert(sideStepBreak.sideStepBreakCount >= 1, 'side step break count should be tracked when side strips are proactively split');

const topBarrierSortKeyOnly = api.mergeTerrainFaceDescriptors([
  Object.assign({}, topBase, { id: 'top-barrier-0', mergeU: 0, mergeV: 0, sortKey: 10, tie: 1, cell: { x: 0, y: 0, z: 0 } }),
  Object.assign({}, topBase, { id: 'top-barrier-1', mergeU: 1, mergeV: 0, sortKey: 20, tie: 2, cell: { x: 1, y: 0, z: 0 } }),
  Object.assign({}, topBase, { id: 'top-barrier-2', mergeU: 2, mergeV: 0, sortKey: 30, tie: 3, cell: { x: 2, y: 0, z: 0 } }),
  {
    isTerrainFaceMergeCandidate: true,
    terrainMaterialMergeKey: '__terrain_default__',
    terrainMergeSignature: 'terrain-face|west|west|0|__terrain_default__|',
    semanticFace: 'west',
    screenFace: 'west',
    mergePlane: 1,
    sortKey: 20,
    tie: 50000,
    terrainSortBandKey: 'west|u:0',
    edgeVisibilitySignature: 'west|west,top',
    cell: { x: 1, y: 0, z: 0 },
    mergeU: 0,
    mergeV: 0
  }
], { enabled: true });
assert(topBarrierSortKeyOnly.terrainTopBarrierCorrectedAcceptedCount >= 1, 'frozen corrected interval-plane sortKey-only diagnostic should still detect candidate blockers');
assert.strictEqual(topBarrierSortKeyOnly.terrainTopBarrierCorrectedSplitCount, 0, '07.16A must not actively split top strips with side-face sortKey barriers');
assert(topBarrierSortKeyOnly.terrainTopBarrierCorrectedCutPointCount >= 1, '07.16A should keep diagnostic cut-point counts for comparison');
assert(topBarrierSortKeyOnly.terrainTopBarrierDiagnosticsOnlySuppressedSplitCount >= 1, '07.16A should suppress corrected barrier cuts instead of applying them');
assert.strictEqual(topBarrierSortKeyOnly.mergeStrategy, 'top-step-boundary-merge-key-active+barrier-frozen-diagnostics-only', '07.16C merge strategy should advertise active top boundary key plus frozen barrier diagnostics');


const topBoundaryMixed = api.mergeTerrainFaceDescriptors([
  Object.assign({}, topBase, { id: 'top-boundary-0', mergeU: 0, mergeV: 0, topStepBoundarySignature: 'top-step-boundary|N:same-height|E:higher-neighbor|S:same-height|W:empty' }),
  Object.assign({}, topBase, { id: 'top-boundary-1', mergeU: 1, mergeV: 0, sortKey: 2, tie: 2, cell: { x: 1, y: 0, z: 0 }, topStepBoundarySignature: 'top-step-boundary|N:same-height|E:same-height|S:same-height|W:same-height' })
], { enabled: true });
assert.strictEqual(topBoundaryMixed.outputCount, 2, '07.16C top boundary signature is active in the top merge key and must split mixed-signature top runs');
assert(topBoundaryMixed.terrainTopStepBoundaryDescriptorCount >= 2, 'top step-boundary diagnostics should count top descriptors');
assert.strictEqual(topBoundaryMixed.terrainTopStepBoundaryMixedStripCount, 0, '07.16C should prevent mixed-signature top strips from forming');
assert.strictEqual(topBoundaryMixed.terrainTopStepBoundaryWouldBreakCount, 0, '07.16C should not need diagnostic breaks after active merge-key splitting');
assert.strictEqual(topBoundaryMixed.terrainTopStepBoundaryMergeKeyEnabled, true, '07.16C should expose active top boundary merge key status');
