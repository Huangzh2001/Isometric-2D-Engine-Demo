const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/presentation/render/optimization/static-world-projected-geometry-cache.js'), 'utf8');
const pixiConsumerSource = fs.readFileSync(path.join(root, 'src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js'), 'utf8');

const sandbox = { window: {}, globalThis: {}, console, Number, String, Array, Object, Math, JSON };
vm.runInNewContext(source, sandbox, { filename: 'static-world-projected-geometry-cache.js' });

const api = sandbox.window.__STATIC_WORLD_PROJECTED_GEOMETRY_CACHE__;
assert(api, 'static world projected geometry cache should expose a renderer-neutral API');
assert.strictEqual(typeof api.getStaticWorldPacketProjectedGeometry, 'function', 'projected geometry getter should be available');

const packet = {
  id: 'packet-a',
  fill: '#abc',
  stroke: '#123',
  width: 1,
  worldPts: [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 1, y: 1, z: 0 }
  ]
};
const deps = {
  getSettings: () => ({ tileW: 64, tileH: 32, originX: 320, originY: 180 }),
  getMainEditorZoomValueForRender: () => 0.57,
  screenPointsFromWorldFaceNoCamera: (pts) => pts.map((pt) => ({ x: 320 + pt.x * 32, y: 180 + pt.y * 16 - pt.z * 16 }))
};
const projected = api.getStaticWorldPacketProjectedGeometry(packet, 0, deps);
assert.strictEqual(projected.projectionZoom, 0.57, 'projected geometry should record the zoom space it was built in');
assert.strictEqual(projected.projectionTileW, 64, 'projected geometry should record tile width');
assert.strictEqual(projected.projectionTileH, 32, 'projected geometry should record tile height');
assert.strictEqual(projected.projectionOriginX, 320, 'projected geometry should record origin x');
assert.strictEqual(projected.projectionOriginY, 180, 'projected geometry should record origin y');
assert(projected.key.includes('|0.57|'), 'projected geometry cache key should retain zoom for legacy consumers that parse the key');

assert(pixiConsumerSource.includes('getProjectedNoCameraProjectionZoom'), 'pixi static-world consumer should read projected no-camera source zoom');
assert(pixiConsumerSource.includes('projectNoCameraPointToBuiltNoCamera(pt, renderTransform.floorSnapshot, deps, projected)'), 'pixi static-world consumer should map cached geometry using projected source space');
assert(!pixiConsumerSource.includes('function projectCurrentNoCameraPointToBuiltNoCamera'), 'pixi static-world consumer should not assume every no-camera point came from current zoom');

console.log('static-world-projected-geometry-cache.test.js: OK');
