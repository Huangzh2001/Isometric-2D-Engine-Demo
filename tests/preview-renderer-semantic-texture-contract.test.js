const assert = require('assert');
const fs = require('fs');

const renderSource = fs.readFileSync('src/presentation/render/render.js', 'utf8');
const coreSource = fs.readFileSync('src/core/domain/item-facing-core.js', 'utf8');
const registrySource = fs.readFileSync('src/core/state/prefab-registry.js', 'utf8');

assert(renderSource.includes('getSemanticTextureMapForRender'), 'renderer must read semantic texture map');
assert(renderSource.includes('face.texture'), 'renderer must consume face.texture');
assert(renderSource.includes('textureId'), 'renderer logs/draws textureId');
assert(renderSource.includes('renderedAsOverlay: false'), 'renderer must log it is not overlay');
assert(renderSource.includes('helperLayerUsed: false'), 'renderer must log helper layer is not used');
assert(!renderSource.includes('drawSemanticFiveFaceSolid'), 'renderer must not use semantic overlay helper');
assert(coreSource.includes('getSemanticTextureMap'), 'core must expose semantic texture map');
assert(coreSource.includes('textureId'), 'core face renderables must carry textureId');
assert(registrySource.includes('semanticTextureMap'), 'debug prefabs must carry semanticTextureMap');
assert(registrySource.includes('topTexture'), 'normalized prefabs should expose topTexture');
console.log('preview-renderer-semantic-texture-contract.test.js passed');
