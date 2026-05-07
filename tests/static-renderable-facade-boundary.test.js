const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}
const ownerRel = 'src/presentation/render/renderables/static-renderable-facade.js';
const owner = fs.readFileSync(path.join(root, ownerRel), 'utf8');
const context = {
  console,
  Map,
  Set,
  __STATIC_WORLD_RENDERABLE_BUILDER__: {
    buildStaticWorldChunkRenderables(chunk, options, deps) {
      return { chunk, options, deps, ok: typeof deps.perfNow === 'function' };
    }
  },
  __STATIC_WORLD_RENDER_CACHE_COORDINATOR__: {
    rebuildStaticWorldRenderCache(payload, deps) {
      return { payload, deps, ok: typeof deps.buildStaticWorldChunkRenderables === 'function' };
    }
  },
  perfNow: () => 123,
  getMainCameraRenderScope: () => ({ scope: true }),
  boxes: [{ id: 'box-a' }],
  instances: [{ instanceId: 'inst-a' }],
  staticBoxRenderCache: { entries: [] }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(owner, context, { filename: ownerRel });
assert(context.IsometricStaticRenderableFacade, 'facade API should be registered');
assert(typeof context.buildStaticWorldChunkRenderables === 'function', 'buildStaticWorldChunkRenderables global should exist');
assert(typeof context.rebuildStaticBoxRenderCacheIfNeeded === 'function', 'rebuildStaticBoxRenderCacheIfNeeded global should exist');
const built = context.buildStaticWorldChunkRenderables({ id: 'chunk-a' }, { force: true });
assert(built && built.ok === true, 'builder should receive injected deps');
assert(built.deps && built.deps.getMainCameraRenderScope === context.getMainCameraRenderScope, 'builder deps should resolve global functions');
const rebuilt = context.rebuildStaticBoxRenderCacheIfNeeded(true);
assert(rebuilt && rebuilt.ok === true, 'cache coordinator should receive injected deps');
assert(rebuilt.payload && rebuilt.payload.force === true, 'cache coordinator payload should preserve force flag');
assert(Array.isArray(rebuilt.payload.boxes) && rebuilt.payload.boxes.length === 1, 'cache coordinator should read global boxes');
console.log('PASS static-renderable-facade-boundary');
