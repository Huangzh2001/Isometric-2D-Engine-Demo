'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
class ClassList { constructor(){this.s=new Set();} toggle(k,on){if(on===undefined)on=!this.s.has(k);on?this.s.add(k):this.s.delete(k);return on;} add(...v){v.forEach(x=>this.s.add(x));} remove(...v){v.forEach(x=>this.s.delete(x));} contains(k){return this.s.has(k);} }
class El {
  constructor(id=''){this.id=id;this.value='';this.textContent='';this.checked=true;this.attributes={};this.listeners={};this.classList=new ClassList();this.style={setProperty(){}};this.tagName='DIV';}
  addEventListener(t,f){(this.listeners[t]||(this.listeners[t]=[])).push(f);} dispatch(t,e={}){(this.listeners[t]||[]).forEach(f=>f(Object.assign({target:this,preventDefault(){}},e)));} dispatchEvent(e){this.dispatch(e.type,e);return true;}
  setAttribute(k,v){this.attributes[k]=String(v);} getAttribute(k){return this.attributes[k]??null;} getBoundingClientRect(){return {left:0,width:1000};}
  setPointerCapture(){} releasePointerCapture(){}
}
const ids=['voxelWorkspace','voxelWorkspaceShell','voxelToggleLeftDock','voxelToggleRightDock','voxelRestoreLeftDock','voxelRestoreRightDock','voxelEditMode','voxelAlignImageMode','voxelShowImageToggle','voxelInspectorShowImage','voxelFitView','previewScale','renderMode','voxelSplitHandle','voxelDualViewport','voxelInteractionHint','voxelCountInline','saveArtworkSummary','saveAlignmentSummary','spriteImageNameDisplay','spriteImageName','voxelFacingControl','voxelFacingStatus','voxelFacingInline','voxelFacingInspectorSummary','voxelTopdownFacingHint','voxelPreviewFacingHint','spriteFacingTransformHint'];
const els=Object.fromEntries(ids.map(id=>[id,new El(id)])); els.voxelWorkspaceShell.setAttribute('data-left-dock','expanded');els.voxelWorkspaceShell.setAttribute('data-right-dock','expanded');els.renderMode.value='sprite_proxy';els.previewScale.value='1';
const facingButtons=[0,1,2,3].map(i=>{const e=new El('f'+i);e.setAttribute('data-voxel-facing',String(i));return e;});
const tabButtons=['shape','alignment','display'].map(name=>{const e=new El();e.setAttribute('data-voxel-tab',name);return e;});
const panels=['shape','alignment','display'].map(name=>{const e=new El();e.setAttribute('data-voxel-panel',name);return e;});
const body=new El('body');body.dataset={editorStep:'voxel'};
const document={readyState:'complete',body,getElementById:id=>els[id]||null,querySelectorAll(sel){if(sel==='[data-voxel-facing]')return facingButtons;if(sel==='[data-voxel-tab]')return tabButtons;if(sel==='[data-voxel-panel]')return panels;return [];},addEventListener(){}};
const events={};let facing=0;let pixelFacing=-1;
const api={setInteractionMode(){},getInteractionMode(){return 'voxel';},getSpriteTransform(){return {hasImage:true};},setStatus(){},requestRender(){},getVoxelViewFacing(){return facing;},setVoxelViewFacing(v){facing=Number(v);},getPrefabDraft(){return {voxels:[],artwork:{width:32,height:32,facings:[{layers:[]},{layers:[]},{layers:[]},{layers:[]}]},sprite:{scale:1,offsetPx:{x:0,y:0},facingTransforms:[{},{},{},{}]}};}};
const context={console,document,window:null,globalThis:null,App:{editor:{unifiedV18:api}},__HZH_PIXEL_ART_EDITOR__:{setActiveFacing(v){pixelFacing=Number(v);}},requestAnimationFrame:fn=>{fn();return 1;},localStorage:{getItem(){return null;},setItem(){}},Event:class{},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init&&init.detail;}},addEventListener(t,f){(events[t]||(events[t]=[])).push(f);},dispatchEvent(){}};
context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync('src/presentation/editor/voxel-workspace.js','utf8'),context,{filename:'voxel-workspace.js'});
assert(context.__HZH_VOXEL_WORKSPACE__,'workspace API missing');
facingButtons[2].dispatch('click');
assert.strictEqual(facing,2,'editor facing not switched');
assert.strictEqual(pixelFacing,2,'pixel editor facing not synchronized');
assert(facingButtons[2].classList.contains('activeVoxelFacing'),'active direction style not updated');
assert.strictEqual(els.voxelFacingInline.textContent,'方向：南');
context.__HZH_VOXEL_WORKSPACE__.setFacing(3,'test');
assert.strictEqual(facing,3);
assert.strictEqual(els.voxelFacingStatus.textContent,'西 · 方向 3');
console.log('voxel-four-facing-workspace-runtime.test.js: OK');
