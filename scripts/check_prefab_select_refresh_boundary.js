#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const errors = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function extractNamedFunctionBody(source, name) {
  const fnMarker = `function ${name}`;
  const start = source.indexOf(fnMarker);
  if (start < 0) return '';
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart + 1, i);
    }
  }
  return source.slice(braceStart + 1);
}
const ownerRel = 'src/presentation/ui/prefab-select-refresh.js';
const facadeRel = 'src/infrastructure/assets/asset-management.js';
const indexRel = 'index.html';
for (const rel of [ownerRel, facadeRel, indexRel]) if (!exists(rel)) errors.push(`missing required file: ${rel}`);
const owner = exists(ownerRel) ? read(ownerRel) : '';
const facade = exists(facadeRel) ? read(facadeRel) : '';
const index = exists(indexRel) ? read(indexRel) : '';
if (index.includes(ownerRel) && index.includes(facadeRel) && index.indexOf(ownerRel) > index.indexOf(facadeRel)) errors.push(`${indexRel}: prefab select refresh owner must load before asset-management.js`);
for (const symbol of ['__PREFAB_SELECT_REFRESH__', 'refreshPrefabSelectOptions', 'buildPrefabSelectText', 'prefabSelectRefreshGuard', 'createElement', 'refresh-start', 'refresh-done']) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing symbol ${symbol}`);
}
if (!facade.includes('function getPrefabSelectRefreshService') || !facade.includes('__PREFAB_SELECT_REFRESH__')) errors.push(`${facadeRel}: must resolve prefab select refresh owner`);
const body = extractNamedFunctionBody(facade, 'refreshPrefabSelectOptions');
if (!body.includes('service.refreshPrefabSelectOptions')) errors.push(`${facadeRel}: refreshPrefabSelectOptions must delegate to owner`);
for (const forbidden of ['createElement', 'appendChild', 'prefabSelectRefreshGuard', 'refresh-start', 'refresh-done']) {
  if (body.includes(forbidden)) errors.push(`${facadeRel}: refreshPrefabSelectOptions wrapper still contains implementation marker ${forbidden}`);
}
for (const forbidden of ['fetchHabboLibrary', 'scanAssetPrefabs', 'localStorage', 'getContext(', 'setHabboAssetRootConfig']) {
  if (owner.includes(forbidden)) errors.push(`${ownerRel}: must not own infrastructure/render/controller responsibility marker ${forbidden}`);
}
const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 26000) errors.push(`${ownerRel}: owner is ${ownerBytes} bytes; split before it becomes a new large node`);
if (errors.length) { console.error(JSON.stringify({ status: 'FAIL', ownerRel, facadeRel, ownerBytes, errors }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ status: 'PASS', ownerRel, facadeRel, ownerBytes }, null, 2));
