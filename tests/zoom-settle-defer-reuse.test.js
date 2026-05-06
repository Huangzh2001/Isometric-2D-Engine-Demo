const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'renderer', 'canvas2d-renderer.js'), 'utf8');
const bitmapOwnerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'renderer', 'canvas2d-static-bitmap-run-cache.js'), 'utf8');
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'render.js'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'shell', 'app.js'), 'utf8');
const floorLayerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'renderer', 'canvas2d-floor-layer-draw-pass.js'), 'utf8');

assert(appSource.includes('window.__habboCameraSettleReuseState'), 'app shell should publish settle reuse state');
assert(appSource.includes('scheduleCameraSettleReuseDelay'), 'app shell should schedule delayed settle after zoom');
assert(bitmapOwnerSource.includes('shouldUseDeferredZoomSettleReuse'), 'static bitmap owner should allow deferred zoom reuse after the gesture ends');
assert(renderSource.includes('shouldDeferFloorLayerSettleCommit'), 'render should defer floor-layer settle commits after zoom');
assert(floorLayerSource.includes('floor-layer-cache-reuse-zoom-settle-defer'), 'floor-layer owner should expose the deferred floor reuse branch');

console.log('zoom-settle-defer-reuse.test.js: OK');
