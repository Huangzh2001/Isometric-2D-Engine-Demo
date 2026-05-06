const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'renderer', 'canvas2d-renderer.js'), 'utf8');
const ownerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'renderer', 'canvas2d-static-bitmap-run-cache.js'), 'utf8');
const orderOwnerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'renderer', 'canvas2d-renderable-order-draw.js'), 'utf8');

assert(rendererSource.includes('requireCanvas2dStaticBitmapRunCacheApi'), 'renderer should delegate static bitmap run reuse to owner');
assert(ownerSource.includes('buildStaticPacketRunReuseKey'), 'owner should derive a zoom-stable reuse key for static bitmap runs');
assert(ownerSource.includes('shouldUseStaticBitmapRunInteractionReuse'), 'owner should gate static bitmap run reuse by camera interaction type');
assert(ownerSource.includes("getActiveCameraInteractionType(deps) === 'zoom'"), 'static bitmap run reuse should be limited to zoom interactions');
assert(ownerSource.includes("drawStaticPacketRunBitmapEntry(deps, reuseEntry, meta, stats, 'interaction-reuse')"), 'owner should draw reusable bitmap runs during zoom before rebuilding geometry');
assert(ownerSource.includes('registerStaticPacketRunBitmapEntry(adapterApi, reuseKey, signature, entry)'), 'owner should register newly built bitmap runs for later zoom reuse');
assert(orderOwnerSource.includes('staticBitmapRunInteractionReuseCount'), 'draw-loop owner should expose zoom interaction reuse counters');

console.log('zoom-static-bitmap-run-reuse.test.js: OK');
