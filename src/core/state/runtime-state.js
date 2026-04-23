// Step-06: runtime state extracted from state.js
var debugState = {
  bootSeq: 0,
  phase: 'boot',
  frame: 0,
  updateStep: 'n/a',
  renderStep: 'n/a',
  lastRenderable: 'n/a',
  lastEvent: 'n/a',
  firstFrameAt: null,
};
var shadowProbeState = {
  markMode: false,
  activeMarker: null,
  captureSeq: 0,
  hoverFaceId: '',
};
var BASE_TILE_W = 80;
var BASE_TILE_H = 40;
var EPS = 1e-5;
var keys = new Set();
var mouse = { x: 0, y: 0, inside: false, draggingView: false, panStartX: 0, panStartY: 0, cameraStartX: 0, cameraStartY: 0 };
var camera = { x: 0, y: 0 };
var time = 0;
var assetsReady = false;
var showDebug = false;
var showFrontLines = false;
var showFaceDebugOverlay = false;
var xrayFaces = false;
var LAB_MODE = false;
var SHOW_PLAYER = true;
var lastRenderLogSecond = -1;
var lastPreviewSignature = '';
var settings = {
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
  tileW: BASE_TILE_W,
  tileH: BASE_TILE_H,
  originX: 1180 * 0.57,
  originY: 150,
  ambient: 0.22,
};
var player = {
  x: 1.1,
  y: 1.1,
  r: 0.22,
  speed: 2.6,
  walk: 0,
  moving: false,
  dir: 'down',
};
var editor = {
  mode: 'view',
  prototypeIndex: 0,
  rotation: 0,
  fromViewRotation: 0,
  toViewRotation: 0,
  rotationAnimProgress: 1,
  isViewRotating: false,
  rotationAnimStartTime: 0,
  rotationAnimDurationMs: 160,
  rotationAnimNonce: 0,
  rotationAnimationEnabled: true,
  rotationInterpolationEnabled: true,
  rotationInterpolationMode: 'easeInOut',
  visualRotation: 0,
  zoom: 1,
  minZoom: 0.5,
  maxZoom: 2,
  cameraCullingEnabled: true,
  cullingMargin: 2,
  showCameraBounds: false,
  showCullingBounds: false,
  surfaceOnlyRenderingEnabled: true,
  debugVisibleSurfaces: false,
  staticWorldFaceMergeEnabled: true,
  disableFaceMergeAtOrAboveZoomEnabled: false,
  disableFaceMergeAtOrAboveZoomThreshold: 1.6,
  // previewFacing is the placement-preview item facing. It is intentionally
  // separate from view rotation and placed-instance rotation.
  previewFacing: 0,
  draggingInstance: null,
  preview: null,
  hoverDeleteBox: null,
};
var inspectorState = {
  activeTab: 'world',
  selectedInstanceId: null,
};

var terrainGenerator = {
  seed: 1337,
  width: 11,
  height: 9,
  detailScale: 8,
  detailOctaves: 4,
  detailPersistence: 0.5,
  detailLacunarity: 2,
  detailStrength: 4,
  macroScale: 28,
  macroOctaves: 3,
  macroPersistence: 0.55,
  macroLacunarity: 2,
  minHeight: 0,
  maxHeight: 18,
  waterLevel: 0,
  baseHeightOffset: 0,
  heightProfileConfig: [
    { start: 0.00, end: 0.28, baseHeight: 0 },
    { start: 0.28, end: 0.56, baseHeight: 3 },
    { start: 0.56, end: 0.80, baseHeight: 7 },
    { start: 0.80, end: 1.01, baseHeight: 12 }
  ],
  activeTerrainBatchId: null,
  lastSummary: null,
  nextBatchSeq: 1,
  terrainDebugFaceColorsEnabled: false,
  terrainColorMode: 'natural',
  terrainBuildColorMode: 'natural',
  terrainBuildLightingBypass: false,
  terrainDetailedProfilingEnabled: false,
};

var terrainLogic = {
  activeTerrainBatchId: null,
  width: 0,
  height: 0,
  heightMap: null,
  existingHeightMap: null,
  materialMap: null,
  editDiff: {},
  params: null,
  lastSummary: null,
  terrainUsesColumnModel: false,
  terrainExpandedVoxelInstanceCount: 0,
  terrainOwnedDeltaBlockCount: 0,
  existingManualBlockCount: 0,
  overlappingColumnCount: 0,
  mergedWithExistingOccupancy: false,
  stackedOnExistingBlocks: false,
  chunkSize: 16,
  dirtyChunkKeys: [],
  terrainChunkCacheVersion: 0,
};

function cloneTerrainProfileConfig(profile) {
  return (Array.isArray(profile) ? profile : []).map(function (segment) {
    var src = segment && typeof segment === 'object' ? segment : {};
    return {
      start: Number(src.start) || 0,
      end: Number(src.end) || 0,
      baseHeight: Math.round(Number(src.baseHeight) || 0)
    };
  });
}

function getTerrainGeneratorSettingsValue() {
  return {
    seed: terrainGenerator.seed,
    width: terrainGenerator.width,
    height: terrainGenerator.height,
    detailScale: terrainGenerator.detailScale,
    detailOctaves: terrainGenerator.detailOctaves,
    detailPersistence: terrainGenerator.detailPersistence,
    detailLacunarity: terrainGenerator.detailLacunarity,
    detailStrength: terrainGenerator.detailStrength,
    macroScale: terrainGenerator.macroScale,
    macroOctaves: terrainGenerator.macroOctaves,
    macroPersistence: terrainGenerator.macroPersistence,
    macroLacunarity: terrainGenerator.macroLacunarity,
    minHeight: terrainGenerator.minHeight,
    maxHeight: terrainGenerator.maxHeight,
    waterLevel: terrainGenerator.waterLevel,
    baseHeightOffset: terrainGenerator.baseHeightOffset,
    heightProfileConfig: cloneTerrainProfileConfig(terrainGenerator.heightProfileConfig),
    activeTerrainBatchId: terrainGenerator.activeTerrainBatchId,
    lastSummary: terrainGenerator.lastSummary ? JSON.parse(JSON.stringify(terrainGenerator.lastSummary)) : null,
    terrainDebugFaceColorsEnabled: terrainGenerator.terrainDebugFaceColorsEnabled === true,
    terrainColorMode: String(terrainGenerator.terrainColorMode || (terrainGenerator.terrainDebugFaceColorsEnabled ? 'debug-semantic' : 'natural')),
    terrainBuildColorMode: String(terrainGenerator.terrainBuildColorMode || 'natural'),
    terrainBuildLightingBypass: terrainGenerator.terrainBuildLightingBypass === true,
    terrainDetailedProfilingEnabled: terrainGenerator.terrainDetailedProfilingEnabled === true
  };
}

function patchTerrainGeneratorSettings(patch, meta) {
  patch = patch && typeof patch === 'object' ? patch : {};
  var before = getTerrainGeneratorSettingsValue();
  function setNum(key, roundToInt) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) return;
    var num = Number(patch[key]);
    if (!Number.isFinite(num)) return;
    terrainGenerator[key] = roundToInt ? Math.round(num) : num;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'seed')) terrainGenerator.seed = patch.seed;
  setNum('width', true);
  setNum('height', true);
  setNum('detailScale', false);
  setNum('detailOctaves', true);
  setNum('detailPersistence', false);
  setNum('detailLacunarity', false);
  setNum('detailStrength', false);
  setNum('macroScale', false);
  setNum('macroOctaves', true);
  setNum('macroPersistence', false);
  setNum('macroLacunarity', false);
  setNum('minHeight', true);
  setNum('maxHeight', true);
  setNum('waterLevel', true);
  setNum('baseHeightOffset', true);
  if (Object.prototype.hasOwnProperty.call(patch, 'heightProfileConfig')) terrainGenerator.heightProfileConfig = cloneTerrainProfileConfig(patch.heightProfileConfig);
  if (Object.prototype.hasOwnProperty.call(patch, 'activeTerrainBatchId')) terrainGenerator.activeTerrainBatchId = patch.activeTerrainBatchId == null ? null : String(patch.activeTerrainBatchId);
  if (Object.prototype.hasOwnProperty.call(patch, 'lastSummary')) {
    try { terrainGenerator.lastSummary = patch.lastSummary == null ? null : JSON.parse(JSON.stringify(patch.lastSummary)); } catch (_) { terrainGenerator.lastSummary = patch.lastSummary || null; }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'terrainDebugFaceColorsEnabled')) terrainGenerator.terrainDebugFaceColorsEnabled = patch.terrainDebugFaceColorsEnabled === true;
  if (Object.prototype.hasOwnProperty.call(patch, 'terrainColorMode')) terrainGenerator.terrainColorMode = String(patch.terrainColorMode || (terrainGenerator.terrainDebugFaceColorsEnabled ? 'debug-semantic' : 'natural'));
  if (Object.prototype.hasOwnProperty.call(patch, 'terrainBuildColorMode')) terrainGenerator.terrainBuildColorMode = String(patch.terrainBuildColorMode || 'natural');
  if (Object.prototype.hasOwnProperty.call(patch, 'terrainBuildLightingBypass')) terrainGenerator.terrainBuildLightingBypass = patch.terrainBuildLightingBypass === true;
  if (Object.prototype.hasOwnProperty.call(patch, 'terrainDetailedProfilingEnabled')) terrainGenerator.terrainDetailedProfilingEnabled = patch.terrainDetailedProfilingEnabled === true;
  if (Object.prototype.hasOwnProperty.call(patch, 'nextBatchSeq')) terrainGenerator.nextBatchSeq = Math.max(1, Math.round(Number(patch.nextBatchSeq) || 1));
  runtimeWrite('patchTerrainGeneratorSettings', {
    source: meta && meta.source ? String(meta.source) : 'unknown',
    before: before,
    after: getTerrainGeneratorSettingsValue()
  });
  return getTerrainGeneratorSettingsValue();
}

function allocateTerrainBatchId(meta) {
  var value = 'terrain-' + String(terrainGenerator.nextBatchSeq++).padStart(4, '0');
  runtimeWrite('allocateTerrainBatchId', {
    source: meta && meta.source ? String(meta.source) : 'unknown',
    value: value,
    nextBatchSeq: terrainGenerator.nextBatchSeq
  });
  return value;
}

function cloneTerrainHeightMap(heightMap) {
  return Array.isArray(heightMap) ? heightMap.map(function (column) {
    return Array.isArray(column) ? column.slice() : [];
  }) : [];
}

function getTerrainRuntimeModelValue() {
  return {
    activeTerrainBatchId: terrainLogic.activeTerrainBatchId == null ? null : String(terrainLogic.activeTerrainBatchId),
    width: Math.max(0, Math.round(Number(terrainLogic.width) || 0)),
    height: Math.max(0, Math.round(Number(terrainLogic.height) || 0)),
    heightMap: cloneTerrainHeightMap(terrainLogic.heightMap),
    existingHeightMap: cloneTerrainHeightMap(terrainLogic.existingHeightMap),
    materialMap: terrainLogic.materialMap ? JSON.parse(JSON.stringify(terrainLogic.materialMap)) : null,
    editDiff: terrainLogic.editDiff ? JSON.parse(JSON.stringify(terrainLogic.editDiff)) : {},
    params: terrainLogic.params ? JSON.parse(JSON.stringify(terrainLogic.params)) : null,
    lastSummary: terrainLogic.lastSummary ? JSON.parse(JSON.stringify(terrainLogic.lastSummary)) : null,
    terrainUsesColumnModel: terrainLogic.terrainUsesColumnModel === true,
    terrainExpandedVoxelInstanceCount: Math.max(0, Math.round(Number(terrainLogic.terrainExpandedVoxelInstanceCount) || 0)),
    terrainOwnedDeltaBlockCount: Math.max(0, Math.round(Number(terrainLogic.terrainOwnedDeltaBlockCount) || 0)),
    existingManualBlockCount: Math.max(0, Math.round(Number(terrainLogic.existingManualBlockCount) || 0)),
    overlappingColumnCount: Math.max(0, Math.round(Number(terrainLogic.overlappingColumnCount) || 0)),
    mergedWithExistingOccupancy: terrainLogic.mergedWithExistingOccupancy === true,
    stackedOnExistingBlocks: terrainLogic.stackedOnExistingBlocks === true,
    chunkSize: Math.max(1, Math.round(Number(terrainLogic.chunkSize) || 16)),
    dirtyChunkKeys: Array.isArray(terrainLogic.dirtyChunkKeys) ? terrainLogic.dirtyChunkKeys.slice() : [],
    terrainChunkCacheVersion: Math.max(0, Math.round(Number(terrainLogic.terrainChunkCacheVersion) || 0))
  };
}

function patchTerrainRuntimeModel(patch, meta) {
  patch = patch && typeof patch === 'object' ? patch : {};
  var before = getTerrainRuntimeModelValue();
  if (Object.prototype.hasOwnProperty.call(patch, 'activeTerrainBatchId')) terrainLogic.activeTerrainBatchId = patch.activeTerrainBatchId == null ? null : String(patch.activeTerrainBatchId);
  if (Object.prototype.hasOwnProperty.call(patch, 'width')) terrainLogic.width = Math.max(0, Math.round(Number(patch.width) || 0));
  if (Object.prototype.hasOwnProperty.call(patch, 'height')) terrainLogic.height = Math.max(0, Math.round(Number(patch.height) || 0));
  if (Object.prototype.hasOwnProperty.call(patch, 'heightMap')) terrainLogic.heightMap = cloneTerrainHeightMap(patch.heightMap);
  if (Object.prototype.hasOwnProperty.call(patch, 'existingHeightMap')) terrainLogic.existingHeightMap = cloneTerrainHeightMap(patch.existingHeightMap);
  if (Object.prototype.hasOwnProperty.call(patch, 'materialMap')) {
    try { terrainLogic.materialMap = patch.materialMap == null ? null : JSON.parse(JSON.stringify(patch.materialMap)); } catch (_) { terrainLogic.materialMap = patch.materialMap || null; }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'editDiff')) {
    try { terrainLogic.editDiff = patch.editDiff == null ? {} : JSON.parse(JSON.stringify(patch.editDiff)); } catch (_) { terrainLogic.editDiff = patch.editDiff || {}; }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'params')) {
    try { terrainLogic.params = patch.params == null ? null : JSON.parse(JSON.stringify(patch.params)); } catch (_) { terrainLogic.params = patch.params || null; }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'lastSummary')) {
    try { terrainLogic.lastSummary = patch.lastSummary == null ? null : JSON.parse(JSON.stringify(patch.lastSummary)); } catch (_) { terrainLogic.lastSummary = patch.lastSummary || null; }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'terrainUsesColumnModel')) terrainLogic.terrainUsesColumnModel = patch.terrainUsesColumnModel === true;
  if (Object.prototype.hasOwnProperty.call(patch, 'terrainExpandedVoxelInstanceCount')) terrainLogic.terrainExpandedVoxelInstanceCount = Math.max(0, Math.round(Number(patch.terrainExpandedVoxelInstanceCount) || 0));
  if (Object.prototype.hasOwnProperty.call(patch, 'terrainOwnedDeltaBlockCount')) terrainLogic.terrainOwnedDeltaBlockCount = Math.max(0, Math.round(Number(patch.terrainOwnedDeltaBlockCount) || 0));
  if (Object.prototype.hasOwnProperty.call(patch, 'existingManualBlockCount')) terrainLogic.existingManualBlockCount = Math.max(0, Math.round(Number(patch.existingManualBlockCount) || 0));
  if (Object.prototype.hasOwnProperty.call(patch, 'overlappingColumnCount')) terrainLogic.overlappingColumnCount = Math.max(0, Math.round(Number(patch.overlappingColumnCount) || 0));
  if (Object.prototype.hasOwnProperty.call(patch, 'mergedWithExistingOccupancy')) terrainLogic.mergedWithExistingOccupancy = patch.mergedWithExistingOccupancy === true;
  if (Object.prototype.hasOwnProperty.call(patch, 'stackedOnExistingBlocks')) terrainLogic.stackedOnExistingBlocks = patch.stackedOnExistingBlocks === true;
  if (Object.prototype.hasOwnProperty.call(patch, 'chunkSize')) terrainLogic.chunkSize = Math.max(1, Math.round(Number(patch.chunkSize) || 16));
  if (Object.prototype.hasOwnProperty.call(patch, 'dirtyChunkKeys')) terrainLogic.dirtyChunkKeys = Array.isArray(patch.dirtyChunkKeys) ? patch.dirtyChunkKeys.map(function (v) { return String(v); }) : [];
  if (Object.prototype.hasOwnProperty.call(patch, 'terrainChunkCacheVersion')) terrainLogic.terrainChunkCacheVersion = Math.max(0, Math.round(Number(patch.terrainChunkCacheVersion) || 0));
  runtimeWrite('patchTerrainRuntimeModel', {
    source: meta && meta.source ? String(meta.source) : 'unknown',
    before: before,
    after: getTerrainRuntimeModelValue()
  });
  return getTerrainRuntimeModelValue();
}

function clearTerrainRuntimeModel(meta) {
  return patchTerrainRuntimeModel({
    activeTerrainBatchId: null,
    width: 0,
    height: 0,
    heightMap: [],
    existingHeightMap: [],
    materialMap: null,
    editDiff: {},
    params: null,
    lastSummary: null,
    terrainUsesColumnModel: false,
    terrainExpandedVoxelInstanceCount: 0,
    terrainOwnedDeltaBlockCount: 0,
    existingManualBlockCount: 0,
    overlappingColumnCount: 0,
    mergedWithExistingOccupancy: false,
    stackedOnExistingBlocks: false
  }, meta);
}

function getP3StateOwnerMapApi() {
  return (typeof window !== 'undefined' && window.__STATE_OWNER_MAP__) ? window.__STATE_OWNER_MAP__ : null;
}

function runtimeWrite(action, extra) {
  var mapApi = getP3StateOwnerMapApi();
  if (mapApi && typeof mapApi.recordWrite === 'function') {
    mapApi.recordWrite('src/core/state/runtime-state.js', action, extra || null);
  }
}

function setEditorModeValue(mode, meta) {
  var nextMode = String(mode || 'view');
  var prevMode = editor && editor.mode ? String(editor.mode) : 'unknown';
  editor.mode = nextMode;
  runtimeWrite('setEditorModeValue', {
    source: meta && meta.source ? String(meta.source) : 'unknown',
    from: prevMode,
    to: nextMode
  });
  return nextMode;
}


function normalizeFacingStateValue(rotation) {
  return ((Number(rotation) || 0) % 4 + 4) % 4;
}

function setEditorRotationValue(rotation, meta) {
  var nextRotation = normalizeFacingStateValue(rotation);
  var prevRotation = editor && typeof editor.rotation === 'number' ? editor.rotation : 0;
  editor.rotation = nextRotation;
  if (!editor.isViewRotating) {
    editor.visualRotation = nextRotation;
    editor.fromViewRotation = nextRotation;
    editor.toViewRotation = nextRotation;
    editor.rotationAnimProgress = 1;
  }
  runtimeWrite('setEditorRotationValue', {
    source: meta && meta.source ? String(meta.source) : 'unknown',
    from: prevRotation,
    to: nextRotation,
    note: 'main-editor-view-rotation'
  });
  return nextRotation;
}

function setPreviewFacingValue(rotation, meta) {
  var nextFacing = normalizeFacingStateValue(rotation);
  var prevFacing = editor && typeof editor.previewFacing === 'number' ? editor.previewFacing : 0;
  editor.previewFacing = nextFacing;
  runtimeWrite('setPreviewFacingValue', {
    source: meta && meta.source ? String(meta.source) : 'unknown',
    from: prevFacing,
    to: nextFacing,
    viewRotation: editor && typeof editor.rotation === 'number' ? editor.rotation : 0
  });
  return nextFacing;
}


function normalizeRotationTurnsValue(rotation) {
  var num = Number(rotation);
  if (!Number.isFinite(num)) return 0;
  num = num % 4;
  if (num < 0) num += 4;
  return num;
}

function normalizeAnimationMsValue(ms) {
  var num = Math.round(Number(ms) || 0);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

function patchEditorViewRotationAnimation(patch, meta) {
  patch = patch && typeof patch === 'object' ? patch : {};
  var before = {
    fromViewRotation: Number(editor && editor.fromViewRotation) || 0,
    toViewRotation: Number(editor && editor.toViewRotation) || 0,
    rotationAnimProgress: Number(editor && editor.rotationAnimProgress),
    isViewRotating: !!(editor && editor.isViewRotating),
    rotationAnimStartTime: Number(editor && editor.rotationAnimStartTime) || 0,
    rotationAnimDurationMs: Number(editor && editor.rotationAnimDurationMs) || 0,
    rotationAnimNonce: Number(editor && editor.rotationAnimNonce) || 0,
    rotationAnimationEnabled: editor && editor.rotationAnimationEnabled !== false,
    visualRotation: Number(editor && editor.visualRotation)
  };
  if (Object.prototype.hasOwnProperty.call(patch, 'fromViewRotation')) editor.fromViewRotation = normalizeFacingStateValue(patch.fromViewRotation);
  if (Object.prototype.hasOwnProperty.call(patch, 'toViewRotation')) editor.toViewRotation = normalizeFacingStateValue(patch.toViewRotation);
  if (Object.prototype.hasOwnProperty.call(patch, 'rotationAnimProgress')) editor.rotationAnimProgress = Math.max(0, Math.min(1, Number(patch.rotationAnimProgress) || 0));
  if (Object.prototype.hasOwnProperty.call(patch, 'isViewRotating')) editor.isViewRotating = !!patch.isViewRotating;
  if (Object.prototype.hasOwnProperty.call(patch, 'rotationAnimStartTime')) editor.rotationAnimStartTime = Math.max(0, Number(patch.rotationAnimStartTime) || 0);
  if (Object.prototype.hasOwnProperty.call(patch, 'rotationAnimDurationMs')) editor.rotationAnimDurationMs = normalizeAnimationMsValue(patch.rotationAnimDurationMs);
  if (Object.prototype.hasOwnProperty.call(patch, 'rotationAnimNonce')) editor.rotationAnimNonce = Math.max(0, Math.round(Number(patch.rotationAnimNonce) || 0));
  if (Object.prototype.hasOwnProperty.call(patch, 'rotationAnimationEnabled')) editor.rotationAnimationEnabled = patch.rotationAnimationEnabled !== false;
  if (Object.prototype.hasOwnProperty.call(patch, 'rotationInterpolationEnabled')) editor.rotationInterpolationEnabled = patch.rotationInterpolationEnabled !== false;
  if (Object.prototype.hasOwnProperty.call(patch, 'rotationInterpolationMode')) editor.rotationInterpolationMode = String(patch.rotationInterpolationMode || 'easeInOut');
  if (Object.prototype.hasOwnProperty.call(patch, 'visualRotation')) editor.visualRotation = normalizeRotationTurnsValue(patch.visualRotation);
  runtimeWrite('patchEditorViewRotationAnimation', {
    source: meta && meta.source ? String(meta.source) : 'unknown',
    before: before,
    after: {
      fromViewRotation: Number(editor && editor.fromViewRotation) || 0,
      toViewRotation: Number(editor && editor.toViewRotation) || 0,
      rotationAnimProgress: Number(editor && editor.rotationAnimProgress),
      isViewRotating: !!(editor && editor.isViewRotating),
      rotationAnimStartTime: Number(editor && editor.rotationAnimStartTime) || 0,
      rotationAnimDurationMs: Number(editor && editor.rotationAnimDurationMs) || 0,
      rotationAnimNonce: Number(editor && editor.rotationAnimNonce) || 0,
      rotationAnimationEnabled: editor && editor.rotationAnimationEnabled !== false,
      rotationInterpolationEnabled: editor && editor.rotationInterpolationEnabled !== false,
      rotationInterpolationMode: editor && editor.rotationInterpolationMode ? String(editor.rotationInterpolationMode) : 'easeInOut',
      visualRotation: Number(editor && editor.visualRotation) || 0
    }
  });
  return editor;
}

function setSelectedInstanceIdValue(instanceId, meta) {
  var nextId = instanceId == null ? null : String(instanceId || '');
  var prevId = inspectorState && inspectorState.selectedInstanceId != null ? String(inspectorState.selectedInstanceId) : null;
  inspectorState.selectedInstanceId = nextId;
  runtimeWrite('setSelectedInstanceIdValue', {
    source: meta && meta.source ? String(meta.source) : 'unknown',
    from: prevId,
    to: nextId
  });
  return nextId;
}

function patchInspectorState(patch, meta) {
  patch = patch && typeof patch === 'object' ? patch : {};
  var before = { activeTab: inspectorState.activeTab, selectedInstanceId: inspectorState.selectedInstanceId };
  if (Object.prototype.hasOwnProperty.call(patch, 'activeTab')) inspectorState.activeTab = patch.activeTab;
  if (Object.prototype.hasOwnProperty.call(patch, 'selectedInstanceId')) inspectorState.selectedInstanceId = patch.selectedInstanceId == null ? null : String(patch.selectedInstanceId || '');
  runtimeWrite('patchInspectorState', {
    source: meta && meta.source ? String(meta.source) : 'unknown',
    before: before,
    after: { activeTab: inspectorState.activeTab, selectedInstanceId: inspectorState.selectedInstanceId }
  });
  return inspectorState;
}

function setCamera(nextCamera, meta) {
  nextCamera = nextCamera && typeof nextCamera === 'object' ? nextCamera : {};
  var before = { x: Number(camera.x) || 0, y: Number(camera.y) || 0 };
  if (Object.prototype.hasOwnProperty.call(nextCamera, 'x')) camera.x = Number(nextCamera.x) || 0;
  if (Object.prototype.hasOwnProperty.call(nextCamera, 'y')) camera.y = Number(nextCamera.y) || 0;
  runtimeWrite('setCamera', {
    source: meta && meta.source ? String(meta.source) : 'unknown',
    before: before,
    after: { x: Number(camera.x) || 0, y: Number(camera.y) || 0 }
  });
  return camera;
}


function clampEditorZoomValue(value, minZoom, maxZoom) {
  var min = Number.isFinite(Number(minZoom)) ? Number(minZoom) : 0.5;
  var max = Number.isFinite(Number(maxZoom)) ? Number(maxZoom) : 2;
  if (max < min) { var swap = min; min = max; max = swap; }
  min = Math.max(0.05, min);
  max = Math.max(min, max);
  var zoom = Number(value);
  if (!Number.isFinite(zoom)) zoom = 1;
  return Math.max(min, Math.min(max, zoom));
}

function syncLegacyWorldZoomFromEditor(source) {
  var runtimeZoom = clampEditorZoomValue(editor && editor.zoom, editor && editor.minZoom, editor && editor.maxZoom);
  var worldResolution = Math.max(1, Number(settings && settings.worldResolution) || 1);
  editor.zoom = runtimeZoom;
  if (settings) {
    settings.worldDisplayScale = runtimeZoom;
    settings.tileScale = runtimeZoom / worldResolution;
    settings.tileW = BASE_TILE_W * settings.tileScale;
    settings.tileH = BASE_TILE_H * settings.tileScale;
  }
  return {
    source: String(source || 'runtime-sync-world-zoom'),
    runtimeZoom: runtimeZoom,
    worldDisplayScale: Number(settings && settings.worldDisplayScale || runtimeZoom),
    tileScale: Number(settings && settings.tileScale || runtimeZoom),
    worldResolution: worldResolution
  };
}

function getEditorCameraSettingsValue() {
  return {
    zoom: Number(editor && editor.zoom) || 1,
    minZoom: Number(editor && editor.minZoom) || 0.5,
    maxZoom: Number(editor && editor.maxZoom) || 2,
    cameraCullingEnabled: editor && editor.cameraCullingEnabled !== false,
    cullingMargin: Math.max(0, Number(editor && editor.cullingMargin) || 0),
    showCameraBounds: !!(editor && editor.showCameraBounds),
    showCullingBounds: !!(editor && editor.showCullingBounds),
    surfaceOnlyRenderingEnabled: editor && editor.surfaceOnlyRenderingEnabled !== false,
    debugVisibleSurfaces: !!(editor && editor.debugVisibleSurfaces),
    staticWorldFaceMergeEnabled: editor && editor.staticWorldFaceMergeEnabled !== false,
    disableFaceMergeAtOrAboveZoomEnabled: !!(editor && editor.disableFaceMergeAtOrAboveZoomEnabled),
    disableFaceMergeAtOrAboveZoomThreshold: Math.max(0.05, Number(editor && editor.disableFaceMergeAtOrAboveZoomThreshold) || 1.6)
  };
}

function patchEditorCameraSettings(patch, meta) {
  patch = patch && typeof patch === 'object' ? patch : {};
  var before = getEditorCameraSettingsValue();
  var nextMin = before.minZoom;
  var nextMax = before.maxZoom;
  if (Object.prototype.hasOwnProperty.call(patch, 'minZoom')) {
    var parsedMin = Number(patch.minZoom);
    if (Number.isFinite(parsedMin)) nextMin = Math.max(0.05, parsedMin);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'maxZoom')) {
    var parsedMax = Number(patch.maxZoom);
    if (Number.isFinite(parsedMax)) nextMax = Math.max(0.05, parsedMax);
  }
  if (nextMax < nextMin) { var tmp = nextMin; nextMin = nextMax; nextMax = tmp; }
  editor.minZoom = nextMin;
  editor.maxZoom = nextMax;
  if (Object.prototype.hasOwnProperty.call(patch, 'zoom')) editor.zoom = clampEditorZoomValue(patch.zoom, nextMin, nextMax);
  else editor.zoom = clampEditorZoomValue(editor.zoom, nextMin, nextMax);
  syncLegacyWorldZoomFromEditor(meta && meta.source ? meta.source : 'patchEditorCameraSettings');
  if (Object.prototype.hasOwnProperty.call(patch, 'cameraCullingEnabled')) editor.cameraCullingEnabled = patch.cameraCullingEnabled !== false;
  if (Object.prototype.hasOwnProperty.call(patch, 'cullingMargin')) {
    var margin = Number(patch.cullingMargin);
    if (Number.isFinite(margin)) editor.cullingMargin = Math.max(0, margin);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'showCameraBounds')) editor.showCameraBounds = !!patch.showCameraBounds;
  if (Object.prototype.hasOwnProperty.call(patch, 'showCullingBounds')) editor.showCullingBounds = !!patch.showCullingBounds;
  if (Object.prototype.hasOwnProperty.call(patch, 'surfaceOnlyRenderingEnabled')) editor.surfaceOnlyRenderingEnabled = patch.surfaceOnlyRenderingEnabled !== false;
  if (Object.prototype.hasOwnProperty.call(patch, 'debugVisibleSurfaces')) editor.debugVisibleSurfaces = !!patch.debugVisibleSurfaces;
  if (Object.prototype.hasOwnProperty.call(patch, 'staticWorldFaceMergeEnabled')) editor.staticWorldFaceMergeEnabled = patch.staticWorldFaceMergeEnabled !== false;
  if (Object.prototype.hasOwnProperty.call(patch, 'disableFaceMergeAtOrAboveZoomEnabled')) editor.disableFaceMergeAtOrAboveZoomEnabled = !!patch.disableFaceMergeAtOrAboveZoomEnabled;
  if (Object.prototype.hasOwnProperty.call(patch, 'disableFaceMergeAtOrAboveZoomThreshold')) {
    var faceMergeZoomThreshold = Number(patch.disableFaceMergeAtOrAboveZoomThreshold);
    if (Number.isFinite(faceMergeZoomThreshold)) editor.disableFaceMergeAtOrAboveZoomThreshold = Math.max(0.05, faceMergeZoomThreshold);
  }
  var after = getEditorCameraSettingsValue();
  runtimeWrite('patchEditorCameraSettings', {
    source: meta && meta.source ? String(meta.source) : 'unknown',
    before: before,
    after: after
  });
  return after;
}

var RUNTIME_STATE_API = {
  owner: 'src/core/state/runtime-state.js',
  debugState: debugState,
  shadowProbeState: shadowProbeState,
  keys: keys,
  mouse: mouse,
  camera: camera,
  settings: settings,
  player: player,
  editor: editor,
  inspectorState: inspectorState,
  terrainGenerator: terrainGenerator,
  terrainLogic: terrainLogic,
  summarize: function () {
    return {
      editorMode: editor && editor.mode,
      previewFacing: editor && typeof editor.previewFacing === 'number' ? editor.previewFacing : 0,
      viewRotation: editor && typeof editor.rotation === 'number' ? editor.rotation : 0,
      visualRotation: editor && typeof editor.visualRotation === 'number' ? editor.visualRotation : (editor && typeof editor.rotation === 'number' ? editor.rotation : 0),
      isViewRotating: !!(editor && editor.isViewRotating),
      rotationAnimProgress: editor && typeof editor.rotationAnimProgress === 'number' ? editor.rotationAnimProgress : 1,
      legacyEditorRotation: editor && typeof editor.rotation === 'number' ? editor.rotation : 0,
      rotationAnimationEnabled: editor && editor.rotationAnimationEnabled !== false,
      rotationAnimationMs: editor && typeof editor.rotationAnimDurationMs === 'number' ? editor.rotationAnimDurationMs : 160,
      rotationInterpolationEnabled: editor && editor.rotationInterpolationEnabled !== false,
      rotationInterpolationMode: editor && editor.rotationInterpolationMode ? String(editor.rotationInterpolationMode) : 'easeInOut',
      selectedInstanceId: inspectorState && inspectorState.selectedInstanceId,
      camera: camera ? { x: camera.x, y: camera.y } : null,
      cameraSettings: getEditorCameraSettingsValue(),
      mouseInside: !!(mouse && mouse.inside),
      keyCount: keys && typeof keys.size === 'number' ? keys.size : null,
      world: settings ? { cols: settings.worldCols, rows: settings.worldRows, scale: settings.worldDisplayScale } : null,
      terrain: getTerrainGeneratorSettingsValue(),
      terrainLogic: getTerrainRuntimeModelValue()
    };
  },
  setEditorModeValue: setEditorModeValue,
  setEditorRotationValue: setEditorRotationValue,
  setPreviewFacingValue: setPreviewFacingValue,
  patchEditorViewRotationAnimation: patchEditorViewRotationAnimation,
  setSelectedInstanceIdValue: setSelectedInstanceIdValue,
  patchInspectorState: patchInspectorState,
  getTerrainGeneratorSettingsValue: getTerrainGeneratorSettingsValue,
  patchTerrainGeneratorSettings: patchTerrainGeneratorSettings,
  allocateTerrainBatchId: allocateTerrainBatchId,
  getTerrainRuntimeModelValue: getTerrainRuntimeModelValue,
  patchTerrainRuntimeModel: patchTerrainRuntimeModel,
  clearTerrainRuntimeModel: clearTerrainRuntimeModel,
  setCamera: setCamera,
  getEditorCameraSettingsValue: getEditorCameraSettingsValue,
  patchEditorCameraSettings: patchEditorCameraSettings,
  logWrite: function (scope, field, extra) {
    if (typeof refactorLogCurrent === 'function') refactorLogCurrent(scope || 'RuntimeState', 'write ' + String(field || 'unknown'), extra);
  },
  logRead: function (scope, field, extra) {
    if (typeof refactorLogCurrent === 'function') refactorLogCurrent(scope || 'RuntimeState', 'read ' + String(field || 'unknown'), extra);
  }
};
if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
  window.__APP_NAMESPACE.bind('state.runtimeState', RUNTIME_STATE_API, { owner: 'src/core/state/runtime-state.js', phase: 'P3-B' });
}
