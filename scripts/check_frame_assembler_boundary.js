#!/usr/bin/env node
/*
 * P6c frame assembler boundary check.
 * Ensures main-frame renderable assembly is owned by application/render,
 * while presentation/render/render.js keeps only thin wrappers.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}
function htmlLoadsBefore(source, before, after, htmlRel) {
  const beforeIdx = source.indexOf(before);
  const afterIdx = source.indexOf(after);
  if (afterIdx < 0) return;
  if (beforeIdx < 0) errors.push(`${htmlRel}: missing ${before}`);
  else if (beforeIdx > afterIdx) errors.push(`${htmlRel}: ${before} must load before ${after}`);
}

const builderRel = 'src/application/render/static-world-renderable-builder.js';
const coordinatorRel = 'src/application/render/static-world-render-cache-coordinator.js';
const assemblerRel = 'src/application/render/main-frame-renderable-assembler.js';
const renderRel = 'src/presentation/render/render.js';

for (const rel of [builderRel, coordinatorRel, assemblerRel, renderRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const assemblerSource = exists(assemblerRel) ? read(assemblerRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  htmlLoadsBefore(source, builderRel, coordinatorRel, htmlRel);
  htmlLoadsBefore(source, coordinatorRel, assemblerRel, htmlRel);
  htmlLoadsBefore(source, assemblerRel, renderRel, htmlRel);
}

if (!assemblerSource.includes('buildRenderablesForMainFrameAssembler')) {
  errors.push(`${assemblerRel}: must own raw main-frame buildRenderables body`);
}
if (!assemblerSource.includes('buildMainFrameRenderablesForMainFrameAssembler')) {
  errors.push(`${assemblerRel}: must own buildMainFrameRenderables body`);
}
if (!assemblerSource.includes('global.__MAIN_FRAME_RENDERABLE_ASSEMBLER__')) {
  errors.push(`${assemblerRel}: must expose __MAIN_FRAME_RENDERABLE_ASSEMBLER__`);
}
if (!assemblerSource.includes("layer: 'application/render'") && !assemblerSource.includes('layer: "application/render"')) {
  warnings.push(`${assemblerRel}: summarizeBoundary should identify application/render layer`);
}

const forbiddenAssemblerPatterns = [
  { pattern: /\bctx\s*\./, reason: 'direct canvas context drawing' },
  { pattern: /\bdocument\s*\./, reason: 'DOM access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\bdrawImage\s*\(/, reason: 'direct image draw' }
];
for (const item of forbiddenAssemblerPatterns) {
  if (item.pattern.test(assemblerSource)) errors.push(`${assemblerRel}: forbidden ${item.reason}`);
}
if (/\blocalStorage\s*\./.test(assemblerSource)) {
  errors.push(`${assemblerRel}: must not read localStorage directly; use presentation diagnostics wrappers`);
}
if (!assemblerSource.includes('noteActorInteractionRenderEntryForRender')) {
  errors.push(`${assemblerRel}: actor interaction render-entry diagnostics must use noteActorInteractionRenderEntryForRender wrapper`);
}

if (!renderSource.includes('requireMainFrameRenderableAssemblerForRender')) {
  errors.push(`${renderRel}: missing requireMainFrameRenderableAssemblerForRender wrapper`);
}
if (!renderSource.includes('.buildRenderables()')) {
  errors.push(`${renderRel}: buildRenderables wrapper must delegate to assembler.buildRenderables()`);
}
if (!renderSource.includes('.buildMainFrameRenderables()')) {
  errors.push(`${renderRel}: buildMainFrameRenderables wrapper must delegate to assembler.buildMainFrameRenderables()`);
}
const renderBuildStart = renderSource.indexOf('function buildRenderables()');
const renderBuildEnd = renderBuildStart >= 0 ? renderSource.indexOf('function drawMainFrameRenderablesLocal', renderBuildStart) : -1;
const renderBuildRegion = renderBuildStart >= 0 && renderBuildEnd > renderBuildStart ? renderSource.slice(renderBuildStart, renderBuildEnd) : '';
if (renderBuildRegion.includes('beginRenderFrameDiagnosticState')) {
  errors.push(`${renderRel}: still owns raw frame renderable assembly body`);
}
if (renderBuildRegion.includes('dynamicLoop.total')) {
  errors.push(`${renderRel}: still owns dynamic renderables assembly body`);
}
if (renderBuildRegion.includes('mergeSortedRenderables(')) {
  errors.push(`${renderRel}: still owns static/dynamic merge assembly body`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: listRootHtml(),
  assemblerRel,
  renderRel,
  errors,
  warnings
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
