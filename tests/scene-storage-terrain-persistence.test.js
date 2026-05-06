const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const storage = fs.readFileSync(path.join(root, 'src/infrastructure/storage/scene-storage.js'), 'utf8');
const builder = fs.readFileSync(path.join(root, 'src/infrastructure/storage/scene-snapshot-builder.js'), 'utf8');
const applier = fs.readFileSync(path.join(root, 'src/infrastructure/storage/scene-snapshot-applier.js'), 'utf8');
const combined = storage + '\n' + builder + '\n' + applier;

assert(builder.includes('terrainRuntime: getCurrentTerrainRuntimeSnapshot()'), 'persistent/debug snapshots should save terrain runtime state in snapshot builder owner');
assert(builder.includes('terrainGenerator: getCurrentTerrainGeneratorSnapshot()'), 'persistent/debug snapshots should save terrain generator settings in snapshot builder owner');
assert(applier.includes('restoreTerrainStateFromSnapshot(incoming'), 'applySceneSnapshot should restore terrain runtime state from saved scenes in applier owner');
assert(applier.includes('copyScenePersistenceFields(normalized, inst)'), 'applySceneSnapshot should preserve generated terrain/material metadata on instances in applier owner');
assert(combined.includes("'generatedBy'") && combined.includes("'terrainMaterialId'") && combined.includes("'semanticFaceColors'"), 'terrain metadata fields should be preserved across save/load normalization');
assert(applier.includes('terrainRuntimeRestored='), 'apply-snapshot logs should report terrain runtime restoration status in applier owner');

console.log('scene storage terrain persistence contract ok');
