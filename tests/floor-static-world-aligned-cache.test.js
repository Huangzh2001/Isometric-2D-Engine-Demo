const assert = require('assert');
const fs = require('fs');

const renderSource = fs.readFileSync('src/presentation/render/render.js', 'utf8');
const stateSource = fs.readFileSync('src/infrastructure/legacy/state.js', 'utf8');

assert(renderSource.includes('computeVisibleFloorChunkKeysForLayer'), 'floor should compute visible chunk keys explicitly');
assert(renderSource.includes('buildFloorChunkEntryForLayer'), 'floor should build chunk entries instead of redrawing the whole floor');
assert(renderSource.includes('floor-layer-static-chunk-composite'), 'floor should expose static-world-aligned composite branch names');
assert(renderSource.includes('floor-layer-static-chunk-composite-build-deferred'), 'floor should expose deferred visible-chunk build branch names');
assert(renderSource.includes("floorVersionTag: 'floor-static-chunk-v1'"), 'floor should stamp the new version tag into breakdown logs');

const floorSignatureStart = stateSource.indexOf('function floorLayerSignature() {');
assert(floorSignatureStart >= 0, 'floorLayerSignature definition should exist');
const floorSignatureEnd = stateSource.indexOf('function staticShadowLayerSignature()', floorSignatureStart);
assert(floorSignatureEnd > floorSignatureStart, 'floorLayerSignature block should be bounded by staticShadowLayerSignature');
const floorSignatureBody = stateSource.slice(floorSignatureStart, floorSignatureEnd);
assert(!floorSignatureBody.includes('cameraX: sigNum(camera.x)'), 'floor content signature should not include cameraX');
assert(!floorSignatureBody.includes('cameraY: sigNum(camera.y)'), 'floor content signature should not include cameraY');

console.log('floor-static-world-aligned-cache.test.js: OK');
