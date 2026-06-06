const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/core/domain/liquid-render-core.js'), 'utf8');
const sandbox = { window: {}, Math, Number, String, Object, Array, Map, JSON, console };
vm.runInNewContext(source, sandbox, { filename: 'liquid-render-core.js' });
const api = sandbox.window.__LIQUID_RENDER_CORE__;
assert(api, 'liquid render core should expose API');

function round(n) { return Number(n.toFixed(3)); }
function sample(cell, all) {
  const index = api.buildLiquidCellIndex(all);
  return api.getTopSamples(cell, index);
}
function assertClose(actual, expected, msg) {
  assert(Math.abs(actual - expected) < 0.001, `${msg}: expected ${expected}, got ${actual}`);
}

assert.strictEqual(api.phase, 'LIQUID-RENDER-V18-TOP-LINES-OFF-PRESERVED', 'phase should identify preserved hidden top lines');
assert.strictEqual(api.normalizeSurfaceSubdivisions(1), 2, 'surface subdivisions should clamp to minimum 2');
assert.strictEqual(api.normalizeSurfaceSubdivisions(3), 3, 'surface subdivisions should accept 3 for 9 top faces');
assert.strictEqual(api.normalizeSurfaceSubdivisions(99), 16, 'surface subdivisions should clamp to maximum 16');
assert.strictEqual(api.normalizeEdgeCurveStrength(-1), 0, 'edge curve strength should clamp to minimum 0');
assert.strictEqual(api.normalizeEdgeCurveStrength(0.5), 0.5, 'edge curve strength should accept mid values');
assert.strictEqual(api.normalizeEdgeCurveStrength(2), 1, 'edge curve strength should clamp to maximum 1');
assert.strictEqual(Number(api.curveCoord(0.25, 0).toFixed(4)), 0.25, 'edge curve strength 0 should keep straight-line interpolation');
assert.strictEqual(Number(api.curveCoord(0.25, 1).toFixed(4)), 0.1563, 'edge curve strength 1 should use eased interpolation');
assert.strictEqual(api.isLiquidRenderCell({ shapeKind: 'liquid_water' }), true, 'shapeKind should classify liquid water render cells');
assert.strictEqual(api.isLiquidRenderCell({ prefabId: 'liquid_water_050' }), true, 'water prefab id should classify liquid cells');
assert.strictEqual(api.isLiquidRenderCell({ prefabId: 'cube_1x1', slopeDirection: 'east' }), false, 'ordinary cubes should not be classified as liquid');

const hOnly = { x: 0, y: 0, z: 2, shapeKind: 'liquid_water', h: 0.25 };
assert.strictEqual(api.getLiquidDepth(hOnly), 0.25, 'liquid depth should fall back to visual h when explicit liquidDepth was lost');
assert.strictEqual(api.getLiquidSurfaceZ(hOnly), 2.25, 'h fallback should make shallow water render below full-cell height');

const isolated = { x: 2, y: 3, z: 1, shapeKind: 'liquid_water', liquidDepth: 0.5, liquidType: 'water' };
const isolatedFaces = api.buildLiquidFaces([isolated], [isolated], { currentViewRotation: 0 });
assert.strictEqual(isolatedFaces.filter(f => f.liquidFaceKind === 'top-subface').length, 4, 'single water cell should emit four subdivided top faces');
const isolatedFaces3 = api.buildLiquidFaces([isolated], [isolated], { currentViewRotation: 0, surfaceSubdivisions: 3 });
assert.strictEqual(isolatedFaces3.filter(f => f.liquidFaceKind === 'top-subface').length, 9, 'surfaceSubdivisions=3 should emit 3×3 top faces');
const isolatedFaces4 = api.buildLiquidFaces([isolated], [isolated], { currentViewRotation: 0, surfaceSubdivisions: 4 });
assert.strictEqual(isolatedFaces4.filter(f => f.liquidFaceKind === 'top-subface').length, 16, 'surfaceSubdivisions=4 should emit 4×4 top faces');
const isolatedCurveSides = api.buildLiquidFaces([isolated], [isolated], { currentViewRotation: 0, surfaceSubdivisions: 4, edgeCurveStrength: 1 });
assert.strictEqual(isolatedCurveSides.filter(f => f.liquidFaceKind === 'outer-side').length, 16, 'edgeCurveStrength>0 should split four outer side top lines into subdivision segments');
const slopeLinear = api.buildLiquidFaces([{ x: 0, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.75 }], [{ x: 0, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.75 }, { x: 1, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.25 }], { currentViewRotation: 0, surfaceSubdivisions: 4, edgeCurveStrength: 0 }).filter(f => f.liquidFaceKind === 'top-subface');
const slopeCurved = api.buildLiquidFaces([{ x: 0, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.75 }], [{ x: 0, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.75 }, { x: 1, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.25 }], { currentViewRotation: 0, surfaceSubdivisions: 4, edgeCurveStrength: 1 }).filter(f => f.liquidFaceKind === 'top-subface');
assert(slopeLinear[0].worldPts[1].z < slopeCurved[0].worldPts[1].z, 'curved interpolation should bend the first segment away from the straight-line slope');
assert.strictEqual(isolatedFaces.filter(f => f.liquidFaceKind === 'outer-side').length, 4, 'single isolated water cell should emit four outer side faces');
const isoS = sample(isolated, [isolated]);
assert.deepStrictEqual(
  [isoS.nw.z, isoS.n.z, isoS.ne.z, isoS.e.z, isoS.se.z, isoS.s.z, isoS.sw.z, isoS.w.z, isoS.c.z].map(round),
  [1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
  'isolated liquid surface samples should remain flat'
);

const a = { x: 0, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.75 };
const b = { x: 1, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.25 };
const allAB = [a, b];
const sa = sample(a, allAB);
const sb = sample(b, allAB);

// Edge continuity: east edge midpoint and corners from A must equal west edge of B.
assertClose(sa.e.z, sb.w.z, 'shared east/west edge midpoint should be continuous');
assertClose(sa.ne.z, sb.nw.z, 'shared north corner should be continuous');
assertClose(sa.se.z, sb.sw.z, 'shared south corner should be continuous');
assertClose(sa.c.z, 0.75, 'cell center should preserve current cell height');
assertClose(sb.c.z, 0.25, 'neighbor center should preserve neighbor cell height');
assert(sa.e.z > sb.c.z && sa.e.z < sa.c.z, 'edge midpoint should create a smooth slope between cell centers');

const diag = { x: 1, y: 1, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.25 };
const allDiag = [a, diag];
const sADiag = sample(a, allDiag);
const sDiag = sample(diag, allDiag);
assertClose(sADiag.se.z, sDiag.nw.z, 'diagonal shared corner should be continuous');
assertClose(sADiag.c.z, 0.75, 'diagonal influence should not change current cell center');

const c = { x: 0, y: 1, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.25 };
const allPatch = [a, b, c, diag];
const sp = sample(a, allPatch);
assertClose(sp.e.z, 0.5, 'east edge midpoint should be pairwise smoothed');
assertClose(sp.s.z, 0.5, 'south edge midpoint should be pairwise smoothed');
assertClose(sp.se.z, 0.375, 'corner should include four touching water cells');
assert(sp.se.z < sp.e.z && sp.se.z < sp.s.z, 'corner can slope lower without forcing entire top to a single twisted quad');

const sameA = { x: 3, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.75 };
const sameB = { x: 4, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.75 };
const sameFaces = api.buildLiquidFaces([sameA], [sameA, sameB], { currentViewRotation: 0 });
assert(!sameFaces.some(f => f.semanticFace === 'east' && f.liquidFaceKind !== 'top-subface'), 'equal-height neighbor should hide internal side');
const ss = sample(sameA, [sameA, sameB]);
assert.deepStrictEqual([ss.nw.z, ss.n.z, ss.ne.z, ss.e.z, ss.se.z, ss.s.z, ss.sw.z, ss.w.z, ss.c.z].map(round), [0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75,0.75], 'equal-height neighbor should remain flat');

const full = { x: 6, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 1 };
const shallowEast = { x: 7, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.25 };
const sf = sample(full, [full, shallowEast]);
assert(sf.e.z > 0.9 && sf.e.z < 1, 'near-full water should strongly dominate edge midpoint but still slope slightly');
assertClose(sf.c.z, 1, 'subdivision keeps full cell center at its actual water height');


// Native curved-edge regression: the original top-subface itself should carry
// the curved boundary points and stroke. No separate curve overlay is allowed.
const nativeCurveCell = { x: 20, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.75 };
const nativeCurveNeighbor = { x: 21, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 0.25 };
const nativeCurveFaces = api.buildLiquidFaces(
  [nativeCurveCell],
  [nativeCurveCell, nativeCurveNeighbor],
  { currentViewRotation: 0, surfaceSubdivisions: 4, edgeCurveStrength: 1 }
);
const nativeTopFaces = nativeCurveFaces.filter(f => f.liquidFaceKind === 'top-subface');
assert.strictEqual(nativeTopFaces.length, 16, '4×4 subdivision should still create exactly 16 native top subfaces');
assert(nativeTopFaces.every(f => Array.isArray(f.worldPts) && f.worldPts.length > 4), 'curved native top subfaces should contain multi-point polygon boundaries, not four straight-corner points');
assert(nativeTopFaces.every(f => !!f.stroke), 'native top subfaces should draw their own curved stroke');
assert(!nativeCurveFaces.some(f => f.liquidFaceKind === 'top-curve-line'), 'should not create extra top-curve-line overlay faces');

const linearNativeFaces = api.buildLiquidFaces(
  [nativeCurveCell],
  [nativeCurveCell, nativeCurveNeighbor],
  { currentViewRotation: 0, surfaceSubdivisions: 4, edgeCurveStrength: 0 }
).filter(f => f.liquidFaceKind === 'top-subface');
assert(linearNativeFaces.every(f => Array.isArray(f.worldPts) && f.worldPts.length === 4), 'curve strength 0 should preserve four-corner straight subfaces');




// Top subdivision line toggle regression: surface remains subdivided but top
// strokes can be hidden independently from the actual top-subface geometry.
const noLineCell = { x: 40, y: 0, z: 0, shapeKind: 'liquid_water', liquidDepth: 1, liquidType: 'water' };
const noLineFaces = api.buildLiquidFaces([noLineCell], [noLineCell], {
  currentViewRotation: 0,
  surfaceSubdivisions: 4,
  edgeCurveStrength: 0,
  topSubdivisionLinesEnabled: false
});
const noLineTopFaces = noLineFaces.filter(f => f.liquidFaceKind === 'top-subface');
assert.strictEqual(noLineTopFaces.length, 16, 'hiding top subdivision lines should not change 4×4 top subface count');
assert(noLineTopFaces.every(f => f.stroke === '' && Number(f.width || 0) === 0), 'top subface strokes should be explicitly disabled with empty stroke when the toggle is off');

const withLineFaces = api.buildLiquidFaces([noLineCell], [noLineCell], {
  currentViewRotation: 0,
  surfaceSubdivisions: 4,
  edgeCurveStrength: 0,
  topSubdivisionLinesEnabled: true
});
const withLineTopFaces = withLineFaces.filter(f => f.liquidFaceKind === 'top-subface');
assert.strictEqual(withLineTopFaces.length, 16, 'showing top subdivision lines should preserve top subface count');
assert(withLineTopFaces.every(f => !!f.stroke && Number(f.width || 0) > 0), 'top subface strokes should be visible when the toggle is on');

console.log('liquid-render-core.test.js PASS');
