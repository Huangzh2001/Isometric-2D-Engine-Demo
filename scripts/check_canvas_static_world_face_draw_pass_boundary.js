#!/usr/bin/env node
/*
 * P8c canvas static world face draw-pass boundary check.
 * Verifies that static world face/voxel packet Canvas drawing is owned by
 * presentation/render/renderer/canvas2d-static-world-face-draw-pass.js and that
 * render.js delegates to it instead of re-owning projection/cache/draw bodies.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function idx(source, needle) { return source.indexOf(needle); }
function hasFunction(source, name) {
  return new RegExp('function\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(').test(source);
}
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

const shadowRel = 'src/presentation/render/renderer/canvas2d-shadow-overlays.js';
const passRel = 'src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js';
const renderRel = 'src/presentation/render/render.js';

if (!exists(passRel)) errors.push(`missing ${passRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);

const passSource = exists(passRel) ? read(passRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  const shadowIdx = idx(source, shadowRel);
  const passIdx = idx(source, passRel);
  const renderIdx = idx(source, renderRel);
  if (renderIdx >= 0 && passIdx < 0) errors.push(`${htmlRel}: missing ${passRel} before render.js`);
  else if (renderIdx >= 0 && passIdx > renderIdx) errors.push(`${htmlRel}: ${passRel} must load before ${renderRel}`);
  if (passIdx >= 0 && shadowIdx >= 0 && shadowIdx > passIdx) warnings.push(`${htmlRel}: ${shadowRel} should normally load before ${passRel}`);
}

for (const name of [
  'buildStaticWorldPacketProjectionCacheKey',
  'getStaticWorldPacketProjectedGeometry',
  'drawTerrainTopBoundarySegmentsForPacket',
  'drawCachedVoxelRenderable',
  'drawCachedVoxelFaceRenderable',
  'drawStaticWorldFacePacket',
]) {
  if (!hasFunction(passSource, name)) errors.push(`${passRel}: missing function ${name}`);
}

if (!passSource.includes("layer: 'presentation/render/renderer'")) errors.push(`${passRel}: must identify presentation/render/renderer layer`);
if (!passSource.includes("phase: 'P8c'")) errors.push(`${passRel}: must identify P8c phase`);
for (const forbidden of ['localStorage', 'fetch(', 'document.', 'new Image', 'staticBoxRenderCache', 'buildRenderables', 'buildMainFrameRenderables']) {
  if (passSource.includes(forbidden)) errors.push(`${passRel}: must not contain ${forbidden}`);
}
for (const required of ['screenPointsFromWorldFaceNoCamera', 'applyTerrainMaterialPatternOverlay', 'drawFaceShadowOverlaysNoCamera']) {
  if (!passSource.includes(required)) errors.push(`${passRel}: missing injected dependency usage ${required}`);
}

for (const marker of [
  'requireCanvas2dStaticWorldFaceDrawPassForRender().drawCachedVoxelRenderable',
  'requireCanvas2dStaticWorldFaceDrawPassForRender().drawCachedVoxelFaceRenderable',
  'requireCanvas2dStaticWorldFaceDrawPassForRender().buildStaticWorldPacketProjectionCacheKey',
  'requireCanvas2dStaticWorldFaceDrawPassForRender().getStaticWorldPacketProjectedGeometry',
  'requireCanvas2dStaticWorldFaceDrawPassForRender().drawTerrainTopBoundarySegmentsForPacket',
  'requireCanvas2dStaticWorldFaceDrawPassForRender().drawStaticWorldFacePacket',
  'createCanvas2dStaticWorldFaceDrawPassDepsForRender()'
]) {
  if (!renderSource.includes(marker)) errors.push(`${renderRel}: missing static-world face draw-pass delegation marker ${marker}`);
}

for (const item of [
  { snippet: 'var worldLoops = Array.isArray(packet && packet.worldLoops)', reason: 'projection cache key body belongs in canvas2d-static-world-face-draw-pass' },
  { snippet: 'packet.__projectedDrawCache = cached;', reason: 'packet projection cache body belongs in canvas2d-static-world-face-draw-pass' },
  { snippet: "targetCtx.lineJoin = 'round';", reason: 'terrain top boundary draw body belongs in canvas2d-static-world-face-draw-pass' },
  { snippet: "ctx.fill(projected.path2d, 'evenodd');", reason: 'static face packet draw body belongs in canvas2d-static-world-face-draw-pass' },
  { snippet: 'applyTerrainMaterialPatternOverlay(ctx, loops.length ? (loops[0] || []) : points, path2d, 0, 0, item);', reason: 'cached voxel face draw body belongs in canvas2d-static-world-face-draw-pass' }
]) {
  if (renderSource.includes(item.snippet)) errors.push(`${renderRel}: ${item.reason}`);
}

const report = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
