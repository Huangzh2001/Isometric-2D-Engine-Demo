const fs = require('fs');
const assert = require('assert');

const renderSource = fs.readFileSync('src/presentation/render/render.js', 'utf8');
const cacheSource = fs.readFileSync('src/presentation/render/static-world-cache.js', 'utf8');

assert(renderSource.includes('[CHUNK-REBUILD-DETAIL]'), 'render layer should emit per-chunk rebuild detail logs');
assert(renderSource.includes('[CHUNK-REBUILD-SCOPE-VERIFY]'), 'render layer should emit chunk scope verification logs');
assert(renderSource.includes('[CHUNK-REBUILD-HOTSPOT]'), 'render layer should emit chunk hotspot logs');
assert(renderSource.includes('step1_collectChunkBoxesMs'), 'chunk rebuild detail should include collectChunkBoxes timing');
assert(renderSource.includes('step8_finalizeChunkCacheMs'), 'chunk rebuild detail should include finalizeChunkCache timing');
assert(renderSource.includes('touchedGlobalRenderableList'), 'chunk scope verify should expose global renderable touch flags');
assert(renderSource.includes('[TERRAIN-FIRST-FRAMES-DETAIL]'), 'render layer should emit enhanced terrain first-frame detail logs');
assert(cacheSource.includes('[CHUNK-CACHE-SCHEDULER-DETAIL]'), 'static world cache should emit detailed scheduler logs');
assert(cacheSource.includes('pickedChunkKeysThisFrame'), 'scheduler detail should include picked chunk keys');
assert(cacheSource.includes('rebuiltChunkTotalVisibleFaceCount'), 'frame summary should include rebuilt visible face totals');


assert(renderSource.includes('[STATIC-RENDERABLE-BUILD-DETAIL]'), 'render layer should emit static renderable build detail logs');
assert(renderSource.includes('[STATIC-RENDERABLE-BUILD-HOTSPOT]'), 'render layer should emit static renderable build hotspot logs');
assert(renderSource.includes('[STATIC-RENDERABLE-BUILD-SCOPE-VERIFY]'), 'render layer should emit static renderable build scope logs');
assert(renderSource.includes('step1_prepareFaceInputsMs'), 'static renderable build detail should include prepareFaceInputs timing');
assert(renderSource.includes('step8_finalizeRenderableListMs'), 'static renderable build detail should include finalizeRenderableList timing');
assert(renderSource.includes('touchedGlobalStyleCache'), 'static renderable scope verify should expose style cache touch flags');

assert(renderSource.includes('[COLOR-BUILD-DETAIL]'), 'render layer should emit color build detail logs');
assert(renderSource.includes('[COLOR-BUILD-HOTSPOT]'), 'render layer should emit color hotspot logs');
assert(renderSource.includes('colorCacheHitCount'), 'color build detail should include cache hit counts');
assert(renderSource.includes('uniqueColorKeyCount'), 'color build detail should include unique color key counts');
assert(renderSource.includes('avgColorBuildMsPerRenderable'), 'color build detail should include average color build ms');
assert(renderSource.includes('getCachedStaticRenderableFill'), 'render layer should use cached static renderable fill helper');


assert(renderSource.includes('[BUILD-COLOR-PATH-VERIFY]'), 'render layer should emit build color path verify logs');
assert(renderSource.includes('[COLOR-BUILD-MISS-BREAKDOWN]'), 'render layer should emit color build miss breakdown logs');
assert(renderSource.includes('terrainBuildColorMode'), 'build color path verify should include terrain build color mode');
assert(renderSource.includes('terrainBuildLightingBypass'), 'build color path verify should include terrain build lighting bypass');
assert(renderSource.includes('actualColorPathUsed'), 'build color path verify should include actual path used');
assert(renderSource.includes('miss_step4_lightingMixMs'), 'color miss breakdown should include lighting mix timing');
assert(renderSource.includes('miss_step5_cssOrObjectBuildMs'), 'color miss breakdown should include css/object build timing');

assert(renderSource.includes('[STEP4-COLOR-BUILD-DETAIL]'), 'render layer should emit step4 color substep detail logs');
assert(renderSource.includes('[STEP4-COLOR-BUILD-HOTSPOT]'), 'render layer should emit step4 color hotspot logs');
assert(renderSource.includes('[STEP4-COLOR-BUILD-SCOPE-VERIFY]'), 'render layer should emit step4 color scope logs');
assert(renderSource.includes('step4d_shadowOverlayTotalMs'), 'step4 color detail should include shadow overlay total timing');
assert(renderSource.includes('step4f_shadowOverlayCollectMs'), 'step4 color detail should include shadow overlay collect timing');
assert(renderSource.includes('step4g_shadowOverlayCloneMs'), 'step4 color detail should include shadow overlay clone timing');
assert(renderSource.includes('touchedProjectedShadowCollector'), 'step4 color scope verify should expose projected shadow collector touch flag');
assert(renderSource.includes('buildVoxelFaceShadowWorldOverlays(worldPts, normal, cell.instanceId || null, colorBuildStats)'), 'step4 path should pass profiling stats into shadow overlay builder');


assert(renderSource.includes('[LIGHTING-SHADOW-BYPASS-VERIFY]'), 'render layer should emit lighting shadow bypass verify logs');
assert(renderSource.includes('[STEP4-SHADOW-PATH-SUMMARY]'), 'render layer should emit step4 shadow path summary logs');
assert(renderSource.includes('shadowOverlaySkippedByLightingOff'), 'lighting shadow bypass verify should expose skip flag');
assert(renderSource.includes('isStaticRenderableLightingActiveForBuild'), 'render layer should centralize lighting-active decision for build path');
assert(renderSource.includes("if (lightingActiveForStep4) shadowOverlaysWorld = buildVoxelFaceShadowWorldOverlays"), 'step4 path should short-circuit shadow overlays when lighting is inactive');
