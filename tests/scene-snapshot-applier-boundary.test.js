#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/infrastructure/storage/scene-snapshot-applier.js'), 'utf8');
let replaced = null;
const sandbox = {
  console,
  globalThis: null,
  clearSelectedInstance: () => {},
  createDefaultSceneData: () => ({
    settings: { worldCols: 11, worldRows: 9, worldResolution: 1, worldDisplayScale: 1, gridW: 11, gridH: 9, tileScale: 1, playerHeightCells: 1.7, playerProxyW: 0.32, playerProxyD: 0.24, ambient: 0.22 },
    camera: { x: 0, y: 0 },
    player: { x: 1.1, y: 1.1, dir: 'down', r: 0.22 },
    editor: { mode: 'view', prototypeIndex: 0, rotation: 0, previewFacing: 0 },
    shadowUi: { lightingEnabled: true, highContrastShadow: false, shadowDebugColor: '#ff2a6d', shadowAlpha: 0.24, shadowOpacityScale: 1, shadowDistanceFadeEnabled: false, shadowDistanceFadeRate: 0.35, shadowDistanceFadeMin: 0.18, shadowEdgeFadeEnabled: false, shadowEdgeFadePx: 6 },
    instances: [{ instanceId: 'base', prefabId: 'cube_1x1', x: 0, y: 0, z: 0, rotation: 0 }],
    boxes: [],
    lights: [{ id: 1 }],
    activeLightId: 1
  }),
  summarizeSceneSnapshotMeta: () => ({ instances: 1, boxes: 0, lights: 1, habboRefs: 0 }),
  sceneIoLog: () => {},
  restoreTerrainStateFromSnapshot: () => ({ generator: true, runtime: true }),
  clamp: (n, min, max) => Math.max(min, Math.min(max, n)),
  WORLD_SIZE_MIN: 1,
  WORLD_SIZE_MAX: 64,
  setElValue: () => {},
  setElText: () => {},
  applySettings: () => {},
  settings: { gridW: 11, gridH: 9, worldCols: 11, worldRows: 9, worldResolution: 1, worldDisplayScale: 1, tileScale: 1, playerHeightCells: 1.7, playerProxyW: 0.32, playerProxyD: 0.24, ambient: 0.22 },
  ui: { gridW: {}, gridH: {}, worldResolution: {}, tileScale: {}, playerHeightCells: {}, playerProxyW: {}, playerProxyD: {}, ambientStrength: {}, ambientValue: {}, prefabSelect: {} },
  getSceneGraphStateApi: () => ({ replaceSceneGraph: (payload) => { replaced = payload.instances; } }),
  getSceneSessionStateApi: () => ({ syncDerivedState: () => {} }),
  legacyBoxesToInstances: () => [],
  findPrefabByIdExact: (id) => ({ id: id || 'cube_1x1' }),
  ensureMissingPrefabRegistered: (id) => ({ id: id || 'cube_1x1' }),
  copyScenePersistenceFields: (target, source) => Object.assign(target, source.generatedBy ? { generatedBy: source.generatedBy } : {}),
  filterInstancesToGrid: () => {},
  recomputeNextInstanceSerial: () => {},
  rebuildBoxesFromInstances: () => {},
  normalizeLight: (l) => Object.assign({}, l),
  __runtimeStateApi: { setCamera: () => {}, setEditorModeValue: () => {} },
  camera: { x: 0, y: 0 },
  lights: [],
  nextLightId: 1,
  activeLightId: 1,
  lightState: {},
  player: { x: 0, y: 0, r: 0.22 },
  prototypes: [{ id: 'cube_1x1' }],
  __prefabRegistryApi: { setSelectedPrototypeIndex: () => {}, refreshPrototypeSelection: () => {} },
  refreshPrefabSelectOptions: () => {},
  editor: {},
  mouse: {},
  updateModeButtons: () => {},
  updatePreview: () => {},
  invalidateShadowGeometryCache: () => {},
  syncLightUI: () => {},
  currentSceneInstances: () => replaced || [],
  currentSceneBoxes: () => [],
  pushLog: () => {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'scene-snapshot-applier.js' });
const owner = sandbox.__SCENE_SNAPSHOT_APPLIER__;
if (!owner || owner.owner !== 'src/infrastructure/storage/scene-snapshot-applier.js') throw new Error('missing applier owner export');
owner.applySceneSnapshot({
  settings: { worldCols: 12, worldRows: 10, worldResolution: 1 },
  instances: [{ instanceId: 'obj_1', prefabId: 'cube_1x1', x: 2, y: 3, z: 0, rotation: 0, generatedBy: 'terrain' }],
  lights: [{ id: 2 }],
  activeLightId: 2,
  camera: { x: 4, y: 5 },
  editor: { mode: 'view', prototypeIndex: 0 },
  terrainRuntime: { activeTerrainBatchId: 't1' }
}, { source: 'test', reason: 'unit', log: true });
if (!replaced || replaced.length !== 1 || replaced[0].generatedBy !== 'terrain') throw new Error('applier did not normalize/replace scene instances');
console.log('PASS scene-snapshot-applier-boundary');
