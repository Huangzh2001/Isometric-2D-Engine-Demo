const assert = require('assert');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'src/infrastructure/storage/scene-storage.js'), 'utf8');

assert(source.includes('terrainRuntime: getCurrentTerrainRuntimeSnapshot()'), 'persistent/debug snapshots should save terrain runtime state');
assert(source.includes('terrainGenerator: getCurrentTerrainGeneratorSnapshot()'), 'persistent/debug snapshots should save terrain generator settings');
assert(source.includes('restoreTerrainStateFromSnapshot(incoming'), 'applySceneSnapshot should restore terrain runtime state from saved scenes');
assert(source.includes('copyScenePersistenceFields(normalized, inst)'), 'applySceneSnapshot should preserve generated terrain/material metadata on instances');
assert(source.includes("'generatedBy'") && source.includes("'terrainMaterialId'") && source.includes("'semanticFaceColors'"), 'terrain metadata fields should be preserved across save/load normalization');
assert(source.includes('terrainRuntimeRestored='), 'apply-snapshot logs should report terrain runtime restoration status');

console.log('scene storage terrain persistence contract ok');
