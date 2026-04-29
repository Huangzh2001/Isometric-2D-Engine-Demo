// player movement / collision entry extraction (PLAYER-STEP-JUMP-V2-DROP-ANIM)

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
  if (!player.jump || typeof player.jump !== 'object') player.jump = {};
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
  playerRoute('resetPlayer', { x: player.x, y: player.y, z: player.z, visualZ: player.visualZ });
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

function getPlayerInputViewRotation() {
  var runtimeEditor = null;
  try {
    runtimeEditor = typeof editor !== 'undefined' && editor ? editor : null;
  } catch (_) {
    runtimeEditor = null;
  }
  var rawRotation = runtimeEditor && typeof runtimeEditor.visualRotation === 'number'
    ? runtimeEditor.visualRotation
    : (runtimeEditor && typeof runtimeEditor.rotation === 'number' ? runtimeEditor.rotation : 0);
  var turns = Number(rawRotation) || 0;
  turns %= 4;
  if (turns < 0) turns += 4;
  return turns;
}

function rotatePlayerInputAgainstView(wx, wy, viewRotation) {
  var angle = -(Number(viewRotation) || 0) * (Math.PI / 2);
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  var rx = wx * cos + wy * sin;
  var ry = -wx * sin + wy * cos;
  if (Math.abs(rx) < 1e-9) rx = 0;
  if (Math.abs(ry) < 1e-9) ry = 0;
  return { wx: rx, wy: ry };
}

function getPlayerInput() {
  let sx = 0, sy = 0;
  if (keys.has('arrowup') || keys.has('w')) sy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) sy += 1;
  if (keys.has('arrowleft') || keys.has('a')) sx -= 1;
  if (keys.has('arrowright') || keys.has('d')) sx += 1;
  if (sx === 0 && sy === 0) return null;
  const sl = Math.hypot(sx, sy); sx /= sl; sy /= sl;
  let wx = sx + sy, wy = sy - sx; const wl = Math.hypot(wx, wy) || 1; wx /= wl; wy /= wl;
  const viewRotation = getPlayerInputViewRotation();
  const rotatedInput = rotatePlayerInputAgainstView(wx, wy, viewRotation);
  wx = rotatedInput.wx; wy = rotatedInput.wy;
  let dir = player.dir;
  if (Math.abs(sx) > Math.abs(sy)) dir = sx > 0 ? 'right' : 'left'; else dir = sy > 0 ? 'down' : 'up';
  return { wx, wy, dir, viewRotation };
}

function fallbackBoxOverlap3D(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y && a.z < b.z + b.h && a.z + a.h > b.z;
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
      maxStepUpCells: settings.playerMaxStepUpCells
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

function startPlayerStepJump(fromZ, toZ, axis, mode) {
  ensurePlayerStepState();

  var transitionMode = mode || 'jump-up';
  var isDrop = transitionMode === 'drop';

  player.jump.active = true;
  player.jump.mode = transitionMode;
  player.jump.fromZ = Number(fromZ || 0);
  player.jump.toZ = Number(toZ || 0);
  player.jump.t = 0;

  player.jump.duration = Math.max(0.05, Number(
    isDrop
      ? (settings.playerDropDurationSec || settings.playerJumpDurationSec || player.jump.duration || 0.16)
      : (settings.playerJumpDurationSec || player.jump.duration || 0.18)
  ));

  player.jump.lift = Math.max(0, Number(
    isDrop
      ? (settings.playerDropLiftCells != null ? settings.playerDropLiftCells : 0.16)
      : (settings.playerJumpLiftCells || player.jump.lift || 0.35)
  ));

  player.visualZ = player.jump.fromZ;

  playerStepLog(isDrop ? 'drop-start' : 'jump-start', {
    axis: axis || null,
    fromZ: Number(player.jump.fromZ.toFixed(3)),
    toZ: Number(player.jump.toZ.toFixed(3)),
    duration: Number(player.jump.duration.toFixed(3)),
    lift: Number(player.jump.lift.toFixed(3)),
    position: { x: Number(player.x.toFixed(3)), y: Number(player.y.toFixed(3)) }
  });
}

function updatePlayerJumpVisual(dt) {
  ensurePlayerStepState();
  if (!player.jump.active) {
    player.visualZ = Number(player.z || 0);
    return false;
  }
  var duration = Math.max(0.05, Number(player.jump.duration || settings.playerJumpDurationSec || 0.18));
  player.jump.t += Math.max(0, Number(dt || 0));
  var p = clamp(player.jump.t / duration, 0, 1);
  var baseZ = Number(player.jump.fromZ || 0) + (Number(player.jump.toZ || 0) - Number(player.jump.fromZ || 0)) * p;
  var arc = Math.sin(Math.PI * p) * Math.max(0, Number(player.jump.lift || settings.playerJumpLiftCells || 0.35));
  player.visualZ = baseZ + arc;
  if (p >= 1) {
    var endedMode = player.jump.mode || 'jump-up';
    player.jump.active = false;
    player.z = Number(player.jump.toZ || player.z || 0);
    player.visualZ = player.z;
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
    startPlayerStepJump(result.fromZ, result.toZ, axis, result.mode);
  } else if (!player.jump || !player.jump.active) {
    player.visualZ = player.z;
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
  const input = SHOW_PLAYER ? getPlayerInput() : null;
  if (debugState.frame < 5 || verboseLog) detailLog('player:update:start frame=' + debugState.frame + ' dt=' + dt.toFixed(4) + ' input=' + (input ? JSON.stringify(input) : 'null') + ' playerBefore=(' + player.x.toFixed(2) + ',' + player.y.toFixed(2) + ',' + Number(player.z || 0).toFixed(2) + ') visualZ=' + Number(player.visualZ || 0).toFixed(2) + ' jumpActive=' + !!(player.jump && player.jump.active));
  const result = applyPlayerInput(input, dt);
  updatePlayerJumpVisual(dt);
  if (debugState.frame < 5 || verboseLog) detailLog('player:update:done frame=' + debugState.frame + ' playerAfter=(' + player.x.toFixed(2) + ',' + player.y.toFixed(2) + ',' + Number(player.z || 0).toFixed(2) + ') visualZ=' + Number(player.visualZ || 0).toFixed(2) + ' jumpActive=' + !!(player.jump && player.jump.active) + ' moving=' + player.moving);
  return result;
}

ensurePlayerStepState();
playerStepLog('feature-ready', { phase: 'PLAYER-STEP-JUMP-V2-DROP-ANIM', maxStepUpCells: settings.playerMaxStepUpCells, jumpDurationSec: settings.playerJumpDurationSec, jumpLiftCells: settings.playerJumpLiftCells, dropDurationSec: settings.playerDropDurationSec, dropLiftCells: settings.playerDropLiftCells }, { route: false });
playerRoute('module-loaded', { owner: PLAYER_MODULE_OWNER, feature: 'PLAYER-STEP-JUMP-V2-DROP-ANIM' });
