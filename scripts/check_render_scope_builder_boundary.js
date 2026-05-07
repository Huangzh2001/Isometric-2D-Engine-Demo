#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function fail(message) {
  console.error('FAIL check_render_scope_builder_boundary:', message);
  process.exit(1);
}
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
const index = read('index.html');
const render = read('src/presentation/render/render.js');
const ownerRel = 'src/presentation/render/projection/render-scope-builder.js';
const ownerPath = path.join(root, ownerRel);
if (!fs.existsSync(ownerPath)) fail(`${ownerRel} is missing`);
const owner = fs.readFileSync(ownerPath, 'utf8');
if (!index.includes(ownerRel)) fail('index.html does not load render-scope-builder.js');
if (!(index.indexOf(ownerRel) < index.indexOf('src/presentation/render/render.js'))) fail('render-scope owner must load before render.js');
const owned = [
  'getMainEditorCameraSettingsForRender',
  'getMainEditorDisplayScaleForRender',
  'getMainEditorZoomValueForRender',
  'getMainEditorCullingMarginForRender',
  'getMainEditorCameraScreenViewportBounds',
  'getMainEditorViewportScreenBoundsBeforeZoom',
  'computeMainEditorViewportWorldBounds',
  'getMainCameraRenderScope',
  'filterRenderablesForMainCameraScope',
  'filterLightsForMainCameraScope',
  'filterBoxesForMainCameraScope',
  'drawMainCameraBoundsDebug'
];
for (const name of owned) {
  if (!owner.includes(`function ${name}(`)) fail(`${name} missing from render-scope owner`);
  if (render.includes(`function ${name}(`)) fail(`${name} implementation leaked back into render.js`);
}
if (!owner.includes('__mainCameraScopeCache')) fail('render-scope owner must own main camera scope cache');
if (!owner.includes('__mainCameraScopeCountsCache')) fail('render-scope owner must own main camera scope counts cache');
if (!owner.includes('__MAIN_CAMERA_CULLING_API__')) fail('render-scope owner must register main camera culling API');
const forbidden = [
  'function buildScopedTerrainRenderables(',
  'function drawPrefabSpriteAt(',
  'function buildRendererFramePlan(',
  'function drawPlacementPreview(',
  'function normalizeRenderUpdateModeForRender('
];
for (const marker of forbidden) {
  if (owner.includes(marker)) fail(`render-scope owner contains unrelated marker: ${marker}`);
}
if (owner.length > 30000) fail(`render-scope owner is too large (${owner.length} bytes); split before adding more responsibilities`);
console.log('PASS check_render_scope_builder_boundary');
