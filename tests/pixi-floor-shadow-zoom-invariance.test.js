const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const root = path.join(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');

function functionBody(name, nextName) {
  const start = bundle.indexOf(`function ${name}(`);
  const end = bundle.indexOf(`function ${nextName}(`, start + 1);
  assert(start >= 0 && end > start, `missing runtime function ${name}`);
  return bundle.slice(start, end);
}

const worldSignature = functionBody('floorReceiverShadowWorldCacheSignature', 'resetFloorReceiverShadowOverlayCache');
assert(worldSignature.includes('floorReceiverWorldOverlayCacheV2WorldInvariant'),
  'world-space floor shadow cache should use the zoom-invariant signature version');
['tileW', 'tileH', 'zoom', 'worldDisplayScale', 'originX', 'originY'].forEach((field) => {
  assert(!worldSignature.includes(`settings.${field}`) && !worldSignature.includes(`settings&&settings.${field}`),
    `world-space shadow cache must not depend on projection field ${field}`);
});
assert(worldSignature.includes('floorReceiverShadowLightsSignature()'), 'world cache should still depend on lights');
assert(worldSignature.includes('floorReceiverShadowBoxesSignature()'), 'world cache should still depend on casters');

const worldContext = {
  global: { lightState: { enabled: true, showShadows: true, shadowAlpha: 0.45, shadowOpacityScale: 1.2, shadowInfluenceThreshold: 0.02, shadowCasterSource: 'legacy' } },
  roundFloorShadowSignatureNumber(value, digits) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    const factor = Math.pow(10, digits == null ? 3 : digits);
    return Math.round(n * factor) / factor;
  },
  floorReceiverShadowLightsSignature() { return 'light-world-state'; },
  floorReceiverShadowBoxesSignature() { return 'caster-world-state'; },
};
vm.createContext(worldContext);
vm.runInContext(worldSignature, worldContext);
const sigAtZoom1 = worldContext.floorReceiverShadowWorldCacheSignature(
  { tileW: 80, tileH: 40, zoom: 1, worldDisplayScale: 1, originX: 200, originY: 100 }, 20, 20
);
const sigAtZoom2 = worldContext.floorReceiverShadowWorldCacheSignature(
  { tileW: 160, tileH: 80, zoom: 2, worldDisplayScale: 2, originX: 500, originY: 250 }, 20, 20
);
assert(sigAtZoom1 === sigAtZoom2,
  'changing only projection/zoom settings must not alter world-space floor shadow geometry signature');

const graphicsSignature = functionBody('makePixiFloorReceiverShadowGraphicsSignature', 'makePixiFloorWorldGraphicsSignature');
['settings.tileW', 'settings.tileH', 'settings.worldDisplayScale', 'settings.zoom'].forEach((token) => {
  assert(graphicsSignature.includes(token), `screen graphics cache should still rebuild for ${token}`);
});

console.log('PASS pixi-floor-shadow-zoom-invariance');
