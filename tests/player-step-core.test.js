const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}
const context = { console, Math, Number, String, Object, Array, JSON, Set, Map };
vm.createContext(context);
runFile(context, 'src/core/domain/player-step-core.js');
const api = context.__APP_CORE_PLAYER_STEP_CORE__;
assert(api && typeof api.resolvePlayerStepMove === 'function', 'player step core should expose resolvePlayerStepMove');
const settings = { gridW: 8, gridH: 8, playerProxyW: 0.32, playerProxyD: 0.24, playerHeightCells: 1.7, playerMaxStepUpCells: 1 };
const settingsNoStep = Object.assign({}, settings, { playerStepOverEnabled: false, playerMaxStepUpCells: 0 });
let result = api.resolvePlayerStepMove({
  player: { x: 1.1, y: 1.1, z: 0 },
  targetX: 2.5,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1 }],
  settings
});
assert(result.allowed, 'one-cell step should be allowed');
assert(result.mode === 'jump-up', 'one-cell step should trigger jump-up mode');
assert(result.toZ === 1, 'one-cell step should land on z=1');
result = api.resolvePlayerStepMove({
  player: { x: 1.1, y: 1.1, z: 0 },
  targetX: 4.5,
  targetY: 2.5,
  boxes: [{ x: 4, y: 2, z: 0, w: 1, d: 1, h: 2 }],
  settings
});
assert(!result.allowed, 'two-cell wall should be blocked');
assert(result.reason === 'body-blocked' || result.reason === 'step-too-high', 'two-cell wall should produce a height/body block reason');
result = api.resolvePlayerStepMove({
  player: { x: 2.5, y: 2.5, z: 1 },
  targetX: 1.5,
  targetY: 1.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1 }],
  settings
});
assert(result.allowed, 'step-down to ground should be allowed');
assert(result.mode === 'drop', 'step-down should be drop mode');
assert(result.toZ === 0, 'step-down should land on z=0');
result = api.resolvePlayerStepMove({
  player: { x: 1.1, y: 1.1, z: 0 },
  targetX: 2.5,
  targetY: 2.5,
  boxes: [
    { x: 2, y: 2, z: 0, w: 1, d: 1, h: 1 },
    { x: 2, y: 2, z: 1.5, w: 1, d: 1, h: 1 }
  ],
  settings
});
assert(!result.allowed, 'low overhead block should prevent step-up');
assert(result.reason === 'body-blocked', 'low overhead block should be a body-blocked case');
result = api.resolvePlayerStepMove({
  player: { x: 2.1, y: 2.5, z: 0.1 },
  targetX: 2.5,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings
});
assert(result.allowed, 'east slope should allow movement on its surface');
assert(result.mode === 'slope-walk', 'slope surface height change should not trigger jump animation');
assert(Math.abs(result.toZ - 0.5) < 1e-6, 'east slope height should be sampled from local x');
assert(result.reason === 'slope-surface', 'slope surface movement should be identified');

result = api.resolvePlayerStepMove({
  player: { x: 2.4, y: 2.5, z: 0.4 },
  targetX: 2.6,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings: Object.assign({}, settings, { playerMaxStepUpCells: 0.25 })
});
assert(result.allowed, 'small continuous slope step should be allowed under a low step limit');
assert(Math.abs(result.toZ - 0.6) < 1e-6, 'continuous slope move should update to sampled height');

result = api.resolvePlayerStepMove({
  player: { x: 2.1, y: 2.5, z: 0 },
  targetX: 2.8,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings: Object.assign({}, settings, { playerMaxStepUpCells: 0.25 })
});
assert(!result.allowed, 'large instantaneous slope height change should still be blocked by step/body rules');

assert(Math.abs(api.sampleOneCellSlopeSurfaceZ({ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, slopeDirection: 'west' }, 2.25, 2.5) - 0.75) < 1e-6, 'west slope should be high on the west side');
assert(Math.abs(api.sampleOneCellSlopeSurfaceZ({ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, slopeDirection: 'south' }, 2.5, 2.75) - 0.75) < 1e-6, 'south slope should be high on the south side');
assert(Math.abs(api.sampleOneCellSlopeSurfaceZ({ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, slopeDirection: 'north' }, 2.5, 2.25) - 0.75) < 1e-6, 'north slope should be high on the north side');

result = api.resolvePlayerStepMove({
  player: { x: 1.84, y: 2.5, z: 0 },
  targetX: 1.92,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings
});
assert(result.allowed, 'east slope should allow low-edge approach before the player center enters the cell');
assert(result.slopeSurface && result.slopeSurface.accessReason === 'approach-low-edge', 'low-edge approach should be classified as slope support');
assert(Math.abs(result.toZ - 0) < 1e-6, 'approach outside low edge should stay at low height');

result = api.resolvePlayerStepMove({
  player: { x: 1.98, y: 2.5, z: 0 },
  targetX: 2.08,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings
});
assert(result.allowed, 'east slope should allow entering from the low west edge');
assert(result.mode === 'slope-walk', 'entering from low edge should use slope-walk once height changes');
assert(result.slopeSurface && result.slopeSurface.accessReason === 'enter-low-edge', 'entering low edge should be explicit');

result = api.resolvePlayerStepMove({
  player: { x: 3.16, y: 2.5, z: 0 },
  targetX: 2.92,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings: settingsNoStep
});
assert(!result.allowed, 'east slope should block entry from its high east edge when block step-over is disabled');
assert(result.reason === 'slope-entry-not-low-edge', 'high-edge entry should be rejected as non-low-edge entry');

result = api.resolvePlayerStepMove({
  player: { x: 2.5, y: 1.84, z: 0 },
  targetX: 2.5,
  targetY: 1.92,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings: settingsNoStep
});
assert(!result.allowed, 'east slope should block entry from a side edge when block step-over is disabled');
assert(result.reason === 'slope-entry-not-low-edge', 'side entry should be rejected as non-low-edge entry');

result = api.resolvePlayerStepMove({
  player: { x: 3.16, y: 2.5, z: 0 },
  targetX: 3.08,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'west' }],
  settings
});
assert(result.allowed, 'west slope should allow low-edge approach from the east side');
assert(result.slopeSurface && result.slopeSurface.accessReason === 'approach-low-edge', 'west low edge should be its east edge');

result = api.resolvePlayerStepMove({
  player: { x: 2.5, y: 1.84, z: 0 },
  targetX: 2.5,
  targetY: 2.08,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'south' }],
  settings
});
assert(result.allowed, 'south slope should allow low-edge entry from the north side');

result = api.resolvePlayerStepMove({
  player: { x: 2.5, y: 3.16, z: 0 },
  targetX: 2.5,
  targetY: 2.92,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'south' }],
  settings: settingsNoStep
});
assert(!result.allowed, 'south slope should block entry from the high south edge when block step-over is disabled');


result = api.resolvePlayerStepMove({
  player: { x: 1.95, y: 2.5, z: 0 },
  targetX: 1.90,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings
});
assert(result.allowed, 'east slope should not trap the player while descending/leaving the low edge');
assert(result.slopeSurface && result.slopeSurface.accessReason === 'leaving-slope-contact', 'low-edge descent should be recognized as current slope contact');

result = api.resolvePlayerStepMove({
  player: { x: 3.05, y: 2.5, z: 1 },
  targetX: 3.10,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings
});
assert(result.allowed, 'east slope should not trap the player while leaving the high edge after climbing it');
assert(result.slopeSurface && result.slopeSurface.accessReason === 'leaving-slope-contact', 'high-edge exit should be recognized as current slope contact');

result = api.resolvePlayerStepMove({
  player: { x: 2.5, y: 1.84, z: 0 },
  targetX: 2.5,
  targetY: 2.08,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings: settingsNoStep
});
assert(!result.allowed, 'east slope should still reject a fresh side entry at floor height when block step-over is disabled');
assert(result.reason === 'slope-entry-not-low-edge', 'fresh side entry should remain direction-gated');



result = api.resolvePlayerStepMove({
  player: { x: 3.16, y: 2.5, z: 1 },
  targetX: 2.92,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings: settingsNoStep
});
assert(result.allowed, 'east slope should allow descending from the high edge when the player is already at slope-top height');
assert(result.mode === 'slope-walk', 'high-edge descent should use slope-walk mode');
assert(result.slopeSurface && result.slopeSurface.accessReason === 'enter-high-edge-descent', 'high-edge descent should have an explicit access reason');
assert(result.toZ < result.fromZ, 'high-edge descent should lower the player onto the slope surface');

result = api.resolvePlayerStepMove({
  player: { x: 3.20, y: 2.5, z: 1 },
  targetX: 3.08,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings: settingsNoStep
});
assert(result.allowed, 'east slope should allow high-edge descent approach before the player center enters the cell');
assert(result.slopeSurface && result.slopeSurface.accessReason === 'enter-high-edge-descent', 'high-edge descent approach should be explicit slope support');
assert(Math.abs(result.toZ - 1) < 1e-6, 'outside high-edge approach should stay at slope-top height');

result = api.resolvePlayerStepMove({
  player: { x: 3.20, y: 2.5, z: 0 },
  targetX: 3.08,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings: settingsNoStep
});
assert(!result.allowed, 'floor-height high-edge approach should still be blocked when block step-over is disabled');
assert(result.reason === 'slope-entry-not-low-edge', 'floor-height high-edge approach should remain direction-gated');

result = api.resolvePlayerStepMove({
  player: { x: 3.16, y: 2.5, z: 1 },
  targetX: 2.92,
  targetY: 2.5,
  boxes: [
    { x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' },
    { x: 3, y: 2, z: 0, w: 1, d: 1, h: 1 }
  ],
  settings: settingsNoStep
});
assert(result.allowed, 'descending from an upper platform onto the slope should not be blocked by the connected platform footprint overlap');
assert(result.mode === 'slope-walk', 'connected-platform high-edge descent should transition onto the slope surface');
assert(result.slopeSurface && result.slopeSurface.accessReason === 'enter-high-edge-descent', 'connected-platform descent should keep high-edge descent access');
assert(Math.abs(result.toZ - 0.92) < 1e-6, 'connected-platform descent should sample the slope surface, not stay on the platform top');

result = api.resolvePlayerStepMove({
  player: { x: 3.16, y: 2.5, z: 0 },
  targetX: 2.92,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings: settingsNoStep
});
assert(!result.allowed, 'east slope should still block high-edge entry from floor height when block step-over is disabled');
assert(result.reason === 'slope-entry-not-low-edge', 'floor-height high-edge entry should remain direction-gated');

result = api.resolvePlayerStepMove({
  player: { x: 3.16, y: 2.5, z: 0 },
  targetX: 2.92,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings
});
assert(result.allowed, 'east slope should allow high-edge entry when block step-over is enabled');
assert(result.slopeSurface && result.slopeSurface.accessReason === 'enter-any-edge-step-enabled', 'high-edge entry should be explicitly enabled by step-over');

result = api.resolvePlayerStepMove({
  player: { x: 2.5, y: 1.84, z: 0 },
  targetX: 2.5,
  targetY: 2.08,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings
});
assert(result.allowed, 'east slope should allow side entry when block step-over is enabled');

result = api.resolvePlayerStepMove({
  player: { x: 1.5, y: 2.5, z: 0 },
  targetX: 2.5,
  targetY: 2.5,
  boxes: [{ x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' }],
  settings: settingsNoStep,
  maxStepUpCells: 0,
  slopeMaxStepUpCells: 1
});
assert(result.allowed, 'path-sized low-edge slope transition should be allowed even when block step-over is disabled');
assert(result.mode === 'slope-walk', 'low-edge path transition should stay in slope-walk mode, not jump-up');
assert(Math.abs(result.toZ - 0.5) < 1e-6, 'path-sized low-edge transition should land at slope center height');

result = api.resolvePlayerStepMove({
  player: { x: 2.5, y: 2.5, z: 0.5 },
  targetX: 3.5,
  targetY: 2.5,
  boxes: [
    { x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, prefabId: 'slope_1x1', shapeKind: 'slope_1x1', slopeDirection: 'east' },
    { x: 3, y: 2, z: 0, w: 1, d: 1, h: 1 }
  ],
  settings: settingsNoStep,
  maxStepUpCells: 0,
  slopeMaxStepUpCells: 1
});
assert(result.allowed, 'path-sized high-edge slope exit should connect to the upper platform with block step-over disabled');
assert(Math.abs(result.toZ - 1) < 1e-6, 'high-edge slope exit should land on the platform top');

result = api.resolvePlayerStepMove({
  player: { x: 1.5, y: 2.5, z: 0 },
  targetX: 3.5,
  targetY: 2.5,
  boxes: [{ x: 3, y: 2, z: 0, w: 1, d: 1, h: 1 }],
  settings: settingsNoStep,
  maxStepUpCells: 0,
  slopeMaxStepUpCells: 1
});
assert(!result.allowed, 'direct upper-platform step should remain blocked when block step-over is disabled');

console.log('player-step-core.test.js: OK');
