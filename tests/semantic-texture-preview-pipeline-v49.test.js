const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const ctx = { window: {} };
ctx.window.__APP_NAMESPACE = { bind(path, api) { ctx.bound = api; } };
ctx.window.App = { domain: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/core/domain/item-facing-core.js', 'utf8'), ctx);
const api = ctx.window.__ITEM_FACING_CORE__;
assert(api, 'item facing core api should bind');
assert.strictEqual(typeof api.normalizeViewRotation, 'function', 'core should expose normalizeViewRotation');

const textureMap = api.getDefaultSemanticTextureMap();
for (const key of ['top','north','east','south','west']) {
  assert(textureMap[key], 'semantic texture missing ' + key);
  assert(textureMap[key].textureId, 'semantic textureId missing ' + key);
  assert.strictEqual(textureMap[key].semanticFace, key, 'semanticFace mismatch ' + key);
}

const cube = { id: 'debug_cube_5faces', semanticTextures: textureMap, voxels: [{ x: 0, y: 0, z: 0 }] };
const r0 = api.buildDebugCuboidFaceRenderables({ prefab: cube, cells: cube.voxels, itemFacing: 0, viewRotation: 0, ownerId: 'test-cube' });
const r1 = api.buildDebugCuboidFaceRenderables({ prefab: cube, cells: cube.voxels, itemFacing: 1, viewRotation: 0, ownerId: 'test-cube' });
assert(r0.faceRenderables.length >= 3, 'cube should produce real face renderables');
for (const face of r0.faceRenderables) {
  assert(face.semanticFace, 'face should include semanticFace');
  assert(face.textureId, 'face should include textureId');
  assert(face.texture, 'face should include texture object');
  assert(Array.isArray(face.polygon) && face.polygon.length >= 3, 'face should include polygon');
  assert(Number.isFinite(face.depthKey), 'face should include depthKey');
}
assert.notDeepStrictEqual(
  r0.faceRenderables.map(f => f.semanticFace).sort(),
  r1.faceRenderables.map(f => f.semanticFace).sort(),
  'visible semantic side faces should change when itemFacing changes'
);
console.log('semantic-texture-preview-pipeline-v49.test.js: OK');
