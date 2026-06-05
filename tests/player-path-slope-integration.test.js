const fs = require('fs');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function makeContext(overrides) {
  const context = {
    console,
    Math,
    Number,
    String,
    Object,
    Array,
    JSON,
    Set,
    Map,
    Date,
    performance: { now: () => 0 },
    settings: Object.assign({
      gridW: 6,
      gridH: 5,
      worldCols: 6,
      worldRows: 5,
      playerProxyW: 0.32,
      playerProxyD: 0.24,
      playerHeightCells: 1.7,
      playerMaxStepUpCells: 1,
      playerStepOverEnabled: false,
      playerClickMoveEnabled: true,
      playerPathAlgorithm: 'astar'
    }, overrides && overrides.settings || {}),
    player: Object.assign({ x: 1.5, y: 2.5, z: 0, r: 0.1, speed: 2, dir: 'down', walk: 0 }, overrides && overrides.player || {}),
    boxes: Array.isArray(overrides && overrides.boxes) ? overrides.boxes : [],
    keys: new Set(),
    SHOW_PLAYER: true,
    debugState: { frame: 999 },
    verboseLog: false,
    camera: { x: 0, y: 0 },
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    logRoute: () => {},
    detailLog: () => {},
    pushLog: () => {}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/core/domain/player-step-core.js', 'utf8'), context, { filename: 'src/core/domain/player-step-core.js' });
  vm.runInContext(fs.readFileSync('src/application/player/player.js', 'utf8'), context, { filename: 'src/application/player/player.js' });
  return context;
}

let context = makeContext({
  boxes: [{ x: 3, y: 2, z: 0, w: 1, d: 1, h: 1 }]
});
let result = context.findPlayerPathToCell(3, 2);
assert(!result.ok, 'pathfinding should not step directly onto a one-cell platform when block step-over is disabled');
assert(result.blockedReasons && (result.blockedReasons['step-too-high'] > 0 || result.blockedReasons['body-blocked'] > 0), 'direct platform route should be rejected by height/body clearance');

context = makeContext({
  boxes: [
    { x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' },
    { x: 3, y: 2, z: 0, w: 1, d: 1, h: 1 }
  ]
});
result = context.findPlayerPathToCell(3, 2);
assert(result.ok, 'pathfinding should use the slope as the route to the upper platform when block step-over is disabled');
assert(result.waypoints.length === 2, 'slope route should contain slope center and upper platform waypoints');
assert(result.waypoints[0].ix === 2 && result.waypoints[0].iy === 2, 'first waypoint should be the slope cell');
assert(result.waypoints[0].mode === 'slope-walk', 'slope waypoint should not be treated as jump-up');
assert(Math.abs(result.waypoints[0].z - 0.5) < 1e-6, 'slope waypoint should carry continuous slope height');
assert(result.waypoints[1].ix === 3 && result.waypoints[1].iy === 2, 'second waypoint should be the upper platform');
assert(result.waypoints[1].mode === 'slope-walk', 'high-edge slope exit should not be treated as a jump');
assert(Math.abs(result.waypoints[1].z - 1) < 1e-6, 'upper platform waypoint should land at z=1');

context = makeContext({
  player: { x: 2.5, y: 1.5, z: 0 },
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }]
});
result = context.resolvePlayerPathCellMove({ ix: 2, iy: 1, x: 2.5, y: 1.5, z: 0 }, 2, 2);
assert(!result.allowed, 'pathfinding neighbor expansion should not enter a slope from a side edge when block step-over is disabled');
assert(result.reason === 'slope-entry-not-low-edge', 'side slope neighbor expansion should be rejected by slope direction gate');

context = makeContext({
  settings: { playerStepOverEnabled: true, playerMaxStepUpCells: 1 },
  player: { x: 2.5, y: 1.5, z: 0 },
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }]
});
result = context.resolvePlayerPathCellMove({ ix: 2, iy: 1, x: 2.5, y: 1.5, z: 0 }, 2, 2);
assert(result.allowed, 'pathfinding neighbor expansion should allow slope side entry when block step-over is enabled');
assert(result.mode === 'slope-walk', 'step-enabled side slope entry should still use slope-walk mode');


context = makeContext({
  player: { x: 3.5, y: 2.5, z: 1 },
  boxes: [
    { x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' },
    { x: 3, y: 2, z: 0, w: 1, d: 1, h: 1 }
  ]
});
result = context.resolvePlayerPathCellMove({ ix: 3, iy: 2, x: 3.5, y: 2.5, z: 1 }, 2, 2);
assert(result.allowed, 'pathfinding should allow entering an east slope from the high edge when descending from an upper platform');
assert(result.mode === 'slope-walk', 'high-edge descent into a slope should use slope-walk mode');
assert(result.slopeSurface && result.slopeSurface.accessReason === 'enter-high-edge-descent', 'high-edge descent should not be classified as generic step-enabled entry');

result = context.findPlayerPathToCell(1, 2);
assert(result.ok, 'pathfinding should descend from an upper platform through the slope instead of routing around it');
assert(result.waypoints.length >= 2, 'descending route should include the slope and the lower floor target');
assert(result.waypoints[0].ix === 2 && result.waypoints[0].iy === 2, 'first descending waypoint should be the adjacent slope cell');
assert(result.waypoints[0].mode === 'slope-walk', 'first descending waypoint should be a slope-walk transition');
assert(Math.abs(result.waypoints[0].z - 0.5) < 1e-6, 'descending slope center should carry continuous half-height');

context = makeContext({
  player: { x: 3.2, y: 2.5, z: 1 },
  boxes: [
    { x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' },
    { x: 3, y: 2, z: 0, w: 1, d: 1, h: 1 }
  ]
});
result = context.resolvePlayerPathCellMove({ ix: 3, iy: 2, x: 3.2, y: 2.5, z: 1 }, 2, 2);
assert(result.allowed, 'pathfinding should allow a high-edge descent even when the player center starts near the platform edge');
assert(result.mode === 'slope-walk', 'edge-start high descent should use slope-walk mode');

context = makeContext({
  player: { x: 3.5, y: 2.5, z: 0 },
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }]
});
result = context.resolvePlayerPathCellMove({ ix: 3, iy: 2, x: 3.5, y: 2.5, z: 0 }, 2, 2);
assert(!result.allowed, 'pathfinding should still block high-edge slope entry from floor height when block step-over is disabled');
assert(result.reason === 'slope-entry-not-low-edge', 'floor-height high-edge entry should remain direction-gated');

console.log('player-path-slope-integration.test.js: OK');
