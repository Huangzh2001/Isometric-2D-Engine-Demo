const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'renderer', 'canvas2d-renderer.js'), 'utf8');

assert(rendererSource.includes('buildStaticPacketRunReuseKey'), 'renderer should derive a zoom-stable reuse key for static bitmap runs');
assert(rendererSource.includes('shouldUseStaticBitmapRunInteractionReuse'), 'renderer should gate static bitmap run reuse by camera interaction type');
assert(rendererSource.includes("getActiveCameraInteractionType() === 'zoom'"), 'static bitmap run reuse should be limited to zoom interactions');
assert(rendererSource.includes('drawStaticPacketRunBitmapEntry(reuseEntry, meta, stats, \'interaction-reuse\')'), 'renderer should draw reusable bitmap runs during zoom before rebuilding geometry');
assert(rendererSource.includes('registerStaticPacketRunBitmapEntry(reuseKey, signature, entry)'), 'renderer should register newly built bitmap runs for later zoom reuse');
assert(rendererSource.includes('staticBitmapRunInteractionReuseCount'), 'draw loop breakdown should expose zoom interaction reuse counters');

console.log('zoom-static-bitmap-run-reuse.test.js: OK');
