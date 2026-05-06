#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function assertLoadsBefore(html, before, after) {
  const beforeIdx = html.indexOf(before);
  const afterIdx = html.indexOf(after);
  assert(beforeIdx >= 0, `missing ${before}`);
  assert(afterIdx >= 0, `missing ${after}`);
  assert(beforeIdx < afterIdx, `${before} must load before ${after}`);
}

const coreRel = 'src/core/domain/render-order-core.js';
const coreSource = read(coreRel);
const renderSource = read('src/presentation/render/render.js');
const indexHtml = read('index.html');
const bindingsSource = read('src/infrastructure/bootstrap/core-domain-bindings.js');

const sandbox = { window: {}, console, Math, Number, String, Object, Array, JSON };
vm.runInNewContext(coreSource, sandbox, { filename: coreRel });
const api = sandbox.window.__RENDER_ORDER_CORE__;

assert(api, 'render order core should expose window.__RENDER_ORDER_CORE__');
assert.strictEqual(sandbox.window.__APP_CORE_RENDER_ORDER_CORE__, api, 'render order core should expose bootstrap handle');
assert.strictEqual(typeof api.compareRenderableOrder, 'function', 'compareRenderableOrder should exist');
assert.strictEqual(typeof api.mergeSortedRenderables, 'function', 'mergeSortedRenderables should exist');
assert.strictEqual(typeof api.insertRenderableIntoSortedOrder, 'function', 'insertRenderableIntoSortedOrder should exist');
assert.strictEqual(typeof api.getRenderableStaticOrderSignature, 'function', 'getRenderableStaticOrderSignature should exist');

assertLoadsBefore(indexHtml, coreRel, 'src/application/render/static-world-renderable-builder.js');
assertLoadsBefore(indexHtml, coreRel, 'src/application/render/main-frame-renderable-assembler.js');
assertLoadsBefore(indexHtml, coreRel, 'src/presentation/render/render.js');
assert(bindingsSource.includes('domain.renderOrderCore'), 'bootstrap should bind render order core into App.domain');

assert(coreSource.includes("layer: 'core/domain'"), 'render order core should identify core/domain layer');
assert(!/\bctx\s*\./.test(coreSource), 'render order core must not draw through ctx');
assert(!/\bdocument\s*\./.test(coreSource), 'render order core must not access DOM');
assert(!/\blocalStorage\s*\./.test(coreSource), 'render order core must not read localStorage');
assert(!/\bnew\s+Image\b/.test(coreSource), 'render order core must not allocate Image');

assert(renderSource.includes('requireRenderOrderCoreForRender'), 'render.js should require render-order core');
assert(renderSource.includes('requireRenderOrderCoreForRender().compareRenderableOrder'), 'render compare fallback should delegate to render-order core');
assert(renderSource.includes('requireRenderOrderCoreForRender().mergeSortedRenderables'), 'render merge wrapper should delegate to render-order core');
assert(renderSource.includes('requireRenderOrderCoreForRender().insertRenderableIntoSortedOrder'), 'render binary insertion wrapper should delegate to render-order core');
assert(renderSource.includes('requireRenderOrderCoreForRender().sortRenderablesByOrder'), 'render sort wrapper should delegate to render-order core');
const assemblerSource = read('src/application/render/main-frame-renderable-assembler.js');
assert(assemblerSource.includes('sortRenderablesByOrderForRender(dynamicRenderables)'), 'main frame assembler should sort dynamic renderables through render-order wrapper');
assert(!assemblerSource.includes('dynamicRenderables.sort(compareRenderablesByDomain)'), 'main frame assembler must not sort dynamic renderables with direct comparator');
assert(renderSource.includes('requireRenderOrderCoreForRender().getRenderableStaticOrderSignature'), 'render static signature wrapper should delegate to render-order core');
assert(!renderSource.includes('while (i < staticRenderables.length && j < dynamicRenderables.length)'), 'render.js should not retain merge loop body');
assert(!renderSource.includes('var firstStaticId ='), 'render.js should not retain static order signature body');
assert(!renderSource.includes('var lo = 0;\n  var hi = list.length;'), 'render.js should not retain binary insertion body');

const staticList = [
  { id: 'a', sortKey: 1, tie: 10 },
  { id: 'c', sortKey: 3, tie: 30 }
];
const dynamicList = [
  { id: 'b', sortKey: 2, tie: 20 },
  { id: 'd', sortKey: 4, tie: 40 }
];
assert.strictEqual(JSON.stringify(api.mergeSortedRenderables(staticList, dynamicList).map((r) => r.id)), JSON.stringify(['a', 'b', 'c', 'd']), 'merge should preserve sorted order');
assert.strictEqual(JSON.stringify(api.insertRenderableIntoSortedOrder(staticList, { id: 'b', sortKey: 2, tie: 20 }).map((r) => r.id)), JSON.stringify(['a', 'b', 'c']), 'binary insertion should place dynamic renderable between static packets');
assert.strictEqual(api.compareRenderableOrder({ sortKey: 2, tie: 5 }, { sortKey: 2, tie: 7 }), -2, 'tie should break equal sort keys');
assert.strictEqual(
  api.getRenderableStaticOrderSignature([
    { id: 'static-a', sortKey: 1, tie: 1 },
    { id: 'player-avatar', kind: 'player-avatar', sortKey: 2, tie: 2 },
    { faceKey: 'static-b', sortKey: 3, tie: 3 }
  ], 5),
  '1|2|1|static-a|static-b',
  'static order signature should count static/dynamic packets and normalize rotation'
);

console.log(JSON.stringify({ status: 'PASS', test: 'render-order-core' }, null, 2));
