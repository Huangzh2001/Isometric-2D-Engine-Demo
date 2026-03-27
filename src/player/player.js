// player movement / collision entry extraction (behavior-preserving first cut)

var PLAYER_MODULE_OWNER = 'src/player/player.js';

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

function resetPlayer() {
  player.x = 1.1;
  player.y = 1.1;
  player.walk = 0;
  player.dir = 'down';
  player.moving = false;
  playerRoute('resetPlayer', { x: player.x, y: player.y });
}

function clampPlayerToWorld() {
  player.x = clamp(player.x, player.r + 0.05, settings.gridW - player.r - 0.05);
  player.y = clamp(player.y, player.r + 0.05, settings.gridH - player.r - 0.05);
  return { x: player.x, y: player.y };
}

function getPlayerProxyBox(nx, ny) {
  if (nx == null) nx = player.x;
  if (ny == null) ny = player.y;
  return {
    x: nx - settings.playerProxyW * 0.5,
    y: ny - settings.playerProxyD * 0.5,
    z: 0,
    w: settings.playerProxyW,
    d: settings.playerProxyD,
    h: settings.playerHeightCells,
  };
}

function getPlayerShadowCenter() {
  const box = getPlayerProxyBox();
  return { x: box.x + box.w * 0.5, y: box.y + box.d * 0.5, z: box.h * 0.5 };
}

function getPlayerGroundBounds() {
  const box = getPlayerProxyBox();
  const poly = [
    iso(box.x, box.y, 0),
    iso(box.x + box.w, box.y, 0),
    iso(box.x + box.w, box.y + box.d, 0),
    iso(box.x, box.y + box.d, 0),
  ];
  return polyBounds(poly);
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
  let dir = player.dir;
  if (Math.abs(sx) > Math.abs(sy)) dir = sx > 0 ? 'right' : 'left'; else dir = sy > 0 ? 'down' : 'up';
  return { wx, wy, dir };
}

function collidesPlayer(nx, ny) {
  const box = getPlayerProxyBox(nx, ny);
  if (box.x < 0 || box.y < 0 || box.x + box.w > settings.gridW || box.y + box.d > settings.gridH) return true;
  return boxes.some(function (b) { return boxRectOverlap3D(box, b); });
}

function canPlayerMoveTo(nx, ny) {
  return !collidesPlayer(nx, ny);
}

function applyPlayerInput(input, dt) {
  player.moving = !!input;
  if (!input) return { moved: false, input: null };
  player.dir = input.dir;
  const speed = player.speed * (keys.has('shift') ? 1.7 : 1.0);
  const stepX = input.wx * speed * dt;
  const stepY = input.wy * speed * dt;
  const beforeX = player.x;
  const beforeY = player.y;
  const nx = player.x + stepX; if (!collidesPlayer(nx, player.y)) player.x = nx;
  const ny = player.y + stepY; if (!collidesPlayer(player.x, ny)) player.y = ny;
  player.walk += dt * (keys.has('shift') ? 12.0 : 8.0);
  return { moved: beforeX !== player.x || beforeY !== player.y, input: input };
}

function updatePlayerMovement(dt) {
  const input = SHOW_PLAYER ? getPlayerInput() : null;
  if (debugState.frame < 5 || verboseLog) detailLog('player:update:start frame=' + debugState.frame + ' dt=' + dt.toFixed(4) + ' input=' + (input ? JSON.stringify(input) : 'null') + ' playerBefore=(' + player.x.toFixed(2) + ',' + player.y.toFixed(2) + ')');
  const result = applyPlayerInput(input, dt);
  if (debugState.frame < 5 || verboseLog) detailLog('player:update:done frame=' + debugState.frame + ' playerAfter=(' + player.x.toFixed(2) + ',' + player.y.toFixed(2) + ') moving=' + player.moving);
  return result;
}

playerRoute('module-loaded', { owner: PLAYER_MODULE_OWNER });
