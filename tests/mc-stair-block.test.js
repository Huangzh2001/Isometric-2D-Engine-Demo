const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function approx(a, b, msg) { if (Math.abs(Number(a) - Number(b)) > 1e-9) throw new Error(msg + `: got ${a}, expected ${b}`); }

function polygonArea2d(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += Number(a.x || 0) * Number(b.y || 0) - Number(b.x || 0) * Number(a.y || 0);
  }
  return Math.abs(sum) * 0.5;
}
function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

const bound = {};
const context = {
  window: {
    __APP_NAMESPACE: {
      bind(name, api) { bound[name] = api; }
    }
  },
  console, Math, Number, String, Object, Array, JSON, Set, Map
};
context.window.window = context.window;
context.window.console = console;
vm.createContext(context);

runFile(context, 'src/core/domain/item-facing-core.js');
runFile(context, 'src/core/state/prefab-registry.js');
runFile(context, 'src/core/domain/scene-domain-core.js');
runFile(context, 'src/core/domain/player-step-core.js');

const registry = context.PREFAB_REGISTRY_API;
const scene = context.__APP_CORE_SCENE_DOMAIN_CORE__;
const playerStep = context.__APP_CORE_PLAYER_STEP_CORE__;
assert(registry, 'prefab registry should expose API');
assert(scene, 'scene domain core should expose API');
assert(playerStep, 'player step core should expose API');

const stair = registry.getPrefabById('stair_mc_2step');
assert(stair && stair.id === 'stair_mc_2step', 'built-in MC stair prefab should exist');
assert(stair.renderUpdateMode === 'dynamic', 'MC stair should use dynamic voxel proxy rendering for sub-box AABBs');
assert(stair.voxels.length === 2, 'MC stair should be two sub-boxes');
approx(stair.w, 1, 'MC stair width');
approx(stair.d, 1, 'MC stair depth');
approx(stair.h, 1, 'MC stair height');
approx(stair.voxels[0].w, 0.5, 'lower half-slab width');
approx(stair.voxels[0].h, 0.5, 'lower half-slab height');
approx(stair.voxels[1].x, 0.5, 'upper full-height half local x');
approx(stair.voxels[1].z, 0, 'upper full-height half local z');
approx(stair.voxels[1].h, 1, 'upper full-height half local h');

const rotated = registry.prefabVariant(stair, 1);
assert(rotated.voxels.length === 2, 'rotated stair should preserve two sub-boxes');
approx(rotated.voxels[1].x, 0, 'rotation 1 upper half-slab x');
approx(rotated.voxels[1].y, 0, 'rotation 1 upper half-slab y');
approx(rotated.voxels[1].w, 1, 'rotation 1 upper full-height half width swaps from depth');
approx(rotated.voxels[1].d, 0.5, 'rotation 1 upper full-height half depth swaps from width');
approx(rotated.voxels[1].h, 1, 'rotation 1 upper half remains full height');
approx(rotated.voxels[1].stairMaxStepUpCells, 0.6, 'rotation preserves stair step limit');

const rotated2 = registry.prefabVariant(stair, 2);
approx(rotated2.voxels[1].x, 0, 'rotation 2 upper half-slab moves to west side');
approx(rotated2.voxels[1].y, 0, 'rotation 2 upper half-slab y');
approx(rotated2.voxels[1].w, 0.5, 'rotation 2 upper full-height half width');
approx(rotated2.voxels[1].d, 1, 'rotation 2 upper full-height half depth');
approx(rotated2.voxels[1].h, 1, 'rotation 2 upper half remains full height');

const rotated3 = registry.prefabVariant(stair, 3);
approx(rotated3.voxels[1].x, 0, 'rotation 3 upper half-slab x');
approx(rotated3.voxels[1].y, 0.5, 'rotation 3 upper half-slab moves to south side');
approx(rotated3.voxels[1].w, 1, 'rotation 3 upper full-height half width');
approx(rotated3.voxels[1].d, 0.5, 'rotation 3 upper full-height half depth');
approx(rotated3.voxels[1].h, 1, 'rotation 3 upper half remains full height');

const projected = scene.projectWorldBoxes(stair, 2, 3, 0);
assert(projected.length === 2, 'projectWorldBoxes should preserve MC stair sub-box count');
approx(projected[0].x, 2, 'projected lower x');
approx(projected[0].w, 0.5, 'projected lower w');
approx(projected[0].h, 0.5, 'projected lower h');
approx(projected[1].x, 2.5, 'projected upper x');
approx(projected[1].z, 0, 'projected upper z');
approx(projected[1].h, 1, 'projected upper h');

const candidate = scene.evaluatePlacementCandidate({
  proto: stair,
  cellX: 2,
  cellY: 3,
  existingBoxes: [],
  grid: { gridW: 8, gridH: 8 }
});
assert(candidate.valid, 'MC stair placement candidate should be valid on empty ground');
approx(candidate.bbox.w, 1, 'candidate bbox width');
approx(candidate.bbox.d, 1, 'candidate bbox depth');
approx(candidate.bbox.h, 1, 'candidate bbox height');

const settings = { gridW: 8, gridH: 8, playerProxyW: 0.2, playerProxyD: 0.2, playerHeightCells: 1.7, playerMaxStepUpCells: 0.6 };
let step = playerStep.resolvePlayerStepMove({
  player: { x: 1.8, y: 3.5, z: 0 },
  targetX: 2.2,
  targetY: 3.5,
  boxes: projected,
  settings
});
assert(step.allowed, 'player should step onto lower stair slab');
approx(step.toZ, 0.5, 'lower stair slab target z');
step = playerStep.resolvePlayerStepMove({
  player: { x: 2.2, y: 3.5, z: 0.5 },
  targetX: 2.8,
  targetY: 3.5,
  boxes: projected,
  settings
});
assert(step.allowed, 'player should step from lower slab onto upper stair slab');
approx(step.toZ, 1, 'upper stair slab target z');

step = playerStep.resolvePlayerStepMove({
  player: { x: 3.2, y: 3.5, z: 0 },
  targetX: 2.8,
  targetY: 3.5,
  boxes: projected,
  settings: Object.assign({}, settings, { playerMaxStepUpCells: 1 })
});
assert(!step.allowed && step.reason === 'body-blocked', 'player should not enter the high side directly from ground even if global max step is 1');

const projectedRot1 = scene.projectWorldBoxes(rotated, 2, 3, 0);
step = playerStep.resolvePlayerStepMove({
  player: { x: 2.5, y: 4.2, z: 0 },
  targetX: 2.5,
  targetY: 3.8,
  boxes: projectedRot1,
  settings
});
assert(step.allowed, 'rotation 1 should allow stepping onto its low side from south');
approx(step.toZ, 0.5, 'rotation 1 low-side target z');
step = playerStep.resolvePlayerStepMove({
  player: { x: 2.5, y: 2.8, z: 0 },
  targetX: 2.5,
  targetY: 3.2,
  boxes: projectedRot1,
  settings: Object.assign({}, settings, { playerMaxStepUpCells: 1 })
});
assert(!step.allowed, 'rotation 1 should block direct entry from its high side at ground level');

const sortLow = scene.computeVoxelRenderableSort({ cell: projected[0], viewRotation: 0 });
const sortHigh = scene.computeVoxelRenderableSort({ cell: projected[1], viewRotation: 0 });
const sortPlayerLower = scene.computePlayerActorRenderableSort({ player: { x: 2.25, y: 3.5, z: 0.5 }, viewRotation: 0 });
assert(sortLow.sortKey < sortPlayerLower.sortKey && sortPlayerLower.sortKey < sortHigh.sortKey, 'player on lower step should sort between lower and upper stair sub-boxes');


function assertMicroStairPrefab(prefabId, stepCount, expectedStepLimit) {
  const prefab = registry.getPrefabById(prefabId);
  assert(prefab && prefab.id === prefabId, `${prefabId} should exist`);
  assert(prefab.kind === 'stair_mc', `${prefabId} should be stair_mc`);
  assert(prefab.renderUpdateMode === 'dynamic', `${prefabId} should use Pixi/dynamic voxel proxy path`);
  assert(prefab.voxels.length === stepCount, `${prefabId} should have ${stepCount} sub-box steps`);
  approx(prefab.w, 1, `${prefabId} width`);
  approx(prefab.d, 1, `${prefabId} depth`);
  approx(prefab.h, 1, `${prefabId} height`);
  for (let i = 0; i < stepCount; i++) {
    const v = prefab.voxels[i];
    approx(v.x, i / stepCount, `${prefabId} local x step ${i}`);
    approx(v.y, 0, `${prefabId} local y step ${i}`);
    approx(v.z, 0, `${prefabId} local z step ${i}`);
    approx(v.w, 1 / stepCount, `${prefabId} local width step ${i}`);
    approx(v.d, 1, `${prefabId} local depth step ${i}`);
    approx(v.h, (i + 1) / stepCount, `${prefabId} local height step ${i}`);
    assert(v.shapeKind === prefabId, `${prefabId} shapeKind should match prefab id at step ${i}`);
    approx(v.stairStepIndex, i, `${prefabId} step index ${i}`);
    approx(v.stairStepCount, stepCount, `${prefabId} step count ${i}`);
    approx(v.stairMaxStepUpCells, expectedStepLimit, `${prefabId} step limit ${i}`);
  }

  const rot1 = registry.prefabVariant(prefab, 1);
  assert(rot1.voxels.length === stepCount, `${prefabId} rotation should preserve step count`);
  approx(rot1.voxels[0].x, 0, `${prefabId} rot1 first x`);
  approx(rot1.voxels[0].y, (stepCount - 1) / stepCount, `${prefabId} rot1 first y low side`);
  approx(rot1.voxels[0].w, 1, `${prefabId} rot1 first width`);
  approx(rot1.voxels[0].d, 1 / stepCount, `${prefabId} rot1 first depth`);
  approx(rot1.voxels[stepCount - 1].x, 0, `${prefabId} rot1 last x`);
  approx(rot1.voxels[stepCount - 1].y, 0, `${prefabId} rot1 last y high side`);
  approx(rot1.voxels[stepCount - 1].w, 1, `${prefabId} rot1 last width`);
  approx(rot1.voxels[stepCount - 1].d, 1 / stepCount, `${prefabId} rot1 last depth`);
  approx(rot1.voxels[stepCount - 1].h, 1, `${prefabId} rot1 last height`);

  const projectedMicro = scene.projectWorldBoxes(prefab, 4, 5, 0);
  assert(projectedMicro.length === stepCount, `${prefabId} projectWorldBoxes should preserve sub-boxes`);
  approx(projectedMicro[0].x, 4, `${prefabId} projected first x`);
  approx(projectedMicro[0].h, 1 / stepCount, `${prefabId} projected first h`);
  approx(projectedMicro[stepCount - 1].x, 4 + (stepCount - 1) / stepCount, `${prefabId} projected last x`);
  approx(projectedMicro[stepCount - 1].h, 1, `${prefabId} projected last h`);

  const candidateMicro = scene.evaluatePlacementCandidate({
    proto: prefab,
    cellX: 4,
    cellY: 5,
    existingBoxes: [],
    grid: { gridW: 8, gridH: 8 }
  });
  assert(candidateMicro.valid, `${prefabId} placement candidate should be valid`);
  approx(candidateMicro.bbox.w, 1, `${prefabId} candidate bbox width`);
  approx(candidateMicro.bbox.d, 1, `${prefabId} candidate bbox depth`);
  approx(candidateMicro.bbox.h, 1, `${prefabId} candidate bbox height`);
}

assertMicroStairPrefab('stair_mc_4step', 4, 0.35);
assertMicroStairPrefab('stair_mc_8step', 8, 0.2);

const stair4 = registry.getPrefabById('stair_mc_4step');
const projected4 = scene.projectWorldBoxes(stair4, 2, 3, 0);
let microStep = playerStep.resolvePlayerStepMove({
  player: { x: 1.9, y: 3.5, z: 0 },
  targetX: 2.12,
  targetY: 3.5,
  boxes: projected4,
  settings: { gridW: 8, gridH: 8, playerProxyW: 0.05, playerProxyD: 0.05, playerHeightCells: 1.7, playerMaxStepUpCells: 0.35 }
});
assert(microStep.allowed, '4-step stair should allow stepping onto first quarter step');
approx(microStep.toZ, 0.25, '4-step first target z');
microStep = playerStep.resolvePlayerStepMove({
  player: { x: 2.12, y: 3.5, z: 0.25 },
  targetX: 2.37,
  targetY: 3.5,
  boxes: projected4,
  settings: { gridW: 8, gridH: 8, playerProxyW: 0.05, playerProxyD: 0.05, playerHeightCells: 1.7, playerMaxStepUpCells: 0.35 }
});
assert(microStep.allowed, '4-step stair should allow stepping from first to second step');
approx(microStep.toZ, 0.5, '4-step second target z');
microStep = playerStep.resolvePlayerStepMove({
  player: { x: 3.2, y: 3.5, z: 0 },
  targetX: 2.9,
  targetY: 3.5,
  boxes: projected4,
  settings: { gridW: 8, gridH: 8, playerProxyW: 0.05, playerProxyD: 0.05, playerHeightCells: 1.7, playerMaxStepUpCells: 1 }
});
assert(!microStep.allowed, '4-step stair should block direct high-side entry from ground');

const stair8 = registry.getPrefabById('stair_mc_8step');
const projected8 = scene.projectWorldBoxes(stair8, 2, 3, 0);
microStep = playerStep.resolvePlayerStepMove({
  player: { x: 1.95, y: 3.5, z: 0 },
  targetX: 2.06,
  targetY: 3.5,
  boxes: projected8,
  settings: { gridW: 8, gridH: 8, playerProxyW: 0.03, playerProxyD: 0.03, playerHeightCells: 1.7, playerMaxStepUpCells: 0.2 }
});
assert(microStep.allowed, '8-step stair should allow stepping onto first eighth step');
approx(microStep.toZ, 0.125, '8-step first target z');
microStep = playerStep.resolvePlayerStepMove({
  player: { x: 3.2, y: 3.5, z: 0 },
  targetX: 2.95,
  targetY: 3.5,
  boxes: projected8,
  settings: { gridW: 8, gridH: 8, playerProxyW: 0.03, playerProxyD: 0.03, playerHeightCells: 1.7, playerMaxStepUpCells: 1 }
});
assert(!microStep.allowed, '8-step stair should block direct high-side entry from ground');


function expectedCylinderVoxelCount(resolution) {
  let count = 0;
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const cx = ((x + 0.5) / resolution) - 0.5;
      const cy = ((y + 0.5) / resolution) - 0.5;
      if (cx * cx + cy * cy <= 0.25 + 1e-9) count += 1;
    }
  }
  return count;
}

function assertVoxelCylinderPrefab(prefabId, resolution, expectedCount) {
  const prefab = registry.getPrefabById(prefabId);
  assert(prefab && prefab.id === prefabId, `${prefabId} should exist`);
  assert(prefab.kind === 'cylinder_voxel', `${prefabId} should be cylinder_voxel`);
  assert(prefab.renderUpdateMode === 'dynamic', `${prefabId} should use Pixi/dynamic voxel proxy path`);
  assert(prefab.voxels.length === expectedCount, `${prefabId} should have ${expectedCount} sub-boxes`);
  approx(prefab.w, 1, `${prefabId} width`);
  approx(prefab.d, 1, `${prefabId} depth`);
  approx(prefab.h, 1, `${prefabId} height`);
  for (let i = 0; i < prefab.voxels.length; i++) {
    const v = prefab.voxels[i];
    approx(v.w, 1 / resolution, `${prefabId} voxel width ${i}`);
    approx(v.d, 1 / resolution, `${prefabId} voxel depth ${i}`);
    approx(v.h, 1, `${prefabId} voxel height ${i}`);
    assert(v.shapeKind === prefabId, `${prefabId} shapeKind should match prefab id at voxel ${i}`);
    approx(v.cylinderResolution, resolution, `${prefabId} resolution ${i}`);
    approx(v.cylinderCellIndex, i, `${prefabId} cell index ${i}`);
    const cx = ((v.cylinderCellX + 0.5) / resolution) - 0.5;
    const cy = ((v.cylinderCellY + 0.5) / resolution) - 0.5;
    assert(cx * cx + cy * cy <= 0.25 + 1e-9, `${prefabId} voxel ${i} should be inside circle mask`);
  }

  const rot1 = registry.prefabVariant(prefab, 1);
  assert(rot1.voxels.length === expectedCount, `${prefabId} rotation should preserve sub-box count`);
  approx(rot1.w, 1, `${prefabId} rot1 width`);
  approx(rot1.d, 1, `${prefabId} rot1 depth`);
  approx(rot1.h, 1, `${prefabId} rot1 height`);
  for (let i = 0; i < rot1.voxels.length; i++) {
    const v = rot1.voxels[i];
    approx(v.w, 1 / resolution, `${prefabId} rot1 voxel width ${i}`);
    approx(v.d, 1 / resolution, `${prefabId} rot1 voxel depth ${i}`);
    approx(v.h, 1, `${prefabId} rot1 voxel height ${i}`);
    approx(v.cylinderResolution, resolution, `${prefabId} rot1 resolution ${i}`);
  }

  const projectedCylinder = scene.projectWorldBoxes(prefab, 4, 5, 0);
  assert(projectedCylinder.length === expectedCount, `${prefabId} projectWorldBoxes should preserve sub-box count`);
  approx(projectedCylinder[0].x, 4 + prefab.voxels[0].x, `${prefabId} projected first x`);
  approx(projectedCylinder[0].y, 5 + prefab.voxels[0].y, `${prefabId} projected first y`);
  approx(projectedCylinder[0].w, 1 / resolution, `${prefabId} projected first width`);
  approx(projectedCylinder[0].d, 1 / resolution, `${prefabId} projected first depth`);
  approx(projectedCylinder[0].h, 1, `${prefabId} projected first height`);

  const candidateCylinder = scene.evaluatePlacementCandidate({
    proto: prefab,
    cellX: 4,
    cellY: 5,
    existingBoxes: [],
    grid: { gridW: 8, gridH: 8 }
  });
  assert(candidateCylinder.valid, `${prefabId} placement candidate should be valid`);
  approx(candidateCylinder.bbox.w, 1, `${prefabId} candidate bbox width`);
  approx(candidateCylinder.bbox.d, 1, `${prefabId} candidate bbox depth`);
  approx(candidateCylinder.bbox.h, 1, `${prefabId} candidate bbox height`);
}

assertVoxelCylinderPrefab('cylinder_voxel_4', 4, expectedCylinderVoxelCount(4));
assertVoxelCylinderPrefab('cylinder_voxel_8', 8, expectedCylinderVoxelCount(8));
assertVoxelCylinderPrefab('cylinder_voxel_12', 12, expectedCylinderVoxelCount(12));


function assertTriPrismPrefab(prefabId, expectedPrimitiveCount, expectedVoxelCount, expectedW, expectedD, expectedCandidateW, expectedCandidateD) {
  if (expectedCandidateW == null) expectedCandidateW = expectedW;
  if (expectedCandidateD == null) expectedCandidateD = expectedD;
  const prefab = registry.getPrefabById(prefabId);
  assert(prefab && prefab.id === prefabId, `${prefabId} should exist`);
  assert(prefab.kind === 'tri_prism' || prefab.kind === 'tri_prism_compound', `${prefabId} should be a tri prism prefab`);
  assert(prefab.renderUpdateMode === 'dynamic', `${prefabId} should use Pixi/dynamic primitive rendering`);
  assert(Array.isArray(prefab.primitives), `${prefabId} should expose primitives`);
  assert(prefab.primitives.length === expectedPrimitiveCount, `${prefabId} primitive count`);
  assert(prefab.voxels.length === expectedVoxelCount, `${prefabId} collision voxel count`);
  approx(prefab.w, expectedW, `${prefabId} width`);
  approx(prefab.d, expectedD, `${prefabId} depth`);
  approx(prefab.h, 1, `${prefabId} height`);
  for (let i = 0; i < prefab.voxels.length; i++) {
    assert(prefab.voxels[i].renderHidden === true, `${prefabId} collision voxel ${i} should be hidden from voxel rendering`);
    assert(prefab.voxels[i].collisionOnly === true, `${prefabId} collision voxel ${i} should be collision-only`);
  }
  for (let i = 0; i < prefab.primitives.length; i++) {
    const prim = prefab.primitives[i];
    assert(prim.primitiveKind === 'vertical_tri_prism', `${prefabId} primitive ${i} should be vertical tri prism`);
    assert(Array.isArray(prim.vertices2d) && prim.vertices2d.length === 3, `${prefabId} primitive ${i} should have three local vertices`);
    approx(prim.h, 1, `${prefabId} primitive ${i} height`);
  }
  const rot1 = registry.prefabVariant(prefab, 1);
  assert(rot1.primitives.length === expectedPrimitiveCount, `${prefabId} rotation should preserve primitive count`);
  for (let i = 0; i < rot1.primitives.length; i++) {
    assert(rot1.primitives[i].vertices2d.length === 3, `${prefabId} rotated primitive ${i} should have three vertices`);
  }
  const candidateTri = scene.evaluatePlacementCandidate({
    proto: prefab,
    cellX: 2,
    cellY: 2,
    existingBoxes: [],
    grid: { gridW: 8, gridH: 8 }
  });
  assert(candidateTri.valid, `${prefabId} placement candidate should be valid`);
  approx(candidateTri.bbox.w, expectedCandidateW, `${prefabId} candidate bbox width`);
  approx(candidateTri.bbox.d, expectedCandidateD, `${prefabId} candidate bbox depth`);
}

assertTriPrismPrefab('tri_prism_half_a', 1, 1, 1, 1);
assertTriPrismPrefab('tri_prism_half_b', 1, 1, 1, 1);
assertTriPrismPrefab('tri_prism_quarter_ne', 1, 1, 1, 1, 1, 0.5);
assertTriPrismPrefab('tri_prism_quarter_se', 1, 1, 1, 1, 0.5, 1);
assertTriPrismPrefab('tri_prism_quarter_sw', 1, 1, 1, 1, 1, 0.5);
assertTriPrismPrefab('tri_prism_quarter_nw', 1, 1, 1, 1, 0.5, 1);
assertTriPrismPrefab('vertex_quad_tri_block', 4, 4, 2, 2);
assertTriPrismPrefab('vertex_square_tri_block', 4, 4, 2, 2);
assertTriPrismPrefab('vertex_square_quarter_block', 4, 4, 2, 2, Math.SQRT2, Math.SQRT2);



// Vertex square block is the explicit user-facing version of the 4-triangle vertex block.
const vertexSquare = registry.getPrefabById('vertex_square_tri_block');
const vertexSquareBoxes = scene.projectWorldBoxes(vertexSquare, 3, 4, 0);
assert(vertexSquareBoxes.length === 4, 'vertex_square_tri_block should project four triangular collision regions');
for (let i = 0; i < vertexSquareBoxes.length; i++) {
  assert(Array.isArray(vertexSquareBoxes[i].collisionPolygon2d) && vertexSquareBoxes[i].collisionPolygon2d.length === 3, 'vertex_square_tri_block collision region should remain triangular');
}
assert(vertexSquare.primitives.length === 4, 'vertex_square_tri_block should expose four vertical_tri_prism primitives');
const vertexSquareSortCells = vertexSquare.primitives.map(p => `${p.sortCell.x + 3},${p.sortCell.y + 4},${p.sortCell.z}`).sort();
assert(vertexSquareSortCells.join('|') === '3,4,0|3,5,0|4,4,0|4,5,0', 'vertex_square_tri_block primitives should inherit the four source-cell sort anchors');


// Quarter vertex square keeps the same 4-source-cell sorting model, but each contributing
// triangle has exactly 1/4 tile area. The four parts add back to one standard tile area.
const vertexQuarter = registry.getPrefabById('vertex_square_quarter_block');
const vertexQuarterBoxes = scene.projectWorldBoxes(vertexQuarter, 3, 4, 0);
assert(vertexQuarterBoxes.length === 4, 'vertex_square_quarter_block should project four quarter triangular collision regions');
let quarterAreaSum = 0;
for (let i = 0; i < vertexQuarterBoxes.length; i++) {
  assert(Array.isArray(vertexQuarterBoxes[i].collisionPolygon2d) && vertexQuarterBoxes[i].collisionPolygon2d.length === 3, 'vertex_square_quarter_block collision region should remain triangular');
  approx(polygonArea2d(vertexQuarterBoxes[i].collisionPolygon2d), 0.25, 'each vertex_square_quarter_block triangle should occupy one quarter of a tile');
  quarterAreaSum += polygonArea2d(vertexQuarterBoxes[i].collisionPolygon2d);
}
approx(quarterAreaSum, 1, 'vertex_square_quarter_block total footprint area should equal one standard tile');
assert(vertexQuarter.primitives.length === 4, 'vertex_square_quarter_block should expose four vertical_tri_prism primitives');
const vertexQuarterSortCells = vertexQuarter.primitives.map(p => `${p.sortCell.x + 3},${p.sortCell.y + 4},${p.sortCell.z}`).sort();
assert(vertexQuarterSortCells.join('|') === '3,4,0|3,5,0|4,4,0|4,5,0', 'vertex_square_quarter_block primitives should inherit the four source-cell sort anchors');

// A tile-quarter triangular prism is the actual 1/4 of a single 45-degree isometric tile.
const quarterPrefabIds = ['tri_prism_quarter_ne', 'tri_prism_quarter_se', 'tri_prism_quarter_sw', 'tri_prism_quarter_nw'];
let singleTileQuarterAreaSum = 0;
for (let i = 0; i < quarterPrefabIds.length; i++) {
  const quarterPrefab = registry.getPrefabById(quarterPrefabIds[i]);
  const quarterBoxes = scene.projectWorldBoxes(quarterPrefab, 5, 6, 0);
  const quarterPrims = quarterPrefab.primitives || [];
  assert(quarterBoxes.length === 1, `${quarterPrefabIds[i]} should have one triangular collision region`);
  assert(quarterPrims.length === 1, `${quarterPrefabIds[i]} should have one visual triangular-prism primitive`);
  assert(Array.isArray(quarterBoxes[0].collisionPolygon2d) && quarterBoxes[0].collisionPolygon2d.length === 3, `${quarterPrefabIds[i]} collision should be a triangle`);
  approx(polygonArea2d(quarterBoxes[0].collisionPolygon2d), 0.25, `${quarterPrefabIds[i]} should occupy exactly one quarter of a tile`);
  approx(polygonArea2d(quarterPrims[0].vertices2d), 0.25, `${quarterPrefabIds[i]} visual primitive should occupy exactly one quarter of a tile`);
  singleTileQuarterAreaSum += polygonArea2d(quarterBoxes[0].collisionPolygon2d);
}
approx(singleTileQuarterAreaSum, 1, 'the four single-tile quarter triangular prisms should add up to one full 45-degree tile');
const qNE = scene.projectWorldBoxes(registry.getPrefabById('tri_prism_quarter_ne'), 5, 6, 0);
const qSW = scene.projectWorldBoxes(registry.getPrefabById('tri_prism_quarter_sw'), 5, 6, 0);
assert(!scene.canPlaceBoxes(qNE, qNE, null).ok, 'same quarter triangular prism should collide with itself');
assert(scene.canPlaceBoxes(qSW, qNE, null).ok, 'opposite tile quarters should only meet at the center/corners and should be co-placeable');
assert(typeof scene.buildQuarterOccupancyIndex === 'function', 'scene domain should expose quarter occupancy index builder');
assert(typeof scene.getQuarterOccupancyCell === 'function', 'scene domain should expose quarter occupancy cell reader');
const fullQuarterOcc = scene.buildQuarterOccupancyIndex([{ x: 5, y: 6, z: 0, w: 1, d: 1, h: 1 }]);
assert(scene.getQuarterOccupancyCell(fullQuarterOcc, 5, 6, 0).mask === 15, 'full 1x1 cell should occupy all four diamond quarters');
const qNEOcc = scene.buildQuarterOccupancyIndex(qNE);
const qNECell = scene.getQuarterOccupancyCell(qNEOcc, 5, 6, 0);
assert(qNECell && qNECell.mask === 1, 'tri_prism_quarter_ne should occupy only the NE quarter mask');
assert(qNECell.quarters.join(',') === 'ne', 'tri_prism_quarter_ne quarter names');
const qCombinedOcc = scene.buildQuarterOccupancyIndex(qNE.concat(qSW));
const qCombinedCell = scene.getQuarterOccupancyCell(qCombinedOcc, 5, 6, 0);
assert(qCombinedCell && qCombinedCell.mask === (1 | 4), 'opposite tile quarters should combine masks without filling the whole cell');
assert(qCombinedOcc.summary.partialMaskCellLayerCount === 1, 'combined opposite quarters should be tracked as one partial cell-layer');

// Triangular-prism collision should use the half-square triangle footprint, not the full 1x1 AABB.
const triA = registry.getPrefabById('tri_prism_half_a');
const triB = registry.getPrefabById('tri_prism_half_b');
const triABoxes = scene.projectWorldBoxes(triA, 2, 2, 0);
const halfAQuarterOcc = scene.buildQuarterOccupancyIndex(triABoxes);
const halfAQuarterCell = scene.getQuarterOccupancyCell(halfAQuarterOcc, 2, 2, 0);
assert(halfAQuarterCell && halfAQuarterCell.mask === (1 | 2), 'tri_prism_half_a should occupy NE+SE quarter masks');
const triABoxesSame = scene.projectWorldBoxes(triA, 2, 2, 0);
const triBBoxesSame = scene.projectWorldBoxes(triB, 2, 2, 0);
assert(Array.isArray(triABoxes[0].collisionPolygon2d) && triABoxes[0].collisionPolygon2d.length === 3, 'tri_prism_half_a should project a triangular collision polygon');
assert(!scene.canPlaceBoxes(triABoxesSame, triABoxes, null).ok, 'same triangular half should collide with itself');
assert(scene.canPlaceBoxes(triBBoxesSame, triABoxes, null).ok, 'complementary triangular halves in the same cell should not collide; they only share the diagonal edge');
const triBComplementCandidate = scene.evaluatePlacementCandidate({
  proto: triB,
  cellX: 2,
  cellY: 2,
  existingBoxes: triABoxes,
  grid: { gridW: 8, gridH: 8 },
  playerBox: null
});
assert(triBComplementCandidate.valid, 'placement authority should allow complementary triangular half in the same cell');
approx(triBComplementCandidate.supportZ, 0, 'complementary triangular half should fill the same base layer, not stack on top');
const triASameCandidate = scene.evaluatePlacementCandidate({
  proto: triA,
  cellX: 2,
  cellY: 2,
  existingBoxes: triABoxes,
  grid: { gridW: 8, gridH: 8 },
  playerBox: null
});
assert(triASameCandidate.valid, 'same triangular half may still stack when the same footprint is already occupied');
approx(triASameCandidate.supportZ, 1, 'same triangular half should stack on the occupied triangular footprint');
const triSupportInside = playerStep.resolveTargetGroundZ({
  player: { x: 2.85, y: 2.15, z: 0 },
  targetX: 2.85,
  targetY: 2.15,
  boxes: triABoxes,
  settings: { playerProxyW: 0.05, playerProxyD: 0.05, playerMaxStepUpCells: 1 },
  maxStepUpCells: 1
});
approx(triSupportInside.targetGroundZ, 1, 'player footprint inside tri_prism_half_a should be supported at top z=1');
const triSupportOutside = playerStep.resolveTargetGroundZ({
  player: { x: 2.15, y: 2.85, z: 0 },
  targetX: 2.15,
  targetY: 2.85,
  boxes: triABoxes,
  settings: { playerProxyW: 0.05, playerProxyD: 0.05, playerMaxStepUpCells: 1 },
  maxStepUpCells: 1
});
approx(triSupportOutside.targetGroundZ, 0, 'player footprint outside tri_prism_half_a triangle should not be supported by its AABB');

console.log('mc-stair-block.test.js: OK');



// Micro triangle prism atom: runtime geometry follows scene subdivision metadata.
const microPrefab = registry.getPrefabById('micro_tri_prism');
assert(microPrefab, 'micro_tri_prism prefab should exist');
assert(microPrefab.kind === 'micro_tri_prism', 'micro_tri_prism should use micro_tri_prism kind');
const microN = 4;
const microS = 1 / microN;
const microX0 = microS;
const microY0 = 2 * microS;
const microCenter = { x: microX0 + microS / 2, y: microY0 + microS / 2 };
const microVerts = [
  { x: microX0 + microS, y: microY0 },
  { x: microX0 + microS, y: microY0 + microS },
  microCenter
];
const microProto = Object.assign({}, microPrefab, {
  voxels: [{
    x: microX0 + microS / 2,
    y: microY0,
    z: 0,
    w: microS / 2,
    d: microS,
    h: 1,
    renderHidden: true,
    collisionOnly: true,
    shapeKind: 'micro_tri_prism',
    collisionPolygon2d: microVerts
  }],
  primitives: [{
    id: 'micro-test-primitive',
    kind: 'vertical_tri_prism',
    primitiveKind: 'vertical_tri_prism',
    vertices2d: microVerts,
    z: 0,
    h: 1,
    sortCell: { x: 0, y: 0, z: 0 },
    shapeKind: 'micro_tri_prism'
  }],
  supportCells: [{ x: 0, y: 0, localZ: 0 }]
});
const microBoxes = scene.projectWorldBoxes(microProto, 2, 3, 0);
assert(microBoxes.length === 1, 'micro_tri_prism dynamic proto should project one collision atom');
assert(Array.isArray(microBoxes[0].collisionPolygon2d) && microBoxes[0].collisionPolygon2d.length === 3, 'micro_tri_prism collision should be a triangle');
approx(polygonArea2d(microBoxes[0].collisionPolygon2d), 1 / (4 * microN * microN), 'micro_tri_prism atom area should be one quarter of one micro-diamond');
const microCandidate = scene.evaluatePlacementCandidate({
  proto: microProto,
  cellX: 2,
  cellY: 3,
  existingBoxes: [],
  grid: { gridW: 8, gridH: 8 }
});
assert(microCandidate.valid, 'micro_tri_prism dynamic placement candidate should be valid');
approx(microCandidate.bbox.h, 1, 'micro_tri_prism height should be 1');
