(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/view-rotation-core.js';
  var PHASE = 'MAIN-VIEW-ROTATION-V1';

  function toNumber(value, fallback) {
    var num = Number(value);
    return Number.isFinite(num) ? num : Number(fallback || 0);
  }

  function normalizeViewRotation(value) {
    return ((Math.round(toNumber(value, 0)) % 4) + 4) % 4;
  }

  function normalizeRotationTurns(value) {
    var turns = toNumber(value, 0) % 4;
    if (turns < 0) turns += 4;
    return turns;
  }

  function rotationRadians(value) {
    return normalizeRotationTurns(value) * (Math.PI / 2);
  }

  function rotateViewRotation(value, delta) {
    return normalizeViewRotation(normalizeViewRotation(value) + Math.round(toNumber(delta, 0)));
  }

  function normalizePivot(worldBoundsOrOrigin) {
    var src = worldBoundsOrOrigin && typeof worldBoundsOrOrigin === 'object' ? worldBoundsOrOrigin : {};
    if (Number.isFinite(Number(src.pivotX)) || Number.isFinite(Number(src.pivotY))) {
      return { x: toNumber(src.pivotX, 0), y: toNumber(src.pivotY, 0) };
    }
    if (Number.isFinite(Number(src.x)) || Number.isFinite(Number(src.y))) {
      return { x: toNumber(src.x, 0), y: toNumber(src.y, 0) };
    }
    var originX = toNumber(src.originX, 0);
    var originY = toNumber(src.originY, 0);
    var cols = toNumber(src.cols != null ? src.cols : src.gridW, 0);
    var rows = toNumber(src.rows != null ? src.rows : src.gridH, 0);
    return { x: originX + (cols * 0.5), y: originY + (rows * 0.5) };
  }

  function rotateOffset(dx, dy, rotation) {
    dx = toNumber(dx, 0);
    dy = toNumber(dy, 0);
    var angle = rotationRadians(rotation);
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    var rx = dx * cos + dy * sin;
    var ry = -dx * sin + dy * cos;
    if (Math.abs(rx) < 1e-9) rx = 0;
    if (Math.abs(ry) < 1e-9) ry = 0;
    return { x: rx, y: ry };
  }

  function rotateWorldPointForView(point, viewRotation, worldBoundsOrOrigin) {
    var src = point && typeof point === 'object' ? point : {};
    var pivot = normalizePivot(worldBoundsOrOrigin);
    var dx = toNumber(src.x, 0) - pivot.x;
    var dy = toNumber(src.y, 0) - pivot.y;
    var rotated = rotateOffset(dx, dy, viewRotation);
    return {
      x: pivot.x + rotated.x,
      y: pivot.y + rotated.y,
      z: toNumber(src.z, 0)
    };
  }

  function unrotateScreenPointForView(point, viewRotation, worldBoundsOrOrigin) {
    return rotateWorldPointForView(point, -normalizeRotationTurns(viewRotation), worldBoundsOrOrigin);
  }

  function normalizeProjectionConfig(config) {
    var src = config && typeof config === 'object' ? config : {};
    return {
      tileW: Math.max(1e-6, toNumber(src.tileW, 80)),
      tileH: Math.max(1e-6, toNumber(src.tileH, 40)),
      originX: toNumber(src.originX, 0),
      originY: toNumber(src.originY, 0),
      cameraX: toNumber(src.cameraX, 0),
      cameraY: toNumber(src.cameraY, 0),
      worldBoundsOrOrigin: src.worldBoundsOrOrigin || src.pivot || null
    };
  }

  function worldToScreenWithViewRotation(worldPoint, viewRotation, projectionConfig) {
    var point = worldPoint && typeof worldPoint === 'object' ? worldPoint : {};
    var cfg = normalizeProjectionConfig(projectionConfig);
    var rotated = rotateWorldPointForView(point, viewRotation, cfg.worldBoundsOrOrigin);
    return {
      x: cfg.originX + cfg.cameraX + (rotated.x - rotated.y) * cfg.tileW * 0.5,
      y: cfg.originY + cfg.cameraY + (rotated.x + rotated.y) * cfg.tileH * 0.5 - toNumber(rotated.z, 0) * cfg.tileH,
      rotatedWorldPoint: rotated,
      viewRotation: normalizeRotationTurns(viewRotation)
    };
  }

  function screenToWorldWithViewRotation(screenPoint, viewRotation, projectionConfig) {
    var point = screenPoint && typeof screenPoint === 'object' ? screenPoint : {};
    var cfg = normalizeProjectionConfig(projectionConfig);
    var dx = (toNumber(point.x, 0) - cfg.originX - cfg.cameraX) / (cfg.tileW * 0.5);
    var dy = (toNumber(point.y, 0) - cfg.originY - cfg.cameraY + (toNumber(point.z, 0) * cfg.tileH)) / (cfg.tileH * 0.5);
    var rotatedWorld = {
      x: (dx + dy) * 0.5,
      y: (dy - dx) * 0.5,
      z: toNumber(point.z, 0)
    };
    var world = unrotateScreenPointForView(rotatedWorld, viewRotation, cfg.worldBoundsOrOrigin);
    return {
      x: world.x,
      y: world.y,
      z: world.z,
      rotatedWorldPoint: rotatedWorld,
      viewRotation: normalizeRotationTurns(viewRotation)
    };
  }

  function logicalOffsetToScreenVector(dx, dy, viewRotation, projectionConfig) {
    var rotated = rotateOffset(toNumber(dx, 0), toNumber(dy, 0), viewRotation);
    var cfg = normalizeProjectionConfig(projectionConfig);
    return {
      x: (rotated.x - rotated.y) * cfg.tileW * 0.5,
      y: (rotated.x + rotated.y) * cfg.tileH * 0.5
    };
  }

  function computeRenderableSortMeta(args) {
    var src = args && typeof args === 'object' ? args : {};
    var point = { x: toNumber(src.x, 0), y: toNumber(src.y, 0), z: toNumber(src.z, 0) };
    var rotated = rotateWorldPointForView(point, src.viewRotation, null);
    var h = Math.max(0, toNumber(src.h, 0));
    var bias = toNumber(src.sortBias, 0);
    return {
      sortKey: rotated.x + rotated.y + point.z + h + bias,
      tie: (point.z * 100000) + (rotated.y * 100) + rotated.x,
      rotatedPoint: rotated,
      viewRotation: normalizeViewRotation(src.viewRotation)
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    normalizeViewRotation: normalizeViewRotation,
    normalizeRotationTurns: normalizeRotationTurns,
    rotateViewRotation: rotateViewRotation,
    rotateWorldPointForView: rotateWorldPointForView,
    unrotateScreenPointForView: unrotateScreenPointForView,
    worldToScreenWithViewRotation: worldToScreenWithViewRotation,
    screenToWorldWithViewRotation: screenToWorldWithViewRotation,
    logicalOffsetToScreenVector: logicalOffsetToScreenVector,
    computeRenderableSortMeta: computeRenderableSortMeta,
    normalizePivot: normalizePivot
  };

  window.__VIEW_ROTATION_CORE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('domain.viewRotationCore', api, { owner: OWNER, phase: PHASE });
  }
})();
