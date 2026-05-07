#!/usr/bin/env node
/*
 * P12a-4 guardrail: sprite / prefab / Habbo / player visual rendering
 * must live in focused owners, not in render.js.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('FAIL check_sprite_renderer_boundaries: ' + msg); process.exit(1); }
function has(rel) { return fs.existsSync(path.join(root, rel)); }

const renderPath = 'src/presentation/render/render.js';
const habboPath = 'src/presentation/render/sprites/habbo-composite-renderer.js';
const prefabPath = 'src/presentation/render/sprites/prefab-sprite-renderer.js';
const playerPath = 'src/presentation/render/sprites/player-sprite-frame.js';
for (const rel of [habboPath, prefabPath, playerPath]) {
  if (!has(rel)) fail('missing owner ' + rel);
}
const render = read(renderPath);
const habbo = read(habboPath);
const prefab = read(prefabPath);
const player = read(playerPath);
const index = read('index.html');

for (const token of [
  'var habboCompositeCache = new Map()',
  'var prefabSpriteImageCache = new Map()',
  'var sortedLayers = layers.slice().sort',
  'ctx.drawImage(img, srcX0, 0, srcW',
  'playerSpriteFrameBuffer.width = SPRITE.frameW',
  'playerSpriteFrameCtx.globalCompositeOperation = \'source-atop\''
]) {
  if (render.includes(token)) fail('render.js still retains moved implementation marker ' + token);
}
for (const token of [
  'return requireHabboCompositeRendererForRender().buildHabboComposite.apply(null, arguments);',
  'return requirePrefabSpriteRendererForRender().drawPrefabSpriteAt.apply(null, arguments);',
  'return requirePlayerSpriteFrameForRender().preparePlayerSpriteFrame.apply(null, arguments);'
]) {
  if (!render.includes(token)) fail('render.js missing wrapper delegation ' + token);
}

for (const token of [
  'function buildHabboComposite(',
  'function getHabboComposite(',
  'function getHabboPlacementShift(',
  'function getHabboRoomOrigin('
]) {
  if (!habbo.includes(token)) fail(habboPath + ' missing ' + token);
}
for (const token of [
  'function getPrefabSpriteConfig(',
  'function getPrefabSpriteImage(',
  'function drawPrefabSpriteAt(',
  'function drawPrefabSpritePartInstance(',
  'function computeSpriteRenderableSort('
]) {
  if (!prefab.includes(token)) fail(prefabPath + ' missing ' + token);
}
for (const token of [
  'function getPlayerVisualScale(',
  'function preparePlayerSpriteFrame(',
  'function drawPlayerAvatar('
]) {
  if (!player.includes(token)) fail(playerPath + ' missing ' + token);
}

const scriptOrder = [
  'src/presentation/render/frame/render-frame-plan-builder.js',
  'src/presentation/render/sprites/habbo-composite-renderer.js',
  'src/presentation/render/sprites/prefab-sprite-renderer.js',
  'src/presentation/render/sprites/player-sprite-frame.js',
  'src/presentation/render/render.js',
];
let last = -1;
for (const rel of scriptOrder) {
  const idx = index.indexOf(rel);
  if (idx < 0) fail('index.html missing script ' + rel);
  if (idx <= last) fail('index.html script order is wrong near ' + rel);
  last = idx;
}

const maxBytes = {
  [habboPath]: 18000,
  [prefabPath]: 32000,
  [playerPath]: 10000,
};
for (const [rel, max] of Object.entries(maxBytes)) {
  const size = fs.statSync(path.join(root, rel)).size;
  if (size > max) fail(rel + ' grew to ' + size + ' bytes; split before it becomes a new large node');
}
console.log('PASS check_sprite_renderer_boundaries');
