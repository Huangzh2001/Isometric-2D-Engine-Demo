(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/application/floor-editor/floor-editor-controller.js';
  var PHASE = 'FLOOR-APP-V37';
  var stateApi = window.__FLOOR_EDITOR_STATE__ || null;
  var domain = window.__FLOOR_EDITOR_DOMAIN__ || null;
  var storage = window.__FLOOR_EDITOR_STORAGE__ || null;
  if (!stateApi || !domain || !storage) {
    console.error('[FLOOR-APP] missing dependencies', { state: !!stateApi, domain: !!domain, storage: !!storage });
    return;
  }

  var listeners = [];
  var autosaveTimer = null;

  function cloneJson(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; } }
  function summarizePlan(plan, activeLevel, label) {
    try { return cloneJson(domain.summarize(plan, label || 'app-summary', activeLevel || 0)); } catch (_) { return null; }
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    listeners.push(listener);
    return function () { listeners = listeners.filter(function (item) { return item !== listener; }); };
  }

  function getState() { return stateApi.getState(); }

  function emit(reason, payload) {
    var snapshot = getState();
    listeners.slice().forEach(function (listener) {
      try { listener(snapshot, { reason: reason, payload: payload || null }); }
      catch (err) { console.error('[FLOOR-APP] listener failed', err); }
    });
    return snapshot;
  }

  function queueAutosave(snapshot) {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      try { storage.saveAutosave(snapshot || getState()); } catch (_) {}
    }, 180);
  }

  function activeLevelLocked(snapshot) {
    snapshot = snapshot || getState();
    var meta = domain.getLevelMeta(snapshot.floorPlan, snapshot.activeLevel || 0);
    return meta && meta.locked === true;
  }

  function levelTransformSnapshot(plan, level, options) {
    options = options || {};
    level = Number(level);
    if (!isFinite(level) || level < 0 || !plan || level >= (plan.levelCount || 1)) {
      return {
        offsetX: 0,
        offsetY: 0,
        elevationGap: level === 0 ? 0 : 1,
        cols: null,
        rows: null,
        exists: false
      };
    }
    var meta = domain.getLevelMeta(plan, level);
    var bounds = domain.getLevelBounds(plan, level);
    return {
      offsetX: Number(meta.offsetX) || 0,
      offsetY: Number(meta.offsetY) || 0,
      elevationGap: Number(meta.elevationGap) || (level === 0 ? 0 : 1),
      cols: Number(bounds.cols) || 0,
      rows: Number(bounds.rows) || 0,
      exists: true
    };
  }

  function buildLevelTransitionPayload(reason, beforeState, afterState, targetLevel, options) {
    options = options || {};
    var before = levelTransformSnapshot(beforeState.floorPlan, targetLevel, options);
    var after = levelTransformSnapshot(afterState.floorPlan, targetLevel, options);
    var whetherOffsetChanged = before.offsetX !== after.offsetX || before.offsetY !== after.offsetY;
    var whetherElevationChanged = before.elevationGap !== after.elevationGap;
    var offsetChangedWithoutExplicitOffsetAction = !!(whetherOffsetChanged && options.explicitOffsetAction !== true);
    var payload = {
      reason: reason,
      activeLevel: beforeState.activeLevel || 0,
      targetLevel: targetLevel,
      before: before,
      after: after,
      whetherOffsetChanged: whetherOffsetChanged,
      whetherElevationChanged: whetherElevationChanged,
      offsetChangedWithoutExplicitOffsetAction: offsetChangedWithoutExplicitOffsetAction
    };
    if (offsetChangedWithoutExplicitOffsetAction) payload.anomaly = 'OFFSET_CHANGED_WITHOUT_EXPLICIT_OFFSET_ACTION';
    if (options.extra) {
      Object.keys(options.extra).forEach(function (key) { payload[key] = cloneJson(options.extra[key]); });
    }
    return payload;
  }

  function newRectanglePlan(payload) {
    payload = payload || {};
    var plan = domain.createRectanglePlan({
      name: payload.name || 'Untitled Floor Plan',
      cols: payload.cols,
      rows: payload.rows,
      levelCount: payload.levelCount,
      defaultWallHeight: payload.defaultWallHeight
    });
    stateApi.resetWithPlan(plan, { activeLevel: 0, wallBrushHeight: plan.defaultWallHeight, dirty: true, view: getState().view });
    queueAutosave(stateApi.getState());
    return emit('new-rectangle-plan', payload);
  }

  function newCustomPlan(payload) {
    payload = payload || {};
    var plan = domain.createCustomPlan({
      name: payload.name || 'Untitled Floor Plan',
      cols: payload.cols,
      rows: payload.rows,
      levelCount: payload.levelCount,
      defaultWallHeight: payload.defaultWallHeight
    });
    stateApi.resetWithPlan(plan, { activeLevel: 0, wallBrushHeight: plan.defaultWallHeight, dirty: true, view: getState().view });
    queueAutosave(stateApi.getState());
    return emit('new-custom-plan', payload);
  }

  function applyBrush(tool, hover) {
    if (!hover) return getState();
    var snapshot = getState();
    if (activeLevelLocked(snapshot)) return snapshot;
    var level = snapshot.activeLevel || 0;
    var wallHeight = snapshot.wallBrushHeight || snapshot.floorPlan.defaultWallHeight || 2;
    var beforeBounds = cloneJson(domain.getLevelBounds(snapshot.floorPlan, level));
    stateApi.applyPlanMutation(tool, function (plan, core) {
      if (tool === 'brush-floor') core.addCellAt(plan, level, hover.x, hover.y, { placeable: true, autoGrow: true });
      else if (tool === 'brush-blocked') core.addCellAt(plan, level, hover.x, hover.y, { placeable: false, autoGrow: true });
      else if (tool === 'erase') core.removeCellAt(plan, level, hover.x, hover.y);
      else if (tool === 'wall' && hover.edge) core.setWallHeight(plan, level, hover.x, hover.y, hover.edge, wallHeight);
      else if (tool === 'wall-erase' && hover.edge) core.clearWall(plan, level, hover.x, hover.y, hover.edge);
    }, hover);
    var afterState = stateApi.getState();
    var afterBounds = cloneJson(domain.getLevelBounds(afterState.floorPlan, level));
    var growBoundsTriggered = beforeBounds.originX !== afterBounds.originX || beforeBounds.originY !== afterBounds.originY || beforeBounds.cols !== afterBounds.cols || beforeBounds.rows !== afterBounds.rows;
    queueAutosave(afterState);
    return emit(tool, {
      hover: cloneJson(hover),
      beforeBounds: beforeBounds,
      afterBounds: afterBounds,
      growBoundsTriggered: growBoundsTriggered,
      chosenDirection: hover && hover.diagnostics ? hover.diagnostics.chosenDirection || null : null,
      chosenWithinBounds: hover ? hover.withinBounds !== false : null,
      resolvedGridX: hover && hover.diagnostics ? hover.diagnostics.resolvedGridX : hover.x,
      resolvedGridY: hover && hover.diagnostics ? hover.diagnostics.resolvedGridY : hover.y,
      targetHasCell: hover && hover.diagnostics ? hover.diagnostics.targetHasCell === true : !!hover.cell,
      targetWithinBounds: hover && hover.diagnostics ? hover.diagnostics.targetWithinBounds !== false : hover.withinBounds !== false,
      targetWithinExpandedBounds: domain.isWithinLevelBounds(afterBounds, hover.x, hover.y),
      isAdjacentToExisting: hover && hover.diagnostics ? hover.diagnostics.isAdjacentToExisting === true : false,
      paintMode: hover && hover.diagnostics ? hover.diagnostics.paintMode || null : null
    });
  }

  function applySelectionRect(tool, rect) {
    if (!rect || rect.kind !== 'rect') return getState();
    var snapshot = getState();
    if (activeLevelLocked(snapshot)) return snapshot;
    var level = snapshot.activeLevel || 0;
    stateApi.applyPlanMutation(tool, function (plan, core) {
      if (tool === 'rect-floor') core.applyRectEnabled(plan, level, rect.x1, rect.y1, rect.x2, rect.y2, true, { placeable: true });
      else if (tool === 'rect-blocked') core.applyRectEnabled(plan, level, rect.x1, rect.y1, rect.x2, rect.y2, true, { placeable: false });
      else if (tool === 'rect-erase') core.applyRectEnabled(plan, level, rect.x1, rect.y1, rect.x2, rect.y2, false);
    }, rect);
    stateApi.setSelection(null);
    queueAutosave(stateApi.getState());
    return emit(tool, rect);
  }

  function applyFill(tool, hover) {
    if (!hover) return getState();
    var snapshot = getState();
    if (activeLevelLocked(snapshot)) return snapshot;
    var level = snapshot.activeLevel || 0;
    stateApi.applyPlanMutation(tool, function (plan, core) {
      if (tool === 'fill-floor') core.floodFillEnabled(plan, level, hover.x, hover.y, true, { placeable: true });
      else if (tool === 'fill-blocked') core.floodFillEnabled(plan, level, hover.x, hover.y, true, { placeable: false });
      else if (tool === 'fill-erase') core.floodFillEnabled(plan, level, hover.x, hover.y, false);
    }, hover);
    queueAutosave(stateApi.getState());
    return emit(tool, hover);
  }

  function commitToolAtHover(hover) {
    var current = getState();
    var tool = current.activeTool;
    if (tool === 'rect-floor' || tool === 'rect-blocked' || tool === 'rect-erase') return current;
    if (tool === 'fill-floor' || tool === 'fill-blocked' || tool === 'fill-erase') return applyFill(tool, hover);
    return applyBrush(tool, hover);
  }

  function beginRectSelection(hover) { if (!hover) return getState(); stateApi.setSelection({ kind: 'rect', x1: hover.x, y1: hover.y, x2: hover.x, y2: hover.y }); return emit('begin-rect-selection', hover); }
  function updateRectSelection(hover) {
    var current = getState();
    if (!current.selection || current.selection.kind !== 'rect' || !hover) return current;
    stateApi.setSelection({ kind: 'rect', x1: current.selection.x1, y1: current.selection.y1, x2: hover.x, y2: hover.y });
    return emit('update-rect-selection', hover);
  }
  function commitRectSelection() { var current = getState(); if (!current.selection || current.selection.kind !== 'rect') return current; return applySelectionRect(current.activeTool, current.selection); }
  function cancelSelection() { stateApi.setSelection(null); return emit('cancel-selection', null); }

  function setTool(tool) { stateApi.setTool(tool); stateApi.setSelection(null); return emit('set-tool', { tool: tool }); }
  function setActiveLevel(level) {
    var beforeState = getState();
    stateApi.setActiveLevel(level);
    var afterState = getState();
    return emit('set-active-level', buildLevelTransitionPayload('set-active-level', beforeState, afterState, afterState.activeLevel || 0, { explicitOffsetAction: false, extra: { requestedLevel: level } }));
  }
  function stepActiveLevel(delta) { return setActiveLevel((Number(getState().activeLevel) || 0) + (Number(delta) || 0)); }
  function setWallBrushHeight(height) { stateApi.setWallBrushHeight(height); return emit('set-wall-brush-height', { height: height }); }
  function normalizeRotation(rotation) {
    rotation = Math.round(Number(rotation) || 0);
    return ((rotation % 4) + 4) % 4;
  }

  function normalizeAnimationMs(value) {
    value = Math.round(Number(value) || 0);
    if (!isFinite(value) || value < 0) return 0;
    return Math.min(value, 2000);
  }

  function isRotationAnimating(snapshot) {
    snapshot = snapshot || getState();
    return !!(snapshot.view && snapshot.view.isRotationAnimating);
  }

  function readViewRotation(view) {
    return normalizeRotation(view && view.rotation != null ? view.rotation : 0);
  }

  function readViewTargetRotation(view) {
    if (!view) return 0;
    if (view.isRotationAnimating) {
      if (view.rotationTo != null) return normalizeRotation(view.rotationTo);
      if (view.rotation != null) return normalizeRotation(view.rotation);
      return 0;
    }
    if (view.rotation != null) return normalizeRotation(view.rotation);
    return 0;
  }

  function buildRotationPayload(reason, beforeState, afterState, extra) {
    beforeState = beforeState || getState();
    afterState = afterState || beforeState;
    extra = extra || {};
    var previousRotation = readViewRotation(beforeState.view);
    var nextRotation = readViewTargetRotation(afterState.view);
    var payload = {
      reason: reason,
      previousRotation: previousRotation,
      nextRotation: nextRotation,
      previousDirectionLabel: (window.__FLOOR_EDITOR_HIT_TEST__ && window.__FLOOR_EDITOR_HIT_TEST__.getViewDirectionLabel(previousRotation)) || null,
      nextDirectionLabel: (window.__FLOOR_EDITOR_HIT_TEST__ && window.__FLOOR_EDITOR_HIT_TEST__.getViewDirectionLabel(nextRotation)) || null,
      activeLevel: afterState.activeLevel || 0,
      renderedCells: summarizePlan(afterState.floorPlan, afterState.activeLevel || 0, 'rotation-payload') && summarizePlan(afterState.floorPlan, afterState.activeLevel || 0, 'rotation-payload').currentLevelEnabled || 0,
      animationEnabled: !!(afterState.view && afterState.view.rotationAnimationEnabled),
      animationMs: normalizeAnimationMs(afterState.view && afterState.view.rotationAnimationMs),
      isRotationAnimating: !!(afterState.view && afterState.view.isRotationAnimating)
    };
    Object.keys(extra).forEach(function (key) { payload[key] = cloneJson(extra[key]); });
    return payload;
  }

  function patchView(patch) { stateApi.patchView(patch || {}); return emit('patch-view', patch || {}); }

  function setRotationAnimationMs(ms) {
    var normalized = normalizeAnimationMs(ms);
    stateApi.patchView({ rotationAnimationMs: normalized, rotationAnimationEnabled: normalized > 0 });
    return emit('set-rotation-animation-ms', { rotationAnimationMs: normalized, rotationAnimationEnabled: normalized > 0 });
  }

  function setRotationAnimationEnabled(enabled) {
    enabled = enabled !== false;
    var current = getState();
    var ms = normalizeAnimationMs(current.view && current.view.rotationAnimationMs);
    stateApi.patchView({ rotationAnimationEnabled: enabled, rotationAnimationMs: enabled && ms <= 0 ? 160 : ms });
    return emit('set-rotation-animation-enabled', { rotationAnimationEnabled: enabled, rotationAnimationMs: enabled && ms <= 0 ? 160 : ms });
  }

  function setViewRotation(rotation, options) {
    options = options || {};
    var before = getState();
    var normalized = normalizeRotation(rotation);
    if (isRotationAnimating(before)) {
      return emit('rotate-view-ignored', buildRotationPayload('rotate-view-ignored', before, before, { requestedRotation: normalized, strategy: 'ignore-while-animating' }));
    }
    var currentRotation = normalizeRotation(before.view && before.view.rotation || 0);
    if (normalized === currentRotation) {
      return emit('set-view-rotation', buildRotationPayload('set-view-rotation', before, before, { requestedRotation: normalized, changed: false }));
    }
    var animationEnabled = options.forceInstant ? false : !!(before.view && before.view.rotationAnimationEnabled);
    var animationMs = options.forceInstant ? 0 : normalizeAnimationMs(before.view && before.view.rotationAnimationMs);
    if (!animationEnabled || animationMs <= 0) {
      stateApi.patchView({
        rotation: normalized,
        isRotationAnimating: false,
        rotationFrom: normalized,
        rotationTo: normalized,
        rotationProgress: 1
      });
      var directAfter = getState();
      return emit('rotate-view-commit', buildRotationPayload('rotate-view-commit', before, directAfter, { requestedRotation: normalized, animationMs: 0 }));
    }
    stateApi.patchView({
      isRotationAnimating: true,
      rotationFrom: currentRotation,
      rotationTo: normalized,
      rotationProgress: 0,
      rotationAnimationNonce: (Number(before.view && before.view.rotationAnimationNonce) || 0) + 1
    });
    var started = getState();
    return emit('rotate-view-start', buildRotationPayload('rotate-view-start', before, started, { requestedRotation: normalized, rotationAnimationNonce: started.view.rotationAnimationNonce }));
  }

  function completeViewRotationAnimation(expectedNonce) {
    var before = getState();
    if (!isRotationAnimating(before)) return before;
    if (expectedNonce != null && Number(expectedNonce) !== Number(before.view && before.view.rotationAnimationNonce)) {
      return emit('rotate-view-complete-ignored', buildRotationPayload('rotate-view-complete-ignored', before, before, { expectedNonce: expectedNonce, actualNonce: before.view && before.view.rotationAnimationNonce }));
    }
    var targetRotation = readViewTargetRotation(before.view);
    stateApi.patchView({
      rotation: targetRotation,
      isRotationAnimating: false,
      rotationFrom: targetRotation,
      rotationTo: targetRotation,
      rotationProgress: 1
    });
    var after = getState();
    return emit('rotate-view-complete', buildRotationPayload('rotate-view-complete', before, after, { rotationAnimationNonce: after.view.rotationAnimationNonce }));
  }

  function rotateViewLeft(options) {
    var before = getState();
    var base = isRotationAnimating(before) ? before.view.rotationTo : before.view.rotation;
    return setViewRotation((Number(base) || 0) - 1, options || {});
  }
  function rotateViewRight(options) {
    var before = getState();
    var base = isRotationAnimating(before) ? before.view.rotationTo : before.view.rotation;
    return setViewRotation((Number(base) || 0) + 1, options || {});
  }
  function setHover(hover) { stateApi.setHover(hover || null); return emit('hover', hover || null); }
  function setHandleMode(mode) { stateApi.setHandleMode(mode); return emit('set-handle-mode', { mode: mode }); }

  function applyMeta(payload) {
    payload = payload || {};
    var beforeState = getState();
    var targetLevel = beforeState.activeLevel || 0;
    stateApi.applyPlanMutation('apply-plan-meta', function (plan, core) {
      if (Object.prototype.hasOwnProperty.call(payload, 'name')) core.renamePlan(plan, payload.name);
      if (Object.prototype.hasOwnProperty.call(payload, 'shapeMode')) core.setShapeMode(plan, payload.shapeMode);
      if (Object.prototype.hasOwnProperty.call(payload, 'defaultWallHeight')) core.setDefaultWallHeight(plan, payload.defaultWallHeight);
      if (Object.prototype.hasOwnProperty.call(payload, 'levelCount')) core.setLevelCount(plan, payload.levelCount, { sourceLevel: beforeState.activeLevel || 0, autoOffset: false, copyWalls: false });
    }, payload);
    if (Object.prototype.hasOwnProperty.call(payload, 'defaultWallHeight')) stateApi.setWallBrushHeight(payload.defaultWallHeight);
    var afterState = stateApi.getState();
    queueAutosave(afterState);
    return emit('apply-plan-meta', buildLevelTransitionPayload('apply-plan-meta', beforeState, afterState, targetLevel, {
      explicitOffsetAction: false,
      extra: {
        requested: cloneJson(payload),
        beforeSummary: summarizePlan(beforeState.floorPlan, targetLevel, 'before-apply-plan-meta'),
        afterSummary: summarizePlan(afterState.floorPlan, afterState.activeLevel || 0, 'after-apply-plan-meta'),
        afterBounds: cloneJson(afterState.floorPlan && afterState.floorPlan.bounds || null),
        afterLevelBounds: cloneJson(domain.getLevelBounds(afterState.floorPlan, afterState.activeLevel || 0)),
        afterLevelCount: afterState.floorPlan ? afterState.floorPlan.levelCount : null,
        afterWallBrushHeight: afterState.wallBrushHeight
      }
    }));
  }

  function applyCurrentLevelMeta(payload) {
    payload = payload || {};
    var beforeState = getState();
    var activeLevel = beforeState.activeLevel || 0;
    stateApi.applyPlanMutation('apply-current-level-meta', function (plan, core) {
      if (Object.prototype.hasOwnProperty.call(payload, 'name')) core.setLevelName(plan, activeLevel, payload.name);
      if (Object.prototype.hasOwnProperty.call(payload, 'cols') || Object.prototype.hasOwnProperty.call(payload, 'rows')) {
        var currentBounds = core.getLevelBounds(plan, activeLevel);
        core.resizeBounds(plan, payload.cols != null ? payload.cols : currentBounds.cols, payload.rows != null ? payload.rows : currentBounds.rows, { level: activeLevel, rebuildRectangle: plan.shapeMode === 'rectangle' });
      }
      if (activeLevel > 0) {
        if (Object.prototype.hasOwnProperty.call(payload, 'offsetX') || Object.prototype.hasOwnProperty.call(payload, 'offsetY')) {
          var currentMeta = core.getLevelMeta(plan, activeLevel);
          core.setLevelOffset(plan, activeLevel, payload.offsetX != null ? payload.offsetX : currentMeta.offsetX, payload.offsetY != null ? payload.offsetY : currentMeta.offsetY);
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'elevationGap')) core.setLevelElevationGap(plan, activeLevel, payload.elevationGap);
      }
    }, payload);
    var afterState = stateApi.getState();
    queueAutosave(afterState);
    return emit('apply-current-level-meta', buildLevelTransitionPayload('apply-current-level-meta', beforeState, afterState, activeLevel, {
      explicitOffsetAction: Object.prototype.hasOwnProperty.call(payload, 'offsetX') || Object.prototype.hasOwnProperty.call(payload, 'offsetY'),
      extra: {
        requested: cloneJson(payload),
        beforeSummary: summarizePlan(beforeState.floorPlan, activeLevel, 'before-apply-current-level-meta'),
        afterSummary: summarizePlan(afterState.floorPlan, activeLevel, 'after-apply-current-level-meta'),
        afterLevelBounds: cloneJson(domain.getLevelBounds(afterState.floorPlan, activeLevel)),
        afterLevelMeta: cloneJson(domain.getLevelMeta(afterState.floorPlan, activeLevel))
      }
    }));
  }

  function addLevel() {
    var beforeState = getState();
    var sourceLevel = beforeState.activeLevel || 0;
    var targetLevel = beforeState.floorPlan.levelCount || 1;
    var targetLevelCellCountBefore = 0;
    stateApi.applyPlanMutation('add-level-empty', function (plan, core) {
      targetLevelCellCountBefore = Object.keys((plan.levels && plan.levels[String(targetLevel)]) || {}).length;
      core.addLevel(plan, sourceLevel, { copyWalls: false, initMode: 'empty' });
    });
    stateApi.setActiveLevel(targetLevel);
    var afterState = getState();
    queueAutosave(afterState);
    var payload = buildLevelTransitionPayload('add-level-empty', beforeState, afterState, targetLevel, {
      explicitOffsetAction: false,
      extra: {
        actionType: 'add-level-empty',
        initMode: 'empty',
        sourceLevel: sourceLevel,
        targetLevelBounds: cloneJson(domain.getLevelBounds(afterState.floorPlan, targetLevel)),
        targetLevelCellCountBefore: targetLevelCellCountBefore,
        targetLevelCellCountAfter: Object.keys((afterState.floorPlan.levels && afterState.floorPlan.levels[String(targetLevel)]) || {}).length,
        copiedFromLevel: null,
        copiedCellCount: 0,
        afterLevelCount: afterState.floorPlan.levelCount
      }
    });
    return emit('add-level-empty', payload);
  }

  function addRectInitializedLevel() {
    var beforeState = getState();
    var sourceLevel = beforeState.activeLevel || 0;
    var targetLevel = beforeState.floorPlan.levelCount || 1;
    var targetLevelCellCountBefore = 0;
    stateApi.applyPlanMutation('add-level-rect-init', function (plan, core) {
      targetLevelCellCountBefore = Object.keys((plan.levels && plan.levels[String(targetLevel)]) || {}).length;
      core.addRectInitializedLevel(plan, sourceLevel, { copyWalls: false });
    });
    stateApi.setActiveLevel(targetLevel);
    var afterState = getState();
    queueAutosave(afterState);
    var afterCount = Object.keys((afterState.floorPlan.levels && afterState.floorPlan.levels[String(targetLevel)]) || {}).length;
    var payload = buildLevelTransitionPayload('add-level-rect-init', beforeState, afterState, targetLevel, {
      explicitOffsetAction: false,
      extra: {
        actionType: 'add-level-rect-init',
        initMode: 'rect',
        sourceLevel: sourceLevel,
        targetLevelBounds: cloneJson(domain.getLevelBounds(afterState.floorPlan, targetLevel)),
        targetLevelCellCountBefore: targetLevelCellCountBefore,
        targetLevelCellCountAfter: afterCount,
        copiedFromLevel: null,
        copiedCellCount: afterCount,
        afterLevelCount: afterState.floorPlan.levelCount
      }
    });
    return emit('add-level-rect-init', payload);
  }

  function copyActiveLevel() {
    var beforeState = getState();
    var sourceLevel = beforeState.activeLevel || 0;
    var targetLevel = beforeState.floorPlan.levelCount || 1;
    var sourceCellCount = Object.keys((beforeState.floorPlan.levels && beforeState.floorPlan.levels[String(sourceLevel)]) || {}).length;
    var targetLevelCellCountBefore = 0;
    stateApi.applyPlanMutation('duplicate-level', function (plan, core) {
      targetLevelCellCountBefore = Object.keys((plan.levels && plan.levels[String(targetLevel)]) || {}).length;
      core.duplicateLevel(plan, sourceLevel, { copyWalls: false });
    });
    stateApi.setActiveLevel(targetLevel);
    var afterState = getState();
    queueAutosave(afterState);
    var payload = buildLevelTransitionPayload('duplicate-level', beforeState, afterState, targetLevel, {
      explicitOffsetAction: false,
      extra: {
        actionType: 'duplicate-level',
        initMode: 'duplicate',
        sourceLevel: sourceLevel,
        targetLevelBounds: cloneJson(domain.getLevelBounds(afterState.floorPlan, targetLevel)),
        targetLevelCellCountBefore: targetLevelCellCountBefore,
        targetLevelCellCountAfter: Object.keys((afterState.floorPlan.levels && afterState.floorPlan.levels[String(targetLevel)]) || {}).length,
        copiedFromLevel: sourceLevel,
        copiedCellCount: sourceCellCount
      }
    });
    return emit('duplicate-level', payload);
  }

  function selectLevel(level, options) {
    options = options || {};
    var beforeState = getState();
    stateApi.setActiveLevel(level);
    if (options.toggleOverlap === true) stateApi.toggleSelectedOverlapLevel(level);
    else if (options.clearOverlap !== false) stateApi.clearSelectedOverlapLevels();
    var afterState = getState();
    return emit('select-level', buildLevelTransitionPayload('select-level', beforeState, afterState, afterState.activeLevel || 0, {
      explicitOffsetAction: false,
      extra: { requestedLevel: level, toggleOverlap: !!options.toggleOverlap, selectedOverlapLevels: cloneJson(afterState.view.selectedOverlapLevels || []) }
    }));
  }

  function toggleSelectedOverlapLevel(level) {
    stateApi.toggleSelectedOverlapLevel(level);
    return emit('toggle-selected-overlap-level', { level: level, selectedOverlapLevels: cloneJson(getState().view.selectedOverlapLevels || []) });
  }

  function clearSelectedOverlapLevels() {
    stateApi.clearSelectedOverlapLevels();
    return emit('clear-selected-overlap-levels', { selectedOverlapLevels: [] });
  }

  function setLevelVisibility(level, visible) {
    stateApi.applyPlanMutation('set-level-visibility', function (plan, core) { core.setLevelVisibility(plan, level, visible); }, { level: level, visible: visible });
    queueAutosave(stateApi.getState());
    return emit('set-level-visibility', { level: level, visible: visible });
  }

  function setLevelLocked(level, locked) {
    stateApi.applyPlanMutation('set-level-locked', function (plan, core) { core.setLevelLocked(plan, level, locked); }, { level: level, locked: locked });
    queueAutosave(stateApi.getState());
    return emit('set-level-locked', { level: level, locked: locked });
  }

  function removeTopLevel() {
    var snapshot = getState();
    if ((snapshot.floorPlan.levelCount || 1) <= 1) return snapshot;
    stateApi.applyPlanMutation('remove-top-level', function (plan, core) { core.setLevelCount(plan, (plan.levelCount || 1) - 1); });
    stateApi.setActiveLevel(Math.min(snapshot.activeLevel || 0, (snapshot.floorPlan.levelCount || 1) - 2));
    queueAutosave(stateApi.getState());
    return emit('remove-top-level', { afterLevelCount: getState().floorPlan.levelCount });
  }

  function applyPerimeterWallsCurrentLevel() {
    var snapshot = getState();
    stateApi.applyPlanMutation('apply-perimeter-walls-current-level', function (plan, core) {
      core.applyPerimeterWalls(plan, snapshot.activeLevel || 0, { n: true, e: true, s: true, w: true }, snapshot.wallBrushHeight || plan.defaultWallHeight || 2);
    });
    queueAutosave(stateApi.getState());
    return emit('apply-perimeter-walls-current-level', null);
  }

  function clearWallsCurrentLevel() {
    var snapshot = getState();
    stateApi.applyPlanMutation('clear-walls-current-level', function (plan, core) { core.clearWallsForLevel(plan, snapshot.activeLevel || 0); });
    queueAutosave(stateApi.getState());
    return emit('clear-walls-current-level', null);
  }

  function nudgeActiveLevelOffset(dx, dy) {
    var beforeState = getState();
    if ((beforeState.activeLevel || 0) === 0) return beforeState;
    stateApi.applyPlanMutation('nudge-active-level-offset', function (plan, core) {
      core.nudgeLevelOffset(plan, beforeState.activeLevel || 0, dx, dy);
    }, { dx: dx, dy: dy });
    var afterState = getState();
    queueAutosave(afterState);
    return emit('nudge-active-level-offset', buildLevelTransitionPayload('nudge-active-level-offset', beforeState, afterState, beforeState.activeLevel || 0, {
      explicitOffsetAction: true,
      extra: { dx: dx, dy: dy }
    }));
  }

  function nudgeActiveLevelElevation(delta) {
    var beforeState = getState();
    if ((beforeState.activeLevel || 0) === 0) return beforeState;
    stateApi.applyPlanMutation('nudge-active-level-elevation-gap', function (plan, core) {
      core.nudgeLevelElevationGap(plan, beforeState.activeLevel || 0, delta);
    }, { delta: delta });
    var afterState = getState();
    queueAutosave(afterState);
    return emit('nudge-active-level-elevation-gap', buildLevelTransitionPayload('nudge-active-level-elevation-gap', beforeState, afterState, beforeState.activeLevel || 0, {
      explicitOffsetAction: false,
      extra: { delta: delta }
    }));
  }

  function resetActiveLevelTransform() {
    var snapshot = getState();
    if ((snapshot.activeLevel || 0) === 0) return snapshot;
    stateApi.applyPlanMutation('reset-active-level-transform', function (plan, core) { core.resetLevelTransform(plan, snapshot.activeLevel || 0); });
    queueAutosave(stateApi.getState());
    return emit('reset-active-level-transform', null);
  }

  function exportProject() {
    var snapshot = getState();
    storage.downloadProject(snapshot, snapshot.floorPlan && snapshot.floorPlan.meta ? snapshot.floorPlan.meta.name : 'floor-plan');
    stateApi.markClean();
    return emit('export-project', null);
  }

  function importPayload(payload) {
    if (!payload || !payload.floorPlan) throw new Error('Invalid floor payload');
    stateApi.resetWithPlan(payload.floorPlan, { activeLevel: payload.activeLevel, wallBrushHeight: payload.wallBrushHeight, dirty: true, view: getState().view });
    if (payload.activeTool) stateApi.setTool(payload.activeTool);
    queueAutosave(stateApi.getState());
    return emit('import-payload', { schema: payload.schema || null });
  }

  function loadAutosave() {
    var payload = storage.loadAutosave();
    if (!payload) return emit('load-autosave-miss', null);
    return importPayload(payload);
  }

  function saveAutosave() { var snapshot = getState(); storage.saveAutosave(snapshot); stateApi.markClean(); return emit('save-autosave', null); }
  function importFile(file) { return storage.readProjectFile(file).then(function (payload) { return importPayload(payload); }); }
  function undo() { stateApi.undo(); return emit('undo', null); }
  function redo() { stateApi.redo(); return emit('redo', null); }

  var api = {
    phase: PHASE,
    owner: OWNER,
    subscribe: subscribe,
    getState: getState,
    newRectanglePlan: newRectanglePlan,
    newCustomPlan: newCustomPlan,
    commitToolAtHover: commitToolAtHover,
    beginRectSelection: beginRectSelection,
    updateRectSelection: updateRectSelection,
    commitRectSelection: commitRectSelection,
    cancelSelection: cancelSelection,
    setTool: setTool,
    setActiveLevel: setActiveLevel,
    stepActiveLevel: stepActiveLevel,
    setWallBrushHeight: setWallBrushHeight,
    patchView: patchView,
    setRotationAnimationMs: setRotationAnimationMs,
    setRotationAnimationEnabled: setRotationAnimationEnabled,
    setViewRotation: setViewRotation,
    completeViewRotationAnimation: completeViewRotationAnimation,
    rotateViewLeft: rotateViewLeft,
    rotateViewRight: rotateViewRight,
    setHover: setHover,
    setHandleMode: setHandleMode,
    applyMeta: applyMeta,
    applyCurrentLevelMeta: applyCurrentLevelMeta,
    addLevel: addLevel,
    addRectInitializedLevel: addRectInitializedLevel,
    copyActiveLevel: copyActiveLevel,
    selectLevel: selectLevel,
    toggleSelectedOverlapLevel: toggleSelectedOverlapLevel,
    clearSelectedOverlapLevels: clearSelectedOverlapLevels,
    setLevelVisibility: setLevelVisibility,
    setLevelLocked: setLevelLocked,
    removeTopLevel: removeTopLevel,
    applyPerimeterWallsCurrentLevel: applyPerimeterWallsCurrentLevel,
    clearWallsCurrentLevel: clearWallsCurrentLevel,
    nudgeActiveLevelOffset: nudgeActiveLevelOffset,
    nudgeActiveLevelElevation: nudgeActiveLevelElevation,
    resetActiveLevelTransform: resetActiveLevelTransform,
    exportProject: exportProject,
    importPayload: importPayload,
    importFile: importFile,
    loadAutosave: loadAutosave,
    saveAutosave: saveAutosave,
    undo: undo,
    redo: redo
  };

  window.__FLOOR_EDITOR_APP__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('controllers.floorEditor', api, { owner: OWNER, phase: PHASE });
  }

  emit('boot', { summary: stateApi.summarize('boot') });
})();
