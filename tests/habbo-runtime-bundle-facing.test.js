const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractFunction(source, name) {
  const needles = [`function ${name}(`, `function ${name} (`];
  let start = -1;
  for (const needle of needles) {
    start = source.indexOf(needle);
    if (start >= 0) break;
  }
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1] || '';
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

const root = path.join(__dirname, '..');
const main1 = fs.readFileSync(path.join(root, 'dist/bundles/main-1.bundle.js'), 'utf8');
const main2 = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');

const ownerNeedle = "var OWNER='src/core/domain/item-facing-core.js'";
const ownerIndex = main1.indexOf(ownerNeedle);
assert(ownerIndex >= 0, 'main-1 must contain the item-facing core owner');
const iifeStart = main1.lastIndexOf('(function()', ownerIndex);
const nextIife = main1.indexOf(';(function(', ownerIndex);
assert(iifeStart >= 0 && nextIife > ownerIndex, 'item-facing core IIFE boundaries must exist in main-1');
const itemFacingBundleSource = main1.slice(iifeStart, nextIife + 1);
const context = {
  window: { __APP_NAMESPACE: { bind() {} } },
  console,
  Math,
  Number,
  String,
  Object,
  Array,
  JSON,
  parseInt
};
vm.createContext(context);
vm.runInContext(itemFacingBundleSource, context, { filename: 'main-1:item-facing-core' });
const api = context.window.__ITEM_FACING_CORE__;
assert(api && typeof api.buildHabboFacingPlan === 'function', 'runtime bundle must expose buildHabboFacingPlan');

const singlePlan = api.buildHabboFacingPlan([2]);
const singlePrefab = {
  id: 'bundle_single',
  kind: 'habbo_import',
  w: 1,
  d: 2,
  h: 1,
  habboLayerDirections: { '0': [{ name: 'body', direction: 2, flipX: false }] },
  habboMeta: {
    generatedFacingStrategy: singlePlan.strategy,
    sourceDirectionCount: singlePlan.sourceDirectionCount,
    sourceVisualDirections: singlePlan.sourceDirections,
    directionMap: singlePlan.directionMap
  }
};
const matrix = [0, 1, 2, 3].map(rotation => api.resolveSpriteFacing(singlePrefab, rotation));
assert(matrix.map(entry => entry.directionKey).join(',') === '0,0,0,0', 'runtime bundle single-view must reuse direction key 0');
assert(matrix.map(entry => entry.mirrorX).join(',') === 'false,true,false,true', 'runtime bundle single-view must mirror odd rotations');
assert(api.getRotatedFootprint(singlePrefab, 0).w === 1 && api.getRotatedFootprint(singlePrefab, 0).d === 2, 'runtime bundle rotation 0 must keep 1x2 footprint');
assert(api.getRotatedFootprint(singlePrefab, 1).w === 2 && api.getRotatedFootprint(singlePrefab, 1).d === 1, 'runtime bundle rotation 1 must produce 2x1 footprint');

const rendererContext = {
  getItemFacingCoreApi() { return api; },
  rotKeyForSprite(rotation) { return String(((Number(rotation) % 4) + 4) % 4); },
  habboSpriteDrawDebugOnce: new Set(),
  pushHabboDebug() {},
  Object,
  String,
  Number,
  Array,
  Math
};
vm.createContext(rendererContext);
vm.runInContext(extractFunction(main2, 'getHabboLayerConfigList'), rendererContext, { filename: 'main-2:getHabboLayerConfigList' });
const layers = [0, 1, 2, 3].map(rotation => rendererContext.getHabboLayerConfigList(singlePrefab, rotation));
assert(layers.every(list => Array.isArray(list) && list.length === 1), 'runtime renderer must return layers for all four rotations');
assert(layers.map(list => list[0].flipX).join(',') === 'false,true,false,true', 'runtime renderer must apply generated mirrors');

assert(main1.includes("format:'habbo-rotation-diagnostics-v2'") || main1.includes("format: 'habbo-rotation-diagnostics-v2'"), 'runtime bundle must export rotation diagnostics v2');
assert(main1.includes('habbo-facing:import-plan'), 'runtime bundle must log the import facing plan');
assert(main2.includes('habbo-facing:resolved'), 'runtime renderer bundle must log resolved rotations');

console.log(JSON.stringify({
  status: 'PASS',
  runtimeSingleMatrix: matrix,
  runtimeLayerFlipX: layers.map(list => list[0].flipX)
}, null, 2));
