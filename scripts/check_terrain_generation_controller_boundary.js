#!/usr/bin/env node
/*
 * P11b-6 terrain generation controller boundary check.
 * Ensures terrain generation orchestration is owned by terrain-generation-controller.js
 * rather than app-controllers.js.
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
function requireBefore(source, before, after, htmlRel) {
  const beforeIdx = source.indexOf(before);
  const afterIdx = source.indexOf(after);
  if (afterIdx < 0) return;
  if (beforeIdx < 0) errors.push(`${htmlRel}: missing ${before}`);
  else if (beforeIdx > afterIdx) errors.push(`${htmlRel}: ${before} must load before ${after}`);
}

const terrainClearRel = 'src/application/controllers/terrain-clear-controller.js';
const terrainGenerationRel = 'src/application/controllers/terrain-generation-controller.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';

for (const rel of [terrainClearRel, terrainGenerationRel, appControllersRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const terrainGeneration = exists(terrainGenerationRel) ? read(terrainGenerationRel) : '';
const appControllers = exists(appControllersRel) ? read(appControllersRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  requireBefore(source, terrainClearRel, terrainGenerationRel, htmlRel);
  requireBefore(source, terrainGenerationRel, appControllersRel, htmlRel);
}

for (const symbol of [
  'global.__APP_TERRAIN_GENERATION_CONTROLLER__',
  'createTerrainGenerationController',
  'generateMainEditorTerrain',
  'controllers.terrainGeneration',
  'application.terrainGenerationController',
  'beginTerrainApplyJob',
  'emitTerrainGeneratorSummaryDiagnostic'
]) {
  if (!terrainGeneration.includes(symbol)) errors.push(`${terrainGenerationRel}: missing terrain generation API symbol ${symbol}`);
}

if (!appControllers.includes('__APP_TERRAIN_GENERATION_CONTROLLER__')) {
  errors.push(`${appControllersRel}: must delegate terrain generation flow to terrain generation owner`);
}
if (!appControllers.includes('createTerrainGenerationControllerDepsForAppControllers')) {
  errors.push(`${appControllersRel}: must provide explicit dependency injection for terrain generation owner`);
}

const generationBodyMatch = appControllers.match(/function\s+generateMainEditorTerrain\s*\([^)]*\)\s*{([\s\S]*?)\n\s*}/);
if (!generationBodyMatch) {
  errors.push(`${appControllersRel}: missing generateMainEditorTerrain compatibility wrapper`);
} else {
  const body = generationBodyMatch[1];
  if (!body.includes('getTerrainGenerationControllerForAppControllers().generateMainEditorTerrain')) {
    errors.push(`${appControllersRel}: generateMainEditorTerrain must delegate to ${terrainGenerationRel}`);
  }
  for (const forbidden of [
    'terrainProfileStartAt',
    'generateHeightMap',
    'heightMapToVoxelStacks',
    'buildTerrainPlacementPlan',
    'beginTerrainApplyJob({',
    'emitTerrainGeneratorApplyDiagnostic'
  ]) {
    if (body.includes(forbidden)) errors.push(`${appControllersRel}: generateMainEditorTerrain wrapper still owns ${forbidden}`);
  }
}

const forbiddenTerrainGenerationAccess = [
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\bctx\s*\./, reason: 'canvas context drawing' },
  { pattern: /\bcanvas\s*\./, reason: 'Canvas object access' },
  { pattern: /\blocalStorage\s*\./, reason: 'browser persistence access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /refreshInspectorPanels\s*\(/, reason: 'direct presentation panel refresh' },
  { pattern: /updatePreview\s*\(/, reason: 'direct presentation preview update' },
];
for (const item of forbiddenTerrainGenerationAccess) {
  if (item.pattern.test(terrainGeneration)) errors.push(`${terrainGenerationRel}: forbidden ${item.reason}`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: listRootHtml(),
  terrainGenerationRel,
  appControllersRel,
  errors,
  warnings,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
