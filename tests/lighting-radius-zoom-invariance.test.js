const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const root = path.join(__dirname, '..');
const logicSource = fs.readFileSync(path.join(root, 'src/presentation/render/logic.js'), 'utf8');
const main1 = fs.readFileSync(path.join(root, 'dist/bundles/main-1.bundle.js'), 'utf8');
const main2 = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');

function extract(source, startToken, endToken, from = 0) {
  const start = source.indexOf(startToken, from);
  const end = source.indexOf(endToken, start + startToken.length);
  assert(start >= 0 && end > start, `unable to extract ${startToken}`);
  return { body: source.slice(start, end), end };
}

const sourceBlock = extract(logicSource, 'function getCanonicalLightingTileWidth()', 'function distanceAttenuation(').body;
const sourceContext = { settings: { tileW: 80, worldDisplayScale: 1 }, BASE_TILE_W: 80, Number, Math };
vm.createContext(sourceContext);
vm.runInContext(sourceBlock, sourceContext);
const sourceRadius1 = sourceContext.worldRadiusFromPixels(520);
sourceContext.settings.tileW = 160;
sourceContext.settings.worldDisplayScale = 2;
const sourceRadius2 = sourceContext.worldRadiusFromPixels(520);
assert(Math.abs(sourceRadius1 - sourceRadius2) < 1e-9,
  'legacy floor/material light radius should not change when display zoom doubles');

const main1Block = extract(main1, 'function getCanonicalLightingTileWidth()', 'function distanceAttenuation(').body;
const main1Context = { settings: { tileW: 80, worldDisplayScale: 1 }, BASE_TILE_W: 80, Number, Math };
vm.createContext(main1Context);
vm.runInContext(main1Block, main1Context);
const runtimeRadius1 = main1Context.worldRadiusFromPixels(520);
main1Context.settings.tileW = 160;
main1Context.settings.worldDisplayScale = 2;
const runtimeRadius2 = main1Context.worldRadiusFromPixels(520);
assert(Math.abs(runtimeRadius1 - runtimeRadius2) < 1e-9,
  'main-1 runtime floor light radius should be zoom invariant');

let cursor = 0;
let runtimeFunctionCount = 0;
while (true) {
  const start = main2.indexOf('function getCanonicalLightingTileWidth(settings)', cursor);
  if (start < 0) break;
  const end = main2.indexOf('function buildLightWorldBounds(', start);
  assert(end > start, 'main-2 lighting radius block should terminate before buildLightWorldBounds');
  const block = main2.slice(start, end);
  const context = {
    Number,
    Math,
    toNumber(value, fallback) {
      const n = Number(value);
      return Number.isFinite(n) ? n : Number(fallback || 0);
    }
  };
  vm.createContext(context);
  vm.runInContext(block, context);
  const core = {
    getLightRadiusWorld(light, options) {
      return Number(light.radius || 0) / Math.max(1, Number(options.tileW || 1));
    }
  };
  const light = { radius: 520 };
  const r1 = context.getLightRadiusWorld(light, { tileW: 80, worldDisplayScale: 1 }, core);
  const r2 = context.getLightRadiusWorld(light, { tileW: 160, worldDisplayScale: 2 }, core);
  assert(Math.abs(r1 - r2) < 1e-9,
    'main-2 direct-light/shadow radius conversion should use canonical unzoomed tile width');
  runtimeFunctionCount += 1;
  cursor = end;
}
assert(runtimeFunctionCount === 2,
  'both Pixi object-light and receiver-shadow modules should use zoom-invariant light radius conversion');

console.log('PASS lighting-radius-zoom-invariance');
