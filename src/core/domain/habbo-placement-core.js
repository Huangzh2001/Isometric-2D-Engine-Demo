// Core Habbo placement helpers.
// Pure placement/shift math only: no DOM, no canvas context, no storage, no platform API.

(function (global) {
  'use strict';

  var OWNER = 'src/core/domain/habbo-placement-core.js';
  var PHASE = 'P3-HABBO-PLACEMENT-CORE';

  function toFiniteNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function toRoundedPositiveInt(value, fallback) {
    return Math.max(1, Math.round(toFiniteNumber(value, fallback || 1)));
  }

  function normalizeTileMetrics(metrics) {
    var src = metrics && typeof metrics === 'object' ? metrics : {};
    return {
      tileW: toFiniteNumber(src.tileW, 64) || 64,
      tileH: toFiniteNumber(src.tileH, 32) || 32
    };
  }

  function normalizeRotationParity(rotation) {
    return ((parseInt(rotation || 0, 10) % 2) + 2) % 2;
  }

  function getHabboPlacementShift(prefab, rotation, metrics) {
    var tile = normalizeTileMetrics(metrics);
    var dims = prefab && prefab.habboMeta && prefab.habboMeta.dimensions ? prefab.habboMeta.dimensions : null;
    var vis = String(prefab && prefab.habboMeta && prefab.habboMeta.visualization || '');
    if (!dims) return { x: 0, y: 0 };
    var spanX = toRoundedPositiveInt(dims.x, prefab && prefab.w || 1);
    var spanY = toRoundedPositiveInt(dims.y, prefab && prefab.d || 1);
    var rotKey = normalizeRotationParity(rotation);
    if (vis === 'furniture_static' && ((spanX === 1 && spanY > 1) || (spanY === 1 && spanX > 1))) {
      var depthSpan = rotKey === 0 ? spanY : spanX;
      if (depthSpan > 1) {
        var shiftX = -Math.round((depthSpan - 1) * tile.tileW / 2);
        return { x: shiftX, y: 0 };
      }
    }
    return { x: 0, y: 0 };
  }

  function pixelShiftToCellShift(shift, metrics) {
    var tile = normalizeTileMetrics(metrics);
    var sx = toFiniteNumber(shift && shift.x, 0);
    var sy = toFiniteNumber(shift && shift.y, 0);
    if (!sx && !sy) return { x: 0, y: 0 };
    var halfW = tile.tileW / 2;
    var halfH = tile.tileH / 2;
    if (!halfW || !halfH) return { x: 0, y: 0 };
    var dx = Math.round(((sx / halfW) + (sy / halfH)) / 2);
    var dy = Math.round(((sy / halfH) - (sx / halfW)) / 2);
    return { x: dx, y: dy };
  }

  function cellShiftToPixelShift(cellShift, metrics) {
    var tile = normalizeTileMetrics(metrics);
    var dx = toFiniteNumber(cellShift && cellShift.x, 0);
    var dy = toFiniteNumber(cellShift && cellShift.y, 0);
    return {
      x: Math.round((dx - dy) * tile.tileW / 2),
      y: Math.round((dx + dy) * tile.tileH / 2)
    };
  }

  function getHabboPlacementDecomposition(prefab, rotation, metrics) {
    var raw = getHabboPlacementShift(prefab, rotation, metrics);
    var cellShift = pixelShiftToCellShift(raw, metrics);
    var snapped = cellShiftToPixelShift(cellShift, metrics);
    return {
      rawShift: { x: Math.round(raw.x || 0), y: Math.round(raw.y || 0) },
      cellShift: cellShift,
      residualShift: {
        x: Math.round((raw.x || 0) - (snapped.x || 0)),
        y: Math.round((raw.y || 0) - (snapped.y || 0))
      }
    };
  }

  function getHabboPlacementCellShift(prefab, rotation, metrics) {
    var info = getHabboPlacementDecomposition(prefab, rotation, metrics);
    return info && info.cellShift ? info.cellShift : { x: 0, y: 0 };
  }

  function getHabboProxyVisualShift(prefab, rotation, metrics) {
    var info = getHabboPlacementDecomposition(prefab, rotation, metrics);
    var residual = info && info.residualShift ? info.residualShift : { x: 0, y: 0 };
    return {
      x: Math.round(residual.x || 0),
      y: Math.round(residual.y || 0)
    };
  }

  function getHabboInstanceVisualShift(instance, prefab, metrics) {
    if (!prefab || prefab.kind !== 'habbo_import') return { x: 0, y: 0 };
    return getHabboProxyVisualShift(prefab, instance && instance.rotation || 0, metrics);
  }

  function getHabboRoomOrigin(prefab, origin, anchor, rotation, metrics, projectIso, options) {
    var safeOrigin = origin && typeof origin === 'object' ? origin : {};
    var safeAnchor = anchor && typeof anchor === 'object' ? anchor : {};
    var ox = toFiniteNumber(safeOrigin.x, 0) + toFiniteNumber(safeAnchor.x, 0);
    var oy = toFiniteNumber(safeOrigin.y, 0) + toFiniteNumber(safeAnchor.y, 0);
    var oz = toFiniteNumber(safeOrigin.z, 0) + toFiniteNumber(safeAnchor.z, 0);
    var foot = typeof projectIso === 'function'
      ? projectIso(ox, oy, oz)
      : { x: 0, y: 0 };
    var info = getHabboPlacementDecomposition(prefab, rotation, metrics);
    var shift = info && info.residualShift ? info.residualShift : { x: 0, y: 0 };
    var floorBaselineOffset = options && options.floorBaselineOffset != null
      ? toFiniteNumber(options.floorBaselineOffset, 20)
      : 20;
    return {
      x: Math.round(toFiniteNumber(foot && foot.x, 0) + (shift.x || 0)),
      y: Math.round(toFiniteNumber(foot && foot.y, 0) + (shift.y || 0) + floorBaselineOffset)
    };
  }

  function getHabboLayerLocalBox(layer, totalScale, srcW, srcH) {
    var regX = Number(layer && layer.regX);
    var regY = Number(layer && layer.regY);
    var propX = Number(layer && layer.propX);
    var propY = Number(layer && layer.propY);
    var scale = toFiniteNumber(totalScale, 1) || 1;
    var drawW = Math.max(1, Math.round((srcW || 0) * scale));
    var drawH = Math.max(1, Math.round((srcH || 0) * scale));
    // offsetPx is already normalized to the real top-left during prefab import.
    // This core helper only scales that left-anchored local box; canvas drawing remains in presentation.
    var drawXMin = Math.round((layer && layer.offsetPx && layer.offsetPx.x || 0) * scale);
    var drawY = Math.round((layer && layer.offsetPx && layer.offsetPx.y || 0) * scale);

    return {
      drawX: drawXMin,
      drawY: drawY,
      drawW: drawW,
      drawH: drawH,
      drawXMax: drawXMin + drawW,
      regX: regX,
      regY: regY,
      propX: propX,
      propY: propY
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    normalizeTileMetrics: normalizeTileMetrics,
    normalizeRotationParity: normalizeRotationParity,
    getHabboPlacementShift: getHabboPlacementShift,
    pixelShiftToCellShift: pixelShiftToCellShift,
    cellShiftToPixelShift: cellShiftToPixelShift,
    getHabboPlacementDecomposition: getHabboPlacementDecomposition,
    getHabboPlacementCellShift: getHabboPlacementCellShift,
    getHabboProxyVisualShift: getHabboProxyVisualShift,
    getHabboInstanceVisualShift: getHabboInstanceVisualShift,
    getHabboRoomOrigin: getHabboRoomOrigin,
    getHabboLayerLocalBox: getHabboLayerLocalBox
  };

  global.__HABBO_PLACEMENT_CORE__ = api;
  global.IsometricHabboPlacementCore = api;
  global.__APP_CORE_HABBO_PLACEMENT_CORE__ = api;
})(window);
