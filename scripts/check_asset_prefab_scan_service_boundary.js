#!/usr/bin/env node
/*
 * P11d-1 Asset prefab scan service boundary check.
 * Ensures asset prefab scan state/snapshot/scan loop is owned by
 * src/infrastructure/assets/asset-prefab-scan-service.js and asset-management.js delegates.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function extractNamedFunctionBody(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  if (start < 0) return '';
  const braceStart = source.indexOf('{', start);
  if (braceStart < 0) return '';
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart + 1, i);
    }
  }
  return source.slice(braceStart + 1);
}

const ownerRel = 'src/infrastructure/assets/asset-prefab-scan-service.js';
const facadeRel = 'src/infrastructure/assets/asset-management.js';
const indexRel = 'index.html';
for (const rel of [ownerRel, facadeRel, indexRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}
const owner = exists(ownerRel) ? read(ownerRel) : '';
const facade = exists(facadeRel) ? read(facadeRel) : '';
const index = exists(indexRel) ? read(indexRel) : '';

if (index.includes(ownerRel) && index.includes(facadeRel) && index.indexOf(ownerRel) > index.indexOf(facadeRel)) {
  errors.push(`${indexRel}: ${ownerRel} must load before ${facadeRel}`);
}
for (const symbol of [
  '__ASSET_PREFAB_SCAN_SERVICE__',
  'function ensureAssetPrefabScanState()',
  'function getAssetPrefabScanSnapshot(deps)',
  'async function scanAssetPrefabs(forceOrOptions, deps)',
  'markAssetManagedPrefab',
  'prefabApi.fetchIndex',
  'assetApi.fetchJsonAsset'
]) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing scan service symbol ${symbol}`);
}
if (!facade.includes('getAssetPrefabScanService') || !facade.includes('__ASSET_PREFAB_SCAN_SERVICE__')) {
  errors.push(`${facadeRel}: must resolve asset prefab scan service`);
}
if (!facade.includes('createAssetPrefabScanDeps')) {
  errors.push(`${facadeRel}: must use explicit dependency injection for asset prefab scan service`);
}
const scanBody = extractNamedFunctionBody(facade, 'scanAssetPrefabs');
if (!scanBody.includes('service.scanAssetPrefabs')) errors.push(`${facadeRel}: scanAssetPrefabs must delegate to owner`);
for (const forbidden of [
  'prefabApi.fetchIndex',
  'assetApi.fetchJsonAsset',
  'for (var i = 0; i < data.items.length; i++)',
  'currentManagedById',
  'nextRecords',
  'scan start force='
]) {
  if (scanBody.includes(forbidden)) errors.push(`${facadeRel}: scanAssetPrefabs wrapper still contains implementation marker ${forbidden}`);
}
const ensureBody = extractNamedFunctionBody(facade, 'ensureAssetPrefabScanState');
if (!ensureBody.includes('service.ensureAssetPrefabScanState')) errors.push(`${facadeRel}: ensureAssetPrefabScanState must delegate to owner when available`);
const snapshotBody = extractNamedFunctionBody(facade, 'getAssetPrefabScanSnapshot');
if (!snapshotBody.includes('service.getAssetPrefabScanSnapshot')) errors.push(`${facadeRel}: getAssetPrefabScanSnapshot must delegate to owner`);
const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 36000) errors.push(`${ownerRel}: owner is ${ownerBytes} bytes; split before it becomes a new large node`);
if (owner.includes('document.') || owner.includes('localStorage') || owner.includes('canvas') || owner.includes('getContext(')) {
  errors.push(`${ownerRel}: scan service must not take DOM/Canvas/localStorage responsibilities`);
}

if (errors.length) {
  console.error(JSON.stringify({ status: 'FAIL', ownerRel, facadeRel, ownerBytes, errors, warnings }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', ownerRel, facadeRel, ownerBytes, errors, warnings }, null, 2));
