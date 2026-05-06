#!/usr/bin/env node
/*
 * P11b-2 controller diagnostics boundary check.
 * Ensures controller performance timing, structured logs, and terrain/profile
 * diagnostics are owned by controller-diagnostics.js rather than app-controllers.js.
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

const controllerRegistryRel = 'src/application/controllers/controller-registry.js';
const controllerDiagnosticsRel = 'src/application/controllers/controller-diagnostics.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';

for (const rel of [controllerRegistryRel, controllerDiagnosticsRel, appControllersRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const diagnostics = exists(controllerDiagnosticsRel) ? read(controllerDiagnosticsRel) : '';
const appControllers = exists(appControllersRel) ? read(appControllersRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  requireBefore(source, controllerRegistryRel, controllerDiagnosticsRel, htmlRel);
  requireBefore(source, controllerDiagnosticsRel, appControllersRel, htmlRel);
}

for (const symbol of [
  'global.__APP_CONTROLLER_DIAGNOSTICS__',
  'isDetailedTerrainProfilingEnabled',
  'recordTerrainDiagnostic',
  'controllerPerfNowMs',
  'emitStructuredControllerLog',
  'emitTerrainGenerateProfile',
  'emitSceneCommitProfile',
  'controllers.diagnostics',
  'application.controllerDiagnostics'
]) {
  if (!diagnostics.includes(symbol)) errors.push(`${controllerDiagnosticsRel}: missing diagnostics API symbol ${symbol}`);
}
if (!appControllers.includes('getControllerDiagnosticsApiForAppControllers') || !appControllers.includes('__APP_CONTROLLER_DIAGNOSTICS__')) {
  errors.push(`${appControllersRel}: must delegate to controller diagnostics owner`);
}
if (!appControllers.includes('requireControllerDiagnosticsApiForAppControllers')) {
  errors.push(`${appControllersRel}: must fail fast when diagnostics owner is missing`);
}

const appForbiddenBodies = [
  { pattern: /function\s+recordTerrainDiagnostic\s*\([^)]*\)\s*{[^}]*JSON\.stringify[^}]*\[TERRAIN\]/s, reason: 'terrain diagnostic log body' },
  { pattern: /function\s+controllerPerfNowMs\s*\([^)]*\)\s*{[^}]*performance\.now/s, reason: 'performance timing body' },
  { pattern: /function\s+emitStructuredControllerLog\s*\([^)]*\)\s*{[^}]*JSON\.stringify[^}]*pushLog/s, reason: 'structured controller log body' },
  { pattern: /function\s+emitTerrainGenerateProfile\s*\([^)]*\)\s*{\s*return\s+emitStructuredControllerLog/s, reason: 'terrain profile log body' },
  { pattern: /function\s+emitSceneCommitProfile\s*\([^)]*\)\s*{\s*return\s+emitStructuredControllerLog/s, reason: 'scene commit profile log body' },
];
for (const item of appForbiddenBodies) {
  if (item.pattern.test(appControllers)) errors.push(`${appControllersRel}: ${item.reason} must live in ${controllerDiagnosticsRel}`);
}

const diagnosticsForbidden = [
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\bctx\s*\./, reason: 'canvas context drawing' },
  { pattern: /\bcanvas\s*\./, reason: 'Canvas object access' },
  { pattern: /\blocalStorage\s*\./, reason: 'browser persistence access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
];
for (const item of diagnosticsForbidden) {
  if (item.pattern.test(diagnostics)) errors.push(`${controllerDiagnosticsRel}: forbidden ${item.reason}`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: listRootHtml(),
  controllerDiagnosticsRel,
  appControllersRel,
  errors,
  warnings,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
