#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function assertLoadsBefore(html, before, after) {
  const beforeIdx = html.indexOf(before);
  const afterIdx = html.indexOf(after);
  assert(beforeIdx >= 0, `missing ${before}`);
  assert(afterIdx >= 0, `missing ${after}`);
  assert(beforeIdx < afterIdx, `${before} must load before ${after}`);
}

const assemblerRel = 'src/application/render/main-frame-renderable-assembler.js';
const renderRel = 'src/presentation/render/render.js';
assert(exists(assemblerRel), 'main frame renderable assembler must exist');
assert(exists(renderRel), 'render.js must exist');

const assemblerSource = read(assemblerRel);
const renderSource = read(renderRel);
const indexHtml = read('index.html');

assertLoadsBefore(indexHtml, 'src/application/render/static-world-render-cache-coordinator.js', assemblerRel);
assertLoadsBefore(indexHtml, assemblerRel, 'src/presentation/render/render.js');

assert(assemblerSource.includes('buildRenderablesForMainFrameAssembler'), 'assembler should own raw buildRenderables body');
assert(assemblerSource.includes('buildMainFrameRenderablesForMainFrameAssembler'), 'assembler should own main frame finalization body');
assert(assemblerSource.includes('global.__MAIN_FRAME_RENDERABLE_ASSEMBLER__'), 'assembler should expose global API');
assert(assemblerSource.includes("layer: 'application/render'"), 'assembler should identify application/render layer');
assert(!/\bctx\s*\./.test(assemblerSource), 'assembler must not draw through ctx directly');
assert(!/\bdocument\s*\./.test(assemblerSource), 'assembler must not access DOM directly');
assert(!/\bnew\s+Image\b/.test(assemblerSource), 'assembler must not allocate Image directly');
assert(!/\bdrawImage\s*\(/.test(assemblerSource), 'assembler must not draw images directly');
assert(!assemblerSource.includes('__lastRenderFrameSummaryLogAt'), 'assembler must not read migrated render diagnostics state directly');
assert(assemblerSource.includes('shouldForceExactVisibleSummaryForRender'), 'assembler should ask render diagnostics wrapper whether exact visible summary should be forced');
assert(!/\blocalStorage\s*\./.test(assemblerSource), 'assembler must not read localStorage directly');
assert(!assemblerSource.includes('__actorInteractionOrderDiagState'), 'assembler must not touch actor interaction diagnostic runtime state directly');
assert(assemblerSource.includes('noteActorInteractionRenderEntryForRender'), 'assembler should use render diagnostics wrapper for actor render-entry diagnostics');

assert(renderSource.includes('requireMainFrameRenderableAssemblerForRender'), 'render.js should require assembler through wrapper');
assert(renderSource.includes('return requireMainFrameRenderableAssemblerForRender().buildRenderables();'), 'render.js buildRenderables should delegate');
assert(renderSource.includes('return requireMainFrameRenderableAssemblerForRender().buildMainFrameRenderables();'), 'render.js buildMainFrameRenderables should delegate');
const renderBuildRegion = renderSource.slice(
  renderSource.indexOf('function buildRenderables()'),
  renderSource.indexOf('function drawMainFrameRenderablesLocal')
);
assert(!renderBuildRegion.includes('beginRenderFrameDiagnosticState'), 'render.js must not retain raw frame assembly body');
assert(!renderBuildRegion.includes('dynamicLoop.total'), 'render.js must not retain dynamic assembly body');

console.log(JSON.stringify({ status: 'PASS', test: 'main-frame-renderable-assembler' }, null, 2));
