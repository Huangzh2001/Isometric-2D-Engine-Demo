const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'renderer', 'canvas2d-renderer.js'), 'utf8');
const ownerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'renderer', 'canvas2d-static-bitmap-run-cache.js'), 'utf8');
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'render.js'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'shell', 'app.js'), 'utf8');
const floorLayerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'renderer', 'canvas2d-floor-layer-draw-pass.js'), 'utf8');

assert(rendererSource.includes('getActiveCameraInteractionId'), 'renderer should inject/read the active camera interaction id');
assert(ownerSource.includes('buildStaticPacketRunInteractionSlotKey'), 'owner should derive a per-run interaction slot key');
assert(ownerSource.includes('findStaticPacketRunInteractionSlotEntry'), 'owner should keep reusable bitmap runs alive for the active zoom gesture');
assert(ownerSource.includes('registerStaticPacketRunInteractionSlotEntry(adapterApi, deps, meta, reuseEntry)'), 'owner should refresh the interaction slot after drawing a reused bitmap run');
assert(renderSource.includes('shouldForceFloorLayerInteractionReuse'), 'render should force floor-layer reuse during zoom interactions');
assert(floorLayerSource.includes("floor-layer-cache-reuse-zoom-lock"), 'floor-layer owner should label zoom-locked floor reuse explicitly');
assert(appSource.includes('window.__habboActiveCameraInteractionId'), 'app shell should publish the active camera interaction id for renderer reuse');

console.log('zoom-interaction-lock-reuse.test.js: OK');
