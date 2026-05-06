const fs = require('fs');
const assert = require('assert');

const controllerSource = fs.readFileSync('src/application/controllers/app-controllers.js', 'utf8');
const controllerDiagnosticsSource = fs.readFileSync('src/application/controllers/controller-diagnostics.js', 'utf8');
const terrainGenerationControllerSource = fs.readFileSync('src/application/controllers/terrain-generation-controller.js', 'utf8');
const renderSource = fs.readFileSync('src/presentation/render/render.js', 'utf8');
const renderDiagnosticsSource = fs.readFileSync('src/presentation/render/diagnostics/render-diagnostics.js', 'utf8');
const placementSource = fs.readFileSync('src/application/placement/placement.js', 'utf8');

assert(controllerDiagnosticsSource.includes("'TERRAIN-GENERATE-PROFILE'") || controllerDiagnosticsSource.includes('"TERRAIN-GENERATE-PROFILE"'), 'terrain generation flow should emit structured terrain profiling logs through controller-diagnostics owner');
assert(terrainGenerationControllerSource.includes('buildHeightMapMs'), 'terrain generation profile should include buildHeightMapMs');
assert(terrainGenerationControllerSource.includes('buildPlacementPlanMs'), 'terrain generation profile should include buildPlacementPlanMs');
assert(terrainGenerationControllerSource.includes('buildTerrainInstancesMs'), 'terrain generation profile should include buildTerrainInstancesMs');
assert(controllerDiagnosticsSource.includes("'SCENE-COMMIT-PROFILE'") || controllerDiagnosticsSource.includes('[SCENE-COMMIT-PROFILE]'), 'controller scene commits should emit structured commit logs through controller-diagnostics owner');
assert(placementSource.includes("step: 'rebuildBoxesFromInstances'"), 'placement rebuild should annotate rebuildBoxesFromInstances scene-commit step');
assert(renderSource.includes('[STATIC-BOX-CACHE-PROFILE]') || renderDiagnosticsSource.includes('STATIC-BOX-CACHE-PROFILE'), 'render layer should emit static box cache profiling logs through diagnostics owner');
assert(renderSource.includes('[TERRAIN-FIRST-FRAMES]') || renderDiagnosticsSource.includes('TERRAIN-FIRST-FRAMES'), 'render layer should emit terrain first-frame diagnostics through diagnostics owner');
assert(renderSource.includes('staticCacheRebuiltThisFrame'), 'render frame summaries should include staticCacheRebuiltThisFrame');
assert(renderSource.includes('staticCacheBuildMs'), 'render frame summaries should include staticCacheBuildMs');
