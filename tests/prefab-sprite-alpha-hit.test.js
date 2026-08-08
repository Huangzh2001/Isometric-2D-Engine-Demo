const fs = require('fs');
const vm = require('vm');
function assert(cond,msg){ if(!cond) throw new Error(msg); }

const rgbaBySrc = new Map();
function makeRgba(w,h,visibleXY){
  const data = new Uint8ClampedArray(w*h*4);
  for (const [x,y,a=255] of visibleXY) data[(y*w+x)*4+3]=a;
  return data;
}
rgbaBySrc.set('sprite://normal', makeRgba(4,4,[[2,2,255]]));
rgbaBySrc.set('sprite://flip', makeRgba(4,4,[[0,1,255]]));

class FakeImage {
  constructor(){ this.complete=true; this.naturalWidth=4; this.naturalHeight=4; this.width=4; this.height=4; this.currentSrc=''; this._src=''; }
  set src(v){ this._src=String(v); this.currentSrc=this._src; this._rgba=rgbaBySrc.get(this._src)||makeRgba(4,4,[]); }
  get src(){ return this._src; }
}
function makeCanvas(){
  let lastImage=null;
  return {
    width:1,height:1,
    getContext(){ return {
      clearRect(){},
      drawImage(img){ lastImage=img; },
      getImageData(){ return { data: lastImage ? lastImage._rgba : makeRgba(4,4,[]) }; }
    }; }
  };
}
const window={};
window.__APP_PRESENTATION_HABBO_COMPOSITE_RENDERER__={
  rotKeyForSprite(rotation){ return String((((Number(rotation)||0)%4)+4)%4); },
  getHabboLayerConfigList(){ return null; },
  getHabboComposite(){ return null; },
  getHabboRoomOrigin(){ return {x:0,y:0}; },
  getHabboLayerDrawable(){ return null; },
  getHabboLayerLocalBox(){ return null; },
  getHabboCanvasBlendMode(){ return 'source-over'; },
  getHabboInstanceVisualShift(){ return {x:0,y:0}; },
  withScreenTranslate(_s,fn){ return fn(); }
};
const context={
  window, globalThis:window, console, Math, Number, String, Object, Array, JSON, Map, Uint8Array, Uint8ClampedArray,
  Image:FakeImage,
  document:{createElement(tag){ if(tag==='canvas') return makeCanvas(); throw new Error('unexpected element'); }},
  settings:{tileW:64,tileH:32},
  iso(){ return {x:100,y:100}; },
  getItemFacingCoreApi(){ return {
    resolveSpriteFacing(prefab,rot){ return {directionKey:String(rot||0),mirrorX:false,strategy:'four-native',availableKeys:['0','1','2','3']}; },
    getRotatedAnchor(){ return {x:0,y:0,z:0}; }
  }; },
  detailLog(){},
};
Object.assign(window, context);
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/presentation/render/sprites/prefab-sprite-renderer.js','utf8'),context,{filename:'prefab-sprite-renderer.js'});
const api=window.__PREFAB_SPRITE_RENDERER__;
const instance={x:0,y:0,z:0,rotation:0};
const prefab={id:'alpha',renderMode:'sprite_proxy',hzhUnifiedRuntime:true,anchor:{x:0,y:0,z:0},sprite:{image:'sprite://normal',scale:1,offsetPx:{x:0,y:0},anchorMode:'bottom-center'}};
const bounds=api.getPrefabSpriteScreenBounds(instance,prefab);
assert(bounds.x===98 && bounds.y===96 && bounds.width===4 && bounds.height===4,`unexpected bounds ${JSON.stringify(bounds)}`);
assert(api.hitTestPrefabSpriteAtScreen(instance,prefab,98.2,96.2)===null,'transparent top-left of artwork canvas must not trigger behavior');
const visible=api.hitTestPrefabSpriteAtScreen(instance,prefab,100.2,98.2);
assert(visible && visible.hit && visible.alpha===255,'visible source alpha pixel must trigger behavior');
assert(api.hitTestPrefabSpriteAtScreen(instance,prefab,102.1,98.2)===null,'outside draw rect must not hit');

const flipPrefab={id:'alpha-flip',renderMode:'sprite_proxy',hzhUnifiedRuntime:true,anchor:{x:0,y:0,z:0},sprite:{image:'sprite://flip',scale:1,offsetPx:{x:0,y:0},anchorMode:'bottom-center',flipX:true}};
// flipX draw occupies x=94..98 because canonical draw mirrors around x=98.
const flipBounds=api.getPrefabSpriteScreenBounds(instance,flipPrefab);
assert(flipBounds.x===94 && flipBounds.width===4,'flipX bounds must match renderer transform');
// Source x=0 appears at visual right edge after mirroring.
const flipVisible=api.hitTestPrefabSpriteAtScreen(instance,flipPrefab,97.2,97.2);
assert(flipVisible && flipVisible.sourceX===0 && flipVisible.sourceY===1,'alpha hit must reverse source X exactly for flipX');
assert(api.hitTestPrefabSpriteAtScreen(instance,flipPrefab,94.2,97.2)===null,'transparent mirrored side must stay non-interactive');
console.log('prefab-sprite-alpha-hit.test.js: OK');
