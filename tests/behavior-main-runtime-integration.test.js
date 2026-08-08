const assert = require('assert');
const fs = require('fs');

const bridge = fs.readFileSync('src/presentation/editor/behavior-main-test-bridge.js', 'utf8');
const html = fs.readFileSync('START_V18_ONLY.html', 'utf8');
const importSource = fs.readFileSync('src/application/assets/asset-import.js', 'utf8');
const mainBundle = fs.readFileSync('dist/bundles/main-1.bundle.js', 'utf8');
const registry = fs.readFileSync('src/core/state/prefab-registry.js', 'utf8');
const editorSource = fs.readFileSync('src/presentation/editor/editor-unified-v18.js', 'utf8');
const editorBundle = fs.readFileSync('dist/bundles/editor-2.bundle.js', 'utf8');

assert(!bridge.includes("if (params.get('embeddedBehaviorTest') !== '1') return"), 'behavior runtime must not be embedded-test-only');
assert(!bridge.includes('if (!running || e.button !== 0)'), 'click behavior must not depend on a run toggle');
assert(bridge.includes("currentEditorMode() !== 'view'"), 'behavior click should only intercept view-mode interaction');
assert(bridge.includes("if (!handler) return"), 'objects without behavior must keep normal main-program clicks');
assert(bridge.includes('initialStateId(p || {})'), 'raw imported prefab must report its real active state');
assert(bridge.includes('logicalPrefabs.set(logicalId, firstCompiled.logical)'), 'normal main-program prefabs must lazily initialize all state variants');
const stateSpriteStart = bridge.indexOf('function buildStateSpriteDirections');
const stateSpriteEnd = bridge.indexOf('function compilePrefab');
const stateSpriteFn = bridge.slice(stateSpriteStart, stateSpriteEnd);
assert(stateSpriteFn.includes('transform.offsetPx'), 'state runtime must preserve the exact per-facing offset authored in the voxel editor');
assert(!stateSpriteFn.includes('registrationFromAnchorPx'), 'state runtime must not re-derive and double-apply sprite registration offsets');
assert(bridge.includes('hitTestPrefabSpriteAtScreen'), 'behavior click must use the canonical alpha-aware rendered sprite hit test');
const pickFn = bridge.slice(bridge.indexOf('function pickInstanceFromMouseEvent'), bridge.indexOf('function currentEditorMode'));
assert(pickFn.indexOf('hitTestPrefabSpriteAtScreen') < pickFn.lastIndexOf('pickBoxAtScreen'), 'alpha-aware visual sprite hit must run before voxel fallback hit');
assert(pickFn.includes('prefabHasSprite(pickedPrefab)'));
assert(bridge.includes('prefab-anchor-local-frame-v3'), 'state runtime must keep an explicit authored-anchor local frame');
assert(bridge.includes("rotationSpace: 'editor-anchor-corner'"), 'state runtime must use the exact voxel-editor anchor coordinate as its rotation pivot');
assert(bridge.includes('logicalW / Math.max(1, Number(rect.width)'), 'behavior click must use the same CSS-to-logical coordinate conversion as the main canvas');
assert(bridge.includes('useLegacyHabboRuntime = false'), 'unified runtime variants must disable legacy Habbo room anchoring');
assert(!html.includes('behaviorTestRun'), 'behavior run button must be absent');
assert(importSource.includes('prefab.materialStates && Array.isArray(prefab.materialStates.states)'), 'unified materials must skip legacy Habbo SWF repair');
assert(mainBundle.includes('prefab&&prefab.materialStates&&Array.isArray(prefab.materialStates.states)'), 'runtime bundle must contain unified-material repair guard');
assert(registry.includes('relativeVoxelAlignment: sprite.relativeVoxelAlignment'), 'prefab normalization must preserve sprite/voxel alignment metadata');
assert(editorSource.includes('const saved = await saveToAssetFolder()'), 'open-main must persist the exact current prefab before returning');
assert(editorBundle.includes('const saved = await saveToAssetFolder()'), 'editor runtime bundle must persist current prefab before returning');

console.log('behavior-main-runtime-integration.test.js: OK');
