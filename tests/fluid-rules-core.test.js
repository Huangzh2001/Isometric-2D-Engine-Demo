const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/core/domain/fluid-rules-core.js'), 'utf8');
const sandbox = { window: {}, Math, Number, String, Object, Array, JSON, console };
vm.runInNewContext(source, sandbox, { filename: 'fluid-rules-core.js' });
const api = sandbox.window.__FLUID_RULES_CORE__;
assert(api, 'fluid rules core should expose API');
assert.strictEqual(api.phase, 'FLUID-RULES-V1D-EMPTY-CELL-GRAVITY-FIRST', 'fluid rules should identify empty-cell gravity-first phase');

assert.strictEqual(api.quantizeRenderLevel(0.63, 10), 0.6, 'render level should quantize to nearest layer');
assert.strictEqual(api.quantizeRenderLevel(0.03, 10), 0.1, 'nonzero water should render at least one visible layer');
assert.strictEqual(api.liquidWaterLayerPrefabIdForAmount(0.63, 10), 'liquid_water_l10_0600', 'prefab id should match layer count and nearest amount');

const instances = [
  { instanceId: 'w0', prefabId: 'liquid_water_100', x: 0, y: 0, z: 0, waterAmount: 1, liquidType: 'water' }
];
const boxes = [
  { instanceId: 'w0', prefabId: 'liquid_water_100', x: 0, y: 0, z: 0, w: 1, d: 1, h: 1, shapeKind: 'liquid_water', waterAmount: 1, liquidDepth: 1, solid: false, collidable: false }
];

const result = api.simulateStep({ instances, boxes }, {
  layerCount: 10,
  flowRate: 0.2,
  maxFlowPerTick: 0.08,
  minDiff: 0.03,
  diagonalEnabled: true,
  diagonalWeight: 0.7,
  deleteBelow: 0.005
}, {
  allocateInstanceId: (() => { let i = 0; return () => `new_${++i}`; })()
});

assert(result && Array.isArray(result.instances), 'simulateStep should return next instances');
assert(result.stats.created > 0, 'single water cell should spread into empty neighbors');
const total = result.instances.filter(api.isLiquidInstance).reduce((acc, inst) => acc + Number(inst.waterAmount || 0), 0);
assert(Math.abs(total - 1) < 1e-6, 'water mass should be conserved');
assert(result.instances.some(inst => inst.instanceId === 'w0' && inst.waterAmount < 1), 'source water should decrease');
assert(result.instances.some(inst => inst.instanceId !== 'w0' && inst.waterAmount > 0), 'new neighbor water should be created');
assert(result.instances.filter(api.isLiquidInstance).every(inst => inst.renderWaterLevel != null), 'runtime water should carry quantized render level');

const blocked = api.simulateStep({ instances, boxes: boxes.concat([{ x: 1, y: 0, z: 0, w: 1, d: 1, h: 1, solid: true, prefabId: 'cube_1x1' }]) }, {
  layerCount: 10,
  flowRate: 0.2,
  maxFlowPerTick: 0.08,
  minDiff: 0.03,
  diagonalEnabled: false
}, {
  allocateInstanceId: (() => { let i = 0; return () => `blk_${++i}`; })()
});
assert(!blocked.instances.some(inst => inst.x === 1 && inst.y === 0 && inst.z === 0 && api.isLiquidInstance(inst)), 'solid blocker should prevent water creation in blocked cell');


// Diagonal corner-cut regression: water cannot pass diagonally through two solid orthogonal blockers.
const cornerCut = api.simulateStep({
  instances: [{ instanceId: 'wc', prefabId: 'liquid_water_100', x: 0, y: 0, z: 0, waterAmount: 1, liquidType: 'water' }],
  boxes: [
    { instanceId: 'wc', prefabId: 'liquid_water_100', x: 0, y: 0, z: 0, w: 1, d: 1, h: 1, shapeKind: 'liquid_water', waterAmount: 1, liquidDepth: 1 },
    { prefabId: 'cube_1x1', x: 1, y: 0, z: 0, w: 1, d: 1, h: 1 },
    { prefabId: 'cube_1x1', x: 0, y: 1, z: 0, w: 1, d: 1, h: 1 }
  ]
}, {
  layerCount: 10,
  flowRate: 0.2,
  maxFlowPerTick: 0.08,
  minDiff: 0.03,
  diagonalEnabled: true,
  diagonalWeight: 0.7,
  gravityEnabled: false
}, {
  allocateInstanceId: (() => { let i = 0; return () => `cc_${++i}`; })()
});
assert(!cornerCut.instances.some(inst => api.isLiquidInstance(inst) && inst.x === 1 && inst.y === 1 && inst.z === 0), 'diagonal flow should not cut through blocked corners');

// Gravity-first regression: water above empty lower cell should fall before horizontal spreading.
const gravity = api.simulateStep({
  instances: [{ instanceId: 'wg', prefabId: 'liquid_water_100', x: 2, y: 2, z: 1, waterAmount: 1, liquidType: 'water' }],
  boxes: [{ instanceId: 'wg', prefabId: 'liquid_water_100', x: 2, y: 2, z: 1, w: 1, d: 1, h: 1, shapeKind: 'liquid_water', waterAmount: 1, liquidDepth: 1 }]
}, {
  layerCount: 10,
  flowRate: 0.2,
  maxFlowPerTick: 0.08,
  minDiff: 0.03,
  gravityEnabled: true,
  gravityMaxFlowPerTick: 1,
  diagonalEnabled: false
}, {
  allocateInstanceId: (() => { let i = 0; return () => `g_${++i}`; })()
});
assert(gravity.instances.some(inst => api.isLiquidInstance(inst) && inst.x === 2 && inst.y === 2 && inst.z === 0 && inst.waterAmount > 0.99), 'gravity should move water into the lower cell');

// Gravity blocker regression: solid below blocks downward movement.
const gravityBlocked = api.simulateStep({
  instances: [{ instanceId: 'wgb', prefabId: 'liquid_water_100', x: 3, y: 3, z: 1, waterAmount: 1, liquidType: 'water' }],
  boxes: [
    { instanceId: 'wgb', prefabId: 'liquid_water_100', x: 3, y: 3, z: 1, w: 1, d: 1, h: 1, shapeKind: 'liquid_water', waterAmount: 1, liquidDepth: 1 },
    { prefabId: 'cube_1x1', x: 3, y: 3, z: 0, w: 1, d: 1, h: 1 }
  ]
}, {
  layerCount: 10,
  flowRate: 0.2,
  maxFlowPerTick: 0.08,
  minDiff: 0.03,
  gravityEnabled: true,
  gravityMaxFlowPerTick: 1,
  diagonalEnabled: false
}, {
  allocateInstanceId: (() => { let i = 0; return () => `gb_${++i}`; })()
});
assert(!gravityBlocked.instances.some(inst => api.isLiquidInstance(inst) && inst.x === 3 && inst.y === 3 && inst.z === 0), 'solid blocker below should prevent gravity fall');


// Blocker authority regression: the rule layer, not the renderer, is responsible
// for preventing water from entering a solid-occupied cell.
const sameCellBlockerTarget = api.simulateStep({
  instances: [{ instanceId: 'ws', prefabId: 'liquid_water_100', x: 0, y: 0, z: 0, waterAmount: 1, liquidType: 'water' }],
  boxes: [
    { instanceId: 'ws', prefabId: 'liquid_water_100', x: 0, y: 0, z: 0, w: 1, d: 1, h: 1, shapeKind: 'liquid_water', waterAmount: 1, liquidDepth: 1 },
    { prefabId: 'cube_1x1', x: 1, y: 0, z: 0, w: 1, d: 1, h: 1, solid: true }
  ]
}, {
  layerCount: 10,
  flowRate: 0.2,
  maxFlowPerTick: 0.08,
  minDiff: 0.03,
  gravityEnabled: false,
  diagonalEnabled: false
}, {
  allocateInstanceId: (() => { let i = 0; return () => `sc_${++i}`; })()
});
assert(!sameCellBlockerTarget.instances.some(inst => api.isLiquidInstance(inst) && inst.x === 1 && inst.y === 0 && inst.z === 0), 'rules core should not create water inside a solid-occupied target cell');


// Empty-cell-only flow regression: water may move to a different front/back cell,
// but never into a same-level cell occupied by a non-liquid object.
const horizontalOccupiedTarget = api.simulateStep({
  instances: [{ instanceId: 'weh', prefabId: 'liquid_water_100', x: 5, y: 5, z: 0, waterAmount: 1, liquidType: 'water' }],
  boxes: [
    { instanceId: 'weh', prefabId: 'liquid_water_100', x: 5, y: 5, z: 0, w: 1, d: 1, h: 1, shapeKind: 'liquid_water', waterAmount: 1, liquidDepth: 1 },
    { prefabId: 'cube_1x1', x: 6, y: 5, z: 0, w: 1, d: 1, h: 1, solid: true }
  ]
}, {
  layerCount: 10,
  flowRate: 0.2,
  maxFlowPerTick: 0.08,
  minDiff: 0.03,
  gravityEnabled: false,
  diagonalEnabled: false
}, {
  allocateInstanceId: (() => { let i = 0; return () => `eh_${++i}`; })()
});
assert(!horizontalOccupiedTarget.instances.some(inst => api.isLiquidInstance(inst) && inst.x === 6 && inst.y === 5 && inst.z === 0), 'same-level water should not be created inside an occupied object cell');

const downwardOccupiedTarget = api.simulateStep({
  instances: [{ instanceId: 'wed', prefabId: 'liquid_water_100', x: 7, y: 7, z: 1, waterAmount: 1, liquidType: 'water' }],
  boxes: [
    { instanceId: 'wed', prefabId: 'liquid_water_100', x: 7, y: 7, z: 1, w: 1, d: 1, h: 1, shapeKind: 'liquid_water', waterAmount: 1, liquidDepth: 1 },
    { prefabId: 'cube_1x1', x: 7, y: 7, z: 0, w: 1, d: 1, h: 1, solid: true }
  ]
}, {
  layerCount: 10,
  gravityEnabled: true,
  gravityMaxFlowPerTick: 1,
  diagonalEnabled: false
}, {
  allocateInstanceId: (() => { let i = 0; return () => `ed_${++i}`; })()
});
assert(!downwardOccupiedTarget.instances.some(inst => api.isLiquidInstance(inst) && inst.x === 7 && inst.y === 7 && inst.z === 0), 'gravity should not create water inside an occupied lower object cell');

console.log('fluid-rules-core.test.js PASS');
