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
console.log('player-step-core.test.js: OK');
