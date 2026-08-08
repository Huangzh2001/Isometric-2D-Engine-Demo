const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('src/presentation/editor/editor-unified-v18.js', 'utf8');
const start = source.indexOf("  const VOXEL_FACING_NAMES");
const end = source.indexOf("  function artworkFacingDataUrl", start);
if (start < 0 || end < 0) throw new Error('transform helper block not found');
const block = source.slice(start, end);
const context = {
  state: {
    activeFacing: 1,
    sprite: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      sourceFacing: 1,
      flipX: false,
      flipY: false,
      facingTransforms: [
        null,
        { scale: 1.25, offsetPx: { x: 7, y: -3 }, sourceFacing: 3, flipX: true, flipY: false },
        null,
        null,
      ],
    },
  },
};
vm.createContext(context);
vm.runInContext(block + `\nthis.__testApi={normalizeFacingTransform,ensureFacingTransforms,restoreFacingTransform,persistActiveFacingTransform,defaultFacingTransform,freshFacingTransform};`, context);
const api = context.__testApi;
api.restoreFacingTransform(1, api.freshFacingTransform(1));
if (context.state.sprite.sourceFacing !== 3) throw new Error('source facing was not restored');
if (!context.state.sprite.flipX || context.state.sprite.flipY) throw new Error('mirror flags were not restored');
if (context.state.sprite.offsetX !== 7 || context.state.sprite.offsetY !== -3) throw new Error('offsets were not restored');
api.persistActiveFacingTransform();
const saved = context.state.sprite.facingTransforms[1];
if (saved.sourceFacing !== 3 || !saved.flipX || saved.flipY) throw new Error('per-facing mirror/source was not persisted');
const migrated = api.normalizeFacingTransform({ scale: 2, offsetPx: { x: 4, y: 5 } }, 2, api.freshFacingTransform(2));
if (migrated.sourceFacing !== 2 || migrated.flipX || migrated.flipY) throw new Error('old transform migration defaults are incorrect');
console.log('voxel-facing-transform-model-runtime.test.js: OK');
