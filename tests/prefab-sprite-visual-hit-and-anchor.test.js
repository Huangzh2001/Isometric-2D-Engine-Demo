const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('src/presentation/render/sprites/prefab-sprite-renderer.js', 'utf8');
const pixiSource = fs.readFileSync('src/presentation/render/optimization/shared-render-optimization-pixi-dynamic-renderable-consumer.js', 'utf8');
const main2 = fs.readFileSync('dist/bundles/main-2.bundle.js', 'utf8');

assert(source.includes('getRuntimeSpriteAnchor(prefab, rotation, spriteCfg)'), 'Canvas2D sprite rendering must use rotated local anchor');
assert(pixiSource.includes('getRuntimeSpriteAnchor(prefab, rotation, spriteCfg)'), 'Pixi sprite rendering must use rotated local anchor');
assert(source.includes('function hitTestPrefabSpriteAtScreen'), 'canonical sprite renderer must expose alpha-aware hit testing');
assert(source.includes('getPrefabSpriteAlphaMask'), 'canonical sprite hit testing must inspect source alpha instead of only the draw rectangle');
assert(source.includes('mapSpriteScreenPointToSourcePixel'), 'screen hit must map back into the exact source image pixel');
assert(pixiSource.includes('function pickPrefabSpriteAtScreen'), 'Pixi renderer must expose rendered-sprite hit test');
assert(main2.includes('function pickPrefabSpriteAtScreen'), 'runtime bundle must include rendered-sprite hit test');
assert(main2.includes('getRuntimeSpriteAnchor'), 'runtime bundle must include shared rotated sprite anchor logic');
assert(source.includes('usesLegacyHabboComposite(prefab)'), 'Canvas2D renderer must gate the old Habbo composite path');
assert(pixiSource.includes('usesLegacyHabboComposite(prefab)'), 'Pixi renderer must gate the old Habbo composite path');
assert(source.includes('useLegacyHabboRuntime === false'), 'unified HZHMAT runtime must bypass old Habbo position-tile anchoring');
assert(source.includes("String(prefab.localFrame.rotationSpace || '') === 'editor-anchor-corner'"), 'renderer must recognize the editor-anchor-corner unified runtime');
assert(main2.includes('useLegacyHabboRuntime === false'), 'runtime bundle must contain the unified-prefab legacy-Habbo bypass');

console.log('prefab-sprite-visual-hit-and-anchor.test.js: OK');
