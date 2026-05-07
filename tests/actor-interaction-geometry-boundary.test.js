#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rel = 'src/presentation/render/interaction/actor-interaction-geometry.js';
const source = fs.readFileSync(path.join(root, rel), 'utf8');
const renderSource = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function assertLoadsBefore(before, after) {
  const beforeIdx = indexHtml.indexOf(before);
  const afterIdx = indexHtml.indexOf(after);
  assert(beforeIdx >= 0, `missing ${before}`);
  assert(afterIdx >= 0, `missing ${after}`);
  assert(beforeIdx < afterIdx, `${before} must load before ${after}`);
}

assertLoadsBefore(rel, 'src/presentation/render/interaction/stable-local-demerge.js');
assertLoadsBefore(rel, 'src/presentation/render/render.js');
assertLoadsBefore('src/presentation/render/renderables/renderable-order-adapter.js', rel);

assert(source.includes("owner: 'actor-interaction-geometry'"), 'owner metadata should identify actor-interaction-geometry');
assert(source.includes('face keys, group summaries, player sort meta'), 'owner should describe geometry responsibility');
assert(!/\bctx\s*\./.test(source), 'geometry owner must not draw through ctx');
assert(!/\bdocument\s*\./.test(source), 'geometry owner must not access DOM');
assert(!/\blocalStorage\s*\./.test(source), 'geometry owner must not read localStorage');
assert(!source.includes('actor-interaction-replacement-packet'), 'geometry owner must not own replacement packets');
assert(!source.includes('emitActorInteractionOrderDiag'), 'geometry owner must not emit diagnostics');
assert(!source.includes('applyPlayerSupportTopSortOverrideToRenderables'), 'geometry owner must not own support-top override');

assert(renderSource.includes('requireActorInteractionGeometryForRender'), 'render.js should require actor interaction geometry');
assert(renderSource.includes('return requireActorInteractionGeometryForRender().buildActorInteractionCellFaceKey'), 'cell face key should delegate');
assert(renderSource.includes('return requireActorInteractionGeometryForRender().buildActorInteractionGroupSummaryMapFromPackets'), 'group summary map should delegate');
assert(renderSource.includes('return requireActorInteractionGeometryForRender().computeActorInteractionPlayerSortMeta'), 'player sort meta should delegate');
assert(!renderSource.includes("var screenFace = getScreenFaceForSemanticFace(sf, normalizeMainEditorViewRotationValue(viewRotation));\n  return [\n    cell.instanceId || 'unknown'"), 'render.js must not retain cell-face-key body');
assert(!renderSource.includes('var api = getMainViewRotationCoreApi();\n  var cfg = getMainViewProjectionConfigWithoutCamera();'), 'render.js must not retain no-camera projection body');
assert(!renderSource.includes('var lineY = lineYAtX(left, right, playerFoot.x);\n  return playerFoot.y >= lineY'), 'render.js must not retain single-footprint relation body');

const sandbox = { window: {}, console, Math, Number, String, Object, Array, JSON, Date, Map, Set };
vm.runInNewContext(source, sandbox, { filename: rel });
const api = sandbox.window.__ACTOR_INTERACTION_GEOMETRY__;
assert(api, 'geometry owner should expose global API');
assert.strictEqual(typeof api.buildActorInteractionCellFaceKey, 'function');
assert.strictEqual(typeof api.buildActorInteractionBoxGroupSummaryMap, 'function');
assert.strictEqual(typeof api.computeActorInteractionPlayerSortMeta, 'function');

const deps = {
  normalizeMainEditorViewRotationValue: (v) => Number(v || 0),
  getScreenFaceForSemanticFace: (face, rotation) => `${face}@${rotation}`,
  getMainViewRotationCoreApi: () => null,
  getMainViewProjectionConfigWithoutCamera: () => ({ originX: 0, originY: 0, tileW: 64, tileH: 32 }),
  getDomainSceneCoreApi: () => null,
  computeViewAwareSortMeta: (point, height) => ({ sortKey: point.x + point.y + point.z + height, tie: 11 }),
  lineYAtX: (left, right, x) => (left.y + right.y) / 2
};

const key = api.buildActorInteractionCellFaceKey({ instanceId: 'boxA', x: 1, y: 2, z: 3 }, 'top', 2, deps);
assert.strictEqual(key, 'boxA|1,2,3|top|top@2');
const memberKeys = api.buildActorInteractionMemberFaceKeysFromFaceDescriptor({ semanticFace: 'east', members: [{ cell: { instanceId: 'a', x: 0, y: 0, z: 1 } }] }, 1, deps);
assert.strictEqual(memberKeys.length, 1);
assert.strictEqual(memberKeys[0], 'a|0,0,1|east|east@1');
const summary = api.buildActorInteractionBoxGroupSummaryMap([{ instanceId: 'stack', x: 2, y: 4, z: 1, w: 1, d: 1, h: 3 }]);
assert.strictEqual(summary.get('stack').maxZ, 4);
assert.strictEqual(summary.get('stack').footprintKeys.size, 1);
const packetSummary = api.buildActorInteractionGroupSummaryMapFromPackets([{ kind: 'static-world-face-packet', instanceId: 'p1', actorInteractionMemberDescriptors: [{ cell: { instanceId: 'p1', x: 5, y: 6, z: 0, w: 1, d: 1, h: 1 } }] }]);
assert.strictEqual(packetSummary.get('p1').anchorCellX, 5);
const projected = api.projectActorInteractionWorldPointNoCamera({ x: 1, y: 0, z: 0 }, 0, deps);
assert.strictEqual(projected.x, 32);
assert.strictEqual(projected.y, 16);
const sortMeta = api.computeActorInteractionPlayerSortMeta({ x: 1, y: 2, z: 3 }, 0, deps);
assert.strictEqual(sortMeta.sortKey, 6.0007);
assert.strictEqual(sortMeta.tie, 700011);
const relation = api.classifyActorInteractionSingleFootprintGroupAgainstPlayer(packetSummary.get('p1'), { x: 5, y: 6, z: 0 }, 0, deps);
assert(['player-in-front', 'player-behind'].includes(relation), 'single-footprint classifier should return a player relation');

console.log(JSON.stringify({ status: 'PASS', test: 'actor-interaction-geometry-boundary' }, null, 2));
