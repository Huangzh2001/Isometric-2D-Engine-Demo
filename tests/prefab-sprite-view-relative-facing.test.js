const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

let currentView = 0;
let lastIsoArgs = null;
class FakeImage {
  constructor(){ this.complete = true; this.naturalWidth = 16; this.naturalHeight = 32; this.width = 16; this.height = 32; this._src = ''; this.currentSrc=''; }
  set src(v){ this._src = String(v); this.currentSrc = this._src; }
  get src(){ return this._src; }
}
const window = {};
window.App = { state: { runtimeState: { editor: { get visualRotation(){ return currentView; } } } } };
window.__APP_PRESENTATION_HABBO_COMPOSITE_RENDERER__ = {
  rotKeyForSprite(rotation){ return String((((Math.round(Number(rotation)||0))%4)+4)%4); },
  getHabboLayerConfigList(){ return null; }, getHabboComposite(){ return null; }, getHabboRoomOrigin(){ return {x:0,y:0}; },
  getHabboLayerDrawable(){ return null; }, getHabboLayerLocalBox(){ return null; }, getHabboCanvasBlendMode(){ return 'source-over'; },
  getHabboInstanceVisualShift(){ return {x:0,y:0}; }, withScreenTranslate(_s,fn){ return fn(); }
};
const facing = {
  resolveViewRelativeFacing(worldFacing, viewRotation){ return (((Math.round(Number(worldFacing)||0)-Math.round(Number(viewRotation)||0))%4)+4)%4; },
  resolveSpriteFacing(_prefab, facing){ return {directionKey:String(facing), mirrorX:false, strategy:'four', availableKeys:['0','1','2','3']}; },
  getRotatedAnchor(_prefab, worldRotation){ return {x:10+Number(worldRotation||0), y:20+Number(worldRotation||0), z:0}; }
};
const ctx2d = { save(){}, restore(){}, drawImage(){}, translate(){}, scale(){}, globalAlpha:1, imageSmoothingEnabled:false };
const context = {
  window, globalThis:window, console, Math, Number, String, Object, Array, JSON, Map, Uint8Array,
  Image:FakeImage, document:{createElement(){ return {width:1,height:1,getContext(){return null;}}; }},
  settings:{tileW:64,tileH:32}, ctx:ctx2d, boxes:[], SHOW_PLAYER:false, player:{x:0,y:0},
  iso(x,y,z){ lastIsoArgs={x,y,z}; return {x:100,y:100}; },
  getItemFacingCoreApi(){ return facing; }, detailLog(){}, pushHabboDebug(){}, cloneJsonSafe(v){return JSON.parse(JSON.stringify(v));},
  normalizeMainEditorViewRotationValue(v){ return Number(v)||0; }, getSafeMainEditorViewRotation(){ return {viewRotation:currentView}; },
  getDomainSceneCoreApi(){ return null; }, computeViewAwareSortMeta(){ return {sortKey:0,tie:0}; }, getInstanceWorldBoundsForRender(){return null;},
  getPrefabById(){ return prefab; }
};
Object.assign(window, context);
const prefab = {
  id:'door', renderMode:'sprite_proxy', hzhUnifiedRuntime:true, anchor:{x:0,y:0,z:0},
  spriteDirections:{
    '0':{image:'sprite://0',scale:1,offsetPx:{x:0,y:0}},
    '1':{image:'sprite://1',scale:1,offsetPx:{x:10,y:0}},
    '2':{image:'sprite://2',scale:1,offsetPx:{x:20,y:0}},
    '3':{image:'sprite://3',scale:1,offsetPx:{x:30,y:0}}
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/presentation/render/sprites/prefab-sprite-renderer.js','utf8'), context, {filename:'prefab-sprite-renderer.js'});
const api = window.__PREFAB_SPRITE_RENDERER__;

const worldFacing = 1;
const expected = ['1','0','3','2'];
for (currentView=0; currentView<4; currentView++) {
  const cfg = api.getPrefabSpriteConfig(prefab, worldFacing);
  assert.strictEqual(cfg.__resolvedDirectionKey, expected[currentView], `view ${currentView}: visual direction must be worldFacing-viewRotation`);
  assert.strictEqual(cfg.__worldRotation, worldFacing, 'persistent world rotation must stay unchanged');
  assert.strictEqual(cfg.__visualFacing, Number(expected[currentView]), 'visual facing metadata must match selected artwork');
}

currentView = 2;
const inst = {prefabId:'door',x:5,y:6,z:0,rotation:worldFacing};
api.getPrefabSpriteScreenBounds(inst,prefab);
assert(lastIsoArgs, 'screen bounds must project the runtime anchor');
assert.strictEqual(lastIsoArgs.x, 5 + 11, 'anchor X must still use persistent world-facing rotation, not visual facing');
assert.strictEqual(lastIsoArgs.y, 6 + 21, 'anchor Y must still use persistent world-facing rotation, not visual facing');

const bundle = fs.readFileSync('dist/bundles/main-2.bundle.js','utf8');
assert(bundle.includes('resolvePrefabSpriteVisualFacing'), 'runtime bundle must include camera-relative unified sprite facing');
assert(bundle.includes('__visualFacing: visual.visualFacing'), 'runtime bundle must retain visual-facing config metadata');
assert(bundle.includes('__PREFAB_SPRITE_VIEW_FACING_LAST__'), 'runtime bundle must expose latest unified sprite view-facing diagnostics');
assert(bundle.includes('prefabSpriteViewFacing='), 'debug export header must include unified sprite visual-facing diagnostics');
assert(bundle.includes("if(placementPreviewActive){"), 'runtime bundle must keep normal wheel as preview-facing rotation while placing');
console.log('prefab-sprite-view-relative-facing.test.js: OK');
