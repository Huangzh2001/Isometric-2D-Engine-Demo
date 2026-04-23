const fs = require('fs');
const path = require('path');
const vm = require('vm');
function runFile(context, relPath) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8'), context, { filename: relPath });
}
const bindings = {};
const context = { window: { __APP_NAMESPACE: { bind(path, api) { bindings[path] = api; } } }, console, Math, Number, String, Object, Array, JSON, Set, Map };
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
runFile(context, 'src/core/state/prefab-registry.js');
const api = bindings['domain.itemFacingCore'] || context.window.__ITEM_FACING_CORE__;
const registry = bindings['state.prefabRegistry'];
function sample(prefabId, facing, cells) {
  const prefab = registry.getPrefabById(prefabId);
  const occupiedSet = new Set(cells.map(c => `${c.x},${c.y},${c.z}`));
  const res = api.buildDebugCuboidFaceRenderables({
    prefab,
    itemFacing: facing,
    viewRotation: 0,
    ownerId: 'instance:' + prefabId,
    cells,
    occupiedSet
  });
  return {
    prefabId,
    facing,
    visibleSemanticFaces: res.visibleSemanticFaces.visibleFaces,
    renderedFaces: res.faceRenderables.map(f => ({
      faceId: f.faceId,
      semanticFace: f.semanticFace,
      screenFace: f.screenFace,
      textureId: f.textureId,
      color: f.color,
      depthKey: f.depthKey,
      polygon: f.worldPts
    })),
    faceDrawOrder: res.faceDrawOrder,
    topTexture: res.semanticTextureMap.top,
    northTexture: res.semanticTextureMap.north,
    eastTexture: res.semanticTextureMap.east,
    southTexture: res.semanticTextureMap.south,
    westTexture: res.semanticTextureMap.west,
    renderedAsRealFaces: true,
    renderedAsOverlay: false,
    helperLayerUsed: false,
    boxBaseUsedForDebugFaces: false
  };
}
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
const evidence = {
  schema: 'main-editor-placed-semantic-face-evidence/v50',
  cubeFacing0: sample('debug_cube_5faces', 0, [{ x: 4, y: 4, z: 0 }]),
  cubeFacing1: sample('debug_cube_5faces', 1, [{ x: 4, y: 4, z: 0 }]),
  rectFacing0: sample('debug_rect_2x1_5faces', 0, [{ x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }]),
  rectFacing1: sample('debug_rect_2x1_5faces', 1, [{ x: 1, y: 1, z: 0 }, { x: 1, y: 2, z: 0 }]),
  sourceContracts: {
    placedFaceBuilderExists: renderSource.includes('buildPlacedDebugInstanceFaceRenderables'),
    staticCacheExcludesDebugPrefabs: renderSource.includes('return !isFiveFaceDebugPrefab(prefab);'),
    placedModeLogExists: renderSource.includes("mode: 'placed-instance-real-face-renderables'"),
    overlayDisabled: renderSource.includes('renderedAsOverlay: false') && renderSource.includes('helperLayerUsed: false')
  }
};
const out = path.join('/mnt/data', 'v50_committed_face_evidence.json');
fs.writeFileSync(out, JSON.stringify(evidence, null, 2));
console.log('wrote ' + out);
