const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'START_V18_ONLY.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'src/presentation/editor/editor-unified-v18.js'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'dist/bundles/editor-2.bundle.js'), 'utf8');
function assert(condition, message) { if (!condition) throw new Error(message); }
for (const id of ['spriteSourceFacing','spriteFlipX','spriteFlipY','resetFacingImageTransform','copyFacingImageTransform','pasteFacingImageTransform']) {
  assert(html.includes(`id="${id}"`), `missing ${id} control`);
}
assert(source.includes('sourceFacing: normalizeFacing'), 'source facing is not serialized');
assert(source.includes('flipX: !!transform.flipX'), 'horizontal mirror is not serialized per facing');
assert(source.includes('flipY: !!transform.flipY'), 'vertical mirror is not serialized per facing');
assert(source.includes("ctx.scale(state.sprite.flipX ? -1 : 1, state.sprite.flipY ? -1 : 1)"), 'preview does not render mirrors');
assert(source.includes("artworkFacingDataUrl(sourceFacing)"), 'preview cannot choose a different source direction');
assert(source.includes("registrationDeltaX"), 'registration math is not mirror-aware');
assert(source.includes("registrationDeltaY"), 'vertical registration math is not mirror-aware');
assert(bundle.includes("20260807-material-states-v1"), 'runtime bundle was not rebuilt');
assert(bundle.includes("spriteSourceFacing"), 'runtime bundle lacks source facing control logic');
console.log('voxel-image-source-mirror-controls.test.js: OK');
