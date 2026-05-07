const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const renderSource = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');
const ownerRel = 'src/presentation/render/projection/render-scope-builder.js';
const ownerSource = fs.readFileSync(path.join(root, ownerRel), 'utf8');
assert(indexSource.includes(ownerRel), 'index.html should load render-scope-builder.js');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf('src/presentation/render/render.js'), 'render-scope owner must load before render.js');
[
  'getMainEditorCameraSettingsForRender',
  'getMainEditorDisplayScaleForRender',
  'getMainEditorZoomValueForRender',
  'getMainEditorCullingMarginForRender',
  'getMainEditorCameraScreenViewportBounds',
  'getMainEditorViewportScreenBoundsBeforeZoom',
  'expandWorldBounds',
  'worldBoundsIntersectXY',
  'pointWithinWorldBoundsXY',
  'boxWithinWorldBoundsXY',
  'computeMainEditorViewportWorldBounds',
  'getMainCameraRenderScope',
  'renderableIntersectsMainCameraScope',
  'filterRenderablesForMainCameraScope',
  'filterLightsForMainCameraScope',
  'filterBoxesForMainCameraScope',
  'getMainCameraVisibleLightsForRender',
  'applyMainCameraWorldTransform',
  'drawMainCameraBoundsDebug'
].forEach((name) => {
  assert(ownerSource.includes(`function ${name}(`), `${name} should live in render-scope-builder.js`);
  assert(!renderSource.includes(`function ${name}(`), `${name} should not be implemented in render.js`);
});
assert(ownerSource.includes('__mainCameraScopeCache'), 'owner should own scope cache');
assert(ownerSource.includes('__mainCameraScopeCountsCache'), 'owner should own counts cache');
assert(ownerSource.includes('__MAIN_CAMERA_CULLING_API__'), 'owner should register culling API');
assert(!ownerSource.includes('function buildScopedTerrainRenderables('), 'owner must not own terrain renderable building');
assert(!ownerSource.includes('function drawPrefabSpriteAt('), 'owner must not own sprite drawing');
assert(!ownerSource.includes('function buildRendererFramePlan('), 'owner must not own frame planning');
console.log('PASS render-scope-builder-boundary');
