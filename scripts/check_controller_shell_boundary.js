#!/usr/bin/env node
/*
 * P9c controller / shell owner boundary check.
 * Ensures controller audit helpers and shell trace diagnostics are no longer
 * owned by the large app-controllers.js / app.js nodes.
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

const controllerBoundaryRel = 'src/application/controllers/controller-boundary.js';
const controllerRegistryRel = 'src/application/controllers/controller-registry.js';
const appControllersRel = 'src/application/controllers/app-controllers.js';
const shellDiagnosticsRel = 'src/presentation/shell/diagnostics/shell-diagnostics.js';
const shellAppRel = 'src/presentation/shell/app.js';
const appShellRel = 'src/presentation/shell/app-shell.js';

for (const rel of [controllerBoundaryRel, controllerRegistryRel, appControllersRel, shellDiagnosticsRel, shellAppRel, appShellRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const controllerBoundary = exists(controllerBoundaryRel) ? read(controllerBoundaryRel) : '';
const controllerRegistry = exists(controllerRegistryRel) ? read(controllerRegistryRel) : '';
const appControllers = exists(appControllersRel) ? read(appControllersRel) : '';
const shellDiagnostics = exists(shellDiagnosticsRel) ? read(shellDiagnosticsRel) : '';
const shellApp = exists(shellAppRel) ? read(shellAppRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  requireBefore(source, controllerBoundaryRel, appControllersRel, htmlRel);
  requireBefore(source, controllerBoundaryRel, controllerRegistryRel, htmlRel);
  requireBefore(source, controllerRegistryRel, appControllersRel, htmlRel);
  requireBefore(source, shellDiagnosticsRel, shellAppRel, htmlRel);
  requireBefore(source, shellDiagnosticsRel, appShellRel, htmlRel);
}

const requiredControllerApi = [
  'emitP7',
  'getNs',
  'appPath',
  'safeClone',
  'recordAppBoundaryEvent',
  'recordAppBoundaryFallback',
  'summarizeAppBoundary',
  'resetAppBoundary'
];
for (const symbol of requiredControllerApi) {
  if (!controllerBoundary.includes(symbol)) errors.push(`${controllerBoundaryRel}: missing API symbol ${symbol}`);
}
if (!controllerBoundary.includes('global.__APP_CONTROLLER_BOUNDARY__')) {
  errors.push(`${controllerBoundaryRel}: must expose global.__APP_CONTROLLER_BOUNDARY__`);
}
if (!controllerBoundary.includes("controllers.boundary") || !controllerBoundary.includes("application.controllerBoundary")) {
  errors.push(`${controllerBoundaryRel}: must bind controller boundary into App namespace`);
}

if (!controllerRegistry.includes('global.__APP_CONTROLLER_REGISTRY__')) {
  errors.push(`${controllerRegistryRel}: must expose global.__APP_CONTROLLER_REGISTRY__`);
}
if (!controllerRegistry.includes('registerControllers')) {
  errors.push(`${controllerRegistryRel}: missing registerControllers API`);
}

if (!appControllers.includes('getControllerBoundaryApiForAppControllers')) {
  errors.push(`${appControllersRel}: must use getControllerBoundaryApiForAppControllers wrapper`);
}
if (/var\s+APP_BOUNDARY_MAX\b/.test(appControllers) || /var\s+appBoundaryAudit\b/.test(appControllers)) {
  errors.push(`${appControllersRel}: controller boundary audit storage must live in ${controllerBoundaryRel}`);
}
if (/function\s+pushAudit\s*\(/.test(appControllers)) {
  errors.push(`${appControllersRel}: pushAudit implementation must live in ${controllerBoundaryRel}`);
}

if (!shellDiagnostics.includes('window.__SHELL_DIAGNOSTICS__')) {
  errors.push(`${shellDiagnosticsRel}: must expose window.__SHELL_DIAGNOSTICS__`);
}
if (!shellDiagnostics.includes('window.__FUNCTION_TRACE_INFO')) {
  errors.push(`${shellDiagnosticsRel}: must own window.__FUNCTION_TRACE_INFO`);
}
if (!shellDiagnostics.includes('var __functionTraceSpec')) {
  errors.push(`${shellDiagnosticsRel}: must own __functionTraceSpec`);
}
if (/var\s+__functionTraceSpec\b/.test(shellApp) || /function\s+installFunctionTrace\s*\(/.test(shellApp)) {
  errors.push(`${shellAppRel}: function trace table/installer must live in ${shellDiagnosticsRel}`);
}
if (!shellApp.includes('function emitP1Main')) {
  errors.push(`${shellAppRel}: app shell runtime body appears truncated after diagnostics extraction`);
}

const controllerForbidden = [
  { pattern: /\bctx\s*\./, reason: 'canvas context drawing' },
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\blocalStorage\s*\./, reason: 'browser persistence access' },
];
for (const item of controllerForbidden) {
  if (item.pattern.test(controllerBoundary)) errors.push(`${controllerBoundaryRel}: forbidden ${item.reason}`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: listRootHtml(),
  controllerBoundaryRel,
  shellDiagnosticsRel,
  errors,
  warnings,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
