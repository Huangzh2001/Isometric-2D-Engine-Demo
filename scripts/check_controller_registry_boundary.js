#!/usr/bin/env node
/*
 * P11b-1 controller registry boundary check.
 * Ensures controller root composition and namespace binding are owned by
 * controller-registry.js rather than the large app-controllers.js node.
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

for (const rel of [controllerBoundaryRel, controllerRegistryRel, appControllersRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const registry = exists(controllerRegistryRel) ? read(controllerRegistryRel) : '';
const appControllers = exists(appControllersRel) ? read(appControllersRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  requireBefore(source, controllerBoundaryRel, controllerRegistryRel, htmlRel);
  requireBefore(source, controllerRegistryRel, appControllersRel, htmlRel);
}

for (const symbol of [
  'global.__APP_CONTROLLER_REGISTRY__',
  'createControllerRoot',
  'bindControllerRoot',
  'emitRegistryCoverage',
  'registerControllers',
  'getControllerFunctionSummary'
]) {
  if (!registry.includes(symbol)) errors.push(`${controllerRegistryRel}: missing registry API symbol ${symbol}`);
}
if (!registry.includes("controllers.registry") || !registry.includes("application.controllerRegistry")) {
  errors.push(`${controllerRegistryRel}: must bind registry into App namespace`);
}
if (!appControllers.includes('getControllerRegistryApiForAppControllers') || !appControllers.includes('__APP_CONTROLLER_REGISTRY__')) {
  errors.push(`${appControllersRel}: must delegate to controller registry owner`);
}
if (!appControllers.includes('registerControllers({')) {
  errors.push(`${appControllersRel}: must call controllerRegistry.registerControllers(...)`);
}
if (/var\s+controllerRoot\b/.test(appControllers)) {
  errors.push(`${appControllersRel}: controllerRoot composition must live in ${controllerRegistryRel}`);
}
if (/ns\.bind\(['"]controllers\.(main|scene|assetLibrary|placement|editorHandoff|dispatch)['"]/.test(appControllers)) {
  errors.push(`${appControllersRel}: controller namespace binding must live in ${controllerRegistryRel}`);
}
if (appControllers.includes('controller-entrypoint-coverage')) {
  errors.push(`${appControllersRel}: controller entrypoint coverage emit must live in ${controllerRegistryRel}`);
}

const registryForbidden = [
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\bctx\s*\./, reason: 'canvas context drawing' },
  { pattern: /\bcanvas\s*\./, reason: 'Canvas object access' },
  { pattern: /\blocalStorage\s*\./, reason: 'browser persistence access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
];
for (const item of registryForbidden) {
  if (item.pattern.test(registry)) errors.push(`${controllerRegistryRel}: forbidden ${item.reason}`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: listRootHtml(),
  controllerRegistryRel,
  appControllersRel,
  errors,
  warnings,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
