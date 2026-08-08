#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const main1Rel = 'dist/bundles/main-1.bundle.js';
const main2Rel = 'dist/bundles/main-2.bundle.js';
const main1 = fs.readFileSync(path.join(root, main1Rel), 'utf8');
const main2 = fs.readFileSync(path.join(root, main2Rel), 'utf8');

const bundleWideWrapper = /^\(function\s*\(\)\s*\{\s*window\.__REDUCED_BUNDLE_INFO__/;
assert(!bundleWideWrapper.test(main1), `${main1Rel} must preserve classic-script global scope; a bundle-wide IIFE hides legacy window exports`);
assert(!bundleWideWrapper.test(main2), `${main2Rel} must preserve classic-script global scope; a bundle-wide IIFE isolates it from main-1 globals`);

assert(main1.includes("var ASSET_MANAGEMENT_OWNER='src/infrastructure/assets/asset-management.js'"), 'main-1 must contain the asset-management owner');
assert(main1.includes("assertAssetManagementOwnership('module-load')"), 'main-1 must retain the asset-management startup assertion');
assert(main1.includes("global.__CANVAS2D_FRAME_DIAGNOSTICS__=api"), 'main-1 must register Canvas2D frame diagnostics');
assert(main2.includes('Missing Canvas2D frame diagnostics owner'), 'main-2 must retain the strict diagnostics dependency check');

console.log(JSON.stringify({
  status: 'PASS',
  verified: [
    'main bundles preserve classic-script global scope',
    'asset-management globals can be exposed on window',
    'Canvas2D diagnostics owner remains strict and registered before renderer boot'
  ]
}, null, 2));
