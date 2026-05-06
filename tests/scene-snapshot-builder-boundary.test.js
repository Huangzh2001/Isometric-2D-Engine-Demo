#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/infrastructure/storage/scene-snapshot-builder.js'), 'utf8');
const sandbox = {
  console,
  globalThis: null,
  settings: { worldCols: 11, worldRows: 9, worldResolution: 1, worldDisplayScale: 1, gridW: 11, gridH: 9, tileScale: 1, playerHeightCells: 1.7, playerProxyW: 0.32, playerProxyD: 0.24, ambient: 0.22 },
  camera: { x: 2, y: 3 },
  player: { x: 1, y: 2, dir: 'down', r: 0.22 },
  editor: { mode: 'view', prototypeIndex: 0, rotation: 1, previewFacing: 2, draggingInstance: null, preview: null },
  lightState: { highContrastShadow: false, shadowDebugColor: '#ff2a6d', enabled: true, shadowAlpha: 0.24, shadowOpacityScale: 1, shadowDistanceFadeEnabled: false, shadowDistanceFadeRate: 0.35, shadowDistanceFadeMin: 0.18, shadowEdgeFadeEnabled: false, shadowEdgeFadePx: 6 },
  lights: [{ id: 1, x: 1, y: 1 }],
  activeLightId: 1,
  currentSceneInstances: () => [{ instanceId: 'a', prefabId: 'cube_1x1', x: 1, y: 1, z: 0, rotation: 0 }],
  currentSceneBoxes: () => [{ id: 'b', x: 1, y: 1 }],
  getCurrentTerrainGeneratorSnapshot: () => ({ seed: 7 }),
  getCurrentTerrainRuntimeSnapshot: () => ({ activeTerrainBatchId: 't1' }),
  collectSceneHabboRefs: () => [{ prefabId: 'h1', relativePath: 'a.swf' }],
  defaultInstances: () => [{ instanceId: 'd', prefabId: 'cube_1x1', x: 0, y: 0, z: 0, rotation: 0 }],
  defaultBoxes: () => [{ id: 'box' }],
  makeLightingPreset: () => ({ lights: [{ id: 1 }] }),
  normalizeLight: (l) => Object.assign({}, l),
  summarizeSceneSnapshotMeta: (snapshot) => ({ instances: snapshot.instances.length, boxes: snapshot.boxes.length, lights: snapshot.lights.length, habboRefs: Array.isArray(snapshot.habboRefs) ? snapshot.habboRefs.length : 0 }),
  sceneIoLog: () => {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'scene-snapshot-builder.js' });
const owner = sandbox.__SCENE_SNAPSHOT_BUILDER__;
if (!owner || owner.owner !== 'src/infrastructure/storage/scene-snapshot-builder.js') throw new Error('missing builder owner export');
const debug = owner.sceneSnapshot();
if (!debug.terrainRuntime || !debug.terrainGenerator || debug.instances.length !== 1) throw new Error('debug snapshot missing terrain/session data');
const persistent = owner.persistentSceneSnapshot();
if (!persistent.habboRefs || persistent.habboRefs.length !== 1) throw new Error('persistent snapshot missing habbo refs');
sandbox.sceneSnapshot = () => owner.sceneSnapshot();
sandbox.persistentSceneSnapshot = () => owner.persistentSceneSnapshot();
const built = owner.buildSceneSnapshot({ kind: 'persistent', source: 'test' });
if (!built.terrainRuntime || !built.habboRefs) throw new Error('buildSceneSnapshot did not route through owner snapshots');
console.log('PASS scene-snapshot-builder-boundary');
