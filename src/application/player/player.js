// player movement / collision entry extraction (PLAYER-STEP-JUMP-V2-DROP-ANIM-PATHFIND)

var PLAYER_MODULE_OWNER = 'src/application/player/player.js';
var __lastPlayerStepBlockedLog = { signature: '', at: 0 };

function playerRoute(event, payload) {
  try {
    if (typeof logRoute === 'function') {
      logRoute('player', event, payload);
    } else if (typeof detailLog === 'function') {
      var suffix = payload == null ? '' : ' ' + (typeof payload === 'string' ? payload : JSON.stringify(payload));
      detailLog('[route][player] ' + event + suffix);
    }
  } catch (err) {
    try { if (typeof detailLog === 'function') detailLog('[route][player] ' + event + ' route-log-error=' + String(err && err.message || err)); } catch (_) {}
  }
}

function playerStepLog(message, payload, options) {
  var opts = options && typeof options === 'object' ? options : {};
  var suffix = '';
  if (payload != null) {
    try { suffix = ' ' + JSON.stringify(payload); } catch (_) { suffix = ' "[unserializable]"'; }
  }
  try {
    if (typeof detailLog === 'function') detailLog('[player-step] ' + message + suffix);
    else if (typeof console !== 'undefined' && console.log) console.log('[player-step] ' + message + suffix);
  } catch (_) {}
  if (opts.route !== false) playerRoute('player-step:' + message, payload || null);
}

function getPlayerStepCoreApi() {
  if (typeof __APP_CORE_PLAYER_STEP_CORE__ !== 'undefined' && __APP_CORE_PLAYER_STEP_CORE__) return __APP_CORE_PLAYER_STEP_CORE__;
  try {
    if (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.playerStepCore) return window.App.domain.playerStepCore;
  } catch (_) {}
  return null;
}

function ensurePlayerStepState() {
  if (player.z == null || !Number.isFinite(Number(player.z))) player.z = 0;
  if (player.visualZ == null || !Number.isFinite(Number(player.visualZ))) player.visualZ = Number(player.z || 0);
  if (player.renderSortZ == null || !Number.isFinite(Number(player.renderSortZ))) player.renderSortZ = Number(player.z || 0);
  if (!player.jump || typeof player.jump !== 'object') player.jump = {};
  if (!player.path || typeof player.path !== 'object') player.path = {};
  if (!Array.isArray(player.path.waypoints)) player.path.waypoints = [];
  if (!player.path.debugPreview || typeof player.path.debugPreview !== 'object') player.path.debugPreview = { active: false, source: 'none', target: null, waypoints: [], ok: false, reason: 'idle' };
  if (!Array.isArray(player.path.debugPreview.waypoints)) player.path.debugPreview.waypoints = [];
  if (player.path.active == null) player.path.active = false;
  if (player.path.status == null) player.path.status = 'idle';
  if (player.path.stuckTime == null) player.path.stuckTime = 0;
  if (player.jump.active == null) player.jump.active = false;
  if (player.jump.fromZ == null) player.jump.fromZ = Number(player.z || 0);
  if (player.jump.toZ == null) player.jump.toZ = Number(player.z || 0);
  if (player.jump.t == null) player.jump.t = 0;
  if (player.jump.duration == null) player.jump.duration = Number(settings.playerJumpDurationSec || 0.18);
  if (player.jump.lift == null) player.jump.lift = Number(settings.playerJumpLiftCells || 0.35);
}

function resetPlayer() {
  player.x = 1.1;
  player.y = 1.1;
  player.z = 0;
  player.visualZ = 0;
  player.renderSortZ = 0;
  player.walk = 0;
  player.dir = 'down';
  player.moving = false;
  player.jump = {
    active: false,
    fromZ: 0,
    toZ: 0,
    t: 0,
    duration: Number(settings.playerJumpDurationSec || 0.18),
    lift: Number(settings.playerJumpLiftCells || 0.35),
  };
  player.path = { active: false, waypoints: [], target: null, status: 'idle', stuckTime: 0, debugPreview: { active: false, source: 'none', target: null, waypoints: [], ok: false, reason: 'idle' } };
  playerRoute('resetPlayer', { x: player.x, y: player.y, z: player.z, visualZ: player.visualZ, renderSortZ: player.renderSortZ });
}

function clampPlayerToWorld() {
  player.x = clamp(player.x, player.r + 0.05, settings.gridW - player.r - 0.05);
  player.y = clamp(player.y, player.r + 0.05, settings.gridH - player.r - 0.05);
  ensurePlayerStepState();
  return { x: player.x, y: player.y, z: player.z };
}

function getPlayerProxyBox(nx, ny, nz) {
  if (nx == null) nx = player.x;
  if (ny == null) ny = player.y;
  if (nz == null) nz = player && player.z != null ? player.z : 0;
  return {
    x: nx - settings.playerProxyW * 0.5,
    y: ny - settings.playerProxyD * 0.5,
    z: Number(nz || 0),
    w: settings.playerProxyW,
    d: settings.playerProxyD,
    h: settings.playerHeightCells,
  };
}

function getPlayerShadowCenter() {
  const box = getPlayerProxyBox();
  return { x: box.x + box.w * 0.5, y: box.y + box.d * 0.5, z: box.z + box.h * 0.5 };
}

function getPlayerGroundBounds() {
  const box = getPlayerProxyBox();
  const poly = [
    iso(box.x, box.y, box.z),
    iso(box.x + box.w, box.y, box.z),
    iso(box.x + box.w, box.y + box.d, box.z),
    iso(box.x, box.y + box.d, box.z),
  ];
  return polyBounds(poly);
}

function normalizePlayerInputRotationValue(rotation) {
  var turns = Number(rotation) || 0;
  turns %= 4;
  if (turns < 0) turns += 4;
  return turns;
}

function getPlayerInputViewRotationCoreApi() {
  try {
    if (typeof window !== 'undefined' && window.App && window.App.domain && window.App.domain.viewRotationCore) return window.App.domain.viewRotationCore;
  } catch (_) {}
  try {
    if (typeof __VIEW_ROTATION_CORE__ !== 'undefined' && __VIEW_ROTATION_CORE__) return __VIEW_ROTATION_CORE__;
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.__VIEW_ROTATION_CORE__) return window.__VIEW_ROTATION_CORE__;
  } catch (_) {}
  return null;
}

function getPlayerInputViewRotation() {
  try {
    var mainController = typeof window !== 'undefined' && window.App && window.App.controllers ? window.App.controllers.main || null : null;
    if (mainController && typeof mainController.getMainEditorVisualRotation === 'function') {
      return normalizePlayerInputRotationValue(mainController.getMainEditorVisualRotation('player-input:view-rotation'));
    }
    if (mainController && typeof mainController.getMainEditorViewRotation === 'function') {
      return normalizePlayerInputRotationValue(mainController.getMainEditorViewRotation('player-input:view-rotation'));
    }
  } catch (_) {}

  var runtimeEditor = null;
  try {
    var runtimeState = typeof window !== 'undefined' && window.App && window.App.state ? window.App.state.runtimeState || null : null;
    runtimeEditor = runtimeState && runtimeState.editor ? runtimeState.editor : null;
  } catch (_) {
    runtimeEditor = null;
  }
  try {
    if (!runtimeEditor && typeof editor !== 'undefined' && editor) runtimeEditor = editor;
  } catch (_) {}

  var rawRotation = runtimeEditor && typeof runtimeEditor.visualRotation === 'number'
    ? runtimeEditor.visualRotation
    : (runtimeEditor && typeof runtimeEditor.rotation === 'number' ? runtimeEditor.rotation : 0);
  return normalizePlayerInputRotationValue(rawRotation);
}

function getPlayerInputProjectionConfig() {
  return {
    tileW: settings && Number(settings.tileW) || 80,
    tileH: settings && Number(settings.tileH) || 40,
    originX: settings && Number(settings.originX) || 0,
    originY: settings && Number(settings.originY) || 0,
    cameraX: camera && Number(camera.x) || 0,
    cameraY: camera && Number(camera.y) || 0,
    worldBoundsOrOrigin: {
      cols: settings && Number(settings.gridW || settings.worldCols) || 0,
      rows: settings && Number(settings.gridH || settings.worldRows) || 0
    }
  };
}

function normalizePlayerInputWorldVector(wx, wy) {
  wx = Number(wx) || 0;
  wy = Number(wy) || 0;
  var len = Math.hypot(wx, wy);
  if (!Number.isFinite(len) || len <= 1e-9) return null;
  wx /= len;
  wy /= len;
  if (Math.abs(wx) < 1e-9) wx = 0;
  if (Math.abs(wy) < 1e-9) wy = 0;
  return { wx: wx, wy: wy };
}

function rotatePlayerInputAgainstView(wx, wy, viewRotation) {
  var angle = -normalizePlayerInputRotationValue(viewRotation) * (Math.PI / 2);
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  return normalizePlayerInputWorldVector(wx * cos + wy * sin, -wx * sin + wy * cos) || { wx: 0, wy: 0 };
}

function screenVectorToPlayerWorldInput(sx, sy, viewRotation) {
  var api = getPlayerInputViewRotationCoreApi();
  if (api && typeof api.worldToScreenWithViewRotation === 'function' && typeof api.screenToWorldWithViewRotation === 'function') {
    try {
      var z = Number(player && player.z) || 0;
      var cfg = getPlayerInputProjectionConfig();
      var baseScreen = api.worldToScreenWithViewRotation({ x: Number(player && player.x) || 0, y: Number(player && player.y) || 0, z: z }, viewRotation, cfg);
      var pixelStep = Math.max(32, Math.min(160, Number(cfg.tileW) || 80));
      var baseWorld = api.screenToWorldWithViewRotation({ x: baseScreen.x, y: baseScreen.y, z: z }, viewRotation, cfg);
      var targetWorld = api.screenToWorldWithViewRotation({ x: baseScreen.x + sx * pixelStep, y: baseScreen.y + sy * pixelStep, z: z }, viewRotation, cfg);
      var exact = normalizePlayerInputWorldVector(targetWorld.x - baseWorld.x, targetWorld.y - baseWorld.y);
      if (exact) return exact;
    } catch (_) {}
  }

  var wx = sx + sy;
  var wy = sy - sx;
  var normalized = normalizePlayerInputWorldVector(wx, wy) || { wx: 0, wy: 0 };
  return rotatePlayerInputAgainstView(normalized.wx, normalized.wy, viewRotation);
}

function getPlayerInput() {
  let sx = 0, sy = 0;
  if (keys.has('arrowup') || keys.has('w')) sy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) sy += 1;
  if (keys.has('arrowleft') || keys.has('a')) sx -= 1;
  if (keys.has('arrowright') || keys.has('d')) sx += 1;
  if (sx === 0 && sy === 0) return null;
  const sl = Math.hypot(sx, sy) || 1;
  sx /= sl;
  sy /= sl;
  const viewRotation = getPlayerInputViewRotation();
  const worldInput = screenVectorToPlayerWorldInput(sx, sy, viewRotation);
  let wx = worldInput.wx;
  let wy = worldInput.wy;
  let dir = player.dir;
  if (Math.abs(sx) > Math.abs(sy)) dir = sx > 0 ? 'right' : 'left'; else dir = sy > 0 ? 'down' : 'up';
  return { wx, wy, dir, viewRotation };
}

function fallbackBoxOverlap3D(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y && a.z < b.z + b.h && a.z + a.h > b.z;
}


function getPlayerEffectiveMaxStepUpCells() {
  // Top-level rule:
  // if the player is not allowed to step/climb over higher cells, both manual
  // movement and A* pathfinding must treat step-up height as zero.
  if (settings && settings.playerStepOverEnabled === false) return 0;

  var manual = Number(settings && settings.playerMaxStepUpCells != null ? settings.playerMaxStepUpCells : 1);
  if (!Number.isFinite(manual)) manual = 1;
  manual = Math.max(0, manual);

  if (settings && settings.playerAutoStepByHeightEnabled) {
    var h = Number(settings.playerHeightCells || 0);
    var byHeight = Number.isFinite(h) ? Math.max(1, Math.floor(h + 1e-6)) : manual;
    return Math.max(manual, byHeight);
  }
  return manual;
}

function playerPathLog(message, payload) {
  var suffix = '';
  if (payload != null) {
    try { suffix = ' ' + JSON.stringify(payload); } catch (_) { suffix = ' [unserializable]'; }
  }
  try {
    if (typeof detailLog === 'function') detailLog('[PLAYER-PATHFIND] ' + message + suffix);
    else if (typeof pushLog === 'function') pushLog('[PLAYER-PATHFIND] ' + message + suffix);
    else if (typeof console !== 'undefined' && console.log) console.log('[PLAYER-PATHFIND] ' + message + suffix);
  } catch (_) {}
}

function cancelPlayerPath(reason) {
  ensurePlayerStepState();
  if (player.path && player.path.active) playerPathLog('cancel', { reason: reason || 'cancel', remaining: player.path.waypoints ? player.path.waypoints.length : 0 });
  player.path.active = false;
  player.path.waypoints = [];
  player.path.target = null;
  player.path.status = String(reason || 'idle');
  player.path.stuckTime = 0;
}

function clearPlayerPathDebugPreview(reason) {
  ensurePlayerStepState();
  player.path.debugPreview = {
    active: false,
    source: String(reason || 'clear'),
    target: null,
    waypoints: [],
    ok: false,
    reason: String(reason || 'clear')
  };
}

function setPlayerPathDebugPreviewFromResult(result, source) {
  ensurePlayerStepState();
  if (!result || !result.ok) {
    player.path.debugPreview = {
      active: true,
      source: String(source || 'preview'),
      target: result && result.target || null,
      waypoints: [],
      ok: false,
      reason: result && result.reason || 'no-path'
    };
    return player.path.debugPreview;
  }
  player.path.debugPreview = {
    active: true,
    source: String(source || 'preview'),
    target: result.target || null,
    waypoints: Array.isArray(result.waypoints) ? result.waypoints.slice(0) : [],
    ok: true,
    reason: 'ok'
  };
  return player.path.debugPreview;
}

function resolvePlayerClickTargetFromScreen(sx, sy) {
  var target = null;
  try {
    var picked = typeof pickBoxAtScreen === 'function' ? pickBoxAtScreen(sx, sy) : null;
    if (picked && Number.isFinite(Number(picked.x)) && Number.isFinite(Number(picked.y))) {
      target = {
        x: Number(picked.x) + Math.max(0.01, Number(picked.w || 1)) * 0.5,
        y: Number(picked.y) + Math.max(0.01, Number(picked.d || 1)) * 0.5,
        source: 'picked-box'
      };
    }
  } catch (_) {}
  if (!target) {
    try {
      var floor = typeof screenToFloor === 'function' ? screenToFloor(sx, sy) : null;
      if (floor && Number.isFinite(Number(floor.x)) && Number.isFinite(Number(floor.y))) {
        target = { x: Number(floor.x), y: Number(floor.y), source: 'screenToFloor' };
      }
    } catch (_) {}
  }
  return target;
}

function requestPlayerPathPreviewToWorld(wx, wy, source) {
  if (!settings || !settings.playerPathDebugEnabled) {
    clearPlayerPathDebugPreview('debug-disabled');
    return { ok: false, reason: 'debug-disabled' };
  }
  var gridW = Math.max(1, Math.floor(Number(settings.gridW || settings.worldCols || 1)));
  var gridH = Math.max(1, Math.floor(Number(settings.gridH || settings.worldRows || 1)));
  var ix = clampPathCellIndex(wx, gridW);
  var iy = clampPathCellIndex(wy, gridH);
  var result = findPlayerPathToCell(ix, iy);
  setPlayerPathDebugPreviewFromResult(result, source || 'hover-preview');
  return result;
}

function requestPlayerPathPreviewToScreen(sx, sy, source) {
  if (!settings || !settings.playerPathDebugEnabled) {
    clearPlayerPathDebugPreview('debug-disabled');
    return { ok: false, reason: 'debug-disabled' };
  }
  var target = resolvePlayerClickTargetFromScreen(sx, sy);
  if (!target) {
    clearPlayerPathDebugPreview('target-miss');
    return { ok: false, reason: 'target-miss' };
  }
  return requestPlayerPathPreviewToWorld(target.x, target.y, source || ('hover:' + target.source));
}

function getPlayerPathDebugPreviewPoints() {
  ensurePlayerStepState();
  if (!settings || !settings.playerPathDebugEnabled || !player.path || !player.path.debugPreview || !player.path.debugPreview.active) return [];
  var points = [{ x: Number(player.x || 0), y: Number(player.y || 0), z: Number(player.z || 0) }];
  var wps = Array.isArray(player.path.debugPreview.waypoints) ? player.path.debugPreview.waypoints : [];
  for (var i = 0; i < wps.length; i += 1) {
    points.push({ x: Number(wps[i].x || 0), y: Number(wps[i].y || 0), z: Number(wps[i].z || 0), ix: wps[i].ix, iy: wps[i].iy });
  }
  return points;
}


function clampPathCellIndex(v, max) {
  var n = Math.floor(Number(v));
  if (!Number.isFinite(n)) n = 0;
  return Math.max(0, Math.min(Math.max(0, Number(max || 0) - 1), n));
}

function makePlayerPathNodeKey(ix, iy, z) {
  return String(ix) + ',' + String(iy) + ',' + String(Math.round((Number(z) || 0) * 100));
}

function makePlayerPathCellCenter(ix, iy) {
  return { x: Number(ix) + 0.5, y: Number(iy) + 0.5 };
}

function resolvePlayerPathCellMove(node, nix, niy) {
  var c = makePlayerPathCellCenter(nix, niy);
  var virtualPlayer = {
    x: Number(node && node.x != null ? node.x : player.x),
    y: Number(node && node.y != null ? node.y : player.y),
    z: Number(node && node.z != null ? node.z : player.z || 0)
  };
  var core = getPlayerStepCoreApi();
  if (core && typeof core.resolvePlayerStepMove === 'function') {
    return core.resolvePlayerStepMove({
      player: virtualPlayer,
      targetX: c.x,
      targetY: c.y,
      boxes: Array.isArray(boxes) ? boxes : [],
      settings: settings,
      maxStepUpCells: getPlayerEffectiveMaxStepUpCells()
    });
  }
  return resolvePlayerMoveTo(c.x, c.y);
}


function normalizePlayerPathAlgorithm(value) {
  var v = String(value || 'astar');
  if (v === 'a-star' || v === 'A*') v = 'astar';
  if (v === 'weighted' || v === 'weighted_astar') v = 'weightedAstar';
  if (v === 'bestFirst' || v === 'best-first') v = 'greedy';
  if (v === 'astar' || v === 'weightedAstar' || v === 'dijkstra' || v === 'bfs' || v === 'greedy') return v;
  return 'astar';
}

function getPlayerPathAlgorithmLabel(value) {
  var v = normalizePlayerPathAlgorithm(value);
  if (v === 'weightedAstar') return 'Weighted A*';
  if (v === 'dijkstra') return 'Dijkstra';
  if (v === 'bfs') return 'BFS';
  if (v === 'greedy') return 'Greedy Best-First';
  return 'A*';
}

function getPlayerPathAlgorithmConfig() {
  var algorithm = normalizePlayerPathAlgorithm(settings && settings.playerPathAlgorithm || 'astar');
  var cfg = {
    algorithm: algorithm,
    label: getPlayerPathAlgorithmLabel(algorithm),
    diagonal: true,
    useHeightCost: algorithm !== 'bfs',
    weightedHeuristic: algorithm === 'weightedAstar' ? 1.6 : 1,
    description: ''
  };
  if (algorithm === 'astar') cfg.description = 'f = g + h; balanced shortest-cost grid search';
  else if (algorithm === 'weightedAstar') cfg.description = 'f = g + 1.6h; more goal-directed, may choose less optimal but faster-looking paths';
  else if (algorithm === 'dijkstra') cfg.description = 'f = g; no heuristic, expands by accumulated movement cost';
  else if (algorithm === 'bfs') cfg.description = 'f = step count; ignores diagonal/height cost differences, finds fewest-step path';
  else if (algorithm === 'greedy') cfg.description = 'f = h; strongly target-directed, may be less optimal around obstacles';
  return cfg;
}

function computePlayerPathPriority(algorithm, g, h, depth) {
  algorithm = normalizePlayerPathAlgorithm(algorithm);
  if (algorithm === 'dijkstra') return g;
  if (algorithm === 'bfs') return depth;
  if (algorithm === 'greedy') return h + g * 0.001;
  if (algorithm === 'weightedAstar') return g + h * 1.6;
  return g + h;
}

function computePlayerPathStepCost(algorithm, baseCost, verticalCost) {
  algorithm = normalizePlayerPathAlgorithm(algorithm);
  if (algorithm === 'bfs') return 1;
  return Number(baseCost || 1) + Number(verticalCost || 0);
}


function findPlayerPathToCell(targetIx, targetIy) {
  ensurePlayerStepState();
  var algorithmConfig = getPlayerPathAlgorithmConfig();
  var algorithm = algorithmConfig.algorithm;
  var gridW = Math.max(1, Math.floor(Number(settings.gridW || settings.worldCols || 1)));
  var gridH = Math.max(1, Math.floor(Number(settings.gridH || settings.worldRows || 1)));
  targetIx = clampPathCellIndex(targetIx, gridW);
  targetIy = clampPathCellIndex(targetIy, gridH);

  var startIx = clampPathCellIndex(player.x, gridW);
  var startIy = clampPathCellIndex(player.y, gridH);
  var start = {
    ix: startIx,
    iy: startIy,
    x: Number(player.x || 0),
    y: Number(player.y || 0),
    z: Number(player.z || 0),
    g: 0,
    depth: 0,
    f: 0,
    seq: 0,
    parent: null
  };
  var maxIterations = Math.max(1000, Math.min(30000, gridW * gridH * 16));
  var dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]
  ];

  function heuristic(ix, iy) {
    var dx = Math.abs(ix - targetIx);
    var dy = Math.abs(iy - targetIy);
    if (algorithm === 'bfs' || algorithm === 'dijkstra') return 0;
    var mn = Math.min(dx, dy);
    var mx = Math.max(dx, dy);
    return (mx - mn) + mn * 1.414;
  }

  var seqCounter = 0;
  start.f = computePlayerPathPriority(algorithm, start.g, heuristic(startIx, startIy), start.depth);
  var open = [start];
  var best = {};
  best[makePlayerPathNodeKey(start.ix, start.iy, start.z)] = 0;
  var closed = {};
  var iterations = 0;
  var found = null;
  var blockedReasons = {};
  var expandedCount = 0;

  while (open.length && iterations < maxIterations) {
    iterations += 1;
    open.sort(function (a, b) {
      if (a.f !== b.f) return a.f - b.f;
      if (a.g !== b.g) return a.g - b.g;
      return a.seq - b.seq;
    });
    var cur = open.shift();
    var curKey = makePlayerPathNodeKey(cur.ix, cur.iy, cur.z);
    if (closed[curKey]) continue;
    closed[curKey] = true;
    expandedCount += 1;

    if (cur.ix === targetIx && cur.iy === targetIy) {
      found = cur;
      break;
    }

    for (var di = 0; di < dirs.length; di += 1) {
      var dx = dirs[di][0], dy = dirs[di][1], baseCost = dirs[di][2];
      var nix = cur.ix + dx;
      var niy = cur.iy + dy;
      if (nix < 0 || niy < 0 || nix >= gridW || niy >= gridH) continue;

      if (dx !== 0 && dy !== 0) {
        var orthoA = resolvePlayerPathCellMove(cur, cur.ix + dx, cur.iy);
        var orthoB = resolvePlayerPathCellMove(cur, cur.ix, cur.iy + dy);
        if (!orthoA || !orthoA.allowed || !orthoB || !orthoB.allowed) continue;
      }

      var resolved = resolvePlayerPathCellMove(cur, nix, niy);
      if (!resolved || !resolved.allowed) {
        var reason = resolved && resolved.reason || 'blocked';
        blockedReasons[reason] = (blockedReasons[reason] || 0) + 1;
        continue;
      }

      var center = makePlayerPathCellCenter(nix, niy);
      var nz = Number(resolved.toZ != null ? resolved.toZ : cur.z);
      var verticalCost = Math.abs(nz - cur.z) * 0.20;
      var stepCost = computePlayerPathStepCost(algorithm, baseCost, verticalCost);
      var ng = cur.g + stepCost;
      var depth = Number(cur.depth || 0) + 1;
      var key = makePlayerPathNodeKey(nix, niy, nz);

      // For BFS we still keep best by depth/step count. For cost-based
      // algorithms this is accumulated path cost.
      if (best[key] != null && best[key] <= ng) continue;
      best[key] = ng;

      var h = heuristic(nix, niy);
      open.push({
        ix: nix,
        iy: niy,
        x: center.x,
        y: center.y,
        z: nz,
        g: ng,
        depth: depth,
        h: h,
        f: computePlayerPathPriority(algorithm, ng, h, depth),
        seq: ++seqCounter,
        parent: cur,
        mode: resolved.mode,
        reason: resolved.reason
      });
    }
  }

  if (!found) {
    return {
      ok: false,
      reason: 'no-path',
      algorithm: algorithm,
      algorithmLabel: algorithmConfig.label,
      algorithmDescription: algorithmConfig.description,
      iterations: iterations,
      expandedCount: expandedCount,
      target: { ix: targetIx, iy: targetIy },
      blockedReasons: blockedReasons
    };
  }

  var rev = [];
  var n = found;
  while (n && n.parent) {
    rev.push({ x: n.x, y: n.y, z: n.z, ix: n.ix, iy: n.iy, mode: n.mode || 'walk' });
    n = n.parent;
  }
  rev.reverse();
  return {
    ok: true,
    algorithm: algorithm,
    algorithmLabel: algorithmConfig.label,
    algorithmDescription: algorithmConfig.description,
    waypoints: rev,
    iterations: iterations,
    expandedCount: expandedCount,
    target: { ix: targetIx, iy: targetIy, x: found.x, y: found.y, z: found.z },
    cost: found.g,
    depth: found.depth
  };
}


function requestPlayerPathToWorld(wx, wy, source) {
  ensurePlayerStepState();
  var gridW = Math.max(1, Math.floor(Number(settings.gridW || settings.worldCols || 1)));
  var gridH = Math.max(1, Math.floor(Number(settings.gridH || settings.worldRows || 1)));
  var ix = clampPathCellIndex(wx, gridW);
  var iy = clampPathCellIndex(wy, gridH);
  var result = findPlayerPathToCell(ix, iy);
  if (!result.ok) {
    cancelPlayerPath('no-path');
    playerPathLog('plan-failed', Object.assign({ source: source || 'unknown', algorithm: result.algorithm || normalizePlayerPathAlgorithm(settings.playerPathAlgorithm), algorithmLabel: result.algorithmLabel || getPlayerPathAlgorithmLabel(settings.playerPathAlgorithm), effectiveMaxStepUpCells: getPlayerEffectiveMaxStepUpCells(), playerStepOverEnabled: settings.playerStepOverEnabled !== false }, result));
    return result;
  }
  player.path.active = result.waypoints.length > 0;
  player.path.waypoints = result.waypoints;
  player.path.target = result.target;
  player.path.status = player.path.active ? 'moving' : 'already-there';
  player.path.stuckTime = 0;
  playerPathLog('plan-ready', {
    source: source || 'unknown',
    target: result.target,
    waypointCount: result.waypoints.length,
    iterations: result.iterations,
    cost: Number((result.cost || 0).toFixed(3)),
    algorithm: result.algorithm || normalizePlayerPathAlgorithm(settings.playerPathAlgorithm), algorithmLabel: result.algorithmLabel || getPlayerPathAlgorithmLabel(settings.playerPathAlgorithm), effectiveMaxStepUpCells: getPlayerEffectiveMaxStepUpCells(), playerStepOverEnabled: settings.playerStepOverEnabled !== false
  });
  return result;
}

function requestPlayerClickMoveToScreen(sx, sy, source) {
  if (!settings || !settings.playerClickMoveEnabled) return { ok: false, reason: 'click-move-disabled' };
  var target = null;
  try {
    var picked = typeof pickBoxAtScreen === 'function' ? pickBoxAtScreen(sx, sy) : null;
    if (picked && Number.isFinite(Number(picked.x)) && Number.isFinite(Number(picked.y))) {
      target = {
        x: Number(picked.x) + Math.max(0.01, Number(picked.w || 1)) * 0.5,
        y: Number(picked.y) + Math.max(0.01, Number(picked.d || 1)) * 0.5,
        source: 'picked-box'
      };
    }
  } catch (_) {}
  if (!target) {
    try {
      var floor = typeof screenToFloor === 'function' ? screenToFloor(sx, sy) : null;
      if (floor && Number.isFinite(Number(floor.x)) && Number.isFinite(Number(floor.y))) {
        target = { x: Number(floor.x), y: Number(floor.y), source: 'screenToFloor' };
      }
    } catch (_) {}
  }
  if (!target) {
    playerPathLog('click-target-miss', { sx: sx, sy: sy, source: source || 'unknown' });
    return { ok: false, reason: 'target-miss' };
  }
  return requestPlayerPathToWorld(target.x, target.y, source || ('click:' + target.source));
}

function getPlayerPathInput(dt) {
  ensurePlayerStepState();
  if (!settings || !settings.playerClickMoveEnabled || !player.path || !player.path.active) return null;
  var stop = Math.max(0.02, Number(settings.playerPathStopDistanceCells || 0.08));
  while (player.path.waypoints.length) {
    var wp = player.path.waypoints[0];
    var dx = Number(wp.x || 0) - Number(player.x || 0);
    var dy = Number(wp.y || 0) - Number(player.y || 0);
    var dist = Math.hypot(dx, dy);
    if (dist > stop) break;
    player.path.waypoints.shift();
  }
  if (!player.path.waypoints.length) {
    player.path.active = false;
    player.path.status = 'arrived';
    player.path.target = null;
    player.path.stuckTime = 0;
    playerPathLog('arrived', { x: Number(player.x.toFixed(3)), y: Number(player.y.toFixed(3)), z: Number((player.z || 0).toFixed(3)) });
    return null;
  }
  var next = player.path.waypoints[0];
  var vx = Number(next.x || 0) - Number(player.x || 0);
  var vy = Number(next.y || 0) - Number(player.y || 0);
  var len = Math.hypot(vx, vy);
  if (!Number.isFinite(len) || len <= 1e-6) return null;
  var wx = vx / len;
  var wy = vy / len;
  var dir = Math.abs(wx) > Math.abs(wy) ? (wx > 0 ? 'right' : 'left') : (wy > 0 ? 'down' : 'up');
  return { wx: wx, wy: wy, dir: dir, pathMove: true };
}


function resolvePlayerMoveTo(nx, ny) {
  ensurePlayerStepState();
  var core = getPlayerStepCoreApi();
  if (core && typeof core.resolvePlayerStepMove === 'function') {
    return core.resolvePlayerStepMove({
      player: player,
      targetX: nx,
      targetY: ny,
      boxes: Array.isArray(boxes) ? boxes : [],
      settings: settings,
      maxStepUpCells: getPlayerEffectiveMaxStepUpCells()
    });
  }
  var box = getPlayerProxyBox(nx, ny, player.z || 0);
  if (box.x < 0 || box.y < 0 || box.x + box.w > settings.gridW || box.y + box.d > settings.gridH) {
    return { allowed: false, mode: 'blocked', reason: 'world-bounds', targetX: nx, targetY: ny, fromZ: player.z || 0, toZ: player.z || 0, bodyBox: box };
  }
  var hit = (Array.isArray(boxes) ? boxes : []).some(function (b) { return fallbackBoxOverlap3D(box, b); });
  return { allowed: !hit, mode: hit ? 'blocked' : 'walk', reason: hit ? 'body-blocked-fallback' : 'fallback-same-level', targetX: nx, targetY: ny, fromZ: player.z || 0, toZ: player.z || 0, bodyBox: box };
}

function logBlockedPlayerStep(result, axis) {
  var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  var signature = [axis || 'axis', result && result.reason || 'blocked', Math.round(Number(result && result.targetX || 0) * 100), Math.round(Number(result && result.targetY || 0) * 100), Math.round(Number(result && result.toZ || 0) * 100)].join('|');
  if (__lastPlayerStepBlockedLog.signature === signature && now - __lastPlayerStepBlockedLog.at < 250) return;
  __lastPlayerStepBlockedLog.signature = signature;
  __lastPlayerStepBlockedLog.at = now;
  playerStepLog('blocked', {
    axis: axis || null,
    reason: result && result.reason || 'blocked',
    fromZ: Number(result && result.fromZ != null ? result.fromZ : player.z || 0),
    toZ: Number(result && result.toZ != null ? result.toZ : player.z || 0),
    target: { x: Number((result && result.targetX != null ? result.targetX : player.x).toFixed ? result.targetX.toFixed(3) : result && result.targetX || player.x), y: Number((result && result.targetY != null ? result.targetY : player.y).toFixed ? result.targetY.toFixed(3) : result && result.targetY || player.y) }
  }, { route: false });
}

function clampNumberLocal(value, minValue, maxValue) {
  var n = Number(value);
  if (!Number.isFinite(n)) n = Number(minValue || 0);
  return Math.max(Number(minValue || 0), Math.min(Number(maxValue || 0), n));
}

function isStairStepSupportBox(box) {
  if (!box || typeof box !== 'object') return false;
  var shapeKind = String(box.shapeKind || '');
  var prefabId = String(box.prefabId || '');
  return /^stair_mc_\d+step$/.test(shapeKind) || /^stair_mc_\d+step$/.test(prefabId) || Number(box.stairStepCount || 0) > 1;
}

function startPlayerStepJump(fromZ, toZ, axis, mode, transitionInfo) {
  ensurePlayerStepState();

  var transitionMode = mode || 'jump-up';
  var isDrop = transitionMode === 'drop';
  var info = transitionInfo && typeof transitionInfo === 'object' ? transitionInfo : {};
  var from = Number(fromZ || 0);
  var to = Number(toZ || 0);
  var deltaAbs = Math.abs(to - from);
  var supportBox = info.supportBox || null;
  var isStairStep = transitionMode === 'jump-up' && isStairStepSupportBox(supportBox);

  player.jump.active = true;
  player.jump.mode = transitionMode;
  player.jump.fromZ = from;
  player.jump.toZ = to;
  player.jump.t = 0;
  player.jump.deltaZ = to - from;
  player.jump.isStairStep = !!isStairStep;

  var baseJumpDuration = Math.max(0.05, Number(settings.playerJumpDurationSec || player.jump.duration || 0.18));
  var baseDropDuration = Math.max(0.05, Number(settings.playerDropDurationSec || settings.playerJumpDurationSec || player.jump.duration || 0.16));
  var stairMinDuration = Math.max(0.04, Number(settings.playerStairStepMinDurationSec != null ? settings.playerStairStepMinDurationSec : 0.055));
  var stairMaxDuration = Math.max(stairMinDuration, Number(settings.playerStairStepMaxDurationSec != null ? settings.playerStairStepMaxDurationSec : 0.11));
  var deltaScale = clampNumberLocal(deltaAbs / 0.5, 0, 1);

  if (isDrop) {
    player.jump.duration = baseDropDuration;
  } else if (isStairStep) {
    player.jump.duration = stairMinDuration + (stairMaxDuration - stairMinDuration) * deltaScale;
  } else {
    player.jump.duration = baseJumpDuration;
  }

  var configuredJumpLift = Math.max(0, Number(settings.playerJumpLiftCells || player.jump.lift || 0.35));
  var configuredDropLift = Math.max(0, Number(settings.playerDropLiftCells != null ? settings.playerDropLiftCells : 0.16));
  if (isDrop) {
    player.jump.lift = Math.min(configuredDropLift, Math.max(0, deltaAbs * 0.5));
    player.jump.arcEnabled = player.jump.lift > 1e-6;
  } else if (isStairStep) {
    // MC-style stepped slopes should feel like climbing a small ledge, not like a jump.
    // The visual height is therefore a direct interpolation from fromZ to toZ.
    player.jump.lift = 0;
    player.jump.arcEnabled = false;
  } else {
    player.jump.lift = Math.min(configuredJumpLift, configuredJumpLift * clampNumberLocal(deltaAbs, 0, 1));
    player.jump.arcEnabled = player.jump.lift > 1e-6;
  }

  player.visualZ = player.jump.fromZ;
  player.renderSortZ = player.jump.fromZ;

  playerStepLog(isDrop ? 'drop-start' : (isStairStep ? 'stair-step-start' : 'jump-start'), {
    axis: axis || null,
    fromZ: Number(player.jump.fromZ.toFixed(3)),
    toZ: Number(player.jump.toZ.toFixed(3)),
    deltaZ: Number(player.jump.deltaZ.toFixed(3)),
    duration: Number(player.jump.duration.toFixed(3)),
    lift: Number(player.jump.lift.toFixed(3)),
    arcEnabled: !!player.jump.arcEnabled,
    isStairStep: !!isStairStep,
    supportShapeKind: supportBox && supportBox.shapeKind || null,
    supportStepIndex: supportBox && supportBox.stairStepIndex != null ? Number(supportBox.stairStepIndex) : null,
    supportStepCount: supportBox && supportBox.stairStepCount != null ? Number(supportBox.stairStepCount) : null,
    position: { x: Number(player.x.toFixed(3)), y: Number(player.y.toFixed(3)) }
  });
}

function updatePlayerJumpVisual(dt) {
  ensurePlayerStepState();
  if (!player.jump.active) {
    player.visualZ = Number(player.z || 0);
    player.renderSortZ = Number(player.z || 0);
    return false;
  }
  var duration = Math.max(0.05, Number(player.jump.duration || settings.playerJumpDurationSec || 0.18));
  player.jump.t += Math.max(0, Number(dt || 0));
  var p = clamp(player.jump.t / duration, 0, 1);
  var baseZ = Number(player.jump.fromZ || 0) + (Number(player.jump.toZ || 0) - Number(player.jump.fromZ || 0)) * p;
  var arc = player.jump.arcEnabled === false ? 0 : Math.sin(Math.PI * p) * Math.max(0, Number(player.jump.lift || 0));
  player.renderSortZ = baseZ;
  player.visualZ = baseZ + arc;
  if (p >= 1) {
    var endedMode = player.jump.mode || 'jump-up';
    player.jump.active = false;
    player.z = Number(player.jump.toZ || player.z || 0);
    player.visualZ = player.z;
    player.renderSortZ = player.z;
    playerStepLog(endedMode === 'drop' ? 'drop-end' : 'jump-end', { z: Number(player.z.toFixed(3)), position: { x: Number(player.x.toFixed(3)), y: Number(player.y.toFixed(3)) } });
  }
  return true;
}

function applyResolvedPlayerMove(result, axis) {
  if (!result || !result.allowed) {
    logBlockedPlayerStep(result || { reason: 'blocked' }, axis);
    return false;
  }
  if ((result.mode === 'jump-up' || result.mode === 'drop') && player.jump && player.jump.active) {
    logBlockedPlayerStep(Object.assign({}, result, { reason: 'vertical-transition-active' }), axis);
    return false;
  }
  var before = { x: player.x, y: player.y, z: Number(player.z || 0) };
  player.x = Number(result.targetX != null ? result.targetX : player.x);
  player.y = Number(result.targetY != null ? result.targetY : player.y);
  player.z = Number(result.toZ != null ? result.toZ : player.z || 0);
  if (result.mode === 'jump-up' || result.mode === 'drop') {
    startPlayerStepJump(result.fromZ, result.toZ, axis, result.mode, { supportBox: result.supportBox, deltaZ: result.deltaZ });
  } else if (!player.jump || !player.jump.active) {
    player.visualZ = player.z;
    player.renderSortZ = player.z;
  }
  if (result.mode === 'jump-up' || result.mode === 'drop' || verboseLog) {
    playerStepLog('move-accepted', {
      axis: axis || null,
      mode: result.mode,
      reason: result.reason || null,
      from: { x: Number(before.x.toFixed(3)), y: Number(before.y.toFixed(3)), z: Number(before.z.toFixed(3)) },
      to: { x: Number(player.x.toFixed(3)), y: Number(player.y.toFixed(3)), z: Number(player.z.toFixed(3)) },
      visualZ: Number(player.visualZ.toFixed(3))
    }, { route: result.mode !== 'walk' });
  }
  return before.x !== player.x || before.y !== player.y || before.z !== player.z;
}

function collidesPlayer(nx, ny) {
  return !resolvePlayerMoveTo(nx, ny).allowed;
}

function canPlayerMoveTo(nx, ny) {
  return !collidesPlayer(nx, ny);
}

function applyPlayerInput(input, dt) {
  ensurePlayerStepState();
  player.moving = !!input;
  if (!input) return { moved: false, input: null };
  player.dir = input.dir;
  const speed = player.speed * (keys.has('shift') ? 1.7 : 1.0);
  const stepX = input.wx * speed * dt;
  const stepY = input.wy * speed * dt;
  const beforeX = player.x;
  const beforeY = player.y;
  const beforeZ = Number(player.z || 0);
  const nx = player.x + stepX;
  applyResolvedPlayerMove(resolvePlayerMoveTo(nx, player.y), 'x');
  const ny = player.y + stepY;
  applyResolvedPlayerMove(resolvePlayerMoveTo(player.x, ny), 'y');
  player.walk += dt * (keys.has('shift') ? 12.0 : 8.0);
  return { moved: beforeX !== player.x || beforeY !== player.y || beforeZ !== Number(player.z || 0), input: input };
}

function updatePlayerMovement(dt) {
  ensurePlayerStepState();
  const manualInput = SHOW_PLAYER ? getPlayerInput() : null;
  if (manualInput && player.path && player.path.active) cancelPlayerPath('manual-input');
  const pathInput = (!manualInput && SHOW_PLAYER) ? getPlayerPathInput(dt) : null;
  const input = manualInput || pathInput;
  if (debugState.frame < 5 || verboseLog) detailLog('player:update:start frame=' + debugState.frame + ' dt=' + dt.toFixed(4) + ' input=' + (input ? JSON.stringify(input) : 'null') + ' playerBefore=(' + player.x.toFixed(2) + ',' + player.y.toFixed(2) + ',' + Number(player.z || 0).toFixed(2) + ') visualZ=' + Number(player.visualZ || 0).toFixed(2) + ' jumpActive=' + !!(player.jump && player.jump.active));
  const result = applyPlayerInput(input, dt);
  if (pathInput && player.path && player.path.active) {
    if (!result || !result.moved) player.path.stuckTime = Number(player.path.stuckTime || 0) + Math.max(0, Number(dt || 0));
    else player.path.stuckTime = 0;
    if (player.path.stuckTime > 0.75) cancelPlayerPath('stuck');
  }
  updatePlayerJumpVisual(dt);
  if (debugState.frame < 5 || verboseLog) detailLog('player:update:done frame=' + debugState.frame + ' playerAfter=(' + player.x.toFixed(2) + ',' + player.y.toFixed(2) + ',' + Number(player.z || 0).toFixed(2) + ') visualZ=' + Number(player.visualZ || 0).toFixed(2) + ' jumpActive=' + !!(player.jump && player.jump.active) + ' moving=' + player.moving);
  return result;
}

ensurePlayerStepState();
playerStepLog('feature-ready', { phase: 'PLAYER-STEP-JUMP-V2-DROP-ANIM-PATHFIND', maxStepUpCells: getPlayerEffectiveMaxStepUpCells(), jumpDurationSec: settings.playerJumpDurationSec, jumpLiftCells: settings.playerJumpLiftCells, dropDurationSec: settings.playerDropDurationSec, dropLiftCells: settings.playerDropLiftCells }, { route: false });
playerRoute('module-loaded', { owner: PLAYER_MODULE_OWNER, feature: 'PLAYER-STEP-JUMP-V2-DROP-ANIM-PATHFIND' });


try {
  if (typeof window !== 'undefined') {
    window.clearPlayerPathDebugPreview = clearPlayerPathDebugPreview;
    window.requestPlayerPathPreviewToScreen = requestPlayerPathPreviewToScreen;
    window.requestPlayerPathPreviewToWorld = requestPlayerPathPreviewToWorld;
    window.getPlayerPathDebugPreviewPoints = getPlayerPathDebugPreviewPoints;
  }
} catch (_) {}



try {
  if (typeof window !== 'undefined') {
    window.getPlayerPathAlgorithmConfig = getPlayerPathAlgorithmConfig;
    window.normalizePlayerPathAlgorithm = normalizePlayerPathAlgorithm;
  }
} catch (_) {}

