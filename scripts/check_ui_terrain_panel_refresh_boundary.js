#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const errors = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function extractNamedFunctionBody(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
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
const ownerRel = 'src/presentation/ui/ui-terrain-panel-refresh.js';
const facadeRel = 'src/presentation/ui/ui.js';
const indexRel = 'index.html';
for (const rel of [ownerRel, facadeRel, indexRel]) if (!exists(rel)) errors.push(`missing required file: ${rel}`);
const owner = exists(ownerRel) ? read(ownerRel) : '';
const facade = exists(facadeRel) ? read(facadeRel) : '';
const index = exists(indexRel) ? read(indexRel) : '';
if (index.includes(ownerRel) && index.includes(facadeRel) && index.indexOf(ownerRel) > index.indexOf(facadeRel)) errors.push(`${indexRel}: ui-terrain-panel-refresh.js must load before ui.js`);
for (const symbol of ['__UI_TERRAIN_PANEL_REFRESH__', 'uiReadMainTerrainFormValues', 'uiApplyMainTerrainSettingsToForm', 'uiRefreshMainTerrainPanel', 'uiUpdateTerrainAlgorithmPanel', 'terrainAlgorithmHint']) {
  if (!owner.includes(symbol)) errors.push(`${ownerRel}: missing symbol ${symbol}`);
}
if (!facade.includes('function getUiTerrainPanelRefreshService') || !facade.includes('__UI_TERRAIN_PANEL_REFRESH__')) errors.push(`${facadeRel}: must resolve terrain panel owner`);
for (const fn of ['uiReadMainTerrainFormValues', 'uiApplyMainTerrainSettingsToForm', 'uiRefreshMainTerrainPanel', 'uiUpdateTerrainAlgorithmPanel']) {
  const body = extractNamedFunctionBody(facade, fn);
  if (!body.includes('getUiTerrainPanelRefreshService')) errors.push(`${facadeRel}: ${fn} must delegate to owner`);
  for (const forbidden of ['terrainAlgorithmHint.textContent', 'terrainSummary.textContent', 'terrainDetails.textContent', 'heightProfileConfig: uiReadTerrainProfileRows']) {
    if (body.includes(forbidden)) errors.push(`${facadeRel}: ${fn} wrapper still contains implementation marker ${forbidden}`);
  }
}
for (const forbidden of ['fetch(', 'localStorage', 'getContext(', 'scene-storage', 'asset-management', 'canvas2d-renderer']) {
  if (owner.includes(forbidden)) errors.push(`${ownerRel}: must not own unrelated responsibility marker ${forbidden}`);
}
const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 28000) errors.push(`${ownerRel}: owner is ${ownerBytes} bytes; split before it becomes a new large node`);
if (errors.length) { console.error(JSON.stringify({ status: 'FAIL', ownerRel, facadeRel, ownerBytes, errors }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ status: 'PASS', ownerRel, facadeRel, ownerBytes }, null, 2));
