// P11e-2: Scene snapshot applier owner.
// Owns applying normalized scene snapshots into runtime/editor state.
(function installSceneSnapshotApplier(global) {
  var OWNER = 'src/infrastructure/storage/scene-snapshot-applier.js';
  global.__SCENE_SNAPSHOT_APPLIER__ = {
    owner: OWNER,
    applySceneSnapshot: applySceneSnapshotViaSnapshotApplier
  };
})(typeof window !== 'undefined' ? window : globalThis);

function applySceneSnapshotViaSnapshotApplier(snapshot, options = {}) {
  var sourceName = String((options && options.source) || 'unknown');
  var reasonName = String((options && options.reason) || 'applySceneSnapshot');
  var incomingMeta = summarizeSceneSnapshotMeta(snapshot);
  sceneIoLog('apply-snapshot:start', 'source=' + sourceName + ' reason=' + reasonName + ' instances=' + incomingMeta.instances + ' boxes=' + incomingMeta.boxes + ' lights=' + incomingMeta.lights + ' habboRefs=' + incomingMeta.habboRefs);
  clearSelectedInstance();
  const base = createDefaultSceneData();
  const incoming = snapshot && typeof snapshot === 'object' ? snapshot : {};
  var restoredTerrainState = restoreTerrainStateFromSnapshot(incoming, 'scene-storage:applySceneSnapshot');
  const nextSettings = { ...base.settings, ...(incoming.settings || {}) };
  nextSettings.worldResolution = clamp(parseInt(nextSettings.worldResolution || 1, 10) || 1, 1, 4);
  if (![1, 2, 4].includes(nextSettings.worldResolution)) nextSettings.worldResolution = 1;
  nextSettings.worldCols = clamp(parseInt(nextSettings.worldCols ?? nextSettings.gridW ?? base.settings.worldCols, 10) || base.settings.worldCols, WORLD_SIZE_MIN, WORLD_SIZE_MAX);
  nextSettings.worldRows = clamp(parseInt(nextSettings.worldRows ?? nextSettings.gridH ?? base.settings.worldRows, 10) || base.settings.worldRows, WORLD_SIZE_MIN, WORLD_SIZE_MAX);
  nextSettings.worldDisplayScale = clamp(parseFloat(nextSettings.worldDisplayScale ?? ((nextSettings.tileScale || base.settings.worldDisplayScale) * nextSettings.worldResolution)), 0.5, 2.4);
  setElValue(ui.gridW, String(nextSettings.worldCols));
  setElValue(ui.gridH, String(nextSettings.worldRows));
  setElValue(ui.worldResolution, String(nextSettings.worldResolution));
  setElValue(ui.tileScale, String(nextSettings.worldDisplayScale));
  setElValue(ui.playerHeightCells, String(nextSettings.playerHeightCells));
  setElValue(ui.playerProxyW, String(nextSettings.playerProxyW));
  setElValue(ui.playerProxyD, String(nextSettings.playerProxyD));
  applySettings();
  settings.ambient = clamp(Number(nextSettings.ambient ?? base.settings.ambient), 0, 1.4);
  setElValue(ui.ambientStrength, String(settings.ambient));
  setElText(ui.ambientValue, settings.ambient.toFixed(2));

  var __sceneGraphApi = getSceneGraphStateApi();
  var nextInstances = Array.isArray(incoming.instances) && incoming.instances.length ? incoming.instances : null;
  if (!nextInstances && Array.isArray(incoming.boxes) && incoming.boxes.length) nextInstances = legacyBoxesToInstances(incoming.boxes);
  if (!nextInstances || !nextInstances.length) nextInstances = base.instances;
  var normalizedInstances = nextInstances.map(function (inst, idx) {
    var normalized = {
      instanceId: typeof inst.instanceId === 'string' && inst.instanceId ? inst.instanceId : 'obj_' + String(idx + 1).padStart(4, '0'),
      prefabId: (findPrefabByIdExact(inst.prefabId || '') || ensureMissingPrefabRegistered(inst.prefabId || '')).id,
      x: Number(inst.x) || 0,
      y: Number(inst.y) || 0,
      z: Number(inst.z) || 0,
      rotation: ((parseInt(inst.rotation || 0, 10) % 4) + 4) % 4,
      name: inst.name || undefined,
    };
    copyScenePersistenceFields(normalized, inst);
    return normalized;
  });
  if (__sceneGraphApi && typeof __sceneGraphApi.replaceSceneGraph === 'function') {
    __sceneGraphApi.replaceSceneGraph({ instances: normalizedInstances }, { source: 'scene-storage:applySceneSnapshot' });
    var __sceneSessionApi = getSceneSessionStateApi();
    if (__sceneSessionApi && typeof __sceneSessionApi.syncDerivedState === 'function') {
      __sceneSessionApi.syncDerivedState({ source: 'scene-storage:applySceneSnapshot:post-owner-sync' });
    }
  } else {
    instances = normalizedInstances;
    if (typeof filterInstancesToGrid === 'function') filterInstancesToGrid();
    if (typeof recomputeNextInstanceSerial === 'function') recomputeNextInstanceSerial();
    if (typeof rebuildBoxesFromInstances === 'function') rebuildBoxesFromInstances();
  }
  filterInstancesToGrid();
  recomputeNextInstanceSerial();
  rebuildBoxesFromInstances();

  const nextLights = Array.isArray(incoming.lights) && incoming.lights.length ? incoming.lights : base.lights;
  lights = nextLights.map((l, idx) => normalizeLight({ ...l, id: Number.isFinite(Number(l.id)) ? Number(l.id) : idx + 1 }));
  nextLightId = lights.reduce((m, l) => Math.max(m, l.id || 0), 0) + 1;
  activeLightId = lights.some(l => l.id === incoming.activeLightId) ? incoming.activeLightId : (lights[0]?.id ?? 1);

  const nextCamera = { ...base.camera, ...(incoming.camera || {}) };
  if (typeof __runtimeStateApi !== 'undefined' && __runtimeStateApi && typeof __runtimeStateApi.setCamera === 'function') __runtimeStateApi.setCamera({ x: Number(nextCamera.x) || 0, y: Number(nextCamera.y) || 0 }, { source: 'scene-storage:applySceneSnapshot' });
  else {
    camera.x = Number(nextCamera.x) || 0;
    camera.y = Number(nextCamera.y) || 0;
  }

  const nextShadowUi = { ...base.shadowUi, ...(incoming.shadowUi || {}) };
  lightState.enabled = nextShadowUi.lightingEnabled !== false;
  lightState.highContrastShadow = !!nextShadowUi.highContrastShadow;
  lightState.shadowDebugColor = typeof nextShadowUi.shadowDebugColor === 'string' ? nextShadowUi.shadowDebugColor : base.shadowUi.shadowDebugColor;
  lightState.shadowAlpha = clamp(Number(nextShadowUi.shadowAlpha ?? base.shadowUi.shadowAlpha), 0.1, 1.6);
  lightState.shadowOpacityScale = clamp(Number(nextShadowUi.shadowOpacityScale ?? base.shadowUi.shadowOpacityScale), 0.3, 3);
  lightState.shadowDistanceFadeEnabled = !!nextShadowUi.shadowDistanceFadeEnabled;
  lightState.shadowDistanceFadeRate = clamp(Number(nextShadowUi.shadowDistanceFadeRate ?? base.shadowUi.shadowDistanceFadeRate), 0, 1.5);
  lightState.shadowDistanceFadeMin = clamp(Number(nextShadowUi.shadowDistanceFadeMin ?? base.shadowUi.shadowDistanceFadeMin), 0, 1);
  lightState.shadowEdgeFadeEnabled = !!nextShadowUi.shadowEdgeFadeEnabled;
  lightState.shadowEdgeFadePx = clamp(Number(nextShadowUi.shadowEdgeFadePx ?? base.shadowUi.shadowEdgeFadePx), 0, 20);

  const nextPlayer = { ...base.player, ...(incoming.player || {}) };
  player.x = clamp(Number(nextPlayer.x) || base.player.x, player.r + 0.05, settings.gridW - player.r - 0.05);
  player.y = clamp(Number(nextPlayer.y) || base.player.y, player.r + 0.05, settings.gridH - player.r - 0.05);
  player.dir = typeof nextPlayer.dir === 'string' ? nextPlayer.dir : base.player.dir;
  player.r = Math.max(0.05, Number(nextPlayer.r) || base.player.r);
  player.walk = 0;
  player.moving = false;

  const nextEditor = { ...base.editor, ...(incoming.editor || {}) };
  var nextPrototypeIndex = clamp(parseInt(nextEditor.prototypeIndex ?? base.editor.prototypeIndex, 10) || 0, 0, prototypes.length - 1);
  if (typeof __prefabRegistryApi !== 'undefined' && __prefabRegistryApi && typeof __prefabRegistryApi.setSelectedPrototypeIndex === 'function') __prefabRegistryApi.setSelectedPrototypeIndex(nextPrototypeIndex, { source: 'scene-storage:applySceneSnapshot' });
  else editor.prototypeIndex = nextPrototypeIndex;
  if (typeof __prefabRegistryApi !== 'undefined' && __prefabRegistryApi && typeof __prefabRegistryApi.refreshPrototypeSelection === 'function') __prefabRegistryApi.refreshPrototypeSelection({ source: 'scene-storage:apply-scene-snapshot' });
  else refreshPrefabSelectOptions('scene-storage:apply-scene-snapshot');
  if (ui.prefabSelect) ui.prefabSelect.value = String(editor.prototypeIndex);
  editor.rotation = ((parseInt(nextEditor.rotation ?? base.editor.rotation, 10) || 0) % 4 + 4) % 4;
  editor.previewFacing = ((parseInt(nextEditor.previewFacing ?? base.editor.previewFacing ?? 0, 10) || 0) % 4 + 4) % 4;
  editor.draggingInstance = null;
  editor.preview = null;
  editor.hoverDeleteBox = null;
  var nextMode = ['view', 'place', 'delete'].includes(nextEditor.mode) ? nextEditor.mode : base.editor.mode;
  if (typeof __runtimeStateApi !== 'undefined' && __runtimeStateApi && typeof __runtimeStateApi.setEditorModeValue === 'function') __runtimeStateApi.setEditorModeValue(nextMode, { source: 'scene-storage:applySceneSnapshot' });
  else editor.mode = nextMode;

  mouse.draggingView = false;
  lightState.dragAxis = null;
  lightState.hoverAxis = null;
  lightState.dragStartMouse = null;
  lightState.dragStartLight = null;

  updateModeButtons();
  if (editor.mode === 'place' || editor.mode === 'drag') updatePreview();
  invalidateShadowGeometryCache(options.reason || 'applySceneSnapshot');
  syncLightUI();
  if (options.log !== false) {
    var __currentInstances = currentSceneInstances();
    var __currentBoxes = currentSceneBoxes();
    pushLog(`scene-apply: source=${options.source || 'unknown'} instances=${__currentInstances.length} boxes=${__currentBoxes.length} lights=${lights.length} grid=${settings.gridW}x${settings.gridH}`);
  }
  var __applyInstances = currentSceneInstances();
  var __applyBoxes = currentSceneBoxes();
  sceneIoLog('apply-snapshot:done', 'source=' + sourceName + ' reason=' + reasonName + ' instances=' + __applyInstances.length + ' boxes=' + __applyBoxes.length + ' lights=' + lights.length + ' grid=' + settings.gridW + 'x' + settings.gridH + ' terrainRuntimeRestored=' + (!!(restoredTerrainState && restoredTerrainState.runtime)));
}
