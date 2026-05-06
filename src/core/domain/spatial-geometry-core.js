// Core spatial geometry helpers.
// Pure data/geometry utilities only: no DOM, no canvas context, no storage, no platform API.

(function (global) {
  'use strict';

  function pointInPoly(p, poly) {
    var inside = false;
    var pts = Array.isArray(poly) ? poly : [];
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i].x;
      var yi = pts[i].y;
      var xj = pts[j].x;
      var yj = pts[j].y;
      var intersect = ((yi > p.y) !== (yj > p.y)) &&
        (p.x < (xj - xi) * (p.y - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function polyBounds(poly) {
    var pts = Array.isArray(poly) ? poly : [];
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function overlap2D(a, b) {
    return !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxY <= b.minY || a.minY >= b.maxY);
  }

  function isBehind(a, b) {
    var eps = typeof global.EPS === 'number' ? global.EPS : 1e-5;
    return a.maxX <= b.minX + eps || a.maxY <= b.minY + eps || a.maxZ <= b.minZ + eps;
  }

  function makeAABB(x, y, z, w, d, h) {
    return { minX: x, maxX: x + w, minY: y, maxY: y + d, minZ: z, maxZ: z + h };
  }

  function rectCircleCollide(cx, cy, cr, rx, ry, rw, rh) {
    var nx = Math.max(rx, Math.min(cx, rx + rw));
    var ny = Math.max(ry, Math.min(cy, ry + rh));
    var dx = cx - nx;
    var dy = cy - ny;
    return dx * dx + dy * dy < cr * cr;
  }

  function boxRectOverlap3D(a, b) {
    return a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.d &&
      a.y + a.d > b.y &&
      a.z < b.z + b.h &&
      a.z + a.h > b.z;
  }

  function buildOccupancy(boxList) {
    var occ = new Map();
    var boxes = Array.isArray(boxList) ? boxList : [];
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      for (var x = b.x; x < b.x + b.w; x++) {
        for (var y = b.y; y < b.y + b.d; y++) {
          for (var z = b.z; z < b.z + b.h; z++) {
            occ.set(String(x) + ',' + String(y) + ',' + String(z), { box: b, x: x, y: y, z: z });
          }
        }
      }
    }
    return occ;
  }

  var api = {
    pointInPoly: pointInPoly,
    polyBounds: polyBounds,
    overlap2D: overlap2D,
    isBehind: isBehind,
    makeAABB: makeAABB,
    rectCircleCollide: rectCircleCollide,
    boxRectOverlap3D: boxRectOverlap3D,
    buildOccupancy: buildOccupancy
  };

  global.IsometricSpatialGeometryCore = api;

  // Keep global function names for the current non-module script loading model.
  // These are now owned by core, not by presentation/render/render.js.
  global.pointInPoly = pointInPoly;
  global.polyBounds = polyBounds;
  global.overlap2D = overlap2D;
  global.isBehind = isBehind;
  global.makeAABB = makeAABB;
  global.rectCircleCollide = rectCircleCollide;
  global.boxRectOverlap3D = boxRectOverlap3D;
  global.buildOccupancy = buildOccupancy;
})(window);
