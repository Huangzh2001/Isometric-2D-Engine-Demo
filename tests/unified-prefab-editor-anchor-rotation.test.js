const fs = require('fs');
const path = require('path');
const vm = require('vm');

function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function near(a, b, eps = 1e-9) { return Math.abs(Number(a) - Number(b)) <= eps; }

const context = { window: { __APP_NAMESPACE: { bind() {} } }, console, Math, Number, String, Object, Array, JSON, Map, Set };
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
const api = context.window.__ITEM_FACING_CORE__;
const editorSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/editor/editor-unified-v18.js'), 'utf8');
assert(editorSource.includes("if (f === 1) return { x: state.gridH - y, y: x };"), 'test oracle must match editor facing 1 transform');
assert(editorSource.includes("if (f === 3) return { x: y, y: state.gridW - x };"), 'test oracle must match editor facing 3 transform');

// Mirrors the editor's viewPoint() *relative* transform. Grid constants cancel
// when subtracting viewPoint(anchor) from viewPoint(voxel point).
function editorRelativePoint(dx, dy, facing) {
  const f = ((facing % 4) + 4) % 4;
  if (f === 1) return { x: -dy, y: dx };
  if (f === 2) return { x: -dx, y: -dy };
  if (f === 3) return { x: dy, y: -dx };
  return { x: dx, y: dy };
}
function expectedRotatedBox(localX, localY, w, d, facing) {
  const pts = [
    editorRelativePoint(localX, localY, facing),
    editorRelativePoint(localX + w, localY, facing),
    editorRelativePoint(localX, localY + d, facing),
    editorRelativePoint(localX + w, localY + d, facing),
  ];
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, d: maxY - minY };
}

// Deliberately authored away from the editor's top-left. The runtime must use
// anchor=(4,3) as origin, not occupied minX/minY and not an anchor-cell centre.
const prefab = {
  id: 'offset-authored-prefab',
  hzhUnifiedRuntime: true,
  anchor: { x: 4, y: 3, z: 0 },
  w: 8, d: 8, h: 2,
  sprite: { relativeVoxelAlignment: { version: 'authored-test' } },
  voxels: [
    { x: 5, y: 3, z: 0, w: 1, d: 1, h: 1 },
    { x: 5, y: 5, z: 0, w: 2, d: 1, h: 1 },
    { x: 3, y: 2, z: 0, w: 1, d: 2, h: 1 },
  ],
};

const frame = api.getPrefabLocalFrame(prefab);
assert(frame.rotationSpace === 'editor-anchor-corner', 'unified prefab must use editor-anchor-corner rotation space');
assert(near(frame.origin.x, 4) && near(frame.origin.y, 3), 'runtime origin must be authored anchor, not occupied minimum');
assert(near(frame.anchor.x, 0) && near(frame.anchor.y, 0), 'local sprite anchor must be zero after subtracting authored anchor');
assert(near(frame.pivot.x, 0) && near(frame.pivot.y, 0), 'rotation pivot must be the authored anchor corner, not +0.5 cell centre');

for (let facing = 0; facing < 4; facing++) {
  const got = api.rotateVoxelList(prefab, facing);
  prefab.voxels.forEach((v, i) => {
    const localX = v.x - prefab.anchor.x;
    const localY = v.y - prefab.anchor.y;
    const expected = expectedRotatedBox(localX, localY, v.w, v.d, facing);
    const r = got[i];
    assert(near(r.x, expected.x), `f${facing} voxel${i} x must match editor viewPoint transform: got ${r.x}, expected ${expected.x}`);
    assert(near(r.y, expected.y), `f${facing} voxel${i} y must match editor viewPoint transform: got ${r.y}, expected ${expected.y}`);
    assert(near(r.w, expected.w), `f${facing} voxel${i} w must match editor transform`);
    assert(near(r.d, expected.d), `f${facing} voxel${i} d must match editor transform`);
  });
  const anchor = api.getRotatedAnchor(prefab, facing);
  assert(near(anchor.x, 0) && near(anchor.y, 0), `f${facing} sprite anchor must stay on the same local pivot`);
}

// Translation invariance must come from subtracting anchor, not subtracting
// the voxel bounding box. Move the entire authored object elsewhere and the
// runtime local geometry must remain byte-for-byte equivalent geometrically.
const shifted = JSON.parse(JSON.stringify(prefab));
shifted.anchor.x += 7; shifted.anchor.y += 11;
shifted.voxels.forEach(v => { v.x += 7; v.y += 11; });
for (let facing = 0; facing < 4; facing++) {
  const a = api.rotateVoxelList(prefab, facing);
  const b = api.rotateVoxelList(shifted, facing);
  a.forEach((v, i) => {
    ['x','y','z','w','d','h'].forEach(k => assert(near(v[k], b[i][k]), `shifted authoring must preserve ${k} at facing ${facing}`));
  });
}

// Explicitly catch the old f1/f3 reversal.
const eastOfAnchor = { id: 'east', hzhUnifiedRuntime: true, anchor: {x:0,y:0,z:0}, voxels:[{x:1,y:0,z:0,w:1,d:1,h:1}] };
const eastF1 = api.rotateVoxelList(eastOfAnchor, 1)[0];
const eastF3 = api.rotateVoxelList(eastOfAnchor, 3)[0];
assert(near(eastF1.x, -1) && near(eastF1.y, 1), 'editor facing 1 must rotate +X to +Y with box extending to negative X');
assert(near(eastF3.x, 0) && near(eastF3.y, -2), 'editor facing 3 must rotate +X to -Y');

console.log('unified-prefab-editor-anchor-rotation.test.js: OK');
