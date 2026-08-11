(function(g){
'use strict';
var EPS=1e-8;
var V={
 add:function(a,b){return{x:a.x+b.x,y:a.y+b.y,z:a.z+b.z};},
 sub:function(a,b){return{x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};},
 mul:function(a,s){return{x:a.x*s,y:a.y*s,z:a.z*s};},
 dot:function(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;},
 cross:function(a,b){return{x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};},
 len:function(a){return Math.hypot(a.x,a.y,a.z);},
 norm:function(a){var l=Math.hypot(a.x,a.y,a.z)||1;return{x:a.x/l,y:a.y/l,z:a.z/l};}
};
function screenFacingU(viewRotation){var k=((Number(viewRotation||0)%4)+4)%4;return V.norm([{x:1,y:-1,z:0},{x:1,y:1,z:0},{x:-1,y:1,z:0},{x:-1,y:-1,z:0}][k]);}
function spriteFrame(caster,asset,viewRotation){
 var u=screenFacingU(viewRotation),v={x:0,y:0,z:1},n=V.norm(V.cross(u,v));
 var aw=Math.max(1,asset.width),ah=Math.max(1,asset.height),anchor=asset.anchorPx||{x:aw/2,y:ah};
 return{C:{x:caster.x,y:caster.y,z:caster.z},u:u,v:v,n:n,widthPx:aw,heightPx:ah,anchorPx:{x:anchor.x,y:anchor.y},worldW:caster.visualW,worldH:caster.visualH};
}
function worldFromSpritePixel(frame,px,py){
 var du=(px-frame.anchorPx.x)*(frame.worldW/frame.widthPx),dz=(frame.anchorPx.y-py)*(frame.worldH/frame.heightPx);
 return V.add(frame.C,V.add(V.mul(frame.u,du),V.mul(frame.v,dz)));
}
function receiverPointToSpritePixel(Q,frame,light){
 var P=null,travel=0;
 if(light.type==='directional'){
  var d=light.forward,den=V.dot(frame.n,d);if(Math.abs(den)<EPS)return null;
  var t=V.dot(frame.n,V.sub(Q,frame.C))/den;if(!(t>=0)||!Number.isFinite(t))return null;
  P=V.sub(Q,V.mul(d,t));travel=t;
 }else{
  var L=light,toward=V.sub(L,Q),den2=V.dot(frame.n,toward);if(Math.abs(den2)<EPS)return null;
  var s=V.dot(frame.n,V.sub(frame.C,Q))/den2;if(!(s>0&&s<1)||!Number.isFinite(s))return null;
  P=V.add(Q,V.mul(toward,s));travel=s;
 }
 var rel=V.sub(P,frame.C),px=frame.anchorPx.x+V.dot(rel,frame.u)/frame.worldW*frame.widthPx,py=frame.anchorPx.y-V.dot(rel,frame.v)/frame.worldH*frame.heightPx;
 if(px<-.5||px>frame.widthPx-.5||py<-.5||py>frame.heightPx-.5)return null;
 return{px:px,py:py,P:P,travel:travel};
}
function projectSpritePointToPlane(P,planePoint,planeNormal,light){
 if(light.type==='directional'){
  var d=light.forward,den=V.dot(planeNormal,d);if(Math.abs(den)<EPS)return null;
  var t=V.dot(planeNormal,V.sub(planePoint,P))/den;if(!(t>=0)||!Number.isFinite(t))return null;
  return V.add(P,V.mul(d,t));
 }
 var L=light,dir=V.sub(P,L),den2=V.dot(planeNormal,dir);if(Math.abs(den2)<EPS)return null;
 var t2=V.dot(planeNormal,V.sub(planePoint,L))/den2;if(!(t2>=1)||!Number.isFinite(t2))return null;
 return V.add(L,V.mul(dir,t2));
}
function spriteCorners(frame){return[
 worldFromSpritePixel(frame,0,0),worldFromSpritePixel(frame,frame.widthPx,0),worldFromSpritePixel(frame,frame.widthPx,frame.heightPx),worldFromSpritePixel(frame,0,frame.heightPx)
];}
g.ShadowProjectorMath={V:V,screenFacingU:screenFacingU,spriteFrame:spriteFrame,worldFromSpritePixel:worldFromSpritePixel,receiverPointToSpritePixel:receiverPointToSpritePixel,projectSpritePointToPlane:projectSpritePointToPlane,spriteCorners:spriteCorners};
})(window);