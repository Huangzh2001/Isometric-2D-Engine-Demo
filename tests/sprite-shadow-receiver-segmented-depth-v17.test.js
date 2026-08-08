#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/application/render/main-frame-renderable-assembler.js'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'dist/bundles/main-1.bundle.js'), 'utf8');

let mappingArgs = [];
const context = {
  console,
  getVisibleSemanticMappingForRender(itemFacing, viewRotation) {
    mappingArgs.push([itemFacing, viewRotation]);
    const table = {
      0: { lowerLeft: 'south', lowerRight: 'east' },
      1: { lowerLeft: 'west', lowerRight: 'south' },
      2: { lowerLeft: 'north', lowerRight: 'west' },
      3: { lowerLeft: 'east', lowerRight: 'north' }
    };
    return { screenFaces: Object.assign({ top: 'top' }, table[((viewRotation % 4) + 4) % 4]) };
  }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(src, context, { filename: 'main-frame-renderable-assembler.js' });
const api = context.__MAIN_FRAME_RENDERABLE_ASSEMBLER__;
assert(api, 'assembler API missing');
assert.strictEqual(typeof api.clipSpriteShadowPolygonToReceiver, 'function');
assert.strictEqual(typeof api.getSpriteShadowReceiverVisibleWorldFaces, 'function');

// A projected shadow wider than the receiver must be reduced to the receiver only.
const subject = [
  {x:-1,y:0}, {x:2,y:0}, {x:2,y:1}, {x:-1,y:1}
];
const receiver = [
  {x:0,y:0}, {x:1,y:0}, {x:1,y:1}, {x:0,y:1}
];
const clipped = api.clipSpriteShadowPolygonToReceiver(subject, receiver);
assert(clipped.length >= 3, 'clipped receiver polygon missing');
for (const p of clipped) {
  assert(p.x >= -1e-6 && p.x <= 1 + 1e-6, 'shadow leaked outside receiver in x');
  assert(p.y >= -1e-6 && p.y <= 1 + 1e-6, 'shadow leaked outside receiver in y');
}

// Receiver world sides depend on camera view only; artwork/item facing is deliberately not involved.
for (let r = 0; r < 4; r++) {
  const faces = api.getSpriteShadowReceiverVisibleWorldFaces(r);
  assert.strictEqual(faces[0], 'top');
  assert.strictEqual(faces.length, 3);
}
assert(mappingArgs.length === 4, 'expected four receiver-facing queries');
assert(mappingArgs.every(args => args[0] === 0), 'receiver visibility must not use artwork/item facing');

assert(src.includes("renderPath: 'sprite-shadow-receiver-overlay-v17'"));
assert(src.includes('receiverAwareLayering: true'));
assert(src.includes('clipSpriteShadowPolygonToReceiver(projected, receiverClip)'));
assert(!src.slice(src.indexOf('function buildSpriteShadowReceiverOverlayRenderables'), src.indexOf('function buildRenderablesForMainFrameAssembler')).includes('buildStaticVoxelRenderable(cell, occ, viewRotation)'), 'v17 must not derive receiver faces from artwork-facing static voxel renderable');
assert(bundle.includes('sprite-shadow-receiver-segmented-depth-v17'), 'runtime bundle missing v17 segmented receiver');
assert(bundle.includes('clipSpriteShadowPolygonToReceiver(projected, receiverClip)'), 'runtime bundle missing receiver clipping');

console.log(JSON.stringify({status:'PASS', test:'sprite-shadow-receiver-segmented-depth-v17', clippedPointCount:clipped.length, mappingArgs}, null, 2));
