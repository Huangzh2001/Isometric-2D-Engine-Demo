const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function clean(value) {
  return JSON.parse(JSON.stringify(value));
}

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const coreSource = fs.readFileSync(path.join(__dirname, '..', 'src/core/domain/habbo-placement-core.js'), 'utf8');
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
const bindingsSource = fs.readFileSync(path.join(__dirname, '..', 'src/infrastructure/bootstrap/core-domain-bindings.js'), 'utf8');

const sandbox = { window: {}, Math, Number, String, Object, Array, parseInt, console };
vm.runInNewContext(coreSource, sandbox, { filename: 'habbo-placement-core.js' });

const api = sandbox.window.__HABBO_PLACEMENT_CORE__;
assert(api, 'habbo placement core should expose window.__HABBO_PLACEMENT_CORE__');
assert.strictEqual(sandbox.window.__APP_CORE_HABBO_PLACEMENT_CORE__, api, 'habbo placement core should expose app bootstrap handle');
assert.strictEqual(typeof api.getHabboPlacementShift, 'function', 'getHabboPlacementShift should be a core function');
assert.strictEqual(typeof api.getHabboLayerLocalBox, 'function', 'getHabboLayerLocalBox should be a core function');

assert(indexSource.includes('src/core/domain/habbo-placement-core.js'), 'index should load habbo placement core');
assert(indexSource.indexOf('src/core/domain/habbo-placement-core.js') < indexSource.indexOf('src/presentation/render/render.js'), 'habbo placement core must load before render.js');
assert(bindingsSource.includes('domain.habboPlacementCore'), 'bootstrap should bind habbo placement core into App.domain');
assert(!renderSource.includes('var dims = prefab && prefab.habboMeta && prefab.habboMeta.dimensions'), 'render.js should not re-own Habbo placement dimension logic');
assert(renderSource.includes('requireHabboPlacementCoreForRender'), 'render.js should delegate Habbo placement math through a thin wrapper');

const metrics = { tileW: 64, tileH: 32 };
const longNorthSouth = {
  kind: 'habbo_import',
  w: 1,
  d: 3,
  habboMeta: { visualization: 'furniture_static', dimensions: { x: 1, y: 3 } }
};
assert.deepStrictEqual(clean(api.getHabboPlacementShift(longNorthSouth, 0, metrics)), { x: -64, y: 0 }, '1x3 furniture_static should shift by one tile width at rotation 0');
assert.deepStrictEqual(clean(api.getHabboPlacementShift(longNorthSouth, 1, metrics)), { x: 0, y: 0 }, '1x3 furniture_static should not shift by depth at rotation 1');
assert.deepStrictEqual(clean(api.pixelShiftToCellShift({ x: -64, y: 0 }, metrics)), { x: -1, y: 1 }, 'pixel shift should snap onto isometric cell shift');
assert.deepStrictEqual(clean(api.cellShiftToPixelShift({ x: -1, y: 1 }, metrics)), { x: -64, y: 0 }, 'cell shift should round-trip to the snapped pixel shift');
assert.deepStrictEqual(clean(api.getHabboPlacementDecomposition(longNorthSouth, 0, metrics)), {
  rawShift: { x: -64, y: 0 },
  cellShift: { x: -1, y: 1 },
  residualShift: { x: 0, y: 0 }
}, 'placement decomposition should preserve raw/cell/residual components');

const roomOrigin = api.getHabboRoomOrigin(
  longNorthSouth,
  { x: 2, y: 4, z: 1 },
  { x: 1, y: 0, z: 2 },
  0,
  metrics,
  (x, y, z) => ({ x: x * 10 - y * 10, y: x + y - z }),
  { floorBaselineOffset: 20 }
);
assert.deepStrictEqual(clean(roomOrigin), { x: -10, y: 24 }, 'room origin should combine injected iso projection, residual shift, and floor baseline offset');

const layerBox = api.getHabboLayerLocalBox({ offsetPx: { x: -4, y: 8 }, regX: 1, regY: 2, propX: 3, propY: 4 }, 2, 10, 20);
assert.deepStrictEqual(clean(layerBox), {
  drawX: -8,
  drawY: 16,
  drawW: 20,
  drawH: 40,
  drawXMax: 12,
  regX: 1,
  regY: 2,
  propX: 3,
  propY: 4
}, 'layer local box should stay pure and scale offsets/sizes consistently');

console.log('habbo-placement-core.test.js: OK');
