const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/presentation/render/optimization/shared-render-optimization-pixi-dynamic-renderable-consumer.js'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');

for (const text of [source, bundle]) {
  assert(text.includes('__previewInstance'), 'preview rendering must support a transient instance');
  assert(text.includes('placement-preview-sprite'), 'preview rendering must create a sprite renderable');
  assert(text.includes('previewSpriteAdopted'), 'preview summary must report sprite adoption');
}

const context = {
  state: {
    container: { sortableChildren: true, children: [] },
    sprites: {},
    seenKeys: {},
    previewAdoptedThisFrame: false,
    previewBoxCountThisFrame: 0
  },
  maybeStart() {},
  coalesceVertexSquarePreviewPrimitives() { return []; },
  adoptRenderable(renderable) {
    context.lastRenderable = renderable;
    return renderable.kind === 'prefab-sprite' && !!renderable.__previewInstance;
  },
  makeRenderableKey(renderable) {
    return [renderable.id, renderable.instanceId, renderable.prefabId].join('|');
  },
  markContainerNeedsSort() {},
  finalizeScreenBounds(value) { return value; },
  emitWorldOwnerTrace() {},
  emitPreviewAlignmentPixiSnapshot() {},
  isVertexSquareTriBlockPrefabId() { return false; },
  emitStairPlaceTrace() {},
  getOrCreateGraphicsForKey() { return null; },
  coalesceVertexSquarePreviewPrimitivesUnused() { return []; },
  Object,
  Array,
  Number,
  String,
  Math,
  Date,
  console
};
vm.createContext(context);
vm.runInContext(extractFunction(bundle, 'drawPlacementPreview'), context, { filename: 'main-2:drawPlacementPreview' });
const result = context.drawPlacementPreview({
  prefabId: 'habbo_test_chair',
  origin: { x: 4, y: 5, z: 0 },
  rotation: 3,
  previewBoxes: [],
  previewPrimitives: [],
  valid: true
});
assert(result.ok === true, 'Habbo sprite preview should make the Pixi preview successful');
assert(result.previewSpriteAdopted === true, 'Pixi preview must report the Habbo sprite as adopted');
assert(context.lastRenderable.__previewInstance.x === 4 && context.lastRenderable.__previewInstance.y === 5, 'preview instance must use the preview world origin');
assert(context.lastRenderable.__previewInstance.rotation === 3, 'preview instance must use the selected placement facing');
assert(context.lastRenderable.alpha === 0.78, 'valid preview sprite must use preview alpha');
console.log('PASS habbo-pixi-placement-preview-sprite');
