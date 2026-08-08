const fs = require('fs');
const path = require('path');
const vm = require('vm');
function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function pos(list) { return list.map(v => [v.x, v.y, v.w || 1, v.d || 1].map(Number)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]); }

const context = {
  window: { __APP_NAMESPACE: { bind() {} } },
  console, Math, Number, String, Object, Array, JSON,
  editor: { prototypeIndex: 0 },
  ui: null,
  refactorLogCurrent: null,
  pushLog: null
};
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
runFile(context, 'src/core/state/prefab-registry.js');

const core = context.window.__ITEM_FACING_CORE__;
const prefabVariant = context.prefabVariant || context.window.prefabVariant;

// This is the important case: voxel cells are authored away from the editor
// workspace top-left and the positioning cell is outside the occupied cells.
// Runtime rotation must preserve that relative relation instead of normalizing
// every facing back to a new bounding-box corner.
const prefab = {
  id: 'relative_offset_door',
  w: 2, d: 1, h: 2,
  anchor: { x: 3, y: 4, z: 0 },
  voxels: [
    { x: 4, y: 4, z: 0, w: 1, d: 1, h: 2 },
    { x: 5, y: 4, z: 0, w: 1, d: 1, h: 2 }
  ],
  localFrame: {
    version: 'prefab-local-pivot-frame-v2',
    origin: { x: 4, y: 4, z: 0 },
    bounds: { w: 2, d: 1, h: 2 },
    anchor: { x: -1, y: 0, z: 0 },
    pivot: { x: -0.5, y: 0.5, z: 0 },
    rotationSpace: 'anchor-cell-center'
  },
  sprite: {
    image: 'data:image/png;base64,AA==',
    relativeVoxelAlignment: {
      version: 'translation-invariant-registration-point-alignment-v2',
      removedEditorTranslation: { x: 4, y: 4 },
      normalizedAnchorCell: { x: -1, y: 0, z: 0 }
    }
  }
};

const frame = core.getPrefabLocalFrame(prefab);
assert(frame.origin.x === 4 && frame.origin.y === 4, 'editor workspace translation must stay outside runtime local coordinates');
assert(frame.anchor.x === -1 && frame.anchor.y === 0, 'authored positioning cell may be outside occupied voxels');
assert(frame.rotationSpace === 'anchor-cell-center', 'unified runtime must rotate around the authored positioning cell centre');

const v0 = prefabVariant(prefab, 0);
const v1 = prefabVariant(prefab, 1);
const v2 = prefabVariant(prefab, 2);
const v3 = prefabVariant(prefab, 3);

assert(JSON.stringify(pos(v0.voxels)) === JSON.stringify([[0,0,1,1],[1,0,1,1]]), 'rotation 0 must only remove editor translation');
assert(JSON.stringify(pos(v1.voxels)) === JSON.stringify([[-1,-2,1,1],[-1,-1,1,1]]), '90-degree rotation must rotate occupied cells around authored pivot, allowing negative local coordinates');
assert(JSON.stringify(pos(v2.voxels)) === JSON.stringify([[-3,0,1,1],[-2,0,1,1]]), '180-degree rotation must preserve pivot-relative offset');
assert(JSON.stringify(pos(v3.voxels)) === JSON.stringify([[-1,1,1,1],[-1,2,1,1]]), '270-degree rotation must preserve pivot-relative offset');
for (const v of [v0,v1,v2,v3]) {
  assert(v.anchor.x === -1 && v.anchor.y === 0, 'positioning cell must stay fixed while geometry rotates around it');
}

// Translation invariance: adding 20 editor cells to both geometry and anchor
// produces the exact same runtime local geometry.
const translated = JSON.parse(JSON.stringify(prefab));
translated.id = 'translated_copy';
translated.anchor.x += 20; translated.anchor.y += 20;
translated.voxels.forEach(v => { v.x += 20; v.y += 20; });
translated.localFrame.origin.x += 20; translated.localFrame.origin.y += 20;
delete translated._variantCache;
const translatedV1 = prefabVariant(translated, 1);
assert(JSON.stringify(pos(translatedV1.voxels)) === JSON.stringify(pos(v1.voxels)), 'runtime rotation must be invariant to editor workspace translation');

const main1 = fs.readFileSync(path.join(__dirname, '..', 'dist/bundles/main-1.bundle.js'), 'utf8');
assert(main1.includes('prefab-local-pivot-frame-v2') || main1.includes('anchor-cell-center'), 'main-1 bundle must include pivot-relative runtime support');
assert(main1.includes('rotateBoxAroundAnchorPivot'), 'main-1 bundle must rotate voxel boxes around the authored pivot');

console.log('prefab-local-frame-relative-rotation.test.js: OK');
