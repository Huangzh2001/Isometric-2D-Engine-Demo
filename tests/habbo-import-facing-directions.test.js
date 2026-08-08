const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractFunction(source, name) {
  const needle = `function ${name}`;
  const start = source.indexOf(needle);
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
const itemFacingSource = fs.readFileSync(path.join(root, 'src/core/domain/item-facing-core.js'), 'utf8');
const stateSource = fs.readFileSync(path.join(root, 'src/infrastructure/legacy/state.js'), 'utf8');
const rendererSource = fs.readFileSync(path.join(root, 'src/presentation/render/sprites/habbo-composite-renderer.js'), 'utf8');
const loggingSource = fs.readFileSync(path.join(root, 'src/infrastructure/logging/logging.js'), 'utf8');

const coreContext = {
  window: { __APP_NAMESPACE: { bind() {} } },
  console,
  Math,
  Number,
  String,
  Object,
  Array,
  JSON
};
vm.createContext(coreContext);
vm.runInContext(itemFacingSource, coreContext, { filename: 'item-facing-core.js' });
const facingApi = coreContext.window.__ITEM_FACING_CORE__;

function runBuilder(sourceDirections) {
  const context = {
    window: { __ITEM_FACING_CORE__: facingApi },
    console,
    Math,
    Number,
    String,
    Object,
    Array,
    JSON,
    cloneJsonSafe(value) { return JSON.parse(JSON.stringify(value)); },
    chooseHabboPreferredVisualSize() { return 64; },
    chooseHabboVisualization() {
      return {
        size: 64,
        directions: sourceDirections.slice(),
        layerCount: 0,
        layers: { 0: { x: 0, y: 0, z: 0, alpha: 255, ink: '' } }
      };
    },
    getHabboVisualizationState() { return 0; },
    getHabboLayerLetter() { return 'a'; },
    getHabboAnimationFrameForLayer() { return 0; },
    chooseHabboAssetForLayer(meta, letter, direction) {
      return {
        name: `asset_${direction}`,
        kind: 'body',
        layerId: letter,
        size: 64,
        x: 0,
        y: 0,
        flipH: false,
        direction
      };
    },
    resolveHabboLayerImage(bitmaps, asset) {
      return { dataUrl: `data:${asset.name}`, canvas: null, width: 32, height: 48 };
    },
    pushHabboDebug() {},
    habboTrace() {}
  };
  vm.createContext(context);
  vm.runInContext(extractFunction(stateSource, 'getHabboFacingPlanForMeta'), context);
  vm.runInContext(extractFunction(stateSource, 'buildHabboLayerDirectionsFromBitmaps'), context);
  const meta = {
    type: 'fixture',
    visualDirections: sourceDirections.slice(),
    visualizationInfo: { sizes: { 64: {} } }
  };
  const result = context.buildHabboLayerDirectionsFromBitmaps(meta, {});
  return { result, plan: meta.habboFacingPlan };
}

const one = runBuilder([2]);
assert(Object.keys(one.result).join(',') === '0', 'one source direction must build exactly one native payload');
assert(one.plan.strategy === 'single-mirror', 'one source direction must be marked single-mirror');
assert(one.result['0'][0].direction === 2, 'one direction payload must retain its Habbo source direction');
assert(one.plan.directionMap.map(entry => entry.mirrorX).join(',') === 'false,true,false,true', 'one source direction must alternate original and mirror');

const two = runBuilder([0, 2]);
assert(Object.keys(two.result).join(',') === '0,1', 'two source directions must build two native payloads');
assert(two.plan.strategy === 'two-mirror', 'two source directions must be marked two-mirror');
assert(two.result['0'][0].direction === 0 && two.result['1'][0].direction === 2, 'two payloads must retain both Habbo source directions');

const four = runBuilder([0, 2, 4, 6]);
assert(Object.keys(four.result).join(',') === '0,1,2,3', 'four source directions must build four native payloads');
assert(four.plan.strategy === 'four-native', 'four source directions must be marked four-native');
assert(
  [0, 1, 2, 3].map(key => four.result[String(key)][0].direction).join(',') === '0,2,4,6',
  'four logical keys must map to four Habbo source directions'
);

function renderMatrix(plan, layerDirections) {
  const rendererEvents = [];
  const context = {
    getItemFacingCoreApi() { return facingApi; },
    rotKeyForSprite(rotation) { return String(((Number(rotation) % 4) + 4) % 4); },
    habboSpriteDrawDebugOnce: new Set(),
    pushHabboDebug(event, payload) { rendererEvents.push({ event, payload }); },
    Object,
    String,
    Number,
    Array,
    Math
  };
  vm.createContext(context);
  vm.runInContext(extractFunction(rendererSource, 'getHabboLayerConfigList'), context);
  const prefab = {
    id: `fixture_${plan.strategy}`,
    kind: 'habbo_import',
    w: 1,
    d: 2,
    h: 1,
    habboLayerDirections: layerDirections,
    habboMeta: {
      generatedFacingStrategy: plan.strategy,
      sourceDirectionCount: plan.sourceDirectionCount,
      sourceVisualDirections: plan.sourceDirections,
      selectedSourceDirections: plan.selectedSourceDirections,
      directionMap: plan.directionMap
    }
  };
  const layers = [0, 1, 2, 3].map(rotation => context.getHabboLayerConfigList(prefab, rotation));
  return { prefab, layers, rendererEvents };
}

const oneRender = renderMatrix(one.plan, one.result);
assert(oneRender.layers.every(layers => Array.isArray(layers) && layers.length === 1), 'single-view Habbo must render in all four rotations');
assert(oneRender.layers.map(layers => layers[0].flipX).join(',') === 'false,true,false,true', 'single-view Habbo must alternate native and mirrored layers');
assert(oneRender.rendererEvents.filter(entry => entry.event === 'habbo-facing:resolved').length === 4, 'single-view render must log each logical rotation once');
assert(facingApi.getRotatedFootprint(oneRender.prefab, 0).w === 1 && facingApi.getRotatedFootprint(oneRender.prefab, 0).d === 2, 'rotation 0 footprint must remain 1x2');
assert(facingApi.getRotatedFootprint(oneRender.prefab, 1).w === 2 && facingApi.getRotatedFootprint(oneRender.prefab, 1).d === 1, 'rotation 1 footprint must become 2x1');

const twoRender = renderMatrix(two.plan, two.result);
assert(twoRender.layers.every(layers => Array.isArray(layers) && layers.length === 1), 'two-view Habbo must render in all four rotations');
assert(twoRender.layers.map(layers => layers[0].direction).join(',') === '0,2,0,2', 'two-view Habbo must reuse the matching native source direction');
assert(twoRender.layers.map(layers => layers[0].flipX).join(',') === 'false,false,true,true', 'two-view Habbo must mirror the two opposite logical rotations');

const fourRender = renderMatrix(four.plan, four.result);
assert(fourRender.layers.every(layers => Array.isArray(layers) && layers.length === 1), 'four-view Habbo must render in all four rotations');
assert(fourRender.layers.map(layers => layers[0].direction).join(',') === '0,2,4,6', 'four-view Habbo must use four native source directions');
assert(fourRender.layers.every(layers => layers[0].flipX === false), 'four-view Habbo must not add generated mirrors');

assert(loggingSource.includes("format: 'habbo-rotation-diagnostics-v2'"), 'Habbo debug export must use the rotation diagnostics v2 format');
assert(loggingSource.includes("a.download = 'habbo-rotation-debug-'"), 'Habbo debug export must use the rotation-specific filename');

console.log('habbo-import-facing-directions.test.js: OK');
