const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const consumer = fs.readFileSync(path.join(root, 'src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js'), 'utf8');
const builder = fs.readFileSync(path.join(root, 'src/application/render/static-world-renderable-builder.js'), 'utf8');

assert(consumer.includes('function isLiquidStaticWorldPacket'), 'consumer should expose a liquid packet classifier internally');
assert(consumer.includes('packet.liquidRenderPacket === true'), 'consumer should identify liquidRenderPacket');
assert(consumer.includes('isLiquidStaticWorldPacket(packet) || isPlayerSensitiveDemergedPacket(packet)'), 'liquid packets should be routed to per-packet path');
assert(builder.includes('liquid-render-v18-top-lines-off-preserved'), 'builder should mark liquid render path v18');
assert(builder.includes('computeLiquidRenderableSortMeta'), 'liquid packets should still use normal world ordering metadata');

console.log('liquid-pixi-ordering-boundary.test.js PASS');
