const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const root = path.join(__dirname, '..');
const renderSource = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');
const ownerPath = path.join(root, 'src/presentation/render/instances/instance-renderable-builder.js');
const ownerSource = fs.readFileSync(ownerPath, 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(indexSource.includes('src/presentation/render/instances/instance-renderable-builder.js'), 'index.html should load instance-renderable-builder.js');
assert(indexSource.indexOf('src/presentation/render/instances/instance-renderable-builder.js') < indexSource.indexOf('src/presentation/render/render.js'), 'instance renderable owner must load before render.js');

[
  'normalizeRenderUpdateModeForRender',
  'getPrefabRenderUpdateModeForRender',
  'isInstanceDynamicRenderableForFrame',
  'buildInstanceRenderUpdateModeIndex',
  'getDynamicInstanceSplitForRender',
  'getVisibleInstanceSummaryForRender',
  'drawInstanceProxyBoxes'
].forEach((name) => {
  assert(ownerSource.includes(`function ${name}(`), `${name} should live in instance-renderable-builder.js`);
  assert(!renderSource.includes(`function ${name}(`), `${name} should not be implemented in render.js`);
});

assert(ownerSource.includes('__renderDynamicInstanceCache'), 'owner should own dynamic instance split cache');
assert(ownerSource.includes('__visibleInstanceSummaryCache'), 'owner should own visible instance summary cache');
assert(!ownerSource.includes('function drawPrefabSpriteAt('), 'owner must not own prefab sprite drawing');
assert(!ownerSource.includes('function buildRendererFramePlan('), 'owner must not own frame plan building');
assert(!ownerSource.includes('function buildScopedTerrainRenderables('), 'owner must not own terrain renderables');
console.log('PASS instance-renderable-builder-boundary');
