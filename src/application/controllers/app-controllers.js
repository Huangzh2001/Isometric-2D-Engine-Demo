(function () {
  if (typeof window === 'undefined') return;

  function emitP7(kind, message, extra) {
    var line = '[P7][' + String(kind || 'BOOT') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (err) {
      try { console.log(line); } catch (_) {}
    }
    return line;
  }

  function getNs() {
    return (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') ? window.__APP_NAMESPACE : null;
  }

  function appPath(path) {
    var ns = getNs();
    if (!ns || typeof ns.getPath !== 'function') return null;
    try { return ns.getPath(String(path || '')) || null; } catch (_) { return null; }
  }

  var APP_BOUNDARY_OWNER = 'src/application/controllers/app-controllers.js';
  var APP_BOUNDARY_PHASE = 'P15-APP';
  var APP_BOUNDARY_MAX = 80;
  var appBoundaryAudit = {
    owner: APP_BOUNDARY_OWNER,
    phase: APP_BOUNDARY_PHASE,
    counters: {
      stateActionHits: 0,
      prefabRegistryHits: 0,
      runtimeStateHits: 0,
      serviceWorkflowHits: 0,
      selectorHits: 0,
      legacyGlobalHits: 0,
      fallbackCount: 0
    },
    lastEvent: null,
    lastFallback: null,
    recentEvents: [],
    recentFallbacks: []
  };

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function pushAudit(bucket, entry) {
    bucket.push(entry);
    if (bucket.length > APP_BOUNDARY_MAX) bucket.splice(0, bucket.length - APP_BOUNDARY_MAX);
    return entry;
  }

  function recordAppBoundaryEvent(kind, route, detail) {
    var entry = {
      at: (function(){ try { return new Date().toISOString(); } catch (_) { return ''; } })(),
      kind: String(kind || ''),
      route: String(route || ''),
      detail: safeClone(detail || null)
    };
    if (kind === 'state-action') appBoundaryAudit.counters.stateActionHits += 1;
    else if (kind === 'prefab-registry') appBoundaryAudit.counters.prefabRegistryHits += 1;
    else if (kind === 'runtime-state') appBoundaryAudit.counters.runtimeStateHits += 1;
    else if (kind === 'service-workflow') appBoundaryAudit.counters.serviceWorkflowHits += 1;
    else if (kind === 'selector') appBoundaryAudit.counters.selectorHits += 1;
    else if (kind === 'legacy-global') appBoundaryAudit.counters.legacyGlobalHits += 1;
    appBoundaryAudit.lastEvent = entry;
    pushAudit(appBoundaryAudit.recentEvents, entry);
    return entry;
  }

  function recordAppBoundaryFallback(route, detail) {
    var entry = {
      at: (function(){ try { return new Date().toISOString(); } catch (_) { return ''; } })(),
      route: String(route || ''),
      detail: safeClone(detail || null)
    };
    appBoundaryAudit.counters.fallbackCount += 1;
    appBoundaryAudit.lastFallback = entry;
    pushAudit(appBoundaryAudit.recentFallbacks, entry);
    return entry;
  }

  function summarizeAppBoundary(label) {
    return {
      owner: APP_BOUNDARY_OWNER,
      phase: APP_BOUNDARY_PHASE,
      label: String(label || ''),
      available: true,
      counters: safeClone(appBoundaryAudit.counters),
      lastEvent: safeClone(appBoundaryAudit.lastEvent),
      lastFallback: safeClone(appBoundaryAudit.lastFallback),
      recentEvents: appBoundaryAudit.recentEvents.slice(-8).map(safeClone),
      recentFallbacks: appBoundaryAudit.recentFallbacks.slice(-5).map(safeClone)
    };
  }

  function resetAppBoundary(meta) {
    appBoundaryAudit.counters.stateActionHits = 0;
    appBoundaryAudit.counters.prefabRegistryHits = 0;
    appBoundaryAudit.counters.runtimeStateHits = 0;
    appBoundaryAudit.counters.serviceWorkflowHits = 0;
    appBoundaryAudit.counters.selectorHits = 0;
    appBoundaryAudit.counters.legacyGlobalHits = 0;
    appBoundaryAudit.counters.fallbackCount = 0;
    appBoundaryAudit.lastEvent = null;
    appBoundaryAudit.lastFallback = null;
    appBoundaryAudit.recentEvents = [];
    appBoundaryAudit.recentFallbacks = [];
    recordAppBoundaryEvent('reset', 'application-boundary.reset', meta || { source: 'app-controllers:reset' });
    return summarizeAppBoundary(meta && meta.label ? String(meta.label) : 'reset');
  }

  function getServices() {
    return appPath('services') || {};
  }

  function getEditorHandoffService() {
    var services = getServices();
    return services && services.editorHandoff ? services.editorHandoff : null;
  }

  function getState() {
    return appPath('state') || {};
  }

  function getStateActions() {
    var state = getState();
    return state && state.actions ? state.actions : null;
  }

  function getSelectors() {
    var state = getState();
    return state && state.selectors ? state.selectors : null;
  }

  function getPrefabRegistry() {
    var state = getState();
    return state && state.prefabRegistry ? state.prefabRegistry : null;
  }

  function getRuntimeStateApi() {
    var state = getState();
    return state && state.runtimeState ? state.runtimeState : null;
  }

  function getHabboLibraryState() {
    try { return window.habboLibraryState || null; } catch (_) { return null; }
  }

  function getPlacementEffects() {
    return appPath('placement.effects') || null;
  }

  function getPlacementRouteAudit() {
    return appPath('placement.routeAudit') || null;
  }

  function recordItemRotationDiagnostic(kind, payload) {
    var api = appPath('infrastructure.itemRotationDiagnostic') || (typeof window !== 'undefined' ? window.__ITEM_ROTATION_DIAGNOSTIC__ || null : null);
    if (api && typeof api.record === 'function') {
      try { return api.record(kind, payload || null); } catch (_) {}
    }
    return null;
  }


  emitItemFacingCoreBindCheck('app-controllers:startup');

  function getViewRotationCoreApi() {
    return appPath('domain.viewRotationCore') || (typeof window !== 'undefined' ? window.__VIEW_ROTATION_CORE__ || null : null);
  }

  function getItemFacingCoreApi() {
    return appPath('domain.itemFacingCore') || (typeof window !== 'undefined' ? window.__ITEM_FACING_CORE__ || null : null);
  }


  function getTerrainGeneratorCoreApi() {
    return appPath('domain.terrainGeneratorCore') || (typeof window !== 'undefined' ? window.__TERRAIN_GENERATOR_CORE__ || null : null);
  }

  function getTerrainMaterialCoreApi() {
    return appPath('domain.terrainMaterial') || (typeof window !== 'undefined' ? window.__TERRAIN_MATERIAL_CORE__ || null : null);
  }

  function getSceneSessionApi() {
    var state = getState();
    return state && state.sceneSession ? state.sceneSession : (appPath('state.sceneSession') || (typeof window !== 'undefined' ? window.__SCENE_SESSION_STATE__ || null : null));
  }

  function getSceneGraphApi() {
    var state = getState();
    return state && state.sceneGraph ? state.sceneGraph : (appPath('state.sceneGraph') || (typeof window !== 'undefined' ? window.__SCENE_GRAPH_STATE__ || null : null));
  }

  function isDetailedTerrainProfilingEnabledForController() {
    var settings = getMainEditorTerrainSettings('app-controllers:detailed-terrain-profiling');
    return !!(settings && settings.terrainDetailedProfilingEnabled === true);
  }

  function recordTerrainDiagnostic(event, payload) {
    var entry = Object.assign({ event: String(event || '') }, safeClone(payload || {}));
    try {
      var line = '[TERRAIN] ' + JSON.stringify(entry);
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return entry;
  }

  function controllerPerfNowMs() {
    try {
      if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') return performance.now();
    } catch (_) {}
    return Date.now();
  }

  function emitStructuredControllerLog(tag, payload) {
    var line = '[' + String(tag || 'APP-CONTROLLER') + '] ';
    try { line += JSON.stringify(payload || {}); } catch (_) { line += '{}'; }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function emitTerrainGenerateProfile(payload) {
    return emitStructuredControllerLog('TERRAIN-GENERATE-PROFILE', payload || {});
  }

  function emitSceneCommitProfile(payload) {
    return emitStructuredControllerLog('SCENE-COMMIT-PROFILE', payload || {});
  }


  var __pendingTerrainApplyJob = null;
  var TERRAIN_APPLY_BATCH_INSTANCE_COUNT = 512;

  function cancelPendingTerrainApplyJob(reason) {
    if (!__pendingTerrainApplyJob) return false;
    __pendingTerrainApplyJob = null;
    return true;
  }

  var __itemFacingCoreBindCheckLogged = false;

  function emitItemFacingCoreBindCheck(source) {
    if (__itemFacingCoreBindCheckLogged) return null;
    var api = getItemFacingCoreApi();
    var payload = {
      source: String(source || 'app-controllers:startup'),
      getVisibleSemanticFaceMappingDefined: !!(api && typeof api.getVisibleSemanticFaceMapping === 'function'),
      resolveVisibleSemanticFacesDefined: !!(api && typeof api.resolveVisibleSemanticFaces === 'function'),
      getVisibleSemanticFacesDefined: !!(api && typeof api.getVisibleSemanticFaces === 'function')
    };
    payload.startupReferenceErrorFixed = payload.getVisibleSemanticFaceMappingDefined && payload.resolveVisibleSemanticFacesDefined && payload.getVisibleSemanticFacesDefined;
    recordItemRotationDiagnostic('item-facing-core-bind-check', payload);
    __itemFacingCoreBindCheckLogged = payload.startupReferenceErrorFixed;
    return payload;
  }

  function getLightingStateApi() {
    return appPath('state.lightingState') || null;
  }

  function getMainViewDirectionLabel(rotation) {
    var labels = ['NE', 'SE', 'SW', 'NW'];
    return labels[normalizeFacingValue(rotation)] || 'NE';
  }

  function buildMainViewProjectionConfig() {
    return {
      tileW: settings && settings.tileW,
      tileH: settings && settings.tileH,
      originX: settings && settings.originX,
      originY: settings && settings.originY,
      cameraX: camera && camera.x,
      cameraY: camera && camera.y,
      worldBoundsOrOrigin: { cols: settings && (settings.gridW || settings.worldCols), rows: settings && (settings.gridH || settings.worldRows) }
    };
  }

  function projectWorldPointForView(point, viewRotation) {
    var api = getViewRotationCoreApi();
    if (api && typeof api.worldToScreenWithViewRotation === 'function') {
      return api.worldToScreenWithViewRotation(point || { x: 0, y: 0, z: 0 }, viewRotation, buildMainViewProjectionConfig());
    }
    var x = Number(point && point.x) || 0;
    var y = Number(point && point.y) || 0;
    var z = Number(point && point.z) || 0;
    return {
      x: (settings.originX + camera.x) + (x - y) * settings.tileW * 0.5,
      y: (settings.originY + camera.y) + (x + y) * settings.tileH * 0.5 - z * settings.tileH,
      viewRotation: normalizeFacingValue(viewRotation)
    };
  }

  function inverseProjectScreenPointForView(screenPoint, viewRotation) {
    var api = getViewRotationCoreApi();
    if (api && typeof api.screenToWorldWithViewRotation === 'function') {
      return api.screenToWorldWithViewRotation(screenPoint || { x: 0, y: 0, z: 0 }, viewRotation, buildMainViewProjectionConfig());
    }
    return { x: 0, y: 0, z: 0, viewRotation: normalizeFacingValue(viewRotation) };
  }

  function getRenderableAnchorPoint(instance, prefab) {
    var facingApi = getItemFacingCoreApi();
    var anchor = facingApi && typeof facingApi.getRotatedAnchor === 'function'
      ? facingApi.getRotatedAnchor(prefab || {}, instance && instance.rotation != null ? instance.rotation : 0)
      : { x: 0, y: 0, z: 0 };
    return {
      x: Number(instance && instance.x || 0) + Number(anchor && anchor.x || 0),
      y: Number(instance && instance.y || 0) + Number(anchor && anchor.y || 0),
      z: Number(instance && instance.z || 0) + Number(anchor && anchor.z || 0)
    };
  }

  function getSemanticFaceSnapshot(prefab, instanceFacing, viewRotation, instanceId) {
    var facingApi = getItemFacingCoreApi();
    var mapping = facingApi && typeof facingApi.resolveVisibleSemanticFaces === 'function'
      ? facingApi.resolveVisibleSemanticFaces({ itemFacing: instanceFacing, viewRotation: viewRotation })
      : (facingApi && typeof facingApi.getVisibleSemanticFaceMapping === 'function'
        ? facingApi.getVisibleSemanticFaceMapping({ itemFacing: instanceFacing, viewRotation: viewRotation })
        : null);
    var hasExplicitSemanticTextures = !!(facingApi && typeof facingApi.hasExplicitSemanticTextures === 'function'
      ? facingApi.hasExplicitSemanticTextures(prefab || {})
      : (prefab && (prefab.itemRotationDebug || prefab.semanticTextureMap || prefab.semanticTextures || prefab.semanticFaceColors)));
    var semanticTextureMap = hasExplicitSemanticTextures && facingApi && typeof facingApi.getSemanticTextureMap === 'function'
      ? facingApi.getSemanticTextureMap(prefab || {})
      : (hasExplicitSemanticTextures && prefab && prefab.semanticTextures ? prefab.semanticTextures : null);
    recordItemRotationDiagnostic('main-semantic-resolver-hit', {
      instanceId: instanceId || null,
      prefabId: prefab && prefab.id || null,
      instanceFacing: normalizeFacingValue(instanceFacing),
      viewRotation: normalizeFacingValue(viewRotation),
      effectiveFacing: mapping ? mapping.effectiveFacing : normalizeFacingValue(instanceFacing),
      visibleFaces: mapping && Array.isArray(mapping.visibleFaces) ? mapping.visibleFaces.slice() : [],
      screenFaceToSemanticFace: mapping && mapping.screenFaces ? {
        top: 'top',
        east: mapping.screenFaces.east || null,
        south: mapping.screenFaces.south || null
      } : {},
      semanticFaceToTextureSlot: semanticTextureMap ? {
        top: semanticTextureMap.top || null,
        north: semanticTextureMap.north || null,
        east: semanticTextureMap.east || null,
        south: semanticTextureMap.south || null,
        west: semanticTextureMap.west || null
      } : null,
      textureSlotsUsed: semanticTextureMap || null,
      resolverFunctionAvailable: !!(facingApi && (typeof facingApi.resolveVisibleSemanticFaces === 'function' || typeof facingApi.getVisibleSemanticFaceMapping === 'function'))
    });
    return { mapping: mapping, semanticTextureMap: semanticTextureMap };
  }

  function getInstanceBoxes(instanceId) {
    if (typeof boxes === 'undefined' || !Array.isArray(boxes)) return [];
    return boxes.filter(function (box) { return box && String(box.instanceId || '') === String(instanceId || ''); });
  }

  function buildInstanceRotationSnapshot(instance, previousViewRotation, nextViewRotation) {
    var instanceRef = instance || null;
    var prefab = (typeof getPrefabById === 'function') ? getPrefabById(instanceRef && instanceRef.prefabId) : null;
    var logical = { x: Number(instanceRef && instanceRef.x || 0), y: Number(instanceRef && instanceRef.y || 0), z: Number(instanceRef && instanceRef.z || 0) };
    var facing = normalizeFacingValue(instanceRef && instanceRef.rotation || 0);
    var anchorPoint = getRenderableAnchorPoint(instanceRef, prefab);
    var screenBefore = projectWorldPointForView(anchorPoint, previousViewRotation);
    var screenAfter = projectWorldPointForView(anchorPoint, nextViewRotation);
    var semanticBefore = getSemanticFaceSnapshot(prefab, facing, previousViewRotation);
    var semanticAfter = getSemanticFaceSnapshot(prefab, facing, nextViewRotation, instanceRef && instanceRef.instanceId || null);
    return {
      instanceId: instanceRef && instanceRef.instanceId || null,
      prefabId: instanceRef && instanceRef.prefabId || null,
      logicalBefore: logical,
      logicalAfter: logical,
      instanceFacingBefore: facing,
      instanceFacingAfter: facing,
      screenBefore: { x: Math.round(screenBefore.x), y: Math.round(screenBefore.y) },
      screenAfter: { x: Math.round(screenAfter.x), y: Math.round(screenAfter.y) },
      screenPositionChanged: Math.round(screenBefore.x) !== Math.round(screenAfter.x) || Math.round(screenBefore.y) !== Math.round(screenAfter.y),
      semanticFacesBefore: semanticBefore.mapping,
      semanticFacesAfter: semanticAfter.mapping,
      textureSlotsBefore: semanticBefore.semanticTextureMap,
      textureSlotsAfter: semanticAfter.semanticTextureMap,
      boxRenderables: getInstanceBoxes(instanceRef && instanceRef.instanceId).map(function (box) {
        var beforeBox = projectWorldPointForView({ x: box.x, y: box.y, z: box.z + box.h }, previousViewRotation);
        var afterBox = projectWorldPointForView({ x: box.x, y: box.y, z: box.z + box.h }, nextViewRotation);
        return {
          boxId: box.id || null,
          logical: { x: box.x, y: box.y, z: box.z, w: box.w, d: box.d, h: box.h },
          screenBefore: { x: Math.round(beforeBox.x), y: Math.round(beforeBox.y) },
          screenAfter: { x: Math.round(afterBox.x), y: Math.round(afterBox.y) },
          screenPositionChanged: Math.round(beforeBox.x) !== Math.round(afterBox.x) || Math.round(beforeBox.y) !== Math.round(afterBox.y)
        };
      })
    };
  }

  function collectPreviewRotationSnapshot(viewRotation) {
    var preview = editor && editor.preview ? editor.preview : null;
    if (!preview) return null;
    var origin = preview.origin || null;
    var projected = origin ? projectWorldPointForView(origin, viewRotation) : null;
    return {
      previewFacing: readPreviewFacingValue(),
      origin: origin ? safeClone(origin) : null,
      projectedOrigin: projected ? { x: Math.round(projected.x), y: Math.round(projected.y) } : null,
      valid: !!preview.valid,
      reason: preview.reason || 'ok'
    };
  }

  function collectMainViewRotationDiagnostics(previousViewRotation, nextViewRotation, source) {
    var renderInstances = (typeof instances !== 'undefined' && Array.isArray(instances)) ? instances.slice() : [];
    var snapshots = renderInstances.map(function (inst) { return buildInstanceRotationSnapshot(inst, previousViewRotation, nextViewRotation); });
    recordItemRotationDiagnostic('main-view-rotation-change', {
      source: String(source || 'unknown'),
      previousViewRotation: normalizeFacingValue(previousViewRotation),
      nextViewRotation: normalizeFacingValue(nextViewRotation),
      sceneGraphMutated: false,
      instanceRotationsMutated: false,
      previewFacingMutated: false,
      lightWorldPositionsMutated: false
    });
    recordItemRotationDiagnostic('main-view-rotation-before-after-snapshot', {
      source: String(source || 'unknown'),
      previousViewRotation: normalizeFacingValue(previousViewRotation),
      nextViewRotation: normalizeFacingValue(nextViewRotation),
      sceneGraphMutated: false,
      instanceRotationMutated: false,
      previewFacingMutated: false,
      instances: snapshots
    });
    if (snapshots.length) {
      recordItemRotationDiagnostic('main-view-rotation-projection-check', {
        source: String(source || 'unknown'),
        viewRotation: normalizeFacingValue(nextViewRotation),
        sampleInstanceId: snapshots[0].instanceId,
        logicalOriginBefore: snapshots[0].logicalBefore,
        logicalOriginAfter: snapshots[0].logicalAfter,
        screenPositionChanged: !!snapshots[0].screenPositionChanged
      });
    }
    var preview = editor && editor.preview ? editor.preview : null;
    if (preview) {
      var mouseScreen = { x: Number(mouse && mouse.x || 0), y: Number(mouse && mouse.y || 0), z: 0 };
      var resolved = inverseProjectScreenPointForView(mouseScreen, nextViewRotation);
      recordItemRotationDiagnostic('main-view-rotation-placement-check', {
        source: String(source || 'unknown'),
        viewRotation: normalizeFacingValue(nextViewRotation),
        mouseScreen: mouseScreen,
        resolvedLogicalCell: { x: Math.floor(Number(resolved.x) || 0), y: Math.floor(Number(resolved.y) || 0) },
        previewOrigin: preview.origin ? safeClone(preview.origin) : null,
        inverseProjectionUsed: true
      });
    }
    renderInstances.forEach(function (inst) {
      var prefab = (typeof getPrefabById === 'function') ? getPrefabById(inst.prefabId) : null;
      var facing = normalizeFacingValue(inst.rotation || 0);
      if (prefab && prefab.semanticTextures) {
        var semantic = getSemanticFaceSnapshot(prefab, facing, nextViewRotation, inst.instanceId || null);
        recordItemRotationDiagnostic('main-view-rotation-semantic-texture-check', {
          prefabId: prefab.id || null,
          instanceId: inst.instanceId || null,
          instanceFacing: facing,
          viewRotation: normalizeFacingValue(nextViewRotation),
          effectiveFacing: semantic.mapping ? semantic.mapping.effectiveFacing : facing,
          renderedAsOverlay: false,
          semanticTexturesPresent: true,
          visibleFaces: semantic.mapping ? semantic.mapping.visibleFaces : [],
          textureSlotsUsed: semantic.semanticTextureMap || null
        });
      } else if (prefab && typeof prefabHasSprite === 'function' && prefabHasSprite(prefab)) {
        var facingApi = getItemFacingCoreApi();
        var spriteCfg = facingApi && typeof facingApi.resolveSpriteFacing === 'function' ? facingApi.resolveSpriteFacing(prefab, facing) : { strategy: 'single' };
        if (spriteCfg && spriteCfg.strategy === 'single') {
          recordItemRotationDiagnostic('main-view-rotation-single-sprite-check', {
            prefabId: prefab.id || null,
            instanceId: inst.instanceId || null,
            viewRotation: normalizeFacingValue(nextViewRotation),
            spriteStrategy: 'single',
            textureChanged: false,
            reason: 'single-direction-texture'
          });
        }
      }
    });
    var lightingApi = getLightingStateApi();
    var lightList = lightingApi && typeof lightingApi.getLights === 'function' ? lightingApi.getLights() : (typeof lights !== 'undefined' ? lights : []);
    (Array.isArray(lightList) ? lightList : []).forEach(function (light) {
      var world = { x: Number(light && light.x || 0), y: Number(light && light.y || 0), z: Number(light && light.z || 0) };
      var before = projectWorldPointForView(world, previousViewRotation);
      var after = projectWorldPointForView(world, nextViewRotation);
      recordItemRotationDiagnostic('main-view-rotation-light-check', {
        lightId: light && (light.id || light.name) || null,
        previousViewRotation: normalizeFacingValue(previousViewRotation),
        nextViewRotation: normalizeFacingValue(nextViewRotation),
        worldPositionBefore: world,
        worldPositionAfter: world,
        screenPositionBefore: { x: Math.round(before.x), y: Math.round(before.y) },
        screenPositionAfter: { x: Math.round(after.x), y: Math.round(after.y) },
        worldPositionMutated: false,
        screenPositionChanged: Math.round(before.x) !== Math.round(after.x) || Math.round(before.y) !== Math.round(after.y),
        shadowProjectionUpdated: true
      });
    });
    return { instances: snapshots.length, lights: Array.isArray(lightList) ? lightList.length : 0, preview: !!preview };
  }

  function exportMainViewRotationDiagnostic(source) {
    var api = appPath('infrastructure.itemRotationDiagnostic') || (typeof window !== 'undefined' ? window.__ITEM_ROTATION_DIAGNOSTIC__ || null : null);
    if (!api || typeof api.download !== 'function') return null;
    return api.download('main-view-rotation', {
      source: String(source || 'ui.downloadMainViewRotationDiagnostic.click'),
      viewRotation: readEditorRotationValue(),
      previewFacing: readPreviewFacingValue(),
      selectedInstanceId: inspectorState && inspectorState.selectedInstanceId || null,
      sceneInstanceCount: (typeof instances !== 'undefined' && Array.isArray(instances)) ? instances.length : 0
    });
  }

  function getPlacementCore() {
    return appPath('application.placementCore') || null;
  }

  function recordPlacementRoute(action, route, detail) {
    var audit = getPlacementRouteAudit();
    if (audit && typeof audit.recordControllerRoute === 'function') {
      try { return audit.recordControllerRoute(action, route, detail || null); } catch (_) {}
    }
    return { action: String(action || ''), route: String(route || ''), detail: detail || null, available: false };
  }

  function summarizePlacementRoutes(label) {
    var audit = getPlacementRouteAudit();
    if (!audit || typeof audit.summarize !== 'function') return { label: String(label || ''), available: false };
    var summary = audit.summarize(String(label || '')) || {};
    summary.label = String(label || '');
    summary.available = true;
    return summary;
  }

  function resetPlacementRoutes(meta) {
    var audit = getPlacementRouteAudit();
    if (!audit || typeof audit.resetAudit !== 'function') return { label: meta && meta.source ? String(meta.source) : '', available: false, reason: 'missing-placement-route-audit' };
    return audit.resetAudit(meta || { source: 'app-controllers:reset-placement-routes' });
  }

  function applyPlacementIntent(intent) {
    intent = intent || {};
    var source = String(intent.source || 'p8s3:apply-placement-intent');
    var result = { ok: true, source: source, state: null, ui: null };
    if (intent.prefabId) result.state = selectPrefabById(intent.prefabId, source + ':prefab-id');
    else if (typeof intent.prefabIndex !== 'undefined' && intent.prefabIndex !== null) result.state = handlePrefabSelectChange(intent.prefabIndex, source + ':prefab-index');
    if (intent.mode) requestModeChange(intent.mode, { source: source + ':mode' });
    if (intent.syncUi !== false) result.ui = syncPlacementUi({ source: source + ':ui', forcePreview: !!intent.forcePreview, requeuePreview: !!intent.requeuePreview });
    recordPlacementRoute('applyPlacementIntent', 'placement.application.intent', {
      source: source,
      prefabId: intent.prefabId ? String(intent.prefabId) : null,
      prefabIndex: typeof intent.prefabIndex !== 'undefined' ? Number(intent.prefabIndex) : null,
      mode: intent.mode ? String(intent.mode) : null,
      syncUi: intent.syncUi !== false,
      forcePreview: !!intent.forcePreview,
      requeuePreview: !!intent.requeuePreview
    });
    return result;
  }

  function completeDragInteraction(kind, meta) {
    meta = meta || {};
    var source = String(meta.source || ('p8s4:complete-drag-' + String(kind || 'unknown')));
    var result = { ok: false, source: source, kind: String(kind || ''), state: null, ui: null };
    var effects = getPlacementEffects();
    if (effects) {
      if (String(kind || '') === 'commit' && typeof effects.finishDragCommit === 'function') {
        result.state = effects.finishDragCommit({ source: source + ':state' });
        recordPlacementRoute('completeDragInteraction.state', 'placement.effects.finishDragCommit', { source: source, result: result.state });
      } else if (String(kind || '') === 'cancel' && typeof effects.finishDragCancel === 'function') {
        result.state = effects.finishDragCancel({ source: source + ':state' });
        recordPlacementRoute('completeDragInteraction.state', 'placement.effects.finishDragCancel', { source: source, result: result.state });
      } else {
        recordPlacementRoute('completeDragInteraction.state', 'legacy.missing-drag-state-route', { source: source, kind: String(kind || '') });
      }
    } else {
      recordPlacementRoute('completeDragInteraction.state', 'legacy.missing-placement-effects', { source: source, kind: String(kind || '') });
    }
    if (meta.syncUi !== false) {
      result.ui = syncPlacementUi({
        source: source + ':ui',
        forcePreview: !!meta.forcePreview,
        requeuePreview: !!meta.requeuePreview
      });
    }
    result.ok = !!(result.state || result.ui);
    recordPlacementRoute('completeDragInteraction', 'placement.application.completeDragInteraction', {
      source: source,
      kind: String(kind || ''),
      syncUi: meta.syncUi !== false,
      forcePreview: !!meta.forcePreview,
      requeuePreview: !!meta.requeuePreview
    });
    return result;
  }

  function readEditorMainHandoff() {
    var service = getEditorHandoffService();
    if (!service || typeof service.readHandoff !== 'function') {
      recordAppBoundaryFallback('missing-editorHandoff.readHandoff', { source: 'application:editor-handoff-read' });
      return null;
    }
    recordAppBoundaryEvent('service-workflow', 'services.editorHandoff.readHandoff', { source: 'application:editor-handoff-read' });
    return service.readHandoff({ source: 'application:editor-handoff-read' });
  }

  function clearEditorMainHandoff() {
    var service = getEditorHandoffService();
    if (!service || typeof service.clearHandoff !== 'function') {
      recordAppBoundaryFallback('missing-editorHandoff.clearHandoff', { source: 'application:editor-handoff-clear' });
      return false;
    }
    recordAppBoundaryEvent('service-workflow', 'services.editorHandoff.clearHandoff', { source: 'application:editor-handoff-clear' });
    return service.clearHandoff({ source: 'application:editor-handoff-clear' });
  }

  function normalizeHabboLibraryType(type) {
    return String(type || 'room') === 'wall' ? 'wall' : 'room';
  }

  function normalizeHabboLibraryCategory(category) {
    var value = String(category || 'all').trim();
    return value || 'all';
  }

  function getHabboSelection() {
    try {
      if (typeof ensureHabboLibrarySelection === 'function') return ensureHabboLibrarySelection();
      return null;
    } catch (_) {
      return null;
    }
  }

  function invokeControllerAction(actionMap, action, payload) {
    var fn = actionMap && action ? actionMap[action] : null;
    if (typeof fn !== 'function') return { ok: false, reason: 'missing-controller-action', action: action || null };
    if (Array.isArray(payload)) return fn.apply(null, payload);
    if (payload && Array.isArray(payload.__args)) return fn.apply(null, payload.__args);
    if (typeof payload === 'undefined') return fn();
    return fn(payload);
  }

  function dispatchControllerCommand(controllerName, action, payload) {
    try {
      var controller = appPath('controllers.' + String(controllerName || '')) || null;
      if (!controller || typeof controller.dispatch !== 'function') return { ok: false, reason: 'missing-controller-dispatch', controller: controllerName || null, action: action || null };
      return controller.dispatch(action, payload);
    } catch (_) {
      return { ok: false, reason: 'controller-dispatch-threw', controller: controllerName || null, action: action || null };
    }
  }

  async function runAssetScan(options) {
    options = options || {};
    var services = getServices();
    var workflow = services.assetWorkflow;
    if (workflow && typeof workflow.runAssetScan === 'function') {
      return await workflow.runAssetScan({ force: !!options.force, source: String(options.source || 'p7b:asset-scan') });
    }
    return { ok: false, reason: 'missing-asset-workflow-service' };
  }

  async function saveSceneTarget(options) {
    options = options || {};
    var services = getServices();
    var workflow = services.sceneWorkflow;
    if (workflow && typeof workflow.saveSceneTarget === 'function') {
      recordAppBoundaryEvent('service-workflow', 'services.sceneWorkflow.saveSceneTarget', { source: String(options.source || 'unknown'), target: String(options.target || '') });
      return await workflow.saveSceneTarget(options);
    }
    recordAppBoundaryFallback('missing-scene-workflow-service.saveSceneTarget', { source: String(options.source || 'unknown') });
    return { ok: false, reason: 'missing-scene-workflow-service' };
  }

  async function loadSceneTarget(options) {
    options = options || {};
    var services = getServices();
    var workflow = services.sceneWorkflow;
    if (workflow && typeof workflow.loadSceneTarget === 'function') {
      recordAppBoundaryEvent('service-workflow', 'services.sceneWorkflow.loadSceneTarget', { source: String(options.source || 'unknown'), target: String(options.target || '') });
      return await workflow.loadSceneTarget(options);
    }
    recordAppBoundaryFallback('missing-scene-workflow-service.loadSceneTarget', { source: String(options.source || 'unknown') });
    return { ok: false, reason: 'missing-scene-workflow-service' };
  }

  function getSelectedPrefabId() {
    var selectors = getSelectors();
    if (selectors && typeof selectors.getSelectedPrefabId === 'function') {
      recordAppBoundaryEvent('selector', 'state.selectors.getSelectedPrefabId', { source: 'app-controllers:getSelectedPrefabId' });
      return selectors.getSelectedPrefabId() || null;
    }
    recordAppBoundaryFallback('missing-state-selectors.getSelectedPrefabId', { source: 'app-controllers:getSelectedPrefabId' });
    return null;
  }

  function getPrototypeCount() {
    var registryApi = getPrefabRegistry();
    if (registryApi && typeof registryApi.getPrototypeCount === 'function') {
      recordAppBoundaryEvent('prefab-registry', 'state.prefabRegistry.getPrototypeCount', { source: 'app-controllers:getPrototypeCount' });
      return Number(registryApi.getPrototypeCount()) || 0;
    }
    recordAppBoundaryFallback('missing-prefabRegistry.getPrototypeCount', { source: 'app-controllers:getPrototypeCount' });
    return 0;
  }

  function findPrefabIndexById(prefabId) {
    var registryApi = getPrefabRegistry();
    var id = String(prefabId || '');
    if (registryApi && typeof registryApi.getPrototypes === 'function') {
      var list = registryApi.getPrototypes() || [];
      var idx = Array.isArray(list) ? list.findIndex(function (p) { return p && p.id === id; }) : -1;
      recordAppBoundaryEvent('prefab-registry', 'state.prefabRegistry.getPrototypes', { source: 'app-controllers:findPrefabIndexById', prefabId: id, result: idx });
      return idx;
    }
    recordAppBoundaryFallback('missing-prefabRegistry.getPrototypes', { source: 'app-controllers:findPrefabIndexById', prefabId: id });
    return -1;
  }

  function readEditorMode() {
    var selectors = getSelectors();
    if (selectors && typeof selectors.getEditorMode === 'function') {
      recordAppBoundaryEvent('selector', 'state.selectors.getEditorMode', { source: 'app-controllers:readEditorMode' });
      return String(selectors.getEditorMode() || '');
    }
    recordAppBoundaryFallback('missing-state-selectors.getEditorMode', { source: 'app-controllers:readEditorMode' });
    return '';
  }

  function requestModeChange(mode, extra) {
    var source = extra && extra.source ? String(extra.source) : 'p8s2:controller-mode-change';
    var actions = getStateActions();
    if (actions && typeof actions.requestModeChange === 'function') {
      var result = actions.requestModeChange(mode, extra || { source: source });
      recordAppBoundaryEvent('state-action', 'state.actions.requestModeChange', { source: source, mode: String(mode || ''), result: !!result });
      recordPlacementRoute('requestModeChange', 'state-actions.requestModeChange', { source: source, mode: String(mode || ''), result: !!result });
      return result;
    }
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.setEditorModeValue === 'function') {
      runtimeApi.setEditorModeValue(mode, { source: source });
      recordAppBoundaryEvent('runtime-state', 'state.runtimeState.setEditorModeValue', { source: source, mode: String(mode || '') });
      recordPlacementRoute('requestModeChange', 'state.runtimeState.setEditorModeValue', { source: source, mode: String(mode || ''), result: true });
      return true;
    }
    recordAppBoundaryFallback('missing-mode-route', { source: source, mode: String(mode || '') });
    recordPlacementRoute('requestModeChange', 'legacy.missing-mode-route', { source: source, mode: String(mode || '') });
    return false;
  }

  function selectPrefabByIndex(nextIndex, source) {
    var requestSource = String(source || 'p8s2:select-prefab-index');
    var actions = getStateActions();
    if (actions && typeof actions.selectPrefabByIndex === 'function') {
      var result = actions.selectPrefabByIndex(nextIndex, { source: requestSource });
      recordAppBoundaryEvent('state-action', 'state.actions.selectPrefabByIndex', { source: requestSource, index: Number(nextIndex) || 0, result: result });
      recordPlacementRoute('selectPrefabByIndex', 'state-actions.selectPrefabByIndex', { source: requestSource, index: Number(nextIndex) || 0, result: result });
      return result;
    }
    var registryApi = getPrefabRegistry();
    if (registryApi && typeof registryApi.setSelectedPrototypeIndex === 'function') {
      var registryResult = registryApi.setSelectedPrototypeIndex(nextIndex, { source: requestSource });
      recordAppBoundaryEvent('prefab-registry', 'state.prefabRegistry.setSelectedPrototypeIndex', { source: requestSource, index: Number(nextIndex) || 0, result: registryResult });
      recordPlacementRoute('selectPrefabByIndex', 'state.prefabRegistry.setSelectedPrototypeIndex', { source: requestSource, index: Number(nextIndex) || 0, result: registryResult });
      return registryResult;
    }
    recordAppBoundaryFallback('missing-prefab-route.index', { source: requestSource, index: Number(nextIndex) || 0 });
    recordPlacementRoute('selectPrefabByIndex', 'legacy.missing-prefab-route', { source: requestSource, index: Number(nextIndex) || 0 });
    return -1;
  }

  function selectPrefabById(prefabId, source) {
    var requestSource = String(source || 'p8s2:select-prefab-id');
    var actions = getStateActions();
    if (actions && typeof actions.selectPrefabById === 'function') {
      var result = actions.selectPrefabById(prefabId, { source: requestSource });
      recordAppBoundaryEvent('state-action', 'state.actions.selectPrefabById', { source: requestSource, prefabId: String(prefabId || ''), result: result });
      recordPlacementRoute('selectPrefabById', 'state-actions.selectPrefabById', { source: requestSource, prefabId: String(prefabId || ''), result: result });
      return result;
    }
    var registryApi = getPrefabRegistry();
    if (registryApi && typeof registryApi.setSelectedPrefabId === 'function') {
      var registryResult = registryApi.setSelectedPrefabId(prefabId, { source: requestSource });
      recordAppBoundaryEvent('prefab-registry', 'state.prefabRegistry.setSelectedPrefabId', { source: requestSource, prefabId: String(prefabId || ''), result: registryResult });
      recordPlacementRoute('selectPrefabById', 'state.prefabRegistry.setSelectedPrefabId', { source: requestSource, prefabId: String(prefabId || ''), result: registryResult });
      return registryResult;
    }
    recordAppBoundaryFallback('missing-prefab-route.id', { source: requestSource, prefabId: String(prefabId || '') });
    recordPlacementRoute('selectPrefabById', 'legacy.missing-prefab-id-route', { source: requestSource, prefabId: String(prefabId || '') });
    return -1;
  }

  function handleModeButton(mode, source) {
    return requestModeChange(mode, { source: String(source || 'p8s2:mode-button') });
  }


  function normalizeFacingValue(value) {
    return ((parseInt(value || 0, 10) % 4) + 4) % 4;
  }

  function normalizeRotationTurnsValue(value) {
    var num = Number(value);
    if (!Number.isFinite(num)) return 0;
    num = num % 4;
    if (num < 0) num += 4;
    return num;
  }

  function shortestRotationDelta(fromRotation, toRotation) {
    var from = normalizeRotationTurnsValue(fromRotation);
    var to = normalizeRotationTurnsValue(toRotation);
    var diff = to - from;
    if (diff > 2) diff -= 4;
    if (diff < -2) diff += 4;
    return diff;
  }

  function easeInOutCubic(t) {
    t = Math.max(0, Math.min(1, Number(t) || 0));
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function readMainEditorVisualRotationValue() {
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && runtimeApi.editor) {
      if (runtimeApi.editor.isViewRotating && Number.isFinite(Number(runtimeApi.editor.visualRotation))) return normalizeRotationTurnsValue(runtimeApi.editor.visualRotation);
      if (Number.isFinite(Number(runtimeApi.editor.visualRotation))) return normalizeRotationTurnsValue(runtimeApi.editor.visualRotation);
    }
    return readEditorRotationValue();
  }

  function readMainEditorAnimationState() {
    var runtimeApi = getRuntimeStateApi();
    var editorState = runtimeApi && runtimeApi.editor ? runtimeApi.editor : null;
    return {
      fromViewRotation: normalizeFacingValue(editorState && editorState.fromViewRotation != null ? editorState.fromViewRotation : readEditorRotationValue()),
      toViewRotation: normalizeFacingValue(editorState && editorState.toViewRotation != null ? editorState.toViewRotation : readEditorRotationValue()),
      rotationAnimProgress: Math.max(0, Math.min(1, Number(editorState && editorState.rotationAnimProgress != null ? editorState.rotationAnimProgress : 1) || 0)),
      isViewRotating: !!(editorState && editorState.isViewRotating),
      rotationAnimStartTime: Math.max(0, Number(editorState && editorState.rotationAnimStartTime) || 0),
      rotationAnimDurationMs: Math.max(0, Number(editorState && editorState.rotationAnimDurationMs != null ? editorState.rotationAnimDurationMs : 160) || 0),
      rotationAnimNonce: Math.max(0, Math.round(Number(editorState && editorState.rotationAnimNonce) || 0)),
      rotationAnimationEnabled: !(editorState && editorState.rotationAnimationEnabled === false),
      rotationInterpolationEnabled: !(editorState && editorState.rotationInterpolationEnabled === false),
      rotationInterpolationMode: String(editorState && editorState.rotationInterpolationMode || 'easeInOut'),
      visualRotation: normalizeRotationTurnsValue(editorState && editorState.visualRotation != null ? editorState.visualRotation : readEditorRotationValue())
    };
  }

  function patchMainEditorAnimationState(patch, source) {
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorViewRotationAnimation === 'function') {
      runtimeApi.patchEditorViewRotationAnimation(patch || {}, { source: String(source || 'main-view-rotation:animation-patch') });
      return true;
    }
    if (runtimeApi && runtimeApi.editor) {
      var target = runtimeApi.editor;
      Object.keys(patch || {}).forEach(function (key) { target[key] = patch[key]; });
      return true;
    }
    return false;
  }

  function applyMainEditorRotationEasing(progress, animState) {
    var t = Math.max(0, Math.min(1, Number(progress) || 0));
    var state = animState || readMainEditorAnimationState();
    if (state && state.rotationInterpolationEnabled === false) return t;
    var mode = String(state && state.rotationInterpolationMode || 'easeInOut');
    if (mode === 'linear') return t;
    return easeInOutCubic(t);
  }

  function logMainEditorRotationInterpolationConfig(state, source) {
    var animState = state || readMainEditorAnimationState();
    recordItemRotationDiagnostic('main-view-rotation-interpolation-config', {
      source: String(source || 'main-view-rotation:interpolation-config'),
      rotationAnimationEnabled: !!animState.rotationAnimationEnabled,
      rotationAnimationMs: Math.max(0, Number(animState.rotationAnimDurationMs) || 0),
      rotationInterpolationEnabled: !!animState.rotationInterpolationEnabled,
      rotationInterpolationMode: String(animState.rotationInterpolationMode || 'easeInOut')
    });
  }

  function getMainEditorVisualRotation(source) {
    var requestSource = String(source || 'main-view-rotation:get-visual');
    var value = readMainEditorVisualRotationValue();
    recordAppBoundaryEvent('runtime-state', 'state.runtimeState.editor.visualRotation.read', {
      source: requestSource,
      visualRotation: value,
      isViewRotating: readMainEditorAnimationState().isViewRotating
    });
    return value;
  }

  function isMainEditorViewRotating(source) {
    var requestSource = String(source || 'main-view-rotation:is-animating');
    var state = readMainEditorAnimationState();
    recordAppBoundaryEvent('runtime-state', 'state.runtimeState.editor.isViewRotating.read', {
      source: requestSource,
      isViewRotating: state.isViewRotating,
      rotationAnimNonce: state.rotationAnimNonce
    });
    return state.isViewRotating;
  }

  function readPreviewFacingValue() {
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && runtimeApi.editor && typeof runtimeApi.editor.previewFacing === 'number') return normalizeFacingValue(runtimeApi.editor.previewFacing);
    if (typeof editor !== 'undefined' && editor && typeof editor.previewFacing === 'number') return normalizeFacingValue(editor.previewFacing);
    return 0;
  }

  function getPreviewFacing(source) {
    var requestSource = String(source || 'item-facing:get-preview-facing');
    var value = readPreviewFacingValue();
    recordPlacementRoute('getPreviewFacing', 'placement.application.previewFacing.read', {
      source: requestSource,
      previewFacing: value,
      note: 'application-read-entrypoint'
    });
    return value;
  }

  function readEditorRotationValue() {
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && runtimeApi.editor && typeof runtimeApi.editor.rotation === 'number') return normalizeFacingValue(runtimeApi.editor.rotation);
    return 0;
  }

  function getMainEditorViewRotation(source) {
    var requestSource = String(source || 'main-view-rotation:get');
    var value = readEditorRotationValue();
    recordAppBoundaryEvent('runtime-state', 'state.runtimeState.editor.rotation.read', {
      source: requestSource,
      viewRotation: value
    });
    return value;
  }
  function getMainEditorCameraSettings(source) {
    var requestSource = String(source || 'main-camera:get-settings');
    var animState = readMainEditorAnimationState();
    var runtimeApi = getRuntimeStateApi();
    var cameraSettings = runtimeApi && typeof runtimeApi.getEditorCameraSettingsValue === 'function'
      ? runtimeApi.getEditorCameraSettingsValue()
      : {
          zoom: 1,
          minZoom: 0.5,
          maxZoom: 2,
          cameraCullingEnabled: true,
          cullingMargin: 2,
          showCameraBounds: false,
          showCullingBounds: false
        };
    var settings = {
      viewRotation: readEditorRotationValue(),
      visualRotation: readMainEditorVisualRotationValue(),
      isViewRotating: !!animState.isViewRotating,
      rotationAnimationEnabled: animState.rotationAnimationEnabled !== false,
      rotationAnimationMs: Math.max(0, Number(animState.rotationAnimDurationMs) || 0),
      rotationInterpolationEnabled: animState.rotationInterpolationEnabled !== false,
      rotationInterpolationMode: String(animState.rotationInterpolationMode || 'easeInOut'),
      zoom: Math.max(0.05, Number(cameraSettings.zoom) || 1),
      minZoom: Math.max(0.05, Number(cameraSettings.minZoom) || 0.5),
      maxZoom: Math.max(Math.max(0.05, Number(cameraSettings.minZoom) || 0.5), Number(cameraSettings.maxZoom) || 2),
      cameraCullingEnabled: cameraSettings.cameraCullingEnabled !== false,
      cullingMargin: Math.max(0, Number(cameraSettings.cullingMargin) || 0),
      showCameraBounds: !!cameraSettings.showCameraBounds,
      showCullingBounds: !!cameraSettings.showCullingBounds,
      surfaceOnlyRenderingEnabled: cameraSettings.surfaceOnlyRenderingEnabled !== false,
      debugVisibleSurfaces: !!cameraSettings.debugVisibleSurfaces
    };
    recordAppBoundaryEvent('runtime-state', 'state.runtimeState.editor.cameraSettings.read', {
      source: requestSource,
      settings: settings
    });
    return settings;
  }

  function logMainCameraSettingsChange(source) {
    var settings = getMainEditorCameraSettings(source || 'main-camera:settings-change');
    recordItemRotationDiagnostic('main-camera-settings-change', {
      rotationAnimationEnabled: !!settings.rotationAnimationEnabled,
      rotationAnimationMs: Math.max(0, Number(settings.rotationAnimationMs) || 0),
      rotationInterpolationEnabled: !!settings.rotationInterpolationEnabled,
      rotationInterpolationMode: String(settings.rotationInterpolationMode || 'easeInOut'),
      source: 'camera-panel'
    });
    return settings;
  }

  function logMainCameraZoomChange(source) {
    var settings = getMainEditorCameraSettings(source || 'main-camera:zoom-change');
    recordItemRotationDiagnostic('main-camera-zoom-change', {
      zoom: Number(settings.zoom || 1),
      minZoom: Number(settings.minZoom || 0.5),
      maxZoom: Number(settings.maxZoom || 2),
      source: 'camera-panel'
    });
    return settings;
  }

  function logMainCameraCullingSettingsChange(source) {
    var settings = getMainEditorCameraSettings(source || 'main-camera:culling-settings-change');
    recordItemRotationDiagnostic('main-camera-culling-settings-change', {
      cameraCullingEnabled: settings.cameraCullingEnabled !== false,
      cullingMargin: Math.max(0, Number(settings.cullingMargin) || 0),
      surfaceOnlyRenderingEnabled: settings.surfaceOnlyRenderingEnabled !== false,
      debugVisibleSurfaces: !!settings.debugVisibleSurfaces,
      source: 'camera-panel'
    });
    return settings;
  }

  function markMainCameraRenderLayersDirty(reason) {
    if (typeof markFloorLayerDirty === 'function') { try { markFloorLayerDirty(reason || 'main-camera-settings-change'); } catch (_) {} }
    if (typeof markStaticShadowLayerDirty === 'function') { try { markStaticShadowLayerDirty(reason || 'main-camera-settings-change'); } catch (_) {} }
    if (typeof markStaticBoxLayerDirty === 'function') { try { markStaticBoxLayerDirty(reason || 'main-camera-settings-change', true); } catch (_) {} }
  }

  function setMainEditorZoom(zoom, source) {
    var requestSource = String(source || 'main-camera:set-zoom');
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorCameraSettings === 'function') {
      runtimeApi.patchEditorCameraSettings({ zoom: zoom }, { source: requestSource });
    }
    var skipLayerDirtyForReuse = requestSource.indexOf('wheel-zoom-reuse') >= 0 || requestSource.indexOf('pinch-zoom-reuse') >= 0;
    if (!skipLayerDirtyForReuse) markMainCameraRenderLayersDirty('main-camera-zoom');
    logMainCameraZoomChange(requestSource);
    return getMainEditorCameraSettings(requestSource);
  }

  function setMainEditorZoomBounds(minZoom, maxZoom, source) {
    var requestSource = String(source || 'main-camera:set-zoom-bounds');
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorCameraSettings === 'function') {
      runtimeApi.patchEditorCameraSettings({ minZoom: minZoom, maxZoom: maxZoom }, { source: requestSource });
    }
    markMainCameraRenderLayersDirty('main-camera-zoom-bounds');
    logMainCameraZoomChange(requestSource);
    return getMainEditorCameraSettings(requestSource);
  }

  function setMainEditorCameraCullingEnabled(enabled, source) {
    var requestSource = String(source || 'main-camera:set-culling-enabled');
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorCameraSettings === 'function') {
      runtimeApi.patchEditorCameraSettings({ cameraCullingEnabled: enabled !== false }, { source: requestSource });
    }
    markMainCameraRenderLayersDirty('main-camera-culling-enabled');
    logMainCameraCullingSettingsChange(requestSource);
    return getMainEditorCameraSettings(requestSource);
  }

  function setMainEditorCullingMargin(margin, source) {
    var requestSource = String(source || 'main-camera:set-culling-margin');
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorCameraSettings === 'function') {
      runtimeApi.patchEditorCameraSettings({ cullingMargin: margin }, { source: requestSource });
    }
    markMainCameraRenderLayersDirty('main-camera-culling-margin');
    logMainCameraCullingSettingsChange(requestSource);
    return getMainEditorCameraSettings(requestSource);
  }

  function setMainEditorShowCameraBounds(enabled, source) {
    var requestSource = String(source || 'main-camera:set-show-camera-bounds');
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorCameraSettings === 'function') {
      runtimeApi.patchEditorCameraSettings({ showCameraBounds: !!enabled }, { source: requestSource });
    }
    return getMainEditorCameraSettings(requestSource);
  }

  function setMainEditorShowCullingBounds(enabled, source) {
    var requestSource = String(source || 'main-camera:set-show-culling-bounds');
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorCameraSettings === 'function') {
      runtimeApi.patchEditorCameraSettings({ showCullingBounds: !!enabled }, { source: requestSource });
    }
    return getMainEditorCameraSettings(requestSource);
  }

  function setMainEditorSurfaceOnlyRenderingEnabled(enabled, source) {
    var requestSource = String(source || 'main-camera:set-surface-only-enabled');
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorCameraSettings === 'function') {
      runtimeApi.patchEditorCameraSettings({ surfaceOnlyRenderingEnabled: enabled !== false }, { source: requestSource });
    }
    markMainCameraRenderLayersDirty('main-camera-surface-only-enabled');
    logMainCameraCullingSettingsChange(requestSource);
    return getMainEditorCameraSettings(requestSource);
  }

  function setMainEditorDebugVisibleSurfaces(enabled, source) {
    var requestSource = String(source || 'main-camera:set-debug-visible-surfaces');
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorCameraSettings === 'function') {
      runtimeApi.patchEditorCameraSettings({ debugVisibleSurfaces: !!enabled }, { source: requestSource });
    }
    return getMainEditorCameraSettings(requestSource);
  }

  function resetMainEditorViewRotation(source) {
    return setMainEditorViewRotation(0, String(source || 'camera-panel:reset-view'));
  }




  function setMainEditorRotationAnimationEnabled(enabled, source) {
    var requestSource = String(source || 'main-view-rotation:set-animation-enabled');
    var nextEnabled = enabled !== false;
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorViewRotationAnimation === 'function') {
      runtimeApi.patchEditorViewRotationAnimation({ rotationAnimationEnabled: nextEnabled }, { source: requestSource });
    } else {
      patchMainEditorAnimationState({ rotationAnimationEnabled: nextEnabled }, requestSource);
    }
    var animState = readMainEditorAnimationState();
    logMainEditorRotationInterpolationConfig(animState, requestSource);
    logMainCameraSettingsChange(requestSource);
    return { ok: true, rotationAnimationEnabled: !!animState.rotationAnimationEnabled };
  }

  function setMainEditorRotationAnimationMs(ms, source) {
    var requestSource = String(source || 'main-view-rotation:set-animation-ms');
    var nextMs = Math.max(0, Math.round(Number(ms) || 0));
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorViewRotationAnimation === 'function') {
      runtimeApi.patchEditorViewRotationAnimation({ rotationAnimDurationMs: nextMs }, { source: requestSource });
    } else {
      patchMainEditorAnimationState({ rotationAnimDurationMs: nextMs }, requestSource);
    }
    var animState = readMainEditorAnimationState();
    logMainEditorRotationInterpolationConfig(animState, requestSource);
    logMainCameraSettingsChange(requestSource);
    return { ok: true, rotationAnimationMs: Math.max(0, Number(animState.rotationAnimDurationMs) || 0) };
  }

  function setMainEditorRotationInterpolationEnabled(enabled, source) {
    var requestSource = String(source || 'main-view-rotation:set-interpolation-enabled');
    var nextEnabled = enabled !== false;
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorViewRotationAnimation === 'function') {
      runtimeApi.patchEditorViewRotationAnimation({ rotationInterpolationEnabled: nextEnabled }, { source: requestSource });
    } else {
      patchMainEditorAnimationState({ rotationInterpolationEnabled: nextEnabled }, requestSource);
    }
    var animState = readMainEditorAnimationState();
    logMainEditorRotationInterpolationConfig(animState, requestSource);
    logMainCameraSettingsChange(requestSource);
    return { ok: true, rotationInterpolationEnabled: !!animState.rotationInterpolationEnabled };
  }

  function setMainEditorRotationInterpolationMode(mode, source) {
    var requestSource = String(source || 'main-view-rotation:set-interpolation-mode');
    var nextMode = String(mode || 'easeInOut');
    if (nextMode !== 'linear' && nextMode !== 'easeInOut') nextMode = 'easeInOut';
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchEditorViewRotationAnimation === 'function') {
      runtimeApi.patchEditorViewRotationAnimation({ rotationInterpolationMode: nextMode }, { source: requestSource });
    } else {
      patchMainEditorAnimationState({ rotationInterpolationMode: nextMode }, requestSource);
    }
    var animState = readMainEditorAnimationState();
    logMainEditorRotationInterpolationConfig(animState, requestSource);
    logMainCameraSettingsChange(requestSource);
    return { ok: true, rotationInterpolationMode: String(animState.rotationInterpolationMode || 'easeInOut') };
  }

  function completeMainEditorViewRotationAnimation(expectedNonce, source) {
    var requestSource = String(source || 'main-view-rotation:complete-animation');
    var animState = readMainEditorAnimationState();
    var runtimeApi = getRuntimeStateApi();
    var beforeDiscreteViewRotation = readEditorRotationValue();
    if (expectedNonce != null && Number(expectedNonce) !== Number(animState.rotationAnimNonce)) {
      return { ok: false, reason: 'nonce-mismatch', expectedNonce: expectedNonce, actualNonce: animState.rotationAnimNonce };
    }
    var finalTarget = normalizeFacingValue(animState.toViewRotation);
    var commitSucceeded = false;
    if (runtimeApi && typeof runtimeApi.setEditorRotationValue === 'function') {
      runtimeApi.setEditorRotationValue(finalTarget, { source: requestSource });
      commitSucceeded = normalizeFacingValue(readEditorRotationValue()) === finalTarget;
    }
    patchMainEditorAnimationState({
      fromViewRotation: finalTarget,
      toViewRotation: finalTarget,
      rotationAnimProgress: 1,
      isViewRotating: false,
      rotationAnimStartTime: 0,
      rotationAnimDurationMs: animState.rotationAnimDurationMs,
      rotationAnimNonce: animState.rotationAnimNonce,
      rotationAnimationEnabled: animState.rotationAnimationEnabled,
      visualRotation: finalTarget
    }, requestSource);
    if (typeof markFloorLayerDirty === 'function') { try { markFloorLayerDirty('main-view-rotation-animation-complete'); } catch (_) {} }
    if (typeof markStaticShadowLayerDirty === 'function') { try { markStaticShadowLayerDirty('main-view-rotation-animation-complete'); } catch (_) {} }
    if (typeof markStaticBoxLayerDirty === 'function') { try { markStaticBoxLayerDirty('main-view-rotation-animation-complete', true); } catch (_) {} }
    if (typeof updatePreview === 'function') { try { updatePreview(); } catch (_) {} }
    if (typeof refreshInspectorPanels === 'function') { try { refreshInspectorPanels(); } catch (_) {} }
    recordItemRotationDiagnostic('main-view-rotation-animation-commit', {
      beforeDiscreteViewRotation: beforeDiscreteViewRotation,
      finalCommittedViewRotation: readEditorRotationValue(),
      expectedTargetViewRotation: finalTarget,
      commitSucceeded: commitSucceeded
    });
    recordItemRotationDiagnostic('main-view-rotation-animation-complete', {
      finalCommittedViewRotation: finalTarget,
      finalVisualRotation: finalTarget,
      matchesDiscreteTarget: normalizeFacingValue(finalTarget) === normalizeFacingValue(animState.toViewRotation),
      isViewRotating: false
    });
    return { ok: commitSucceeded, finalCommittedViewRotation: finalTarget, commitSucceeded: commitSucceeded };
  }

  function tickMainEditorViewRotationAnimation(now, source) {
    var requestSource = String(source || 'main-view-rotation:tick');
    var animState = readMainEditorAnimationState();
    if (!animState.isViewRotating) return { active: false, visualRotation: readMainEditorVisualRotationValue() };
    var elapsed = Math.max(0, Number(now) - Number(animState.rotationAnimStartTime || 0));
    var duration = Math.max(0, Number(animState.rotationAnimDurationMs) || 0);
    var progress = duration <= 0 ? 1 : Math.max(0, Math.min(1, elapsed / duration));
    var eased = applyMainEditorRotationEasing(progress, animState);
    var delta = shortestRotationDelta(animState.fromViewRotation, animState.toViewRotation);
    var visualRotation = normalizeRotationTurnsValue(animState.fromViewRotation + delta * eased);
    patchMainEditorAnimationState({
      rotationAnimProgress: progress,
      visualRotation: visualRotation,
      isViewRotating: true,
      rotationAnimNonce: animState.rotationAnimNonce
    }, requestSource);
    recordItemRotationDiagnostic('main-view-rotation-animation-tick', {
      fromViewRotation: animState.fromViewRotation,
      toViewRotation: animState.toViewRotation,
      rotationAnimProgress: progress,
      visualRotation: visualRotation,
      isViewRotating: progress < 1
    });
    if (typeof markFloorLayerDirty === 'function') { try { markFloorLayerDirty('main-view-rotation-animation-tick'); } catch (_) {} }
    if (typeof markStaticShadowLayerDirty === 'function') { try { markStaticShadowLayerDirty('main-view-rotation-animation-tick'); } catch (_) {} }
    if (typeof markStaticBoxLayerDirty === 'function') { try { markStaticBoxLayerDirty('main-view-rotation-animation-tick', true); } catch (_) {} }
    if (progress >= 1) return completeMainEditorViewRotationAnimation(animState.rotationAnimNonce, requestSource + ':complete');
    return { active: true, visualRotation: visualRotation, progress: progress, easedProgress: eased, rotationAnimNonce: animState.rotationAnimNonce };
  }

  function setMainEditorViewRotation(nextRotation, source) {
    var requestSource = String(source || 'main-view-rotation:set');
    var runtimeApi = getRuntimeStateApi();
    var previousRotation = readEditorRotationValue();
    var normalizedNext = normalizeFacingValue(nextRotation);
    var animState = readMainEditorAnimationState();
    if (animState.isViewRotating) {
      return { ok: false, ignored: true, reason: 'ignore-while-animating', previousViewRotation: previousRotation, nextViewRotation: normalizedNext };
    }
    var animationEnabled = animState.rotationAnimationEnabled !== false;
    var durationMs = Math.max(0, Number(animState.rotationAnimDurationMs || 160) || 160);
    recordItemRotationDiagnostic('main-view-rotation-animation-next-start-check', {
      previousCommittedViewRotation: previousRotation,
      nextFromViewRotation: previousRotation,
      nextToViewRotation: normalizedNext,
      fromMatchesCommitted: normalizeFacingValue(previousRotation) === normalizeFacingValue(readEditorRotationValue())
    });
    if (normalizedNext === previousRotation) {
      return { ok: true, previousViewRotation: previousRotation, nextViewRotation: normalizedNext, changed: false };
    }
    if (!animationEnabled || durationMs <= 0) {
      var runtimeWriteUsed = false;
      if (runtimeApi && typeof runtimeApi.setEditorRotationValue === 'function') {
        runtimeApi.setEditorRotationValue(normalizedNext, { source: requestSource });
        runtimeWriteUsed = true;
      }
      patchMainEditorAnimationState({
        fromViewRotation: normalizedNext,
        toViewRotation: normalizedNext,
        rotationAnimProgress: 1,
        isViewRotating: false,
        rotationAnimStartTime: 0,
        rotationAnimDurationMs: durationMs,
        rotationAnimNonce: animState.rotationAnimNonce,
        rotationAnimationEnabled: animationEnabled,
        visualRotation: normalizedNext
      }, requestSource);
      if (typeof markFloorLayerDirty === 'function') { try { markFloorLayerDirty('main-view-rotation'); } catch (_) {} }
      if (typeof markStaticShadowLayerDirty === 'function') { try { markStaticShadowLayerDirty('main-view-rotation'); } catch (_) {} }
      if (typeof markStaticBoxLayerDirty === 'function') { try { markStaticBoxLayerDirty('main-view-rotation', true); } catch (_) {} }
      recordItemRotationDiagnostic('main-view-rotation-animation-complete', {
        finalCommittedViewRotation: normalizedNext,
        finalVisualRotation: normalizedNext,
        matchesDiscreteTarget: true,
        isViewRotating: false
      });
      return { ok: runtimeWriteUsed, previousViewRotation: previousRotation, nextViewRotation: normalizedNext, animated: false };
    }
    var nonce = animState.rotationAnimNonce + 1;
    patchMainEditorAnimationState({
      fromViewRotation: previousRotation,
      toViewRotation: normalizedNext,
      rotationAnimProgress: 0,
      isViewRotating: true,
      rotationAnimStartTime: (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()),
      rotationAnimDurationMs: durationMs,
      rotationAnimNonce: nonce,
      rotationAnimationEnabled: animationEnabled,
      visualRotation: previousRotation
    }, requestSource);
    if (typeof markFloorLayerDirty === 'function') { try { markFloorLayerDirty('main-view-rotation-animation-start'); } catch (_) {} }
    if (typeof markStaticShadowLayerDirty === 'function') { try { markStaticShadowLayerDirty('main-view-rotation-animation-start'); } catch (_) {} }
    if (typeof markStaticBoxLayerDirty === 'function') { try { markStaticBoxLayerDirty('main-view-rotation-animation-start', true); } catch (_) {} }
    logMainEditorRotationInterpolationConfig(readMainEditorAnimationState(), requestSource + ':config');
    recordItemRotationDiagnostic('main-view-rotation-animation-start', {
      fromViewRotation: previousRotation,
      toViewRotation: normalizedNext,
      currentDiscreteViewRotation: previousRotation,
      durationMs: durationMs,
      easingName: (animState.rotationInterpolationEnabled === false ? 'linear' : (String(animState.rotationInterpolationMode || 'easeInOut') === 'linear' ? 'linear' : 'easeInOutCubic')),
      rotationAnimNonce: nonce
    });
    return { ok: true, previousViewRotation: previousRotation, nextViewRotation: normalizedNext, animated: true, rotationAnimNonce: nonce };
  }

  function rotateMainEditorView(delta, source) {
    var requestSource = String(source || 'main-view-rotation:rotate');
    var api = getViewRotationCoreApi();
    var current = readEditorRotationValue();
    var animState = readMainEditorAnimationState();
    if (animState.isViewRotating) return { ok: false, ignored: true, reason: 'ignore-while-animating' };
    var next = api && typeof api.rotateViewRotation === 'function'
      ? api.rotateViewRotation(current, delta)
      : normalizeFacingValue(current + (parseInt(delta || 0, 10) || 0));
    return setMainEditorViewRotation(next, requestSource);
  }

  function getSelectedPrefabIdForPreviewFacing(source) {
    try {
      var selectors = appPath('state.selectors');
      if (selectors && typeof selectors.getSelectedPrefabId === 'function') return selectors.getSelectedPrefabId() || null;
    } catch (_) {}
    try {
      if (typeof currentPrefab === 'function' && currentPrefab()) return currentPrefab().id || null;
    } catch (_) {}
    return null;
  }

  function getCurrentPreviewVariantPayload(prefabId, facing) {
    var facingApi = appPath('domain.itemFacingCore') || (typeof window !== 'undefined' ? window.__ITEM_FACING_CORE__ : null);
    var registryApi = getPrefabRegistry() || appPath('state.prefabRegistry');
    var basePrefab = null;
    if (registryApi && typeof registryApi.getPrefabById === 'function') basePrefab = registryApi.getPrefabById(prefabId);
    if (!basePrefab && typeof getPrefabById === 'function') { try { basePrefab = getPrefabById(prefabId); } catch (_) {} }
    if (!basePrefab) return null;
    var proto = facingApi && typeof facingApi.buildFacingPrototype === 'function' ? facingApi.buildFacingPrototype(basePrefab, facing, null) : null;
    return proto ? {
      prefabId: basePrefab.id || prefabId || null,
      previewFacing: normalizeFacingValue(facing),
      footprint: proto.footprint || null,
      anchor: proto.rotatedAnchor || null,
      sortBase: proto.sortBase || null,
      visibleSemanticFaces: proto.visibleSemanticFaces || [],
      spriteStrategy: proto.spriteStrategy || 'unknown'
    } : null;
  }

  function setPreviewFacing(rotation, source) {
    var requestSource = String(source || 'item-facing:set-preview-facing');
    var nextFacing = normalizeFacingValue(rotation);
    var prevFacing = readPreviewFacingValue();
    var runtimeApi = getRuntimeStateApi();
    var runtimeWriteUsed = false;
    var compatWriteUsed = false;
    if (runtimeApi && typeof runtimeApi.setPreviewFacingValue === 'function') {
      runtimeApi.setPreviewFacingValue(nextFacing, { source: requestSource });
      runtimeWriteUsed = true;
    } else if (typeof editor !== 'undefined' && editor) {
      // Compatibility write kept inside the application controller only.
      // Presentation must not write previewFacing directly.
      editor.previewFacing = nextFacing;
      compatWriteUsed = true;
    }
    var prefabId = getSelectedPrefabIdForPreviewFacing(requestSource);
    var variantPayload = getCurrentPreviewVariantPayload(prefabId, nextFacing);
    var setPayload = {
      source: requestSource,
      previousPreviewFacing: prevFacing,
      nextPreviewFacing: nextFacing,
      previewFacing: nextFacing,
      viewRotation: readEditorRotationValue(),
      selectedInstanceUnchanged: true,
      prefabId: prefabId || null,
      writeOwner: runtimeWriteUsed ? 'core.runtimeState.setPreviewFacingValue' : (compatWriteUsed ? 'application.compat.editor.previewFacing' : 'none'),
      presentationDirectWrite: false
    };
    recordPlacementRoute('setPreviewFacing', 'placement.application.previewFacing', setPayload);
    recordItemRotationDiagnostic('set-preview-facing', setPayload);
    if (variantPayload) {
      var variantLogPayload = Object.assign({ source: requestSource }, variantPayload);
      recordPlacementRoute('preview-variant-build', 'placement.application.previewVariant', variantLogPayload);
      recordItemRotationDiagnostic('preview-variant-build', variantLogPayload);
    }
    syncPlacementUi({ source: requestSource + ':ui', forcePreview: true, requeuePreview: false });
    return { ok: true, previewFacing: nextFacing, rotation: nextFacing, previousPreviewFacing: prevFacing, prefabId: prefabId || null };
  }

  function rotatePreviewFacing(step, source) {
    var requestSource = String(source || 'item-facing:rotate-preview-facing');
    var current = readPreviewFacingValue();
    return setPreviewFacing(current + (parseInt(step || 0, 10) || 0), requestSource);
  }

  function rotatePreviewFacingByWheel(deltaY, source) {
    var requestSource = String(source || 'item-facing:preview-wheel');
    var previous = readPreviewFacingValue();
    var step = Number(deltaY) < 0 ? 1 : -1;
    var next = normalizeFacingValue(previous + step);
    var prefabId = getSelectedPrefabIdForPreviewFacing(requestSource);
    var result = setPreviewFacing(next, requestSource + ':set-preview-facing');
    var wheelPayload = {
      source: requestSource,
      deltaY: Number(deltaY) || 0,
      previousPreviewFacing: previous,
      nextPreviewFacing: next,
      prefabId: prefabId || null,
      selectedInstanceUnchanged: true,
      viewRotation: readEditorRotationValue()
    };
    recordPlacementRoute('preview-wheel-rotate', 'placement.application.previewWheelRotate', wheelPayload);
    recordItemRotationDiagnostic('preview-wheel-rotate', wheelPayload);
    return Object.assign({}, result || {}, { source: requestSource, deltaY: Number(deltaY) || 0, previousPreviewFacing: previous, nextPreviewFacing: next });
  }

  function setSelectedInstanceFacing(rotation, source) {
    var requestSource = String(source || 'item-facing:set-selected-facing');
    var instanceId = (typeof inspectorState !== 'undefined' && inspectorState) ? inspectorState.selectedInstanceId : null;
    if (!instanceId) {
      recordPlacementRoute('setSelectedInstanceFacing', 'placement.application.selectedFacing.missing', { source: requestSource, rotation: normalizeFacingValue(rotation) });
      return { ok: false, reason: 'missing-selected-instance' };
    }
    var core = getPlacementCore();
    if (!core || typeof core.updateInstanceRotation !== 'function') {
      recordPlacementRoute('setSelectedInstanceFacing', 'placement.application.selectedFacing.missing-core', { source: requestSource, rotation: normalizeFacingValue(rotation), instanceId: instanceId });
      return { ok: false, reason: 'missing-placement-core-update-rotation' };
    }
    var updated = core.updateInstanceRotation(instanceId, normalizeFacingValue(rotation), { source: requestSource });
    recordPlacementRoute('setSelectedInstanceFacing', 'placement.application.selectedFacing', { source: requestSource, rotation: normalizeFacingValue(rotation), instanceId: instanceId, ok: !!updated });
    return { ok: !!updated, instanceId: instanceId, rotation: updated ? normalizeFacingValue(updated.rotation) : null };
  }

  function rotateSelectedInstanceFacing(step, source) {
    var requestSource = String(source || 'item-facing:rotate-selected-facing');
    var instanceId = (typeof inspectorState !== 'undefined' && inspectorState) ? inspectorState.selectedInstanceId : null;
    if (!instanceId) {
      recordPlacementRoute('rotateSelectedInstanceFacing', 'placement.application.selectedFacing.missing', { source: requestSource, step: parseInt(step || 0, 10) || 0 });
      return { ok: false, reason: 'missing-selected-instance' };
    }
    var inst = (typeof findInstanceById === 'function') ? findInstanceById(instanceId) : null;
    if (!inst) return { ok: false, reason: 'missing-selected-instance-data' };
    return setSelectedInstanceFacing((inst.rotation || 0) + (parseInt(step || 0, 10) || 0), requestSource);
  }


  function startDragging(box, source) {
    var requestSource = String(source || 'p14:start-dragging');
    var core = getPlacementCore();
    if (core && typeof core.startDragging === 'function') {
      var result = core.startDragging(box);
      recordPlacementRoute('startDragging', 'application.placementCore.startDragging', {
        source: requestSource,
        boxId: box && box.id ? box.id : null,
        result: !!result
      });
      return result;
    }
    recordPlacementRoute('startDragging', 'legacy.missing-placement-core.startDragging', {
      source: requestSource,
      boxId: box && box.id ? box.id : null
    });
    return null;
  }

  function commitPreview(source) {
    var requestSource = String(source || 'p14:commit-preview');
    var core = getPlacementCore();
    if (core && typeof core.commitPreview === 'function') {
      var result = core.commitPreview();
      recordPlacementRoute('commitPreview', 'application.placementCore.commitPreview', {
        source: requestSource,
        mode: readEditorMode() || null,
        result: typeof result === 'undefined' ? 'void' : result
      });
      return result;
    }
    recordPlacementRoute('commitPreview', 'legacy.missing-placement-core.commitPreview', { source: requestSource });
    return null;
  }

  function cancelDrag(source) {
    var requestSource = String(source || 'p14:cancel-drag');
    var core = getPlacementCore();
    if (core && typeof core.cancelDrag === 'function') {
      var result = core.cancelDrag();
      recordPlacementRoute('cancelDrag', 'application.placementCore.cancelDrag', {
        source: requestSource,
        mode: readEditorMode() || null,
        result: typeof result === 'undefined' ? 'void' : result
      });
      return result;
    }
    recordPlacementRoute('cancelDrag', 'legacy.missing-placement-core.cancelDrag', { source: requestSource });
    return null;
  }

  function syncPlacementUi(meta) {
    meta = meta || {};
    var source = String(meta.source || 'p8s2:sync-placement-ui');
    var effects = getPlacementEffects();
    if (effects && typeof effects.syncPlacementUi === 'function') {
      var result = effects.syncPlacementUi({ source: source, forcePreview: !!meta.forcePreview, requeuePreview: !!meta.requeuePreview });
      recordAppBoundaryEvent('service-workflow', 'placement.effects.syncPlacementUi', { source: source, forcePreview: !!meta.forcePreview, requeuePreview: !!meta.requeuePreview });
      recordPlacementRoute('syncPlacementUi', 'placement.effects.syncPlacementUi', { source: source, result: result, forcePreview: !!meta.forcePreview, requeuePreview: !!meta.requeuePreview });
      return result;
    }
    recordAppBoundaryFallback('missing-placement-effects.syncPlacementUi', { source: source, forcePreview: !!meta.forcePreview, requeuePreview: !!meta.requeuePreview });
    recordPlacementRoute('syncPlacementUi', 'legacy.missing-placement-effects.syncPlacementUi', { source: source, forcePreview: !!meta.forcePreview, requeuePreview: !!meta.requeuePreview });
    return { ok: false, source: source, route: 'legacy.missing-placement-effects.syncPlacementUi' };
  }

  function handlePrefabSelectChange(nextIndex, source) {
    var requestSource = String(source || 'p8s2:prefab-select-change');
    var actions = getStateActions();
    if (actions && typeof actions.handlePrefabSelectChange === 'function') {
      var result = actions.handlePrefabSelectChange(nextIndex, { source: requestSource });
      recordAppBoundaryEvent('state-action', 'state.actions.handlePrefabSelectChange', { source: requestSource, index: Number(nextIndex) || 0, result: result });
      recordPlacementRoute('handlePrefabSelectChange', 'state-actions.handlePrefabSelectChange', { source: requestSource, index: Number(nextIndex) || 0, result: result });
      return result;
    }
    var idx = selectPrefabByIndex(nextIndex, requestSource + ':compose-select');
    var mode = readEditorMode();
    if (mode !== 'delete') requestModeChange('place', { source: requestSource + ':compose-place-mode' });
    var legacyResult = { ok: idx >= 0, index: idx, prefabId: getSelectedPrefabId(), route: 'state.compose.prefab-select' };
    recordAppBoundaryEvent('prefab-registry', 'state.compose.prefab-select', { source: requestSource, index: Number(nextIndex) || 0, result: legacyResult });
    recordPlacementRoute('handlePrefabSelectChange', 'state.compose.prefab-select', { source: requestSource, index: Number(nextIndex) || 0, result: legacyResult });
    return legacyResult;
  }

  async function openHabboLibrary(forceRefresh, source) {
    var requestSource = String(source || 'p7b:open-habbo-library');
    var services = getServices();
    var workflow = services.assetWorkflow;
    if (workflow && typeof workflow.ensureHabboLibrarySummary === 'function') {
      recordAppBoundaryEvent('service-workflow', 'services.assetWorkflow.ensureHabboLibrarySummary', { source: requestSource, force: !!forceRefresh });
      return await workflow.ensureHabboLibrarySummary({ force: !!forceRefresh, source: requestSource });
    }
    recordAppBoundaryFallback('missing-asset-workflow.ensureHabboLibrarySummary', { source: requestSource, force: !!forceRefresh });
    return { ok: false, reason: 'missing-habbo-library-api' };
  }

  async function ensureHabboLibraryPageForState(forceRefresh, source) {
    var services = getServices();
    var workflow = services.assetWorkflow;
    var state = getHabboLibraryState();
    if (!state) return { ok: false, reason: 'missing-habbo-library-state' };
    if (workflow && typeof workflow.ensureHabboLibraryPage === 'function') {
      var request = {
        force: !!forceRefresh,
        type: normalizeHabboLibraryType(state.activeType),
        category: normalizeHabboLibraryCategory(state.activeCategory),
        search: String(state.search || ''),
        page: Number(state.page || 1),
        pageSize: Number(state.pageSize || 15),
        source: String(source || 'p7b:habbo-library-page')
      };
      recordAppBoundaryEvent('service-workflow', 'services.assetWorkflow.ensureHabboLibraryPage', request);
      return await workflow.ensureHabboLibraryPage(request);
    }
    recordAppBoundaryFallback('missing-asset-workflow.ensureHabboLibraryPage', { source: String(source || 'p7b:habbo-library-page') });
    return { ok: false, reason: 'missing-habbo-library-page-api' };
  }

  async function handleOpenHabboLibraryBrowser(forceRefresh, source) {
    return await openHabboLibrary(!!forceRefresh, String(source || 'p7b:habbo-open-browser'));
  }

  async function handleRefreshHabboLibrary(source) {
    return await openHabboLibrary(true, String(source || 'p7b:habbo-refresh-browser'));
  }

  async function handleHabboLibraryTypeSwitch(nextType, source) {
    var state = getHabboLibraryState();
    if (!state) return { ok: false, reason: 'missing-habbo-library-state' };
    state.activeType = normalizeHabboLibraryType(nextType);
    state.activeCategory = 'all';
    state.page = 1;
    state.queryKey = '';
    return await openHabboLibrary(false, String(source || 'p7b:habbo-type-switch'));
  }

  async function handleHabboLibraryCategorySelect(nextCategory, source) {
    var state = getHabboLibraryState();
    if (!state) return { ok: false, reason: 'missing-habbo-library-state' };
    state.activeCategory = normalizeHabboLibraryCategory(nextCategory);
    state.page = 1;
    state.queryKey = '';
    if (state.activeCategory !== 'all' || String(state.search || '').trim()) {
      return await ensureHabboLibraryPageForState(true, String(source || 'p7b:habbo-category-select'));
    }
    return { ok: true, browseMode: 'categories', type: state.activeType, category: state.activeCategory };
  }

  async function handleHabboLibrarySearchInput(searchText, source) {
    var state = getHabboLibraryState();
    if (!state) return { ok: false, reason: 'missing-habbo-library-state' };
    state.search = String(searchText || '');
    state.page = 1;
    state.queryKey = '';
    if (String(state.search || '').trim() || normalizeHabboLibraryCategory(state.activeCategory) !== 'all') {
      return await ensureHabboLibraryPageForState(true, String(source || 'p7b:habbo-search-input'));
    }
    return { ok: true, browseMode: 'categories', search: state.search };
  }

  async function handleHabboLibraryPageAction(action, source) {
    var state = getHabboLibraryState();
    if (!state) return { ok: false, reason: 'missing-habbo-library-state' };
    var totalPages = Math.max(1, Number(state.totalPages || 1));
    var currentPage = Math.max(1, Number(state.page || 1));
    state.page = String(action || '') === 'prev' ? Math.max(1, currentPage - 1) : Math.min(totalPages, currentPage + 1);
    state.queryKey = '';
    return await ensureHabboLibraryPageForState(true, String(source || 'p7b:habbo-page-action'));
  }

  async function handlePlaceSelectedHabboItem(source) {
    var selected = null;
    try { selected = (typeof getSelectedHabboLibraryItem === 'function') ? getSelectedHabboLibraryItem() : getHabboSelection(); } catch (_) { selected = null; }
    if (!selected) return { ok: false, reason: 'missing-selected-habbo-item' };
    if (typeof loadHabboLibraryItemToPlacement !== 'function') return { ok: false, reason: 'missing-habbo-placement-loader' };
    var requestSource = String(source || 'p7b:habbo-place-selected');
    var loaded = await loadHabboLibraryItemToPlacement(selected, { source: requestSource });
    recordPlacementRoute('handlePlaceSelectedHabboItem', 'placement.application.habbofile-selection', {
      source: requestSource,
      prefabId: selected.prefabId || null,
      loadedPrefabId: loaded && loaded.prefab ? loaded.prefab.id : null,
      reused: !!(loaded && loaded.reused)
    });
    return { ok: true, prefabId: (loaded && loaded.prefab && loaded.prefab.id) || selected.prefabId || null, source: requestSource };
  }

  async function saveLocalScene(source) {
    return await saveSceneTarget({ target: 'local', source: String(source || 'p7b:scene-save-local') });
  }

  async function loadLocalScene(source) {
    return await loadSceneTarget({ target: 'local', source: String(source || 'p7b:scene-load-local') });
  }

  async function saveSceneFile(filename, source) {
    return await saveSceneTarget({ target: 'server-file', source: String(source || 'p7b:scene-save-file'), filename: filename, setDefault: true });
  }

  async function openDefaultScene(source) {
    return await loadSceneTarget({ target: 'default', source: String(source || 'p7b:scene-open-default') });
  }

  async function importSceneFile(file, source) {
    return await loadSceneTarget({ target: 'import-file', source: String(source || 'p7b:scene-import-file'), file: file, setDefault: true });
  }

  function handleOpenEditorButton(extra) {
    return openEditorFromMain(extra);
  }

  async function handleRescanAssetsButton(source) {
    return await runAssetScan({ force: true, source: String(source || 'p7b:rescan-assets-button') });
  }

  function openEditorFromMain(extra) {
    try {
      var replayCtx = (typeof window !== 'undefined') ? window.__ACCEPTANCE_REPLAY_CONTEXT__ : null;
      var href = replayCtx && replayCtx.active && replayCtx.openEditorHref ? String(replayCtx.openEditorHref) : ('START_V18_ONLY.html?fromMain=1&t=' + Date.now());
      var selectedPrefabId = getSelectedPrefabId();
      var prototypeCount = getPrototypeCount();
      if (typeof emitP1bUi === 'function') {
        emitP1bUi('BOUNDARY', 'open-editor-from-main', {
          href: href,
          selectedPrefabId: selectedPrefabId,
          prototypeCount: prototypeCount,
          via: 'App.controllers.main.openEditorFromMain'
        });
      }
      recordAppBoundaryEvent('selector', 'state.selectors+prefabRegistry.openEditorFromMain', { selectedPrefabId: selectedPrefabId, prototypeCount: prototypeCount });
      window.location.href = href;
      if (typeof pushLog === 'function') pushLog('ui: open editor');
      return true;
    } catch (err) {
      if (typeof pushLog === 'function') pushLog('ui: open editor failed ' + (err && err.message ? err.message : err));
      return false;
    }
  }

  async function processEditorReturn(reason) {
    try {
      var params = new URLSearchParams(String(location.search || ''));
      var fromEditor = params.get('fromEditor') === '1';
      var handoff = readEditorMainHandoff();
      if (!fromEditor && !handoff) return false;
      if (typeof emitP1bMain === 'function') {
        emitP1bMain('SUMMARY', 'return-from-editor-detected', {
          reason: reason || 'startup',
          fromEditorQuery: fromEditor,
          handoffKind: handoff && handoff.kind ? handoff.kind : null,
          prefabId: handoff && handoff.prefabId ? handoff.prefabId : (params.get('prefabId') || null),
          savedAtMs: handoff && handoff.savedAtMs ? handoff.savedAtMs : null,
          via: 'App.controllers.editorHandoff.processEditorReturn'
        });
      }
      await runAssetScan({ force: true, source: 'p7a:editor-return' });
      if (typeof emitP1bMain === 'function') {
        emitP1bMain('SUMMARY', 'prefab-rescan-after-editor', {
          reason: reason || 'startup',
          prototypeCount: getPrototypeCount(),
          prefabId: handoff && handoff.prefabId ? handoff.prefabId : (params.get('prefabId') || null),
          via: 'App.controllers.editorHandoff.processEditorReturn'
        });
      }
      var targetPrefabId = handoff && handoff.prefabId ? handoff.prefabId : (params.get('prefabId') || '');
      if (targetPrefabId) {
        var idx = findPrefabIndexById(targetPrefabId);
        if (idx >= 0) {
          applyPlacementIntent({
            prefabId: targetPrefabId,
            mode: 'place',
            source: 'p7a:return-from-editor',
            forcePreview: true,
            requeuePreview: true,
            syncUi: true
          });
          if (typeof emitP1bMain === 'function') emitP1bMain('SUMMARY', 'prefab-selected-after-editor', { prefabId: targetPrefabId, prototypeIndex: idx, reason: reason || 'startup', via: 'App.controllers.editorHandoff.processEditorReturn' });
        } else {
          if (typeof emitP1bMain === 'function') emitP1bMain('INVARIANT', 'prefab-select-after-editor-miss', { prefabId: targetPrefabId, prototypeCount: getPrototypeCount(), reason: reason || 'startup', via: 'App.controllers.editorHandoff.processEditorReturn' });
        }
      }
      clearEditorMainHandoff();
      return true;
    } catch (err) {
      if (typeof emitP1bMain === 'function') emitP1bMain('INVARIANT', 'return-from-editor-failed', { reason: reason || 'startup', error: err && err.message ? err.message : String(err), via: 'App.controllers.editorHandoff.processEditorReturn' });
      return false;
    }
  }


  function getMainEditorTerrainSettings(source) {
    var requestSource = String(source || 'terrain:get-settings');
    var runtimeApi = getRuntimeStateApi();
    var terrainCore = getTerrainGeneratorCoreApi();
    var settings = null;
    if (runtimeApi && typeof runtimeApi.getTerrainGeneratorSettingsValue === 'function') settings = runtimeApi.getTerrainGeneratorSettingsValue();
    else if (runtimeApi && runtimeApi.terrainGenerator) settings = safeClone(runtimeApi.terrainGenerator);
    if (!settings && terrainCore && terrainCore.defaultSettings) settings = safeClone(terrainCore.defaultSettings);
    settings = settings || {};
    recordAppBoundaryEvent('runtime-state', 'state.runtimeState.terrainGenerator.read', {
      source: requestSource,
      seed: settings.seed,
      width: settings.width,
      height: settings.height,
      activeTerrainBatchId: settings.activeTerrainBatchId || null
    });
    return settings;
  }

  function setMainEditorTerrainSettings(patch, source) {
    var requestSource = String(source || 'terrain:set-settings');
    var runtimeApi = getRuntimeStateApi();
    var terrainCore = getTerrainGeneratorCoreApi();
    var before = getMainEditorTerrainSettings(requestSource + ':before');
    var normalized = terrainCore && typeof terrainCore.normalizeTerrainParams === 'function'
      ? terrainCore.normalizeTerrainParams(Object.assign({}, before, patch || {}))
      : Object.assign({}, before, patch || {});
    if (runtimeApi && typeof runtimeApi.patchTerrainGeneratorSettings === 'function') runtimeApi.patchTerrainGeneratorSettings(normalized, { source: requestSource });
    else if (runtimeApi && runtimeApi.terrainGenerator) Object.assign(runtimeApi.terrainGenerator, normalized);
    var after = getMainEditorTerrainSettings(requestSource);
    var beforeMode = before && before.terrainDebugFaceColorsEnabled === true ? 'debug-semantic' : 'natural';
    var afterMode = after && after.terrainDebugFaceColorsEnabled === true ? 'debug-semantic' : 'natural';
    if (beforeMode !== afterMode) {
      recordTerrainDiagnostic('terrain-face-color-mode-change', {
        terrainDebugFaceColorsEnabled: after && after.terrainDebugFaceColorsEnabled === true,
        terrainColorMode: afterMode,
        source: requestSource
      });
      invalidateMainEditorTerrainRenderCaches(requestSource + ':terrain-face-color-mode-change');
    }
    return after;
  }

  function resetMainEditorTerrainSettings(source) {
    var requestSource = String(source || 'terrain:reset-settings');
    var terrainCore = getTerrainGeneratorCoreApi();
    var defaults = terrainCore && terrainCore.defaultSettings ? safeClone(terrainCore.defaultSettings) : {
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
      terrainDetailedProfilingEnabled: false
    };
    return setMainEditorTerrainSettings(defaults, requestSource);
  }

  function readCurrentSceneInstances() {
    var sceneSessionApi = getSceneSessionApi();
    if (sceneSessionApi && typeof sceneSessionApi.getInstances === 'function') return sceneSessionApi.getInstances().slice();
    return (typeof instances !== 'undefined' && Array.isArray(instances)) ? instances.slice() : [];
  }

  function replaceCurrentSceneInstances(nextInstances, source) {
    var requestSource = String(source || 'terrain:replace-instances');
    var sceneSessionApi = getSceneSessionApi();
    var totalStartAt = controllerPerfNowMs();
    var beforeInstances = sceneSessionApi && typeof sceneSessionApi.getInstances === 'function'
      ? (sceneSessionApi.getInstances() || []).length
      : ((typeof instances !== 'undefined' && Array.isArray(instances)) ? instances.length : 0);
    var beforeBoxes = sceneSessionApi && typeof sceneSessionApi.getBoxes === 'function'
      ? (sceneSessionApi.getBoxes() || []).length
      : ((typeof boxes !== 'undefined' && Array.isArray(boxes)) ? boxes.length : 0);
    var replaceSceneGraphMs = 0;
    var replaceInstancesMs = 0;
    var syncDerivedStateMs = 0;
    var commitPath = 'scene-session.replaceInstances';
    var ok = false;
    if (sceneSessionApi && typeof sceneSessionApi.replaceInstances === 'function') {
      var replaceStartAt = controllerPerfNowMs();
      sceneSessionApi.replaceInstances(nextInstances, { source: requestSource });
      replaceInstancesMs = Math.max(0, controllerPerfNowMs() - replaceStartAt);
      if (typeof sceneSessionApi.syncDerivedState === 'function') {
        var syncStartAt = controllerPerfNowMs();
        try { sceneSessionApi.syncDerivedState({ source: requestSource + ':sync' }); } catch (_) {}
        syncDerivedStateMs = Math.max(0, controllerPerfNowMs() - syncStartAt);
      }
      ok = true;
    }
    if (!ok && typeof instances !== 'undefined' && Array.isArray(instances)) {
      commitPath = 'legacy-global.replaceInstances';
      var legacyReplaceStartAt = controllerPerfNowMs();
      instances = Array.isArray(nextInstances) ? nextInstances.slice() : [];
      if (typeof rebuildBoxesFromInstances === 'function') rebuildBoxesFromInstances({ source: requestSource + ':legacy-rebuild' });
      replaceInstancesMs = Math.max(0, controllerPerfNowMs() - legacyReplaceStartAt);
      ok = true;
    }
    var afterInstances = sceneSessionApi && typeof sceneSessionApi.getInstances === 'function'
      ? (sceneSessionApi.getInstances() || []).length
      : ((typeof instances !== 'undefined' && Array.isArray(instances)) ? instances.length : 0);
    var afterBoxes = sceneSessionApi && typeof sceneSessionApi.getBoxes === 'function'
      ? (sceneSessionApi.getBoxes() || []).length
      : ((typeof boxes !== 'undefined' && Array.isArray(boxes)) ? boxes.length : 0);
    emitSceneCommitProfile({
      reason: requestSource,
      commitPath: commitPath,
      instancesBefore: Number(beforeInstances || 0),
      instancesAfter: Number(afterInstances || 0),
      boxesBefore: Number(beforeBoxes || 0),
      boxesAfter: Number(afterBoxes || 0),
      replaceSceneGraphMs: Number(replaceSceneGraphMs.toFixed(3)),
      replaceInstancesMs: Number(replaceInstancesMs.toFixed(3)),
      syncDerivedStateMs: Number(syncDerivedStateMs.toFixed(3)),
      totalMs: Number(Math.max(0, controllerPerfNowMs() - totalStartAt).toFixed(3))
    });
    return ok;
  }


  function readCurrentSceneBoxes() {
    var sceneSessionApi = getSceneSessionApi();
    if (sceneSessionApi && typeof sceneSessionApi.getBoxes === 'function') return sceneSessionApi.getBoxes().slice();
    return (typeof boxes !== 'undefined' && Array.isArray(boxes)) ? boxes.slice() : [];
  }

  function replaceCurrentSceneGraph(nextInstances, nextBoxes, source) {
    var requestSource = String(source || 'terrain:replace-scene-graph');
    var sceneSessionApi = getSceneSessionApi();
    var sceneGraphApi = getSceneGraphApi();
    var totalStartAt = controllerPerfNowMs();
    var beforeInstances = sceneSessionApi && typeof sceneSessionApi.getInstances === 'function'
      ? (sceneSessionApi.getInstances() || []).length
      : ((typeof instances !== 'undefined' && Array.isArray(instances)) ? instances.length : 0);
    var beforeBoxes = sceneSessionApi && typeof sceneSessionApi.getBoxes === 'function'
      ? (sceneSessionApi.getBoxes() || []).length
      : ((typeof boxes !== 'undefined' && Array.isArray(boxes)) ? boxes.length : 0);
    var replaceSceneGraphMs = 0;
    var replaceInstancesMs = 0;
    var syncDerivedStateMs = 0;
    var commitPath = 'scene-graph.replaceSceneGraph';
    var ok = false;
    if (sceneGraphApi && typeof sceneGraphApi.replaceSceneGraph === 'function' && Array.isArray(nextBoxes)) {
      var replaceSceneStartAt = controllerPerfNowMs();
      sceneGraphApi.replaceSceneGraph({ instances: Array.isArray(nextInstances) ? nextInstances : [], boxes: nextBoxes }, { source: requestSource });
      replaceSceneGraphMs = Math.max(0, controllerPerfNowMs() - replaceSceneStartAt);
      ok = true;
    }
    if (!ok) return replaceCurrentSceneInstances(nextInstances, requestSource + ':fallback-replaceInstances');
    var afterInstances = sceneSessionApi && typeof sceneSessionApi.getInstances === 'function'
      ? (sceneSessionApi.getInstances() || []).length
      : ((typeof instances !== 'undefined' && Array.isArray(instances)) ? instances.length : 0);
    var afterBoxes = sceneSessionApi && typeof sceneSessionApi.getBoxes === 'function'
      ? (sceneSessionApi.getBoxes() || []).length
      : ((typeof boxes !== 'undefined' && Array.isArray(boxes)) ? boxes.length : 0);
    emitSceneCommitProfile({
      reason: requestSource,
      commitPath: commitPath,
      instancesBefore: Number(beforeInstances || 0),
      instancesAfter: Number(afterInstances || 0),
      boxesBefore: Number(beforeBoxes || 0),
      boxesAfter: Number(afterBoxes || 0),
      replaceSceneGraphMs: Number(replaceSceneGraphMs.toFixed(3)),
      replaceInstancesMs: Number(replaceInstancesMs.toFixed(3)),
      syncDerivedStateMs: Number(syncDerivedStateMs.toFixed(3)),
      totalMs: Number(Math.max(0, controllerPerfNowMs() - totalStartAt).toFixed(3))
    });
    return true;
  }

  function buildManualColumnHeightMapFromBoxes(inputBoxes, width, height) {
    var cols = Math.max(0, Math.round(Number(width) || 0));
    var rows = Math.max(0, Math.round(Number(height) || 0));
    var map = Array.from({ length: cols }, function () { return Array(rows).fill(0); });
    var manualBlockCount = 0;
    var occupiedColumnKeys = new Set();
    var list = Array.isArray(inputBoxes) ? inputBoxes : [];
    for (var i = 0; i < list.length; i++) {
      var box = list[i];
      if (!box || box.generatedBy === 'terrain-generator') continue;
      var x = Math.round(Number(box.x) || 0);
      var y = Math.round(Number(box.y) || 0);
      var zTop = Math.max(0, Math.round(Number(box.z || 0) + Number(box.h || 1)));
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      map[x][y] = Math.max(map[x][y], zTop);
      manualBlockCount += 1;
      occupiedColumnKeys.add(String(x) + ',' + String(y));
    }
    return {
      existingHeightMap: map,
      manualBlockCount: manualBlockCount,
      occupiedColumnCount: occupiedColumnKeys.size
    };
  }

  function summarizeTerrainWorldIntegration(heightMap, existingHeightMap) {
    var width = Array.isArray(heightMap) ? heightMap.length : 0;
    var height = width > 0 && Array.isArray(heightMap[0]) ? heightMap[0].length : 0;
    var terrainTargetColumnCount = 0;
    var terrainOwnedDeltaBlockCount = 0;
    var overlappingColumnCount = 0;
    var terrainVisibleTargetHeightMax = 0;
    for (var x = 0; x < width; x++) {
      var targetCol = Array.isArray(heightMap[x]) ? heightMap[x] : [];
      var existingCol = Array.isArray(existingHeightMap[x]) ? existingHeightMap[x] : [];
      for (var y = 0; y < height; y++) {
        var target = Math.max(0, Math.round(Number(targetCol[y]) || 0));
        var existing = Math.max(0, Math.round(Number(existingCol[y]) || 0));
        if (target > 0) terrainTargetColumnCount += 1;
        if (existing > 0 && target > 0) overlappingColumnCount += 1;
        terrainOwnedDeltaBlockCount += Math.max(0, target - existing);
        terrainVisibleTargetHeightMax = Math.max(terrainVisibleTargetHeightMax, Math.max(target, existing));
      }
    }
    return {
      terrainTargetColumnCount: terrainTargetColumnCount,
      terrainOwnedDeltaBlockCount: terrainOwnedDeltaBlockCount,
      overlappingColumnCount: overlappingColumnCount,
      stackedOnExistingBlocks: overlappingColumnCount > 0,
      mergedWithExistingOccupancy: true,
      terrainVisibleTargetHeightMax: terrainVisibleTargetHeightMax
    };
  }

  function isTerrainGeneratedInstance(instance) {
    return !!(instance && instance.generatedBy === 'terrain-generator');
  }

  function allocateTerrainBatchId(source) {
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.allocateTerrainBatchId === 'function') return runtimeApi.allocateTerrainBatchId({ source: String(source || 'terrain:allocate-batch') });
    return 'terrain-' + String(Date.now());
  }

  function applyTerrainBatchState(patch, source) {
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchTerrainGeneratorSettings === 'function') {
      runtimeApi.patchTerrainGeneratorSettings(patch || {}, { source: String(source || 'terrain:batch-state') });
    }
  }


  function getTerrainRuntimeModel() {
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.getTerrainRuntimeModelValue === 'function') return runtimeApi.getTerrainRuntimeModelValue();
    return null;
  }

  function applyTerrainRuntimeModel(patch, source) {
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.patchTerrainRuntimeModel === 'function') {
      runtimeApi.patchTerrainRuntimeModel(patch || {}, { source: String(source || 'terrain:runtime-model') });
    }
  }

  function clearTerrainRuntimeModelState(source) {
    var runtimeApi = getRuntimeStateApi();
    if (runtimeApi && typeof runtimeApi.clearTerrainRuntimeModel === 'function') {
      runtimeApi.clearTerrainRuntimeModel({ source: String(source || 'terrain:runtime-model-clear') });
    } else {
      applyTerrainRuntimeModel({ activeTerrainBatchId: null, width: 0, height: 0, heightMap: [], existingHeightMap: [], materialMap: null, editDiff: {}, params: null, lastSummary: null, terrainUsesColumnModel: false, terrainExpandedVoxelInstanceCount: 0, terrainOwnedDeltaBlockCount: 0, existingManualBlockCount: 0, overlappingColumnCount: 0, mergedWithExistingOccupancy: false, stackedOnExistingBlocks: false }, source || 'terrain:runtime-model-clear');
    }
  }

  function invalidateMainEditorTerrainRenderCaches(reason) {
    var why = String(reason || 'terrain-runtime-change');
    if (typeof markStaticBoxLayerDirty === 'function') { try { markStaticBoxLayerDirty(why, true); } catch (_) {} }
    if (typeof markStaticShadowLayerDirty === 'function') { try { markStaticShadowLayerDirty(why); } catch (_) {} }
    if (typeof markFloorLayerDirty === 'function') { try { markFloorLayerDirty(why); } catch (_) {} }
  }


  function getTerrainBlockBaseColor(targetHeight, terrainSettings) {
    var settings = terrainSettings && typeof terrainSettings === 'object' ? terrainSettings : {};
    var waterLevel = Math.round(Number(settings.waterLevel) || 0);
    var h = Math.max(0, Math.round(Number(targetHeight) || 0));
    if (h <= waterLevel) return '#4f8cff';
    if (h > 10) return '#b39b6b';
    return '#79b35a';
  }

  function isTerrainMaterialDataEnabledForApply() {
    try {
      if (typeof window !== 'undefined' && window.__TERRAIN_MATERIAL_DATA_ENABLED__ === true) return true;
    } catch (_) {}
    return false;
  }

  function buildTerrainMaterialMapForApply(heightMap, terrainSettings) {
    if (!isTerrainMaterialDataEnabledForApply()) return null;
    var materialCore = getTerrainMaterialCoreApi();
    if (materialCore && typeof materialCore.buildTerrainMaterialMap === 'function') {
      try {
        return materialCore.buildTerrainMaterialMap(heightMap, terrainSettings || {});
      } catch (_) {}
    }
    return null;
  }

  function getTerrainMaterialDefinitionForApply(materialId) {
    if (!isTerrainMaterialDataEnabledForApply()) return null;
    var materialCore = getTerrainMaterialCoreApi();
    if (materialCore && typeof materialCore.getTerrainMaterialDefinition === 'function') {
      try { return materialCore.getTerrainMaterialDefinition(materialId); } catch (_) {}
    }
    return null;
  }

  function getTerrainMaterialIdForStep(materialMap, step, fallbackId) {
    var defaultKey = String(fallbackId || '__terrain_default__');
    if (!isTerrainMaterialDataEnabledForApply()) return defaultKey;
    var materialCore = getTerrainMaterialCoreApi();
    var x = Number(step && step.terrainCellX != null ? step.terrainCellX : step && step.x) || 0;
    var y = Number(step && step.terrainCellY != null ? step.terrainCellY : step && step.y) || 0;
    if (materialCore && typeof materialCore.getTerrainMaterialIdAt === 'function') {
      try { return materialCore.getTerrainMaterialIdAt(materialMap, x, y, defaultKey); } catch (_) {}
    }
    return defaultKey;
  }

  function buildTerrainInstanceSemanticMetadata(terrainSettings) {
    var settings = terrainSettings && typeof terrainSettings === 'object' ? terrainSettings : {};
    if (settings.terrainDebugFaceColorsEnabled !== true) return { semanticTextureMap: null, semanticFaceColors: null };
    var facingApi = getItemFacingCoreApi();
    var textureMap = facingApi && typeof facingApi.getDefaultSemanticTextureMap === 'function'
      ? facingApi.getDefaultSemanticTextureMap()
      : null;
    return {
      semanticTextureMap: textureMap || null,
      semanticFaceColors: null
    };
  }

  function buildTerrainPlacementPlan(heightMap, existingHeightMap) {
    var plan = [];
    var cols = Array.isArray(heightMap) ? heightMap.length : 0;
    for (var x = 0; x < cols; x++) {
      var targetCol = Array.isArray(heightMap[x]) ? heightMap[x] : [];
      var existingCol = Array.isArray(existingHeightMap[x]) ? existingHeightMap[x] : [];
      for (var y = 0; y < targetCol.length; y++) {
        var target = Math.max(0, Math.round(Number(targetCol[y]) || 0));
        var existing = Math.max(0, Math.round(Number(existingCol[y]) || 0));
        for (var z = existing; z < target; z++) {
          plan.push({ x: x, y: y, z: z, terrainCellX: x, terrainCellY: y });
        }
      }
    }
    return plan;
  }

  function buildTerrainInstancesFromPlacementPlan(plan, batchId, terrainSettings, heightMap, materialMap) {
    var semanticMeta = buildTerrainInstanceSemanticMetadata(terrainSettings);
    var map = Array.isArray(heightMap) ? heightMap : [];
    var list = Array.isArray(plan) ? plan : [];
    return list.map(function (step) {
      var targetHeight = Array.isArray(map[step.x]) ? Number(map[step.x][step.y] || 0) : 0;
      var terrainMaterialId = getTerrainMaterialIdForStep(materialMap, step, '__terrain_default__');
      var materialDef = getTerrainMaterialDefinitionForApply(terrainMaterialId);
      return {
        instanceId: String(batchId || 'terrain') + ':' + String(step.x) + ':' + String(step.y) + ':' + String(step.z),
        prefabId: 'cube_1x1',
        x: Number(step.x) || 0,
        y: Number(step.y) || 0,
        z: Number(step.z) || 0,
        rotation: 0,
        name: 'Terrain Block',
        generatedBy: 'terrain-generator',
        terrainBatchId: batchId || null,
        terrainCellX: Number(step.terrainCellX) || 0,
        terrainCellY: Number(step.terrainCellY) || 0,
        semanticTextureMap: semanticMeta.semanticTextureMap,
        semanticFaceColors: semanticMeta.semanticFaceColors,
        terrainMaterialId: terrainMaterialId,
        materialType: terrainMaterialId,
        terrainMaterialLabel: materialDef && materialDef.label ? materialDef.label : terrainMaterialId,
        base: materialDef && materialDef.colors && materialDef.colors.top ? materialDef.colors.top : getTerrainBlockBaseColor(targetHeight, terrainSettings)
      };
    });
  }


  function buildTerrainInstancesAndBoxesFromPlacementPlanRange(plan, startIndex, count, batchId, terrainSettings, heightMap, materialMap, semanticMeta, startingBoxId) {
    var map = Array.isArray(heightMap) ? heightMap : [];
    var list = Array.isArray(plan) ? plan : [];
    var safeStart = Math.max(0, Math.round(Number(startIndex) || 0));
    var safeCount = Math.max(0, Math.round(Number(count) || 0));
    var outInstances = [];
    var outBoxes = [];
    var nextBoxId = Math.max(1, Math.round(Number(startingBoxId) || 1));
    var semantic = semanticMeta && typeof semanticMeta === 'object' ? semanticMeta : buildTerrainInstanceSemanticMetadata(terrainSettings);
    for (var i = 0; i < safeCount && (safeStart + i) < list.length; i++) {
      var step = list[safeStart + i] || {};
      var x = Number(step.x) || 0;
      var y = Number(step.y) || 0;
      var z = Number(step.z) || 0;
      var targetHeight = Array.isArray(map[x]) ? Number(map[x][y] || 0) : 0;
      var terrainMaterialId = getTerrainMaterialIdForStep(materialMap, step, '__terrain_default__');
      var materialDef = getTerrainMaterialDefinitionForApply(terrainMaterialId);
      var instanceId = String(batchId || 'terrain') + ':' + String(x) + ':' + String(y) + ':' + String(z);
      var baseColor = materialDef && materialDef.colors && materialDef.colors.top ? materialDef.colors.top : getTerrainBlockBaseColor(targetHeight, terrainSettings);
      var instance = {
        instanceId: instanceId,
        prefabId: 'cube_1x1',
        x: x,
        y: y,
        z: z,
        rotation: 0,
        name: 'Terrain Block',
        generatedBy: 'terrain-generator',
        terrainBatchId: batchId || null,
        terrainCellX: Number(step.terrainCellX) || 0,
        terrainCellY: Number(step.terrainCellY) || 0,
        semanticTextureMap: semantic.semanticTextureMap || null,
        semanticFaceColors: semantic.semanticFaceColors || null,
        terrainMaterialId: terrainMaterialId,
        materialType: terrainMaterialId,
        terrainMaterialLabel: materialDef && materialDef.label ? materialDef.label : terrainMaterialId,
        base: baseColor,
        renderUpdateMode: 'static'
      };
      outInstances.push(instance);
      outBoxes.push({
        id: nextBoxId + i,
        instanceId: instanceId,
        prefabId: 'cube_1x1',
        name: 'Terrain Block',
        x: x,
        y: y,
        z: z,
        w: 1,
        d: 1,
        h: 1,
        base: baseColor,
        generatedBy: 'terrain-generator',
        terrainBatchId: batchId || null,
        terrainCellX: Number(step.terrainCellX) || 0,
        terrainCellY: Number(step.terrainCellY) || 0,
        semanticTextureMap: semantic.semanticTextureMap || null,
        semanticTextures: null,
        semanticFaceColors: semantic.semanticFaceColors || null,
        terrainMaterialId: terrainMaterialId,
        materialType: terrainMaterialId,
        terrainMaterialLabel: materialDef && materialDef.label ? materialDef.label : terrainMaterialId,
        renderUpdateMode: 'static',
        rotation: 0,
        localIndex: 0
      });
    }
    return { instances: outInstances, boxes: outBoxes };
  }

  function beginTerrainApplyJob(job) {
    __pendingTerrainApplyJob = job || null;
    return __pendingTerrainApplyJob;
  }

  function finalizePendingTerrainApplyJob(job, source) {
    var sceneSessionApi = getSceneSessionApi();
    var summary = job && job.summary ? Object.assign({}, job.summary, { appliedVoxelCount: job.appliedInstances.length, applyInProgress: false }) : null;
    if (job) {
      applyTerrainRuntimeModel({
        activeTerrainBatchId: job.batchId,
        width: job.normalizedParams.width,
        height: job.normalizedParams.height,
        heightMap: job.generated.heightMap,
        existingHeightMap: job.occupancySummary.existingHeightMap,
        materialMap: terrainMaterialMap,
        editDiff: {},
        params: job.normalizedParams,
        lastSummary: summary,
        terrainUsesColumnModel: false,
        terrainExpandedVoxelInstanceCount: job.appliedInstances.length,
        terrainOwnedDeltaBlockCount: job.worldIntegration.terrainOwnedDeltaBlockCount,
        existingManualBlockCount: job.occupancySummary.manualBlockCount,
        overlappingColumnCount: job.worldIntegration.overlappingColumnCount,
        mergedWithExistingOccupancy: true,
        stackedOnExistingBlocks: job.worldIntegration.stackedOnExistingBlocks,
        chunkSize: 16,
        dirtyChunkKeys: [],
        terrainChunkCacheVersion: Number((getTerrainRuntimeModel() && getTerrainRuntimeModel().terrainChunkCacheVersion) || 0) + 1
      }, String(source || job.source || 'terrain:apply-complete') + ':runtime-model');
      applyTerrainBatchState({ activeTerrainBatchId: job.batchId, lastSummary: summary }, String(source || job.source || 'terrain:apply-complete') + ':runtime');
      job.profile.terrainGeneratedInstanceCount = Number(job.appliedInstances.length || 0);
      job.profile.finalInstanceCountAfter = Number(readCurrentSceneInstances().length || 0);
      job.profile.finalBoxCountAfter = Number(sceneSessionApi && typeof sceneSessionApi.getBoxes === 'function' ? ((sceneSessionApi.getBoxes() || []).length) : readCurrentSceneBoxes().length);
      job.profile.timings.sceneCommitMs = Number(job.sceneCommitMsTotal.toFixed(3));
      job.profile.timings.totalMs = Number(Math.max(0, controllerPerfNowMs() - job.startedAt).toFixed(3));
      emitTerrainGenerateProfile(job.profile);
      recordTerrainDiagnostic('terrain-generator-apply-complete', {
        terrainBatchId: job.batchId,
        appliedTerrainInstanceCount: job.appliedInstances.length,
        plannedTerrainInstanceCount: job.terrainPlacementPlan.length,
        source: source || job.source || 'terrain:apply-complete'
      });
      if (typeof refreshInspectorPanels === 'function') { try { refreshInspectorPanels(); } catch (_) {} }
      if (typeof updatePreview === 'function') { try { updatePreview(); } catch (_) {} }
    }
    __pendingTerrainApplyJob = null;
    return summary;
  }

  function tickMainEditorTerrainApply(now, source) {
    var job = __pendingTerrainApplyJob;
    if (!job) return null;
    var sceneSessionApi = getSceneSessionApi();
    var requestSource = String(source || 'terrain:apply-batch');
    var remaining = Math.max(0, job.terrainPlacementPlan.length - job.nextPlanIndex);
    if (remaining <= 0) return finalizePendingTerrainApplyJob(job, requestSource + ':complete');
    var batchCount = Math.min(job.batchSize, remaining);
    var range = sceneSessionApi && typeof sceneSessionApi.allocateBoxIdRange === 'function'
      ? sceneSessionApi.allocateBoxIdRange(batchCount, { source: requestSource + ':allocate-box-range' })
      : { start: job.nextBoxId, count: batchCount };
    var startingBoxId = range && Number.isFinite(Number(range.start)) ? Number(range.start) : job.nextBoxId;
    var materializeStartAt = controllerPerfNowMs();
    var built = buildTerrainInstancesAndBoxesFromPlacementPlanRange(job.terrainPlacementPlan, job.nextPlanIndex, batchCount, job.batchId, job.normalizedParams, job.generated.heightMap, job.generated && job.generated.materialMap ? job.generated.materialMap : null, job.semanticMeta, startingBoxId);
    var materializeMs = Math.max(0, controllerPerfNowMs() - materializeStartAt);
    var nextInstances = job.survivors.concat(job.appliedInstances, built.instances);
    var nextBoxes = job.survivorsBoxes.concat(job.appliedBoxes, built.boxes);
    var commitStartAt = controllerPerfNowMs();
    replaceCurrentSceneGraph(nextInstances, nextBoxes, requestSource + ':scene-graph');
    var commitMs = Math.max(0, controllerPerfNowMs() - commitStartAt);
    Array.prototype.push.apply(job.appliedInstances, built.instances);
    Array.prototype.push.apply(job.appliedBoxes, built.boxes);
    job.nextPlanIndex += built.instances.length;
    job.nextBoxId = startingBoxId + built.boxes.length;
    job.materializeMsTotal += materializeMs;
    job.sceneCommitMsTotal += commitMs;
    var appliedCount = job.appliedInstances.length;
    var summary = Object.assign({}, job.summary, { appliedVoxelCount: appliedCount, applyInProgress: appliedCount < job.terrainPlacementPlan.length });
    job.summary = summary;
    applyTerrainRuntimeModel({
      activeTerrainBatchId: job.batchId,
      width: job.normalizedParams.width,
      height: job.normalizedParams.height,
      heightMap: job.generated.heightMap,
      existingHeightMap: job.occupancySummary.existingHeightMap,
      materialMap: job.generated && job.generated.materialMap ? job.generated.materialMap : null,
      editDiff: {},
      params: job.normalizedParams,
      lastSummary: summary,
      terrainUsesColumnModel: false,
      terrainExpandedVoxelInstanceCount: appliedCount,
      terrainOwnedDeltaBlockCount: job.worldIntegration.terrainOwnedDeltaBlockCount,
      existingManualBlockCount: job.occupancySummary.manualBlockCount,
      overlappingColumnCount: job.worldIntegration.overlappingColumnCount,
      mergedWithExistingOccupancy: true,
      stackedOnExistingBlocks: job.worldIntegration.stackedOnExistingBlocks,
      chunkSize: 16,
      dirtyChunkKeys: []
    }, requestSource + ':runtime-model');
    applyTerrainBatchState({ activeTerrainBatchId: job.batchId, lastSummary: summary }, requestSource + ':runtime');
    if (isDetailedTerrainProfilingEnabledForController()) {
      recordTerrainDiagnostic('terrain-generator-apply-batch', {
        terrainBatchId: job.batchId,
        appliedTerrainInstanceCount: appliedCount,
        batchCount: built.instances.length,
        batchIndexStart: job.nextPlanIndex - built.instances.length,
        batchIndexEndExclusive: job.nextPlanIndex,
        remainingTerrainInstanceCount: Math.max(0, job.terrainPlacementPlan.length - job.nextPlanIndex),
        materializeMs: Number(materializeMs.toFixed(3)),
        sceneCommitMs: Number(commitMs.toFixed(3))
      });
    }
    if (job.nextPlanIndex >= job.terrainPlacementPlan.length) return finalizePendingTerrainApplyJob(job, requestSource + ':complete');
    return summary;
  }

  function clearMainEditorTerrain(source) {
    var requestSource = String(source || 'terrain:clear');
    cancelPendingTerrainApplyJob(requestSource + ':cancel-pending');
    var current = readCurrentSceneInstances();
    var removedLegacy = current.filter(isTerrainGeneratedInstance);
    var survivors = current.filter(function (inst) { return !isTerrainGeneratedInstance(inst); });
    replaceCurrentSceneInstances(survivors, requestSource);
    var terrainRuntime = getTerrainRuntimeModel();
    var lastSettings = getMainEditorTerrainSettings(requestSource);
    var removedTerrainVoxelCount = terrainRuntime && terrainRuntime.lastSummary && Number.isFinite(Number(terrainRuntime.lastSummary.generatedVoxelCount))
      ? Math.round(Number(terrainRuntime.lastSummary.generatedVoxelCount))
      : removedLegacy.length;
    clearTerrainRuntimeModelState(requestSource + ':runtime-model');
    applyTerrainBatchState({ activeTerrainBatchId: null, lastSummary: null }, requestSource + ':runtime');
    invalidateMainEditorTerrainRenderCaches(requestSource + ':invalidate');
    var payload = {
      terrainBatchId: (terrainRuntime && terrainRuntime.activeTerrainBatchId) || (lastSettings && lastSettings.activeTerrainBatchId) || 'all-terrain-generated',
      removedTerrainInstanceCount: removedLegacy.length,
      removedTerrainVoxelCount: removedTerrainVoxelCount
    };
    recordTerrainDiagnostic('terrain-generator-clear', payload);
    if (typeof refreshInspectorPanels === 'function') { try { refreshInspectorPanels(); } catch (_) {} }
    if (typeof updatePreview === 'function') { try { updatePreview(); } catch (_) {} }
    return Object.assign({ ok: true }, payload);
  }

  function generateMainEditorTerrain(source) {
    var requestSource = String(source || 'terrain:generate');
    cancelPendingTerrainApplyJob(requestSource + ':cancel-pending');
    var terrainCore = getTerrainGeneratorCoreApi();
    if (!terrainCore || typeof terrainCore.generateHeightMap !== 'function' || typeof terrainCore.heightMapToVoxelStacks !== 'function') {
      return { ok: false, reason: 'missing-terrain-generator-core' };
    }
    var terrainProfileStartAt = controllerPerfNowMs();
    var terrainProfile = {
      terrainBatchId: null,
      width: 0,
      height: 0,
      heightMapCellCount: 0,
      terrainPlacementPlanLength: 0,
      terrainGeneratedInstanceCount: 0,
      survivorsCount: 0,
      existingInstanceCountBefore: 0,
      existingBoxCountBefore: 0,
      finalInstanceCountAfter: 0,
      finalBoxCountAfter: 0,
      timings: {
        buildHeightMapMs: 0,
        buildOccupancySummaryMs: 0,
        buildPlacementPlanMs: 0,
        buildTerrainInstancesMs: 0,
        clearLegacyCommitMs: 0,
        sceneCommitMs: 0,
        totalMs: 0
      }
    };
    var currentSettings = getMainEditorTerrainSettings(requestSource);
    var runtimeApi = getRuntimeStateApi();
    var sceneSessionApi = getSceneSessionApi();
    var gridW = runtimeApi && runtimeApi.settings ? Number(runtimeApi.settings.gridW || runtimeApi.settings.worldCols || currentSettings.width || 1) : Number(currentSettings.width || 1);
    var gridH = runtimeApi && runtimeApi.settings ? Number(runtimeApi.settings.gridH || runtimeApi.settings.worldRows || currentSettings.height || 1) : Number(currentSettings.height || 1);
    var requestedParams = Object.assign({}, currentSettings, {
      width: Math.max(1, Math.min(Math.round(Number(currentSettings.width) || 1), Math.max(1, Math.round(gridW) || 1))),
      height: Math.max(1, Math.min(Math.round(Number(currentSettings.height) || 1), Math.max(1, Math.round(gridH) || 1)))
    });
    var normalizedParams = terrainCore.normalizeTerrainParams ? terrainCore.normalizeTerrainParams(requestedParams) : requestedParams;
    terrainProfile.width = Number(normalizedParams.width || 0);
    terrainProfile.height = Number(normalizedParams.height || 0);
    recordTerrainDiagnostic('terrain-generator-params', {
      seed: normalizedParams.seed,
      width: normalizedParams.width,
      height: normalizedParams.height,
      detailScale: normalizedParams.detailScale,
      detailOctaves: normalizedParams.detailOctaves,
      detailPersistence: normalizedParams.detailPersistence,
      detailLacunarity: normalizedParams.detailLacunarity,
      detailStrength: normalizedParams.detailStrength,
      macroScale: normalizedParams.macroScale,
      macroOctaves: normalizedParams.macroOctaves,
      macroPersistence: normalizedParams.macroPersistence,
      macroLacunarity: normalizedParams.macroLacunarity,
      minHeight: normalizedParams.minHeight,
      maxHeight: normalizedParams.maxHeight,
      waterLevel: normalizedParams.waterLevel,
      heightProfileConfig: normalizedParams.heightProfileConfig
    });
    var current = readCurrentSceneInstances();
    terrainProfile.existingInstanceCountBefore = Number(current.length || 0);
    terrainProfile.existingBoxCountBefore = Number(sceneSessionApi && typeof sceneSessionApi.getBoxes === 'function'
      ? ((sceneSessionApi.getBoxes() || []).length)
      : ((typeof boxes !== 'undefined' && Array.isArray(boxes)) ? boxes.length : 0));
    var buildHeightMapStartAt = controllerPerfNowMs();
    var generated = terrainCore.generateHeightMap(normalizedParams);
    var terrainMaterialMap = buildTerrainMaterialMapForApply(generated && generated.heightMap, normalizedParams);
    if (generated && typeof generated === 'object') generated.materialMap = terrainMaterialMap;
    var stacks = terrainCore.heightMapToVoxelStacks(generated);
    terrainProfile.timings.buildHeightMapMs = Number(Math.max(0, controllerPerfNowMs() - buildHeightMapStartAt).toFixed(3));
    terrainProfile.heightMapCellCount = Number((Array.isArray(generated && generated.heightMap) ? generated.heightMap.length : 0) && Array.isArray(generated && generated.heightMap && generated.heightMap[0])
      ? (generated.heightMap.length * generated.heightMap[0].length)
      : (normalizedParams.width * normalizedParams.height));
    var survivors = current.filter(function (inst) { return !isTerrainGeneratedInstance(inst); });
    terrainProfile.survivorsCount = Number(survivors.length || 0);
    var clearLegacyCommitStartAt = controllerPerfNowMs();
    replaceCurrentSceneInstances(survivors, requestSource + ':clear-legacy');
    terrainProfile.timings.clearLegacyCommitMs = Number(Math.max(0, controllerPerfNowMs() - clearLegacyCommitStartAt).toFixed(3));
    var manualBoxes = (typeof boxes !== 'undefined' && Array.isArray(boxes)) ? boxes.filter(function (box) { return !(box && box.generatedBy === 'terrain-generator'); }) : [];
    var occupancySummaryStartAt = controllerPerfNowMs();
    var occupancySummary = buildManualColumnHeightMapFromBoxes(manualBoxes, normalizedParams.width, normalizedParams.height);
    var worldIntegration = summarizeTerrainWorldIntegration(generated.heightMap, occupancySummary.existingHeightMap);
    terrainProfile.timings.buildOccupancySummaryMs = Number(Math.max(0, controllerPerfNowMs() - occupancySummaryStartAt).toFixed(3));
    var batchId = allocateTerrainBatchId(requestSource);
    terrainProfile.terrainBatchId = batchId;
    var terrainRuntime = getTerrainRuntimeModel();
    var buildPlacementPlanStartAt = controllerPerfNowMs();
    var terrainPlacementPlan = buildTerrainPlacementPlan(generated.heightMap, occupancySummary.existingHeightMap);
    terrainProfile.timings.buildPlacementPlanMs = Number(Math.max(0, controllerPerfNowMs() - buildPlacementPlanStartAt).toFixed(3));
    terrainProfile.terrainPlacementPlanLength = Number(terrainPlacementPlan.length || 0);
    terrainProfile.terrainGeneratedInstanceCount = Number(terrainPlacementPlan.length || 0);
    var summary = {
      generatedCellCount: stacks.generatedCellCount,
      generatedVoxelCount: terrainPlacementPlan.length,
      appliedVoxelCount: 0,
      applyInProgress: terrainPlacementPlan.length > 0,
      minHeightObserved: generated.minHeightObserved,
      maxHeightObserved: generated.maxHeightObserved,
      avgHeightObserved: generated.avgHeightObserved,
      terrainBatchId: batchId,
      terrainOwnedDeltaBlockCount: worldIntegration.terrainOwnedDeltaBlockCount,
      existingManualBlockCount: occupancySummary.manualBlockCount,
      overlappingColumnCount: worldIntegration.overlappingColumnCount
    };
    var survivorsBoxes = readCurrentSceneBoxes();
    applyTerrainRuntimeModel({
      activeTerrainBatchId: batchId,
      width: normalizedParams.width,
      height: normalizedParams.height,
      heightMap: generated.heightMap,
      existingHeightMap: occupancySummary.existingHeightMap,
      materialMap: terrainMaterialMap,
      editDiff: {},
      params: normalizedParams,
      lastSummary: summary,
      terrainUsesColumnModel: false,
      terrainExpandedVoxelInstanceCount: 0,
      terrainOwnedDeltaBlockCount: worldIntegration.terrainOwnedDeltaBlockCount,
      existingManualBlockCount: occupancySummary.manualBlockCount,
      overlappingColumnCount: worldIntegration.overlappingColumnCount,
      mergedWithExistingOccupancy: true,
      stackedOnExistingBlocks: worldIntegration.stackedOnExistingBlocks,
      chunkSize: 16,
      dirtyChunkKeys: [],
      terrainChunkCacheVersion: Number((terrainRuntime && terrainRuntime.terrainChunkCacheVersion) || 0) + 1
    }, requestSource + ':runtime-model');
    applyTerrainBatchState({ activeTerrainBatchId: batchId, lastSummary: summary }, requestSource + ':runtime');
    beginTerrainApplyJob({
      batchId: batchId,
      source: requestSource,
      normalizedParams: normalizedParams,
      generated: generated,
      occupancySummary: occupancySummary,
      worldIntegration: worldIntegration,
      terrainPlacementPlan: terrainPlacementPlan,
      survivors: survivors,
      survivorsBoxes: survivorsBoxes,
      appliedInstances: [],
      appliedBoxes: [],
      nextPlanIndex: 0,
      nextBoxId: 1,
      semanticMeta: buildTerrainInstanceSemanticMetadata(normalizedParams),
      batchSize: TERRAIN_APPLY_BATCH_INSTANCE_COUNT,
      summary: summary,
      startedAt: terrainProfileStartAt,
      materializeMsTotal: 0,
      sceneCommitMsTotal: terrainProfile.timings.clearLegacyCommitMs,
      profile: terrainProfile
    });
    recordTerrainDiagnostic('terrain-world-integration-summary', {
      terrainBatchId: batchId,
      terrainTargetColumnCount: worldIntegration.terrainTargetColumnCount,
      terrainOwnedDeltaBlockCount: worldIntegration.terrainOwnedDeltaBlockCount,
      mergedWithExistingOccupancy: true,
      existingManualBlockCount: occupancySummary.manualBlockCount,
      overlappingColumnCount: worldIntegration.overlappingColumnCount,
      stackedOnExistingBlocks: worldIntegration.stackedOnExistingBlocks
    });
    recordTerrainDiagnostic('terrain-logic-summary', {
      terrainCellCount: normalizedParams.width * normalizedParams.height,
      terrainColumnCount: stacks.generatedCellCount,
      terrainExpandedVoxelInstanceCount: terrainPlacementPlan.length,
      terrainUsesColumnModel: false
    });
    recordTerrainDiagnostic('terrain-placement-unification-check', {
      terrainGeneratedAsPlacementPlan: true,
      terrainAppliedThroughSharedBlockPipeline: true,
      terrainUsesDedicatedRenderPath: false,
      terrainUsesDedicatedGeometryPath: false,
      terrainUsesDedicatedCameraPath: false,
      terrainPlacementPlanLength: terrainPlacementPlan.length,
      terrainGeneratedInstanceCount: terrainPlacementPlan.length,
      terrainBatchId: batchId
    });
    recordTerrainDiagnostic('terrain-debug-face-unification-check', {
      terrainDebugFaceColorsEnabled: normalizedParams.terrainDebugFaceColorsEnabled === true,
      usesOriginalBlockSemanticFaces: true,
      usesOriginalBlockFaceGeometry: true,
      hasMergedContinuousTerrainSideFaces: false,
      hasSlopedAppearanceRisk: false,
      terrainBatchId: batchId
    });
    recordTerrainDiagnostic('terrain-camera-unification-check', {
      floorUsesUnifiedCameraTransform: true,
      blocksUseUnifiedCameraTransform: true,
      terrainUsesUnifiedCameraTransform: true,
      usesSingleUnifiedZoomPath: true,
      zoomSource: 'runtime-state.editor.zoom',
      cullingSource: 'presentation.render.render.getMainCameraRenderScope',
      terrainBatchId: batchId
    });
    recordTerrainDiagnostic('shared-render-optimization-check', {
      optimizationAppliesToManualBlocks: true,
      optimizationAppliesToGeneratedTerrainBlocks: true,
      optimizationAppliesToPlacedVoxelFurniture: true,
      surfaceOnlyRenderingEnabled: true,
      cameraCullingEnabled: true,
      chunkBatchingEnabled: false,
      terrainBatchId: batchId
    });
    recordTerrainDiagnostic('terrain-generator-summary', summary);
    recordTerrainDiagnostic('terrain-generator-apply', {
      terrainBatchId: batchId,
      terrainInstanceCount: terrainPlacementPlan.length,
      terrainVoxelCount: terrainPlacementPlan.length,
      appliedToMainEditor: true,
      appliedAsPlacementPlan: true,
      appliedThroughSharedBlockPipeline: true,
      applyMode: 'batched'
    });
    terrainProfile.timings.totalMs = Number(Math.max(0, controllerPerfNowMs() - terrainProfileStartAt).toFixed(3));
    emitTerrainGenerateProfile(Object.assign({}, terrainProfile, {
      finalInstanceCountAfter: Number(readCurrentSceneInstances().length || 0),
      finalBoxCountAfter: Number(readCurrentSceneBoxes().length || 0),
      generateQueued: true
    }));
    if (typeof refreshInspectorPanels === 'function') { try { refreshInspectorPanels(); } catch (_) {} }
    if (typeof updatePreview === 'function') { try { updatePreview(); } catch (_) {} }
    return Object.assign({ ok: true }, summary, { terrainInstanceCount: terrainPlacementPlan.length, terrainVoxelCount: terrainPlacementPlan.length, terrainUsesColumnModel: false, applyMode: 'batched' });
  }


  var mainActions = {
    summarizeBoundary: summarizeAppBoundary,
    resetBoundaryAudit: resetAppBoundary,
    openEditorFromMain: openEditorFromMain,
    handleOpenEditorButton: handleOpenEditorButton,
    requestModeChange: requestModeChange,
    runAssetScan: runAssetScan,
    handleRescanAssetsButton: handleRescanAssetsButton,
    saveSceneTarget: saveSceneTarget,
    loadSceneTarget: loadSceneTarget,
    getMainEditorViewRotation: getMainEditorViewRotation,
    getMainEditorCameraSettings: getMainEditorCameraSettings,
    getMainEditorVisualRotation: getMainEditorVisualRotation,
    isMainEditorViewRotating: isMainEditorViewRotating,
    tickMainEditorViewRotationAnimation: tickMainEditorViewRotationAnimation,
    completeMainEditorViewRotationAnimation: completeMainEditorViewRotationAnimation,
    setMainEditorRotationAnimationEnabled: setMainEditorRotationAnimationEnabled,
    setMainEditorRotationAnimationMs: setMainEditorRotationAnimationMs,
    setMainEditorRotationInterpolationEnabled: setMainEditorRotationInterpolationEnabled,
    setMainEditorRotationInterpolationMode: setMainEditorRotationInterpolationMode,
    setMainEditorZoom: setMainEditorZoom,
    setMainEditorZoomBounds: setMainEditorZoomBounds,
    setMainEditorCameraCullingEnabled: setMainEditorCameraCullingEnabled,
    setMainEditorCullingMargin: setMainEditorCullingMargin,
    setMainEditorShowCameraBounds: setMainEditorShowCameraBounds,
    setMainEditorShowCullingBounds: setMainEditorShowCullingBounds,
    getMainEditorTerrainSettings: getMainEditorTerrainSettings,
    setMainEditorTerrainSettings: setMainEditorTerrainSettings,
    resetMainEditorTerrainSettings: resetMainEditorTerrainSettings,
    generateMainEditorTerrain: generateMainEditorTerrain,
    clearMainEditorTerrain: clearMainEditorTerrain,
    tickMainEditorTerrainApply: tickMainEditorTerrainApply,
    resetMainEditorViewRotation: resetMainEditorViewRotation,
    setMainEditorViewRotation: setMainEditorViewRotation,
    rotateMainEditorView: rotateMainEditorView,
    exportMainViewRotationDiagnostic: exportMainViewRotationDiagnostic
  };

  var sceneActions = {
    saveSceneTarget: saveSceneTarget,
    loadSceneTarget: loadSceneTarget,
    saveLocalScene: saveLocalScene,
    loadLocalScene: loadLocalScene,
    saveSceneFile: saveSceneFile,
    openDefaultScene: openDefaultScene,
    importSceneFile: importSceneFile
  };

  var assetLibraryActions = {
    openHabboLibrary: openHabboLibrary,
    handleOpenBrowserClick: handleOpenHabboLibraryBrowser,
    handleRefreshBrowserClick: handleRefreshHabboLibrary,
    handleTypeSwitch: handleHabboLibraryTypeSwitch,
    handleCategorySelect: handleHabboLibraryCategorySelect,
    handleSearchInput: handleHabboLibrarySearchInput,
    handlePageAction: handleHabboLibraryPageAction,
    handlePlaceSelectedItem: handlePlaceSelectedHabboItem,
    runAssetScan: runAssetScan
  };

  var placementActions = {
    requestModeChange: requestModeChange,
    handleModeButton: handleModeButton,
    selectPrefabByIndex: selectPrefabByIndex,
    selectPrefabById: selectPrefabById,
    handlePrefabSelectChange: handlePrefabSelectChange,
    applyPlacementIntent: applyPlacementIntent,
    getPreviewFacing: getPreviewFacing,
    setPreviewFacing: setPreviewFacing,
    rotatePreviewFacing: rotatePreviewFacing,
    rotatePreviewFacingByWheel: rotatePreviewFacingByWheel,
    setSelectedInstanceFacing: setSelectedInstanceFacing,
    rotateSelectedInstanceFacing: rotateSelectedInstanceFacing,
    startDragging: startDragging,
    commitPreview: commitPreview,
    cancelDrag: cancelDrag,
    completeDragInteraction: completeDragInteraction,
    syncPlacementUi: syncPlacementUi,
    summarizeRoutes: summarizePlacementRoutes,
    resetRouteAudit: resetPlacementRoutes
  };

  var editorHandoffActions = {
    processEditorReturn: processEditorReturn,
    runAssetScan: runAssetScan
  };

  var controllerRoot = {
    main: Object.assign({}, mainActions, {
      dispatch: function (action, payload) { return invokeControllerAction(mainActions, action, payload); }
    }),
    scene: Object.assign({}, sceneActions, {
      dispatch: function (action, payload) { return invokeControllerAction(sceneActions, action, payload); }
    }),
    assetLibrary: Object.assign({}, assetLibraryActions, {
      dispatch: function (action, payload) { return invokeControllerAction(assetLibraryActions, action, payload); }
    }),
    placement: Object.assign({}, placementActions, {
      dispatch: function (action, payload) { return invokeControllerAction(placementActions, action, payload); }
    }),
    editorHandoff: Object.assign({}, editorHandoffActions, {
      dispatch: function (action, payload) { return invokeControllerAction(editorHandoffActions, action, payload); }
    }),
    dispatch: dispatchControllerCommand
  };

  var ns = getNs();
  if (ns) {
    ns.bind('controllers.main', controllerRoot.main, { owner: 'src/application/controllers/app-controllers.js', legacy: [], phase: 'P7-C' });
    ns.bind('controllers.scene', controllerRoot.scene, { owner: 'src/application/controllers/app-controllers.js', legacy: [], phase: 'P7-C' });
    ns.bind('controllers.assetLibrary', controllerRoot.assetLibrary, { owner: 'src/application/controllers/app-controllers.js', legacy: [], phase: 'P7-C' });
    ns.bind('controllers.placement', controllerRoot.placement, { owner: 'src/application/controllers/app-controllers.js', legacy: [], phase: 'P7-C' });
    ns.bind('controllers.editorHandoff', controllerRoot.editorHandoff, { owner: 'src/application/controllers/app-controllers.js', legacy: [], phase: 'P7-C' });
    ns.bind('controllers.dispatch', controllerRoot.dispatch, { owner: 'src/application/controllers/app-controllers.js', legacy: [], phase: 'P7-C' });
  }

  emitP7('BOOT', 'controller-entrypoints-ready', {
    phase: 'P7-C',
    owner: 'src/application/controllers/app-controllers.js',
    roots: ['controllers.main', 'controllers.scene', 'controllers.assetLibrary', 'controllers.placement', 'controllers.editorHandoff', 'controllers.dispatch'],
    functions: {
      main: ['summarizeBoundary','resetBoundaryAudit','openEditorFromMain', 'handleOpenEditorButton', 'requestModeChange', 'runAssetScan', 'handleRescanAssetsButton', 'saveSceneTarget', 'loadSceneTarget', 'getMainEditorViewRotation', 'getMainEditorCameraSettings', 'getMainEditorVisualRotation', 'isMainEditorViewRotating', 'tickMainEditorViewRotationAnimation', 'completeMainEditorViewRotationAnimation', 'setMainEditorRotationAnimationEnabled', 'setMainEditorRotationAnimationMs', 'setMainEditorRotationInterpolationEnabled', 'setMainEditorRotationInterpolationMode', 'setMainEditorZoom', 'setMainEditorZoomBounds', 'setMainEditorCameraCullingEnabled', 'setMainEditorCullingMargin', 'setMainEditorShowCameraBounds', 'setMainEditorShowCullingBounds', 'getMainEditorTerrainSettings', 'setMainEditorTerrainSettings', 'resetMainEditorTerrainSettings', 'generateMainEditorTerrain', 'clearMainEditorTerrain', 'tickMainEditorTerrainApply', 'resetMainEditorViewRotation', 'setMainEditorViewRotation', 'rotateMainEditorView', 'exportMainViewRotationDiagnostic', 'dispatch'],
      scene: ['saveSceneTarget', 'loadSceneTarget', 'saveLocalScene', 'loadLocalScene', 'saveSceneFile', 'openDefaultScene', 'importSceneFile', 'dispatch'],
      assetLibrary: ['openHabboLibrary', 'handleOpenBrowserClick', 'handleRefreshBrowserClick', 'handleTypeSwitch', 'handleCategorySelect', 'handleSearchInput', 'handlePageAction', 'handlePlaceSelectedItem', 'runAssetScan', 'dispatch'],
      placement: ['requestModeChange', 'handleModeButton', 'selectPrefabByIndex', 'selectPrefabById', 'handlePrefabSelectChange', 'applyPlacementIntent', 'getPreviewFacing', 'setPreviewFacing', 'rotatePreviewFacing', 'rotatePreviewFacingByWheel', 'startDragging', 'commitPreview', 'cancelDrag', 'completeDragInteraction', 'syncPlacementUi', 'summarizeRoutes', 'resetRouteAudit', 'dispatch'],
      editorHandoff: ['processEditorReturn', 'runAssetScan', 'dispatch'],
      root: ['dispatch']
    }
  });
  emitP7('SUMMARY', 'controller-entrypoint-coverage', {
    phase: 'P7-C',
    owner: 'src/application/controllers/app-controllers.js',
    wiredInto: [
      'src/presentation/ui/ui.js:mode/prefab/scene/editor/rescan buttons',
      'src/presentation/shell/app.js:editor-return startup/focus/visibility',
      'src/presentation/ui/ui-habbo-library.js:open/refresh/type/category/search/page/place actions'
    ],
    notes: [
      'P7-C keeps controller entrypoints as the orchestration shell and adds controller-local dispatch so UI/app glue stop branching on individual action methods.',
      'P8-S3 adds placement.routeAudit plus placement.applyPlacementIntent so placement state intent and UI synchronization stop being logged through ad-hoc controller-local globals.',
      'UI handlers and editor-return hooks now prefer App.controllers.*.dispatch(...) before falling back to lower-level services or globals.'
    ]
  });
})();
