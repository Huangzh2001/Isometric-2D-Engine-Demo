const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ownerRel = 'src/application/render/static-world-packet-ordering.js';
const builderRel = 'src/application/render/static-world-renderable-builder.js';
const ownerSource = fs.readFileSync(path.join(root, ownerRel), 'utf8');
const builderSource = fs.readFileSync(path.join(root, builderRel), 'utf8');

assert(indexSource.indexOf(ownerRel) >= 0, 'index should load static-world-packet-ordering');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(builderRel), 'packet ordering owner must load before static-world-renderable-builder');
assert(ownerSource.includes('buildStaticWorldPacketIdentity'), 'owner must expose packet identity builder');
assert(ownerSource.includes('sortStaticWorldPackets'), 'owner must expose packet sorting helper');
assert(builderSource.includes('requireStaticWorldPacketOrdering'), 'static-world-renderable-builder should require packet ordering owner');
assert(builderSource.includes('.buildStaticWorldPacketIdentity('), 'builder should delegate packet identity construction');
assert(builderSource.includes('.sortStaticWorldPackets('), 'builder should delegate packet sorting');
assert(!builderSource.includes('packets.sort(compareRenderablesByDomain)'), 'builder should not sort packets directly');
for (const forbidden of [/\bctx\s*\./, /\bdocument\s*\./, /\blocalStorage\s*\./, /\bnew\s+Image\b/, /\bfetch\s*\(/]) {
  assert(!forbidden.test(ownerSource), `packet ordering owner should not contain forbidden pattern ${forbidden}`);
}

const sandbox = { window: {}, Math, Number, String, Object, Array, Set, Map, Date, JSON, console, performance: { now: () => 0 } };
vm.runInNewContext(ownerSource, sandbox, { filename: ownerRel });
const api = sandbox.window.__STATIC_WORLD_PACKET_ORDERING__;
assert(api, 'owner should expose __STATIC_WORLD_PACKET_ORDERING__');
const identity = api.buildStaticWorldPacketIdentity({ merged: false, sortKey: 2, tie: 1 }, {
  cell: { id: 'c1', instanceId: 'i1', x: 3, y: 4, z: 5 },
  semanticFace: 'top',
  screenFace: 'top'
});
assert.strictEqual(identity.packetId, 'voxel-c1-3-4-5::top', 'unmerged packet id should be stable');
assert.strictEqual(identity.faceKey, 'i1|3,4,5|top|top', 'unmerged face key should be stable');
const packets = [{ sortKey: 5, tie: 0 }, { sortKey: 1, tie: 0 }];
api.sortStaticWorldPackets(packets, { perfNow: () => 0 });
assert.strictEqual(packets[0].sortKey, 1, 'sortStaticWorldPackets should order packets by sort key');

console.log('static-world-packet-ordering-boundary.test.js PASS');
