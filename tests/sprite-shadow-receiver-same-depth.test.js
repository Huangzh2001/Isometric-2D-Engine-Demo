const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/application/render/main-frame-renderable-assembler.js'), 'utf8');
const pixiSource = fs.readFileSync(path.join(root, 'src/presentation/render/optimization/shared-render-optimization-pixi-dynamic-renderable-consumer.js'), 'utf8');
const main1 = fs.readFileSync(path.join(root, 'dist/bundles/main-1.bundle.js'), 'utf8');
const main2 = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');

assert(!source.includes('__spriteShadowReceiver'), 'must not re-index sprite voxels into static world');
assert(!source.includes('shadowReceiverOnly'), 'must not create a second static receiver layer');
assert(source.includes('sprite-shadow-receiver-segmented-depth-v17'), 'segmented-depth receiver helper missing');
assert(source.includes("renderPath: 'sprite-shadow-receiver-overlay-v17'"), 'overlay render path missing');
assert(source.includes('var polys = Array.isArray(overlay.polys)'), 'must consume the real shadow overlay polys schema');
assert(source.includes('clipSpriteShadowPolygonToReceiver(projected, receiverClip)'), 'receiver shadow must be clipped to its own receiver face');
assert(!source.includes('box.instanceId === inst.instanceId && box.renderHidden !== true'), 'hidden sprite voxels must not be filtered out of shadow receiving');
assert(pixiSource.includes('renderable.shadowReceiverOverlayOnly === true'), 'Pixi must preserve the original shadow alpha');
assert(main1.includes('sprite-shadow-receiver-segmented-depth-v17'), 'runtime main-1 bundle missing segmented receiver');
assert(main2.includes('renderable.shadowReceiverOverlayOnly === true'), 'runtime main-2 bundle missing shadow overlay rendering');

let drawCalls = [];
const box = { id: 'b1', instanceId: 'door1', prefabId: 'door', x: 4, y: 5, z: 0, w: 1, d: 1, h: 1, renderHidden: true, rotation: 3 };
const sandbox = {
  console,
  boxes: [box],
  prefabHasSprite: () => true,
  buildOccupancy: (boxes) => new Map([['4,5,0', { x: 4, y: 5, z: 0, box: boxes[0] }]]),
  getVisibleSemanticMappingForRender: (_itemFacing, _viewRotation) => ({ screenFaces: {top:'top', lowerLeft:'south', lowerRight:'east'} }),
  getSemanticFaceNeighborDeltaForRender: (face) => ({ top:{x:0,y:0,z:1}, south:{x:0,y:1,z:0}, east:{x:1,y:0,z:0} }[face] || {x:0,y:0,z:0}),
  getSlopeAwareFaceWorldPolygon: (_cell, face) => {
    if (face === 'top') return [{x:4,y:5,z:1},{x:5,y:5,z:1},{x:5,y:6,z:1},{x:4,y:6,z:1}];
    if (face === 'south') return [{x:4,y:6,z:0},{x:5,y:6,z:0},{x:5,y:6,z:1},{x:4,y:6,z:1}];
    return [{x:5,y:5,z:0},{x:5,y:6,z:0},{x:5,y:6,z:1},{x:5,y:5,z:1}];
  },
  screenPointsFromWorldFace: (_worldPts) => [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],
  getSemanticFaceNormal: (face) => face === 'top' ? {x:0,y:0,z:1} : face === 'south' ? {x:0,y:1,z:0} : {x:1,y:0,z:0},
  buildVoxelFaceShadowOverlays: (_worldPts, _normal, _owner) => [{
    alpha: 0.35,
    baseAlpha: 0.35,
    // Deliberately extends beyond receiver. v17 must clip it.
    polys: [[{x:-5,y:2}, {x:15,y:2}, {x:15,y:8}, {x:-5,y:8}]],
    clipPoly: [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],
    receiverKind: 'top',
    sourceComp: 'casterA'
  }],
  computeSpriteRenderableSort: () => ({ sortKey: 12.5, tie: 300123 }),
  getInstanceWorldBoundsForRender: () => ({x:4,y:5,z:0,w:1,d:1,h:1}),
  deriveRenderableDrawPosition: ({debugFoot}) => debugFoot,
  iso: (x,y,z) => ({x,y:y-z}),
  shadowFillCss: (alpha) => `rgba(0,0,0,${alpha})`,
  drawPoly: (...args) => drawCalls.push(args),
  normalizeMainEditorViewRotationValue: (v) => ((Number(v)||0)%4+4)%4,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'main-frame-renderable-assembler.js' });
const api = sandbox.__MAIN_FRAME_RENDERABLE_ASSEMBLER__;
assert(api && typeof api.buildSpriteShadowReceiverOverlayRenderables === 'function');

const before = JSON.stringify(sandbox.boxes);
const out = api.buildSpriteShadowReceiverOverlayRenderables(
  { instanceId: 'door1', prefabId: 'door', x: 4, y: 5, z: 0 },
  { id: 'door', renderMode: 'sprite_proxy', sprite: { image: 'door.png' } },
  0,
  { sortKey: 12.5, tie: 300123 }
);
assert.strictEqual(JSON.stringify(sandbox.boxes), before, 'receiver generation must not mutate world/static boxes');
assert.strictEqual(out.length, 3, 'top + two camera-visible world faces should each receive their own clipped shadow segment');
for (const item of out) {
  assert.strictEqual(item.kind, 'debug-cuboid-face');
  assert.strictEqual(item.shadowReceiverOverlayOnly, true);
  assert.strictEqual(item.sortKey, 12.5, 'receiver shadow must occupy the exact same depth slot as the sprite');
  assert(item.tie > 300123, 'receiver shadow must draw immediately after the sprite');
  assert.strictEqual(item.renderPath, 'sprite-shadow-receiver-overlay-v17');
  assert.strictEqual(item.fill, 'rgba(0,0,0,0.35)');
  for (const p of item.points) {
    assert(p.x >= -1e-6 && p.x <= 10 + 1e-6, 'shadow leaked outside receiver x bounds');
    assert(p.y >= -1e-6 && p.y <= 10 + 1e-6, 'shadow leaked outside receiver y bounds');
  }
}
out[0].draw();
assert.strictEqual(drawCalls.length, 1, 'Canvas fallback should draw the clipped receiver shadow polygon');
assert.strictEqual(sandbox.__SPRITE_SHADOW_RECEIVER_LAST__.staticWorldInjection, false);
assert.strictEqual(sandbox.__SPRITE_SHADOW_RECEIVER_LAST__.receiverAwareLayering, true);
assert.strictEqual(sandbox.__SPRITE_SHADOW_RECEIVER_LAST__.hiddenSourceBoxCount, 1, 'hidden sprite voxel must still act as receiver');
assert.strictEqual(sandbox.__SPRITE_SHADOW_RECEIVER_LAST__.polygonRenderableCount, 3);
assert.deepStrictEqual(Array.from(sandbox.__SPRITE_SHADOW_RECEIVER_LAST__.visibleWorldFaces), ['top','south','east']);

console.log('sprite-shadow-receiver-same-depth.test.js: OK');
