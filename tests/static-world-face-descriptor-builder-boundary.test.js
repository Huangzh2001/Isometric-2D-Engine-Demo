const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ownerRel = 'src/application/render/static-world-face-descriptor-builder.js';
const builderRel = 'src/application/render/static-world-renderable-builder.js';
const ownerSource = fs.readFileSync(path.join(root, ownerRel), 'utf8');
const builderSource = fs.readFileSync(path.join(root, builderRel), 'utf8');

assert(indexSource.indexOf(ownerRel) >= 0, 'index should load static-world-face-descriptor-builder');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(builderRel), 'face descriptor builder must load before static-world-renderable-builder');
assert(ownerSource.includes('buildStaticWorldFaceDescriptors'), 'owner must expose buildStaticWorldFaceDescriptors');
assert(ownerSource.includes('buildFaceDescriptor'), 'owner must expose buildFaceDescriptor');
assert(builderSource.includes('requireStaticWorldFaceDescriptorBuilder'), 'static-world-renderable-builder should require descriptor owner');
assert(builderSource.includes('.buildStaticWorldFaceDescriptors('), 'static-world-renderable-builder should delegate descriptor loop to owner');
assert(!/var\s+faceTiePrio\s*=/.test(builderSource), 'static-world-renderable-builder should not own face tie priority table');
assert(!/for\s*\(var\s+vf\s*=\s*0;\s*vf\s*<\s*visibleFaces\.length;\s*vf\+\+\)\s*\{[\s\S]{1000,}?faceDescriptors\.push/.test(builderSource), 'static-world-renderable-builder should not own the visible face descriptor loop');
for (const forbidden of [/\bctx\s*\./, /\bdocument\s*\./, /\blocalStorage\s*\./, /\bnew\s+Image\b/, /\bfetch\s*\(/]) {
  assert(!forbidden.test(ownerSource), `descriptor owner should not contain forbidden pattern ${forbidden}`);
}

const sandbox = { window: {}, Math, Number, String, Object, Array, Set, Map, Date, JSON, console, performance: { now: () => 0 } };
vm.runInNewContext(ownerSource, sandbox, { filename: ownerRel });
const api = sandbox.window.__STATIC_WORLD_FACE_DESCRIPTOR_BUILDER__;
assert(api, 'owner should expose __STATIC_WORLD_FACE_DESCRIPTOR_BUILDER__');
const result = api.buildStaticWorldFaceDescriptors({
  surfaceCells: [{ box: { id: 'box1', instanceId: 'i1', prefabId: 'cube', x: 1, y: 2, z: 3 }, visibleFaces: ['top'] }],
  currentViewRotation: 0,
  chunkOcc: { hasSolid: () => false },
  domainCore: { computeVoxelRenderableSort: () => ({ sortKey: 42, tie: 7 }) }
}, {
  perfNow: () => 0,
  getScreenFaceForSemanticFace: (face) => face,
  getSemanticFaceNormal: () => ({ x: 0, y: 0, z: 1 }),
  getStaticWorldFaceMergeCoords: () => ({ plane: 0, u: 1, v: 2 }),
  getTerrainSortBandKeyForRenderFace: () => 'band',
  getTerrainSideEdgeVisibilitySignature: () => null,
  getTerrainSideStepBreakSignature: () => null,
  getTerrainMaterialMergeKeyForRenderCell: () => null,
  getTerrainFaceMergeSignature: () => null,
  getStaticWorldFaceMergeSignature: () => 'sig'
});
assert.strictEqual(result.faceDescriptors.length, 1, 'one visible face should produce one descriptor');
assert.strictEqual(result.faceDescriptors[0].sortKey, 42, 'descriptor should carry injected sort key');
assert.strictEqual(result.faceDescriptors[0].semanticFace, 'top', 'descriptor should carry semantic face');
assert.strictEqual(result.inputFaceDescriptorCount, 1, 'result should count input descriptors');

console.log('static-world-face-descriptor-builder-boundary.test.js PASS');
