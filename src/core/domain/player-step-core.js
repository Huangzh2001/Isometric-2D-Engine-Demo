// PLAYER-STEP-JUMP-V1: pure player step-up / body clearance rules.
var __APP_CORE_PLAYER_STEP_CORE__ = (function () {
  var OWNER = 'src/core/domain/player-step-core.js';
  var PHASE = 'PLAYER-STEP-JUMP-V1';
  var EPS = 1e-6;

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function boxValue(box, key, fallback) {
    return box && box[key] != null ? toNumber(box[key], fallback) : toNumber(fallback, 0);
  }

  function makePlayerFootprint(x, y, settings) {
    var s = settings && typeof settings === 'object' ? settings : {};
    var w = Math.max(EPS, toNumber(s.playerProxyW, 0.32));
    var d = Math.max(EPS, toNumber(s.playerProxyD, 0.24));
    return {
      x: toNumber(x, 0) - w * 0.5,
      y: toNumber(y, 0) - d * 0.5,
      w: w,
      d: d
    };
  }

  function makePlayerBodyBox(x, y, z, settings) {
    var fp = makePlayerFootprint(x, y, settings);
    return {
      x: fp.x,
      y: fp.y,
      z: toNumber(z, 0),
      w: fp.w,
      d: fp.d,
      h: Math.max(EPS, toNumber(settings && settings.playerHeightCells, 1.7))
    };
  }

  function overlapXY(a, b) {
    return a.x < boxValue(b, 'x', 0) + boxValue(b, 'w', 1) - EPS &&
      a.x + a.w > boxValue(b, 'x', 0) + EPS &&
      a.y < boxValue(b, 'y', 0) + boxValue(b, 'd', 1) - EPS &&
      a.y + a.d > boxValue(b, 'y', 0) + EPS;
  }

  function overlap3DStrict(a, b) {
    return a.x < boxValue(b, 'x', 0) + boxValue(b, 'w', 1) - EPS &&
      a.x + a.w > boxValue(b, 'x', 0) + EPS &&
      a.y < boxValue(b, 'y', 0) + boxValue(b, 'd', 1) - EPS &&
      a.y + a.d > boxValue(b, 'y', 0) + EPS &&
      a.z < boxValue(b, 'z', 0) + boxValue(b, 'h', 1) - EPS &&
      a.z + a.h > boxValue(b, 'z', 0) + EPS;
  }

  function boxTop(box) {
    return boxValue(box, 'z', 0) + boxValue(box, 'h', 1);
  }

  function resolveTargetGroundZ(args) {
    var safe = args && typeof args === 'object' ? args : {};
    var player = safe.player && typeof safe.player === 'object' ? safe.player : {};
    var worldBoxes = Array.isArray(safe.boxes) ? safe.boxes : [];
    var settings = safe.settings && typeof safe.settings === 'object' ? safe.settings : {};
    var currentZ = toNumber(player.z, 0);
    var maxStepUpCells = Math.max(0, toNumber(safe.maxStepUpCells, settings.playerMaxStepUpCells != null ? settings.playerMaxStepUpCells : 1));
    var fp = makePlayerFootprint(safe.targetX, safe.targetY, settings);
    var reachableTopLimit = currentZ + maxStepUpCells + EPS;
    var groundZ = 0;
    var supportBox = null;
    for (var i = 0; i < worldBoxes.length; i++) {
      var box = worldBoxes[i];
      if (!box || !overlapXY(fp, box)) continue;
      var top = boxTop(box);
      if (top > reachableTopLimit) continue;
      if (top >= groundZ - EPS) {
        groundZ = top;
        supportBox = box;
      }
    }
    return {
      targetGroundZ: groundZ,
      supportBox: supportBox,
      footprint: fp,
      currentZ: currentZ,
      maxStepUpCells: maxStepUpCells
    };
  }

  function resolvePlayerStepMove(args) {
    var safe = args && typeof args === 'object' ? args : {};
    var player = safe.player && typeof safe.player === 'object' ? safe.player : {};
    var settings = safe.settings && typeof safe.settings === 'object' ? safe.settings : {};
    var worldBoxes = Array.isArray(safe.boxes) ? safe.boxes : [];
    var targetX = toNumber(safe.targetX, player.x);
    var targetY = toNumber(safe.targetY, player.y);
    var gridW = toNumber(settings.gridW, settings.worldCols != null ? settings.worldCols : 0);
    var gridH = toNumber(settings.gridH, settings.worldRows != null ? settings.worldRows : 0);
    var ground = resolveTargetGroundZ({
      player: player,
      targetX: targetX,
      targetY: targetY,
      boxes: worldBoxes,
      settings: settings,
      maxStepUpCells: safe.maxStepUpCells
    });
    var body = makePlayerBodyBox(targetX, targetY, ground.targetGroundZ, settings);
    if (body.x < -EPS || body.y < -EPS || body.x + body.w > gridW + EPS || body.y + body.d > gridH + EPS) {
      return {
        allowed: false,
        mode: 'blocked',
        reason: 'world-bounds',
        fromZ: ground.currentZ,
        toZ: ground.targetGroundZ,
        targetX: targetX,
        targetY: targetY,
        bodyBox: body
      };
    }
    var deltaZ = ground.targetGroundZ - ground.currentZ;
    if (deltaZ > ground.maxStepUpCells + EPS) {
      return {
        allowed: false,
        mode: 'blocked',
        reason: 'step-too-high',
        fromZ: ground.currentZ,
        toZ: ground.targetGroundZ,
        deltaZ: deltaZ,
        targetX: targetX,
        targetY: targetY,
        bodyBox: body
      };
    }
    for (var i = 0; i < worldBoxes.length; i++) {
      var box = worldBoxes[i];
      if (!box) continue;
      if (overlap3DStrict(body, box)) {
        return {
          allowed: false,
          mode: 'blocked',
          reason: 'body-blocked',
          fromZ: ground.currentZ,
          toZ: ground.targetGroundZ,
          deltaZ: deltaZ,
          targetX: targetX,
          targetY: targetY,
          bodyBox: body,
          blockingBox: box
        };
      }
    }
    var mode = 'walk';
    if (deltaZ > EPS) mode = 'jump-up';
    else if (deltaZ < -EPS) mode = 'drop';
    return {
      allowed: true,
      mode: mode,
      reason: mode === 'jump-up' ? 'step-up-one-cell' : (mode === 'drop' ? 'step-down' : 'same-level'),
      fromZ: ground.currentZ,
      toZ: ground.targetGroundZ,
      deltaZ: deltaZ,
      targetX: targetX,
      targetY: targetY,
      bodyBox: body,
      supportBox: ground.supportBox
    };
  }

  function summarizeBoundary() {
    return {
      phase: PHASE,
      owner: OWNER,
      layer: 'core/domain',
      pureFunctions: ['makePlayerBodyBox', 'resolveTargetGroundZ', 'resolvePlayerStepMove'],
      notes: ['Rules are pure: no DOM, no renderer access, no logging side effects.']
    };
  }

  return {
    phase: PHASE,
    owner: OWNER,
    makePlayerBodyBox: makePlayerBodyBox,
    resolveTargetGroundZ: resolveTargetGroundZ,
    resolvePlayerStepMove: resolvePlayerStepMove,
    summarizeBoundary: summarizeBoundary
  };
})();
