#!/usr/bin/env node
/* P12a-4 structural boundary test. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
const render = read('src/presentation/render/render.js');
const habbo = read('src/presentation/render/sprites/habbo-composite-renderer.js');
const prefab = read('src/presentation/render/sprites/prefab-sprite-renderer.js');
const player = read('src/presentation/render/sprites/player-sprite-frame.js');
for (const token of [
  'var habboCompositeCache = new Map()',
  'var prefabSpriteImageCache = new Map()',
  'var sortedLayers = layers.slice().sort',
  'ctx.drawImage(img, srcX0, 0, srcW',
  'playerSpriteFrameBuffer.width = SPRITE.frameW',
  'playerSpriteFrameCtx.globalCompositeOperation = \'source-atop\''
]) {
  assert(!render.includes(token), 'render.js should not retain moved implementation marker ' + token);
}
assert(render.includes('return requireHabboCompositeRendererForRender().buildHabboComposite.apply(null, arguments);'), 'render.js should keep Habbo wrapper only');
assert(render.includes('return requirePrefabSpriteRendererForRender().drawPrefabSpriteAt.apply(null, arguments);'), 'render.js should keep prefab sprite wrapper only');
assert(render.includes('return requirePlayerSpriteFrameForRender().preparePlayerSpriteFrame.apply(null, arguments);'), 'render.js should keep player sprite wrapper only');
assert(habbo.includes('function buildHabboComposite('), 'Habbo owner should own buildHabboComposite');
assert(habbo.includes('function getHabboComposite('), 'Habbo owner should own getHabboComposite');
assert(prefab.includes('function drawPrefabSpriteAt('), 'Prefab owner should own drawPrefabSpriteAt');
assert(prefab.includes('function computeSpriteRenderableSort('), 'Prefab owner should own sprite sort');
assert(player.includes('function preparePlayerSpriteFrame('), 'Player owner should own preparePlayerSpriteFrame');
assert(player.includes('function drawPlayerAvatar('), 'Player owner should own drawPlayerAvatar');
console.log('PASS sprite-renderer-boundaries');
