const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  globalThis: null,
  window: null,
  setTimeout,
  clearTimeout,
  TextEncoder,
  TextDecoder,
  Uint8ClampedArray,
  Uint8Array,
  Map,
  Date,
};
context.globalThis = context;
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/core/domain/pixel-art-core.js', 'utf8'), context, { filename: 'pixel-art-core.js' });
vm.runInContext(fs.readFileSync('src/core/domain/material-state-core.js', 'utf8'), context, { filename: 'material-state-core.js' });

const pixel = context.__HZH_PIXEL_ART_CORE__;
const states = context.__HZH_MATERIAL_STATE_CORE__;
assert(pixel, 'pixel core missing');
assert(states, 'material state core missing');

const doc = pixel.createDocument(4, 4);
const layer = pixel.getLayer(doc, 0);
pixel.setPixel(doc, layer, 1, 1, [255, 0, 0, 255]);
const baseArtwork = pixel.serializeDocument(doc);
const baseVoxel = {
  anchor: { x: 0, y: 0, z: 0 },
  voxels: [{ x: 0, y: 0, z: 0, solid: true, collidable: true }],
  grid: { w: 8, h: 8 },
  currentLayer: 0,
};

const bundle = states.createBundle({ artwork: baseArtwork, voxel: baseVoxel });
assert.strictEqual(bundle.states.length, 1);
assert.strictEqual(bundle.activeStateId, 'state_0');

const second = states.addState(bundle, { id: 'open', name: '打开', blankArtwork: true, voxel: baseVoxel });
assert.strictEqual(bundle.states.length, 2);
assert.strictEqual(bundle.activeStateId, 'open');
assert.notStrictEqual(second.artwork, bundle.states[0].artwork, 'state artwork must not share object identity');
assert.notStrictEqual(second.voxel, bundle.states[0].voxel, 'state voxel must not share object identity');

states.updateState(bundle, 'open', {
  voxel: {
    anchor: { x: 1, y: 0, z: 0 },
    voxels: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ],
    grid: { w: 12, h: 7 },
    currentLayer: 2,
  },
});
assert.strictEqual(states.getState(bundle, 'open').voxel.voxels.length, 2);
assert.strictEqual(states.getState(bundle, 'state_0').voxel.voxels.length, 1, 'editing one state voxel must not mutate another state');
assert.strictEqual(JSON.stringify(states.getState(bundle, 'open').voxel.anchor), JSON.stringify({ x: 1, y: 0, z: 0 }));

const sourceLayerId = bundle.states[0].artwork.facings[0].layers[0].id;
const copiedLayer = states.copyLayerPayload(bundle.states[0].artwork, 0, sourceLayerId);
assert(copiedLayer, 'layer copy payload missing');
const pasted = states.pasteLayerPayload(bundle, 'open', 2, copiedLayer);
assert(pasted, 'cross-state layer paste failed');
assert.notStrictEqual(pasted.id, copiedLayer.id, 'pasted layer must receive a new id');
assert.strictEqual(states.getState(bundle, 'open').artwork.facings[2].layers.length, 2);
assert.strictEqual(states.getState(bundle, 'state_0').artwork.facings[0].layers.length, 1);

assert.strictEqual(states.copyFacing(bundle, 'state_0', 0, 'open', 1), true);
const copiedFacing = states.getState(bundle, 'open').artwork.facings[1];
assert.strictEqual(copiedFacing.id, 1);
assert.strictEqual(copiedFacing.layers.length, 1);
assert.notStrictEqual(copiedFacing.layers[0].id, bundle.states[0].artwork.facings[0].layers[0].id);

const duplicated = states.duplicateState(bundle, 'open', '打开副本');
assert(duplicated, 'state duplication failed');
assert.strictEqual(duplicated.voxel.voxels.length, 2);
duplicated.voxel.voxels.push({ x: 9, y: 9, z: 9, solid: true, collidable: true });
assert.strictEqual(states.getState(bundle, 'open').voxel.voxels.length, 2, 'duplicated state voxel must be deep-cloned');

const compat = states.compatibilityBundles(bundle);
assert.strictEqual(compat.materialStates.states.length, 3);
assert.strictEqual(compat.artworkStateBundle.states.length, 3);
assert.strictEqual(compat.voxelStateBundle.states.length, 3);
const restored = states.fromPackage({
  artworkStateBundle: compat.artworkStateBundle,
  voxelStateBundle: compat.voxelStateBundle,
});
assert.strictEqual(restored.states.length, 3);
assert.strictEqual(states.getState(restored, 'open').voxel.voxels.length, 2);
assert.strictEqual(states.getState(restored, 'open').artwork.facings[2].layers.length, 2);

console.log('material-state-core.test.js: OK');
