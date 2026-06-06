const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const registry = fs.readFileSync(path.join(root, 'src/core/state/prefab-registry.js'), 'utf8');
const placement = fs.readFileSync(path.join(root, 'src/application/placement/placement.js'), 'utf8');
const sceneDomain = fs.readFileSync(path.join(root, 'src/core/domain/scene-domain-core.js'), 'utf8');

assert(registry.includes('h: d,'), 'liquid prefab voxel height must equal liquid depth, not a full h=1 cube');
assert(registry.includes('liquidDepth: d'), 'liquid prefab should carry explicit liquidDepth metadata');
assert(placement.includes('liquidDepth: v.liquidDepth'), 'placement box expansion must preserve liquidDepth');
assert(placement.includes('waterAmount: v.waterAmount'), 'placement box expansion must preserve waterAmount');
assert(placement.includes('fluidRenderPrototype: v.fluidRenderPrototype === true'), 'placement box expansion must preserve fluid render marker');
assert(sceneDomain.includes('liquidDepth: v.liquidDepth'), 'preview/projectWorldBoxes must preserve liquidDepth');
assert(sceneDomain.includes('waterAmount: v.waterAmount'), 'preview/projectWorldBoxes must preserve waterAmount');

console.log('liquid-prefab-metadata-propagation.test.js PASS');
