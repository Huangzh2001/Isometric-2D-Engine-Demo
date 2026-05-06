#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const ownerPath = path.join(root, 'src/infrastructure/storage/scene-snapshot-applier.js');
const storagePath = path.join(root, 'src/infrastructure/storage/scene-storage.js');
const indexPath = path.join(root, 'index.html');
const owner = fs.readFileSync(ownerPath, 'utf8');
const storage = fs.readFileSync(storagePath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');
const errors = [];
function must(cond, msg) { if (!cond) errors.push(msg); }
must(owner.includes('__SCENE_SNAPSHOT_APPLIER__'), 'applier owner must export __SCENE_SNAPSHOT_APPLIER__');
must(owner.includes('applySceneSnapshotViaSnapshotApplier'), 'applier owner must own applySceneSnapshot body');
must(owner.includes('restoreTerrainStateFromSnapshot(incoming'), 'applier owner must restore terrain runtime/generator');
must(owner.includes('copyScenePersistenceFields(normalized, inst)'), 'applier owner must preserve terrain/material metadata');
must(owner.includes('terrainRuntimeRestored='), 'applier owner must report terrain runtime restoration');
must(storage.includes('getSceneSnapshotApplierOwner'), 'scene-storage must look up applier owner');
must(storage.includes('owner.applySceneSnapshot(snapshot, options)'), 'scene-storage applySceneSnapshot must delegate to applier owner');
must(!storage.includes('clearSelectedInstance();\n  const base = createDefaultSceneData();'), 'scene-storage must not retain applySceneSnapshot body');
const builderIdx = index.indexOf('src/infrastructure/storage/scene-snapshot-builder.js');
const ownerIdx = index.indexOf('src/infrastructure/storage/scene-snapshot-applier.js');
const storageIdx = index.indexOf('src/infrastructure/storage/scene-storage.js');
must(ownerIdx >= 0 && storageIdx >= 0 && ownerIdx < storageIdx, 'index.html must load scene-snapshot-applier.js before scene-storage.js');
must(builderIdx >= 0 && builderIdx < ownerIdx, 'index.html should load builder before applier');
must(Buffer.byteLength(owner, 'utf8') < 16000, 'applier owner should stay bounded and single-purpose');
if (errors.length) { console.error(JSON.stringify({status:'FAIL', errors}, null, 2)); process.exit(1); }
console.log(JSON.stringify({status:'PASS', checked:['scene snapshot applier boundary']}, null, 2));
