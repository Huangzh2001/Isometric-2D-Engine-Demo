#!/usr/bin/env node
/*
 * P6a render builder boundary check.
 * Ensures static world renderable construction is owned by application/render,
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
const renderRel = 'src/presentation/render/render.js';
const facadeRel = 'src/presentation/render/renderables/static-renderable-facade.js';

if (!exists(builderRel)) errors.push(`missing builder: ${builderRel}`);
if (!exists(renderRel)) errors.push(`missing render file: ${renderRel}`);
if (!exists(facadeRel)) errors.push(`missing static renderable facade: ${facadeRel}`);

const builderSource = exists(builderRel) ? read(builderRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';
const facadeSource = exists(facadeRel) ? read(facadeRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  htmlLoadsBefore(source, builderRel, renderRel, htmlRel);
  htmlLoadsBefore(source, facadeRel, renderRel, htmlRel);
}

if (!builderSource.includes('buildStaticWorldChunkRenderables')) {
  errors.push(`${builderRel}: must own buildStaticWorldChunkRenderables`);
}
if (!builderSource.includes('window.__STATIC_WORLD_RENDERABLE_BUILDER__') && !builderSource.includes('global.__STATIC_WORLD_RENDERABLE_BUILDER__')) {
  errors.push(`${builderRel}: must expose __STATIC_WORLD_RENDERABLE_BUILDER__`);
}
if (!builderSource.includes("layer: 'application/render'") && !builderSource.includes('layer: "application/render"')) {
  warnings.push(`${builderRel}: summarizeBoundary should identify application/render layer`);
}
const forbiddenBuilderPatterns = [
  { pattern: /\bctx\s*\./, reason: 'canvas context drawing' },
  { pattern: /\bdocument\s*\./, reason: 'DOM access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /\blocalStorage\s*\./, reason: 'storage access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' }
];
for (const item of forbiddenBuilderPatterns) {
  if (item.pattern.test(builderSource)) errors.push(`${builderRel}: forbidden ${item.reason}`);
}

const builderFacadeSource = facadeSource || renderSource;
if (!builderFacadeSource.includes('requireStaticWorldRenderableBuilderForRender')) {
  errors.push(`${facadeRel}: missing requireStaticWorldRenderableBuilderForRender wrapper`);
}
if (!builderFacadeSource.includes('createStaticWorldRenderableBuilderDepsForRender')) {
  errors.push(`${facadeRel}: missing explicit builder dependency factory`);
}
if (!builderFacadeSource.includes('.buildStaticWorldChunkRenderables(')) {
  errors.push(`${facadeRel}: wrapper must delegate to builder.buildStaticWorldChunkRenderables`);
}
if (renderSource.includes('function requireStaticWorldRenderableBuilderForRender(')) {
  errors.push(`${renderRel}: static renderable builder lookup must stay in ${facadeRel}`);
}
if (renderSource.includes('function createStaticWorldRenderableBuilderDepsForRender(')) {
  errors.push(`${renderRel}: static renderable builder deps must stay in ${facadeRel}`);
}
if (renderSource.includes('var surfaceCells = Array.isArray(surfaceCache.surfaceCells)')) {
  errors.push(`${renderRel}: still owns static world chunk renderable builder body`);
}
if (renderSource.includes('var colorBuildStats = {') && renderSource.includes('step4a_colorCacheLookupMs')) {
  errors.push(`${renderRel}: still owns static renderable color-build stats body`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: listRootHtml(),
  builderRel,
  renderRel,
  facadeRel,
  errors,
  warnings
};

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
