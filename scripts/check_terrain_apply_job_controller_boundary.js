#!/usr/bin/env node
/*
 * P11b-3 terrain apply job controller boundary check.
 * Ensures pending terrain apply job state and batched apply flow are owned by
 * terrain-apply-job-controller.js rather than app-controllers.js.
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

const controllerDiagnosticsRel = 'src/application/controllers/controller-diagnostics.js';
const terrainApplyRel = 'src/application/controllers/terrain-apply-job-controller.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';

for (const rel of [controllerDiagnosticsRel, terrainApplyRel, appControllersRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const terrainApply = exists(terrainApplyRel) ? read(terrainApplyRel) : '';
const appControllers = exists(appControllersRel) ? read(appControllersRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  requireBefore(source, controllerDiagnosticsRel, terrainApplyRel, htmlRel);
  requireBefore(source, terrainApplyRel, appControllersRel, htmlRel);
}

for (const symbol of [
  'global.__APP_TERRAIN_APPLY_JOB_CONTROLLER__',
  'createTerrainApplyJobController',
  'pendingTerrainApplyJob',
  'beginTerrainApplyJob',
  'finalizePendingTerrainApplyJob',
  'tickMainEditorTerrainApply',
  'controllers.terrainApplyJob',
  'application.terrainApplyJobController'
]) {
  if (!terrainApply.includes(symbol)) errors.push(`${terrainApplyRel}: missing terrain apply API symbol ${symbol}`);
}

if (!appControllers.includes('__APP_TERRAIN_APPLY_JOB_CONTROLLER__')) {
  errors.push(`${appControllersRel}: must delegate terrain apply job flow to terrain apply owner`);
}
if (!appControllers.includes('createTerrainApplyJobControllerDepsForAppControllers')) {
  errors.push(`${appControllersRel}: must provide explicit dependency injection for terrain apply owner`);
}

const forbiddenAppBodies = [
  { pattern: /var\s+__pendingTerrainApplyJob\s*=/, reason: 'pending terrain apply job state' },
  { pattern: /var\s+TERRAIN_APPLY_BATCH_INSTANCE_COUNT\s*=/, reason: 'terrain apply batch size owner state' },
  { pattern: /function\s+finalizePendingTerrainApplyJob\s*\([^)]*\)\s*{[\s\S]*?emitTerrainGenerateProfile[\s\S]*?recordTerrainDiagnostic[\s\S]*?__pendingTerrainApplyJob\s*=\s*null[\s\S]*?}/, reason: 'terrain apply finalization implementation body' },
  { pattern: /function\s+tickMainEditorTerrainApply\s*\([^)]*\)\s*{[\s\S]*?buildTerrainInstancesAndBoxesFromPlacementPlanRange[\s\S]*?replaceCurrentSceneGraph[\s\S]*?applyTerrainRuntimeModel[\s\S]*?}/, reason: 'batched terrain apply implementation body' },
];
for (const item of forbiddenAppBodies) {
  if (item.pattern.test(appControllers)) errors.push(`${appControllersRel}: ${item.reason} must live in ${terrainApplyRel}`);
}

const forbiddenTerrainApplyAccess = [
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\bctx\s*\./, reason: 'canvas context drawing' },
  { pattern: /\bcanvas\s*\./, reason: 'Canvas object access' },
  { pattern: /\blocalStorage\s*\./, reason: 'browser persistence access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /refreshInspectorPanels\s*\(/, reason: 'direct presentation panel refresh' },
  { pattern: /updatePreview\s*\(/, reason: 'direct presentation preview update' },
];
for (const item of forbiddenTerrainApplyAccess) {
  if (item.pattern.test(terrainApply)) errors.push(`${terrainApplyRel}: forbidden ${item.reason}`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: listRootHtml(),
  terrainApplyRel,
  appControllersRel,
  errors,
  warnings,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
