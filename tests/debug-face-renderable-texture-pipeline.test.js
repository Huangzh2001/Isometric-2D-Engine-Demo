const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const ctx = { window: {} };
ctx.window.__APP_NAMESPACE = { bind() {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/core/domain/item-facing-core.js', 'utf8'), ctx);
const api = ctx.window.__ITEM_FACING_CORE__;

const prefab = {
  id: 'debug_rect_2x1_5faces',
  semanticTextureMap: api.getDefaultSemanticTextureMap()
};
const result = api.buildDebugCuboidFaceRenderables({
  prefab,
  cells: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
  itemFacing: 1,
  viewRotation: 0,
  ownerId: 'test-preview'
});
assert(result.faceRenderables.length > 0, 'should build real face renderables');
for (const face of result.faceRenderables) {
  assert(face.semanticFace, 'face has semanticFace');
  assert(face.textureId, 'face has textureId');
  assert(face.texture && face.texture.textureId === face.textureId, 'face carries texture object');
  assert(face.color === face.texture.color, 'face color comes from semantic texture');
  assert(Array.isArray(face.polygon) && face.polygon.length >= 3, 'face carries logical polygon');
  assert(face.depthKey != null, 'face carries depthKey');
}
const semanticFaces = new Set(result.faceRenderables.map(f => f.semanticFace));
assert(semanticFaces.has('top'), 'top face should render');
assert(semanticFaces.size >= 2, 'at least one semantic side face should render');
console.log('debug-face-renderable-texture-pipeline.test.js passed');
