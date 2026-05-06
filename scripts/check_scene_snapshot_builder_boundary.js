#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const ownerPath = path.join(root, 'src/infrastructure/storage/scene-snapshot-builder.js');
const storagePath = path.join(root, 'src/infrastructure/storage/scene-storage.js');
const indexPath = path.join(root, 'index.html');
const owner = fs.readFileSync(ownerPath, 'utf8');
const storage = fs.readFileSync(storagePath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');
const errors = [];
function must(cond, msg) { if (!cond) errors.push(msg); }
must(owner.includes('__SCENE_SNAPSHOT_BUILDER__'), 'builder owner must export __SCENE_SNAPSHOT_BUILDER__');
must(owner.includes('sceneSnapshotViaSnapshotBuilder'), 'builder owner must own debug scene snapshot');
must(owner.includes('persistentSceneSnapshotViaSnapshotBuilder'), 'builder owner must own persistent scene snapshot');
must(owner.includes('createDefaultSceneDataViaSnapshotBuilder'), 'builder owner must own default scene data');
must(owner.includes('buildSceneSnapshotViaSnapshotBuilder'), 'builder owner must own buildSceneSnapshot implementation');
must(owner.includes('terrainRuntime: getCurrentTerrainRuntimeSnapshot()'), 'builder owner must persist terrain runtime');
must(owner.includes('terrainGenerator: getCurrentTerrainGeneratorSnapshot()'), 'builder owner must persist terrain generator');
must(storage.includes('getSceneSnapshotBuilderOwner'), 'scene-storage must look up builder owner');
must(storage.includes('owner.buildSceneSnapshot(options)'), 'scene-storage buildSceneSnapshot must delegate to builder owner');
must(storage.includes('owner.sceneSnapshot()'), 'scene-storage sceneSnapshot must delegate to builder owner');
must(!storage.includes('function sceneSnapshot() {\n  return {\n    settings: { ...settings }'), 'scene-storage must not retain debug snapshot body');
must(!storage.includes('function persistentSceneSnapshot() {\n  return {\n    settings: {'), 'scene-storage must not retain persistent snapshot body');
const ownerIdx = index.indexOf('src/infrastructure/storage/scene-snapshot-builder.js');
const storageIdx = index.indexOf('src/infrastructure/storage/scene-storage.js');
must(ownerIdx >= 0 && storageIdx >= 0 && ownerIdx < storageIdx, 'index.html must load scene-snapshot-builder.js before scene-storage.js');
must(Buffer.byteLength(owner, 'utf8') < 9000, 'builder owner should stay small and single-purpose');
if (errors.length) { console.error(JSON.stringify({status:'FAIL', errors}, null, 2)); process.exit(1); }
console.log(JSON.stringify({status:'PASS', checked:['scene snapshot builder boundary']}, null, 2));
