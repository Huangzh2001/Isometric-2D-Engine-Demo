/*
 * Minimal extraction of the existing v17 voxel-shadow projection math from
 * src/presentation/render/logic.js. Kept separate so the lab can render the
 * old boxy voxel shadow next to the new sprite-alpha projection.
 */
(function(g){
'use strict';
function dot3(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function len3(a){return Math.hypot(a.x,a.y,a.z)||1;}
function normalize3(a){var l=len3(a);return{x:a.x/l,y:a.y/l,z:a.z/l};}
function shadowProjectionDirection(light,point){
  if(light && light.type==='directional') return normalize3(light.forward);
  var src=light;
  return normalize3({x:point.x-src.x,y:point.y-src.y,z:point.z-src.z});
}
function projectPointToPlaneAlongShadow(light, point, planePoint, planeNormal, eps){
  eps=eps||1e-6;
  var d=shadowProjectionDirection(light,point);
  var denom=dot3(planeNormal,d);
  if(Math.abs(denom)<=eps)return null;
  var t=dot3(planeNormal,{x:planePoint.x-point.x,y:planePoint.y-point.y,z:planePoint.z-point.z})/denom;
  if(!isFinite(t))return null;
  if(light && light.type==='directional') { if(t < -eps) return null; }
  else { if(t < -1 + eps) return null; }
  return{x:point.x+d.x*t,y:point.y+d.y*t,z:point.z+d.z*t};
}
function convexHull2(points){
  if(points.length<=1)return points.slice();
  var pts=points.slice().sort(function(a,b){return a.x===b.x?a.y-b.y:a.x-b.x;});
  function cross(o,a,b){return(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);}
  var lower=[];for(var i=0;i<pts.length;i++){var p=pts[i];while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
  var upper=[];for(var j=pts.length-1;j>=0;j--){var q=pts[j];while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],q)<=0)upper.pop();upper.push(q);}
  lower.pop();upper.pop();return lower.concat(upper);
}
function boxCorners(box){
  var x=box.x,y=box.y,z=box.z,w=box.w,d=box.d,h=box.h;
  return[{x:x,y:y,z:z},{x:x+w,y:y,z:z},{x:x+w,y:y+d,z:z},{x:x,y:y+d,z:z},{x:x,y:y,z:z+h},{x:x+w,y:y,z:z+h},{x:x+w,y:y+d,z:z+h},{x:x,y:y+d,z:z+h}];
}
g.OriginalVoxelShadowMath={projectPointToPlaneAlongShadow:projectPointToPlaneAlongShadow,convexHull2:convexHull2,boxCorners:boxCorners};
})(window);
