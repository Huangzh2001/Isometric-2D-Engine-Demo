#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function fail(message) {
  console.error('FAIL check_static_renderable_facade_boundary:', message);
  process.exit(1);
}
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
const index = read('index.html');
const render = read('src/presentation/render/render.js');
const ownerRel = 'src/presentation/render/renderables/static-renderable-facade.js';
const ownerPath = path.join(root, ownerRel);
if (!fs.existsSync(ownerPath)) fail(`${ownerRel} is missing`);
const owner = fs.readFileSync(ownerPath, 'utf8');
if (!index.includes(ownerRel)) fail('index.html does not load static-renderable-facade.js');
if (!(index.indexOf(ownerRel) < index.indexOf('src/presentation/render/render.js'))) fail('static-renderable-facade.js must load before render.js');
const owned = [
  'resolveRenderFunctionDependency',
  'requireStaticWorldRenderableBuilderForRender',
  'createStaticWorldRenderableBuilderDepsForRender',
  'buildStaticWorldChunkRenderables',
  'requireStaticWorldRenderCacheCoordinatorForRender',
  'createStaticWorldRenderCacheCoordinatorDepsForRender',
  'rebuildStaticBoxRenderCacheIfNeeded'
];
for (const name of owned) {
  if (!owner.includes(`function ${name}(`)) fail(`${name} missing from static-renderable-facade owner`);
  if (render.includes(`function ${name}(`)) fail(`${name} implementation leaked back into render.js`);
}
const requiredMarkers = [
  'global.IsometricStaticRenderableFacade',
  'global.__STATIC_RENDERABLE_FACADE__',
  'global.buildStaticWorldChunkRenderables = buildStaticWorldChunkRenderables',
  'global.rebuildStaticBoxRenderCacheIfNeeded = rebuildStaticBoxRenderCacheIfNeeded'
];
for (const marker of requiredMarkers) {
  if (!owner.includes(marker)) fail(`static-renderable-facade missing marker: ${marker}`);
}
const forbidden = [
  'function buildScopedTerrainRenderables(',
  'function drawPrefabSpriteAt(',
  'function drawPlacementPreview(',
  'function buildRendererFramePlan(',
  'function getMainCameraRenderScope('
];
for (const marker of forbidden) {
  if (owner.includes(marker)) fail(`static-renderable-facade contains unrelated marker: ${marker}`);
}
if (owner.length > 30000) fail(`static-renderable-facade is too large (${owner.length} bytes); split before adding more responsibilities`);
console.log('PASS check_static_renderable_facade_boundary');
