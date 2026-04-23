(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/core/domain/floor-plan-hit-test.js';
  var PHASE = 'FLOOR-HIT-TEST-V37';
  var EDGE_ORDER = ['n', 'e', 's', 'w'];
  var SCREEN_DIRECTION_ORDER = ['up', 'right', 'down', 'left'];

  function toInt(value, fallback) {
    var num = Number(value);
    if (!isFinite(num)) return Number(fallback) || 0;
    return Math.round(num);
  }

  function cellKey(x, y) {
    return String(toInt(x, 0)) + ',' + String(toInt(y, 0));
  }

  function getSharedViewRotationApi() {
    try {
      return (window.App && window.App.domain && window.App.domain.viewRotationCore)
        ? window.App.domain.viewRotationCore
        : (window.__VIEW_ROTATION_CORE__ || null);
    } catch (_) {
      return window.__VIEW_ROTATION_CORE__ || null;
    }
  }

  function normalizeRotationTurns(rotation) {
    var api = getSharedViewRotationApi();
    if (api && typeof api.normalizeViewRotation === 'function') return api.normalizeViewRotation(rotation);
    rotation = Number(rotation) || 0;
    rotation = rotation % 4;
    if (rotation < 0) rotation += 4;
    return rotation;
  }

  function normalizeViewRotation(rotation) {
    var api = getSharedViewRotationApi();
    if (api && typeof api.normalizeViewRotation === 'function') return api.normalizeViewRotation(rotation);
    return ((Math.round(Number(rotation) || 0) % 4) + 4) % 4;
  }

  function rotationRadians(rotation) {
    return normalizeRotationTurns(rotation) * (Math.PI / 2);
  }

  function rotateLogicalCoords(x, y, rotation) {
    var api = getSharedViewRotationApi();
    if (api && typeof api.rotateWorldPointForView === 'function') {
      var rotated = api.rotateWorldPointForView({ x: x, y: y, z: 0 }, rotation, { x: 0, y: 0 });
      return { x: rotated.x, y: rotated.y };
    }
    var angle = rotationRadians(rotation);
    x = Number(x) || 0;
    y = Number(y) || 0;
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    var rx = x * cos + y * sin;
    var ry = -x * sin + y * cos;
    if (Math.abs(rx) < 1e-9) rx = 0;
    if (Math.abs(ry) < 1e-9) ry = 0;
    return { x: rx, y: ry };
  }

  function inverseRotateLogicalCoords(x, y, rotation) {
    var api = getSharedViewRotationApi();
    if (api && typeof api.unrotateScreenPointForView === 'function') {
      var world = api.unrotateScreenPointForView({ x: x, y: y, z: 0 }, rotation, { x: 0, y: 0 });
      return { x: world.x, y: world.y };
    }
    return rotateLogicalCoords(x, y, -normalizeRotationTurns(rotation));
  }

  function logicalEdgeToScreenEdge(edge, rotation) {
    var idx = EDGE_ORDER.indexOf(String(edge || 'n'));
    if (idx < 0) idx = 0;
    return EDGE_ORDER[(idx + normalizeViewRotation(rotation)) % EDGE_ORDER.length];
  }

  function screenEdgeToLogicalEdge(edge, rotation) {
    var idx = EDGE_ORDER.indexOf(String(edge || 'n'));
    if (idx < 0) idx = 0;
    return EDGE_ORDER[(idx - normalizeViewRotation(rotation) + EDGE_ORDER.length) % EDGE_ORDER.length];
  }

  function screenDirectionToLogicalOffset(direction, rotation) {
    var base;
    direction = String(direction || 'up');
    if (direction === 'up') base = { x: -1, y: -1 };
    else if (direction === 'right') base = { x: 1, y: -1 };
    else if (direction === 'down') base = { x: 1, y: 1 };
    else base = { x: -1, y: 1 };
    return inverseRotateLogicalCoords(base.x, base.y, rotation);
  }

  function logicalOffsetToScreenVector(dx, dy, view, constants) {
    var zoom = Number(view.zoom) || 1;
    var tileW = Number(constants.tileW) || 64;
    var tileH = Number(constants.tileH) || 32;
    var rotated = rotateLogicalCoords(Number(dx) || 0, Number(dy) || 0, view && view.rotation || 0);
    return {
      x: (rotated.x - rotated.y) * (tileW * zoom / 2),
      y: (rotated.x + rotated.y) * (tileH * zoom / 2)
    };
  }

  function getViewDirectionLabel(rotation) {
    return ['NE', 'SE', 'SW', 'NW'][normalizeViewRotation(rotation)] || 'NE';
  }

  function shortestRotationDelta(fromRotation, toRotation) {
    var from = normalizeRotationTurns(fromRotation);
    var to = normalizeRotationTurns(toRotation);
    var diff = to - from;
    if (diff > 2) diff -= 4;
    if (diff < -2) diff += 4;
    return diff;
  }

  function worldToScreen(x, y, transform, view, canvasInfo, constants) {
    var zoom = Number(view.zoom) || 1;
    var tileW = Number(constants.tileW) || 64;
    var tileH = Number(constants.tileH) || 32;
    var levelStep = Number(constants.levelStep) || 28;
    var originX = canvasInfo.width * 0.5 + (Number(view.offsetX) || 0);
    var originY = Math.max(120, canvasInfo.height * 0.24 + (Number(view.offsetY) || 0));
    var worldX = x + (transform.offsetX || 0);
    var worldY = y + (transform.offsetY || 0);
    var rotated = rotateLogicalCoords(worldX, worldY, view && view.rotation || 0);
    return {
      x: originX + (rotated.x - rotated.y) * (tileW * zoom / 2),
      y: originY + (rotated.x + rotated.y) * (tileH * zoom / 2) - (transform.elevation || 0) * levelStep * zoom
    };
  }

  function screenToWorld(px, py, transform, view, canvasInfo, constants) {
    var zoom = Number(view.zoom) || 1;
    var tileW = Number(constants.tileW) || 64;
    var tileH = Number(constants.tileH) || 32;
    var levelStep = Number(constants.levelStep) || 28;
    var originX = canvasInfo.width * 0.5 + (Number(view.offsetX) || 0);
    var originY = Math.max(120, canvasInfo.height * 0.24 + (Number(view.offsetY) || 0));
    var a = (px - originX) / ((tileW * zoom / 2) || 1e-6);
    var b = (py - originY + (transform.elevation || 0) * levelStep * zoom) / ((tileH * zoom / 2) || 1e-6);
    var rotatedWorldX = (a + b) / 2;
    var rotatedWorldY = (b - a) / 2;
    var world = inverseRotateLogicalCoords(rotatedWorldX, rotatedWorldY, view && view.rotation || 0);
    return {
      x: world.x - (transform.offsetX || 0),
      y: world.y - (transform.offsetY || 0)
    };
  }

  function diamondPolygon(center, view, constants) {
    var zoom = Number(view.zoom) || 1;
    var halfW = (Number(constants.tileW) || 64) * 0.5 * zoom;
    var halfH = (Number(constants.tileH) || 32) * 0.5 * zoom;
    return [
      { x: center.x, y: center.y - halfH },
      { x: center.x + halfW, y: center.y },
      { x: center.x, y: center.y + halfH },
      { x: center.x - halfW, y: center.y }
    ];
  }

  function pointInPolygon(px, py, points) {
    var inside = false;
    for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
      var xi = points[i].x, yi = points[i].y;
      var xj = points[j].x, yj = points[j].y;
      var intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-6) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function detectEdgeForWall(px, py, center, view, constants) {
    var zoom = Number(view.zoom) || 1;
    var halfW = (Number(constants.tileW) || 64) * 0.5 * zoom;
    var halfH = (Number(constants.tileH) || 32) * 0.5 * zoom;
    var dx = px - center.x;
    var dy = py - center.y;
    var ratioX = dx / (halfW || 1e-6);
    var ratioY = dy / (halfH || 1e-6);
    var screenEdge = Math.abs(ratioY) > Math.abs(ratioX) ? (ratioY < 0 ? 'n' : 's') : (ratioX > 0 ? 'e' : 'w');
    return screenEdgeToLogicalEdge(screenEdge, view && view.rotation || 0);
  }

  function normalizedDiamondDistance(px, py, center, view, constants) {
    var zoom = Number(view.zoom) || 1;
    var halfW = (Number(constants.tileW) || 64) * 0.5 * zoom;
    var halfH = (Number(constants.tileH) || 32) * 0.5 * zoom;
    return Math.abs(px - center.x) / (halfW || 1e-6) + Math.abs(py - center.y) / (halfH || 1e-6);
  }

  function buildCandidate(coord, cell, withinBounds, transform, px, py, view, canvasInfo, constants) {
    var center = worldToScreen(coord.x, coord.y, transform, view, canvasInfo, constants);
    var poly = diamondPolygon(center, view, constants);
    return {
      x: coord.x,
      y: coord.y,
      center: center,
      poly: poly,
      level: null,
      cell: cell || null,
      isGhost: !cell,
      withinBounds: withinBounds,
      edge: cell ? detectEdgeForWall(px, py, center, view, constants) : null,
      diamondScore: normalizedDiamondDistance(px, py, center, view, constants),
      distanceSq: Math.pow(px - center.x, 2) + Math.pow(py - center.y, 2),
      containsPoint: pointInPolygon(px, py, poly),
      chosenDirection: null,
      diagnostics: null,
      paintMode: null,
      isAdjacentToExisting: false,
      targetHasCell: !!cell
    };
  }

  function resolveLogicalCellFromScreen(transform, px, py, view, canvasInfo, constants) {
    var approx = screenToWorld(px, py, transform, view, canvasInfo, constants);
    var floorX = Math.floor(approx.x);
    var floorY = Math.floor(approx.y);
    var candidates = [];
    var seen = {};
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var gx = floorX + dx;
        var gy = floorY + dy;
        var key = cellKey(gx, gy);
        if (seen[key]) continue;
        seen[key] = true;
        var center = worldToScreen(gx, gy, transform, view, canvasInfo, constants);
        var poly = diamondPolygon(center, view, constants);
        candidates.push({
          x: gx,
          y: gy,
          center: center,
          containsPoint: pointInPolygon(px, py, poly),
          diamondScore: normalizedDiamondDistance(px, py, center, view, constants),
          distanceSq: Math.pow(px - center.x, 2) + Math.pow(py - center.y, 2)
        });
      }
    }
    candidates.sort(function (a, b) {
      if (!!a.containsPoint !== !!b.containsPoint) return a.containsPoint ? -1 : 1;
      if (a.diamondScore !== b.diamondScore) return a.diamondScore - b.diamondScore;
      return a.distanceSq - b.distanceSq;
    });
    return {
      x: candidates[0].x,
      y: candidates[0].y,
      approxX: approx.x,
      approxY: approx.y,
      candidateCount: candidates.length
    };
  }

  function getAdjacentInfo(domain, plan, level, x, y) {
    var directions = [];
    if (domain.getCell(plan, level, x, y + 1)) directions.push('n');
    if (domain.getCell(plan, level, x, y - 1)) directions.push('s');
    if (domain.getCell(plan, level, x + 1, y)) directions.push('w');
    if (domain.getCell(plan, level, x - 1, y)) directions.push('e');
    return {
      directions: directions,
      adjacent: directions.length > 0,
      chosenDirection: directions.length ? directions.slice().sort()[0] : null,
      counts: {
        n: directions.indexOf('n') >= 0 ? 1 : 0,
        s: directions.indexOf('s') >= 0 ? 1 : 0,
        e: directions.indexOf('e') >= 0 ? 1 : 0,
        w: directions.indexOf('w') >= 0 ? 1 : 0
      }
    };
  }

  function hitTestPaintTool(domain, plan, level, px, py, view, canvasInfo, constants, tool) {
    var transform = domain.getAbsoluteLevelTransform(plan, level);
    var logical = resolveLogicalCellFromScreen(transform, px, py, view, canvasInfo, constants);
    var bounds = domain.getLevelBounds(plan, level);
    var cell = domain.getCell(plan, level, logical.x, logical.y);
    var withinBounds = domain.isWithinLevelBounds(bounds, logical.x, logical.y);
    var adjacentInfo = getAdjacentInfo(domain, plan, level, logical.x, logical.y);
    var candidate = buildCandidate({ x: logical.x, y: logical.y }, cell, withinBounds, transform, px, py, view, canvasInfo, constants);
    candidate.level = level;
    candidate.chosenDirection = adjacentInfo.chosenDirection;
    candidate.isAdjacentToExisting = adjacentInfo.adjacent;
    candidate.paintMode = cell ? 'existing-cell' : (adjacentInfo.adjacent ? 'edge-expand' : 'free-paint');
    candidate.targetHasCell = !!cell;
    var stats = {
      resolvedGridX: logical.x,
      resolvedGridY: logical.y,
      logicalX: logical.x,
      logicalY: logical.y,
      viewRotation: normalizeViewRotation(view && view.rotation || 0),
      viewDirection: getViewDirectionLabel(view && view.rotation || 0),
      candidateCount: 1,
      candidateNorthCount: adjacentInfo.counts.n,
      candidateSouthCount: adjacentInfo.counts.s,
      candidateEastCount: adjacentInfo.counts.e,
      candidateWestCount: adjacentInfo.counts.w,
      chosenDirection: candidate.chosenDirection,
      chosenCell: { x: candidate.x, y: candidate.y },
      chosenWithinBounds: withinBounds,
      targetHasCell: !!cell,
      targetWithinBounds: withinBounds,
      targetWithinExpandedBounds: withinBounds,
      growBoundsTriggered: false,
      isAdjacentToExisting: adjacentInfo.adjacent,
      paintMode: candidate.paintMode,
      sourceItemCount: Object.keys((plan.levels && plan.levels[String(level)]) || {}).length
    };
    candidate.diagnostics = stats;
    api.lastDiagnostics = stats;
    return candidate;
  }

  function hitTestExistingTool(domain, plan, level, px, py, view, canvasInfo, constants, tool) {
    var transform = domain.getAbsoluteLevelTransform(plan, level);
    var logical = resolveLogicalCellFromScreen(transform, px, py, view, canvasInfo, constants);
    var candidates = [];
    var seen = {};
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var gx = logical.x + dx;
        var gy = logical.y + dy;
        var key = cellKey(gx, gy);
        if (seen[key]) continue;
        seen[key] = true;
        var cell = domain.getCell(plan, level, gx, gy);
        if (!cell) continue;
        var candidate = buildCandidate({ x: gx, y: gy }, cell, domain.isWithinLevelBounds(domain.getLevelBounds(plan, level), gx, gy), transform, px, py, view, canvasInfo, constants);
        candidate.level = level;
        if (candidate.containsPoint || candidate.diamondScore <= 1.35) candidates.push(candidate);
      }
    }
    candidates.sort(function (a, b) {
      if (!!a.containsPoint !== !!b.containsPoint) return a.containsPoint ? -1 : 1;
      if (a.diamondScore !== b.diamondScore) return a.diamondScore - b.diamondScore;
      return a.distanceSq - b.distanceSq;
    });
    var chosen = candidates.length ? candidates[0] : null;
    var stats = {
      resolvedGridX: logical.x,
      resolvedGridY: logical.y,
      logicalX: logical.x,
      logicalY: logical.y,
      viewRotation: normalizeViewRotation(view && view.rotation || 0),
      viewDirection: getViewDirectionLabel(view && view.rotation || 0),
      candidateCount: candidates.length,
      candidateNorthCount: 0,
      candidateSouthCount: 0,
      candidateEastCount: 0,
      candidateWestCount: 0,
      chosenDirection: chosen ? chosen.edge : null,
      chosenCell: chosen ? { x: chosen.x, y: chosen.y } : null,
      chosenWithinBounds: chosen ? chosen.withinBounds !== false : null,
      targetHasCell: chosen ? !!chosen.cell : false,
      targetWithinBounds: chosen ? chosen.withinBounds !== false : null,
      targetWithinExpandedBounds: chosen ? chosen.withinBounds !== false : null,
      growBoundsTriggered: false,
      isAdjacentToExisting: false,
      paintMode: tool,
      sourceItemCount: Object.keys((plan.levels && plan.levels[String(level)]) || {}).length
    };
    api.lastDiagnostics = stats;
    if (!chosen) return null;
    chosen.diagnostics = stats;
    return chosen;
  }

  function hitTestLevel(domain, plan, level, px, py, view, canvasInfo, constants, options) {
    options = options || {};
    var tool = String(options.tool || 'brush-floor');
    if (tool === 'brush-floor' || tool === 'brush-blocked') {
      return hitTestPaintTool(domain, plan, level, px, py, view, canvasInfo, constants, tool);
    }
    return hitTestExistingTool(domain, plan, level, px, py, view, canvasInfo, constants, tool);
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    normalizeRotationTurns: normalizeRotationTurns,
    normalizeViewRotation: normalizeViewRotation,
    getViewDirectionLabel: getViewDirectionLabel,
    shortestRotationDelta: shortestRotationDelta,
    rotateLogicalCoords: rotateLogicalCoords,
    inverseRotateLogicalCoords: inverseRotateLogicalCoords,
    logicalEdgeToScreenEdge: logicalEdgeToScreenEdge,
    screenEdgeToLogicalEdge: screenEdgeToLogicalEdge,
    screenDirectionToLogicalOffset: screenDirectionToLogicalOffset,
    logicalOffsetToScreenVector: logicalOffsetToScreenVector,
    worldToScreen: worldToScreen,
    screenToWorld: screenToWorld,
    resolveLogicalCellFromScreen: resolveLogicalCellFromScreen,
    diamondPolygon: diamondPolygon,
    pointInPolygon: pointInPolygon,
    detectEdgeForWall: detectEdgeForWall,
    hitTestLevel: hitTestLevel,
    lastDiagnostics: null
  };

  window.__FLOOR_EDITOR_HIT_TEST__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('domain.floorEditorHitTest', api, { owner: OWNER, phase: PHASE });
  }
})();
