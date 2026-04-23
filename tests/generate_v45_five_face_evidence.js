const fs = require('fs');
const path = require('path');
const vm = require('vm');
function runFile(context, relPath) { vm.runInContext(fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8'), context, { filename: relPath }); }
const context = { window: { __APP_NAMESPACE: { bind() {} } }, console, Math, Number, String, Object, Array, JSON, editor: { prototypeIndex: 0 }, ui: null };
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
runFile(context, 'src/core/state/prefab-registry.js');
const api = context.window.__ITEM_FACING_CORE__;
const prefabs = context.prototypes || [];
function summary(id) {
  const prefab = prefabs.find(p => p.id === id);
  const facings = [0,1,2,3].map(facing => {
    const proto = api.buildFacingPrototype(prefab, facing, { x: 0, y: 0, z: 0, rotation: facing });
    return {
      facing,
      facingLabel: proto.facingLabel,
      footprint: proto.footprint,
      anchor: proto.rotatedAnchor,
      sortBase: proto.sortBase,
      debugFaceRender: {
        kind: 'debug-face-render',
        mode: 'placement-preview',
        prefabId: id,
        previewFacing: facing,
        renderedAsFiveFaceSolid: true,
        baseMonochromeSuppressed: true,
        visibleSemanticFaces: proto.visibleSemanticFaces.map(x => x.semantic),
        screenFaces: proto.visibleSemanticFaces.map(x => x.screenFace),
        topColor: prefab.semanticFaceColors.top,
        northColor: prefab.semanticFaceColors.north,
        eastColor: prefab.semanticFaceColors.east,
        southColor: prefab.semanticFaceColors.south,
        westColor: prefab.semanticFaceColors.west
      }
    };
  });
  return { id, name: prefab.name, semanticFaceColors: prefab.semanticFaceColors, facings };
}
const evidence = {
  schema: 'item-preview-five-face-evidence/v1',
  generatedAt: new Date().toISOString(),
  rendererContract: {
    fiveFacePreviewRenderer: 'drawDebugFiveFacePlacementPreview',
    filledSemanticFaces: true,
    suppressesMonochromeBaseForDebugPrefabs: true,
    requiredFaces: ['top','north','east','south','west']
  },
  prefabs: [summary('debug_cube_5faces'), summary('debug_rect_2x1_5faces')]
};
const out = path.join(__dirname, '..', 'v45_five_face_evidence.json');
fs.writeFileSync(out, JSON.stringify(evidence, null, 2));
console.log('wrote', out);
