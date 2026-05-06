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

  function getBoxes(deps) {
    var boxes = deps && deps.boxes;
    if (typeof boxes === 'function') boxes = call(boxes, []);
    return Array.isArray(boxes) ? boxes : [];
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
    if (topHit && editor.mode === 'place') {
      cellX = topHit.x;
      cellY = topHit.y;
    } else {
      var floor = typeof deps.screenToFloor === 'function' ? deps.screenToFloor(mouse.x, mouse.y) : { x: 0, y: 0 };
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
      editor.preview = typeof deps.computeCandidate === 'function'
        ? deps.computeCandidate(cellX, cellY, typeof deps.currentProto === 'function' ? deps.currentProto() : null)
        : null;
    } else {
      editor.preview = null;
    }

    if (editor.preview && editor.mode === 'place') {
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
