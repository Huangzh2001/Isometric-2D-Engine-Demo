#!/usr/bin/env node
/*
 * P6b render-cache coordinator boundary check.
 * Ensures static world cache rebuild orchestration is owned by application/render,
 * while presentation/render/render.js keeps only a thin wrapper.
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
const renderRel = 'src/presentation/render/render.js';

if (!exists(builderRel)) errors.push(`missing builder: ${builderRel}`);
if (!exists(coordinatorRel)) errors.push(`missing coordinator: ${coordinatorRel}`);
if (!exists(renderRel)) errors.push(`missing render file: ${renderRel}`);

const coordinatorSource = exists(coordinatorRel) ? read(coordinatorRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  htmlLoadsBefore(source, builderRel, coordinatorRel, htmlRel);
  htmlLoadsBefore(source, coordinatorRel, renderRel, htmlRel);
}

if (!coordinatorSource.includes('rebuildStaticWorldRenderCache')) {
  errors.push(`${coordinatorRel}: must own rebuildStaticWorldRenderCache`);
}
if (!coordinatorSource.includes('global.__STATIC_WORLD_RENDER_CACHE_COORDINATOR__')) {
  errors.push(`${coordinatorRel}: must expose __STATIC_WORLD_RENDER_CACHE_COORDINATOR__`);
}
if (!coordinatorSource.includes("layer: 'application/render'") && !coordinatorSource.includes('layer: "application/render"')) {
  warnings.push(`${coordinatorRel}: summarizeBoundary should identify application/render layer`);
}
const forbiddenCoordinatorPatterns = [
  { pattern: /\bctx\s*\./, reason: 'direct drawing' },
  { pattern: /\bdocument\s*\./, reason: 'DOM access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /\blocalStorage\s*\./, reason: 'storage access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' }
];
for (const item of forbiddenCoordinatorPatterns) {
  if (item.pattern.test(coordinatorSource)) errors.push(`${coordinatorRel}: forbidden ${item.reason}`);
}

if (!renderSource.includes('requireStaticWorldRenderCacheCoordinatorForRender')) {
  errors.push(`${renderRel}: missing requireStaticWorldRenderCacheCoordinatorForRender wrapper`);
}
if (!renderSource.includes('createStaticWorldRenderCacheCoordinatorDepsForRender')) {
  errors.push(`${renderRel}: missing explicit coordinator dependency factory`);
}
if (!renderSource.includes('.rebuildStaticWorldRenderCache(')) {
  errors.push(`${renderRel}: wrapper must delegate to coordinator.rebuildStaticWorldRenderCache`);
}
const rebuildWrapperStart = renderSource.indexOf('function rebuildStaticBoxRenderCacheIfNeeded');
const rebuildWrapperEnd = rebuildWrapperStart >= 0 ? renderSource.indexOf('function mergeSortedRenderables', rebuildWrapperStart) : -1;
const rebuildWrapperSource = rebuildWrapperStart >= 0 && rebuildWrapperEnd > rebuildWrapperStart ? renderSource.slice(rebuildWrapperStart, rebuildWrapperEnd) : '';
if (rebuildWrapperSource.includes('const profileStartAt = perfNow')) {
  errors.push(`${renderRel}: still owns static cache rebuild body`);
}
if (renderSource.includes('staticWorldCacheApi.collectVisibleRenderables({')) {
  errors.push(`${renderRel}: still directly owns collectVisibleRenderables orchestration`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: listRootHtml(),
  builderRel,
  coordinatorRel,
  renderRel,
  errors,
  warnings
};

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
