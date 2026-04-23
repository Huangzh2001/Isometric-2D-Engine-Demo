const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ctx = { window: {} };
ctx.window.__APP_NAMESPACE = { bind() {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/core/domain/item-facing-core.js', 'utf8'), ctx);
const api = ctx.window.__ITEM_FACING_CORE__;
const textureMap = api.getDefaultSemanticTextureMap();

function evidence(prefabId, facing) {
  const result = api.buildDebugCuboidFaceRenderables({
    prefab: { id: prefabId, semanticTextureMap: textureMap },
    cells: prefabId.includes('rect') ? [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] : [{ x: 0, y: 0, z: 0 }],
    itemFacing: facing,
    viewRotation: 0,
    ownerId: 'evidence:' + prefabId
  });
  return {
    prefabId,
    previewFacing: facing,
    semanticTextureMap: textureMap,
    visibleSemanticFaces: result.visibleSemanticFaces.visibleFaces,
    renderedFaces: result.faceRenderables.map(f => ({
      faceId: f.faceId,
      semanticFace: f.semanticFace,
      screenFace: f.screenFace,
      textureId: f.textureId,
      color: f.color,
      polygon: f.polygon,
      depthKey: f.depthKey
    })),
    faceDrawOrder: result.faceDrawOrder,
    renderedAsOverlay: false,
    helperLayerUsed: false,
    boxBaseUsedForDebugFaces: false
  };
}
const out = {
  schema: 'main-editor-semantic-texture-evidence/v47',
  generatedAt: new Date().toISOString(),
  claim: 'debug_5faces uses semantic texture map; visible faces select top/north/east/south/west textures and produce renderable faces',
  cubeFacing0: evidence('debug_cube_5faces', 0),
  cubeFacing1: evidence('debug_cube_5faces', 1),
  rectFacing0: evidence('debug_rect_2x1_5faces', 0),
  rectFacing1: evidence('debug_rect_2x1_5faces', 1)
};
fs.writeFileSync(path.join(process.cwd(), 'v47_semantic_texture_evidence.json'), JSON.stringify(out, null, 2));
console.log('wrote v47_semantic_texture_evidence.json');
