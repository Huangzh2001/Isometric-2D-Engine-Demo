const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

class ClassList {
  constructor(){ this.set = new Set(); }
  add(...x){ x.forEach(v=>this.set.add(v)); }
  remove(...x){ x.forEach(v=>this.set.delete(v)); }
  toggle(v,on){ if(on===undefined)on=!this.set.has(v); on?this.set.add(v):this.set.delete(v); return on; }
  contains(v){ return this.set.has(v); }
}
function noop(){}
function makeContext(){ return new Proxy({ imageSmoothingEnabled:false },{ get(t,p){ if(p in t)return t[p]; if(p==='measureText')return ()=>({width:10}); if(p==='getImageData')return ()=>({data:new Uint8ClampedArray(32*32*4)}); return noop; }, set(t,p,v){t[p]=v;return true;} }); }
class Element {
  constructor(id='',tag='DIV'){
    this.id=id;this.tagName=tag;this.value='';this.textContent='';this.innerHTML='';this.style={};this.dataset={};this.disabled=false;this.hidden=false;this.files=[];this.children=[];this.listeners={};this.classList=new ClassList();this.width=900;this.height=720;this.attributes={};this.checked=true;
  }
  addEventListener(type,fn){(this.listeners[type]||(this.listeners[type]=[])).push(fn);}
  dispatch(type,event={}){(this.listeners[type]||[]).forEach(fn=>fn(Object.assign({target:this,preventDefault:noop,stopPropagation:noop},event)));}
  append(...nodes){this.children.push(...nodes);} appendChild(n){this.children.push(n);return n;} remove(){} click(){} focus(){} select(){}
  setPointerCapture(){} releasePointerCapture(){}
  setAttribute(k,v){this.attributes[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);} getAttribute(k){return this.attributes[k]??null;}
  getBoundingClientRect(){return {left:0,top:0,width:900,height:720};}
  getContext(){return makeContext();} toDataURL(){return 'data:image/png;base64,AA==';}
  querySelector(sel){if(sel==='canvas')return this.canvas||null;return null;}
  querySelectorAll(){return [];} closest(){return null;}
}
const ids = [
'imageArtworkWorkspace','pixelWorkspaceShell','pixelArtCanvas','pixelCanvasViewport','pixelDocumentSummary','pixelCanvasStatus','pixelCursorStatus','pixelZoomLabel','pixelTopState','pixelSourceSummary','pixelSourceMetadata',
'pixelCanvasWidth','pixelCanvasHeight','pixelPaletteLimit','pixelNewDocument','pixelImportImage','pixelImportFile','pixelReimportImage','pixelResizeDocument','pixelOpenProject','pixelProjectFile','pixelUndo','pixelRedo','pixelCenterView',
'pixelPrimaryColor','pixelSecondaryColor','pixelAlpha','pixelAlphaLabel','pixelColorHex','pixelPrimarySwatch','pixelSwapColors','pixelPalette','pixelDockPrimary','pixelDockSecondary',
'pixelFacingGrid','pixelCopyFacingTarget','pixelCopyFacing','pixelLayerList','pixelLayerCount','pixelAddLayer','pixelDuplicateLayer','pixelDeleteLayer','pixelLayerUp','pixelLayerDown','pixelLayerName','pixelLayerOpacity','pixelLayerOpacityLabel',
'exportUnifiedMaterial','importUnifiedMaterial','unifiedMaterialFile','unifiedExportSummary','materialStateBar','materialStateTabs','materialStateSummary','materialStateAdd','materialStateDuplicate','materialStateRename','materialStateDelete','materialStateMoveLeft','materialStateMoveRight','materialStateCopyLayer','materialStatePasteLayer','materialStateCopyFacing','materialStateTarget','materialStateTargetFacing','voxelActiveStateLabel','pixelGridToggle','pixelOriginToggle','pixelPropertyShowGrid','pixelPropertyShowOrigin','pixelToggleLeftDock','pixelToggleRightDock','pixelRestoreLeftDock','pixelRestoreRightDock','pixelFocusMode','pixelActiveToolName','pixelActiveToolHint'
];
const elements = Object.fromEntries(ids.map(id=>[id,new Element(id,id.includes('Canvas')||id==='pixelArtCanvas'?'CANVAS':'DIV')]));
elements.pixelCanvasWidth.value='32';elements.pixelCanvasHeight.value='32';elements.pixelPaletteLimit.value='32';elements.pixelPrimaryColor.value='#ffffff';elements.pixelSecondaryColor.value='#000000';elements.pixelAlpha.value='255';elements.pixelLayerOpacity.value='100';elements.pixelCopyFacingTarget.value='1';elements.materialStateTargetFacing.value='0';
elements.pixelWorkspaceShell.setAttribute('data-left-dock','expanded');elements.pixelWorkspaceShell.setAttribute('data-right-dock','expanded');
const facingCards=[];
for(let i=0;i<4;i++){const card=new Element('facing'+i,'BUTTON');card.dataset.facing=String(i);card.classList.add('facingCard');card.canvas=new Element('facingCanvas'+i,'CANVAS');card.querySelector=(s)=>s==='canvas'?card.canvas:null;facingCards.push(card);}
elements.pixelFacingGrid.querySelectorAll=(sel)=>sel==='.facingCard'?facingCards:[];
const toolButtons=['pencil','eraser','fill','picker','line','rect','move'].map(tool=>{const b=new Element('tool-'+tool,'BUTTON');b.dataset.pixelTool=tool;return b;});
const inspectorButtons=['layers','colors','properties'].map(name=>{const b=new Element('tab-'+name,'BUTTON');b.dataset.inspectorTab=name;return b;});
const inspectorPanels=['layers','colors','properties'].map(name=>{const p=new Element('panel-'+name,'SECTION');p.dataset.inspectorPanel=name;return p;});
const body=new Element('body','BODY');body.dataset={editorStep:'image'};
const document={
  readyState:'complete',body,getElementById:id=>elements[id]||null,
  createElement:tag=>new Element('',tag.toUpperCase()),
  querySelectorAll(sel){if(sel==='[data-pixel-tool]')return toolButtons;if(sel==='[data-inspector-tab]')return inspectorButtons;if(sel==='[data-inspector-panel]')return inspectorPanels;return [];},
  addEventListener:noop
};
const listeners={};
const storage = new Map();
const api={
  setStatus:noop,detailLog:noop,applyArtworkDocument(payload){api.lastPayload=payload;},getArtworkDocument(){return null;},registerBeforeExportHook(fn){api.beforeExport=fn;},getPrefabDraft(){return {id:'test',name:'Test',voxels:[]};},getVoxelSnapshot(){return {anchor:{x:0,y:0,z:0},voxels:[],grid:{w:10,h:10}};},applyVoxelSnapshot:noop,getSpriteStateSnapshot(){return {activeFacing:0,previewOpacity:1,facingTransforms:[]};},applySpriteStateSnapshot:noop,setMaterialStateBundle(bundle){api.lastStateBundle=bundle;},getMaterialStateBundle(){return api.lastStateBundle||null;},loadPrefabDraft:noop,getSourceType(){return 'pixel-artwork';}
};
class ImageData { constructor(data,width,height){this.data=data;this.width=width;this.height=height;} }
const context={
  console,globalThis:null,window:null,document,App:{editor:{unifiedV18:api}},ImageData,Uint8ClampedArray,Uint8Array,Map,Date,TextEncoder,TextDecoder,Blob,Response,
  URL:{createObjectURL:()=>'',revokeObjectURL:noop},CompressionStream:undefined,DecompressionStream:undefined,
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init&&init.detail;}},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{fn();return 1;},setTimeout,clearTimeout,devicePixelRatio:1,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},
  addEventListener:(type,fn)=>{(listeners[type]||(listeners[type]=[])).push(fn);},dispatchEvent:noop
};
context.globalThis=context;context.window=context;
vm.createContext(context);
for(const file of ['src/core/domain/pixel-art-core.js','src/core/domain/material-state-core.js','src/application/assets/pixel-art-workflow-controller.js','src/application/assets/material-state-workflow-controller.js','src/infrastructure/assets/unified-material-export.js','src/presentation/editor/pixel-art-editor.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
assert(context.__HZH_PIXEL_ART_EDITOR__,'pixel editor failed to initialize');
assert.strictEqual(context.__HZH_PIXEL_ART_EDITOR__.controller.getDocument().facings.length,4);
context.__HZH_PIXEL_ART_EDITOR__.controller.setTool('move');
assert.strictEqual(context.__HZH_PIXEL_ART_EDITOR__.controller.getState().tool,'move');
// A drag may continue far beyond the document frame. It changes only the
// independent layer origin and is exactly reversible when dragged back.
const moveLayer=context.__HZH_PIXEL_ART_EDITOR__.controller.getActiveLayer();
moveLayer.pixels[0]=201;moveLayer.pixels[1]=77;moveLayer.pixels[2]=33;moveLayer.pixels[3]=255;
const moveBytes=Array.from(moveLayer.pixels);
elements.pixelArtCanvas.dispatch('pointerdown',{button:0,pointerId:1,clientX:200,clientY:100});
elements.pixelArtCanvas.dispatch('pointermove',{button:0,pointerId:1,clientX:1000,clientY:-500});
elements.pixelArtCanvas.dispatch('pointerup',{button:0,pointerId:1,clientX:1000,clientY:-500});
const movedOffset=context.__HZH_PIXEL_ART_CORE__.getLayerOffset(moveLayer);
assert(movedOffset.x!==0||movedOffset.y!==0,'layer did not move beyond the document frame');
assert.deepStrictEqual(Array.from(moveLayer.pixels),moveBytes,'moving outside mutated stored pixels');
// Use controller-level inverse translation to model dragging the same layer back.
context.__HZH_PIXEL_ART_EDITOR__.controller.translateActiveLayer(-movedOffset.x,-movedOffset.y);
assert.strictEqual(JSON.stringify(context.__HZH_PIXEL_ART_CORE__.getLayerOffset(moveLayer)),JSON.stringify({x:0,y:0}));
assert.deepStrictEqual(Array.from(moveLayer.pixels),moveBytes,'returning layer mutated stored pixels');
context.__HZH_PIXEL_ART_EDITOR__.syncToPrefab();
assert(api.lastPayload && api.lastPayload.document,'artwork did not sync to prefab API');
assert.strictEqual(api.lastPayload.document.width,32);
assert.strictEqual(api.lastPayload.offsetX,-16);
assert.strictEqual(api.lastPayload.offsetY,-32);
// Left and right docks cycle through expanded -> compact -> hidden -> expanded.
elements.pixelToggleLeftDock.dispatch('click');
assert.strictEqual(elements.pixelWorkspaceShell.getAttribute('data-left-dock'),'compact');
elements.pixelToggleLeftDock.dispatch('click');
assert.strictEqual(elements.pixelWorkspaceShell.getAttribute('data-left-dock'),'hidden');
elements.pixelRestoreLeftDock.dispatch('click');
assert.strictEqual(elements.pixelWorkspaceShell.getAttribute('data-left-dock'),'expanded');
elements.pixelToggleRightDock.dispatch('click');
assert.strictEqual(elements.pixelWorkspaceShell.getAttribute('data-right-dock'),'compact');
elements.pixelToggleRightDock.dispatch('click');
assert.strictEqual(elements.pixelWorkspaceShell.getAttribute('data-right-dock'),'hidden');
elements.pixelRestoreRightDock.dispatch('click');
assert.strictEqual(elements.pixelWorkspaceShell.getAttribute('data-right-dock'),'expanded');
// Tab toggles a true canvas-focus mode without changing the document.
(listeners.keydown||[]).forEach(fn=>fn({target:body,key:'Tab',code:'Tab',preventDefault:noop}));
assert(elements.imageArtworkWorkspace.classList.contains('focusMode'));
(listeners.keydown||[]).forEach(fn=>fn({target:body,key:'Tab',code:'Tab',preventDefault:noop}));
assert(!elements.imageArtworkWorkspace.classList.contains('focusMode'));
console.log('pixel-art-editor-smoke.test.js: OK');
