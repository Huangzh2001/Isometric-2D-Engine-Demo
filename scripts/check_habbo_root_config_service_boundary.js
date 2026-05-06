#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const errors = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function extractNamedFunctionBody(source, name) {
  const asyncMarker = `async function ${name}`;
  const fnMarker = `function ${name}`;
  let start = source.indexOf(asyncMarker);
  if (start < 0) start = source.indexOf(fnMarker);
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
const ownerRel = 'src/infrastructure/assets/habbo-root-config-service.js';
const facadeRel = 'src/infrastructure/assets/asset-management.js';
const indexRel = 'index.html';
for (const rel of [ownerRel, facadeRel, indexRel]) if (!exists(rel)) errors.push(`missing required file: ${rel}`);
const owner = exists(ownerRel) ? read(ownerRel) : '';
const facade = exists(facadeRel) ? read(facadeRel) : '';
const index = exists(indexRel) ? read(indexRel) : '';
if (index.includes(ownerRel) && index.includes(facadeRel) && index.indexOf(ownerRel) > index.indexOf(facadeRel)) errors.push(`${indexRel}: root config service must load before asset-management.js`);
for (const symbol of ['__HABBO_ROOT_CONFIG_SERVICE__', 'sanitizeHabboAssetRootInput', 'fetchHabboAssetRootConfig', 'setHabboAssetRootConfig', 'getHabboRootConfigInFlightState', 'awaitHabboRootConfigInFlight', 'habbo-root:get:start', 'habbo-root:set:start']) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing symbol ${symbol}`);
}
if (!facade.includes('function getHabboRootConfigService') || !facade.includes('__HABBO_ROOT_CONFIG_SERVICE__')) errors.push(`${facadeRel}: must resolve root config service`);
for (const name of ['fetchHabboAssetRootConfig', 'setHabboAssetRootConfig', 'sanitizeHabboAssetRootInput', 'getHabboRootConfigInFlightState', 'awaitHabboRootConfigInFlight']) {
  const body = extractNamedFunctionBody(facade, name);
  if (!body.includes(`service.${name}`)) errors.push(`${facadeRel}: ${name} must delegate to root config service`);
}
const fetchBody = extractNamedFunctionBody(facade, 'fetchHabboAssetRootConfig');
const setBody = extractNamedFunctionBody(facade, 'setHabboAssetRootConfig');
for (const forbidden of ['getConfig({ requestId', 'setConfig(root', 'habbo-root:get:start', 'habbo-root:set:start', 'habbo-root:set:response']) {
  if (fetchBody.includes(forbidden) || setBody.includes(forbidden)) errors.push(`${facadeRel}: root config wrapper still contains implementation marker ${forbidden}`);
}
const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 26000) errors.push(`${ownerRel}: owner is ${ownerBytes} bytes; split before it becomes a new large node`);
for (const forbidden of ['document.', 'localStorage', 'getContext(', 'refreshPrefabSelectOptions']) {
  if (owner.includes(forbidden)) errors.push(`${ownerRel}: must not own unrelated DOM/storage/renderer/prefab-select responsibility: ${forbidden}`);
}
if (errors.length) { console.error(JSON.stringify({ status: 'FAIL', ownerRel, facadeRel, ownerBytes, errors }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ status: 'PASS', ownerRel, facadeRel, ownerBytes }, null, 2));
