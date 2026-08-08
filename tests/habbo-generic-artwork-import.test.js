const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

class FakeContext {
  constructor(canvas){ this.canvas=canvas; this.imageSmoothingEnabled=false; }
  save(){} restore(){} translate(){} scale(){} drawImage(){} clearRect(){}
  getImageData(){
    const data=new Uint8ClampedArray(this.canvas.width*this.canvas.height*4);
    for(let i=0;i<data.length;i+=4){ data[i]=80;data[i+1]=140;data[i+2]=220;data[i+3]=255; }
    return {data};
  }
  putImageData(){}
}
class FakeCanvas {
  constructor(){this.width=1;this.height=1;this.ctx=new FakeContext(this);}
  getContext(){return this.ctx;}
  toDataURL(){return 'data:image/png;base64,AA==';}
}
class FakeElement {
  constructor(){this.listeners={};this.files=[];this.value='';this.textContent='';}
  addEventListener(type,fn){(this.listeners[type]||(this.listeners[type]=[])).push(fn);}
  click(){}
}
const elements={importHabboSwf:new FakeElement(),habboSwfFile:new FakeElement(),pixelTopState:new FakeElement(),pixelSourceSummary:new FakeElement()};
const document={readyState:'complete',getElementById:id=>elements[id]||null,createElement:tag=>tag==='canvas'?new FakeCanvas():new FakeElement()};
const editorApi={applyImportedHabboAsset(){},setStatus(){},detailLog(){}};
const Runtime={
  chooseHabboPreferredVisualSize(){return 64;},
  chooseHabboVisualization(){return {size:64,directions:[2,4],layerCount:1,layers:{0:{x:0,y:0,z:0},1:{x:1,y:-1,z:2}},directionLayers:{'2':{0:{z:100},1:{z:5}},'4':{0:{z:4},1:{z:120}}}};},
  getHabboLayerLetter(id){return id===0?'a':'b';},
  getHabboAnimationFrameForLayer(){return 0;},
  chooseHabboAssetForLayer(meta,letter,direction){return meta.assets.find(a=>a.letter===letter&&a.direction===direction)||meta.assets.find(a=>a.letter===letter);},
  resolveHabboLayerImage(){return {canvas:new FakeCanvas(),width:2,height:2};},
  buildHabboFacingPlan(){return {directionMap:[
    {sourceDirection:2,mirrorX:false},{sourceDirection:4,mirrorX:false},{sourceDirection:2,mirrorX:true},{sourceDirection:4,mirrorX:true}
  ]};}
};
const context={console,document,window:null,globalThis:null,App:{editor:{unifiedV18:editorApi}},HabboCalibrationRuntime:Runtime,crypto:null,Uint8ClampedArray,Map,Date,Number,Math,ImageData:class{},setTimeout,clearTimeout};
context.window=context;context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/core/domain/pixel-art-core.js','utf8'),context,{filename:'pixel-art-core.js'});
vm.runInContext(fs.readFileSync('src/presentation/editor/habbo-import-editor-feature.js','utf8'),context,{filename:'habbo-import-editor-feature.js'});
assert(context.__HZH_HABBO_GENERIC_IMPORT__,'generic Habbo importer was not registered');
const runtime={meta:{type:'test_bed',dimensions:{x:2,y:3,z:1},visualDirections:[2,4],assets:[
  {name:'test_a_2_0',letter:'a',direction:2,size:64,x:1,y:2,flipH:false},
  {name:'test_b_2_0',letter:'b',direction:2,size:64,x:2,y:1,flipH:false},
  {name:'test_a_4_0',letter:'a',direction:4,size:64,x:1,y:2,flipH:false},
  {name:'test_b_4_0',letter:'b',direction:4,size:64,x:2,y:1,flipH:false}
]},bitmaps:{}};
const result=context.__HZH_HABBO_GENERIC_IMPORT__.buildGenericArtwork(runtime,{name:'test.swf',size:1234},'abc');
const doc=result.document;
assert.strictEqual(doc.facings.length,4);
assert(doc.width>0&&doc.height>0);
assert.strictEqual(doc.metadata.sourceType,'habbo');
assert.strictEqual(doc.metadata.habboImport.directionMap.length,4);
for(const facing of doc.facings){
  assert.strictEqual(facing.layers.length,2);
  for(const layer of facing.layers){
    assert.strictEqual(layer.source.kind,'habbo-layer');
    assert(layer.pixels instanceof Uint8ClampedArray);
    const surface=context.__HZH_PIXEL_ART_CORE__.getLayerSurfaceSize(layer,doc.width,doc.height);
    assert.strictEqual(layer.pixels.length,surface.w*surface.h*4);
    assert(surface.w<=doc.width&&surface.h<=doc.height,'Habbo layer should use its own bounded backing surface');
  }
}
assert.deepStrictEqual(Array.from(doc.metadata.habboImport.sourceDirections),[2,4]);
assert.strictEqual(doc.facings[0].layers[0].source.letter,'b','direction 2 layers must follow direction-specific visual Z');
assert.strictEqual(doc.facings[0].layers[1].source.letter,'a','direction 2 high-Z layer must render later');
assert.strictEqual(doc.facings[1].layers[0].source.letter,'a','direction 4 must use its own visual Z ordering');
assert.strictEqual(doc.facings[1].layers[1].source.letter,'b','direction 4 high-Z layer must render later');
console.log('habbo-generic-artwork-import.test.js: OK');

const importApi=context.__HZH_HABBO_GENERIC_IMPORT__;
const reflected=[
  {letter:'sd',kind:'shadow',x:-95,y:-11,width:117,height:59},
  {letter:'a',kind:'body',x:-34,y:-34,width:63,height:40},
  {letter:'b',kind:'part',x:-66,y:-18,width:65,height:34},
  {letter:'c',kind:'part',x:-95,y:-2,width:62,height:49},
  {letter:'e',kind:'part',x:-63,y:46,width:1,height:1}
];
importApi.applyGeneratedMirrorSpatialRule(reflected,true);
assert.strictEqual(reflected.find(x=>x.letter==='a').x,-95);
assert.strictEqual(reflected.find(x=>x.letter==='b').x,-66);
assert.strictEqual(reflected.find(x=>x.letter==='c').x,-33);
assert.strictEqual(reflected.find(x=>x.letter==='sd').x,-95,'shadow registration should remain source-authored');
assert.strictEqual(reflected.find(x=>x.letter==='e').x,-63,'placeholder layer should not drive mirror bounds');

const inferred=importApi.inferHabboFootprint(
  {dimensions:{x:1,y:3,z:1.3}},
  [{sourceDirection:0,layers:[
    {kind:'body',x:-34,y:-34,width:63,height:40},
    {kind:'part',x:-66,y:-18,width:65,height:34},
    {kind:'part',x:-95,y:-2,width:62,height:49},
    {kind:'shadow',x:-95,y:-11,width:117,height:59}
  ]}]
);
assert.strictEqual(inferred.rule,'habbo-position-tile-footprint-registration-v3');
assert.strictEqual(inferred.w,1);
assert.strictEqual(inferred.d,3);
assert.strictEqual(inferred.translationInvariant,true);
assert.strictEqual(JSON.stringify(inferred.cells),JSON.stringify([{x:0,y:0},{x:0,y:1},{x:0,y:2}]));
assert.strictEqual(JSON.stringify(inferred.anchorCell),JSON.stringify({x:0,y:0,z:0}));
assert.strictEqual(JSON.stringify(inferred.localRegistration),JSON.stringify({x:0.5,y:0.5,z:0}));
assert.strictEqual(inferred.shadowValidation.confidence,'high');

const rotated=importApi.inferHabboFootprint(
  {dimensions:{x:2,y:3,z:1}},
  [{sourceDirection:2,layers:[]}]
);
assert.strictEqual(rotated.w,3);
assert.strictEqual(rotated.d,2);
assert.strictEqual(JSON.stringify(rotated.anchorCell),JSON.stringify({x:0,y:1,z:0}));
assert.strictEqual(JSON.stringify(rotated.localRegistration),JSON.stringify({x:0.5,y:1.5,z:0}));
const rotatedBack=importApi.inferHabboFootprint({dimensions:{x:2,y:3,z:1}},[{sourceDirection:4,layers:[]}]);
assert.strictEqual(rotatedBack.w,2); assert.strictEqual(rotatedBack.d,3);
assert.strictEqual(JSON.stringify(rotatedBack.anchorCell),JSON.stringify({x:1,y:2,z:0}));
const rotatedLeft=importApi.inferHabboFootprint({dimensions:{x:2,y:3,z:1}},[{sourceDirection:6,layers:[]}]);
assert.strictEqual(rotatedLeft.w,3); assert.strictEqual(rotatedLeft.d,2);
assert.strictEqual(JSON.stringify(rotatedLeft.anchorCell),JSON.stringify({x:2,y:0,z:0}));

const oneCellDoc={width:68,height:79,metadata:{registrationPx:{x:34,y:61}}};
const oneCellFootprint={anchorCell:{x:0,y:0,z:0},localRegistration:{x:.5,y:.5,z:0}};
const registrationModel=importApi.buildRelativeRegistrationModel(oneCellDoc,oneCellFootprint);
assert.strictEqual(registrationModel.coordinateModel,'direction-aware-position-tile-center');
assert.strictEqual(registrationModel.version,'habbo-position-tile-registration-v3-no-double-anchor');
assert.strictEqual(JSON.stringify(registrationModel.transforms.map(x=>x.offsetPx)),JSON.stringify([
  {x:0,y:34},{x:-32,y:18},{x:0,y:2},{x:32,y:18}
]));

// A non-zero anchor cell must not be added to the sprite offset a second time.
const multiCellModel=importApi.buildRelativeRegistrationModel(
  {width:194,height:86,metadata:{registrationPx:{x:97,y:36}}},
  {anchorCell:{x:0,y:1,z:0},localRegistration:{x:.5,y:1.5,z:0}}
);
assert.strictEqual(JSON.stringify(multiCellModel.transforms.map(x=>x.offsetPx)),JSON.stringify([
  {x:0,y:66},{x:-32,y:50},{x:0,y:34},{x:32,y:50}
]));
assert.strictEqual(JSON.stringify(multiCellModel.voxelRegistrationLocal),JSON.stringify({x:0.5,y:1.5,z:0}));
console.log('habbo calibrated mirror/position-tile registration rules: OK');
