#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const ownerPath = path.join(root, 'src/infrastructure/assets/asset-workflow-service.js');
const assetPath = path.join(root, 'src/infrastructure/assets/asset-management.js');
const indexPath = path.join(root, 'index.html');
const owner = fs.readFileSync(ownerPath, 'utf8');
const asset = fs.readFileSync(assetPath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');
const errors = [];
function must(cond, msg) { if (!cond) errors.push(msg); }
must(owner.includes('createAssetWorkflowApi'), 'owner must expose createAssetWorkflowApi');
must(owner.includes('__ASSET_WORKFLOW_SERVICE__'), 'owner must export __ASSET_WORKFLOW_SERVICE__');
must(owner.includes('ensureHabboRootReadyViaWorkflow'), 'owner must own workflow operation implementations');
must(asset.includes('assetWorkflowService.createAssetWorkflowApi(createAssetWorkflowDeps())'), 'asset-management must create workflow API through owner');
must(!asset.includes('var assetWorkflowCounters'), 'asset-management must not own workflow counters');
must(!asset.includes('function ensureHabboRootReadyViaWorkflow'), 'asset-management must not own workflow operation implementations');
const serviceIdx = index.indexOf('src/infrastructure/assets/asset-workflow-service.js');
const assetIdx = index.indexOf('src/infrastructure/assets/asset-management.js');
must(serviceIdx >= 0 && assetIdx >= 0 && serviceIdx < assetIdx, 'index.html must load asset-workflow-service.js before asset-management.js');
if (errors.length) { console.error(JSON.stringify({status:'FAIL', errors}, null, 2)); process.exit(1); }
console.log(JSON.stringify({status:'PASS', checked:['asset-workflow-service boundary']}, null, 2));
