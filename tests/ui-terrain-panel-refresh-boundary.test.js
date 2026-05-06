#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const ownerRel = 'src/presentation/ui/ui-terrain-panel-refresh.js';
const facadeRel = 'src/presentation/ui/ui.js';
const owner = fs.readFileSync(path.join(root, ownerRel), 'utf8');
const facade = fs.readFileSync(path.join(root, facadeRel), 'utf8');
assert(owner.includes('__UI_TERRAIN_PANEL_REFRESH__'), 'owner API missing');
assert(owner.includes('uiReadMainTerrainFormValues'), 'terrain form read owner missing');
assert(owner.includes('uiRefreshMainTerrainPanel'), 'terrain refresh owner missing');
assert(facade.includes('getUiTerrainPanelRefreshService'), 'facade resolver missing');
assert(facade.includes('service.uiReadMainTerrainFormValues'), 'terrain form wrapper missing');
assert(facade.includes('service.uiRefreshMainTerrainPanel'), 'terrain refresh wrapper missing');
assert(!facade.includes('ui.terrainAlgorithmHint.textContent ='), 'terrain algorithm hint implementation must leave ui.js');
console.log('PASS ui-terrain-panel-refresh-boundary');
