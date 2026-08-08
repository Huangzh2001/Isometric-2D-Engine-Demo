#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const registryRel = 'src/core/state/prefab-registry.js';
const assetImportRel = 'src/application/assets/asset-import.js';
const bundleRel = 'dist/bundles/main-1.bundle.js';
const registrySource = fs.readFileSync(path.join(root, registryRel), 'utf8');
const assetImportSource = fs.readFileSync(path.join(root, assetImportRel), 'utf8');
const bundleSource = fs.readFileSync(path.join(root, bundleRel), 'utf8');

assert(registrySource.includes('function refreshPrototypeSelection(meta)'), `${registryRel} must retain the canonical registry refresh owner`);
assert(!assetImportSource.includes('function refreshPrototypeSelection(source)'), `${assetImportRel} must not redeclare the canonical global name`);
assert(assetImportSource.includes('function refreshImportedPrototypeSelection(source)'), `${assetImportRel} must use a collision-free private helper name`);
assert(assetImportSource.includes("refreshImportedPrototypeSelection(String(options.refreshSource || 'asset-import:select-imported-prefab'))"), `${assetImportRel} must call the renamed helper`);

const canonicalDeclarations = (bundleSource.match(/function refreshPrototypeSelection\(/g) || []).length;
const importedHelperDeclarations = (bundleSource.match(/function refreshImportedPrototypeSelection\(/g) || []).length;
assert.strictEqual(canonicalDeclarations, 1, `${bundleRel} must contain exactly one refreshPrototypeSelection declaration; bundle-wide function hoisting otherwise rewires the registry API`);
assert.strictEqual(importedHelperDeclarations, 1, `${bundleRel} must contain exactly one renamed asset-import helper`);

const registryFnIndex = bundleSource.indexOf('function refreshPrototypeSelection(meta)');
const registryApiIndex = bundleSource.indexOf('refreshPrototypeSelection:refreshPrototypeSelection');
const importedHelperIndex = bundleSource.indexOf('function refreshImportedPrototypeSelection(source)');
assert(registryFnIndex >= 0 && registryApiIndex > registryFnIndex, 'bundle must register the canonical registry refresh function');
assert(importedHelperIndex > registryApiIndex, 'asset-import helper should remain later in the bundle without shadowing the canonical name');

const helperBodyStart = importedHelperIndex;
const helperBodyEnd = bundleSource.indexOf('function persistCustomPrefabs', helperBodyStart);
const helperBody = bundleSource.slice(helperBodyStart, helperBodyEnd);
assert(helperBody.includes("registryApi.refreshPrototypeSelection({source:String(source||'asset-import:refresh-prototype-selection')})"), 'asset-import helper must delegate once to the registry API');
assert(!helperBody.includes('function refreshPrototypeSelection('), 'asset-import helper must not reintroduce the colliding declaration');

console.log(JSON.stringify({
  status: 'PASS',
  verified: [
    'prefab registry owns the only top-level refreshPrototypeSelection function',
    'asset import uses a collision-free helper name',
    'main-1 bundle cannot hoist the asset-import helper over the registry API'
  ]
}, null, 2));
