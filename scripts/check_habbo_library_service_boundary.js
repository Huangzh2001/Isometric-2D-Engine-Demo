#!/usr/bin/env node
/*
 * P11d-2 Habbo library service boundary check.
 * Ensures Habbo library summary/page/index fetch orchestration is owned by
 * src/infrastructure/assets/habbo-library-service.js and asset-management.js delegates.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function extractNamedFunctionBody(source, name) {
  const asyncMarker = `async function ${name}`;
  const fnMarker = `function ${name}`;
  let start = source.indexOf(asyncMarker);
  if (start < 0) start = source.indexOf(fnMarker);
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

const ownerRel = 'src/infrastructure/assets/habbo-library-service.js';
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
if (!index.includes('src/infrastructure/assets/asset-prefab-scan-service.js') || index.indexOf('src/infrastructure/assets/asset-prefab-scan-service.js') > index.indexOf(ownerRel)) {
  errors.push(`${indexRel}: habbo library service must load after asset-prefab-scan-service.js and before asset-management.js`);
}
for (const symbol of [
  '__HABBO_LIBRARY_SERVICE__',
  'async function fetchHabboLibrarySummary',
  'async function fetchHabboLibraryPage',
  'async function fetchHabboLibraryIndex',
  'summary-fetch:start',
  'page-fetch:start',
  'fetchLibrarySummary',
  'fetchLibraryPage'
]) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing Habbo library service symbol ${symbol}`);
}
if (!facade.includes('function getHabboLibraryService') || !facade.includes('__HABBO_LIBRARY_SERVICE__')) {
  errors.push(`${facadeRel}: must resolve Habbo library service`);
}
for (const name of ['fetchHabboLibrarySummary', 'fetchHabboLibraryPage', 'fetchHabboLibraryIndex']) {
  const body = extractNamedFunctionBody(facade, name);
  if (!body.includes(`service.${name}`)) errors.push(`${facadeRel}: ${name} must delegate to owner`);
}
const summaryBody = extractNamedFunctionBody(facade, 'fetchHabboLibrarySummary');
const pageBody = extractNamedFunctionBody(facade, 'fetchHabboLibraryPage');
for (const forbidden of [
  'fetchLibrarySummary({ requestId',
  'summary-fetch:start',
  'summary-fetch:done',
  'summary-fetch:slow',
  'categoriesByType',
  'buildState'
]) {
  if (summaryBody.includes(forbidden)) errors.push(`${facadeRel}: fetchHabboLibrarySummary wrapper still contains implementation marker ${forbidden}`);
}
for (const forbidden of [
  'fetchLibraryPage(params.toString()',
  'page-fetch:start',
  'page-fetch:done',
  'new URLSearchParams',
  'ensureHabboLibrarySelection',
  'items.map(function'
]) {
  if (pageBody.includes(forbidden)) errors.push(`${facadeRel}: fetchHabboLibraryPage wrapper still contains implementation marker ${forbidden}`);
}
const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 32000) errors.push(`${ownerRel}: owner is ${ownerBytes} bytes; split before it becomes a new large node`);
if (owner.includes('document.') || owner.includes('localStorage') || owner.includes('getContext(')) {
  errors.push(`${ownerRel}: Habbo library service must not take DOM/Canvas/localStorage responsibilities`);
}

if (errors.length) {
  console.error(JSON.stringify({ status: 'FAIL', ownerRel, facadeRel, ownerBytes, errors, warnings }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', ownerRel, facadeRel, ownerBytes, errors, warnings }, null, 2));
