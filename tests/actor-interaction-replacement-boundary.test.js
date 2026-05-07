#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rel = 'src/presentation/render/interaction/actor-interaction-replacement.js';
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

assertLoadsBefore('src/presentation/render/interaction/actor-interaction-geometry.js', rel);
assertLoadsBefore(rel, 'src/presentation/render/interaction/stable-local-demerge.js');
assertLoadsBefore(rel, 'src/presentation/render/render.js');

assert(source.includes("owner: 'actor-interaction-replacement'"), 'owner metadata should identify actor-interaction-replacement');
assert(source.includes('replacement candidate, suppression, replacement renderable'), 'owner should describe replacement responsibility');
assert(!/\bctx\s*\./.test(source), 'replacement owner must not draw through ctx');
assert(!/\bdocument\s*\./.test(source), 'replacement owner must not access DOM');
assert(!/\blocalStorage\s*\./.test(source), 'replacement owner must not access localStorage');
assert(!source.includes('applyPlayerSupportTopSortOverrideToRenderables'), 'replacement owner must not own support-top override');
assert(!source.includes('applyStableActorSortDemergeToStaticRenderables'), 'replacement owner must not own stable-local demerge');

assert(renderSource.includes('requireActorInteractionReplacementForRender'), 'render.js should require replacement owner');
assert(renderSource.includes('return requireActorInteractionReplacementForRender().buildActorInteractionCandidateFaceKeySetForPlayer'), 'candidate face set should delegate');
assert(renderSource.includes('return requireActorInteractionReplacementForRender().applyActorInteractionReplacementToRenderables'), 'replacement application should delegate');
assert(!renderSource.includes("var faces = ['top', 'east', 'south', 'west', 'north'];\n  for (var bi = 0; bi < sourceBoxes.length; bi++)"), 'render.js must not retain candidate iteration body');
assert(!renderSource.includes("id: 'actor-interaction-packet-' + String(sourcePacket.id || 'packet')"), 'render.js must not retain replacement packet construction body');
assert(!renderSource.includes('var filtered = [];\n  var replacements = [];\n  var suppressedPacketCount = 0;'), 'render.js must not retain replacement assembly body');

const sandbox = { window: {}, console, Math, Number, String, Object, Array, JSON, Date, Map, Set };
vm.runInNewContext(source, sandbox, { filename: rel });
const api = sandbox.window.__ACTOR_INTERACTION_REPLACEMENT__;
assert(api, 'replacement owner should expose global API');
assert.strictEqual(typeof api.buildActorInteractionCandidateFaceKeySetForPlayer, 'function');
assert.strictEqual(typeof api.shouldSuppressStaticPacketForActorInteraction, 'function');
assert.strictEqual(typeof api.applyActorInteractionReplacementToRenderables, 'function');

const deps = {
  normalizeMainEditorViewRotationValue: (v) => Number(v || 0),
  getSafeMainEditorViewRotation: () => ({ viewRotation: 0 }),
  getActorInteractionSortRadiusForRender: () => 2,
  buildActorInteractionBoxGroupSummaryMap: () => new Map([['box1', { footprintKeys: new Set(['0,0']) }]]),
  isActorDiagTerrainCell: () => false,
  getActorInteractionGroupKeyForCell: (cell, fallback) => (cell && cell.instanceId) || fallback || '',
  getSemanticFaceNeighborDeltaForRender: (face) => ({ x: face === 'east' ? 1 : 0, y: face === 'south' ? 1 : 0, z: face === 'top' ? 1 : 0 }),
  buildActorInteractionCellFaceKey: (cell, face) => `${cell.instanceId}|${cell.x},${cell.y},${cell.z}|${face}`,
  isActorInteractionOrderDiagEnabled: () => false,
  getSemanticFaceNormal: () => ({ x: 0, y: 0, z: 1 }),
  buildMergedVoxelFaceWorldGeometry: () => ({ worldPts: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }),
  getScreenFaceForSemanticFace: (face) => face,
  getTerrainMaterialPatternDescriptorForRenderCell: () => null,
  getTerrainMaterialBaseFaceColorsForRenderCell: () => null,
  getCachedBaseFaceColorsForRenderable: () => ({ line: '#111' }),
  getCachedStaticRenderableFill: () => ({ fill: '#eee' }),
  getTerrainRenderSettingsForRender: () => null,
  isStaticRenderableLightingActiveForBuild: () => false,
  buildVoxelFaceShadowWorldOverlays: () => [],
  getTerrainMaterialIdForRenderCell: () => 'mat',
  buildActorInteractionGroupSummaryMapFromPackets: () => new Map([['box1', { footprintKeys: new Set(['0,0']) }]]),
  classifyActorInteractionSingleFootprintGroupAgainstPlayer: () => 'player-in-front',
  computeActorInteractionPlayerSortMeta: () => ({ sortKey: 100, tie: 500 }),
  compareRenderablesByDomain: (a, b) => (a.sortKey - b.sortKey) || (a.tie - b.tie)
};

const faceSet = api.buildActorInteractionCandidateFaceKeySetForPlayer({ player: { x: 0, y: 0, z: 0 }, sourceBoxes: [{ instanceId: 'box1', x: 0, y: 0, z: 0, w: 1, d: 1, h: 1 }], occ: new Map(), viewRotation: 0 }, deps);
assert(faceSet.size > 0, 'candidate face set should include nearby eligible faces');
const packet = { kind: 'static-world-face-packet', actorInteractionMemberFaceKeys: ['box1|0,0,0|top'] };
assert.strictEqual(api.shouldSuppressStaticPacketForActorInteraction(packet, new Set(['box1|0,0,0|top']), deps), true);
const replacement = api.buildActorInteractionReplacementRenderableFromDescriptor({ semanticFace: 'top', cell: { instanceId: 'box1', x: 0, y: 0, z: 0 } }, { id: 'p', kind: 'static-world-face-packet' }, 0, deps);
assert(replacement && replacement.actorInteractionReplacement, 'replacement renderable should be constructed');
const result = api.applyActorInteractionReplacementToRenderables([{ kind: 'static-world-face-packet', id: 'p', actorInteractionMemberFaceKeys: ['box1|0,0,0|top'], actorInteractionMemberDescriptors: [{ semanticFace: 'top', cell: { instanceId: 'box1', x: 0, y: 0, z: 0 } }] }], new Set(['box1|0,0,0|top']), 0, { x: 0, y: 0, z: 0 }, deps);
assert.strictEqual(result.suppressedPacketCount, 1);
assert.strictEqual(result.replacementRenderables.length, 1);

console.log(JSON.stringify({ status: 'PASS', test: 'actor-interaction-replacement-boundary' }, null, 2));
