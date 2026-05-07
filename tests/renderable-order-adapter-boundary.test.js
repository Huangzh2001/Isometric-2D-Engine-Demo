#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rel = 'src/presentation/render/renderables/renderable-order-adapter.js';
const source = fs.readFileSync(path.join(root, rel), 'utf8');
const renderSource = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function assertLoadsBefore(before, after) {
  const beforeIdx = indexHtml.indexOf(before);
  const afterIdx = indexHtml.indexOf(after);
  assert(beforeIdx >= 0, `missing ${before}`);
  assert(afterIdx >= 0, `missing ${after}`);
  assert(beforeIdx < afterIdx, `${before} must load before ${after}`);
}

assertLoadsBefore(rel, 'src/presentation/render/render.js');
assertLoadsBefore('src/core/domain/render-order-core.js', rel);
assertLoadsBefore('src/core/domain/view-rotation-core.js', rel);

assert(source.includes("layer: 'presentation/render/renderables'"), 'adapter should identify presentation/render/renderables layer');
assert(source.includes('render-facing-sort-meta-adapter'), 'adapter should own sort meta adapter');
assert(source.includes('orderCore.mergeSortedRenderables'), 'adapter should delegate merge to render-order core API');
assert(source.includes('orderCore.compareRenderableOrder'), 'adapter should delegate compare fallback to render-order core API');
assert(!/\bctx\s*\./.test(source), 'adapter must not draw through ctx');
assert(!/\bdocument\s*\./.test(source), 'adapter must not access DOM');
assert(!/\blocalStorage\s*\./.test(source), 'adapter must not read localStorage');
assert(!/\bnew\s+Image\b/.test(source), 'adapter must not allocate Image');
assert(!source.includes('actor-interaction-replacement-packet'), 'adapter must not own actor replacement packets');
assert(!source.includes('applyStableActorSortDemergeToStaticRenderables'), 'adapter must not own stable-local demerge implementation');

assert(renderSource.includes('requireRenderableOrderAdapterForRender'), 'render.js should require renderable order adapter');
assert(renderSource.includes('return requireRenderableOrderAdapterForRender().computeViewAwareSortMeta'), 'render.js computeViewAwareSortMeta should delegate');
assert(renderSource.includes('return requireRenderableOrderAdapterForRender().mergeSortedRenderables'), 'render.js mergeSortedRenderables should delegate');
assert(!renderSource.includes('var api = getViewRotationCoreApi();\n  if (api && typeof api.computeRenderableSortMeta'), 'render.js must not retain sort-meta adapter body');
assert(!renderSource.includes('var domainCore = getDomainSceneCoreApi();\n  if (domainCore && typeof domainCore.compareRenderableOrder'), 'render.js must not retain comparator adapter body');

const sandbox = { window: {}, console, Math, Number, String, Object, Array, JSON, Date };
vm.runInNewContext(source, sandbox, { filename: rel });
const api = sandbox.window.__RENDERABLE_ORDER_ADAPTER__;
assert(api, 'adapter should expose global API');
assert.strictEqual(typeof api.computeViewAwareSortMeta, 'function');
assert.strictEqual(typeof api.compareRenderablesByDomain, 'function');
assert.strictEqual(typeof api.mergeSortedRenderables, 'function');
assert.strictEqual(api.computeViewAwareSortMeta({ x: 1, y: 2, z: 3 }, 1, 0, {}).sortKey, 7, 'fallback sortKey should be deterministic');
const rounded = api.deriveRenderableDrawPosition({ debugFoot: { x: 1.4, y: 2.6 } }, {});
assert.strictEqual(rounded.x, 1, 'draw position should round x');
assert.strictEqual(rounded.y, 3, 'draw position should round y');
const orderCore = {
  compareRenderableOrder(a, b) { return Number(a.sortKey || 0) - Number(b.sortKey || 0) || Number(a.tie || 0) - Number(b.tie || 0); },
  mergeSortedRenderables(a, b, cmp) { return (a || []).concat(b || []).sort(cmp); }
};
const deps = { requireRenderOrderCoreForRender: () => orderCore, getDomainSceneCoreApi: () => null };
assert.strictEqual(api.compareRenderablesByDomain({ sortKey: 1 }, { sortKey: 2 }, deps), -1, 'adapter compare should delegate to order core');
assert.deepStrictEqual(api.mergeSortedRenderables([{ id: 'a', sortKey: 1 }], [{ id: 'b', sortKey: 0 }], deps).map((x) => x.id), ['b', 'a'], 'adapter merge should use order-core merge');

console.log(JSON.stringify({ status: 'PASS', test: 'renderable-order-adapter-boundary' }, null, 2));
