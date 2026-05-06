#!/usr/bin/env node
/*
 * P7 render-order boundary check.
 * Verifies that pure order utilities live in core/domain/render-order-core.js
 * and that render/application layers only delegate through the core wrapper.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}
function htmlLoadsBefore(htmlSource, before, after, htmlRel) {
  const beforeIdx = htmlSource.indexOf(before);
  const afterIdx = htmlSource.indexOf(after);
  if (afterIdx < 0) return;
  if (beforeIdx < 0) errors.push(`${htmlRel}: missing required render-order core ${before}`);
  else if (beforeIdx > afterIdx) errors.push(`${htmlRel}: ${before} must load before ${after}`);
}
function hasFunction(source, name) {
  return new RegExp('function\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(').test(source);
}

const coreRel = 'src/core/domain/render-order-core.js';
const renderRel = 'src/presentation/render/render.js';
const assemblerRel = 'src/application/render/main-frame-renderable-assembler.js';
const bindingsRel = 'src/infrastructure/bootstrap/core-domain-bindings.js';

if (!exists(coreRel)) errors.push(`missing ${coreRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);
if (!exists(assemblerRel)) errors.push(`missing ${assemblerRel}`);
if (!exists(bindingsRel)) errors.push(`missing ${bindingsRel}`);

const coreSource = exists(coreRel) ? read(coreRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';
const assemblerSource = exists(assemblerRel) ? read(assemblerRel) : '';
const bindingsSource = exists(bindingsRel) ? read(bindingsRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  htmlLoadsBefore(source, coreRel, 'src/application/render/static-world-renderable-builder.js', htmlRel);
  htmlLoadsBefore(source, coreRel, 'src/application/render/static-world-render-cache-coordinator.js', htmlRel);
  htmlLoadsBefore(source, coreRel, 'src/application/render/main-frame-renderable-assembler.js', htmlRel);
  htmlLoadsBefore(source, coreRel, 'src/presentation/render/render.js', htmlRel);
}

for (const name of [
  'compareRenderableOrder',
  'sortRenderablesByOrder',
  'mergeSortedRenderables',
  'insertRenderableIntoSortedOrder',
  'getRenderableStaticOrderSignature'
]) {
  if (!hasFunction(coreSource, name)) errors.push(`${coreRel}: missing core function ${name}`);
}

if (!coreSource.includes("layer: 'core/domain'")) errors.push(`${coreRel}: must identify layer core/domain`);
if (/\bctx\s*\./.test(coreSource)) errors.push(`${coreRel}: must not draw through ctx`);
if (/\bdocument\s*\./.test(coreSource)) errors.push(`${coreRel}: must not access DOM`);
if (/\blocalStorage\s*\./.test(coreSource)) errors.push(`${coreRel}: must not read localStorage`);
if (/\bnew\s+Image\b/.test(coreSource)) errors.push(`${coreRel}: must not allocate Image`);
if (!bindingsSource.includes('domain.renderOrderCore')) errors.push(`${bindingsRel}: must bind domain.renderOrderCore`);

for (const marker of [
  'requireRenderOrderCoreForRender().compareRenderableOrder',
  'requireRenderOrderCoreForRender().mergeSortedRenderables',
  'requireRenderOrderCoreForRender().insertRenderableIntoSortedOrder',
  'requireRenderOrderCoreForRender().getRenderableStaticOrderSignature'
]) {
  if (!renderSource.includes(marker)) errors.push(`${renderRel}: missing delegation marker ${marker}`);
}

const forbiddenRenderBodies = [
  { snippet: 'while (i < staticRenderables.length && j < dynamicRenderables.length)', reason: 'merge loop belongs in render-order-core' },
  { snippet: 'var firstStaticId =', reason: 'static order signature body belongs in render-order-core' },
  { snippet: 'var lo = 0;\n  var hi = list.length;', reason: 'binary insertion body belongs in render-order-core' }
];
for (const item of forbiddenRenderBodies) {
  if (renderSource.includes(item.snippet)) errors.push(`${renderRel}: ${item.reason}`);
}

if (assemblerSource.includes('dynamicRenderables.sort(compareRenderablesByDomain)')) {
  errors.push(`${assemblerRel}: dynamic renderable sorting must use render-order-core wrapper, not direct comparator sort`);
}
if (!assemblerSource.includes('sortRenderablesByOrderForRender(dynamicRenderables)')) {
  errors.push(`${assemblerRel}: missing sortRenderablesByOrderForRender(dynamicRenderables) delegation`);
}
if (!renderSource.includes('function sortRenderablesByOrderForRender')) {
  errors.push(`${renderRel}: missing sortRenderablesByOrderForRender wrapper`);
}
if (!renderSource.includes('requireRenderOrderCoreForRender().sortRenderablesByOrder')) {
  errors.push(`${renderRel}: sortRenderablesByOrderForRender must delegate to render-order-core`);
}

const report = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
