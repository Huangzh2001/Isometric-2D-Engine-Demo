(function () {
  if (typeof window === 'undefined') return;
  var controller = window.__FLOOR_EDITOR_APP__ || null;
  var domain = window.__FLOOR_EDITOR_DOMAIN__ || null;
  var hitApi = window.__FLOOR_EDITOR_HIT_TEST__ || null;
  var diagnostics = window.__FLOOR_EDITOR_DIAGNOSTIC_LOG__ || null;
  if (!controller || !domain || !hitApi) {
    console.error('[FLOOR-PRESENTATION] missing dependencies', { controller: !!controller, domain: !!domain, hitApi: !!hitApi });
    return;
  }

  var TILE_W = 64;
  var TILE_H = 32;
  var LEVEL_STEP = 28;
  var toolLabels = {
    'brush-floor': '地板笔刷',
    'brush-blocked': '阻塞笔刷',
    'erase': '橡皮擦',
    'wall': '墙边笔刷',
    'wall-erase': '墙边橡皮',
    'rect-floor': '矩形地板',
    'rect-blocked': '矩形阻塞',
    'rect-erase': '矩形擦除',
    'fill-floor': '区域填充地板',
    'fill-blocked': '区域阻塞填充',
    'fill-erase': '区域清空'
  };
  var ui = {};
  var drag = { panning: false, recting: false, lastX: 0, lastY: 0, spaceMode: false };
  var globalDraft = null;
  var levelDraft = null;
  var currentHandleRegions = [];
  var rotationAnim = { active: false, frame: 0, from: 0, to: 0, visualRotation: 0, startTime: 0, duration: 0, nonce: 0, frameCount: 0, lastElapsedMs: 0 };
  var overlapPreviewCache = { planRef: null, activeLevel: null, selectionKey: '', data: null, hits: 0, misses: 0 };

  function $(id) { return document.getElementById(id); }
  function safeText(value) { return value == null ? '' : String(value); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function cloneJson(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }


  function isRotationAnimating(state) {
    return !!(state && state.view && state.view.isRotationAnimating);
  }

  function easeInOutCubic(t) {
    t = Math.max(0, Math.min(1, Number(t) || 0));
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function getEffectiveRotation(state) {
    if (rotationAnim.active) return hitApi.normalizeRotationTurns(rotationAnim.visualRotation);
    return Number(state && state.view ? state.view.rotation : 0) || 0;
  }

  function makeRenderState(state) {
    state = state || controller.getState();
    var renderState = {
      floorPlan: state.floorPlan,
      activeTool: state.activeTool,
      activeLevel: state.activeLevel,
      wallBrushHeight: state.wallBrushHeight,
      hover: state.hover,
      selection: state.selection,
      dirty: state.dirty,
      lastAction: state.lastAction,
      view: Object.assign({}, state.view || {})
    };
    renderState.view.rotation = getEffectiveRotation(state);
    return renderState;
  }

  function interactionFrozen() {
    return rotationAnim.active || isRotationAnimating(controller.getState());
  }

  function cancelRotationFrame() {
    if (rotationAnim.frame) cancelAnimationFrame(rotationAnim.frame);
    rotationAnim.frame = 0;
  }

  function resetOverlapPreviewCache() {
    overlapPreviewCache.planRef = null;
    overlapPreviewCache.activeLevel = null;
    overlapPreviewCache.selectionKey = '';
    overlapPreviewCache.data = null;
    overlapPreviewCache.hits = 0;
    overlapPreviewCache.misses = 0;
  }

  function getOverlapSelectionKey(state) {
    return JSON.stringify((state && state.view && state.view.selectedOverlapLevels) || []);
  }

  function getCachedOverlapData(state) {
    state = state || controller.getState();
    var selectionKey = getOverlapSelectionKey(state);
    var activeLevel = state.activeLevel || 0;
    if (overlapPreviewCache.planRef === state.floorPlan && overlapPreviewCache.activeLevel === activeLevel && overlapPreviewCache.selectionKey === selectionKey && overlapPreviewCache.data) {
      overlapPreviewCache.hits += 1;
      return { data: overlapPreviewCache.data, cached: true };
    }
    var data = domain.getOverlapPreviewData(state.floorPlan, activeLevel, state.view && state.view.selectedOverlapLevels || []);
    overlapPreviewCache.planRef = state.floorPlan;
    overlapPreviewCache.activeLevel = activeLevel;
    overlapPreviewCache.selectionKey = selectionKey;
    overlapPreviewCache.data = data;
    overlapPreviewCache.misses += 1;
    return { data: data, cached: false };
  }

  function finishRotationAnimation(nonce, elapsedMs) {
    var state = controller.getState();
    if (!rotationAnim.active && !isRotationAnimating(state)) return;
    rotationAnim.active = false;
    cancelRotationFrame();
    captureDiagnosticsSafe('captureLifecycle', 'rotation-animation-complete', {
      nonce: nonce,
      elapsedMs: Math.round(Number(elapsedMs) || 0),
      frameCount: rotationAnim.frameCount,
      targetRotation: state.view ? state.view.rotationTo : null,
      targetDirectionLabel: hitApi.getViewDirectionLabel(state.view ? state.view.rotationTo : 0),
      overlapCacheHits: overlapPreviewCache.hits,
      overlapCacheMisses: overlapPreviewCache.misses
    });
    var completed = controller.completeViewRotationAnimation(nonce);
    try {
      if (completed) {
        var completePayload = {
          targetRotation: completed.view ? completed.view.rotation : null,
          targetDirectionLabel: hitApi.getViewDirectionLabel(completed.view ? completed.view.rotation : 0),
          isRotationAnimating: !!(completed.view && completed.view.isRotationAnimating)
        };
        captureDiagnosticsSafe('setLatest', 'rotation-complete-state', completePayload);
      }
    } catch (_) {}
  }

  function stepRotationAnimation(now) {
    if (!rotationAnim.active) return;
    var state = controller.getState();
    if (!state.view || !state.view.isRotationAnimating || Number(state.view.rotationAnimationNonce) !== Number(rotationAnim.nonce)) {
      rotationAnim.active = false;
      cancelRotationFrame();
      render(controller.getState(), { reason: 'rotation-animation-cancelled' });
      return;
    }
    rotationAnim.frameCount += 1;
    var elapsed = now - rotationAnim.startTime;
    rotationAnim.lastElapsedMs = elapsed;
    var duration = Math.max(0, rotationAnim.duration);
    var progress = duration <= 0 ? 1 : Math.max(0, Math.min(1, elapsed / duration));
    var eased = easeInOutCubic(progress);
    var delta = hitApi.shortestRotationDelta(rotationAnim.from, rotationAnim.to);
    rotationAnim.visualRotation = hitApi.normalizeRotationTurns(rotationAnim.from + delta * eased);
    try {
      render(controller.getState(), { reason: 'rotation-animation-frame', animationProgress: progress, visualRotation: rotationAnim.visualRotation });
    } catch (err) {
      rotationAnim.active = false;
      cancelRotationFrame();
      captureDiagnosticsSafe('captureLifecycle', 'rotation-animation-render-failed', {
        nonce: rotationAnim.nonce,
        elapsedMs: Math.round(Number(elapsed) || 0),
        frameCount: rotationAnim.frameCount,
        message: safeText(err && err.message ? err.message : err)
      });
      controller.completeViewRotationAnimation(rotationAnim.nonce);
      return;
    }
    if (progress >= 1) {
      finishRotationAnimation(rotationAnim.nonce, elapsed);
      return;
    }
    rotationAnim.frame = requestAnimationFrame(stepRotationAnimation);
  }

  function maybeStartRotationAnimation(state, meta) {
    state = state || controller.getState();
    if (!state.view || !state.view.isRotationAnimating) return false;
    if (!state.view.rotationAnimationEnabled || Number(state.view.rotationAnimationMs) <= 0) return false;
    var nonce = Number(state.view.rotationAnimationNonce) || 0;
    if (rotationAnim.active && rotationAnim.nonce === nonce) return true;
    cancelRotationFrame();
    rotationAnim.active = true;
    rotationAnim.nonce = nonce;
    rotationAnim.from = Number(state.view.rotationFrom != null ? state.view.rotationFrom : state.view.rotation) || 0;
    rotationAnim.to = Number(state.view.rotationTo != null ? state.view.rotationTo : state.view.rotation) || 0;
    rotationAnim.visualRotation = rotationAnim.from;
    rotationAnim.duration = Math.max(0, Number(state.view.rotationAnimationMs) || 0);
    rotationAnim.startTime = performance.now();
    rotationAnim.frameCount = 0;
    rotationAnim.lastElapsedMs = 0;
    captureDiagnosticsSafe('captureLifecycle', 'rotation-animation-start', {
      nonce: nonce,
      reason: meta && meta.reason || 'rotate-view-start',
      fromRotation: state.view.rotationFrom,
      toRotation: state.view.rotationTo,
      fromDirectionLabel: hitApi.getViewDirectionLabel(state.view.rotationFrom),
      toDirectionLabel: hitApi.getViewDirectionLabel(state.view.rotationTo),
      animationMs: state.view.rotationAnimationMs
    });
    rotationAnim.frame = requestAnimationFrame(stepRotationAnimation);
    return true;
  }

  function captureDiagnosticsSafe(method, payloadA, payloadB) {
    if (!diagnostics) return;
    try {
      var fn = diagnostics[method];
      if (typeof fn === 'function') fn.call(diagnostics, payloadA, payloadB);
    } catch (err) {
      console.warn('[FLOOR-PRESENTATION] diagnostics call failed', { method: method, message: safeText(err && err.message ? err.message : err) });
    }
  }

  function hexToRgba(hex, alpha) {
    var value = safeText(hex).replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(value)) value = '58A6FF';
    var r = parseInt(value.slice(0, 2), 16);
    var g = parseInt(value.slice(2, 4), 16);
    var b = parseInt(value.slice(4, 6), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  function buildGlobalDraft(currentState) {
    return {
      name: safeText(currentState.floorPlan && currentState.floorPlan.meta ? currentState.floorPlan.meta.name : 'Untitled Floor Plan'),
      shapeMode: safeText(currentState.floorPlan ? currentState.floorPlan.shapeMode : 'rectangle') || 'rectangle',
      cols: Number(currentState.floorPlan && currentState.floorPlan.bounds ? currentState.floorPlan.bounds.cols : 10) || 10,
      rows: Number(currentState.floorPlan && currentState.floorPlan.bounds ? currentState.floorPlan.bounds.rows : 8) || 8,
      defaultWallHeight: Number(currentState.floorPlan ? currentState.floorPlan.defaultWallHeight : 2) || 2
    };
  }

  function buildLevelDraft(currentState) {
    var level = currentState.activeLevel || 0;
    var meta = domain.getLevelMeta(currentState.floorPlan, level);
    var bounds = domain.getLevelBounds(currentState.floorPlan, level);
    return {
      level: level,
      name: safeText(meta.name || ('L' + level)),
      color: safeText(domain.getLevelColor(currentState.floorPlan, level) || '#58A6FF'),
      cols: Number(bounds.cols) || 10,
      rows: Number(bounds.rows) || 8,
      offsetX: Number(meta.offsetX) || 0,
      offsetY: Number(meta.offsetY) || 0,
      elevationGap: Number(meta.elevationGap) || (level === 0 ? 0 : 1)
    };
  }

  function syncDraftsFromState(currentState) {
    globalDraft = buildGlobalDraft(currentState);
    levelDraft = buildLevelDraft(currentState);
  }

  function bindUi() {
    ui.canvas = $('floorEditorCanvas');
    ui.ctx = ui.canvas.getContext('2d');
    ui.status = $('floorEditorStatus');
    ui.rotateLeftBtn = $('rotateLeftBtn');
    ui.rotateRightBtn = $('rotateRightBtn');
    ui.currentViewDirectionLabel = $('currentViewDirectionLabel');
    ui.rotationAnimationMsSelect = $('rotationAnimationMsSelect');

    ui.floorNameInput = $('floorNameInput');
    ui.shapeModeSelect = $('shapeModeSelect');
    ui.floorColsInput = $('floorColsInput');
    ui.floorRowsInput = $('floorRowsInput');
    ui.wallHeightInput = $('wallHeightInput');
    ui.applyFloorMetaBtn = $('applyFloorMeta');
    ui.createRectanglePlanBtn = $('createRectanglePlan');
    ui.createCustomPlanBtn = $('createCustomPlan');

    ui.addLevelBtn = $('addLevelBtn');
    ui.addRectLevelBtn = $('addRectLevelBtn');
    ui.copyLevelBtn = $('copyLevelBtn');
    ui.removeLevelBtn = $('removeLevelBtn');
    ui.levelList = $('levelList');
    ui.levelListStatus = $('levelListStatus');
    ui.clearOverlapSelectionBtn = $('clearOverlapSelectionBtn');
    ui.overlapCanvas = $('levelOverlapCanvas');
    ui.overlapCtx = ui.overlapCanvas.getContext('2d');
    ui.overlapSummaryText = $('overlapSummaryText');

    ui.zoomRange = $('zoomRange');
    ui.zoomValueText = $('zoomValueText');
    ui.showGridToggle = $('showGridToggle');
    ui.showWallsToggle = $('showWallsToggle');
    ui.showAdjacentToggle = $('showAdjacentToggle');

    ui.undoBtn = $('undoBtn');
    ui.redoBtn = $('redoBtn');
    ui.saveAutosaveBtn = $('saveAutosaveBtn');
    ui.loadAutosaveBtn = $('loadAutosaveBtn');
    ui.exportFloorBtn = $('exportFloorBtn');
    ui.importFloorBtn = $('importFloorBtn');
    ui.importFloorFile = $('importFloorFile');
    ui.exportDiagnosticLogBtn = $('exportDiagnosticLogBtn');
    ui.clearAutosaveBtn = $('clearAutosaveBtn');

    ui.currentLevelTitle = $('currentLevelTitle');
    ui.currentLevelBadge = $('currentLevelBadge');
    ui.currentLevelColorChip = $('currentLevelColorChip');
    ui.activeLevelText = $('activeLevelText');
    ui.currentLevelNameInput = $('currentLevelNameInput');
    ui.currentLevelColorInput = $('currentLevelColorInput');
    ui.currentLevelColsInput = $('currentLevelColsInput');
    ui.currentLevelRowsInput = $('currentLevelRowsInput');
    ui.currentOffsetXInput = $('currentOffsetXInput');
    ui.currentOffsetYInput = $('currentOffsetYInput');
    ui.currentElevationGapInput = $('currentElevationGapInput');
    ui.applyCurrentLevelMetaBtn = $('applyCurrentLevelMetaBtn');
    ui.resetLevelTransformBtn = $('resetLevelTransformBtn');
    ui.toggleOffsetHandlesBtn = $('toggleOffsetHandlesBtn');
    ui.toggleElevationHandlesBtn = $('toggleElevationHandlesBtn');

    ui.prevLevelBtn = $('prevLevelBtn');
    ui.nextLevelBtn = $('nextLevelBtn');
    ui.applyPerimeterWallsBtn = $('applyPerimeterWallsBtn');
    ui.clearWallsBtn = $('clearWallsBtn');
    ui.wallBrushHeightInput = $('wallBrushHeightInput');
    ui.toolInfo = $('toolInfo');
    ui.hoverInfo = $('hoverInfo');
    ui.selectionInfo = $('selectionInfo');
    ui.enabledCountText = $('enabledCountText');
    ui.blockedCountText = $('blockedCountText');
    ui.wallCountText = $('wallCountText');
    ui.totalLevelsText = $('totalLevelsText');
    ui.totalEnabledText = $('totalEnabledText');
    ui.legendInfo = $('legendInfo');
  }

  function summarizeUiBindings() {
    return {
      canvas: !!ui.canvas,
      overlapCanvas: !!ui.overlapCanvas,
      status: !!ui.status,
      rotateLeftBtn: !!ui.rotateLeftBtn,
      rotateRightBtn: !!ui.rotateRightBtn,
      currentViewDirectionLabel: !!ui.currentViewDirectionLabel,
      importFile: !!ui.importFloorFile,
      exportDiagnosticLogBtn: !!ui.exportDiagnosticLogBtn,
      clearAutosaveBtn: !!ui.clearAutosaveBtn,
      toggleOffsetHandlesBtn: !!ui.toggleOffsetHandlesBtn,
      toggleElevationHandlesBtn: !!ui.toggleElevationHandlesBtn,
      levelList: !!ui.levelList
    };
  }

  function getCanvasInfo() {
    var rect = ui.canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var width = Math.max(1, Math.round(rect.width));
    var height = Math.max(1, Math.round(rect.height));
    var backingW = Math.max(1, Math.round(width * dpr));
    var backingH = Math.max(1, Math.round(height * dpr));
    if (ui.canvas.width !== backingW || ui.canvas.height !== backingH) {
      ui.canvas.width = backingW;
      ui.canvas.height = backingH;
      ui.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ui.ctx.imageSmoothingEnabled = true;
    }
    return { width: width, height: height, rect: rect, dpr: dpr };
  }

  function worldToScreen(x, y, level, state, canvasInfo) {
    return hitApi.worldToScreen(x, y, domain.getAbsoluteLevelTransform(state.floorPlan, level), state.view, canvasInfo, { tileW: TILE_W, tileH: TILE_H, levelStep: LEVEL_STEP });
  }

  function diamondPolygon(center, state) {
    return hitApi.diamondPolygon(center, state.view, { tileW: TILE_W, tileH: TILE_H });
  }

  function edgeLine(center, edge, state) {
    var zoom = Number(state.view.zoom) || 1;
    var halfW = TILE_W * 0.5 * zoom;
    var halfH = TILE_H * 0.5 * zoom;
    var screenEdge = hitApi.logicalEdgeToScreenEdge(edge, state.view.rotation || 0);
    if (screenEdge === 'n') return [{ x: center.x, y: center.y - halfH }, { x: center.x + halfW, y: center.y }];
    if (screenEdge === 'e') return [{ x: center.x + halfW, y: center.y }, { x: center.x, y: center.y + halfH }];
    if (screenEdge === 's') return [{ x: center.x, y: center.y + halfH }, { x: center.x - halfW, y: center.y }];
    return [{ x: center.x - halfW, y: center.y }, { x: center.x, y: center.y - halfH }];
  }

  function drawPolygon(ctx, points, fillStyle, strokeStyle, lineWidth) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); }
    if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
  }

  function isCenterVisible(center, state, info) {
    var zoom = Number(state.view.zoom) || 1;
    var padX = TILE_W * 0.6 * zoom;
    var padY = TILE_H * 0.8 * zoom + LEVEL_STEP * 1.2 * zoom;
    return !(center.x < -padX || center.x > info.width + padX || center.y < -padY || center.y > info.height + padY);
  }

  function getRenderableLevels(state) {
    var visible = domain.getVisibleLevels(state.floorPlan);
    var active = state.activeLevel || 0;
    if (!state.view.showAdjacentLevels) return [active];
    if (visible.indexOf(active) < 0) visible.unshift(active);
    return visible;
  }

  function collectRenderableItems(state, info) {
    var levels = getRenderableLevels(state);
    var items = [];
    var rotation = hitApi.normalizeViewRotation(state.view.rotation || 0);
    levels.forEach(function (level) {
      var store = state.floorPlan.levels && state.floorPlan.levels[String(level)] ? state.floorPlan.levels[String(level)] : {};
      var transform = domain.getAbsoluteLevelTransform(state.floorPlan, level);
      Object.keys(store).forEach(function (key) {
        var cell = store[key];
        if (!cell || cell.enabled === false) return;
        var center = worldToScreen(cell.x, cell.y, level, state, info);
        if (!isCenterVisible(center, state, info)) return;
        var worldX = cell.x + (transform.offsetX || 0);
        var worldY = cell.y + (transform.offsetY || 0);
        var rotated = hitApi.rotateLogicalCoords(worldX, worldY, rotation);
        items.push({
          x: cell.x,
          y: cell.y,
          level: level,
          center: center,
          cell: cell,
          absoluteElevation: Number(transform.elevation) || 0,
          planeX: rotated.x - rotated.y,
          planeY: rotated.x + rotated.y
        });
      });
    });
    items.sort(function (a, b) {
      if (a.planeY !== b.planeY) return a.planeY - b.planeY;
      if (a.absoluteElevation !== b.absoluteElevation) return a.absoluteElevation - b.absoluteElevation;
      if (a.planeX !== b.planeX) return a.planeX - b.planeX;
      if (a.center.x !== b.center.x) return a.center.x - b.center.x;
      return a.level - b.level;
    });
    return items;
  }

  function getCellTopFill(levelColor, cell, isActive) {
    if (cell && cell.placeable === false) return hexToRgba(levelColor, isActive ? 0.45 : 0.28);
    return hexToRgba(levelColor, isActive ? 0.88 : 0.64);
  }

  function getCellStroke(levelColor, isActive) {
    return isActive ? hexToRgba(levelColor, 0.95) : 'rgba(255,255,255,0.18)';
  }

  function drawCell(ctx, state, item) {
    var isActive = item.level === (state.activeLevel || 0);
    var color = domain.getLevelColor(state.floorPlan, item.level);
    var poly = diamondPolygon(item.center, state);
    drawPolygon(ctx, poly, getCellTopFill(color, item.cell, isActive), getCellStroke(color, isActive), isActive ? 1.5 : 1);
    if (item.cell && item.cell.placeable === false) {
      ctx.strokeStyle = hexToRgba(color, isActive ? 0.95 : 0.62);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      ctx.lineTo(poly[2].x, poly[2].y);
      ctx.moveTo(poly[1].x, poly[1].y);
      ctx.lineTo(poly[3].x, poly[3].y);
      ctx.stroke();
    }
  }

  function drawWall(ctx, center, edge, state, wallHeight, isCurrentLevel) {
    var zoom = Number(state.view.zoom) || 1;
    var line = edgeLine(center, edge, state);
    var drop = Math.max(1, Number(wallHeight) || 0) * LEVEL_STEP * 0.78 * zoom;
    ctx.beginPath();
    ctx.moveTo(line[0].x, line[0].y);
    ctx.lineTo(line[1].x, line[1].y);
    ctx.lineTo(line[1].x, line[1].y - drop);
    ctx.lineTo(line[0].x, line[0].y - drop);
    ctx.closePath();
    ctx.fillStyle = isCurrentLevel ? 'rgba(214,226,239,0.30)' : 'rgba(214,226,239,0.18)';
    ctx.strokeStyle = isCurrentLevel ? 'rgba(214,226,239,0.82)' : 'rgba(214,226,239,0.42)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  }

  function drawGridHelpers(ctx, state, info) {
    if (!state.view.showGrid) return;
    var activeLevel = state.activeLevel || 0;
    var bounds = domain.getLevelBounds(state.floorPlan, activeLevel);
    var startX = Number(bounds.originX) || 0;
    var startY = Number(bounds.originY) || 0;
    for (var y = startY; y < startY + bounds.rows; y++) {
      for (var x = startX; x < startX + bounds.cols; x++) {
        if (domain.getCell(state.floorPlan, activeLevel, x, y)) continue;
        var center = worldToScreen(x, y, activeLevel, state, info);
        if (!isCenterVisible(center, state, info)) continue;
        drawPolygon(ctx, diamondPolygon(center, state), null, 'rgba(255,255,255,0.08)', 1);
      }
    }
  }

  function drawSelection(ctx, state, info) {
    var selection = state.selection;
    if (!selection || selection.kind !== 'rect') return;
    var minX = Math.min(selection.x1, selection.x2);
    var maxX = Math.max(selection.x1, selection.x2);
    var minY = Math.min(selection.y1, selection.y2);
    var maxY = Math.max(selection.y1, selection.y2);
    for (var y = minY; y <= maxY; y++) {
      for (var x = minX; x <= maxX; x++) {
        var center = worldToScreen(x, y, state.activeLevel || 0, state, info);
        drawPolygon(ctx, diamondPolygon(center, state), 'rgba(150,210,255,0.14)', 'rgba(150,210,255,0.72)', 1.5);
      }
    }
  }

  function drawHover(ctx, state, info) {
    if (!state.hover) return;
    var hover = state.hover;
    var center = worldToScreen(hover.x, hover.y, hover.level || state.activeLevel || 0, state, info);
    drawPolygon(ctx, diamondPolygon(center, state), 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.92)', 2);
    if ((state.activeTool === 'wall' || state.activeTool === 'wall-erase') && hover.edge) {
      var line = edgeLine(center, hover.edge, state);
      ctx.beginPath();
      ctx.moveTo(line[0].x, line[0].y);
      ctx.lineTo(line[1].x, line[1].y);
      ctx.strokeStyle = state.activeTool === 'wall' ? 'rgba(255,255,255,0.94)' : 'rgba(255,140,140,0.94)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  function getActiveAnchor(state, info) {
    var level = state.activeLevel || 0;
    var store = state.floorPlan.levels && state.floorPlan.levels[String(level)] ? state.floorPlan.levels[String(level)] : {};
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var count = 0;
    Object.keys(store).forEach(function (key) {
      var cell = store[key];
      if (!cell || cell.enabled === false) return;
      var center = worldToScreen(cell.x, cell.y, level, state, info);
      minX = Math.min(minX, center.x);
      minY = Math.min(minY, center.y);
      maxX = Math.max(maxX, center.x);
      count += 1;
    });
    if (!count) {
      var bounds = domain.getLevelBounds(state.floorPlan, level);
      var fallback = worldToScreen((Number(bounds.originX) || 0) + Math.floor(bounds.cols / 2), (Number(bounds.originY) || 0) + Math.floor(bounds.rows / 2), level, state, info);
      return { x: fallback.x + 96, y: fallback.y - 40 };
    }
    return { x: maxX + 86, y: minY + 8 };
  }

  function drawArrowButton(ctx, x, y, symbol, active) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = active ? 'rgba(255,188,92,0.26)' : 'rgba(28,40,56,0.92)';
    ctx.strokeStyle = active ? 'rgba(255,188,92,0.82)' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, 0, 1);
    ctx.restore();
  }

  function drawRectButton(ctx, x, y, w, h, text, active) {
    ctx.fillStyle = active ? 'rgba(255,188,92,0.26)' : 'rgba(28,40,56,0.92)';
    ctx.strokeStyle = active ? 'rgba(255,188,92,0.82)' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
  }

  function drawHandleGizmo(ctx, state, info) {
    currentHandleRegions = [];
    if ((state.activeLevel || 0) === 0) return;
    var mode = safeText(state.view.handleMode || 'none');
    if (mode !== 'offset' && mode !== 'elevation') return;
    var anchor = getActiveAnchor(state, info);
    if (mode === 'offset') {
      var directions = ['up', 'right', 'down', 'left'];
      var symbolMap = { up: '↑', right: '→', down: '↓', left: '←' };
      directions.forEach(function (dir) {
        var logical = hitApi.screenDirectionToLogicalOffset(dir, state.view.rotation || 0);
        var vec = hitApi.logicalOffsetToScreenVector(logical.x, logical.y, state.view, { tileW: TILE_W, tileH: TILE_H });
        var len = Math.sqrt(vec.x * vec.x + vec.y * vec.y) || 1;
        var radius = 28;
        var x = anchor.x + (vec.x / len) * radius;
        var y = anchor.y + (vec.y / len) * radius;
        drawArrowButton(ctx, x, y, symbolMap[dir], true);
        currentHandleRegions.push({ kind: 'circle', cx: x, cy: y, r: 16, action: 'offset-' + dir });
      });
    } else if (mode === 'elevation') {
      drawRectButton(ctx, anchor.x - 18, anchor.y - 28, 36, 22, '+', true);
      drawRectButton(ctx, anchor.x - 18, anchor.y + 6, 36, 22, '−', true);
      currentHandleRegions.push({ kind: 'rect', x: anchor.x - 18, y: anchor.y - 28, w: 36, h: 22, action: 'elev-up' });
      currentHandleRegions.push({ kind: 'rect', x: anchor.x - 18, y: anchor.y + 6, w: 36, h: 22, action: 'elev-down' });
    }
  }

  function drawFocusBadge(ctx, state, info) {
    var level = state.activeLevel || 0;
    var color = domain.getLevelColor(state.floorPlan, level);
    ctx.fillStyle = hexToRgba(color, 0.14);
    ctx.strokeStyle = hexToRgba(color, 0.38);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(info.width - 176, 12, 158, 32, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(233,238,246,0.96)';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('当前编辑层：L' + level, info.width - 160, 28);
  }

  function drawCanvas(state) {
    var info = getCanvasInfo();
    var ctx = ui.ctx;
    var gradient = ctx.createLinearGradient(0, 0, 0, info.height);
    gradient.addColorStop(0, '#121924');
    gradient.addColorStop(1, '#0b1017');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, info.width, info.height);
    var items = collectRenderableItems(state, info);
    items.forEach(function (item) {
      drawCell(ctx, state, item);
      if (state.view.showWalls && item.cell && item.cell.walls) {
        ['n', 'e', 's', 'w'].forEach(function (edge) {
          var wallHeight = Number(item.cell.walls[edge]) || 0;
          if (wallHeight > 0) drawWall(ctx, item.center, edge, state, wallHeight, item.level === (state.activeLevel || 0));
        });
      }
    });
    drawGridHelpers(ctx, state, info);
    drawSelection(ctx, state, info);
    drawHover(ctx, state, info);
    drawHandleGizmo(ctx, state, info);
    drawFocusBadge(ctx, state, info);
    ctx.fillStyle = 'rgba(255,255,255,0.68)';
    ctx.font = '12px system-ui';
    ctx.fillText('Space + Drag / 中键：平移', 18, info.height - 44);
    ctx.fillText('滚轮：切层   Ctrl/Cmd + 滚轮：缩放', 18, info.height - 24);
    var sharedFootprints = {};
    items.forEach(function (item, index) {
      var key = String(item.x) + ',' + String(item.y);
      if (!sharedFootprints[key]) sharedFootprints[key] = { maxLevel: item.level, lastDrawnLevel: item.level, count: 0 };
      sharedFootprints[key].maxLevel = Math.max(sharedFootprints[key].maxLevel, item.level);
      sharedFootprints[key].lastDrawnLevel = item.level;
      sharedFootprints[key].count += 1;
    });
    var sharedTopmostLast = true;
    Object.keys(sharedFootprints).forEach(function (key) {
      var entry = sharedFootprints[key];
      if (entry.count > 1 && entry.lastDrawnLevel !== entry.maxLevel) sharedTopmostLast = false;
    });
    return {
      renderedCells: items.length,
      activeLevel: state.activeLevel || 0,
      viewRotation: hitApi.normalizeViewRotation(state.view.rotation || 0),
      viewDirection: hitApi.getViewDirectionLabel(state.view.rotation || 0),
      drawOrderRule: 'planeY-then-elevation-topmost-last',
      sharedFootprintTopmostLast: sharedTopmostLast
    };
  }

  function drawOverlapPreview(state) {
    var canvas = ui.overlapCanvas;
    var ctx = ui.overlapCtx;
    var width = canvas.width;
    var height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(10,16,24,1)';
    ctx.fillRect(0, 0, width, height);
    var cachedOverlap = getCachedOverlapData(state);
    var data = cachedOverlap.data;
    if (!data || !data.rendered) {
      ctx.fillStyle = 'rgba(255,255,255,0.34)';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var reasonText = '暂无可预览内容';
      if (data && data.emptyReason === 'empty-layer') reasonText = '所选层无 footprint';
      else if (data && data.emptyReason === 'no-visible-level') reasonText = '没有可见楼层';
      ctx.fillText(reasonText, width / 2, height / 2);
      ui.overlapSummaryText.textContent = reasonText;
      data.cached = !!cachedOverlap.cached;
      data.projection = 'top-down';
      data.rotationDecoupled = true;
      return data;
    }
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    data.entries.forEach(function (entry) {
      minX = Math.min(minX, entry.x);
      maxX = Math.max(maxX, entry.x);
      minY = Math.min(minY, entry.y);
      maxY = Math.max(maxY, entry.y);
    });
    var cols = Math.max(1, maxX - minX + 1);
    var rows = Math.max(1, maxY - minY + 1);
    var cellSize = Math.floor(Math.min((width - 24) / cols, (height - 24) / rows));
    cellSize = Math.max(10, Math.min(28, cellSize));
    var drawW = cols * cellSize;
    var drawH = rows * cellSize;
    var originX = Math.round((width - drawW) / 2);
    var originY = Math.round((height - drawH) / 2);
    data.entries.slice().sort(function (a, b) {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    }).forEach(function (entry) {
      var left = originX + (entry.x - minX) * cellSize;
      var top = originY + (entry.y - minY) * cellSize;
      var levels = entry.levels.slice().sort(function (a, b) { return a - b; });
      var topLevel = levels[levels.length - 1];
      ctx.fillStyle = hexToRgba(domain.getLevelColor(state.floorPlan, topLevel), 0.88);
      ctx.fillRect(left, top, cellSize, cellSize);
      if (levels.length > 1) {
        var stripeH = Math.max(3, Math.floor(cellSize / Math.max(3, levels.length + 1)));
        levels.forEach(function (level, idx) {
          ctx.fillStyle = hexToRgba(domain.getLevelColor(state.floorPlan, level), 0.92);
          ctx.fillRect(left, top + cellSize - stripeH * (idx + 1), cellSize, stripeH);
        });
      }
      ctx.strokeStyle = levels.indexOf(state.activeLevel || 0) >= 0 ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = levels.indexOf(state.activeLevel || 0) >= 0 ? 2 : 1;
      ctx.strokeRect(left + 0.5, top + 0.5, cellSize - 1, cellSize - 1);
    });
    var label = (state.view.selectedOverlapLevels && state.view.selectedOverlapLevels.length)
      ? ('Top-down overlap · 已选层：' + state.view.selectedOverlapLevels.join(', ') + ' · 重叠格 ' + data.overlapCells)
      : ('Top-down overlap · 所有可见层 · 重叠格 ' + data.overlapCells + ' · 层数 ' + data.levels.length);
    ui.overlapSummaryText.textContent = label;
    data.cached = !!cachedOverlap.cached;
    data.projection = 'top-down';
    data.rotationDecoupled = true;
    return data;
  }

  function updateToolButtons(activeTool) {
    Array.prototype.slice.call(document.querySelectorAll('[data-floor-tool]')).forEach(function (button) {
      button.classList.toggle('isActiveTool', button.getAttribute('data-floor-tool') === activeTool);
    });
  }

  function updateModeButtons(mode) {
    ui.toggleOffsetHandlesBtn.classList.toggle('isModeActive', mode === 'offset');
    ui.toggleElevationHandlesBtn.classList.toggle('isModeActive', mode === 'elevation');
  }

  function renderLevelList(state) {
    ui.levelList.innerHTML = '';
    var plan = state.floorPlan || { levelCount: 1 };
    for (let level = (plan.levelCount || 1) - 1; level >= 0; level--) {
      var meta = domain.getLevelMeta(plan, level);
      var bounds = domain.getLevelBounds(plan, level);
      var summary = domain.levelSummary(plan, level);
      var row = document.createElement('div');
      row.className = 'levelListItem' + (level === (state.activeLevel || 0) ? ' isActiveLevel' : '') + ((state.view.selectedOverlapLevels || []).indexOf(level) >= 0 ? ' isOverlapSelected' : '');
      row.setAttribute('data-level', String(level));

      var swatch = document.createElement('span');
      swatch.className = 'levelColorChip';
      swatch.style.background = meta.color;

      var texts = document.createElement('div');
      texts.className = 'levelListTexts';
      var title = document.createElement('div');
      title.className = 'levelListTitle';
      title.textContent = safeText(meta.name || ('L' + level));
      var meta1 = document.createElement('div');
      meta1.className = 'levelListMeta';
      meta1.textContent = 'L' + level + ' · ' + bounds.cols + '×' + bounds.rows + ' · 地板 ' + summary.enabled;
      var meta2 = document.createElement('div');
      meta2.className = 'levelListMeta';
      meta2.textContent = 'offset (' + (meta.offsetX || 0) + ', ' + (meta.offsetY || 0) + ') · elev ' + (meta.elevationGap || 0);
      texts.appendChild(title);
      texts.appendChild(meta1);
      texts.appendChild(meta2);

      var visBtn = document.createElement('button');
      visBtn.type = 'button';
      visBtn.className = 'levelRowButton';
      visBtn.textContent = meta.visible !== false ? '👁' : '🚫';
      visBtn.title = meta.visible !== false ? '隐藏该层' : '显示该层';
      visBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var lvl = level;
        var info = domain.getLevelMeta(controller.getState().floorPlan, lvl);
        controller.setLevelVisibility(lvl, info.visible === false);
      });

      var lockBtn = document.createElement('button');
      lockBtn.type = 'button';
      lockBtn.className = 'levelRowButton';
      lockBtn.textContent = meta.locked === true ? '🔒' : '🔓';
      lockBtn.title = meta.locked === true ? '解锁该层' : '锁定该层';
      lockBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var lvl = level;
        var info = domain.getLevelMeta(controller.getState().floorPlan, lvl);
        controller.setLevelLocked(lvl, info.locked !== true);
      });

      row.addEventListener('click', function (ev) {
        var lvl = level;
        if (ev.ctrlKey || ev.metaKey) controller.selectLevel(lvl, { toggleOverlap: true, clearOverlap: false });
        else controller.selectLevel(lvl, { clearOverlap: true });
      });

      var controls = document.createElement('div');
      controls.className = 'levelListControls';
      controls.appendChild(visBtn);
      controls.appendChild(lockBtn);

      row.appendChild(swatch);
      row.appendChild(texts);
      row.appendChild(controls);
      ui.levelList.appendChild(row);
    }
    ui.levelListStatus.textContent = '普通点击切换当前层；Ctrl + 点击加入/移出 overlap 选择。';
    ui.removeLevelBtn.disabled = (plan.levelCount || 1) <= 1;
  }

  function renderText(state, meta) {
    if (!globalDraft || (meta && ['boot', 'new-rectangle-plan', 'new-custom-plan', 'import-payload', 'load-autosave', 'undo', 'redo', 'apply-plan-meta'].indexOf(meta.reason) >= 0)) {
      globalDraft = buildGlobalDraft(state);
    }
    if (!levelDraft || levelDraft.level !== (state.activeLevel || 0) || (meta && ['boot', 'select-level', 'set-active-level', 'apply-current-level-meta', 'add-level', 'copy-active-level', 'remove-top-level', 'undo', 'redo', 'import-payload', 'load-autosave'].indexOf(meta.reason) >= 0)) {
      levelDraft = buildLevelDraft(state);
    }

    var summary = domain.summarize(state.floorPlan, (meta && meta.reason) || 'render', state.activeLevel || 0);
    var currentMeta = domain.getLevelMeta(state.floorPlan, state.activeLevel || 0);
    var currentBounds = domain.getLevelBounds(state.floorPlan, state.activeLevel || 0);

    ui.status.textContent = '状态：' + safeText((meta && meta.reason) || state.lastAction || 'ready');

    if (document.activeElement !== ui.floorNameInput) ui.floorNameInput.value = globalDraft.name;
    if (document.activeElement !== ui.shapeModeSelect) ui.shapeModeSelect.value = globalDraft.shapeMode;
    if (document.activeElement !== ui.floorColsInput) ui.floorColsInput.value = String(globalDraft.cols);
    if (document.activeElement !== ui.floorRowsInput) ui.floorRowsInput.value = String(globalDraft.rows);
    if (document.activeElement !== ui.wallHeightInput) ui.wallHeightInput.value = String(globalDraft.defaultWallHeight);

    ui.currentLevelTitle.textContent = safeText(currentMeta.name || ('L' + (state.activeLevel || 0)));
    if (ui.currentViewDirectionLabel) {
      var labelRotation = state.view && state.view.isRotationAnimating ? state.view.rotationTo : hitApi.normalizeViewRotation(getEffectiveRotation(state));
      var labelText = hitApi.getViewDirectionLabel(labelRotation) + ' · ' + (hitApi.normalizeViewRotation(labelRotation) * 90) + '°';
      if (interactionFrozen()) labelText += ' · 动画中';
      ui.currentViewDirectionLabel.textContent = labelText;
    }
    if (ui.rotationAnimationMsSelect && document.activeElement !== ui.rotationAnimationMsSelect) {
      ui.rotationAnimationMsSelect.value = String(Number(state.view.rotationAnimationMs) || 0);
    }
    ui.rotateLeftBtn.disabled = interactionFrozen();
    ui.rotateRightBtn.disabled = interactionFrozen();
    if (ui.rotationAnimationMsSelect) ui.rotationAnimationMsSelect.disabled = interactionFrozen();
    ui.currentLevelBadge.textContent = currentMeta.locked ? '当前层（已锁定）' : (interactionFrozen() ? '当前编辑层（旋转动画中）' : '当前编辑层');
    ui.currentLevelColorChip.style.background = currentMeta.color || domain.getLevelColor(state.floorPlan, state.activeLevel || 0);
    ui.activeLevelText.textContent = 'L' + (state.activeLevel || 0) + ' / ' + (state.floorPlan.levelCount || 1);

    if (document.activeElement !== ui.currentLevelNameInput) ui.currentLevelNameInput.value = safeText(levelDraft.name);
    ui.currentLevelColorInput.value = safeText(domain.getLevelColor(state.floorPlan, state.activeLevel || 0));
    if (document.activeElement !== ui.currentLevelColsInput) ui.currentLevelColsInput.value = String(levelDraft.cols);
    if (document.activeElement !== ui.currentLevelRowsInput) ui.currentLevelRowsInput.value = String(levelDraft.rows);
    if (document.activeElement !== ui.currentOffsetXInput) ui.currentOffsetXInput.value = String(levelDraft.offsetX);
    if (document.activeElement !== ui.currentOffsetYInput) ui.currentOffsetYInput.value = String(levelDraft.offsetY);
    if (document.activeElement !== ui.currentElevationGapInput) ui.currentElevationGapInput.value = String(levelDraft.elevationGap);
    ui.currentLevelColorInput.disabled = true;
    ui.currentOffsetXInput.disabled = (state.activeLevel || 0) === 0;
    ui.currentOffsetYInput.disabled = (state.activeLevel || 0) === 0;
    ui.currentElevationGapInput.disabled = (state.activeLevel || 0) === 0;

    ui.zoomRange.value = Number(state.view.zoom || 1).toFixed(2);
    ui.zoomValueText.textContent = Math.round((Number(state.view.zoom) || 1) * 100) + '%';
    ui.showGridToggle.checked = !!state.view.showGrid;
    ui.showWallsToggle.checked = !!state.view.showWalls;
    ui.showAdjacentToggle.checked = !!state.view.showAdjacentLevels;
    ui.wallBrushHeightInput.max = state.floorPlan.maxWallHeight;
    ui.wallBrushHeightInput.value = String(state.wallBrushHeight);

    ui.toolInfo.textContent = toolLabels[state.activeTool] || state.activeTool;
    ui.hoverInfo.textContent = state.hover ? ('L' + state.hover.level + ' (' + state.hover.x + ', ' + state.hover.y + ')' + (state.hover.cell ? (state.hover.cell.placeable === false ? ' · blocked' : ' · floor') : ' · empty') + (state.hover.edge ? ' · edge=' + state.hover.edge : '')) : '无';
    ui.selectionInfo.textContent = state.selection && state.selection.kind === 'rect'
      ? ('rect [' + state.selection.x1 + ',' + state.selection.y1 + ']→[' + state.selection.x2 + ',' + state.selection.y2 + '] @L' + (state.activeLevel || 0))
      : '无';
    ui.enabledCountText.textContent = String(summary.currentLevelEnabled);
    ui.blockedCountText.textContent = String(summary.currentLevelBlocked);
    ui.wallCountText.textContent = String(summary.currentLevelWallSegments);
    ui.totalLevelsText.textContent = String(summary.levelCount);
    ui.totalEnabledText.textContent = String(summary.enabledCount);
    ui.legendInfo.textContent = '当前层尺寸 ' + currentBounds.cols + '×' + currentBounds.rows + '；offset (' + currentMeta.offsetX + ', ' + currentMeta.offsetY + ')；elevationGap ' + currentMeta.elevationGap + '。';

    updateToolButtons(state.activeTool);
    updateModeButtons(state.view.handleMode || 'none');
    renderLevelList(state);
  }

  function render(state, meta) {
    var renderState = makeRenderState(state);
    renderText(renderState, meta || {});
    var drawStats = drawCanvas(renderState);
    var overlapStats = drawOverlapPreview(renderState);
    var renderSummary = {
      activeLevel: renderState.activeLevel || 0,
      overlapLevels: (renderState.view.selectedOverlapLevels || []).slice(),
      draw: drawStats,
      overlap: overlapStats,
      viewRotation: hitApi.normalizeViewRotation(renderState.view.rotation || 0),
      viewDirection: hitApi.getViewDirectionLabel(renderState.view.rotation || 0),
      isRotationAnimating: interactionFrozen(),
      visualRotation: Number(renderState.view.rotation) || 0,
      overlapRendered: !!(overlapStats && overlapStats.rendered),
      overlapCached: !!(overlapStats && overlapStats.cached),
      overlapProjection: overlapStats && overlapStats.projection || 'unknown',
      overlapIndependentOfViewRotation: !!(overlapStats && overlapStats.rotationDecoupled),
      animationFrameCount: rotationAnim.active ? rotationAnim.frameCount : 0,
      animationElapsedMs: rotationAnim.active ? Math.round(rotationAnim.lastElapsedMs || 0) : 0
    };
    captureDiagnosticsSafe('captureRenderCycle', renderSummary);
    captureDiagnosticsSafe('setLatest', 'render-summary', renderSummary);
    window.__FLOOR_EDITOR_READY__ = true;
  }

  function exportDiagnosticLog(trigger) {
    if (!diagnostics || typeof diagnostics.downloadDiagnostic !== 'function') return null;
    var state = controller.getState();
    return diagnostics.downloadDiagnostic(state, {
      trigger: String(trigger || 'manual'),
      uiBindings: summarizeUiBindings(),
      currentStatusText: ui.status ? safeText(ui.status.textContent) : '',
      activeHandleMode: state && state.view ? safeText(state.view.handleMode || 'none') : 'none'
    });
  }

  function updateGlobalDraft() {
    if (!globalDraft) globalDraft = buildGlobalDraft(controller.getState());
    globalDraft.name = safeText(ui.floorNameInput.value);
    globalDraft.shapeMode = safeText(ui.shapeModeSelect.value) || 'rectangle';
    globalDraft.cols = Math.max(1, Number(ui.floorColsInput.value) || globalDraft.cols || 10);
    globalDraft.rows = Math.max(1, Number(ui.floorRowsInput.value) || globalDraft.rows || 8);
    globalDraft.defaultWallHeight = Math.max(1, Number(ui.wallHeightInput.value) || globalDraft.defaultWallHeight || 2);
  }

  function updateLevelDraft() {
    if (!levelDraft) levelDraft = buildLevelDraft(controller.getState());
    levelDraft.name = safeText(ui.currentLevelNameInput.value);
    levelDraft.color = safeText(domain.getLevelColor(controller.getState().floorPlan, levelDraft.level || 0));
    levelDraft.cols = Math.max(1, Number(ui.currentLevelColsInput.value) || levelDraft.cols || 10);
    levelDraft.rows = Math.max(1, Number(ui.currentLevelRowsInput.value) || levelDraft.rows || 8);
    levelDraft.offsetX = Math.round(Number(ui.currentOffsetXInput.value) || 0);
    levelDraft.offsetY = Math.round(Number(ui.currentOffsetYInput.value) || 0);
    levelDraft.elevationGap = Math.max(levelDraft.level === 0 ? 0 : 1, Math.round(Number(ui.currentElevationGapInput.value) || (levelDraft.level === 0 ? 0 : 1)));
  }

  function applyGlobalMetaFromInputs() {
    updateGlobalDraft();
    controller.applyMeta({
      name: globalDraft.name,
      shapeMode: globalDraft.shapeMode,
      defaultWallHeight: globalDraft.defaultWallHeight
    });
  }

  function applyCurrentLevelMetaFromInputs() {
    updateLevelDraft();
    controller.applyCurrentLevelMeta({
      name: levelDraft.name,
      cols: levelDraft.cols,
      rows: levelDraft.rows,
      offsetX: levelDraft.offsetX,
      offsetY: levelDraft.offsetY,
      elevationGap: levelDraft.elevationGap
    });
  }

  function updateHoverFromEvent(ev) {
    var state = controller.getState();
    var info = getCanvasInfo();
    var px = ev.clientX - info.rect.left;
    var py = ev.clientY - info.rect.top;
    var hover = hitApi.hitTestLevel(domain, state.floorPlan, state.activeLevel || 0, px, py, state.view, info, { tileW: TILE_W, tileH: TILE_H, levelStep: LEVEL_STEP }, { tool: state.activeTool });
    var diagnosticsStats = cloneJson(hitApi.lastDiagnostics || {});
    captureDiagnosticsSafe('captureHitTest', {
      time: new Date().toISOString(),
      stats: {
        clientX: ev.clientX,
        clientY: ev.clientY,
        canvasX: px,
        canvasY: py,
        activeLevel: state.activeLevel || 0,
        currentRotation: hitApi.normalizeViewRotation(state.view.rotation || 0),
        currentDirectionLabel: hitApi.getViewDirectionLabel(state.view.rotation || 0),
        viewRotation: hitApi.normalizeViewRotation(state.view.rotation || 0),
        viewDirection: hitApi.getViewDirectionLabel(state.view.rotation || 0),
        sourceItemCount: Object.keys((state.floorPlan.levels && state.floorPlan.levels[String(state.activeLevel || 0)]) || {}).length,
        candidateCount: Number(diagnosticsStats.candidateCount) || 0,
        candidateNorthCount: Number(diagnosticsStats.candidateNorthCount) || 0,
        candidateSouthCount: Number(diagnosticsStats.candidateSouthCount) || 0,
        candidateEastCount: Number(diagnosticsStats.candidateEastCount) || 0,
        candidateWestCount: Number(diagnosticsStats.candidateWestCount) || 0,
        chosenDirection: diagnosticsStats.chosenDirection || null,
        chosenCell: diagnosticsStats.chosenCell || null,
        chosenWithinBounds: diagnosticsStats.chosenWithinBounds,
        resolvedGridX: diagnosticsStats.resolvedGridX,
        resolvedGridY: diagnosticsStats.resolvedGridY,
        targetHasCell: diagnosticsStats.targetHasCell === true,
        targetWithinBounds: diagnosticsStats.targetWithinBounds !== false,
        targetWithinExpandedBounds: diagnosticsStats.targetWithinExpandedBounds !== false,
        isAdjacentToExisting: diagnosticsStats.isAdjacentToExisting === true,
        paintMode: diagnosticsStats.paintMode || null,
        growBoundsTriggered: false,
        match: hover ? { x: hover.x, y: hover.y, edge: hover.edge, hasCell: !!hover.cell, withinBounds: hover.withinBounds !== false } : null
      }
    });
    controller.setHover(hover || null);
    return hover;
  }

  function commitHoverWithDiagnostics(hover) {
    if (!hover) return null;
    var beforeState = controller.getState();
    var beforeBounds = domain.getLevelBounds(beforeState.floorPlan, beforeState.activeLevel || 0);
    controller.commitToolAtHover(hover);
    controller.setHover(hover || null);
    var afterState = controller.getState();
    var afterBounds = domain.getLevelBounds(afterState.floorPlan, afterState.activeLevel || 0);
    var growBoundsTriggered = beforeBounds.originX !== afterBounds.originX || beforeBounds.originY !== afterBounds.originY || beforeBounds.cols !== afterBounds.cols || beforeBounds.rows !== afterBounds.rows;
    captureDiagnosticsSafe('captureHitTest', {
      time: new Date().toISOString(),
      stats: {
        commit: true,
        activeLevel: afterState.activeLevel || 0,
        viewRotation: hitApi.normalizeViewRotation(afterState.view.rotation || 0),
        viewDirection: hitApi.getViewDirectionLabel(afterState.view.rotation || 0),
        sourceItemCount: Object.keys((afterState.floorPlan.levels && afterState.floorPlan.levels[String(afterState.activeLevel || 0)]) || {}).length,
        candidateCount: hover.diagnostics ? Number(hover.diagnostics.candidateCount) || 0 : 0,
        candidateNorthCount: hover.diagnostics ? Number(hover.diagnostics.candidateNorthCount) || 0 : 0,
        candidateSouthCount: hover.diagnostics ? Number(hover.diagnostics.candidateSouthCount) || 0 : 0,
        candidateEastCount: hover.diagnostics ? Number(hover.diagnostics.candidateEastCount) || 0 : 0,
        candidateWestCount: hover.diagnostics ? Number(hover.diagnostics.candidateWestCount) || 0 : 0,
        chosenDirection: hover.diagnostics ? hover.diagnostics.chosenDirection || null : null,
        chosenCell: hover ? { x: hover.x, y: hover.y } : null,
        chosenWithinBounds: hover ? hover.withinBounds !== false : null,
        resolvedGridX: hover.diagnostics ? hover.diagnostics.resolvedGridX : hover.x,
        resolvedGridY: hover.diagnostics ? hover.diagnostics.resolvedGridY : hover.y,
        targetHasCell: hover.diagnostics ? hover.diagnostics.targetHasCell === true : !!hover.cell,
        targetWithinBounds: hover.diagnostics ? hover.diagnostics.targetWithinBounds !== false : hover.withinBounds !== false,
        targetWithinExpandedBounds: domain.isWithinLevelBounds(afterBounds, hover.x, hover.y),
        isAdjacentToExisting: hover.diagnostics ? hover.diagnostics.isAdjacentToExisting === true : false,
        paintMode: hover.diagnostics ? hover.diagnostics.paintMode || null : null,
        growBoundsTriggered: growBoundsTriggered
      }
    });
    return afterState;
  }

  function hitHandle(clientX, clientY) {
    var info = getCanvasInfo();
    var px = clientX - info.rect.left;
    var py = clientY - info.rect.top;
    for (var i = 0; i < currentHandleRegions.length; i++) {
      var region = currentHandleRegions[i];
      if (region.kind === 'circle') {
        var dx = px - region.cx;
        var dy = py - region.cy;
        if ((dx * dx + dy * dy) <= region.r * region.r) return region;
      } else if (region.kind === 'rect') {
        if (px >= region.x && px <= region.x + region.w && py >= region.y && py <= region.y + region.h) return region;
      }
    }
    return null;
  }

  function isRectTool(tool) { return tool === 'rect-floor' || tool === 'rect-blocked' || tool === 'rect-erase'; }

  function applyHandleAction(action) {
    if (action === 'offset-up') controller.nudgeActiveLevelOffset(-1, -1);
    else if (action === 'offset-down') controller.nudgeActiveLevelOffset(1, 1);
    else if (action === 'offset-left') controller.nudgeActiveLevelOffset(-1, 1);
    else if (action === 'offset-right') controller.nudgeActiveLevelOffset(1, -1);
    else if (action === 'elev-up') controller.nudgeActiveLevelElevation(1);
    else if (action === 'elev-down') controller.nudgeActiveLevelElevation(-1);
  }

  function onPointerDown(ev) {
    if (interactionFrozen()) return;
    if (ev.button === 1 || ev.buttons === 4 || ev.shiftKey || drag.spaceMode) {
      drag.panning = true;
      drag.lastX = ev.clientX;
      drag.lastY = ev.clientY;
      return;
    }
    var handle = hitHandle(ev.clientX, ev.clientY);
    if (handle) {
      applyHandleAction(handle.action);
      return;
    }
    var state = controller.getState();
    var hover = updateHoverFromEvent(ev);
    if (!hover) return;
    if (isRectTool(state.activeTool)) {
      drag.recting = true;
      controller.beginRectSelection(hover);
      return;
    }
    commitHoverWithDiagnostics(hover);
  }

  function onPointerMove(ev) {
    if (interactionFrozen()) return;
    if (drag.panning) {
      var dx = ev.clientX - drag.lastX;
      var dy = ev.clientY - drag.lastY;
      drag.lastX = ev.clientX;
      drag.lastY = ev.clientY;
      var state = controller.getState();
      controller.patchView({ offsetX: (Number(state.view.offsetX) || 0) + dx, offsetY: (Number(state.view.offsetY) || 0) + dy });
      return;
    }
    var hover = updateHoverFromEvent(ev);
    var state = controller.getState();
    if (drag.recting && state.selection && state.selection.kind === 'rect') {
      controller.updateRectSelection(hover);
      return;
    }
    if ((ev.buttons & 1) === 1 && !isRectTool(state.activeTool) && !drag.spaceMode) commitHoverWithDiagnostics(hover);
  }

  function onPointerUp() {
    if (drag.recting) controller.commitRectSelection();
    drag.recting = false;
    drag.panning = false;
  }

  function bindEvents() {
    [ui.floorNameInput, ui.shapeModeSelect, ui.floorColsInput, ui.floorRowsInput, ui.wallHeightInput].forEach(function (el) {
      el.addEventListener('input', updateGlobalDraft);
      el.addEventListener('change', updateGlobalDraft);
    });
    [ui.currentLevelNameInput, ui.currentLevelColorInput, ui.currentLevelColsInput, ui.currentLevelRowsInput, ui.currentOffsetXInput, ui.currentOffsetYInput, ui.currentElevationGapInput].forEach(function (el) {
      el.addEventListener('input', updateLevelDraft);
      el.addEventListener('change', updateLevelDraft);
    });

    ui.canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    ui.canvas.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      if (interactionFrozen()) return;
      if (ev.ctrlKey || ev.metaKey) {
        var state = controller.getState();
        var nextZoom = clamp((Number(state.view.zoom) || 1) + (ev.deltaY > 0 ? -0.08 : 0.08), 0.45, 2.4);
        controller.patchView({ zoom: Number(nextZoom.toFixed(2)) });
        return;
      }
      controller.stepActiveLevel(ev.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    Array.prototype.slice.call(document.querySelectorAll('[data-floor-tool]')).forEach(function (button) {
      button.addEventListener('click', function () { controller.setTool(button.getAttribute('data-floor-tool')); });
    });

    ui.applyFloorMetaBtn.addEventListener('click', applyGlobalMetaFromInputs);
    ui.createRectanglePlanBtn.addEventListener('click', function () {
      updateGlobalDraft();
      controller.newRectanglePlan({ name: globalDraft.name, cols: globalDraft.cols, rows: globalDraft.rows, levelCount: 1, defaultWallHeight: globalDraft.defaultWallHeight });
    });
    ui.createCustomPlanBtn.addEventListener('click', function () {
      updateGlobalDraft();
      controller.newCustomPlan({ name: globalDraft.name, cols: globalDraft.cols, rows: globalDraft.rows, levelCount: 1, defaultWallHeight: globalDraft.defaultWallHeight });
    });

    ui.addLevelBtn.addEventListener('click', function () { controller.addLevel(); });
    if (ui.rotateLeftBtn) ui.rotateLeftBtn.addEventListener('click', function () { controller.rotateViewLeft(); });
    if (ui.rotateRightBtn) ui.rotateRightBtn.addEventListener('click', function () { controller.rotateViewRight(); });
    if (ui.rotationAnimationMsSelect) ui.rotationAnimationMsSelect.addEventListener('change', function () { controller.setRotationAnimationMs(Number(ui.rotationAnimationMsSelect.value) || 0); });
    if (ui.addRectLevelBtn && controller.addRectInitializedLevel) ui.addRectLevelBtn.addEventListener('click', function () { controller.addRectInitializedLevel(); });
    ui.copyLevelBtn.addEventListener('click', function () { controller.copyActiveLevel(); });
    ui.removeLevelBtn.addEventListener('click', function () { controller.removeTopLevel(); });
    ui.clearOverlapSelectionBtn.addEventListener('click', function () { controller.clearSelectedOverlapLevels(); });

    ui.zoomRange.addEventListener('input', function () { controller.patchView({ zoom: clamp(Number(ui.zoomRange.value) || 1, 0.45, 2.4) }); });
    ui.showGridToggle.addEventListener('change', function () { controller.patchView({ showGrid: !!ui.showGridToggle.checked }); });
    ui.showWallsToggle.addEventListener('change', function () { controller.patchView({ showWalls: !!ui.showWallsToggle.checked }); });
    ui.showAdjacentToggle.addEventListener('change', function () { controller.patchView({ showAdjacentLevels: !!ui.showAdjacentToggle.checked }); });

    ui.undoBtn.addEventListener('click', function () { controller.undo(); });
    ui.redoBtn.addEventListener('click', function () { controller.redo(); });
    ui.saveAutosaveBtn.addEventListener('click', function () { controller.saveAutosave(); });
    ui.loadAutosaveBtn.addEventListener('click', function () { controller.loadAutosave(); });
    ui.exportFloorBtn.addEventListener('click', function () { controller.exportProject(); });
    ui.importFloorBtn.addEventListener('click', function () { ui.importFloorFile.click(); });
    ui.exportDiagnosticLogBtn.addEventListener('click', function () { exportDiagnosticLog('button'); });
    ui.clearAutosaveBtn.addEventListener('click', function () {
      if (window.__FLOOR_EDITOR_STORAGE__ && typeof window.__FLOOR_EDITOR_STORAGE__.clearAutosave === 'function') {
        window.__FLOOR_EDITOR_STORAGE__.clearAutosave();
        ui.status.textContent = '状态：autosave-cleared';
      }
    });
    ui.importFloorFile.addEventListener('change', function () {
      var file = ui.importFloorFile.files && ui.importFloorFile.files[0];
      if (!file) return;
      controller.importFile(file).catch(function (err) { window.alert('导入失败：' + safeText(err && err.message ? err.message : err)); });
      ui.importFloorFile.value = '';
    });

    ui.applyCurrentLevelMetaBtn.addEventListener('click', applyCurrentLevelMetaFromInputs);
    ui.prevLevelBtn.addEventListener('click', function () { controller.stepActiveLevel(-1); });
    ui.nextLevelBtn.addEventListener('click', function () { controller.stepActiveLevel(1); });
    ui.applyPerimeterWallsBtn.addEventListener('click', function () { controller.applyPerimeterWallsCurrentLevel(); });
    ui.clearWallsBtn.addEventListener('click', function () { controller.clearWallsCurrentLevel(); });
    ui.wallBrushHeightInput.addEventListener('input', function () { controller.setWallBrushHeight(Number(ui.wallBrushHeightInput.value) || 1); });
    ui.toggleOffsetHandlesBtn.addEventListener('click', function () {
      var mode = controller.getState().view.handleMode === 'offset' ? 'none' : 'offset';
      controller.setHandleMode(mode);
    });
    ui.toggleElevationHandlesBtn.addEventListener('click', function () {
      var mode = controller.getState().view.handleMode === 'elevation' ? 'none' : 'elevation';
      controller.setHandleMode(mode);
    });
    ui.resetLevelTransformBtn.addEventListener('click', function () { controller.resetActiveLevelTransform(); });

    window.addEventListener('resize', function () { render(controller.getState(), { reason: 'resize' }); });
    window.addEventListener('keydown', function (ev) {
      var lower = safeText(ev.key).toLowerCase();
      if (ev.code === 'Space') { drag.spaceMode = true; return; }
      if ((ev.ctrlKey || ev.metaKey) && lower === 'z') { ev.preventDefault(); controller.undo(); return; }
      if ((ev.ctrlKey || ev.metaKey) && lower === 'y') { ev.preventDefault(); controller.redo(); return; }
      if (ev.key === 'Escape') { controller.cancelSelection(); return; }
      if (lower === 'q') { ev.preventDefault(); controller.rotateViewLeft(); return; }
      if (lower === 'e') { ev.preventDefault(); controller.rotateViewRight(); return; }
      if (interactionFrozen()) return;
      if (ev.altKey && ev.key === 'ArrowUp') { ev.preventDefault(); var up = hitApi.screenDirectionToLogicalOffset('up', controller.getState().view.rotation || 0); controller.nudgeActiveLevelOffset(up.x, up.y); return; }
      if (ev.altKey && ev.key === 'ArrowDown') { ev.preventDefault(); var down = hitApi.screenDirectionToLogicalOffset('down', controller.getState().view.rotation || 0); controller.nudgeActiveLevelOffset(down.x, down.y); return; }
      if (ev.altKey && ev.key === 'ArrowLeft') { ev.preventDefault(); var left = hitApi.screenDirectionToLogicalOffset('left', controller.getState().view.rotation || 0); controller.nudgeActiveLevelOffset(left.x, left.y); return; }
      if (ev.altKey && ev.key === 'ArrowRight') { ev.preventDefault(); var right = hitApi.screenDirectionToLogicalOffset('right', controller.getState().view.rotation || 0); controller.nudgeActiveLevelOffset(right.x, right.y); return; }
      if (ev.altKey && ev.code === 'PageUp') { ev.preventDefault(); controller.nudgeActiveLevelElevation(1); return; }
      if (ev.altKey && ev.code === 'PageDown') { ev.preventDefault(); controller.nudgeActiveLevelElevation(-1); return; }
      if (lower === 'b') controller.setTool('brush-floor');
      else if (lower === 'o') controller.setTool('brush-blocked');
      else if (lower === 'e') controller.setTool('erase');
      else if (lower === 'w') controller.setTool('wall');
      else if (lower === 'v') controller.setTool('wall-erase');
      else if (lower === 'r') controller.setTool('rect-floor');
      else if (lower === 't') controller.setTool('rect-blocked');
      else if (lower === 'x') controller.setTool('rect-erase');
      else if (lower === 'f') controller.setTool('fill-floor');
      else if (lower === 'g') controller.setTool('fill-blocked');
      else if (lower === 'c') controller.setTool('fill-erase');
      else if (lower === '[') controller.stepActiveLevel(-1);
      else if (lower === ']') controller.stepActiveLevel(1);
    });
    window.addEventListener('keyup', function (ev) { if (ev.code === 'Space') drag.spaceMode = false; });
  }

  function boot() {
    bindUi();
    syncDraftsFromState(controller.getState());
    bindEvents();
    captureDiagnosticsSafe('captureLifecycle', 'boot-ui-bound', summarizeUiBindings());
    controller.subscribe(function (state, meta) {
      captureDiagnosticsSafe('captureControllerEvent', meta || {}, state);
      if (maybeStartRotationAnimation(state, meta || {})) {
        render(state, meta || {});
        return;
      }
      render(state, meta || {});
    });
    try { controller.loadAutosave(); } catch (_) {}
    render(controller.getState(), { reason: 'boot' });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
