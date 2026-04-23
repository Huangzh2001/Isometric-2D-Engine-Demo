const fs = require('fs');
const assert = require('assert');

const renderSource = fs.readFileSync('src/presentation/render/render.js', 'utf8');
const staticWorldCacheSource = fs.readFileSync('src/presentation/render/static-world-cache.js', 'utf8');
const runtimeStateSource = fs.readFileSync('src/core/state/runtime-state.js', 'utf8');

assert(renderSource.includes('function getMainEditorDisplayScaleForRender()'), 'render should expose a display-scale reader for the main editor');
assert(renderSource.includes('return getMainEditorDisplayScaleForRender();'), 'render zoom reporting should use display scale as the reported value');
assert(!renderSource.includes('targetCtx.scale(zoom, zoom);'), 'main camera transform should not apply an extra canvas zoom scale on top of tile/world scaling');
assert(renderSource.includes('void zoom;'), 'viewport bounds before zoom should ignore a second canvas-zoom path');
assert(runtimeStateSource.includes('syncLegacyWorldZoomFromEditor'), 'runtime state should keep legacy world scale in sync with the editor zoom source');
assert(staticWorldCacheSource.includes("rebuildBudgetValue: 1"), 'static world cache should default to a one-chunk-per-frame rebuild budget');
assert(staticWorldCacheSource.includes("scene-sync-cached"), 'static world cache should have a cached fast-path when scene cache version has not changed');

console.log('zoom-and-budget-fix.test.js: OK');
