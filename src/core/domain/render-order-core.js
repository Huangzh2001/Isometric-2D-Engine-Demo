// P7: render order / depth-sort core.
// Layer: core/domain.
//
// Owns pure renderable ordering utilities: order comparison, merge of already
// sorted renderable streams, binary insertion, and static-order signatures.
// This file must not depend on DOM, Canvas, Image, localStorage, or runtime
// scene globals.
(function registerRenderOrderCore(global) {
  var OWNER = 'src/core/domain/render-order-core.js';
  var PHASE = 'P7';
  var EPS = 1e-6;

  function safeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function normalizeRotation(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    return ((Math.round(n) % 4) + 4) % 4;
  }

  function defaultNormalize(value) {
    return normalizeRotation(value);
  }

  function compareRenderableOrder(a, b) {
    var left = a || {};
    var right = b || {};
    var leftSort = safeNumber(left.sortKey, 0);
    var rightSort = safeNumber(right.sortKey, 0);
    if (Math.abs(leftSort - rightSort) > EPS) return leftSort - rightSort;
    return safeNumber(left.tie, 0) - safeNumber(right.tie, 0);
  }

  function resolveComparator(comparator) {
    return typeof comparator === 'function' ? comparator : compareRenderableOrder;
  }

  function sortRenderablesByOrder(renderables, comparator) {
    var list = Array.isArray(renderables) ? renderables.slice() : [];
    list.sort(resolveComparator(comparator));
    return list;
  }

  function mergeSortedRenderables(staticRenderables, dynamicRenderables, comparator) {
    var staticList = Array.isArray(staticRenderables) ? staticRenderables : [];
    var dynamicList = Array.isArray(dynamicRenderables) ? dynamicRenderables : [];
    var compare = resolveComparator(comparator);
    if (!dynamicList.length) return staticList.slice();
    if (!staticList.length) return dynamicList.slice();
    var merged = [];
    var i = 0;
    var j = 0;
    while (i < staticList.length && j < dynamicList.length) {
      var a = staticList[i];
      var b = dynamicList[j];
      if (compare(a, b) <= 0) {
        merged.push(a);
        i += 1;
      } else {
        merged.push(b);
        j += 1;
      }
    }
    while (i < staticList.length) {
      merged.push(staticList[i]);
      i += 1;
    }
    while (j < dynamicList.length) {
      merged.push(dynamicList[j]);
      j += 1;
    }
    return merged;
  }

  function insertRenderableIntoSortedOrder(staticRenderables, dynamicRenderable, comparator) {
    var list = Array.isArray(staticRenderables) ? staticRenderables : [];
    if (!dynamicRenderable) return list.slice();
    var compare = resolveComparator(comparator);
    var lo = 0;
    var hi = list.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (compare(list[mid], dynamicRenderable) <= 0) lo = mid + 1;
      else hi = mid;
    }
    var out = list.slice(0, lo);
    out.push(dynamicRenderable);
    for (var i = lo; i < list.length; i++) out.push(list[i]);
    return out;
  }

  function isDynamicRenderable(renderable) {
    var r = renderable || {};
    var isPlayer = r.id === 'player-avatar' || r.kind === 'player-avatar' || r.actorKind === 'player';
    return !!(isPlayer || r.dynamic === true || r.kind === 'sprite' || r.kind === 'player-sprite');
  }

  function getRenderableIdentity(renderable) {
    var r = renderable || {};
    return String(r.id || r.faceKey || r.kind || 'static');
  }

  function getRenderableStaticOrderSignature(order, currentViewRotation, normalizeFn) {
    var list = Array.isArray(order) ? order : [];
    var normalize = typeof normalizeFn === 'function' ? normalizeFn : defaultNormalize;
    var staticCount = 0;
    var dynamicCount = 0;
    var firstStaticId = '';
    var lastStaticId = '';
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r) continue;
      if (isDynamicRenderable(r)) {
        dynamicCount += 1;
        continue;
      }
      staticCount += 1;
      var id = getRenderableIdentity(r);
      if (!firstStaticId) firstStaticId = id;
      lastStaticId = id;
    }
    return [
      normalize(currentViewRotation),
      staticCount,
      dynamicCount,
      firstStaticId,
      lastStaticId
    ].join('|');
  }

  function summarizeBoundary() {
    return {
      layer: 'core/domain',
      owner: OWNER,
      phase: PHASE,
      owns: [
        'renderable-order-comparison',
        'sorted-renderable-stream-merge',
        'binary-renderable-insertion',
        'static-order-signature'
      ],
      doesNotOwn: [
        'canvas-drawing',
        'frame-pipeline-execution',
        'diagnostic-export',
        'localStorage-flags',
        'scene-state-mutation'
      ],
      purity: {
        noDom: true,
        noCanvas: true,
        noLocalStorage: true,
        noGlobalSceneState: true
      }
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    EPS: EPS,
    summarizeBoundary: summarizeBoundary,
    compareRenderableOrder: compareRenderableOrder,
    sortRenderablesByOrder: sortRenderablesByOrder,
    mergeSortedRenderables: mergeSortedRenderables,
    insertRenderableIntoSortedOrder: insertRenderableIntoSortedOrder,
    isDynamicRenderable: isDynamicRenderable,
    getRenderableStaticOrderSignature: getRenderableStaticOrderSignature
  };

  if (global) {
    global.__RENDER_ORDER_CORE__ = api;
    global.__APP_CORE_RENDER_ORDER_CORE__ = api;
    global.IsometricRenderOrderCore = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
