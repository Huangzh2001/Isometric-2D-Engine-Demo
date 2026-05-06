#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const ownerPath = path.join(root, 'src/infrastructure/assets/habbo-placement-import-service.js');
const assetPath = path.join(root, 'src/infrastructure/assets/asset-management.js');
const indexPath = path.join(root, 'index.html');
const owner = fs.readFileSync(ownerPath, 'utf8');
const asset = fs.readFileSync(assetPath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');
const errors = [];
function must(cond, msg) { if (!cond) errors.push(msg); }
must(owner.includes('loadHabboLibraryItemToPlacement'), 'owner must implement loadHabboLibraryItemToPlacement');
must(owner.includes('__HABBO_PLACEMENT_IMPORT_SERVICE__'), 'owner must export __HABBO_PLACEMENT_IMPORT_SERVICE__');
must(owner.includes('setHabboImportStatus'), 'owner must use injected import-status callback rather than direct UI access');
must(!/\bui\s*&&\s*ui\.habboImportStatus/.test(owner), 'owner must not directly access ui.habboImportStatus');
must(asset.includes('function getHabboPlacementImportService()') && /async function loadHabboLibraryItemToPlacement\(item, options\)\s*{[\s\S]*service\.loadHabboLibraryItemToPlacement/.test(asset), 'asset-management loadHabboLibraryItemToPlacement must delegate to service');
must(!/async function loadHabboLibraryItemToPlacement\(item, options\)\s*{[\s\S]{0,1000}importHabboSwfToSceneFromBuffer\(/.test(asset), 'asset-management wrapper must not import Habbo SWF directly');
const serviceIdx = index.indexOf('src/infrastructure/assets/habbo-placement-import-service.js');
const assetIdx = index.indexOf('src/infrastructure/assets/asset-management.js');
must(serviceIdx >= 0 && assetIdx >= 0 && serviceIdx < assetIdx, 'index.html must load habbo-placement-import-service.js before asset-management.js');
if (errors.length) { console.error(JSON.stringify({status:'FAIL', errors}, null, 2)); process.exit(1); }
console.log(JSON.stringify({status:'PASS', checked:['habbo-placement-import-service boundary']}, null, 2));
