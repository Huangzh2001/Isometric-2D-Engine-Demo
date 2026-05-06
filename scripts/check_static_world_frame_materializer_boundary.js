#!/usr/bin/env node
/*
 * P11a-5 static world frame materializer boundary check.
 * Verifies that static world face/voxel frame materialization is owned by
 * presentation/render/renderables/static-world-frame-materializer.js and that
 * render.js delegates through thin compatibility wrappers.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function idx(source, needle) { return source.indexOf(needle); }
function bodyOf(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
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
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

const materializerRel = 'src/presentation/render/renderables/static-world-frame-materializer.js';
const renderRel = 'src/presentation/render/render.js';

if (!exists(materializerRel)) errors.push(`missing ${materializerRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);

const materializerSource = exists(materializerRel) ? read(materializerRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  const materializerIdx = idx(source, materializerRel);
  const renderIdx = idx(source, renderRel);
  if (renderIdx >= 0 && materializerIdx < 0) errors.push(`${htmlRel}: missing ${materializerRel} before render.js`);
  if (renderIdx >= 0 && materializerIdx > renderIdx) errors.push(`${htmlRel}: ${materializerRel} must load before ${renderRel}`);
}

if (!materializerSource.includes("layer: 'presentation/render/renderables'")) errors.push(`${materializerRel}: must identify presentation/render/renderables layer`);
if (!materializerSource.includes("phase: 'P11a-5'")) errors.push(`${materializerRel}: must identify P11a-5 phase`);

for (const forbidden of [
  'localStorage',
  'sessionStorage',
  'fetch(',
  'document.',
  'canvas',
  'ctx.',
  'new Image',
  'staticBoxRenderCache',
  'buildRenderables',
  'buildMainFrameRenderables'
]) {
  if (materializerSource.includes(forbidden)) errors.push(`${materializerRel}: must not contain ${forbidden}`);
}

for (const required of [
  'averageScreenPoint',
  'drawCachedVoxelFaceRenderable',
  'screenPointsFromWorldFace',
  'worldShadowOverlaysToScreen',
  'compareRenderablesByDomain'
]) {
  if (!materializerSource.includes(required)) errors.push(`${materializerRel}: missing injected dependency usage ${required}`);
}

for (const marker of [
  'function requireStaticWorldFrameMaterializerForRender()',
  'function createStaticWorldFrameMaterializerDepsForRender()',
  'P11a-5 note: static world frame materialization helpers are delegated'
]) {
  if (!renderSource.includes(marker)) errors.push(`${renderRel}: missing materializer boundary marker ${marker}`);
}

for (const fn of [
  'buildStaticVoxelFaceRenderable',
  'flattenStaticVoxelRenderable',
  'materializeStaticWorldFacePacket',
  'materializeStaticWorldFrameRenderables'
]) {
  const body = bodyOf(renderSource, fn);
  if (!body) {
    errors.push(`${renderRel}: missing ${fn}`);
  } else if (!body.includes('requireStaticWorldFrameMaterializerForRender()')) {
    errors.push(`${renderRel}: ${fn} must delegate to ${materializerRel}`);
  }
}

const wrapperOwnershipChecks = [
  { fn: 'buildStaticVoxelFaceRenderable', snippet: "var faceTiePrio = { lowerRight: 1, lowerLeft: 2, top: 3", reason: 'static voxel face tie priority belongs in materializer owner' },
  { fn: 'materializeStaticWorldFacePacket', snippet: "renderPath: 'static-world-frame-face'", reason: 'static world packet materialization body belongs in materializer owner' },
  { fn: 'materializeStaticWorldFrameRenderables', snippet: "out.sort(compareRenderablesByDomain);", reason: 'materialized frame sorting belongs behind injected materializer dependency' }
];
for (const item of wrapperOwnershipChecks) {
  const body = bodyOf(renderSource, item.fn);
  if (body.includes(item.snippet)) errors.push(`${renderRel}: ${item.fn}: ${item.reason}`);
}

const report = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
