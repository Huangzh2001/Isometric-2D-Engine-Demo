var __APP_CORE_PORTABLE_CORE__ = (function () {
  var OWNER = 'src/core/domain/portable-core.js';
  var PHASE = 'P14-B';

  function cloneJson(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function normalizeContext(context) {
    context = context && typeof context === 'object' ? context : {};
    return {
      sceneCore: context.sceneCore || null,
      selectors: context.selectors || null,
      sceneSnapshot: context.sceneSnapshot || null,
      prefabs: Array.isArray(context.prefabs) ? context.prefabs : [],
      playerBox: context.playerBox || null,
      grid: context.grid && typeof context.grid === 'object' ? context.grid : null,
      world: context.world && typeof context.world === 'object' ? context.world : null,
      existingBoxes: Array.isArray(context.existingBoxes) ? context.existingBoxes : [],
      runtimeSummary: context.runtimeSummary || null,
      lightingSummary: context.lightingSummary || null,
      domSummary: context.domSummary || null,
      selectedPrefabId: context.selectedPrefabId || null,
      source: context.source || 'portable-core:external-context'
    };
  }

  function buildWorldConfigSnapshot(worldConfig) {
    var s = worldConfig && typeof worldConfig === 'object' ? worldConfig : {};
    return {
      worldCols: toNumber(s.worldCols || s.cols, 0),
      worldRows: toNumber(s.worldRows || s.rows, 0),
      gridW: toNumber(s.gridW || s.worldCols || s.cols, 0),
      gridH: toNumber(s.gridH || s.worldRows || s.rows, 0),
      worldResolution: toNumber(s.worldResolution, 1),
      worldDisplayScale: toNumber(s.worldDisplayScale, 1),
      tileScale: toNumber(s.tileScale, 1),
      tileW: toNumber(s.tileW, 0),
      tileH: toNumber(s.tileH, 0)
    };
  }

  function buildPrefabCatalogSnapshot(prefabList) {
    var list = Array.isArray(prefabList) ? prefabList : [];
    return list.map(function (p) {
      if (!p) return null;
      return {
        id: String(p.id || ''),
        name: String(p.name || p.id || ''),
        renderMode: String(p.renderMode || ''),
        renderUpdateMode: String(p.renderUpdateMode || ''),
        interactionMode: String(p.interactionMode || ''),
        w: toNumber(p.w, 0),
        d: toNumber(p.d, 0),
        h: toNumber(p.h, 0),
        voxels: Array.isArray(p.voxels) ? p.voxels.length : 0,
        custom: !!p.custom,
        assetManaged: !!p.assetManaged,
        externalManaged: !!p.externalManaged,
        hasSupportCells: Array.isArray(p.supportCells) && p.supportCells.length > 0
      };
    }).filter(Boolean);
  }

  function buildPortableSceneSnapshot(context, options) {
    options = options || {};
    var safe = normalizeContext(context);
    return {
      source: safe.source,
      builtAt: new Date().toISOString(),
      kind: options.kind === 'debug' ? 'debug' : 'persistent',
      world: buildWorldConfigSnapshot(safe.world || safe.grid || {}),
      runtime: cloneJson(safe.runtimeSummary),
      lighting: cloneJson(safe.lightingSummary),
      dom: cloneJson(safe.domSummary),
      selectedPrefabId: safe.selectedPrefabId || null,
      prefabs: buildPrefabCatalogSnapshot(safe.prefabs),
      scene: cloneJson(safe.sceneSnapshot)
    };
  }

  function getPrefabByIdFromContext(context, prefabId) {
    var list = Array.isArray(context && context.prefabs) ? context.prefabs : [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p && String(p.id || '') === String(prefabId || '')) return p;
    }
    return null;
  }

  function evaluatePlacement(context, prefabId, cellX, cellY, options) {
    options = options || {};
    var safe = normalizeContext(context);
    var sceneCore = safe.sceneCore;
    if (!sceneCore || typeof sceneCore.evaluatePlacementCandidate !== 'function') {
      return { ok: false, reason: 'missing-scene-core' };
    }
    var proto = getPrefabByIdFromContext(safe, prefabId);
    if (!proto) return { ok: false, reason: 'missing-prefab', prefabId: String(prefabId || '') };
    var grid = safe.grid || safe.world || {};
    var result = sceneCore.evaluatePlacementCandidate({
      proto: proto,
      cellX: toNumber(cellX, 0),
      cellY: toNumber(cellY, 0),
      existingBoxes: Array.isArray(safe.existingBoxes) ? safe.existingBoxes : [],
      playerBox: options.playerBox || safe.playerBox || null,
      ignoreInstanceId: options.ignoreInstanceId || null,
      grid: { w: toNumber(grid.gridW || grid.worldCols || grid.cols, 0), h: toNumber(grid.gridH || grid.worldRows || grid.rows, 0) }
    });
    return { ok: !!(result && result.valid), result: result || null };
  }

  function findFirstValidPlacement(context, prefabId, options) {
    options = options || {};
    var safe = normalizeContext(context);
    var grid = safe.grid || safe.world || {};
    var maxX = Math.max(1, toNumber(grid.gridW || grid.worldCols || grid.cols, 0));
    var maxY = Math.max(1, toNumber(grid.gridH || grid.worldRows || grid.rows, 0));
    var attempts = 0;
    for (var y = 0; y < maxY; y++) {
      for (var x = 0; x < maxX; x++) {
        attempts += 1;
        var evaluated = evaluatePlacement(safe, prefabId, x, y, options);
        if (evaluated.ok && evaluated.result && evaluated.result.valid) {
          return { ok: true, attempts: attempts, cellX: x, cellY: y, result: evaluated.result };
        }
      }
    }
    return { ok: false, attempts: attempts, reason: 'no-valid-placement-found' };
  }

  function summarizeBoundary() {
    return {
      phase: PHASE,
      owner: OWNER,
      portableModules: ['domain.sceneCore', 'domain.portableCore'],
      engineBoundModules: ['presentation.render', 'presentation.ui', 'presentation.shell', 'infrastructure.storage.scene-storage'],
      inputContract: {
        required: ['sceneCore', 'prefabs', 'existingBoxes', 'grid'],
        optional: ['sceneSnapshot', 'playerBox', 'runtimeSummary', 'lightingSummary', 'domSummary', 'selectedPrefabId']
      },
      purity: {
        rulesReadWindowDirectly: false,
        rulesReadSettingsDirectly: false,
        rulesReadBoxesDirectly: false,
        rulesReadPlatformDirectly: false,
        requiresExplicitContext: true
      }
    };
  }

  function exportPortableManifest(context) {
    var safe = normalizeContext(context);
    return {
      generatedAt: new Date().toISOString(),
      boundary: summarizeBoundary(),
      snapshot: buildPortableSceneSnapshot(safe, { kind: 'persistent' })
    };
  }

  return {
    phase: PHASE,
    owner: OWNER,
    summarizeBoundary: summarizeBoundary,
    buildWorldConfigSnapshot: buildWorldConfigSnapshot,
    buildPrefabCatalogSnapshot: buildPrefabCatalogSnapshot,
    buildPortableSceneSnapshot: buildPortableSceneSnapshot,
    evaluatePlacement: evaluatePlacement,
    findFirstValidPlacement: findFirstValidPlacement,
    exportPortableManifest: exportPortableManifest
  };
})();
