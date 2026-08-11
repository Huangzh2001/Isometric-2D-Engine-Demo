/*
 * Extracted from v17 src/presentation/lighting/lighting-editor.js
 * Reused axisHandle / projected-axis drag idea, generalized so it can move
 * caster, receiver boxes, and point lights with the same XYZ gizmo.
 */
(function(g){
  'use strict';
  function axisHandle(entity, axis, iso, length){
    length = Number(length || 1.05);
    var base = iso(entity.x, entity.y, entity.z);
    var target;
    if(axis==='x') target=iso(entity.x+length,entity.y,entity.z);
    else if(axis==='y') target=iso(entity.x,entity.y+length,entity.z);
    else target=iso(entity.x,entity.y,entity.z+length);
    return {base:base,target:target};
  }
  function hitAxis(entity,mx,my,iso,length,radius){
    var axes=['x','y','z'],best=null;
    radius=Number(radius||16);
    for(var i=0;i<axes.length;i++){
      var axis=axes[i], h=axisHandle(entity,axis,iso,length);
      var d=Math.hypot(mx-h.target.x,my-h.target.y);
      if(d<radius && (!best||d<best.d)) best={axis:axis,d:d};
    }
    return best?best.axis:null;
  }
  function dragDelta(startEntity,axis,startMouse,mouse,iso){
    var a0=iso(startEntity.x,startEntity.y,startEntity.z),a1;
    if(axis==='x') a1=iso(startEntity.x+1,startEntity.y,startEntity.z);
    else if(axis==='y') a1=iso(startEntity.x,startEntity.y+1,startEntity.z);
    else a1=iso(startEntity.x,startEntity.y,startEntity.z+1);
    var ux=a1.x-a0.x,uy=a1.y-a0.y;
    var len=Math.hypot(ux,uy)||1;
    var nx=ux/len,ny=uy/len;
    var dx=mouse.x-startMouse.x,dy=mouse.y-startMouse.y;
    return (dx*nx+dy*ny)/len;
  }
  g.AxisDragCore={axisHandle:axisHandle,hitAxis:hitAxis,dragDelta:dragDelta};
})(window);
