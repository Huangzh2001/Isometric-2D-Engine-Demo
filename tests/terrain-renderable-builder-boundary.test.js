#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function indexOfOrFail(source, needle) {
  const idx = source.indexOf(needle);
  assert(idx >= 0, `missing ${needle}`);
  return idx;
}
function bodyOf(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert(start >= 0, `missing function ${functionName}`);
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
  throw new Error(`unterminated function ${functionName}`);
}

const ownerRel = 'src/presentation/render/terrain/terrain-renderable-builder.js';
const renderRel = 'src/presentation/render/render.js';
const indexRel = 'index.html';

const ownerSource = read(ownerRel);
const renderSource = read(renderRel);
const indexSource = read(indexRel);

assert(ownerSource.includes("phase: PHASE") || ownerSource.includes("P12a-1"), 'owner must declare P12a-1 phase');
assert(ownerSource.includes("layer: LAYER") || ownerSource.includes("presentation/render/terrain"), 'owner must declare presentation/render/terrain layer');
assert(indexOfOrFail(indexSource, ownerRel) < indexOfOrFail(indexSource, renderRel), 'terrain owner must load before render.js');

for (const forbidden of ['localStorage', 'sessionStorage', 'fetch(', 'document.', 'querySelector', 'getElementById']) {
  assert(!ownerSource.includes(forbidden), `${ownerRel} must not contain ${forbidden}`);
}

for (const marker of [
  'function requireTerrainRenderableBuilderForRender()',
  'function createTerrainRenderableBuilderDepsForRender()',
  'P12a-1 note: terrain runtime/chunk/face renderable construction is delegated',
  'requireTerrainRenderableBuilderForRender().buildScopedTerrainRenderables',
  'requireTerrainRenderableBuilderForRender().buildTerrainChunkBatchedRenderables',
]) {
  assert(renderSource.includes(marker), `render.js missing terrain delegation marker ${marker}`);
}

for (const fn of [
  'terrainModelHasData',
  'getTerrainChunkSurfaceSources',
  'buildTerrainChunkBatchedRenderables',
  'buildTerrainFaceRenderableItem',
  'buildScopedTerrainRenderables',
]) {
  const body = bodyOf(renderSource, fn);
  assert(body.includes('requireTerrainRenderableBuilderForRender()'), `${fn} must delegate to terrain owner`);
}

assert(!bodyOf(renderSource, 'buildScopedTerrainRenderables').includes('terrain-face-color-summary'), 'buildScopedTerrainRenderables wrapper must not own terrain summary logging body');
assert(!bodyOf(renderSource, 'buildTerrainChunkBatchedRenderables').includes('batchMap = new Map'), 'buildTerrainChunkBatchedRenderables wrapper must not own batch grouping body');
assert(!bodyOf(renderSource, 'buildTerrainFaceRenderableItem').includes("renderPath: 'terrain-voxel-face'"), 'buildTerrainFaceRenderableItem wrapper must not own terrain face renderable body');

const ownerBytes = Buffer.byteLength(ownerSource, 'utf8');
assert(ownerBytes < 64 * 1024, `terrain owner should stay below 64KB, got ${ownerBytes}`);

const sandbox = { console, Math, Object, Array, Number, String, Map, Set, JSON, Date, Error };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(ownerSource, sandbox, { filename: ownerRel });
const api = sandbox.IsometricTerrainRenderableBuilder;
assert(api, 'terrain renderable builder API should be exported');
for (const fn of [
  'terrainModelHasData',
  'getTerrainChunkKey',
  'buildTerrainFaceWorldPolygon',
  'buildTerrainChunkBatchedRenderables',
  'buildScopedTerrainRenderables',
  'getTerrainRuntimeSummary',
]) {
  assert.strictEqual(typeof api[fn], 'function', `missing ${fn}`);
}
assert.strictEqual(JSON.stringify(api.buildTerrainFaceWorldPolygon(0, 0, 'top', 0, 1, {})), JSON.stringify([
  { x: 0, y: 0, z: 1 },
  { x: 1, y: 0, z: 1 },
  { x: 1, y: 1, z: 1 },
  { x: 0, y: 1, z: 1 },
]));

console.log('PASS terrain-renderable-builder-boundary');
