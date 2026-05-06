// P11e-1: Scene snapshot builder owner.
// Owns debug/persistent/default scene snapshot construction.
(function installSceneSnapshotBuilder(global) {
  var OWNER = 'src/infrastructure/storage/scene-snapshot-builder.js';
  global.__SCENE_SNAPSHOT_BUILDER__ = {
    owner: OWNER,
    sceneSnapshot: sceneSnapshotViaSnapshotBuilder,
    persistentSceneSnapshot: persistentSceneSnapshotViaSnapshotBuilder,
    createDefaultSceneData: createDefaultSceneDataViaSnapshotBuilder,
    buildSceneSnapshot: buildSceneSnapshotViaSnapshotBuilder
  };
})(typeof window !== 'undefined' ? window : globalThis);

function sceneSnapshotViaSnapshotBuilder() {
  return {
    settings: { ...settings },
    camera: { ...camera },
    player: { x: player.x, y: player.y, dir: player.dir, r: player.r },
    editor: {
      mode: editor.mode,
      prototypeIndex: editor.prototypeIndex,
      rotation: editor.rotation,
      previewFacing: editor.previewFacing || 0,
      draggingInstance: editor.draggingInstance ? { ...editor.draggingInstance } : null,
      preview: editor.preview ? {
        valid: editor.preview.valid,
        reason: editor.preview.reason ?? '',
        supportZ: editor.preview.supportZ ?? null,
        supportHeights: editor.preview.supportHeights ?? [],
        overlapIds: editor.preview.overlapIds ?? [],
        box: editor.preview.box ? { ...editor.preview.box } : null,
      } : null,
    },
    instances: currentSceneInstances().map(inst => ({ ...inst })),
    boxes: currentSceneBoxes().map(b => ({ ...b })),
    lights: lights.map(l => ({ ...l })),
    activeLightId,
    terrainGenerator: getCurrentTerrainGeneratorSnapshot(),
    terrainRuntime: getCurrentTerrainRuntimeSnapshot(),
  };
}

function persistentSceneSnapshotViaSnapshotBuilder() {
  return {
    settings: {
      worldCols: settings.worldCols,
      worldRows: settings.worldRows,
      worldResolution: settings.worldResolution,
      worldDisplayScale: settings.worldDisplayScale,
      gridW: settings.gridW,
      gridH: settings.gridH,
      tileScale: settings.tileScale,
      playerHeightCells: settings.playerHeightCells,
      playerProxyW: settings.playerProxyW,
      playerProxyD: settings.playerProxyD,
      ambient: settings.ambient,
    },
    camera: { x: camera.x, y: camera.y },
    player: { x: player.x, y: player.y, dir: player.dir, r: player.r },
    editor: {
      mode: editor.mode,
      prototypeIndex: editor.prototypeIndex,
      rotation: editor.rotation,
      previewFacing: editor.previewFacing || 0,
    },
    shadowUi: {
      highContrastShadow: !!lightState.highContrastShadow,
      shadowDebugColor: lightState.shadowDebugColor || '#ff2a6d',
      lightingEnabled: !!(lightState.enabled !== false),
      shadowAlpha: Number.isFinite(Number(lightState.shadowAlpha)) ? Number(lightState.shadowAlpha) : 0.24,
      shadowOpacityScale: Number.isFinite(Number(lightState.shadowOpacityScale)) ? Number(lightState.shadowOpacityScale) : 1,
      shadowDistanceFadeEnabled: !!lightState.shadowDistanceFadeEnabled,
      shadowDistanceFadeRate: Number.isFinite(Number(lightState.shadowDistanceFadeRate)) ? Number(lightState.shadowDistanceFadeRate) : 0.35,
      shadowDistanceFadeMin: Number.isFinite(Number(lightState.shadowDistanceFadeMin)) ? Number(lightState.shadowDistanceFadeMin) : 0.18,
      shadowEdgeFadeEnabled: !!lightState.shadowEdgeFadeEnabled,
      shadowEdgeFadePx: Number.isFinite(Number(lightState.shadowEdgeFadePx)) ? Number(lightState.shadowEdgeFadePx) : 6,
    },
    instances: currentSceneInstances().map(inst => ({ ...inst })),
    habboRefs: collectSceneHabboRefs(currentSceneInstances()),
    boxes: currentSceneBoxes().map(b => ({ ...b })),
    lights: lights.map(l => ({ ...l })),
    activeLightId,
    terrainGenerator: getCurrentTerrainGeneratorSnapshot(),
    terrainRuntime: getCurrentTerrainRuntimeSnapshot(),
  };
}

function createDefaultSceneDataViaSnapshotBuilder() {
  return {
    settings: {
      worldCols: 11,
      worldRows: 9,
      worldResolution: 1,
      worldDisplayScale: 1,
      gridW: 11,
      gridH: 9,
      tileScale: 1,
      playerHeightCells: 1.7,
      playerProxyW: 0.32,
      playerProxyD: 0.24,
      ambient: 0.22,
    },
    camera: { x: 0, y: 0 },
    player: { x: 1.1, y: 1.1, dir: 'down', r: 0.22 },
    editor: {
      mode: 'view',
      prototypeIndex: 0,
      rotation: 0,
    },
    shadowUi: {
      highContrastShadow: false,
      shadowDebugColor: '#ff2a6d',
      lightingEnabled: true,
      shadowAlpha: 0.24,
      shadowOpacityScale: 1,
      shadowDistanceFadeEnabled: false,
      shadowDistanceFadeRate: 0.35,
      shadowDistanceFadeMin: 0.18,
      shadowEdgeFadeEnabled: false,
      shadowEdgeFadePx: 6,
    },
    instances: defaultInstances().map(inst => ({ ...inst })),
    boxes: defaultBoxes().map(b => ({ ...b })),
    lights: makeLightingPreset('allOn').lights.map(l => normalizeLight({ ...l })),
    activeLightId: 1,
  };
}

function buildSceneSnapshotViaSnapshotBuilder(options) {
  options = options || {};
  var kind = options.kind === 'debug' ? 'debug' : 'persistent';
  var snapshot = kind === 'debug' ? sceneSnapshot() : persistentSceneSnapshot();
  if (options.log !== false) {
    var meta = summarizeSceneSnapshotMeta(snapshot);
    sceneIoLog('build-snapshot:done', 'kind=' + kind + ' source=' + String(options.source || 'unknown') + ' instances=' + meta.instances + ' boxes=' + meta.boxes + ' lights=' + meta.lights + ' habboRefs=' + meta.habboRefs);
  }
  return snapshot;
}
