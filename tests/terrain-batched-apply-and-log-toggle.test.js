const fs = require('fs');
const path = require('path');
const assert = require('assert');

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

const indexHtml = read('index.html');
const uiJs = read('src/presentation/ui/ui.js');
const runtimeState = read('src/core/state/runtime-state.js');
const terrainCore = read('src/core/domain/terrain-generator-core.js');
const appControllers = read('src/application/controllers/app-controllers.js');
const appShell = read('src/presentation/shell/app.js');
const renderJs = read('src/presentation/render/render.js');
const staticWorldCache = read('src/presentation/render/static-world-cache.js');

assert(indexHtml.includes('terrainDetailedProfilingEnabled'), 'index.html should expose detailed terrain log toggle');
assert(uiJs.includes('uiHandleTerrainDetailedProfilingToggle'), 'ui should bind detailed terrain log toggle');
assert(runtimeState.includes('terrainDetailedProfilingEnabled: false'), 'runtime terrain settings should default detailed terrain profiling to false');
assert(terrainCore.includes('terrainDetailedProfilingEnabled: false'), 'terrain core defaults should include detailed terrain profiling flag');
assert(appControllers.includes('tickMainEditorTerrainApply'), 'main controller should expose terrain apply tick');
assert(appControllers.includes('replaceCurrentSceneGraph'), 'terrain batching should use replaceCurrentSceneGraph for staged scene updates');
assert(appControllers.includes("applyMode: 'batched'"), 'terrain generate should report batched apply mode');
assert(appShell.includes('tickMainEditorTerrainApply'), 'main app loop should advance terrain apply batches');
assert(renderJs.includes('terrainDetailedProfilingEnabled'), 'render terrain settings should include detailed terrain profiling flag');
assert(staticWorldCache.includes('terrainDetailedProfilingEnabled'), 'static world cache should consult terrain detailed profiling flag');

console.log('terrain batched apply and log toggle contracts verified');
