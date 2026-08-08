const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const registry = fs.readFileSync(path.join(root, 'src/core/state/prefab-registry.js'), 'utf8');
const builder = fs.readFileSync(path.join(root, 'src/presentation/render/instances/instance-renderable-builder.js'), 'utf8');
const consumer = fs.readFileSync(path.join(root, 'src/presentation/render/optimization/shared-render-optimization-pixi-dynamic-renderable-consumer.js'), 'utf8');
const composite = fs.readFileSync(path.join(root, 'src/presentation/render/sprites/habbo-composite-renderer.js'), 'utf8');
const placement = fs.readFileSync(path.join(root, 'src/application/placement/placement.js'), 'utf8');
const main1 = fs.readFileSync(path.join(root, 'dist/bundles/main-1.bundle.js'), 'utf8');
const main2 = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');

assert(registry.includes('function getPrefabByIdExact('), 'registry must expose an exact prefab lookup');
assert(registry.includes('prefabRuntimeSnapshots'), 'registry must retain exact prefab snapshots');
assert(builder.includes('getExactPrefabForRender'), 'instance split must reject unrelated fallback prefabs');
assert(consumer.includes('retainedPrefabById'), 'Pixi consumer must retain the last exact prefab by id');
assert(consumer.includes("String(candidate.id) === id"), 'Pixi consumer must verify fallback identity');
assert(composite.includes("img.addEventListener('load'"), 'Habbo image load must trigger a visual refresh');
assert(composite.includes("floorBaselineOffset: 0"), 'Habbo room origin wrapper must remove the fixed 20px baseline');
assert(placement.includes('retain-exact-prefab'), 'placement must retain the exact prefab before scene commit');
assert(placement.includes("requestHabboVisualRefresh('placement-commit')"), 'placement must actively refresh the sprite path after commit');
assert(main1.includes('HZH-HABBO-ANCHOR-REFRESH-FIX-V4'), 'main-1 runtime must contain the exact-prefab and anchor hotfix');
assert(main1.includes('inheritPlacementOwnership(wrappedGlobalPlace, originalGlobalPlace)'), 'global placement wrapper must inherit canonical ownership metadata');
assert(!main1.includes('placementApi.placeCurrentPrefab = wrappedPlace;\n      global.placeCurrentPrefab = wrappedPlace;'), 'runtime must not replace the owned global placement export with an untagged API wrapper');
assert(main2.includes('HZH-HABBO-ANCHOR-REFRESH-FIX-V4'), 'main-2 runtime must contain the dynamic refresh and room-origin hotfix');
assert(main2.includes("roomAnchorMode: 'rotated-position-tile-center'"), 'runtime diagnostics must report the new anchor convention');
assert(main2.includes('RefreshingImageV4'), 'runtime bundle must request a redraw when imported images finish loading');

console.log('habbo-anchor-refresh-runtime.test.js: OK');
