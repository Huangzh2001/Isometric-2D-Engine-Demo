const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(cond, msg) { if (!cond) throw new Error(msg); }

const root = path.join(__dirname, '..');
const ownerPath = path.join(root, 'src/presentation/render/projection/render-scope-builder.js');
const ownerSource = fs.readFileSync(ownerPath, 'utf8');
const bundleSource = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');

const start = ownerSource.indexOf('function shouldBypassDynamicSpriteCameraCullingForRender');
const end = ownerSource.indexOf('function getMainEditorCameraScreenViewportBounds', start);
assert(start >= 0 && end > start, 'camera culling owner should contain the Habbo sprite bypass functions');

let cullingInput = null;
const context = {
  getPrefabById(prefabId) {
    return prefabId === 'habbo_sofa' ? { id: prefabId, sprite: { image: 'sofa.png' } } : { id: prefabId };
  },
  prefabHasSprite(prefab) { return !!(prefab && prefab.sprite); },
  getRenderVisibilityCoreApi() {
    return {
      filterByCameraScope(list) {
        cullingInput = list.slice();
        return list.filter((inst) => inst.prefabId === 'voxel_inside');
      }
    };
  },
  getInstanceWorldBoundsForRender() { return { minX: 0, minY: 0, maxX: 1, maxY: 1 }; },
  worldBoundsIntersectXY() { return false; },
  Set,
};
vm.createContext(context);
vm.runInContext(ownerSource.slice(start, end), context);

const sprite = { instanceId: 1, prefabId: 'habbo_sofa' };
const inside = { instanceId: 2, prefabId: 'voxel_inside' };
const outside = { instanceId: 3, prefabId: 'voxel_outside' };
const visible = context.filterInstancesForMainCameraScope(
  [sprite, inside, outside],
  { cameraCullingEnabled: true, cullingWorldBounds: { minX: 0, minY: 0, maxX: 5, maxY: 5 } }
);

assert(cullingInput.length === 2, 'sprite instances must not be passed into proxy-AABB camera culling');
assert(cullingInput.every((inst) => inst !== sprite), 'Habbo sprite must bypass proxy camera culling');
assert(visible.length === 2 && visible[0] === sprite && visible[1] === inside,
  'result should preserve the sprite and only the visible non-sprite instance');
assert(bundleSource.includes('function shouldBypassDynamicSpriteCameraCullingForRender'),
  'runtime bundle should contain the sprite camera-culling bypass');
assert(bundleSource.includes('visibleCullableSet.has(inst)'),
  'runtime bundle should merge culled non-sprites with always-visible sprites');

const bundleStart = bundleSource.indexOf('function shouldBypassDynamicSpriteCameraCullingForRender');
const bundleEnd = bundleSource.indexOf('function getMainEditorCameraScreenViewportBounds', bundleStart);
assert(bundleStart >= 0 && bundleEnd > bundleStart, 'runtime bundle camera-culling functions should be extractable');
let bundleCullingInput = null;
const bundleContext = {
  getPrefabById: context.getPrefabById,
  prefabHasSprite: context.prefabHasSprite,
  getRenderVisibilityCoreApi() {
    return {
      filterByCameraScope(list) {
        bundleCullingInput = list.slice();
        return list.filter((inst) => inst.prefabId === 'voxel_inside');
      }
    };
  },
  getInstanceWorldBoundsForRender: context.getInstanceWorldBoundsForRender,
  worldBoundsIntersectXY: context.worldBoundsIntersectXY,
  Set,
};
vm.createContext(bundleContext);
vm.runInContext(bundleSource.slice(bundleStart, bundleEnd), bundleContext);
const bundleVisible = bundleContext.filterInstancesForMainCameraScope(
  [sprite, inside, outside],
  { cameraCullingEnabled: true, cullingWorldBounds: { minX: 0, minY: 0, maxX: 5, maxY: 5 } }
);
assert(bundleCullingInput.length === 2 && bundleCullingInput.every((inst) => inst !== sprite),
  'runtime bundle must bypass proxy culling for the Habbo sprite');
assert(bundleVisible.length === 2 && bundleVisible[0] === sprite && bundleVisible[1] === inside,
  'runtime bundle must preserve sprite visibility and source order');

console.log('PASS habbo-dynamic-camera-culling');
