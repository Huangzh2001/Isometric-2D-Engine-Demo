const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const context = { console, globalThis: null, setTimeout, clearTimeout, TextEncoder, TextDecoder, Uint8ClampedArray, Uint8Array, Map, Date };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/core/domain/pixel-art-core.js','utf8'), context);
const core = context.__HZH_PIXEL_ART_CORE__;
assert(core, 'core missing');
const doc = core.createDocument(4, 4);
const layer = core.getLayer(doc, 0);
assert.strictEqual(core.setPixel(doc, layer, 1, 1, [255,0,0,255]), true);
assert.deepStrictEqual(Array.from(core.getPixel(doc, layer, 1, 1)), [255,0,0,255]);
core.drawLine(doc, layer, 0,0,3,3,[0,255,0,255]);
assert.strictEqual(core.getPixel(doc, layer, 3,3)[1],255);
core.floodFill(doc, layer, 3,0,[0,0,255,255]);
assert.strictEqual(core.getPixel(doc, layer, 3,0)[2],255);
const serialized = core.serializeDocument(doc);
const restored = core.deserializeDocument(serialized);
assert.deepStrictEqual(Array.from(core.compositeFacing(restored,0)), Array.from(core.compositeFacing(doc,0)));

layer.locked = true;
layer.source = { kind: 'unit-test', assetName: 'sample' };
layer.metadata = { actorBand: 'auto' };
const lockedSerialized = core.serializeDocument(doc);
const lockedRestored = core.deserializeDocument(lockedSerialized);
const lockedLayer = core.getLayer(lockedRestored,0);
assert.strictEqual(lockedLayer.locked,true);
assert.strictEqual(lockedLayer.source.kind,'unit-test');
assert.strictEqual(lockedLayer.metadata.actorBand,'auto');
lockedLayer.locked = false;
const beforeMove = Array.from(lockedLayer.pixels);
assert.strictEqual(core.translateLayerPixels(lockedLayer, lockedRestored.width, lockedRestored.height, 1, 0), true);
assert.deepStrictEqual(Array.from(lockedLayer.pixels), beforeMove);
assert.strictEqual(JSON.stringify(lockedLayer.offsetPx),JSON.stringify({x:1,y:0}));
const movedComposite=core.compositeFacing(lockedRestored,0);
assert.strictEqual(core.getLayerOffset(lockedLayer).x,1);
const movedSerialized=core.serializeDocument(lockedRestored);
const movedRestored=core.deserializeDocument(movedSerialized);
assert.strictEqual(JSON.stringify(core.getLayerOffset(core.getLayer(movedRestored,0))),JSON.stringify({x:1,y:0}));

// Moving fully outside and back must preserve every pixel.
const clipDoc=core.createDocument(4,4);
const clipLayer=core.getLayer(clipDoc,0);
core.setPixel(clipDoc,clipLayer,0,0,[255,1,2,255]);
core.setPixel(clipDoc,clipLayer,3,3,[3,4,255,255]);
const clipBefore=Array.from(clipLayer.pixels);
core.translateLayerPixels(clipLayer,4,4,10,0);
assert.strictEqual(core.compositeFacing(clipDoc,0).some(v=>v!==0),false);
core.translateLayerPixels(clipLayer,4,4,-10,0);
assert.deepStrictEqual(Array.from(clipLayer.pixels),clipBefore);
assert.deepStrictEqual(Array.from(core.compositeFacing(clipDoc,0)),clipBefore);


// V3 uses an independent, unbounded layer surface rather than the document as
// the storage boundary. Moving outside, saving, loading and moving back must be
// byte-for-byte reversible.
const surfaceDoc=core.createDocument(4,4);
const surfaceFacing=core.getFacing(surfaceDoc,0);
const surfaceLayer=core.createLayer(4,4,{
  name:'compact',surface:{x:1,y:1,w:2,h:2},
  pixels:new Uint8ClampedArray([
    10,20,30,255, 40,50,60,255,
    70,80,90,255, 100,110,120,255
  ])
});
surfaceFacing.layers=[surfaceLayer];surfaceFacing.activeLayerId=surfaceLayer.id;
const surfaceBytes=Array.from(surfaceLayer.pixels);
core.translateLayerPixels(surfaceLayer,4,4,20,-13);
const outsideSaved=core.serializeDocument(surfaceDoc);
assert.strictEqual(outsideSaved.facings[0].layers[0].encoding,'rle-rgba-v2-unbounded-surface');
assert.strictEqual(JSON.stringify(outsideSaved.facings[0].layers[0].surface),JSON.stringify({x:21,y:-12,w:2,h:2}));
const outsideReloaded=core.deserializeDocument(outsideSaved);
const outsideLayer=core.getLayer(outsideReloaded,0);
assert.deepStrictEqual(Array.from(outsideLayer.pixels),surfaceBytes);
core.translateLayerPixels(outsideLayer,4,4,-20,13);
assert.strictEqual(JSON.stringify(core.getLayerOffset(outsideLayer)),JSON.stringify({x:1,y:1}));
assert.deepStrictEqual(Array.from(outsideLayer.pixels),surfaceBytes);
assert(core.compositeFacing(outsideReloaded,0).some(v=>v!==0));

// Drawing into the document outside the current compact surface expands the
// backing surface; it does not crop or replace the original pixels.
const expandDoc=core.createDocument(5,5);
const expandFacing=core.getFacing(expandDoc,0);
const expandLayer=core.createLayer(5,5,{surface:{x:2,y:2,w:1,h:1},pixels:new Uint8ClampedArray([1,2,3,255])});
expandFacing.layers=[expandLayer];expandFacing.activeLayerId=expandLayer.id;
assert.strictEqual(core.setPixel(expandDoc,expandLayer,0,0,[9,8,7,255]),true);
assert.strictEqual(JSON.stringify(core.getLayerOffset(expandLayer)),JSON.stringify({x:0,y:0}));
assert.strictEqual(JSON.stringify(core.getLayerSurfaceSize(expandLayer,5,5)),JSON.stringify({w:3,h:3}));
assert.deepStrictEqual(Array.from(core.getPixel(expandDoc,expandLayer,2,2)),[1,2,3,255]);
assert.deepStrictEqual(Array.from(core.getPixel(expandDoc,expandLayer,0,0)),[9,8,7,255]);

// Legacy V1/V2 fixed-document layers migrate without losing their stored bytes.
const legacy=core.deserializeDocument({width:3,height:2,activeFacing:0,facings:[{id:0,layers:[{
  id:'legacy',name:'legacy',offsetPx:{x:-5,y:4},runs:core.encodeRleRgba(new Uint8ClampedArray(3*2*4).fill(123))
}]}]});
const legacyLayer=core.getLayer(legacy,0);
assert.strictEqual(JSON.stringify(core.getLayerOffset(legacyLayer)),JSON.stringify({x:-5,y:4}));
assert.strictEqual(JSON.stringify(core.getLayerSurfaceSize(legacyLayer,3,2)),JSON.stringify({w:3,h:2}));
assert.strictEqual(legacyLayer.pixels.length,3*2*4);

const runs = core.encodeRleRgba(new Uint8ClampedArray([1,2,3,4,1,2,3,4,5,6,7,8]));
assert.strictEqual(JSON.stringify(Array.from(runs)),JSON.stringify([2,1,2,3,4,1,5,6,7,8]));
assert.deepStrictEqual(Array.from(core.decodeRleRgba(runs,3)),[1,2,3,4,1,2,3,4,5,6,7,8]);
core.resizeDocument(restored,8,8);
assert.strictEqual(restored.width,8);assert.strictEqual(restored.height,8);
assert.strictEqual(restored.facings.length,4);
console.log('pixel-art-core.test.js: OK');
