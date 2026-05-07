#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function bodyOf(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}

const ownerRel = 'src/presentation/render/terrain/terrain-renderable-builder.js';
const renderRel = 'src/presentation/render/render.js';
const indexRel = 'index.html';
const errors = [];
const warnings = [];

if (!exists(ownerRel)) errors.push(`missing ${ownerRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);
if (!exists(indexRel)) errors.push(`missing ${indexRel}`);

let ownerSource = '';
let renderSource = '';
let indexSource = '';
if (!errors.length) {
  ownerSource = read(ownerRel);
  renderSource = read(renderRel);
  indexSource = read(indexRel);
  const ownerIndex = indexSource.indexOf(ownerRel);
  const renderIndex = indexSource.indexOf(renderRel);
  if (ownerIndex < 0) errors.push(`index.html does not load ${ownerRel}`);
  if (renderIndex < 0) errors.push(`index.html does not load ${renderRel}`);
  if (ownerIndex >= 0 && renderIndex >= 0 && ownerIndex > renderIndex) errors.push(`${ownerRel} must load before ${renderRel}`);

  for (const marker of [
    'function requireTerrainRenderableBuilderForRender()',
    'function createTerrainRenderableBuilderDepsForRender()',
    'P12a-1 note: terrain runtime/chunk/face renderable construction is delegated',
  ]) {
    if (!renderSource.includes(marker)) errors.push(`render.js missing marker: ${marker}`);
  }

  for (const fn of [
    'terrainModelHasData',
    'getTerrainChunkSurfaceSources',
    'buildTerrainChunkBatchedRenderables',
    'buildTerrainFaceRenderableItem',
    'buildScopedTerrainRenderables',
  ]) {
    const body = bodyOf(renderSource, fn);
    if (!body.includes('requireTerrainRenderableBuilderForRender()')) errors.push(`${fn} must delegate to terrain owner`);
  }

  const forbiddenOwner = ['localStorage', 'sessionStorage', 'fetch(', 'document.', 'querySelector', 'getElementById'];
  for (const marker of forbiddenOwner) {
    if (ownerSource.includes(marker)) errors.push(`${ownerRel} must not contain ${marker}`);
  }

  if (bodyOf(renderSource, 'buildScopedTerrainRenderables').includes('terrain-render-pipeline-check')) errors.push('buildScopedTerrainRenderables wrapper still owns terrain pipeline logging body');
  if (bodyOf(renderSource, 'buildTerrainChunkBatchedRenderables').includes('batchMap = new Map')) errors.push('buildTerrainChunkBatchedRenderables wrapper still owns batch grouping body');
  if (bodyOf(renderSource, 'buildTerrainFaceRenderableItem').includes("renderPath: 'terrain-voxel-face'")) errors.push('buildTerrainFaceRenderableItem wrapper still owns terrain face renderable body');

  const ownerBytes = Buffer.byteLength(ownerSource, 'utf8');
  if (ownerBytes >= 64 * 1024) errors.push(`${ownerRel} is too large (${ownerBytes} bytes); split before adding more terrain logic`);
  if (ownerBytes >= 48 * 1024) warnings.push(`${ownerRel} is near large-node territory (${ownerBytes} bytes); do not add unrelated terrain duties`);
}

const report = { status: errors.length ? 'FAIL' : 'PASS', ownerRel, renderRel, errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
