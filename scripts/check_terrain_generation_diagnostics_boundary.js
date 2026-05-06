#!/usr/bin/env node
/*
 * P11b-4 terrain generation diagnostics boundary check.
 * Ensures terrain generation diagnostic payload construction is owned by
 * terrain-generation-diagnostics.js rather than app-controllers.js.
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
const terrainGenerationDiagnosticsRel = 'src/application/controllers/terrain-generation-diagnostics.js';
const terrainApplyRel = 'src/application/controllers/terrain-apply-job-controller.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';

for (const rel of [controllerDiagnosticsRel, terrainGenerationDiagnosticsRel, terrainApplyRel, appControllersRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const terrainGenerationDiagnostics = exists(terrainGenerationDiagnosticsRel) ? read(terrainGenerationDiagnosticsRel) : '';
const appControllers = exists(appControllersRel) ? read(appControllersRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  requireBefore(source, controllerDiagnosticsRel, terrainGenerationDiagnosticsRel, htmlRel);
  requireBefore(source, terrainGenerationDiagnosticsRel, terrainApplyRel, htmlRel);
  requireBefore(source, terrainGenerationDiagnosticsRel, appControllersRel, htmlRel);
}

for (const symbol of [
  'global.__APP_TERRAIN_GENERATION_DIAGNOSTICS__',
  'createTerrainGenerationDiagnostics',
  'emitTerrainGeneratorParams',
  'emitTerrainWorldIntegrationSummary',
  'emitTerrainLogicSummary',
  'emitTerrainPlacementUnificationCheck',
  'emitTerrainDebugFaceUnificationCheck',
  'emitTerrainCameraUnificationCheck',
  'emitSharedRenderOptimizationCheck',
  'emitTerrainGeneratorSummary',
  'emitTerrainGeneratorApply',
  'controllers.terrainGenerationDiagnostics',
  'application.terrainGenerationDiagnostics'
]) {
  if (!terrainGenerationDiagnostics.includes(symbol)) errors.push(`${terrainGenerationDiagnosticsRel}: missing terrain generation diagnostics API symbol ${symbol}`);
}

if (!appControllers.includes('getTerrainGenerationDiagnosticsForAppControllers') || !appControllers.includes('__APP_TERRAIN_GENERATION_DIAGNOSTICS__')) {
  errors.push(`${appControllersRel}: must delegate terrain generation diagnostics to ${terrainGenerationDiagnosticsRel}`);
}
if (!appControllers.includes('requireTerrainGenerationDiagnosticsModuleForAppControllers')) {
  errors.push(`${appControllersRel}: must fail fast when terrain generation diagnostics owner is missing`);
}

const appForbiddenBodies = [
  { pattern: /recordTerrainDiagnostic\('terrain-generator-params'\s*,\s*{[\s\S]*?heightProfileConfig/s, reason: 'terrain generator params payload body' },
  { pattern: /recordTerrainDiagnostic\('terrain-world-integration-summary'\s*,\s*{[\s\S]*?stackedOnExistingBlocks/s, reason: 'terrain world integration payload body' },
  { pattern: /recordTerrainDiagnostic\('terrain-placement-unification-check'\s*,\s*{[\s\S]*?terrainUsesDedicatedRenderPath/s, reason: 'terrain placement unification payload body' },
  { pattern: /recordTerrainDiagnostic\('terrain-debug-face-unification-check'\s*,\s*{[\s\S]*?hasSlopedAppearanceRisk/s, reason: 'terrain debug face unification payload body' },
  { pattern: /recordTerrainDiagnostic\('terrain-camera-unification-check'\s*,\s*{[\s\S]*?usesSingleUnifiedZoomPath/s, reason: 'terrain camera unification payload body' },
  { pattern: /recordTerrainDiagnostic\('shared-render-optimization-check'\s*,\s*{[\s\S]*?optimizationAppliesToPlacedVoxelFurniture/s, reason: 'shared render optimization payload body' },
  { pattern: /recordTerrainDiagnostic\('terrain-generator-apply'\s*,\s*{[\s\S]*?applyMode:\s*'batched'/s, reason: 'terrain generator apply payload body' },
];
for (const item of appForbiddenBodies) {
  if (item.pattern.test(appControllers)) errors.push(`${appControllersRel}: ${item.reason} must live in ${terrainGenerationDiagnosticsRel}`);
}

for (const symbol of [
  'emitTerrainGeneratorParamsDiagnostic',
  'emitTerrainWorldIntegrationSummaryDiagnostic',
  'emitTerrainLogicSummaryDiagnostic',
  'emitTerrainPlacementUnificationCheckDiagnostic',
  'emitTerrainDebugFaceUnificationCheckDiagnostic',
  'emitTerrainCameraUnificationCheckDiagnostic',
  'emitSharedRenderOptimizationCheckDiagnostic',
  'emitTerrainGeneratorSummaryDiagnostic',
  'emitTerrainGeneratorApplyDiagnostic'
]) {
  if (!appControllers.includes(symbol)) errors.push(`${appControllersRel}: missing thin wrapper ${symbol}`);
}

const ownerForbidden = [
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\bctx\s*\./, reason: 'canvas context drawing' },
  { pattern: /\bcanvas\s*\./, reason: 'Canvas object access' },
  { pattern: /\blocalStorage\s*\./, reason: 'browser persistence access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /replaceCurrentScene|applyTerrainRuntimeModel|beginTerrainApplyJob/, reason: 'terrain generation/apply workflow ownership' },
];
for (const item of ownerForbidden) {
  if (item.pattern.test(terrainGenerationDiagnostics)) errors.push(`${terrainGenerationDiagnosticsRel}: forbidden ${item.reason}`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: listRootHtml(),
  terrainGenerationDiagnosticsRel,
  appControllersRel,
  errors,
  warnings,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
