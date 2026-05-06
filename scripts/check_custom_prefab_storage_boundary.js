#!/usr/bin/env node
/*
 * P11d-3 Custom prefab storage boundary check.
 * Ensures custom prefab list/save/load localStorage persistence is owned by
 * src/infrastructure/assets/custom-prefab-storage.js and asset-management.js delegates.
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

const ownerRel = 'src/infrastructure/assets/custom-prefab-storage.js';
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
  '__CUSTOM_PREFAB_STORAGE__',
  'function listCustomPrefabs',
  'function saveCustomPrefabsToLocalStorage',
  'function loadCustomPrefabsFromLocalStorage',
  'LOCAL_PREFAB_STORAGE_KEY',
  'window.localStorage.setItem',
  'window.localStorage.getItem'
]) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing custom prefab storage symbol ${symbol}`);
}
if (!facade.includes('function getCustomPrefabStorageService') || !facade.includes('__CUSTOM_PREFAB_STORAGE__')) {
  errors.push(`${facadeRel}: must resolve custom prefab storage service`);
}
for (const name of ['listCustomPrefabs', 'saveCustomPrefabsToLocalStorage', 'loadCustomPrefabsFromLocalStorage']) {
  const body = extractNamedFunctionBody(facade, name);
  if (!body.includes(`service.${name}`)) errors.push(`${facadeRel}: ${name} must delegate to owner`);
}
for (const [name, forbidden] of [
  ['listCustomPrefabs', 'prototypes.filter'],
  ['saveCustomPrefabsToLocalStorage', 'window.localStorage.setItem'],
  ['loadCustomPrefabsFromLocalStorage', 'window.localStorage.getItem'],
  ['loadCustomPrefabsFromLocalStorage', 'JSON.parse(raw)'],
  ['loadCustomPrefabsFromLocalStorage', 'importPrefabDefinition(def']
]) {
  const body = extractNamedFunctionBody(facade, name);
  if (body.includes(forbidden)) errors.push(`${facadeRel}: ${name} wrapper still contains implementation marker ${forbidden}`);
}
const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 12000) errors.push(`${ownerRel}: owner is ${ownerBytes} bytes; split before it becomes a new large node`);
if (owner.includes('document.') || owner.includes('getContext(') || owner.includes('fetch(')) {
  errors.push(`${ownerRel}: custom prefab storage must not take DOM/Canvas/network responsibilities`);
}

if (errors.length) {
  console.error(JSON.stringify({ status: 'FAIL', ownerRel, facadeRel, ownerBytes, errors, warnings }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', ownerRel, facadeRel, ownerBytes, errors, warnings }, null, 2));
