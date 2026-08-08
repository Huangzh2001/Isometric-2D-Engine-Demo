const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const root = path.join(__dirname, '..');
const itemSource = fs.readFileSync(path.join(root, 'src/core/domain/item-facing-core.js'), 'utf8');
const sourceComposite = fs.readFileSync(path.join(root, 'src/presentation/render/sprites/habbo-composite-renderer.js'), 'utf8');
const sourceConsumer = fs.readFileSync(path.join(root, 'src/presentation/render/optimization/shared-render-optimization-pixi-dynamic-renderable-consumer.js'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');

const coreContext = { window: { __APP_NAMESPACE: { bind() {} } }, Math, Number, String, Object, Array, JSON, parseInt };
vm.createContext(coreContext);
vm.runInContext(itemSource, coreContext);
const facing = coreContext.window.__ITEM_FACING_CORE__;
assert(typeof facing.resolveViewRelativeFacing === 'function', 'item-facing core must expose a canonical view-relative facing helper');
assert([0,1,2,3].map(view => facing.resolveViewRelativeFacing(0, view)).join(',') === '0,3,2,1', 'world-facing 0 should expose four camera-relative faces');
assert([0,1,2,3].map(view => facing.resolveViewRelativeFacing(2, view)).join(',') === '2,1,0,3', 'world-facing 2 should remain stable in world space while camera changes');

assert(sourceComposite.includes('resolveHabboVisualFacing(rotation)'), 'Habbo composite source must resolve visual facing from world rotation and camera rotation');
assert(sourceComposite.includes('getHabboRoomOrigin(prefab, origin, anchor, rotation)'), 'room origin must continue to use persistent world rotation');
assert(sourceConsumer.includes("'visual=' + Number(composite.visualFacing"), 'Pixi texture key must include camera-relative visual facing');
assert(bundle.includes('HZH-HABBO-VIEW-STABILITY-V2'), 'runtime bundle must include the view-stability parity patch');
assert(bundle.includes("'visual='+Number(composite.visualFacing"), 'runtime Pixi texture key must change when the visible Habbo face changes');

const hotfixIndex = bundle.lastIndexOf('/* HZH-HABBO-VIEW-STABILITY-V2');
assert(hotfixIndex >= 0, 'runtime hotfix block must be present');
const hotfix = bundle.slice(hotfixIndex);
let currentView = 0;
const originalCalls = [];
const habboApi = {
  getHabboLayerConfigList(prefab, rotation) { originalCalls.push(['layers', rotation]); return [{ rotation }]; },
  getHabboComposite(prefab, rotation) { originalCalls.push(['composite', rotation]); return { canvas: {}, width: 16, height: 16, nativeRotation: rotation }; },
  buildHabboComposite(prefab, rotation) { return { canvas: {}, width: 16, height: 16, nativeRotation: rotation }; },
  habboCompositeCacheKey(prefab, rotation) { return `base|${rotation}`; }
};
const checkboxMap = {
  showPixiPlayerChunkDebugOverlay: { checked: true },
  showItemFacingDebug: { checked: true },
  showHabboDebugOverlay: { checked: true }
};
const storage = new Map([['pixiPlayerChunkDebugOverlay', '1']]);
const context = {
  window: null,
  globalThis: null,
  Math, Number, String, Object, Array, JSON,
  setTimeout(fn) { fn(); },
  document: { getElementById(id) { return checkboxMap[id] || null; } },
  localStorage: { getItem(k) { return storage.get(k) || null; }, setItem(k, v) { storage.set(k, String(v)); } },
  editor: { rotation: 0 },
  App: { state: { runtimeState: { editor: {} } } },
  __ITEM_FACING_CORE__: facing,
  __APP_PRESENTATION_HABBO_COMPOSITE_RENDERER__: habboApi,
  __HABBO_COMPOSITE_RENDERER__: habboApi,
  IsometricHabboCompositeRenderer: habboApi,
  __APP_PRESENTATION_PREFAB_SPRITE_RENDERER__: { prefabHasSprite(prefab) { return !!(prefab && prefab.sprite); } },
  prototypes: []
};
context.window = context;
context.globalThis = context;
context.App.state.runtimeState.editor = { get visualRotation() { return currentView; } };
vm.createContext(context);
vm.runInContext(hotfix, context, { filename: 'runtime-hotfix' });
const visualResults = [];
for (currentView = 0; currentView < 4; currentView += 1) {
  visualResults.push(context.__HABBO_COMPOSITE_RENDERER__.getHabboComposite({ id: 'four' }, 0).visualFacing);
}
assert(visualResults.join(',') === '0,3,2,1', `runtime Habbo API must select a different native face after each view rotation; got ${visualResults}`);
assert(originalCalls.filter(x => x[0] === 'composite').map(x => x[1]).join(',') === '0,3,2,1', 'runtime wrapper must pass relative facing into the original compositor');
assert(Object.values(checkboxMap).every(el => el.checked === false), 'all green visual diagnostics must be forced off at boot');
assert(storage.get('pixiPlayerChunkDebugOverlay') === '0' && storage.get('pixiPlayerChunkDebugOverlayV2') === '0', 'old default-on Pixi debug state must be migrated off');
console.log('PASS habbo-view-relative-facing-runtime', visualResults.join(','));
