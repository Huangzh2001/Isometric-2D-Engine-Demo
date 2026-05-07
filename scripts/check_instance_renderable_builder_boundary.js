#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function fail(message) {
  console.error('FAIL check_instance_renderable_builder_boundary:', message);
  process.exit(1);
}
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
const index = read('index.html');
const render = read('src/presentation/render/render.js');
const ownerRel = 'src/presentation/render/instances/instance-renderable-builder.js';
const ownerPath = path.join(root, ownerRel);
if (!fs.existsSync(ownerPath)) fail(`${ownerRel} is missing`);
const owner = fs.readFileSync(ownerPath, 'utf8');
if (!index.includes(ownerRel)) fail('index.html does not load instance-renderable-builder.js');
if (!(index.indexOf(ownerRel) < index.indexOf('src/presentation/render/render.js'))) fail('instance owner must load before render.js');
const owned = [
  'normalizeRenderUpdateModeForRender',
  'getPrefabRenderUpdateModeForRender',
  'isInstanceDynamicRenderableForFrame',
  'buildInstanceRenderUpdateModeIndex',
  'getDynamicInstanceSplitForRender',
  'getVisibleInstanceSummaryForRender',
  'drawInstanceProxyBoxes'
];
for (const name of owned) {
  if (!owner.includes(`function ${name}(`)) fail(`${name} missing from instance owner`);
  if (render.includes(`function ${name}(`)) fail(`${name} implementation leaked back into render.js`);
}
const forbidden = [
  'function drawPrefabSpriteAt(',
  'function buildRendererFramePlan(',
  'function buildScopedTerrainRenderables(',
  'function drawPlacementPreview('
];
for (const marker of forbidden) {
  if (owner.includes(marker)) fail(`instance owner contains unrelated marker: ${marker}`);
}
if (owner.length > 30000) fail(`instance owner is too large (${owner.length} bytes); split before adding more responsibilities`);
console.log('PASS check_instance_renderable_builder_boundary');
