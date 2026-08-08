const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('src/presentation/editor/editor-unified-v18.js', 'utf8');
const bundle = fs.readFileSync('dist/bundles/editor-2.bundle.js', 'utf8');
for (const text of [source, bundle]) {
  assert(text.includes("translation-invariant-registration-point-alignment-v2"));
  assert(text.includes('registrationFromAnchorPx'));
  assert(text.includes('registrationFromFootprintOriginPx'));
  assert(text.includes('normalizedAnchorCell'));
  assert(text.includes('anchorLocalEstimate'));
  assert(text.includes('artwork.metadata.registrationPx'));
  assert(!text.includes("version: 'translation-invariant-image-voxel-alignment-v1'"));
}
console.log('translation-invariant-registration-alignment.test.js: OK');
