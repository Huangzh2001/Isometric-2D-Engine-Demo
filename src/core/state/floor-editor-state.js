(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/core/state/floor-editor-state.js';
  var PHASE = 'FLOOR-STATE-V37';
  var MAX_HISTORY = 80;
  var domain = window.__FLOOR_EDITOR_DOMAIN__ || (window.App && window.App.domain && window.App.domain.floorEditorCore) || null;
  if (!domain) {
    console.error('[FLOOR-STATE] missing domain core');
    return;
  }

  var state = {
    floorPlan: domain.createRectanglePlan({ name: 'Untitled Floor Plan', cols: 10, rows: 8, levelCount: 1, defaultWallHeight: 2 }),
    activeTool: 'brush-floor',
    activeLevel: 0,
    wallBrushHeight: 2,
    hover: null,
    selection: null,
    view: {
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      showGrid: false,
      showWalls: true,
      showAdjacentLevels: true,
      selectedOverlapLevels: [],
      handleMode: 'none',
      rotation: 0,
      rotationAnimationEnabled: true,
      rotationAnimationMs: 160,
      isRotationAnimating: false,
      rotationFrom: 0,
      rotationTo: 0,
      rotationProgress: 1,
      rotationAnimationNonce: 0
    },
    dirty: false,
    history: [],
    future: [],
    lastAction: 'boot'
  };

  function cloneJson(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function clampLevel(level) {
    return Math.max(0, Math.min(Number(level) || 0, Math.max(0, (state.floorPlan.levelCount || 1) - 1)));
  }

  function clampWallBrush(height) {
    var max = state.floorPlan.maxWallHeight || 8;
    return Math.max(1, Math.min(Number(height) || state.floorPlan.defaultWallHeight || 2, max));
  }


  function normalizeRotation(rotation) {
    rotation = Math.round(Number(rotation) || 0);
    return ((rotation % 4) + 4) % 4;
  }

  function normalizeAnimationMs(value) {
    value = Math.round(Number(value) || 0);
    if (!isFinite(value) || value < 0) return 0;
    return Math.min(value, 2000);
  }

  function normalizeView(view) {
    view = cloneJson(view || {}) || {};
    view.handleMode = normalizeHandleMode(view.handleMode);
    view.rotation = normalizeRotation(view.rotation);
    view.selectedOverlapLevels = normalizeOverlapLevels(view.selectedOverlapLevels);
    view.rotationAnimationEnabled = view.rotationAnimationEnabled !== false;
    view.rotationAnimationMs = normalizeAnimationMs(view.rotationAnimationMs);
    view.rotationFrom = normalizeRotation(view.rotationFrom != null ? view.rotationFrom : view.rotation);
    view.rotationTo = normalizeRotation(view.rotationTo != null ? view.rotationTo : view.rotation);
    view.rotationProgress = Math.max(0, Math.min(1, Number(view.rotationProgress)));
    view.isRotationAnimating = !!view.isRotationAnimating;
    view.rotationAnimationNonce = Math.max(0, Math.round(Number(view.rotationAnimationNonce) || 0));
    return view;
  }

  function normalizeHandleMode(mode) {
    mode = String(mode || 'none');
    return (mode === 'offset' || mode === 'elevation') ? mode : 'none';
  }

  function normalizeOverlapLevels(levels) {
    if (!Array.isArray(levels)) return [];
    var seen = {};
    var out = [];
    levels.forEach(function (level) {
      var normalized = clampLevel(level);
      var key = String(normalized);
      if (seen[key]) return;
      seen[key] = true;
      out.push(normalized);
    });
    return out.sort(function (a, b) { return a - b; });
  }

  function snapshotState() {
    return {
      floorPlan: domain.clonePlan(state.floorPlan),
      activeTool: String(state.activeTool || 'brush-floor'),
      activeLevel: clampLevel(state.activeLevel),
      wallBrushHeight: clampWallBrush(state.wallBrushHeight),
      view: cloneJson(state.view),
      selection: cloneJson(state.selection),
      hover: cloneJson(state.hover),
      dirty: !!state.dirty,
      lastAction: String(state.lastAction || '')
    };
  }

  function getState() { return snapshotState(); }

  function pushHistory(label) {
    state.history.push({ label: String(label || 'mutation'), snapshot: snapshotState() });
    if (state.history.length > MAX_HISTORY) state.history.splice(0, state.history.length - MAX_HISTORY);
    state.future = [];
  }

  function restoreSnapshot(snapshot, label) {
    if (!snapshot) return getState();
    state.floorPlan = domain.normalizePlan(snapshot.floorPlan || state.floorPlan);
    state.activeTool = String(snapshot.activeTool || 'brush-floor');
    state.activeLevel = clampLevel(snapshot.activeLevel);
    state.wallBrushHeight = clampWallBrush(snapshot.wallBrushHeight);
    state.view = normalizeView(snapshot.view || state.view);
    state.selection = cloneJson(snapshot.selection || null);
    state.hover = cloneJson(snapshot.hover || null);
    state.dirty = !!snapshot.dirty;
    state.lastAction = String(label || snapshot.lastAction || 'restore');
    return getState();
  }

  function applyPlanMutation(label, mutator, meta) {
    pushHistory(label);
    var plan = domain.clonePlan(state.floorPlan);
    mutator(plan, domain, meta || {});
    state.floorPlan = domain.normalizePlan(plan);
    state.activeLevel = clampLevel(state.activeLevel);
    state.wallBrushHeight = clampWallBrush(state.wallBrushHeight);
    state.dirty = true;
    state.lastAction = String(label || 'plan-mutation');
    return getState();
  }

  function setTool(tool) {
    state.activeTool = String(tool || 'brush-floor');
    state.lastAction = 'set-tool';
    return getState();
  }

  function setActiveLevel(level) {
    state.activeLevel = clampLevel(level);
    state.selection = null;
    state.hover = null;
    state.lastAction = 'set-active-level';
    return getState();
  }

  function stepActiveLevel(delta) { return setActiveLevel((Number(state.activeLevel) || 0) + (Number(delta) || 0)); }

  function setWallBrushHeight(height) {
    state.wallBrushHeight = clampWallBrush(height);
    state.lastAction = 'set-wall-brush-height';
    return getState();
  }

  function setHover(hover) { state.hover = hover ? cloneJson(hover) : null; return getState(); }
  function setSelection(selection) { state.selection = selection ? cloneJson(selection) : null; return getState(); }

  function patchView(patch) {
    patch = patch && typeof patch === 'object' ? patch : {};
    Object.keys(patch).forEach(function (key) { state.view[key] = patch[key]; });
    state.view = normalizeView(state.view);
    state.lastAction = 'patch-view';
    return getState();
  }

  function setHandleMode(mode) {
    state.view.handleMode = normalizeHandleMode(mode);
    state.lastAction = 'set-handle-mode';
    return getState();
  }

  function resetWithPlan(plan, meta) {
    pushHistory('reset-with-plan');
    state.floorPlan = domain.normalizePlan(plan || state.floorPlan);
    state.activeLevel = clampLevel(meta && Object.prototype.hasOwnProperty.call(meta, 'activeLevel') ? meta.activeLevel : 0);
    state.wallBrushHeight = clampWallBrush(meta && Object.prototype.hasOwnProperty.call(meta, 'wallBrushHeight') ? meta.wallBrushHeight : state.floorPlan.defaultWallHeight);
    state.selection = null;
    state.hover = null;
    state.dirty = !!(meta && meta.dirty);
    if (meta && meta.view) state.view = cloneJson(meta.view);
    state.view = normalizeView(state.view);
    state.lastAction = 'reset-with-plan';
    return getState();
  }

  function markClean() { state.dirty = false; state.lastAction = 'mark-clean'; return getState(); }

  function setSelectedOverlapLevels(levels) {
    state.view.selectedOverlapLevels = normalizeOverlapLevels(levels);
    state.lastAction = 'set-selected-overlap-levels';
    return getState();
  }

  function clearSelectedOverlapLevels() {
    state.view.selectedOverlapLevels = [];
    state.lastAction = 'clear-selected-overlap-levels';
    return getState();
  }

  function toggleSelectedOverlapLevel(level) {
    var normalized = clampLevel(level);
    var current = normalizeOverlapLevels(state.view.selectedOverlapLevels);
    var idx = current.indexOf(normalized);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(normalized);
    state.view.selectedOverlapLevels = normalizeOverlapLevels(current);
    state.lastAction = 'toggle-selected-overlap-level';
    return getState();
  }

  function undo() {
    if (!state.history.length) return getState();
    state.future.push({ label: 'redo', snapshot: snapshotState() });
    var previous = state.history.pop();
    return restoreSnapshot(previous.snapshot, 'undo');
  }

  function redo() {
    if (!state.future.length) return getState();
    state.history.push({ label: 'undo', snapshot: snapshotState() });
    var next = state.future.pop();
    return restoreSnapshot(next.snapshot, 'redo');
  }

  function summarize(label) {
    var summary = domain.summarize(state.floorPlan, label || 'state', state.activeLevel);
    summary.activeTool = state.activeTool;
    summary.activeLevel = state.activeLevel;
    summary.wallBrushHeight = state.wallBrushHeight;
    summary.handleMode = state.view.handleMode;
    summary.selectedOverlapLevels = normalizeOverlapLevels(state.view.selectedOverlapLevels);
    summary.dirty = !!state.dirty;
    summary.historyDepth = state.history.length;
    summary.futureDepth = state.future.length;
    summary.owner = OWNER;
    summary.phase = PHASE;
    return summary;
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    getState: getState,
    summarize: summarize,
    applyPlanMutation: applyPlanMutation,
    setTool: setTool,
    setActiveLevel: setActiveLevel,
    stepActiveLevel: stepActiveLevel,
    setWallBrushHeight: setWallBrushHeight,
    setHover: setHover,
    setSelection: setSelection,
    patchView: patchView,
    setHandleMode: setHandleMode,
    setSelectedOverlapLevels: setSelectedOverlapLevels,
    clearSelectedOverlapLevels: clearSelectedOverlapLevels,
    toggleSelectedOverlapLevel: toggleSelectedOverlapLevel,
    resetWithPlan: resetWithPlan,
    markClean: markClean,
    undo: undo,
    redo: redo
  };

  window.__FLOOR_EDITOR_STATE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('state.floorEditorState', api, { owner: OWNER, phase: PHASE });
  }
})();
