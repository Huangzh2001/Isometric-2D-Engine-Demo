const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function extractFunction(source, name) {
  const start = source.indexOf(`  function ${name}`);
  const end = source.indexOf('\n  function createPrefabObject(options = {}) {', start);
  if (start < 0 || end < 0) throw new Error(`missing ${name}`);
  return source.slice(start, end).trim();
}


const source = fs.readFileSync('src/presentation/editor/editor-unified-v18.js', 'utf8');
const fn = extractFunction(source, 'buildTranslationInvariantVoxelAlignment');
const context = {
  state: {
    anchor: { x: 5, y: 4, z: 0 },
    artworkDocument: { width: 100, height: 80, metadata: { registrationPx: { x: 50, y: 60 } } },
    sprite: { facingTransforms: [
      { scale: 1, offsetX: 0, offsetY: 36 },
      { scale: 1, offsetX: -32, offsetY: 20 },
      { scale: 1, offsetX: 0, offsetY: 4 },
      { scale: 1, offsetX: 32, offsetY: 20 },
    ] }
  },
  normalizeFacing(value) { return Math.max(0, Math.min(3, Math.round(Number(value) || 0))); },
  ensureFacingTransforms: null,
  Number, Math, Array,
};
context.ensureFacingTransforms = () => context.state.sprite.facingTransforms;
vm.createContext(context);
vm.runInContext(`${fn}; this.result = buildTranslationInvariantVoxelAlignment([
  {x:4,y:3,z:0},{x:5,y:3,z:0},{x:4,y:4,z:0},{x:5,y:4,z:0}
]);`, context);
const result = JSON.parse(JSON.stringify(context.result));
assert.strictEqual(result.version, 'translation-invariant-registration-point-alignment-v2');
assert.deepStrictEqual(result.removedEditorTranslation, {x:4,y:3});
assert.deepStrictEqual(result.normalizedAnchorCell, {x:1,y:1,z:0});
for (const item of result.facingTransforms) {
  assert(Math.abs(item.anchorLocalEstimate.x - 1.5) < 1e-9, `facing ${item.facing} x`);
  assert(Math.abs(item.anchorLocalEstimate.y - 1.5) < 1e-9, `facing ${item.facing} y`);
}
console.log('translation-invariant-registration-math.test.js: OK');
