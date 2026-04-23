const fs = require('fs');
const assert = require('assert');

const controllerSource = fs.readFileSync('src/application/controllers/app-controllers.js', 'utf8');
const renderSource = fs.readFileSync('src/presentation/render/render.js', 'utf8');
const placementSource = fs.readFileSync('src/application/placement/placement.js', 'utf8');

assert(controllerSource.includes("'TERRAIN-GENERATE-PROFILE'") || controllerSource.includes('"TERRAIN-GENERATE-PROFILE"'), 'terrain generation flow should emit structured terrain profiling logs');
assert(controllerSource.includes('buildHeightMapMs'), 'terrain generation profile should include buildHeightMapMs');
assert(controllerSource.includes('buildPlacementPlanMs'), 'terrain generation profile should include buildPlacementPlanMs');
assert(controllerSource.includes('buildTerrainInstancesMs'), 'terrain generation profile should include buildTerrainInstancesMs');
assert(controllerSource.includes("'SCENE-COMMIT-PROFILE'") || controllerSource.includes('[SCENE-COMMIT-PROFILE]'), 'controller scene commits should emit structured commit logs');
assert(placementSource.includes("step: 'rebuildBoxesFromInstances'"), 'placement rebuild should annotate rebuildBoxesFromInstances scene-commit step');
assert(renderSource.includes('[STATIC-BOX-CACHE-PROFILE]'), 'render layer should emit static box cache profiling logs');
assert(renderSource.includes('[TERRAIN-FIRST-FRAMES]'), 'render layer should emit terrain first-frame diagnostics');
assert(renderSource.includes('staticCacheRebuiltThisFrame'), 'render frame summaries should include staticCacheRebuiltThisFrame');
assert(renderSource.includes('staticCacheBuildMs'), 'render frame summaries should include staticCacheBuildMs');
