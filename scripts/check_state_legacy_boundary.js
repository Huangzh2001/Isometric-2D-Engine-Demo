#!/usr/bin/env node
/*
 * P9b state / legacy boundary check.
 * Ensures infrastructure/legacy/state.js is no longer the owner of state
 * namespace access helpers, placement bridge dispatch, or boot ownership logs.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}
function htmlLoadsBefore(source, before, after, htmlRel) {
  const beforeIdx = source.indexOf(before);
  const afterIdx = source.indexOf(after);
  if (afterIdx < 0) return;
  if (beforeIdx < 0) errors.push(`${htmlRel}: missing ${before}`);
  else if (beforeIdx > afterIdx) errors.push(`${htmlRel}: ${before} must load before ${after}`);
}

const bridgeRel = 'src/infrastructure/legacy/state-bridge.js';
const legacyStateRel = 'src/infrastructure/legacy/state.js';
const runtimeStateRel = 'src/core/state/runtime-state.js';
const prefabRegistryRel = 'src/core/state/prefab-registry.js';
const sceneSessionRel = 'src/core/state/scene-session-state.js';
const stateActionsRel = 'src/application/state/state-actions.js';

for (const rel of [bridgeRel, legacyStateRel, runtimeStateRel, prefabRegistryRel, sceneSessionRel, stateActionsRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const bridgeSource = exists(bridgeRel) ? read(bridgeRel) : '';
const legacySource = exists(legacyStateRel) ? read(legacyStateRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  htmlLoadsBefore(source, runtimeStateRel, bridgeRel, htmlRel);
  htmlLoadsBefore(source, prefabRegistryRel, bridgeRel, htmlRel);
  htmlLoadsBefore(source, sceneSessionRel, bridgeRel, htmlRel);
  htmlLoadsBefore(source, stateActionsRel, bridgeRel, htmlRel);
  htmlLoadsBefore(source, bridgeRel, legacyStateRel, htmlRel);
}

const requiredBridgeApi = [
  'getStateNamespacePath',
  'getStateApis',
  'getPlacementLegacyBridgeState',
  'callLegacyPlacement',
  'reportLegacyStateBootOwnership',
  'summarizeBoundary'
];
for (const symbol of requiredBridgeApi) {
  if (!bridgeSource.includes(symbol)) errors.push(`${bridgeRel}: missing ${symbol}`);
}
if (!bridgeSource.includes('global.__LEGACY_STATE_BRIDGE__')) {
  errors.push(`${bridgeRel}: must expose global.__LEGACY_STATE_BRIDGE__`);
}
if (!bridgeSource.includes("infrastructure.legacyStateBridge")) {
  errors.push(`${bridgeRel}: must bind App.infrastructure.legacyStateBridge through namespace`);
}
if (!bridgeSource.includes('canonicalOwners')) {
  errors.push(`${bridgeRel}: summarizeBoundary must report canonicalOwners`);
}

if (!legacySource.includes('getLegacyStateBridgeApiForLegacyState')) {
  errors.push(`${legacyStateRel}: must access bridge through getLegacyStateBridgeApiForLegacyState`);
}
if (!legacySource.includes('reportLegacyStateBootOwnership')) {
  errors.push(`${legacyStateRel}: must delegate boot ownership reporting to state-bridge`);
}
if (/function\s+getStateNamespacePath\s*\([^)]*\)\s*\{[\s\S]{0,240}__APP_NAMESPACE\.getPath/.test(legacySource)) {
  errors.push(`${legacyStateRel}: must not own raw namespace access helper body`);
}
if (/function\s+callLegacyPlacement\s*\([^)]*\)\s*\{[\s\S]{0,480}window\[action\]/.test(legacySource)) {
  errors.push(`${legacyStateRel}: must not own raw placement legacy dispatch body`);
}
if (legacySource.includes("logCompatMapping('LOCAL_SCENE_STORAGE_KEY'")) {
  errors.push(`${legacyStateRel}: boot compat-mapping table must live in ${bridgeRel}`);
}
if (legacySource.includes("setRefactorStep('Phase-A-02'")) {
  errors.push(`${legacyStateRel}: Phase-A boot ownership report must live in ${bridgeRel}`);
}

const bridgeForbidden = [
  { pattern: /\bctx\s*\./, reason: 'canvas context drawing' },
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\blocalStorage\s*\./, reason: 'browser persistence access' },
];
for (const item of bridgeForbidden) {
  if (item.pattern.test(bridgeSource)) errors.push(`${bridgeRel}: forbidden ${item.reason}`);
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: listRootHtml(),
  bridgeRel,
  legacyStateRel,
  errors,
  warnings,
};

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
