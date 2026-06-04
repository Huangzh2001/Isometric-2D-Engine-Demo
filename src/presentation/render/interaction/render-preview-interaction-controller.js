/*
 * P11a-3 render preview / selection interaction controller.
 *
 * Owner: src/presentation/render/interaction/
 * Purpose: centralize preview update and screen picking flow that previously
 * lived directly in presentation/render/render.js.
 *
 * This module is presentation interaction code. It may orchestrate injected
 * render-facing dependencies such as editor state, mouse state, screen-to-floor
 * projection, surface face picking, and placement candidate evaluation. It must
 * not perform Canvas drawing, DOM mutation, storage, fetch, or scene/prefab
 * persistence. render.js should keep only thin wrappers around this API.
 */
(function attachRenderPreviewInteractionController(global) {
  'use strict';

  function getWindow() {
    return global || (typeof window !== 'undefined' ? window : null);
  }

  function call(fn, fallback) {
    try {
      if (typeof fn === 'function') return fn();
    } catch (_) {}
    return fallback;
  }

  function getDeps(input) {
    return input && input.deps ? input.deps : (input || {});
  }

  var __lastPreviewAlignmentCandidateSignature = '';
  var __lastPreviewAlignmentCandidateAt = 0;

  function roundPreviewAlignmentNumber(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) return null;
    var m = Math.pow(10, digits == null ? 2 : digits);
    return Math.round(n * m) / m;
  }

  function emitPreviewAlignmentCandidate(deps, payload, options) {
    payload = payload || {};
    options = options || {};
    payload.phase = String(payload.phase || 'preview-candidate');
    payload.source = payload.source || 'src/presentation/render/interaction/render-preview-interaction-controller.js';
    payload.timestamp = Date.now();
    try { if (global) global.__PIXI_PREVIEW_ALIGNMENT_LAST_CANDIDATE__ = payload; } catch (_) {}
    try {
      var line = '[PIXI-PREVIEW-ALIGNMENT] ' + JSON.stringify(payload);
      var now = Date.now();
      var sig = JSON.stringify({ phase: payload.phase, mode: payload.mode, prefabId: payload.prefabId, mouse: payload.mouse, cell: payload.chosenCell, origin: payload.previewOrigin });
      if (!options.force && sig === __lastPreviewAlignmentCandidateSignature && now - __lastPreviewAlignmentCandidateAt < 900) return;
      if (!options.force && now - __lastPreviewAlignmentCandidateAt < 280) return;
      __lastPreviewAlignmentCandidateSignature = sig;
      __lastPreviewAlignmentCandidateAt = now;
      if (deps && typeof deps.detailLog === 'function') deps.detailLog(line);
      else if (deps && typeof deps.pushLog === 'function') deps.pushLog(line);
      else if (global && typeof global.detailLog === 'function') global.detailLog(line);
      else if (global && typeof global.pushLog === 'function') global.pushLog(line);
      else if (global && global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function getBoxes(deps) {
    var boxes = deps && deps.boxes;
    if (typeof boxes === 'function') boxes = call(boxes, []);
    return Array.isArray(boxes) ? boxes : [];
  }

  function getSubTileGridSubdivisionForPreview(deps) {
    // Prefer the live UI/runtime value. The previous implementation could read
    // a stale global settings object first, so compatible_axis_block stayed at
    // N=1 even after the Subdivision input was changed.
    try {
      var root = getWindow();
      var input = root && root.document && root.document.getElementById ? root.document.getElementById('mainCameraSubTileGridSubdivision') : null;
      var fromInput = Number(input && input.value);
      if (Number.isFinite(fromInput)) return Math.max(1, Math.min(64, Math.round(fromInput)));
    } catch (_) {}
    try {
      var runtime = global && global.App && global.App.state && global.App.state.runtimeState;
      if (runtime && typeof runtime.getEditorCameraSettingsValue === 'function') {
        var settings = runtime.getEditorCameraSettingsValue();
        var fromState = Number(settings && settings.subTileGridSubdivision);
        if (Number.isFinite(fromState)) return Math.max(1, Math.min(64, Math.round(fromState)));
      }
    } catch (_) {}
    try {
      var root2 = getWindow();
      var direct = root2 && root2.settings ? Number(root2.settings.subTileGridSubdivision) : NaN;
      if (Number.isFinite(direct)) return Math.max(1, Math.min(64, Math.round(direct)));
    } catch (_) {}
    return 1;
  }

  function isMicroTriPrismPrefab(prefab) {
    return String(prefab && prefab.id || '') === 'micro_tri_prism';
  }

  function isCompatibleAxisBlockPrefab(prefab) {
    return String(prefab && prefab.id || '') === 'compatible_axis_block';
  }

  function isDerivedAxisUnitPrefab(prefab) {
    return String(prefab && prefab.id || '') === 'derived_axis_unit_block';
  }

  function resolveDerivedAxisUnitOriginFromFloor(floor) {
    var fx = Number(floor && floor.x);
    var fy = Number(floor && floor.y);
    if (!Number.isFinite(fx)) fx = 0;
    if (!Number.isFinite(fy)) fy = 0;
    // Derived-axis units live on the single master diamond grid, but their
    // natural tiling lattice is the lattice formed by diamond edge centres.
    // In world coordinates this is the half-step lattice where x+y and x-y
    // are integers. Snapping with u=x+y, v=x-y lets adjacent units share full
    // edges instead of touching only at a point.
    var u = Math.round(fx + fy);
    var v = Math.round(fx - fy);
    return {
      x: (u + v) / 2,
      y: (u - v) / 2,
      u: u,
      v: v,
      snapKind: 'derived-axis-edge-center-lattice'
    };
  }

  function resolveMicroTriFromFloor(floor, deps) {
    var fx = Number(floor && floor.x);
    var fy = Number(floor && floor.y);
    if (!Number.isFinite(fx)) fx = 0;
    if (!Number.isFinite(fy)) fy = 0;
    var cellX = Math.floor(fx);
    var cellY = Math.floor(fy);
    var subdivision = getSubTileGridSubdivisionForPreview(deps);
    var localX = fx - cellX;
    var localY = fy - cellY;
    if (localX < 0) localX += 1;
    if (localY < 0) localY += 1;
    var subX = Math.max(0, Math.min(subdivision - 1, Math.floor(localX * subdivision)));
    var subY = Math.max(0, Math.min(subdivision - 1, Math.floor(localY * subdivision)));
    var sx0 = subX / subdivision;
    var sy0 = subY / subdivision;
    var s = 1 / subdivision;
    var lx = (localX - sx0) / s;
    var ly = (localY - sy0) / s;
    var triIndex;
    if (ly <= lx && ly <= 1 - lx) triIndex = 0;
    else if (lx >= ly && lx >= 1 - ly) triIndex = 1;
    else if (ly >= lx && ly >= 1 - lx) triIndex = 2;
    else triIndex = 3;
    return {
      subdivision: subdivision,
      cellX: cellX,
      cellY: cellY,
      subX: subX,
      subY: subY,
      baseTriIndex: triIndex,
      rawTriIndex: triIndex,
      rotation: 0,
      triIndex: triIndex,
      localX: localX,
      localY: localY,
      microLocalX: lx,
      microLocalY: ly,
      originX: cellX + sx0,
      originY: cellY + sy0,
      h: 1
    };
  }

  function applyMicroTriRotation(microTri, rotation) {
    var m = Object.assign({}, microTri || {});
    var baseTriIndex = Math.max(0, Math.min(3, Math.round(Number(m.baseTriIndex != null ? m.baseTriIndex : (m.rawTriIndex != null ? m.rawTriIndex : m.triIndex)) || 0)));
    var r = (((Math.round(Number(rotation != null ? rotation : m.rotation) || 0) % 4) + 4) % 4);
    m.baseTriIndex = baseTriIndex;
    m.rawTriIndex = baseTriIndex;
    m.rotation = r;
    m.triIndex = (baseTriIndex + r) % 4;
    return m;
  }

  function buildMicroTriPreviewProto(basePrefab, microTri) {
    var base = Object.assign({}, basePrefab || {});
    var m = applyMicroTriRotation(microTri || resolveMicroTriFromFloor({ x: 0, y: 0 }, null), base && base.rotation != null ? base.rotation : 0);
    var s = 1 / Math.max(1, Number(m.subdivision) || 1);
    var x0 = Number(m.subX || 0) * s;
    var y0 = Number(m.subY || 0) * s;
    var c = { x: x0 + s / 2, y: y0 + s / 2 };
    var verts;
    switch (Number(m.triIndex) || 0) {
      case 1: verts = [{ x: x0 + s, y: y0 }, { x: x0 + s, y: y0 + s }, c]; break;
      case 2: verts = [{ x: x0 + s, y: y0 + s }, { x: x0, y: y0 + s }, c]; break;
      case 3: verts = [{ x: x0, y: y0 + s }, { x: x0, y: y0 }, c]; break;
      case 0:
      default: verts = [{ x: x0, y: y0 }, { x: x0 + s, y: y0 }, c]; break;
    }
    var minX = Math.min(verts[0].x, verts[1].x, verts[2].x);
    var minY = Math.min(verts[0].y, verts[1].y, verts[2].y);
    var maxX = Math.max(verts[0].x, verts[1].x, verts[2].x);
    var maxY = Math.max(verts[0].y, verts[1].y, verts[2].y);
    base.id = 'micro_tri_prism';
    base.kind = 'micro_tri_prism';
    base.name = base.name || 'Micro Tri Prism';
    base.base = base.base || '#e39b4f';
    base.renderUpdateMode = 'dynamic';
    base.supportCells = [{ x: 0, y: 0, localZ: 0 }];
    base.voxels = [{ x: minX, y: minY, z: 0, w: Math.max(0.001, maxX - minX), d: Math.max(0.001, maxY - minY), h: 1, renderHidden: true, collisionOnly: true, shapeKind: 'micro_tri_prism', collisionPolygon2d: verts, base: base.base }];
    base.primitives = [{ id: 'micro-tri-preview', kind: 'vertical_tri_prism', primitiveKind: 'vertical_tri_prism', vertices2d: verts, z: 0, h: 1, sortCell: { x: 0, y: 0, z: 0 }, base: base.base, shapeKind: 'micro_tri_prism' }];
    base.w = Math.max(1, maxX);
    base.d = Math.max(1, maxY);
    base.h = 1;
    base.microTri = m;
    return base;
  }


  function pointInPolygon2dCompat(pt, poly) {
    var x = Number(pt && pt.x || 0);
    var y = Number(pt && pt.y || 0);
    var vs = Array.isArray(poly) ? poly : [];
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      var xi = Number(vs[i] && vs[i].x || 0), yi = Number(vs[i] && vs[i].y || 0);
      var xj = Number(vs[j] && vs[j].x || 0), yj = Number(vs[j] && vs[j].y || 0);
      var cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi);
      var dot = (x - xi) * (xj - xi) + (y - yi) * (yj - yi);
      var len2 = (xj - xi) * (xj - xi) + (yj - yi) * (yj - yi);
      if (Math.abs(cross) < 1e-9 && dot >= -1e-9 && dot <= len2 + 1e-9) return true;
      var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function getPolygonBounds2dCompat(points) {
    var pts = Array.isArray(points) ? points : [];
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      var x = Number(pts[i] && pts[i].x || 0);
      var y = Number(pts[i] && pts[i].y || 0);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return { x: 0, y: 0, w: 1, d: 1 };
    return { x: minX, y: minY, w: Math.max(0.001, maxX - minX), d: Math.max(0.001, maxY - minY) };
  }

  function buildMicroTriVerticesFromCell(cellX, cellY, subX, subY, triIndex, subdivision) {
    var n = Math.max(1, Math.min(64, Math.round(Number(subdivision) || 1)));
    var s = 1 / n;
    var x0 = Number(cellX || 0) + Math.max(0, Math.min(n - 1, Math.round(Number(subX) || 0))) * s;
    var y0 = Number(cellY || 0) + Math.max(0, Math.min(n - 1, Math.round(Number(subY) || 0))) * s;
    var c = { x: x0 + s / 2, y: y0 + s / 2 };
    switch (Math.max(0, Math.min(3, Math.round(Number(triIndex) || 0)))) {
      case 1: return [{ x: x0 + s, y: y0 }, { x: x0 + s, y: y0 + s }, c];
      case 2: return [{ x: x0 + s, y: y0 + s }, { x: x0, y: y0 + s }, c];
      case 3: return [{ x: x0, y: y0 + s }, { x: x0, y: y0 }, c];
      case 0:
      default: return [{ x: x0, y: y0 }, { x: x0 + s, y: y0 }, c];
    }
  }

  function centroidOfTriangle2d(verts) {
    return {
      x: (Number(verts[0].x || 0) + Number(verts[1].x || 0) + Number(verts[2].x || 0)) / 3,
      y: (Number(verts[0].y || 0) + Number(verts[1].y || 0) + Number(verts[2].y || 0)) / 3
    };
  }

  function normalizeCompatibleAxisPreviewMeta(meta) {
    var safe = meta && typeof meta === 'object' ? meta : {};
    var subdivision = Math.max(1, Math.min(64, Math.round(Number(safe.subdivision) || 1)));
    var k = Math.max(1, Math.round(Number(safe.k) || (2 * subdivision / Math.sqrt(3))));
    var atomStep = Math.sqrt(3) / (2 * subdivision);
    var rotation = ((Math.round(Number(safe.rotation) || 0) % 4) + 4) % 4;
    return Object.assign({}, safe, {
      subdivision: subdivision,
      subX: Math.max(0, Math.min(subdivision - 1, Math.round(Number(safe.subX) || 0))),
      subY: Math.max(0, Math.min(subdivision - 1, Math.round(Number(safe.subY) || 0))),
      rotation: rotation,
      k: k,
      atomStep: atomStep,
      targetLength: 1,
      approximatedLength: k * atomStep,
      errorAbs: Math.abs(k * atomStep - 1),
      errorPctOfOne: Math.abs(k * atomStep - 1) * 100,
      h: Math.max(0.001, Number(safe.h) || 1)
    });
  }

  function buildCompatibleAxisLocalPolygon(meta) {
    var m = normalizeCompatibleAxisPreviewMeta(meta || {});
    var s = 1 / m.subdivision;
    var x0 = Number(m.subX || 0) * s;
    var y0 = Number(m.subY || 0) * s;
    var exact = 0.5;
    var approx = Math.max(0.001, Number(m.k || 1) / (2 * m.subdivision));
    var e1;
    var e2;
    if (m.rotation === 1) {
      e1 = { x: approx, y: approx };
      e2 = { x: -exact, y: exact };
    } else if (m.rotation === 2) {
      e1 = { x: -exact, y: exact };
      e2 = { x: -approx, y: -approx };
    } else if (m.rotation === 3) {
      e1 = { x: -approx, y: -approx };
      e2 = { x: exact, y: -exact };
    } else {
      e1 = { x: exact, y: -exact };
      e2 = { x: approx, y: approx };
    }
    return [
      { x: x0, y: y0 },
      { x: x0 + e1.x, y: y0 + e1.y },
      { x: x0 + e1.x + e2.x, y: y0 + e1.y + e2.y },
      { x: x0 + e2.x, y: y0 + e2.y }
    ];
  }

  function buildCompatibleAxisLocalAtoms(meta) {
    var m = normalizeCompatibleAxisPreviewMeta(meta || {});
    var n = Math.max(1, Math.min(64, Math.round(Number(m.subdivision) || 1)));
    var k = Math.max(1, Math.round(Number(m.k) || (2 * n / Math.sqrt(3))));
    var halfStep = 1 / (2 * n);
    var r = ((Math.round(Number(m.rotation) || 0) % 4) + 4) % 4;
    var exactDir;
    var approxDir;
    if (r === 1) {
      exactDir = { x: 1, y: 1 };
      approxDir = { x: -1, y: 1 };
    } else if (r === 2) {
      exactDir = { x: -1, y: 1 };
      approxDir = { x: -1, y: -1 };
    } else if (r === 3) {
      exactDir = { x: -1, y: -1 };
      approxDir = { x: 1, y: -1 };
    } else {
      exactDir = { x: 1, y: -1 };
      approxDir = { x: 1, y: 1 };
    }
    var exactStep = { x: exactDir.x * halfStep, y: exactDir.y * halfStep };
    var approxStep = { x: approxDir.x * halfStep, y: approxDir.y * halfStep };
    var s = 1 / n;
    var origin = { x: Number(m.subX || 0) * s, y: Number(m.subY || 0) * s };
    var atoms = [];
    var allPts = [];
    function sortCellFromVerts(verts) {
      var cx = (Number(verts[0].x || 0) + Number(verts[1].x || 0) + Number(verts[2].x || 0)) / 3;
      var cy = (Number(verts[0].y || 0) + Number(verts[1].y || 0) + Number(verts[2].y || 0)) / 3;
      return { x: Math.floor(cx), y: Math.floor(cy) };
    }
    function pushTri(verts, exactIndex, approxIndex, splitIndex) {
      var sc = sortCellFromVerts(verts);
      for (var p = 0; p < verts.length; p++) allPts.push(verts[p]);
      atoms.push({
        cellX: sc.x,
        cellY: sc.y,
        subX: 0,
        subY: 0,
        triIndex: splitIndex,
        verts: verts,
        exactIndex: exactIndex,
        approxIndex: approxIndex,
        splitIndex: splitIndex,
        sortCell: sc
      });
    }
    for (var b = 0; b < k; b++) {
      for (var a = 0; a < n; a++) {
        var p0 = {
          x: origin.x + exactStep.x * a + approxStep.x * b,
          y: origin.y + exactStep.y * a + approxStep.y * b
        };
        var p1 = { x: p0.x + exactStep.x, y: p0.y + exactStep.y };
        var p2 = { x: p1.x + approxStep.x, y: p1.y + approxStep.y };
        var p3 = { x: p0.x + approxStep.x, y: p0.y + approxStep.y };
        pushTri([p0, p1, p2], a, b, 0);
        pushTri([p0, p2, p3], a, b, 1);
      }
    }
    var footprint = [
      origin,
      { x: origin.x + exactStep.x * n, y: origin.y + exactStep.y * n },
      { x: origin.x + exactStep.x * n + approxStep.x * k, y: origin.y + exactStep.y * n + approxStep.y * k },
      { x: origin.x + approxStep.x * k, y: origin.y + approxStep.y * k }
    ];
    var actualBounds = getPolygonBounds2dCompat(allPts.length ? allPts : footprint);
    return {
      meta: Object.assign({}, m, {
        k: k,
        atomCount: atoms.length,
        generatedMode: 'integer-atom-strip',
        actualBounds: actualBounds,
        exactAtomCount: n,
        approximateAtomCount: k
      }),
      polygon: footprint,
      atoms: atoms
    };
  }


  function resolveCompatibleAxisFromFloor(floor, deps) {
    var fx = Number(floor && floor.x);
    var fy = Number(floor && floor.y);
    if (!Number.isFinite(fx)) fx = 0;
    if (!Number.isFinite(fy)) fy = 0;
    var cellX = Math.floor(fx);
    var cellY = Math.floor(fy);
    var subdivision = getSubTileGridSubdivisionForPreview(deps);
    var localX = fx - cellX;
    var localY = fy - cellY;
    if (localX < 0) localX += 1;
    if (localY < 0) localY += 1;
    var subX = Math.max(0, Math.min(subdivision - 1, Math.floor(localX * subdivision)));
    var subY = Math.max(0, Math.min(subdivision - 1, Math.floor(localY * subdivision)));
    var k = Math.max(1, Math.round(2 * subdivision / Math.sqrt(3)));
    var atomStep = Math.sqrt(3) / (2 * subdivision);
    var approximatedLength = k * atomStep;
    return {
      subdivision: subdivision,
      cellX: cellX,
      cellY: cellY,
      subX: subX,
      subY: subY,
      rotation: 0,
      k: k,
      atomStep: atomStep,
      targetLength: 1,
      approximatedLength: approximatedLength,
      errorAbs: Math.abs(approximatedLength - 1),
      errorPctOfOne: Math.abs(approximatedLength - 1) * 100,
      h: 1
    };
  }

  function buildCompatibleAxisPreviewProto(basePrefab, compatibleAxis) {
    var base = Object.assign({}, basePrefab || {});
    var built = buildCompatibleAxisLocalAtoms(compatibleAxis || resolveCompatibleAxisFromFloor({ x: 0, y: 0 }, null));
    var m = built.meta;
    base.id = 'compatible_axis_block';
    base.kind = 'compatible_axis_block';
    base.name = base.name || 'Compatible Axis Block';
    base.base = base.base || '#5dbb8a';
    base.renderUpdateMode = 'dynamic';
    base.supportCells = [{ x: 0, y: 0, localZ: 0 }];
    base.voxels = [];
    base.primitives = [];
    var overall = getPolygonBounds2dCompat(built.polygon);
    for (var i = 0; i < built.atoms.length; i++) {
      var atom = built.atoms[i];
      var verts = atom.verts;
      var b = getPolygonBounds2dCompat(verts);
      base.voxels.push({ x: b.x, y: b.y, z: 0, w: b.w, d: b.d, h: 1, renderHidden: true, collisionOnly: true, shapeKind: 'compatible_axis_block_atom', collisionPolygon2d: verts, base: base.base, compatibleAxisAtomIndex: i });
      base.primitives.push({ id: 'compatible-axis-preview-atom-' + i, kind: 'vertical_tri_prism', primitiveKind: 'vertical_tri_prism', vertices2d: verts, z: 0, h: 1, sortCell: { x: (atom.sortCell && atom.sortCell.x != null ? atom.sortCell.x : atom.cellX), y: (atom.sortCell && atom.sortCell.y != null ? atom.sortCell.y : atom.cellY), z: 0 }, sortFootprint: { w: 1 / m.subdivision, d: 1 / m.subdivision }, base: base.base, shapeKind: 'compatible_axis_block_atom', compatibleAxisAtomIndex: i });
    }
    base.w = Math.max(1, overall.x + overall.w);
    base.d = Math.max(1, overall.y + overall.d);
    base.h = 1;
    base.compatibleAxis = Object.assign({}, m, { atomCount: built.atoms.length, generatedMode: built.meta.generatedMode || 'integer-atom-strip', exactAtomCount: built.meta.exactAtomCount, approximateAtomCount: built.meta.approximateAtomCount, actualBounds: built.meta.actualBounds || null, renderMode: 'micro-tri-atom-composite' });
    return base;
  }

  function pickBoxAtScreen(input) {
    var deps = getDeps(input);
    var sx = Number(input && input.sx);
    var sy = Number(input && input.sy);
    var p = { x: Number.isFinite(sx) ? sx : 0, y: Number.isFinite(sy) ? sy : 0 };
    var buildSurfaceFaces = deps.buildSurfaceFaces;
    var pointInPoly = deps.pointInPoly;
    if (typeof buildSurfaceFaces !== 'function' || typeof pointInPoly !== 'function') return null;
    var boxes = getBoxes(deps);
    var xrayFaces = typeof deps.xrayFaces === 'function' ? call(deps.xrayFaces, false) : !!deps.xrayFaces;
    var faces = buildSurfaceFaces(boxes, 1, xrayFaces).sort(function (a, b) { return a.fallbackDepth - b.fallbackDepth; });
    var picked = null;
    for (var i = 0; i < faces.length; i++) {
      var f = faces[i];
      if (!pointInPoly(p, f.poly)) continue;
      if (!picked || f.fallbackDepth >= picked.depth) {
        var box = boxes.find(function (b) { return b.id === f.boxId; });
        if (box) picked = { box: box, depth: f.fallbackDepth };
      }
    }
    return picked ? picked.box : null;
  }

  function pickFaceAtScreen(input) {
    var deps = getDeps(input);
    var sx = Number(input && input.sx);
    var sy = Number(input && input.sy);
    var includeHidden = input ? input.includeHidden : undefined;
    var p = { x: Number.isFinite(sx) ? sx : 0, y: Number.isFinite(sy) ? sy : 0 };
    var buildSurfaceFaces = deps.buildSurfaceFaces;
    var pointInPoly = deps.pointInPoly;
    if (typeof buildSurfaceFaces !== 'function' || typeof pointInPoly !== 'function') return null;
    var boxes = getBoxes(deps);
    var xrayFaces = typeof deps.xrayFaces === 'function' ? call(deps.xrayFaces, false) : !!deps.xrayFaces;
    var faces = buildSurfaceFaces(boxes, 1, includeHidden == null ? xrayFaces : includeHidden).sort(function (a, b) { return a.fallbackDepth - b.fallbackDepth; });
    var picked = null;
    for (var i = 0; i < faces.length; i++) {
      var f = faces[i];
      if (!pointInPoly(p, f.poly)) continue;
      if (!picked || f.fallbackDepth >= picked.fallbackDepth) picked = f;
    }
    return picked || null;
  }



  function isStairPreview(prefabId) {
    return /^stair_mc_(2|4|8)step$/.test(String(prefabId || ''));
  }

  function summarizeTraceBoxes(boxes) {
    var list = Array.isArray(boxes) ? boxes : [];
    return list.map(function (b, i) {
      return {
        i: i,
        id: b && b.id != null ? b.id : null,
        instanceId: b && b.instanceId || null,
        prefabId: b && b.prefabId || null,
        role: b && b.stairRole || null,
        localIndex: b && b.localIndex != null ? b.localIndex : null,
        x: Number(b && b.x || 0),
        y: Number(b && b.y || 0),
        z: Number(b && b.z || 0),
        w: Number(b && b.w != null ? b.w : 1),
        d: Number(b && b.d != null ? b.d : 1),
        h: Number(b && b.h != null ? b.h : 1)
      };
    });
  }

  function emitStairPlaceTrace(deps, phase, payload) {
    payload = payload || {};
    payload.phase = String(phase || 'unknown');
    payload.source = payload.source || 'src/presentation/render/interaction/render-preview-interaction-controller.js';
    try {
      var line = '[STAIR-PLACE-TRACE] ' + JSON.stringify(payload);
      if (deps && typeof deps.detailLog === 'function') deps.detailLog(line);
      else if (deps && typeof deps.pushLog === 'function') deps.pushLog(line);
      else if (global && typeof global.detailLog === 'function') global.detailLog(line);
      else if (global && typeof global.pushLog === 'function') global.pushLog(line);
      else if (global && global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function updatePreview(input) {
    var deps = getDeps(input);
    var editor = deps.editor || {};
    var mouse = deps.mouse || {};

    editor.hoverDeleteBox = null;
    if (!mouse.inside) {
      editor.preview = null;
      return editor.preview;
    }

    if (editor.mode === 'view') {
      editor.preview = null;
      return editor.preview;
    }

    if (editor.mode === 'delete') {
      editor.preview = null;
      editor.hoverDeleteBox = pickBoxAtScreen({ deps: deps, sx: mouse.x, sy: mouse.y });
      return editor.preview;
    }

    var cellX;
    var cellY;
    var topHit = typeof deps.hitTopFace === 'function' ? deps.hitTopFace(mouse.x, mouse.y) : null;
    var floor = null;
    var candidatePickSource = 'floor';
    if (topHit && editor.mode === 'place') {
      cellX = topHit.x;
      cellY = topHit.y;
      candidatePickSource = 'topHit';
    } else {
      floor = typeof deps.screenToFloor === 'function' ? deps.screenToFloor(mouse.x, mouse.y) : { x: 0, y: 0 };
      cellX = Math.floor(Number(floor && floor.x) || 0);
      cellY = Math.floor(Number(floor && floor.y) || 0);
    }

    if (editor.mode === 'drag' && editor.draggingInstance) {
      var draggedPrefab = typeof deps.getPrefabById === 'function' ? deps.getPrefabById(editor.draggingInstance.prefabId) : null;
      var draggedProto = typeof deps.prefabVariant === 'function'
        ? deps.prefabVariant(draggedPrefab, editor.draggingInstance.rotation || 0)
        : draggedPrefab;
      editor.preview = typeof deps.computeCandidate === 'function'
        ? deps.computeCandidate(cellX, cellY, draggedProto, editor.draggingInstance.instanceId)
        : null;
    } else if (editor.mode === 'place') {
      var baseCurrentProto = typeof deps.currentProto === 'function' ? deps.currentProto() : null;
      var microTri = null;
      var compatibleAxis = null;
      var candidateProto = baseCurrentProto;
      if (isMicroTriPrismPrefab(baseCurrentProto)) {
        floor = floor || (typeof deps.screenToFloor === 'function' ? deps.screenToFloor(mouse.x, mouse.y) : { x: cellX, y: cellY });
        microTri = resolveMicroTriFromFloor(floor, deps);
        microTri = applyMicroTriRotation(microTri, baseCurrentProto && baseCurrentProto.rotation != null ? baseCurrentProto.rotation : ((editor && editor.previewFacing != null) ? editor.previewFacing : 0));
        cellX = microTri.cellX;
        cellY = microTri.cellY;
        candidatePickSource = 'microTriFloor';
        candidateProto = buildMicroTriPreviewProto(baseCurrentProto, microTri);
      } else if (isDerivedAxisUnitPrefab(baseCurrentProto)) {
        floor = floor || (typeof deps.screenToFloor === 'function' ? deps.screenToFloor(mouse.x, mouse.y) : { x: cellX, y: cellY });
        var derivedAxisOrigin = resolveDerivedAxisUnitOriginFromFloor(floor);
        cellX = derivedAxisOrigin.x;
        cellY = derivedAxisOrigin.y;
        candidatePickSource = 'derivedAxisUnitFloor';
      } else if (isCompatibleAxisBlockPrefab(baseCurrentProto)) {
        floor = floor || (typeof deps.screenToFloor === 'function' ? deps.screenToFloor(mouse.x, mouse.y) : { x: cellX, y: cellY });
        compatibleAxis = resolveCompatibleAxisFromFloor(floor, deps);
        compatibleAxis.rotation = ((Math.round(Number(editor.rotation) || 0) % 4) + 4) % 4;
        cellX = compatibleAxis.cellX;
        cellY = compatibleAxis.cellY;
        candidatePickSource = 'compatibleAxisFloor';
        candidateProto = buildCompatibleAxisPreviewProto(baseCurrentProto, compatibleAxis);
        if (candidateProto && candidateProto.compatibleAxis) compatibleAxis = candidateProto.compatibleAxis;
      }
      editor.preview = typeof deps.computeCandidate === 'function'
        ? deps.computeCandidate(cellX, cellY, candidateProto)
        : null;
      if (editor.preview && isDerivedAxisUnitPrefab(baseCurrentProto)) {
        try {
          var derivedAxisLine = '[DERIVED-AXIS-UNIT] ' + JSON.stringify({
            phase: 'preview-candidate',
            prefabId: 'derived_axis_unit_block',
            mouse: { x: roundPreviewAlignmentNumber(mouse.x, 2), y: roundPreviewAlignmentNumber(mouse.y, 2) },
            floorRaw: floor ? { x: roundPreviewAlignmentNumber(floor.x, 3), y: roundPreviewAlignmentNumber(floor.y, 3) } : null,
            origin: editor.preview.origin || null,
            snapKind: 'derived-axis-edge-center-lattice',
            rotation: editor.preview.rotation != null ? editor.preview.rotation : ((editor && editor.previewFacing != null) ? editor.previewFacing : 0),
            valid: !!editor.preview.valid,
            reason: editor.preview.reason || 'ok',
            source: 'src/presentation/render/interaction/render-preview-interaction-controller.js'
          });
          if (deps && typeof deps.detailLog === 'function') deps.detailLog(derivedAxisLine);
          else if (deps && typeof deps.pushLog === 'function') deps.pushLog(derivedAxisLine);
        } catch (_) {}
      }
      if (editor.preview && microTri) {
        editor.preview.microTri = microTri;
        editor.preview.origin = { x: microTri.cellX, y: microTri.cellY, z: editor.preview.origin && editor.preview.origin.z || 0 };
        try {
          var microLine = '[MICRO-TRI-PRISM] ' + JSON.stringify({
            phase: 'preview-candidate',
            prefabId: 'micro_tri_prism',
            mouse: { x: roundPreviewAlignmentNumber(mouse.x, 2), y: roundPreviewAlignmentNumber(mouse.y, 2) },
            cell: { x: microTri.cellX, y: microTri.cellY },
            subdivision: microTri.subdivision,
            subX: microTri.subX,
            subY: microTri.subY,
            baseTriIndex: microTri.baseTriIndex,
            rotation: microTri.rotation,
            triIndex: microTri.triIndex,
            origin: editor.preview.origin || null,
            valid: !!editor.preview.valid,
            reason: editor.preview.reason || 'ok',
            source: 'src/presentation/render/interaction/render-preview-interaction-controller.js'
          });
          if (deps && typeof deps.detailLog === 'function') deps.detailLog(microLine);
          else if (deps && typeof deps.pushLog === 'function') deps.pushLog(microLine);
        } catch (_) {}
      }
      if (editor.preview && compatibleAxis) {
        editor.preview.compatibleAxis = compatibleAxis;
        editor.preview.origin = { x: compatibleAxis.cellX, y: compatibleAxis.cellY, z: editor.preview.origin && editor.preview.origin.z || 0 };
        try {
          var compatibleLine = '[COMPATIBLE-AXIS-BLOCK] ' + JSON.stringify({
            phase: 'preview-candidate',
            prefabId: 'compatible_axis_block',
            mouse: { x: roundPreviewAlignmentNumber(mouse.x, 2), y: roundPreviewAlignmentNumber(mouse.y, 2) },
            cell: { x: compatibleAxis.cellX, y: compatibleAxis.cellY },
            subdivision: compatibleAxis.subdivision,
            subdivisionSource: 'ui/runtime-live',
            rotation: compatibleAxis.rotation,
            subX: compatibleAxis.subX,
            subY: compatibleAxis.subY,
            k: compatibleAxis.k,
            atomStep: roundPreviewAlignmentNumber(compatibleAxis.atomStep, 6),
            approximatedLength: roundPreviewAlignmentNumber(compatibleAxis.approximatedLength, 6),
            errorAbs: roundPreviewAlignmentNumber(compatibleAxis.errorAbs, 6),
            errorPctOfOne: roundPreviewAlignmentNumber(compatibleAxis.errorPctOfOne, 3),
            atomCount: editor.preview.compatibleAxis && editor.preview.compatibleAxis.atomCount != null ? editor.preview.compatibleAxis.atomCount : null,
            generatedMode: editor.preview.compatibleAxis && editor.preview.compatibleAxis.generatedMode || 'integer-atom-strip',
            exactAtomCount: editor.preview.compatibleAxis && editor.preview.compatibleAxis.exactAtomCount,
            approximateAtomCount: editor.preview.compatibleAxis && editor.preview.compatibleAxis.approximateAtomCount,
            actualBounds: editor.preview.compatibleAxis && editor.preview.compatibleAxis.actualBounds || null,
            renderMode: editor.preview.compatibleAxis && editor.preview.compatibleAxis.renderMode || 'micro-tri-atom-composite',
            origin: editor.preview.origin || null,
            valid: !!editor.preview.valid,
            reason: editor.preview.reason || 'ok',
            source: 'src/presentation/render/interaction/render-preview-interaction-controller.js'
          });
          if (deps && typeof deps.detailLog === 'function') deps.detailLog(compatibleLine);
          else if (deps && typeof deps.pushLog === 'function') deps.pushLog(compatibleLine);
        } catch (_) {}
      }
    } else {
      editor.preview = null;
    }

    if (editor.preview && editor.mode === 'place') {
      try {
        var alignPrefabId = editor.preview.prefabId || null;
        var alignCurrentPrefab = typeof deps.currentPrefab === 'function' ? deps.currentPrefab() : null;
        if (!alignPrefabId && alignCurrentPrefab) alignPrefabId = alignCurrentPrefab.id || null;
        emitPreviewAlignmentCandidate(deps, {
          mode: editor.mode,
          prefabId: alignPrefabId,
          mouse: { x: roundPreviewAlignmentNumber(mouse.x, 2), y: roundPreviewAlignmentNumber(mouse.y, 2), inside: !!mouse.inside },
          pickSource: candidatePickSource,
          topHit: topHit ? { x: roundPreviewAlignmentNumber(topHit.x, 3), y: roundPreviewAlignmentNumber(topHit.y, 3), z: roundPreviewAlignmentNumber(topHit.z, 3), face: topHit.face || topHit.semanticFace || null, id: topHit.id || null } : null,
          floorRaw: floor ? { x: roundPreviewAlignmentNumber(floor.x, 3), y: roundPreviewAlignmentNumber(floor.y, 3) } : null,
          chosenCell: { x: roundPreviewAlignmentNumber(cellX, 3), y: roundPreviewAlignmentNumber(cellY, 3) },
          microTri: editor.preview.microTri || null,
          compatibleAxis: editor.preview.compatibleAxis || null,
          previewOrigin: editor.preview.origin || null,
          valid: editor.preview.valid === true,
          reason: editor.preview.reason || null,
          previewBoxCount: Array.isArray(editor.preview.boxes) ? editor.preview.boxes.length : 0
        }, { force: isStairPreview(alignPrefabId) });
      } catch (_) {}
      try {
        var tracePrefabId = editor.preview.prefabId || null;
        var traceCurrentPrefab = typeof deps.currentPrefab === 'function' ? deps.currentPrefab() : null;
        if (!tracePrefabId && traceCurrentPrefab) tracePrefabId = traceCurrentPrefab.id || null;
        if (isStairPreview(tracePrefabId)) {
          emitStairPlaceTrace(deps, 'preview-candidate', {
            prefabId: tracePrefabId,
            mode: editor.mode,
            mouse: { x: Number(mouse.x || 0), y: Number(mouse.y || 0), inside: !!mouse.inside },
            selectedCell: { x: cellX, y: cellY },
            topHit: topHit ? { x: topHit.x, y: topHit.y, z: topHit.z, boxId: topHit.boxId || null, face: topHit.face || null } : null,
            origin: editor.preview.origin || null,
            box: editor.preview.box || null,
            bbox: editor.preview.bbox || null,
            rotation: editor.preview.rotation != null ? editor.preview.rotation : (typeof deps.getEditorPreviewFacingValue === 'function' ? deps.getEditorPreviewFacingValue() : null),
            valid: !!editor.preview.valid,
            reason: editor.preview.reason || 'ok',
            boxes: summarizeTraceBoxes(editor.preview.boxes || [])
          });
        }
      } catch (_) {}
      try {
        var currentPrefab = typeof deps.currentPrefab === 'function' ? deps.currentPrefab() : null;
        if (typeof deps.logItemRotationPrototype === 'function') {
          deps.logItemRotationPrototype('placement-preview', {
            prefabId: editor.preview.prefabId || (currentPrefab ? currentPrefab.id : null),
            previewFacing: typeof deps.getEditorPreviewFacingValue === 'function' ? deps.getEditorPreviewFacingValue() : 0,
            origin: editor.preview.origin || null,
            footprint: editor.preview.bbox ? { w: editor.preview.bbox.w, d: editor.preview.bbox.d, h: editor.preview.bbox.h } : null,
            valid: !!editor.preview.valid,
            reason: editor.preview.reason || 'ok'
          });
        }
      } catch (_) {}
    }

    if (editor.preview && topHit && editor.preview.valid && typeof deps.detailLog === 'function') {
      deps.detailLog('preview-hit-top: cell=(' + topHit.x + ',' + topHit.y + ') topZ=' + topHit.z);
    }

    if (editor.preview && editor.preview.prefabId) {
      var previewPrefab = typeof deps.getPrefabById === 'function' ? deps.getPrefabById(editor.preview.prefabId) : null;
      if (previewPrefab && previewPrefab.kind === 'habbo_import' && typeof deps.detailLog === 'function') {
        deps.detailLog('[place-trace] preview-candidate prefab=' + previewPrefab.id + ' origin=(' + [editor.preview.origin && editor.preview.origin.x, editor.preview.origin && editor.preview.origin.y, editor.preview.origin && editor.preview.origin.z].join(',') + ') bbox=' + (editor.preview.bbox ? JSON.stringify(editor.preview.bbox) : 'null') + ' boxes=' + (editor.preview.boxes ? editor.preview.boxes.length : 0) + ' valid=' + editor.preview.valid + ' reason=' + editor.preview.reason);
      }
    }

    if (editor.preview) {
      var sig = JSON.stringify({
        mode: editor.mode,
        x: editor.preview.box ? editor.preview.box.x : null,
        y: editor.preview.box ? editor.preview.box.y : null,
        z: editor.preview.box ? editor.preview.box.z : null,
        valid: editor.preview.valid,
        reason: editor.preview.reason,
        overlapIds: editor.preview.overlapIds,
      });
      var lastSig = typeof deps.getLastPreviewSignature === 'function' ? deps.getLastPreviewSignature() : '';
      var verboseLog = typeof deps.verboseLog === 'function' ? !!deps.verboseLog() : !!deps.verboseLog;
      if (sig !== lastSig && verboseLog) {
        if (typeof deps.setLastPreviewSignature === 'function') deps.setLastPreviewSignature(sig);
        if (typeof deps.pushLog === 'function') deps.pushLog('preview: ' + sig);
      }
    }
    return editor.preview;
  }

  var api = {
    pickBoxAtScreen: pickBoxAtScreen,
    pickFaceAtScreen: pickFaceAtScreen,
    updatePreview: updatePreview,
  };

  var w = getWindow();
  if (w) {
    w.__RENDER_PREVIEW_INTERACTION_CONTROLLER__ = api;
    w.IsometricRenderPreviewInteractionController = api;
    try {
      w.App = w.App || {};
      w.App.presentation = w.App.presentation || {};
      w.App.presentation.render = w.App.presentation.render || {};
      w.App.presentation.render.previewInteractionController = api;
    } catch (_) {}
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
