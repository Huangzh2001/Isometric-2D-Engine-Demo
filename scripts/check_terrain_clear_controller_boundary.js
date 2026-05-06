#!/usr/bin/env node
/*
 * P11b-5 terrain clear controller boundary check.
 * Ensures terrain clear lifecycle is owned by terrain-clear-controller.js rather
 * than app-controllers.js.
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

const terrainApplyRel = 'src/application/controllers/terrain-apply-job-controller.js';
const terrainClearRel = 'src/application/controllers/terrain-clear-controller.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';

for (const rel of [terrainApplyRel, terrainClearRel, appControllersRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const terrainClear = exists(terrainClearRel) ? read(terrainClearRel) : '';
const appControllers = exists(appControllersRel) ? read(appControllersRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  requireBefore(source, terrainApplyRel, terrainClearRel, htmlRel);
  requireBefore(source, terrainClearRel, appControllersRel, htmlRel);
}

for (const symbol of [
  'global.__APP_TERRAIN_CLEAR_CONTROLLER__',
  'createTerrainClearController',
  'clearMainEditorTerrain',
  'controllers.terrainClear',
  'application.terrainClearController',
  'terrain-generator-clear'
]) {
  if (!terrainClear.includes(symbol)) errors.push(`${terrainClearRel}: missing terrain clear API symbol ${symbol}`);
}

if (!appControllers.includes('__APP_TERRAIN_CLEAR_CONTROLLER__')) {
  errors.push(`${appControllersRel}: must delegate terrain clear flow to terrain clear owner`);
}
if (!appControllers.includes('createTerrainClearControllerDepsForAppControllers')) {
  errors.push(`${appControllersRel}: must provide explicit dependency injection for terrain clear owner`);
}

const clearBodyMatch = appControllers.match(/function\s+clearMainEditorTerrain\s*\([^)]*\)\s*{([\s\S]*?)\n\s*}/);
if (!clearBodyMatch) {
  errors.push(`${appControllersRel}: missing clearMainEditorTerrain compatibility wrapper`);
} else {
  const body = clearBodyMatch[1];
  if (!body.includes('getTerrainClearControllerForAppControllers().clearMainEditorTerrain')) {
    errors.push(`${appControllersRel}: clearMainEditorTerrain must delegate to ${terrainClearRel}`);
  }
  for (const forbidden of [
    'removedLegacy',
    'clearTerrainRuntimeModelState',
    'terrain-generator-clear',
    'removedTerrainVoxelCount',
    'replaceCurrentSceneInstances(survivors'
  ]) {
    if (body.includes(forbidden)) errors.push(`${appControllersRel}: clearMainEditorTerrain wrapper still owns ${forbidden}`);
  }
}

const forbiddenTerrainClearAccess = [
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\bctx\s*\./, reason: 'canvas context drawing' },
  { pattern: /\bcanvas\s*\./, reason: 'Canvas object access' },
  { pattern: /\blocalStorage\s*\./, reason: 'browser persistence access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /refreshInspectorPanels\s*\(/, reason: 'direct presentation panel refresh' },
  { pattern: /updatePreview\s*\(/, reason: 'direct presentation preview update' },
];
for (const item of forbiddenTerrainClearAccess) {
  if (item.pattern.test(terrainClear)) errors.push(`${terrainClearRel}: forbidden ${item.reason}`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: listRootHtml(),
  terrainClearRel,
  appControllersRel,
  errors,
  warnings,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
