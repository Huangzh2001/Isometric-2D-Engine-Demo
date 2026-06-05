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


  function rectPolygon(rect) {
    var x = toNumber(rect && rect.x, 0);
    var y = toNumber(rect && rect.y, 0);
    var w = Math.max(EPS, toNumber(rect && rect.w, 1));
    var d = Math.max(EPS, toNumber(rect && rect.d, 1));
    return [
      { x: x, y: y },
      { x: x + w, y: y },
      { x: x + w, y: y + d },
      { x: x, y: y + d }
    ];
  }

  function collisionPolygon(box) {
    return Array.isArray(box && box.collisionPolygon2d) && box.collisionPolygon2d.length >= 3
      ? box.collisionPolygon2d.map(function (pt) { return { x: toNumber(pt && pt.x, 0), y: toNumber(pt && pt.y, 0) }; })
      : rectPolygon(box || {});
  }

  function projectPolygon(axis, poly) {
    var min = Infinity;
    var max = -Infinity;
    for (var i = 0; i < poly.length; i++) {
      var value = poly[i].x * axis.x + poly[i].y * axis.y;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return { min: min, max: max };
  }

  function polygonsOverlap(polyA, polyB) {
    var polys = [polyA, polyB];
    for (var p = 0; p < polys.length; p++) {
      var poly = polys[p];
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i];
        var b = poly[(i + 1) % poly.length];
        var axis = { x: -(b.y - a.y), y: b.x - a.x };
        var len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
        if (len <= EPS) continue;
        axis.x /= len;
        axis.y /= len;
        var pa = projectPolygon(axis, polyA);
        var pb = projectPolygon(axis, polyB);
        if (pa.max <= pb.min + EPS || pb.max <= pa.min + EPS) return false;
      }
    }
    return true;
  }

  function xyCollisionOverlap(a, b) {
    if (!a || !b) return false;
    if (a.x >= boxValue(b, 'x', 0) + boxValue(b, 'w', 1) - EPS) return false;
    if (a.x + a.w <= boxValue(b, 'x', 0) + EPS) return false;
    if (a.y >= boxValue(b, 'y', 0) + boxValue(b, 'd', 1) - EPS) return false;
    if (a.y + a.d <= boxValue(b, 'y', 0) + EPS) return false;
    if (Array.isArray(b.collisionPolygon2d) || Array.isArray(a.collisionPolygon2d)) {
      return polygonsOverlap(collisionPolygon(a), collisionPolygon(b));
    }
    return true;
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
    return xyCollisionOverlap(a, b);
  }

  function overlap3DStrict(a, b) {
    return xyCollisionOverlap(a, b) &&
      a.z < boxValue(b, 'z', 0) + boxValue(b, 'h', 1) - EPS &&
      a.z + a.h > boxValue(b, 'z', 0) + EPS;
  }

  function boxTop(box) {
    return boxValue(box, 'z', 0) + boxValue(box, 'h', 1);
  }

  function clamp01(value) {
    var n = toNumber(value, 0);
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  }

  function normalizeSlopeDirection(direction) {
    var dir = String(direction || '').trim().toLowerCase();
    if (dir === 'west' || dir === 'north' || dir === 'south') return dir;
    return 'east';
  }

  function isOneCellSlopeBox(box) {
    if (!box || typeof box !== 'object') return false;
    return String(box.shapeKind || '').toLowerCase() === 'slope_1x1' ||
      String(box.prefabId || '').toLowerCase() === 'slope_1x1' ||
      String(box.kind || '').toLowerCase() === 'slope_1x1';
  }

  function sampleOneCellSlopeSurfaceZ(box, worldX, worldY) {
    var safe = box && typeof box === 'object' ? box : {};
    var x = boxValue(safe, 'x', 0);
    var y = boxValue(safe, 'y', 0);
    var z = boxValue(safe, 'z', 0);
    var w = Math.max(EPS, boxValue(safe, 'w', 1));
    var d = Math.max(EPS, boxValue(safe, 'd', 1));
    var h = Math.max(0, boxValue(safe, 'h', 1));
    var lx = clamp01((toNumber(worldX, x) - x) / w);
    var ly = clamp01((toNumber(worldY, y) - y) / d);
    var dir = normalizeSlopeDirection(safe.slopeDirection);
    var t = lx;
    if (dir === 'west') t = 1 - lx;
    else if (dir === 'south') t = ly;
    else if (dir === 'north') t = 1 - ly;
    return z + h * clamp01(t);
  }

  function pointInsideBoxXY(box, x, y) {
    if (!box) return false;
    var bx = boxValue(box, 'x', 0);
    var by = boxValue(box, 'y', 0);
    var bw = Math.max(EPS, boxValue(box, 'w', 1));
    var bd = Math.max(EPS, boxValue(box, 'd', 1));
    var px = toNumber(x, 0);
    var py = toNumber(y, 0);
    return px >= bx - EPS && px <= bx + bw + EPS && py >= by - EPS && py <= by + bd + EPS;
  }

  function getSlopeAccessAxisInfo(box) {
    var safe = box && typeof box === 'object' ? box : {};
    var x = boxValue(safe, 'x', 0);
    var y = boxValue(safe, 'y', 0);
    var w = Math.max(EPS, boxValue(safe, 'w', 1));
    var d = Math.max(EPS, boxValue(safe, 'd', 1));
    var dir = normalizeSlopeDirection(safe.slopeDirection);
    if (dir === 'west') return { dir: dir, axis: 'x', sign: -1, low: x + w, high: x, length: w, perpMin: y, perpMax: y + d };
    if (dir === 'south') return { dir: dir, axis: 'y', sign: 1, low: y, high: y + d, length: d, perpMin: x, perpMax: x + w };
    if (dir === 'north') return { dir: dir, axis: 'y', sign: -1, low: y + d, high: y, length: d, perpMin: x, perpMax: x + w };
    return { dir: 'east', axis: 'x', sign: 1, low: x, high: x + w, length: w, perpMin: y, perpMax: y + d };
  }

  function getAxisValue(info, worldX, worldY) {
    return info && info.axis === 'y' ? toNumber(worldY, 0) : toNumber(worldX, 0);
  }

  function getPerpValue(info, worldX, worldY) {
    return info && info.axis === 'y' ? toNumber(worldX, 0) : toNumber(worldY, 0);
  }

  function signedDistanceFromSlopeLowEdge(info, worldX, worldY) {
    return Number(info && info.sign || 1) * (getAxisValue(info, worldX, worldY) - Number(info && info.low || 0));
  }

  function pointWithinSlopePerpSpan(info, worldX, worldY, tolerance) {
    var t = Math.max(0, toNumber(tolerance, 0));
    var perp = getPerpValue(info, worldX, worldY);
    return perp >= Number(info && info.perpMin || 0) - t - EPS && perp <= Number(info && info.perpMax || 0) + t + EPS;
  }

  function getSlopeEntryBand(settings, info) {
    var s = settings && typeof settings === 'object' ? settings : {};
    var half = info && info.axis === 'y'
      ? Math.max(EPS, toNumber(s.playerProxyD, 0.24)) * 0.5
      : Math.max(EPS, toNumber(s.playerProxyW, 0.32)) * 0.5;
    return half + EPS;
  }

  function getSlopePerpTolerance(settings, info) {
    var s = settings && typeof settings === 'object' ? settings : {};
    var half = info && info.axis === 'y'
      ? Math.max(EPS, toNumber(s.playerProxyW, 0.32)) * 0.5
      : Math.max(EPS, toNumber(s.playerProxyD, 0.24)) * 0.5;
    return half + EPS;
  }

  function getSlopeSurfaceZTolerance(settings) {
    var s = settings && typeof settings === 'object' ? settings : {};
    return Math.max(0.02, toNumber(s.playerSlopeSurfaceToleranceCells, 0.18));
  }

  function isSlopeAnyEdgeEntryEnabled(settings) {
    var s = settings && typeof settings === 'object' ? settings : {};
    return s.playerStepOverEnabled !== false;
  }

  function getSlopeTransitionStepLimit(args, maxStepUpCells) {
    var safe = args && typeof args === 'object' ? args : {};
    var settings = safe.settings && typeof safe.settings === 'object' ? safe.settings : {};
    var explicit = safe.slopeMaxStepUpCells != null ? safe.slopeMaxStepUpCells : settings.playerSlopeMaxStepUpCells;
    var slopeLimit = toNumber(explicit, 0.25);
    if (!Number.isFinite(slopeLimit)) slopeLimit = 0.25;
    return Math.max(Math.max(0, toNumber(maxStepUpCells, 0)), Math.max(0, slopeLimit));
  }

  function isSlopeHighEdgeExit(box, player, targetX, targetY, settings) {
    if (!isCurrentlySlopeSupported(box, player, settings)) return false;
    var safePlayer = player && typeof player === 'object' ? player : {};
    var px = toNumber(safePlayer.x, targetX);
    var py = toNumber(safePlayer.y, targetY);
    var tx = toNumber(targetX, px);
    var ty = toNumber(targetY, py);
    var info = getSlopeAccessAxisInfo(box);
    var band = getSlopeEntryBand(settings, info);
    var currentSigned = signedDistanceFromSlopeLowEdge(info, px, py);
    var targetSigned = signedDistanceFromSlopeLowEdge(info, tx, ty);
    var currentAxis = getAxisValue(info, px, py);
    var targetAxis = getAxisValue(info, tx, ty);
    var uphillDelta = Number(info.sign || 1) * (targetAxis - currentAxis);
    return currentSigned >= -band - EPS &&
      currentSigned <= Number(info.length || 1) + band + EPS &&
      targetSigned >= Number(info.length || 1) - band - EPS &&
      uphillDelta >= -EPS &&
      pointWithinSlopePerpSpan(info, tx, ty, getSlopePerpTolerance(settings, info));
  }

  function isSlopeHighEdgeDescentEntry(box, player, targetX, targetY, settings) {
    var safePlayer = player && typeof player === 'object' ? player : {};
    var px = toNumber(safePlayer.x, targetX);
    var py = toNumber(safePlayer.y, targetY);
    var tx = toNumber(targetX, px);
    var ty = toNumber(targetY, py);

    var info = getSlopeAccessAxisInfo(box);
    var band = getSlopeEntryBand(settings, info);
    var currentSigned = signedDistanceFromSlopeLowEdge(info, px, py);
    var targetSigned = signedDistanceFromSlopeLowEdge(info, tx, ty);
    var currentAxis = getAxisValue(info, px, py);
    var targetAxis = getAxisValue(info, tx, ty);
    var downhillDelta = Number(info.sign || 1) * (targetAxis - currentAxis);
    var currentZ = toNumber(safePlayer.z, 0);
    var highZ = boxValue(box, 'z', 0) + boxValue(box, 'h', 1);

    // The player footprint touches the high edge before the player center is
    // inside the slope cell.  Treat that high-edge band as a valid descending
    // support only when the player is already at the slope-top height.
    return Math.abs(currentZ - highZ) <= getSlopeSurfaceZTolerance(settings) + EPS &&
      currentSigned >= Number(info.length || 1) - band - EPS &&
      targetSigned >= -band - EPS &&
      targetSigned <= Number(info.length || 1) + band + EPS &&
      downhillDelta <= EPS &&
      pointWithinSlopePerpSpan(info, tx, ty, getSlopePerpTolerance(settings, info));
  }

  function findCurrentSlopeSupport(worldBoxes, player, targetX, targetY, settings) {
    for (var i = 0; i < worldBoxes.length; i++) {
      var box = worldBoxes[i];
      if (!isOneCellSlopeBox(box)) continue;
      if (isSlopeHighEdgeExit(box, player, targetX, targetY, settings)) return box;
    }
    return null;
  }

  function isTopReachableFromSlopeHighExit(currentSlopeBox, top) {
    if (!currentSlopeBox) return false;
    var expected = boxValue(currentSlopeBox, 'z', 0) + boxValue(currentSlopeBox, 'h', 1);
    return Math.abs(toNumber(top, 0) - expected) <= 0.12 + EPS;
  }

  function isConnectedSlopeHighPlatform(slopeBox, box) {
    if (!slopeBox || !box || isOneCellSlopeBox(box)) return false;
    var highZ = boxValue(slopeBox, 'z', 0) + boxValue(slopeBox, 'h', 1);
    if (Math.abs(boxTop(box) - highZ) > 0.12 + EPS) return false;

    var info = getSlopeAccessAxisInfo(slopeBox);
    var bx = boxValue(box, 'x', 0);
    var by = boxValue(box, 'y', 0);
    var bw = Math.max(EPS, boxValue(box, 'w', 1));
    var bd = Math.max(EPS, boxValue(box, 'd', 1));
    var sx = boxValue(slopeBox, 'x', 0);
    var sy = boxValue(slopeBox, 'y', 0);
    var sw = Math.max(EPS, boxValue(slopeBox, 'w', 1));
    var sd = Math.max(EPS, boxValue(slopeBox, 'd', 1));

    if (info.axis === 'x') {
      var touchesEast = Math.abs(bx - (sx + sw)) <= 0.12 + EPS;
      var touchesWest = Math.abs((bx + bw) - sx) <= 0.12 + EPS;
      var expectedHigh = info.dir === 'east' ? touchesEast : touchesWest;
      var yOverlap = by < sy + sd - EPS && by + bd > sy + EPS;
      return expectedHigh && yOverlap;
    }

    var touchesSouth = Math.abs(by - (sy + sd)) <= 0.12 + EPS;
    var touchesNorth = Math.abs((by + bd) - sy) <= 0.12 + EPS;
    var expectedHighY = info.dir === 'south' ? touchesSouth : touchesNorth;
    var xOverlap = bx < sx + sw - EPS && bx + bw > sx + EPS;
    return expectedHighY && xOverlap;
  }

  function isCurrentlySlopeSupported(box, player, settings) {
    var safePlayer = player && typeof player === 'object' ? player : {};
    var px = toNumber(safePlayer.x, 0);
    var py = toNumber(safePlayer.y, 0);
    var currentFootprint = makePlayerFootprint(px, py, settings);
    if (!overlapXY(currentFootprint, box)) return false;

    var info = getSlopeAccessAxisInfo(box);
    var band = getSlopeEntryBand(settings, info);
    var perpTolerance = getSlopePerpTolerance(settings, info);
    var signed = signedDistanceFromSlopeLowEdge(info, px, py);
    if (signed < -band - EPS || signed > Number(info.length || 1) + band + EPS) return false;
    if (!pointWithinSlopePerpSpan(info, px, py, perpTolerance)) return false;

    var playerZ = toNumber(safePlayer.z, 0);
    var surfaceZ = sampleOneCellSlopeSurfaceZ(box, px, py);
    return Math.abs(playerZ - surfaceZ) <= getSlopeSurfaceZTolerance(settings) + EPS;
  }

  function isLowEdgeSlopeApproach(box, player, targetX, targetY, settings) {
    var safePlayer = player && typeof player === 'object' ? player : {};
    var px = toNumber(safePlayer.x, targetX);
    var py = toNumber(safePlayer.y, targetY);
    var tx = toNumber(targetX, px);
    var ty = toNumber(targetY, py);
    var info = getSlopeAccessAxisInfo(box);
    var band = getSlopeEntryBand(settings, info);
    var currentSigned = signedDistanceFromSlopeLowEdge(info, px, py);
    var targetSigned = signedDistanceFromSlopeLowEdge(info, tx, ty);
    var currentAxis = getAxisValue(info, px, py);
    var targetAxis = getAxisValue(info, tx, ty);
    var uphillDelta = Number(info.sign || 1) * (targetAxis - currentAxis);
    return currentSigned <= EPS &&
      targetSigned >= -band - EPS &&
      targetSigned <= Number(info.length || 1) + EPS &&
      uphillDelta >= -EPS &&
      pointWithinSlopePerpSpan(info, tx, ty, EPS);
  }

  function classifyOneCellSlopeAccess(box, player, targetX, targetY, footprint, settings) {
    var safePlayer = player && typeof player === 'object' ? player : {};
    var currentInside = pointInsideBoxXY(box, safePlayer.x, safePlayer.y);
    var targetInside = pointInsideBoxXY(box, targetX, targetY);
    var overlaps = overlapXY(footprint, box);
    var lowEdgeApproach = isLowEdgeSlopeApproach(box, safePlayer, targetX, targetY, settings);
    var highEdgeDescentEntry = isSlopeHighEdgeDescentEntry(box, safePlayer, targetX, targetY, settings);
    var currentSupported = isCurrentlySlopeSupported(box, safePlayer, settings);
    var anyEdgeEntryEnabled = isSlopeAnyEdgeEntryEnabled(settings);
    var supportCandidate = false;
    var invalidEntry = false;
    var reason = 'not-overlapping';

    if (!overlaps) {
      return { supportCandidate: false, invalidEntry: false, reason: reason, currentInside: currentInside, targetInside: targetInside, lowEdgeApproach: lowEdgeApproach, highEdgeDescentEntry: highEdgeDescentEntry, currentSupported: currentSupported, anyEdgeEntryEnabled: anyEdgeEntryEnabled };
    }

    if (currentInside) {
      supportCandidate = true;
      reason = targetInside ? 'on-slope' : 'leaving-slope';
    } else if (lowEdgeApproach) {
      supportCandidate = true;
      reason = targetInside ? 'enter-low-edge' : 'approach-low-edge';
    } else if (currentSupported) {
      supportCandidate = true;
      reason = targetInside ? 'continue-from-slope-contact' : 'leaving-slope-contact';
    } else if (highEdgeDescentEntry) {
      supportCandidate = true;
      reason = 'enter-high-edge-descent';
    } else if (anyEdgeEntryEnabled && targetInside) {
      supportCandidate = true;
      reason = 'enter-any-edge-step-enabled';
    } else if (anyEdgeEntryEnabled) {
      supportCandidate = true;
      reason = 'approach-any-edge-step-enabled';
    } else if (targetInside) {
      invalidEntry = true;
      reason = 'entry-not-low-edge';
    } else {
      invalidEntry = true;
      reason = 'slope-side-body-block';
    }

    return {
      supportCandidate: supportCandidate,
      invalidEntry: invalidEntry,
      reason: reason,
      currentInside: currentInside,
      targetInside: targetInside,
      lowEdgeApproach: lowEdgeApproach,
      highEdgeDescentEntry: highEdgeDescentEntry,
      currentSupported: currentSupported,
      anyEdgeEntryEnabled: anyEdgeEntryEnabled,
      direction: normalizeSlopeDirection(box && box.slopeDirection)
    };
  }


  function resolveTargetGroundZ(args) {
    var safe = args && typeof args === 'object' ? args : {};
    var player = safe.player && typeof safe.player === 'object' ? safe.player : {};
    var worldBoxes = Array.isArray(safe.boxes) ? safe.boxes : [];
    var settings = safe.settings && typeof safe.settings === 'object' ? safe.settings : {};
    var currentZ = toNumber(player.z, 0);
    var maxStepUpCells = Math.max(0, toNumber(safe.maxStepUpCells, settings.playerMaxStepUpCells != null ? settings.playerMaxStepUpCells : 1));
    var slopeStepLimit = getSlopeTransitionStepLimit(safe, maxStepUpCells);
    var fp = makePlayerFootprint(safe.targetX, safe.targetY, settings);
    var reachableTopLimit = currentZ + maxStepUpCells + EPS;
    var slopeReachableTopLimit = currentZ + slopeStepLimit + EPS;
    var currentSlopeHighExitBox = findCurrentSlopeSupport(worldBoxes, player, safe.targetX, safe.targetY, settings);
    var groundZ = 0;
    var supportBox = null;
    var slopeAccess = null;
    var preferredSlope = null;
    var blockedSlopeEntry = null;
    for (var i = 0; i < worldBoxes.length; i++) {
      var box = worldBoxes[i];
      if (!box || !overlapXY(fp, box)) continue;
      var isSlope = isOneCellSlopeBox(box);
      var access = null;
      if (isSlope) {
        access = classifyOneCellSlopeAccess(box, player, safe.targetX, safe.targetY, fp, settings);
        if (!access.supportCandidate) {
          if (access.invalidEntry && !blockedSlopeEntry) {
            blockedSlopeEntry = { box: box, access: access };
          }
          continue;
        }
      }
      var top = isSlope ? sampleOneCellSlopeSurfaceZ(box, safe.targetX, safe.targetY) : boxTop(box);
      var boxStepLimit = boxValue(box, 'stairMaxStepUpCells', maxStepUpCells);
      if (!Number.isFinite(boxStepLimit) || boxStepLimit <= 0) boxStepLimit = maxStepUpCells;
      var effectiveReachableTopLimit = currentZ + Math.min(maxStepUpCells, boxStepLimit) + EPS;
      var slopeTransitionReachable = isSlope
        ? top <= slopeReachableTopLimit
        : (isTopReachableFromSlopeHighExit(currentSlopeHighExitBox, top) && top <= slopeReachableTopLimit);
      if (!slopeTransitionReachable && (top > reachableTopLimit || top > effectiveReachableTopLimit)) continue;
      if (isSlope && access && access.supportCandidate && (access.targetInside || access.currentInside || access.currentSupported || access.highEdgeDescentEntry)) {
        if (!preferredSlope || top >= preferredSlope.top - EPS) {
          preferredSlope = { box: box, access: access, top: top };
        }
      }
      if (top >= groundZ - EPS) {
        groundZ = top;
        supportBox = box;
        slopeAccess = isSlope ? access : null;
      }
    }
    if (preferredSlope) {
      groundZ = preferredSlope.top;
      supportBox = preferredSlope.box;
      slopeAccess = preferredSlope.access;
    }
    return {
      targetGroundZ: groundZ,
      supportBox: supportBox,
      isSlopeSupport: isOneCellSlopeBox(supportBox),
      slopeAccess: slopeAccess,
      blockedSlopeEntry: blockedSlopeEntry,
      footprint: fp,
      currentZ: currentZ,
      maxStepUpCells: maxStepUpCells,
      slopeStepLimit: slopeStepLimit,
      currentSlopeHighExitBox: currentSlopeHighExitBox
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
      maxStepUpCells: safe.maxStepUpCells,
      slopeMaxStepUpCells: safe.slopeMaxStepUpCells
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
    var slopeTransitionStepAllowed = (ground.isSlopeSupport || !!ground.currentSlopeHighExitBox) && deltaZ > EPS && deltaZ <= ground.slopeStepLimit + EPS;
    if (deltaZ > ground.maxStepUpCells + EPS && !slopeTransitionStepAllowed) {
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
    if (ground.blockedSlopeEntry && ground.blockedSlopeEntry.access) {
      return {
        allowed: false,
        mode: 'blocked',
        reason: 'slope-entry-not-low-edge',
        slopeAccessReason: ground.blockedSlopeEntry.access.reason || null,
        slopeDirection: ground.blockedSlopeEntry.access.direction || null,
        fromZ: ground.currentZ,
        toZ: ground.targetGroundZ,
        deltaZ: deltaZ,
        targetX: targetX,
        targetY: targetY,
        bodyBox: body,
        blockingBox: ground.blockedSlopeEntry.box
      };
    }
    for (var i = 0; i < worldBoxes.length; i++) {
      var box = worldBoxes[i];
      if (!box) continue;
      if (ground.isSlopeSupport && box === ground.supportBox) continue;
      if (ground.isSlopeSupport && isConnectedSlopeHighPlatform(ground.supportBox, box)) continue;
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
    var slopeMotion = (ground.isSlopeSupport || !!ground.currentSlopeHighExitBox) && Math.abs(deltaZ) > EPS;
    if (slopeMotion) mode = 'slope-walk';
    else if (deltaZ > EPS) mode = 'jump-up';
    else if (deltaZ < -EPS) mode = 'drop';
    return {
      allowed: true,
      mode: mode,
      reason: mode === 'slope-walk' ? 'slope-surface' : (mode === 'jump-up' ? 'step-up-one-cell' : (mode === 'drop' ? 'step-down' : 'same-level')),
      fromZ: ground.currentZ,
      toZ: ground.targetGroundZ,
      deltaZ: deltaZ,
      targetX: targetX,
      targetY: targetY,
      bodyBox: body,
      supportBox: ground.supportBox,
      slopeSurface: (ground.isSlopeSupport || ground.currentSlopeHighExitBox) ? {
        prefabId: (ground.isSlopeSupport ? ground.supportBox : ground.currentSlopeHighExitBox) && (ground.isSlopeSupport ? ground.supportBox : ground.currentSlopeHighExitBox).prefabId || null,
        shapeKind: (ground.isSlopeSupport ? ground.supportBox : ground.currentSlopeHighExitBox) && (ground.isSlopeSupport ? ground.supportBox : ground.currentSlopeHighExitBox).shapeKind || null,
        slopeDirection: (ground.isSlopeSupport ? ground.supportBox : ground.currentSlopeHighExitBox) && (ground.isSlopeSupport ? ground.supportBox : ground.currentSlopeHighExitBox).slopeDirection || null,
        accessReason: ground.slopeAccess && ground.slopeAccess.reason || (ground.currentSlopeHighExitBox ? 'exit-high-edge' : null)
      } : null
    };
  }

  function summarizeBoundary() {
    return {
      phase: PHASE,
      owner: OWNER,
      layer: 'core/domain',
      pureFunctions: ['makePlayerBodyBox', 'sampleOneCellSlopeSurfaceZ', 'resolveTargetGroundZ', 'resolvePlayerStepMove', 'isCurrentlySlopeSupported', 'isSlopeHighEdgeExit', 'isSlopeHighEdgeDescentEntry', 'isConnectedSlopeHighPlatform'],
      notes: ['Rules are pure: no DOM, no renderer access, no logging side effects.']
    };
  }

  return {
    phase: PHASE,
    owner: OWNER,
    makePlayerBodyBox: makePlayerBodyBox,
    isOneCellSlopeBox: isOneCellSlopeBox,
    sampleOneCellSlopeSurfaceZ: sampleOneCellSlopeSurfaceZ,
    isCurrentlySlopeSupported: isCurrentlySlopeSupported,
    isSlopeHighEdgeExit: isSlopeHighEdgeExit,
    isSlopeHighEdgeDescentEntry: isSlopeHighEdgeDescentEntry,
    isConnectedSlopeHighPlatform: isConnectedSlopeHighPlatform,
    resolveTargetGroundZ: resolveTargetGroundZ,
    resolvePlayerStepMove: resolvePlayerStepMove,
    summarizeBoundary: summarizeBoundary
  };
})();
