const fs=require('fs');
const vm=require('vm');
const ctx={window:{},console};
ctx.window.__APP_NAMESPACE={bind(){}};
vm.createContext(ctx);
['src/core/domain/view-rotation-core.js','src/core/domain/item-facing-core.js'].forEach(rel=>{
  const code=fs.readFileSync(require('path').join(__dirname,'..',rel),'utf8');
  vm.runInContext(code,ctx,{filename:rel});
});
const itemApi=ctx.window.__ITEM_FACING_CORE__;
const viewApi=ctx.window.__VIEW_ROTATION_CORE__;
const prefab={id:'debug_cube_5faces',itemRotationDebug:true,semanticTextureMap:{top:{color:'#00f'},north:{color:'#f00'},east:{color:'#0f0'},south:{color:'#ff0'},west:{color:'#f0f'}}};
function iso(p,rot){return viewApi.worldToScreenWithViewRotation(p,rot,{tileW:80,tileH:40,originX:0,originY:0,cameraX:0,cameraY:0,worldBoundsOrOrigin:null});}
const results=[];
for(let rot=0; rot<4; rot++){
  const render=itemApi.buildDebugCuboidFaceRenderables({prefab,cells:[{x:0,y:0,z:0}],itemFacing:0,viewRotation:rot,ownerId:'selfcheck'});
  const by={};
  for(const face of render.faceRenderables){
    const pts=(face.worldPts||[]).map(p=>iso(p,rot));
    const cx=pts.reduce((a,p)=>a+p.x,0)/pts.length;
    const cy=pts.reduce((a,p)=>a+p.y,0)/pts.length;
    by[face.screenFace]={semanticFace:face.semanticFace,x:cx,y:cy};
  }
  const pass=by.lowerLeft && by.lowerRight && by.top && (by.lowerLeft.x < by.top.x) && (by.top.x < by.lowerRight.x);
  results.push({rotation:rot,lowerLeft:by.lowerLeft,lowerRight:by.lowerRight,top:by.top,passed:!!pass});
}
console.log(JSON.stringify(results,null,2));
