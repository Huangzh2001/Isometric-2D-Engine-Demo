const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
const readerSource = fs.readFileSync(path.join(__dirname, '..', 'src/core/domain/occupancy-reader-core.js'), 'utf8');
const chunkCacheSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/static-world-cache.js'), 'utf8');

assert(indexSource.includes('src/core/domain/occupancy-reader-core.js'), 'main entry should load the occupancy reader core');
assert(readerSource.includes('createOccupancyReader'), 'occupancy reader core should expose createOccupancyReader');
assert(renderSource.includes('resolveChunkOccupancyReaderForRender'), 'render layer should resolve chunk occupancy readers');
assert(renderSource.includes('occupancy: opts.occupancy'), 'render layer should attempt to use the scene-level occupancy cache');
assert(renderSource.includes("sourceLabel: 'global'"), 'render layer should label the preferred occupancy path as global');
assert(renderSource.includes('buildChunkLocalOccupancyMap(localBoxes, Array.isArray(opts.neighborBoxes) ? opts.neighborBoxes : [])'), 'render layer should keep local occupancy fallback construction');
assert(renderSource.includes('usedGlobalOccupancy'), 'chunk rebuild stats should expose global occupancy usage');
assert(renderSource.includes('usedLocalOccupancyFallback'), 'chunk rebuild stats should expose local fallback usage');
assert(chunkCacheSource.includes('globalOccupancyChunkCountThisFrame'), 'static chunk cache summary should count chunks rebuilt with global occupancy');
assert(chunkCacheSource.includes('localOccupancyFallbackChunkCountThisFrame'), 'static chunk cache summary should count local occupancy fallbacks');
console.log('static-world-global-occupancy-reader.test.js: OK');
