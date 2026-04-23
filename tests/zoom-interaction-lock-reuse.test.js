const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'renderer', 'canvas2d-renderer.js'), 'utf8');
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'render', 'render.js'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'shell', 'app.js'), 'utf8');

assert(rendererSource.includes('getActiveCameraInteractionId'), 'renderer should read the active camera interaction id');
assert(rendererSource.includes('buildStaticPacketRunInteractionSlotKey'), 'renderer should derive a per-run interaction slot key');
assert(rendererSource.includes('findStaticPacketRunInteractionSlotEntry'), 'renderer should keep reusable bitmap runs alive for the active zoom gesture');
assert(rendererSource.includes('registerStaticPacketRunInteractionSlotEntry(meta, reuseEntry)'), 'renderer should refresh the interaction slot after drawing a reused bitmap run');
assert(renderSource.includes('shouldForceFloorLayerInteractionReuse'), 'render should force floor-layer reuse during zoom interactions');
assert(renderSource.includes("floor-layer-cache-reuse-zoom-lock"), 'render should label zoom-locked floor reuse explicitly');
assert(appSource.includes('window.__habboActiveCameraInteractionId'), 'app shell should publish the active camera interaction id for renderer reuse');

console.log('zoom-interaction-lock-reuse.test.js: OK');
