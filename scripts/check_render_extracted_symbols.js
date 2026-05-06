#!/usr/bin/env node
/*
 * Render extraction guard.
 * Verifies that rules already extracted from presentation/render/render.js remain
 * delegated to core/domain modules and that runnable HTML loads those modules before render.js.
 *
 * Run from project root:
 *   node scripts/check_render_extracted_symbols.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function hasFunction(source, name) {
  return new RegExp('function\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(').test(source);
}

function apiExports(source, name) {
  return new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*' + name + '\\b').test(source);
}

function htmlLoadsBefore(htmlSource, before, after, htmlRel) {
  const beforeIdx = htmlSource.indexOf(before);
  const afterIdx = htmlSource.indexOf(after);
  if (afterIdx < 0) return;
  if (beforeIdx < 0) errors.push(`${htmlRel}: missing required extracted core ${before}`);
  else if (beforeIdx > afterIdx) errors.push(`${htmlRel}: ${before} must load before ${after}`);
}

const renderSource = read('src/presentation/render/render.js');
const isometricSource = read('src/core/domain/isometric-face-core.js');
const terrainSource = read('src/core/domain/terrain-render-core.js');
const indexEntries = listRootHtml();

for (const htmlRel of indexEntries) {
  const source = read(htmlRel);
  htmlLoadsBefore(source, 'src/core/domain/isometric-face-core.js', 'src/presentation/render/render.js', htmlRel);
  htmlLoadsBefore(source, 'src/core/domain/terrain-render-core.js', 'src/presentation/render/render.js', htmlRel);
  htmlLoadsBefore(source, 'src/core/domain/render-order-core.js', 'src/presentation/render/render.js', htmlRel);
  htmlLoadsBefore(source, 'src/core/domain/render-order-core.js', 'src/application/render/static-world-renderable-builder.js', htmlRel);
  htmlLoadsBefore(source, 'src/application/render/static-world-renderable-builder.js', 'src/presentation/render/render.js', htmlRel);
  htmlLoadsBefore(source, 'src/application/render/static-world-render-cache-coordinator.js', 'src/application/render/main-frame-renderable-assembler.js', htmlRel);
  htmlLoadsBefore(source, 'src/application/render/main-frame-renderable-assembler.js', 'src/presentation/render/render.js', htmlRel);
  htmlLoadsBefore(source, 'src/application/render/static-world-renderable-builder.js', 'src/application/render/static-world-render-cache-coordinator.js', htmlRel);
  htmlLoadsBefore(source, 'src/presentation/render/renderer/canvas2d-shadow-overlays.js', 'src/presentation/render/render.js', htmlRel);
  htmlLoadsBefore(source, 'src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js', 'src/presentation/render/render.js', htmlRel);
  htmlLoadsBefore(source, 'src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js', 'src/presentation/render/render.js', htmlRel);
  htmlLoadsBefore(source, 'src/presentation/render/renderer/canvas2d-shadow-overlays.js', 'src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js', htmlRel);
  htmlLoadsBefore(source, 'src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js', 'src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js', htmlRel);
}

const extractedGroups = [
  {
    coreRel: 'src/core/domain/isometric-face-core.js',
    source: isometricSource,
    requireName: 'requireIsometricFaceCoreForRender',
    names: [
      'getScreenFaceForSemanticFace',
      'getBaseFaceFillRgbForSemanticFace',
      'buildVoxelFaceWorldPolygon',
      'getStaticWorldFaceMergeCoords',
      'getStaticWorldFaceMergeSignature',
      'getSemanticFaceWorldPolygon',
      'getSemanticFaceNormal',
      { core: 'getSemanticFaceNeighborDelta', wrapper: 'getSemanticFaceNeighborDeltaForRender' }
    ]
  },
  {
    coreRel: 'src/core/domain/terrain-render-core.js',
    source: terrainSource,
    requireName: 'requireTerrainRenderCoreForRender',
    names: [
      'getTerrainMaterialMergeKeyForRenderCell',
      'getTerrainFaceMergeSignature',
      'getTerrainSortBandKeyForRenderFace',
      'getTerrainSideEdgeVisibilitySignature',
      'occupancyReaderHasSolid',
      'getTerrainSideTangentNeighbor',
      'getTerrainSideStepBreakSignature',
      'worldPointFromMergeUV',
      'buildTerrainPolygonLoopSignature',
      'buildTerrainTopBoundarySegmentsWorldFromDescriptor',
      'buildMergedVoxelFaceWorldGeometry',
      'buildMergedVoxelFaceWorldPolygon'
    ]
  }
];

for (const group of extractedGroups) {
  for (const entry of group.names) {
    const name = typeof entry === 'string' ? entry : entry.core;
    const wrapperName = typeof entry === 'string' ? entry : entry.wrapper;
    if (!hasFunction(group.source, name)) errors.push(`${group.coreRel}: missing core function ${name}`);
    if (!apiExports(group.source, name)) errors.push(`${group.coreRel}: API does not export ${name}`);
    if (!hasFunction(renderSource, wrapperName)) errors.push(`render.js: missing wrapper for extracted function ${wrapperName}`);
    const wrapperMarker = `${group.requireName}().${name}`;
    if (!renderSource.includes(wrapperMarker)) errors.push(`render.js: wrapper for ${wrapperName} must delegate through ${group.requireName}.${name}`);
  }
}

const forbiddenRenderSnippets = [
  { snippet: "var ownerKey = safeCell.instanceId", reason: 'static world face merge signature body belongs in isometric-face-core' },
  { snippet: "'terrain-face',\n      String(semanticFace || 'top')", reason: 'terrain face merge signature body belongs in terrain-render-core' },
  { snippet: "if (semanticFace === 'east') return { x: x, y: y + dir, z: z };", reason: 'terrain tangent neighbor body belongs in terrain-render-core' },
  { snippet: 'function hasSameHeightTopSurface(nx, ny, plane)', reason: 'terrain boundary segment body belongs in terrain-render-core' },
  { snippet: "if (face === 'top') return { x: uu, y: vv, z: p };", reason: 'merge UV world point conversion belongs in terrain-render-core' }
];
for (const item of forbiddenRenderSnippets) {
  if (renderSource.includes(item.snippet)) errors.push(`render.js re-owns extracted logic: ${item.reason}`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: indexEntries,
  extractedGroups: extractedGroups.map((group) => ({ coreRel: group.coreRel, symbols: group.names.length })),
  errors,
  warnings
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
