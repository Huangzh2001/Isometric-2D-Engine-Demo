const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/presentation/render/instances/instance-renderable-builder.js'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');
const prefabs = new Map();
const context = {
  window: { App: { state: { prefabRegistry: null } } },
  Map,
  perfNow() { return 0; },
  prefabHasSprite(prefab) { return !!(prefab && prefab.sprite); },
  getPrefabById(id) { return prefabs.get(id) || null; },
  filterInstancesForMainCameraScope(list) { return list; },
  boxes: [],
  getHabboInstanceVisualShift() { return { x: 0, y: 0 }; },
  withScreenTranslate(shift, fn) { fn(); },
  drawBox() {}
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(source, context);
const list = [{ instanceId: 'h1', prefabId: 'late', renderUpdateMode: 'static' }];
let split = context.getDynamicInstanceSplitForRender(list);
assert(split.staticInstances.length === 1, 'before prefab registration, instance may be classified static');
prefabs.set('late', { id: 'late', sprite: { image: 'chair.png' }, renderUpdateMode: 'static' });
split = context.getDynamicInstanceSplitForRender(list);
assert(split.dynamicInstances.length === 1 && split.staticInstances.length === 0, 'same array and same length must be reclassified after sprite prefab registration');
assert(context.window.__DYNAMIC_INSTANCE_SPLIT_LAST__.spriteDynamicIds[0] === 'h1', 'diagnostics must identify retained sprite instances');
assert(bundle.includes('dynamic-instance-split-sprite-stable-v3-bundle'), 'runtime bundle must directly contain stable dynamic split logic');
assert(!bundle.includes('__renderDynamicInstanceCache.source===list&&__renderDynamicInstanceCache.length===list.length'), 'runtime bundle must not reuse a split based only on array identity and length');
assert(bundle.includes('retainedTransientDynamicSprites'), 'runtime bundle must report transient sprite retention');
assert(bundle.includes('orphanRemovalGraceFrames:2'), 'runtime bundle must keep missing dynamic sprites for a two-frame grace period');
console.log('PASS habbo-dynamic-split-stability');
