#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const ownerPath = path.join(root, 'src/infrastructure/assets/habbo-asset-file-service.js');
const assetPath = path.join(root, 'src/infrastructure/assets/asset-management.js');
const indexPath = path.join(root, 'index.html');
const owner = fs.readFileSync(ownerPath, 'utf8');
const asset = fs.readFileSync(assetPath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');
const errors = [];
function must(cond, msg) { if (!cond) errors.push(msg); }
must(owner.includes('fetchHabboAssetFileBuffer'), 'owner must implement fetchHabboAssetFileBuffer');
must(owner.includes('normalizeRelativePath'), 'owner must own relative path normalization helper');
must(owner.includes('__HABBO_ASSET_FILE_SERVICE__'), 'owner must export __HABBO_ASSET_FILE_SERVICE__');
must(asset.includes('function getHabboAssetFileService()') && /async function fetchHabboAssetFileBuffer\(relativePath\)\s*{[\s\S]*service\.fetchHabboAssetFileBuffer/.test(asset), 'asset-management fetchHabboAssetFileBuffer must delegate to service');
must(!/async function fetchHabboAssetFileBuffer\(relativePath\)\s*{[\s\S]{0,500}fetchFileBuffer\(/.test(asset), 'asset-management must not directly call fetchFileBuffer in fetchHabboAssetFileBuffer');
const serviceIdx = index.indexOf('src/infrastructure/assets/habbo-asset-file-service.js');
const assetIdx = index.indexOf('src/infrastructure/assets/asset-management.js');
must(serviceIdx >= 0 && assetIdx >= 0 && serviceIdx < assetIdx, 'index.html must load habbo-asset-file-service.js before asset-management.js');
if (errors.length) { console.error(JSON.stringify({status:'FAIL', errors}, null, 2)); process.exit(1); }
console.log(JSON.stringify({status:'PASS', checked:['habbo-asset-file-service boundary']}, null, 2));
